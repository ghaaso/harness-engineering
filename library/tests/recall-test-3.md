# Recall test 3 (a session that knows nothing, answering ten questions from the filled library)

Read first: INDEX.md whole, README.md "Looking something up" and "The board". One cited place opened (Q6).

## Questions

1. Heavy commands at once: TWO. Known from the lane's capacity file (research-tree/lane/capacity.txt held 2 on 2026-11-18; lane.mjs default 1, max 4) and from the lane log: two ran at once for 41 of 324 minutes, never three.
   Records: r57-0127, o1-0101, r57-0801 (replaced r57-0104, which said one). Sure. Searches: 2. In the way: nothing; the board's Corrections section flagged the old "one" answer.
2. Slow job: at every start and finish, work out for each resource how many units it can carry (memory: peaks that fit free memory above a reserve; processor: busy threads at most 24; the check; shared files; tokens above a reserve; units ready) and run at the smallest; that resource is the bottleneck. If memory: admit an agent only if its measured resident size plus a margin fits free memory; when short, stop the lowest-priority job first. Untested.
   Records: r57-0408, o2-0401, r57-0129 (25 episodes: queue 9, blocked starts 7, memory 4, tokens 4). Partly (hypothesis; no number set, r57-0511). Searches: 2. In the way: o2-0401 is reached only by word; the board names r57-0408 only.
3. Same function, same file: do not use "one writer per file" (owner rejected it, r57-0012). Decide per file: known conflict places (7 ordered sequences, 4 same-statement, of 20 shared) get one owner at a time or are split first; separate entries get own copies merged later. At run time a file moves to one owner when (chance of conflict x cost of redo) exceeds the cost of waiting, counted in what is scarce now (tokens and check time vs clock time). Threshold not computed.
   Records: r57-0406, r57-0012, r57-0128. Partly (reasoned, untested). Searches: 2. In the way: I had to join the rule (r57-0406) with the collision counts (r57-0128).
4. Not by itself. Recorded: the allowance is a budget, not a rate; units side by side cost the same tokens in total as one after another; extra tokens only through redone work and a waiting session re-reading its context; it limits concurrency only when a window is nearly spent. One trial: five Sonnet readers together 767,000 tokens, four minutes, under 1 point of the week.
   Records: r57-0408, r57-0115 (measured, one trial), o2-0501 (no paper on a refilling allowance). Partly (the claim is reasoned; one measurement, one trial). Searches: 2. In the way: no record states it as a stand-alone fact.
5. Denning 1968, "Thrashing" (AFIPS): in his model of n programs that just fill memory, one more program gives "a complete collapse of service". The refuter changed two things: the analyst's draft said "no measurement" (the paper cites one: a 10 times shorter transfer time gave about 10 times the throughput) and named one cure (there are two: a working-set reserve, and/or cut transfer time T).
   Records: o2-0300 (also o1-0305). Sure (quoted). Searches: 2. In the way: "thrashing" gave 10 hits, the right one third; "admit" gave 19 and missed it.
6. Brun and others 2013 (Crystal, 5,355 merges, 3 projects): 1 % build failures and 6 % test failures of ALL merges; 16 % textual conflicts; 76 % completed cleanly. Kasi and Sarma: of clean merges 2.1 to 14.7 % had build failures. Trust: quoted from the full text and the cited line (concurrency-lit-5-integration.md line 183) matches the record. But human open-source teams, not agents; the paper's own "clean merges" wording disagrees with its count (r57-0305 note, x06-0101), so read 1 and 6 % as shares of all merges.
   Records: r57-0305, x06-0356, x06-0360, x06-0101. Partly (figure sure, its reach limited). Searches: 3. In the way: the exact phrase "textually clean" found nothing; "build failure" worked.
