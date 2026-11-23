# Step 1, the small token step: what was changed and what it saved (top session 9, 2026-11-24)

Counted on helper transcripts (first call = input + cache creation + cache read), one start per arm, Sonnet, the same
one-line task, answer correct each time. No trial on tasks; the effect on the weekly meter is read on the next real job.

| Change | Where | Measured | Status |
|---|---|---|---|
| Skill listing cut to names | `.claude/settings.json`: `"skillListingMaxDescChars": 1` (S1-skills.md) | 57,133 -> 50,846 tokens per call of a general-purpose helper (-6.3 K, 11 %); the session's 6.6 K "Skills" block gone | made, measured n = 1 |
| Helpers do not idle past the 5-minute cache | line in `top9/briefs/COMMON.md` and template `research-tree/build/briefs/COMMON-WAITS.md` (S2-idle.md) | in the replays 296 lapses cost 46.2 M; 195 of them (35.0 M, 76 %) followed a shell call; 146 of 274 foreground shell calls set a 300 s timeout, the cache's exact life; about 154 K per avoided lapse; ceiling about 30 M | line made; check proposed, not built |
| Lean helpers: only the tools a kind needs | `.claude/agents/lean-{locate,extract,read,collect,run,build,analyse,refute}.md`, `.claude/hooks/README.md` (S3-lean.md) | 57,133 -> 13,564 tokens per call (-43.6 K, 76 %); the three gap readers of this session ran on it | made, measured n = 1 |

Notes. The two savings overlap (a lean helper also carries the shorter skill listing); per helper call the total is
the lean figure. In the meter's terms a cached re-read is about 1 % of a fresh token (r57-0175), so the saving shows
mostly when a helper's cache lapses or is first written. Cost added: the eight definitions put about 4.3 K into
every session's list of helper types (cached). Not removable by a project setting: the 36 skill names (about 230
tokens); plugin skills only by switching plugins off. Cannot be kept under the 5-minute mark: a command longer than
four minutes (it goes to the background with a log), and a helper waiting on its own helpers.
Teammate's note on the rest of the token findings: `research-tree/build/top9/out/TEAMMATE-TOKEN-NOTE.md`.
