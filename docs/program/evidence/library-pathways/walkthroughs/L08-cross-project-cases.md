# L08 Cross-project knowledge cases (FixFlow and the clinic build)

Searched: both repos' git logs and docs, the memory folders of both projects (and the OneDrive clinic slug), the transcripts of the clinic root session 7f348b2c and of FixFlow sessions, the bottleneck compile and its evidence. Scanner: scratchpad/sim/scan.js. Facts only. Dates are 2026.

T = C:/Users/User/.claude/projects/. C = C--Bilal-Migration-User-Downloads-20-PROJECTS-24-Clinic-Workshop (clinic slug). F = C--Users-User-Documents-projects-EMS-workshop1 (FixFlow slug).

## Case 1. Windows "Filename too long" on git clone: found twice, 27 hours apart, no copy between projects

What happened. Nov 3 04:04Z the clinic session dfe1ea6e ran a second-maintainer rehearsal (fresh clone into a long scratchpad path). It failed and the guide was changed to use `-c core.longpaths=true`. The S01 rehearsal the same day found that longpaths fixes only git: a 208-character root installed but `migrate` failed on a DLL load; a 42-character root passed. That went into the clinic development guide. Nov 4 07:01Z a FixFlow worktree session (c1797e48) cloned upstream skill repos into its scratchpad and hit the same error on 15 of 15 clones. It fixed its script and wrote a FixFlow memory note at 07:09Z. The note has only the git half. No FixFlow record cites the clinic fix.

Evidence.
- Clinic: T/C/dfe1ea6e-b06f-4ac7-a61c-8703117bea16.jsonl line 697 (2026-11-03T04:04:15Z): "fatal: cannot create directory at 'output/coding-workflow/WF-02/agent-artifacts/baseline/phase-0/docs/tasks/agent-trial/evidence': Filename too long".
- Clinic guide, docs/application/development-guide.md line 28: "core.longpaths fixes only Git, and Windows refuses to load DLLs from paths longer than about 260 characters ... `migrate` failed with `Error loading psycopg2 or psycopg module` (underneath: `DLL load failed while importing pq: The filename or extension is too long`); the same clone at a 42-character root passed."
- FixFlow: T/F--claude-worktrees-wizardly-hertz-02c46a/c1797e48-a50d-4211-bcb0-c92d7dca8e04.jsonl line 227 (2026-11-04T07:01:25Z): "error: unable to open loose object 41a0e66d4d09de5b46e6537f59a97c7192473486: Filename too long". Line 244 is the sed fix to `git -c core.longpaths=true clone`.
- FixFlow memory file project-windows-git-longpaths.md: "(seen 2026-11-04, 15 of 15 clones)".

Sources. The files above; clinic repo commit 32dea29 (2026-11-03) "Record S00 as verified with the second-maintainer rehearsal".

On arrival. It arrived as a fresh failure, not as knowledge. Inside FixFlow the new note did travel: sibling sessions started at 07:17:05Z and 07:17:35Z (harness-ideas-horthy 9c3f9742 and harness-ideas-baml 6fc590cb, line 16 of each) had the MEMORY.md line "Windows git long paths" in their window at start. That is within-project travel and it worked.

Later moment. The DLL half (clinic S01 rehearsal) is what any FixFlow run of native code from a long-path clone would need. The FixFlow note says only "use git -c core.longpaths=true per command" and has no short-root rule. No FixFlow failure of the DLL kind is in the record. This is a gap in what arrived, not an observed failure.

## Case 2. "Subagents cannot write files": a hedged clinic lesson became a flat platform rule in FixFlow, then was overturned

What happened. Nov 1 two Opus subagents in a clinic session (cb58bdc7) reported that the harness blocked their report writes. The clinic root saved a memory note that itself hedged ("Sonnet extractors did manage to write files earlier"). On Nov 11 the owner pasted the root's list of unsolved bottlenecks into the FixFlow session as B16. A probe in the FixFlow session showed it was not a platform limit.

Evidence.
- Clinic memory subagents-return-text-not-files.md (modified 2026-11-01T16:52Z): "both Opus analysts on 2026-11-01 reported 'the harness blocks subagents from writing report files' ... so the refusal may depend on the agent type or output size".
- FixFlow docs/program/evidence/harness-bottlenecks/bottlenecks.md line 28: "B16 Subagents cannot write files. Their long reports come back through the orchestrator's context."
- docs/program/HARNESS-BOTTLENECKS-2026-11.md line 23: "B16: subagents cannot write files | They can. A background subagent wrote and read back a file here with no prompt. Read-only agent types, a tools list without Write, or an unanswered prompt in default mode cause the refusal." Line 49: "The rule came from two agents' unchecked report, which makes it an instance of B12." Line 323: "The bottleneck list itself carried five facts that §1 overturned."
- evidence/harness-bottlenecks/machine-facts.md, section B16: "a background workflow subagent wrote and read back a file with no permission prompt".

Sources. The files above. The clinic memory file is under C:/Users/User/.claude/projects/C--Bilal-Migration-User-Downloads-20-PROJECTS-24-Clinic-Workshop/memory/.

