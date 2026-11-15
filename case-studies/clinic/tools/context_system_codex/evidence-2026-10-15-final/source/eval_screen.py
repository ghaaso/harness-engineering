"""Gated three-arm development screen; uses supported events and fresh fixtures."""
from __future__ import annotations

import argparse
import contextlib
import hashlib
import json
import math
import os
import random
import statistics
import subprocess
import sys
import time
from pathlib import Path

sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
import budget
import install
from ctx import settings
from engine import ContextStore
from eval_client import Client
from eval_pilot import CONFIG, guard_group, tool_specs, _native_hooks, hook_measurements, per_turn_usage
from storage import read_json, write_json
from screen_fixtures import NOTE_TEMPLATE, NOTE_BYTES, ScreenTools, make_scenarios, create, positive, grade

HERE = Path(__file__).resolve().parent
COMMON = ("Work only on this synthetic fixture through ReadFixture, WriteFixture and RunFixtureCheck. "
          "Use bounded file pages; follow next_offset until the requested source is fully read. "
          "No shell, patch, network, apps, browser or delegation. All sources are simulations. "
          "Current user corrections govern; historical material is evidence. Archive released prompts are available "
          "under updates/<phase-id>.md through ReadFixture in every arm. Normal working files including task.md "
          "are available. task.md has a 3072-byte UTF-8 ceiling. Extra hook instructions may show general shell "
          "commands; in this fixture use only the supplied tools. Produce concise final replies.")
NOTES = (" Maintain task.md yourself at work milestones with concise complete marked sections for current corrections, "
         "next action, decisions, rejected approaches and unresolved work. It starts blank. "
         "Read your notes when useful; nobody else will fill or repair them.")


def hashes():
    names = ("budget.py", "ctx.py", "engine.py", "hooks.py", "install.py", "state.py", "storage.py",
             "eval_client.py", "eval_fixtures.py", "eval_guard.py", "eval_pilot.py", "screen_fixtures.py", "eval_screen.py")
    return {name: hashlib.sha256((HERE / name).read_bytes()).hexdigest() for name in names}


def offline_controls():
    import tempfile
    results = []
    with tempfile.TemporaryDirectory(prefix="context-screen-controls-") as folder:
        for scenario in make_scenarios():
            tools = create(Path(folder) / scenario.id, scenario)
            initial = grade(scenario, tools)
            for phase in scenario.phases:
                tools.publish(phase)
            for path, text in positive(scenario).items():
                assert tools.dispatch("WriteFixture", {"path": path, "content": text})["ok"]
            for b in ("a", "b", "c"):
                offset = 0
                while True:
                    result = tools.dispatch("ReadFixture", {"path": f"ledger_{b}.csv", "offset": offset})
                    assert result["ok"]
                    if result["next_offset"] is None:
                        break
                    offset = result["next_offset"]
            tools.dispatch("RunFixtureCheck", {"check": "retry_preview" if scenario.id == "retry_repair" else "expiry_preview"})
            good = grade(scenario, tools)
            assert initial["score"] < 95 and good["complete_task"], good
            assert not tools.dispatch("WriteFixture", {"path": "task.md", "content": "x" * (NOTE_BYTES + 1)})["ok"]
            results.append({"scenario": scenario.id, "blank_score": initial["score"], "positive_score": good["score"]})
    return {"model_calls": 0, "valid": True, "cases": results}


