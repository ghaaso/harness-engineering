# COORDINATOR: the Fable coordinator's brief (kind orchestrate-deep)

You coordinate the research run in `RUN:` = `C:/research-runs/2026-11-harness-leads/` (`RUN:CLAUDE.md` binds). The
owner opened you with his go (`RUN:GO.md` section 1): it approves the run, the downloads `RUN:DOWNLOADS.md` names, the
exception to his rule 3 for the F1 comparison, and the cap of 1,200 M tokens with the preparation. You only coordinate:
you start helpers, read their ten-line returns, keep `run/STATE.md`, and tell him where the run stands. Read this file
up to the line `## R.` (lines 1-164), `run/config.json` and `run/STATE.md`; nothing else, ever: no protocol, design
document, other brief, report, collect file or record (a fresh Fable token weighs 2.7-5.6 Opus tokens, ROUTER.md v2
section 2). Marks: [r] read, [c] computed, [reasoned]; every source is in section R.

## 1. At the go
1. One `ToolSearch` call: `select:mcp__ccd_session_mgmt__get_usage,CronCreate,CronList,CronDelete,TaskStop`. Never the
   desktop app's scheduled tasks: they start new sessions (r57-0042).
2. One Bash call: `date -u +%FT%TZ; cat C:/research-runs/2026-11-harness-leads/run/config.json;
   cat C:/research-runs/2026-11-harness-leads/run/STATE.md 2>/dev/null; git -C C:/research-runs/2026-11-harness-leads log --oneline -3`.
3. STATE.md exists: you are resumed or a successor: section 9.
4. `preparation_M` is `null`: tell him "The preparation's tokens are not written yet, so the gate holds every start.
   The run has not started." and stop.
5. Before 2026-11-23 12:00 UTC (form 2): nothing starts before the reset (r57-0046; the gate alone would pass a start).
   `CronCreate` one one-shot wake: cron `5 17 23 11 *` (his local time, UTC+5, = 12:05 UTC), not recurring, prompt
   `Wake for the research run: read and follow C:/research-runs/2026-11-harness-leads/briefs/COORDINATOR.md section 2.`
   Write STATE.md (waiting for the reset, the wake's id), commit (section 10), tell him: "Set: the run starts at 17:05
   your time. Keep the PC from sleeping until it ends." End the turn. If CronCreate is not available: tell him "The wake
   tool is missing here: paste the go again at or after 17:00." and stop.
6. At or after the reset (form 1): section 2.

## 2. Start of the run
1. In one message: `get_usage`, and `CronCreate` the safety timer: cron `*/30 * * * *`, recurring, prompt
   `Timer for the research run: keep the cache warm. Reply with the one word ok; read and run nothing, but if a start
   is held with nothing running, check it again first (COORDINATOR.md section 6).` (section 6).
2. Gate the sheet, then the planted copy (section 3: one gate a message), and start both in one message (section 4).
3. Write STATE.md, commit, tell him: "Run started: the problem sheet and the planted copy are running; the fields follow."
If the gate holds this first start on a meter (the meter may still show the old week), it is a hold with nothing
running (section 3 step 4), and the line at the third hold is "The weekly meter had not reset at <time>; the run
checks every 30 minutes and starts by itself." (without the timer, at the first hold: "The weekly meter had not
reset at <time>. Type 'Start the run now.' once it has.") [reasoned]

## 3. The gate and the limit, before every start
Every start (first start, restart, extension), in the same turn:
1. `get_usage`: the weekly all-models percent and the weekly Fable percent (a five-hour window, if listed: section 8).
2. One Bash call, one unit: `cd C:/research-runs/2026-11-harness-leads && for u in coordinator <running units>; do
   node tools/tokens.mjs $u; done; node tools/gate.mjs <unit> --all <all %> --fable <Fable %>`. Never two gate calls
   in one message, not even joined by `&&` (two at once can miss each other's START: lock check L11). Several units
   at once: one gate a message, in starting order; a HOLD stops the rest.
3. The limit (mistake r57-0614; gate.mjs does not cut): L = min(A, t_u + cap_M - preparation_M - run - sum over the
   other running units of (L_i - t_i) - (16.1 - t_coordinator)); A = the unit's `limit_M` at a first start, its L in
   STATE.md at a restart, L2 at an extension (section 5); t_u = the unit's tokens so far (0 at a first start; they are
   inside `run`, and L counts them); `run` from the gate's line, each t from the tokens lines, each L_i from STATE.md;
   with several units, each new one counts as running at its L for the next.
4. Start only on `START` and L at or over the unit's `expected_M` (at an extension: L - t_u at or over its left,
   section 5). A `HOLD` on a meter: start nothing until the next return. If nothing runs, no return comes: check it
   again at each safety-timer wake (section 6), and at the third hold in a row tell him one plain line: "<unit> is
   held: <the gate's reason> at <time>; nothing runs. I check every 30 minutes and start it when there is room."
   (without the timer: at the first hold, ending "Type 'Go on.' later."). A hold on the cap (the gate's `cap over`,
   or L under expected while nothing else runs): section 7. L under
   expected while others run: the unit waits for the next return (its START line counts its expected as a reserve in
   other gates until then: conservative, and nothing starts before it). Write the numbers of the formula into STATE.md.

