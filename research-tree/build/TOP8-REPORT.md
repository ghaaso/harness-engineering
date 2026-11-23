# Top session 8: the method enforced (r57-0532, ruling r57-0056), 2026-11-24

The record behind the owner's page `research-tree/build/page/top8-enforcement.html`. State and order of events:
`TOP8-STATE.md`. Every rule with what enforces it: `ENFORCEMENT-TABLE.md`. Records: t8-0100 to t8-0117, t8-0500,
t8-0501, t8-0700 (through `tools/journal.mjs`).

## What was built (each piece: refuses what; tests; seen live; cannot see)

| Piece | Refuses | Tests | Seen live | Cannot see | Records |
|---|---|---|---|---|---|
| Window ceiling, `.claude/hooks/window-ceiling.mjs` | every call except hand-over ones above a session's line (coordinator W* = F + sqrt(2Rg); others the checkpoint form) | 99 | yes: 152 K allowed; a scaled line refused a Grep; seen in a helper | calls-free talk, the current call, whether helpers are out, a coordinator not named in a state file | t8-0107, t8-0114 |
| Count gate, `.claude/hooks/count-gate.mjs` | a start past the app's 20 or a width/hold declared in `WIDTHS.md` | 25 | width 0 refused a probe; `--status` right; the 20 only replayed (26 of 26 refusals at 20) | memory, processor, token windows, parent's window, child sessions, Workflow-script helpers | t8-0108, t8-0109, t8-0100 to t8-0103 |
| Fan-out gate, `.claude/hooks/fanout-gate.mjs` | a limit with no measured basis; limits past the cap; no meter reading in an earlier message | 36 | yes: refused without a reading, passed in the next message, refused without a basis | a cost the plan left out (t7-0602), the coordinator's own tokens to come, child sessions | t8-0110, t8-0111 |
| Owner report, `.claude/hooks/owner-report.mjs` | ids, unit names, paths, money, "in no paper" in a box, a page, a last message | 23 | box refused live; Stop path not yet seen | plain words, picture first, a label he asked for | t8-0112 |
| Journal tool, guard v3, watch, commit check v3 | every write under `library/journal/` not by the tool; a line the tool did not write | 245 + 23 + 12 + 20 | guard refusal seen; the watch's after-report not seen (tests only) | a script that computes its path (reported after), merges and rebases, `--no-verify` | t8-0113 |

## Measured here
- A hook can read the context size from the transcript it is pointed at, though its input never carries it
  (t8-0114; r57-0106 is right about the input). 123,050 counted against the app's 127,926.
- A hook added to settings in a message does not bind that message's own call (t8-0115).
- The app's limit of 20 helpers: 26 of 26 refusals at 20 running, 178 starts at 19 or fewer (t8-0109).
- The cap scan: 751.4 M counted on the build of 2026-11-19 against r57-0170's 750.2 M (t8-0111).
- App request lines separate every message after tool results (15,246 of 15,246, t8-0105).

## Review and fixes (t8-0116)
The blind review (`refute/TOP8.md`, read before the unit reports) found 4 breaking and 13 non-breaking points. Breaking:
(B1) the ceiling's line fell below zero after one large early result; (B2) the fan-out gate refused every first start
of a wave and the count gate then held the refused start as pending; (B3) the coordinator's W* was applied to every
session; (B4) numbers cited a result file, not a record. One fixer repaired all four and the two refusal-text faults;
numbers are now records (t8-0100 to t8-0106) or computed from them. Tests after the fixes: ceiling 99, count 25,
fan-out 36, journal tool 23, others unchanged and passing.

## Cost (t8-0117)
Counted as r57-0170 did: helpers 72.1 M (fix 22.2 M against a limit of 16 M; journal 11.7 M; review 11.3 M; count 7.4 M;
basis 6.3 M; report 5.5 M; ceiling 4.5 M; table 2.6 M; probe 0.1 M) plus the top session 9.7 M = 81.8 M, with the record
unit (0.7 M when counted) not included. Cap 110 M (agreed by the owner), expected 80 M, so 74 % of the cap. The fix unit
is the only one past its limit.

## Open
- t8-0500: the 13 non-breaking points (N1 to N13), none fixed; each is one retry or one hand step.
- t8-0501: what stays a written rule (rule 2, the judgment rulings, asked-for against own-initiative work, the truth of
  a claim) and seven designed checks nobody built (table proposals 4 to 10).
- Nothing is committed. Wiring: all five new hooks are in `.claude/settings.json` and `library/.claude/settings.json`
  (journal-watch also), per `TOP8-STATE.md`.

## Where this leaves the work
r57-0532 is done (t8-0700). NEXT is r57-0531: the owner's approve: for each item of the page of the seven replays.
