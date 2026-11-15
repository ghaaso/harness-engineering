"""Synthetic temp-directory regressions; never opens real conversations/settings."""
from __future__ import annotations

import concurrent.futures
import copy
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

sys.dont_write_bytecode = True
ADAPTER = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ADAPTER))

import engine
import hooks
import install
import state

SID, OTHER, TURN = "session-a", "session-b", "turn-a"


class Sandbox(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="codex-context-test-")
        self.addCleanup(self.temp.cleanup)
        self.base = Path(self.temp.name).resolve()
        self.root, self.runtime = self.base / "project", self.base / "runtime"
        self.root.mkdir()
        self.file = self.root / "task.md"
        self.file.write_text("## Next action\nRun the mechanics check.\n", encoding="utf-8")
        self.store = engine.ContextStore(self.root, self.runtime, "task.md")
        self.payload = {"session_id": SID, "turn_id": TURN, "transcript_path": None}

    def handle(self, event, **extra):
        return hooks.handle(event, dict(self.payload, **extra), self.root, self.runtime, "task.md")


class SelectionTests(Sandbox):
    def test_markers_select_only_declared_blocks(self):
        text = "outside\n<!-- ctx:restore -->\nexact 😀\n<!-- /ctx:restore -->\nignore"
        self.assertEqual([b["text"] for b in state.candidates(text, 6000)], ["exact 😀"])

    def test_heading_selection_retains_children(self):
        text = "## Background\n" + "z" * 1000 + "\n## 1. Next action\nnext\n### Detail\nchild\n## Other\nno"
        blocks = state.candidates(text, 100)
        self.assertEqual(len(blocks), 1)
        self.assertIn("child", blocks[0]["text"])
        self.assertNotIn("## Other", blocks[0]["text"])

    def test_fenced_headings_and_historical_sections_excluded(self):
        text = "```md\n## Decisions\nnot a heading\n```\n# Historical\n## Next action\nold\n# Current\n## Decisions\nvalid"
        self.assertEqual([b["text"] for b in state.candidates(text, 0)], ["## Decisions\nvalid"])

    def test_strict_decode_and_newlines(self):
        self.file.write_bytes(b"\xef\xbb\xbf## Next action\r\na\r\n")
        self.assertEqual(state.read_text(self.file), "## Next action\na\n")
        self.file.write_bytes(b"\xffbad")
        with self.assertRaises(UnicodeError):
            state.read_text(self.file)

    def test_unclosed_markers_fall_back(self):
        text = "<!-- ctx:restore -->\n## Decisions\nvalid"
        self.assertEqual(state.candidates(text, 0)[0]["mode"], "sections")


