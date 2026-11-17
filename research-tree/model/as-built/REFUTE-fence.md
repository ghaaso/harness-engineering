# REFUTE-fence: blind refutation of FX-OUT, FX-CLAIM, FX-CGATE, FX-CLOSE, FX-REDO (2026-11-17)

Helper `refute-fence`, round 3. Reader only: no command started, no script changed. `BUILD` = the
tcb-build folder of the charter. Claims on scripts cite `BUILD/tcb/<file>:<line>`. "INFERRED" = reasoned,
not run. "BELIEVED" = a harness fact nobody has checked. The run was cut by a PC freeze (15:43) and resumed
after 17:13 from the same context; nothing was lost from the reasoning.

**Protocol note (honest).** Step 1 said to read from FIX-fence only the table and each fix's steps and
runners. Because the argument paragraphs sit between the step paragraphs, I also saw, before writing this
list: FX-OUT's first three paragraphs (problem, borrowed, failed assumption, FIX-fence.md:25-39), FX-OUT's
ablation paragraph (99-105), FX-CLOSE's ablation table (392-398) and the first line of its Q5 (411). I did
not read FX-CLAIM's or FX-CGATE's argument sections (144-164, 225-237, 253-256, 259-271, 316-322,
336-348), FX-REDO's argument (418-428), sections 6-9, or FX-OUT 123-140, before section 2 below was written.

## 1. Facts checked in the scripts that the attacks lean on

| Fact | Where |
|---|---|
| The guard-hook "reads files only and writes nothing" (contract 8.20); every fix but FX-REDO makes it write | guard-hook.mjs:6 |
| Hook deadline is a JS timer (`hook_deadline_ms` = 5000) | guard-hook.mjs:612-621, thresholds.json:52 |
| `acquireLock` waits with a SYNCHRONOUS sleep (`Atomics.wait`), default 300 x 100 ms; the deadline timer cannot fire during it | lib.mjs:144-145, 1283 |
| Child tools: Read, Glob, Grep, Write, Edit, Agent (type `reader`), WebFetch, ToolSearch; write prefix `{attempt}/staging/` only | profiles/child.json |
| Coordinator: Bash/PowerShell as `node tcb/<name>.mjs` (any script but lib, any arguments), Agent types checker/mapper, writes only under `plan/` | profiles/coordinator.json; guard-hook.mjs:317-352 |
| `parseInput` keeps no `session_id`; the task-role gate is the row epoch/step only | guard-hook.mjs:210-226, 394-409 |
| `bind` from `admitted` accepts any SID; its folder check runs only if SID's transcript is already visible | replace.mjs:967-1007 (994) |
| `start` on an admitted row answers `repeat` 0; a `stopped` row's existing folder is removed and rebuilt | replace.mjs:867-873, 893 |
| `lib.fence` host path: a `host` failure is never charged and has no cap of its own; today `host` means "boot id changed" | lib.mjs:1782-1792; replace.mjs:463 |
| M6 re-check is for every reason but first/tainted; `lib.fence` re-checks failure reasons | replace.mjs:473-477; lib.mjs:1774 |
| `stop request` accepts fenced rows and committed/bound only | stop.mjs:277-279 |
| `stop verify` confirms on no growth over `stop_verify_deltas` (= 2 ticks) and no matched process | stop.mjs:393-426; thresholds.json:13 |
| The fence's cut records `ledger_seq` = ledger head at the fence | lib.mjs:1802 |

## 2. Attack list (written before reading the designer's arguments)

Notation: S1, S2 sessions; E the attempt epoch; "turn dies" = the coordinator's turn ends between two
tool calls. Every attack names the property it breaks and its fault count.

### FX-OUT (outcome log, ready slot made by the child's hook)

