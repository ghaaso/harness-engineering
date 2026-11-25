# Brief: the coverage rows as things stand today (three Sonnet readers, one source each)

The owner's words are in `../OWNER-WORDS.md`. Read them first. They outrank this brief.

token limit 2.5 M (expected about 0.9 M, basis r58-0102)

Deliverable: harness-kit/COVERAGE.md

## The job

A second person (the teammate, on macOS, working in a repository of her own) is to be held to this project's method
by one set-up. `harness-kit/COVERAGE.md` will prove that nothing of the method was left out: one row for every item
of four source documents, each with a mark. You write the rows for one source, as things stand today. You judge
nothing new: you report where each item stands against the kit's parts.

Read `../CONTRACT.md` in full first: section 3 is the list of kit parts with where each stands today, section 4 the
marks. Then read your source in full. Open another file only to settle a row.

## Your source and your output file (your prompt says which reader you are)

| reader | source | rows | output |
|---|---|---|---|
| 1 | `harness-kit/parallel/SPEEDUPS.md` | one row for every `##` section (about 31), and one for every line of "What did not improve, or is only designed" | `../in/coverage-speedups.md` |
| 2 | `research-tree/build/ENFORCEMENT-TABLE.md` | one row for every row of its table (CLAUDE.md rules, the board's rows, the owner's rulings); none merged, none dropped | `../in/coverage-enforcement.md` |
| 3 | `harness-kit/parallel/DECISION-RULE-v2.md` and `harness-kit/ORCHESTRATION.md` | the rule: each of the five decisions, and in section 3 each step, with one row per width in step 1, per item in step 4, per lever in step 7, per item in step 8, and one row for the measurements of section 4. The guide: one row for every rule it states (each bullet, numbered line or table row that tells a session to do or not do something), and each line of "Mistakes that cost tokens here" | `../in/coverage-rule-orchestration.md` |

## The table (nothing else in the file but a one-line heading per source and this table)

| # | item | where | mark | by what | today |
|---|---|---|---|---|---|

- **#**: S1, S2, ... (reader 1); E1, E2, ... (reader 2); D1, D2, ... for the rule and O1, O2, ... for the guide (reader 3).
- **item**: what the source says, in one plain line a newcomer can read, with its number if it has one.
- **where**: the section heading or the row's own id in the source (for reader 2 also the hook it names today).
- **mark**: exactly one of `hook`, `loaded`, `command`, `trial`, `owner's own`, `cannot`, `design`, `result`, as
  `../CONTRACT.md` section 4 defines them. Choose by where the item will stand once the parts of section 3 are in:
  - a kit hook can refuse a breach of it: `hook`;
  - it is a procedure done by running something (a queue, landing a unit, running tests side by side, counting
    tokens): `command`;
  - it is a rule for how a session works that no kit hook can see: `loaded`;
  - it is in the kit but was decided or designed and never run for real here: `trial`;
  - it is about this owner's record book, journal, archive, pages, approvals, branches, PC or research track, or it is
    held only by one of the hooks listed as not kit parts: `owner's own`;
  - it needs something only this PC has and a change would bring it in: `cannot`;
  - it exists only on paper: `design`;
  - it is a finding or a measurement with nothing to enforce or run: `result`.
  If two fit, take the stronger claim only when the source supports it; otherwise the weaker.
- **by what**: the kit part by its name in section 3 (the hook, the command, the rule file), or the reason, in a
  few words. For `design`: what building it takes, from the source. For `result`: the file she reads.
- **today**: `in` when that part is in the kit and works for her today by section 3; otherwise
  `missing: <what is to be built or changed, a few words>`. For `owner's own`, `design` and `result`: `n/a`.

## Rules

- Every item of your source gets a row. Count the items in the source first and say the two counts in your return.
- No row without a mark; no mark outside the eight.
- Do not soften or raise a standing: if the source says designed, estimated or one trial, the row says so.
- Plain words. No em dashes. Paths in backticks.
- Write only your output file. No commit. Shell calls under 150 s.

## Return (under 800 tokens)

The path, the count of items in the source and of rows, the count per mark, and a list of every distinct
`missing: ...` you wrote, each once, with the rows that need it.
