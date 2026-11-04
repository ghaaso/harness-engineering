# Dex (Dexter) Horthy — inventory of published work, 2025-06-01 to 2026-11-04

Compiled 2026-11-04 by one Sonnet research agent (144 tool uses) for the FixFlow harness-ideas research track. Nothing was installed. This is a STARTING INDEX for the research session, not a finished sweep: X/Twitter pages returned HTTP 402 and YouTube pages returned only navigation chrome, so every X and YouTube item below is dated from a third-party page and its content is unread. The research session must read those through transcripts, mirrors or summaries and must look for anything this inventory missed.

Status key (last field on each item): F = page fetched with WebFetch (a small-model summary, so wording is paraphrased); S = search snippet only; L = listed on HumanLayer's own "All Resources" page but not independently fetched.

Best starting index: HumanLayer's "All Resources" page lists 78 items chronologically, mostly Dex's: https://www.humanlayer.dev/blog/humanlayer-resources (F). Owner-curated: treat as the index, not independent confirmation.

Authorship caveat: several HumanLayer blog posts are by Kyle Mistele (CTO), not Dex; marked "Kyle".

---

## (A) The four items the owner named, with latest update dates

### A1. 12-Factor Agents
- https://github.com/humanlayer/12-factor-agents (F). Dormant: last commit 2025-09-21 ("there will be no v1.1"); 273 commits, ~27k stars, 2k forks, a `workshops/` folder; no 2026 content in the README.
- 2026 activity is elsewhere: AI That Works #40 (2026-01-13; YouTube 2026-01-19) "Applying 12-Factor Principles to Coding Agent SDKs".
- Argues: production agents are mostly deterministic code with LLM steps inserted; own your prompts, context, state and control flow.
- Talks: AI Engineer World's Fair 2025 (17:06) https://ai.engineer/talks/8kMaTybvDUw-12-factor-agents (F), YouTube 2025-07-03 https://www.youtube.com/watch?v=8kMaTybvDUw (L); MLOps Community "Agents in Production 2025" 2025-08-06 https://home.mlops.community/public/videos/12-factor-agents-patterns-of-reliable-llm-applications-dexter-horthy-agents-in-production-2025-2025-08-06 (F).

### A2. Advanced Context Engineering for Coding Agents (talk and repo)
- Repo https://github.com/humanlayer/advanced-context-engineering-for-coding-agents (F): last updated 2026-10-16; 56 commits, ~2.8k stars. `ace-fca.md` last edited 2025-12-03 (before that 2025-10-08). The repo is now Dex's long-form essay shelf: `wsff.md` (2026-07-22/23), three SlopCodeBench reports, a `side-quests/` folder.
- Blog post https://www.humanlayer.dev/blog/advanced-context-engineering (listed 2025-08-29): research/plan/implement and "frequent intentional compaction" for brownfield codebases.
- YC Root Access talk 2025-08-25 https://rosetta.to/u/ycrootaccess/advanced-context-engineering-for-agents (F): claims a merged PR on a 300k-line Rust codebase and a 7-hour session producing ~35k lines.
- AI That Works #17 (2025-08-06) https://www.youtube.com/watch?v=42AzKZRNhsk (L).
- Follow-up talk: "No Vibes Allowed: Solving Hard Problems in Complex Codebases", AI Engineer Code 2025 (Nov 2025; YouTube 2025-12-02) https://ai.engineer/talks/rmvDxxNubIg-context-engineering-for-complex-codebases (F); https://www.youtube.com/watch?v=rmvDxxNubIg (L).

### A3. HumanLayer blog and product posts
Blog index https://www.humanlayer.dev/blog (F): 12 posts, newest 2026-10-23. Posts live at `https://www.humanlayer.dev/blog/<slug>` (`hlyr.dev/blog/<slug>` also resolves).

| Date | Post | Author | Status |
| --- | --- | --- | --- |
| 2026-10-23 | Open sourcing HumanLayer | Dex | F |
| 2026-09-04 | HumanLayer - All Resources | not stated | F |
| 2026-08-12 | show-me: a coding agent skill for compact visual representations | Dex | F |
| 2026-05-15 | Context Forking to Save Time, Tokens and Trouble | Kyle | F |
| 2026-03-23 | Long-Context Isn't the Answer | Kyle | F |
| 2026-03-17 | Getting Claude to Actually Read Your CLAUDE.md | Dex | F |
| 2026-03-12 | Skill Issue: Harness Engineering for Coding Agents | Kyle | F |
| 2026-01-06 | A Brief History of Ralph | Dex | F |
| 2025-12-09 | Context-Efficient Backpressure for Coding Agents | Dex | F |
| 2025-11-25 | Writing a good CLAUDE.md | Kyle | F |
| 2025-08-29 | Advanced Context Engineering for Coding Agents | not checked | listed only |
| 2025-04-03 | 12 Factor Agents | not checked | listed only |