- **O1 tainted fence torn, then a commit of the tainted attempt (safety: no stale READY accepted; 1
  fault).** Child's hook made ready slot j (pack). Coordinator runs `replace fence --reason tainted`:
  step 2 skips the ready check for tainted, step 3 writes `fenced` at j+1, the script dies before the
  CAS (lib.fence). Lock is released or broken; row still at E, active/bound. `commit record --epoch E
  --step pack` (commit.mjs:929-939 epoch check passes) reads "the newest covering ready slot" = j and
  commits a tainted attempt. Nothing in the listed commit change (FIX-fence.md:115) looks for a fenced
  slot. Smallest change: commit (and every reader of the log) refuses when any `fenced` slot exists, and
  `uncommittedReady` ignores slots before a fenced one.
- **O2 the "uncommitted" predicate as written discards a later step's READY (safety: a READY written is
  not discarded; 0 faults).** FIX-fence.md:65-66: a ready slot is uncommitted when "its step, and every
  step before it, [are] not in row.commits". Row steps [pack, review]; pack committed; review's READY slot
  made; a hang-reason fence: review's slot has a prior step (pack) IN commits, so by the literal text it is
  not "uncommitted" and the fence proceeds. Probably a wording slip for "its step not in commits"; it must
  be fixed in the text the builder reads.
- **O3 fenced slot, fence script dies, nobody retries (liveness: a row that cannot resolve; 1 fault +
  a coordinator that does not act).** The death row of FIX-fence.md:81 says status "should list" the
  state as act-due and points at FX-REDO; FX-REDO's table (433-436) has no such row and no predicate in
  watch/status is named. Until the coordinator happens to fence again the child is denied every READY
  (`attempt-fenced`) and stops (brief), the row stays active/bound, the watcher eventually raises a hang
  (M3/D5 path), and that is the only runner. Rule without a runner as written.
- **O4 the write that creates the slot never lands, the child writes again (pace; 1 fault).** Another
  hook, the permission system or the user denies the Write after our hook allowed (BELIEVED: hooks run in
  parallel and any deny wins), or the file is held by antivirus: slot j exists, READY.json does not. The
  child sees a failed write and retries with the same bytes -> identical -> allow (fine), or with edited
  bytes -> slot j+1. No safety loss; the log can grow without bound from a looping child (fsck cost only).
- **O5 the hook's deadline cannot cut a slow `exclusiveWrite`.** All work is synchronous; a slow fsync or
  an antivirus scan of the temp file runs past `hook_deadline_ms` with the timer unable to fire
  (guard-hook.mjs:621 vs synchronous code). If the harness's own hook timeout fires first, the harness
  kills the hook; whether a killed PreToolUse hook blocks or lets the tool run is BELIEVED (if it lets
  it run: a READY.json lands with or without a slot; harmless for safety because READY.json no longer
  decides, but the "denial stops that one call" runner claim is wrong in that branch).
- **O6 writes to READY.json that skip the new step.** Case and alias: `staging\ready.json`,
  `staging/READY.json.` (trailing dot stripped by resolveToolPath, guard-hook.mjs:141), `READY.JSON`. If
  the new step matches the target by exact name, NTFS writes the same file with no slot. Safety holds
  (no decision reads the file) but a child that did finish is lost and charged as a hang. MultiEdit and
  NotebookEdit are in tools_deny (profiles/child.json), so only Write/Edit need the step: answered by the
  profile. Smallest change: match with `pathKey` (guard-hook.mjs:93) and `segmentName`.
- **O7 the READY content is decided before the staging it vouches for is final.** The slot freezes at
  the hook; the child keeps writing staging afterwards (still allowed, epoch gate passes). The commit
  audits staging at commit time (commit.mjs:702-712), so the committed outputs are the later bytes. Same as
  today; not new. Recorded so nobody claims FX-OUT made READY a snapshot.
- **O8 a reader helper of the child (Agent `reader`).** If a helper could Write (reader profile, not
  checked) its hook input's role is `child` with agent_type `reader`; fine. No attack found.