class EngineTests(Sandbox):
    def test_constructor_has_no_side_effect(self):
        self.assertFalse(self.runtime.exists())

    def test_snapshot_restores_complete_original(self):
        result = self.store.snapshot(SID, TURN)
        self.assertEqual(self.store.restore(SID), result["text"])
        self.assertIn(self.file.read_text().strip(), result["text"])
        self.assertEqual(result["blocks"][0]["sha"], state.sha(result["blocks"][0]["text"]))

    def test_same_turn_idempotent_then_new_epoch(self):
        first = self.store.snapshot(SID, TURN)
        self.file.write_text("## Next action\nChanged.\n")
        self.assertEqual(first, self.store.snapshot(SID, TURN))
        self.store.complete(SID, TURN)
        second = self.store.snapshot(SID, TURN)
        self.assertGreater(second["sequence"], first["sequence"])
        self.assertIn("Changed.", second["text"])

    def test_changed_disk_appends_current_without_mutating_snapshot(self):
        first = self.store.snapshot(SID, TURN)
        self.file.write_text("## Next action\nCurrent decision.")
        restored = self.store.restore(SID)
        self.assertTrue(restored.startswith(first["text"]))
        self.assertIn("changed on disk", restored)
        self.assertIn("Current decision.", restored)
        self.assertEqual(self.store.restore(SID), restored)

    def test_oversized_blocks_are_wholly_omitted(self):
        huge = "🚀" * 7000
        self.file.write_text("<!-- ctx:restore -->\n" + huge + "\n<!-- /ctx:restore -->\n"
                             "<!-- ctx:restore -->\nKEEP WHOLE\n<!-- /ctx:restore -->", encoding="utf-8")
        result = self.store.snapshot(SID)
        self.assertEqual(len(result["omitted"]), 1)
        self.assertIn("KEEP WHOLE", result["text"])
        self.assertNotIn("🚀", result["text"])
        self.assertLessEqual(len(result["text"]), 6000)

    def test_missing_state_claims_no_coverage(self):
        self.file.unlink()
        result = self.store.snapshot(SID)
        self.assertEqual(result["blocks"], [])
        self.assertEqual(result["problem"], "FileNotFoundError")
        self.assertIn("no verbatim coverage", result["text"])

    def test_no_snapshot_and_clear_do_not_restore_old_state(self):
        self.assertIn("No saved snapshot", self.store.restore(SID))
        self.store.snapshot(SID)
        self.store.clear(SID)
        self.assertIn("No saved snapshot", self.store.restore(SID))

    def test_session_isolation(self):
        first = self.store.snapshot(SID)
        self.assertIn("No saved snapshot", self.store.restore(OTHER))
        self.assertEqual(self.store.restore(SID), first["text"])

    def test_path_traversal_is_rejected(self):
        for bad in ("../outside.md", self.base / "outside.md"):
            with self.assertRaises(ValueError):
                engine.ContextStore(self.root, self.runtime, bad)
        for bad in ("../outside", "a/b", "", None):
            with self.assertRaises(ValueError):
                self.store.snapshot(bad)

    def test_symlink_state_escape_is_rejected(self):
        target = self.base / "outside.md"
        target.write_text("PRIVATE")
        link = self.root / "escape.md"
        try:
            link.symlink_to(target)
        except OSError:
            self.skipTest("Symlink creation unavailable")
        with self.assertRaises(ValueError):
            self.store.focus(SID, link)

    def test_explicit_focus_only(self):
        other = self.root / "other.md"
        other.write_text("PINNED STATE")
        self.store.focus(SID, "other.md")
        self.assertIn("PINNED STATE", self.store.snapshot(SID)["text"])
        self.assertNotIn("PINNED STATE", self.store.snapshot(OTHER)["text"])

    def test_real_concurrent_snapshots_and_events(self):
        def work(index):
            manifest = self.store.snapshot(SID, f"turn-{index}")
            record = self.store.record("UserPromptSubmit", {"session_id": SID, "prompt": f"concurrent-token-{index}"})
            return manifest, record
        with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
            results = list(pool.map(work, range(16)))
        self.assertEqual(len({m["sequence"] for m, _ in results}), 16)
        self.assertEqual(len(self.store.search(SID, "concurrent-token")), 16)
        self.assertLessEqual(len(self.store.restore(SID)), 9000)

    def test_corrupt_snapshot_never_claims_exact_restore(self):
        manifest = self.store.snapshot(SID)
        path = self.store._session(SID) / "snapshots" / (manifest["id"] + ".json")
        value = json.loads(path.read_text())
        value["blocks"][0]["text"] += "tampered"
        path.write_text(json.dumps(value))
        with self.assertRaises(ValueError):
            self.store.restore(SID)

    def test_failed_commit_does_not_replace_current(self):
        first = self.store.snapshot(SID)
        with mock.patch.object(engine, "write_json", side_effect=OSError("disk full")):
            with self.assertRaises(OSError):
                self.store.snapshot(SID)
        self.assertEqual(self.store.restore(SID), first["text"])

    def test_history_preserves_human_tool_subagent_provenance(self):
        prompts = self.store.record("UserPromptSubmit", {"session_id": SID, "prompt": "Remember α exactly.\nSecond line."})
        tool = self.store.record("PostToolUse", {"session_id": SID, "tool_response": "Remember α exactly."})
        agent = self.store.record("SubagentStop", {"session_id": SID, "last_assistant_message": "Remember α exactly."})
        self.assertEqual(prompts["kind"], "user_prompt")
        self.assertEqual(prompts["authorship"], "unknown")
        self.assertNotEqual(tool["kind"], "user_prompt")
        self.assertNotEqual(agent["kind"], "user_prompt")
        self.assertEqual(self.store.show(SID, prompts["ref"]), prompts)
        self.assertEqual(len(self.store.search(SID, "Remember α")), 3)
        self.assertEqual(self.store.search(OTHER, "Remember α"), [])
        with self.assertRaises(ValueError):
            self.store.show(OTHER, prompts["ref"])

    def test_bad_recall_refs_and_oversized_input(self):
        for bad in ("../control", "event_00000001_bad", ""):
            with self.assertRaises(ValueError):
                self.store.show(SID, bad)
        with self.assertRaises(ValueError):
            self.store.record("UserPromptSubmit", {"session_id": SID, "prompt": "x" * engine.MAX_EVENT_BYTES})
        with self.assertRaises(ValueError):
            self.store.search(SID, " ")

    def test_corrupt_journal_text_rejected(self):
        record = self.store.record("UserPromptSubmit", {"session_id": SID, "prompt": "ORIGINAL"})
        path = self.store._session(SID) / "events" / (record["ref"] + ".json")
        value = json.loads(path.read_text())
        value["text"] = "CORRUPTED"
        path.write_text(json.dumps(value))
        with self.assertRaises(ValueError):
            self.store.show(SID, record["ref"])

    def test_changed_state_never_exceeds_restore_budget(self):
        self.file.write_text("<!-- ctx:restore -->\n" + "A" * 4500 + "\n<!-- /ctx:restore -->")
        snapshot = self.store.snapshot(SID)
        self.file.write_text("<!-- ctx:restore -->\n" + "B" * 9500 + "\n<!-- /ctx:restore -->")
        restored = self.store.restore(SID)
        self.assertTrue(restored.startswith(snapshot["text"]))
        self.assertLessEqual(len(restored), 9000)
        self.assertNotIn("B" * 500, restored)
        self.assertIn("changed on disk", restored)


