"""Offline regression suite for the Claude Code context system (tools/context_system).

Standard library only. Run from the project root:

    python -B -X utf8 -m unittest tests.test_context_system

Isolation: every test has its own temporary CLAUDE_CONFIG_DIR and project directory, with
CLAUDE_PROJECT_DIR pointed at it, the compaction environment variables cleared and the
managed-settings path redirected into the sandbox; the environment is restored afterwards.
Hook entry tests run ctx.py in a subprocess (-I -B) with that environment. Nothing is
installed into this project or written under the real ~/.claude; the realism test only
copies two real transcripts.

Tests marked expectedFailure assert the intended behaviour for a known, reported defect.
They turn into "unexpected success" (a failing run) once the code is fixed: remove the
marker then.

Scope: offline mechanics of the hook code. Not evidence of summary quality, of Claude
Code's runtime behaviour, or of working quality in a 300-400k window.
"""
from __future__ import annotations

import contextlib
import io
import itertools
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
import unittest
from pathlib import Path
from unittest import mock

sys.dont_write_bytecode = True  # never leave __pycache__ beside the code under test

PROJECT_ROOT = Path(__file__).resolve().parents[1]
CODE_DIR = PROJECT_ROOT / "tools" / "context_system"
if str(CODE_DIR) not in sys.path:
    sys.path.insert(0, str(CODE_DIR))

import core  # noqa: E402
import ctx as ctx_cli  # noqa: E402
import hooks  # noqa: E402
import ledger  # noqa: E402
import recall  # noqa: E402

PY = sys.executable
CTX_PY = CODE_DIR / "ctx.py"
CFG = core.load_config()
CAP, SNAP_CAP = int(CFG["restore_total_chars"]), int(CFG["snapshot_chars"])
WHOLE_BUDGET = SNAP_CAP - int(CFG["snapshot_ledger_min_chars"]) - 1200
STATE, STATE_B = "docs/tasks/demo/task.md", "docs/tasks/b/task.md"
SID, SID2 = "aaaaaaaa-1111-4111-8111-111111111111", "bbbbbbbb-2222-4222-8222-222222222222"
STAMP = "20261010T000000Z"
EVENTS = ("SessionStart", "PreCompact", "PostCompact", "UserPromptSubmit", "PostToolBatch", "PreToolUse")
COMPACT_ENV = ("CLAUDE_CODE_AUTO_COMPACT_WINDOW", "CLAUDE_AUTOCOMPACT_PCT_OVERRIDE", "DISABLE_COMPACT",
               "DISABLE_AUTO_COMPACT")
BOUNDARY = {"type": "system", "subtype": "compact_boundary"}
NEXT = "## Next action\n- {}\n"
# A file that starts with FILLER is too large to restore whole, so named sections are selected.
FILLER = "## Background\n" + "background filler line that keeps this file too large to restore whole\n" * 150
REAL_DIR = Path.home() / ".claude" / "projects" / core.project_slug(PROJECT_ROOT)
REAL = [REAL_DIR / f"{name}.jsonl" for name in ("2d443524-e65c-40cb-9f2b-07f620551390",
                                                "6c9a1a7a-9848-4531-b2b8-734b1fa172aa")]


def big_state(*sections):
    return FILLER + "\n" + "\n\n".join(sections) + "\n"


def cands(text, budget=0):
    """Restore candidates; budget 0 forces section selection (the whole file never fits)."""
    return ledger.restore_candidates(text, list(CFG["restore_sections"]), budget)


def bases(blocks):
    return [hooks._base_label(b["label"]) for b in blocks]


def strings_in(obj):
    if isinstance(obj, str):
        yield obj
    elif isinstance(obj, (dict, list)):
        for value in (obj.values() if isinstance(obj, dict) else obj):
            yield from strings_in(value)


class Sandbox(unittest.TestCase):
    """One temporary Claude home + project per test; environment restored on exit."""
    maxDiff = None

    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp(prefix="ctxtest-")).resolve()
        self.addCleanup(shutil.rmtree, self.tmp, ignore_errors=True)
        self.root, self.home = self.tmp / "proj", self.tmp / "claude"
        (self.root / "docs/tasks/demo").mkdir(parents=True)
        env = mock.patch.dict(os.environ, {"CLAUDE_CONFIG_DIR": str(self.home), "CLAUDE_PROJECT_DIR": str(self.root)})
        env.start()
        self.addCleanup(env.stop)
        for key in COMPACT_ENV:
            os.environ.pop(key, None)
        self.patch(core, "MANAGED_SETTINGS", [self.tmp / "managed" / "managed-settings.json"])
        self.tdir = core.transcripts_dir(self.root)
        self.tdir.mkdir(parents=True)
        self._n = 0

    # fixtures
    def patch(self, obj, name, value):
        patcher = mock.patch.object(obj, name, value)
        patcher.start()
        self.addCleanup(patcher.stop)

    def cfg(self, **over):
        self.patch(hooks, "load_config", lambda: dict(core.load_config(), **over))

    def uid(self):
        self._n += 1
        return f"{self._n:08d}-0000-4000-8000-000000000000"

    def rec(self, kind, content, **extra):
        return dict({"type": kind, "message": {"role": kind, "content": content}, "uuid": self.uid(),
                     "timestamp": "2026-10-10T00:00:00Z", "cwd": str(self.root)}, **extra)

    def asst(self, blocks=None, tokens=1000, model="claude-opus-5-5", mid=None):
        record = self.rec("assistant", blocks or [{"type": "text", "text": "ok"}])
        record["message"].update(id=mid or self.uid(), model=model, usage={"input_tokens": tokens, "output_tokens": 10})
        return record

    def prompt(self, text):
        return self.rec("user", text, origin={"kind": "human"})

    def tool(self, name, inp, result="ok", error=False):
        tid = "toolu_" + self.uid()
        res = dict({"type": "tool_result", "tool_use_id": tid, "content": result}, **({"is_error": True} if error else {}))
        return [self.asst([{"type": "tool_use", "id": tid, "name": name, "input": inp}]), self.rec("user", [res])]

    def wrote(self, path, name="Write", error=False, times=1):
        return [r for _ in range(times)
                for r in self.tool(name, {"file_path": str(path), "content": "x"}, "denied" if error else "ok", error)]

    def session(self, sid, records):
        tp = self.tdir / f"{sid}.jsonl"
        tp.write_bytes(b"")
        self.append(tp, records)
        return tp, {"transcript_path": str(tp), "session_id": sid, "trigger": "auto", "cwd": str(self.root)}

    def append(self, tp, records):
        with open(tp, "ab") as fh:
            fh.write("".join(json.dumps(r, ensure_ascii=False) + "\n" for r in records).encode("utf-8"))

    def boundary(self, tp, n=1):
        self.append(tp, [BOUNDARY] * n)

    def state(self, text, relpath=STATE):
        path = self.root / relpath
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(text if isinstance(text, bytes) else text.encode("utf-8"))
        return path

    def stateful(self, text, sid=SID, extra=()):
        """A state file plus a session whose current window wrote it."""
        path = self.state(text)
        tp, pl = self.session(sid, self.wrote(path) + list(extra))
        return path, tp, pl

    def outside_file(self):
        path = self.tmp / "outside" / "task.md"
        path.parent.mkdir(exist_ok=True)
        path.write_text("outside", encoding="utf-8")
        return path

    def settings(self, scope, data):
        path = {"local": self.root / ".claude/settings.local.json", "project": self.root / ".claude/settings.json",
                "user": self.home / "settings.json", "managed": core.MANAGED_SETTINGS[0]}[scope]
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(data), encoding="utf-8")

    # drivers and assertions
    def has(self, text, *parts):
        for part in parts:
            self.assertIn(part, text)

    def lacks(self, text, *parts):
        for part in parts:
            self.assertNotIn(part, text)

    def note(self, event, pl, **extra):
        out = hooks.handle(event, dict(pl, **extra))
        return out and out["hookSpecificOutput"]["additionalContext"]

    def pre(self, pl):
        return hooks.handle("PreCompact", pl)

    def restore(self, pl):
        return self.note("SessionStart", pl, source="compact")

    def archive(self, sid=SID):
        return self.tdir / "context-system" / "archive" / sid

    def meta(self, pl):
        return hooks.Ctx(pl).metas()[-1]

    def snap(self, pl):
        return (self.archive(pl["session_id"]) / f"{self.meta(pl)['tag']}-restore.md").read_text(encoding="utf-8")

    def hook(self, event, payload=None, raw=None):
        """The real entry point: python -I -B ctx.py hook <Event>; always exit 0 with a clean stderr."""
        data = raw if raw is not None else json.dumps(payload).encode("utf-8")
        proc = subprocess.run([PY, "-I", "-B", str(CTX_PY), "hook", event], input=data, capture_output=True,
                              env=dict(os.environ), cwd=str(self.tmp), timeout=60)
        self.assertEqual((proc.returncode, proc.stderr), (0, b""), event)
        return proc.stdout.decode("utf-8")

    def cli(self, *argv):
        buf = io.StringIO()
        with contextlib.redirect_stdout(buf), contextlib.redirect_stderr(io.StringIO()):
            rc = ctx_cli.main([str(a) for a in argv])
        return rc, buf.getvalue()


