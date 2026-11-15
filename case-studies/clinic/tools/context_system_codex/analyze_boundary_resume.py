"""Independently audit the callback-selection correction and continued A session.

Frozen reports and raw failures remain intact. This auditor selects a unique
same-turn snapshot match among all callbacks before model output, without using
the live driver's matching helper. Only the two previously exact quota failures
are qualified; the local verifier error is retained as separate evidence.
"""
from __future__ import annotations

import argparse
import copy
import hashlib
import json
import sys
from pathlib import Path

sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
import analyze_adapter_resume as adapter
import analyze_retention as retention
from analyze_tool_pressure import resolve

_ORIGINAL_COMPACTION_AUDIT = retention.compaction_audit
VERIFIER_ERROR = {"type": "RuntimeError", "message": "Fresh complete automatic adapter restoration not established"}


def matching_compaction_audit(events, sid, requests, snapshots=None, restore_cap=4096):
    """Repair restoration matching only; retain original lifecycle observations."""
    boundaries = _ORIGINAL_COMPACTION_AUDIT(events, sid, requests, snapshots, restore_cap)
    if not snapshots:
        return boundaries
    used = set()
    for boundary in boundaries:
        original = {key: copy.deepcopy(boundary.get(key)) for key in (
            "restoration_valid", "checkpoint_id", "restoration_event", "restored_text_sha256",
            "restored_utf8_bytes", "reconstructed_envelope_bytes", "no_omitted_blocks")}
        first = boundary.get("first_observable_model_output")
        candidates, matches = [], []
        for event in retention.incoming(events, "hook/completed", sid):
            if not (first and boundary["audit_order"] < event["audit_order"] < first["audit_order"]):
                continue
            run = event["message"].get("params", {}).get("run", {})
            if run.get("eventName") != "sessionStart":
                continue
            texts = [entry.get("text", "") for entry in run.get("entries", []) if entry.get("kind") == "context"]
            if not texts:
                continue
            linked = []
            if len(texts) == 1:
                linked = [snap for snap in snapshots if snap.get("turn_id") == boundary["turn_id"]
                    and snap.get("text_sha") == retention.sha(texts[0])]
            observation = {**retention.reference(event), "hook_status": run.get("status"),
                "context_entry_count": len(texts), "text_sha256": [retention.sha(text) for text in texts],
                "utf8_bytes": sum(len(text.encode("utf-8")) for text in texts),
                "reconstructed_envelope_bytes": sum(retention.hook_envelope_bytes(text) for text in texts),
                "same_turn_snapshot_matches": [snap.get("id") for snap in linked]}
            candidates.append(observation)
            for snap in linked:
                matches.append((event, run, texts[0], snap))
        selected = matches[0] if len(matches) == 1 else None
        event, run, text, snap = selected if selected else (None, {}, None, None)
        fresh = bool(snap and snap.get("id") not in used)
        if snap:
            used.add(snap.get("id"))
        valid = bool(boundary["lifecycle_valid"] and first and selected and run.get("status") == "completed"
            and snap.get("audit_integrity") and fresh and not snap.get("omitted") and not snap.get("problem")
            and retention.hook_envelope_bytes(text) <= restore_cap)
        all_bytes = sum(candidate["reconstructed_envelope_bytes"] for candidate in candidates)
        boundary.update(original_first_callback_verdict=original,
            checkpoint_id=snap.get("id") if snap else None,
            restoration_event=retention.reference(event) if event else None,
            restored_text_sha256=retention.sha(text) if text is not None else None,
            restored_utf8_bytes=len(text.encode("utf-8")) if text is not None else None,
            reconstructed_envelope_bytes=retention.hook_envelope_bytes(text) if text is not None else None,
            no_omitted_blocks=bool(snap and not snap.get("omitted") and not snap.get("problem")),
            restoration_valid=valid, callback_candidates=candidates, snapshot_matching_pair_count=len(matches),
            all_pre_model_context_utf8_bytes=sum(candidate["utf8_bytes"] for candidate in candidates),
            all_pre_model_reconstructed_envelope_bytes=all_bytes,
            all_pre_model_context_within_restore_cap=all_bytes <= restore_cap,
            byte_scope="Checkpoint cap applies to selected restore; all additional SessionStart context is reported separately")
    return boundaries


