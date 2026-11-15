"""Finish the same adapter session after its one first-compaction quota failure.

Completed N/M arms stay immutable. No fact intake or first pressure replay. The
two quota interruptions remain explicit; cumulative participant maxima count once.
"""
from __future__ import annotations
import argparse
import copy
import sys
import time
from pathlib import Path

sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
import eval_standalone_pressure as base
import eval_standalone_resume as native
import eval_retention as old
from retention_fixture import make_fixture, probe_prompt, grade_retention, task_prompt
from storage import read_json, write_json


def validate_saved(report, manifest):
    if [e["arm"] for e in report["episodes"]] != ["N", "M", "A"]:
        raise ValueError("Require exact preserved N/M/A cohort")
    if not all(e["run_finished"] for e in report["episodes"][:2]):
        raise ValueError("Completed control arms required")
    ep = report["episodes"][2]
    expected = ["channel_calibration", "orientation", "policy_correction", "evidence_and_scope", "history_block_0", "neutral_continuation_1"]
    if [p["name"] for p in ep["phases"]] != expected:
        raise ValueError("Unexpected saved adapter phase sequence")
    failed = ep["phases"][-1]
    if (failed["status"] != "failed" or failed["prompt_sha256"] != base.sha(native.PROMPT.encode())
            or any(p["status"] != "completed" for p in ep["phases"][:-1])):
        raise ValueError("Unexpected adapter failure/prompt")
    errors = [e for t in ep["telemetry"] for e in t["errors"]]
    if len(errors) != 1 or errors[0].get("code") != "server_error":
        raise ValueError("Unexpected adapter telemetry error")
    p = errors[0]["params"]
    if (p.get("threadId") != ep["thread_id"] or p.get("turnId") != failed["turn_id"]
            or p.get("error", {}).get("codexErrorInfo") != "usageLimitExceeded"):
        raise ValueError("Only exact saved adapter quota failure is resumable")
    if any(t["reroutes"] or t["stop_reason"] for t in ep["telemetry"]):
        raise ValueError("Adapter reroute/budget stop")
    if not ep["pressure_admission"]["verified"] or len(ep["pressure_calls"]) != 2 or ep["compactions"] or ep["probes"]:
        raise ValueError("Unexpected prior adapter pressure/cycle state")
    for field in ("input", "output"):
        if report["reported_" + field] != manifest["prior_" + field] + sum(e["ordinary_" + field] for e in report["episodes"]):
            raise ValueError("Saved all-in usage mismatch")
    return ep


def participant_hashes(manifest):
    fixture = make_fixture(seed=manifest["seed"])
    hashes = {}
    for arm in manifest["order"]:
        project = Path(manifest["workspace"]) / arm
        names = list(fixture.initial_files) + ["AGENTS.md", ".codex/hooks.json"]
        if arm != "A":
            names += ["artifacts/replay.json", "artifacts/verification.json"]
        else:
            for name, contents in fixture.initial_files.items():
                if name != "task.md" and (project / name).read_bytes() != contents.encode():
                    raise ValueError("Adapter performed repair before pressure")
            if any((project / "artifacts").glob("*")):
                raise ValueError("Adapter artifacts unexpectedly present")
        for name in names:
            path = (project / name).resolve()
            hashes[str(path)] = base.sha(path.read_bytes())
    return hashes


def note_evidence(manifest, episode):
    project = Path(manifest["workspace"]) / "A"
    notes = (project / "task.md").read_bytes()
    store = old.ContextStore(**old.settings(project))
    matches = []
    for path in (store._session(episode["thread_id"]) / "snapshots").glob("snapshot_*.json"):
        doc = read_json(path)
        if doc.get("turn_id") == episode["phases"][-1]["turn_id"]:
            matches.append((path, doc))
    if len(matches) != 1:
        raise ValueError("Require unique failed-compaction snapshot for authored notes")
    path, doc = matches[0]
    blocks = doc.get("blocks", [])
    if (doc.get("session_id") != episode["thread_id"] or doc.get("state_file") != "task.md"
            or doc.get("state_sha") != base.sha(notes) or doc.get("problem") or doc.get("omitted")
            or len(notes) != episode["phases"][-1]["task_note_bytes"]
            or doc.get("text_sha") != base.sha(doc.get("text", "").encode())
            or len(blocks) != 1 or blocks[0].get("mode") != "whole" or blocks[0].get("text") != notes.decode("utf-8").strip()
            or any(b.get("sha") != base.sha(b.get("text", "").encode()) for b in blocks)):
        raise ValueError("Authored adapter notes/snapshot integrity mismatch")
    return {"snapshot_file": str(path), "snapshot_sha256": base.sha(path.read_bytes()),
        "state_sha256": base.sha(notes), "note_bytes": len(notes), "failed_turn_id": doc["turn_id"]}


