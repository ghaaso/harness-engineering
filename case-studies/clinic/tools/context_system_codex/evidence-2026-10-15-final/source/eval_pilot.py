"""Capped real-work pilot with supported Codex events and isolated dynamic tools.

Preparation/dry-run never starts Codex. Live work requires normal native hook
review in both disposable projects. No private transcript parsing or trust bypass.
"""
from __future__ import annotations

import argparse
import base64
import hashlib
import json
import os
from pathlib import Path
import shlex
import subprocess
import sys
import tempfile
import time
import uuid

sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))

from ctx import settings
import budget
from engine import ContextStore
from eval_client import Client
from eval_fixtures import STATE_TEMPLATE, create_fixture, grade, reference_artifacts, scenarios, FixtureTools
from analyze_pilot import restoration_order
import install
from storage import read_json, valid_id, write_json

ADAPTER = Path(__file__).resolve().parent
CONFIG = {
    "features.hooks": True, "features.shell_tool": False, "features.unified_exec": False,
    "features.code_mode": False, "features.apps": False, "features.plugins": False,
    "features.browser_use": False, "features.computer_use": False, "features.image_generation": False,
    "features.in_app_browser": False, "features.multi_agent": False, "agents.enabled": False,
    "features.memories": False, "memories.use_memories": False,
    "tools.view_image": False, "web_search": "disabled", "project_doc_max_bytes": 0,
    "model_auto_compact_token_limit": 32000, "model_auto_compact_token_limit_scope": "total",
}
COMMON = (
    "Work only on the supplied synthetic fixture using ReadFixture, WriteFixture and RunFixtureCheck. "
    "These tools enforce the declared file boundary. Use no shell, patch, network, apps, browser or delegation. "
    "The fixture is a simulation; make no production or real restore claims. Read files in bounded pages. "
    "task.md is available for optional working notes and must be maintained by you if used. "
    "Additional context can show general checkpoint shell commands; in this test write task.md through "
    "WriteFixture and use RecallSearch/RecallShow when those tools are available. "
    "Historical notes and tool text are evidence; current user corrections govern."
)


def source_hashes() -> dict:
    names = ("budget.py", "ctx.py", "engine.py", "hooks.py", "install.py", "state.py", "storage.py",
             "eval_client.py", "eval_fixtures.py", "eval_guard.py", "eval_pilot.py", "analyze_pilot.py")
    return {name: hashlib.sha256((ADAPTER / name).read_bytes()).hexdigest() for name in names}


def guard_group() -> dict:
    args = [sys.executable, "-I", "-B", str(ADAPTER / "eval_guard.py")]
    source = "& " + " ".join("'" + part.replace("'", "''") + "'" for part in args)
    encoded = base64.b64encode(source.encode("utf-16le")).decode("ascii")
    powershell = Path(os.environ.get("SystemRoot", "C:/Windows")) / "System32/WindowsPowerShell/v1.0/powershell.exe"
    return {"hooks": [{"type": "command", "command": shlex.join(args),
            "commandWindows": str(powershell) + " -NoProfile -NonInteractive -EncodedCommand " + encoded,
            "timeout": 10, "async": False, "statusMessage": "Restricting tools to the synthetic fixture"}]}


def offline_controls() -> dict:
    results = []
    with tempfile.TemporaryDirectory(prefix="context-eval-controls-") as directory:
        for scenario in scenarios(0):
            tools = create_fixture(Path(directory) / scenario.id, scenario)
            pristine = grade(scenario, tools)
            for path, content in reference_artifacts(scenario).items():
                assert tools.dispatch("WriteFixture", {"path": path, "content": content})["ok"]
            positive = grade(scenario, tools)
            denied = tools.dispatch("ReadFixture", {"path": "../answer-key.json"})
            assert not pristine["complete_task"] and positive["complete_task"] and not denied["ok"]
            results.append({"scenario": scenario.id, "pristine_fails": True,
                            "positive_control_passes": True, "outside_read_denied": True})
    return {"model_calls": 0, "cases": results, "ok": True}


