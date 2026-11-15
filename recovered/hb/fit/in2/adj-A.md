# Fallen Horthy candidates, groups G1 and G2 (source rows: horthy-fallen-1.md, horthy-fallen-2.md)

55 items.

### G1-F110 (horthy, already-done in the PR; screener strength: strong)
- bottlenecks proposed: B03, B07, B08
- claim: Limit parallel agents and work in progress; heavy parallelism and overnight runs backfire.
- why it fell: WIP already bounded by Docker exclusivity and skeptic caps; no data to justify a tighter limit. [class: weak-evidence; screener says the reason still holds against the bottleneck: no]
- what the screener says it would add: The clinic record supplies the data: ten parallel lanes died in 15 minutes, two at a time finished (CR-04); 9 Nov all-at-once resume gave a 2,030 s wait. A hard cap of two lanes would have changed those.

### G1-F038 (horthy, skip in the PR; screener strength: moderate)
- bottlenecks proposed: B03, B04
- claim: Large tool/MCP definition lists fill context at start; load tools on demand and switch off unused servers.
- why it fell: Deferred loading exists; remaining servers cost 6-7k tokens, under 1% of a 1M window; no help to CLAUDE.md length (W1). [class: no-fixflow-weakness-matched; screener says the reason still holds against the bottleneck: no]
- what the screener says it would add: Compile 3.6 lever 2: the testbed measured about 70k fixed tokens per agent (connectors 17k, tools 34k, CR-11) across many tiny fan-outs. Fewer connectors in agent sessions cuts that directly.

### G1-F137 (horthy, skip in the PR; screener strength: strong)
- bottlenecks proposed: B13, B04
- claim: Unpruned agent output sprawls; set size ceilings (split docs over 1000 lines) so cold-resume reads stay small.
- why it fell: No evidence of harm; a line cap misses the repo's real outlier; the plan is already read by section. [class: no-fixflow-weakness-matched; screener says the reason still holds against the bottleneck: no]
- what the screener says it would add: The testbed board reached over 800 lines and 221 KB, a recorded harm; B13 proof is under 20 KB. A size ceiling checked by the local check would have flagged it.

### G1-F174 (horthy, skip in the PR; screener strength: moderate)
- bottlenecks proposed: B01
- claim: If a loop hill-climbs without arriving, discard and regenerate rather than patch, since code and plans are disposable.
- why it fell: The ship plan is a critiqued, sha-pinned contract; regenerating it discards that review. [class: no-fixflow-weakness-matched; screener says the reason still holds against the bottleneck: no]
- what the screener says it would add: The B01 contract says revert instead of patching a patch. The reason for the skip concerns the plan, not fixes. Testbed fixes that added state (hold, lock, marker, cutoff) spawned 5+ late P1s.

### G1-F087 (horthy, skip in the PR; screener strength: weak)
- bottlenecks proposed: B01
- claim: If an implementation is about 5% wrong steer it; if about 30% wrong restart from the ticket.
- why it fell: Percentages are intuition; restarting is already cheap here. [class: weak-evidence; screener says the reason still holds against the bottleneck: partly]
- what the screener says it would add: Gives a restart-versus-patch rule for fix rounds; the clinic record (9 of 11 gates took three rounds, fixes creating P1s) supplies the evidence, the percentages do not matter.

### G1-F070 (horthy, already-done in the PR; screener strength: moderate)
- bottlenecks proposed: B01, B17
- claim: Keep a known-tics list in a skill or reviewer prompt for repeated model habits.
- why it fell: No tic observed yet; add one to the reviewer brief once it recurs in two reviews. [class: already-in-fixflow-on-paper; screener says the reason still holds against the bottleneck: no]
- what the screener says it would add: The testbed shows a recurring tic: fixes that add state (hold, lock, marker, cutoff) create new P1s. A tic list in the fresh reviewer's brief would name that shape.

