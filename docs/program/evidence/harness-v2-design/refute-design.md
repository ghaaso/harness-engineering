# Refutation of harness-v2/design.json: soundness and coverage (2026-11-11)

Stance: unsound until shown otherwise. Attacks are ordered most serious first.

## Attacks

1. **The one budget leaves out FixFlow, which uses the same PC and the same usage limit.** Target: `rules[0]`, `rules[1]`, `budget`.
   - What is wrong: the only guard for the ship plan is "never take the Docker gate while a FixFlow backend phase runs". Replays, fresh reviewers and the A/B draw on the same plan limit and the same Opus as the ship phases. The design also never says which build its live steps run on. Live proofs such as "5 of 6 to zero", "no compaction across five gates" and "defect rate against the testbed's rate" need a live wave. If that wave is FixFlow, then "script decides closure" and "two lanes" collide with SP §0's reviewer rule (SP:51-55) and its parallel phases (SP:26-30).
   - Evidence: rules-and-prs.md §1 (PR #183: "no KS session while a ship phase waits on Opus"; HR:40-41). refute.txt:10: "the baseline is a clinic rate and may not transfer".
   - Change: add a rule that no harness agent work runs while a ship phase is in its window or waits on Opus. State that live use is clinic development only, and that nothing amends SP §0.
   - Severity: **must-fix**.

2. **The budget rule starts in phase 1, but its figure is set in phase 5.** Target: `order.changes[0]`, `budget.rules[2]`, `decisions.D18`.
   - What is wrong: phases 1 to 4 must write a token budget "before any launch", yet D18, the decision that sets the figure, is `"phase": 5, "when": "phase 5"`.
   - Change: move D18 to phase 1, or at the latest before the first replay in phase 3.
   - Severity: **must-fix**.

3. **The netting does not net.** Target: `budget.adds[0]`, `phases[2].cost.agents`.
   - What is wrong, the fresh reviewer: it is marked "moved" because it "replaces the root's solo third round". But round 3 was the root reading inside its own context, with no agent (fix-and-merge.md 1a). Round 2 often reused the same reviewer. A fresh agent pays about 70k fixed cost each time. FR:424 nets mechanism 9 against the contract's fresh reviewer. It does not net that reviewer against nothing.
   - What is wrong, agent runs nobody counted:
     - two 20-run write probes (B16 proof; mechanism 11 pass mark);
     - the two arms of mechanism 1's replay;
     - the B01 contract replay on four chains;
     - mechanism 9's replay on five commits.
   - What is wrong, phase 3: its cost says "Replays only", yet phase 3 switches on live gate reviewers, fresh reviewers and final-head reviewers.
   - Evidence: refute.txt:109; fit/review.txt:424.
   - Change: mark the fresh reviewer "added (at most one per round, two rounds)". List every replay and probe with a run count. Rewrite phase 3's agent cost.
   - Severity: **must-fix**.

4. **B04's first step is never built.** Target: `phases[2].builds`.
   - What is wrong: the gate workflow (the reviewers run outside the root and return a typed verdict) is not a build in any phase. Yet B04's proof, `budget.adds[1]` and `sims.root.v2` all assume it exists. The refuter's precondition, a Docker-in-workflow probe, is missing too.
   - Evidence: compile §3.4 B04; refute.txt:2.
   - Change: add a "Gate workflow" build after mechanism 5, with the probe first.
   - Severity: **must-fix**.

5. **"Tokens did not stop the build" overstates the record.** Target: `meta.thesis[1]`, `phases[4].why`.
   - What is wrong: the three-day halt was a power-off. But November did have limit messages on 1 and 3 November (compile §0), and on 4 and 9 November as well (refute.txt:18).
   - Change: write "The three-day stop was a power-off. Usage limits also interrupted work on some days; how much is unmeasured (§4 item 6)."
   - Severity: should-fix.

6. **The restart chain adds boot load before the diagnosis.** Target: `decisions.D03` lean, `deps[0]`, `phases[0].watch`.
   - What is wrong, D03: the refuter wants auto-restart on two databases only until B05 is diagnosed, because a heat trip plus a boot-time restart of every database invites a repeat. On 9 November nine databases were "in use".
   - What is wrong, the 14-day exit: "14 quiet days" turns a sleep proof into a load gate. Days with no build load show nothing about whether load is safe.
   - Evidence: refute.txt:46-47.
   - Change: in D03, cap auto-restart at two databases until the cause is known. Make the second-slot condition "14 days that include build load".
   - Severity: should-fix.

7. **Bottlenecks are claimed by more than one phase.** Target: `phases[0].builds[5].answers` (B16), `phases[4].builds[3]` (B04), `phases[2].builds[2]` (B15).
   - What is wrong: mechanism 7 "does not move the refused-writes count" (compile §9.2 B16), so phase 1 does not answer B16.
   - Change: keep each id only in its home phase. Use "supports" for the others.
   - Severity: should-fix.

8. **"Accepted only by its replay" is claimed more widely than it holds.** Target: `phases[2].oneLine`, `phases[2].doneWhen`, `mechanisms[6].accepted`.
   - What is wrong: three mechanisms have no replay. Mechanism 5 uses planted cases, 10 is a live trial and 11 is an A/B. Mechanism 7's "replay" is a baseline count that accepts nothing.
   - Change: write "each accepted by its stated test (replay, planted cases, A/B or live trial)", and set mechanism 7 to "baseline count".
   - Severity: should-fix.

9. **Owner decisions are missing or incomplete.** Target: `decisions`.
   - Missing:
     - a UPS, after the diagnosis (map-full.txt:115, 213);
     - pre-allowing a reports folder, a permission change (B16);
     - letting a script apply board edits in place of the root (FR:341-345, mechanism 6's owner decision; D12 covers only refusal);
     - a scheduled task for the nightly copy, which is persistent configuration.
   - Incomplete, D10: its title asks about P0 to P3 wording and expiry, but its options cover only the scope of a second look. §6 says "invalidated by code change, never by age", so offer expiry by footprint change (map-full.txt:802).
   - Severity: should-fix.

10. **D02's recommended option may not leave the PC, or may leave it to a third party.** Target: `decisions.D02.options[0]`, `phases[0].builds[0]`.
    - What is wrong: "a drive or folder you own" covers a folder on this PC and a cloud-synced folder. A git bundle is not encrypted, and the encryption tool is unnamed; it could be BitLocker To Go, or it could need an install.
    - Also missing: the refuter's amendment that the copy logs its own success and the resume list alarms past 24 hours (refute.txt:51).
    - Transcript retention is "unchecked", but one settings read could check it (`cleanupPeriodDays`; the documented default is 30 days, not verified here). That is the design's own "one fact, one command" rule.
    - Severity: should-fix.

11. **D17 does not say what leaves the PC.** Target: `decisions.D17`.
    - What is wrong: a rented host, an off-site push and an alert channel send clinic code, a database copy and alerts to outside services.
    - Change: state what data goes, and require synthetic or real-shaped data only.
    - Severity: should-fix.

12. **The candidate-fix replay was dropped without a decision.** Target: `budget.left[0]`, `notBuilt[0].kept`.
    - What is wrong: compile §0 and §5 say to test it first on the recorded chains at near-zero cost, and to keep "the cheap half regardless". The design says "Not in v2". It also cites "up to 18 candidates", which is the superseded live A/B (VD:27-30, overridden by refute.txt:95).
    - Change: schedule the three-candidate replay after the seal, or make deferring it an owner decision.
    - Severity: should-fix.

13. **The touch list is used but never tested.** Target: `bottlenecks[B01].firstStep`, `phases[2].builds[3]`.
    - What is wrong: no build runs the compile's zero-token test of ten recorded cases, and the "ten cases" are undefined (fix-and-merge.md 1c, INFERRED). The fifteen-file drop rule is also missing from `notBuilt[1].kept`.
    - Change: define the cases (nine case lines plus S09 round 2, VD:154) and add the test before the contract replay.
    - Severity: should-fix.

14. **There are two samplers where the compile asks for one.** Target: `phases[0].builds[3]`, `phases[1].builds[3]`.
    - What is wrong: compile §7 names "one always-on machine sampler" for B05, B07, B08 and B09.
    - Change: set up one logger in phase 1. In phase 2, read its build-day output.
    - Severity: should-fix.

15. **The reaper can still remove a session's working copy.** Target: `bottlenecks[B15].firstStep`, `decisions.D08.options[1]`.
    - What is wrong: the reaper must also skip any worktree whose session is not archived (refute.txt:66-67). D08 option 2 calls the risk "small", but the record shows it has already happened once.
    - Severity: should-fix.

16. **The lower stall limit lacks its safety test.** Target: `phases[1].builds[2]`.
    - What is wrong: lowering the limit to 120 s needs the 20-run false-kill proof on a loaded day (refute.txt:43).
    - Severity: should-fix.

17. **The reason for phase 4's position is wrong.** Target: `order.changes[3]`.
    - What is wrong: "only one thing draws on the budget" does not apply, because phase 4 uses no agents. What it really draws on is check minutes, the 2 GB rig VM on a memory-short PC, and your presence for the administrator prompt (refute.txt:14, 86).
    - Severity: note.

18. **Phase 1 competes with P0a for your time.** Target: `decisions.D01`.
    - What is wrong: phase 1 asks for an afternoon of your time "over the first week", while P0a is your pre-flight today.
    - Change: say phase 1's owner steps come after P0a.
    - Severity: note.

19. **notBuilt is incomplete.** Target: `notBuilt`.
    - Missing: the 22 downgraded ids; G2-F104 and G4-F089; G4-F154 and G4-F156 (compile §9.6).
    - Missing from the knowledge-store line: run the frozen A6-10 validation contract before any map or store (§6).
    - Severity: note.

20. **One reordering is not recorded.** Target: `order.changes`.
    - What is wrong: compile §0 puts the fix-round contract (step 4) before the script gate (step 5). The design reverses this, in line with §9.3, but does not list it as a change.
    - Severity: note.

21. **The wait list leaves out a recorded wait.** Target: `sims.queue.measuredWaits`.
    - What is wrong: it omits the recorded 742 s wait (and 700 s); see queue-and-power.md 1b. With 742 s included, the median moves to about 397 s.
    - Severity: note.

22. **D04 omits a setting that is already on.** Target: `decisions.D04.why`.
    - What is wrong: `keep_awake_while_working` is already On (machine-facts.md:26). The 6 November sleep came when nothing was working.
    - Severity: note.

23. **One tension resolution is shortened.** Target: `tensions[3]`.
    - What is wrong: it drops "Nothing in either list offers a cheaper verifier to pay for more review" (compile §9.5).
    - Severity: note.

## Plain language (ten rewrites)

1. `meta.classNote`: "The compile's summary says six builds and four diagnoses; its tables say seven and three. We follow the tables."
2. D13 "hunks": "the changed lines the reviewer marks".
3. D07 "host tooling changes": "only when the Windows-side tools change".
4. "A/B" (mechanism 11, D15): "a with-and-without test".
5. "cache reads" (phase 5, budget.unknown): "the part of each call the model re-reads, which is most of the count".
6. Mechanism 2 "skips, suppressions and check-config edits": "any test switched off, or any check setting changed".
7. Mechanism 5 "under node": delete it.
8. Glossary "exposure" ("how much traffic a change could touch"): "the most tokens a change at 400k could act on; not a saving".
9. "P0" is used in D10 but not defined: add "P0: stops everything" to the `p1` glossary entry.
10. Tensions "base commit": "the commit before the fix". Budget "net: moved": "moved, not added".

## Coverage table

| Item | Status | Note |
| --- | --- | --- |
| a. Phase order | partly | The order holds and the three moves are sourced. But D18 contradicts the phase-1 budget move (2), and the reason for phase 4's position is wrong (17). |
| b. Per phase: build, bottlenecks, proof, decision, cost | partly | B04's gate workflow is missing (4). Bottlenecks are double-claimed (7). Phase 3's agent cost is wrong (3). Each of the eleven no-idea bottlenecks does get a concrete answer. |
| c. Decisions in one place | partly | Hooks, second vendor and custody are present. The UPS, the reports folder, board edits by script and the nightly scheduled task are missing, and D10's options are incomplete (9). |
| d. Not built | partly | The §5 and §6 lists, the 58 and G4-F084 are present. The downgraded and dropped ids and A6-10 are missing (19), and the candidate replay was dropped (12). |
| e. Resolutions and one budget | partly | Seven of eight resolutions are intact and one is shortened (23). The budget mis-nets the fresh reviewer, omits runs and ignores FixFlow's share (1, 3). |
| f. Constraints | partly | The custody destination is ambiguous (10). D17 hides what leaves the PC (11). The permission and scheduled-task changes are not marked as yours (9). |
