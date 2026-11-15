"""Offline stand-in for claude.exe at the driver's executor seam. Used only by --dry-run.

It never starts Claude Code and never calls a model. For each step the driver would run, it fabricates
what Claude Code would leave behind: a stream-json log, transcript records with assistant usage and
compact_boundary records, and file changes in the sandbox project. Where an arm has hooks in its
settings it runs those hook commands (the sandbox's own copy of ctx.py) with payloads shaped like
Claude Code's, so snapshot, restore, summary filing and read admission run against the fabricated
transcript.

Context growth follows the assumptions in estimate.py. Continuation "answers" are the known-good and
known-bad outputs from scoring.synthetic, chosen by task and restart variant and identical in every
arm, so the simulated scores cannot favour an arm. Nothing produced here is a result.
"""
from __future__ import annotations

import json
import re
import shutil
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from . import claude_cli, scoring
from .common import CHARS_PER_TOKEN, read_json, run_retry, write_text
from .estimate import BASE_TOKENS, OUTPUT_PER_CALL, POST_COMPACT, RESERVE, TURN_OVERHEAD
from .sandbox import ARMS, core
from .scenario import TASK_FILE, Scenario

SIM_VERSION = "0.0.0-simulated"
LIMIT_TEXT = "Claude usage limit reached. Your limit will reset at 3pm. (simulated by the dry run)"
READ_BATCH = 4
EVAL_OVERHEAD = 20_000
HANDOFF_TEXT = """# Handoff (simulated by the dry run; no model wrote this)

## 1. Goal
Finish the April reconciliation.

## 2. Corrections and settled decisions
- Simulated entry.

## 3. Constraints and out-of-scope
- data/raw is read-only.

## 4. Where work actually stopped
- Simulated handoff number {n}.

## 5. Next action
Wait for ops to confirm the cutover dates.

## 6. Authoritative files and conclusions already established
- docs/findings.md
"""


class SimError(RuntimeError):
    """The driver asked for something Claude Code could not do (for example resuming a session that has no
    transcript), or built a command line that does not match the step."""


def good_output(variant: str, task_id: str) -> bool:
    """Which simulated continuation answers are the known-good ones: the same pattern in every arm."""
    return (variant == "resume") == (task_id in ("E1", "E3"))


