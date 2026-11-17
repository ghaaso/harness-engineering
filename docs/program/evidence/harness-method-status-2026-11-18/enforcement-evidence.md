# Enforcement evidence: what the record shows (extraction, 2026-11-18)

Facts and their sources only. No verdict. Paths are under the repository root unless they start with C:. "HV" = docs/program/HARNESS-V2-DESIGN-2026-11.md. "HB" = docs/program/HARNESS-BOTTLENECKS-2026-11.md. "HR" = docs/program/HARNESS-REVIEW-2026-11-01.md. "RT" = research-tree.

## 1. Every recorded experience with hooks

**1.1 The testbed's pre-commit hook (the only hook that ran).**
- HB:108: "a verify command and pre-commit hook, with eight red-team defects still open, including "verify passes when every test is skipped" (A7-02, A7-04, A7-13)".
- docs/program/evidence/harness-bottlenecks/map-full.txt:451: "A7-04 verify command and pre-commit hook: Vacuous success (RT-01), python -O strips asserts (RT-02), the hook checks the working tree and not the commit (RT-04). Abandoned with eight defects open."
- Same file :442: "A7-04 and A7-13: verify hook treats 'Ran N tests' as success (tools/coding_workflow.py:354); RT-01..RT-09 found, 8 left open".
- Why it stopped: the record says "Abandoned with eight defects open". It does not say who abandoned it or when.

**1.2 The harness review skipped hooks (2026-11-01). Reasons as written:**
- HR:272: "Pre-commit verification hook | skip (RT-04/05 defects; CI gates the PRs)".
- HR:273: "Context system (PreCompact snapshot, SessionStart restore, recall, large-read admission) | skip | never run live; Python; undocumented PreCompact behaviour; owner decision 2026-11-01 keeps it in its repo".
- HR:274: "A `SessionStart(compact)` hook ... | skip for now | one phase per session makes compaction rare".
- HR:327: "**HR-C3:** no PreCompact hook, no context-system install, idle compaction left on."
- HR:330-333 (HR-C5, "deferred, exact text"): the SessionStart hook JSON is kept in reserve, with "the audit's two risks stand: confirm `$CLAUDE_PROJECT_DIR` expands in the hook shell on Windows, and the hook also fires after subagent compactions".
- HR:48 and :293: a third-party hook "reportedly (wiki; the README is silent) nudges every Grep/Read of every parallel agent". Skipped with the tool.
- HR:77: the owner's own context system is "not installed (never run live, Python-based, undocumented hook behaviour)".
- Not recorded: any hook that was installed and then switched off in this app. No source shows one.

**1.3 Ideas about hooks, with standing (docs/program/HARNESS-IDEAS-HORTHY-2026-11.md, row text and verdict):**
- :755 G2-F028 (Stop hook that runs CI checks): "refuted | skip | This reopens the pre-commit-hook skip, whose reason ("CI gates the PRs", plus §0's CI-green done rule) still holds. Backend gates run in Docker for minutes ... Fable never implements, so a Stop hook would gate the wrong actor."
- :296 G2-F028 as first listed: "1/2/2/2/1 trial · 1/1/1/1/0 skip".
- :360 G2-F030 (PreToolUse Bash hook enforcing prose rules): "skip ... Small benefit, and it would also block legitimate log greps in judge sessions."
- :359 G2-F029: "Only relevant if a gating Stop hook exists, and none does."
- docs/program/evidence/harness-ideas/horthy/review/POST-REVIEW-LIST.md:307 G2-F116 (prompt-only phase rules "are frequently ignored by Claude Code"): "already-done ... Typed schemas per agent already stop 'research' drifting into fixes, so no hook is needed."
- Same file :309 G2-F122: "The repo already turns repeat mistakes into checks. The hook half stays skipped."
- Same file :363-365: G2-F034, F035, F036 all "skip" (SessionStart context fetch; a PostToolUse supervisor hook "expensive to build and keep honest on Windows for one developer"; hooks "Framing only").
- HORTHY:46: "Not one idea re-opens the skipped hooks, context system, measurement pipeline or" (line continues on :47).
- HORTHY:24 (W2): "Compliance with the phase routine is self-reported; with no hooks, "the store was never consulted" and "the routine was skipped" look the same from outside". HORTHY:96: "*Decides:* whether an outside compliance check is possible without hooks."
- docs/program/evidence/harness-bottlenecks/fit/FIT-LIST.md:14 G2-F015: "Not hook-enforced." :53 G2-F031: "One permissions.deny block ... Not a hook."
- BAML list: only two long lines match "hook" (HARNESS-IDEAS-BAML-2026-11.md:241, :677); both are about TypeChat/Instructor retry text and a source reference, not Claude Code hooks.

