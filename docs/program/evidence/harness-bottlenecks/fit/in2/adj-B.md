# Fallen candidates: Horthy groups G3, G5 and the addendum new families (source rows: horthy-fallen-3.md), and BAML cards (source rows: baml-post-review.md)

50 items.

### G3-F063 (horthy, skip in the PR; screener strength: moderate)
- bottlenecks proposed: B01
- claim: Code is disposable; for big refactors re-run on fresh code rather than rebase or patch.
- why it fell: The cited case never merged and FixFlow plans no large mechanical refactor; cherry-pick discipline is deliberate. [class: no-fixflow-weakness-matched; screener says the reason still holds against the bottleneck: no]
- what the screener says it would add: B01 first step says revert instead of patching a patch. The record shows fixes that add state (hold, lock, marker, cutoff) spawning P1s; discarding the fix and redoing it would have stopped those chains.

### G3-F069 (horthy, already-done in the PR; screener strength: moderate)
- bottlenecks proposed: B01, B12, B17
- claim: Evaluate harness changes by replaying a fixed known-good task set with one variable changed.
- why it fell: Half is already how the repo trials changes; the rest has no known-good phase and would bring back the M00-M06 evaluation regime. [class: already-in-fixflow-on-paper; screener says the reason still holds against the bottleneck: no]
- what the screener says it would add: The compile's B01, B12 and B17 first steps are replays on recorded chains at frozen commits. The testbed has those chains, so the no-known-good-phase reason fails. It is the method, not a new idea.

### G5-F015 (horthy, already-done in the PR; screener strength: moderate)
- bottlenecks proposed: B17
- claim: Not reading agent-written code ended in a discarded codebase; agent code must be read.
- why it fell: Agent-written code is already read on every PR in FixFlow; the tale supports keeping that. [class: already-in-fixflow-on-paper; screener says the reason still holds against the bottleneck: no]
- what the screener says it would add: Compile B17 shows 4 of 5 merges on 10 November and the real-data switch merged with the final head unread, and the first root check then failed 2 of 2,570 tests. The testbed did not practise this.

### N-F002 (horthy, already-done in the PR; screener strength: moderate)
- bottlenecks proposed: B12, B17
- claim: Unmeasured output counts as failure; a missing scan never counts as clean.
- why it fell: A chart-footnote policy; FixFlow's skip-aware gate is adopted and CLAUDE.md states the principle. [class: already-in-fixflow-on-paper; screener says the reason still holds against the bottleneck: no]
- what the screener says it would add: The testbed's verify command passes when every test is skipped (one of eight open red-team defects, A7-13). A claims-file check or closure rule needs this to have teeth.

### G3-F023 (horthy, already-done in the PR; screener strength: weak)
- bottlenecks proposed: B12
- claim: Re-verify every file, line and behaviour claim of a research doc by sub-agent and correct it.
- why it fell: Claim-by-claim re-verification is already the W2 verification policy. [class: already-in-fixflow-on-paper; screener says the reason still holds against the bottleneck: partly]
- what the screener says it would add: B12's first step wants every cited test checked by script. The testbed record shows 20+ overstatements where the root had to verify by hand; this is the same check done by a model instead of a script.

### G3-F006 (horthy, already-done in the PR; screener strength: weak)
- bottlenecks proposed: B12, B16
- claim: Sub-agent returns follow a fixed condensed format with mandatory file:line citations so a refuter can check.
- why it fell: Fixed formats with cited file:line, checked by a Sonnet citation pass, are already contract. [class: already-in-fixflow-on-paper; screener says the reason still holds against the bottleneck: partly]
- what the screener says it would add: B16's first step returns a path, hash and short summary instead of long reports; B12 cites missing tests. A citation format makes a claims line machine-checkable. The testbed overstated despite briefs.

### G3-F087 (horthy, already-done in the PR; screener strength: moderate)
- bottlenecks proposed: B04, B16, B17
- claim: Saved workflows return typed structured results (schema).
- why it fell: Typed structured results are already mandatory in FixFlow. [class: already-in-fixflow-on-paper; screener says the reason still holds against the bottleneck: no]
- what the screener says it would add: B04 first step is a gate workflow returning a typed verdict naming the head SHA. The testbed gates were Opus reviewers returning prose findings tables that the root read in its own context.

