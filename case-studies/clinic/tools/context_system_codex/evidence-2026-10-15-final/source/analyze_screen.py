"""Model-free, independent summaries of the screen's supported event logs."""
from __future__ import annotations

import argparse
import json
from pathlib import Path


def analyze(report_path):
    report = json.loads(report_path.read_text(encoding="utf-8"))
    logdir = report_path.parent / (report_path.stem + "-events")
    summaries = []
    attempts = [(e, True) for e in report["episodes"]] + [(e, False) for e in report.get("excluded_failed_attempts", [])]
    for i, (episode, primary) in enumerate(attempts):
        log = Path(episode.get("event_log") or logdir / f"{i + 1:02d}-{episode['arm']}-{episode['scenario']}.jsonl")
        events = [json.loads(line) for line in log.read_text(encoding="utf-8").splitlines()]
        sid = episode.get("thread_id")
        observations = [e for e in events if e["direction"] == "in" and e["message"].get("method") == "thread/tokenUsage/updated"
                        and e["message"].get("params", {}).get("threadId") == sid]
        positive, previous, regressions = [], (0, 0), []
        for event in observations:
            u = event["message"]["params"]["tokenUsage"]
            pair = (u["total"].get("inputTokens"), u["total"].get("outputTokens"))
            if not all(type(n) is int for n in pair):
                continue
            if pair[0] < previous[0] or pair[1] < previous[1]:
                regressions.append(event["sequence"])
            if pair != previous:
                positive.append({"sequence": event["sequence"], "turn_id": event["message"]["params"].get("turnId"),
                                 "last": u["last"], "total": u["total"]})
                previous = pair
        measurements = [e["message"] for e in events if e["direction"] == "tool_measurement"]
        envelopes = [m["response_wire_bytes"] for m in measurements]
        compactions = [e for e in events if e["direction"] == "in" and e["message"].get("method") == "item/completed"
                       and e["message"].get("params", {}).get("threadId") == sid
                       and e["message"].get("params", {}).get("item", {}).get("type") == "contextCompaction"]
        final_messages = [{"turn_id": e["message"]["params"].get("turnId"),
                           "text": e["message"]["params"]["item"].get("text", "")} for e in events
                          if e["direction"] == "in" and e["message"].get("method") == "item/completed"
                          and e["message"].get("params", {}).get("threadId") == sid
                          and e["message"].get("params", {}).get("item", {}).get("type") == "agentMessage"
                          and e["message"]["params"]["item"].get("phase") == "final_answer"]
        summaries.append({"arm": episode["arm"], "scenario": episode["scenario"], "included_in_primary_comparison": primary,
            "run_finished": episode.get("run_finished"), "measurement_valid": episode.get("measurement_valid"),
            "grade": episode.get("grade"), "ordinary_input": previous[0], "ordinary_output": previous[1],
            "cumulative_regressions": regressions, "usage_updates": len(observations),
            "positive_usage_updates": len(positive), "automatic_compactions": len(compactions),
            "tool_calls": len(measurements), "largest_complete_tool_rpc_bytes": max(envelopes, default=None),
            "all_tool_rpc_caps_valid": all(n <= 2048 for n in envelopes),
            "task_note_writes": sum(c["name"] == "WriteFixture" and c.get("args", {}).get("path") == "task.md"
                                    and c["result"].get("ok") for c in episode.get("tools", [])),
            "recall_rpc_bytes_conservative": sum(p.get("recall_rpc_bytes_conservative", 0) for p in episode["phases"]),
            "restorations": episode.get("compactions", []), "final_messages": final_messages,
            "error": episode.get("error"), "request_input": episode.get("request_input")})
    return {"model_calls": 0, "source_report": str(report_path), "episodes": summaries,
            "reported_input_including_failed_attempts": sum(e["ordinary_input"] for e in summaries),
            "reported_output_including_failed_attempts": sum(e["ordinary_output"] for e in summaries),
            "gates": report["gates"], "stopped_by": report["stopped_by"],
            "usage_scope": "Observed ordinary thread totals; full compaction model usage remains unknown",
            "context_gain_proven": False, "statistical_confirmation": False}


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--report", type=Path, required=True)
    p.add_argument("--output", type=Path, required=True)
    a = p.parse_args()
    if a.output.exists():
        raise ValueError("Keep prior audits; choose a new output")
    a.output.write_text(json.dumps(analyze(a.report), ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="")
