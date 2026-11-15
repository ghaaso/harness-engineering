# Dossier: block "claims" (mechanisms: unverified_claims)

15 bottlenecks and 78 ideas. Numbers carry tags: [M] measured, [E] estimated, [G] guess, [S] setting or outside figure, [T] target, [I] illustrative.

## Bottlenecks

### PR-EVFORMAT · Evidence-format checks misfire
family check; state: Open: Allow-list not written (card T-08); package WP3; metrics: hallucination, efficiency (primary hallucination)
what: A naive 'path:line — quote' regex flags many legitimate evidence strings (library paths, commands, web forms), so the check script needs an allow-list.
evidence: 174 of 707 W2 evidence strings flagged, mostly legitimate [M].
what fixing it unlocks: A tuned record-only check that finds real format violations at zero tokens.
first step: Write the allow-list for library, command and web forms; run the check record-only with no retry.

### PR-FALSEGREEN · Green checks that test nothing
family check; state: Partly closed: Lab gates fixed; CI change scoped to P1; package WP2b; metrics: quality, hallucination (primary quality)
what: A check can pass while testing nothing: backend integration tests all skip without a database URL, mobile CI passes with no tests, and an installer reported false success.
evidence: conftest skips every integration test when FIXFLOW_TEST_DATABASE_URL is unset [M]. One installer printed 'INSTALL OK' with nothing installed [M].
what fixing it unlocks: Green that means something: the lab baseline already shows 757 tests, 0 integration tests skipped [M].
first step: Confirm CI fails on skipped integration tests and runs Jest without --passWithNoTests.

### B12 · Agent reports overstate what was done
family review; state: Open: Harness v2 phase 3; claims script not built; package WP3; metrics: hallucination, quality, efficiency (primary hallucination)
what: Session and agent reports claimed tests, evidence or runs that did not exist or did not match, and model re-checks did not stop it.
evidence: 20-plus recorded overstatements, with no denominator [M]. S11 round 2 had two claims its cited evidence did not support [M]. My reviews corrected model counts three times [M].
what fixing it unlocks: Claims anyone can recheck by script, flagging recorded overstatements with false flags under 10 % [T], so the root stops re-verifying by hand.
first step: Build a claims file checked by script, record-only with an allow-list, and replay it over recorded gates.

### B17 · Final commits not yet read by a person
family review; state: Open: Harness v2 phase 3; FixFlow reviews bind head SHA; package WP3; metrics: quality, hallucination (primary quality)
what: All review is a model reading a model's code, and most high-risk branches merged before anyone had read their final head commit.
evidence: 4 of 5 merges on 10 Nov unread [M]; 5 of 6 high-risk final heads unread [M]. Round three was the root alone in 9 of 11 gates [M].
what fixing it unlocks: Unread high-risk merges cut from 5 of 6 [M] to zero [T].
first step: A merge queue recording who read the final head, record-only over the 65 recorded merges first; replay seven known misses.

### W2 · Agents' compliance is self-reported
family review; state: Open: No hooks by choice; measurement designed; package WP3; metrics: hallucination, quality (primary hallucination)
what: With no hooks, 'routine skipped', 'store never consulted' and 'store useless' look the same from outside; analysts' extra reads are self-listed and unaudited.
evidence: 148 idea families and 339 cards bear on it; the first pass kept 10 adopt and 19 trial [M]. Missed-store counts are only a lower bound; reads not yet measured.
what fixing it unlocks: An outside check of compliance without hooks: transcript tallies, a PR-body CI check, reviewer-brief clauses and a read audit.
first step: Tally transcripts after P1-P3; run an advisory PR-body check over five PRs; measure one analyst's reads.

### L3 · Verifiers not yet shown to catch defects
family review; state: Open: One adopt and nine narrowed trials; package WP3; metrics: quality, hallucination (primary quality)
what: Outputs are capped and refuters run first, but no reviewer, gate or verifier has yet been shown to catch defects that slipped through before.
evidence: 95 idea families and 255 cards bear on it; the first pass kept 1 adopt and 9 trials [M].
what fixing it unlocks: Stronger sensors and reviewer briefs that catch our recurring defect shapes, proven on known misses.
first step: A/B retrospective of defect shapes on three known defects; add the reviewer-brief lines.

### PR-VERIFYBUDGET · Verification budget spent first-come
family review; state: Partly closed: Budget-by-priority adopted as a lesson; package WP3; metrics: hallucination, quality, token_cost (primary hallucination)
what: The skeptic cap was used up by the first analysts to finish, so plan-critical claims (geofence, security, drain) overflowed unchecked.
evidence: 12 Opus skeptics, the cap, for 139 findings in G2 [M]; all twelve went to the first four analysts [M].
what fixing it unlocks: Allocating by priority keeps plan-critical claims checked while spend stays bounded, with any overflow carried as a named risk.
first step: Reserve skeptic slots for P0/P1 claims; log the ids that overflow.

### PR-DOCDRIFT · Docs and memory drift from the code
family review; state: Partly closed: Head check in P1 scope; memory pointer-only; package WP6c; metrics: hallucination, quality, efficiency (primary hallucination)
what: CLAUDE.md facts, prose docs, design lines and memory drift from the code and each other; for example, HANDOFF A2 prescribes what CLAUDE.md forbids.
evidence: 517 of 1,268 backticked file names in docs do not resolve [M]. The knowledge-store seed (121 rows) found 4 contradictions; its later contradiction list names 7 [M].
what fixing it unlocks: Agents trust current facts, and we gain a cleaned, checkable seed corpus for the knowledge store.
first step: Build the Alembic-head CI check; resolve each contradiction against git in one corrections PR.

### PR-PLANLOSS · Plan rewrites can lose content
family review; state: Closed: Verify-by-content rule adopted; package WP3; metrics: hallucination, quality (primary hallucination)
what: A plan rewrite was reported from its commit message rather than its content, and content was lost.
evidence: One recorded state loss, commit 093b793 [M]; the programme's only one.
what fixing it unlocks: Plan changes we can trust.
first step: Diff the content at every plan bump.

### PR-AUTHORBRIEF · Author wrote its own reviewer's brief
family review; state: Closed: Coordinator owns binding review; P1 passed it; package WP3; metrics: quality (primary quality)
what: When the implementing lead decides what its binding reviewer attacks, the review can miss the author's blind spots.
evidence: 1 major refuter finding [M].
what fixing it unlocks: Independent binding review of every PR.
first step: The coordinator dispatches the binding review on each ready PR.

### PR-BRIEFFACTS · Agents start without the settled facts
family orchestrator; state: Partly closed: Gate record first; commit-push-tag before briefing; package WP10a; metrics: hallucination, efficiency, quality (primary hallucination)
what: Agents were briefed before settled facts existed: G2 analysts fell back on hypotheses, sweep assessors lacked design rules, and a lane could read uncommitted plan text.
evidence: One gate record missing at dispatch [M]. 8 of 24 assessment adopts were already programme law [M]. One minor refuter finding on uncommitted plan text [M].
what fixing it unlocks: Every analyst and lane starts from settled, committed facts, with fewer wasted assessment and refuter passes.
first step: Check the gate file exists before dispatch; put the section 5.2 text in the next assessment brief.

### LIB-S7 · Step 7: the check cannot confirm equality
family library; state: Open: mapped and weighed; no fix agreed; package WP6a; metrics: quality, token_cost, hallucination (primary quality)
what: Matching the strong model matches its mistakes too; reviews are costly, tests stay green while defects surface later, and an entry's own test can certify a defect.
evidence: Alone 2.3 % [G], last 16.2 % [G]; 10 [M] limitations; 38 of 59 [M] chosen cases break here, the most of any step.
what fixing it unlocks: Up to 16.2 % [G]; the gate decides equal output, the library decides cost.
first step: Agree the limitation list with me first; no fix is chosen yet.

