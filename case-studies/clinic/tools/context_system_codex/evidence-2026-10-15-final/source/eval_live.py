"""Explicit small live mechanics comparison. Synthetic facts; no transcript imports.

Uses ephemeral app-server threads and already-trusted project hooks. No model or
threshold overrides. This is not a 300k quality benchmark.
"""
from __future__ import annotations

import argparse
import json
import os
import queue
import subprocess
import sys
import threading
import time
from pathlib import Path

sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
from ctx import settings
from engine import ContextStore
from native import probe
from storage import write_json

FACTS = {"budget": 32, "database": "PostgreSQL", "rejected": "SQLite",
         "failed_check": "synthetic_restore_check", "next_action": "retry synthetic restore"}
PROMPT = ("This is a synthetic memory mechanics test. Do not call any tools, inspect files, delegate, "
          "or work on the project. Remember these task facts: budget was 24, but corrected budget is 32; "
          "database is PostgreSQL; SQLite was rejected; failed check is synthetic_restore_check; "
          "next action is retry synthetic restore. Reply only ACK.")
QUESTION = ("No tools. Return only JSON with keys budget (integer), database, rejected, failed_check, "
            "next_action, using the corrected task facts remembered from this conversation.")


class Client:
    def __init__(self, codex: Path, project: Path):
        flags = subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0
        self.process = subprocess.Popen([str(codex), "app-server", "--stdio"], cwd=project,
            stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
            text=True, encoding="utf-8", creationflags=flags)
        self.messages, self.pending, self.identifier = queue.Queue(), [], 0
        self.reader = threading.Thread(target=self._read, daemon=True)
        self.reader.start()
        self.request("initialize", {"clientInfo": {"name": "codex_context_mechanics", "version": "1.0"},
                                  "capabilities": {"experimentalApi": True}})
        self.send({"method": "initialized", "params": {}})

    def _read(self):
        for line in self.process.stdout:
            try:
                self.messages.put(json.loads(line))
            except ValueError:
                pass
        self.messages.put(None)

    def send(self, value):
        self.process.stdin.write(json.dumps(value) + "\n")
        self.process.stdin.flush()

    def request(self, method, params):
        self.identifier += 1
        identifier = self.identifier
        self.send({"id": identifier, "method": method, "params": params})
        deadline = time.monotonic() + 30
        while time.monotonic() < deadline:
            item = self.messages.get(timeout=max(0.01, deadline - time.monotonic()))
            if item is None:
                raise RuntimeError("App server ended")
            if item.get("id") == identifier and "method" not in item:
                if "error" in item:
                    raise RuntimeError(item["error"].get("message", "Request failed"))
                return item.get("result")
            self.pending.append(item)
        raise TimeoutError(method)

    def wait_turn(self, thread_id, timeout=180):
        deadline, text, hooks_seen = time.monotonic() + timeout, [], []
        while time.monotonic() < deadline:
            item = self.pending.pop(0) if self.pending else self.messages.get(
                timeout=max(0.01, deadline - time.monotonic()))
            if item is None:
                raise RuntimeError("App server ended")
            method, params = item.get("method", ""), item.get("params", {})
            if "id" in item and method:
                self.send({"id": item["id"], "error": {"code": -32601, "message": "No interactive tools in this test"}})
                continue
            if params.get("threadId") != thread_id:
                continue
            if method == "item/completed":
                record = params.get("item", {})
                if record.get("type") == "agentMessage":
                    text.append(record.get("text", ""))
            if method.startswith("hook/"):
                hooks_seen.append(method)
            if method == "turn/completed":
                turn = params.get("turn", {})
                if turn.get("status") == "failed" or turn.get("error"):
                    raise RuntimeError(json.dumps(turn.get("error") or turn))
                return {"text": "\n".join(text), "hooks_notifications": len(hooks_seen)}
        raise TimeoutError("Live turn timed out")

    def turn(self, thread_id, prompt):
        self.request("turn/start", {"threadId": thread_id,
                     "input": [{"type": "text", "text": prompt, "text_elements": []}]})
        return self.wait_turn(thread_id)

    def close(self):
        self.process.stdin.close()
        try:
            self.process.wait(timeout=3)
        except subprocess.TimeoutExpired:
            self.process.terminate()
            self.process.wait(timeout=3)
        self.reader.join(timeout=1)
        self.process.stdout.close()


def run(codex: Path, project: Path, output: Path) -> dict:
    native = probe(codex, project)
    if not native["active"]:
        raise ValueError("Project hooks must already be trusted before live evaluation")
    report = {"kind": "small live mechanics comparison", "arms": {}, "native_registration": native,
              "long_context_quality": "unmeasured", "complete": False}
    store = ContextStore(**settings(project))
    task = project / ".data/codex-context/eval/task.md"
    task.parent.mkdir(parents=True, exist_ok=True)
    task.write_text("<!-- ctx:restore -->\n## User corrections\nCorrected budget: 32 (was 24).\n"
                    "## Decisions\nDatabase: PostgreSQL.\n## Rejected approaches\nSQLite.\n"
                    "## Unfinished work\nFailed check: synthetic_restore_check.\n"
                    "## Next action\nretry synthetic restore\n<!-- /ctx:restore -->\n", encoding="utf-8")
    client = Client(codex, project)
    try:
        for arm in ("native", "adapter"):
            print(f"Starting {arm} mechanics arm.", flush=True)
            start = client.request("thread/start", {"cwd": str(project), "ephemeral": True,
                "approvalPolicy": "never", "sandbox": "read-only", "config": {"features.hooks": arm == "adapter"}})
            thread_id = start["thread"]["id"]
            result = {"session_id": thread_id, "model": start.get("model"), "cycles": []}
            report["arms"][arm] = result
            if arm == "adapter":
                store.focus(thread_id, task)
            client.turn(thread_id, PROMPT)
            for cycle in range(3):
                began = time.monotonic()
                client.request("thread/compact/start", {"threadId": thread_id})
                client.wait_turn(thread_id)
                answer = client.turn(thread_id, QUESTION)
                raw = answer["text"].strip()
                if raw.startswith("```json"):
                    raw = raw[7:].removesuffix("```").strip()
                elif raw.startswith("```"):
                    raw = raw[3:].removesuffix("```").strip()
                try:
                    parsed = json.loads(raw)
                except ValueError:
                    parsed = {}
                result["cycles"].append({"cycle": cycle + 1, "answer": answer["text"],
                    "correct": {key: parsed.get(key) == value for key, value in FACTS.items()},
                    "seconds": round(time.monotonic() - began, 3)})
                write_json(output, report)
                print(f"Completed {arm} cycle {cycle + 1}.", flush=True)
            client.request("thread/unsubscribe", {"threadId": thread_id})
        report["complete"] = True
    except Exception as error:
        report["blocked_by"] = str(error)
        print(f"Live mechanics stopped: {type(error).__name__}.", flush=True)
    finally:
        client.close()
        write_json(output, report)
    return report


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--codex", required=True, type=Path)
    parser.add_argument("--project", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--yes", action="store_true", help="Run the small live model comparison")
    args = parser.parse_args()
    if not args.yes:
        parser.error("Live evaluation calls models; pass --yes to run the defined synthetic comparison")
    result = run(args.codex, args.project.resolve(), args.output.resolve())
    raise SystemExit(0 if result["complete"] else 1)
