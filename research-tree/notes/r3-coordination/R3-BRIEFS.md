# Round 3: helper briefs (reuse them; every brief starts with "read the charter first")

Every helper: Agent tool, general-purpose, model opus. Each brief begins: "You are helper X (label
`<label>`) of a design-and-model round. Read this charter first and keep to it (its Load note too):
`<NOTES>/R3-CHARTER.md`." and ends: "Return as the charter says (file `BUILD/done/r3-<label>.json`,
answer in at most 250 words)." Only ONE helper runs Node at a time (the modeller). Readers, designers
and refuters need no Node. Set a background wait on the expected `done/r3-*.json` files as a second
wake source: a completion notice can get lost.

## B1 modeller, fence group as built (label `asbuilt-fence`) - was cut at 15:43, restart it

Read `model/as-built/HOWTO-RUN.md`, `MODEL-MAP.md`, `SEM-fence.md` (its part on the smallest faithful
abstraction is the work order), then the copy `model/as-built/model.mjs` and `check.mjs`. Work only in
the copy. NOTE for the restart: the copy's `model.mjs` holds an interrupted helper's partial edits
(15:43); diff it against `model/model.mjs`, keep what is sound or restore the copy, and say which.

Task: model the fence-group mechanisms the way the scripts do them, each behind its own flag, so that
with every new flag off the model is today's (prove it: rerun DF2-K2-R1 and one ablation, compare
states and verdicts with `model/results-as-built/baseline/`):
- M6 as built: the child writes READY without the run lock, in two steps (the hook's check, then the
  write landing; a half-written READY reads as absent); replace's re-check and fence stay one step.
- The session start as built (D3, the CE gap): the coordinator's start of a child session is a step of
  its own, apart from the scripted `replace start`, not fenced by ce; a stale coordinator can take it
  after a hand-over; nothing on disk records it; the child's hook checks only the epoch.
- Start and bind as separate steps; the transcript appearing late (D4b); stop verify confirming an
  attempt whose transcript is late.