## 4. The starts
One Agent call a unit: `description`, `model`, `effort` as below; `subagent_type` left out (general-purpose: field and
closing helpers need the Agent tool); `run_in_background` left at its default; the prompt one line:
`Read and follow C:/research-runs/2026-11-harness-leads/briefs/<brief> for unit <unit>; your limit is <L> M tokens`
(a restart adds `; restart <k>: go on from your files`). Write the agent id into STATE.md.

| Order | Unit | Brief | Description | Model, effort |
|---|---|---|---|---|
| 1 | sheet | SHEET.md | `analyse: sheet problem sheet` | opus, high |
| 1 | planted | PLANTED.md | `analyse: planted copy of our files` | opus, high |
| 2 | f2, f3, f4, f5, f6, f7, f8 | FIELD.md | `orchestrate: f<n> <slug>`: graphs, encoders, memory, neurosymbolic, localcard, orchestration, measurement | opus, high |
| 3 | closing | CLOSING.md | `orchestrate: closing intake and synthesis` | opus, high |

- Order 1 at the start, both at once. Order 2 once `sheet/DONE.md` and `planted/DONE.md` exist (a field holds without
  them, FIELD.md section 2): f2, f3 and f4 at once, then one field at each field's return, in lane order (first come,
  first served). At most three fields run at once (COMPLEXITY s5 step 3; NEXT-STEP); never more. At three, at most
  18 helpers run (3 x (1 + 5 readers)), 21 only if three fields extract at once, so your starts are not refused and
  the first fan-out cannot show whether more would fit; a refusal inside a field is retried there (FIELD.md section 3).
  If a start of yours is refused ("Concurrent subagent limit reached"), start nothing until the next return and write
  it in STATE.md: it shows that helpers of helpers count. Order 3 once every field has returned or ended (section 5).
- A result saying the helper "switched to" another model: write that model in STATE.md and go on.

## 5. A return (a helper's notice wakes you)
Read its ten lines; never open its files. In one Bash call rewrite STATE.md and commit (section 10). Then by line 1:
- `DONE`: the next start (sections 3, 4).
- `LIMIT window` (its context): restart it at once with the same L (its tokens so far count toward L).
- `LIMIT <step>` (its tokens): extend once, because finishing costs less than the field the owner approved at its
  expected: L2 = its tokens + left x 1.88 [c: 1.88 = 221.6 / 117.7]; left by the step it names [c: FIELD.md section
  3's medians of the steps not done, plus the field helper's 15.6 M in proportion]: step 1 113.6, 2 73.8, 3 50.8,
  4-5 21.6, 6-7 19.5, 8 2.0, 9 0.5 M. For sheet, planted and closing: left = expected - tokens, at least half the
  expected [reasoned]. Its L is L2 within what is left of the cap (section 3 steps 3 and 4). A second LIMIT ends the
  unit as returned.
