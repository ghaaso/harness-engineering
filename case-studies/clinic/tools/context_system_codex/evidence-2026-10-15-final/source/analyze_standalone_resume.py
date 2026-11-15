"""Audit a qualified continuation of the frozen standalone-pressure cohort.

The original quota error and failed phase remain evidence. Only that one exact
historical error can be qualified; later errors remain failures. Old N usage is
already included in its resumed cumulative counter and is never added again.
"""
from __future__ import annotations

import argparse
import copy
import hashlib
import json
import os
import sys
from pathlib import Path

sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
import analyze_standalone_pressure as base
from analyze_retention import incoming, json_read, read_events, reference, usage_audit
from analyze_tool_pressure import resolve


PROTOCOL_KEYS = ("workspace", "seed", "model", "effort", "config", "order", "probe_keys",
    "restore_bytes", "notes_bytes", "reported_capacity", "calibration_chars_per_token_estimate",
    "admission_growth_ratio_bounds", "pressure_rpc_cap", "cycles", "pressure", "block_chars",
    "calibration_chars", "max_blocks", "post_compaction_input_cap", "codex_sha256")


def same_reference(failure, allowed):
    return (failure.get("code") == "native_error_or_reroute" and failure.get("method") == "error"
        and os.path.normcase(str(Path(failure.get("log", "")).resolve()))
            == os.path.normcase(str(Path(allowed["log"]).resolve()))
        and failure.get("sequence") == allowed.get("sequence")
        and failure.get("line") == allowed.get("line"))


def historical_qualification(report, manifest, manifest_path):
    failures = []
    old_path = resolve(manifest["resume_from_report"], manifest_path.parent)
    old = json_read(old_path)
    expected_hash = manifest.get("resume_from_report_sha256")
    if hashlib.sha256(old_path.read_bytes()).hexdigest() != expected_hash:
        failures.append({"code": "resume_source_report_hash_mismatch"})
    old_manifest_path = resolve(old["manifest"], old_path.parent)
    old_manifest = json_read(old_manifest_path)
    if (resolve(manifest["original_manifest"], manifest_path.parent).resolve() != old_manifest_path.resolve()
            or hashlib.sha256(old_manifest_path.read_bytes()).hexdigest() != manifest.get("original_manifest_sha256")):
        failures.append({"code": "original_manifest_hash_or_path_mismatch"})
    for key in PROTOCOL_KEYS:
        if manifest.get(key) != old_manifest.get(key):
            failures.append({"code": "resumed_protocol_changed", "field": key})
    for key, value in old_manifest.get("source_hashes", {}).items():
        if manifest.get("source_hashes", {}).get(key) != value:
            failures.append({"code": "frozen_source_changed", "path": key})
    for key in ("input", "output", "arm_input", "arm_output"):
        if manifest.get("limits", {}).get(key) != old_manifest.get("limits", {}).get(key):
            failures.append({"code": "resumed_usage_limit_changed", "field": key})
    originals = old.get("episodes", [])
    current = [e for e in report.get("episodes", []) if e.get("arm") == "N"]
    if len(originals) != 1 or originals[0].get("arm") != "N" or len(current) != 1:
        return {"verified": False, "failures": failures + [{"code": "unexpected_resume_cohort"}],
                "source_report": str(old_path), "allowed_error": None}
    previous, resumed = originals[0], current[0]
    sid = previous.get("thread_id")
    if resumed.get("thread_id") != sid:
        failures.append({"code": "native_resume_session_changed"})
    if resumed.get("historical_driver_error") != previous.get("error"):
        failures.append({"code": "historical_driver_error_not_preserved"})
    phases = previous.get("phases", [])
    failed = [p for p in phases if p.get("status") != "completed"]
    if len(failed) != 1 or failed[0] is not phases[-1] or failed[0].get("name") != "neutral_continuation_2" or failed[0].get("status") != "failed":
        return {"verified": False, "failures": failures + [{"code": "unexpected_historical_failed_phase"}],
                "source_report": str(old_path), "allowed_error": None}
    failed = failed[0]
    captured = resumed.get("historical_failed_phases", report.get("historical_failed_phases", []))
    if len(captured) != 1 or any(captured[0].get(k) != v for k, v in failed.items()):
        failures.append({"code": "historical_failed_phase_not_preserved"})
    active = resumed.get("phases", [])
    completed = phases[:-1]
    if active[:len(completed)] != completed:
        failures.append({"code": "completed_native_phase_prefix_changed"})
    retries = [p for p in active if p.get("name") == failed["name"]]
    if (len(retries) != 1 or retries[0].get("turn_id") == failed.get("turn_id")
            or retries[0].get("status") != "completed"
            or retries[0].get("prompt_sha256") != failed.get("prompt_sha256")):
        failures.append({"code": "neutral_retry_not_canonical_completed"})
    if any(p.get("status") != "completed" for p in active):
        failures.append({"code": "active_resumed_phase_incomplete"})
    if resumed.get("pressure_calls") != previous.get("pressure_calls"):
        failures.append({"code": "native_pressure_repeated_or_changed"})
    original_probes = previous.get("probes", [])
    if resumed.get("probes", [])[:len(original_probes)] != original_probes:
        failures.append({"code": "completed_probe_changed_or_repeated"})
    old_logs, new_logs = previous.get("events", []), resumed.get("events", [])
    if not old_logs or new_logs[:len(old_logs)] != old_logs or len(new_logs) <= len(old_logs):
        failures.append({"code": "native_original_log_prefix_not_preserved"})
    saved_hashes = manifest.get("saved_event_hashes", {})
    if set(saved_hashes) != set(old_logs):
        failures.append({"code": "original_log_hash_coverage_missing"})
    for name in old_logs:
        path = resolve(name, old_path.parent)
        if saved_hashes.get(name) != hashlib.sha256(path.read_bytes()).hexdigest():
            failures.append({"code": "original_event_log_hash_mismatch", "path": name})
    events, log_failures = read_events(old_logs, old_path.parent)
    failures.extend(log_failures)
    usage = usage_audit(events, sid)
    failures.extend(usage.pop("failures"))
    if (usage["ordinary_input"], usage["ordinary_output"]) != (previous.get("ordinary_input"), previous.get("ordinary_output")):
        failures.append({"code": "historical_native_usage_mismatch"})
    errors = list(incoming(events, "error", sid))
    allowed = None
    if (len(errors) == 1 and errors[0]["message"]["params"].get("turnId") == failed.get("turn_id")
            and errors[0]["message"]["params"].get("error", {}).get("codexErrorInfo") == "usageLimitExceeded"
            and errors[0]["message"]["params"].get("willRetry") is False):
        allowed = reference(errors[0])
    else:
        failures.append({"code": "historical_quota_error_not_unique_or_exact"})
    claimed_errors = [e for t in previous.get("telemetry", []) for e in t.get("errors", [])]
    if (len(claimed_errors) != 1 or len(errors) != 1 or claimed_errors[0].get("code") != "server_error"
            or claimed_errors[0].get("params") != errors[0]["message"]["params"]):
        failures.append({"code": "historical_reported_error_not_exact"})
    completions = [e for e in incoming(events, "turn/completed", sid)
        if e["message"]["params"].get("turn", {}).get("id") == failed.get("turn_id")]
    if len(completions) != 1 or completions[0]["message"]["params"]["turn"].get("status") != "failed":
        failures.append({"code": "historical_failed_turn_not_observed"})
    if any(s["turn_id"] == failed.get("turn_id") for s in usage["requests"]):
        failures.append({"code": "historical_failure_had_new_ordinary_sampling"})
    for e in report.get("episodes", []):
        if e.get("arm") in {"M", "A"} and e.get("thread_id") == sid:
            failures.append({"code": "comparison_arm_reused_native_session"})
    return {"verified": not failures, "failures": failures, "source_report": str(old_path),
        "native_thread_id": sid, "failed_phase": failed, "allowed_error": allowed,
        "original_native_usage_already_in_resumed_counter": usage,
        "scope": "One completed-pressure native session resumed after one quota failure; interrupted and asymmetric"}


