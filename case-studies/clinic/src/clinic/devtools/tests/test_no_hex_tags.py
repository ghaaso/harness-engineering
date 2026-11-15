"""Random labels in test data are letters only (FC-09).

A tag cut from a UUID's hex digits (``uuid.uuid4().hex[:6]``) holds chance runs of digits, and
tests that search pages, messages and exports for a digit string (a hidden figure, a balance)
failed now and then because of them (6 November 2026, three sessions). ``random_tag`` returns
lowercase letters only. This test fails if a ``testing.py`` helper, a conftest or a test builds a
label from hex digits again.
"""

from __future__ import annotations

import re
from pathlib import Path

from clinic.operations.testing import random_tag, without_identifiers

SRC = Path(__file__).resolve().parents[3]
# Built from pieces so that this file does not match itself.
FORBIDDEN = re.compile(
    r"\.hex\b"  # uuid4().hex, bytes.hex(): any use, sliced or not
    r"|token\s*_hex"
    r"|urandom\("
    r"|str\(\s*uuid[\w.]*\(\)\s*\)\s*\["  # str(uuid.uuid4())[:6]
    r"|uuid\w*\.\w*\(\)\.int\b"
    r"|\.hexdigest\(\)\s*\["  # a digest cut short into a label
    r"|uuid\w*\.uuid\d\(\)\}\"\s*\["  # f"{uuid.uuid4()}"[:6]
    r"|token_urlsafe|token_bytes"
    r"|\brandint\b|\brandrange\b|\brandom\.(?:choice|random|sample|choices)\b"
)
# A full hex digest is not a label: the one place a test needs 64 hex digits (a SHA-256 value).
ALLOWED = (
    "source_sha256=uuid.uuid4().hex * 2",
    "usedforsecurity=False).hexdigest()[:6]",  # the checkout hash the database-name test mirrors
    '"SYN-" + secrets.token_urlsafe(16)',  # the shared test password, never shown on a page
)
# Whole files that use random secret keys on purpose (settings must refuse them; no label).
ALLOWED_FILES = ("settings/tests/test_production_fail_closed.py",)
# The helpers that build most labels: the scan must reach every one of them (FC-15).
HELPERS = (
    "clinic/operations/testing.py",
    "clinic/finance/testing.py",
    "clinic/finance/supplier_testing.py",
    "clinic/imports/testing.py",
    "clinic/people/testing.py",
    "clinic/reporting/testing.py",
    "clinic/identity/testing.py",
    "conftest.py",
)


def _sources() -> list[Path]:
    return sorted(
        path
        for path in SRC.rglob("*.py")
        if "__pycache__" not in path.parts
        and "migrations" not in path.parts
        and (path.name.startswith(("test_", "conftest")) or "testing" in path.name)
        and path != Path(__file__).resolve()
    )


def test_no_test_helper_or_test_builds_a_label_from_hex_digits() -> None:
    offenders = []
    for path in _sources():
        for number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
            if FORBIDDEN.search(line) and not any(ok in line for ok in ALLOWED):
                if path.relative_to(SRC).as_posix().endswith(ALLOWED_FILES):
                    continue
                offenders.append(f"{path.relative_to(SRC).as_posix()}:{number}: {line.strip()}")
    assert not offenders, (
        "A random label cut from hex digits holds chance digit runs that make tests searching "
        "for a digit string fail now and then. Build names, codes, references, labels and "
        "usernames with clinic.operations.testing.random_tag() (letters only), and strip real "
        "UUIDs with without_identifiers() before searching text for a figure:\n"
        + "\n".join(offenders)
    )


def test_the_guard_would_see_the_old_pattern() -> None:
    old = 'reference=f"SYN-BB-{uuid.uuid4().hex[:8]}"'
    assert FORBIDDEN.search(old)
    for form in (
        "tag = secrets.token" + "_hex(3)",
        "tag = secrets.token" + "_hex (3)",
        "name = os.urandom(3).hex()[:6]",
        "tag = str(uuid.uuid4())[:8]",
        'label = f"SYN-{uuid.uuid4().hex}"',
        "short = uuid.uuid4().int",
    ):
        assert FORBIDDEN.search(form), form
    assert not FORBIDDEN.search('tag = "".join(secrets.choice(string.ascii_lowercase))')


def test_a_random_tag_is_letters_only_and_the_requested_length() -> None:
    tags = {random_tag(6) for _ in range(500)}
    assert len(tags) > 490  # random, not constant
    assert all(len(tag) == 6 and tag.isalpha() and tag.islower() and tag.isascii() for tag in tags)
    assert len(random_tag(8)) == 8 and not any(c.isdigit() for c in random_tag(50))


def test_without_identifiers_removes_identifiers_and_never_a_figure() -> None:
    uuid_text = "31b79923-2eb8-486b-b765-8e9f9852a4ae"
    digest = "a" * 64
    csrf = '<input type="hidden" name="csrfmiddlewaretoken" value="654300abcDEF">'
    page = f"/history/{uuid_text}/ {csrf} sha {digest} 654300 and 1,234.56 and -500"
    shown = without_identifiers(page)
    assert "654300abc" not in shown and uuid_text not in shown and digest not in shown
    # the figures stay: a hidden amount shown as a figure must still be found
    assert "654300" in shown and "1,234.56" in shown and "-500" in shown
    assert "654300" in without_identifiers("balance 654300")


def test_without_identifiers_leaves_digits_glued_to_a_hex_run_alone() -> None:
    glued = "a" * 32 + "7654300"
    assert without_identifiers(f"reference {glued}") == f"reference {glued}"
    assert "654300" in without_identifiers("abcdefabcdefabcdefabcdefabc654300")
    assert without_identifiers("id " + "a" * 32 + " end") == "id   end"
    assert "31337" in without_identifiers("balance 31337, sha " + "b" * 64 + " 31337")


def test_the_scan_reaches_every_helper_that_builds_labels() -> None:
    scanned = {path.relative_to(SRC).as_posix() for path in _sources()}
    missing = [helper for helper in HELPERS if helper not in scanned]
    assert not missing, f"the hex-tag scan no longer reaches {missing}: did the source root move?"
    assert len(scanned) > 100


def test_the_guard_sees_digest_slices_uuid_slices_and_other_random_sources() -> None:
    for form in (
        "tag = hashlib.sha1(x).hexdigest()[:6]",
        'tag = f"{uuid.uuid4()}"[:6]',
        "tag = secrets.token_urlsafe(6)",
        "tag = secrets.token_bytes(3)",
        "tag = random.randint(100000, 999999)",
        "tag = random.choice(letters)",
    ):
        assert FORBIDDEN.search(form), form