### G1-F140 (horthy, skip in the PR; screener strength: moderate)
- bottlenecks proposed: B01, B12, B17
- claim: Optimise instruction files and skills against a repo-specific task dataset, since grading is tractable at repo scale.
- why it fell: A repo task dataset reopens the skipped measurement pipeline on a commenter's assertion. [class: reopens-an-owner-skip; screener says the reason still holds against the bottleneck: partly]
- what the screener says it would add: The compile's replay of recorded fix chains and 20-plus overstatements is a small repo-specific dataset with frozen commits. Cheap and scripted, but a standing pipeline still needs the owner.

### G1-F146 (horthy, already-done in the PR; screener strength: weak)
- bottlenecks proposed: B02
- claim: A wrong assumption from docs or weights propagates through research, plan and implementation and is found late; vet assumptions early.
- why it fell: Assumptions are vetted up front by design. [class: already-in-fixflow-on-paper; screener says the reason still holds against the bottleneck: no]
- what the screener says it would add: The testbed assumed the synthetic seeder stood for real data and found otherwise on the last day. A named-assumption check per slice would have forced the zero-seed walk earlier.

### G1-F132 (horthy, already-done in the PR; screener strength: moderate)
- bottlenecks proposed: B13
- claim: Docs hold the most lies; persistent docs need freshness checks against code.
- why it fell: Freshness checks against code exist for the facts most likely to rot. [class: already-in-fixflow-on-paper; screener says the reason still holds against the bottleneck: partly]
- what the screener says it would add: B13 first step includes tests asserting routing documents against the plan; the testbed had doc-versus-code tests (CR-06) yet AGENTS.md and the context map still went stale. Extend them to those two files.

### G1-F126 (horthy, already-done in the PR; screener strength: weak)
- bottlenecks proposed: B13
- claim: Re-work whole sections after each decision instead of appending, so a living doc stays a current spec, not a changelog.
- why it fell: Living docs already kept current; the journal is the separate log. [class: already-in-fixflow-on-paper; screener says the reason still holds against the bottleneck: partly]
- what the screener says it would add: The testbed board grew past 800 lines by appending per-slice edits applied by the root. A rewritten generated board replaces that append pattern.

### G1-F168 (horthy, already-done in the PR; screener strength: moderate)
- bottlenecks proposed: B03, B13
- claim: Write status back into the plan file after each verified phase so the plan doubles as the resume record.
- why it fell: Status written back into the plan record is already section 0 Resume. [class: already-in-fixflow-on-paper; screener says the reason still holds against the bottleneck: partly]
- what the screener says it would add: B03 first step needs a resume list at sign-in; per-slice status fragments are the machine-readable form. Testbed sessions 6 to 9 Nov restarted from memory of the root, not a resume record.

### G1-F151 (horthy, already-done in the PR; screener strength: weak)
- bottlenecks proposed: B12
- claim: The parent re-reviews the implementer's evidence and ticks validation boxes itself, delegating with short prompts.
- why it fell: The parent already re-checks evidence before ticking. [class: already-in-fixflow-on-paper; screener says the reason still holds against the bottleneck: no]
- what the screener says it would add: This is the B12 failure itself: the root verified everything by hand because reports overstated. Mechanism should be a script check, so the idea names the cost, not the cure.

### G1-F178 (horthy, already-done in the PR; screener strength: moderate)
- bottlenecks proposed: B16, B12
- claim: Sub-agent hops distort like telephone; specify input and return format explicitly.
- why it fell: Input and return formats are already explicit. [class: already-in-fixflow-on-paper; screener says the reason still holds against the bottleneck: partly]
- what the screener says it would add: B16 first step is a return contract: path, hash and short summary, with the full report on disk. The testbed returned long reports through the root context.

### G1-F177 (horthy, already-done in the PR; screener strength: moderate)
- bottlenecks proposed: B04, B14
- claim: Run noisy commands (tests, builds) in sub-agents so only a summary or exit code returns.
- why it fell: Implementation and noisy gates already live in subagents. [class: already-in-fixflow-on-paper; screener says the reason still holds against the bottleneck: partly]
- what the screener says it would add: B04 first step moves review into a gate workflow returning a typed verdict. The testbed root still held review, merge and check polling (one 49-minute foreground loop).

