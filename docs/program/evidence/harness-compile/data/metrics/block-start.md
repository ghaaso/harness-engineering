# Dossier: block "start" (mechanisms: fixed_start, model_tier)

8 bottlenecks and 30 ideas. Numbers carry tags: [M] measured, [E] estimated, [G] guess, [S] setting or outside figure, [T] target, [I] illustrative.

## Bottlenecks

### TK-PREFIX · Fixed start-up cost per agent
family tokens; state: Open: measured; trial not run; inline commands mitigate; package WP5; metrics: token_count, token_cost, efficiency (primary token_count)
what: Every agent window first loads a fixed prefix (system prompt, tool and connector schemas, skills, memory, CLAUDE.md, brief) and re-reads it every call. Token lever 2.
evidence: About 70k [M] per agent: tools 34k, connectors 17k, skills 9k, system 8k, memory 2k [M]. The prefix is 27 % [E] of all tokens, 47 % [E] of FixFlow's.
what fixing it unlocks: Deferred schemas, fewer connectors and no skills in agent sessions remove most of it, per the token report; fewer tiny fan-outs multiply it less.
first step: Trial agents with deferred schemas, no connectors and no skills; compare per-agent prefix tokens before and after.

### TK-HAIKUCLIFF · Haiku price cliff above 100k input
family tokens; state: Partly closed: mitigated by splitting large dumps; package WP5; metrics: token_cost (primary token_cost)
what: Haiku loses its price advantage once a prompt passes about 100k input tokens, so a cheap extractor can quietly become an expensive one.
evidence: Threshold about 100k [S] input tokens, per the orchestration design; our extractor prompt sizes are not tallied.
what fixing it unlocks: Cheap extractor agents stay cheap.
first step: Check extractor prompt sizes in recent workflows; split any dump above about 100k [S].

### TK-TIER · Built-in agents inherit the expensive model
family tokens; state: Partly closed: pinned agents on PR #185; savings unmeasured; package WP10b; metrics: token_cost (primary token_cost)
what: The built-in Explore agent runs on the session's model, so a cheap lookup can bill at the top tier unless each agent file pins its tier.
evidence: Not measured. The orchestration design records the inheritance; our fixflow-explorer agent is pinned to Haiku.
what fixing it unlocks: A tier pinned per role (Haiku locator, Sonnet gates, Opus refuters) runs each job at its cheapest fitting tier.
first step: Use the pinned agents in one workflow and compare token use with the built-in agent.

### TK-CACHEBREAK · Pushed context breaks the prompt cache
family tokens; state: Partly closed: pull-only rule defined in the designs; package WP5; metrics: token_cost, token_count (primary token_cost)
what: Putting graph or memory output into the system prompt or CLAUDE.md changes every window's start, so each commit invalidates the cached start of all of them.
evidence: Not measured; identified in the graph build (2026-11-12) as a design hazard.
what fixing it unlocks: Pull-only tool results keep the prompt cache intact as we add retrieval.
first step: Adopt the pull-only rule in every retrieval design and agent brief.

### L1 · Verifier effort level chosen without evidence
family tokens; state: Open: trial designed; none run; package WP5; metrics: token_cost, quality, token_count (primary token_cost)
what: Most verifiers run at xhigh effort, set without paired evidence. Horthy's October 2026 SlopCodeBench report says medium often matched or beat xhigh at lower cost.
evidence: Outside data is one run per setting: medium 28 vs xhigh 25 of 196 [S] strict passes. 87 idea families and 224 cards [M] bear on it.
what fixing it unlocks: Cheaper verifiers at equal quality if medium matches xhigh; the trial's bar is at most 0.6x [T] the incumbent's tokens.
first step: Run at least 30 blind paired medium-vs-xhigh shadows on the same build, pass rule per model id.

### W1 · CLAUDE.md is too long
family tokens; state: Open: trim gated behind the knowledge-store pilot; package WP5; metrics: token_count, quality, efficiency (primary token_count)
what: CLAUDE.md is the only guaranteed way an agent sees a lesson, and every agent pays for it every call; at 390 lines it is nearly twice the adherence limit.
evidence: 390 lines [M] against about 200 [S] where adherence falls. About 7.5k [E] tokens per agent (designs), or about 10k [E] (Horthy sweep). 150 families, 313 cards [M].
what fixing it unlocks: Higher rule adherence without dropping any rule, and a shorter file once diagnostic stories move into the knowledge store.
first step: Run the E1 adherence probes: a split against the full CLAUDE.md on a frozen commit.

