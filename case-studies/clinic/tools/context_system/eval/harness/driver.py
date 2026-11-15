"""Driver: plan, resumable run state, the scripted turn loop, evaluation branches and the report.

One step = one `claude -p` process (a scripted user turn, a handoff, or one continuation task on a
branch). The run state (<run>/run.json) is saved before and after every step, so a usage limit, a
timeout or a crash stops the run cleanly and `--continue <run dir>` picks it up.

Phases: (1) every arm plays the core script plus the base extension turns; (2) the compacting arms
get further extension turns one at a time until each transcript shows the required number of
compact boundaries; (3) every arm is brought to the same number of scripted turns; (4) each
continuation task runs once on a fork of the arm's session (--resume <id> --fork-session) and once
in a fresh session, with the project restored from a snapshot before and after each one.
"""
from __future__ import annotations

import argparse
import shutil
import sys
import time
import uuid
from pathlib import Path
from typing import Any, Callable

from . import claude_cli, metrics, sandbox, scoring
from .common import diff_manifests, log, manifest, now_iso, read_json, write_json, write_text
from .estimate import estimate, format_estimate
from .sandbox import ARMS, core
from .scenario import (FRESH_OPENING, HANDOFF_PROMPT, HANDOFF_RESUME, LIMIT_RESUME, REPORT_PROMPT, REPORT_TASKS,
                       TASK_FILE, TIMEOUT_RESUME, Scenario)

VERIFIED_CLI = "2.1.293"   # the Claude Code version the system's compaction notes were checked against
PROFILES: dict[str, dict[str, Any]] = {
    # The user's real settings. Results from this profile are the only ones that say anything about quality.
    "quality": {"model": "claude-opus-5-5", "effort": "xhigh", "settings": {"ultracode": True}, "window": 400_000,
                "evidence_of_quality": True, "tasks": ["E1", "E2", "E3", "E4"], "turn_timeout": 5400,
                "eval_timeout": 5400, "default_size": "full"},
    # Cheap check that the hooks fire around a real compaction. NOT evidence of quality.
    "mechanics": {"model": "claude-sonnet-5-5", "effort": "low", "settings": {}, "window": 150_000,
                  "evidence_of_quality": False, "tasks": ["E3"], "turn_timeout": 1800, "eval_timeout": 1800,
                  "default_size": "fit", "base_turns": 3},
}
DEFAULT_ARMS = {("quality", "full"): ["system", "native", "handoff"],
                ("quality", "fit"): ["system", "native", "handoff", "reference"],
                ("mechanics", "full"): ["system"], ("mechanics", "fit"): ["system"]}
MIN_COMPACTIONS = {("quality", "full"): 3, ("quality", "fit"): 2, ("mechanics", "full"): 1, ("mechanics", "fit"): 1}
MAIN_KINDS = ("turn", "handoff", "handoff_resume", "final_handoff", "limit_resume", "timeout_resume")


class Halt(Exception):
    def __init__(self, reason: str, arm: str, label: str, detail: str = ""):
        super().__init__(f"{reason} in arm {arm} at step {label}: {detail}")
        self.reason, self.arm, self.label, self.detail = reason, arm, label, detail


def make_state(profile: str, size: str | None, arms: list[str] | None, *, claude: dict[str, str], python: str,
               home: Path, seed: int = 20261010, window: int | None = None, min_compactions: int | None = None,
               handoff_at: int = 300_000, ref_limit: int = 950_000, tasks: list[str] | None = None,
               variants: list[str] | None = None, permission_mode: str = "bypassPermissions",
               turn_timeout: int | None = None, eval_timeout: int | None = None, timeout_retries: int = 2,
               allow_fewer: bool = False, max_turns: int | None = None, simulated: bool = False) -> dict[str, Any]:
    p = PROFILES[profile]
    size = size or p["default_size"]
    arms = arms or DEFAULT_ARMS[(profile, size)]
    for a in arms:
        if a not in ARMS:
            raise ValueError(f"unknown arm {a!r}; choose from {sorted(ARMS)}")
    if "reference" in arms and size != "fit":
        raise ValueError("the reference arm needs --size fit: with the full script the history cannot stay under "
                         "the reference limit, so a full-context comparison would not be valid")
    scn = Scenario(seed, size)
    return {
        "version": 1, "created": now_iso(), "status": "new", "simulated": simulated, "profile": profile,
        "profile_def": {k: p[k] for k in ("model", "effort", "settings", "evidence_of_quality")},
        "size": size, "seed": seed, "arms_order": list(arms), "arms": {},
        "tasks": tasks or p["tasks"], "variants": variants or ["resume", "fresh"],
        "window": int(window or p["window"]),
        "min_compactions": int(min_compactions if min_compactions is not None else MIN_COMPACTIONS[(profile, size)]),
        "base_turns": p.get("base_turns") or scn.base_turns(), "handoff_at": int(handoff_at),
        "ref_limit": int(ref_limit), "permission_mode": permission_mode, "claude": claude, "python": python,
        "claude_home": str(home), "timeouts": {"turn": int(turn_timeout or p["turn_timeout"]),
                                               "eval": int(eval_timeout or p["eval_timeout"])},
        "timeout_retries": timeout_retries, "allow_fewer": allow_fewer, "max_turns": max_turns,
        "equalised_turns": None, "halt": None,
    }