### LIB-GATE · Shared unknowns: the gate and ladder
family library; state: Open: modelled; not library-specific; package WP6a; metrics: quality, hallucination (primary quality)
what: Tests, review, retries, and Opus and Fable accuracy set the wrong rate for all three ways of working, so they carry no weight among the library’s steps.
evidence: Middle-value wrong rates: library 21.4 %, ladder 21.2 %, strong model 11.2 % [G]. With gate and ladder at good ends: 2.8 %, 2.8 %, 0.5 % [G].
what fixing it unlocks: A gate at its good end brings the ladder's wrong rate to 7.9 % [G], near the strong model's 8.5 % [G]: better checks pay everywhere.
first step: Agree the limitation list with me first; no fix is chosen yet.

### LIB-KS-FALSELEAD · Wrong matches acted on as leads
family retrieval; state: Open: gate, abstention and flags designed; not built; package WP7; metrics: hallucination, quality, efficiency (primary hallucination)
what: Agents copy near-matching records, wrong ones included: one error template can have several causes, a probe proves a condition not a cause, and tests can fake artifacts.
evidence: One Node error code has 3 [M] causes; EAS build 15 had 2 [M]. Parsing the files removes 1 of the 4 [M] ways a probe can be fooled. Pilot target: zero acted false leads [T], unmeasured.
what fixing it unlocks: Leads that cheap agents can trust and act on safely.
first step: Build declarative probes with control pairs and hard-negative same-template probes (KS-3).

### PR-PRIMARYSOURCES · Agent skills rest on unchecked facts
family retrieval; state: Open: open; no manual page fetched yet; package WP7; metrics: hallucination, quality (primary hallucination)
what: Some skill packages rest on unchecked facts: PostgreSQL lock-level claims come from FixFlow code comments, and Odoo-side unknowns stay open until fetched or answered.
evidence: Not measured. The skill packages mark both as UNVERIFIED or OPEN.
what fixing it unlocks: Trustworthy migration review and exactly-once Odoo postings.
first step: Fetch the PostgreSQL manual pages; I answer the Odoo questions in P9-0b.

## Ideas (most mature first)

### MAC-01 · Checkpoint and resume by dependency hash
stage: In use; package WP1; metrics: hallucination, efficiency, token_count (primary hallucination); answers: B03, B04, B12
problem: After a stop, an agent cannot tell which files it relied on have changed, so it trusts a stale handoff or re-reads everything.
how: A stdlib Python tool hashes the task file, a context packet and chosen source files; resume re-hashes and lists changed or deleted dependencies.
where it stands: In use in the testbed: stale dependency rejected, fresh and unrelated changes accepted; 29 behaviour tests pass [M]. Eight red-team defects still open [M]; whole-file granularity.
next: Fix the open red-team defects, including 'verify passes when every test is skipped'; list only changed docs on resume.
origin: Clinic testbed

### CHK-04 · Exactly-once proof and planted-fault demos
stage: In use; package WP2a; metrics: quality, hallucination (primary quality); answers: PR-FALSEGREEN, B12, L3
problem: A faster gate must not be weaker: never drop a test or print PASS wrongly, and a passing test does not prove its guard works.
how: Judge the split by test ids: parallel ids equal the serial pass's left-out ids, no overlap. Skips fail. Planted faults must fail the check.
where it stands: In use in the testbed: 1,844 parallel plus 128 serial test ids [M] in the run that proved the split, none in both. Six planted faults gave CHECK FAILED [M]. Not yet in FixFlow CI.
next: Add the same id accounting and a scripted guard removal to FixFlow CI and the fix-round contract.
origin: Clinic testbed; Dex Horthy sweep

### CHK-13 · Skip-aware integration gate
stage: In use; package WP2b; metrics: hallucination, quality (primary hallucination); answers: PR-FALSEGREEN
problem: A test run can look green while integration tests were silently skipped because the database variable was unset, proving nothing about the real database.
how: pytest's junit report (an XML file of test results) lists skip reasons; a script fails the gate on any skipped integration test. Mobile CI no longer passes with no tests.
where it stands: In use in every FixFlow backend gate run. Baseline: 0 integration tests skipped of 757 [M].
next: Keep using it.
origin: Harness review; Clinic testbed lessons

### CHK-14 · Checks must be able to fail (red-team lessons)
stage: In use; package WP2b; metrics: quality, hallucination (primary quality); answers: PR-FALSEGREEN
problem: Gates go green without testing anything: accepted rows beside failed checks, bare asserts, boot tests in a dirty environment, unknown recorded as zero.
how: Plan rules, no machinery: no accepted row beside a failed check, if/raise not assert, clean-environment boot tests, unknown never recorded as zero.
where it stands: Carried as plan rules in the harness; the BAML sweep confirmed they were already held. Not otherwise tested.
next: Apply when writing the drain audit script and the first-wave results tables.
origin: Harness review; clinic red-team lessons; BAML sweep

### CHK-15 · Merge-readiness labels on gate summaries
stage: In use; package WP2b; metrics: hallucination, quality (primary hallucination); answers: PR-FALSEGREEN
problem: Gates test the working tree but label the result with HEAD, and extra arguments can deselect tests, so a green summary could mislead a merge decision.
how: The summary prints tree=dirty for uncommitted files and RUN partial for extra pytest arguments. Merge-readiness needs a clean tree and no extra arguments.
where it stands: In use: printed in every FixFlow gate summary. Not yet tested against a real misleading case.
next: Keep using it.
origin: Ship plan §7; refuter findings

### CHK-17 · Pass counts are not the success signal
stage: In use; package WP2b; metrics: quality, hallucination (primary quality); answers: PR-FALSEGREEN
problem: We want a plain pass count never to stand in for proof, because it can hide regressions.
how: CI runs every suite per PR; phases close only on green gates; reviewers name a test that fails on base and passes on head.
where it stands: In use: already how FixFlow works. It would be reopened only if a regression escaped the full CI suite after merge.
next: Count post-merge regressions after P1.
origin: Dex Horthy sweep, after SlopCodeBench

### CHK-21 · Before and after file manifests
stage: In use; package WP3; metrics: quality, hallucination (primary quality); answers: B12
problem: We want edits not to touch files that were not meant to change, and a way to audit what a session touched.
how: Each task writes a hash manifest of all tracked files before editing, then compares after, so every changed file is accounted for.
where it stands: In use in the testbed: 247 [M] baseline files all accounted for, six [M] declared documents changed, 23 [M] protected source paths unchanged. It catches unintended change, not wrong change; no timing cost recorded.
next: In FixFlow a pre-task git diff --stat or tree hash gives the same guard.
origin: Clinic testbed

### REV-02 · Close findings only on tests with positive controls
stage: In use; package WP3; metrics: hallucination, quality (primary hallucination); answers: B12, PR-FALSEGREEN, B17
problem: Findings and claims closed on a model's say-so, and our own checks reported success wrongly: a drill printed PASS while testing nothing.
how: A finding closes only on a harness-run test; each 'nothing found' check needs a case it must find; remove one lock at a time.
where it stands: In use in the testbed; at least four [M] instances later proved less than claimed. A trial for the root's gate in FixFlow is proposed.
next: Start in the root's gate; add positive controls to FixFlow check scripts.
origin: Clinic testbed, Bottleneck compile

### REV-03 · Review bots, unmeasured-as-failure, hand-back labelling
stage: In use; package WP3; metrics: quality, hallucination (primary quality); answers: L3, PR-FALSEGREEN
problem: We want review that adds no noise, no missing scan counted as clean, and no instructions smuggled in through hand-backs.
how: A per-PR Opus reviewer exists, gates treat unmeasured as failed, and Claude Code labels subagent reports as model output, not user instruction.
where it stands: Already in place or provided by the platform; nothing new to build or measure.
next: Keep using it.
origin: Dex Horthy sweep

