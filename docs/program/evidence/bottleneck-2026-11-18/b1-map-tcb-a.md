# b1 map A: research-tree/tcb, where the decision rule (steps 0-6) would plug in
Read-only map. All paths are under `research-tree/tcb/`. Format: claim | path:line | quote (at most 15 words).
Nothing was run. "unit" in the rule = one session start here (a node of the tree is a Claude session).
Tests of these scripts (names only, in `tcb/test/`): admit.test.mjs, gate.test.mjs, check-queue.test.mjs,
cost.test.mjs. Also touching them: replace.test.mjs (calls decide), status.test.mjs, watch.test.mjs,
lib.test.mjs (slotCount, reservation), selftest.test.mjs, commit.test.mjs. README names static.test.mjs
(thresholds, cost inputs); no such file is in test/.

## 1. admit.mjs
F1. It admits ONE TASK (one attempt = one child session) to start now; it is a pure decision, reserves nothing.
admit.mjs:1,4 | "the admission decision of R10." / "It reserves nothing: the reservation is computed at each decision"
F2. The deciding function is `decide(facts)`; result `{admit, reasons, reservation}`; admit = no reasons.
admit.mjs:158 and :282 | "export function decide(facts) {" / "return { admit: reasons.length === 0, reasons, reservation };"
F3. Criteria, in order (each adds a reason code, all are evaluated, no short circuit):
1 state and deps (:164-172, wrong-state, dep-not-committed); 2 frozen protocol (:175, no-protocol);
3 completeness gate result and staleness (:180-195, gate-missing/gate-fail/gate-stale); 4 selftest for current tcb
(:198-206); 5 fsck newer than last write (:209-217); 6 slots (:220-233); 7 memory (:235-243); 8 token budget
(:245-259); 9 halted/draining (:262-263); 10 gate A before a review (:266-280).
admit.mjs:220 | "// 6. slots over live processes (R10, F6)"
F4. Slot rule: counts live + unknown + unconfirmed processes against a cap = min(N_max, N_ceiling, 3).
Numbers: N_max=2 and N_ceiling=3 (thresholds.json), HARD_CEILING=3 (constant in code, not in the file).
admit.mjs:17,230,232 | "const HARD_CEILING = 3; // R10: never above 3 live child processes" / "if (live + unknown + unconfirmed >= cap) add('slots-full'"
Where the slot counts come from: `lib.slotCount(rows, procList, transcriptsRoot)` at admit.mjs:470 (definition lib.mjs:3063);
procList is a PowerShell process list taken at admit.mjs:561-562 (check mode) or replace.mjs:851.
lib.mjs:3063 | "export function slotCount(rows, procList, transcriptsRoot, opts = {}) {"
F5. Memory rule: free_mb - reserve_mb - peak_mb x pending must still cover one peak. peak_mb=1200 (guess),
reserve_mb=1024 (guess), pending = sessions admitted/started with no live process (admit.mjs:472-490);
freeMb comes from `lib.edgeFacts(flags)` (admit.mjs:557; `--free-mb` overrides; real read is the OS free memory).
admit.mjs:236-243 | "freeMb - reserve - peak * pending < peak) {" then add('memory', ...)
One fixed peak for every unit (no per-class peak). No CPU, disk or check-capacity term exists.
F6. Token rule is a gate only when B_tokens is set. Reservation = spend of all attempts + max(0, e_task - spent) of open
rows (lib.mjs:3038). Refuse when B - reservation - r < e_task. B_tokens and r_tokens are null (owner) so it never refuses now.
admit.mjs:256-258 | "if (B - reservation - r < eTask) add('budget', { B, reservation, r, e_task: eTask });"
Spend is read from transcripts: `spentOfRows` admit.mjs:125, `attemptSpend` admit.mjs:118.
e_task is a per-row estimate in the task table (admit.mjs:257 `row.e_task`); where it is set: not in these files.
F7. Order/fit: none. admit is asked for ONE named task (`--task`) or loops over all runnable rows and reports each
(admit.mjs:572-579); it never picks which. The picking is the coordinator's (watch.mjs rowAct, F9 below).

## 2. gate.mjs
F8. gate.mjs gates ADMISSION OF THE WHOLE RUN on design completeness (not a slot or resource gate). Two modes: `cut`
writes the design cut; `check` decides pass/fail/not_run of the completeness gate and writes ledger kind `gate`.
gate.mjs:7-9 | "`check` decides whether admission may proceed: the matrix is full, every problem id has a row"
Pass needs: cut file hash, stpa/fmea/hazards outputs, protocol model pass (:386-390), owner action lines (:405-430).
gate.mjs:433 | "const result = F.size > 0 ? 'fail' : N.size > 0 ? 'not_run' : 'pass';"
When: run once by the coordinator (needs --ce, takes the run lock, gate.mjs:575-583); admit reads its last ledger line
(admit.mjs:~410-445, "gate" facts) at every start. Skipped for design-check tasks (admit.mjs:180).
Action lines (gate.mjs:405-430): every threshold with a `line` object is compared with `views/measures.json`; only
unverifiable_share_max and coverage_floor have one, both null, so they are readings today.
gate.mjs:405 | "// 7. the owner's action lines"
It holds no number about concurrency, memory or tokens.