### G1-F114 (horthy, already-done in the PR; screener strength: moderate)
- bottlenecks proposed: B04
- claim: The parent works only through sub-agents with no direct file reads, reading summaries to keep its own context sparse.
- why it fell: A strict no-reads rule would stop Fable reading the diff it must gate. [class: cost-or-risk; screener says the reason still holds against the bottleneck: partly]
- what the screener says it would add: B04 compile moves the diff read to a reviewer and keeps the root for judgment. Round three in 9 of 11 gates was the root reading the diff alone.

### G1-F080 (horthy, skip in the PR; screener strength: weak)
- bottlenecks proposed: B04, B03
- claim: The dumb zone begins around 100,000 tokens for Claude; set compaction trigger accordingly.
- why it fell: Author withdrew the flat 100k; evidence is a vendor setting; at measured per-call size a 100k trigger fires every phase. [class: weak-evidence; screener says the reason still holds against the bottleneck: partly]
- what the screener says it would add: Compile 3.6 lever 1 wants an earlier compaction setting for slice sessions (about 306k per call, 66% of tokens). The clinic record gives the actual sizes; the 100k number is not needed.

### G1-F094 (horthy, skip in the PR; screener strength: weak)
- bottlenecks proposed: B04, B03
- claim: Claude Code starts with about 50k tokens of tools and system prompt, so baseline load counts against working context.
- why it fell: A recalled fact with unsourced numbers; already budgeted in ORCHESTRATION-DESIGN; any baseline number belongs to F042. [class: no-fixflow-weakness-matched; screener says the reason still holds against the bottleneck: no]
- what the screener says it would add: The clinic measured it (CR-11, about 70k per agent). It frames token-budget lever 2 as a per-agent fixed cost to price before any fan-out.

### G1-F119 (horthy, skip in the PR; screener strength: weak)
- bottlenecks proposed: B04
- claim: Later phases are told which earlier artifacts not to read, so intermediate artifacts are consumed once.
- why it fell: Evidence only asserted; about 3% of window gain too small; do-not-read list risks cutting cited rulings. [class: weak-evidence; screener says the reason still holds against the bottleneck: partly]
- what the screener says it would add: Compile lever 1 names a smaller mandatory pre-read in slice sessions (66% of tokens at about 306k per call). A do-not-read list is one way to cut it.

### G1-F108 (horthy, already-done in the PR; screener strength: moderate)
- bottlenecks proposed: B04, B03
- claim: Size each phase to fit one context window, leaving headroom, and plan so errors are recoverable within a session.
- why it fell: Phases already sized and split; headroom not binding at a 1M window. [class: already-in-fixflow-on-paper; screener says the reason still holds against the bottleneck: partly]
- what the screener says it would add: Compile lever 1: one phase per session. Testbed slice sessions ran at about 306k context across 9,342 calls; sizing phases to the window is how to cut that.

### G1-F099 (horthy, already-done in the PR; screener strength: weak)
- bottlenecks proposed: B04
- claim: Skip built-in compaction; persist what matters to markdown artifacts so any session can resume.
- why it fell: Phase state already lives in artifacts rather than the summary. [class: already-in-fixflow-on-paper; screener says the reason still holds against the bottleneck: partly]
- what the screener says it would add: The testbed root compacted four times (574k to 970k) and still held shared state in its context; state fragments on disk would make each compaction survivable.

### G1-F152 (horthy, skip in the PR; screener strength: weak)
- bottlenecks proposed: B08, B03
- claim: Idle Claude processes are reaped after 10 minutes and usage-limited sessions resume on their own.
- why it fell: A vendor changelog line, not a harness practice. [class: not-transferable; screener says the reason still holds against the bottleneck: partly]
- what the screener says it would add: B08 had about 20 idle sessions; compile 3.1 cites a doc claim that an open session can wait out a limit. Needs a probe on this install before relying on it.

