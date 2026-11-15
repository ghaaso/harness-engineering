# Dossier: block "method" (mechanisms: method, other)

12 bottlenecks and 78 ideas. Numbers carry tags: [M] measured, [E] estimated, [G] guess, [S] setting or outside figure, [T] target, [I] illustrative.

## Bottlenecks

### MC-PREBUILD · Native prebuild would pollute the repo
family machine; state: Closed: Forbidden in agent rules; L2 builds in container; package WP1; metrics: quality (primary quality)
what: Running Expo prebuild in the repository would create an untracked technician-app/android folder that is not gitignored and changes how EAS treats the project.
evidence: Not sized. The folder would make EAS treat the app as bare and skip its config plugins (see Bare app / config plugins).
what fixing it unlocks: Safe native builds: prebuild runs only inside the L2 container, never in the repository.
first step: Keep the rule in agent briefs; let only the L2 compile container run prebuild.

### MC-INJECT · Agents without approval prompts work near stored credentials
family machine; state: Open: Canary trial designed, not run; package WP1; metrics: quality (primary quality)
what: Subagents run in bypass mode while Railway and GitHub CLI credentials sit in the user profile, so a prompt injection could reach private data.
evidence: Not quantified. Credentials in the profile plus bypass-mode subagents form the exposure.
what fixing it unlocks: Cutting the private-data leg removes this whole risk class for research agents.
first step: Define one restricted research agent type with deny rules; run the ten-minute canary.

### MC-TIMEOUT · Re-issuing a command after a timeout
family check; state: Closed: Rule plus fixed names make second starts fail; package WP2b; metrics: quality, efficiency (primary quality)
what: Re-issuing a mutating command after the tool times out can duplicate its effects.
evidence: Tool timeout 600,000 ms per command [S].
what fixing it unlocks: Safe retries after a timeout, with no duplicated containers, writes or runs.
first step: On a timeout, re-check state (docker wait again) before issuing anything new.

### PR-MOBILEBOUNDARY · Mobile code boundaries not enforced
family check; state: Open: Planned: dependency-cruiser in P5b-2; package WP9; metrics: quality (primary quality)
what: The mobile app has no import contract, so the rule that writes go only through the outbox exists only in prose.
evidence: 1 of 3 runtimes has no boundary enforcement [M]; the repository is about 56k lines.
what fixing it unlocks: The 'writes only through the outbox' invariant enforced by CI instead of by memory.
first step: Write dependency-cruiser import rules for technician-app, as planned in P5b-2.

### PR-SEVERITY · Severity labels drift between stages
family review; state: Open: Inertia mitigated by judgement-free discovery rule; package WP3; metrics: quality, efficiency (primary quality)
what: Output schemas carry no descriptions, so P0-P3 are undefined to the model; a cheap first impression can harden into a priority, and skeptics often lowered severities.
evidence: 8 of 12 skeptic verdicts in G2 lowered a severity [M].
what fixing it unlocks: Defining each value once could raise analyst-skeptic agreement and give cleaner priorities.
first step: Run the one-agent probe that tests whether schema descriptions reach the model.

### PR-CAPS · Silent caps hid findings
family review; state: Closed: Closed in v3 by backlog and open-risks list; package WP3; metrics: quality, hallucination (primary quality)
what: Per-analyst caps and truncation made omitted findings invisible.
evidence: The v2 design capped each analyst at 6 findings [S].
what fixing it unlocks: Every claim either visible or logged, so nothing is dropped unseen.
first step: Check the logged drop counts; correct the two stale design lines.

### W4 · Agents lack tested domain skills
family orchestrator; state: Partly closed: Packages in PR #185, merged on 13 Nov; checks not run; package WP10b; metrics: quality, token_count, efficiency (primary quality)
what: Agents once had one custom agent (a Haiku locator) and no domain skills; the new packages still lack trigger, preload, size and retirement checks.
evidence: Design section 9 asked for 11 domain skills [M]; 13 skills and 11 agents are now packaged, about 24k characters of descriptions [E]. 72 families, 147 cards [M].
what fixing it unlocks: Every agent starts with the right domain rules; skills are verified, trimmed, and retired when unused.
first step: CI check on skill and agent frontmatter; a trigger tally over six phases; confirm skills preload.

### PR-BRIEFFACTS · Agents start without the settled facts
family orchestrator; state: Partly closed: Gate record first; commit-push-tag before briefing; package WP10a; metrics: hallucination, efficiency, quality (primary hallucination)
what: Agents were briefed before settled facts existed: G2 analysts fell back on hypotheses, sweep assessors lacked design rules, and a lane could read uncommitted plan text.
evidence: One gate record missing at dispatch [M]. 8 of 24 assessment adopts were already programme law [M]. One minor refuter finding on uncommitted plan text [M].
what fixing it unlocks: Every analyst and lane starts from settled, committed facts, with fewer wasted assessment and refuter passes.
first step: Check the gate file exists before dispatch; put the section 5.2 text in the next assessment brief.

### PR-PHASESIZE · Phases too big for one session
family orchestrator; state: Closed: Split into P5b-1/2, P9-0a/b, P5 spike; package WP4; metrics: throughput, time (primary throughput)
what: A delta check found phases too large to finish in one session.
evidence: 3 phases: P5b, P9-0 and P1's CI check [M].
what fixing it unlocks: Predictable, session-sized phases.
first step: Have Opus critics test session fit at each major revision.

### PR-SECRETS · Journaled agent output could keep secrets
family orchestrator; state: Partly closed: Mitigated by a fingerprint-only rule; package WP1; metrics: quality (primary quality)
what: Every workflow output is journaled, so a secret pasted into an output would persist.
evidence: Not sized.
what fixing it unlocks: Secret scanning we can run safely.
first step: Inspect the journal after the S-08 scan.

### LIB-KS-PRIVACY · Private data reaches the model provider
family library; state: Partly closed: mitigated by rule; KS-D7 awaits my answer; package WP6b; metrics: none (primary none)
what: Everything an agent reads reaches Anthropic under my account terms, and customer names and addresses slip past local pattern scrubbing.
evidence: A documented known miss for names and addresses. The design assumes a consumer account with 30-day [S] retention until I state otherwise.
what fixing it unlocks: A safe store by structural rule: no raw production data, only templates with typed placeholders.
first step: I state the account type (KS-D7); keep a known-miss fixture in every test run.

### MC-ACCESS · Research sources blocked or still unread
family retrieval; state: Partly closed: audio solved locally; X replies, LinkedIn, slides unread; package WP7; metrics: none (primary none)
what: YouTube captions, X posts and podcast transcripts were blocked, research agents can lack web tools, and some talks, threads and slides are still unread.
evidence: YouTube answered 429 [M] for five days; X returned 402 [M]. Nine recordings, about 7 hours, transcribed in about 12 minutes [M] of GPU time. 29 [M] items unread first pass.
what fixing it unlocks: Fuller research coverage; the verifiers talk and the Twelve Factor Factories talk may bear on review backpressure (L3).
first step: Reuse the routes that worked (local GPU transcription, fxtwitter for X); read the Twelve Factor Factories talk when available.

