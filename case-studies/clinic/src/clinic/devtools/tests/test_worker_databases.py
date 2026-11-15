"""Each pytest-xdist worker has its own test database, and every connection that worker opens,
including the race tests' second connection on another thread, targets it.

Without xdist (the check's serial pass) the one database keeps its unsuffixed name.
"""

from __future__ import annotations

import re
import subprocess
import sys

import pytest
from django.conf import settings
from django.db import connection, connections

from clinic.devtools.checkout_tag import tag_for
from clinic.operations.testing import run_concurrently
from clinic.settings.base import BASE_DIR


def _current_database() -> str:
    with connection.cursor() as cursor:
        cursor.execute("SELECT current_database()")
        return str(cursor.fetchone()[0])


def _check_databases(worker: str | None) -> None:
    here = _current_database()
    runner = run_concurrently(_current_database)[0]
    assert runner.error is None
    assert runner.result == here  # the second connection: same database as this one
    migrator_name = connections[settings.MIGRATION_DATABASE_ALIAS].settings_dict["NAME"]
    assert migrator_name == here == settings.DATABASES["default"]["NAME"]
    assert here.startswith("test_")
    # test_<name>_<tag of this checkout>[_gw<N>]: two worktrees cannot share a name. The tag is a
    # hash of the checkout's path, or the host's tag in the check's container mode.
    tag = tag_for(BASE_DIR)
    assert re.fullmatch(rf"test_.+_{tag}(_gw\d+)?", here), here
    if worker is None:
        assert re.search(r"_gw\d+$", here) is None
    else:
        assert here.endswith(f"_{worker}")


@pytest.mark.django_db
def test_every_connection_of_a_worker_targets_the_workers_own_database(
    request: pytest.FixtureRequest,
) -> None:
    """Runs in the parallel pass: inside a worker, whatever its id."""
    _check_databases(getattr(request.config, "workerinput", {}).get("workerid"))


@pytest.mark.serial
@pytest.mark.django_db
def test_the_serial_pass_keeps_the_unsuffixed_database(request: pytest.FixtureRequest) -> None:
    """Runs in the serial pass, which is a single process: no worker suffix."""
    assert not hasattr(request.config, "workerinput")
    _check_databases(None)


def _settings_with_database_name(name: str) -> subprocess.CompletedProcess[str]:
    from clinic.devtools.check import controlled_env

    return subprocess.run(
        [sys.executable, "-c", "from django.conf import settings; print(settings.DATABASES)"],
        env=controlled_env({"CLINIC_DB_NAME": name}),
        capture_output=True,
        text=True,
        check=False,
        timeout=60,
    )


def test_a_database_name_that_cannot_fit_with_a_worker_suffix_is_refused() -> None:
    # "test_" + name + "_" + 6 hex digits + "_gw999" must fit in 63 BYTES: 45 ASCII letters do
    assert _settings_with_database_name("d" * 45).returncode == 0
    refused = _settings_with_database_name("d" * 46)
    assert refused.returncode != 0 and "63 bytes" in refused.stderr
    # bytes, not characters: 23 two-byte letters are 46 bytes, while 23 ASCII letters fit
    assert _settings_with_database_name("d" * 23).returncode == 0
    two_byte = _settings_with_database_name("é" * 23)  # 23 characters, 46 bytes
    assert two_byte.returncode != 0 and "63 bytes" in two_byte.stderr