### G3-F078 (horthy, already-done in the PR; screener strength: weak)
- bottlenecks proposed: B04
- claim: Good agent systems are deterministic software with LLM steps inserted at chosen points.
- why it fell: This is what the Workflow scripts already are. [class: already-in-fixflow-on-paper; screener says the reason still holds against the bottleneck: no]
- what the screener says it would add: B04's first step moves review into a gate workflow and merge into a local queue under a lock. The testbed gates ran as sessions through the root, which is why the root became the serial gate.

### G3-F020 (horthy, already-done in the PR; screener strength: weak)
- bottlenecks proposed: B03
- claim: Orchestrator launches one implementer per plan phase, re-runs checks, resumes from the first unchecked box.
- why it fell: Orchestrator plus implementer with resume from the first unchecked box is already the phase routine. [class: already-in-fixflow-on-paper; screener says the reason still holds against the bottleneck: partly]
- what the screener says it would add: B03 first step is a resume list. After the 6 November power-off nothing resumed for three days; a state-file resume point would have let a restart pick up work without the owner's turn.

### G3-F085 (horthy, already-done in the PR; screener strength: moderate)
- bottlenecks proposed: B03, B07
- claim: Parallelism is capped by design and review capacity at 2-3 runs; fan out only after a good plan.
- why it fell: Parallelism is already capped by machine and review capacity. [class: already-in-fixflow-on-paper; screener says the reason still holds against the bottleneck: no]
- what the screener says it would add: Release two sessions at a time (B03) and a measured slot count (B07). On 9 November releasing every parked session at once produced the 2,030 s wait.

### G3-F090 (horthy, skip in the PR; screener strength: weak)
- bottlenecks proposed: B03
- claim: Cache each LLM call by input hash to a JSON file so a changed step reruns without paying for earlier steps.
- why it fell: A hand-built hash cache adds Windows file plumbing to scripts that are run once and not saved. [class: cost-or-risk; screener says the reason still holds against the bottleneck: partly]
- what the screener says it would add: Resuming after a power-off without redoing finished workflow steps. The testbed already built checkpoint-and-resume by hash of declared dependencies (A7-02) but with open defects.

### G3-F015 (horthy, already-done in the PR; screener strength: weak)
- bottlenecks proposed: B16
- claim: Do not micro-optimise sub-agent tool restrictions; fine-grained restriction caused tool thrash and worse results.
- why it fell: Tool lists are already coarse; keep it that way. [class: already-in-fixflow-on-paper; screener says the reason still holds against the bottleneck: no]
- what the screener says it would add: The compile says the B16 refusals came from read-only agent types or a tools list without Write. Coarse, Write-enabled lists would have avoided the rule the testbed wrote from an unchecked report.

### G3-F019 (horthy, already-done in the PR; screener strength: weak)
- bottlenecks proposed: B04
- claim: Delegate all non-trivial research and noisy bash/gh work to sub-agents, one per task, to keep the main model coherent.
- why it fell: Delegating everything conflicts with the measured per-subagent overhead rule. [class: cost-or-risk; screener says the reason still holds against the bottleneck: yes]
- what the screener says it would add: Moving noisy output out of the root's four compactions. But the compile measures 70k fixed tokens per agent and the root as only 15 percent of tokens, so the gain is bounded.

### G3-F073 (horthy, skip in the PR; screener strength: moderate)
- bottlenecks proposed: B13
- claim: One canonical source with a sync script whose check mode fails on drift.
- why it fell: No mirrored copies exist yet in FixFlow. [class: no-fixflow-weakness-matched; screener says the reason still holds against the bottleneck: no]
- what the screener says it would add: B13 reports stale parts of AGENTS.md and the context map beside an 800-line board. A script that fails on drift between a generated source and its routing copies is the check B13 asks for.

