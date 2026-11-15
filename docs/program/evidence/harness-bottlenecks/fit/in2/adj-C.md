# Fallen Horthy candidates, group G4 (source rows: horthy-fallen-4.md, horthy-fallen-5.md)

37 items.

### G4-F188 (horthy, already-done in the PR; screener strength: moderate)
- bottlenecks proposed: B17
- claim: Same-model fresh-context reviewer shares the implementer's blind spots; independence needs a different model, read-only rights, or a panel of narrow reviewers.
- why it fell: One commenter's setup on another model; for Opus-on-Opus test anchoring supplies independence, and a cross-model panel doubles review cost. [class: cost-or-risk; screener says the reason still holds against the bottleneck: partly]
- what the screener says it would add: B17's replay of seven known misses with a second model family against a fresh same-model reviewer; the clinic's late P1s that round-one Opus reviewers missed are the evidence.

### G4-F087 (horthy, already-done in the PR; screener strength: moderate)
- bottlenecks proposed: B12, B01
- claim: Agents game tests (comment out, mock, special-case); keep test edits visible, run held-out tests, check test diffs for weakened assertions.
- why it fell: Weakened tests are already itemised in every review; F073 extends it to suppressions. [class: already-in-fixflow-on-paper; screener says the reason still holds against the bottleneck: partly]
- what the screener says it would add: A script step in the claims check and fix-round contract that flags edited or weakened tests, aimed at the recorded cited-test overstatements and fixes that passed by changing the test.

### G4-F166 (horthy, already-done in the PR; screener strength: moderate)
- bottlenecks proposed: B12
- claim: Agents hollow out tests (mock the integration that matters, edit both sides of a contract); verifiers must check tests hit real code.
- why it fell: Test hollowing is already in the reviewer brief and drift checks. [class: already-in-fixflow-on-paper; screener says the reason still holds against the bottleneck: no]
- what the screener says it would add: B12's claims-file script checks that a cited test exists, ran and fails when its guard is removed; this is the same check. A brief line is not enough there, it must be a script.

### G4-F153 (horthy, already-done in the PR; screener strength: moderate)
- bottlenecks proposed: B01, B12
- claim: First phase is a failing test; require tests that fail on pre-patch code (fail-before/pass-after).
- why it fell: Fail-before/pass-after is already required in the ship plan. [class: already-in-fixflow-on-paper; screener says the reason still holds against the bottleneck: no]
- what the screener says it would add: Names the exact B01 first step (a reproduction test per finding failing before and passing after); the clinic gate had lock-removal proofs only for race tests, not per fix. Would be what the five late P1s lacked.

### G4-F162 (horthy, already-done in the PR; screener strength: weak)
- bottlenecks proposed: B01, B12
- claim: Turn every complaint, escape or production failure into a new eval, snapshot case or pre-merge check.
- why it fell: Escapes already become tests and gates. [class: already-in-fixflow-on-paper; screener says the reason still holds against the bottleneck: partly]
- what the screener says it would add: Compile section 6 promotes a recurring lesson into a deterministic check. The clinic root kept 15 lesson files by hand yet the same defect shapes (fixes that add state) recurred; this would turn them into checks.

### G4-F003 (horthy, already-done in the PR; screener strength: moderate)
- bottlenecks proposed: B12
- claim: The quiet runner must still print the test count so a pass with zero tests run is visible.
- why it fell: Zero-test runs already fail (pytest exit 5, jest/vitest exit 1), skips are printed and fatal. [class: already-in-fixflow-on-paper; screener says the reason still holds against the bottleneck: no]
- what the screener says it would add: The testbed record shows this missing: its red-team defect 'verify passes when every test is skipped' (A7-13) is still open, and B12's claims check must prove a cited test ran, not just exists.

### G4-F006 (horthy, already-done in the PR; screener strength: weak)
- bottlenecks proposed: B10, B09, B07
- claim: One root script owns infrastructure setup, readiness wait, run and cleanup so agents cannot run tests half-configured.
- why it fell: Integration setup, readiness and run are already owned by one recipe. [class: already-in-fixflow-on-paper; screener says the reason still holds against the bottleneck: no]
- what the screener says it would add: B10's first step has the check start its own database when missing; a single owning script also gives B09 a place to record the running test and B07 one slot gate.

