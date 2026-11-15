"""Read-only local app-server hook discovery. Does not start a turn or change trust."""
from __future__ import annotations

import json
import os
import queue
import subprocess
import threading
import time
from pathlib import Path


def probe(codex: Path, project: Path, timeout: float = 20) -> dict:
    flags = subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0
    process = subprocess.Popen([str(codex), "app-server", "--stdio"], cwd=project, stdin=subprocess.PIPE,
                               stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True,
                               encoding="utf-8", creationflags=flags)
    messages = queue.Queue()

    def read():
        for line in process.stdout:
            try:
                messages.put(json.loads(line))
            except ValueError:
                continue
        messages.put(None)

    reader = threading.Thread(target=read, daemon=True)
    reader.start()
    try:
        def send(value):
            process.stdin.write(json.dumps(value) + "\n")
            process.stdin.flush()

        def response(identifier):
            deadline = time.monotonic() + timeout
            while time.monotonic() < deadline:
                item = messages.get(timeout=max(0.01, deadline - time.monotonic()))
                if item is None:
                    raise RuntimeError("Codex app server closed before replying")
                if item.get("id") == identifier:
                    if "error" in item:
                        raise RuntimeError(item["error"].get("message", "Hook discovery failed"))
                    return item.get("result")
            raise TimeoutError("Native hook discovery timed out")

        send({"id": 1, "method": "initialize", "params": {
            "clientInfo": {"name": "codex_context_doctor", "version": "1.0"},
            "capabilities": {"experimentalApi": True}}})
        response(1)
        send({"method": "initialized", "params": {}})
        send({"id": 2, "method": "hooks/list", "params": {"cwds": [str(project.resolve())]}})
        result = response(2)
        target = (project / ".codex/hooks.json").resolve()
        found, errors = [], 0
        for entry in result.get("data", []):
            for hook in entry.get("hooks", []):
                if Path(hook.get("sourcePath", "")).resolve() == target:
                    found.append({key: hook.get(key) for key in (
                        "eventName", "trustStatus", "enabled", "additionalContextLimit", "timeoutSec")})
            errors += sum(Path(item.get("path", "")).resolve() == target for item in entry.get("errors", []))
        return {"ok": errors == 0 and bool(found), "hooks": found, "project_hook_errors": errors,
                "active": bool(found) and all(item["enabled"] and item["trustStatus"] in {"trusted", "managed"}
                                               for item in found),
                "model_calls": 0, "trust_modified": False}
    finally:
        process.stdin.close()
        try:
            process.wait(timeout=3)
        except subprocess.TimeoutExpired:
            process.terminate()
            process.wait(timeout=3)
        process.stdout.close()
        reader.join(timeout=1)