class RestoreCandidatesTest(Sandbox):
    def test_markers_override_named_sections(self):
        text = ("## Decisions\n- outside\n\n<!-- ctx:restore -->\nKEEP ONE\n<!-- /ctx:restore -->\n\ntext\n"
                "  <!-- ctx:restore -->  \nKEEP TWO\n<!-- /ctx:restore -->\n")
        self.assertEqual([(b["label"], b["text"]) for b in cands(text, 10 ** 6)],
                         [("marked block 1 (L5-L5)", "KEEP ONE"), ("marked block 2 (L10-L10)", "KEEP TWO")])

    def test_unclosed_or_empty_markers_fall_back_and_whole_file_needs_to_fit(self):
        for text in ("<!-- ctx:restore -->\nno close\n## Next action\n- n\n",
                     "<!-- ctx:restore -->\n\n<!-- /ctx:restore -->\n## Next action\n- n\n"):
            self.assertEqual(bases(cands(text, 10 ** 6)), ["whole file"])
            self.assertEqual(bases(cands(text)), ["Next action"])
        text = "\n# T\nbody text\n\n"
        self.assertEqual([b["text"] for b in cands(text, len(text.strip()))], [text.strip("\n")])
        self.assertEqual(cands(text, len(text.strip()) - 1) + cands("  \n\n", 100), [])

    def test_exact_heading_names_only(self):
        text = "\n".join(["## Next action", "- a", "## Next actions taken earlier", "- b", "## 2. Decisions:", "- c",
                          "## OPEN   QUESTIONS", "- d", "## Decision log", "- e", "## B) Ruled out ##", "- f",
                          "    ## Constraints", "- g"])
        blocks = cands(text)
        self.assertEqual(bases(blocks), ["Next action", "2. Decisions:", "B) Ruled out", "OPEN   QUESTIONS"])
        self.assertEqual(blocks[0]["text"], "## Next action\n- a")
        self.assertIn("    ## Constraints", blocks[2]["text"])  # indented four spaces: body text, not a heading

    def test_section_keeps_subsections_and_ends_at_peer_heading(self):
        text = "## Decisions\n- d0\n### D1\n- one\n#### deep\n- two\n## Other\n- x\n### Next action\n- nested\n"
        self.assertEqual([(hooks._base_label(b["label"]), b["text"]) for b in cands(text)],
                         [("Other > Next action", "### Next action\n- nested"),
                          ("Decisions", "## Decisions\n- d0\n### D1\n- one\n#### deep\n- two")])
        nested = cands("## Current state\n- s\n### Next action\n- n\n## Tail\n- t\n")  # not split, not duplicated
        self.assertEqual([b["text"] for b in nested], ["## Current state\n- s\n### Next action\n- n"])

    def test_code_fences_hide_headings(self):
        text = ("## Next action\n1. run\n```powershell\n# not a heading\n## Decisions\n```\n2. after fence\n~~~~\n```\n"
                "## Open questions\n~~~\n# still fenced\n~~~~\n3. end\n## Decisions\n- real\n")
        blocks = cands(text)
        self.assertEqual(bases(blocks), ["Next action", "Decisions"])
        self.assertTrue(blocks[0]["text"].endswith("# still fenced\n~~~~\n3. end"))
        self.assertEqual(blocks[1]["text"], "## Decisions\n- real")

    def test_superseded_and_historical_paths_are_excluded(self):
        text = ("## Superseded plan\n### Next action\n- old\n## Historical\n### Decisions\n- old d\n"
                "# Archived notes\n## Open questions\n- old q\n# Live\n## Next action\n- new\n")
        self.assertEqual([(hooks._base_label(b["label"]), b["text"]) for b in cands(text)],
                         [("Live > Next action", "## Next action\n- new")])

    def test_strict_decoding(self):
        want = ("## Next action\n- café\n", "")
        self.assertEqual(ledger.read_state_text(self.state(b"\xef\xbb\xbf## Next action\r\n- caf\xc3\xa9\r\n")), want)
        self.assertEqual(ledger.read_state_text(self.state(want[0].encode("utf-16"), "u16.md")), want)
        for data, why in ((b"## Next action\n\xff\xfe\xfd bad", "is not valid UTF-8/UTF-16 text"),
                          (b"abc\x00def", "contains NUL characters")):
            self.assertEqual(ledger.read_state_text(self.state(data, "bad.md")), (None, why))
        self.assertEqual(ledger.read_state_text(self.root / "none.md"), (None, "cannot be read (FileNotFoundError)"))


