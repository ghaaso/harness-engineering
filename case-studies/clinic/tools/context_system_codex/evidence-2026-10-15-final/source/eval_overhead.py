"""Model-free byte attribution and Windows hook-launch measurements."""
from __future__ import annotations

import argparse
import json
import math
import statistics
import subprocess
import sys
import tempfile
import time
from pathlib import Path

sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
import budget
import hooks
import install
from ctx import settings
from engine import ContextStore
from storage import write_json

HERE = Path(__file__).resolve().parent


def timings(samples):
    ordered = sorted(samples)
    return {"samples": len(samples), "first_ms": round(samples[0], 3),
            "median_ms": round(statistics.median(samples), 3),
            "p95_ms": round(ordered[math.ceil(len(ordered) * .95) - 1], 3),
            "warm_median_ms": round(statistics.median(samples[1:]), 3)}


def run(output: Path, repetitions=30):
    if output.exists() or repetitions < 30:
        raise ValueError("Use a new output and at least 30 repetitions")
    report = {"model_calls": 0, "repetitions": repetitions, "measurements": {},
              "cold_definition": "first invocation, not guaranteed OS-cache cold",
              "native_runtime_residual_ms": None, "bytes_are_tokens": False}
    with tempfile.TemporaryDirectory(prefix="context-overhead-") as directory:
        root = Path(directory).resolve()
        (root / "task.md").write_text("<!-- ctx:restore -->\n## Current state\nSynthetic local profiling.\n<!-- /ctx:restore -->\n", encoding="utf-8", newline="")
        install.install(root, Path(sys.executable), HERE / "ctx.py", "task.md",
                        snapshot_bytes=4096, restore_bytes=4096)
        cfg = settings(root)
        payload = {"session_id": "profile-session", "source": "startup", "cwd": str(root)}
        raw = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        group = install._groups(Path(sys.executable), HERE / "ctx.py", root)[0]
        # install.HOOK_EVENTS starts with SessionStart; locate explicitly for clarity.
        group = next(g for g in install._groups(Path(sys.executable), HERE / "ctx.py", root)
                     if g["event"] == "SessionStart")
        windows = group["group"]["hooks"][0]["commandWindows"]
        direct = [sys.executable, "-I", "-B", str(HERE / "ctx.py"), "--project", str(root), "hook", "SessionStart"]
        local = []
        for _ in range(repetitions):
            began = time.perf_counter()
            value = hooks.handle("SessionStart", payload, **cfg)
            local.append((time.perf_counter() - began) * 1000)
        report["measurements"]["in_process_hook_and_storage"] = timings(local)
        expected = value
        for label, command in (("direct_python", direct), ("registered_windows_wrapper", windows)):
            samples = []
            for _ in range(repetitions):
                began = time.perf_counter()
                result = subprocess.run(command, input=raw, capture_output=True, timeout=15)
                samples.append((time.perf_counter() - began) * 1000)
                if result.returncode or json.loads(result.stdout.decode("utf-8-sig")) != expected:
                    raise RuntimeError("Hook launch failed or changed the payload")
            report["measurements"][label] = timings(samples)
            print(label + ": " + str(report["measurements"][label]), flush=True)
        body = expected["hookSpecificOutput"]["additionalContext"]
        lines = body.splitlines()
        command_lines = [line for line in lines if line.startswith(("Select:", "Recall:", "Open a hit:"))]
        report["synthetic_startup"] = {**budget.metrics(body),
            "command_lines_bytes": sum(len(line.encode()) for line in command_lines),
            "guidance_bytes": len(body.encode()) - sum(len(line.encode()) for line in command_lines),
            "command_count": len(command_lines), "path_length_dependent": True}
        store = ContextStore(**cfg)
        snapshot = store.snapshot("profile-session")
        state_bytes = sum(len(b["text"].encode()) for b in snapshot["blocks"])
        report["synthetic_checkpoint"] = {**budget.metrics(snapshot["text"]),
            "state_block_bytes": state_bytes,
            "metadata_and_separators_bytes": snapshot["text_bytes"] - state_bytes}
    attribution = []
    for name in ("pilot-report-2026-10-12.json", "pilot-recovery-report-2026-10-12.json"):
        source = json.loads((HERE / name).read_text(encoding="utf-8"))
        for episode in source.get("episodes", []):
            if episode.get("arm") != "adapter":
                continue
            attribution.append({"report": name, "run_finished": episode.get("run_finished"),
                "usage": episode.get("usage"), "hook_payloads": episode.get("hook_payloads", []),
                "phase_recall_bytes": [p.get("recall_bytes") for p in episode.get("phases", [])]})
    report["saved_pilot_observations"] = attribution
    report["decision"] = "Keep current hooks for this screen; launch time alone does not justify a persistent service."
    write_json(output, report)
    return report


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    run(args.output)
