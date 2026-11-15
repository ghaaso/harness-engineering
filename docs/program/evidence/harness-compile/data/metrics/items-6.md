# Items to classify, file 6: ideas of themes SKL, MSR, REL, OWN

### SKL-01 (idea, theme SKL, In use)
name: Local GPU speech-to-text for blocked recordings
problem it is meant to solve: YouTube blocks caption requests from this machine's address, so talks cannot be read from captions.
how: Download audio-only streams and transcribe them with faster-whisper distil-large-v3 in a throwaway uv environment on the RTX 5070. Nothing is installed system-wide.
where it stands: In use: 9 recordings, about 7 hours, 172 MB [M], transcribed in about 12 minutes [M] on GPU at 19-45x real time [M]; CPU with other sessions loading managed 2.7x [M].

### SKL-02 (idea, theme SKL, Built)
name: Recovery runbook skill and recovery operator agent
problem it is meant to solve: Production is down; we must find which database backups survive and prove a dump restores before rebuilding anything.
how: A runbook skill: dump inventory, paused-project restore policy, throwaway Postgres 17 restore with count and sequence checks; a Sonnet agent runs local steps only.
where it stands: Built: skill and Sonnet agent on draft PR #185, not merged. R2 listing and live restores stay with me. Not yet run.

### SKL-03 (idea, theme SKL, Built)
name: Android background-execution skill and analyst
problem it is meant to solve: The geofence, on-duty ping and job-travel tasks can fail silently on Android 12-15 and maker-customised phones, and analysts need cited facts on library internals.
how: A sourced skill on library internals and maker autostart paths, plus an Opus analyst citing findings and claiming no field reliability without device evidence.
where it stands: Built: skill and analyst on draft PR #185, not merged. Covers expo-location 18.0.10 [S], expo-task-manager 12.0.6 [S] and expo-modules-core 2.2.3 [S]. Not yet run.

### SKL-04 (idea, theme SKL, Built)
name: Android field-debugging skill and device debugger agent
problem it is meant to solve: The truth about geofencing and offline queues lives on phones, and the field APK is older than main, so reading code gives only candidates.
how: A sourced read-only skill for adb, dumpsys and logcat capture; a Sonnet agent returns a device-evidence table, never installing, clearing, force-stopping or judging reliability.
where it stands: Built: skill and agent on draft PR #185, not merged. Not yet run on a device.

### SKL-05 (idea, theme SKL, Built)
name: Self-hosting skill and architect agent
problem it is meant to solve: Moving production to my own box needs compose, tunnel, backup and power-loss steps drafted and checked without agents touching the host.
how: A sourced skill (restore-and-triage, tunnel guardrails) plus FixFlow's design content; a Sonnet high-effort agent drafts compose files, tables of my steps and local restore drills.
where it stands: Built: skill and Sonnet agent on draft PR #185, not merged. I run every host step. Not yet run.

### SKL-06 (idea, theme SKL, Built)
name: Turn sourced skills into pinned project agents
problem it is meant to solve: Our subagents lack domain knowledge (Android background work, Odoo, recovery, security review), and outside skills must reach them at the right price tier without manual loading.
how: Each sourced skill is distilled into a .claude/agents file with prompt, tool list and pinned model; workflows and sessions call it by agent type.
where it stands: Built: applied to 11 agent definitions [M] on draft PR #185, not merged. Not yet run, so no results. The design notes Haiku could take extractors, scans and table generation.

### SKL-07 (idea, theme SKL, Built)
name: Agent file: pinned model, tools, preloaded skill
problem it is meant to solve: A subagent inherits the session's model and loads nothing unless told, so its role, price tier and tool access need to be fixed in one file.
how: Frontmatter sets name, tools, model (haiku, sonnet or opus), skills and effort; the body is a read-only-unless-told, cite-everything prompt naming a return schema.
where it stands: Built: 11 fixflow agent definitions [M] on draft PR #185, plus the older Haiku explorer already in the repository (12 in all); fields checked against the Claude Code docs on 2026-11-03. Not yet run.

### SKL-08 (idea, theme SKL, Built)
name: Skill package layout with provenance files
problem it is meant to solve: Skills copied from other repos must stay traceable, licensed and small enough to load, so a maintainer can tell what was taken, changed and rejected.
how: Each package has a SKILL.md, an UPSTREAM.md (repo, commit, paths, licence, taken/changed/rejected), the verbatim licence and references, kept under about 150 KB [S].
where it stands: Built: applied to all 13 packages [M] on draft PR #185, conventions written 2026-11-03/04. Not yet tested.

### SKL-09 (idea, theme SKL, Built)
name: Three skill statuses: sourced, authored, researched
problem it is meant to solve: A reader needs to know whether a skill's facts came from an outside repo, were written by us, or were gathered from the web.
how: Each package gets one index status: sourced (from an upstream repo), authored (written here) or researched (from fetched web sources, with URL and date).
where it stands: Built: the index on draft PR #185 lists 10 sourced, 1 researched and 2 authored packages [M]. Not yet tested.

### SKL-10 (idea, theme SKL, Built)
name: FixFlow facts first, cited to path and line
problem it is meant to solve: Generic outside advice wastes tokens and can mislead agents on this repo, and stale line numbers or vague dates make claims impossible to check.
how: Generic advice shrinks to a rule and reason; words go to repo specifics. Claims cite path and line; web facts cite URL and date.
where it stands: Built: the rule set is applied across the packages on draft PR #185; facts were re-read on 2026-11-04. Not yet tested.

### SKL-11 (idea, theme SKL, Built)
name: Skills never contradict CLAUDE.md
problem it is meant to solve: Imported skills carry rules, such as deleting failed queue writes, that would break our project's invariants if an agent obeyed them.
how: Any upstream conflict with CLAUDE.md gets a 'Where upstream disagrees' block in the skill and a 'Rejected' line in the provenance file.
where it stands: Built into three skills (offline sync, Expo release, self-hosting) on draft PR #185; untested. An upstream rule to delete failed queue writes was rejected, since our outbox never deletes a write.

