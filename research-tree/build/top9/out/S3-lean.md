# S3 lean helper definitions (top session 9, 2026-11-24)

## Made
Eight files in `.claude/agents/`: `lean-locate`, `lean-extract` (haiku); `lean-read`, `lean-collect`, `lean-run`, `lean-build`
(sonnet); `lean-analyse`, `lean-refute` (opus). Tools: locate Read/Grep/Glob/Bash; extract Read/Grep/Glob/Write; read, run,
analyse, refute Read/Grep/Glob/Bash/Write; collect adds WebFetch and WebSearch; build adds Edit. No Skill, Agent, browser,
Artifact or session tools. One line of README: `.claude/hooks/README.md` (new file, beside `tier-routes.json`). Tier routes
and hooks unchanged. [observed: files written]

## Documentation read (https://code.claude.com/docs/en/sub-agents, first 100,000 of 114,867 characters) [quoted]
- Definitions: `.claude/agents/*.md`, frontmatter; project level beats `~/.claude/agents/`.
- `tools` is an allowlist; "Inherits every tool available to subagents if omitted". With `tools` listed, MCP tools are
  included only if named. So listing tools drops the MCP tool schemas (browser, artifact, session, docs).
- `model` precedence: the call's `model` parameter, then the definition's, then CLAUDE_CODE_SUBAGENT_MODEL, then the
  parent's (agrees with r57-0108). The tier hook demands an explicit model on every call, so the call's value wins; I set
  the same model in the definition so it is right either way.
- A new definition is picked up "within a few seconds ... no restart needed"; if not found, restart.
- Not answered by the excerpt: whether deferred tool names and the skill listing still load in a lean helper. The skills
  field "controls which skills are preloaded"; without `Skill` in `tools` the Skill tool is gone, but the listing may stay.
  [hypothesis] The 6.3 K skill listing and 2.5 K deferred names stay; the measurement below tells.
- Not read: the last 14,867 characters of the page.

## Not switched off
`.claude/settings.json` denies only `Agent(fixflow-...)` by name and turns off FixFlow skills; `lean-*` names match neither.
[observed: settings.json]. Check by the measurement itself (a start that fails would show it). Note `CLAUDE_CODE_FORK_SUBAGENT=0`
is set there; unrelated.

## Expected saving [hypothesis, from replay-L2 section 4, `research-tree/build/replays/replay-L2/RESULT.md`]
A harness helper's first call is a median 57,565 tokens, of which tool schemas about 40,717 (+-20 %). A lean-read set
(5 tools) is at most a few thousand tokens. Expect first call about 17-22 K (listing 6.3 K, deferred names 2.5 K, CLAUDE.md
and memory 3.9 K, system prompt 1 K, plus 5 tools), a fall of roughly 35 K (60 %). If deferred names still list the
dropped MCP tools, they may stay. Ceiling on the meter: lean A saves 15.6 % at most (same file, section 6), so a realistic
whole-run gain is nearer 8-10 % [hypothesis]. Extra turns from fewer tools are not modelled.

## Measurement for the coordinator (do not start from here; I started nothing)
Start two tiny helpers in one message, the same task, explicit model sonnet, descriptions starting `read:`:
1. `subagent_type: general-purpose`, prompt: "Read research-tree/START-HERE.md line 1 and reply with it."
2. `subagent_type: lean-read`, the same prompt.
Both small, so the brief is equal. Then, from the repository root, read each first call's size (context = input +
cache creation + cache read of the first assistant message, as scan.mjs counts P). Helper transcripts are
`C:/Users/User/.claude/projects/C--Users-User-Documents-projects-harness-engineering/<session id>/subagents/agent-*.jsonl`;
`agentType` is in the neighbouring `.meta.json`.
```
node research-tree/build/replays/replay-L2/scan.mjs <scratch>/s3.jsonl 0 1
```
That scans all transcripts (about 1,000 files; slow, minutes), then print the two newest rows:
```
node -e "const r=require('fs').readFileSync('<scratch>/s3.jsonl','utf8').trim().split('\n').map(JSON.parse).filter(x=>x.role==='helper').sort((a,b)=>b.file.localeCompare(a.file)); console.log(r.slice(0,4).map(x=>[x.agentType,x.model,x.P,x.firstIn,x.firstCC,x.firstCR].join(' ')).join('\n'))"
```
Cheaper: skip the scan and read the first assistant line of each of the two transcripts, summing `message.usage`
input_tokens + cache_creation_input_tokens + cache_read_input_tokens (the same P). Note the first call of a second helper
may read cache from the first (cache_read), but their sum P is still comparable. Compare P of the two; decision: lean-read
adopted if P falls by 25 K or more and the answer is correct.

## Not read
The scan script's later parts beyond line 120, `aggregate.mjs`, `tier-hook.mjs` in full (only grep of lines on model/kind).

## Measured by the coordinator (2026-11-24, after this file was written)
Two helpers, the same one-line task (read line 1 of top9/briefs/COMMON.md and reply with it), Sonnet, both answered correctly.
First call (input + cache creation + cache read of the first assistant message, from each subagent transcript):
- general-purpose: P 57,133 (cache creation 17,444, cache read 39,687: most of its prefix was already cached by other helpers)
- lean-read: P 13,564 (cache creation 13,562, cache read 0: its own new prefix)
Saving: 43,569 tokens per call in total tokens (76 %), on every call of a helper since the prefix is re-read each call.
In the meter's terms (r57-0175: a cached re-read is about 1 % of a fresh token) the saving per call is small while the
cache holds; it is large whenever a helper's cache lapses, since a lapse re-writes 57 K fresh instead of 13.6 K. Decision
rule of this file (fall of 25 K or more, answer correct): met. Not measured: helpers that need the tools the lean sets drop.
