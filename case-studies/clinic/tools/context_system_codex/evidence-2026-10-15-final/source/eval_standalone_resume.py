"""Resume the same admitted N history after its exact usage-limit failure.

No pressure/fact/probe replay. Frozen original sources and reports stay intact;
the failed turn remains in native history and explicit historical evidence.
"""
from __future__ import annotations
import argparse
import copy
import json
import sys
import time
from pathlib import Path

sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
import eval_standalone_pressure as base
import eval_retention as old
from retention_fixture import make_fixture, probe_prompt, grade_retention, task_prompt
from storage import read_json, write_json

PROMPT = "Use no tools and leave notes unchanged. Reply only ACK."
PHASES = ["channel_calibration", "orientation", "policy_correction", "evidence_and_scope", "history_block_0",
          "neutral_continuation_1", "memory_probe_1", "history_block_1", "neutral_continuation_2"]


def validate_saved(report, manifest):
    if len(report["episodes"]) != 1 or report["episodes"][0]["arm"] != "N":
        raise ValueError("Require only the preserved interrupted N arm")
    ep = report["episodes"][0]
    if [p["name"] for p in ep["phases"]] != PHASES:
        raise ValueError("Unexpected saved phase sequence")
    failed = ep["phases"][-1]
    if (failed["status"] != "failed" or failed["prompt_sha256"] != base.sha(PROMPT.encode())
            or any(p["status"] != "completed" for p in ep["phases"][:-1])):
        raise ValueError("Unexpected failed/completed turn or prompt")
    errors = [e for t in ep["telemetry"] for e in t["errors"]]
    if len(errors) != 1 or errors[0].get("code") != "server_error":
        raise ValueError("Unexpected historical telemetry error")
    params = errors[0]["params"]
    if (params.get("threadId") != ep["thread_id"] or params.get("turnId") != failed["turn_id"]
            or params.get("error", {}).get("codexErrorInfo") != "usageLimitExceeded"):
        raise ValueError("Only exact saved usage-limit failure is resumable")
    if any(t["reroutes"] or t["stop_reason"] for t in ep["telemetry"]):
        raise ValueError("Historical reroute/budget stop")
    if (not ep["pressure_admission"]["verified"] or len(ep["compactions"]) != 1
            or len(ep["pressure_calls"]) != 3 or len(ep["probes"]) != 1):
        raise ValueError("Unexpected pressure or completed cycle evidence")
    if report["reported_input"] != manifest["prior_input"] + ep["ordinary_input"] or report["reported_output"] != manifest["prior_output"] + ep["ordinary_output"]:
        raise ValueError("Prior cumulative accounting mismatch")
    return ep


def resume_allowance(manifest, report, prior):
    input_left = manifest["limits"]["input"] - report["reported_input"]
    output_left = manifest["limits"]["output"] - report["reported_output"]
    active_left = manifest["limits"]["active_seconds"] - manifest["prior_active_elapsed_seconds"]
    allowance = {"input": min(manifest["limits"]["arm_input"], prior["ordinary_input"] + input_left),
        "output": min(manifest["limits"]["arm_output"], prior["ordinary_output"] + output_left), "seconds": active_left}
    if (min(input_left, output_left, active_left) <= 0 or allowance["input"] <= prior["ordinary_input"]
            or allowance["output"] <= prior["ordinary_output"]):
        raise ValueError("Original remaining allowance exhausted before activation")
    return allowance


def pristine(manifest):
    fixture = make_fixture(seed=manifest["seed"])
    for arm in manifest["order"]:
        project = Path(manifest["workspace"]) / arm
        for name, contents in fixture.initial_files.items():
            if (project / name).read_bytes() != contents.encode():
                raise ValueError("Saved participants are no longer pristine: " + arm + "/" + name)
        if any((project / "artifacts").glob("*")):
            raise ValueError("Unexpected participant artifacts")