class _Session:
    """One fabricated `claude -p` process: appends records to the session transcript."""

    def __init__(self, sim: "FakeClaude", run, arm: dict[str, Any], rec: dict[str, Any]):
        self.sim, self.run, self.arm, self.rec = sim, run, arm, rec
        self.id = rec["session"]
        self.path = run.transcript(arm, self.id)
        self.project = Path(arm["project"])
        self.model, self.effort = run.profile["model"], run.profile["effort"]
        self.windowed = bool(ARMS[arm["name"]]["window"])
        self.threshold = int(run.s["window"]) - RESERVE
        self.ctx = self.pending = self.calls = self.boundaries = 0
        self.parent: str | None = None

    def open(self) -> None:
        mode = self.rec["mode"]
        self.path.parent.mkdir(parents=True, exist_ok=True)
        if mode == "new":
            if self.path.exists():
                raise SimError(f"new session {self.id} already has a transcript")
            self.ctx = BASE_TOKENS
            return
        if mode == "fork":
            source = self.run.transcript(self.arm, self.rec["fork_from"])
            if not source.is_file():
                raise SimError(f"fork of {self.rec['fork_from']}: that session has no transcript")
            if self.path.exists():
                raise SimError(f"fork target {self.id} already has a transcript")
            shutil.copyfile(source, self.path)
        elif not self.path.is_file():
            raise SimError(f"resume of {self.id}: that session has no transcript")
        self.ctx = core.tail_status(self.path)["tokens"] or BASE_TOKENS

    def write(self, rec: dict[str, Any]) -> dict[str, Any]:
        rec = {"parentUuid": self.parent, "isSidechain": False, **rec, "uuid": self.sim.next_id("uuid"),
               "timestamp": self.sim.tick(), "userType": "external", "entrypoint": "sdk-cli",
               "cwd": str(self.project), "sessionId": self.id, "version": SIM_VERSION, "simulated": True}
        self.parent = rec["uuid"]
        with open(self.path, "a", encoding="utf-8", newline="\n") as fh:
            fh.write(json.dumps(rec, ensure_ascii=False) + "\n")
        return rec

    # --- hooks ---------------------------------------------------------------------------------
    def hook(self, event: str, extra: dict[str, Any], match: str | None = None) -> dict[str, Any]:
        """Run the arm's configured hook commands for one event, the way Claude Code would."""
        out: dict[str, Any] = {"context": "", "updated": None, "stdout": ""}
        for group in self.sim.hooks_of(self.arm).get(event) or []:
            matcher = group.get("matcher")
            if matcher and (match is None or not re.fullmatch(matcher, match)):
                continue
            for h in group.get("hooks") or []:
                payload = {"session_id": self.id, "transcript_path": str(self.path), "cwd": str(self.project),
                           "hook_event_name": event, "permission_mode": self.run.s["permission_mode"], **extra}
                argv = [str(h.get("command"))] + [str(a) for a in h.get("args") or []]
                proc = run_retry(argv, input=json.dumps(payload).encode("utf-8"), capture_output=True,
                                 timeout=float(h.get("timeout") or 60), env=self.sim.hook_env(self.arm),
                                 cwd=str(self.project))
                self.sim.hook_runs[(self.arm["name"], event)] += 1
                text = proc.stdout.decode("utf-8", errors="replace").strip()
                if proc.returncode != 0:
                    self.sim.hook_problems.append(f"{self.arm['name']} {event}: exit {proc.returncode}: "
                                                  f"{proc.stderr.decode('utf-8', errors='replace')[-300:]}")
                data = None
                if text.startswith("{"):
                    try:
                        data = json.loads(text)
                    except ValueError:
                        data = None
                if not isinstance(data, dict):
                    out["stdout"] += text
                    continue
                spec = data.get("hookSpecificOutput") or {}
                if isinstance(spec.get("additionalContext"), str):
                    out["context"] += spec["additionalContext"]
                if isinstance(spec.get("updatedInput"), dict):
                    out["updated"] = spec["updatedInput"]
        return out

    def note(self, event: str, text: str) -> None:
        if text:
            self.write({"type": "attachment", "attachment": {"type": "hook_additional_context", "hookName": event,
                                                              "hookEvent": event, "content": [text]}})
            self.pending += int(len(text) / CHARS_PER_TOKEN)

    # --- model requests ----------------------------------------------------------------------
    def compact(self) -> None:
        pre = self.ctx + self.pending
        instructions = self.hook("PreCompact", {"trigger": "auto", "custom_instructions": None})
        restored = self.hook("SessionStart", {"source": "compact", "model": self.model})
        self.sim.tick(40)  # the summary request
        self.write({"type": "system", "subtype": "compact_boundary", "content": "Conversation compacted",
                    "level": "info", "compactMetadata": {"trigger": "auto", "preTokens": int(pre)}})
        summary = ("This session is being continued from a previous conversation that ran out of context. "
                   f"(Simulated summary; no model wrote this. PreCompact instructions: "
                   f"{len(instructions['stdout'])} characters.)")
        self.write({"type": "user", "isCompactSummary": True, "isVisibleInTranscriptOnly": True,
                    "message": {"role": "user", "content": summary}})
        self.ctx, self.pending = POST_COMPACT, 0
        self.note("SessionStart", restored["context"])
        self.hook("PostCompact", {"trigger": "auto", "compact_summary": summary})
        self.boundaries += 1
        self.sim.compactions[self.arm["name"]] += 1
        self.sim.tick(5)

    def call(self, blocks: list[dict[str, Any]], out: int = OUTPUT_PER_CALL) -> None:
        if self.windowed and self.ctx + self.pending >= self.threshold:
            self.compact()
        self.calls += 1
        usage = {"input_tokens": 3, "cache_creation_input_tokens": int(self.pending),
                 "cache_read_input_tokens": int(self.ctx), "output_tokens": int(out)}
        stop = "tool_use" if any(b.get("type") == "tool_use" for b in blocks) else "end_turn"
        self.write({"type": "assistant", "requestId": self.sim.next_id("req"), "effort": self.effort,
                    "message": {"model": self.model, "id": self.sim.next_id("msg"), "type": "message",
                                "role": "assistant", "content": blocks, "stop_reason": stop, "usage": usage}})
        self.ctx += self.pending + 3 + int(out)
        self.pending = 0

    def result(self, tool_id: str, text: str, tokens: float, error: bool = False) -> None:
        self.write({"type": "user", "toolUseResult": {"simulated": True},
                    "message": {"role": "user", "content": [{"type": "tool_result", "tool_use_id": tool_id,
                                                             "content": text, "is_error": error}]}})
        self.pending += int(tokens)

    def say(self, text: str, extra_tokens: int = 0) -> None:
        self.pending += int(extra_tokens)
        self.call([{"type": "text", "text": text}])

    # --- tools -------------------------------------------------------------------------------
    def read_files(self, rels: list[str]) -> None:
        for i in range(0, len(rels), READ_BATCH):
            uses = []
            for rel in rels[i:i + READ_BATCH]:
                inp: dict[str, Any] = {"file_path": str(self.project / rel)}
                admitted = self.hook("PreToolUse", {"tool_name": "Read", "tool_input": inp}, match="Read")
                if admitted["updated"]:
                    inp = admitted["updated"]
                    self.sim.admitted_reads[self.arm["name"]] += 1
                uses.append((self.sim.next_id("toolu"), rel, inp, admitted["context"]))
            self.call([{"type": "tool_use", "id": tid, "name": "Read", "input": inp} for tid, _, inp, _ in uses])
            for tid, rel, inp, note in uses:
                try:
                    text = (self.project / rel).read_text(encoding="utf-8")
                except OSError:
                    self.result(tid, f"File does not exist: {rel}", 40, error=True)
                    continue
                if inp.get("limit"):
                    text = "\n".join(text.splitlines()[: int(inp["limit"])])
                self.result(tid, f"[simulated Read: {len(text)} characters of {rel}]", len(text) / CHARS_PER_TOKEN)
                self.note("PreToolUse", note)
            self.note("PostToolBatch", self.hook("PostToolBatch", {})["context"])

    def write_file(self, rel: str, text: str, tool: str = "Write") -> None:
        tid, path = self.sim.next_id("toolu"), self.project / rel
        inp = {"file_path": str(path)}
        inp.update({"content": text[:160]} if tool == "Write" else {"old_string": "", "new_string": text[-160:]})
        self.pending += int(len(text) / CHARS_PER_TOKEN) if tool == "Write" else 60
        self.call([{"type": "tool_use", "id": tid, "name": tool, "input": inp}])
        write_text(path, text)
        self.result(tid, f"[simulated {tool}: {rel}]", 30)

    def delete_file(self, rel: str) -> None:
        tid, path = self.sim.next_id("toolu"), self.project / rel
        self.call([{"type": "tool_use", "id": tid, "name": "PowerShell",
                    "input": {"command": f'Remove-Item -LiteralPath "{path}"'}}])
        path.unlink(missing_ok=True)
        self.result(tid, "", 5)

    def shell(self, command: str, output: str) -> None:
        tid = self.sim.next_id("toolu")
        self.call([{"type": "tool_use", "id": tid, "name": "PowerShell", "input": {"command": command}}])
        self.result(tid, output, len(output) / CHARS_PER_TOKEN)