### G3-F106 (horthy, already-done in the PR; screener strength: weak)
- bottlenecks proposed: B13
- claim: Avoid parallel writes to one markdown file; one writer per artifact.
- why it fell: The design already has one writer per artifact; only Fable writes files. [class: already-in-fixflow-on-paper; screener says the reason still holds against the bottleneck: partly]
- what the screener says it would add: This single-writer rule is the cause of B13 (root applies every slice edit by script). The fix is per-slice fragments plus a generator, so the rule must be satisfied without a human writer.

### G3-F031 (horthy, skip in the PR; screener strength: weak)
- bottlenecks proposed: B01
- claim: A call-graph CLI diffs call stacks across git trees and finds paths from an entrypoint to a symbol.
- why it fell: Marketing evidence only, and it reopens a skip whose reasons still hold. [class: weak-evidence; screener says the reason still holds against the bottleneck: partly]
- what the screener says it would add: B01's scripted blast-radius list (callers and co-changed files). Compile section 6 says it can be tested at zero tokens against ten recorded cases. The tool is not needed; the mechanism is.

### G5-F014 (horthy, skip in the PR; screener strength: weak)
- bottlenecks proposed: B01
- claim: Compute call stacks deterministically from the AST instead of having a model write them.
- why it fell: Re-adopting this skip needs a new reason and the card gives only a link to an unevaluated tool. [class: reopens-an-owner-skip; screener says the reason still holds against the bottleneck: no]
- what the screener says it would add: A new reason exists: compile section 6 names a script-built list of callers and importers attached to the reviewer brief for fixes that created late P1s. Still needs the owner since it reopens a skip.

### G3-F022 (horthy, skip in the PR; screener strength: weak)
- bottlenecks proposed: B01
- claim: Run competing plans or agents in parallel in separate worktrees and keep or synthesise the best.
- why it fell: Anecdote only and the harness already ran named alternatives; no remaining design phase to run it on. [class: weak-evidence; screener says the reason still holds against the bottleneck: yes]
- what the screener says it would add: Compile section 5 names the one tested form: several candidate fixes picked by an executed test. A replay on recorded fix-induced defects is the only place it would run. It adds extra agents per finding.

### G3-F049 (horthy, skip in the PR; screener strength: weak)
- bottlenecks proposed: B01
- claim: Frame recurring agent work as a control loop with an optional dampener regression gate and a human on the loop.
- why it fell: No recurring agent loops are planned; conceptual with no outcome data. [class: weak-evidence; screener says the reason still holds against the bottleneck: yes]
- what the screener says it would add: B01's fixes lacked a regression gate before the fix commit. The dampener idea matches the full gate before the fix commit, but nothing here supplies evidence beyond the testbed's own rounds.

### G5-F031 (horthy, skip in the PR; screener strength: moderate)
- bottlenecks proposed: B14
- claim: Claude Code streams per turn and finished tool call, not per bash output; no progress mid-command.
- why it fell: A platform fact; nothing in W1-W5 depends on progress mid-command. [class: no-fixflow-weakness-matched; screener says the reason still holds against the bottleneck: no]
- what the screener says it would add: Explains B14: the step display froze because of one long foreground check wait. It supports the compile's reading and the heartbeat plus background-run first step instead of a display fix.

### N-F020 (horthy, skip in the PR; screener strength: weak)
- bottlenecks proposed: B14, B09
- claim: One Claude monitors another agent's terminal through tmux as an outside observer.
- why it fell: tmux is absent here and a persisted transcript beats live watching (G2-F186). [class: not-transferable; screener says the reason still holds against the bottleneck: partly]
- what the screener says it would add: B14 owner sees no progress. The tmux route does not transfer, but the observer idea matches a heartbeat file the check writes, which a second process reads.

### G3-F021 (horthy, skip in the PR; screener strength: weak)
- bottlenecks proposed: B03, B15
- claim: An orchestrator skill starts sessions in separate worktrees, checks task and PR status, and moves artifacts between tasks.
- why it fell: Marketing evidence, and a multi-worktree launcher would collide with fixed Docker container names. [class: weak-evidence; screener says the reason still holds against the bottleneck: partly]
- what the screener says it would add: B03: the orchestrator cannot start sessions unless the owner's message begins the turn. B15: the container-name collision is what per-checkout compose projects (A8-08) solved. Evidence is the clinic record, not the source.

