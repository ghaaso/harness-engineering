"""Independent supported-event audit of standalone tool-history pressure.

Prior aggregate evidence and its one channel diagnostic are counted once. Only
controller JSONL logs and declared project artifacts/snapshots are inspected.
Ordinary request input is an accounting proxy; private context/billing is opaque.
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
import analyze_tool_pressure as previous
from retention_fixture import deterministic_log


def digest(data):
    return hashlib.sha256(data).hexdigest()


def expected_payload(chars, seed):
    marker = "admission-" + digest(str(seed).encode())[:16]
    text = ("Controller-generated synthetic diagnostic observations.\n"
        + deterministic_log(seed, chars) + "\nEND_MARKER=" + marker + "\n")
    return text, marker


def standalone_outputs(events, sid):
    records = []
    for sent, reply in retention.rpc_pairs(events):
        p = sent["message"].get("params", {})
        if sent["message"].get("method") != "turn/start" or p.get("threadId") != sid or "toolOutput" not in p:
            continue
        tid = reply["message"].get("result", {}).get("turn", {}).get("id")
        supplied = p.get("toolOutput", {})
        notified = [e for e in retention.incoming(events, "item/completed", sid)
            if e["message"]["params"].get("turnId") == tid
            and e["message"]["params"].get("item", {}).get("type") == "functionCallOutput"]
        item = notified[0]["message"]["params"]["item"] if len(notified) == 1 else {}
        _, answer = retention.final_answer(events, sid, tid)
        records.append({"turn_id": tid, "params": p, "supplied": supplied,
            "observed_item": item, "answer": answer, "request": retention.reference(sent),
            "complete_rpc_bytes": len((json.dumps(sent["message"], ensure_ascii=False) + "\n").encode()),
            "no_user_input": p.get("input") == [], "no_tools": not retention.tool_attempts(events, sid, tid)})
    return records


def channel_audit(path):
    path = Path(path).resolve()
    report = retention.json_read(path)
    events, failures = retention.read_events([str(path.with_suffix(".jsonl"))], path.parent)
    sid = report.get("thread_id")
    usage = retention.usage_audit(events, sid)
    failures.extend(usage.pop("failures"))
    if (usage["ordinary_input"], usage["ordinary_output"]) != (report.get("ordinary_input"), report.get("ordinary_output")):
        failures.append({"code": "channel_reported_usage_mismatch"})
    outputs = standalone_outputs(events, sid)
    phases = report.get("phases", [])
    verified = bool(report.get("verified") and not report.get("stopped_by") and len(outputs) == len(phases) == 2)
    for index, record in enumerate(outputs):
        chars = report.get("sizes", [])[index] if index < len(report.get("sizes", [])) else 0
        text, marker = expected_payload(chars, 29401 + index)
        supplied, item = record["supplied"], record["observed_item"]
        exact = (record["no_user_input"] and record["no_tools"] and supplied == {
            "name": "controller_synthetic_diagnostic", "namespace": None, "output": text}
            and item.get("output") == text and item.get("name") == supplied.get("name")
            and item.get("namespace") is None and record["answer"] == {"end_marker": marker})
        before = [r for r in usage["requests"] if r["audit_order"] < record["request"]["audit_order"]]
        after = [r for r in usage["requests"] if r["turn_id"] == record["turn_id"]]
        growth = after[0]["input_tokens"] - before[-1]["input_tokens"] if before and after else None
        ratio = growth / (chars / 2.921413964) if growth is not None and chars else None
        if not exact or ratio is None or not .8 <= ratio <= 1.2:
            failures.append({"code": "channel_admission_unverified", "turn_id": record["turn_id"]})
        record.update(exact_delivery=exact, observed_growth=growth, growth_ratio=ratio)
        record.pop("params")
        record.pop("supplied")
        record.pop("observed_item")
    native_errors = [e for e in retention.incoming(events) if e["message"].get("method") in {"error", "model/rerouted"}]
    if native_errors:
        failures.append({"code": "channel_native_error_or_reroute"})
    return {"source_report": str(path), "thread_id": sid, "usage": usage, "outputs": outputs,
            "verified": bool(verified and not failures), "failures": failures}


def pressure_audit(ep, manifest, base, audited):
    events, _ = retention.read_events(ep.get("events", []), base)
    sid, failures = ep.get("thread_id"), []
    requests = audited["usage"]["requests"]
    outputs = standalone_outputs(events, sid)
    expected_blocks = [-1] + list(range(manifest["pressure"]["cycles"]))
    phases = {p["turn_id"]: p for p in ep.get("phases", [])}
    recorded_calls = {r["turn_id"]: r for r in ep.get("pressure_calls", [])}
    for index, record in enumerate(outputs):
        block = expected_blocks[index] if index < len(expected_blocks) else None
        chars = manifest["calibration_chars"] if block == -1 else manifest["block_chars"]
        text, marker = expected_payload(chars, manifest["seed"] + 30000 + block) if block is not None else (None, None)
        supplied, item = record["supplied"], record["observed_item"]
        phase = phases.get(record["turn_id"], {})
        name = "channel_calibration" if block == -1 else "history_block_" + str(block)
        exact = (block is not None and record["no_user_input"] and record["no_tools"]
            and supplied == {"name": "controller_synthetic_diagnostic", "namespace": None, "output": text}
            and item.get("output") == text and item.get("name") == supplied.get("name")
            and item.get("namespace") is None and record["answer"] == {"end_marker": marker}
            and phase.get("name") == name and phase.get("mode") == "pressure")
        before = [r for r in requests if r["audit_order"] < record["request"]["audit_order"]]
        after = [r for r in requests if r["turn_id"] == record["turn_id"]]
        growth = after[0]["input_tokens"] - before[-1]["input_tokens"] if before and after else None
        completed = [e for e in retention.incoming(events, "turn/completed", sid)
            if e["message"]["params"].get("turn", {}).get("id") == record["turn_id"]]
        end = completed[-1]["audit_order"] if completed else float("inf")
        premature = [b for b in audited["compactions"] if record["request"]["audit_order"] < b["audit_order"] < end]
        ratio = growth / (manifest["block_chars"] / manifest["calibration_chars_per_token_estimate"]) if growth is not None and block != -1 else None
        claim = recorded_calls.get(record["turn_id"], {})
        claim_matches = (claim.get("block") == block and claim.get("text_sha256") == digest(text.encode())
            and claim.get("text_bytes") == len(text.encode()) and claim.get("complete_rpc_bytes") == record["complete_rpc_bytes"]) if text is not None else False
        note_bytes = phase.get("task_note_bytes")
        phase_list = ep.get("phases", [])
        position = next((i for i, p in enumerate(phase_list) if p.get("turn_id") == record["turn_id"]), None)
        previous_note_bytes = phase_list[position - 1].get("task_note_bytes") if position else None
        notes_stable = (claim.get("notes_unchanged") is True and type(note_bytes) is int
            and note_bytes <= manifest["notes_bytes"]
            and (previous_note_bytes is None or previous_note_bytes == note_bytes))
        record.update(block=block, text_bytes=len(text.encode()) if text is not None else None,
            text_sha256=digest(text.encode()) if text is not None else None, exact_delivery=bool(exact),
            within_rpc_cap=record["complete_rpc_bytes"] <= manifest["pressure_rpc_cap"],
            reported_measurement_matches=claim_matches, observed_growth=growth, growth_ratio=ratio,
            premature_compactions=len(premature), reported_note_stability_verified=notes_stable)
        if not exact or not claim_matches or not record["within_rpc_cap"] or not notes_stable:
            failures.append({"code": "standalone_pressure_delivery_invalid", "block": block})
        lo, hi = manifest["admission_growth_ratio_bounds"]
        if block == 0 and (ratio is None or not lo <= ratio <= hi or premature):
            failures.append({"code": "first_large_pressure_admission_unverified", "growth_ratio": ratio})
        for key in ("params", "supplied", "observed_item"):
            record.pop(key)
    if len(outputs) != len(expected_blocks):
        failures.append({"code": "standalone_pressure_blocks_incomplete", "observed": len(outputs), "expected": len(expected_blocks)})
    # The only post-pressure user turns are short neutral continuations/probes/work.
    first_pressure = next((r for r in outputs if r["block"] == 0), None)
    if first_pressure:
        for e in events:
            m, p = e["message"], e["message"].get("params", {})
            if (e.get("direction") != "out" or m.get("method") != "turn/start" or p.get("threadId") != sid
                    or e["audit_order"] < first_pressure["request"]["audit_order"] or "toolOutput" in p):
                continue
            user_bytes = sum(len(i.get("text", "").encode()) for i in p.get("input", []) if isinstance(i, dict))
            if user_bytes > 4096:
                failures.append({"code": "large_user_message_after_pressure", **retention.reference(e), "bytes": user_bytes})
    continuations = []
    for cycle in range(1, manifest["pressure"]["cycles"] + 1):
        phase = next((p for p in ep.get("phases", []) if p["name"] == "neutral_continuation_" + str(cycle)), None)
        samples = [r for r in requests if phase and r["turn_id"] == phase["turn_id"]]
        boundary = audited["compactions"][cycle - 1] if len(audited["compactions"]) >= cycle else None
        probe = next((p for p in audited["probes"] if p["cycle"] == cycle), None)
        probe_samples = [r for r in requests if probe and r["turn_id"] == probe["turn_id"]]
        output_phase = next((p for p in ep.get("phases", []) if p["name"] == "history_block_" + str(cycle - 1)), None)
        valid = bool(phase and boundary and phase.get("mode") == "probe" and samples and probe_samples
            and boundary["turn_id"] == phase["turn_id"] and all(r["audit_order"] > boundary["audit_order"] for r in samples)
            and all(r["input_tokens"] <= manifest["post_compaction_input_cap"] for r in samples)
            and all(r["input_tokens"] <= manifest["post_compaction_input_cap"] for r in probe_samples)
            and all(r["audit_order"] > samples[-1]["audit_order"] for r in probe_samples)
            and output_phase and phase.get("task_note_bytes") == output_phase.get("task_note_bytes")
            and not retention.tool_attempts(events, sid, phase["turn_id"]))
        continuations.append({"cycle": cycle, "verified": valid,
            "neutral_request_inputs": [r["input_tokens"] for r in samples],
            "probe_request_inputs": [r["input_tokens"] for r in probe_samples]})
        if not valid:
            failures.append({"code": "bounded_compacted_continuation_unverified", "cycle": cycle})
    practical = next((p for p in ep.get("phases", []) if p["name"] == "practical_completion"), None)
    if any(c["turn_id"] != (practical or {}).get("turn_id") for c in audited["native_replay_checks"]):
        failures.append({"code": "executable_repair_before_practical_phase"})
    return {"outputs": outputs, "continuations": continuations, "failures": failures,
            "verified": bool(outputs) and not failures,
            "scope": "Exact standalone function output and observed request growth; no large user-message pressure"}


def analyze(report_path):
    report_path = Path(report_path).resolve()
    report = retention.json_read(report_path)
    manifest_path = previous.resolve(report["manifest"], report_path.parent)
    manifest = retention.json_read(manifest_path)
    prior_path = previous.resolve(manifest["prior_report"], manifest_path.parent)
    channel_path = previous.resolve(manifest["channel_report"], manifest_path.parent)
    prior, channel = previous.analyze(prior_path), channel_audit(channel_path)
    failures = []
    for field, path in (("prior_report", prior_path), ("channel_report", channel_path)):
        if digest(path.read_bytes()) != manifest.get(field + "_sha256"):
            failures.append({"code": field + "_hash_mismatch"})
    if report.get("source_hashes") != manifest.get("source_hashes"):
        failures.append({"code": "report_manifest_source_hash_mismatch"})
    prior_usage = {"input": prior["reported_input_including_all_attempts"] + channel["usage"]["ordinary_input"],
                   "output": prior["reported_output_including_all_attempts"] + channel["usage"]["ordinary_output"]}
    for field in ("input", "output"):
        if prior_usage[field] != manifest.get("prior_" + field):
            failures.append({"code": "prior_aggregate_usage_mismatch", "field": field, "raw": prior_usage[field]})
    if prior["failures"] or not channel["verified"]:
        failures.append({"code": "prior_accounting_or_channel_unverified"})
    episodes = []
    for ep in report.get("episodes", []):
        audited = retention.analyze_episode(ep, manifest, report_path.parent)
        audited["pressure"] = pressure_audit(ep, manifest, report_path.parent, audited)
        audited["failures"].extend(audited["pressure"]["failures"])
        episodes.append(audited)
    cohort = previous.unique_usage(episodes)
    total = {field: prior_usage[field] + cohort[field] for field in ("input", "output")}
    for field in ("input", "output"):
        if total[field] != report.get("reported_" + field) or cohort[field] != report.get("cohort_" + field):
            failures.append({"code": "reported_aggregate_usage_mismatch", "field": field, "raw": total[field]})
    previous_ids = {e["thread_id"] for e in prior["episodes"] + prior["prior_episodes"]} | {channel["thread_id"]}
    fresh = len({e["thread_id"] for e in episodes}) == len(episodes) and all(e["thread_id"] not in previous_ids for e in episodes)
    complete = (len(episodes) == 3 and {e["arm"] for e in episodes} == {"N", "M", "A"}
        and fresh and all(e["run_finished"] for e in episodes))
    cycles, required = manifest["pressure"]["cycles"], manifest["pressure"]["required_peak_capacity_fraction"]
    normal = bool(complete and not failures and prior["completed_control_verified"] and all(
        not e["failures"] and e["persistence"]["verified"] and e["registrations"]["verified"]
        and e["pressure"]["verified"] and len(e["compactions"]) == cycles
        and all(b["automatic"] and b["lifecycle_valid"] and b["pre_boundary_peak_request_capacity_fraction"] >= required for b in e["compactions"])
        and len(e["probes"]) == cycles and all(not p["tool_attempts"] for p in e["probes"]) for e in episodes))
    adapters = [e for e in episodes if e["arm"] == "A"]
    delivery = bool(len(adapters) == 1 and adapters[0]["run_finished"] and not adapters[0]["failures"]
        and adapters[0]["registrations"]["verified"] and len(adapters[0]["compactions"]) == cycles
        and all(b["restoration_valid"] for b in adapters[0]["compactions"]))
    return {"model_calls": 0, "source_report": str(report_path), "manifest": str(manifest_path),
        "prior_report_counted_once": str(prior_path), "channel_report_counted_once": str(channel_path),
        "prior_audit": prior, "channel_audit": channel, "episodes": episodes,
        "reported_input_including_all_attempts": total["input"], "reported_output_including_all_attempts": total["output"],
        "cohort_reported_usage": cohort, "complete_cohort": complete, "fresh_thread_ids_verified": fresh,
        "normal_window_verified": normal, "adapter_delivery_verified": delivery, "failures": failures,
        "stopped_by": report.get("stopped_by"), "amendment": manifest.get("amendment"),
        "soft_budget_overshoot": {field: max(0, total[field] - manifest["limits"][field]) for field in ("input", "output")},
        "requests_exceeding_reported_capacity": [{"arm": e["arm"], **s} for e in episodes for s in e["usage"]["requests"]
            if s["capacity_fraction"] is not None and s["capacity_fraction"] > 1],
        "context_measurement_scope": "Reported request input is a proxy; restore bytes exclude native summary; compaction usage and billing unknown",
        "context_gain_proven": False, "statistical_confirmation": False}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--report", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    if args.output.exists():
        raise ValueError("Preserve prior audits; choose a new output")
    args.output.write_text(json.dumps(analyze(args.report), ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="")