### SKL-12 (idea, theme SKL, Built)
name: No secrets in skills: key names and fingerprints
problem it is meant to solve: Agents reading config files such as eas.json or .env could copy real tokens or keys into skills, briefs or outputs.
how: Real values are cited by path and key name only; a committed value appears as a 12-character [S] hash fingerprint. Agents never open .env files.
where it stands: Built: written into every agent definition checked (draft PR #185). Not yet tested.

### SKL-13 (idea, theme SKL, Built)
name: Read the skill first, even when preloaded
problem it is meant to solve: A host that does not preload skills would leave the agent without its rules, so the agent must fetch them itself.
how: Every agent body opens with an instruction to read its SKILL.md and references first, even though the skills field already preloads it.
where it stands: Built: present in every agent definition read (draft PR #185). Not yet tested. CLAUDE.md loads into custom subagents by default.

### SKL-14 (idea, theme SKL, Built)
name: Orchestration skill and repo-conventions skill
problem it is meant to solve: Every session's agents need identical briefs, and implementers need the deploy traps, migration numbering and slice boundaries put in front of them.
how: One project skill carries the context block, schemas, reading rules and routing table; a second packages CLAUDE.md and the deploy traps for implementation sessions.
where it stands: Built in part: the orchestration skill is authored on draft PR #185 (see the main-session contract skill). The repo-conventions skill is not confirmed built. Not yet tested.

### SKL-15 (idea, theme SKL, Built)
name: fixflow-explorer Haiku-pinned locator agent
problem it is meant to solve: The built-in Explore agent inherits the session's model (Opus here), so a simple where-is-X lookup runs on our most expensive tier.
how: A read-only agent pinned to Haiku greps first, reads at most 40 lines [S], and reports path and line for each match, with no verdicts.
where it stands: Built: the agent file exists in the repo and predates PR #185. Not yet tested; no usage or cost figures.

### SKL-16 (idea, theme SKL, Built)
name: Odoo import and Pakistan accounting skills with analyst
problem it is meant to solve: Money postings must reach Odoo exactly once with Pakistan tax records right, since wrong guesses double-post or drop entries.
how: A sourced Odoo skill (JSON-2, external IDs as idempotency key, reversals) plus a researched Pakistan books skill; an Opus analyst preloads both.
where it stands: Built: two skills and one agent on draft PR #185, not merged. Every Pakistan fact carries a URL and date. Not yet run.

### SKL-17 (idea, theme SKL, Built)
name: [owner] stop markers in agent procedures
problem it is meant to solve: Agents must never deploy, restore over live data, rotate keys, message people or install on a phone; those steps need me.
how: Steps only I may do carry an [owner] marker; the agent stops, hands me the exact command, and resumes from my pasted output.
where it stands: Built: used in all 13 skills [M] and the agent definitions on draft PR #185. Not yet tested.

### SKL-18 (idea, theme SKL, Built)
name: Orchestration contract skill for the main session
problem it is meant to solve: The main session must recall tier routing, output schemas and session rules each phase without re-reading long design documents.
how: An authored skill the main session loads each phase: routing table, agent registry, context block, schemas, script contract, plan rules. Not preloaded into subagents.
where it stands: Built: authored on 2026-11-04 from the design and ship plan; on draft PR #185, not merged. Not yet tested.

### SKL-19 (idea, theme SKL, Designed)
name: ks command-line tool plus skill as the agent interface
problem it is meant to solve: Subagents and workflow agents need one way into the knowledge store that works with no configuration or approval prompt.
how: A zero-dependency Node command-line tool called through Bash (lookup, verify, show, outcome, claim, record, close), with a skill carrying the procedure.
where it stands: Designed in the knowledge-store design; nothing built. No hook in v1. A skill description at its ceiling would add about 620 tokens per call [E].

### SKL-20 (idea, theme SKL, Designed)
name: CI check for skill and agent frontmatter
problem it is meant to solve: Skill files can rot silently: a missing name, a name that differs from its folder, a stale Alembic head number.
how: A Node CI step fails bad skill frontmatter (name equals folder, description under 1024 characters [S]) and agent fields; flags a stale head number.
where it stands: Adopted in the Horthy sweep, to be added to P1-ci or P1. Not yet built; a one-off version of the gate was run once.

### SKL-21 (idea, theme SKL, Idea)
name: Hooks: stop hook and tool-event heartbeat
problem it is meant to solve: We want claims checked and progress shown automatically; today nothing blocks a session on a failed claim check or shows progress from tool events.
how: Settings-based Claude Code hooks: a stop hook blocks a session on a failed claim check, and a heartbeat is fed by tool events.
where it stands: Deferred: harness v2 keeps hooks off for now (decision D17). Root-gate versions of the same checks need no hook. No gain shown yet.

### SKL-22 (idea, theme SKL, Idea)
name: Wrap conditional CLAUDE.md rules in 'important if'
problem it is meant to solve: Long CLAUDE.md files get skimmed, and rules that matter only for certain tasks dilute the always-true ones.
how: Conditional rules sit in important-if tags, always-true content stays bare, in the wrapped arm of the CLAUDE.md trial (E1), plus 3 [S] oblique probes (which test a rule without naming it).
where it stands: Trial: only as one arm of E1; the technique alone fell to the ruling that keeps every rule. Horthy's adherence claims carry no measurements. Not yet run.

### SKL-23 (idea, theme SKL, Idea)
name: Split CLAUDE.md by runtime with nested files
problem it is meant to solve: Our CLAUDE.md is 390 lines [M], about twice the length where adherence is said to fall, so every task pays for detail it may not need.
how: Move one-runtime material to backend and mobile CLAUDE.md files; keep cross-runtime rules and a pointer index in the root. Test briefs and diff-only reviewers too.
where it stands: Trial: a split arm of E1 on a branch. A nested file was seen attaching in a workflow subagent on Read here. Pass rate not yet compared.

### SKL-24 (idea, theme SKL, Idea)
name: One-off sweep for contradicting instructions
problem it is meant to solve: Always-loaded instructions can contradict each other (CLAUDE.md points fresh sessions to the July handoff, not the ship plan), and fact-drift checks do not catch that.
how: One fresh Opus sweep after the skills land, over CLAUDE.md, memory, the ship plan, the orchestration design and each skill; a refuter checks hits.
where it stands: Trial: run once, no standing check. Each hit quotes both texts and the different action an agent would take. Not yet run.

### SKL-25 (idea, theme SKL, Idea)
name: Phase-scoped skill trigger tally
problem it is meant to solve: Skills may never load in the phases their descriptions name, and nothing shows it.
how: At each phase close, search transcripts for skill calls and skill-preloading agents; tabulate against the phases each description names.
where it stands: Trial: to run over the first six phase sessions [T]. A cap and pruning were refuted in the sweep. Not yet run.

### SKL-26 (idea, theme SKL, Parked)
name: A ks guide command printed from command definitions
problem it is meant to solve: We worried knowledge-store documentation could drift from the tool's real commands.
how: The guide command would print guidance from the same command definitions as the tool, with a test that every subcommand appears.
where it stands: Parked: the tool and its skill live in one repo and one commit, so version skew cannot arise; the store is also unbuilt. Not tested.

### SKL-27 (idea, theme SKL, Parked)
name: Install BAML language and CLI in the harness
problem it is meant to solve: We hoped for typed prompt functions, lenient parsing of agent outputs and built-in tests.
how: BAML generates a client and parses replies with schema-aligned parsing; the Claude Code route needs a canary-only client running one claude -p per turn.
where it stands: Parked, not installed. Three grounds: a second billing path or opaque orchestrator, no resume in its runner, a parser that silently drops list elements. Its distinctive ideas already exist here, stricter.

### MSR-01 (idea, theme MSR, In use)
name: Worker sweep and load sampler
problem it is meant to solve: We want worker and slot counts chosen from measurement, and memory and CPU visible during checks and drills.
how: Sweep workers (6, 9, 12, 16) while a sampler logs CPU and free memory to CSV; test a pair before approving a second slot.
where it stands: In use on checks: 6 workers 137.5 s [M], 12 workers 104.7-135.1 s [M]; knee between 6 and 12. Two container checks run together took 266-267 s [M] each, against 220 s [M] for one run alone in the same test.

### MSR-02 (idea, theme MSR, In use)
name: Limitations first, no fixes until agreed
problem it is meant to solve: Fixing before we agree the limitations would hide which ones matter.
how: List and weigh limitations first; the record and map carry no fixes; we use the ranking to agree the list together.
where it stands: In use in the library review: 69 [M] limitations listed and weighed, no fixes agreed. A nine-agent solve round was started and stopped at my request; no fix from it was adopted.

### MSR-03 (idea, theme MSR, In use)
name: Number tags on every figure
problem it is meant to solve: Readers could not tell a measured number from a guess, so a guess could pass as a result.
how: Tag every number as measured, estimated, guess or outside figure, with target and illustrative tags added by the harness.
where it stands: In use across the program documents: [M] measured, [E] estimated, [G] guess, [S] outside figure, plus [T] target and [I] illustrative.

### MSR-04 (idea, theme MSR, In use)
name: Pre-registered, sealed held-out test protocol
problem it is meant to solve: We want every test to settle something, so tuning, the held-out set and the scoring rule are fixed first and wording cannot overclaim.
how: Fix the protocol before any arm exists: split commits by date, tune on one part, one main metric, a smallest worthwhile difference, named wording.
where it stands: In use on the graph test: 65 tune and 75 held-out commits [S]; run clean; smallest detectable difference about 0.09 recall [E]; every arm lost 0.06 to 0.17 [M] tune to held-out.

### MSR-05 (idea, theme MSR, In use)
name: Evaluation protocol with Amdahl bound
problem it is meant to solve: We had no agreed way to judge whether a workflow change is an improvement.
how: Measure accepted tasks per active human hour; freeze the baseline; change one mechanism at a time; randomise order; keep all attempts; apply Amdahl's bound.
where it stands: In use in the testbed; no 3x or 5x claim is established. 20 % avoidable effort gives at most 1.25x [I]; 8 [M] run records are schema-valid but carry null telemetry.

### MSR-06 (idea, theme MSR, Tested)
name: Slow-path diagnosis: Windows to Docker port
problem it is meant to solve: Adding test workers stopped helping, and we wanted to find where the time actually went.
how: Measure machine, worker and VM CPU during a parallel pass, and per-query latency from Windows against inside the container.
where it stands: Testbed measurement: machine at 42 % [M] of 24 processors; six workers used 2.45 [M] cores; a trivial query took 0.63 ms [M] from Windows, 0.13 ms [M] in the container.

### MSR-07 (idea, theme MSR, Tested)
name: Window-fill analysis: what fills the context
problem it is meant to solve: Knowing the token total is not enough; we did not know what content fills the windows, so claims about levers were guesses.
how: Classify each context token from growth between calls, weighted by re-reads: fixed start, own output, fetched content, summaries. Also count lookup-only calls.
where it stands: Measured, checked by two refuters: FixFlow fetched content 27-28.5 % [E], 43.6 % [E] re-read by lookup-only calls; testbed own output 53-69 % [M] of growth. Exposures, not savings.

### MSR-08 (idea, theme MSR, Tested)
name: Fixed context overhead measurement
problem it is meant to solve: Every session or subagent carries tokens before doing any work, and we did not know how large that fixed start is.
how: A usage tool breaks down each agent's overhead (tools, MCP, skills, system prompt, memory); a script measures how documentation grows.
where it stands: Measured in the October testbed: about 70k [M] tokens before work (system tools 33,968, MCP 16,599, skills 9,059 [M]). Docs about 338,816 tokens [E].

### MSR-09 (idea, theme MSR, Tested)
name: Replacement graph test with a real engine
problem it is meant to solve: Our first graph test used the weakest query and no real engine, so it could not tell us whether a repo graph helps.
how: Vary facts, algorithm, output form and engine separately; sealed tasks from 140 commits and 50 questions; hops 1 to 6; search, SQLite, graph arms.
where it stands: Tested on held-out commits, run clean, scripted search arm, no agent run. Typed store was ahead of scripted search by +0.076 recall [M], interval +0.036 to +0.118 [M]: clear of zero, though below the 0.09 [E] the protocol had planned as detectable; SQLite and …

### MSR-10 (idea, theme MSR, Tested)
name: Scripted search baseline arm
problem it is meant to solve: We need to compare every graph against what our sessions do today, which is plain text search.
how: A fixed script does text search for the task's names, paths and route strings, in one and two rounds; not an agent.
where it stands: Tested on held-out commits: recall 0.625 [M] one round, 0.634 [M] two rounds, median 6 to 8 [M] lookups; tune 0.759 [M]. No agent was run.

### MSR-11 (idea, theme MSR, Tested)
name: Pilot of the attested-only map on four files
problem it is meant to solve: We wanted to check whether a strictly sourced map recovers the dependency chain a human annotator saw.
how: Four frozen files read under the design by a skeptic and an independent annotator; counts compared, then re-applied under a revised design.
where it stands: Tested in the testbed: first design 427 attested edges [M], chain not reproduced; revised design 692 edges [M] with 1,166 dangling endpoints [M]. Links through a shared value cannot be joined.

### MSR-12 (idea, theme MSR, Tested)
name: Token tally from session transcripts
problem it is meant to solve: We did not know where our tokens went or why usage limits hit, so any cut would have been a guess.
how: Read-only scripts parse every transcript, count each call once per message id, and total calls, tokens and compactions per group and per slice session.
where it stands: Measured for October and November. November: 4,252.9M [M] cache-read tokens over 184 files; slice sessions 66.4 % [M] by one count; re-measurement agreed within 0.3 % [M].

### MSR-13 (idea, theme MSR, Tested)
name: Fit-screen the idea sweeps against bottlenecks
problem it is meant to solve: Both idea sweeps scored ideas against the FixFlow ship plan, never against our 21 bottlenecks, so their verdicts could not carry over.
how: Opus mappers placed kept ideas, Sonnet readers screened dropped ones, adjudicators ruled on flags, refuters attacked claimed fits, and a script checked every id.
where it stands: Tested in three workflows with 19 agents, models reading documents only: 87 kept ideas gave 29 fits [M]; 868 dropped gave 142 flagged and 1 promoted [M].

### MSR-14 (idea, theme MSR, Tested)
name: Throughput record from git history
problem it is meant to solve: We had no before-and-after baseline of how much work lands per day.
how: Count commits per day on all branches and first-parent merges onto main with light git log commands, and note gap days.
where it stands: Measured in the testbed: 426 [M] commits since 1 Nov, peak 150 [M] on 6 Nov, 36 [M] first-parent merges onto main. Commit counts are not a quality measure.

### MSR-15 (idea, theme MSR, Built)
name: System-dynamics model of the harness
problem it is meant to solve: Which limit binds first depends on rates, so we want to see how each controller changes the machine before building it.
how: Eleven stocks with flow equations, nine switchable controllers and four limits; assumptions listed. It shows behaviour, not a forecast.
where it stands: Built in the harness v2 page; a refuter checked claims. At October's window of about 2.5 lane-hours [E], tokens are the first limit at any lane count [I].

### MSR-16 (idea, theme MSR, Built)
name: Trial harness: transcript accounting and blind scoring
problem it is meant to solve: We want per-agent tokens, tool calls and file reads measured after the fact, and runs scored without knowing which arm they came from.
how: Scripts build per-arm workspaces, read agent transcripts for tokens and peak context, check citations, and blind the arm labels before scoring.
where it stands: Built in the testbed; not yet run on trials, only an extraction comparison exists. Its token figures are characters divided by 4 [E].

### MSR-17 (idea, theme MSR, Designed)
name: Replay before live
problem it is meant to solve: A gate or review mechanism could refuse good work or miss defects, so we want proof on the record before it can block us.
how: Accept a mechanism by replaying it on the recorded history where possible, and run it record-only before it may refuse anything.
where it stands: Adopted as a standing rule of harness v2, to apply to mechanisms 1 to 6. No mechanism has yet run live under it.

### MSR-18 (idea, theme MSR, Designed)
name: Sealed replay with read log
problem it is meant to solve: Replaying an old fix chain to test a review method is unfair if the agent can peek at the later fix, finding tables or board.
how: Replay in a clone with no later refs, answer key hashed first, read log from the transcript, one head commit and brief per arm.
where it stands: Designed in harness v2 phase 3 (mechanism 1), first script at zero tokens; never run. Proof planned: one recorded fix chain, sealed clone against plain worktree.

### MSR-19 (idea, theme MSR, Designed)
name: Recurrence audit before any knowledge-store build
problem it is meant to solve: We have not shown that the same cause ever hits twice in a way a symptom-keyed store could serve, so a build might repay nothing.
how: Sonnet classifies 72 [M] fix commits, counting a repeat only under three strict tests; an Opus refuter rechecks every counted repeat.
where it stands: Designed in the knowledge-store design; not yet run. A raw count already shows 3 to 5 same-cause repeats among 48 fix commits on main [M].

### MSR-20 (idea, theme MSR, Designed)
name: Missed-existing detector with blind re-rule
problem it is meant to solve: A miss of an entry that existed looks the same as a store nobody consulted, so we cannot measure recall or whether embeddings are needed.
how: At record time the author lists prior lookups; detectors flag matches against the store’s existing entries (its roster); author rules same/related/new; reviewer re-rules blind. Unknown stays NULL, never zero.
where it stands: Designed in the knowledge-store design (build planned in KS-2 and KS-3, read at KS-9); a lower bound by construction. Not yet tested; expected under about 0.2 per 8-week window [E].

### MSR-21 (idea, theme MSR, Designed)
name: Zero-token import-and-caller index replay
problem it is meant to solve: Our sessions spend many calls only reading; we want to know cheaply whether a code index would have answered them before spending agent tokens.
how: At each recorded window's start commit, build an import-and-caller index, count lookups it would answer, and check it lists the files later edited.
where it stands: Designed, not yet run: 54.7 % [M] of calls only read or search. Co-change half is weak, only 432 commits [M]. Proposed pass marks 3 % of tokens, recall 0.8 [T].

### MSR-22 (idea, theme MSR, Designed)
name: Record unknown as unknown, never zero
problem it is meant to solve: If we record missing data as zero, a gap looks like a measured absence and we draw the wrong conclusion.
how: Store an unmeasured value as unknown, and write decisive checks with explicit if-and-raise rather than bare assert.
where it stands: Adopted as a stated lesson from the CureFound research results; it matches the repository rule that an unknown evidence value is not zero. Not separately measured.

### MSR-23 (idea, theme MSR, Designed)
name: Frozen validation contract for any map or store
problem it is meant to solve: We built maps and stores without testing whether they beat the routed reading we already have, so we want a fair A/B first.
how: Sealed: 5 [S] cases, 3 arms (map, routed reading, Graphify), 2 [S] runs each, blind scoring; better needs a 0.10 [T] gap in 4 of 5 cases.
where it stands: Designed and frozen in the testbed, never run: 30 runs [S], 16,000 tokens [S] per run; the runs folder is empty. Work moved to context-admission research.

### MSR-24 (idea, theme MSR, Designed)
name: Measured-rates table feeding planner and governor
problem it is meant to solve: We lay out plans on guessed times and an unknown token budget per five-hour window, so we cannot tell which limit comes first.
how: The check, merge queue and transcript tally write measured rates (check time, waits, tokens per lane-hour, rounds per slice); every wave updates them.
where it stands: Designed in harness v2; not yet tested. First rates are the check timings 367 s and 230 s [M]; the planner and governor depend on it.

### MSR-25 (idea, theme MSR, Designed)
name: Pre-registered evaluation plan with gates and staged budgets
problem it is meant to solve: We want to stop a harness declaring its own win, so gates and budgets are settled before anything runs.
how: Four arms, gates written in advance, staged budgets with caps, inconclusive at budget exhaustion, and all overhead charged to the treatment.
where it stands: Designed in the testbed; stage 1 and a screen ran, stages 2 to 4 did not. Input gates -50 % and -25 % not met: adapter +10.31 % [M], +17.02 % [M].

### MSR-26 (idea, theme MSR, Designed)
name: Tool qualification and G0-G8 gates
problem it is meant to solve: Measurement tools can report green or zero when nothing was checked, so we want to catch that before trusting a number.
how: Qualify maintained tools (Promptfoo, Langfuse, Phoenix) before writing a runner; use independent oracles, hold-out inaccessibility and a trap list for green-but-empty results.
where it stands: Designed in the testbed; no tool installed or run. Registers cover 27 methods and 44 tool source groups [M]; four Promptfoo traps were read from source, not reproduced.

### MSR-27 (idea, theme MSR, Designed)
name: Effectiveness review F01-F10
problem it is meant to solve: A claim of 3x measures productivity, not quality, and we lacked early proof the system runs and restores.
how: Four separate measures (quality, context, productivity, cost), a context freshness test, a frozen baseline, and a throwaway synthetic deployment with backup and restore.
where it stands: Designed in the testbed as proposals only; not yet tested. The illustrative hosting cost stayed under its cap [I].

### MSR-28 (idea, theme MSR, Designed)
name: Honest cold-resume trial with hashed answer key
problem it is meant to solve: The one test of whether a fresh session can resume our work could pass just by the agent reading the answer file.
how: Record a hash of the answer file in the PR journal first, commit the file after judging, run on a checkout without it, then check the read log.
where it stands: Adopted for phase 1 (P1), narrowed after refuter review; n=1 [S], one rerun if contaminated. Not yet run. Pass: hash first, zero reads of the key.

### MSR-29 (idea, theme MSR, Designed)
name: Symmetric reading rule for single-run gaps
problem it is meant to solve: One benchmark run per setting cannot separate an effort effect from noise, so we risk over-reading small gaps.
how: A zero-cost reading rule: a single-run gap of a few strict passes counts as no detectable difference for either effort level; cost and task fit then decide.
where it stands: Adopted for this review's effort decisions only. Source: medium 28 against xhigh 25 of 196 [S] strict passes, one run each, read as no detectable difference.

### MSR-30 (idea, theme MSR, Designed)
name: One provenance line in each evidence README
problem it is meant to solve: Someone re-running or disputing an evidence folder later cannot tell which model and tool build produced it.
how: Each evidence README gets one line: exact model id, ids the aliases resolved to, tool version and run date.
where it stands: Adopted, narrowed to one line; standing re-runs on every release were dropped. Not yet tested; pass is 2 of 2 [T] next folders carrying the line.

### MSR-31 (idea, theme MSR, Designed)
name: Adoption audits of reference repositories
problem it is meant to solve: We needed to know which ideas from outside agent projects are worth adopting.
how: Source-first audits of six outside projects; adopt small fields (code-shape block, boundary trace, fail-before/pass-after, error retirement) and reject installing runtimes.
where it stands: Adopted narrowly in the clinic testbed; runtimes, webhooks and vector databases rejected. 1,658 [M] files rehashed, none missing; no upstream tests run.

### MSR-32 (idea, theme MSR, Idea)
name: 'Sessions:' line in the PR journal
problem it is meant to solve: Transcripts of resumed or multi-session phases are hard to find when we want to audit them.
how: One plain line listing session ids, copied from the scratchpad path, goes into the existing PR journal.
where it stands: Trial from the Dex Horthy sweep, run alongside the transcript tally; not yet tested. Audit at least 7 days [S] after close.

### MSR-33 (idea, theme MSR, Idea)
name: Transcript-derived read audit of analysts
problem it is meant to solve: Analyst reading rules are brief text and extra reads are self-reported and unenforced, so we cannot tell whether an analyst obeyed them.
how: A short Node script compares an analyst's self-listed extra reads with the Read and Grep calls in its subagent transcript.
where it stands: Trial from the BAML sweep, unrefuted. Feasibility shown: one lane reader's transcript holds 115 [M] tool-call entries. Mismatch rate not yet measured.

### MSR-34 (idea, theme MSR, Idea)
name: Medium-vs-xhigh effort trial, pass bar first
problem it is meant to solve: Choosing a model effort for reviewers and verifiers is guesswork, and without a rule fixed in advance a comparison can be bent to its result.
how: Replay 12 [S] frozen verifier briefs at medium and xhigh, 3 times each, with an xhigh repeat as noise floor; write the pass bar first.
where it stands: Trial from the Dex Horthy sweep, one-off: 12 [S] briefs plus 5 [S] fixtures from closed defects, blind-graded. Not yet tested; the testbed has no effort benchmark.

### MSR-35 (idea, theme MSR, Idea)
name: Medium-effort verifiers via blind paired shadow runs
problem it is meant to solve: Most of our verifiers run at xhigh effort, which costs more, and one outside report says medium often matched or beat it.
how: A blind medium-effort shadow reruns each non-P0 verifier's brief; 30+ [T] pairs, pass bar set first, 3 repeats per arm, scored against final adjudication.
where it stands: Top trial 1 in the Dex Horthy sweep; not yet tested. Targets: agreement at least incumbent minus 1 [T], medium tokens at most 0.6x [T]. Outside evidence is weaker than first read.

### MSR-36 (idea, theme MSR, Idea)
name: Send-back repeat share
problem it is meant to solve: We do not know how often a review send-back repeats a finding class we have already seen, so we cannot tell if lessons are being captured.
how: Count the share of review send-backs that repeat a class of finding already found earlier.
where it stands: Proposed in the library review; not run, so no repeat share exists yet.

### MSR-37 (idea, theme MSR, Idea)
name: Rerun knowledge-store refuter set at high effort
problem it is meant to solve: We do not know whether verifiers run at xhigh need to be that expensive.
how: Rerun the committed refuter workflow on frozen inputs at Opus high effort twice and compare with the xhigh outcomes.
where it stands: Trial from the Dex Horthy sweep, conditional: runs only if xhigh verifier spend is at least 20% [T] of use. Not yet tested.

### MSR-38 (idea, theme MSR, Idea)
name: Transcript tally at phase close
problem it is meant to solve: Routine steps that leave no git or GitHub trace look the same whether done or skipped, so we cannot check compliance from outside.
how: A read-only Node script scores 8 [T] routine steps from session transcript tool calls and compares them with the closing message.
where it stands: Trial from the Dex Horthy sweep (top trial 2); about 100 lines [E]. Not yet tested. Must run within 7 days [S] of a phase close, before transcripts are pruned.

### MSR-39 (idea, theme MSR, Idea)
name: Cause tag on journal entries for my corrections
problem it is meant to solve: When I correct an agent, we cannot tell a harness failure from a plan or product error, so repeats stay invisible.
how: A one-word tag (harness, plan or product) on each journal entry that records one of my corrections; count harness-tagged shapes that repeat.
where it stands: Trial from the Dex Horthy sweep; a weekly trace-mining loop was dropped. Not yet tested. Covers the first 5 [T] executed phases.

### MSR-40 (idea, theme MSR, Idea)
name: Per-PR rework rate as health metric
problem it is meant to solve: We have no measure of whether review is converging or code keeps changing after review.
how: Track the share of each PR's diff changed after review; under 5% [T] is the quality bar.
where it stands: Deferred in the Dex Horthy sweep. No refuter verdict, reviewers split between trial and skip, and no measurement is defined. Not tested.

### MSR-41 (idea, theme MSR, Idea)
name: Re-run CLAUDE.md probes on model change
problem it is meant to solve: A new model behind the Sonnet or Opus tier may follow CLAUDE.md rules differently, and nothing would show it.
how: At a recorded model change, run 10 [S] probes with the full CLAUDE.md on a frozen commit, old against new model, 3 [S] fresh sessions each.
where it stands: Trial from the Dex Horthy sweep, narrowed by the refuter; runs only after the first CLAUDE.md probe set has run once. Not yet tested.

### MSR-42 (idea, theme MSR, Idea)
name: Record weekly-window usage per phase
problem it is meant to solve: Outside dollar figures do not fit a flat subscription where weekly limits bind, so we do not know the verifier spend share.
how: At phase open and close, the closing evidence line records weekly-window percent from usage data, plus subagent tokens and agents lost to a usage limit.
where it stands: Trial from the Dex Horthy sweep, narrowed to phases 1 to 3; not yet tested. Its figure decides whether the high-effort refuter rerun runs (threshold 20% [T]).

### MSR-43 (idea, theme MSR, Idea)
name: Record true peak context and reversal positions
problem it is meant to solve: A 40% [S] context rule is untested here, and the on-screen percentage includes the autocompact buffer, so we mislocate decisions made at high context.
how: For 5 [T] phase sessions a Haiku extractor sums input, cache-creation and cache-read tokens per call, records the peak, and logs where reversed decisions sit.
where it stands: Trial from the Dex Horthy sweep; the counting method was corrected in its 2026-11-09 addendum. Not yet tested.

### MSR-44 (idea, theme MSR, Parked)
name: Lean-workflow reassessment
problem it is meant to solve: We wanted to know whether a minimal-surface setup would beat our documented workflow.
how: Nine dispositions on a proposal I pasted: keep root authority, reject dropping the documentation, treat file-size limits as triggers for review, reject an allow-list of hooks; primary sources checked.
where it stands: Parked: no change adopted; comparison never run. Root instruction file is 28 lines, 6,709 bytes [M]; outside: context files raised cost over 20% [S].

### MSR-45 (idea, theme MSR, Parked)
name: Measurement ledger and pipeline M00-M06
problem it is meant to solve: We had no standing way to measure whether harness changes help; all eight exports had null tokens, effort, cost and resume time.
how: An append-only log with hash manifests and an identity hierarchy, an optional rebuildable SQLite index, and seven build slices.
where it stands: Parked: designed in the testbed, never built. I ruled it low priority and the review rated it skip, because a month of research found no measured gain. Eight [M] exports lack tokens.

### MSR-46 (idea, theme MSR, Parked)
name: Judge models by corrections per conversation
problem it is meant to solve: One-shot answers are a poor way to judge a model for loop-style work.
how: Judge a model by loop or goal outcomes and the corrections needed per conversation, not one-shot answers.
where it stands: Parked: skipped in the Dex Horthy sweep; my corrections are already journalled and tallied elsewhere, and land on the orchestrator, not a routing tier. Source's five-to-two figure is illustrative [I].

### MSR-47 (idea, theme MSR, Parked)
name: Standing regression re-runs for briefs and models
problem it is meant to solve: Editing an agent brief or changing a model could silently change results, with no test to show it.
how: Run 10-30 [S] past inputs on old and new brief 3 times each, score with deterministic checks, review only disagreements; re-run on each model release.
where it stands: Parked: not now. Inputs are live repo and web, not fixed cases; cost about 60-180 [E] agent runs per brief edit; a standing re-run would rebuild the measurement pipeline we set aside.

### MSR-48 (idea, theme MSR, Parked)
name: Schema-retry count as a brief-quality signal
problem it is meant to solve: A brief that makes agents fail the output schema often may be defective, but our scripts cannot see retry counts.
how: Log structured-output rejection counts per brief over 3 [S] runs; flag any brief above a 10% [G] retry rate.
where it stands: Parked: refuted in the BAML sweep because the program has never recorded a schema rejection; its failures are usage and session limits. The 10% [G] threshold is not yet calibrated. Not tested.

### REL-01 (idea, theme REL, In use)
name: Local staging VM rig with fifteen drills
problem it is meant to solve: We had never tested restore, deploy, upgrade or failure behaviour outside development, and had no production-like host to rehearse on.
how: Script-built Hyper-V Debian VM (2 vCPU [S], 2 GB [S]), versioned releases, fifteen re-runnable drills: deploy, upgrade, backup and restore, load, security probe, reboot.
where it stands: In use in the testbed, synthetic data: fresh VM serving in 109 s [M], upgrade 7 s [M], 781,505 rows restored in 14 s [M], security probe 99 pass, 0 fail [M].

### REL-02 (idea, theme REL, Tested)
name: Volume load and page-speed drill
problem it is meant to solve: Pages were slow at volume, it was unknown whether 12 concurrent users worked, and an optimisation had to be proved not to change figures.
how: Grow synthetic data through the app's services, time persona pages, make reads set-based, count queries at two sizes, hash page bodies before and after.
where it stands: Measured in the testbed: pages 9-13 s down to 0.1-0.5 s at 75,016 documents [M]; queries on one page 29,346 to 28 [M]. The 12-clerk load run was not repeated after the fix.

### REL-03 (idea, theme REL, Built)
name: Maestro on-device smoke tests with runner agent
problem it is meant to solve: The app has no screen-test harness, so we never exercise carry-in and arrival flows on a real device automatically.
how: Sourced Maestro skill with foreground smoke flows (carry-in, offline intake, arrival pair, drain report, read-only) for one phone; a Sonnet agent runs and reports.
where it stands: Built in skills packages on draft PR #185, not merged; not yet run. A pass would prove only the foreground smoke, never headless delivery or field reliability.

### REL-04 (idea, theme REL, Built)
name: EAS release skill and release operator agent
problem it is meant to solve: Fleet APK builds can ship the wrong host, certificate or version, or wipe the offline queue if uninstalled, and JavaScript fixes wait in the build queue.
how: Skill under rulings (no expo-updates, never prebuild, SDK 52, same certificate, install over); a Sonnet agent checks preconditions and records per-phone before/after build receipts.
where it stands: Built on draft PR #185, not merged; not yet run. The design asked whether expo-updates should ship; the built skill rules it out. Builds and installs stay with me.

### REL-05 (idea, theme REL, Built)
name: Real-data switch and money-setup command
problem it is meant to solve: A fresh install could not take real data or create accounts and tills, which is how the clean-install gap surfaced.
how: An append-only, default-off authorisation table that only the host console can switch (audited), plus a second command that creates accounts and tills.
where it stands: Built on a clinic testbed branch, unmerged and ungated: 39 files, 2,552 insertions, 71 deletions [M]; 2570 tests passed [M].

### REL-06 (idea, theme REL, Built)
name: User-folder Android toolchain, verified on disk
problem it is meant to solve: The device lab and the first-use device step need a JDK, adb, apksigner, an emulator and a system image on this PC without changing system settings.
how: Install into a user folder, loaded per terminal, nothing on PATH; the installer reports success only for files found on disk.
where it stands: Built; installed 13 November, 8.6 GB [M] on disk: JDK 17.0.21, adb 1.0.41, build-tools 37.0.0, emulator 37.2.13, Android 14 image, one virtual device [M]. WHPX reported usable [M]. One emulator DLL stays absent: the antivirus blocks it, and BLOCKED-FILES.txt l…

### REL-07 (idea, theme REL, Designed)
name: Drain branch cut at the pre-merge commit
problem it is meant to solve: Version 8 cut the drain branch at P1's squash commit; under build-ahead, anything merged below P1 would leak into the image we ship.
how: Cut release/drain at the main commit before the first merge; add P1, P2b-2 and P3a squash commits by cherry-pick; the log shows only those.
where it stands: Adopted as a rule in ship plan section 7.7 after a refuter found it the one blocker; branch not yet cut, not yet tested. The web variant adds P12a and P12.

### REL-08 (idea, theme REL, Designed)
name: Zero-seed first-use walk in every gate
problem it is meant to solve: Gaps surfaced only on the last day: nobody walked a clean install, so the app refusing real data and missing tills stayed hidden.
how: Each gate runs install, first user, tills, a real-shaped import, one transaction and close of day on a fresh container database with no seeder.
where it stands: Designed in harness v2 phase 4; not built. Adds 2 to 3 minutes [E] per gate and needs phase 2. Half of this gap was closed on 11 November.

### REL-09 (idea, theme REL, Designed)
name: Rented-host rehearsal
problem it is meant to solve: So far everything we built has run only on my PC, so certificates, off-site backups, alerts and restore are unproven outside my PC.
how: Free steps first with me present for one administrator prompt (restore, deploy checklist, off-site push, planted alert), then one rented-host day on made-up data.
where it stands: Designed in harness v2 phase 4; not run. Today there is no certificate script, no off-host backup push and no alert channel [M]. Target: a result file per checklist gap [T].

### REL-10 (idea, theme REL, Designed)
name: List of what never ran on real hosts
problem it is meant to solve: We want to stop assuming that local rehearsal proved how things behave on a real host.
how: A 'cannot be proven here' list: off-site store, certificates, hosted CPU speed, alerts, second-host restore, second maintainer, each tied to a closing drill.
where it stands: Designed as a list only; none of it has run on a real host. No real-host measurement exists; only desk evidence such as a hosting cost estimate read on 5 November.

### REL-11 (idea, theme REL, Designed)
name: Local Android compile gate (L2)
problem it is meant to solve: No check catches native Android compile breaks, because the JavaScript-only export misses them and an EAS build queue is slow.
how: Docker container with JDK 17 [S] and Android SDK copies the app in, runs prebuild there (never in the repo), builds a release.
where it stands: Designed in ship plan section 7.5; the lane is running as PR #188. Not yet tested. It will also answer whether the background-geolocation library builds on SDK 52 / RN 0.76.9.

### REL-12 (idea, theme REL, Designed)
name: L3 device lab on a native emulator
problem it is meant to solve: Drain logic and field-reliability steps meet a real phone with real data without any earlier rehearsal, and Docker has no /dev/kvm to run an emulator.
how: A native emulator (Windows Hypervisor Platform) runs three scripted protocols: drain rehearsal, adb field steps, offline matrix. Lab builds cannot reach a real server.
where it stands: Designed; L3a started 13 November, stacked on L2. The emulator boots on this PC with the lab app installed. No check run yet; each must be shown failing once.

### REL-13 (idea, theme REL, Designed)
name: L4 deploy-train and restore rehearsal
problem it is meant to solve: Behaviour-changing PRs deploy together at P4c, and the first run of an untried sequence would be on the restored production data.
how: Per behaviour-changing PR: restore newest dump into Postgres 17 [S], run start.sh migrations to the new head, run its post-deploy check, log a rehearsal row.
where it stands: Designed in ship plan section 7.5 (wave C); not started, not yet tested. The plan's claim is that P4c then replays a sequence already tried.

### REL-14 (idea, theme REL, Designed)
name: Device evidence across phone brands before reliability claims
problem it is meant to solve: One phone can tell hypotheses apart but cannot validate a fix across the phone brands our fleet uses.
how: Any geofencing reliability claim requires device evidence across the phone brands in the fleet; an adb-based field protocol separates the top hypotheses.
where it stands: Designed as a constraint on the phased plan; not yet tested. The field protocol itself is still to be produced, and I run it on devices.

### REL-15 (idea, theme REL, Designed)
name: Early performance and recovery proof
problem it is meant to solve: Production-readiness claims go unmeasured until the very end of a build, so we want proof early.
how: Small performance and recovery proof in early slices: p95 timing under load with optional parts off, slow or failed, plus an A/B/C form comparison.
where it stands: Designed from an AI red-team review of the clinic guide; untested. Proposed gates: posting p95 under 1 s [T], list and report pages under 2 s [T], memory under 3.2 GB [T] of 4 GB [S].

### OWN-01 (idea, theme OWN, In use)
name: One-page view for me beside agent packets
problem it is meant to solve: I cannot see program progress without reading the whole plan, and agents need small task-specific context rather than my page.
how: One page with a diagram, derived from the plan and refreshed at each phase close, beside small task-specific packets for agents.
where it stands: In use in the clinic testbed: AGENTS.md is 10,698 bytes [M] against a 6,709-byte baseline [M], with no productivity or token saving shown. Adopted for FixFlow as OWNER-VIEW.md, not yet tested.

### OWN-02 (idea, theme OWN, In use)
name: Decision cards D01 to D23 for me
problem it is meant to solve: I need to see exactly what I must decide, by when, and which way the design leans, without reading the whole design.
how: Each of 23 cards shows options, the design's lean in bold, bottlenecks touched and my answer; only six are needed to start.
where it stands: In harness v2 design: D01 to D06 were answered on 11 Nov (phase 1 yes, encrypted drive, logger allowed, resume list); D07 to D23 are still open.

### OWN-03 (idea, theme OWN, In use)
name: Numbered decision form for me, issued at a gate
problem it is meant to solve: Design agents on Odoo and self-hosting cannot be right without my answers, and spending Opus before I answer is spending on a guess.
how: At gate G1 each design task gets a numbered question form; my answers become parameters, not assumptions. Tasks O-07 and O-08 wait on them.
where it stands: In use: issued at G1 as two forms, Odoo and self-host. My answers are still pending, so the forms have not yet fed a design.

### OWN-04 (idea, theme OWN, In use)
name: W0-results.md as the single working board
problem it is meant to solve: The coordinator and I need one compiled place to see what is done, what is open and who is doing what.
how: One file holds P0a steps, my decisions with defaults, deploy train, lane board and notes. Unknowns are written 'unknown, because ...', never 0.
where it stands: In use in FixFlow: on 2026-11-13 the lane board had 10 rows [M], recording 8 running lanes [M] and 2 done phases [M].

### OWN-05 (idea, theme OWN, In use)
name: I delegate merges and phase starts to the coordinator
problem it is meant to solve: Waiting for me to approve every merge and next-slice start would slow a parallel program and stall work while I am away.
how: Coordinator squash-merges when CI is green, its binding review passed that commit, no hold applies and the predecessor is merged. Merging deploys nothing.
where it stands: In use in the clinic testbed, without numbers; a usage limit plus the start-on-my-turn rule halted work for three days [M]. FixFlow: recorded, no PR merged under it yet.

### OWN-06 (idea, theme OWN, In use)
name: I review design and plan; models check research
problem it is meant to solve: My reading time is limited, so I spend it where a mistake costs most.
how: My effort goes to plan critiques, the decisions journal and OWNER-VIEW.md; Sonnet citation checks and capped Opus refuters check research output.
where it stands: Already in use. The 3x multipliers in the source are asserted, not measured.

### OWN-07 (idea, theme OWN, In use)
name: Design answers in a flat file, not ask-question tool
problem it is meant to solve: Transient prompts lose design decisions and cannot point at code.
how: Answer design questions in a file. Our PR-body journal and my critique sections already do this.
where it stands: Already in use: it is the harness's habit through the PR-body journal and the sections for my critique.

### OWN-08 (idea, theme OWN, In use)
name: Archiving and progress-visibility rules
problem it is meant to solve: I rely on one large board file, and sessions pile up with no live view of their status.
how: The root archives nothing without my word. Each slice gets a board row, and a task file holds status and next action.
where it stands: In use in the clinic testbed: the board is 219,111 bytes [M] at sweep time with 19 worktrees [M]; no live status mechanism was found.

### OWN-09 (idea, theme OWN, In use)
name: Wrap-up called by me, carried P3 tables, pilot backlog
problem it is meant to solve: We want review rounds that end, and low-severity findings kept visible without blocking the release.
how: Gate tables end with 'Remainders carried' and owners. On 10 Nov I ordered wrap-up: five branches merged, the rest into a pilot backlog.
where it stands: In use in the clinic testbed: 111 P3 findings returned in round 1 [M]; five branches merged, 7/7 checks, 2520 tests in 726 s [M], 0 skipped [M]. No stop rule written.

### OWN-10 (idea, theme OWN, Built)
name: My P0a pre-flight kit
problem it is meant to solve: My P0a was the critical path and nothing could reach a phone or host without it; the steps were scattered and risky.
how: Five Git Bash scripts I run in order; each has --dry-run, writes outside the repo, reads keys from the environment, never opens the app.
where it stands: Built: self-tested on an empty stand-in database, which produced a 131 KB dump [M]. I have not run it on real data, so real items are unknown.

### OWN-11 (idea, theme OWN, Built)
name: Fleet hold notice to technicians
problem it is meant to solve: Technicians opening the app, tapping Discard or uninstalling could destroy records that have not synced and are the only copy.
how: A notice in English, Urdu and Roman Urdu: do not open the app, clock in, start travel, discard, update, uninstall, clear data or reset.
where it stands: Built: the notice is drafted but not yet sent. The kit's scripts only read from phones and never open the app. Not yet tested.

### OWN-12 (idea, theme OWN, Built)
name: Six interactive demos on my harness v2 page
problem it is meant to solve: I read mechanisms better by moving sliders than by reading prose.
how: Six demos on my harness v2 page: power-off, check queue, fix round, merge nobody read, where tokens went, root as only gate.
where it stands: Built in my harness v2 page. Each demo explains a mechanism and lists its assumptions; none is a result.

### OWN-13 (idea, theme OWN, Designed)
name: My W0 pre-flight before agents spend tokens
problem it is meant to solve: Agents cannot learn facts only I can see (dashboards, devices, billing), and spending tokens on guesses uses our limited usage on unchecked inputs.
how: A short checklist for me (fleet notice, hostname control, APK signing, service status, workshop coordinates, Docker started) runs first; its outputs decide the G1 branch.
where it stands: Designed in the orchestration design: a ten-item checklist of about 30 minutes [E] that runs before any agent spends tokens. Not yet tested; later carried into FixFlow's P0a kit.

### OWN-14 (idea, theme OWN, Designed)
name: Six-question phase-closing message
problem it is meant to solve: I need a consistent, short account of what each phase did and what remains.
how: At phase close the message answers six questions: goal, fit, choice, before and after, evidence including skipped counts, and remaining work.
where it stands: Adopted as a message format, not a file. Not yet tested.

### OWN-15 (idea, theme OWN, Designed)
name: Report tokens only, lead with the mechanism
problem it is meant to solve: A repo-comparison page and dollar figures were a tangent from what I asked.
how: Answer a which-or-why spend question with the ranked mechanism and one table. Report in tokens, with no dollars and no comparison framing.
where it stands: Adopted and applied: the dollar figures were removed from the token record after my feedback on 2026-11-12.

### OWN-16 (idea, theme OWN, Designed)
name: Standing rules: ship plan first, my yes for outside actions
problem it is meant to solve: Harness work could delay FixFlow or take shared limits without my consent.
how: FixFlow P0a goes first. No hooks, installs, scheduled tasks, permission changes or outbound data without my decision; no harness agents during a FixFlow phase.
where it stands: Adopted as a standing rule in the harness v2 design. No number or result attached.

### OWN-17 (idea, theme OWN, Idea)
name: My one-off watch of P1
problem it is meant to solve: Live watching might catch costly departures earlier than a transcript audit afterward.
how: I watch P1 through its first code commit and log departures without interrupting; a fresh agent then audits the transcript against a fixed list.
where it stands: Trial on P1 only; kept only if it catches something the audit would find late. Not yet tested.

### OWN-18 (idea, theme OWN, Idea)
name: Rough HTML mockup before new-screen phases
problem it is meant to solve: A copy or state mistake on a new mobile screen costs a whole new fleet APK build and is found only after implementation.
how: Sonnet produces one rough HTML mockup of the screen's states and exact copy, written into the brief; I glance at it without blocking.
where it stands: Trial on four new-screen phases (P2b-1, P5b-1, P9b, P10a); not a skill or rule, and not for P12a or P12. Not yet tested.

### OWN-19 (idea, theme OWN, Idea)
name: Context-system line moves to its own repository
problem it is meant to solve: Experimental memory tooling should stay off the product's routes and out of its history; it now sits untracked in a repository with no remote.
how: I decided on 1 Nov 2026 that the line continues in its own repository at low priority; until moved it stays untracked.
where it stands: Decided, not yet done: the move needs my folder name. Measurement research does not start unless I ask.

### OWN-20 (idea, theme OWN, Parked)
name: Hold design docs to a stricter reading standard
problem it is meant to solve: Design docs can pile up faster than anyone reads them; reading capacity, not writing, becomes the limit.
how: Require that a design doc is actually read before it ships.
where it stands: Parked: my critique rounds are already the read gate, so no change was proposed. Not tested.