### REV-04 · Dated audits by parallel automated reviewers
stage: In use; package WP6c; metrics: quality, hallucination (primary quality); answers: B12, B02, B17, PR-DOCDRIFT
problem: We want stale guidance and missing evidence found before we build on a repo, and a clear boundary on what a recall tool puts in context.
how: Three parallel automated reviewers plus an integration review audit a repo, separating hash-verified preservation from substantive review; a static fit audit reads tool code.
where it stands: In use in the testbed, done once: 61 files reviewed [M], 14 findings [M], 641 cached members re-hashed with no failures [M], 5 peer-review corrections closed [M]. Cost not recorded.
next: Copy the dated-audit format with a stale-guidance table as a CLAUDE.md drift check for FixFlow.
origin: Clinic testbed

### REV-05 · Assess, refute by default, then judge idea sweeps
stage: In use; package WP8; metrics: quality, hallucination (primary quality); answers: PR-OUTSIDEEVIDENCE, PR-BRIEFFACTS
problem: We want to judge about 1,900 sweep cards fairly, without the orchestrator scoring them and without one reader's enthusiasm promoting weak ideas.
how: Cards cluster into families; two Opus reviewers score each; a fresh refuter attacks every adopt or trial family by default; a judge decides.
where it stands: In use on two sweeps: Horthy, of 144 attacked families 65 refuted and 79 narrowed, none passed [M]; BAML, none of 24 families proposed for adopt survived and 4 of 22 proposed for trial did [M].
next: Give the next sweep's assessment brief the design text; trial whether refuting by default earns its cost.
origin: Dex Horthy sweep; BAML sweep

### REV-07 · Fresh-context skeptic per finding
stage: In use; package WP10a; metrics: hallucination, quality (primary hallucination); answers: B12, PR-VERIFYBUDGET
problem: Confident but wrong findings get into the plan when the same reasoning that produced them also checks them.
how: An Opus xhigh skeptic sees only the claim, evidence and failing condition; one per P0 and per P1 in sensitive areas.
where it stands: In use since gate G2: 12 [M] skeptics over 109 [M] claims; 8 [M] verdicts lowered a severity, none refuted a claim. A second-lens brief for the geofence claims (a second skeptic reading the symptom from another angle) is designed, not run.
next: Brief the geofence P0 skeptic to explain the field symptom with app-logic causes alone.
origin: Orchestration design, BAML sweep

### REV-08 · Skeptic budget capped at twelve, allocated by priority
stage: In use; package WP10a; metrics: token_cost, quality, token_count (primary token_cost); answers: PR-VERIFYBUDGET
problem: Unbounded verification multiplies Opus tokens, but at gate G2 the first four analysts to finish used up all the skeptics, leaving other P1 claims unverified.
how: At most 12 Opus skeptics per run, given to highest-priority claims first; claims over the cap are listed or dispositioned, never dropped.
where it stands: In use: the cap is applied, and priority allocation became a rule after G2. 12 [M] skeptics covered 109 [M] relocated claims; 8 [M] verdicts lowered severity. Overflow handled by corroboration.
next: Reserve skeptic slots for P0 and P1 claims before analysts finish; log overflow ids.
origin: Orchestration design, Harness review

### REV-09 · Corroboration policy for over-cap claims
stage: In use; package WP10a; metrics: hallucination, token_cost (primary hallucination); answers: PR-VERIFYBUDGET, PR-CAPS
problem: Claims beyond the skeptic cap cannot be verified, yet we must neither drop them nor trust them blindly.
how: Mark each over-cap claim C (corroborated elsewhere, natively checked, or arithmetic) or O (open, awaiting a fact); buy no second Opus pass.
where it stands: In use at gate G2 on 17 [M] over-cap rows: 15 [M] ruled C and 2 [M] ruled O. Unattacked claims stay questions for me, not findings.
next: Replace with proper skeptic coverage when the budget allows.
origin: Orchestration design

### REV-10 · Verified register, open-risks list and refuted list
stage: In use; package WP10a; metrics: hallucination, quality (primary hallucination); answers: B12, B21
problem: A single pass or fail list loses unsettled claims and hides refutations; every finding needs a uniform record of how well it is verified.
how: From verdicts, a script derives a verified register, an open-risks list and a refuted list; each finding has a severity and status code.
where it stands: In use at gate G2 as the verified findings register: 139 [M] findings; a P0 on the open list blocks work on its area. The deriving script is not yet built.
next: Keep numbering continuous; implement the derivation in the workflow script.
origin: Orchestration design, Harness review

### REV-11 · Citation check over every claim
stage: In use; package WP10a; metrics: hallucination, quality (primary hallucination); answers: B12
problem: Analyst and research claims may quote text that moved, was fixed or never existed, and agent research may misquote its sources.
how: A Sonnet agent per analyst re-locates each quote by content and git history and marks it located, moved, dead or already fixed.
where it stands: In use at gate G2 and in the clinic research pack: 109 [M] claims re-located, none dead; 575 of 579 [M] quotes matched exactly. It checks existence only.
next: Wire up per-analyst pipelining; apply quote matching to FixFlow agent reports.
origin: Orchestration design, Clinic testbed

### REV-12 · Honest-empty web research and re-fetch check
stage: In use; package WP10a; metrics: hallucination (primary hallucination); answers: MC-ACCESS, B12
problem: A research agent that cannot reach the web may invent facts, and a cited web fact may not appear on the page.
how: Agents log tool status and URLs tried, stop after two denials, and may return empty; Sonnet re-fetches key URLs and downgrades unconfirmed facts.
where it stands: In use at gate G2: 11 of 12 [M] web statements re-checked were confirmed on the page. The honest-empty rule is part of the research schema.
next: Check the first research topics for degraded coverage; run the re-check after the top hypotheses.
origin: Orchestration design

### REV-13 · Evidence tags and honest labels on every fact
stage: In use; package WP10a; metrics: hallucination, quality (primary hallucination); answers: B12, B17
problem: Readers cannot tell how strongly a fact is established, and reports blur observed, inferred and never-checked, or mistake automated review for human review.
how: Every claim cites path:line with a quote and is tagged verified-in-code, verified-by-command, web or inferred; agents return facts, not severity, unless asked.
where it stands: In use as a convention in all agent definitions and the clinic testbed; nothing enforces it. Clinic labels were wrong at least twice [M].
next: Check tag use in the first results; add a machine check that labelled logs exist.
origin: Orchestration design, Skills packages, Clinic testbed

### REV-16 · Two refuters per claim: repository and operations
stage: In use; package WP10a; metrics: hallucination, quality (primary hallucination); answers: PR-PLANDEFECTS, PR-FIELDEVIDENCE
problem: We want every recommendation's premises checked before we build on it, including facts about real hosts and phones that a code-only reader misses.
how: Each falsifiable claim is attacked by two fresh Opus refuters, one reading the repository, one operations, defaulting to refuted and needing executed counter-evidence.
where it stands: In use: 45 panel claims attacked; several premises were refuted or unmeasured and narrowed before the plan [M]. Knowledge store: 1 confirmed, 21 narrowed, 8 refuted [M]; second pass 6 narrowed [M].
next: Re-run the seven refuter runs on the cash and accounting-books claims, lost to a usage limit, if those claims become decisions; re-run on new mechanisms.
origin: Harness review; Knowledge-store design

