"""Local documentation/checkpoint tools. No clinic application or remote effects."""
from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import math
from pathlib import Path
import re
import subprocess
import sys
import tempfile
import time
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parents[1]
SCHEMA = "docs/agentic-coding/evaluation-run.schema.json"
REQUIRED = (
    "AGENTS.md", "README.md", "sources/provenance.json",
    "archive/provenance.json", "docs/technical-plan/README.md",
    "docs/agentic-coding/workflow-templates.md", SCHEMA,
)


def now() -> str:
    return dt.datetime.now(dt.timezone.utc).isoformat()


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def local_path(root: Path, name: str) -> Path:
    """Only repository-relative paths, including on a copied workspace."""
    if not name or re.match(r"^[A-Za-z]:", name) or name.startswith(("/", "\\")):
        raise ValueError("Expected a repository-relative path")
    result = (root / name.replace("\\", "/")).resolve()
    if not result.is_relative_to(root.resolve()):
        raise ValueError("Path escapes the selected project")
    return result


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8-sig"))


def save_evidence(root: Path, name: str, data: dict) -> None:
    path = local_path(root, name)
    rel = path.relative_to(root.resolve()).as_posix()
    if not rel.startswith(("output/coding-workflow/", "docs/tasks/")) or path.suffix != ".json":
        raise ValueError("Evidence output must be JSON under output/coding-workflow or docs/tasks")
    if path.exists():
        raise ValueError("Evidence already exists; choose a new snapshot/run name")
    path.parent.mkdir(parents=True, exist_ok=True)
    # An exclusive create prevents a concurrent run from silently overwriting evidence.
    with path.open("x", encoding="utf-8", newline="\n") as stream:
        json.dump(data, stream, indent=2)
        stream.write("\n")


def doctor(root: Path) -> dict:
    missing = [name for name in REQUIRED if not local_path(root, name).is_file()]
    return {"ok": not missing and sys.version_info >= (3, 10), "root": str(root),
            "python": sys.version.split()[0], "pythonExecutable": sys.executable,
            "minimumPython": "3.10", "missing": missing,
            "scope": "workflow tooling only; no application check environment established"}


def check_documents(root: Path) -> dict:
    errors = []
    health = doctor(root)
    if not health["ok"]:
        return {"ok": False, "errors": ["Incomplete project or unsupported Python"], "doctor": health}
    markdown = [root / "AGENTS.md", root / "README.md"]
    markdown += sorted((root / "docs").rglob("*.md"))
    markdown += sorted((root / "archive").glob("*.md"))
    link_count = 0
    for path in markdown:
        fence = None
        for line_no, line in enumerate(path.read_text(encoding="utf-8-sig").splitlines(), 1):
            match = re.match(r"^\s*(`{3,}|~{3,})", line)
            if match:
                marker = match[1]
                if fence is None:
                    fence = marker
                elif marker[0] == fence[0] and len(marker) >= len(fence):
                    fence = None
                continue
            if fence:
                continue
            for raw in re.findall(r"\]\(([^)]+)\)", line):
                target = raw.split(' "')[0].strip("<>")
                if re.match(r"^(https?|mailto|codex|app|plugin|skill):", target) or target.startswith("#"):
                    continue
                target = re.sub(r":\d+$", "", unquote(target.split("#")[0]))
                if target:
                    link_count += 1
                    if not (path.parent / target).is_file():
                        errors.append(f"{path.relative_to(root)}:{line_no}: missing file target {target}")
        if fence:
            errors.append(f"{path.relative_to(root)}: unclosed code fence")
    json_paths = sorted((root / "docs").rglob("*.json"))
    json_paths += [root / "sources/provenance.json", root / "archive/provenance.json"]
    for path in json_paths:
        try:
            read_json(path)
        except (ValueError, OSError) as exc:
            errors.append(f"{path.relative_to(root)}: invalid JSON: {exc}")
    for record, source in (("sources/provenance.json", "sources/MD Health Clinic Inventory final.pdf"),
                           ("archive/provenance.json", "archive/Charter-Tier-6-Auto-Pilot.pdf")):
        try:
            expected = read_json(local_path(root, record))["sha256"]
            if digest(local_path(root, source).read_bytes()).lower() != expected.lower():
                errors.append(f"{source}: provenance hash mismatch")
        except (OSError, ValueError, KeyError) as exc:
            errors.append(f"{record}: provenance check failed: {exc}")
    # Narrow instruction regression checks; these prove presence, not agent behavior.
    required_sections = {
        "docs/agentic-coding/workflow-templates.md": ["## Current-state ownership", "## Code shape", "## Boundary checks", "fail-before/pass-after", "## Next action"],
        "docs/agentic-coding/evaluation-plan.md": ["## Quality, context and cost", "## Iterative change and instruction regression", "actual current baseline"],
        "docs/prompts/coding-task-launcher.md": ["Task.md is the current-state index", "fail-before/pass-after", "command-catalogue.md"],
    }
    for name, sections in required_sections.items():
        try:
            text = local_path(root, name).read_text(encoding="utf-8-sig")
            errors.extend(f"{name}: missing workflow contract {section}" for section in sections if section not in text)
        except OSError:
            errors.append(f"{name}: missing working instruction")
    return {"ok": not errors, "markdownFiles": len(markdown), "localFileTargets": link_count,
            "jsonFiles": len(json_paths), "errors": errors,
            "limits": ["File targets, not anchors or source meaning", "No application/T01-T20 or human acceptance"]}


