# Decision rule version 2: state of the draft

Started 2026-11-19 by a child session (launch-only orchestrator) of the round-3 session.
Branch `transfer/2026-11-16-embeddings-final-and-setup`. Version 1 (`../bottleneck-2026-11-18/DECISION-RULE.md`)
is not edited; the top session decides.

Inputs: `c1-report.md`, `w1-report.md`, `t1-report.md`, `a1-report.md`, their `-claims.md`, and the refute files
`c1-refute.md`, `w1-refute.md`, `t1-refute.md`, `a1-refute-1.md` + `a1-refute-2.md` (lane a1 split its refuter in two).
Not touched: the sibling session's `intake-*`, `library/INDEX-draft.md`, `library/tests/`.

Usage at start: 57 % of the week (Fable 44 %). Stop and report at 62 %. Context cap 130,000 tokens.

| Step | What | Who | Output | State |
| --- | --- | --- | --- | --- |
| 1 | Draft v2 and number its claims | Opus, analyse | `RULE-V2-DRAFT.md`, `v2-claims.md` | started |
| 2a | Check each cited lane claim id and verdict | Sonnet, run | `v2-gate.md` | waiting |
| 2b | Refute each statement, fresh context | Opus, refute | `v2-refute.md` | waiting |
| 3 | Fold verdicts; journal records prefix `v2` | Opus, analyse | draft section "Verdicts", `library/journal/2026-11-19/v2.jsonl` | waiting |
| 4 | Checks, usage, commit, push | this session | commit | waiting |

## Log

- 2026-11-19: state file written; usage 57 %; step 1 launched (brief `v2-brief-draft.md`).
- 2026-11-19: briefs for steps 2a, 2b and 3 written while step 1 runs: `v2-brief-gate.md`, `v2-brief-refute.md`,
  `v2-brief-fold.md`. The refuter sees only `v2-claims.md`, the lanes' claims and refute files, and version 1.
- 2026-11-19: step 1 done (Opus, 362k tokens, 24 min). 38 conclusions (8 kept, 8 corrected, 3 replaced, 19 new),
  145 `V2-` statements (112 rule, 33 measurement rows). Positions K1-K8 taken, each on a named lane claim. Top three
  measurements: Q01, Q05, Q10. Usage 58 %. Steps 2a and 2b launched together.
- 2026-11-19: step 2a done (Sonnet, 101k tokens). 386 (V2, claim) pairs: 0 ids missing, 0 verdict mismatches,
  3 flags, all on V2-004 (A05 found PARTIALLY but row says "full"). Both cross-checks pass (145 each side).
- 2026-11-19: step 2b done (Opus, 349k tokens, 20 min). Of 145: confirmed 86, holds in part 53, refuted 1 (V2-077),
  cannot be checked 5 (V2-108 to V2-112, which rest on report sections the refuter was not shown). Worst: V2-077
  (whole-file CRDT dropped on one preprint, W61 as corrected says otherwise), V2-092 (decides "split" where refuted
  C90/C114 leave it open, against V2-098), V2-007 with V2-011 and V2-107 (price zero while u ≤ s is A69/A70 as first
  written). Contradictions: 10 between lanes or with v1, 5 hidden; 7 inside single lanes, 6 hidden. Step 3 launched.
- 2026-11-19: step 3 done (Opus, 322k tokens, 20 min). No verdict raised: 86 confirmed, 53 holds in part (all
  narrowed; 9 now leave a point open with a named measurement), 1 refuted (V2-077, replaced by corrected W61, left
  open, new measurement Q36), 5 cannot be checked (V2-108 to V2-112; a later check reads the report sections they
  rest on). V2-004 fixed. The 12 hidden contradictions are rows K9 to K20. `v2.jsonl`: 41 hypothesis records,
  v2-0400 to v2-0440, none superseding.
- 2026-11-19: step 4 checks. Draft has sections 1-7 and "8. Verdicts". `v2.jsonl` parses: 41 records, ids unique,
  one field order (two records omit the optional `see`), all `kind` hypothesis, no `supersedes`. Usage 58 %
  (Fable 45 %). Committed only the ten files of this draft; version 1 untouched.

| Step | State |
| --- | --- |
| 1 to 4 | done |
