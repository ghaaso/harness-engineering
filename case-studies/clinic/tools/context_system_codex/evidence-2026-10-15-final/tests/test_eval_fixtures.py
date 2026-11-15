"""Offline, synthetic-only isolation and grader controls for the pilot fixtures."""
from __future__ import annotations

import json
from pathlib import Path
import sys
import tempfile
import unittest

sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from eval_fixtures import (RESPONSE_BYTES, STATE_TEMPLATE, FixtureTools, create_fixture,
                           grade, reference_artifacts, scenarios)


class FixtureTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="codex-fixture-unit-")
        self.addCleanup(self.temp.cleanup)
        self.base = Path(self.temp.name)

    def fixture(self, number=0, seed=0, label="fixture"):
        scenario = scenarios(seed)[number]
        return scenario, create_fixture(self.base / label, scenario)

    def install_reference(self, scenario, tools):
        for path, content in reference_artifacts(scenario).items():
            self.assertTrue(tools.dispatch("WriteFixture", {"path": path, "content": content})["ok"])

    def assert_bounded(self, response):
        self.assertLessEqual(len(json.dumps(response, ensure_ascii=False).encode("utf-8")), RESPONSE_BYTES)

    def test_both_pristine_fixtures_fail_positive_work_and_completion(self):
        for index in (0, 1):
            scenario, tools = self.fixture(index, label=f"case-{index}")
            result = grade(scenario, tools)
            self.assertEqual(result["score"], 0)
            self.assertFalse(result["complete_task"])
            self.assertEqual(result["positive_artifacts_passed"], 0)
            self.assertTrue(result["critical_failures"])

    def test_reference_artifacts_pass_both_families_across_seeds(self):
        for seed in (0, 17, 209):
            for index in (0, 1):
                scenario, tools = self.fixture(index, seed, f"case-{seed}-{index}")
                self.install_reference(scenario, tools)
                result = grade(scenario, tools)
                self.assertTrue(result["complete_task"], result)
                self.assertEqual(result["score"], 100)
                self.assertEqual(result["critical_failures"], [])

    def test_task_state_is_blank_and_keys_are_not_copied_to_fixture(self):
        for index in (0, 1):
            scenario, tools = self.fixture(index, seed=81, label=f"blank-{index}")
            self.assertEqual(tools.read_artifact("task.md"), STATE_TEMPLATE)
            self.assertEqual(set(p.relative_to(tools.root).as_posix()
                                 for p in tools.root.rglob("*") if p.is_file()), set(scenario.initial_files))
            text = "\n".join(scenario.initial_files.values())
            control = reference_artifacts(scenario)
            if index == 0:
                opaque = json.loads(control["policy.json"])["approval_ref"]
                self.assertNotIn("seven", text.lower())
                self.assertNotIn('"kiosk": 7', text)
            else:
                opaque = json.loads(control["restore_config.json"])["diagnostic_ref"]
                target = json.loads(control["restore_config.json"])["target_instance"]
                self.assertNotIn(target, text)
                self.assertNotIn(target, scenario.phases[-1].prompt)
            self.assertNotIn(opaque, text)
            self.assertNotIn(opaque, scenario.phases[-1].prompt)
            self.assertIn(opaque, "\n".join(phase.prompt for phase in scenario.phases[:-1]))

    def test_grade_accepts_harmless_metadata_and_evidence_label_presentation(self):
        scenario, tools = self.fixture(1)
        self.install_reference(scenario, tools)
        for path in reference_artifacts(scenario):
            artifact = json.loads(tools.read_artifact(path))
            artifact["notes"] = "Synthetic result; no real restore ran."
            if path == "artifacts/resume_plan.json":
                artifact["already_observed_passed"].reverse()
                artifact["evidence_status"] = {key: value.upper() + " "
                                               for key, value in artifact["evidence_status"].items()}
                artifact["evidence_status"]["fixture_run"] = "simulated"
            tools.dispatch("WriteFixture", {"path": path, "content": json.dumps(artifact)})
        self.assertTrue(grade(scenario, tools)["complete_task"])

    def test_grade_does_not_treat_retry_order_or_asserted_repairs_as_presentation(self):
        scenario, tools = self.fixture(1)
        self.install_reference(scenario, tools)
        artifact = json.loads(tools.read_artifact("artifacts/resume_plan.json"))
        artifact["retry_checks"].reverse()
        artifact["evidence_status"]["repair"] = "observed"
        tools.dispatch("WriteFixture", {"path": "artifacts/resume_plan.json", "content": json.dumps(artifact)})
        result = grade(scenario, tools)
        self.assertFalse(result["complete_task"])
        self.assertIn("no_repeated_investigation", result["critical_failures"])
        self.assertIn("evidence_status", result["critical_failures"])

    def test_history_has_work_between_correction_and_distinct_continuation(self):
        for scenario in scenarios():
            self.assertGreaterEqual(sum(p.compact_after for p in scenario.phases), 2)
            self.assertIn("intervening_work", [p.id for p in scenario.phases])
            self.assertEqual(scenario.phases[-1].id, "continuation")
            self.assertFalse(scenario.phases[-1].compact_after)
            self.assertNotIn("rubric", " ".join(p.prompt for p in scenario.phases).lower())

    def test_same_seed_is_paired_and_other_seed_has_different_opaque_evidence(self):
        first, second = scenarios(19), scenarios(19)
        self.assertEqual(first, second)
        self.assertNotEqual(scenarios(19)[0].phases, scenarios(20)[0].phases)
        self.assertNotEqual(scenarios(19)[1].phases, scenarios(20)[1].phases)
        with self.assertRaises(ValueError):
            scenarios(True)

    def test_dynamic_specs_do_not_expose_shell_grader_or_reference(self):
        _, tools = self.fixture()
        specs = tools.specs()
        self.assertEqual({s["name"] for s in specs}, {"ReadFixture", "WriteFixture", "RunFixtureCheck"})
        for spec in specs:
            self.assertEqual(spec["type"], "function")
            self.assertFalse(spec["inputSchema"]["additionalProperties"])
        for tool in ("exec_command", "grade", "reference_artifacts"):
            self.assertFalse(tools.dispatch(tool, {})["ok"])

    def test_cannot_read_or_write_sibling_arm_or_controller_answers(self):
        _, native = self.fixture(label="native")
        _, adapter = self.fixture(label="adapter")
        outside = self.base / "answer-key.json"
        outside.write_text("HIDDEN-CONTROLLER-ANSWER", encoding="utf-8")
        adapter.dispatch("WriteFixture", {"path": "task.md", "content": "OTHER-ARM-SECRET"})
        forbidden = ["../answer-key.json", "../adapter/task.md", str(outside), "C:/secrets.txt",
                     "..\\answer-key.json", "task.md:stream", "/etc/passwd", "task.md/../task.md",
                     "answer-key.json", ".codex/config.toml", ""]
        for path in forbidden:
            for tool, args in (("ReadFixture", {"path": path}),
                               ("WriteFixture", {"path": path, "content": "bad"})):
                response = native.dispatch(tool, args)
                self.assertFalse(response["ok"], (tool, path, response))
                self.assertNotIn("HIDDEN-CONTROLLER-ANSWER", json.dumps(response))
                self.assertNotIn("OTHER-ARM-SECRET", json.dumps(response))
                self.assert_bounded(response)
        self.assertEqual(outside.read_text(), "HIDDEN-CONTROLLER-ANSWER")
        self.assertEqual(adapter.read_artifact("task.md"), "OTHER-ARM-SECRET")

    def test_source_data_and_contracts_are_read_only(self):
        scenario, tools = self.fixture()
        for path in set(scenario.initial_files) - set(scenario.writable_paths):
            self.assertFalse(tools.dispatch("WriteFixture", {"path": path, "content": "changed"})["ok"])
            self.assertEqual(tools.read_artifact(path), scenario.initial_files[path])

    def test_existing_fixture_is_never_silently_overwritten(self):
        scenario, tools = self.fixture()
        tools.dispatch("WriteFixture", {"path": "task.md", "content": "preserve existing work"})
        with self.assertRaises(FileExistsError):
            create_fixture(tools.root, scenario)
        self.assertEqual(tools.read_artifact("task.md"), "preserve existing work")

    def test_symlink_cannot_reach_sibling_even_using_allowed_path(self):
        _, tools = self.fixture()
        outside = self.base / "private.txt"
        outside.write_text("NOT-AN-AGENT-FILE", encoding="utf-8")
        target = tools.root / "task.md"
        target.unlink()
        try:
            target.symlink_to(outside)
        except OSError as error:
            self.skipTest(f"symlinks unavailable: {error.__class__.__name__}")
        for tool, args in (("ReadFixture", {"path": "task.md"}),
                           ("WriteFixture", {"path": "task.md", "content": "bad"})):
            response = tools.dispatch(tool, args)
            self.assertFalse(response["ok"])
            self.assertNotIn("NOT-AN-AGENT-FILE", json.dumps(response))
        self.assertEqual(outside.read_text(), "NOT-AN-AGENT-FILE")

    def test_unicode_and_json_escaping_pagination_is_exact_and_bounded(self):
        _, tools = self.fixture()
        text = ('اردو 🧪 café "quoted" \\ backslash\n\t\x01' * 160) + "THE END"
        self.assertTrue(tools.dispatch("WriteFixture", {"path": "task.md", "content": text})["ok"])
        chunks, offset = [], 0
        for _ in range(100):
            result = tools.dispatch("ReadFixture", {"path": "task.md", "offset": offset})
            self.assertTrue(result["ok"], result)
            self.assert_bounded(result)
            self.assertEqual(result["offset"], offset)
            self.assertEqual(result["text_utf8_bytes"], len(result["text"].encode("utf-8")))
            chunks.append(result["text"])
            if result["eof"]:
                self.assertIsNone(result["next_offset"])
                break
            self.assertGreater(result["next_offset"], offset)
            offset = result["next_offset"]
        else:
            self.fail("paging did not terminate")
        self.assertEqual("".join(chunks), text)

    def test_invalid_arguments_and_large_writes_fail_with_bounded_errors(self):
        _, tools = self.fixture()
        examples = [
            ("ReadFixture", {"path": "task.md", "offset": -1}),
            ("ReadFixture", {"path": "task.md", "offset": True}),
            ("ReadFixture", {"path": "task.md", "limit": 0}),
            ("ReadFixture", {"path": "task.md", "limit": 100000}),
            ("ReadFixture", {"path": "task.md", "unknown": True}),
            ("ReadFixture", None),
            ("WriteFixture", {"path": "task.md", "content": "🧪" * 20000}),
            ("WriteFixture", {"path": "task.md", "content": 1}),
            ("RunFixtureCheck", {"check": "read_answer_key"}),
        ]
        for name, args in examples:
            result = tools.dispatch(name, args)
            self.assertFalse(result["ok"], result)
            self.assert_bounded(result)
        self.assertEqual(tools.read_artifact("task.md"), STATE_TEMPLATE)

    def test_too_small_unicode_page_fails_instead_of_returning_no_progress(self):
        _, tools = self.fixture()
        tools.dispatch("WriteFixture", {"path": "task.md", "content": "🧪done"})
        result = tools.dispatch("ReadFixture", {"path": "task.md", "limit": 1})
        self.assertFalse(result["ok"])
        self.assert_bounded(result)
        result = tools.dispatch("ReadFixture", {"path": "task.md", "limit": 4})
        self.assertEqual(result["text"], "🧪")
        self.assertEqual(result["next_offset"], 1)

    def test_public_expiry_check_computes_current_policy_not_hidden_requirement(self):
        scenario, tools = self.fixture()
        before = tools.dispatch("RunFixtureCheck", {"check": "expiry_preview"})
        self.assertTrue(before["ok"])
        self.assertTrue(before["simulation_only"])
        self.assertNotEqual(before["preview"], json.loads(reference_artifacts(scenario)["artifacts/expiry_preview.json"]))
        self.assertNotIn("score", before)
        self.install_reference(scenario, tools)
        after = tools.dispatch("RunFixtureCheck", {"check": "expiry_preview"})
        self.assertEqual(after["preview"], json.loads(reference_artifacts(scenario)["artifacts/expiry_preview.json"]))
        self.assert_bounded(after)

    def test_public_restore_check_is_simulation_and_has_no_invented_elapsed_time(self):
        scenario, tools = self.fixture(1)
        before = tools.dispatch("RunFixtureCheck", {"check": "restore_readiness"})
        self.assertEqual(before["write_probe"], "E_WRITE_GUARD")
        self.install_reference(scenario, tools)
        after = tools.dispatch("RunFixtureCheck", {"check": "restore_readiness"})
        self.assertEqual(after["write_probe"], "passed")
        self.assertTrue(after["simulation_only"])
        self.assertIsNone(after["measured_rto_seconds"])
        self.assert_bounded(after)

    def test_booking_critical_failures_cannot_be_masked_by_other_artifacts(self):
        mutations = [
            ("latest_correction", lambda p: p.update(hold_minutes={"web": 8, "kiosk": 8})),
            ("protected_statuses", lambda p: p.update(eligible_statuses=["held", "confirmed"])),
            ("deadline_equality", lambda p: p.update(expire_at_deadline=False)),
            ("exact_approval", lambda p: p.update(approval_ref="KIOSK-INVENTED")),
        ]
        for index, (critical, mutate) in enumerate(mutations):
            scenario, tools = self.fixture(label=f"booking-bad-{index}")
            self.install_reference(scenario, tools)
            policy = json.loads(tools.read_artifact("policy.json"))
            mutate(policy)
            tools.dispatch("WriteFixture", {"path": "policy.json", "content": json.dumps(policy)})
            result = grade(scenario, tools)
            self.assertFalse(result["complete_task"])
            self.assertIn(critical, result["critical_failures"])
            self.assertGreater(result["score"], 0)  # aggregate artifact credit does not mask critical failure

    def test_debugging_critical_constraints_and_unknowns_are_enforced(self):
        mutations = [
            ("tls_preserved", "restore_config.json", lambda p: p.update(tls_verify=False)),
            ("source_preserved", "restore_config.json", lambda p: p.update(source_instance="replacement-old")),
            ("archive_exception", "restore_config.json", lambda p: p["verification_profiles"].update(audit_archive="read_write")),
            ("correct_target", "restore_config.json", lambda p: p.update(target_instance="replacement-old")),
            ("no_repeated_investigation", "artifacts/resume_plan.json", lambda p: p.update(retry_checks=["connect", "write_probe"])),
            ("unknown_measurement", "artifacts/resume_plan.json", lambda p: p.update(measured_rto_seconds=25)),
            ("evidence_status", "artifacts/resume_plan.json", lambda p: p["evidence_status"].update(recovery_time="observed")),
        ]
        for index, (critical, path, mutate) in enumerate(mutations):
            scenario, tools = self.fixture(1, label=f"debug-bad-{index}")
            self.install_reference(scenario, tools)
            artifact = json.loads(tools.read_artifact(path))
            mutate(artifact)
            tools.dispatch("WriteFixture", {"path": path, "content": json.dumps(artifact)})
            result = grade(scenario, tools)
            self.assertFalse(result["complete_task"])
            self.assertIn(critical, result["critical_failures"])

    def test_malformed_or_missing_artifact_never_passes(self):
        scenario, tools = self.fixture()
        self.install_reference(scenario, tools)
        for content in ("not JSON", "[]", "null", "42", "{}"):
            tools.dispatch("WriteFixture", {"path": "artifacts/expiry_preview.json", "content": content})
            self.assertFalse(grade(scenario, tools)["complete_task"])

    def test_out_of_band_source_tampering_is_detected_by_grader(self):
        scenario, tools = self.fixture()
        self.install_reference(scenario, tools)
        (tools.root / "jobs.json").write_text('{"jobs": []}', encoding="utf-8")
        result = grade(scenario, tools)
        self.assertFalse(result["complete_task"])
        self.assertIn("modified_source:jobs.json", result["critical_failures"])

    def test_grade_cannot_mix_paired_scenario_roots_or_seeds(self):
        scenario, tools = self.fixture()
        with self.assertRaises(ValueError):
            grade(scenarios()[1], tools)
        with self.assertRaises(ValueError):
            grade(scenarios(19)[0], tools)


if __name__ == "__main__":
    unittest.main()