Summaries of the 2026 posts:
- Open sourcing HumanLayer: core is Apache-2.0; includes the desktop app, the daemon, the cloud API, the humanlayer-pi and humanlayer-opencode plugins, the RPI skills, the Linear CLI. Says nothing about CodeLayer. Planned: third-party keys optional; AWS, IaC and Kubernetes deployment options.
- show-me: a skill that has agents explain code with diagrams, trees and diffs instead of prose. Install: `npx skills add humanlayer/skills --skill show-me`.
- Context Forking: fork a conversation back to an earlier turn to reuse built-up context.
- Long-Context Isn't the Answer: a 1M-token window does not improve instruction-following; use sub-agents to keep context small.
- Getting Claude to Actually Read Your CLAUDE.md: wrap task-specific sections in `<important if>` conditions; repo `humanlayer/skills`, plugin `improve-claude-md`.
- Skill Issue: failures are usually harness configuration, not the model; covers CLAUDE.md, MCP, skills, sub-agents, hooks and back-pressure.
- A Brief History of Ralph: Geoff Huntley's loop technique (Dex first saw it June 2025); Dex criticises Anthropic's official ralph-wiggum plugin.
- Context-Efficient Backpressure: a wrapper script (`hack/run_silent.sh` in humanlayer/humanlayer) that trims test and build output.
- Writing a good CLAUDE.md: keep it short and universally applicable.

Marketing site https://www.humanlayer.dev (F): "multiplayer control plane for your software factory", a six-phase QRSPI workflow, pricing (Starter free, Pro $100/user/month, Enterprise custom), SOC 2 Type II claim; no changelog; footer says © 2025. The "RPI to QRSPI" link 307-redirects to the AI Engineer Miami keynote video https://www.youtube.com/live/6IxSbMhT7v4 (t=1943).

Docs https://docs.humanlayer.com (F): new docs site shipped with release 0.117.3 on 2026-06-19. Release notes https://docs.humanlayer.com/release-notes (F): ~60 versioned entries from 0.101.7 (2026-06-06) to 0.201.0 (2026-11-02). Landmarks: RPI as the default workflow (0.101.7); Hobby free plan and "CodeLayer" still named (0.115.0, 2026-06-17); session handoff between Claude Code and Codex (0.179.0); `/hl:orchestrate` skill (0.182.0); pi session support (0.181.0); minimalist UI beta with multiplayer prompting (0.183.0); Fold preview (0.165.0); "Context Shards" early access (0.164.0).

### A4. CodeLayer
- Repo https://github.com/humanlayer/humanlayer (F): last release 0.201.0 on 2026-11-02 ("worktrees for directory tasks in the minimalist UI"); 2,129 commits, ~12.8k stars, Apache-2.0; README says it runs Claude Code, Codex, OpenCode and Pi on your own machines; README does not use the word "CodeLayer"; internal package names say "riptide" (`riptide-daemon`, `riptide-ui`). Inferred (not stated by any source): Riptide is Dex's internal Claude Code orchestration tool (per AI Tinkerers 2026-03-04) and the product is now branded HumanLayer; a `riptide-rpi` plugin repo also exists.
- Install: Homebrew cask `codelayer` in https://github.com/humanlayer/homebrew-humanlayer (F, updated 2026-11-02). Nightlies `codelayer-0.1.0-nightly-*` 2026-02-15 to 02-27 (F; no feature text). Earlier stable v0.18.x around 2025-12-01 (S).
- External: Anthropic customer story 2025-11-17 https://www.claude.com/blog/building-companies-with-claude-code (F): CodeLayer runs parallel Claude sessions; large pilots since Q4 2025. AI That Works #33 "Using CodeLayer to Build CodeLayer" 2025-11-25/26, https://x.com/dexhorthy/status/1993159345497051304 (S), https://www.youtube.com/watch?v=fF3GssyaTcc (L).
- Related repos: `agentlayer` (SDK for building custom coding agents, MIT, 348 commits, updated 2026-10-03; contains a `codelayer` CLI package) https://github.com/humanlayer/agentlayer (F); `riptide-rpi` (Claude Code plugin for RPI on Linear tickets, updated 2025-12-29, 7 commits) https://github.com/humanlayer/riptide-rpi (F).

