# Round 3 charter: the research-tree protocol model, as built (2026-11-17)

Every helper of this round reads this file first and keeps to it. The coordinator judges; helpers work.

## Goal of the round

Rule R57 of the research-tree protocol (version 2) blocks the protocol while its model treats four fixes
(M2, M3, M5, M6), `status --reconcile` and the `--ce` fence as oracles (atomic acts on true state) and
while seven design defects are open. This round: model those mechanisms the way the scripts really do
them, find the counterexamples, design the smallest fix for each open defect, show by the model (one
ablation per fix) that each fix is needed and that the properties hold at two faults, and list the
script, spec and brief changes each fix needs. No script under `tcb/` is changed in this round.

## Places

- BUILD (work here only):
  `C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/tcb-build`
- The record: section 16 of
  `C:/Users/User/Documents/projects/harness-engineering/docs/program/RESEARCH-TREE-PROTOCOL-v2-2026-11-16.md`
  (lines 881 to 1231; point 2 = lines 930 to 1013: fixes M1 to M6, amended rules, state of the model, the
  seven open defects; point 9 = lines 1168 to 1202: the six questions that wait for the owner). Never
  read that document whole: read those line ranges, and search by rule number (`R6`, `R57`) for the rest.
- In BUILD: `model/` (`model.mjs` 581 lines, `check.mjs` 256, `configs.mjs`, `README.md`),
  `done/model-fidelity.json` (what is an oracle, further flaws, weak properties),
  `inputs/model-findings-2.json`, `done/modelfix-U1.json`, `inputs/HARNESS-FACTS.md`, `CONTRACT.md`,
  `spec/`, the scripts `tcb/watch.mjs`, `tcb/status.mjs`, `tcb/replace.mjs`, `tcb/admit.mjs`,
  `tcb/handover.mjs`, `tcb/lib.mjs`.
- This round's files: code and notes in `BUILD/model/as-built/`, check results in
  `BUILD/model/results-as-built/`, each helper's return in `BUILD/done/r3-<label>.json`.
- NOTES (hand-over notes, this charter):
  `C:/Users/User/AppData/Local/Claude-Data/claude_pzs8sxrjxfjjc/side-session-notes/local_d67dafea-d072-4d04-8ca3-f5f76d8cb34c`

## Hard rules

1. The folder `C:/Users/User/Documents/projects/EMS_workshop1` is a product repository. Never read or
   change a file in it. Your shell may start there: use absolute paths into BUILD.
2. Never change: `tcb/**`, `model/model.mjs`, `model/check.mjs`, `model/configs.mjs`,
   `model/configs-full.mjs`, `model/run-resumable.mjs`, `model/run-all.mjs`, `model/show.mjs`,
   `model/results/**`, `model/work/**`, `spec/**`, `CONTRACT.md`, `inputs/**` (except a file your brief
   names). The model's full run is alive (runner pid 40648, `run-resumable.mjs`); it loads `model.mjs`
   again for every part and owns `model/results`. Never stop it, never start a second runner, never end
   a Node process you did not start. Model changes go into the copy in `model/as-built/`.
3. Every command that starts Node goes through the lane, from BUILD, one at a time:
   `node tools/lane.mjs --label r3-<what> --timeout-s 140 --wait-s 20 -- node <...>`.
   Exit 75 means the lane was busy: wait and try again, never go around it. No loop that starts many
   processes, no burst of new files (at most about 20 new files per helper). Keep every command under
   about 150 seconds: a foreground call over 180 seconds is moved to the background by the harness and
   your turn can stall. A check that cannot be split under 140 seconds is started with the Bash tool's
   `run_in_background`, writes to a file, and you wait for its completion notice; never two at once.
4. Checks: two-fault configurations only (K = 2), `--mem-mb 400`, results into
   `model/results-as-built/`. A run that ends BOUNDED is reported as BOUNDED, never as "holds".
5. Do not rule on the six open questions (section 16 point 9). Where a fix depends on one, give both
   branches.