def prepare(prior_report, manifest_path):
    prior_report, manifest_path = Path(prior_report).resolve(), Path(manifest_path).resolve()
    if manifest_path.exists():
        raise ValueError("Preserve continuation manifests")
    report = read_json(prior_report)
    source_manifest = Path(report["manifest"])
    m = read_json(source_manifest)
    ep = validate_saved(report, m)
    for path, digest in m["source_hashes"].items():
        if base.sha(Path(path).read_bytes()) != digest:
            raise ValueError("Executed continuation source changed")
    if base.sha(Path(m["codex"]).read_bytes()) != m["codex_sha256"]:
        raise ValueError("Runtime changed")
    notes = Path(m["workspace"]) / "A/task.md"
    if len(notes.read_bytes()) != ep["phases"][-1]["task_note_bytes"]:
        raise ValueError("Adapter notes changed after failed compaction")
    m = copy.deepcopy(m)
    m.update(live_started=False, source_hashes=base.sources(), adapter_resume_from_report=str(prior_report),
        adapter_resume_from_report_sha256=base.sha(prior_report.read_bytes()), adapter_original_manifest=str(source_manifest),
        adapter_original_manifest_sha256=base.sha(source_manifest.read_bytes()),
        adapter_saved_turn_ids=[p["turn_id"] for p in ep["phases"]], adapter_failed_turn_id=ep["phases"][-1]["turn_id"],
        adapter_saved_event_hashes={p: base.sha(Path(p).read_bytes()) for e in report["episodes"] for p in e["events"]},
        participant_file_hashes=participant_hashes(m), adapter_authored_note_evidence=note_evidence(m, ep),
        prior_active_elapsed_seconds=report["active_elapsed_seconds"],
        adapter_continuation_amendment="Same A session after exactly one first-neutral remote compaction quota failure; completed N/M are unchanged. Preserve authored notes, failed native turn and full errors. Retry only exact neutral1, then probe1, original second pressure, neutral2, probe2 and native practical work. No first pressure/fact replay. Both N and A interruptions remain explicit; maxima count once, stopped gaps excluded only from remaining active allowance. Original wall limit failed.")
    native.resume_allowance(m, report, ep)
    write_json(manifest_path, m)
    return m


class ResumedA(native.ResumedN):
    def __init__(self, manifest, prior, *args):
        base.StandaloneEpisode.__init__(self, manifest, "A", *args)
        self.prior_episode = copy.deepcopy(prior)
        self.episode = copy.deepcopy(prior)
        self.episode["historical_failed_phases"] = [self.episode["phases"].pop()]
        self.episode["historical_driver_error"] = self.episode.pop("error")
        self.episode["original_attempt_measurement_valid"] = self.episode["measurement_valid"]
        self.pressure_calls = copy.deepcopy(prior["pressure_calls"])
        self.sid = prior["thread_id"]
        self.resume_baseline = {"input": prior["ordinary_input"], "output": prior["ordinary_output"]}

    def resume_stored(self):
        original = self.manifest
        self.manifest = {**original, "saved_turn_ids": original["adapter_saved_turn_ids"],
            "historical_failed_turn_id": original["adapter_failed_turn_id"]}
        try:
            super().resume_stored()
        finally:
            self.manifest = original