### G1-F136 (horthy, already-done in the PR; screener strength: weak)
- bottlenecks proposed: B12, B17
- claim: Fresh-context verification beats a single-context loop self-assessing a done checkmark.
- why it fell: Fresh-context verification over self-assessment is already the rule. [class: already-in-fixflow-on-paper; screener says the reason still holds against the bottleneck: partly]
- what the screener says it would add: Names the cause of B12 (sessions grading their own work) and supports the fresh reviewer for the re-read. It does not by itself catch overstated claims; the script check does.

### G2-F028 (horthy, skip in the PR; screener strength: weak)
- bottlenecks proposed: B12, B01
- claim: Stop hook runs CI-equivalent checks, exits 2 with only errors, so the agent cannot finish on a red tree.
- why it fell: Refuted: reopens pre-commit-hook skip; Docker gates take minutes; Fable never implements, so the hook gates the wrong actor. [class: reopens-an-owner-skip; screener says the reason still holds against the bottleneck: partly]
- what the screener says it would add: A claims-check hook (cited tests exist, ran) is the Stop hook the compile names for B12. Needs no Docker. Would block a slice's overstating report before it reaches the root. Hooks are an owner decision.

### G2-F121 (horthy, skip in the PR; screener strength: weak)
- bottlenecks proposed: B01, B12
- claim: Global Stop hook runs formatter, linter and checks when the agent finishes and feeds failures back.
- why it fell: Unmeasured; reopens a hook skip; on Windows with Docker gates it adds minutes to every turn. [class: reopens-an-owner-skip; screener says the reason still holds against the bottleneck: partly]
- what the screener says it would add: Compile B01 first step wants the full gate before the fix commit. A cheap-check-only Stop hook could enforce it, but the Docker cost still holds. Owner decision on hooks.

### G2-F040 (horthy, already-done in the PR; screener strength: weak)
- bottlenecks proposed: B12
- claim: Agents forget even a repeated workflow; force acknowledgement of each step and use adversarial verifiers.
- why it fell: Step acknowledgement (ticks) and adversarial verifiers already exist. [class: already-in-fixflow-on-paper; screener says the reason still holds against the bottleneck: no]
- what the screener says it would add: The testbed had refute reviewers and still recorded 20-plus overstatements. Ticks are self-report, so the mechanism failed there. B12 needs a script-resolved claim, not more acknowledgement.

### G2-F181 (horthy, already-done in the PR; screener strength: moderate)
- bottlenecks proposed: B12, B17
- claim: Tick a 'How to verify' checkbox only after running the command and seeing it pass.
- why it fell: Ticks already sit behind gates and CI; remaining risk is self-report, which F183's trial addresses. [class: already-in-fixflow-on-paper; screener says the reason still holds against the bottleneck: no]
- what the screener says it would add: B12's cited tests that did not exist were self-reported ticks. The compile's first step makes a script confirm the test exists, ran, and fails with its guard removed. Ties to a finding closing only on a harness-run test (B17).

### G2-F105 (horthy, already-done in the PR; screener strength: moderate)
- bottlenecks proposed: B21
- claim: Deduplicate findings across runs, attach evidence to each, and prune stale issues with a retest agent.
- why it fell: Register plus knowledge-store design already do dedupe, evidence per finding and stale-entry retesting. [class: already-in-fixflow-on-paper; screener says the reason still holds against the bottleneck: no]
- what the screener says it would add: B21's testbed board had 183 distinct P3 ids with no status column and no open count. Dedupe, status and retest-to-close is what the compile's script-parsed finding records call for. Retest agent is extra cost.

