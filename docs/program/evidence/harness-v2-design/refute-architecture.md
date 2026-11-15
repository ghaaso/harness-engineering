# Refutation: harness v2 architecture (architecture.json + arch.js)

All model results below come from running `paramsFor`/`simulate`/`capacity` (arch.js.txt:43-107) unchanged, in node, on architecture.json. The flows are conserved: stocks always sum to S. At steady state (S=400, hours 20-40), `capacity()` matches `simulate()` within 5 %.

1. **`model.params.budget`, `plancheck.capacityText` claim (i).** The token window is not calibrated against the only measurement of it, and that reverses the headline. The record says the limit "typically arrived about 75 minutes into a five-hour window" (compile:84), and the refuter cites "a measured ceiling of two lanes at a time" (compile:177). With budget=30 lane-hours, six working lanes need 300 min to reach the limit, and ten need 180 min, against "about 15 minutes" recorded (`ten_lanes`). Calibrating to 75 min at six lanes gives budget ≈ 7.5. The binding limit then becomes **tokens, with the knee at 2.1 lanes today and 2.5 in v2**, which matches the record's two lanes. Claim (i), that the check binds at about five lanes, is an artefact of the guessed budget. It is also fragile in its other inputs: the check binds before the merge only while tc·r·k > tm (51 > 30). With k=1 or tmRoot=60, the merge binds. With tw=40, tokens bind. Claim (ii) is robust only in direction: the token limit does not depend on tc, tm or the slots, so speeding those up must eventually expose tokens (or memory, which the model does not include). "With a second slot" is an artefact. On the record, tokens may bind first today. **Fix:** calibrate the budget to the 75-minute figure, or show the knee as a band over the budget, and rewrite capacityText. Severity: must-fix.

2. **`simulate` with `slices`=11; "All 11 merged" (arch.js:222).** The default run never reaches steady state, so:
   - (a) The token loop never fires. Peak use is 65 % of the window today and 59 % for v2 with a second slot at 12 lanes. The shaded "stopped" bands are always empty, while the capacity chart says tokens bind.
   - (b) The `done` time (M ≥ S−0.02, line 75) measures the tail of chained exponential delays: testbed 29.9 h against v2 17.8 h, but 50 % is reached at 6.7 h against 3.2 h and 90 % at 13.6 h against 7.3 h. Five to twelve lanes give an identical 29.9 h.

   **Fix:** report the time to 90 % and a steady-state rate from a long run, or use higher-order delays. Severity: must-fix.

3. **Library term (lines 72, 78, 86, 94, 96).** Four problems:
   - **The saving is counted twice.** `save` shortens the work time (line 78) and also scales the burn rate (lines 86, 96). Tokens per slice therefore scale with save², not with save. At full hit rate that is a 47 % cut in work tokens, above the record's 27 % ceiling (compile §6). The page says "saving = fetched share × hit rate".
   - **`capacity` and `simulate` use different hit rates.** `capacity` assumes hit = 0.8·hitMax (0.48). An 11-slice run never passes 0.38.
   - **The model has no cost terms.** It has no lookup turn, which re-reads the caller's whole context (about 306k per call; KS §6 says "per-call cost dominated by the caller's context re-read"), no miss and no write. So the switch can never show a loss.
   - **`hitMax` 0.6 is mislabelled.** It is the KS pilot's pass bar for recall on blind positives (a target), not a share of reading avoided. The KS design's own prior is 3 to 5 repeats in 48 fix commits.

   **Fix:** apply `save` once, compute the hit rate from K in both places, add lookup and miss costs, and tag hitMax 't'. Severity: must-fix.

4. **Queueing and the knee (lines 77-84, 104).** A deterministic fluid model has no queue below capacity. At 2 to 4 lanes today the mean queue is 0.00, so the `tw` source line ("chosen so that two to four sessions … wait as long as the record says") is false. The knee is therefore the point of 100 % utilisation, where real waits are unbounded, and the planner's "lanes at the knee" puts the plan right at that edge. **Fix:** add variability (for example M/M/c waits on the check) and set the lanes at a target utilisation of about 0.75. Severity: must-fix.

