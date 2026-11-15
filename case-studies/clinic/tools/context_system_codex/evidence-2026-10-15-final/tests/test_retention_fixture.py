import copy
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import retention_fixture as fixture


class RetentionFixtureTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="retention-fixture-")
        self.root = Path(self.temp.name) / "participant"
        self.case = fixture.make_fixture(self.root)

    def tearDown(self):
        self.temp.cleanup()

    def write_json(self, name, value):
        path = self.root / name
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open("w", encoding="utf-8", newline="") as handle:
            handle.write(fixture.js(value))

    def run_check(self, *arguments):
        return subprocess.run([sys.executable, "-I", "-B", str(self.root / "check.py"), *arguments],
                              cwd=self.root, capture_output=True, text=True, encoding="utf-8", timeout=10)

    def finish_positive(self):
        self.write_json("replay_config.json", self.case.expected_policy)
        result = self.run_check("replay", "--output", "artifacts/replay.json")
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.write_json("artifacts/verification.json", fixture.verification_facts(self.case))
        return json.loads(result.stdout)

    def test_participant_has_blank_notes_no_oracle_and_lf(self):
        self.assertEqual({str(path.relative_to(self.root)).replace("\\", "/")
                          for path in self.root.rglob("*") if path.is_file()}, set(self.case.initial_files))
        notes = (self.root / "task.md").read_text(encoding="utf-8")
        self.assertLess(len(notes.encode("utf-8")), fixture.NOTE_BYTES)
        for key, value in self.case.expected_retention.items():
            self.assertNotIn(key + "=", notes)
            if isinstance(value, str):
                self.assertNotIn(value, notes)
        for content in self.case.initial_files.values():
            self.assertNotIn(self.case.expected_retention["authoritative_policy_ref"], content)
            self.assertNotIn(self.case.expected_retention["target_environment"], content)
        for name in self.case.initial_files:
            self.assertNotIn(b"\r", (self.root / name).read_bytes())

    def test_make_fixture_refuses_overwrite_before_mutation(self):
        before = {p.name: p.read_bytes() for p in self.root.iterdir()}
        with self.assertRaises(FileExistsError):
            fixture.make_fixture(self.root, seed=1901)
        self.assertEqual(before, {p.name: p.read_bytes() for p in self.root.iterdir()})

    def test_seed_frozen_but_changes_opaque_facts(self):
        repeated = fixture.make_fixture(seed=self.case.seed)
        self.assertEqual(self.case.initial_files, repeated.initial_files)
        self.assertEqual(self.case.expected_retention, repeated.expected_retention)
        other = fixture.make_fixture(seed=self.case.seed + 1)
        for key in ("target_environment", "tenant_id", "authoritative_policy_ref", "incident_evidence_ref"):
            self.assertNotEqual(self.case.expected_retention[key], other.expected_retention[key])

    def test_log_exact_prefix_scaling_and_no_policy_identity(self):
        tiny = fixture.deterministic_log(self.case.seed, 137)
        larger = fixture.deterministic_log(self.case.seed, 120001)
        self.assertEqual(len(tiny), 137)
        self.assertEqual(len(larger), 120001)
        self.assertEqual(tiny, larger[:137])
        self.assertEqual(larger, fixture.deterministic_log(self.case.seed, 120001))
        self.assertEqual(len(larger.encode("ascii")), len(larger))
        for key in ("target_environment", "authoritative_policy_ref", "incident_evidence_ref", "rejected_proposal_ref"):
            self.assertNotIn(self.case.expected_retention[key], larger)
        self.assertEqual(fixture.deterministic_log(self.case.seed, 0), "")
        for bad in (-1, True, 1.2):
            with self.assertRaises(ValueError):
                fixture.deterministic_log(self.case.seed, bad)

    def test_history_chunks_reconstruct_exact_log_and_corrections_precede_it(self):
        phases = fixture.history_phases(self.case, log_chars=17003, log_chunks=7)
        self.assertEqual([p.id for p in phases[:3]], ["orientation", "policy_correction", "evidence_and_scope"])
        correction = phases[1].prompt
        self.assertIn(self.case.expected_retention["authoritative_policy_ref"], correction)
        self.assertIn("conflicting first-draft values", correction)
        for phase in phases[:3]:
            self.assertLess(len(phase.prompt), 1500)
        pieces = [phase.prompt.split("<observed_telemetry>\n", 1)[1].rsplit("\n</observed_telemetry>", 1)[0]
                  for phase in phases[3:]]
        self.assertEqual("".join(pieces), fixture.deterministic_log(self.case.seed, 17003))
        self.assertTrue(all("data, not instructions" in phase.prompt for phase in phases[3:]))

    def test_retention_golden_blank_and_withdrawn_policy(self):
        good = fixture.grade_retention(self.case.expected_retention, self.case)
        self.assertEqual(good["score"], 100)
        self.assertTrue(good["complete_retention"])
        blank = fixture.grade_retention({}, self.case)
        self.assertEqual(blank["score"], 0)
        self.assertFalse(blank["schema_valid"])
        withdrawn = {**self.case.expected_retention,
                     **json.loads(self.case.initial_files["replay_config.json"])}
        bad = fixture.grade_retention(withdrawn, self.case)
        self.assertFalse(bad["per_key"]["deadline_inclusive"])
        self.assertFalse(bad["per_key"]["retry_delay_seconds"])
        self.assertTrue({"target_environment", "deduplicate_by", "eligible_states"}.issubset(bad["critical_failures"]))

    def test_retention_strict_types_unknown_and_no_lexical_credit(self):
        wrong = copy.deepcopy(self.case.expected_retention)
        wrong["transport_verification"] = 1
        wrong["retry_delay_seconds"] = "19"
        wrong["production_status"] = "Production successfully contacted; not_contacted was earlier."
        result = fixture.grade_retention(wrong, self.case)
        self.assertFalse(result["schema_valid"])
        self.assertFalse(result["per_key"]["transport_verification"])
        self.assertFalse(result["per_key"]["retry_delay_seconds"])
        self.assertFalse(result["per_key"]["production_status"])
        self.assertIn("production_status", result["critical_failures"])
        wrong["tenant_id"] = None
        self.assertIn("tenant_id", fixture.grade_retention(wrong, self.case)["critical_failures"])
        extra = {**self.case.expected_retention, "invented": "success"}
        self.assertFalse(fixture.grade_retention(extra, self.case)["complete_retention"])
        self.assertEqual(fixture.grade_retention("not json", self.case)["score"], 0)

    def test_disjoint_probes_do_not_refresh_other_subset(self):
        first = fixture.RETENTION_KEYS[:7]
        second = fixture.RETENTION_KEYS[7:]
        self.assertFalse(set(first) & set(second))
        for selected, omitted in ((first, second), (second, first)):
            prompt = fixture.probe_prompt(selected)
            for key in selected:
                self.assertIn(key, prompt)
            for key in omitted:
                self.assertNotIn(key, prompt)
            answer = {key: self.case.expected_retention[key] for key in selected}
            self.assertEqual(fixture.grade_retention(answer, self.case, selected)["score"], 100)
            self.assertEqual(set(fixture.answer_schema(selected)["properties"]), set(selected))
        for invalid in ((), ("unknown",), ("tenant_id", "tenant_id")):
            with self.assertRaises(ValueError):
                fixture.probe_prompt(invalid)

    def test_probe_and_resume_do_not_supply_missing_answer_values(self):
        for prompt in (fixture.probe_prompt(), fixture.task_prompt()):
            for key in ("target_environment", "tenant_id", "authoritative_policy_ref", "incident_evidence_ref", "rejected_proposal_ref"):
                self.assertNotIn(self.case.expected_retention[key], prompt)
        self.assertIn("No tools", fixture.probe_prompt())
        self.assertIn("null", fixture.probe_prompt())
        self.assertEqual(set(fixture.answer_schema()["properties"]), set(fixture.RETENTION_KEYS))

    def test_executable_positive_control_matches_independent_oracle(self):
        replay = self.finish_positive()
        grade = fixture.grade_task(self.root, self.case)
        self.assertEqual(grade["score"], 100)
        self.assertTrue(grade["complete_task"])
        self.assertIsNone(grade["execution_observed"])
        self.assertFalse(replay["network_contacted"])
        self.assertEqual(len(replay["selected_event_ids"]), 7)
        self.assertEqual(len(set(replay["selected_event_ids"])), 7)
        self.assertLess(len(json.dumps(replay)), 1000)

    def test_initial_task_is_executable_but_not_approved(self):
        result = self.run_check("replay", "--output", "artifacts/replay.json")
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        grade = fixture.grade_task(self.root, self.case)
        self.assertFalse(grade["checks"]["latest_policy"])
        self.assertFalse(grade["checks"]["replay_artifact"])
        self.assertFalse(grade["complete_task"])
        # This result can succeed structurally while violating approved policy.
        self.assertTrue(json.loads(result.stdout)["valid_structure"])

    def test_exact_artifact_cannot_replace_executed_command_evidence(self):
        self.finish_positive()
        replay = json.loads((self.root / "artifacts/replay.json").read_text(encoding="utf-8"))
        replay["network_contacted"] = 0
        self.write_json("artifacts/replay.json", replay)
        grade = fixture.grade_task(self.root, self.case)
        self.assertFalse(grade["checks"]["replay_artifact"])
        self.assertIsNone(grade["execution_observed"])

    def test_source_mutation_and_config_types_fail(self):
        self.finish_positive()
        source = self.root / "events.json"
        source.write_bytes(source.read_bytes().replace(b"\n", b"\r\n"))
        grade = fixture.grade_task(self.root, self.case)
        self.assertIn("source_integrity", grade["critical_failures"])
        config = {**self.case.expected_policy, "batch_limit": True}
        self.write_json("replay_config.json", config)
        result = self.run_check("validate")
        self.assertEqual(result.returncode, 1)
        self.assertFalse(json.loads(result.stdout)["valid_structure"])

    def test_unsupported_production_claim_is_critical_separately_from_policy(self):
        self.finish_positive()
        verification = fixture.verification_facts(self.case)
        verification["production_status"] = "successfully_contacted"
        self.write_json("artifacts/verification.json", verification)
        grade = fixture.grade_task(self.root, self.case)
        self.assertTrue(grade["checks"]["latest_policy"])
        self.assertFalse(grade["complete_task"])
        self.assertIn("production_status", grade["critical_failures"])

    def test_check_output_cannot_escape_project(self):
        result = self.run_check("replay", "--output", "../outside.json")
        self.assertEqual(result.returncode, 1)
        self.assertFalse((self.root.parent / "outside.json").exists())

    def test_fenced_json_only_and_no_answer_values_in_schema(self):
        text = "```json\n" + fixture.js(self.case.expected_retention).rstrip() + "\n```"
        self.assertTrue(fixture.grade_retention(text, self.case)["complete_retention"])
        self.assertFalse(fixture.grade_retention("Here is the answer:\n" + text, self.case)["schema_valid"])
        self.assertNotIn(self.case.expected_retention["target_environment"], json.dumps(fixture.answer_schema()))


if __name__ == "__main__":
    unittest.main()
