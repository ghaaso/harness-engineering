# Development image for the check's container mode (docs/tasks/linux-test-runner/task.md).
# TESTS ONLY: it holds the locked Python packages (development group included), Playwright's
# Chromium and the one Debian package the tests need (git). It contains no secret and no clinic
# code (the working tree is streamed in when a check starts), and production never uses it.
# Build it with `uv run --locked python scripts/test_image.py build`; the tag is a hash of this
# file, the files it copies and uv.lock, so it is rebuilt only when one of them changes.
#
# Sources it downloads from: Docker Hub (the base image, pinned by digest), PyPI (uv, with a hash,
# and every package in uv.lock, which uv checks against the lock's hashes), the Debian bookworm
# archive (git, and the libraries Chromium needs, installed by `playwright install-deps`) and
# Playwright's download host (Chromium, headless shell, ffmpeg for the locked Playwright version).
FROM python:3.13-slim-bookworm@sha256:a5a7017efc5969e00ae2b91c8eb0631049a569652aa4ffc4501769049ae45c72

ENV DEBIAN_FRONTEND=noninteractive \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    UV_PROJECT_ENVIRONMENT=/opt/venv \
    UV_PYTHON_DOWNLOADS=never \
    UV_LINK_MODE=copy \
    UV_COMPILE_BYTECODE=1 \
    PLAYWRIGHT_BROWSERS_PATH=/opt/ms-playwright \
    PATH=/opt/venv/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

COPY docker/tests/uv-requirements.txt /tmp/uv-requirements.txt
RUN pip install --no-cache-dir --require-hashes -r /tmp/uv-requirements.txt \
    && rm /tmp/uv-requirements.txt

RUN apt-get update \
    && apt-get install -y --no-install-recommends git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build
COPY pyproject.toml uv.lock ./
# --no-cache: the downloaded wheels are not kept in the image (about 330 MB saved).
RUN uv sync --locked --no-install-project --no-cache

# Chromium and the system libraries it needs, for the Playwright version in uv.lock.
RUN apt-get update \
    && playwright install --with-deps chromium \
    && rm -rf /var/lib/apt/lists/*

COPY docker/tests/bootstrap.py /opt/clinic-tests/bootstrap.py

# A user without privileges: root ignores file permissions, which several tests check.
RUN useradd --create-home --uid 1000 clinic \
    && mkdir /work \
    && chown clinic:clinic /work \
    && rm -rf /build
USER clinic
WORKDIR /work
ENV HOME=/home/clinic
ENTRYPOINT ["/opt/venv/bin/python", "/opt/clinic-tests/bootstrap.py"]
