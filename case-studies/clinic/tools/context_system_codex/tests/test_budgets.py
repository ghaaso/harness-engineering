"""Synthetic byte-budget/pagination regressions; no real settings or transcripts."""
from __future__ import annotations

import contextlib
import io
import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

sys.dont_write_bytecode = True
ADAPTER = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ADAPTER))

import budget
import ctx
import engine
import hooks
import state

SID = "budget-session"


class Sandbox(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="codex-byte-test-")
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name) / "project"
        self.root.mkdir()
        self.file = self.root / "task.md"
        self.file.write_text("## Next action\nKeep the complete block.\n", encoding="utf-8")
        self.runtime = self.root / ".data/runtime"
        self.configure()

    def configure(self, **extra):
        folder = self.root / ".codex"
        folder.mkdir(exist_ok=True)
        config = {"version": 1, "state_file": "task.md", "runtime": ".data/runtime"}
        config.update(extra)
        (folder / "context-system.json").write_text(json.dumps(config), encoding="utf-8")

    def store(self, **extra):
        return engine.ContextStore(self.root, self.runtime, "task.md", **extra)

    def cli(self, *args, input=None):
        return subprocess.run([sys.executable, "-I", "-B", str(ADAPTER / "ctx.py"),
                               "--project", str(self.root), *args], input=input, capture_output=True,
                              timeout=15)

    def record(self, text, store=None, session=SID):
        return (store or self.store()).record("UserPromptSubmit", {"session_id": session, "prompt": text})