class SnapshotTest(Sandbox):
    """PreCompact: immutable archive, exact restore text, summarizer instructions."""

    def test_archive_files_meta_and_location(self):
        text = NEXT.format("N1 run the replay")
        _, tp, pl = self.stateful(text, extra=[self.prompt("do the thing")])
        listing = lambda: sorted(p.relative_to(self.root).as_posix() for p in self.root.rglob("*"))
        before = listing()
        instr = self.pre(pl)
        meta = self.meta(pl)
        tag = meta["tag"]
        self.assertRegex(tag, r"^s0001-c001-\d{8}T\d{6}Z$")
        self.assertEqual(sorted(p.name for p in self.archive().iterdir()),
                         sorted(f"{tag}-{s}" for s in ("ledger.md", "window.jsonl", "restore.md", "meta.json")))
        self.assertEqual(self.archive().parents[2], tp.parent)  # beside the transcripts
        self.assertEqual(before, listing())  # nothing is written into the project
        self.assertEqual((meta["seq"], meta["cycle"], meta["boundaries"], meta["state_file"], meta["state_sha"]),
                         (1, 1, 0, STATE, ledger.sha(text)))
        self.assertEqual([c["label"] for c in meta["covered"]], ["whole file (L1-L3)"])
        self.assertEqual((self.archive() / f"{tag}-window.jsonl").read_bytes(), tp.read_bytes())
        self.has(instr, f"exactly these parts of {STATE} are restored verbatim from a snapshot saved now: whole file "
                        "(L1-L3). You may reference those parts")
        self.has(self.snap(pl), f"[context-system] Restoration snapshot {tag} for compaction cycle 1",
                 f"## Task state restored verbatim from {STATE}: whole file (L1-L3)\n{text.strip()}",
                 "## Facts from the compacted window", f"{STATE} (Writex1)", "L2: do the thing", "## Exact recall")

    def test_blocks_are_restored_whole_or_not_at_all(self):
        text = big_state("## Current state\nBEGIN-CS\n" + "- progress detail line with its evidence path\n" * 300 + "END-CS",
                         "## Decisions\n- D1 keep port 8471", "## Next action\n- N1 run the replay")
        _, tp, pl = self.stateful(text)
        instr = self.pre(pl)
        snap = self.snap(pl)
        self.assertEqual(bases(self.meta(pl)["covered"]), ["Decisions", "Next action"])
        self.has(snap, "## Decisions\n- D1 keep port 8471\n\n## Next action\n- N1 run the replay")
        self.lacks(snap, "BEGIN-CS", "END-CS", "progress detail")
        self.lacks(instr, "Current state")
        self.assertLessEqual(len(snap), SNAP_CAP)
        self.assertEqual(self.restore(pl), snap)

    def test_covered_blocks_are_exactly_those_verbatim_in_the_output(self):
        def sec(name, key, n):
            return f"## {name}\n" + "".join(f"- {key} item {i}: reason, evidence docs/x.md:{i}\n" for i in range(n)) + f"END-{key}"
        text = big_state(sec("Decisions", "DEC", 190), sec("Next action", "NXT", 25), sec("Open questions", "OPQ", 25),
                         sec("Constraints", "CON", 25), sec("Ruled out", "RUL", 25))
        _, tp, pl = self.stateful(text)
        instr = self.pre(pl)
        out = self.restore(pl)
        by_label = {b["label"]: b for b in cands(text, WHOLE_BUDGET)}
        covered = self.meta(pl)["covered"]
        self.assertEqual(bases(covered), ["Next action", "Open questions", "Constraints", "Ruled out"])
        for item in covered:
            self.has(out, by_label[item["label"]]["text"])
            self.has(instr, item["label"])
            self.assertEqual(by_label[item["label"]]["sha"], item["sha"])
        uncovered = set(by_label) - {c["label"] for c in covered}
        self.assertEqual(bases({"label": u} for u in uncovered), ["Decisions"])
        self.lacks(instr, *uncovered)
        self.lacks(out, "DEC item")
        self.assertLessEqual(len(out), CAP)

    def test_obligations_are_never_truncated_and_optional_lines_drop_last_first(self):
        recs = self.wrote(self.state(NEXT.format("N1")))
        for i in range(14):
            recs += self.wrote(self.root / f"src/module_{i:02d}_with_a_long_descriptive_name.py")
        recs += self.tool("PowerShell", {"command": "pytest -q"}, "E assert 1 == 2", error=True)
        recs += self.tool("Read", {"file_path": str(self.root / "big.md")}, "x" * 7000)
        recs.append(self.rec("user", "<task-notification><task-id>bg1</task-id><output-file>C:/tmp/bg1.txt"
                                     "</output-file></task-notification>"))
        tp, pl = self.session(SID, recs + [self.prompt(f"correction {i}") for i in range(3)])
        full = self.pre(pl).split("\n")
        starts = ["Context-system notes for this summary (cycle 1; ", "- After compaction exactly these parts of",
                  "- Keep every user instruction and correction", "- 1 tool calls failed in this window",
                  "- For each file created or changed", "- Exact earlier text stays searchable",
                  "- These files were read at length", "- Keep these background result paths"]
        self.assertEqual([line[:len(s)] for line, s in zip(full, starts)], starts)
        self.assertEqual(len(full), len(starts))
        self.has(full[1], "must be carried by the summary")
        self.has(full[2], "(3 user messages)")
        for budget in (10, 700, 1100, 1500):
            self.cfg(precompact_instruction_chars=budget)
            got = self.pre(pl).split("\n")
            self.assertEqual(got, full[:len(got)], budget)
            self.assertGreaterEqual(len(got), 4, budget)  # the four obligations survive any budget
            self.assertTrue(len(got) == 4 or len("\n".join(got)) <= budget, budget)

    def test_without_a_state_file_nothing_is_promised(self):
        tp, pl = self.session(SID, self.wrote(self.root / "src/app.py") + [self.prompt("go")])
        self.has(self.pre(pl), "- No task-state text is restored verbatim after compaction; the summary must carry")
        self.assertEqual((self.meta(pl)["state_file"], self.meta(pl)["covered"]), (None, []))
        out = self.restore(pl)
        self.has(out, "src/app.py (Writex1)")
        self.lacks(out, "## Task state")
        self.assertIsNone(hooks.handle("PreCompact", {"session_id": SID2, "cwd": str(self.root)}))  # no transcript
        self.assertFalse(self.archive(SID2).exists())

    def test_undecodable_state_is_reported_and_bom_crlf_state_is_restored_clean(self):
        why = "is not valid UTF-8/UTF-16 text"
        _, tp, pl = self.stateful(b"## Next action\n- N1 \xff\xfe\xfd\n")
        self.has(self.pre(pl), f"No task-state text is restored verbatim after compaction ({STATE} {why});")
        out = self.restore(pl)
        self.has(out, f"## Task state file: {STATE}. No part of it was restored verbatim (the file {why})")
        self.lacks(out, "N1")
        self.assertEqual((self.meta(pl)["covered"], self.meta(pl)["state_sha"]), ([], None))
        _, tp, pl = self.stateful(b"\xef\xbb\xbf## Next action\r\n- N2 caf\xc3\xa9 step\r\n", sid=SID2)
        self.pre(pl)
        out = self.restore(pl)
        self.has(out, "## Next action\n- N2 café step")
        self.lacks(out, "\ufeff", "\r")

    def test_only_the_newest_snapshot_is_restored(self):
        path, tp, pl = self.stateful(NEXT.format("VERSION-ONE"))
        self.pre(pl)
        first = self.meta(pl)["tag"]
        path.write_bytes(NEXT.format("VERSION-TWO").encode())
        self.pre(pl)
        second = self.meta(pl)["tag"]
        out = self.restore(pl)
        self.has(out, "VERSION-TWO")
        self.lacks(out, "VERSION-ONE")
        names = {p.name for p in self.archive().iterdir()}
        self.assertTrue({f"{first}-superseded", f"{second}-consumed"} <= names)
        self.assertFalse({f"{first}-consumed", f"{second}-superseded"} & names)
        self.has((self.archive() / f"{first}-restore.md").read_text(encoding="utf-8"), "VERSION-ONE")

    def test_snapshot_is_consumed_once(self):
        _, tp, pl = self.stateful(NEXT.format("ONLY-ONCE"))
        self.pre(pl)
        self.boundary(tp)
        self.has(self.restore(pl), "ONLY-ONCE")
        again = self.restore(pl)
        self.has(again, "No snapshot was saved for this compaction")
        self.lacks(again, "ONLY-ONCE")
        self.assertEqual(len(list(self.archive().glob("*-consumed"))), 1)

    def test_snapshot_is_restored_again_until_the_main_boundary_exists(self):
        # Claude Code 2.1.293 runs SessionStart(compact) before it writes the boundary, and fires the
        # same hook for subagent compactions. If a subagent took the first restore, the main thread
        # must still get the snapshot; once the main boundary exists it is never restored again.
        _, tp, pl = self.stateful(NEXT.format("STILL-MINE"))
        self.pre(pl)
        self.has(self.restore(pl), "STILL-MINE")
        self.has(self.restore(pl), "STILL-MINE")
        self.boundary(tp)
        self.append(tp, [self.asst([{"type": "text", "text": "next window"}])])
        self.boundary(tp)
        self.lacks(self.restore(pl), "STILL-MINE")
        self.assertEqual(len(list(self.archive().glob("*-consumed"))), 1)

    def test_subagent_compaction_is_not_treated_as_the_main_one(self):
        # Main context far below its threshold while an active subagent is near its own: the
        # compaction belongs to the subagent. No snapshot, no instructions, nothing injected.
        tp, pl = self.busy(SID, 120000, age=100, sub_tokens=350000)
        self.assertIsNone(self.pre(pl))
        self.assertFalse(self.archive().is_dir() and any(self.archive().glob("*-restore.md")))
        self.assertIsNone(hooks.handle("SessionStart", dict(pl, source="compact")))
        hooks.handle("PostCompact", dict(pl, compact_summary="SUBAGENT SUMMARY"))
        self.assertTrue(list(self.archive().glob("subagent-*-summary.md")))
        # the main thread's own (manual) compaction afterwards works normally
        self.has(hooks.handle("PreCompact", dict(pl, trigger="manual")), "restored verbatim")
        self.has(self.restore(pl), "MAIN-STATE")

    def test_boundary_binding_accepts_same_or_next_count_only(self):
        for sid, added, restored in (("s-same", 0, True), ("s-next", 1, True), ("s-late", 2, False)):
            _, tp, pl = self.stateful(NEXT.format("BOUND-TEXT"), sid=sid)
            self.pre(pl)
            self.boundary(tp, added)
            self.assertEqual("BOUND-TEXT" in self.restore(pl), restored, sid)
            self.assertEqual(any(self.archive(sid).glob("*-consumed")), restored, sid)

    def test_unrestored_and_missing_snapshots_get_truthful_notes(self):
        _, tp, pl = self.stateful(NEXT.format("STALE-TEXT"))
        self.pre(pl)
        tag = self.meta(pl)["tag"]
        self.boundary(tp, 2)
        note = self.restore(pl)
        self.has(note, f"Snapshot {tag} was saved for an earlier compaction (boundary count 0, now 2) and was NOT restored",
                 f"these parts of {STATE} would be restored: whole file (L1-L3)",
                 str(self.archive() / f"{tag}-restore.md"), "recall search")
        self.lacks(note, "STALE-TEXT")
        tp2, pl2 = self.session(SID2, [self.prompt("hi")])
        self.has(self.restore(pl2), "No restoration snapshot exists for this session, so the summary was not told to "
                                    "rely on restored text.")
        self.assertFalse(self.archive(SID2).exists())

    def test_same_second_snapshots_are_ordered_by_sequence_and_numbers_are_not_reused(self):
        self.patch(hooks, "utc_stamp", lambda: STAMP)
        path, tp, pl = self.stateful(NEXT.format("V0"))
        orphan = self.archive() / f"s0002-c001-{STAMP}-restore.md"  # no meta: an incomplete snapshot
        orphan.parent.mkdir(parents=True)
        orphan.write_text("ORPHAN", encoding="utf-8")
        for version in ("V1", "V2", "V3"):
            path.write_bytes(NEXT.format(version).encode())
            self.pre(pl)
        self.assertEqual([m["tag"] for m in hooks.Ctx(pl).metas()], [f"s000{i}-c001-{STAMP}" for i in (1, 3, 4)])
        self.assertEqual(orphan.read_text(encoding="utf-8"), "ORPHAN")
        self.has(self.restore(pl), "- V3")

    def test_archive_is_immutable_under_corrupt_session_state(self):
        path, tp, pl = self.stateful(NEXT.format("FIRST"))
        state_path = self.tdir / "context-system" / "sessions" / f"{SID}.json"
        state_path.parent.mkdir(parents=True)
        state_path.write_bytes(b"\xff\xfe{ not json")
        self.has(self.pre(pl), "Context-system notes")
        frozen = {p.name: p.read_bytes() for p in self.archive().iterdir()}
        self.assertEqual(len(frozen), 4)
        path.write_bytes(NEXT.format("SECOND").encode())
        self.pre(pl)
        self.assertEqual({name: (self.archive() / name).read_bytes() for name in frozen}, frozen)
        self.assertEqual(len(list(self.archive().glob("s0002-*"))), 4)
        self.has(self.restore(pl), "SECOND")
        self.assertEqual(core.read_json(state_path)["pending_summary_tag"], self.meta(pl)["tag"])

    # Wave-1 regression: a failing session-state write must not cost the restoration.
    def test_unwritable_session_state_does_not_lose_the_restoration(self):
        _, tp, pl = self.stateful(NEXT.format("MUST-SURVIVE"))
        (self.tdir / "context-system" / "sessions" / f"{SID}.json").mkdir(parents=True)
        self.pre(pl)
        self.boundary(tp)
        self.has(self.hook("SessionStart", dict(pl, source="compact")), "MUST-SURVIVE")

    # Wave-1 regression: a wrongly typed focus must not disable PreCompact.
    def test_wrong_type_focus_does_not_disable_precompact(self):
        _, tp, pl = self.stateful(NEXT.format("n"))
        hooks.Ctx(pl).save_state({"focus": 123})
        self.has(self.pre(pl), "Context-system notes")

    # --- whose compaction is it: subagent compactions fire the same hooks with the main session id ---
    def busy(self, sid, tokens, model="claude-opus-5-5", age=0, extra=(), sub_tokens=350000):
        """Main session at `tokens` (threshold 367k); its subagent transcript, itself at `sub_tokens`,
        was written `age` seconds ago. By default the subagent is near its own threshold."""
        self.settings("project", {"autoCompactWindow": 400000})
        tp, pl = self.session(sid, self.wrote(self.state(NEXT.format("MAIN-STATE")))
                              + [self.asst(tokens=tokens, model=model)] + list(extra))
        sub = self.tdir / sid / "subagents" / "agent-z9.jsonl"
        sub.parent.mkdir(parents=True)
        self.append(sub, [self.asst(tokens=sub_tokens)])
        os.utime(sub, (time.time() - age,) * 2)
        return tp, pl

    def interleave(self, tokens, trigger):
        """All 20 orders of a main (M) and a subagent (S) Pre/SessionStart/PostCompact; returns the orders
        in which the main SessionStart did not restore the state its summarizer was promised."""
        lost = []
        for n, main_at in enumerate(itertools.combinations(range(6), 3)):
            tp, pl = self.busy(f"mix{n}", tokens)
            step = {"M": 0, "S": 0}
            for pos in range(6):
                who = "M" if pos in main_at else "S"
                event = ("PreCompact", "SessionStart", "PostCompact")[step[who]]
                step[who] += 1
                out = hooks.handle(event, dict(pl, trigger=trigger if who == "M" else "auto", source="compact"))
                if who == "M" and event == "SessionStart" and "MAIN-STATE" not in str(out):
                    lost.append(main_at)
                if who == "M" and event == "PostCompact":
                    self.boundary(tp)  # 2.1.293 writes the boundary after the SessionStart hooks
        return lost

    def test_foreign_rule_edges(self):
        # Treated as the MAIN compaction (the safe default): subagent idle > 120 s; a 200k model near its
        # own threshold; main at >= 80% of the threshold; and a subagent that is active but nowhere near
        # its own threshold (so the hooks' view of the main threshold may simply be wrong).
        for sid, tokens, model, age, sub in (("idle", 120000, "claude-opus-5-5", 130, 350000),
                                             ("m200k", 150000, "claude-sonnet-4-5", 0, 350000),
                                             ("near", 300000, "claude-opus-5-5", 0, 350000),
                                             ("quiet-sub", 120000, "claude-opus-5-5", 0, 40000)):
            tp, pl = self.busy(sid, tokens, model, age, sub_tokens=sub)
            self.assertTrue(self.pre(pl), sid)
            self.has(self.restore(pl), "MAIN-STATE")
        tp, pl = self.busy("flag", 120000)
        self.assertIsNone(self.pre(pl))
        hooks.Ctx(pl).save_state({"foreign_pending": time.time() - hooks.FOREIGN_FLAG_SECONDS - 1})  # the flag expires
        self.has(self.restore(pl), "No restoration snapshot exists")

    def test_main_auto_compaction_is_restored_in_every_order_with_a_subagent_compaction(self):
        self.assertEqual(self.interleave(370000, "auto"), [])

    # Fixed defect: the subagent's foreign_pending flag silences the main SessionStart in 5 of 20 orders
    def test_main_manual_compaction_is_restored_in_every_order_with_a_subagent_compaction(self):
        self.assertEqual(self.interleave(120000, "manual"), [])

    # Fixed defect: under-estimated main context + a live subagent: the MAIN compaction is dropped silently
    def test_main_compaction_is_not_mistaken_for_a_subagents(self):
        too_long = self.asst([{"type": "text", "text": "Prompt is too long"}], tokens=0, model="<synthetic>")
        for sid, tokens, extra in (("reactive", 150000, [too_long]), ("bigline", 367000, [self.prompt("Z" * 2_200_000)])):
            self.assertTrue(self.pre(self.busy(sid, tokens, extra=extra)[1]), sid)

    # Fixed defect: a lone surrogate from the transcript (JS cut mid-emoji) raises in ulen(): no snapshot
    def test_lone_surrogate_in_the_window_does_not_disable_precompact(self):
        _, tp, pl = self.stateful(NEXT.format("n"))
        bad = self.tool("Bash", {"command": "build"}, "error \ud83d", error=True)
        tp.write_bytes(tp.read_bytes() + "".join(json.dumps(r) + "\n" for r in bad).encode("ascii"))  # as JSON.stringify
        self.has(self.pre(pl) or "", "Context-system notes")

    def test_fork_resume_and_clear_do_not_touch_the_parents_snapshot(self):
        _, tp, pl = self.stateful(NEXT.format("PARENT-STATE"))
        self.boundary(tp)
        self.pre(pl)  # parent: an unrestored snapshot for cycle 2
        fork = dict(pl, session_id=SID2, transcript_path=str(self.tdir / f"{SID2}.jsonl"))
        shutil.copyfile(tp, fork["transcript_path"])  # --fork-session: the same records under a new session id
        self.has(self.restore(fork), "No restoration snapshot exists for this session")
        self.pre(fork)
        self.assertRegex(self.meta(fork)["tag"], r"^s0001-c002-")
        self.has(self.restore(fork), "PARENT-STATE")
        for source in ("resume", "clear", "fork", "startup"):
            self.lacks(self.note("SessionStart", pl, source=source) or "", "PARENT-STATE")
        self.assertFalse(any(self.archive().glob("*-consumed")))
        self.has(self.restore(pl), "PARENT-STATE")


