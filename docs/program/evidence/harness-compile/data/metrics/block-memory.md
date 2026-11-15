# Dossier: block "memory" (mechanisms: no_memory)

21 bottlenecks and 31 ideas. Numbers carry tags: [M] measured, [E] estimated, [G] guess, [S] setting or outside figure, [T] target, [I] illustrative.

## Bottlenecks

### LIB-KS-DIFF · Forbidden changes merge silently
family review; state: Open: Designed; handles on over ~5 % of commits refused; package WP3; metrics: quality (primary quality)
what: A refuted fix or known defect pattern raises no error and can merge silently; a warning joined on file paths alone fires too often to read.
evidence: For ex4, distinctive handles warned on 13 of 154 past commits; a file-level join would fire on 47 [M]. The v1.3 rule would warn on 48.7 % [M].
what fixing it unlocks: Do-not-apply entries that stop known-wrong changes before review, with warnings rare enough to read.
first step: Build the diff join with author-named handles and replay it on git history.

### LIB-KS-BLIND · Changes the store's warnings cannot see
family review; state: Partly closed: Action handles, KS-D17 test, review lookup; hook deferred; package WP3; metrics: quality (primary quality)
what: Some risky changes leave no git diff (a Railway env flip, a hand cursor reset, a snapshot restore); others escape through new code paths or shell edits.
evidence: Not sized yet.
what fixing it unlocks: Guarding against a permanent mass message to customers and keeping the correct-PIN lock invariant intact.
first step: Land the KS-D17 caller-pin test; seed action handles for ex4.

### LIB-KS-POLICY · Store safeguards are policy, not locks
family review; state: Open: Accepted for now; KS-D20 optional; package WP3; metrics: quality, hallucination (primary quality)
what: The journal is plain JSON on disk and writer ids are self-declared, so withheld fixes and 'approver is not author' rest on policy and review.
evidence: Not sized.
what fixing it unlocks: Gated fixes and stronger curation control, if writer ids are later bound to transcripts.
first step: Rely on the skill instruction plus review; consider the optional KS-D20 deny rule.

### PR-DOCDRIFT · Docs and memory drift from the code
family review; state: Partly closed: Head check in P1 scope; memory pointer-only; package WP6c; metrics: hallucination, quality, efficiency (primary hallucination)
what: CLAUDE.md facts, prose docs, design lines and memory drift from the code and each other; for example, HANDOFF A2 prescribes what CLAUDE.md forbids.
evidence: 517 of 1,268 backticked file names in docs do not resolve [M]. The knowledge-store seed (121 rows) found 4 contradictions; its later contradiction list names 7 [M].
what fixing it unlocks: Agents trust current facts, and we gain a cleaned, checkable seed corpus for the knowledge store.
first step: Build the Alembic-head CI check; resolve each contradiction against git in one corrections PR.

### W3 · Resuming from repo state, proven once
family orchestrator; state: Partly closed: P1 trial 10/10; fault-injected resume not run; package WP10a; metrics: quality, hallucination, efficiency (primary quality)
what: We needed proof that a fresh session can pick up a phase from the repository and PR body alone, without the chat that produced it.
evidence: P1's cold-resume trial on 13 Nov: a fresh Sonnet agent recovered 10 of 10 frozen facts [M]. 102 idea families and 266 cards bear on it [M].
what fixing it unlocks: Confidence that phases resume from repo state; the trial also exposed six plan defects we can now fix.
first step: Fix the six plan defects the trial exposed, then repeat the trial with a fault-injected resume.

### W5 · Workflows are not saved for reuse
family orchestrator; state: Open: Save rule proposed, not adopted; package WP10a; metrics: efficiency, token_cost, time (primary efficiency)
what: Workflow scripts are written fresh for each task and not kept; no rule decides which proven shapes to save.
evidence: 29 idea families and 43 cards bear on it; none reached adopt or trial in the first pass [M].
what fixing it unlocks: A curated library of proven workflow shapes, so a new task starts from a script that already worked.
first step: Adopt the save-as-run rule; commit one saved review-stage script after P1.

### LIB-KS-DUP · Parallel sessions solve the same problem
family orchestrator; state: Open: Claim table designed; expiry deferred; package WP4; metrics: efficiency, token_cost (primary efficiency)
what: Two sessions can miss on the same symptom and both escalate to the expensive model tier.
evidence: Not measured yet; the store's concurrent-misses view is designed to show it.
what fixing it unlocks: One session solves the problem while the other carries on with other work.
first step: Build the claim table in KS-2.