7. Documentation (status "summary", read from a summary): PreToolUse runs before each call, including calls inside subagents; exit 2 or permissionDecision deny blocks it; it may allow, ask or defer; updatedInput replaces the whole tool input; for Agent it sees subagent_type and model and may deny or rewrite; a timeout does not block unless onFailure is block. Seen on this PC: yes, once: a hook refused a write outside an allowed folder and a helper's refused model, also with permissions bypassed (Haiku, app 2.1.325); about 37 ms a start; not tested for Edit, timeout, shell writes.
   Records: x01-0302, x01-0303, x01-0304, x01-0311, r57-0105, r57-0106. Sure on what was seen here, partly on the documentation. Searches: 2. In the way: doc claims exist only as x records of status summary; I did not open the doc.
8. 14 rules ran and worked, 9 ran and failed or were changed, 25 never run (one run, 2026-11-01); the evidence README says 12/11/24, unreconciled. Failed or changed: the W0 owner pre-flight (not done); the cap of 12 Opus skeptics (used up by the first four analysts; overflow ruled "corroborated" not "unverified"); also Docker up before W1. Overhead measured about 60,000 tokens, not 7,500.
   Records: r57-0201, r57-0208, r57-0209. Sure. Searches: 1. In the way: nothing.
9. Not recorded. Nearest figures are not a helper: one test-suite run peaked at 494 MB working set, 332 MB private (r57-0103); a check's peak memory never measured (x09-0241); a model run's memory peak never recorded (r57-0129); per-class peaks are an open measurement (r57-0511).
   Records: r57-0103, r57-0129, x09-0241, r57-0511. Not recorded. Searches: 3. In the way: "peak" returned 58 hits; r57-0103 is a tempting wrong answer.
10. First: r57-0504, how the chosen algorithms are built into the harness and the tree's scripts (blocked by nothing; start from r57-0705, the decision-rule file). Not without the owner's word: any round he did not ask for (r57-0007); the measurements that set the rule's numbers (r57-0511) and the small tests (r57-0506); the build (r57-0507, also needs him to have seen the rule); no design questions to him (r57-0001); parameters computed, not asked (r57-0002).
   Records: r57-0504, r57-0007, r57-0511, r57-0506, r57-0507. Sure. Searches: 1 (board). In the way: nothing.

## What the filled library changed

- Extractor records (x): helped on Q6 (x06-0356 and x06-0360 hold the exact figures) and Q7 (documentation claims live only there); got in the way on Q9 and Q4 (long word hits full of x records about other subjects). The board's "read the cited place first" rule was followed once (Q6) and matched. Q1, Q8, Q10 were answered from the board without any x record.
- Word search: typical 10 to 60 hits (thrashing 10, admit 19, peak 58). Right record in the top three for Q5 and Q7; absent from the "admit" search. Order is by file name, so rank means nothing.
- "Journal files" directory: not needed to find a file, since lookup.sh searches all of them; it told me what each x file holds, which helped judge Q7. It cannot lead from a question to a record.
- Defects: `lookup.sh <word> | head` printed hundreds of "sed: couldn't flush stdout" errors (broken pipe); an exact phrase with no match gives "not recorded" even when a near miss exists; a word like x06 matches every line containing it.

## Changes, most useful first

1. Under Known gaps add "memory of one agent session: not measured (r57-0103 is a test suite, not a helper)"; today it is only implied.
2. Add a Before-you-do row "Does more parallelism use more tokens": r57-0408, r57-0115, o2-0501.
3. Make lookup.sh print current non-x records first, then x records, with the count, and fix the broken-pipe sed errors.
4. Let lookup.sh take several words (all must match) and fall back to any-word when the phrase finds nothing.
5. Add to the board a row "Cite a figure on merges": r57-0305, x06-0356, x06-0360, and the "clean merges" wording doubt.
6. Put o2-0401 (memory admission) and o2-0403 on the "how many at once" and "slow job" rows; they are reached only by word now.
7. Add a Published results line for Denning (o2-0300) with the refuter's two changes.
8. In "Journal files" mark each x file as docs-claim (summary, e.g. x01) or measured (x14, x18), so a reader knows which x file to trust before opening the cited place.

Totals: sure 4 / partly 5 / not recorded 1; searches 21; records read about 60.
