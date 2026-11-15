# Items to classify, file 2: ideas of themes REV

### REV-01 (idea, theme REV, In use)
name: Two-level merge gates with refute-reviewers
problem it is meant to solve: We need agent output checked before it merges, so no unresolved critical finding reaches main.
how: Root runs the full check; two read-only Opus reviewers try to refute claims; findings numbered P1 to P3 with owner; root reads round three.
where it stands: In use in the testbed for every slice: 9 of 11 [M] gates took three rounds; 19 [M] P1 findings in round one; at least 5 [M] more P1 created by fixes.

### REV-02 (idea, theme REV, In use)
name: Close findings only on tests with positive controls
problem it is meant to solve: Findings and claims closed on a model's say-so, and our own checks reported success wrongly: a drill printed PASS while testing nothing.
how: A finding closes only on a harness-run test; each 'nothing found' check needs a case it must find; remove one lock at a time.
where it stands: In use in the testbed; at least four [M] instances later proved less than claimed. A trial for the root's gate in FixFlow is proposed.

### REV-03 (idea, theme REV, In use)
name: Review bots, unmeasured-as-failure, hand-back labelling
problem it is meant to solve: We want review that adds no noise, no missing scan counted as clean, and no instructions smuggled in through hand-backs.
how: A per-PR Opus reviewer exists, gates treat unmeasured as failed, and Claude Code labels subagent reports as model output, not user instruction.
where it stands: Already in place or provided by the platform; nothing new to build or measure.

### REV-04 (idea, theme REV, In use)
name: Dated audits by parallel automated reviewers
problem it is meant to solve: We want stale guidance and missing evidence found before we build on a repo, and a clear boundary on what a recall tool puts in context.
how: Three parallel automated reviewers plus an integration review audit a repo, separating hash-verified preservation from substantive review; a static fit audit reads tool code.
where it stands: In use in the testbed, done once: 61 files reviewed [M], 14 findings [M], 641 cached members re-hashed with no failures [M], 5 peer-review corrections closed [M]. Cost not recorded.

### REV-05 (idea, theme REV, In use)
name: Assess, refute by default, then judge idea sweeps
problem it is meant to solve: We want to judge about 1,900 sweep cards fairly, without the orchestrator scoring them and without one reader's enthusiasm promoting weak ideas.
how: Cards cluster into families; two Opus reviewers score each; a fresh refuter attacks every adopt or trial family by default; a judge decides.
where it stands: In use on two sweeps: Horthy, of 144 attacked families 65 refuted and 79 narrowed, none passed [M]; BAML, none of 24 families proposed for adopt survived and 4 of 22 proposed for trial did [M].

### REV-06 (idea, theme REV, In use)
name: Screenshot capture and rubric scoring of screens
problem it is meant to solve: We want screen quality and UI changes checked with visible before and after evidence, without a human looking at everything.
how: A capture script screenshots every role and screen at 375 and 1280 px with a manifest; an Opus rubric review and refutation score results.
where it stands: In use in the testbed: 130 pages, 260 PNGs [M]; rubric score rose from 64 to 110 of 160 [M]; of 59 findings 16 fixed, 20 partly, 22 not, 1 regressed [M].

### REV-07 (idea, theme REV, In use)
name: Fresh-context skeptic per finding
problem it is meant to solve: Confident but wrong findings get into the plan when the same reasoning that produced them also checks them.
how: An Opus xhigh skeptic sees only the claim, evidence and failing condition; one per P0 and per P1 in sensitive areas.
where it stands: In use since gate G2: 12 [M] skeptics over 109 [M] claims; 8 [M] verdicts lowered a severity, none refuted a claim. A second-lens brief for the geofence claims (a second skeptic reading the symptom from another angle) is designed, not run.

### REV-08 (idea, theme REV, In use)
name: Skeptic budget capped at twelve, allocated by priority
problem it is meant to solve: Unbounded verification multiplies Opus tokens, but at gate G2 the first four analysts to finish used up all the skeptics, leaving other P1 claims unverified.
how: At most 12 Opus skeptics per run, given to highest-priority claims first; claims over the cap are listed or dispositioned, never dropped.
where it stands: In use: the cap is applied, and priority allocation became a rule after G2. 12 [M] skeptics covered 109 [M] relocated claims; 8 [M] verdicts lowered severity. Overflow handled by corroboration.