### G3-F110 (horthy, skip in the PR; screener strength: weak)
- bottlenecks proposed: B15, B08
- claim: CodeLayer is an open-source tool to manage many parallel Claude Code sessions.
- why it fell: A product pitch that needs an install with no Windows evidence. [class: cost-or-risk; screener says the reason still holds against the bottleneck: yes]
- what the screener says it would add: A view of about 20 idle sessions for B15 and B08. Nothing is installed without an owner decision, and no clinic evidence shows a manager would cut memory.

### N-F018 (horthy, skip in the PR; screener strength: weak)
- bottlenecks proposed: B15
- claim: A repo-defined worktree setup script installs dependencies and cleans up automatically when setup fails.
- why it fell: Duplicate of G2-F168, one anecdote; Docker Appendix A and the worktree rule cover the backend. [class: weak-evidence; screener says the reason still holds against the bottleneck: partly]
- what the screener says it would add: B15's first step is a dry-run reaper for merged worktrees and compose projects. A paired setup and teardown script gives the reaper one definition of what a worktree owns.

### G5-F033 (horthy, already-done in the PR; screener strength: weak)
- bottlenecks proposed: B15
- claim: Cap concurrently live experiments Kanban-style so new ones must displace old ones.
- why it fell: A speculative WIP limit for a large portfolio; FixFlow has few flags and serialises work. [class: not-transferable; screener says the reason still holds against the bottleneck: partly]
- what the screener says it would add: A WIP cap on live worktrees and sessions: B15's piling worktrees, B08's roughly 20 idle sessions and 26 database containers. The cap forces teardown before a new start.

### G3-F056 (horthy, skip in the PR; screener strength: weak)
- bottlenecks proposed: B21
- claim: Scheduled overnight cleanup agents fix one thing and open one small PR a human reads.
- why it fell: Doc drift is caught by CI; nightly agent PRs add review load and secrets with no outcome numbers. [class: cost-or-risk; screener says the reason still holds against the bottleneck: yes]
- what the screener says it would add: A way to burn down 183 distinct P3 ids. B17's unread merges and B03's away-owner problem make unattended PRs worse, so the cost reason holds.

### G3-F062 (horthy, skip in the PR; screener strength: weak)
- bottlenecks proposed: B03
- claim: The simplest saved workflow is a bash loop feeding a prompt file to an agent.
- why it fell: An unattended loop with bypassed permissions contradicts the supervised one-phase-per-session routine. [class: reopens-an-owner-skip; screener says the reason still holds against the bottleneck: yes]
- what the screener says it would add: A restart path for B03 that needs no owner turn. Compile notes scheduled-task prompts cannot act as approval, and the loop evidence is unverified claims.

### G5-F048 (horthy, skip in the PR; screener strength: weak)
- bottlenecks proposed: B02
- claim: Learning tests poke the system from outside (proof-based development).
- why it fell: The harness already probes behaviour from outside with real-DB tests. [class: already-in-fixflow-on-paper; screener says the reason still holds against the bottleneck: partly]
- what the screener says it would add: The B02 zero-seed walk is an outside probe of a clean install. The testbed's drills seeded synthetic data (a_first_deploy.sh:37-38), so the outside-probe practice existed but never ran from a clean state.

### N-F023 (horthy, already-done in the PR; screener strength: weak)
- bottlenecks proposed: B01, B17
- claim: Stage everything at each good review checkpoint so the diff shows only what changed since the last reviewed state.
- why it fell: Anecdote; SHA-bound review checkpoints already do the job more robustly. [class: already-in-fixflow-on-paper; screener says the reason still holds against the bottleneck: no]
- what the screener says it would add: A fresh reviewer for B01's re-read sees only the delta since the reviewed head, and B17's record of who read the final head needs the reviewed SHA. Round three was the root reading the diff alone.

### G3-F102 (horthy, already-done in the PR; screener strength: weak)
- bottlenecks proposed: B17
- claim: Keep human architecture review since models cannot be RL-trained on architecture quality.
- why it fell: Architecture opinions are already encoded as CI boundaries and Opus review; reasoning only. [class: already-in-fixflow-on-paper; screener says the reason still holds against the bottleneck: partly]
- what the screener says it would add: B17 says no independent human review exists and the production-readiness review is a parked card. Keeping some human read on high-risk branches matches the compile's no-merge-on-none-or-own rule.

