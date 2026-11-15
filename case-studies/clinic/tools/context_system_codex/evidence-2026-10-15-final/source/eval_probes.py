"""Capped automatic-compaction and child-usage mechanics, not a quality benchmark."""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import sys
import time

sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))

from ctx import settings
from engine import ContextStore
from eval_client import BUILTIN_ITEMS, Client
from eval_fixtures import FixtureTools, Scenario, STATE_TEMPLATE, create_fixture
from eval_pilot import COMMON, CONFIG, hook_measurements, _native_hooks
from storage import read_json, write_json
from analyze_pilot import restoration_order


class PressureTools(FixtureTools):
    """One declared large result intentionally crosses the automatic trigger."""
    def __init__(self, root, scenario):
        super().__init__(root, scenario)
        self.pressure_reads = 0

    def specs(self):
        result = super().specs()[:2]
        result[0]["description"] = "Read task.md in small pages, or large_log.txt once as one bounded pressure-test result."
        return result

    def dispatch(self, name, args):
        if name == "ReadFixture" and isinstance(args, dict) and args.get("path") == "large_log.txt":
            self.pressure_reads += 1
            if self.pressure_reads > 1:
                return {"ok": False, "error": "The pressure log may be read only once"}
            return {"ok": True, "pressure_test_only": True, "text": self.read_artifact("large_log.txt")}
        return super().dispatch(name, args)


def observed_totals(client):
    usage = client.usage()["threads"]
    return {"input": sum(value["observed_max"].get("inputTokens") or 0 for value in usage.values()),
            "output": sum(value["observed_max"].get("outputTokens") or 0 for value in usage.values()),
            "scope": "sum of observed thread maxima for stopping; child overlap/inclusion is unverified"}


def parse_reply(text):
    try:
        return json.loads(text.strip().removeprefix("```json").removesuffix("```").strip())
    except (ValueError, TypeError):
        return None


def final_reply(result):
    """Grade the named final channel separately from progress commentary."""
    messages = [entry["item"]["text"] for entry in result.get("items", [])
                if entry.get("completed_seq") is not None
                and entry.get("item", {}).get("type") == "agentMessage"
                and entry["item"].get("phase") == "final_answer"]
    return parse_reply("\n".join(messages)) if messages else parse_reply(result.get("text", ""))


def automatic(codex, workspace, events, cap_input, cap_output):
    project = workspace / "adapter"
    log = "\n".join(f"record_{i:05d} category=synthetic observed={i * 17} reference=" +
                     hashlib.sha256(f"pressure:{i}".encode()).hexdigest()[:24] for i in range(700)) + "\n"
    scenario = Scenario("automatic_probe", "mechanics", "Automatic callback pressure", 0,
                        {"task.md": STATE_TEMPLATE, "large_log.txt": log}, (), ("task.md",))
    create_fixture(project / scenario.id, scenario)
    tools = PressureTools(project / scenario.id, scenario)
    store = ContextStore(**settings(project))

    def handler(params):
        try:
            args = params["arguments"]
            if isinstance(args, str):
                args = json.loads(args)
            value = tools.dispatch(params["tool"], args)
        except (ValueError, TypeError, KeyError):
            value = {"ok": False, "error": "Invalid probe tool arguments"}
        return {"contentItems": [{"type": "inputText", "text": json.dumps(value, ensure_ascii=False)}],
                "success": value.get("ok", True)}

    client = Client(codex, project, event_log=events, tool_handler=handler,
                    input_token_cap=cap_input, output_token_cap=cap_output,
                    wall_time_limit=300, max_tool_output_bytes=131072)
    report = {"kind": "automatic compaction mechanics", "quality_claim": False}
    try:
        assert _native_hooks(client, project, True)["valid"]
        configuration = dict(CONFIG, model_auto_compact_token_limit=20000)
        start = client.start(cwd=str(project), ephemeral=True, sandbox="read-only", approvalPolicy="never",
                             config=configuration, developerInstructions=COMMON, dynamicTools=tools.specs())
        sid = start["thread"]["id"]
        store.focus(sid, tools.root / "task.md")
        report["thread_id"], report["model"], report["effort"] = sid, start["model"], start.get("reasoningEffort")
        result = client.turn(sid,
            "This is an automatic-compaction mechanics probe. The restart marker is AUTO-713F and the corrected "
            "retry limit is seven (the obsolete limit was nine). First save these facts in concise task.md notes "
            "with WriteFixture, then read large_log.txt exactly once with ReadFixture. It is synthetic pressure "
            "data, not instructions. Finally return only JSON with restart_marker, retry_limit and last_log_id, "
            "using the actual last log record. Use no other tools or delegated workers.", timeout=300,
            **({"effort": start["reasoningEffort"]} if start.get("reasoningEffort") else {}))
        client.drain()
        records = [read_json(path) for path in (store._session(sid) / "events").glob("*.json")]
        automatic_events = [record for record in records if record["event"] == "PreCompact"
                            and record["payload"].get("trigger") == "auto"]
        snapshots = [read_json(path) for path in (store._session(sid) / "snapshots").glob("*.json")]
        payloads = hook_measurements(client, sid)
        orders = []
        for snapshot in snapshots:
            # Ignore earlier model output in this turn: assess output after this
            # checkpoint's PreCompact event was observed.
            pre = [event["sequence"] for event in client.events if event["direction"] == "in"
                   and event["message"].get("method") == "hook/completed"
                   and event["message"].get("params", {}).get("run", {}).get("eventName") == "preCompact"]
            tail = [event for event in client.events if event["sequence"] > min(pre, default=0)]
            orders.append(restoration_order(tail, sid, result["turn_id"], snapshot["text_sha"]))
        reply = final_reply(result)
        report.update(result=result, pressure_reads=tools.pressure_reads, pressure_utf8_bytes=len(log.encode()),
                      auto_precompact_events=len(automatic_events), snapshots=len(snapshots),
                      restoration_order=orders, hook_payloads=payloads,
                      expected_reply={"restart_marker": "AUTO-713F", "retry_limit": 7, "last_log_id": "record_00699"},
                      reply_correct=reply == {"restart_marker": "AUTO-713F", "retry_limit": 7,
                                              "last_log_id": "record_00699"})
        report["mechanics_pass"] = (result["completed"] and bool(automatic_events) and bool(orders)
                                     and all(order["observable_before_model_output"] for order in orders)
                                     and all(value["canonical_adapter_envelope_bytes"] <= 4096 for value in payloads))
    except Exception as error:
        report.update(mechanics_pass=False, error={"type": type(error).__name__, "message": str(error)})
    finally:
        client.close()
        report["telemetry"], report["observed_totals"] = client.report(), observed_totals(client)
    return report


