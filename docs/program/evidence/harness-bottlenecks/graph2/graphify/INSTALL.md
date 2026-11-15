# graphify install and offline smoke run (protocol addendum 7, part A)

Written 2026-11-13 by the install lane, before any tuning or held-out task was run. Nothing was
installed on the host. graphify exists only inside the Docker image `graphtest-graphify:1`.
`graphify install`, `graphify hook install` and every other installer, hook writer or
instruction-block writer were never run. Every graphify build and query in this step ran in a
container started with `--network none`. No model was called and no agent ran.

Result in one line: the image builds offline from 31 hash-checked wheels, and in a container with
the network off graphify 0.9.108 built a code-only graph of one tuning parent commit (2,046
nodes, 5,599 edges, all edges from the parser) and answered one `query`, one `affected`, one
`path` and one `explain` call, all with exit code 0. An audit probe recorded no network attempt,
no model-provider import that succeeded, and no file touched in the home directory.

Working files (scratch, not in the repository) are under
`C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/graphify/image/`
(called `image/` below): `Dockerfile`, `requirements.lock`, `wheels/`, `wheels.tsv`,
`resolve.sh`, `verify-wheels.js.txt`, `audit/sitecustomize.py`, `smoke.sh`, `timing.sh`,
`logs/` (build, smoke, timing, pip freeze, PyPI metadata), `smoke-out/` (the smoke graph and
the four call outputs), `src/graphify/` (a read-only copy of the installed package source, used
for reading only).

---

## 1. Package identity (checked before anything was installed)

Source: `https://pypi.org/pypi/graphifyy/0.9.108/json`, saved as
`image/logs/pypi-graphifyy-0.9.108.json`.

| Field | Value |
|---|---|
| Name, version | `graphifyy` 0.9.108 (double y; the command is `graphify`) |
| Project links | Repository and Issues: `https://github.com/Graphify-Labs/graphify`; Homepage `https://graphify.com`; Documentation `https://docs.graphify.com` |
| License | Apache-2.0 |
| Requires Python | >= 3.10, < 3.15 |
| Release (upload) time | wheel 2026-11-12 21:48:34 UTC; source archive 2026-11-12 21:48:37 UTC |
| Wheel | `graphifyy-0.9.108-py3-none-any.whl`, 1,947,658 bytes, sha256 `71a0011e13135091bf71d9c58e93f12dbe219821ea366600129132f1c5a8fe9c` |
| Source archive (not used) | `graphifyy-0.9.108.tar.gz`, 3,424,555 bytes, sha256 `de1d155fbcff074a8bb4a71007942f420fb7e91c45eb618fcb8a076335fa713b` |
| Latest version on PyPI at check time | 0.9.108 (276 releases listed) |

Provenance: PyPI serves a publish attestation for the wheel
(`https://pypi.org/integrity/graphifyy/0.9.108/graphifyy-0.9.108-py3-none-any.whl/provenance`,
saved as `image/logs/pypi-provenance-wheel.json`). Decoded, it names publisher kind GitHub,
repository `Graphify-Labs/graphify`, workflow `publish.yml`, the signing certificate names
`.github/workflows/publish.yml@refs/tags/v0.9.108`, and the attested subject digest equals the
wheel sha256 above. I decoded the attestation; I did not cryptographically verify its Sigstore
signature. The metadata matches the official repository, so the install went ahead.

## 2. What was installed

### 2.1 Method

1. Resolve (network on, build phase only): `image/resolve.sh` ran in a throwaway container from
   `graphtest:1`: a temporary venv, then
   `pip download --only-binary=:all: -d /out/wheels "graphifyy==0.9.108"` (no extras). 31 wheels,
   32,080,475 bytes in total.
2. Verify (host): `image/verify-wheels.js.txt` computed the sha256 of every downloaded wheel and
   compared it with the sha256 PyPI publishes for that exact file name. 31 of 31 match, 0
   mismatches. It wrote `image/requirements.lock` (one `name==version --hash=sha256:...` line
   per wheel; file sha256 `2675c1fd889aecda4a5133c31b7fff484a6de16aecd499dc9b24970f12578205`).
