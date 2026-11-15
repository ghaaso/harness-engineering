"""Offline audit of supported token snapshots; missing usage remains unknown."""
from __future__ import annotations

import argparse
from collections import defaultdict
import json
import hashlib
from pathlib import Path
import statistics

FIELDS = ("inputTokens", "cachedInputTokens", "cacheWriteInputTokens", "outputTokens",
          "reasoningOutputTokens", "totalTokens")


def restoration_order(events: list[dict], thread_id: str, turn_id: str, expected_sha: str) -> dict:
    """Verify observable delivery before model output; never infer network timing."""
    restored, generated = [], []
    for event in events:
        message = event.get("message", {})
        params = message.get("params", {})
        if event.get("direction") != "in" or params.get("threadId") != thread_id:
            continue
        if message.get("method") == "hook/completed" and params.get("turnId") in {None, turn_id}:
            run = params.get("run", {})
            if run.get("eventName") == "sessionStart":
                for entry in run.get("entries", []):
                    if entry.get("kind") == "context" and hashlib.sha256(entry["text"].encode()).hexdigest() == expected_sha:
                        restored.append(event["sequence"])
        if message.get("method") == "item/started" and params.get("turnId") == turn_id:
            if params.get("item", {}).get("type") in {"reasoning", "agentMessage", "dynamicToolCall"}:
                generated.append(event["sequence"])
    return {"restoration_sequence": min(restored) if restored else None,
            "first_model_output_sequence": min(generated) if generated else None,
            "observable_before_model_output": min(restored) < min(generated) if restored and generated else None,
            "exact_network_request_timing": "not exposed"}


def reconcile(observations: list[dict], compaction_turns: set[str]) -> dict:
    previous = dict.fromkeys(FIELDS, 0)
    positive, duplicate, regressions, unknown, identity_failures = [], 0, [], [], []
    by_turn = defaultdict(lambda: {"notifications": 0, "positive_usage_updates": 0,
                                  "input_delta": 0, "output_delta": 0})
    latest = None
    for observation in observations:
        total, last = observation.get("total", {}), observation.get("last", {})
        turn = observation.get("turn_id")
        by_turn[turn]["notifications"] += 1
        latest = total
        delta = {field: total.get(field) - previous[field]
                 if type(total.get(field)) is int and type(previous[field]) is int else None
                 for field in FIELDS}
        if any(delta.get(field) is None for field in ("inputTokens", "outputTokens", "totalTokens")):
            unknown.append(observation.get("sequence"))
        if any(value is not None and value < 0 for value in delta.values()):
            regressions.append({"sequence": observation.get("sequence"), "turn_id": turn, "delta": delta})
        if all(delta.get(field) == 0 for field in ("inputTokens", "outputTokens", "totalTokens")):
            duplicate += 1
        elif delta.get("inputTokens", 0) is not None and delta.get("inputTokens", 0) >= 0:
            positive.append({"sequence": observation.get("sequence"), "turn_id": turn, "delta": delta,
                             "last": last, "is_compaction_turn": turn in compaction_turns,
                             "delta_input_matches_last": delta.get("inputTokens") == last.get("inputTokens"),
                             "delta_output_matches_last": delta.get("outputTokens") == last.get("outputTokens")})
            by_turn[turn]["positive_usage_updates"] += 1
            by_turn[turn]["input_delta"] += delta.get("inputTokens") or 0
            by_turn[turn]["output_delta"] += delta.get("outputTokens") or 0
        if all(type(total.get(field)) is int for field in ("inputTokens", "outputTokens", "totalTokens")):
            if total["totalTokens"] != total["inputTokens"] + total["outputTokens"]:
                identity_failures.append(observation.get("sequence"))
        previous = {field: total.get(field) for field in FIELDS}
    compactions = {turn: dict(by_turn[turn]) for turn in sorted(compaction_turns)}
    all_compaction_positive = bool(compactions) and all(value["positive_usage_updates"] > 0 for value in compactions.values())
    return {"notifications": len(observations), "duplicate_totals": duplicate,
            "positive_usage_updates": len(positive), "latest_reported_totals": latest,
            "regressions": regressions, "unknown_core_fields_at": unknown,
            "input_plus_output_identity_failures_at": identity_failures,
            "ordinary_and_compaction_turns": dict(by_turn), "compaction_turns": compactions,
            "compaction_usage": "positive runtime usage observed" if all_compaction_positive else "unverified",
            "provider_billing_coverage": "unavailable from this protocol audit",
            "updates": positive}


