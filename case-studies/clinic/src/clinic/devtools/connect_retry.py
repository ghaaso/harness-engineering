"""Retry a database connection that Windows refused for lack of socket buffer space.

On the owner's Windows machine a connection to the loopback PostgreSQL port was refused now
and then with ``No buffer space available (0x00002747/10055)`` (2 of 22 full check runs on
6 November 2026, both in the serial race pass, after the parallel pass had opened thousands of
connections; the cause is not identified). The refused connection never reached the server, so
retrying it cannot change what a test observes; any other error, and a refusal that persists
through every attempt, is raised unchanged. The same reasoning as ``clinic.devtools.spawn``.

Installed by ``src/conftest.py``, so it applies to every test process, workers included. If
CLINIC_CHECK_RETRY_LOG names a file, each retry appends a line to it and the check command
reports how many there were.
"""

from __future__ import annotations

import functools
import os
import time
from collections.abc import Callable
from typing import Any, Final

ATTEMPTS: Final = 6
MARKERS: Final = ("No buffer space available",)
RETRY_LOG_ENV: Final = "CLINIC_CHECK_RETRY_LOG"
# Flat and short: all five retries together take 0.1 s, far under the 0.6 s the race harness
# (operations/testing.py hold_then_race) waits before deciding that a second call was blocked.
# The check also fails the serial pass if any retry happened there, so a retried connection can
# never be mistaken for a blocked one.
RETRY_DELAY: Final = 0.02


def refused_for_buffers(error: BaseException) -> bool:
    text = str(error)
    return any(marker in text for marker in MARKERS)


def _note(attempt: int, error: BaseException) -> None:
    path = os.environ.get(RETRY_LOG_ENV)
    if path:
        try:
            with open(path, "a", encoding="utf-8") as log:
                log.write(f"pid={os.getpid()} attempt={attempt} {str(error)[:120]!r}\n")
        except OSError:
            pass


def with_retry(connect: Callable[..., Any], error_type: type[BaseException]) -> Callable[..., Any]:
    """``connect`` retried while it fails with ``error_type`` for lack of buffer space."""

    @functools.wraps(connect)
    def retrying(*args: Any, **kwargs: Any) -> Any:
        for attempt in range(1, ATTEMPTS + 1):
            try:
                return connect(*args, **kwargs)
            except error_type as error:
                if attempt == ATTEMPTS or not refused_for_buffers(error):
                    raise
                _note(attempt, error)
                time.sleep(RETRY_DELAY)
        raise AssertionError("unreachable")

    retrying.clinic_retry = True  # type: ignore[attr-defined]
    return retrying


def install() -> None:
    """Wrap ``psycopg.connect`` (which Django's PostgreSQL backend calls); idempotent."""
    import psycopg

    if not getattr(psycopg.connect, "clinic_retry", False):
        psycopg.connect = with_retry(psycopg.connect, psycopg.OperationalError)