### LIB-FUNNEL · Library reuse funnel: where work drops out
family library; state: Open: modelled; limitation list awaiting my agreement; package WP6a; metrics: efficiency, token_cost, quality (primary efficiency)
what: In the reasoning-cache library, a cached answer is reused only if a chain of conditions all hold; at middle values the modelled yield is tiny.
evidence: Of 100 pieces the cheap model gets wrong, 0.35 [G] end right at middle values. Match carries 94.0 % [G], capture 78.1 % [G]; 51 of 60 [M] unknowns are guesses.
what fixing it unlocks: At the all-good setting 53.9 [G] of 100 reach the window and 31.7 [G] end right: the prize if the chain holds.
first step: Agree the limitation list with me; then test match and capture first.

### LIB-S1 · Step 1: what the window holds
family library; state: Open: mapped and weighed; no fix agreed; package WP6a; metrics: efficiency, token_cost (primary efficiency)
what: At the start of a task too much applies, and short helper windows start without the session's lessons.
evidence: Alone 1.4 % [G], last 17.9 % [G] of the full fall; 2 [M] limitations, both from thought experiments; no chosen case broke here [M].
what fixing it unlocks: Up to 17.9 % [G] of the 30.6 % [G] full fall, if this were the last step left unsolved.
first step: Agree the limitation list with me first; no fix is chosen yet.

### LIB-S2 · Step 2: nothing triggers a lookup
family library; state: Open: mapped and weighed; no fix agreed; package WP6a; metrics: efficiency, token_cost, quality (primary efficiency)
what: Nothing fails, so no lookup starts; a lookup can cost as much as the fix, comes after the failed call is paid, and the cause sits elsewhere.
evidence: Alone -5.3 % [G], last 68.0 % [G]; 6 [M] limitations; 24 of 59 [M] chosen cases break here, 11 [M] more unspecified by the design.
what fixing it unlocks: Up to 68.0 % [G] of the full fall: the third-largest step weight.
first step: Agree the limitation list with me first; no fix is chosen yet.

### LIB-S4 · Step 4: the match returns the wrong thing
family library; state: Open: mapped and weighed; no fix agreed; package WP6a; metrics: quality, efficiency, hallucination (primary quality)
what: What comes back can be an unfound strong-model defect, a look-alike, one fact with different answers per project, or disagreeing partial matches; no cross-project path.
evidence: Alone 10.9 % [G], last 94.0 % [G], the highest step weight; 15 [M] limitations; 26 of 59 [M] chosen cases break here.
what fixing it unlocks: The biggest single step: up to 94.0 % [G] of the full fall.
first step: After I agree the list: an oracle-match trial, Sonnet with and without the best earlier solution, scored by tests.

### LIB-S5 · Step 5: delivery into the window
family library; state: Open: mapped and weighed; no fix agreed; package WP6a; metrics: efficiency (primary efficiency)
what: Parallel windows pay before any entry can exist, and a compaction can drop a fetched entry mid-task.
evidence: Alone -0.3 % [G], last 11.7 % [G]; 2 [M] limitations; 2 of 59 [M] chosen cases break. Real cases showed index lines do arrive.
what fixing it unlocks: Small: up to 11.7 % [G]; real cases suggest delivery already mostly works.
first step: Agree the limitation list with me first; no fix is chosen yet.

### LIB-S6 · Step 6: in the window but unused
family library; state: Open: mapped and weighed; no fix agreed; package WP6a; metrics: quality, efficiency (primary quality)
what: An entry present in the window is not applied; two checked answers do not make a checked merge, and order matters when lessons merge.
evidence: Alone 0.5 % [G], last 30.3 % [G]; 3 [M] limitations; 31 of 59 [M] chosen cases break here.
what fixing it unlocks: Up to 30.3 % [G] of the full fall.
first step: Agree the limitation list with me first; no fix is chosen yet.

