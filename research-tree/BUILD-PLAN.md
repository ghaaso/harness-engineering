# BUILD-PLAN: task r57-0507 (the 13 fixes and 0b, the R57 model check, the pilot)

Written 2026-11-19 by a planning session (journal prefix `bp`) from the files named in each row. It is an input to the orchestration document, not the document. Edited the same day
by task r57-0517 to agree with `research-tree/ORCHESTRATION.md`, which plans the build's tree, tokens, windows,
hand-overs, limits, widths and testing (r57-0034): sections 0, 1 and 3 to 8 were rewritten; in section 2 the opening
paragraph, P0, five models, the order lines and the S2.1 and S2.3 rows changed; the slices and the units did not
(ORCHESTRATION section 10); the review of r57-0004 was folded in the same day (section 9). Nothing was built or run
for it. START-HERE requires it: "No plan runs before it passes
the plan check." The check is section 4.
Marks: **[proven]** in the literature as the source states it; **[measured]** counted, run or seen here (seen once
says so); **[hypothesis]** reasoned, designed or guessed, untested. Version 2 of the decision rule
(`docs/program/evidence/round3-2026-11-18/DECISION-RULE-v2.md`, r57-0841) is used; its Q37 is now measured for this
week (ORCHESTRATION section 4), so decision 1's stand-in pacing is no longer used.

## 0. The answer

1. Four slices: **0** facts, branches, 0b, the skeleton and the landing script; **1** the 13 fixes in four
   dependency layers; **2** cross-fix tests, the last full suite, the one R57 model check; **3** the pilot.
   Before slice 0, P0: the hook and lane fixes the build relies on (ORCHESTRATION section 9).
2. The tree (ORCHESTRATION section 2): one Fable root session the owner starts; every other node a helper it starts,
   B1-1 included: a helper's own helpers run in the foreground, so a batch orchestrator would block on each wave.
   One probe before B1-1 can bring one back for B1-1. No child sessions below the root.