- **O9 what worked before.** Today a committed step's READY blocks a failure fence; that was a liveness
  bug (a hung review behind a committed pack READY could not be fenced), so dropping it is an
  improvement, provided O2 is fixed. Also today `readyValid` refuses a READY that is a link or has
  nlink > 1 (replace.mjs:187-189); in the log, slots are made by `linkSync` (nlink is 2 for an instant and
  then the temp is unlinked); a reader that kept the nlink rule would refuse a slot whose temp was not yet
  unlinked, or one whose unlink died. INFERRED; the reader must not carry the nlink rule over.
- **O10 child can reach the log?** `outcome/` is outside `{attempt}/staging/` -> `write-outside-role`
  (guard-hook.mjs:459). Coordinator's write prefixes are under `plan/` only. Coordinator Bash can run
  only tcb scripts, none of which writes a ready slot. Answered by the profiles.

### FX-CLAIM (claim.json: a session or a tombstone)

- **C1 bind to the loser (safety: one session per attempt; 1 fault).** Two sessions S1, S2 exist on
  attempt E (requires one fault in FX-CGATE: its hook did not run once, or Q5b with the owner starting by
  hand twice). S1 makes the first tool call and holds the claim; the coordinator holds S2's id from the
  tool result and runs `replace bind --session S2` while the row is still `admitted` (before any
  reconcile): bind accepts it (replace.mjs:987-1007; FIX-fence changes list does not touch bind). Row says
  S2, claim says S1: S2 is denied everything, S1 works unbound. Stop request names S2 (stop.mjs:283), the
  close goes to S2, `close_issued` is per attempt (FIX-fence.md:290-291, 331), verify then needs only "no
  growth" of S1 for 2 ticks: a healthy slow model call of S1 (D5) passes it -> confirmed while S1 lives
  (Slots, R10). Smallest change: bind refuses unless SID equals the claim holder (no claim yet -> exit 6,
  try later); `close_issued` records the session id and verify requires it to equal the claim holder.
- **C2 an uncharged restart loop with no bound (restart limit; 1 recurring environment fault).** The
  session-start tool fails every time (quota, launcher error, spawn EPERM, the owner's PC's blocked
  program starts): `start_issued` set, no session, lease expires (step 7), fence `crash`, tombstone
  created -> `host = true` -> never charged (lib.mjs:1782-1791) and `host` has no cap. E -> E+1 -> ... for
  ever, each with a new folder built by `replace start`. Today `host` needs a changed boot id
  (replace.mjs:463), so the environment bounds it; FX-CLAIM makes it as frequent as a failed start.
  Smallest change: count uncharged fences in the row (`host_fences`) and charge, or raise `limit`, past a
  cap H_host (e.g. 2); or charge from the second consecutive tombstone fence.
- **C3 claim/tombstone mean "no tool call ran" only if every tool call runs the hook (1 fault: hook not
  run for some tools).** If the harness skips PreToolUse for some tool (matcher, MCP tool, a tool added
  later, BELIEVED), a session can act with no claim; the tombstone then wins and the fence is uncharged
  and stop is "confirmed at once" (step 4) while the session lives. Safety of writes still holds via the
  epoch change; Slots and the restart charge do not. Smallest change: none inside the fix; state the
  harness fact as a precondition and test it (hook matcher `*`, every tool in tools_allow).
- **C4 session_id instability (liveness; 0 faults if the branch holds).** BELIEVED that `session_id`
  is stable over the whole life of a child including auto-compaction, and that an Agent helper's hook
  input carries the parent's `session_id`. Branch (a) stable and shared: fine. Branch (b) compaction or
  resume gives a new id: the same child is then denied `attempt-claimed` for the rest of its life ->
  hang -> charged restart (pace and budget). Branch (c) a helper has its own id: every `reader` helper
  call of a child is denied; children lose their helper (protocol change, not stated).