class Run:
    def __init__(self, run_dir: Path, state: dict[str, Any], executor: Callable | None = None):
        self.dir, self.s = Path(run_dir), state
        self.scn = Scenario(state["seed"], state["size"])
        self.script = self.scn.script()
        self.tasks = [t for t in self.scn.eval_tasks() if t.id in state["tasks"]]
        self.profile = state["profile_def"]
        self.executor = executor or live_executor

    @classmethod
    def load(cls, run_dir: Path, executor: Callable | None = None) -> "Run":
        state = read_json(Path(run_dir) / "run.json")
        if not state.get("arms_order"):
            raise RuntimeError(f"no run state in {run_dir}")
        return cls(run_dir, state, executor)

    def save(self) -> None:
        write_json(self.dir / "run.json", self.s)

    def arms(self) -> list[dict[str, Any]]:
        return [self.s["arms"][n] for n in self.s["arms_order"]]

    def transcript(self, arm: dict[str, Any], session: str) -> Path:
        return Path(arm["transcripts"]) / f"{session}.jsonl"

    def context(self, arm: dict[str, Any]) -> int:
        t = self.transcript(arm, arm["session"]) if arm["session"] else None
        return core.tail_status(t)["tokens"] if t and t.is_file() else 0

    def boundaries(self, arm: dict[str, Any]) -> int:
        return sum(core.count_boundaries(self.transcript(arm, s)) for s in arm["sessions"])


def setup(run: Run) -> None:
    for name in run.s["arms_order"]:
        if name in run.s["arms"]:
            continue
        info = sandbox.create_arm(run.dir, name, run.scn, run.s["python"], run.s["window"], Path(run.s["claude_home"]))
        problems = sandbox.verify_arm(info, run.s["python"], run.s["window"])
        if problems:
            raise RuntimeError("sandbox check failed: " + "; ".join(problems))
        run.s["arms"][name] = {**info, "session": None, "sessions": [], "pos": 0, "n": 0, "steps": [],
                               "pending": None, "handoffs": [], "await_handoff_resume": None, "final_handoff": None,
                               "evals": {}, "invalid": None, "warnings": [], "shortfall": False}
        run.save()


def live_executor(run: Run, arm: dict[str, Any], rec: dict[str, Any], prompt: str, timeout: float) -> dict[str, Any]:
    env, _, _ = claude_cli.child_env()
    return claude_cli.run_claude(rec["argv"], Path(arm["project"]), prompt, Path(rec["log"]), timeout, env)


# --- one step -----------------------------------------------------------------------------------