class ChangedOnDiskTest(Sandbox):
    """SessionStart(compact): the exact snapshot first, then what changed on disk after it."""
    HEAD = "\n\n## Changed on disk after this snapshot was saved (the file is newer than the text above)\n"
    TWO = ("<!-- ctx:restore -->\nBLOCK-A v1\n<!-- /ctx:restore -->\nmid v1\n<!-- ctx:restore -->\nBLOCK-B v1\n"
           "<!-- /ctx:restore -->\n")

    def saved(self, text, sid=SID):
        path, tp, pl = self.stateful(text, sid=sid)
        self.pre(pl)
        self.boundary(tp)
        return path, pl, self.snap(pl)

    def test_unchanged_blocks_restore_the_snapshot_exactly(self):
        path, pl, snap = self.saved(self.TWO)
        path.write_bytes(self.TWO.replace("mid v1", "mid v2").encode())  # a change outside the covered blocks
        self.assertEqual(self.restore(pl), snap)
        _, pl2, snap2 = self.saved(NEXT.format("same"), sid=SID2)
        self.assertEqual(self.restore(pl2), snap2)

    def test_whole_file_change_is_appended_after_the_exact_snapshot(self):
        path, pl, snap = self.saved(NEXT.format("STEP-OLD"))
        path.write_bytes(NEXT.format("STEP-NEW (user correction)").encode())
        self.has(snap, "STEP-OLD")
        self.assertEqual(self.restore(pl), snap + self.HEAD + "### whole file (L1-L3) (current text)\n## Next action\n"
                                                              "- STEP-NEW (user correction)")

    def test_only_the_changed_marked_block_is_repeated(self):
        path, pl, snap = self.saved(self.TWO)
        path.write_bytes(self.TWO.replace("BLOCK-B v1", "BLOCK-B v2").encode())
        self.assertEqual(self.restore(pl), snap + self.HEAD + "### marked block 2 (L6-L6) (current text)\nBLOCK-B v2")

    def test_appendix_never_exceeds_the_total_cap(self):
        def body(v):
            return ("<!-- ctx:restore -->\n" + "".join(f"- pinned {v} line {i} of the long block\n" for i in range(190))
                    + "<!-- /ctx:restore -->\n")
        path, pl, snap = self.saved(body("OLD"))
        self.assertEqual(len(self.meta(pl)["covered"]), 1)
        path.write_bytes(body("NEW").encode())
        out = self.restore(pl)
        self.assertTrue(out.startswith(snap + self.HEAD + "- Also changed (too long to show here); read "))
        self.has(out, "marked block 1")
        self.assertLessEqual(len(out), CAP)
        self.lacks(out, "pinned NEW")

    # Wave-1 regression: a section-mode snapshot is re-parsed as sections, not as a whole file.
    def test_changed_named_section_is_reported_with_its_current_text(self):
        text = big_state("## Decisions\n- D1 keep port 8471", "## Next action\n- STEP-OLD")
        path, pl, snap = self.saved(text)
        path.write_bytes(text.replace("STEP-OLD", "STEP-NEW").encode())
        out = self.restore(pl)
        self.assertTrue(out.startswith(snap))
        self.has(out, "STEP-NEW")
        self.lacks(out, "no longer present")

    def test_report_follows_the_snapshots_mode_and_survives_unreadable_files(self):
        sec, v1 = big_state("# Task\n\n## Decisions\n- D1", "## Next action\n- STEP v1"), NEXT.format("v1")
        pin, gone = "\n<!-- ctx:restore -->\nPINNED\n<!-- /ctx:restore -->\n", "; the text above is the last saved copy."
        for sid, before, after, expect in (
                ("grew", v1, big_state(NEXT.format("v2")), f"- Also changed (too long to show here); read {STATE}: whole file (L1-L"),
                ("whole+marks", v1, v1 + pin, "### whole file (L1-L7) (current text)\n## Next action\n- v1\n\n<!-- ctx"),
                ("sections+marks", sec, sec.replace("v1", "v2") + pin, "### Task > Next action (L"),
                ("reordered", sec, FILLER + "\n# Task\n\n## Next action\n- STEP v1\n\n## Decisions\n- D1\n", ""),
                ("unmarked", self.TWO, "BLOCK-A v1\nBLOCK-B v1\n", f"- marked block 1: no longer present in {STATE}."),
                ("binary", v1, b"\x80\xff bad", f"- {STATE} is not valid UTF-8/UTF-16 text{gone}"),
                ("deleted", v1, None, f"- {STATE} cannot be read (FileNotFoundError){gone}")):
            path, pl, snap = self.saved(before, sid=sid)
            path.unlink() if after is None else path.write_bytes(after if isinstance(after, bytes) else after.encode())
            out = self.restore(pl)
            self.assertLessEqual(len(out), CAP, sid)
            self.assertTrue(out.startswith(snap + self.HEAD + expect) if expect else out == snap, (sid, out[len(snap):][:300]))

    # Fixed defect: blocks are matched by ordinal/label: an inserted (or duplicate) block shifts the comparison
    def test_changed_blocks_are_matched_by_identity_not_position(self):
        path, pl, snap = self.saved(self.TWO)
        path.write_bytes(("<!-- ctx:restore -->\nNEW-TOP\n<!-- /ctx:restore -->\n" + self.TWO.replace("B v1", "B v2")).encode())
        out = self.restore(pl)
        self.has(out, "BLOCK-B v2")
        self.lacks(out[len(snap):], "BLOCK-A v1")

    # Fixed defect: one oversized changed block turns every later change into a pointer, even one that fits
    def test_small_changed_block_is_shown_when_an_earlier_one_is_too_long(self):
        long = "## Decisions\n" + "".join(f"- decision {i} v1 stays on the long list\n" for i in range(120))
        text = big_state(long, "## Next action\n- STEP v1")
        path, pl, snap = self.saved(text)
        path.write_bytes(text.replace("v1", "v2").encode())
        self.has(self.restore(pl), "- STEP v2")


class SummaryTest(Sandbox):
    def test_summary_is_filed_under_the_restored_snapshot_tag(self):
        _, tp, pl = self.stateful(NEXT.format("n"))
        self.pre(pl)
        self.boundary(tp)
        self.restore(pl)
        tag = self.meta(pl)["tag"]
        self.assertIsNone(hooks.handle("PostCompact", dict(pl, compact_summary="SUMMARY-BODY one")))
        first = self.archive() / f"{tag}-summary.md"
        self.assertEqual(first.read_text(encoding="utf-8"), f"# Compaction summary (auto, {tag})\n\nSUMMARY-BODY one\n")
        self.assertNotIn("pending_summary_tag", hooks.Ctx(pl).state())
        hooks.handle("PostCompact", dict(pl, trigger="manual", compact_summary="SUMMARY-BODY two"))
        later = list(self.archive().glob("nosnap-b1-*-summary.md"))
        self.assertEqual(len(later), 1)
        self.has(later[0].read_text(encoding="utf-8"), "(manual, nosnap-b1-", "SUMMARY-BODY two")
        self.has(first.read_text(encoding="utf-8"), "SUMMARY-BODY one")

    def test_summary_without_a_restored_snapshot_is_tagged_nosnap(self):
        for sid, count, start in (("s-none", 0, True), ("s-stale", 2, True), ("s-direct", 1, False)):
            _, tp, pl = self.stateful(NEXT.format("n"), sid=sid)
            if sid == "s-stale":
                self.pre(pl)
            self.boundary(tp, count)
            if start:
                self.restore(pl)
            hooks.handle("PostCompact", dict(pl, compact_summary=f"SUM-{sid}"))
            files = list(self.archive(sid).glob("*-summary.md"))
            self.assertEqual(len(files), 1, sid)
            self.assertRegex(files[0].name, rf"^nosnap-b{count}-\d{{8}}T\d{{6}}Z-summary\.md$")
            self.has(files[0].read_text(encoding="utf-8"), f"SUM-{sid}")