def prepare(prior_report, manifest_path):
    prior_report, manifest_path = Path(prior_report).resolve(), Path(manifest_path).resolve()
    if manifest_path.exists():
        raise ValueError("Preserve existing continuation manifests")
    report = read_json(prior_report)
    original_path = Path(report["manifest"])
    m = read_json(original_path)
    ep = validate_saved(report, m)
    for path, checksum in m["source_hashes"].items():
        if base.sha(Path(path).read_bytes()) != checksum:
            raise ValueError("Executed source changed: " + path)
    if base.sha(Path(m["codex"]).read_bytes()) != m["codex_sha256"]:
        raise ValueError("Executed runtime changed")
    pristine(m)
    m = copy.deepcopy(m)
    m.update(live_started=False, source_hashes=base.sources(), resume_from_report=str(prior_report),
        resume_from_report_sha256=base.sha(prior_report.read_bytes()), original_manifest=str(original_path),
        original_manifest_sha256=base.sha(original_path.read_bytes()), historical_failed_turn_id=ep["phases"][-1]["turn_id"],
        saved_turn_ids=[p["turn_id"] for p in ep["phases"]], resumed_input_baseline=ep["ordinary_input"],
        resumed_output_baseline=ep["ordinary_output"], prior_active_elapsed_seconds=report["active_elapsed_seconds"],
        saved_event_hashes={str(Path(p).resolve()): base.sha(Path(p).read_bytes()) for p in ep["events"]},
        continuation_amendment="Same persistent N thread after exactly one usageLimitExceeded during second neutral automatic compaction. Retain failed native turn and raw error. Retry only exact neutral prompt, then second disjoint probe and practical work; no pressure/fact/first-probe replay. Fresh unchanged M/A follow original protocol. N retry is explicit asymmetry; failed usage and resumed maxima count once. Original wall limit failed; stopped gap excluded only from remaining active allowance.")
    write_json(manifest_path, m)
    return m


class ResumedN(base.StandaloneEpisode):
    def __init__(self, manifest, prior, *args):
        super().__init__(manifest, "N", *args)
        self.prior_episode = copy.deepcopy(prior)
        self.episode = copy.deepcopy(prior)
        failed = self.episode["phases"].pop()
        self.episode["historical_failed_phases"] = [failed]
        self.episode["historical_driver_error"] = self.episode.pop("error")
        self.episode["original_attempt_measurement_valid"] = self.episode["measurement_valid"]
        self.pressure_calls = copy.deepcopy(prior["pressure_calls"])
        self.sid = prior["thread_id"]
        self.resume_baseline = {"input": prior["ordinary_input"], "output": prior["ordinary_output"]}

    def resume_stored(self):
        stored = self.client.request("thread/read", {"threadId": self.sid, "includeTurns": True})["thread"]
        ids = [t["id"] for t in stored.get("turns", [])]
        if stored["id"] != self.sid or stored.get("ephemeral") is not False or ids != self.manifest["saved_turn_ids"]:
            raise ValueError("Stored history differs from exact saved turn set")
        resumed = self.client.request("thread/resume", {"threadId": self.sid, **self.params()})
        if (resumed["thread"]["id"] != self.sid or resumed.get("model") != self.manifest["model"]
                or resumed.get("reasoningEffort") != self.manifest["effort"] or resumed.get("instructionSources")):
            raise ValueError("Resumed identity/settings mismatch")
        config = self.client.request("config/read", {"includeLayers": False, "cwd": str(self.project)}).get("config", {})
        if config.get("model_auto_compact_token_limit") is not None:
            raise ValueError("Inherited configured compaction threshold changed")
        self.episode["continuation_persistence"] = {"verified": True, "stored_turn_ids": ids,
            "resumed_id": self.sid, "failed_turn_retained": self.manifest["historical_failed_turn_id"] in ids}

    def boundaries(self):
        old_boundaries = self.prior_episode["compactions"]
        fresh = super().boundaries()
        ids = [b["item_id"] for b in old_boundaries + fresh]
        if len(ids) != len(set(ids)):
            raise ValueError("Duplicate resumed compaction IDs")
        return copy.deepcopy(old_boundaries) + fresh