def run(manifest_path, output):
    manifest_path, output = Path(manifest_path).resolve(), Path(output).resolve()
    m = read_json(manifest_path)
    if m["live_started"] or output.exists() or m["source_hashes"] != base.sources():
        raise ValueError("Used/changed adapter continuation")
    for field in ("adapter_resume_from_report", "adapter_original_manifest", "resume_from_report", "original_manifest", "prior_report", "channel_report"):
        if base.sha(Path(m[field]).read_bytes()) != m[field + "_sha256"]:
            raise ValueError("Frozen evidence changed: " + field)
    for path, digest in {**m["adapter_saved_event_hashes"], **m["participant_file_hashes"]}.items():
        if base.sha(Path(path).read_bytes()) != digest:
            raise ValueError("Preserved evidence/participant file changed")
    if base.sha(Path(m["codex"]).read_bytes()) != m["codex_sha256"]:
        raise ValueError("Runtime changed")
    saved = read_json(Path(m["adapter_resume_from_report"]))
    prior = validate_saved(saved, m)
    if note_evidence(m, prior) != m["adapter_authored_note_evidence"]:
        raise ValueError("Captured authored-note evidence changed")
    allowance = native.resume_allowance(m, saved, prior)
    m["live_started"] = True
    write_json(manifest_path, m)
    logs = output.parent / (output.stem + "-events")
    logs.mkdir()
    result = copy.deepcopy(saved)
    result.update(manifest=str(manifest_path), source_hashes=m["source_hashes"], stopped_by=None, run_finished=False,
        adapter_resume_from_report=m["adapter_resume_from_report"], adapter_continuation_amendment=m["adapter_continuation_amendment"])
    began = time.monotonic()
    ep = ResumedA(m, prior, Path(m["codex"]), logs, allowance, output)
    try:
        ep.open_client()
        ep.resume_stored()
        for cycle in (1, 2):
            if cycle == 2:
                ep.pressure(1, m["block_chars"])
            notes = (ep.project / "task.md").read_bytes()
            ep.turn("neutral_continuation_" + str(cycle), native.PROMPT, "probe")
            boundaries = ep.boundaries()
            if (len(boundaries) != cycle or not boundaries[-1]["lifecycle_valid"] or not boundaries[-1]["restoration_valid"]
                    or boundaries[-1]["checkpoint_omitted"] or boundaries[-1]["checkpoint_problem"]):
                raise RuntimeError("Fresh complete automatic adapter restoration not established")
            if (ep.project / "task.md").read_bytes() != notes or ep.client.usage(ep.sid)["last"]["inputTokens"] > m["post_compaction_input_cap"]:
                raise RuntimeError("Compacted adapter notes/context invalid")
            keys = m["probe_keys"][cycle - 1]
            answer = ep.turn("memory_probe_" + str(cycle), probe_prompt(keys), "probe")
            if ep.client.usage(ep.sid)["last"]["inputTokens"] > m["post_compaction_input_cap"]:
                raise RuntimeError("Adapter probe exceeds context cap")
            parsed = old.final_reply(answer)
            ep.episode["probes"].append({"cycle": cycle, "keys": keys, "answer": parsed,
                "grade": grade_retention(parsed, ep.fixture, keys),
                "ordinary_request_input": ep.client.usage(ep.sid)["last"]["inputTokens"], "boundary": boundaries[-1]})
        ep.turn("practical_completion", task_prompt())
        ep.episode["run_finished"] = True
    except Exception as error:
        result["stopped_by"] = type(error).__name__ + ": " + str(error)
        ep.episode["error"] = {"type": type(error).__name__, "message": str(error)}
    finally:
        adapter = ep.close()
        adapter["continuation_measurement_valid"] = bool(adapter["per_phase_usage_verified"] and all(
            not c.report()["errors"] and not c.report()["reroutes"] and not c.report()["stop_reason"] for c in ep.clients))
        result["episodes"][2] = adapter
        for field in ("input", "output"):
            result["cohort_" + field] = sum(e["ordinary_" + field] for e in result["episodes"])
            result["reported_" + field] = m["prior_" + field] + result["cohort_" + field]
        result["active_elapsed_seconds"] = m["prior_active_elapsed_seconds"] + time.monotonic() - began
        result["run_finished"] = all(e["run_finished"] for e in result["episodes"])
        result["normal_window_verified"] = False
        result["qualified_measurement_pending_independent_audit"] = result["run_finished"]
        write_json(output, result)
    return result


if __name__ == "__main__":
    p = argparse.ArgumentParser(description=__doc__)
    sub = p.add_subparsers(dest="command", required=True)
    prep = sub.add_parser("prepare")
    prep.add_argument("--prior-report", type=Path, required=True)
    prep.add_argument("--manifest", type=Path, required=True)
    live = sub.add_parser("run")
    live.add_argument("--manifest", type=Path, required=True)
    live.add_argument("--output", type=Path, required=True)
    args = p.parse_args()
    if args.command == "prepare":
        prepare(args.prior_report, args.manifest)
    else:
        with old.stay_awake():
            report = run(args.manifest, args.output)
        print(report["stopped_by"] or "Adapter continuation finished", flush=True)
        raise SystemExit(0 if report["run_finished"] else 1)
