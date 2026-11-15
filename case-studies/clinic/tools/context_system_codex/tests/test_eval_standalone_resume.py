import copy
import sys
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import eval_standalone_resume as resume
from retention_fixture import make_fixture


def interrupted_report():
    names = ["channel_calibration", "orientation", "policy_correction", "evidence_and_scope",
             "history_block_0", "neutral_continuation_1", "memory_probe_1", "history_block_1",
             "neutral_continuation_2"]
    phases = [{"name": name, "turn_id": "turn-" + str(index), "status": "completed"}
              for index, name in enumerate(names)]
    phases[-1].update(status="failed", prompt_sha256=resume.base.sha(
        b"Use no tools and leave notes unchanged. Reply only ACK."))
    error = {"code": "server_error", "params": {"threadId": "native-N",
        "turnId": phases[-1]["turn_id"], "error": {"codexErrorInfo": "usageLimitExceeded"}}}
    episode = {"arm": "N", "thread_id": "native-N", "ordinary_input": 566310,
        "ordinary_output": 385, "phases": phases,
        "telemetry": [{"errors": [error], "reroutes": [], "stop_reason": None}],
        "pressure_admission": {"verified": True}, "compactions": [{"item_id": "first"}],
        "pressure_calls": [{"block": -1}, {"block": 0}, {"block": 1}], "probes": [{"cycle": 1}]}
    return {"episodes": [episode], "reported_input": 2559792, "reported_output": 10119}