def step(run: Run, arm: dict[str, Any], kind: str, ident: str, prompt: str, mode: str, session: str,
         effect: str | None = None, fork_from: str | None = None, timeout: float | None = None,
         retry: int = 0) -> dict[str, Any]:
    arm["n"] += 1
    label = f"{arm['n']:03d}-{kind}-{ident}"
    prompt_file = Path(arm["prompts"]) / f"{label}.txt"
    write_text(prompt_file, prompt)
    rec = {"n": arm["n"], "label": label, "kind": kind, "id": ident, "mode": mode, "session": session,
           "fork_from": fork_from, "effect": effect, "prompt_file": str(prompt_file),
           "argv": claude_cli.build_argv(run.s["claude"]["path"], run.profile, mode, session, fork_from,
                                         run.s["permission_mode"]),
           "log": str(Path(arm["logs"]) / f"{label}.jsonl"), "started": now_iso(), "status": "running"}
    arm["pending"] = rec
    run.save()
    res = run.executor(run, arm, rec, prompt, timeout or run.s["timeouts"]["turn"])
    rec.update(res)
    rec["ended"] = now_iso()
    final = (rec.get("result") or {}).get("result") or ""
    rec["final_file"] = str(Path(arm["logs"]) / f"{label}.final.txt")
    write_text(Path(rec["final_file"]), final)
    if rec.get("result"):
        rec["result"] = dict(rec["result"], result=final[:600])
    reported = (rec.get("result") or {}).get("session_id")
    if reported and reported != session:
        rec["session_reported"] = reported
        arm["warnings"].append(f"{label}: Claude Code reported session {reported}, the driver asked for {session}")
    t = run.transcript(arm, session)
    rec["ctx_after"] = core.tail_status(t)["tokens"] if t.is_file() else None
    rec["boundaries_after"] = core.count_boundaries(t) if t.is_file() else None
    arm["steps"].append(rec)
    log(f"  [{arm['name']}] {label}: {rec['status']}, {rec.get('wall_s')}s, context ~{(rec['ctx_after'] or 0) // 1000}k, "
        f"boundaries {rec['boundaries_after']}")
    if rec["status"] == "ok":
        arm["pending"] = None
        apply_effect(run, arm, rec)
        run.save()
        return rec
    if rec["status"] == "timeout" and retry < run.s["timeout_retries"] and t.is_file():
        arm["pending"] = None
        run.save()
        return step(run, arm, "timeout_resume", ident, TIMEOUT_RESUME, "resume", session, effect, None, timeout,
                    retry + 1)
    run.save()  # the unfinished step stays in arm["pending"] for --continue
    raise Halt(rec["status"], arm["name"], label, (final or rec.get("stderr_tail") or "")[:300])


def apply_effect(run: Run, arm: dict[str, Any], rec: dict[str, Any]) -> None:
    effect = rec.get("effect")
    project = Path(arm["project"])
    if effect == "turn":
        arm["pos"] += 1
        if arm["name"] == "reference" and (rec.get("ctx_after") or 0) >= run.s["ref_limit"]:
            arm["invalid"] = (f"context reached ~{rec['ctx_after']} tokens, over the reference limit "
                              f"{run.s['ref_limit']}: the history does not fit, no full-context reference")
        if not ARMS[arm["name"]]["window"] and run.boundaries(arm):
            note = "a compaction happened in an arm that must not compact"
            if arm["name"] == "reference":
                arm["invalid"] = note
            elif note not in arm["warnings"]:
                arm["warnings"].append(note)
    elif effect in ("handoff", "final_handoff"):
        base = read_json(Path(arm["root"]) / "handoff-base.json")
        diff = diff_manifests(base, manifest(project))
        changed = diff["added"] + diff["modified"]
        state_like = [p for p in changed if core.STATE_FILE_RE.match(p.rsplit("/", 1)[-1])]
        state_file = TASK_FILE if TASK_FILE in changed else state_like[0] if state_like else TASK_FILE
        info = {"after_step": rec["label"], "session": rec["session"], "state_file": state_file,
                "state_file_written": state_file in changed, "files_changed": changed + diff["deleted"]}
        if effect == "handoff":
            arm["handoffs"].append(info)
            arm["session"], arm["await_handoff_resume"] = None, state_file
        else:
            sandbox.snapshot(project, Path(arm["snap"]) / "handoff")
            arm["final_handoff"] = info
    elif effect == "handoff_resume":
        arm["await_handoff_resume"] = None


def ensure_session(run: Run, arm: dict[str, Any]) -> tuple[str, str]:
    """(session id, mode): a session id is 'new' until its transcript exists."""
    if arm["session"] is None:
        arm["session"] = str(uuid.uuid4())
        arm["sessions"].append(arm["session"])
    return arm["session"], "resume" if run.transcript(arm, arm["session"]).is_file() else "new"


def handoff(run: Run, arm: dict[str, Any], effect: str) -> None:
    write_json(Path(arm["root"]) / "handoff-base.json", manifest(Path(arm["project"])))
    n = len(arm["handoffs"]) + 1
    step(run, arm, effect, f"h{n}", HANDOFF_PROMPT, "resume", arm["session"], effect)


