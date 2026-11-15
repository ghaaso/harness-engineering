"""Start a child process for tests, retrying only a refused process launch.

On the S00 Windows machine, starting a child process inside the test run was intermittently
refused with ``PermissionError: [WinError 5] Access is denied`` (2 of 7 full check runs on
3 November 2026; 0 of 120 spawns outside pytest; cause not identified). The child never
started, so retrying cannot change what a test observes. Any other error, and any result
from a child that did run, is returned or raised unchanged.
"""

from __future__ import annotations

import subprocess
import time
from collections.abc import Sequence
from typing import Any, Final

ATTEMPTS: Final = 4


def run_child(args: Sequence[str], **kwargs: Any) -> subprocess.CompletedProcess[str]:
    for attempt in range(1, ATTEMPTS + 1):
        try:
            return subprocess.run(args, text=True, check=False, **kwargs)
        except PermissionError:
            if attempt == ATTEMPTS:
                raise
            time.sleep(0.5 * attempt)
    raise AssertionError("unreachable")
