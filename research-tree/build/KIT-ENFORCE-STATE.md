# The harness kit enforces the whole method: state (the owner's words of 2026-11-25)

Session 0f8570e2 (Fable; it coordinates, helpers build). Started 2026-11-25 about 17:20 UTC by the session that
built the first kit (34bdfefe, ended at its cap).

Cap 60 M tokens (his answer of 2026-11-25 to a cap: question, "Yes, 60 M"). Expected about 43 M: nine helpers about
29 M, this session about 14 M. Meter at the reading before the first wave: 83 % all models, 53 % Fable, reset
2026-11-30 12:00 UTC.

His words: `docs/program/harness-kit-2026-11-25/OWNER-WORDS.md`. The brief: `.../briefs/ENFORCE.md`.
The names every helper builds to, the kit's parts and the marks: `docs/program/harness-kit-2026-11-25/CONTRACT.md`.

Deliverable: harness-kit/COVERAGE.md

## Plan

| wave | unit | helper | limit (expected), basis | writes |
|---|---|---|---|---|
| 0 | rows 1 to 3 | three Sonnet readers | 2.5 M each (0.9 M), r58-0102 | `in/coverage-*.md`, joined into `harness-kit/COVERAGE.md` |
| 1 | hooks | Opus builder | 12 M (6 M), r58-0104 | `.claude/hooks/**` kit mode, `harness-kit/hooks/kit-start.mjs`, `basis.json`, `tokens.mjs` |
| 1 | parallel | Opus builder | 10 M (5 M), r58-0104 | `harness-kit/parallel/*.mjs`, the queue's timeout off Windows |
| 2 | set-up | Opus builder | 7 M (3 M), r58-0105 | `harness-kit/setup.mjs`, its tests, `check-clone.mjs` |
| 2 | documents | Opus writer | 6 M (3 M), r58-0105 | `README.md`, `ORCHESTRATION.md`, `RULES.md`, `COVERAGE.md` final marks |
| 3 | review | Opus refuter, blind | 11 M (6 M), r57-0173 | one list of breaking faults |
| 3 | repair | Opus builder, only for a breaking fault | 6 M (3 M), r58-0104 | |

Then: `node harness-kit/check-clone.mjs` exits 0; commits on `bilal/build`; a branch `bilal/kit-enforce` by
`tools/promote.mjs`; a pull request to `main`, opened, not merged; records by `tools/journal.mjs`.

## State

- By 17:44 UTC (clock; the "about 17:20" above is an estimate): read the owner's words, the brief, the board, the
  kit. Cap asked and given. Contract and five briefs written (`briefs/COVERAGE-ROWS.md`, `HOOKS.md`, `PARALLEL.md`,
  `SETUP.md`, `DOCS.md`).
- Wave 0 done: three Sonnet readers wrote 280 rows (S 38, E 115, D 42, O 85); `harness-kit/COVERAGE.md` joined
  from them as things stood before the build: 94 rows with something missing, all inside the plan's units (the
  start hook and `RULES.md`; kit mode for window-ceiling, count-gate, fanout-gate; `unit.mjs`, `check.mjs`,
  `tokens.mjs`; the queue's README step and timeout off Windows). No row marked `trial` yet: the writer sets those
  from what is built. Reader 2 left out the ten unbuilt proposals under "Which remaining rules could get a check
  now": they are not table rows.
- Wave 1 running since about 17:40 UTC (meter 84 % all models, 54 % Fable): the hooks builder and the parallel
  builder, both Opus. Their hand-backs: `in/hooks-report.md`, `in/parallel-report.md`.
- Next: on both hand-backs, read the meter, start wave 2 (set-up builder and writer, briefs ready).