class ByteTests(Sandbox):
    def test_character_defaults_and_v1_config_remain_compatible(self):
        configured = ctx.settings(self.root)
        self.assertIsNone(configured["snapshot_bytes"])
        self.assertIsNone(configured["restore_bytes"])
        self.assertEqual(configured["recall_bytes"], 2048)
        self.file.write_text("<!-- ctx:restore -->\n" + "😀" * 1000 + "\n<!-- /ctx:restore -->", encoding="utf-8")
        store = self.store()
        manifest = store.snapshot(SID)
        self.assertEqual(store.restore(SID), manifest["text"])
        self.assertLess(len(manifest["text"]), 6000)
        self.assertGreater(manifest["text_bytes"], manifest["text_chars"])

    def test_optional_byte_limits_reject_invalid_types_and_order(self):
        for key in ("snapshot_bytes", "restore_bytes", "recall_bytes"):
            for bad in (False, True, 63, 0, -1, "4096", 4096.0, 1048577):
                with self.subTest(key=key, bad=bad), self.assertRaises(ValueError):
                    self.store(**{key: bad})
        with self.assertRaises(ValueError):
            self.store(snapshot_bytes=4096, restore_bytes=2048)
        self.assertFalse(self.runtime.exists())

    def test_wire_measurement_includes_escaping_envelope_and_newline(self):
        text = '😀 quotation " backslash \\ and\nnewline'
        output = budget.context("SessionStart", text)
        raw = budget.json_line(output).encode("utf-8")
        self.assertEqual(budget.checkpoint_bytes(text), len(raw))
        self.assertGreater(len(raw), len(text.encode("utf-8")))
        self.assertTrue(raw.endswith(b"\n"))
        self.assertNotIn(b"\r\n", raw)
        self.assertEqual(budget.checked_json(output, len(raw)).encode("utf-8"), raw)
        with self.assertRaises(ValueError):
            budget.checked_json(output, len(raw) - 1)

    def test_snapshot_omits_entire_unicode_block_and_keeps_complete_small_block(self):
        huge = "😀" * 700
        self.file.write_text("<!-- ctx:restore -->\n" + huge + "\n<!-- /ctx:restore -->\n"
                             "<!-- ctx:restore -->\nKEEP ALL OF THIS\n<!-- /ctx:restore -->", encoding="utf-8")
        store = self.store(snapshot_bytes=1500, restore_bytes=2000)
        saved = store.snapshot(SID)
        self.assertNotIn("😀", saved["text"])
        self.assertIn("KEEP ALL OF THIS", saved["text"])
        self.assertEqual(len(saved["omitted"]), 1)
        self.assertLessEqual(saved["wire_bytes"], 1500)
        self.assertEqual(saved["wire_bytes"], budget.checkpoint_bytes(saved["text"]))
        self.assertEqual(saved["text_bytes"], len(saved["text"].encode("utf-8")))

    def test_utf8_oversized_whole_file_falls_back_to_complete_declared_headings(self):
        self.file.write_text("## Decisions\n" + "😀" * 800 + "\n## Next action\nKEEP NEXT\n", encoding="utf-8")
        saved = self.store(snapshot_bytes=1500).snapshot(SID)
        self.assertIn("## Next action\nKEEP NEXT", saved["text"])
        self.assertNotIn("😀", saved["text"])
        self.assertEqual(saved["blocks"][0]["mode"], "sections")
        self.assertLessEqual(saved["wire_bytes"], 1500)

    def test_escaped_text_is_admitted_using_serialized_bytes(self):
        body = 'quoted "\\"\n' * 200
        self.file.write_text("<!-- ctx:restore -->\n" + body + "<!-- /ctx:restore -->", encoding="utf-8")
        saved = self.store(snapshot_bytes=1600).snapshot(SID)
        self.assertEqual(saved["blocks"], [])
        self.assertEqual(len(saved["omitted"]), 1)
        self.assertLessEqual(budget.checkpoint_bytes(saved["text"]), 1600)

    def test_changed_disk_appends_only_whole_blocks_that_fit(self):
        self.file.write_text("<!-- ctx:restore -->\nSAVED COMPLETE\n<!-- /ctx:restore -->", encoding="utf-8")
        store = self.store(snapshot_bytes=1500, restore_bytes=2300)
        saved = store.snapshot(SID)
        self.file.write_text("<!-- ctx:restore -->\n" + "🚀" * 500 + "\n<!-- /ctx:restore -->\n"
                             "<!-- ctx:restore -->\nCURRENT COMPLETE\n<!-- /ctx:restore -->", encoding="utf-8")
        restored = store.restore(SID)
        self.assertTrue(restored.startswith(saved["text"]))
        self.assertIn("CURRENT COMPLETE", restored)
        self.assertNotIn("🚀", restored)
        self.assertLessEqual(budget.checkpoint_bytes(restored), 2300)

    def test_existing_snapshot_is_never_truncated_after_budget_reduction(self):
        self.file.write_text("<!-- ctx:restore -->\n" + "😀" * 1000 + "\n<!-- /ctx:restore -->", encoding="utf-8")
        self.store().snapshot(SID)
        with self.assertRaises(ValueError):
            self.store(restore_bytes=1024).restore(SID)
        output = hooks.run("SessionStart", {"session_id": SID, "source": "compact"},
                           root=self.root, runtime=self.runtime, state_file="task.md", restore_bytes=1024)
        self.assertNotIn("hookSpecificOutput", output)
        self.assertIn("unavailable", output["systemMessage"])
        self.assertLessEqual(budget.wire_bytes(output), 1024)

    def test_tiny_budget_returns_complete_bounded_hook_failure(self):
        for event, extra in (("PreCompact", {}), ("SessionStart", {"source": "startup"}),
                             ("SessionStart", {"source": "compact"})):
            output = hooks.run(event, {"session_id": SID, **extra}, root=self.root,
                               runtime=self.runtime, state_file="task.md", snapshot_bytes=64, restore_bytes=64)
            raw = budget.checked_json(output, 64).encode("utf-8")
            self.assertLessEqual(len(raw), 64)
            self.assertIn("systemMessage", json.loads(raw.decode("utf-8", errors="strict")))

    def test_startup_instructions_are_whole_pieces_under_byte_cap(self):
        output = hooks.handle("SessionStart", {"session_id": SID, "source": "startup"},
                              self.root, self.runtime, "task.md", restore_bytes=1100)
        self.assertLessEqual(budget.wire_bytes(output), 1100)
        text = output["hookSpecificOutput"]["additionalContext"]
        for line in text.splitlines():
            if line.startswith(("Select:", "Recall:", "Open a hit:")):
                self.assertTrue(line.endswith(f"--session '{SID}'"))

    def test_actual_hook_and_restore_stdout_are_utf8_and_byte_bounded(self):
        self.configure(snapshot_bytes=2000, restore_bytes=2500)
        self.file.write_text("<!-- ctx:restore -->\nقرار 😀 KEEP\n<!-- /ctx:restore -->", encoding="utf-8")
        payload = {"session_id": SID, "turn_id": "turn-one"}
        self.assertEqual(self.cli("hook", "PreCompact", input=json.dumps(payload).encode()).returncode, 0)
        result = self.cli("hook", "SessionStart", input=json.dumps(dict(payload, source="compact")).encode())
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertLessEqual(len(result.stdout), 2500)
        decoded = result.stdout.decode("utf-8", errors="strict")
        self.assertIn("قرار 😀 KEEP", json.loads(decoded)["hookSpecificOutput"]["additionalContext"])
        self.assertNotIn(b"\\ud83d", result.stdout)
        plain = self.cli("restore", "--session", SID)
        self.assertLessEqual(len(plain.stdout), 2500)
        self.assertIn("قرار 😀 KEEP", plain.stdout.decode("utf-8", errors="strict"))
        self.assertNotIn(b"\r\n", plain.stdout)

    def test_oversized_hook_input_failure_respects_wire_cap(self):
        self.configure(restore_bytes=64)
        result = self.cli("hook", "UserPromptSubmit", input=b"x" * (engine.MAX_EVENT_BYTES + 1))
        self.assertEqual(result.returncode, 0)
        self.assertLessEqual(len(result.stdout), 64)
        self.assertEqual(result.stderr, b"")
        self.assertIn("systemMessage", json.loads(result.stdout.decode("utf-8")))

    @unittest.skipUnless(os.name == "nt", "Windows runner check")
    def test_registered_windows_runner_preserves_utf8_and_exact_wire_limit(self):
        import install
        self.file.write_text("<!-- ctx:restore -->\nقرار 😀 日本語\n<!-- /ctx:restore -->", encoding="utf-8")
        saved = self.store().snapshot(SID)
        expected = budget.context("SessionStart", saved["text"])
        cap = budget.wire_bytes(expected)
        self.configure(restore_bytes=cap)
        group = next(item for item in install._groups(Path(sys.executable), ADAPTER / "ctx.py", self.root)
                     if item["event"] == "SessionStart")
        command = group["group"]["hooks"][0]["commandWindows"]
        encoded = command.split(" -EncodedCommand ", 1)[1]
        powershell = Path(os.environ.get("SystemRoot", "C:/Windows")) / "System32/WindowsPowerShell/v1.0/powershell.exe"
        result = subprocess.run([str(powershell), "-NoProfile", "-NonInteractive", "-EncodedCommand", encoded],
                                input=json.dumps({"session_id": SID, "source": "compact"}).encode("utf-8"),
                                capture_output=True, timeout=15)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertLessEqual(len(result.stdout), cap)
        output = json.loads(result.stdout.decode("utf-8", errors="strict"))
        self.assertEqual(output, expected)
        self.assertEqual(result.stdout, budget.json_line(expected).encode("utf-8"))

    def test_install_cli_forwards_optional_byte_settings(self):
        import install
        with mock.patch.object(install, "install", return_value={"ok": True}) as called:
            with contextlib.redirect_stdout(io.StringIO()):
                code = ctx.main(["--project", str(self.root), "install", "--state-file", "task.md",
                                 "--snapshot-bytes", "4096", "--restore-bytes", "4096", "--recall-bytes", "1024"])
        self.assertEqual(code, 0)
        self.assertEqual(called.call_args.kwargs, {"snapshot_bytes": 4096, "restore_bytes": 4096, "recall_bytes": 1024})


