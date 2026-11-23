# S1 the skill listing. Name: S1-skills
Goal: stop the skill listing loading into this repository's sessions and helpers, if a setting allows it.
Evidence: `research-tree/build/replays/JUDGE-REPLAYS.md` and `research-tree/build/replays/replay-L24/RESULT.md`
(the listing loads and is unused in 996 of 1,029 transcripts although the archived skills are switched off by
settings: library records r57-0036, r57-0155; look them up with `bash library/lookup.sh -f <id>`).
1. Read `.claude/settings.json` (and `.claude/settings.local.json` if present) to see how skills and agents are
   switched off now. Find in Claude Code's own documentation (code.claude.com / docs.claude.com pages on settings,
   skills, plugins, subagents) whether any setting removes the listing of skills (project skills, user and plugin
   skills, built-in skills) from a session's or a helper's start-up text. Web queries carry no project name, path
   or identifier (CLAUDE.md rule 4). Quote the documentation line and its URL.
2. If a project-level setting removes it (or part of it) without switching off anything this repository's
   sessions use (the hooks, the Artifact and session tools), make that change in `.claude/settings.json` only,
   and keep the file valid JSON. If it needs user-level settings or none exists, change nothing and say so.
3. Count the saving: the listing's size in tokens at a helper's start and at a session's start, from transcript
   text (characters / 4 is acceptable if marked so) or from replay-L24's figures; say which part a project setting
   cannot reach.
Output `research-tree/build/top9/out/S1-skills.md`: the setting (quoted), the change made (a diff) or why none,
the counted saving per helper and per session start, what is not removed.