## Ideas (most mature first)

### MAC-03 · Files-first outputs and resume-from-disk rules
stage: In use; package WP1; metrics: efficiency, hallucination, throughput (primary efficiency); answers: B03, B12, B16, B04
problem: Session limits stopped lane agents, a resumed workflow re-ran agents that had already edited files, and summaries drifted from the sources.
how: Agents write outputs to files; a state file makes resume from disk idempotent; model-written summaries are re-verified.
where it stands: In use in the testbed: rules after the incidents; recovery manual. Six interruptions [M]; six of eight lanes stopped in run 1 [M]; 133 queries of aborted agents recovered from transcripts [M].
next: Write agent outputs to files and resume from disk state.
origin: Clinic testbed

### MAC-12 · Write scripts with the file tool; give Workflows paths
stage: In use; package WP10a; metrics: token_count, time, quality (primary token_count); answers: MC-HEREDOC
problem: The shell tool collapses doubled backslashes in heredocs, which altered two regular expressions, and Workflow scripts cannot read files.
how: Write every script with the file-writing tool, and give Workflow scripts file paths so agents read the content themselves.
where it stands: In use, adopted from the review addendum. Before the fix, the first attempt of one review run cost 1.38M tokens [M] and 15 minutes [M].
next: Keep using it.
origin: Dex Horthy sweep (review addendum)

### CHK-05 · Race tests decide blocked from the database
stage: In use; package WP2a; metrics: quality (primary quality); answers: B06, PR-FALSEGREEN
problem: Under load a slow second call looked blocked after 0.6 s, so a race test could pass with a broken lock; timing-based race tests are flaky.
how: A helper polls pg_stat_activity (the Postgres list of open sessions) up to 15 s [S] for a session waiting on a lock, with the first call among the blockers.
where it stands: In use: 59 blocked assertions in 13 files migrated [M]; 159 race tests pass in 189 s [M]. It does not show which lock, and serial pass cost is unchanged.
next: Replace remaining sleep-and-check assertions with database-observed waits.
origin: Clinic testbed

### CHK-16 · Named exit-coded gates per runtime
stage: In use; package WP2b; metrics: quality (primary quality); answers: W2
problem: We want agents to hand off only after the typecheck, format and tests ran together, not after a partial or noisy run.
how: Each runtime has a named exit-coded gate: backend in Appendix A, web and mobile as CLAUDE.md chains. A cross-runtime aggregate was weighed.
where it stands: In use per runtime (backend gate, web and mobile chains). A cross-runtime aggregate does not fit a backend gated in Docker on Windows; no verdict on it.
next: Keep using it; revisit an aggregate only with a defined measurement.
origin: Dex Horthy sweep

### CHK-20 · Architecture rules file plus CI boundary checks
stage: In use; package WP2b; metrics: quality (primary quality); answers: -
problem: We want agents not to drift from the architecture, so we keep durable rules and enforce the slice boundaries mechanically.
how: CLAUDE.md invariants state the rules, and import-linter and ESLint boundary checks in CI enforce them.
where it stands: In use in FixFlow: the rules file plus import-linter and ESLint checks already run in CI. An outside team's report confirmed the same shape.
next: Keep using it; the mobile app's boundary checks are a separate idea.
origin: FixFlow repo practice; BAML sweep confirmed

### REV-06 · Screenshot capture and rubric scoring of screens
stage: In use; package WP9; metrics: quality, efficiency (primary quality); answers: B17, B02, B12
problem: We want screen quality and UI changes checked with visible before and after evidence, without a human looking at everything.
how: A capture script screenshots every role and screen at 375 and 1280 px with a manifest; an Opus rubric review and refutation score results.
where it stands: In use in the testbed: 130 pages, 260 PNGs [M]; rubric score rose from 64 to 110 of 160 [M]; of 59 findings 16 fixed, 20 partly, 22 not, 1 regressed [M].
next: Build a Playwright (browser automation) capture for FixFlow's React app; treat model scores as triage only.
origin: Clinic testbed

### REV-14 · Multi-lens architecture panel with judges and refuters
stage: In use; package WP10a; metrics: quality, token_cost, time (primary quality); answers: B3-LOOP, PR-VERIFYBUDGET
problem: A plan repaired in place can hide a wrong foundation, and a design written alone carries blind spots; I wanted the architecture tested before work started.
how: Four Opus architects propose, one lens each; two opposed Opus judges score each area; 45 claims each get two refuters; the main session rules.
where it stands: In use: run once on 1 November with 101 [M] agents, about 10.1M [M] subagent tokens, 34 [M] minutes; verdict: no wrong foundation. 7 [M] refuters were lost to a usage limit.
next: Reuse for the next architecture question, budgeting refuters so none hit a usage limit.
origin: Orchestration design, Harness review, me

### REV-15 · Critique rounds on a design before it runs
stage: In use; package WP10a; metrics: quality, hallucination (primary quality); answers: B12
problem: A design written alone carries blind spots, and finding them after a run is costly.
how: Three Opus critics and two external reviews critique the design; section 11 records each accepted or rejected point with its reason.
where it stands: In use; two rounds done. Version 3 accepted data-preservation, verification buckets, script bookkeeping, gate recipe, dump inspection, evidence and secret rules.
next: Add an Opus critic at Stage 3 for the phase plan.
origin: Orchestration design

### RET-04 · Podcast RSS feeds for transcripts
stage: In use; package WP10a; metrics: quality (primary quality); answers: MC-ACCESS
problem: Show pages expose only part of a podcast's transcript, so research on outside ideas is incomplete.
how: Read the feed's transcript tag; otherwise fetch the audio file attached to the episode (its enclosure).
where it stands: In use for two podcasts: one feed gave a 12,100-word [M] transcript against 1,800 words [M] from the site.
next: Keep using it.
origin: Dex Horthy sweep addendum

### RET-05 · X timeline via fxtwitter; charts read as images
stage: In use; package WP10a; metrics: quality (primary quality); answers: MC-ACCESS
problem: X posts could not be read (HTTP 402) and benchmark numbers sat only in chart images.
how: Page the fxtwitter timeline endpoint for a user's posts and self-replies; give chart images to a reader agent.
where it stands: In use: 197 statuses since 1 September [M], 159 [M] the author's own, plus 7 [M] charts read. Replies under posts are not captured.
next: Keep using it.
origin: Dex Horthy sweep addendum

### MTH-05 · Plan on a branch, tagged before lanes read
stage: In use; package WP4; metrics: quality (primary quality); answers: PR-BRIEFFACTS
problem: The plan, design notes and evidence live on a PR branch, not main, so a lane could read uncommitted text or miss the files.
how: Lanes read the plan branch by absolute path or git show. The coordinator commits, pushes and tags every plan edit before telling a lane.
where it stands: In use: tags plan-v9 and plan-v9.1 exist, and the results file cites the plan at v9.1. No measured effect yet.
next: Tag each later plan edit before briefing lanes.
origin: Ship plan §7