class LedgerTest(Sandbox):
    def led(self, records):
        tp, _ = self.session(SID, records)
        return ledger.build_ledger(ledger.read_window(tp)["records"], self.root)

    def test_only_successful_writes_count_as_changes(self):
        outside = self.tmp / "outside" / "c.txt"
        led = self.led(self.wrote(self.root / "a.py") + self.wrote(self.root / "sub/b.py", "Edit", error=True)
                       + self.wrote(self.root / "z.py") + self.wrote(self.root / "a.py", "Edit") + self.wrote(outside)
                       + self.tool("NotebookEdit", {"notebook_path": str(self.root / "n.ipynb")}))
        self.assertEqual({k: dict(v) for k, v in led["changed"].items()},
                         {"z.py": {"Write": 1}, "a.py": {"Write": 1, "Edit": 1}, str(outside): {"Write": 1},
                          "n.ipynb": {"NotebookEdit": 1}})
        self.assertEqual(led["failures"], [{"line": 3, "command": "Edit sub/b.py", "error": "denied"}])
        text = ledger.render_ledger(led, 5000)
        self.has(text, f"(latest first): n.ipynb (NotebookEditx1); {outside} (Writex1); a.py (Writex1, Editx1); z.py")
        self.lacks(text, "sub/b.py (")

    def test_failed_shell_calls_keep_command_and_error(self):
        led = self.led(self.tool("PowerShell", {"command": "pytest   -q\ntests"}, "E   assert 1 == 2\nFAILED x.py", error=True)
                       + self.tool("Bash", {"command": "ls"}, "fine")
                       + self.tool("Read", {"file_path": str(self.root / "gone.md")}, "File does not exist", error=True)
                       + self.tool("Grep", {"pattern": "x"}, "boom", error=True))
        self.assertEqual(led["failures"], [{"line": 1, "command": "pytest -q tests", "error": "E assert 1 == 2 FAILED x.py"}])
        self.assertEqual(dict(led["reads"]), {})
        self.has(ledger.render_ledger(led, 5000), "- Failed tool calls: [pytest -q tests] E assert 1 == 2 FAILED x.py")

    def test_read_ranges(self):
        f = str(self.root / "docs/big.md")
        led = self.led(self.tool("Read", {"file_path": f}, "x" * 7000)
                       + self.tool("Read", {"file_path": f, "offset": 5, "limit": 10}, [{"type": "text", "text": "y" * 100}])
                       + self.tool("Read", {"file_path": f, "offset": 40}, "z") + self.tool("Read", {"file_path": f, "limit": 10}, "w"))
        self.assertEqual(dict(led["reads"]),
                         {"docs/big.md": {"count": 4, "chars": 7102, "ranges": ["all", "5-14", "40-", "1-10"]}})
        self.has(ledger.render_ledger(led, 5000), "- Large reads: docs/big.md [5-14, 40-, 1-10] ~2k tok")

    def test_task_notifications_become_results_not_prompts(self):
        def note(i):
            return (f"<task-notification>\n<task-id>bg{i}</task-id>\n<output-file>C:/tmp/out{i}.txt</output-file>\n"
                    f"<status>completed</status>\n<summary>Agent {i} done</summary>\n</task-notification>")
        led = self.led([self.rec("user", note(1) + "\n" + note(2)), self.prompt("real prompt")])
        self.assertEqual(led["results"], [{"task-id": f"bg{i}", "output-file": f"C:/tmp/out{i}.txt", "status": "completed",
                                           "summary": f"Agent {i} done", "line": 0} for i in (1, 2)])
        self.assertEqual([p["text"] for p in led["prompts"]], ["real prompt"])
        self.has(ledger.render_ledger(led, 5000), "bg2 completed -> C:/tmp/out2.txt")

    def test_prompts_are_human_messages_only(self):
        led = self.led([self.prompt("first"), self.rec("user", "legacy without origin"), self.rec("user", "meta", isMeta=True),
                        self.rec("user", "from a task", origin={"kind": "task-notification"}),
                        self.rec("user", "[Request interrupted by user]"),
                        self.rec("user", [{"type": "text", "text": "list form"}], origin={"kind": "human"})]
                       + self.tool("Bash", {"command": "ls"}, "tool output"))
        self.assertEqual([(p["line"], p["text"]) for p in led["prompts"]],
                         [(0, "first"), (1, "legacy without origin"), (5, "list form")])

    # Record shape inferred from the 2.1.293 binary (isCompactSummary without isMeta/origin).
    def test_compact_summary_record_is_not_a_human_prompt(self):
        summary = {"type": "user", "isCompactSummary": True, "isVisibleInTranscriptOnly": True, "uuid": self.uid(),
                   "message": {"role": "user", "content": "This session is being continued from a previous conversation."}}
        led = self.led([BOUNDARY, summary, self.prompt("real prompt")])
        self.assertEqual([p["text"] for p in led["prompts"]], ["real prompt"])

class StateFileTest(Sandbox):
    def pick(self, records, focus=None, previous=None):
        tp, _ = self.session(SID, records)
        return ledger.find_state_file(tp, self.root, focus, previous)

    def test_task_md_under_docs_tasks_is_preferred_then_most_changed_then_latest(self):
        task, hand, st = self.state("x"), self.state("x", "HANDOFF.md"), self.state("x", "state.md")
        self.assertEqual(self.pick(self.wrote(hand, times=3) + self.wrote(task)), STATE)
        self.assertEqual(self.pick(self.wrote(st, times=2) + self.wrote(hand)), "state.md")
        self.assertEqual(self.pick(self.wrote(st) + self.wrote(hand, "Edit")), "HANDOFF.md")
        self.assertEqual(self.pick(self.wrote(self.state("x", "session-state-2.md"), "MultiEdit")), "session-state-2.md")
        self.assertIsNone(self.pick(self.wrote(self.state("x", "notes.md"))))

    def test_archive_outside_missing_and_failed_writes_are_ignored(self):
        records = (self.wrote(self.state("x", "docs/Archive/task.md")) + self.wrote(self.outside_file())
                   + self.wrote(self.root / "docs/tasks/gone/task.md") + self.wrote(self.state("x"), error=True))
        self.assertIsNone(self.pick(records))

    def test_previous_cycle_choice_is_the_fallback(self):
        self.state("x")
        hand, other = self.state("x", "handoff.md"), self.state("x", "docs/tasks/other/task.md")
        self.outside_file()
        old = self.wrote(hand) + [BOUNDARY]
        self.assertEqual(self.pick(old + self.wrote(self.root / "src/a.py"), previous=STATE), STATE)
        self.assertEqual(self.pick(old + self.wrote(other), previous=STATE), "docs/tasks/other/task.md")
        for previous in ("../outside/task.md", "docs/tasks/none/task.md", None):
            self.assertEqual(self.pick(old, previous=previous), "handoff.md", previous)

    def test_focus_is_per_session_and_must_be_a_file_inside_the_root(self):
        a = self.state(NEXT.format("FROM-A"))
        self.state(NEXT.format("FROM-B"), STATE_B)
        for bad in ("../outside/task.md", str(self.outside_file()), "docs/tasks/missing/task.md", "docs/tasks/b"):
            self.assertEqual(self.pick(self.wrote(a), focus=bad), STATE, bad)
        tp1, pl1 = self.session(SID, self.wrote(a))
        tp2, pl2 = self.session(SID2, self.wrote(a))
        hooks.Ctx(pl1).save_state({"focus": STATE_B})
        self.assertEqual((hooks.Ctx(pl1).state_file(), hooks.Ctx(pl2).state_file()), (STATE_B, STATE))
        self.pre(pl1)
        self.pre(pl2)
        self.has(self.restore(pl1), "FROM-B")
        self.has(self.restore(pl2), "FROM-A")
        self.assertEqual(sorted(p.name for p in self.root.iterdir()), ["docs"])  # no project-wide focus file