- **C5 a duplicate or late session that nobody can close holds a slot for ever (liveness: a slot held
  for ever; 1 fault).** Step 6 counts +1 for every folder session that is not the claim holder and has
  no recorded close. FX-CGATE step 4 maps a close target to an attempt only via the claim file or
  `row.session`; a duplicate is neither, so its close cannot be recorded (deny, or allow unrecorded) and
  the +1 never goes away. Same for a late session of a tombstoned attempt once its transcript appears.
  Smallest change: map a close target also through the transcripts of the folder (`transcriptsForFolder`,
  lib.mjs:2334-2363) and record `close_issued` per session.
- **C6 window where the late session is not counted (Slots; 1 fault, plus transcript lag).** Turn dies
  after the start tool, the session's first call is slow. No claim, no transcript cwd. Lease expiry ->
  fence crash -> tombstone -> stop "confirmed at once" -> slot freed -> f1 admitted. The late session is
  alive (denied every tool by the epoch gate, but alive and holding memory) and counted 0 until its
  transcript with a cwd appears (step 6 needs it). Live sessions can exceed N_max for the lag. Bounded
  only by the BELIEVED transcript-lag bound; the lease length must exceed it.
- **C7 FX-CLAIM alone in the Q5b branch.** Step 5 needs a recorded close from FX-CGATE; without session
  tools no close can be recorded, so every attempt that ever had a session ends `unconfirmed` and holds
  a slot until the owner acts; today verify could confirm a dead session's attempt without any close
  (stop.mjs:426). Regression in Q5b: after N_max finished or fenced attempts nothing more is admitted and
  `handover raise` never sees quiescence.
- **C8 the claim cannot be forged by subjects.** Child write prefix is staging only; coordinator write
  prefixes are plan only; no tcb script writes a session claim. A child that writes the bytes of a
  claim inside staging gains nothing. Answered by the profiles.
- **C9 NTFS exclusive create.** `linkSync` gives EEXIST on an existing name; claim.json is never deleted
  while the attempt lives. Delete-pending names arise only if something deletes and re-creates the claim:
  `dispose` at stop (not read) or `removeTree` of a torn folder at start (replace.mjs:893) -- in the
  latter the row is `stopped`, so the epoch gate denies any hook before the claim step. An antivirus hold
  on the temp makes `link` fail with EPERM/EBUSY -> must be a deny, not a crash path that exits other
  than 2 (the hook maps exceptions to deny, guard-hook.mjs:554-556: answered).

### FX-CGATE (coordinator hook: identity, start and close records)

- **G1 hook-side lock wait cannot be bounded by the hook's deadline (liveness and fail-closed; 1 fault:
  a slow or dead lock holder).** Steps 3 and 4 take the run lock inside the hook. `acquireLock` sleeps
  synchronously (lib.mjs:144-145) with a 30 s default budget and may call the process list on the holder
  (lib.mjs:1327); the deadline timer (guard-hook.mjs:621) cannot fire until it returns. The harness's
  own hook timeout then decides; whether a timed-out hook blocks or lets the tool run is BELIEVED. If it
  lets it run, the session-start tool runs with no `start_issued` -> D3/D4b reopen exactly when the lock
  is contended. Smallest change: the hook passes `retries` small enough that retries x retryMs + one
  process-list call < `hook_deadline_ms`, and never calls the process list (holder unknown -> deny).
- **G2 a killed hook holding the run lock.** If the harness kills the hook while it holds the lock, every
  script waits 50 sightings to break it, and never breaks it while the process list is unavailable
  (lib.mjs:1327, 1366): the D1 hole, now reachable by a new class of holder the harness kills routinely.
- **G3 a second hook run denies the start it just recorded (liveness; 1 fault: the hook runs twice).**
  Run 1 sets `start_issued` and allows; run 2 (duplicate settings entry, a harness retry) sees
  `start_issued` set and denies `start-issued`. If the harness obeys the deny, no session, lease, fence,
  tombstone, uncharged, next epoch, same again: C2's loop with no environment fault at all. Smallest
  change: record the hook input's `tool_use_id` (BELIEVED present) in `start_issued` and allow a repeat
  with the same id.
