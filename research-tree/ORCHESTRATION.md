# ORCHESTRATION: the build's tree, planned before it starts (task r57-0517)

Written 2026-11-19 by a helper of the r57-0517 coordinator (kind analyse, Opus) from the files named in each row.
Nothing was built, run or started for it. It plans task r57-0507 (`BUILD-PLAN.md`, which was edited to agree with it,
section 10) under the owner's rulings r57-0034 (the tree planned beforehand), r57-0035 (Fable orchestrates children
that have children) and r57-0038 (limits are need plus a buffer; at a limit the orchestrator decides).

Marks: **[m]** measured (path or who); **[r]** read in a file; **[c]** computed (formula shown); **[e]** estimate
(range). "Tokens" = the four usage fields added (input + cache creation + cache read + output), the count of
`check/E-tokens.md`; cache reads are about 95 % of it. "Points" = the weekly all-models meter. "Coordinator" = the
r57-0517 coordinator's measurements of 2026-11-19. `check/` = `research-tree/build/check/`.

## 0. The answer

1. **Tree.** One root session, started by the top session on the owner's go (r57-0039); it alone talks to him.
   Below it only helpers, no child sessions. The root runs every batch itself. Fork mode is now off, so a helper's
   own helpers run in the background (probe, section 13), but a helper orchestrator hears from them only by
   polling, one re-read of its window per poll: in B1-1, the only batch where an inner level pays, the polls cost
   1.5 to 3.5 M against the 0.42 M it saves [m, c: sections 2, 13]. No node has grandchildren, so the root is
   **Opus, kind orchestrate** (tier routes; r57-0035 puts Fable on orchestrators whose children have children).
2. **Tokens.** The build through the model check: about **416 M tokens, 10.4 weekly points (6.7 to 16.6)**, from
   like-for-like past work: builders that write and run their own tests [c, section 4]. BUILD-PLAN's 36 points came
   from a different count; the meter takes about 40 M tokens a point [m, E 4e].
3. **Window.** Q37 for this week: the owner's own top sessions used **0.21 points an hour**; protected to the reset,
   **20 points**. 38 points are left (62 %). The build fits, so the window's price is zero (decision 1) and units
   start as fast as the other widths allow. Cap to ask: **15 points** [c, section 4].
4. **Hand-over.** The root at **W* about 129 K tokens** (118 to 148 K), at the next quiet point, through
   `research-tree/build/STATE.md`; r57-0404's 133 K lies inside. An Opus helper checkpoints at about **330 K**
   context, before the app compacts it at 368 K, and a successor continues from the checkpoint [c, section 5].
5. **Limits.** Expected = median of same-kind work; limit = Q3 + 1.5 IQR (Tukey's fence for a clear outlier):
   Opus builder 11.7 M, limit 29.2 M; refuter 5.4 M, limit 15.6 M. Reserves pooled at the root (critical chain)
   [c, section 3].
6. **Widths.** The lane has **4 slots** since 2026-11-19 (4 test files at once each ran 1.06 to 1.15 times their
   time alone; section 13). Section 6's rule then gives B1-1 **7 builders at once** at central shares, the same as
   the collisions (it gave 3 at 2 slots). The root re-measures the shares after B0b and sets B1-1's width from
   them [c, sections 6, 13].
7. **Testing.** r57-0417's **5 full suites** stay: about **10 min at 120 s** each, the longest test file split
   into 4 shards that run at once (section 13), against 75 min at 264 s for one per landing, which is never
   cheaper here [m, c: sections 7, 13].
8. **Before the first unit** (section 9): done by the top session on the owner's go: P0 (the record guard
   worktree-aware, the pre-commit hook self-locating), the plan gate, both reviewed; the document lines of B rows
   9-18; the nesting probe; the hook and plan files committed (section 13). The root then cuts each unit's worktree
   from the build branch tip under `.claude/worktrees/` and calls the main checkout's lane by absolute path.

## 1. Inputs and marks

| Input | Value | Mark and source |
|---|---|---|
| Full suite, 8 files side by side | 264 s; two at once 334 s each (27 % slower, 1.58 times the throughput); 965 pass, 0 fail | [m] coordinator; `research-tree/lane/log.jsonl` labels r57-0517-sbs8, -two-a, -two-b |
| Suite one file at a time | 596 s; per file: selftest 270 s, replace 81 s, fsck 59 s, admit 51 s, handover 44 s, the others measured 12-33 s; lib, status, watch, stop not timed alone | [m] r57-0103; lane log labels `mg-suite-*`, 2026-11-17 |
| Processor, memory | one suite 28.8 % mean, 75 % peak; two suites 49.6 % mean, 97.6 % peak; free memory at least 14.1 GB; helpers have no process of their own | [m] coordinator; [r] `check/C-capacity.md` rows 4-5 |
| Lane | 2 slots; slots live beside the script (`lane.mjs` line 20: `HERE`), so a copy in a worktree is a separate lane | [r] `research-tree/tools/lane.mjs`; C rows 7-10 |
| App limits | helpers nest up to 3 layers, 20 running per session; a helper's foreground call over about 180 s is backgrounded and may stall; sessions start sessions only on an owner-typed turn | [r] coordinator (docs sub-agents.md 1077, 1104); memory `reference-helper-commands-backgrounded-after-180s.md` |
| Worktrees | the app's `isolation: "worktree"` branches from the default branch (48660877), not HEAD, unless `worktree.baseRef` is `"head"`; such a worktree had no hooks, settings or journal | [m] coordinator; docs worktrees.md 138, 170-188 |
| Fresh helper | 56,120 tokens with no tool use (haiku), 59,108 nested; helper context at call 1: 58.7 K (n=134) | [m] coordinator; [m] E section 2 |
| Main session at call 1 | Opus mains 86.3 K (84.4-91.4 K, n=16); the two of 11-19, with the board injected at start, 89.6 and 91.4 K; Skills category 9,972 → 6,327 tokens after FixFlow off | [m] E section 2; coordinator |
| Orientation of a handed-over session (R) | 359 K tokens (267-587 K) over 4 calls, n=4 | [m] E section 2 |
| Growth per call (g) | Opus orchestrator mains 1.3 K (1.1-1.5 K, n=14); Fable mains of 11-17 2.3 K (2.2-2.6 K, n=5); Opus builders 2.2 K (1.6-3.8 K, n=14); refuters 1.6 K | [m] E 1b; [c] tokens-transcripts.csv (method below) |
| Autocompaction | Opus only: `autoCompactWindow` 400000 (`~/.claude/settings.json` modelSettings), at 92 %, so 368 K; Opus helpers' peaks stop at 366.7 K; Fable mains reached 962-969 K, a Sonnet helper 494 K | [r] settings; [m] get_usage of this session; [m] tokens-transcripts.csv |
| Points per token | 0.025 points per M tokens (1 point = about 40 M), spread 1.02x over three intervals of this week | [m] E 4a, 4e |
| Meter now | all models 62 %, Fable 49 %, both reset 2026-11-23 12:00 UTC; plan "Ultra"; no 5-hour window listed | [m] get_usage, this helper, about 12:30 UTC |
| What a helper can read | get_usage gives the account's windows, but "self" from a helper gave the session's window (323,095 of 400,000) while this helper's own transcript showed 260,627; a helper can read its own transcript `<projects>/<repo folder>/<session id>/subagents/agent-<id>.jsonl` (newest file whose `.meta.json` description is its own): 32 calls, 5.85 M tokens | [m] this helper, once |
| Collisions | 7 units at once by function or block; 8 at statement level with 0b first | [m] r57-0128 |
| Unit sizes | L: OUT, CLAIM, CGATE, W4; M: 0b, CLOSE, PLAN, W1, W2, W3, W6, W7; S: REDO, W5 | [e] `BUILD-SIZE.md` line 175 |
| Nested helpers | a helper started by a helper ran in the foreground: `requestShape` "foreground" in its `.meta.json` (`agent-a95f8e01c6046ab36`, depth 2, "test: inner echo", returned inline after 3.4 s); the app's documents: helpers spawned from the main conversation start in the background | [m] hc1-0103, coordinator; [r] docs sub-agents.md 929-938 |
| Compaction of same-kind units | `build:U3b` 366 K → 97 K at 12.3 M tokens; `lib:build` 353 K → 99 K at 8.9 M; 4 of S2.2's 5 model units at 8.1-24.6 M (peaks 341-367 K); all under their limits. Opus compacts at 92 % of the 400 K `autoCompactWindow`, 368 K; a helper's own `autoCompactWindow` can only lower it, to 100,000 or more, through an agent definition file | [m] review finding 2; tokens-transcripts.csv; [r] docs sub-agents.md 305, 1194-1234 |
| Builders like for like | units that write and run their own tests: the five fix units 10.9 M and the seven build-plus-tests pairs of tcb-build 11.8 M; together 11.7 M (8.9-17.1 M), n=12; the 14 builders used first gave 8.8 M, but 9 of them wrote no tests | [m] tokens-transcripts.csv and the tcb-build figures, joined by `.meta.json` descriptions |
| Refuters' minutes | 8.9 min (6.6-67.0), n=9; most ran no mutation tests | [m] tokens-transcripts.csv |
| Builders' test runs | five fix units of the closing round: 9 test calls of 5 s or more each (9-12); calls under 150 s took 29 s (14-87 s); a unit's share of time in test calls 0.30 (0.27-0.32) counting calls under 150 s, 0.40 (0.39-0.53) with longer calls cut to 140 s. The tree's first builders (11-16) ran almost none: their tests were separate units | [m] transcripts of `fix:U1` `fix:U2` `fix:U3` `e2e:fix` and "Fix main guard across scripts" (session a7a94981, 2026-11-17): Bash calls naming a test, time from call to result |

