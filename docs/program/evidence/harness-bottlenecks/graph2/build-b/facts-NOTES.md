# facts/ - the shared FACTS extractor (protocol section 3, addendum 2 section D)

Current extractor_version: **59da7b753a4d908e** (the previous one was e409baad8b0c794b). The
version is the sha256 of the five extractor sources (build_facts.js, py_extract.py, ts_extract.js,
docs_extract.js, git_extract.js), first 16 hex digits. The tools/ scripts are not part of it.

## What is here

| File | Role |
|---|---|
| `build_facts.js` | Orchestrator and join. Exports one commit, runs every stage, writes the outputs. |
| `py_extract.py` | Python stage (stdlib `ast`, run with `python -I`, `PYTHONHASHSEED=0`). |
| `ts_extract.js` | TypeScript/JS stage (TypeScript 5.3.3 compiler API, two hermetic programs: mobile, web). |
| `docs_extract.js` | Docs stage: doc / section / doc-id nodes, cites, mentions, invariants, constrains. |
| `git_extract.js` | Co-change stage (ancestors only, same-PR drop, recency weight). |
| `build_cache.js` | Builds every parent into a cache folder, writes the sealed side records. |
| `cache/` | One folder per parent SHA (190), plus `cache/build_log.jsonl` (time, counts, stage status; no task data). |
| `tools/selftest.js` | Self-test of every rule added in this version, on small synthetic fixtures (no repository code). |
| `tools/verify_cache.js` | Leak and coverage check over a whole cache (section "Verification"). |
| `tools/same_build.js` | Byte comparison of two builds (meta.json without `timings_ms`). |
| `tools/compare.js` | Node and edge counts by kind between two builds, plus added and removed edges of chosen kinds. |
| `tools/precision.js` | Seeded sampler over the edge groups this version added or changed, for reading by hand. |
| `sample.js`, `samples/*.txt` | The previous version's sampler and its 20-edge samples (kept for the record). |

Outside this folder: `../sealed/facts_meta/<parent>.json` (one per cache folder: the task commits
given as the switch, their PRs, whether there are several, and the dropped same-PR commits) and
`../sealed/facts_meta/build_log.jsonl` (build log with the task children). Arms must not read them.

## How to run (Windows host; addendum 1: facts are built there)

```
node build_facts.js <commit-sha> <outdir> [--task <child-sha>,...] [--sealed-out <file>] [--skip kind,...] [--only kind,...] [--keep-export]
node build_cache.js [--out DIR (default cache.new)] [--conc K (default 3)] [--limit N] [--only sha,sha]
node tools/selftest.js
node tools/verify_cache.js [cache-dir]
node tools/same_build.js <dirA> <dirB>
node tools/compare.js <before-dir> <after-dir> [kind,kind] [--max N]
node tools/precision.js <before-dir> <after-dir> <export-dir> [n=20] [seed=7]
```

- The export is `git -C <repo> archive --format=tar <sha> | tar -x` into `$FACTS_TMP/export-<sha12>-<pid>/`
  (build_cache.js sets `FACTS_TMP` to `build/tmp/facts-fix`), deleted after the build. The repo is only read.
- `--task` names the child commit(s) being predicted; co-change drops the commits of their PRs.
  `--sealed-out` is where the task data goes; nothing about the task is written to the facts folder.
- `--skip` / `--only` switch edge classes by kind. Nodes that had an edge before the switch and have
  none after it are pruned (`meta.counts.pruned_orphan_nodes`); a default build prunes nothing.
- A stage that throws degrades to empty and is recorded in `meta.json.stages.<stage>.status`.
- To rebuild the cache: `node build_cache.js --out cache.new`, `node tools/verify_cache.js cache.new`,
  then rename `cache` to `cache.old`, `cache.new` to `cache`, and delete `cache.old`.

