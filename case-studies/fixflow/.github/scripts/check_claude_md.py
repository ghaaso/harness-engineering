#!/usr/bin/env python3
"""Keep CLAUDE.md honest: the Alembic head it states, and the paths it names.

Run from the repo root:  python .github/scripts/check_claude_md.py

Hard failures (exit 1):
  * a head number in CLAUDE.md differs from the true head of the down_revision chain
  * more than one head exists
  * backend/app/core/railway.py or core/sentry_api.py exist (CLAUDE.md says they must not)
Soft (GitHub ::warning::, exit 0):
  * a backticked path in CLAUDE.md that resolves nowhere and is not in the allow-list
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CLAUDE_MD = ROOT / "CLAUDE.md"
VERSIONS = ROOT / "backend" / "alembic" / "versions"
ALLOWLIST = ROOT / ".github" / "claude-md-paths-allowlist.txt"
BASES = [
    "",
    "src",
    "technician-app",
    "technician-app/src",
    "backend",
    "backend/app",
    "backend/app/features",
]
EXTS = (".py", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".json", ".md", ".yml", ".toml", ".txt")
MUST_NOT_EXIST = ["core/railway.py", "core/sentry_api.py"]

REV_RE = re.compile(r"""^revision\s*(?::[^=]+)?=\s*["']([^"']+)["']""", re.M)
DOWN_RE = re.compile(r"^down_revision\s*(?::[^=]+)?=\s*(.+)$", re.M)


def true_head() -> str:
    revisions: set[str] = set()
    parents: set[str] = set()
    for f in sorted(VERSIONS.glob("*.py")):
        text = f.read_text(encoding="utf-8")
        m = REV_RE.search(text)
        if not m:
            continue
        revisions.add(m.group(1))
        d = DOWN_RE.search(text)
        if d:
            parents.update(re.findall(r"""["']([^"']+)["']""", d.group(1)))
    heads = sorted(revisions - parents)
    if len(heads) != 1:
        sys.exit(f"::error::expected exactly one Alembic head, found {heads}")
    return heads[0]


def claimed_heads(text: str) -> list[str]:
    found = re.findall(r"head\s*=\s*\*\*(\d+)\*\*", text)
    found += re.findall(r"Head is \*\*(\d+)\*\*", text)
    return found


def load_allowlist() -> set[str]:
    if not ALLOWLIST.exists():
        return set()
    out = set()
    for line in ALLOWLIST.read_text(encoding="utf-8").splitlines():
        line = line.split("#", 1)[0].strip()
        if line:
            out.add(line)
    return out


def resolves(path: str) -> bool:
    return any((ROOT / base / path).exists() for base in BASES)


def main() -> int:
    text = CLAUDE_MD.read_text(encoding="utf-8")
    failed = False

    head = true_head()
    claims = claimed_heads(text)
    if not claims:
        print("::error::CLAUDE.md states no Alembic head (expected 'head = **NNNN**')")
        failed = True
    for c in claims:
        if c != head:
            print(f"::error file=CLAUDE.md::CLAUDE.md says Alembic head {c}; the chain head is {head}")
            failed = True
    print(f"alembic head (chain) = {head}; CLAUDE.md mentions = {claims}")

    for rel in MUST_NOT_EXIST:
        if (ROOT / "backend" / "app" / rel).exists():
            print(f"::error::backend/app/{rel} exists, but CLAUDE.md says it must not (BFF holds those tokens)")
            failed = True

    allow = load_allowlist()
    paths = sorted(set(re.findall(r"`([A-Za-z0-9_./-]+)`", text)))
    checked = unresolved = 0
    for p in paths:
        if not (p.endswith(EXTS) or p.endswith("/")):
            continue
        checked += 1
        if resolves(p.rstrip("/")) or p in allow:
            continue
        unresolved += 1
        print(f"::warning file=CLAUDE.md::path `{p}` does not resolve and is not in {ALLOWLIST.name}")
    print(f"paths checked = {checked}; unresolved (not allow-listed) = {unresolved}")

    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
