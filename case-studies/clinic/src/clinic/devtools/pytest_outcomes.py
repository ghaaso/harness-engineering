"""pytest plugin the check command loads to record every test outcome (G00-05).

Active only when CLINIC_CHECK_OUTCOMES names an output file. It counts collected and
deselected items, items removed without being announced as deselected (G00-14), collection
errors, and each item's outcome: passed, failed, error (setup or teardown), skipped, xfailed
and xpassed, including a non-strict xfail that passes, which pytest's own junit report counts
as a pass. It also records the node id of every collected, deselected and finished test so the
check can prove that its two passes (parallel and serial) split the suite without losing or
repeating a test. The check command judges these records.

With pytest-xdist the recorder runs in the controller process only (two processes would write
one file): the controller learns the collected ids from the workers' agreement
(``pytest_xdist_node_collection_finished``), sees every test report the workers send, and counts
a worker that died. Each worker loads a small ``WorkerExit`` instead: a failure after a worker
has told the controller it is finished (pytest turns an unraisable exception or a resource
warning found at the end of the session into a failing exit status, under
``filterwarnings = ["error"]``) never reaches the controller as a test report, so the worker
writes its final exit status to ``<record>.<worker id>`` and the check judges those files.

If CLINIC_CHECK_HEARTBEAT names a file, the recorder touches it whenever the run makes progress,
so the check can tell a hung worker from a slow test.
"""

from __future__ import annotations

import json
import os
import time
from collections import Counter
from pathlib import Path
from typing import Any, Final

import pytest

OUTPUT_ENV: Final = "CLINIC_CHECK_OUTCOMES"
HEARTBEAT_ENV: Final = "CLINIC_CHECK_HEARTBEAT"
# The status a worker records when pytest's own final clean-up raised.
CLEANUP_RAISED: Final = -2
KEYS: Final = ("passed", "failed", "errors", "skipped", "xfailed", "xpassed")


class OutcomeRecorder:
    def __init__(self, path: Path, *, distributed: bool, heartbeat: Path | None) -> None:
        self.path = path
        self.distributed = distributed
        self.heartbeat = heartbeat
        self._last_beat = float("-inf")
        self.counts: Counter[str] = Counter()
        self.collected = 0
        self.collected_ids: list[str] = []
        self.discovered = 0
        self.deselected = 0
        self.deselected_ids: list[str] = []
        self.collection_errors = 0
        self.worker_crashes = 0
        self.workers: set[str] = set()
        self.finished: set[str] = set()
        self.beat()

    def beat(self) -> None:
        """Record progress (at most once a second); a failure to write is never a test failure."""
        if self.heartbeat is None or time.monotonic() - self._last_beat < 1.0:
            return
        self._last_beat = time.monotonic()
        try:
            self.heartbeat.write_text(str(time.time()), encoding="utf-8")
        except OSError:
            pass

    def pytest_collectreport(self, report: pytest.CollectReport) -> None:
        self.beat()
        if report.failed:
            self.collection_errors += 1

    def pytest_itemcollected(self, item: pytest.Item) -> None:
        # Counted before pytest_collection_modifyitems, so items a conftest or plugin drops
        # without announcing them as deselected still show up (G00-14).
        self.discovered += 1

    def pytest_collection_finish(self, session: pytest.Session) -> None:
        self.beat()
        if self.distributed:
            return  # the controller collects nothing; the workers' ids arrive below
        self.collected = len(session.items)
        self.collected_ids = [item.nodeid for item in session.items]

    @pytest.hookimpl(optionalhook=True)
    def pytest_xdist_node_collection_finished(self, node: Any, ids: list[str]) -> None:
        # xdist itself fails the run if two workers collect different tests.
        self.beat()
        self.workers.add(str(node.workerinput["workerid"]))
        if not self.collected_ids:
            self.collected_ids = list(ids)
            self.collected = len(ids)

    @pytest.hookimpl(optionalhook=True)
    def pytest_testnodedown(self, node: Any, error: object | None) -> None:
        self.beat()
        if error:
            self.worker_crashes += 1

    def pytest_deselected(self, items: list[pytest.Item]) -> None:
        self.deselected += len(items)
        self.deselected_ids += [item.nodeid for item in items]

    def pytest_runtest_logreport(self, report: pytest.TestReport) -> None:
        self.beat()
        xfail = hasattr(report, "wasxfail")
        if report.when == "call":
            if xfail:
                key = "xfailed" if report.skipped else "xpassed"
            else:
                key = {"passed": "passed", "failed": "failed", "skipped": "skipped"}[report.outcome]
        elif report.skipped:
            key = "xfailed" if xfail else "skipped"
        elif report.failed:
            key = "errors"
        else:
            return
        self.counts[key] += 1
        self.finished.add(report.nodeid)

    def pytest_sessionfinish(self, session: pytest.Session, exitstatus: int) -> None:
        data: dict[str, Any] = {key: self.counts[key] for key in KEYS}
        data |= {
            "collected": self.collected,
            "deselected": self.deselected,
            "removed": max(0, self.discovered - self.collected - self.deselected),
            "collection_errors": self.collection_errors,
            "finished": len(self.finished),
            "exitstatus": int(exitstatus),
            "worker_crashes": self.worker_crashes,
            "workers_started": len(self.workers),
            "distributed": int(self.distributed),
            "collected_ids": self.collected_ids,
            "deselected_ids": self.deselected_ids,
            "finished_ids": sorted(self.finished),
        }
        self.path.write_text(json.dumps(data), encoding="utf-8")