Outputs per build (formats unchanged): `nodes.jsonl` `{id, kind, path, name, line_start, line_end,
signature, runtime, slice, is_test, tokens}`, `edges.jsonl` `{src, dst, kind, evidence_path,
evidence_line, confidence, attrs}`, `commits.jsonl`, `experimental/response_fields.{nodes,edges}.jsonl`,
`meta.json`.

**Changed formats.** `commits.jsonl` rows are now `{sha, time, pr, n_files, used, files}`: the field
`dropped` is gone because dropped commits are no longer listed, and `pr` is the PR as known at the
build commit. `meta.json`: `switches.task` is gone; `stages.git.stats` no longer has
`task_children`, `task_prs`, `commits_dropped_same_pr`, `commits_dropped_in_flight` or
`ancestor_non_merge_commits` (it has `commits_listed`); `counts.pruned_orphan_nodes` is new.
Node and edge line formats are unchanged; new values appear only inside `attrs` (listed below).

## What changed in this version (addendum 2, section D)

### a, b. Leak and the co-change drop rule
- `commits.jsonl` holds only commits an arm may use. A dropped commit is removed entirely (no file
  list, no label). `pr` of a listed commit comes from P's own history only (a "Merge pull request #n"
  merge that is an ancestor of P, or "(#n)" in the commit's own subject), so no label carries
  knowledge of a later merge.
- `meta.json` names no task commit and no PR number. The task switch, the task PRs and the dropped
  commits go to `sealed/facts_meta/<parent>.json`.
- Drop rule: an ancestor of P is dropped only when it is in the same PR as a task commit built on P
  (PR membership read from the frozen history, so an in-flight sibling is recognised). The
  in-flight rule is removed: commits of other PRs that were still open at P are now kept.
- Several task PRs on one parent: the union of their siblings is dropped. This happens on **26 of
  190 parents** (on 181 parents at least one child commit has a PR).
- Whole cache: **378 commits dropped on 78 parents** (the previous version listed 413 commits with a
  drop label, same-PR and in-flight together).
- The off-main parent 8dafcecc gets its task switch from its child on another ref (read with
  `git rev-list --all`); the frozen commit has no child on main and gets no task switch.

### c. Mobile config reads
`config.attendance.maxDutyHours`, `config.video.*`, `config.compress.*` and the shorthand
`config.apiUrl` now give `reads_setting` edges to `setting:technician-app/src/lib/config.ts#<chain>`
nodes (attrs.via = `config_object`). Cause of the hole: the holder-chain walk stopped at the
`as const` wrapper. The fix walks through `as`, `satisfies` and parentheses for config reads only;
definitions keep the old walk (switching it on there would turn every member of a `jest.mock`
factory `() => ({...})` into a new definition node: 72 new test-file nodes, tried and reverted).
Intermediate objects (`config.video`) are not settings. The CLAUDE.md invariant 9 now has its
`constrains` anchor on `config.attendance.maxDutyHours`. Covered by `tools/selftest.js`.

### d. SQL-text table edges
SQL is taken only from string literals passed to `text()`, `execute()` (including `op.execute`,
`bind.execute`) or `exec_driver_sql()`: a literal, an f-string's literal parts, a literal bound to a
local or module name, `+` of literals, or `"...".format(...)`. Docstrings, comments and other
strings no longer count. `DELETE FROM`, `UPDATE`, `INSERT INTO`, `INTO`, `TRUNCATE` are writes;
`FROM`, `JOIN` are reads; `ALTER TABLE` gives only `migration_touches` (not a data read or write).
Evidence points at the line where the keyword and table name stand inside the literal
(attrs.op = the keyword). The same rule feeds `migration_touches` (attrs.op = `sql`, attrs.sql =
the keyword). At the frozen commit: 5 docstring edges removed (`LocalPunch`, the
`backfill_customers.py` module docstring, `run_outcome_auto_link_scan`, two migration module
docstrings), 1 `DELETE FROM` relabelled read to write, 8 `ALTER TABLE ... VALIDATE CONSTRAINT`
migration touches added.

