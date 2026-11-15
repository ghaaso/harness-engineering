# graphtest-kge-gpu:1 = graphtest:1 + PyKEEN 1.11.1 + PyTorch 2.15.0+cu132 (CUDA 13.2 build, pytorch.org/whl/cu132)
# + the NVIDIA runtime wheels and triton torch pins, in a virtual environment at /opt/kge.
# Built offline from the hash-checked wheels in ./wheels (see resolve.sh, download.sh, verify.js.txt):
#   docker build --network none -t graphtest-kge-gpu:1 .
FROM graphtest:1
RUN --mount=type=bind,source=wheels,target=/tmp/kge/wheels \
    --mount=type=bind,source=requirements.lock,target=/tmp/kge/requirements.lock \
    python3 -m venv /opt/kge \
 && /opt/kge/bin/pip install --disable-pip-version-check --no-index --no-cache-dir \
      --require-hashes --only-binary=:all: --find-links /tmp/kge/wheels \
      -r /tmp/kge/requirements.lock \
 && /opt/kge/bin/pip freeze --all > /opt/kge/pip-freeze.txt \
 && /opt/kge/bin/pip check
ENV PATH=/opt/kge/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin \
    PYTHONDONTWRITEBYTECODE=1 \
    PYSTOW_HOME=/tmp/pystow \
    HOME=/tmp
WORKDIR /work
ENTRYPOINT []
CMD ["python", "-c", "import pykeen, torch; print(pykeen.get_version(), torch.__version__)"]