---

## (B) Everything else, newest first

### November 2026
- 2026-11-03 | podcast/video | AI That Works #80 "Using AI for Writing" (weekly show hosted by Vaibhav Gupta and Dex; marked upcoming) https://github.com/ai-that-works/ai-that-works (F via README).
- 2026-11-01 | repo | humanlayer/skills: "rpi: bump version to 1.1.0"; Oct 31 commits add a prose reference and a document-review step https://github.com/humanlayer/skills/commits/main (F).
- 2026-10-27 | video | AI That Works #79 "Building Evals on Production Data" (upcoming; the only evals item found).

### October 2026
- 2026-10-24 | repo | humanlayer/fold: an Effect-native, provider-agnostic agent core with an optional coding agent, CLI and TUI; sub-agents, "RLM-like orchestration", auto-compaction; MIT, 228 commits; `@humanlayer/fold`; ~180 stars https://github.com/humanlayer/fold (F).
- 2026-10-22 | talk | AGNTCon + MCPCon North America, San Jose, "There Is No Software Factory Without Better Verifiers". Scheduled; no recording or write-up found. Promo blog 2026-09-10 (AAIF) https://aaif.io/blog/dex-still-thinks-long-running-coding-agents-stink (F); talk page https://agntcon-mcpcon-na-2026.sessionize.com/session/1291877 (F, empty). A WeAreDevelopers listing gives a variant title "There's no dark factory without better software verifiers" (S).
- 2026-10-20 | video | AI That Works #78 "Software Factory Debate" (guest Zach, CTO of Warp).
- 2026-10-15 | essay | "SlopCodeBench update 10/2026 - Opus 5.5 update, Astra improves by 1.5% over gpt-5.5, xhigh considered harmful" (Dex with Gabe Orlanski): strict pass rates 12.2% to 16.3%; medium effort often matched or beat xhigh at lower cost. File `benchmarking-new-models-on-slop-code-bench.md` in the advanced-context-engineering repo (F).
- 2026-10-06 | video | AI That Works #77 "Building a Memory Pipeline".
- 2026-10-03 to 10-16 | repos (humanlayer org listing, F): `humanlayer-pi` (10-06, alpha; mirrors pi sessions; 39 stars); `humanlayer-opencode` (10-06, alpha; OpenCode 2; 14 stars); `effect-machine` (fork, 10-03); `effect-channels` (10-16); `ampere` (state-machine WAL parser, 10-15); `effect-durable-streams` (08-31) and `-client` (09-16); `electric` (agent platform built on sync, 08-12); `distilled` (Effect SDKs for cloud providers, 06-17); `rpi-coordination-template` (08-03; multi-repo RPI template, 40 stars) https://github.com/humanlayer/rpi-coordination-template; `claudelayer` (2026-01-12, sub-agent recursion); `mcp-cli` (2025-11-26, MCP server to CLI for sub-agents).
- 2026-10-05 to 10-08 | repo | skills "portable RPI": commits make the RPI workflow portable across coding agents, with a research-question phase and templates (F).

### September 2026
- 2026-09-30 | podcast | Beyond Coding ep. 270 "Why Coding Agents Keep Making Your Codebase Worse" (code-quality benchmarks, design docs) https://podcasts.apple.com/us/podcast/why-coding-agents-keep-making-your-codebase-worse/id1572440477?i=1000792424627 (F).
- 2026-09-23/25 | talk | WeAreDevelopers World Congress 2026 North America, San José, "State of the Software Factory" (~24–30 min): scale a factory with deterministic guardrails plus strict human oversight https://www.wearedevelopers.com/videos/100484-state-of-the-software-factory (F, .md variant); YouTube "State of the Software Factory - Sept 2026" listed 2026-09-21 https://www.youtube.com/watch?v=-w6RDNBAI0E (L).
- 2026-09-21 | video | "HumanLayer Collaboration Demo" https://www.youtube.com/watch?v=KpthJTIwnAo (L).
- 2026-09-17 | repo | `visual-pr` skill added to humanlayer/skills (PRs with a visual outline) (F).
- 2026-09 | AI That Works #72 Code Mode for Extensible Software; #73 Software Factories: Hands on with Real Builders; #74 Performance Engineering; #75 All About Jev; #76 GTM Engineering and AI at Rippling (F via README).
- 2026-09-18 (year plausibly 2026) | thread | X post sharing the "Why Software Factories Fail" recording https://x.com/dexhorthy/status/2100900279021363244 (cited by the ai.engineer bio; not fetched).

