"""The short tag that keeps two checkouts' test databases apart.

The test databases are named ``test_<name>_<tag>`` (and pytest-xdist adds ``_gw<N>``), where the
tag is a hash of the checkout's path, so two worktrees sharing one PostgreSQL container never touch
each other's databases. In the check's container mode every checkout has the same path inside the
container, so the host passes its own tag in ``CLINIC_TEST_CHECKOUT_TAG`` and the settings use that.
"""

from __future__ import annotations

import hashlib
import os
import re
import sys
from collections.abc import Mapping
from pathlib import Path
from typing import Final

TAG_ENV: Final = "CLINIC_TEST_CHECKOUT_TAG"
INSIDE_ENV: Final = "CLINIC_CHECK_IN_CONTAINER"
TAG_PATTERN: Final = re.compile(r"[0-9a-f]{6}")


class BadCheckoutTag(ValueError):
    pass


def checkout_tag(path: Path) -> str:
    """Six hex digits derived from the checkout's path (case-insensitive, as Windows paths are)."""
    return hashlib.sha1(str(path).lower().encode(), usedforsecurity=False).hexdigest()[:6]


def tag_for(
    path: Path, environ: Mapping[str, str] | None = None, platform: str = sys.platform
) -> str:
    """The tag in use. Outside the test container: this path's own, whatever the environment says
    (so a stray variable cannot point a checkout at another checkout's databases). Inside the test
    container (``CLINIC_CHECK_IN_CONTAINER=1``): the tag the host passed, which must be present."""
    env = os.environ if environ is None else environ
    # The test container is Linux: on Windows a stray marker is never honoured.
    if env.get(INSIDE_ENV) != "1" or platform == "win32":
        return checkout_tag(path)
    given = env.get(TAG_ENV, "")
    if not TAG_PATTERN.fullmatch(given):
        raise BadCheckoutTag(
            f"{TAG_ENV} must be six lowercase hex digits inside the test container, not {given!r}"
        )
    return given
