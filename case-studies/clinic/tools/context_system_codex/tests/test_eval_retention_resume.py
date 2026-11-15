import copy
import json
import sys
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import eval_retention as original
import eval_retention_resume as resume
from retention_fixture import make_fixture, history_phases


def interrupted():
    fixture = make_fixture(seed=1729)
    phases = history_phases(fixture, log_chars=0)
    error = {"code": "server_error", "params": {"threadId": "same-thread", "turnId": "failed",
             "error": {"codexErrorInfo": "usageLimitExceeded"}}}
    return {"arm": "M", "thread_id": "same-thread", "ordinary_input": 84313, "ordinary_output": 1654,
        "measurement_valid": False, "phases": [
            {"name": phases[0].id, "prompt_sha256": resume.prompt_digest(phases[0].prompt),
             "turn_id": "completed", "status": "completed"},
            {"name": phases[1].id, "prompt_sha256": resume.prompt_digest(phases[1].prompt),
             "turn_id": "failed", "status": "failed"}],
        "telemetry": [{"errors": [error], "reroutes": [], "stop_reason": None,
            "per_turn_usage_coverage": [{"thread_id": "same-thread", "turn_id": "completed", "usage_observed": True},
                                        {"thread_id": "same-thread", "turn_id": "failed", "usage_observed": False}]}]}


def completed_resume():
    episode = copy.deepcopy(interrupted())
    episode["phases"].append({"name": "policy_correction", "turn_id": "retry", "status": "completed",
                               "retry_of_turn_id": "failed"})
    telemetry = [{"errors": [], "reroutes": [], "stop_reason": None,
        "per_turn_usage_coverage": [{"thread_id": "same-thread", "turn_id": "retry", "usage_observed": True}]}]
    return episode, telemetry