### August 2026
- 2026-08-28 (session 08-25) | video | AI That Works #71 "Software Factory Design Patterns" https://youtu.be/tGbjIvvYuHE?t=1327 (L).
- 2026-08-26 | workshop | LinearB "The great software factory debate: How do you know it's working?" (Dex, Aloke Desai of Warp, Dan Lines, Andrew Zigler) https://linearb.io/event/the-great-software-factory-debate-2 (F).
- 2026-08-13 | podcast | The Weekly Dev's Brew ep. 21 "What Actually Gets You 2-3x With AI Coding" (host Jan-Niklas Wortmann; "You can't get 10x") https://www.wordman.dev/podcast/dex-horthy-what-actually-gets-you-2-3x-with-ai-coding/ (F).
- 2026-08-12 | X article | "/show-me: compact visual representations for coding agents" https://x.com/dexhorthy/status/2087569590268391897 (L; 402).
- 2026-08-05 | podcast | Heavybit High Leverage ep. 12 "The Limits of Lights-Out Coding" (host Joseph Ruscio) https://www.heavybit.com/library/podcasts/high-leverage/ep-12-the-limits-of-lights-out-coding-with-dexter-horthy (F).
- 2026-08-04 | essay | "SlopCodeBench: Sol, Fable and Kimi": strict pass rate 33.3% for Fable and Sol; Kimi K3 26.7% and 23.3%. File `benchmarking-sol-fable-kimi-on-slop-code-bench.md` (F).
- 2026-08-07 (session 08-04) | video | AI That Works #68 "SlopCodeBench" https://www.youtube.com/watch?v=Yh4eL60Ncxs (L).
- 2026-08-07 | video | "David Ondrej: Agentic Engineering Workflow" https://www.youtube.com/watch?v=xgkjtF89-44 (L; Dex's participation unverified).
- 2026-08-09 to 08-13 | repo | `show-me` skill added to humanlayer/skills (F).
- 2026-08 | AI That Works #69 Unconference Recap (08-11); #70 Syncs and A/B Testing 200 Agents (08-18).

