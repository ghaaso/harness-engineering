Extracted 2026-11-19 from the claude-api skill

Sources: SKILL = claude-api SKILL.md (its "Current Models" table is marked "cached: 2026-11-03"; prices defer to the live pricing page). models.md = shared/models.md in the same skill. "not in skill" = the skill does not state it.

| Field | Fable 5.2 (`claude-fable-5-2`) | Opus 5.5 (`claude-opus-5-5`) | Sonnet 5.5 (`claude-sonnet-5-5`) | Haiku 5.5 (`claude-haiku-5-5`) |
|---|---|---|---|---|
| Context window | 1M, "the maximum is also the default" (SKILL, "### Claude Fable 5.2"; Current Models table) | 1M (SKILL Current Models table; models.md Current Models table) | 1M (SKILL Current Models table) | 1M (SKILL Current Models table; models.md Current Models table) |
| Larger window (e.g. 1M via beta) | not in skill (1M is stated as the maximum) | not in skill | not in skill | not in skill |
| Max output tokens | 128K (models.md Current Models table, "Max Output" 128K) | 128K (models.md Current Models table) | 128K (models.md Current Models table) | 128K (models.md Current Models table; SKILL Common Pitfalls "128K output tokens") |
| Input $/MTok | 8.00 (SKILL Current Models table) | 4.00 (SKILL Current Models table) | 2.00 (SKILL Current Models table) | 0.10 for prompts up to 100K tokens; 0.50 above that (SKILL Current Models table and the Claude Haiku 5.5 section) |
| Output $/MTok | 40.00 (SKILL Current Models table) | 20.00 (SKILL Current Models table) | 10.00 (SKILL Current Models table) | 0.50 up to 100K tokens; 2.50 above (SKILL Claude Haiku 5.5 section) |
| Cache write $/MTok | 5-minute $10; 1-hour $16 (models.md, "Claude Fable 5.2" description) | not in skill | not in skill | not in skill |
| Cache read $/MTok | 0.20 (models.md, "Claude Fable 5.2" description; "0.025x") | 0.20 (models.md, "Claude Opus 5.5" description; SKILL Claude Opus 5.5 section) | 0.10 (SKILL, "### Claude Sonnet 5.5": "except cache reads at $0.10"; models.md Sonnet 5.5 description) | not in skill |
| Batch $/MTok | 4 input / 20 output (models.md, "Claude Fable 5.2" description) | not in skill | not in skill | not in skill |
| Fast mode $/MTok | 16 / 80 (SKILL "## Fast Mode": "$16 / $80 per MTok") | 8 / 40 (SKILL "## Fast Mode": "$8 / $40 per MTok") | not in skill | not in skill |
| Rate limits (stated) | "its own rate limit, separate from the one Claude Fable 5.1 and Claude Fable 5 share" (models.md, "Claude Fable 5.2") | not in skill | not in skill | not in skill |
| Priority Tier | not supported ("No Priority Tier", models.md; SKILL "Priority Tier is not supported on every current model") | not supported (SKILL "Priority Tier is not supported...": Opus 5.5 excluded) | not supported (same SKILL line: Sonnet 5.5 excluded) | not supported (same SKILL line: Haiku 5.5 excluded) |
| Fast mode rate limit | separate from standard limits (SKILL "## Fast Mode": "Fast mode has its own rate limit separate from standard rate limits") - applies to fast mode on each model that offers it | same line as Fable 5.2 | not in skill (no fast mode stated) | not in skill (no fast mode stated) |
| Thinking config | Always on; omit `thinking` or send `{type: "adaptive"}`; `{type: "disabled"}` and `{type: "enabled", budget_tokens}` return 400 (SKILL "### Claude Fable 5.2" and Thinking table, Fable row) | Omit or `{type: "adaptive"}`; `disabled` and `budget_tokens` return 400 at every effort level (SKILL Thinking table, "Claude Opus 5.5" row) | Omit or `{type: "adaptive"}`; `disabled` returns 400; `{type: "between_tools"}` turns thinking off at effort `high` or below (SKILL Thinking table, "Claude Sonnet 5.5" row) | Omit or `{type: "adaptive"}`; `disabled` only at effort `high` or below (SKILL Thinking table, "Claude Haiku 5.5" row) |
| Effort levels | low, medium, high, xhigh, max (SKILL Thinking table) | low, medium, high, xhigh, max (SKILL Thinking table) | low, medium, high, xhigh, max (SKILL Thinking table) | low through max (SKILL Thinking table) |
| Default effort | high (SKILL "Effort" bullet: default `high` except Opus 5.5 and Haiku 5.5; models.md "default effort `high`") | medium (SKILL Thinking table: "default `medium` (not `high`)") | high (SKILL Thinking table, "default `high`, levels recalibrated") | medium (SKILL Thinking table: "default `medium`") |
| Thinking display default | omitted (SKILL "Thinking display" bullet) | omitted (same bullet) | omitted (same bullet) | omitted (same bullet) |

Notes for the reader:
- Rate limits are not stated for Opus 5.5, Sonnet 5.5 or Haiku 5.5 in the skill. The only rate-limit statement is for Fable 5.2 and the generic fast-mode line.
- Prices are the skill's cached values (2026-11-03). They are relative weights only, as requested.
