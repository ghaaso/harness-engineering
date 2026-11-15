"""Usage audits do not double-count totals or claim missing compaction coverage."""
from pathlib import Path
import sys
import hashlib
import unittest

sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from analyze_pilot import analyze, reconcile, restoration_order


def observation(seq, turn, input_tokens, output_tokens, last_input=10, last_output=2):
    def value(i, o):
        return {"inputTokens": i, "outputTokens": o, "totalTokens": i + o,
                "cachedInputTokens": 0, "cacheWriteInputTokens": 0, "reasoningOutputTokens": 0}
    return {"sequence": seq, "turn_id": turn, "total": value(input_tokens, output_tokens),
            "last": value(last_input, last_output)}


class AuditTests(unittest.TestCase):
    def test_manual_boundary_waits_for_next_turn_and_ignores_usage_bookkeeping(self):
        expected = hashlib.sha256(b"saved state").hexdigest()
        events = [{"sequence": 1, "direction": "in", "message": {"method": "turn/completed",
                   "params": {"threadId": "s", "turn": {"id": "compact"}}}}]
        self.assertIsNone(restoration_order(events, "s", "next", expected)["observable_before_model_output"])
        def item(seq, kind):
            return {"sequence": seq, "direction": "in", "message": {"method": "item/started",
                    "params": {"threadId": "s", "turnId": "next", "item": {"type": kind}}}}
        events += [item(2, "userMessage"), {"sequence": 3, "direction": "in", "message": {
            "method": "thread/tokenUsage/updated", "params": {"threadId": "s", "turnId": "next"}}},
            {"sequence": 4, "direction": "in", "message": {"method": "hook/completed",
              "params": {"threadId": "s", "turnId": "next", "run": {"eventName": "sessionStart",
                 "entries": [{"kind": "context", "text": "saved state"}]}}}}, item(5, "reasoning")]
        self.assertTrue(restoration_order(events, "s", "next", expected)["observable_before_model_output"])

    def test_late_restoration_is_detected(self):
        events = [{"sequence": 1, "direction": "in", "message": {"method": "item/started",
            "params": {"threadId": "s", "turnId": "next", "item": {"type": "agentMessage"}}}},
            {"sequence": 2, "direction": "in", "message": {"method": "hook/completed",
            "params": {"threadId": "s", "turnId": "next", "run": {"eventName": "sessionStart",
               "entries": [{"kind": "context", "text": "saved"}]}}}}]
        self.assertFalse(restoration_order(events, "s", "next", hashlib.sha256(b"saved").hexdigest())[
            "observable_before_model_output"])

    def test_partial_report_preserves_unknown_quality(self):
        result = analyze({"episodes": [{"arm": "adapter", "scenario": "unfinished", "grade": None}]})
        self.assertIsNone(result["episodes"][0]["artifact_score"])
        self.assertFalse(result["measurement_valid"])
        self.assertFalse(result["context_gain_proven"])

    def test_valid_single_arm_audit_is_not_a_paired_comparison(self):
        result = analyze({"measurement_valid": True, "run_finished": True, "episodes": [
            {"arm": "adapter", "scenario": "one", "measurement_valid": True, "grade": {"score": 100},
             "telemetry": {"usage_observations": []}}]})
        self.assertTrue(result["measurement_valid"])
        self.assertFalse(result["paired_comparison_complete"])

    def test_repeated_total_is_counted_once(self):
        result = reconcile([observation(1, "work", 10, 2), observation(2, "work", 10, 2),
                            observation(3, "work2", 20, 4)], set())
        self.assertEqual(result["latest_reported_totals"]["inputTokens"], 20)
        self.assertEqual(result["duplicate_totals"], 1)
        self.assertEqual(result["positive_usage_updates"], 2)

    def test_compaction_notification_without_increment_is_not_coverage(self):
        result = reconcile([observation(1, "work", 10, 2),
                            observation(2, "compact", 10, 2, 3, 0)], {"compact"})
        self.assertEqual(result["compaction_usage"], "unverified")

    def test_positive_compaction_increment_is_observed_but_not_billing_proof(self):
        result = reconcile([observation(1, "work", 10, 2),
                            observation(2, "compact", 25, 5, 15, 3)], {"compact"})
        self.assertEqual(result["compaction_usage"], "positive runtime usage observed")
        self.assertIn("unavailable", result["provider_billing_coverage"])

    def test_regression_and_missing_fields_are_explicit(self):
        self.assertTrue(reconcile([observation(1, "work", 10, 2), observation(2, "compact", 5, 2)],
                                  {"compact"})["regressions"])
        value = observation(1, "work", 10, 2)
        del value["total"]["inputTokens"]
        self.assertTrue(reconcile([value], set())["unknown_core_fields_at"])


if __name__ == "__main__":
    unittest.main()
