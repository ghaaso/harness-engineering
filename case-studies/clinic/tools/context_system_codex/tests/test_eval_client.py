"""Offline wire-event replay. No Codex process, model, trust or account access."""
import json
import queue
import sys
import tempfile
import threading
import time
import unittest
from pathlib import Path

sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from eval_client import BUILTIN_ITEMS, BudgetExceeded, Client, ProtocolError, RpcError, Telemetry


def notification(method, **params):
    return {"method": method, "params": params}


def usage(thread="root", turn="turn", total=100, output=5, **fields):
    breakdown = {"inputTokens": total, "cachedInputTokens": total // 2,
                 "outputTokens": output, "reasoningOutputTokens": 2,
                 "totalTokens": total + output, **fields}
    return notification("thread/tokenUsage/updated", threadId=thread, turnId=turn,
                        tokenUsage={"total": breakdown, "last": breakdown, "modelContextWindow": 1000})


def lifecycle(method, thread="root", turn="turn", status="inProgress", **values):
    return notification(method, threadId=thread, turn={"id": turn, "status": status, **values})


def item(method, identifier="item", kind="contextCompaction", thread="root", turn="turn", **values):
    return notification(method, threadId=thread, turnId=turn,
                        item={"id": identifier, "type": kind, **values})


class QueuePipe:
    def __init__(self):
        self.lines = queue.Queue()

    def readline(self):
        return self.lines.get(timeout=5)

    def close(self):
        pass


class FakeStdin:
    def __init__(self, process):
        self.process = process

    def write(self, text):
        message = json.loads(text)
        self.process.sent.append(message)
        self.process.on_send(message)

    def flush(self):
        pass

    def close(self):
        self.process.finish()


class FakeProcess:
    def __init__(self, handler=None):
        self.stdout, self.stderr, self.sent = QueuePipe(), None, []
        self.stdin = FakeStdin(self)
        self.handler, self.finished = handler, False

    def emit(self, message):
        self.stdout.lines.put(json.dumps(message) + "\n")

    def on_send(self, message):
        if message.get("method") in {"initialize", "turn/interrupt"}:
            self.emit({"id": message["id"], "result": {}})
        elif self.handler:
            self.handler(message)

    def finish(self):
        if not self.finished:
            self.finished = True
            self.stdout.lines.put("")

    def wait(self, timeout=None):
        self.finish()
        return 0


