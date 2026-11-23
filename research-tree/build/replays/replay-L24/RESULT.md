# replay-L24 (L24 with L25): result, 2026-11-23

**Answer.** Cache lapses are large here; prefix breaks are not. Of 927.4 M fresh tokens over 121,284 calls (all
projects, October and November 2026), lapses rewrote 151.5 M (16.3 % of fresh, 0.62 % of all tokens) in 703 calls;
breaks that no first call, lapse, compaction or model change explains rewrote 2.6 M (0.28 % of fresh) in 21 calls.
A keep-alive capped at 2 h would save net 95-109 M meter tokens (7.9-8.1 % of the meter at a 1-hour write weight of 1.25
or 2); a 1-hour cache for helpers instead loses at both weights (break-even weight 1.14).

## Counts by project (fresh tokens, M; share of fresh; share of all)

| project | calls | fresh | all | lapse | lapse % fresh | lapse % all | break | break % fresh | sibling-shareable (est.) | compaction |
|---|---|---|---|---|---|---|---|---|---|---|
| FixFlow | 58,736 | 443.7 | 12,924 | 87.7 | 19.8 % | 0.68 % | 0.4 | 0.09 % | 6.9 (1.6 %) | 11.0 (2.5 %) |
| clinic | 21,153 | 154.9 | 5,248 | 37.3 | 24.1 % | 0.71 % | 0.1 | 0.09 % | 2.1 (1.4 %) | 2.1 (1.4 %) |
| harness (this repo, incl. pre-split worktrees) | 18,122 | 137.0 | 2,878 | 11.4 | 8.3 % | 0.40 % | 1.0 | 0.74 % | 3.5 (2.6 %) | 1.0 (0.7 %) |
| research run | 7,065 | 44.9 | 809 | 2.8 | 6.1 % | 0.34 % | 0.0 | 0.00 % | 2.5 (5.5 %) | 0 |
| other folders | 16,208 | 147.0 | 2,761 | 12.4 | 8.4 % | 0.45 % | 1.0 | 0.67 % | 2.8 (1.9 %) | 2.0 (1.3 %) |
| **all** | **121,284** | **927.4** | **24,621** | **151.5** | **16.3 %** | **0.62 %** | **2.6** | **0.28 %** | **17.8 (1.9 %)** | **16.1 (1.7 %)** |

By kind: helpers 88,203 calls, 703.2 M fresh, lapses 87.9 M (12.5 %); sessions 33,081 calls, 224.2 M fresh, lapses
63.6 M (28.4 %). By month: October 101.8 M fresh, lapses 14.8 %; November 825.6 M fresh, lapses 16.5 %.
Lapses are spread: 328 streams, the top 10 hold 30.7 % of lapse tokens.

Where the lapse tokens sit by wait length (age of the cache at the new request):

| wait | helper calls / M | session calls / M |
|---|---|---|
| 5-10 min | 296 / 46.2 | - |
| 10-30 min | 135 / 25.0 | - |
| 30-60 min | 28 / 5.4 | - |
| 1-2 h | 24 / 4.7 | 50 / 18.2 |
| 2-8 h | 26 / 5.5 | 85 / 28.2 |
| over 8 h | 7 / 1.2 | 52 / 17.3 |

The largest single block is helpers waiting just past five minutes (296 calls, 46.2 M, 30 % of all lapse tokens): the
check wait S7 averages 283.8 s, right at the 300 s life of a helper's cache.

## How it was counted (SCORING.md, with its amendment)
- `scan.mjs` read the usage fields, timestamps, models and compaction markers of all 4,438 transcripts (8.9 GB, 26 s).
  1,398 message ids seen in two files (547 M tokens, all kinds) were counted once.
- `classify.mjs`: per stream, `lost` = what the previous call left cached minus what this call read. Classes: first,
  sibling-shareable, compaction, model change, lapse, break, growth. TTL from the recorded 1-hour/5-minute split.