- **G4 identity by `session_id` locks out the rightful coordinator (liveness; 0-1 faults).**
  (a) If the coordinator's id changes on compaction or resume (BELIEVED not), it becomes "stale" and is
  denied Bash, so it cannot even run `handover raise` to recover; only the owner, outside any hooked
  session, can edit coord.json. (b) If an Agent helper (checker, mapper) of the coordinator has its own
  `session_id`, every helper call is "stale" while `session` is set, and right after a raise (`session:
  null`) the first helper call to arrive BINDS the helper as coordinator (first come).
- **G5 first-come bind after a raise can be won by the wrong session (safety: two coordinators act; 1
  fault).** After raise, `session: null`. Any non-retired session whose hook runs with role coordinator
  binds first: the owner's own inspection session opened at the root, a helper (G4b), or a second
  successor started by mistake. The intended successor is then "stale" and locked out. Smallest change:
  raise mints a one-time `successor_nonce`; the hook binds only a session whose start carried it (the
  explicit `handover bind --nonce` path, run by the successor's first Bash call), never first come.
- **G6 TOCTOU on unscripted writes (safety: stale write consumed; 2 acts, no fault).** The hook reads
  coord.json without the lock (step 2) and allows a Write to `plan/tasks-plan.json`; `handover raise`
  completes; the Write lands after the raise and `replace plan` of the new ce consumes it. Same shape as
  D4a. Small in time, but the fix claims the CE gap for `plan/` writes is covered. Smallest change: the
  new coordinator's first act stamps or snapshots `plan/` (or `replace plan` reads only files whose mtime
  precedes its own bind), or raise refuses while a coordinator Write is in flight (unknowable). Honest
  answer: partly covered.
- **G7 who runs `handover raise` when the old coordinator is dead.** The owner from a new session: that
  session is not `coord.session` -> stale -> Bash denied. The raise must be run from a terminal outside
  any hooked session; no brief or runbook line says so. Rule without a stated runner.
- **G8 a start whose tool fails leaves `start_issued` set (pace; 1 fault).** The coordinator cannot retry
  (deny `start-issued`) and must wait `start_lease_ticks` and fence: pace, plus C2's unbounded loop.
- **G9 the hook writes the table.** Contract 8.20 (guard-hook.mjs:6) and every spec that assumes a
  read-only hook change; the hook becomes a table writer that must keep the CAS/`assertHeld` discipline
  (lib.mjs:1684-1690) and the ledger order. Not an attack on the idea; a large unlisted change to the
  trusted base.
- **G10 subjects cannot write coord.json or start_issued.** coord.json and tasks.json are under `run/`
  (ALWAYS_PROTECTED, guard-hook.mjs:37) and outside every write prefix; only tcb scripts write them.
  Answered.

### FX-CLOSE (act-due close; stop for committed/started)

- **K1 the recorded close is an intent, not a fact (Slots/R10; 1 fault).** `close_issued` is written at
  PreToolUse; the close tool may then fail. A committed child idles (no transcript growth), its process
  is not matched (HARNESS-FACTS 10 unknown), verify confirms after 2 ticks -> slot freed with the session
  alive. Smallest change: record `close_done` from a PostToolUse hook that reads the tool's result
  (BELIEVED: PostToolUse runs with `tool_response`), and verify requires `close_done`; keep the Pre record
  as the intent.
- **K2 committed/started stop (the new finding).** Accepting committed/started at stop.mjs:278 is right.
  `session = att.session ?? folderSessions[0]` (stop.mjs:283): for a started row reconcile set
  `row.session`; is `att.session` set too? If reconcile sets only `row.session`, the stop names a folder
  session by transcript order, which with a duplicate (C1/C5) may be the wrong one. INFERRED; the change
  should name the claim holder.
