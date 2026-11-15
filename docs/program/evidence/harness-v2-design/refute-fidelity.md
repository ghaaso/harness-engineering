# Refute: fidelity of harness-v2/design.json (2026-11-11)

Lens: every number and factual claim against the compile and its evidence. Paths: C = HARNESS-BOTTLENECKS-2026-11.md; E = evidence/harness-bottlenecks/.

## Findings, most serious first

1. **corrections[B16].shows, bottlenecks[B16].diagnosis.** Claim: "A background subagent wrote and read back a file with no prompt." **Dropped caveat.** The probe ran in bypass-permissions mode, where nothing ever prompts (E/machine-facts.md:33; C §8 line 251; E/refute.txt:70). Fix: "In bypass mode, a background subagent wrote and read back a file. The clinic's default mode is untested." Also corrections[B16] "The refusal came from the agent type or the permission mode" is **unsupported**. Those are the three possible causes; which one hit the clinic is unknown (refute.txt:5, 70). Fix: "A read-only agent type, a tool list without Write, or an unanswered prompt can cause the refusal." **must-fix**

2. **sims.fix.steps[6]** (GE-03). Claim: "The root reads the diff alone. A real wrong figure turns up." **Wrong or contested.** For the cutoff guards, round 3 was the root's Opus re-review (E/sweep-tables.txt:66). GE-03 is listed among findings that "only appeared in the final independent re-review" (E/sweep-cards.txt:186), citing review-opus-round3.md:28 (sweep-cards.txt:139). Only A2-02's LIMITS line says the root read the round-3 diff (sweep-cards.txt:141). Fix: "Round 3: an Opus re-review finds a real wrong figure (GE-03). It is fixed and the gate passes." Drop the "root reads alone" chip, or mark it as contested. The clause "There is no round three" still applies. **must-fix**

3. **budget.adds[0] and [1]**, net "moved". Claim: the fresh reviewer per fix round "replaces the root's solo third round". The two-reviewer gate workflow "moves out of the root; they do not multiply". **Unsupported, and it contradicts the refuter.** The root's round 3 was the root reading, not an agent (C §3.3 line 143), so a fresh reviewer agent is added spend. The refuter lists both items as additions that "recreate B03" (refute.txt:109; C §3.6 line 177). C §9.5 line 372 says only that mechanism 9's agent is §3's fresh reviewer, not that §3's reviewer is free. Fix: net "added" for [0]. For [1]: "added, unless the root stops briefing its own reviewers. Unmeasured." **must-fix**

4. **numbers.wait_count / wait_median, sims.queue.measuredWaits.** Claim: 17 waits, median 385 s. **Wrong.** The record also holds 742 s and 700 s (linux-test-runner task.md:88, runs c9 and c12; E/map-full.txt:257; E/sweep-critic.txt:15, 33). That makes 19 waits, median 409 s. Also, the 350 s wait is not dated 9 Nov: refute.txt:34 only says "the same transcript also has". Fix the source to read "plus 2,030 s (9 Nov) and 350 s (root transcript) from refute.txt:34", and add 700 and 742. **should-fix**

5. **meta.thesis[1], phases[4].why, budget.unknown, sims.tokens.assume[4].** Claim: "Tokens were not what stopped the build… Power-offs did." **Misleading.** Limit messages exist on 1 and 3 Nov (C §0 line 20; map-full.txt:89). The build ended on the owner's instruction (C §3.3 line 143; USER-24). Only the 6 to 9 Nov halt was a power-off. Fix: "November's long stop was a power-off, not a limit. Limit hits appear only on 1 and 3 November, and the build ended on your instruction." **should-fix**

