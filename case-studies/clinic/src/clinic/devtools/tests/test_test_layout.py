"""The test collection convention (gate finding G00-05; docs/application/conventions.md).

pytest collects only ``test_*.py``; a module named ``tests.py`` or ``check_*.py`` would hold
tests that never run while the check reports success. This guard makes such a file fail.
"""

import tomllib
from pathlib import Path

SRC = Path(__file__).resolve().parents[3]
REPO_ROOT = SRC.parent
ALLOWED_IN_TESTS = {"__init__.py", "conftest.py"}


def layout_problems(src: Path) -> list[str]:
    problems: list[str] = []
    for path in sorted(src.rglob("*.py")):
        if "__pycache__" in path.parts:
            continue
        relative = path.relative_to(src).as_posix()
        if path.name == "tests.py":
            problems.append(f"{relative}: tests.py is never collected; use tests/test_*.py")
        elif path.parent.name == "tests" and not (
            path.name in ALLOWED_IN_TESTS or path.name.startswith("test_")
        ):
            problems.append(f"{relative}: modules in tests/ must be test_*.py or conftest.py")
        elif path.name.startswith("test_") and path.parent.name != "tests":
            problems.append(f"{relative}: test modules live in a tests/ package")
    return problems


def test_source_tree_follows_the_collection_convention() -> None:
    assert layout_problems(SRC) == []


def test_layout_guard_catches_uncollected_modules(scratch_dir: Path) -> None:
    app = scratch_dir / "clinic" / "sample"
    (app / "tests").mkdir(parents=True)
    for name in ("tests.py", "tests/__init__.py", "tests/test_ok.py", "tests/check_rules.py"):
        (app / name).write_text("")
    (app / "test_outside.py").write_text("")
    problems = layout_problems(scratch_dir)
    assert len(problems) == 3, problems
    assert any("tests.py is never collected" in problem for problem in problems)
    assert any("check_rules.py" in problem for problem in problems)
    assert any("test_outside.py" in problem for problem in problems)


def test_pytest_configuration_pins_the_collection_rules() -> None:
    config = tomllib.loads((REPO_ROOT / "pyproject.toml").read_text(encoding="utf-8"))
    options = config["tool"]["pytest"]["ini_options"]
    assert options["python_files"] == ["test_*.py"]
    assert options["testpaths"] == ["src"]
    assert options["xfail_strict"] is True
    assert "--strict-markers" in options["addopts"]


FORBIDDEN_COLLECTION_HOOKS = (
    "collect_ignore",
    "pytest_ignore_collect",
    "pytest_collection_modifyitems",
)


def test_no_conftest_or_plugin_can_drop_tests_silently() -> None:
    """The check counts removed tests, but a hook that drops N and adds N placeholders, or a
    file ignored before collection, is invisible to it; so the hooks are simply not used
    (gate finding G01-14). Test modules that write throwaway conftests as strings are exempt."""
    offenders = []
    for path in sorted(SRC.rglob("*.py")):
        if "__pycache__" in path.parts or path.name.startswith("test_"):
            continue
        text = path.read_text(encoding="utf-8")
        offenders += [
            f"{path.relative_to(SRC).as_posix()}: {hook}"
            for hook in FORBIDDEN_COLLECTION_HOOKS
            if hook in text and path.name != "pytest_outcomes.py"
        ]
    assert offenders == []