3. Build (network OFF): `docker build --network none -t graphtest-graphify:1 .` in `image/`.
   The Dockerfile bind-mounts `wheels/` and `requirements.lock` for one `RUN` step (so the wheels
   are not left in a layer), creates the venv `/opt/graphify` with the Python 3.11 `venv` module
   already in the base image, and runs
   `pip install --no-index --require-hashes --only-binary=:all: --find-links <wheels> -r requirements.lock`,
   then `pip freeze --all > /opt/graphify/pip-freeze.txt` and `pip check` ("No broken
   requirements found"). Build time 14.3 seconds.

Distribution (apt) packages added: none. `graphtest:1` already contains `python3-venv` 3.11.2,
`python3-pip-whl` 23.0.1 and `python3-setuptools-whl` 66.1.1 (the venv's pip 23.0.1 and
setuptools 66.1.1 come from those bundled wheels, not from the network).

### 2.2 Wheels (all binary, all sha256 equal to PyPI's published value)

| Package | Version | Wheel bytes | sha256 |
|---|---|---|---|
| graphifyy | 0.9.108 | 1947658 | `71a0011e13135091bf71d9c58e93f12dbe219821ea366600129132f1c5a8fe9c` |
| networkx | 3.6.1 | 2068504 | `d47fbf302e7d9cbbb9e2555a0d267983d2aa476bac30e90dfbe5669bd57f3762` |
| numpy | 2.4.6 | 16918164 | `89cd468399cfd2504718f0ba50e410dca55a170b61a02ad92bb18c8a65186e93` |
| pyyaml | 6.0.3 | 806638 | `b8bb0864c5a28024fac8a632c443c87c5aa6f215c0b126c449ae1a150412f31d` |
| rapidfuzz | 3.14.6 | 3180952 | `3d5d90bae3c6fb7ea34da968c9f23070e8440edb827a28b242580e0108110b14` |
| tree-sitter | 0.25.2 | 632229 | `3e65ae456ad0d210ee71a89ee112ac7e72e6c2e5aac1b95846ecc7afa68a194c` |
| tree-sitter-bash | 0.25.1 | 231981 | `3f484c4bb8796cde7a87ca351e6116f09653edac0eb3c6d238566359dd28b117` |
| tree-sitter-c | 0.24.2 | 94264 | `5041ef67eb68ce6bc8bb0b1f8ef3a5585ce523dae0c7eec109ab0627dd75aede` |
| tree-sitter-c-sharp | 0.23.5 | 358333 | `aa88a780204cd153c4c1ae2d59c654cee1402212fa0d069823d6d34301587438` |
| tree-sitter-cpp | 0.23.4 | 316110 | `773d2cafc08bbc0f998687fa33f42f378c1a371cdb582870c4d13abb06092706` |
| tree-sitter-elixir | 0.3.5 | 182857 | `ebfe3491a3d00ac50b12a3bfcabb1c564f3809ed8a095099fe87f49d6b3987e6` |
| tree-sitter-fortran | 0.6.0 | 410116 | `ac4800b4abc1b25e6e7ab4a3f2eae274c5b19107beb18d3a473c0f67509c7486` |
| tree-sitter-go | 0.25.0 | 66418 | `04b3b3cb4aff18e74e28d49b716c6f24cb71ddfdd66768987e26e4d0fa812f74` |
| tree-sitter-groovy | 0.1.2 | 134117 | `9e938e9c2cd5fdb08fd1b28d7d621d15ea959a17a4bc0b77833e07a94fe7d263` |
| tree-sitter-java | 0.23.5 | 84033 | `370b204b9500b847f6d0c5ad584045831cee69e9a3e4d878535d39e4a7e4c4f1` |
| tree-sitter-javascript | 0.25.0 | 99728 | `9dc04ba91fc8583344e57c1f1ed5b2c97ecaaf47480011b92fbeab8dda96db75` |
| tree-sitter-json | 0.24.8 | 17236 | `85cca779872f7278f3a74eb38533d34b9c4de4fd548615e3361fa64fe350ad0a` |
| tree-sitter-julia | 0.23.1 | 682090 | `7d4f6ae938198fc0be9b6ea76313ade24fcdb89be01a791e0cc90c88fae5743d` |
| tree-sitter-kotlin | 1.1.0 | 339269 | `9a92afe24b634cf914c5812af0f5c53184b1c18bdf6ee5505c83afac81f6bf6c` |
| tree-sitter-lua | 0.5.0 | 41743 | `5ec448c854fea32414a0449147d648bc5baddf7a0357008c4abe3269db35370a` |
| tree-sitter-objc | 3.0.2 | 328889 | `e71282ac9c096a966bf2fa6a4ecdbea4bd037d3e01ea4aa9bbc64d9a4c0022f6` |
| tree-sitter-php | 0.24.1 | 313021 | `7a1404a30f2972498ace040b0029738b8dac45d0a12932ccb8b605eb94bafbe4` |
| tree-sitter-powershell | 0.26.4 | 132343 | `56508e4ac7aad1e3b26f2ef96b8d2b60b149c4efa0c23742e91e809a11db73ee` |
| tree-sitter-python | 0.25.0 | 108133 | `86f118e5eecad616ecdb81d171a36dde9bef5a0b21ed71ea9c3e390813c3baf5` |
| tree-sitter-ruby | 0.23.1 | 214427 | `f7bcd93972b4ca2803856d4fe0fbd04123ff29c4592bbb9f12a27528bd252341` |
| tree-sitter-rust | 0.24.2 | 164706 | `e033c5a93b57c88e0a835880de39fc802909ff69f57aaff6000211c196ea5190` |
| tree-sitter-scala | 0.26.13 | 571987 | `e3ff5a30430243b3e49a3784499209cd5678010c6a164c0b695e5aedbe0fe006` |
| tree-sitter-swift | 0.7.4 | 425909 | `d11d15a479d7d3b14c7fc526b4daab107995feca5752936fec5c60cc7fa6fe4d` |
| tree-sitter-typescript | 0.23.2 | 344960 | `e96d36b85bcacdeb8ff5c2618d75593ef12ebaf1b4eace3477e2bdb2abb1752c` |
| tree-sitter-verilog | 1.0.3 | 781337 | `747dd7d4bc95fb389bc37225f82d16f0c40549856e9a244be3ff9d7bfe62b730` |
| tree-sitter-zig | 1.1.2 | 82323 | `e924509dcac5a6054da357e3d6bcf37ea82984ee1d2a376569753d32f61ea8bb` |

The grammars this repository needs are among them: Python (`tree-sitter-python`), JavaScript
and JSX (`tree-sitter-javascript`), TypeScript and TSX (`tree-sitter-typescript`, which ships
both). JSON, Bash and the others are core dependencies of graphifyy and came with it.

`pip freeze --all` in the image (`image/logs/pip-freeze.txt`) lists exactly these 31 packages
plus `pip==23.0.1` and `setuptools==66.1.1` from the venv itself: 33 lines.

### 2.3 Sizes

| What | Size |
|---|---|
| Downloaded wheels, total | 32,080,475 bytes (31 files) |
| Installed venv `/opt/graphify` | 230,150,144 bytes on disk (220 MB); largest: numpy 46.9 MB + numpy.libs 28.5 MB, networkx 19.4 MB, tree_sitter_verilog 18.3 MB, pip 15.9 MB, rapidfuzz 12.5 MB, graphify itself 12.3 MB |
| Image layer added on top of `graphtest:1` | 230 MB (one `RUN` layer) |
| Image `graphtest-graphify:1` | 1,541,784,187 bytes (1.54 GB) disk usage, 370 MB content size; image id `sha256:ff13d60176cb17b6bdb84bd23be1483a30dbdf833c8fddb00fdd4216480863f0` |
| Base `graphtest:1` | 1,263,163,055 bytes (1.26 GB), 322 MB content size, id `sha256:45dc84c895a0c35ca50f535dc009865f24242f4a43be560cfe268e067d74a6d4` |

### 2.4 Image settings

`ENV GRAPHIFY_BACKEND=none GRAPHIFY_NO_AUTO_REFRESH=1 GRAPHIFY_QUERY_LOG_DISABLE=1
PYTHONDONTWRITEBYTECODE=1`, `PATH` starts with `/opt/graphify/bin`, `WORKDIR /work`, empty
`ENTRYPOINT` (the base image's Node entrypoint is cleared), `CMD ["graphify", "--help"]`.
Why each variable is there is in section 4.

### 2.5 What was left out

No extras were installed. Left out, with what each would add:

- Model and provider extras: `openai`, `anthropic`, `gemini`, `kimi`, `ollama`, `bedrock`
  (packages `openai`, `anthropic`, `boto3`, `tiktoken`). They are needed only for the
  model-read document layer, community naming (`label`, `cluster-only` without `--no-label`) and
  `--dedup-llm`. None of these runs in this step.
- `mcp` (the MCP server: `mcp`, `starlette`, `anyio`). The `graphify-mcp` console script is
  still created by the wheel but cannot start without this extra; it is not used.
- `leiden` (`graspologic`): without it, clustering falls back to networkx Louvain (the shipped
  fallback). Community ids do not enter the query ranking that the adapter will read, except as
  printed labels.
- `sql` / `postgres` (`tree-sitter-sql`, `psycopg`): SQL schema extraction. This repository's
  schema lives in Python Alembic migrations, not `.sql` files, so the code layer reads it as
  Python.
- `pdf`, `office`, `google`, `video`, `svg`, `watch`, `neo4j`, `falkordb`, `chinese`, and the
  extra grammars (`pascal`, `dm`, `terraform`, `ocaml`, `commonlisp`, `robot`, `vbnet`, `r`,
  `erlang`, `solidity`): not needed for a Python, JavaScript and TypeScript code layer. The
  extract run prints one warning about this ("PDF text extraction skipped: 'pypdf' is not
  installed"); it does not affect code files.

## 3. How to rebuild the image

From `image/` (wheels and lock file already present and verified):

```sh
docker build --network none -t graphtest-graphify:1 .
```

From nothing (the only steps that need the network):

```sh
# 1. download the wheels (throwaway container, network on)
MSYS_NO_PATHCONV=1 docker run --rm --entrypoint sh -v "<image dir>/resolve.sh:/resolve.sh:ro" \
  -v "<image dir>:/out" graphtest:1 /resolve.sh
# 2. check every wheel against PyPI's sha256 and write requirements.lock + wheels.tsv
node - "<image dir>" < verify-wheels.js.txt
# 3. build offline
docker build --network none -t graphtest-graphify:1 .
```

A later resolve could pick newer dependency versions (graphifyy pins ranges, not versions).
`requirements.lock` with its hashes is what makes the build repeatable; keep the `wheels/`
folder or re-download exactly the versions in the lock.

## 4. Looked at before trusting: entry points, network, home directory, shell profile

Read from the installed source (`/opt/graphify/lib/python3.11/site-packages/graphify`, 80
entries, about 101,000 lines of Python), plus an audit probe at run time (section 5.4).

Entry points (`graphifyy-0.9.108.dist-info/entry_points.txt`): `graphify =
graphify.__main__:main` and `graphify-mcp = graphify.serve:_main`. Nothing else.

Install time: a wheel runs no code when pip installs it. The only `.pth` file in the venv is
`distutils-precedence.pth`, which belongs to the venv's own setuptools 66.1.1, not to graphify.

Import time: `graphify/__init__.py` only defines lazy attribute imports. Importing all 97
graphify modules in a `--network none` container produced no socket, DNS or HTTP event, no
subprocess, no file write and nothing read from the home directory (audit log of that probe:
only the imports of `graphify.security`, `http.client`, `urllib.request` and a failed attempt
to import `tiktoken`, which is not installed and is guarded by `try`).

Code that can reach the network (none of it runs in this step):
- `security.py` (`safe_fetch` with its own DNS check and pinned connection) used by
  `graphify add <url>` and `ingest.py` (tweets via `publish.twitter.com`, arXiv pages).
- `llm.py`: the model backends (Anthropic, Kimi/Moonshot, Gemini, OpenAI, DeepSeek, Azure,
  Bedrock, Ollama, the `claude` CLI). Only reached for document extraction, community labelling
  and `--dedup-llm`.
- `extract --postgres DSN` opens a database connection (needs the `postgres` extra, not
  installed).
- `graphify clone` (runs `git clone`), `prs` (GitHub CLI), `export neo4j/falkordb --push`.
- HTML exports reference CDN scripts (`unpkg.com` vis-network, `d3js.org`, `cdn.jsdelivr.net`
  mermaid) that a browser would load when the HTML file is opened; graphify itself does not
  fetch them.
- No telemetry, update check or version check was found (searched for PyPI, GitHub API,
  telemetry, posthog, sentry and every hard-coded URL).

Things a user would not expect:
1. Every non-informational CLI run (anything except `--version` and `--help`) first looks for
   skill copies graphify installed earlier in the home directory (Claude, Codex, OpenCode,
   Gemini, Copilot, Cursor, Kiro and others) and REWRITES any whose version stamp is older than
   the package (`__main__._refresh_stale_skills`), and rewrites old OpenCode plugin files in the
   working directory and in the home directory (`_refresh_v1_opencode_plugins`, which may also
   run `opencode --version`). Opt-out: `GRAPHIFY_NO_AUTO_REFRESH=1`, which the image sets. In
   this container nothing had been installed, so there was nothing to rewrite either way.
2. `graphify extract`, `update`, `cluster-only` and `label` re-execute themselves once with
   `PYTHONHASHSEED=0` (an `os.execvpe`) so clustering is repeatable. Seen in the audit log.
3. `graphify extract` runs `git rev-parse HEAD` twice (in the scanned folder and in the output
   folder). The clean export has no `.git`, so both fail harmlessly; with a real checkout the
   commit id would be recorded.
4. Every `query`, `path` and `explain` writes a time stamp file `cache/last_query_stamp` next
   to the graph file (used by the strict hook to know the agent "oriented" recently). The
   output folder must be writable or this is silently skipped.
5. The query log at `~/.cache/graphify-queries.log` is OFF by default in 0.9.108 (opt-in via
   `GRAPHIFY_QUERY_LOG` or `GRAPHIFY_QUERY_LOG_ENABLE=1`, `querylog.py`). The lane research
   note said it was on unless disabled; that was true of older versions. The image sets
   `GRAPHIFY_QUERY_LOG_DISABLE=1` anyway.
6. Shell profile: no code that writes `.bashrc`, `.zshrc`, `.profile` or PowerShell profiles was
   found. The installers (`graphify install`, `<platform> install`, `hook install`) write skill
   files, `CLAUDE.md`/`AGENTS.md`/`GEMINI.md` sections, editor settings and git hooks; none was
   run.
7. Help and some commands print an advertisement for the hosted product with a sign-up link.
8. The CLI help and the `query` handler disagree with the research note on two defaults: query
   depth defaults to 2 (not 3) on the CLI, and the token budget is approximated as 3 characters
   per token (`serve._subgraph_to_text`, `char_budget = token_budget * 3`), not 4.

## 5. Smoke run (network off)

Input: a clean export of the first tuning parent in `build/tasks/parents.txt`, i.e. the first
row whose commit has a `tune` task in `tasks.jsonl`:
`02b9557c6bee2a634ba9ae33e8705d090aade8d1` (set T1, 2 tuning tasks; seeds
`backend/tests/conftest.py` `app_client` and `backend/tests/test_attendance_integration.py`).
Made with `git archive --format=tar 02b9557c... | tar -x` into
`wider/graphify/exports/02b9557c6bee2a634ba9ae33e8705d090aade8d1/` (279 files, 3.2 MB, no
`.git`). (The very first row of `parents.txt`, `00c0a1f7...`, has held-out tasks only.)

Container: `docker run --rm --network none --cpus 6 --memory 4g --read-only --tmpfs /tmp
--tmpfs /root -e PYTHONPATH=/audit -v <export>:/src:ro -v <image>/smoke-out:/out
-v <image>/audit:/audit:ro -v <image>/smoke.sh:/smoke.sh:ro graphtest-graphify:1 sh /smoke.sh`.
Only the export (read-only), the output folder, our audit probe and the script were mounted;
nothing under `build/`, `sealed/` or `audit/` of the test was mounted. Inside, a test socket to
1.1.1.1:443 failed with "Network is unreachable" (errno 101). Full log: `image/logs/smoke.log`.

### 5.1 Build: the code-only graph

The command that builds the code layer with no model:

```sh
graphify extract /src --code-only --out /out/build --max-workers 6
```

Why this is the code-only path (read in `cli.py`, the `extract` handler):
- `--code-only` empties the document, paper and image lists before any backend is resolved
  ("skip the semantic (doc/paper/image) pass entirely"), so `needs_llm` is false.
- `GRAPHIFY_BACKEND=none` is a second guard: if any LLM work were still pending, `extract`
  would skip it and print "GRAPHIFY_BACKEND=none: skipping LLM work" instead of auto-selecting a
  provider from an API key. (No API key is set in the container either.)
- `extract` stops at `graph.json` and analysis: the report file `GRAPH_REPORT.md` and the
  community names are produced only by `graphify cluster-only` / `label`, which would call a
  model unless `--no-label` or `GRAPHIFY_BACKEND=none`. They were not run.
- Steps that would call a model: semantic extraction of docs, papers and images (`extract`
  without `--code-only`, or with `--mode deep`), `--dedup-llm`, `label`, and `cluster-only`
  without `--no-label`.
- `--max-workers 6` matches the container's 6-CPU limit (the default is the host CPU count).
- `graphify update <path>` ("re-extract code files, no LLM needed") is the incremental
  alternative; `extract --code-only` is the documented headless build and was used.

Output of the run:
```
[graphify extract] --code-only: skipping 24 non-code file(s) (18 docs, 1 papers, 5 images) — no LLM extraction
[graphify extract] found 238 code, 0 docs, 0 papers, 0 images
[graphify extract] 15 file(s) not classified (no supported extension or shebang), skipped: .dockerignore, .editorconfig, .env.example, .gitattributes, .gitignore, .gitkeep (+9 more)
[graphify extract] AST extraction on 238 code files...  [6 workers]
[graphify] Deduplicated 1 node(s) (1 exact).
[graphify extract] wrote /out/build/graphify-out/graph.json: 2046 nodes, 5599 edges, 88 communities
warning: 28 code file(s) yielded no symbols (0.04 MB) — ... src/app/main.jsx, src/features/attendance/index.js, ... Attendance.test.jsx (+23 more)
```

Time: 66.5 seconds with the export and the output on Windows bind mounts. The same build with
the export copied into a tmpfs inside the container took 2.8 seconds in total (graphify's own
`--timing`: detect 0.1 s, AST extract 1.5 s, build 0.5 s, cluster 0.2 s, export 0.1 s). With the
export on the bind mount and the output on tmpfs it took 75.6 seconds (detect 8.4 s, AST
extract 59.6 s). So almost all of the 66 seconds is reading files through the Windows bind
mount, not graphify. A warm rerun into the same output folder (incremental, all 238 files
cached) took 22.4 seconds on bind mounts.

Repeatability: two cold builds into separate folders gave byte-identical `graph.json` files
(sha256 prefix `3393736fa7c0160d` both) with the same node ids, edges and community ids.

### 5.2 Graph contents

| Measure | Value |
|---|---|
| Nodes | 2,046 (file_type: code 1,714; rationale 229; concept 103) |
| Edges | 5,599 (confidence: EXTRACTED 5,118; INFERRED 481) |
| Hyperedges | 0 |
| Edge origin | all 5,599 edges `_origin = ast` (parser); 1,993 nodes `ast`, 53 without origin (package/external nodes from `package.json`) |
| Source files with code nodes | 236 (py 99, js 40, jsx 39, ts 35, tsx 12, json 6, yml 2, sh 1, toml 1, 1 without extension) |
| Nodes without `source_location` | 221 |
| `graph.json` flags | `"directed": false`, `"multigraph": false` (direction is kept per edge; see 6) |

Relation kinds present, with edge counts: `contains` 1,172; `calls` 1,100; `imports` 918;
`imports_from` 859; `references` 627; `uses` 365; `rationale_for` 229; `method` 150; `inherits`
96; `declares` 50; `indirect_call` 20; `re_exports` 12; `extends` 1. No route, URL, table
read/write or changed-together relation exists, as addendum 7 item 20 expected. The 229
`rationale` nodes are docstrings and comments taken by the parser (not by a model); the 103
`concept` nodes are package and external names (for example npm packages from `package.json`,
`fixture`, `AsyncClient`).

Output folder `/out/build/graphify-out/` (4,932,791 bytes): `graph.json` 2,304,811 bytes;
`.graphify_analysis.json` 128,756; `manifest.json` 51,981; `cache/stat-index.json` 51,985;
`.graphify_build.json` 19; `.graphify_root` 4; `cache/last_query_stamp` 18 (written by the
query calls); and 112 per-file AST cache files under `cache/ast/v0.9.108-s45-g460503b3f2a4/`.
No `GRAPH_REPORT.md` (that is `cluster-only`'s job), no `graph.html`.

### 5.3 The four calls

All with `--graph /out/build/graphify-out/graph.json`, all exit code 0.

| Call | Command | Seconds | Result |
|---|---|---|---|
| query | `graphify query "app_client fixture in backend tests conftest"` | 0.39 | BFS depth 2 from 7 start nodes (`App()`, `client()`, `backend/tests/__init__.py`, `backend`, `fixture`, `conftest.py`, `jobs/tests/test_service.py`); 581 nodes found, 60 shown before the 2,000-token budget cut (6,661 characters of output); `app_client()` is listed, as node 33 of the 60 |
| affected | `graphify affected "app_client"` | 0.31 | Seed resolved to `app_client()`; default relations and depth 2; "No affected nodes found" (pytest fixtures are used by parameter name, so no reverse call, import or reference edge reaches the fixture) |
| path | `graphify path "app_client" "create_app"` | 0.35 | 3 hops: `app_client()` <-contains- `conftest.py` -imports_from-> `main.py` -contains-> `create_app()`; path confidence EXTRACTED |
| explain | `graphify explain "app_client"` | 0.37 | Node `backend_tests_conftest_app_client`, `backend/tests/conftest.py` L110, degree 6: contains (from conftest.py), uses `Technician` (INFERRED 0.95), references `fixture`, `AsyncSession`, `AsyncClient`, rationale_for (its docstring) |

These are smoke checks that the commands run offline, not scores. The query result shows the
lexical seeding plainly: the word "app" matched `App()` in the web app, and "client" matched an
unrelated `client()` fixture, before graph expansion.

### 5.4 No model call, no network attempt

1. Network: the container had no network (`--network none`; test connection failed with errno
   101).
2. Logs: the extract output contains no backend line ("using backend ...") and no
   "GRAPHIFY_BACKEND=none: skipping" line, because `--code-only` had already removed all LLM
   work; every edge carries `_origin = ast`.
3. Audit probe (ours, `image/audit/sitecustomize.py`, loaded into every Python process through
   `PYTHONPATH` and Python's audit hooks; it records but does not block). Across all graphify
   processes of the run (the `--version`, `extract` and its re-exec and 6 forked AST workers, and
   the four calls) it recorded:
   - 0 socket, DNS, `http.client` or `urllib` connection events;
   - 0 files opened under the home directory `/root` (read or write);
   - file writes only under `/out/build/graphify-out` (121 writes) and `/dev/null`;
   - processes: 1 `os.exec` (the `PYTHONHASHSEED=0` re-exec), 6 `os.fork` (AST workers),
     2 `subprocess.Popen` (`git rev-parse HEAD`);
   - imports: `graphify.llm` once (inside `extract`, for backend detection helpers; no backend
     function was called), `graphify.security` / `http.client` / `urllib.request` (module-level
     imports of the path guards), and an attempted `tiktoken` import that failed because it is
     not installed. No model-provider package (`openai`, `anthropic`, `boto3`) exists in the
     image.
4. The container also ran with a read-only root file system (`--read-only`, with tmpfs only at
   `/tmp` and `/root`), so graphify could not have written anywhere except the mounted output
   folder and those two tmpfs folders; the audit shows it wrote to neither tmpfs.

## 6. Query commands and options in the installed version (0.9.108)

Read from `cli.py` (handlers), `serve.py` (`_score_query`, `_pick_seeds`, `_bfs`, `_dfs`,
`_subgraph_to_text`, context filters) and `affected.py`.

`graphify query "<question>"`
- `--budget N` / `--budget=N`: output cap in tokens, default 2,000, counted as about 3
  characters per token (character budget = 3 x N). The answer reports how many nodes were cut
  and the budget that would show all.
- `--depth N` / `--depth=N`: traversal depth 1 to 6, default 2.
- Defaults for budget and depth can come from a `.graphifyrc` (`query_budget`, `query_depth`)
  in the graph's project root, which is the parent of the `graphify-out` folder (here the
  output folder, not the export). Explicit options win.
- `--dfs`: depth-first instead of the default breadth-first. Both skip expanding through hub
  nodes whose degree is at or above the 99th percentile of degrees (floor 50), except seeds.
- Traversal is over the graph loaded as UNDIRECTED (callers and callees both); direction is
  only used when printing edges.
- Seeds: question split into terms; each node scored on label and source path (exact,
  substring, token, trigram, inverse frequency); up to 3 seeds by score, stopping when a score
  falls below 20% of the top score, de-duplicated by label, plus at least one seed per query
  term that matched anything. `--seed X` (repeatable) starts from a given node id, label or
  file path instead of keyword matching.
- `--context C` (repeatable): keep only edges of that context (`call`, `import`, `field`,
  `parameter_type`, `return_type`, `generic_arg`, `attribute`, `export`, `inherits`,
  `implements`, `extends`, with aliases). Without `--context`, words in the question such as
  "calls", "imports", "module", "returns", "parameter" switch on the matching filter
  automatically.
- Output order: file-first: seeds, then nodes grouped by file, best-scoring file first, then by
  score, hop distance from the seeds and degree; cut at the budget.
- Undocumented in `--help`: `--no-doc-demotion` / `--demote-docs` (document nodes are demoted
  by default).
- Exit codes: 0 answer, 3 ambiguous name, 4 no match.

`graphify affected "<node>"`
- `--relation R` (repeatable): relations walked in reverse. Default: `calls`, `indirect_call`,
  `references`, `imports`, `imports_from`, `dynamic_import`, `re_exports`, `inherits`,
  `extends`, `implements`, `uses`, `mixes_in`, `embeds`, `defines`, `requires`.
- `--depth N`: reverse traversal depth, default 2. No budget option.
- Exit codes 3 (ambiguous) and 4 (no match) as for query.

`graphify path "<A>" "<B>"`
- Shortest path, DIRECTED by default (`--directed`); `--undirected` ignores direction. Loaded as
  a directed multigraph so parallel relations survive. No depth or budget option.

`graphify explain "<node>"`
- The node and its connections; the 20 most connected by default, `--all` for every one. No
  depth or budget option.

All four take `--graph <path>` (default `graphify-out/graph.json` in the working directory).

## 7. Surprises and notes for the next lanes

- File reads through the Windows bind mount dominate the build time (66.5 s versus 2.8 s with
  the export in tmpfs). For 133 parent commits, copy each export into a tmpfs inside the
  container before `graphify extract`.
- The CLI's "affected" found nothing for a pytest fixture, and the query seeds were pulled
  toward lexically similar names in other parts of the repository. These are properties of the
  shipped commands that the adapter will meet; they are reported here as observations from one
  smoke call, not as results.
- `--seed` (start from a node id, label or file path) is a shipped option of `query` that maps
  directly onto task seeds that are a file path plus a symbol; it is a candidate for the tuning
  configurations.
- The 28 code files that "yielded no symbols" include JavaScript barrel files (`index.js`), a
  `main.jsx` entry and a `.test.jsx` file; they still have a file node but no symbol nodes.
- That commit's export contains one file under `.claude/` (`launch.json`); it produced no node
  in the graph, while `.github/workflows/ci.yml` and `.prettierrc.json` did. I did not check
  which rule (hidden folder or file kind) left it out.

Not done in this step: no tuning configuration, no held-out task, no adapter, no scoring; the
Sigstore signature of the attestation was decoded, not verified; `cluster-only`, `label`, the
MCP server and the document layer were not run.