class RecallTest(Sandbox):
    def test_main_transcript_refs_open_the_exact_block(self):
        self.session(SID, [self.prompt("please check the QUOKKA fixture"),
                           self.asst([{"type": "text", "text": "The QUOKKA fixture is fine"},
                                      {"type": "tool_use", "id": "t1", "name": "Bash", "input": {"command": "echo QUOKKA"}}]),
                           self.rec("user", [{"type": "tool_result", "tool_use_id": "t1", "content": "QUOKKA output"}])])
        ref = f"{SID}.jsonl"
        hits = {h["ref"]: h for h in recall.search("QUOKKA", self.root)}
        self.assertEqual({r: h["kind"] for r, h in hits.items()},
                         {f"{ref}:0:0": "user", f"{ref}:1:0": "assistant", f"{ref}:1:1": "tool_use", f"{ref}:2:0": "tool_result"})
        self.assertEqual(hits[f"{ref}:2:0"]["label"], "Bash")
        shown = recall.show(f"{ref}:1:1", self.root)
        self.assertEqual(shown.split("\n", 1)[1], "[tool_use Bash echo QUOKKA]\necho QUOKKA")  # decoded, not JSON
        self.has(shown, f"== {ref} line 1 (assistant, 2026-10-10T00:00:00Z)")
        self.assertEqual(recall.show(f"{ref}:0:0", self.root, chars=5, offset=2),
                         f"== {ref} line 0 (user, 2026-10-10T00:00:00Z) (chars 2-7 of 38)\nser]\n\n"
                         "[31 more chars: add --offset 7]")
        self.assertEqual([h["ref"] for h in recall.search('"QUOKKA fixture"', self.root, kinds={"user"})], [f"{ref}:0:0"])
        self.assertEqual(len(recall.search("QUOKKA", self.root, limit=2)), 2)
        self.assertEqual(recall.format_hits(recall.search("zebra", self.root) + recall.search("  ", self.root)), "No matches.")

    def test_subagent_transcripts_are_searchable_with_exact_refs(self):
        self.session(SID, [self.prompt("main only")])
        refs = {f"{SID}/subagents/agent-a1.jsonl:0:0", f"{SID}/subagents/workflows/w1/agent-b2.jsonl:0:0"}
        for ref in refs:
            path = self.tdir / ref[:-4]
            path.parent.mkdir(parents=True, exist_ok=True)
            self.append(path, [self.asst([{"type": "text", "text": f"WOMBAT finding in {path.stem}"}])])
        hits = recall.search("WOMBAT", self.root)
        self.assertEqual(({h["ref"] for h in hits}, {h["kind"] for h in hits}), (refs, {"sub:assistant"}))
        for ref in refs:
            self.has(recall.show(ref, self.root), "WOMBAT finding in " + ref.split("/")[-1].split(".")[0])
        self.assertEqual(recall.search("WOMBAT", self.root, include_subagents=False), [])
        self.assertEqual(len(recall.search("WOMBAT", self.root, session="agent-b2")), 1)

    def test_archive_dedupes_live_records_and_survives_transcript_cleanup(self):
        path = self.state(NEXT.format("n"))
        tp, pl = self.session(SID, [self.prompt("the NUMBAT decision stands")] + self.wrote(path))
        self.pre(pl)
        tag = self.meta(pl)["tag"]
        live = recall.search("NUMBAT", self.root, kinds={"user"})
        self.assertEqual([h["ref"] for h in live], [f"{SID}.jsonl:0:0"])  # the archived copy has the same uuid
        tp.unlink()
        hits = recall.search("NUMBAT", self.root, limit=20)
        by_kind = {h["kind"]: h["ref"] for h in hits}
        self.assertEqual(by_kind["archive:user"], f"context-system/archive/{SID}/{tag}-window.jsonl:0:0")
        self.assertRegex(by_kind["archive:note"], rf"^context-system/archive/{SID}/{tag}-(ledger|restore)\.md#\d+$")
        for h in hits:
            self.has(recall.show(h["ref"], self.root), "NUMBAT")

    def test_traversal_malformed_and_missing_refs_are_refused(self):
        self.session(SID, [self.prompt("hi")])
        secret = self.home / "projects" / "secret.jsonl"
        self.append(secret, [self.prompt("TOPSECRET")])
        note = self.tmp / "secret.md"
        note.write_text("TOPSECRET note", encoding="utf-8")
        for ref, expect in (("../secret.jsonl:0:0", "No transcript file"), (f"{secret}:0:0", "No transcript file"),
                            ("../../../secret.md#0", "No archive entry"), (f"{note}#0", "No archive entry"),
                            (":0:0", "Malformed reference"), ("#0", "Malformed reference"),
                            (f"{SID}.jsonl:0:7", "No record at"), (f"{SID}.jsonl:0:-1", "Malformed reference"),
                            ("x.md#²", "Malformed reference"),
                            ("nonsense", "Malformed reference"), (f"{SID}.jsonl:x:y", "Malformed reference"),
                            (f"{SID}.jsonl:0", "Malformed reference"), (f"{SID}.jsonl:999:0", "No record at"),
                            ("missing.jsonl:0:0", "No transcript file missing.jsonl")):
            out = recall.show(ref, self.root)
            self.assertTrue(out.startswith(expect), (ref, out))
            self.lacks(out, "TOPSECRET")

    # Wave-1 regression: the raw-line prefilter also looks for the JSON-escaped spelling of each term.
    def test_escaped_paths_phrases_and_punctuated_terms_match(self):
        win = r"C:\Users\U\proj\tools\core.py"
        tp, _ = self.session(SID, [self.prompt(f"open {win} now"), *self.tool("Read", {"file_path": win}, f"body of {win}"),
                                   self.prompt("the gizmoflux\nvalve wraps; issue #123 at src/app.py:42 in C#")])
        tp.write_bytes(tp.read_bytes() + (json.dumps(self.prompt("a naïve entry")) + "\n").encode("ascii"))  # \u-escaped
        for query, n in ((win, 3), (r"tools\core.py", 3), (r'"open C:\Users\U\proj"', 1), ('"gizmoflux valve"', 1),
                         ("#123", 1), ("src/app.py:42", 1), ("C#", 1), ("naïve", 1)):
            self.assertEqual(len(recall.search(query, self.root)), n, query)
        sub = self.tdir / SID / "subagents" / "agent x#1.jsonl"  # '#' in a file name is not the note form
        sub.parent.mkdir(parents=True)
        self.append(sub, [self.asst([{"type": "text", "text": "OKAPI"}])])
        self.has(recall.show(recall.search("OKAPI", self.root)[0]["ref"], self.root), "agent x#1.jsonl line 0", "OKAPI")

    # Fixed defect: the kinds search prints ("sub:assistant", "archive:note") select nothing as a filter
    def test_kind_filter_accepts_the_kinds_search_prints(self):
        sub = self.tdir / SID / "subagents" / "agent-a1.jsonl"
        sub.parent.mkdir(parents=True)
        self.append(sub, [self.asst([{"type": "text", "text": "WOMBAT"}])])
        kind = recall.search("WOMBAT", self.root)[0]["kind"]
        self.assertEqual(len(recall.search("WOMBAT", self.root, kinds={kind})), 1)

    # Fixed defect: the prefilter skips the tool_use line, so search shows no tool name (show does)
    def test_tool_result_hit_names_its_tool(self):
        self.session(SID, self.tool("PowerShell", {"command": "Get-Content notes.txt"}, "ZEBRAWORD here"))
        self.assertEqual(recall.search("ZEBRAWORD", self.root)[0]["label"], "PowerShell")

    def test_project_slug_follows_claude_codes_rule(self):
        def java_hash(s):  # closed form of String.hashCode over UTF-16 code units, as a signed 32-bit int
            data = s.encode("utf-16-le")
            units = [data[i] | data[i + 1] << 8 for i in range(0, len(data), 2)]
            h = sum(u * 31 ** (len(units) - 1 - i) for i, u in enumerate(units)) % 2 ** 32
            return h - 2 ** 32 if h >= 2 ** 31 else h

        def b36(n):
            out = ""
            while True:
                n, r = divmod(n, 36)
                out = "0123456789abcdefghijklmnopqrstuvwxyz"[r] + out
                if not n:
                    return out
        self.assertEqual((java_hash("hello"), b36(99162322)), (99162322, "1n1e4y"))  # Java's "hello".hashCode()
        real = r"C:\Users\User\OneDrive\Documents\Bilal_Migration\User\Downloads\20_PROJECTS\24_Clinic_Workshop"
        self.assertEqual(core.project_slug(real),
                         "C--Users-User-OneDrive-Documents-Bilal-Migration-User-Downloads-20-PROJECTS-24-Clinic-Workshop")
        signs = set()
        for i in range(12):
            raw = f"C:\\w{i}\\" + "deep_dir_é\\" * 22 + "proj"
            flat = re.sub(r"[^a-zA-Z0-9]", "-", raw)
            self.assertEqual(core.project_slug(raw), f"{flat[:200]}-{b36(abs(java_hash(raw)))}")
            signs.add(java_hash(raw) < 0)
        self.assertEqual(signs, {True, False})
        exact = "C:\\" + "a" * 197
        self.assertEqual(core.project_slug(exact), "C--" + "a" * 197)  # 200 characters: no hash suffix
        longer = core.project_slug(exact + "b")
        self.assertEqual(longer, "C--" + "a" * 197 + "-" + b36(abs(java_hash(exact + "b"))))
        self.assertEqual(core.transcripts_dir(Path(exact + "b")), self.home / "projects" / longer)

    # Claude Code 2.1.293 sanitises and measures the path in UTF-16 code units.
    def test_project_slug_counts_utf16_units_like_claude_code(self):
        self.assertEqual(core.project_slug("C:\\w\\\U0001F600\\p"), "C--w----p")


class CompactionConfigTest(Sandbox):
    def cc(self, model=None):
        return core.compaction_config(self.root, model)

    def pair(self, model=None):
        return self.cc(model)["window"], self.cc(model)["source"]

    def test_settings_precedence_default_and_clamping(self):
        cc = self.cc()
        self.assertEqual((cc["enabled"], cc["window"], cc["threshold"], cc["source"]), (True, 1_000_000, 967_000, "model-default"))
        for value, want in ((50, (100_000, "project")), (5_000_000, (1_000_000, "project")),
                            (True, (1_000_000, "model-default")), ("400000", (1_000_000, "model-default"))):
            self.settings("project", {"autoCompactWindow": value})
            self.assertEqual(self.pair(), want, value)
        for scope, window in (("user", 200000), ("project", 400000), ("local", 300000), ("managed", 250000)):
            self.settings(scope, {"autoCompactWindow": window})
            self.assertEqual((self.pair(), self.cc()["threshold"]), ((window, scope), window - 33000))

    def test_env_window_beats_every_settings_file(self):
        for scope in ("managed", "local", "project", "user"):
            self.settings(scope, {"autoCompactWindow": 400000})
        os.environ["CLAUDE_CODE_AUTO_COMPACT_WINDOW"] = "200000"
        self.assertEqual((self.pair(), self.cc()["threshold"]), ((200000, "env"), 167000))
        os.environ["CLAUDE_CODE_AUTO_COMPACT_WINDOW"] = "lots"
        self.assertEqual(self.pair(), (400000, "managed"))

    def test_model_settings_override_the_general_window(self):
        self.settings("project", {"autoCompactWindow": 400000,
                                  "modelSettings": {"claude-opus-5-5": {"autoCompactWindow": 500000}}})
        # claude-haiku-4-5 has a 200k context window; Claude Code caps the configured window there.
        self.assertEqual([self.cc(m)["window"] for m in ("claude-opus-5-5", "claude-haiku-4-5", None)],
                         [500000, 200000, 400000])

    def test_disabled_by_settings_or_environment(self):
        off = "auto-compaction appears disabled ({})"
        self.settings("project", {"autoCompactWindow": 400000, "autoCompactEnabled": False})
        self.assertFalse(self.cc()["enabled"])
        self.assertEqual(core.describe_compaction(self.cc()), off.format("autoCompactEnabled=false in project settings"))
        self.settings("local", {"autoCompactEnabled": True})  # the higher-precedence file wins
        self.assertTrue(self.cc()["enabled"])
        for var in ("DISABLE_AUTO_COMPACT", "DISABLE_COMPACT"):
            with mock.patch.dict(os.environ, {var: "1"}):
                self.assertFalse(self.cc()["enabled"], var)
                self.assertEqual(core.describe_compaction(self.cc()), off.format("auto-compaction disabled by environment"))

    def test_pct_override_only_lowers_the_threshold(self):
        self.settings("project", {"autoCompactWindow": 400000})
        for pct, threshold in (("50", 190000), ("95", 361000), ("100", 367000), ("0", 367000), ("101", 367000), ("abc", 367000)):
            with mock.patch.dict(os.environ, {"CLAUDE_AUTOCOMPACT_PCT_OVERRIDE": pct}):
                cc = self.cc()
                self.assertEqual(cc["threshold"], threshold, pct)
                self.assertEqual(f"CLAUDE_AUTOCOMPACT_PCT_OVERRIDE={pct}" in cc["notes"], pct in ("50", "95", "100"))

    def test_wording_states_threshold_source_and_limits(self):
        self.settings("project", {"autoCompactWindow": 400000})
        text = core.describe_compaction(self.cc())
        self.assertEqual(text, "configured to auto-compact once context passes ~367k tokens (autoCompactWindow 400k from "
                               "project settings; a single step can overshoot it, and launch flags are not visible to "
                               "this check)")
        tp, pl = self.session(SID, [self.asst()])
        self.has(self.note("SessionStart", pl, source="startup"), "This project is " + text, 'recall search "<terms>"',
                 f'focus "<path>" --session {SID}')
        self.assertIsNone(self.note("SessionStart", pl, source="resume"))