5. **`loops` against the equations.** Only B1, B2, B3 and R3 are in the code. The other five are drawn on the diagram (line 203) but are not modelled:
   - R1, the fix spiral: r is a constant, so nothing reinforces.
   - R2, context growth: `mult` is a constant.
   - R4, the pile-up: a stop freezes the flows, and there is no mass release.
   - B5 and the governor: the lanes are a slider, and nothing lowers them. v2 with a second slot at 12 lanes is stopped 20 % of the time, which the governor exists to prevent.
   - B4, staleness: modelled as decay per minute (line 85, `decay`). That is expiry by age, which the page and the record both forbid (compile:227, KS §4 "No TTL").

   **Fix:** model these five or mark them "not modelled", and drive staleness by merges. Severity: must-fix.

6. **`loops[B5].today`, `variants[naive].text`, `numbers.merge_breaks`.** The page says "the merges of the first two slices broke main: the collision was found at the merge". The record says the first check on merged main failed because of the root's own edits to the shared documents and its merge. The root fixed it before the gate commit (sweep-cards:178-181, A2-07). That was not a collision between slice footprints, and main was not broken. **Fix:** restate it. Do not cite it as evidence for the footprint check. Severity: must-fix.

7. **Plan check (`plancheck.rules`, `wavesOf`).** I traced `wavesOf` by hand on the three variants:

   | Variant | Waves | Collisions |
   | --- | --- | --- |
   | naive | [cat, acc, rst] [stk, bil, til] [imp, rep] | 2: acc/rst on settings.py, bil/til on money.py |
   | checked | [cat, acc] [rst, stk, bil] [til, imp, rep] | 0 |
   | split | [base, cat] [acc, rst, stk, bil, til] [imp, rep], widest 5 | 0 |

   The page's text holds for each variant. But the re-split does not shorten the plan. The critical path (cat → stk → imp/rep) is three waves in every variant, so the split needs five lanes to finish when the checked plan finishes on three: more tokens and checks, no speed.

   What the rules miss:
   - The objective. It should be makespan (the critical path) at an affordable lane count, not the widest wave.
   - List scheduling: start a slice as soon as its needs merge, instead of waiting for the whole wave.
   - Read-write conflicts and shared interfaces.
   - The declared "shared things" and "size". They are collected but used by no rule. "migration 0010/0011/0012" are distinct strings, so the migration chain, a serial resource, never collides.
   - Enforcement during work. Rule 7 compares footprints only after the merge.
   - Which controller wins when the planner's knee and the governor's lanes disagree.
   - Co-change edges. They are unvalidated for planning: the "six of ten" test (compile §6) is about the blast radius of a fix.

   Severity: must-fix (the objective); should-fix (the rest).

8. **Tags.**
   - `params.ctxCap` 0.72 is tagged 'm'. It is a comparison across sessions doing different work, which FINDINGS §2 explicitly says is "not a trial". Tag it 'e'.
   - `numbers.fill_*` and `params.explore` are tagged 'm', and the bar says "Measured". Compile §6 says "These are estimates". Tag them 'e'.
   - `methods[route].status` says "Found in phase 1". It is the same cross-model confound. Make it "Trial".

   Severity: should-fix.

9. **`numbers.sub_fixflow`, `limits[4]`.** The 7.5k is CLAUDE.md alone ("CLAUDE.md ≈ 7.5k tokens plus the CONTEXT block", orchestration-doc §4). It is not a fixed cost per subagent. Comparing it with the testbed's 70k, which includes 34k of tool definitions, compares unlike things. Severity: should-fix.

10. **The second slot (`paramsFor`, line 51).** The model doubles the throughput at 3.8 min per check. The record measured two container checks at once at 266-267 s each (compile:66), which means tc ≈ 4.45 min with two slots, and 319-360 s on a loaded day. The model has no memory term, yet B08 records that the 8 GiB needed for the second slot was never free. **Fix:** set tc per slot count, and add memory as a limit. Severity: should-fix.

11. **Review and the contract (line 82).**
    - Review is modelled as a stage with unlimited servers. In the testbed one root reviewed and merged everything (B04, map-full:126-130). That single server, the likely limit today, is missing.
    - "Two rounds at most" is modelled as a geometric mean of 2, so 25 % of slices still take three or more rounds.
    - The rework that a revert causes is not modelled, so the contract helps by assumption.

    Severity: should-fix.