### G3-F060 (horthy, skip in the PR; screener strength: weak)
- bottlenecks proposed: B12, B14
- claim: A CI run exits with a code reflecting the session result and writes a metadata file with task and session ids.
- why it fell: Phases run interactively in the desktop app, so there is no run command to give an exit code. [class: not-transferable; screener says the reason still holds against the bottleneck: partly]
- what the screener says it would add: A machine-readable record that a session ran and what it claimed, usable by the script-checked claims file (B12) and the heartbeat (B14). The record form transfers, the exit code does not.

### G3-F014 (horthy, already-done in the PR; screener strength: weak)
- bottlenecks proposed: B12
- claim: Brief sub-agents with a verifiable end state and verify surprising results with follow-ups.
- why it fell: Parent-side briefing discipline is already codified with a stronger done definition. [class: already-in-fixflow-on-paper; screener says the reason still holds against the bottleneck: partly]
- what the screener says it would add: The testbed had briefs and still overstated 20+ times, so a done definition that is script-checkable rather than model-read is what B12 needs.

### D-03 (baml, already-done in the PR; screener strength: strong)
- bottlenecks proposed: B17, B12
- claim: BAML's test runner has five exit codes; an empty test selection is a failure unless explicitly declared.
- why it fell: Zero-tests-never-green is already program law (honest-empty, skip-aware gates, RT-01); four states matter only once a brief-test runner exists. [class: already-in-fixflow-on-paper; screener says the reason still holds against the bottleneck: no]
- what the screener says it would add: The testbed's verify still passes when every test is skipped (an open red-team defect, A7-13). Reading zero-run or all-skipped as a failure, in verify and in the B12 claims check, closes it.

### T-10 (baml, skip in the PR; screener strength: moderate)
- bottlenecks proposed: B12
- claim: Have the model emit short ids for sources and map them back in code; improves accuracy and cuts tokens.
- why it fell: Conflicts with skeptics finding their own counter-evidence; fabricated citations already caught by citation checks; none recorded; no measurement. [class: no-fixflow-weakness-matched; screener says the reason still holds against the bottleneck: no]
- what the screener says it would add: The testbed records cited tests that did not exist. Slices would cite test ids from a script-collected list, and unknown ids are rejected at the root gate. A claims file is not a skeptic, so the REFUTED conflict does not apply.

### B-09 (baml, skip in the PR; screener strength: moderate)
- bottlenecks proposed: B01
- claim: A BAML release bug came from stacked risks; enumerate the change's dimensions and test the whole combination matrix.
- why it fell: Single post-mortem outside the landing areas; reviewer brief already names changed expectations; the proposed trial had no control. [class: weak-evidence; screener says the reason still holds against the bottleneck: no]
- what the screener says it would add: The clinic record supplies the evidence: late P1s cluster in fixes that add state. The end-state table becomes a dimension-by-mode matrix (S11 restore by rollback). The frozen-commit replay is the control.

### R-09 (baml, skip in the PR; screener strength: moderate)
- bottlenecks proposed: B16
- claim: Test the LLM surface offline; a pure in-script brief lint before any agent call catches hand-edit regressions.
- why it fell: Two of four lint checks built into agent(); CONTEXT guaranteed by construction; source is compiler practice; no brief regression or tier leak recorded. [class: no-fixflow-weakness-matched; screener says the reason still holds against the bottleneck: partly]
- what the screener says it would add: The same pre-launch lint shape, extended: a brief that asks for a report file must go to a Write-enabled agent type. Read-only types and tools lists without Write are B16's measured causes, and this fails them before any spend.

### R-05 (baml, already-done in the PR; screener strength: moderate)
- bottlenecks proposed: B21, B13
- claim: A repairing parser turns schema violations into silent missing data; filtering steps should report received, kept and drop reasons.
- why it fell: Rule exists: findings sliced with the dropped count logged, a backlog, the no-silent-caps pattern; the tool layer rejects rather than repairs. [class: already-in-fixflow-on-paper; screener says the reason still holds against the bottleneck: partly]
- what the screener says it would add: The B21 parser and the B13 board generator print rows read, kept and dropped with a reason. The first open count over the 183 P3 ids then cannot silently lose findings.