def make_checkpoint(root: Path, task: str, packet: str, sources: list[str]) -> dict:
    task_path = local_path(root, task)
    task_rel = task_path.relative_to(root.resolve())
    if task_path.name != "task.md" or task_rel.parts[:2] != ("docs", "tasks") or len(task_rel.parts) < 4:
        raise ValueError("Canonical task must be docs/tasks/<id>/task.md")
    text = task_path.read_text(encoding="utf-8-sig")
    next_match = re.search(r"^## Next action\s*\n(.+?)(?=\n## |\Z)", text, re.M | re.S)
    status = re.search(r"^Status:\s*(.+)$", text, re.M)
    if not status or not next_match or not next_match[1].strip():
        raise ValueError("Task index needs Status and a nonempty Next action")
    if not sources:
        raise ValueError("Declare at least one relevant source dependency")
    names = list(dict.fromkeys(local_path(root, name).relative_to(root.resolve()).as_posix() for name in [task, packet] + sources))
    if len(names) < 3 or task_rel.as_posix() == local_path(root, packet).relative_to(root.resolve()).as_posix():
        raise ValueError("Task, packet and at least one relevant source must be distinct")
    dependencies = []
    for name in names:
        path = local_path(root, name)
        data = path.read_bytes()
        dependencies.append({"path": path.relative_to(root.resolve()).as_posix(), "sha256": digest(data), "bytes": len(data)})
    return {"schemaVersion": 1, "createdAtUtc": now(), "kind": "task projection",
            "canonicalTask": task_path.relative_to(root.resolve()).as_posix(),
            "packet": local_path(root, packet).relative_to(root.resolve()).as_posix(), "statusAtCheckpoint": status[1].strip(),
            "nextActionAtCheckpoint": next_match[1].strip(), "dependencies": dependencies,
            "authority": "Current task/source/check evidence governs; this snapshot does not authorize or verify work"}


def inspect_checkpoint(root: Path, record: dict) -> dict:
    if not isinstance(record, dict) or record.get("schemaVersion") != 1 or not isinstance(record.get("dependencies"), list):
        raise ValueError("Unsupported checkpoint shape")
    dependencies = record["dependencies"]
    if not all(isinstance(x, dict) and isinstance(x.get("path"), str) and isinstance(x.get("sha256"), str) and re.fullmatch(r"[0-9a-f]{64}", x["sha256"]) for x in dependencies):
        raise ValueError("Each dependency needs a relative path and SHA-256")
    if not all(isinstance(record.get(key), str) for key in ("canonicalTask", "packet")):
        raise ValueError("Checkpoint task and packet paths must be strings")
    expected_names = {record["canonicalTask"], record["packet"]}
    dependency_names = {local_path(root, x["path"]).relative_to(root.resolve()).as_posix() for x in dependencies}
    if len(dependency_names) < 3 or len(expected_names) != 2 or not expected_names.issubset(dependency_names):
        raise ValueError("Checkpoint must include task, packet and relevant source")
    changed = []
    for dependency in dependencies:
        path = local_path(root, dependency["path"])
        if not path.is_file():
            changed.append({"path": dependency["path"], "reason": "missing"})
        elif digest(path.read_bytes()) != dependency["sha256"]:
            changed.append({"path": dependency["path"], "reason": "changed"})
    return {"ok": not changed, "canonicalTask": record["canonicalTask"], "changed": changed,
            "action": "Inspect changed sources, update task/packet and create a new checkpoint" if changed else
                      "Read the current task index and source evidence before the recorded next action",
            "limits": "Unchanged bytes do not prove facts complete, true or work accepted"}


