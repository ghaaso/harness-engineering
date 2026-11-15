"""Behavior checks for workflow mechanisms, not clinic T acceptance tests."""
import copy
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("coding_workflow", ROOT / "tools/coding_workflow.py")
workflow = importlib.util.module_from_spec(spec)
spec.loader.exec_module(workflow)


def run_fixture(schema):
    record = {}
    for name, field in schema["properties"].items():
        types = field["type"]
        if isinstance(types, list) and "null" in types:
            record[name] = None
        elif "enum" in field:
            record[name] = field["enum"][0]
        elif types == "integer":
            record[name] = field.get("minimum", 0)
        elif types == "boolean":
            record[name] = False
        elif types == "object":
            record[name] = {}
        else:
            record[name] = "synthetic"
    record.update({"condition": "mechanism", "cost_status": "unknown",
                   "context_measurement_method": "delivered_utf8_bytes", "resume_kind": "not_tested",
                   "started_at": "2026-10-01T10:00:00-07:00", "ended_at": "2026-10-01T10:01:00-07:00",
                   "failed_scenarios_by_severity": {"critical": 0, "major": 0, "minor": 0}})
    return record


class CheckpointTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.task = "docs/tasks/demo/task.md"; self.packet = "docs/tasks/demo/context.md"
        (self.root / self.task).parent.mkdir(parents=True)
        (self.root / self.task).write_text("Status: in progress\n## Next action\nFix the failed receipt test; no completed application.\n", encoding="utf-8")
        (self.root / self.packet).write_text("REPORTED remains REPORTED. Last check failed.\n", encoding="utf-8")
        (self.root / "contract.md").write_text("PROPOSED physical return is not a settled credit.", encoding="utf-8")
        self.snapshot = workflow.make_checkpoint(self.root, self.task, self.packet, ["contract.md"])

    def test_current_snapshot_is_projection_not_completion(self):
        self.assertTrue(workflow.inspect_checkpoint(self.root, self.snapshot)["ok"])
        self.assertEqual(self.snapshot["statusAtCheckpoint"], "in progress")
        self.assertIn("failed", self.snapshot["nextActionAtCheckpoint"])

    def test_contract_change_blocks_resume(self):
        (self.root / "contract.md").write_text("Changed rule", encoding="utf-8")
        result = workflow.inspect_checkpoint(self.root, self.snapshot)
        self.assertFalse(result["ok"])
        self.assertEqual(result["changed"], [{"path": "contract.md", "reason": "changed"}])

    def test_deleted_dependency_blocks_resume(self):
        (self.root / "contract.md").unlink()
        self.assertEqual(workflow.inspect_checkpoint(self.root, self.snapshot)["changed"][0]["reason"], "missing")

    def test_task_and_packet_changes_each_block_resume(self):
        for path in (self.task, self.packet):
            with self.subTest(path=path):
                original = (self.root / path).read_bytes()
                (self.root / path).write_bytes(original + b"\nNew fact")
                self.assertFalse(workflow.inspect_checkpoint(self.root, self.snapshot)["ok"])
                (self.root / path).write_bytes(original)

    def test_unrelated_edit_does_not_invalidate(self):
        (self.root / "unrelated.md").write_text("unrelated", encoding="utf-8")
        self.assertTrue(workflow.inspect_checkpoint(self.root, self.snapshot)["ok"])

    def test_missing_task_action_cannot_be_checkpointed(self):
        (self.root / self.task).write_text("Status: in progress", encoding="utf-8")
        with self.assertRaises(ValueError):
            workflow.make_checkpoint(self.root, self.task, self.packet, ["contract.md"])

    def test_checkpoint_requires_relevant_dependency(self):
        with self.assertRaises(ValueError):
            workflow.make_checkpoint(self.root, self.task, self.packet, [])

    def test_duplicate_dependency_alias_is_not_a_source(self):
        with self.assertRaises(ValueError):
            workflow.make_checkpoint(self.root, self.task, self.packet, [self.packet.replace("/", "\\")])

    def test_malformed_checkpoint_fails_without_promotion(self):
        for record in ([], {"schemaVersion": 1, "dependencies": [None]}, {"schemaVersion": 1, "dependencies": [{"path": "contract.md", "sha256": "not-a-hash"}]}):
            with self.subTest(record=record), self.assertRaises(ValueError):
                workflow.inspect_checkpoint(self.root, record)

    def test_traversal_absolute_and_external_snapshot_paths_rejected(self):
        for path in ("../escape.txt", "C:/escape.txt", "/escape.txt", "\\\\server\\share"):
            with self.subTest(path=path), self.assertRaises(ValueError):
                workflow.local_path(self.root, path)
        tampered = copy.deepcopy(self.snapshot)
        tampered["dependencies"][2]["path"] = "../outside.txt"
        with self.assertRaises(ValueError):
            workflow.inspect_checkpoint(self.root, tampered)

    def test_evidence_cannot_overwrite_sources_or_prior_snapshot(self):
        with self.assertRaises(ValueError):
            workflow.save_evidence(self.root, "sources/original.json", {})
        workflow.save_evidence(self.root, "docs/tasks/demo/checkpoints/one.json", self.snapshot)
        with self.assertRaises(ValueError):
            workflow.save_evidence(self.root, "docs/tasks/demo/checkpoints/one.json", {})

    def test_fresh_process_reads_checkpoint_and_detects_change(self):
        output = "docs/tasks/demo/checkpoints/one.json"
        workflow.save_evidence(self.root, output, self.snapshot)
        command = [sys.executable, str(ROOT / "tools/coding_workflow.py"), "--root", str(self.root), "resume", output]
        first = subprocess.run(command, capture_output=True, text=True)
        self.assertEqual(first.returncode, 0, first.stdout)
        (self.root / "contract.md").write_text("new contract", encoding="utf-8")
        stale = subprocess.run(command, capture_output=True, text=True)
        self.assertEqual(stale.returncode, 2)
        self.assertFalse(json.loads(stale.stdout)["ok"])