### T-03 (baml, already-done in the PR; screener strength: moderate)
- bottlenecks proposed: B12, B01, B17
- claim: An eval harness needs safeguards: refuse to judge on missing input, repeat runs, and check that assertions can pass.
- why it fell: Unknown-is-not-zero is RT-06; checks that must be able to fail is RT-01 and the KS inject-control; repeats matter only inside refuted B-13. [class: already-in-fixflow-on-paper; screener says the reason still holds against the bottleneck: partly]
- what the screener says it would add: The guard-removal control is already in the B12 and B01 first steps. The remaining add: the claims checker returns 'cannot judge' when a cited test cannot be located or run, never a pass.

### T-09 (baml, already-done in the PR; screener strength: moderate)
- bottlenecks proposed: B12
- claim: Forcing schema output can make a model fabricate a conforming answer; give an Other or Unknown escape hatch.
- why it fell: §5.2 already has UNVERIFIABLE, untestable and unknown paths; empty results are valid; unknown is recorded as unknown, never 0. [class: already-in-fixflow-on-paper; screener says the reason still holds against the bottleneck: partly]
- what the screener says it would add: Each claim in the slice claims file gets 'not run' and 'unknown' values. A slice need not assert a test ran just to fill a field, so an overstatement shows up as unknown, not as yes.

### D-06 (baml, already-done in the PR; screener strength: moderate)
- bottlenecks proposed: B09, B01
- claim: BAML's optimizer cannot tell a provider outage from a bad prompt, so flaky infrastructure makes good work look broken.
- why it fell: The harness keeps infrastructure outcomes apart from content outcomes; a null is never a result; the breaker reads nulls as a suspected limit. [class: already-in-fixflow-on-paper; screener says the reason still holds against the bottleneck: partly]
- what the screener says it would add: The check records a stall, socket error 10055 or a missing database as an infra state, separate from a test failure. B09's next stall then carries a cause class, and a B01 full gate never reads an infra red as a regression.

### T-04 (baml, skip in the PR; screener strength: moderate)
- bottlenecks proposed: B17
- claim: Evaluate a swapped model by diffing its structured output against the incumbent's on the same cases; disagreements go to a human.
- why it fell: Tier split is an owner rule; weak evidence; pays Opus to redo a lane; open-ended diffs do not converge; no routing failure recorded. [class: cost-or-risk; screener says the reason still holds against the bottleneck: partly]
- what the screener says it would add: Shapes B17's second-model-family replay: the same seven known misses at frozen commits, both reviewers, and the owner reads only the disagreements. Known answers remove the convergence objection. The cost of a one-off replay remains.

### B-13 (baml, skip in the PR; screener strength: moderate)
- bottlenecks proposed: B01, B17
- claim: Treat a model swap as a regression test: a case corpus, a relative gate, three repeats, review only the disagreements.
- why it fell: Inputs are the live repo and web, not fixed cases; 60–180 agent runs per brief edit against Opus quota; owner precedent against measurement pipelines. [class: cost-or-risk; screener says the reason still holds against the bottleneck: partly]
- what the screener says it would add: The recorded defect chains at frozen commits are fixed cases, so the first break does not apply to the B01 and B17 replays. Disagreement-only review bounds the owner's minutes. Cost and the §3.6 one-budget warning still hold.

### B-06 (baml, already-done in the PR; screener strength: weak)
- bottlenecks proposed: B21, B13
- claim: Never ask a model for a confidence score, a sum or a row count; compute counts in code.
- why it fell: Scripts compute counts from array lengths; no §5.2 schema asks a model for a count; the confidence half is T-01. [class: already-in-fixflow-on-paper; screener says the reason still holds against the bottleneck: partly]
- what the screener says it would add: Board totals and the open-P3 count come only from the generator, never from a slice report or the root's prose. The testbed board had no such count.