### G4-F154 (horthy, already-done in the PR; screener strength: weak)
- bottlenecks proposed: B17
- claim: Give each phase a cheap human-checkable proof (a curl, a black-box test) so the human can verify without reading all the logic.
- why it fell: Refuted: evidence asserted only; per-phase Done-when checks and CI already give a cheap check outside the agent's report. [class: weak-evidence; screener says the reason still holds against the bottleneck: partly]
- what the screener says it would add: B17 has no human reading anything and final heads merged unread. An owner-runnable proof per merge would be a cheap human touch. The compile already lists this id as refuted, so this is a reopen question.

### G4-F156 (horthy, skip in the PR; screener strength: weak)
- bottlenecks proposed: B07, B06
- claim: Tier verification by cost and risk: relevant subset per phase, cheap proxies first, full suite before close.
- why it fell: Refuted: full gates at close exist, hook failure absent here, python runs only in Docker so setup cost does not shrink with a subset. [class: no-fixflow-weakness-matched; screener says the reason still holds against the bottleneck: partly]
- what the screener says it would add: B07 waits of 6 to 34 minutes came from full gates per round; a subset per fix round would free the one slot. But B01 asks for a full gate before the fix commit, so it cuts against that.

### G4-F078 (horthy, already-done in the PR; screener strength: moderate)
- bottlenecks proposed: B01
- claim: Bound every retry or research pass, define escalation: one more subagent pass at most, then human choice.
- why it fell: Retries and research passes are already capped with an escalation list. [class: already-in-fixflow-on-paper; screener says the reason still holds against the bottleneck: no]
- what the screener says it would add: B01's first step caps fix rounds at two. 9 of 11 clinic gates ran three rounds and the build stopped on the owner's word, not on convergence; an escalation rule would have ended it by design.

### G4-F213 (horthy, already-done in the PR; screener strength: weak)
- bottlenecks proposed: B12
- claim: Output cannot be trusted when the agent says done; check-ins and verification are needed.
- why it fell: The harness already treats an agent's 'done' as unverified; W2 is covered by G4-F232. [class: already-in-fixflow-on-paper; screener says the reason still holds against the bottleneck: partly]
- what the screener says it would add: B12 recorded 20-plus overstated reports the orchestrator checked by hand; this makes 'unverified until a script resolves it' the default rule.

### G4-F145 (horthy, already-done in the PR; screener strength: weak)
- bottlenecks proposed: B12, B16
- claim: Ask for neutral statements of fact; treat evaluative good/bad claims with suspicion.
- why it fell: Schemas already ask for facts with evidence rather than verdicts. [class: already-in-fixflow-on-paper; screener says the reason still holds against the bottleneck: partly]
- what the screener says it would add: A report format of path, hash and facts for B16, and a claims file with checkable facts for B12, replacing narrative reports that overstated.

### G4-F072 (horthy, already-done in the PR; screener strength: moderate)
- bottlenecks proposed: B12, B13, B21
- claim: Never send an agent to do deterministic code's job; use scripts, ast-grep, jq, fixed queries.
- why it fell: Deterministic jobs are already scripted or grepped. [class: already-in-fixflow-on-paper; screener says the reason still holds against the bottleneck: partly]
- what the screener says it would add: The principle behind three compile first steps: claims resolved by script (B12), a generated board from fragments (B13), a script parse of the P3 board (B21). The clinic root did these by hand.

### G4-F052 (horthy, already-done in the PR; screener strength: moderate)
- bottlenecks proposed: B17, B21
- claim: Decide review depth by risk zone: heavy on money, auth and lifecycle, lighter elsewhere.
- why it fell: Review depth is already tiered by risk zone. [class: already-in-fixflow-on-paper; screener says the reason still holds against the bottleneck: partly]
- what the screener says it would add: B17 bars high-risk branches from merging on an unread final head; B21 asks owner re-triage of P3s on money, stock, access, import and restore. A risk tier is the selector for both.

### G4-F143 (horthy, already-done in the PR; screener strength: weak)
- bottlenecks proposed: B21
- claim: AI review bots mostly add noise; a model always finds something to say.
- why it fell: Noise risk is met by tying review to tests and refuting it. [class: already-in-fixflow-on-paper; screener says the reason still holds against the bottleneck: partly]
- what the screener says it would add: Offers a cause for the 111 round-one P3 findings and 183 P3 ids with no status; supports a severity floor or test-anchored findings before anything is carried.