### LIB-S9 · Step 9: capturing the lesson
family library; state: Open: mapped and weighed; no fix agreed; package WP6a; metrics: efficiency, quality (primary efficiency)
what: 'Solved' moves after the entry is written, a conditional 'no' hardens into 'never', the writer cannot know which details matter, and asides never count.
evidence: Alone 9.2 % [G], last 78.1 % [G], second only to match; 10 [M] limitations; 22 of 59 [M] chosen cases break here.
what fixing it unlocks: Up to 78.1 % [G] of the full fall; with match, the step to study first.
first step: Agree the limitation list with me first; no fix is chosen yet.

### LIB-S10 · Step 10: entries go stale
family library; state: Open: mapped and weighed; no fix agreed; package WP6a; metrics: quality, hallucination (primary quality)
what: Facts outside the repository change with no event, corrections miss copies, later fixes change older entries' truth, and private or untrusted text can travel with entries.
evidence: Alone 3.7 % [G], last 29.9 % [G]; 12 [M] limitations, 2 [M] of them not in the model; 29 of 59 [M] chosen cases break here.
what fixing it unlocks: Up to 29.9 % [G] of the full fall.
first step: Agree the limitation list with me first; no fix is chosen yet.

### LIB-Q · Condition: entry quality
family library; state: Open: mapped and weighed; no fix agreed; package WP6a; metrics: quality, efficiency, token_cost (primary quality)
what: Whether what arrives is right and used rightly; it covers look-alikes, staleness and checks promoted into the shared tests.
evidence: Alone 6.0 % [G], last 104.1 % [G], the largest group weight; 22 [M] library unknowns.
what fixing it unlocks: Left at middle while all else is good, quality alone keeps the library above the ladder (1.029 cost, 1.038 wrong rate [G]): good entries are the condition.
first step: Agree the limitation list with me first; no fix is chosen yet.

### LIB-COMES · Condition: how much work repeats
family library; state: Open: similar-case coverage unmeasured on my work; package WP6a; metrics: efficiency, token_cost (primary efficiency)
what: An entry can help only if work repeats. Files repeat but questions mostly do not, so the ceiling is how often our work repeats.
evidence: Alone 0.2 % [G], last 82.4 % [G]. Files are 65-76 % [E] of reading; questions repeat in 7-9 % [E]; verified hit rate 0.5-4 % [E] per hard encounter.
what fixing it unlocks: Break-even near half the work repeating, or a fifth at low running cost [G]; similar-problem reuse is the untested upside.
first step: Label similar-problem coverage over about 200 recorded runs; no build needed.

### LIB-REACH · Condition: reach of an entry
family library; state: Open: mapped and weighed; no fix agreed; package WP6a; metrics: token_cost, efficiency, quality (primary token_cost)
what: Whether an entry gets to the cheap model when one could exist: it must be written, looked up, found and present in the window.
evidence: Alone -12.4 % [G], last 68.2 % [G]; 8 [M] library unknowns.
what fixing it unlocks: High reach with good entries is the winning corner (0.82 cost, 0.67 wrong rate against the ladder [G]); with poor entries it costs 1.43-1.53 [G].
first step: Agree the limitation list with me first; no fix is chosen yet.

### LIB-RUN · Condition: library running cost
family library; state: Open: mapped and weighed; no fix agreed; package WP6a; metrics: token_cost, token_count, efficiency (primary token_cost)
what: What a lookup, a screen, carrying an entry and writing an entry each cost.
evidence: Alone 3.3 % [G], last 10.4 % [G]; 4 [M] library unknowns. A strict entry costs 0.4-3.8M [E] processed tokens to write.
what fixing it unlocks: Kept low, running cost holds the all-good cost ratio at 0.75 [G] instead of 0.92 [G] against the ladder.
first step: Agree the limitation list with me first; no fix is chosen yet.

### LIB-KS-RESOLVE · Hard problems re-solved at the top tier
family library; state: Open: designed in knowledge store v1.3.1; audit not run; package WP6b; metrics: token_cost, efficiency, time (primary token_cost)
what: Past diagnoses live only as prose (CLAUDE.md, HANDOFF, G2 register, W2 notes), none searchable by symptom, so a recurring defect is paid again at the top tier.
evidence: 3 to 5 [M] same-cause repeats among 48 [M] fix commits on main (a body read found at least five); 72 [M] fix commits on all refs; HANDOFF lists 7 [M] recurring shapes.
what fixing it unlocks: A cheap agent finds, checks and reuses a recorded fix instead of Fable or Opus working it out again.
first step: Run the KS-D1 recurrence audit (KS-0) over all refs.

