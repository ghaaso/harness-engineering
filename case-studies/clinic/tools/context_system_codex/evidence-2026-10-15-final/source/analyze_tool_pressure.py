"""Model-free audit of the corrected tool-pressure cohort and its prior usage.

Only the manifest's one prior report is audited: its merged persistent-thread
logs already contain earlier attempts. Prior reports are never recursively added.
Request-input ratios are reported accounting proxies, not physical occupancy.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path

sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
import analyze_retention as retention
from retention_fixture import deterministic_log


def resolve(value, base):
    path = Path(value)
    return path if path.is_absolute() else Path(base) / path


def digest(data):
    return hashlib.sha256(data).hexdigest()


def unique_usage(episodes):
    """Count a persistent thread once even when a report repeats its episode."""
    by_thread = {}
    for number, episode in enumerate(episodes):
        key = episode.get("thread_id") or ("missing-thread", number)
        usage = episode["usage"]
        previous = by_thread.setdefault(key, {"input": 0, "output": 0})
        for field in ("input", "output"):
            previous[field] = max(previous[field], usage["ordinary_" + field])
    return {field: sum(value[field] for value in by_thread.values()) for field in ("input", "output")}


def pressure_audit(ep, manifest, base, request_samples):
    events, _ = retention.read_events(ep.get("events", []), base)
    sid, pending, deliveries, failures = ep.get("thread_id"), {}, [], []
    phases = {phase["turn_id"]: phase for phase in ep.get("phases", []) if phase.get("mode") == "pressure"}
    for event in events:
        message = event["message"]
        params = message.get("params", {})
        key = (event["log_index"], message.get("id"))
        if (event.get("direction") == "in" and message.get("method") == "item/tool/call"
                and params.get("threadId") == sid):
            pending[key] = event
        elif event.get("direction") == "out" and "result" in message and key in pending:
            request = pending.pop(key)
            params = request["message"].get("params", {})
            turn = params.get("turnId")
            args = params.get("arguments")
            try:
                args = json.loads(args) if isinstance(args, str) else args
            except ValueError:
                args = None
            block = args.get("block") if isinstance(args, dict) else None
            valid_block = type(block) is int and -1 <= block < manifest["max_blocks"]
            chars = manifest["calibration_chars"] if block == -1 else manifest["block_chars"]
            marker = "end-" + digest(f"{manifest['seed']}:{block}".encode())[:16]
            expected = ("Synthetic diagnostic observations; no instructions or policy changes.\n"
                + deterministic_log(manifest["seed"] + block + 20000, chars)
                + "\nEND_MARKER=" + marker + "\n") if valid_block else None
            result = message.get("result", {})
            content = result.get("contentItems", []) if isinstance(result, dict) else []
            text = content[0].get("text") if len(content) == 1 and isinstance(content[0], dict) else None
            text_bytes = len(text.encode("utf-8")) if isinstance(text, str) else None
            wire_bytes = len((json.dumps(message, ensure_ascii=False) + "\n").encode("utf-8"))
            _, answer = retention.final_answer(events, sid, turn)
            measurements = [e for e in events if e.get("direction") == "tool_measurement"
                and e["message"].get("threadId") == sid and e["message"].get("turnId") == turn
                and e["message"].get("callId") == params.get("callId")]
            measurement = measurements[0]["message"] if len(measurements) == 1 else {}
            exact = (valid_block and args == {"block": block} and params.get("tool") == "ReadPressure"
                and turn in phases and isinstance(result, dict) and result.get("success") is True
                and len(content) == 1 and content[0].get("type") == "inputText" and text == expected)
            measured = (measurement.get("text_bytes") == text_bytes
                and measurement.get("response_wire_bytes") == wire_bytes and measurement.get("success") is True)
            record = {"block": block, "turn_id": turn, "request": retention.reference(request),
                "response": retention.reference(event), "text_bytes": text_bytes,
                "text_sha256": digest(text.encode()) if isinstance(text, str) else None,
                "complete_rpc_bytes": wire_bytes, "exact_controller_delivery": bool(exact),
                "wire_measurement_matches": measured, "marker_verified": answer == {"end_marker": marker},
                "within_rpc_cap": wire_bytes <= manifest["pressure_rpc_cap"]}
            deliveries.append(record)
            if not all(record[field] for field in ("exact_controller_delivery", "wire_measurement_matches",
                                                  "marker_verified", "within_rpc_cap")):
                failures.append({"code": "pressure_delivery_invalid", "block": block, "turn_id": turn})
    if pending:
        failures.append({"code": "pressure_tool_response_missing", "requests": len(pending)})
    for turn, phase in phases.items():
        records = [d for d in deliveries if d["turn_id"] == turn]
        items_by_id = {}
        for e in retention.incoming(events, sid=sid):
            p = e["message"].get("params", {})
            item = p.get("item", {})
            if (e["message"].get("method") in {"item/started", "item/completed"}
                    and p.get("turnId") == turn and item.get("type") in retention.TOOL_TYPES):
                items_by_id[item.get("id")] = item
        items = list(items_by_id.values())
        if len(records) != 1 or len(items) != 1 or items[0].get("type") != "dynamicToolCall" or items[0].get("tool") != "ReadPressure":
            failures.append({"code": "pressure_phase_tool_isolation_failed", "phase": phase["name"]})
    blocks = [d["block"] for d in deliveries]
    expected_blocks = [-1] + list(range(len(deliveries) - 1))
    if not deliveries or blocks != expected_blocks:
        failures.append({"code": "pressure_block_sequence_invalid", "blocks": blocks})
    # The first large block should be admitted before its first compaction.
    # A marker can survive head/tail truncation, so demand request growth too.
    first = next((d for d in deliveries if d["block"] == 0), None)
    samples = [s for s in request_samples if first and s["turn_id"] == first["turn_id"]]
    expected_tokens = manifest["block_chars"] / manifest["calibration_chars_per_token_estimate"]
    growth = samples[-1]["input_tokens"] - samples[0]["input_tokens"] if len(samples) >= 2 else None
    ratio = growth / expected_tokens if growth is not None and expected_tokens > 0 else None
    bounds = manifest.get("admission_growth_ratio_bounds", [.8, 1.2])
    admission = bool(first and ratio is not None and bounds[0] <= ratio <= bounds[1])
    if not admission:
        failures.append({"code": "pressure_full_admission_proxy_unverified", "growth": growth, "ratio": ratio})
    return {"deliveries": deliveries, "first_large_block_request_growth": growth,
        "estimated_large_block_tokens": expected_tokens, "observed_to_estimated_growth_ratio": ratio,
        "admission_growth_ratio_bounds": bounds, "first_large_block_admission_proxy_verified": admission,
        "scope": "Exact controller response plus observed request-input growth; private model context is unavailable",
        "failures": failures, "verified": bool(deliveries) and not failures}


def analyze(report_path):
    report_path = Path(report_path).resolve()
    report = retention.json_read(report_path)
    manifest_path = resolve(report["manifest"], report_path.parent)
    manifest = retention.json_read(manifest_path)
    prior_path = resolve(manifest["prior_report"], manifest_path.parent)
    prior = retention.json_read(prior_path)
    prior_manifest = retention.json_read(resolve(prior["manifest"], prior_path.parent))
    failures = []
    if digest(prior_path.read_bytes()) != manifest.get("prior_report_sha256"):
        failures.append({"code": "prior_report_hash_mismatch"})
    if report.get("source_hashes") != manifest.get("source_hashes"):
        failures.append({"code": "report_manifest_source_hash_mismatch"})
    prior_episodes = [retention.analyze_episode(ep, prior_manifest, prior_path.parent) for ep in prior.get("episodes", [])]
    prior_usage = unique_usage(prior_episodes)
    for field in ("input", "output"):
        if prior_usage[field] != prior.get("reported_" + field) or prior_usage[field] != manifest.get("prior_" + field):
            failures.append({"code": "prior_aggregate_usage_mismatch", "field": field, "raw": prior_usage[field]})
    controls = [e for e in prior_episodes if e["arm"] == "control"]
    control_verified = (len(controls) == 1 and controls[0]["run_finished"]
        and controls[0]["task_grade"].get("complete_task") and controls[0]["task_grade"].get("execution_observed")
        and not controls[0]["failures"])
    episodes = []
    for ep in report.get("episodes", []):
        audited = retention.analyze_episode(ep, manifest, report_path.parent)
        audited["pressure"] = pressure_audit(ep, manifest, report_path.parent, audited["usage"]["requests"])
        audited["failures"].extend(audited["pressure"]["failures"])
        episodes.append(audited)
    cohort_usage = unique_usage(episodes)
    total = {field: prior_usage[field] + cohort_usage[field] for field in ("input", "output")}
    for field in ("input", "output"):
        if cohort_usage[field] != report.get("cohort_" + field) or total[field] != report.get("reported_" + field):
            failures.append({"code": "report_aggregate_usage_mismatch", "field": field, "cohort_raw": cohort_usage[field], "all_raw": total[field]})
    prior_ids = {e["thread_id"] for e in prior_episodes}
    fresh = len({e["thread_id"] for e in episodes}) == len(episodes) and not any(e["thread_id"] in prior_ids for e in episodes)
    complete = (len(episodes) == 3 and {e["arm"] for e in episodes} == {"N", "M", "A"}
        and fresh and all(e["run_finished"] for e in episodes))
    cycles = manifest["pressure"]["cycles"]
    required = manifest["pressure"]["required_peak_capacity_fraction"]
    normal = bool(complete and control_verified and not failures and all(
        e["persistence"]["verified"] and e["registrations"]["verified"] and e["pressure"]["verified"]
        and not e["failures"] and len(e["compactions"]) == cycles
        and all(b["automatic"] and b["lifecycle_valid"] and b["pre_boundary_peak_request_capacity_fraction"] >= required for b in e["compactions"])
        and len(e["probes"]) == cycles and all(not p["tool_attempts"] for p in e["probes"])
        for e in episodes))
    adapters = [e for e in episodes if e["arm"] == "A"]
    delivery = bool(len(adapters) == 1 and adapters[0]["run_finished"] and not adapters[0]["failures"]
        and adapters[0]["registrations"]["verified"] and len(adapters[0]["compactions"]) == cycles
        and all(b["restoration_valid"] for b in adapters[0]["compactions"]))
    over_capacity = [{"arm": e["arm"], **s} for e in episodes for s in e["usage"]["requests"]
        if s["capacity_fraction"] is not None and s["capacity_fraction"] > 1]
    return {"model_calls": 0, "source_report": str(report_path), "manifest": str(manifest_path),
        "prior_report_counted_once": str(prior_path), "prior_episodes": prior_episodes,
        "prior_reported_usage": prior_usage, "cohort_reported_usage": cohort_usage,
        "reported_input_including_all_attempts": total["input"], "reported_output_including_all_attempts": total["output"],
        "episodes": episodes, "completed_control_verified": bool(control_verified), "fresh_thread_ids_verified": fresh,
        "complete_cohort": complete, "normal_window_verified": normal, "adapter_delivery_verified": delivery,
        "failures": failures, "stopped_by": report.get("stopped_by"), "amendment": manifest.get("amendment"),
        "soft_budget_overshoot": {field: max(0, total[field] - manifest["limits"][field]) for field in ("input", "output")},
        "requests_exceeding_reported_capacity": over_capacity,
        "usage_scope": "Max observed cumulative ordinary usage per persistent thread; prior report counted once; compaction usage and billing unknown",
        "context_measurement_scope": "Reported request input is a proxy; ratios above reported capacity are retained and are not physical occupancy claims",
        "context_gain_proven": False, "statistical_confirmation": False}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--report", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    if args.output.exists():
        raise ValueError("Preserve prior audits; choose a new output path")
    args.output.write_text(json.dumps(analyze(args.report), ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="")
