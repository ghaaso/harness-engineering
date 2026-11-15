### 9.4 The compaction lever: built here, never switched on, now measured

The largest token lever in §3.6 includes "an earlier compaction setting". This pass found two things about it.

**The testbed had already chosen the number and never applied it.** Its context system, which was never installed, set the auto-compact window to 400,000 tokens (cards A5-01, A5-07, A8-12). The root's own compaction record notes that this lever was not in force (CR-05). The root compacted at 974k and 967k, and the largest slice call was 963k. On 7 November 2026 Horthy described the same figure as his own habit: he lets a session compact automatically at 400k and compacts by hand between 200k and 400k. PR #186 records that post as anecdotal, with no numbers, and files it as already done for FixFlow. So the number is the testbed's own. His post agrees with it and adds no evidence.

**What the November transcripts say it would touch.** Shares are of cache-read tokens, 4,253M in all.

| Session type | Share of November's tokens | In calls whose context had passed 400k | In calls of 200k to 400k |
| --- | --- | --- | --- |
| Slice sessions | 66.4 % | 26.8 % | 29.9 % |
| Root | 15.3 % | 12.4 % | 2.3 % |
| Subagents | 18.3 % | 0.6 % | 5.9 % |
| **All** | 100 % | **39.8 %** | 38.1 % |

Four in ten of November's tokens were in calls whose context had passed 400k. The context above 400k in those calls adds up to 608M tokens, which equals 14.3 % of the cache-read total. **This is an exposure figure, not a saving.** A compacted session falls far below the line, so later calls shrink by more than that. Each extra compaction also pays for a full-context summary call, a cache rewrite and re-reads of recent files. Nobody has measured either effect. Source: `fit/tally-buckets-output.txt`, same transcripts and counting as §2.3.

**What cuts against it, and what is unknown:**

- A 400,000 window triggers near 367k and can overshoot. It is a trigger, not a ceiling (A5-07).
- One vendor-reported benchmark scored a native-compact-first arm at 48.7 against 69.3 for full history (A5-09). It was three runs and is not reproducible here.
- No trial in the testbed compared thresholds. The planned arm was never run (A5-15). The one recall result, 15 of 15 planted facts kept through compaction, is from Codex sessions in an interrupted cohort (A5-13). Nothing tests Claude Code at an earlier window on real slice work.
- The setting exists. Claude Code documents `/autocompact <tokens>`, an `autoCompactWindow` settings key (100,000 to 1,000,000) and the same field per subagent (documentation fetched on 2026-11-11, in `fit/check.txt`). Whether a project setting reaches the desktop app's sessions was not traced (A5-07).
- Whether cache reads count against plan limits is unknown (§4), and the stops were power-offs. A token cut may not cut a single stop.

**Class: Trial, and a weak one.** First compute November's per-slice baseline (§4 item 6). Set the window for one wave. Confirm that it took effect: the compaction records should show about 367k. Charge the compaction calls to the trial's side. Check one compaction summary against the slice's task record for what it dropped. One wave against a different month cannot separate the setting from slice difficulty, so the result will be anecdotal.

