# WEEKEND: the research run started on this week's leftover

Helper of top session 6 (build-invariant, Opus), 2026-11-21, from 08:45 UTC. The owner's ruling (top session 2,
08:34:40 and 08:40:10 UTC): start the run now on this week's leftover, continuing at Monday's reset; cap 1.9 B
(r57-0050).

**State: LIMIT (context).** At about 228 K of context and 4.6 M tokens this helper passed the brief's 200 K, so it
stopped after the analysis. **Nothing is applied in the run folder and nothing is committed.** Sections 1-4 hold the
failure modes, the computation with its sources, the weekend's course and the points. Section 5 is the exact change list
for a successor (code, tests, the scratch test, COORDINATOR.md, GO.md, the page), so it need not redo the analysis.
Marks: [m] measured, [r] read, [c] computed. The scripts are in this session's scratchpad,
`C:/Users/User/AppData/Local/Temp/claude/29140a92c6ee6732/5a6626f4-bce5-4d2f-98cd-28ff4d67ca33/scratchpad/weekend/`:
`meter.mjs` (every get_usage reading and every message, once per id, from all project folders), `agg.mjs` (tokens by
session), `fit.mjs` (a window priced by ROUTER.md section 2's H-fit weights), `own.mjs` (sessions' points per hour).

## 1. Failure modes (first)
| # | Failure | Guard |
|---|---|---|
| F1 | A unit still running when the all-models meter reaches 100 % stops on the usage limit; it is restarted from its files after the reset (COORDINATOR s8), the step it was in is redone | This week a unit starts only if its **limit** fits, and every running unit and the coordinator count at their limits less their tokens |
| F2 | His own use is blocked before the reset (the costlier error under quality first, r57-0414's note) | Protect his measured use to the reset, top session 6's, and the reading's hidden fraction (section 2) |
| F3 | The reading is a whole percent: the true value may be up to 1 point above it | 0.5 fixed (the mean offset if the card floors; the bound if it rounds) |
| F4 | The gate prices tokens at 62 M a point; the meter follows fresh tokens (r57-0175). The run's units are 57-74 M a point by the weights (ROUTER s6: e2's 986 M = 13.4-17.3 points); the last preparation rounds came to 40-48 M a point (436 M for 9-11 points, 11-20 06:54 to 11-21 05:41) [m] | Counting at limits covers it: a part's limit is 1.53 times its expected, a map's 2.1, the sheet's 2.4 |
| F5 | The PC asleep while the coordinator waits: Keep computer awake holds only while helpers work; Windows sleeps after 15 idle minutes (CLAUDE.md, This machine); a sleeping PC fires no wake | He sets Windows not to sleep for the run to go on by itself at the reset, or types `Go on.` after 17:00 his time on Monday |
| F6 | A wake that never fires (app restarted or closed, no wake tool, PC asleep at 12:05 UTC) | The same `Go on.`; at an app restart before the reset with nothing running, the coordinator sets the wake again |
| F7 | The five-hour window and the Fable meter | None listed: every reading of 11-21 shows only "Weekly · all models" and "Weekly · Fable" [m]. Fable: 54 % + the coordinator at its limit 30.3 M (5.3 Fable points) + 1.51 M an hour x 49.5 h (13.1) = 72.4 %: not binding [c] |
| F8 | A hold stops the rest (COORDINATOR s3 step 2): a held part (2.42 points at its limit) would keep a map that fits (0.95) from starting | Before the reset, after a HOLD on the all-models meter, gate next the first ready unit with a smaller `limit_M`; equal or larger ones would be held too (the need grows with the limit), so no gate call is wasted. r57-0416: fit is a filter, and for a window that resets in full the reset is the reservation's time; a1-0406, Lifka 1995 (EASY backfilling): the held unit starts first at the reset |
| F9 | The meter has not reset at 12:05 UTC on Monday | As now: a hold with nothing running, checked at each safety-timer wake (COORDINATOR s2's paragraph, s3 step 4) |
| F10 | The idle wait on the 30-minute timer: about 80 wakes to the reset at 1-2.5 K of window each (s6) would pass the 230 K hand-over point | One wake at 12:05 UTC Monday; the safety timer deleted while nothing runs (the brief) |
| F11 | Room that opens later in the weekend (his use under the protection) is not used: nothing checks between the last return and the wake | Accepted [c]: at 0.03 an hour actual the room grows about 0.1 point an hour, a part needs 2.42 + the coordinator's 0.43; a re-check wake costs a Fable cache rewrite, about 0.2 points, and fires only if the PC is awake |
| F12 | The reading turns 91 before the go | Then only the sheet starts at the go (f2m 93.34 vs 92.76; f3m 92.82); f2m and f3m start at later returns if room opens [c] |

## 2. The weekend's protected reserve, from measured rates
**Readings [m: meter.mjs]:** 90 % all models and 54 % Fable from 05:40:41 to 08:41:38 UTC on 11-21 (eleven readings,
top session 6); 89 % from 23:09 UTC on 11-20; both reset 2026-11-23T12:00Z, 51.25 h after 08:45 UTC. The brief's
"11:00 UTC" reading is not among them (the clock read 08:45 UTC at this helper's start).

**Where 0.21 came from [r]:** `research-tree/ORCHESTRATION.md` section 4, Q37: the owner's top sessions (Fable mains in
the product and other folders, the Opus top session 34cb9690), the reset 11-16 12:00 to 11-19 11:40 UTC (71.7 h): 607 M
at 0.025 points per M (40 M a point, that week's all-token fit) = 15.2 points = 0.21 an hour; half-days 0.27, 0.21,
0.65, 0.00, 0.06, 0.08. `PILOT-PLAN.md`:116 and :215-216 kept it over r57-0170's 0.10; COORDINATOR R1 took it from there.

**It does not apply over this weekend [m, c]:**
- Its regime has ended: by the weights its biggest part was Fable mains in the product folder (e24f17dc 8.2 points,
  cf83865e 4.0, a7a94981 2.4); no project folder but this repository has a message after 11-19 12:00 UTC (meter.mjs over
  every folder; no 11-20 or 11-21 timestamp in the product's or the clinic's files).
- Its price, 40 M a point, is that week's all-token fit; the meter follows fresh tokens (r57-0175). By ROUTER.md
  section 2's H-fit (per M fresh: Fable 1.48, Opus 0.43, Sonnet 0.16, Haiku 0.35 points; per M cache read 0.0046), which
  predicts this week's last windows (80 to 90 %: 11.3 for 9-11 read; 88 to 90 %: 2.15 for 1-3; the build's 64 to 80 %:
  16.26 for 15-17; 62 M a point gives 7.0 for the 80 to 90 window) [m: fit.mjs]:

| Window | Sessions | Points | An hour (weights) | An hour (62 M a point) |
|---|---|---|---|---|
| Q37, 11-16 12:00 to 11-19 11:40 (71.7 h) | Fable mains and 34cb9690's main (499 M found) | 19.6 | 0.27 | 0.112 |
| r57-0170, 11-19 16:19 to 11-20 07:25 (15.1 h) | 34cb9690 with helpers, 22e6c7c3 (pipeline diagram) | 2.58 | 0.171 | 0.096 |
| **the last day, 11-20 07:25 to 11-21 08:46 (25.4 h)** | 957a3bc0 (top session 2: main Fable 0.87, main Opus 1.33, helpers 0.84), 34cb9690 0.16 | 3.19 | **0.126** | 0.058 |

  The last day by six-hour block: 1.29, 0.81, 0.87, 0.09, 0.13 points.
- **His use this weekend: 0.126 points an hour [m]**: the last full day (a day and a night; the weekend is two), in the
  regime that holds now (top sessions of this repository only), priced by the weights that fit the meter. r57-0170's
  0.10 is priced at 62 M a point, which undercounts Fable mains (957a3bc0's 8.5 M of Fable main: 0.87 points by the
  weights, 0.14 at 62 M); its own window by the weights is 0.171, an evening and a night of the pipeline-diagram session,
  which has no message since 11-20 07:25.
- **Top session 6 to the reset: 0.5 points [m, c]**: its main (Opus, 5a6626f4): 60 calls, 0.45 points in 11 h of
  orchestration; context about 285 K; after an idle hour a contact rewrites it (170, 211, 222 K measured at 05:24, 07:01,
  08:41) = about 0.29 M fresh = 0.125 points, plus about 5 calls x (15.6 K fresh + 290 K read) = 0.04: 0.165 a contact;
  its close of this round comes before the go (inside the reading); three contacts to the reset.
- **The reading's hidden fraction: 0.5** (F3).

**The weekend's rule:** protected = 0.126 x hours to the reset + 1.0 (0.5 + 0.5); a unit starts only if reading +
(limit - tokens) of every running unit and of the coordinator + the unit's limit, at 62 M a point, is at or under 100 -
protected: the gate's form with limits for expected. The cap check is unchanged (expected). Fable unchanged (1.51 M an
hour, r57-0170). After the first reset nothing changes: 0.21 an hour, expected sizes. **Next week's 0.21 stays [c]:**
by the weights his Monday-Thursday rate was 0.27 and his last day 0.126; even at 0.27, 100 - 0.27 x 168 = 54.6 points of
room holds next week's 23 points.