### G2-F016 (horthy, already-done in the PR; screener strength: moderate)
- bottlenecks proposed: B17, B04, B13
- claim: Pin every workflow artifact and published state to the commit it was written against.
- why it fell: SHA pinning already covers plan, review and evidence. [class: already-in-fixflow-on-paper; screener says the reason still holds against the bottleneck: no]
- what the screener says it would add: Compile B04 and B17 need a typed verdict naming the head SHA and who read the final head. The testbed merged 4 of 5 on 10 November with the final head unread. Pinned state would have exposed that.

### G2-F179 (horthy, already-done in the PR; screener strength: weak)
- bottlenecks proposed: B13, B12
- claim: Generate document provenance by script (git commit and branch in frontmatter, never placeholders).
- why it fell: Refuted: one asserted template; commit-pinned provenance already exists; branch shas conflict with squash-merge. [class: weak-evidence; screener says the reason still holds against the bottleneck: partly]
- what the screener says it would add: B13's generated short board and state fragments need script-written provenance so stale parts of AGENTS.md and the context map are visible. Squash-merge conflict applies to branch shas only. Evidence is weak outside the clinic.

### G2-F161 (horthy, already-done in the PR; screener strength: moderate)
- bottlenecks proposed: B03
- claim: Keep the agent stateless and own state outside it so runs can be killed, paused, resumed and restarted without loss.
- why it fell: Agent is already stateless; state lives in repo artefacts. [class: already-in-fixflow-on-paper; screener says the reason still holds against the bottleneck: no]
- what the screener says it would add: The 6 November power-off killed every session and nothing resumed for three days. The compile's resume list at sign-in rests on this. Clinic state was in the repo, but no process restarted from it.

### G2-F171 (horthy, already-done in the PR; screener strength: weak)
- bottlenecks proposed: B14, B13
- claim: Observable review states for every artefact stage make routine compliance visible from outside.
- why it fell: PR checklist and draft status already show stage from outside. [class: already-in-fixflow-on-paper; screener says the reason still holds against the bottleneck: partly]
- what the screener says it would add: B14's step display did not move for an hour. A script-written status (waiting, running, stalled) is the compile's heartbeat. External stage state is a cheap way to show progress without a hook.

### G2-F025 (horthy, already-done in the PR; screener strength: weak)
- bottlenecks proposed: B12, B17
- claim: Look at the actual traces and returned data rather than trusting summaries.
- why it fell: Raw-data review is already built into the evidence and refuter design. [class: already-in-fixflow-on-paper; screener says the reason still holds against the bottleneck: no]
- what the screener says it would add: The root had to verify every report itself in the clinic. Making the harness script read raw test output replaces the root's manual re-check (B12) and lets a gate close on harness-run evidence.

### G2-F010 (horthy, already-done in the PR; screener strength: moderate)
- bottlenecks proposed: B17, B12
- claim: Model-written tests can validate the model's own wrong design, so tests must be audited.
- why it fell: Test-cheating audit is already in the reviewer brief; no overnight design runs. [class: already-in-fixflow-on-paper; screener says the reason still holds against the bottleneck: no]
- what the screener says it would add: B17 is all model reading code. The testbed's gaps (synthetic seeder tests passing while real data was refused, B02) are tests validating the model's own design. Guard-removal positive controls address this.

### G2-F116 (horthy, already-done in the PR; screener strength: moderate)
- bottlenecks proposed: B12, B16, B04
- claim: Prompt-only phase constraints are often ignored; typed schemas per agent stop drift.
- why it fell: Typed schemas per agent already stop research drifting into fixes, so no hook is needed. [class: already-in-fixflow-on-paper; screener says the reason still holds against the bottleneck: no]
- what the screener says it would add: Compile B04 and B16 want a typed verdict naming the head SHA and a path/hash/summary return. The B12 first step is a typed claims file. The testbed used prose reports, which overstated.