### REV-17 · Completeness critic over a draft
stage: In use; package WP10a; metrics: quality, hallucination (primary quality); answers: PR-PLANDEFECTS
problem: A finished draft can still lack mechanisms, hold contradictions or be hard for me to read, so we want a last read for completeness.
how: One Opus xhigh critic reads draft and register, listing missing items, unsupported claims, contradictions, readability problems; each becomes a numbered amendment.
where it stands: In use on the knowledge-store design, run twice: 19 missing, 15 unsupported, 19 contradictions, 9 readability items [M]; later 22 contradictions, 15 mismatches, 17 leftovers [M]. All text repair.
next: Run again after major edits and before my review.
origin: Knowledge-store design

### REV-18 · Skeptic round with forced verbatim citation
stage: In use; package WP10a; metrics: quality, hallucination (primary quality); answers: B01, B12, B17
problem: Reviews stay vague in both directions; we want attacks and rebuttals that point at exact text.
how: A skeptic files counterexamples quoting the passage; the designer accepts with a diff or rejects citing a verbatim rule; one round, then stop.
where it stands: In use in the testbed, once: 21 attacks, 12 accepted, 3 rejected on one ground, 6 on another [M]; 15 design elements revised [M]. Both sides were the same model family.
next: Adopt the quote-forced attack and rebuttal format in FixFlow gate reviews.
origin: Clinic testbed

### REV-19 · Hand-written reading-coverage ledger
stage: In use; package WP10a; metrics: hallucination, efficiency (primary hallucination); answers: B12, B02
problem: A report may claim sources were read when they were not, so we want coverage to be visible.
how: A file-by-file, page-by-page table records what was read in full or sampled, with access limits and a verification record.
where it stands: In use in the testbed: 41 coverage rows checked by script on 2026-09-30 [M]. Hand-maintained, so it drifts; effect on rework not yet measured.
next: Generate the table from agent transcripts instead of writing it by hand.
origin: Clinic testbed

### REV-20 · Design adjudicated by sweep, judges, refuters, my critique
stage: In use; package WP10a; metrics: quality, hallucination, token_count (primary quality); answers: PR-PLANDEFECTS
problem: A design from one session carries unchecked claims, and my critique is sometimes right and sometimes not, so we neither obey nor ignore it blindly.
how: Four workflows: a research sweep, four architects scored by three judges, refuters plus a completeness critic, then each point of my critique checked by two verifiers.
where it stands: In use on the knowledge-store design: about 15M subagent tokens [M]; scores of 360: A 292, C 282, D 281, B 222 [M]; critique verdicts partly or mostly right [M]; 20 amendments.
next: Reuse the pattern for other designs and later critiques.
origin: Knowledge-store design, after the Orchestration design

### MEM-04 · Tests that assert documents match the code
stage: In use; package WP6c; metrics: quality, hallucination (primary quality); answers: PR-DOCDRIFT, B13
problem: Shared documents drift from the code, and I want a test to catch that rather than a reader finding it late.
how: Tests parse registry, routing and context documents and fail when they differ from the plan or the code.
where it stands: In use in the testbed for registry-like tables only; the agent guide and context map have none. Drift caught was not counted; root-document edits broke three tests at gates [M].
next: Extend to the generated board, and add a CI test for the CLAUDE.md tables.
origin: Clinic testbed

### MEM-05 · Commit raw workflow outputs as evidence with sha256 manifest
stage: In use; package WP8; metrics: hallucination, quality (primary hallucination); answers: PR-TEMPOUT
problem: The raw outputs our findings register cites lived only in a temporary scratchpad folder and could vanish.
how: Copy the cited raw outputs into the program evidence folder and record a sha256 manifest, so every register id traces to its raw source.
where it stands: In use: done in the review pass, and the plan’s evidence folder holds the outputs with their manifest. Not otherwise tested.
next: Keep adding evidence at each gate.
origin: Harness review, after the clinic harness

### MTH-02 · Infrastructure failures kept apart from content failures
stage: In use; package WP3; metrics: quality, hallucination (primary quality); answers: B3-LOOP, PR-AGENTNULL, PR-FALSEGREEN
problem: A flaky provider or a run that tested nothing must not read as a pass, or as a bad brief.
how: A null is never a result; fresh nulls suggest a session limit; zero tests is never green; coverage reads 16/16 or carries a waiver.
where it stands: In use as program law in the orchestration design, and confirmed in the BAML sweep. BAML's own optimiser documents that it does not cover this.
next: Keep using it.
origin: Orchestration design and Harness review

### MTH-03 · Models give verdicts; code computes counts and scores
stage: In use; package WP3; metrics: hallucination, quality (primary hallucination); answers: L3, PR-CAPS
problem: Holistic model scores are unreliable and I cannot read all the logic; a script that filters or asks a model to count can lose items silently.
how: Models give yes/no or enum verdicts; code computes scores, logs dropped counts, applies no silent caps; each phase gets a cheap human-checkable proof.
where it stands: In use as program law: enum verdicts roll up into buckets by script, and the findings backlog means nothing is silently dropped. Confirmed in the BAML sweep.
next: Optionally add a rule to report received and kept counts for any filtering step.
origin: Orchestration design, Dex Horthy sweep and BAML sweep

### MTH-10 · Typed output schemas, forced and validated
stage: In use; package WP10a; metrics: hallucination, token_count, quality (primary hallucination); answers: B16, PR-AGENTNULL
problem: Free prose from agents is costly to read and invites unchecked claims. We want results the orchestrator and scripts can read by a fixed shape.
how: Agents return a fixed JSON Schema object, validated and retried by the workflow tool. A blocked agent returns a named code, not a guess.
where it stands: In use: twelve schemas in the design, all 11 [M] agent definitions reference them; forced output is how the harness works. Strict validation has no silent-drop failure; BAML repair has one [S].
next: Validate the schemas against the first real outputs.
origin: Orchestration design; BAML sweep; Skills packages

### MTH-14 · Short stable handles instead of hashes
stage: In use; package WP10a; metrics: hallucination, quality (primary hallucination); answers: -
problem: Agents echoing long ids or commit hashes can mis-aggregate them silently.
how: Agents use short labels such as H-01 and S-07b; long hashes are checked by git in code, so a mis-echo fails loudly.
where it stands: In use in the harness. An outside measurement on id aggregation had a small sample, two runs per arm [S], so we rely on the practice, not the figure.
next: Keep using it.
origin: Harness practice, confirmed by BAML sweep

### MTH-16 · Escape-hatch values in every schema
stage: In use; package WP10a; metrics: hallucination, quality (primary hallucination); answers: -
problem: A forced schema can make a model invent a conforming answer when the input does not fit.
how: Schemas carry values such as UNVERIFIABLE, untestable, UNCLEAR, unknown or empty, and an unknown is recorded as unknown.
where it stands: In use: already in the output schemas and a research rule. Agents wrote 'undated' honestly in the BAML sweep.
next: Audit the contracts for required fields that have no unknown path.
origin: Practitioner advice, confirmed by BAML sweep

### MSR-03 · Number tags on every figure
stage: In use; package WP8; metrics: hallucination, quality (primary hallucination); answers: -
problem: Readers could not tell a measured number from a guess, so a guess could pass as a result.
how: Tag every number as measured, estimated, guess or outside figure, with target and illustrative tags added by the harness.
where it stands: In use across the program documents: [M] measured, [E] estimated, [G] guess, [S] outside figure, plus [T] target and [I] illustrative.
next: Keep tagging.
origin: My idea; program documents