**How the same-kind past work was found [m].** `check/tokens-transcripts.csv` holds no descriptions for product-folder
helpers, so each helper's `agent_id` was joined to its `.meta.json` description under
`C:/Users/User/.claude/projects/C--Users-User-Documents-projects-EMS-workshop1/<session>/subagents/`: the tree
scripts' build (session e24f17dc, workflows `tcb-build` wf_9903ef67-753 and `tcb-build-continue` wf_04e6e2f0-db1,
2026-11-16 18:10-21:33 UTC), its closing round (session a7a94981, 2026-11-17) and the R57 round (session 7abf9f82,
2026-11-17). Same repository, same scripts (`tcb/`), same models, same kinds as the build's units.

## 2. The tree

```
L0  ROOT  session · Fable · orchestrate-deep · started by the owner at the repo root · the only node that talks to him
    │  its main loop also runs every command over 150 s as a background command through the lane:
    │  the 5 full suites, the model runs, a selftest file it was handed, and a wake timer; it lands every unit
    ├─ P0  hook and lane fixes · build-invariant · opus  →  refute · opus     (main checkout, before any worktree)
    ├─ slice 0
    │   ├─ B0a  S0.1a extract·haiku | S0.1b run·sonnet | S0.1c run·sonnet | S0.1d read·sonnet   (4 at once; S0.2 is in S0.3)
    │   │       then S0.3 analyse·opus → refute·opus
    │   ├─ PROBE  test·haiku parent → two test·haiku children, each over 180 s   (beside B0a; decides B1-1's L1)
    │   └─ B0b  S0.4 (0b) ∥ S0.6 (land.mjs), build-invariant·opus → refute each → land each
    │           then S0.5 (skeleton) build-invariant·opus → refute → land → SUITE 1
    ├─ slice 1
    │   ├─ B1-1  run by the root (an L1 · helper · orchestrate · opus only if the probe shows nested helpers in the
    │   │        background and none stalled)
    │   │        ├─ W1 OUT CLAIM CGATE W5 W7 W6 REDO · build-invariant·opus · 3 at once, the next as one returns
    │   │        ├─ refute·opus for W1 OUT CLAIM CGATE W5 W7, each beside the next build
    │   │        └─ lands each unit (merge + its own test files, every call under 150 s) → SUITE 2
    │   ├─ B1-2  W2 ∥ PLAN · build-invariant·opus → refute each → land → SUITE 3
    │   ├─ B1-3  W3 ∥ CLOSE · build-invariant·opus → refute W3 → land → SUITE 4
    │   └─ B1-4  W4 build-invariant·opus ∥ S2.1 tests build·sonnet → refute W6+REDO+CLOSE+W4 together, refute S2.1
    │            → land → SUITE 5 (the end)
    └─ slice 2  S2.2 build-invariant·opus → S2.3 model runs (root, background) + run·sonnet reads the results
                → S2.4 analyse·opus                                          (slice 3, the pilot: its own plan and cap)
```

Why each level (every number [c] from section 1 unless marked):

- **One root session, Fable.** If the probe brings back B1-1's L1, the root's child has children, so r57-0035 puts
  it on Fable (kind orchestrate-deep, tier routes version 1); the root starts before the probe, so it starts on
  Fable. If the probe rules the L1 out, no node has grandchildren and the root's successors may start on Opus, kind
  orchestrate (r57-0005); the tokens do not move, since the meter's per-model weights are unknown (E 4c). The root
  is the only node that can run commands over 150 s (helpers stall over about 180 s) and
  the only one that can start a session, which it never does below itself: a chain of sessions pauses after many
  messages with none from the owner, and a child cannot start a grandchild (C row 16). The owner starts it and each
  successor, one typed message per hand-over.
- **An inner level (L1) only where it pays.** A root call costs its context, about 110 K tokens between F 88 K and
  W* 129 K, plus the hand-over share R/n* = 359 K / 17.7 = 20 K, so about 130 K a call. Without L1 the root spends
  4k calls on a batch of k build units (builder result, refuter result, two landing calls each); with L1 it spends 2.
  An L1 costs n x 60 K + 1.3 K x n^2/2 tokens over n = 8 + 4k calls (start 60 K = helper start 58.7 K + brief;
  growth as Opus orchestrators), plus the 2 root calls that start it and read its result, 0.26 M. Saving minus cost:
  k = 1: 0.52 - 0.81 - 0.26 = -0.55 M; k = 2: -0.35 M; k = 3: -0.16 M; k = 4: +0.01 M; B1-1 (8 builders, 6
  refuters, 16 landing calls; n = 38): 3.90 - 3.22 - 0.26 = **+0.42 M**, and about 70 K less growth in the root's
  window (one owner hand-over fewer). Only B1-1 has 4 or more units. **But a helper's own helpers run in the
  foreground** (section 1): an L1 would start a wave, block until its last child returns and get no wake between,
  so rolling starts, landing as units finish and reading a stuck child are lost. So the root runs B1-1 (the 0.42 M
  is spent) unless one probe shows otherwise: a Haiku parent (kind test) starts two Haiku children that each run a
  command of about 200 s, and records whether its calls return before the children end, whether both ran at once
  and whether anything stalled (`build/facts/nesting.md`); about 0.5 M [e]. The L1 runs B1-1 only if the children
  ran in the background and none stalled. The probe costs about what the L1 saves; it stays because r57-0035 plans
  orchestrators in the middle of the tree and only an observation settles whether one can work here.
  This is t1-0402/t1-0406's test (a level only where its summary compresses and its children run at once) and
  t1-0403's (fewer parent wakes) [hypotheses on quoted forms; the computation is ours].
