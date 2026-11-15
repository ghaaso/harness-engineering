"""Claude Code CLI: discovery, login check, command lines, and one guarded process run.

--dry-run only ever executes `--version`, `--help` and `auth status`; everything else here is built and
printed.
"""
from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import time
from pathlib import Path
from typing import Any

from .common import is_under, run_retry

# Every option build_argv can emit; `--help` must list all of them before a run starts.
USED_FLAGS = ("--print", "--output-format", "--verbose", "--model", "--effort", "--settings", "--setting-sources",
              "--permission-mode", "--session-id", "--resume", "--fork-session")
# Inherited variables that would change what an arm measures (or make Claude Code think it is nested).
SCRUB_ENV = ("CLAUDE_PROJECT_DIR", "CLAUDECODE", "CLAUDE_CODE_ENTRYPOINT", "CLAUDE_CODE_SSE_PORT",
             "CLAUDE_CODE_AUTO_COMPACT_WINDOW", "CLAUDE_AUTOCOMPACT_PCT_OVERRIDE", "DISABLE_COMPACT",
             "DISABLE_AUTO_COMPACT", "CLAUDE_CODE_SIMPLE", "CLAUDE_CODE_SAFE_MODE", "CLAUDE_CODE_SESSION_ID",
             "CLAUDE_CODE_EFFORT_LEVEL", "MAX_THINKING_TOKENS", "ANTHROPIC_MODEL", "CLAUDE_CODE_SUBAGENT_MODEL")
LIMIT_RE = re.compile(r"(?i)usage limit|limit reached|hit your (usage )?limit|rate.?limit|out of (extra )?usage|"
                      r"quota|\b429\b|limit will reset|resets? at")
SETTING_SOURCES = "user,project,local"


def _version_key(text: str) -> tuple[int, ...]:
    return tuple(int(x) for x in re.findall(r"\d+", text))


def discover_claude(explicit: str | None = None) -> dict[str, str]:
    """A running claude.exe under %APPDATA%\\Claude\\claude-code, else the newest version directory."""
    if explicit:
        if not Path(explicit).is_file():
            raise RuntimeError(f"--claude is not a file: {explicit}")
        return {"path": str(Path(explicit)), "how": "--claude"}
    base = Path(os.environ.get("APPDATA") or (Path.home() / "AppData" / "Roaming")) / "Claude" / "claude-code"
    # The Microsoft Store build keeps its AppData in a per-package folder; %APPDATA%\Claude only
    # exists from inside the app. From a plain terminal the real location is under Packages.
    local = Path(os.environ.get("LOCALAPPDATA") or (Path.home() / "AppData" / "Local"))
    bases = [base] + sorted(local.glob("Packages/Claude_*/LocalCache/Roaming/Claude/claude-code"))
    try:
        out = run_retry(["powershell", "-NoProfile", "-NonInteractive", "-Command",
                         "Get-Process -Name claude -ErrorAction SilentlyContinue | ForEach-Object { $_.Path }"],
                        capture_output=True, text=True, timeout=40).stdout
    except (OSError, subprocess.SubprocessError):
        out = ""
    running = [Path(line.strip()) for line in out.splitlines() if line.strip()]
    under = sorted((p for p in running if is_under(p, bases) and p.is_file()),
                   key=lambda p: _version_key(p.parent.parent.name))
    if under:
        return {"path": str(under[-1]), "how": "running claude.exe process"}
    found = sorted((p for b in bases for p in b.glob("*/*/claude.exe")),
                   key=lambda p: (_version_key(p.parent.parent.name), p.stat().st_mtime))
    if found:
        return {"path": str(found[-1]), "how": "newest version directory"}
    on_path = shutil.which("claude")
    if on_path:
        return {"path": on_path, "how": "PATH"}
    raise RuntimeError(f"claude.exe not found (no running process, nothing under {', '.join(map(str, bases))}, "
                       f"not on PATH); pass --claude")