### LIB-KS-STALE · Stored fixes go stale
family library; state: Open: designed; not built; package WP6b; metrics: quality, hallucination (primary quality)
what: Stored fixes go stale when code, versions or remote resolvers change; hashing whole files invalidates too much, and some changes leave no local trace.
evidence: Not quantified; the design names the EAS cloud image, Railway defaults and data state as changes with no local trace.
what fixing it unlocks: Entries stay useful through fine-grained invalidation, and stale ones are flagged by an event, never by age.
first step: Build file_blob and config_key traces in KS-3.

## Ideas (most mature first)

### PAR-09 · PR title as resume key, with a lane board
stage: In use; package WP4; metrics: time, efficiency (primary time); answers: B05, W3
problem: After a stop or crash we could not tell which session, branch and PR belong to which phase when branch names differ from the plan.
how: Each PR title starts with its phase id and the body names the branch; a lane board maps phase, session, branch, PR and state.
where it stands: In use: the lane board had 10 rows on 2026-11-13 [M], and all eight lanes resumed from their worktrees after the power loss [M].
next: Keep the board updated as lanes finish.
origin: Ship plan §7

### MEM-01 · Root orchestrator's lesson memory
stage: In use; package WP6a; metrics: efficiency, quality, token_count (primary efficiency); answers: LIB-S9
problem: We keep repeating the same failures across sessions unless something carries each lesson forward.
how: The root session writes one lesson file (why, how to apply) after each failure or correction from me; every later root session loads them.
where it stands: In use in the clinic testbed, machine-local: 15 [M] files, 81,266 [M] bytes, one file 50,136 [M] bytes. Bloat audit cost 18 [M] agents, 1.5M [M] tokens; repeat mistakes unmeasured.
next: Promote recurring lessons into CLAUDE.md or a test, and add check dates.
origin: Clinic testbed

### MEM-02 · Memory file as pointer, not state restatement
stage: In use; package WP6c; metrics: quality, hallucination (primary quality); answers: PR-DOCDRIFT
problem: The memory file carried a stale next step, so a new session could start from outdated state.
how: Memory holds pointers to where state lives (plan, PR body, repository) and does not restate the state itself.
where it stands: In use: memory was rewritten as pointers in the review pass, which found and corrected one [M] stale next step.
next: Re-check memory pointers at each phase close.
origin: Harness review, after the clinic harness

### OWN-07 · Design answers in a flat file, not ask-question tool
stage: In use; package WP11; metrics: quality (primary quality); answers: -
problem: Transient prompts lose design decisions and cannot point at code.
how: Answer design questions in a file. Our PR-body journal and my critique sections already do this.
where it stands: Already in use: it is the harness's habit through the PR-body journal and the sections for my critique.
next: Keep using it.
origin: Dex Horthy sweep (voice into a file)

### TOK-13 · Plain-file immutable snapshot storage
stage: Tested; package WP6a; metrics: quality, hallucination (primary quality); answers: R2, TK-SUMMARIES
problem: Memory tools often need a database; we wanted durable snapshots with no dependency and with tamper evidence.
how: One immutable checksummed file per snapshot, meta file written last as the commit point, recall by linear scan with no index or database.
where it stands: Clinic testbed: scan of 115 MB in about 1 s [M]; multi-process stress gave 464 events and 464 snapshots, exact [M]. No cost curve at larger sizes was found.
next: Reuse the commit-point pattern for any FixFlow checkpoint store.
origin: Clinic testbed

### MTH-20 · Hypothesis table and challengeable settled facts
stage: Built; package WP10a; metrics: efficiency, hallucination (primary efficiency); answers: PR-BRIEFFACTS
problem: We want open questions tracked with an owner and what would settle each, while agents skip resolved points but can still correct a wrong settled fact.
how: Hypotheses H1-H18 carry a status, basis and owning analyst. Settled rows go into args as given; an analyst may challenge one with evidence.
where it stands: The table is in use, updated at the first gate. The challenge channel is specified in design v3 only. Not yet tested.
next: Update as my answers arrive; pass the settled rows into args.
origin: Orchestration design