- **An L1 per batch, not per slice.** A helper's children report to that helper; whether they survive its end is not
  known (section 11), so an L1 never ends with children running, and the full suites (264 s, over 150 s) must run in
  the root between batches. The batches are r57-0417's suite points.
- **A Workflow script as L1 was weighed and not taken.** It would save B1-1's 3.2 M L1 tokens (about 0.08 points).
  Against it: it needs the owner's explicit opt-in; its resume is positional (a resume once overwrote 20 files, memory
  `reference-workflow-resume-is-positional.md`); B1-1 has about 8 judgment points (each refuter verdict, a merge
  conflict, a leaf at its limit) that a script would hand to the root at about 130 K a call, about 1 M, so the saving
  falls to about 2 M; and the tier hook reads the Agent tool's inputs, so whether it sees a workflow's agents is not
  shown (r57-0025 asks for enforced routes).
- **Leaves.** Every unit that edits `lib`, `guard-hook`, `replace`, `watch` or `status`, and `land.mjs` (it undoes a
  failed landing), is build-invariant on Opus (B row 4; r57-0005): that moves S0.6, W2, W5, W6 and W4 off Sonnet.
  Only S2.1's tests stay `build, sonnet` (tests implement no invariant; the tree's own tests were written that way).

## 3. One row per node

Expected = median (Q1-Q3) of the named transcripts, M tokens [m]; limit = Q3 + 1.5 IQR [c]; buffer = limit minus
expected. A leaf reads its own token count and context from its transcript (section 1) in the same call as each test
run (one more command, no extra call) and, from call 30, at least every 10 calls: `build:U1a` reached 347 K by its
39th call. A parent reads its running children's transcripts at each of its own wakes. "R" = refuter.