class HookEntryTest(Sandbox):
    """The real entry point: python -I -B ctx.py hook <Event>."""

    def big_md(self):
        return self.state("# Title\n" + "line of text for the big file\n" * 3000, "big.md")

    def test_output_shape_per_event(self):
        self.settings("project", {"autoCompactWindow": 400000})
        path, big = self.state(NEXT.format("N1 café step")), self.big_md()
        tp, pl = self.session(SID, self.wrote(path) + [self.asst(tokens=340000)])
        strings = []

        def js(event, **extra):
            obj = json.loads(self.hook(event, dict(pl, **extra)))
            self.assertEqual(list(obj), ["hookSpecificOutput"])
            self.assertEqual(obj["hookSpecificOutput"]["hookEventName"], event)
            strings.extend(strings_in(obj))
            return obj["hookSpecificOutput"]
        self.assertEqual(set(js("SessionStart", source="startup")), {"hookEventName", "additionalContext"})
        self.has(js("UserPromptSubmit", prompt="next")["additionalContext"], "~340k tokens")
        self.assertEqual(self.hook("PostToolBatch", pl), "")  # already reminded in this cycle
        read = js("PreToolUse", tool_name="Read", tool_input={"file_path": str(big)})
        self.assertEqual(set(read), {"hookEventName", "updatedInput", "additionalContext"})
        instr = self.hook("PreCompact", pl)  # plain text, not JSON
        self.assertTrue(instr.startswith("Context-system notes for this summary (cycle 1;"))
        self.boundary(tp)
        self.has(js("SessionStart", source="compact")["additionalContext"], "N1 café step")
        self.assertEqual(self.hook("PostCompact", dict(pl, compact_summary="S")), "")
        self.assertEqual(len(list(self.archive().glob("*-summary.md"))), 1)
        for event, extra in (("SessionStart", {"source": "resume"}), ("Stop", {}),
                             ("PreToolUse", {"tool_name": "Bash", "tool_input": {"command": "ls"}})):
            self.assertEqual(self.hook(event, dict(pl, **extra)), "", event)
        self.assertLessEqual(max(map(len, strings + [instr])), CAP)

    def test_subagent_payloads_are_ignored(self):
        self.settings("project", {"autoCompactWindow": 400000})
        path, big = self.state(NEXT.format("n")), self.big_md()
        tp, pl = self.session(SID, self.wrote(path) + [self.asst(tokens=340000)])
        pl = dict(pl, agent_id="agent-7", source="compact", tool_name="Read", tool_input={"file_path": str(big)},
                  compact_summary="S")
        for event in EVENTS:
            self.assertEqual(self.hook(event, pl), "", event)
            self.assertIsNone(hooks.handle(event, pl), event)
        self.assertFalse((self.tdir / "context-system").exists())

    def test_garbage_stdin_exits_zero_with_no_output(self):
        for event in EVENTS:
            self.assertEqual(self.hook(event, raw=b"\xff\xfe\x00 not json {"), "", event)
        for raw in (b"[1, 2]", b'"text"', b"null", b'{"unterminated": '):
            self.assertEqual(self.hook("SessionStart", raw=raw), "", raw)
        self.assertEqual(self.hook("PreCompact", raw=b""), "")
        self.assertFalse((self.tdir / "context-system").exists())

    def test_handler_errors_are_logged_and_never_fail_the_hook(self):
        bad = self.tdir / "is-a-directory.jsonl"
        bad.mkdir()
        self.assertEqual(self.hook("PreCompact", {"transcript_path": str(bad), "session_id": SID, "cwd": str(self.root)}), "")
        entry = json.loads((self.tdir / "context-system" / "errors.jsonl").read_text(encoding="utf-8").splitlines()[-1])
        self.assertEqual(entry["event"], "PreCompact")
        self.has(entry["trace"], "Error")

    def test_project_root_comes_from_env_or_payload_never_the_code_location(self):
        other = self.tmp / "other"
        other.mkdir()
        self.assertEqual(core.project_root({"cwd": str(other)}), self.root)
        self.assertEqual(core.project_root({"cwd": str(other)}, explicit=str(self.tmp)), self.tmp)
        _, tp, pl = self.stateful(NEXT.format("FROM-CWD-PROJECT"))
        os.environ["CLAUDE_PROJECT_DIR"] = str(self.tmp / "missing")
        self.assertEqual(core.project_root({"cwd": str(other)}), other)
        del os.environ["CLAUDE_PROJECT_DIR"]  # the payload cwd alone identifies the project
        self.has(self.hook("PreCompact", pl), f"parts of {STATE} are restored verbatim")
        self.assertEqual(sorted(p.name for p in self.tmp.iterdir()), ["claude", "other", "proj"])


class ReadAdmissionTest(Sandbox):
    """PreToolUse(Read): large files get a first page plus an outline."""

    def read(self, path, **inp):
        return hooks.handle("PreToolUse", {"tool_name": inp.pop("tool", "Read"), "session_id": SID, "cwd": str(self.root),
                                           "tool_input": dict({"file_path": str(path)}, **inp)})

    def big_md(self):
        text = "# Title\n" + "".join(f"## Section {i}\n" + "body line of the section, forty chars\n" * 40 for i in range(40))
        return self.state(text, "big.md"), text

    def test_large_file_gets_a_first_page_and_an_outline(self):
        path, text = self.big_md()
        out = self.read(path, extra_field="kept")["hookSpecificOutput"]
        limit = out["updatedInput"]["limit"]
        self.assertEqual(out["updatedInput"], {"file_path": str(path), "extra_field": "kept", "limit": limit})
        lines = text.splitlines()
        size = lambda n: sum(len(line.encode()) + 1 for line in lines[:n])
        self.assertTrue(CFG["first_page_min_lines"] <= limit < len(lines))
        self.assertTrue(size(limit - 1) < CFG["first_page_bytes"] <= size(limit))
        self.assertEqual(out["hookEventName"], "PreToolUse")
        self.has(out["additionalContext"], f"big.md is {len(text) // 1024} KB / {len(lines)} lines",
                 f"so this Read returns lines 1-{limit}",
                 "Outline (line: heading):\nL1: # Title\nL2: ## Section 0\nL43: ## Section 1\n")
        wide = self.read(self.state(("x" * 999 + "\n") * 400, "wide.txt"))["hookSpecificOutput"]
        self.assertEqual(wide["updatedInput"]["limit"], CFG["first_page_min_lines"])  # long lines: the minimum page
        self.lacks(wide["additionalContext"], "Outline")

    def test_skip_rules(self):
        path, text = self.big_md()
        for inp in ({"offset": 10}, {"limit": 50}, {"pages": "1-2"}, {"tool": "Grep"}, {"tool": "Edit"}):
            self.assertIsNone(self.read(path, **inp), inp)
        skipped = [self.state("# small\n" * 100, "small.md"),
                   self.state(("y" * 400 + "\n") * 100, "few.txt"),  # 40 KB but shorter than the minimum page
                   self.state(b"\x00\x01" * 30000, "blob.bin"), self.root / "missing.md", self.root / "docs"]
        skipped += [self.state(text, f"doc{ext}") for ext in (".pdf", ".PNG", ".ipynb")]
        for p in skipped:
            self.assertIsNone(self.read(p), p.name)
        self.cfg(read_admission=False)
        self.assertIsNone(self.read(path))

class NudgeTest(Sandbox):
    """One reminder per compaction cycle, only inside the margin below the threshold."""

    def setUp(self):
        super().setUp()
        self.settings("project", {"autoCompactWindow": 400000})  # threshold 367k

    def at(self, tokens, sid=SID, extra=()):
        return self.session(sid, list(extra) + [self.asst(tokens=tokens - 10)])  # + 10 output tokens

    def test_one_reminder_per_cycle_naming_the_state_file(self):
        tp, pl = self.at(340000, extra=self.wrote(self.state(NEXT.format("n"))))
        first = hooks.handle("UserPromptSubmit", pl)["hookSpecificOutput"]
        self.assertEqual(first["hookEventName"], "UserPromptSubmit")
        self.has(first["additionalContext"], "Context is ~340k tokens; auto-compaction is configured for ~367k",
                 f"bring {STATE} up to date", "<!-- ctx:restore -->")
        self.assertIsNone(self.note("PostToolBatch", pl))
        self.assertIsNone(self.note("UserPromptSubmit", pl))
        self.boundary(tp)
        self.append(tp, [self.asst(tokens=350000)])
        self.assertEqual(hooks.handle("PostToolBatch", pl)["hookSpecificOutput"]["hookEventName"], "PostToolBatch")
        self.assertIsNone(self.note("PostToolBatch", pl))
        tp2, pl2 = self.at(340000, sid=SID2)
        self.has(self.note("PostToolBatch", pl2), "bring the task state file (docs/tasks/<id>/task.md) if this work has one")

    def test_margin_edges(self):
        low = 367000 - int(CFG["nudge_margin_tokens"])
        for i, (tokens, fires) in enumerate(((low - 1, False), (low, True), (366999, True), (367000, False),
                                             (500000, False), (1000, False))):
            tp, pl = self.at(tokens, sid=f"s-edge-{i}")
            self.assertEqual(self.note("PostToolBatch", pl) is not None, fires, tokens)

    # Fixed defect: base64 image data is counted as text: an 800 KB screenshot adds ~333k "tokens"
    def test_image_tool_result_does_not_inflate_the_estimate(self):
        tp, pl = self.session(SID, self.tool("shot", {}, [{"type": "image", "source": {"type": "base64", "data": "A" * 800000}}]))
        self.assertIsNone(self.note("PostToolBatch", pl))

