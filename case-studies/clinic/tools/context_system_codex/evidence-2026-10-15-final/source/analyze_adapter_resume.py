"""Audit the same adapter continuation while retaining both quota failures.

Extends the qualified native audit. Only the exact saved adapter quota error may
also be qualified; raw failures remain visible and N/M must remain unchanged.
All usage comes from the combined per-thread cumulative maxima, never from
adding the earlier failed adapter attempt a second time.
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
import analyze_standalone_resume as native
from analyze_retention import incoming, json_read, read_events, reference, usage_audit
from analyze_tool_pressure import resolve


def adapter_history(report, manifest, manifest_path):
    failures = []
    old_path = resolve(manifest["adapter_resume_from_report"], manifest_path.parent)
    old = json_read(old_path)
    if hashlib.sha256(old_path.read_bytes()).hexdigest() != manifest.get("adapter_resume_from_report_sha256"):
        failures.append({"code": "adapter_source_report_hash_mismatch"})
    old_manifest_path = resolve(old["manifest"], old_path.parent)
    original = json_read(old_manifest_path)
    if (resolve(manifest["adapter_original_manifest"], manifest_path.parent).resolve() != old_manifest_path.resolve()
            or hashlib.sha256(old_manifest_path.read_bytes()).hexdigest() != manifest.get("adapter_original_manifest_sha256")):
        failures.append({"code": "adapter_original_manifest_hash_or_path_mismatch"})
    for key in native.PROTOCOL_KEYS + ("resume_from_report", "resume_from_report_sha256", "original_manifest",
            "original_manifest_sha256", "saved_event_hashes", "historical_failed_turn_id", "saved_turn_ids"):
        if manifest.get(key) != original.get(key):
            failures.append({"code": "adapter_resumed_protocol_or_native_provenance_changed", "field": key})
    for key, value in original.get("source_hashes", {}).items():
        if manifest.get("source_hashes", {}).get(key) != value:
            failures.append({"code": "adapter_frozen_source_changed", "path": key})
    for key in ("input", "output", "arm_input", "arm_output"):
        if manifest.get("limits", {}).get(key) != original.get("limits", {}).get(key):
            failures.append({"code": "adapter_resumed_usage_limit_changed", "field": key})
    old_eps = {e["arm"]: e for e in old.get("episodes", [])}
    new_eps = {e["arm"]: e for e in report.get("episodes", [])}
    if (len(old.get("episodes", [])) != 3 or set(old_eps) != {"N", "M", "A"}
            or len(report.get("episodes", [])) != 3 or set(new_eps) != {"N", "M", "A"}):
        return {"verified": False, "failures": failures + [{"code": "adapter_resume_cohort_changed"}],
                "allowed_error": None, "source_report": str(old_path)}
    for arm in ("N", "M"):
        if new_eps[arm] != old_eps[arm] or not old_eps[arm].get("run_finished"):
            failures.append({"code": "completed_control_episode_changed", "arm": arm})
    previous, resumed = old_eps["A"], new_eps["A"]
    sid = previous.get("thread_id")
    if resumed.get("thread_id") != sid:
        failures.append({"code": "adapter_resume_session_changed"})
    if resumed.get("historical_driver_error") != previous.get("error"):
        failures.append({"code": "adapter_historical_driver_error_not_preserved"})
    phases = previous.get("phases", [])
    failed = [p for p in phases if p.get("status") != "completed"]
    if (len(failed) != 1 or failed[0] is not phases[-1] or failed[0].get("name") != "neutral_continuation_1"
            or failed[0].get("status") != "failed"):
        return {"verified": False, "failures": failures + [{"code": "unexpected_adapter_historical_failure"}],
                "allowed_error": None, "source_report": str(old_path)}
    failed = failed[0]
    captured = resumed.get("historical_failed_phases", [])
    if len(captured) != 1 or any(captured[0].get(k) != v for k, v in failed.items()):
        failures.append({"code": "adapter_historical_failed_phase_not_preserved"})
    active, completed = resumed.get("phases", []), phases[:-1]
    if active[:len(completed)] != completed:
        failures.append({"code": "completed_adapter_phase_prefix_changed"})
    tail = active[len(completed):]
    if ([p.get("name") for p in tail] != ["neutral_continuation_1", "memory_probe_1", "history_block_1",
            "neutral_continuation_2", "memory_probe_2", "practical_completion"]
            or any(p.get("status") != "completed" for p in tail)):
        failures.append({"code": "adapter_continuation_phase_sequence_incomplete_or_changed"})
    retries = [p for p in active if p.get("name") == failed["name"]]
    if (len(retries) != 1 or retries[0].get("turn_id") == failed.get("turn_id")
            or retries[0].get("status") != "completed" or retries[0].get("prompt_sha256") != failed.get("prompt_sha256")):
        failures.append({"code": "adapter_neutral_retry_not_canonical_completed"})
    old_calls, new_calls = previous.get("pressure_calls", []), resumed.get("pressure_calls", [])
    if (len(old_calls) != 2 or len(new_calls) != 3 or new_calls[:len(old_calls)] != old_calls
            or new_calls[-1].get("block") != 1):
        failures.append({"code": "adapter_first_pressure_replayed_or_changed"})
    if previous.get("probes") or previous.get("compactions"):
        failures.append({"code": "unexpected_adapter_completed_quality_before_resume"})
    old_logs, new_logs = previous.get("events", []), resumed.get("events", [])
    if not old_logs or new_logs[:len(old_logs)] != old_logs or len(new_logs) <= len(old_logs):
        failures.append({"code": "adapter_original_log_prefix_not_preserved"})
    all_old_logs = {p for e in old_eps.values() for p in e.get("events", [])}
    hashes = manifest.get("adapter_saved_event_hashes", {})
    if set(hashes) != all_old_logs:
        failures.append({"code": "adapter_prior_log_hash_coverage_missing"})
    for name in all_old_logs:
        if hashes.get(name) != hashlib.sha256(resolve(name, old_path.parent).read_bytes()).hexdigest():
            failures.append({"code": "adapter_prior_event_log_hash_mismatch", "path": name})
    events, log_failures = read_events(old_logs, old_path.parent)
    failures.extend(log_failures)
    usage = usage_audit(events, sid)
    failures.extend(usage.pop("failures"))
    if (usage["ordinary_input"], usage["ordinary_output"]) != (previous.get("ordinary_input"), previous.get("ordinary_output")):
        failures.append({"code": "historical_adapter_usage_mismatch"})
    errors = list(incoming(events, "error", sid))
    allowed = None
    if (len(errors) == 1 and errors[0]["message"]["params"].get("turnId") == failed.get("turn_id")
            and errors[0]["message"]["params"].get("error", {}).get("codexErrorInfo") == "usageLimitExceeded"
            and errors[0]["message"]["params"].get("willRetry") is False):
        allowed = reference(errors[0])
    else:
        failures.append({"code": "adapter_historical_quota_error_not_unique_or_exact"})
    claims = [e for t in previous.get("telemetry", []) for e in t.get("errors", [])]
    if (len(claims) != 1 or len(errors) != 1 or claims[0].get("code") != "server_error"
            or claims[0].get("params") != errors[0]["message"]["params"]):
        failures.append({"code": "adapter_historical_reported_error_not_exact"})
    completions = [e for e in incoming(events, "turn/completed", sid)
        if e["message"]["params"].get("turn", {}).get("id") == failed.get("turn_id")]
    if len(completions) != 1 or completions[0]["message"]["params"]["turn"].get("status") != "failed":
        failures.append({"code": "adapter_historical_failed_turn_not_observed"})
    if any(s["turn_id"] == failed.get("turn_id") for s in usage["requests"]):
        failures.append({"code": "adapter_historical_failure_had_new_ordinary_sampling"})
    return {"verified": not failures, "failures": failures, "source_report": str(old_path),
        "adapter_thread_id": sid, "failed_phase": failed, "allowed_error": allowed,
        "original_adapter_usage_already_in_resumed_counter": usage,
        "scope": "Same adapter session after first-neutral quota failure; completed N/M preserved"}


def analyze(report_path):
    report_path = Path(report_path).resolve()
    report = json_read(report_path)
    manifest_path = resolve(report["manifest"], report_path.parent)
    manifest = json_read(manifest_path)
    result = native.analyze(report_path)
    history = adapter_history(report, manifest, manifest_path)
    result["adapter_historical_qualification"] = history
    result["native_qualified_historical_error_count"] = result["qualified_historical_error_count"]
    result["unqualified_adapter_delivery_verified"] = result["adapter_delivery_verified"]
    episodes = copy.deepcopy(result["qualified_episodes"])
    count = 0
    if history["verified"] and history["allowed_error"]:
        for ep in episodes:
            if ep["arm"] == "A" and ep["thread_id"] == history["adapter_thread_id"]:
                remaining = []
                for failure in ep["failures"]:
                    if native.same_reference(failure, history["allowed_error"]):
                        count += 1
                    else:
                        remaining.append(failure)
                ep["failures"] = remaining
    cycles, required = manifest["pressure"]["cycles"], manifest["pressure"]["required_peak_capacity_fraction"]
    adapters = [e for e in episodes if e["arm"] == "A"]
    delivery = bool(len(adapters) == 1 and adapters[0]["run_finished"] and not adapters[0]["failures"]
        and adapters[0]["registrations"]["verified"] and len(adapters[0]["compactions"]) == cycles
        and all(b["restoration_valid"] for b in adapters[0]["compactions"]))
    valid = bool(result["historical_qualification"]["verified"] and result["native_qualified_historical_error_count"] == 1
        and history["verified"] and count == 1 and result["complete_cohort"] and not result["failures"]
        and result["prior_audit"]["completed_control_verified"] and delivery and all(
            not e["failures"] and e["persistence"]["verified"] and e["registrations"]["verified"]
            and e["pressure"]["verified"] and len(e["compactions"]) == cycles
            and all(b["automatic"] and b["lifecycle_valid"] and b["pre_boundary_peak_request_capacity_fraction"] >= required for b in e["compactions"])
            and len(e["probes"]) == cycles and all(not p["tool_attempts"] for p in e["probes"]) for e in episodes))
    result.update(qualified_episodes=episodes, adapter_qualified_historical_error_count=count,
        qualified_historical_error_count=result["native_qualified_historical_error_count"] + count,
        qualified_adapter_delivery_verified=delivery, qualified_normal_window_verified=valid,
        qualified_continuation_verified=valid, normal_window_verified=False, uninterrupted_matched_comparison=False,
        comparison_scope="Same N and A sessions continued after two exact quota interruptions; M uninterrupted; raw failures retained")
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--report", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    if args.output.exists():
        raise ValueError("Preserve prior audits; choose a new output")
    args.output.write_text(json.dumps(analyze(args.report), ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="")
