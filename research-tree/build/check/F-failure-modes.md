# F: failure modes of the research tree's design and the R57 round (task r57-0517)

Summary: 115 rows from four sources: protocol v2 section 9 (53 rows: P1-P21, F1, F2, S, C, N1-N16, G1-G12) and sections 16-17, `research-tree/FAULTS-AND-FIXES.md`, and `research-tree/notes/r3-changes.md` (defects, fixes FX-*, probes F-P*/W-H*, open items).
By where it arises: coordinator 19, hook 17, app 16, lane or check 14, model checker 12, landing or merge 12, helper 9, child session 7, token window 7, context window 2.
Conventions: P = `docs/program/RESEARCH-TREE-PROTOCOL-v2-2026-11-16.md` (v2); FF = `research-tree/FAULTS-AND-FIXES.md`; R3 = `research-tree/notes/r3-changes.md`. "R<n>" = the rule of that number in v2, cited at its line. Script line numbers exist only where R3 gives them (lib, hook, replace, watch, status, stop, handover); elsewhere the countermeasure is cited to the rule's line and script name (`tcb/<name>.mjs`). Ids that two sources use for different things are marked (fence) or (v2) and kept as separate rows. Not stated by any source: a countermeasure for an item marked "none stated".

| id | what goes wrong | where it arises | the tree's countermeasure | source |
|---|---|---|---|---|
| P1 | A wrong fact travels from one step to the next | coordinator | witness by script, one promotion, staleness; R14 P:211, R18 P:226, R19 P:231 (tms, promote, witness, certify) | P:562 |
| P2 | Anchoring: a session is steered by what it reads of earlier work | child session | lean folder, declared inputs, frozen protocol, planted fault; R21 P:247, R22 P:252, R33 P:355, R44 P:422 (audit, protocol-freeze, certify) | P:563 |
| P3 / P20 | Ensemble or shared model agrees wrongly (coincident failure) | model checker | compare to detect, never vote; script first, narrow checker, measured coupling; R37 P:377, R42 P:408, R25 P:284, R26 P:290 (check-queue, seed) | P:564, P:581 |
| P4 | Loss at a hand-over (untyped caveats, unwritten understanding) | child session | store once and join, harvest never retype, check at the consumer; R15 P:217, R17 P:223, R20 P:237, R49 P:467 (harvest, render) | P:565 |
| P5 / G2 | Web text steers a session (injection); the fetcher is a web reader | helper | least privilege per role, strict typed schema, scheme/size/time/address caps; R29 P:306, R30 P:327, R32 P:334, R25 P:284 (guard-hook, snap) | P:566, P:604 |
| P6 | Two writers to one file (lost update, split brain) | landing or merge | one run lock, exclusive create, fencing by epoch, one writer per file; R1 P:85, R2 P:93, R13 P:206, R14 P:211 (lib run lock, commit) | P:567 |
| P7 | Sources read twice | helper | accept idempotent duplicates and count overlap; R25 P:284, R35 P:363 | P:568 |
| P8 | Runaway fan-out | coordinator | slots, memory check, admission reservation; R10 P:157, R11 P:169 (admit) | P:569 |
| P9 | Waiting: no progress and nobody notices | coordinator | progress watchdog, level-triggered wakes; R4 P:111, R5 P:120, R6 P:128, R9 P:153 (watch, status) | P:570 |
| P10 | A crash mid-step | landing or merge | one restart path, commit record last, fsck, R = 1; R3 P:103, R7 P:137, R8 P:145, R14 P:211, R23 P:258 (replace, commit, fsck) | P:571 |
| P11 / G8 | The coordinator's window grows; the coordinator would enforce its own hand-over | context window | status file, hand-over at W*, watcher reads its window; R6 P:128, R12 P:177, R30 P:327, R50 P:471 (handover, watch) | P:572, P:610 |
| P12 | Children's cost unbounded | token window | W*, n_max, limits, admission reservation; R11 P:169, R49 P:467, R50 P:471, R52 P:480 (admit, cost) | P:573 |
| P13 | A weak expert passes | model checker | script certificate, plants, gate A, read-set hash; R19 P:231, R22 P:252, R43 P:418, R44 P:422 (certify, seed, admit gate A) | P:574 |
| P14 | Unknown cost | token window | unit costs from transcripts, admission reservation, re-plan; R10 P:157, R11 P:169, R31 P:330, R52 P:480 (cost) | P:575 |
| P15 | A wrong dismissal goes unchallenged | model checker | bar and reopening; seeded refuter later; R38 P:380 (tms) | P:576 |
| P16 | The search decides what is known (coverage overstated) | helper | search log, held-out seed recall, distinct primaries; R34 P:360, R35 P:363, R36 P:371 (audit, render) | P:577 |
| P17 | A card is used outside its conditions | model checker | typed scope check, checker on flags; R18 P:226, R26 P:290, R36 P:371 (check-queue) | P:578 |
| P18 | The tree may not beat one session | lane or check | frozen plan, blind scoring, cost prediction; R39 P:384, R53 P:485 (protocol-freeze, compare, cost) | P:579 |
| P19 | Busy but not progressing | coordinator | variant V from files, loop signature; R5 P:120 (watch) | P:580 |
| P21 | The check sees a summary, not the source; page changes before the check (also N8 v2) | model checker | own snapshot, hash-bound witness, snapshot reads; R25 P:284 (snap, witness) | P:582, P:599 |
| F1 | Where the review runs (fresh vs resumed path) | model checker | fresh path always runs; both in the pilot; R7 P:137, R19 P:231, R22 P:252 | P:583 |
| F2 | The second expert: whether a second model adds anything | model checker | measure before buying; R37 P:377 | P:584 |
| S | Shape and cost of the tree (key space, overflow, hand-over interval) | token window | keys, bulk load after pilot, overflow order; R46-R50 P:448-471 (plan-tree later) | P:585 |
| C | Completeness: what the tree misses | lane or check | two blind analyses, map and gate, residual as reading, protocol model; R54-R58 P:510-541 (gate --cut, render, protocol-model) | P:586 |
| N1 (v2) | Zombie writes after a replacement | child session | fencing token, epoch checks; R2 P:93, R9 P:153 (replace, lib fence) | P:587 |
| N2 (v2) / M5 | Every timer fires after PC sleep; two sleeps within one model call count as two hang ticks | app | counters in calls and ticks; a tick over 2 delta after the previous leaves the hang count unchanged; R5 P:120 (watch.mjs, test "M5 pause discount") | P:588, P:930 section 16 point 2 |
| N3 (v2) / FF 5 / M2 / D6 | The wake reaches nobody or the old coordinator; one coordinator turn that dies before arming leaves nothing to wake the tree (D6 paths 1-7) | coordinator | level-triggered wakes, watcher plus alarm, quiet hand-over; R6 P:128 (status --reconcile alarm-missing); R3 fixes FX-W2 (arm first, R3:36), FX-W3 (R3:37), FX-W4 dead-man (R3:38) | P:589, FF:15, P:930 (section 16 point 2), R3:36-38 |
| N4 (v2) / N4 (fence) | Helpers outlive a stopped child; a crashed child's stop cannot be verified ("no such session" not distinguishable) | child session | kill by tree and verify; R9 P:153; FX-CLOSE verify rules (a)(b)(c), owner at 3 rounds (stop.mjs 278-283, 426-449, R3:32, R3:146-147) | P:590, R3:66, R3:351 |
| N5 (v2) / C9 / O5 | Half-written files read as done (torn write), incl. hook-written files | landing or merge | commit record last; strict exclusive hook write with no fallback (lib exclusiveWrite 659-710, R3:28, R3:91) | P:591, R3:28 |
| N6 (v2) | Restart storm from a common cause | coordinator | restart limit, escalate, halt; R8 P:145 (W_cc a guess) | P:592 |
| N7 (v2) / C2 | Nothing resumes after reboot (needs a starter) | app | step machine reconciled each turn; R3 P:103, R6 P:128; owner restarts | P:593, R3:30 |
| N9 (v2) | Deadlock on slots (hold and wait) | lane or check | release before waiting; R11 P:169; the model found none within bounds | P:595 |
| N10 (v2) | An unmeasured or unrun check read as a pass | lane or check | three values pass/fail/not-run, seeds; R40-R42 P:402-408 (selftest, seed) | P:596 |
| N11 (v2) | Analysis chosen after the results | lane or check | pre-registration, frozen protocol; R33 P:355, R39 P:384 | P:597 |
| N12 (v2) | Winner's curse: a result judged on the data that chose it | model checker | judge on a new test; R36 P:371 | P:598 |
| N13 (v2) | Schema changes mid-run | landing or merge | refuse unknown versions; R14 P:211 | P:599 |
| N14 (v2) | One original counted twice (pseudoreplication) | helper | distinct primaries; R35 P:363, R36 P:371 | P:600 |
| N15 (v2) | A dropped card lives on in derived text | landing or merge | truth maintenance by labels with staleness; R19 P:231 (tms) | P:601 |
| N16 (v2) | Self-attested records | coordinator | script-only chained ledger; R31 P:330 (lib ledger) | P:602 |
| G1 | Escalation waits holding slots | coordinator | park and release; R8 P:145, R11 P:169 | P:603 |
| G3 | Not-run checks flood trust | lane or check | action line on the unverifiable share; R45 P:425 | P:605 |
| G4 (v2) | Shared weekly percent vs tokens (unit mismatch) | token window | spend from transcripts, meter readings logged as self-reported; R11 P:169, R52 P:480 | P:606 |
| G5 | Checks are cut first when budget runs short | token window | admission reservation includes checks; R52 P:480 | P:607 |
| G6 (v2) | Polling costs full-window calls | token window | a watcher instead of polling; R4 P:111 | P:608 |
| G7 | A quoted passage is a paraphrase | model checker | paraphrase case goes to the checker; R25 P:284 | P:609 |
| G9 | Required fields invite invention | helper | "not stated" allowed in schema; R32 P:334 | P:611 |
| G10 | Hooks unproven for helpers | hook | hook canary in selftest; R41 P:404 | P:612 |
| G11 | A seed fault enters the real store | lane or check | reserved namespace; R42 P:408 (seed) | P:613 |
| G12 | The estimate rests on one mapper | model checker | sensitivity range; R56 P:525 | P:614 |
| FF 1 / D4a / M6 | A child's finished READY is thrown away by a fence that races it (planned hand-over fences an attempt whose READY is written) | landing or merge | FX-OUT outcome log of write-once slots, READY.json a copy (hook step after guard-hook 459, replace 451-522, commit 674-694, R3:29, R3:117-135); M6 re-check exit 5 ready-wins (replace.mjs, P:930, R7 P:137) | FF:11, R3:29, P:930 section 16 point 2 |
| FF 2 / D4b / RC | Two sessions are started for one attempt (late transcript, double start, planners' double start at status.mjs:542, watch.mjs:164) | coordinator | FX-CLAIM one claim per attempt, tombstone, lease with `--if-unclaimed` (hook parseInput 210-226, replace bind 976-1013, R3:30, R3:136-137); FX-PLAN `planAct` (R3:34, R3:101) | FF:12, R3:30, R3:34 |
| FF 3 / D4c / M4 | A finished child holds its slot for ever; crash, owner wake, hand-over or unconfirmed stop run three sessions beside N_max = 2 | token window | FX-CLOSE close then verify (stop.mjs 278-283, 426-449); M4 slot count in lib.slotCount 3063-3102, R10 P:157, R3:97, R3:32 | FF:13, R3:32, P:930 |
| FF 4 / D3 | A stale coordinator starts a session (session tools reachable by a coordinator whose ce is old) | coordinator | FX-CGATE coordinator hook branch, nonce bind, `start.json`, session_tools key (guard-hook coordinator path 394, 412-413, handover 209-213, 338-343, R3:31, R3:119-120, R3:149); R12 P:177, R2 P:93 | FF:14, R3:31 |
| FF 6 / D5 | A healthy slow call of about ten minutes is taken for a hang and fenced (NoFalseSuspicion) | coordinator | FX-W6 per-kind deadlines, idle and age cap uncharged (watch evaluate 347-421, lib parseTranscript tail, R3:40, R3:106, R3:167); R5 P:120 | FF:16, R3:40 |
| FF 7 / M3 | A due act is raised once; a coordinator that ignores it leaves it unraised for ever (acknowledged, not acted on) | coordinator | FX-W5 re-raise with capped backoff and `stuck` (watch rowAct 135, 157-165, evaluate, R3:39, R3:166); class 17 act-due (watch.mjs, P:930 M3) | FF:17, R3:39 |
| FF extra a | No coordinator brief exists | coordinator | new `tcb/briefs/coordinator.md` with R6 acts, endturn rule (R3:191, R3:250) | FF:19, R3:250 |
| FF extra b | A row committed at `started` cannot be stopped | coordinator | FX-CLOSE: `stop request` accepts committed && started (stop.mjs 278-283, R3:147) | FF:19, R3:32 |
| FF extra c / FX-W1 flags | Test flags of the scripts (--once, --boot, --tick, --now, --sleep-ms, --interval-ms, --free-mb, --no-intake) can be reached by the coordinator | hook | per-script allow-list of production flags, `flag not allowed` (guard-hook checkTcbNode 315-353, R3:121, R3:334 rule R29 P:306) | FF:19, R3:35, R3:121 |
| D1 / D1b | Wake loop: endturn kills the live alarm, the killed command's exit wakes the coordinator, whose endturn kills again (busy loop); two writers of watcher state; restart loop on exit 67 | coordinator | M1 alarm re-armed by a token (hash of run/acked.json), no script kills a wake source (R6 P:128, watch.mjs, status.mjs); FX-W1 tri-state liveness, exit markers; FX-W7 watcher lock under the run lock (lib acquireLock 1315-1328, 1366-1369) | P:930 M1, R3:35, R3:41, R3:107 |
| D2 | No enforcer for each act: a coordinator acts without a live confirmed wake source | hook | FX-W3 `requireArmed`, exit 6 not-armed, unarmed record (lib withRunLock 1463-1472, replace underLock 271-277, guard-hook coordinator branch) | R3:37 |
| D6 path 3b / B2 | Endturn exit 2 hides a dead alarm; endturn omitted by the coordinator (N2 residue) | coordinator | FX-W1 tri-state report, R5 N2 brief rule "every turn ends with endturn"; E1 (brief only, FX-W4 recovers) or E2 (alarm defers once, unmodelled) owner choice | R3:35, R3:250, R3:307, R3:367 |
| FX-W4 gap (rev 4) | Dead-man alerts once per onset: with the owner not answering the tree stays silent (design gap NoDeadlock F 8) | app | re-alert every `realert_runs` runs while the cause holds (status.mjs --deadman, thresholds `realert_runs`), P1 or P2 pace owner choice | R3:38, R3:183, R3:306, R3:416 |
| D6 path 5-7 / B6.1 | Both wake sources lost; owner not told; PC sleep stops everything | app | FX-W4 dead-man scheduled task outside the failure domain (tcb/settings/deadman-task.xml, WakeToRun) ; alerts only the owner | R3:38, R3:192, P:589 |
| M2/D6 W-premises | Premises (a), (b), (c) of FX-W2/W4 (alarm timing, longest coordinator turn under 0.5 x alarm_ms, a pending wake starts within one period) are rules about timing | coordinator | stated as premises; probe W-turn measures longest turn; fail toward safe side | R3:80-81, R3:369-370 |
| FX-REDO | A missing ledger line after a death | landing or merge | idempotent redo at exact post-state; fsck warns, render orders by epoch when redo set (lib.mjs:155 fs seam, render.mjs:625) | R3:33, R3:153, R3:270 |
| Q5b loop (N9 fence) | Where the coordinator has no session tools, hand-started children wake no coordinator; FX-PLAN answers `owner` and a wake loop remains | coordinator | Q5a hook-gated start/stop or Q5b tools refused; model: BOUNDED, cannot be relied on | R3:31, R3:292 |
| M4-list | Process list unavailable or no line matches: nothing admitted or every session counted unconfirmed | app | `with no process list nothing is admitted` (admit.mjs, R10 P:157); slotCount without root counts every folder session `unconfirmed` (lib 3063-3102, R3:97) | P:930, R3:97 |
| H1 (fence) | No slot or tombstone without a manifest (fence of a parked row writes nothing) | landing or merge | FX_OUT_MANIFEST: fence of a parked row writes no slot and no tombstone (replace.mjs start creates `outcome/` with manifest, R3:29, R3:134) | R3:29, R3:266 |
| FX-CLAIM step 7 | A folder session with no close record that is not the claim holder is a hidden slot; orphans of tombstoned attempts | child session | R10 sentence: counts one more slot; every counted session gets a `close-session` act (slotCount 3063-3102, FX-PLAN, R3:97, R3:331) | R3:30, R3:97, R3:101 |
| Lease reading (ii) | No bound on transcript lag after a start: Slots and NoChargeWithoutFault fail with the fixes on | app | lease above lag and first-tool-call time; "Slots eventually" or longer lease by owner after PROBE 5 | R3:60, R3:360, R3:392 |
| F-P1a | PreToolUse input may not carry `session_id`: FX-CLAIM and FX-CGATE cannot be built | hook | none stated (probe first, no fallback) | R3:53, FF:59 |
| F-P1b | Exact `session_id` format unknown | hook | fix `SID_RE` after probe | R3:54 |
| F-P1c / PROBE 1(c) | Helper shares or has its own session id: with its own, every helper call denied | helper | protocol choice for the owner; open | R3:55, R3:349 |
| F-P1d / N10 (fence) | Helper transcripts live at top level and are counted as folder sessions by slotCount | helper | open; depends on PROBE 1 | R3:56, R3:352 |
| F-P2 | Write input may lack full `content`: hook cannot copy READY bytes | hook | none stated (inferred) | R3:57 |
| F-P3 | A helper's tool calls may not run the attempt's hook: helper writes pass unchecked | hook | none stated (inferred) | R3:58 |
| F-P4 | Session-tool names unknown (`session_tools` key) | hook | names fill `profiles/coordinator.json` `session_tools`; until then tool-not-allowed | R3:59, R3:420 |
| F-P5 | Unknown bound on transcript lag and time to a child's first tool call | app | lease set above both once measured in the pilot | R3:60 |
| F-P6 / O5 | The harness lets a tool run when its hook times out or is killed (READY lands with no slot) | hook | hook budget `hook_deadline_ms` (thresholds.json:52) and fsRetry budget; residual open | R3:61, R3:92, R3:348 |
| F-P7 / C4 / G4 (fence) | `session_id` may change on compaction or resume: child or coordinator locked out, no stable identity | app | recover from a terminal; open | R3:62, R3:348 |
| F-P8 | No `tool_use_id`, or duplicate hook entries run twice: repeated start denied | hook | start waits for lease, ends in a `crash` no-start fence | R3:63 |
| F-P9 | Matcher `*` may not run the hook for MCP tools | hook | precondition of every hook-based fix | R3:64 |
| F-P10a / N8 (fence) | Close "success" does not mean the session is gone; verify can confirm while the session finishes a model call | app | verify rules and rounds; open | R3:65, R3:350 |
| F-P10c | No PostToolUse hook or unreadable response | hook | every close goes to the owner | R3:67 |
| F-P11 | When several hooks answer, a deny may not win | hook | not needed: one PreToolUse entry per role (settings/coordinator.json 57-64) | R3:68, R3:123 |
| F-P12 | `run/` and `wt/` do not support hard links | app | selftest hard-link check fails closed | R3:69, R3:154 |
| W-H2 | PreToolUse hooks may not deny (believed, not observed); every flag denial rests on it | hook | observe a denial once (owner); CONTRACT section 7 needs-app item 1 | R3:71, R3:380 |
| W-H4 | Only the owner, a child note or the session's own background command wakes a session | app | derived fact; FX-W4 dead-man alerts the owner | R3:72 |
| W-H5 | Kinds of transcript record are believed only: unreadable counts as `model` | app | parseTranscript kind (lib), FX-W6 | R3:73 |
| W-H6 / W-H7 | Windows suspend logging unknown; PC sleeps after 15 idle min; whether timers count during sleep is not measured; short suspends under 2 delta cause false suspicion | app | M5 pause discount; both timer branches modelled; one measured suspend by owner | R3:74-76, R3:372-373, R3:396 |
| W-toast / alert reach | An alert toast may not show or be read | app | branch A app-level session or B toast; unverified | R3:77, R3:374 |
| W-helpers | Helper profiles' bash grammar through the Agent tool unchecked | helper | read the profiles (FX-W1 step 5) | R3:78, R3:255, R3:381 |
| W-allow | Allow-list content may not match each script's production calls (`--if-unclaimed`, `close-session` not in any list) | hook | one check per script; new artefact not attacked | R3:79, R3:418, R3:382 |
| FX-W5 stuck | `stuck` alert takes about 4.75 h; 10 s process query times out under load | coordinator | cap in FX-W5 (`stuck_raises` 3); L2 or longer timeout (`ensure_query_ms`) | R3:383-384, R3:108 |
| LR-1 | A failed process query was read as a dead lock holder (lock broken) | lane or check | lib-fix: query failure never reads as dead; 8 fixes pinned by 10 targeted tests | P:888-927 (section 16 point 1) |
| LR-4 | An unreadable lock not reported by status | landing or merge | none; library breaks such a lock after about 30 s; owner ruling open | P:1236, R3:291 |
| U2 high | Promote reverted by a card's last line only; commit's R34 URL check always passed | landing or merge | U2 review fixes (10 fixed, 1 residual) | P:888-927 (section 16 point 1) |
| U3 high | guard-hook failed open through a junction | hook | main-guard rule `import.meta.main` plus real-path compare, test main-guard.test.mjs | P:1214 section 16 point 9 |
| Junction no-op | Six scripts (admit, check-queue, handover, replace, seed, stop) did nothing and exited 0 when started through a junction | lane or check | entry-guard convention in CONTRACT 1.1; test runs all 24 scripts through a junction | P:1214 |
| U4 high | render dropped ledger silences from working time | landing or merge | U4 review fix | P:888-927 (section 16 point 1) |
| U3-F8 / U2-F2 / U5-PF-1 | Mapper role (task or helper), harvested cards not URL-checked, draft-file hash unrecorded | helper | owner rulings open; witness R25 remains the backstop | P:1228-1236, R3:288-290 |
| 01:42 reset / 02:34 stall | PC hard reset; new program starts blocked while running programs go on; a resume re-ran finished agents and overwrote 20 revised specs | app | snapshot commit restore; lane with capacity, below-normal priority, heap cap, `taskkill /T /F` at timeout (tools/lane.mjs) | P:1048 section 16 point 4, P:1019 point 3 |
| Process bursts | Self-tests or model pools starting processes in bulk precede stalls | lane or check | no-burst rule in briefs; lane exit 75 after 900 s; selftest one case root at a time | P:1019 section 16 point 3 |
| Continuation script (a) | A fix stage counted as done when its unit's review was done: a restart would skip unfinished fixes | lane or check | stage done only if its own label is in the journal (R60 P:1163); dry run with stubs | P:1154, P:1163 |
| Continuation script (b) | Last stage asked for four test files at once against the no-burst rule | lane or check | one lane command per test file, never two at once | P:1154 |
| Resume order | Workflow resume re-runs finished agents once call order shifts | lane or check | R60: trust only a stage's own record; snapshot, continue from files | P:1163 |
| Coordinator window | The finishing session passed W*_coord (133.2k) before the first wait and ran to 250k+ tokens; fixed context about 75k | context window | R59 hand-over while small (P:1136), R50 P:471; handover.mjs, watch window read | P:1125 section 16 point 5 |
| e2e long path | `e2e/run-e2e.mjs` fails when the scripts' folder path exceeds 114 characters (git add without core.longpaths, result unchecked) | lane or check | proposed: pass the switch on every git call, check the result, add a test; not yet built | R3:402-409 |
| Model scope | Joint runs BOUNDED (FXW-ALL, AB-FENCE-ALL), FX-W3, FX-W7, FX-REDO, B2, E2, L2 not modelled; Q5b cannot be relied on | model checker | none; listed as R57 still needs | R3:43, R3:394, R3:41 |
| Model fidelity | Fidelity review did not see the final pass; no fence result proven to come from the frozen file; model gaps read true state (tickEnabled, eligibleHO) | model checker | provenance directory, stated limits | R3:395, `research-tree/notes/section17-draft-2026-11-17.md:41` |
| Open fence items | G6 `plan/` Write in flight across a raise; P3 table test lacks log/manifest/verify_rounds; P4 old watcher keeps old planner after upgrade; P5 no owner supersede for a refused fence-pending row; `predictFence` and `lib.fence` two copies | landing or merge | none stated; recorded open | R3:346, R3:354-357 |
| H2 (fence) | Watcher dead: lease never expires | coordinator | closed by R6 restart act at coordinator's next turn (bound T_resume), else owner alert; L1 vs L2 owner choice | R3:353, R3:299 |
| Hard-killed alarm | Alarm hard-killed under list outage (L1) leaves no marker; one failure shared by every program start; dead-man task missing or disabled | app | L2 or FX-W4 alert; needs an off-PC channel; only an anomaly shows a missing task | R3:371, R3:375-376 |
| B5.2 | A child imitating activity defeats the idle rule | child session | age cap only asks the coordinator, uncharged | R3:377, R3:40 |
| Hook-written files | Script cannot know which status.json the model read; allow-list not attacked | hook | accepted | R3:379, R3:382 |
| Not covered (FX-OUT) | READY whose outputs commit rejects; FX-OUT liveness depends on FX-CLOSE; a duplicate's tokens before its first tool call | child session | FX-PLAN step 3 and FX-CLOSE; rest open | R3:358 |