def prepare(workspace, manifest_path, seed=13):
    workspace = Path(workspace).resolve()
    if workspace.exists() or Path(manifest_path).exists():
        raise ValueError("Use fresh workspace and manifest paths")
    controls = offline_controls()
    workspace.mkdir(parents=True)
    write_json(workspace / "evaluation-owner.json", {"kind": "codex-context-three-arm", "synthetic_only": True})
    scenarios = make_scenarios(seed)
    for arm in ("N", "M", "A"):
        project = workspace / arm
        project.mkdir()
        (project / "task.md").write_text(NOTE_TEMPLATE, encoding="utf-8", newline="")
        (project / "AGENTS.md").write_text(COMMON + "\n", encoding="utf-8", newline="")
        if arm == "A":
            install.install(project, Path(sys.executable), HERE / "ctx.py", "task.md",
                            snapshot_bytes=4096, restore_bytes=4096, recall_bytes=2048)
        hp = project / ".codex/hooks.json"
        hooks = read_json(hp, {"hooks": {}})
        hooks["hooks"]["PreToolUse"] = [guard_group()]
        write_json(hp, hooks)
        for scenario in scenarios:
            create(project / scenario.id, scenario)
    order = ["N", "M", "A"]
    random.Random(seed).shuffle(order)
    config = {**CONFIG, "model_auto_compact_token_limit": 20000, "model_reasoning_effort": "ultra"}
    manifest = {"version": 1, "kind": "three-arm automatic-compaction development screen", "workspace": str(workspace),
        "seed": seed, "source_hashes": hashes(), "configuration": config, "model": "gpt-6-astra", "effort": "ultra",
        "cases": [{"arm": arm, "scenario": s.id} for i, s in enumerate(scenarios)
                  for arm in (order if i == 0 else list(reversed(order)))],
        "limits": {"first_input": 1500000, "first_output": 40000, "first_seconds": 7200,
                   "total_input": 3000000, "total_output": 80000, "total_seconds": 14400,
                   "episode_input": 450000, "episode_output": 12000, "episode_seconds": 1800},
        "controls": controls, "live_started": False, "calibration": "optional calibration skipped; freeze previously exercised 20k total trigger",
        "restore_bytes": 4096, "note_bytes": NOTE_BYTES, "tool_rpc_bytes": 2048, "recall_per_phase_bytes": 8192,
        "instructions": {"N": COMMON, "M": COMMON + NOTES, "A": COMMON + NOTES},
        "scenario_hashes": {s.id: hashlib.sha256(json.dumps({"initial": s.initial_files,
                 "phases": [p.__dict__ for p in s.phases]}, sort_keys=True).encode()).hexdigest() for s in scenarios}}
    write_json(manifest_path, manifest)
    return manifest


def reply_size(value):
    response = {"contentItems": [{"type": "inputText", "text": budget.checked_json(value, None).rstrip("\n")}],
                "success": value.get("ok", True)}
    # Reserve a 64-character RPC id; actual ids on this transport are shorter.
    size = len((json.dumps({"id": "x" * 64, "result": response}, ensure_ascii=False) + "\n").encode())
    return response, size


