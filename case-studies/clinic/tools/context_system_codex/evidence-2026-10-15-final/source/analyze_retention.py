"""Independent, model-free audit of supported retention evaluation event logs.

Reads controller manifests/reports, their explicitly listed supported JSONL logs,
participant artifacts, and adapter-owned snapshots. Never parses private Codex
transcripts or modifies a running experiment. Replayed cumulative totals across
process restarts are maxed, not summed. Native summaries/billing remain opaque.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path

from retention_fixture import make_fixture, grade_task

TOOL_TYPES = frozenset({"commandExecution", "fileChange", "mcpToolCall", "dynamicToolCall",
    "webSearch", "imageGeneration", "computerUse", "collabToolCall", "collabAgentToolCall"})
MODEL_TYPES = frozenset({"reasoning", "agentMessage", "dynamicToolCall"})


def sha(text):
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def json_read(path):
    return json.loads(Path(path).read_text(encoding="utf-8-sig"))


def hook_envelope_bytes(text):
    value = {"hookSpecificOutput": {"hookEventName": "SessionStart", "additionalContext": text}}
    return len((json.dumps(value, ensure_ascii=False, separators=(",", ":")) + "\n").encode("utf-8"))


def read_events(paths, base):
    events, failures = [], []
    for number, name in enumerate(paths):
        path = Path(name)
        if not path.is_absolute():
            path = base / path
        try:
            with path.open(encoding="utf-8-sig") as stream:
                for line_number, line in enumerate(stream, 1):
                    try:
                        event = json.loads(line)
                        if not isinstance(event, dict) or not isinstance(event.get("message"), dict):
                            raise ValueError("Invalid supported event record")
                        event = {**event, "audit_order": len(events), "log_index": number,
                                 "log_path": str(path), "line_number": line_number}
                        events.append(event)
                    except (ValueError, TypeError) as error:
                        failures.append({"code": "invalid_log_record", "path": str(path),
                                         "line": line_number, "message": str(error)})
        except OSError as error:
            failures.append({"code": "unreadable_log", "path": str(path), "message": str(error)})
    return events, failures


def reference(event):
    return {"log": event["log_path"], "sequence": event.get("sequence"),
            "line": event["line_number"], "audit_order": event["audit_order"]}


def incoming(events, method=None, sid=None):
    for event in events:
        msg = event["message"]
        if event.get("direction") != "in" or (method is not None and msg.get("method") != method):
            continue
        if sid is not None and msg.get("params", {}).get("threadId") != sid:
            continue
        yield event


def rpc_pairs(events):
    pending, pairs = {}, []
    for event in events:
        msg = event["message"]
        key = (event["log_index"], msg.get("id"))
        if event.get("direction") == "out" and "method" in msg and "id" in msg:
            pending[key] = event
        elif event.get("direction") == "in" and "id" in msg and ("result" in msg or "error" in msg):
            sent = pending.pop(key, None)
            if sent is not None:
                pairs.append((sent, event))
    return pairs


def usage_audit(events, sid):
    maxima, samples, failures = {"input": 0, "output": 0}, [], []
    seen, previous_by_log, raw_count = set(), {}, 0
    for event in incoming(events, "thread/tokenUsage/updated", sid):
        raw_count += 1
        p = event["message"]["params"]
        usage = p.get("tokenUsage", {})
        total, last = usage.get("total", {}), usage.get("last", {})
        values = [total.get("inputTokens"), total.get("outputTokens")]
        if not all(type(value) is int and value >= 0 for value in values):
            failures.append({"code": "invalid_cumulative_usage", **reference(event)})
            continue
        prior = previous_by_log.get(event["log_index"])
        if prior and any(value < old for value, old in zip(values, prior)):
            failures.append({"code": "cumulative_usage_regressed", **reference(event)})
        if event["log_index"] not in previous_by_log and event["log_index"] > 0:
            if values[0] < maxima["input"] or values[1] < maxima["output"]:
                failures.append({"code": "resume_cumulative_usage_reset", **reference(event)})
        previous_by_log[event["log_index"]] = values
        maxima["input"] = max(maxima["input"], values[0])
        maxima["output"] = max(maxima["output"], values[1])
        key = (sid, values[0])
        request = last.get("inputTokens")
        if key in seen or type(request) is not int or request <= 0:
            continue
        seen.add(key)
        capacity = usage.get("modelContextWindow")
        samples.append({**reference(event), "turn_id": p.get("turnId"),
            "input_tokens": request, "capacity": capacity, "cumulative_input": values[0],
            "capacity_fraction": request / capacity if type(capacity) is int and capacity > 0 else None})
    return {"ordinary_input": maxima["input"], "ordinary_output": maxima["output"],
            "raw_updates": raw_count, "requests": samples,
            "peak_request_capacity_fraction": max((s["capacity_fraction"] for s in samples
                if s["capacity_fraction"] is not None), default=0), "failures": failures}


def exact(expected, actual):
    if type(expected) is not type(actual):
        return False
    if isinstance(expected, list):
        return len(expected) == len(actual) and all(exact(e, a) for e, a in zip(expected, actual))
    if isinstance(expected, dict):
        return set(expected) == set(actual) and all(exact(v, actual[k]) for k, v in expected.items())
    return expected == actual


def final_answer(events, sid, turn_id):
    entries = [e["message"]["params"]["item"] for e in incoming(events, "item/completed", sid)
               if e["message"]["params"].get("turnId") == turn_id
               and e["message"]["params"].get("item", {}).get("type") == "agentMessage"]
    named = [e.get("text", "") for e in entries if e.get("phase") == "final_answer"]
    text = "\n".join(named if named else [e.get("text", "") for e in entries])
    clean = text.strip()
    if clean.startswith("```") and clean.endswith("```"):
        clean = clean.split("\n", 1)[-1][:-3].strip()
    try:
        parsed = json.loads(clean)
        return text, parsed if isinstance(parsed, dict) else None
    except (ValueError, TypeError):
        return text, None


def tool_attempts(events, sid, turn_id):
    attempts = {}
    for event in incoming(events, sid=sid):
        msg, p = event["message"], event["message"].get("params", {})
        if p.get("turnId") != turn_id:
            continue
        if msg.get("method") in {"hook/started", "hook/completed"} and p.get("run", {}).get("eventName") == "preToolUse":
            attempts[("hook", p["run"].get("id"))] = {"kind": "preToolUse", **reference(event)}
        item = p.get("item", {})
        if msg.get("method") in {"item/started", "item/completed"} and item.get("type") in TOOL_TYPES:
            attempts[("item", item.get("id"))] = {"kind": item["type"], **reference(event)}
    return list(attempts.values())


def execution_proof(events, sid):
    checks = []
    for event in incoming(events, "item/completed", sid):
        item = event["message"]["params"].get("item", {})
        if item.get("type") != "commandExecution" or item.get("exitCode") != 0:
            continue
        command = str(item.get("command", ""))
        direct = bool(re.search(r"check\.py[\s\"']+replay\b", command))
        subprocess_call = "check.py" in command and "subprocess.run" in command and "replay" in command
        if not (direct or subprocess_call):
            continue
        for line in str(item.get("aggregatedOutput", "")).splitlines():
            try:
                output = json.loads(line)
            except ValueError:
                continue
            if (isinstance(output, dict) and output.get("check") == "replay"
                and output.get("valid_structure") is True and output.get("network_contacted") is False
                and isinstance(output.get("selected_event_ids"), list)
                and re.fullmatch(r"[0-9a-f]{64}", str(output.get("source_sha256", "")))):
                checks.append({**reference(event), "turn_id": event["message"]["params"].get("turnId"),
                    "invocation": "direct" if direct else "subprocess.run", "exit_code": 0,
                    "replay_output": output,
                    "scope": "Supported native command and replay stdout; subprocess tree not separately instrumented"})
    return checks


def persistence_audit(events, sid):
    starts, reads, resumes = [], [], []
    for sent, reply in rpc_pairs(events):
        method, p = sent["message"].get("method"), sent["message"].get("params", {})
        result = reply["message"].get("result", {})
        thread = result.get("thread", {})
        if method == "thread/start" and thread.get("id") == sid:
            starts.append({**reference(reply), "ephemeral": thread.get("ephemeral"), "thread_id": sid})
        if method in {"thread/read", "thread/resume"} and p.get("threadId") == sid:
            record = {**reference(reply), "thread_id": thread.get("id"), "ephemeral": thread.get("ephemeral"),
                      "turn_ids": [t.get("id") for t in thread.get("turns", [])]}
            (reads if method == "thread/read" else resumes).append(record)
    completed_before = {e["message"]["params"].get("turn", {}).get("id")
        for e in incoming(events, "turn/completed", sid)
        if reads and e["audit_order"] < reads[-1]["audit_order"]
        and e["message"]["params"].get("turn", {}).get("status") == "completed"}
    saved = bool(reads and completed_before and completed_before <= set(reads[-1]["turn_ids"]))
    same_id = bool(starts and reads and resumes and all(r["thread_id"] == sid
        for r in starts + reads + resumes))
    restarted = bool(reads and starts and reads[-1]["log"] != starts[0]["log"])
    continued = any(e["audit_order"] > resumes[-1]["audit_order"]
        and e["message"]["params"].get("turn", {}).get("status") == "completed"
        for e in incoming(events, "turn/completed", sid)) if resumes else False
    return {"verified": same_id and restarted and saved and continued
            and all(r["ephemeral"] is False for r in starts + reads),
            "start": starts, "reads": reads, "resumes": resumes,
            "saved_completed_turns_verified": saved, "appended_completion_verified": continued}


def registrations_audit(events, manifest, arm):
    expected = 8 if arm == "A" else 1
    target = (Path(manifest["workspace"]) / arm / ".codex/hooks.json").resolve()
    observations = []
    for sent, reply in rpc_pairs(events):
        if sent["message"].get("method") != "hooks/list":
            continue
        data = reply["message"].get("result", {}).get("data", [])
        hooks = [h for entry in data for h in entry.get("hooks", [])]
        own = [h for h in hooks if Path(h.get("sourcePath", "")).resolve() == target]
        foreign = [h for h in hooks if h not in own and h.get("enabled")]
        errors = [err for entry in data for err in entry.get("errors", [])]
        valid = (len(own) == expected and not foreign and not errors
                 and all(h.get("enabled") and h.get("trustStatus") in {"trusted", "managed"} for h in own))
        observations.append({**reference(reply), "expected": expected, "registered": len(own),
            "normally_trusted_enabled": valid, "foreign_enabled_count": len(foreign), "errors": errors})
    return {"verified": bool(observations) and all(o["normally_trusted_enabled"] for o in observations),
            "observations": observations}


def snapshot_records(manifest, arm, sid):
    project = Path(manifest["workspace"]) / arm
    try:
        config = json_read(project / ".codex/context-system.json")
        runtime = Path(config.get("runtime") or ".codex/context-runtime")
        if not runtime.is_absolute():
            runtime = project / runtime
        if not re.fullmatch(r"[A-Za-z0-9_-]+", str(sid)) or not runtime.resolve().is_relative_to(project.resolve()):
            raise ValueError("Snapshot location outside declared project")
        records = []
        for path in (runtime / "sessions" / sid / "snapshots").glob("snapshot_*.json"):
            snap = json_read(path)
            text = snap.get("text")
            blocks = snap.get("blocks", [])
            valid = (isinstance(text, str) and snap.get("session_id") == sid and snap.get("id") == path.stem
                and sha(text) == snap.get("text_sha") and isinstance(blocks, list)
                and all(sha(b.get("text", "")) == b.get("sha") and b.get("text", "") in text for b in blocks))
            records.append({**snap, "audit_path": str(path), "audit_integrity": valid})
        return records, []
    except (OSError, ValueError, TypeError) as error:
        return [], [{"code": "snapshot_read_failed", "message": str(error)}]


def compaction_audit(events, sid, requests, snapshots=None, restore_cap=4096):
    snapshots = snapshots or []
    manual_orders = [e["audit_order"] for e in events if e.get("direction") == "out"
        and e["message"].get("method") == "thread/compact/start"
        and e["message"].get("params", {}).get("threadId") == sid]
    starts, boundaries, used, previous_order = {}, [], set(), -1
    for event in incoming(events, sid=sid):
        msg, p = event["message"], event["message"].get("params", {})
        item = p.get("item", {})
        if msg.get("method") == "item/started" and item.get("type") == "contextCompaction":
            starts[(p.get("turnId"), item.get("id"))] = event
        if msg.get("method") != "item/completed" or item.get("type") != "contextCompaction":
            continue
        begin = starts.get((p.get("turnId"), item.get("id")))
        tail = [e for e in incoming(events, sid=sid) if e["audit_order"] > event["audit_order"]]
        first = next((e for e in tail if e["message"].get("method") in {"item/started", "item/completed"}
            and e["message"].get("params", {}).get("item", {}).get("type") in MODEL_TYPES), None)
        fill = [r for r in requests if previous_order < r["audit_order"] < event["audit_order"]]
        boundary = {**reference(event), "turn_id": p.get("turnId"), "item_id": item.get("id"),
            "automatic": not any(previous_order < order < (begin["audit_order"] if begin else event["audit_order"])
                                   for order in manual_orders),
            "lifecycle_valid": bool(begin and begin["audit_order"] < event["audit_order"]),
            "pre_boundary_peak_request_capacity_fraction": max((r["capacity_fraction"] for r in fill
                if r["capacity_fraction"] is not None), default=0),
            "first_observable_model_output": reference(first) if first else None,
            "restoration_valid": None}
        if snapshots:
            delivered = next((e for e in tail if e["message"].get("method") == "hook/completed"
                and e["message"].get("params", {}).get("run", {}).get("eventName") == "sessionStart"
                and any(x.get("kind") == "context" for x in e["message"]["params"]["run"].get("entries", []))), None)
            texts = [x.get("text", "") for x in delivered["message"]["params"]["run"].get("entries", [])
                     if x.get("kind") == "context"] if delivered else []
            text = texts[0] if len(texts) == 1 else None
            matched = [s for s in snapshots if s.get("turn_id") == p.get("turnId")
                       and text is not None and s.get("text_sha") == sha(text)]
            snap = matched[0] if len(matched) == 1 else None
            fresh = bool(snap and snap.get("id") not in used)
            if snap:
                used.add(snap.get("id"))
            boundary.update(checkpoint_id=snap.get("id") if snap else None,
                restored_text_sha256=sha(text) if text is not None else None,
                restored_utf8_bytes=len(text.encode("utf-8")) if text is not None else None,
                reconstructed_envelope_bytes=hook_envelope_bytes(text) if text is not None else None,
                restoration_event=reference(delivered) if delivered else None,
                no_omitted_blocks=bool(snap and not snap.get("omitted") and not snap.get("problem")),
                restoration_valid=bool(begin and delivered and first and snap and snap["audit_integrity"] and fresh
                    and delivered["audit_order"] < first["audit_order"]
                    and hook_envelope_bytes(text) <= restore_cap and not snap.get("omitted") and not snap.get("problem")))
        previous_order = event["audit_order"]
        boundaries.append(boundary)
    return boundaries


def analyze_episode(ep, manifest, base):
    sid, arm = ep.get("thread_id"), ep["arm"]
    events, failures = read_events(ep.get("events", []), base)
    usage = usage_audit(events, sid)
    failures.extend(usage.pop("failures"))
    for field, reported in (("ordinary_input", ep.get("ordinary_input")), ("ordinary_output", ep.get("ordinary_output"))):
        if reported != usage[field]:
            failures.append({"code": "reported_usage_mismatch", "field": field, "reported": reported, "raw": usage[field]})
    fixture = make_fixture(seed=1730 if arm == "control" else manifest["seed"])
    probes = []
    observed_turns = {r["turn_id"] for r in usage["requests"]}
    for phase in ep.get("phases", []):
        turn_id = phase["turn_id"]
        if turn_id not in observed_turns:
            failures.append({"code": "phase_usage_missing", "phase": phase["name"]})
        if phase.get("mode") == "probe" and tool_attempts(events, sid, turn_id):
            failures.append({"code": "no_tool_phase_attempted_tool", "phase": phase["name"]})
        if not phase["name"].startswith("memory_probe_"):
            continue
        cycle = int(phase["name"].rsplit("_", 1)[-1])
        keys = manifest["probe_keys"][cycle - 1]
        text, answer = final_answer(events, sid, turn_id)
        matched = {key: bool(answer is not None and exact(fixture.expected_retention[key], answer.get(key))) for key in keys}
        record = {"cycle": cycle, "turn_id": turn_id, "keys": keys, "answer": answer,
            "matched": sum(matched.values()), "total": len(keys), "score": round(100 * sum(matched.values()) / len(keys), 3),
            "per_key": matched, "tool_attempts": tool_attempts(events, sid, turn_id),
            "schema_valid": answer is not None and set(answer) == set(keys)
                and all(type(answer[k]) is type(fixture.expected_retention[k]) for k in keys)}
        prior = next((p for p in ep.get("probes", []) if p.get("cycle") == cycle), None)
        if prior and (prior.get("answer") != answer or prior.get("grade", {}).get("score") != record["score"]):
            failures.append({"code": "reported_probe_mismatch", "cycle": cycle})
        probes.append(record)
    snapshots, snapshot_failures = snapshot_records(manifest, arm, sid) if arm == "A" else ([], [])
    failures.extend(snapshot_failures)
    boundaries = compaction_audit(events, sid, usage["requests"], snapshots, manifest["restore_bytes"])
    persistence = persistence_audit(events, sid)
    registrations = registrations_audit(events, manifest, arm)
    checks = execution_proof(events, sid)
    task = grade_task(Path(manifest["workspace"]) / arm, fixture)
    task["execution_observed"] = bool(checks)
    if ep.get("task_grade", {}).get("execution_observed") != bool(checks):
        failures.append({"code": "execution_observation_mismatch",
            "reported": ep.get("task_grade", {}).get("execution_observed"), "raw": bool(checks),
            "possible_driver_correction": bool(checks)})
    errors = [e for e in incoming(events) if e["message"].get("method") in {"error", "model/rerouted"}]
    failures.extend({"code": "native_error_or_reroute", **reference(e), "method": e["message"]["method"]} for e in errors)
    if ep.get("error"):
        failures.append({"code": "driver_stopped_episode", "error": ep["error"]})
    return {"arm": arm, "thread_id": sid, "run_finished": ep.get("run_finished"),
        "usage": usage, "persistence": persistence, "registrations": registrations,
        "compactions": boundaries, "probes": probes,
        "native_replay_checks": checks, "task_grade": task,
        "matched_retention": sum(p["matched"] for p in probes), "total_retention": sum(p["total"] for p in probes),
        "failures": failures, "reported_measurement_valid": ep.get("measurement_valid")}


def driver_amendments(report):
    """Preserve every reported protocol amendment across driver generations."""
    amendments = []
    for field in ("amendments", "corrections", "driver_amendment",
                  "continuation_amendment", "resume_amendment"):
        value = report.get(field)
        if value is None:
            continue
        for item in value if isinstance(value, list) else [value]:
            if item not in amendments:
                amendments.append(item)
    return amendments


def analyze(report_path):
    report_path = Path(report_path).resolve()
    report = json_read(report_path)
    manifest_path = Path(report["manifest"])
    if not manifest_path.is_absolute():
        manifest_path = report_path.parent / manifest_path
    manifest = json_read(manifest_path)
    failures = []
    if report.get("source_hashes") != manifest.get("source_hashes"):
        failures.append({"code": "report_manifest_source_hash_mismatch"})
    episodes = [analyze_episode(ep, manifest, report_path.parent) for ep in report.get("episodes", [])]
    ordinary_input = sum(e["usage"]["ordinary_input"] for e in episodes)
    ordinary_output = sum(e["usage"]["ordinary_output"] for e in episodes)
    if (ordinary_input, ordinary_output) != (report.get("reported_input"), report.get("reported_output")):
        failures.append({"code": "report_aggregate_usage_mismatch", "raw_input": ordinary_input, "raw_output": ordinary_output})
    arm_set = {e["arm"] for e in episodes}
    complete = arm_set == {"control", "N", "M", "A"} and len(episodes) == 4 and all(e["run_finished"] for e in episodes)
    expected_cycles = manifest["pressure"]["cycles"]
    required = manifest["pressure"]["required_peak_capacity_fraction"]
    normal = complete and all(e["persistence"]["verified"] and e["registrations"]["verified"]
        and not e["failures"] and len(e["compactions"]) >= expected_cycles
        and all(b["automatic"] and b["lifecycle_valid"] and b["pre_boundary_peak_request_capacity_fraction"] >= required
                for b in e["compactions"][:expected_cycles])
        and len(e["probes"]) == expected_cycles and all(not p["tool_attempts"] for p in e["probes"])
        for e in episodes if e["arm"] != "control")
    adapters = [e for e in episodes if e["arm"] == "A"]
    delivery = len(adapters) == 1 and adapters[0]["registrations"]["verified"]
    delivery = delivery and len(adapters[0]["compactions"]) >= expected_cycles and all(
        b["restoration_valid"] for b in adapters[0]["compactions"])
    return {"model_calls": 0, "source_report": str(report_path), "manifest": str(manifest_path),
        "episodes": episodes, "reported_input_including_finished_and_failed_episodes": ordinary_input,
        "reported_output_including_finished_and_failed_episodes": ordinary_output,
        "complete_cohort": complete, "normal_window_verified": normal, "adapter_delivery_verified": delivery,
        "failures": failures, "stopped_by": report.get("stopped_by"),
        "driver_amendments": driver_amendments(report),
        "usage_scope": "Maximum observed ordinary cumulative total per persistent thread across restarts; opaque compaction usage/billing unknown",
        "context_gain_proven": False, "statistical_confirmation": False}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--report", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    if args.output.exists():
        raise ValueError("Preserve prior audits; choose a new output path")
    args.output.write_text(json.dumps(analyze(args.report), ensure_ascii=False, indent=2) + "\n",
                           encoding="utf-8", newline="")
