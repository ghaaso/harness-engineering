# Phase 0 feasibility counts for the wider knowledge-layer test (2026-11-13)

Lane: FEASIBILITY COUNTS. No model call and no agent run was made. Nothing was installed or downloaded.
Nothing in the repository was written except this folder. No branch was checked out or switched.
Past commits were read only with `git archive` exports into the scratch folder and with read-only git object reads.

Scratch folder (scripts, exports, logs, raw JSON):
`C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/feas`.
The small JSON outputs are copied into `data/` beside this file; the scripts are in `scripts/`.

What I did that touched shared machine state, so the reader can judge it:
- I copied (did not install) the existing `node_modules` folders of the main checkout (197 MB web, 442 MB mobile) into the scratch folder and linked them into each export with a directory junction.
- I ran the backend checks with an existing Python virtual environment that belongs to another session's worktree (`.claude/worktrees/p90a-week-export-script-4f99a5/backend/.venv`). I used it read-only: bytecode writing was off and every cache (ruff, mypy, pytest, import-linter) was disabled or pointed at my scratch folder.
- I started one container of my own (`feas-phase0-pg`, from the `postgres:16-alpine` image already on the machine, the image CI uses, 512 MB memory cap) for about 7 minutes to run integration tests at two parents, then removed it. I did not touch any other container.
- I read graphify's public source on GitHub (two files from branch `v8`, through `raw.githubusercontent.com` and the GitHub API). No project detail was in any URL.

Numbers move: `main` advanced twice while I worked (34f1dcd, then 02af3cc, then 53db3b8). Section 2 is measured at `main` = 53db3b8.

---

## 1. Runnable history: can the project checks run at old parents with what is already installed?

### 1.1 The sample

- Population: non-merge commits reachable from the frozen commit `a31924a`, dated 2026-06-01 or later, that change 2 to 30 product code files (`.py/.ts/.tsx/.js/.jsx/.mjs/.cjs` under `backend/`, `src/`, `technician-app/`) which already existed at the parent. This is the finished test's T1 rule. Count: **141 commits** (66 in June, 73 in July, 2 in August).
- Sample: 12 commits, seeded (sha256 of `feasibility-phase0-2026-11-13|<sha>`, smallest first within each month), quota 5 June, 5 July, 2 August. All 12 parents have a snapshot in the facts cache. 5 are tuning-split parents of the finished test, 7 are its held-out (now spent) parents. List: `data/sample12.json`.
- Runtimes touched: 6 of the 12 touch the backend, 7 touch the mobile app, 2 touch the web app.

### 1.2 What is already on the machine

| Runtime | Present | Missing |
|---|---|---|
| Backend | One virtual environment with every backend and dev dependency: Python 3.12.16 (uv-managed), fastapi 0.162.5, sqlalchemy 2.1.8, asyncpg 0.32.0, alembic 1.20.1, pytest 9.2.0, pytest-asyncio 1.5.0, mypy 2.4.1, ruff 0.17.5, import-linter 2.16; 156 MB; in another session's worktree | No venv in the main checkout. The backend has **no lockfile** (only version ranges in `pyproject.toml`), so the package versions CI used in June or July cannot be recovered by anyone; any environment resolves today's versions. Postgres for integration tests: images present locally (`postgres:16-alpine`, 420 MB), no container of mine kept |
| Web | `node_modules` of the main checkout (197 MB), built from a lockfile identical in every non-optional package to the lockfile of every July and August parent | For 62 of the 66 June parents the lockfile differs: 42 dev packages missing and 45 at other versions (an older test toolchain). There is no web type-check: the web app is JavaScript with a `jsconfig.json`; CI runs lint, prettier, vitest and the build, not `tsc` |
| Mobile | `technician-app/node_modules` of the main checkout (442 MB), close to every parent's lockfile (0 to 5 non-optional packages at another version) | Parents dated between 2026-06-07 and 2026-07-11 list `@react-navigation/bottom-tabs`, which was later removed; it is not in the existing tree and not in the local npm cache (860 MB, searched for that package only) |

