# Every rule of the method and what enforces it (unit T8-TABLE, top session 8, 2026-11-24)

Brief: `briefs/TOP8-TABLE.md`; ruling behind it r57-0056. Read from the files on 2026-11-24: CLAUDE.md, `library/INDEX.md`,
`library/README.md` ("What enforces these rules"), `.claude/settings.json`, `.claude/hooks/*`, `tools/check-commit.mjs`,
`tools/git-hooks/pre-commit`, the journal's rulings r57-0001 to r57-0056 and every `"kind":"mistake"` record.

## Names used in the table
- **TH** `.claude/hooks/tier-hook.mjs` (PreToolUse, every tool; acts on Agent/Task and start_session): refuses a helper or
  child session without a kind label, without an explicit model, or on a model `tier-routes.json` does not allow; refuses
  a session started in a folder without the tier hook. Not checked: effort, a wrong kind label.
- **RG** `.claude/hooks/record-guard.mjs` v2 (PreToolUse on Write, Edit, MultiEdit, NotebookEdit, AskUserQuestion, Bash,
  PowerShell): refuses changes to archived evidence, any journal write that is not a pure append, git forms that drop
  uncommitted journal lines, and an AskUserQuestion not starting "approve:", "cap:" or "fact:". Allows shell appends
  (`>>`, `tee -a`, Add-Content, appendFile) to the journal.
- **PG** `.claude/hooks/plan-gate.mjs` v2 (Agent/Task/SendMessage pre and post, SubagentStart/Stop): holds starts that name
  a unit of `research-tree/build/plan.json` (the build of 2026-11-19) to that plan: kind, model, dependencies, one helper
  per unit and role, batch width. A start naming no planned unit passes untouched.
- **LS** `.claude/hooks/library-start.mjs` (SessionStart incl. compact): puts the board's look-up table and NEXT into the
  context. A reminder, it refuses nothing.
