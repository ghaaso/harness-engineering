"""One bounded continuation of the preserved pre-pressure usage-limit failure.

The original driver and evidence stay immutable. Preparation is model-free;
run uses the same persistent M thread, frozen calibration, and original N/A
order. A successful continuation is still an interrupted, confounded trial.
"""
from __future__ import annotations

import argparse
import copy
import hashlib
import json
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))

import eval_retention as original
from eval_client import Telemetry
from retention_fixture import history_phases, make_fixture, probe_prompt, grade_retention, task_prompt
from storage import read_json, write_json

HERE = Path(__file__).resolve().parent
AMENDMENT = (
    "One same-session continuation after the preserved M policy_correction usageLimitExceeded. "
    "Keep the failed turn and its partial edits; repeat only that failed phase with its exact "
    "original prompt, then continue the untouched phase order. Completed control and calibration "
    "are frozen and reused without model calls. N and A start from pristine fixtures in the "
    "original order. Original sources, logs and cumulative usage remain preserved and counted "
    "once. The time cap counts the prior reported elapsed_seconds plus continuation runtime; "
    "the stopped interval following the usage-limit failure is excluded, with real elapsed separately "
    "reported. The repeated correction and asymmetric interruption confound a clean randomized "
    "comparison. No new telemetry error is forgiven and no context gain is established."
)