12. **The library against the knowledge-store (KS) design (`library.*`).**
    - **It contradicts KS decisions.** KS scopes itself as "Not the defect register" and "Not session memory", yet findings live in the library. KS keeps lookups host-local and never journals them, yet the journal is written "by every writer". KS triggers a lookup on an error, an escalation or a diff, with lead thresholds. "Ask before exploring" is a new trigger, and it is the costliest one.
    - **KS is FixFlow-specific.** Its store path and its Opus-reserved areas are FixFlow's, and the page never says how it transfers to the clinic testbed.
    - **Self-evolution is only partly mechanised.**
      - "Stale by code change" names no writer. In KS that is a lazy recompute at lookup plus `ks close`.
      - "Lookup keys are fixed" names no writer. In KS that is Opus `accept-handle`.
      - "Rates replace guesses" leans on a transcript tally that someone runs by hand, with no trigger.
      - "the defect stops arriving" overclaims what promotion to a check does. In KS, promotion is manual and the owner rules on it (D17).
    - **The guards against losing tokens are missing.** KS's kill rule (KS-9: fewer than 3 verified hits in 20 encounters) is not carried over, and the model has no per-lookup cost.

    Severity: should-fix.

13. **`renderResidency` (line 326).** The calculator leaves three things out:
    - The lookup turn itself costs a full context re-read.
    - A miss pays for the lookup and then for the reading as well.
    - Material read in a session does not stay for all 519 calls: Opus compacts near 367k.

    The bars therefore overstate the case for "ask". Severity: should-fix.

14. **Notes.**
    - R3's "today": the 6-17 % came from the Codex adapter's snapshot and restore (compile §2.4, A5-10..14), not from text pushed into sessions.
    - `ten_lanes` were October workflow subagent lanes, not slice sessions.
    - `peak_sessions` "nine" counts sessions in other projects too (4 Nov 01:28: 197 clinic calls, 79 other).
    - `meta.law` names three limits but leaves out memory and the owner.
    - The token unit "lane-hours" hides the fact that how re-reads count against the limit is unknown.
    - The equation text (line 188) says a merge "holds a check slot meanwhile". The code (line 79) holds only a fraction of one.

    Severity: note.

**Missing from a harness architecture** (most important first):
1. The owner and the machine's availability as stocks in the model. The record's largest losses are about three days idle between "could resume" and the next commit (B03), and 25 power-offs.
2. How the governor works when it cannot see how re-reads count against the limit. That unknown has to be measured before a governor can be built.
3. Failure and re-plan paths: a lane that fails mid-wave, a revert, a footprint broken during work.
4. Pass bars and kill criteria for each part, as KS has for itself.
5. One token budget that covers reviewers and replays (the refuter's warning, compile:177).
6. Permissions and isolation per lane (B16 refused writes, tool lists).

**Decoration:**
- The circled loop marks on the stock-and-flow diagram for the five unmodelled loops (item 5).
- The "lane-hours" breakdown tagged "Illustrative", which inherits item 2's artefact.
- The residency bars (item 13).

**Coverage**
- (a) Self-evolving library that minimises tokens: partly. It has mechanisms and tables, but writers and triggers are incomplete, it conflicts with KS's scope, its saving is counted twice in the model, and nothing guards it against a net loss.
- (b) Parallel work maximised at plan time: partly. It avoids write-write collisions and computes a knee, but has no critical-path objective, ignores shared resources, read-write conflicts and size, and sits at 100 % utilisation. The sample's re-split shows width, not speed.
- (c) Other token methods: concretely answered. Each is tied to a measured fill bucket, with three mis-tags or overstatements (items 8, 9, 13).
- (d) A system-dynamics representation: partly. The core flows are sound and conserved, but five of the nine loops are not in the equations, the default run hides the token loop, and the budget is uncalibrated, which reverses the headline.
- (e) Orchestration document: answered concretely. Yes: one rule there, the mechanism defined here, and the capacity facts and migration collision named. It leaves out the read-only fan-out, whose five-reader slices would also need the governor.
