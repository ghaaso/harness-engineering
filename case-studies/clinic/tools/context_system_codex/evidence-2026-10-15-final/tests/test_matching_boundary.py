import copy
import sys
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import matching_boundary as matching
from engine import ContextStore
from storage import write_json


SID = "evaluation-session"
TURN = "continuation-turn"


def item(sequence, method, kind, identifier, turn=TURN):
    return {"sequence": sequence, "direction": "in", "message": {"method": method,
        "params": {"threadId": SID, "turnId": turn,
                   "item": {"type": kind, "id": identifier}}}}


def hook(sequence, text, turn=TURN):
    return {"sequence": sequence, "direction": "in", "message": {"method": "hook/completed",
        "params": {"threadId": SID, "turnId": turn, "run": {"eventName": "sessionStart",
            "status": "completed", "entries": [{"kind": "context", "text": text}]}}}}


class MatchingBoundaryTests(unittest.TestCase):
    def fixture(self, root, snapshot_turn=TURN, notes="# Current state\nRetain approved choice.\n"):
        (root / "task.md").write_text(notes, encoding="utf-8", newline="")
        store = ContextStore(root, root / ".runtime", "task.md")
        store.focus(SID, "task.md")
        manifest = store.snapshot(SID, snapshot_turn)
        return store, manifest

    def events(self, manifest):
        return [item(30, "item/started", "contextCompaction", "compact-1"),
                item(40, "item/completed", "contextCompaction", "compact-1"),
                hook(42, "Deferred ordinary startup instructions."),
                hook(44, manifest["text"]), item(49, "item/started", "agentMessage", "answer-1")]

    def test_matches_exact_restore_after_an_earlier_startup_callback(self):
        with tempfile.TemporaryDirectory() as directory:
            store, manifest = self.fixture(Path(directory))
            result, = matching.automatic_boundaries(SimpleNamespace(events=self.events(manifest)), SID, store)
            self.assertTrue(result["restoration_valid"])
            self.assertEqual(result["restoration_sequence"], 44)
            self.assertEqual(result["first_model_output_sequence"], 49)
            self.assertEqual(result["restoration_candidate_count"], 2)
            self.assertEqual(result["restoration_match_count"], 1)
            self.assertEqual(result["checkpoint_id"], manifest["id"])
            self.assertLessEqual(result["restoration_bytes"], 4096)

    def test_duplicate_stale_late_missing_or_wrong_turn_delivery_is_denied(self):
        for problem in ("duplicate", "stale", "late", "missing", "wrong_turn", "early", "failed_hook"):
            with self.subTest(problem=problem), tempfile.TemporaryDirectory() as directory:
                store, manifest = self.fixture(Path(directory), "older-turn" if problem == "stale" else TURN)
                events = self.events(manifest)
                if problem == "duplicate":
                    events.insert(4, hook(45, manifest["text"]))
                elif problem == "late":
                    events[3]["sequence"] = 52
                    events.sort(key=lambda e: e["sequence"])
                elif problem == "missing":
                    events.pop(3)
                elif problem == "wrong_turn":
                    events[3]["message"]["params"]["turnId"] = "other-turn"
                elif problem == "early":
                    events[3]["sequence"] = 39
                    events.sort(key=lambda e: e["sequence"])
                elif problem == "failed_hook":
                    events[3]["message"]["params"]["run"]["status"] = "failed"
                result, = matching.automatic_boundaries(SimpleNamespace(events=events), SID, store)
                self.assertFalse(result["restoration_valid"])

    def test_missing_start_or_model_continuation_is_denied(self):
        for index in (0, 4):
            with self.subTest(index=index), tempfile.TemporaryDirectory() as directory:
                store, manifest = self.fixture(Path(directory))
                events = self.events(manifest)
                events.pop(index)
                result, = matching.automatic_boundaries(SimpleNamespace(events=events), SID, store)
                self.assertFalse(result["restoration_valid"])

    def test_native_consequential_item_before_restore_prevents_acceptance(self):
        with tempfile.TemporaryDirectory() as directory:
            store, manifest = self.fixture(Path(directory))
            events = self.events(manifest)
            events.insert(3, item(43, "item/started", "commandExecution", "premature-command"))
            result, = matching.automatic_boundaries(SimpleNamespace(events=events), SID, store)
            self.assertFalse(result["restoration_valid"])
            self.assertEqual(result["first_model_output_sequence"], 43)

    def test_ambiguous_snapshot_or_incomplete_or_corrupt_checkpoint_is_denied(self):
        for problem in ("duplicate_snapshot", "omitted", "problem", "corrupt"):
            with self.subTest(problem=problem), tempfile.TemporaryDirectory() as directory:
                store, manifest = self.fixture(Path(directory))
                path = store._session(SID) / "snapshots" / (manifest["id"] + ".json")
                changed = copy.deepcopy(manifest)
                if problem == "duplicate_snapshot":
                    changed["id"] = "snapshot_00000002_" + "a" * 32
                    path = path.with_name(changed["id"] + ".json")
                elif problem == "omitted":
                    changed["omitted"] = ["decision"]
                elif problem == "problem":
                    changed["problem"] = "Unreadable task state"
                else:
                    changed["text_sha"] = "wrong-checksum"
                write_json(path, changed)
                result, = matching.automatic_boundaries(SimpleNamespace(events=self.events(manifest)), SID, store)
                self.assertFalse(result["restoration_valid"])

    def test_one_checkpoint_cannot_validate_two_compactions(self):
        with tempfile.TemporaryDirectory() as directory:
            store, manifest = self.fixture(Path(directory))
            events = self.events(manifest)
            events += [item(60, "item/started", "contextCompaction", "compact-2"),
                       item(70, "item/completed", "contextCompaction", "compact-2"),
                       hook(74, manifest["text"]), item(79, "item/started", "agentMessage", "answer-2")]
            results = matching.automatic_boundaries(SimpleNamespace(events=events), SID, store)
            self.assertEqual(len(results), 2)
            self.assertTrue(all(not row["restoration_valid"] for row in results))
            self.assertTrue(all("freshness_problem" in row for row in results))

    def test_restore_above_complete_envelope_limit_is_denied(self):
        with tempfile.TemporaryDirectory() as directory:
            store, manifest = self.fixture(Path(directory), notes="# Current state\n" + "x" * 4500)
            result, = matching.automatic_boundaries(SimpleNamespace(events=self.events(manifest)), SID, store)
            self.assertGreater(result["restoration_bytes"], 4096)
            self.assertFalse(result["restoration_valid"])


if __name__ == "__main__":
    unittest.main()
