import copy
import json
import sys
import tempfile
from types import SimpleNamespace
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import eval_retention as retention
import retention_fixture as fixtures


class RetentionControllerTests(unittest.TestCase):
    def test_normal_configuration_removes_inherited_small_threshold(self):
        before = copy.deepcopy(retention.CONFIG)
        config = retention.configuration()
        self.assertFalse(any(k.startswith("model_auto_compact_token_limit") for k in config))
        self.assertNotIn("model_context_window", config)
        self.assertTrue(config["features.shell_tool"])
        self.assertTrue(config["features.unified_exec"])
        self.assertEqual(retention.CONFIG, before)

    def test_resume_usage_replay_is_deduplicated_without_losing_later_requests(self):
        def observed(thread, total, last, capacity=100000):
            return {"thread_id": thread, "turn_id": "turn-" + str(total),
                    "sequence": total, "total": {"inputTokens": total},
                    "last": {"inputTokens": last}, "model_context_window": capacity}

        rows = retention.ordinary_request_inputs([
            observed("thread-a", 10000, 10000),
            observed("thread-a", 30000, 20000),
            observed("thread-a", 30000, 20000),
            observed("thread-a", 65000, 35000),
            observed("thread-b", 30000, 30000),
        ])
        self.assertEqual([r["input_tokens"] for r in rows], [10000, 20000, 35000, 30000])
        self.assertEqual([r["cumulative_input"] for r in rows], [10000, 30000, 65000, 30000])

    def test_capacity_fraction_uses_request_input_instead_of_cumulative_usage(self):
        rows = [{"input_tokens": 75000, "capacity": 100000, "cumulative_input": 900000},
                {"input_tokens": 90000, "capacity": None, "cumulative_input": 990000},
                {"input_tokens": 25000, "capacity": 100000, "cumulative_input": 1015000}]
        self.assertEqual(retention.requested_capacity_fraction(rows), .75)
        self.assertEqual(retention.requested_capacity_fraction([]), 0)
        self.assertEqual(retention.requested_capacity_fraction([
            {"input_tokens": 10, "capacity": 0}]), 0)

    def test_completed_control_requires_observed_execution_and_valid_measurement(self):
        episode = {"run_finished": True, "measurement_valid": True,
                   "task_grade": {"complete_task": True, "execution_observed": True}}
        self.assertTrue(retention.completed_control(episode))
        for field in ("run_finished", "measurement_valid"):
            incomplete = copy.deepcopy(episode)
            incomplete[field] = False
            self.assertFalse(retention.completed_control(incomplete))
        for field in ("complete_task", "execution_observed"):
            incomplete = copy.deepcopy(episode)
            incomplete["task_grade"][field] = False
            self.assertFalse(retention.completed_control(incomplete))
        incomplete = copy.deepcopy(episode)
        del incomplete["task_grade"]["execution_observed"]
        self.assertFalse(retention.completed_control(incomplete))

    def test_preparation_has_disjoint_questions_and_sufficient_declared_allocation(self):
        with tempfile.TemporaryDirectory(prefix="retention-controller-") as directory:
            root = Path(directory)
            manifest = retention.prepare(root / "workspace", root / "manifest.json")
            first, second = map(set, manifest["probe_keys"])
            self.assertFalse(first & second)
            self.assertEqual(first | second, set(fixtures.RETENTION_KEYS))
            self.assertEqual(len(manifest["order"]), 3)
            self.assertEqual(set(manifest["order"]), {"N", "M", "A"})
            limits = manifest["limits"]
            self.assertGreaterEqual(limits["input"], limits["control_input"] + 3 * limits["arm_input"])
            self.assertGreaterEqual(limits["output"], limits["control_output"] + 3 * limits["arm_output"])
            for arm in ("control", "N", "M", "A"):
                self.assertEqual((root / "workspace" / arm / "task.md").read_text(encoding="utf-8"),
                                 fixtures.NOTE_TEMPLATE)

    def test_pressure_and_question_prompts_never_repeat_exact_answer_references(self):
        fixture = fixtures.make_fixture(seed=1729)
        prompt = retention.log_prompt(11729, 30000)
        self.assertEqual(prompt, retention.log_prompt(11729, 30000))
        self.assertNotEqual(prompt, retention.log_prompt(11730, 30000))
        question = fixtures.probe_prompt()
        for key in ("target_environment", "tenant_id", "authoritative_policy_ref",
                    "incident_evidence_ref", "rejected_proposal_ref"):
            value = fixture.expected_retention[key]
            self.assertNotIn(value, prompt)
            self.assertNotIn(value, question)

    def test_executable_check_requires_completed_successful_replay_in_target_thread(self):
        output = json.dumps({"check": "replay", "valid_structure": True,
                             "network_contacted": False, "source_sha256": "a" * 64,
                             "selected_event_ids": ["event-1"]}) + "\n"

        def event(command, code=0, method="item/completed", thread="target", direction="in", stdout=output):
            return {"direction": direction, "sequence": 1,
                    "message": {"method": method, "params": {
                        "threadId": thread, "turnId": "work", "item": {
                            "type": "commandExecution", "command": command,
                            "exitCode": code, "aggregatedOutput": stdout}}}}

        command = "& 'C:/Python/python.exe' 'check.py' replay --output artifacts/replay.json"
        successful = event(command)
        subprocess_command = "python -c \"import subprocess; subprocess.run(['python', 'check.py', 'replay'], check=True)\""
        noise = [event("python check.py validate"), event(command, code=1),
                 event(command, method="item/started"), event(command, thread="other"),
                 event(command, direction="out"), event("Get-Content check.py"),
                 event("Write-Output 'ack'"), event(command, stdout="ack\n"),
                 event(command, stdout=json.dumps({"check": "replay", "valid_structure": True,
                                                   "source_sha256": "too-short"}))]
        client = SimpleNamespace(events=noise + [successful, event(subprocess_command)])
        checks = retention.executable_checks([client], "target")
        self.assertEqual(len(checks), 2)
        self.assertEqual(checks[0]["command"], command)
        self.assertEqual(checks[0]["exit_code"], 0)

    def test_probe_rejects_actual_tool_items_even_without_guard_notifications(self):
        clean = {"hooks": [], "items": [{"item": {"type": "agentMessage", "text": "{}"}},
                                           {"item": {"type": "contextCompaction"}}]}
        self.assertEqual(retention.probe_attempts(clean), [])
        for kind in ("commandExecution", "fileChange", "mcpToolCall", "dynamicToolCall"):
            attempted = copy.deepcopy(clean)
            attempted["items"].append({"item": {"type": kind}})
            self.assertEqual(len(retention.probe_attempts(attempted)), 1)
        clean["hooks"].append({"eventName": "preToolUse"})
        self.assertEqual(len(retention.probe_attempts(clean)), 1)


if __name__ == "__main__":
    unittest.main()
