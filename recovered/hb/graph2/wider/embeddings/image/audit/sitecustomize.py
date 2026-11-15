# Audit probe for the PyKEEN smoke run (ours, not graphify's).
# Mounted read-only at /audit and put on PYTHONPATH, so every Python process in the
# container (including AST worker processes) imports it at start-up. It records,
# one JSON line per event, to /out/audit/audit-<pid>.jsonl:
#   - every socket, DNS, HTTP and urllib event (any attempt to reach a network),
#   - every subprocess / exec / os.system call,
#   - every file opened for writing, and every file touched under the home directory,
#   - the import of any module that could talk to a model or a server.
# It never blocks anything; the container's --network none is what blocks.
import json
import os
import sys

_DIR = os.environ.get("KGE_AUDIT_DIR", "/out/audit")
_HOME = "/root"
_NET = ("socket.", "http.client.", "urllib.Request", "ftplib.", "smtplib.", "webbrowser.")
_PROC = ("subprocess.Popen", "os.exec", "os.posix_spawn", "os.spawn", "os.system", "os.fork", "pty.spawn")
_MODS = ("pykeen.", "optuna", "torch.hub", "urllib3", "openai", "anthropic", "httpx", "requests", "urllib.request",
         "http.client", "boto3", "mcp", "graphify.security", "graphify.ingest", "tiktoken")
_W = os.O_WRONLY | os.O_RDWR | os.O_CREAT | os.O_APPEND | os.O_TRUNC
_busy = False
_fh = None


def _emit(rec):
    global _fh
    try:
        if _fh is None:
            os.makedirs(_DIR, exist_ok=True)
            _fh = open(os.path.join(_DIR, "audit-%d.jsonl" % os.getpid()), "a", buffering=1)
        _fh.write(json.dumps(rec, default=str) + "\n")
    except Exception:
        pass


def _hook(event, args):
    global _busy
    if _busy:
        return
    _busy = True
    try:
        if event.startswith(_NET):
            _emit({"pid": os.getpid(), "ev": event, "args": [str(a)[:200] for a in args]})
        elif event.startswith(_PROC):
            _emit({"pid": os.getpid(), "ev": event, "args": [str(a)[:300] for a in args]})
        elif event == "import":
            name = str(args[0])
            if name.startswith(_MODS):
                _emit({"pid": os.getpid(), "ev": "import", "mod": name})
        elif event == "open":
            path, mode, flags = (list(args) + [None, None, None])[:3]
            p = str(path)
            writing = (isinstance(mode, str) and any(c in mode for c in "wax+")) or (
                isinstance(flags, int) and flags & _W)
            if p.startswith(_DIR):
                return
            if writing or p.startswith(_HOME + "/") or p == _HOME:
                _emit({"pid": os.getpid(), "ev": "open-write" if writing else "open-home",
                       "path": p, "mode": str(mode)})
    finally:
        _busy = False


sys.addaudithook(_hook)
_emit({"pid": os.getpid(), "ev": "start", "argv": sys.argv, "home": _HOME})