def analyze(report_path):
    report_path = Path(report_path).resolve()
    report = json_read(report_path)
    manifest_path = resolve(report["manifest"], report_path.parent)
    manifest = json_read(manifest_path)
    result = base.analyze(report_path)
    history = historical_qualification(report, manifest, manifest_path)
    result["historical_qualification"] = history
    result["unqualified_normal_window_verified"] = result["normal_window_verified"]
    qualified = copy.deepcopy(result["episodes"])
    count = 0
    if history["verified"] and history["allowed_error"]:
        for ep in qualified:
            if ep["arm"] == "N" and ep["thread_id"] == history["native_thread_id"]:
                remaining = []
                for failure in ep["failures"]:
                    if same_reference(failure, history["allowed_error"]):
                        count += 1
                    else:
                        remaining.append(failure)
                ep["failures"] = remaining
    cycles, required = manifest["pressure"]["cycles"], manifest["pressure"]["required_peak_capacity_fraction"]
    valid = bool(history["verified"] and count == 1 and result["complete_cohort"] and not result["failures"]
        and result["prior_audit"]["completed_control_verified"] and all(
            not e["failures"] and e["persistence"]["verified"] and e["registrations"]["verified"]
            and e["pressure"]["verified"] and len(e["compactions"]) == cycles
            and all(b["automatic"] and b["lifecycle_valid"] and b["pre_boundary_peak_request_capacity_fraction"] >= required for b in e["compactions"])
            and len(e["probes"]) == cycles and all(not p["tool_attempts"] for p in e["probes"]) for e in qualified)
        and result["adapter_delivery_verified"])
    result.update(qualified_episodes=qualified, qualified_historical_error_count=count,
        qualified_continuation_verified=valid, qualified_normal_window_verified=valid,
        uninterrupted_matched_comparison=False, normal_window_verified=False,
        comparison_scope="Interrupted N continuation versus fresh M/A; original failed phase/error and raw audit retained")
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--report", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    if args.output.exists():
        raise ValueError("Preserve prior audits; choose a new output")
    args.output.write_text(json.dumps(analyze(args.report), ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="")