### G2-F122 (horthy, already-done in the PR; screener strength: moderate)
- bottlenecks proposed: B12, B01
- claim: If the agent repeats a mistake, add a lint rule, type check or test rather than tuning CLAUDE.md; hooks for must-happen rules.
- why it fell: Repo already turns repeat mistakes into checks; hook half stays skipped. [class: already-in-fixflow-on-paper; screener says the reason still holds against the bottleneck: partly]
- what the screener says it would add: Fixes that add state (hold, lock, marker, cutoff) kept creating P1s in the testbed. A recurring defect shape becomes a table-of-ways-state-ends check (B01). The testbed's 15 lesson files were prose. Hook half needs the owner.

### G2-F144 (horthy, already-done in the PR; screener strength: moderate)
- bottlenecks proposed: B01
- claim: When implementation reveals a plan error, fix the plan upstream and rerun rather than patching code.
- why it fell: Plan errors already flow upstream into amendments. [class: already-in-fixflow-on-paper; screener says the reason still holds against the bottleneck: no]
- what the screener says it would add: Matches the B01 first step 'revert instead of patching a patch'. In the testbed, 9 of 11 gates took three rounds and fixes created at least 5 late P1s. A rule to rework upstream would have cut patch-on-patch chains.

### G2-F090 (horthy, skip in the PR; screener strength: weak)
- bottlenecks proposed: B01
- claim: Be willing to throw away a wrong design or plan and rewind rather than patching.
- why it fell: A habit, not a mechanism; the journal already records abandoned approaches. [class: no-fixflow-weakness-matched; screener says the reason still holds against the bottleneck: no]
- what the screener says it would add: As a written fix-round rule (revert, do not patch a patch) it is the B01 contract's revert step: the S11 restore fix lost its restore point after a rollback. Costs one line.

### G2-F050 (horthy, already-done in the PR; screener strength: weak)
- bottlenecks proposed: B03, B13
- claim: Handoff test: a fresh or smaller model must implement the next checkpoint from the saved workspace.
- why it fell: This is the P1 trial; repeat per phase only if P1 finds misses. [class: already-in-fixflow-on-paper; screener says the reason still holds against the bottleneck: partly]
- what the screener says it would add: Checks that a resume list at sign-in (B03) and slice-written state fragments (B13) actually let a cold session continue. Not exercised in the clinic: nothing restarted after 6 November.

### G2-F170 (horthy, already-done in the PR; screener strength: moderate)
- bottlenecks proposed: B01, B17
- claim: Add a fresh-session senior-engineer review and fix loop after every research, plan and implementation stage.
- why it fell: Fresh-context review already happens at the plan and the PR. [class: already-in-fixflow-on-paper; screener says the reason still holds against the bottleneck: no]
- what the screener says it would add: B01 first step calls for a fresh reviewer on the re-read. In the clinic round three was the root reading the diff alone. A fresh reviewer per fix round would have been the missing step. Adds one agent per round.

### G2-F136 (horthy, already-done in the PR; screener strength: moderate)
- bottlenecks proposed: B17
- claim: You must actually read the agent's outputs (plans, research, diffs); skipping the read breaks the method.
- why it fell: Readable outputs and a mandatory read are built into the close. [class: already-in-fixflow-on-paper; screener says the reason still holds against the bottleneck: no]
- what the screener says it would add: Testbed merges: 4 of 5 on 10 November and the 11 November real-data switch went in with the final head unread; that switch's first root check then failed 2 of 2,570 tests. A recorded reader per merge fixes this.

### G2-F083 (horthy, already-done in the PR; screener strength: weak)
- bottlenecks proposed: B17
- claim: Compress large changes for the human: a 100-200 line walkthrough shows which parts to check.
- why it fell: Short owner-facing compressions already exist. [class: already-in-fixflow-on-paper; screener says the reason still holds against the bottleneck: partly]
- what the screener says it would add: B17 has no independent human review in the clinic. A short walkthrough makes a human read of the final head affordable. Extra cost is one generated file per merge.