### e. Recall holes
- URL in a ternary (`project ? \`/api/...?p=\` : "/api/..."`): both arms are read (ops
  `getSentryIssues`, now 78 of 78 production client sites matched).
- URL literals looped over a tuple or list: Python `for path in ("/api/a", ...): client.get(path)`
  (6 test calls in attendance `tests/test_router.py`) and JS `for (const u of ["/api/a", ...])`.
  Evidence line = the literal's line.
- Unit-of-work writes through query-flow typed locals: `x = (await s.execute(select(M)...)).scalars()`,
  `list(...)`, `[r for r in rows if ...]`, slices, `list[M]` / `dict[K, list[M]]` annotations and
  `.items()`, `.scalar_one_or_none()`, then `for row in rows: row.attr = ...`. A name bound to two
  models in one function stays untyped. attrs.typed = `query_flow`. Frozen commit: 10 writes_column
  and 10 writes_table edges (`upsert_token` and four backfill or unlock scripts).
- Calls through a Protocol-typed attribute or parameter: the call keeps its edge to the Protocol's
  stub method and gains one edge to the same-named method of each production class implementing
  the Protocol (nominal base or structural: defines every Protocol method), confidence 1/k,
  attrs.how = `protocol_impl`. `self._rail = rail or get_payment_rail()` is now typed. Frozen
  commit: 2 Protocols (`PaymentRail`, `StorageClient`), 1 implementation each, 13 implementation
  edges plus 1 newly resolved stub call.
- Environment reads: Python `os.environ[...]`, `os.environ.get(...)`, `os.getenv(...)`; JS
  `process.env.X` / `import.meta.env.X` in root-level build configs no program compiles
  (`vite.config.js`, `vite.ops.config.js`). `FIXFLOW_<field>` resolves to the Settings field node;
  any other key to `setting:env/<KEY>`.
- Invariant tokens: `start.sh` (file anchors now accept `.sh`), `transition()` (a generic name in
  call form is accepted when the files the bullet names narrow it to one definition),
  `JobDetail.evidence` (an `Owner.field` whose field is not a node anchors to the owner when exactly
  one class has that name), `cursor.last_seq = ...` (an assignment's right side is dropped). All 5
  missing anchors are now present.

### f. Citations
- A markdown link's `:line` or `:a-b` suffix is split off before resolving (5 `missing:` nodes at
  the frozen commit become resolved citations; the line is kept in attrs.line).
- A tie between at most 3 candidates (the fan-out limit; the brief says two) is broken, in order, by:
  same directory as a file cited on the same line (existing), a path written relative to a runtime
  root (`tests/conftest.py` = `backend/tests/conftest.py`), the document's own folder, the
  directory of files the section cites, the directory of files the document cites, then the slice of
  files the section or document cites. Only a unique winner counts; attrs.context records which rule.
  The first version of this rule picked the wrong `conftest.py` by slice majority; the runtime-root
  rule ahead of it fixed that case.

### g. Labelling
- `is_test` now matches `vitest.setup.*` and `*_test.py`, in all three stages (vitest.setup.js was false).
- `session.delete(x)` is a write only with a session receiver (`session`, `db`, `conn`, or an
  attribute named like `*session*`); `self._repo.delete(x)` no longer is (2 edges removed).
- `settings.<method>()` (or any Settings method) is not a setting read; the node
  `setting:assert_safe_for_production` is gone.
- A constant used as the key of a subscript assignment target (`values[KEY_X] = True`) is not a
  setting read; its `uses_constant` edge stays, with attrs.subscript_store = true.
- `backend/app/features/__init__.py` belongs to slice `app`; the spurious `slice:backend/features`
  is gone (files directly in a features/ folder go to the folder above, in all runtimes).
- Orphan nodes are pruned when an edge class is switched off (above).

### h. Two parents added
8dafcecc7f39d8668a1b09a39c1fba82cfe14562 (off main, reachable in the object store; its parent
1c546a31 is on main) and a31924a3818f4ac94b695906d107c72c912792b2 (the frozen commit). The shared
loader prefers `facts/cache/<sha>` over `arms/common/frozen-facts/`, so it now loads the frozen
commit from the cache, built by this version.