class FakeClaude:
    """Callable with the signature of driver.live_executor.

    faults: {(arm, step kind, step id): "limit" | "limit_undelivered" | "timeout"}; each fires once.
    """

    def __init__(self, scn: Scenario, home: Path, faults: dict[tuple[str, str, str], str] | None = None):
        self.scn, self.home = scn, Path(home)
        self.faults = dict(faults or {})
        self.turns = {t.id: t for t in scn.script()}
        files = scn.files()
        self.base_files = {k: v for k, v in scoring.synthetic_base(scn, files).items() if files.get(k) != v}
        self._synthetic: dict[tuple[str, bool], dict[str, Any]] = {}
        self._hooks: dict[str, dict[str, list]] = {}
        self._ids: Counter = Counter()
        self.now = datetime(2026, 10, 10, 8, 0, 0, tzinfo=timezone.utc).timestamp()
        self.steps: list[dict[str, Any]] = []
        self.argv_problems: list[str] = []
        self.hook_problems: list[str] = []
        self.hook_runs: Counter = Counter()
        self.compactions: Counter = Counter()
        self.admitted_reads: Counter = Counter()
        self.modes: Counter = Counter()

    # --- small helpers ---------------------------------------------------------------------------
    def tick(self, seconds: float = 2.0) -> str:
        self.now += seconds
        return datetime.fromtimestamp(self.now, timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")

    def next_id(self, kind: str) -> str:
        self._ids[kind] += 1
        n = self._ids[kind]
        return f"00000000-0000-4000-8000-{n:012d}" if kind == "uuid" else f"{kind}_sim{n:08d}"

    def synthetic(self, task_id: str, good: bool) -> dict[str, Any]:
        key = (task_id, good)
        if key not in self._synthetic:
            self._synthetic[key] = scoring.synthetic(self.scn, task_id, good)
        return self._synthetic[key]

    def expectation(self, variant: str, task_id: str) -> dict[str, Any]:
        return self.synthetic(task_id, good_output(variant, task_id))["expect"]

    def hooks_of(self, arm: dict[str, Any]) -> dict[str, list]:
        if arm["name"] not in self._hooks:
            merged: dict[str, list] = {}
            for name in ("settings.json", "settings.local.json"):
                hooks = read_json(Path(arm["project"]) / ".claude" / name).get("hooks")
                for event, groups in (hooks if isinstance(hooks, dict) else {}).items():
                    merged.setdefault(event, []).extend(g for g in groups if isinstance(g, dict))
            self._hooks[arm["name"]] = merged
        return self._hooks[arm["name"]]

    def hook_env(self, arm: dict[str, Any]) -> dict[str, str]:
        env, _, _ = claude_cli.child_env()
        env["CLAUDE_PROJECT_DIR"] = arm["project"]   # Claude Code sets this for its hooks
        env["CLAUDE_CONFIG_DIR"] = str(self.home)    # the dry run's temporary config directory
        return env

    def check_argv(self, run, arm: dict[str, Any], rec: dict[str, Any]) -> None:
        a, p, mode, session = rec["argv"], run.profile, rec["mode"], rec["session"]

        def after(flag: str) -> str | None:
            return a[a.index(flag) + 1] if flag in a and a.index(flag) + 1 < len(a) else None
        bad = []
        if a[0] != run.s["claude"]["path"] or "-p" not in a:
            bad.append("not a print-mode call of the configured claude")
        if after("--model") != p["model"] or after("--effort") != p["effort"]:
            bad.append("model or effort differs from the profile")
        if after("--setting-sources") != claude_cli.SETTING_SOURCES or "--bare" in a or "--no-session-persistence" in a:
            bad.append("setting sources, --bare or --no-session-persistence")
        if after("--permission-mode") != run.s["permission_mode"]:
            bad.append("permission mode")
        if p.get("settings"):
            try:
                same = json.loads(after("--settings") or "") == p["settings"]
            except ValueError:
                same = False
            if not same:
                bad.append("--settings does not carry the profile settings")
        elif "--settings" in a:
            bad.append("--settings present for a profile without settings")
        if mode == "new" and not (after("--session-id") == session and "--resume" not in a):
            bad.append("new session must use --session-id only")
        if mode == "resume" and not (after("--resume") == session and "--session-id" not in a
                                     and "--fork-session" not in a):
            bad.append("resume must use --resume <same session> only")
        if mode == "fork" and not (after("--resume") == rec["fork_from"] and "--fork-session" in a
                                   and after("--session-id") == session and rec["fork_from"] != session):
            bad.append("fork must use --resume <parent> --fork-session --session-id <new>")
        if bad:
            self.argv_problems.append(f"{arm['name']} {rec['label']}: " + "; ".join(bad))
        self.modes[(rec["kind"], mode)] += 1

    # --- one step ----------------------------------------------------------------------------------
    def __call__(self, run, arm: dict[str, Any], rec: dict[str, Any], prompt: str, timeout: float) -> dict[str, Any]:
        self.check_argv(run, arm, rec)
        fault = self.faults.pop((arm["name"], rec["kind"], rec["id"]), None)
        started = self.now
        s = _Session(self, run, arm, rec)
        if fault == "limit_undelivered":  # the limit was already reached: nothing is written to the transcript
            return self._finish(run, arm, rec, s, started, "limit")
        s.open()
        if rec["mode"] == "new" and (run.profile.get("settings") or {}).get("ultracode"):
            s.write({"type": "attachment", "attachment": {"type": "ultra_effort_enter", "reminderType": "full"}})
        s.note("SessionStart", s.hook("SessionStart", {"source": "startup" if rec["mode"] == "new" else "resume",
                                                       "model": s.model})["context"])
        s.write({"type": "user", "message": {"role": "user", "content": prompt}, "origin": {"kind": "human"},
                 "permissionMode": run.s["permission_mode"], "promptSource": "sdk"})
        s.pending += int(len(prompt) / CHARS_PER_TOKEN)
        s.note("UserPromptSubmit", s.hook("UserPromptSubmit", {"prompt": prompt})["context"])
        if fault == "limit":
            s.write({"type": "assistant", "isApiErrorMessage": True,
                     "message": {"model": "<synthetic>", "id": self.next_id("msg"), "type": "message",
                                 "role": "assistant", "content": [{"type": "text", "text": LIMIT_TEXT}],
                                 "usage": {"input_tokens": 0, "output_tokens": 0}}})
            return self._finish(run, arm, rec, s, started, "limit")
        if fault == "timeout":
            s.say("Starting on that. (simulated: this step is cut off by the step timeout)", 200)
            return self._finish(run, arm, rec, s, started, "timeout")
        return self._finish(run, arm, rec, s, started, "ok", self._play(s, run, arm, rec, prompt))

    def _play(self, s: _Session, run, arm: dict[str, Any], rec: dict[str, Any], prompt: str) -> str:
        kind, ident = rec["kind"], rec["id"]
        if kind in ("limit_resume", "timeout_resume"):  # finish whatever was interrupted
            kind = rec.get("effect") or "eval"
        if kind == "turn":
            turn = self.turns[ident]
            s.read_files(list(turn.reads))
            for rel, text in self.base_files.items():  # what the main line leaves behind (scoring.synthetic_base)
                path = s.project / rel
                if rel != TASK_FILE and (not path.is_file() or path.read_text(encoding="utf-8") != text):
                    s.write_file(rel, text)
            task = s.project / TASK_FILE
            if task.is_file():
                old = task.read_text(encoding="utf-8")
                s.write_file(TASK_FILE, old + ("" if "## Log" in old else "\n## Log\n\n")
                             + f"- {turn.id}: done (simulated)\n", "Edit")
            else:
                s.write_file(TASK_FILE, self.base_files[TASK_FILE])
            final = f"Done with {turn.id}. (simulated reply; no model wrote this)"
            s.say(final, TURN_OVERHEAD)
            return final
        if kind in ("handoff", "final_handoff"):
            s.write_file(TASK_FILE, HANDOFF_TEXT.format(n=len(arm["handoffs"]) + 1))
            s.say(TASK_FILE, 1500)
            return TASK_FILE
        if kind == "handoff_resume":
            s.read_files([arm.get("await_handoff_resume") or TASK_FILE])
            final = "I have read the handoff and will wait for your next request. (simulated)"
            s.say(final, 500)
            return final
        variant, task_id = ident.split("-", 1)
        syn = self.synthetic(task_id, good_output(variant, task_id))
        if kind == "eval_report":
            final = json.dumps(syn["report"])
            s.say(final, 300)
            return final
        if kind != "eval":
            raise SimError(f"unknown step kind {rec['kind']!r}")
        notes = re.search(r"are in (\S+?)\.(?:\s|$)", prompt) if variant == "fresh" else None
        if notes:
            s.read_files([notes.group(1)])
        if self.hooks_of(arm):  # an arm with the system installed can search earlier text
            script = Path(arm["ctx"]) / "ctx.py"
            s.shell(f'& "{run.s["python"]}" -I -B "{script}" recall search "support queue" --project "{s.project}"',
                    "[simulated recall output]")
        for rel, text in syn["changes"].items():
            if text is None:
                s.delete_file(rel)
            else:
                s.write_file(rel, text)
        s.say(syn["final_text"] or "(no reply)", EVAL_OVERHEAD)
        return syn["final_text"]

    def _finish(self, run, arm: dict[str, Any], rec: dict[str, Any], s: _Session, started: float, outcome: str,
                final: str = "") -> dict[str, Any]:
        events: list[dict[str, Any]] = [{"type": "system", "subtype": "init", "session_id": rec["session"],
                                         "model": run.profile["model"], "permissionMode": run.s["permission_mode"],
                                         "cwd": arm["project"], "apiKeySource": "none",
                                         "claude_code_version": SIM_VERSION, "output_style": "default"}]
        events += [{"type": "system", "subtype": "compact_boundary"}] * s.boundaries
        common = {"type": "result", "duration_ms": int((self.now - started) * 1000), "num_turns": s.calls,
                  "session_id": rec["session"], "total_cost_usd": 0.0, "usage": {}, "permission_denials": []}
        if outcome == "ok":
            events.append({**common, "subtype": "success", "is_error": False, "result": final})
        elif outcome == "limit":
            events.append({**common, "subtype": "error_during_execution", "is_error": True, "result": LIMIT_TEXT})
        log_path = Path(rec["log"])
        write_text(log_path, "".join(json.dumps(e, ensure_ascii=False) + "\n" for e in events))
        parsed = claude_cli.parse_stream(log_path)
        exit_code = {"ok": 0, "limit": 1, "timeout": None}[outcome]
        status = claude_cli.classify(exit_code, outcome == "timeout", parsed, "")
        self.steps.append({"arm": arm["name"], "label": rec["label"], "kind": rec["kind"], "id": rec["id"],
                           "mode": rec["mode"], "status": status, "boundaries": s.boundaries})
        return {"exit": exit_code, "timed_out": outcome == "timeout", "wall_s": round(self.now - started, 1),
                "status": status, "stderr_tail": "", **parsed}