### G2-F071 (horthy, skip in the PR; screener strength: weak)
- bottlenecks proposed: B17
- claim: Risk-tiered review by touched path: low-risk PRs may merge without human review; per-file ownership holds a file for a named human.
- why it fell: Merging unreviewed on a money-and-ledger system contradicts the review rule; evidence is a second-hand percentage. [class: weak-evidence; screener says the reason still holds against the bottleneck: partly]
- what the screener says it would add: Only the path-tier half: B17's rule that a high-risk branch cannot merge on 'none' or 'own' reader needs a path or tier map. The no-review-for-low-risk half should stay dropped.

### G2-F125 (horthy, skip in the PR; screener strength: weak)
- bottlenecks proposed: B17
- claim: A CI gate requires explicit human sign-off when change size or judged complexity passes a threshold.
- why it fell: Every PR already gets review and the owner's merge, so a threshold adds nothing for one developer. [class: no-fixflow-weakness-matched; screener says the reason still holds against the bottleneck: no]
- what the screener says it would add: The testbed's gates ran Opus models only and merged unread heads. A size or risk threshold that demands a named human reader on big diffs is the B17 'cannot merge on none or own' gate. A script, not an agent.

### G2-F098 (horthy, skip in the PR; screener strength: weak)
- bottlenecks proposed: B01, B21
- claim: Scope audits and cleanup by recency: hot spots from git history get attention first.
- why it fell: Audit scope is set by the G2 register, not by git recency. [class: no-fixflow-weakness-matched; screener says the reason still holds against the bottleneck: no]
- what the screener says it would add: Compile section 6 spatial list includes files that change together; git history is its input. Also a cheap order for re-triaging the 183 P3 ids. Fits only if the replay finds the list useful.

### G2-F076 (horthy, already-done in the PR; screener strength: moderate)
- bottlenecks proposed: B12, B21, B01
- claim: Fixed templates for closing messages and PR bodies with explicit FIXED/IGNORED/SKIPPED outcomes make omissions visible.
- why it fell: Fixed closing and review templates already make omissions visible. [class: already-in-fixflow-on-paper; screener says the reason still holds against the bottleneck: no]
- what the screener says it would add: B21's board carried P3 ids with no status column. A per-finding outcome field (fixed, ignored, skipped) is the status the compile's parsed records need. Also the per-finding row for B01 fix rounds.

### G2-F146 (horthy, already-done in the PR; screener strength: strong)
- bottlenecks proposed: B02, B19
- claim: Retire the biggest unknown first with a throwaway proof against the real dependency before planning.
- why it fell: Risk-first proofs are already how the plan is ordered. [class: already-in-fixflow-on-paper; screener says the reason still holds against the bottleneck: no]
- what the screener says it would add: The testbed found at the very end that the app refused all real data and a clean install could not create tills (B02), and nothing ran on a real host (B19). Early real-dependency proof is the first-use walk and the early deploy rehearsal.

### G2-F145 (horthy, skip in the PR; screener strength: weak)
- bottlenecks proposed: B02
- claim: Models default to horizontal plans; require vertical slices wired end-to-end early.
- why it fell: Ship plan is already sequenced and shippable phase by phase. [class: already-in-fixflow-on-paper; screener says the reason still holds against the bottleneck: no]
- what the screener says it would add: The testbed had 11 slices tested against a synthetic seeder and no one walked a clean install. Vertical slices alone did not catch it. Needs a zero-seed journey in every gate, so only partly sufficient.

### G2-F001 (horthy, already-done in the PR; screener strength: weak)
- bottlenecks proposed: B02
- claim: Plans must be thin vertical slices, each runnable and checkable on its own.
- why it fell: The 40 phases are already end-to-end slices with their own checks. [class: already-in-fixflow-on-paper; screener says the reason still holds against the bottleneck: no]
- what the screener says it would add: Same as F145: the clinic slices were each checkable, yet the first-use gap stayed hidden. Shows 'checkable slice' is not enough without an end-to-end clean-install check.