### MTH-06 · Defer phase plan and recipes to Stage 3
stage: In use; package WP4; metrics: quality, efficiency (primary quality); answers: PR-PHASESIZE
problem: Phase design before verified facts would be built on guesses, so we wanted it designed only after the deep-dive.
how: One session per phase; Sonnet for well-specified fixes; Opus for outbox, lifecycle, ledger and migration code; Opus reviewers refute by default.
where it stands: Applied: the orchestration design deferred the phase plan on purpose, and it was designed later as the ship plan, after the second gate.
next: Done: the ship plan took this over.
origin: Orchestration design

### MTH-07 · Staged workflows with judging gates between them
stage: In use; package WP10a; metrics: quality, token_cost (primary quality); answers: B16, PR-BRIEFFACTS, PR-VERIFYBUDGET
problem: We want cheap wide discovery, narrow expensive deep dives and a recorded decision between stages, so the plan is designed only after a verified picture exists.
how: Pre-flight, cheap discovery, gate, Opus deep-dive, gate, phase plan. The main session reads results by id at each gate and writes a record.
where it stands: Both gates written 2026-11-01. Discovery: 16/16 [M] areas, about 1.67M [M] tokens, 14 min [M]. Deep-dive: 8 [M] analysts, 139 [M] findings, about 3.3M [M] tokens, 23 min [M].
next: Keep using a gate record after each later stage.
origin: Orchestration design

### MTH-09 · Brief contract and CONTEXT block for every agent
stage: In use; package WP10a; metrics: quality, efficiency, hallucination (primary quality); answers: PR-BRIEFFACTS, B12
problem: Our agents re-derive project facts, start without a clear task, drift and overstate what was proved. We want every brief complete and every claim cited.
how: A brief names goal, files, branch, settled facts and what done returns, in one paragraph. A fixed context block with rules is prepended verbatim.
where it stands: Used on every brief in the clinic build. No before/after of rework was measured. It does not stop overstated reports: the clinic S11 gate found two unsupported claims.
next: Keep the block short and refresh it per run; reuse the three provenance tags.
origin: Orchestration design; Clinic testbed

### MTH-17 · Briefs in git; contract shapes frozen
stage: In use; package WP10a; metrics: quality (primary quality); answers: -
problem: We want prompt changes to be reviewable and every result traceable to a version.
how: Briefs live in git, runs cite commit hashes, and the fixed return contracts keep their shape so only prose is edited.
where it stands: In use and confirmed in the BAML sweep.
next: Keep using it.
origin: Harness practice

### MSR-02 · Limitations first, no fixes until agreed
stage: In use; package WP6a; metrics: quality (primary quality); answers: -
problem: Fixing before we agree the limitations would hide which ones matter.
how: List and weigh limitations first; the record and map carry no fixes; we use the ranking to agree the list together.
where it stands: In use in the library review: 69 [M] limitations listed and weighed, no fixes agreed. A nine-agent solve round was started and stopped at my request; no fix from it was adopted.
next: Agree the limitation list with me, using the ranking.
origin: My idea; Library review

### MSR-13 · Fit-screen the idea sweeps against bottlenecks
stage: Tested; package WP8; metrics: efficiency, quality (primary efficiency); answers: PR-OUTSIDEEVIDENCE, B01, B12, B17
problem: Both idea sweeps scored ideas against the FixFlow ship plan, never against our 21 bottlenecks, so their verdicts could not carry over.
how: Opus mappers placed kept ideas, Sonnet readers screened dropped ones, adjudicators ruled on flags, refuters attacked claimed fits, and a script checked every id.
where it stands: Tested in three workflows with 19 agents, models reading documents only: 87 kept ideas gave 29 fits [M]; 868 dropped gave 142 flagged and 1 promoted [M].
next: Compile the surviving mechanisms into the build order.
origin: Bottleneck compile

### CHK-27 · Mirror CI environment in the gate
stage: Built; package WP2b; metrics: quality (primary quality); answers: MC-ENVSKEW
problem: A gate with a different environment than CI could pass or fail differently, especially once the backend refuses to boot outside dev or test.
how: The gate reads the environment setting from the worktree's own CI file and passes it on; an older worktree gets none, as CI did.
where it stands: Built into the FixFlow gate script. Not yet tested.
next: Keep; confirm once a phase that changes the boot rule runs through it.
origin: Ship plan §7; refuter findings

### REV-26 · Specialist reviewers for offline sync, migrations, security
stage: Built; package WP10b; metrics: quality (primary quality); answers: W4, L3
problem: Our offline engine, populated-table migrations and security code have FixFlow-specific rules that generic checklists miss or tell agents to wrongly fix.
how: Three sourced skills with paired Opus reviewer agents, each refuting by default and running fixed commands only, never probing a live host.
where it stands: Built: skills and Opus agents in PR #185, merged on 13 Nov; not yet tested.
next: Use them on the P1, P2a/P2b, P6a and P7a reviews.
origin: Skills packages, after TanStack/db and OWASP ASVS

### MTH-67 · Borrow from distributed systems, databases and parallel computing
stage: Built · ADDED FROM CHAT: chats of 1, 2 and 11 November (session e24f17dc, lines 3628 and 3672; session 2a8ce058, lines 3 and 730); package WP10a; metrics: efficiency, quality (primary efficiency); answers: PR-OUTSIDEEVIDENCE
problem: Agent engineering is too new to have its own textbooks, and vendor guidance did not stop me needing a harness.
how: Treat agent problems as known systems problems first: caching, consistency, indexes, scheduling, trees. A lecture list maps each harness problem to its lectures.
where it stands: Built on 11 November: 52 [M] research agents checked 44 [M] course series; a list and transcript library cover six core courses. PAR-22 applies one such structure.
next: Use the list when a package starts; record which lecture an idea came from.
origin: My brief in chats of 1, 2 and 11 November

### SKL-02 · Recovery runbook skill and recovery operator agent
stage: Built; package WP1; metrics: quality, hallucination (primary quality); answers: PR-OWNERWAIT
problem: Production is down; we must find which database backups survive and prove a dump restores before rebuilding anything.
how: A runbook skill: dump inventory, paused-project restore policy, throwaway Postgres 17 restore with count and sequence checks; a Sonnet agent runs local steps only.
where it stands: Built: skill and Sonnet agent in PR #185, merged on 13 Nov. R2 listing and live restores stay with me. Not yet run.
next: Run it on P0a; I run the R2 listing and restores.
origin: Skills packages

### SKL-05 · Self-hosting skill and architect agent
stage: Built; package WP9; metrics: quality, efficiency (primary quality); answers: PR-OWNERWAIT
problem: Moving production to my own box needs compose, tunnel, backup and power-loss steps drafted and checked without agents touching the host.
how: A sourced skill (restore-and-triage, tunnel guardrails) plus FixFlow's design content; a Sonnet high-effort agent drafts compose files, tables of my steps and local restore drills.
where it stands: Built: skill and Sonnet agent in PR #185, merged on 13 Nov. I run every host step. Not yet run.
next: Use it for P3a.
origin: Skills packages