At the go (about 10:30 UTC, 49.5 h): protected 0.126 x 49.5 + 1.0 = 7.24 points, line 92.76 %. Points at limits
(62 M a point): coordinator 30.3 M 0.49; sheet 23.2 M 0.37; f2m 91.3 M 1.47; f3m, f4m 59.2 M 0.95; a part or field
150.1 M 2.42; closing 395.6 M 6.38.

## 3. The weekend's course, this week's points, next week's need [c]
At 0.126 an hour, the reading floored (true value about 90.6 at the go), units at their expected, maps 0.75-1.2 h:
| When (UTC) | Reading | Gate lines (need vs line) | Result |
|---|---|---|---|
| go, 10:30 | 90 | sheet 90.86 vs 92.76; f2m 92.34; f3m 93.29 (f4m same limit, not gated) | **sheet, f2m START; f3m HOLD** |
| sheet returns, about 11:15 | 91 | f3m 93.63 vs 92.86 (f4m, f5-f8 not gated: same or larger) | nothing new |
| f2m returns, about 12:30 | 91 | f2a 93.86 vs 93.02 HOLD (f2b-d, f5-f8 not gated); f3m 92.40 START; f4m 93.35 HOLD | **f3m START** |
| f3m returns, about 13:45 | 91 or 92 | f2a HOLD; f4m 92.38 vs 93.17 START at 91, HOLD at 92 | **f4m if 91** |
| then | | a part needs 2.42 + 0.43: nothing fits | idle wait, one wake at 12:05 Monday |