def run(manifest_path, output):
    manifest_path, output = Path(manifest_path).resolve(), Path(output).resolve()
    m = read_json(manifest_path)
    if m["live_started"] or output.exists() or m["source_hashes"] != base.sources():
        raise ValueError("Used/changed continuation protocol")
    for field in ("resume_from_report", "original_manifest", "prior_report", "channel_report"):
        if base.sha(Path(m[field]).read_bytes()) != m[field + "_sha256"]:
            raise ValueError("Changed frozen evidence: " + field)
    for path, checksum in m["saved_event_hashes"].items():
        if base.sha(Path(path).read_bytes()) != checksum:
            raise ValueError("Changed original supported event log")
    if base.sha(Path(m["codex"]).read_bytes()) != m["codex_sha256"]:
        raise ValueError("Runtime changed")
    saved = read_json(Path(m["resume_from_report"]))
    prior = validate_saved(saved, m)
    pristine(m)
    allowance = resume_allowance(m, saved, prior)
    m["live_started"] = True
    write_json(manifest_path, m)
    logs = output.parent / (output.stem + "-events")
    logs.mkdir()
    result = {"manifest": str(manifest_path), "source_hashes": m["source_hashes"], "amendment": m["amendment"],
        "continuation_amendment": m["continuation_amendment"], "resume_from_report": m["resume_from_report"],
        "episodes": [], "reported_input": m["prior_input"], "reported_output": m["prior_output"],
        "cohort_input": 0, "cohort_output": 0, "context_gain_proven": False, "full_compaction_cost": "unknown",
        "prior_usage_counted_once": True, "stopped_by": None, "run_finished": False, "normal_window_verified": False}
    began = time.monotonic()
    ep = ResumedN(m, prior, Path(m["codex"]), logs, allowance, output)
    try:
        ep.open_client()
        ep.resume_stored()
        notes = (ep.project / "task.md").read_bytes()
        ep.turn("neutral_continuation_2", PROMPT, "probe")
        boundaries = ep.boundaries()
        if len(boundaries) != 2 or not all(b["lifecycle_valid"] for b in boundaries):
            raise RuntimeError("Second normal automatic compaction not established")
        if (ep.project / "task.md").read_bytes() != notes or ep.client.usage(ep.sid)["last"]["inputTokens"] > m["post_compaction_input_cap"]:
            raise RuntimeError("Resumed compacted continuation notes/context invalid")
        keys = m["probe_keys"][1]
        answer = ep.turn("memory_probe_2", probe_prompt(keys), "probe")
        if ep.client.usage(ep.sid)["last"]["inputTokens"] > m["post_compaction_input_cap"]:
            raise RuntimeError("Resumed probe exceeds context cap")
        parsed = old.final_reply(answer)
        ep.episode["probes"].append({"cycle": 2, "keys": keys, "answer": parsed,
            "grade": grade_retention(parsed, ep.fixture, keys),
            "ordinary_request_input": ep.client.usage(ep.sid)["last"]["inputTokens"], "boundary": boundaries[-1]})
        ep.turn("practical_completion", task_prompt())
        ep.episode["run_finished"] = True
    except Exception as error:
        result["stopped_by"] = type(error).__name__ + ": " + str(error)
        ep.episode["error"] = {"type": type(error).__name__, "message": str(error)}
    finally:
        n = ep.close()
        n["continuation_measurement_valid"] = bool(n["per_phase_usage_verified"] and all(
            not c.report()["errors"] and not c.report()["reroutes"] and not c.report()["stop_reason"] for c in ep.clients))
        result["episodes"].append(n)
        for field in ("input", "output"):
            result["reported_" + field] += n["ordinary_" + field]
            result["cohort_" + field] += n["ordinary_" + field]
        result["active_elapsed_seconds"] = m["prior_active_elapsed_seconds"] + time.monotonic() - began
        write_json(output, result)
    if result["stopped_by"] or not n["continuation_measurement_valid"]:
        return result
    # Execute the original frozen arm body unchanged for fresh M/A. Its two-arm
    # subreport is intentionally incomplete until this aggregate joins resumed N.
    remaining = copy.deepcopy(m)
    remaining.update(order=["M", "A"], live_started=False, prior_input=result["reported_input"],
        prior_output=result["reported_output"], prior_elapsed_seconds=result["active_elapsed_seconds"])
    remaining_manifest = output.with_name(output.stem + "-remaining-manifest.json")
    remaining_output = output.with_name(output.stem + "-remaining-report.json")
    write_json(remaining_manifest, remaining)
    fresh = base.run(remaining_manifest, remaining_output)
    result["remaining_report"] = str(remaining_output)
    result["episodes"].extend(fresh["episodes"])
    for field in ("input", "output"):
        result["reported_" + field] = fresh["reported_" + field]
        result["cohort_" + field] += fresh["cohort_" + field]
    result["stopped_by"] = fresh["stopped_by"]
    result["active_elapsed_seconds"] = fresh["active_elapsed_seconds"]
    result["run_finished"] = len(result["episodes"]) == 3 and all(e["run_finished"] for e in result["episodes"])
    result["qualified_measurement_pending_independent_audit"] = result["run_finished"]
    write_json(output, result)
    return result


if __name__ == "__main__":
    p = argparse.ArgumentParser(description=__doc__)
    sub = p.add_subparsers(dest="command", required=True)
    prep = sub.add_parser("prepare")
    prep.add_argument("--prior-report", type=Path, required=True)
    prep.add_argument("--manifest", type=Path, required=True)
    live = sub.add_parser("run")
    live.add_argument("--manifest", type=Path, required=True)
    live.add_argument("--output", type=Path, required=True)
    args = p.parse_args()
    if args.command == "prepare":
        prepare(args.prior_report, args.manifest)
    else:
        with old.stay_awake():
            report = run(args.manifest, args.output)
        print(report["stopped_by"] or "Resumed comparison finished", flush=True)
        raise SystemExit(0 if report["run_finished"] else 1)
