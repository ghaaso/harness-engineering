# Justification pass: run record

Started 2026-10-06. Method: the user-supplied justification-pass design (constraint block, 8 lanes, reducer, pilot, reasoner, skeptic). This file records parameters and gate status; the role outputs live in the numbered folders.

## Parameters

| Parameter | Value |
| --- | --- |
| WORKDIR | `output/corpus-map-justification/` (outside `docs/`, so pilot copies do not enter the repository link check) |
| PILOT_FILES | `docs/clinic-planning-brief.md`, `docs/technical-plan/decision-log.md`, `docs/technical-plan/architecture.md`, `docs/technical-plan/README.md` |
| Expected chain (orchestrator's belief, not shown to any role) | brief USER-07/10/11 → decision-log A01 → architecture primary/fallback → plan README recommendation |
| ANNOTATOR | Fresh agent (built-in `Explore` type, which receives no project instruction file), reading byte-identical copies at a neutral path `tmp/reading-set-1/`. The user had read the design, so a person-annotator was not available. |
| SOURCE_CAP | 12 per lane |
| Caches | `tmp/corpus-map-justification/cache/` (git-ignored; lanes and reducer use separate directories) |

## Deterministic tools (`tools/`)

| Tool | Role |
| --- | --- |
| `textnorm.py` | Phase 2 step 3 normalisation and exact matching, shared by lane self-check, reducer and G5 |
| `fetch_text.py` | Downloads and extracts text with no model in the loop (pdfminer / lxml); honest User-Agent only |
| `validate_lane.py` | G1 schema, query-list, cap and quote self-check |
| `reduce.py` | Phase 2 steps 1-7; writes `02-pack/` |

## Gates

| Gate | Status |
| --- | --- |
| G0 | Passed: `00-constraints.md` SHA-256 `a373536b2d3cdf5654e511997e300e6d047adc6c170a9c721fb281eaf04dbdfe` |
| G1 | Passed: all 8 lane files pass `validate_lane.py` (0 errors; L1 has 3 warnings for the authorless brat documentation); every lane has a query list. 133 queries run by aborted agents were recovered from transcripts into `01-lanes/*.queries.recovered.txt`. Transcript audit: no lane agent opened the constraint block, pilot, annotator copies or another lane's files. |
| G2 | Passed: `02-pack/` built by `reduce.py --retry-failed`: 310 findings, 89 works (7 merges, each keyed in `drop-log.md`), 575/579 quotes verified by the reducer's own re-fetch, 304 supported findings. |
| G3 | Passed: see `03-pilot/freeze.txt` (hashes, selection rule, transcript audit, 8/8 annotation quotes verified) |
| G4 | Passed (re-run by the orchestrator): all 13 sections present; 65 candidate sets including THIS DESIGN; 401 rejection cells with none blank; 98 elements (54 borrowed, 44 required); every cited quote ID is a verified quote of a supported finding. `design.v1.md` frozen, SHA-256 `c760a1a9f720860fd30a06c75f40d1c5b098ff48350a6c4aafd29cc26f603258`. Reasoner transcript audit: 24 tool calls, all within the constraint block, the pack, its own scratchpad and `04-design/`; the two flagged calls are runs of the G4 check. |
| G5 | Part a passed (re-run by the orchestrator): 21 attacks covering A1-A10; every attack passage passes the Phase 2 quote check against the frozen pilot, carries the frozen version hash, and quotes its rule verbatim from the constraint block. 1,318/1,318 pilot-application quotes verified. Skeptic transcript audit: 37 tool calls; reads limited to the constraint block, `design.v1.md`, the frozen annotation and the four pilot copies. Part b passed: 21 responses, one per attack (12 accept, 3 reject on G1, 6 reject on G2). Every G1 step is verbatim from `design.v1.md` and every G2 rule is verbatim from the constraint block. All 46 changed design lines are covered by accepted diffs, `design.v1.md` is unchanged, and the response-round transcript audit is clean. Stopped after one round. |

## Incidents

1. **Run 1 (`wf_b130a39c-8db`)**: L5, L6 and the annotator completed. Six lanes (L1-L4, L7, L8) failed on an account session limit. Their partial files were moved, not deleted, to `01-lanes/_aborted-run1/`.
2. **Run 2 (resume of run 1)** replayed nothing: the first `agent()` call (L1) had failed, so every later call ran live, including L5, L6 and the annotator. It was stopped. Effects and remedies:
   - L5 and L6 re-run agents edited the run-1 files (one `replace_all` edit in L5, two quote edits in L6). The edits were extracted from the transcripts and reversed. The restored files match the run-1 byte sizes (54,340 and 39,901) and reproduce the run-1 validator summaries exactly: 48 findings, 77/77 quotes, and 36 findings, 63/63 quotes. The edited versions are kept in `01-lanes/_run1-complete/*.rerun-edited.jsonl`.
   - The annotator ran a second time. The selection rule was fixed before either annotation was read in full: the first completed annotation is frozen, and the second is kept as `03-pilot/annotation.rerun-unused.json`.
   - The partial `L4.queries.txt` was moved to `01-lanes/_aborted-run2/`.
3. **Run 3 (`wf_7b6f70f1-e61`)** is a fresh run of L1-L4, L7, L8 only, with lane prompts byte-identical to run 1's. The annotator was not re-run.
4. **Reducer fetch (G2)**: the first reducer pass fetched in parallel. PMC served a reCAPTCHA "checking your browser" page for three articles, and `fetch_text.py` wrongly recorded it as text, which left 11 quotes unverified. The fix, applied uniformly: interstitials are now classified as fetch errors, and each failed URL is retried once, sequentially, after a 5-second pause. No challenge was solved or bypassed. Two PMC articles were fetched on retry. ECO (PMC6323956) was refused again (interstitial, then 403), so its 4 quotes remain unverified and L4-F39/F40 are unverified claims. The DOI failures are fallback URLs only; every lane's primary URL fetched except ECO.
5. **Reasoner (Phase 3)** hit the account session limit after 10 tool calls: it had read the constraint block and rendered and read pack lanes L1-L3, and had written no design file. The same agent was resumed with its context intact, so the later response round still "continues with its own context". The transcript audit at the interruption found no access outside the constraint block, the pack and its own scratchpad renderings.
6. **Reasoner response round** hit the session limit again, after reading the 21 attacks and before writing anything; `design.md` was still byte-identical to `design.v1.md`. The same agent was resumed with its context intact.
7. The `same_title_and_authors()` dedupe rule in `tools/reduce.py` was offered to the user as a contribution, then written by the orchestrator when the session resumed without it. The rule is strict: equal titles after casefolding and trailing punctuation, no subtitle collapse, equal first-author surname, equal surname sets, and an empty author list never matches. Missed merges stay visible as near-duplicate works.

## Post-pass check

**L3 check (2026-10-07)**, requested by the user after the pass stopped and run outside the pass protocol. Criteria were pre-registered in `07-l3-check/criteria.md` (SHA-256 `9850ba35…`) before any agent ran. Workflow `wf_7666fcfd-8b9` ran two constructors (forward and backward), each piped to its own refuter.

- Chain: NOT REPRODUCED. Gap: PARTIAL.
- 349/349 quotes verified.
- Transcript audit clean. Each agent read only the criteria, the constraint block, the revised design, the pilot files and the annotation; each refuter also read its own construction.

See `07-l3-check/verdict.md`.

**Re-application of the revised design (2026-10-07 to 08)**, with branches per the user's rulings. Plan `08-reapply/plan.md` (`4181af2e…`), amended after the user's review by `plan-amendment-1.md` (`64ffe6fd…`). The amendment corrected:

- my closed-word-list reading rule;
- the one-expression-two-referents two-items branch;
- the "labels = decisions" wording;
- the partial query contract;
- the partial borderline range.

Workflows:

- `wf_303240c8-8df`: readers, verifiers and analyst. The analyst failed on a session limit.
- `wf_bab1b4ed-f8e`: analyst re-run. Both reclassifiers failed on a session limit.
- `wf_78c5c26d-dbc`: reclassifiers and checkers.

Checks:

- All 2,514 quotes across the readings and layers are verified.
- The transcript audit is clean. Two directory-level searches were filtered to the agent's own files; one tool-results read was the agent's own output.

Results come from the deterministic `tools/reapply.py`. See `08-reapply/summary.md`.

## Known isolation limits

- Default workflow and Agent subagents receive the repository's `AGENTS.md`. It describes the clinic project, not the constraint block, pack or pilot annotation. Only the annotator runs without it.
- Isolation is enforced by instructions and audited afterwards from agent transcripts (files opened per role).