def send_turn(run: Run, arm: dict[str, Any]) -> None:
    turn = run.script[arm["pos"]]
    if arm["name"] == "handoff" and arm["session"] and not arm["await_handoff_resume"] \
            and run.context(arm) >= run.s["handoff_at"]:
        handoff(run, arm, "handoff")
    if arm["await_handoff_resume"]:
        session, mode = ensure_session(run, arm)
        step(run, arm, "handoff_resume", f"h{len(arm['handoffs'])}",
             HANDOFF_RESUME.format(path=arm["await_handoff_resume"]), mode, session, "handoff_resume")
    session, mode = ensure_session(run, arm)
    step(run, arm, "turn", turn.id, turn.text, mode, session, "turn")


# --- evaluation branches --------------------------------------------------------------------------

def evaluate(run: Run, arm: dict[str, Any]) -> None:
    project, tdir = Path(arm["project"]), Path(arm["transcripts"])
    snap_pre = Path(arm["snap"]) / "pre"
    if not arm.get("snap_pre"):
        sandbox.snapshot(project, snap_pre)
        arm["snap_pre"] = True
        run.save()
    for variant in run.s["variants"]:
        base_snap, notes = snap_pre, TASK_FILE
        if variant == "fresh" and arm["name"] == "handoff":
            # the old loop restarts from a handoff: write one last handoff, then every fresh session reads it
            if not arm["final_handoff"]:
                sandbox.restore(project, snap_pre)
                handoff(run, arm, "final_handoff")
            base_snap, notes = Path(arm["snap"]) / "handoff", arm["final_handoff"]["state_file"]
        for task in run.tasks:
            key = f"{variant}-{task.id}"
            ev = arm["evals"].get(key) or {}
            if ev.get("status") == "done":
                continue
            out_dir = Path(arm["eval"]) / key
            if ev.get("status") == "started":  # interrupted attempt: set it aside and start the branch again
                sandbox.archive_session(tdir, ev["session"], out_dir / f"aborted-{ev.get('attempt', 1)}")
            sandbox.restore(project, base_snap)
            for rel, text in task.setup_files.items():
                write_text(project / rel, text)
            base = manifest(project)
            session = str(uuid.uuid4())
            if variant == "resume":
                prompt, mode, fork_from = task.prompt, "fork", arm["session"]
            else:
                prompt, mode, fork_from = FRESH_OPENING.format(path=notes) + "\n\n" + task.prompt, "new", None
            ev = {"status": "started", "session": session, "variant": variant, "task": task.id, "prompt": prompt,
                  "attempt": int(ev.get("attempt", 0)) + 1, "forked_from": fork_from}
            arm["evals"][key] = ev
            run.save()
            rec = step(run, arm, "eval", key, prompt, mode, session, None, fork_from, run.s["timeouts"]["eval"])
            final = Path(rec["final_file"]).read_text(encoding="utf-8")
            report = None
            if task.id in REPORT_TASKS:
                rec2 = step(run, arm, "eval_report", key, REPORT_PROMPT, "resume", session, None, None,
                            run.s["timeouts"]["eval"])
                report = sandbox.parse_report(Path(rec2["final_file"]).read_text(encoding="utf-8"))
            if out_dir.joinpath("outcome.json").exists():
                shutil.rmtree(out_dir / "files", ignore_errors=True)
            sandbox.collect_outcome(project, base, out_dir, final, report, base_snap, task.setup_files)
            ev["moved"] = sandbox.archive_session(tdir, session, out_dir / "transcript")
            sandbox.restore(project, base_snap)
            ev.update(status="done", outcome=str(out_dir))
            run.save()
    sandbox.restore(project, snap_pre)


# --- the run ----------------------------------------------------------------------------------------

def recover(run: Run) -> None:
    """After a halt or crash: finish a main-line step whose prompt was delivered, drop one that was not."""
    for arm in run.arms():
        p = arm.get("pending")
        if not p:
            continue
        arm["pending"] = None
        run.save()
        if p.get("effect") is None:
            continue  # an evaluation branch: evaluate() sets the attempt aside and runs the branch again
        t = run.transcript(arm, p["session"])
        prompt = Path(p["prompt_file"]).read_text(encoding="utf-8")
        if t.is_file() and prompt[:150] in metrics.last_prompt(t)[1]:
            step(run, arm, "limit_resume", p["id"], LIMIT_RESUME, "resume", p["session"], p["effect"])


