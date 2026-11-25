#!/usr/bin/env python3
"""Check Claude Code agent and skill files: frontmatter, pinned model, short tool list.

Record-only by default (always exits 0). With --enforce, exits 1 on any error-level finding.
Stdlib only; reads the simple `---` frontmatter these files use without PyYAML.
"""
import argparse
import json
import sys
from pathlib import Path

# Rule id -> what it checks. Every finding carries one of these ids.
RULES = {
    "FM1": "frontmatter present and parseable (opens and closes with ---)",
    "FM2": "required keys name and description present and non-empty; name matches file/folder",
    "AG1": "agent pins a model (missing or 'inherit' is a finding)",
    "AG2": "agent has an explicit tools list with at most --max-tools entries",
    "AG3": "every agent skills: entry exists as .claude/skills/<name>/SKILL.md",
    "SK1": "skill description is at most 1024 characters (warn above 1000)",
}
# Widest real agent in this repo has 7 (4 read tools + ToolSearch, WebFetch, WebSearch);
# an 8th tool would be a write or spawn tool, which is what this cap should catch.
DEFAULT_MAX_TOOLS = 7
SKILL_DESCRIPTION_CAP = 1024
SKILL_DESCRIPTION_WARN = 1000  # under 24 chars of headroom: the next small edit can break the cap


def unquote(value):
    if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
        inner = value[1:-1]
        return inner.replace("''", "'") if value[0] == "'" else inner.replace('\\"', '"')
    return value


def parse_frontmatter(text):
    """Return (dict, None) or (None, reason). Handles key: value, quoted values,
    [flow, lists], '- item' lists and > / | block scalars. Not a full YAML parser."""
    lines = text.splitlines()
    if not lines or lines[0].strip() != "---":
        return None, "file does not start with ---"
    end = next((i for i in range(1, len(lines)) if lines[i].strip() == "---"), None)
    if end is None:
        return None, "frontmatter is never closed with ---"
    data, key, block = {}, None, None  # block = (style, lines) while inside a > or | scalar

    def close_block():
        if block is not None:
            data[key] = ("\n" if block[0] == "|" else " ").join(block[1]).strip()

    for raw in lines[1:end]:
        stripped = raw.strip()
        indented = raw[:1] in (" ", "\t")
        if block is not None:
            if indented or not stripped:
                block[1].append(stripped)
                continue
            close_block()
            block = None
        if not stripped or stripped.startswith("#"):
            continue
        if stripped.startswith("- ") and key is not None and data[key] in ("", []):
            data[key] = []
        if stripped.startswith("- ") and isinstance(data.get(key), list):
            data[key].append(unquote(stripped[2:].strip()))
            continue
        if indented:
            if key is None or not isinstance(data[key], str):
                return None, "unexpected indented line: %r" % stripped[:60]
            data[key] = (data[key] + " " + stripped).strip()  # plain multi-line scalar
            continue
        name, sep, value = raw.partition(":")
        if not sep or not name.strip() or " " in name.strip():
            return None, "line is not 'key: value': %r" % stripped[:60]
        key, value = name.strip(), value.strip()
        if value[:1] in (">", "|"):
            block, data[key] = (value[0], []), ""
        elif value.startswith("[") and value.endswith("]"):
            data[key] = [unquote(x.strip()) for x in value[1:-1].split(",") if x.strip()]
        else:
            data[key] = unquote(value)
    close_block()
    return data, None


def as_list(value):
    if isinstance(value, list):
        return value
    return [x.strip() for x in str(value).split(",") if x.strip()]