### G4-F146 (horthy, already-done in the PR; screener strength: weak)
- bottlenecks proposed: B01, B21
- claim: An LLM plan/code critic gives false findings about 60 percent of the time, so findings need filtering before action.
- why it fell: Critic output is already filtered before anyone acts on it. [class: already-in-fixflow-on-paper; screener says the reason still holds against the bottleneck: partly]
- what the screener says it would add: Unfiltered findings acted on in fix rounds may be a source of fix-induced defects (B01) and of the P3 pile (B21); the clinic gate had a refuter, so measure its drop rate.

### G4-F208 (horthy, already-done in the PR; screener strength: moderate)
- bottlenecks proposed: B04, B08, B15
- claim: Review capacity is the bottleneck; optimising other steps raises WIP and the bottleneck shifts (40 tickets became 40 in review).
- why it fell: WIP is already limited to one phase at a time here. [class: already-in-fixflow-on-paper; screener says the reason still holds against the bottleneck: no]
- what the screener says it would add: The clinic ran 11 slices in parallel with about 20 idle sessions and 26 databases; a WIP cap is the lever on B08/B15 and on the serial gate in B04. Must respect the ceiling of two lanes.

### G4-F168 (horthy, already-done in the PR; screener strength: moderate)
- bottlenecks proposed: B19
- claim: Write small runnable learning proofs for black-box dependencies instead of trusting docs or absence reports.
- why it fell: The ship plan already proves behaviour by running it first (standing rule 2, P5-spike, rehearsals). [class: already-in-fixflow-on-paper; screener says the reason still holds against the bottleneck: no]
- what the screener says it would add: B19 steps (fresh-VM restore, off-site push with a planted failure, alert) are exactly such proofs; nothing in the clinic ran on a real host.

### G4-F094 (horthy, already-done in the PR; screener strength: moderate)
- bottlenecks proposed: B17
- claim: Keep humans reading code; keep a human review point and sampled inspection (andon cord).
- why it fell: A human review point already exists every phase. [class: already-in-fixflow-on-paper; screener says the reason still holds against the bottleneck: no]
- what the screener says it would add: Clinic had no human review and 4 of 5 merges on 10 November merged unread. Sampled human inspection of a high-risk merge is B17's missing control.

### G4-F060 (horthy, skip in the PR; screener strength: weak)
- bottlenecks proposed: B03, B04
- claim: Attribute token spend by stage, agent and model from recorded token counts.
- why it fell: Refuted: marketing and anecdote evidence; standing attribution reopens the M00-M06 skip; workflow transcripts already hold the data. [class: reopens-an-owner-skip; screener says the reason still holds against the bottleneck: partly]
- what the screener says it would add: Compile 3.6 asks for per-slice token figures from November transcripts (66 percent slice sessions); the clinic record supplies the data, so a one-off tally is enough, not a standing pipeline.

### G4-F224 (horthy, skip in the PR; screener strength: weak)
- bottlenecks proposed: B06, B07, B18
- claim: Let CI drive fresh follow-up fix agents per failure stage instead of running the full suite in the agent's sandbox.
- why it fell: FixFlow CI already runs in about 3 minutes and exists; dropping the local run leaves release/drain without a gate. [class: no-fixflow-weakness-matched; screener says the reason still holds against the bottleneck: no]
- what the screener says it would add: The clinic had no CI, no remote and a Windows gate behind a 34-minute queue. A Linux gate off the shared slot would change B06, B07, B18; needs an owner custody decision (B11) and no data off owner machines.

### G4-F155 (horthy, already-done in the PR; screener strength: moderate)
- bottlenecks proposed: B02
- claim: Plan in vertical slices with a checkpoint between them, so the earliest phase yields something inspectable end to end.
- why it fell: The ship plan is already sliced by phase. [class: already-in-fixflow-on-paper; screener says the reason still holds against the bottleneck: no]
- what the screener says it would add: The clinic's slices were tested on a synthetic seeder and no clean install was ever walked until the last day; an end-to-end first slice would have exposed the refused real data and missing till creation.