### MSR-11 · Pilot of the attested-only map on four files
stage: Tested; package WP7; metrics: hallucination, quality (primary hallucination); answers: LIB-EVAL, LIB-GRAPH-CONTRACTS
problem: We wanted to check whether a strictly sourced map recovers the dependency chain a human annotator saw.
how: Four frozen files read under the design by a skeptic and an independent annotator; counts compared, then re-applied under a revised design.
where it stands: Tested in the testbed: first design 427 attested edges [M], chain not reproduced; revised design 692 edges [M] with 1,166 dangling endpoints [M]. Links through a shared value cannot be joined.
next: Use grep plus a drift check for repeated constants such as the money limit and Alembic head.
origin: Clinic testbed

### REV-23 · Binding PR review: fresh, refute-by-default, head-bound
stage: Built; package WP3; metrics: quality, hallucination (primary quality); answers: PR-AUTHORBRIEF, PR-FALSEGREEN, L3
problem: A review of an older commit can pass for approval of a later one, and an author who briefs its own reviewer chooses what is attacked.
how: Coordinator sends a fresh Opus reviewer, refute-by-default, bound to the PR head commit, with a brief built from the phase's register ids.
where it stands: Rule accepted 13 Nov; reviewer agent and repo-conventions skill built in PR #185, merged on 13 Nov. No lane has reported ready yet, so it has not run on a real PR.
next: Coordinator dispatches the first binding review when the first PR is marked ready.
origin: Harness review, Ship plan §7, Skills packages

### REV-24 · Transcript audit at each merge
stage: Built; package WP3; metrics: hallucination, quality (primary hallucination); answers: B17, B12, B13
problem: The merge record is self-reported and fields have been filled falsely; we have no independent source for who read the final head.
how: Read-only script over our own tool-call transcripts tells whether a reviewer read the final head and how many root edits each merge had.
where it stands: Used once in the testbed with 0 [M] model calls. The merge-time version is designed for harness v2 phase 3, not yet run; it needs transcripts to survive cleanup.
next: Run the tally over the 10 and 11 November merges; it must find the unread heads by itself.
origin: Dex Horthy sweep, Clinic testbed, Harness v2 design

### RET-20 · Coverage ledger and stale-label freshness
stage: Built; package WP7; metrics: hallucination, quality (primary hallucination); answers: PR-DOCDRIFT, B13, B12
problem: A derived index silently goes out of date when source files change, and we cannot tell what was actually read.
how: A ledger lists read and unread chunks per file version; queries check file hashes, label changed records stale, and refresh supersedes rather than deletes.
where it stands: Built in the clinic testbed as a manual command, tested on synthetic cases only; the changed-source case was not run. 4,053 dangling endpoints at levels 1 and 2 [M].
next: Wire chunk-hash plus stale labelling to a hook or CI, to catch CLAUDE.md drift.
origin: Clinic testbed

### RET-21 · Candidate index: similarity proposes, never decides
stage: Built; package WP7; metrics: hallucination, quality (primary hallucination); answers: LIB-KS-FALSELEAD, B12
problem: Similarity retrieval can leak guesses into answers that are meant to carry evidence. We want guesses kept apart.
how: Similarity and alias proposals sit in a separate candidates file that no query reads; a test deletes it and checks packets are byte-identical.
where it stands: Built in the clinic testbed with its deletion test; precision not measured. 1,906 candidates [M] in the store, 93 [M] open for one file.
next: Copy the separation rule into any FixFlow recall tool.
origin: Clinic testbed

### SKL-03 · Android background-execution skill and analyst
stage: Built; package WP9; metrics: hallucination, quality (primary hallucination); answers: PR-FIELDEVIDENCE, PR-PRIMARYSOURCES
problem: The geofence, on-duty ping and job-travel tasks can fail silently on Android 12-15 and maker-customised phones, and analysts need cited facts on library internals.
how: A sourced skill on library internals and maker autostart paths, plus an Opus analyst citing findings and claiming no field reliability without device evidence.
where it stands: Built: skill and analyst in PR #185, merged on 13 Nov. Covers expo-location 18.0.10 [S], expo-task-manager 12.0.6 [S] and expo-modules-core 2.2.3 [S]. Not yet run.
next: Run it on plan phase P5-spike.
origin: Skills packages

### SKL-09 · Three skill statuses: sourced, authored, researched
stage: Built; package WP10b; metrics: hallucination, quality (primary hallucination); answers: W4
problem: A reader needs to know whether a skill's facts came from an outside repo, were written by us, or were gathered from the web.
how: Each package gets one index status: sourced (from an upstream repo), authored (written here) or researched (from fetched web sources, with URL and date).
where it stands: Built: the index in PR #185, merged on 13 Nov lists 10 sourced, 1 researched and 2 authored packages [M]. Not yet tested.
next: Keep the index current as packages are added.
origin: Skills packages

### SKL-10 · FixFlow facts first, cited to path and line
stage: Built; package WP10b; metrics: hallucination, token_count, quality (primary hallucination); answers: B12, PR-DOCDRIFT
problem: Generic outside advice wastes tokens and can mislead agents on this repo, and stale line numbers or vague dates make claims impossible to check.
how: Generic advice shrinks to a rule and reason; words go to repo specifics. Claims cite path and line; web facts cite URL and date.
where it stands: Built: the rule set is applied across the packages in PR #185, merged on 13 Nov; facts were re-read on 2026-11-04. Not yet tested.
next: Spot-check the cited lines after the next rebase.
origin: Skills packages

### CHK-29 · Re-run Node failures under Node 22
stage: Designed; package WP2b; metrics: quality, time (primary quality); answers: MC-ENVSKEW
problem: This PC has Node 24 while CI pins Node 22, so a failure could be a machine artifact rather than a repo defect.
how: A Jest or React Native failure on Node 24 is re-run once in a node:22 container before it is called a defect.
where it stands: Designed in the orchestration design and ship plan; not seen in the gate script. Not yet tested.
next: Prepare the node:22 re-run command; it could remove false mobile defects.
origin: Orchestration design; Ship plan §7

### CHK-32 · Stub run of gate scripts with no model
stage: Designed; package WP3; metrics: hallucination, quality, token_cost (primary hallucination); answers: PR-SCRIPTTEST, B17, B04
problem: We want to know a new gate script never reads a reviewer that returned nothing as a clean one, without spending model tokens.
how: Run a gate script under node with stand-in agents that return nothing, crash or refute; every id must appear once; none may reach merge.
where it stands: Designed in harness v2 (mechanism 5). Feasibility proven in one stub run (the script ran with stand-in agents, reported two live results [M] and named the missing one). Not yet tested against the three recorded defects.
next: Re-introduce each of the 3 [M] recorded defects and confirm it fails all; build before any real agent enters the gate.
origin: BAML sweep, after Pydantic AI; Harness v2 design

### CHK-34 · CI check that CLAUDE.md facts match the code
stage: Designed; package WP6c; metrics: hallucination, quality (primary hallucination); answers: PR-DOCDRIFT
problem: We want the instruction file never to drift from the code, such as a wrong migration head, so agents never trust a wrong fact.
how: CI fails if CLAUDE.md's migration head differs from the end of the down_revision chain; a second check warns on paths that no longer resolve.
where it stands: Adopted as a phase P1 deliverable. The path check is a warning only until P13c, so it does not fail on first run. Not yet built or tested.
next: Build in P1, warning-only for paths with an allow-list.
origin: Harness review; clinic harness drift checks

### REV-30 · Claims file and verdict script per gate round
stage: Designed; package WP3; metrics: hallucination, quality (primary hallucination); answers: B12, B01, W2, L3
problem: Session reports cite tests or evidence that do not exist or match: 20-plus [M] recorded overstatements. A model re-reading its own claims has not caught them.
how: Each slice commits a claims file; a script runs each cited test at the fix's parent and at head, and flags weakened tests.
where it stands: Designed in harness v2 phase 3; never built in the clinic repo, not yet run. Replay first over recorded gates; target false flags under 10 % [T].
next: Replay over the recorded gates beside the root's reading; add a rerun rule for flaky tests.
origin: Bottleneck compile, Dex Horthy sweep, BAML sweep

