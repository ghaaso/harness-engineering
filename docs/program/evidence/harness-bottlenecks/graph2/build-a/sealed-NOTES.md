# Sealed task sets: notes (2026-11-12)

Grader's side. Arm builders never read this folder.

## What is here

| path | content |
| --- | --- |
| `../tasks/tasks.jsonl` | 1,569 tasks: id, set, split, parent SHA, seed (+ remove_paths for T3/T4). No answers. |
| `../tasks/parents.txt` | 128 distinct parent SHAs (133 lines: SHA x document-removal variant). |
| `../tasks/README.md` | the sets, sizes and split, without answers. |
| `references.jsonl` | per task id: task commit, seed (with occurrence index), reference `files` and `defs` with flags (`test`, `runtime`, `cross_runtime`, `cochanged_before`, `cochanged_before_xpr` for T1/T2, `same_file_as_seed`, `changed_lines`), `excluded_unreachable` counts and lists, `not_scored` (deleted files, unparsed files). T3/T4 also carry the doc item, its introduction or fix commit and the evidence. |
| `stats.json` | set sizes by split and the shares below. |
| `handcheck.txt` | ten tasks re-derived by hand; two builder defects found and fixed before sealing. |
| `build/` | the scripts: `common.py`, `defs_ts.js`, `build_t12.py`, `anchors.py`, `build_t34.py`, `finalize.py`, `handcheck.py`, `run_all.sh`. |
| `work/` | intermediate JSON (t12.json, t34.json), the session-lookup snapshot, hand-check output. |
| `SHA256SUMS` | over tasks.jsonl, parents.txt, README.md and every file of this builder here (not `tq_writer/`, which the TQ writer seals). |

Run: `bash sealed/build/run_all.sh` from `build/` (about 75 s; rebuilds everything and the checksums).
Two consecutive runs produce byte-identical tasks.jsonl, references.jsonl, parents.txt and stats.json.

## How references are made

- Pool: non-merge commits reachable from a31924a; diff against the first parent with rename detection;
  existing = status M/R (old path), added = A; only code, test, migration files; usable = 2..30 existing.
  140 commits, 65 tune / 75 held-out. 806 T1 seeds (every existing file of a commit is a seed once).
- Definitions: canonical units at the parent. Python via `ast` (top-level functions, classes, class
  members `C.m`, nested classes, top-level simple assignments; decorators belong to the definition).
  TS/JS via the TypeScript 5.3.3 parser (`createSourceFile`, no program; top-level functions, classes
  and members, top-level `const/let` (function -> function/component, object -> object + its function
  members, else variable), test blocks). A nested closure belongs to its enclosing unit.
- Hunks (`git diff -U0 -M`): parent-side lines -> innermost parent definition; child-side lines ->
  innermost child definition if its name exists at the parent, else ADDED (unreachable); a pure
  insertion -> the parent definition holding both lines around the insertion point (new member of a
  class marks the class). Module-level lines count to the file only.
- T1: reference files = the other existing files; reference defs = every changed parent definition of
  the commit except the seed symbol (those in the seed's own file are flagged `same_file_as_seed`).
  Seed symbol = most specific changed definition of the seed file, then most changed lines.
- T2: seeds = existing production code files; reference = the existing test files and their changed
  definitions. T1x = T1 tasks of commits whose existing files span 2+ runtimes (`of` gives the T1 id).
- T3: 73 items parsed as in the scoring lane's doc_chains.py. Per item, build commit = first parent
  of the first doc version containing the item's first line. Anchors: backticked code paths (brace
  groups expanded, unique suffix or a suffix sharing a folder with a resolved file) and backticked
  identifiers, resolved at the build commit through definitions, then class/object attributes and
  `__tablename__` (table -> model), then names bound inside a definition (e.g. `sendPunch` ->
  TravelScreen). Ambiguous names are dropped; names that resolve at the frozen commit but not at the
  build commit are counted as unreachable. Kept when the anchors span 2+ files: 25 items.
- T4: 13 register items mapped to 4 fix commits (evidence string per item); 5 have no resolvable
  anchor; 8 kept. Reference = the fix commit's existing files and changed definitions.
