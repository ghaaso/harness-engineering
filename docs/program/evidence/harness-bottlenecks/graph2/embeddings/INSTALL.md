# graphtest-kge:1 install and offline smoke run (protocol addendum 8, part A)

Done 2026-11-14. Owner approved this install for a test container only. Nothing was installed on the host. No web query contained anything about this project (package names and versions only).

## 1. Package identity

| Item | Value |
|---|---|
| PyKEEN | `pykeen` 1.11.1, the latest release on PyPI (uploaded 2025-04-24), repo https://github.com/pykeen/pykeen, one pure-Python wheel (730,295 bytes) |
| PyTorch | `torch` 2.15.0+cpu from https://download.pytorch.org/whl/cpu (the PyTorch CPU index), not on PyPI; `torch.version.cuda` is None, no `nvidia-*`, `triton` or CUDA wheel anywhere in the lock |
| Python | 3.11.2 (Debian 12 bookworm, x86_64), venv `/opt/kge`; PyKEEN needs >= 3.10, torch 2.15 has cp311 wheels |
| Base image | `graphtest:1`, id `sha256:45dc84c895a0c35ca50f535dc009865f24242f4a43be560cfe268e067d74a6d4`, 1,263,163,055 bytes |
| New image | `graphtest-kge:1`, id `sha256:55715543bc43c85e8426eb6934d9ba8196307b0ef0b0ccd357da85350ac97711`, 3,090,108,832 bytes (3.09 GB) disk usage: base + 1,826,945,777; venv 1,373 MB (torch 814 MB); one `RUN` layer |
| Not installed | `torch_geometric` (PyKEEN extra `pyg`; CompGCN is native and needs none), all other extras (plotting, mlflow, wandb, lightning, ...), `pip` upgrade in the image, any apt package |

## 2. Method

1. Resolve (network ON, only step with network): `image/resolve.sh` in a throwaway container `kge-resolve`
   from `graphtest:1` on the default bridge, `--cpus 6 --memory 3g`. Pass 1:
   `pip download --only-binary=:all: --index-url https://download.pytorch.org/whl/cpu torch`.
   Pass 2: `pip download --only-binary=:all: --find-links <wheels> --index-url https://pypi.org/simple
   "torch==2.15.0+cpu" "pykeen==1.11.1"`. Pass 2 pins the local `+cpu` torch wheel, so PyPI's CUDA build
   of torch cannot be chosen. No sdist was needed (`--only-binary=:all:`).
2. Verify (host): `image/verify-wheels.js.txt` computes the sha256 of every wheel and compares it with
   the value its index publishes for that exact file name: the PyPI JSON API (`/pypi/<name>/<ver>/json`)
   and, for anything the PyTorch CPU index lists, the `#sha256=` fragment of that index page. Every
   published value that exists must equal the local sha256 and at least one must exist. torch exists
   only on the CPU index. 49 of 49 match, 0 mismatches. It writes `requirements.lock` (50 lines: one
   comment plus `name==version --hash=sha256:...` per wheel; file sha256
   `60ce3c8fb6a9bc8d7e2d8f6043626dbd7bb78088c5c5b57d0b348424569db590`) and `wheels.tsv`.
3. Resolution check (network none): `pip install --dry-run --ignore-installed --no-index --find-links
   wheels --report` on `pykeen==1.11.1 torch==2.15.0+cpu` named exactly the 49 wheels now in the lock;
   three superseded wheels pass 1 had left behind (filelock 4.2.4, markupsafe 3.0.3, setuptools 78.1.0,
   1,441,523 bytes, each also sha256-matched) were moved out to `image/stale/` and are not in the lock.
4. Build (network OFF): `docker build --network none -t graphtest-kge:1 .` in `image/`. The Dockerfile
   bind-mounts `wheels/` and `requirements.lock` for one `RUN` step, makes the venv `/opt/kge` with the
   `venv` module already in the base, runs `pip install --no-index --no-cache-dir --require-hashes
   --only-binary=:all: --find-links <wheels> -r requirements.lock`, then `pip freeze --all >
   /opt/kge/pip-freeze.txt` (50 lines) and `pip check` ("No broken requirements found"). Build 90 s
   (pip step 33 s). Image `ENV`: `PATH` starts `/opt/kge/bin`, `PYTHONDONTWRITEBYTECODE=1`,
   `PYSTOW_HOME=/tmp/pystow`, `HOME=/tmp`; empty `ENTRYPOINT`; `WORKDIR /work`.

## 3. Wheels (every one; hash matched = local sha256 equals the index's published value)