def claude_version(path: str) -> str:
    try:
        out = run_retry([path, "--version"], capture_output=True, text=True, timeout=60).stdout.strip()
    except (OSError, subprocess.SubprocessError) as exc:
        return f"unknown ({exc.__class__.__name__})"
    return out.split()[0] if out else "unknown"


def missing_flags(path: str) -> list[str] | None:
    """Options the driver uses that `claude --help` does not list (None when --help could not be read)."""
    try:
        proc = run_retry([path, "--help"], capture_output=True, timeout=90)
    except (OSError, subprocess.SubprocessError):
        return None
    text = proc.stdout.decode("utf-8", errors="replace")
    if "--print" not in text:
        return None
    return [flag for flag in USED_FLAGS if not re.search(re.escape(flag) + r"(?![\w-])", text)]


def auth_status(path: str, env: dict[str, str] | None = None) -> dict[str, Any]:
    """`claude auth status` prints JSON and exits non-zero when not logged in."""
    try:
        proc = run_retry([path, "auth", "status"], capture_output=True, text=True, timeout=90, env=env)
    except (OSError, subprocess.SubprocessError) as exc:
        return {"loggedIn": False, "error": f"{exc.__class__.__name__}: {exc}"}
    try:
        data = json.loads(proc.stdout)
    except ValueError:
        return {"loggedIn": False, "error": "auth status did not print JSON", "exit": proc.returncode}
    return {"loggedIn": data.get("loggedIn") is True, "authMethod": data.get("authMethod"),
            "apiProvider": data.get("apiProvider"), "configDirectory": data.get("configDirectory"),
            "exit": proc.returncode}


def child_env() -> tuple[dict[str, str], list[str], list[str]]:
    """(environment for claude, names removed, remaining CLAUDE*/ANTHROPIC*/DISABLE_* names). Nothing is
    added: Claude Code sets CLAUDE_PROJECT_DIR for its own hooks, exactly as in the user's real sessions.
    The remaining names are reported, never their values: they reach every arm alike."""
    env = dict(os.environ)
    removed = sorted(k for k in env if k.upper() in SCRUB_ENV)
    for k in removed:
        del env[k]
    remaining = sorted(k for k in env if k.upper().startswith(("CLAUDE", "ANTHROPIC", "DISABLE_")))
    return env, removed, remaining


def build_argv(claude: str, profile: dict[str, Any], mode: str, session: str, fork_from: str | None = None,
               permission_mode: str = "bypassPermissions") -> list[str]:
    """mode: new (fresh session) | resume (same session) | fork (branch of fork_from under a new id)."""
    argv = [claude, "-p", "--output-format", "stream-json", "--verbose",
            "--model", profile["model"], "--effort", profile["effort"]]
    if profile.get("settings"):
        argv += ["--settings", json.dumps(profile["settings"], separators=(",", ":"))]
    argv += ["--setting-sources", SETTING_SOURCES, "--permission-mode", permission_mode]
    if mode == "new":
        argv += ["--session-id", session]
    elif mode == "resume":
        argv += ["--resume", session]
    elif mode == "fork":
        if not fork_from:
            raise ValueError("fork needs the session to branch from")
        argv += ["--resume", fork_from, "--fork-session", "--session-id", session]
    else:
        raise ValueError(mode)
    assert "--bare" not in argv and "--no-session-persistence" not in argv
    return argv


def ps_line(argv: list[str], cwd: str | Path | None = None, stdin: str | Path | None = None) -> str:
    """The command as a Windows PowerShell 5.1 line (the driver itself calls CreateProcess with the argv
    list, so quoting here is for a person re-running a step by hand)."""
    def q(a: str) -> str:
        if re.fullmatch(r"[A-Za-z0-9_./:\\=,@+-]+", a):
            return a
        return "'" + a.replace("'", "''").replace('"', '\\"') + "'"
    line = "& " + " ".join(q(a) for a in argv)
    if stdin:
        line = f"Get-Content -Raw -Encoding UTF8 {q(str(stdin))} | {line}"
    if cwd:
        line = f"Set-Location {q(str(cwd))}; {line}"
    return line