### REV-09 (idea, theme REV, In use)
name: Corroboration policy for over-cap claims
problem it is meant to solve: Claims beyond the skeptic cap cannot be verified, yet we must neither drop them nor trust them blindly.
how: Mark each over-cap claim C (corroborated elsewhere, natively checked, or arithmetic) or O (open, awaiting a fact); buy no second Opus pass.
where it stands: In use at gate G2 on 17 [M] over-cap rows: 15 [M] ruled C and 2 [M] ruled O. Unattacked claims stay questions for me, not findings.

### REV-10 (idea, theme REV, In use)
name: Verified register, open-risks list and refuted list
problem it is meant to solve: A single pass or fail list loses unsettled claims and hides refutations; every finding needs a uniform record of how well it is verified.
how: From verdicts, a script derives a verified register, an open-risks list and a refuted list; each finding has a severity and status code.
where it stands: In use at gate G2 as the verified findings register: 139 [M] findings; a P0 on the open list blocks work on its area. The deriving script is not yet built.

### REV-11 (idea, theme REV, In use)
name: Citation check over every claim
problem it is meant to solve: Analyst and research claims may quote text that moved, was fixed or never existed, and agent research may misquote its sources.
how: A Sonnet agent per analyst re-locates each quote by content and git history and marks it located, moved, dead or already fixed.
where it stands: In use at gate G2 and in the clinic research pack: 109 [M] claims re-located, none dead; 575 of 579 [M] quotes matched exactly. It checks existence only.

### REV-12 (idea, theme REV, In use)
name: Honest-empty web research and re-fetch check
problem it is meant to solve: A research agent that cannot reach the web may invent facts, and a cited web fact may not appear on the page.
how: Agents log tool status and URLs tried, stop after two denials, and may return empty; Sonnet re-fetches key URLs and downgrades unconfirmed facts.
where it stands: In use at gate G2: 11 of 12 [M] web statements re-checked were confirmed on the page. The honest-empty rule is part of the research schema.

### REV-13 (idea, theme REV, In use)
name: Evidence tags and honest labels on every fact
problem it is meant to solve: Readers cannot tell how strongly a fact is established, and reports blur observed, inferred and never-checked, or mistake automated review for human review.
how: Every claim cites path:line with a quote and is tagged verified-in-code, verified-by-command, web or inferred; agents return facts, not severity, unless asked.
where it stands: In use as a convention in all agent definitions and the clinic testbed; nothing enforces it. Clinic labels were wrong at least twice [M].

### REV-14 (idea, theme REV, In use)
name: Multi-lens architecture panel with judges and refuters
problem it is meant to solve: A plan repaired in place can hide a wrong foundation, and a design written alone carries blind spots; I wanted the architecture tested before work started.
how: Four Opus architects propose, one lens each; two opposed Opus judges score each area; 45 claims each get two refuters; the main session rules.
where it stands: In use: run once on 1 November with 101 [M] agents, about 10.1M [M] subagent tokens, 34 [M] minutes; verdict: no wrong foundation. 7 [M] refuters were lost to a usage limit.

### REV-15 (idea, theme REV, In use)
name: Critique rounds on a design before it runs
problem it is meant to solve: A design written alone carries blind spots, and finding them after a run is costly.
how: Three Opus critics and two external reviews critique the design; section 11 records each accepted or rejected point with its reason.
where it stands: In use; two rounds done. Version 3 accepted data-preservation, verification buckets, script bookkeeping, gate recipe, dump inspection, evidence and secret rules.

### REV-16 (idea, theme REV, In use)
name: Two refuters per claim: repository and operations
problem it is meant to solve: We want every recommendation's premises checked before we build on it, including facts about real hosts and phones that a code-only reader misses.
how: Each falsifiable claim is attacked by two fresh Opus refuters, one reading the repository, one operations, defaulting to refuted and needing executed counter-evidence.
where it stands: In use: 45 panel claims attacked; several premises were refuted or unmeasured and narrowed before the plan [M]. Knowledge store: 1 confirmed, 21 narrowed, 8 refuted [M]; second pass 6 narrowed [M].