| Package | Version | Wheel bytes | sha256 | Matched | Published by |
|---|---|---|---|---|---|
| alembic | 1.20.1 | 270355 | `9970712cfb81ea26c8658d378aaa5b8f6ff9146e5bb111d70497c164016cf598` | yes | pypi |
| backports-zstd | 1.8.0 | 493818 | `9c7fe40a58dbe1fd358e0ceb5b6b3f50a9b328f8fff42dcb3bdaeb9a022c2506` | yes | pypi |
| certifi | 2026.10.23 | 135082 | `e9b54de76e530bb6cf0ccd036787103acb58fd42ba930ea8bf948ddbaa2f61d1` | yes | pypi |
| charset-normalizer | 3.5.2 | 269972 | `211d5a3eb6af8f513b8d4ca19a8c1b7accab1b5f0d3175f9826b03c1a920dc1f` | yes | pypi |
| class-resolver | 0.8.2 | 32383 | `384c3980e8f5898e892a3fa68ffaa22a106a2033fc86847c52c808bbc8074b88` | yes | pypi |
| click | 8.5.1 | 126163 | `8bb5376d2006950386f8c6427613334a2acadc5f559cb80e638d00b4df957e37` | yes | pypi |
| click-default-group | 1.2.4 | 4123 | `9b60486923720e7fc61731bdb32b617039aba820e22e1c88766b1125592eaa5f` | yes | pypi |
| cloudpickle | 3.1.2 | 22228 | `9acb47f6afd73f60dc1df93bb801b472f05ff42fa6c84167d25cb206be1fbf4a` | yes | pypi |
| colorlog | 6.12.0 | 12239 | `30d392604e9110045a2c2aeefc27d7a017abbab63f3a8aee594eac0801df784e` | yes | pypi |
| dataclasses-json | 0.6.7 | 28686 | `0dbf33f26c8d5305befd61b39d2b3414e8a407bedc2834dea9b8d642666fb40a` | yes | pypi |
| docdata | 0.0.5 | 9168 | `7e54713b4fe8d87b6483cafa83a6f119344a4f3163799de08b8cb97436a215be` | yes | pypi |
| filelock | 4.2.10 | 218040 | `9479aaeb4db20b5a53e3da28493edd24720b66b8a0b84030aa56ccdf243d6857` | yes | pypi |
| fsspec | 2026.9.0 | 221738 | `8dd6e646e99ea382bd85f97a45e6b526a442d79423a7dc673f1e2756d05fcb5f` | yes | pypi+pytorch-cpu |
| idna | 3.20 | 69583 | `ab7ae7122974553370f0bdb919e1a960b2cd1bc1ef0276416d896db81c14582c` | yes | pypi |
| jinja2 | 3.1.6 | 134899 | `85ece4451f492d0c13c5dd7c13a64681a86afae63a5f347908daf103ce6d2f67` | yes | pypi |
| joblib | 1.6.0 | 306115 | `3dbbf9f6e4b592a2357b854608e980fe6390d131d7a82f011a377ef2ebef7aba` | yes | pypi |
| mako | 1.4.3 | 80164 | `723296007c870bfd6b3f0c3230dba7198096e5269297ebf5e4eff9e7ffa39d4f` | yes | pypi |
| markupsafe | 3.0.4 | 22961 | `6da83a088f8ef93b2d483a8232a4dbf4d69d3d8496b568a03c56becac43e1808` | yes | pypi |
| marshmallow | 3.26.2 | 50964 | `013fa8a3c4c276c24d26d84ce934dc964e2aa794345a0f8c7e5a7191482c8a73` | yes | pypi |
| more-click | 0.1.3 | 12052 | `12f0f3da94c84d39daaaec08e9503df8877f493812f8ebc3f0713081da48d282` | yes | pypi |
| more-itertools | 11.2.1 | 74405 | `35a7377edd1dd6608dcb2cdf534ded55ea32d49448875ad042cd3f879fb1ded0` | yes | pypi |
| mpmath | 1.3.0 | 536198 | `a0b2b9fe80bbcd81a6647ff13108738cfb482d481d826cc0e02f5b35e5c88d2c` | yes | pypi+pytorch-cpu |
| mypy-extensions | 1.2.0 | 5114 | `993e7a20aa5671eb41a7132cf555af30062da99729601601b9a8382b11cae768` | yes | pypi |
| narwhals | 2.28.0 | 490591 | `1f69d6385ec30e2fa6e1fdeb37c562ecabd0f713f6f3e3b58a668c5c9df9567f` | yes | pypi |
| networkx | 3.6.1 | 2068504 | `d47fbf302e7d9cbbb9e2555a0d267983d2aa476bac30e90dfbe5669bd57f3762` | yes | pypi+pytorch-cpu |
| numpy | 2.4.6 | 16918164 | `89cd468399cfd2504718f0ba50e410dca55a170b61a02ad92bb18c8a65186e93` | yes | pypi+pytorch-cpu |
| optuna | 5.0.0 | 442352 | `5fff892ae6baf4948c810c5b8635ec67e08efb0709b41cb73b14e30391d44720` | yes | pypi |
| packaging | 26.3 | 129956 | `d7193f7c8e4e93f444fde0262bf90af30e16fa0ad0ad44cb553c87339b23cd1c` | yes | pypi |
| pandas | 3.1.1 | 12356904 | `4f1602f614bb83f443381dbcbb94c4ac764b2e50c8d6c965614c5cd83e328c47` | yes | pypi |
| pykeen | 1.11.1 | 730295 | `b6cc0ab012fc6ba4f37b58fb7081a409a5c1f04cbbb0e0e9c2256e911757d4ba` | yes | pypi |
| pystow | 0.10.3 | 65858 | `d70467457362a1c9373c575904bca5c63799bd011b6313ba15b4cf82f313957a` | yes | pypi |
| python-dateutil | 4.0.0 | 92853 | `a5e246f79eb80475e691bf93862cead98decd8a498cf53ba0516fcdc0f50dc1c` | yes | pypi |
| pyyaml | 6.0.3 | 806638 | `b8bb0864c5a28024fac8a632c443c87c5aa6f215c0b126c449ae1a150412f31d` | yes | pypi |
| requests | 2.34.2 | 73075 | `2a0d60c172f83ac6ab31e4554906c0f3b3588d37b5cb939b1c061f4907e278e0` | yes | pypi |
| scikit-learn | 1.9.1 | 9315422 | `52a0703bbc07ad27f560fa63fa68e4c54dd735bfbbf65b4dd3c225dc7547b6df` | yes | pypi |
| scipy | 1.17.1 | 35349300 | `43af8d1f3bea642559019edfe64e9b11192a8978efbd1539d7bc2aaa23d92de4` | yes | pypi |
| setuptools | 84.2.1 | 876263 | `ca140b45d5325a9478f880e351484f62fef15f336462e449ca0c03c873d589c2` | yes | pypi |
| sqlalchemy | 2.1.8 | 4664881 | `99577caccafc97b712f250c0e251546e97e6e64676213cf6085a63386fa48595` | yes | pypi |
| sympy | 1.14.0 | 6299353 | `e091cc3e99d2141a0ba2847328f5479b05d94a6635cb96148ccb3f34671bd8f5` | yes | pypi+pytorch-cpu |
| tabulate | 0.10.0 | 39814 | `f0b0622e567335c8fabaaa659f1b33bcb6ddfe2e496071b743aa113f8774f2d3` | yes | pypi |
| threadpoolctl | 3.8.0 | 32091 | `f1b49c82704d50f13ffae019c727b0fa4f6791a58f48f06a09c45face1be66da` | yes | pypi |
| torch | 2.15.0+cpu | 209502657 | `cee15855a32ad89a9bb27b8a9d6e07a859dcd2e11ed1b5561f3d6206e31a103b` | yes | pytorch-cpu |
| torch-max-mem | 0.1.6 | 18519 | `814a5fb2048c5c1abbf724b372a952bcea0d828d89e36b08b76e33c4e4526dd2` | yes | pypi |
| torch-ppr | 0.0.8 | 12181 | `3ebb9352a40ff2e2a988c52b0a67f212e88371fa23079048c96de5f944a87170` | yes | pypi |
| tqdm | 4.70.1 | 80199 | `c293e525e6fef9c20e8728fd4612df02a0aa31bb5fe91ecd93e123b1b7bffa73` | yes | pypi |
| typing-extensions | 4.16.0 | 45571 | `481caa481374e813c1b176ada14e97f1f67a4539ce9cfeb3f350d78d6370c2e8` | yes | pypi+pytorch-cpu |
| typing-inspect | 0.9.0 | 8827 | `9ee6fc59062311ef8547596ab6b955e1b8aa46242d854bfc78f4f6b0eff35f9f` | yes | pypi+pytorch-cpu |
| tzdata | 2026.6 | 348210 | `0a10eec6e13ef16b627fabed9a5f2ba61a62b1c67f327305f4e7e412a70b4aec` | yes | pypi |
| urllib3 | 2.8.0 | 135717 | `0cf3cae568d36aa9576b28dfb35f11328f1cb974ca7647d9475ebb86c75ac6e3` | yes | pypi |

