"""Synthetic positive/negative storage controls; no model or installed hooks."""
from pathlib import Path
import json
import sys
import tempfile
import unittest
from unittest import mock

sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from eval_storage_stress import MAX_BYTES, _disk_bytes, _run_case, run_stress, verify_case


class StorageStressTests(unittest.TestCase):
    def test_windows_extended_alias_during_scan_is_not_an_escape(self):
        with tempfile.TemporaryDirectory(prefix="storage-scan-alias-") as directory:
            root = Path(directory).resolve()
            target = root / "changing.tmp"
            target.write_bytes(b"data")
            original = Path.resolve

            def alias(path, *args, **kwargs):
                resolved = original(path, *args, **kwargs)
                return Path("\\\\?\\" + str(resolved)) if path == target else resolved

            with mock.patch.object(Path, "resolve", alias):
                self.assertEqual(_disk_bytes(root), 4)

    def test_actual_resolved_escape_still_fails_the_scan(self):
        with tempfile.TemporaryDirectory(prefix="storage-scan-escape-") as directory:
            root = Path(directory).resolve()
            target = root / "changing.tmp"
            target.write_bytes(b"data")
            original = Path.resolve

            def escape(path, *args, **kwargs):
                return root.parent / "outside.tmp" if path == target else original(path, *args, **kwargs)

            with mock.patch.object(Path, "resolve", escape):
                with self.assertRaises(ValueError):
                    _disk_bytes(root)

    def test_real_spawned_processes_verify_shared_and_private_commits(self):
        report = run_stress((1, 4), writes=2, timeout=60)
        self.assertTrue(report["ok"], report)
        self.assertEqual(report["model_calls"], 0)
        self.assertFalse(report["quality_or_compression_claim"])
        self.assertTrue(report["cleanup_verified"])
        for case in report["cases"]:
            count = case["workers"] * 2 * 2
            self.assertEqual(case["verification"]["event_count"], count)
            self.assertEqual(case["verification"]["snapshot_count"], count)
            self.assertEqual(len({item["pid"] for item in case["worker_results"]}), case["workers"])
            self.assertLessEqual(case["observed_peak_workspace_bytes"], MAX_BYTES)
            self.assertGreaterEqual(case["worker_cpu_seconds_sum"], 0)

    def test_corruption_missing_writes_and_cross_session_edits_cannot_pass(self):
        with tempfile.TemporaryDirectory(prefix="storage-verifier-control-") as directory:
            base = Path(directory).resolve()
            original = _run_case(base, workers=1, writes=2, timeout=60)
            self.assertTrue(original["ok"], original)
            root = base / "writers-1"
            shared = root / "runtime/sessions/shared/events"
            files = sorted(shared.glob("*.json"))
            first = json.loads(files[0].read_text(encoding="utf-8"))
            first["payload"]["session_id"] = "worker-00"
            first["text_sha"] = "0" * 64
            files[0].write_text(json.dumps(first), encoding="utf-8")
            files[1].unlink()
            result = verify_case(root, 1, 2, original["worker_results"])
            self.assertFalse(result["ok"])
            codes = {item["code"] for item in result["errors"]}
            self.assertTrue({"count_or_sequence_mismatch", "event_exactness_or_provenance",
                             "missing_or_duplicated_write", "show_rejected"}.issubset(codes), codes)

    def test_snapshot_corruption_and_worker_lock_failure_are_retained(self):
        with tempfile.TemporaryDirectory(prefix="storage-verifier-control-") as directory:
            base = Path(directory).resolve()
            original = _run_case(base, workers=1, writes=1, timeout=60)
            self.assertTrue(original["ok"], original)
            root = base / "writers-1"
            snapshot = next((root / "runtime/sessions/shared/snapshots").glob("*.json"))
            value = json.loads(snapshot.read_text(encoding="utf-8"))
            value["text"] += "CORRUPTION"
            snapshot.write_text(json.dumps(value), encoding="utf-8")
            original["worker_results"][0]["errors"].append({"code": "worker_exception", "type": "TimeoutError"})
            result = verify_case(root, 1, 1, original["worker_results"])
            self.assertFalse(result["ok"])
            codes = {item["code"] for item in result["errors"]}
            self.assertTrue({"snapshot_exactness_or_provenance", "restore_or_search_failed",
                             "worker_reported_failure"}.issubset(codes), codes)

    def test_invalid_or_excessive_workload_is_rejected_before_processes(self):
        for counts, writes, timeout in (((0,), 1, 30), ((17,), 1, 30), ((1, 1), 1, 30),
                                       ((True,), 1, 30), ((1,), 0, 30), ((1,), 9, 30),
                                       ((1,), True, 30), ((1,), 1, 0), ((1,), 1, 181)):
            with self.assertRaises(ValueError):
                run_stress(counts, writes, timeout)


if __name__ == "__main__":
    unittest.main()