### July 2026
- 2026-07-29 | thread | "Pragmatic Leverage in the Software Factory" https://x.com/dexhorthy/status/2082510831858893115 (L).
- 2026-07-27 | essay | SlopCodeBench Opus 5 report: Opus 5 passed 4 of 17 checkpoints (24%); Opus 4.8 and Sonnet 5 passed 1 each. X article part 3 "Benchmarking the New Frontier" https://x.com/dexhorthy/status/2081797628552270027 (L); HN https://news.ycombinator.com/item?id=49076391 (L); report https://github.com/humanlayer/advanced-context-engineering-for-coding-agents/blob/main/benchmarking-opus-5-on-slop-code-bench.md (F).
- 2026-07-24/25 | X articles | part 1 "The Harness Is Not Enough" https://x.com/dexhorthy/status/2080697380379427275 and part 2 "Turning the Lights Back On" https://x.com/dexhorthy/status/2081058573556306030 (L; both 402).
- 2026-07-24 | video | "HumanLayer Live Demo: Building a Product Spec for compounding agent memory" https://www.youtube.com/watch?v=rTn8Vhdt-Jo (L).
- 2026-07-22/23 | essay | "Why Software Factories Fail" (`wsff.md`): lights-off factories fail because models are trained on test-passing rewards, which do not capture maintainability; the fix is up-front product review, architecture, program design and vertical slices, aiming for 2–3x https://github.com/humanlayer/advanced-context-engineering-for-coding-agents/blob/main/wsff.md (F); HN 2026-07-23 https://news.ycombinator.com/item?id=49023019 (L); short link hlyr.dev/wsff-live.
- 2026-07-23 (upload; recorded 2026-06-30) | talk | AI Engineer World's Fair 2026 keynote "Harness Engineering is not Enough: Why Software Factories Fail" (19:18) https://ai.engineer/talks/Ib5GBkD555M-why-software-factories-fail (F); https://agents.conffab.com/worlds-fair/live/day-1-keynotes/sessions/1782862200.md (F); https://www.youtube.com/watch?v=Ib5GBkD555M (L).
- 2026 (AIEWF, ~2026-06-30/07-01) | talk | "The Great Loops Debate" (1:00:16; Dex, Geoff Huntley, Ian Livingstone, Greg Pstrucha; moderator Allie Howe): Dex and Greg accept unattended loops only for mechanical, test-gated work https://ai.engineer/talks/c35YoMdnI78-great-loops-debate (F); https://www.youtube.com/watch?v=c35YoMdnI78 (L).
- 2026-07-25 | video | "Loops Engineering from First Principles" (Kyle Mistele, not Dex) https://www.youtube.com/watch?v=xIt_mTQp6mY (L).
- 2026-07-17 | video | "Frontier AI Coding Benchmarks" https://www.youtube.com/watch?v=X5mI1ZVxaIc (L).
- 2026-07-15 | podcast | The Pragmatic Engineer, "Context engineering with Dex Horthy" (Gergely Orosz, 1h33m, timestamps): context engineering, harness, loops, the lights-off failure (July to November 2025), RPI, "token harder vs smarter" https://newsletter.pragmaticengineer.com/p/context-engineering-with-dex-horthy (F); https://www.youtube.com/watch?v=Usufn8IQJgw (L).
- 2026-07-14 | claim | "killing the pull request": BigGo aggregator only (S); no primary post found https://finance.biggo.com/news/15099f5634f5ab9a.
- 2026-07-07 | podcast | Mastra "Agents Hour", "The Software Factory: Dex Horthy on Shipping Fast Without AI Slop" (~23 min) https://mastra.ai/podcasts/the-software-factory-dex-horthy-on-shipping-fast-without-ai-slop (F).
- 2026-07 | AI That Works #64 Agent Observability (07-07); #65 SOTA Coding Agent Benchmarks (07-14); #66 No Vibes Allowed: July Edition (07-21); #67 Your Model is Already Obsolete (07-28).

### June 2026
- 2026-06-30 | repo | `design-control-loop` skill added by Kyle (K-Mistele), one of several Kyle-added skills (June 21–30) in humanlayer/skills (F).
- 2026-06-26 | video | "AI That Works: Building Your Own Software Factory" https://www.youtube.com/watch?v=485FGIq8LKM (L).
- 2026-06-17 | thread/video | HumanLayer launch video https://x.com/dexhorthy/status/2067286892786454855 (L).
- 2026-06 | AI That Works #60 Agents that Work in Any Language (06-02); #61 Hands-on with Fable 5 (06-09); #62 Product Specs with AI (06-16); #63 Software Factory for Agent Tools (06-23).
- 2026-06 | thread | AI-generated specs and slop https://x.com/dexhorthy/status/2068004719298228236 (cited by the Pragmatic Engineer page; X not fetched).

### May 2026
- 2026-05-28 | podcast | Screaming in the Cloud ep. 674 "Coding Agents, Chaos, and the Future of Dev Work" (Corey Quinn; expects many agents to drop general bash tools by end of 2026) https://www.lastweekinaws.com/podcast/screaming-in-the-cloud/coding-agents-chaos-and-the-future-of-dev-work-with-dexter-horthy/ (F).
- 2026-05-20 | podcast | Qodo "Closing the gap: AI agent hype and production reality" https://www.qodo.ai/podcasts/closing-the-gap-ai-agent-hype-and-production-reality/ (F).
- 2026-05-13 | repo | dexhorthy/shannon: "Alternative to `claude -p` that lifecycles interactive sessions in tmux"; reads the on-disk transcript; MIT, 58 commits, ~250 stars; npm `@dexh/shannon` https://github.com/dexhorthy/shannon (F).
- 2026-05 | AI That Works #56 OpenAI tells you not to build your own harness (05-05); #57 "Code Mode" Deep Dive (05-12); #58 How AI Agents Can Safely Ship Code to Production (05-19); #59 No Vibes Allowed: Performance Engineering (05-26).
- 2026-04-24 to 05-11 | repos (dexhorthy) | `executor` (fork), `better-github` (Apr 30), `gstack` (fork, Apr 24) https://github.com/dexhorthy?tab=repositories (F).