def boundary_history(report, manifest, manifest_path):
    failures = []
    old_path = resolve(manifest["boundary_resume_from_report"], manifest_path.parent)
    old = retention.json_read(old_path)
    if hashlib.sha256(old_path.read_bytes()).hexdigest() != manifest.get("boundary_resume_from_report_sha256"):
        failures.append({"code": "boundary_source_report_hash_mismatch"})
    source_path = resolve(old["manifest"], old_path.parent)
    source = retention.json_read(source_path)
    if (resolve(manifest["boundary_original_manifest"], manifest_path.parent).resolve() != source_path.resolve()
            or hashlib.sha256(source_path.read_bytes()).hexdigest() != manifest.get("boundary_original_manifest_sha256")):
        failures.append({"code": "boundary_original_manifest_hash_or_path_mismatch"})
    provenance = ("resume_from_report", "resume_from_report_sha256", "original_manifest", "original_manifest_sha256",
        "saved_event_hashes", "historical_failed_turn_id", "saved_turn_ids", "adapter_resume_from_report",
        "adapter_resume_from_report_sha256", "adapter_original_manifest", "adapter_original_manifest_sha256",
        "adapter_failed_turn_id", "adapter_saved_event_hashes", "prior_input", "prior_output")
    for key in adapter.native.PROTOCOL_KEYS + provenance:
        if source.get(key) != manifest.get(key):
            failures.append({"code": "boundary_protocol_or_quota_provenance_changed", "field": key})
    for name, digest in source.get("source_hashes", {}).items():
        if manifest.get("source_hashes", {}).get(name) != digest:
            failures.append({"code": "boundary_frozen_source_changed", "path": name})
    for key in ("input", "output", "arm_input", "arm_output"):
        if source.get("limits", {}).get(key) != manifest.get("limits", {}).get(key):
            failures.append({"code": "boundary_usage_limit_changed", "field": key})
    old_eps = {e["arm"]: e for e in old.get("episodes", [])}
    new_eps = {e["arm"]: e for e in report.get("episodes", [])}
    if (len(old.get("episodes", [])) != 3 or set(old_eps) != {"N", "M", "A"}
            or len(report.get("episodes", [])) != 3 or set(new_eps) != {"N", "M", "A"}):
        return {"verified": False, "failures": failures + [{"code": "boundary_cohort_changed"}]}
    for arm in ("N", "M"):
        if new_eps[arm] != old_eps[arm] or not old_eps[arm].get("run_finished"):
            failures.append({"code": "boundary_completed_control_changed", "arm": arm})
    previous, resumed = old_eps["A"], new_eps["A"]
    sid = previous.get("thread_id")
    if resumed.get("thread_id") != sid:
        failures.append({"code": "boundary_adapter_session_changed"})
    if previous.get("error") != VERIFIER_ERROR or resumed.get("historical_verifier_error") != previous.get("error"):
        failures.append({"code": "boundary_exact_verifier_error_not_preserved"})
    for key in ("historical_driver_error", "historical_failed_phases"):
        if resumed.get(key) != previous.get(key):
            failures.append({"code": "boundary_quota_episode_evidence_changed", "field": key})
    prefix = previous.get("phases", [])
    if ([p.get("name") for p in prefix] != ["channel_calibration", "orientation", "policy_correction",
            "evidence_and_scope", "history_block_0", "neutral_continuation_1"]
            or any(p.get("status") != "completed" for p in prefix) or previous.get("probes")):
        failures.append({"code": "unexpected_boundary_source_stage"})
    active = resumed.get("phases", [])
    if active[:len(prefix)] != prefix:
        failures.append({"code": "boundary_completed_phase_prefix_changed"})
    if ([p.get("name") for p in active[len(prefix):]] != ["memory_probe_1", "history_block_1",
            "neutral_continuation_2", "memory_probe_2", "practical_completion"]
            or any(p.get("status") != "completed" for p in active[len(prefix):])):
        failures.append({"code": "boundary_continuation_incomplete_or_replayed"})
    old_calls, new_calls = previous.get("pressure_calls", []), resumed.get("pressure_calls", [])
    if len(old_calls) != 2 or len(new_calls) != 3 or new_calls[:2] != old_calls or new_calls[-1].get("block") != 1:
        failures.append({"code": "boundary_pressure_replayed_or_changed"})
    old_logs, new_logs = previous.get("events", []), resumed.get("events", [])
    if not old_logs or new_logs[:len(old_logs)] != old_logs or len(new_logs) <= len(old_logs):
        failures.append({"code": "boundary_prior_log_prefix_changed"})
    all_logs = {p for e in old_eps.values() for p in e.get("events", [])}
    hashes = manifest.get("boundary_saved_event_hashes", {})
    if set(hashes) != all_logs:
        failures.append({"code": "boundary_prior_log_hash_coverage_missing"})
    for name in all_logs:
        if hashes.get(name) != hashlib.sha256(resolve(name, old_path.parent).read_bytes()).hexdigest():
            failures.append({"code": "boundary_prior_event_log_hash_mismatch", "path": name})
    events, event_failures = retention.read_events(old_logs, old_path.parent)
    failures.extend(event_failures)
    usage = retention.usage_audit(events, sid)
    failures.extend(usage.pop("failures"))
    if (usage["ordinary_input"], usage["ordinary_output"]) != (previous.get("ordinary_input"), previous.get("ordinary_output")):
        failures.append({"code": "boundary_prior_usage_mismatch"})
    snapshots, snapshot_failures = retention.snapshot_records(manifest, "A", sid)
    failures.extend(snapshot_failures)
    boundaries = matching_compaction_audit(events, sid, usage["requests"], snapshots, manifest["restore_bytes"])
    if (len(boundaries) != 1 or not boundaries[0]["restoration_valid"]
            or boundaries[0]["original_first_callback_verdict"]["restoration_valid"] is not False
            or boundaries[0]["turn_id"] != (prefix[-1].get("turn_id") if prefix else None)):
        failures.append({"code": "boundary_original_verifier_misclassification_not_proven"})
    last_log = [e for e in events if e["log_index"] == len(old_logs) - 1]
    if any(retention.incoming(last_log, "error", sid)):
        failures.append({"code": "boundary_latest_turn_had_native_error"})
    completions = [e for e in retention.incoming(events, "turn/completed", sid)
        if e["message"]["params"].get("turn", {}).get("id") == (prefix[-1].get("turn_id") if prefix else None)]
    if len(completions) != 1 or completions[0]["message"]["params"]["turn"].get("status") != "completed":
        failures.append({"code": "boundary_successful_neutral_not_observed"})
    return {"verified": not failures, "failures": failures, "source_report": str(old_path),
        "historical_local_verifier_error": previous.get("error"), "original_reported_boundaries": previous.get("compactions"),
        "independently_repaired_prior_boundaries": boundaries,
        "original_adapter_usage_already_in_resumed_counter": usage,
        "scope": "Completed first neutral kept unchanged; continue from probe1 without facts, pressure0, or neutral1 replay"}


