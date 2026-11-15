"""Supported stdio app-server evaluation transport; never reads private rollouts.

The executable's generated 0.162.0-alpha.17.2 schema is the wire contract.
https://learn.chatgpt.com/docs/app-server documents the lifecycle. Usage totals
are observations, not invoices. Child inclusion and compaction accounting remain
unknown until a live calibration establishes them. Budget limits are soft: they
interrupt observed active turns, but cannot retract an in-flight model request.

Only bounded, local fixture handlers should be supplied as ``tool_handler``.
They execute serially off the reader thread and must return promptly; Python
cannot forcibly cancel an arbitrary handler. No approval request is accepted.
"""
from __future__ import annotations

import copy
import json
import os
import queue
import subprocess
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

USAGE_FIELDS = ("inputTokens", "cachedInputTokens", "cacheWriteInputTokens",
                "outputTokens", "reasoningOutputTokens", "totalTokens")
TERMINAL = {"completed", "interrupted", "failed"}
BUILTIN_ITEMS = frozenset({"commandExecution", "fileChange", "mcpToolCall",
                           "webSearch", "imageGeneration", "computerUse",
                           "collabToolCall", "collabAgentToolCall"})


class ProtocolError(RuntimeError):
    pass


class BudgetExceeded(RuntimeError):
    pass


class RpcError(RuntimeError):
    def __init__(self, method, error):
        self.method, self.error = method, error
        super().__init__(f"{method}: {error}")


def _usage(value):
    value = value if isinstance(value, dict) else {}
    return {key: value[key] if type(value.get(key)) is int and value[key] >= 0 else None
            for key in USAGE_FIELDS}