## Counts at the frozen commit a31924a (before = e409baad8b0c794b, after = 59da7b753a4d908e)

Totals: nodes 5,460 -> 5,464; edges 18,821 -> 18,875 (edge rows in edges.jsonl, not unique pairs);
experimental 390 nodes and 1,622 edges (unchanged).

Edge kinds that changed (rows): calls 4,872 -> 4,886; calls_url 77 -> 78; test_calls_route 435 -> 441;
cites 533 -> 529; constrains 85 -> 90; mentions 1,379 -> 1,380; migration_touches 223 -> 230;
reads_setting 176 -> 188; reads_table 141 -> 136; writes_table 245 -> 252; writes_column 101 -> 111.
Every other edge kind is unchanged: defines 3,548; co_changed 1,896; contains 1,185; imports 1,095;
uses_constant 825 (1 now marked subscript_store); has_column 439; renders 381; contract 254;
depends_injects 208; passes_callable 128; mocks 93; registers_route 85; foreign_key 70; overrides 57;
inherits 49; migration_follows 45; maps_table 42; enqueues_kind 35; registers_screen 32; navigates 28;
same_capability 24; includes_router 13; kind_handled_by 10; registers_job 6; runs 6.

Node kinds that changed: setting 78 -> 87 (+10 mobile config, +3 env, -1 method, ... net +9);
client_url_site 121 -> 122; missing_ref 18 -> 13; slice 51 -> 50. Unchanged: function 1,236;
test 1,128; file 514; doc_section 452; column 439; constant 358; method 288; class 242; component 135;
doc_id 108; route 85; migration 46; table 42; screen 34; doc 27; invariant 20; outbox_kind 11;
invariant_group 8; ambiguous_ref 7; scheduled_job 6; runtime 6.

Invariants: 20 bullets, 19 with at least one anchor (unchanged), 90 anchor edges (was 85).
Full table: `build/tmp/facts-fix/compare_frozen.txt`.

## Cache

190 folders: the 188 distinct parents of the 233 non-merge commits on frozen main, plus 8dafcecc and
a31924a. Every one of the 128 distinct parents in tasks/parents.txt (133 lines) has a folder.
Build: 190 built, 0 failed, 0 non-zero exits; 356 s wall with 3 builds at a time (1,060 s summed);
per build p50 5.3 s, p95 8.7 s, max 13.4 s, min 2.6 s (times under 3-way concurrency; a lone build
of the frozen commit takes about 4.5 to 7 s). Size on disk 778 MB (745 MiB). Edges per build: min
800, median 10,847, max 18,875. Degraded stages: `py` empty in 2 builds (backend/ absent), the TS
`mobile` program absent in 4 builds (technician-app/ absent); same as before.

## Co-change rules

- Only ancestors of the build commit P (`git log --no-merges P`).
- PRs: a merge commit whose subject starts "Merge pull request #n" (its branch side) and "(#n)" at the
  end of a squash subject. Back-merges are not PRs.
- Dropped: commits in the same PR as a `--task` child (union over children). Nothing else.
- Commits touching 2 to 30 files count; one edge per direction at support >= 2,
  `confidence = support / commits touching src`, `attrs.recency_weight = sum of 0.5^(age_days/30)`
  from P's committer time, `attrs.support`, `attrs.commits` (last 10 short SHAs, all ancestors).
- Frozen commit: 233 listed commits, 177 used, 5,949 pairs with support >= 1, 948 >= 2, 355 >= 3.

## Verification

- Self-test: `node tools/selftest.js`, 28 of 28 checks pass (config chains, invariant anchors, SQL,
  URL ternary and loops, loop-variable writes, Protocol calls, env reads, labelling, link suffix).
- Two builds of the frozen commit: every output file byte-identical, meta.json identical without
  `timings_ms`; both also equal the cache folder built in parallel.