class WorkerExit:
    """Runs in an xdist worker: records the worker's very last exit status for the check.

    pytest runs its own final clean-up (the check for unraisable exceptions and unclosed
    resources, which ``filterwarnings = ["error"]`` turns into an exception) after
    ``pytest_unconfigure``, from ``Config._cleanup_stack``. This recorder is pushed on that
    stack first, so it runs last, and as an ExitStack exit function it is told whether an
    earlier clean-up step raised.
    """

    def __init__(self, path: Path, worker: str) -> None:
        self.path = path
        self.worker = worker
        self.session: pytest.Session | None = None

    def pytest_sessionstart(self, session: pytest.Session) -> None:
        self.session = session

    def last_exit(self, exc_type: object, exc: object, tb: object) -> bool:
        if exc_type is not None:
            status = CLEANUP_RAISED
        else:
            status = int(self.session.exitstatus) if self.session is not None else -1
        # a name the check's glob of status files (`<record>.*`) cannot match
        partial = self.path.with_name("." + self.path.name + ".partial")
        partial.write_text(json.dumps({"worker": self.worker, "exitstatus": status}))
        os.replace(partial, self.path)  # a reader sees the whole file or none
        return False  # never swallow the exception


def worker_exit_path(record: Path, worker: str) -> Path:
    return record.with_name(f"{record.name}.{worker}")


@pytest.hookimpl(tryfirst=True)
def pytest_configure(config: pytest.Config) -> None:
    target = os.environ.get(OUTPUT_ENV)
    if not target:
        return
    workerinput = getattr(config, "workerinput", None)
    if workerinput is not None:  # an xdist worker: only the controller records outcomes
        worker = str(workerinput["workerid"])
        exit_recorder = WorkerExit(worker_exit_path(Path(target), worker), worker)
        config.pluginmanager.register(exit_recorder, "clinic-check-worker-exit")
        # pytest 8.x keeps its clean-up steps on an ExitStack; devtools/tests/test_check.py
        # runs a real worker whose clean-up raises, so a pytest change that breaks this fails.
        config._cleanup_stack.push(exit_recorder.last_exit)
        return
    beat = os.environ.get(HEARTBEAT_ENV)
    distributed = getattr(config.option, "dist", "no") != "no"
    recorder = OutcomeRecorder(
        Path(target), distributed=distributed, heartbeat=Path(beat) if beat else None
    )
    config.pluginmanager.register(recorder, "clinic-check-outcomes")
