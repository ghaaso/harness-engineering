# Write collision points of the thirteen fixes and 0b (extraction and arithmetic only)

Made 2026-11-18 by reading. No verdict, no recommendation. Nothing was built or run. The only computation is a subset count (awk, in the scratchpad) over the edge lists printed in section 4.
Sources: `research-tree/notes/r3-changes.md` (r3:N = its line N), `research-tree/BUILD-SIZE.md` (BS), `model/as-built/FIX-fence.md` (F), `FIX-wake.md` (W), `FIX-JOIN.md` (J), and today's `research-tree/tcb/*.mjs`.

Fixes (14 rows): 0b, OUT, CLAIM, CGATE, CLOSE, REDO, PLAN, W1 to W7. Script names without the folder `tcb/` and without `.mjs`.
Kind codes (exactly one per row): E = edits inside an existing function; N = adds a new function; C = adds a call or a branch at one point; K = adds a key or a line; S = inserts a step into an ordered sequence that other fixes also insert into; F = new file.
Ranges are today's lines: from a function's first line to the line before the next top-level definition. Lines named by r3 are quoted as r3 gives them. A removal is counted as E. "inf" = my inference, r3 does not name the place.
A "place" is one function, one block or one new item. A collision point counts once however many statements it holds.

## 1. Table A: one row per fix, file and place