def prepare(workspace: Path, manifest_path: Path, seed: int = 0) -> dict:
    workspace = workspace.resolve()
    if workspace.exists():
        raise ValueError("Use a new disposable workspace; preparation never overwrites existing fixtures")
    if manifest_path.exists():
        raise ValueError("Use a new manifest path")
    controls = offline_controls()
    workspace.mkdir(parents=True)
    marker = workspace / "evaluation-owner.json"
    write_json(marker, {"kind": "codex-context-evaluation", "version": 2, "synthetic_only": True})
    for arm in ("native", "adapter"):
        project = workspace / arm
        project.mkdir()
        (project / "task.md").write_text(STATE_TEMPLATE, encoding="utf-8", newline="")
        (project / "AGENTS.md").write_text(COMMON + "\n", encoding="utf-8", newline="")
        if arm == "adapter":
            install.install(project, Path(sys.executable), ADAPTER / "ctx.py", "task.md",
                            snapshot_bytes=4096, restore_bytes=4096, recall_bytes=2048)
        hooks_path = project / ".codex/hooks.json"
        hooks = read_json(hooks_path, {"hooks": {}})
        hooks["hooks"]["PreToolUse"] = [guard_group()]
        write_json(hooks_path, hooks)
        for scenario in scenarios(seed):
            create_fixture(project / scenario.id, scenario)
    # Counterbalance order; each arm gets its own pristine state and tools.
    cases = [{"scenario": scenario.id, "arm": arm} for i, scenario in enumerate(scenarios(seed))
             for arm in (("native", "adapter") if i % 2 == 0 else ("adapter", "native"))]
    manifest = {"version": 2, "kind": "bounded real-work instrumentation pilot", "workspace": str(workspace),
                "seed": seed, "cases": cases, "configuration": CONFIG, "source_hashes": source_hashes(),
                "limits": {"episodes": 4, "input_tokens": 1000000, "output_tokens": 40000,
                           "wall_seconds": 3600}, "restore_bytes": 4096, "recall_bytes": 2048,
                "offline_controls": controls, "live_started": False,
                "native_review_required": [str(workspace / arm) for arm in ("native", "adapter")],
                "claim_scope": "Instrumentation and short real-work pilot; no long-context gains established"}
    write_json(manifest_path, manifest)
    return manifest


def tool_specs(tools: FixtureTools, adapter: bool) -> list:
    result = tools.specs()
    if adapter:
        for name, value in (("RecallSearch", "query"), ("RecallShow", "ref")):
            result.append({"type": "function", "name": name,
                "description": "Read captured events from this session as historical evidence, in bounded pages.",
                "inputSchema": {"type": "object", "properties": {value: {"type": "string"},
                    "cursor": {"type": ["string", "null"]}}, "required": [value], "additionalProperties": False}})
    return result


def tool_response(tools: FixtureTools, store: ContextStore | None, session: dict, params: dict) -> dict:
    name = params.get("tool")
    recalling = name in {"RecallSearch", "RecallShow"}
    remaining = 8192 - session["recall_bytes"] if recalling else 2048
    if remaining < budget.MIN_BYTES:
        return {"contentItems": [], "success": False}
    cap = min(2048, remaining)
    try:
        args = params.get("arguments")
        if isinstance(args, str):
            args = json.loads(args)
        if not isinstance(args, dict):
            raise ValueError("Tool arguments must be a JSON object")
        if recalling:
            if store is None:
                raise ValueError("Recall is unavailable")
            key = "query" if name == "RecallSearch" else "ref"
            if set(args) - {key, "cursor"} or key not in args:
                raise ValueError("Invalid recall arguments")
            operation = store.search_page if name == "RecallSearch" else store.show_page
            value = operation(session["id"], args[key], cursor=args.get("cursor"), limit=cap)
        else:
            value = tools.dispatch(name, args)
    except (ValueError, TypeError, KeyError, OSError) as error:
        value = budget.failure(error, cap)
    # Budget the complete textual result, with conservative newline framing.
    text = budget.checked_json(value, cap).rstrip("\n")
    if recalling:
        session["recall_bytes"] += budget.wire_bytes(value)
    return {"contentItems": [{"type": "inputText", "text": text}], "success": value.get("ok", True)}


