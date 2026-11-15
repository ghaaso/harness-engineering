import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from analyze_screen import analyze


class ScreenAccountingTests(unittest.TestCase):
    def test_failed_attempt_counts_once_and_is_excluded_from_comparison(self):
        with tempfile.TemporaryDirectory(prefix="screen-audit-test-") as folder:
            root = Path(folder)
            def episode(name, count, valid):
                log = root / (name + ".jsonl")
                usage = {"total": {"inputTokens": count, "outputTokens": 1},
                         "last": {"inputTokens": count, "outputTokens": 1}}
                event = {"direction": "in", "sequence": 1, "message": {"method": "thread/tokenUsage/updated",
                    "params": {"threadId": name, "turnId": "t", "tokenUsage": usage}}}
                duplicate = {**event, "sequence": 2}
                log.write_text(json.dumps(event) + "\n" + json.dumps(duplicate) + "\n", encoding="utf-8")
                return {"arm": "N" if name == "native" else "A", "scenario": "synthetic",
                        "thread_id": name, "event_log": str(log), "phases": [], "measurement_valid": valid}
            report = {"episodes": [episode("native", 100, True), episode("adapter", 20, True)],
                      "excluded_failed_attempts": [episode("failed-adapter", 7, False)],
                      "gates": [], "stopped_by": None}
            path = root / "report.json"
            path.write_text(json.dumps(report), encoding="utf-8")
            result = analyze(path)
            self.assertEqual(result["reported_input_including_failed_attempts"], 127)
            self.assertEqual(result["reported_output_including_failed_attempts"], 3)
            self.assertEqual([e["included_in_primary_comparison"] for e in result["episodes"]], [True, True, False])
            self.assertEqual([e["positive_usage_updates"] for e in result["episodes"]], [1, 1, 1])


if __name__ == "__main__":
    unittest.main()