def advance(run: Run) -> None:
    s = run.s
    s["status"], s["halt"] = "running", None
    run.save()
    recover(run)
    limit = min(len(run.script), s["max_turns"] or len(run.script))

    def usable(arm: dict[str, Any]) -> bool:
        return not arm["invalid"]
    for arm in run.arms():
        while usable(arm) and arm["pos"] < min(s["base_turns"], limit):
            send_turn(run, arm)
    compacting = [a for a in run.arms() if ARMS[a["name"]]["compacts"]]
    while True:
        need = [a for a in compacting if usable(a) and not a["shortfall"] and run.boundaries(a) < s["min_compactions"]]
        if not need:
            break
        for arm in need:
            if arm["pos"] >= limit:
                if not s["allow_fewer"]:
                    raise Halt("script_exhausted", arm["name"], f"turn {arm['pos']}",
                               f"{run.boundaries(arm)} of {s['min_compactions']} compactions after every scripted "
                               "turn; continue with --allow-fewer-compactions to evaluate anyway")
                arm["shortfall"] = True
                continue
            send_turn(run, arm)
    s["equalised_turns"] = max([a["pos"] for a in run.arms() if usable(a)] or [0])
    for arm in run.arms():
        while usable(arm) and arm["pos"] < s["equalised_turns"]:
            send_turn(run, arm)
    for arm in run.arms():
        if usable(arm):
            evaluate(run, arm)
    s["status"] = "complete"
    run.save()


def run_to_end(run: Run) -> int:
    try:
        advance(run)
    except Halt as halt:
        run.s["status"] = "halted"
        run.s["halt"] = {"reason": halt.reason, "arm": halt.arm, "step": halt.label, "detail": halt.detail,
                         "at": now_iso()}
        run.save()
        log(f"\nHALTED ({halt.reason}) in arm {halt.arm} at {halt.label}: {halt.detail}")
        log(f"State saved. When usage is available again: run.py --continue \"{run.dir}\" --yes")
        return 3
    except KeyboardInterrupt:
        run.s["status"] = "halted"
        run.s["halt"] = {"reason": "interrupted", "at": now_iso()}
        run.save()
        log(f"\nInterrupted. State saved: run.py --continue \"{run.dir}\" --yes")
        return 130
    report(run)
    return 0


# --- report -------------------------------------------------------------------------------------------

def report(run: Run, quiet: bool = False) -> dict[str, Any]:
    s, exp = run.s, run.scn.expected()
    tasks = {t.id: t for t in run.scn.eval_tasks()}
    out: dict[str, Any] = {"run": str(run.dir), "status": s["status"], "simulated": s["simulated"],
                           "profile": s["profile"], "evidence_of_quality": bool(run.profile["evidence_of_quality"])
                           and not s["simulated"], "size": s["size"], "window": s["window"],
                           "min_compactions": s["min_compactions"], "equalised_turns": s["equalised_turns"],
                           "claude": s["claude"], "arms": {}}
    for arm in run.arms():
        name, tdir = arm["name"], Path(arm["transcripts"])
        roots = [Path(arm["root"]), tdir]
        per = [metrics.transcript_metrics(run.transcript(arm, sid), None, roots) for sid in arm["sessions"]
               if run.transcript(arm, sid).is_file()]
        main = metrics.combine(per, [x for x in arm["steps"] if x["kind"] in MAIN_KINDS])
        sub = [metrics.subagent_tokens(run.transcript(arm, sid)) for sid in arm["sessions"]]
        main["subagent_tokens"] = {k: sum(x[k] for x in sub) for k in ("input", "cache_write", "cache_read", "output",
                                                                        "transcripts")}
        hooks = metrics.hook_evidence(tdir, arm["sessions"])
        entry: dict[str, Any] = {
            "what": ARMS[name]["what"], "invalid": arm["invalid"], "warnings": arm["warnings"],
            "scripted_turns": arm["pos"], "sessions": arm["sessions"], "handoffs": arm["handoffs"],
            "final_handoff": arm["final_handoff"],
            "compaction_requirement_met": (main["compaction_count"] >= s["min_compactions"]
                                           if ARMS[name]["compacts"] else None),
            "metrics": main, "hooks": hooks,
            "profile_check": metrics.verify_profile(per, run.profile, s["window"] if ARMS[name]["window"] else None),
            "evaluation": {}, "scores": {}}
        if s["profile"] == "mechanics" and name == "system":
            entry["mechanics"] = metrics.mechanics_verdict(main, hooks)
        for key, ev in arm["evals"].items():
            if ev.get("status") != "done":
                continue
            outcome = scoring.Outcome.load(Path(ev["outcome"]))
            results = scoring.score_task(run.scn, tasks[ev["task"]], outcome, exp)
            t = Path(ev["outcome"]) / "transcript" / f"{ev['session']}.jsonl"
            branch = None
            if t.is_file():
                start = metrics.prompt_line(t, ev["prompt"]) if ev["variant"] == "resume" else None
                m = metrics.transcript_metrics(t, start, roots)
                branch = {k: m[k] for k in ("api_calls", "tokens", "retrieval", "rereads", "repeated_work", "wall_s")}
                branch["compactions_in_branch"] = len(m["compactions"])
            entry["evaluation"][key] = {"variant": ev["variant"], "task": ev["task"], "attempt": ev["attempt"],
                                        "results": results, "branch_metrics": branch,
                                        "files_touched": outcome.touched()[:40]}
        for variant in s["variants"]:
            rows = [r for key, e in entry["evaluation"].items() if e["variant"] == variant for r in e["results"]]
            entry["scores"][variant] = scoring.summarise(rows)
        out["arms"][name] = entry
    write_json(run.dir / "results.json", out)
    if not quiet:
        for line in format_report(out):
            log(line)
    return out