## 3. check-queue.mjs
F9. "The check" here = the CHECKER: a separate model session that judges typed cards and citations (items with a snapshot
window and sentence). check-queue.mjs only BUILDS a batch (files in `queue/<batch>/`); it does not run the checker.
check-queue.mjs:1-11 | "builds one checker batch." / "The checker sees opaque i_ items and cannot tell a seed from a real item."
When a batch is due is decided by the watcher: class 14 when candidates >= batch_size (12) or candidates>0 with no active rows.
watch.mjs:539-541 | "if (cands >= batchSize || (cands > 0 && activeRows.length === 0)) conds.push({ cls: 14"
F10. How many at once: no limit of its own. One run holds the run lock (check-queue.mjs:477 withRunLock), so builds are
serial. Whether a checker session runs is under the same N_max slot rule as any task (F4).
check-queue.mjs:477 | "await withRunLock("
F11. Order: sorted by field, then card_id, then sid (string compare), then the first batch_size (12) real items taken.
NOT FIFO by arrival, NOT short-first. Seeds (<= 1 per class) added, whole batch then shuffled with a seeded rng.
check-queue.mjs:311,313 | "found.cands.sort((a, b) => byStr(a.field, b.field) || byStr(a.card_id, b.card_id)" / "if (real.length >= batchSize) break;"
check-queue.mjs:410 | "const order = r.shuffle(all);"
F12. Logs: one ledger line kind `queue` with `{batch, n, n_seeds, rng_seed}` (check-queue.mjs:467), batch id `b<ce>-<n>`
(:337), sealed key `sealed/seeds/<batch>.json` (:462). Waits recorded: NONE. grep for wait/fifo/lane/slot/concurren finds no
hit in check-queue.mjs. Item age, queue length over time and checker run time are not recorded here.
check-queue.mjs:467 | "await appendLedger(root, handle, { ctx, ce, kind: 'queue', data: w.ledger, now: edge.now });"
Only measure of the check in the tcb: cost.mjs from-transcripts (F13) counts tokens per role, not waiting time.