### April 2026
- 2026-04-20 | talk | AI Engineer Miami keynote "Everything We got Wrong About RPI" (day 1, 9:40): adopting context engineering across large organisations, splitting research and planning into discrete steps, control flow instead of prompting https://ai.engineer/miami/2026 (F); video https://www.youtube.com/live/6IxSbMhT7v4 (F, title only).
- 2026-04-27 (session 04-21) | video | AI That Works #54 "Harness Engineering Without the Hype" https://www.youtube.com/watch?v=gX9WpYY61xA (L). Also April: #52 SSE Streaming; #53 Agentic Coding for Frontend Apps; #55 No Vibes Allowed: Building Design Docs with AI.

### March 2026
- 2026-03-26 | newsletter/interview | The Humans in the Loop deep dive "Making AI Agents Mainstream" (Heavybit): why RPI failed for some teammates (a planning prompt with ~85 instructions; research prompts returning opinions); introduces the seven-step QRSPI https://thehumansintheloop.substack.com/p/making-agents-mainstream-for-dev-with-dexter-horthy (F).
- 2026-03-24 (publication; recorded 2026-03-03) | talk | "Everything We Got Wrong About Research-Plan-Implement". Venue disputed (Podwise: AAIF Live, 2026-03-24; DarkFactory.dev: Coding Agents Conference, MLOps Community, 2026-03-03; a GitHub README credits MLOps.community). HumanLayer's resources page lists the same YouTube ID as "Lessons Learned Rolling Out RPI to Hundreds of Engineers" (2026-03-24). https://www.youtube.com/watch?v=YwZR6tc7qYg; https://podwise.ai/episodes/7669928 (F). PRIMARY SOURCE FOR QRSPI (acronym spelled inconsistently: CRISPY, CRISPI, QRSPI).
- 2026-03-23 | blog | Long-Context Isn't the Answer (Kyle). See A3.
- 2026-03-22 | podcast | Build Wiz AI Show "How to Ship Complex Features 10x Faster with AI Agents" (21 min) https://brapodd.se/podd/build-wiz-ai-show/avsnitt/how-to-ship-complex-features-10x-faster-with-ai-agents (F).
- 2026-03-18 | repos | humanlayer/skills created (`improve-claude-md`); dexhorthy/slopfiles ("curated list of coding agent plugins") (F).
- 2026-03-17 | article | Heavybit "What's Missing to Make AI Agents Mainstream?" (the long-form interview the Substack reprints) https://www.heavybit.com/library/article/whats-missing-to-make-ai-agents-mainstream (F).
- 2026-03-06 | video | Latent Space "In-Context Cooking": "Why Your AI Agents Don't Work" / "The Problem With AI Demos" (24 min): the "dumb zone" heuristic, start wrapping up around 40% of the window https://www.youtube.com/watch?v=jTEqdoB_mmo (F, title only); summary https://finance.biggo.com/podcast/5e883f348c571fb7 (F, third-party); date https://podwise.ai/episodes/7406903 (S). Channel attribution from BigGo only.
- 2026-03-04 | podcast | AI Tinkerers "One-Shot" "How to Ship Complex Features 10x Faster with AI Agents" (Joe Heitzeberg): Riptide, the Claude Code orchestration tool, levels of autonomy https://one-shot.aitinkerers.org/p/how-to-ship-complex-features-10x-faster-with-ai-agents-dex-horthy-humanlayer (F).
- 2026-03-06 onward | threads (all L) | "Software Factory Existential Risk" https://x.com/dexhorthy/status/2031394747869192431; "Why review agents do not solve slop" https://x.com/dexhorthy/status/2032915117294449006; "Spec is the new code is not enough" https://x.com/dexhorthy/status/2033980486813684181; context limits and 1M windows https://x.com/dexhorthy/status/2032198500063330703; "Token harder vs smarter" https://x.com/dexhorthy/status/2038101619720781941; AIE Miami teaser https://x.com/dexhorthy/status/2033980488688541696 (S).
- 2026-03 | AI That Works #47 PII Redaction (03-03); #48 Claude Agent Skills Deep Dive (03-10); #49 Prompt Injections Guardrails (03-17); #50 MCP is Dead? (03-24); #51 No Vibes Allowed March Edition (03-31).