class InstallTest(Sandbox):
    """install / uninstall / doctor against a temporary project only."""
    FOREIGN = {"type": "command", "command": "echo", "args": ["other-tool"]}
    LOCAL, SHARED, RULES = ".claude/settings.local.json", ".claude/settings.json", ".claude/rules/context-system.md"

    def setUp(self):
        super().setUp()
        self.proj = self.tmp / "target"
        (self.proj / ".claude").mkdir(parents=True)
        self.local0 = {"permissions": {"allow": ["Bash(ls:*)"]},
                       "hooks": {"PreToolUse": [{"matcher": "Bash", "hooks": [self.FOREIGN]}], "Stop": [{"hooks": [self.FOREIGN]}]}}
        self.shared0 = {"model": "opus", "bashOutputMaxChars": 5000}
        self.write(self.LOCAL, self.local0)
        self.write(self.SHARED, self.shared0)
        (self.proj / ".gitignore").write_text("node_modules/\n", encoding="utf-8")

    def write(self, rel_path, data):
        (self.proj / rel_path).write_text(json.dumps(data), encoding="utf-8")

    def load(self, rel_path):
        return json.loads((self.proj / rel_path).read_text(encoding="utf-8"))

    def install(self, *extra):
        return self.cli("install", "--project", self.proj, "--python", PY, *extra)

    def test_install_keeps_everything_else_and_is_idempotent(self):
        self.assertEqual(self.install("--window", "400000")[0], 0)
        local = self.load(self.LOCAL)
        self.assertEqual(local["permissions"], self.local0["permissions"])
        self.assertEqual(local["hooks"]["Stop"], self.local0["hooks"]["Stop"])
        self.assertEqual(local["hooks"]["PreToolUse"][0], self.local0["hooks"]["PreToolUse"][0])
        ours = ctx_cli._hook_entries(local)
        self.assertEqual(sorted(e for e, _ in ours), sorted(EVENTS))
        for event, h in ours:
            self.assertEqual((h["type"], h["command"], h["args"]),
                             ("command", str(Path(PY).resolve()), ["-I", "-B", str(CTX_PY.resolve()), "hook", event]))
        self.assertEqual(local["hooks"]["PreToolUse"][1]["matcher"], "Read")
        self.assertEqual(self.load(self.SHARED), dict(self.shared0, autoCompactWindow=400000, precomputeCompactionEnabled=False))
        self.assertEqual((self.proj / self.RULES).read_bytes(), (CODE_DIR / "templates/rules.md").read_bytes())
        files = [self.LOCAL, self.SHARED, ".gitignore", self.RULES]
        first = [(self.proj / f).read_bytes() for f in files]
        self.assertEqual(first[2].count(b".claude/settings.local.json"), 1)
        self.assertEqual(self.install("--window", "400000")[0], 0)
        self.assertEqual([(self.proj / f).read_bytes() for f in files], first)

    def test_uninstall_removes_only_its_own_hooks(self):
        self.install("--window", "400000")
        local = self.load(self.LOCAL)
        local["hooks"]["PreToolUse"][1]["hooks"].append(self.FOREIGN)  # a foreign hook sharing our group
        self.write(self.LOCAL, local)
        shared = self.load(self.SHARED)
        self.assertEqual(self.cli("uninstall", "--project", self.proj)[0], 0)
        after = self.load(self.LOCAL)
        self.assertEqual(after["permissions"], self.local0["permissions"])
        self.assertEqual(after["hooks"], {"PreToolUse": [self.local0["hooks"]["PreToolUse"][0],
                                                         {"matcher": "Read", "hooks": [self.FOREIGN]}],
                                          "Stop": self.local0["hooks"]["Stop"]})
        self.assertEqual(self.load(self.SHARED), shared)
        self.assertTrue((self.proj / self.RULES).is_file())

    def test_uninstall_all_removes_settings_and_rules(self):
        self.write(self.SHARED, {"model": "opus"})
        self.install("--window", "400000")
        rc, _ = self.cli("uninstall", "--project", self.proj, "--all")
        self.assertEqual((rc, self.load(self.SHARED), self.load(self.LOCAL)), (0, {"model": "opus"}, self.local0))
        self.assertFalse((self.proj / self.RULES).exists())

    # Wave-1 regression: --all restores what the install record says instead of popping every key.
    def test_uninstall_all_keeps_values_the_user_already_had(self):
        self.install()
        self.cli("uninstall", "--project", self.proj, "--all")
        self.assertEqual(self.load(self.SHARED), self.shared0)

    def test_record_keeps_first_install_values_projects_are_independent_bad_settings_are_refused(self):
        before = {"model": "opus", "autoCompactWindow": 300000}
        self.write(self.SHARED, before)
        self.install("--window", "400000")
        self.install("--window", "350000")
        first, self.proj = self.proj, self.tmp / "second"
        (self.proj / ".claude").mkdir(parents=True)
        self.install("--window", "400000")
        self.assertEqual(self.cli("uninstall", "--project", first, "--all")[0], 0)
        self.assertEqual(json.loads((first / self.SHARED).read_text(encoding="utf-8")), before)
        self.assertFalse((first / ".claude" / ctx_cli.INSTALL_RECORD).exists())
        (self.proj / self.SHARED).write_text('{"autoCompactWindow": 400000,}', encoding="utf-8")
        for cmd in (("install", "--python", PY), ("uninstall", "--all")):
            rc, out = self.cli(cmd[0], "--project", self.proj, *cmd[1:])
            self.has(out, "Refusing to " + cmd[0], "cannot be parsed")
        self.assertEqual(((self.proj / self.SHARED).read_text(encoding="utf-8"), len(ctx_cli._hook_entries(self.load(self.LOCAL))), rc),
                         ('{"autoCompactWindow": 400000,}', 6, 1))

    # Fixed defect: without its record --all removes nothing, yet reports the settings as restored
    def test_uninstall_all_without_its_record_does_not_claim_a_restore(self):
        self.install("--window", "400000")
        (self.proj / ".claude" / ctx_cli.INSTALL_RECORD).unlink()
        rc, out = self.cli("uninstall", "--project", self.proj, "--all")
        self.assertTrue("autoCompactWindow" not in self.load(self.SHARED) or "restored" not in out)

    # Fixed defect: any exec-form "<dir>/ctx.py hook" entry counts as ours, although the record names our script
    def test_another_tools_ctx_py_hook_is_left_alone(self):
        theirs = {"type": "command", "command": "python", "args": ["C:/other-tool/ctx.py", "hook", "Stop"]}
        self.write(self.LOCAL, {"hooks": {"Stop": [{"hooks": [theirs]}]}})
        self.install()
        self.assertEqual(self.load(self.LOCAL)["hooks"].get("Stop"), [{"hooks": [theirs]}])

class FocusCliTest(Sandbox):
    def setUp(self):
        super().setUp()
        self.a = self.state(NEXT.format("FROM-A"))
        self.b = self.state(NEXT.format("FROM-B"), STATE_B)
        self.tp, self.pl = self.session(SID, self.wrote(self.a))
        self.tp2, self.pl2 = self.session(SID2, self.wrote(self.a))
        self.state_path = self.tdir / "context-system" / "sessions" / f"{SID}.json"

    def test_focus_pins_one_session_and_drives_restoration(self):
        rc, out = self.cli("focus", self.b, "--session", SID)  # an absolute path is stored relative
        self.assertEqual((rc, core.read_json(self.state_path)), (0, {"focus": STATE_B}))
        self.assertEqual(self.cli("focus", STATE_B, "--session", SID)[0], 0)
        self.assertFalse(self.state_path.with_name(f"{SID2}.json").exists())
        self.pre(self.pl)
        self.pre(self.pl2)
        self.has(self.restore(self.pl), "FROM-B")
        self.has(self.restore(self.pl2), "FROM-A")

    def test_paths_outside_the_project_or_missing_are_rejected(self):
        for bad in (self.outside_file(), "../outside/task.md", "docs/tasks/none/task.md", "docs/tasks/b"):
            rc, out = self.cli("focus", bad, "--session", SID)
            self.assertEqual(rc, 1, bad)
            self.has(out, "Not a file inside the session's project")
        self.assertFalse(self.state_path.exists())
        self.assertEqual(self.cli("focus", STATE_B, "--session", "no-such-session")[0], 1)
        with self.assertRaises(SystemExit):
            self.cli("focus", "--session", SID)

    def test_clear_removes_only_the_focus(self):
        hooks.Ctx(self.pl).save_state({"focus": STATE_B, "nudged_cycle": 2})
        rc, _ = self.cli("focus", "--session", SID, "--clear")
        self.assertEqual((rc, core.read_json(self.state_path)), (0, {"nudged_cycle": 2}))
        self.assertEqual(hooks.Ctx(self.pl).state_file(), STATE)


@unittest.skipUnless(all(p.is_file() for p in REAL), "real transcripts are not present on this machine")


class RealTranscriptTest(Sandbox):
    def test_hooks_on_copies_of_real_transcripts_are_fast_and_capped(self):
        real_state = PROJECT_ROOT / "docs/tasks/context-admission-research/task.md"
        self.state(real_state.read_bytes() if real_state.is_file() else big_state("## Next action\n- n"))
        current = ledger.read_state_text(self.root / STATE)[0]
        by_label = {b["label"]: b["text"] for b in cands(current, WHOLE_BUDGET)}
        for src in REAL:
            sid = src.stem
            tp = self.tdir / src.name
            shutil.copyfile(src, tp)
            pl = {"transcript_path": str(tp), "session_id": sid, "trigger": "auto", "cwd": str(self.root)}
            hooks.Ctx(pl).save_state({"focus": STATE})
            started = time.perf_counter()
            instr = self.hook("PreCompact", pl)
            t_pre = time.perf_counter() - started
            snap, meta = self.snap(pl), self.meta(pl)
            started = time.perf_counter()
            out = json.loads(self.hook("SessionStart", dict(pl, source="compact")))["hookSpecificOutput"]["additionalContext"]
            self.assertLess(max(t_pre, time.perf_counter() - started), 3.0, sid)
            self.assertTrue(instr.startswith("Context-system notes for this summary (cycle 1;"), sid)
            self.assertLessEqual(len(instr), int(CFG["precompact_instruction_chars"]))
            self.assertLessEqual(len(snap), SNAP_CAP)
            self.assertLessEqual(len(out), CAP)
            self.assertEqual(out, snap)
            self.assertEqual(meta["state_file"], STATE)
            self.assertGreater(meta["peak"], 0)
            for item in meta["covered"]:
                self.has(out, by_label[item["label"]])
            self.assertEqual((self.archive(sid) / f"{meta['tag']}-window.jsonl").stat().st_size, tp.stat().st_size)
        hits = recall.search("context", self.root, limit=3)
        self.assertEqual(len(hits), 3)
        self.assertTrue(recall.show(hits[0]["ref"], self.root).startswith("== "))


if __name__ == "__main__":
    unittest.main()
