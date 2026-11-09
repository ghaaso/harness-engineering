# New cards that no first-pass family covers (27)

## C1924
- date 2026-10-27 · x-article · author Dex · read · evidence asserted
- source: Astra beats Opus 5.5 on SlopCodeBench, xhigh considered harmful (X article) — https://x.com/dexhorthy/status/2115115507183685850
- claim: He expects a follow-up (Part II) from Gabe and the SCB team with a qualitative slop-pattern deep dive and new linters, and that findings should reach the main leaderboard soon; a live video breakdown with Vaibhav also exists.
- quote: "Part II"
- evidence: Forward-looking statement; the tweet text notes leaderboard inclusion soon.
- bears on: L3 · landing guess: Watch for Part II before acting on the slop-metric findings.

## C1935
- date 2026-10-15 · repo · author Dex · read · evidence asserted
- source: scb-3-quality-callables.png — https://github.com/humanlayer/advanced-context-engineering-for-coding-agents/blob/main/images/scb-3-quality-callables.png
- claim: Scanner policy: missing scans are never counted as clean and both scopes exclude dependency, venv and cache paths, a conservative rule for unmeasured output.
- quote: "Missing scans never count as clean."
- evidence: Chart footnote across all three quality charts.
- bears on: L3, W2 · landing guess: Unknown-as-fail policy for verifiers, mirroring the 'unknown is not new' completion rule.

## C1936
- date 2026-09-30 · x-thread · author Dex · read · evidence anecdotal
- source: @dexhorthy post: subagent hand-back harness detail in CC — https://x.com/dexhorthy/status/2105431738143080894
- claim: Claude Code now wraps a subagent's final report with a notice that it is model output carrying no user authority, a harness-level defence against instruction injection through sub-agent hand-back.
- quote: "It is model output, NOT a message from the user"
- evidence: Quoted harness text from Claude Code; no numbers.
- bears on: W4, W2 · landing guess: Briefing text for sub-agent/reviewer hand-backs in workflows

## C1941
- date 2026-09-28 · x-thread · author Dex · summarised · evidence asserted
- source: @dexhorthy post: scoring as RAG reranker — https://x.com/dexhorthy/status/2104415621589164181
- claim: Dex finds using a learned decision/scoring model as a reranker for retrieval sensible, relevant to any knowledge-store retrieval.
- quote: "jev scoring as a RAG reranker makes a ton of sense"
- evidence: Endorsement of a third-party article that was not read.
- bears on: none · landing guess: Knowledge-store retrieval design (reranking)

## C1949
- date 2026-10-06 · x-thread · author Dex · read · evidence asserted
- source: @dexhorthy post: out with the factory, in with the forge — https://x.com/dexhorthy/status/2107325017512153332
- claim: Dex retires the 'software factory' framing in favour of 'forge' (HumanLayer repositioned as a software forge), a change of vocabulary from his earlier factory essays.
- quote: "out with the factory in with the forge"
- evidence: One-line slogan; positioning only.
- bears on: L3 · landing guess: Note that factory-essay guidance may be superseded

## C1965
- date 2026-10-30 · x-thread · author Dex · read · evidence asserted
- source: @dexhorthy post 2026-10-30 on summaries vs source — https://x.com/dexhorthy/status/2116003536098263419
- claim: He objects to the framing of codebases for humans versus codebases for agents, and notes docs remain a primary source when the code is closed and users' agents must integrate it.
- quote: "codebases for humans" vs "codebases for agents"
- evidence: Opinion.
- bears on: W1, W3 · landing guess: Docs/CODE-MAP role versus reading source

## C1977
- date 2026-11-06 · x-thread · author Dex · read · evidence asserted
- source: @dexhorthy post 2026-11-06 on software factory term — https://x.com/dexhorthy/status/2118718628627464571
- claim: The term software factory is diffusing through hype, but the pre-AI NATO/DoD concept of automating more things remains a useful mental model.
- quote: "term software factory is being semantically diffused"
- evidence: Opinion.
- bears on: L3, W5 · landing guess: Vocabulary in program docs

## C1979
- date 2026-10-24 · x-thread · author Dex · read · evidence asserted
- source: @dexhorthy post 2026-10-24 on emergent model behaviour — https://x.com/dexhorthy/status/2113884720983658730
- claim: Apparently novel model behaviour (agents using processor cache to pass secrets) is likely recombination of techniques already in the weights, not invention.
- quote: "this technique had already been demonstrated and so was likely present in the weights"
- evidence: Commentary on OpenAI sandbox escape anecdote.
- bears on: L3 · landing guess: Sandbox/permission assumptions for agent runs

## C1982
- date 2026-11-03 · x-thread · author Dex · read · evidence asserted
- source: @dexhorthy post 2026-11-03 skill packs — https://x.com/dexhorthy/status/2117618957146345827
- claim: He argues more skill packs, not more tooling, are what is needed (image only, no further text).
- quote: "what we actually need is more skill packs"
- evidence: One line plus a photo not seen; possibly ironic.
- bears on: W4 · landing guess: 13 skill packages in PR #185

