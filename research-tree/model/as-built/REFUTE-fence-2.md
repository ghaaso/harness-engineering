# REFUTE-fence-2: second pass over FIX-fence revision 2 (2026-11-17)

Helper `refute-fence-2`. Reader only: no command started, no script changed. `BUILD` = tcb-build.
Claims on scripts cite `BUILD/tcb/<file>:<line>`; "INFERRED" = reasoned, not run; "PROBE n" = FIX-fence
section 8. This pass is not blind (I know my first list and the change log); every status below was
checked against the revised steps (FIX-fence.md sections 1-5), not against section 10.

## 1. My earlier points against the revised steps

| Point | Status | Checked against |
|---|---|---|
| O1 torn tainted fence, commit | **Closed** (R-a: any fenced slot blocks commit) | FIX 51-54, 90, 125. But see N1: the same ordering creates a new stuck state |
| O2 "uncommitted" wording | **Closed** (R-b) | 55-56 |
| O3 runner for "fenced slot, row at E" | **Closed for the ordinary case**; not when the retried CAS can never succeed (N1) | 90 |
| O4 log growth | **Closed, and moot**: ready slot bytes are `{kind, task, epoch, step}` only (44-45), so a repeat for a step is `identical` (71) and at most \|steps\| ready slots can exist; the cap 2 x \|steps\| (72) is never reached | 44-45, 71-72 |
| O5 synchronous hook vs deadline | **Partly**. No lock wait now; but `exclusiveWrite` retries sharing errors synchronously, up to 40 x <= 100 ms per op (lib.mjs:162-173, 664, 671, 705), three ops per create, two creates possible in one child call (claim + slot): about 24 s worst case, under the 30 s harness timeout but far over `hook_deadline_ms`. PROBE 6 branch "lets it run" stays open (recorded) | 99 |
| O6 alias of READY.json | **Closed** | 64-66 |
| O9 nlink rule | **Closed** (R-c) | 57-59 |
| O10, C8, G10 | Closed | - |
| C1 bind to the loser | **Closed** (bind requires the claim holder) | 191-194 |
| C2 uncharged loop | **Closed for failure reasons**; ambiguous for others (N7) | 181-185 |
| C3 hook not run for some tools | Open, stated as precondition (PROBE 9) | 229 |
| C4 `session_id` stability | Open (PROBE 7), recorded | 228 |
| C5 unclosable duplicate | **Partly**: closes are keyed by session id (318-320), but the key is taken from the tool input unchecked, which opens a forgery (N2) | 318-323 |
| C6 late session in the lag | Answered (timing assumption) | 251-253 |
| C7 Q5b regression | **Partly**: owner act `closed` is a runner (324-326). The trade is stated for Q5b only; in Q5a every crashed child also ends with the owner (N4) | 324-326, 454-456 |
| C9 NTFS create | **Partly**: the fallback branch of `exclusiveWrite` (no hard links: plain `wx` then write, lib.mjs:676-688) can leave an empty slot or claim after a death, which R-c then reads as tamper (exit 3 / deny) for ever (N5) | 57-59 |
| G1, G2 lock in the hook | **Closed** (no hook takes the run lock) | 7-12, 328-331 |
| G3 repeated hook denies its own start | **Partly**: `start.json` bytes include `tick` (311-312); a repeat after the watcher ticked has different bytes -> `different` -> deny (N6) | 311-317 |
| G4 identity on compaction, helpers | Open (PROBE 1c, 7), recorded | 346-351 |
| G5 first-come bind | **Closed** (nonce; first come removed). One ordering detail: the hook's bind recognition (step 2) must run after the helper profile check, so that a coordinator helper with its own id (PROBE 1c) cannot bind with a nonce it saw; checker/mapper profiles have `bash: none` (profiles/checker.json, mapper.json), so the profile check refuses it if it comes first | 298-304 |
| G6 `plan/` TOCTOU | Open, acknowledged | 385-388 |
| G7 raise for a dead coordinator | **Closed** (runbook line); the runbook section is still to be named | 353-356 |
| G8 failed start leaves the record | Closed via lease + cap | 334-335 |
| G9 hook becomes a writer | Closed (8.20 named; never tasks.json/coord.json) | 128, 288-289 |
| K1 close intent, not fact | **Partly**: done needs a PostToolUse success (321-323), but see N2 (forged done) and N8 (a "success" that is not a stop) | 318-323, 411-414 |
| K2 which session the stop names | **Designer right**: reconcile sets `attempts[e].session` (status.mjs:319-322, called at 278, 292), so stop.mjs:283 reads the claim-era session; my duplicate case stands and is handled (stop names the claim holder) | status.mjs:319-322 |
| K3 endless unconfirmed | Closed (`verify_rounds` >= 3 -> owner) | 416-418 |
| R1 late repeat answers 0 | Closed (exact post-state) | 467-477 |
| R2 line order | Closed (`redo: true`; render the only reader, render.mjs:625) | 479-482 |
| R3 runner gaps | Closed | 475-477, 484-485 |
| X5 hook time | Partly, as O5 | - |