3. The plan check gives **3 builders at once in B1-1**: the lane binds (2 slots; a builder spends 30 to 40 % of its
   time in test runs, and about 1.3 refuters' mutation runs share it); collisions would allow 7. The root
   re-measures after B0b. Elsewhere the ready work (1 to 4).
4. Tokens: about **416 million (four usage fields), 10.4 weekly points (6.7 to 16.6)**, from like-for-like past work
   (builders that write and run their tests) [measured inputs, computed]. The week has 38 points left; the owner's
   own use is protected at 20 points to the reset; the build fits, so it is not paced.
5. Needs the owner's word: the commit of P0 with the hook files and the plan files; the build's start, with the
   nesting probe; a cap of 15 weekly points; later the model check run (S2.3) and the pilot.

## 1. What the plan rests on

| Input | Value | Mark | Source |
|---|---|---|---|
| Units | 14: 13 fixes and 0b; L 4, M 8, S 2; 52 tests; 12 scripts and `thresholds.json` | hypothesis (estimates from the change list, no diff) | `BUILD-SIZE.md` 1b, 5; r57-0112 |
| Collisions | 3 at once by file, 7 by function or block, 8 by statement with 0b built first; 20 shared places (9 entries, 7 ordered sequences, 4 same statements) | measured (count over the change list, not diffs) | r57-0128; `E:write-collision-points.md` tables B and 4 |
| Suite run | 596 s one file at a time (r57-0103); 264 s with 8 files side by side, 334 s each when two run at once; 965 pass, 0 fail | measured | r57-0103; `research-tree/lane/log.jsonl` labels r57-0517-sbs8, -two-a, -two-b |
| Lane | 2 slots; default `--timeout-s` 540, at most 1,500; a waiter breaks a slot held over 20 min; `--wait-s` at most 3,000; exit 75 = no slot, 124 = timeout; its slots sit beside the script, so a copy in a worktree is a second lane | measured (read in code) | `research-tree/tools/lane.mjs` lines 20-39; r57-0127 |
| Free memory | at least 14.1 GB with two suites running | measured | r57-0517 coordinator, 2026-11-19 |
| Model run | 0.46-0.50 GB RSS at `--mem-mb 400`; about 3.1 M states fit at 400 MB | measured | `model/as-built/HOWTO-RUN.md` |
| Usage, 2026-11-19 about 12:30 UTC | weekly all models 62 %, weekly Fable 49 %, both reset 2026-11-23 12:00 UTC; no 5-hour window listed | measured (get_usage) | ORCHESTRATION section 1 |
| Points per token | 0.025 points per million tokens, four usage fields added (1 point = about 40 million), spread 1.02x over three intervals of this week. The earlier 0.62 million a point came from r57-0114's 7.67 million, which is not this count (the R57 round's 19 helpers sum to 243.6 million) | measured | `build/check/E-tokens.md` 4a, 4e |
| Tokens per unit | Opus builder 11.7 M (8.9-17.1 M, n=12), like for like: units that write and run their tests (the closing round's fix units and the tree build's build-plus-tests pairs; the 14 builders used first gave 8.8 M, but 9 of them wrote no tests); refuter 5.4 M (3.2-8.2 M, n=9) | measured | ORCHESTRATION sections 1, 3 |
| Builders' test runs | a fix unit of the closing round spent 0.30 to 0.40 of its time in test calls: 9 calls (9-12), 29 s median for calls under 150 s; n=5 | measured | ORCHESTRATION section 1 |
| Hand-over window | root about 129,000 tokens (118,000-148,000); an Opus helper checkpoints at about 330,000, before the app compacts it at 368,000, which same-kind units reached | computed from measured inputs | ORCHESTRATION section 5; r57-0404 gave 133,000 |
| Session at call 1 | about 88,000 tokens: the main sessions of 11-19 started at 89,600 and 91,400 (the board is injected at start), less 3,600 since the FixFlow skills were turned off | measured | E section 2; r57-0517 coordinator |
| Hook input | carries `session_id`, `tool_use_id`; fires inside a helper with `agent_id`; a helper shares the session id; PostToolUse fires with `tool_response`; a hook can deny | measured, seen once | `E:probe-hooks.md` rows 2, 4, 10-12; r57-0105 |
| Session starts | a session can start a session only on a turn the owner typed or the turn after one of its own sessions ends, never on a helper's notice; a chain of them can pause; helpers can be started on any turn and nest up to three layers, 20 running per session | measured | r57-0109; r57-0517 coordinator |
| Nested helpers | a helper's own helpers run in the foreground: the parent waits until they return (one seen, hc1-0103; the app's documents give the background only to helpers of the main conversation) | measured, seen once; read | ORCHESTRATION section 1 |
| Testing rule | model check only at the sizes where the fixes act; one attack round per fix; three app checks before the pilot; the full suite before work is stacked on new landings and at the end | the owner's rulings and r57-0417 | protocol v2 section 16 point 12; r57-0004; r57-0033 |

Two corrections of `FAULTS-AND-FIXES.md` "Two facts to measure first" follow from `E:probe-hooks.md`: fact 1 (does a
hook's input carry the session id) is already seen, yes; so are F-P1c (a helper shares the id), F-P3, F-P8 and F-P10c
of `notes/r3-changes.md` section 2. Of cut 3's three app checks before the pilot, two are seen once already (the
hook fires for helpers; a background command's exit reaches the session, W-H1). Fact 2 is answered in S0.3 from the
app's stated rule (S0.2 folded, review finding 5).

## 2. The slices, the units and the files each writes

Every unit works in its own worktree and branch under `.claude/worktrees/<unit>` (at most 96 characters to the
scripts), cut by the root from the build branch tip (not by the `isolation` flag, which branches from the default
branch: ORCHESTRATION section 9), and lands through the check in
one order (section 3): version 2's floor (r57-0415) [hypothesis]. Each builder runs only its own scripts' test files,
through the main checkout's lane, each call under 150 s; the full suite runs at five points (section 3, r57-0417).
Every built unit gets one Opus refuter in a fresh context, beside the next build; W6, REDO, CLOSE and W4 (nothing
builds on them) are reviewed together at the end; another round only for a finding that would break a unit. Every
unit that edits `lib`, `guard-hook`, `replace`, `watch` or `status`, and the landing script, is build-invariant on
Opus (r57-0005; `build/check/B-documents.md` row 4). A builder that departs from its design writes the departure into
`research-tree/build/departures/<unit>.md`, which the model unit reads (S2.2). Tests live in
`tcb/test/<script>.test.mjs` and specs in `research-tree/spec/<script>.md` for every script a unit changes; the table
names the code files. An Opus unit that reaches about 330,000 tokens of context commits, writes
`research-tree/build/units/<unit>/checkpoint.md`, and a successor continues (ORCHESTRATION section 5).

### Slice 0: facts, branches, 0b, the skeleton, the landing script

P0 runs first, in the main checkout, because the hook commands point at the main checkout's files: the record guard
made worktree-aware, the pre-commit hook made self-locating, the lane's stale hold raised (build-invariant, opus; one
refuter; ORCHESTRATION section 9 rows 1-2). It is committed with the hook files and the two plan files on the owner's
word, and the build branch is cut from that commit.

