# FACTS extractor audit (extractor_version e409baad8b0c794b)

## What was built (all independent of the extractor; it only reads its outputs)
- `lib.js`: my own Python and TS import resolvers (re-exports, barrels, path aliases), route table (85/85 routes match the extractor: 77 backend + 8 ops), repo reader, seeded sampler (mulberry32).
- `precision.js <factsdir> <exportdir> <outdir> [n] [seed]`: samples n edges per kind and checks each one against the source text. Verdicts are OK, PLAUS or FAIL, and I read every PLAUS and FAIL by hand.
- Recall probes, which scan the whole repo with my own patterns: `url_recall.js`, `setting_recall.js`, `mock_recall.js`, `cites_recall.js`, `uow_recall.js`, `callsites.py` (ast call sites in a line range, used for call recall). Usage: `node X.js <factsdir> <exportdir>`.
- `sqlcheck.js`: lists every SQL-text-derived table edge with the lines that support it.
- `cochange_check.js`: recomputes co-change support and confidence from `git log`.
- `leak_check.js <factsdir> <sha>` (`NOSYM=1` skips the symbol-text check), plus `leak_all.sh`, which runs it over every cache folder and writes `leak_all.jsonl`.
- `coverage.js`: checks the cache against tasks/parents.txt.
- Builds:
  - `frozenA` and `frozenB`: two builds at a31924a
  - `june`: ded44c8, with the task 6928828b/ee005d13 switches
  - `july`: d18205d, with task 140428c0
  - `rebuild/<sha>`: rebuilds of cache entries

  Exports went to build/tmp and were deleted afterwards.

## Numbers (frozen a31924a; 30 sampled per kind, or the whole population when a kind is small)
- **Precision 100%** for:
  - calls (30/30; all 4,872 machine-checked, every FAIL read: checker limits)
  - calls_url (77/77), test_calls_route, imports (654/654 TS, multi-line parse)
  - defines, contains, renders, depends_injects, passes_callable
  - overrides 57/57, mocks 93/93, inherits 49/49
  - foreign_key 70/70, has_column, maps_table 42/42
  - migration_follows 45/45, migration_touches 223/223 (2 with imprecise evidence lines)
  - enqueues_kind 35/35, kind_handled_by 10/10, navigates 28/28
  - registers_route/screen/job, runs, same_capability, uses_constant, writes_column, contract
  - co_changed: all 948 pairs reproduced exactly
- **Below 100%:**
  - reads_setting 29/30. A test assignment `values[KEY_...] = True` is labelled as a read, and the method `assert_safe_for_production` became a setting node.
  - SQL-text table edges: about 7 of 30 come from prose in docstrings or are mislabelled. Over the whole kind, reads_table is about 136/141 and writes_table about 244/245 (plus 1 edge with wrong evidence).
  - `session.delete` matches `self._repo.delete(x)` too (2 of 3 edges).
  - cites 30/30 lenient, 29/30 strict.
  - constrains 29/30 (`captured_at` fans out to 3 wrong tables).
  - mentions 27/30 strict; 1,054 of 1,379 mentions have confidence below 1.
- **June and July spot checks:** the same picture. Mentions about 27/30 and July constrains 28/30.
- **Recall:**
  - calls 37/37 over 15 symbols. Still unresolved: Protocol dispatch (`self._rail.disburse`) and callable parameters.
  - calls_url, production code: 77/78. The miss is the ops `getSentryIssues` ternary template.
  - pytest routes 380/386 (6 URLs looped in attendance tests/test_router.py:367-372); client tests 44/44.
  - writes_table 19/20 functions. In the uow probe, 101/111 assignment lines have an edge; misses are loop variables in scripts and notifications `upsert_token`.
  - reads_setting:
    - py `settings.*` 94/94
    - shop KEY_ 48/48
    - JS env 21/23 (VITE_BASE)
    - os.environ 0/2
    - **mobile `config.*` reads 0/about 10** (includes `config.attendance.maxDutyHours`)
  - overrides 57/57, mocks: JS 53/53, patch 7/7, monkeypatch 27/27.
  - cites: unique 482/485 (`path:line` links become `missing:` nodes), ambiguous 88/88.
  - constrains 46/51 tokens. Missing: start.sh, config.attendance.maxDutyHours, transition(), JobDetail.evidence, cursor.last_seq.
- **Determinism:**
  - frozenA equals frozenB byte for byte.
  - 5 cache rebuilds match the cache byte for byte.
  - The cache has 188 folders, all at the same version, with sha256 checks passing.
- **Coverage:**
  - parents.txt has 128 distinct SHAs and 126 of them are cached. Missing: 8dafcecc (T4, not on main) and a31924a (T5); both are descriptive sets.
  - There are no doc-removed variants for the 9 `remove_paths` lines.
- **Future leak:**
  - Clean across all 188 builds: 0 paths not at P, 0 non-ancestor commits, 0 commits after P, 0 bad co-change refs.
  - The leak is in labels. `commits.jsonl` keeps 413 dropped commits (3,599 file entries) labelled `same_pr_as_task:#n` or `pr_in_flight_at_parent:#n`. On the 9 TUNE parents that have same-PR drops, those dropped siblings touch 27 of the children's 62 changed files.
  - `meta.json` names the task SHAs and PRs in 181 builds.
  - The in-flight rule drops real ancestor history using knowledge of later merges. The protocol allows dropping same-PR siblings only.

## Verifier defects (verify-schema-scoring)
- **Fixed:**
  - URL ambiguity (11 true ties at 0.5, all `*`-method test asserts)
  - deterministic TS stage
  - read/write split
  - test ctor/uow noise
  - ancestors-only co-change, with venv noise removed
  - tracked-docs-only corpus
  - 20 invariants
  - get_service alias
  - build at the parent
- **Residual:**
  - NOTES says is_test covers vitest.setup and `*_test.py`, but the code does not, so `vitest.setup.js` gets is_test=false.
  - `session.delete` over-matches.

## Bias notes
- Parallel edges: 18,821 edges collapse to 17,370 distinct (kind,src,dst). Examples: calls 4,872 to 4,130; migration_touches 223 to 82; writes_table 245 to 135.
- co_changed is stored in both directions; every other kind is stored in one direction.
- Ambiguous 1/k fan-outs (constrains invariant #3 points at every service.py/deps.py/index.js; 309 mentions) inflate BFS and recursive CTE results but not confidence-weighted PPR.
- A spurious slice `backend/features` exists.
- `--skip` leaves orphan nodes.

## Deviations from the brief
- For July I used d18205d, a mainline commit that is not a task parent, so that no HELD-OUT task input was used. The leak overlap was measured on TUNE parents only, but the leak scan read every cache folder's metadata. That scan was a read, not a run.
- Precision used 30 per kind, or the whole population for small kinds, which is more than the 25 the brief asks for.
- Checker limits (Annotated aliases, monkeypatch, ctor to `__init__`, multi-line imports, and others) were judged by reading the code. They are not counted as extractor errors.
