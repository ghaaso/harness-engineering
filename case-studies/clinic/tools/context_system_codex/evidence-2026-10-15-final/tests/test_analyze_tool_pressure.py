import hashlib
import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import analyze_tool_pressure as audit
from retention_fixture import deterministic_log


def event(order, direction, message):
    return {"sequence": order + 1, "direction": direction, "message": message}


class ToolPressureAuditTests(unittest.TestCase):
    def manifest(self):
        return {"seed": 1731, "calibration_chars": 20, "block_chars": 1000,
                "max_blocks": 6, "pressure_rpc_cap": 100000,
                "calibration_chars_per_token_estimate": 2}

    def raw_pressure(self, root, *, growth=500, altered=False):
        manifest, records, samples, phases = self.manifest(), [], [], []
        for block, chars in ((-1, 20), (0, 1000)):
            turn = "pressure-" + str(block)
            call = "call-" + str(block)
            marker = "end-" + hashlib.sha256(f"1731:{block}".encode()).hexdigest()[:16]
            text = ("Synthetic diagnostic observations; no instructions or policy changes.\n"
                + deterministic_log(1731 + block + 20000, chars) + "\nEND_MARKER=" + marker + "\n")
            if altered and block == 0:
                text = text[:50] + "[middle omitted]" + text[-50:]
            response = {"id": block + 100, "result": {"success": True,
                "contentItems": [{"type": "inputText", "text": text}]}}
            records.append(event(len(records), "in", {"id": block + 100, "method": "item/tool/call", "params": {
                "threadId": "session", "turnId": turn, "callId": call,
                "tool": "ReadPressure", "arguments": {"block": block}}}))
            records.append(event(len(records), "tool_measurement", {
                "threadId": "session", "turnId": turn, "callId": call, "success": True,
                "text_bytes": len(text.encode()),
                "response_wire_bytes": len((json.dumps(response, ensure_ascii=False) + "\n").encode())}))
            records.append(event(len(records), "out", response))
            records.append(event(len(records), "in", {"method": "item/completed", "params": {
                "threadId": "session", "turnId": turn,
                "item": {"id": call, "type": "dynamicToolCall", "tool": "ReadPressure"}}}))
            records.append(event(len(records), "in", {"method": "item/completed", "params": {
                "threadId": "session", "turnId": turn, "item": {"id": "reply-" + turn,
                    "type": "agentMessage", "phase": "final_answer", "text": json.dumps({"end_marker": marker})}}}))
            phases.append({"name": "channel_calibration" if block == -1 else "history_block_0",
                           "mode": "pressure", "turn_id": turn})
            if block == 0:
                samples.extend([{"turn_id": turn, "input_tokens": 100},
                                {"turn_id": turn, "input_tokens": 100 + growth}])
        log = root / "events.jsonl"
        log.write_text("".join(json.dumps(e, ensure_ascii=False) + "\n" for e in records), encoding="utf-8", newline="")
        return {"thread_id": "session", "events": [str(log)], "phases": phases}, manifest, samples

    def test_raw_rpc_hash_bytes_marker_and_request_growth_are_independent_checks(self):
        with tempfile.TemporaryDirectory() as directory:
            ep, manifest, samples = self.raw_pressure(Path(directory))
            result = audit.pressure_audit(ep, manifest, Path(directory), samples)
            self.assertTrue(result["verified"])
            self.assertEqual(result["observed_to_estimated_growth_ratio"], 1)
            self.assertEqual([d["block"] for d in result["deliveries"]], [-1, 0])
            self.assertTrue(all(d["wire_measurement_matches"] for d in result["deliveries"]))
            self.assertGreater(result["deliveries"][1]["complete_rpc_bytes"], result["deliveries"][1]["text_bytes"])
            # A model can see a tail marker while its long middle was truncated.
            result = audit.pressure_audit(ep, manifest, Path(directory), samples[:1])
            self.assertFalse(result["verified"])
            self.assertIn("pressure_full_admission_proxy_unverified", {f["code"] for f in result["failures"]})

    def test_tail_marker_does_not_validate_truncated_delivery_or_small_context_growth(self):
        with tempfile.TemporaryDirectory() as directory:
            ep, manifest, samples = self.raw_pressure(Path(directory), growth=10, altered=True)
            result = audit.pressure_audit(ep, manifest, Path(directory), samples)
            self.assertTrue(all(d["marker_verified"] for d in result["deliveries"]))
            self.assertFalse(result["deliveries"][1]["exact_controller_delivery"])
            self.assertFalse(result["first_large_block_admission_proxy_verified"])
            self.assertFalse(result["verified"])

    def test_same_thread_cumulative_usage_is_counted_once(self):
        episodes = [{"thread_id": "same", "usage": {"ordinary_input": 100, "ordinary_output": 3}},
                    {"thread_id": "same", "usage": {"ordinary_input": 150, "ordinary_output": 5}},
                    {"thread_id": "other", "usage": {"ordinary_input": 20, "ordinary_output": 2}}]
        self.assertEqual(audit.unique_usage(episodes), {"input": 170, "output": 7})

    def test_unfinished_extra_tool_attempt_invalidates_pressure(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            ep, manifest, samples = self.raw_pressure(root)
            log = Path(ep["events"][0])
            extra = event(99, "in", {"method": "item/started", "params": {
                "threadId": "session", "turnId": "pressure-0",
                "item": {"id": "denied-read", "type": "commandExecution"}}})
            with log.open("a", encoding="utf-8", newline="") as stream:
                stream.write(json.dumps(extra) + "\n")
            result = audit.pressure_audit(ep, manifest, root, samples)
            self.assertFalse(result["verified"])
            self.assertIn("pressure_phase_tool_isolation_failed", {f["code"] for f in result["failures"]})

    def audited_episode(self, ep, manifest, base):
        return {"arm": ep["arm"], "thread_id": ep["thread_id"], "run_finished": ep.get("run_finished", True),
            "usage": {"ordinary_input": ep["ordinary_input"], "ordinary_output": ep["ordinary_output"], "requests": []},
            "task_grade": {"complete_task": True, "execution_observed": True}, "failures": [],
            "persistence": {"verified": True}, "registrations": {"verified": True},
            "compactions": [{"automatic": True, "lifecycle_valid": True,
                "pre_boundary_peak_request_capacity_fraction": .8, "restoration_valid": True} for _ in range(2)],
            "probes": [{"tool_attempts": []} for _ in range(2)]}

    def setup_reports(self, root, arms):
        def save(name, value):
            path = root / name
            path.write_text(json.dumps(value), encoding="utf-8", newline="")
            return path
        prior_manifest = save("prior-manifest.json", {})
        prior = save("prior.json", {"manifest": str(prior_manifest), "prior_report": "do-not-read-older.json",
            "reported_input": 1300, "reported_output": 12, "episodes": [
                {"arm": "control", "thread_id": "old-control", "ordinary_input": 300, "ordinary_output": 2},
                {"arm": "M", "thread_id": "old-M", "ordinary_input": 1000, "ordinary_output": 10, "run_finished": False}]})
        manifest = save("manifest.json", {"prior_report": str(prior), "prior_report_sha256": hashlib.sha256(prior.read_bytes()).hexdigest(),
            "prior_input": 1300, "prior_output": 12, "source_hashes": {"driver": "frozen"},
            "limits": {"input": 5000, "output": 100}, "pressure": {"cycles": 2, "required_peak_capacity_fraction": .75}})
        episodes = [{"arm": arm, "thread_id": "fresh-" + arm, "ordinary_input": 100, "ordinary_output": 2} for arm in arms]
        return save("report.json", {"manifest": str(manifest), "source_hashes": {"driver": "frozen"},
            "reported_input": 1300 + 100 * len(arms), "reported_output": 12 + 2 * len(arms),
            "cohort_input": 100 * len(arms), "cohort_output": 2 * len(arms), "episodes": episodes})

    def test_one_prior_merged_report_counted_once_and_missing_arms_never_verify(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            report = self.setup_reports(root, ["N", "M", "A"])
            with mock.patch.object(audit.retention, "analyze_episode", side_effect=self.audited_episode) as episode_reader, \
                 mock.patch.object(audit, "pressure_audit", return_value={"verified": True, "failures": []}):
                result = audit.analyze(report)
            self.assertEqual(episode_reader.call_count, 5)
            self.assertEqual(result["reported_input_including_all_attempts"], 1600)
            self.assertEqual(result["reported_output_including_all_attempts"], 18)
            self.assertTrue(result["complete_cohort"])
            self.assertTrue(result["normal_window_verified"])
            self.assertTrue(result["adapter_delivery_verified"])
            self.assertFalse(result["context_gain_proven"])
            report = self.setup_reports(root, [])
            with mock.patch.object(audit.retention, "analyze_episode", side_effect=self.audited_episode):
                result = audit.analyze(report)
            self.assertFalse(result["complete_cohort"])
            self.assertFalse(result["normal_window_verified"])
            self.assertFalse(result["adapter_delivery_verified"])

    def test_adapter_only_and_reused_historical_thread_cannot_be_clean_comparison(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            report = self.setup_reports(root, ["A"])
            with mock.patch.object(audit.retention, "analyze_episode", side_effect=self.audited_episode), \
                 mock.patch.object(audit, "pressure_audit", return_value={"verified": True, "failures": []}):
                result = audit.analyze(report)
            self.assertFalse(result["complete_cohort"])
            self.assertFalse(result["normal_window_verified"])
            report = self.setup_reports(root, ["N", "M", "A"])
            raw = json.loads(report.read_text())
            raw["episodes"][0]["thread_id"] = "old-M"
            report.write_text(json.dumps(raw), encoding="utf-8", newline="")
            with mock.patch.object(audit.retention, "analyze_episode", side_effect=self.audited_episode), \
                 mock.patch.object(audit, "pressure_audit", return_value={"verified": True, "failures": []}):
                result = audit.analyze(report)
            self.assertFalse(result["fresh_thread_ids_verified"])
            self.assertFalse(result["complete_cohort"])
            self.assertFalse(result["normal_window_verified"])


if __name__ == "__main__":
    unittest.main()