class TelemetryTests(unittest.TestCase):
    def test_cumulative_updates_are_replaced_not_summed(self):
        state = Telemetry()
        state.ingest(usage(total=100))
        state.ingest(usage(total=100))
        state.ingest(usage(total=150, output=9))
        value = state.usage("root")
        self.assertEqual(value["total"]["inputTokens"], 150)
        self.assertEqual(value["total"]["totalTokens"], 159)
        self.assertEqual(value["total"]["cachedInputTokens"], 75)
        self.assertIsNone(value["total"]["cacheWriteInputTokens"])
        self.assertEqual(len(state.usage_observations), 3)
        self.assertIsNone(state.usage()["aggregate"])

    def test_missing_fields_and_regressions_are_visible(self):
        state = Telemetry()
        self.assertIsNone(state.usage("missing")["total"]["inputTokens"])
        state.ingest(usage(total=100))
        state.ingest(usage(total=20))
        self.assertEqual(state.usage("root")["total"]["inputTokens"], 20)
        self.assertEqual(state.usage("root")["observed_max"]["inputTokens"], 100)
        partial = usage(total=50)
        del partial["params"]["tokenUsage"]["total"]["outputTokens"]
        state.ingest(partial)
        self.assertIsNone(state.usage("root")["total"]["outputTokens"])
        self.assertEqual({error["code"] for error in state.errors},
                         {"usage_total_regressed", "missing_usage_fields"})

    def test_turn_and_item_identity_prevents_cross_thread_mixing(self):
        state = Telemetry()
        for thread in ("a", "b"):
            state.ingest(lifecycle("turn/started", thread=thread))
            state.ingest(item("item/started", thread=thread, kind="agentMessage"))
            completed = item("item/completed", thread=thread, kind="agentMessage", text=thread)
            state.ingest(completed)
            state.ingest(completed)
            state.ingest(lifecycle("turn/completed", thread=thread, status="completed"))
        self.assertEqual(state.result("a", "turn")["text"], "a")
        self.assertEqual(state.result("b", "turn")["text"], "b")

    def test_compaction_requires_both_item_events(self):
        state = Telemetry()
        state.ingest(lifecycle("turn/started"))
        state.ingest(item("item/completed"))
        state.ingest(lifecycle("turn/completed", status="completed"))
        self.assertFalse(state.result("root", "turn", True)["measurement_valid"])
        state.ingest(item("item/started"))
        self.assertFalse(state.result("root", "turn", True)["measurement_valid"])
        state.ingest(item("item/started", identifier="valid"))
        state.ingest(item("item/completed", identifier="valid"))
        state.ingest(lifecycle("turn/completed", status="completed"))
        self.assertTrue(state.result("root", "turn", True)["compaction_verified"])

    def test_interrupted_failed_and_rerouted_are_distinct(self):
        state = Telemetry()
        state.ingest(lifecycle("turn/completed", turn="i", status="interrupted"))
        state.ingest(lifecycle("turn/completed", turn="f", status="failed", error={"message": "failure"}))
        state.ingest(notification("model/rerouted", threadId="root", turnId="i",
                                  fromModel="original", toModel="other", reason="test"))
        for turn in ("i", "f"):
            self.assertFalse(state.result("root", turn)["completed"])
            self.assertTrue(state.result("root", turn)["run_finished"])
        self.assertEqual(state.reroutes[0]["toModel"], "other")

    def test_thread_scope_hook_is_retained_without_inventing_turn_id(self):
        state = Telemetry()
        state.ingest(notification("hook/completed", threadId="root", turnId=None,
                     run={"id": "startup", "eventName": "sessionStart", "status": "completed"}))
        self.assertIsNone(state.hooks[("root", "startup")]["turn_id"])
        self.assertEqual(state.turns, {})


