# arms/search: arm (a) SEARCH through the common harness (addendum 2, items 1, 7, 8, 11, 12)

Revision of 2026-11-12 (search-fix lane). Only TUNE tasks were run, and only a 20-task smoke test
inside graphtest:1. No configuration was scored, selected or frozen. sealed/ and audit/ were never
read or listed; the only access to sealed/ was moving files into it (below).

## The earlier self-selection is void

The previous revision of this arm chose its own configuration with proxy labels it derived from git
(`tune_labels.js`, `tune_labels.jsonl`) and its own scorer (`score.js`, `select.js`). Under
addendum 2 (A.1, C.9, C.11) that selection is void: the grader selects every arm's configuration
with the one common scorer against the sealed references. In this revision:

- `tune_labels.js` and `tune_labels.jsonl` were moved, unread, to `sealed/search_tune_labels/`.
- The score tables and the selection built from those labels (`results/tune_T1|T1x|T2.{json,txt}`,
  `results/selection.json`) were moved, unread, to `sealed/search_tune_labels/void_results/`.
- `score.js` and `select.js` were deleted (the common scorer `arms/common/score.js` replaces them).
- The numbers the previous NOTES reported from those labels were removed from this file.

## What exists

| File | Role |
|---|---|
| `arm.js` | Registry entry: `open(G, opts)` returns `{rank(seedIds, cfg, seed), tq(question), close()}`. `open` exports the parent tree once per parent. `rank` returns `{ranked, engine_ms, lookups, meta}`: only the search's own ranked head, no padding. |
| `search.js` | The search itself (round one: read the seed, grep its names, module spellings and route strings, plus the seed's own imports seen in that read; later rounds: open the top files, grep the definitions that hit there); the cost ledger; the projection of the result to canonical graph nodes (`toRanked`); the validated list of search fields (`FIELDS`). |
| `engine.js` | Per-parent context built from the canonical graph G: the tree from `git archive` (code files plus Markdown, minus `G.removed`), a line grep over code files, the arm's own BM25 index over code files, the cost ledger (`Ledger`: every grep, read and list with the tokens it returns). |
| `lib.js` | `git archive` of a commit parsed in memory from `paths.js` REPO (GT_REPO = `/repo` in the image), file classification, the shared tokenizer, definitions from G's node table (`nodesFromG`, carrying the integer node id), the enclosing-definition lookup. |
| `spell.js` | Unchanged: module and import spellings, route strings and patterns, hit typing (definition, import, mock, call). |
| `sweep.js` | `STAGE1`: exactly 40 configurations around this arm's own `BASE`, plus `complexity()` for "simplest within one standard error". |
| `tq.js`, `tq_lib.js` | Scripted plain-search answers to TQ questions (one generic script per question kind, at most three lookups), now a module called by `arm.tq()`. |

Deleted: `pack.js` (the shared packer is called by the harness), `run.js` (replaced by
`arms/common/run.js` and `sweep.js`), `score.js`, `select.js`, the old run logs, `out_tq/`, and
`out/` (675 MB of answers in the old private format).

## The contract as implemented

- Configuration: the shared factors `granularity`, `form`, `pad` (and `minConf`, which this arm
  ignores because it reads no edges), plus one object `search` holding every search field
  explicitly, so the configuration hash covers all of them. `rank()` rejects a configuration with a
  missing, unknown or out-of-range search field, or with a graph `traversal` or `rank`.
- The ranked head, in order: the definitions that hit inside the seed's own file (they appear only
  at symbol granularity; at file granularity the harness drops the seed file), then for each file in
  file-rank order its file node followed by its definitions that hit (score descending, then first
  line); a file reached without a definition hit (an import, a module-level line, or BM25) gives
  its first three top-level definitions. Seeds are excluded. File granularity therefore projects to
  the file ranking and symbol granularity to the definitions in that order, so one list serves every
  granularity, form and pad, as the harness's `rankKey` requires.
- Fields of a ranked entry: `hop` = the search round that first reached the node (1 to 3); `score` =
  the file's normalised score, rounded to 9 decimals; `via` = `["L<k>", "read<t>"]`, where k is the
  1-based index, in this answer's lookup ledger, of the lookup that first returned the node, and t is
  the number of tokens the search had read through that lookup; `path` = null (search has no
  explanation path). A grader can compute lookups and tokens read until 80 % recall from the
  packed items' `via`.