- **K3 act-due prompt for a committed row whose verify keeps saying `unconfirmed` (liveness).** Each
  verify rewrites the sample and stays stop-requested (stop.mjs:458); the prompt repeats each turn; only
  the owner ends it. Acceptable as escalation if the act list says "owner" after k unconfirmed rounds;
  not stated.
- **K4 Q5b** (no close tool): every committed child holds its slot until the owner acts; with N_max = 1
  the tree runs one task per owner action. Stated by the designer (411); a pace cost, not a defect.

### FX-REDO (repeat completes a missing ledger line)

- **R1 a late repeat returns 0 on an old fence (1 fault: a duplicated or delayed coordinator call).**
  The redo matches "row at E+1, step fenced *or later*". A current coordinator that re-sends `fence
  --epoch E` long after E+1 started gets 0 `repeat` instead of 65; with no `fence` line missing nothing is
  written, but a coordinator reading 0 as "fenced just now" may then `replace start` E+1 (answers repeat)
  and call the session tool again: D4b again unless FX-CGATE holds. Smallest change: the redo answers 0
  only while the row is still at step `fenced`; later steps keep 65.
- **R2 out-of-order lines.** A redone `fence`/`admit`/`bind` line gets a seq after lines it should
  precede (e.g. after E+1's `admit`); the fence cut already recorded `ledger_seq` (lib.mjs:1802), and
  render orders an attempt's lines by seq (render.mjs:625). Readers that assume order (cost, tms,
  certify) are not checked: INFERRED risk. Smallest change: the redone line carries `redo: true` and the
  original's `updated_rev`, and readers order by that.
- **R3 runner gaps.** The summary lists status and fsck as touched, but the steps table has no row for
  `status --reconcile`'s `started` line (written after the row too, status.mjs:287-300) nor for stop's
  lines. A redo only runs when someone repeats the call; after success nobody does, so a missing line
  stays missing unless fsck's finding is acted on (no runner named).
- **R4 search cost.** "If no fence line with {task, to}" scans the ledger under the lock on every
  repeat: pace only.

### Fixes acting on each other

- **X1** FX-CLAIM step 5 needs FX-CGATE's close record; in Q5b FX-CLAIM regresses (C7).
- **X2** FX-CLAIM's tombstone (`host`) plus FX-CGATE's single `start_issued` give the unbounded uncharged
  loop (C2, G3).
- **X3** Order inside the fence: FX-OUT's fenced slot, then FX-CLAIM's tombstone, then the CAS. A death
  between the slot and the tombstone, then a retry: slot identical, tombstone created -> uncharged. But a
  session may have claimed in between (its hook passes the epoch gate, claims, then is denied READY by
  the fenced slot): ordinary fence. Consistent. No attack found.
- **X4** O1 also bites FX-CLAIM: commit during a torn tainted fence reads the slot; the tombstone does not
  help because a session did claim.
- **X5** Three new hook steps (claim, outcome, coordinator gate) all synchronous file work in one 5 s
  budget per tool call, every child tool call: pace, and O5/G1.

## 3. The designer's arguments against each attack (read after section 2)