class Telemetry:
    """Replayable event reduction. Duplicate totals are replaced, never summed."""
    def __init__(self):
        self.lock = threading.RLock()
        self.threads, self.turns, self.usage_by_thread = {}, {}, {}
        self.errors, self.reroutes, self.usage_observations = [], [], []
        self.hooks = {}
        self.sequence = 0

    def issue(self, code, **details):
        with self.lock:
            self.errors.append({"code": code, **details})

    def ingest(self, message, sequence=None):
        with self.lock:
            self.sequence = sequence if sequence is not None else self.sequence + 1
            seq = self.sequence
            method, p = message.get("method"), message.get("params", {})
            if not isinstance(p, dict):
                self.issue("invalid_params", method=method)
                return
            thread_id, turn_id = p.get("threadId"), p.get("turnId")
            if method == "thread/started":
                thread = p.get("thread", {})
                if isinstance(thread, dict) and isinstance(thread.get("id"), str):
                    self.threads[thread["id"]] = copy.deepcopy(thread)
            turn = p.get("turn", {})
            if method in {"turn/started", "turn/completed"} and isinstance(turn, dict):
                turn_id = turn.get("id")
            if isinstance(thread_id, str):
                self.threads.setdefault(thread_id, {"id": thread_id})
            if method == "thread/tokenUsage/updated":
                self._record_usage(thread_id, turn_id, p.get("tokenUsage"), seq)
            if method == "model/rerouted":
                self.reroutes.append(copy.deepcopy(p))
            if method in {"hook/started", "hook/completed"}:
                run = p.get("run", {})
                if isinstance(thread_id, str) and isinstance(run, dict) and isinstance(run.get("id"), str):
                    self.hooks[(thread_id, run["id"])] = {"thread_id": thread_id,
                        "turn_id": turn_id, "sequence": seq, "run": copy.deepcopy(run)}
            if method == "error":
                self.issue("server_error", params=copy.deepcopy(p))
            if not (isinstance(thread_id, str) and isinstance(turn_id, str)):
                return
            key = (thread_id, turn_id)
            record = self.turns.setdefault(key, {"thread_id": thread_id, "turn_id": turn_id,
                "first_seq": seq, "started_seq": None, "completed_seq": None,
                "status": None, "error": None, "items": {}, "hooks": {}})
            if method == "turn/started":
                record["started_seq"] = seq
                if record["completed_seq"] is None:
                    record["status"] = turn.get("status", "inProgress")
            elif method == "turn/completed":
                record.update(completed_seq=seq, status=turn.get("status"), error=turn.get("error"))
                if record["status"] not in TERMINAL:
                    self.issue("invalid_terminal_status", thread_id=thread_id, turn_id=turn_id)
            elif method in {"item/started", "item/completed"}:
                item = p.get("item", {})
                if not isinstance(item, dict) or not isinstance(item.get("id"), str):
                    self.issue("invalid_item", thread_id=thread_id, turn_id=turn_id)
                    return
                entry = record["items"].setdefault(item["id"], {"started_seq": None,
                    "completed_seq": None, "item": {}})
                entry["started_seq" if method == "item/started" else "completed_seq"] = seq
                entry["item"] = copy.deepcopy(item)
            elif method in {"hook/started", "hook/completed"}:
                run = p.get("run", {})
                if isinstance(run, dict) and isinstance(run.get("id"), str):
                    record["hooks"][run["id"]] = copy.deepcopy(run)

    def _record_usage(self, thread_id, turn_id, usage, seq):
        if not isinstance(thread_id, str) or not isinstance(usage, dict):
            self.issue("invalid_usage", thread_id=thread_id)
            return
        total, last = _usage(usage.get("total")), _usage(usage.get("last"))
        previous = self.usage_by_thread.get(thread_id)
        regressions = [key for key in USAGE_FIELDS if previous
            and previous["total"][key] is not None and total[key] is not None
            and total[key] < previous["total"][key]]
        if regressions:
            self.issue("usage_total_regressed", thread_id=thread_id, fields=regressions,
                       turn_id=turn_id, sequence=seq)
        if any(total[key] is None for key in USAGE_FIELDS if key != "cacheWriteInputTokens"):
            self.issue("missing_usage_fields", thread_id=thread_id, sequence=seq)
        maxima = {key: max(value for value in (total[key],
                    previous["observed_max"][key] if previous else None) if value is not None)
                    if total[key] is not None or (previous and previous["observed_max"][key] is not None)
                    else None for key in USAGE_FIELDS}
        value = {"thread_id": thread_id, "turn_id": turn_id, "sequence": seq,
                 "total": total, "last": last, "observed_max": maxima,
                 "model_context_window": usage.get("modelContextWindow"),
                 "updates": (previous["updates"] if previous else 0) + 1}
        self.usage_by_thread[thread_id] = value
        self.usage_observations.append(copy.deepcopy(value))

    def usage(self, thread_id=None):
        with self.lock:
            if thread_id is not None:
                return copy.deepcopy(self.usage_by_thread.get(thread_id, {
                    "thread_id": thread_id, "total": dict.fromkeys(USAGE_FIELDS),
                    "last": dict.fromkeys(USAGE_FIELDS), "observed_max": dict.fromkeys(USAGE_FIELDS),
                    "updates": 0, "model_context_window": None}))
            return {"threads": copy.deepcopy(self.usage_by_thread),
                    "aggregate": None, "aggregation": "unvalidated_thread_inclusion",
                    "compaction_coverage": "unvalidated", "descendant_coverage": "unvalidated"}

    def result(self, thread_id, turn_id, require_compaction=False):
        with self.lock:
            record = copy.deepcopy(self.turns[(thread_id, turn_id)])
            entries = list(record["items"].values())
            compact = [entry for entry in entries if entry["item"].get("type") == "contextCompaction"]
            verified = any(entry["started_seq"] is not None and entry["completed_seq"] is not None
                           and entry["started_seq"] < entry["completed_seq"]
                           and record["completed_seq"] is not None
                           and entry["completed_seq"] <= record["completed_seq"]
                           for entry in compact)
            texts = [entry["item"].get("text", "") for entry in entries
                     if entry["completed_seq"] is not None and entry["item"].get("type") == "agentMessage"]
            return {**record, "items": entries, "hooks": list(record["hooks"].values()),
                    "text": "\n".join(texts), "usage": self.usage(thread_id),
                    "compaction_verified": verified,
                    "measurement_valid": not require_compaction or verified,
                    "run_finished": record["status"] in TERMINAL,
                    "completed": record["status"] == "completed" and not record["error"]}


