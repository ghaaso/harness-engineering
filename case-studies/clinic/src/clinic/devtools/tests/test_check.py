"""The check command's test-step judgement: skips, xfails, xpasses, deselection and empty or
partial runs fail (not RT-01), and its child processes run in a controlled environment."""

import os
import subprocess
import sys
import time
from collections.abc import Sequence
from pathlib import Path

import pytest

from clinic.devtools import spawn
from clinic.devtools.check import (
    DIST_MODE,
    CheckConfigError,
    Outcomes,
    PassResult,
    _pytest_step,
    _read_worker_statuses,
    _wait_for_progress,
    combine,
    controlled_env,
    judge_split,
    judge_tests,
    judge_workers,
    read_stall_seconds,
    read_workers,
)
from clinic.devtools.pytest_outcomes import HEARTBEAT_ENV, OUTPUT_ENV
from clinic.devtools.spawn import run_child

CLEAN = Outcomes(collected=5, finished=5, passed=5)


@pytest.mark.parametrize(
    ("outcomes", "exit_code", "fragment"),
    [
        (Outcomes(), 5, "no tests were collected"),
        (Outcomes(collected=3, finished=3, skipped=3), 0, "skipped"),
        (Outcomes(collected=3, finished=3, passed=2, xfailed=1), 0, "xfailed"),
        (Outcomes(collected=3, finished=3, passed=2, xpassed=1), 0, "xpassed"),
        (Outcomes(collected=3, finished=3, passed=3, deselected=24), 0, "deselected"),
        (Outcomes(collected=3, finished=2, passed=2), 0, "did not run"),
        (Outcomes(collected=3, finished=3, passed=2, failed=1), 1, "failure"),
        (Outcomes(collected=3, finished=3, passed=2, errors=1), 1, "error"),
        (Outcomes(collected=3, finished=3, passed=3, collection_errors=1), 2, "collection error"),
        (CLEAN, 2, "exited with status 2"),
    ],
)
def test_bad_runs_fail(outcomes: Outcomes, exit_code: int, fragment: str) -> None:
    problems = judge_tests(outcomes, exit_code)
    assert any(fragment in problem for problem in problems), problems


def test_silent_removal_is_a_problem() -> None:
    problems = judge_tests(Outcomes(collected=2, finished=2, passed=2, removed=1), 0)
    assert any("removed" in problem for problem in problems)


def test_database_probe_reports_an_unknown_alias_without_masking_it() -> None:
    from clinic.devtools.check import check_database

    problems = check_database(("no-such-alias",))
    assert len(problems) == 1
    assert problems[0].startswith("no-such-alias: cannot connect")


def test_clean_run_passes() -> None:
    assert judge_tests(CLEAN, 0) == []


def test_controlled_env_removes_injection_variables(monkeypatch: pytest.MonkeyPatch) -> None:
    for key in ("PYTEST_PLUGINS", "PYTEST_ADDOPTS", "PYTHONSTARTUP", "PYTHONHOME"):
        monkeypatch.setenv(key, "injected")
    monkeypatch.setenv("PYTHONPATH", "C:/somewhere/else")
    monkeypatch.setenv("DJANGO_SETTINGS_MODULE", "clinic.settings.dev")
    monkeypatch.setenv("CLINIC_DB_PORT", "55432")
    env = controlled_env()
    for key in ("PYTEST_PLUGINS", "PYTEST_ADDOPTS", "PYTHONSTARTUP", "PYTHONHOME"):
        assert key not in env
    assert env["PYTHONPATH"].endswith("src")
    assert env["DJANGO_SETTINGS_MODULE"] == "clinic.settings.test"
    assert env["PYTEST_DISABLE_PLUGIN_AUTOLOAD"] == "1"
    assert env["PYTHONNOUSERSITE"] == "1"
    assert env["CLINIC_DB_PORT"] == "55432"