class StandaloneResumeTests(unittest.TestCase):
    def test_only_exact_saved_failed_neutral_phase_and_error_are_accepted(self):
        manifest = {"prior_input": 1993482, "prior_output": 9734}
        self.assertEqual(resume.validate_saved(interrupted_report(), manifest)["arm"], "N")
        for problem in ("phase_order", "prompt", "failure_status", "extra_error", "wrong_error",
                        "wrong_error_thread", "wrong_error_turn", "reroute", "budget_stop",
                        "extra_pressure", "extra_probe", "extra_compaction", "accounting"):
            with self.subTest(problem=problem):
                report = interrupted_report()
                episode = report["episodes"][0]
                telemetry = episode["telemetry"][0]
                if problem == "phase_order":
                    episode["phases"][0], episode["phases"][1] = episode["phases"][1], episode["phases"][0]
                elif problem == "prompt":
                    episode["phases"][-1]["prompt_sha256"] = "different"
                elif problem == "failure_status":
                    episode["phases"][-1]["status"] = "completed"
                elif problem == "extra_error":
                    telemetry["errors"].append(copy.deepcopy(telemetry["errors"][0]))
                elif problem == "wrong_error":
                    telemetry["errors"][0]["params"]["error"]["codexErrorInfo"] = "serverFailed"
                elif problem == "wrong_error_thread":
                    telemetry["errors"][0]["params"]["threadId"] = "different-thread"
                elif problem == "wrong_error_turn":
                    telemetry["errors"][0]["params"]["turnId"] = "different-turn"
                elif problem == "reroute":
                    telemetry["reroutes"].append({"model": "other-model"})
                elif problem == "budget_stop":
                    telemetry["stop_reason"] = "soft_cap:inputTokens"
                elif problem == "extra_pressure":
                    episode["pressure_calls"].append({"block": 1})
                elif problem == "extra_probe":
                    episode["probes"].append({"cycle": 2})
                elif problem == "extra_compaction":
                    episode["compactions"].append({"item_id": "second"})
                else:
                    report["reported_input"] += 566310
                with self.assertRaises(ValueError):
                    resume.validate_saved(report, manifest)

    def participant(self, ids):
        ep = object.__new__(resume.ResumedN)
        ep.sid = "native-N"
        ep.project = Path("synthetic")
        ep.episode = {}
        ep.manifest = {"saved_turn_ids": ["turn-" + str(i) for i in range(9)],
            "historical_failed_turn_id": "turn-8", "model": "gpt-6-astra", "effort": "ultra"}
        ep.params = lambda: {}
        calls = []

        def request(method, params):
            calls.append(method)
            if method == "thread/read":
                return {"thread": {"id": ep.sid, "ephemeral": False,
                                   "turns": [{"id": tid} for tid in ids]}}
            if method == "thread/resume":
                return {"thread": {"id": ep.sid}, "model": "gpt-6-astra",
                        "reasoningEffort": "ultra", "instructionSources": []}
            if method == "config/read":
                return {"config": {}}
            raise AssertionError("Unexpected client operation: " + method)

        ep.client = SimpleNamespace(request=request)
        return ep, calls

    def test_exact_persisted_history_retains_failed_turn(self):
        ep, calls = self.participant(["turn-" + str(i) for i in range(9)])
        ep.resume_stored()
        self.assertTrue(ep.episode["continuation_persistence"]["verified"])
        self.assertTrue(ep.episode["continuation_persistence"]["failed_turn_retained"])
        self.assertEqual(calls[:2], ["thread/read", "thread/resume"])

    def test_changed_persistent_turns_are_rejected_before_resume(self):
        expected = ["turn-" + str(i) for i in range(9)]
        for ids in (expected + ["unrecorded"], expected[:-1], expected + ["turn-8"], list(reversed(expected))):
            with self.subTest(ids=ids):
                ep, calls = self.participant(ids)
                with self.assertRaisesRegex(ValueError, "history"):
                    ep.resume_stored()
                self.assertEqual(calls, ["thread/read"])

    def test_resumed_settings_or_compaction_threshold_drift_is_rejected(self):
        for problem in ("model", "effort", "instruction_sources", "threshold"):
            with self.subTest(problem=problem):
                ep, _ = self.participant(["turn-" + str(i) for i in range(9)])
                original_request = ep.client.request

                def request(method, params):
                    result = original_request(method, params)
                    if method == "thread/resume":
                        if problem == "model":
                            result["model"] = "other-model"
                        elif problem == "effort":
                            result["reasoningEffort"] = "low"
                        elif problem == "instruction_sources":
                            result["instructionSources"] = ["unexpected"]
                    if method == "config/read" and problem == "threshold":
                        result["config"]["model_auto_compact_token_limit"] = 20000
                    return result

                ep.client = SimpleNamespace(request=request)
                with self.assertRaises(ValueError):
                    ep.resume_stored()

    def test_cumulative_resume_caps_retain_old_usage_exactly_once(self):
        report = interrupted_report()
        prior = report["episodes"][0]
        manifest = {"prior_active_elapsed_seconds": 1055.286,
            "limits": {"input": 5000000, "output": 60000, "active_seconds": 7200,
                       "arm_input": 850000, "arm_output": 15000}}
        allowance = resume.resume_allowance(manifest, report, prior)
        self.assertEqual((allowance["input"], allowance["output"]), (850000, 15000))
        self.assertAlmostEqual(allowance["seconds"], 6144.714)
        report.update(reported_input=4999900, reported_output=59999)
        allowance = resume.resume_allowance(manifest, report, prior)
        self.assertEqual((allowance["input"], allowance["output"]), (566410, 386))
        # The aggregate begins before this N thread, then adds its full new max.
        self.assertEqual(1993482 + 600000, 2559792 + (600000 - 566310))
        for problem in ("input", "output", "time", "arm_input", "arm_output"):
            bad_manifest = copy.deepcopy(manifest)
            bad_report = interrupted_report()
            bad_prior = copy.deepcopy(prior)
            if problem == "time":
                bad_manifest["prior_active_elapsed_seconds"] = 7200
            elif problem.startswith("arm_"):
                bad_prior["ordinary_" + problem[4:]] = bad_manifest["limits"][problem]
            else:
                bad_report["reported_" + problem] = bad_manifest["limits"][problem]
            with self.subTest(problem=problem), self.assertRaisesRegex(ValueError, "exhausted"):
                resume.resume_allowance(bad_manifest, bad_report, bad_prior)

    def test_all_fresh_and_preserved_participant_bytes_must_still_match(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            manifest = {"workspace": str(root), "seed": 1732, "order": ["N", "M", "A"]}
            for arm in manifest["order"]:
                make_fixture(root / arm, seed=1732)
            resume.pristine(manifest)
            for arm, name in (("N", "task.md"), ("M", "task.md"), ("A", "check.py"),
                              ("M", "replay_config.json")):
                path = root / arm / name
                saved = path.read_bytes()
                path.write_bytes(saved + b"unexpected data\n")
                with self.assertRaisesRegex(ValueError, "pristine"):
                    resume.pristine(manifest)
                path.write_bytes(saved)
            artifact = root / "A" / "artifacts" / "replay.json"
            artifact.parent.mkdir()
            artifact.write_bytes(b"{}\n")
            with self.assertRaisesRegex(ValueError, "artifacts"):
                resume.pristine(manifest)


if __name__ == "__main__":
    unittest.main()
