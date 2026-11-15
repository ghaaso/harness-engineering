"""Project-local command line for Codex checkpoints (Python 3.10+, stdlib only)."""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))

from engine import ContextStore, MAX_EVENT_BYTES
from storage import contained, read_json
import budget
import hooks


def settings(project: Path) -> dict:
    project = project.resolve()
    config = read_json(contained(project / ".codex/context-system.json", project))
    if not isinstance(config, dict) or config.get("version") != 1 or not isinstance(config.get("state_file"), str):
        raise ValueError("Install or provide a valid .codex/context-system.json first")
    runtime = Path(config.get("runtime") or ".codex/context-runtime")
    if not runtime.is_absolute():
        runtime = project / runtime
    return {"root": project, "runtime": runtime, "state_file": config["state_file"],
            "snapshot_chars": config.get("snapshot_chars", 6000), "restore_chars": config.get("restore_chars", 9000),
            "snapshot_bytes": config.get("snapshot_bytes"), "restore_bytes": config.get("restore_bytes"),
            "recall_bytes": config.get("recall_bytes", 2048)}


def write_output(text: str, limit: int | None = None) -> None:
    encoded = text.encode("utf-8")
    if limit is not None and len(encoded) > limit:
        raise ValueError("Output exceeds its UTF-8 byte budget")
    # Write UTF-8 explicitly: Windows console encodings and CRLF translation
    # must not change either the decoded text or the measured wire length.
    if hasattr(sys.stdout, "buffer"):
        sys.stdout.buffer.write(encoded)
        sys.stdout.buffer.flush()
    else:
        sys.stdout.write(text)


def emit(value, limit: int | None = None) -> None:
    write_output(budget.checked_json(value, limit), limit)


class Parser(argparse.ArgumentParser):
    def error(self, message):
        raise ValueError(message)


def main(argv=None) -> int:
    parser = Parser(description=__doc__)
    parser.add_argument("--project", type=Path, default=Path.cwd())
    sub = parser.add_subparsers(dest="cmd", required=True)
    hook = sub.add_parser("hook")
    hook.add_argument("event")
    for name in ("focus", "snapshot", "restore", "status"):
        command = sub.add_parser(name)
        if name == "focus":
            command.add_argument("path")
        command.add_argument("--session", required=True)
    recall = sub.add_parser("recall")
    recall_sub = recall.add_subparsers(dest="recall_cmd", required=True)
    for name in ("search", "show"):
        command = recall_sub.add_parser(name)
        command.add_argument("value")
        command.add_argument("--session", required=True)
        command.add_argument("--cursor", help="Continue from the previous response's next_cursor")
        command.add_argument("--bytes", type=int, help="Lower the configured UTF-8 output budget for this page")
    install = sub.add_parser("install")
    install.add_argument("--python", type=Path, default=Path(sys.executable))
    install.add_argument("--state-file", required=True)
    install.add_argument("--runtime", type=Path)
    install.add_argument("--snapshot-bytes", type=int)
    install.add_argument("--restore-bytes", type=int)
    install.add_argument("--recall-bytes", type=int, default=2048)
    sub.add_parser("uninstall")
    doctor = sub.add_parser("doctor")
    doctor.add_argument("--native", type=Path, help="Read-only hook discovery through this Codex executable")
    try:
        args = parser.parse_args(argv)
    except ValueError as error:
        # Even malformed arguments must produce a complete bounded response.
        emit(budget.failure(error, budget.MIN_BYTES), budget.MIN_BYTES)
        return 2
    output_limit = 2048 if args.cmd == "recall" else None
    try:
        if args.cmd in {"install", "uninstall", "doctor"}:
            import install as installer
            if args.cmd == "install":
                result = installer.install(args.project, args.python, Path(__file__).resolve(), args.state_file, args.runtime,
                                           snapshot_bytes=args.snapshot_bytes, restore_bytes=args.restore_bytes,
                                           recall_bytes=args.recall_bytes)
            else:
                result = getattr(installer, args.cmd)(args.project)
            if args.cmd == "doctor" and args.native:
                import native
                result["native"] = native.probe(args.native, args.project.resolve())
            emit(result)
            return 0 if result.get("ok", True) else 1
        store_settings = settings(args.project)
        if args.cmd in {"hook", "restore"}:
            output_limit = budget.byte_limit(store_settings["restore_bytes"], "restore_bytes", optional=True)
        elif args.cmd == "snapshot":
            output_limit = budget.byte_limit(store_settings["snapshot_bytes"], "snapshot_bytes", optional=True)
        elif args.cmd == "recall":
            output_limit = budget.byte_limit(store_settings["recall_bytes"], "recall_bytes")
            if args.bytes is not None:
                output_limit = min(output_limit, budget.byte_limit(args.bytes, "recall page bytes"))
        if args.cmd == "hook":
            raw = sys.stdin.buffer.read(MAX_EVENT_BYTES + 1)
            if len(raw) > MAX_EVENT_BYTES:
                raise ValueError("Hook input exceeds 1 MiB")
            payload = json.loads(raw.decode("utf-8-sig"))
            output = hooks.run(args.event, payload, **store_settings)
            if output is not None:
                emit(output, output_limit)
            return 0
        store = ContextStore(**store_settings)
        if args.cmd == "focus":
            emit({"state_file": store.focus(args.session, args.path)})
        elif args.cmd == "snapshot":
            manifest = store.snapshot(args.session)
            emit({key: manifest[key] for key in ("id", "state_file", "sequence", "omitted", "problem",
                                                "text_chars", "text_bytes", "wire_bytes")}, output_limit)
        elif args.cmd == "restore":
            write_output(store.restore(args.session) + "\n", output_limit)
        elif args.cmd == "recall":
            if args.recall_cmd == "show":
                result = store.show_page(args.session, args.value, args.cursor, args.bytes)
            else:
                result = store.search_page(args.session, args.value, args.cursor, args.bytes)
            emit(result, output_limit)
        elif args.cmd == "status":
            folder = store._session(args.session)
            control = store._control(folder)
            emit({"session_id": args.session, "state_file": str(store._focus(control)),
                  "current_snapshot": control.get("current"), "runtime": str(store.runtime),
                  "native_trust": "unknown; check Codex hooks review", "coverage": "captured hook events only"})
        return 0
    except Exception as error:
        if args.cmd == "hook":
            emit(budget.failure(error, output_limit, hook=True), output_limit)
            return 0
        emit(budget.failure(error, output_limit), output_limit)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