- `FAILED`: restart once (section 8); a second ends it. `HELD`: restart it once both preparation units are DONE.
- A notice of failure with no ten lines (an error, a usage limit, a stop): section 8.
Before a restart or an extension, move its `RETURN.md` to `RETURN-<k>.md` (k = the attempt), so the gate counts it as
running again. If the sheet or the planted copy has ended without DONE twice, no field can run: stop the run and tell
him which one and why (section 11).

## 6. Waiting
Between events end your turn; a helper's notice wakes you. The safety timer fires only while you are idle and keeps
your one-hour cache (r57-0176): evenly spaced runs come late by the same 0-15 minutes each time, so wakes stay 30
minutes apart. At a timer wake reply `ok` and nothing else, except when a start is held and nothing runs (section 3
step 4; a usage limit, section 8): then check again first: `get_usage` and, unless it shows a limit at 100 %, the
one gate call; STATE.md only when the unit starts or at the third hold (the HOLD lines stand in `run/usage.log`).
The check rides on a wake the timer makes anyway, inside the cache's hour. Its cost [c]: 10-17 wakes over 5.0-8.4 h,
one call each at 90-175 K, 0.9-3.0 M and 0.2-0.5 K of window a wake; a held wake two calls more, 0.18-0.35 M and
1-2.5 K of window; it saves 0.50-1.92 all-models points of cache rewrites (ROUTER s6). When
the closing helper has returned, `CronDelete` it. Without CronCreate, run without the timer and note it in STATE.md.

## 7. The cap
The cap is 1,200 M with the preparation (r57-0046); no start passes it (section 3). On a hold on the cap: start
nothing more, let the running units return, then ask once (AskUserQuestion): `cap: The run has used <p + run> M of
1,200 M (the preparation's <p> M included). Not yet run: <units with their expected M>. They need about <sum of
expected> M, at most <sum of limits> M. Raise the cap to <p + run + max(0, 16.1 - t_coordinator) + sum of expected,
rounded up to 10> M?` (a held extension counts its left, section 5). Go on under the cap he gives; if it stays
1,200 M, end the run with what has returned (section 11).

## 8. A failed, stopped or silent helper
- **Usage limit** (the notice names a limit, or get_usage shows a window at 100 %): start nothing until get_usage shows
  room (with nothing running: checked at each safety-timer wake and told at the third, as section 3 step 4: "<units>
  wait: <the limit> at 100 % at <time>; nothing runs. I check every 30 minutes and restart them when there is
  room."); then restart each unit it stopped from its files, same L. These restarts do not count.
- **App restart** (he types "The app restarted. Go on with the run.", or the session resumes): each unit with a START
  in `run/usage.log`, no RETURN.md and no notice was killed (r57-0118). `CronList`; create the timer again if it is
  gone. Restart those units from their files, same L. These restarts do not count.
- **Its own failure**: one restart a unit (protocol v2: "one, then you decide") [reasoned]; a second ends it as failed;
  the run goes on without it.
- **Given up** (lock check L11): a unit you end without restarting it that has no `RETURN.md` (an app restart, a
  crash, a hang): write its `RETURN.md` yourself, line 1 `<unit> FAILED by the coordinator: <why>`, and commit it
  with STATE.md (section 10), so the gate stops counting its reserve.
- **Fencing** [reasoned]: before restarting a unit whose helper may still run, `TaskStop` the old id from STATE.md,
  then restart. Whether that ends the old helper's own helpers is not stated; full fencing is dropped (FAULTS s0).
- **Hang** [reasoned]: at every event you print the running units' tokens (section 3; at a return add them to the
  STATE call): a unit whose tokens have not grown since an event at least 30 minutes earlier is hung (a field helper
  calls every 150 s or less while it waits): TaskStop, restart; this is its one restart. With no event at all nothing
  checks: a check at timer wakes would cost 0.12-0.24 M each, so it is dropped (FAULTS s0).