### SKL-08 · Skill package layout with provenance files
stage: Built; package WP10b; metrics: quality, token_count (primary quality); answers: W4
problem: Skills copied from other repos must stay traceable, licensed and small enough to load, so a maintainer can tell what was taken, changed and rejected.
how: Each package has a SKILL.md, an UPSTREAM.md (repo, commit, paths, licence, taken/changed/rejected), the verbatim licence and references, kept under about 150 KB [S].
where it stands: Built: applied to all 13 packages [M] in PR #185, merged on 13 Nov, conventions written 2026-11-03/04. Not yet tested.
next: Check each package against the size and layout rules before merge.
origin: Skills packages

### SKL-11 · Skills never contradict CLAUDE.md
stage: Built; package WP10b; metrics: quality, hallucination (primary quality); answers: W4
problem: Imported skills carry rules, such as deleting failed queue writes, that would break our project's invariants if an agent obeyed them.
how: Any upstream conflict with CLAUDE.md gets a 'Where upstream disagrees' block in the skill and a 'Rejected' line in the provenance file.
where it stands: Built into three skills (offline sync, Expo release, self-hosting) in PR #185, merged on 13 Nov; untested. An upstream rule to delete failed queue writes was rejected, since our outbox never deletes a write.
next: Keep using it as new skills are added.
origin: Skills packages