**1.4 Bottlenecks and hooks (HB):**
- HB:163: "Two of these reach for hooks (a stop hook that blocks on a failed claim check; a heartbeat fed by tool events). The harness review skipped hooks for named reasons. Re-opening that is an owner decision; the root-gate versions need no hook."
- HB:366 (mechanism 3, transcript audit at merge): "Records only; no hook".
- map-full.txt:628: "Two hooks would reopen the harness review's 'skip hooks' ruling ... Each must fail closed, because the docs say a missing hook script fails open (B5 C16)." :545: "COST: About a day. Reopens the harness review's 'skip hooks' ruling."

**1.5 HV decision D17 and the status of "hooks stay off".**
- HV:316: "| D17 | Hooks stay off? | 3 | phase 3 | decision | **Stay off** / Re-open for two uses | B12, B14 |  |". The last column, the owner's answer, is empty. Other rows carry answers (D01 to D06); D17 does not.
- HV:250: "**Your yes for anything that reaches outside.** No hooks, no installs, no scheduled tasks, no permission changes and nothing leaving this PC without your decision."
- HV:372 (section 8, Not built): "Hooks. Yours to re-open".
- HV:3 (Status): "Plan accepted on 11 November. Phase 1 has started with read-only work. Nothing is installed, wired or committed."
- So the record holds "stay off" as the design's lean (bold option) and a rule that hooks need the owner's decision. No owner answer to D17 is recorded.

**1.6 The research tree builds a hook (this contradicts "hooks off" as a blanket).**
- RT/tcb/guard-hook.mjs:1-6: "the pre-tool hook of the trusted base. Speaks the harness's PreToolUse hook protocol ... exit 0 with an empty stdout is "no objection", exit 2 with one stderr line ... is a deny. Every failure of its own ... is a deny, because any other exit code lets the call through."
- RT/CONTRACT.md:585-589: "The hook entry is `{matcher: "*", hooks: [{type: "command", ...guard-hook.mjs ...}]}` under `PreToolUse`. The owner installs `tcb/settings/coordinator.json` (no task, no epoch) and merges `user-deny.json` into his user settings."
- RT/CONTRACT.md:1094-1095 (decision 20): "guard-hook writes nothing; its refusals are read from transcripts by audit. Reason: a hook that takes the run lock would stall every tool call."
- RT/RULINGS.md:55-58: "Two hooks would enforce the two rules that cost the most: refuse a helper that is not one of the four tree types, and stop a coordinator past its window. They are not built. (See the last line under "What went wrong": the harness design keeps hooks off and enforces by scripts, so this proposal is withdrawn.)" and :76: "It proposed hooks, although the harness design says hooks stay off and enforcement is by scripts."
- The record behind that sentence is HV D17 (owner answer empty) and HV:372 ("Yours to re-open"). No document found states "enforcement is by scripts" as an owner ruling. HV:247 states: "**Script before agent.** Models find things. Scripts decide whether a finding is closed. A check a script can make is never left to a model." That rule is about closing findings, not about refusing a session's choices.

## 2. Recorded cases of a rule written as prose being ignored or failing