## 4. cost.mjs and cost-inputs.json
F13. cost.mjs computes TOKENS (never money), three modes: `compute` (model of hand-over interval k*, window W*, fan-out,
bulk load, concurrency N, admission factor, Smith order), `predict` (R53, tokens of the pilot over every arm),
`from-transcripts` (R52: unit costs measured from transcripts into plan/unit-costs.json). It is a FORECAST, not a budget;
the budget is B_tokens in admit (F6). Weighted tokens use ratios read 0.05, write 1.25, out 5 (thresholds.json weights).
cost.mjs:3-14 | "Tokens are counted, never money: the weighted figures use the dimensionless ratios"
Per node: unit-costs are built per role (buildRoles cost.mjs:735, buildUnitCosts :799), over session transcripts; marks
`trusted` only if unattributed share <= unattributed_share_max (0.1) (cost.mjs:877,939). Per model: not split by model.
F14. Concurrency in cost.mjs (block [6], the nearest thing to a "width"): Nmem = floor((free_mb - reserve_mb) / rss_mb);
N = max(0, min(N_cap, Nmem)); Amdahl speedup S(n)=1/(s+(1-s)/n) for s in {0.2,0.4,0.6}. Memory only; no CPU, token-rate or
check term. Output is a printed table; nothing reads it back (admit.mjs does not import cost.mjs).
cost.mjs:362-371 | "const Nmem = Math.floor((Cc.free_mb - Cc.reserve_mb) / Cc.rss_mb);"
cost.mjs:366 | "const N = Math.max(0, Math.min(Cc.N_cap, Nmem));"
Same formula repeated in predict at cost.mjs:551-555.
F15. cost-inputs.json inputs and their own tags (M measured, E computed, G guess, I illustrative; file's `_note` line 3):
- concurrency.N_cap=3 tag M "harness fact 1: at most three child sessions on this PC" (cost-inputs.json:217-221).
- concurrency.free_mb=4096 tag G "read by os.freemem() at admission" (:222-226) - a stand-in, not a measure.
- concurrency.reserve_mb=1024 tag G "owner sets"; concurrency.rss_mb=1200 tag G "peak resident size of one session; pilot measures" (:227-236).
- concurrency.s_sweep=[0.2,0.4,0.6] tag I "serial fraction ... pilot measures" (:237-246).
- coordinator: P=79000 M, g=2800 E (session windows grow 2.8k per call), S,hc,w,sigma G; child: P=60000 G, S0 G, sigma G, n=237 E, W_quality=300000 G.
- admission (z, cv2, m_owner, theta) G; order (per-field w and est) I.
So: memory per session is a GUESS (1200 MB), cpu and token rate are absent, token figures per call are partly measured (M/E).
cost-inputs.json:3 | "M = measured on the record; E = computed from measured numbers under a stated transfer; G = a guess"
cost-inputs.json:219 | "harness fact 1: at most three child sessions on this PC"

## 5. thresholds.json (66 lines; each entry `{value, unit, source, gate}`; `gate:false` = a reading; null = a reading)
F16. Keys read by the scripts in this map (path:line of the read):
- N_max 2 (guess, gate) admit.mjs:221,398; watch.mjs:554; status.mjs:494.
- N_ceiling 3 (guess, gate) admit.mjs:222,399.
- peak_mb 1200 (guess, gate) admit.mjs:236,400; status.mjs:496.
- reserve_mb 1024 (guess, gate) admit.mjs:237,401; watch.mjs:463 (memory alarm class 24); status.mjs:496.
- B_tokens null (owner, gate) admit.mjs:255,402,587; status.mjs:497-. r_tokens null (owner) admit.mjs:256,403,588.
- batch_size 12 (guess) check-queue.mjs:297; watch.mjs:539. window_words 200 check-queue.mjs:298.
- weights {read .05, write 1.25, out 5} (measured) cost.mjs:258,933; compare.mjs:508.
- unattributed_share_max 0.1 (guess) cost.mjs:939. W_quality 300000 (guess) commit.mjs:761 (pack cap), cost.mjs:134.
- W_star_coord 133200 (mapping D3-01) audit.mjs:460; watch.mjs:516. coord_over_factor 1.5 audit.mjs:461.
- soft_frac .8 / hard_frac .9 of e_task: watch.mjs:334-335; status.mjs:367-368. Z_frac .1: watch.mjs:436; status.mjs:369; stop.mjs:527.
- R 1, H_max 2 (replacements, hand-overs): lib.mjs:1742; replace.mjs:436. stop_verify_deltas 2: watch.mjs:556; stop.mjs:526.
- delta_ms 60000 watch.mjs:712; coalesce_ticks 2 watch.mjs:650; stall_calls 30 watch.mjs:331; hang_ticks 10 watch.mjs:332;
  loop_k 3 watch.mjs:333; W_cc_ticks 30 watch.mjs:469; alarm_ms 3600000 watch.mjs:757; intake_step_timeout_ms watch.mjs:814.
- f5_given false admit.mjs:272,396; unverifiable_share_max null admit.mjs:275,404; coverage_floor null render.mjs:580.
- lock_retries 300 check-queue.mjs:479, audit.mjs:87, certify.mjs:49, compare.mjs:757; transcripts_root admit.mjs:384,567;
  proc_exe admit.mjs:561, check-queue.mjs:475; user_files replace.mjs:855; tcb_paths_protected audit.mjs:266, guard-hook.mjs:440.
- w_chars witness.mjs:406; d0 seed.mjs:600; beta seed.mjs:601; plants_k seed.mjs:474; plants_t certify.mjs:71;
  blind_fail_rate compare.mjs:471; index_words commit.mjs:417; fetch_* snap.mjs:697-700; allow_loopback snap.mjs:699;
  hook_deadline_ms guard-hook.mjs:614; sleep_gap_ms render.mjs:594; lean_baseline_tokens/lean_tolerance_tokens audit.mjs:373;
  W_star_child watch.mjs:336-337; child_prefix_tokens, review_reserve_tokens commit.mjs:761.
- Not read by a script found by grep: seeds_per_class_per_call, proof_seed_share, fill_factor, replan_ratio, selftest_case_ms,
  s2_allowed, crossed_design_allowed, handover_measure (readings or later options).
gate.mjs also loops over ALL params (paramEntries gate.mjs:131) but acts only on those with a `line` object (F8).
thresholds.json:15-19 | "N_max": {"value": 2, "unit": "live child processes until memory is measured (design R10)"
Reader: `lib.thresholds(root)` lib.mjs:541-543 (get, isGate, line); admit has its own `thresholdReader` admit.mjs:45.

## 6. Where a unit starts and finishes; limits on how many run at once
F17. START path (one task = one session): coordinator runs `replace.mjs start` (modeStart replace.mjs:839); inside the run
lock it calls gatherFacts + decide (replace.mjs:880-881); refused -> exit 6 "deferred", retry on a later turn
(replace.mjs:884); admitted -> builds the attempt folder, row goes to step `admitted` (replace.mjs:918); `bind` records the
session id, step `bound` (replace.mjs:959 modeBind, :1004). The scripts never start the session; the coordinator does.
replace.mjs:880 | "const dec = decide(facts);"
README.md:12 | "No script starts, messages or stops a session, and none kills a process it did not start."
The watcher also decides WHEN to start: rowAct returns 'replace-start' when `!blocked && slotFree` (watch.mjs:139-140), where
slotFree = used < N_max (watch.mjs:554) using slotCount with an EMPTY process list (watch.mjs:549). Order of tasks: row order of
the task table; no fit or size rule (watch.mjs:558-561).
watch.mjs:554 | "const slotFree = used < num(th.get('N_max'), 0);"
F18. FINISH path: `commit.mjs` writes commit records and, when every required step has a commit, sets the row to `committed`
(commit.mjs:838-846); stop/park/cut/drop go through `stop.mjs` and `replace.mjs fence` (replace.mjs:400-425, lib.fence lib.mjs:1742).
A finished attempt frees its slot in slotCount once its stop is `confirmed` or the row is committed with no live process (lib.mjs:3070-3095).
commit.mjs:838 | "if (allDone(commits)) state = 'committed';"
There is no per-unit start/finish timestamp record used for width; ledger lines (`bind`, `commit`, `queue`) carry `now`.
F19. Existing limits on how many run at once (all count SESSIONS = tasks, none count helpers or tests or checks separately):
a) N_max = 2 until memory is measured (guess), N_ceiling = 3, HARD_CEILING = 3 in code. admit.mjs:230-232, thresholds.json:15-16.
b) Memory term: free - reserve - peak x pending >= peak, one flat peak of 1200 MB. admit.mjs:240-243.
c) Memory floor alarm (watcher class 24): free < reserve_mb. watch.mjs:463-466.
d) Token budget B_tokens - reservation - r >= e_task, null today = no limit. admit.mjs:255-258.
f) Draining/halted block every start. admit.mjs:262-263.