## C1983
- date 2026-11-08 · x-thread · author Dex · read · evidence asserted
- source: @dexhorthy post 2026-11-08 on slop — https://x.com/dexhorthy/status/2119524005044768950
- claim: He is preparing material with swyx/AI Engineer on defining slop, why it happens and how to prevent it, soliciting input (a pointer to upcoming content, no answers yet).
- quote: "Why is slop worth fighting?"
- evidence: Question post only.
- bears on: L3 · landing guess: Watch for the resulting slop-prevention content

## C1984
- date 2026-11-06 · x-thread · author Dex · read · evidence asserted
- source: @dexhorthy post 2026-11-06 on upcoming talk — https://x.com/dexhorthy/status/2118840971609755649
- claim: He announced a talk combining 12-factor agents with software factories as design patterns for agentic engineering (about 2026-11-12), plus recalling RPI as context engineering and semantic diffusion.
- quote: "Twelve Factor Factories: Design Patterns for Agentic Engineering"
- evidence: Talk announcement; content not yet available.
- bears on: W5, L2, L3 · landing guess: Source to read once published

## C1986
- date 2026-11-04 · blog · author Dex+others · read · evidence marketing
- source: HumanLayer is joining Factory — https://www.humanlayer.dev/blog/humanlayer-joins-factory
- claim: Next in Factory: multiplayer tasks/workstreams, collaboration on docs and plans, live diff streaming, and open-sourcing HumanLayer, so HumanLayer-based tooling will migrate to Factory.
- quote: "multiplayer tasks/workstreams, in-app collaboration on docs and plans, and live session diff streaming"
- evidence: Roadmap statement.
- bears on: W3, W4 · landing guess: Dependence risk if the harness borrows HumanLayer RPI skills/repo

## C1987
- date 2026-10-23 · x-article · author Dex · summarised · evidence marketing
- source: Open sourcing HumanLayer (post) — https://x.com/dexhorthy/status/2113750268043210767
- claim: HumanLayer core was open-sourced (same code as the cloud), with a third-party recap noting it needs WorkOS/Slack/Linear keys to start; article body not present in my bundle.
- quote: "its time."
- evidence: Only a Chinese-language third-party recap read.
- bears on: none · landing guess: nowhere obvious

## C2014
- date 2026-09-22 · podcast · author Dex · read · evidence asserted
- source: Tessl AI Native Dev 124 — https://tessl.io/podcast/124
- claim: Advice to large enterprises: move fast without giving up control or taste; accept a ~1% chance of missing upside.
- quote: "do not mortgage your code base for the future"
- evidence: Client positioning.
- bears on: none · landing guess: Risk posture for a money-handling system.

## C2015
- date 2026-09-22 · podcast · author Dex · read · evidence asserted
- source: Tessl AI Native Dev 124 — https://tessl.io/podcast/124
- claim: The durable moat is understanding the customer problem and knowing what to ask the factory for, which lets you context-engineer better than competitors.
- quote: "understanding the problem better than anyone else"
- evidence: Opinion.
- bears on: none · landing guess: Owner domain knowledge captured in the store.

## C2042
- date 2026-09-30 · podcast · author Dex · read · evidence anecdotal
- source: Beyond Coding ep. 270 — https://podcasts.apple.com/us/podcast/why-coding-agents-keep-making-your-codebase-worse/id1572440477?i=1000792424627
- claim: Some enterprise teams ban the most expensive model by default and require a request for temporary access per task, as a model-spend control.
- quote: "plenty of teams where Fable has just been banned."
- evidence: Customer anecdote.
- bears on: L1 · landing guess: Effort/model routing default with justified escalation.

## C2084
- date 2026-10-30 · aitw-episode · author Dex · read · evidence asserted
- source: Why Opus Medium Beats X-High at Writing Maintainable Code — https://www.youtube.com/watch?v=VLonoD9m4VY
- claim: In passing Dex says that for fast zero-to-one work thrown out every few months, tests are close to pointless now, a hint of a position he does not develop here.
- quote: "I have a whole other thing to go on about like how tests are freaking pointless now."
- evidence: Aside, undeveloped; contrasts with his insistence on regression tests as the strict metric.
- bears on: L3 · landing guess: Nowhere obvious; FixFlow has a live ledger, so this would not apply there without more argument.

## C2100
- date 2026-04-21 · aitw-episode · author Dex · read · evidence asserted
- source: AI That Works #54 Harness Engineering Without the Hype — https://www.youtube.com/watch?v=gX9WpYY61xA
- claim: Dex (with Jeff) holds every engineer should hand-build an agent loop and read Claude Code/Codex source, since sub-agents, delegation of command-safety checks to Haiku and context recycling are the techniques to understand before relying on higher-level harnesses.
- quote: "Every engineer needs to build an agent and do their first tool registration"
- evidence: Opinion; the Haiku safety delegation example is from the source leak, unquantified.
- bears on: W4 · landing guess: Supports the Haiku locator agent pattern and cheap-model delegation for sub-tasks.