Total: 49 wheels, 304,040,645 bytes (298.7 MiB), 0 mismatches. Wheels downloaded in all: 52, 305,482,168
bytes, including the 3 superseded ones above. torch alone is 209,502,657 bytes. In the table
"pypi+pytorch-cpu" means both indexes list the file and both values equal the local hash.

## 4. How to rebuild

From `image/` with `wheels/` and `requirements.lock` present: `docker build --network none -t graphtest-kge:1 .`
From nothing (host paths as `C:/...` for Docker Desktop; an MSYS `/tmp/...` path mounts an empty folder):

```sh
MSYS_NO_PATHCONV=1 docker run --rm --entrypoint sh --cpus 6 --memory 3g -v "<dir>/resolve.sh:/resolve.sh:ro" -v "<dir>:/out" graphtest:1 /resolve.sh
# remove from wheels/ any version the dry-run report does not name (see 2.3), then:
node verify-wheels.js.txt "<dir>"      # checks every hash, writes requirements.lock and wheels.tsv
docker build --network none -t graphtest-kge:1 .
```

`requirements.lock` plus the `wheels/` folder is what makes a rebuild repeatable; a fresh resolve would
pick whatever is newest. Scratch folder (not in the repo):
`<scratchpad>/hb/graph2/wider/embeddings/image/` holds the Dockerfile, wheels, lock, verify script, smoke
scripts and all raw outputs.

