BREAKING: attempt_max_ticks 107 (1.78 h) is below how long the single-session arm is expected to run, so the age cap fires on every S1/S2 run and the coordinator's brief tells it to stop the run (breaking findings: 1)

Blind refute of unit PC, `git -C hb diff d226e934 de7ea70e` (commits 8559632d and 4c0f2cf7, merge de7ea70e). The tests ran on a copy
(`git archive de7ea70e research-tree` under `%TEMP%/refute-pc/a`; one mutation copy under `%TEMP%/refute-pc/m`). Nothing was
changed in HB or MAIN apart from this file.

## Breaking

**B1. The age cap is computed from the tree's sessions but also applies to the single-session arm, which is expected to run
longer than the cap. The cap fires on every S1/S2 run, and the coordinator's brief says to stop the run.**
- The number matches the sessions it claims to use: round 3's seven research sessions with the 4.27 h stop taken out, 0.45-1.18 h,
  Q1 0.611, Q3 1.075, Q3 + 1.5 IQR = 1.771 h = 106.3 ticks at 60 s, rounded up to 107 (`tcb/thresholds.json`:70). It agrees
  with `MAIN/research-tree/build/COMPLEXITY.md`:63 and `refute/COMPLEXITY.md`:43.
- Those sessions are the tree's form: their readers worked in parallel (round 3 "lane active hours 1.18-1.77",
  `refute/COMPLEXITY.md`:46). The cap is one threshold for every row. `watch.mjs`:1188-1203 (`actDueIdleAgeCap`) does not
  check the role, so S1/S2 (role `control`) get the same 107.
- The record's own figure for one session doing a field alone is longer: "The whole field: 70-106 min against 118-181
  helper-minutes one at a time" (`COMPLEXITY.md`:191-192). That is 2.0-3.0 h of serial work, compared with a 1.78 h cap. The top
  of the tree's own range, 1.8 h a field (r57-0174), also reaches the cap.
- What happens at the cap: act-due `age-cap` fires once age_ticks >= 107 (`watch.mjs`:1201-1202). The brief says "Stop it unless it
  is making progress" (`tcb/briefs/coordinator.md`:168). Nothing re-arms the cap, because age_base is never set. r57-0522 (2)
  records that the coordinator has nothing to judge progress by. PILOT-PLAN s4 item 4 sets the rule the cap exists to keep:
  it must stay above every field, because a lower cap "could end an honest T and lose its field". At 107 the cap falls
  0.2-1.2 h before every expected S1/S2 finishes, so every run of comparison 1's single-session arm is put up for a stop.
- Steps to reproduce: use the shipped thresholds.json (107). A `control` row at `bound` with no READY gets class 17 `age-cap`
  after 107 counted ticks. `watch.test.mjs`:1719 (FX-W6 age cap) already shows this with a cap of 2. S1's expected 118-181
  min is 118-181 ticks.
- The fix can use the unit's own measurements: compute the cap from the arm that runs longer (the serial field time,
  118-181 min, Q3 + 1.5 IQR taken over the four lanes), or give control rows their own cap.

## Not breaking
- Control's tools are right and the deny holds. The settings allow Read, Edit/Write on staging, WebSearch and WebFetch. They
  deny Agent and Task as whole tools and allow no Agent rule. The profile denies Agent and Task, and the hook checks the deny
  first (`guard-hook.mjs`:467-468). guard-hook.test.mjs passes 31 of 31 (3 skipped as needs-app). Mutation: Agent removed
  from both deny lists and `Agent(reader)` added to the allow list; T6 and T14 both fail.
- The settings template and the selftest list agree after the rebase. `settings/control.json` carries the tier-hook entry
  (Agent|Task|start_session). selftest.test.mjs passes 31 of 31.
- The stop test now uses its own random ids (`stop.test.mjs`:134-140). FX-CLOSE passed 3 of 3 runs, each alongside the
  guard-hook, replace and admit tests running at the same time. One cause of flakiness is left: verify still reads the real
  process list through PowerShell with a 30 s timeout (`lib.mjs`:2892-2895). Under heavy load that can give exit 2.
- Nothing stops a child at W_quality. `watch.mjs`:651-655 compares only the coordinator's window against it. The only effect
  on a child is the pack cap at `commit.mjs`:748, which drops from 165 K to 145 K. "T, S1 and S2 alike" is not enforced:
  R_same can compact without anyone seeing it. This gap was there before PC. The figure 280 K checks out (368 - 48 - 38 = 282,
  rounded down to 280).
- `cost-inputs.json`:109 still says W_quality is 300000 (and `cost.test.mjs`:950 pins it). `spec/briefs.md`:30 and :62 still list
  W_quality as a guess with a default of 300000. Both values are marked `source: "measured"`, but they are computed.
- Correction 3 is not in the diff: N_max is still 2, marked as a guess (`thresholds.json`:14).
- S0.5 passes. The new line in `briefs/child.md` reaches only rows without readers, and control gets no reader-brief
  (`replace.mjs`:771).