- Check, both sides (`check.txt`, `tally.txt`, `age.txt`): the gap-based rule called 133 calls breaks; 112 of them
  (14.48 M) were lapses once the cache age is measured between requests, not responses (a long previous generation plus
  the wait passed five minutes). So the gap rule false-alarmed as "break" on 112 of 133; the 21 left are the breaks.
  Lapses: 588 of 591 had request age over the TTL (3 did not: 1.06 M, left in). Controls that should not fire (growth
  writes over 20,000 tokens): 0 of 1,892 fired; 6 of them had age over the TTL and still read the cache (a refresh from
  elsewhere), so an age-only detector would false-alarm on 0.3 %. No single harness event marks the 21 breaks: the
  markers between calls (tool list records, token reminders, thinking drops) occur at like rates in the controls.
- Sibling-shareable is an estimate: helper transcripts hold no system prompt. Helpers whose sibling (same parent, same
  model) started within 300 s already read cache on their first call in 2,672 of 3,053 cases (87.5 %); alone, 226 of
  942 (24 %). The 17.8 M is the median first-call read (about 42 K) less what each such first call read.
- Savings (`ka.mjs`): fresh 1, 5-minute write 1, cached read 0.01 (S17, r57-0175), 1-hour write 1.25 or 2. A ping
  reads what was held at 0.01 plus 100 fresh tokens, every TTL less 30 s; it pings through kept gaps too, and through
  the cap after each session's last call.

| keep-alive cap | lapses covered | net saving, w1h 1.25 | net saving, w1h 2 |
|---|---|---|---|
| 30 min | 431 of 703 | 67.6 M (5.6 % of meter) | 67.6 M (5.0 %) |
| 2 h | 533 of 703 | 95.5 M (7.9 %) | 109.1 M (8.1 %) |
| 8 h | 644 of 703 | 128.6 M (10.6 %) | 163.4 M (12.2 %) |

By project at 2 h, w1h 1.25: FixFlow 11.3 %, clinic 7.1 %, research run 4.8 %, harness 2.9 % of each meter.
Ping costs are small beside the savings (7.5 M at 2 h). A 1-hour cache on helpers instead: saves 76.6 M of helper
lapses under an hour but adds (w1h - 1) x 563.8 M of helper writes: -79.5 M at 1.25, -502 M at 2; it pays only if a
1-hour write weighs under 1.14 times a fresh token. A stable prefix (no breaks) saves about 2.6 M, 0.2 % of the meter.

## The seven measures
- Token cost: the subject. Lapses 151.5 M fresh tokens (16.3 % of fresh); a capped keep-alive returns 5.6-12.2 % of the
  meter in these records; breaks 0.28 %; sibling sharing at most about 1.5 %.
- Token count: none; a re-read moves tokens from fresh to cached; all tokens barely change (lapse share of all 0.62 %).
- Time: a cache read is faster than a write; not measured here.
- Throughput, efficiency, quality, hallucinations: not touched by caching; not measured.

## What was NOT tested
- Whether Claude Code lets a helper or a session keep its cache alive at all (no ping exists for a helper; a session's
  wait is the owner's absence, and this PC sleeps after 15 idle minutes). The saving is a ceiling for a mechanism that
  is not yet known to exist here.
- The meter's weight of a 1-hour write (given at 1.25 and 2) and per-model weights (tokens are not weighted by model;
  Fable sessions weigh 2.7-5.6 times Opus per fresh token, so session lapses may weigh more on the meter than shown).
- Request times are inferred from the line before each call; the API's own cache clock is not in the records.
- Sibling sharing is estimated, not measured; the system-prompt part of a helper's first call is not recorded.
- Breaks caused outside the usage fields (for example a changed CLAUDE.md between sessions) are seen only as first
  calls; the 0.28 % covers breaks inside a stream only.

## What it changes next
- L24, the break guard: do not pilot. Breaks inside a stream are 0.28 % of fresh tokens (21 calls); the guard's job is
  small here. The detector itself, if ever built, must use request age, not response gaps (it would false-alarm on 112
  of 133 otherwise).
- L25, cache life across waits: worth acting on, but measure two named things first, both without a model run:
  (1) the 1-hour write weight on the meter, by refitting the 132 meter readings of r57-0175 with 5-minute and 1-hour
  writes apart (sessions already write 1-hour); (2) whether a helper's wait can be kept under 270 s by polling in
  shorter steps instead of one long wait, since the 5-10 minute block alone is 46.2 M (30 % of lapse tokens) and needs
  no new mechanism. Then a pilot on helper waits only; session lapses (owner away, 1 h to days) need a keep-alive the
  app does not offer and are not a target until one exists.