def format_report(out: dict[str, Any]) -> list[str]:
    lines = [f"Results for {out['run']} (profile {out['profile']}, size {out['size']}, window {out['window']})"]
    if out["simulated"]:
        lines.append("SIMULATED RUN: produced offline by the dry run; these numbers are not results.")
    elif not out["evidence_of_quality"]:
        lines.append("MECHANICS PROFILE: shows whether the hooks fire. It is NOT evidence of answer quality.")
    for name, e in out["arms"].items():
        m = e["metrics"]
        lines.append(f"\n{name}: {e['what']}")
        if e["invalid"]:
            lines.append(f"  INVALID: {e['invalid']}")
        lines.append(f"  turns {e['scripted_turns']}, sessions {m['sessions']}, compactions {m['compaction_count']}"
                     + ("" if e["compaction_requirement_met"] is None else
                        f" (required {out['min_compactions']}: {'met' if e['compaction_requirement_met'] else 'NOT met'})")
                     + f", handoffs {len(e['handoffs'])}")
        lines.append(f"  context peak per cycle: {[p // 1000 for p in m['context_peaks_per_cycle']]} k; pauses "
                     f"{m['compaction_pause_s']['each']} s")
        lines.append(f"  retrieval {m['retrieval_calls']}, rereads {m['rereads']}, repeated work {m['repeated_work']}")
        lines.append(f"  tokens {m['tokens']}, requests {m['api_calls']}, wall {m.get('driver', {}).get('wall_s')} s")
        pc = e["profile_check"]
        lines.append(f"  profile verified: {pc['verified']}")
        if pc["mismatched"]:
            lines.append(f"  PROFILE MISMATCH: {pc['mismatched']}")
        lines.append(f"  not verifiable from the transcript: {len(pc['unverified'])} item(s), see results.json")
        if "mechanics" in e:
            lines.append(f"  mechanics: {e['mechanics']['checks']}")
        for variant, cats in e["scores"].items():
            parts = [f"{c} {v['passed']}/{v['passed'] + v['failed']}" + (f" (+{v['unscorable']} unscorable)"
                                                                         if v["unscorable"] else "")
                     for c, v in sorted(cats.items())]
            lines.append(f"  {variant:<6} " + "; ".join(parts))
    return lines


# --- plan and command line ----------------------------------------------------------------------------

