"""--dry-run: validate the whole harness offline.

No model is called and Claude Code is never started with a prompt. claude.exe is run only for
`--version`, `--help` and `auth status`, to report what a live run would find. Everything is created under one
temporary directory with a short path (run directories plus a temporary CLAUDE_CONFIG_DIR) and removed
afterwards unless a section failed or --keep-temp was given.

Sections: (a) scenario, (b) sandboxes and isolation, (c) arm configuration and doctor, (d) simulated
runs through the driver, (e) scoring, (f) metrics on copies of real transcripts, (g) the command
lines of a live run, (h) the token forecast. Each prints PASS or FAIL; the exit code is 0 only if all
pass and the isolation check still holds at the end.
"""
from __future__ import annotations

import contextlib
import io
import json
import os
import shutil
import tempfile
import time
import traceback
from pathlib import Path
from typing import Any, Callable

from . import claude_cli, driver, metrics, sandbox, scoring
from .common import CTX_SRC, is_under, log, manifest, read_json, run_retry
from .estimate import estimate, format_estimate
from .sandbox import ARMS, core
from .scenario import FRESH_OPENING, TASK_FILE, Scenario
from .simulate import FakeClaude, good_output

REPO = CTX_SRC.parent.parent
# Two long sessions of the real project, measured when the system was designed: (peak context, compactions).
KNOWN_TRANSCRIPTS = {"2d443524-e65c-40cb-9f2b-07f620551390": (731_239, 0),
                     "6c9a1a7a-9848-4531-b2b8-734b1fa172aa": (869_982, 0)}
EXAMPLE_IDS = {"main": "11111111-1111-4111-8111-111111111111", "fork": "22222222-2222-4222-8222-222222222222",
               "fresh": "33333333-3333-4333-8333-333333333333"}
ALL_CATEGORIES = {"correction_applied", "distant_evidence", "rejected_avoided", "instruction_kept",
                  "conversation_fact", "unfinished_work", "early_file_fact", "decision_applied",
                  "repeated_work_avoided"}


class Section:
    def __init__(self, key: str, title: str):
        self.key, self.title, self.failed = key, title, 0
        log(f"\n({key}) {title}")

    def check(self, ok: Any, text: str, detail: Any = "") -> bool:
        if ok:
            log(f"  ok    {text}")
        else:
            self.failed += 1
            log(f"  FAIL  {text}" + (f": {detail}" if detail not in ("", None) else ""))
        return bool(ok)

    def note(self, text: str) -> None:
        log(f"  note  {text}")

    def info(self, text: str) -> None:
        log(f"        {text}")


def _stat(path: Path) -> list[int] | None:
    try:
        st = path.stat()
        return [st.st_size, st.st_mtime_ns]
    except OSError:
        return None


def _difference(before: Any, after: Any) -> str:
    """What changed between two before/after values, short enough to print."""
    if isinstance(before, dict) and isinstance(after, dict):
        keys = sorted(k for k in set(before) | set(after) if before.get(k) != after.get(k))
        return "; ".join(f"{k}: {before.get(k)} -> {after.get(k)}" for k in keys[:6])
    if isinstance(before, list) and isinstance(after, list):
        return f"added {sorted(set(after) - set(before))[:6]}, removed {sorted(set(before) - set(after))[:6]}"
    return f"{before} -> {after}"


def _quiet(fn: Callable, *args: Any) -> tuple[Any, str]:
    """Run a driver function with its step-by-step log captured instead of printed."""
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        value = fn(*args)
    return value, buf.getvalue()


