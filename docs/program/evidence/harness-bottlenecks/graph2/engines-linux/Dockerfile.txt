# One Linux environment for every arm of the graph test (engines pinned; extensions pre-installed; runs offline).
FROM node:24-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends libssl3 ca-certificates libgomp1 python3 python3-venv curl binutils procps git time \
 && rm -rf /var/lib/apt/lists/*
# Arrow 26 shared library (needed by Ladybug's algorithm extension and by icebug)
RUN python3 -m venv /opt/py && /opt/py/bin/pip install --no-cache-dir "pyarrow>=26,<27"
# icebug 13.5: the Ladybug developers' NetworKit fork that the algo extension links against
RUN mkdir -p /opt/icebug && curl -fsSL https://github.com/Ladybug-Memory/icebug/releases/download/13.5/icebug-linux-x86_64.tar.gz | tar -xz -C /opt/icebug
ENV LD_LIBRARY_PATH=/opt/icebug/lib:/opt/py/lib/python3.11/site-packages/pyarrow
WORKDIR /opt/eng
RUN npm init -y >/dev/null && npm install --no-audit --no-fund @ladybugdb/core@0.22.3 @duckdb/node-api@2.0.0-r.1
COPY warm.js smoke.js /opt/eng/
RUN node warm.js
ENV NODE_PATH=/opt/eng/node_modules
