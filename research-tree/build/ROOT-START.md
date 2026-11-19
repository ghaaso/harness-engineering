# ROOT: start here (the build's root session)

Written 2026-11-19 by the top session on the owner's go (r57-0039). You are the root of the build (task r57-0507):
kind orchestrate, Opus. No node of this build has grandchildren (`research-tree/ORCHESTRATION.md` section 13), so
the tier routes put the root on Opus, not Fable (r57-0035 is for orchestrators whose children have children). You
run every batch yourself with helpers and you alone report to the owner. You work in the main checkout.

**Read first, in this order.** `library/INDEX.md` (injected at start); `research-tree/ORCHESTRATION.md` sections
0, 2, 3, 5, 6, 7, 8, 9 and 13 (section 13 wins where they differ); `research-tree/BUILD-PLAN.md` section 2 (the
units); `research-tree/build/briefs/GATE-USE.md` (how the plan gate reads your starts); and
`research-tree/build/STATE.md` if it exists: then you are a successor, so continue from it and do not start
anything it lists as running until you have read that unit's branch and result file.

**Start (section 9 row 8).** Read `get_usage` and write the first line of `research-tree/build/usage.jsonl`; ask
the app's keep-awake; arm the wake timer: a background Bash command whose until-loop ends at a time 3 x Q3 of the
running units' minutes away. The shell tool refuses a standalone `sleep N`.

**How the plan is held.**
- Every helper: description `<kind>: <unit id> <a few words>`, an explicit model, `run_in_background: true`. The
  tier hook checks kind and model; the plan gate (`research-tree/build/plan.json`) checks the unit's row, the units
  it depends on, one live helper per unit and role, and the batch's width. A refusal is the plan speaking: fix the
  start; never word a description to slip past the gate.
- A batch's width changes only by a line `width <batch> <n>: <measurement>` in STATE.md, which the gate reads.
  B1-1: after B0b, from the re-measured shares (section 6), with the lane at 4 slots (section 13); the central
  shares give 7.
- Never wait for a helper in the foreground. You are woken by helpers' ends, your background commands' ends and
  the timer.
- Each brief as sections 3, 7 and 9 rows 3-4 say: the unit's worktree (cut by you from the `build` branch tip,
  `git -c core.longpaths=true worktree add -b u/<unit> .claude/worktrees/<unit> build`), the lane by the main
  checkout's absolute path with the timeouts of section 7, the unit's own test files only, the token limit and
  the 330 K checkpoint, the result file.
- Full suites: 5 (section 7), each a background command of yours through the lane, the command of section 13
  (about 120 s; `research-tree/build/facts/lane-measure/shards.cmds`).
- Limits (r57-0038): a leaf at its limit returns LIMIT; you decide from the pooled reserve (section 3): more
  tokens, a successor from its checkpoint, or stop and report.
- A test that fails under load and passes alone is run once more alone; if it passes, it goes on the end list as
  flaky (section 13). A real failure goes back to its unit only if it breaks the unit (section 7).

**Cap and windows.** The build's cap is 15 weekly points: the all-models meter read 63 % at the go (2026-11-19,
about 15:00 UTC), so start no new unit once the meter, plus the reserve of the running units, plus the unit's
expected use, would pass 78 %, or once section 4's gate says no. Let running units finish, then ask the owner
`cap:` with the counts. Read `get_usage` before every wave and log it in `usage.jsonl`.

**Hand-over (section 5).** At about 129 K context, at the first quiet point (no helper and no background command
running), write STATE.md with section 8's fields (batch, units, agent ids, commits, landings, suites, meter, next
step) and tell the owner in one line that a successor is due: it is started on his typed turn, since a session
started by a task cannot start sessions. Until he starts it, keep working; never stall waiting. Write STATE.md at
every wake, so that an automatic compaction (Opus at 368 K) loses nothing.

**To the owner.** One short report per slice, in plain words, answer first. `cap:` at the cap. `approve:` before
merging the `build` branch into any other branch or pushing anything. Commits on unit branches and landings on
`build` are part of the build he approved.

**Done.** Slice 2 ends with S2.4's verdict. The pilot (slice 3) has its own plan and cap.