## 5. Smoke run (network off)

Container flags, both runs: `--network none --cpus 6 --memory 3g --read-only --tmpfs /tmp:rw,size=512m`,
`HOME=/tmp`, `PYSTOW_HOME=/tmp/pystow`, `OMP_NUM_THREADS=6 MKL_NUM_THREADS=6`, `torch.set_num_threads(6)`
(`torch.get_num_threads()` printed 6 in every run). Only `/smoke` (scripts, ro), `/audit` (probe, ro) and
an output folder were mounted. Scripts: `image/smoke/{gen,train,score}.py`, `smoke-train.sh`, `smoke-score.sh`.
One container of ours at a time, names prefixed `kge-`; none is left.

Data: `gen.py` made, in the container, 19,000 unique triples over 36 relations with fixed seed 20261114;
the heads and tails touch 5,390 distinct entities (5,400 were drawn from, 10 never appeared), so every
model has 5,390 entities. Structured on purpose (tail near `a_r*h + b_r` mod 5400), so loss can fall. All
triples are training triples; no split, no evaluation (a smoke run proves the machinery, not quality).

| Model | Setup | Params | s/epoch (per epoch) | Total train | Peak RSS | Saved model |
|---|---|---|---|---|---|---|
| RotatE | sLCWA, NSSALoss (margin 9, temp 1), 32 negatives per positive, dim 256, batch 512, Adam 1e-3, 5 epochs | 2,778,112 | mean 4.63 (5.12 5.01 4.29 4.50 4.23) | 23.1 s | 742.6 MB | 11.1 MB |
| ComplEx | LCWA, CrossEntropyLoss, LpRegularizer p=3 (weight 1e-3), dim 256, batch 256, Adam 1e-3, 5 epochs | 2,778,112 | mean 4.16 (4.16 4.09 4.33 4.16 4.04) | 20.8 s | 627.4 MB | 11.1 MB |
| CompGCN | LCWA, CrossEntropyLoss, default encoder (inverse triples on), dim 256, batch 256, Adam 1e-3, 2 epochs | 1,661,440 | 161.7, 156.2 (3 GB cap); 135.1, 124.6 (4 GB cap) | 318 s (3 GB); 260 s (4 GB) | 3,072.6 MB at the 3 GB cap; 3,522.1 MB at 4 GB | 12.7 MB |

Peak RSS is `resource.getrusage` ru_maxrss in the training process, equal to `/usr/bin/time -v` "Maximum
resident set size" (760,372 kB, 642,464 kB, 3,146,384 kB; 3,606,600 kB for the 4 GB run). Losses fell
every epoch (RotatE 3.33 to 2.16, ComplEx 116.7 to 87.1, CompGCN 15.2 to 9.1 at the 3 GB cap).
Python start-up plus importing torch and pykeen: about 2 s.

CompGCN at the 3 GB cap was memory-bound: RSS stopped at 3,072 MB (the cap itself) and the process had
238,151 major page faults (0 swaps); the same code at `--memory 4g` ran with 150 major faults, 18 percent
faster, and peaked at 3.5 GB. So the CompGCN figures to use are the 4 GB row; at dim 256 it does not fit
in 3 GB without thrashing. The 4 GB run is within addendum 8 A.2 (cap at most 4 GB) but above the 3 GB
this brief named; it was a second, separate container, run after the 3 GB one.