| Fix | File | Function or block changed (lines today) | Kind | r3 |
|---|---|---|---|---|
| 0b | lib | `exclusiveWrite` 659-712 (strict option); `fsRetry` 166-176 (budget argument) | E | 91-92 |
| 0b | guard-hook | argument on every hook write call (no write exists today; the calls come from OUT, CLAIM, CGATE) | C | 125 |
| 0b | selftest | hard-link check in `run/` and `wt/` (no function found) | C | 154 |
| OUT | lib | `outcomeState`, `outcomeAppend` | N | 93 |
| OUT | lib | `fence` 1740-1821, callback at line 1774 | E | 94 |
| OUT | guard-hook | `decideInner` 368-532, write branch, new step after line 459 | S | 117 |
| OUT | replace | `readyValid` 183-207 (removed) | E | 131 |
| OUT | replace | `modeFence` 428-527: M6 block 473-477 and fence 451-522 become steps 1-7 | S | 132, 139 |
| OUT | replace | `predictFence` 400-427 also called in the real run; `modeStart` 839-958 creates `outcome/` | C | 133-134 |
| OUT | commit, watch, status | `recordPass` 666-871 (674-694); watch `readReady` 119-127; status `readReady` 326-335 | E | 145, 161, 175 |
| OUT | fsck | new checks (gapless log, slots parse, nothing after a fenced slot); function not named | N | 152 |
| CLAIM | lib | claim helpers (names not given) | N | 95 |
| CLAIM | lib | `fence` lines 1773, 1782, 1785-1791 (`nostart`); `slotCount` 3063-3104 | E | 96-97 |
| CLAIM | task-row schema, thresholds.json | row field `nostart`; `H_nostart`, `start_lease_ticks`, `start_lease_ms` (r3 lists "tasks schema" under lib) | K | 96, 98 |
| CLAIM | guard-hook | `parseInput` 210-227 keeps `session_id` | E | 118 |
| CLAIM | guard-hook | `decideInner` child gate, new step after line 409 (strict create of `claim.json`) | S | 118 |
| CLAIM | replace | `modeFence`: tombstone (OUT step 6), `nostart` handling | S | 135, 139 |
| CLAIM | replace | `modeFence` option `--if-unclaimed` (exit 5 `claimed-late`) | C | 137 |
| CLAIM | replace | `modeBind` 959-1018 (976-1013) | E | 136 |
| CLAIM | stop, status | `modeRequest` 252-331, lines 283-302; `applyReconcile` 263-318 | E | 146, 176 |
| CLAIM | handover, admit, status | `slotCount` callers get `{root}`: `doRaise` line 277, admit lines 470 and 572, `computeStatus` line 362 | E | 151 |
| CLAIM | briefs | one claim line in `child.md:41` and the four helper briefs | K | 248-249 |
| CGATE | guard-hook | `decideInner` coordinator branch (skipped today at 394): bind call, current-ce check, `start.json`, stop intent | S | 119, 123 |
| CGATE | guard-hook | PostToolUse mode (`decide` 541-562 or `main` 598-630; no place named) | C | 119 |
| CGATE | guard-hook | `PROFILE_KEYS` line 33, `toolListed` 279-283, tool refusal line 413 (`session_tools`); constant `SID_RE` | K | 119-120 |
| CGATE | handover | `doInit` 209-213 and `doRaise` 338-343 (`successor_nonce`); `briefLine` 351-356; `doBind` 370-422 | E | 149 |
| CGATE | handover | `RUN_DIRS` 17-28 gets `run/close/intent`, `run/close/done` (inf: r3 names "init" and no script) | K | 155 |
| CGATE | status | `runOwner` 723-744 and `ACTS` line 18: act `closed` | E | 177 |
| CGATE | settings, profiles | `settings/coordinator.json` PostToolUse entry; `profiles/coordinator.json` `session_tools` | K | 194-195 |
| CLOSE | stop | `modeRequest` guard 277-279 (278-283); `modeVerify` 332-495, lines 426-449 | E | 147 |
| CLOSE | task-row schema, thresholds.json | row field `verify_rounds`; `stop_verify_ms` | K | 100 |
| REDO | fsck | check that warns of missing lines; function not named | N | 153 |
| REDO | render | `main` 103-809, line 625 (order by epoch when `redo` is set) | E | 153 |
| REDO | replace, status, stop | repeat-call branches: named only by file (r3:233); no place named | - | 233 |
| PLAN | lib | `planAct` | N | 101 |
| PLAN | status, watch | `nextOf` 520-554 delegates to `planAct`; `rowAct` 135-169 becomes a filter, branch 157-164 goes | E | 162, 178 |
| W1 | lib | `liveness` beside line 1202 | N | 102 |
| W1 | guard-hook | `checkTcbNode` 317-354 (per-script allow-list) | E | 121 |
| W1 | watch | `runAlarm` 752-797: exit marker before every exit (776-795) | S | 163 |
| W1 | status | `runEndturn` 606-659, lines 643-658; `computeStatus` lines 353-354 | E | 179 |
| W1 | status | reconcile hold 2 inside `runBuild` 575-584: prune of `run/arm/` | S | 181 |
| W1 | thresholds.json, handover | `lease_ms`, `beat_ms` (L2); `GITIGNORE_LINES` 30-33 gets `run/arm/` (inf: r3:193 names `.gitignore`) | K | 108, 193 |
| W2 | lib | `realProc` 2755-2817, timeout argument (it already takes `timeoutMs`) | E | 103 |
| W2 | watch | `FLAGS` 36-51: `--ensure`, `--nonce` | K | 164 |
| W2 | watch | `runAlarm`: ensure and slot registration (W:205) | C | W:205 |
| W2 | status | `runBuild` 555-587, `armAtStart` 593-602 removed, `--arm-nonces`, `turn.json` | E | 180 |
| W2 | thresholds.json | `ensure_query_ms`, `release_ms`, `arm_confirm_ms`, `alarm_slots` | K | 104 |
| W3 | lib | `withRunLock` 1463-1474, option `requireArmed` | E | 105 |
| W3 | replace | `underLock` 272-286: `requireArmed` on `start` and on fence reason `first`; first step of the fence hold | S | 138-139 |
| W3 | guard-hook | coordinator branch: deny the session-start tool when not armed | S | 122-123 |
| W3 | handover | `briefLine` 351-356 | E | 150 |
| W3 | watch | `runAlarm`: `turn_seq_at_reg`; `unarmed-*` record on fire, before W1's marker | S | 165 |
| W3 | watch | `runAlarm` E2: defer the exit once (owner choice, not modelled) | C | 169 |
| W3 | status | `runEndturn` 606-641: K = `turn.json.read_seq`, then `arm = spent` | E | 182 |
| W3 | briefs | `tcb/briefs/coordinator.md` | F | 191 |
| W4 | status | `--deadman` (inf: `FLAGS_BY_MODE` line 45, `main` 758-795) and its function | N | 183 |
| W4 | status | `computeStatus` new anomaly `deadman-nowake` | C | 184 |
| W4 | thresholds.json, settings | `realert_runs`; new `tcb/settings/deadman-task.xml` | K | 109, 192 |
| W5 | watch | `rowAct` step 1 (owner or none gives null; the same statement as PLAN's); `evaluate` act-due set 543-568, keys 609-625 | E | 166 |
| W5 | thresholds.json | `stuck_raises` | K | 108 |
| W6 | lib | `parseTranscript` 2493-2676, returns the kind | E | 106 |
| W6 | watch | `evaluate` 347-421 (deadlines, `idle-child`, `age-cap`); `freshTaskState` 286-292 | E | 167 |
| W6 | thresholds.json | `idle_ticks`, `attempt_max_ticks` | K | 106 |
| W6 | stop | B2 only: `modeVerify` 426-449 (open, not designed) | - | 148 |
| W7 | lib | `acquireLock` 1282-1387 (1315-1328, 1366-1369) | E | 107 |
| W7 | watch | `evaluate` 627-668 (copy state, adopt after the hold); `loadWatcherState` 293-308; `runWatcher` 725-733 | E | 168 |
| W7 | thresholds.json | `watcher_lock_try_ms`, `busy_alert_ticks`, `watcher_lease_ticks`, `run_lock_lease_ms` | K | 107-108 |

## 2. Table B: collision points (a place that two or more fixes change)

Order: S = ordered sequence where the order matters; SAME = same statements; DIFF = different parts, entries or keys of one function, table or object.

| # | File | Function or block | Fixes (n) | What each does there | Kind |
|---|---|---|---|---|---|
| B1 | lib | `fence` 1740-1821 | OUT, CLAIM (2) | OUT: callback at 1774 becomes the log check. CLAIM: `nostart` at 1773, 1782, 1785-1791 | DIFF (lines 1773 and 1774 are neighbours); J 254 calls them disjoint parts |
| B2 | guard-hook | `decideInner` child path: after 409, 412-459, after 459 | CLAIM, OUT (2) | CLAIM: claim create after 409. OUT: ready slot after 459 | S: a duplicate's READY is denied before it takes a slot (J 359) |
| B3 | guard-hook | `decideInner` coordinator path, with `checkTcbNode` 317-354 | CGATE, W3, W1 (3) | CGATE: bind, current session, `start.json`. W3: armed check. W1: allow-list, first | S: J 9 order is profile and grammar, allow-list, bind, current session, armed, row check, then the one create; a denial writes nothing (r3:123) |
| B4 | guard-hook | every hook write call (none today) | 0b, OUT, CLAIM, CGATE (4) | each new create carries 0b's strict flag and budget | SAME: 0b's arguments sit in the calls the other three add |
| B5 | guard-hook | allow-list content (`checkTcbNode`) | W1, CGATE, W2, CLAIM, W4 (5) | W1 owns it. It must hold `handover bind --nonce` (CGATE), `watch --ensure --nonce` and `status --arm-nonces` (W2), `replace fence --if-unclaimed` (CLAIM), `status --deadman` (W4) | DIFF: entries of one table; content, not code (r3:124, 418; W:118) |
| B6 | replace | one fence hold: `modeFence` 428-527 and `underLock` 272-286 | W3, OUT, CLAIM (3) | W3: `requireArmed` first. OUT: steps 1-5 (451-522). CLAIM: tombstone, then the `lib.fence` CAS with `nostart`; `--if-unclaimed` | S (J 247-252, r3:139) |
| B7 | stop | `modeRequest` 252-331 | CLOSE, CLAIM (2) | CLOSE: accepts committed and started, 277-283. CLAIM: tombstone confirms at once only with no folder session, 283-302 | DIFF; line 283 is named by both |
| B8 | handover | `briefLine` 351-356 | CGATE, W3 (2) | both change the one line: nonce and the path `tcb/briefs/coordinator.md` | SAME (J 352) |
| B9 | handover | `doRaise` 252-350 | CGATE, CLAIM (2) | CGATE: nonce in the coord value 338-343. CLAIM: `{root}` at line 277 | DIFF |
| B10 | status | `computeStatus` 345-519 | W1, CLAIM, W4 (3) | W1: lines 353-354. CLAIM: line 362. W4: new anomaly (wake-source anomalies at 425-426) | DIFF |
| B11 | status | `runBuild` 555-587 (reconcile hold 2) | W2, W1 (2) | W2: arm-nonces, `turn.json`, wait. W1: prune of `run/arm/` | S: the prune reads the slots W2 writes in the same hold (J 150) |
| B12 | status | `runEndturn` 606-659 | W1, W3 (2) | W1: tri-state report 643-658. W3: K and `spent`, 622-641 | DIFF |
| B13 | status | `FLAGS_BY_MODE.default` line 45 (one line) and `main` 758-795 (inf) | W2, W4 (2) | W2: `arm-nonces`. W4: `deadman` | SAME if `--deadman` is a flag (inf) |
| B14 | watch | `rowAct` 135-169 | PLAN, W5 (2) | PLAN: filter around `planAct`. W5 step 1 is PLAN's step 2 (owner or none gives null) | SAME (J 239) |
| B15 | watch | `runAlarm` 752-797 | W1, W2, W3 (3; E2 is a fourth change) | W1: marker before each exit. W2: `--ensure`, slot registration. W3: `turn_seq_at_reg`, `unarmed` record on fire before the marker (W:246) | S at the exits |
| B16 | watch | `evaluate` 309-682 | W5, W6, W7 (3) | W6: deadlines 347-421, adds `idle-child`, `age-cap` to the act-due set. W5: re-raise and `stuck` over the whole set (543-568, 609-625). W7: state is a copy, adopted after the hold (627-668) | S (J 244-246) |
| B17 | thresholds.json | `params` object, lines 3-65 | CLAIM, CLOSE, W1, W2, W4, W5, W6, W7 (8) | 18 new keys: CLAIM 3, CLOSE 1, W1 2, W2 4, W4 1, W5 1, W6 2, W7 4 | DIFF: separate keys, no shared line, one object |
| B18 | task-row.schema.json | `row` properties (51-85) | CLAIM, CLOSE (2) | `nostart`; `verify_rounds` | DIFF |
| B19 | briefs/coordinator.md (new) | one list of acts | W3, W1, W2, CGATE, PLAN (5) | W3 owns it; W1 restart act; W2 calls 1 and 2; CGATE bind; PLAN `close-session`, `start-session` | S: J 2b order of acts (r3:250) |
| B20 | briefs | `child.md:41` and `fmea`, `fresh-reviewer`, `mapper`, `stpa` | OUT, CLAIM (2) | OUT: READY is a copy. CLAIM: line on `attempt-claimed` | DIFF: two lines per file |

Possible but not placed, so not counted: fsck (OUT and REDO each add a check; both may add a call in `storeChecks` 521-531, inf); stop `modeVerify` 426-449 (CLOSE now; W6 B2 would use the same hold, not designed); REDO's repeat branches in `modeFence`, `modeStart`, `modeBind`, `modeRequest`, `modeVerify`, `applyReconcile` (F section 5 lists six call forms).
Of B1 to B20: S 7 (B2, B3, B6, B11, B15, B16, B19), SAME 4 (B4, B8, B13, B14), DIFF 9.

## 3. Table C: counts per file

| File | Places changed | By exactly one fix | Collision points | Fixes that change it |
|---|---|---|---|---|
| lib | 13 | 12 | 1 (B1) | 9: 0b, OUT, CLAIM, PLAN, W1, W2, W3, W6, W7 (BS counts CLOSE too: 10) |
| guard-hook | 8 | 4 | 4 (B2, B3, B4, B5) | 6: 0b, OUT, CLAIM, CGATE, W1, W3 |
| replace | 5 | 4 | 1 (B6) | 3: OUT, CLAIM, W3 (REDO by file only) |
| commit | 1 | 1 | 0 | 1: OUT |
| admit | 2 | 2 | 0 | 1: CLAIM |
| stop | 2 | 1 | 1 (B7) | 2: CLAIM, CLOSE (W6 B2 open; REDO by file only) |
| handover | 6 | 4 | 2 (B8, B9) | 4: CLAIM, CGATE, W3, W1 (W1 is inf; by r3 literally 3) |
| status | 9 | 5 | 4 (B10-B13) | 8: OUT, CLAIM, CGATE, PLAN, W1, W2, W3, W4 (REDO by file only) |
| watch | 8 | 5 | 3 (B14-B16) | 8: OUT, PLAN, W1, W2, W3, W5, W6, W7 |
| fsck | 2 | 2 | 0 (1 inf) | 2: OUT, REDO |
| render | 1 | 1 | 0 | 1: REDO |
| selftest | 1 | 1 | 0 | 1: 0b (BS also counts CGATE) |
| Scripts, total | 58 | 42 | 16 | 12 files |
| thresholds.json | 18 keys, one object | 18 | 1 (B17) | 8 |
| task-row.schema.json | 2 keys, one object | 2 | 1 (B18) | 2 |

## 4. Arithmetic

Pairs of fixes: 14 fixes give 91 pairs. Edge lists below use the fix names of Table B. `0b-OUT` means 0b and OUT collide.

(a) Largest set of fixes that share no file. BS section 2 file sets: 81 of 91 pairs share a file. The largest set is 3, and it is unique: {0b, REDO, W5}. BS:105-106 also names {0b, REDO, W7} and {0b, REDO, W6}; by BS's own table both share `lib.mjs` with 0b, so they are not disjoint. Variants:
| File sets used | Largest set |
|---|---|
| BS section 2 as printed | 3: 0b, REDO, W5 |
| CLOSE not in lib (F lists stop, schema, thresholds) | 3: 0b, REDO, W5 |
| thresholds.json not counted as a file | 3 (4 sets) |
| CLOSE not in lib and thresholds.json not counted | 4: 0b, CLOSE, W4, W5 |
| REDO only at fsck and render (r3:153) | 3 (6 sets) |
| both of the last two | 5: 0b, CLOSE, REDO, W4, W5 |

(b) Largest set of fixes that share no function or block. Edges (22 of 91 pairs) are the pairs inside B1-B4 and B6-B16: OUT-CLAIM, OUT-CGATE, 0b-OUT, 0b-CLAIM, 0b-CGATE, OUT-W3, CLAIM-CGATE, CLAIM-W3, CGATE-W3, W1-CGATE, CLAIM-CLOSE, CLAIM-W1, CLAIM-W4, W1-W4, W1-W2, W1-W3, W2-W3, W2-W4, W5-W6, W5-W7, W6-W7, PLAN-W5. B5 (content) and the keys of B17 and B18 are not counted in the base.
| Rule | Largest set |
|---|---|
| Function or block, as above (base) | 7: {0b, CLOSE, REDO, PLAN, W3, W4, W6}; the other maximum set has W7 for W6 |
| Base plus B5 content (25 pairs) | 7 (the same two sets) |
| Base plus thresholds.json as one unit (B17; 41 pairs) | 5 (4 sets, for example {0b, CLOSE, REDO, PLAN, W3}) |
| Base plus REDO's repeat branches (not placed): REDO-OUT, REDO-CLAIM, REDO-W3, REDO-CLOSE | 6: {0b, CLOSE, PLAN, W3, W4, W6} or W7 |
| Statement level: edge only for SAME and S rows (B2, B3, B4, B6, B8, B11, B13, B14, B15, B16, plus CLAIM-CLOSE at line 283; 17 pairs) | 7 (10 sets) |
| Statement level, 0b treated as a library option built first (no 0b edges) | 8 (6 sets), for example {0b, OUT, CGATE, CLOSE, REDO, PLAN, W2, W6} |

(c) Fixes left out of the base set of 7: 7 of 14. For {0b, CLOSE, REDO, PLAN, W3, W4, W6}: OUT (B4 with 0b; B6 with W3), CLAIM (B4; B6; B7 with CLOSE; B10 with W4), CGATE (B4; B3 and B8 with W3), W1 (B3, B12, B15 with W3; B10 with W4), W2 (B15 with W3; B13 with W4), W5 (B14 with PLAN; B16 with W6), W7 (B16 with W6). In no maximum set of the base: OUT, CLAIM, CGATE, W1, W2, W5 (6 fixes).

(d) Fixes that meet at each collision point: B1 2; B2 2; B3 3; B4 4; B5 5; B6 3; B7 2; B8 2; B9 2; B10 3; B11 2; B12 2; B13 2; B14 2; B15 3 (4 with E2); B16 3; B17 8; B18 2; B19 5; B20 2. Most: B17 8; B5 and B19 5; B4 4. Among code only: B5 5 (content), B4 4, then 3 at B3, B6, B10, B15, B16.
Pairs each fix collides in, in the base graph: CLAIM 7, W3 5, W1 5, CGATE 5, OUT 4, W5 3, 0b 3, W2 3, W4 3, W6 2, W7 2, CLOSE 1, PLAN 1, REDO 0.

## 5. Other files the fixes share

CONTRACT.md (r3:205-222). Separate sections, one fix each: 1.2 (W1), 2.1 (W4), 3.10 and 4 (W7), 3.12 (OUT), 3.20 (W6), 3.21 (CGATE), new 3.23 (OUT), 4.6 (OUT), 4.10 (CLAIM), `coord.json` (CGATE), class 17 (PLAN). Same section or text, several fixes: 1.4 (W1, W2, W3, W6; exit-code table, row split not stated); 3.6 lines 338-344 (OUT, CLAIM, CGATE, CLOSE; only CLOSE's row, line 341, is named); 3.9 (W1, W2, W3); 8.20 (OUT, CGATE); decision 20, line 1094 (0b, OUT, CLAIM, CGATE: one amended sentence); new decision 41 (W2, W3, W4, J point 1: one new decision). 3.20 is the thresholds format: r3 names only W6 there, though 8 fixes add keys.
Spec files (r3:228-242): lib.md 10 fixes (0b, OUT, CLAIM, CLOSE, PLAN, W1, W2, W3, W6, W7); status 9; watch 7; guard-hook 5; replace 4; stop 4 (with W6 B2); handover 3; briefs.md 3 (OUT, CLAIM, W3); fsck 2; selftest 2; commit, admit, render 1 each. The spec lists differ from r3 section 3 in two places: W3 is not listed under watch spec and 0b not under guard-hook spec.
Briefs: `coordinator.md` has five contributors, one list (B19). `child.md` and four helpers: OUT and CLAIM add separate lines (B20). `checker.md`, `reader.md`, `scorer.md`: no change.
Settings and profiles: `settings/coordinator.json`, `profiles/coordinator.json`: CGATE only (PLAN reads the profile). `deadman-task.xml`: W4 only. `settings/coordinator.json` must keep one PreToolUse entry (r3:194).
Tests: one file per script in `tcb/test/<script>.test.mjs`. r3 section 6 gives each fix its own test lines (52 tests by BS:179), so new tests are separate items, but the files are shared as the scripts are. The one existing test named: T56 in `tcb/test/lib.test.mjs:1794`, changed by OUT only (Q6a, r3:229). Tests that cross fixes by their subject: PLAN's total-table test crosses claim, start record, lease, Q5 (r3:242, 271); W3's test that a denied start leaves no `start.json` needs CGATE's file (r3:274); W4's dead-man test sits in `status.test.mjs` (J point 13); one joint model run with all fixes (r3:280).

## 6. What the record says about several writers of one thing

- `research-tree/RULINGS.md:33`: "Independent pieces start in one message. One writer per file." Lines 34-35 point to `research-tree/BUILD-PLAN.md` for the lane count; that file was not found anywhere in the repository.
- Harness design, `docs/program/HARNESS-V2-DESIGN-2026-11.md:66`: "Every slice declares: The files it will write: its footprint." Line 69, the definition of a collision: "Two slices collide if they write the same file, take the same shared thing, or one writes what the other reads without saying it needs it." Line 73: "Refuse a plan with two writers of one file, or more lanes than that." Line 74: "a slice starts as soon as what it needs is merged and nothing running collides with it." Line 75: "a branch that changed files outside its footprint is refused until the plan is amended." Line 62 lists "Gate workflow and merge queue" as a controller; line 77: the testbed's first limit was the root, which "reviewed and merged everything one at a time".
- `research-tree/BUILD-SIZE.md:96`: "Rule: two builders must not change the same file." Lines 132-136: "Splitting by file gives one owner per file ... That cut needs the function signatures between files ... fixed first; the sources name them ... but give no signatures."
- `research-tree/DESIGN-RECORD.md:158`: "Shared writes use one run lock, because a session can issue parallel tool calls and the watcher's intake runs at the same time". Line 159: "Single watcher per ce (singleton lock ...). Two coordinators are fenced by --ce".
- `research-tree/CONTRACT.md:172-175`, section 2.1 "Single writer of each path": every write below `run/`, `store/`, `plan/frozen/`, `completeness/` that is not exclusive-create happens under `run/run.lock`. Lines 1090-1093, decision 19: what two scripts share "is in lib" (this is why lib is the shared file). Lines 1094-1095, decision 20: "guard-hook writes nothing ... a hook that takes the run lock would stall every tool call" (r3:221 records that the fixes contradict it).
- `research-tree/SELECTIONS-MAP.md`: line 33, D2-05 "write-write conflicts, merged ledgers": Shared-nothing partitioning; "nothing enforces the partition but discipline; wall-clock merge misorders across sleep". Line 34, D2-06: Optimistic concurrency control (Kung and Robinson 1981); unique key with an atomic insert-if-absent. Line 56, D3-10: atomic exclusive create as the lock primitive; leases. Line 11, D1-01: leases and fencing by sequence number. Line 152: the record's own list says "no consensus, distributed locks or two-phase commit across sessions". Line 165, D1-11: "exclusive create (first writer wins)". Line 166: "Shared-nothing partitioning, one writer per folder". Line 168, D8-08: "one owner for a shared source, read-only users."
- These rows are about sessions writing run files at run time. A search of SELECTIONS-MAP for lock, exclusive, lease, split, merg, parallel, collision, optimistic, concurren found no row about several builders editing one source file, and "merging" in D2-05 means merged ledgers. DESIGN-RECORD section 8 (lines 150-163) and the plan-check paragraph were read in full and say nothing more on it.
- `FIX-JOIN.md:254-256`: lib.fence parts "disjoint: the callback at L:1774, and the charge at L:1782-1791"; `acquireLock` is touched by W7 alone, `withRunLock` by W3 alone. J part 2c (lines 345-365) lists 17 states or places that two or more fixes touch; part 11 (233-265) fixes the order of edits to `rowAct`, the fence hold and lib.

## 7. Limits

- r3 names places, not diffs. No fix is built, so "different parts of one function" says only that the named lines differ; neighbours (1773 and 1774, line 283, `MODES` and `ACTS` at 17 and 18) can still touch the same hunk in a line-based merge.
- No function found for: 0b's selftest hard-link check (no hard-link code in `selftest.mjs`); CGATE's PostToolUse mode; CGATE's `init` folders (r3:155 names no script; I used handover `RUN_DIRS`); W1's `.gitignore` (I used handover `GITIGNORE_LINES`; the run root's `.gitignore` is made by `handover init`, `spec/handover.mjs.md:25`); CLAIM's R5 timing sentence (r3:99, text, no code place); REDO's replace, status and stop places; the fsck checks of OUT and REDO.
- "tasks schema" (r3:96, 100) sits under lib in r3. I mapped it to `schemas/task-row.schema.json` (row is `additionalProperties: false`); F:566 lists it as its own item for CLOSE. If a lib function holds it instead, B18 moves into lib. `newAttempt` 1732-1735 and `writeTasks` 1665 are the lib candidates.
- CLOSE changes no lib.mjs function by F:565-567 (stop, schema, thresholds), but BS counts CLOSE in lib.mjs because r3 lists the rows under lib. That moves 4(a) from 3 to 4 or 5 (table in 4a).
- `--deadman` is a "mode" in r3:183 and a flag in W:118; B13 depends on which. W2's `realProc` change may be at call sites only, since `realProc` already takes `timeoutMs`.
- Not in r3 but implied: CGATE also reads `session_id` (F-P1a), so it shares CLAIM's `parseInput` change and `SID_RE` (F:263 uses CGATE's `SID_RE` in CLAIM); `session_tools` is mirrored in `selftest.mjs` `PROFILE_KEYS` line 63 and `profileShapeError` 302-319; PLAN's `zombieOver` (J point 11) would change `evaluate`'s call to `rowAct` at 558-563. None is counted.
- Counts depend on my grouping (one place per function or block). BS and r3 differ in file sets (W3 in watch spec, 0b in guard-hook spec); I used r3 section 3 for places and BS section 2 for the file-level count.
- The subset counts are brute force over 16,384 subsets of 14 fixes, one run per rule; the edge lists above are the whole input.