def analyze(report_path):
    report_path = Path(report_path).resolve()
    report = retention.json_read(report_path)
    manifest_path = resolve(report["manifest"], report_path.parent)
    manifest = retention.json_read(manifest_path)
    previous_function = retention.compaction_audit
    try:
        retention.compaction_audit = matching_compaction_audit
        result = adapter.analyze(report_path)
    finally:
        retention.compaction_audit = previous_function
    history = boundary_history(report, manifest, manifest_path)
    prior_verdict = result["qualified_normal_window_verified"]
    result.update(boundary_historical_qualification=history,
        prior_quota_qualified_normal_window_verified=prior_verdict,
        qualified_normal_window_verified=bool(prior_verdict and history["verified"]),
        qualified_continuation_verified=bool(prior_verdict and history["verified"]),
        qualified_local_verifier_correction_count=int(history["verified"]),
        normal_window_verified=False, uninterrupted_matched_comparison=False,
        comparison_scope="Same N/A sessions after two exact quota interruptions; A continued from an already completed neutral after independently proven callback verifier error; all raw failures retained")
    result["all_adapter_pre_model_context_within_restore_cap"] = bool(
        result["qualified_adapter_delivery_verified"] and all(b["all_pre_model_context_within_restore_cap"]
            for ep in result["qualified_episodes"] if ep["arm"] == "A" for b in ep["compactions"]))
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--report", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    if args.output.exists():
        raise ValueError("Preserve prior audits; choose a new output")
    args.output.write_text(json.dumps(analyze(args.report), ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="")