- The three-step close of a committed child (D4c); the row committed at `started` that can never be
  stopped (SEM-fence's new finding).
- The old watcher and alarm outliving a hand-over's raise until their next check.
- The branch at `model.mjs:188` (a row marked committed from the commit record, which no script does)
  removable by a flag, so the exclusive-create commit is really exercised.
- M4's unknown case: with no process list nothing is admitted.
Keep the state space small (SEM-fence's merge advice; record what was merged and why it is safe).
Name the flags so the wake group combines with them.
Runs: two-fault only, `--mem-mb 400`. Over about 3 million states a configuration does not fit whole:
a small sequential driver in `model/as-built/` runs its parts one after another inside ONE lane
command and writes ONE result file per configuration into `model/results-as-built/asbuilt-fence/`;
start it in the background (lane `--timeout-s` up to 900; the lane holds a slot at most 20 minutes).
Configurations: the base with all present fixes plus each new flag alone, then all together.
Write `model/as-built/CEX-fence.md`: per configuration the 14 properties (holds, fails with trace
length, BOUNDED, not checked); for each failing property the shortest trace step by step, each step
tied to script lines, and whether the trace is real or an artefact of the abstraction. No fixes, no
weakened property. Say plainly what could not be run.

## B2 modeller, wake group as built (label `asbuilt-wake`) - not started

Same form as B1, from `SEM-wake.md` section 9 (smallest model changes): M1 superseded-alarm exits (one
wake each, up to a period later); M2 as built (reconcile exits alarm-missing, the alarm's start is a
separate act of the turn, a death between leaves no source; reconcile's exits 67 and 75; endturn's
exit 2 hiding alarm-missing); M3 as built (class 17 once per onset, acknowledged by a number the
coordinator picks, judged on what the watcher reads and not on true state; a turn that acknowledges
and does not act); M5 as built (the discount reads the gap between two evaluations, not the fault bit;
the suspends it misses); RC and endturn (process list taken before the lock; the unknown case);
D1 (the supersede chain; needs a timed or counted form because each link waits one alarm period, so
NoBusyLoop does not see it); D5 (hang counts only new assistant messages; the extra tick of a new
epoch); D6 (the seven paths). Also the six fidelity points of MODEL-MAP (mid-turn wakes dropped at no
fault cost; one fairness id for all watchers and all alarms; `n.to` never set). Output `CEX-wake.md`,
results in `model/results-as-built/asbuilt-wake/`.

## B3 blind refuters (labels `refute-fence`, `refute-wake`) - both cut at their start, restart them

Protocol for both, in this order: (1) read the SEM file (and for wake `inputs/HARNESS-FACTS.md`); from
the FIX file read only the top table and each fix's steps and who runs them, not the designer's
arguments; (2) write the attack list first: concrete interleavings and fault patterns with at most two
faults that break a safety or liveness property; a language-model session is not fail-stop and need
not follow its brief, only hooks and scripts are trusted; check against `tcb/` and cite file:line;
(3) then read the designer's arguments and mark each attack answered, partly, not answered; (4) a
verdict per fix: stands, stands with a change (the smallest), falls; and the scenarios the modeller
should replay, as fault schedules in words. Output `model/as-built/REFUTE-<group>.md`.

Attack families, fence (FX-OUT, FX-CLAIM, FX-CGATE, FX-CLOSE, FX-REDO): a death of a session, turn,
script or hook between any two steps; a stale coordinator after a hand-over; a late transcript; the
process list unavailable; a half-written or unreadable file; a hook that does not run, runs twice, or
runs for some tools only; an unverified harness fact the fix leans on (hook input carries
`session_id`, carries the Write content); can a child or coordinator write the claim, slot or
tombstone files itself and go around the hook (the trusted base must be out of the subjects' reach);
exclusive create on Windows and NTFS (antivirus holds, delete-pending names, case, junctions); fixes
acting on each other; what worked before and breaks now (a committed step's READY no longer blocking
later fences); both branches of every open question.

Attack families, wake (FX-W1 to FX-W7): every lease against the classical lease failures (a holder
paused past its lease and resuming, clock jumps, suspends, rule R5: counters run in ticks, not in
elapsed wall time); a guard that refuses the coordinator's acts while no alarm is pending, against a
state where the alarm cannot be started; check-then-act races in every "ensure"; alarm or watcher
processes piling up; a re-raised condition against NoBusyLoop; the dead-man task (who installs it,
who notices it is gone, what it does when the owner is away); the hang rule's three activity classes
(can a hung or dishonest child stay unsuspected for ever; what a ping is, costs, disturbs); breaking a
lock on a lapsed lease against two watchers; unverified harness facts; fixes acting on each other and
on the fence fixes; whether each fix is the smallest that closes its defect.

## B4 designers answer the refuters (labels `fix-fence-2`, `fix-wake-2`) - after B3

A fresh designer per group reads SEM, FIX, REFUTE and revises the FIX file in place (a change log at
its end): each "falls" or "stands with a change" is answered by the smallest change or the fix is
withdrawn and the defect recorded as open. No new mechanism without its runner.

## B5 modeller, the fixes and their ablations (label `model-fixes`) - after B1, B2, B4

Every fix of both FIX files modelled as the scripts would do it (each step and crash point the FIX
file names; no atomic act on true state), each behind a flag. Base = everything as built plus all
fixes: the properties hold at two faults (R = 1 and R = 2, 2 fields). One ablation per fix: that flag
off, the named property fails, with the trace. Replay every scenario the refuters listed. D7: make the
weak properties non-vacuous first (MODEL-MAP gives the reason and the needed form for each:
RestartLimit, TwoCoordinatorsAct, AtMostOneCommit, Slots against R10, A-FENCE-CE finite, R5's loop
rule exercised) and show for each a configuration in which it fails. Where a fix has two branches
(an open question, a property the owner must rule on), model both. Output `ABLATION.md`, results in
`model/results-as-built/fixes/`.

## B6 fidelity review of the new model (label `fidelity-3`) - after B5, fresh helper

The review that found the oracles last time, done again: compare `model/as-built/model.mjs` with the
scripts (SEM files, `tcb/`) and with the FIX files. Is any mechanism or fix still an atomic act on
true state? Is every ablation real (the flag removes the mechanism and nothing else)? Are the
properties what the rules say? Output `model/as-built/FIDELITY-3.md` and
`done/model-fidelity-3.json`. R57 is lifted only if this review finds no oracle left.

## B7 write-up (label `writeup`) and an independent reader (label `writeup-check`)

`inputs/model-findings-3.json` (per property the verdict with each fix modelled as built; each
counterexample's trace; each proposed fix with the ablation that shows it is needed; what is BOUNDED
or not run); `notes/section17-draft-2026-11-17.md` (a draft of section 17 for the protocol document,
in a separate file, not appended; the form of section 16: tables of fixes, amended rule sentences
with line numbers, the state of the model, open defects, what needs the owner); `notes/r3-changes.md`
(per fix: scripts, functions, CONTRACT and spec sections, briefs, profiles, hooks; the harness facts
to check first; plus the follow-up reported by the main coordinating session: `e2e/run-e2e.mjs` runs
`git add tcb` without `core.longpaths` and does not check the result, so it fails from a folder path
over 114 characters). The independent reader checks every number and claim of the draft against the
result files and marks what it could not confirm.
