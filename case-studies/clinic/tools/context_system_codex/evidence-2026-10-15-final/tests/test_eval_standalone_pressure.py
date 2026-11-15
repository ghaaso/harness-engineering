import json
import sys
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import eval_standalone_pressure as standalone
from retention_fixture import NOTE_TEMPLATE, make_fixture
from storage import write_json


class StandalonePressureTests(unittest.TestCase):
    def prepare(self, root):
        codex = root / "codex-test.bin"
        codex.write_bytes(b"offline runtime fingerprint")
        original_manifest = root / "original-manifest.json"
        write_json(original_manifest, {"model": "gpt-6-astra", "effort": "ultra"})
        runtime_report = root / "runtime-report.json"
        write_json(runtime_report, {"manifest": str(original_manifest),
            "episodes": [{"arm": "control", "run_finished": True, "measurement_valid": True,
                          "task_grade": {"complete_task": True, "execution_observed": True}}],
            "calibration": {"chars_per_token_estimate": 2.921413964, "capacity": 258400},
            "reported_input": 1528072, "reported_output": 4583, "elapsed_seconds": 700})
        prior_report = root / "prior-report.json"
        write_json(prior_report, {"prior_report": str(runtime_report), "reported_input": 1913648,
            "reported_output": 9686, "active_elapsed_seconds": 900})
        channel_report = root / "channel-report.json"
        write_json(channel_report, {"verified": True, "telemetry": {"errors": [], "reroutes": []},
            "ordinary_input": 79834, "ordinary_output": 48, "elapsed_seconds": 10})
        manifest_path = root / "manifest.json"
        with patch.object(standalone.prior_driver.subprocess, "run",
                          return_value=SimpleNamespace(stdout="codex-test-version\n")):
            manifest = standalone.prepare(root / "workspace", manifest_path, prior_report,
                                          channel_report, codex)
        return manifest, manifest_path

    def test_preparation_materializes_new_seed_once_with_blank_notes(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            manifest, _ = self.prepare(root)
            expected = make_fixture(seed=1732)
            self.assertEqual(manifest["seed"], 1732)
            self.assertEqual(manifest["prior_input"], 1993482)
            self.assertEqual(manifest["prior_output"], 9734)
            for arm in manifest["order"]:
                project = root / "workspace" / arm
                for name, content in expected.initial_files.items():
                    self.assertEqual((project / name).read_bytes(), content.encode("utf-8"), arm + "/" + name)
                self.assertEqual((project / "task.md").read_text(encoding="utf-8"), NOTE_TEMPLATE)
                self.assertFalse((project / "artifacts").exists())
            first, second = map(set, manifest["probe_keys"])
            self.assertFalse(first & second)
            self.assertEqual(first | second, set(expected.expected_retention))

    def test_remaining_budget_is_applied_before_participant_start(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            manifest, manifest_path = self.prepare(root)
            manifest.update(prior_input=manifest["limits"]["input"] - 123,
                            prior_output=manifest["limits"]["output"] - 31)
            write_json(manifest_path, manifest)
            seen = []

            def participant(*args):
                seen.append(args[4])
                def start():
                    raise RuntimeError("offline preflight stop")
                episode = {"arm": args[1], "ordinary_input": 0, "ordinary_output": 0,
                           "measurement_valid": False, "run_finished": False}
                return SimpleNamespace(start=start, close=lambda: episode, episode=episode)

            with patch.object(standalone, "StandaloneEpisode", side_effect=participant):
                report = standalone.run(manifest_path, root / "report.json")
            self.assertEqual(len(seen), 1)
            self.assertEqual((seen[0]["input"], seen[0]["output"]), (123, 31))
            self.assertGreater(seen[0]["seconds"], 0)
            self.assertLessEqual(seen[0]["seconds"], 6290)
            self.assertEqual(report["reported_input"], manifest["prior_input"])
            self.assertEqual(report["reported_output"], manifest["prior_output"])
            self.assertEqual(report["cohort_input"], 0)
            self.assertIn("offline preflight stop", report["stopped_by"])

    def test_exhausted_budget_stops_before_any_participant_is_constructed(self):
        for field in ("input", "output", "time"):
            with self.subTest(field=field), tempfile.TemporaryDirectory() as directory:
                root = Path(directory)
                manifest, manifest_path = self.prepare(root)
                if field == "time":
                    manifest["prior_elapsed_seconds"] = manifest["limits"]["active_seconds"]
                else:
                    manifest["prior_" + field] = manifest["limits"][field]
                write_json(manifest_path, manifest)
                with patch.object(standalone, "StandaloneEpisode") as factory:
                    report = standalone.run(manifest_path, root / "report.json")
                factory.assert_not_called()
                self.assertIn("remaining allowance exhausted", report["stopped_by"])
                self.assertEqual(report["episodes"], [])

    def test_short_intake_preserves_decisions_and_defers_implementation(self):
        fixture = make_fixture(seed=1732)
        phases = standalone.decision_phases(fixture)
        self.assertEqual([name for name, _ in phases],
                         ["orientation", "policy_correction", "evidence_and_scope"])
        text = "\n".join(prompt for _, prompt in phases)
        self.assertNotIn("Read worker_contract.md", text)
        self.assertNotIn("use the executable checks", text)
        self.assertNotIn("Draft the repair", text)
        self.assertIn("Defer the actual repair", text)
        for key in ("target_environment", "tenant_id", "authoritative_policy_ref",
                    "incident_evidence_ref", "rejected_proposal_ref"):
            self.assertIn(fixture.expected_retention[key], text)


if __name__ == "__main__":
    unittest.main()
