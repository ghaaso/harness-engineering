PASS

# Refute W6-fix: the FX-W6 fix round, blind review (task r57-0507, slice 2; `refute: W4 FX-W6 fix blind review`)

Written 2026-11-20. Scope: `git diff d655547f u/W6` (u/W6 = cfdd10c4, landed on `build` at 96bc34cc). Read:
`briefs/FX-W6.md` (builder and refuter parts), `briefs/B0b.md` "Refuters", `model/results-build/VERDICT.md` sections 1
and 6, `refute/W4.md:100-125`, `departures/W6.md` items 1 and 8, `model/as-built/FIX-wake.md` line 48, FX-W5 steps 2-3
and FX-W6 steps 4-5, `units/W6/fix-result.md`, `departures/W6-fix.md`, the tests, and the root's runs in
`model/results-build/fx-w6/`. Scratch worktree `.claude/worktrees/rW6`, detached at cfdd10c4, now removed; `u/W6` and
`build` are unchanged. Each mutation was applied by
`scratchpad/W6-fix-refute/mutate.mjs` (an exact single match), run through MAIN's lane, and the file was restored from
HEAD afterwards (a clean `git status` after each).

## Mutations: every one is caught

| # | mutation | place | lane label | run | result |
|---|---|---|---|---|---|
| M1 | the re-arm restored (build d655547f's watch.mjs whole) | tcb/watch.mjs | rW6-M1-rearm | watch.test.mjs, `-p "FX-W6"` | **caught** by both age-cap tests: "FX-W6 age cap" `the acknowledgement does not re-arm the cap` 3 !== 0; "FX-W6 age cap stuck" expected exit 17, got 0 at ticks_total 18. These are the builder's failing assertions, reproduced |
| M1b | the re-arm moved into the re-raise (a raise again of the age cap sets age_base = age_ticks) | watch.mjs reraiseStuck | rW6-M1b-rearm-at-reraise | `-p "FX-W6\|W5 stuck"` | **caught** by both (5 !== 0; `never re-armed` 4 !== 0) |
| M2 | the age cap left out of FX-W5's re-raise (skipped as run-terminal is) | watch.mjs reraiseStuck | rW6-M2-noreraise | same | **caught** by both (expected exit 17 at tick 18) |
| M3 | its `stuck` count (an age cap never goes into stuck) | watch.mjs reraiseStuck | rW6-M3-nostuck | same | **caught** by "FX-W6 age cap stuck" (`raise 6`) |
| M3b | stuck one raise late, for the age cap only | watch.mjs reraiseStuck | rW6-M3b-stucklate | same | **caught** by "FX-W6 age cap stuck" (`raise 6`) |
| M4 | the model's as-built flag re-arming again (the re-raise branch back on BLD_AGE_STUCK, which no configuration sets) | model-build.mjs:1319 | rW6-M4-model-rearm | model-build.test.mjs, `-p "W6 item 6\|line 1015"` | **caught**: "W6 item 6 after the fix round", AGE-B fails is not [] |
| M4b | the same through the configurations (C_AGE with AB_AGE_REARM true) | configs-build.mjs:64 | rW6-M4b-config-rearm | same | **caught**: AGE-B fails AlwaysCanResolve, EventuallyResolves, AgeCapReachesOwner |
| M5 | line 1015 put back (S2.2's `c.pc = null`) | model-build.mjs:1015 | rW6-M5-line1015 | same | **caught**: the "line 1015" test, 623250 !== 619856 |
| M6 | the model's dead-man step for the age cap left on the old gate (BLD_AGE_STUCK) | model-build.mjs:1486 | rW6-M6-model-nodeadman | same | **caught**: AGE-B fails AlwaysCanResolve and EventuallyResolves (AgeCapReachesOwner still holds: small item 3) |

The baselines in rW6, unmutated: rW6-base-watch passed 6 of 6 (`FX-W6|W5 stuck`) and rW6-base-model passed 2 of 2. The
landing at 96bc34cc (`landings.jsonl`) ran the five files whole: watch 82 pass, 0 fail, 4 skipped; status 47/0/2;
handover 20/0/3; guard-hook 28/0/3; model-build 37/0/0. Not rerun here.

## The invariants the round claims

1. **Code.** An acknowledged age cap stays present, is raised again at FX-W5's intervals and is counted towards `stuck`.
   `age_base` stays 0, and nothing else in the control path changes. The diff deletes only the block and the two call
   arguments it read. `age_base` is set only by freshTaskState (grep of `tcb`). M1, M1b, M2, M3 and M3b are caught.
2. **The test came first and failed on the old code.**
   - 27e3a5e1 (06:36:50Z) changes only watch.test.mjs.
   - Lane `W6-fix-oldcode` ran at 06:37:03Z and exited 1.
   - The deletion 1c5a6633 was committed at 06:37:28Z.
   - `W6-fix-watch` ran at 06:37:38Z and exited 0.
   - M1 reproduces both failing assertions.
3. **The dead-man.** It reads `stuck` whatever the ident: status.mjs:956 and 992 (`stuck: stuck.length > 0`), and
   status.test.mjs:1276 drives it with `act-due:t1`. A new watcher keeps `active`, `reraise` and `stuck`
   (loadWatcherState, watch.mjs:357-369), so a hand-over does not restart the count.
4. **The model.**
   - BLD_AGE_CAP is set only by C_AGE, in AGE-B, AGE-STUCK and AGE-REARM.
   - FN-N2-B's flags (FN-N2 plus BUILT = {BQ5_OWNER_TURN, BLD_PROPS}) reach no changed line except 1015.
   - The variant and u/W6's model-build.mjs differ only at lines 236-240, 1015, 1310-1319 and 1483-1486. Line 1015
     differs from the variant's in its label only.
   - So R3 stands as FN-N2-B's k=2 result. M4, M4b, M5 and M6 are caught.
5. **RUN-BUILD section 9 against the root's outputs in `fx-w6/`.** Each figure is as stated:

   | configuration | size | states | result |
   |---|---|---|---|
   | AGE-B | whole | 476,122 | EventuallyResolves F 5, the rest hold |
   | AGE-B | k=2,m=1,o=1 | 162,074 | every property holds |
   | AGE-STUCK | both sizes | the same as AGE-B | the same as AGE-B |
   | AGE-REARM | whole | 434,359 | AgeCapReachesOwner F 16, AlwaysCanResolve F 3, EventuallyResolves F 5 |
   | AGE-REARM | k=2,m=1,o=1 | 62,123 | AgeCapReachesOwner F 16, EventuallyResolves F 16, AlwaysCanResolve F 3 |
   | FN-N2-B | k=1,u=1 | 619,856 | EventuallyResolves F 9 |
6. **Line references.** These all hold on u/W6:
   - MAP-build's watch.mjs:1177-1205, 1225-1267 and 1238-1267 (it starts at a blank line, as build's 1242-1271 did);
   - MB:236-241, 1318-1320 and 1483-1490;
   - coordinator.md:172-175 and 172-180.

   No other live file cites a coordinator.md line past 158 (grep of tcb, spec, CONTRACT.md, model/as-built and tools).

## The brief line (coordinator.md place 7b) against FIX-wake FX-W6 steps 4-5 and the fixed code

These sentences are true of the code:
- **The attempt and the READY.** Only an attempt at started or bound; uncharged; no fence; a READY (class 11 or 12)
  voids both acts (watch.mjs:1190-1194).
- **idle-child.** The kind is idle and hang_ticks ≥ idle_ticks; any new record of the attempt restarts the count
  (watch.mjs:330-339, 1198).
- **age-cap.** Counted ticks at bound reach attempt_max_ticks (watch.mjs:339, 1201).
- **"`stop request` takes only a fenced or committed attempt."** True (stop.mjs:360-363). Departure 1 is right that 5c
  alone would be refused.
- **The raises.** They come 15, 30, 60, 60, 60 and 60 ticks apart; at the sixth raise again (3 + stuck_raises; 285 ticks
  with the defaults) the act is `stuck` (reraiseInterval, stuckCount at watch.mjs:1225, reraiseStuck at 1244). This
  holds when each acknowledgement comes inside its interval. Class 17 is coalesced, but the events keep the interval.
- **The dead-man alerts (0c).** True.
- **"Stays due until fenced or committed or its READY."** True: a fence moves the row to step `fenced` at epoch e + 1
  (replace.mjs predictFence), and drop and cut are fences.

**Finding (not breaking): "Answer the child" (coordinator.md:162-163) is an act the code refuses.**
- **The profile.** The coordinator's profile, `tcb/profiles/coordinator.json`, has no tool that sends a message to a
  session.
  - `tools_allow` lists Read, Glob, Grep, Write, Edit, Agent, Bash (tcb-node only), PowerShell, ToolSearch,
    start_session, archive_session and stop_session.
  - `session_tools` holds only start and stop.
- **The hook.** Its settings send every tool through the hook (matcher `*`). The hook denies any tool that is not
  listed (guard-hook.mjs:467-468, `tool-not-allowed`; toolListed at :281 matches exact names).
- **No script answers a child.** There is no send_message in tcb, spec, CONTRACT or the facts.
- **Where the sentence comes from.** FIX-wake.md:343 ("The coordinator answers the child or stops it") and the root's
  brief. The line writes down a design gap that was already there.
- **Why it is not breaking.** The deny writes nothing. An unanswered idle child stays present, FX-W5 raises it again,
  and it reaches `stuck` and the dead-man. "Or stop the attempt" works.
- **What would close it.** Either an answer tool with a hook rule for it, or the line "stop the attempt, or acknowledge
  it and the owner is told".

## Small items

1. **"Stop it unless it is making progress" (coordinator.md:164).** The coordinator has no way to see progress.
   - Its read paths (`read_prefixes`) are run/status.json, views/, the store objects, gate.json, plan/, the briefs and
     the README. They do not include the child's transcripts or its attempt folder.
   - status.json carries no progress figure for an attempt.
   - FIX-wake FX-W6 step 5 says the scripts define no progress mark.
2. **The line names no fence reason** (departure 1). The reasons that fit an imitating child (stall, hang, loop, crash)
   are failures, so the coordinator's stop is charged (replace.mjs FAILURE and restartCharged). The act-due itself is
   not charged.
3. **AgeCapReachesOwner checks that a field reaches `stuck`** (`ax` = 1, MB:315), not that the owner acts. With the
   model's dead-man step off (M6), the property still holds. AlwaysCanResolve and EventuallyResolves carry the owner leg,
   and the test's `fails = []` catches M6. The definition is S2.2's, not this round's.
4. **No test pins the words of place 7b.** status.test.mjs:1410-1416 pins only places 8 and 9, so deleting 7b fails
   nothing. The brief asks for words only.
5. **RUN-BUILD section 9 names the wrong cause for the whole-run EventuallyResolves F 5.** For AGE-B and AGE-STUCK it
   calls the failure "fault u's process-list artefact (ABLATION-wake.md:55)", words copied from section 7. VERDICT
   row 7 classes it as the hand-over exit-2 cycle with no endturn (class c; this group has no N2), and the trace in
   `fx-w6/AGE-B.json` is that cycle.
6. **check-build.mjs's `--set` takes any name.** `--set BLD_AGE_STUCK=1` now runs silently as unset. No recorded command
   uses it (grep of `build/` and `results-build/`).
7. **An honest attempt now reaches the owner.** With no continue act, an attempt past attempt_max_ticks reaches the
   owner 285 ticks later. While it runs, the dead-man re-alerts every 30 minutes. This is the brief's "no act re-arms
   the cap", and fix-result lists it under "not done".

## Not done here

- **Not rerun:** the full watch, status, handover and guard-hook files. The landing ran them at 96bc34cc. guard-hook was
  not needed, because no mutation touched a spec.
- **The root's:** the e2e and suite 6.
- **No full-size model run:** the root's `fx-w6/` outputs were read instead.

Tokens: `refute: W4 FX-W6 fix blind review | calls 77 | tokens 13.25 M | context now 242.7 K` (expected 5.4 M, limit
15.6 M).