def schema_errors(value, schema: dict, location: str = "run") -> list[str]:
    """Validate the small documented schema subset used by our run record."""
    errors = []
    checks = {"null": lambda x: x is None, "boolean": lambda x: isinstance(x, bool),
              "string": lambda x: isinstance(x, str), "integer": lambda x: isinstance(x, int) and not isinstance(x, bool),
              "number": lambda x: isinstance(x, (int, float)) and not isinstance(x, bool),
              "object": lambda x: isinstance(x, dict), "array": lambda x: isinstance(x, list)}
    types = schema.get("type", list(checks))
    types = [types] if isinstance(types, str) else types
    if not any(checks[t](value) for t in types):
        return [f"{location}: expected {types}"]
    if "enum" in schema and value not in schema["enum"]:
        errors.append(f"{location}: value outside declared enum")
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        if not math.isfinite(value):
            errors.append(f"{location}: nonfinite number")
        if "minimum" in schema and value < schema["minimum"]:
            errors.append(f"{location}: below minimum")
    if isinstance(value, dict):
        properties = schema.get("properties", {})
        errors.extend(f"{location}.{key}: missing" for key in schema.get("required", []) if key not in value)
        if schema.get("additionalProperties") is False:
            errors.extend(f"{location}.{key}: undeclared field" for key in value if key not in properties)
        for key, item in value.items():
            if key in properties:
                errors.extend(schema_errors(item, properties[key], f"{location}.{key}"))
            elif isinstance(schema.get("additionalProperties"), dict):
                errors.extend(schema_errors(item, schema["additionalProperties"], f"{location}.{key}"))
    if isinstance(value, list) and "items" in schema:
        for i, item in enumerate(value):
            errors.extend(schema_errors(item, schema["items"], f"{location}[{i}]"))
    return errors


def validate_run(record: dict, schema: dict) -> list[str]:
    errors = schema_errors(record, schema)
    if errors:
        return errors
    if record["cost_status"] == "unknown" and record["cost_usd"] is not None:
        errors.append("Unknown cost must be null, not an invented zero")
    if record["cost_status"] != "unknown" and (record["cost_usd"] is None or not record["cost_source"] or not record["cost_attribution"]):
        errors.append("Measured/estimated cost needs an amount, source and attribution")
    if record["context_measurement_method"] != "provider_tokens" and any(record[key] is not None for key in ("input_tokens", "cached_input_tokens", "output_tokens")):
        errors.append("Proxy payload cannot be reported as provider token telemetry")
    if record["critical_facts_correct"] > record["critical_facts_required"]:
        errors.append("Correct facts exceed required facts")
    if record["accepted"] and (record["critical_facts_correct"] != record["critical_facts_required"] or record["stale_fact_count"] or record["blocking_findings"]):
        errors.append("Accepted run has missing/stale decisive facts or blocking findings")
    if record["accepted"] and not record["acceptance_evidence"]:
        errors.append("Acceptance needs actual evidence")
    if record["resume_kind"] != "not_tested" and record["resume_success"] is None:
        errors.append("An exercised resume needs a reported outcome")
    if record["resume_kind"] == "not_tested" and record["resume_success"] is not None:
        errors.append("An untested resume cannot claim an outcome")
    if record["cached_input_tokens"] is not None and (record["input_tokens"] is None or record["cached_input_tokens"] > record["input_tokens"]):
        errors.append("Cached input cannot exceed declared total input")
    if record["human_active_minutes"] is not None and (record["human_engineering_hours"] is None or not math.isclose(record["human_engineering_hours"], record["human_active_minutes"] / 60)):
        errors.append("Human engineering hours must derive from active person-minutes")
    if record["failed_scenarios"] != sum(record["failed_scenarios_by_severity"].values()):
        errors.append("Failed scenario count must match severity counts")
    if record["failed_scenarios"] > record["held_out_scenarios"]:
        errors.append("Failed scenarios exceed evaluated exposure")
    try:
        start = dt.datetime.fromisoformat(record["started_at"])
        end = dt.datetime.fromisoformat(record["ended_at"])
        if not start.tzinfo or not end.tzinfo or end < start:
            errors.append("Run timestamps need timezones and ordered start/end")
    except ValueError:
        errors.append("Run timestamps must be ISO dates with timezones")
    return errors


