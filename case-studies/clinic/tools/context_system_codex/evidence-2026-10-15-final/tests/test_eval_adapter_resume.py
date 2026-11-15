import copy
import sys
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import eval_adapter_resume as resume
from retention_fixture import make_fixture


def interrupted_adapter_report():
    names = ["channel_calibration", "orientation", "policy_correction", "evidence_and_scope",
             "history_block_0", "neutral_continuation_1"]
    phases = [{"name": name, "turn_id": "adapter-" + str(i), "status": "completed"}
              for i, name in enumerate(names)]
    phases[-1].update(status="failed", prompt_sha256=resume.base.sha(
        b"Use no tools and leave notes unchanged. Reply only ACK."))
    error = {"code": "server_error", "params": {"threadId": "same-adapter",
        "turnId": "adapter-5", "error": {"codexErrorInfo": "usageLimitExceeded"}}}
    adapter = {"arm": "A", "thread_id": "same-adapter", "ordinary_input": 340920,
        "ordinary_output": 2126, "run_finished": False, "phases": phases,
        "telemetry": [{"errors": [error], "reroutes": [], "stop_reason": None}],
        "pressure_admission": {"verified": True}, "pressure_calls": [{"block": -1}, {"block": 0}],
        "compactions": [], "probes": []}
    return {"reported_input": 3848748, "reported_output": 18658, "episodes": [
        {"arm": "N", "run_finished": True, "ordinary_input": 720036, "ordinary_output": 2471},
        {"arm": "M", "run_finished": True, "ordinary_input": 794310, "ordinary_output": 4327}, adapter]}