6. **numbers tags.** A chosen setting or an outside claim is shown as "Measured":
   - `lock_bound` 2,700 s: "a chosen figure, not measured" (sweep-cards.txt:277)
   - `stall` 600 s and `gib8` 8 GiB: settings
   - `window` 400k: a setting never applied
   - `trigger` 367k: read from the binary, not from a run (A5-07)
   - `vendor` 48.7/69.3: an outside, vendor-reported benchmark, not the testbed record
   - `busy_cost`: a TRANSFER line (the sweeper's inference), not MEASURED (sweep-cards.txt:369)
   - `six_sessions`: a mapper's phrase (map-full.txt:255)
   - `users12`: a drill size, not a result

   Fix: add an "s = setting" tag and an "x = external" tag, or re-tag these "e". **should-fix**

7. **numbers.unread_hr ("5 of 6" high-risk), proofs for B17, mechanism 6 replay.** **Dropped caveat.** C §9.7 line 391 says the testbed's high-risk list is "not yet named". So the denominator 6 is a mapper's own choice (map-full.txt:672). The glossary entry `highrisk` states the list as fact. Fix: "5 of 6, by a mapper's choice of high-risk merges. The high-risk list is still to be named (D12)." **should-fix**

8. **numbers.replay_owner; phases[2].cost.owner.** Claim: "about 3 hours… to sample the review replay", plus "Reading time on three merges". **Misattributed and double-counted.** The 3 owner hours belong to the owner reading marked hunks on 3 high-risk PRs, not to the replay (map-full.txt:673-674). Fix: "about 3 hours for your read of three high-risk merges". Then remove the separate reading-time item. **should-fix**

9. **phases[2].why.** Claim: "The testbed had already tried 71 such ideas as brief lines and model re-checks, and 38 failed." **Wrong.** The 71 are re-screened dropped ideas, of which 33 worked. The 38 failed "mostly as brief lines and model re-checks. A few had a script form and failed too" (C §9.1 line 290). Fix: "Of 142 dropped ideas re-screened, the testbed had practised 71: 33 worked, 38 failed, mostly as brief lines and model re-checks." **should-fix**

10. **phases[2].why** "29 of 87 kept ideas fit, and they reduce to eleven mechanisms". **Misleading.** The mechanisms absorb 29 of the 30 fitting ideas. That count includes R-05, a promoted dropped idea, and excludes G4-F084, a kept idea (C §9.3 line 322). Fix: "29 of 87 kept ideas fit, plus one promoted. 29 of those 30 reduce to eleven mechanisms." **should-fix**

11. **phases[0].why** "The idea lists reach none of this." **Contradicts the design itself.** B03 has a supporting idea (G2-F054), and mechanisms 7 and 8 enter phase 1. Fix: "The idea lists add only the resume check and the one-fact rule here." **should-fix**

12. **phases[2].oneLine** "Each one is accepted only by its replay on the record." **Wrong by the design's own fields.** Mechanism 5 is planted cases, 10 is a live trial, 11 is an A/B, and 7 and 8 start in phase 1. Fix: "Each is accepted by a replay, planted cases, or a small trial, before any live refusal." **should-fix**

13. **meta.thesis[0]** "They need seven decisions from you". **Misleading.** That is the count of Decide-class bottlenecks. The page asks for 19 decisions (D01 to D19). Fix: "seven problems that wait on your decision". **should-fix**

14. **mechanisms[1].what** "no retry". **Dropped caveat.** C §9.7 line 391: flaky tests (A3-14) can fail a base rerun for the wrong reason, "so mechanism 2 needs a rerun rule". Also dropped from C §9.7: the gate-config file set is unnamed, and nobody has checked that the seven known misses' reviewer briefs survive. The B17 and D16 replay depends on that last point. **should-fix**

15. **bottlenecks[B15].diagnosis** "Two app settings that would tidy up by themselves are off." **Misleading.** auto_archive_on_pr_close cannot fire without a remote (refute.txt:66). Fix: "One app setting, auto-archive after N idle days, is off. The PR-close one cannot fire without a remote." **should-fix**

16. **sims.merge.presets[nov11]** `moved: true`. **Unsupported.** The record says the switch merged "with only its own two reviews" and "did not run a further review" (map-full.txt:639, 642). Nothing says the branch moved after review. In the nov10 preset, one of the 4 merges was never separately reviewed at all (sweep-cards.txt:188), so "moved" does not describe all four. Fix: set moved to unknown, or model "no independent reader" without a move. **should-fix**

17. **sims.fix.todayResult** "This happened on most slices". **Misleading.** What happened on most slices is three rounds (9 of 11). The fix-made P1 chains are recorded on three branches: S07, cutoff guards and S11 (refute.txt:10). Fix: "Three rounds happened on 9 of 11 slices. Fix-made P1s are on record in three branches." Also, steps[2] "3 new P2": the record says the rule "introduced RR-1 and RR-2 and left RR-3" (sweep-cards.txt:138). **should-fix**

18. **sims.queue.assume[1]** "Durations are the measured means". **Wrong.** win2 (435) and con2 (266) are single pairs (sweep-cards.txt:287, 418). win1 (284) is the quiet-tree mean, while con1 (230) was measured on a tree where Windows took 367 (C §2.1 line 65). The sim therefore shows about 1.2 times, not the measured 1.6 times. Fix: use 367 for win1, or say so. **should-fix**

19. **sims.queue.presets[v2]** shows two slots. phases[0].watch keeps the second slot shut until the diagnosis names a cause, and the slot size is unmeasured. The assume list covers memory but not this hold, and not the 2 to 3 minutes per run that the first-use walk adds. **note**

20. **sims.power assume (missing items).**
    - The refuter says a nightly copy "may not fire", because 5 shutdowns came around sleep (refute.txt:50).
    - "Uncommitted work is in it" only as of the last copy.
    - Restarting load at boot could repeat a thermal trip (refute.txt:46).

    Also, today[0] says "Sessions are mid-work", but the root had ended its turn at 14:21, and which slices were mid-work is not in the record (read/queue-and-power.md:72). **should-fix**

21. **sims.tokens.assume (missing item).** C §9.4 line 360: "Whether a project setting reaches the desktop app's sessions was not traced." **Dropped.** Also, sketch.text says "Without a window the root compacted at about 970k", which omits the first compaction at 574k (C §2.3 line 88). views[size] says "Large calls dominate the slice sessions", but in slices only 40.4 % of tokens are in calls over 400k and 45.0 % are at 200k to 400k (fit/tally-buckets-output.txt:12-14). **should-fix**

22. **sims.root.assume (missing items).** A measured baseline exists: about 20M cache-read tokens per gate over about 30 gates (map-full.txt:159). The gate workflow needs the Docker-in-workflow probe, and the merge queue is inference (refute.txt:2). **note**

23. **decisions[D16] lean and bottlenecks[B17].firstStep** "with a fresh reviewer". C §3.3 line 148 sets a second model family against a fresh same-model reviewer. C §9.6 line 380 declines G4-F084 only because that arm already exists. The lean option removes it, so say plainly that this is a departure from the compile. **note**

24. **decisions[D09].why** "the measured holders". That was a single no-build reading (machine-facts.md:22). Build-day holders are what the sampler is for. D09 also drops the refuter's warning on a shared test database: it must join each check's network and becomes a single point of failure (refute.txt:38). **note**

25. **budget.ceiling[3]**, about 48 agents. The 70k is resident context that every call re-reads, not a one-off cost, so 48 is an upper bound for one-call agents. The text calls it "for scale", but the caveat is missing. **note**

26. **phases[3].cost.build.** e_p4 already includes the "1-2 sessions of build" for the rig (map-full.txt:732), so "plus one or two sessions to close the rig's gaps" counts it twice. **note**

27. **numbers.merges 65** used for the merge-queue replay. The 65 are merge commits on all branches. Merges onto main are 36 (sweep-cards.txt:1062). **note**

## Checked and found correct

- Class counts. The tables give Decide 7 (B03, B06, B10, B11, B15, B18, B19), Build 7 (B02, B07, B13, B14, B16, B20, B21), Diagnose 3 (B05, B08, B09) and Trial 4 (B01, B04, B12, B17), so C §0's "six … four" is wrong and meta.classNote is right. One small wording point: B06 and B18 share one row, so the sources should say "bottlenecks classed", not "rows".
- The 29 idea ids across the 11 mechanisms match C §9.3 exactly. Every mechanism's bottleneck list and decision link matches too.
- All 21 ideas.fit values match C §9.2. 11 have none, B17 is direct, and the other 9 are supporting.
- Shutdowns: the 24 events by day, 4 button flags, 5 sleep flags and the 7 Oct crash match machine-facts.md:7-11. So do 23 no-code, 2 out-of-memory events, 8 in October, and the 14:57:52, 14:58:23, 15:13:10 and 16:07 times plus the three later offs.
- Check and container timings: 855, 284, 3.0×, 367, 230, 1.6×, 266/267, 220, 5.3 GB, 435, about 980 samples, 2.1-6.2 GiB, the 1,116 s stall and 476 s rerun.
- Tokens: the tally shares (15.3, 66.4, 18.3), 499k, 306k, 9,342 calls, 4.25 billion, every band, 39.8, 26.8, 12.4, 608M and 14.3 % with its ratio caveat, the 5,265 subagent calls at about 153k, and the compaction sizes.
- Fix-round and review figures: 9 of 11, 19 P1 (sweep-tables:102), at least 5 P1 (confirmed by refute.txt:10), 4 of 5, 2 of 2,570, 111, 183, 20-plus, 221,112 bytes, and the CR-04 lane figures.
- The rest: all targets taken from C §3 Proof columns, the §9.5 tensions, the estimates, and the 10 Nov owner-instruction, exposure-not-saving and fix-contract-is-a-trial caveats where they appear.

Could not check: SHIP-PLAN-2026-11.md section 0 (rules[0]) and the original testbed task.md lines behind the cards. Both are outside the folders I was given.