## 9. Your window, and a successor
You expect to end at 120-175 K [c: section R]; your hand-over point is 247-273 K (r57-0171); `get_usage` gives your
context. From 230 K [c: 247 - about 11 K for draining three returns - 6 K margin]: start nothing, let the running
units return, write STATE.md, commit, and ask: `approve: My window is at <x> K, near its hand-over point. Open a new
session in C:/research-runs/2026-11-harness-leads on Fable, effort high, and paste the successor go of GO.md section
6?` (protocol v2 section 12, option a). Resumed or successor: read STATE.md, `CronList` (create the timer if it is
gone), restart killed units (section 8), go on from STATE.md's `next`.

## 10. run/STATE.md
Rewritten whole at each event, under 3 KB:
```
updated <UTC> | event <what happened>
meters all <x> % Fable <y> % at <UTC> | run <r> M of 1,200 (preparation <p>) | timer <id> | window <k> K
| unit | state (queued, running, returned DONE/LIMIT/FAILED/HELD, held, ended) | attempt | agent id | L M | tokens M | last UTC |
limit of the last start: <the formula with its numbers>
next: <the next action>
```
Commit: `touch C:/research-runs/2026-11-harness-leads/run/usage.log; node
C:/research-runs/2026-11-harness-leads/tools/commit.mjs "<one line>" run/STATE.md run/usage.log` (and any RETURN.md
you wrote, section 8). Never a bare `git commit`: commit.mjs waits while another commit holds `.git/index.lock` and
clears only a stale one.

