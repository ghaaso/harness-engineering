"""Continue after an evidence-proven callback-selection verifier error.

The completed first neutral turn is not replayed. Original reports and verifier
remain frozen; this continuation selects exact snapshot-linked callbacks.
"""
from __future__ import annotations
import argparse
import copy
import json
import sys
import time
from pathlib import Path
from types import SimpleNamespace

sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
import eval_adapter_resume as adapter
import eval_standalone_pressure as base
import eval_retention as old
from retention_fixture import probe_prompt, grade_retention, task_prompt
from storage import read_json, write_json
from matching_boundary import automatic_boundaries

ERROR = "Fresh complete automatic adapter restoration not established"


def corrected_boundary(manifest, episode):
    events = [json.loads(line) for line in Path(episode["events"][-1]).read_text(encoding="utf-8").splitlines()]
    project = Path(manifest["workspace"]) / "A"
    store = old.ContextStore(**old.settings(project))
    boundaries = automatic_boundaries(SimpleNamespace(events=events), episode["thread_id"], store)
    if len(boundaries) != 1 or not boundaries[0]["restoration_valid"]:
        raise ValueError("Recorded first restoration not independently matched")
    return boundaries


def validate_saved(report, manifest):
    if [e["arm"] for e in report["episodes"]] != ["N", "M", "A"] or not all(e["run_finished"] for e in report["episodes"][:2]):
        raise ValueError("Preserve completed controls")
    e = report["episodes"][2]
    expected = ["channel_calibration", "orientation", "policy_correction", "evidence_and_scope", "history_block_0", "neutral_continuation_1"]
    if [p["name"] for p in e["phases"]] != expected or any(p["status"] != "completed" for p in e["phases"]):
        raise ValueError("Only the completed pre-probe prefix is resumable")
    if e.get("error") != {"type": "RuntimeError", "message": ERROR} or e["probes"] or len(e["pressure_calls"]) != 2:
        raise ValueError("Unexpected verifier stop or sampled probe")
    if any(t["errors"] or t["reroutes"] or t["stop_reason"] for t in e["telemetry"][-1:]):
        raise ValueError("Latest callback episode has a native error")
    if not e["continuation_persistence"]["verified"] or len(e["compactions"]) != 1:
        raise ValueError("Prior continuation/compaction not established")
    if e["phases"][-1]["usage"]["last"]["inputTokens"] > manifest["post_compaction_input_cap"]:
        raise ValueError("Completed neutral context over cap")
    return e


def prepare(prior_report, manifest_path):
    prior_report, manifest_path = Path(prior_report).resolve(), Path(manifest_path).resolve()
    if manifest_path.exists():
        raise ValueError("Use a fresh correction manifest")
    report = read_json(prior_report)
    source = Path(report["manifest"])
    m = read_json(source)
    ep = validate_saved(report, m)
    for path, digest in m["source_hashes"].items():
        if base.sha(Path(path).read_bytes()) != digest:
            raise ValueError("Executed source changed")
    quota_report = read_json(Path(m["adapter_resume_from_report"]))
    quota_ep = quota_report["episodes"][2]
    # Six original turns include the failed quota turn, followed by the one
    # actually completed retry. Exact supported read must include all seven.
    ids = [p["turn_id"] for p in quota_ep["phases"]] + [ep["phases"][-1]["turn_id"]]
    m = copy.deepcopy(m)
    m.update(live_started=False, source_hashes=base.sources(), boundary_resume_from_report=str(prior_report),
        boundary_resume_from_report_sha256=base.sha(prior_report.read_bytes()), boundary_original_manifest=str(source),
        boundary_original_manifest_sha256=base.sha(source.read_bytes()), adapter_saved_turn_ids=ids,
        boundary_saved_event_hashes={p: base.sha(Path(p).read_bytes()) for e in report["episodes"] for p in e["events"]},
        corrected_prior_boundaries=corrected_boundary(m, ep), prior_active_elapsed_seconds=report["active_elapsed_seconds"],
        boundary_verifier_amendment="Original verifier selected deferred resume startup callback2068B atseq42 and missed exact snapshot restore2894B at44 before firstmodel49. Preserve original rejection/report. Correct only matching to a unique same-turn snapshot-linked SessionStart before model output. Continue from completed neutral1 with probe1; no repeated neutral1, compaction1, pressure0 or facts. All earlier usage/errors and N/M results remain.")
    adapter.native.resume_allowance(m, report, ep)
    write_json(manifest_path, m)
    return m