### SKL-12 · No secrets in skills: key names and fingerprints
stage: Built; package WP10b; metrics: quality (primary quality); answers: PR-SECRETS
problem: Agents reading config files such as eas.json or .env could copy real tokens or keys into skills, briefs or outputs.
how: Real values are cited by path and key name only; a committed value appears as a 12-character [S] hash fingerprint. Agents never open .env files.
where it stands: Built: written into every agent definition checked (PR #185, merged on 13 Nov). Not yet tested.
next: Check it holds when the agents first run.
origin: Skills packages; Orchestration design

### SKL-14 · Orchestration skill and repo-conventions skill
stage: Built; package WP10b; metrics: efficiency, quality (primary efficiency); answers: W4, PR-BRIEFFACTS
problem: Every session's agents need identical briefs, and implementers need the deploy traps, migration numbering and slice boundaries put in front of them.
how: One project skill carries the context block, schemas, reading rules and routing table; a second packages CLAUDE.md and the deploy traps for implementation sessions.
where it stands: Built in part: the orchestration skill is authored in PR #185, merged on 13 Nov (see the main-session contract skill). The repo-conventions skill is not confirmed built. Not yet tested.
next: Confirm whether the repo-conventions skill exists.
origin: Orchestration design

### SKL-16 · Odoo import and Pakistan accounting skills with analyst
stage: Built; package WP10b; metrics: quality, hallucination (primary quality); answers: PR-PRIMARYSOURCES
problem: Money postings must reach Odoo exactly once with Pakistan tax records right, since wrong guesses double-post or drop entries.
how: A sourced Odoo skill (JSON-2, external IDs as idempotency key, reversals) plus a researched Pakistan books skill; an Opus analyst preloads both.
where it stands: Built: two skills and one agent in PR #185, merged on 13 Nov. Every Pakistan fact carries a URL and date. Not yet run.
next: Use it in phases P9-0a and P9-0b; the accountant and I decide the tax position.
origin: Skills packages

### SKL-17 · [owner] stop markers in agent procedures
stage: Built; package WP10b; metrics: quality (primary quality); answers: PR-OWNERWAIT
problem: Agents must never deploy, restore over live data, rotate keys, message people or install on a phone; those steps need me.
how: Steps only I may do carry an [owner] marker; the agent stops, hands me the exact command, and resumes from my pasted output.
where it stands: Built: used in all 13 skills [M] and the agent definitions in PR #185, merged on 13 Nov. Not yet tested.
next: Check it holds when the agents first run.
origin: Skills packages

### OWN-11 · Fleet hold notice to technicians
stage: Built; package WP11; metrics: quality (primary quality); answers: PR-P0A
problem: Technicians opening the app, tapping Discard or uninstalling could destroy records that have not synced and are the only copy.
how: A notice in English, Urdu and Roman Urdu: do not open the app, clock in, start travel, discard, update, uninstall, clear data or reset.
where it stands: Built: the notice is drafted but not yet sent. The kit's scripts only read from phones and never open the app. Not yet tested.
next: I send the notice and record the date.
origin: Ship plan §7

### MAC-21 · Secret-safe scans: fingerprint, never value
stage: Designed; package WP1; metrics: quality (primary quality); answers: PR-SECRETS
problem: Every agent output is saved in the run journal, so a pasted secret would be stored there. We want scans that can never leak one.
how: The dependency and secret scan returns file, pattern, line number, first commit and a hash fingerprint, never the value or a quoted line.
where it stands: Designed in the orchestration design; not yet tested. The output schema enforces the rule. Added after the second external review.
next: Run the secret-scan test and inspect the journal for leaks; a clean journal would make scans safe to run.
origin: Orchestration design, second external review

### MAC-22 · Deny railway up and run in permissions
stage: Designed; package WP1; metrics: quality (primary quality); answers: MC-INJECT
problem: Running railway up from the repo root rebuilt the API as the web app and caused a production outage; the trap lives only as prose.
how: A deny block in the project settings covers the shell forms of railway up and railway run, and optionally a forced git push.
where it stands: Adopt, not yet tested. It does nothing for the self-reported compliance problem, but it matters during the Railway drain window.
next: In bypass mode, have an agent try four railway commands; all four must be denied. I accept the deny block.
origin: Dex Horthy sweep (guardrails as config)

### MAC-24 · Separate Postgres 17 restore stack for evidence
stage: Designed; package WP1; metrics: quality (primary quality); answers: MC-SHAREDDB, MC-ENVSKEW
problem: Restoring a production dump into the test database, or into an older Postgres, could mix evidence with test state or simply fail.
how: A production dump is restored into its own Postgres 17 container, never the test database; exact table counts and fixed read-only queries verify it.
where it stands: Designed; not yet tested. Added after the second external review. Used only if the first wave produces a dump.
next: Hold until a dump exists, then run it; exact counts would make dump evidence trustworthy.
origin: Orchestration design, second external review

### MAC-28 · Never run expo prebuild in place
stage: Designed; package WP9; metrics: quality (primary quality); answers: MC-PREBUILD
problem: Generating the native Android folder in the app directory would make the build service treat the project as bare and skip its config plugins.
how: Agents may not run expo prebuild or expo run:android in the app directory; native questions are answered from cached package sources instead.
where it stands: Stated as a hard constraint in the orchestration design; not yet tested.
next: Keep it in the shared context block rules.
origin: Orchestration design

### CHK-33 · Caller-pin test in repository CI
stage: Designed; package WP6b; metrics: quality (primary quality); answers: LIB-KS-BLIND
problem: We want a new file minting a login token without the lock check to fail the merge, since no store lookup can see that second door.
how: A backend pytest using Python's ast module pins the only allowed callers of verify_pin and create_access_token to the login function.
where it stands: Designed (decision KS-D17: yes, one PR per probe). Needs no store, so it can land any time before ship phase P7b-1. Not yet tested.
next: I choose the timing; P7b-1 must extend the allow-list under review.
origin: Knowledge-store design, my critique and refuter pass

### CHK-35 · Import rules for the mobile app
stage: Designed; package WP9; metrics: quality (primary quality); answers: PR-MOBILEBOUNDARY
problem: We want the rule that no mobile write bypasses the outbox enforced by a check, because today it is only prose.
how: dependency-cruiser mirrors the backend import rules in the mobile app: screens cannot import write functions; raw fetch stays in two files; runs in CI.
where it stands: Adopted in the harness review as the better alternative to a code-graph tool; scheduled as phase P5b-2. Not built or tested yet.
next: Build in P5b-2; it turns a prose invariant into a CI-enforced rule.
origin: Harness review, while evaluating Graphify

### REV-34 · Break-even rule for extra review legs
stage: Designed; package WP3; metrics: quality, time, efficiency (primary quality); answers: B01, B12, B17
problem: Different models may catch different defects, and we need a rule for when the extra review legs are worth their time.
how: Claude plans and implements, Codex reviews read-only, a human decides, Claude repairs; each leg judged by a break-even formula.
where it stands: Designed from a pasted routine; never trialled. An outside study reports 91.4 vs 82.8 percent on 116 tasks [S]. Break-even inputs F=120, o=12, s=5/25/60 minutes are illustrative [I].
next: Judge any proposed review leg with the break-even formula before trialling it.
origin: Clinic testbed workflow-bridge assessment

### MEM-28 · Scrub secrets and customer data from the store
stage: Designed; package WP6b; metrics: none (primary none); answers: LIB-KS-PRIVACY, PR-SECRETS
problem: Entries could hold secrets or customer data, everything an agent reads reaches Anthropic, and raw symptom text committed to GitHub would expose it.
how: A scrubber redacts secrets, token patterns, phone and CNIC (Pakistani national identity card) numbers, and refuses the write if scrubbing fails (fails closed). Raw tables stay local; only scrubbed aggregates are committed.
where it stands: Designed for phases KS-0, KS-1, KS-5 and KS-9; not tested. A known-miss fixture will show the name and address limit in every test run. A second gitleaks pass is my call (KS-D5).
next: Build in KS-1 with must-survive fixtures; use the local-only rule in KS-0.
origin: Knowledge-store design, after the secret scanners secretlint and gitleaks

### MEM-37 · Teardown checklist for a stop verdict
stage: Designed; package WP6b; metrics: none (primary none); answers: -
problem: If we stop an experiment, we want nothing left lingering in the repo.
how: One code PR and one docs PR remove the skill, hooks, CI workflow, ignores and tool, revert the CLAUDE.md edit, leave the journal read-only.
where it stands: Designed; not yet tested. It would make the knowledge-store experiment safely reversible.
next: Write the checklist into the teardown PR if a stop or retire verdict comes; I merge two PRs.
origin: Knowledge-store design, completeness critic

### MTH-29 · Write the gate record before the next workflow
stage: Designed; package WP10a; metrics: quality (primary quality); answers: PR-BRIEFFACTS
problem: The deep-dive analysts started without the first gate record, because a shell quoting failure delayed it. We want the decision trail never lost.
how: The gate record is written to the repo and confirmed on disk before the next workflow starts, so every analyst gets the settled facts.
where it stands: Adopted as a plan rule and stated as a lesson from both gates. No analyst's output depended on the missing file, because the substance was in the brief (qualitative).
next: Check the file exists before each dispatch; make the gate record a required step.
origin: Lesson from the two gates

### MTH-31 · Phase opening, precedence and journal rules bundle
stage: Designed; package WP10a; metrics: quality (primary quality); answers: W2, W3
problem: Our phase routine can skip steps or trust the wrong document. I want small written rules so each phase opens, runs and closes the same way.
how: Small written rules: document precedence, explicit skill start, fetch before resume, pasted opening block, cause tags, three-push CI stop, live PR body fetch.
where it stands: Designed from the Dex Horthy sweep; not yet tested here. Umbrella over many single rules, eight adopt and the rest trial. FixFlow only; no bottleneck record names these skips.
next: Fold the adopt lines into ship plan section 0, then test each as its own record shows.
origin: Dex Horthy sweep

### MTH-32 · One-sentence source-precedence rule in ship plan
stage: Designed; package WP10a; metrics: quality, hallucination (primary quality); answers: W3, W2
problem: When the journal, the plan, a design note and CLAUDE.md disagree, a fresh agent has no stated order for which one wins.
how: One sentence in plan section 0 ranks my correction, plan on main, Plan @ sha, design note; CLAUDE.md and code win on stack facts.
where it stands: Designed, not yet tested. It stays out of CLAUDE.md on purpose to keep that file short. The test plants two conflicts in the P1 cold-resume fact set.
next: Plant two conflicts; a fresh Sonnet agent passes if it reports the journal value and stricter rule with source.
origin: Dex Horthy sweep; refuter split it by domain

### MTH-34 · Phase id comes from me, never inferred
stage: Designed; package WP10a; metrics: quality (primary quality); answers: W2, W4
problem: Concurrent phases are allowed and branch names do not name phases, so a session could pick the wrong phase.
how: One line in the orchestration skill's start step: the phase id comes from my opening message or skill arguments; if missing, the session asks.
where it stands: Designed as a one-line edit; not yet tested. Pass is zero sessions naming a phase different from my opening message across the next 5 phase sessions [T].
next: Make the edit, then count mismatches over 5 phase sessions [T].
origin: Dex Horthy sweep; skills as routine

### MTH-35 · Fetch live PR body before every body-file write
stage: Designed; package WP10a; metrics: quality (primary quality); answers: W2
problem: Rewriting a PR body from a stale copy silently loses journal lines and ticked boxes.
how: One clause in section 0: before each body-file write, fetch the live PR body with gh and edit that text, never a rebuilt copy.
where it stands: Designed, not yet tested. Check at the close of P1, P2 and P3 by reading each PR body's edit history; pass is zero unexplained losses [T].
next: Add the clause, then read the edit history of 3 PRs [T].
origin: Dex Horthy sweep; single-writer material

### MTH-38 · Secrets passed by variable name in briefs
stage: Designed; package WP10a; metrics: quality (primary quality); answers: PR-SECRETS
problem: Phases that handle secrets, such as the backup dump and Cloudflare calls, could leak values into records, PR bodies or agent context.
how: In four phase briefs, secrets are passed by variable name; records name the variable, never the value; agents never read a .env file.
where it stands: Designed for four named phases only; not yet tested. At each close a local exact-value scan of diff, PR body and evidence must find 0 [T].
next: Accept the clause for the four phases, then run the scan at each close.
origin: Dex Horthy sweep; context hygiene

### MTH-40 · Five-phase harness build order with dependencies
stage: Designed; package WP11; metrics: throughput, efficiency (primary throughput); answers: B03, B05
problem: We have 21 problems to fix and want to build them in the order the evidence supports.
how: Phase 1 machine, 2 check, 3 gate and review scripts, 4 first use, 5 token budget. Hard order: 1 before 2, 2 before 4.
where it stands: Designed in harness v2; phase 1 has started with read-only work and its findings exist. The order follows the record: machine first (24 [M] power-offs), review third, tokens last.
next: I take the phase 1 actions that need me.
origin: Harness v2 design

### SKL-20 · CI check for skill and agent frontmatter
stage: Designed; package WP10b; metrics: quality (primary quality); answers: W4, PR-DOCDRIFT
problem: Skill files can rot silently: a missing name, a name that differs from its folder, a stale Alembic head number.
how: A Node CI step fails bad skill frontmatter (name equals folder, description under 1024 characters [S]) and agent fields; flags a stale head number.
where it stands: Adopted in the Horthy sweep, to be added to P1-ci or P1. Not yet built; a one-off version of the gate was run once.
next: A commit dropping the name must fail CI; adopt for good once at least 1 [T] real rot is caught.
origin: Dex Horthy sweep

### MSR-31 · Adoption audits of reference repositories
stage: Designed; package WP8; metrics: efficiency, quality (primary efficiency); answers: PR-OUTSIDEEVIDENCE, B12
problem: We needed to know which ideas from outside agent projects are worth adopting.
how: Source-first audits of six outside projects; adopt small fields (code-shape block, boundary trace, fail-before/pass-after, error retirement) and reject installing runtimes.
where it stands: Adopted narrowly in the clinic testbed; runtimes, webhooks and vector databases rejected. 1,658 [M] files rehashed, none missing; no upstream tests run.
next: Do not equate a stored token field with spend; verify instruction loading.
origin: Clinic testbed

### REL-07 · Drain branch cut at the pre-merge commit
stage: Designed; package WP3; metrics: quality (primary quality); answers: PR-DRAIN
problem: Version 8 cut the drain branch at P1's squash commit; under build-ahead, anything merged below P1 would leak into the image we ship.
how: Cut release/drain at the main commit before the first merge; add P1, P2b-2 and P3a squash commits by cherry-pick; the log shows only those.
where it stands: Adopted as a rule in ship plan section 7.7 after a refuter found it the one blocker; branch not yet cut, not yet tested. The web variant adds P12a and P12.
next: Cut the branch and verify the log shows exactly the listed commits.
origin: Ship plan §7; Harness review (refuter)

### OWN-16 · Standing rules: ship plan first, my yes for outside actions
stage: Designed; package WP11; metrics: throughput, quality (primary throughput); answers: B3-LOOP
problem: Harness work could delay FixFlow or take shared limits without my consent.
how: FixFlow P0a goes first. No hooks, installs, scheduled tasks, permission changes or outbound data without my decision; no harness agents during a FixFlow phase.
where it stands: Adopted as a standing rule in the harness v2 design. No number or result attached.
next: Keep using it.
origin: Harness v2 design; me

### MAC-29 · Secrets and private data kept out of agents' reach
stage: Idea; package WP1; metrics: quality (primary quality); answers: MC-INJECT, PR-SECRETS
problem: Sessions holding production credentials could leak secrets or obey injected text; subagents in bypass mode can reach Railway and GitHub credentials in the user profile.
how: Pass secrets by variable name only, never read .env, and use a restricted research agent (no shell) with deny rules for credential folders.
where it stands: Trial for FixFlow only; not yet tested here. The testbed holds no production credentials and records no leak. The first check is a ten-minute canary (a small trial run) in a bypass-mode workflow.
next: Add to briefs of production-touching phases and run the canary. I decide on a project deny rule for .env files.
origin: Dex Horthy sweep, after Simon Willison's lethal trifecta

### CHK-37 · One-off tsc unused-code check on mobile
stage: Idea; package WP2b; metrics: quality (primary quality); answers: -
problem: We want to know whether agents leave unused code in the mobile app that no gate flags.
how: Run tsc with the noUnusedLocals flag once on the mobile app; set it in tsconfig only if it finds real unused code.
where it stands: Trial: the one new idea to survive the Horthy addendum cap review, after 15 [M] other families fell. Mobile parity only, no new tooling. Not yet run.
next: Run it once; adopt the flag only if real hits appear.
origin: Dex Horthy sweep addendum

### CHK-38 · Close-time clean worktree and manifest check
stage: Idea; package WP3; metrics: quality (primary quality); answers: -
problem: We want intended files, such as a review-input tool, never left uncommitted at phase close.
how: At phase close, run git status and compare a file listing of the evidence folder with its manifest; each entry is committed or excluded.
where it stands: Trial over the next 5 [T] phase closes. It costs nothing to run; the slop-scoring part of the source idea was dropped. Not yet tested.
next: Add it to the closing message of the section 0 gates.
origin: Dex Horthy sweep, after SlopCodeBench

### REV-48 · Deviations-from-Scope report and unrequested changes
stage: Idea; package WP3; metrics: quality, hallucination (primary quality); answers: W2, L3
problem: We want to see when a diff drifts from the planned Scope, or adds unrequested abstractions, since only the implementer checks that today.
how: A journal heading reports deviations from plan; the Opus reviewer lists unaccounted hunks, boxes ticked without a diff, and changes no Scope box requires.
where it stands: Trial, not yet tested, over the first 3 to 5 Opus-reviewed phase PRs [T]. The bottleneck compile’s refuters narrowed two of the parts to FixFlow-only.
next: Add to the reviewer brief; count deviations the journal lists against ones the reviewer finds, across three PRs [T].
origin: Dex Horthy sweep

### REV-49 · Reviewer-brief additions with no testbed counterpart
stage: Idea; package WP3; metrics: quality (primary quality); answers: -
problem: We want FixFlow reviewers to catch plan deviations, unnamed config exceptions, over-engineering and design flaws that the testbed never needed to handle.
how: A bundle of eight FixFlow reviewer items: suppression and gate-config lists, deviation report, defect shapes, gate-file list, and a design audit.
where it stands: Trial, not yet tested here. The bottleneck compile’s refuters narrowed five of the items to FixFlow-only; one would add a standing step for me.
next: Use the claims-file script (mechanism 2) for the gate-file list instead.
origin: Bottleneck compile, after the Dex Horthy sweep

### REV-54 · Saved script for the PR-review stage
stage: Idea; package WP10a; metrics: quality, efficiency, time (primary quality); answers: W2, W3, W5
problem: The PR-review stage is prose steps, so commit binding and the per-id fail-and-pass table depend on the agent, and workflows get rewritten each time.
how: One committed workflow script takes the register ids and head commit, calls the PR-reviewer agent with a verdict schema, and compares commits in code.
where it stands: Trial after P1; not yet tested. Only the deterministic part is to be scripted; the whole-routine version was refuted.
next: Run prose review in P1 and audit it, then use the script on the next 3 PRs [T].
origin: Dex Horthy sweep

### MEM-60 · Thin MCP wrapper over lookup verbs
stage: Idea; package WP6b; metrics: quality (primary quality); answers: -
problem: Agents might misuse the command-line tool, and we want a safer route if they do.
how: A small stdio MCP server wrapping the lookup and show commands.
where it stands: Deferred in the knowledge-store design (KS-D15): the answer is no for now. Add it only if the lookup log shows misuse. Not yet tested.
next: Check the lookup log at phase KS-9.
origin: Knowledge-store design

### MEM-66 · Scheduler-system knowledge graph (Pulse)
stage: Idea; package WP7; metrics: none (primary none); answers: -
problem: A candidate source of my recollection of a graph-based memory; we wanted to see whether it is the one.
how: A scheduling assistant writes structured JSON episodes into a temporal graph (Graphiti on Neo4j), skipping model extraction at write time.
where it stands: Idea only: a README-level look at a different project of mine; no benchmark found and not tested.
next: Keep as a pattern reference only.
origin: My project (scheduler system); Clinic testbed sweep

### MTH-46 · Paste-to-open-a-phase block
stage: Idea; package WP10a; metrics: quality (primary quality); answers: W2, W3
problem: A new phase session can skip the steps that leave no trace, and nobody can tell afterwards.
how: A 5 to 8 line block in plan section 0, with separate code and operations first steps, naming only steps that leave no trace.
where it stands: Trial, not yet tested. The evidence behind it is a single anecdote, so we test it on our own phases first.
next: Open the first 4 phases with it [T]; a cheap extraction plus gh and git checks verify each named step.
origin: Dex Horthy sweep; kickoff-prompt material

### MTH-49 · Script the mechanical phase-close sequence
stage: Idea; package WP10a; metrics: quality (primary quality); answers: W2, W5
problem: Phase-close steps are done from memory and can be left out.
how: Script only the mechanical close steps (Plan @ line, OWNER-VIEW page updated, verdict names the commit); a cheap extractor counts omitted steps.
where it stands: Gated trial, not yet tested. Six mechanical close steps are counted after the first three phases [T]. A whole-phase driver was considered and set aside.
next: After P1 and the next two closes, count omitted steps among six [T].
origin: Dex Horthy sweep; control flow in code

### MTH-50 · Rename VERDICT.reasoning to explanation
stage: Idea; package WP10a; metrics: quality, token_cost (primary quality); answers: PR-AGENTNULL
problem: A required 'reasoning' field in the skeptic's verdict can trigger a documented refusal, a billed reply that may not match the schema and costs a verdict.
how: Grep committed transcripts for refusals (costs zero tokens), then rename the verdict field to explanation at the next brief edit.
where it stands: Trial, not applied, not yet tested. The twelve skeptic verdicts [M] all came back, so no refusal is on record. Benefit unproven; cost is one word.
next: Grep the skeptic and lost-refuter transcripts for refusals; propose the rename at the next edit either way.
origin: BAML sweep, after Anthropic refusals docs

### MTH-51 · Add description text to output schemas
stage: Idea; package WP10a; metrics: quality, hallucination (primary quality); answers: PR-SEVERITY
problem: Our output schemas carry no description, so P0 to P3 are defined nowhere and word limits live only in script comments the model never sees.
how: Test whether a schema property description reaches the model; if so, define each severity and verdict value once in a shared constant.
where it stands: Trial, not yet tested. Baseline to beat: 8 of 12 skeptic verdicts lowered a severity [M]; 4 of 12 survived [M]. BAML's own rendering evidence was judged not to transfer.
next: Run the one-agent probe; drop it if descriptions do not reach the subagent, otherwise edit the schemas.
origin: BAML sweep, reframed by the refuter

### MTH-52 · One constants table for verdicts and buckets
stage: Idea; package WP10a; metrics: quality (primary quality); answers: PR-SCRIPTTEST
problem: A verdict value could be added to a schema without a matching bucket in the gate script, leaving results unclassified.
how: A single table of about 15 lines [E] generates both the schema enums and the bucket mapping, with citation statuses folded in.
where it stands: Trial, unrefuted and not yet tested. It would make bucket totality structural: a verdict cannot exist without a bucket.
next: In the stub harness, add a verdict with no bucket and confirm the test fails.
origin: BAML sweep, structural borrow from exhaustive matching

### MTH-53 · Fix stale analyst-cap lines in the design
stage: Idea; package WP10a; metrics: quality (primary quality); answers: PR-DOCDRIFT
problem: The design says findings are sliced to 12, but a later section says the script never cuts a P0 or P1, so two readings coexist.
how: Edit two lines of the orchestration design so they match the current version, which never truncates a P0 or P1.
where it stands: Idea, not yet applied. The BAML structural comparison found the two stale lines; the ruling names them for the design's next edit.
next: Apply at the next orchestration-design edit.
origin: BAML sweep, structural comparison

### MTH-56 · Invoke the orchestration skill at phase start
stage: Idea; package WP10b; metrics: quality (primary quality); answers: W4, W3
problem: A skill may not load from its description alone, so a phase's instructions might never be read.
how: A zero-cost habit: call the orchestration skill at phase start and prompt the close step explicitly, with no new phase-start or phase-close skills.
where it stands: Trial, not yet tested. It measures whether auto-loading works by checking 3 plain-prompt sessions [T] for a skill call before the first brief or commit.
next: Open 3 sessions with a plain prompt and count those where the skill loaded first.
origin: Dex Horthy sweep, skills-as-routine material

### OWN-19 · Context-system line moves to its own repository
stage: Idea; package WP11; metrics: none (primary none); answers: B11
problem: Experimental memory tooling should stay off the product's routes and out of its history; it now sits untracked in a repository with no remote.
how: I decided on 1 Nov 2026 that the line continues in its own repository at low priority; until moved it stays untracked.
where it stands: Decided, not yet done: the move needs my folder name. Measurement research does not start unless I ask.
next: I give the target folder name so the move can happen; keep experimental harness tooling separate.
origin: My idea; Clinic testbed

### MAC-35 · Scripted worktree setup checklist
stage: Parked; package WP4; metrics: efficiency, quality (primary efficiency); answers: -
problem: A new git worktree is only useful if its setup is repeatable and leaves shared state untouched.
how: One repo-defined setup script would copy env and settings, install dependencies and launch the implement command, cleaning up if setup fails.
where it stands: Parked after refutation: FixFlow has no untracked env to copy, and a shared-state guard and per-phase worktree checklist already exist. The source evidence was one anecdote.
next: Would return if FixFlow gains untracked environment files that worktrees need.
origin: Dex Horthy sweep, Matt Pocock livestream

### REV-56 · List dimensions and covered combinations in review briefs
stage: Parked; package WP3; metrics: quality (primary quality); answers: -
problem: Defects can hide in combinations of changes that no test covers, as in BAML's own post-mortem.
how: Add a line asking the reviewer to list the dimensions of the change and the combinations the tests cover, in the next 3 briefs [T].
where it stands: Parked: the refuter found one post-mortem is thin evidence, our briefs already name similar shapes, and the trial had no control.
next: Would return if several of our defects trace to uncovered combinations.
origin: BAML sweep, after a BAML post-mortem

### REV-58 · Six-claim cap per analyst
stage: Parked; package WP10a; metrics: quality (primary quality); answers: PR-CAPS
problem: We did not want caps on what analysts report to hide omissions.
how: Version 2 capped each analyst at six claims; version 3 replaced it with a backlog field and kept only the verification cap.
where it stands: Parked: superseded in orchestration design v3 by the backlog field, after an external reviewer's objection that six findings per analyst hide omissions.
next: None; replaced by the backlog field.
origin: Orchestration design, second external review

### REV-59 · Materiality skeptic and 1-in-5 sample
stage: Parked; package WP10a; metrics: token_cost, quality (primary token_cost); answers: PR-VERIFYBUDGET
problem: We wanted extra assurance on findings, but the added layers cost spend without moving the plan.
how: Two extra verification layers from the first design: a skeptic judging materiality and a one-in-five sample; the v2 rewrite removed both.
where it stands: Parked: removed in orchestration design v2 because the layers added spend without moving the plan. Severity is now re-set by the main session at gate G2.
next: None.
origin: Orchestration design

### MEM-69 · Rejected storage engines and memory products
stage: Parked; package WP6b; metrics: none (primary none); answers: B10, MC-ENGINE
problem: I asked that we neither re-invent decades-old solutions nor fake a database with Markdown, so engines had to be ruled in or out.
how: Candidates were scored on local-only data, Windows, telemetry off and one-developer cost; Cassandra, ClickHouse, Neo4j, Qdrant, hosted products: rejected or reference only.
where it stands: Rejected as components; Postgres, DuckDB and Dolt stay reserve targets. Cassandra needs an 8 GB [S] RAM floor; the Postgres-container design scored 222 of 360 [M] and is unreachable with Docker off.
next: None; revisit only if a logged trigger fires.
origin: Knowledge-store design research sweep; me

### MEM-71 · Hand-written code lexer for span anchoring
stage: Parked; package WP7; metrics: quality (primary quality); answers: LIB-KS-FALSELEAD
problem: We wanted code checks that ignore comments and strings and anchor to function spans without installing a heavy parser.
how: A zero-dependency lexer for Python, TS/JS, JSON and YAML, with span anchors, planned to let code checks skip comments and strings.
where it stands: Withdrawn after my critique: nobody had evaluated it and its spec left out JSX. Never built. Replaced by the ast-grep reader.
next: None; the ast-grep reader (decision KS-D5b) replaces it. It could return only if a lane evaluates it.
origin: Knowledge-store design, completeness critic

### MTH-57 · Thought structures (tree, forest, graph) rejected
stage: Parked; package WP10a; metrics: quality, hallucination (primary quality); answers: B01
problem: We hoped structured multi-branch reasoning would improve agent output and fixes over a single chain.
how: Branch and merge several reasoning paths in a tree, forest or graph, with a judge or vote, before answering.
where it stands: Parked: outside studies show gains on puzzles with a 2023 model [S], and at equal compute plain sampling matches them [S]. Not built, not tested here.
next: Use candidate fixes chosen by an executed check; the three-candidate replay at frozen commits stays my call (D20).
origin: Outside research; harness review

### MTH-58 · Scale process weight to task size
stage: Parked; package WP10a; metrics: efficiency, token_cost (primary efficiency); answers: -
problem: A one-line change should not carry the full research, plan and implement process.
how: A one-line change needs only a prompt, small issues skip research, and the process weight is calibrated by repetition.
where it stands: Parked: the evidence is anecdotal, and the orchestration guide's section 3 already scales work by task size, so nothing new is needed.
next: None; revisit only if measured evidence appears.
origin: Dex Horthy sweep

### MTH-60 · Outside observer and ban-expensive-model controls
stage: Parked; package WP10a; metrics: token_cost (primary token_cost); answers: -
problem: We wanted an outside check of worker state, a spend control, and no dependence on one vendor's tooling.
how: One Claude watching another through tmux, per-task requests for the costly model, and borrowing HumanLayer's research-plan-implement skills.
where it stands: Parked: tmux is absent on this PC and phase sessions are not tmux panes; with one developer requester equals approver. Nothing taken as a dependency: pin and copy, never depend.
next: None; reopen if we add a second approver or tmux sessions.
origin: Dex Horthy sweep

### MTH-61 · Brief lint and dry-run flag in scripts
stage: Parked; package WP10a; metrics: quality, efficiency (primary quality); answers: PR-BRIEFTEST
problem: I want hand-edits to a brief to be safe and reviewable before we spend: no dropped context block, no leaked tier word, no pasted raw schema.
how: A pure in-script check runs before any agent call, and a dry-run flag returns assembled prompts and schemas instead of calling agents.
where it stands: Parked after a refuter pass. The agent call already rejects bad schemas, one concatenation adds the context block, and diffing the saved script gives the text diff. No brief edit has broken anything on record.
next: Nothing now; it returns if a hand-edit of a brief ever breaks a run.
origin: BAML sweep, after its offline build and parse companions

### MTH-64 · Report directive text found in fetched pages
stage: Parked; package WP10a; metrics: quality (primary quality); answers: -
problem: BAML's docs open with an instruction addressed to an AI reader, which is an instruction inside fetched content; we want that noticed and reported.
how: A research-contract rule and field so a reader reports instructions found inside a source instead of acting on them.
where it stands: Parked after a refuter pass. Subagents already treat tool output as data and handled the notice correctly. We have no injection incident on record.
next: Nothing now; it returns if a fetched page ever steers an agent.
origin: BAML sweep, observed in its docs

### SKL-26 · A ks guide command printed from command definitions
stage: Parked; package WP6b; metrics: quality (primary quality); answers: PR-DOCDRIFT
problem: We worried knowledge-store documentation could drift from the tool's real commands.
how: The guide command would print guidance from the same command definitions as the tool, with a test that every subcommand appears.
where it stands: Parked: the tool and its skill live in one repo and one commit, so version skew cannot arise; the store is also unbuilt. Not tested.
next: Nothing needed; the refutation rests on the tool and skill shipping together.
origin: BAML sweep

### SKL-27 · Install BAML language and CLI in the harness
stage: Parked; package WP10a; metrics: quality, hallucination (primary quality); answers: -
problem: We hoped for typed prompt functions, lenient parsing of agent outputs and built-in tests.
how: BAML generates a client and parses replies with schema-aligned parsing; the Claude Code route needs a canary-only client running one claude -p per turn.
where it stands: Parked, not installed. Three grounds: a second billing path or opaque orchestrator, no resume in its runner, a parser that silently drops list elements. Its distinctive ideas already exist here, stricter.
next: Would come back only with a client running Claude Code subagents with tools and a recorded failure class it addresses.
origin: BAML sweep