def parse_stream(log_path: Path) -> dict[str, Any]:
    """init and result events (and boundaries seen) from a saved --output-format stream-json log."""
    init = result = None
    boundaries = 0
    try:
        with open(log_path, encoding="utf-8", errors="replace") as fh:
            for line in fh:
                if not line.startswith("{"):
                    continue
                try:
                    rec = json.loads(line)
                except ValueError:
                    continue
                kind, sub = rec.get("type"), rec.get("subtype")
                if kind == "system" and sub == "init":
                    init = {k: rec.get(k) for k in ("session_id", "model", "permissionMode", "cwd", "apiKeySource",
                                                    "claude_code_version", "output_style")}
                elif kind == "system" and sub == "compact_boundary":
                    boundaries += 1
                elif kind == "result":
                    result = {k: rec.get(k) for k in ("subtype", "is_error", "duration_ms", "duration_api_ms",
                                                      "num_turns", "result", "session_id", "total_cost_usd",
                                                      "usage", "permission_denials")}
    except OSError:
        pass
    return {"init": init, "result": result, "stream_boundaries": boundaries}


def classify(exit_code: int | None, timed_out: bool, parsed: dict[str, Any], stderr_tail: str) -> str:
    """ok | limit | timeout | error"""
    if timed_out:
        return "timeout"
    result = parsed.get("result") or {}
    text = f"{result.get('result') or ''}\n{stderr_tail}"
    if result and not result.get("is_error") and exit_code == 0:
        return "ok"
    if LIMIT_RE.search(text):
        return "limit"
    return "error"


def run_claude(argv: list[str], cwd: Path, prompt: str, log_path: Path, timeout: float,
               env: dict[str, str]) -> dict[str, Any]:
    """Run one print-mode step: prompt on stdin, stream-json to log_path, process tree killed on timeout."""
    log_path.parent.mkdir(parents=True, exist_ok=True)
    err_path = log_path.with_suffix(".stderr.txt")
    started = time.time()
    timed_out = False

    def kill_tree(proc: subprocess.Popen) -> None:
        subprocess.run(["taskkill", "/PID", str(proc.pid), "/T", "/F"], capture_output=True)
        try:
            proc.communicate(timeout=30)
        except (subprocess.TimeoutExpired, ValueError, OSError):
            proc.kill()

    with open(log_path, "wb") as out, open(err_path, "wb") as err:
        proc = None
        for attempt in range(3):  # a refused process start has run nothing; see common.run_retry
            try:
                proc = subprocess.Popen(argv, cwd=str(cwd), stdin=subprocess.PIPE, stdout=out, stderr=err, env=env,
                                        creationflags=getattr(subprocess, "CREATE_NEW_PROCESS_GROUP", 0))
                break
            except PermissionError:
                if attempt == 2:
                    raise
                time.sleep(0.5 * (attempt + 1))
        try:
            proc.communicate(prompt.encode("utf-8"), timeout=timeout)
        except subprocess.TimeoutExpired:
            timed_out = True
            kill_tree(proc)
        except BaseException:
            # Ctrl+C or a driver error: the child is in its own process group and would keep working on
            # the session in the background, racing the step that --continue sends next. Stop it first.
            kill_tree(proc)
            raise
    try:
        stderr_tail = err_path.read_text(encoding="utf-8", errors="replace")[-2000:]
    except OSError:
        stderr_tail = ""
    parsed = parse_stream(log_path)
    return {"exit": proc.returncode, "timed_out": timed_out, "wall_s": round(time.time() - started, 1),
            "status": classify(proc.returncode, timed_out, parsed, stderr_tail), "stderr_tail": stderr_tail[-600:],
            **parsed}
