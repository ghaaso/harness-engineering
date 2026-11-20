# PILOT-PLAN: the pilot's plan and token cap (slice 3, r57-0519), version 2

Version 2, 2026-11-20: the blind review `research-tree/build/refute/PILOT-PLAN.md` ("CORRECT: 14 findings") folded in
as the top session decided each finding (r57-0021; brief `research-tree/build/briefs/PILOT-PLAN-fold.md`), by a helper
of top session 2 (kind analyse, Opus). Version 1 was written the same day from `briefs/PILOT-PLAN.md`. Nothing was
started for either. Marks: [m] measured, [r] read, [c] computed (formula shown), [e] estimate. "Finding n" = the
review's finding n. Tokens = input + cache creation + cache read + output, once per message id (as
`research-tree/build/tools/tokens-self.mjs`). "E 1a" = `research-tree/build/check/E-tokens.md` section 1a. "Version 1's
count" = counted by version 1's helper from the transcripts of the harness and product folders with the same rule.
Version 2's figures: script `pilot-plan-fold/calc.mjs` in the session scratchpad.

## 0. The answer

1. **When** (ORCHESTRATION s4's gate, section 3). This week's all-models room, after his protected use to the reset, is
   4.3 points [c] (3.5 at 10:24 UTC, section 3). The preparation needs 2.9, at most 3.8 at its cap: it runs this week. The pilot needs 3.6-5.6 more: it does
   not fit, and it starts from the reset, 2026-11-23 12:00 UTC.
2. **Preparation** (nodes 1-6): P3.1, P3.2, the run root with the model result gate.mjs reads, the pilot's inputs
   drafted, and a fix round of three builder units on `build` (children's models and the tier hook, the scorer, S1 and S2's role).
3. **Pilot** (nodes 7-21): a Fable coordinator he opens in the run root, ten child sessions, Sonnet readers, checkers, scorer.
4. **Tokens.** Expected **418 M** [c]: preparation 179, pilot 239, of it Fable 94. Cap **593 M**, every node at its Q3:
   preparation 226, pilot 367 (findings 1, 2, 6, 10).
5. **Lines.** Preparation: the all-models meter to at most **85 %** (from 81 % at 10:24 UTC; 84 % at the 09:15 reading), no Fable. Pilot, above the readings at its go: all
   models +7 points if a Fable token weighs one Opus token, **+9** at two; Fable +26, at most **+33**.
6. **Time** [e]: preparation 3-4 h; pilot 8.5-13.8 h of sessions plus drains, with 37-58 turns he types.
7. **Asks** (section 6): two now (the preparation, the cap), three later (the inputs, deny rules and dead-man task, the go).

## 1. The nodes

Run root [e]: `C:/Users/User/Documents/projects/research-runs/pilot-2026-11/`, outside every repository, its own git
repository with no CLAUDE.md (protocol v2 layout). The protocol's example `C:/research-runs` is not writable here
[m: `build/facts/FP12.md`]. Attempt folders are `<run root>/wt/<task>-e<e>/`. A child session starts only on a turn
the owner typed (r57-0109; coordinator brief place 6). Expected = median (Q1-Q3); limit = Q3 + 1.5 IQR [c]; where
n is 1 or 2 the spread is +-50 % [e] and the limit 3 times the expected, as ORCHESTRATION's probe row.

| # | Node | Role, kind, model | Started by; folder | Expected, M tokens [mark, source, n] | Limit, M |
|---|---|---|---|---|---|
| 1 | P3.1: stop a session that has helpers, watch 2 delta that no transcript grows (F-P10a) | test, Haiku; two Haiku helpers | top session on an owner-typed turn; a scratch folder outside every repository, with the tier hook (r57-0026; `tools/ensure-tier-hook.sh --force`, r57-0122) | 5.8 [m: the nesting probe, a Haiku test with two helpers, ORCH s13 row 11, n=1] | 17.4 |
| 2 | P3.2: section 10's "Files" and "Before the go" counted against `tcb/` (the 25 scripts are already counted) | locate, Haiku | top session's helper; main checkout, read only | 0.83 (0.57-1.13) [m: E 1a extract/haiku, n=26] | 2.0 |
| 3 | Run root set-up: folder, git, `tcb/` copied from the pinned commit, `plan/`, `run/`, `wt/`, tier hook, and `completeness/model/result.json` written from the slice-2 model results (`result` "pass", `sha`), the only file gate.mjs reads for the model, with no binding to a commit (gate.mjs:375-390; finding 14) | run, Sonnet | top session's helper; the run root | 1.41 (1.28-1.82) [m: E 1a run/sonnet, n=15] | 2.6 |
| 4 | Pilot inputs: the field (from the direction file's lanes), question list, approach ids, protocol draft, analysis plan with `cost.mjs predict`, plant candidates, cost inputs from this file (`B_tokens` 172 M, `r_tokens` 15.3 M, section 2) | analyse, Opus | top session's helper; writes the run root's `plan/` | 8.05 (4.94-10.39) [m: E 1a analyse/opus, n=19; the build's analysers 9.1 and 26.9, r57-0173] | 18.6 |
| 5 | Fix round FX-PILOT on `build` (section 4): three units, one per code fix (gaps 1-3); gap 4's two values ride in unit 3 | each unit a builder (build-invariant, Opus) and one blind refuter (Opus); landing and suite 7 | top session; worktrees under `.claude/worktrees/`, landing in `hb`, as in the build | **142.7 (99.5-171.8)** [c: 3 x (builder unit 32.3 (18.5-38.0) + refuter 10.6 (10.0-13.4)), r57-0173 medians, n=16 each, + a root's share 14, Q3 17.6 (FX-W6, r57-0169; root 3, r57-0170); three units [e]; finding 6] | builder 67.3, refuter 18.5 a unit [c: Q3 + 1.5 IQR of r57-0173; finding 7] |
| 6 | Top session's turns for the pilot (starts, P3.1's stop, approvals, the owner's page) | orchestrate, Opus | the owner; main checkout | **20.5 (14.6-32.3)** [c: 5 started units x 4.10 M (2.91-6.45), the median and quartiles of the build's three roots' cost per started unit, 1.72, 4.10 and 8.80 M (r57-0170, n=3); finding 2] | 59 |
| 7 | Coordinator | orchestrate-deep, **Fable** (r57-0035: T's readers make its children have children) | the owner opens it in the run root (R12). The start tool takes only the caller's model or a cheaper one [r: its own text], so the Opus top session cannot start it on Fable | **94.3 (66.9-148.4)** [c: about 23 started units [e] (10 sessions, 9 checker batches, the scorer, 3 for script steps) x 4.10 M (2.91-6.45), n=3 roots; the roots were Opus in the main checkout (r57-0171), this is Fable in a lean folder; finding 2] | 270 (finding 2); hands over at W*_coord 133.2 K by the drain (R12): 17-38 successors [c, section 2; finding 8] |
| 8 | Control (the lean first-call baseline) | test, Haiku | coordinator; `wt/control-e1/` | 0.62 [m: E 1a Haiku main sessions, n=2] | 1.9 |
| 9 | Canary (selftest, R41) | test, Haiku, with one reader | coordinator; `wt/canary-e1/` | 0.75 [c: 0.62 + 0.13, E 1a test/haiku, n=2] | 2.3 |
| 10-12 | STPA, FMEA, mapper on the design cut | analyse, Opus | coordinator; `wt/<task>-e1/` | 8.05 (4.94-10.39) each [m: n=19] | 18.6 each |
| 13 | T: the research child, form (a), to the research line, then pack A | orchestrate, Opus (it starts readers) | coordinator; `wt/T-e1/` | 12.84 (10.54-16.83) [m, version 1's count: Opus main sessions that reached 300 K with no compaction before, n=6; Opus helpers 12.31 (8.55-16.56), n=55] | 26.3 (the line stops it first) |
| 14 | T's readers | collect, Sonnet | T | **31.9 (27.0-36.9)** a field [m: the collect helpers of round 3's four lanes counted per field, n=4, the review's spot-check (version 1's seven sessions, 30.19, are these four fields); finding 10] | 51.8 together; 7.4 each (E 1a collect, n=49) |
| 15 | R_same: the review in T's window | T's window | none | 9.9 (6.3-17.8) [c: 30 calls (20-45) [e] at about 330 K; Q3 = about 55 calls, where Opus compacts at 368 K] | the compaction point |
| 16, 17 | S1 and S2: one session each, no fan-out, with the readers' search and fetch (the single-session role, section 4) | analyse, Opus | coordinator; `wt/S1-e1/`, `wt/S2-e1/` | 12.84 (10.54-16.83) each [m: n=6, as T] | 26.3 each |
| 18, 19 | R1 and R2: fresh reviews of pack A | refute, Opus | coordinator; `wt/R1-e1/`, `wt/R2-e1/` | 10.23 (6.42-16.60) each [m, version 1's count: the refuters of six research sessions of 2026-11-18/19, n=6; the build's refuters 10.6 and E 1a's analysers 8.05 agree] | 31.9 each |
| 20 | Checkers, batches of 12 items | read, Sonnet | coordinator | 16.1 (9.6-42.1) [c: 9 batches (6-11) [e] x 1.79 (1.07-4.68), E 1a read/sonnet, n=13; in the cap every batch at its Q3, finding 1] | 10.1 a batch |
| 21 | Scorer | read, Sonnet | the coordinator, once unit 2 has landed (today no node can start it, section 4) | 1.79 (1.07-4.68) [m: n=13] | 10.1 |
| - | Scripts (admit, replace, watch, status, commit, harvest, snap, witness, check-queue, promote, certify, seed, gate, protocol-freeze, compare, cost, render, audit, fsck, selftest) | no model | the coordinator's calls | in node 7 | - |

**Commit.** The scripts run from the run root's pinned `tcb/` at the commit the fix round's last unit lands on `build`
(today 96bc34cc); the go message names it (protocol v2 s10). The merge of `build` (r57-0520) is not needed before the
pilot: the commit stays reachable on `build`, and fsck checks the pinned copy against the named commit. It stays open.

## 2. The computation

- **Expected** = sum of the expected column: preparation (nodes 1-6) 179.3 M, pilot (7-21) 238.5 M, all **417.8 M**
  [c]. Fable 94.3 M (node 7); all others 323.5 M.
- **Fully correlated overrun** = sum of (Q3 - median), every node, unit and batch at its Q3 together = 175.1 M [c]:
  preparation 46.8 (the fix round's 29.1 the largest part), pilot 128.3 (the coordinator's 54.1 and the checkers' 26.0,
  9 x 2.89, the largest parts; finding 1).
- **Cap** = expected + fully correlated overrun = the sum of the Q3s = 417.8 + 175.1 = **593 M** [c]: preparation
  226.1, pilot 366.8. If 2.11 M a started unit were kept as the coordinator's and top session's expected (48.5 and
  10.6 M) with the quartiles above, the expected would be 362.1 M and the overrun larger by the same 55.7 M: the cap
  is the same 593 M (finding 2).
- **Pooled reserve** (ORCH s3, critical chain) = sqrt(sum of spread^2) = 60.2 M [c]: 19.5 M for the preparation, held
  by the top session; 56.9 M for the pilot, of which the rows' 15.3 M is admit.mjs's margin `r_tokens` (R10), and the
  coordinator's, the checkers' and the scorer's 54.8 M are held by the coordinator against the cap.
- **admit.mjs's B** is the rows' share, not the cap (finding 5): `B_tokens` = the rows' expected 126.3 + their
  overrun 45.3 = **172 M**, `r_tokens` 15.3 M [c] (rows: control, canary, STPA, FMEA, mapper, T with its readers and
  R_same, S1, S2, R1, R2; finding 10's readers included). admit.mjs refuses a start only when B - reservation - r is
  below the row's `e_task` (admit.mjs:253-257); the coordinator, its checkers and its scorer are helpers, not rows, and
  the preparation is outside the run root. The cap is held by the top session and the coordinator from usage readings.
- **All-models points** at 62 M a point (59-66 M, r57-0170, a mix of 96 % Opus): preparation expected 2.89
  (2.72-3.04), at its cap 3.65 (3.43-3.83); the pilot without Fable expected 2.33 (2.18-2.44), at its cap 3.52
  (3.31-3.70) [c].
- **Fable on that meter** (finding 3). By price a Fable token is 1 to 2 Opus tokens (G-models: input 8 against 4 and
  output 40 against 20 dollars per M, cache reads 0.20 both), about 1.5 at the Fable mains' mix (E-tokens.md:194). The
  coordinator then adds 1.52 to 3.04 points expected and 2.39 to 4.79 at its Q3 (148.4 M). The only measured bound,
  0.105 points per M if Fable alone had moved the meter (E-tokens.md:246; Opus 0.047 by the same bound), gives 15.6 at
  its Q3. E 4c's fit is "not a result" (E-tokens.md:281); whether Fable moves this meter at all is open (r57-0514).
  The pilot then takes 3.85 (Fable at one Opus token) to 5.37 points (at two) expected, 3.6-5.6 over 59-66 M a point,
  and at its cap 5.92-8.31 at 62 M a point, **6.2-8.7** at 59; 19.3 at the measured bound [c].
- **Fable meter** at 5.7 M a Fable point (4.6-7.6 M, one interval, r57-0170): the coordinator expected 16.5
  (12.4-20.5), at its Q3 26.0 (19.5-32.3), at its limit 270 M 47.4 (35.5-58.7) [c].
- **Coordinator sessions.** One coordinator session from start to hand-over at 133.2 K costs R + nF + g n^2/2 with
  n = (W* - F)/g (ORCH s5): 2.40-5.24 M at F 70-90 K, R 0.3 M, g 1.3-2.3 K [c]. 94.3 M is then 18-39 sessions:
  **17-38 successors**, each on a turn he types (r57-0109); 8-19 at version 1's 48.5 M (finding 8).
- **Check against the build**: it used 2.3 times its plan and 1.58 times its cap (907.7 against 397 and 576 M,
  r57-0170). At 2.3 this plan would need 961 M, but the fix round's units and the coordinator's and top session's
  rates are already the build's measured figures, so that ratio would count part of the overrun twice. The cap stops
  starts at 593 M first, and the coordinator asks `cap:` (r57-0038). T, S1 and S2 are bounded by their window line,
  the readers by T's window and R_same by compaction; the open-ended node is the coordinator.
- **Time** [e]. Preparation 3-4 h: three fix units of about 1 h (FX-W6's round took 53 min [m]) one after another,
  beside nodes 1-4; then his approvals. Pilot: critical path design checks 1-1.5 h; T 4.8-5.3 h [m: round 3's
  collecting sessions in three lanes, a1 1.2 h whole, n=4 fields; finding 10]; R_same 0.5 h; R1 and R2 0.5 h
  (refuters 14-24 min [m]); scorer and comparisons 0.3 h: 7.1-8.1 h [c], times 1.2-1.7 (the build: 15.1 h against
  9-13 h planned [m]) = **8.5-13.8 h** (version 1's 7 h gives 8.4-11.9 h, finding 11). S1 then S2 run in the second
  slot beside T (N_max 2); if together they run past T, they set the path. Longer with drains: each of the 17-38
  hand-overs holds starts until a quiet point (R12). Plus his delay on **37-58 typed turns**: 10 child starts, 17-38
  coordinator successors, 10 relayed closes (finding 8).
- **What it rests on**: one build's three roots, research sessions of 2026-11-18/19 in this repository, one week's
  meter (r57-0015, r57-0028). A basis for this estimate, not a law.

## 3. The gate for each part (ORCHESTRATION s4)

- **Readings.** 80 % all models, 53 % Fable at 2026-11-20 about 09:15 UTC; both reset 2026-11-23 12:00 UTC, 74.75 h
  away. The gate at every start: the meter now + the reserve of running units + the unit's expected stays at or under
  100 - the protected later demand to the reset, on each meter, and under the part's line; held units start at the
  reset, the oldest first. It protects later demand and spends the rest at once while the queue fits.
- **Protected later demand to the reset.** All models: his top sessions at 0.21 points an hour [m: Q37, 71.7 h, the
  gate's rate in ORCH s4] = 15.7 points. Fable: his own Fable use, 22.8 M in 15.1 h = 1.51 M an hour [m: r57-0170;
  finding 4] = 112.9 M = 19.8 Fable points (14.9-24.5).
- **Room this week** = 100 - reading - protected [c]: all models **4.3 points**; Fable 27.2 points (22.5-32.1), that
  is 155 M of Fable (103-244).
- **Preparation (nodes 1-6: Opus, Sonnet, Haiku, no Fable): runs this week.** Expected 2.89 points, at its cap 3.65
  (3.43-3.83): both fit in 4.3. Line: the all-models meter at most **84 %** (80 + 3.83) [c], under the protected line
  (84.3 % at 09:15, rising 0.21 an hour). The Fable meter is not touched.
- **At the asks (10:24 UTC, top session).** The meter read 81 % all models, 53 % Fable; 73.6 h to the reset, protected
  15.5 points, room 3.5 points [c]. The preparation's line by the same rule: 81 + 3.83 = 84.8, so at most **85 %**;
  until about 12:30 UTC the protected line (84.5 % at 10:24, rising 0.21 an hour) is lower and binds at each start.
  The pilot's expected still does not fit (at most 0.6 points left after the preparation): from the reset, as below.
- **Pilot (nodes 7-21): from the reset of 2026-11-23 12:00 UTC.** After the preparation this week's all-models room is
  0.5-1.4 points (4.3 less the preparation at its cap or its expected); the pilot's expected, 3.6-5.6 points, does not
  fit, so its first start is held to the reset. On the Fable meter alone it would reach 89 % expected and 99 % at its
  Q3 this week (finding 4). In the reset week the room is 100 - 0.21 x 168 = 64.7 all-models points and 100 - his own
  1.51 M x 168 h = 55.5 Fable points (44.9-66.6), 316 M of Fable (206-506) [c]. The pilot at its cap fits both:
  6.2-8.7 all-models points (19.3 at the measured bound) and 26.0 Fable points (19.5-32.3). Lines, above the readings
  at its go: all models **+9 points** (+7 if a Fable token weighs one Opus token), Fable **+33** (its Q3 at 4.6 M a
  point). The coordinator's own limit, 270 M (47.4 Fable points at 5.7 M, 58.7 at 4.6), lies above the Fable line: the
  gate holds its successors at the line, and it asks `cap:` (r57-0038).

## 4. Before the pilot or measured in it (quality first; a fix only where a result would be wrong or lost)

**Fixed before, in one fix round of three units (node 5, 142.7 M).** Found by version 1 [r], corrected by the review
(finding 6); none is on the End list.
1. **Unit 1: models of children and helpers.** The start act names no model (`briefs/coordinator.md`:129-138), so
   every child inherits the coordinator's Fable (the start tool: "Omit to inherit yours"). The agent files name none, so
   readers and checkers inherit their caller's (r57-0108). The tree's settings carry only its guard hook (`tcb/settings/*.json`),
   against r57-0025 and r57-0026. The tier hook (`.claude/hooks/tier-hook.mjs`:2-5) refuses every helper or session
   start without a kind at the head of its description or title and an explicit model, while `spec/briefs.md`:10 and
   :36 (T4) forbid a model name or the word "tier" in any brief. Fix: the model reaches the coordinator through the
   row's `tier` (already in rows and the manifest, replace.mjs:31, :334, :895) and the status `next` act, and T's
   readers through T's manifest, never through a brief; the start act and both Agent starts carry the tier route's
   kind and model; the tier hook files go into `tcb/` (fsck, selftest) and into every settings template.
2. **Unit 2: the scorer cannot be started.** It has a brief but no agent file, and the coordinator may start only
   checkers (`profiles/coordinator.json` agent_types; refused at `guard-hook.mjs:437`, `:597`). Comparison 1's
   blinding check needs it. Fix: `tcb/agents/scorer.md` (Read only); `profiles/scorer.json` (guard-hook.mjs:440 loads a
   helper's profile and denies `profile-missing`, :254-261); `scorer` in the coordinator's agent types; `Agent(scorer)`
   in `settings/coordinator.json`:29.
3. **Unit 3: S1 and S2 as single sessions.** On the child profile a row gets readers (replace.mjs:726, :771-772;
   `profiles/child.json`:29), so S1 would fan out, against protocol v2:729-730; without readers it could not search
   (WebSearch denied, fetch witnessed, `briefs/child.md`:17). Comparison 1 is the tree against one session doing the
   same job (R39). Fix: a new single-session role in TASK_ROLES (guard-hook.mjs:27) with its own profile (the readers'
   search and fetch, no helpers), settings file and brief line.
4. **In unit 3: two values computed from measurements** (`tcb/thresholds.json`):
   - `W_quality` 300 K -> **280 K** for T, S1 and S2 alike [c: Opus compacts at 368 K (r57-0107), minus R_same's growth
     48 K (30 calls x 1.6 K, refuters' growth, E 1b), minus a 10-call margin at 3.8 K (ORCH s5)]. A compaction
     mid-review would leave R_same no longer holding the field, which Comparison 2 tests.
   - `attempt_max_ticks` 240 (4 h, a placeholder) -> **630** (10.5 h) [c: research sessions' wall time 1.2 h
     (1.1-4.85), n=7, Q3 + 1.5 IQR, delta 60 s]; it stays above every field of round 3 (6.0 h at most, finding 10).
     The coordinator cannot judge progress (r57-0522 (2)), so a 4 h cap could end an honest T and lose its field.
   - `W_star_coord` stays **133.2 K**: the mapped default (protocol s12), which the pilot measures; it is not a
     computed value. Its inputs, F 70-90 K, R about 0.3 M, g 1.3-2.3 K, give 98-127 K by W* = F + sqrt(2Rg) (ORCH s5;
     finding 9), and the cost curve is flat there.

**Why three units.** The build ran one fix per builder unit (n = 16, 32.3 M, r57-0173). Gaps 1-3 change different
scripts and files, gap 1 the most (the start act, status, the manifest, the hook files and every settings template);
gap 4 is two values, not code. Two fixes in one unit would be a unit size the build did not measure; the review's low
end, 100 M, is that case. The units land one after another, since units 1 and 3 both change the settings templates.

**Before, in the run root's set-up (node 3).** `<root>/completeness/model/result.json` with `result` "pass" and the
`sha`, written from the slice-2 model results: gate.mjs:375-390 reads only that file (finding 14).

**Before, by the owner (`approve:`).** The user-level deny rules (protocol v2 s10). The dead-man task
(`tcb/settings/deadman-task.xml`): never imported (slice-1 report); it is how a stuck attempt reaches him (FX-W4, FX-W6).
The exception to CLAUDE.md rule 3 (finding 12): the pilot is an experiment run on this PC with the network on, outside
a container, because its readers use the web and its sessions run in the desktop app; without his approval it does not run.

**Before, observed.** P3.1: whether `stop_session` and `archive_session` end a session and its helpers (F-P10a, cut 3's
last app check). If they do not, R9's fallback holds: the owner ends the process.

**Measured in the pilot, not fixed before.**
- r57-0521 (1) test gaps (code right), (3) words, (4) CLAIM's millisecond window (a decided gap, reachable only under
  reading (ii) of the lease, S2.4): after the pilot, one round (r57-0417). (2) The flaky stop test reads the real
  process list inside a test: not a fault of the code; if suite 7 fails it, it runs once more alone (ORCH s13 row 6).
- r57-0522 (1) "answer the child" is refused: an idle child still reaches `stuck` and the owner; the pilot counts
  idle children (`idle_ticks` 30, a guess). (2) and (3): with the computed age cap, the pilot measures T's length and
  the tick rate before a continue act is designed.
- Slice 2's pilot facts: whether a refused start leaves `start.json`; the lease's two delays; the app's session id
  against the CLI's (until then the owner relays each close); B1's deadlines; coordinator turns against the dead-man
  (89 turns over 60 min measured: false toasts are expected).
- Section 11's parameters: c, h, delta, peak memory of a session (N_max stays 2), tokens per meter percent, coordinator
  calls per field, the owner's start latency; and the coordinator's F, R and g behind W*_coord.

**Section 12's options.** At default: F1 (a), the pilot writes both reviews; F2 none; the research child's window (a)
(line above); F3 none (privacy, CLAUDE.md rule 4); restart limit 1; hand-over by the drain at 133.2 K (the mapped
default, finding 9); sleeps accepted; N_max 2; thresholds at their mapped defaults (d0 0.8, beta 0.05), unmapped ones
readings; a failed hook test stops the run; hand-over measured by token count. Derived, not default: **S2 on** (section
12: without it "every difference reads no difference shown", so Comparison 1 could not change what is done next,
r57-0033; 12.8 M). **F5 on**: without snapshots every card is unverifiable and no certificate passes, so neither
comparison's primary measure can be scored; pdftotext is already on the PC (r57-0110), so nothing is installed. His
own: the go, the cap (F4), the approvals of the question list, approach ids, protocol and analysis plan.

## 5. Not known

- The meter's per-model weights: whether Fable moves the all-models meter at all (r57-0514); by price 1 to 2 Opus
  tokens, the measured bound 0.105 points per M. 62 M a point holds for one window of 96 % Opus. If a Fable token
  weighs more than an Opus token, his own protected rate rises too, since his top sessions are Fable mains (finding 3).
- His own rate to the reset: 0.21 points an hour over 71.7 h (Q37), 0.10 over the build's 15.1 h (r57-0170); the
  gate keeps 0.21.
- The coordinator's cost per started unit: three Opus roots in the main checkout, 1.72-8.80 M (n=3); the coordinator
  is Fable in a lean folder handing over at 133.2 K. Its calls per started unit (8.5 for the build's roots), its F and
  R, how many drains there are and how long they hold starts while T runs: the largest spread here, and its
  successors and his typed turns move with it.
- The fix round's units: three [e]; 100 M if two fixes shared one (finding 6).
- T's number of readers and cards (bounded by T's window), the checker batches (9 [e]; 11 would add 3.6 M expected and
  9.4 M to the cap, 602 M), and R_same's calls.
- A session's peak memory; whether Fable ranks above Opus for the start tool.
- Whether agent files bind in the run root's sessions (the canary shows it), and whether `snap.mjs` uses pdftotext
  (P3.2 counts it).
- One field, chosen, not drawn: nothing it shows generalises (protocol v2 s13).

## 6. The owner's asks

- **now** `approve:` the preparation: P3.1, P3.2, the run root at `C:/Users/User/Documents/projects/research-runs/pilot-2026-11/`, the draft of the pilot's field, questions, approach ids, protocol and analysis plan, and one fix round of three units committed on `build`.
- **now** `cap:` 593 M tokens: the preparation's 226 M this week, the all-models meter from 81 % to at most 85 %; the pilot's 367 M from the reset of 2026-11-23 12:00 UTC, at most 9 all-models points and 33 Fable points above the readings at its go.
- **later** (when the draft exists) `approve:` the pilot's field, question list, approach ids, frozen protocol and analysis plan as drafted.
- **later** (before the go) `approve:` you apply the user-level deny rules (`tcb/settings/user-deny.json`) and import the dead-man task (`tcb/settings/deadman-task.xml`) on this PC.
- **later** (at the go, from the reset) `approve:` the go for P3.3 from the run root at the fix round's commit, an experiment run on this PC with the network on and outside a container (an exception to CLAUDE.md rule 3, since its readers use the web and its sessions run in the desktop app; without it the pilot does not run): you open the coordinator there on Fable and type about 37-58 turns, and page snapshots are downloaded into the run root (about 60 MB a field: round 3 kept 240 MB for four lanes [m]).

## Changes from version 1

1. Checkers' overrun at every batch's Q3, 9 x 2.89 = 26.0 M, not 8.7 (finding 1).
2. Coordinator and top session at the median of the build's three roots, 4.10 M a started unit (2.91-6.45, n=3):
   94.3 M (66.9-148.4, limit 270) and 20.5 M (14.6-32.3, limit 59); the cap is the same with 2.11 kept (finding 2).
3. Fable on the all-models meter at 1 to 2 Opus tokens by price, with the measured bound; the "0 to one Opus token"
   range and E 4c's 0.3 dropped; the line at both ends (finding 3).
4. The Fable meter counts his own Fable use to the reset; the Fable line, not the coordinator's limit, holds its
   successors (finding 4).
5. admit.mjs's B is the rows' share, 172 M with r 15.3 M (168 and 14.8 in the review, before finding 10's readers);
   the cap is held by the top session and the coordinator (finding 5).
6. The four gaps as the review corrected them; the fix round is three units, 142.7 M, not 56.9 (finding 6); node 5's
   limits from measured units, builder 67.3 and refuter 18.5 M (finding 7).
7. Coordinator successors and his typed turns recomputed at the new 94.3 M: 17-38 and 37-58. Finding 8's 8-19 and
   28-39 are the same formula at version 1's 48.5 M.
8. W*_coord stays 133.2 K as the mapped default the pilot measures; its inputs give 98-127 K (finding 9).
9. Readers per field, n=4: 31.9 M (27.0-36.9), limit 51.8; T near 5 h (finding 10).
10. Time: version 1's 7 h x 1.2-1.7 is 8.4-11.9 h; with T near 5 h, 8.5-13.8 h (finding 11).
11. The go ask states the exception to CLAUDE.md rule 3 (finding 12).
12. One cap, one line per meter; the gate puts the preparation this week and the pilot from the reset (finding 13).
13. gate.mjs's model result moved from "Not known" to node 3's set-up (finding 14).
14. Totals: expected 274.6 -> 417.8 M; cap 404 -> 593 M; preparation's line 84 %; the pilot +7 to +9 all-models and at
    most +33 Fable points from its go.
15. At the asks (10:24 UTC) the meter read 81 %: the preparation's line recomputed by the same rule, 85 % (section 3),
    and the `cap:` ask changed to match (top session).