- Three cached parents rebuilt alone (d683faa, d310349 from June, and the new 8dafcecc): byte-identical
  to their cache folders, and their sealed side records identical too.
- `node tools/verify_cache.js cache`: 190 folders, 0 failures. Checked: 22,495 commit rows all
  ancestors-or-self of their parent and with only the allowed fields; 190 SHAs in meta.json all
  ancestors-or-self (each is the folder's own commit); no PR number, task field or drop label in
  any meta.json or commits.jsonl; 577,980 commit references inside co_changed edges all ancestors;
  an independent recomputation of the drop rule (its own PR map) finds all 378 same-PR siblings
  absent from commits.jsonl and no listed commit labelled with a task PR; build_log.jsonl has no
  task field; tasks/parents.txt 0 missing; main parents 0 missing; one extractor version.
  On the previous cache the same script reports 23,958 failures and 2 missing parents.

## Precision of the groups this version added or changed (frozen commit, read against the code)

Each group is read whole when it has 20 edges or fewer, else 20 seeded samples (seed 7);
`tools/precision.js`, output kept in `build/tmp/facts-fix/precision.txt`.

| Group (edge kind, subset) | Group size | Read | Correct |
|---|---|---|---|
| reads_table from SQL text | 11 | 11 | 11 |
| writes_table from SQL text | 13 | 13 | 13 |
| writes_table + writes_column via query-flow typed locals | 20 | 20 | 20 |
| writes_table via session.delete | 1 | 1 | 1 |
| migration_touches from SQL text | 24 | 20 | 20 |
| reads_setting new (mobile config 10, env 4) | 14 | 14 | 14 |
| calls new (Protocol implementations 13, stub 1) | 14 | 14 | 14 |
| calls_url / test_calls_route new | 7 | 7 | 7 |
| cites new or changed (link suffix 5, tie-break 2, context attr added 4) | 11 | 11 | 11 |
| constrains new | 5 | 5 | 5 |
| uses_constant marked subscript_store | 1 | 1 | 1 |

Removed edges were also read: the 5 docstring SQL edges, 2 `repo.delete` writes, the method
setting read and the subscript-store read were all wrong before; the 2 cites removed were wrong
`resolved`-by-guess picks replaced by the right file (`backend/tests/conftest.py`,
`identity/security.py`, which defines `create_access_token`).

Previous version's samples (e409baad8b0c794b), still valid for unchanged kinds: overrides 20/20,
inherits 20/20, mocks 20/20, contract 20/20, constrains 19/20 (invariant 9 `captured_at` also
anchored to job_travel_sample.captured_at; not fixed here), cites 20/20, registers_job 6/6, runs 6/6,
imports 20/20, reads_response_field (experimental) 10/20.

## Deviations and limits

- The tie-break in citations applies to ties of up to 3 candidates (the existing fan-out limit), not
  only 2. It fired twice at the frozen commit.
- Protocol implementation edges exclude classes in test files (a test fake is not a production
  dispatch target); the Protocol stub edge is kept beside them.
- The holder-chain fix is applied to config reads only (above), so object-literal members wrapped in
  `as const` or parentheses are still not definition nodes.
- `ALTER TABLE` statements count for `migration_touches` only.
- Env reads in build configs are found by a line regex (those files are not in a TS program);
  comment lines are skipped.
- The previously reported residual `constrains` error (`captured_at` on invariant 9) and the 1,054
  low-confidence `mentions` are unchanged.
- Facts are built on the Windows host (addendum 1); the cache build ran 3 builds at a time there.
- TS stage has no node_modules types; `tokens` = characters / 4; self-calls dropped; co-change edges
  at support >= 2 only (commits.jsonl allows other thresholds). As before.
- No task seed, task list, reference or sealed answer was read. The extractor was changed from code
  reading at the frozen commit only. tasks/parents.txt was read for its parent list. The builder
  reads back its own side records only to print counts.