6. Design rules of the owner: name the classical problem and its field first and borrow the standard
   solution whole; say which classical assumption fails for language-model sessions (deterministic
   reruns, fail-stop workers, a trusted base out of the subjects' reach, atomic acts) and what is done
   about it; for every rule say who runs it, when, on what input, and what stops the work if it fails
   (a rule without a runner is a wish); prefer the smallest change. A cap changes the pace, never the
   scope: if something does not fit, say so and split it, do not drop it.
7. Evidence: a claim about a script cites `file:line`; a claim about the model cites the configuration,
   the property, the trace length and the result file. Mark what you inferred and did not check.
8. No git command that writes. The coordinator commits.
9. Return: write everything to your files; as the last step write your return to
   `BUILD/done/r3-<label>.json` and answer the coordinator in at most 250 words: files written, the
   verdict lines, what is open or blocked. No long quotes in the answer.

## Load note (added 15:40 local, updated 17:25)

The PC froze at 15:43 and was restarted at 17:13 (the antivirus is removed since; program starts are
fast again). From about 17:15 until about 19:30 the model's full run uses about 16 worker processes at
below-normal priority and keeps 4 GB free. Lane commands run several times slower than the recorded seconds; that is
not a hang. A check that ends with exit 124 (the lane's timeout) under this load is not a result: run
it again in the background as rule 3 says, with a longer `--timeout-s` (up to 900), one at a time, and
wait for its completion notice. Never raise `--mem-mb` above 400 and never run two checks at once.

## Load note, third update (18:50)

The model's full run (groups 1 to 5) ended at 18:49; its results in `model/results/` are final and
committed (harness repository, 1a82fe4e). The machine is free: lane commands run at normal speed.
`model/model.mjs`, `check.mjs` and the configs stay untouched all the same (the committed results are
fingerprinted against them). The 400 MB cap was there for that run. From now on: 400 MB stays the
default; a per-fix configuration that ends BOUNDED at 400 MB may be run again alone at up to 3000 MB
(`--mem-mb 3000`, one at a time through the lane, in the background when over 140 s), after one line
in your notes saying which verdict it would complete. Nothing larger, and still two faults only.

## The owner's ruling on testing (2026-11-17, about 17:45; it overrides the briefs where they ask more)

His words: "we also want to avoid useless extensive testing that wastes a shit ton of our time", and
"Yes, cut them" to four cuts. The rule behind them: a test runs only if its result can change what we
do next. For this round:
- Model runs: two fields, two faults. One run with everything as built and all fixes on; one ablation
  per fix (its main flag off), which is what shows the fix is needed; a sub-flag ablation only for a
  refuter finding that would break the fix. No three-fault, four-fault or three-field run, no R = 2
  run unless the fix acts on the restart budget, no "each flag alone" matrix beyond what is needed to
  say which mechanism causes a failing property.
- Before any run longer than about ten minutes, write one line in your notes file saying which
  decision its result changes. If none, skip the run and list it under "deliberately not run".
- Attack rounds: no further full round on a fix. A finding that would break a fix gets its change and
  one targeted check of that finding, nothing wider.
- Checks that guard something costly or irreversible stay (nothing stale may be accepted; a READY is
  not discarded; a stop never ends a process that is not ours). If unsure on which side a check falls,
  name it in one line in your return.
- Every return ends with a list "deliberately not run", one line each with the reason.

## The mechanisms and the open defects (ids used in this round)

Oracles to model as built: M2 (arm at start: `status --reconcile` exits 1 alarm-missing, the coordinator
starts the alarm by a separate tool call), M3 (watcher class 17 act-due), M5 (pause discount: a tick
more than 2Δ after the last evaluation leaves the hang count unchanged), M6 (replace re-checks for a
READY under the lock; the child writes READY without it), RC (`status --reconcile`), CE (the `--ce`
fence). Half-modelled: M1 (superseded-alarm exits), M4 (process list unknown).

Open defects (section 16 point 2, lines 994 to 1008):
- D1 wake loop: process list unavailable, reconcile says alarm-missing, each turn starts an alarm that
  supersedes the last, whose exit wakes the coordinator again.
- D2 no coordinator brief carries R6's acts (reconcile first; start the alarm on alarm-missing; act on
  status.json when the watcher exits 17).
- D3 a stale coordinator can start a second session: the session-tool start has no `--ce` fence.
- D4 (a) READY races the fence; (b) a late transcript leads to a double start; (c) a committed child
  holds its slot until a close only a session performs.
- D5 a healthy slow call is suspected as a hang (NoFalseSuspicion fails within 4 steps; proposed:
  count transcript growth).
- D6 one dead turn leaves no wake source (proposed: a dead-man check outside the tree).
- D7 weak properties: RestartLimit vacuous; TwoCoordinatorsAct restates the fence; AtMostOneCommit's
  mechanism never exercised (A-WX equals DF); Slots excludes READY-but-alive children and is weaker
  than R10; A-FENCE-CE has an infinite state space; R5's loop rule never exercised.
