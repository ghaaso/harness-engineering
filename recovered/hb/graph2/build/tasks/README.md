# Task sets (what arms may read)

Frozen commit: main = `a31924a3818f4ac94b695906d107c72c912792b2` (2026-08-03). Split date 2026-07-01:
TUNE = task commits authored before it, HELD-OUT = from it. Nothing may be run or tuned on HELD-OUT in
this phase. Reference answers are sealed elsewhere; this folder holds seeds and questions only.

## Files

- `tasks.jsonl`: one task per line: `id`, `set`, `split` (`tune` | `heldout`), `parent` (the full
  SHA the facts must be built at), `seed`, and for T3/T4 `remove_paths` (a document that must be
  removed from the facts built at that parent). Ids are opaque and carry no commit SHA.
- `parents.txt`: every commit facts must be built at, with the sets that use it, the task count and
  the document to drop ('-' = none). A SHA can appear on two lines: once for the plain facts and once
  for the variant with a document removed. 128 distinct SHAs, 133 lines.

## Seeds

- Code seeds (T1, T1x, T2, T3, T4): `{"path": ..., "symbol": {"name", "kind", "start", "end"} | null}`.
  `path` is the file at the parent. `symbol` is a definition at the parent with its line range (1-based,
  inclusive): a top-level function, class, component or variable, a class member or object-literal
  method written `Owner.member`, or a JS test block (`describe` / `it` / `test` titles joined by ` > `).
  `null` means the seed is the file alone (no definition of it qualifies).
- T5 seeds: `{"query": ..., "tool": ...}`: a search pattern or shell command typed in a recorded
  session, not a file.

## Sets and sizes (tasks / commits or items)

| set | what | tune | held-out | all |
| --- | --- | --- | --- | --- |
| T1 (primary) | change completion: seed = one existing changed code/test/migration file (and its changed definition) of a task commit | 388 / 65 | 418 / 75 | 806 / 140 |
| T1x | the T1 tasks of cross-runtime commits; descriptive only | 144 / 17 | 82 / 9 | 226 / 26 |
| T2 | seed = changed production code file of a commit that also changes existing tests | 240 / 47 | 237 / 49 | 477 / 96 |
| T3 | documented chains (lifecycle audit, open-work handoff section 4, CLAUDE.md invariants): seed = the first named file or symbol of an item | 0 | 25 / 25 | 25 / 25 |
| T4 | defect register item: seed = first anchor of the item, built at its fix commit's parent; descriptive only | 0 | 8 / 4 commits | 8 / 4 |
| T5 | session lookups: search -> file opened next; descriptive only | 0 | 27 | 27 |

T3, T4 and T5 fall entirely after the split date, so they have no TUNE part. T1 commits are the
non-merge commits on the frozen main with 2 to 30 code, test or migration files that already existed
at the parent (the protocol's 140 = 65 + 75).

## Rules for arms

- Build facts only at `parent`, from ancestors only. Never use the task commit, anything later, its
  message, or files it adds.
- For a T3/T4 task, drop `remove_paths` from the facts (and from any text index) before answering.
- Do not read, list or open `../sealed/`.