def print_plan(state: dict[str, Any], scn: Scenario, run_dir: Path, est: dict[str, Any]) -> None:
    p = state["profile_def"]
    log(f"Run directory: {run_dir}")
    log(f"Profile {state['profile']}: model {p['model']}, effort {p['effort']}, --settings {p['settings'] or 'none'}, "
        f"setting sources {claude_cli.SETTING_SOURCES}, permission mode {state['permission_mode']}, never --bare")
    if not p["evidence_of_quality"]:
        log("  This profile only checks that the hooks fire. It is NOT evidence of quality.")
    log(f"Claude Code: {state['claude']['path']} (version {state['claude'].get('version')}, found by "
        f"{state['claude']['how']})")
    if state["claude"].get("version") != VERIFIED_CLI:
        log(f"  note: the system's threshold and hook notes were checked on {VERIFIED_CLI}")
    log(f"Scenario: size {state['size']}, seed {state['seed']}, {len(scn.turns())} core turns, "
        f"{len(scn.extension_turns())} extension turns, {len(scn.overflow_turns())} overflow turns; "
        f"base {state['base_turns']} turns, then top-up until {state['min_compactions']} compaction(s) "
        f"(window {state['window']}, threshold ~{state['window'] - core.COMPACT_RESERVE_TOKENS})")
    for name in state["arms_order"]:
        log(f"  arm {name:<10} {sandbox.arm_paths(run_dir, name)['project']}  ({ARMS[name]['what']})")
    log(f"Handoff arm hands off once context passes {state['handoff_at']}; reference arm is dropped past "
        f"{state['ref_limit']}. Continuation tasks {state['tasks']} x restarts {state['variants']}; step timeouts "
        f"{state['timeouts']} s.")
    log("Token forecast per arm:")
    for line in format_estimate(est):
        log("  " + line)


def parse_args(argv: list[str]) -> argparse.Namespace:
    ap = argparse.ArgumentParser(prog="run.py", description="Isolated A/B evaluation of the context system.")
    ap.add_argument("--dry-run", action="store_true", help="validate everything offline; no model call")
    ap.add_argument("--continue", dest="cont", metavar="RUN_DIR", help="continue a halted run")
    ap.add_argument("--report", metavar="RUN_DIR", help="recompute results.json from a run's saved files")
    ap.add_argument("--profile", choices=sorted(PROFILES), default="quality")
    ap.add_argument("--size", choices=["full", "fit"])
    ap.add_argument("--arms", help="comma-separated: system,native,handoff,reference")
    ap.add_argument("--run", help="short run name (default: profile letter + date-time)")
    ap.add_argument("--root", help="where run directories go (default %%LOCALAPPDATA%%\\ctx-eval)")
    ap.add_argument("--yes", action="store_true", help="start after the plan and token forecast are printed")
    ap.add_argument("--claude", help="claude.exe to use (default: discovered)")
    ap.add_argument("--python", default=sys.executable, help="interpreter for the system's hooks")
    ap.add_argument("--window", type=int)
    ap.add_argument("--min-compactions", type=int)
    ap.add_argument("--handoff-at", type=int, default=300_000)
    ap.add_argument("--ref-limit", type=int, default=950_000)
    ap.add_argument("--tasks")
    ap.add_argument("--variants")
    ap.add_argument("--permission-mode", default="bypassPermissions")
    ap.add_argument("--turn-timeout", type=int)
    ap.add_argument("--eval-timeout", type=int)
    ap.add_argument("--timeout-retries", type=int, default=2)
    ap.add_argument("--max-turns", type=int)
    ap.add_argument("--allow-fewer-compactions", action="store_true")
    ap.add_argument("--allow-user-overrides", action="store_true",
                    help="run even though user-level settings define a compaction window or hooks")
    ap.add_argument("--seed", type=int, default=20261010)
    ap.add_argument("--real-transcript", action="append", default=[], help="(dry run) transcript to measure a copy of")
    ap.add_argument("--keep-going", action="store_true", help="(dry run) do not stop at the first failed section")
    ap.add_argument("--keep-temp", action="store_true", help="(dry run) keep the temporary sandboxes for inspection")
    return ap.parse_args(argv)


def _split(value: str | None) -> list[str] | None:
    return [x.strip() for x in value.split(",") if x.strip()] if value else None