On arrival. The qualified note became an unqualified bullet in the owner's paste. The FixFlow side spent a probe and a research lane correcting it and wrote a rule that an environment fact is checked by one command before it becomes a harness rule (compile line 368).

Later moment. The same compile (line 159) builds a remedy on the corrected fact: agents write full reports to a folder and return a path. The uncorrected version would have driven the opposite design.

## Case 3. The orchestration design: pasted FixFlow to clinic and extended; the "inherits the tier" trap was in the paste but re-learned for sessions

What happened. Nov 1 07:21Z the owner opened the clinic root session (7f348b2c) by pasting the FixFlow v3 orchestration design and asking that Fable max effort not be used on cheap tasks. The clinic adopted it on Nov 2 as docs/agentic-coding/orchestration.md, which names the FixFlow design as its reference. The pasted text already said fixflow-explorer is pinned to Haiku because the built-in Explore agent inherits the session tier. On Nov 2 an S00 build session was started without a model, inherited Fable at max, was rejected by the owner and restarted on Opus. The clinic also learned two things FixFlow's design does not hold: start_session is refused on an automated turn (parked starts) and two sessions running a check collide on one test database name.

Evidence.
- T/C/7f348b2c-75ba-41bd-8132-d395ef24a5f6.jsonl line 1 (2026-11-01T07:21:09Z): the paste ends "...fixflow-explorer pinned to Haiku because the built-in Explore inherits the session tier.>> the context is from a different project but the principles make sense ... you dont ram fable max effort into tasks that would have had equal equality output with haiku or sonnet".
- Same file line 1018 (2026-11-02T17:05Z), memory write: "always pass `model` and `effort` explicitly (an omitted model inherits the main session's Fable at max, which the user rejected on 2026-11-02 when an S00 build session started that way and had to be stopped and restarted on Opus/high)".
- Clinic commit 5816c70 (2026-11-02) "Adopt the orchestration rules and wave board for the clinic build"; docs/agentic-coding/orchestration.md line 77: "Reference: the owner's FixFlow orchestration design, whose tier guide and script contract this page adapts."
- FixFlow commit 53f3a5c (2026-10-31) "docs: orchestration design for the ship-to-client program (v3) + Haiku explorer agent"; .claude/agents/fixflow-explorer.md has `model: haiku`.
- Clinic memory fixflow-orchestration-reference.md: "They pasted it into the clinic session on 2026-11-01 as the model for tiering, not as clinic requirements."

On arrival. The idea travelled by paste and was extended into a session tree, gates and task records. The pin covered built-in subagents; the same trap for started sessions was not in the paste and cost a restarted session.

Later moment. On Nov 11 the FixFlow compile mapped the clinic's version back (HARNESS-BOTTLENECKS-2026-11.md line 108: "Four tiers with model and effort stated on every start (A1-01)"; "The root's lesson memory: 15 files written after failures (CR-01)"). Card CR-02 in evidence/harness-bottlenecks/sweep-cards.txt rates the parked-start workaround "Directly reusable on the same desktop app for FixFlow ship phases". Whether a FixFlow session has used it is not in the record.

## Case 4. Use a Linux container when a tool breaks on Windows: clinic decision Nov 6, owner repeats it to a FixFlow session Nov 12

What happened. Nov 6 the clinic root measured the Windows check as latency-bound and the owner chose a Linux test container beside the database (USER-23). Linux ran 230 s against 367 s native. By Nov 11 this result sat in the FixFlow compile. On Nov 12 a FixFlow session (0bf1c4f3) testing a graph engine found the engine's algorithm extension would not load on Windows. It planned to compute ranking outside the engine and record the gap. The owner told it to run a Linux machine instead.

Evidence.
- Clinic memory use-the-machine-parallelism.md (2026-11-06): "tests go to a Linux container beside the database (USER-23, 2026-11-06)"; "0.63 ms against about 0.13 ms inside the container".
- HARNESS-BOTTLENECKS-2026-11.md line 65: "Linux container beside the database, 12 workers ... 230.1 s mean against 367.2 s native ... built, optional, not the gate".
- T/F/0bf1c4f3-76dc-4144-995c-2af5a213db41.jsonl line 70 (2026-11-12T10:03Z): "LadybugDB 0.22.3 from npm runs its core but its `algo` extension cannot load (needs arrow.dll, networkit_state.dll, two OpenSSL DLLs)".
- Same file line 386 (12:49Z), memory text quoting the owner: "if they dont work on windows run a linux machiune we have the resources why are you compromising instead of fixing problems thatll ruin the experiment".
- FixFlow memory feedback-test-the-best-form.md: "On this PC that means a Linux container (Docker Desktop with WSL2 is installed; it is not running by default)".

On arrival. The fact was in a FixFlow document the day before but did not shape the session's plan; the owner supplied it again. The Oct 31 FixFlow design had said "Docker engine down", an older belief that the engine was unavailable.

Later moment. Line 70 shows the Linux route then worked (it needed libssl3, libgomp1, Arrow 26, icebug). No later tool with a Windows DLL gap is in the record yet.