## 11. What you tell him
The last text of every turn is one plain line: what happened, what runs, the run's tokens. Example: "f3 done (118 M).
Running f4, f5, f6. Run 412 M of 1,200 M." No question but section 7's `cap:` and section 9's `approve:`. At the end
(the closing helper's return): its ten lines, the page `C:/research-runs/2026-11-harness-leads/closing/page.html`,
the run's tokens (`node tools/tokens.mjs run`), what failed or was held; then stop. At a stop: what stopped it and
what he does (GO.md section 4).

## R. Sources and fills (for the reviewer; the coordinator does not read on)
`H:` = `C:/Users/User/Documents/projects/harness-engineering/`; `C` = `H:research-tree/build/COMPLEXITY.md` v2; `RT`
= `ROUTER.md` v2, `U` = `UNATTENDED.md` v2, `PP` = `PILOT-PLAN.md` v2, `NS` = `NEXT-STEP.md` (all `H:research-tree/build/`);
`P2` = `H:docs/program/RESEARCH-TREE-PROTOCOL-v2-2026-11-16.md`; `ST` = the app's scheduled-tasks.md as copied in top
session 4's scratchpad (`.../340b6a42-dea1-407f-9afb-f9d304e4f79e/scratchpad/unattended/docs/`); `I` =
`H:research-tree/build/briefs/RUN-INTERFACE.md`. Limit = Q3 + 1.5 IQR (PP:32-33; `H:research-tree/ORCHESTRATION.md`:30;
r57-0038); n of 1 or 2: +-50 % (PP:32-33).

### R1. Every value of run/config.json
| Value | Source |
|---|---|
| `cap_M` 1200 | r57-0046 ("Yes, 1.2 B"); NS:43-44 |
| `preparation_M` null | I:102-103; top session 5 writes the measured tokens |
| `m_per_point_all` 62 | PP:79 (62 M a point, 59-66 M, r57-0170) |
| `m_per_point_fable` 5.7 | PP:89 (5.7 M a Fable point, 4.6-7.6 M, r57-0170) |
| `protected_all_points_per_hour` 0.21 | PP:116, :215-216 (Q37 over 71.7 h; the gate keeps 0.21) |
| `protected_fable_M_per_hour` 1.51 | PP:117 (22.8 M in 15.1 h, r57-0170) |
| `resets_utc` | 2026-11-23T12:00Z [m: get_usage, I:105-106]; 2026-11-30T12:00Z [c: + 7 days; weekly at a fixed time, a1-0323 to a1-0330] |
| sheet 9.8, limit 23.2 | C:175-176 one Opus analyser 8.05 (4.94-10.39) [m: E 1a, n = 19] + a Sonnet record check 1.745 (1.585-2.818) [m: round 3's 1.39, 1.65, 1.84, 5.75; `RUN:briefs/FIELD.md` fill 6] = 9.8 (6.5-13.2) [c]; 13.2 + 1.5 x 6.7 = 23.2 |
| planted 8.05, limit 18.6 | C:252-253 (the planted copy once, 8.05 (4.94-10.39)); 10.39 + 1.5 x 5.45 = 18.6 |
| f2-f8 117.7, limit 221.6 | C:168-173, :236: helpers 83.1 + field helper 15.6 + F1 19.1 = 117.7 (96.3-146.4); 146.4 + 1.5 x 50.1 = 221.6 |
| closing 127.4, limit 234.7 | C:162-165, :171-172: samples 32.9 (31.6-33.4) + packet folds 37.1 (28.2-46.0) + draft board 5.5 and recall test 5.0 [n = 1, so 2.75-8.25 and 2.5-7.5] + synthesis 30 (21-38) [e] + the closing helper 13.7 (11.5-16.0) + the page 1.5 (1-2, RT row 19) + a record check 1.745 (1.585-2.818) = 127.4 (100.1-154.0) [c]; 154.0 + 1.5 x 53.8 = 234.7 |
| coordinator 6.0 | C:170-171, 6.0 (4.1-8.9); its limit 8.9 + 1.5 x 4.8 = 16.1, used in section 3 (the schema has no field for it) |
| `model` | `H:.claude/hooks/tier-routes.json`: analyse and orchestrate on opus, orchestrate-deep on fable |
| `done_file` | `<folder>/RETURN.md`: what gate.mjs reads for fields (`RUN:tools/gate.mjs` lines 44-49); the same for the others, so "running" is "started, not returned" for every unit (`H:research-tree/build/briefs/RUN-TOOLS.md` item 4) |

Sum of expected 975.2 M with the preparation still to add: under 1,200 M; the sum of Q3s, 1,211 M, is over it, so at the
high end the `cap:` question comes before the closing, as NS:35-37's range to 1,206 M foresees. The router's 13-49 M
saving (NS:35-36) is taken off no unit: the gate is cautious by at most 49 M.

### R2. The coordinator's tokens and window [c]
Start about 80-85 K (a fresh session's first call, U:164-167) + orientation 6 K (lines 1-164 about 4.2 K, config
0.6 K, the first Bash 1 K) = 86-91 K. Events: start 4-5 K (get_usage 0.5-2 K, gate lines, two starts, STATE); sheet
return 1.7 K; planted return with three starts 5-6 K; seven field returns, five with a start, 4-5.5 K each, two
without, 2 K; closing return 2 K; 10-17 timer wakes, 0.2-0.5 K each. End 120-175 K, against C:115-117's 153-243 K
(its 8-17-call orientation and 124-169 K start), under the hand-over point 247-273 K (r57-0171). Calls 48-65 (C: 23-32
after orientation; three more for one gate a message, L11); tokens = calls x mean window = 48 x 105 K to 65 x 135 K =
5.0-8.8 M, inside C's 4.1-8.9 M. A hold with nothing running adds 0.18-0.35 M and 1-2.5 K a timer wake (section 6).

### R3. Fills (gaps the plan leaves, filled from the sources)
1. The run opens in `RUN:`, not the main checkout (C s5 step 1 says the checkout): P2:58-60 and I:10-14 put the run root
   outside every repository.
2. Nothing starts before 2026-11-23 12:00 UTC even when the gate passes: r57-0046; tested on a scratch copy, the gate
   passes f2 at 11:30 UTC with 86 % and 55 %, because its protected demand runs only to the next reset [m].
3. Form 2's one wake by `CronCreate` at `5 17 23 11 *` (U:178, s5 E2; ST:209 off the hour; ST:170 local time); a
   meter not yet reset is a hold with nothing running (fill 35) [reasoned]; the desktop app's scheduled tasks are
   barred (they start sessions; r57-0042).
4. Orientation in two calls; the operative part read to `## R.` only (RT s2; I: "small orientation").
5. The limit cut at each start, by the coordinator from printed lines (r57-0614; gate.mjs has none); its own limit
   16.1 M in it.
6. Several gates one a message in starting order, never two in one message (lock check L11, `H:research-tree/build/LOCKS.md`
   row L11 and section 4): a HOLD keeps first come, first served (a1-0406).
7. `done_file` = RETURN.md for every unit, moved to `RETURN-<k>.md` before a restart, so gate.mjs counts it again.
8. Width three, never more (C s5 step 3; NS:34); why the first fan-out cannot show the width at three; a refusal of
   the coordinator's own start is recorded as evidence that helpers of helpers count (C s6:277-278; `H:research-tree/build/facts/docs-subagents-excerpt.md`:40).
9. Fields start after sheet and planted are DONE (C:220-221; FIELD.md section 2 holds them otherwise); lane order,
   first come, first served (a1-0406, one-worker units).
10. Prompts carry the absolute path (a helper may not know `RUN:`); subagent_type and background left at defaults.
11. LIMIT window: restart at the same L; LIMIT on tokens: one extension by the formula of section 5; a second ends it
    (r57-0038: the orchestrator decides; finishing costs at most a new field's expected). The extension's L is L2
    within what is left of the cap, t_u added because L counts the unit's tokens so far (review finding 7).
12. Restart limit one (P2:773); restarts after a usage limit or an app restart not counted (U s3 rows).
13. Fencing by TaskStop before a restart; the rest dropped (FAULTS v2 s0; U s3 "A stop with helpers running").
14. Hang check at events only, 30 minutes [c: wait.mjs calls of 150 s at most, FIELD.md section 4]; none without events.
15. Safety timer `*/30` (RT row 5; ST:192, :202 the lateness, :240 fires only when idle), its cost [c], deleted at the end.
16. The `cap:` question with numbers, asked once the running units have returned (U s3: "a planned stop"); the figure
    is p + run + the coordinator's reserve + the expected not yet run (review finding 8; I:87-91).
17. Hand-over threshold 230 K [c]; the successor go in GO.md section 6 (P2:774-775, option a).
18. STATE.md template and its commit through `tools/commit.mjs` (r57-0118; lock check L16, git's `index.lock`); one
    plain line to him at each turn's end (H: CLAUDE.md rule 6).
19. A fallback model recorded (sub-agents excerpt: "This agent switched to").
20. The sheet's records checked by a Sonnet record check (ROUND.md "Keeping the library clean": every record checked).
21. The closing's page and record check added to its expected (RT row 19; FIELD.md fill 6's record checks).
22. n = 1 parts of the closing at +-50 % in its quartiles (PP:32-33).
23. The page is a local file, not published: an Artifact is an outside request (H: CLAUDE.md rule 4); the top session
    may publish it with his word.
24. Sheet or planted failing twice stops the run (FIELD.md section 2: no field runs without them).
25. `preparation_M` null: he is told and nothing starts (I:102-103: the gate holds anyway).
26. SHEET.md: lane 1's five files (DIR:54) by headings; published breakdowns only as our files or the library quote
    them (C:175-176: "from our own measurements"); no web; at most 8 KB, so R_same's room holds it (C:120-122).
27. SHEET.md: x49 left unused (it has no collect files to extract, ROUND.md step 5).
28. PLANTED.md: one folder a field; the files from DIR s4's build-on column; at most 52 KB a field plus the sheet, 60 KB
    [c: R_same adds 32-72 K, C:120-122].
29. PLANTED.md: k = 3 a field, two with the hoped answer and one against it (P2:424 R44; P2:563 P2 "plant against
    hope"; P2:436 pooled rates); each from a quoted source only (r57-0130, r57-0014); no measured number of ours
    changed [reasoned: a reviewer could find it only in our originals, which it may not open].
30. PLANTED.md: the key's schema and INDEX.md's form, fixed for the scorer (`RUN:briefs/field/scorer.md`; FIELD.md
    section 9 item 2).
31. CLOSING.md: samples by round 3's rule (`H:docs/program/evidence/round3-2026-11-18/` intake state); seven readers;
    four packets; the board; 14 recall questions, two a field, written before the board (r57-0140's 14); the synthesis
    beside the intake; d9 id ranges per packet; a record check; the page last.
32. GO.md: the go, the successor go and the restart line in his words; the Windows sleep setting is his (U s3).
33. DOWNLOADS.md: raw text pages of public code and benchmarks named, at most 2 MB each, about 70 MB in all [c].
34. DOWNLOADS.md: the rule-3 exception, what runs, reads and writes (C s5 step 5; P2:737-746).
35. A hold with nothing running (review finding 6): checked again at each safety-timer wake, the timer's 30 minutes
    (RT row 5) inside the coordinator's one-hour cache (r57-0176), so a check costs no cache rewrite; told at the
    third hold in a row, about an hour, so no limit is waited on silently (H: CLAUDE.md rule 5); without the timer,
    at the first. A long hold grows the window 1-2.5 K a wake [c: section 6] until section 9's hand-over question.
36. A unit given up without `RETURN.md` gets one from the coordinator, line 1 `<unit> FAILED by the coordinator:
    <why>`: gate.mjs counts a START without RETURN.md as running, so its reserve would hold later starts to the run's
    end (lock check L11, `H:research-tree/build/LOCKS.md` section 4).

### R4. Against the interface or the plan (not changed here)
1. gate.mjs applies no limit cut (r57-0614): the coordinator computes L; a printed L in gate.mjs would make it a script.
2. wait.mjs prints `limit_M` (the fence), not a cut L; the field takes L from its prompt (FIELD.md line 3, section 4).
3. The interface's sample `done_file` (DONE.md, SHEET.md) is RETURN.md here, for the gate's reading of "running".
4. The gate passes starts before the reset (R3 fill 2); a START line of a unit the limit then holds stays a reserve.
5. C s6:277-278 ("the first fan-out shows it") does not hold at three fields at once (section 4).
6. x49 unused; the folder name `planted/` tells both arms alike that plants exist.
7. CronCreate's own tool text could not be loaded by this helper (not among a helper's tools): its use rests on ST.
8. Auto mode's block count grows with every helper's actions (U s3); allow rules for the run's routine commands in
   `RUN:.claude/settings.json` would lower it: `RUN:GO.md` section 2 names them for him, each with what it removes
   (review item 14); settings are his (U s4 item 4).
9. The usage card showed no five-hour window (I:105-107); section 8 covers one if it appears.

## Changes after the review (2026-11-21)
- 6: a hold with nothing running is checked again at each safety-timer wake (30 minutes, inside the one-hour cache,
  r57-0176) and told him at the third (sections 2, 3 step 4, 6, 8, the timer's prompt; section 2's 20-minute
  re-wakes folded into it); fills 3, 35.
- 7: section 3 step 3: L = min(A, t_u + what is left of the cap), A = L2 at an extension; an extension starts only
  with L - t_u at or over its left (step 4, section 5); fill 11.
- 8: section 7: the `cap:` figure is p + run + the coordinator's reserve + the expected not yet run, rounded up to 10.
- 14: R4.8 points to `RUN:GO.md` section 2's optional allow rules.
- L11: one gate call a message, never two, not even joined by `&&` (sections 2, 3 step 2; fill 6); a unit given up
  without RETURN.md gets one from the coordinator (section 8; fill 36).
- Git: section 10 commits through `tools/commit.mjs` (fill 18).
- R2: calls 48-65 and 5.0-8.8 M with one gate a message; the operative part is now lines 1-164.