def _run_isolated_pytest(
    scratch_dir: Path,
    body: str,
    *,
    conftest: str = "",
    ini: str = "xfail_strict = true\n",
    raw_env: dict[str, str] | None = None,
    extra_args: Sequence[str] = (),
) -> tuple[Outcomes, int]:
    """Run a real pytest, as the check does, on a throwaway project; return what it recorded."""
    (scratch_dir / "pytest.ini").write_text("[pytest]\n" + ini)
    (scratch_dir / "test_sample.py").write_text(body)
    if conftest:
        (scratch_dir / "conftest.py").write_text(conftest)
    record = scratch_dir / "outcomes.json"
    base = controlled_env() if raw_env is None else raw_env
    env = base | {OUTPUT_ENV: str(record), HEARTBEAT_ENV: ""}
    result = run_child(
        [sys.executable, "-m", "pytest", "-p", "no:cacheprovider",
         "-p", "clinic.devtools.pytest_outcomes", f"--rootdir={scratch_dir}",
         "-c", str(scratch_dir / "pytest.ini"), f"--basetemp={scratch_dir / 'basetemp'}",
         *extra_args, str(scratch_dir)],
        cwd=scratch_dir, env=env,
        capture_output=True, timeout=120,
    )  # fmt: skip
    return Outcomes.read(record), result.returncode


def test_real_run_that_only_skips_fails(scratch_dir: Path) -> None:
    body = "import pytest\n\n@pytest.mark.skip(reason='x')\ndef test_a():\n    pass\n"
    outcomes, exit_code = _run_isolated_pytest(scratch_dir, body)
    assert exit_code == 0  # pytest itself calls this a success
    assert outcomes.skipped == 1
    assert judge_tests(outcomes, exit_code) != []


def test_real_xfail_fails(scratch_dir: Path) -> None:
    body = "import pytest\n\n@pytest.mark.xfail(reason='x')\ndef test_a():\n    assert False\n"
    outcomes, exit_code = _run_isolated_pytest(scratch_dir, body)
    assert exit_code == 0
    assert outcomes.xfailed == 1
    assert judge_tests(outcomes, exit_code) != []


def test_real_non_strict_xpass_fails(scratch_dir: Path) -> None:
    # strict=False overrides xfail_strict; pytest's junit report would count this as a pass.
    body = (
        "import pytest\n\n@pytest.mark.xfail(strict=False, reason='x')\ndef test_a():\n    pass\n"
    )
    outcomes, exit_code = _run_isolated_pytest(scratch_dir, body)
    assert exit_code == 0
    assert outcomes.xpassed == 1
    assert judge_tests(outcomes, exit_code) != []


def test_real_deselection_by_a_plugin_fails(scratch_dir: Path) -> None:
    conftest = (
        "def pytest_collection_modifyitems(config, items):\n"
        "    dropped = [item for item in items if item.name == 'test_b']\n"
        "    items[:] = [item for item in items if item.name != 'test_b']\n"
        "    config.hook.pytest_deselected(items=dropped)\n"
    )
    body = "def test_a():\n    pass\n\ndef test_b():\n    pass\n"
    outcomes, exit_code = _run_isolated_pytest(scratch_dir, body, conftest=conftest)
    assert (outcomes.passed, outcomes.deselected) == (1, 1)
    assert judge_tests(outcomes, exit_code) != []


def test_real_silent_removal_by_a_conftest_fails(scratch_dir: Path) -> None:
    # Dropping items without announcing them as deselected must not look like a smaller suite.
    conftest = (
        "def pytest_collection_modifyitems(config, items):\n"
        "    items[:] = [item for item in items if item.name != 'test_b']\n"
    )
    body = "def test_a():\n    pass\n\ndef test_b():\n    pass\n"
    outcomes, exit_code = _run_isolated_pytest(scratch_dir, body, conftest=conftest)
    assert (outcomes.passed, outcomes.deselected, outcomes.removed) == (1, 0, 1)
    assert any("removed" in problem for problem in judge_tests(outcomes, exit_code))