def preflight(args: argparse.Namespace) -> tuple[dict[str, str] | None, int]:
    """Discovery, login and settings checks shared by a new run and --continue."""
    try:
        claude = claude_cli.discover_claude(args.claude)
    except RuntimeError as exc:
        log(f"ABORT: {exc}. Nothing was created or run.")
        return None, 2
    claude["version"] = claude_cli.claude_version(claude["path"])
    env, removed, remaining = claude_cli.child_env()
    auth = claude_cli.auth_status(claude["path"], env)
    log(f"Claude Code {claude['version']} at {claude['path']} ({claude['how']}); login: "
        f"{'yes' if auth['loggedIn'] else 'NO'} ({auth.get('authMethod')})")
    if not auth["loggedIn"]:
        log("ABORT: Claude Code is not logged in (`claude auth status` reports loggedIn=false). Log in yourself "
            "with `claude auth login`, then start again. Nothing was created or run.")
        return None, 2
    missing = claude_cli.missing_flags(claude["path"])
    if missing:
        log(f"ABORT: `claude --help` does not list option(s) the driver uses: {missing}. Nothing was created or run.")
        return None, 2
    leaks = sandbox.settings_leaks(sandbox.claude_home())
    for note in leaks["notes"]:
        log(f"  note: {note}")
    if leaks["blocking"] and not args.allow_user_overrides:
        log("ABORT: settings outside the sandboxes would change what the arms measure: " + "; ".join(leaks["blocking"])
            + ". Remove them for the run or pass --allow-user-overrides.")
        return None, 2
    if removed:
        log(f"  environment variables not passed to Claude Code: {removed}")
    if remaining:
        log(f"  CLAUDE*/ANTHROPIC*/DISABLE_* variables that are passed through to every arm: {remaining}")
    if "CLAUDECODE" in removed:
        log("  WARNING: this shell was started by Claude Code. The sessions under test would inherit that session's "
            "variables (listed above). Start the run from a plain terminal instead.")
    return claude, 0


def main(argv: list[str]) -> int:
    args = parse_args(argv)
    if args.dry_run:
        from .dryrun import dry_run
        return dry_run(args)
    if args.report:
        report(Run.load(Path(args.report)))
        return 0
    if args.cont:
        run = Run.load(Path(args.cont))
        if run.s["simulated"]:
            log("This run directory was produced by the dry run's offline simulation; it cannot be continued live.")
            return 2
        claude, code = preflight(args)
        if claude is None:
            return code
        run.s["claude"] = claude
        run.s["allow_fewer"] = run.s["allow_fewer"] or args.allow_fewer_compactions
        for key, value in (("turn", args.turn_timeout), ("eval", args.eval_timeout)):
            if value:
                run.s["timeouts"][key] = value
        done = {a["name"]: (a["pos"], sum(1 for e in a["evals"].values() if e.get("status") == "done"))
                for a in run.arms()}
        log(f"Continuing {run.dir}: status {run.s['status']}, halt {run.s['halt']}; (turns, branches done) {done}")
        if not args.yes:
            log("Nothing was started. Re-run with --yes to continue.")
            return 0
        return run_to_end(run)
    claude, code = preflight(args)
    if claude is None:
        return code
    try:
        state = make_state(args.profile, args.size, _split(args.arms), claude=claude,
                           python=str(Path(args.python).resolve()), home=sandbox.claude_home(), seed=args.seed,
                           window=args.window, min_compactions=args.min_compactions, handoff_at=args.handoff_at,
                           ref_limit=args.ref_limit, tasks=_split(args.tasks), variants=_split(args.variants),
                           permission_mode=args.permission_mode, turn_timeout=args.turn_timeout,
                           eval_timeout=args.eval_timeout, timeout_retries=args.timeout_retries,
                           allow_fewer=args.allow_fewer_compactions, max_turns=args.max_turns)
    except ValueError as exc:
        log(f"ABORT: {exc}")
        return 2
    root = Path(args.root) if args.root else sandbox.default_root()
    run_dir = root / (args.run or f"{args.profile[0]}{time.strftime('%y%m%d-%H%M')}")
    scn = Scenario(state["seed"], state["size"])
    problems = scn.audit()
    if problems:
        log("ABORT: the scenario is not self-consistent: " + "; ".join(problems[:5]))
        return 2
    print_plan(state, scn, run_dir, estimate(scn, state))
    for name in state["arms_order"]:
        budget = sandbox.path_budget(sandbox.arm_paths(run_dir, name)["project"], sandbox.claude_home())
        ctx_above = sandbox.ancestor_context(sandbox.arm_paths(run_dir, name)["project"], sandbox.claude_home())
        if not budget["ok"]:
            log(f"ABORT: paths too long for arm {name}: {budget}. Use a shorter --root or --run.")
            return 2
        if ctx_above:
            log(f"  note: Claude Code may also load {ctx_above} in arm {name}")
    if run_dir.exists():
        log(f"ABORT: {run_dir} already exists. Choose another --run, or use --continue.")
        return 2
    if not args.yes:
        log("\nNothing was created or started. Re-run with --yes to begin.")
        return 0
    run = Run(run_dir, state)
    run_dir.mkdir(parents=True)
    run.save()
    setup(run)
    return run_to_end(run)
