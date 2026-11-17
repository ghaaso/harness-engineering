# r3-changes: what each proposed fix needs (helper C, round 3, 2026-11-17)

**Updated 2026-11-17, about 21:26 (local clock of the shell), after the join (`FIX-JOIN.md`), the revision-5 notes of `FIX-fence.md` and `FIX-wake.md`, and the model's results (`ABLATION-fence.md`, `ABLATION-wake.md` with its "Final pass", `FIDELITY-3.md` parts 2 and 3).**

Sources (all in `model/as-built/`):
- `F` = `FIX-fence.md` (sections: 0 table, 0b hook write, 1 FX-OUT, 2 FX-CLAIM, 3 FX-CGATE, 4 FX-CLOSE, 5 FX-REDO, 6 FX-PLAN, 9 probes, 10 open, 12 modeller, "Revision 5 notes" at the end).
- `W` = `FIX-wake.md` (headings: top tables, FX-W1..FX-W7, change log, For the modeller, "Revision 5 notes" N1-N3 at the end).
- `J` = `FIX-JOIN.md` (part 1 = the 13 points, 2a flags, 2b order of acts, 2c shared state, 3 rule sentences).
- `AF` = `ABLATION-fence.md`, `AW` = `ABLATION-wake.md`, `FD3` = `FIDELITY-3.md` (part 2 = sections 9-14, part 3 = sections 15-16).

