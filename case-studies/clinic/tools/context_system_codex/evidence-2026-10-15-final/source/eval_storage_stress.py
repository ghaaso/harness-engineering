"""Model-free storage stress using real spawned processes and synthetic data only.

This checks journal/snapshot mechanics, not task quality or model compression.
Every case uses the same runtime across writers, with a contended shared session
and a distinct private session per worker. No existing project data is opened.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import multiprocessing
import os
from pathlib import Path
import queue
import sys
import tempfile
import time
from typing import Any

sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
from engine import ContextStore
from storage import contained

MAX_BYTES = 10 * 1024 * 1024
DEFAULT_COUNTS = (1, 4, 8, 16)
STATE_SHARED = "<!-- ctx:restore -->\n## Current state\nSHARED_STATE اردو 🧪 exact evidence.\n<!-- /ctx:restore -->\n"


def _sha(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def _state(worker: int) -> str:
    return STATE_SHARED.replace("SHARED_STATE", f"PRIVATE_STATE_{worker:02d}")


def _payload(session_id: str, worker: int, index: int) -> dict:
    return {"session_id": session_id, "turn_id": f"writer-{worker:02d}-item-{index:03d}",
            "tool_name": "SyntheticStorageProbe", "tool_result": {
                "marker": f"ONLY_WORKER_{worker:02d}", "worker": worker, "index": index,
                "text": f"exact-{worker:02d}-{index:03d}: اردو 🧪 café \\\nquoted \"evidence\""}}


def _error(code: str, **details: Any) -> dict:
    return {"code": code, **details}


def _worker(root_text: str, worker: int, writes: int, gate, messages, timeout: float) -> None:
    """Top-level target is importable under Windows spawn; never starts a model."""
    wall, cpu = time.monotonic(), time.process_time()
    result = {"worker": worker, "pid": os.getpid(), "writes_requested": writes,
              "events": [], "snapshots": [], "errors": []}
    try:
        root = Path(root_text)
        store = ContextStore(root, root / "runtime", "shared.md")
        own = f"worker-{worker:02d}"
        store.focus(own, f"state-{worker:02d}.md")
        messages.put(("ready", {"worker": worker, "pid": os.getpid()}))
        if not gate.wait(timeout):
            raise TimeoutError("Synchronized start was not released")
        for index in range(writes):
            for session_id in ("shared", own):
                payload = _payload(session_id, worker, index)
                record = store.record("PostToolUse", payload)
                result["events"].append({"session_id": session_id, "ref": record["ref"],
                                         "sequence": record["sequence"], "index": index})
                snapshot = store.snapshot(session_id, payload["turn_id"])
                duplicate = store.snapshot(session_id, payload["turn_id"])
                if duplicate != snapshot:
                    result["errors"].append(_error("same_turn_not_idempotent", session_id=session_id,
                                                   index=index))
                result["snapshots"].append({"session_id": session_id, "id": snapshot["id"],
                                            "sequence": snapshot["sequence"], "index": index})
    except Exception as error:
        result["errors"].append(_error("worker_exception", type=type(error).__name__, message=str(error)[:500]))
    finally:
        result["wall_seconds"] = round(time.monotonic() - wall, 6)
        result["cpu_seconds"] = round(time.process_time() - cpu, 6)
        messages.put(("done", result))


def _disk_bytes(root: Path) -> int:
    total = 0
    for path in root.rglob("*"):
        if path.is_symlink():
            raise ValueError("Unexpected link or escaped path in owned synthetic workspace")
        # An atomic rename can make Windows resolve the same path with a \\?\
        # prefix. Normalize that alias before containment, retaining escape checks.
        contained(path, root)
        if path.is_file():
            try:
                total += path.stat().st_size
            except FileNotFoundError:  # Atomic commit temporary file disappeared during a scan.
                pass
    return total


def _read_objects(folder: Path, errors: list, label: str) -> list[tuple[Path, dict]]:
    objects = []
    for path in sorted(folder.glob("*.json")):
        try:
            value = json.loads(path.read_text(encoding="utf-8"))
            if not isinstance(value, dict):
                raise ValueError("Expected JSON object")
            objects.append((path, value))
        except (ValueError, OSError, UnicodeError) as error:
            errors.append(_error("corrupt_json", location=f"{label}/{path.name}", type=type(error).__name__))
    return objects


def verify_case(root: Path, workers: int, writes: int, results: list[dict]) -> dict:
    """Independent deterministic verifier, also used by deliberately bad controls."""
    errors: list[dict] = []
    store = ContextStore(root, root / "runtime", "shared.md")
    all_events, all_snapshots, session_checks = [], [], []
    worker_ids = [result.get("worker") for result in results]
    if sorted(worker_ids) != list(range(workers)):
        errors.append(_error("worker_results_missing_or_duplicate", workers=worker_ids))
    pids = [result.get("pid") for result in results]
    if len(set(pids)) != workers or os.getpid() in pids:
        errors.append(_error("not_distinct_child_processes", pids=pids))
    for result in results:
        errors.extend(_error("worker_reported_failure", worker=result.get("worker"), detail=value)
                      for value in result.get("errors", []))
    for session_id in ("shared", *(f"worker-{worker:02d}" for worker in range(workers))):
        shared = session_id == "shared"
        members = range(workers) if shared else (int(session_id[-2:]),)
        expected_payloads = {(worker, index): _payload(session_id, worker, index)
                             for worker in members for index in range(writes)}
        expected_count = len(expected_payloads)
        expected_state = STATE_SHARED if shared else _state(int(session_id[-2:]))
        folder = root / "runtime/sessions" / session_id
        events = _read_objects(folder / "events", errors, session_id + "/events")
        snapshots = _read_objects(folder / "snapshots", errors, session_id + "/snapshots")
        all_events.extend(record.get("id") for _, record in events)
        all_snapshots.extend(record.get("id") for _, record in snapshots)
        for label, records in (("events", events), ("snapshots", snapshots)):
            sequences = [record.get("sequence") for _, record in records]
            if (len(records) != expected_count or any(type(value) is not int for value in sequences)
                    or sorted(value for value in sequences if type(value) is int) != list(range(1, expected_count + 1))):
                errors.append(_error("count_or_sequence_mismatch", session_id=session_id, category=label,
                                     expected=expected_count, observed=len(records), sequences=sequences))
        observed_keys = []
        for path, record in events:
            payload = record.get("payload", {})
            detail = payload.get("tool_result", {}) if isinstance(payload, dict) else {}
            key = (detail.get("worker"), detail.get("index")) if isinstance(detail, dict) else (None, None)
            observed_keys.append(key)
            expected = expected_payloads.get(key)
            body = json.dumps(expected, ensure_ascii=False, sort_keys=True)
            canonical = json.dumps(expected, ensure_ascii=True, sort_keys=True)
            if (expected is None or payload != expected or record.get("session_id") != session_id
                    or record.get("id") != path.stem or record.get("ref") != path.stem
                    or record.get("event") != "PostToolUse" or record.get("kind") != "tool"
                    or record.get("authorship") != "tool_or_runtime" or record.get("text") != body
                    or record.get("text_sha") != _sha(body) or record.get("payload_sha") != _sha(canonical)):
                errors.append(_error("event_exactness_or_provenance", session_id=session_id, ref=path.stem))
            try:
                if store.show(session_id, path.stem) != record:
                    errors.append(_error("show_mismatch", session_id=session_id, ref=path.stem))
            except (OSError, ValueError, UnicodeError) as error:
                errors.append(_error("show_rejected", session_id=session_id, ref=path.stem,
                                     type=type(error).__name__))
        if set(observed_keys) != set(expected_payloads) or len(observed_keys) != len(set(observed_keys)):
            errors.append(_error("missing_or_duplicated_write", session_id=session_id))
        expected_turns = {payload["turn_id"] for payload in expected_payloads.values()}
        if {record.get("turn_id") for _, record in snapshots} != expected_turns:
            errors.append(_error("snapshot_turn_mismatch", session_id=session_id))
        for path, record in snapshots:
            text, blocks = record.get("text"), record.get("blocks")
            expected_block = expected_state.split("<!-- ctx:restore -->\n", 1)[1].split("\n<!-- /ctx:restore -->", 1)[0]
            if (record.get("session_id") != session_id or record.get("id") != path.stem
                    or record.get("state_sha") != _sha(expected_state) or not isinstance(text, str)
                    or record.get("text_sha") != _sha(text or "") or record.get("problem")
                    or record.get("omitted") or not isinstance(blocks, list) or len(blocks) != 1
                    or blocks[0].get("text") != expected_block or blocks[0].get("sha") != _sha(expected_block)
                    or expected_block not in (text or "")):
                errors.append(_error("snapshot_exactness_or_provenance", session_id=session_id, ref=path.stem))
        try:
            newest = max((record for _, record in snapshots), key=lambda record: record["sequence"])
            if store.restore(session_id) != newest["text"] or store.restore(session_id) != newest["text"]:
                errors.append(_error("restore_not_latest_or_not_repeatable", session_id=session_id))
            for other in range(workers):
                hits = store.search(session_id, f"ONLY_WORKER_{other:02d}")
                expected_hits = writes if shared or session_id == f"worker-{other:02d}" else 0
                if len(hits) != expected_hits:
                    errors.append(_error("cross_session_search_or_missing_hits", session_id=session_id,
                                         query_worker=other, expected=expected_hits, observed=len(hits)))
        except (KeyError, TypeError, ValueError, OSError, UnicodeError) as error:
            errors.append(_error("restore_or_search_failed", session_id=session_id, type=type(error).__name__))
        # A valid reference from a different session must not become readable here.
        foreign = next((entry["ref"] for result in results for entry in result.get("events", [])
                        if entry["session_id"] != session_id), None)
        if foreign:
            try:
                store.show(session_id, foreign)
                errors.append(_error("cross_session_reference_accepted", session_id=session_id, ref=foreign))
            except ValueError:
                pass
        returned_events = {entry["ref"] for result in results for entry in result.get("events", [])
                           if entry["session_id"] == session_id}
        returned_snapshots = {entry["id"] for result in results for entry in result.get("snapshots", [])
                              if entry["session_id"] == session_id}
        if returned_events != {path.stem for path, _ in events} or returned_snapshots != {path.stem for path, _ in snapshots}:
            errors.append(_error("commits_differ_from_worker_returns", session_id=session_id))
        session_checks.append({"session_id": session_id, "expected_each": expected_count,
                               "events": len(events), "snapshots": len(snapshots)})
    if len(set(all_events)) != len(all_events) or len(set(all_snapshots)) != len(all_snapshots):
        errors.append(_error("duplicate_commit_identifier"))
    leftovers = [path.relative_to(root).as_posix() for path in root.rglob(".commit-*")]
    if leftovers:
        errors.append(_error("uncommitted_temporary_files", paths=leftovers))
    return {"ok": not errors, "errors": errors, "sessions": session_checks,
            "event_count": len(all_events), "snapshot_count": len(all_snapshots)}


def _run_case(base: Path, workers: int, writes: int, timeout: float) -> dict:
    began, cpu = time.monotonic(), time.process_time()
    root = base / f"writers-{workers}"
    root.mkdir()
    (root / "shared.md").write_text(STATE_SHARED, encoding="utf-8", newline="")
    for worker in range(workers):
        (root / f"state-{worker:02d}.md").write_text(_state(worker), encoding="utf-8", newline="")
    context = multiprocessing.get_context("spawn")
    gate, messages = context.Event(), context.Queue()
    processes, ready, results, errors = [], {}, [], []
    peak_bytes, deadline = 0, began + timeout
    try:
        for worker in range(workers):
            process = context.Process(target=_worker, args=(str(root), worker, writes, gate, messages, timeout),
                                      name=f"context-storage-{worker:02d}")
            process.start()
            processes.append(process)
        released = False
        while len(results) < workers and time.monotonic() < deadline:
            try:
                kind, data = messages.get(timeout=0.05)
                if kind == "ready":
                    ready[data["worker"]] = data["pid"]
                elif kind == "done":
                    results.append(data)
                else:
                    errors.append(_error("unexpected_worker_message"))
            except queue.Empty:
                pass
            if not released and len(ready) == workers:
                gate.set()
                released = True
            peak_bytes = max(peak_bytes, _disk_bytes(base))
            if peak_bytes > MAX_BYTES:
                errors.append(_error("storage_cap_exceeded", bytes=peak_bytes, cap=MAX_BYTES))
                break
            if all(process.exitcode is not None for process in processes) and len(results) < workers:
                # Queued messages may follow process-exit observation; give them a bounded drain.
                try:
                    while True:
                        kind, data = messages.get(timeout=0.1)
                        if kind == "done":
                            results.append(data)
                        elif kind == "ready":
                            ready[data["worker"]] = data["pid"]
                except queue.Empty:
                    break
        if len(results) != workers:
            errors.append(_error("worker_timeout_or_missing_result", expected=workers, observed=len(results)))
        if len(ready) != workers:
            errors.append(_error("start_not_synchronized", ready=sorted(ready)))
    except Exception as error:
        errors.append(_error("controller_exception", type=type(error).__name__, message=str(error)[:500]))
    finally:
        gate.set()
        for process in processes:
            process.join(timeout=1)
            if process.is_alive():
                process.terminate()
                process.join(timeout=3)
            if process.is_alive():
                process.kill()
                process.join(timeout=3)
            if process.exitcode != 0:
                errors.append(_error("worker_exit", name=process.name, exitcode=process.exitcode))
            process.close()
        messages.close()
        messages.join_thread()
    verification = verify_case(root, workers, writes, results)
    size = _disk_bytes(base)
    if size > MAX_BYTES:
        errors.append(_error("storage_cap_exceeded", bytes=size, cap=MAX_BYTES))
    return {"workers": workers, "writes_per_worker_per_session": writes,
            "start_method": "spawn", "synchronized_start": len(ready) == workers,
            "ok": not errors and verification["ok"], "errors": errors,
            "verification": verification, "worker_results": sorted(results, key=lambda result: result["worker"]),
            "wall_seconds": round(time.monotonic() - began, 6),
            "controller_cpu_seconds": round(time.process_time() - cpu, 6),
            "worker_cpu_seconds_sum": round(sum(result["cpu_seconds"] for result in results), 6),
            "workspace_bytes_after_case": size, "observed_peak_workspace_bytes": max(size, peak_bytes)}


def run_stress(worker_counts=DEFAULT_COUNTS, writes: int = 8, timeout: float = 120) -> dict:
    counts = tuple(worker_counts)
    if (not counts or len(set(counts)) != len(counts) or len(counts) > 4
            or any(type(count) is not int or not 1 <= count <= 16 for count in counts)):
        raise ValueError("Choose one to four distinct worker counts from 1 through 16")
    if type(writes) is not int or not 1 <= writes <= 8:
        raise ValueError("Writes must be an integer from one through eight per worker per session")
    if isinstance(timeout, bool) or not isinstance(timeout, (int, float)) or not 1 <= timeout <= 180:
        raise ValueError("Each case timeout must be between one and 180 seconds")
    began, cpu = time.monotonic(), time.process_time()
    temporary = tempfile.TemporaryDirectory(prefix="codex-context-storage-stress-")
    raw_root, root = Path(temporary.name), Path(temporary.name).resolve()
    expected_parent = Path(tempfile.gettempdir()).resolve()
    if raw_root.is_symlink() or root.parent != expected_parent or not root.name.startswith("codex-context-storage-stress-"):
        raise ValueError("Unexpected temporary workspace; refusing to run or clean it")
    report = {"kind": "synthetic multi-process storage mechanics", "model_calls": 0,
              "quality_or_compression_claim": False, "start_method": "spawn",
              "parameters": {"worker_counts": list(counts), "writes": writes, "timeout_seconds": timeout},
              "resource_cap_bytes": MAX_BYTES, "cases": [], "errors": [], "cleanup_verified": False,
              "fixture_sha": _sha(STATE_SHARED), "python_version": sys.version.split()[0], "platform": sys.platform}
    try:
        for workers in counts:
            result = _run_case(root, workers, writes, timeout)
            report["cases"].append(result)
            if result["workspace_bytes_after_case"] > MAX_BYTES:
                break
    except Exception as error:
        report["errors"].append(_error("stress_controller_exception", type=type(error).__name__, message=str(error)[:500]))
    finally:
        # Delete only our exact TemporaryDirectory, after rechecking its canonical target.
        if raw_root.is_symlink() or raw_root.resolve() != root or root.parent != expected_parent:
            report["errors"].append(_error("cleanup_path_changed", path=str(raw_root)))
            # Prevent TemporaryDirectory's finalizer from following a tampered root.
            temporary._finalizer.detach()
        else:
            try:
                temporary.cleanup()
                report["cleanup_verified"] = not root.exists()
            except OSError as error:
                report["errors"].append(_error("cleanup_failed", type=type(error).__name__, path=str(root)))
    report["wall_seconds"] = round(time.monotonic() - began, 6)
    report["controller_cpu_seconds"] = round(time.process_time() - cpu, 6)
    report["ok"] = (len(report["cases"]) == len(counts) and all(case["ok"] for case in report["cases"])
                    and not report["errors"] and report["cleanup_verified"])
    report["failure_evidence"] = "Worker results, commit refs, timings and all verification failures retained in this report; temporary fixture files removed."
    return report


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--workers", type=int, nargs="+", default=list(DEFAULT_COUNTS))
    parser.add_argument("--writes", type=int, default=8)
    parser.add_argument("--timeout", type=float, default=120)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    if args.output and args.output.exists():
        parser.error("Use a new report path; previous failure evidence is never overwritten")
    result = run_stress(args.workers, args.writes, args.timeout)
    encoded = json.dumps(result, ensure_ascii=False, indent=2) + "\n"
    if len(encoded.encode("utf-8")) > MAX_BYTES:
        raise ValueError("Stress report exceeds its resource cap")
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        with args.output.open("x", encoding="utf-8", newline="") as output:
            output.write(encoded)
        print(json.dumps({"ok": result["ok"], "output": str(args.output.resolve()),
                          "cases": len(result["cases"]), "wall_seconds": result["wall_seconds"]}))
    else:
        print(encoded, end="")
    return 0 if result["ok"] else 1


if __name__ == "__main__":
    multiprocessing.freeze_support()
    raise SystemExit(main())