def test_real_collection_error_fails(scratch_dir: Path) -> None:
    outcomes, exit_code = _run_isolated_pytest(scratch_dir, "def test_a(:\n    pass\n")
    assert outcomes.collection_errors == 1
    assert judge_tests(outcomes, exit_code) != []


def test_inherited_pytest_plugins_cannot_reach_the_run(
    scratch_dir: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    # A plugin that would deselect everything, offered through the inherited environment.
    (scratch_dir / "evil_plugin.py").write_text(
        "def pytest_collection_modifyitems(config, items):\n"
        "    config.hook.pytest_deselected(items=list(items))\n"
        "    items[:] = []\n"
    )
    monkeypatch.setenv("PYTEST_PLUGINS", "evil_plugin")
    monkeypatch.setenv("PYTHONPATH", str(scratch_dir))
    src = Path(__file__).resolve().parents[3]
    raw = dict(os.environ) | {"PYTHONPATH": os.pathsep.join([str(scratch_dir), str(src)])}
    uncontrolled = scratch_dir / "uncontrolled"
    uncontrolled.mkdir()
    before, _ = _run_isolated_pytest(uncontrolled, "def test_a():\n    pass\n", raw_env=raw)
    assert (before.passed, before.deselected) == (0, 1)  # the injection works when uncontrolled

    project = scratch_dir / "project"
    project.mkdir()
    outcomes, exit_code = _run_isolated_pytest(project, "def test_a():\n    pass\n")
    assert (outcomes.passed, outcomes.deselected) == (1, 0)
    assert judge_tests(outcomes, exit_code) == []


def test_real_passing_run_passes(scratch_dir: Path) -> None:
    outcomes, exit_code = _run_isolated_pytest(
        scratch_dir, "def test_a():\n    assert 1 + 1 == 2\n"
    )
    assert judge_tests(outcomes, exit_code) == []


def test_spawn_retry_covers_only_refused_launches(monkeypatch: pytest.MonkeyPatch) -> None:
    calls: list[int] = []

    def refuse_then_run(*args: object, **kwargs: object) -> subprocess.CompletedProcess[str]:
        calls.append(1)
        if len(calls) < 3:
            raise PermissionError(13, "Access is denied")
        return subprocess.CompletedProcess(["x"], 7, "", "")

    monkeypatch.setattr(subprocess, "run", refuse_then_run)
    monkeypatch.setattr(time, "sleep", lambda _: None)
    assert spawn.run_child(["x"]).returncode == 7  # the child's own result, unchanged
    assert len(calls) == 3

    def always_refuse(*args: object, **kwargs: object) -> subprocess.CompletedProcess[str]:
        raise PermissionError(13, "Access is denied")

    monkeypatch.setattr(subprocess, "run", always_refuse)
    with pytest.raises(PermissionError):
        spawn.run_child(["x"])


def test_check_refuses_arguments() -> None:
    from clinic.devtools.check import main

    assert main(["-k", "something"]) == 2


def test_environment_is_not_mutated_by_controlled_env() -> None:
    before = dict(os.environ)
    controlled_env({"X_CLINIC_PROBE": "1"})
    assert dict(os.environ) == before


# --- the two-pass, parallel test step -------------------------------------------------------


def _ids(*names: str) -> tuple[str, ...]:
    return tuple(f"src/m.py::{name}" for name in names)


def _pass(collected: tuple[str, ...], **kwargs: object) -> Outcomes:
    return Outcomes(
        collected=len(collected),
        finished=len(collected),
        passed=len(collected),
        collected_ids=collected,
        finished_ids=collected,
        **kwargs,  # type: ignore[arg-type]
    )


def test_a_clean_split_passes() -> None:
    first = _pass(_ids("a", "b"), distributed=1)
    second = _pass(_ids("c"), deselected=2, deselected_ids=_ids("a", "b"))
    assert judge_split(first, second) == []
    assert judge_tests(first, 0) == []
    assert judge_tests(second, 0, allowed_deselected=2) == []
    total = combine(first, second)
    assert (total.collected, total.finished, total.passed, total.deselected) == (3, 3, 3, 0)


def test_a_test_in_both_passes_or_in_neither_is_a_problem() -> None:
    both = judge_split(
        _pass(_ids("a", "b"), distributed=1),
        _pass(_ids("b", "c"), deselected=2, deselected_ids=_ids("a", "b")),
    )
    assert any("both passes" in problem for problem in both)
    neither = judge_split(
        _pass(_ids("a"), distributed=1),
        _pass(_ids("c"), deselected=2, deselected_ids=_ids("a", "b")),
    )
    assert any("neither pass" in problem for problem in neither)
    extra = judge_split(
        _pass(_ids("a", "z"), distributed=1),
        _pass(_ids("c"), deselected=1, deselected_ids=_ids("a")),
    )
    assert any("parallel pass only" in problem for problem in extra)


def test_an_unexplained_deselection_survives_the_totals() -> None:
    first = _pass(_ids("a"), distributed=1)
    second = _pass(_ids("c"), deselected=3, deselected_ids=_ids("a", "x", "y"))
    assert combine(first, second).deselected == 2
    assert judge_tests(second, 0, allowed_deselected=1) != []


def test_a_test_collected_twice_or_without_a_result_is_a_problem() -> None:
    twice = Outcomes(
        collected=2, finished=2, passed=2, collected_ids=_ids("a", "a"), finished_ids=_ids("a")
    )
    assert any("more than once" in problem for problem in judge_tests(twice, 0))
    silent = Outcomes(
        collected=2, finished=2, passed=2, collected_ids=_ids("a", "b"), finished_ids=_ids("a", "z")
    )
    problems = judge_tests(silent, 0)
    assert any("no result" in problem for problem in problems)
    assert any("not collected" in problem for problem in problems)


def test_a_crashed_worker_is_a_problem() -> None:
    crashed = Outcomes(collected=5, finished=5, passed=5, worker_crashes=1)
    assert any("crashed" in problem for problem in judge_tests(crashed, 0))


def test_the_worker_count_defaults_and_refuses_nonsense(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(os, "cpu_count", lambda: 24)  # not the machine running this test
    assert read_workers({}) == 6
    assert read_workers({"CLINIC_CHECK_WORKERS": "0"}) == 0
    assert read_workers({"CLINIC_CHECK_WORKERS": " 3 "}) == 3
    for bad in ("-1", "many", "2.5", "33", "٣"):
        with pytest.raises(CheckConfigError):
            read_workers({"CLINIC_CHECK_WORKERS": bad})
    assert read_stall_seconds({}) == 600.0
    with pytest.raises(CheckConfigError):
        read_stall_seconds({"CLINIC_CHECK_STALL_SECONDS": "0"})


XDIST = ("-p", "xdist.plugin", "-n", "2", "--dist", DIST_MODE)  # the mode the check uses


def test_a_real_parallel_run_records_ids_and_passes(scratch_dir: Path) -> None:
    body = "def test_a():\n    pass\n\ndef test_b():\n    pass\n\ndef test_c():\n    pass\n"
    outcomes, exit_code = _run_isolated_pytest(scratch_dir, body, extra_args=XDIST)
    assert outcomes.distributed == 1
    assert (outcomes.collected, outcomes.finished, outcomes.passed) == (3, 3, 3)
    assert len(outcomes.collected_ids) == 3
    assert set(outcomes.collected_ids) == set(outcomes.finished_ids)
    assert judge_tests(outcomes, exit_code) == []


def test_a_real_parallel_run_that_skips_or_fails_fails(scratch_dir: Path) -> None:
    body = (
        "import pytest\n\n@pytest.mark.skip(reason='x')\ndef test_a():\n    pass\n\n"
        "def test_b():\n    assert False\n\n"
        "@pytest.mark.xfail(strict=False, reason='x')\ndef test_c():\n    pass\n"
    )
    outcomes, exit_code = _run_isolated_pytest(scratch_dir, body, extra_args=XDIST)
    assert (outcomes.skipped, outcomes.failed, outcomes.xpassed) == (1, 1, 1)
    problems = judge_tests(outcomes, exit_code)
    assert any("skipped" in p for p in problems) and any("failure" in p for p in problems)
    assert any("xpassed" in p for p in problems)


def test_a_real_parallel_run_with_a_dying_worker_fails(scratch_dir: Path) -> None:
    body = "import os\n\ndef test_a():\n    pass\n\ndef test_dies():\n    os._exit(3)\n"
    outcomes, exit_code = _run_isolated_pytest(scratch_dir, body, extra_args=XDIST)
    assert outcomes.worker_crashes >= 1
    assert outcomes.errors + outcomes.failed >= 1
    assert any("crashed" in problem for problem in judge_tests(outcomes, exit_code))


def test_a_worker_never_writes_the_record(scratch_dir: Path) -> None:
    # Two workers and a controller share one CLINIC_CHECK_OUTCOMES path; only the controller
    # may write it, or a worker's partial counts would replace the controller's totals.
    body = "def test_a():\n    pass\n\ndef test_b():\n    pass\n"
    outcomes, _ = _run_isolated_pytest(scratch_dir, body, extra_args=XDIST)
    assert outcomes.collected == 2 and outcomes.distributed == 1


def test_a_hung_process_is_killed_and_reported(scratch_dir: Path) -> None:
    heartbeat = scratch_dir / "beat"
    heartbeat.write_text("0", encoding="utf-8")
    hung = subprocess.Popen([sys.executable, "-c", "import time; time.sleep(120)"])
    try:
        started = time.monotonic()
        assert _wait_for_progress(hung, heartbeat, 2.0) is True
        assert time.monotonic() - started < 30
        assert hung.poll() is not None
    finally:
        hung.kill()
    quick = subprocess.Popen([sys.executable, "-c", "pass"])
    try:
        assert _wait_for_progress(quick, heartbeat, 60.0) is False
    finally:
        quick.wait()  # on POSIX the exit is observed without reaping: the caller reaps


def test_a_worker_that_ended_badly_after_reporting_is_a_problem() -> None:
    started = Outcomes(collected=4, finished=4, passed=4, distributed=1, workers_started=2)
    assert judge_workers(started, {"gw0": 0, "gw1": 0}) == []
    assert any("no test explains" in p for p in judge_workers(started, {"gw0": 0, "gw1": 1}))
    assert any("no test explains" in p for p in judge_workers(started, {"gw0": 0, "gw1": 3}))
    assert any("expected 2" in p for p in judge_workers(started, {"gw0": 0}))
    failing = Outcomes(
        collected=4, finished=4, passed=3, failed=1, distributed=1, workers_started=2
    )
    assert judge_workers(failing, {"gw0": 0, "gw1": 1}) == []
    assert judge_workers(Outcomes(collected=1), {}) == []  # one process: nothing to judge


def test_the_single_process_first_pass_survives_random_parameter_ids() -> None:
    # workers=0 runs the first pass in one process, which deselects the tests the second pass
    # runs; a test with random ids (marked serial) has different ids in each process.
    first = _pass(_ids("a"), deselected=1, deselected_ids=_ids("rand-1"))
    second = _pass(_ids("rand-2"), deselected=1, deselected_ids=_ids("a"))
    assert judge_split(first, second) == []
    assert judge_tests(first, 0, allowed_deselected=1) == []


def test_a_real_worker_failure_after_the_session_ended_fails_the_check(scratch_dir: Path) -> None:
    # An unraisable exception found by pytest at the end of the session becomes a failing exit
    # status inside the worker, after the controller was told the worker had finished.
    body = (
        "class Bad:\n    def __del__(self):\n        raise RuntimeError('boom')\n\n"
        "def test_a():\n    a = Bad(); b = Bad(); a.other = b; b.other = a\n"
    )
    outcomes, exit_code = _run_isolated_pytest(
        scratch_dir, body, ini="xfail_strict = true\nfilterwarnings = error\n", extra_args=XDIST
    )
    statuses = _read_worker_statuses(scratch_dir / "outcomes.json")
    problems = judge_tests(outcomes, exit_code) + judge_workers(outcomes, statuses)
    assert problems != [], (outcomes, exit_code, statuses)


# --- connection retry (clinic.devtools.connect_retry) ----------------------------------------


class _Refused(Exception):
    pass


def test_a_connection_refused_for_buffer_space_is_tried_again(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from clinic.devtools import connect_retry

    monkeypatch.delenv(connect_retry.RETRY_LOG_ENV, raising=False)  # not the outer pass's count
    monkeypatch.setattr(time, "sleep", lambda _: None)
    calls: list[int] = []

    def flaky(*args: object, **kwargs: object) -> str:
        calls.append(1)
        if len(calls) < 3:
            raise _Refused("connection failed: No buffer space available (0x00002747/10055)")
        return "connected"

    assert connect_retry.with_retry(flaky, _Refused)("host") == "connected"
    assert len(calls) == 3


def test_any_other_connection_error_is_raised_at_once(monkeypatch: pytest.MonkeyPatch) -> None:
    from clinic.devtools import connect_retry

    monkeypatch.delenv(connect_retry.RETRY_LOG_ENV, raising=False)
    monkeypatch.setattr(time, "sleep", lambda _: None)
    calls: list[int] = []

    def down(*args: object, **kwargs: object) -> str:
        calls.append(1)
        raise _Refused("connection refused: Is the server running on that host?")

    with pytest.raises(_Refused):
        connect_retry.with_retry(down, _Refused)()
    assert len(calls) == 1

    def always_buffers(*args: object, **kwargs: object) -> str:
        calls.append(1)
        raise _Refused("No buffer space available")

    calls.clear()
    with pytest.raises(_Refused):  # a refusal that persists is still an error
        connect_retry.with_retry(always_buffers, _Refused)()
    assert len(calls) == connect_retry.ATTEMPTS


def test_psycopg_connect_is_wrapped_once() -> None:
    import psycopg

    from clinic.devtools import connect_retry

    connect_retry.install()
    connect_retry.install()
    wrapped = psycopg.connect
    assert getattr(wrapped, "clinic_retry", False) is True
    assert not getattr(wrapped.__wrapped__, "clinic_retry", False)  # type: ignore[attr-defined]


# --- guards that no other test would miss (FC-07) --------------------------------------------


def test_the_one_process_split_compares_counts_and_the_same_test_left_out_twice() -> None:
    first = _pass(_ids("a", "b"), deselected=1, deselected_ids=_ids("x"))
    second = _pass(_ids("x"), deselected=2, deselected_ids=_ids("a", "b"))
    assert judge_split(first, second) == []
    fewer = _pass(_ids("a", "b"), deselected=0, deselected_ids=())
    assert any("different number" in p for p in judge_split(fewer, second))
    twice = _pass(_ids("c"), deselected=2, deselected_ids=_ids("a", "a"))
    assert any("left the same test out twice" in p for p in judge_split(_pass(_ids("a")), twice))


def test_an_unreadable_worker_status_file_is_a_problem(scratch_dir: Path) -> None:
    record = scratch_dir / "outcomes.json"
    (scratch_dir / "outcomes.json.gw0").write_text("not json", encoding="utf-8")
    (scratch_dir / "outcomes.json.gw1").write_text('{"worker": "gw1", "exitstatus": 0}')
    statuses = _read_worker_statuses(record)
    assert statuses == {"gw0": -1, "gw1": 0}
    started = Outcomes(collected=2, finished=2, passed=2, distributed=1, workers_started=2)
    assert any("gw0" in p for p in judge_workers(started, statuses))


def _result(
    collected: tuple[str, ...],
    *,
    deselected_ids: tuple[str, ...] = (),
    distributed: int = 0,
    statuses: dict[str, int] | None = None,
    retries: int = 0,
) -> PassResult:
    outcomes = _pass(
        collected,
        deselected=len(deselected_ids),
        deselected_ids=deselected_ids,
        distributed=distributed,
        workers_started=2 if distributed else 0,
    )
    if distributed and statuses is None:
        statuses = {"gw0": 0, "gw1": 0}
    return PassResult(outcomes, 0, (), statuses, retries)


def _step(first: PassResult, second: PassResult) -> bool:
    results = iter((first, second))
    return _pytest_step("python", 2, 600.0, run_pass=lambda *_: next(results))


def test_the_test_step_as_a_whole_rejects_what_the_judges_reject(
    capsys: pytest.CaptureFixture[str],
) -> None:
    good_first = _result(_ids("a", "b"), distributed=1)
    good_second = _result(_ids("c"), deselected_ids=_ids("a", "b"))
    assert _step(good_first, good_second) is True
    assert "collected=3 finished=3 passed=3" in capsys.readouterr().out
    # the passes overlap: the split judge must be called
    overlapping = _result(_ids("a", "c"), distributed=1)
    assert _step(overlapping, good_second) is False
    assert "both passes" in capsys.readouterr().out
    # a worker ended badly after reporting: the worker judge must be called, for either pass
    bad_worker = _result(_ids("a", "b"), distributed=1, statuses={"gw0": 0, "gw1": 3})
    assert _step(bad_worker, good_second) is False
    assert "no test explains" in capsys.readouterr().out
    # a retried connection in the serial pass fails the step
    retried = _result(_ids("c"), deselected_ids=_ids("a", "b"), retries=1)
    assert _step(good_first, retried) is False
    assert "serial pass: 1 database connection(s) had to be retried" in capsys.readouterr().out
    # a failed test, an unfinished one, an unexplained deselection: the per-pass judge is called
    failing = _result(_ids("a", "b"), distributed=1)
    failing = PassResult(
        Outcomes(
            collected=2, finished=2, passed=1, failed=1, distributed=1, workers_started=2,
            collected_ids=_ids("a", "b"), finished_ids=_ids("a", "b"),
        ),
        1, (), {"gw0": 0, "gw1": 1}, 0,
    )  # fmt: skip
    assert _step(failing, good_second) is False
    assert "1 failure(s)" in capsys.readouterr().out
    unfinished = PassResult(
        Outcomes(
            collected=2, finished=1, passed=1, distributed=1, workers_started=2,
            collected_ids=_ids("a", "b"), finished_ids=_ids("a"),
        ),
        0, (), {"gw0": 0, "gw1": 0}, 0,
    )  # fmt: skip
    assert _step(unfinished, good_second) is False
    assert "did not run" in capsys.readouterr().out
    undeclared = _result(_ids("c"), deselected_ids=_ids("a", "b", "z"))
    assert _step(good_first, undeclared) is False
    assert "deselected" in capsys.readouterr().out
    # a problem a pass found while running is not lost
    broken = PassResult(None, 1, ("serial pass: pytest wrote no outcome record (exit 1)",))
    assert _step(good_first, broken) is False


def test_the_connection_retry_is_far_shorter_than_the_race_observation_window() -> None:
    import inspect

    from clinic.devtools import connect_retry
    from clinic.operations.testing import hold_then_race

    window = inspect.signature(hold_then_race).parameters["wait"].default  # 0.6 s
    assert (connect_retry.ATTEMPTS - 1) * connect_retry.RETRY_DELAY < window / 3
