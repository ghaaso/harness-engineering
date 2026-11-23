# replay-L24 (L24 with L25): scoring, fixed before any count (2026-11-23)

## Records in
- Every `*.jsonl` under `C:/Users/User/.claude/projects/*/` (sessions) and `*/<session>/subagents/**.jsonl` (helpers).
- A **stream** is one transcript file. Kind: `helper` if the path holds `/subagents/`, else `session`.
- A **call** is one assistant message id with a `usage` object. Lines repeating a message id are one call (usage taken
  from the last line of that id). A message id seen in more than one file counts once, in the first file met
  (files sorted by path); the duplicates are reported as a count (the double count named in r57-0175).
- Calls with `model` `<synthetic>` or with all four usage fields zero are out.

## Records out
- Nothing outside the usage fields, timestamps, models, line types and compaction markers is read. No content.

## Projects (from the folder name)
- harness: `...harness-engineering*`, and the EMS-workshop1 worktrees named `harness-ideas-*` or `knowledge-store-research-*`
  (harness work before the split of 2026-11-16).
- run: `C--research-runs-2026-11-harness-leads`.
- fixflow: `...EMS-workshop1` (main and all other worktrees) and `...23-FixFlow`.
- clinic: any folder with `Clinic-Workshop`.
- other: everything else (scratch workspaces, other repositories); reported, not argued from.
Month: from the call's timestamp (UTC).

## Tokens
- fresh = input + cache_creation + output; all = fresh + cache_read. Shares are given of fresh and of all, per project
  and month, with the denominators.
- For each call, `held` = the previous call's (cache_read + cache_creation) in the same stream: what the cache held
  after the previous call. `lost` = max(0, held - cache_read): tokens that were cached and had to be written again.

## Classes of a call with cache_creation > 0 (first match wins)
1. **first**: the first call of a stream. Split for helpers into
   - **sibling-shareable**: a helper's first call when another helper of the same parent session and the same model made
     its first call within the 300 s before. Its shareable part = min(this call's cache_creation, the median cache_read
     of helper first calls that did read from cache, same model) (an estimate of the common system-and-tools prefix;
     helper transcripts do not hold the system prompt). Counted also when the call already read some cache: then the
     shareable part is reduced by its cache_read.
2. **compaction**: the first call after a `compact_boundary` line in the stream.
3. **model change**: the model differs from the previous call's (a cache is per model).
4. **lapse**: gap since the previous call in the stream > TTL and lost > 1,024. TTL = 3,600 s when the previous call
   wrote 1-hour cache (`ephemeral_1h_input_tokens` > 0) or, with no split recorded, when the stream is a session; else
   300 s. Its tokens = lost. Also counted: gaps over TTL where lost <= 1,024 (the cache survived: a lapse that did not
   happen), so the lapse rate has its denominator.
5. **break** (broken prefix): none of the above and lost > 1,024. Its tokens = min(lost, cache_creation).
6. **growth**: the rest (cache_read >= held - 1,024): the normal write of the new tail. Not waste.
Threshold 1,024 tokens: the smallest cacheable block; it absorbs counting noise.

## Hit, miss and false alarm (rule 4)
- The lead's detector fires on classes 4 and 5. A **hit** is a flagged call whose cause, read from the line types,
  hook attachments, tool calls and timestamps between the two calls, is a real prefix change or a real expiry. A **false
  alarm** is a flagged call whose cause is one of the explained classes the script missed (an unmarked compaction, a
  resumed or forked file, a retried call after `api_error`, a parallel call of the same turn).
- Check: a stratified sample of 40 flagged calls (20 breaks, 20 lapses, by project as the records allow) and 20 calls
  of class 6 with cache_creation > 20,000 (should not fire), read line by line by script output. The share of false
  alarms in each sample is reported with its count.

## Savings on the meter (unit: Opus fresh-token equivalents)
- Weights: input and output 1; a 5-minute cache write 1 (r57-0175 fits fresh tokens weighted alike); a cache read 0.01
  (S17); a 1-hour cache write w1h = 1.25 and, separately, 2 (not known here).
- Keep-alive on lapses: saves lost x write weight; costs one ping per (TTL - 30 s) of the gap, each a read of `held` at
  0.01 plus 100 fresh tokens.
- 1-hour cache for helpers instead of keep-alive: saves helper lapse writes; costs (w1h - 1) x every helper write.
- Stable prefix: saves break tokens x write weight (less 0.01 per re-read).
- Sibling sharing: saves the shareable part x write weight (less its 0.01 read).
- Each saving is given as a share of the meter's fresh total in the same records.

## What would mean "do not pilot"
- Breaks plus lapses (tokens) under 2 % of fresh tokens in every project with at least 1,000 calls, and the net keep-alive
  saving under 1 % at both weights: drop L24 and L25 as pilots (adopt the detector only as a log line if it is free).
- Over 5 % in any such project: a guard is worth building; under 2-5 %: measure the cause of the largest class first.

## Amendment after the first counts (kept apart; the lines above are unchanged)
- Line kept: lapse and break are told apart by the gap between the two calls' response timestamps.
- Why changed: the check (check.txt, age.txt) showed that 112 of the 133 calls classed **break** (14.48 M of 17.04 M
  tokens) had a cache age over the TTL when the age is measured between the two **requests** (the timestamp of the last
  non-assistant line before each call): a long generation of the previous call (often a Write) plus the wait passed the
  five minutes while the response-to-response gap did not. Those are lapses. They are moved to the lapse class
  (`age.mjs`, `reclassified.json`); the 21 left are the breaks. The gap-based break rule is reported as having fired
  falsely on them (112 of 133).
- Keep-alive savings are given with a cap on how long it pings (30 min, 2 h, 8 h; `ka.mjs`), because session gaps run to
  days and an uncapped keep-alive is not a mechanism anyone would run. `report.txt`'s keep-alive column (no cap, two
  pings at a session's end) is superseded by `ka.txt`.
