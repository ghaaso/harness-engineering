"""Offline checks of pilot isolation, evidence accounting and anti-prefill gates."""
from pathlib import Path
import sys
import tempfile
import unittest
from types import SimpleNamespace

sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from eval_fixtures import create_fixture, scenarios
from eval_pilot import fresh_checkpoint, hook_measurements, offline_controls, per_turn_usage, prepare, pristine, tool_response
from engine import ContextStore


class PilotTests(unittest.TestCase):
    def test_pristine_gate_detects_state_and_artifact_prefill(self):
        with tempfile.TemporaryDirectory() as directory:
            tools = create_fixture(Path(directory) / "fixture", scenarios()[0])
            self.assertTrue(pristine(tools))
            original = (tools.root / "task.md").read_text()
            (tools.root / "task.md").write_text(original + "Correct answer supplied externally")
            self.assertFalse(pristine(tools))
            (tools.root / "task.md").write_text(original)
            tools.dispatch("WriteFixture", {"path": "artifacts/expiry_preview.json", "content": "{}"})
            self.assertFalse(pristine(tools))

    def test_prepare_uses_independent_blank_cases_and_no_model(self):
        with tempfile.TemporaryDirectory() as directory:
            base = Path(directory)
            manifest = prepare(base / "workspace", base / "manifest.json")
            self.assertEqual(manifest["offline_controls"]["model_calls"], 0)
            self.assertEqual([case["arm"] for case in manifest["cases"]],
                             ["native", "adapter", "adapter", "native"])
            for arm in ("native", "adapter"):
                for scenario in scenarios():
                    from eval_fixtures import FixtureTools
                    self.assertTrue(pristine(FixtureTools(base / "workspace" / arm / scenario.id, scenario)))
            with self.assertRaises(ValueError):
                prepare(base / "workspace", base / "another-manifest.json")

    def test_each_turn_needs_its_own_usage(self):
        def event(thread, turn):
            return {"direction": "in", "message": {"method": "thread/tokenUsage/updated",
                                                     "params": {"threadId": thread, "turnId": turn}}}
        client = SimpleNamespace(events=[event("a", "first"), event("other", "second")])
        self.assertEqual(len(per_turn_usage(client, "a", "first")), 1)
        self.assertEqual(per_turn_usage(client, "a", "second"), [])

    def test_hook_metrics_separate_decoded_and_reconstructed_wire(self):
        client = SimpleNamespace(events=[{"sequence": 12, "direction": "in", "message": {
            "method": "hook/completed", "params": {"threadId": "s", "turnId": None,
                "run": {"eventName": "sessionStart", "status": "completed",
                        "entries": [{"kind": "context", "text": "اردو 😀\n"}]}}}}])
        metrics = hook_measurements(client, "s")[0]
        self.assertGreater(metrics["text_bytes"], metrics["text_characters"])
        self.assertGreater(metrics["canonical_adapter_envelope_bytes"], metrics["text_bytes"])
        self.assertEqual(metrics["sequence"], 12)

    def test_offline_controls_require_positive_artifacts(self):
        result = offline_controls()
        self.assertTrue(result["ok"])
        self.assertTrue(all(case["pristine_fails"] and case["positive_control_passes"]
                            for case in result["cases"]))

    def test_old_checkpoint_cannot_validate_a_new_boundary(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "task.md").write_text("## Next action\nSynthetic work.\n")
            store = ContextStore(root, root / "runtime", "task.md")
            previous = store.snapshot("session", "old-turn")["id"]
            with self.assertRaisesRegex(RuntimeError, "fresh checkpoint"):
                fresh_checkpoint(store, "session", previous, "new-turn")
            store.complete("session", "old-turn")
            new = store.snapshot("session", "new-turn")
            self.assertEqual(fresh_checkpoint(store, "session", previous, "new-turn")["id"], new["id"])
            with self.assertRaisesRegex(RuntimeError, "different compaction turn"):
                fresh_checkpoint(store, "session", previous, "wrong-turn")

    def test_malformed_tool_arguments_return_bounded_failures(self):
        with tempfile.TemporaryDirectory() as directory:
            tools = create_fixture(Path(directory), scenarios()[0])
            for arguments in ("{", "[]", None, 123, []):
                result = tool_response(tools, None, {"id": "s", "recall_bytes": 0},
                                       {"tool": "ReadFixture", "arguments": arguments})
                self.assertFalse(result["success"])
                self.assertLessEqual(len(result["contentItems"][0]["text"].encode()), 2048)

    def test_even_repeated_bad_recall_cannot_exceed_cumulative_budget(self):
        with tempfile.TemporaryDirectory() as directory:
            tools = create_fixture(Path(directory), scenarios()[0])
            session = {"id": "s", "recall_bytes": 0}
            for _ in range(400):
                result = tool_response(tools, None, session, {"tool": "RecallSearch", "arguments": "["})
                self.assertFalse(result["success"])
                self.assertLessEqual(session["recall_bytes"], 8192)
            self.assertEqual(result["contentItems"], [])


if __name__ == "__main__":
    unittest.main()