def check_file(path, kind, root, max_tools):
    """Return a list of findings (dicts) for one agent or skill file."""
    rel = path.relative_to(root).as_posix()
    expected_name = path.stem if kind == "agent" else path.parent.name
    out = []

    def add(rule, severity, message):
        out.append({"path": rel, "rule": rule, "severity": severity, "message": message})

    fm, reason = parse_frontmatter(path.read_text(encoding="utf-8", errors="replace"))
    if fm is None:
        add("FM1", "error", reason)
        return out
    for required in ("name", "description"):
        if not str(fm.get(required) or "").strip():
            add("FM2", "error", "missing or empty '%s'" % required)
    name = str(fm.get("name") or "").strip()
    if name and name != expected_name:
        add("FM2", "warn", "name %r does not match %r" % (name, expected_name))

    if kind == "agent":
        model = str(fm.get("model") or "").strip()
        if not model or model == "inherit":
            add("AG1", "error", "model is %s; pin opus, sonnet, haiku or a model id"
                % ("'inherit'" if model else "missing"))
        if "tools" not in fm or not as_list(fm["tools"]):
            add("AG2", "error", "no explicit tools list (agent inherits every tool)")
        elif len(as_list(fm["tools"])) > max_tools:
            add("AG2", "error", "%d tools, max is %d" % (len(as_list(fm["tools"])), max_tools))
        for skill in as_list(fm.get("skills") or []):
            if not (root / ".claude" / "skills" / skill / "SKILL.md").is_file():
                add("AG3", "error", "skills entry %r has no .claude/skills/%s/SKILL.md" % (skill, skill))
    else:
        length = len(str(fm.get("description") or ""))
        if length > SKILL_DESCRIPTION_CAP:
            add("SK1", "error", "description is %d chars, cap is %d" % (length, SKILL_DESCRIPTION_CAP))
        elif length > SKILL_DESCRIPTION_WARN:
            add("SK1", "warn", "description is %d chars, only %d left before the %d cap"
                % (length, SKILL_DESCRIPTION_CAP - length, SKILL_DESCRIPTION_CAP))
    return out


def run(root_arg, max_tools):
    root = Path(root_arg).resolve()
    agents = sorted((root / ".claude" / "agents").glob("*.md"))
    skills = sorted((root / ".claude" / "skills").glob("*/SKILL.md"))
    findings = []
    for path in agents:
        findings += check_file(path, "agent", root, max_tools)
    for path in skills:
        findings += check_file(path, "skill", root, max_tools)
    return {
        "root": str(root_arg),  # as given, so reports carry no local absolute path
        "max_tools": max_tools,
        "scanned": {"agents": len(agents), "skills": len(skills)},
        "rules": RULES,
        "counts": {rule: sum(f["rule"] == rule for f in findings) for rule in RULES},
        "errors": sum(f["severity"] == "error" for f in findings),
        "warnings": sum(f["severity"] == "warn" for f in findings),
        "findings": findings,
    }


def render(report, enforce):
    rows = [("SEV", "RULE", "PATH", "MESSAGE")]
    rows += [(f["severity"], f["rule"], f["path"], f["message"]) for f in report["findings"]]
    width = max(len(r[2]) for r in rows)
    lines = ["%-5s  %-4s  %-*s  %s" % (r[0], r[1], width, r[2], r[3]) for r in rows]
    if not report["findings"]:
        lines.append("(no findings)")
    lines += [
        "",
        "Scanned %(agents)d agents and %(skills)d skills under .claude/" % report["scanned"],
        "Findings: %d errors, %d warnings (max tools %d)"
        % (report["errors"], report["warnings"], report["max_tools"]),
        "By rule: " + "  ".join("%s=%d" % kv for kv in report["counts"].items()),
        "Mode: " + ("enforce (exit 1 on any error)" if enforce else "record-only (always exit 0)"),
    ]
    return "\n".join(lines)


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--root", default=".", help="repo root that holds .claude/ (default: .)")
    parser.add_argument("--enforce", action="store_true", help="exit 1 if any error-level finding")
    parser.add_argument("--max-tools", type=int, default=DEFAULT_MAX_TOOLS,
                        help="most tools an agent may list (default: %d)" % DEFAULT_MAX_TOOLS)
    parser.add_argument("--json", metavar="OUT", help="also write the report as JSON to OUT")
    args = parser.parse_args(argv)
    report = run(args.root, args.max_tools)
    print(render(report, args.enforce))
    if args.json:
        Path(args.json).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    return 1 if args.enforce and report["errors"] else 0


if __name__ == "__main__":
    sys.exit(main())