### G2-F047 (horthy, already-done in the PR; screener strength: strong)
- bottlenecks proposed: B12, B01, B17
- claim: A small hand-labelled eval set from bad generations turns prompt changes into one regression number.
- why it fell: Only the narrow version survives (P1's cold-resume trial); standing re-runs re-adopt the M00-M06 skip and lack a baseline. [class: reopens-an-owner-skip; screener says the reason still holds against the bottleneck: no]
- what the screener says it would add: The clinic record supplies the baseline: 20-plus recorded overstatements, recorded fix-induced chains and seven known misses. Compile trials B01, B12, B17 replay these as frozen labelled cases. A one-off replay, not a standing pipeline.

### G2-F203 (horthy, already-done in the PR; screener strength: moderate)
- bottlenecks proposed: B13
- claim: An orchestrator tolerates stale written procedures, which hides doc drift; drift check is already adopted for CLAUDE.md.
- why it fell: CLAUDE.md drift check is an adopted P1 deliverable; the remaining resolver re-adopts the doctor-script skip. [class: already-in-fixflow-on-paper; screener says the reason still holds against the bottleneck: partly]
- what the screener says it would add: B13's AGENTS.md and context map went stale. Compile first step has tests assert routing documents against the plan. A script drift check run in the local check would have flagged those stale parts.

### G2-F199 (horthy, already-done in the PR; screener strength: moderate)
- bottlenecks proposed: B13, B12
- claim: Test suites should check truth and consistency of plan and research documents.
- why it fell: Truth and consistency checks on docs are already planned in P1. [class: already-in-fixflow-on-paper; screener says the reason still holds against the bottleneck: no]
- what the screener says it would add: Testbed CR-06 already had tests asserting documents against code, yet B13 stale parts remained. Extending them to the generated board and claims file is the compile's B13 and B12 first step.

### G2-F154 (horthy, already-done in the PR; screener strength: weak)
- bottlenecks proposed: B12
- claim: Research needs an expert check of approximate file:line accuracy and omissions.
- why it fell: Research accuracy is already checked by citation checks and refuters. [class: already-in-fixflow-on-paper; screener says the reason still holds against the bottleneck: no]
- what the screener says it would add: A scripted citation check on every cited test or file:line is the B12 claims check. The testbed's refuters did not stop reports citing tests that did not exist.

### G2-F164 (horthy, skip in the PR; screener strength: weak)
- bottlenecks proposed: B04, B03
- claim: A 'continue in a new session' command has the agent write a continuation prompt and title, then launch a new session.
- why it fell: Mid-phase continuation is rare by HR-C1; the kickoff prompt covers phase starts. [class: no-fixflow-weakness-matched; screener says the reason still holds against the bottleneck: no]
- what the screener says it would add: The testbed root compacted four times (574k to 970k tokens) and lost context. A written continuation before the window fills is a cheaper alternative to compaction. Slice sessions took 66 % of tokens, which it also bears on.

### G2-F163 (horthy, already-done in the PR; screener strength: weak)
- bottlenecks proposed: B04
- claim: A handoff command writes a timestamped file (tasks, refs, file:line changes, learnings) preferring path:line references over pasted code.
- why it fell: With one phase per session the PR journal and closing message are the handoff; a file would be a third projection that can drift. [class: already-in-fixflow-on-paper; screener says the reason still holds against the bottleneck: partly]
- what the screener says it would add: The clinic root ran across four compactions, where one phase per session did not hold. A handoff file before each compaction would stand in for summarisation. Drift risk holds.

### G2-F165 (horthy, already-done in the PR; screener strength: moderate)
- bottlenecks proposed: B04, B03
- claim: Default to one phase per run with a mandatory pause after automated checks and a fixed message.
- why it fell: One phase per run with a structured pause already exists. [class: already-in-fixflow-on-paper; screener says the reason still holds against the bottleneck: no]
- what the screener says it would add: Compile section 3.6 first lever is one phase per session for slice windows (66 % of November tokens, about 306k per call). The clinic slice sessions did not follow it. Bears on the token budget, not the proof of a single bottleneck.