class EvaluationTests(unittest.TestCase):
    def setUp(self):
        self.schema = workflow.read_json(ROOT / workflow.SCHEMA)
        self.record = run_fixture(self.schema)

    def test_unknown_telemetry_is_valid_as_null(self):
        self.assertEqual(workflow.validate_run(self.record, self.schema), [])

    def test_unknown_spending_is_not_zero(self):
        self.record["cost_usd"] = 0
        self.assertIn("Unknown cost", " ".join(workflow.validate_run(self.record, self.schema)))

    def test_known_cost_needs_evidence_and_attribution(self):
        self.record.update(cost_status="measured", cost_usd=0)
        self.assertTrue(workflow.validate_run(self.record, self.schema))
        self.record.update(cost_source="synthetic meter", cost_attribution="all fixture calls")
        self.assertEqual(workflow.validate_run(self.record, self.schema), [])

    def test_bytes_cannot_be_called_provider_tokens(self):
        self.record["input_tokens"] = 42
        self.assertIn("Proxy payload", " ".join(workflow.validate_run(self.record, self.schema)))

    def test_lost_or_stale_facts_cannot_be_accepted(self):
        self.record.update(accepted=True, critical_facts_required=4, critical_facts_correct=3, acceptance_evidence="synthetic evidence")
        self.assertTrue(workflow.validate_run(self.record, self.schema))
        self.record.update(critical_facts_correct=4, stale_fact_count=1)
        self.assertTrue(workflow.validate_run(self.record, self.schema))

    def test_acceptance_needs_evidence(self):
        self.record.update(accepted=True, acceptance_evidence="")
        self.assertIn("Acceptance needs", " ".join(workflow.validate_run(self.record, self.schema)))

    def test_subprocess_resume_requires_outcome(self):
        self.record["resume_kind"] = "fresh_process"
        self.assertTrue(workflow.validate_run(self.record, self.schema))

    def test_unrun_resume_cannot_claim_success(self):
        self.record["resume_success"] = True
        self.assertTrue(workflow.validate_run(self.record, self.schema))

    def test_missing_undeclared_and_wrong_type_fields_fail(self):
        for change in ("missing", "extra", "type"):
            with self.subTest(change=change):
                record = copy.deepcopy(self.record)
                if change == "missing": del record["worker_count"]
                elif change == "extra": record["invented_metric"] = 999
                else: record["worker_count"] = True
                self.assertTrue(workflow.validate_run(record, self.schema))

    def test_negative_or_nonfinite_cost_fails(self):
        for value in (-1, float("nan"), float("inf")):
            self.record.update(cost_status="estimated", cost_usd=value)
            self.assertTrue(workflow.validate_run(self.record, self.schema))

    def test_person_minutes_not_double_counted_or_misconverted(self):
        self.record.update(human_active_minutes=30, human_engineering_hours=1)
        self.assertTrue(workflow.validate_run(self.record, self.schema))
        self.record["human_engineering_hours"] = 0.5
        self.assertEqual(workflow.validate_run(self.record, self.schema), [])

    def test_failed_exposures_and_cached_tokens_cannot_overflow(self):
        self.record.update(failed_scenarios=1)
        self.assertTrue(workflow.validate_run(self.record, self.schema))
        self.record.update(failed_scenarios=0, context_measurement_method="provider_tokens", input_tokens=20, cached_input_tokens=21)
        self.assertTrue(workflow.validate_run(self.record, self.schema))

    def test_naive_or_reversed_timestamps_fail(self):
        self.record["started_at"] = "2026-10-01T10:00:00"
        self.assertTrue(workflow.validate_run(self.record, self.schema))
        self.record.update(started_at="2026-10-01T10:02:00-07:00", ended_at="2026-10-01T10:01:00-07:00")
        self.assertTrue(workflow.validate_run(self.record, self.schema))


