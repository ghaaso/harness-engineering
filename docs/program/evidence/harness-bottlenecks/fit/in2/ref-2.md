# Mappings to attack: Horthy group G4 (source rows: horthy-survivors-C.md) and BAML (source: baml-post-review.md)

28 items.

### G4-F023 (horthy, adopt in the PR)
- idea as mapped: A clause in any adopted A/B trial: both arms read the same head SHA, the same committed brief text with its sha256 in the manifest, and the same named inputs; a result from a different input set is reported as not comparable.
- fit: supporting -> B01, B12, B17 [strengthens-first-step; cost: brief-or-config-line]
- how it fits: The compile's trials are replays at frozen commits (B01 chains, B12 recorded gates, B17 seven misses). This clause pins each replay arm to one head SHA and one hashed brief, so a replay result is comparable across arms. It would not change the proof numbers by itself.
- attaches to: §3.3 B01 and B17 first steps; §3.4 B12 first step; §6 A6-10 validation contract
- caveat: The testbed already froze an oracle in A7-06 and a validation contract in A6-10; this adds little beyond those if they are reused.
- proof on the record: Check that each replay's evidence folder lists one head SHA per arm and a brief sha256 in the manifest; a replay without them is marked not comparable.
- reopened part: -

### G4-F025 (horthy, adopt in the PR)
- idea as mapped: One provenance line in each evidence README (resolved model ids, claude --version, date), and any comparative effort trial runs its arms side by side in the same window.
- fit: supporting -> B17 [strengthens-first-step; cost: brief-or-config-line]
- how it fits: The B17 replay compares a second model family with a fresh same-model reviewer on seven known misses. Running both arms in one window and logging resolved model ids keeps silent drift out of that comparison. It does not move the unread-final-head number.
- attaches to: §3.3 B17 first step (the replay)
- caveat: The narrowed rule names effort trials; extending it to a model-family replay is a small stretch. The B17 replay result is exploratory anyway.
- proof on the record: The B17 replay evidence README records both arms' model ids, CLI version and a shared window.
- reopened part: -

### G4-F073 (horthy, adopt in the PR)
- idea as mapped: Extend the reviewer list of changed expected values, removed assertions and new skips to added inline suppressions and edits to gate config, each with its reason, backed by a diff grep.
- fit: supporting -> B17, B12 [already-cited-in-compile; cost: script]
- how it fits: B17's rule that a finding closes only on a harness-run test fails if a fix weakens the harness. A diff grep for new skips, suppressions and check-config edits would have flagged such edits in a gate round. The open A7-13 defect, verify passing when every test is skipped, is that shape.
- attaches to: §3.3 B17 first step; §3.4 B12 claims script
- caveat: The grep lists edits; a reviewer must still judge each reason. The testbed's gate-config file set must be named first.
- proof on the record: Run the diff grep over the 65 recorded merges; count added skips, suppressions and check-config edits, and how many any gate findings table mentions.
- reopened part: -

### G4-F031 (horthy, trial in the PR)
- idea as mapped: A one-off inside the F034 effort trial: score medium and xhigh against Fable's adjudicated past verdicts, with an xhigh repeat as the noise floor and a check that the arms are not agreeing on wrong answers.
- fit: supporting -> B17 [strengthens-first-step; cost: extra-agents-per-phase]
- how it fits: The B17 replay of seven known misses has the same shape: arms scored against settled outcomes. Adding a repeat of the fresh same-model reviewer as the noise floor, and checking shared wrong answers, makes the replay readable at n=7.
- attaches to: §3.3 B17 first step (the replay)
- caveat: Narrowed to F034's effort trial; the counterpart use is a transfer of the procedure. Adds one replay arm against the budget.
- proof on the record: In the B17 replay, run the fresh same-model arm twice; report how many of seven misses differ between repeats before reading the cross-family difference.
- reopened part: -