### REV-17 (idea, theme REV, In use)
name: Completeness critic over a draft
problem it is meant to solve: A finished draft can still lack mechanisms, hold contradictions or be hard for me to read, so we want a last read for completeness.
how: One Opus xhigh critic reads draft and register, listing missing items, unsupported claims, contradictions, readability problems; each becomes a numbered amendment.
where it stands: In use on the knowledge-store design, run twice: 19 missing, 15 unsupported, 19 contradictions, 9 readability items [M]; later 22 contradictions, 15 mismatches, 17 leftovers [M]. All text repair.

### REV-18 (idea, theme REV, In use)
name: Skeptic round with forced verbatim citation
problem it is meant to solve: Reviews stay vague in both directions; we want attacks and rebuttals that point at exact text.
how: A skeptic files counterexamples quoting the passage; the designer accepts with a diff or rejects citing a verbatim rule; one round, then stop.
where it stands: In use in the testbed, once: 21 attacks, 12 accepted, 3 rejected on one ground, 6 on another [M]; 15 design elements revised [M]. Both sides were the same model family.

### REV-19 (idea, theme REV, In use)
name: Hand-written reading-coverage ledger
problem it is meant to solve: A report may claim sources were read when they were not, so we want coverage to be visible.
how: A file-by-file, page-by-page table records what was read in full or sampled, with access limits and a verification record.
where it stands: In use in the testbed: 41 coverage rows checked by script on 2026-09-30 [M]. Hand-maintained, so it drifts; effect on rework not yet measured.

### REV-20 (idea, theme REV, In use)
name: Design adjudicated by sweep, judges, refuters, my critique
problem it is meant to solve: A design from one session carries unchecked claims, and my critique is sometimes right and sometimes not, so we neither obey nor ignore it blindly.
how: Four workflows: a research sweep, four architects scored by three judges, refuters plus a completeness critic, then each point of my critique checked by two verifiers.
where it stands: In use on the knowledge-store design: about 15M subagent tokens [M]; scores of 360: A 292, C 282, D 281, B 222 [M]; critique verdicts partly or mostly right [M]; 20 amendments.

### REV-21 (idea, theme REV, In use)
name: Sonnet builds, Opus reviews
problem it is meant to solve: We hoped Sonnet at lower effort could match Opus through cached reasoning, but on judgment-heavy work the quality came from review.
how: The cheaper model builds and the stronger model reviews. Available today with no library.
where it stands: In use: an Opus reviewer found a serious defect in 9 of 14 [M] Opus-built clinic slices. Our tests resolve only ±11 to 14 points [E], wider than the 2 to 8 point [M] tier gap.

### REV-22 (idea, theme REV, Tested)
name: Delta check of a plan revision by fresh critics
problem it is meant to solve: Each plan revision can bring in new defects, so I want a fresh read of what changed before the revision is trusted.
how: Fresh Opus critics read only a plan's changes; Sonnet re-locates blocker and major citations; findings are tabled and folded into the next version.
where it stands: Tested: the v6-to-v8 delta check found 1 blocker, 20 major, 20 minor [M]; the section 7 amendment critic found 1 blocker, 7 major, 12 minor [M]; 19 accepted, 1 open ruling.

### REV-23 (idea, theme REV, Built)
name: Binding PR review: fresh, refute-by-default, head-bound
problem it is meant to solve: A review of an older commit can pass for approval of a later one, and an author who briefs its own reviewer chooses what is attacked.
how: Coordinator sends a fresh Opus reviewer, refute-by-default, bound to the PR head commit, with a brief built from the phase's register ids.
where it stands: Rule accepted 13 Nov; reviewer agent and repo-conventions skill built on draft PR #185. No lane has reported ready yet, so it has not run on a real PR.

### REV-24 (idea, theme REV, Built)
name: Transcript audit at each merge
problem it is meant to solve: The merge record is self-reported and fields have been filled falsely; we have no independent source for who read the final head.
how: Read-only script over our own tool-call transcripts tells whether a reviewer read the final head and how many root edits each merge had.
where it stands: Used once in the testbed with 0 [M] model calls. The merge-time version is designed for harness v2 phase 3, not yet run; it needs transcripts to survive cleanup.