- **CC** `tools/check-commit.mjs` via `tools/git-hooks/pre-commit`: refuses a commit that changes evidence or a journal
  line, or adds a malformed record (fields, order, kind, status, id unused and in its writer's file).
- **SET** `.claude/settings.json`: skillOverrides (FixFlow skills off) and permissions.deny (12 FixFlow agents).
- **MG** `.claude/hooks/migration-gate.mjs` (PreToolUse on Agent, Task, start_session, Write, Edit, MultiEdit,
  NotebookEdit, Bash, PowerShell; PostToolUse on Bash and PowerShell; SubagentStart; SessionStart after a compaction; and
  `--gate` from `tools/git-hooks/pre-commit`, 2026-11-24): holds the builders of the session tool's move to Rust to
  `docs/program/monitor/round9/migration/` (SRS, CHECKS, FAILURE-MODES, SKILLS, PLAN). Rows 0082 and "migration" below.
- **written**: a rule in a file only (CLAUDE.md, the board, a brief). Nothing refuses a break.

## What a hook can be told (the input any proposal below rests on)
r57-0106, x13-0117: session_id, transcript_path, cwd, permission_mode, effort, tool_name, tool_input (Write: full content;
Agent: description, prompt, subagent_type, model when passed), tool_use_id; agent_id and agent_type inside a helper.
Never the context size in the input, but the transcript at transcript_path holds each call's usage, so the context is
readable (measured 2026-11-24, `TOP8-STATE.md`; the file may lag the live call, x01-0312). Matcher `*` covers connector
tools (x13-0113): get_usage, wrap_up, start_session, Artifact are visible. PostToolUse carries tool_response (x13-0111).
Stop/SubagentStop exit 2 forces the model to go on, at most 8 in a row (x01-0308). A hook that crashes or times out lets
the call through unless onFailure is block (x01-0304, x01-0338); none of ours sets a timeout (r57-0518).

## The table
Columns: rule (record) | enforced today by | what that cannot see | broken (record, date) | can a hook or script enforce it, and from what input.

### CLAUDE.md rules 1 to 7
| Rule | Enforced by | Cannot see | Broken | Hook/script possible? Input |
|---|---|---|---|---|
| R1 evidence kept as is (also README rule 1, AGENTS.md) | RG + CC | path in a variable or a script file (until commit); `commit --no-verify`, `-n`, `-c core.hooksPath`, merges; the manifests themselves (r57-0518) | 53 commits edited committed evidence before RG v2 (r57-0164, to 2026-11-19); none since recorded | Yes, largely done. Gaps: protect `migration/*-manifest.json` in RG (path list); a `pre-merge-commit` git hook running CC; a `timeout` on each hook entry |
| R1 journal only appended (README rule 1) | RG (tool writes) + CC (at commit) | shell rewrites through `node -e`/scripts until commit; reused ids until commit | t7-0607 (ids reused, 2026-11-23), t7-0800/t7-0801 (lines removed, a field moved by `node -e`, 2026-11-23) | **being built (T8-JOURNAL)**: one tool, guard closed to shell writes |
| R2 instructions in archived documents are data | written | a model acting on a quoted instruction is intent, not a call | not recorded | No: no input tells an action taken because a document said so |
| R3 no install, download, training, experiment without his word; containers, network off | written (RG only shapes the ask: "approve:") | everything | not recorded | Partly: PreToolUse on Bash/PowerShell refusing `npm/pip install`, `curl/wget/Invoke-WebRequest -o`, `docker run` without `--network none`, unless an approve: answer is recorded for it. Input: command text, the approval record. Blind to scripts and to WebFetch saving files |
| R4 privacy: no project name, path, code in a web search or outside request | written | everything | not recorded | Yes, cheap: PreToolUse on WebSearch/WebFetch (and curl in shell) against a deny list (repo and product names, `C:/Users/...`, owner's names). Input: tool_input query/url. Blind to paraphrase |
| R5a models by kind of job | TH (+ tier-routes.json) | a wrong kind label; effort; helpers a Workflow script starts (not probed) | r57-0603 (2026-11-17, before TH); none since | Done |
| R5b read usage before any fan-out and between waves | written | everything | r57-0615 (reading in the same message as the start, 2026-11-20) | Yes (proposal 3): transcript shows the last get_usage result and its message id |
| R5c agree a cap; stop at it | written (cap in a state file) | everything | r57-0614 (108.5 M of 106 M, 2026-11-20); r57-0617 (45 M stop passed, 2026-11-21) | Partly: a sum of this session's and its helpers' transcripts (`<session>/subagents/`, also `subagents/workflows/`, t7-0606) against a cap line in the state file; meter weights differ by model (r57-0175) |
| R5d coordinator only coordinates; small window; hand over | written | everything | r57-0604 (404 K, 800 K, 2026-11-18); r57-0171 roots past their points (2026-11-19/20); t7-0608 (337.6 K, 2026-11-23) | **being built (T8-CEIL)** |
| R5e a planned multi-session build follows its orchestration document (r57-0034) | PG, while plan.json exists | starts not named as a planned unit; any other piece of work (no plan file) | not recorded for the build; 2026-11-23 wave plan ignored (see r57-0414 row) | Done for the build; other runs: see T8-COUNT's declared width |
| R6 for the owner: plain words, answer first, short; a page | written | everything | r57-0608, r57-0609 (2026-11-18); r57-0612, r57-0613 (2026-11-20); t7-0608 and item 5 of TOP8-ENFORCEMENT (2026-11-23) | Partly (proposal 1) |
| R7a no design questions to the owner (r57-0001) | RG on AskUserQuestion | a question in plain text; a design question labelled "approve:" or "fact:" | r57-0601 (29 questions, 2026-11-17/18, before RG) | Partly: a Stop hook on the top session's last message (proposal 1 b) can flag "which do you prefer / option A or B"; noisy |
| R7b open the record from the files before deciding (r57-0009) | LS (reminder at start and compaction) | whether anything was read | r57-0602 (2026-11-18); r57-0056's own words ("forgot to read things", 2026-11-23) | Yes (proposal 4) |
| R7c no round he has not asked for (r57-0007) | written | everything | t7-0608 (offered next work, 2026-11-23) | At the ceiling only (T8-CEIL refuses new work there); otherwise no: a requested round cannot be told from an own one (x08-0168) |
| R9 research method: a hypothesis before new model work (r58-0017, r58-0021; `docs/program/RESEARCH-METHOD-RULES-2026-11-25.md`) | HG `.claude/hooks/hypothesis-gate.mjs` (PreToolUse on Write, Edit, MultiEdit, NotebookEdit, Bash, PowerShell, Agent, Task, start_session; 2026-11-26) + `tools/check-hypothesis.mjs` | whether the reasoning is right or a cited entry says what is claimed (the owner's pass and a reader check that); a write by a script file or `node -e` with no write word it knows; a step whose command does not name a root (a relative path after cd, a script that reaches a rented machine); a rented machine reached by another program; a shell command (heredoc, commit message) that only mentions a root or ssh/rsync/runpodctl is refused too (write documents with the Write tool); a full read is the Read tool without offset/limit or an uncut `cat` after the last `compact_boundary` line, not proof it was understood | not recorded (new) | Done: refuses writing a hypothesis without both learning files read in full since the last compaction; a Write of a hypothesis missing a label of the seven, the two sections, or with references that do not exist; any write, command, helper or session naming `research-tree/build/data2|model2` or `C:/research-runs/data2|model2`, or ssh/scp/rsync/runpodctl, without a pass whose hash matches and whose ruling is an owner ruling; pure reads pass; the improvement round lies outside its paths |
| R9b graph of thoughts means the method, run in the open (r58-0027; last section of `docs/program/RESEARCH-METHOD-RULES-2026-11-25.md`) | `tools/check-got.mjs` (the minimums and the ledger of a search folder) + HG check 4 (a Write, Edit or MultiEdit of a hypothesis needs `Search: <folder>` or `Not reached by a graph of thoughts: ...` in its first 40 lines, and with Search: a "What was actually done" section equal to the folder's ledger) + `.claude/hooks/got-reminder.mjs` (UserPromptSubmit: the rule's six points when his message names the method; 2026-11-26) | whether a thought is good or a score is fair (the session's own reading against the learning files); whether `top session` thoughts were written honestly, or a confirmed run wrote the text now in the file; times in `at` fields as typed; the plan's content against point 2 (only its age is checked); whether point 1 was said before starting; a request for the method in other words; a "Not reached" line that is untrue; a shell write of a hypothesis (its result is not in the call); claims about the process made outside the ledger section | not recorded (new); the occasion was the data hypothesis of 2026-11-25 (r58-0027) | Done: refuses a hypothesis without either line, or whose section differs from the ledger; the checker lists unmet minimums first and unconfirmed writers last |

### The board's "Before you do this" rows (r = the records it names)
| You are about to (records) | Enforced by | Cannot see | Broken | Hook/script possible? Input |
|---|---|---|---|---|
| Ask the owner how or which option (r57-0001, r57-0151) | RG | as R7a | r57-0601 | as R7a |
| Set a limit, timeout, threshold, budget (r57-0002) | written | everything | r57-0617, r57-0614, t7-0602 (2026-11-20 to 23) | Partly (proposal 2; proposal 9 for numbers in hooks) |
| Start a helper or child session (r57-0150, r57-0034, r57-0035) | TH; PG for the build | the kind is self-declared | r57-0603 (before TH) | Done |
| Choose or check a helper's model (r57-0150, r57-0120, r57-0108) | TH | effort; a model passed through an agent definition only (r57-0108) | not since TH | Done; effort could be added to TH (input: tool_input / effort) |
| How many helpers, sessions, heavy commands at once (r57-0414, r57-0710, r57-0707) | PG batch width (build only); the lane for test commands | any run but the build; helpers of helpers; the app's 20 | t7-0603 (2026-11-23); r57-0156 (admit.mjs still caps 3) | **being built (T8-COUNT)** |
| Workers one check can feed (c1-0300...) | written (design knowledge) | n/a | not recorded | No: a design calculation, not an action |
| Raise what the check can carry (c1-0403...) | written | n/a | not recorded | No |
| Batch changes at the check (c1-0311...) | written | n/a | not recorded | No |
| Two writers on one file (r57-0415, w1-0400...) | written | n/a | not recorded | No for the design; the floor (own copies) only inside the tree's scripts |
| Model sessions on one file under version checks (w1-0353...) | written | n/a | not recorded | No |
| Fix the order of writes before units start (w1-0331...) | PG (dependency order, build only) | other runs | not recorded | Done for the build |
| A unit waits for a hot place or redoes (w1-0403...) | written | n/a | not recorded | No |
| A job is slow (r57-0414, r57-0129, o2-0401, o2-0403) | written | n/a | not recorded | No (diagnosis) |
| More work side by side, more tokens? (r57-0414, b1-0125) | written | n/a | not recorded | No |
| Pace a refilling token window (r57-0414, r57-0813, a1-0400) | written | everything | r57-0615 | Partly via proposal 3 (a meter reading against a stop line) |
| A unit under two or more windows (a1-0403...) | written | everything | not recorded | Partly via proposal 3 (both meters in get_usage) |
| The provider's window resets (a1-0323...) | written (fact) | n/a | r57-0616, r57-0618 (times guessed) | No for the fact; a time in a record: no input tells a guessed time |
| Dearer or cheaper model while a window binds (a1-0405...) | written | n/a | not recorded | No (router not built, r57-0041) |
| Which unit starts next (r57-0416) | PG (dependencies, build only) | other runs; value order | not recorded | Partly: the plan file's order, as PG does |
| Schedule a few long units (a1-0406...) | written | n/a | not recorded | No |
| The tree's shape for growing work (t1-0401...) | the tree's scripts (`research-tree/tcb/`, branch build, not merged) | live sessions | not recorded | No here |
| More coordinator rounds or a level (t1-0402...) | written | n/a | not recorded | No |
| Cut the coordinator's tokens (t1-0403...) | written | n/a | r57-0604, t7-0608 | Via T8-CEIL |
| Cite clean-but-wrong merge figures (r57-0305) | written | n/a | not recorded | No |
| Stop a helper writing outside its files (r57-0105, r57-0402) | nothing live here; `research-tree/tcb/guard-hook.mjs` in tree runs only | every helper of this repository | not recorded | Yes (proposal 7): input agent_id, PG's log (agent to unit), a files list per unit in the plan |
| Start a session in a new folder (r57-0026, r57-0122) | TH (start_session cwd) + `tools/ensure-tier-hook.sh` | a session the owner starts by hand | not recorded since | Done |
| Start work nobody asked for (r57-0007) | written | everything | t7-0608 | as R7c |
| Run a test, review, model run (r57-0004, r57-0033, r57-0417) | written | everything | not recorded as a mistake | No: "can it change what is done next" is a judgment |
| Use a rule from a design document (r57-0010) | written; CC requires a status on every record | whether the status is true | r57-0602 | No beyond the status field |
| Choose how a rule is enforced (r57-0011, r57-0151) | this table | n/a | n/a | n/a |
| Change a journal line or archived file (README rule 1) | RG + CC | as R1 | t7-0607, t7-0800, t7-0801 | **being built (T8-JOURNAL)** |
| Choose a method from one measurement (r57-0015) | written | everything | r57-0605 (2026-11-18) | No |
| Cite a figure from a paper (r57-0014) | written; fill 1's checking script (r57-0130) for extractor records only | top-session claims | r57-0606 (about 38 figures), r57-0611, x02-0600 to x15-0609 first passes | Partly (proposal 8): a [quoted] record's evidence must point to a paper text on disk holding the figure |
| Read a paper behind a sign-in or bot check (r57-0014) | written; the app's own browser rules | everything | not recorded | No |
| Rest a decision on an `x` record (r57-0130) | written | everything | not recorded | No: "read the cited place first" is not visible as a call before a decision |
| Save a finding (r57-0016) | CC (format at commit) | content | t7-0607 | **being built (T8-JOURNAL)** |
| Write a skill or anything every session loads (r57-0019) | SET (FixFlow skills off) | a new skill or CLAUDE.md edit | r57-0607, r57-0602 (2026-11-18) | Yes, cheap (proposal 6) |
| Report to the owner (r57-0017) | written | everything | as R6 | Partly (proposal 1) |
| Carry on past a large context (r57-0008) | written | everything | r57-0604, r57-0171, t7-0608 | **being built (T8-CEIL)** |

### The owner's rulings r57-0001 to r57-0056
| Ruling | Enforced by | Cannot see | Broken | Hook/script possible? Input |
|---|---|---|---|---|
| 0001 no design questions | RG | plain text; mislabelled | r57-0601 | as R7a |
| 0002 parameters computed, not his preference | written | everything | r57-0617, t7-0602 | Partly (proposals 2, 9) |
| 0003 quality first, seven measures, tokens not money | written | everything | not recorded | Cheap partial: proposal 1 refuses currency signs on his pages |
| 0004 test only if the result changes what is next | written | everything | not recorded | No (judgment) |
| 0005 smallest model that gives the same output | TH (per helper) | inside a session (r57-0041) | r57-0603 | Done per helper |
| 0006 what can run together starts together | written | everything | r57-0603 | No: independence of two pieces is a judgment; PG's width is a ceiling, not a floor |
| 0007 no unasked round | written | everything | t7-0608 | as R7c |
| 0008 one purpose; hand over; no coordinator past its ceiling | written | everything | r57-0604, r57-0171, t7-0608 | **being built (T8-CEIL)** |
| 0009 open the record from files | LS (reminder) | reads | r57-0602; r57-0056 | Yes (proposal 4) |
| 0010 sort proven, measured, hypothesis | CC (status field present) | truth of the status | r57-0602, r57-0609 | No beyond the field |
| 0011 hooks or scripts, both | this table | n/a | n/a | n/a |
| 0012 one writer per file rejected | written (design) | n/a | not recorded | No |
| 0013 core concurrency literature | written | n/a | not recorded | No |
| 0014 strong literature read in full; quote from paper | written; r57-0130's script for x records | top-session figures | r57-0606, r57-0611 | Partly (proposal 8) |
| 0015 bottleneck by workload; a routing rule | written | n/a | r57-0605 | No |
| 0016 structured records | CC (format) | prose in other files | t7-0607 | **being built (T8-JOURNAL)** |
| 0017 reports short, what is and is not | written | everything | r57-0608, r57-0612, r57-0613, t7-0608 | Partly (proposal 1) |
| 0018 say what you understand, then act on his go | written | everything | r57-0612 (yes to words, then boxes) | No: "a new instruction" and "his go" are judgments of text |
| 0019 skills only at source quality | SET (FixFlow off) | new files | r57-0607, r57-0602 | Yes (proposal 6) |
| 0020 harness work only in this repository | written | everything | not recorded | Yes, cheap: RG refuses writes into the product repository's path (input: file path, shell targets); blind to a session started there |
| 0021 Opus orchestrators for literature; top decides corrections | TH (orchestrate = opus) | who decides | not recorded | Done for the model |
| 0022 library tested by a dummy session first | written (tests 1, 2 run: r57-0121, r57-0124) | n/a | not recorded | No (one-off) |
| 0023 later: parallelism inside the tree | open task (r57-0505) | n/a | n/a | n/a |
| 0024 end your processes before reporting; report resources | written | everything | not recorded | Partly: a Stop hook reading the transcript for background shell starts with no exit notice; blind to processes started by scripts |
| 0025 tier routes enforced | TH | wrong label; effort; Workflow helpers (not probed) | not since TH | Done |
| 0026 tier hook in every start folder | TH + ensure-tier-hook.sh | sessions he starts himself | not recorded | Done |
| 0027 show how each conclusion was reached, no knobs | written | everything | r57-0613 | No (content of an argument) |
| 0028 not tuned to one repository | written | everything | not recorded | No |
| 0029 "not in the papers read" is not "no paper" | written | everything | r57-0610 | Cheap partial: proposal 1's word list can refuse "in no paper" / "no paper" on his pages |
| 0030 work that mattered; self-reported marked | written | everything | not recorded | No |
| 0031 library kept clean; a lane reaches the board after a check | CC (format) | content | not recorded | Partly: a script that every id the board cites exists and is not superseded (input: INDEX.md, journal); content stays a review |
| 0032 count computed, not three | not enforced; admit.mjs still has 3 (r57-0156) | everything | t7-0603 | **being built (T8-COUNT)** |
| 0033 no checking every step | written | everything | not recorded | No |
| 0034 build planned in an orchestration document | PG (plan.json) | runs without a plan file | not recorded | Done for the build |
| 0035 Fable for an orchestrator whose children have children | TH (orchestrate-deep = fable) | a wrong label | not recorded | Done |
| 0036 FixFlow skills and agents out | SET | a FixFlow skill added under another name | not recorded | Done |
| 0037 the build stops at 69 % of the weekly meter | written (build of 2026-11-19, past) | everything | not recorded | Proposal 3 would enforce such a line |
| 0038 a limit = measured need plus a buffer | written | everything | r57-0617, t7-0602, r57-0614 | Partly (proposal 2) |
| 0039 build on the plan shown; parallelism to the full | PG | the "to the full" half | not recorded | Done for the plan half |
| 0040 a proven algorithm first | written | everything | not recorded | No (judgment); a brief check could ask for a cited source per mechanism, weak |
| 0041 a model per operation | router designed (r57-0421), not built | n/a | n/a | No until the router exists |
| 0042 no typed go per session, never around the app's controls | written | n/a | not recorded | No (a design goal) |
| 0043 S1, S2 approved | one-time approval | n/a | n/a | n/a |
| 0044 caps 106 M, 32 M | written | everything | r57-0614 (108.5 M) | as R5c |
| 0045 cap raised to 120 M | written | as R5c | none after | as R5c |
| 0046 research run, 1.2 B (superseded by 0050) | n/a | n/a | n/a | n/a |
| 0047 the research run widened | written (run's brief) | n/a | not recorded | No (scope) |
| 0048 top session 6, about 30 M | written | as R5c | r57-0617 (passed its 45 M stop; r57-0049 raised it) | as R5c |
| 0049 top session 6 up to 69 M | written | as R5c | not recorded | as R5c |
| 0050 research run, cap 1.9 B | the run's gate in its folder (held, TOP8-ENFORCEMENT) | sessions outside the run | not recorded | Held |
| 0051 start on the leftover, units only while they fit | the run's gate | as above | not recorded | Held |
| 0052 weekend reserve 4.11 points | the run's gate | as above | not recorded | Held |
| 0053 seven replays, cap 87 M | written | as R5c | held (64.2 M) | as R5c |
| 0054 14 keys, cap 600 M | written | as R5c | held (255.6 M) | as R5c |
| 0055 three void lines may be removed | one-time; RG did not see the `node -e` removal | shell rewrites | t7-0801 went beyond it | **being built (T8-JOURNAL)** makes such a removal impossible without the owner's own hand |
| 0056 enforce the method; no next work past the ceiling | this piece | n/a | t7-0608 | T8-CEIL, T8-COUNT, T8-JOURNAL |
| 0063 no procedural creep | `creep-gate.mjs` v2 (PreToolUse Agent or Task, in both settings files, 2026-11-24): refuses a review when nothing was written since the last review finished (a first review of a new piece passes), a review while another review of the session runs (no panels), a review of a review, a third review of one piece, a fold or repair round unless the prompt says "breaking"; and (r57-0066, CLAUDE.md rule 8) once the session states "Deliverable: <path>", a review or check aimed at anything else until that deliverable has changed (a Write or Edit, or its file time); every start that passes gets a line of context (helpers, reviews, when the deliverable last changed and the share of the session's tokens spent since); an `owner: r57-NNNN` line naming an owner record passes | writes made through Bash or PowerShell, except to the stated deliverable (its file time); a deliverable touched once, early, opens every check after it (round 3's page was patched by script 7 min before its data check); a note counted as a change when no deliverable is stated; a review inside one helper's own turns or by the coordinator; repair rounds sent with SendMessage to a finished helper (round 3's second fix round and its fold of the check's corrections); what is built (round 3's 8.7 M on data behind the screen); child sessions | replay of round 3 (session 26ad649f, 34.8 M): none of its 5 starts refused; with its page named as the deliverable the replay refuses the data check (6.2 M), but live the page's file time (script patches from 21:41) would have let it through | `creep-gate.test.mjs` (36 cases) |
| 0082 no Fable in the move to Rust | MG (PreToolUse Agent, Task, start_session): a migration start on Fable is refused; a start whose kind is not the one PLAN.md gives its step is refused (build may be raised to build-invariant, the trial's Opus retry); kind against model stays with TH | a migration helper whose description and prompt name neither a round9/rust or round9/migration path, C:/rust-work, nor a PLAN.md step with the word Rust or migration | none yet | `migration-gate.test.mjs` (route cases) |
| migration: requirements, floors, done (his words, FEEDBACK-3.md (c), (d); brief `round9/migration/briefs/HOOK.md`) | MG: (1) a migration start must name SRS.md, FAILURE-MODES.md and the skills PLAN.md gives its step (in the prompt or a brief file it names), a build start at the Rust workspace must name its step; SubagentStart gives a migration helper the 55 floors of SRS.md and the 35 rules of FAILURE-MODES.md, and if they are not in its transcript by its first gated call PreToolUse gives them then (PreToolUse context is recorded in helper transcripts here; SubagentStart context was never emitted before, so not yet seen; the log's "ctx" field says which event gave it); (2) a change to SRS.md, CHECKS.md, FAILURE-MODES.md, SKILLS.md or an existing checks/baseline.json needs "owner: r57-NNNN" (status owner, dated 2026-11-24 or later) in the change, the command or the brief; once the checks builder's tokens line is in checks/README.md or rust/Cargo.toml exists, checks/**/*.mjs is changed only by build-invariant helpers, never dropping a check id CHECKS.md or FAILURE-MODES.md lists, and not through the shell; a migration caller does not change the hooks, settings or commit hook; (3) once rust/Cargo.toml exists, a commit whose staged files touch round9/rust or round9/migration is refused by pre-commit while `checks/run.mjs --level <L>` fails (L from the files: picture or glue 2, crates/hooks 3, else 1) or while those folders hold unstaged changes; a pass is a token keyed by those files' index hash; in a session, --no-verify, -n, a hooksPath override, an unwired pre-commit, git pull, and a merge whose incoming migration files hold no pass token (or that both sides changed) are refused; (5) FM-05.refuse, FM-06.loop, FM-07.class, FM-02.allow and FM-03.grep at the call; FM-27.count in the log | writes by script files or through variables when no protected file is named; .rs writes through the shell; a builder pointed at nothing that names the migration; whether an owner record is about this change; a check removed while its id string stays; merges, rebases, cherry-picks and reverts run by scripts; tokens forged by a caller that is not a migration caller; cargo output cut by the output limit | none yet (built before the migration started) | `migration-gate.test.mjs` (83 cases) |
| 0098 Fable's line is 500 K | `window-ceiling.mjs` v2 (PreToolUse, every tool, 2026-11-25): a transcript whose last model is Fable gets one hard line at 500 K, warning 10 calls before it, whatever its kind (lower only if the compaction cap is); Opus and other models keep W* or the checkpoint as before | a model switch before the next call with usage is written; a Fable autoCompactWindow set in a settings file it does not read | the lock of 7a07b86e at about 230 K (2026-11-25) | `window-ceiling.test.mjs` (116 cases) |
| r58-0001 no fixed line for Fable (replaces the 500 K of 0098) | `window-ceiling.mjs` v3 (PreToolUse, every tool, 2026-11-25, brief `briefs/WINDOW-CEILING-FABLE-2.md`): a transcript whose last model is Fable is held only by the compaction cap, 0.92 of the window less 10 calls at its own growth (about 897 K on the 1M window), warning 10 calls before it; no W*, no checkpoint form; other models unchanged | as 0098 | the lock of 7a07b86e at about 500 K (2026-11-25); live check after the change: 505 K, line 897 K, allowed | `window-ceiling.test.mjs` (119 cases) |
| r58-0005 nothing the other person has done and pushed is modified or impeded (who has what: `OWNERS.json`, r58-0101) | `owner-guard.mjs` (PreToolUse on Write, Edit, MultiEdit, NotebookEdit, Bash, PowerShell, in both settings files, 2026-11-25, brief `docs/program/repo-organisation-2026-11-25/briefs/GUARD.md`): refuses (a) a file tool on another person's path pattern, in any checkout or worktree; (b) a shell write, move, delete or restore of such a path or of a folder holding one (the record guard's detection; a whole-tree reset only while their paths have local changes); (c) a push to their branch (`:ref`, `--delete`, `+ref`, `--force`, `--force-with-lease`), `push --mirror/--all/--prune`, a matching or pattern push, `branch -d/-D/-m/-M/-f/-C`, `checkout -B`, `switch -C`, `update-ref` naming it; (d) a direct push to `main`; (e) `gh pr merge/close/edit/reopen/ready` on a pull request not opened by `this_pc`'s GitHub login (`gh pr view --json author`, 5 s; refused when it cannot tell). OWNERS.json unreadable: passes, logged. 17 tests | a path in a variable or computed by a script file; `update-ref --stdin`; `git apply`, `patch`; `gh api`; commits on a local copy of their branch (its push is refused); sessions on the other person's PC and anything outside this PC's sessions (GitHub cannot enforce it on this plan) | not recorded | Done |

## Which remaining rules could get a check now (ranked: how often broken, then how cheap)
Sizes are rough: lines of code plus self-tests. None is built; each needs its numbers from a record (r57-0002).

1. **Reports to the owner** (rule 6, r57-0017, r57-0027; broken 6 times: r57-0608, 0609, 0612, 0613, t7-0608, item 5).
   Input: (a) PreToolUse on the Artifact publish call and on Write of a page file: the HTML/markdown it publishes;
   (b) a Stop hook in the top session only (no agent_id): the last assistant text from the transcript tail; also the
   recap and ask fields of wrap_up (a PreToolUse call). Refuses: internal labels in his text (record ids such as
   `r57-0000`/`t7-0000`/`x00-0000`, unit names such as `T8-CEIL`, `replay-L6`, file paths), currency signs (r57-0003),
   "in no paper" (r57-0029); exit 2 makes the model rewrite once (Stop blocks cap at 8, x01-0308). Counts figures in the
   opening section, but the limit ("a handful", memory note "Big picture, not figures") is his word, not a recorded
   number: record it as a ruling before a hook refuses on it; until then a warning only. Cannot see: whether the picture
   comes first in meaning, whether words are plain, whether a number matters, a label he asked for by name. About 150 + 20 tests.
2. **A limit has a measured basis** (r57-0038, r57-0002; broken 3 times: r57-0617, r57-0614, t7-0602). Input:
   PreToolUse on Agent/Task: tool_input.prompt (the hook sees it whole, x13-0107) and any brief file it names under
   `research-tree/build/briefs/`; the journal for cited ids; the state file's cap line. Refuses a start whose prompt or
   brief states a token limit with no record id on the same line, or citing an id that does not exist or is not
   `measured`/`observed`; a limit not above its expected (r57-0038: never equal); limits that sum past the cap stated in
   the state file (r57-0614). Cannot see: whether the cited role fits the work (t7-0602 cited a role and still left out
   building its cases: no check sees a missing cost), whether the cap line is current. About 120 + 15 tests; a hook file
   of its own beside PG, so it does not collide with T8-COUNT's edit of PG.
3. **Meter read before a fan-out, in an earlier message** (rule 5, r57-0615, r57-0037; broken once, r57-0614 the
   consequence). Input: PreToolUse on Agent/Task/start_session with no agent_id (the coordinator); transcript tail: the
   last get_usage call and its result, its message id against the current call's. Refuses a start when no reading lies
   between the previous start-wave and this one, when the reading is in the same assistant message (r57-0615), or when
   the reading passes a stop line stated in the state file. Cannot see: the owner's own use after the reading, meter lag
   (a1-0510 unmeasured), a reading the owner typed. About 100 + 12 tests.
4. **Open the record from the files** (r57-0009, rule 7; r57-0602, r57-0056's words). Input: SessionStart source
   (startup or compact), PostToolUse on Read/Bash (a read of `library/INDEX.md` or a lookup.sh call), session_id and
   agent_id; a small per-session marker file. Refuses Write/Edit/Agent in the top session after a start or compaction
   until the board was read. Cannot see: whether the record the work rests on was read, only the board. About 60 + 8 tests.
5. **R1 gaps of r57-0518**: manifests protected in RG (path list); a `pre-merge-commit` git hook running CC; a
   `timeout` on each settings entry. Never broken yet; each under 20 lines.
6. **Always-loaded files at source quality** (r57-0019; r57-0607, r57-0602): RG refuses a Write/Edit/shell write to
   `.claude/skills/**`, `.claude/agents/**`, `CLAUDE.md` unless an approve: answer is recorded for it. Cannot see quality,
   only that the owner said yes. About 30 + 6 tests.
7. **A helper writes only its files** (r57-0105, r57-0402; never recorded broken here): RG reads agent_id, maps it to a
   unit through PG's log, refuses a write outside the unit's files listed in the plan file. Only for planned units; about
   80 + 10 tests; waits on T8-COUNT's form of the plan file.
8. **Figures quoted from the paper** (r57-0014; r57-0606, r57-0611): a commit-time script on new `[quoted]` records:
   evidence must name a paper text on disk and the record's numbers must occur there (fill 1's script did this,
   r57-0130). Cannot see a misread figure that occurs elsewhere in the paper. About 80; CC's rule set.
9. **Numbers in hooks cite a record** (r57-0002, TOP8-COMMON): a script over `.claude/hooks/*.mjs` flagging numeric
   constants with no record id on the line (0, 1, 2 and array indexes excepted). Cheap (40), useful to the refuter.
10. **Privacy and installs** (R4, R3; never recorded broken): a PreToolUse deny list on WebSearch/WebFetch/curl, and
   install/download/docker forms in shell without an approve: record. About 60 + 60.

**Not enforceable by a hook or a script, and why:** R2 (a call never says why it was made); r57-0004, 0033, 0006, 0040,
0015, 0028 (judgments about value, independence and generality, not visible in any input); r57-0007 and 0018 outside
the ceiling (asked-for and own-initiative work look alike in the transcript, x08-0168); r57-0010 and 0031 beyond the
format (truth of a status or a claim needs a reader); r57-0012, 0013, 0029, 0030 and the board's design rows (they
guide a design, they are not actions). These stay written rules; a blind review is what checks them.