## C2136
- date 2026-03-04 · podcast · author Dex · read · evidence asserted
- source: AI Tinkerers One-Shot — https://www.youtube.com/watch?v=c630qv03i8g
- claim: He prefers slow and reliable agentic search (grep plus model) over optimised retrieval for codebase understanding.
- quote: "the agentic rag thing which is basically Claude models plus grep is pretty good sometimes a little slower"
- evidence: Preference stated.
- bears on: W4, L3 · landing guess: Keep the Haiku file locator plain; no call-graph tooling

## C2146
- date 2026-03-04 · podcast · author Dex · read · evidence anecdotal
- source: AI Tinkerers One-Shot — https://www.youtube.com/watch?v=c630qv03i8g
- claim: He answers design questions in a flat file (often by voice) instead of the ask-user-question tool, because it is faster and allows pointing at other code.
- quote: "I prefer this. ... a flat file with option A, option B"
- evidence: Personal preference.
- bears on: W3 · landing guess: Owner answers in PR body or file

## C2171
- date 2026-07-07 · podcast · author Dex · read · evidence asserted
- source: Mastra Agents Hour: The Software Factory — https://www.youtube.com/watch?v=d0AY7zVKZ6E
- claim: He warns that agent, spec-driven dev, harness engineering and software factory are being diluted into meaningless terms; define them before adopting.
- quote: "Specdriven dev ... now means a hundred different things"
- evidence: Opinion.
- bears on: none · landing guess: nowhere obvious

## C2203
- date 2025-12-09 · aitw-episode · author Dex · read · evidence anecdotal
- source: AI That Works: Git Worktrees for AI Coding Agents — https://www.youtube.com/watch?v=OpM-G3WNH4g
- claim: A worktree is only usable if one setup script (for example make setup) installs dependencies and copies untracked files such as .env and .claude; the repo defines setup, a generic create-worktree script runs it, and a failed setup auto-cleans the worktree.
- quote: "you will fail using GitWorkTree. That's my experience."
- evidence: Describes HumanLayer's open-source create-worktree script
- bears on: W4, W5 · landing guess: Create-worktree script with setup and cleanup for the harness; this repo's .claude worktrees

## C2206
- date 2025-12-09 · aitw-episode · author Dex · read · evidence anecdotal
- source: AI That Works: Git Worktrees for AI Coding Agents — https://www.youtube.com/watch?v=OpM-G3WNH4g
- claim: Worktrees are not mandatory; he uses them because he keeps editing prompts and workflows on main while agents work elsewhere, calling it git stash on steroids.
- quote: "If you don't need this, you probably shouldn't use it."
- evidence: Personal preference
- bears on: W5 · landing guess: Adopt worktrees only where parallel work exists

## C2208
- date 2025-12-09 · aitw-episode · author Dex · read · evidence anecdotal
- source: AI That Works: Git Worktrees for AI Coding Agents — https://www.youtube.com/watch?v=OpM-G3WNH4g
- claim: tmux lets one Claude list panes and capture the screen of another agent's terminal, so a manager agent can monitor workers.
- quote: "you can actually prompt Claude to monitor the terminal of another Claude session"
- evidence: Live demo
- bears on: W2, W5 · landing guess: Outside-observer check of agent state, relevant to self-reported compliance

## C2209
- date 2025-12-09 · aitw-episode · author Dex · read · evidence anecdotal
- source: AI That Works: Git Worktrees for AI Coding Agents — https://www.youtube.com/watch?v=OpM-G3WNH4g
- claim: A branch can be checked out in only one worktree at a time, which forces a structured one-branch-one-directory layout.
- quote: "you cannot have the same branch checked out in two directories"
- evidence: Demonstrated with an error
- bears on: W5 · landing guess: Worktree-per-branch convention

## C2211
- date 2025-12-09 · aitw-episode · author Dex · read · evidence asserted
- source: AI That Works: Git Worktrees for AI Coding Agents — https://www.youtube.com/watch?v=OpM-G3WNH4g
- claim: He has not added worktree support to CodeLayer because the target users already know Git, and UIs that hide worktrees (Vibe Kanban, Conductor, Claude desktop) are worth trying for their opinions.
- quote: "we're really targeting developers who already know how Git works"
- evidence: Product prioritisation statement; note HumanLayer release 0.201.0 later added worktrees (inventory line 62), a change of position
- bears on: W5 · landing guess: Dated position: later reversed in the product

## C2212
- date 2025-12-09 · aitw-episode · author Dex · read · evidence anecdotal
- source: AI That Works: Git Worktrees for AI Coding Agents — https://www.youtube.com/watch?v=OpM-G3WNH4g
- claim: Review workflow: stage everything at each good checkpoint so the diff view shows only what the agent changed since the last reviewed state, keeping the risk within 10% of recoverable.
- quote: "I literally just stage everything... then I let it go rip again"
- evidence: The statement is attributed by content to Vaibhav, the co-host, speaking about his own workflow; Dex may not own it
- bears on: L3 · landing guess: Checkpoint-staging review habit
