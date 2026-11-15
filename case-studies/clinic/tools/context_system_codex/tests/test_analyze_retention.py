import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import analyze_retention as audit
from retention_fixture import make_fixture


def event(order, method, params, *, direction="in", log=0, identifier=None, result=None):
    message = {"method": method, "params": params} if method is not None else {"result": result}
    if identifier is not None:
        message["id"] = identifier
    return {"audit_order": order, "sequence": order + 1, "line_number": order + 1,
            "log_index": log, "log_path": "connection-" + str(log) + ".jsonl",
            "direction": direction, "message": message}


def usage(order, total, request, output=2, log=0):
    return event(order, "thread/tokenUsage/updated", {
        "threadId": "session", "turnId": "turn-" + str(total), "tokenUsage": {
            "total": {"inputTokens": total, "outputTokens": output},
            "last": {"inputTokens": request}, "modelContextWindow": 100000}}, log=log)


class RetentionAuditTests(unittest.TestCase):
    def test_amendments_preserve_all_historical_and_continuation_fields(self):
        resume = {"reason": "usage pause", "prior_failed_turns_preserved": True}
        result = audit.driver_amendments({
            "amendments": ["original protocol amendment"],
            "corrections": ["corrected execution observation"],
            "driver_amendment": "corrected execution observation",
            "continuation_amendment": "same persistent session continued",
            "resume_amendment": resume,
        })
        self.assertEqual(result, ["original protocol amendment", "corrected execution observation",
                                  "same persistent session continued", resume])
        self.assertEqual(audit.driver_amendments({"driver_amendment": "singular"}), ["singular"])
        self.assertEqual(audit.driver_amendments({"amendments": [], "corrections": ["retained"]}), ["retained"])
        self.assertEqual(audit.driver_amendments({}), [])

    def test_restart_totals_are_maxed_not_summed_and_replay_is_deduplicated(self):
        result = audit.usage_audit([usage(0, 10000, 10000), usage(1, 30000, 20000),
                                   usage(2, 30000, 20000, log=1), usage(3, 65000, 35000, log=1)], "session")
        self.assertEqual(result["ordinary_input"], 65000)
        self.assertEqual([r["input_tokens"] for r in result["requests"]], [10000, 20000, 35000])
        self.assertEqual(result["peak_request_capacity_fraction"], .35)
        self.assertFalse(result["failures"])
        reset = audit.usage_audit([usage(0, 30000, 20000), usage(1, 5000, 5000, log=1)], "session")
        self.assertIn("resume_cumulative_usage_reset", {f["code"] for f in reset["failures"]})

    def test_persistence_requires_saved_turns_and_a_new_completed_continuation(self):
        events = [event(0, "thread/start", {"ephemeral": False}, direction="out", identifier=1),
                  event(1, None, {}, identifier=1, result={"thread": {"id": "session", "ephemeral": False}}),
                  event(2, "turn/completed", {"threadId": "session", "turn": {"id": "initial", "status": "completed"}}),
                  event(3, "thread/read", {"threadId": "session", "includeTurns": True}, direction="out", log=1, identifier=1),
                  event(4, None, {}, log=1, identifier=1, result={"thread": {"id": "session", "ephemeral": False, "turns": [{"id": "initial"}]}}),
                  event(5, "thread/resume", {"threadId": "session"}, direction="out", log=1, identifier=2),
                  event(6, None, {}, log=1, identifier=2, result={"thread": {"id": "session", "ephemeral": False}}),
                  event(7, "turn/completed", {"threadId": "session", "turn": {"id": "continued", "status": "completed"}}, log=1)]
        self.assertTrue(audit.persistence_audit(events, "session")["verified"])
        self.assertFalse(audit.persistence_audit(events[:-1], "session")["verified"])
        events[4]["message"]["result"]["thread"]["turns"] = []
        self.assertFalse(audit.persistence_audit(events, "session")["verified"])

    def test_restore_order_hash_and_unicode_envelope_are_checked(self):
        text = "<!-- ctx:restore -->\ncurrent=漢字\n<!-- /ctx:restore -->"
        events = [usage(0, 80000, 80000),
                  event(1, "item/started", {"threadId": "session", "turnId": "compact-turn", "item": {"id": "compact", "type": "contextCompaction"}}),
                  event(2, "item/completed", {"threadId": "session", "turnId": "compact-turn", "item": {"id": "compact", "type": "contextCompaction"}}),
                  event(3, "hook/completed", {"threadId": "session", "turnId": "compact-turn", "run": {"id": "restore", "eventName": "sessionStart", "entries": [{"kind": "context", "text": text}]}}),
                  event(4, "item/started", {"threadId": "session", "turnId": "compact-turn", "item": {"id": "answer", "type": "agentMessage"}})]
        snapshot = {"id": "snapshot-one", "turn_id": "compact-turn", "text_sha": audit.sha(text),
                    "audit_integrity": True, "omitted": [], "problem": None}
        requests = audit.usage_audit(events, "session")["requests"]
        result = audit.compaction_audit(events, "session", requests, [snapshot])[0]
        self.assertTrue(result["automatic"])
        self.assertTrue(result["lifecycle_valid"])
        self.assertTrue(result["restoration_valid"])
        self.assertEqual(result["pre_boundary_peak_request_capacity_fraction"], .8)
        self.assertEqual(result["restored_utf8_bytes"], len(text.encode("utf-8")))
        self.assertGreater(result["reconstructed_envelope_bytes"], result["restored_utf8_bytes"])
        snapshot["text_sha"] = "wrong"
        self.assertFalse(audit.compaction_audit(events, "session", requests, [snapshot])[0]["restoration_valid"])
        events.append(event(5, "thread/compact/start", {"threadId": "session"}, direction="out"))
        self.assertTrue(audit.compaction_audit(events, "session", requests)[0]["automatic"])
        events.insert(1, event(.5, "thread/compact/start", {"threadId": "session"}, direction="out"))
        self.assertFalse(audit.compaction_audit(events, "session", requests)[0]["automatic"])

    def test_probe_counts_tool_items_without_hooks_and_prefers_final_channel(self):
        events = [event(0, "item/completed", {"threadId": "session", "turnId": "probe", "item": {"id": "progress", "type": "agentMessage", "phase": "commentary", "text": "Progress explanation"}}),
                  event(1, "item/completed", {"threadId": "session", "turnId": "probe", "item": {"id": "answer", "type": "agentMessage", "phase": "final_answer", "text": '{"value":true}'}}),
                  event(2, "item/started", {"threadId": "session", "turnId": "probe", "item": {"id": "read", "type": "commandExecution"}}),
                  event(3, "item/completed", {"threadId": "session", "turnId": "probe", "item": {"id": "read", "type": "commandExecution"}})]
        self.assertEqual(audit.final_answer(events, "session", "probe")[1], {"value": True})
        self.assertEqual(len(audit.tool_attempts(events, "session", "probe")), 1)
        self.assertFalse(audit.exact(True, 1))

    def test_subprocess_execution_stdout_is_required_and_readonly_commands_fail(self):
        output = {"check": "replay", "valid_structure": True, "network_contacted": False,
                  "selected_event_ids": ["event-1"], "source_sha256": "a" * 64}
        def command(order, source, stdout, code=0):
            return event(order, "item/completed", {"threadId": "session", "turnId": "work", "item": {
                "type": "commandExecution", "command": source,
                "aggregatedOutput": stdout, "exitCode": code}})
        source = "subprocess.run(['python', 'check.py', 'replay'], check=True)"
        events = [command(0, source, json.dumps(output)),
                  command(1, "Get-Content check.py", json.dumps(output)),
                  command(2, "Write-Output 'ack'", json.dumps(output)),
                  command(3, source, "ack"), command(4, source, json.dumps(output), code=1)]
        checks = audit.execution_proof(events, "session")
        self.assertEqual(len(checks), 1)
        self.assertEqual(checks[0]["invocation"], "subprocess.run")

    def test_incomplete_failed_control_is_retained_and_never_verifies_delivery(self):
        with tempfile.TemporaryDirectory(prefix="retention-audit-") as directory:
            root = Path(directory)
            workspace = root / "workspace"
            make_fixture(workspace / "control", seed=1730)
            log = root / "control.jsonl"
            raw = usage(0, 10000, 10000)
            log.write_text(json.dumps(raw) + "\n", encoding="utf-8", newline="")
            manifest = {"workspace": str(workspace), "seed": 1729, "source_hashes": {},
                        "restore_bytes": 4096, "probe_keys": [[], []],
                        "pressure": {"cycles": 2, "required_peak_capacity_fraction": .75}}
            manifest_path = root / "manifest.json"
            manifest_path.write_text(json.dumps(manifest), encoding="utf-8")
            report = {"manifest": str(manifest_path), "source_hashes": {}, "reported_input": 10000,
                      "reported_output": 2, "stopped_by": "instrumentation failure", "episodes": [{
                          "arm": "control", "thread_id": "session", "run_finished": False,
                          "measurement_valid": True, "ordinary_input": 10000, "ordinary_output": 2,
                          "events": [str(log)], "phases": [], "task_grade": {"execution_observed": False},
                          "error": {"message": "instrumentation failure"}}]}
            report_path = root / "report.json"
            report_path.write_text(json.dumps(report), encoding="utf-8")
            result = audit.analyze(report_path)
            self.assertEqual(result["reported_input_including_finished_and_failed_episodes"], 10000)
            self.assertFalse(result["complete_cohort"])
            self.assertFalse(result["normal_window_verified"])
            self.assertFalse(result["adapter_delivery_verified"])
            self.assertIn("driver_stopped_episode", {f["code"] for f in result["episodes"][0]["failures"]})


if __name__ == "__main__":
    unittest.main()