### G4-F229 (horthy, skip in the PR; screener strength: moderate)
- bottlenecks proposed: B01
- claim: When something breaks after a change, roll back first and investigate later.
- why it fell: Rollback discipline belongs in runbook R5, not the harness; the 30-case eval aside is unsupported. [class: other; screener says the reason still holds against the bottleneck: no]
- what the screener says it would add: B01 first step says revert instead of patching a patch. The clinic chains (cutoff-guard fix, then a permanent stock hold; S11 restore fix, then a lost restore point) were patches on patches. Revert-first would have cut those rounds.

### G4-F230 (horthy, already-done in the PR; screener strength: moderate)
- bottlenecks proposed: B01, B12
- claim: Giant AI PRs are unreviewable; LLM-written tests are often poor, so test volume is not assurance.
- why it fell: Phase sizing keeps PRs small and the fail-before/pass-after rule is a stronger test-quality check than counting lines. [class: already-in-fixflow-on-paper; screener says the reason still holds against the bottleneck: partly]
- what the screener says it would add: B01 first step calls for a reproduction test per finding. The testbed's cited-but-missing tests (B12) show test quality was unchecked. Paper rule never ran in the clinic.

### G4-F235 (horthy, already-done in the PR; screener strength: moderate)
- bottlenecks proposed: B12, B13, B21
- claim: Move deterministic logic out of prompts into scripts; reserve LLM steps for judgement.
- why it fell: The harness already moves knowable checks into scripts and CI; apply case by case. [class: already-in-fixflow-on-paper; screener says the reason still holds against the bottleneck: partly]
- what the screener says it would add: Names the principle behind the script-checked claims file (B12), generated board (B13) and parsed finding records (B21). The orchestrator verified every report by hand in the testbed.

### G4-F222 (horthy, already-done in the PR; screener strength: moderate)
- bottlenecks proposed: B17, B04
- claim: Loops end at a human merge button with distinct ready-to-merge and needs-human states.
- why it fell: No auto-merge or auto-trigger exists; every phase already ends at a human merge. [class: already-in-fixflow-on-paper; screener says the reason still holds against the bottleneck: partly]
- what the screener says it would add: The testbed merged the final head unread (4 of 5 merges on 10 Nov, plus the 11 Nov switch). Explicit needs-human state in a typed verdict would block those merges; B17 proof wants unread merges at zero.

### G4-F226 (horthy, already-done in the PR; screener strength: weak)
- bottlenecks proposed: B17
- claim: If the AI is right about 90 percent of the time, keep reviewing every output instead of automating away review.
- why it fell: Every output is already reviewed; nothing is automated past review. [class: already-in-fixflow-on-paper; screener says the reason still holds against the bottleneck: partly]
- what the screener says it would add: B17 records that no human read anything and the final head often merged unread. Supports a rule that high-risk branches cannot merge on 'none' or 'own' reader.

### G4-F123 (horthy, skip in the PR; screener strength: moderate)
- bottlenecks proposed: B21, B01
- claim: Separate mechanical findings (one right answer, batch-fix) from judgement findings; 180 rewrites at once means nobody reads.
- why it fell: The split exists in practice already; a formal rule adds little. [class: no-fixflow-weakness-matched; screener says the reason still holds against the bottleneck: no]
- what the screener says it would add: The board has 183 P3 ids with no status column, 111 P3s in round 1 alone. A mechanical/judgement field in the parsed finding record would let P3s be batch-closed or expired by rule, and keep them out of fix rounds.

### G4-F211 (horthy, skip in the PR; screener strength: moderate)
- bottlenecks proposed: B21, B01
- claim: Give the actuator three options per finding (fix, ignore with recorded reason, skip for human), one commit per issue; baseline regression gate.
- why it fell: Honest-options half already exists; per-issue commits lost to squash merges; ratchet solves a problem P5b-2 lacks. [class: no-fixflow-weakness-matched; screener says the reason still holds against the bottleneck: no]
- what the screener says it would add: B21: a status with recorded reason on the 183 P3 ids gives an open count. B01: one commit per finding makes revert-instead-of-patch possible on a branch, where squash is not an issue.

### G4-F239 (horthy, skip in the PR; screener strength: weak)
- bottlenecks proposed: B01
- claim: Run competing attempts in parallel to learn the solution space.
- why it fell: Two parallel implementations double spend and owner review load; phases are designed first anyway. [class: cost-or-risk; screener says the reason still holds against the bottleneck: partly]
- what the screener says it would add: Compile section 5 names several candidate fixes chosen by a frozen test as the one replay worth running on the recorded fix-induced P1 chains. Cost holds for live use; not for the replay.