## 2. The designer's new finding and the K2 answer, checked

- **Double start ordered by the planner: confirmed.** status.mjs:542 answers `start-session` for every
  `admitted` row with no condition at all; watch.mjs:157-165 answers `start-session` whenever no
  transcript with a cwd is visible yet (164). After a start whose session has not written its first
  record, both planners order a second start. This is D4b produced by the trusted planner itself.
- **`bind` loop on committed/started: confirmed.** nextOf: committed rows go to `stop-request` only at
  `bound` (status.mjs:526); a committed row at `started` falls through to `bind` (543); watch.mjs:141 and
  166 do the same; `replace bind` refuses any state but active (replace.mjs:987-988, 65). The act repeats
  every turn and every tick (class 17), never succeeds: a busy loop and a slot held for ever.
- **K2:** see the table above; partly wrong as the designer says.

## 3. Attacks on what is new

- **N1 a fenced slot whose CAS can never succeed (liveness: a row that never resolves; no-busy-loop;
  0 faults, one coordinator call the brief does not intend).** Fence steps write the fenced slot (step
  4, FIX 81) and the tombstone (5) BEFORE `lib.fence` (6), which can still refuse: `hmax` when
  handovers + parks >= H_max for reason handover or memory (lib.mjs:1779-1781), `wrong-step` for a
  state outside its list (1771-1772). From then on: commit refuses (R-a), the child is denied every
  READY (`attempt-fenced`), the planner's first-match act is `replace-fence --reason r'` every tick
  (90), the retry must use the same reason (step 2, 78-79) and fails the same way for ever; a tainted
  fence cannot override (65 `fence-pending`). For a row at active/stopped the slot write even creates
  the attempt folder (`mkdirSync` recursive, lib.mjs:660), and the fence-pending rule then outranks
  `replace-start`, which would have cleaned it (replace.mjs:893). **Smallest change:** in the same
  hold, run `lib.fence`'s refusal checks (reason allowed for the state, H_max; `predictFence`,
  replace.mjs:400-426, already computes them) before step 4, and write no slot when they refuse.
- **N2 forged close records (Slots; 0 faults: one dishonest coordinator call).** The intent name is
  `run/close/<target-sid>.json` and the done name is `run/close/<sid>.done.json` (292), with the sid
  taken from the close tool's input. A target string `S1.done` makes the Pre hook create
  `run/close/S1.done.json`, which verify reads as S1's done (411-414, "exists"). S1 in a long model call
  (no growth for 2 ticks) is then confirmed stopped while it lives; the slot is freed. A target with
  separators (`..\..\wt\f0-e1\claim`) would let the hook exclusive-create under any path the hook can
  reach (a claim that makes the child's hook deny, or a `coord-session-*` name). **Smallest change:**
  the hook accepts a target only if it matches the harness's session-id format (strict regex, no
  separators or dots), and intents and dones live in separate folders (`run/close/intent/`,
  `run/close/done/`) with a `kind` field that verify checks. The same validation is needed for the
  folder the start hook derives from the tool input (TASK_RE and EPOCH_RE, guard-hook.mjs:27-28).
- **N3 the lease clock can be driven by a subject (liveness; 1 fault).** `ticks_total` grows by one per
  evaluation (watch.mjs:725, 732), and `watch --once` is a script the coordinator may run (Bash
  `tcb-node`). While the watcher lives, `--once` waits on `watcher.lock` (watch.mjs:714); with the
  watcher dead (D6, one fault) each `--once` advances the tick. A hasty coordinator that runs it a few
  times right after a start expires the lease while the child is still coming up: no-start fence,
  tombstone, the session is made inert, and after `H_nostart` such fences the next is charged (the
  restart limit kills a healthy task). The same clock gates stop verify's growth window. Safety holds;
  a suspend freezes ticks (both stop together), which is the right direction; a late holder after the
  lease is made inert, as designed. **Smallest change:** the lease also needs a wall-time floor
  (`start.at` + `start_lease_ms`, both must pass; a wall jump only expires early, which is liveness),
  or `--once` must not count a tick toward leases.
- **N4 every crashed child ends with the owner in Q5a (pace; 1 fault).** A crashed child's session is
  dead; the close tool on it presumably errors ("no such session"), so no done is written (321-323),
  verify needs the claim holder's done (412), three rounds, then the owner. Today a dead session's
  attempt confirms by itself (no growth, no matched process, stop.mjs:426). The designer states the
  trade for Q5b only. **Smallest change** (depends on PROBE 10): the Post hook also writes done when the
  response says the target does not exist; else state the cost for Q5a too.
- **N5 the no-hard-link fallback breaks R-c.** In `exclusiveWrite`'s fallback (ENOTSUP, EINVAL, EXDEV,
  ENOSYS, EMLINK; lib.mjs:676-688) the final name exists before its bytes; a concurrent reader sees an
  empty or short file and R-c calls it tamper (exit 3 / deny); a death leaves it so for ever. **Smallest
  change:** treat the fallback as unsupported for outcome, claim, start, close and bind files (fail
  closed at `selftest` if the run root has no hard links), or let readers treat a short file younger
  than the hook deadline as "in progress" (deny, retry), never tamper.
- **N6 `start.json` identity includes the tick (G3 partly).** See section 1. **Smallest change:** on
  `different`, parse and allow when `session` and `tool_use_id` are equal; the tick is data, not key.
  `tool_use_id` (PROBE 8): API tool-use ids are unique per call, so a new call after a resume gets a new
  id and is correctly denied; a resumed session that re-issues the same logged call would carry the old
  id and be allowed as a repeat (INFERRED; the claim then decides who works).
- **N7 `nostart` for non-failure reasons.** Step 2 makes every fence of a manifest attempt with no
  claim a no-start fence and, past `H_nostart`, "charged like a failure" (181-183). A planned hand-over,
  memory park, cut or drop of an admitted-but-not-started row would then spend the restart budget.
  `lib.fence` charges only failure reasons (lib.mjs:1773, 1785). **Smallest change:** count and charge
  `nostart` for failure reasons only.
- **N8 a close "success" is not a stop (Slots; depends on PROBE 10).** If the close tool's success
  means "stop requested" and the session finishes its current model call first, done is written, there
  is no growth for 2 ticks (or fewer real seconds under N3), and verify confirms while it runs. Verify's
  process check (stop.mjs:419-426) stays only as good as HARNESS-FACTS 10. Record as a probe condition:
  done must mean the session process is gone.
- **N9 the planner under Q5b orders an act nobody can do (no-busy-loop).** With no session tools no
  `start.json` is ever written, so step 5 answers `start-session` for every admitted row; `rowAct`
  returns it as an act (watch.mjs:164 today), so the watcher raises class 17 every tick for an act the
  coordinator cannot take: a wake loop like D1. **Smallest change:** in Q5b the planner answers `owner`
  for `start-session` and `stop-session`.
- **N10 slot detector over all transcripts (step 8).** `transcriptsForFolder` takes every top-level
  `.jsonl` whose first cwd is the folder (lib.mjs:2354-2358). If the harness version writes an Agent
  helper's transcript as a top-level file in the project folder (older layouts did; INFERRED, PROBE),
  every `reader` helper of a child is a "folder session" with no close possible: +1 for ever and
  verify's (b) never holds. Add to PROBE 1: where helper transcripts live.
- **Lock-free hook writes otherwise:** two hooks racing on one name -> the link decides, one
  `created`, the other compares bytes (lib.mjs:693-695): sound. A hook dying after its create: covered
  in each deaths table. A reader seeing the file before its content: impossible on the link path (bytes
  fsynced before the link, lib.mjs:665-671), possible only in N5. Names a subject can reach by another
  path: the child writes only under `{attempt}/staging/` after `resolveToolPath` folding (short names,
  `..`, ADS, trailing dots refused, guard-hook.mjs:113-146), the coordinator only under `plan/`; the only
  path a subject controls is the tool input the hook turns into a name (N2).
- **Nonce:** minted by raise/init in their lock hold, stored in `coord.json` under `run/` (outside the
  coordinator's read prefixes, profiles/coordinator.json), carried by the script's output and the brief.
  Replay is refused once `coord-session-<ce>` exists (`bound-elsewhere`); the old coordinator saw the
  nonce in the raise output but its id is in `coord-session-N` (refused). A death between mint and use
  loses only the output: the owner reads `coord.json` from a terminal or raises again. Sound, given G5's
  ordering note.
- **Is FX-CGATE still the smallest?** Each of steps 2-6 has its own ablation (358-365); the close
  records (5-6) serve FX-CLOSE and could be moved there for clarity, not removed. No smaller design
  found that also covers helpers and `plan/` writes after a raise.

## 4. Verdicts

| Fix | Verdict | Smallest change |
|---|---|---|
| FX-OUT | **Stands with a change** | Check `lib.fence`'s refusals (state for the reason, H_max) before writing the fenced slot (N1). Also N5 for the fallback branch |
| FX-CLAIM | **Stands with a change** | `nostart` counted and charged for failure reasons only (N7); the lease gets a wall-time floor so `watch --once` cannot expire it (N3); Q5b planner answers `owner` (N9) |
| FX-CGATE | **Stands with a change** | Validate every name taken from tool input (session-id regex for close targets; TASK_RE/EPOCH_RE for the start folder) and split intent/done folders with a `kind` checked by verify (N2); compare `start.json` on (session, tool_use_id), not on bytes with the tick (N6); bind recognition after the profile check (G5 note) |
| FX-CLOSE | **Stands with a change** | Inherits N2's fix (else a forged done frees a live slot); a "no such session" close counts as done if PROBE 10 shows it, else state that every crash goes to the owner in Q5a too (N4); PROBE 10 must establish that success means the process is gone (N8) |
| FX-REDO | **Stands** | - |

The designer's new finding (planner double start, committed/started `bind` loop) is real; FX-CLAIM
step 5 and FX-CLOSE step 2 address it.

## 5. Fault schedules for the modeller (replaces the earlier list)

1. **Fence that can never land (N1).** Row with handovers + parks = H_max; the coordinator fences
   `handover`; slot written; `lib.fence` refuses `hmax`; the planner repeats `replace-fence` each tick.
   Properties: EventuallyResolves, no busy loop. 0 faults (a coordinator act outside its brief). Ablation
   of the change: the refusal check before the slot.
2. **Forged done (N2).** S1 claim holder in a long call; the coordinator calls the close tool on
   `S1.done`; verify after 2 ticks. Property: Slots. 0 faults.
3. **Torn tainted fence (old 1).** Ready slot; tainted fence dies after its slot; commit of E. Expect
   NoStaleAccepted to hold with R-a, fail without.
4. **No-start loop (old 2, revised).** The start tool always fails; lease; no-start fence; repeat. Expect
   RestartLimit to hold with the cap. Variant: the same with reason `handover` (N7): the restart budget
   must not move.
5. **Lease driven by `--once` (N3).** Watcher dead (1 fault); start; the coordinator runs `watch --once`
   past the lease before the first tool call; no-start fence; repeat to the cap. Property: a healthy task
   is not charged (EventuallyResolves without limit).
6. **Bind to the loser (old 3).** Expect pass with bind-by-claim; fail without.
7. **Late session past the lease (old 4).** Both readings of the lag bound; Slots-as-invariant vs
   eventually within N_max.
8. **Close of a dead session (N4).** Child crashes (1 fault); fence crash; stop request; the close tool
   errors; verify three rounds; owner. Property: AlwaysCanResolve without the owner (expected to fail;
   report as the stated trade).
9. **Hook repeated across a tick (N6).** The start hook runs twice, a tick between; second run denied;
   lease; no-start fence. 1 fault. Expect a needless fence without N6's change.
10. **Close success that is not a stop (N8).** Close tool reports success; the session finishes its call;
    no growth for 2 ticks; verify. Property: Slots. 1 fault (tool semantics).
11. **Q5b wake loop (N9).** No session tools; an admitted row; the watcher raises `start-session` each
    tick. Property: no busy loop.
12. **Planner loops (new finding).** (a) Start, no transcript yet, planner orders `start-session` again
    (today's status.mjs:542). (b) reconcile -> started, the turn dies, READY, commit, planner orders
    `bind` for ever (status.mjs:543). Ablations of FX-CLAIM step 5 and FX-CLOSE step 2.
13. **Wrong first binder (old 6).** Raise; another hooked session calls first; expect the successor still
    binds with the nonce. Variant under PROBE 1c: a coordinator helper alive across the raise tries the
    bind command.