Nothing is invented. Line numbers are those the sources cite (today's scripts).

Markers used in this file:
- **[J]** = the join resolved the point from the files, restating what F, W or the scripts already say.
- **[J-new]** = new in the join, not attacked.
- **[R5]** = revision 5, not attacked.
- Unmarked = revision 4 or earlier, as in the first pass.

Script abbreviations: lib = lib.mjs, hook = guard-hook.mjs.
Harness-fact numbering differs: F uses PROBE 1-12; W uses H1, H2, H4, H5, H7 (HARNESS-FACTS facts 2, 4, -, 5, 8).

## 1. All fixes

"Attacked?" = was the fix's last change attacked by a refuter (F and W status tables). The two model columns: "Shown needed by the model" = the ablation's failing property and trace length (AF, AW; "F n" = fails with an n-step trace; BOUNDED runs show real traces but never "holds"); "The model's holds" = the reviewer's verdict (FD3 section 9 for the fence fixes, section 15 for the wake fixes). The reviewer reviewed the frozen files before the final pass; where the final pass (AW) or revision 5 changed a fix after that, the row says so.

| Id | Defects closed | Verdict (pass 3) and last change | Attacked? | Depends on | Shown needed by the model | The model's holds |
|---|---|---|---|---|---|---|
| 0b hook write (strict `exclusiveWrite`) | N5, C9, O5/X5 as far as the hook controls, part of N1/N2 | Part of FX-OUT/CLAIM/CGATE (F 0b) | No | PROBE 6, 12 | Not modelled: every hook create is one atomic step; tamper and unparsable records out of the model (AF 1) | Not reviewed separately |
| FX-OUT | D4a, half-written READY, M6 gap, N1 | Stands with a change. Rev 5: liveness depends on FX-CLOSE, stated, no step changed [R5]. Rev 4: no slot or tombstone without a manifest (H1) | No | Q6 (equal both ways); PROBE 2, 3, 6, 9; **FX-PLAN step 1**; **FX-CLOSE** (R5 point 3) | ReadyNotDiscarded F 6 (`FX-OUT-X`, BOUNDED, real trace). Without FX-PLAN step 1: AlwaysCanResolve F 8, EventuallyResolves F 17 (AF 1) | Relied on with a stated limit: safety only. Slots and the liveness "holds" rested on a commit oracle the fix makes necessary (FD3 9.1 a). Final pass: FX-OUT with FX-CLOSE, K2, complete 8,225,714 states, every property holds (`FN-OUT-CLOSE`); without FX-CLOSE AlwaysCanResolve F 6 (AW final F3 b) |
| FX-CLAIM | D4b, D3 child backstop, RC gap, C1, C2/N7 | Stands, with a design hole found by FD3 and fixed in rev 5: tombstone confirms at once only with no visible folder session; every counted session gets a close; lease fence `--if-unclaimed`; timing assumption restated [R5 points 1, 2] | No (rev 3 change attacked, stands) | PROBE 1, 5, 7, 9; transcript-lag bound; wake group's dead-man for the lease (J point 1) | Slots F 16 (`FX-CLAIM-X`, BOUNDED, real trace). Reading (ii) (no lag bound): Slots F 8 and NoChargeWithoutFault F 8 with the fix on (AF 1) | Relied on with a stated limit: safety only, under a stronger assumption than stated (no stall past the lease); liveness not relied on (step 7 counted sessions nothing closes, FD3 9.2 b). Final pass: without the rev-5 rule AlwaysCanResolve F 7, with it complete and every property holds (`FN-R5`, AW final F3 a); the reviewer has not read this |
| FX-CGATE | D3, coordinator retry, CE gap for session tools and helpers, N2, N6 | Stands with a change (rev 4: "no such session" recorded as such, H3) | No | Q5 (both branches); PROBE 1, 4, 6, 7, 8, 10 | Q5a: TwoCoordinatorsAct F 7, StaleWrites F 7, OneSessionPerAttempt F 8, Slots F 9, OneWriterPerAttempt F 10 (`FX-CGATE-X`, BOUNDED, real traces). Q5b: no ablation | Q5a: relied on with a stated limit (narrow configuration; nonce bind and hook-to-effect window merged, so schedules 12, 14 not expressible). Q5b: **cannot be relied on** (BOUNDED, 8 parts BOUNDED, 2 not run) |
| FX-CLOSE | D4c, N8 as a probe condition | Stands with a change (rev 4: verify counts "no such session" only for own start or empty list match, H3) | No | Q5; PROBE 10; FX-CGATE; FX-PLAN steps 0, 3 | AlwaysCanResolve F 5, EventuallyResolves F 17 (`FX-CLOSE-X`, complete). Sub-flag FX_PLAN_OWNEREND off: AlwaysCanResolve F 7 | Relied on with a stated limit: process list always available; PROBE 10(a), 10(b) assumed true; close, effect and done are one step |
| FX-REDO | Missing ledger line after a death | Stands (rev 2) | Yes (stands) | none | Not modelled: the model has no ledger lines; tested through the fs seam (lib.mjs:155) | Not reviewed (not modelled) |
| FX-PLAN | Planners' double start (status.mjs:542, watch.mjs:164), committed/started `bind` loop (status.mjs:543), Q5b wake loop (N9), N1 rest | Stands with a change. Rev 5: new act `close-session <sid>`; the lease act passes `--if-unclaimed` [R5]. Rev 4: owner rule ends (P1); `started` with no claim follows the admitted rule (P2) | No | Q5; FX-CLAIM lease; FX-CGATE `start.json`; FX-OUT log | AlwaysCanResolve F 3, EventuallyResolves F 10 (`FX-PLAN-X`, complete part). STARTWAIT off: AlwaysCanResolve F 4 (NoBusyLoop holds in the model: the loop is paced by ticks). Step 3 and FX-CLOSE are one fix (`FX-CLOSE-X`, F 5) | Relied on with a stated limit: holds in all three configurations; the watcher delegates to `planAct` only for some rows, `rowAct` not rewired in the model. Step 1's `owner` refusal branch not modelled |
| FX-W1 | D1 (except hard kill under L1), M1 superseded exits, endturn exit 2 hiding a dead alarm, exit 67, test-flag forgery | Stands with a change (rev 4: per-script allow-list; marker prune) | **No** | L1/L2; H2 | NoSilenceAfterFirstCall F 5 (`FXW-4R-X1`, part k=1,u=1, complete) = schedule W3. Allow-list, prune, L2: not modelled | Relied on with a stated limit: five complete maximal parts, judged inside a configuration with a re-alert; its load is on silence, liveness comes from FX-W4; faults y and o in no part |
| FX-W2 | M2 window; D6 paths 2, 3, 4; B2.2, B2.3, B1.4 | Stands; modelled: holds only with FX-W4. Rev 5: premises (a), (b), "correct only with FX-W4" stated; the endturn-closes-every-turn rule (N2) [R5] | **No** (rev 5); rev 3 attacked in pass 3 | H1; S1/S2; **FX-W4**; premises (a), (b) | NoSilenceAfterFirstCall F 1 (`FXW-4R-X2`, the M2 gap). Without the dead-man: NoDeadlock F 2, AlwaysCanResolve F 2 (`FXW-12-X2`, BOUNDED) | Relied on with a stated limit: same five parts; rests on premises (a), (b) (rules about timing, not mechanisms); schedules 2, 8, 9 not covered; hard kill open by design |
| FX-W3 | D2 (an enforcer for each act); B1.1, B1.2 | Stands with a change (rev 4: `unarmed` record). Rev 5: brief rule "every turn ends with endturn, also after handover exit 2 and exit 75" (N2) [R5] | **No** | H2; FX-W1 marker; FX-W2 `turn.json` | **Not modelled**: a stale `confirmed` cannot reach the gate under FX-W2 in this model; needs new fault semantics (AW final F1). Schedules W1, W7, W9, W17 not expressible | Not reviewed, not relied on (not modelled) |
| FX-W4 | D6 paths 1, 5, 6, 7; B3.2; B4.1; B4.5; B6.1 alert; D1 recovery for a skipped watcher restart (join: `runs_no_watcher`) | Stands with a change. Rev 5: re-alert while the cause holds, pace P1/P2 (N1); premise (c) stated [R5]. Rev 4: `watcher-busy.json`, 3 of 5 | **No** | H4 A/B; owner install; FX-W5, W7, W3 inputs; P1/P2 | NoDeadlock F 2, AlwaysCanResolve F 2 (`FXW-4-X`, part k=1,x=1). As designed in rev 4 (once per onset): NoDeadlock F 8, AlwaysCanResolve F 7 at one fault x, **a design gap, closed by rev 5's re-alert**. Final pass: re-alert off F 8 / F 7, on holds (AW final F4) | As designed in rev 4: **cannot be relied on**. With the candidate re-alert (now the rev-5 design): relied on with a stated limit, but the reviewer's verdict predates the design (owner assumed to always answer, WakeToRun assumed, list window a saturating counter, `stuck`, busy, unarmed inputs and `runs_no_watcher` absent) |
| FX-W5 | M3 gap; feeds B3.2 alert | Stands (rev 3) | Yes (pass 3) | R1/R2 | EventuallyResolves F 13 without it (AB-W-ACT-DUE, part o1cs1; with the fix complete, holds, `FXW-5__o1cs1`) | Relied on with a stated limit: shown only in the one part where the defect lives; whole-run liveness masked by hand-over/u failures |
| FX-W6 | D5, B5.2 bounded, B5.3 | Stands with a change. Rev 5: B1 premise stated (N3) [R5]. Rev 4: age cap asks the coordinator, uncharged | **No** | H5; B1/B2 | NoFalseSuspicion F 6 (`FXW-6-X` = AB-W-HANG-CALLS, BOUNDED; removes step 1 and the cap together) | Relied on with a stated limit: **the "holds" is its premise**. A SLOW child's hang count is capped below the threshold, so under B1 the property cannot fail; kinds, idle, age cap, B2 not modelled |
| FX-W7 | D1b; restart loop on exit 67; two writers of watcher state; B6.1 | Stands with a change (rev 4: copy of state) | **No** | L1/L2; RL-yes/RL-no | **Not modelled**: SingleWatcher and NoBusyLoop hold in every as-built configuration; needs a hung run-lock holder and a split tick, a new mechanism (AW final F1) | Not reviewed, not relied on (not modelled) |

Reading the model columns together (FD3 section 16; AW section 4): joint runs are BOUNDED (`FXW-ALL`: 2,579,912 states, 10 of 13 fixes, no interaction failure seen, but only BFS levels 0-13); FX-W3, FX-W7 and FX-REDO are not in any run.

F status: "Rev 4 changes only four points"; P3, P4, P5 and "one source for the fence's refusal rules" are open (F 10).

## 2. Probes first (check before building)

Each probe once. "Branch" = what follows if it is true / false. New items from the join are marked.

| Probe | Fact | Fixes that lean on it | If true / if false |
|---|---|---|---|
| F-P1a | PreToolUse input carries `session_id` | FX-CLAIM step 1, FX-CGATE steps 2-6, FX-PLAN | True: build as designed. False: no claim, no coordinator identity; FX-CLAIM and FX-CGATE cannot be built (inferred; F gives no fallback) |
| F-P1b | Exact `session_id` format | FX-CGATE `SID_RE` | Fix `SID_RE` (hex and hyphens, fixed length; INFERRED UUID) |
| F-P1c | Helper shares the id (a) or has its own (c) | FX-CGATE, FX-CLAIM | (c): every helper call denied; open, protocol choice for the owner |
| F-P1d | Where helper transcripts live (N10) | FX-CLAIM step 7 (`slotCount`), FX-CLOSE verify (b) | Top-level `.jsonl` in the project folder: helpers counted as folder sessions (open N10) |
| F-P2 | Write input carries full `content` | FX-OUT hook step 3 | False: hook cannot copy READY bytes (inferred) |
| F-P3 | A helper's tool calls run the attempt's hook | FX-OUT | False: helper writes pass unchecked (inferred) |
| F-P4 | Session tools' input names the folder or target session; **their exact tool names** [J point 3: INFERRED candidates `mcp__ccd_session__start_session`, `mcp__ccd_session_mgmt__stop_session`] | FX-CGATE steps 4-6; `profiles/coordinator.json` `session_tools` | False: `tool-not-allowed` (F 3). The names fill `session_tools` |
| F-P5 | Bound on transcript lag after a start **and the time to a child's first tool call** (measure in the pilot) [R5 point 2 adds the second] | FX-CLAIM lease, step 7, FX-PLAN | Bound known: lease set above both, Slots as invariant. Unknown: owner chooses "Slots eventually" or a longer lease (R5); AF reading (ii) shows Slots F 8 and NoChargeWithoutFault F 8 |
| F-P6 | What the harness does with a hook that times out or is killed | FX-OUT, FX-CLAIM, FX-CGATE (0b(c)) | "Lets it run": READY.json lands with no slot; recorded open |
| F-P7a/b | `session_id` survives compaction and resume | FX-CLAIM, FX-CGATE | (b) false: child locked out; coordinator locked out, recover from a terminal; open |
| F-P8 | Input carries `tool_use_id`; do duplicate hook entries run twice | FX-CGATE step 4 | No `tool_use_id`: repeated hook denied, start waits for lease, ends in a `crash` no-start fence |
| F-P9 | Matcher `*` runs the hook for every tool incl. MCP | all hook-based fixes | A precondition |
| F-P10a | Close "success" means the session is gone (N8) | FX-CGATE step 6a, FX-CLOSE | False: verify can confirm while the session finishes its model call; open |
| F-P10b | "No such session" is distinguishable (N4) | FX-CGATE step 6b, FX-CLOSE, **FX-PLAN `close-session` [R5]** | False: every crashed child ends with the owner; every R5 orphan too |
| F-P10c | A PostToolUse hook exists and the response is readable | FX-CGATE step 6, FX-CLOSE | No: every close goes to the owner |
| F-P11 | When several hooks answer, does a deny win | FX-CGATE + FX-W3 | **[J point 9] Not needed for this pair**: both run in the single PreToolUse entry of `settings/coordinator.json`, so it is program order in one process |
| F-P12 | `run/` and `wt/` support hard links | 0b(a) | `selftest` fails closed |
| W-H1 | Background exit reaches a session in a turn at its next tool call (observed) | FX-W2 | Observed true |
| W-H2 | PreToolUse hooks deny (believed, not observed) | FX-W1 allow-list, FX-W3 gating | Observe a denial once (owner); CONTRACT section 7 needs-app item 1 |
| W-H4 | Only the owner, a child note, or the session's own background command wakes a session | FX-W4, J point 1 (only the coordinator can restart the watcher) | Derived from HARNESS-FACTS facts 1-2 |
| W-H5 | Kinds of transcript record (believed) | FX-W6 `parseTranscript` | False: unreadable counts as `model` |
| W-H6 | What Windows logs for a suspend | M5 gap reader (withdrawn) | Check H6, then a reader |
| W-H7a | PC sleeps after 15 idle min; keep-awake lapses about 5 min after idle | FX-W4 timing | Quoted fact |
| W-H7b | Whether timers count while the PC sleeps | FX-W4, M5 gap, ALARM_FIRE branches; J point 1 bound | One measured suspend (owner). Model runs both branches |
| W-toast | A scheduled-task toast shows; anyone reads it | FX-W4 branch B | Branch A needs an app-level session (not in HARNESS-FACTS) |
| W-helpers | Profiles' `bash` grammar for helpers started through the coordinator's Agent tool | FX-W1 step 5 | Read the profiles |
| W-allow | Allow-list content vs each script's spec of production calls (J 2c adds every fence-group form: `handover bind --ce --nonce`, `replace fence/start/bind`, `stop request/verify`, `commit`, `status --reconcile --arm-nonces`, `--endturn --acked-seq`) | FX-W1 step 5 | One check each |
| **W-turn [R5]** | Longest recorded coordinator turn (read-only measurement of transcripts) | FX-W2 premise (b) under S2 | If a turn can exceed 30 min (0.5 x `alarm_ms`): owner chooses slot 2's period = 2 x `alarm_ms` (premise becomes turn < 1 x `alarm_ms`) or states it not covered |
| **W-premise (a), (c) [R5]** | (a) an alarm does not fire between its ensure and the same turn's reconcile hold 2; (c) a pending wake starts call 1 within one `deadman_period` | FX-W2, FX-W4 | No probe; each fails only toward the safe side (an unconfirmed turn; a spurious alert) |

## 3. By script

Order within a script: as given. "J" rows are from the join; "R5" rows from revision 5.

### tcb/lib.mjs

| Fix | Place (cited) | Change |
|---|---|---|
| 0b | `exclusiveWrite` 659-710; folders 660; fallback 676-688 | Options arg `{strict}`: no fallback (throws `no-hardlink`), no parent creation (`no-parent`) (F 0b) |
| 0b | `fsRetry` 162-173 | New `budget` arg = time left to `hook_deadline_ms` (thresholds.json:52, 5000) |
| FX-OUT | new | `outcomeState(attemptDir,row)` (R-a, R-b, R-c) and `outcomeAppend` |
| FX-OUT | `lib.fence` callback 1774 | Becomes the log check (Q6a) |
| FX-CLAIM | new | Claim helpers |
| FX-CLAIM | tasks schema; `lib.fence` 1773, 1785-1791, 1782 | `nostart`, counted and charged for `FAILURE_REASONS` only; reset on a session claim; `host` unchanged |
| FX-CLAIM | `lib.slotCount` 3063-3102 (signature takes `opts.root`, L:3059-3065) | +1 `unconfirmed` per folder session without a done file and not the claim holder of a stop-confirmed attempt. **[J point 7]** needs the run root: callers pass `{ root }` (see admit, handover, status below); without a root count every folder session `unconfirmed` (fail closed). **[R5]** every session step 7 counts must get a close (the `close-session` act, FX-PLAN) |
| FX-CLAIM | thresholds | `H_nostart` (2), `start_lease_ticks`, `start_lease_ms` |
| FX-CLAIM **[R5]** | timing assumption (text) | Sentence: "Slots as an invariant assumes that every started session makes its first tool call, or shows its transcript, within the lease ... A first model call longer than the lease is a stall: without a visible transcript it can break Slots (reading ii), and with one it is counted and closed" |
| FX-CLOSE | tasks schema; thresholds | `verify_rounds`; `stop_verify_ms` |
| FX-PLAN | new | `planAct(row, facts)` used by `nextOf` and `rowAct`; **[J point 11]** facts include `zombieOver` (status passes it, S:520; watch's `rowAct` lacks it today). **[R5]** new act `close-session <sid>` for every session step 7 counts and no attempt's stop is closing; if its close does not count (H3) the act becomes `owner`. The lease act is `replace-fence --reason crash --if-unclaimed`. **[J point 10]** answer unchanged by arm state: stays `start-session` when not armed |
| FX-W1 | beside 1202 | `liveness(rec, proc, markers)` |
| FX-W2 | `realProc` 2755-2759 | Timeout argument (`ensure_query_ms` 10 s) |
| FX-W2 | thresholds | `ensure_query_ms`, `release_ms`, `arm_confirm_ms`, `alarm_slots` |
| FX-W3 | `withRunLock` 1463-1472 | Option `{requireArmed: true}`; exit 6 `not-armed` |
| FX-W6 | `parseTranscript` tail; thresholds | Return the kind; `idle_ticks`, `attempt_max_ticks` |
| FX-W7 | `acquireLock` 1315-1328, 1366-1369 | Break `watcher.lock` only under the run lock after re-reading bytes; thresholds `watcher_lock_try_ms`, `busy_alert_ticks`, `watcher_lease_ticks` |
| FX-W1 (L2), FX-W7 (RL-yes), FX-W5 | thresholds | `lease_ms`, `beat_ms`; `run_lock_lease_ms`; `stuck_raises` (3) |
| FX-W4 **[R5]** | thresholds | `realert_runs` = 6 (P1) or 6, 12, 24 capped at 24 (P2) |
| Build order across lib **[J point 11]** | | 1. 0b; 2. `outcomeState` and claim helpers; 3. `planAct`; 4. `liveness` and `realProc` timeout; 5. `withRunLock` `requireArmed`; 6. `acquireLock`; 7. `parseTranscript` kind; 8. `slotCount` |
| `lib.fence` order **[J point 11]** | callback at L:1774 and charge at L:1782-1791 | Disjoint parts of `lib.fence` (FX-OUT and FX-CLAIM) |

### tcb/guard-hook.mjs

| Fix | Place (cited) | Change |
|---|---|---|
| FX-OUT | new step after 459; checks 412-459, 394-409, 93, 130-145 | Child Write/Edit: Edit to READY denied `ready-write-only`; Write to READY checked; log read; fenced -> `attempt-fenced`; create ready slot |
| FX-CLAIM | `parseInput` 210-226; after 409 | Keep `session_id`; `SID_RE`; strict-create `claim.json`; deny `attempt-claimed` / `attempt-cancelled` |
| FX-CGATE | coordinator path (skipped today, 394); `SID_RE`; TASK_RE/EPOCH_RE 27-28 | Coordinator branch: bind call (after profile and Bash grammar 412-413, 519-521), current-ce check, session-start tool `start.json`, stop PreToolUse intent, PostToolUse mode, name validation (`bad-target`) |
| FX-CGATE **[J-new point 3]** | `PROFILE_KEYS` (G:33), `toolListed` (G:279-281), tool refusal (G:413) | Accept the profile key `session_tools: {start: [...], stop: [...]}`; every name must appear in `tools_allow`; the hook uses it to know which listed tool starts and which stops |
| FX-W1 | `checkTcbNode` 315-353 | Per-script allow-list of production flags; other `--` tokens refused `flag not allowed` (refused for every script: `--once`, `--boot`, `--tick`, `--now`, `--sleep-ms`, `--interval-ms`, `--free-mb`, `--no-intake`) |
| FX-W3 | coordinator branch | Deny the session-start tool when not armed |
| **[J-new point 9]** hook order | one PreToolUse entry per role (`settings/coordinator.json` lines 57-64) | Order inside the one process: profile and grammar -> allow-list -> bind recognition -> current session -> armed predicate -> row check -> only then the strict create of `start.json`. A denial writes nothing. (J: W's "both are file reads" is wrong for the start step, which writes) |
| FX-PLAN/Q5 **[J-new]** | allow-list | Must hold every production form incl. each fence-group call (see probe W-allow); `--if-unclaimed` is a new `replace` flag that is not named in any list (see section 10) |
| 0b | all hook writes | Strict create with budget |

### tcb/replace.mjs

| Fix | Place | Change |
|---|---|---|
| FX-OUT | `readyValid` 183-201 | Removed |
| FX-OUT | M6 block 473-477, fence 451-522 | Replaced by fence steps 1-7 |
| FX-OUT | `predictFence` 400-426 | Called also in the real run |
| FX-OUT | `start` | Creates `outcome/` with the manifest |
| FX-CLAIM | fence | Tombstone at FX-OUT step 6 (attempt with a manifest); `nostart` handling |
| FX-CLAIM | bind 976-1013 (987-998) | No claim: exit 6 `not-claimed`; holder not S: exit 1 `not-claim-holder` |
| FX-CLAIM **[R5 point 2]** | fence, option `--if-unclaimed` | Inside the hold, if the tombstone create finds a session claim: exit 5 `claimed-late`, nothing written (FX-OUT step 3 ran first, so no slot). The planner then orders `bind`. Removes the charge on a healthy session whose claim came late; does not remove the Slots failure under reading (ii) |
| FX-W3 | `underLock` 271-277 | `requireArmed` on `start` and on fence reason `first` |
| One fence hold **[J point 11]** | | Order: `requireArmed` (reason `first` only) -> FX-OUT steps 1-5 -> tombstone -> `lib.fence` CAS with the log callback and `nostart` |

### tcb/commit.mjs, stop.mjs, handover.mjs, admit.mjs, fsck, render.mjs, selftest

| Fix | Script and place | Change |
|---|---|---|
| FX-OUT | commit.mjs 674-694 | Read the outcome log |
| FX-CLAIM | stop.mjs 283-302 | **[R5]** A tombstone confirms at once **only when no folder session is visible**; otherwise the stop is requested for every folder session and goes through verify (b). (Rev 4: confirmed at once) |
| FX-CLOSE | stop.mjs 278-283 (guard 277-279), 426-449 | `stop request` accepts committed && started; `stop verify` rules (a)(b)(c), `verify_rounds`, owner at 3 |
| FX-W6 | stop.mjs | B2 only. **[J point 5] Open**: the place would be `stop verify`'s confirmed-stop hold (stop.mjs:426-449) with a row field `refunded`; the evidence rule for "a fence shown false" needs an owner ruling; not modelled |
| FX-CGATE | handover.mjs 209-213, 338-343, 351-353, bind 371- | `successor_nonce`; nonce in the brief line; bind checks nonce |
| FX-W3 | handover `briefLine` 351-354 | **[J 2c]** One line: the nonce and the path `tcb/briefs/coordinator.md` |
| FX-CLAIM **[J point 7]** | admit.mjs:470, 572; handover.mjs:277; status.mjs:362 | The four callers of `slotCount` pass `{ root }` (W:548 already does). No other admit or handover line changes |
| FX-OUT | fsck | Gapless log, slots parse, nothing after a fenced slot |
| FX-REDO | fsck; render.mjs:625 | Fsck warns about missing lines; render orders by epoch when `redo` is set |
| 0b | selftest | Hard-link check in `run/` and `wt/`, fail closed; **[J point 8]** spec lists the folders `init` creates |
| FX-CGATE | `init` | Creates `run/close/intent`, `run/close/done`, `run/` |

### tcb/watch.mjs

| Fix | Place | Change |
|---|---|---|
| FX-OUT | `readReady` 118-121 | Read the log (**[J 2c]** the "READY of the current epoch" voiding suspicion is a ready slot via `outcomeState`) |
| FX-PLAN | `rowAct` 135, 157-165 | **[J point 11]** A filter around `planAct`: 1. `planAct(row, facts)`; 2. `owner` or `none` -> null (this is FX-W5 step 1); 3. keep today's "can take now" filters only here (free slot, not blocked for `replace-fence`/`replace-start`, W:138-139; sample age for `stop-verify`, W:150); 4. ident keyed as today. Transcript-visible branch 157-164 goes |
| FX-W1 | `runAlarm` exits 776-795 | Exit marker before every exit |
| FX-W2 | new flags | `--ensure`, `--nonce` |
| FX-W3 | `runAlarm` | `turn_seq_at_reg`; `unarmed-*` record on fire |
| FX-W5 | `rowAct`, evaluate | **[J point 11]** FX-W6's `idle-child` and `age-cap` are not row acts: they join the same act-due set in `evaluate` (W:347-421); FX-W5 re-raise and `stuck` run over the whole set, computed on FX-W7's copy `next` |
| FX-W6 | `evaluate` 347-421; `freshTaskState` | Per-kind deadlines; fresh-epoch tick counts nothing for hang and kind counters (not `ticks_total`, W:732; **[J 2c]**); `idle-child`; `age-cap` |
| FX-W7 | `evaluate` 627-668; `loadWatcherState`; W:725, 730-733 | Clone state, adopt after the hold; short run-lock wait; `run/watcher-busy.json`; quarantine corrupt state |
| FX-W3 E2 **[R5, owner choice]** | `runAlarm` | E2 only: an alarm whose period ends while a turn of its ce is open (`turn.json.turn_seq` newer than the slot's `turn_seq_at_reg` and `arm` not `spent`) defers its exit once by `alarm_ms`; file read, no lock. New mechanism; needs its own check before adoption (not modelled) |

### tcb/status.mjs

| Fix | Place | Change |
|---|---|---|
| FX-OUT | `readReady` 326-334 | Read the log |
| FX-CLAIM | reconcile 263-322 | Claim -> `started`; other folder session = `duplicate-session` |
| FX-CGATE | owner act `closed` | Check `SID_RE`, write done `outcome: "owner"` |
| FX-PLAN | `nextOf` 520 | Delegates to `planAct` |
| FX-W1 | `runEndturn` 643-658; `computeStatus` 353-354 | Tri-state report; `readLoose`; `state-corrupt` |
| FX-W2 | `runBuild`, `--arm-nonces`; `armAtStart` 593-602 | Add flag; write `turn.json`; wait; remove `armAtStart` |
| FX-W1 prune **[J-new point 6]** | reconcile hold 2 (W FX-W2 step 7) | Runner of the `run/arm/` prune: removes a marker only when **neither** a slot record **nor** the `turn.json.slots` being written names its (pid, start_time); `unarmed-*` records of the current ce stay; older ce may go. No clock read; "daily" dropped |
| FX-W3 | endturn | K = `turn.json.read_seq`, then `arm = spent`. **[J 2b row 9]** an exit 1 is acted on once (start the dead watcher or ensure again), then the turn ends; a second endturn with the same K is accepted (S:627-628) |
| FX-W4 | new mode `--deadman --root R` | Read-only; writes `run/deadman.json`. **[R5 N1]** after an alert, while the same cause holds, alerts again every `realert_runs` runs counted in the dead-man's own runs; the cause clearing for one run ends the onset. **[J-new point 1]** adds `runs_no_watcher` (the list answers and no watcher of the current ce is alive; alerts at >= 2); sub-flag `FIX_NOWATCHER_ALERT` under `FIX_DEADMAN` |
| FX-W4 | status view | Anomaly `deadman-nowake` |
| J point 1 | status anomalies | Existing `watcher-dead` (S:425, only when the list answers), `watcher-stale-ce` (S:426), endturn exit 1 `watcher-missing` (S:656), exit 2 `proc-unavailable` (S:652-653): the restart is the coordinator's act (brief) |

### New files and settings

| Fix | File | Content |
|---|---|---|
| FX-W3 | `tcb/briefs/coordinator.md` | New brief; see section 5 |
| FX-W4 | `tcb/settings/deadman-task.xml` | Task template, WakeToRun true |
| FX-W1 | `.gitignore` | Add `run/arm/` |
| FX-CGATE | `settings/coordinator.json` | A PostToolUse entry; **[J-new]** keep exactly one PreToolUse entry |
| FX-CGATE | `profiles/coordinator.json` | **[J-new]** `session_tools` (Q5a) or none (Q5b); see section 5 |
| FX-OUT/CLAIM/CGATE; FX-W2/W3/W4/W7 | runtime files | `outcome/<j>.json`, `claim.json`, `start.json`, `run/coord-session-<ce>.json`, `run/close/{intent,done}/`; `run/arm/slot-<k>.json`, `<nonce>.json`, `exited-*.json`, `unarmed-*.json`, `run/turn.json`, `run/deadman.json`, `run/watcher-busy.json` |

## 4. CONTRACT and spec

### CONTRACT (numbers from the join where it gave them, J point 4)

| Where | Change | Fix |
|---|---|---|
| §1.1 | none named | - |
| §1.2 (C:47) | W's amended R5 sentence verbatim (L2 only) **[J]** | FX-W1 |
| §1.4 | Wake and arm text | FX-W1, W2, W3, W6 |
| §2.1 | Dead-man; **[R5]** re-alert | FX-W4 |
| §3.6 (338-344) | Outcome log; claim; stop for committed/started (341) | FX-OUT, CLAIM, CGATE, CLOSE |
| §3.9 | Exit markers, arm files | FX-W1, W2, W3 |
| §3.10 and §4 | Watcher lock under run lock | FX-W7 |
| §3.12 Ready marker (C:440) | **[J]** add: "READY.json is a copy that no decision reads; the decision is the outcome log (§3.23)" | FX-OUT |
| §3.20 | Hang deadlines | FX-W6 |
| §3.21 Role profile (C:577) | **[J-new]** the `session_tools` key and the rule that its names appear in `tools_allow` | FX-CGATE |
| **new §3.23 Outcome log [outcome-slot]** (after §3.22) | **[J]** F section 1 "Layout" and "Reading rules" R-a to R-c as written | FX-OUT |
| §4.6 (770-785) | READY / M6 text | FX-OUT (Q6) |
| §4.10 | Claim | FX-CLAIM |
| §8.20 | Hook writes: strict exclusive creates only | FX-OUT, CGATE |
| `coord.json` | `successor_nonce`, `coord-session-<ce>` | FX-CGATE |
| Class 17 (C:97) and "Steps first match" text | planner text; **[R5]** `close-session` act | FX-PLAN |
| **new decision 41** (after 40, C:1141) | **[J]** the R6 sentences of section 8 below with the reason "round-3 model fixes D1, D2, D6" | FX-W2, W3, W4, J point 1 |
| decision 20 "guard-hook writes nothing" (C:1094) | **[J]** contradicted by F (hook writes by exclusive create); amend to "guard-hook takes no lock and writes only by strict exclusive create (§0b of FIX-fence), never a file a script writes" | 0b, FX-OUT/CLAIM/CGATE |
| §7 needs-app item 1 | observe the hook denying a call | W-H2 |

### spec (J point 8, by fix)

| Fix | Spec files |
|---|---|
| 0b | lib.md (`exclusiveWrite` strict, `fsRetry` budget), selftest.mjs.md |
| FX-OUT | lib.md (T56 for Q6a), guard-hook, replace, commit, watch, status, fsck, briefs.md |
| FX-CLAIM | lib.md (claim, `slotCount`, `nostart`), guard-hook, replace, status, stop, admit and handover (root passed), briefs.md |
| FX-CGATE | guard-hook (coordinator branch, Post mode), handover (nonce), status (owner act `closed`), selftest (folders at init) |
| FX-CLOSE | stop, lib.md (`verify_rounds`, threshold) |
| FX-REDO | replace, status, stop, fsck, render |
| FX-PLAN | lib.md (`planAct`, the table test), status, watch |
| FX-W1 | lib.md (`liveness`), watch, status, guard-hook (allow-list, from each script's spec of production calls) |
| FX-W2 | watch (`--ensure`, `--nonce`), status (`--arm-nonces`), lib.md (`realProc` timeout) |
| FX-W3 | lib.md (`withRunLock` option), replace, guard-hook, status (endturn), handover, briefs.md (coordinator brief) |
| FX-W4 | status (`--deadman`, incl. `runs_no_watcher` and the re-alert) |
| FX-W5 | watch |
| FX-W6 | watch, lib.md (`parseTranscript` kind), stop (B2 only) |
| FX-W7 | lib.md (`acquireLock`), watch |
| FX-PLAN table test | enumerate every (state, step) x {claim, start record, lease, Q5}; one act; script guard accepts; fails on (b) today. **[R5]** also the `close-session` act and the `--if-unclaimed` lease act |

## 5. Briefs, profiles, hooks, owner-installed parts

| Item | Change | Fix |
|---|---|---|
| Child brief `child.md:41` | **[J]** READY is a copy; the log decides. FX-CLAIM's line ("if every tool is denied `attempt-claimed` or `attempt-cancelled`, end your turn") | FX-OUT, FX-CLAIM |
| The four helper briefs **[J point 2]** | `fmea.md:21`, `fresh-reviewer.md:23`, `mapper.md:23`, `stpa.md:21` get the same READY line; **[J-new]** the FX-CLAIM line goes to these four too. `checker.md`, `reader.md`, `scorer.md` contain no READY, no change | FX-OUT, FX-CLAIM |
| Coordinator brief `tcb/briefs/coordinator.md` (new) | R6 acts, in the order of the join's turn (J 2b): (0) wake; (1) successor's first turn: `handover bind --ce N --nonce X`; (2) call 1, background: `watch --alarm --ensure --nonce X --root R --ce N` (S2: a second one); (3) call 2, foreground: `status --reconcile --arm-nonces X`; (4) restart a dead watcher **[J, not in W's list]**: when status shows `watcher-dead` or `watcher-stale-ce`, or no `watcher.json` of this ce, or endturn exit 1 names the watcher, start `watch.mjs --root R --ce N` in the background; on unknown (exit 2) start nothing; (5) revocations always (`replace fence` non-first, `stop request`, session stop, `stop verify`, `commit`); (6) work-creating acts only if the reconcile confirmed (`replace start`, fence `first`, session start); on exit 1 `arm-unconfirmed` take no work-creating act, take every revocation, end the turn **[J point 10]**; (7) `replace bind --session S` once a claim exists; (8) on exit 75 from a script: retry nothing; (9) `status --endturn --acked-seq K`. **[R5 N2]** replaces "end the turn" on exits: "Every turn's last call is `status --endturn`, also after `handover` exit 2 and after any exit 75. Act on its exit 1 once (ensure again or start the watcher), then end the turn. If endturn itself exits 75, end the turn." Also the act `close-session <sid>` **[R5]** and, per Q5, `start-session`/`stop-session` or `owner` | FX-W3 (closes D2), FX-W1, FX-W2, FX-CGATE, FX-PLAN |
| J 2b row 8 | **[R5]** the join's rule "any script exits 75: end the turn" is replaced by the N2 rule above | FX-W3 |
| Handover brief line (`briefLine` H:351-354) | **[J]** carries the nonce and the path `tcb/briefs/coordinator.md` | FX-CGATE, FX-W3 |
| `settings/coordinator.json` | PostToolUse entry for session stop; exactly one PreToolUse entry **[J-new]** | FX-CGATE |
| `profiles/coordinator.json` | Today `tools_allow` lists Read, Glob, Grep, Write, Edit, Agent, Bash, PowerShell, ToolSearch (lines 4-14) and no session tool. **Q5a** (owner): add the start and stop tool names to `tools_allow` and add `session_tools: {start: [...], stop: [...]}` **[J-new]** (names: PROBE 4). **Q5b**: no `session_tools`, or empty lists (the fact FX-PLAN's "Q5b detection" reads once per build) | FX-CGATE, FX-PLAN |
| Helper profiles (checker, mapper) | Read only; `bash: none` elsewhere (profiles line 46: `tcb-node` is the coordinator's only) | FX-W1 (open) |
| Owner installs | Scheduled task: 5 min, logged-on only, wake to run required, wake timers allowed, also at logon | FX-W4 |
| Owner runbook line | Coordinator dead or locked out: the owner drains and runs `handover raise` from a terminal, then starts the successor with the brief line | FX-CGATE |
| Owner acts | `status owner --act closed --subject <sid> --quote-file P` | FX-CGATE, FX-CLOSE, FX-PLAN (`close-session` becomes `owner` when its close does not count, R5) |
| Owner checks | Observe the hook denying a call once; test toast; one measured suspend; H6; read helper profiles' bash grammar; longest coordinator turn; PROBE 5 measurement | W open table; R5 |

## 6. New tests

| Fix | Test (one line) |
|---|---|
| 0b | `selftest` hard-link check; strict create throws `no-hardlink` / `no-parent`; hook denies when budget runs out |
| FX-OUT | READY write creates a ready slot; fenced slot denies `attempt-fenced`; refusal (`stale-epoch`, `wrong-step`, `hmax`) writes no slot; fence of a parked row writes no slot and no tombstone (FX_OUT_MANIFEST, schedule F1); torn tainted fence then commit refuses (F7); fsck: gapless log |
| FX-CLAIM | Second session denied `attempt-claimed`; tombstone denies `attempt-cancelled`; bind to loser exit 1; failure no-start loop capped by `H_nostart`, handover reasons uncharged (F8); lease needs ticks and wall time. **[R5]** tombstone with a visible folder session is not confirmed at once; `--if-unclaimed` fence exits 5 `claimed-late` with nothing written, planner then orders `bind` |
| FX-CGATE | Bind by nonce, wrong first binder denied; stale session read-only; forged close names denied `bad-target`; repeated `tool_use_id` allowed, different one denied `start-issued`; Post hook writes done on success or "no such session" with `by` |
| FX-CLOSE | `stop request` accepts committed/started; verify per (a)(b)(c); "no such session" counted only for own start or empty list match |
| FX-REDO | Each repeat call completes a missing ledger line only at the exact post-state, via the fs seam |
| FX-PLAN | Total-table spec test in `tcb/test/lib.test.mjs` **[J point 13]**; started-before-claim waits; Q5b gives `owner`. **[R5]** `close-session <sid>` for every counted session no stop is closing; becomes `owner` when its close does not count |
| FX-W1 | Exit marker on every alarm exit; allow-list refuses the eight test flags (in `tcb/test/guard-hook.test.mjs`, checked against each script's spec **[J point 13]**); marker prune only when neither a slot nor `turn.json.slots` names it **[J-new]** |
| FX-W2 | Reused nonce harmless; confirm deadline 45 s vs 10 s query; second reconcile keeps `confirmed` |
| FX-W3 | `not-armed` exit 6; revocation never gated; `unarmed` record; hook order: a denied start leaves no `start.json` **[J-new]** |
| FX-W4 | Dead-man alerts (`runs_no_alarm`, 3 of 5 list failures, stuck, `busy_ticks`, `unarmed_turns`, **`runs_no_watcher` [J-new]**) tested in `tcb/test/status.test.mjs` **[J point 13]**. **[R5]** re-alert every `realert_runs` runs while the cause holds; the cause clearing for one run ends the onset; P2 backoff 6, 12, 24 capped |
| FX-W5 | Re-raise interval and `stuck_count` |
| FX-W6 | Per-kind deadline; idle becomes act-due; age cap uncharged |
| FX-W7 | Watcher lock break only under run lock; busy tick drops the copy, no duplicate append |
| Coordinator turn **[R5 N2]** | Endturn after `handover` exit 2 and after exit 75; act on its exit 1 once |
| Model checks | One run with all fixes on; one ablation per fix; sub-flags FX_OUT_MANIFEST, FX_CLOSE_NOSUCH, FX_PLAN_OWNEREND, FX_PLAN_STARTWAIT, FIX_MARKER_PRUNE, FIX_UNARMED_REC, FIX_BUSY_FILE, FIX_LIST_WINDOW, FIX_AGE_ASK, FIX_TICK_COPY, FIX_FLAG_ALLOWLIST; **[J]** F schedules numbered F1-F14 and W schedules W1-W18; `FIX_NOWATCHER_ALERT` and `JOIN_HOOK_ORDER` (the join's two targeted checks, not expressible, AW final F2). **[R5]** flags `FX_CLAIM_ORPHANCLOSE` (AlwaysCanResolve), `FX_CLAIM_IFUNCLAIMED` (NoChargeWithoutFault), the joint FX-OUT + FX-PLAN + FX-CLOSE configuration. Final-pass results: `FN-R5` and `FN-OUT-CLOSE` hold; `FN-N2` holds NoSilenceAfterFirstCall; point 2 checks (a), (b) and the `close-session` act not run |

## 7. Depends on the owner's ruling

The six open questions of section 16 point 9 (protocol lines 1187-1194), then the property choices.

| Question | Fixes touched | What each branch changes |
|---|---|---|
| U3-F8 mapper: task role or helper | none in F, W, J, R5 (W lists helpers through the Agent tool as an open check) | (a) drop mapper from coordinator agent types; (b) second profile at the root. Note: the mapper brief gets the READY and claim lines (J point 2) either way |
| U2-F2 harvested cards URL-checked | none | not touched |
| U5-PF-1 draft file hash | none | not touched (FX-CGATE's owner act `closed` is a different owner line) |
| LR-4 unreadable lock reported | FX-W7, FX-W4 | (a) a lock-unreadable anomaly; (b) none (library breaks such a lock after about 30 s). Neither design resolves it; related to RL-yes/RL-no |
| Coordinator session tools (Q5) | FX-CGATE, FX-CLOSE, FX-PLAN, FX-CLAIM; J point 3; R2 rule sentence | Q5a: hook gates start and stop (steps 4-6), `session_tools` in the profile. Q5b: steps 1-3 and 7 only, tools refused, FX-PLAN answers `owner`; model: BOUNDED, **cannot be relied on** (FD3), hand-started children wake no coordinator (AF 2) |
| M6 library half (Q6) | FX-OUT | (a) widen into `lib.fence`; (b) keep in replace. One lock hold either way; model covers both |

Property choices left to the owner:

| Choice | Fixes | Branches |
|---|---|---|
| L1 / L2 | FX-W1, W2, W7; J point 1 | L1: no lease; a dead watcher with the list unknown is not restarted until the list answers, F schedule F6 fails by design, FX-W4 `list_hist` alerts. L2: lease; adds a term to the restart bound; amended R5 |
| S1 / S2 | FX-W2 | S1 one slot. S2 two slots (slot 2 period 1.5 x `alarm_ms`). **[R5]** under S2 premise (b) needs every turn < 0.5 x `alarm_ms`; owner ruling if the probe W-turn finds longer turns: slot 2 period 2 x `alarm_ms` or not covered |
| B1 / B2 | FX-W6 | B1 stated bound; **[R5]** the modelled NoFalseSuspicion result is for B1 only. B2: one refund; **[J point 5]** place and evidence rule open |
| R1 / R2 | FX-W5 | R1 re-raise; R2 as built (fails EventuallyResolves F 13) |
| RL-yes / RL-no | FX-W7 | Run-lock lease while list unknown or not |
| H4 A / B | FX-W4 | A app-level session; B toast. Model unchanged |
| H7 a / b | FX-W4, M5, FX-W6 | A fact; both run |
| **P1 / P2 [R5 N1]** | FX-W4 | Pace of the repeated dead-man alert. P1 constant: `realert_runs` = 6 (every 30 min). P2 backoff 6, 12, 24 runs, capped (every 2 h). Both give liveness; P2 nags less and waits longer. One untimed model for both |
| **E1 / E2 [R5 N2]** | FX-W3, FX-W2, FX-W4 | A coordinator that omits endturn anyway. E1: brief only; FX-W4 recovers (5-10 min with WakeToRun). E2: an alarm defers its exit once while a turn of its ce is open; new mechanism, needs its own check, premise (b) gains one deferral (2 x `alarm_ms`) |
| PROBE 5 outcome [R5] | FX-CLAIM, FX-PLAN | If no bound on transcript lag and first-tool-call time: "Slots eventually" or a longer lease |
| PROBE 1(c) | FX-CGATE | Helper ids: protocol choice |
| Q5 / Q6 | see above | |

Which of J's 15 proposed rule sentences need an owner ruling is in section 8.

## 8. Proposed rule sentences (J part 3)

Present text and full proposed sentences are in `FIX-JOIN.md` part 3 (each row marked **join**, new in the join, not attacked: neither FIX file proposes a sentence). Fifteen sentences:

| # | Rule | Fix | Owner ruling needed? |
|---|---|---|---|
| 1 | R2 (stale coordinator: current-ce session, one-time nonce, others read only) | FX-CGATE | Q5 (start/stop clause only in Q5a); PROBE 1(c) |
| 2 | R3 (reconcile records the start by the claim; a transcript is a second source; hook records the start; planner waits out the lease) | FX-CLAIM, FX-CGATE, FX-PLAN | Q5 |
| 3 | R4 (an act-due is raised again; three raises at the cap is `stuck`; one planner function; owner rows raise nothing) | FX-W5, FX-PLAN | R1/R2 |
| 4 | R5 (L2 sentence verbatim; hang by per-kind deadline, idle and age cap uncharged, first tick counts nothing) | FX-W1, W7 (L2); FX-W6 | L1/L2; RL-yes/RL-no; B1/B2 |
| 5 | R6-a (first call `--ensure`, second `--reconcile` counting unexited slots) | FX-W2 | S1/S2 |
| 6 | R6-b (tri-state: dead / unknown; exit markers; restart a dead watcher, start nothing on unknown) | FX-W1; J point 1 | L1/L2 |
| 7 | R6-c (acts that create work need an armed turn; revocations never gated; exit 75 ends the turn and retries nothing; brief lists the acts) | FX-W3 | no (but see section 10: exit 75 wording was replaced by R5 N2) |
| 8 | R6-d (bound: a dead watcher restarted within two alarm periods; the scheduled task alerts the owner, cannot wake the coordinator) | FX-W4, FX-W3, J point 1 | H4 A/B; H7 a/b |
| 9 | R7 (outcome log of write-once slots; fence refusals first; exit 5 ready-wins; READY.json a copy) | FX-OUT | Q6 (same behaviour both ways) |
| 10 | R8 (no-start fence uncharged for a failure reason only below `H_nostart`; B2: one refund, R + 1) | FX-CLAIM; FX-W6 B2 | B1/B2 (refund; evidence rule open) |
| 11 | R9 (close recorded by the hook; confirm needs counting closes and no growth over ticks and wall time; owner records the close after three rounds; no script kills a process) | FX-CLOSE, FX-CGATE | Q5; PROBE 10 |
| 12 | R10 (a folder session with no close record that is not the claim holder of a stop-confirmed attempt takes one more slot) | FX-CLAIM step 7 | no |
| 13 | R12 (handover raises ce and writes a nonce; first bind wins; owner drains from a terminal if the coordinator is dead) | FX-CGATE, FX-W3 | PROBE 7(b) |
| 14 | R13 (guard-hook takes no lock and writes only by strict exclusive create) | 0b, FX-OUT, CLAIM, CGATE | no |
| 15 | R29 (coordinator Bash limited to each script's production flags) | FX-W1 step 5 | no |

Class 17 is CONTRACT text only (C:97). No sentence for FX-REDO, or FX-W7 in L1.

The R6 sentences (rows 5 to 8) are also the text of the new decision 41 (section 4). The join (J point 1.5) also gives F's H2 row new text: "closed by R6's restart act at the coordinator's next turn, bound `T_resume <= T_turn + start_lease_ticks x Delta` (INFERRED, list answering); with the list unknown under L1, or with no coordinator turn, the owner is alerted (FX-W4); liveness only, never safety."

## 9. Open after this round

F section 10:

| Id | Defect | Reason |
|---|---|---|
| G6 | `plan/` Write in flight across a raise | Needs the write fenced |
| O5 / PROBE 6 | Harness lets a timed-out hook's tool run | Harness side unknown |
| C4 / G4 / PROBE 7(b) | `session_id` changes on compaction | No stable identity |
| PROBE 1(c) | Helpers with their own ids | Protocol choice |
| N8 / PROBE 10(a) | Close "success" not a stop | Harness semantics |
| N4 / PROBE 10(b) false | Crashed children go to owner | Stated trade |
| N10 | Helper transcripts counted as sessions | PROBE 1 |
| H2 | Watcher dead: lease never expires | **[J point 1]** now: closed by R6's restart act at the next turn; with the list unknown under L1 or with no coordinator turn, the owner is alerted. Liveness only |
| P3 | Table test does not cross log state, manifest, `verify_rounds` | Outside rev 4 |
| P4 | Old watcher keeps old planner after upgrade | Outside rev 4 |
| P5 | No owner supersede path for a refused fence-pending row | Unreachable without owner act |
| Fence rules | `predictFence` and `lib.fence` two copies | Outside rev 4 |
| Not covered | FX-OUT: READY whose outputs commit rejects; O7; PROBE 6. **[R5]** FX-OUT's liveness and Slots after a commit depend on FX-PLAN step 3 and FX-CLOSE: a READY accepted from the slot may leave the child running, inert, until closed (sentence to add under FX-OUT "Not covered"). FX-CLAIM: a duplicate's tokens before its first tool call. FX-CGATE: G6, allow-to-effect window, PROBE 1(c), 7(b). FX-PLAN: start record lost by a skipped hook | F |
| F schedules 5, 6 | Rollout (P4); watcher dead during a lease (H2) | Expected to fail; open / dependency |
| **[R5]** | PROBE 5 must measure lag and time to first tool call; reading (ii) (no bound) breaks Slots with no fault; owner chooses only if the probe finds no bound | R5 point 2 |
| **[R5]** | Every orphan session ends with the owner if PROBE 10(b) or the process list is unavailable | R5 point 1 |

W after revision 5 (new rows first):

| Defect | Reason |
|---|---|
| **[R5]** A coordinator that omits endturn anyway (N2 residue) | The rule lives in the brief only; E1 or E2 (owner) |
| **[R5]** Re-alert pace (N1) | P1 or P2 (owner) |
| **[R5]** Premise (b) under S2: every turn shorter than 0.5 x `alarm_ms` | Unmeasured; probe, then owner |
| **[R5]** Premises (a) and (c) | Stated; fail toward the safe side |
| Hard-killed alarm under list outage, L1 | Marker written only by a running alarm; L2 or FX-W4 alert |
| Suspends shorter than 2 Delta (M5 gap, timer branch b) | H6 unchecked |
| Do timers count during sleep (H7 b) | Not in HARNESS-FACTS |
| Alert reach (toast, branch A) | Unverified |
| One failure shared by every program start | Needs an off-PC channel |
| Dead-man task missing or disabled | Only an anomaly shows it |
| Child imitating activity (B5.2) | Age cap only asks |
| Healthy operation beyond kind deadline (D5 in B1) | B1 or B2 |
| Script cannot know which status.json the model read | Accepted |
| Every flag denial rests on the hook (H2 believed) | Needs-app item 1 |
| Helpers' profiles (checker, mapper) | Not checked |
| Allow-list content | New artefact, not attacked |
| `stuck` alert takes about 4.75 h | Bounded by FX-W5 cap; owner |
| 10 s process query times out under load | L2 or longer timeout |

Open in the join (J):
- Point 5: place and evidence rule for the B2 refund (see section 10).
- Point 1: under L1 with the list unknown, no restart (F schedule F6 fails by design).

Recorded open by the model (AF section 5, AW sections 6-7, FD3 section 16; the model reviewers' list of what R57 still needs):
- Q5b is BOUNDED (liveness failure after one lost wake; Slots failure judged an artefact, not shown to be one).
- Reading (ii) of the lease fails Slots and NoChargeWithoutFault with every fence fix on.
- Joint runs: AB-FENCE-ALL not run; FXW-ALL BOUNDED (10 of 13 fixes).
- FX-W3, FX-W7, FX-REDO not modelled; FIX_FLAG_ALLOWLIST, FIX_MARKER_PRUNE, L2, B2, E2 not modelled; the join's two targeted checks not expressible.
- Model gaps that still read true state: `tickEnabled` (timeliness; under FX-W6 it is the B1 premise), `eligibleHO`, admission without AB_SLOTCOUNT, C_OUT and C_CGATE run without AB_STOP_HELD.
- Short suspends: NoFalseSuspicion F 14 in `FXW-ALL` (timer branch b, open by design).
- Hand-over exit 2 under u (four liveness failures of `FXW-5` and `FXW-6`, which carry no FX-W4): recorded in CEX-wake 4.7, not a wake-fix question.
- FD3's list for R57: FX-OUT with FX-CLOSE (final pass ran it, section 1); the wake fixes with the fence hand-over; the pre-claim stall and step 7 (R5 point 1 and 2 now); endturn after hand-over exit 2 (R5 N2, run in the final pass); the owner's re-alert ruling; premises (a)-(c), B1 and PROBE 5 stated and measured; part-1 gaps 1, 4, 5 and 11.

## 10. Reported follow-up, not a protocol defect

`e2e/run-e2e.mjs` fails when the folder that holds the scripts has a path longer than 114 characters. Its setup runs `git add tcb` without `-c core.longpaths=true` and does not check the result.

Fix:
- pass the switch on every git call of that script;
- check the result of the add;
- add a test that runs the setup from a deeper folder.

Reported by the main coordinating session on 2026-11-17; evidence in its scratchpad as `coord/verify-clone-164df64.txt`. Source for this item is the task text only, not a design file.

## 11. Unclear in the design files

Of the 13 points of the first pass, 11 were resolved by the join and moved to the sections above; point 5 remains open and point 3's names wait on PROBE 4. What is still unclear:

1. **B2 refund (first-pass point 5, J point 5).** Neither file says what shows a fence false; after FX-OUT a fenced attempt can no longer land a READY. The place would be `stop verify` (stop.mjs:426-449) with a `refunded` field; the evidence rule needs an owner ruling. Not modelled.
2. **Once-per-onset versus re-alert (conflict).** The join's rule sentence R6-d and its `runs_no_watcher` ("once per onset like the other causes", J point 1.4) and FIX-wake's rev-4 FX-W4 step 3 say "alerts once per onset". Revision 5 N1 replaces that by a re-alert every `realert_runs` runs while the cause holds. The join was written before; its sentence and `runs_no_watcher` rule are not updated.
3. **Exit 75 rule (conflict).** The join's R6-c sentence and 2b row 8 say "on exit 75 end the turn and retry nothing"; revision 5 N2 replaces this by "last call is endturn, also after exit 75". The sentence in section 8, row 7, is the old wording.
4. **`--if-unclaimed` and `close-session` are not in any allow-list or brief list.** R5 adds a `replace fence` flag and a planner act; W's allow-list (FX-W1 step 5) and the join's list of production forms (J 2c) do not name them.
5. **Rev-5 rows for J 2b.** J's order of acts has no row for the `close-session` act or for a fence `--if-unclaimed` retry; where in a turn they run is not stated.
6. **`session_tools` names.** J point 3 gives only INFERRED candidates; the exact names are PROBE 4.
7. **J point 1 restart bound.** `T_resume <= T_turn + start_lease_ticks x Delta` is INFERRED; the bound under L2 "gains that term" with no value.
8. **E2.** A new mechanism with no check; needs fault o on endturn, which the model lacks (AW final F4).
9. **FX-W4 as built in the model.** The model's dead-man lacks the `stuck`, busy, unarmed and `runs_no_watcher` inputs and the 3-of-5 window (AW section 8); FD3's verdict on FX-W4 refers to the rev-4 design plus a candidate re-alert.