### MAC-18 · Stop on resume when record and branch disagree
stage: Designed; package WP1; metrics: quality, efficiency (primary quality); answers: B03, W3
problem: After many power-offs a session's record and branch can drift apart, and a released session may start fresh, duplicating or discarding committed work.
how: On resume, if the record is missing or the branch holds uncovered commits, list them and ask; a match resumes with no wait.
where it stands: Adopted in PR #186 for FixFlow and designed into harness v2; not yet tested. Plan: replay the 9 November mass resume; zero mismatched sessions means unproven and the guard stays dormant.
next: Count mismatched sessions in the 9 November resume; add one fault-injected dispatch to the cold-resume trial.
origin: Dex Horthy sweep; Harness v2 design

### CHK-30 · CI checks for known prose traps
stage: Designed; package WP2b; metrics: quality (primary quality); answers: W1, W2
problem: We want FixFlow's costly written warnings to fail a build, not rely on an agent reading CLAUDE.md.
how: A Ruff rule bans hmac.compare_digest outside the security module; one check rejects an empty eas.json env value; another rejects the Sentry plugin in app.json.
where it stands: Adopt for the three history-backed checks, with a railway deny rule and a skill-frontmatter lint also adopt, narrowed. Proposal only, nothing installed. FixFlow-only: no testbed number would move.
next: Plant a violation of each; it must fail CI on the base commit and pass after the fix.
origin: Dex Horthy sweep; Bottleneck compile

### REV-43 · Adjudication record so later sessions can disagree
stage: Designed; package WP11; metrics: quality, efficiency (primary quality); answers: B16
problem: Without the reasons kept, a later session would have to re-run everything instead of disagreeing with reasons.
how: At G2 we write down the conflicts the orchestrator adjudicated and why, plus the verified register and open risks.
where it stands: Designed as part of the G2 output in the orchestration design; not yet tested.
next: Write it at G2.
origin: Orchestration design

### MEM-18 · Reasoning-cache library for cheaper models
stage: Designed; package WP6a; metrics: token_cost, efficiency, token_count (primary token_cost); answers: LIB-FUNNEL, LIB-S2, LIB-S4, LIB-S9
problem: Most of our tokens run on costly models, and sessions re-solve solved problems. I want equal output from a cheaper model by reusing earlier solutions.
how: Verified solutions sit in a SQLite index over a git journal. A cheap model adapts a match; unsolved problems climb the ladder.
where it stands: Designed, never built; model outputs from guessed inputs: cost 1.03 [G] and wrong rate 1.01 [G] of the ladder's at middle values, 0.75 [G] and 0.67 [G] at all-good.
next: Agree the limitation list, then run the zero-token index replay and no-build tests before deciding on a trial library.
origin: My idea; Library review; Harness v2 design

### MEM-20 · Misses are written down; lookup keys fixed
stage: Designed; package WP6a; metrics: efficiency, token_cost (primary efficiency); answers: LIB-S3, LIB-FUNNEL
problem: A lookup library that fails silently never improves, and we would not know when it should have answered.
how: If a session solves what the library already held, record the miss and cause, fix the lookup keys; every lookup logs hit or miss.
where it stands: Designed in harness v2; not tested, no hit rate measured. Stop rule carried over: fewer than 3 [S] verified hits in 20 [S] encounters or 8 [S] weeks.
next: Pilot after the recurrence audit in the knowledge-store design; this could show whether the library earns its keep.
origin: Harness v2 design; Knowledge-store design stop rule