### REV-25 (idea, theme REV, Built)
name: Cross-runtime contract map
problem it is meant to solve: Silent breaks between web, mobile, backend and configuration live in contracts, not imports, so neither a search nor an import graph sees them.
how: A script extracts client URL to route, settings keys, migration chain, slice contracts, outbox kinds and handlers, and file-tied invariants as review input.
where it stands: Partly built as a script: 65 of 73 client URL literals matched 77 route decorators [M]; 46 settings keys, 46 migration links [M]. Value to review untested.

### REV-26 (idea, theme REV, Built)
name: Specialist reviewers for offline sync, migrations, security
problem it is meant to solve: Our offline engine, populated-table migrations and security code have FixFlow-specific rules that generic checklists miss or tell agents to wrongly fix.
how: Three sourced skills with paired Opus reviewer agents, each refuting by default and running fixed commands only, never probing a live host.
where it stands: Built: skills and Opus agents on draft PR #185, not merged and not yet tested.

### REV-27 (idea, theme REV, Designed)
name: Fix-round contract: two rounds, revert, test per finding
problem it is meant to solve: Our fixes add new stored state with untested endings, so they create new defects; 64 % [M] of reviews sent slices back.
how: Two rounds; a fail-before, pass-after test per finding; revert instead of patching a patch; fresh agent after two failed fixes.
where it stands: Designed into harness v2 phase 3; not yet run. Testbed record: 2.8 [M] review rounds per slice. First step is a replay on recorded chains under the seal.

### REV-28 (idea, theme REV, Designed)
name: Review as a gate workflow with typed verdict
problem it is meant to solve: One root session is our serial gate for briefing, reading, checking and board edits, so nothing leaves faster than the root.
how: Reviewers run in a saved workflow, one gate at a time, and return a typed verdict naming the commit they read; the root keeps judgment.
where it stands: Designed in harness v2 phase 3; not yet run. Gain is bounded: the root is 15.3 % [M] of tokens. Target: no root compaction across five gates [T].

### REV-29 (idea, theme REV, Designed)
name: Merge queue that refuses a wrong head
problem it is meant to solve: High-risk merges went in with nobody reading the final head, 5 of 6 [M], and the root merged and edited the board by hand.
how: Local script merges one at a time under a lock, tests the merged result, checks the verdict names the head, requires a reader field.
where it stands: Designed in harness v2 phase 3; not yet run. Record-only first: replayed over the 65 [M] recorded merges it must flag the unread heads of 10 and 11 November.

### REV-30 (idea, theme REV, Designed)
name: Claims file and verdict script per gate round
problem it is meant to solve: Session reports cite tests or evidence that do not exist or match: 20-plus [M] recorded overstatements. A model re-reading its own claims has not caught them.
how: Each slice commits a claims file; a script runs each cited test at the fix's parent and at head, and flags weakened tests.
where it stands: Designed in harness v2 phase 3; never built in the clinic repo, not yet run. Replay first over recorded gates; target false flags under 10 % [T].

### REV-31 (idea, theme REV, Designed)
name: Preexisting-failure and fail-before claims must cite proof
problem it is meant to solve: Agents excuse a new skip or red test as 'preexisting' without proof, and a reviewer's 'test X fails on base' can be unverified and false.
how: Two brief clauses: a 'preexisting' excuse must show the same failure on the base commit; fail-before lines cite the command and result.
where it stands: Adopted as proposals for the ship plan's routing rules; cost almost nothing; not yet tested. Pass bar: zero uncited merges over the first 5 [T] code phases.

### REV-32 (idea, theme REV, Designed)
name: One finding table and counting parser
problem it is meant to solve: Minor findings pile up uncounted: 183 [M] P3 ids carry no status, so we have no open count, and a parser can silently lose rows.
how: Write P0 to P3 and each status once; parser takes allowed values from that table; unmapped status fails; it reports rows kept and dropped.
where it stands: Designed in harness v2 phase 3; a script, no tokens, not built. Target: zero unmapped statuses, every dropped row explained, and an open count over the 183 [M] P3 ids.

### REV-33 (idea, theme REV, Designed)
name: I read marked hunks on high-risk merges
problem it is meant to solve: High-risk merges (money, stock, access, import, restore) went in with no human or fresh reader of the final head, and I cannot read every line.
how: Opus reviewer marks invariant-touching hunks; on high-risk merges I read only those, at the same head commit; the record names me and the commit.
where it stands: Designed as a live trial on three merges in harness v2 phase 3; not yet run. About 3 hours [E] of my reading. Direct fit to the 5-of-6 [M] unread number.