### G4-F034 (horthy, trial in the PR)
- idea as mapped: Trial medium effort only for non-P0 Opus verifiers (review-workflow refuters and judges, in practice at xhigh, and the per-PR reviewer), by at least 30 blind paired shadows on the same brief and input hash.
- fit: supporting -> B01, B17 [strengthens-first-step; cost: extra-agents-per-phase; needs owner decision]
- how it fits: The testbed's gates use Opus refute reviewers (A1-06), and subagents took 18.3 % of November tokens. A cheaper verifier tier would pay for the fresh fix-round reviewer (B01) and the final-head reviewer (B17) inside one budget, as §3.6 demands.
- attaches to: §3.6 one budget; §3.3 B01 and B17 first steps
- caveat: Opus reviewers already missed the late P1s; lowering effort risks more misses. Stops were power-offs, and how cache reads count against limits is unknown.
- proof on the record: Rerun round-one refuters at medium on frozen gate commits; count how many of the 19 round-one P1s and the five late P1s each arm finds, and tokens per arm.
- reopened part: -

### G4-F068 (horthy, trial in the PR)
- idea as mapped: A free close-time check: worktree clean plus evidence manifest complete, trialled for missed intended files rather than for slop.
- fit: supporting -> B15 [strengthens-first-step; cost: script]
- how it fits: B15's dry-run reaper removes only merged, clean worktrees. A clean check at merge flags any worktree left dirty with intended files before it piles up or is reaped, making the reaper's precondition known at close time instead of discovered later.
- attaches to: §3.2 B15 first step (the reaper)
- caveat: Does not decide archiving; the owner's written archive policy still governs. The evidence-manifest half is FixFlow-only.
- proof on the record: Read-only git status over the current testbed worktrees of merged slices: count dirty ones and whether any dirty file was meant to be committed.
- reopened part: -

### G4-F081 (horthy, trial in the PR)
- idea as mapped: One reviewer-brief line: a finding outside the named register ids blocks only if it states a failing condition; anything else goes to the PR journal as a non-blocking note. Count review rounds instead of capping them.
- fit: supporting -> B01 [strengthens-first-step; cost: brief-or-config-line]
- how it fits: B01's contract needs a reproduction test per finding that fails before the fix. A blocking finding that must state a failing condition is the input that test is written from, and keeps non-failing findings out of the fix round. 9 of 11 gates took three rounds.
- attaches to: §3.3 B01 first step (reproduction test per finding)
- caveat: Non-blocking notes are how 183 P3 ids piled up without a status (B21); they need the B21 record. Counting rounds conflicts with nothing; the compile also caps at two.
- proof on the record: From the gate findings tables, count round-two and round-three findings that stated no failing condition; those would not have blocked.
- reopened part: -

### G4-F084 (horthy, trial in the PR)
- idea as mapped: One bounded, owner-approved trial: a single Codex review pass on a PR diff, aimed at code Opus both writes and reviews, tested against a second Opus pass rather than the existing reviewer.
- fit: supporting -> B17 [strengthens-first-step; cost: extra-agents-per-phase; needs owner decision]
- how it fits: This is the arm design of B17's replay: a second model family against a fresh same-model reviewer on the seven known misses. It feeds the exploratory replay; it does not move the unread-final-head number.
- attaches to: §3.3 B17 first step (the replay)
- caveat: The testbed record holds a Codex adapter and Codex folders, so the no-Codex-CLI premise needs rechecking. Sending diffs to another vendor is an owner call.
- proof on the record: At the frozen commits of the seven known misses, one Codex pass and one fresh Opus pass; count misses each catches.
- reopened part: -

### G4-F086 (horthy, trial in the PR)
- idea as mapped: A script for register-id defect fixes: it requires an assertion failure on the base commit and a pass on head, and checks base tests against head for weakened expectations. Runs serially with the Docker gate.
- fit: supporting -> B01, B12, B17 [strengthens-first-step; cost: script]
- how it fits: B01's reproduction test, B12's claims check and B17's harness-run close all trust a fail-before result. Requiring an assertion failure, not an import or collection error, stops a test that tests nothing from closing a finding in a gate round.
- attaches to: §3.3 B01 and B17 first steps; §3.4 B12 claims script
- caveat: Each fix adds a base-commit run to a one-slot queue with waits up to 2,030 s (B07). Scope it to the cited tests, not the full check.
- proof on the record: For each closed P1 citing a test, run that test at the fix's parent; count assertion failures against import or collection errors.
- reopened part: -