| Node | Role, kind, model, started by | Children | Expected (source transcripts) | Buffer, limit | Hand-over point and files | Returns |
|---|---|---|---|---|---|---|
| ROOT | build root; orchestrate-deep; Fable; the owner | every leaf (B1-1's L1 only if the probe passes) | per session 2.3 M (2.0-2.9 M) [c: 18 calls x 88 K + 2.3 K x 18^2/2 + R 0.36 M; spread as Opus orchestrator mains, n=14]; about 4.5 sessions, 10.4 M [c], plus B1-1's 30 calls, 3.9 M [c], and timer wakes, about 0.5 M [e]: about 6 sessions, 14.8 M. A background timer (a command that only waits) of 3 x Q3 of the running units' minutes, 125 min for builders, re-armed at each wake, wakes it when no helper ends. Nearest measured: Fable mains of 11-17 (n=5) ran 75-343 calls to 556-962 K without a hand-over: the pattern this avoids | limit 4.3 M a session; context limit W* 129 K | at W* or at its limit, at the next quiet point (no helper, no background command running): `research-tree/build/STATE.md`; the owner starts the successor | to the owner: one short report per slice; "cap:" at the build's cap; "approve:" for commits |
| L1 B1-1, only if the probe passes | batch orchestrator; orchestrate; Opus; ROOT | 8 builders, 6 R | 3.2 M (2.8-4.1 M) [c: n = 38; spread as above]; no helper orchestrator in the record | limit 6.0 M; covers all 14 starts and its reserve decisions | none while children run (one L1 per batch); `research-tree/build/batches/B1-1/STATE.md` written at each landing | landed units (commit, tests), verdicts, tokens per child, stops and why; one short summary |
| Builder x17 (P0, S0.4, S0.5, S0.6, 13 fixes) | builds one unit and its tests in its worktree and runs its own test files; build-invariant; Opus; ROOT (an L1 in B1-1 if used) | none | **11.7 M (8.9-17.1 M)**, n=12, like for like (units that write and run their tests): closing round 2026-11-17 `fix:U1` `fix:U2` `fix:U3` `e2e:fix` "Fix main guard across scripts" (10.9 M); tcb-build 2026-11-16 pairs `build:U1a`+`tests:U1a`, `U1b`, `U2a`, `U2b`, `U3a`, `U3b`, `lib:build`+`lib:tests` (11.8 M). The 14 builders used first gave 8.8 M, but 9 of them wrote no tests. By size [e]: S 8.9, M 11.7, L 17.1. Calls 59.5 (54-90); minutes 22.9 (17.6-41.6), the five fix units | limit **29.2 M** (largest past 23.3 M) | at about 330 K context or at the limit: commit to its branch, `research-tree/build/units/<unit>/checkpoint.md`, return LIMIT; a successor continues (section 5) | `units/<unit>/result.md`: branch, commit, test files with pass, fail or not-run, departures file, tokens |
| R x16 runs (17 refuter-equivalents) | blind review of one unit: design, diff, tests, one mutation per invariant; refute; Opus | none | **5.4 M (3.2-8.2 M)**, n=9: 2026-11-16 `contract:attack-consistency` x2, `contract:attack-runnable` x2; 2026-11-17 "Blind refuter: fence fixes", "Blind refuter: wake fixes", "Refute section 16 rule table", "Independent check of the draft", "Check section 16 corrections and run record". The combined review of four leaves counted as two. Minutes 8.9 (6.6-67.0), most without mutation runs | limit **15.6 M** (largest past 11.5 M) | at about 330 K context, as a builder; no past refuter passed 293 K [m] | `build/refute/<unit>.md`: pass, breaking finding with its failing test, or list items |
| S2.1 tests | cross-fix tests; build; Sonnet; ROOT | none | 5.5 M (4.3-6.6 M), n=7: tcb-build `tests:U1a` `U1b` `U2a` `U2b` `U3a` `U3b`, `lib:tests` | limit 10.0 M | none | result.md as a builder |
| S2.2 | model brought to the code; build-invariant; Opus; ROOT | none | 25.4 M (22.4-37.5 M), n=5: `model:extend` (11-16); "Model fence group as built", "Model wake group as built", "Model fence fixes and ablations", "Model wake fixes and ablations" (11-17) | limit 60 M | at about 330 K context: 4 of the 5 compacted at 8.1-24.6 M, so 1 to 3 successors [e] | new config and model files, departures read |
| S0.3, S2.4 | analyse; Opus; ROOT | none | 8.0 M (4.9-10.4 M), n=19 round-3 analysers (E 1a): nearest kind; they read more sources, so likely high | limit 18.6 M | none | `build/branches.md`; `model/results-build/VERDICT.md` |
| S0.1d | read; Sonnet; ROOT | none | 1.8 M (1.1-4.7 M), n=13 (E 1a) | limit 10.1 M | none | a fact file |
| S0.1b, S0.1c, S2.3 | run; Sonnet; ROOT | none | 1.4 M (1.3-1.8 M), n=15 (E 1a); tcb-build probes 0.9-3.0 M agree | limit 2.6 M | none | a fact file; the model results read |
| S0.1a | extract; Haiku; ROOT | none | 0.83 M (0.57-1.13 M), n=26 (E 1a) | limit 2.0 M | none | a fact file |
| PROBE (S0.2 is folded into S0.3) | nesting probe; test; Haiku; ROOT | 2 Haiku children, kind test | about 0.5 M [e: three test helpers at 0.13 M (n=2, E 1a) plus the calls around the waits] | limit 1.5 M [e] | none | `build/facts/nesting.md`: background or foreground, at once or one after the other, stalls |

**At a limit (r57-0038), or at about 330 K context.** A leaf commits, writes its checkpoint and returns "LIMIT" with
the path. Its parent
decides: continue the same helper with SendMessage and a new limit drawn from its reserve (context kept; documented
for the Agent tool, not tried here), start a successor from the checkpoint, or stop the unit and report up; at 330 K
context only a successor helps, since the same helper would be compacted. An L1 at
its limit starts nothing new, finishes its landings, writes its STATE and returns; the root decides. The root at
the build's cap starts nothing new, lets running units finish and asks "cap:" with the counts.

**Reserves (pooled).** The field is critical-chain project management (Goldratt, 1997): estimate each task at its
median, strip the safety from the tasks and pool it in one buffer held by whoever decides, sized as the square root of
the sum of the squared spreads; the project-management standard calls such a pool a contingency reserve. Here a
spread is Q3 minus the median. The root holds sqrt(sum of spread^2) = **28.0 M** for the build (17 builders at 5.34,
17 refuter-equivalents at 2.77, S2.2 12.0, the rest small); B1-1's share is **16.6 M** (8 builders, 6 refuters),
held by its L1 if one runs it.
Which assumptions fail for model sessions: overruns are correlated (one misread design or one slow app day hits many
units), so the square root understates; fully correlated, the sum of spreads is 160 M, which the cap covers
(section 4); tens of tasks, not hundreds; tokens are spent even on work thrown away; the budget refills weekly; the
behaviour the method guards against (padding, late starts) is human, not a model's.

## 4. The build's tokens and the two weekly windows

| Part | Expected, M tokens | Points at 0.025 | Low (all Q1, redo 10 %) | High (all Q3, L at 23.3 M, redo 60 %) |
|---|---|---|---|---|
| P0 (hook and lane fixes, R) | 18.9 | 0.47 | | |
| Slice 0 (4 reads, S0.3, S0.4, S0.5, S0.6, 4 R, the probe 0.5) | 78.6 | 1.97 | | |
| Slice 1 (13 builders, 9 R and one combined, B1-1's 30 root calls 3.9) | 254.3 | 6.36 | | |
| Slice 2 (S2.1 and R, S2.2, S2.3, S2.4) | 45.8 | 1.14 | | |
| Root (about 4.5 sessions and timer wakes) | 10.9 | 0.27 | | |
| Lane retries after exit 75 [e] | 8 | 0.20 | 2 | 20 |
| **Through the model check** | **416** | **10.4** | 269 M, 6.7 | 665 M, 16.6 |

Redo [e]: 30 % of the 17 builds sent back at half a builder (29.9 M), 10 to 60 %; the tree's build sent all three of
its reviewed groups to a fix unit (`fix:U1` to `fix:U3`, 8.8-16.5 M). The points rest on E's calibration over this
week's mix (Opus helpers, Fable mains, Sonnet); per-model weights could not be fitted (E 4c). Like for like (review
finding 3) the builders rose from 8.8 to 11.7 M: +52 M, and the redo +7 M; low and high moved by the same method
(+66 M, +80 M). Lane retries [e]: a retry after exit 75 is one more Opus call, 0.1-0.25 M; at width 3 the lane is
about 80 % busy in B1-1 (section 6); with the wait filling the 150 s budget (section 7), about 0.4 retries per test
call over about 120 calls in B1-1 and few elsewhere: about 8 M (2-20 M).

**Q37, measured for this week only** (from the reset 2026-11-16 12:00 UTC to 11:40 on 11-19, 71.7 h;
`check/tokens-10min.csv`, at 0.025 points per M) [c]:

| Use | M tokens | Points | Points an hour |
|---|---|---|---|
| All use (the meter: 62 points by 12:15) | 2,571 | 64.3 | 0.86 (meter) |
| Rounds the owner ordered: helpers in every folder, child sessions in this one (the tree's build, R57, round 3, this check) | 1,965 | 49.1 | 0.69 |
| His top sessions: Fable mains in the product and other folders, the Opus top session 34cb9690 | 607 | 15.2 | **0.21**; by half-day 0.27, 0.21, 0.65, 0.00, 0.06, 0.08 |

The protected later demand is the top-session rate, because during the build the build is the ordered harness work;
another round he orders later is new demand, met by the gate below. To the reset (95.75 h from 12:15 UTC):
0.21 x 95.75 = **20 points**; if the 11-17 afternoon's 0.65 an hour held one half-day in two, 34 points [e].

**Why E's 21-day figure cannot be read at 0.025.** The week before (2026-11-09 12:00 to 11-16 12:00) used 11,360 to
11,843 M tokens (E's day table, 11-10 to 11-15, plus up to 483 M of 11-09) and its meter ran out (about 12 hours of
stall before the reset, x08-0140; no transcript line on 11-16 before 12:00). So that week paid at most 0.0088 points
per M, 2.9 times fewer than this week (2.0 times fewer counted without cache reads). The weights moved between weeks
by 2-3 times in every form E tried, so the cache-read share alone does not explain it; a change of plan or limits at
the reset, the model mix, or another account would; the files do not decide which. Also, E's "outside the harness"
rows hold the harness research run from the product folder (the tree's build and the R57 round), not only his own
work. Q37 therefore uses this week alone.

**Spread over the windows [c].** At the build's start (about 64 %, after r57-0517 [e]) the week has 36 points;
minus 20 protected, 16 for the build. Expected 10.4: it fits, so the price is zero and nothing is paced; the high
case, 16.6, passes the 16, and then the gate holds the last starts to the reset.
The gate at every start, read with get_usage by the root: a unit starts only if u_now + reserve of running units +
the unit's expected use stays at or under 100 - 0.21 x (hours to the reset), and under the build's cap. The cap:
expected plus the fully correlated overrun (every node at its Q3 together), 416 + 160 M = 576 M = 14.4, so
**15 points** (meter about 79 % if it starts at 64 %), plus 20 protected = 99 % at the reset. If his use runs faster, new starts
wait, running units finish, and held units start at 2026-11-23 12:00, the oldest held first (decision 2). The next
week holds only overflow: 100 - 0.21 x 168 = 65 points. **Fable week:** the root's 14.8 M at 0.070-0.177 points
per M (E 4d, the two intervals disagree) = 1.0-2.6 of the 51 points left; price zero. No 5-hour window is listed.
**Wall time** [e]: about 9 to 13 h plus the owner's turns (like-for-like units take 22.9 min, 17.6-41.6, and B1-1
runs 3 at once), inside the window.

## 5. Hand-over points

**The computation (lot sizing: Harris 1913, Wilson's economic order quantity).** A call costs about its context. A
fresh start has context F at call 1, grows g a call and costs R extra to orient (calls that do no work). Over n calls
since a start: cost = R + nF + g n^2/2; per call R/n + F + g n/2; least at **n* = sqrt(2R/g)**, so the context at
hand-over is **W* = F + g n* = F + sqrt(2 R g)**. The cost curve is flat: twice n* costs 25 % more on the R and
growth parts, (x + 1/x)/2.

| Role | F | g | R | n* | W* | What is done |
|---|---|---|---|---|---|---|
| ROOT (Fable session) | 88 K [m: the main sessions of 11-19, 89.6 and 91.4 K, minus 3.6 K Skills: 86-88 K] | 2.3 K [m: Fable mains 11-17] | 359 K [m: E 2] | 17.7 calls | **129 K** (118-148 K; with the weights 1/1.25/0.1/5, about 175 K) | hand over at the first quiet point after W* |
| L1 (Opus helper) | 60 K [m] | 1.3 K [m] | 0.26 M [e: 4 calls x 65 K] | 20 | 86 K | none: it cannot end with children running; B1-1 runs about 38 calls to about 110 K, 1.9 n*, about 0.3 M dearer than optimal, taken |
| Builder (Opus helper) | 59 K [m] | 2.2 K [m] | 0.4 M [e: 0.3-0.6 M] | 19 | 101 K | not adopted as a routine point: a split costs about 15 % less by this formula, but a hand-over mid-edit loses the invariant reasoning (quality first, r57-0003). Adopted instead: the checkpoint at about **330 K** (below) |
| Refuter (Opus helper) | 59 K | 1.6 K [m: E 1b] | 0.3 M [e] | 19 | 90 K | not adopted: a refutation is one fresh context; the 330 K checkpoint applies |
| Readers, runners, extractors | 59 K | 2.2-7.5 K | small | | | they end in 8-17 calls |

**Against the record.** r57-0404's 133 K (coordinator) lies inside the root's range; its 115-155 K for a research
child does not apply (no child sessions here). **Autocompaction does act first in long Opus units** (review finding
2): the app compacts Opus at 368 K (92 % of the 400 K `autoCompactWindow`), and same-kind units reached it under
their limits (`build:U3b` 366 K → 97 K at 12.3 M, `lib:build` 353 K → 99 K at 8.9 M, 4 of S2.2's 5). A compaction
summarises at whatever call it fires, often mid-edit, which this file rejects for builders on quality. Two fixes were
open: a helper `autoCompactWindow` (the documents allow only a lower window, 100,000 or more, through an agent
definition file), or a checkpoint. **Taken: the checkpoint at about 330 K** = 368 K less 10 calls at the builders'
Q3 growth of 3.8 K [c]: the leaf commits to its branch at a quiet point, writes its checkpoint and returns LIMIT;
its parent starts a successor from it. It costs about what a compaction cost (a successor's orientation, about
0.4 M [e], against one compaction call at about 0.37 M [m: one call at 366 K]), so the totals do not move, and it
keeps the hand-over at a point the leaf chooses. Fable and Sonnet compact near the 1M window (G-models).

**Which assumptions fail.** The meter's weights are unknown (if cache reads count at a tenth, W* rises to about
175 K); quality may fall with long context (not measured here; it argues for a lower W*); a hand-over loses detail
(argues against it for builders); g is not constant (a helper's result arrives as a jump); R was measured on four
Opus sessions, not Fable; and a session can hand over only at a quiet point, so the real point is the first quiet
point after W*.

## 6. Widths per level (version 2, r57-0414: run at the smallest)

| Width | L0 | L1 | L2 in B1-1 | L2 elsewhere |
|---|---|---|---|---|
| Memory: (free 14.1 GB - 4 GB floor) / 0.5 GB per suite run; helpers have no process [m, C rows 2, 5] | | | about 20 suites; helpers not counted | same |
| Processor: two suites at once peak 97.6 % [m] | | | 2 suites at once | 2 |
| The lane: 2 slots, for test commands only [r] | | | 2 commands | 2 |
| Ready work [r: BUILD-PLAN order] | 1 | 1 batch at a time (each waits for the suite after the last) | 8 | B0a 4, others 1-2 |
| Collisions [m: r57-0128] | | | **7** by function or block; 8 at statement level after the skeleton (r57-0401, hypothesis) | 2 at most |
| The check, N* = c (S + Z)/S [c], Z = builder time outside it, 22.9 min (17.6-41.6) [m, five fix units] | | | full suite per landing: c = 1, S 264 s: 6.2 (5.0-10.5); c = 2, S 334 s: 10.2 (8.3-17.0). As planned (own test files at landing, one lander, S about 60 s [e]): (60 + 1,374)/60 = 24, not binding | same |
| The lane for the builders' and refuters' own test runs [c]: a width w fits if w <= (2 - l - n_r u_r)/u_b; u_b = a builder's share of time in test calls, 0.30 to 0.40 [m, section 1]; u_r = a refuter's, taken equal [e]; n_r = refuters running on average, 6 T_r / span; l = the landings' share, 8 x 60 s / span; span = 8 x 22.9 min / w + T_r | | | central (u 0.35; T_r 17 min [e], about twice the past median of 8.9 for mutation runs): **3** (n_r 1.3, the lane 80 % busy); 4 at u 0.30 or at T_r 8.9 min; 3 at u 0.40. The smallest is 3. Builders alone would give 4.5 to 6.0 | 2 at most: not binding |
| Token windows | price zero (section 4) | | not binding | not binding |
| Parent's window | the owner | ROOT about 110 K at that point | ROOT under 129 K (an L1, if used, about 110 K at call 38) | ROOT under 129 K |
| 20 running helpers a session [r] | | | 3 builders + up to 6 R = 9 (with an L1, 10) | at most 5 |
| **Width** | **1** | **0, or 1 if the probe passes** | **3** (the lane; the next starts as one returns; re-measured after B0b) | ready work |

If a full suite ran at every landing, the check would bind at about 6 builders; under the testing policy it does not.
The lane binds instead, through the builders' and refuters' own test runs; the collisions (7) come next. The lane's 2
slots are the processor's bound for heavy runs (two suites peak at 97.6 %), and a large unit's own test files side by
side come close to a suite (OUT and CLAIM each touch 7 scripts), so the slots are not raised (`lane/capacity.txt`,
r57-0127). **Re-measured after B0b:** the lane log holds each command's label, `waited_ms` and `ms` (C row 11); from
P0's and B0b's builders and refuters the root computes u_b, u_r and T_r and sets B1-1's width to the largest w that
fits the lane row above.

## 7. Testing policy (r57-0417 folded in, recomputed at S = 264 s)

- A builder runs only its unit's test files, through the main checkout's lane by absolute path, each call under
  150 s, wait included: `--timeout-s` about 1.5 x the same files' last run (140 at most, and 140 the first time)
  and `--wait-s` 145 minus it, so a wait for a slot costs no call; on exit 75 (no slot) it asks again in a new call,
  one more Opus call (0.1-0.25 M).
  `selftest.test.mjs` (270 s alone) runs in two `--test-name-pattern` halves, or in the
  next full suite (P0, S0.4 and CGATE change it).
- A landing (`land.mjs`) merges into the build branch in the build worktree and runs the unit's own test files; a
  failure undoes the merge. Passes are keyed by file hash, so unchanged files are never run again.
- The full suite (8 files side by side, `--timeout-s 600`) runs only before a unit starts whose dependencies landed
  since the last run, and at the end: 5 runs (after slice 0, after B1-1, B1-2, B1-3, at the end), each a background
  command of the root; never two of the build at once, so the other slot keeps serving the builders. r57-0417 grouped
  W5 and W7 with W3 and CLOSE, and W6 and REDO with W4 at the end; here all four join B1-1, since they need nothing
  (r57-0006): the rule and the count are the same.
- Reviews: one blind Opus refuter per unit, beside the next build; W6, REDO, CLOSE and W4 (nothing builds on them)
  reviewed together at the end; a unit goes back only for a breaking finding, the rest on one list fixed at the end.
- **Recomputed.** 5 x 264 s = 22.0 min; one per landing, 17 x 264 s = 74.8 min (at 596 s: 49.7 min against 2 h 49 min).
  One per landing is never cheaper here: the suite already runs before any work is stacked on a new landing, so it
  would save only the search inside a failing batch, a bisection: 2 runs for slice 0's 3 landings, 3 for B1-1's 8 and
  1 for each of the other three batches, 5 + 8 = 13 < 17, at any failure rate. A faulty merge with later merges on it
  is undone with `git revert -m 1 <merge>`. In tokens a run is one root wake, about 0.1 M, so 5 runs about 0.5 M against 1.7 M (r57-0033).
- A suite at each dependency point (W2 starting right after W1, not after the whole batch) was weighed: 8 runs, about
  13 min more lane time and three wakes; it would save perhaps 15-25 min on the longest chain [e], but each such suite
  holds one of the lane's two slots for 264-334 s inside B1-1, where the lane already binds (section 6). Not taken.

## 8. Countermeasures for the failure modes of `check/F-failure-modes.md`

The table has 116 rows (its summary says 115); every id is placed once. The build does not use the tree's scripts to
coordinate: it builds them. It uses the app's own helper mechanism, worktrees, the lane and one landing script.

| Group: ids | What the build uses instead, or why it cannot occur |
|---|---|
| Research content, cannot occur (no web, cards, seeds, mappers or expert votes): P5/G2, P7, P16, P17, P21, F2, N14, N15, G7, G11, G12, U3-F8/U2-F2/U5-PF-1 | Leaves read only this repository's files and the briefs treat file text as data. |
| Research content, code analogue: P1, P2, P3/P20, P13, P15, F1, C, N10 (v2), N11, N12, G3, G9, P18 | A blind refuter in a fresh context reads the design, the diff and the tests, not the builder's reasoning (P1, P2, P15, F1). Tests decide, never a vote, and the refuter mutates one statement per invariant and shows a test fails (P3/P20, P13). Pass criteria are fixed in the brief before the build (N11, N12). Every test result is pass, fail or not-run in `landings.jsonl` (N10, G3). A return schema allows "not stated" (G9). Completeness is the unit list plus the model check (C). Tokens and minutes per node are kept so the tree can be compared with one session later (P18, not decided). |
| Two writers, torn or half-done files: P6, P10, N5 (v2)/C9/O5, N13, FF1/D4a/M6, H1 (fence), Hook-written files, Not covered (FX-OUT), Open fence items | Own worktree and branch per unit (r57-0415's floor); one lander at a time (the root, or the L1 in B1-1 if the probe brings it back; batches never overlap); a result returns as the Agent tool's result, not a file to race; a failed suite undoes the merge; a crash between merge and record leaves a merge with no `landings.jsonl` line, which the next lander re-checks first (P10); runtime formats fixed by the skeleton S0.5 before slice 1 (N13). The fence items are defects the units fix. |
| Duplicate starts, stale coordinators, claims, identity: FF2/D4b/RC, FF4/D3, N1, FX-CLAIM step 7, Lease reading (ii), Q5b loop, F-P1a, F-P1b, F-P1c/PROBE 1(c), F-P1d/N10 (fence), F-P4, F-P7/C4/G4 (fence), F-P8 | A unit is started once, by one parent, through the Agent tool; the returned agent id goes into the batch STATE file in the same call. No session tools below the root. A restarted parent reads STATE and each unit's branch before starting anything again. The F-P probes concern the tree's scripts reading hook input: facts the units need (S0.1), not risks to this tree. |
| Wakes, watchers, alarms, silent stalls: P9, P19, N2 (v2)/M5, N3 (v2)/FF5/M2/D6, N7 (v2)/C2, FF6/D5, FF7/M3, D1/D1b, D2, D6 path 3b/B2, FX-W4 gap (rev 4), D6 path 5-7/B6.1, M2/D6 W-premises, H2 (fence), Hard-killed alarm, W-H4, W-H6/W-H7, W-toast/alert reach, FX-W5 stuck, B5.2, F-P5 | A helper's end notifies the root (helpers of the main conversation run in the background) and a background command's end notifies the root (seen all day; three of three today); a helper's own helpers run in the foreground, so no helper orchestrates unless the probe passes (review finding 1). A background timer of 3 x Q3 of the running units' minutes, re-armed at each wake, wakes the root when no helper ends. A stall: helpers keep every call under 150 s; a parent reads a silent child's transcript tail at its own wakes and treats a child past three times its kind's Q3 minutes as stuck, which it reports up. PC sleep: the root asks the app's keep-awake before each wave (C row 20). An app restart kills helpers (r57-0118): the owner restarts the root from STATE; units resume from their last commit (W-H4: the owner is the only waker of a dead root). |
| Fan-out, slots, cost, windows: P8, P12, P14, FF3/D4c/M4, G1, G4 (v2), G5, G6 (v2), M4-list, N9 (v2), N6 (v2), S | Widths of section 6 (20 helpers, 2 lane slots); limits and reserves of sections 3-4; get_usage before every wave; refuter tokens are inside the plan, so checks are never cut first (G5); points from transcripts at the measured rate, meter readings logged in `build/usage.jsonl` (G4); notices, no polling (G6); a lane command holds no slot while it waits (N9); a unit restarts once by itself, a second time only on its parent's decision (N6); the tree's shape is this file (S). |
| Context windows, hand-over: P4, P11/G8, Coordinator window | Section 5: the root reads its own window (get_usage) and hands over at about 129 K through STATE.md with fixed fields (P4: batch, units, agent ids, commits, landings, suites, meter, next step). An Opus leaf checkpoints at about 330 K context, before the app would compact it at 368 K (review finding 2). |
| Hooks and enforcement reach: G10, F-P2, F-P3, F-P6/O5, F-P9, F-P10c, F-P11, F-P12, W-H2, W-allow, W-helpers, U3 high, Junction no-op, FF extra c/FX-W1 flags | The build relies on the tier hook, the record guard, the start hook and the commit check: preconditions of section 9 (committed, worktree-aware, self-locating). A denial by PreToolUse is seen live (r57-0154, W-H2). Whether a helper's own edits fire the parent's hooks (F-P3, A row 3) need not be probed: each builder commits in its worktree, where the fixed pre-commit check runs. The rest are facts and defects of the tree's scripts that units measure (S0.1) or fix. |
| Process starts, lane, long paths, resumes: 01:42 reset/02:34 stall, Process bursts, LR-1, LR-4, e2e long path, Continuation script (a), Continuation script (b), Resume order | Every test command through the main checkout's lane (a worktree's own lane copy would be a second lane); at most two suites at once; git with `core.longpaths=true`; worktrees under `.claude/worktrees/<unit>` with names of at most 7 characters, so the script folder path is at most 96 characters (e2e fails over 114), inside the folder where helpers' edits are allowed and P0's guard maps them (review finding 6); a commit per unit step, so a reset loses only work since the last commit; a stage is done only when its own `landings.jsonl` line exists (a); one lane command per test group (b); no Workflow resume (section 2). LR-1 and LR-4 are the tree library's lock defects; the lane's own stale break is fixed in P0. |
| The model checker: Model scope, Model fidelity | Slice 2: S2.2 brings the model to the code as built, S2.3 runs it once at the sizes where the fixes act, S2.4 judges. |
| The tree's ledger, stop and close defects: FX-REDO, U2 high, U4 high, FF extra a, FF extra b, F-P10a/N8 (fence), N4 (v2)/N4 (fence) | Units the build fixes (FX-REDO, FX-CLOSE, the coordinator brief in S0.5); the build itself keeps no ledger. A parent never ends while its children run (N4). |
| Self-attested records: N16, W-H5 | `landings.jsonl` is written by `land.mjs`; token counts come from transcripts by a reader that counts only assistant lines with usage, once per message id, and skips unknown kinds (W-H5). |

## 9. Preconditions before the first unit

| # | What | Why (row) | Who | Word needed |
|---|---|---|---|---|
| 1 | P0: record guard maps any worktree of this repo to the main checkout (both inside `.claude/worktrees/` and outside), real-path and form fixes, MultiEdit, a Bash write guard, fail closed when a manifest cannot be read; `pre-commit` runs `check-commit.mjs` beside itself and reads the manifests of the worktree it runs in; `lane.mjs` stale hold above its 1,500 s cap | A rows 4, 7, 9, 11, 13; C row 9 | the root's first helper, build-invariant, Opus, then one refuter, in the main checkout: the hook commands point at the main checkout's files by absolute path, so a fix on a build branch would not change the hooks that run | the commit (next row) |
| 2 | Commit the hook files with P0's fixes: `.claude/settings.json`, `library/.claude/settings.json`, `.claude/hooks/` (tier, routes version 1, record guard, start hook, selftest), `tools/check-commit.mjs`, `tools/git-hooks/pre-commit`, and the plan files `research-tree/ORCHESTRATION.md` and `research-tree/BUILD-PLAN.md` (untracked now; a worktree cut from the commit needs them); then cut the build branch from that commit | A rows 5, 10; B row 7; r57-0156 | the root, on his word | **approve:** (CLAUDE.md git rules) |
| 3 | Each unit's worktree cut from the build branch tip by its parent (`git -c core.longpaths=true worktree add -b u/<unit> .claude/worktrees/<unit> build`, unit names of at most 7 characters, so the script folder path is at most 96 characters; inside the repository, where the helpers' edits are allowed), the builder briefed with the path, no `isolation` flag | coordinator's worktree probe (base 48660877); docs worktrees.md 170-188 | ROOT or L1 | none |
| 4 | Every lane call by the main checkout's absolute path, with `--timeout-s 600` for a side-by-side suite (a background command of the root) and, for a helper's call, `--timeout-s` about 1.5 x the files' last run (140 at most) with `--wait-s` 145 minus it, so wait and run stay under 150 s | C rows 8-10; `lane.mjs` line 20 | in every brief | none |
| 5 | The "3 children" lines: `admit.mjs` `HARD_CEILING`, its test and spec, in FX-CLAIM; `thresholds.json` N_max, N_ceiling and the four "owner" sources, `CONTRACT.md` 554 and `cost-inputs.json` N_cap, in S0.5 | B rows 1-2, 8 | those units | none |
| 6 | `START-HERE.md`, `RULINGS.md` (lane slots, hooks, hand-over figure, tier guide, widths), CLAUDE.md rule 5, the memory index lines | B rows 9-18 | the top session, before the root starts | his go for CLAUDE.md and his memory |
| 7 | Already done: FixFlow skills and agents off (both settings files); tier routes version 1 with orchestrate-deep; selftest 23 of 23 | r57-0036; B row 3 | coordinator | none |
| 8 | The root's start: read get_usage, write the first `usage.jsonl` line, ask keep-awake, arm the wake timer | C rows 20-21; review finding 1 | ROOT | none |
| 9 | The nesting probe, beside B0a and before B1-1 (section 2) | review finding 1 | ROOT | **approve:** with the build's start (an experiment) |

## 10. What changed in BUILD-PLAN.md

- Section 0 and the inputs: the width, the token estimate (22 M, 36 points) and the slice-0 cap are replaced by this
  file's numbers; points per token from E (40 M a point), not 0.62 M; usage 62 %; the hand-over figure computed.
- Section 2: S0.6, W2, W5, W6, W4 move to build-invariant, Opus (B row 4); worktrees are cut from the build branch
  tip, not by `isolation`; builders run only their own test files; the four leaf units are reviewed together; the
  slice-1 order is grouped into batches B1-1 to B1-4 at the suite points; slice 0 lands S0.4 and S0.6, then S0.5;
  W6, REDO and CLOSE land before their combined review; S2.3's runs are the root's background commands. Slices and
  units are unchanged.
- Section 3: a landing runs the unit's test files, each lane call waiting at most 10 s; the full suite runs at the
  5 points, in the root.
- Sections 4-6: widths, tokens and who runs it point here; the root is a Fable session (r57-0035), not an Opus one.
- Section 7: the owner is asked to approve the commit of the hook files, P0 and the plan files, the build's start
  with the nesting probe, and a cap of 15 points; r57-0037's 69 % holds only for r57-0517.
- After the review (section 12): the root runs every batch; B1-1 at width 3; 416 M tokens; S0.2 folded into S0.3;
  the 330 K checkpoint; the bisection and its revert; worktrees under `.claude/worktrees/`; its own section 9 lists
  the findings.

## 11. Not known

- Per-model weights of the meter, and why the week before paid 2-3 times fewer points per token (section 4).
- Whether a helper's children survive the helper's end, and whether SendMessage can extend a finished helper here;
  whether a helper's own helpers can run in the background in any setting (the probe answers for this build).
- How often a leaf reaches 330 K context (2 of the 14 past builders compacted, 4 of the 5 model units), and a
  successor's orientation cost.
- The redo share (10-60 %), how often a landing breaks the suite, and the review time of a fix unit.
- Whether unit size orders tokens (S, M, L mapped to Q1, median, Q3).
- Whether the build's builders spend 30-40 % of their time in test calls, as five past fix units did, and how much
  lane time the refuters' mutation runs take: B1-1's width rests on both (re-measured after B0b); and how many lane
  calls are retried after exit 75 (8 M estimated).
- Per-file times of `lib`, `status`, `watch`, `stop` test files (the first suite's TAP output gives them).
- R for a helper (no orientation count for helpers in the record); the L1 and root token figures are computed, not
  measured, since no helper has orchestrated helpers in a recorded build.
- Whether the tier hook sees a Workflow's agents; whether the record guard reaches a helper's own edits (A row 3).
- Q37 beyond this week: the owner's top-session rate is from 72 hours with half-days from 0.00 to 0.65 an hour.

## 12. Review (r57-0004)

One blind Opus refuter read this file and BUILD-PLAN on 2026-11-19. Six findings stood on their evidence and are
folded in. It found sound: 0.025 points per million (26/1032.5, 13/511.4, 18/698.1), Q37's 0.21 points an hour, the
other roles' medians, quartiles and limits, W* 128.6 K, the 116 failure-mode ids, the hooks reaching helpers and
reloading live, and no design question to the owner.

| # | Finding | What changed |
|---|---|---|
| 1 | A helper's own helpers run in the foreground (`requestShape` "foreground"; hc1-0103's inner helper returned inline after 3.4 s; the documents give the background only to helpers of the main conversation). An L1 blocks on each wave and gets no wakes; a long backgrounded call once stalled a helper for 22 min | The root runs every batch, B1-1 too (+0.42 M). One probe before B1-1 (about 0.5 M) brings the L1 back only if nested children run in the background and none stalls. The root keeps a background timer of 3 x Q3 of the running units' minutes (125 min for builders). If the L1 is ruled out, the root's successors may run on Opus. Sections 0-4, 6, 8, 9 |
| 2 | Autocompaction does act first: same-kind units compacted at 353-366 K, under their limits, mid-edit | An Opus leaf checkpoints at about 330 K context (commit, checkpoint, LIMIT, a successor). A helper `autoCompactWindow` was not taken: it can only lower the window. Tokens about unchanged. Sections 0, 3, 5, 8 |
| 3 | The 8.8 M builder came from 14 builders, 9 of which wrote no tests | Like for like 11.7 M (8.9-17.1 M), limit 29.2 M. Build 347 → 416 M, 8.7 → 10.4 points (low 6.7, high 16.6). Reserve 27.4 → 28.0 M; overrun 157 → 160 M; cap 13 → 15 points. Sections 0, 3, 4 |
| 4 | Width 5 is not the smallest: refuters' mutation runs share the lane; each exit-75 retry costs an Opus call | B1-1 runs 3 at once (4 only at the low ends), re-measured after B0b from the lane log. A helper's lane wait fills the 150 s budget. Retries about 8 M [e]. Sections 0, 4, 6, 7 |
| 5 | A Haiku helper cannot observe Q5: a helper's turn is its task | S0.2 folded into S0.3. S0.3 cites the app's stated rule (sessions start only on the owner's words; a turn run by an automated event is refused; recorded 2026-11-17) with r57-0109. No live observation. Section 2; BUILD-PLAN slice 0 |
| 6 | Minor: worktree edits outside the repository not shown allowed; a bisection over 8 landings needs 3 runs and `git revert -m 1`; the L1's 2 root calls were left out; the commit left the plan files untracked | Worktrees under `.claude/worktrees/<unit>` (at most 96 characters). Bisection 2, 3, 1, 1, 1 (still 13 < 17), with revert. L1 break-even at 4 units; B1-1 +0.42 M. The plan files are named in the commit. Sections 2, 7, 8, 9 |

## 13. After the owner's go (2026-11-19, evening)

The owner's go (r57-0039) asked for three things: use the setting that allows middle orchestrators if it pays; hold
the build to this file; use the machine fully. Each was read or measured before the root started. Where this
section and the sections above differ, this section holds. The GPU is not needed: no step of the build runs on it.

| # | What | Measured or read | Decision |
|---|---|---|---|
| 1 | Fork mode off | `.claude/settings.json` sets `env.CLAUDE_CODE_FORK_SUBAGENT` to `"0"`; the documentation says nested helpers then start in the background (`build/facts/docs-subagents-excerpt.md`). Probe, once, Haiku (`build/facts/nesting.md`): with it off and `run_in_background: true`, a helper's two helpers started in the background (`requestShape` "background", `spawnDepth` 2), ran at once and reported to their parent, not to the main session. A helper ends its run with SubagentHandback, and its own background work did not wake it afterwards; a reply reaches a helper only at its next tool boundary; the parent's waiting by polling cost 1.30 M tokens in 6.4 min (21 calls) [m] | Kept on: it costs nothing and opens helper orchestrators to later work. **No batch orchestrator (L1) in this build:** a helper orchestrator hears from its children only by polling, one re-read of its window per poll, about 20 to 35 polls of 60 to 110 K over B1-1's 45 to 80 min, 1.5 to 3.5 M, against the 0.42 M it would save (section 2) [c]. The probe of slice 0 is done; the L1 row is out of `plan.json` |
| 2 | The root's model | Section 2: without the L1 no node has grandchildren | **Opus, kind orchestrate** (tier routes; r57-0005; r57-0035 is for orchestrators whose children have children). The top session starts the root as a child session (start_session allows Opus), so the build does not wait for the owner to open one; he can open it and talk to it there. Successors still start on his typed turn (section 5) |
| 3 | The lane's slots | `build/facts/lane-and-shards.md` A: 4 test files at once, each 1.06 to 1.15 times its time alone, 3.67 runs' worth of throughput; processor mean 25.9 %, peak 48.6 %; at least 13.1 GB free [m] | `research-tree/lane/capacity.txt` = **4**, the script's maximum (`lane.mjs` line 39). Above 4 not measured |
| 4 | B1-1's width | Section 6's lane row with c = 4: at central shares (u 0.35, times 1.1 for the slowdown at 4; T_r 17 min) the demand is 3.8 of 4 slots at w = 7 and 3.3 at w = 6 [c] | **7 at central shares**, the same as the collisions. `plan.json` keeps 3 until the root re-measures after B0b (section 6) and writes `width B1-1 <n>: <measurement>` in STATE.md. Near a full lane a helper's 145 s wait budget is passed more often, and each exit 75 costs an Opus call: section 4's 8 M of retries grows with the width |
| 5 | The full suite | Same file, B and C: `selftest.test.mjs` (31 tests, 221 s alone) splits into 4 `--test-name-pattern` shards that run at once in 67 to 70 s, all pass, each test once (unique temp folders); the 25 other files at `--test-concurrency=8` beside the 4 shards: **120.4 s**, all pass (987 and 31 tests), processor mean 59 %, peak 93 % [m] | The 5 suites take about 10 min, not 22. The command is `build/facts/lane-measure/shards.cmds`, one background lane command of the root with `--timeout-s 600`. A builder that must run selftest runs its 4 shards at once in one call (about 70 s) |
| 6 | Flaky tests | Row 3's run: `status` T1 (a byte-identical `status.json`) failed once at 4 at once, passed alone twice and in the full suite [m] | A test that fails under load and passes alone is run once more alone; if it passes, it goes on the end list as flaky; if it fails again, it is a fault |
| 7 | Waiting | The probe: the shell tool refuses a standalone `sleep N` and points to an until-loop in the background [m] | The root's wake timer is a background Bash command with an until-loop on the time. A builder's test calls stay in the foreground, each under 150 s (section 7); a helper never ends while it depends on its own background command |
| 8 | Holding the build to this file | `build/units/GATE/result.md`: `.claude/hooks/plan-gate.mjs` reads `research-tree/build/plan.json` (units, batches, widths, dependencies, done forms); 27 tests pass; live, a planned start was refused and SubagentStop fired for a background helper [m] | Every helper of the build starts as `<kind>: <unit id> ...`; the gate refuses a wrong kind or model, a unit whose dependencies are not done, a second live helper for one unit and role, and a batch past its width. It does not check the suites, the order inside a batch, tokens against limits or the isolation flag: the root does (`build/briefs/GATE-USE.md`) |
| 9 | P0 (section 9 row 1) | `build/units/P0/result.md`: the record guard covers worktrees inside and outside `.claude/worktrees/`, Windows path forms, MultiEdit, and writes through Bash and PowerShell, and fails closed on an unreadable manifest; `pre-commit` runs the `check-commit.mjs` beside it, which reads the worktree's and the main checkout's manifests; `lane.mjs` breaks a live hold only above 1,560 s. Selftest 124 of 124 (the old guard fails the 63 new cases), check-commit 8 of 8, lane 5 of 5; 700 real Bash and PowerShell commands of this project allowed, about 42 ms each [m]. Seen, not changed: 1,063 of the 4,042 tracked files under `docs/program/evidence/` are in no manifest, so no hook protects them | The guard's matcher is widened to MultiEdit, Bash and PowerShell in both settings files after the review (row 10) |
| 10 | Review of P0 and the gate | One blind Opus refuter of both (`build/refute/P0-GATE.md`) | Pending when this row was written |
| 11 | Tokens of these steps | Pending | |
