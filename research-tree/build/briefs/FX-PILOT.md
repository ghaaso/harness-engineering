# FX-PILOT: the pilot's fix round, three units (big run, session 589e137c, 2026-11-24)

Owner's approval r57-0064 (cap 600 M for the whole big run). MAIN = `C:/Users/User/Documents/projects/harness-engineering`,
HB = `C:/Users/User/Documents/projects/hb` (the worktree that holds branch `build`). CLAUDE.md rule 8 binds: build, run
your own tests, land; no plan, spec or page.

**What to fix:** `MAIN/research-tree/build/PILOT-PLAN.md` section 4, "Fixed before, in one fix round of three units"
(units 1, 2, 3 and item 4), read in full; and `MAIN/research-tree/build/TRACK-PLAN.md` section 3.3 (lines 169-189),
corrections 1-3, which change unit 3. Read the code and the line numbers there on `build` itself (they were read before
the build's last commits; re-find any that moved).

**How (the build's own process):** `MAIN/research-tree/build/briefs/B0b.md` "Builders (build-invariant, opus): common"
(lines 9-42) holds for tests through MAIN's lane, worktrees, departures and the report, except: never the full suite or
the e2e (the root runs it at landing). Each unit works in its own worktree `MAIN/.claude/worktrees/<UNIT>` on branch
`u/<UNIT>`, cut from `build`'s tip by the root before you start. The three units run side by side on their own copies
(r57-0415's floor); units 1 and 3 both touch the settings templates and unit 2 touches `settings/coordinator.json`, so
keep each change to the smallest block, and the root lands them one after another with
`node HB/research-tree/tools/land.mjs <UNIT> <test files>`, rebasing the later ones.

## Unit PA (build-invariant, opus): section 4 unit 1, models of children and helpers
## Unit PB (build-invariant, opus): section 4 unit 2, the scorer can be started
## Unit PC (build-invariant, opus): section 4 unit 3 and item 4, plus TRACK-PLAN 3.3 corrections 1-3
- Correction 1: recompute `attempt_max_ticks` from round 3's research sessions without the 4.3 h stop (r57-0174:
  `bash MAIN/library/lookup.sh -f r57-0174`), Q3 + 1.5 IQR as section 4 does; show the numbers in your report.
- Correction 2: fix the flaky FX-CLOSE T1 (c) (fails under load, passes alone): own ids per test file or a fake process
  list (r57-0521 item 2); show it pass three times under the lane while another lane command runs.
- Correction 3: where the tree's scripts or thresholds hold `N_max` 2, replace it by the decision rule's width
  (r57-0414, `bash MAIN/library/lookup.sh -f r57-0414`) computed from what is measured; where an input is not measured,
  keep 2 and say which input is missing (a width above two is outside what the model check ran). The meter gate's
  points use TRACK-PLAN section 2's bases, not 62 M a point.

Each builder writes `MAIN/research-tree/build/units/<UNIT>/report.md` (branch, final commit, each test file with pass /
fail counts and lane label, departures) and returns it in under 250 words.

## Refuter (refute, opus), one per unit, after its landing
One blind review of that unit's commits only (`git -C MAIN diff <build before> <build after the landing>`), by
B0b's "Refuters" part (lines 96-110): try to break the fix with a test that fails; verdict to
`MAIN/research-tree/build/refute/FX-PILOT-<UNIT>.md`, breaking findings first, the rest as a list. Only a breaking
finding goes back to the builder (rule 8).
