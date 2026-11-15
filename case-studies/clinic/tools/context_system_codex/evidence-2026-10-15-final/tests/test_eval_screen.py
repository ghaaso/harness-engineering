import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import eval_screen as screen
import screen_fixtures as fixtures
from engine import ContextStore


class ScreenTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="screen-test-")
        self.root = Path(self.temp.name)
        self.scenario = fixtures.make_scenarios()[0]
        self.tools = fixtures.create(self.root / "fixture", self.scenario)

    def tearDown(self):
        self.temp.cleanup()

    def test_positive_controls_and_blank_failures(self):
        result = screen.offline_controls()
        self.assertTrue(result["valid"])
        self.assertEqual(result["model_calls"], 0)
        self.assertTrue(all(c["positive_score"] == 100 and c["blank_score"] < 95 for c in result["cases"]))

    def test_notes_utf8_cap_preserves_previous_state(self):
        before = self.tools.read_artifact("task.md")
        self.assertFalse(self.tools.dispatch("WriteFixture", {"path": "task.md", "content": "漢" * 1025})["ok"])
        self.assertEqual(before, self.tools.read_artifact("task.md"))

    def test_source_release_and_readonly_updates(self):
        self.assertFalse(self.tools.dispatch("ReadFixture", {"path": "transport_evidence.md"})["ok"])
        self.tools.publish(self.scenario.phases[1])
        self.assertTrue(self.tools.dispatch("ReadFixture", {"path": "transport_evidence.md"})["ok"])
        self.assertTrue(self.tools.dispatch("ReadFixture", {"path": "updates/hypothesis.md"})["ok"])
        self.assertFalse(self.tools.dispatch("WriteFixture", {"path": "updates/hypothesis.md", "content": "overwrite"})["ok"])

    def test_complete_rpc_pages_reconstruct_exact_source(self):
        self.tools.publish(self.scenario.phases[2])
        original = self.tools.read_artifact("ledger_a.csv")
        pieces, offset = [], 0
        while True:
            response = screen.tool_response(self.tools, None, {"id": "s", "recall_bytes": 0},
                {"tool": "ReadFixture", "arguments": {"path": "ledger_a.csv", "offset": offset}})
            wrapped = json.dumps({"id": "x" * 64, "result": response}, ensure_ascii=False) + "\n"
            self.assertLessEqual(len(wrapped.encode()), 2048)
            value = json.loads(response["contentItems"][0]["text"])
            pieces.append(value["text"])
            self.assertEqual(self.tools.calls[-1]["result"], value)
            if value["next_offset"] is None:
                break
            self.assertGreater(value["next_offset"], offset)
            offset = value["next_offset"]
        self.assertEqual("".join(pieces), original)

    def test_bad_consequential_preview_is_not_erased_by_repair(self):
        phase = next(p for p in self.scenario.phases if p.id == "check_draft")
        self.tools.publish(phase)
        self.tools.dispatch("RunFixtureCheck", {"check": "retry_preview"})
        for path, text in fixtures.positive(self.scenario).items():
            self.tools.dispatch("WriteFixture", {"path": path, "content": text})
        result = fixtures.grade(self.scenario, self.tools)
        self.assertIn("consequential_preview_used_withdrawn_target_or_eligibility", result["critical_failures"])

    def test_independent_whole_note_blocks_survive_large_sibling(self):
        path = self.root / "task.md"
        path.write_text("<!-- ctx:restore -->\n## User corrections\nlimit=7\n<!-- /ctx:restore -->\n"
                        "<!-- ctx:restore -->\n## Current state\n" + "x" * 4000 + "\n<!-- /ctx:restore -->\n", encoding="utf-8")
        store = ContextStore(self.root, self.root / "runtime", path, snapshot_bytes=2048, restore_bytes=2048)
        snap = store.snapshot("session")
        self.assertIn("limit=7", snap["text"])
        self.assertEqual(len(snap["blocks"]), 1)
        self.assertEqual(len(snap["omitted"]), 1)

    def test_screen_gates(self):
        def ep(arm, score, input_tokens):
            return {"arm": arm, "measurement_valid": True, "grade": {"score": score, "critical_failures": []},
                    "usage": {"observed_max": {"inputTokens": input_tokens}}, "compactions": [{}, {}]}
        controls = [ep("N", 100, 10000), ep("M", 100, 10000)]
        self.assertTrue(screen.screen_gate(controls + [ep("A", 100, 8000)])["expand"])
        self.assertFalse(screen.screen_gate(controls + [ep("A", 100, 10001)])["expand"])
        quality = [ep("N", 94, 10000), ep("M", 94, 8000), ep("A", 100, 8800)]
        self.assertTrue(screen.screen_gate(quality)["quality_signal"])
        quality[-1]["usage"]["observed_max"]["inputTokens"] = 10000
        self.assertFalse(screen.screen_gate(quality)["expand"])
        quality[-1]["compactions"] = []
        self.assertEqual(screen.screen_gate(quality)["verdict"], "inconclusive_pressure")

    def test_empty_recall_and_error_responses_are_bounded(self):
        response = screen.tool_response(self.tools, None, {"id": "s", "recall_bytes": 8192},
                                        {"tool": "RecallSearch", "arguments": {"query": "term"}})
        self.assertEqual(response, {"contentItems": [], "success": False})
        response = screen.tool_response(self.tools, None, {"id": "s", "recall_bytes": 0},
                                        {"tool": "ReadFixture", "arguments": {"path": "../secret"}})
        self.assertFalse(response["success"])

    def test_auto_restore_order_lifecycle_and_cross_turn_delivery(self):
        path = self.root / "task.md"
        path.write_text(fixtures.NOTE_TEMPLATE, encoding="utf-8")
        store = ContextStore(self.root, self.root / "runtime", path, snapshot_bytes=4096, restore_bytes=4096)
        snap = store.snapshot("session", "turn")
        class Fake:
            events = []
        fake = Fake()
        def event(seq, method, **params):
            return {"sequence": seq, "direction": "in", "message": {"method": method,
                    "params": {"threadId": "session", "turnId": "turn", **params}}}
        compact = {"type": "contextCompaction", "id": "compact"}
        fake.events = [event(1, "item/started", item=compact), event(2, "item/completed", item=compact),
            event(3, "hook/completed", turnId="next-turn", run={"eventName": "sessionStart", "status": "completed",
                  "entries": [{"kind": "context", "text": snap["text"]}]}),
            event(4, "item/started", item={"type": "reasoning", "id": "reason"})]
        self.assertTrue(screen.automatic_boundaries(fake, "session", store)[0]["restoration_valid"])
        fake.events[2]["sequence"] = 5
        self.assertFalse(screen.automatic_boundaries(fake, "session", store)[0]["restoration_valid"])
        fake.events = fake.events[1:]
        self.assertFalse(screen.automatic_boundaries(fake, "session", store)[0]["lifecycle_valid"])

    def test_duplicate_usage_does_not_create_extra_requests(self):
        def obs(total, last):
            return {"thread_id": "s", "total": {"inputTokens": total, "outputTokens": 0},
                    "last": {"inputTokens": last}}
        self.assertEqual(screen.request_inputs([obs(100, 100), obs(100, 100), obs(250, 150)], "s"), [100, 150])

    def test_cap_failure_is_observable_outcome_without_hiding_errors(self):
        e = {"usage": {"observed_max": {"inputTokens": 450005, "outputTokens": 5000}},
             "telemetry": {"stop_reason": "soft_cap:inputTokens", "errors": [], "reroutes": [],
                           "per_turn_usage_coverage": [{"status": "interrupted", "usage_observed": True}]}}
        self.assertTrue(screen.capped_outcome(e))
        e["telemetry"]["errors"] = [{"code": "missing_usage_fields"}]
        self.assertFalse(screen.capped_outcome(e))
        e["telemetry"]["errors"] = []
        e["telemetry"]["per_turn_usage_coverage"] = [{"status": "failed", "usage_observed": True}]
        self.assertFalse(screen.capped_outcome(e))

    def test_idle_sleep_request_is_cleared_after_failure(self):
        calls = []
        def setter(flags):
            calls.append(flags)
            return 1
        with self.assertRaises(RuntimeError):
            with screen.stay_awake(setter):
                raise RuntimeError("synthetic interruption")
        self.assertEqual(calls, [0x80000001, 0x80000000])

    def test_idle_sleep_failure_prevents_dispatch(self):
        with self.assertRaises(OSError):
            with screen.stay_awake(lambda flags: 0):
                self.fail("Work must not start after a failed idle-sleep request")

    def test_all_unfinished_does_not_imply_adapter_memory_failure(self):
        episodes = [{"arm": arm, "measurement_valid": True, "compactions": [{}, {}],
                     "grade": {"score": 75, "complete_task": False, "critical_failures": []}}
                    for arm in ("N", "M", "A")]
        gate = screen.screen_gate(episodes)
        self.assertFalse(gate["expand"])
        self.assertEqual(gate["verdict"], "inconclusive_all_arms_unfinished")


if __name__ == "__main__":
    unittest.main()