### February 2026
- 2026-02-17 | podcast | Dev Interrupted (LinearB) "Dex Horthy on Ralph, RPI, and escaping the Dumb Zone" (Andrew Zigler): Ralph economics ~$10–11/hour with Sonnet https://linearb.io/dev-interrupted/podcast/dex-horthy-humanlayer-rpi-methodology-ralph-loop (F).
- 2026-02-16 (session 02-10) | video | AI That Works #44 "Agentic Backpressure Deep Dive" https://www.youtube.com/watch?v=Zx_GOhGik0o (L). Also #43 Prompting Is Becoming a Product Surface; #45 AI Content Pipeline Revisited; #46 No Vibes Allowed February.
- 2026-02-15 to 02-27 | releases | CodeLayer nightlies. See A4.

### January 2026
- 2026-01-26 | podcast | The Infra Pod "Let's chat about vibe coding & Ralph!" (~42 min) https://podscripts.co/podcasts/the-infra-pod/lets-chat-about-vibe-coding-ralph-chat-with-dexter-at-humanlayer (S).
- 2026-01-16/17 | livestream | Matt Pocock "LIVE: Chat with AI Coding Wizard Dex Horthy" (46 min; CodeLayer, the smart zone, Ralph) https://podwise.ai/episodes/6912320 (F; third-party summary).
- 2026-01-19 (session 01-13) | video | AI That Works #40 "Applying 12-Factor Principles to Coding Agent SDKs" https://www.youtube.com/watch?v=qgAny0sEdIk (L). Also #39 Latency (01-06); #41 Email is All You Need (01-20); #42 No Vibes Allowed (01-27).
- 2026-01-12 | repo | humanlayer/claudelayer "Sub-agent recursion with Claude Code" (5 commits, 26 stars) https://github.com/humanlayer/claudelayer (F).
- 2026-01-06 | blog | A Brief History of Ralph. See A3.
- 2026-01-03 (text says Jan 1) | video | "Ralph Wiggum Showdown with Geoffrey Huntley" https://www.youtube.com/watch?v=SB6cO97tfiY (L).
- 2026-01 to 03 | repos | dexhorthy/kustomark-ralph-bash and -plugin (Jan 2 to Mar 9) (F).