### B-08 (baml, already-done in the PR; screener strength: weak)
- bottlenecks proposed: B04, B17
- claim: Replace UUIDs with small integers before the call and map them back afterwards; cuts echo and aggregation errors.
- why it fell: The harness already uses short labels; the only long-hash path is checked by git in code, so a mis-echoed hash fails loudly. [class: already-in-fixflow-on-paper; screener says the reason still holds against the bottleneck: partly]
- what the screener says it would add: The typed gate verdict's head SHA is filled by the script from git, not echoed by the reviewer. The B17 record of who read the final head then cannot cite the wrong head.

### R-12 (baml, skip in the PR; screener strength: weak)
- bottlenecks proposed: B13
- claim: BAML ships agent guidance in its CLI so guidance matches the toolchain; proposed a generated guide plus a coverage test.
- why it fell: Tool and SKILL.md share one repo and commit, so skew cannot arise; store unbuilt; a new verb grows the surface; evidence quality 1. [class: no-fixflow-weakness-matched; screener says the reason still holds against the bottleneck: no]
- what the screener says it would add: The testbed's AGENTS.md and context map lived in the same repo and still went stale, so sharing a commit did not prevent drift. Generating routing sections from the plan, plus a coverage test, matches B13's first step.

### T-13 (baml, already-done in the PR; screener strength: weak)
- bottlenecks proposed: B13
- claim: Keep a small tool-agnostic file of durable architecture rules, and enforce boundaries with executable CI checks.
- why it fell: CLAUDE.md invariants plus import-linter and ESLint already do this. [class: already-in-fixflow-on-paper; screener says the reason still holds against the bottleneck: partly]
- what the screener says it would add: AGENTS.md keeps only durable rules, and changing state moves to the generated board, so less of it can go stale. This mostly confirms the compile's B13 step and the testbed's CR-06 document tests.

### T-14 (baml, skip in the PR; screener strength: weak)
- bottlenecks proposed: B17
- claim: Hold design docs to a stricter standard than code; require that one is read before it ships; reading capacity is the limit.
- why it fell: The owner critique rounds are already the read gate. No change proposed. [class: already-in-fixflow-on-paper; screener says the reason still holds against the bottleneck: no]
- what the screener says it would add: In the testbed, 4 of 5 merges on 10 November had final heads nobody read. The idea backs B17's merge record: a high-risk merge waits until a named reader is recorded against the final head. That rule is already in the compile.

### T-06 (baml, skip in the PR; screener strength: weak)
- bottlenecks proposed: B04
- claim: Test a tool by having an agent use it from scratch; other agents inspect the transcript for wrong behaviour and wasted calls.
- why it fell: Recorded quota failures came from fan-out size and effort; fixed overhead dominates; the transcript audit found nothing that caused a mistake. [class: no-fixflow-weakness-matched; screener says the reason still holds against the bottleneck: partly]
- what the screener says it would add: Read with a script rather than agents, the November slice transcripts show what fills the 306k-per-call windows. That feeds §3.6 lever (1). The compile already plans a rerun of the forensics script.

### B-14 (baml, skip in the PR; screener strength: weak)
- bottlenecks proposed: B04
- claim: Exhaust single-loop improvements before adding a second loop or sub-agent; inspect what the agent actually returns.
- why it fell: Confirms existing rules; its golden-set naming is carried by B-13 and T-02. [class: already-in-fixflow-on-paper; screener says the reason still holds against the bottleneck: partly]
- what the screener says it would add: Backs §3.6 lever (2): no sub-agent for work the session can do, given the measured fixed cost of about 70k tokens per agent. A rule of thumb only.

### T-07 (baml, skip in the PR; screener strength: weak)
- bottlenecks proposed: B04
- claim: Run the same tasks against several versions of agent instructions and compare cost, turns and success; the shortest often won.
- why it fell: The CONTEXT block is a few hundred tokens against a 63k start; the cited win relied on a tool we lack; no counts. [class: weak-evidence; screener says the reason still holds against the bottleneck: yes]
- what the screener says it would add: Little. A trimmed slice pre-read is §3.6 lever (1), but the testbed's own with-and-without trial (A7-06) ran this shape and came back identical.
