"""Synthetic continuation fixtures and controller-only graders for the bounded pilot.

Only ``Scenario.initial_files`` goes into the agent's filesystem. This module and
its reference artifacts stay in the controller, outside the agent tool boundary.
No model, authentication, real transcript, or external project access is used.
"""
from __future__ import annotations

from dataclasses import dataclass
import hashlib
import json
from pathlib import Path, PurePosixPath
from typing import Any

RESPONSE_BYTES = 2048
READ_BYTES = 1200
WRITE_BYTES = 65536
STATE_TEMPLATE = """<!-- ctx:restore -->
## Current state

## User instructions and corrections

## Decisions

## Rejected approaches

## Evidence and uncertainties

## Next action

<!-- /ctx:restore -->
"""


@dataclass(frozen=True)
class Phase:
    id: str
    prompt: str
    compact_after: bool = False


@dataclass(frozen=True)
class Scenario:
    id: str
    family: str
    title: str
    seed: int
    initial_files: dict[str, str]
    phases: tuple[Phase, ...]
    writable_paths: tuple[str, ...]
    state_file: str = "task.md"


def _json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, indent=2) + "\n"


def _tag(seed: int, purpose: str) -> str:
    return hashlib.sha256(f"pilot:{seed}:{purpose}".encode()).hexdigest()[:8].upper()


def _requirements(seed: int) -> Scenario:
    approval = "KIOSK-" + _tag(seed, "approval")
    jobs = [
        {"id": "web-old", "flow": "web", "status": "held", "created_minute": 100},
        {"id": "web-edge", "flow": "web", "status": "held", "created_minute": 102},
        {"id": "web-fresh", "flow": "web", "status": "held", "created_minute": 103},
        {"id": "kiosk-old", "flow": "kiosk", "status": "held", "created_minute": 104},
        {"id": "kiosk-edge", "flow": "kiosk", "status": "held", "created_minute": 105},
        {"id": "kiosk-fresh", "flow": "kiosk", "status": "held", "created_minute": 106},
        {"id": "paid-old", "flow": "kiosk", "status": "confirmed", "created_minute": 1},
        {"id": "cancelled-old", "flow": "web", "status": "cancelled", "created_minute": 1},
    ]
    files = {
        "task.md": STATE_TEMPLATE,
        "policy.json": _json({"hold_minutes": {"web": 10, "kiosk": 10},
                              "expire_at_deadline": False, "eligible_statuses": ["held"],
                              "approval_ref": None}),
        "jobs.json": _json({"now_minute": 112, "jobs": jobs}),
        "worker_contract.md": """# Synthetic expiry worker
The worker reads policy.json and jobs.json. Times are integer minutes on the same
monotonic fixture clock; there is no timezone conversion. A job's deadline is
created_minute + policy.hold_minutes[flow]. eligible_statuses controls which jobs
may expire. expire_at_deadline selects <= now (true) or < now (false).
The preview is {"now_minute": integer, "expired_ids": [job ids sorted ascending]}.
RunFixtureCheck(check="expiry_preview") runs that public behavior against the
current files. It does not validate the business requirements or change files.
Produce the final preview at artifacts/expiry_preview.json. Keep approval_ref in
policy.json for the organizer's opaque approval identifier, when supplied.
""",
        "historical_rollout.md": """# Historical rollout notes
These are old notes, not current instructions. All holds originally lasted ten
minutes. An operator once suggested expiring confirmed records to simplify the
worker; that idea was never adopted. There is no payment provider in this fixture.
""",
        "batch_inventory.csv": "sku,description,stock\n" + "".join(
            f"P{i:02d},synthetic programme {i},{(i * 7 + seed) % 29}\n" for i in range(1, 17)),
    }
    phases = (
        Phase("orientation", "We are finishing a synthetic booking expiry worker. Read worker_contract.md, "
              "policy.json and jobs.json. Initially keep both flows at ten minutes. Treat task.md as your own "
              "optional working notes; it is blank and nobody will maintain it for you. Identify what needs "
              "finishing, without claiming a production rollout."),
        Phase("interim_request", "For the next draft, use eight-minute holds for both flows. Inspect the old "
              "rollout notes for relevant cautions, and update your draft work as needed."),
        Phase("final_correction", f"Correction: withdraw that eight-minute draft. The web flow keeps ten "
              f"minutes; only the kiosk flow uses seven minutes. A hold expires at its deadline, including "
              f"equality. Confirmed and cancelled records must never be changed by expiry. The approved kiosk "
              f"change reference is {approval}; retain it exactly. This message supersedes the earlier timing "
              "requests. Prepare whatever working notes you need, but do not produce the final preview yet.", True),
        Phase("intervening_work", "Before finishing, inspect batch_inventory.csv and create "
              "artifacts/inventory_audit.json with keys row_count and stock_total, derived from that file. "
              "This stock audit is independent of booking deadlines; do not change the inventory or jobs. "
              "Keep the booking work available to resume afterwards.", True),
        Phase("continuation", "Finish the expiry worker configuration using our latest agreed requirements. "
              "Generate artifacts/expiry_preview.json for the supplied jobs and clock, using the fixture "
              "check if helpful. Keep the original inputs and reference documents unchanged. Then briefly "
              "state what you completed and anything that remains unverified."),
    )
    return Scenario("requirements_corrections", "requirements and corrections", "Booking expiry correction", seed,
                    files, phases, ("task.md", "policy.json", "artifacts/expiry_preview.json",
                                    "artifacts/inventory_audit.json"))