### LIB-S8 · Step 8: failure and the escalation ladder
family library; state: Open: mapped and weighed; no fix agreed; package WP6a; metrics: quality, token_cost (primary quality)
what: Higher tiers lack the missing fact too, a higher tier was often not who caught the error, trade-offs between lessons end with me, and handoffs pollute windows.
evidence: Alone -3.6 % [G], last 8.8 % [G]; 7 [M] limitations; 21 [M] chosen cases break here and 23 [M] never reach it.
what fixing it unlocks: Up to 8.8 % [G]; most of its effect acts through the shared gate and ladder unknowns.
first step: Agree the limitation list with me first; no fix is chosen yet.

### LIB-PRICE · Opus price ratio is uncertain
family library; state: Open: model draws the ratio between 1 and 2; package WP6a; metrics: token_cost (primary token_cost)
what: The price list says Opus costs 2x [S] per token, but per call Opus read about half the cached tokens Sonnet did, so the per-call ratio may be nearer 1.
evidence: Opus about 222,000 [M] cached tokens per call vs Sonnet about 440,000 [M]. Cost against the strong model: 0.89 [G] at ratio 2, 1.23 [G] at ratio 1.
what fixing it unlocks: Settling the ratio decides whether the library beats the strong model on cost at all.
first step: Measure cost per finished task by model on matched work, not cost per token.

## Ideas (most mature first)

### REV-21 · Sonnet builds, Opus reviews
stage: In use; package WP10a; metrics: quality, token_cost (primary quality); answers: LIB-S7
problem: We hoped Sonnet at lower effort could match Opus through cached reasoning, but on judgment-heavy work the quality came from review.
how: The cheaper model builds and the stronger model reviews. Available today with no library.
where it stands: In use: an Opus reviewer found a serious defect in 9 of 14 [M] Opus-built clinic slices. Our tests resolve only ±11 to 14 points [E], wider than the 2 to 8 point [M] tier gap.
next: Keep using it.
origin: Library review

### TOK-04 · Run small tasks inline before spawning agents
stage: In use; package WP5; metrics: efficiency, token_count, token_cost (primary efficiency); answers: TK-PREFIX
problem: Every subagent pays about 7.5k [E] tokens of project instructions before working, so tiny tasks and per-claim agents cost more than they return.
how: Counts, greps, hashes and git logs run inline and pass to agents as arguments; claims batch per verifier; discovery agents return facts, not verdicts.
where it stands: In use in the clinic testbed (cap sizes never quantified) and applied in the orchestration design v2. The overhead figure is approximate; no token figures yet.
next: Measure per-agent prefix tokens in the first run; run the pre-flight once Docker Desktop is started.
origin: Orchestration design; Clinic testbed

### MTH-08 · Model tiers by role, raise effort before tier
stage: In use; package WP10a; metrics: token_cost, quality (primary token_cost); answers: TK-TIER, L1
problem: Model choice is our main cost lever. We want the strongest model only where mistakes are expensive, and no agent at an unchosen strength.
how: Haiku extracts; Sonnet maps and runs gates; Opus analyses, refutes; the main session judges. Name model and effort each start; raise effort before tier.
where it stands: Used in FixFlow and the whole clinic build; 12 [M] agent definitions built: 6 Opus and 5 Sonnet on PR #185, and the Haiku explorer. Tiering has no cost measurement yet; every clinic slice needed 2-4 [M] review rounds.
next: Record actual spend per tier against the design's cost envelope so the split can be tested.
origin: Orchestration design; Clinic testbed; Skills packages

### MTH-15 · Same-tier retry; only infrastructure changes tier
stage: In use; package WP10a; metrics: token_cost, quality (primary token_cost); answers: -
problem: Silently escalating to a stronger model after a schema failure hides cost and masks a defect in the brief.
how: Structured-output retries stay inside the same subagent; scripts retry at the tail with the same task and model.
where it stands: In use by construction: retries already stay on the same model, so the rule holds today. A design rule could state it.
next: Optionally write the rule into the orchestration design.
origin: BAML sweep, after Pydantic AI and DSPy