### REV-31 · Preexisting-failure and fail-before claims must cite proof
stage: Designed; package WP3; metrics: hallucination, quality (primary hallucination); answers: W2, L3
problem: Agents excuse a new skip or red test as 'preexisting' without proof, and a reviewer's 'test X fails on base' can be unverified and false.
how: Two brief clauses: a 'preexisting' excuse must show the same failure on the base commit; fail-before lines cite the command and result.
where it stands: Adopted as proposals for the ship plan's routing rules; cost almost nothing; not yet tested. Pass bar: zero uncited merges over the first 5 [T] code phases.
next: Apply to the first 3 to 5 code-phase PRs; re-run one cited command per PR on the base commit.
origin: Dex Horthy sweep

### REV-35 · Verdict lists suppressions and gate-config changes
stage: Designed; package WP3; metrics: quality, hallucination (primary quality); answers: W2, L3
problem: I want to know when a check was made to pass by suppressing it or editing its configuration, instead of fixing the code.
how: The reviewer's verdict lists each added inline suppression and each edit to lint, type, import or CI config with reason, checked by diff grep.
where it stands: Suppressions sentence adopted; gate-config naming and the mechanical file list are trials over the first 5 code PRs [T]. Not yet tested; the testbed gate already refuses added skips.
next: Over 5 code PRs [T], a scripted grep must find nothing the verdict omitted; fix the path set.
origin: Dex Horthy sweep

### REV-38 · Skeptic verdict rules with an unverifiable outcome
stage: Designed; package WP10a; metrics: hallucination, quality (primary hallucination); answers: B12
problem: A skeptic told to refute by default can delete true claims just by saying it could not tell.
how: Confirmed needs the path traced from cited lines to the failing condition; refuted needs positive counter-evidence; otherwise unverifiable, stating what would settle it.
where it stands: Designed in orchestration design v3, replacing the default-refute framing; not yet tested.
next: Include the rules in the verdict brief.
origin: Orchestration design

### REV-39 · Demote, never delete
stage: Designed; package WP10a; metrics: quality, hallucination (primary quality); answers: PR-CAPS
problem: A cheap register check saying an item is fixed could silently drop the deep analysis of it.
how: A 'fixed' result rewrites the Opus brief to 'claimed fixed at file:line, confirm or refute' rather than removing the analyst.
where it stands: Designed as a rule for gate G1 in the orchestration design; not yet tested.
next: Apply at gate G1.
origin: Orchestration design

### REV-41 · Claims carry a failing condition; backlog field
stage: Designed; package WP10a; metrics: hallucination, quality (primary hallucination); answers: PR-CAPS
problem: Claims with no stated trigger cannot be checked, and caps on what analysts report hide omissions.
how: Each claim gets file:line and a failing condition; analysts report freely and park what they cannot write up in a backlog; P0 and P1 never truncated.
where it stands: Designed in orchestration design v3, replacing the six-claim cap per analyst; not yet tested.
next: Include in the findings brief.
origin: Orchestration design

### REV-42 · Verify a rewrite by content, not commit message
stage: Designed; package WP10a; metrics: hallucination, quality (primary hallucination); answers: PR-PLANLOSS
problem: A rewritten plan was reported done by its commit message while content had been lost; we want to catch that before anyone builds on it.
how: After a plan rewrite, compare the actual text with the intended text instead of trusting the commit message.
where it stands: Adopted as a plan rule, drawn from the program's one recorded state loss [M]. Not measured further.
next: Apply at every plan version bump; add it to the gate checklists.
origin: Harness review

### MEM-32 · Diff lookup warnings quoted by the reviewer
stage: Designed; package WP6b; metrics: quality, hallucination (primary quality); answers: LIB-KS-DIFF, LIB-KS-BLIND, LIB-KS-POLICY
problem: A forbidden change never raises an error, so error-text lookup cannot stop it, and a reviewer saying 'ran the check' could be vacuous.
how: The CLI matches changed-line identifiers against stored do-not-apply entries at key points; the reviewer runs it at the head and answers each warning.
where it stands: Designed; replay on 154 [M] past commits: first rule warned on 48.7% [M], strict handles 27-44% [M], ex4 on 13 commits against 47 for a file join [M].
next: Build the diff join in KS-3, replay history in the pilot, wire the reviewer in KS-7.
origin: Knowledge-store design; my critique and refuter pass

### MEM-33 · Write gate against duplicate records
stage: Designed; package WP6b; metrics: quality, hallucination (primary quality); answers: LIB-KS-FALSELEAD
problem: We want lookups to return the right earlier diagnosis, never a plausible wrong one, so what enters the store must be clean.
how: Before a record is saved, the store checks for duplicates, refuses self-matches and looks for an already-existing entry.
where it stands: Designed in phase KS-2; not yet tested. Sonnet implements and Opus reviews the scrubber as a security boundary.
next: Build it in KS-2 after KS-1.
origin: Knowledge-store design

### MEM-34 · Declarative gate runner with control pairs
stage: Designed; package WP6b; metrics: hallucination, quality (primary hallucination); answers: LIB-KS-FALSELEAD
problem: A stored 'this fix applies' claim can be wrong: a probe may match a moved guard or comment and pass vacuously, and agents copy near matches.
how: Probes over parsed data need a control pair (present on a broken commit, absent on a fixed one), mutants, preconditions and a three-way verdict.
where it stands: Designed for phase 3 of the knowledge-store plan; not built or tested. Refuters rejected the first polarity rule (which way a probe must read on the broken and the fixed commit) on both review lenses [M]. Target: zero acted-on false leads [T].
next: Build the probes over parsed data first (eas.json, app.json, lockfiles), after the first phase. This guards the config-trap class.
origin: Knowledge-store design, after Meta’s automatic bug-fixing tools Getafix and SapFix

### MEM-44 · Prose contradictions become a corrections docs PR
stage: Designed; package WP6c; metrics: quality, hallucination (primary quality); answers: PR-DOCDRIFT
problem: Our docs disagree with each other and with git, so a store seeded from them would store errors.
how: Phase KS-4 resolves each contradiction against git and opens one docs PR of corrections, each linking its entry.
where it stands: Designed for phase KS-4; not run. Seven [M] named contradictions are listed. I merge the PR (KS-D12, default merge); it ships even if the store track stops.
next: Draft the corrections docs PR in KS-4; cleaner docs for every agent, with or without the store.
origin: Knowledge-store design (completeness critic)

### MEM-46 · Abstaining retrieval: miss, candidate or lead
stage: Designed; package WP7; metrics: hallucination, quality (primary hallucination); answers: LIB-KS-FALSELEAD, LIB-KS-PRIVACY
problem: At a few hundred entries a wrong hit acted on is the dangerous failure, and a lookup must never leak customer data into the store.
how: Scrub and canonicalise, exact-handle prefilter, BM25 ranking, then abstain on score-free features; output is miss, candidate or lead inside a 2,000-character [S] cap.
where it stands: Designed; not yet tested. Starting thresholds: lead 0.5, candidate 0.3, margin 0.2 [S]; frozen in KS-4. The customer-name case is a known scrubber miss.
next: Prototype on a synthetic corpus in KS-2; calibrate on seeded entries in KS-4.
origin: Knowledge-store design, after small-scale BM25 research