class MechanismTests(unittest.TestCase):
    def test_incomplete_project_is_not_ready(self):
        with tempfile.TemporaryDirectory() as directory:
            self.assertFalse(workflow.doctor(Path(directory))["ok"])
            self.assertFalse(workflow.check_documents(Path(directory))["ok"])

    def test_all_six_oracles_and_negative_cases_hold(self):
        result = workflow.pilot(ROOT)
        self.assertTrue(result["ok"])
        self.assertEqual(len(result["cases"]), 6)
        self.assertEqual(result["readerSubprocessCalls"], 24)
        self.assertEqual(result["packetPreparationReads"], 6)
        self.assertEqual(result["deliveredPayloadBytes"]["baseline"], sum(case["baselineDeliveredBytes"] for case in result["cases"]))
        self.assertTrue(result["staleDependencyRejected"])
        self.assertTrue(all(case["lostFactRejected"] for case in result["cases"]))
        self.assertIsNone(result["inputTokens"])
        self.assertGreater(result["deliveredPayloadBytes"]["treatment"], sum(2 * len(case["source"].encode()) for case in workflow.read_json(ROOT / "tests/workflow/pilot-cases.json")["cases"]))

    def test_instruction_and_provenance_defects_are_detected(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            for name in workflow.REQUIRED:
                path = root / name; path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text("{}" if path.suffix == ".json" else "fixture", encoding="utf-8")
            result = workflow.check_documents(root)
            self.assertFalse(result["ok"])
            self.assertTrue(any("provenance" in error for error in result["errors"]))
            self.assertTrue(any("workflow contract" in error for error in result["errors"]))

    def test_valid_document_fixture_then_broken_link_fence_and_hash(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            for name in workflow.REQUIRED:
                path = root / name; path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text("{}" if path.suffix == ".json" else "fixture", encoding="utf-8")
            (root/'docs/agentic-coding/workflow-templates.md').write_text("## Current-state ownership\n## Code shape\n## Boundary checks\nfail-before/pass-after\n## Next action\n", encoding="utf-8")
            (root/'docs/agentic-coding/evaluation-plan.md').write_text("## Quality, context and cost\n## Iterative change and instruction regression\nactual current baseline\n", encoding="utf-8")
            (root/'docs/prompts').mkdir()
            (root/'docs/prompts/coding-task-launcher.md').write_text("Task.md is the current-state index\nfail-before/pass-after\ncommand-catalogue.md\n", encoding="utf-8")
            for provenance, pdf in (("sources/provenance.json", "sources/MD Health Clinic Inventory final.pdf"), ("archive/provenance.json", "archive/Charter-Tier-6-Auto-Pilot.pdf")):
                (root/pdf).write_bytes(b"synthetic provenance fixture")
                (root/provenance).write_text(json.dumps({'sha256': workflow.digest((root/pdf).read_bytes())}), encoding="utf-8")
            self.assertTrue(workflow.check_documents(root)['ok'])
            (root/'README.md').write_text('[broken](missing.md)\n```python\n', encoding="utf-8")
            (root/'sources/MD Health Clinic Inventory final.pdf').write_bytes(b"changed synthetic bytes")
            errors = workflow.check_documents(root)['errors']
            self.assertTrue(any('missing file target' in error for error in errors))
            self.assertTrue(any('unclosed code fence' in error for error in errors))
            self.assertTrue(any('provenance hash mismatch' in error for error in errors))


if __name__ == "__main__":
    unittest.main()