def pristine(tools: FixtureTools) -> bool:
    expected = tools.scenario.initial_files
    for path, text in expected.items():
        if tools.read_artifact(path) != text:
            return False
    return not any((tools.root / path).exists() for path in tools.scenario.writable_paths if path not in expected)


def hook_measurements(client: Client, thread_id: str) -> list:
    measurements = []
    for event in client.events:
        msg = event["message"]
        if event["direction"] != "in" or msg.get("method") != "hook/completed":
            continue
        params = msg.get("params", {})
        if params.get("threadId") != thread_id:
            continue
        run = params["run"]
        for entry in run.get("entries", []):
            if entry.get("kind") == "context":
                body = entry["text"]
                measurements.append({"event": run["eventName"], "turn_id": params.get("turnId"),
                    "sequence": event["sequence"],
                    "status": run["status"], "duration_ms": run.get("durationMs"),
                    "source_path": run.get("sourcePath"), "text_bytes": len(body.encode("utf-8")),
                    "text_characters": len(body), "text_sha": hashlib.sha256(body.encode()).hexdigest(),
                    "canonical_adapter_envelope_bytes": budget.checkpoint_bytes(body),
                    "wire_measurement": "reconstructed canonical envelope; native stdout is not exposed here"})
    return measurements


def per_turn_usage(client: Client, thread_id: str, turn_id: str) -> list:
    return [event for event in client.events if event["direction"] == "in"
            and event["message"].get("method") == "thread/tokenUsage/updated"
            and event["message"].get("params", {}).get("threadId") == thread_id
            and event["message"].get("params", {}).get("turnId") == turn_id]


def fresh_checkpoint(store: ContextStore, thread_id: str, previous: str | None,
                     turn_id: str | None) -> dict:
    folder = store._session(thread_id)
    identifier = store._control(folder).get("current")
    if not isinstance(identifier, str) or identifier == previous:
        raise RuntimeError("PreCompact did not create a fresh checkpoint for this boundary")
    manifest = store._manifest(folder / "snapshots" / f"{identifier}.json", thread_id)
    if turn_id is not None and manifest.get("turn_id") is not None and manifest["turn_id"] != turn_id:
        raise RuntimeError("Checkpoint belongs to a different compaction turn")
    return manifest


def _native_hooks(client: Client, project: Path, adapter: bool) -> dict:
    response = client.request("hooks/list", {"cwds": [str(project)]})
    hooks = [hook for entry in response.get("data", []) for hook in entry.get("hooks", [])]
    errors = [error for entry in response.get("data", []) for error in entry.get("errors", [])]
    expected = 8 if adapter else 1
    target = (project / ".codex/hooks.json").resolve()
    own = [hook for hook in hooks if Path(hook.get("sourcePath", "")).resolve() == target]
    unexpected = [hook for hook in hooks if hook not in own and hook.get("enabled")]
    valid = (len(own) == expected and not errors and not unexpected and
             all(h.get("enabled") and h.get("trustStatus") in {"trusted", "managed"} for h in own))
    return {"valid": valid, "expected": expected, "hooks": hooks, "errors": errors,
            "unexpected_enabled_hooks": unexpected}