| Unit | What | Kind, model | Writes |
|---|---|---|---|
| S0.1a | F-P1b (the id's exact format) and F-P2 (Write input carries `content`) from the probe's log | extract, haiku | `research-tree/build/facts/FP1b-FP2.md` |
| S0.1b | F-P12: hard links in `run/` and `wt/` (one command per folder) | run, sonnet | `build/facts/FP12.md` |
| S0.1c | W-H5 (kinds of transcript record) and W-turn (longest coordinator turn): counts over existing transcripts | run, sonnet | `build/facts/WH5-Wturn.md` |
| S0.1d | W-helpers and W-allow: profiles' grammar and the allow-list against each script's spec (file checks) | read, sonnet | `build/facts/Wallow.md` |
| S0.2 | Folded into S0.3 (review finding 5): a helper's turn is its task, so a helper cannot observe Q5 (may a session call the session-start tool on a turn begun by its own background command's exit; FX-CGATE steps 4-6, F-P4's tool names). S0.3 takes Q5 from the app's stated rule instead | none (in S0.3) | in `build/branches.md` |
| S0.3 | Settle the branches the change list left "to the owner" (`notes/r3-changes.md` section 7: Q5, Q6, L1/L2, S1/S2, B1/B2, R1/R2, RL, H4, P1/P2, E1/E2, LR-4, PROBE 1(c), U3-F8) from the record: a branch the model shows failing or "cannot be relied on" is out (R2 fails EventuallyResolves in 13 steps; Q5b cannot be relied on); then the objective, quality first, then time, memory, tokens (r57-0003); where the record and S0.1 settle nothing, the variant the model checked, its threshold a marked guess the pilot measures; Q5 from the app's stated rule: sessions start only on the owner's words, and a turn run by an automated event, such as a background command's exit, is refused (its refusal text, recorded 2026-11-17; r57-0109) | analyse, opus | `build/branches.md` |
| S0.4 | 0b: `exclusiveWrite` strict option, `fsRetry` budget, `selftest` hard-link check; 3 tests | build-invariant, opus | `tcb/lib.mjs`, `tcb/selftest.mjs`, `tcb/guard-hook.mjs` (hook writes), `CONTRACT.md` 8.20 and decision 20 |
| S0.5 | The skeleton (r57-0401; version 2 Step 8 rank 1, reshape shared places): fixed signatures for `outcomeState`, `outcomeAppend`, the claim helpers, `planAct`, `liveness`, `realProc`'s timeout, `withRunLock`'s `requireArmed`, `acquireLock`, `parseTranscript`'s kind, `slotCount`'s `{root}`; the 13 runtime file formats; the 7 ordered sequences (B2, B3, B6, B11, B15, B16, B19) and 4 same-statement places (B4, B8, B13, B14) turned into named empty steps, one per fix, in the order of join points 9 and 11; the 18 new keys of `thresholds.json` with the designs' values, marked guesses; behaviour unchanged, so today's suite passes as it is | build-invariant, opus | `tcb/lib.mjs`, `guard-hook.mjs`, `replace.mjs`, `status.mjs`, `watch.mjs`, `handover.mjs`, `thresholds.json`, `task-row.schema.json`, new `tcb/briefs/coordinator.md`, `CONTRACT.md` (3.23 and decision 41 as headings, the 1.4 rows), spec headings |
| S0.6 | The landing script (section 3) and one test: a failing suite undoes the merge | build-invariant, opus (it undoes a failed landing) | `research-tree/tools/land.mjs`; runtime `research-tree/build/landings.jsonl` |
| S0.R | Refuters for S0.3, S0.4, S0.5, S0.6 | refute, opus | `build/refute/<unit>.md` |

Order: S0.1a-d at once (reads, no file shared), then S0.3 (batch B0a); beside them the nesting probe (ORCHESTRATION
section 2); S0.4, S0.6 at once (no file shared); S0.5 after S0.4 has landed (it builds on 0b's arguments at B4)
(batch B0b). Landings first in, first out as each passes its review: S0.4 and S0.6, then S0.5; until `land.mjs` has
landed, the root takes section 3's steps itself; then full suite 1. The root starts every leaf itself.

### Slice 1: the 13 fixes

Ready means every unit it depends on has landed (`BUILD-SIZE.md` section 3, as named). The skeleton fixes the formats
between them, so a unit could be built ahead of its dependencies; it is not: the full suite runs before any unit whose
dependencies landed since the last run, so nothing is stacked on unchecked work, and a redo spends tokens where a wait
spends only time (version 2 Step 8; r57-0401's own condition) [hypothesis].

| Unit | Layer, depends on | Kind, model (tier route) | Code files it writes | Tests |
|---|---|---|---|---|
| FX-W1 | 1 | build-invariant, opus (hook) | lib `liveness`, guard-hook allow-list, watch, status, `.gitignore`; CONTRACT 1.2 | 3 |
| FX-OUT | 1 | build-invariant, opus (fence, log) | lib, guard-hook, replace, commit, watch, status, fsck; CONTRACT 3.12, 3.23, 4.6; READY line in `briefs/child.md` and the four helper briefs | 6 |
| FX-CLAIM | 1 | build-invariant, opus (claim) | lib, guard-hook, replace, stop, handover, admit, status; schema `nostart`; claim line in the five briefs; CONTRACT 4.10 | 7 |
| FX-CGATE | 1 | build-invariant, opus (hook) | guard-hook, handover, status, selftest; `settings/coordinator.json` (one PreToolUse entry kept), `profiles/coordinator.json`; CONTRACT 3.21 | 5 |
| FX-W5 | 1 | build-invariant, opus (watch) | watch `evaluate`, `rowAct` steps | 2 |
| FX-W7 | 1 | build-invariant, opus (lock) | lib `acquireLock`, watch; CONTRACT 3.10, 4 | 2 |
| FX-W6 | 1 | build-invariant, opus (lib, watch) | lib `parseTranscript`, watch; CONTRACT 3.20 | 3 |
| FX-REDO | 1 | build-invariant, opus (ledger) | replace, status, stop, fsck, render | 1 |
| FX-W2 | 2: W1 | build-invariant, opus (lib, watch) | lib `realProc`, watch, status | 3 |
| FX-PLAN | 2: OUT, CLAIM, CGATE | build-invariant, opus (planner) | lib `planAct`, status `nextOf`, watch `rowAct`; CONTRACT class 17 | 5 |
| FX-W3 | 3: W1, W2 | build-invariant, opus (lock) | lib `withRunLock`, replace, guard-hook, watch, status, handover; its acts in `briefs/coordinator.md` | 5 |
| FX-CLOSE | 3: CGATE, PLAN | build-invariant, opus (stop and verify) | lib schema, stop | 3 |
| FX-W4 | 4: W3, W5, W7 | build-invariant, opus (status) | status `--deadman`; new `tcb/settings/deadman-task.xml`; CONTRACT 2.1 | 4 |

No unit of slice 1 writes `thresholds.json` (S0.5 wrote its keys). Order of starts and landings, one list: W1, OUT,
CLAIM, CGATE, W2, PLAN, W3, CLOSE, W5, W7, W4, W6, REDO: the longest remaining chain of needs first (W1, W2, W3, W4 is
four long; OUT, CLAIM, CGATE, PLAN, CLOSE three), a list schedule, which stays within 2 - 1/n of the best (Graham,
r57-0309) [proven for the bound; hypothesis that it fits here]. It is cut into batches at the suite points: **B1-1**
W1, OUT, CLAIM, CGATE with W5, W7, W6, REDO (they need nothing; r57-0006), run by the root
(by one batch orchestrator helper only if the probe passes); **B1-2** W2, PLAN; **B1-3** W3, CLOSE; **B1-4** W4 with S2.1. Within a batch, starts go down the
list as the width allows.

### Slice 2: the cross-fix tests, the full suite, the one R57 model check

| Unit | What | Kind, model | Writes |
|---|---|---|---|
| S2.1 | The tests that cross fixes: PLAN's total table, W3's denied start leaves no `start.json`, W4's dead-man in `status.test.mjs`, the coordinator's endturn after exit 2 and 75 (R5 N2); CONTRACT and spec read through for agreement; then full suite 5, the last | build, sonnet; refuter opus | `tcb/test/lib.test.mjs`, `guard-hook.test.mjs`, `status.test.mjs`; `CONTRACT.md` |
| S2.2 | The model brought to the code as built: flags for the branches of `build/branches.md` and every departure file; no oracle where the code now has a mechanism (R57) | build-invariant, opus | `research-tree/model/as-built/` (new config and model files; the frozen ones stay) |
| S2.3 | The model check, once, at the sizes where the fixes act (cut 1): the configurations of the final pass (`FN-R5`, `FN-OUT-CLOSE` at two faults, `FXW-4R` parts, `FXW-5`, `FXW-6`) and one per branch S0.3 changed; each through the lane under 1,500 s, as a background command of the root (a helper's call must stay under 150 s), memory set from a reading of free memory; a Sonnet runner reads the results | run, sonnet (results); the root runs the commands | `research-tree/model/results-build/` |
| S2.4 | Judge the results: every property holds, or a failing trace goes back to its fix (one more round for that fix only) | analyse, opus | `research-tree/model/results-build/VERDICT.md` |

### Slice 3: the pilot

P3.1: the one app check of cut 3 not yet seen, a stop ending a session with its helpers (F-P10a), observed once
(test, haiku). P3.2: protocol section 10's list of scripts and files counted against `tcb/` (locate, haiku). P3.3: the
pilot of section 10, under a plan and a cap computed then from what slices 0 to 2 measured. Each needs the owner's
word.

## 3. How a landing passes the check

1. A unit is ready to land when its own test files pass in its copy, its refuter's verdict passes, and every unit it
   depends on has landed. Ready units queue first in, first out. W6, REDO and CLOSE land without a review of their
   own; the combined review of W6, REDO, CLOSE and W4 in B1-4, before W4 lands, can send any of them back.
2. `land.mjs` merges the unit's branch into the build branch in a build worktree of its own (never the owner's
   checkout), with `git -c core.longpaths=true`. A textual conflict aborts the merge and returns the unit to its builder.
3. It runs the unit's own test files through the main checkout's lane, by absolute path, each call under 150 s with
   its wait: `node C:/Users/User/Documents/projects/harness-engineering/research-tree/tools/lane.mjs --label
   land-<unit> --timeout-s <T> --wait-s <145 - T> -- node --test <the unit's test files>`, T about 1.5 times the same
   files' last run (140 at most, and 140 the first time), so a wait for a slot costs no call. `selftest.test.mjs` (270 s alone)
   runs in two `--test-name-pattern` halves or in the next full suite. A pass is keyed by file hash and never run
   again on unchanged files. On exit 75 (no slot) it asks again in a new call (one more Opus call, 0.1-0.25 M); 124 is "not a result". Builders call
   the lane the same way.
4. Pass: the merge stays; a line goes to `build/landings.jsonl` (unit, commit, files run, exit, seconds waited,
   seconds run). Fail: the build branch goes back to the commit before the merge (the undo of the floor), the line is
   written, and the unit returns to its builder with the failing tests.
5. **The full suite** (8 files side by side, the r57-0517 coordinator's command, `--timeout-s 600`) runs five times:
   after slice 0, after B1-1, after B1-2, after B1-3, and at the end (r57-0417): 22 min at 264 s, against 75 min for
   one per landing. The root runs it as a background command. A failing suite: the batch's landings are bisected (2 more
   runs for slice 0's 3 landings, 3 for B1-1's 8, 1 for the others); the faulty merge is undone with
   `git revert -m 1 <merge>`, since later merges sit on it, and its unit returned.
6. **One landing at a time**: the root lands every unit (a batch orchestrator lands B1-1's only if the probe
   brings one back), and batches never overlap. Landings and the builders' and refuters' own test runs share the lane's two slots; a full suite
   takes one of them, never two of the build at once; the model runs come after slice 1.

## 4. The plan check: how many builders

Version 2 Step 2: run at the smallest width (r57-0414). Numbers and their marks: ORCHESTRATION section 6.

| Limit | B1-1 | Elsewhere | Mark |
|---|---|---|---|
| Collisions (r57-0128) | 7 by function or block; 8 at statement level after the skeleton | 2 at most | measured count; the skeleton's effect a hypothesis |
| Ready work | 8 | B0a 4, others 1-2 | from the named order |
| The check, N* = c (S + Z)/S, Z = 22.9 min (the five fix units' median) | own test files at landing, one lander (S about 60 s): 24, not binding; a full suite per landing would bind at 6.2 (c = 1, S = 264 s) or 10.2 (c = 2, S = 334 s) | same | proven bound; c > 1 computed; S at landing an estimate |
| Lane and processor | 2 commands at once; two suites peak at 97.6 % of the processor | 2 | measured |
| The lane for the builders' and refuters' own test runs | w fits if w <= (2 - the landings' share - n_r u_r)/u_b; u_b 0.30 to 0.40 (a builder's share of time in test calls); refuters taken as test-heavy, about 1.3 running on average at w = 3: **3** (4 only at the low ends); builders alone 4.5 to 6.0. Re-measured after B0b from the lane log | 2 at most: not binding | u_b measured on five past fix units; the refuters' share an estimate; the rest computed |
| Memory | about 20 suite runs; helpers start no process | same | measured |
| Token windows | price zero: at the build's start (about 64 %) 36 points are left, 20 protected, 16 for the build's 10.4 (the high case, 16.6, passes it: the gate then holds the last starts to the reset) | same | Q37 measured this week; the rest computed |
| Parent's window | the root under its 129,000 hand-over (a batch orchestrator, if used, about 110,000 at its 38th call) | the root under its 129,000 hand-over | computed |
| 20 running helpers a session | 3 builders + up to 6 refuters = 9 | at most 5 | read in the app's documents |

**Builders at once: 3 in B1-1 (the lane), the next as one returns; elsewhere the ready work.** What limits the plan:
the lane in B1-1, through the builders' and refuters' own test runs, then the collisions (7); the dependency order
elsewhere. The root re-measures the lane shares after B0b and sets B1-1's width from them. The token window no longer
limits it: Q37 measured this week puts the window's price at zero (decision 1).

## 5. Token cap and pacing

**The estimate** (ORCHESTRATION section 4, from the tree scripts' build and closing round of 2026-11-16 and 17,
the same scripts, models and kinds, builders like for like): P0 18.9 million; slice 0 78.6 million; slice 1 254.3
million; slice 2 45.8 million; the root 10.9 million; lane retries about 8 million; **416 million through the model
check, 10.4 weekly points (6.7 to 16.6)**. Guesses inside it: the redo share (30 %, 10 to 60 %), unit size against
tokens, the lane retries, and the coordination figures (computed, since no recorded build had a helper
orchestrating helpers).

**Later demand (Q37, this week only).** The owner's own top sessions used 0.21 points an hour since the reset;
protected to 2026-11-23 12:00 UTC that is 20 points. The rounds he ordered used 0.69 an hour; the build takes their
place while it runs.

**The gate at every start (the root reads get_usage).** A unit starts only if the meter now, plus the expected
remaining use of the running units (the reserve, a1-0402), plus the unit's expected use stays at or under
100 - 0.21 x (hours to the reset), and the build stays under its cap. A unit at its own limit stops with a checkpoint
and goes back to its orchestrator, which decides (r57-0038).

**The cap proposed: 15 weekly points for P0 and slices 0 to 2** (576 million tokens, 14.4 points: the expected use
plus every node at its upper quartile together), counted on the meter from the build's start; with the 20 protected
points the meter stays under 100 % at the reset. r57-0037's stop at 69 % holds for task r57-0517 only, not for the build. The
pilot gets its own cap.

## 6. Who runs it

- One build root, a fresh session the owner starts at the repository root (r57-0109: a session starts sessions only
  on a turn he typed), kind orchestrate-deep, model Fable (r57-0035, for the case that B1-1's batch orchestrator
  comes back; if the probe rules it out, the successors may run on Opus, kind orchestrate; `tier-routes.json`
  version 1). It starts every other node as a helper through the Agent tool, each named by kind and model (tier
  hook), and reads results on disk as a path and a few fixed fields, never diffs. It alone talks to the owner.
- The root runs every batch, B1-1 included: a helper's own helpers run in the foreground, so a batch orchestrator
  would block on each wave. A batch orchestrator helper (kind orchestrate, Opus) runs B1-1 only if the nesting probe
  shows nested helpers in the background and none stalled; it then never ends with children running.
- The root hands over at about 129,000 tokens of context, at the first quiet point (no helper and no background
  command running), through `research-tree/build/STATE.md`; the owner starts the successor (about 6 sessions). It
  runs every command over 150 s as a background command, keeps a background wake timer of 3 x Q3 of the running
  units' minutes (125 min for builders), asks the app's keep-awake before each wave, and ends every process it
  started before it reports (r57-0024).
- After each slice it updates "Where it stands" on `START-HERE.md` and the open line r57-0507 is reported to the top
  session; commits to `main` stay the owner's.

## 7. Needs the owner's word

| Item | What he is asked | Why it is his |
|---|---|---|
| The commit | "approve:" P0's fixes, the hook files and the two plan files committed on the working branch, and the build branch cut from that commit | CLAUDE.md git rules; r57-0156 |
| The build's start | "approve:" P0 and slices 0 to 2 as written: four counts over existing files and transcripts, one probe of nested helpers (an experiment), building P0, 0b, the skeleton, the landing script and the 13 fixes, builders' commits on the build branch (not `main`) | rules 3 and r57-0007 |
| The cap | "cap:" 15 weekly points for P0 and slices 0 to 2, gated as in section 5 | CLAUDE.md rule 5 |
| Later | the model check run (S2.3); the pilot (slice 3) with its own cap | rule 3, rule 5 |

No design question is in this list (r57-0001): the branches are derived in S0.3 from the record and the model's
results, and what neither settles is measured in the pilot.

## 8. Not in this plan, and what is not sure

- The token cost of building these units is taken from same-kind past work, not from the units themselves; how often
  a landing fails the check, the redo share and a unit's review time are not measured; every number resting on them
  is a hypothesis (ORCHESTRATION section 11).
- That the skeleton keeps the units apart at statement level is r57-0401's untested design.
- B1-1's width rests on the builders testing as often as five past fix units did (30 to 40 % of their time) and on
  the refuters' mutation runs, whose lane time is not measured; both are re-measured after B0b.
- Whether a helper's own helpers can run in the background here: the probe answers it. How often a unit reaches
  330,000 tokens of context, and what a successor's orientation costs.
- The rule's own pieces (r57-0707's order as changed by the draft's section 6) come after r57-0507 and are not here.
- Fewer coordinator wakes (t1-0403, rank 1) would come from one inner level for B1-1; it waits on the probe.
- The planning session that wrote this plan first read about 140,000 tokens of sources on top of its fixed load
  (about 205,000 in its window when it computed this); a unit's brief must point at sections, not whole files.

## 9. Review (r57-0004)

A blind Opus refuter read this plan and `ORCHESTRATION.md` on 2026-11-19; six findings stood and are folded in.
ORCHESTRATION section 12 has the full table. What changed here:

| # | Finding | What changed in this file |
|---|---|---|
| 1 | A helper's own helpers run in the foreground, so a batch orchestrator blocks on each wave | The root runs every batch; the nesting probe before B1-1 can bring one back for B1-1; a wake timer (sections 0, 2, 3, 6, 7) |
| 2 | Same-kind units were compacted by the app at 353-366 K, mid-edit, under their limits | Opus units checkpoint at about 330,000 tokens of context and a successor continues (sections 1, 2) |
| 3 | The 8.8 M builder was not like for like: 9 of the 14 wrote no tests | Builder 11.7 M; 416 million tokens, 10.4 points; cap 15 points (sections 0, 1, 5, 7) |
| 4 | Width 5 was not the smallest: refuters' mutation runs share the lane; retries cost an Opus call | B1-1 at 3, re-measured after B0b; the wait fills the 150 s budget (sections 0, 3, 4) |
| 5 | A helper cannot observe Q5 | S0.2 folded into S0.3, which cites the app's stated rule (sections 1, 2, 7) |
| 6 | Worktrees outside the repository; the bisection; the plan files untracked | Worktrees under `.claude/worktrees/`; bisection with `git revert -m 1`; the plan files in the commit (sections 2, 3, 7) |