- T5: the scoring lane's session-lookup snapshot (139 distinct pairs); 27 whose opened file is
  tracked at a31924a; facts at a31924a.

## Numbers

| set / split | tasks | commits or items | ref files | ref defs | tests | cross-runtime | never co-changed with seed before (all ancestors / same-PR siblings dropped) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| T1 tune | 388 | 65 | 2,924 | 4,162 | 0.233 | 0.206 | 0.350 / 0.370 |
| T1 held-out | 418 | 75 | 2,562 | 3,150 | 0.195 | 0.126 | 0.326 / 0.388 |
| T1x tune | 144 | 17 | 1,472 | 1,910 | 0.200 | 0.432 | 0.444 / 0.486 |
| T1x held-out | 82 | 9 | 712 | 847 | 0.227 | 0.462 | 0.418 / 0.450 |
| T2 tune | 240 | 47 | 577 | 692 | 1.000 | 0.198 | 0.359 / 0.372 |
| T2 held-out | 237 | 49 | 496 | 338 | 1.000 | 0.127 | 0.356 / 0.397 |
| T3 held-out | 25 | 25 items | 56 | 39 | 0.032 | 0.168 | 0.400 / - |
| T4 held-out | 8 | 4 commits | 46 | 60 | 0.302 | 0.189 | 0.236 / - |
| T5 held-out | 27 | 27 pairs | 37 | 0 | 0.000 | - | - |

Shares are over reference items (files + definitions); cross-runtime = item runtime differs from the
seed's (both known). Unreachable at commit level (T1 pool): 378 added files against 806 existing
(0.319 of files); 1,162 definitions added inside existing files against 998 changed parent
definitions (0.538); 2,202 definitions inside added files. 609 of 806 T1 seeds have a symbol.
13 deleted files are not scored. T3: 2 file and 4 symbol anchors unreachable at the build commit.

## Deviations from the protocol (nearest honest thing)

1. The builders read commit contents with read-only object reads (`git diff`, `git ls-tree`,
   `git cat-file --batch`, `git log`, `git rev-list`), not by exporting every commit with `git archive`;
   the hand check does use `git archive` exports, deleted afterwards. Nothing in the repo is written.
2. "More than 30 files" is the lane's and the protocol's section-2 rule (more than 30 EXISTING code/test/
   migration files), which gives 140. One held-out commit (bfb5714, 2026-07-01) has 57 files of all
   types (2 existing, 41 added); `commit_n_files_all` lets the scorer drop it (139 = 65/74).
3. Deleted files (13) are not in references (lane rule: existing = M/R).
4. Definition kinds include top-level variables, objects and JS test blocks beyond the protocol's
   function/class/method/component list; every reference def carries `kind` so a scorer can filter.
5. T3 builds per item, not per doc: CLAUDE.md was added on 2026-07-01, before most invariants and most
   files they name, so "before the doc" is taken as "before the item". Only the doc itself is flagged
   for removal; other docs at that commit that restate the chain are not removed. 25 of 73 items kept
   (the lane's 36 used looser resolution: up to 3 candidate files per symbol). All T3, T4, T5 tasks are
   held-out by date, so those sets have no TUNE part.
6. T4: two fix commits are sub-commits of #170 on branch fix/mobile-completion-guards (8dafcec, c731e66),
   used because the squash da988e2 mixes four fixes. 9 of 13 mappings rest on commit content or the
   doc's own "fixed on branch" note, not on item ids in the body; M10/M11/M23/M25 are in no tracked doc.
   A fix commit that closes several items gives each of them the same reference.
7. T5 uses the lane's snapshot of the transcripts; transcripts keep growing, so a re-run of
   session_lookups.py would differ. Queries can name the answer (`query_names_it`).
8. T1x is emitted as its own task lines (duplicates of T1 seeds) rather than a flag.

## TQ resolution (added 2026-11-12)
The final TQ reference answers are in `sealed/tq_reference.jsonl`, and the agreement figures are in `sealed/tq_agreement.txt`. The method and the scripts are in `sealed/tq_resolve/` (see its NOTES.md). The questions in `tasks/tq_questions.jsonl` were reworded during this pass (31 of them, ids kept). SHA256SUMS now also covers the TQ files.
