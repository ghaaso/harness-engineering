# Result: unit CLAIM (FX-CLAIM, FIX-fence 2 rev 5)

- Branch `u/CLAIM` (cut from `build` ec3b04fd). Final commit **14dc9a06** "CLAIM: one claim per attempt (FX-CLAIM, FIX-fence 2 rev 5)".
- Settled branches followed: PROBE 5 reading (i), with rev 5 point 1 (a tombstone confirms at once only with no folder session) and point 2 (`--if-unclaimed`); PROBE 1(c) shared ids; Q5a (D3 stays real).

## Tests (MAIN's lane, from the worktree's research-tree; guard-hook from the detached hx-CLAIM checkout, since removed)

| File | Tests | Pass | Fail | Not run (skipped) | Lane label |
|---|---|---|---|---|---|
| tcb/test/replace.test.mjs | 84 | 82 | 0 | 2 (NA1, NA2) | CLAIM-replace |
| tcb/test/lib, admit, stop, status, handover (.test.mjs, one call) | 333 | 321 | 0 | 12 | CLAIM-five |
| tcb/test/guard-hook.test.mjs | 21 | 18 | 0 | 3 | CLAIM-guard |
| tcb/test/watch.test.mjs | 69 | 65 | 0 | 4 | CLAIM-watch |

New tests:
- guard-hook T10b: claim, attempt-claimed, attempt-cancelled, bad-input, claim-invalid;
- replace T7b (no-start, H_nostart, uncharged hand-over, reset), T7c (`--if-unclaimed` claimed-late, nothing written), T22b (bind not-claimed / not-claim-holder);
- lib T96x (step 7 with H3), T96y (lease: ticks and wall time), T96z (claims);
- stop T3b (tombstone with and without a folder session; claim holder named);
- admit T6b (no fixed 3).

Updated tests: guard-hook T13, replace T21 and T22, the replace `table()` and `argv()` helpers, and the lib S0.5 skeleton test.

The replace, five-file and watch runs were made before the doc-only commit content (CONTRACT, spec, briefs); guard-hook ran after it.

## Departures
`research-tree/build/departures/CLAIM.md` (12 items).

## Tokens
build-invariant: CLAIM claims and tombstones | calls 151 | tokens 27.85 M | context now 248.1 K

## Not done
- No new status test of reconcile by claim (`duplicate-session`, `claim-invalid`); status.test passes unchanged.
- `e2e/run-e2e.mjs` binds without a claim; it was neither run nor changed.
- For other units:
  - FX-W1's allow list must admit `--if-unclaimed`;
  - FX-PLAN must call `lib.startLeaseExpired`, pass `--if-unclaimed` on the lease act, and order bind after `claimed-late`; the `close-session` act (rev 5 point 1) is also FX-PLAN's;
  - at the merge, guard-hook's local session-id regex becomes FX-CGATE's `SID_RE`.
- Attempts made before the fix have no claim, so a failure fence reads them as no-start.
- PROBE 5 (transcript lag, first tool call) and PROBE 7(b) (session id on compaction) remain open.