def analyze(report: dict) -> dict:
    episodes = []
    for episode in report.get("episodes", []):
        compactions = {value["turn_id"] for value in episode.get("compactions", [])}
        thread_id = episode.get("thread_id")
        observations = [value for value in episode.get("telemetry", {}).get("usage_observations", [])
                        if value.get("thread_id") == thread_id]
        audit = reconcile(observations, compactions)
        inputs = [value["last"]["inputTokens"] for value in audit["updates"]
                  if not value["is_compaction_turn"] and type(value["last"].get("inputTokens")) is int]
        payloads = episode.get("hook_payloads", [])
        grading = episode.get("grade") or {}
        boundaries = []
        for compact in episode.get("compactions", []):
            boundary = {"compaction_turn_id": compact["turn_id"],
                        "restoration_turn_id": compact.get("restoration_turn_id"),
                        "checkpoint_sha": compact.get("checkpoint", {}).get("text_sha"),
                        "restoration_matches": compact.get("restoration_matches_checkpoint")}
            boundaries.append(boundary)
        episodes.append({"arm": episode["arm"], "scenario": episode["scenario"],
            "measurement_valid": episode.get("measurement_valid", False),
            "artifact_score": grading.get("score"),
            "critical_failures": grading.get("critical_failures"),
            "token_audit": audit,
            "restoration_boundaries": boundaries,
            "reported_request_input": {"sample_count": len(inputs),
                "median": statistics.median(inputs) if inputs else None,
                "maximum": max(inputs) if inputs else None,
                "scope": "last input on positive normal-work usage updates; not continuous context occupancy"},
            "restoration_text_bytes": [value["text_bytes"] for value in payloads],
            "reconstructed_hook_envelope_bytes": [value["canonical_adapter_envelope_bytes"] for value in payloads],
            "recall_result_bytes": sum(value.get("recall_bytes", 0) for value in episode.get("phases", []))})
    valid = (report.get("measurement_valid", False) and bool(episodes) and
             all(not episode["token_audit"]["regressions"] and
                 not episode["token_audit"]["unknown_core_fields_at"] for episode in episodes))
    return {"kind": "offline reported-token and payload audit", "model_calls": 0,
            "pilot_run_finished": report.get("run_finished", False), "measurement_valid": bool(valid),
            "paired_comparison_complete": bool(valid) and all(
                {episode["arm"] for episode in episodes if episode["scenario"] == scenario} >= {"native", "adapter"}
                for scenario in {episode["scenario"] for episode in episodes}),
            "episodes": episodes, "token_scope": "reported cumulative totals, not independently verified billing",
            "compaction_usage_confirmed": bool(episodes) and all(
                episode["token_audit"]["compaction_usage"] != "unverified" for episode in episodes),
            "descendant_usage": "not exercised",
            "context_gain_proven": False, "efficiency_pass": None,
            "claim_limit": "Short pilot and instrumentation; no held-out quality or smaller-context frontier"}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("report", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    if args.output.exists():
        parser.error("Use a new output path; earlier evidence is preserved")
    result = analyze(json.loads(args.report.read_text(encoding="utf-8-sig")))
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="")
    print(json.dumps({key: result[key] for key in ("measurement_valid", "compaction_usage_confirmed", "context_gain_proven")}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