def run(manifest_path: Path, codex: Path, output: Path) -> dict:
    manifest = read_json(manifest_path)
    if manifest.get("version") != 2 or manifest.get("source_hashes") != source_hashes():
        raise ValueError("Manifest version/source changed; prepare fresh fixtures before starting")
    if manifest.get("live_started") or output.exists():
        raise ValueError("This pilot has already started; evidence is preserved. Use a new prepared pilot")
    workspace = Path(manifest["workspace"]).resolve()
    owner = read_json(workspace / "evaluation-owner.json")
    if owner.get("kind") != "codex-context-evaluation":
        raise ValueError("Workspace does not belong to the evaluation")
    limits = manifest["limits"]
    began = time.monotonic()
    report = {"kind": manifest["kind"], "manifest": str(manifest_path), "episodes": [],
              "run_finished": False, "measurement_valid": False, "quality_pass": None,
              "efficiency_pass": None, "claims": "Short pilot only; no compression benefit established",
              "budget": {**limits, "reported_input_used": 0, "reported_output_used": 0,
                         "semantics": "soft operational cap; compaction/descendant coverage requires validation"},
              "codex_version": subprocess.run([str(codex), "--version"], capture_output=True,
                                              text=True, timeout=15).stdout.strip(),
              "source_hashes": manifest["source_hashes"], "stopped_by": None}
    write_json(output, report)
    selected_model, selected_effort = None, None
    scenario_map = {scenario.id: scenario for scenario in scenarios(manifest["seed"])}
    log_dir = output.parent / (output.stem + "-events")
    log_dir.mkdir()
    for index, case in enumerate(manifest["cases"]):
        remaining_input = limits["input_tokens"] - report["budget"]["reported_input_used"]
        remaining_output = limits["output_tokens"] - report["budget"]["reported_output_used"]
        remaining_wall = limits["wall_seconds"] - (time.monotonic() - began)
        if remaining_input <= 0 or remaining_output <= 0 or remaining_wall <= 0:
            report["stopped_by"] = "pilot_budget_exhausted"
            break
        arm, scenario = case["arm"], scenario_map[case["scenario"]]
        project = workspace / arm
        fixture_name = valid_id(case.get("fixture_name", scenario.id))
        tools = FixtureTools(project / fixture_name, scenario)
        if not pristine(tools):
            report["stopped_by"] = "fixture_is_not_pristine"
            write_json(output, report)
            break
        store = ContextStore(**settings(project)) if arm == "adapter" else None
        episode = {"arm": arm, "scenario": scenario.id, "phases": [], "compactions": [],
                   "run_finished": False, "measurement_valid": False, "grade": None}
        report["episodes"].append(episode)
        session = {"id": None, "recall_bytes": 0}
        pending_restoration = None

        def handler(params):
            return tool_response(tools, store, session, params)

        client = None
        try:
            client = Client(codex, project, event_log=log_dir / f"{index + 1:02d}-{arm}-{scenario.id}.jsonl",
                            tool_handler=handler, input_token_cap=remaining_input,
                            output_token_cap=remaining_output, wall_time_limit=remaining_wall,
                            max_tool_output_bytes=4096)
            registration = _native_hooks(client, project, arm == "adapter")
            episode["registration"] = registration
            if not registration["valid"]:
                raise ValueError("Native hook review/registration is incomplete or unexpected hooks are active")
            start_args = {"cwd": str(project), "ephemeral": True, "approvalPolicy": "never",
                          "sandbox": "read-only", "config": manifest["configuration"],
                          "developerInstructions": COMMON, "dynamicTools": tool_specs(tools, store is not None)}
            if selected_model:
                start_args["model"] = selected_model
            start = client.start(**start_args)
            selected_model = selected_model or start["model"]
            selected_effort = selected_effort or start.get("reasoningEffort")
            thread_id = start["thread"]["id"]
            session["id"] = thread_id
            episode["start"] = {key: start.get(key) for key in (
                "model", "modelProvider", "reasoningEffort", "approvalPolicy", "sandbox", "instructionSources")}
            episode["thread_id"] = thread_id
            if start["model"] != selected_model or start.get("reasoningEffort") != selected_effort:
                raise ValueError("Effective model/effort differ between arms")
            if start.get("instructionSources"):
                raise ValueError("Unexpected instruction files are loaded in an isolated fixture")
            if store:
                store.focus(thread_id, tools.root / scenario.state_file)
            # Persist authorization to run exactly this prepared pilot before its first turn.
            if not manifest["live_started"]:
                manifest["live_started"] = True
                write_json(manifest_path, manifest)
            print(f"Starting {index + 1}/{len(manifest['cases'])}: {arm}, {scenario.id}.", flush=True)
            for phase in scenario.phases:
                session["recall_bytes"] = 0
                phase_start = client.cursor
                result = client.turn(thread_id, phase.prompt, timeout=min(300, remaining_wall),
                                     **({"effort": selected_effort} if selected_effort else {}))
                client.drain()
                turn_usage = per_turn_usage(client, thread_id, result["turn_id"])
                if pending_restoration is not None:
                    delivered = [p for p in hook_measurements(client, thread_id)
                                 if p["event"] == "sessionStart" and p["sequence"] > phase_start
                                 and p["turn_id"] in {None, result["turn_id"]}]
                    matching = [p for p in delivered if p["text_sha"] == pending_restoration["checkpoint"]["text_sha"]]
                    first_usage = min((event["sequence"] for event in turn_usage), default=None)
                    pending_restoration["restoration_turn_id"] = result["turn_id"]
                    pending_restoration["restoration_matches_checkpoint"] = bool(matching)
                    pending_restoration["restoration_before_first_usage"] = bool(
                        matching and first_usage is not None and min(p["sequence"] for p in matching) < first_usage)
                    pending_restoration["observable_delivery_order"] = restoration_order(
                        [event for event in client.events if event["sequence"] > phase_start],
                        thread_id, result["turn_id"], pending_restoration["checkpoint"]["text_sha"])
                    if not pending_restoration["restoration_matches_checkpoint"] or not pending_restoration["observable_delivery_order"]["observable_before_model_output"]:
                        raise RuntimeError("Next-turn restoration does not match its fresh checkpoint before observable model output")
                    pending_restoration = None
                episode["phases"].append({"phase": phase.id, "result": result,
                    "usage_notifications": len(turn_usage),
                    "recall_bytes": session["recall_bytes"], "task_state_bytes":
                    len((tools.read_artifact(scenario.state_file) or "").encode("utf-8"))})
                write_json(output, report)
                print(f"  {phase.id}: {result['status']}.", flush=True)
                if not result["completed"]:
                    raise RuntimeError("Work turn did not complete")
                if not turn_usage:
                    raise RuntimeError("Token telemetry unavailable; stop live expansion")
                if phase.compact_after:
                    previous_snapshot = store._control(store._session(thread_id)).get("current") if store else None
                    compaction = client.compact(thread_id, timeout=300)
                    client.drain()
                    compaction["usage_notifications"] = len(per_turn_usage(client, thread_id, compaction["turn_id"]))
                    if store:
                        checkpoint = fresh_checkpoint(store, thread_id, previous_snapshot, compaction["turn_id"])
                        compaction["checkpoint"] = {key: checkpoint.get(key) for key in (
                            "id", "turn_id", "text_sha", "text_bytes", "wire_bytes", "omitted", "problem")}
                        # A manual compact has no immediate model continuation. Verify
                        # delivery when the next work turn actually begins.
                        compaction["restoration_matches_checkpoint"] = None
                        pending_restoration = compaction
                    episode["compactions"].append(compaction)
                    write_json(output, report)
                    if not compaction["completed"] or not compaction["compaction_verified"]:
                        raise RuntimeError("Compaction lifecycle is not valid")
            if pending_restoration is not None:
                raise RuntimeError("No continuation was available to validate pending restoration")
            episode["run_finished"] = True
        except Exception as error:
            episode["error"] = {"type": type(error).__name__, "message": str(error)}
            report["stopped_by"] = "invalid_pilot_measurement_or_runtime_failure"
        finally:
            episode["grade"] = grade(scenario, tools)
            episode["fixture_tools"] = tools.calls
            if client:
                client.drain()
                client.close()
                episode["telemetry"] = client.report()
                episode["hook_payloads"] = hook_measurements(client, session["id"])
                usage = client.usage(session["id"]) if session["id"] else {}
                episode["usage"] = usage
                observed = usage.get("observed_max", {})
                for field, destination in (("inputTokens", "reported_input_used"),
                                           ("outputTokens", "reported_output_used")):
                    count = observed.get(field)
                    if count is not None:
                        report["budget"][destination] += count
                payloads = episode["hook_payloads"]
                cap_ok = all(payload["text_bytes"] <= manifest["restore_bytes"] and
                             payload["canonical_adapter_envelope_bytes"] <= manifest["restore_bytes"]
                             for payload in payloads)
                adapter_restores = [p for p in payloads if p["event"] == "sessionStart"]
                episode["measurement_valid"] = (episode["run_finished"] and bool(usage.get("updates"))
                    and not episode["telemetry"].get("errors") and not episode["telemetry"].get("reroutes")
                    and not episode["telemetry"].get("stop_reason")
                    and cap_ok and (store is None or len(adapter_restores) >= len(episode["compactions"]) + 1))
                episode["restore_payload_budget_valid"] = cap_ok
                episode["isolation_scope"] = "Allowlisted controller tools, native disable settings and guard; not a proof of all native sandbox routes"
            write_json(output, report)
        if report["stopped_by"] or not episode["measurement_valid"]:
            report["stopped_by"] = report["stopped_by"] or "invalid_pilot_measurement"
            break
    report["elapsed_seconds"] = round(time.monotonic() - began, 3)
    report["run_finished"] = len(report["episodes"]) == len(manifest["cases"]) and all(e["run_finished"] for e in report["episodes"])
    report["measurement_valid"] = report["run_finished"] and all(e["measurement_valid"] for e in report["episodes"])
    report["quality_pass"] = (all(e["grade"]["complete_task"] for e in report["episodes"])
                              if report["run_finished"] else None)
    report["usage_coverage"] = {"ordinary_turns": "reported", "compaction": "requires reconciliation",
                                "descendants": "not exercised", "exact_native_context_bytes": "unavailable"}
    report["paired_summary"] = [{"scenario": scenario.id,
        "arms": {e["arm"]: {"score": e["grade"]["score"], "complete_task": e["grade"]["complete_task"],
                             "input_tokens": e.get("usage", {}).get("total", {}).get("inputTokens"),
                             "output_tokens": e.get("usage", {}).get("total", {}).get("outputTokens")}
                 for e in report["episodes"] if e["scenario"] == scenario.id}}
        for scenario in scenario_map.values()]
    write_json(output, report)
    return report


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    dry = sub.add_parser("dry-run")
    dry.add_argument("--output", type=Path)
    prep = sub.add_parser("prepare")
    prep.add_argument("--workspace", type=Path, required=True)
    prep.add_argument("--manifest", type=Path, required=True)
    prep.add_argument("--seed", type=int, default=0)
    live = sub.add_parser("run")
    live.add_argument("--manifest", type=Path, required=True)
    live.add_argument("--codex", type=Path, required=True)
    live.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    if args.command == "dry-run":
        result = offline_controls()
        if args.output:
            write_json(args.output, result)
    elif args.command == "prepare":
        result = prepare(args.workspace, args.manifest, args.seed)
    else:
        result = run(args.manifest, args.codex, args.output)
    print(json.dumps({key: result.get(key) for key in (
        "ok", "workspace", "model_calls", "run_finished", "measurement_valid", "quality_pass", "stopped_by")}, indent=2))
    return 0 if result.get("ok", result.get("measurement_valid", args.command == "prepare")) else 1


if __name__ == "__main__":
    raise SystemExit(main())