class HookTests(Sandbox):
    def test_native_lifecycle_and_no_summary_instructions(self):
        self.assertIsNone(self.handle("PreCompact", trigger="manual"))
        self.assertIsNone(self.handle("PostCompact", trigger="manual"))
        result = self.handle("SessionStart", source="compact")["hookSpecificOutput"]
        self.assertEqual(result["hookEventName"], "SessionStart")
        self.assertIn("Run the mechanics check.", result["additionalContext"])
        self.assertNotIn("You may reference", result["additionalContext"])

    def test_explicit_subagent_does_not_write_root_snapshot(self):
        for event in ("PreCompact", "PostCompact", "SessionStart"):
            self.assertIsNone(self.handle(event, agent_id="child", source="compact"))
        self.assertFalse(self.runtime.exists())

    def test_invalid_ids_unknown_events_no_writes(self):
        for payload in ({}, {"session_id": "../escape"}, {"session_id": SID, "turn_id": "bad/path"}):
            self.assertIsNone(hooks.handle("PreCompact", payload, self.root, self.runtime, "task.md"))
        self.assertIsNone(self.handle("PostToolBatch"))
        self.assertFalse(self.runtime.exists())

    def test_transcript_path_is_never_opened(self):
        original = self.file.read_bytes()
        with mock.patch.object(Path, "read_bytes", autospec=True, side_effect=lambda p: (
                original if p == self.file else (_ for _ in ()).throw(AssertionError(str(p))))):
            self.handle("PreCompact", transcript_path=str(self.base / "private.jsonl"))

    def test_startup_habits_and_clear(self):
        start = self.handle("SessionStart", source="startup")
        self.assertIn(SID, start["hookSpecificOutput"]["additionalContext"])
        self.handle("PreCompact")
        self.handle("SessionStart", source="clear")
        self.assertIn("No saved snapshot", self.store.restore(SID))

    def test_fail_open_reports_loss_instead_of_success(self):
        with mock.patch.object(hooks.ContextStore, "snapshot", side_effect=OSError("disk full")):
            result = hooks.run("PreCompact", self.payload, root=self.root, runtime=self.runtime, state_file="task.md")
        self.assertIn("unavailable", result["systemMessage"])
        self.assertNotIn("continue", result)

    def test_optional_record_failure_does_not_prevent_restore(self):
        self.handle("PreCompact")
        with mock.patch.object(hooks.ContextStore, "record", side_effect=OSError("disk full")):
            result = self.handle("SessionStart", source="compact")
        self.assertIn("Run the mechanics check.", result["hookSpecificOutput"]["additionalContext"])

    def test_stop_callbacks_return_valid_json(self):
        self.assertEqual(self.handle("SubagentStop", last_assistant_message="done"), {})
        self.assertEqual(self.handle("Stop", last_assistant_message="done"), {})