### MEM-47 · ast-grep syntax-tree reader for code probes
stage: Designed; package WP7; metrics: quality, hallucination (primary quality); answers: LIB-KS-FALSELEAD
problem: Whole-file hashes flag too much, and text checks over code are fooled by moved guards, comments and renames. We want checks that read structure.
how: After the pilot, a pinned ast-grep tool anchors checks to code symbols and ignores comments, tested with refactor mutants; unparseable code gives inconclusive.
where it stands: Designed in the knowledge-store design; not yet tested. It fixes one of four ways a code check can be fooled [M, per source]. A 360 Total Security smoke test is pending.
next: I rule on it when the pilot gives a go. If I decline, we use no code reader at all.
origin: Knowledge-store design, my critique (syntax trees); ast-grep

### MTH-21 · One fact, one command
stage: Designed; package WP1; metrics: hallucination, quality (primary hallucination); answers: B16, B19
problem: An unchecked agent report once produced a false harness rule, and first-deploy steps can be ticked without proof. We want facts backed by evidence.
how: One command checks a fact before it becomes a rule, recorded verified or contradicted. Each first-deploy step carries command, expected result and planted-failure run.
where it stands: Adopted from phase 1 of harness v2; costs one line in a brief. Not yet tested. Planned baseline: count which of the root's 15 [M] lessons are environment facts one command could check.
next: Run the default-mode write probe before that build; add the line to briefs.
origin: Dex Horthy sweep; Harness v2 design

### MTH-22 · Scripts before agents
stage: Designed; package WP3; metrics: quality, token_cost, hallucination (primary quality); answers: B01, B12, B17
problem: In the testbed, ideas kept as prose in a brief or model re-checks mostly failed. We want scripts, not models, making every check a script can.
how: Models find things; scripts decide whether a finding is closed. The gate, audit, planner and parser are scripts that spend no tokens.
where it stands: Standing rule of harness v2. Testbed record: 33 [M] practised dropped ideas worked and 38 [M] failed, mostly as prose. The scripts themselves have not run live.
next: Build the six no-token scripts in phase 3 order.
origin: Harness v2 design

### MTH-26 · Orchestrator decides; subagents only gather and verify
stage: Designed; package WP10a; metrics: quality, hallucination (primary quality); answers: PR-SEVERITY, B12
problem: We want all judgement in one place, so a cheap agent's first impression never becomes a decision by inertia and never silently cancels a deeper investigation.
how: Main session sets hypotheses, reads every result, makes calls. Subagents gather, analyse, verify; a cheaper verdict may narrow a deeper brief, never remove it.
where it stands: Designed in the orchestration design (v3) as a rule. The records show the main session judging, but no subagent output has yet been audited for being treated as a decision.
next: Run the first workflows under this rule and check no subagent output is treated as a decision.
origin: Orchestration design

### MTH-27 · Judgement-free discovery
stage: Designed; package WP10a; metrics: hallucination, token_count, quality (primary hallucination); answers: PR-SEVERITY, B16
problem: We want to stop a cheap first-stage impression from becoming a top-priority finding by inertia, and keep what the orchestrator reads bounded by schema, not prose.
how: First-stage agents return constants, lines, names, commands and exit codes, never a comparison, severity or verdict. The gate or analyst compares values.
where it stands: Designed in the orchestration design and applied to every discovery brief; this compile also states the rule. Not yet tested.
next: After discovery, check that no map fact carries a severity or verdict.
origin: Orchestration design

### MTH-28 · Return contract: value or null, with coverage count
stage: Designed; package WP10a; metrics: hallucination, quality (primary hallucination); answers: PR-AGENTNULL, PR-SCRIPTTEST
problem: A missing or crashed agent result must never be read by us as 'nothing found'.
how: Every run resolves to a value or null. The script returns results, missing, not-started and coverage; the first gate re-runs or waives each gap.
where it stands: Designed as a rule at the first gate. Not yet tested as a rule; the discovery stage reported 16/16 [M] coverage.
next: Implement and test the contract in the discovery script.
origin: Orchestration design

### CHK-36 · Verifying command and negative run per tick
stage: Idea; package WP2b; metrics: hallucination, quality (primary hallucination); answers: PR-FALSEGREEN, L3
problem: Checklist boxes for CI gates, docs and deploy steps can be ticked without proof that the check works.
how: Each tick records the exact verifying command and expected result; for a gate box, a negative run showing the gate fails when it should.
where it stands: Trial in P1 and the next two code phases; not yet tested.
next: Apply the per-tick line in P1 and the next two code phases.
origin: Dex Horthy sweep

### CHK-39 · Red-team of the workflow gates and repair plan
stage: Idea; package WP3; metrics: quality (primary quality); answers: PR-FALSEGREEN, B12, B17
problem: We want to know the workflow's own gates can fail, since they could pass while checking nothing.
how: A nine-perspective review of the testbed's gates found nine defects, each with a reproduction and closure condition; a repair plan ordered the fixes.
where it stands: Deferred: it found 3 P1, 5 P2 and 1 P3 defects [M], eight still open; an all-skipped suite passed with exit 0 [M]. No code repair was made, as the build moved on.
next: Use the defect shapes as a red-team checklist for FixFlow's own hooks.
origin: Clinic testbed

### REV-45 · Record who read the final commit
stage: Idea; package WP3; metrics: hallucination, quality (primary hallucination); answers: B17, B01
problem: Review is all a model reading code, and 5 of 6 [M] high-risk merges went in with the final head unread; nothing records it.
how: Each merge records who read its final head; high-risk merges cannot merge on 'none' or 'own'; a finding closes only on a harness-run test.
where it stands: Proposed; testbed structure measured: round three was read only by the root for 9 of 11 [M] slice gates. Target: unread high-risk merges from 5 of 6 [M] to zero [T].
next: Add the label to the merge table, then, once D19 allows code to go out, replay seven known misses with a second model family.
origin: Bottleneck compile, Clinic testbed

### REV-46 · Second model-family review pass
stage: Idea; package WP3; metrics: quality (primary quality); answers: B17, B12
problem: Code that Opus writes and reviews may share blind spots; a different vendor's model might catch what a same-model reviewer misses.
how: One Codex review pass and one fresh Opus pass at the frozen commits of known misses, scored on misses caught; needs the replay seal.
where it stands: Deferred under decision D19: code would leave my machine and six to seven [M] known misses give only an exploratory result. Never tested; no Codex CLI here.
next: Revisit once the replay seal exists; first I would approve the vendor and sending code out.
origin: Dex Horthy sweep, Clinic testbed, Harness v2 design

### REV-52 · Audit the phase routine's seven obligations
stage: Idea; package WP3; metrics: hallucination, quality (primary hallucination); answers: W2, W3
problem: Compliance with the phase routine is self-reported, so skipped steps look the same as done ones.
how: A fresh Opus auditor sees only artifacts (PR, git log, edit history, results, OWNER-VIEW page, closing message) and scores 7 binary obligations per phase.
where it stands: Trial over P1 and P2a; not yet tested. The source evidence was one confounded anecdote, and a count-and-split version was refuted.
next: Audit P1 and P2a against the 7 obligations; add a short skill checklist only if a step was missed.
origin: Dex Horthy sweep

### REV-53 · Pure prompt-input boundary for the skeptic
stage: Idea; package WP10a; metrics: quality, hallucination (primary quality); answers: -
problem: The skeptic must see only the claim, evidence and failing condition, but nothing in the code stops other fields leaking into its prompt.
how: A function returns only claim, evidence and failing condition, with a replay test that the rendered prompt holds no forbidden field. About 10 lines [E].
where it stands: Trial, not yet tested, not refuted. It is hygiene: no contaminated skeptic is on record.
next: Add the function and a failing-on-leak test; I decide if hygiene alone justifies it.
origin: BAML sweep