def pilot(root: Path) -> dict:
    """Six deterministic mechanism cases. Never a model/productivity benchmark."""
    case_data = read_json(root / "tests/workflow/pilot-cases.json")
    results = []
    delivered = {"baseline": 0, "treatment": 0}
    reader_calls = 0
    started_at = now()
    started = time.perf_counter()
    with tempfile.TemporaryDirectory(prefix="clinic-workflow-pilot-") as temporary:
        fixture_root = Path(temporary)
        common = b"Authority: synthetic workflow fixture; proposals are not clinic facts.\n"
        for case in case_data["cases"]:
            source = (case["source"] + "\n" + case_data["background"] + "\n").encode()
            # Baseline already has the current authority and relevant route.
            baseline_payload = common + source
            required_facts = case["expected_facts"]
            base = fixture_root / case["id"]
            base.mkdir()
            (base / "baseline.txt").write_bytes(baseline_payload)
            # Actual preparation read, including the constructed historical background.
            preparation_input = (base / "baseline.txt").read_bytes()
            background_suffix = (case_data["background"] + "\n").encode()
            packet = preparation_input.removesuffix(background_suffix)
            (base / "packet.txt").write_bytes(packet)
            code = "import pathlib,sys; sys.stdout.buffer.write(pathlib.Path(sys.argv[1]).read_bytes())"
            outputs = {}
            case_bytes = {"baseline": 0, "treatment": len(preparation_input)}
            for condition, filename in (("baseline", "baseline.txt"), ("treatment", "packet.txt")):
                outputs[condition] = []
                for _ in range(2):
                    reader = subprocess.run([sys.executable, "-c", code, str(base / filename)], capture_output=True, check=True)
                    outputs[condition].append(reader.stdout)
                    case_bytes[condition] += len(reader.stdout)
                    reader_calls += 1
                delivered[condition] += case_bytes[condition]
            baseline_ok = all(all(fact.encode() in payload for fact in required_facts) for payload in outputs["baseline"])
            treatment_ok = all(all(fact.encode() in payload for fact in required_facts) for payload in outputs["treatment"])
            resumed = all(payload == packet for payload in outputs["treatment"]) and treatment_ok
            # Independent fact oracle must reject loss of any one required fact.
            damaged = packet.replace(required_facts[-1].encode(), b"", 1)
            negative_rejected = not all(fact.encode() in damaged for fact in required_facts)
            results.append({"case": case["id"], "baselineFactsPreserved": baseline_ok,
                            "treatmentFactsPreserved": treatment_ok, "subprocessResume": resumed,
                            "lostFactRejected": negative_rejected, "factCount": len(required_facts),
                            "baselineDeliveredBytes": case_bytes["baseline"],
                            "treatmentDeliveredBytesIncludingPreparation": case_bytes["treatment"]})
        # Real checkpoint functions exercise freshness in a disposable repository copy.
        (fixture_root / "docs/tasks/resume").mkdir(parents=True)
        task = "docs/tasks/resume/task.md"; packet_name = "docs/tasks/resume/context.md"
        (fixture_root / task).write_text("Status: in progress\n## Next action\nFix the failing synthetic check.\n", encoding="utf-8")
        (fixture_root / packet_name).write_text("REPORTED remains REPORTED; check failed.\n", encoding="utf-8")
        (fixture_root / "source.md").write_text("version one", encoding="utf-8")
        snapshot = make_checkpoint(fixture_root, task, packet_name, ["source.md"])
        before = inspect_checkpoint(fixture_root, snapshot)["ok"]
        (fixture_root / "unrelated.md").write_text("unrelated", encoding="utf-8")
        unrelated = inspect_checkpoint(fixture_root, snapshot)["ok"]
        (fixture_root / "source.md").write_text("version two", encoding="utf-8")
        stale_rejected = not inspect_checkpoint(fixture_root, snapshot)["ok"]
    ok = all(all(row[key] for key in ("baselineFactsPreserved", "treatmentFactsPreserved", "subprocessResume", "lostFactRejected")) for row in results)
    ok = ok and before and unrelated and stale_rejected
    return {"ok": ok, "createdAtUtc": now(), "kind": "deterministic synthetic mechanism pilot",
            "startedAtUtc": started_at, "endedAtUtc": now(),
            "caseManifestSha256": digest((root / "tests/workflow/pilot-cases.json").read_bytes()),
            "cases": results, "freshCheckpointAccepted": before, "unrelatedChangeAccepted": unrelated,
            "staleDependencyRejected": stale_rejected, "deliveredPayloadBytes": delivered,
            "readerSubprocessCalls": reader_calls, "packetPreparationReads": len(results),
            "measurement": "Actual UTF-8 bytes read for preparation and emitted to the harness by every reader subprocess; no model boundary",
            "elapsedSeconds": time.perf_counter() - started,
            "inputTokens": None, "providerCostUsd": None, "humanProductivity": None,
            "decision": "Retain narrow checkpoint and conditional template mechanisms; fresh-agent/coding evaluation remains unrun",
            "limits": ["Preconstructed synthetic fixtures; not model-generated context",
                       "Fresh subprocess is not a fresh LLM session", "No independent human or clinic acceptance",
                       "Byte accounting includes preparation; no 3x/5x performance claim"]}


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=ROOT)
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("doctor")
    verify = sub.add_parser("verify"); verify.add_argument("--output")
    checkpoint = sub.add_parser("checkpoint")
    checkpoint.add_argument("--task", required=True); checkpoint.add_argument("--packet", required=True)
    checkpoint.add_argument("--source", action="append", required=True); checkpoint.add_argument("--output", required=True)
    resume = sub.add_parser("resume"); resume.add_argument("checkpoint")
    run = sub.add_parser("validate-run"); run.add_argument("record")
    trial = sub.add_parser("pilot"); trial.add_argument("--output", required=True)
    args = parser.parse_args(argv); root = args.root.resolve()
    try:
        if args.command == "doctor":
            result = doctor(root)
        elif args.command == "verify":
            documents = check_documents(root)
            suite = subprocess.run([sys.executable, "-m", "unittest", "discover", "-s", "tests/workflow", "-p", "test_*.py"], cwd=root, capture_output=True, text=True)
            log = suite.stdout + suite.stderr
            count = re.search(r"Ran (\d+) tests?", log)
            tests_run = int(count[1]) if count else 0
            result = {"ok": documents["ok"] and suite.returncode == 0 and tests_run > 0, "createdAtUtc": now(),
                      "documents": documents, "testExitCode": suite.returncode,
                      "testsRun": tests_run, "testLog": log, "environment": doctor(root)}
            if args.output: save_evidence(root, args.output, result)
        elif args.command == "checkpoint":
            result = make_checkpoint(root, args.task, args.packet, args.source)
            save_evidence(root, args.output, result); result = {"ok": True, "checkpoint": args.output, "projectionOnly": True}
        elif args.command == "resume":
            result = inspect_checkpoint(root, read_json(local_path(root, args.checkpoint)))
        elif args.command == "validate-run":
            errors = validate_run(read_json(local_path(root, args.record)), read_json(root / SCHEMA))
            result = {"ok": not errors, "errors": errors, "limits": "Record shape/invariants only; evidence and independent acceptance must still be evaluated"}
        else:
            result = pilot(root); save_evidence(root, args.output, result)
        print(json.dumps(result, indent=2))
        return 0 if result.get("ok") else 2
    except (OSError, ValueError, KeyError, TypeError, subprocess.SubprocessError) as exc:
        print(json.dumps({"ok": False, "error": str(exc)}))
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