### June to December 2025
- 2025-12-09 | blog | Context-Efficient Backpressure. See A3.
- 2025-12-03 and 2025-10-08 | edits | `ace-fca.md` updated. See A2.
- 2025-12-02 | talk | "No Vibes Allowed", AI Engineer Code Summit (Nov 2025); recap https://www.startuphub.ai/news/ais-codebase-conundrum-humanlayers-context-engineering-breakthrough (F, 2025-12-03). Also listed: "Using CodeLayer to Build CodeLayer" (L).
- 2025-11-26 | repo | humanlayer/mcp-cli (one commit) https://github.com/humanlayer/mcp-cli (F).
- 2025-11-17 | customer story (Anthropic's, not his). See A4.
- 2025-10-28 | video | AI That Works "Ralph Wiggum Under the Hood: Coding Agent Power Tools" (with Geoff Huntley) https://www.youtube.com/watch?v=fOPvAPdqgPo (L).
- 2025-10-16 | video | "No Vibes Allowed: Live Coding with AI Agents" https://www.youtube.com/watch?v=zNZs19fIDHk (L).
- 2025-09 | milestones | HumanLayer #1 on GitHub Trending https://x.com/dexhorthy/status/1971963973332525187 (L). Threads (L): the triple pendulum of context management in sub-agents https://x.com/dexhorthy/status/1959708047066206404; brownfield vs greenfield; "coding agents don't use frameworks"; the right UX for sub-agents.
- 2025-08-29 | essay | "Getting AI to Work in Complex Codebases" (`ace-fca.md`); HN 2025-09-23 https://news.ycombinator.com/item?id=45347532 (L).
- 2025-08-25 | talk | YC Root Access. See A2.
- 2025-08-20 | claim | CodeLayer introduced as a private beta at a YC talk (S; date unconfirmed).
- 2025-08-06 | talks | MLOps Community "Agents in Production" and AI That Works #17. See A1 and A2.
- 2025-07-17 | repo | 12-factor-agents "workshop stuff" commits (F).
- 2025-06 | origin | Ralph first seen at a June 2025 SF meetup, per Dex (Jan 2026 blog; Dev Interrupted).

---

## (C) Follow-ons and coverage by others (NOT Dex's work)

- Harrison Chase / LangChain, "The rise of context engineering", 2025-06-23: cites 12-Factor Agents https://www.langchain.com/blog/the-rise-of-context-engineering (F).
- Latent Space AI News, "Context Engineering: Much More than Prompts", 2025-06-25 https://latent.space/p/ainews-legacy-25-06-25-context-eng/ (F).
- Trey Causey, "Getting AI to Work in Complex Codebases", 2025-09-24 https://www.treycausey.com/commonplace/2025-09-24-github-com-humanlayer-advanced-context-engineering-for-coding-agents-blob-main-ace-fca-md/ (F).
- Aaron Levie shout-out, ~2025-08/09 https://x.com/levie/status/1962319895070458241 (L).
- Tyler Burleigh, "Research, Plan, Implement, Review", 2026-02-22 (adds per-phase review) https://tylerburleigh.com/blog/2026/02/22/ (F).
- Alex Lavaee, "From RPI to QRSPI" (undated, after 2026-03-26) https://alexlavaee.me/blog/from-rpi-to-qrspi/ (F).
- agent-brain wiki, QRSPI concept page https://cussid-huaz.github.io/agent-brain/concepts/ai/qrspi/ (F).
- Community QRSPI repos (reconstructions, not official): ebullient/modified-qrspi (F) https://github.com/ebullient/modified-qrspi; matanshavit/qrspi, Allan-Nava/qrspi, jaeyunha/QRSPI-workflow (S).
- Turing Post, "Agentic Coding: RPI, Context Engineering & Subagents" (403) https://www.turingpost.com/p/aisoftwarestack.
- Addy Osmani, "Software Factories, Light and Dark", 2026-07-20 https://addyosmani.com/blog/software-factories/ (F).
- Hungry Minds newsletter, 2026-07-27 https://hungrymindsdev.substack.com/p/software-factories-harnessing-loops (F).
- DarkFactory.dev, 2026-08-06, "Dex Horthy retracts Research-Plan-Implement" https://darkfactory.dev/news/2026-08-06-morning/story-3 (F).
- Latent Space (Richard MacManus), AIEWF Daily Dispatch, 2026-07-03 https://www.latent.space/p/aiewf-daily-dispatch-locomotives (F).
- StartupHub.ai, 2025-12-03 recap (F).
- Mastra 12-factor examples jagreehal/mastra-12-factor-examples (L); Harrison Chase's response thread https://x.com/hwchase17/status/1914821956148551896 (L).
- Upstream sources Dex builds on: Geoff Huntley's Ralph https://ghuntley.com/ralph/; SlopCodeBench (arXiv 2603.24755; runner `SprocketLab/slop-code-bench`).
- Tessl "Inside the Dark Factory" (2026-07-28) does NOT involve or cite Dex https://tessl.io/podcast/116/ (F).

---

## Search angles that returned nothing (do not repeat blindly; do re-try with other tools)

- Podcasts: no Dex guest episode found on Latent Space (main feed), MLOps Community's own feed, Software Engineering Daily, Dev Interrupted before Feb 2026, Dwarkesh, AI Engineering Podcast, Gradient Dissent, Cognitive Revolution.
- AI Engineer Paris, London and Europe 2026: no Dex talk found (his AI Engineer appearances: World's Fair 2025 and 2026, Code 2025, Miami 2026).
- Newsletter/Substack: Dex has no newsletter found; substack.com/@humanlayer is unrelated.
- "Kill the pull request": no primary source.
- AGNTCon 2026-10-22 talk: no recording or write-up.
- WeAreDevelopers Sept 23 session: only the profile and video page.
- Anthropic's "Effective context engineering" post: no credit to Dex found; no evidence Simon Willison's June 2025 posts mention Dex.
- 12-factor-agents 2026 content: none.
- humanlayer.dev has no changelog (it is at docs.humanlayer.com/release-notes).
- Page problems: humanlayer.com and wearedevelopers.com/@dexter-horthy failed DNS here (the `.md` variant worked for the latter); YouTube pages yield no dates or descriptions; The Infra Pod, Turing Post and x.com pages were 403/402; "shannon" via search returned nothing (direct GitHub fetch worked); "Lessons Learned Rolling Out RPI" appears to be the same video as "Everything We Got Wrong".