### REV-55 · Record-only rule checks over returned objects
stage: Idea; package WP10a; metrics: hallucination, token_cost (primary hallucination); answers: PR-EVFORMAT, B12
problem: Agent outputs are checked by judges or by eye; cheap rule checks could catch violations the gates missed without spending tokens.
how: A node script over the committed evidence JSON checks quote length, listed URLs, unique ids and evidence format, run record-only with no retry.
where it stands: Trial, not yet tested; downgraded from adopt. The refuter's naive pattern flagged 174 of 707 evidence strings [M], mostly legitimate, so the allow-list is the work.
next: Write it with an allow-list (about an hour [E]); adopt only if it finds a real missed violation.
origin: BAML sweep

### MEM-59 · Fix withholding and optional journal deny rule
stage: Idea; package WP6b; metrics: hallucination, quality (primary hallucination); answers: LIB-KS-POLICY
problem: Cheap agents may apply a stored fix without verifying it first, and we want the check to happen before the fix is used.
how: The CLI withholds a stored fix until the gate passes; the skill bars reading the journal; KS-D20 adds an optional deny rule.
where it stands: Deferred in the knowledge-store design: the journal is plain files, so withholding is a convention, not a lock. KS-D20 defaults to off. Not yet tested.
next: I may enable KS-D20, a settings deny rule on reading the store.
origin: Knowledge-store design

### MEM-61 · guarded_refs advisory (allowed-site lists)
stage: Idea; package WP6b; metrics: quality (primary quality); answers: LIB-KS-BLIND
problem: We can detect a new reference to a guarded identifier, but cannot tell whether an existing check covers it.
how: An optional author-named list of allowed sites per entry; the diff lookup reads it as a hint that never changes a verdict.
where it stands: Deferred, default off; to be built in a later build phase after the pilot, or after that. Not yet tested.
next: Measure its false-alarm rate from git history first; I rule on it at the checkpoint (KS-D22).
origin: Knowledge-store design, my critique point 1

### MTH-42 · Advisory CI check on PR bodies
stage: Idea; package WP3; metrics: quality (primary quality); answers: W2, L3, W3
problem: Whether the phase routine ran is self-reported, so a missing plan line, journal heading or reviewer verdict raises no alarm.
how: A dependency-free workflow checks PR bodies for a resolving plan line, task list, journal heading and a reviewer verdict naming the head commit.
where it stands: Trial, not yet tested. Top trial 3 of the Horthy sweep; about 40 lines of YAML [E]; advisory on drafts, failing when ready.
next: Build in P1-ci; over the first 5 code-phase PRs [T] count real catches against false alarms.
origin: Dex Horthy sweep, checks into code

### MTH-43 · Gate-script hygiene: tagged results and clean inputs
stage: Idea; package WP3; metrics: quality, hallucination (primary quality); answers: PR-AGENTNULL, PR-SCRIPTTEST
problem: A schema failure could look like a usage-limit null, a skeptic could get contaminated inputs, and a script could trust an agent's own list of reads.
how: Tag agent results null, error or value; build skeptic inputs by pure function; check self-listed reads against the transcript; rename 'reasoning' to 'explanation'.
where it stands: Trial, unrefuted and not yet tested. Refuters narrowed all four to FixFlow only: no dead reviewer read as clean and no contaminated reviewer is on the testbed record.
next: Probe what the agent call returns on schema exhaustion, then a stubbed run with one schema error and two nulls.
origin: BAML sweep, borrows from its typed failures

### MTH-45 · Script-generated document provenance
stage: Idea; package WP6c; metrics: hallucination, quality (primary hallucination); answers: W2, PR-DOCDRIFT
problem: Documents may carry placeholder or unverifiable provenance, so a reader cannot tell which commit a claim was written against.
how: A script writes metadata frontmatter (git commit and branch) and citations use commit-pinned permalinks; only that script is pre-approved.
where it stands: Deferred: it went over the sweep's cap, so no refuter has ruled on it and no measurement is defined.
next: Decide whether to give it a refuter pass; that would settle trial or park.
origin: Dex Horthy sweep, research-document material

### MTH-55 · Verify facts I state, inline
stage: Idea; package WP10a; metrics: hallucination, quality (primary hallucination); answers: W2, L3
problem: A mid-phase correction from me about code or environment can be wrong, and agents may act on it unchecked or silently override it.
how: The orchestrator checks a checkable fact with a grep or command and journals verified or contradicted; contradictions return to me, no research agent.
where it stands: Trial over phases P1 to P3, not yet tested. The test target is that 100% [T] of checkable-fact entries carry a verified or contradicted line.
next: Classify every correction during P1 to P3 and count entries with the line.
origin: Dex Horthy sweep, verify-before-trust material

### SKL-21 · Hooks: stop hook and tool-event heartbeat
stage: Idea; package WP2a; metrics: hallucination, quality (primary hallucination); answers: B12, B14
problem: We want claims checked and progress shown automatically; today nothing blocks a session on a failed claim check or shows progress from tool events.
how: Settings-based Claude Code hooks: a stop hook blocks a session on a failed claim check, and a heartbeat is fed by tool events.
where it stands: Deferred: harness v2 keeps hooks off for now (decision D17). Root-gate versions of the same checks need no hook. No gain shown yet.
next: I decide D17 on reopening hooks for two uses.
origin: Bottleneck compile; Harness v2 design

### MSR-33 · Transcript-derived read audit of analysts
stage: Idea; package WP3; metrics: hallucination, quality (primary hallucination); answers: W2
problem: Analyst reading rules are brief text and extra reads are self-reported and unenforced, so we cannot tell whether an analyst obeyed them.
how: A short Node script compares an analyst's self-listed extra reads with the Read and Grep calls in its subagent transcript.
where it stands: Trial from the BAML sweep, unrefuted. Feasibility shown: one lane reader's transcript holds 115 [M] tool-call entries. Mismatch rate not yet measured.
next: Measure the mismatch rate on one analyst from a committed run; make it standing only if self-reports under-count.
origin: BAML sweep

### REV-60 · Numbered evidence ids for verifiers
stage: Parked; package WP10a; metrics: hallucination (primary hallucination); answers: -
problem: We worried a verifier could cite a fabricated URL or quote.
how: Evidence handed to verifiers and skeptics is numbered; they cite ids and the script rejects unknown ids.
where it stands: Parked: it conflicts with the design, where a refuted verdict needs counter-evidence the skeptic finds itself, and the citation check already catches fabrication. No fabricated URL on record.
next: Would return if a fabricated URL shows up in a verification step.
origin: BAML sweep, after a talk on short ids

### MTH-62 · Categorical rubric instead of numeric likelihood
stage: Parked; package WP10a; metrics: hallucination, quality (primary hallucination); answers: -
problem: Fields like likelihood for this fleet carry a number the model asserts and that may mean little.
how: Replace model-asserted 0 to 1 likelihood numbers in schemas with a defined enum such as slow, medium or fast.
where it stands: Parked: refuted on committed data. 53 values fell over 17 distinct ones; the top three cover 15 of 53 (28%) [M]. The trial threshold already fails; no script decision reads the number.
next: Nothing now; it returns if a script decision starts reading the number.
origin: BAML sweep, after a community talk on categorical grading

### MTH-63 · Evidence fields before verdict in every contract
stage: Parked; package WP10a; metrics: hallucination, quality (primary hallucination); answers: -
problem: Format-restricted output may lower accuracy if the answer key comes before the reasoning, so we wanted reasoning first.
how: In each return contract, put explanation and evidence properties before verdict and severity, all required.
where it stands: Parked after a refuter pass. Agents already work through a tool loop before one final structured-output call, and a reasoning-style first field is a known refusal trigger. The evidence was 2024 non-reasoning models [S].
next: Nothing now; it returns if agents start answering without a tool loop.
origin: BAML sweep, after a 2024 paper and practitioner threads