class RecallTests(Sandbox):
    def test_show_pages_reconstruct_exact_unicode_text_without_payload_duplication(self):
        text = ('日本語 😀 "quotes" \\ path\n' * 400) + "EXACT END"
        record = self.record(text)
        store, cursor, fragments, expected_start = self.store(recall_bytes=1024), None, [], 0
        for _ in range(200):
            page = store.show_page(SID, record["ref"], cursor)
            raw = budget.checked_json(page, 1024).encode("utf-8")
            self.assertLessEqual(len(raw), 1024)
            self.assertEqual(json.loads(raw.decode("utf-8", errors="strict")), page)
            self.assertNotIn("payload", page)
            self.assertEqual(page["start"], expected_start)
            self.assertEqual(page["end"], page["start"] + len(page["text"]))
            self.assertEqual(page["page_sha"], state.sha(page["text"]))
            self.assertEqual(page["text_sha"], state.sha(text))
            self.assertEqual(page["page_bytes"], len(page["text"].encode("utf-8")))
            self.assertEqual(page["provenance"]["event"], "UserPromptSubmit")
            self.assertEqual(page["provenance"]["authorship"], "unknown")
            fragments.append(page["text"])
            expected_start, cursor = page["end"], page["next_cursor"]
            if cursor is None:
                break
        else:
            self.fail("Recall pagination did not finish")
        self.assertGreater(len(fragments), 1)
        self.assertEqual("".join(fragments), text)
        self.assertEqual(page["total_chars"], len(text))
        self.assertEqual(page["total_bytes"], len(text.encode("utf-8")))

    def test_show_cursor_is_bound_to_record_session_and_hash(self):
        record = self.record("😀" * 1000)
        other = self.record("OTHER " * 1000)
        store = self.store()
        page = store.show_page(SID, record["ref"])
        cursor = page["next_cursor"]
        self.assertIsNotNone(cursor)
        with self.assertRaises(ValueError):
            store.show_page(SID, other["ref"], cursor)
        for bad in ("", "../outside", "p1.-1.digest", cursor.replace("p1.", "p1.999999", 1), "x" * 1000):
            with self.subTest(cursor=bad), self.assertRaises(ValueError):
                store.show_page(SID, record["ref"], bad)
        with self.assertRaises(ValueError):
            store.show_page("other-session", record["ref"], cursor)

    def test_search_pages_cover_all_hits_without_duplicates(self):
        records = [self.record(f"MATCH item-{index} " + "😀" * 300) for index in range(9)]
        store, cursor, refs = self.store(recall_bytes=1500), None, []
        for _ in range(20):
            page = store.search_page(SID, "MATCH", cursor)
            self.assertLessEqual(budget.wire_bytes(page), 1500)
            self.assertEqual(page["matches"], len(records))
            for hit in page["hits"]:
                self.assertEqual(hit["preview_sha"], state.sha(hit["preview"]))
                self.assertEqual(hit["integrity"], "text_and_payload_verified")
                self.assertNotIn("payload", hit)
                refs.append(hit["ref"])
            cursor = page["next_cursor"]
            if cursor is None:
                break
        else:
            self.fail("Search pagination did not finish")
        self.assertEqual(refs, [record["ref"] for record in records])
        self.assertEqual(len(refs), len(set(refs)))

    def test_search_cursor_rejects_query_changes_and_continues_after_new_records(self):
        first = self.record("MATCH " + "a" * 500)
        second = self.record("MATCH " + "b" * 500)
        store = self.store(recall_bytes=1200)
        page = store.search_page(SID, "MATCH")
        self.assertEqual(page["hits"][0]["ref"], first["ref"])
        self.assertIsNotNone(page["next_cursor"])
        with self.assertRaises(ValueError):
            store.search_page(SID, "DIFFERENT", page["next_cursor"])
        third = self.record("MATCH final")
        refs, cursor = [], page["next_cursor"]
        while cursor:
            next_page = store.search_page(SID, "MATCH", cursor)
            refs.extend(hit["ref"] for hit in next_page["hits"])
            cursor = next_page["next_cursor"]
        self.assertEqual(refs, [second["ref"], third["ref"]])

    def test_tampered_record_is_rejected_before_any_page_is_returned(self):
        record = self.record("ORIGINAL " * 500)
        store = self.store()
        path = store._session(SID) / "events" / (record["ref"] + ".json")
        value = json.loads(path.read_text(encoding="utf-8"))
        value["text"] = "FORGED"
        path.write_text(json.dumps(value), encoding="utf-8")
        with self.assertRaises(ValueError):
            store.show_page(SID, record["ref"])
        with self.assertRaises(ValueError):
            store.search_page(SID, "FORGED")

    def test_cli_recall_defaults_to_bounded_utf8_text_only_json(self):
        record = self.record("العربية 😀 " * 1000)
        result = self.cli("recall", "show", record["ref"], "--session", SID)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stderr, b"")
        self.assertLessEqual(len(result.stdout), 2048)
        page = json.loads(result.stdout.decode("utf-8", errors="strict"))
        self.assertNotIn("payload", page)
        self.assertIsNotNone(page["next_cursor"])
        next_result = self.cli("recall", "show", record["ref"], "--session", SID,
                               "--cursor", page["next_cursor"], "--bytes", "1024")
        self.assertEqual(next_result.returncode, 0, next_result.stderr)
        self.assertLessEqual(len(next_result.stdout), 1024)
        self.assertEqual(json.loads(next_result.stdout)["start"], page["end"])

    def test_requested_page_size_cannot_raise_configured_cap(self):
        record = self.record("a" * 5000)
        page = self.store(recall_bytes=1024).show_page(SID, record["ref"], limit=4096)
        self.assertLessEqual(budget.wire_bytes(page), 1024)
        self.configure(recall_bytes=1024)
        result = self.cli("recall", "show", record["ref"], "--session", SID, "--bytes", "4096")
        self.assertEqual(result.returncode, 0)
        self.assertLessEqual(len(result.stdout), 1024)

    def test_errors_and_small_metadata_failures_are_complete_and_bounded(self):
        self.configure(recall_bytes=64)
        for command in (("show", "../outside"), ("search", "very-long-query" * 1000)):
            result = self.cli("recall", *command, "--session", SID)
            self.assertEqual(result.returncode, 1)
            self.assertEqual(result.stderr, b"")
            self.assertLessEqual(len(result.stdout), 64)
            self.assertFalse(json.loads(result.stdout.decode("utf-8", errors="strict"))["ok"])

    def test_invalid_cli_arguments_have_bounded_structured_error(self):
        result = self.cli("recall", "show", "x" * 10000)
        self.assertEqual(result.returncode, 2)
        self.assertEqual(result.stderr, b"")
        self.assertLessEqual(len(result.stdout), 64)
        self.assertFalse(json.loads(result.stdout)["ok"])

    def test_empty_record_and_no_search_matches_return_complete_pages(self):
        record = self.record("")
        store = self.store()
        page = store.show_page(SID, record["ref"])
        self.assertEqual(page["text"], "")
        self.assertEqual(page["start"], page["end"])
        self.assertIsNone(page["next_cursor"])
        search = store.search_page(SID, "no such text")
        self.assertEqual(search["matches"], 0)
        self.assertEqual(search["hits"], [])
        self.assertIsNone(search["next_cursor"])


if __name__ == "__main__":
    unittest.main()