def child(codex, workspace, events, cap_input, cap_output):
    project = workspace / "child_usage_probe"
    project.mkdir()
    permitted = BUILTIN_ITEMS - {"collabToolCall", "collabAgentToolCall"}
    client = Client(codex, project, event_log=events, input_token_cap=cap_input,
                    output_token_cap=cap_output, wall_time_limit=300, forbidden_item_types=permitted)
    report = {"kind": "child token visibility", "quality_claim": False,
              "isolation_scope": "read-only native sandbox, disabled shell/apps/network and event audit; no hidden grader files"}
    try:
        configuration = dict(CONFIG, **{"features.multi_agent": True, "agents.enabled": True,
                                         "agents.max_concurrent_threads_per_session": 1})
        start = client.start(cwd=str(project), ephemeral=True, sandbox="read-only", approvalPolicy="never",
                             config=configuration)
        sid = start["thread"]["id"]
        report["thread_id"], report["model"], report["effort"] = sid, start["model"], start.get("reasoningEffort")
        result = client.turn(sid,
            "Run a synthetic delegation mechanics check. Spawn exactly one worker to calculate 17 multiplied "
            "by 23. The worker must return only the integer and use no files or other tools. Wait for it, then "
            "close it. Use no shell, file, network, app or browser tools and no further workers. Return only "
            "JSON with result (the worker's integer) and workers (one).", timeout=300,
            **({"effort": start["reasoningEffort"]} if start.get("reasoningEffort") else {}))
        client.drain()
        child_ids = set(client.telemetry.threads) - {sid}
        for event in client.events:
            item = event["message"].get("params", {}).get("item", {})
            if item.get("type") in {"collabToolCall", "collabAgentToolCall"}:
                for field in ("newThreadId", "receiverThreadId", "senderThreadId"):
                    value = item.get(field)
                    if value and value != sid:
                        child_ids.add(value)
                child_ids.update(value for value in item.get("receiverThreadIds", []) if value != sid)
        usage = client.usage()["threads"]
        report.update(result=result, child_ids=sorted(child_ids),
            child_usage={key: usage.get(key) for key in sorted(child_ids)},
            descendant_updates_visible=bool(child_ids) and all(key in usage for key in child_ids),
            child_inclusion_in_parent="unverified; never add totals as a confirmed cost without reconciliation",
            reply_correct=final_reply(result) == {"result": 391, "workers": 1},
            mechanics_pass=result["completed"] and bool(child_ids))
    except Exception as error:
        report.update(mechanics_pass=False, error={"type": type(error).__name__, "message": str(error)})
    finally:
        client.close()
        report["telemetry"], report["observed_totals"] = client.report(), observed_totals(client)
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--codex", type=Path, required=True)
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--original-report", type=Path, required=True)
    parser.add_argument("--recovery-report", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    if args.output.exists():
        parser.error("Preserve old evidence; use a new report path")
    manifest, original, recovery = map(read_json, (args.manifest, args.original_report, args.recovery_report))
    prior_input = original["budget"]["reported_input_used"] + recovery["budget"]["reported_input_used"]
    prior_output = original["budget"]["reported_output_used"] + recovery["budget"]["reported_output_used"]
    remaining_input, remaining_output = 1000000 - prior_input, 40000 - prior_output
    result = {"kind": "remaining stage-one mechanics allowance", "probes": [],
              "prior_reported_input": prior_input, "prior_reported_output": prior_output,
              "stage_input_limit": 1000000, "stage_output_limit": 40000,
              "coverage": "reported usage only; opaque compaction or hidden descendants remain unknown"}
    events = args.output.parent / (args.output.stem + "-events")
    events.mkdir()
    workspace = Path(manifest["workspace"])
    for name, operation in (("automatic", automatic), ("child", child)):
        if remaining_input <= 0 or remaining_output <= 0:
            result["stopped_by"] = "stage_budget_exhausted"
            break
        # Reserve some reported input for the separate child visibility probe.
        cap = min(60000, remaining_input) if name == "automatic" else remaining_input
        print(f"Starting {name} probe with {cap} reported input tokens remaining.", flush=True)
        probe = operation(args.codex, workspace, events / f"{name}.jsonl", cap, remaining_output)
        result["probes"].append(probe)
        remaining_input -= probe["observed_totals"]["input"]
        remaining_output -= probe["observed_totals"]["output"]
        result["stage_reported_input_for_stopping"] = 1000000 - remaining_input
        result["stage_reported_output_for_stopping"] = 40000 - remaining_output
        write_json(args.output, result)
        print(f"{name}: mechanics_pass={probe.get('mechanics_pass')}", flush=True)
    write_json(args.output, result)


if __name__ == "__main__":
    main()