| Attack | Answer | Where in FIX-fence.md |
|---|---|---|
| O1 torn tainted fence, commit of E | **Not answered.** The death table covers a non-tainted fence only; commit's change keeps only the epoch check | 81, 115 |
| O2 "uncommitted" wording | **Not answered**; the side-effect paragraph shows the intent is "its step not committed", so it is a text fix | 65-66, 138-140 |
| O3 fenced slot, row at E, runner | **Partly.** Status "should list" it, pointing at FX-REDO; FX-REDO has no such row | 81, 433-436 |
| O4 slot without READY.json, log growth | Partly: safety answered ("no decision reads it"); growth not | 90 |
| O5 synchronous hook vs deadline | Not answered | - |
| O6 case/alias of READY.json | Not answered | - |
| O7 READY before final staging | Not claimed otherwise; unchanged from today | 132-134 |
| O9 committed READY no longer blocks | **Answered** (an improvement) | 138-140 |
| O10, C8, G10 subjects cannot write the files | **Answered** by the layout and the profiles | 41-46, 165-166 |
| C1 bind to the loser, per-attempt close | **Not answered**; bind is absent from the changes | 240-249 |
| C2 uncharged loop with no bound | **Not answered**; step 7 relies on the tombstone being uncharged | 192-194 |
| C3 hook not run for some tools | Partly: BELIEVED fact 3 covers helpers only | 482 |
| C4 session_id stability | Partly: BELIEVED fact 1 covers helpers, not compaction or resume | 479-480 |
| C5 unclosable duplicate holds a slot | **Partly**: "lives, inert, until a session closes it", but its close cannot be mapped to the attempt | 254, 290 |
| C6 late session not counted during the lag | **Answered** as a stated timing assumption with both readings for the model | 232-236 |
| C7 FX-CLAIM in Q5b | Partly: Q5b says FX-CLAIM is then the only guard; the regression of verify is not noted | 338-341 |
| C9 NTFS create | Answered by the primitive and the hook's deny-on-exception | 19-21 |
| G1 lock wait inside the hook | **Not answered**; section 7 assumes the hook "fails closed", which a synchronous 30 s wait does not guarantee | 289, 470 |
| G2 killed hook holding the lock | Partly: section 7 (liveness, never safety); the new holder class is not discussed | 464-475 |
| G3 hook runs twice | **Not answered** | - |
| G4 identity on compaction, helpers | Partly (BELIEVED 1) | 479-480 |
| G5 first-come bind won by the wrong session | **Not answered**; only notes a successor binds on its first call | 278-280, 348 |
| G6 TOCTOU on `plan/` writes | **Not answered**; section 6 claims `plan/` writes covered; 344-346 bounds only the start window | 344-346, 460 |
| G7 who raises when the coordinator is dead | Not answered | - |
| G8 failed start leaves `start_issued` | Partly: lease then uncharged fence, which leads to C2 | 297-298 |
| G9 the hook becomes a writer | Partly: the guard-hook change is listed; contract 8.20 is not named | 327 |
| K1 close intent, not fact | **Not answered**; the lease argument is against a lease, not against an unverified close | 359-362 |
| K2 which session the stop names | Not answered | - |
| K3 endless `unconfirmed` | Partly: Q5b owner escalation | 383, 411-412 |
| K4 Q5b pace | Answered | 411-412 |
| R1 late repeat answers 0 | **Not answered**; "or later" is in the rule | 433 |
| R2 line order | Not answered | - |
| R3 runner gaps (status, stop lines) | Partly: fsck reports; no runner acts on the report | 427, 436 |
| R4 scan cost | Not answered (pace only) | - |
| X1-X5 | X1 partly (Q5b); X2 not; X3 consistent; X4 = O1; X5 not | - |

## 4. Verdicts

| Fix | Verdict | Smallest change |
|---|---|---|
| FX-OUT | **Stands with a change** | Every reader of the log (commit record, `uncommittedReady`, watch, status) treats a log holding a `fenced` slot as fenced: no commit of E, no ready-wins (O1). Also: the "uncommitted" text becomes "its step not in `row.commits`" (O2); the state "fenced slot, row at E" gets a runner, a watch/status act-due "re-run the fence" (O3) |
| FX-CLAIM | **Stands with a change** | Cap uncharged tombstone fences per row (count `host` fences; past a cap H_host, charge or set `limit`) (C2). Also needed for one-session safety under one fault: `bind` refuses a SID that is not the claim holder (no claim yet: exit 6, retry), and `close_issued` is recorded per session id and must name the claim holder (C1, C5) |
| FX-CGATE | **Stands with a change** (falls as written in the branch where a timed-out hook lets the tool run) | The in-hook lock acquisition gets a budget below `hook_deadline_ms` and never calls the process list (holder unknown -> deny) (G1). Also: `start_issued` keyed by the hook input's `tool_use_id` so a repeated hook allows (G3); the bind after a raise by a one-time successor nonce, not first come (G5); a runbook line that a raise for a dead coordinator runs from a terminal (G7); the claim for `plan/` writes downgraded to "narrowed" (G6) |
| FX-CLOSE | **Stands with a change** | Verify confirms on a close recorded by a PostToolUse hook from the close tool's result (`close_done`), not on the PreToolUse intent (K1); the stop of a committed/started row names the claim holder (K2) |
| FX-REDO | **Stands with a change** | The fence redo answers 0 `repeat` only while the row is still at step `fenced` at E+1; later steps keep 65 (R1). Add the `started` (status) and stop lines to the redo table, or name who acts on fsck's finding (R3) |