## 7. Smallest place a per-resource width could plug in
F20. Width per resource, min over resources, replaces the single fixed cap in admit `decide` step 6 and the memory term of step 7.
File admit.mjs, function `decide` (:158), lines 220-243. Replace `cap = min(nMax, nCeil, HARD_CEILING)` (:230) with
`width = min over resources (memory, cpu, tokens, check)` computed from facts; `slots-full` (:232) stays as the refusal when
live + unknown + unconfirmed >= width. The memory width already exists in form: floor((free - reserve)/peak) = cost.mjs:362.
Needs new facts in `gatherFacts` (admit.mjs:377, `facts` object :494-513): per-class measured peak/cpu/tokens, free cpu.
Keep HARD_CEILING 3 as the outer limit (owner's ruling, README of harness: three at a time).
F21. Step 0/1 "measure each class of unit": plug into cost.mjs `from-transcripts` (runFromTranscripts :922, buildRoles :735,
buildUnitCosts :799, output plan/unit-costs.json). It already makes a per-role unit cost in tokens; it has no peak MB, cpu or
duration per role. Add them there (written once, replaces the G-tagged `child.P`, `concurrency.rss_mb` in cost-inputs.json:222-236),
and have admit read the file instead of the flat peak_mb. Sample for memory: `lib.realProc` process list already read at admit.mjs:561.
F22. Step 3 "gate only, hold new units": already the shape of admit (refuse with exit 6 "deferred", replace.mjs:884). Nothing
stops running work except the watcher's class-24 alarm (watch.mjs:463), which is the "memory at its floor" case of the rule.
Plug: thresholds `peak_mb`, `reserve_mb`, `N_max` become the fallbacks when no measured width exists (thresholds.json:15-18).
F23. Step 4 "next unit by fit": plug in the watcher, `rowAct` (watch.mjs:135) and the loop at watch.mjs:557-561, which today starts
the first row in table order that satisfies `slotFree`. Replace slotFree (:554) with a call to the same width function as F20 and
order candidates by fit and (for checks) shortest first. check-queue.mjs:311 sort is by name, not by length.
F24. Step 5/6 "cross-check with the check's wait": plug in check-queue.mjs main (:431) and its ledger line (:467): add queue
age and batch wait there (none recorded today, F12); the watcher's class-14 test (watch.mjs:541) is where "the check is the
bottleneck" would be read. check-queue.mjs is the only file that knows the checker's queue; admit.mjs has no check term.
F25. Not found in tcb scripts of this map: any lane, any per-unit-class capacity, any CPU measure, any token-rate (5-hour or weekly)
limit, any recording of how long a unit waited. grep words lane/slot/capacity/width/concurren/parallel found only: slotCount,
slots-* reasons (admit, lib, watch, status), and cost.mjs `concurrency` (F14).