Over the whole 141-commit population: **89 commits** have every non-optional package their touched JavaScript runtimes need already present (web: 79 of 141 parents; mobile: 36 of 140 parents with a mobile lockfile). Of the 32 commits that touch the web app, 11 match; of the 53 that touch the mobile app, 22 have no missing package. The 123 distinct parents use 4 distinct web lockfiles and 14 distinct mobile lockfiles. (`data/q1_pop_env.json`; method: compare each parent's `package-lock.json` "packages" entries with `node_modules/.package-lock.json`, ignoring optional and platform-specific packages.)

### 1.3 Results at the 12 parents (Windows, natively, not the Linux CI image)

| Check | Ran | Passed | Notes |
|---|---|---|---|
| ruff check, ruff format --check | 12 | 12 | |
| mypy app | 12 | 12 | 31 to 141 source files, 6 to 9 s each |
| lint-imports | 10 | 10 | The 2 earliest June parents have no import-linter contracts yet |
| pytest, unit (integration skipped: no database URL) | 12 | 12 | 57 to 632 passed, 4 to 123 integration tests skipped per parent, 0.3 to 8.4 s |
| pytest with Postgres + `alembic upgrade head` (2 parents only) | 2 | 2 | 2026-08-02 parent: 751 passed in 370 s. 2026-06-06 parent: 61 passed in 1.3 s |
| `alembic check` (same 2 parents) | 2 | 1 | The June parent reports model-migration drift (an index). June CI ran only `alembic upgrade head`, not `alembic check`, so this is the code as it was, not the environment |
| web vitest | 12 | 12 | 16 to 106 tests; passed also at the 5 June parents with the drifted toolchain |
| web eslint | 12 | 12 | |
| web vite build | 12 | 12 | |
| mobile jest | 12 | 12 | 13 to 334 tests |
| mobile tsc --noEmit | 12 | **7** | The 5 failures are all 4 errors from the one missing package `@react-navigation/bottom-tabs` (environment, not code) |

At the 12 task commits themselves (the state a change task must reach): backend ruff, format, mypy, import-linter (10 configured) and unit pytest passed at 12 of 12; web vitest, eslint and build passed at 12 of 12; mobile jest passed at 12 of 12 (13 to 334 tests); mobile tsc passed at 7 of 12, the 5 failures again being only the missing `@react-navigation/bottom-tabs` (`data/children_backend.txt`, `data/children_js.txt`). So for every sampled commit the backend, web and mobile test suites pass both before and after the change with no install, which is what a hidden-test oracle needs; the mobile type-check does so only outside the June-July window.

Total wall time for the five fast backend checks plus the five JavaScript checks: about 60 to 90 s per parent; the full integration suite adds about 6 minutes for an August parent.

### 1.4 What an install would need (an owner decision)

- Exact JavaScript fidelity for every parent: `npm ci` from each parent's own lockfile, from the npm registry (network). 3 more web trees (about 197 MB each) and about 13 more mobile trees (about 442 MB each): roughly 6 to 7 GB of disk, minutes each. A narrower fix: install only `@react-navigation/bottom-tabs` (one package, network) into a copy of the mobile tree for the June-July parents.
- Backend: none needed if the existing venv may be used or copied (156 MB). A durable copy is advisable because it lives in another session's worktree, which can be cleaned up at any time. A fresh one needs `pip install -e .[dev]` from PyPI (network), about 156 MB; the gate script `docs/program/lab/ff-gates.sh` does exactly this inside `python:3.12-slim`, with a shared pip cache volume that belongs to the owner's gate runs.
- Linux parity with CI: the local images `python:3.12-slim` and `node:22-bookworm` exist, but running inside them still needs the same package installs (network unless caches are shared).

**Consequence.** Phase 0's first stop rule ("fewer than 25 runnable commits") is not triggered for the backend: every sampled parent ran every backend check with no install. For change tasks that touch only the backend, or July and August mobile and web code, the hidden-test oracle can run today. Exact runs at most June mobile and web parents need an install. Measured on 12 commits, not on all 141.

## 2. Fresh commits after the frozen commit a31924a (2026-08-03)

Rule: product code = a non-markdown file under `backend/`, `src/`, `technician-app/`, or a web build file at the root. "Usable" = the T1 rule (2 to 30 existing code files). Measured with `git rev-list <ref> --not a31924a`, `main` = 53db3b8.

| Where | Product-code commits | Usable | Dates | By runtime (usable; a commit can count in two) |
|---|---|---|---|---|
| `main` | 7 (all squash merges of ship-plan pull requests) | 6 | all 2026-11-13 | backend 4, web 4, mobile 2 |
| Other refs: commits of branches already squash-merged into `main` | 39 | 31 | all 2026-11-13 | backend 17, web 14, mobile 9 |
| Other refs: work not on `main` in any form | 26 | 19 | 23 on 2026-11-13, 1 on 2026-11-01, 2 on 2026-09-23/24 | backend 12, web 1, mobile 7 |
| Dependency-bot branches | 2 | 0 | 2026-08-10, 2026-09-28 | |

Distinct pieces of work after the freeze: 7 merged pull requests plus 5 unmerged lines of work (P2b-1 mobile, P9-0a week export, P3a self-host, one jobs fix on the docs branch, one geofence fix). The branch commits of merged work are sub-steps of the squash commits and overlap them; using both would count the same work twice.

**Consequence.** About 25 fresh usable change tasks exist at most if branch sub-commits are used (6 on main plus 19 unmerged, or 31 sub-commits instead of the 6 squashes), almost all from one day. 40 fresh held-out change tasks do not exist. The 14-day follow-up-fix column cannot be filled for any of them before 2026-11-27. A prospective held-out set (design-check P9) remains the only route; its rate is roughly the ship plan's pace.

## 3. Needed-but-not-edited context for the 12 commits (static, from the facts snapshots)

Method (`scripts/q3_needed.js.txt`): diff the parent and the commit with zero context; a definition is changed when an old-side hunk overlaps its line range (innermost definition only; a pure insertion touches the lines around it). From the parent's facts snapshot I then count files the commit did **not** edit that: call, render, import, inject, inherit or use a changed production definition ("callers"); are tests that reference a changed definition, mock its file, or call a changed route; are client call sites (`calls_url`) of a changed route; and CLAUDE.md invariants whose `constrains` anchor lies on changed lines. "Signature touched" = the hunk covers the definition's first line, a proxy for a change callers can see.

| Count per commit (12 commits) | Commits with 0 | Median | Max | Sum |
|---|---|---|---|---|
| Changed production definitions | 1 | 4.5 | 20 | |
| Caller files not edited (any changed definition) | 2 | 1 | 3 | 19 |
| Caller files not edited, signature touched | 10 | 0 | 1 | 2 |
| Test files referencing changed code, not edited | 7 | 0 | 4 | 10 (3 reached only via a route) |
| Client call-site files of changed routes, not edited | 10 | 0 | 1 | 2 |
| CLAUDE.md invariants anchored on changed lines | 10 | 0 | 2 | 4 |
| Union of caller, test and client files | 1 | 2 | 7 | 31 |
| Strict set (signature-touched callers, unedited tests, clients, invariants) | 6 | 0.5 | 6 | 18 |

- Ratio of the union to edited code files: median 0.35 (about one unedited related file per three edited code files).
- The invariant column is structurally empty in June: CLAUDE.md first appeared on 2026-07-01, and the 5 June parents have 0 invariant nodes (July and August parents: 5 to 20 invariants, 26 to 90 anchors).
- The one commit with nothing (`6798ad27`, a docs truth pass) edits only comments in code.
- Caveats: static edges only (an edge the extractor missed is a missed item); "references changed code" is not "had to be read"; `constrains` anchors come from the finished test's docs extractor, which A1 and A2 reuse, so this column cannot serve as an independent reference (design-check P8a). The oracle column of the design ("tests that fail when the production change is applied without its test edits") was not computed.

**Consequence.** The column is not near empty in the loose sense (11 of 12 commits have at least one related unedited file, 31 files in all), but it is thin: mostly 1 to 3 files, and half the commits have nothing once only signature changes, unedited tests, route clients and invariants count. A change-task set built on "context the agent must find but not edit" will have little to discriminate on in about half its tasks. That supports scoring needed context from the run-the-tests oracle and the question set, not from static items alone.

## 4. Recorded sessions

Where: `C:/Users/User/.claude/projects/`, every folder whose name contains `EMS-workshop1` (the main checkout plus 14 worktrees). Method: the earlier scoring lane's `session_lookups.py` (same zones; a search-then-read pair = a Grep, Glob or shell search whose result names a repo file that the same transcript Reads within the next 6 calls), extended with per-folder counts and per-document reads (`scripts/q4_sessions.py`).

| | Earlier count (`research/lane-scoring.txt`) | Now |
|---|---|---|
| Transcript files | 1,050 | 1,402 (1,176 starting in November, 164 in October) |
| Tool calls | 23,046 | 44,674 |
| Read calls on product code | 169 | 243 |
| Edit or Write calls on product code | 10 (brief.md) | 330, in 19 transcripts (the ship-plan worktree sessions of 2026-11-13) |
| Search-then-read pairs | 181 (139 distinct) | 366 (301 distinct) |
| Distinct pairs by kind of file opened | program docs 106, other in repo 48, code 26, product docs 2 (of 181, not distinct) | **program documents 212, product code 32, product documents 6**, other in repo 52 |

Searches: Grep 1,182 outside the repo, 837 in program documents, 428 elsewhere in the repo, 119 in product code, 50 in product documents; 12,699 shell searches whose target was not classified.

Replay without sending anything: yes. Each pair (query, tool, opened file) is in local JSONL, and replaying means running the recorded query against a local tool and checking whether the opened file is in its answer: no model and no network. Limits: transcript lines carry the working folder, branch, time and Claude Code version but **no commit SHA**, so the code version at session time can only be approximated from branch and time; program documents are mostly untracked and change daily, so their state at session time cannot be rebuilt; some queries name their own answer. Shell reads (`cat`, `sed -n`) are not counted as reads.

**Consequence.** The replay set R grows from 139 to 301 distinct lookups, but 212 of them open program documents, and only 32 open product code. The new product-coding sessions (19 transcripts, 330 code edits) are the first recorded product work on this machine; they are the ship plan's own sessions, all on 2026-11-13, so they overlap the fresh commits of section 2.

## 5. Documents

Method (`scripts/q5_docs.js.txt`): product documents = the 27 `.md` files tracked at the frozen commit (text as of that commit); program documents = the 200 `.md` files under `docs/program/` in the working tree now (24 tracked on the current branch, 176 untracked). Tokens = bytes / 4 (an estimate, not a tokenizer count). Reads = Read tool calls on that file in the 1,402 transcripts.

| Corpus | Files | Words | Tokens (est.) | Reads in sessions |
|---|---|---|---|---|
| Product documents (frozen commit) | 27 | 63,304 | about 110,900 | 30 reads of 6 documents (the open-work handoff 15, the backup runbook 7) |
| Program documents (now, `.md`) | 200 | 796,337 | about 1,388,300 | 1,186 reads of 129 documents (knowledge-store design 156 reads in 31 transcripts, ship plan 137 in 42) |
| Program files that are not `.md` (scripts, JSON, text evidence) | not counted | | | 1,155 reads of 305 files |
| Other `.md` added after the freeze (`docs/ORCHESTRATION-DESIGN-2026-10.md`) | 1 | 12,092 | about 20,400 | 29 reads in 9 transcripts |

Backticked citations, resolved at the frozen commit:

| Corpus | File-like tokens | Resolve to one file | Ambiguous | Do not resolve | Symbol-like tokens: unique / ambiguous / none |
|---|---|---|---|---|---|
| Product docs, earlier rule | 749 | 494 | 80 | 169 (+6 absolute paths) | 548 / 256 / 234 of 1,038 |
| Product docs, cleaned rule | 720 (29 globs and placeholders removed) | 569 | 80 | **65** | |
| Program docs, earlier rule | 1,882 | 178 | 7 | 1,671 (706 of them resolve in today's working tree, 18 on today's main) | 215 / 116 / 1,126 of 1,457 |

"Earlier rule" = the finished research's `docs_extract.js` rule (a token with a 1-5 character extension or a trailing slash; exact path or unique suffix). "Cleaned rule" also expands brace groups (`{queue,sync}.ts`), counts a directory as resolved if any file lies under it, and drops `<placeholder>` and `*` globs. Symbols resolve against definition, setting, table, column and route names in the frozen facts snapshot.

- The earlier "517 of 1,268 unresolved" mixed both corpora and the live tree. At the frozen commit, product documents have 169 of 749 unresolved by the same rule, and at most 65 of 720 by the cleaned rule. The 65 still include non-citations (dotted identifiers such as `request.client.host`, a backup file name) and deliberate negative mentions (CLAUDE.md says there is no `core/sentry_api.py`). So stale file citations in product documents are at most about 9 % at the frozen commit; the large unresolved share sits in the program documents, which mostly cite later files, scratch files and other documents.

**Consequence.** The product-document layer the meaning arm (A2) would read is small (about 111k tokens, 27 files) and is read rarely in sessions (30 reads). The program documents are about 12.5 times larger and read about 40 times as often; they are where the owner's session spend goes, and they are untracked and changing. A doc stratum on frozen copies of program documents is the only way the test can touch that spend (design-check P13).

## 6. Graphify fit (read from lane-graphify.md and graphify's public source, v0.9.108, branch v8; not installed, not run)

Languages: the repository's code at the frozen commit is 218 `.py`, 52 `.js`, 65 `.jsx`, 2 `.mjs`, 109 `.ts`, 31 `.tsx` files. Graphify's code layer parses all of them: `tree_sitter_python`; `tree_sitter_javascript` (`.js/.jsx/.mjs/.cjs`, with JSX elements counted as calls); `tree_sitter_typescript` for `.ts` and its `language_tsx` for `.tsx` (`graphify/extract.py`, language configs near lines 1418 to 1485). It resolves `tsconfig`/`jsconfig` path aliases, re-exports and dynamic imports.

Relation kinds its code layer emits (relation literals found in `extract.py` and `extractors/engine.py`): calls, indirect_call, imports, imports_from, re_exports, dynamic imports, contains, method, defines, inherits, implements, references (a Python decorator becomes a `references` edge to the decorator's name), references_constant, uses_static_prop, bound_to, listened_by; plus rationale_for and cites from comments and documents.

What it would miss here, counted on the frozen commit's facts snapshot (18,875 edges):
- Edge kinds with a graphify analogue: 11,969 edges (calls 4,886, defines 3,548, contains 1,185, imports 1,095, uses_constant 825, renders 381, inherits 49). An analogue kind is not the same edges; resolution quality was not compared.
- Edge kinds with no graphify analogue: 4,604 edges. Routes and cross-runtime HTTP: `registers_route` 85, `calls_url` 78, `test_calls_route` 441 (a FastAPI `@router.get("/path")` decorator yields only a `references` edge to `router.get`; the path string is not kept, so no route node exists to join a client URL to). Data: `reads_table` 136, `writes_table` 252, `writes_column` 111, `has_column` 439, `maps_table` 42, `foreign_key` 70, migrations 275 (graphify's SQL extractor reads `.sql` files and live Postgres schemas; this repository has 0 `.sql` files and defines tables in SQLAlchemy models and Alembic migrations). Tests: `mocks` 93 (`vi.mock`, `jest.mock`). Config and outbox: `reads_setting` 188, `enqueues_kind` 35, `kind_handled_by` 10, scheduler 12. Boundaries: import-linter `contract` 254. History: `co_changed` 1,896 (graphify: an open pull request only). Invariants: `constrains` 90 (graphify would get document-to-code links only from its model-read layer). Mobile navigation: 60.
- Unclear without running it: `depends_injects` 208 (FastAPI `Depends`), `passes_callable` 128, `overrides` 57, doc `cites` 529 and `mentions` 1,380.
- In the 12 sampled commits, 5 of the 31 needed-but-not-edited files were reachable only through route edges (3 tests via a route, 2 client call sites), which graphify's code layer does not build.

**Consequence.** G1 (graphify code layer) is runnable on every language here, but it cannot answer the cross-runtime and data questions (which client calls this route, which code writes this table) that the finished test's typed graph covers; those question kinds must be reported as a stratum where G1 is expected to fail for lack of the edge, not as a ranking contest. G2's document layer needs the model-read decision (design decision 2). Whether `graphify update .` works without `.git` was not checked (design-check P7).

## 7. Blockers

1. 40 fresh held-out change tasks do not exist (about 25 usable at most, nearly all from 2026-11-13); the follow-up-fix column cannot be filled before 2026-11-27.
2. Exact check runs at June mobile and web parents need `npm ci` from the network (or one missing mobile package); about 52 of the 141 historical commits are affected.
3. The only backend environment lives in another session's worktree; it must be copied (156 MB) or rebuilt from PyPI before anything durable depends on it. Historical backend package versions cannot be recovered (no lockfile).
4. Integration tests need a Postgres container per run (image present, no download) and about 6 minutes per August-era parent on this PC, competing with the ship plan's gate slots.
5. Static needed-but-not-edited items are thin (strict set empty in 6 of 12 commits); CLAUDE.md invariant anchors exist only from July and come from an extractor that two arms reuse.
6. Recorded lookups carry no commit SHA; 212 of 301 open untracked, changing program documents.
7. Graphify lacks route, URL, table, mock and setting edges for this stack; its `update` behaviour without git is unverified.

## 8. What this lane did not do

- No answer-changed-anchors-unchanged count for set K, and no check that the 190 snapshots form consecutive runs (both in the draft's phase 0 list, not in this lane's six questions).
- The oracle column "tests that fail when the production change is applied without its test edits" was not computed (it is now known to be runnable for the sampled commits).
- Integration tests ran at 2 parents only; Linux (CI) parity was not tested; nothing ran inside the CI image.
- Graphify was read, not run; its edge quality on this repository is unknown.
- Bash-based reads in transcripts were not counted; token figures for documents are bytes / 4.

## 9. Is an agent pilot possible?

Yes, a pilot is possible now on the historical (spent) commits, which the draft already assigns to tuning: its 12 change tasks can be drawn from the 89 of 141 commits whose touched JavaScript runtimes have every package present (the backend checks ran with no install at all 12 sampled parents and commits), the test suites pass before and after each sampled change without any install, and 301 recorded lookups can be replayed offline. A pilot of 12 change tasks and 30 questions, as drafted, is within reach; a held-out main run of 40 change tasks is not, because only about 25 fresh usable commits exist and almost all are from one day. Before the pilot the owner must decide: whether the existing backend environment may be copied into a durable folder (or a PyPI install done); whether `npm ci` from the network is allowed for the June-era parents or the pilot is restricted to July and August commits; whether a Postgres container may run during pilot runs alongside the ship-plan gates; and the decisions the draft already lists (copying the facts cache, model reads of documents, graphify install, the agent model). Nothing here says whether any layer saves tokens; no agent ran.