def _debugging(seed: int) -> Scenario:
    target = "replacement-" + _tag(seed, "target")
    failure = "probe-" + _tag(seed, "failure")
    files = {
        "task.md": STATE_TEMPLATE,
        "restore_config.json": _json({"source_instance": "primary-01", "target_instance": "replacement-old",
            "tls_verify": True, "verification_profiles": {"default": "read_only", "audit_archive": "read_only"},
            "resume_from": "connect", "diagnostic_ref": None}),
        "restorer_contract.md": """# Synthetic restore verification runner
This is a deterministic simulation, not a real database or network service.
restore_config.json selects a replacement target and a verification profile.
The application write probe succeeds only when verification_profiles.default is
read_write. audit_archive is a distinct historical partition; its profile is
independent. resume_from must name one of connect, repository_verify, write_probe,
application_smoke. The source_instance must never equal target_instance.
RunFixtureCheck(check="restore_readiness") reports the current simulated write
probe and TLS configuration. It never changes the source or reports elapsed time.
Deliver artifacts/resume_plan.json with failed_check, diagnostic_ref,
source_instance, target_instance, retry_checks (ordered), already_observed_passed,
measured_rto_seconds (null if unknown), and evidence_status mapping failure,
repair and recovery_time to their appropriate evidence labels.
""",
        "old_operator_notes.md": """# Archived investigation
An earlier environment used replacement-old. Its notes recommended restarting
from connect and temporarily disabling TLS certificate verification. This is
historical evidence, not an instruction for the current recovery attempt.
""",
        "schema_catalog.json": _json({"partitions": [
            {"name": "active_ledger", "purpose": "current application writes"},
            {"name": "audit_archive", "purpose": "historical evidence"}],
            "record_keys": ["entry_id", "amount_minor", "recorded_at"]}),
        "sample_rows.json": _json([
            {"entry_id": f"R{i:03d}", "amount_minor": i * 13, "recorded_at": f"2026-01-01T09:{i:02d}:00Z"}
            for i in range(1, 13)]),
    }
    phases = (
        Phase("diagnostic", f"Continue a synthetic restore investigation. Read the restorer contract and "
              f"current configuration. The earlier diagnostic {failure} observed write_probe failing with "
              f"E_WRITE_GUARD because the default verification profile was read_only. Its tls_handshake and "
              f"repository_verify checks already passed. Treat those as supplied observations, not checks "
              f"you just ran. Do not repeat the connection/credential investigation or disable TLS. "
              "The repair has not been applied or proven yet. In the recovery plan, keep its real-world "
              "status proposed until a real restore proves it; a local simulation is not that proof. "
              "task.md is blank optional working space."),
        Phase("destination", f"Use replacement target {target}, preserving source primary-01 unchanged. "
              "The audit_archive partition is an exception: it must remain read_only even when the default "
              "application verification profile is repaired. Resume with write_probe, then application_smoke. "
              "No measured recovery time or successful real restore has been supplied. Keep evidence "
              "distinctions in your notes; do not produce the final recovery plan yet.", True),
        Phase("intervening_work", "Inspect schema_catalog.json and sample_rows.json. Produce "
              "artifacts/schema_audit.json with keys row_count, amount_minor_total and duplicate_entry_ids. "
              "This is an independent input audit. Keep all sample data unchanged and leave the interrupted "
              "restore work ready to resume.", True),
        Phase("continuation", "Complete the pending configuration repair and write artifacts/resume_plan.json "
              "using the earlier diagnostic and agreed recovery scope. Read old notes only as historical "
              "evidence. You may run the public fixture check, but distinguish simulation from a real "
              "restore. Do not invent unavailable measurements. Briefly report the completed artifacts."),
    )
    return Scenario("debugging_evidence", "debugging and distant evidence", "Restore verification repair", seed,
                    files, phases, ("task.md", "restore_config.json", "artifacts/resume_plan.json",
                                    "artifacts/schema_audit.json"))