### G4-F088 (horthy, trial in the PR)
- idea as mapped: One refute-brief line: for any new stored copy or flag, name the authoritative source and what keeps the copy consistent, and check whether new types or states can represent an illegal state; count already-justified dual records as known.
- fit: supporting -> B01 [already-cited-in-compile; cost: brief-or-config-line]
- how it fits: Fix-induced P1s clustered in fixes that add state: the permanent stock hold, the restore point lost after rollback. This line would have asked the fix-round reviewer what keeps that state consistent, beside the compile's table of every way new state ends.
- attaches to: §3.3 B01 first step (the state-ending table)
- caveat: The cited data measures how often agents add the defect, not whether a reviewer line catches it. The state-ending table with a test per row is the stronger half.
- proof on the record: Replay the reviewer with this line on the five late P1 fix commits; count those where it names the hold or marker as unended or inconsistent.
- reopened part: -

### G4-F089 (horthy, trial in the PR)
- idea as mapped: Put the seven HANDOFF §6 defect shapes, with the login-lock example corrected, in the SHIP-PLAN §0 reviewer brief, with a required per-shape line in each verdict, as a trial.
- fit: supporting -> B01 [already-cited-in-compile; cost: brief-or-config-line]
- how it fits: The mechanism transfers, the list does not: the testbed needs its own named shapes from its record, chiefly fixes that add state. A per-shape verdict line would have made each fix-round reviewer answer that shape explicitly.
- attaches to: §3.3 B01 first step
- caveat: FixFlow's seven shapes are FixFlow's. The testbed list must come from its own finding tables and lesson memory (CR-01).
- proof on the record: Replay round-one review on the five late P1 frozen commits with a testbed shape list; count late P1s a shape line names.
- reopened part: -

### G4-F140 (horthy, trial in the PR)
- idea as mapped: The owner reads only the hunks the reviewer marks as touching invariants, only on PRs in §0's Opus-owned list, recorded against the head SHA, trialled on 3 PRs.
- fit: direct -> B17 [already-cited-in-compile; cost: standing-process; needs owner decision]
- how it fits: B17's proof is high-risk merges with an unread final head, 5 of 6. An owner read of marked hunks recorded against the head SHA is a reader that is neither none nor own, so it would move that number on the merges it covers.
- attaches to: §3.3 B17 first step and proof
- caveat: It ties high-risk merges to the owner's presence, which pulls against B03. The testbed needs its own high-risk list (money, stock, access, import, restore).
- proof on the record: Over the next three high-risk merges, the merge record names the owner and the head SHA read; compare with 5 of 6 unread.
- reopened part: -

### G4-F152 (horthy, trial in the PR)
- idea as mapped: One line per tick for non-register boxes (CI and harness gates, docs, deploy steps): the verifying command, its expected result and a negative run for each gate.
- fit: supporting -> B12, B19 [strengthens-first-step; cost: brief-or-config-line]
- how it fits: A claims line with its command and expected result is what B12's script can resolve. B19's first-deploy checklist gets a command, result and negative run per step, like the alert with a planted failure. It makes those steps checkable without changing the proof numbers.
- attaches to: §3.4 B12 claims file; §3.5 B19 first step
- caveat: Evidence is anecdotal. Commands written by the slice can still overstate unless the script runs them.
- proof on the record: Over the recorded gates, share of claims that named a runnable command; replay the claims script on those against the 20-plus recorded overstatements.
- reopened part: -

