# graphtest-graphify:1 = graphtest:1 + graphifyy 0.9.108 (core dependencies only, no extras)
# in its own virtual environment at /opt/graphify.
# Build offline from the hash-checked wheels in ./wheels (see resolve.sh, verify-wheels.js.txt):
#   docker build --network none -t graphtest-graphify:1 .
# No distribution package is added: python3-venv (with its bundled pip 23.0.1 wheel) is
# already in graphtest:1.
FROM graphtest:1
RUN --mount=type=bind,source=wheels,target=/tmp/gfy/wheels \
    --mount=type=bind,source=requirements.lock,target=/tmp/gfy/requirements.lock \
    python3 -m venv /opt/graphify \
 && /opt/graphify/bin/pip install --disable-pip-version-check --no-index --no-cache-dir \
      --require-hashes --only-binary=:all: --find-links /tmp/gfy/wheels \
      -r /tmp/gfy/requirements.lock \
 && /opt/graphify/bin/pip freeze --all > /opt/graphify/pip-freeze.txt \
 && /opt/graphify/bin/pip check
# No model backend in this image, ever: GRAPHIFY_BACKEND=none makes every LLM step
# skip or refuse (graphify/llm.py backend_disabled_by_env, cli.py extract).
# GRAPHIFY_NO_AUTO_REFRESH=1 stops the CLI from rewriting installed skill / OpenCode
# plugin files in the home and working directories on each run (__main__.py).
# GRAPHIFY_QUERY_LOG_DISABLE=1 keeps the opt-in query log off (querylog.py).
ENV GRAPHIFY_BACKEND=none \
    GRAPHIFY_NO_AUTO_REFRESH=1 \
    GRAPHIFY_QUERY_LOG_DISABLE=1 \
    PATH=/opt/graphify/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin \
    PYTHONDONTWRITEBYTECODE=1
WORKDIR /work
ENTRYPOINT []
CMD ["graphify", "--help"]