class AdapterResumeTests(unittest.TestCase):
    def test_only_exact_adapter_interruption_and_cohort_accounting_are_accepted(self):
        manifest = {"prior_input": 1993482, "prior_output": 9734}
        self.assertEqual(resume.validate_saved(interrupted_adapter_report(), manifest)["arm"], "A")
        for problem in ("cohort_order", "unfinished_control", "phase", "prompt", "failure_status",
                        "wrong_thread", "wrong_turn", "wrong_error", "extra_error", "reroute",
                        "budget_stop", "extra_pressure", "compaction", "probe", "counted_twice"):
            with self.subTest(problem=problem):
                report = interrupted_adapter_report()
                adapter = report["episodes"][2]
                telemetry = adapter["telemetry"][0]
                if problem == "cohort_order":
                    report["episodes"][0], report["episodes"][1] = report["episodes"][1], report["episodes"][0]
                elif problem == "unfinished_control":
                    report["episodes"][0]["run_finished"] = False
                elif problem == "phase":
                    adapter["phases"][-1]["name"] = "neutral_continuation_2"
                elif problem == "prompt":
                    adapter["phases"][-1]["prompt_sha256"] = "different"
                elif problem == "failure_status":
                    adapter["phases"][-1]["status"] = "completed"
                elif problem == "wrong_thread":
                    telemetry["errors"][0]["params"]["threadId"] = "other-thread"
                elif problem == "wrong_turn":
                    telemetry["errors"][0]["params"]["turnId"] = "other-turn"
                elif problem == "wrong_error":
                    telemetry["errors"][0]["params"]["error"]["codexErrorInfo"] = "serverFailed"
                elif problem == "extra_error":
                    telemetry["errors"].append(copy.deepcopy(telemetry["errors"][0]))
                elif problem == "reroute":
                    telemetry["reroutes"].append({"model": "other-model"})
                elif problem == "budget_stop":
                    telemetry["stop_reason"] = "soft_cap:inputTokens"
                elif problem == "extra_pressure":
                    adapter["pressure_calls"].append({"block": 1})
                elif problem == "compaction":
                    adapter["compactions"].append({"item_id": "already-done"})
                elif problem == "probe":
                    adapter["probes"].append({"cycle": 1})
                else:
                    report["reported_input"] += adapter["ordinary_input"]
                with self.assertRaises(ValueError):
                    resume.validate_saved(report, manifest)

    def test_participant_hashes_preserve_completed_controls_and_authored_adapter_notes(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            manifest = {"workspace": str(root), "seed": 1732, "order": ["N", "M", "A"]}
            for arm in manifest["order"]:
                project = root / arm
                make_fixture(project, seed=1732)
                (project / "AGENTS.md").write_bytes(b"synthetic instructions\n")
                (project / ".codex").mkdir()
                (project / ".codex/hooks.json").write_bytes(b"{}\n")
                if arm != "A":
                    (project / "artifacts").mkdir()
                    for name in ("replay.json", "verification.json"):
                        (project / "artifacts" / name).write_bytes(b"{}\n")
            note = root / "A/task.md"
            note.write_bytes(b"agent-authored approved decisions\n")
            before = resume.participant_hashes(manifest)
            self.assertEqual(before[str(note.resolve())], resume.base.sha(note.read_bytes()))
            control = root / "M/artifacts/verification.json"
            self.assertIn(str(control.resolve()), before)
            control.write_bytes(b'{"changed":true}\n')
            after = resume.participant_hashes(manifest)
            self.assertNotEqual(before[str(control.resolve())], after[str(control.resolve())])
            source = root / "A/replay_config.json"
            original = source.read_bytes()
            source.write_bytes(original + b"\n")
            with self.assertRaisesRegex(ValueError, "repair before pressure"):
                resume.participant_hashes(manifest)
            source.write_bytes(original)
            (root / "A/artifacts").mkdir()
            (root / "A/artifacts/replay.json").write_bytes(b"{}\n")
            with self.assertRaisesRegex(ValueError, "artifacts"):
                resume.participant_hashes(manifest)

    def test_adapter_resume_keeps_exact_identity_and_restores_original_manifest(self):
        participant = object.__new__(resume.ResumedA)
        participant.sid = "same-adapter"
        participant.project = Path("synthetic")
        participant.episode = {}
        manifest = {"adapter_saved_turn_ids": ["adapter-" + str(i) for i in range(6)],
                    "adapter_failed_turn_id": "adapter-5", "model": "gpt-6-astra", "effort": "ultra"}
        participant.manifest = manifest
        participant.params = lambda: {}
        calls = []

        def request(method, params):
            calls.append(method)
            if method == "thread/read":
                return {"thread": {"id": participant.sid, "ephemeral": False,
                    "turns": [{"id": turn} for turn in manifest["adapter_saved_turn_ids"]]}}
            if method == "thread/resume":
                return {"thread": {"id": participant.sid}, "model": "gpt-6-astra",
                        "reasoningEffort": "ultra", "instructionSources": []}
            return {"config": {}}

        participant.client = SimpleNamespace(request=request)
        participant.resume_stored()
        self.assertTrue(participant.episode["continuation_persistence"]["failed_turn_retained"])
        self.assertIs(participant.manifest, manifest)
        self.assertEqual(calls, ["thread/read", "thread/resume", "config/read"])

    def test_failed_snapshot_proves_unchanged_authored_notes_and_rejects_tampering(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            project = root / "A"
            project.mkdir()
            notes = b"agent-authored approved decisions\n"
            note_path = project / "task.md"
            note_path.write_bytes(notes)
            session = root / "session"
            snapshots = session / "snapshots"
            snapshots.mkdir(parents=True)
            snapshot_path = snapshots / "snapshot_00000001_owned.json"
            block = "agent-authored approved decisions"
            snapshot = {"session_id": "same-adapter", "turn_id": "adapter-5", "state_file": "task.md",
                "state_sha": resume.base.sha(notes), "problem": "", "omitted": [],
                "text": "rendered checkpoint\n" + block,
                "text_sha": resume.base.sha(("rendered checkpoint\n" + block).encode()),
                "blocks": [{"text": block, "sha": resume.base.sha(block.encode()), "mode": "whole"}]}
            episode = interrupted_adapter_report()["episodes"][2]
            episode["phases"][-1]["task_note_bytes"] = len(notes)
            manifest = {"workspace": str(root)}
            store = SimpleNamespace(_session=lambda sid: session)
            with patch.object(resume.old, "settings", return_value={}), \
                    patch.object(resume.old, "ContextStore", return_value=store):
                resume.write_json(snapshot_path, snapshot)
                evidence = resume.note_evidence(manifest, episode)
                self.assertEqual(evidence["state_sha256"], resume.base.sha(notes))
                self.assertEqual(evidence["snapshot_sha256"], resume.base.sha(snapshot_path.read_bytes()))
                self.assertEqual(evidence["note_bytes"], len(notes))
                note_path.write_bytes(b"X" + notes[1:])
                with self.assertRaisesRegex(ValueError, "integrity"):
                    resume.note_evidence(manifest, episode)
                note_path.write_bytes(notes)
                for problem in ("session", "state_file", "omitted", "problem", "text", "block", "turn",
                                "recomputed_content"):
                    changed = copy.deepcopy(snapshot)
                    if problem == "session":
                        changed["session_id"] = "other-session"
                    elif problem == "state_file":
                        changed["state_file"] = "oracle.md"
                    elif problem == "omitted":
                        changed["omitted"] = ["decisions"]
                    elif problem == "problem":
                        changed["problem"] = "unreadable"
                    elif problem == "text":
                        changed["text"] = "modified checkpoint"
                    elif problem == "block":
                        changed["blocks"][0]["text"] = "modified decisions"
                    elif problem == "recomputed_content":
                        changed["blocks"][0]["text"] = "modified decisions"
                        changed["blocks"][0]["sha"] = resume.base.sha(b"modified decisions")
                        changed["text"] = "rendered checkpoint\nmodified decisions"
                        changed["text_sha"] = resume.base.sha(changed["text"].encode())
                    else:
                        changed["turn_id"] = "other-turn"
                    resume.write_json(snapshot_path, changed)
                    with self.subTest(problem=problem), self.assertRaises(ValueError):
                        resume.note_evidence(manifest, episode)
                resume.write_json(snapshot_path, snapshot)
                resume.write_json(snapshots / "snapshot_00000002_duplicate.json", snapshot)
                with self.assertRaisesRegex(ValueError, "unique"):
                    resume.note_evidence(manifest, episode)


if __name__ == "__main__":
    unittest.main()