def digest_file(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def prompt_digest(prompt):
    return hashlib.sha256(prompt.encode("utf-8")).hexdigest()


def read_events(paths):
    return [json.loads(line) for path in paths
            for line in Path(path).read_text(encoding="utf-8").splitlines()]


def accepted_interruption(episode):
    """Allow only the already-observed rate-limit error, never arbitrary errors."""
    phases = episode.get("phases", [])
    if len(phases) != 2 or [p.get("status") for p in phases] != ["completed", "failed"]:
        return False
    errors = [e for t in episode.get("telemetry", []) for e in t.get("errors", [])]
    return bool(len(errors) == 1 and errors[0].get("code") == "server_error"
        and errors[0].get("params", {}).get("error", {}).get("codexErrorInfo") == "usageLimitExceeded"
        and errors[0]["params"].get("turnId") == phases[-1]["turn_id"]
        and errors[0]["params"].get("threadId") == episode.get("thread_id")
        and all(not t.get("reroutes") and not t.get("stop_reason") for t in episode["telemetry"]))


def remaining_history(episode, fixture):
    phases = list(history_phases(fixture, log_chars=0))
    saved = episode["phases"]
    if [p["name"] for p in saved] != [p.id for p in phases[:2]]:
        raise ValueError("Continuation is restricted to the original second history phase")
    for actual, expected in zip(saved, phases):
        if actual["prompt_sha256"] != prompt_digest(expected.prompt):
            raise ValueError("Historical prompt differs from the original phase")
    return phases[1:]


def verify_saved_episode(episode):
    events = read_events(episode["events"])
    telemetry = Telemetry()
    for event in events:
        if event.get("direction") == "in":
            telemetry.ingest(event["message"], event.get("sequence"))
    maxima = telemetry.usage(episode["thread_id"])["observed_max"]
    if maxima["inputTokens"] != episode["ordinary_input"] or maxima["outputTokens"] != episode["ordinary_output"]:
        raise ValueError("Prior report totals do not match supported event logs")
    requests = {}
    for event in events:
        msg = event.get("message", {})
        if event.get("direction") == "out" and msg.get("method") == "turn/start":
            prompt = "".join(i.get("text", "") for i in msg["params"].get("input", []))
            requests[prompt_digest(prompt)] = True
    for phase in episode["phases"]:
        if phase["prompt_sha256"] not in requests:
            raise ValueError("Historical prompt not supported by saved requests")
        turn = telemetry.turns.get((episode["thread_id"], phase["turn_id"]))
        if not turn or turn["status"] != phase["status"]:
            raise ValueError("Historical phase status does not match saved events")
    if telemetry.errors != [e for t in episode["telemetry"] for e in t["errors"]]:
        raise ValueError("Historical telemetry error summary differs from saved events")
    return events


def project_fingerprints(manifest):
    """Freeze participant files without reading notes into any model prompt."""
    root = Path(manifest["workspace"])
    files = {}
    for arm in ("control", "M", "N", "A"):
        project = root / arm
        fixture = make_fixture(seed=1730 if arm == "control" else manifest["seed"])
        for name, sha in fixture.initial_source_hashes.items():
            if digest_file(project / name) != sha:
                raise ValueError("Participant fixture source changed: " + arm + "/" + name)
        if arm in {"N", "A"}:
            for name, content in fixture.initial_files.items():
                if (project / name).read_bytes() != content.encode("utf-8"):
                    raise ValueError("Unstarted arm is not pristine: " + arm + "/" + name)
            if (project / "artifacts").exists():
                raise ValueError("Unstarted arm already contains work artifacts: " + arm)
        for path in project.rglob("*"):
            relative = path.relative_to(project)
            if relative.parts[:2] == (".codex", "context-runtime") or relative.parts[0] == ".git":
                continue
            if path.is_symlink():
                raise ValueError("Unexpected participant symlink")
            if path.is_file():
                files[str(path)] = digest_file(path)
    return files


def validate_prior(manifest, prior):
    if manifest["source_hashes"] != original.hashes():
        raise ValueError("Original frozen sources changed")
    if manifest["config"] != original.configuration() or manifest["order"] != ["M", "N", "A"]:
        raise ValueError("Original configuration/order changed")
    if read_json(Path(manifest["workspace"]) / "evaluation-owner.json").get("kind") != manifest["kind"]:
        raise ValueError("Workspace ownership mismatch")
    if [e["arm"] for e in prior["episodes"]] != ["control", "M"]:
        raise ValueError("Continuation requires exactly completed control and interrupted M")
    control, interrupted = prior["episodes"]
    if not original.completed_control(control) or not accepted_interruption(interrupted):
        raise ValueError("Not the supported control/rate-limit interruption")
    if interrupted.get("run_finished") or any(interrupted.get(k) for k in ("probes", "compactions", "pressure_prompts")):
        raise ValueError("Continuation cannot restart pressure or a completed arm")
    if [p["name"] for p in control["phases"]] != ["complete_short_control", "token_ratio_calibration"]:
        raise ValueError("Completed control calibration is unavailable")
    remaining_history(interrupted, make_fixture(seed=manifest["seed"]))
    for episode in prior["episodes"]:
        verify_saved_episode(episode)
    for field in ("input", "output"):
        if prior["reported_" + field] != sum(e["ordinary_" + field] for e in prior["episodes"]):
            raise ValueError("Prior aggregate usage is inconsistent")
    if not (0 <= prior["elapsed_seconds"] < manifest["limits"]["seconds"]):
        raise ValueError("No declared time allowance remains")
    calibration = prior["calibration"]
    increment = calibration["after_request_input"] - calibration["before_request_input"]
    ratio = manifest["pressure"]["calibration_chars"] / increment
    chars = min(int(calibration["capacity"] * manifest["pressure"]["estimated_capacity_fraction_per_block"] * ratio),
                manifest["pressure"]["max_prompt_bytes"] - 2000)
    if ratio != calibration["chars_per_token_estimate"] or chars != prior["frozen_block_chars"]:
        raise ValueError("Frozen calibration changed")


def prepare(prior_report, manifest_path):
    prior_report, manifest_path = Path(prior_report).resolve(), Path(manifest_path).resolve()
    if manifest_path.exists():
        raise ValueError("Use a new continuation manifest path")
    prior = read_json(prior_report)
    original_path = Path(prior["manifest"]).resolve()
    manifest = read_json(original_path)
    validate_prior(manifest, prior)
    frozen = {str(prior_report): digest_file(prior_report), str(original_path): digest_file(original_path),
              str(HERE / "eval_retention_resume.py"): digest_file(HERE / "eval_retention_resume.py")}
    # Cover transitive imported runtime/helpers without altering the original manifest.
    for path in HERE.glob("*.py"):
        frozen[str(path.resolve())] = digest_file(path)
    for episode in prior["episodes"]:
        for path in episode["events"]:
            frozen[str(Path(path).resolve())] = digest_file(path)
    frozen.update(project_fingerprints(manifest))
    first = read_events(prior["episodes"][0]["events"])[0]["utc"]
    manifest.update(live_started=False, prior_report=str(prior_report), original_manifest=str(original_path),
        continuation_amendment=AMENDMENT, continuation_frozen_files=frozen,
        continuation_prepared_utc=datetime.now(timezone.utc).isoformat(), original_started_utc=first,
        prior_elapsed_seconds=prior["elapsed_seconds"], randomized_trial_clean=False,
        stopped_interval_excluded=True)
    write_json(manifest_path, manifest)
    return manifest


def allowance_for(manifest, consumed, elapsed, prior_episode=None):
    """Client caps are cumulative thread thresholds, not remaining-token caps."""
    limits = manifest["limits"]
    prior_episode = prior_episode or {}
    allowance = {field: min(limits["arm_" + field], limits[field] - consumed[field]
                           + prior_episode.get("ordinary_" + field, 0)) for field in ("input", "output")}
    allowance["seconds"] = limits["seconds"] - manifest["prior_elapsed_seconds"] - elapsed
    if allowance["seconds"] <= 0 or any(allowance[f] <= prior_episode.get("ordinary_" + f, 0) for f in ("input", "output")):
        raise ValueError("Continuation allowance exhausted")
    return allowance


def continuation_valid(episode, prior, new_telemetry):
    all_telemetry = prior.get("telemetry", []) + new_telemetry
    covered = {r["turn_id"] for t in all_telemetry for r in t["per_turn_usage_coverage"]
               if r["thread_id"] == episode["thread_id"] and r["usage_observed"]}
    failed = prior["phases"][-1]["turn_id"] if prior else None
    phases = episode["phases"]
    successful = [p for p in phases if p["status"] == "completed"]
    retried = [p for p in successful if p.get("retry_of_turn_id") == failed] if prior else []
    valid = bool(not episode.get("error") and successful and all(p["turn_id"] in covered for p in successful)
        and all(p["status"] == "completed" or p["turn_id"] == failed for p in phases)
        and all(not t["errors"] and not t["reroutes"] and not t.get("stop_reason") for t in new_telemetry)
        and (not prior or accepted_interruption(prior) and len(retried) == 1))
    return valid


class ContinuationEpisode(original.Episode):
    def start(self):
        if not self.prior_episode:
            return super().start()
        self.episode = copy.deepcopy(self.prior_episode)
        self.episode.update(run_finished=False, measurement_valid=False, randomized_trial_clean=False)
        self.episode["historical_interruption"] = {
            "error": self.episode.pop("error", None), "events": list(self.prior_episode["events"]),
            "errors": [e for t in self.prior_episode["telemetry"] for e in t["errors"]],
            "failed_turn_id": self.prior_episode["phases"][-1]["turn_id"], "confounded": True}
        self.sid = self.prior_episode["thread_id"]
        self.resume_baseline = self.totals()
        self.open_client()
        self.resume_stored()

    def resume_stored(self):
        # The supported read is controller-side only; no saved files/history are
        # inserted into participant prompts. Failed turn remains in native history.
        stored = self.client.request("thread/read", {"threadId": self.sid, "includeTurns": True})["thread"]
        ids = [t["id"] for t in stored.get("turns", [])]
        expected = {p["turn_id"] for p in self.episode["phases"]}
        history_exact = len(ids) == len(expected) and set(ids) == expected
        if not history_exact:
            self.episode["persistence"] = {"verified": False, "all_prior_turns_retained": expected <= set(ids),
                "unexpected_or_duplicate_turns": True, "stored_turn_ids": ids}
            raise RuntimeError("Stored same-thread persistence has unexpected/missing turns")
        resumed = self.client.request("thread/resume", {"threadId": self.sid, **self.params()})
        valid = (stored["id"] == self.sid == resumed["thread"]["id"] and stored.get("ephemeral") is False
                  and history_exact and resumed.get("model") == self.manifest["model"]
                 and resumed.get("reasoningEffort") == self.manifest["effort"] and not resumed.get("instructionSources"))
        record = {"read_id": stored["id"], "read_ephemeral": stored.get("ephemeral"), "stored_turn_ids": ids,
                  "resumed_id": resumed["thread"]["id"], "verified": valid, "all_prior_turns_retained": expected <= set(ids)}
        self.episode.setdefault("persistence_history", []).append(copy.deepcopy(self.episode.get("persistence", {})))
        self.episode["persistence"] = record
        if not valid:
            raise RuntimeError("Stored same-thread persistence/effective settings not verified")
        config = self.client.request("config/read", {"includeLayers": False, "cwd": str(self.project)}).get("config", {})
        if config.get("model_auto_compact_token_limit") is not None:
            raise RuntimeError("Inherited configured compaction threshold is present")

    def turn(self, name, prompt, mode="work"):
        if self.allowance["seconds"] <= time.monotonic() - self.started:
            raise RuntimeError("Continuation time allowance exhausted")
        if any(self.totals()[f] >= self.allowance[f] for f in ("input", "output")):
            raise RuntimeError("Cumulative token allowance exhausted")
        before = len(self.episode["phases"])
        try:
            return super().turn(name, prompt, mode)
        finally:
            if self.prior_episode and len(self.episode["phases"]) > before and name == self.prior_episode["phases"][-1]["name"]:
                self.episode["phases"][-1]["retry_of_turn_id"] = self.prior_episode["phases"][-1]["turn_id"]

    def close(self):
        episode = super().close()
        new = [c.report() for c in self.clients]
        valid = continuation_valid(episode, self.prior_episode or {}, new)
        # Original telemetry is untouched, including the historical error.
        episode["continuation_measurement_valid"] = valid
        episode["measurement_valid"] = False if self.prior_episode else valid
        episode["randomized_trial_clean"] = not bool(self.prior_episode)
        if self.prior_episode:
            failed = self.prior_episode["phases"][-1]["turn_id"]
            coverage = [r for t in self.prior_episode["telemetry"] for r in t["per_turn_usage_coverage"]
                        if r["thread_id"] == self.sid and r["turn_id"] == failed]
            episode["historical_interruption"]["usage_coverage"] = coverage
            episode["historical_interruption"]["accounting_scope"] = (
                "All supported cumulative usage observed before interruption is retained. "
                "A failed request without a usage update is not assumed to have zero cost; full billing remains unknown.")
            episode["historical_measurement_valid"] = self.prior_episode["measurement_valid"]
        return episode


def run_pressure(ep, manifest, chars):
    completed_cycles = 0
    if ep.boundaries():
        raise RuntimeError("Unexpected automatic compaction before pressure")
    for block in range(manifest["pressure"]["max_blocks"]):
        prior_count = len(ep.boundaries())
        prompt = original.log_prompt(manifest["seed"] + block + 10000, chars)
        ep.episode["pressure_prompts"].append({"block": block, "utf8_bytes": len(prompt.encode()), "sha256": prompt_digest(prompt)})
        ep.turn("history_block_" + str(block), prompt, "probe")
        boundaries = ep.boundaries()
        if len(boundaries) > prior_count:
            if len(boundaries) != prior_count + 1:
                raise RuntimeError("Multiple compactions crossed within one block")
            keys = manifest["probe_keys"][completed_cycles]
            rows = original.ordinary_request_inputs(ep.client.report()["usage_observations"])
            previous = boundaries[-2]["completed_sequence"] if len(boundaries) > 1 else 0
            window = [r for r in rows if previous < r["sequence"] < boundaries[-1]["completed_sequence"]]
            fill = original.requested_capacity_fraction(window)
            boundaries[-1]["pre_boundary_peak_request_capacity_fraction"] = fill
            boundaries[-1]["pre_boundary_last_observed_request_input"] = window[-1]["input_tokens"] if window else None
            result = ep.turn("memory_probe_" + str(completed_cycles + 1), probe_prompt(keys=keys), "probe")
            reply = original.final_reply(result)
            ep.episode["probes"].append({"cycle": completed_cycles + 1, "keys": keys, "answer": reply,
                "grade": grade_retention(reply, ep.fixture, keys=keys),
                "ordinary_request_input": ep.client.usage(ep.sid)["last"]["inputTokens"],
                "fill_peak_capacity_fraction": fill, "boundary": boundaries[-1]})
            completed_cycles += 1
            if completed_cycles == manifest["pressure"]["cycles"]:
                break
    if completed_cycles != manifest["pressure"]["cycles"]:
        raise RuntimeError("Required repeated automatic compaction not observed")
    ep.turn("practical_completion", task_prompt())


def run(manifest_path, codex, output):
    manifest_path, output = Path(manifest_path).resolve(), Path(output).resolve()
    manifest = read_json(manifest_path)
    if manifest["live_started"] or output.exists():
        raise ValueError("Already started manifest or existing output")
    for path, expected in manifest["continuation_frozen_files"].items():
        if digest_file(path) != expected:
            raise ValueError("Frozen continuation evidence/source changed: " + path)
    prior = read_json(Path(manifest["prior_report"]))
    frozen_original = read_json(Path(manifest["original_manifest"]))
    for field in ("source_hashes", "model", "effort", "limits", "pressure", "seed", "probe_keys",
                  "workspace", "config", "order", "notes_bytes", "restore_bytes"):
        if manifest[field] != frozen_original[field]:
            raise ValueError("Continuation changed original experiment setting: " + field)
    if manifest["prior_elapsed_seconds"] != prior["elapsed_seconds"]:
        raise ValueError("Continuation changed prior elapsed accounting")
    validate_prior(manifest, prior)
    current = project_fingerprints(manifest)
    if any(manifest["continuation_frozen_files"].get(p) != sha for p, sha in current.items()):
        raise ValueError("Participant state changed after freezing continuation")
    manifest["live_started"] = True
    write_json(manifest_path, manifest)
    logdir = output.parent / (output.stem + "-events")
    logdir.mkdir()
    report = {"manifest": str(manifest_path), "source_hashes": original.hashes(),
        "continuation_runner_sha256": digest_file(__file__), "continuation_amendment": AMENDMENT,
        "driver_amendment": manifest.get("driver_amendment"),
        "prior_report": manifest["prior_report"], "episodes": [copy.deepcopy(prior["episodes"][0])],
        "limits": manifest["limits"], "calibration": copy.deepcopy(prior["calibration"]),
        "frozen_block_chars": prior["frozen_block_chars"], "reported_input": prior["reported_input"],
        "reported_output": prior["reported_output"], "run_finished": False, "stopped_by": None,
        "compaction_cost": "unreported", "context_gain_proven": False, "scope": manifest["scope"],
        "randomized_trial_clean": False, "historical_interruption_preserved": True,
        "prior_elapsed_seconds": manifest["prior_elapsed_seconds"], "prior_usage_counted_once": True}
    began = time.monotonic()
    for arm in manifest["order"]:
        ep = None
        old = prior["episodes"][1] if arm == "M" else None
        try:
            consumed = {f: report["reported_" + f] for f in ("input", "output")}
            allowance = allowance_for(manifest, consumed, time.monotonic() - began, old)
            ep = ContinuationEpisode(manifest, arm, codex, logdir, allowance, output)
            ep.prior_episode = old
            ep.start()
            phases = remaining_history(old, ep.fixture) if old else history_phases(ep.fixture, log_chars=0)
            for i, phase in enumerate(phases):
                ep.turn(phase.id, phase.prompt)
                if not old and i == 0:
                    ep.restart()
            run_pressure(ep, manifest, report["frozen_block_chars"])
            ep.episode["run_finished"] = True
        except Exception as error:
            report["stopped_by"] = type(error).__name__ + ": " + str(error)
            if ep:
                ep.episode["error"] = {"type": type(error).__name__, "message": str(error)}
        finally:
            if ep:
                episode = ep.close()
                report["episodes"].append(episode)
                for field in ("input", "output"):
                    report["reported_" + field] += episode["ordinary_" + field] - (old["ordinary_" + field] if old else 0)
            elif old:
                report["episodes"].append(copy.deepcopy(old))
            report["continuation_elapsed_seconds"] = round(time.monotonic() - began, 3)
            report["elapsed_seconds"] = round(manifest["prior_elapsed_seconds"] + time.monotonic() - began, 3)
            report["real_elapsed_seconds"] = round((datetime.now(timezone.utc) - datetime.fromisoformat(manifest["original_started_utc"])).total_seconds(), 3)
            report["excluded_stopped_interval_seconds"] = round(max(0, report["real_elapsed_seconds"] - report["elapsed_seconds"]), 3)
            write_json(output, report)
        if report["stopped_by"] or not ep or not ep.episode["continuation_measurement_valid"]:
            report["stopped_by"] = report["stopped_by"] or "invalid_continuation_measurement"
            break
    report["run_finished"] = len(report["episodes"]) == 4 and all(e["run_finished"] for e in report["episodes"])
    report["amended_normal_window_verified"] = report["run_finished"] and all(e["continuation_measurement_valid"]
        and len(e["compactions"]) >= 2 and all(b["lifecycle_valid"] for b in e["compactions"])
        and len(e["probes"]) == 2 and all(p["fill_peak_capacity_fraction"] >= manifest["pressure"]["required_peak_capacity_fraction"] for p in e["probes"])
        for e in report["episodes"] if e["arm"] != "control")
    report["normal_window_verified"] = False  # Original unamended trial was interrupted.
    adapters = [e for e in report["episodes"] if e["arm"] == "A"]
    report["adapter_delivery_verified"] = bool(len(adapters) == 1 and adapters[0]["run_finished"]
        and adapters[0]["measurement_valid"] and len(adapters[0]["compactions"]) >= 2
        and all(b["restoration_valid"] for b in adapters[0]["compactions"]))
    write_json(output, report)
    print("Finished: " + str(report["stopped_by"] or "amended cohort complete"), flush=True)
    return report


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    prep = commands.add_parser("prepare")
    prep.add_argument("--prior-report", type=Path, required=True)
    prep.add_argument("--manifest", type=Path, required=True)
    live = commands.add_parser("run")
    live.add_argument("--manifest", type=Path, required=True)
    live.add_argument("--codex", type=Path, required=True)
    live.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    if args.command == "prepare":
        prepare(args.prior_report, args.manifest)
    else:
        with original.stay_awake():
            run(args.manifest, args.codex, args.output)