Every verdict also depends on the BELIEVED facts of FIX-fence section 8 and on three more found here:
(6) what the harness does with a PreToolUse hook that times out (blocks, or lets the tool run);
(7) whether a session's `session_id` survives compaction and resume; (8) whether the hook input carries
`tool_use_id`, and whether duplicate hook entries run twice. In branch (6) "lets it run", G1 and O5 are
safety holes, not pace.

## 5. Scenarios for the modeller (fault schedules in words)

1. **Torn tainted fence (O1).** Admit f0, start, bind; the child makes a READY(pack) slot; the
   coordinator fences `tainted`; the fence dies after the fenced slot, before the CAS; commit record of
   f0 at E. Property: NoStaleAccepted. 1 fault.
2. **Uncharged loop (C2, G3).** Admit f0; the start tool fails every time (or the hook runs twice and the
   second run denies); lease expiry; fence crash with a tombstone; repeat. Properties: RestartLimit,
   EventuallyResolves. One recurring environment mode.
3. **Bind to the loser (C1).** FX-CGATE's hook skipped once -> S1 and S2 on f0 e1; S1 claims; bind S2
   while admitted; S1 in a long call (no growth for 2 ticks); stop, close S2, verify. Properties: Slots,
   OneSessionPerAttempt. 1 fault.
4. **Late session past the lease (C6).** Start f0; the turn dies; the first tool call comes after
   `start_lease_ticks`; fence crash with tombstone; stop confirmed at once; admit f1. Slots as an
   invariant should fail; "eventually within N_max" should hold. 1 fault plus unbounded lag.
5. **Close that did not happen (K1).** f0 commits; stop request; close recorded at Pre, the tool fails;
   the session idles; verify after 2 ticks. Property: Slots in R10's form (READY-but-alive counted).
   1 fault.
6. **Wrong first binder (G5).** Raise; before the successor's first tool call another coordinator-hooked
   session makes a call. Property: the successor's liveness; TwoCoordinatorsAct if the binder acts.
   1 fault.
7. **Two-step row (O2).** Steps [pack, review]; pack committed; review's READY slot; hang fence. Property:
   ReadyNotDiscarded under the literal predicate. 0 faults.
8. **Unclosable duplicate (C5).** Two sessions on f0 (1 fault as in 3); the duplicate's close cannot be
   mapped; N_max = 1. Property: no slot held for ever; f1 eventually admitted.
9. **Late fence repeat (R1).** Fence f0 e1 -> e2; e2 admitted and started; the coordinator re-sends the
   e1 fence, reads 0, plans a start of e2 again. OneSessionPerAttempt without FX-CGATE; no effect with it.
   1 fault (a duplicated call).
10. **Lock held across the start hook (G1).** A script holds the run lock longer than the hook budget
    while the coordinator's start hook waits. Branch A: the harness blocks the tool (only delay). Branch
    B: it lets the tool run with no `start_issued` (a second start on the retry after a turn death).
    Properties: OneSessionPerAttempt, Slots. 1-2 faults.