class RetentionResumeTests(unittest.TestCase):
    def manifest(self):
        return {"prior_elapsed_seconds": 524.552, "limits": {"input": 5000000, "output": 60000,
                "arm_input": 1600000, "arm_output": 18000, "seconds": 7200}}

    def test_resume_caps_use_cumulative_threshold_and_count_prior_once(self):
        allowance = resume.allowance_for(self.manifest(), {"input": 150604, "output": 2688}, 0, interrupted())
        self.assertEqual(allowance["input"], 1600000)
        self.assertEqual(allowance["output"], 18000)
        self.assertAlmostEqual(allowance["seconds"], 6675.448)
        allowance = resume.allowance_for(self.manifest(), {"input": 4999000, "output": 59900}, 10, interrupted())
        self.assertEqual(allowance["input"], 85313)
        self.assertEqual(allowance["output"], 1754)
        self.assertAlmostEqual(allowance["seconds"], 6665.448)
        # Report is prior cumulative total plus new maximum minus original M.
        self.assertEqual(150604 + 100000 - 84313, 66291 + 100000)

    def test_new_arm_caps_are_global_remaining_and_exhaustion_fails(self):
        allowance = resume.allowance_for(self.manifest(), {"input": 4999000, "output": 59900}, 0)
        self.assertEqual((allowance["input"], allowance["output"]), (1000, 100))
        for consumed, elapsed in [({"input": 5000000, "output": 1}, 0),
                                  ({"input": 1, "output": 60000}, 0),
                                  ({"input": 1, "output": 1}, 6675.448)]:
            with self.assertRaisesRegex(ValueError, "exhausted"):
                resume.allowance_for(self.manifest(), consumed, elapsed)

    def test_retry_exact_original_prompt_skips_completed_orientation(self):
        old = interrupted()
        pending = resume.remaining_history(old, make_fixture(seed=1729))
        self.assertEqual([p.id for p in pending], ["policy_correction", "evidence_and_scope"])
        self.assertEqual(resume.prompt_digest(pending[0].prompt), old["phases"][-1]["prompt_sha256"])
        old["phases"][-1]["prompt_sha256"] = "changed"
        with self.assertRaisesRegex(ValueError, "prompt differs"):
            resume.remaining_history(old, make_fixture(seed=1729))

    def test_only_known_historical_rate_limit_is_accepted(self):
        self.assertTrue(resume.accepted_interruption(interrupted()))
        for change in ("different_error", "extra_error", "reroute", "wrong_turn"):
            old = interrupted()
            tele = old["telemetry"][0]
            if change == "different_error":
                tele["errors"][0]["params"]["error"]["codexErrorInfo"] = "serverFailed"
            elif change == "extra_error":
                tele["errors"].append(copy.deepcopy(tele["errors"][0]))
            elif change == "reroute":
                tele["reroutes"].append({"model": "different"})
            else:
                tele["errors"][0]["params"]["turnId"] = "unrelated"
            self.assertFalse(resume.accepted_interruption(old))

    def test_successful_resume_keeps_failed_history_without_error_dilution(self):
        episode, telemetry = completed_resume()
        original_episode = copy.deepcopy(episode)
        self.assertTrue(resume.continuation_valid(episode, interrupted(), telemetry))
        self.assertEqual(episode, original_episode)
        self.assertEqual(episode["phases"][1]["status"], "failed")
        telemetry[0]["errors"].append({"code": "server_error"})
        self.assertFalse(resume.continuation_valid(episode, interrupted(), telemetry))

    def test_successful_phase_usage_and_exactly_one_completed_retry_required(self):
        for problem in ("missing_usage", "wrong_thread", "missing_retry", "duplicate_retry", "new_failure", "episode_error"):
            episode, telemetry = completed_resume()
            if problem == "missing_usage":
                telemetry[0]["per_turn_usage_coverage"][0]["usage_observed"] = False
            elif problem == "wrong_thread":
                telemetry[0]["per_turn_usage_coverage"][0]["thread_id"] = "other"
            elif problem == "missing_retry":
                episode["phases"][-1].pop("retry_of_turn_id")
            elif problem == "duplicate_retry":
                episode["phases"].append(copy.deepcopy(episode["phases"][-1]))
            elif problem == "new_failure":
                episode["phases"][-1]["status"] = "failed"
            else:
                episode["error"] = {"message": "cumulative usage reset"}
            self.assertFalse(resume.continuation_valid(episode, interrupted(), telemetry), problem)

    def test_new_arm_requires_all_successful_phases_and_clean_telemetry(self):
        episode = {"thread_id": "fresh", "phases": [{"turn_id": "work", "status": "completed"}]}
        telemetry = [{"errors": [], "reroutes": [], "stop_reason": None,
                      "per_turn_usage_coverage": [{"thread_id": "fresh", "turn_id": "work", "usage_observed": True}]}]
        self.assertTrue(resume.continuation_valid(episode, {}, telemetry))
        episode["phases"][0]["status"] = "failed"
        self.assertFalse(resume.continuation_valid(episode, {}, telemetry))

    def test_pristine_fixture_check_detects_notes_source_and_artifact_changes(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            manifest = original.prepare(root / "workspace", root / "manifest.json")
            self.assertGreater(len(resume.project_fingerprints(manifest)), 20)
            for name in ("task.md", "check.py"):
                path = root / "workspace" / "N" / name
                saved = path.read_bytes()
                path.write_bytes(saved + b"\nchanged\n")
                with self.assertRaises(ValueError):
                    resume.project_fingerprints(manifest)
                path.write_bytes(saved)
            (root / "workspace" / "A" / "artifacts").mkdir()
            with self.assertRaisesRegex(ValueError, "work artifacts"):
                resume.project_fingerprints(manifest)

    def test_changed_frozen_file_is_rejected_before_any_client_or_manifest_mutation(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            frozen = root / "evidence.txt"
            frozen.write_text("original", encoding="utf-8")
            manifest = {"live_started": False, "continuation_frozen_files": {str(frozen): resume.digest_file(frozen)}}
            manifest_path = root / "continuation.json"
            resume.write_json(manifest_path, manifest)
            frozen.write_text("changed", encoding="utf-8")
            with patch.object(resume, "ContinuationEpisode") as factory:
                with self.assertRaisesRegex(ValueError, "Frozen continuation"):
                    resume.run(manifest_path, "not-a-codex", root / "report.json")
                factory.assert_not_called()
            self.assertFalse(resume.read_json(manifest_path)["live_started"])

    def test_same_thread_resume_requires_saved_failed_and_completed_turns(self):
        episode = object.__new__(resume.ContinuationEpisode)
        episode.sid = "same-thread"
        episode.project = Path("synthetic")
        episode.arm = "M"
        episode.manifest = {"model": "gpt-6-astra", "effort": "ultra", "config": original.configuration()}
        episode.episode = interrupted()
        def request(method, params):
            if method == "thread/read":
                return {"thread": {"id": "same-thread", "ephemeral": False, "turns": [{"id": "completed"}]}}
            if method == "thread/resume":
                return {"thread": {"id": "same-thread"}, "model": "gpt-6-astra", "reasoningEffort": "ultra"}
            return {"config": {}}
        episode.client = SimpleNamespace(request=request)
        with self.assertRaisesRegex(RuntimeError, "persistence"):
            episode.resume_stored()
        self.assertFalse(episode.episode["persistence"]["all_prior_turns_retained"])

    def test_extra_or_duplicate_stored_turn_is_rejected_before_thread_resume(self):
        for stored_ids in (["completed", "failed", "unplanned"],
                           ["completed", "failed", "failed"]):
            with self.subTest(stored_ids=stored_ids):
                episode = object.__new__(resume.ContinuationEpisode)
                episode.sid = "same-thread"
                episode.project = Path("synthetic")
                episode.arm = "M"
                episode.manifest = {"model": "gpt-6-astra", "effort": "ultra",
                                    "config": original.configuration()}
                episode.episode = interrupted()
                calls = []

                def request(method, params):
                    calls.append(method)
                    if method == "thread/read":
                        return {"thread": {"id": "same-thread", "ephemeral": False,
                                           "turns": [{"id": turn} for turn in stored_ids]}}
                    raise AssertionError("Contaminated history must not be resumed")

                episode.client = SimpleNamespace(request=request)
                with self.assertRaisesRegex(RuntimeError, "persistence|turn|history"):
                    episode.resume_stored()
                self.assertEqual(calls, ["thread/read"])


if __name__ == "__main__":
    unittest.main()