### G4-F161 (horthy, skip in the PR; screener strength: weak)
- bottlenecks proposed: B01, B12
- claim: Use pre-commit/pre-push hooks and one combined check command as backpressure the agent cannot finish without passing.
- why it fell: Re-adopts a deliberate skip with no new reason. [class: reopens-an-owner-skip; screener says the reason still holds against the bottleneck: partly]
- what the screener says it would add: B01 wants the full gate before the fix commit; B12 wants a stop that blocks on a failed claim check. The testbed's own pre-commit hook had open defects (verify passes when all tests skipped). Needs the owner; root-gate version needs no hook.

### G4-F066 (horthy, skip in the PR; screener strength: moderate)
- bottlenecks proposed: B03, B04
- claim: Heavier skill packs cost 1.5 to 2 times tokens without matching gain; track cost-per-pass when adding skills.
- why it fell: Figure is from general workflow packs; FixFlow skills are capped; a standing routine re-adopts the skipped measurement pipeline. [class: reopens-an-owner-skip; screener says the reason still holds against the bottleneck: partly]
- what the screener says it would add: Clinic CR-11 measured about 70k fixed tokens per agent (skills 9k, connectors 17k) and the context-system trials cost +6 to +17 percent. Supports lever 2 of section 3.6: fewer skills in agent sessions. A one-off count, not a routine.

### G4-F187 (horthy, skip in the PR; screener strength: weak)
- bottlenecks proposed: B17, B03
- claim: Not every PR needs a max-effort reviewer; risk-tier the reviewer.
- why it fell: Harness already scopes review by risk and runs Opus at high; few low-risk PRs, so the saving is illusory. Leftover is one clause. [class: cost-or-risk; screener says the reason still holds against the bottleneck: partly]
- what the screener says it would add: B17 wants high-risk branches blocked from unread merge; the refuter's warning says remedies need one budget. Risk-tiering decides where the fresh reviewer and final-head reader are spent. Testbed has many low-risk slices, unlike the plan.

### G4-F071 (horthy, skip in the PR; screener strength: weak)
- bottlenecks proposed: B09, B14
- claim: Design verifier errors for the agent: return the error plus captured state and console output, not cryptic logs.
- why it fell: Single anecdote from another domain; pytest and Jest already carry state. [class: weak-evidence; screener says the reason still holds against the bottleneck: partly]
- what the screener says it would add: The 600 s hang left no state: B09 first step dumps every worker's stack and names the running test on stall. The clinic record shows the stall watchdog killed without a cause class.

### G4-F238 (horthy, already-done in the PR; screener strength: weak)
- bottlenecks proposed: B19, B02
- claim: Success is shipped, verified and maintained in production, with feedback loops from Sentry and similar.
- why it fell: Done already means shipped and verified in production. [class: already-in-fixflow-on-paper; screener says the reason still holds against the bottleneck: partly]
- what the screener says it would add: B19 shows nothing ran on a real host (no certificate script, no off-site push, no alerts); B02 shows the clean-install walk found gaps on the last day. Supports a real-host done-definition.

### G4-F233 (horthy, skip in the PR; screener strength: weak)
- bottlenecks proposed: B20
- claim: Have the model benchmark its own output for performance-sensitive work instead of trusting one-shot generation.
- why it fell: One-line aside; FixFlow phases are rarely performance-bound. [class: no-fixflow-weakness-matched; screener says the reason still holds against the bottleneck: no]
- what the screener says it would add: B20: the query fix was shown for page speed (29,346 to 28 queries) but the 12-user load run was not repeated. A measured-not-asserted rule would have required the rerun.

### G4-F212 (horthy, skip in the PR; screener strength: weak)
- bottlenecks proposed: B03, B14
- claim: Put hard spend and turn limits on headless or demo runs and keep the raw output as evidence.
- why it fell: The harness runs no headless or scheduled claude -p jobs. [class: not-transferable; screener says the reason still holds against the bottleneck: partly]
- what the screener says it would add: B03 and section 3.6 want a token budget before any launch; B14 had a 49-minute foreground polling loop. A turn cap bounds such a loop and parked or resumed sessions. Needs an owner call on scheduled runs.