### G4-F157 (horthy, trial in the PR)
- idea as mapped: Apply the g() wrapper discipline (one EXIT line plus the runner's pass and skip counts, a failure excerpt instead of a bare tail) to the natively run web and mobile gates, run by the command subagent rather than Fable.
- fit: supporting -> B12 [strengthens-first-step; cost: script]
- how it fits: B12's claims script must know a cited test ran. A one-line gate result with pass and skip counts, full log on disk, gives it that, and would expose the open A7-13 defect where verify passes with every test skipped.
- attaches to: §3.4 B12 claims script
- caveat: The compile does not say how much check output reaches slice windows, so any token gain is unmeasured. Context trials in the testbed were null.
- proof on the record: Run the check with all tests skipped; the wrapper line must show the skip count and the gate must not report pass.
- reopened part: -

### G4-F181 (horthy, trial in the PR)
- idea as mapped: About 5 known-answer fixtures from closed defects, run repeatedly with blind grading as the fixture set of the L1 effort trial; no standing infrastructure.
- fit: supporting -> B01, B17 [strengthens-first-step; cost: extra-agents-per-phase]
- how it fits: The testbed's counterpart fixtures already exist: the recorded fix-induced chains and the seven known misses at frozen commits. Blind grading and repeated runs make the B01 and B17 replays less self-scored.
- attaches to: §3.3 B01 and B17 first steps (replays)
- caveat: The narrowed use is FixFlow's effort trial; this is a transfer of the fixture practice. Repeats cost agents against one budget.
- proof on the record: Grade the B01 and B17 replay outputs blind to arm; report agreement between two graders on the five late P1s.
- reopened part: -

### G4-F186 (horthy, trial in the PR)
- idea as mapped: A one-section deviation report against Plan @ sha in the review: the outside check on ticked boxes and unrecorded additions.
- fit: supporting -> B12 [adds-a-step; cost: brief-or-config-line]
- how it fits: B12 is slice records overstating what was done. A reviewer section comparing the slice's task record with its diff is an outside check on ticked boxes, beside the script-resolved claims file.
- attaches to: §3.4 B12 first step
- caveat: Still a model reading prose; the compile prefers script-resolved claims. Parents already judge by diff (A1-03), so the gain may be small.
- proof on the record: Replay a reviewer with this section over the recorded gates; share of the 20-plus overstatements it names, against the claims script's share.
- reopened part: -

### G4-F203 (horthy, trial in the PR)
- idea as mapped: One line per phase recording the change in weekly-window percent and the workflow-reported tokens and agents lost to usage limits, gating the G4-F228 effort trial.
- fit: supporting -> B03 [strengthens-first-step; cost: brief-or-config-line]
- how it fits: §3.6 sets a subagent-token budget per window before launch. A per-slice line of window use and agents lost to limits makes that budget checkable afterwards, the counterpart of October's ten lanes lost in 15 minutes.
- attaches to: §3.6 token budget (cuts across B03, B04)
- caveat: The 6 November halt was a power-off, not a limit, so it does not move B03's idle-hours proof. Cache-read counting is unknown.
- proof on the record: Rerun the tally per slice for November and compare with per-slice lines; count agents lost to limits per window.
- reopened part: -

### G4-F225 (horthy, trial in the PR)
- idea as mapped: A mechanical, not AI-curated, list of changed gate-defining files for the owner to read before the merge they already do, extending the reviewer's list of removed assertions and new skips to the gates themselves.
- fit: supporting -> B17 [strengthens-first-step; cost: script; needs owner decision]
- how it fits: B17 is that no human reads anything. A short scripted list of changed check scripts, test config and lock files gives the owner a bounded read at merge, guarding the harness-run tests B17 relies on. It does not by itself record a final-head read.
- attaches to: §3.3 B17 first step
- caveat: Needs owner time at merge, against B03. The testbed's gate-defining file set must be named.
- proof on the record: Over the 65 recorded merges, count those that changed gate-defining files and how many any review noted.
- reopened part: -

### G4-F232 (horthy, trial in the PR)
- idea as mapped: A cheap, advisory CI check on code-phase PR bodies: the Plan line, the journal heading, and a posted reviewer verdict whose SHA matches the head at merge.
- fit: supporting -> B17, B04 [strengthens-first-step; cost: script]
- how it fits: The testbed counterpart is the merge step: a check in the local merge queue that the gate's typed verdict names the merged head SHA. That is how 4 of 5 merges on 10 November would have been flagged as unread.
- attaches to: §3.3 B17 merge record; §3.4 B04 typed verdict and local merge queue
- caveat: Advisory as narrowed; it moves B17's number only if the merge queue refuses on a mismatch. No CI in the testbed until B11.
- proof on the record: Over the 65 merges, compare the last reviewed SHA in each gate record with the merged head; count mismatches.
- reopened part: -

### I-13 (baml, trial in the PR)
- idea as mapped: Do not name a required verdict field `reasoning`: Anthropic's docs list a reasoning or trace field in tool input as a trigger for a billed `reasoning_extraction` refusal. Grep transcripts for refusals; rename to `explanation` at the next schema edit.
- fit: supporting -> B04 [strengthens-first-step; cost: brief-or-config-line]
- how it fits: The B04 first step adds a gate workflow that returns a typed verdict naming the head SHA. If that verdict schema has a `reasoning` field, a refusal comes back as a null verdict and the gate stalls or re-runs. Using `explanation` makes the new step safer. It would not change the compaction count.
- attaches to: §3.4 B04 first step (gate workflow with a typed verdict)
- caveat: No refusal is on record in either harness. The testbed's gates were root sessions, not schema-returning workflows, so nothing in the testbed record would have changed. This is hygiene for a step not yet built.
- proof on the record: Grep the clinic gate reviewer transcripts for `stop_reason` refusal. If there are none, adopt it at no cost when the verdict schema is written.
- reopened part: -

### D-13 (baml, trial in the PR)
- idea as mapped: Define each severity level (P0 to P3) and each verdict value once, in a shared schema constant with `description` text. First probe whether descriptions reach the subagent. Then compare severity agreement against a baseline.
- fit: supporting -> B21, B01 [already-cited-in-compile; cost: brief-or-config-line]
- how it fits: B21's first step parses the board's finding tables into records with a severity, and adds an owner re-triage rule. B01's live proof compares fix-induced P1 and P2 per finding against the testbed's rate. Both need severity to mean the same thing in every slice. One defined P-scale makes the parsed records and the live rate comparable.
- attaches to: §3.3 B21 first step (records with id, severity, status); B01 live proof
- caveat: It is unverified that descriptions reach the model. The testbed's 183 P3 ids were labelled without shared definitions, so they cannot be relabelled after the fact. It helps going forward only.
- proof on the record: In the B21 parse, re-triage the pilot-critical subset against the written P-definitions. Count the rows whose severity changes. Many changes mean the round-one labels are not comparable across slices.
- reopened part: -

### T-08 (baml, trial in the PR)
- idea as mapped: Deterministic, record-only script checks over returned records instead of a model judge: quotes of 15 words or fewer, unique ids, evidence in `path:line — quote` form with an allow-list for library, command and web forms. No retry on a failed check.
- fit: supporting -> B12, B21 [already-cited-in-compile; cost: script]
- how it fits: B12's first step is a script over a committed claims file. T-08 gives it the discipline: record failures rather than reject them, keep an allow-list so legitimate forms are not flagged, and never retry (a retry invites fabrication). B21's record parser needs the same unique-id check across the 183 P3 ids. The existence, ran and guard-removal checks remain the compile's own.
- attaches to: §3.4 B12 first step (script-checked claims file); §3.3 B21 parser
- caveat: Format checks alone cannot catch a test that does not exist. A naive regex flagged 174 of 707 legitimate W2 strings, so most of the work is the allow-list. The 10 % false-flag ceiling in B12's proof is at risk.
- proof on the record: Run record-only over the testbed's slice reports at the recorded gates. Count how many of the 20-plus overstatements are flagged, and the false-flag rate.
- reopened part: -

### P-10 (baml, trial in the PR)
- idea as mapped: A stub run of a gate script: `const call = args.stub ? stubAgent : agent`. The stub injects nulls, a throw, REFUTED and UNVERIFIABLE verdicts and over-cap claims, so the script's bookkeeping is tested with no model call.
- fit: supporting -> B04, B17 [adds-a-step; cost: script]
- how it fits: B04 and B17 add new scripts: a gate workflow, a local merge queue, and a merge record that refuses a reader of 'none' or 'own'. A stub run checks before live use that a dead reviewer, or a REFUTED verdict, can never route to merge. This is the bookkeeping-defect class that FixFlow's v3 log found only by review.
- attaches to: §3.4 B04 first step and §3.3 B17 merge record
- caveat: S-3 supersedes it, with a sharper measurement. The testbed record has no gate script, so nothing there would have changed. A stub cannot exercise the runtime's cache and resume semantics.
- proof on the record: -
- reopened part: -

### S-1 (baml, borrow in the PR)
- idea as mapped: Tagged `run()` results: null (the agent died), a caught error with its message, or a value. The breaker then counts only suspected-limit nulls, and a schema-exhaustion failure cannot pass for a usage limit. This needs a probe of what `agent()` returns on exhaustion.
- fit: supporting -> B04, B17 [strengthens-first-step; cost: script]
- how it fits: In the B04 and B17 gate workflow, a reviewer that died must read as 'not reviewed', never as clean. Tagged results let the merge record refuse a merge when a reviewer slot is null or erred. That is what keeps the '5 of 6 unread final heads' rule from being met by a dead agent.
- attaches to: §7 gate as a workflow with a typed verdict (B01, B04, B16, B17)
- caveat: The 6 November stop was a power-off, not a limit, and a power-off kills the whole workflow. So S-1 does nothing for B03. Unrefuted, and its precondition is open.
- proof on the record: -
- reopened part: -

### S-2 (baml, borrow in the PR)
- idea as mapped: One constants table from which both the schema enums and the bucket mapping are generated, so no verdict or status value can exist without a bucket.
- fit: supporting -> B21, B13 [strengthens-first-step; cost: script]
- how it fits: B21 found 183 P3 ids and no status column, so no open count could exist. B13's generator builds the board from slice fragments. One status and severity table, feeding both the fragment schema and the board's counts, means every finding lands in an open or closed bucket. An unmapped status fails the generator.
- attaches to: §3.3 B21 parser and §3.4 B13 fragment-and-board generator
- caveat: Unrefuted. It guarantees totality, not correct statuses. The historical tables still need the owner's expiry and re-triage rule.
- proof on the record: Parse the board's finding tables against the table. Count rows whose status maps to no bucket. The proof is zero unmapped rows and an open count.
- reopened part: -

### S-3 (baml, borrow in the PR)
- idea as mapped: A stub harness for the workflow script body: run it under node as an async function with stub agent, parallel, pipeline, log and phase, and scripted nulls and throws. Feasibility is settled. Its test: re-introduced known bookkeeping defects must fail.
- fit: supporting -> B04, B13, B17 [adds-a-step; cost: script]
- how it fits: The compile adds three new scripts: a gate workflow (B04), a board generator (B13) and a merge queue that must refuse an unread head (B17). The harness tests their control flow at zero tokens before live use. Each recorded routing defect becomes a stub case.
- attaches to: §3.4 B04 and B13 first steps; §3.3 B17
- caveat: The testbed record has no workflow script, so nothing in it would have changed. It cannot exercise cache and resume semantics. It does not reach the testbed's verify command, whose 'all tests skipped' defect needs its own fix.
- proof on the record: -
- reopened part: -

### S-4 (baml, borrow in the PR)
- idea as mapped: A pure prompt-input boundary for the skeptic: `skepticInput(finding)` returns exactly {claim, evidence, failing_condition}. A replay test checks that the rendered prompt carries no impact, fix sketch, confidence or severity.
- fit: supporting -> B01, B17 [strengthens-first-step; cost: script]
- how it fits: B01's contract asks for a fresh reviewer for the re-read. In the testbed, round three was the root reading the diff alone, with every earlier round in context. A pure input function (finding, fix diff, test) defines what 'fresh' means, both live and in B17's fresh same-model replay, and a test enforces it.
- attaches to: §3.3 B01 fresh reviewer; B17 replay arm
- caveat: Unrefuted. No contaminated skeptic is on record, so this is hygiene. Whether a narrower input raises the catch rate is what the B17 replay measures, not this.
- proof on the record: In the B17 replay of seven known misses, use the boundary for the fresh-reviewer arm. The test fails when a forbidden field is added.
- reopened part: -

### S-5 (baml, borrow in the PR)
- idea as mapped: A transcript-derived read audit: compare an agent's self-listed reads with the Read and Grep tool calls in its `agent-<id>.jsonl` transcript. Feasibility is settled. It becomes a standing step only if self-reports under-count.
- fit: supporting -> B12 [strengthens-first-step; cost: script]
- how it fits: B12's claims check must show that each cited test exists, ran, and fails without its guard. The 'ran' leg has no source in the compile. The same shape, a slice's claims checked against its own transcript's Bash calls, shows whether a cited test was executed. That catches claims of runs that never happened.
- attaches to: §3.4 B12 first step (the 'ran' leg of the claims check)
- caveat: The narrowed borrow audits reads, so the test-run audit is the same mechanism pointed at Bash calls. It moves B12's proof only if some of the 20-plus overstatements are claimed runs. Unrefuted.
- proof on the record: For each recorded overstatement, search that slice session's November transcript for a run of the cited test. Count the claimed runs with no matching tool call.
- reopened part: -