Scoring, a separate `--network none` container (`kge-score`), models and triple factories mounted read-only
from the training output: each model loaded with `torch.load(..., weights_only=False)` (PyKEEN models are
whole pickled objects) and `TriplesFactory.from_path_binary`, then scored 100 (h, r, t) triples
(`score_hrt`: 100 finite scores) and one 1-vs-all tail ranking (`score_t`: 5,390 finite scores, rank of
the true tail 49 for RotatE, 632 ComplEx, 961 CompGCN after 2 to 5 epochs, which is chance-like to weak
learning). Five reference scores recorded by the training process were recomputed after reload: max abs
difference 0.0 for all three models. Load 1.0 to 1.8 s, scoring 0.003 to 0.019 s, peak RSS 371 to 374 MB.

## 6. No network attempt: method and evidence

- `--network none`: a test connect to 1.1.1.1:443 inside the container failed with errno 101
  ("Network is unreachable").
- Audit probe `image/audit/sitecustomize.py` (ours; on `PYTHONPATH`, loaded by Python's audit hooks into
  every Python process; records, never blocks). `strace` is not in the image, so audit hooks are the
  method. Positive control: the deliberate connect above was recorded as `socket.getaddrinfo`,
  `socket.__new__` and `socket.connect (1.1.1.1, 443)`, so the hook sees connects.
- Result over all processes of the run (import-only check, gen, three trainings, three scorings): 0
  `socket.connect`, 0 DNS lookup (`getaddrinfo`, `gethostbyname`), 0 `http.client` or `urllib` request,
  0 `ftplib`/`smtplib`. The only socket events: one per process that imports torch, `socket.__new__`
  (AF_INET6, SOCK_STREAM) then `socket.bind(('::1', 0))`, the IPv6 loopback availability probe, local
  only and never connected. `import pykeen` with the network off raised nothing and printed
  `import ok 1.11.1 2.15.0+cpu`.
- File writes: `/out/...` (our outputs) and `/tmp` (PyKEEN's pystow wrote `/tmp/pystow/README.md` on
  import, plus a `/tmp/<random>` temp file per training). Nothing under `/root`, nothing on the
  read-only root file system (it would have failed).
- Modules imported that could reach a network: `requests`, `urllib3`, `urllib.request`, `http.client`
  and `torch.hub` (PyKEEN's dataset modules import them at load time); none was called.

## 7. Surprises and notes

1. The base image's pip 23.0.1 cannot resolve against the PyTorch CPU index: for names with an
   underscore in the metadata (`typing_extensions`) it rejects every candidate as "inconsistent Name"
   and backtracks through old torch versions (it had started downloading torch 2.3.0 and 2.2.x, several
   hundred MB, when stopped; that wheels folder was deleted). Fix: the resolver venv only runs `pip install
   --upgrade pip` from PyPI first. The image venv still uses pip 23.0.1 and installs the lock without
   trouble, because the lock names (`typing-extensions`) are normalized.
2. The PyTorch CPU index serves some projects (typing-extensions, filelock, networkx, numpy and others)
   by redirecting to files.pythonhosted.org, and lists others (sympy, mpmath, fsspec) itself with hashes
   equal to PyPI's. Where both list a file the two hashes agree (see the Published by column).
3. Pass 1 and pass 2 chose different versions of three shared dependencies; the older three were removed
   (section 2.3). A lock with both would have made pip fail on duplicate pins.
4. `--cpus 6` does not change torch's default thread count: `torch.get_num_threads()` was 12 (host has 24
   logical CPUs). Every script sets 6 explicitly.
5. PyKEEN prints a `pin_memory` warning even with `pin_memory=False` (the data loader's own). Harmless.
6. PyKEEN 1.11.1 is from April 2025 and runs against torch 2.15.0 and numpy 2.4.6 with no complaint on
   the paths exercised here (three models, train, save, load, score). `pip check` is clean. Paths not
   exercised (evaluators, pipeline(), HPO with optuna) were imported, not run.
7. CompGCN is about 30 times slower per epoch than RotatE or ComplEx at this size (full-graph message
   passing on every batch) and needs more than 3 GB; see section 5. Its post-reload scoring took only 3
   ms, which was not investigated.
8. A first `docker run` with a Git-Bash `/tmp/...` path mounted an empty directory instead of the
   resolve script (exit 0, empty log); fixed by passing `C:/...` paths. No data was lost.