- **This week, expected: the sheet, f2m and f3m**, f4m if the reading is still 91 after f3m: 9.8 + 42.8 + 28.0 M (+
  28.0) + the coordinator about 3.5 M (30-35 calls at about 100 K) = **84 M = 1.4 points** at 62 M a point (112 M = 1.8
  with f4m; 1.1-2.0 over the weights' 0.84-1.09); the Fable meter about 0.6 points (3.5 M at 5.7 M a point).
- **At most 4.25 points** (the four units' limits and the coordinator's, 263 M at 62 M a point; 4.6 at the weights' high
  end); the gate admits no more, since each start keeps the meter under 100 - protected.
- Machine time this week 1.5-3.6 h; idle from about 14:00-15:00 UTC Saturday (19:00-20:00 his time) to the wake.
- **Next week: the 12 parts and fields and the closing (and f4m if held): 1,432 M expected** (1,515 less this week's
  84, plus about 0.7 M for the split: the wake's cache rewrite about 0.15 M, 3-6 backfill gates about 0.5 M of reads),
  1,191-1,665 M; **23.1 points** of next week's all-models meter at 62 M a point (19.2-26.9; 22.6 if f4m ran); room at
  the reset 64.7 (100 - 0.21 x 168); Fable about 2.2 points (the coordinator's rest about 12.5 M).
- **Against the cap of 1,900 M:** the preparation 141.6 + the run 1,515 + 0.7 = **1,657 M expected** (1,416-1,890),
  unchanged within the cap.
- Hours from 17:05 Monday his time: 6.7-10.4 h (parts (12 x 1.1-1.8)/3 = 4.4-7.2 h, f4m in one slot if held, closing
  2.3-2.8 h): it ends about 23:50 Monday to 03:30 Tuesday his time.

## 4. What the decisions rest on
- Limits for expected before the reset: F1, F4; r57-0038 (a limit is the known need plus a buffer: the run's units stop
  at it, so it bounds them); r57-0414 (a unit starts only if its usage fits every window it draws on; protect the
  expected later demand to the reset).
- Backfill before the reset only: r57-0416, a1-0406 (F8). After the reset the order is unchanged.
- One wake: the brief; F10, F11.
- His measured rate, not his words: r57-0002. His words ("it's gonna get wasted if we just sit here") agree with a low
  own use but set nothing.

## 5. The change list for a successor (exact)
Commit each item in the run folder as it exists: `node C:/research-runs/2026-11-harness-leads/tools/commit.mjs "<message>"
<paths>`. Tests before the last commit: `node --test tools/*.test.mjs` (46 pass before; about 51 after).

### 5.1 `run/config.json`: after `"protected_fable_M_per_hour": 1.51,` add
```
  "weekend": {
    "until_utc": "2026-11-23T12:00:00Z",
    "protected_all_points_per_hour": 0.126,
    "protected_all_points_fixed": 1.0,
    "note": "Before the first reset this week's all-models meter is a wall: every unit and the coordinator count at limit_M; protected = his use 0.126 points an hour (the last full day, 11-20 07:25 to 11-21 08:46 UTC, by ROUTER.md section 2's weights) + 0.5 top session 6 + 0.5 the reading's whole percent. After it the week rule (0.21 an hour, expected sizes) unchanged. H:research-tree/build/apply/WEEKEND.md."
  },
```

### 5.2 `tools/gate.mjs`
Header: add after line 6: `// Before cfg.weekend.until_utc (WEEKEND.md) every unit and the coordinator count at limit_M on the meters and the
// protected all-models demand is weekend.protected_all_points_per_hour x hours + weekend.protected_all_points_fixed; the
// cap counts expected always; weekend null or absent, or after until_utc: unchanged.`
In `decide()`, replace from `// running = a START slot...` (line 49) to the end of `const nums = ...` (line 70) with:
```js
  // The weekend rule: before weekend.until_utc this week's all-models meter is a wall, so units count at their limits.
  const wkc = cfg.weekend;
  if (wkc != null) {
    if (!(new Date(wkc.until_utc).getTime() > 0)) hold('config field weekend.until_utc is not a date');
    for (const k of ['protected_all_points_per_hour', 'protected_all_points_fixed'])
      if (typeof wkc[k] !== 'number' || !Number.isFinite(wkc[k])) hold(`config field weekend.${k} is not a number`);
  }
  const wk = wkc != null && now < new Date(wkc.until_utc) ? wkc : null;
  if (wk) for (const [u, c] of [...Object.entries(cfg.units), ['coordinator', co]])
    if (typeof c.limit_M !== 'number' || !Number.isFinite(c.limit_M)) hold(`no ${u === 'coordinator' ? u : 'units.' + u}.limit_M in config (the weekend rule counts limits)`);
  const size = c => wk ? c.limit_M : c.expected_M;

  // running = a START slot and no done file: RETURN.md for a field f<n>, units.<u>.done_file for the others (lib.mjs)
  const used = tokensByUnit();
  const tok = u => (used.get(u) ? used.get(u).total : 0) / 1e6;
  const running = runningUnits(cfg, slots).filter(u => u !== unit);
  const reserves = running.map(u => ({ u, model: cfg.units[u].model, r: Math.max(0, size(cfg.units[u]) - tok(u)), e: Math.max(0, cfg.units[u].expected_M - tok(u)) }));
  reserves.push({ u: 'coordinator', model: 'fable', r: Math.max(0, size(co) - tok('coordinator')), e: Math.max(0, co.expected_M - tok('coordinator')) });
  const resAll = reserves.reduce((s, x) => s + x.r, 0);
  const resFab = reserves.filter(x => x.model === 'fable').reduce((s, x) => s + x.r, 0);
  const resCap = reserves.reduce((s, x) => s + x.e, 0);
  const unitM = size(uc);
  const unitFab = uc.model === 'fable' ? unitM : 0;

  const protAll = wk ? wk.protected_all_points_per_hour * hours + wk.protected_all_points_fixed : cfg.protected_all_points_per_hour * hours;
  const protFab = cfg.protected_fable_M_per_hour * hours / cfg.m_per_point_fable;
  const needAll = rdAll + resAll / cfg.m_per_point_all + unitM / cfg.m_per_point_all;
  const needFab = rdFab + resFab / cfg.m_per_point_fable + unitFab / cfg.m_per_point_fable;
  const limAll = 100 - protAll, limFab = 100 - protFab;
  const runTok = totalOf(used).total / 1e6;
  const needCap = runTok + resCap + uc.expected_M;
  const limCap = cfg.cap_M - cfg.preparation_M;

  const atl = wk ? ' at limits' : '';
  const pw = wk ? `: ${wk.protected_all_points_per_hour} an hour + ${wk.protected_all_points_fixed} fixed, the weekend rule to ${wk.until_utc}` : '';
  const nums = `all ${f2(needAll)} vs ${f2(limAll)} (reading ${f2(rdAll)} + reserve ${f2(resAll / cfg.m_per_point_all)} + unit ${f2(unitM / cfg.m_per_point_all)} points${atl}; protected ${f2(protAll)} to reset in ${f2(hours)} h${pw}); `
    + `fable ${f2(needFab)} vs ${f2(limFab)} (reading ${f2(rdFab)} + reserve ${f2(resFab / cfg.m_per_point_fable)} + unit ${f2(unitFab / cfg.m_per_point_fable)} points; protected ${f2(protFab)}); `
    + `cap ${f2(needCap)} vs ${f2(limCap)} M (run ${f2(runTok)} + reserve ${f2(resCap)} + unit ${f2(uc.expected_M)}; cap ${cfg.cap_M} less preparation ${cfg.preparation_M}); running: ${running.join(',') || 'none'}`;
```
Without `weekend` the printed numbers are as before (resCap = resAll), so the 13 gate tests stand.
`tools/README.md`, the gate's line: add "Before `weekend.until_utc` (config `weekend`) units and the coordinator count at
`limit_M` and the all-models protection is `weekend.protected_all_points_per_hour` x hours + `protected_all_points_fixed`
(`at limits` and `the weekend rule` in the line); the cap counts expected always."

### 5.3 `tools/gate.test.mjs`: add (SAMPLE: sheet 20/40, f2m 42.8/91.3, f2a 98/150.1, coordinator 30/60)
```js
const WK = { ...SAMPLE, weekend: { until_utc: '2026-11-23T12:00:00Z', protected_all_points_per_hour: 0.126, protected_all_points_fixed: 1 } };
const SAT = { GATE_NOW: '2026-11-21T10:30:00Z' }; // 49.5 h before the reset
test('weekend rule: the unit and the coordinator at their limits; protected = rate x hours + fixed; the cap at expected', () => {
  const r = gate(tmpRun(WK), 'sheet', 90, 54, SAT);
  assert.match(r.out, /^START sheet: all 91\.61 vs 92\.76 \(reading 90 \+ reserve 0\.97 \+ unit 0\.65 points at limits; protected 7\.24 to reset in 49\.5 h: 0\.126 an hour \+ 1 fixed, the weekend rule to 2026-11-23T12:00:00Z\)/);
  assert.match(r.out, /cap 50 vs 1100 M \(run 0 \+ reserve 30 \+ unit 20;/);
});
test('weekend rule: a running unit is reserved at its limit less its tokens; held where the expected would pass', () => {
  const t = tmpRun(WK);
  slot(t, 1, 'f2m');
  helper(t.folder, 's1', 'a1', 'orchestrate: f2m graphs', [['m1', 0, 0, 11_300_000, 0]]); // 11.3 M used: reserve 80 + coordinator 60
  assert.match(gate(t, 'f2a', 88, 54, SAT).out, /^START f2a: all 92\.68 vs 92\.76 /);  // 88 + 140/62 + 150.1/62
  const r = gate(t, 'f2a', 89, 54, SAT);
  assert.match(r.out, /^HOLD f2a: all-models meter over: all 93\.68 vs 92\.76/);       // expected sizes, same protection: 91.57, a pass
});
test('weekend rule ends at until_utc: the week rule unchanged', () => {
  const r = gate(tmpRun(WK), 'sheet', 10, 10, { GATE_NOW: '2026-11-23T14:00:00Z' }); // 166 h to 11-30 12:00
  assert.match(r.out, /^START sheet: all 10\.81 vs 65\.14 \(reading 10 \+ reserve 0\.48 \+ unit 0\.32 points; protected 34\.86 to reset in 166 h\)/);
  assert.doesNotMatch(r.out, /weekend|at limits/);
});
test('weekend fields: a non-number or a bad date holds; weekend null is the week rule', () => {
  assert.match(gate(tmpRun({ ...WK, weekend: { ...WK.weekend, protected_all_points_fixed: '1' } }), 'sheet', 1, 1, SAT).out, /^HOLD sheet: config field weekend\.protected_all_points_fixed is not a number/);
  assert.match(gate(tmpRun({ ...WK, weekend: { ...WK.weekend, until_utc: 'Monday' } }), 'sheet', 1, 1, SAT).out, /^HOLD sheet: config field weekend\.until_utc is not a date/);
  assert.doesNotMatch(gate(tmpRun({ ...WK, weekend: null }), 'sheet', 1, 1, SAT).out, /at limits/);
});
```
Check each figure when run: the sheet 90 + 60/62 + 40/62 = 91.61; 100 - (0.126 x 49.5 + 1) = 92.76; f2a 88 + (79.99 + 60 +
150.1)/62 = 92.68 (the helper's 11.3 M counts as its total); after the reset 10 + 30/62 + 20/62 = 10.81, 0.21 x 166 =
34.86 (a time giving 167.5 h would print 35.17, a float). The second test's first gate makes f2a's slot; the second gate
excludes f2a from its own reserves, so both lines see the same reserves.
Adjust a literal only to what the code prints, never the rule. A test that `HOLD` is exit 1 is already there.

### 5.4 The scratch test (outside the run folder; the real config with 5.1 applied)
```
S=C:/Users/User/AppData/Local/Temp/claude/29140a92c6ee6732/5a6626f4-bce5-4d2f-98cd-28ff4d67ca33/scratchpad/weekend/scratch-run
mkdir -p $S/run $S/_projects && cp C:/research-runs/2026-11-harness-leads/run/config.json $S/run/
cd C:/research-runs/2026-11-harness-leads && for u in sheet f2m f3m f4m f5 f2a; do RUN_ROOT=$S CLAUDE_PROJECTS=$S/_projects node tools/gate.mjs $u --all 90 --fable 54; done
```
(One call; each START takes a slot in `$S/gate/`, so each later unit sees the earlier ones running, as the coordinator's
order would.) Expected at about 10:00-11:00 UTC: sheet and f2m START, f3m, f4m, f5, f2a HOLD on the all-models meter
(f3m 93.29). Write the six lines into section 6 below.

### 5.5 `briefs/COORDINATOR.md`
1. Line 7: "(lines 1-209)" to the new line of `## R.`.
2. Section 1 step 5, replace whole: "5. Before 2026-11-23 12:00 UTC (form 2): the run starts now on this week's leftover
   (the owner, 2026-11-21: start it now, continuing at Monday's reset): section 2. The gate's weekend rule (`weekend` in
   `run/config.json`) counts every unit and you at your limits and protects his use to the reset; section 3 step 4 says
   what a hold does before the reset."
3. Section 2 step 3: the line becomes "Run started: <units started> running; <units held> wait for room or for the
   reset; the parts and fields 5 to 8 follow." The paragraph "If the gate holds this first start on a meter" begins "At or
   after the reset (form 1):"; add "Before the reset a hold with nothing running is the idle wait (section 6)."
4. Section 3 step 2, after "a HOLD on a meter or the cap stops the rest.": "Before 2026-11-23 12:00 UTC a HOLD on the
   all-models meter does not stop the rest: gate next the first ready unit in order whose `limit_M` is smaller than that
   of every unit held in this turn (one of equal or larger limit would be held too); the held units start first at the
   reset (r57-0416)."
5. Section 3 step 4, after "A `HOLD` on a meter: start nothing until the next return.": "Before 2026-11-23 12:00 UTC with
   nothing running: the idle wait (section 6)."
6. Section 6, add at its end:
   "**The idle wait before the reset.** When nothing runs and the gate holds every ready unit before 2026-11-23 12:00
   UTC: `CronDelete` the safety timer; `CronCreate` one one-shot wake: cron `5 17 23 11 *` (his local time, UTC+5, =
   12:05 UTC), not recurring, prompt `Wake for the research run: the weekly reset has passed; read and follow
   C:/research-runs/2026-11-harness-leads/briefs/COORDINATOR.md section 6, the reset wake.` Write STATE.md (event `idle
   until the reset`, the wake's id, next `the reset wake`), commit (section 10), tell him: "This week's room is used:
   <units> done; <units> wait for the reset. The run goes on by itself at 17:05 your time on Monday if the PC is awake;
   otherwise type `Go on.` after 17:00." End the turn; no other wake before the reset (one every 30 minutes costs 1-2.5 K
   of window each, about 80 to the reset). Without CronCreate the same, the line ending "No wake tool here: type `Go on.`
   after 17:00 your time on Monday."
   **The reset wake** (the wake's prompt, or his `Go on.`, at or after 12:00 UTC on 2026-11-23): `CronList`, delete the
   wake if still listed; `CronCreate` the safety timer (section 2 step 1); then section 3 for the ready units in order
   (the week rule applies by itself after the reset; a meter still on the old week: section 3 step 4). A `Go on.` before
   12:00 UTC: `get_usage` and the first held unit's gate; on a HOLD tell him "Still held: <the gate's reason>. The wake
   at 17:05 stands." and end the turn."
7. Section 8, App restart: after "create the timer again if it is gone" add "(before the reset with nothing running, the
   wake instead, section 6)".
8. R1: a row `weekend` (until 2026-11-23T12:00Z, 0.126 an hour, 1.0 fixed): WEEKEND.md section 2; the 0.21 row adds
   "next week's, after the first reset; not this weekend (WEEKEND.md section 2)".
9. R3 fill 2: "Before the reset the run starts on this week's leftover (the owner, 2026-11-21 08:34-08:40 UTC, top
   session 2) under the gate's weekend rule (WEEKEND.md); r57-0046's not-before rule is lifted." Fill 3: "The idle wait's
   one wake by `CronCreate` at `5 17 23 11 *` (U:178; ST:209 off the hour; ST:170 local time); the desktop app's
   scheduled tasks are barred (they start sessions; r57-0042)." R4.4: "The gate passes starts before the reset under its
   weekend rule (R3 fill 2)."
10. A section at the end: "## Changes for the weekend start (2026-11-21, helper of top session 6;
    `H:research-tree/build/apply/WEEKEND.md`)" listing items 2-9.

### 5.6 `GO.md`
1. Opening: "Paste it now: the run starts on this week's leftover and goes on at the weekly reset, Monday 23 November
   17:00 your time (form 2); or paste it at or after the reset (form 1)." Keep the tokens sentence.
2. Section 1, the go: unchanged (it names no time).
3. Section 2: "Keep computer awake" bullet unchanged; the form 2 bullet becomes "For form 2: once nothing runs, Windows
   sleeps after 15 idle minutes and a sleeping PC fires no wake. For the run to go on by itself at the reset, set Windows
   not to sleep on mains power (Windows Settings, System, Power) until the run ends, and set it back afterwards (the app
   cannot set it); otherwise type `Go on.` in the coordinator's session after 17:00 your time on Monday." The last bullet:
   "`run/config.json` holds the measured preparation, 141.6 M; the cap stays 1.9 B."
4. Section 3: Form 2: "paste it now. What fits this week starts at once: at today's 90 %, the problem sheet and the map of
   field 2, then the map of field 3, and of field 4 if there is room; the rest waits for the reset. About 1.4 points of
   this week's 10 left (at most 4.3); your own use keeps 0.126 points an hour to the reset plus 1 point. When nothing
   more fits, the coordinator sets one wake at 17:05 your time on Monday." Remove "Nothing starts before the reset in
   either form." The end: "From 17:05 on Monday the rest takes about 6.7 to 10.4 hours, ending about 23:50 Monday to
   03:30 Tuesday your time."
5. Section 4, rows: "This week's room is used (form 2) | "This week's room is used: ... The run goes on by itself at 17:05
   ..." | Nothing. If the PC slept, type `Go on.` after 17:00 on Monday"; "Monday 17:05: the PC slept or the app was
   closed | no line after 17:05 | Type `Go on.` in the coordinator's session after 17:00 (after an app restart: `The app
   restarted. Go on with the run.`)"; the wake-tool row: its line "No wake tool here: type `Go on.` after 17:00 your time
   on Monday." and the action "Type `Go on.` after 17:00 on Monday"; the app-restart row loses the form 2 sentence.
6. Section 5: "This week about 1.4 points of the all-models meter (at most 4.3; 84 M tokens) and 0.6 Fable points; next
   week about 23.1 points (19.2 to 26.9; 1,432 M tokens) and 2.2 Fable points; with the preparation 1,657 M of the 1.9 B
   cap."
7. A changes section at the end.

### 5.7 The page (https://claude.ai/artifact/J2EcMdZR1uSQ6KLp7VGJWu; source `research-tree/build/page/go-page.html`)
Read it first (Artifact `read`); change only: start now (form 2 is the leftover start); this week's points (about 1.4,
at most 4.3, of the 10 left; his use protected 0.126 an hour + 1); next week's (about 23.1 points, 1,432 M; 1,657 M of
1.9 B with the preparation); the PC and Monday step (Windows not to sleep, or `Go on.` after 17:00 Monday). Publish to the
same url, no icon. Plain words, numbers first.

## 6. Results of the scratch test, commits, test count
Not done (LIMIT). The go text is unchanged (GO.md section 1). His settings: Fable, effort high, Auto mode; Windows not to
sleep on mains power until the run ends (or `Go on.` after 17:00 on Monday).

## Applied (the successor helper of top session 6, 2026-11-21 from 09:05 UTC)
Reading at 09:15 UTC [m: get_usage]: all models 90 %, Fable 54 %, both reset 2026-11-23T12:00Z. The brief's two
corrections, decided here; the helpers named below apply them (this helper's window was at 184 K after the reading).

### A. The basis of the rate (correction b) [m: scratchpad `weekend/msgs.jsonl`, `apply/desc.mjs`, `apply/turns.mjs`, `apply/win.mjs`]
- **0.126 an hour counts**: top session 2, 957a3bc0 (main Opus 1.33, main Fable 0.87, helpers 0.84 points) and top
  session 1's last two typed turns, 34cb9690 (0.16): 3.19 points in 25.35 h (11-20 07:25 to 11-21 08:46 UTC), by
  ROUTER.md section 2's weights. It leaves out the window's five other sessions: 340b6a42 126.5 M, 0fedf9f2 74.2 M,
  5a6626f4 63.7 M (top session 6: its widening round and helpers), 2e993f56 38.0 M, 6a2a6154 35.2 M (the rounds top
  session 2 started; 429 M in all with the two counted).
- **One one-off round is inside it**: top session 2's pilot-plan round, 11-20 08:59 to 10:34 UTC: helpers "analyse:
  pilot plan and token cap" 0.37, "refute: blind review of the pilot plan" 0.20, "analyse: fold the review into the
  pilot plan" 0.15, "build: owner page for the pilot plan" 0.02, and the main's turns that ran and closed it (page,
  commit, record r57-0419) 0.39: **1.13 points**. It planned this run, which is now built and approved: it does not
  recur this weekend.
- **Without it: 2.06 points in 25.35 h = 0.081 an hour** (his typed turns in top sessions 1 and 2, the notices of the
  top sessions he started, his Fable discussion of 17:56-21:41 (0.87), the map and PDF builds he asked for (0.10)).
- **Choice: 0.081** (r57-0002: a parameter from measurement against the objective; r57-0813: spending this week's room
  at once finishes the same units sooner, so a reserve padded with a round that does not recur only wastes the leftover
  he asked to use). The fixed 1.0 stays (top session 6's 0.5 to the reset, the reading's whole percent 0.5).
  At 11:00 UTC (49 h): protected 0.081 x 49 + 1 = 4.97, line 95.03 (with 0.126: 7.17, line 92.83).

### B. The fit time and the wakes (correction a)
- **Gate**: under the weekend rule a HOLD on a meter (not on the cap) ends `; fits at <YYYY-MM-DDTHH:MMZ> (wake cron <m>
  <h> <d> <mo> * local)` or `; fits not before the reset (wake cron <cron of until_utc + 5 min> * local)`. Fit time = the
  later of the two meters' times at which the line reaches the need at the current reading and reserves: all models
  `reset - (100 - fixed - needAll) / rate` hours; Fable `reset - (100 - needFab) x m_per_point_fable /
  protected_fable_M_per_hour` hours (a meter not over gives a time not after now); rounded up to the whole minute; at or
  after `until_utc`, or a rate of 0 with the need over: not before the reset. The cron is the machine's local time (the
  wake tool reads local time; ST:170). With the cap over: no fit clause (section 7). After `until_utc`: unchanged.
- **Coordinator**: before the reset, when a turn ends with nothing running and every unit it gated held on a meter:
  `CronDelete` the safety timer, `CronCreate` one one-shot wake at the earliest `fits at` of the units held in that turn
  (their printed cron), or the 12:05 UTC Monday wake if every one says not before the reset; no 30-minute timer while
  nothing runs. At the wake: delete it if still listed, `get_usage`, gate the held units in order (backfill rule, F8);
  a START creates the safety timer again; all held again: a new wake at the new earliest time. While units run, nothing
  changes: each return gates again. The 12:05 UTC Monday wake is the reset wake (week rule).
- **Cost of a wake** [c]: after an idle hour the coordinator's cache is rewritten, about 100-130 K fresh Fable tokens =
  0.15-0.19 all-models points by the weights (0.02 Fable points), plus 4-5 calls at about 3 K fresh each; the gate
  prices it at 62 M a point (0.002). The computation of this week's points counts wakes at the weights.

### D. Applied in the run folder (code, tests, scratch test)
Helper (build-invariant) of the helper of top session 6, 2026-11-21. In C:/research-runs/2026-11-harness-leads, each file committed by tools/commit.mjs as it was done:
- c919eea run/config.json: 5.1 with protected_all_points_per_hour 0.081 (not 0.126), fixed 1.0, until 2026-11-23T12:00:00Z; the note gives Applied A's basis (0.081: top sessions 1 and 2 over 11-20 07:25 to 11-21 08:46 UTC without the pilot-plan round, 2.06 points in 25.35 h; 0.126 with it).
- cce1db1 tools/gate.mjs, tools/README.md: 5.2 as written, plus Applied B's fit clause on a meter's HOLD under the weekend rule: "; fits at YYYY-MM-DDTHH:MMZ (wake cron m h d mo * local)" or "; fits not before the reset (wake cron [until_utc + 5 min] * local)"; the later of the two meters' times, rounded up to the minute; none with the cap over; none after until_utc or without weekend. Header comment and the README's gate line updated.
- db27bbc tools/gate.test.mjs: 5.3's four tests with every literal from the printed lines at 0.081 and checked by hand in comments (line at 10:30 UTC 94.9905, printed 94.99; protected 5.01), and three fit tests: the sheet at 94 holds, fits at 2026-11-21T18:12Z (hand: (99 - 95.6129)/0.081 = 41.816 h before the reset = 18:11:02, up to 18:12); at 18:12 with 94 START (95.61 vs 95.61: 95.6129 under 95.6142); with 95 HOLD, fits at 2026-11-22T06:32Z (29.470 h before = 06:31:47); f2a at 96 (99.39 over 99) fits not before the reset, cron of 12:05 UTC; the Fable meter binding later (Fable 80: 2026-11-22T00:15Z over the all-models 18:12); no clause on the cap, after until_utc or without weekend. The cron is checked with the Date local getters.
- 7a76f69 briefs/COORDINATOR.md: 5.5 items 1-10, item 6 per Applied B (the idle wait's one one-shot wake at the earliest printed fit time of the units held in that turn, or the reset wake at 12:05 UTC Monday; no 30-minute timer while nothing runs; the fit wake: delete, get_usage, gate in order with the backfill rule, a START creates the safety timer again, all held again a new wake and one plain line; the reset wake). Line 7: lines 1-243.
Tests: ℹ pass 53 ℹ fail 0 (46 before, 53 now).

Scratch test (scratchpad apply/scratch-run, the real config copied, GATE_NOW 2026-11-21T11:00:00Z, all 90, Fable 54, one call; 49 h: protected 0.081 x 49 + 1 = 4.97, line 95.03; the coordinator at 30.3 M; Fable 59.32 vs 87.02 on every line; four slots made, none for the held):
| Unit | Gate | All models: need vs line (reserve + unit, points at limits) | Fit time |
|---|---|---|---|
| sheet | START | 90.86 vs 95.03 (0.49 + 0.37) | - |
| f2m | START | 92.34 vs 95.03 (0.86 + 1.47) | - |
| f3m | START | 93.29 vs 95.03 (2.34 + 0.95) | - |
| f4m | START | 94.25 vs 95.03 (3.29 + 0.95) | - |
| f5 | HOLD | 96.67 vs 95.03 (4.25 + 2.42) | 2026-11-22T07:12Z (wake cron 12 12 22 11 * local) |
| f2a | HOLD | 96.67 vs 95.03 (4.25 + 2.42) | 2026-11-22T07:12Z (wake cron 12 12 22 11 * local) |
By hand: 90 + 413.3/62 = 96.6661; (99 - 96.6661)/0.081 = 28.813 h before the reset = 11-22 07:11:12 UTC, up to 07:12 (12:12 local, UTC+5). As the brief expected.

Deviations: (1) 5.3's second test reads 90 and 91 (was 88 and 89): at 0.081 the line is 94.99, so 89 (93.68) would pass; 90 starts (94.68), 91 holds (95.68) where expected sizes give 93.57, a pass: the test's meaning kept, the rule unchanged. (2) Section 3 step 2 says the held units come first at the next gate (a return or a wake) and start first at the reset, since with fit wakes they may start before it. (3) A Go on. before the reset runs the fit wake's steps (not "the wake at 17:05 stands"), and an app restart before the reset with nothing running runs them too: the wake's time comes from a new gate. (4) R3 fill 3 keeps fill 35 (a meter not reset at the reset wake: a hold with nothing running; F9). (5) node here ignores TZ (America/New_York gave the same local hour), so the tests' zone independence holds by construction (local getters), not by a run in another zone. (6) The fit time is compared with until_utc, as Applied B says; it equals the first reset in the config. RUN:GO.md and the page were not touched.

### C. This week's points, next week's need, the cap (with the rising line and the wakes)
Helper (analyse) of a helper of top session 6, from 09:15 UTC. **State: LIMIT (context 171 K at call 16, over the brief's 160 K). The computation is done (below); GO.md and the page are not changed; nothing committed.** Script: scratchpad `apply/course.mjs` (`--table`, `--his r`, `--r0 x`, `--mix e|l|x`, `--sweep`, `--part h --close h`).

**Inputs [r, c].** Go 11-21 11:00 UTC, reset 11-23 12:00 UTC (49 h). Gate as committed (cce1db1): need = card + (running units' and the coordinator's limit_M less their tokens + the unit's limit_M)/62, line 100 - (0.081 x hours + 1.0); Fable never binds; fit clause as B. Card = true reading floored; true 90.5 at the go (90.0, 90.99) + his 0.081 an hour + top session 6's 0.5 spread to the reset + units' tokens/62 (linear over the run) + the coordinator by the weights (1.48 per M fresh, 0.0046 per M read). Units at expected_M (limit_M for "at most"). Sheet 0.75 h, f2m 1.2, f3m f4m 0.75, parts and fields 1.45 (1.1-1.8), closing 2.55 (2.3-2.8). COORDINATOR s4 order and slots, F8 backfill, B's wakes, 2 minutes a start. Coordinator: go 90 K fresh + 14 calls reading 65 K; an event 4 calls at 3 K fresh + its context (100 K, +3 K an event, at most 130 K); a context rewrite at an event after an idle hour; a 30-minute timer fire while units run, 1 call at 2 K + context. Next week = units not done at expected + the coordinator's 15.3 M less its week outside the idle wakes + the reset wake; ranges = GO.md's 1,274-1,748 M shifted alike.

**By hand, 11:00, card 90:** line 100 - (0.081 x 49 + 1) = 95.03; sheet 90 + 0.49 + 0.37 = 90.86, f2m 92.34, f3m 93.29, f4m 94.25: all four START (model, with the go's 1 M and 2 min a start: 90.85, 92.31, 93.24, 94.15).

| UTC (his time) | Event | Reading true, card | Line | Gates: need | Coordinator points |
|---|---|---|---|---|---|
| Sat 11:00 (16:00) | go | 90.64, 90 | 95.03 | sheet, f2m, f3m, f4m START | 0.14 |
| 11:45 (16:45) | sheet returns | 92.10, 92 | 95.09 | no free slot | 0.02 |
| 11:49, 11:51 | f3m, f4m return | 92.25, 92.31; 92 | 95.10 | f3a 96.42, 95.87 HOLD | 0.04 |
| 12:14 (17:14) | f2m returns | 92.59, 92 | 95.13 | f2a 94.86 START; f2b 97.25 HOLD | 0.02 |
| 13:41 (18:41) | f2a returns | 94.33, 94 | 95.25 | f2b 96.85 HOLD, fits Sun 09:27 | 0.02 |
| Sun 09:27 (14:27) | wake | 96.33, 96 | 96.85 | f2b 98.84 HOLD, fits Mon 10:01 | 0.19 rewrite |
| Mon 10:01 (15:01) | wake | 98.77, 98 | 98.84 | f2b 100.83 HOLD, not before the reset | 0.20 rewrite |
| Mon 12:05 (17:05) | reset wake | new week | week rule | f2b, f2c, f2d START | 0.20, next week |

**Figures (expected) [c].**
- This week: sheet, f2m, f3m, f4m, f2a (5 of 17), 206.6 M = 3.33 points + the coordinator 0.65 by the weights (5.0 M: go 0.14, returns and timer fires 0.12, two wakes 0.39) = **4.0 points, 211.6 M**; Fable 0.9. Machine time 11:00-13:41 UTC; reading at the reset 98.95.
- At most: every unit at its limit 4.4 (f2a then held); the worst course found (the first four a fifth of the way from expected to limit, f2a still starts and runs to its limit) **5.0** (5.5 at a true 90.0); the gate's bound for any course about 99 - 90 = 9, reached only if his use is lower (his use 0: worst 8.5-9.0).
- Wakes: **Sun 09:27 UTC (14:27 his time), Mon 10:01 UTC (15:01)**, both held, 0.39 points (in the 4.0); the reset wake Mon 12:05 UTC (17:05), 0.20 on next week's meter.
- Next week: 11 parts and fields, the closing, the coordinator's rest 12.1 M: **1,305 M = 21.05 points** (1,064-1,538 M: 17.2-24.8); Fable 2.1. The split adds 1.85 M.
- Cap: 141.6 + 211.6 + 1,304.9 = **1,658 M** (1,417-1,891) of 1,900.
- From 17:05 Monday his time 8.4 h (6.7-10.0): ends about 01:30 Tuesday (23:50 Monday to 03:10 Tuesday).

**Sensitivity [c].**
| Case | This week | Points (units + coordinator) | Wakes | Reading at the reset | Next week |
|---|---|---|---|---|---|
| expected | sheet, maps, f2a | 3.98 (3.33 + 0.65) | 2 held | 98.95 | 1,305 M, 21.05 |
| his use 0 | + f2b, f2c | 7.20 (6.49 + 0.71) | 2: f2b START Sun 09:27, f2c Mon 09:52 | 98.20 | 1,107 M, 17.86 |
| his use 0.126 | sheet, maps, f2a | 3.78 (3.33 + 0.45) | 1 held | 100.95: **100 at Mon 05:00 UTC, 7 h before the reset** | 1,305 M, 21.05 |
| true 90.0 | sheet, maps, f3a | 4.18 (3.33 + 0.85) | 3 held | 98.65 | 1,305 M, 21.05 |
| true 90.99 | sheet, maps (card 91 after the go: f4m at the sheet's return) | 2.76 (1.75 + 1.01) | 4 held | 98.22 | 1,404 M, 22.64 |
| all at limits | sheet, maps | 4.36 (3.76 + 0.61) | 2 held | 99.33 | |
| worst, true 90.99 | sheet, maps, f2a (Sat 21:16 wake, to its limit) | 4.71 | 2 | 100.17: 100 at Mon 10:08 UTC | |
Maps 1.0 or 1.2 h: the same units, points and wakes.

**Against the decisions [c].**
1. B's wakes, with his use at the protected rate, find the unit held again: the card rises (his use and top session 6, 0.091 an hour) as fast as the line (0.081), so the room counted at the hold does not open; a wake starts a unit only if his use is lower (his use 0: both start a part). Each costs 0.19-0.20 points by the weights (a Fable cache rewrite): 0.39 expected, 0.78 at a true 90.99.
2. The coordinator's reserve at 62 M a point (0.49 at its limit) is below its draw by the weights (0.65 expected, up to 1.01): a wake's 0.6 M is 0.01 points to the gate, about 0.19 to the meter. With the reading's fraction near 1 and f2a at its limit this takes the fixed 1.0's margin (99.99 at the reset; 100.17 at a true 90.99).
3. At 0.126 an hour the meter reaches 100 at 05:00 UTC Monday: A's 0.081 rests on the pilot-plan round not recurring.

**For a successor:** GO.md per 5.6 with: 1.4 -> about 4.0; 4.3 -> about 5 (5.5 at a true 90.0; never past about 9); 84 M -> 212 M; 0.6 Fable -> 0.9; 23.1 (19.2 to 26.9) -> 21.1 (17.2 to 24.8); 1,432 M -> 1,305 M; 2.2 Fable -> 2.1; 1,657 M -> 1,658 M (1,417 to 1,891); the end -> about 23:50 Monday to 03:10 Tuesday (6.7 to 10.0 h from 17:05); 0.081 an hour plus 1 point; at 90 % the sheet and the three maps at once, the rest as room opens, the coordinator waking when a held unit fits (expected about 14:30 Sunday and 15:00 Monday his time), else 17:05 Monday; Windows not to sleep, or `Go on.` after 17:00 Monday. Commit with tools/commit.mjs. Then the page (5.7) with the same.

### E. State at this helper's LIMIT (context 203.5 K, 2.88 M tokens of its own, 2026-11-21 about 09:45 UTC)
- **Done in RUN:** c919eea `run/config.json` (weekend: 0.081 an hour, 1.0 fixed, to 2026-11-23T12:00Z), cce1db1
  `tools/gate.mjs` and `tools/README.md` (weekend rule and the fit clause with the wake's local cron), db27bbc
  `tools/gate.test.mjs`, 7a76f69 `briefs/COORDINATOR.md` (5.5 with Applied B). 53 tests pass (46 before). Scratch test
  at 11:00 UTC, 90 %: sheet, f2m, f3m, f4m START (f4m 94.25 vs 95.03); f5 and f2a HOLD 96.67, fits at
  2026-11-22T07:12Z (section D).
- **Not done:** `RUN:GO.md` (5.6) and the page (5.7), with section C's replacement numbers: nothing committed for them,
  nothing published. The go text (GO.md section 1) is unchanged.
- **Open before the go (from section C, items 7-8):** the coordinator's gate reserve at 62 M a point (0.49) is below its
  draw by the weights (0.65 expected, 1.01 high): in C's worst case (true reading 90.99, his use at 0.081) the meter
  reaches 100 at Mon 10:08 UTC, under two hours before the reset (F1, F2). Computed fix for a successor to check in
  `scratchpad/apply/course.mjs` before applying: `weekend.protected_all_points_fixed` 1.0 + (1.01 - 0.49) = 1.52 (line
  at 11:00 UTC 94.51; the first four still start, f4m 94.25), its tests' literals recomputed; then GO.md and the page.
  The wakes start a unit only if his use runs below 0.081 an hour; at that rate each finds no room (0.19-0.20 points).

## Final
Helper (build-invariant, Opus) of top session 6, 2026-11-21 09:30-09:55 UTC. **State: done; over the brief's limits by
tokens-self.mjs at the end (10.8 M tokens, 298 K of context), noticed after the page was published.** Scripts in this
session's scratchpad `final/`: `course2.mjs` (Applied C's `course.mjs` with `--go`, `--fixed`, `--wf`, `--wr`, `--mppu`,
r0 91.4), `sweep.mjs` (true reading x his use x the units' mix), `page-edit.mjs`, `scratch-run/`.

**Reading [m: get_usage at 09:32 UTC]:** all models 91 %, Fable 54 %, both reset 2026-11-23T12:00Z (2 d 2 h). The card
read 90 at 09:15 (Applied), so it turned 91 between: at a go at 11:30 the true value is about 91.1-91.6 if the card floors.
The brief's "10:45 UTC" was not the clock (09:31 UTC at this helper's start).

### 1. The reserve: 2.06, not 1.52 [c]
- **1.52 checked:** it is 1.0 + (1.01 - 0.49): the coordinator's worst course (four held wakes) priced by H-fit's central
  weights (Fable 1.48 per M fresh, 0.0046 per M read), the units at the gate's 62 M a point. ROUTER.md section 2 gives the
  weights as ranges: a point is 0.6-0.7 M Fable fresh (high 1.67 per M), 110 M cache reads and more (high 0.0091 per M);
  path e2's 986 M is 13.4-17.3 points (section 6), so the units are 57 M a point at the high end.
- **The coordinator to the reset at the high weights, at most 1.32 points:** the go 0.16 (90 K fresh, 14 reads of 65 K);
  four held wakes 0.97 (each a rewrite of at most 130 K + 4 calls; a held wake needs the card a whole point higher than at
  the gate that set it, so they are at least 1/0.081 = 12.3 h apart, and from the first return about 13:00 Saturday to the
  reset there are 47 h: four at most); six returns 0.15; ten timer fires 0.05. The course sweep's largest: 1.16.
- **The invariant (the brief's test):** at a start at the line, the meter at the reset is at most 100 - fixed + 0.5 (the
  reading's hidden part, F3) + 0.5 (top session 6) + S x (1/57 - 1/62) + (1.32 - 0.49), S the running units' and the
  unit's limits. S is at most the room the go leaves at 91: (100 - 0.081 x 48.5 - fixed - 91 - 0.49) x 62 M (with his use
  at the protected rate the card rises at least as fast as the line; a returned unit's unused limit is room its tokens
  never took). So fixed x 1.0877 >= 1.0 + 4.5828 x 0.0877 + 0.8313: **fixed >= 2.053, set 2.06** = 0.5 + 0.5 + 1.06
  (the coordinator 0.83, the units 0.22). The same starts at the line end at 100.47-100.52 with 1.52 and 100.99-101.04
  with 1.0.
- **What it costs [c: course2.mjs, central weights, true 91.4 at an 11:30 go]:** nothing in units: the same four this
  week as at 1.52 (the sheet, f2m, f3m, f4m), 2.36 points, the meter 98.19 at the reset; f3m starts at f2m's return
  instead of at the go, f4m at a fit wake. Worst over the sweep at the high weights 99.39 (99.89 at 1.52).
- **Left open (Applied A, not this fix):** his use at 0.126 an hour (with a round like the pilot-plan one) takes the
  meter to 100 about Mon 09:17 UTC (07:28 at the high weights) with any fixed from 1.52 to 2.1: the first wave starts at
  the go either way. Starting only the sheet would avoid it; the protection rests on 0.081.

### 2. Applied in RUN (each committed by tools/commit.mjs)
- 94aec81 `run/config.json`: `weekend.protected_all_points_fixed` 1.0 to 2.06; the note gives the parts.
- 9af53d3 `tools/gate.test.mjs`: one test on the real config: four starts at the line (the go at 11:30 with the sheet,
  then f2m; f3m beside f2m, the most limits the go's room at 91 fits; f2a alone at a Sunday 09:30 and a Monday 06:00
  wake), each passed by the gate and held 0.01 higher, each a reading this weekend can show with his use at the protected
  rate since the go; the meter at the reset at the high weights 99.93, 99.98, 99.98, 99.98. **54 tests pass** (53 before).
- 3f01069 `GO.md`: form 2 is the start now (r57-0051); what starts at 91 %, the points, what the gate keeps back
  (0.081 an hour + 2.06), Windows not to sleep or `Go on.` after 17:00 Monday, four rows in section 4, section 5's
  figures, a changes section. The go text (section 1) unchanged.
- The page https://claude.ai/artifact/J2EcMdZR1uSQ6KLp7VGJWu, version 3 (1795254868-daab), from
  `research-tree/build/page/go-page.html` (read first; the published copy matched the source): the lead, the facts, form
  2, the config line, Windows sleep, the stops (app restart, wake tool, three new rows, after the reset), hours and
  tokens, the reading and the weekend warning, sources. Checked in a real render at 1870 px, light.

### 3. The scratch test (scratchpad `final/scratch-run`, the real config, GATE_NOW 2026-11-21T11:30:00Z, all 91, Fable 54)
Line 100 - (0.081 x 48.5 + 2.06) = 94.01; Fable 59.32 vs 87.15 on every line; two slots made.
| Unit | Gate | All models: need vs line (reserve + unit, points at limits) | Fits at (UTC; his time UTC+5) |
|---|---|---|---|
| sheet | START | 91.86 vs 94.01 (0.49 + 0.37) | - |
| f2m | START | 93.34 vs 94.01 (0.86 + 1.47) | - |
| f3m | HOLD | 94.29 vs 94.01 (2.34 + 0.95) | 14:57 (cron 57 19 21 11) |
| f4m | HOLD | 94.29 | 14:57 (the coordinator does not gate it: same limit as f3m, F8) |
| f5 | HOLD | 95.76 (2.34 + 2.42) | Sun 09:03 (not ready: needs the sheet) |
| f2a | HOLD | 95.76 | Sun 09:03 (not ready: needs f2m) |
The printed times hold the sheet and f2m at their limits; each return gates again. Expected course (course2.mjs):
| UTC (his time) | Event | Card | Line | Result |
|---|---|---|---|---|
| Sat 11:30 (16:30) | go | 91 | 94.01 | sheet, f2m START; f3m HOLD |
| 12:15 (17:15) | sheet returns | 92 | 94.07 | f3m 94.48 HOLD |
| 12:44 (17:44) | f2m returns | 92 | 94.11 | f3m START; f4m HOLD |
| 13:29 (18:29) | f3m returns | 93 | 94.17 | f4m HOLD, fits 16:19 |
| 16:19 (21:19) | wake | 93 | 94.40 | f4m START; f2a HOLD |
| 17:04 (22:04) | f4m returns | 94 | 94.46 | f2a HOLD, fits Sun 22:32 |
| Sun 22:32 (Mon 03:32) | wake | 96 | 96.85 | f2a HOLD, not before the reset |
| Mon 12:05 (17:05) | reset wake | new week | week rule | f2a, f2b, f2c START |

### 4. Figures [c: course2.mjs at 2.06; this week's units at 62 M a point, the coordinator by the weights]
- **This week:** the sheet and the three maps, 113.0 M = **2.36 points** (units 1.75 + coordinator 0.61), Fable 0.77.
  **At most 3.4** (3.5 at the high weights) with his use at the protected rate (units at their limits; then f4m waits);
  5.4 if he uses none (f2a and f2b start at wakes). Wakes: 16:19 UTC Saturday (starts f4m), 22:32 UTC Sunday (held),
  the reset wake 12:05 UTC Monday. Machine time this weekend about 3 h (11:30-13:29, 16:19-17:04).
- **Next week:** 12 parts and fields, the closing and the coordinator's rest 12.7 M: **1,403.5 M = 22.6 points**
  (1,163-1,637 M: 18.8-26.4), Fable 2.2; room at the reset about 64.7.
- **Cap:** 141.6 + 113.0 + 1,403.5 = **1,658 M** (1,417-1,891) of 1,900.
- **End:** 8.4 h after 12:05 UTC Monday (6.8-10.1): about 01:30 Tuesday his time (23:50 Monday to 03:10 Tuesday).
- **The go text:** GO.md section 1, unchanged. **His settings:** a new Code session in the run folder, Fable, effort
  high, Auto mode on; Windows set not to sleep on mains power until the run ends (or `Go on.` in the coordinator's
  session after 17:00 his time on Monday); set it back afterwards.