### REV-34 (idea, theme REV, Designed)
name: Break-even rule for extra review legs
problem it is meant to solve: Different models may catch different defects, and we need a rule for when the extra review legs are worth their time.
how: Claude plans and implements, Codex reviews read-only, a human decides, Claude repairs; each leg judged by a break-even formula.
where it stands: Designed from a pasted routine; never trialled. An outside study reports 91.4 vs 82.8 percent on 116 tasks [S]. Break-even inputs F=120, o=12, s=5/25/60 minutes are illustrative [I].

### REV-35 (idea, theme REV, Designed)
name: Verdict lists suppressions and gate-config changes
problem it is meant to solve: I want to know when a check was made to pass by suppressing it or editing its configuration, instead of fixing the code.
how: The reviewer's verdict lists each added inline suppression and each edit to lint, type, import or CI config with reason, checked by diff grep.
where it stands: Suppressions sentence adopted; gate-config naming and the mechanical file list are trials over the first 5 code PRs [T]. Not yet tested; the testbed gate already refuses added skips.

### REV-36 (idea, theme REV, Designed)
name: Blast-radius touch list for a fix
problem it is meant to solve: Fixes introduce defects in files nobody looked at, and we want reviewers shown what a fix could touch.
how: A script lists changed functions, callers, importers, co-changing files and touching tests, and attaches the list to the reviewer's brief.
where it stands: Designed in v2 phase 3; not yet run. Zero-token test on ten recorded fix cases: kept if six of ten [T] fall inside and the list stays within about 15 files [T].

### REV-37 (idea, theme REV, Designed)
name: Code yields candidates, device evidence yields conclusions
problem it is meant to solve: Reading code on main cannot tell us what an older build does on real phones, so confident code audits can mislead.
how: Label each finding in_field_apk (yes, no, unknown); a field protocol, not the audit, decides what phones do; main-branch findings are candidates.
where it stands: Designed as a rule in orchestration design v3; not yet tested. It needs me to run the device protocol on a phone.

### REV-38 (idea, theme REV, Designed)
name: Skeptic verdict rules with an unverifiable outcome
problem it is meant to solve: A skeptic told to refute by default can delete true claims just by saying it could not tell.
how: Confirmed needs the path traced from cited lines to the failing condition; refuted needs positive counter-evidence; otherwise unverifiable, stating what would settle it.
where it stands: Designed in orchestration design v3, replacing the default-refute framing; not yet tested.

### REV-39 (idea, theme REV, Designed)
name: Demote, never delete
problem it is meant to solve: A cheap register check saying an item is fixed could silently drop the deep analysis of it.
how: A 'fixed' result rewrites the Opus brief to 'claimed fixed at file:line, confirm or refute' rather than removing the analyst.
where it stands: Designed as a rule for gate G1 in the orchestration design; not yet tested.

### REV-40 (idea, theme REV, Designed)
name: Diff-restricted register check with one-hop rule
problem it is meant to solve: Re-auditing every old register item is expensive, but 'unchanged' can be wrong when an imported file changed.
how: An item is unchanged only if neither its cited files nor files one import hop away changed; otherwise it is checked in depth.
where it stands: Designed in orchestration design v3 as a Sonnet high task; not yet tested.

### REV-41 (idea, theme REV, Designed)
name: Claims carry a failing condition; backlog field
problem it is meant to solve: Claims with no stated trigger cannot be checked, and caps on what analysts report hide omissions.
how: Each claim gets file:line and a failing condition; analysts report freely and park what they cannot write up in a backlog; P0 and P1 never truncated.
where it stands: Designed in orchestration design v3, replacing the six-claim cap per analyst; not yet tested.

### REV-42 (idea, theme REV, Designed)
name: Verify a rewrite by content, not commit message
problem it is meant to solve: A rewritten plan was reported done by its commit message while content had been lost; we want to catch that before anyone builds on it.
how: After a plan rewrite, compare the actual text with the intended text instead of trusting the commit message.
where it stands: Adopted as a plan rule, drawn from the program's one recorded state loss [M]. Not measured further.