class InstallTests(Sandbox):
    def install(self):
        return install.install(self.root, Path(sys.executable), ADAPTER / "ctx.py", "task.md", Path("runtime"))

    def test_install_repeat_doctor_uninstall(self):
        self.install()
        self.assertTrue(install.doctor(self.root)["ok"])
        self.install()
        config = json.loads((self.root / ".codex/hooks.json").read_text())
        self.assertEqual(sum(len(groups) for groups in config["hooks"].values()), 7)
        self.assertTrue(install.uninstall(self.root)["removed"])
        self.assertFalse((self.root / "AGENTS.md").exists())
        self.assertFalse((self.root / ".codex/hooks.json").exists())

    def test_existing_instructions_and_unrelated_hooks_preserved(self):
        original = b"# Project\nKeep my instructions.\n"
        (self.root / "AGENTS.md").write_bytes(original)
        directory = self.root / ".codex"
        directory.mkdir()
        unrelated = {"hooks": [{"type": "command", "command": "other-tool"}]}
        original_hooks = {"description": "mine", "hooks": {"Stop": [unrelated]}}
        (directory / "hooks.json").write_text(json.dumps(original_hooks))
        self.install()
        install.uninstall(self.root)
        self.assertEqual((self.root / "AGENTS.md").read_bytes(), original)
        self.assertEqual(json.loads((directory / "hooks.json").read_text()), original_hooks)

    def test_unowned_config_and_malformed_hooks_refused(self):
        directory = self.root / ".codex"
        directory.mkdir()
        config = directory / "context-system.json"
        config.write_text('{"mine": true}')
        with self.assertRaises(ValueError):
            self.install()
        self.assertEqual(config.read_text(), '{"mine": true}')
        config.unlink()
        (directory / "hooks.json").write_text('{"hooks": []}')
        with self.assertRaises(ValueError):
            self.install()
        self.assertFalse((self.root / "AGENTS.md").exists())

    def test_user_changed_owned_instructions_retained(self):
        self.install()
        path = self.root / "AGENTS.md"
        path.write_text(path.read_text().replace("Keep the active", "My edited active"))
        result = install.uninstall(self.root)
        self.assertFalse(result["removed"])
        self.assertIn("My edited active", path.read_text())
        self.assertTrue((self.root / ".codex/context-system-install.json").exists())

    def test_edits_outside_owned_instructions_survive(self):
        self.install()
        path = self.root / "AGENTS.md"
        path.write_text(path.read_text() + "\nNew user instruction.\n")
        self.assertTrue(install.uninstall(self.root)["removed"])
        self.assertIn("New user instruction.", path.read_text())
        self.assertNotIn(install.BEGIN, path.read_text())

    def test_install_transaction_rolls_back(self):
        (self.root / "AGENTS.md").write_text("ORIGINAL")
        actual_write = install.write_json
        def fail_record(path, value):
            if path.name == "context-system-install.json":
                raise OSError("disk full")
            actual_write(path, value)
        with mock.patch.object(install, "write_json", side_effect=fail_record):
            with self.assertRaises(OSError):
                self.install()
        self.assertEqual((self.root / "AGENTS.md").read_text(), "ORIGINAL")
        self.assertFalse((self.root / ".codex/hooks.json").exists())

    def test_native_trust_not_claimed_and_no_threshold_override(self):
        result = self.install()
        self.assertIn("unknown", result["native_trust"])
        self.assertFalse((self.root / ".codex/config.toml").exists())
        record = json.loads((self.root / ".codex/context-system-install.json").read_text())
        for item in record["owned_hooks"]:
            self.assertFalse(item["group"]["hooks"][0]["async"])
            self.assertIn("-I", item["windows_source"])

    def test_cli_real_subprocess_and_windows_encoded_runner(self):
        self.install()
        record = json.loads((self.root / ".codex/context-system-install.json").read_text())
        handler = record["owned_hooks"][0]["group"]["hooks"][0]
        args = handler["commandWindows"].split(" ") if sys.platform == "win32" else [
            sys.executable, "-I", "-B", str(ADAPTER / "ctx.py"), "--project", str(self.root), "hook", "PreCompact"]
        result = subprocess.run(args, input=json.dumps(self.payload), text=True, capture_output=True, timeout=20)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stdout.strip(), "")
        output = subprocess.run([sys.executable, "-I", "-B", str(ADAPTER / "ctx.py"), "--project", str(self.root),
                                 "hook", "SessionStart"], input=json.dumps(dict(self.payload, source="compact")),
                                text=True, capture_output=True, timeout=20)
        self.assertIn("Run the mechanics check.", json.loads(output.stdout)["hookSpecificOutput"]["additionalContext"])

    def test_literal_spaces_apostrophes_and_dollars_in_project_path(self):
        special = self.base / "project space ' $()"
        special.mkdir()
        (special / "task.md").write_text("LITERAL-PATH-STATE")
        install.install(special, Path(sys.executable), ADAPTER / "ctx.py", "task.md")
        record = json.loads((special / ".codex/context-system-install.json").read_text())
        args = record["owned_hooks"][0]["group"]["hooks"][0]["commandWindows"].split(" ") if sys.platform == "win32" else [
            sys.executable, "-I", "-B", str(ADAPTER / "ctx.py"), "--project", str(special), "hook", "PreCompact"]
        completed = subprocess.run(args, input=json.dumps(self.payload), text=True, capture_output=True, timeout=20)
        self.assertEqual((completed.returncode, completed.stdout.strip()), (0, ""), completed.stderr)
        store = engine.ContextStore(special, special / ".codex/context-runtime", "task.md")
        self.assertIn("LITERAL-PATH-STATE", store.restore(SID))


if __name__ == "__main__":
    unittest.main()