class DryRun:
    def __init__(self, args):
        self.args = args
        self.python = str(Path(args.python).resolve())
        self.real_home = sandbox.claude_home()
        self.tmp = Path(tempfile.mkdtemp(prefix="cxd"))
        self.home = self.tmp / "h"          # the temporary CLAUDE_CONFIG_DIR
        self.home.mkdir()
        self.runs: dict[str, driver.Run] = {}
        self.results: dict[str, dict[str, Any]] = {}
        self.estimates: dict[str, dict[str, Any]] = {}
        self.claude: dict[str, Any] = {"path": "claude.exe", "how": "not found; placeholder", "version": None}
        self.auth: dict[str, Any] | None = None

    # --- what must not change -------------------------------------------------------------------
    def outside_state(self) -> dict[str, Any]:
        projects = self.real_home / "projects"
        ctx_files = {}
        for dirpath, dirnames, filenames in os.walk(CTX_SRC):
            dirnames[:] = [d for d in dirnames if d not in ("__pycache__", ".pytest_cache")]
            for name in filenames:
                p = Path(dirpath) / name
                ctx_files[p.relative_to(CTX_SRC).as_posix()] = _stat(p)
        return {
            "project .claude exists": (REPO / ".claude").exists(),
            "project top-level entries": sorted(p.name for p in REPO.iterdir()),
            "tools/context_system files (size, mtime)": ctx_files,
            "user settings and memory files": {n: _stat(self.real_home / n)
                                               for n in ("settings.json", "settings.local.json", "CLAUDE.md")},
            "context-system runtime of the real project": (projects / core.project_slug(REPO) / "context-system").exists(),
            "default run root exists": sandbox.default_root().exists(),
            "real project directories": sorted(p.name for p in projects.iterdir()) if projects.is_dir() else [],
        }

    def isolation(self, s: Section, before: dict[str, Any], when: str) -> None:
        after = self.outside_state()
        for key in before:
            if key == "real project directories":
                continue
            s.check(after[key] == before[key], f"unchanged {when}: {key}", _difference(before[key], after[key]))
        ours = core.project_slug(self.tmp)
        leaked = [n for n in after["real project directories"] if n.startswith(ours)]
        s.check(not leaked, f"no sandbox transcript directory under the real {self.real_home / 'projects'}", leaked)
        allowed = {"h", "q", "m", "x"}
        extra = sorted(p.name for p in self.tmp.iterdir() if p.name not in allowed)
        s.check(not extra, f"everything written is inside the run directories and the temporary config directory "
                           f"under {self.tmp}", extra)

    def tool_env(self, project: Path) -> dict[str, str]:
        env, _, _ = claude_cli.child_env()
        env["CLAUDE_PROJECT_DIR"] = str(project)
        env["CLAUDE_CONFIG_DIR"] = str(self.home)
        return env

    def new_run(self, key: str, profile: str, size: str | None, arms: list[str] | None) -> driver.Run:
        state = driver.make_state(profile, size, arms, claude=self.claude, python=self.python, home=self.home,
                                  seed=self.args.seed, simulated=True)
        run = driver.Run(self.tmp / key, state)
        run.dir.mkdir(parents=True)
        run.save()
        driver.setup(run)
        self.runs[key] = run
        return run

    # --- (a) ------------------------------------------------------------------------------------
    def scenario(self, s: Section) -> None:
        for seed, size in ((self.args.seed, "full"), (self.args.seed, "fit"), (self.args.seed + 1, "fit")):
            scn = Scenario(seed, size)
            files = scn.files()
            problems = scn.audit(files)
            st = scn.stats()
            s.check(not problems, f"seed {seed} size {size}: audit clean ({st['files']} files, "
                                  f"{st['project_chars'] // 1000}k characters, {st['core_turns']} core + "
                                  f"{st['extension_pool']} extension + {len(scn.overflow_turns())} overflow turns, "
                                  f"core reads ~{st['core_read_tokens'] // 1000}k tokens)", "; ".join(problems[:4]))
            s.check(Scenario(seed, size).files() == files, f"seed {seed} size {size}: generation is deterministic")
            script = scn.script()
            ids = [t.id for t in script]
            s.check(len(ids) == len(set(ids)) and 0 < scn.base_turns() <= len(script),
                    f"seed {seed} size {size}: {len(script)} scripted turns with unique ids, base {scn.base_turns()}")
            tasks, exp = scn.eval_tasks(), scn.expected()
            scored = {t.id: set(scoring.SCORERS[t.id](scn, exp, scoring.Outcome.memory({}, {}))) for t in tasks}
            unknown = [(t.id, c) for t in tasks for _, c in t.checks if c not in scored[t.id]]
            s.check([t.id for t in tasks] == ["E1", "E2", "E3", "E4"] and not unknown,
                    f"seed {seed} size {size}: continuation tasks E1-E4, every check has a scorer", unknown[:4])
        a, b = Scenario(self.args.seed, "fit"), Scenario(self.args.seed + 1, "fit")
        s.check(a.files() != b.files(), "a different seed gives a different project")

    # --- (b) ------------------------------------------------------------------------------------
    def sandboxes(self, s: Section, before: dict[str, Any]) -> None:
        s.info(f"temporary root {self.tmp}; temporary CLAUDE_CONFIG_DIR {self.home}")
        q = self.new_run("q", "quality", "fit", ["system", "native", "handoff", "reference"])
        m = self.new_run("m", "mechanics", None, None)
        for label, run in (("quality/fit", q), ("mechanics", m)):
            for arm in run.arms():
                b = arm["budget"]
                root = Path(arm["root"])
                inside = is_under(arm["project"], [run.dir]) and is_under(arm["transcripts"], [self.home])
                s.check(inside and b["ok"] and not b["hashed"],
                        f"{label} arm {arm['name']}: sandbox {root} (slug {b['slug_len']} characters, longest path "
                        f"{b['longest_path']}), transcripts under the temporary config directory", arm["budget"])
                s.check(sorted(p.name for p in root.iterdir()) == ["cs", "p"] and not (root / "cs" / "eval").exists(),
                        f"{label} arm {arm['name']}: own project (p) and own copy of the context system (cs), no eval/")
                s.check(manifest(Path(arm["project"]), {".claude"}) == manifest_of(run.scn),
                        f"{label} arm {arm['name']}: project files equal the generated scenario")
        s.check(sorted(p.name for p in q.dir.iterdir()) == sorted(["run.json"] + [ARMS[a]["dir"] for a in q.s["arms_order"]]),
                "run directory holds one directory per arm and run.json")
        self.isolation(s, before, "after creating the sandboxes")
        live = sandbox.arm_paths(sandbox.default_root() / "qYYMMDD-HHMM", "system")["project"]
        budget = sandbox.path_budget(live, self.real_home)
        s.check(budget["ok"], f"a live run under {sandbox.default_root()} stays within the path limits "
                              f"(slug {budget['slug_len']}, longest path {budget['longest_path']})", budget)
        above = sandbox.ancestor_context(live, self.real_home)
        s.note(f"files above the live sandboxes that Claude Code may also load: {above or 'none'}")

    # --- (c) ------------------------------------------------------------------------------------
    def arm_config(self, s: Section) -> None:
        for label in ("q", "m"):
            run = self.runs.get(label)
            if not s.check(run is not None, f"run {label} exists (needs section b)"):
                continue
            window, tag = run.s["window"], f"{run.s['profile']} window {run.s['window']}"
            for arm in run.arms():
                name, project = arm["name"], Path(arm["project"])
                claude_dir = project / ".claude"
                shared, local = read_json(claude_dir / "settings.json"), read_json(claude_dir / "settings.local.json")
                problems = sandbox.verify_arm(arm, run.s["python"], window)
                s.check(not problems, f"{tag} arm {name}: sandbox.verify_arm", "; ".join(problems))
                extras = sorted(p.name for p in claude_dir.iterdir())
                if name == "system":
                    inst = arm["install"] or {}
                    script = next((a for a in inst.get("argv") or [] if str(a).endswith("ctx.py")), "")
                    s.check(inst.get("exit") == 0 and is_under(script, [arm["ctx"]]),
                            f"{tag} arm system: installed by the sandbox's own copy ({script})", inst.get("out"))
                    s.check(shared.get("autoCompactWindow") == window and shared.get("precomputeCompactionEnabled") is False,
                            f"{tag} arm system: settings.json autoCompactWindow={shared.get('autoCompactWindow')}, "
                            f"precomputeCompactionEnabled={shared.get('precomputeCompactionEnabled')}", shared)
                    events = sorted(local.get("hooks") or {})
                    calls = [h for groups in (local.get("hooks") or {}).values() for g in groups for h in g["hooks"]]
                    own = all(any(is_under(a, [arm["ctx"]]) for a in h.get("args") or []) for h in calls)
                    s.check(len(events) == 6 and own and (claude_dir / "rules" / "context-system.md").is_file(),
                            f"{tag} arm system: hooks {', '.join(events)}; all call this arm's cs/ctx.py; rules present")
                    cmd = [self.python, "-I", "-B", "-X", "utf8", str(Path(arm["ctx"]) / "ctx.py"), "doctor",
                           "--project", str(project)]
                    proc = run_retry(cmd, capture_output=True, timeout=180, env=self.tool_env(project))
                    out = proc.stdout.decode("utf-8", errors="replace")
                    for line in out.splitlines():
                        s.info("doctor| " + line)
                    s.check(proc.returncode == 0 and "Doctor: OK" in out, f"{tag} arm system: ctx.py doctor reports OK",
                            f"exit {proc.returncode} {proc.stderr.decode('utf-8', errors='replace')[-300:]}")
                    s.check(f"autoCompactWindow {window // 1000}k from project settings" in out
                            and "compaction: disabled" in out,
                            f"{tag} arm system: doctor sees window {window // 1000}k from project settings and "
                            "background compaction disabled")
                elif name == "native":
                    s.check(shared == {"autoCompactWindow": window, "precomputeCompactionEnabled": False}
                            and extras == ["settings.json"],
                            f"{tag} arm native: only autoCompactWindow={window} and precomputeCompactionEnabled=false; "
                            "no hooks, no rules, no install record", f"{shared} {extras}")
                else:
                    s.check(shared == {} and extras == ["settings.json"],
                            f"{tag} arm {name}: empty settings (no window, no hooks, no rules)", f"{shared} {extras}")

    # --- (d) ------------------------------------------------------------------------------------
    def simulate(self, s: Section, label: str, faults: dict[tuple[str, str, str], str]) -> None:
        run = self.runs.get(label)
        if not s.check(run is not None, f"run {label} exists (needs section b)"):
            return
        tag = f"{run.s['profile']}/{run.s['size']}"
        fake = FakeClaude(run.scn, self.home, faults)
        run.executor = fake
        halts: list[dict[str, Any]] = []
        code, started = None, time.time()
        for _ in range(len(faults) + 3):
            code, _ = _quiet(driver.run_to_end, run)
            if code != 3:
                break
            halts.append(dict(run.s["halt"]))
            run = driver.Run.load(run.dir, fake)  # what --continue does: only run.json is carried over
        self.runs[label] = run
        limits = [k for k, v in faults.items() if v.startswith("limit")]
        s.check(code == 0 and run.s["status"] == "complete",
                f"{tag}: run completed in {time.time() - started:.0f} s, {len(fake.steps)} simulated steps",
                f"exit {code}, status {run.s['status']}, halt {run.s['halt']}")
        s.check([(h.get("arm"), h.get("reason")) for h in halts] == [(k[0], "limit") for k in limits] and not fake.faults,
                f"{tag}: {len(halts)} simulated usage-limit stop(s) halted the run and it continued from run.json "
                f"each time ({', '.join(h['arm'] + ' ' + h['step'] for h in halts)})",
                f"halts {halts}, faults not reached {list(fake.faults)}")
        s.check(not fake.argv_problems, f"{tag}: every step's command line matches its mode (new / resume / fork) "
                                        "and the profile", fake.argv_problems[:3])
        s.check(not fake.hook_problems, f"{tag}: hook commands exit 0 ({sum(fake.hook_runs.values())} hook processes: "
                + ", ".join(f"{e} {n}" for (_, e), n in sorted(fake.hook_runs.items())) + ")", fake.hook_problems[:3])
        code2, _ = _quiet(driver.main, ["--continue", str(run.dir)])
        s.check(code2 == 2, f"{tag}: run.py --continue refuses a simulated run directory", f"exit {code2}")
        code3, text = _quiet(driver.main, ["--report", str(run.dir)])
        out = read_json(run.dir / "results.json")
        s.check(code3 == 0 and out.get("simulated") is True and out.get("evidence_of_quality") is False
                and "SIMULATED RUN" in text,
                f"{tag}: run.py --report rebuilds results.json, marked simulated and not evidence of quality")
        self.results[label] = out
        if not out.get("arms"):
            return
        tasks = {t.id: t for t in run.scn.eval_tasks()}
        want_keys = sorted(f"{v}-{t}" for v in run.s["variants"] for t in run.s["tasks"])
        branches = len(run.arms()) * len(run.s["tasks"])
        s.check(fake.modes[("eval", "fork")] >= branches and fake.modes[("eval", "new")] >= branches,
                f"{tag}: every continuation task ran on a fork of the session ({fake.modes[('eval', 'fork')]} fork "
                f"steps) and in a fresh session ({fake.modes[('eval', 'new')]} new-session steps) in each of "
                f"{len(run.arms())} arm(s)")
        for arm in run.arms():
            name, e = arm["name"], out["arms"][arm["name"]]
            mm, kinds = e["metrics"], [x["kind"] for x in arm["steps"]]
            s.check(e["scripted_turns"] == out["equalised_turns"] and not e["invalid"] and not e["warnings"]
                    and arm["pending"] is None,
                    f"{tag} {name}: {e['scripted_turns']} scripted turns (same in every arm), valid, nothing pending",
                    f"turns {e['scripted_turns']} of {out['equalised_turns']}, invalid {e['invalid']}, "
                    f"warnings {e['warnings']}, pending {arm['pending']}")
            if ARMS[name]["compacts"]:
                s.check(e["compaction_requirement_met"] and mm["compaction_count"] == fake.compactions[name]
                        - sum(v["branch_metrics"]["compactions_in_branch"] for v in e["evaluation"].values()),
                        f"{tag} {name}: {mm['compaction_count']} compaction(s) on the main line (required "
                        f"{out['min_compactions']}), peaks {[p // 1000 for p in mm['context_peaks_per_cycle']]} k, "
                        f"pauses {mm['compaction_pause_s']['each']} s",
                        f"met {e['compaction_requirement_met']}, fabricated {fake.compactions[name]}")
            else:
                s.check(mm["compaction_count"] == 0 and fake.compactions[name] == 0,
                        f"{tag} {name}: no compaction (peak context {mm['context_peak'] // 1000} k)")
            pc = e["profile_check"]
            s.check(not pc["mismatched"] and len(pc["verified"]) >= 3,
                    f"{tag} {name}: profile evidence from the transcript: {len(pc['verified'])} verified, "
                    f"{len(pc['unverified'])} not verifiable, 0 mismatched", pc["mismatched"] or pc)
            diffs = [d for sid in arm["sessions"] for d in
                     metrics.cross_check(metrics.transcript_metrics(run.transcript(arm, sid)))]
            s.check(not diffs and not mm["writes_outside_sandbox"],
                    f"{tag} {name}: harness metrics agree with ctx.py measure; no write outside the sandbox",
                    diffs[:3] or mm["writes_outside_sandbox"][:3])
            # evaluation branches
            wrong = []
            for key in want_keys:
                ev = e["evaluation"].get(key)
                if not ev:
                    wrong.append(f"{key}: missing")
                    continue
                expect = fake.expectation(ev["variant"], ev["task"])
                got = {r["check"]: r["pass"] for r in ev["results"]}
                wrong += [f"{key} {c}: got {got.get(c)}, expected {w}" for c, w in expect.items() if got.get(c) is not w]
            good = sum(1 for k in want_keys if good_output(*k.split("-", 1)))
            s.check(sorted(e["evaluation"]) == want_keys and not wrong,
                    f"{tag} {name}: {len(want_keys)} branches scored from disk as planted ({good} known-good, "
                    f"{len(want_keys) - good} known-bad)", wrong[:4])
            tdir, project = Path(arm["transcripts"]), Path(arm["project"])
            branch_bad = []
            for key, ev in arm["evals"].items():
                t = Path(ev["outcome"]) / "transcript" / f"{ev['session']}.jsonl"
                start = metrics.prompt_line(t, ev["prompt"]) if t.is_file() else None
                first = _first_prompt(t) if t.is_file() else ""
                if ev["variant"] == "resume":  # the branch transcript begins with the history it was forked from
                    ok = ev["forked_from"] == arm["session"] and start and first != ev["prompt"]
                else:
                    opening = FRESH_OPENING.format(path=(arm["final_handoff"] or {}).get("state_file", TASK_FILE)
                                                   if name == "handoff" else TASK_FILE)
                    ok = ev["forked_from"] is None and ev["prompt"].startswith(opening) and first == ev["prompt"]
                if not ok or ev["session"] in arm["sessions"]:
                    branch_bad.append(key)
            leaked = [k for sid in arm["sessions"] for k, t in tasks.items()
                      if metrics.prompt_line(run.transcript(arm, sid), t.prompt) is not None]
            s.check(not branch_bad and not leaked
                    and sorted(p.stem for p in tdir.glob("*.jsonl")) == sorted(arm["sessions"])
                    and manifest(project) == manifest(Path(arm["snap"]) / "pre"),
                    f"{tag} {name}: resume branches fork session {str(arm['session'])[:8]}, fresh branches start new "
                    "sessions; branch transcripts are filed away, the main line never sees a task, the project is "
                    "back at its pre-evaluation snapshot", f"branches {branch_bad}, tasks on the main line {leaked}")
            h = e["hooks"]
            if name == "system":
                s.check(h["exists"] and h["snapshots"] >= mm["compaction_count"] >= 1
                        and h["restored"] == mm["compaction_count"] and h["summaries"] == mm["compaction_count"]
                        and h["hook_errors"] == 0 and mm["hook_notes_seen"] >= 1
                        and (fake.admitted_reads[name] >= 1 or label != "q"),
                        f"{tag} system: the installed hooks saved {h['snapshots']} snapshot(s), restored "
                        f"{h['restored']}, filed {h['summaries']} summary(ies), admitted {fake.admitted_reads[name]} "
                        f"large read(s) by first page, logged {h['hook_errors']} error(s)", h)
                if "mechanics" in e:
                    s.check(e["mechanics"]["all_passed"] and e["mechanics"]["evidence_of_quality"] is False,
                            f"{tag} system: mechanics verdict passes on the simulated compaction and is marked as not "
                            "evidence of quality", e["mechanics"]["checks"])
                branch = [v["branch_metrics"]["retrieval"]["search"] for v in e["evaluation"].values()]
                s.check(all(n == 1 for n in branch), f"{tag} system: retrieval calls counted per branch ({branch})")
            else:
                s.check(not h["exists"] and not fake.hook_runs.get((name, "PreCompact")),
                        f"{tag} {name}: no hook ran and no context-system runtime directory exists")
        self.continue_checks(s, tag, run, faults)
        for line in driver.format_report(out)[:2]:
            s.info(line)
        for name, e in out["arms"].items():
            mm = e["metrics"]
            scores = {v: {c: f"{x['passed']}/{x['passed'] + x['failed']}" for c, x in sorted(cats.items())}
                      for v, cats in e["scores"].items()}
            s.info(f"{name}: turns {e['scripted_turns']}, sessions {mm['sessions']}, compactions "
                   f"{mm['compaction_count']}, handoffs {len(e['handoffs'])}, requests {mm['api_calls']}, "
                   f"rereads {mm['rereads']}")
            for variant, cats in scores.items():
                s.info(f"   {variant}: " + ", ".join(f"{c} {v}" for c, v in cats.items()))

    def continue_checks(self, s: Section, tag: str, run: driver.Run, faults: dict[tuple[str, str, str], str]) -> None:
        for (name, kind, ident), fault in faults.items():
            arm = run.s["arms"][name]
            steps = [x for x in arm["steps"] if x["id"] == ident]
            trail = [f"{x['kind']}:{x['status']}" for x in steps]
            if fault == "timeout":
                ok = f"{kind}:timeout" in trail and "timeout_resume:ok" in trail
                what = "a step timeout is followed by 'continue' in the same session"
            elif fault == "limit_undelivered":
                ok = trail[:2] == [f"{kind}:limit", f"{kind}:ok"]
                what = "a prompt that never reached the session is sent again after --continue"
            elif kind == "eval":
                ev = arm["evals"][ident]
                ok = ev["attempt"] == 2 and (Path(arm["eval"]) / ident / "aborted-1" / f"{steps[0]['session']}.jsonl").is_file() \
                    and steps[0]["session"] != ev["session"]
                what = "an interrupted branch is set aside (aborted-1) and run again from the snapshot"
            else:
                ok = trail[:2] == [f"{kind}:limit", "limit_resume:ok"] and steps[1]["session"] == steps[0]["session"]
                what = "a delivered prompt is finished with a resume of the same session after --continue"
            s.check(ok, f"{tag} {name} {kind} {ident}: {what}", trail)
        if "handoff" in run.s["arms"]:
            arm = run.s["arms"]["handoff"]
            hs = arm["handoffs"]
            fh = arm["final_handoff"] or {}
            s.check(len(hs) >= 1 and all(h["state_file_written"] and h["state_file"] == TASK_FILE for h in hs)
                    and len(arm["sessions"]) == len(hs) + 1 and fh.get("state_file_written")
                    and (Path(arm["snap"]) / "handoff" / TASK_FILE).is_file(),
                    f"{tag} handoff: {len(hs)} handoff(s) written to {TASK_FILE}, each followed by a fresh session "
                    f"({len(arm['sessions'])} sessions); a final handoff feeds the fresh-session branches",
                    f"handoffs {hs}, final {fh}, sessions {len(arm['sessions'])}")

    def process_runner(self, s: Section) -> None:
        """The live step runner (claude_cli.run_claude) with the Python interpreter standing in for claude.exe."""
        work = self.tmp / "x"
        work.mkdir(exist_ok=True)
        echo = ("import json,sys;p=sys.stdin.buffer.read().decode('utf-8');"
                "print(json.dumps({'type':'system','subtype':'init','session_id':'s'}));"
                "print(json.dumps({'type':'result','subtype':'success','is_error':False,'result':p,'session_id':'s'}))")
        prompt = "any variance over €2,650 – naïve check\nsecond line"
        env, _, _ = claude_cli.child_env()
        res = claude_cli.run_claude([self.python, "-I", "-B", "-X", "utf8", "-c", echo], work, prompt,
                                    work / "echo.jsonl", 60, env)
        s.check(res["status"] == "ok" and (res["result"] or {}).get("result") == prompt,
                "step runner: the prompt reaches the process on stdin as UTF-8 and the stream-json result is read back",
                {k: res[k] for k in ("status", "exit", "stderr_tail")})
        started = time.time()
        res = claude_cli.run_claude([self.python, "-I", "-B", "-c", "import time;time.sleep(120)"], work, prompt,
                                    work / "sleep.jsonl", 2, env)
        s.check(res["status"] == "timeout" and res["timed_out"] and time.time() - started < 60,
                f"step runner: a step over its time limit is stopped and classed as a timeout "
                f"({time.time() - started:.0f} s)", {k: res[k] for k in ("status", "exit")})
        limit = ("import json;print(json.dumps({'type':'result','subtype':'error','is_error':True,"
                 "'result':'Claude usage limit reached. Your limit will reset at 3pm.'}));raise SystemExit(1)")
        res = claude_cli.run_claude([self.python, "-I", "-B", "-c", limit], work, prompt, work / "limit.jsonl", 60, env)
        s.check(res["status"] == "limit", "step runner: a usage-limit reply with a non-zero exit is classed as a limit",
                {k: res[k] for k in ("status", "exit")})
        s.note("the wording of a real usage-limit stop in print mode is not known offline; any reply that is not a "
               "clean result halts the run with its state saved, whatever it is called")

    def simulated(self, s: Section) -> None:
        self.process_runner(s)
        s.info("offline simulation: transcripts, replies and file changes are fabricated by harness/simulate.py")
        self.simulate(s, "q", {("system", "turn", "A3"): "limit", ("native", "turn", "B2"): "limit_undelivered",
                               ("handoff", "turn", "A5"): "timeout", ("handoff", "handoff", "h1"): "limit",
                               ("system", "eval", "fresh-E4"): "timeout", ("reference", "eval", "resume-E1"): "limit"})
        self.simulate(s, "m", {("system", "turn", "A2"): "limit"})

    # --- (e) ------------------------------------------------------------------------------------
    def scoring(self, s: Section) -> None:
        seen: set[str] = set()
        for size in ("fit", "full"):
            scn = Scenario(self.args.seed, size)
            exp, base = scn.expected(), scoring.synthetic_base(scn)
            for task in scn.eval_tasks():
                cats = {c for c, _ in task.checks}
                seen |= cats
                for good in (True, False):
                    syn = scoring.synthetic(scn, task.id, good, base)
                    out = scoring.Outcome.memory(syn["base"], syn["changes"], syn["final_text"], syn["report"])
                    results = scoring.score_task(scn, task, out, exp)
                    got = {r["check"]: r["pass"] for r in results}
                    wrong = [f"{c}: got {got.get(c)}, expected {w} ({next(r['detail'] for r in results if r['check'] == c)})"
                             for c, w in syn["expect"].items() if got.get(c) is not w]
                    if good:
                        s.check(not wrong and all(r["pass"] is True for r in results),
                                f"{size} {task.id} known-good output: {len(results)}/{len(results)} checks pass "
                                f"({', '.join(sorted(cats))})", wrong[:3])
                    else:
                        lost = {r["category"] for r in results if r["pass"] is False}
                        s.check(not wrong and lost == cats,
                                f"{size} {task.id} known-bad output: fails {sum(1 for r in results if r['pass'] is False)}"
                                f"/{len(results)} checks and loses every category it covers", wrong[:3] or sorted(cats - lost))
            # one defect at a time: only the matching check may fail
            v = scn.v
            for task_id, check, old, new in (
                    ("E2", "eur_header", "| EUR |", "| EUR k |"),
                    ("E2", "credit_value", f"{exp['E2']['credit']:,}", "to be confirmed"),
                    ("E2", "signoff_name", v["finance_contact"], "someone"),
                    ("E3", "queue_id", v["queue"], "the usual queue"),
                    ("E3", "spec_section", "Section 7.3", "A section")):
                syn = scoring.synthetic(scn, task_id, True, base)
                changes = {k: (t.replace(old, new) if isinstance(t, str) else t) for k, t in syn["changes"].items()}
                out = scoring.Outcome.memory(syn["base"], changes, syn["final_text"].replace(old, new), syn["report"])
                task = next(t for t in scn.eval_tasks() if t.id == task_id)
                failed = sorted(r["check"] for r in scoring.score_task(scn, task, out, exp) if r["pass"] is not True)
                s.check(failed == [check], f"{size} {task_id} with one planted defect: only {check} fails", failed)
        s.check(seen == ALL_CATEGORIES, f"all {len(ALL_CATEGORIES)} scoring categories are covered by a task",
                sorted(ALL_CATEGORIES ^ seen))
        scn = Scenario(self.args.seed, "fit")
        base = scoring.synthetic_base(scn)
        idle = [r for t in scn.eval_tasks()
                for r in scoring.score_task(scn, t, scoring.Outcome.memory({**base, **t.setup_files}, {}))]
        counts = {k: sum(1 for r in idle if r["pass"] is k) for k in (True, False, None)}
        s.note(f"a branch that does nothing scores {counts[True]} pass, {counts[False]} fail, {counts[None]} "
               "unscorable: the 'left alone' checks pass trivially, so read them together with the task's other checks")

    # --- (f) ------------------------------------------------------------------------------------
    def real_transcripts(self, s: Section) -> None:
        given = [Path(p) for p in self.args.real_transcript]
        folder = self.real_home / "projects" / core.project_slug(REPO)
        paths = given or [folder / f"{sid}.jsonl" for sid in KNOWN_TRANSCRIPTS]
        dest = self.tmp / "x"
        dest.mkdir(exist_ok=True)
        measured = 0
        for src in paths:
            if not src.is_file():
                s.note(f"skipped, not found: {src}")
                continue
            copy = dest / src.name
            shutil.copy2(src, copy)
            m = metrics.transcript_metrics(copy)
            measured += 1
            diffs = metrics.cross_check(m)
            sid = src.stem[:8]
            s.check(not diffs, f"{sid}: harness metrics agree with ctx.py measure on a temporary copy "
                               f"({copy.stat().st_size // 1024} KB)", "; ".join(diffs))
            want = KNOWN_TRANSCRIPTS.get(src.stem)
            peak, comp = m["context"]["peak"], len(m["compactions"])
            if want:
                s.check((peak, comp) == want, f"{sid}: peak context {peak:,} tokens, {comp} compaction(s) "
                                              f"(expected {want[0]:,} and {want[1]})")
            else:
                s.info(f"{sid}: peak context {peak:,} tokens, {comp} compaction(s)")
            ev = m["evidence"]
            s.info(f"{sid}: {m['api_calls']} requests, {m['user_prompts']} typed prompts, tokens {m['tokens']}, "
                   f"rereads {m['rereads']}, repeated work "
                   f"{ {k: v for k, v in m['repeated_work'].items() if k != 'most_repeated'} }, "
                   f"retrieval {m['retrieval']}, span {m['wall_s']} s")
            s.info(f"{sid}: profile evidence in the transcript: models {ev['models']}, effort {ev['effort']}, "
                   f"ultra_effort_enter {ev['attachments'].get('ultra_effort_enter', 0)}, permission modes "
                   f"{ev['permission_modes']}, versions {list(ev['versions'])[:3]}")
        if not measured:
            s.note("no real transcript was available; nothing was measured in this section")

    # --- (g) ------------------------------------------------------------------------------------
    def commands(self, s: Section) -> None:
        claude = self.claude
        s.info(f"claude: {claude['path']} (version {claude.get('version')}, {claude['how']})")
        if self.auth is not None:
            s.note(f"login reported by `auth status`: {'yes' if self.auth.get('loggedIn') else 'NO'}"
                   + ("" if self.auth.get("loggedIn") else " - a live run stops at this check until you run "
                      "`claude auth login` yourself"))
        if self.auth is not None:
            missing = claude_cli.missing_flags(claude["path"])
            if missing is None:
                s.note("`claude --help` could not be read; the options below were not checked against it")
            else:
                s.check(not missing, f"`claude --help` (version {claude.get('version')}) lists every option the "
                                     f"driver uses ({', '.join(claude_cli.USED_FLAGS)})", missing)
        if claude.get("version") != driver.VERIFIED_CLI:
            s.note(f"the system's compaction threshold and hook timing were checked on Claude Code "
                   f"{driver.VERIFIED_CLI}; this is {claude.get('version')}. Pass --claude <path> to choose another "
                   "installed version")
        # A live start without login must stop before anything is created. --yes is never passed here.
        live_root = self.tmp / "x" / "live"
        real_auth = claude_cli.auth_status
        claude_cli.auth_status = lambda path, env=None: {"loggedIn": False, "authMethod": None}
        try:
            code, text = _quiet(driver.main, ["--profile", "mechanics", "--root", str(live_root), "--run", "t"])
        finally:
            claude_cli.auth_status = real_auth
        s.check(code == 2 and "not logged in" in text and not live_root.exists(),
                "a start that finds `auth status` loggedIn=false aborts with exit 2 before creating anything",
                f"exit {code}: {text[-300:]}")
        _, removed, remaining = claude_cli.child_env()
        s.info(f"environment variables a live run removes before starting Claude Code: {removed or 'none set'}")
        s.info(f"CLAUDE*/ANTHROPIC*/DISABLE_* variables it passes through (names only): {remaining or 'none'}")
        if "CLAUDECODE" in removed:
            s.note("this shell was started by Claude Code; start live runs from a plain terminal so the sessions "
                   "under test do not inherit that session's variables")
        s.info("session ids below are examples; the driver generates a new one per session and per branch")
        for profile in ("quality", "mechanics"):
            state = driver.make_state(profile, None, None, claude=claude, python=self.python, home=self.real_home,
                                      seed=self.args.seed, simulated=True)
            p = state["profile_def"]
            run_dir = sandbox.default_root() / f"{profile[0]}YYMMDD-HHMM"
            paths = sandbox.arm_paths(run_dir, "system")
            task = state["tasks"][-1]
            s.info("")
            s.info(f"profile {profile}: model {p['model']}, effort {p['effort']}, --settings "
                   f"{json.dumps(p['settings']) if p['settings'] else 'none'}, window {state['window']} "
                   f"(written as autoCompactWindow to <arm>\\p\\.claude\\settings.json in the system and native arms)")
            rows = [("first scripted turn, new session", "new", "main", None, "001-turn-A1.txt"),
                    ("later turn, or resume after a usage limit, same session", "resume", "main", None, "002-turn-A2.txt"),
                    (f"continuation task {task} on a fork of the session", "fork", "fork", "main",
                     f"NNN-eval-resume-{task}.txt"),
                    (f"continuation task {task} in a fresh session", "new", "fresh", None, f"NNN-eval-fresh-{task}.txt")]
            argvs = []
            for what, mode, sid, parent, prompt_file in rows:
                argv = claude_cli.build_argv(claude["path"], p, mode, EXAMPLE_IDS[sid],
                                             EXAMPLE_IDS[parent] if parent else None, state["permission_mode"])
                argvs.append(argv)
                s.info(f"{what}:")
                s.info("  " + claude_cli.ps_line(argv, cwd=paths["project"], stdin=paths["prompts"] / prompt_file))

            def has(argv: list[str], flag: str, value: str) -> bool:
                return flag in argv and argv[argv.index(flag) + 1] == value
            common = all(has(a, "--setting-sources", "user,project,local") and "--bare" not in a and "-p" in a
                         and has(a, "--model", p["model"]) and has(a, "--effort", p["effort"]) for a in argvs)
            shape = (has(argvs[0], "--session-id", EXAMPLE_IDS["main"]) and "--resume" not in argvs[0]
                     and has(argvs[1], "--resume", EXAMPLE_IDS["main"]) and "--session-id" not in argvs[1]
                     and has(argvs[2], "--resume", EXAMPLE_IDS["main"]) and "--fork-session" in argvs[2]
                     and has(argvs[2], "--session-id", EXAMPLE_IDS["fork"])
                     and has(argvs[3], "--session-id", EXAMPLE_IDS["fresh"]) and "--resume" not in argvs[3])
            if profile == "quality":
                s.check(common and p["model"] == "claude-opus-5-5" and p["effort"] == "xhigh"
                        and all(has(a, "--settings", '{"ultracode":true}') for a in argvs),
                        "quality: --model claude-opus-5-5 --effort xhigh --settings {\"ultracode\":true} "
                        "--setting-sources user,project,local, never --bare")
            else:
                s.check(common and "sonnet-5-5" in p["model"] and state["window"] == 150_000
                        and all("--settings" not in a for a in argvs),
                        f"mechanics: --model {p['model']} (Sonnet 5.5), window 150000, "
                        "--setting-sources user,project,local, never --bare")
            s.check(shape, f"{profile}: new session uses --session-id, resume uses --resume, a fork uses --resume "
                           "<session> --fork-session --session-id <new id>")

    # --- (h) ------------------------------------------------------------------------------------
    def forecast(self, s: Section) -> None:
        for profile, size in (("quality", "full"), ("quality", "fit"), ("mechanics", None)):
            state = driver.make_state(profile, size, None, claude=self.claude, python=self.python,
                                      home=self.real_home, seed=self.args.seed, simulated=True)
            scn = Scenario(state["seed"], state["size"])
            est = estimate(scn, state)
            key = f"{profile}/{state['size']}"
            self.estimates[key] = est
            s.info(f"{key}: arms {', '.join(state['arms_order'])}; window {state['window']}, at least "
                   f"{state['min_compactions']} compaction(s); tasks {state['tasks']} x {state['variants']}")
            for line in format_estimate(est):
                s.info("  " + line)
            arms = est["arms"]
            short = [n for n, a in arms.items() if ARMS[n]["compacts"]
                     and a["predicted_compactions"] < state["min_compactions"]]
            s.check(not est["script_shortfall"] and not short,
                    f"{key}: the script is long enough for the required compactions in the forecast", short)
            if "handoff" in arms:
                s.check(arms["handoff"]["predicted_handoffs"] >= 1 and arms["handoff"]["predicted_compactions"] == 0,
                        f"{key}: the handoff arm is forecast to hand off {arms['handoff']['predicted_handoffs']} "
                        "time(s) and never compact")
            if "reference" in arms:
                s.check(arms["reference"]["fits_reference_limit"],
                        f"{key}: the reference arm is forecast to stay under {state['ref_limit']} tokens "
                        f"(peak {arms['reference']['predicted_peak_context']})")
        _, text = _quiet(driver.print_plan, driver.make_state("quality", None, None, claude=self.claude,
                                                               python=self.python, home=self.real_home,
                                                               seed=self.args.seed, simulated=True),
                         Scenario(self.args.seed, "full"), sandbox.default_root() / "qYYMMDD-HHMM",
                         self.estimates["quality/full"])
        s.check("Token forecast per arm" in text and "never --bare" in text,
                f"the plan a live run prints before starting renders ({len(text.splitlines())} lines)")
        sim = self.results.get("q", {}).get("arms") or {}
        est = self.estimates["quality/fit"]["arms"]
        for name, e in sim.items():
            s.info(f"quality/fit {name}: forecast {est[name]['scripted_turns']} turns, "
                   f"{est[name]['predicted_compactions']} compaction(s), {est[name]['predicted_handoffs']} handoff(s); "
                   f"simulated {e['scripted_turns']}, {e['metrics']['compaction_count']}, {len(e['handoffs'])} "
                   "(same growth assumptions; the simulation also applies the system's read admission)")

    # --- driver -----------------------------------------------------------------------------------
    def run(self) -> int:
        log("DRY RUN: offline validation of the evaluation harness. No model is called. claude.exe is started "
            "only for --version, --help and auth status.")
        try:
            found = claude_cli.discover_claude(self.args.claude)
            found["version"] = claude_cli.claude_version(found["path"])
            self.claude = found
            self.auth = claude_cli.auth_status(found["path"], claude_cli.child_env()[0])
        except RuntimeError as exc:
            log(f"  note  {exc}; command lines below use the placeholder 'claude.exe'")
        before = self.outside_state()
        sections: list[tuple[str, str, Callable[[Section], None]]] = [
            ("a", "scenario generation and audit", self.scenario),
            ("b", "sandboxes for every arm, and isolation", lambda s: self.sandboxes(s, before)),
            ("c", "arm configuration: system installed by its own ctx.py and doctor OK; native has window settings only",
             self.arm_config),
            ("d", "simulated runs through the driver (advance, handoff, fork and fresh branches, --continue)",
             self.simulated),
            ("e", "scoring on known-good and known-bad outputs, every category", self.scoring),
            ("f", "metrics on temporary copies of real transcripts", self.real_transcripts),
            ("g", "command lines a live run would execute (printed, not run)", self.commands),
            ("h", "token forecast per arm", self.forecast),
        ]
        verdicts: list[tuple[str, str, str]] = []
        stopped = False
        for key, title, fn in sections:
            if stopped:
                verdicts.append((key, title, "NOT RUN"))
                continue
            s = Section(key, title)
            try:
                fn(s)
            except Exception:  # a crash in a section is a failed section, with the place it happened
                s.check(False, "section raised an exception", traceback.format_exc()[-1800:])
            verdict = "PASS" if not s.failed else "FAIL"
            log(f"({key}) {verdict}" + (f" ({s.failed} failed check(s))" if s.failed else ""))
            verdicts.append((key, title, verdict))
            if s.failed and not self.args.keep_going:
                stopped = True
        s = Section("end", "isolation re-checked after every section")
        try:
            self.isolation(s, before, "at the end")
        except Exception:
            s.check(False, "isolation check raised an exception", traceback.format_exc()[-1200:])
        verdicts.append(("end", "isolation after every section", "PASS" if not s.failed else "FAIL"))
        log("\nSummary")
        for key, title, verdict in verdicts:
            log(f"  ({key}) {verdict:<8} {title}")
        passed = all(v == "PASS" for _, _, v in verdicts)
        if passed and not getattr(self.args, "keep_temp", False):
            shutil.rmtree(self.tmp, ignore_errors=True)
            log(f"Temporary files removed ({self.tmp}).")
        else:
            log(f"Temporary files kept for inspection: {self.tmp}")
        if stopped:
            log("Stopped at the first failed section; --keep-going runs the rest.")
        log("DRY RUN: " + ("PASS. Nothing was sent to a model; a simulated run is not a result."
                           if passed else "FAIL."))
        return 0 if passed else 1


def _first_prompt(transcript: Path) -> str:
    for _, _, rec in core.iter_lines(transcript, needles=['"user"']):
        text = metrics._user_text(rec)
        if text is not None:
            return text
    return ""


def manifest_of(scn: Scenario) -> dict[str, list]:
    """The manifest a freshly written scenario project must have (sizes and hashes of its UTF-8 text)."""
    from .common import sha1_bytes
    out = {}
    for rel, text in scn.files().items():
        data = text.encode("utf-8")
        out[rel] = [len(data), sha1_bytes(data)]
    return out


def dry_run(args) -> int:
    return DryRun(args).run()