| # | Case | Count and what was counted | Source |
|---|---|---|---|
| 2.1 | "38 of 71 practised ideas failed as prose" | Of 142 dropped ideas re-screened (84 "already done", 40 skipped, 18 BAML cards), the testbed had practised the mechanism in 71. "It worked in 33 and failed in 38." The 38 "failed mostly as brief lines and model re-checks. A few had a script form and failed too, such as the verify tool's provenance check." Counted: ideas the testbed practised, classed worked or failed by the compile's re-screen. Not counted: prose rules against script rules as two arms. | HB:328; HV:111, :186. The refuter corrected a wrong wording of the 71: docs/program/evidence/harness-v2-design/refute-fidelity.md:33. docs/program/evidence/harness-compile/data/apply-report.md notes the count "carries no tag in the source; tagged [M]". |
| 2.2 | Overstated reports | "Twenty-plus overstated reports and the last-day gaps happened anyway" despite brief contracts with evidence tags and model re-checks. | HB:328; HB:157 ("20-plus recorded overstatements") |
| 2.3 | Self-filled fields | "B12, where such fields were filled falsely"; merge record "self-reported". High-risk merges with an unread final head: "5 of 6". | HB:412, :366, :148 |
| 2.4 | Findings with no status | "The board carried 183 minor findings with no status at all." | HV:43 |
| 2.5 | External source on instructions | "[partly_supported] C11. In real coding sessions, agents oversell results at a measurable rate, and CLAUDE.md-style instructions do not fix it." (the lane marked it LLM-labelled) | docs/program/evidence/harness-bottlenecks/research.txt:479; map-full.txt for the use |
| 2.6 | Prompted phase constraints | The source claims they "are frequently ignored by Claude Code". The review class was already-done, one reviewer scored skip. No count of occurrences here. | POST-REVIEW-LIST.md:307 |
| 2.7 | R57 round, 2026-11-17/18 | 13 of 14 helpers on the most expensive helper model; run in sequence; coordinator to about 404,000 then 527,000 tokens "after a refused hand-over"; three attack passes where the ruling says one; 29 questions to the owner; about 7.7 million helper tokens; week's usage 26 % to 39 % in seven hours. | RT/RULINGS.md:43, :60-76 |
| 2.8 | Session started in the wrong folder | The session "loads the product's instructions, skills and agents and not this repository's `CLAUDE.md`". | RT/RULINGS.md:63-64 |
| 2.9 | A derived skill of hard rules | Its text: "## 1. Hard rules (each was broken on 2026-11-17 and cost the owner)". It held tier, parallel, ceiling (133,000 tokens), rule 7 and one-judge-pass rules as prose. The owner ordered it discarded. | git show 7f3e68de:.claude/skills/tree-orchestration/SKILL.md lines 14-60; discard: commit e3bd94b7 |
| 2.10 | Earlier rule text | CLAUDE.md:25-26 (rule 5, token cap, window small) and rule 7 "(Added 2026-11-18 after a round that broke this: `research-tree/START-HERE.md`.)" | CLAUDE.md:23-33 |
| 2.11 | Memory index lines (user memory, not re-opened here) | "a 12-hour stall on 2026-11-16 was the weekly usage limit, burnt by audit fan-outs from an 800k-token coordinator; check get_usage before every fan-out". | MEMORY.md index entry "Usage limit and stalls" |
Not found: a count of prose rules that worked. Only HB:328 gives "worked in 33".

## 3. Enforcement that exists and is wired today, and what is designed only