### TOK-09 · Route by model tier, window and price
stage: Tested; package WP5; metrics: token_cost, token_count (primary token_cost); answers: TK-REREAD, R2
problem: A cheaper model with a bigger window can cost more tokens through larger re-read contexts, and routing alone does not cut the token count.
how: Pick the model by window size as well as by its token rate; spend Opus at xhigh only where evidence is thin; verify only where it moves a decision.
where it stands: Measured: Opus 65% [M] of calls and 52% [M] of tokens; Fable 6.5% [M] and 16% [M]; Sonnet 28% [M] and 32% [M]. Routing changes the rate, not the count.
next: Keep routing for quality and rate; weigh window size with the compaction trial; review after W2 spend.
origin: Token report; Harness v2 design; Orchestration design

### TOK-10 · Compact context packet for fresh agents
stage: Tested; package WP5; metrics: token_count, time (primary token_count); answers: TK-PREFIX, TK-FETCHED
problem: We hand fresh agents large documents and want to know whether a smaller, fact-checked packet gives the same result with fewer bytes and faster work.
how: Freeze the required facts, build a smaller packet, count bytes at delivery including preparation, and require that a deliberately removed fact is rejected.
where it stands: Clinic testbed, small synthetic cases: bytes 10,010 to 7,947 [M], 20.6% fewer [M], 24 of 24 facts kept [M]; same acceptance, 193.1 vs 194.7 min [M]; no gain shown.
next: Reuse the method only: freeze facts, count bytes including preparation, reject any lost fact.
origin: Clinic testbed

### MSR-08 · Fixed context overhead measurement
stage: Tested; package WP5; metrics: token_count, token_cost (primary token_count); answers: TK-PREFIX
problem: Every session or subagent carries tokens before doing any work, and we did not know how large that fixed start is.
how: A usage tool breaks down each agent's overhead (tools, MCP, skills, system prompt, memory); a script measures how documentation grows.
where it stands: Measured in the October testbed: about 70k [M] tokens before work (system tools 33,968, MCP 16,599, skills 9,059 [M]). Docs about 338,816 tokens [E].
next: Trim MCP servers and skills in agent sessions; keep the routed pre-read small.
origin: Clinic testbed

### SKL-06 · Turn sourced skills into pinned project agents
stage: Built; package WP10b; metrics: token_cost, quality (primary token_cost); answers: W4, TK-TIER
problem: Our subagents lack domain knowledge (Android background work, Odoo, recovery, security review), and outside skills must reach them at the right price tier without manual loading.
how: Each sourced skill is distilled into a .claude/agents file with prompt, tool list and pinned model; workflows and sessions call it by agent type.
where it stands: Built: applied to 11 agent definitions [M] in PR #185, merged on 13 Nov. Not yet run, so no results. The design notes Haiku could take extractors, scans and table generation.
next: Call the agents from workflows and measure; source the four priority-1 skills.
origin: Orchestration design; Skills packages

### SKL-07 · Agent file: pinned model, tools, preloaded skill
stage: Built; package WP10b; metrics: token_cost, quality (primary token_cost); answers: TK-TIER
problem: A subagent inherits the session's model and loads nothing unless told, so its role, price tier and tool access need to be fixed in one file.
how: Frontmatter sets name, tools, model (haiku, sonnet or opus), skills and effort; the body is a read-only-unless-told, cite-everything prompt naming a return schema.
where it stands: Built: 11 fixflow agent definitions [M] in PR #185, merged on 13 Nov, plus the older Haiku explorer already in the repository (12 in all); fields checked against the Claude Code docs on 2026-11-03. Not yet run.
next: Call the agents from a workflow and measure.
origin: Skills packages; Claude Code subagent feature

