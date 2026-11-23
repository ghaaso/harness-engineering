# S2.2 checkpoint 2 (successor 1, `S2.2 model successor 1`, LIMIT at 279 K context, 25.6 M tokens, 154 calls)

Worktree `MAIN/.claude/worktrees/S2.2`, branch `u/S2.2`, last commit **4609c934** (clean tree). Brief: `briefs/S2.md` part S2.2.
Unit tokens so far: 14.1 M (builder) + 25.6 M (successor 1) = 39.7 M of 60 M: about 20 M left for successor 2.
Scratch: `C:/Users/User/AppData/Local/Temp/claude/29140a92c6ee6732/0be12bcd-59b5-459b-885b-8c18b487d6f7/scratchpad/S2.2-build/`:
`c2.mjs <modeldir> "ID|part|set|save|mem" ...` runs check-build (set `F=1,G=0`; save = a JSON file name in scratch) and
prints states and failing properties; `probe2.mjs <abs modeldir> ID part set json prop maxStates field` replays a
failing trace to its last state and lists the labels reachable from it without faults (finds what is stuck);
`apply.mjs <file> <spec>` (FROM/TO blocks); `show.mjs < json` (in the model folder) prints a trace.

## Done (successor 1)

1. **The liveness failures of checkpoint 1 were model errors, all fixed** (commits 4bb7ec3c, 2267a4af):
   - owner step under a drain (the plan still starts an admitted row, lib.mjs:4121-4127); the owner's typing is its
     own process `PROC.OT = 29`, **strongly fair** (check-build Emerson-Lei refinement; `--weak-owner` ablates it);
   - a dead nameable session's stop/commit close records "no such session" (dn) unless the id gap;
   - `orphanUncounted` (lib.mjs:4152-4165): the owner's `closed` also for a step-7 orphan under the id gap;
   - `ownerRow` under BLD_VERIFY_RECORDS only at stop-requested (closesMissing, lib.mjs:4222; stale verify_rounds).
   Now FN-R5-B k=0 / k=1,cs=1 / k=1,cd=1, FN-OUT-CLOSE-K2-B k=0 / k=1,cd=1, BQ5-NOSJ k<=3, IDGAP-X, CLOSE-APPROVAL hold.
2. **Lease (was vacuous):** the window needs reading (ii) (`FX_LEASE_NOBOUND`); C_LEASE has it and `FIELDS: 1`;
   LEASE-NOWIN added. LEASE-B fails LeaseFenceClaimed (6), LEASE-X (7), ORDER and NOWIN do not (bounded runs).
3. **IDGAP-W** now has a live session at the verify (the approval flags): Slots F 19; **IDGAP-WZ** (k=2,z=1,w=1) added.
4. **Tests:** `model-build.test.mjs` 29/29 pass, 29 s (lane S2.2-mtest1). guard-hook + status tests from a detached
   checkout outside `.claude/`: 80 tests, 75 pass, 0 fail, 5 skipped (lane S2.2-tests1; checkout removed).
5. **RUN-BUILD.md and MAP-build.md**, first drafts (committed 547f69a4), with every measured size and outcome.
6. check-build `--set F=v` (CB:30-33) and `--weak-owner`.

## Findings to carry to the result (expected outcomes in RUN-BUILD.md)

BQ5-SJ: RefusedStartNotCharged F 26 at k=3,q=3 (the charged third no-start fence). LEASE-B: LeaseFenceClaimed F 6.
IDGAP-W: Slots F 19. CLOSE-APPROVAL-R5 k=0: Slots F 16 and IDGAP-WZ: AlwaysCanResolve F 15 (traces not read yet: read
them with show.mjs / probe2.mjs and say in MAP-build what they are). FN-OUT-CLOSE-K2-B is 17x FN-OUT-CLOSE-K2 at
k=1,cd=1, so it runs by parts.

Since: commit **16d1eac9** + the MAP-build/checkpoint commit after it: RUN-BUILD section 0 (one run per branch S0.3
changed: done), IDGAP-WZ read (a finding: the false relay makes closesMissing false, no owner act) and
CLOSE-APPROVAL-R5 read (the R57 group split: no FX-CLOSE in the fence group); W4 2 and 4, PLAN 4 and 7 decided as fixed
choices in MAP-build section 2.

## Left (in order)

1. **W6 item 6** (`refute/W4.md:100-125`): wake group (FXW-6/FXW-5 base). Fault m puts a claimed child in mode IMIT
   (7; no detector fires, no READY); the age cap raises `age-cap` act-due at a tick (only for IMIT, the cap being above
   any healthy attempt); as built the coordinator's acknowledgement is a continue and re-arms the cap (fields ag/ac/ax
   reserved in the T byte), so EventuallyResolves fails by construction. The design leg needs FX-W5's `stuck` count and
   its owner alert, **which no model has** (FIX-wake.md:87: "FX-W5 re-raise interval and the stuck count ... no"); the
   re-raise itself is MB:1273 (`FIX_ACT_RERAISE`, `t.aks`). Build a small stuck counter (cap 1-2 raises) -> owner ends it.
2. **REDO** (fault g, ghost `sl`; refute/W4.md:132-137): only render reads the started line, no control path does, so
   it is a record property. Reconcile sets started at MB:450-455 (inside the turn's reconcile, not a successor step).
   One g fault cannot lose the line: the next turn's reconcile redoes it before any act moves the row. Losing it needs
   the next reconcile to fail too (a second g, or exit 75) before a commit at started: run at k=2,g=2.
3. (W1 item 9: done, it is FX-W1's `FIX_ALARM_MARKER` reading, on in FXW-4R-B; MAP-build section 3.)
4. FIX-JOIN 2b row 8 vs N2 (`refute/S2.1.md:108`) into MAP-build section 4; verify the MB line numbers in MAP-build.
5. Add the new configurations of items 1-2 to `model-build.test.mjs` SMALL and a flag-ablation test each; rerun
   (lane, `--timeout-s 140`).
6. Merge `build` into `u/S2.2` (`git -c core.longpaths=true merge build`), rerun model-build.test.mjs, guard-hook and
   status tests (detached checkout outside `.claude/`); `MAIN/research-tree/build/departures/S2.2.md` (what of the
   code is not modelled and why: FX-W3, FX-W7, the owner as a premise, reading (ii) bounded); `units/S2.2/result.md` last.