- `lookups` = the number of greps, reads and lists in the ledger. `engine_ms` = the time of the
  search and projection for that query (the tree export happens once per parent in `open`).
- `meta` = `{tokens_read, r1_lookups, names, routes, ledger, seed_in_tree}`; the ledger lists
  `[op, label, tokens, lines]` per lookup. The current harness drops `meta` from the answer record
  (see "Requests to other lanes").
- Padding: none inside the arm. `pad = DIR` or `CO` in the configuration makes the shared packer
  append the shared tail, exactly as for every other arm.
- TQ: `tq(q)` returns `{answer, tokens, lookups}` in the SPEC section 12 format; `tokens` = the
  tokens of everything the greps and reads returned to the reader (the ledger total), not only the
  answer, because that is what a session pays for a search answer.

## Stage-1 list (written on 2026-11-12 without any score; list hash ef02c4a27f96928a)

BASE: file granularity, signature form, pad none; search fields rounds 2, routes on, spellings on,
nullNames 8, seedImports on, namesPerFile 3, genericCap 300, followImports off, k2 5, decay 0.5,
BM25 off (k1 1.2, b 0.75, top 50 when on), proximity 0, hit weights definition 3 / import 2 / mock
1.5 / call 1, countW 0.25, idf on. The search fields are the pre-score defaults this arm was first
written with; the shared factors match the relational arm's base, so padding enters only through
the shared `pad` factor.

The 40 entries, one factor at a time:

- base (1);
- shared factors (7): pad=DIR, pad=CO, gran=symbol, form=paths, form=snippet,
  gran=symbol form=paths, gran=symbol form=snippet;
- rounds (5): rounds=1, rounds=3, k2=3, k2=8, k2=12;
- round decay (2): decay=0.25, decay=1;
- terms (10): routes=off, spellings=off, seedImports=off, nullNames=0, nullNames=3, nullNames=16,
  namesPerFile=1, namesPerFile=6, genericCap=100, genericCap=1000;
- terms at symbol granularity (1): gran=symbol followImports;
- BM25 (5): bm25, bm25only, bm25 k1=0.9 b=0.4, bm25 top=20, bm25 top=100;
- proximity (3): prox=0.5, prox=1.5, prox=3;
- weights (6): typeW=flat, typeW=def-heavy, typeW=import-heavy, countW=0, countW=1, idf=off.

Budgets are not entries: every answer is packed at 2,000, 4,000, 8,000 and 16,000 tokens. The 40
entries give 33 distinct ranked lists (the 7 shared-factor entries reuse the base ranking).

## How to run

Inside graphtest:1 (at most 6 CPUs and 4 GB; source store on a named volume, never on /build):

```
MSYS_NO_PATHCONV=1 docker run --rm --cpus 6 --memory 4g -v "<build>:/build" \
  -v "C:/Users/User/Documents/projects/EMS_workshop1:/repo:ro" -v gt-search:/store graphtest:1 bash -lc "
  git config --global --add safe.directory /repo
  export GT_BUILD=/build GT_REPO=/repo GT_STORE=/store GT_SRCSTORE=/store/srcstore GT_TMP=/tmp/gt
  node /build/arms/common/sweep.js --arms search --sets T1,T2 [--out <results root>]      # the TUNE sweep
  node /build/arms/common/run.js run --arm search --config base --sets T1 --split tune    # one configuration
  node /build/arms/common/run.js tq --arm search --split tune                             # TQ answers"
```

`GT_SRCSTORE` must be set in the image: by default the shared source store is
`arms/common/srcstore` on the bind mount. The smoke script is `tmp/search-fix/smoke.sh`, its log
`tmp/search-fix/smoke.log`.

## Smoke test (graphtest:1, Node v24.22.3, 20 TUNE tasks: 16 T1 and 4 T2, the harness lane's set)

- The stage-1 list loads through the harness: 40 configurations, list hash ef02c4a27f96928a.
- Held-out lock: four attempts refused (search without flags; search with a wrong frozen hash;
  floor-dir with a wrong frozen hash; held-out TQ without a frozen TQ implementation).
