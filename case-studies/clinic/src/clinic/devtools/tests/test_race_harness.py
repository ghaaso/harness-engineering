"""The race harness decides "the second call was blocked" from a database lock wait, not from
elapsed time (FS-01).

``hold_then_race`` used to say "blocked" when the second call was still running 0.6 s after it
started. On a busy machine (two checks at once) a call that is merely slow, for example one whose
connection is still opening, looked blocked, and a race test could pass with a broken lock. Now it
is blocked only if it is running and a session of this database is waiting for a lock.
"""

from __future__ import annotations

import threading
import time
from collections.abc import Callable, Iterator
from contextlib import contextmanager

import pytest
from django.db import connection, transaction

from clinic.operations.testing import (
    Runner,
    blocked_by_a_lock,
    committed_db,
    hold_then_race,
    lock_waits,
)

pytestmark = pytest.mark.serial

__all__ = ["committed_db"]


def _lock_advisory() -> None:
    with connection.cursor() as cursor:
        cursor.execute("SELECT pg_advisory_xact_lock(4242001)")


def _update_a_row() -> None:
    with connection.cursor() as cursor:
        cursor.execute(
            "UPDATE django_content_type SET app_label = app_label "
            "WHERE id = (SELECT min(id) FROM django_content_type)"
        )


def _lock_a_row() -> None:
    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT id FROM django_content_type WHERE id = "
            "(SELECT min(id) FROM django_content_type) FOR UPDATE"
        )


@pytest.mark.parametrize(
    ("take", "events"),
    [
        (_lock_advisory, {"advisory"}),
        (_update_a_row, {"transactionid", "tuple"}),
        (_lock_a_row, {"transactionid", "tuple"}),
    ],
    ids=["advisory", "row update", "row for update"],
)
def test_a_real_lock_wait_of_any_kind_is_blocked(
    committed_db: None, take: object, events: set[str]
) -> None:
    race = hold_then_race(take, take)  # type: ignore[arg-type]
    assert race.second_was_blocked
    assert race.waits and {wait.event for wait in race.waits} <= events | {"advisory"}
    assert race.first.error is None and race.second.error is None


def test_a_call_that_is_only_slow_is_not_blocked(committed_db: None) -> None:
    def slow() -> None:
        time.sleep(1.5)  # alive past the 0.6 s join, never waiting for a lock

    race = hold_then_race(_lock_advisory, slow)
    assert not race.second_was_blocked
    assert race.waits == []
    assert race.second.error is None


def test_a_call_that_finishes_quickly_is_not_blocked(committed_db: None) -> None:
    race = hold_then_race(_lock_advisory, lambda: None)
    assert not race.second_was_blocked and race.stalled_at == ""


# --- the second call's own session, and a monitor that does not depend on autocommit (FS-09) ----


@contextmanager
def _holding(key: int) -> Iterator[Runner]:
    """A call that holds advisory lock ``key`` in an open transaction until the block ends."""
    holding, release = threading.Event(), threading.Event()

    def held() -> None:
        with transaction.atomic():
            with connection.cursor() as cursor:
                cursor.execute("SELECT pg_advisory_xact_lock(%s)", [key])
            holding.set()
            release.wait(60)

    runner = Runner(held)
    runner.start()
    assert holding.wait(30), runner.error
    try:
        yield runner
    finally:
        release.set()
        runner.join(60)


def _take(key: int) -> Callable[[], None]:
    def take() -> None:
        with connection.cursor() as cursor:
            cursor.execute("SELECT pg_advisory_xact_lock(%s)", [key])

    return take


def _wait_until_waiting(runner: Runner) -> None:
    deadline = time.monotonic() + 30
    while not lock_waits(session=runner.backend_pid or -1):
        assert time.monotonic() < deadline, "the call never waited for its lock"
        time.sleep(0.02)


def test_another_sessions_lock_wait_is_not_the_second_calls(committed_db: None) -> None:
    """A foreign session waiting for a lock must not make a merely slow second call "blocked"."""
    release_second = threading.Event()
    with _holding(4242001) as first, _holding(4242002):
        foreign = Runner(_take(4242002))  # waits for the second holder's lock
        foreign.start()
        _wait_until_waiting(foreign)
        second = Runner(lambda: release_second.wait(30) and None)  # alive, never waiting
        second.start()
        try:
            assert lock_waits(), "the foreign wait is visible to a session-wide poll"
            for expected_first in (first, None):
                blocked, waits, where = blocked_by_a_lock(second, expected_first, settle=1.0)
                assert (blocked, waits) == (False, [])
                assert where, "where the slow call was is reported"
        finally:
            release_second.set()
            second.join(30)
    foreign.join(60)


def test_a_wait_for_a_lock_the_first_call_does_not_hold_is_not_blocked(
    committed_db: None,
) -> None:
    with _holding(4242001) as first, _holding(4242002) as other:
        second = Runner(_take(4242002))  # waits, but for `other`, not for `first`
        second.start()
        _wait_until_waiting(second)
        blocked, waits, _ = blocked_by_a_lock(second, first, settle=1.0)
        assert not blocked and waits == []  # the old rule: any wait is "blocked"
        blocked, waits, _ = blocked_by_a_lock(second, other, settle=1.0)
        assert blocked and [wait.blockers for wait in waits] == [(other.backend_pid,)]
        assert waits[0].pid == second.backend_pid and waits[0].event == "advisory"
    second.join(60)


def test_a_race_names_the_first_calls_session_among_what_the_second_waits_for(
    committed_db: None,
) -> None:
    race = hold_then_race(_lock_advisory, _lock_advisory)
    assert race.second_was_blocked
    assert [wait.pid for wait in race.waits] == [race.second.backend_pid]
    assert race.first.backend_pid in race.waits[0].blockers


def test_a_wait_is_seen_from_a_connection_inside_a_transaction(committed_db: None) -> None:
    """Inside a transaction block PostgreSQL answers pg_stat_activity from the snapshot of the
    first poll; the monitor clears it, so a wait that began later is still seen."""
    with _holding(4242001), transaction.atomic():
        assert lock_waits() == []  # the first poll takes the snapshot
        waiter = Runner(_take(4242001))
        waiter.start()
        _wait_until_waiting(waiter)  # polls on this connection, inside the transaction
    waiter.join(60)


def test_a_race_is_decided_against_the_first_call_not_against_any_lock(
    committed_db: None,
) -> None:
    """The second call waits for a lock a third session holds; the first call holds nothing it
    needs: ``hold_then_race`` must not read that as the first call blocking it."""

    def wait_for_the_third_sessions_lock() -> None:
        with transaction.atomic(), connection.cursor() as cursor:
            cursor.execute("SET LOCAL lock_timeout = '2s'")
            cursor.execute("SELECT pg_advisory_xact_lock(4242002)")

    with _holding(4242002):
        race = hold_then_race(lambda: None, wait_for_the_third_sessions_lock)
        assert race.second.error is not None  # it did wait, and gave up at its lock timeout
        assert not race.second_was_blocked and race.waits == []