### MEM-21 · Knowledge store of solved problems (PR #183)
stage: Designed; package WP6b; metrics: token_cost, efficiency, time (primary token_cost); answers: LIB-KS-RESOLVE, LIB-KS-VALUE
problem: We re-pay an expensive model each time the same hard defect or build trap returns, because past diagnoses sit in prose nobody can query by symptom.
how: Record symptom, cause, failed attempts, fix, files relied on and a check. A cheap agent finds it, runs the check, reuses the fix.
where it stands: Designed (v1.3.1, PR #183); nothing built. Same-cause repeats: 3 to 5 [M] among 48 [M] fix commits on main. Stop if fewer than 3 [S] verified hits in 20 [S] encounters.
next: I run the recurrence audit (KS-D1) and decide on KS-D1b; run the frozen validation contract before building.
origin: Knowledge-store design, after caching and case-based reasoning

### MEM-23 · Entries with diagnosis path, negative results, do-not-apply
stage: Designed; package WP6b; metrics: efficiency, quality (primary efficiency); answers: LIB-KS-OUTSIDE, LIB-S9, LIB-S2, LIB-KS-STALE
problem: What failed and why is the costly part to save, and agents retry it; some prescribed fixes are wrong; 'X failed' notes go stale.
how: Each entry holds symptom, cause, ordered diagnosis steps, fix and scoped failed approaches. Do-not-apply entries are found by action words or exact error text.
where it stands: Designed, not built; eight examples rebuilt from git history. Walked savings are guesses: 36 [G] old-job messages the enable-dispatcher entry would flag; 16 [G] broken-main days a stranded-fix scan fits.
next: Seed the eight worked examples as the first entries (phase KS-4); I confirm only do-not-apply entries that encode my decisions.
origin: Knowledge-store design, after KEDB and case-based reasoning

### MEM-24 · Stale by code change, never by age
stage: Designed; package WP6b; metrics: hallucination, quality (primary hallucination); answers: LIB-KS-STALE, LIB-S10, B21
problem: A stored fix goes stale when the code it relies on changes. Age is a poor stand-in, and our libraries fill with things no longer true.
how: Each entry lists its dependencies (file hashes, config keys, versions). A change marks it suspect and re-runs its check; if valid, it is re-stamped.
where it stands: Designed in the store design and harness v2; not tested. Whole-file hashes first, symbol-level spans later. The board carried 183 [M] minor findings with no status.
next: Implement file-hash and config-key dependency items in phase KS-3; I decide D12 on when a finding goes stale.
origin: Knowledge-store design, after the build systems Bazel and Shake; Harness v2 design

### MEM-25 · Feedback loop that revises entries
stage: Designed; package WP6b; metrics: quality, hallucination (primary quality); answers: LIB-S10, LIB-KS-FALSELEAD
problem: I want entries to improve with use, without a model rewriting them freely or confirming wrong hits.
how: Applied then resolved confirms an entry; not resolved suppresses it at that footprint and queues an Opus revision. New proposals need independent approval.
where it stands: Designed in section 4.3 of the store design; not built or tested. Proposals activate only on a different Opus approver or two independent confirmations.
next: Build it together with the record path.
origin: Knowledge-store design, after case-based reasoning

### MEM-26 · Seed the store through the write gate
stage: Designed; package WP6b; metrics: quality, hallucination (primary quality); answers: LIB-Q, LIB-S9
problem: A new store starts empty, and bulk-copying old prose would import errors, contradictions and untested claims.
how: Seed eight worked examples and four CLAUDE.md traps through the write gate, each approved by another Opus session; later, seed on lookup misses.
where it stands: Designed (phase KS-4), blocked on KS-1 to KS-3 and KS-D1b. The inventory to draw on: about 20 [M] solved entries, 21 [M] traps and 60 [M] negative results, of which the first seed takes eight examples and four traps; 128 [M] open defects stay in the register.
next: I rule KS-D1 and the recurrence audit runs first; seeding then starts the store with checked entries only.
origin: Knowledge-store design (seeding ruling)

### MEM-35 · Write-through record at solve time, Opus-confirmed
stage: Designed; package WP6b; metrics: quality, hallucination (primary quality); answers: LIB-S9, W2
problem: Entries written later from a transcript lose the diagnosis path or fill the store with junk, and a self-confirmed entry could be wrong.
how: The solving session fills a fixed schema before PR-ready, for hard problems only; the PR's Opus reviewer tries to refute it, then approves.
where it stands: Designed; not yet tested. Estimated cost about 10 to 20 minutes of the solving session per record [E]. It is policy plus review, not a technical lock.
next: Seed the store, then run the pilot to see whether records get written and hold up.
origin: Knowledge-store design

### MEM-36 · Do-not-apply entries with a proposed-change check
stage: Designed; package WP6b; metrics: quality (primary quality); answers: LIB-KS-DIFF
problem: A rule like 'a locked account must refuse even a correct PIN' needs a check that fires before the forbidden change lands.
how: A check run on a proposed change has four outcomes: applies, protection changed, protection disabled, or inconclusive. The prohibition text is never withheld.
where it stands: Designed; not yet tested. 3 of 3 past edits to the protective files were legitimate [M], so stops go to the reviewer, never to an automatic verdict.
next: Write fixtures for an inverted test, a deleted file and a skipped test. This would protect the deliberate PIN-lock rule.
origin: Knowledge-store design, completeness critic and my critique

### MTH-24 · Knowledge-store steps in the phase routine
stage: Designed; package WP6b; metrics: token_cost, efficiency (primary token_cost); answers: W2, LIB-KS-RESOLVE
problem: A store nobody consults helps nothing, and escalating a tier without a lookup pays the top tier for a repeat.
how: A plan section 0 bullet: look up before escalating, diff lookups at first commit and PR-ready, record before PR-ready, close at phase end.
where it stands: Designed in the knowledge-store design: proposed text only, not applied, conditional on the pilot saying go. Compliance is self-reported, no hook. Not yet tested.
next: Add the bullet to the ship plan after a pilot go (decision KS-D10).
origin: Knowledge-store design

### MTH-36 · Save-rule, run provenance and skill retirement
stage: Designed; package WP10a; metrics: efficiency, quality (primary efficiency); answers: W5, W4
problem: Workflows are written per task and not saved, and without the script, args and reviewer brief a run cannot be re-run or audited.
how: Keep a script only after a second use or a failure; save it as run with args and brief; run skill retire checks.
where it stands: Adopted in narrowed form, not yet tested. Pass by P10 [T]: every saved script names at least 2 dated uses or a failure id.
next: Write the rules into the evidence rules; run retire checks at the phase closes the plan names.
origin: Dex Horthy sweep; ad hoc practice since one commit

### MSR-19 · Recurrence audit before any knowledge-store build
stage: Designed; package WP6b; metrics: efficiency, quality (primary efficiency); answers: LIB-KS-VALUE
problem: We have not shown that the same cause ever hits twice in a way a symptom-keyed store could serve, so a build might repay nothing.
how: Sonnet classifies 72 [M] fix commits, counting a repeat only under three strict tests; an Opus refuter rechecks every counted repeat.
where it stands: Designed in the knowledge-store design; not yet run. A raw count already shows 3 to 5 same-cause repeats among 48 fix commits on main [M].
next: I answer KS-D1 (run the audit); Sonnet extracts, Opus refutes. It gives the prior that decides whether to build.
origin: Knowledge-store design

### TOK-35 · Library as a session's external memory
stage: Idea; package WP6a; metrics: token_count, quality, hallucination (primary token_count); answers: R2, LIB-S5, LIB-S9
problem: Huge windows and lossy summaries both cost: the long-lived window is over half of all tokens [M], and compaction losses are unmeasured.
how: Keep what a session learned in the library and fetch it on demand, instead of carrying it in the window or a summary.
where it stands: An idea and use case from the library review; not measured and no fix agreed. Compaction dropped a fetched entry in 1 [M] case, while 4 [M] went the other way.
next: Agree the limitation list before choosing any fix.
origin: Library plausibility review, 2026-11-12

### MEM-52 · Cross-session and cross-project recall
stage: Idea; package WP6a; metrics: efficiency, token_cost (primary efficiency); answers: LIB-REACH, LIB-S2
problem: New sessions do not remember earlier sessions' mistakes, so the same error is re-hit across many sessions and across projects.
how: The library serves entries across sessions and projects, so a lesson paid for once reaches later windows, including a second project.
where it stands: Idea; no fix agreed. One missing-tool error was re-hit in 54 of 78 [M] sessions across 9 [M] projects; only config-value checks still run in another repo (5 of 50 [M] fixes).
next: Agree the limitation list with me first; no fix is agreed yet.
origin: My idea; Library review

### MEM-54 · Plan templates and cross-project design decisions
stage: Idea; package WP6a; metrics: efficiency, token_cost (primary efficiency); answers: LIB-S10, LIB-S9
problem: We re-derive recurring slice shapes, design 'no' decisions, research claims and stack or machine traps each time they come up.
how: Store plan templates for recurring slice shapes, design decisions with their reasons, research claims, and stack and machine traps.
where it stands: Idea; no fix agreed. Seen working through today's documents, not a library: a design 'no' held five [M] months; a later design reused one that cost about 15M [M] helper tokens.
next: Agree the limitation list with me; no fix is agreed yet.
origin: Library review

### MEM-55 · Similarity-based reuse: a hit is a hypothesis
stage: Idea; package WP6a; metrics: token_cost, efficiency (primary token_cost); answers: LIB-S3, LIB-S4, LIB-COMES
problem: Exact repeats are rare, but similar problems across projects and time may be common; we need to know whether a similar-not-same solution fits.
how: Fetch the nearest stored solution, treat it as a hypothesis, adapt it, and let tests decide; entries are verified when written.
where it stands: Idea, untested here; coverage on my work is unmeasured. Outside: 17-45% of fixes follow recurring patterns [S]; 40% of this repo's commits fit six file shapes [E].
next: Run the similar-problem coverage labelling and the oracle-match trial.
origin: Library review; my objection, after outside coding studies

### MEM-56 · Merge partial solutions through a graph
stage: Idea; package WP6a; metrics: quality, efficiency (primary quality); answers: LIB-S4, LIB-S6
problem: A new problem may be covered in parts by two stored entries, and returning one best match cannot use both halves.
how: Score how much of a problem each entry covers, then select entries whose parts together cover it; needs a split into parts.
where it stands: Not yet tested. In real walks two checked answers did not make a checked merge (6 cases [M]); merge cards needed four parts (2 cases [M]); the seam needed a new fact.
next: No fix agreed; scoring and the split into parts are the design work, and tests decide.
origin: My idea; library review

### MEM-62 · Automatic footprint capture for knowledge-store entries
stage: Idea; package WP6b; metrics: quality, efficiency (primary quality); answers: LIB-KS-STALE
problem: Authors may forget to list what an entry depends on, so we want the list captured, not guessed.
how: Three captures: what the agent read (hooks or transcript), what the check executed (coverage), and a fixed environment probe.
where it stands: Deferred. The pilot uses only the fix diff, check inputs, environment probes and transcript reads; coverage capture waits (KS-D5) and needs two small dev dependencies. Not yet tested.
next: I decide on the two dependencies (KS-D5). Coverage capture could then tighten when entries go stale.
origin: Knowledge-store design, research lane X-03

### MEM-64 · Temporal knowledge graph
stage: Idea; package WP7; metrics: hallucination, token_count, quality (primary hallucination); answers: TK-FETCHED, LIB-KS-STALE
problem: I want recall to say when a fact was true and when it was recorded, so we never return a stale conclusion.
how: Store facts with validity intervals, from one commit until superseded, and record when each was learned; start with a tool-written temporal view.
where it stands: Idea, not tested here: our graph test had one snapshot per commit and no validity intervals. Outside study: context cut from 115k [S] to 1.6k [S] tokens, against full context; benchmark disputed.
next: Cover it in the wider test, building the temporal view first; I decide whether it is included.
origin: Graph test, after Graphiti and Zep

### MTH-54 · Give sweep assessors the design text and rules
stage: Idea; package WP10a; metrics: efficiency, quality (primary efficiency); answers: PR-BRIEFFACTS
problem: Our assessment stage did not read the design documents, so ideas that were already program law were rated as new and only the refuter caught it.
how: The next sweep's assessment brief carries the output-schema text and the RT-01 to RT-07 rules, so overlap with program law is caught at assessment, not left to the refuter.
where it stands: Idea, not yet tested. Observed cost: 8 of 24 adopt calls were already program law [M]. Fewer repeated assessments are expected, not measured.
next: Add the note at the next orchestration-design edit and use it in the next sweep brief.
origin: BAML sweep, ruling on the assessment stage

### TOK-42 · Cairn: SQLite memory and tool paring
stage: Parked; package WP6a; metrics: token_count, efficiency (primary token_count); answers: TK-PREFIX
problem: Carry memory across sessions and cut tool-definition overhead.
how: Each reply ends with a structured block that a hook stores in one SQLite file for later sessions; a proxy drops unused tool definitions.
where it stands: Parked: audited from source only; not adopted or trialled, nothing measured.
next: Keep as a comparator for semantic cross-session memory.
origin: Outside project

### MEM-70 · Push memory, age expiry and self-rewriting rules
stage: Parked; package WP6b; metrics: quality, hallucination (primary quality); answers: -
problem: We want a memory that stays current by itself, without someone tidying it, so sessions start with what is still true.
how: A layer that pushes context into sessions, retires notes by age, matches headings by keyword, and lets rules rewrite themselves.
where it stands: Parked: rejected in the knowledge-store design and listed as not built in harness v2. It was not tested here, so we have no result either way.
next: Nothing planned.
origin: Harness v2 design; Clinic testbed