class ClientTests(unittest.TestCase):
    def make_client(self, handler=None, **options):
        process = FakeProcess(handler)
        client = Client("never-executed", Path.cwd(), _process=process, **options)
        self.addCleanup(client.close)
        return client, process

    def eventually(self, predicate):
        deadline = time.monotonic() + 2
        while time.monotonic() < deadline:
            if predicate():
                return
            time.sleep(0.005)
        self.fail("Expected asynchronous condition was not observed")

    def test_concurrent_rpc_replies_do_not_consume_notifications(self):
        client, process = self.make_client()
        answers, errors = {}, []
        def call(name):
            try:
                answers[name] = client.request(name, {}, timeout=2)
            except Exception as error:
                errors.append(error)
        threads = [threading.Thread(target=call, args=(name,)) for name in ("one", "two")]
        for thread in threads:
            thread.start()
        self.eventually(lambda: len([value for value in process.sent if value.get("method") in {"one", "two"}]) == 2)
        process.emit(lifecycle("turn/started"))
        process.emit(usage())
        requests = [value for value in process.sent if value.get("method") in {"one", "two"}]
        for request in reversed(requests):
            process.emit({"id": request["id"], "result": request["method"]})
        for thread in threads:
            thread.join(timeout=2)
        self.assertFalse(errors)
        self.assertEqual(answers, {"one": "one", "two": "two"})
        self.assertEqual(client.usage("root")["total"]["inputTokens"], 100)

    def test_manual_compaction_handles_events_before_empty_rpc_reply(self):
        process = FakeProcess()
        def respond(message):
            if message.get("method") == "thread/compact/start":
                for event in (lifecycle("turn/started", turn="compact"),
                              item("item/started", turn="compact"), item("item/completed", turn="compact"),
                              lifecycle("turn/completed", turn="compact", status="completed")):
                    process.emit(event)
                process.emit({"id": message["id"], "result": {}})
        process.handler = respond
        client = Client("never-executed", Path.cwd(), _process=process)
        self.addCleanup(client.close)
        process.emit(lifecycle("turn/completed", turn="old", status="completed"))
        self.eventually(lambda: ("root", "old") in client.telemetry.turns)
        result = client.compact("root", timeout=1)
        self.assertEqual(result["turn_id"], "compact")
        self.assertTrue(result["compaction_verified"])

    def test_turn_correlates_response_id_instead_of_first_completion(self):
        process = FakeProcess()
        def respond(message):
            if message.get("method") == "turn/start":
                process.emit(lifecycle("turn/completed", turn="unrelated", status="completed"))
                process.emit(lifecycle("turn/started", turn="wanted"))
                process.emit(lifecycle("turn/completed", turn="wanted", status="interrupted"))
                process.emit({"id": message["id"], "result": {"turn": {"id": "wanted"}}})
        process.handler = respond
        client = Client("never-executed", Path.cwd(), _process=process)
        self.addCleanup(client.close)
        result = client.turn("root", "synthetic", timeout=1)
        self.assertEqual(result["turn_id"], "wanted")
        self.assertEqual(result["status"], "interrupted")
        self.assertFalse(result["completed"])

    def test_dynamic_handler_does_not_block_usage_cancellation(self):
        entered, release = threading.Event(), threading.Event()
        def handler(params):
            entered.set()
            release.wait(timeout=2)
            return {"contentItems": [{"type": "inputText", "text": "bounded"}], "success": True}
        client, process = self.make_client(tool_handler=handler, input_token_cap=100)
        process.emit(lifecycle("turn/started"))
        process.emit({"id": "tool1", "method": "item/tool/call", "params": {
            "threadId": "root", "turnId": "turn", "callId": "call", "tool": "fixture_read", "arguments": {}}})
        self.assertTrue(entered.wait(timeout=1))
        process.emit(usage(total=100))
        self.eventually(lambda: any(value.get("method") == "turn/interrupt" for value in process.sent))
        release.set()
        self.eventually(lambda: any(value.get("id") == "tool1" and "result" in value for value in process.sent))
        self.assertFalse(next(value["result"]["success"] for value in process.sent if value.get("id") == "tool1"))
        self.assertEqual(client.stop_reason, "soft_cap:inputTokens")
        with self.assertRaises(BudgetExceeded):
            client.start()

    def test_unknown_approval_is_declined_not_accepted(self):
        client, process = self.make_client()
        process.emit({"id": "approval", "method": "item/commandExecution/requestApproval", "params": {}})
        self.eventually(lambda: any(value.get("id") == "approval" for value in process.sent))
        reply = next(value for value in process.sent if value.get("id") == "approval")
        self.assertEqual(reply["error"]["code"], -32601)
        self.assertNotIn("result", reply)

    def test_builtin_item_is_a_visible_violation(self):
        client, process = self.make_client()
        process.emit(lifecycle("turn/started"))
        process.emit(item("item/started", kind="commandExecution", command="synthetic forbidden command"))
        self.eventually(lambda: client.stop_reason is not None)
        self.assertEqual(client.stop_reason, "forbidden_builtin_item")
        self.assertTrue(any(value["code"] == "forbidden_builtin_item" for value in client.report()["errors"]))

    def test_usage_regression_stops_expansion(self):
        client, process = self.make_client()
        process.emit(usage(total=100))
        process.emit(usage(total=10))
        self.eventually(lambda: client.stop_reason is not None)
        self.assertEqual(client.stop_reason, "invalid_usage_accounting")

    def test_watchdog_interrupts_without_waiting_for_turn_end(self):
        client, process = self.make_client(wall_time_limit=0.08)
        process.emit(lifecycle("turn/started"))
        self.eventually(lambda: any(value.get("method") == "turn/interrupt" for value in process.sent))
        self.assertEqual(client.stop_reason, "wall_time_limit")
        self.assertEqual(len([value for value in process.sent if value.get("method") == "turn/interrupt"]), 1)

    def test_disconnect_wakes_waiting_rpc(self):
        client, process = self.make_client()
        timer = threading.Timer(0.03, process.finish)
        timer.start()
        with self.assertRaises(ProtocolError):
            client.request("synthetic/pending", timeout=1)
        timer.join()
        self.assertTrue(client.report()["disconnected"])

    def test_raw_event_log_and_tool_byte_measurement(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "events.jsonl"
            client, process = self.make_client(event_log=path, tool_handler=lambda p: {
                "contentItems": [{"type": "inputText", "text": "اردو"}], "success": True})
            process.emit({"id": "tool", "method": "item/tool/call", "params": {
                "threadId": "root", "turnId": "turn", "callId": "call", "tool": "fixture", "arguments": {}}})
            self.eventually(lambda: any(value.get("id") == "tool" for value in process.sent))
            client.close()
            records = [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines()]
            self.assertEqual([record["sequence"] for record in records], list(range(1, len(records) + 1)))
            measurement = next(record["message"] for record in records if record["direction"] == "tool_measurement")
            self.assertEqual(measurement["text_bytes"], len("اردو".encode("utf-8")))
            self.assertGreater(measurement["result_wire_bytes"], measurement["text_bytes"])
            self.assertTrue(all("utc" in record and "elapsed_seconds" in record for record in records))

    def test_oversized_tool_result_is_not_delivered(self):
        client, process = self.make_client(max_tool_output_bytes=128, tool_handler=lambda p: {
            "contentItems": [{"type": "inputText", "text": "x" * 200}], "success": True})
        process.emit({"id": "tool", "method": "item/tool/call", "params": {"tool": "fixture"}})
        self.eventually(lambda: any(value.get("id") == "tool" for value in process.sent))
        response = next(value for value in process.sent if value.get("id") == "tool")
        self.assertFalse(response["result"]["success"])
        self.assertNotIn("x" * 200, json.dumps(response))
        self.assertLessEqual(len((json.dumps(response, ensure_ascii=False) + "\n").encode("utf-8")), 128)
        self.assertEqual(client.stop_reason, "tool_output_budget_exceeded")

    def test_drain_captures_late_usage_after_completed_turn(self):
        client, process = self.make_client()
        process.emit(lifecycle("turn/started"))
        process.emit(lifecycle("turn/completed", status="completed"))
        self.eventually(lambda: client.telemetry.turns.get(("root", "turn"), {}).get("completed_seq") is not None)
        timer = threading.Timer(0.04, lambda: process.emit(usage(total=200)))
        timer.start()
        report = client.drain(timeout=0.5, quiet=0.1)
        timer.join()
        self.assertEqual(report["usage"]["threads"]["root"]["total"]["inputTokens"], 200)
        coverage = report["per_turn_usage_coverage"][0]
        self.assertTrue(coverage["usage_observed"])
        self.assertEqual(coverage["usage_sequences"], coverage["late_usage_sequences"])
        self.assertIsNone(coverage["complete_request_coverage"])

    def test_normal_close_drains_late_events_without_fault(self):
        client, process = self.make_client()
        process.emit(lifecycle("turn/started"))
        self.eventually(lambda: bool(client.active))
        timer = threading.Timer(0.04, lambda: (
            process.emit(lifecycle("turn/completed", status="completed")), process.emit(usage(total=250))))
        timer.start()
        client.close()
        timer.join()
        report = client.report()
        self.assertEqual(report["usage"]["threads"]["root"]["total"]["inputTokens"], 250)
        self.assertEqual(report["errors"], [])
        self.assertIsNone(report["stop_reason"])
        self.assertEqual(report["interrupts"], [])

    def test_drain_has_a_hard_two_second_wait_bound(self):
        client, process = self.make_client()
        with self.assertRaises(ValueError):
            client.drain(timeout=3)
        with self.assertRaises(ValueError):
            client.drain(timeout=0.05, quiet=0.1)

    def test_subagent_tools_are_forbidden_unless_explicitly_excluded(self):
        for kind in ("collabToolCall", "collabAgentToolCall"):
            self.assertIn(kind, BUILTIN_ITEMS)
            client, process = self.make_client()
            process.emit(item("item/started", kind=kind))
            self.eventually(lambda: client.stop_reason is not None)
            self.assertEqual(client.stop_reason, "forbidden_builtin_item")
            client.close()
        client, process = self.make_client(forbidden_item_types=BUILTIN_ITEMS - {"collabToolCall"})
        process.emit(item("item/started", kind="collabToolCall"))
        client.drain(timeout=0.2, quiet=0.05)
        self.assertIsNone(client.stop_reason)


if __name__ == "__main__":
    unittest.main()