**Wired and checked on this machine today**
- C:/Users/User/.claude/settings.json (188 bytes): keys `enableWorkflows`, `modelSettings`, `skipWorkflowUsageWarning`, `switchModelsOnFlag`. `modelSettings` holds one entry: `"claude-opus-5-5": {"autoCompactWindow": 400000}`. No `hooks` key (grep count 0). No settings.local.json.
- Product repository C:/Users/User/Documents/projects/EMS_workshop1/.claude: `agents`, `launch.json`, `skills`, `worktrees`. No settings file (Glob found none).
- Git: .git/hooks holds no non-sample file in this repository or the product repository; `core.hooksPath` is unset in both.
- Agent definitions pin a model: in .claude/agents, the 12 fixflow-* files carry `model:` (opus 6, sonnet 5, haiku 1). ORCHESTRATION-DESIGN-2026-10.md:99: the built-in Explore agent "inherits the session model's tier (Opus here)". A pin takes effect only when a caller names that agent type. RT/RULINGS.md:53: "Only the model tier is mechanical: it is in the agent definitions." The tree-* definitions were discarded (e3bd94b7), so the four tree types no longer exist.
- research-tree/tools/lane.mjs: a wrapper that "lets only `capacity` commands run at a time"; used by convention, nothing forces calls through it.
- docs/program/lab/merge-ready.sh, ff-gates.sh, ff-slot.sh: product-program scripts kept as evidence (CLAUDE.md:47-48: "treat them as evidence, not as tools ready to run"). merge-ready.sh header: "Refuses to merge unless every condition holds".
- docs/program/harness-v2/phase1/*.js.txt: read-only measurement scripts (token baseline, compaction by model, shutdown join). They refuse nothing.
- ORCHESTRATION-DESIGN-2026-10.md section 4.3 (lines 198-219): script behaviour inside workflow scripts (circuit breaker, slices of five, no silent caps). It gates a script's own agents, not the coordinating session. Its two "hook" matches (lines 302, 737) are the word "webhooks"; it has no Claude Code hook.

**Built, not installed, not run in the app**
- research-tree/tcb (RT/START-HERE.md:13): "Built in 31 stages, 20,560 lines. Suite 965 pass, 0 fail; end-to-end 232 of 232". START-HERE:17: "Not done | The thirteen fixes in the scripts; the checks that need the app; the pilot; a first run of the tree".
- guard-hook.mjs: refuses by role profile: tool lists, read and write prefixes, `.claude/` writes, Bash only `node tcb/<name>.mjs`, agent type names from `agent_types`, witnessed fetches (CONTRACT.md:973). Profile keys (guard-hook.mjs:33): role, tools_allow, tools_deny, read_prefixes, write_prefixes, agent_types, fetch, bash. No `model` key. No context key. No count of helpers.
- audit.mjs (CONTRACT.md:976; spec/audit.mjs.md:13, :82): reads transcripts after a step; coordinator mode lists "every call whose `context > coord_over_factor * W_star_coord` (1.5 x 133,200 = 199,800)" in `calls_over`. It records; the coordinator and handover decide. spec line 13: "A second mode audits the coordinator's own transcript (turns above 1.5 W*, R50)".
- CONTRACT.md:599-601: tasks-plan has fields `{task, field?, stage, role, tier, steps, deps, question_ids, e_task}` and `approval?: {quote, at}`; "replace `plan` validates it ... it does not check `approval`".
- These cover the research tree's own runs. The R57 session did not run under them (RULINGS.md:63).

**Designed only (HV and HB)**
- HV:3: "Nothing is installed, wired or committed."
- HV section 4, eleven mechanisms, all "A script. No tokens." or a line or a setting: sealed replay, verdict script, transcript audit at merge, one finding table, dry run with stand-in agents, merge queue that checks the commit, one fact one command, resume check, fix-round clauses, you read marked lines, short tool list. Each has an "Accepted by" ("a replay on the record" for 1, 2, 3, 4, 6, 8, 9; "planted cases, not a replay" for 5; "a baseline count" for 7; "a live trial on three merges" for 10; "a with-and-without test" for 11) and an "Its test" (HV:284-294). None is built.
- HV:199: "**Watch.** A script may refuse a merge only after you say so." HV:365: "An advisory check | a refusal | The same check at two strengths. Record-only first. Refusal after you decide."
- HV plan check (HV:66-75): refuses a slice with no footprint and a plan with two writers of one file. Designed. RT/START-HERE.md:26 lists BUILD-PLAN.md as "(being drafted)".
- HB:365 mechanism 2 and mechanism 5 (stub harness): designed, "the testbed had no gate script".

## 4. What is observed and what is only believed about hooks in this app

**Observed (in files on this machine)**
- Transcript record types include `system/stop_hook_summary` (RT/probes/transcript-format.md:16, in the list "Metadata only (no usage)"). Whether any run produced a summary with a hook in it is not stated.
- No hook is configured in user settings or in either repository (section 3).
- RT/probes/coordinator-observations.md: one observation about background commands; none about hooks.

**Believed, needs the app (not observed)**
- CONTRACT.md:593: "**Hook input** (believed, needs-app 1): stdin JSON with `hook_event_name`, `tool_name`, `tool_input`, `cwd`, `session_id`, `transcript_path`, and for a helper's call `agent_type`."
- CONTRACT.md:1030-1032, needs-app list: "(1) the harness runs `guard-hook.mjs` before a tool call, for helpers too, and honours a deny; (2) user-level deny rules bind sessions and cannot be bypassed through `node`; (3) which settings files a session started in an attempt folder obeys".
- CONTRACT.md:1038-1039: "(11) the canary's refusals (`selftest canary`) and the lean first-call baseline."
- docs/program/RESEARCH-TREE-PROTOCOL-v2-2026-11-16.md:1267: "the harness runs the hook before every call, helpers included, and honours exit 2 (a timeout or failed start lets the call through); user-level denies bind; a session obeys its folder's settings only; `Bash(node tcb/*)` matches as meant". Listed under things to check on the real app.
- RT/DESIGN-RECORD.md:86: "assumes ... that hooks fire for Agent calls; neither verified (663)".
- RT/FAULTS-AND-FIXES.md:59-61: "Does a hook's input carry the session id? FX-CLAIM and FX-CGATE, two of the four large fixes, cannot be built without it." Open.

**From documentation, not verified on this install**
- research.txt:421: "[supported] C16. (8) Hooks can verify a session's claims before it reports done; exit code 2 blocks Stop, SubagentStop and TaskCompleted." map-full.txt:446: "a missing script fails open".
- HB:287: "Claude Code facts come from its documentation and were not verified on this install."
- HR:330-333: the two Windows risks (`$CLAUDE_PROJECT_DIR` expansion; the hook firing after subagent compactions) "stand".
- The guard-hook design treats every own failure as exit 2 because "any other exit code lets the call through" (guard-hook.mjs:5-6), a belief about the app's protocol.

## 5. The seven rules broken last night, and what each kind of check can see

Source for last night: RT/RULINGS.md:60-76, START-HERE.md:40, CLAUDE.md rules 5 and 7. Transcript key check, key names only, one session file (e24f17dc-...jsonl) and its `subagents/` folder:
- Every main-file record carries: `parentUuid`, `isSidechain`, `sessionId`, `timestamp`, `type`, `message`, `promptId`, `turnIndex`, `permissionMode`, `origin`, `cwd`.
- Assistant `message` carries `model` and `usage` with `input_tokens`, `output_tokens`, `cache_read_input_tokens`, `cache_creation_input_tokens`, plus `stop_reason`.
- An Agent tool call's `input` carries `description`, `prompt`, `subagent_type`, `model` (not every call carries all).
- The tool result's `toolUseResult` carries `agentId`, `resolvedModel`, `isAsync`, `status`, `description`, `prompt`.
- `subagents/agent-<id>.jsonl` records carry `model`, `usage`, `agentId`, `isSidechain`. `subagents/agent-<id>.meta.json` carries `agentType`, `model`, `description`, `pickedEffortModel`, `spawnDepth`, `toolUseId`, `finished`, `isBuiltIn`, `requestShape`.
- Records of one model call share a message (CONTRACT.md:1112, decision 28: "the harness writes one record per content block with the usage repeated").
- Not checked: whether these keys are the same in every session file.

Cells state what the source shows. "ne" = not established by any source or by the key check.

| Rule broken | Script at plan time | Hook at a tool call, inside the session | Script at commit or merge | Audit of the transcript afterwards |
|---|---|---|---|---|
| 1. Helper model tier | A plan row has a `tier` field (CONTRACT.md:599). Nothing checks that the tier the call later uses matches it: ne. HV has no tier check. | guard-hook checks the agent type name against `agent_types` (guard-hook.mjs:527) and has no `model` key. Whether the hook's stdin for an Agent call includes `model`: ne (believed input list at CONTRACT.md:593 has `tool_input`; transcript Agent inputs do carry a `model` key). | ne. Helpers leave no file at commit that names the tier; no source describes one. | Can see: `model` on every helper record, `agentType` and `model` in meta.json, `resolvedModel` in the result. The tree's audit.mjs does not list a tier check (spec/audit.mjs.md:8-13). |
| 2. Coordinator context ceiling | A plan can state the derived window (133,000; RULINGS.md:41-44). It cannot see the live window: ne. | Input has `transcript_path` and `session_id` (believed). A hook reading that file would find `usage` fields. Whether any hook does so, and whether exit 2 on a coordinator's own call forces a hand-over: ne. RULINGS.md:55-56 proposed it; withdrawn there. | ne. | Can see: `usage` per call. audit.mjs coordinator mode builds `calls_over` above 199,800 (built, not run on a real session; needs-app 7, 9). A setting exists for Opus only (settings.json, 400000). RULINGS.md:43: coordinator ran to 404,000 then 527,000; its model is not stated there. |
| 3. Round nobody asked for | tasks-plan has `approval?: {quote, at}`; `replace plan` "does not check `approval`" (CONTRACT.md:599-601). status.mjs takes the owner's ruling only with the quote (CONTRACT.md:1105). Not used last night. | ne. Whether the hook can tell a request from an own-initiative round: ne. | ne. | Can see: user prompts (record `type`, `promptId`, `origin`) and the later Agent calls in order. Whether a round was requested is a reading of text; CONTRACT §6 is cited at spec/audit.mjs.md:13 as "No script reads a note's text to decide anything else": ne for last night. |
| 4. Design questions put to the owner | No plan field for it. HV D-cards are themselves owner questions (HV:296-324, 23 cards). | Tool call that published the page is visible as a call with `tool_input` (believed). Telling a question from a result by script: ne. | ne. | Can see: the Artifact call and its file path in the transcript. Classing text as a design question: ne. CLAUDE.md rule 7 is prose; no script for it is recorded. |
| 5. Serial where parallel was possible | HV plan check (HV:66-75) builds collision graphs and "lays the slices out"; designed, not built; BUILD-PLAN.md "being drafted". HB/ORCH §4.3 has slices of five in workflow scripts only. | One hook call sees one call. Whether it sees sibling calls of the same message: ne. | ne. | Can see: `timestamp`, `parentUuid`, shared message per model call, `isAsync` in the result. So whether helper calls were issued in one message or in sequence is readable. Whether they were independent needs the plan's footprints; none existed (BUILD-PLAN.md not written): ne. |
| 6. Three attack passes where one was ruled | A plan row has `role` and `stage`; a count of judge rows per unit is in principle readable at plan time. The rule "A judge is used once per unit of work" was prose in the discarded skill (SKILL.md section 2). A unit is not defined in a script: ne. | A hook sees each call; keeping a count across calls needs a state file; guard-hook "writes nothing" (CONTRACT.md:1094): ne. | ne. | Can see: count and `description`/`agentType` of helpers in meta.json. Which ones are passes on one unit: ne. |
| 7. One page for everything | ne. | A Write or Artifact call exposes its path (`tool_input`, believed). What counts as "everything": ne; no source defines the page rule except RULINGS.md:75 as a fault. | A commit or publish script can see file size and path. No such check or limit is recorded. ne. | Can see the same calls afterwards. ne for the rule's meaning. |

Further facts for the table:
- Only the model tier has a mechanical form today (RULINGS.md:53), and only through a caller naming an agent type with a `model:` line.
- The R57 session was started in the product folder (RULINGS.md:63-64). Product-side `.claude/agents` holds the same 12 fixflow-* types as this repository (diff of the two folders printed nothing).
- No source records a hook, a script or an audit that ran on last night's session.

## 6. Not found
- Any hook installed in this app, ever. Any owner answer to D17. Any reason given for the testbed hook being abandoned beyond "eight defects open". Any test, in this app, of whether a hook receives `session_id`, `agent_type`, `model` or context size.
- Any source that defines "enforcement by scripts" as the owner's ruling.