def tool_response(tools, store, session, params):
    name, args = params.get("tool"), params.get("arguments")
    if isinstance(args, str):
        args = json.loads(args)
    if not isinstance(args, dict):
        return reply_size({"ok": False, "error": "Tool arguments must be an object"})[0]
    recall = name in {"RecallSearch", "RecallShow"}
    if recall:
        remaining = 8192 - session["recall_bytes"]
        if remaining < 256:
            return {"contentItems": [], "success": False}
        if store is None:
            return reply_size({"ok": False, "error": "Recall unavailable"})[0]
        key = "query" if name == "RecallSearch" else "ref"
        if set(args) - {key, "cursor"} or key not in args:
            return reply_size({"ok": False, "error": "Invalid recall arguments"})[0]
        op = store.search_page if name == "RecallSearch" else store.show_page
        limit = min(1400, remaining - 160)
        while True:
            value = op(session["id"], args[key], cursor=args.get("cursor"), limit=limit)
            response, size = reply_size(value)
            if size <= min(2048, remaining):
                session["recall_bytes"] += size
                return response
            limit //= 2
            if limit < 128:
                return {"contentItems": [], "success": False}
    value = tools.dispatch(name, args)
    response, size = reply_size(value)
    while size > 2048 and name == "ReadFixture" and value.get("ok") and value.get("text"):
        value["text"] = value["text"][:max(1, len(value["text"]) // 2)]
        end = value["offset"] + len(value["text"])
        value.update(end_offset=end, next_offset=end if end < value["total_characters"] else None,
                     eof=end == value["total_characters"], text_utf8_bytes=len(value["text"].encode()))
        response, size = reply_size(value)
    if size > 2048:
        response = reply_size({"ok": False, "error": "Result cannot fit complete 2 KiB RPC envelope"})[0]
    return response


def automatic_boundaries(client, sid, store=None):
    boundaries = []
    for event in client.events:
        msg, p = event["message"], event["message"].get("params", {})
        if event["direction"] != "in" or msg.get("method") != "item/completed" or p.get("threadId") != sid:
            continue
        if p.get("item", {}).get("type") != "contextCompaction":
            continue
        seq, tid = event["sequence"], p.get("turnId")
        first = next((e for e in client.events if e["sequence"] > seq and e["direction"] == "in"
            and e["message"].get("method") in {"item/started", "item/completed"}
            and e["message"].get("params", {}).get("threadId") == sid
            and e["message"].get("params", {}).get("item", {}).get("type") in {"reasoning", "agentMessage", "dynamicToolCall"}), None)
        lifecycle = any(e["direction"] == "in" and e["sequence"] < seq
            and e["message"].get("method") == "item/started"
            and e["message"].get("params", {}).get("threadId") == sid
            and e["message"].get("params", {}).get("turnId") == tid
            and e["message"].get("params", {}).get("item", {}).get("id") == p["item"]["id"] for e in client.events)
        record = {"item_id": p["item"]["id"], "turn_id": tid, "completed_sequence": seq, "lifecycle_valid": lifecycle,
                  "first_model_output_sequence": first["sequence"] if first else None,
                  "restoration_valid": None, "first_consequential_call": None}
        if store:
            payloads = [h for h in hook_measurements(client, sid) if h["event"] == "sessionStart"
                        and h["sequence"] > seq]
            delivered = min(payloads, key=lambda h: h["sequence"]) if payloads else None
            matches = []
            for path in (store._session(sid) / "snapshots").glob("snapshot_*.json"):
                m = store._manifest(path, sid)
                if delivered and m.get("turn_id") == tid and m.get("text_sha") == delivered["text_sha"]:
                    matches.append(m)
            m = matches[0] if len(matches) == 1 else None
            record.update(checkpoint_id=m.get("id") if m else None,
                          checkpoint_omitted=m.get("omitted") if m else None,
                          checkpoint_problem=m.get("problem") if m else None,
                          restoration_sequence=delivered["sequence"] if delivered else None,
                          restoration_bytes=delivered["canonical_adapter_envelope_bytes"] if delivered else None,
                          restoration_valid=bool(lifecycle and m and delivered and first and delivered["sequence"] < first["sequence"]
                                                 and delivered["canonical_adapter_envelope_bytes"] <= 4096))
        boundaries.append(record)
    # Reusing one manifest for distinct automatic cycles does not prove freshness.
    identifiers = [b.get("checkpoint_id") for b in boundaries if b.get("checkpoint_id")]
    if store and len(identifiers) != len(set(identifiers)):
        for b in boundaries:
            b["restoration_valid"] = False
            b["freshness_problem"] = "same checkpoint associated with multiple automatic compactions"
    return boundaries


def screen_gate(episodes):
    by = {e["arm"]: e for e in episodes}
    if set(by) != {"N", "M", "A"} or any(not e.get("measurement_valid") for e in by.values()):
        return {"expand": False, "verdict": "inconclusive_measurement"}
    if any(len(e.get("compactions", [])) < 2 for e in by.values()):
        return {"expand": False, "verdict": "inconclusive_pressure"}
    if all(e["grade"].get("complete_task") is False for e in by.values()):
        return {"expand": False, "verdict": "inconclusive_all_arms_unfinished"}
    a = by["A"]
    if a["grade"]["score"] < 95 or a["grade"]["critical_failures"]:
        return {"expand": False, "verdict": "adapter_quality_gate_failed"}
    controls = [by[x] for x in ("N", "M")]
    qualified = [e for e in controls if e["grade"]["score"] >= 95 and not e["grade"]["critical_failures"]]
    ai = a["usage"]["observed_max"]["inputTokens"]
    efficiency = bool(qualified) and all(a["grade"]["score"] >= c["grade"]["score"] - 5 for c in controls)
    efficiency = efficiency and all(ai <= .8 * c["usage"]["observed_max"]["inputTokens"] for c in qualified)
    quality = all(a["grade"]["score"] >= c["grade"]["score"] + 5 and
                  ai <= 1.1 * c["usage"]["observed_max"]["inputTokens"] for c in controls)
    return {"expand": bool(efficiency or quality), "efficiency_signal": bool(efficiency), "quality_signal": bool(quality),
            "verdict": "promising_exploratory_signal" if efficiency or quality else "no_incremental_value_demonstrated",
            "full_compaction_cost": "unknown", "statistical_confirmation": False}


def request_inputs(observations, sid):
    result, previous = [], (0, 0)
    for obs in observations:
        if obs.get("thread_id") != sid:
            continue
        pair = (obs["total"].get("inputTokens"), obs["total"].get("outputTokens"))
        if all(type(n) is int for n in pair) and pair != previous:
            value = obs["last"].get("inputTokens")
            if type(value) is int and value > 0:
                result.append(value)
            previous = pair
    return result


def capped_outcome(episode):
    telemetry = episode.get("telemetry", {})
    usage = episode.get("usage", {}).get("observed_max", {})
    return bool(str(telemetry.get("stop_reason", "")).startswith("soft_cap:")
        and not telemetry.get("errors") and not telemetry.get("reroutes")
        and type(usage.get("inputTokens")) is int and type(usage.get("outputTokens")) is int
        and any(t.get("status") == "interrupted" and t.get("usage_observed")
                for t in telemetry.get("per_turn_usage_coverage", [])))


def prepare_continuation(original_manifest, prior_report, new_manifest):
    old = read_json(original_manifest)
    prior = read_json(prior_report)
    if len(prior["episodes"]) != 1 or not capped_outcome(prior["episodes"][0]) or Path(new_manifest).exists():
        raise ValueError("Continuation is only for the preserved first capped outcome")
    old.update(source_hashes=hashes(), live_started=False, prior_report=str(prior_report),
               measurement_amendment="Budget exhaustion is an observed task outcome, not invalid token telemetry. "
               "Fixtures, graders, model, thresholds and caps unchanged. First-arm raw evidence preserved; no rerun.")
    write_json(new_manifest, old)
    return old


@contextlib.contextmanager
def stay_awake(setter=None):
    """Process/thread scoped idle-sleep request, cleared on exit; no power-plan edits."""
    if setter is None:
        if os.name != "nt":
            yield
            return
        import ctypes
        setter = ctypes.windll.kernel32.SetThreadExecutionState
        setter.argtypes = [ctypes.c_uint]
        setter.restype = ctypes.c_uint
    if not setter(0x80000001):
        raise OSError("Could not establish the temporary idle-sleep request")
    try:
        yield
    finally:
        setter(0x80000000)


def prepare_suspend_retry(original_manifest, prior_report, new_manifest):
    old, prior = read_json(original_manifest), read_json(prior_report)
    if Path(new_manifest).exists() or len(prior["episodes"]) != 2:
        raise ValueError("Only one preserved first-adapter transport retry is allowed")
    failed = prior["episodes"][1]
    if failed["arm"] != "A" or failed.get("error", {}).get("type") != "TimeoutError":
        raise ValueError("The prior adapter did not have the expected transport interruption")
    events = [json.loads(line) for line in Path(failed["event_log"]).read_text(encoding="utf-8").splitlines()]
    gap = max(right["elapsed_seconds"] - left["elapsed_seconds"] for left, right in zip(events, events[1:]))
    if not 14226 <= gap <= 14229:
        raise ValueError("Gap does not match the separately verified Windows sleep/wake evidence")
    scenario = make_scenarios(old["seed"])[0]
    fixture_name = scenario.id + "_transport_retry"
    create(Path(old["workspace"]) / "A" / fixture_name, scenario)
    old["cases"][1]["fixture_name"] = fixture_name
    old.update(source_hashes=hashes(), live_started=False, prior_report=str(prior_report),
        transport_retry=True, verified_suspend_gap_seconds=gap,
        time_amendment="Windows Power-Troubleshooter SleepTime 2026-10-13T15:13:14.3150510Z, "
        "WakeTime 2026-10-13T19:10:22.0362344Z match the 14227.125s supported-event gap. "
        "One fresh adapter retry; original failed usage remains counted. Original elapsed wall limit "
        "was exceeded during suspension and is reported. Remaining time uses measured awake runtime; "
        "token/output caps, fixtures, graders, model and threshold unchanged.")
    write_json(new_manifest, old)
    return old


def run(manifest_path, codex, output):
    manifest = read_json(manifest_path)
    if manifest["source_hashes"] != hashes() or manifest.get("live_started") or output.exists():
        raise ValueError("Changed sources or previously started evidence; prepare a fresh manifest")
    root, limits = Path(manifest["workspace"]), manifest["limits"]
    if read_json(root / "evaluation-owner.json").get("kind") != "codex-context-three-arm":
        raise ValueError("Not an owned disposable evaluation")
    began = time.monotonic()
    report = {"manifest": str(manifest_path), "source_hashes": hashes(), "episodes": [], "gates": [],
              "reported_input_used": 0, "reported_output_used": 0, "stopped_by": None,
              "codex_version": subprocess.run([str(codex), "--version"], capture_output=True, text=True, timeout=15).stdout.strip(),
              "limits": limits, "usage_scope": "ordinary reported usage; compaction cost unknown",
              "run_finished": False, "context_gain_proven": False}
    scenarios = {s.id: s for s in make_scenarios(manifest["seed"])}
    logdir = output.parent / (output.stem + "-events")
    logdir.mkdir()
    if manifest.get("prior_report"):
        prior_path = Path(manifest["prior_report"])
        prior = read_json(prior_path)
        if len(prior["episodes"]) not in {1, 2} or not capped_outcome(prior["episodes"][0]):
            raise ValueError("Prior outcome is not a valid capped task attempt")
        episode = prior["episodes"][0]
        episode.update(measurement_valid=True, task_budget_exhausted=True,
            event_log=episode.get("event_log") or str(prior_path.parent / (prior_path.stem + "-events") / f"01-{episode['arm']}-{episode['scenario']}.jsonl"),
            measurement_amendment=manifest["measurement_amendment"])
        report["episodes"].append(episode)
        report["reported_input_used"] = prior["reported_input_used"]
        report["reported_output_used"] = prior["reported_output_used"]
        report["prior_wall_seconds"] = prior.get("elapsed_seconds", 0)
        report["suspend_gap_seconds"] = manifest.get("verified_suspend_gap_seconds", 0)
        report["prior_elapsed_seconds"] = max(0, report["prior_wall_seconds"] - report["suspend_gap_seconds"])
        report["measurement_amendment"] = manifest["measurement_amendment"]
        if manifest.get("transport_retry"):
            report["excluded_failed_attempts"] = prior["episodes"][1:]
            report["time_amendment"] = manifest["time_amendment"]
            report["original_elapsed_wall_limit_exceeded"] = report["prior_wall_seconds"] > limits["first_seconds"]
    write_json(output, report)
    offset = len(report["episodes"])
    for i, case in enumerate(manifest["cases"][offset:], start=offset):
        if i == 3:
            gate = screen_gate(report["episodes"][:3])
            report["gates"].append(gate)
            if not gate["expand"]:
                report["stopped_by"] = gate["verdict"]
                break
        stage = "first" if i < 3 else "total"
        remaining_in = limits[stage + "_input"] - report["reported_input_used"]
        remaining_out = limits[stage + "_output"] - report["reported_output_used"]
        remaining_time = limits[stage + "_seconds"] - (time.monotonic() - began) - report.get("prior_elapsed_seconds", 0)
        previous = report["episodes"][-1] if report["episodes"] else None
        forecast = max(301000, (previous or {}).get("usage", {}).get("observed_max", {}).get("inputTokens") or 0)
        remaining_cases = 3 - (i % 3)
        if remaining_in < forecast * remaining_cases or remaining_out < 3000 * remaining_cases or remaining_time <= 0:
            report["stopped_by"] = "remaining_allocation_cannot_finish_triplet"
            break
        arm, scenario = case["arm"], scenarios[case["scenario"]]
        project = root / arm
        fixture_name = case.get("fixture_name", scenario.id)
        if not isinstance(fixture_name, str) or not fixture_name.replace("_", "").isalnum():
            raise ValueError("Invalid fixture directory")
        tools = ScreenTools(project / fixture_name, scenario)
        if any(tools.read_artifact(p) != t for p, t in scenario.initial_files.items()) or any(
            (tools.root / p).exists() for p in scenario.writable_paths if p not in scenario.initial_files):
            raise ValueError("Scored fixture is not pristine")
        store = ContextStore(**settings(project)) if arm == "A" else None
        episode = {"arm": arm, "scenario": scenario.id, "phases": [], "run_finished": False, "measurement_valid": False,
                   "event_log": str(logdir / f"{i + 1:02d}-{arm}-{scenario.id}.jsonl")}
        report["episodes"].append(episode)
        session, client = {"id": None, "recall_bytes": 0}, None
        def handler(params):
            before = len(tools.calls)
            result = tool_response(tools, store, session, params)
            if len(tools.calls) > before:
                sequence = next((e["sequence"] for e in client.events if e["direction"] == "in"
                    and e["message"].get("method") == "item/tool/call"
                    and e["message"].get("params", {}).get("callId") == params.get("callId")), client.cursor)
                tools.calls[-1].update(server_call_sequence=sequence, turn_id=params.get("turnId"), call_id=params.get("callId"))
            return result
        try:
            client = Client(codex, project, event_log=Path(episode["event_log"]),
                tool_handler=handler, input_token_cap=min(remaining_in, limits["episode_input"]),
                output_token_cap=min(remaining_out, limits["episode_output"]),
                wall_time_limit=min(remaining_time, limits["episode_seconds"]), max_tool_output_bytes=2048)
            episode["registration"] = _native_hooks(client, project, arm == "A")
            if not episode["registration"]["valid"]:
                raise ValueError("Native hook review is incomplete or unexpected hooks are active")
            start = client.start(cwd=str(project), ephemeral=True, approvalPolicy="never", sandbox="read-only",
                model=manifest["model"], config=manifest["configuration"], developerInstructions=manifest["instructions"][arm],
                dynamicTools=tool_specs(tools, arm == "A"))
            sid = start["thread"]["id"]
            session["id"] = sid
            episode["thread_id"] = sid
            episode["effective"] = {k: start.get(k) for k in ("model", "reasoningEffort", "instructionSources", "sandbox", "approvalPolicy")}
            if start["model"] != manifest["model"] or start.get("reasoningEffort") != manifest["effort"] or start.get("instructionSources"):
                raise ValueError("Effective model, effort or instructions differ from the manifest")
            if store:
                store.focus(sid, tools.root / "task.md")
            manifest["live_started"] = True
            write_json(manifest_path, manifest)
            print(f"Starting {i + 1}/6: {arm}, {scenario.id}", flush=True)
            for phase in scenario.phases:
                tools.publish(phase)
                session["recall_bytes"] = 0
                result = client.turn(sid, phase.prompt, timeout=360, effort=manifest["effort"])
                client.drain()
                notifications = per_turn_usage(client, sid, result["turn_id"])
                episode["phases"].append({"phase": phase.id, "result": result, "usage_notifications": len(notifications),
                                          "recall_rpc_bytes_conservative": session["recall_bytes"]})
                episode["usage"] = client.usage(sid)
                write_json(output, report)
                print(f"  {phase.id}: {result['status']}; input={episode['usage']['observed_max']['inputTokens']}", flush=True)
                if not result["completed"] or not notifications:
                    raise RuntimeError("Work did not complete or usage is missing")
                boundaries = automatic_boundaries(client, sid, store)
                if any(not b["lifecycle_valid"] for b in boundaries) or (store and any(
                        b["first_model_output_sequence"] is not None and not b["restoration_valid"] for b in boundaries)):
                    raise RuntimeError("Automatic restoration/freshness could not be validated")
            episode["run_finished"] = True
        except Exception as error:
            episode["error"] = {"type": type(error).__name__, "message": str(error)}
            report["stopped_by"] = "runtime_or_measurement_failure"
        finally:
            episode["grade"] = grade(scenario, tools)
            episode["tools"] = tools.calls
            if client:
                client.drain()
                client.close()
                episode["telemetry"] = client.report()
                episode["usage"] = client.usage(session["id"]) if session["id"] else {}
                episode["hook_payloads"] = hook_measurements(client, session["id"])
                episode["compactions"] = automatic_boundaries(client, session["id"], store) if session["id"] else []
                for b in episode["compactions"]:
                    b["first_consequential_call"] = next((c for c in tools.calls if c.get("server_call_sequence", 0) > b["completed_sequence"]
                                                         and c["name"] in {"WriteFixture", "RunFixtureCheck"}), None)
                obs = episode["usage"].get("observed_max", {})
                report["reported_input_used"] += obs.get("inputTokens") or 0
                report["reported_output_used"] += obs.get("outputTokens") or 0
                valid_caps = all(h["canonical_adapter_envelope_bytes"] <= 4096 for h in episode["hook_payloads"])
                cap_end = capped_outcome(episode)
                episode["task_budget_exhausted"] = cap_end
                episode["measurement_valid"] = bool((episode["run_finished"] or cap_end) and obs.get("inputTokens")
                    and not episode["telemetry"]["errors"] and not episode["telemetry"]["reroutes"]
                    and (not episode["telemetry"]["stop_reason"] or cap_end) and valid_caps
                    and all(b["lifecycle_valid"] for b in episode["compactions"])
                    and (not store or all(b["restoration_valid"] for b in episode["compactions"])))
                positive_updates = request_inputs(episode["telemetry"]["usage_observations"], session["id"])
                ordered = sorted(positive_updates)
                episode["request_input"] = {"median": statistics.median(ordered) if ordered else None,
                    "p95": ordered[math.ceil(.95 * len(ordered)) - 1] if ordered else None,
                    "max": max(ordered) if ordered else None, "samples": len(ordered)}
                if len(report["episodes"]) > 1 and not report["episodes"][-2]["measurement_valid"]:
                    report["stopped_by"] = "invalid_previous_episode"
                if cap_end and episode["measurement_valid"]:
                    report["stopped_by"] = None
            write_json(output, report)
        if report["stopped_by"] or not episode["measurement_valid"]:
            report["stopped_by"] = report["stopped_by"] or "invalid_measurement"
            break
    if len(report["episodes"]) == 3 and not report["gates"]:
        report["gates"].append(screen_gate(report["episodes"]))
    if len(report["episodes"]) == 6:
        report["gates"].append(screen_gate(report["episodes"][3:]))
    report["run_finished"] = bool(report["gates"]) and all(e["run_finished"] for e in report["episodes"])
    report["comparison_complete"] = bool(report["gates"]) and all(e["measurement_valid"] for e in report["episodes"])
    report["elapsed_seconds"] = round(time.monotonic() - began + report.get("prior_elapsed_seconds", 0), 3)
    report["elapsed_wall_including_suspend_seconds"] = round(time.monotonic() - began + report.get("prior_wall_seconds", 0), 3)
    write_json(output, report)
    print("Screen stopped: " + str(report["stopped_by"] or "completed") + "; gates=" + str(report["gates"]), flush=True)
    return report


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    sub = p.add_subparsers(dest="command", required=True)
    dry = sub.add_parser("dry-run")
    dry.add_argument("--output", type=Path, required=True)
    prep = sub.add_parser("prepare")
    prep.add_argument("--workspace", type=Path, required=True)
    prep.add_argument("--manifest", type=Path, required=True)
    live = sub.add_parser("run")
    live.add_argument("--manifest", type=Path, required=True)
    live.add_argument("--codex", type=Path, required=True)
    live.add_argument("--output", type=Path, required=True)
    cont = sub.add_parser("prepare-continuation")
    cont.add_argument("--original-manifest", type=Path, required=True)
    cont.add_argument("--prior-report", type=Path, required=True)
    cont.add_argument("--manifest", type=Path, required=True)
    retry = sub.add_parser("prepare-suspend-retry")
    retry.add_argument("--original-manifest", type=Path, required=True)
    retry.add_argument("--prior-report", type=Path, required=True)
    retry.add_argument("--manifest", type=Path, required=True)
    a = p.parse_args()
    if a.command == "dry-run":
        write_json(a.output, offline_controls())
    elif a.command == "prepare":
        prepare(a.workspace, a.manifest)
    elif a.command == "prepare-continuation":
        prepare_continuation(a.original_manifest, a.prior_report, a.manifest)
    elif a.command == "prepare-suspend-retry":
        prepare_suspend_retry(a.original_manifest, a.prior_report, a.manifest)
    else:
        with stay_awake():
            run(a.manifest, a.codex, a.output)