class Client:
    """One private app-server process, independently queued requests and events.

    ``event_log`` is an exclusively created JSONL file, flushed on every record.
    ``tool_handler(params)`` returns native DynamicToolCallResponse JSON. The
    default forbids built-in execution items; pass an explicit empty set only for
    a separately scoped experiment. No model/threshold overrides are implicit.
    """
    def __init__(self, codex, project, *, event_log=None, tool_handler=None,
                 input_token_cap=None, output_token_cap=None, wall_time_limit=None,
                 forbidden_item_types=BUILTIN_ITEMS, max_tool_output_bytes=65536,
                 _process=None, _initialize=True):
        self.project, self.telemetry = Path(project), Telemetry()
        self.tool_handler, self.max_tool_output_bytes = tool_handler, max_tool_output_bytes
        self.input_token_cap, self.output_token_cap = input_token_cap, output_token_cap
        self.wall_time_limit = wall_time_limit
        for value in (input_token_cap, output_token_cap, wall_time_limit, max_tool_output_bytes):
            if value is not None and (isinstance(value, bool) or value <= 0):
                raise ValueError("Limits must be positive")
        self.forbidden_item_types = frozenset(forbidden_item_types)
        self.events, self.pending, self.active, self.interrupts = [], {}, {}, set()
        self.condition = threading.Condition(threading.RLock())
        self.write_lock, self.operation_lock = threading.Lock(), threading.Lock()
        self.identifier, self.disconnected, self.stop_reason = 0, False, None
        self.stop_event, self.closed = threading.Event(), False
        self.started = time.monotonic()
        self._log = Path(event_log).open("x", encoding="utf-8") if event_log else None
        self.tool_queue = queue.Queue(maxsize=64)
        flags = subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0
        try:
            self.process = _process or subprocess.Popen([str(codex), "app-server", "--stdio"],
                cwd=self.project, stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                stderr=subprocess.PIPE, text=True, encoding="utf-8", creationflags=flags)
        except BaseException:
            if self._log:
                self._log.close()
            raise
        self.workers = [threading.Thread(target=self._read, daemon=True),
                        threading.Thread(target=self._tools, daemon=True),
                        threading.Thread(target=self._watchdog, daemon=True)]
        if self.process.stderr is not None:
            self.workers.append(threading.Thread(target=self._stderr, daemon=True))
        for worker in self.workers:
            worker.start()
        try:
            if _initialize:
                self.request("initialize", {"clientInfo": {"name": "context_evaluator", "version": "1.0"},
                    "capabilities": {"experimentalApi": True}})
                self.notify("initialized", {})
        except BaseException:
            self.close()
            raise

    @property
    def cursor(self):
        with self.condition:
            return len(self.events)

    def _record(self, direction, message):
        with self.condition:
            record = {"sequence": len(self.events) + 1, "utc": datetime.now(timezone.utc).isoformat(),
                      "elapsed_seconds": time.monotonic() - self.started,
                      "direction": direction, "message": copy.deepcopy(message)}
            self.events.append(record)
            if self._log:
                try:
                    self._log.write(json.dumps(record, ensure_ascii=False) + "\n")
                    self._log.flush()
                except (OSError, ValueError) as error:
                    self.telemetry.issue("event_log_failed", error=type(error).__name__)
                    self.stop_reason = self.stop_reason or "event_log_failed"
            self.condition.notify_all()
            return record["sequence"]

    def _send(self, message):
        data = json.dumps(message, ensure_ascii=False) + "\n"
        with self.write_lock:
            if self.closed or self.disconnected:
                raise ProtocolError("App server is closed/disconnected")
            self._record("out", message)
            self.process.stdin.write(data)
            self.process.stdin.flush()

    def notify(self, method, params=None):
        self._send({"method": method, "params": params or {}})

    def _dispatch(self, method, params, background=False):
        if method in {"turn/start", "thread/compact/start", "thread/start"} and self.stop_reason:
            raise BudgetExceeded(self.stop_reason)
        with self.condition:
            self.identifier += 1
            identifier = self.identifier
            mailbox = queue.Queue(maxsize=1)
            self.pending[identifier] = (mailbox, method, background)
        try:
            self._send({"id": identifier, "method": method, "params": params})
        except BaseException:
            with self.condition:
                self.pending.pop(identifier, None)
            raise
        return identifier, mailbox

    def request(self, method, params=None, timeout=30):
        identifier, mailbox = self._dispatch(method, params or {})
        try:
            response = mailbox.get(timeout=timeout)
        except queue.Empty as error:
            self.telemetry.issue("request_timeout", method=method, request_id=identifier)
            if method in {"turn/start", "thread/compact/start"}:
                self._halt("request_timeout")
            raise TimeoutError(method) from error
        finally:
            with self.condition:
                self.pending.pop(identifier, None)
        if isinstance(response, Exception):
            raise response
        if "error" in response:
            raise RpcError(method, response["error"])
        if "result" not in response:
            raise ProtocolError(f"Missing result for {method}")
        return response["result"]

    def _read(self):
        try:
            while True:
                line = self.process.stdout.readline()
                if not line:
                    break
                try:
                    message = json.loads(line)
                except (ValueError, UnicodeError):
                    self._record("invalid_in", {"line": line})
                    self.telemetry.issue("invalid_json")
                    self._halt("invalid_json")
                    continue
                if not isinstance(message, dict):
                    self._record("invalid_in", message)
                    self.telemetry.issue("invalid_message")
                    self._halt("invalid_message")
                    continue
                seq = self._record("in", message)
                if "id" in message and "method" not in message:
                    with self.condition:
                        pending = self.pending.get(message["id"])
                    if pending:
                        mailbox, method, background = pending
                        if background:
                            if "error" in message:
                                self.telemetry.issue("interrupt_error", error=message["error"])
                            with self.condition:
                                self.pending.pop(message["id"], None)
                        else:
                            try:
                                mailbox.put_nowait(message)
                            except queue.Full:
                                self.telemetry.issue("duplicate_response", request_id=message["id"])
                    else:
                        self.telemetry.issue("unmatched_response", request_id=message["id"])
                    continue
                self.telemetry.ingest(message, seq)
                self._observe(message)
                if "id" in message:
                    try:
                        self.tool_queue.put_nowait(message)
                    except queue.Full:
                        self.telemetry.issue("server_request_queue_full")
                        self._halt("server_request_queue_full")
                with self.condition:
                    self.condition.notify_all()
        except Exception as error:
            self.telemetry.issue("reader_error", error=type(error).__name__)
        finally:
            with self.condition:
                self.disconnected = True
                for mailbox, _, background in self.pending.values():
                    if not background:
                        try:
                            mailbox.put_nowait(ProtocolError("App server disconnected"))
                        except queue.Full:
                            pass
                self.condition.notify_all()
            if not self.closed:
                self.telemetry.issue("disconnected")

    def _stderr(self):
        try:
            for line in self.process.stderr:
                self._record("stderr", {"text": line.rstrip("\n")})
        except (OSError, ValueError):
            pass

    def _observe(self, message):
        method, p = message.get("method"), message.get("params", {})
        if not isinstance(p, dict):
            return
        thread_id, turn = p.get("threadId"), p.get("turn", {})
        with self.condition:
            if method == "turn/started" and isinstance(turn, dict):
                self.active[(thread_id, turn.get("id"))] = time.monotonic()
            elif method == "turn/completed" and isinstance(turn, dict):
                self.active.pop((thread_id, turn.get("id")), None)
        item = p.get("item", {})
        if method in {"item/started", "item/completed"} and isinstance(item, dict):
            if item.get("type") in self.forbidden_item_types:
                self.telemetry.issue("forbidden_builtin_item", thread_id=thread_id,
                                     turn_id=p.get("turnId"), item=copy.deepcopy(item))
                self._halt("forbidden_builtin_item")
        if method == "thread/tokenUsage/updated":
            self._check_budget()
        if self.stop_reason:
            self._interrupt_active()

    def _tools(self):
        while not self.stop_event.is_set():
            try:
                message = self.tool_queue.get(timeout=0.05)
            except queue.Empty:
                continue
            try:
                method, p = message.get("method"), message.get("params", {})
                if method != "item/tool/call":
                    self.telemetry.issue("unsupported_server_request", method=method)
                    self._send({"id": message["id"], "error": {"code": -32601,
                        "message": "Evaluation client declines interactive/approval requests"}})
                    self._halt("unsupported_server_request")
                    continue
                if self.stop_reason or self.tool_handler is None:
                    raise ValueError("Fixture tool unavailable or evaluation stopped")
                result = self.tool_handler(copy.deepcopy(p))
                if self.stop_reason:
                    raise ValueError("Evaluation stopped while the fixture handler was running")
                if not isinstance(result, dict) or type(result.get("success")) is not bool:
                    raise ValueError("Invalid dynamic tool response")
                content = result.get("contentItems")
                if not isinstance(content, list) or any(not isinstance(item, dict)
                    or item.get("type") != "inputText" or not isinstance(item.get("text"), str)
                    for item in content):
                    raise ValueError("Fixture tool responses must contain inputText items")
                self._send_tool_result(message["id"], p, result)
            except Exception as error:
                self.telemetry.issue("dynamic_tool_error", error=type(error).__name__,
                                     request_id=message.get("id"))
                try:
                    # Empty failure output fits even small budgets; the raw event
                    # log carries the reason. No oversized error-message bypass.
                    self._send_tool_result(message["id"], message.get("params", {}),
                                           {"success": False, "contentItems": []})
                except (OSError, ProtocolError, ValueError):
                    pass
            finally:
                self.tool_queue.task_done()

    def _send_tool_result(self, identifier, params, result):
        text_bytes = sum(len(item["text"].encode("utf-8")) for item in result["contentItems"])
        wire_bytes = len(json.dumps(result, ensure_ascii=False).encode("utf-8"))
        response = {"id": identifier, "result": result}
        response_bytes = len((json.dumps(response, ensure_ascii=False) + "\n").encode("utf-8"))
        if max(text_bytes, response_bytes) > self.max_tool_output_bytes:
            self._halt("tool_output_budget_exceeded")
            raise ValueError("Fixture tool output exceeds complete response byte cap")
        self._record("tool_measurement", {"threadId": params.get("threadId"),
            "turnId": params.get("turnId"), "callId": params.get("callId"),
            "success": result["success"], "text_bytes": text_bytes,
            "result_wire_bytes": wire_bytes, "response_wire_bytes": response_bytes})
        self._send(response)

    def _check_budget(self):
        usage = self.telemetry.usage()["threads"]
        # A conservative stopping signal only: child totals might overlap parent
        # totals. Never present this sum as measured whole-episode usage.
        for key, cap in (("inputTokens", self.input_token_cap), ("outputTokens", self.output_token_cap)):
            seen = [value["observed_max"][key] for value in usage.values()
                    if value["observed_max"][key] is not None]
            if cap is not None and seen and sum(seen) >= cap:
                self._halt(f"soft_cap:{key}")
        if any(error["code"] in {"usage_total_regressed", "missing_usage_fields", "invalid_usage"}
               for error in self.telemetry.errors):
            self._halt("invalid_usage_accounting")

    def _halt(self, reason):
        with self.condition:
            self.stop_reason = self.stop_reason or reason
            self.condition.notify_all()
        self._interrupt_active()

    def _interrupt_active(self):
        with self.condition:
            pairs = [pair for pair in self.active if pair not in self.interrupts and all(pair)]
            self.interrupts.update(pairs)
        for thread_id, turn_id in pairs:
            try:
                self._dispatch("turn/interrupt", {"threadId": thread_id, "turnId": turn_id}, background=True)
            except (OSError, ProtocolError):
                self.telemetry.issue("interrupt_send_failed", thread_id=thread_id, turn_id=turn_id)

    def _watchdog(self):
        while not self.stop_event.wait(0.05):
            if self.wall_time_limit is not None and time.monotonic() - self.started >= self.wall_time_limit:
                self._halt("wall_time_limit")
            elif self.stop_reason:
                self._interrupt_active()

    def start(self, **params):
        params.setdefault("cwd", str(self.project))
        return self.request("thread/start", params)

    def turn(self, thread_id, prompt, timeout=180, **overrides):
        with self.operation_lock:
            after = self.cursor
            params = {"threadId": thread_id, "input": [{"type": "text", "text": prompt,
                                                            "text_elements": []}], **overrides}
            response = self.request("turn/start", params)
            turn_id = response.get("turn", {}).get("id")
            if not isinstance(turn_id, str):
                self._halt("missing_turn_id")
                raise ProtocolError("turn/start response has no turn id")
            return self.wait(thread_id, turn_id, after=after, timeout=timeout)

    def compact(self, thread_id, timeout=180):
        with self.operation_lock:
            after = self.cursor
            self.request("thread/compact/start", {"threadId": thread_id})
            return self.wait(thread_id, after=after, require_compaction=True, timeout=timeout)

    def wait(self, thread_id, turn_id=None, *, after=None, require_compaction=False, timeout=180):
        if turn_id is None and after is None:
            raise ValueError("Pass a turn_id or a pre-dispatch event cursor")
        deadline = time.monotonic() + timeout
        while True:
            with self.condition:
                with self.telemetry.lock:
                    matches = [record for (tid, vid), record in self.telemetry.turns.items()
                        if tid == thread_id and (vid == turn_id if turn_id is not None
                        else record["first_seq"] > after)]
                    matches.sort(key=lambda record: record["first_seq"])
                    if matches:
                        record = matches[0]
                        if record["completed_seq"] is not None:
                            result = self.telemetry.result(thread_id, record["turn_id"], require_compaction)
                            result["stop_reason"] = self.stop_reason
                            return result
                if self.disconnected:
                    raise ProtocolError("App server disconnected before turn completion")
                remaining = deadline - time.monotonic()
                if remaining > 0:
                    self.condition.wait(min(remaining, 0.1))
                    continue
            self.telemetry.issue("turn_timeout", thread_id=thread_id, turn_id=turn_id)
            self._halt("turn_timeout")
            raise TimeoutError(f"Turn did not complete: {thread_id}/{turn_id}")

    def usage(self, thread_id=None):
        return self.telemetry.usage(thread_id)

    def drain(self, timeout=2.0, quiet=0.15):
        """Wait briefly for a quiet event stream, including late usage replies.

        Quiescence is an observation, not proof that the server has no more work.
        A bounded drain cannot guarantee complete remote usage coverage. Read the
        report again after close to include any events emitted during shutdown.
        """
        if not (0 < timeout <= 2.0 and 0 < quiet <= timeout):
            raise ValueError("Require 0 < quiet <= timeout <= 2 seconds")
        deadline, quiet_since = time.monotonic() + timeout, time.monotonic()
        with self.condition:
            previous = len(self.events)
            while not self.disconnected:
                now = time.monotonic()
                if len(self.events) != previous:
                    previous, quiet_since = len(self.events), now
                remaining = min(deadline - now, quiet - (now - quiet_since))
                if remaining <= 0:
                    break
                self.condition.wait(remaining)
        return self.report()

    def report(self):
        with self.condition, self.telemetry.lock:
            coverage = []
            for (thread_id, turn_id), turn in self.telemetry.turns.items():
                samples = [sample for sample in self.telemetry.usage_observations
                    if sample["thread_id"] == thread_id and sample["turn_id"] == turn_id]
                coverage.append({"thread_id": thread_id, "turn_id": turn_id,
                    "status": turn["status"], "usage_observed": bool(samples),
                    "usage_sequences": [sample["sequence"] for sample in samples],
                    "late_usage_sequences": [sample["sequence"] for sample in samples
                        if turn["completed_seq"] is not None and sample["sequence"] > turn["completed_seq"]],
                    "complete_request_coverage": None})
            return {"usage": self.usage(), "usage_observations": copy.deepcopy(self.telemetry.usage_observations),
                "per_turn_usage_coverage": coverage,
                "errors": copy.deepcopy(self.telemetry.errors), "reroutes": copy.deepcopy(self.telemetry.reroutes),
                "hooks": copy.deepcopy(list(self.telemetry.hooks.values())),
                "stop_reason": self.stop_reason, "disconnected": self.disconnected,
                "event_count": len(self.events), "active_turns": [list(pair) for pair in self.active],
                "interrupts": [list(pair) for pair in sorted(self.interrupts)],
                "budget_accounting": "sum_of_observed_thread_maxima_for_stopping_only; may overlap",
                "limits": {"input_tokens": self.input_token_cap, "output_tokens": self.output_token_cap,
                           "wall_seconds": self.wall_time_limit}}

    def close(self):
        if self.closed:
            return
        self.drain()
        if self.active:
            self._halt(self.stop_reason or "client_closed_with_active_turns")
        self.closed = True
        self.stop_event.set()
        try:
            self.process.stdin.close()
            self.process.wait(timeout=3)
        except subprocess.TimeoutExpired:
            self.process.terminate()
            try:
                self.process.wait(timeout=3)
            except subprocess.TimeoutExpired:
                self.process.kill()
                self.process.wait(timeout=3)
        finally:
            for worker in self.workers:
                worker.join(timeout=1)
            for stream in (self.process.stdout, self.process.stderr):
                if stream:
                    stream.close()
            if self._log:
                self._log.close()

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self.close()