### REV-43 (idea, theme REV, Designed)
name: Adjudication record so later sessions can disagree
problem it is meant to solve: Without the reasons kept, a later session would have to re-run everything instead of disagreeing with reasons.
how: At G2 we write down the conflicts the orchestrator adjudicated and why, plus the verified register and open risks.
where it stands: Designed as part of the G2 output in the orchestration design; not yet tested.

### REV-44 (idea, theme REV, Idea)
name: Observed chains of fixes that created defects
problem it is meant to solve: We want to understand why fixes keep opening new defects, so fix rounds converge instead of looping.
how: Case studies of fixes that opened new defects; proposed per-round split into old, caused-by-fix and new, with a state table per new hold.
where it stands: Proposed from an observation record, not yet a built mechanism: one clinic fix chain, the cutoff guards RS-2 and RS-5, took three rounds [M] with a new P1 in rounds 1 and 2. No tally of fix-induced findings exists yet.

### REV-45 (idea, theme REV, Idea)
name: Record who read the final commit
problem it is meant to solve: Review is all a model reading code, and 5 of 6 [M] high-risk merges went in with the final head unread; nothing records it.
how: Each merge records who read its final head; high-risk merges cannot merge on 'none' or 'own'; a finding closes only on a harness-run test.
where it stands: Proposed; testbed structure measured: round three was read only by the root for 9 of 11 [M] slice gates. Target: unread high-risk merges from 5 of 6 [M] to zero [T].

### REV-46 (idea, theme REV, Idea)
name: Second model-family review pass
problem it is meant to solve: Code that Opus writes and reviews may share blind spots; a different vendor's model might catch what a same-model reviewer misses.
how: One Codex review pass and one fresh Opus pass at the frozen commits of known misses, scored on misses caught; needs the replay seal.
where it stands: Deferred under decision D19: code would leave my machine and six to seven [M] known misses give only an exploratory result. Never tested; no Codex CLI here.

### REV-47 (idea, theme REV, Idea)
name: Recurring defect shapes in the reviewer brief
problem it is meant to solve: Defect shapes we already know sit in a checklist reviewers never see, so the same kinds of defect keep coming back.
how: Seven recurring defect shapes, plus an eighth for any new stored copy or flag, go in the Opus refute brief, one required line each.
where it stands: Trial: moved into the ship plan's top trial 6; not yet tested. First step is a look-back test on known-defect diffs, with and without the line.

### REV-48 (idea, theme REV, Idea)
name: Deviations-from-Scope report and unrequested changes
problem it is meant to solve: We want to see when a diff drifts from the planned Scope, or adds unrequested abstractions, since only the implementer checks that today.
how: A journal heading reports deviations from plan; the Opus reviewer lists unaccounted hunks, boxes ticked without a diff, and changes no Scope box requires.
where it stands: Trial, not yet tested, over the first 3 to 5 Opus-reviewed phase PRs [T]. The bottleneck compile’s refuters narrowed two of the parts to FixFlow-only.

### REV-49 (idea, theme REV, Idea)
name: Reviewer-brief additions with no testbed counterpart
problem it is meant to solve: We want FixFlow reviewers to catch plan deviations, unnamed config exceptions, over-engineering and design flaws that the testbed never needed to handle.
how: A bundle of eight FixFlow reviewer items: suppression and gate-config lists, deviation report, defect shapes, gate-file list, and a design audit.
where it stands: Trial, not yet tested here. The bottleneck compile’s refuters narrowed five of the items to FixFlow-only; one would add a standing step for me.

### REV-50 (idea, theme REV, Idea)
name: One cumulative-drift audit after ten PRs
problem it is meant to solve: Per-PR review cannot see drift that builds across PRs, such as a helper reimplemented twice, and we want one look at the whole.
how: One fresh Opus audit after the 10th merged code PR, covering the diff from the P1 merge to main.
where it stands: Trial, one audit only; not yet tested. Pass bar is at least 2 findings I accept [T] after the 10th merged code PR [T].

### REV-51 (idea, theme REV, Idea)
name: Pick among candidate fixes by executed test
problem it is meant to solve: A single fix often creates a new defect, and choosing among candidates by a test that runs may avoid that.
how: Generate three candidate fixes per recorded chain; a frozen pre-written test plus a guard-removal check rejects the candidate that causes the defect.
where it stands: Deferred in harness v2, not run unless switched on. Outside, on SWE-bench Lite: 25.7% by vote, 27.0% with a regression filter, 32.0% with a reproduction test [S].