- Sweep of the 40 configurations on the 20 tasks through `arms/common/sweep.js`: 800 answers,
  14 s wall. Seed match: 13 by id, 6 file only, 1 none.
- Per answer for the base configuration (medians over the 20 tasks): 80 ranked nodes, 24 head
  units at file granularity, 27 lookups (95th percentile 64), 15.8 ms wall, 5,177 tokens used of
  the 8,000 budget with no padding. With pad=DIR or pad=CO the 8,000 budget is full (7,999 tokens),
  of which the tail is 2,815 tokens (median). rounds=1: 5 lookups, 8 head units, 2.7 ms. bm25only:
  2 lookups, 0.5 ms.
- Determinism: two separate opens of the arm gave identical ranked lists and lookup counts for all
  800 (task, configuration) pairs; two separate `run.js` runs of the base gave 20 of 20 identical
  answer records (wall and engine time ignored). Configurations with one rankKey gave one ranked
  list in every case (0 violations), so the sweep driver's reuse of a ranking across granularity,
  form and pad is valid for this arm.
- TQ through `run.js tq --arm search --split tune`: 20 questions, 0 errors, lookups median 3 and
  at most 3, tokens median 2,839 and at most 8,606. The answers are identical, question by question,
  to the previous revision's TUNE answers.
- No scores were computed (no references are available to this lane).

## Deviations and changes from the previous revision

- The private directory fill (`fill`) is gone; padding is only the shared `pad` option. The base now
  has pad none (the old base filled with DIR); pad DIR and pad CO are list entries.
- `followImports` (follow an import hit to the definitions that use the imported names) is a
  search field of its own. Before, it was switched on by symbol granularity, which would make the
  ranked list depend on granularity, which the harness forbids. Old "gran=symbol" corresponds to
  the new "gran=symbol followImports".
- Later rounds merge their hits after every file of the round has been opened; before, round two
  merged after each opened file, so a later file's chosen definitions could depend on an earlier
  file's round-two hits. On task T1-0003 this gives 15 lookups instead of 17 and swaps the first two
  files; on T1-0004 the head is identical to the old unpadded output. A third round is now
  possible (`rounds: 3`, weight decay squared).
- `spellings`, `countW`, `idf`, `bm25K1`, `bm25B` and `bm25Top` were constants and are now explicit
  search fields with the same default values.
- Definitions come from the canonical graph G (the shared loader, facts extractor 59da7b753a4d908e)
  instead of reading `nodes.jsonl` directly, and hits map to graph nodes by integer id instead of by
  name and first line. Definition kinds: function, method, class, component, test, constant (the
  old list also named object and variable, which the facts do not have).
- The tree is still read by parsing `git archive` output in memory; nothing is written, so there is
  no export folder to delete. The repository path comes from `paths.js` (GT_REPO).
- TQ: a hard-coded list of three CLAUDE.md line numbers (116, 119, 127) that switched off one matching
  rule in the invariants script was question-specific knowledge; it was removed. No TUNE answer
  changed. TQ now reports `tokens` = everything the searches returned (ledger total).
- The arm's BM25 is its own (identifier and sub-word terms over whole code files, idf
  `ln(1 + (N - n + 0.5) / (n + 0.5))`); it is not the shared `text` rank of SPEC section 8.4 and is
  not cross-checked.
- `path` in a ranked entry is null, not a node path of length hop + 1 (search has no explanation
  path); the harness does not use it.
- The sets T1x (a subset of T1) is no longer run separately; the harness runs any set by `--sets`.

## Requests to other lanes (not done here)

- Harness (arms/common): carry `meta` from `rank()` into the answer record (at least
  `meta.tokens_read`), so the search arm's tokens-read total is in the results; today only the
  per-item `via` carries it.
- Harness: the padding tail costs a person a listing (DIR) or a `git log` plus a listing (CO). The
  floors report 1 and 2 lookups; padded answers of other arms count none. Decide one rule for every
  arm.
- Harness: `padding.js` comments still point at `arms/search/arm.js` `dirOrder` and `coFloor`,
  which no longer exist (the code was ported, the comments are stale).
