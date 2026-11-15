import hashlib
import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import analyze_standalone_pressure as audit


class StandaloneAuditTests(unittest.TestCase):
    def make_pressure(self, root, growth=500):
        manifest = {"seed": 1732, "calibration_chars": 20, "block_chars": 1000,
            "calibration_chars_per_token_estimate": 2, "pressure_rpc_cap": 100000,
            "post_compaction_input_cap": 32000, "admission_growth_ratio_bounds": [.8, 1.2],
            "notes_bytes": 3072,
            "pressure": {"cycles": 2, "required_peak_capacity_fraction": .75}}
        events, phases, claims, samples, boundaries, probes = [], [], [], [], [], []
        def add(direction, message):
            events.append({"direction": direction, "sequence": len(events) + 1, "message": message})
            return len(events) - 1
        def start(turn, params):
            message = {"id": turn, "method": "turn/start", "params": {"threadId": "session", **params}}
            order = add("out", message)
            add("in", {"id": turn, "result": {"turn": {"id": turn}}})
            return message, order
        def final(turn, text):
            add("in", {"method": "item/completed", "params": {"threadId": "session", "turnId": turn,
                "item": {"id": "answer-" + turn, "type": "agentMessage", "phase": "final_answer", "text": text}}})
            add("in", {"method": "turn/completed", "params": {"threadId": "session", "turn": {"id": turn, "status": "completed"}}})
        for block in (-1, 0, 1):
            turn = "output-" + str(block)
            chars = 20 if block == -1 else 1000
            text, marker = audit.expected_payload(chars, 1732 + 30000 + block)
            message, order = start(turn, {"input": [], "toolOutput": {
                "name": "controller_synthetic_diagnostic", "namespace": None, "output": text}, "effort": "ultra"})
            add("in", {"method": "item/completed", "params": {"threadId": "session", "turnId": turn,
                "item": {"id": "output-item-" + turn, "type": "functionCallOutput",
                    "name": "controller_synthetic_diagnostic", "namespace": None, "output": text}}})
            samples.append({"turn_id": turn, "audit_order": len(events), "input_tokens": 100 if block == -1 else 100 + growth})
            final(turn, json.dumps({"end_marker": marker}))
            phases.append({"name": "channel_calibration" if block == -1 else "history_block_" + str(block),
                           "mode": "pressure", "turn_id": turn, "task_note_bytes": 200})
            claims.append({"block": block, "turn_id": turn, "text_bytes": len(text.encode()),
                "text_sha256": hashlib.sha256(text.encode()).hexdigest(),
                "notes_unchanged": True,
                "complete_rpc_bytes": len((json.dumps(message, ensure_ascii=False) + "\n").encode())})
            if block == -1:
                continue
            cycle = block + 1
            neutral = "neutral-" + str(cycle)
            start(neutral, {"input": [{"type": "text", "text": "Use no tools and leave notes unchanged. Reply only ACK."}]})
            add("in", {"method": "item/started", "params": {"threadId": "session", "turnId": neutral,
                "item": {"id": "compact-" + neutral, "type": "contextCompaction"}}})
            order = add("in", {"method": "item/completed", "params": {"threadId": "session", "turnId": neutral,
                "item": {"id": "compact-" + neutral, "type": "contextCompaction"}}})
            boundaries.append({"turn_id": neutral, "audit_order": order})
            samples.append({"turn_id": neutral, "audit_order": len(events), "input_tokens": 100})
            final(neutral, "ACK")
            phases.append({"name": "neutral_continuation_" + str(cycle), "mode": "probe", "turn_id": neutral, "task_note_bytes": 200})
            probe = "probe-" + str(cycle)
            start(probe, {"input": [{"type": "text", "text": "Recall earlier decisions; no tools."}]})
            samples.append({"turn_id": probe, "audit_order": len(events), "input_tokens": 100})
            final(probe, "{}")
            probes.append({"cycle": cycle, "turn_id": probe})
        log = root / "raw.jsonl"
        log.write_text("".join(json.dumps(e) + "\n" for e in events), encoding="utf-8", newline="")
        ep = {"thread_id": "session", "events": [str(log)], "phases": phases, "pressure_calls": claims}
        observed = {"usage": {"requests": samples}, "compactions": boundaries, "probes": probes, "native_replay_checks": []}
        return ep, manifest, observed

    def test_exact_standalone_delivery_and_bounded_normal_continuations_pass(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            ep, manifest, observed = self.make_pressure(root)
            result = audit.pressure_audit(ep, manifest, root, observed)
            self.assertTrue(result["verified"], result["failures"])
            self.assertEqual([r["block"] for r in result["outputs"]], [-1, 0, 1])
            self.assertEqual(result["outputs"][1]["growth_ratio"], 1)
            self.assertTrue(all(r["exact_delivery"] and r["no_user_input"] for r in result["outputs"]))
            self.assertTrue(all(r["verified"] for r in result["continuations"]))

    def test_footer_and_full_notification_cannot_hide_small_admission_growth(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            ep, manifest, observed = self.make_pressure(root, growth=10)
            result = audit.pressure_audit(ep, manifest, root, observed)
            self.assertTrue(result["outputs"][1]["exact_delivery"])
            self.assertFalse(result["verified"])
            self.assertIn("first_large_pressure_admission_unverified", {f["code"] for f in result["failures"]})

    def test_changed_note_claim_invalidates_the_isolated_pressure_phase(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            ep, manifest, observed = self.make_pressure(root)
            ep["pressure_calls"][1]["notes_unchanged"] = False
            result = audit.pressure_audit(ep, manifest, root, observed)
            self.assertFalse(result["outputs"][1]["reported_note_stability_verified"])
            self.assertFalse(result["verified"])

    def test_large_user_input_and_premature_compaction_are_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            ep, manifest, observed = self.make_pressure(root)
            log = Path(ep["events"][0])
            events = [json.loads(line) for line in log.read_text().splitlines()]
            for e in events:
                if e["message"].get("method") == "turn/start" and e["message"].get("id") == "neutral-1":
                    e["message"]["params"]["input"][0]["text"] = "x" * 5000
            log.write_text("".join(json.dumps(e) + "\n" for e in events), encoding="utf-8", newline="")
            result = audit.pressure_audit(ep, manifest, root, observed)
            self.assertFalse(result["verified"])
            self.assertIn("large_user_message_after_pressure", {f["code"] for f in result["failures"]})
            # A boundary inside the oversized input turn is not the declared next-ACK compaction.
            first = result["outputs"][1]
            observed["compactions"][0] = {"turn_id": first["turn_id"], "audit_order": first["request"]["audit_order"] + 2}
            result = audit.pressure_audit(ep, manifest, root, observed)
            self.assertIn("first_large_pressure_admission_unverified", {f["code"] for f in result["failures"]})

    def test_late_probe_or_unbounded_continuation_cannot_verify_low_context(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            ep, manifest, observed = self.make_pressure(root)
            next(r for r in observed["usage"]["requests"] if r["turn_id"] == "neutral-1")["input_tokens"] = 40000
            result = audit.pressure_audit(ep, manifest, root, observed)
            self.assertFalse(result["continuations"][0]["verified"])
            self.assertFalse(result["verified"])
            next(r for r in observed["usage"]["requests"] if r["turn_id"] == "neutral-1")["input_tokens"] = 100
            next(r for r in observed["usage"]["requests"] if r["turn_id"] == "probe-1")["input_tokens"] = 40000
            result = audit.pressure_audit(ep, manifest, root, observed)
            self.assertFalse(result["continuations"][0]["verified"])
            self.assertFalse(result["verified"])

    def setup_reports(self, root, arms):
        def save(name, value):
            p = root / name
            p.write_text(json.dumps(value), encoding="utf-8", newline="")
            return p
        prior = save("prior.json", {"reported_input": 1900, "reported_output": 15})
        channel = save("channel.json", {"ordinary_input": 80, "ordinary_output": 1})
        manifest = save("manifest.json", {"prior_report": str(prior), "channel_report": str(channel),
            "prior_report_sha256": hashlib.sha256(prior.read_bytes()).hexdigest(),
            "channel_report_sha256": hashlib.sha256(channel.read_bytes()).hexdigest(),
            "prior_input": 1980, "prior_output": 16, "source_hashes": {"driver": "frozen"},
            "limits": {"input": 5000, "output": 100}, "pressure": {"cycles": 2, "required_peak_capacity_fraction": .75}})
        episodes = [{"arm": a, "thread_id": "fresh-" + a, "ordinary_input": 100, "ordinary_output": 2} for a in arms]
        return save("report.json", {"manifest": str(manifest), "source_hashes": {"driver": "frozen"},
            "reported_input": 1980 + 100 * len(arms), "reported_output": 16 + 2 * len(arms),
            "cohort_input": 100 * len(arms), "cohort_output": 2 * len(arms), "episodes": episodes})

    def audited_episode(self, ep, manifest, base):
        return {"arm": ep["arm"], "thread_id": ep["thread_id"], "run_finished": True,
            "usage": {"ordinary_input": ep["ordinary_input"], "ordinary_output": ep["ordinary_output"], "requests": []},
            "failures": [], "persistence": {"verified": True}, "registrations": {"verified": True},
            "compactions": [{"automatic": True, "lifecycle_valid": True, "restoration_valid": True,
                "pre_boundary_peak_request_capacity_fraction": .8} for _ in range(2)],
            "probes": [{"tool_attempts": []} for _ in range(2)]}

    def mocked_analysis(self, report):
        prior = {"reported_input_including_all_attempts": 1900, "reported_output_including_all_attempts": 15,
            "failures": [], "completed_control_verified": True, "episodes": [{"thread_id": "old-N"}],
            "prior_episodes": [{"thread_id": "old-M"}, {"thread_id": "control"}]}
        channel = {"thread_id": "channel", "verified": True, "usage": {"ordinary_input": 80, "ordinary_output": 1}}
        with mock.patch.object(audit.previous, "analyze", return_value=prior) as reader, \
             mock.patch.object(audit, "channel_audit", return_value=channel) as channel_reader, \
             mock.patch.object(audit.retention, "analyze_episode", side_effect=self.audited_episode), \
             mock.patch.object(audit, "pressure_audit", return_value={"verified": True, "failures": []}):
            result = audit.analyze(report)
        self.assertEqual(reader.call_count, 1)
        self.assertEqual(channel_reader.call_count, 1)
        return result

    def test_prior_aggregate_and_diagnostic_count_once_with_no_vacuous_empty_success(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            result = self.mocked_analysis(self.setup_reports(root, ["N", "M", "A"]))
            self.assertEqual(result["reported_input_including_all_attempts"], 2280)
            self.assertEqual(result["reported_output_including_all_attempts"], 22)
            self.assertTrue(result["normal_window_verified"])
            self.assertTrue(result["adapter_delivery_verified"])
            self.assertFalse(result["context_gain_proven"])
            result = self.mocked_analysis(self.setup_reports(root, []))
            self.assertFalse(result["complete_cohort"])
            self.assertFalse(result["normal_window_verified"])
            self.assertFalse(result["adapter_delivery_verified"])

    def test_reused_diagnostic_thread_is_not_a_fresh_cohort(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            report = self.setup_reports(root, ["N", "M", "A"])
            value = json.loads(report.read_text())
            value["episodes"][0]["thread_id"] = "channel"
            report.write_text(json.dumps(value), encoding="utf-8", newline="")
            result = self.mocked_analysis(report)
            self.assertFalse(result["fresh_thread_ids_verified"])
            self.assertFalse(result["normal_window_verified"])


if __name__ == "__main__":
    unittest.main()