### REV-52 (idea, theme REV, Idea)
name: Audit the phase routine's seven obligations
problem it is meant to solve: Compliance with the phase routine is self-reported, so skipped steps look the same as done ones.
how: A fresh Opus auditor sees only artifacts (PR, git log, edit history, results, OWNER-VIEW page, closing message) and scores 7 binary obligations per phase.
where it stands: Trial over P1 and P2a; not yet tested. The source evidence was one confounded anecdote, and a count-and-split version was refuted.

### REV-53 (idea, theme REV, Idea)
name: Pure prompt-input boundary for the skeptic
problem it is meant to solve: The skeptic must see only the claim, evidence and failing condition, but nothing in the code stops other fields leaking into its prompt.
how: A function returns only claim, evidence and failing condition, with a replay test that the rendered prompt holds no forbidden field. About 10 lines [E].
where it stands: Trial, not yet tested, not refuted. It is hygiene: no contaminated skeptic is on record.

### REV-54 (idea, theme REV, Idea)
name: Saved script for the PR-review stage
problem it is meant to solve: The PR-review stage is prose steps, so commit binding and the per-id fail-and-pass table depend on the agent, and workflows get rewritten each time.
how: One committed workflow script takes the register ids and head commit, calls the PR-reviewer agent with a verdict schema, and compares commits in code.
where it stands: Trial after P1; not yet tested. Only the deterministic part is to be scripted; the whole-routine version was refuted.

### REV-55 (idea, theme REV, Idea)
name: Record-only rule checks over returned objects
problem it is meant to solve: Agent outputs are checked by judges or by eye; cheap rule checks could catch violations the gates missed without spending tokens.
how: A node script over the committed evidence JSON checks quote length, listed URLs, unique ids and evidence format, run record-only with no retry.
where it stands: Trial, not yet tested; downgraded from adopt. The refuter's naive pattern flagged 174 of 707 evidence strings [M], mostly legitimate, so the allow-list is the work.

### REV-56 (idea, theme REV, Parked)
name: List dimensions and covered combinations in review briefs
problem it is meant to solve: Defects can hide in combinations of changes that no test covers, as in BAML's own post-mortem.
how: Add a line asking the reviewer to list the dimensions of the change and the combinations the tests cover, in the next 3 briefs [T].
where it stands: Parked: the refuter found one post-mortem is thin evidence, our briefs already name similar shapes, and the trial had no control.

### REV-57 (idea, theme REV, Parked)
name: Agents audit run transcripts for wasted calls
problem it is meant to solve: We wondered whether briefs waste calls or ignore their own rules without anyone seeing it.
how: An Opus pass reads the six lane transcripts and lists wasted calls and ignored rules; I or the orchestrator triage.
where it stands: Parked: the refuter found recorded quota failures came from fan-out size and effort, not waste inside agents; fixed overhead dominates. The earlier transcript audit found nothing that caused a mistake.

### REV-58 (idea, theme REV, Parked)
name: Six-claim cap per analyst
problem it is meant to solve: We did not want caps on what analysts report to hide omissions.
how: Version 2 capped each analyst at six claims; version 3 replaced it with a backlog field and kept only the verification cap.
where it stands: Parked: superseded in orchestration design v3 by the backlog field, after an external reviewer's objection that six findings per analyst hide omissions.

### REV-59 (idea, theme REV, Parked)
name: Materiality skeptic and 1-in-5 sample
problem it is meant to solve: We wanted extra assurance on findings, but the added layers cost spend without moving the plan.
how: Two extra verification layers from the first design: a skeptic judging materiality and a one-in-five sample; the v2 rewrite removed both.
where it stands: Parked: removed in orchestration design v2 because the layers added spend without moving the plan. Severity is now re-set by the main session at gate G2.

### REV-60 (idea, theme REV, Parked)
name: Numbered evidence ids for verifiers
problem it is meant to solve: We worried a verifier could cite a fabricated URL or quote.
how: Evidence handed to verifiers and skeptics is numbered; they cite ids and the script rejects unknown ids.
where it stands: Parked: it conflicts with the design, where a refuted verdict needs counter-evidence the skeptic finds itself, and the citation check already catches fabrication. No fabricated URL on record.