### SKL-13 · Read the skill first, even when preloaded
stage: Built; package WP10b; metrics: quality, hallucination (primary quality); answers: W4
problem: A host that does not preload skills would leave the agent without its rules, so the agent must fetch them itself.
how: Every agent body opens with an instruction to read its SKILL.md and references first, even though the skills field already preloads it.
where it stands: Built: present in every agent definition read (PR #185, merged on 13 Nov). Not yet tested. CLAUDE.md loads into custom subagents by default.
next: Check it holds when the agents first run.
origin: Skills packages

### SKL-15 · fixflow-explorer Haiku-pinned locator agent
stage: Built; package WP10b; metrics: token_cost, token_count (primary token_cost); answers: TK-TIER, TK-LOOKUP
problem: The built-in Explore agent inherits the session's model (Opus here), so a simple where-is-X lookup runs on our most expensive tier.
how: A read-only agent pinned to Haiku greps first, reads at most 40 lines [S], and reports path and line for each match, with no verdicts.
where it stands: Built: the agent file exists in the repo and predates PR #185. Not yet tested; no usage or cost figures.
next: Measure its cost against the built-in Explore agent.
origin: Orchestration design; Skills packages

### TOK-21 · Keep Haiku prompts under about 100k tokens
stage: Designed; package WP5; metrics: token_cost (primary token_cost); answers: TK-HAIKUCLIFF
problem: Past a certain input size Haiku's price steps up, which removes its cost advantage on large dumps.
how: Keep each Haiku extraction prompt under about 100k [S] input tokens and split large dumps; use Haiku only for literal extraction into typed schemas.
where it stands: Designed as a rule in the orchestration design's tier table; not yet tested.
next: Check the three Haiku extraction prompt sizes against the limit.
origin: Orchestration design

### TOK-22 · Net-zero CLAUDE.md edit, then trim
stage: Designed; package WP5; metrics: token_count, hallucination (primary token_count); answers: W1, TK-BUDGET
problem: CLAUDE.md is loaded by every agent every session and must stay honest, yet the knowledge store adds a runtime that CLAUDE.md's own rule says to document.
how: Rewrite CI row in place, adding no line; after the pilot, keep each rule sentence plus a store id and move diagnostics to entries.
where it stands: Designed in the knowledge-store design; not run. Trim waits for a pilot go, one verified entry at a time. Line counts before and after go in the trim's PR body.
next: Make the net-zero edit now; the trim waits for the pilot (decision KS-D11).
origin: Knowledge-store design

### TOK-23 · Strip fixed prefix with a short tool list
stage: Designed; package WP5; metrics: token_count, token_cost (primary token_count); answers: TK-PREFIX, TK-REREAD
problem: Every agent pays about 70,000 tokens [M] before any work, re-read on every call; fan-out multiplies this prefix, not the work.
how: Short tool list that always keeps Write, deferred tool schemas, fewer connectors and no skills for gate agents; adopt only after a with-and-without test.
where it stands: Designed in harness v2 phase 5; not run. Tool definitions are 34k [M] of the 70,000 [M] each agent pays. Pass bar: 20 runs [T], zero refused writes.
next: Take one context reading with and without the list, then run a sample of agents and tally prefix tokens.
origin: Harness v2 design; Dex Horthy sweep; Token report

### MEM-27 · Pull-only lookup, nothing pushed or hooked
stage: Designed; package WP6b; metrics: token_count, efficiency (primary token_count); answers: TK-CACHEBREAK, LIB-S2
problem: A layer that pushes extra context into every turn showed no measurable gain in the clinic testbed and costs tokens on every call.
how: Agents run the lookup on demand; nothing is pushed or hooked. The recurrence audit and my yes come first, then a pilot (kill criterion).
where it stands: Designed; not tested for the store itself. Clinic synthetic trials showed identical acceptance with and without a context projection [M]; that evidence concerns always-loaded files, not a lookup hook.
next: Measure through the prospective log at phase KS-9; an edit-time hook (KS-D21) stays off by default.
origin: Clinic testbed; Knowledge-store design

### RET-24 · Pull graph output, never push; build per worktree
stage: Designed; package WP7; metrics: token_cost, token_count, quality (primary token_cost); answers: TK-CACHEBREAK
problem: We want to stop a graph or memory layer from breaking the cached start of every window or describing the wrong working tree.
how: Return graph output only as a tool result, never in the system prompt or CLAUDE.md; build the graph per worktree at query time.
where it stands: Designed as a rule for any future retrieval build; not itself built or tested. Agents work in five [M] worktrees with uncommitted files, so a shared graph would mislead.
next: Write into the design of any retrieval tool we build.
origin: Bottleneck compile; cache findings

### MTH-25 · Knowledge-store log and CLAUDE.md trim
stage: Designed; package WP6b; metrics: token_count, efficiency (primary token_count); answers: W1, W2
problem: A store nobody consults helps nothing, and the always-loaded CLAUDE.md file stays long.
how: A prospective log with a checkpoint date in the OWNER-VIEW page, and a CLAUDE.md PR that swaps verified narratives for one-line rules.
where it stands: Designed in the knowledge-store design, conditional on a pilot go; not applied and not yet tested. Under go-minimal only declarative entries are wired in and trimmed.
next: Run it as the wire-in step after the pilot, once decisions KS-D10 and KS-D11 are ruled.
origin: Knowledge-store design

### MTH-37 · Explicit effort on every reviewer and implementer launch
stage: Designed; package WP10a; metrics: token_cost, quality (primary token_cost); answers: L1
problem: An agent launched with no effort setting silently inherits the orchestrator's effort, so reviewers may run at the wrong level and cost more.
how: One line in section 0: launch reviewers and implementers with an effort from the plan, via a Workflow agent call, never an inheriting path.
where it stands: Listed as adopt, narrowed, though both reviewers scored it trial; not yet tested. Check over the first 3 phase PRs that every launch shows explicit effort [T].
next: Check whether the Agent tool or agent-definition settings accept an effort field.
origin: Dex Horthy sweep; Workflow docs

### MTH-39 · Escalation ladder: Sonnet, then Opus, then Fable
stage: Designed; package WP10a; metrics: token_cost, quality (primary token_cost); answers: LIB-S8, LIB-GATE, LIB-KS-RESOLVE
problem: I want the cheap model first, yet it will fail some hard work outright, and the average gap between tiers hides that hard tail.
how: Cheap model first; a caught failure gets one cheap retry, then Opus, then Fable. Solve once at the lowest capable tier and store it.
where it stands: Modelled on guessed inputs: at middle values 25.7 [G] cheap-call equivalents and 21.2 % [G] wrong per piece, against 29.9 [G] and 11.2 % [G] for the strong model alone.
next: No fix agreed yet; the gate and ladder are shared by all three ways of working, so report them separately.
origin: My idea; Library review

### TOK-31 · Trim skill and agent descriptions to 400 characters
stage: Idea; package WP5; metrics: token_count, token_cost (primary token_count); answers: W1, TK-PREFIX
problem: About 24k characters [E] of skill and agent descriptions load into every session's context, using tokens we want for work.
how: Trim each of the 13 skill and 11 agent descriptions to at most 400 characters [T]: key use case first, one do-not clause.
where it stands: Trial, not yet run. The disable-flag half was refuted because it blocks subagent preload. Target: combined skill and agent lines fall by at least 50% [T] with nothing mis-triggering.
next: Compare /context before and after in a fresh session, plus a routing check; an hour-long trial.
origin: Dex Horthy sweep

### TOK-32 · Shape CLAUDE.md and skill descriptions
stage: Idea; package WP5; metrics: token_count, quality (primary token_count); answers: W1
problem: FixFlow's CLAUDE.md and about 24k characters [E] of skill and agent descriptions may load more than needed or contradict each other.
how: Narrow triggers on conditional CLAUDE.md blocks; directory files for single-runtime rules; trimmed descriptions with a routing check; a contradiction sweep; model-change adherence tests.
where it stands: Trial, FixFlow only; not yet tested. The testbed's context trials were null, and no bottleneck is about the instructions file being missed.
next: Run the context-file experiment (E1) on FixFlow.
origin: Dex Horthy sweep

### MTH-66 · Fast mode for a fleet of subagents
stage: Idea · ADDED FROM CHAT: chat of 3 November (session 4f9060c4, lines 1076 and 1301); package WP10a; metrics: time, throughput, token_cost (primary time); answers: -
problem: A large fan-out takes long on the clock even when its token cost is accepted.
how: Switch the faster output mode on for the subagents of a large fan-out, so the run takes less time on the clock.
where it stands: Asked for on a run of 132 [M] agents on 3 November; fast mode was on for that session, and its effect on time and tokens was not measured.
next: Time one fan-out with it on and off, and note what it does to usage.
origin: My request in a chat of 3 November

### SKL-22 · Wrap conditional CLAUDE.md rules in 'important if'
stage: Idea; package WP5; metrics: quality (primary quality); answers: W1
problem: Long CLAUDE.md files get skimmed, and rules that matter only for certain tasks dilute the always-true ones.
how: Conditional rules sit in important-if tags, always-true content stays bare, in the wrapped arm of the CLAUDE.md trial (E1), plus 3 [S] oblique probes (which test a rule without naming it).
where it stands: Trial: only as one arm of E1; the technique alone fell to the ruling that keeps every rule. Horthy's adherence claims carry no measurements. Not yet run.
next: Run E1's wrapped arm with 10 direct and 3 oblique probes (which test a rule without naming it) [S]; compare pass rate with the bare file.
origin: Dex Horthy sweep

### SKL-23 · Split CLAUDE.md by runtime with nested files
stage: Idea; package WP5; metrics: token_count, quality (primary token_count); answers: W1, R2
problem: Our CLAUDE.md is 390 lines [M], about twice the length where adherence is said to fall, so every task pays for detail it may not need.
how: Move one-runtime material to backend and mobile CLAUDE.md files; keep cross-runtime rules and a pointer index in the root. Test briefs and diff-only reviewers too.
where it stands: Trial: a split arm of E1 on a branch. A nested file was seen attaching in a workflow subagent on Read here. Pass rate not yet compared.
next: Compare probe pass rate, split versus full, with the frozen probe set plus 3 oblique probes (which test a rule without naming it) [S].
origin: Dex Horthy sweep

### SKL-24 · One-off sweep for contradicting instructions
stage: Idea; package WP6c; metrics: quality, hallucination (primary quality); answers: PR-DOCDRIFT, W2
problem: Always-loaded instructions can contradict each other (CLAUDE.md points fresh sessions to the July handoff, not the ship plan), and fact-drift checks do not catch that.
how: One fresh Opus sweep after the skills land, over CLAUDE.md, memory, the ship plan, the orchestration design and each skill; a refuter checks hits.
where it stands: Trial: run once, no standing check. Each hit quotes both texts and the different action an agent would take. Not yet run.
next: Count refuter-confirmed contradictions and fix each at its source.
origin: Dex Horthy sweep

### MSR-34 · Medium-vs-xhigh effort trial, pass bar first
stage: Idea; package WP5; metrics: token_cost, quality (primary token_cost); answers: L1, L3
problem: Choosing a model effort for reviewers and verifiers is guesswork, and without a rule fixed in advance a comparison can be bent to its result.
how: Replay 12 [S] frozen verifier briefs at medium and xhigh, 3 times each, with an xhigh repeat as noise floor; write the pass bar first.
where it stands: Trial from the Dex Horthy sweep, one-off: 12 [S] briefs plus 5 [S] fixtures from closed defects, blind-graded. Not yet tested; the testbed has no effort benchmark.
next: Select 12 briefs and build 5 fixtures, once I decide that FixFlow should settle its effort choice this way.
origin: Dex Horthy sweep

### MSR-35 · Medium-effort verifiers via blind paired shadow runs
stage: Idea; package WP5; metrics: token_cost, quality (primary token_cost); answers: L1
problem: Most of our verifiers run at xhigh effort, which costs more, and one outside report says medium often matched or beat it.
how: A blind medium-effort shadow reruns each non-P0 verifier's brief; 30+ [T] pairs, pass bar set first, 3 repeats per arm, scored against final adjudication.
where it stands: Top trial 1 in the Dex Horthy sweep; not yet tested. Targets: agreement at least incumbent minus 1 [T], medium tokens at most 0.6x [T]. Outside evidence is weaker than first read.
next: Start in the next review workflows; costs about 30 [E] extra agents; decides whether the xhigh default stays.
origin: Dex Horthy sweep

### MSR-37 · Rerun knowledge-store refuter set at high effort
stage: Idea; package WP6b; metrics: token_cost (primary token_cost); answers: L1, L3
problem: We do not know whether verifiers run at xhigh need to be that expensive.
how: Rerun the committed refuter workflow on frozen inputs at Opus high effort twice and compare with the xhigh outcomes.
where it stands: Trial from the Dex Horthy sweep, conditional: runs only if xhigh verifier spend is at least 20% [T] of use. Not yet tested.
next: Wait for the usage-recording figure; if spend clears 20% [T], run it.
origin: Dex Horthy sweep

### TOK-40 · Test CONTEXT-block variants against each other
stage: Parked; package WP5; metrics: token_count, token_cost (primary token_count); answers: TK-PREFIX
problem: We never tested whether the CONTEXT block given to every agent is longer than needed and wastes tokens.
how: Run one task with current and trimmed CONTEXT blocks, three runs each; trim if no worse and at least 15% [T] cheaper.
where it stands: Parked: refuted before running. The block is a few hundred tokens [E] against a start above 63k [M], so a 15% [T] saving cannot be reached.
next: None.
origin: BAML sweep

### MSR-44 · Lean-workflow reassessment
stage: Parked; package WP5; metrics: token_cost, quality (primary token_cost); answers: W1
problem: We wanted to know whether a minimal-surface setup would beat our documented workflow.
how: Nine dispositions on a proposal I pasted: keep root authority, reject dropping the documentation, treat file-size limits as triggers for review, reject an allow-list of hooks; primary sources checked.
where it stands: Parked: no change adopted; comparison never run. Root instruction file is 28 lines, 6,709 bytes [M]; outside: context files raised cost over 20% [S].
next: Measure before trimming; one owner per rule.
origin: Clinic testbed; me