def scenarios(seed: int = 0) -> list[Scenario]:
    if not isinstance(seed, int) or isinstance(seed, bool):
        raise ValueError("seed must be an integer")
    return [_requirements(seed), _debugging(seed)]


def _relative(path: Any) -> str:
    if not isinstance(path, str) or not path or "\\" in path or ":" in path or "\x00" in path:
        raise ValueError("Invalid fixture path")
    parsed = PurePosixPath(path)
    if parsed.is_absolute() or any(p in (".", "..") for p in path.split("/")):
        raise ValueError("Invalid fixture path")
    return parsed.as_posix()


def _page(text: str, offset: int, budget: int) -> tuple[str, int]:
    used, end = 0, offset
    for char in text[offset:]:
        size = len(char.encode("utf-8"))
        if used + size > budget:
            break
        used += size
        end += 1
    if end == offset and offset < len(text):
        raise ValueError("Page limit is too small for the next Unicode character")
    return text[offset:end], end


class FixtureTools:
    """An allowlisted file boundary; it never exposes a shell or controller files."""
    def __init__(self, root: Path, scenario: Scenario):
        self.root, self.scenario = Path(root).resolve(), scenario
        self.allowed = set(scenario.initial_files) | set(scenario.writable_paths)
        self.calls: list[dict[str, Any]] = []

    def _path(self, relative: Any, *, write: bool = False) -> Path:
        key = _relative(relative)
        if key not in self.allowed or (write and key not in self.scenario.writable_paths):
            raise ValueError("Path is not available for this operation")
        path = self.root / key
        for part in (path, *path.parents):
            if part == self.root:
                break
            if part.is_symlink():
                raise ValueError("Fixture links are not allowed")
        if not path.resolve().is_relative_to(self.root):
            raise ValueError("Path is outside this fixture")
        return path

    def read_artifact(self, path: str) -> str | None:
        target = self._path(path)
        if not target.is_file():
            return None
        if target.stat().st_size > WRITE_BYTES:
            raise ValueError("Fixture file exceeds its byte limit")
        return target.read_text(encoding="utf-8")

    def specs(self) -> list[dict[str, Any]]:
        return [
            {"type": "function", "name": "ReadFixture", "description":
             "Read an allowed fixture file. Character offsets and next_offset support exact bounded paging.",
             "inputSchema": {"type": "object", "properties": {"path": {"type": "string"},
              "offset": {"type": "integer", "minimum": 0}, "limit": {"type": "integer", "minimum": 1,
                                                                            "maximum": READ_BYTES}},
              "required": ["path"], "additionalProperties": False}},
            {"type": "function", "name": "WriteFixture", "description":
             "Write a declared artifact, configuration, or task.md inside this fixture; source inputs are read-only.",
             "inputSchema": {"type": "object", "properties": {"path": {"type": "string"},
              "content": {"type": "string"}}, "required": ["path", "content"], "additionalProperties": False}},
            {"type": "function", "name": "RunFixtureCheck", "description":
             "Run the public deterministic fixture simulation, not the hidden requirements grader.",
             "inputSchema": {"type": "object", "properties": {"check": {"type": "string",
              "enum": ["expiry_preview", "restore_readiness"]}}, "required": ["check"],
              "additionalProperties": False}},
        ]

    def dispatch(self, name: str, args: dict[str, Any]) -> dict[str, Any]:
        try:
            if not isinstance(args, dict):
                raise ValueError("Tool arguments must be an object")
            if name == "ReadFixture":
                if set(args) - {"path", "offset", "limit"}:
                    raise ValueError("Unknown tool argument")
                path = _relative(args.get("path"))
                text = self.read_artifact(path)
                if text is None:
                    raise ValueError("Fixture file does not exist")
                offset, limit = args.get("offset", 0), args.get("limit", READ_BYTES)
                if (not isinstance(offset, int) or isinstance(offset, bool) or not 0 <= offset <= len(text)
                    or not isinstance(limit, int) or isinstance(limit, bool) or not 1 <= limit <= READ_BYTES):
                    raise ValueError("Invalid page bounds")
                body, end = _page(text, offset, limit)
                result = {"ok": True, "path": path, "text": body, "offset": offset, "end_offset": end,
                          "next_offset": end if end < len(text) else None, "eof": end == len(text),
                          "total_characters": len(text), "text_utf8_bytes": len(body.encode("utf-8"))}
                # JSON escaping can cost more than the decoded text. Tighten the page until the
                # complete transport-visible response fits, preserving a truthful next offset.
                while len(json.dumps(result, ensure_ascii=False).encode("utf-8")) > RESPONSE_BYTES and body:
                    body = body[:len(body) // 2]
                    end = offset + len(body)
                    result.update(text=body, end_offset=end, next_offset=end if end < len(text) else None,
                                  eof=end == len(text), text_utf8_bytes=len(body.encode("utf-8")))
            elif name == "WriteFixture":
                if set(args) != {"path", "content"} or not isinstance(args["content"], str):
                    raise ValueError("WriteFixture requires path and text content")
                content = args["content"]
                if len(content.encode("utf-8")) > WRITE_BYTES:
                    raise ValueError("Write exceeds fixture byte limit")
                path = self._path(args["path"], write=True)
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text(content, encoding="utf-8", newline="")
                result = {"ok": True, "path": args["path"], "utf8_bytes": len(content.encode("utf-8"))}
            elif name == "RunFixtureCheck":
                if set(args) != {"check"}:
                    raise ValueError("RunFixtureCheck requires check")
                result = self._simulate(args["check"])
            else:
                raise ValueError("Unknown fixture tool")
        except (ValueError, TypeError, KeyError, OSError, UnicodeError) as error:
            # Exception bodies from OS/JSON errors can contain hidden paths or huge snippets.
            message = str(error) if type(error) is ValueError else "Fixture operation failed"
            if isinstance(error, json.JSONDecodeError):
                message = "Fixture JSON is invalid"
            result = {"ok": False, "error": message[:180]}
        if len(json.dumps(result, ensure_ascii=False).encode("utf-8")) > RESPONSE_BYTES:
            result = {"ok": False, "error": "Fixture response exceeds its output budget"}
        self.calls.append({"name": name, "args": dict(args) if isinstance(args, dict) else None,
                           "result": result})
        return result

    def _simulate(self, check: str) -> dict[str, Any]:
        if check == "expiry_preview" and self.scenario.id == "requirements_corrections":
            policy = json.loads(self.read_artifact("policy.json") or "null")
            data = json.loads(self.read_artifact("jobs.json") or "null")
            expired = []
            for job in data["jobs"]:
                minutes = policy["hold_minutes"][job["flow"]]
                if not isinstance(minutes, int) or isinstance(minutes, bool) or not 1 <= minutes <= 60:
                    raise ValueError("Hold minutes must be integers from one to sixty")
                deadline = job["created_minute"] + minutes
                if job["status"] in policy["eligible_statuses"] and (
                    deadline <= data["now_minute"] if policy["expire_at_deadline"] else deadline < data["now_minute"]
                ):
                    expired.append(job["id"])
            return {"ok": True, "simulation_only": True,
                    "preview": {"now_minute": data["now_minute"], "expired_ids": sorted(expired)}}
        if check == "restore_readiness" and self.scenario.id == "debugging_evidence":
            config = json.loads(self.read_artifact("restore_config.json") or "null")
            valid_target = config["source_instance"] != config["target_instance"]
            writable = config["verification_profiles"]["default"] == "read_write"
            return {"ok": True, "simulation_only": True, "distinct_target": valid_target,
                    "tls_verify": config["tls_verify"], "write_probe": "passed" if writable and valid_target
                    else "E_WRITE_GUARD", "measured_rto_seconds": None}
        raise ValueError("Check is unavailable in this fixture")


def create_fixture(root: Path, scenario: Scenario) -> FixtureTools:
    root = Path(root)
    if root.is_symlink():
        raise ValueError("Fixture root cannot be a link")
    root.mkdir(parents=True, exist_ok=True)
    tools = FixtureTools(root, scenario)
    # No settings, credentials, grader, answer key or another arm's files are copied.
    for relative, content in scenario.initial_files.items():
        target = tools._path(relative)
        target.parent.mkdir(parents=True, exist_ok=True)
        with target.open("x", encoding="utf-8", newline="") as handle:
            handle.write(content)
    return tools


def reference_artifacts(scenario: Scenario) -> dict[str, str]:
    """Controller-only positive controls. Never expose this function as a task tool."""
    if scenario.id == "requirements_corrections":
        return {
            "policy.json": _json({"hold_minutes": {"web": 10, "kiosk": 7}, "expire_at_deadline": True,
                                  "eligible_statuses": ["held"], "approval_ref": "KIOSK-" + _tag(scenario.seed, "approval")}),
            "artifacts/expiry_preview.json": _json({"now_minute": 112,
                "expired_ids": ["kiosk-edge", "kiosk-old", "web-edge", "web-old"]}),
            "artifacts/inventory_audit.json": _json({"row_count": 16,
                "stock_total": sum((i * 7 + scenario.seed) % 29 for i in range(1, 17))}),
        }
    if scenario.id == "debugging_evidence":
        target, failure = "replacement-" + _tag(scenario.seed, "target"), "probe-" + _tag(scenario.seed, "failure")
        return {
            "restore_config.json": _json({"source_instance": "primary-01", "target_instance": target,
                "tls_verify": True, "verification_profiles": {"default": "read_write", "audit_archive": "read_only"},
                "resume_from": "write_probe", "diagnostic_ref": failure}),
            "artifacts/resume_plan.json": _json({"failed_check": "write_probe", "diagnostic_ref": failure,
                "source_instance": "primary-01", "target_instance": target,
                "retry_checks": ["write_probe", "application_smoke"],
                "already_observed_passed": ["tls_handshake", "repository_verify"], "measured_rto_seconds": None,
                "evidence_status": {"failure": "observed", "repair": "proposed", "recovery_time": "unknown"}}),
            "artifacts/schema_audit.json": _json({"row_count": 12, "amount_minor_total": 1014,
                                                   "duplicate_entry_ids": []}),
        }
    raise ValueError("Unknown scenario")


def _canonical_artifact(path: str, value: dict[str, Any]) -> dict[str, Any]:
    """Normalize only immaterial presentation, never missing evidence or factual values."""
    result = dict(value)
    if path == "artifacts/resume_plan.json":
        statuses = result.get("evidence_status")
        if isinstance(statuses, dict):
            result["evidence_status"] = {key: item.strip().lower() if isinstance(item, str) else item
                                         for key, item in statuses.items()}
        passed = result.get("already_observed_passed")
        if isinstance(passed, list) and all(isinstance(item, str) for item in passed):
            result["already_observed_passed"] = sorted(passed)
    return result


def _contains_required(actual: Any, expected: Any) -> bool:
    """Required fields must match; harmless additional report fields do not lose credit."""
    if isinstance(expected, dict):
        return isinstance(actual, dict) and all(key in actual and _contains_required(actual[key], value)
                                                for key, value in expected.items())
    if isinstance(expected, bool):
        return actual is expected
    return actual == expected


def grade(scenario: Scenario, tools: FixtureTools) -> dict[str, Any]:
    """Grade positive artifacts and critical rules, never the agent's self-reported success."""
    if tools.scenario.id != scenario.id or tools.scenario.seed != scenario.seed:
        raise ValueError("Scenario and fixture do not match")
    checks: dict[str, bool] = {}
    critical: list[str] = []
    expected = {path: _canonical_artifact(path, json.loads(text))
                for path, text in reference_artifacts(scenario).items()}
    actual: dict[str, Any] = {}
    for path in expected:
        try:
            value = json.loads(tools.read_artifact(path) or "null")
        except (ValueError, OSError, UnicodeError):
            value = None
        actual[path] = _canonical_artifact(path, value) if isinstance(value, dict) else {}
        checks[f"artifact:{path}"] = _contains_required(actual[path], expected[path])
    for path, original in scenario.initial_files.items():
        if path not in scenario.writable_paths:
            try:
                unchanged = tools.read_artifact(path) == original
            except (ValueError, OSError, UnicodeError):
                unchanged = False
            checks[f"input_unchanged:{path}"] = unchanged
            if not unchanged:
                critical.append(f"modified_source:{path}")
    if scenario.id == "requirements_corrections":
        policy = actual["policy.json"]
        rules = {
            "latest_correction": policy.get("hold_minutes") == {"web": 10, "kiosk": 7},
            "protected_statuses": policy.get("eligible_statuses") == ["held"],
            "deadline_equality": policy.get("expire_at_deadline") is True,
            "exact_approval": policy.get("approval_ref") == expected["policy.json"]["approval_ref"],
        }
    else:
        config, plan = actual["restore_config.json"], actual["artifacts/resume_plan.json"]
        profiles = config.get("verification_profiles")
        rules = {
            "tls_preserved": config.get("tls_verify") is True,
            "source_preserved": config.get("source_instance") == "primary-01",
            "archive_exception": isinstance(profiles, dict) and profiles.get("audit_archive") == "read_only",
            "correct_target": config.get("target_instance") == expected["restore_config.json"]["target_instance"],
            "no_repeated_investigation": config.get("resume_from") == "write_probe"
                and plan.get("retry_checks") == ["write_probe", "application_smoke"],
            "unknown_measurement": "measured_rto_seconds" in plan and plan["measured_rto_seconds"] is None,
            "evidence_status": _contains_required(plan.get("evidence_status"),
                                                  expected["artifacts/resume_plan.json"]["evidence_status"]),
        }
    checks.update(rules)
    critical.extend(name for name, passed in rules.items() if not passed)
    # Successful task work is the three generated artifacts. Unchanged input checks cannot
    # inflate a no-op baseline's score, and critical failures override any aggregate score.
    positives = [checks[f"artifact:{path}"] for path in expected]
    return {"scenario_id": scenario.id, "score": round(100 * sum(positives) / len(positives), 3),
            "checks": checks, "critical_failures": critical,
            "complete_task": all(positives) and not critical,
            "positive_artifacts_passed": sum(positives), "positive_artifacts_required": len(positives)}
