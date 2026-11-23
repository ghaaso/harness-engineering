# S1 the skill listing (top session 9, helper S1-skills)

## Answer
No setting removes the whole listing. One project setting removes almost all of its text: `skillListingMaxDescChars: 1`
(added to `.claude/settings.json`). Every skill name stays listed and callable; descriptions are cut to one character.
Saving [measured as characters, tokens = characters / 4]: about 4,700 tokens per helper start and per session start.
The effect after restart is not tested (no model run without the owner's word, CLAUDE.md rule 3): [hypothesis] until a
new session's transcript shows the shorter `skill_listing` attachment.

## How skills are switched off now
`.claude/settings.json`, key `skillOverrides`: the 13 FixFlow skills set to "off" (r57-0036). No `.claude/settings.local.json`.
Observed: in this session's transcript (`C:/Users/User/.claude/projects/C--Users-User-Documents-projects-harness-engineering/869a4ba2-e4f5-4824-bad5-875d80769ca1.jsonl`,
attachment `skill_listing`) none of the 13 FixFlow skills is listed [observed]. What is listed: 36 entries,
19,827 characters, none of them project skills: `anthropic-skills:*` (9,987 chars), code-audit (947), dataviz (1,448),
artifact-design/-diagramming/-capabilities (1,139), update-config, code-review (1,217), loop, schedule, claude-api, run, init and
other built-in ones, and, in sessions only, ship-local and steward. User settings (`C:/Users/User/.claude/settings.json`) hold no skill or plugin keys.

## Documentation, with URLs [quoted]
- https://code.claude.com/docs/en/skills (section "Skill descriptions are cut short"): "The listing always contains every skill name, but if you have many skills, Claude Code drops some descriptions to fit the listing's character budget"; "each entry's combined text is capped at 1,536 characters regardless of budget. The cap is configurable with `skillListingMaxDescChars`."
- same page, "Plugin skills are not affected by `skillOverrides`. Manage those through `/plugin` instead." Table: "off" = Hidden / Hidden; "name-only" = Name only.
- https://code.claude.com/docs/en/settings-reference, `skillListingMaxDescChars`: "This key caps how many characters of that text Claude Code shows per skill; longer text is cut at the cap." Type "number of characters, a positive integer"; default 1536; scope "Any file" (so project settings.json counts). (The fetch tool returns a model's excerpt, not the page: this quote is a summary of the page, rule in memory "fetch gives summaries".)
- same page, `skillListingBudgetFraction` (default 0.01 of the context window, fraction > 0 and <= 1); `disableBundledSkills` ("Skills from plugins, `.claude/skills/`, and `.claude/commands/` are unaffected"); `enabledPlugins` (project settings can set a plugin false; needs the `plugin@marketplace` id).
- Subagents: the skills page does not say whether helpers get the listing. Observed: they do. A helper transcript of this session (`.../869a4ba2-.../subagents/agent-a0234069fb0ee42e1.jsonl`) holds the same 19,827-character listing [observed].

## Change made (the only edit)
```
--- a/.claude/settings.json
+++ b/.claude/settings.json
+  "skillListingMaxDescChars": 1,
```
File parses as JSON. Placed before `skillOverrides`. Hooks, permissions, Artifact and session tools untouched.
Rejected: `disableBundledSkills` (would also remove workflows, which user settings enable); `skillOverrides` for plugin skills (documented as ignored); `enabledPlugins` false (plugin ids unknown, not in user settings); `skillListingBudgetFraction` (depends on the window size; the per-entry cap is exact).
Why 1 not 0: 0 is not allowed ("positive integer").

## Counted saving [measured: characters; tokens = characters / 4, marked]
Same listing at a helper start and at a session start in this repository (19,827 characters; a plain helper's listing
equals the session's here; session listing 19,031 in a quieter one lacking ship-local/steward).
- Before: 19,827 chars = about 4,957 tokens.
- After (names plus ": x" per entry, 36 entries): about 912 chars = about 228 tokens.
- Saving: about 18,900 chars = about 4,700 tokens per start, per helper and per session.
- Scale: replay-L24 `tally.txt` counts the listing as about 4.7 % of one class of records; the replays' ceiling for dropping it was 1.9 % of the meter (JUDGE-REPLAYS.md, row L2); the same 4,700 tokens are re-read every call inside the cache, so the fresh saving is the one-time write, the rest is cheaper reads [hypothesis].

## Not removed
- The names of all 36 skills (about 900 characters), including plugin and built-in ones; no project setting drops a name.
- Plugin skills (`anthropic-skills:*`, code-audit) cannot be switched off by `skillOverrides`; only `/plugin` or `enabledPlugins` with the real id can, and user-level state decides it. Not tried.
- The rest of the fixed prefix (tool schemas, deferred-tool names, MCP instructions): not part of this change.
- Side effect: Claude no longer sees what each skill is for. Sessions that need a skill (artifact-design, artifact-capabilities, update-config) must name it, as the Artifact tool text already does. If one proves missed, set those names' budget back by raising this number.

## Not read
Settings-reference text after character 400,000; the `/doctor` or `/context` output (no session run); whether the cap is honoured
at the helper start (to check: first new transcript's `skill_listing` length). Plugin id sources.

## Measured by the coordinator (2026-11-24, after the setting was added)
Same one-line task, general-purpose helper, Sonnet; first call (input + cache creation + cache read):
- before the setting: 57,133 tokens; after it: 50,846 tokens. Saving 6,287 tokens per call (11 %), answer correct.
- Confounded the other way: between the two starts the eight lean helper definitions were added, which lengthen the
  list of helper types a general-purpose helper loads; so the listing's own saving is at least 6.3 K. The cached part
  (39,687) is the same in both; the fall is all in the newly written part (17,444 to 11,157).
- The coordinator session's own context count no longer shows a "Skills" category (6,599 tokens before the edit).
Status: measured once per arm (n = 1); it holds for any session or helper started in this repository from now on.