class RepairedA(adapter.ResumedA):
    def __init__(self, manifest, prior, *args):
        base.StandaloneEpisode.__init__(self, manifest, "A", *args)
        self.prior_episode = copy.deepcopy(prior)
        self.episode = copy.deepcopy(prior)
        self.episode["historical_verifier_error"] = self.episode.pop("error")
        self.pressure_calls = copy.deepcopy(prior["pressure_calls"])
        self.sid = prior["thread_id"]
        self.resume_baseline = {"input": prior["ordinary_input"], "output": prior["ordinary_output"]}

    def boundaries(self):
        return copy.deepcopy(self.manifest["corrected_prior_boundaries"]) + automatic_boundaries(self.client, self.sid, self.store)


def run(manifest_path, output):
    manifest_path, output = Path(manifest_path).resolve(), Path(output).resolve()
    m = read_json(manifest_path)
    if m["live_started"] or output.exists() or m["source_hashes"] != base.sources():
        raise ValueError("Used/changed correction protocol")
    for field in ("boundary_resume_from_report", "boundary_original_manifest", "adapter_resume_from_report", "adapter_original_manifest", "resume_from_report", "original_manifest", "prior_report", "channel_report"):
        if base.sha(Path(m[field]).read_bytes()) != m[field + "_sha256"]:
            raise ValueError("Frozen evidence changed")
    for path, digest in {**m["boundary_saved_event_hashes"], **m["participant_file_hashes"]}.items():
        if base.sha(Path(path).read_bytes()) != digest:
            raise ValueError("Evidence/participant file changed")
    if base.sha(Path(m["codex"]).read_bytes()) != m["codex_sha256"]:
        raise ValueError("Runtime changed")
    saved = read_json(Path(m["boundary_resume_from_report"]))
    prior = validate_saved(saved, m)
    if corrected_boundary(m, prior) != m["corrected_prior_boundaries"]:
        raise ValueError("Prior boundary evidence changed")
    allowance = adapter.native.resume_allowance(m, saved, prior)
    m["live_started"] = True
    write_json(manifest_path, m)
    logs = output.parent / (output.stem + "-events")
    logs.mkdir()
    result = copy.deepcopy(saved)
    result.update(manifest=str(manifest_path), source_hashes=m["source_hashes"], stopped_by=None, run_finished=False,
        boundary_resume_from_report=m["boundary_resume_from_report"], boundary_verifier_amendment=m["boundary_verifier_amendment"])
    began = time.monotonic()
    ep = RepairedA(m, prior, Path(m["codex"]), logs, allowance, output)
    try:
        ep.open_client()
        ep.resume_stored()
        for cycle in (1, 2):
            if cycle == 2:
                ep.pressure(1, m["block_chars"])
                notes = (ep.project / "task.md").read_bytes()
                ep.turn("neutral_continuation_2", adapter.native.PROMPT, "probe")
                b = ep.boundaries()
                if (len(b) != 2 or not b[-1]["restoration_valid"] or b[-1]["checkpoint_problem"] or b[-1]["checkpoint_omitted"]
                        or (ep.project / "task.md").read_bytes() != notes):
                    raise RuntimeError("Second exact automatic restoration not established")
                if ep.client.usage(ep.sid)["last"]["inputTokens"] > m["post_compaction_input_cap"]:
                    raise RuntimeError("Second neutral context over cap")
            keys = m["probe_keys"][cycle - 1]
            answer = ep.turn("memory_probe_" + str(cycle), probe_prompt(keys), "probe")
            if ep.client.usage(ep.sid)["last"]["inputTokens"] > m["post_compaction_input_cap"]:
                raise RuntimeError("Probe context over cap")
            parsed = old.final_reply(answer)
            ep.episode["probes"].append({"cycle": cycle, "keys": keys, "answer": parsed,
                "grade": grade_retention(parsed, ep.fixture, keys), "ordinary_request_input": ep.client.usage(ep.sid)["last"]["inputTokens"],
                "boundary": ep.boundaries()[cycle - 1]})
        ep.turn("practical_completion", task_prompt())
        ep.episode["run_finished"] = True
    except Exception as error:
        result["stopped_by"] = type(error).__name__ + ": " + str(error)
        ep.episode["error"] = {"type": type(error).__name__, "message": str(error)}
    finally:
        e = ep.close()
        e["continuation_measurement_valid"] = bool(e["per_phase_usage_verified"] and all(not c.report()["errors"]
            and not c.report()["reroutes"] and not c.report()["stop_reason"] for c in ep.clients))
        result["episodes"][2] = e
        for field in ("input", "output"):
            result["cohort_" + field] = sum(p["ordinary_" + field] for p in result["episodes"])
            result["reported_" + field] = m["prior_" + field] + result["cohort_" + field]
        result["active_elapsed_seconds"] = m["prior_active_elapsed_seconds"] + time.monotonic() - began
        result["run_finished"] = all(p["run_finished"] for p in result["episodes"])
        result["normal_window_verified"] = False
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
        print(report["stopped_by"] or "Corrected comparison finished", flush=True)
        raise SystemExit(0 if report["run_finished"] else 1)
