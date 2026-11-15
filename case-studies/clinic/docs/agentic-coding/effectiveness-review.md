# Coding workflow and implementation effectiveness review

**Secondary review retained for context.** The user subsequently clarified that the main task is a thorough audit of the four source repositories and their transfer into local documents. The [source-adoption audit](source-adoption-audit.md) is the primary answer and contains the deeper source reading, corrected GenSX interpretation and focused workflow amendment plan. The clinic design suggestions below remain proposals from the earlier review; they have not changed the technical plan or been validated as application defects.

Completed: **1 October 2026, America/Los_Angeles**. Status: **documentation/source review and proposed improvements**. No application, runtime, evaluation experiment, purchase or deployment was performed. Findings describe the written specification and workflow; they are not observed application defects.

## Verdict

**The documentation uses the four resources accurately and selectively, but has not yet turned their useful principles into a demonstrated development workflow.** It is a strong planning foundation. It does not establish production readiness, threefold quality, fivefold context efficiency, or minimum total delivery cost.

The biggest opportunity is to make a small part of the existing plan executable, close the specific design gaps below, and measure accepted results. Another broad research package, a larger prompt or an agent framework is unlikely to be the next useful investment.

| Area | Assessment | Consequence |
| --- | --- | --- |
| Source interpretation | Strong: distinguishes coding practices, agent-runtime principles and incomplete examples | Keep the existing synthesis and source reviews |
| Context design | Good routing, evidence labels, revision references and handoff templates; mostly manual/proposed | Operationalize and test freshness, information retention and resumption |
| Program design | Strong domain/transaction contracts; weaker concrete code-shape template | Add a short code-shape block for complex changes |
| Implementation plan | Detailed integrity and acceptance requirements; several boundary/sequencing gaps | Correct affected specifications before their slices |
| Executable foundations | No Git repository, clinic application or application check environment observed | Start authorized coding at S00; documentation alone is not a quality control |
| Measurement | Sound productivity experiment, but different from the current quality/context request | Define quality, context, productivity and cost separately |
| Cost discipline | Lean application proposal; conditional hosting arithmetic | Measure early resource/recovery fit and development cost as well as hosting |

## Scope and evidence

The review team read the project instructions and planning brief; the workflow index, setup proposal, context map, templates, evaluation, synthesis and source reviews; the coding launcher; and all ten technical-plan Markdown documents. Three bounded automated subreviews examined source fidelity, implementation risks and evaluation design. Findings were reconciled against the cited local specifications. These are automated reviews, not independent human or clinic acceptance.

Selected upstream implementation files and relevant guidance were inspected directly. Live `git ls-remote` checks found the four default heads and the enterprise supplementary branch still matching the saved manifest. This review did not repeat the prior exhaustive source inventory, inspect every media asset, execute upstream applications, or newly read the original clinic PDF. It evaluates the existing planning baseline and its execution workflow, without reselecting the architecture or making new clinic-practice claims. The original architecture-reassessment/full-PDF reading requirement remains unchanged.

The current folder was inspected and `git rev-parse --show-toplevel` confirmed that it is not inside a Git repository. No application tests are available to run. Source hashes and document checks for this review and the follow-up are recorded in [review verification](source-adoption-checks.json).

## How well each resource is used

| Resource | Useful transfer already present | Remaining opportunity / boundary |
| --- | --- | --- |
| [Advanced Context Engineering](https://github.com/humanlayer/advanced-context-engineering-for-coding-agents/tree/f2bc7aec4575418d2d2e83fec078266cc56d3e6a) | Research/design/implementation separation, focused delegation, durable handoffs, short complete slices and the newer return to engaged review | Carry concrete program design into the working template and measure whether compacted context preserves the facts needed for the next task |
| [12-Factor Agents](https://github.com/humanlayer/12-factor-agents/tree/d20c728368bf9c189d6d7aab704744decb6ec0cc) | Owned instructions/context, explicit control flow, compact errors, bounded workers and reconstructable state | Implement a lightweight task/checkpoint/check contract. Most runtime factors are conditional because the clinic application is not itself required to run an LLM agent |
| [HumanLayer/GenSX example](https://github.com/dexhorthy/humanlayer-gensx-example/tree/ea977e3a6abbbe0f56e7dfaff5daff889bb0ddc9) | Correctly distinguishes the actual SDK execution wrapper from a pass-through package sketch and incomplete webhook continuation | Transfer enforcement at the real execution boundary and tests covering the actual call path. Do not import unfinished approval/resume infrastructure |
| [Enterprise GTM starter](https://github.com/dexhorthy/enterprise-gtm-starter/tree/b2a1108673618f8f7a5d99867600573b2938fd57) | Small injected clients/clock, deterministic unit-test seams and concrete development commands | Apply those patterns to clinic command services and external adapters. Its legacy stack and Kubernetes/CRM infrastructure do not improve this clinic merely by being adopted |

The newer ACE [program-design guidance](https://github.com/humanlayer/advanced-context-engineering-for-coding-agents/blob/f2bc7aec4575418d2d2e83fec078266cc56d3e6a/wsff.md#L481) is particularly relevant: architecture still leaves important choices about types, function boundaries, file organization and execution paths. The [context factor](https://github.com/humanlayer/12-factor-agents/blob/d20c728368bf9c189d6d7aab704744decb6ec0cc/content/factor-03-own-your-context-window.md) supports deliberate context construction, not a claim that a shorter prompt is necessarily better.

The local treatment of the examples is supported by their code: the GenSX [entrypoint](https://github.com/dexhorthy/humanlayer-gensx-example/blob/ea977e3a6abbbe0f56e7dfaff5daff889bb0ddc9/src/index.tsx) differs materially from the [package sketch](https://github.com/dexhorthy/humanlayer-gensx-example/blob/ea977e3a6abbbe0f56e7dfaff5daff889bb0ddc9/pkg/%40gensx/humanlayer.ts). The enterprise [signup implementation](https://github.com/dexhorthy/enterprise-gtm-starter/blob/b2a1108673618f8f7a5d99867600573b2938fd57/src/server/handler_signup.ts) offers a useful test seam, not a context-management system. The supplementary branch remains `659c8712053af68f4ea3457fd138c49ec48e753b`.

## Prioritized findings

P1 means correct before executing the affected high-consequence design or making the affected performance claim. P2 means a material workflow, sequencing or verification improvement. Neither label implies that a deployed system currently has the defect. Line references below describe the reviewed, unchanged files.

### F01 — P1: Make stock eligibility specific to the command

**Evidence:** [data model, stock algorithm](../technical-plan/domain-and-data-model.md#stock-posting-algorithm-and-concurrency), lines 106–114, especially line 112; supplier returns at lines 79 and 169; [traceability](../technical-plan/requirements-traceability.md), CL-09.

The generic algorithm prescribes eligible FEFO selection and an absolute expiry/hold prohibition. Applied literally to every stock command, it prevents supplier dispatch of expired accepted stock and leaves held-stock transfers/corrections ambiguous. Expired inventory must be unavailable for ordinary issue while still represented physically and eligible for an authorized disposition under the selected policy.

**Correction:** add an operation-by-condition matrix covering issue, supplier dispatch, hold/release/transfer, count correction and reversal. Name each capability, evidence requirement, stock layer rule and implementing slice. Do not add a general negative-stock or counter-user expiry override. Return-policy coverage and settlement remain Q-07, not an invented universal rule.

**Acceptance:** extend T03/T09 with paired cases: ordinary issue of expired/held stock fails; authorized dispatch of the same owned stock succeeds with receipt-layer provenance, once, and without inventing credit/payment. Handle rejected-on-arrival custody separately because it was never owned stock. Resolve the common command contract in S02 and implement the relevant issue/return cases in S04/S06.

### F02 — P1: Define closing a period against concurrent posting

**Evidence:** [data model](../technical-plan/domain-and-data-model.md), global lock order at line 110 and closed-period rule at line 135; [implementation plan](../technical-plan/implementation-plan.md), S02 lines 63–67 and T18 at line 214.

Closed-period immutability is required, but the lock protocol has no period/closure coordination. Merely checking that a period is open does not specify what happens if it closes while a posting is in progress. A late commit could change an accepted cutoff.

**Correction in S02:** specify the period state/record, authorized close command, cutoff semantics and serialization protocol, including its position in the global lock order. Every affected posting path must participate. One possible design is a shared period lock for posting and an exclusive lock for closure, with the open-state check under that lock; the implementation must prove the chosen protocol rather than copying this example without review.

**Acceptance:** add two-connection T13/T18 cases for both orderings. Either the post commits before close and is included, or close wins and the post leaves no effects and requires an open period. Exercise timeout/deadlock recovery and combined commands. An accepted cutoff cannot acquire a later journal behind it.

### F03 — P1 for claims: The evaluation does not measure the requested multipliers

**Evidence:** [evaluation plan](evaluation-plan.md), lines 7, 25 and 79 define 3x as accepted tasks per human engineering hour. Its metrics and run fields at lines 13–21 and 65–69 contain no context-efficiency measure.

This is a valid productivity target. It is not a definition of quality. Quality checks are already retained, so the problem is metric meaning, not permission to ship defective work. Neither the source repositories nor this documentation establishes a local 3x/5x result.

**Correction:** retain productivity, add the separate quality/context measures below, and rename claims to the quantity actually measured. Do not multiply subjective reviewer scores or equate an 80% smaller summary with fivefold better context management.

### F04 — P2: Put attachment safety in the first attachment slice

**Evidence:** [implementation plan](../technical-plan/implementation-plan.md), S03 lines 73–75 introduces attachment references; [operations](../technical-plan/operations-and-costs.md), line 57 defers scanner/parser decisions to S10. The acceptance catalogue has no explicit malformed-upload or parser-exhaustion outcome.

**Correction:** if S03 accepts file uploads, deliver its bounded validation, quarantine, restricted access and parsing controls then. Otherwise explicitly leave uploads disabled and support a reference only. A generated preview also requires safely bounded parsing; an image output does not make an unsafe parser safe.

**Acceptance:** test type/byte/page limits, mismatched content/MIME, malformed files, unauthorized direct downloads, quarantine access and parser resource bounds. Include these in S03's criteria, extending the existing test catalogue or explicitly adding a traceable test ID. Recheck salary classification inheritance in S08. This is a sequencing gap in an otherwise detailed security design.

### F05 — P2: Obtain an early operating proof before the whole product exists

**Evidence:** [implementation plan](../technical-plan/implementation-plan.md), S11 lines 165–175 depends on S10; [operations](../technical-plan/operations-and-costs.md), lines 39–45 defines an unmeasured resource envelope. Operations design already starts at S00; an earlier required executed proof is missing.

**Correction:** after S03, run a disposable synthetic deployment in a local VM with the proposed resource limits. Exercise representative stock data, a report, backup, clean restore and one migration. Restore from material independent of the application disk. Record resource peaks and limits, and investigate failures before expanding finance/reporting work.

This checkpoint is partial evidence for implemented behavior, not proof of the final workload, remote storage service, clinic network, PC-off operation or production recovery. Keep S11's complete hosted/resource/recovery gates. Revisit region and quote feasibility before substantial commitment; purchases/deployment still require their existing authorization.

### F06 — P2: Reconcile dependency edges before parallel coding

**Evidence:** [implementation plan](../technical-plan/implementation-plan.md), diagram lines 20–22 versus S06 dependency at line 107 and S07 dependency at line 119.

The graph shows S03 → S06 and S02 → S07, while prose also requires S05 for S06's correction UI and S06 for S07's supplier flows. The current launcher tells agents to read the prose, reducing risk, but two different dependency summaries still invite premature integration claims.

**Correction:** distinguish dependencies needed to start a bounded core task from dependencies needed to complete the milestone. Add the missing completion edges or split those tasks explicitly. Update the context map and any delegated briefs consistently. Parallel work may prepare independent portions; it cannot declare the whole dependent slice complete.

### F07 — P2: Carry program design into the copyable template

**Evidence:** [workflow templates](workflow-templates.md), lines 76–88; [setup proposal](repo-setup-proposal.md), line 98. The [source review](reviews/context-engineering.md), line 19, recognizes concrete program design, but the template does not explicitly ask for key types/signatures or a call path.

Add this small optional block to the existing plan for complex changes:

```text
Code shape:
- New/changed files and their responsibility.
- Key typed command/query signatures and result/error shapes.
- Entry point -> validation -> command -> persistence -> response.
- Transaction/lock owner, permission checks and external-effect boundary.
- One observable slice demonstration and independent failure checks.
```

Do not require a duplicate full specification or this ceremony for a typo/style change. Success is that the implementation and reviewer can identify the important program choices before generating a large patch.

### F08 — P2: Test context freshness and resumption, not just document them

**Evidence:** [setup proposal](repo-setup-proposal.md), lines 96, 100 and 133; [templates](workflow-templates.md), lines 43, 62, 106 and 147–159. Revision references, invalidation triggers and revalidation already exist. The missing piece is an exercised mechanism and measured outcome.

**Correction:** pilot a compact context packet within the existing task records. Include only task-relevant sources/symbols and hashes, governing USER/A/Q/S/T identifiers and status, critical invariants, selected code shape, actual checks/failures and exact next action. Keep full exploration logs outside the packet.

At a slice boundary or interruption, save a checkpoint. On resumption, compare its relevant dependency hashes to current files, inspect changes and refresh affected facts before relying on them. Do not invalidate an entire packet because an unrelated file changed. Hash matching proves unchanged content, not completeness or truth; reviewers still check the retained facts.

**Acceptance:** a fresh session completes E12 with correct state and no invented progress. A deliberately changed contract in a copied synthetic fixture is detected, and its affected assumption is refreshed. Critical invariants, unresolved business rules and failed checks survive compaction. No universal context-window percentage or mandatory new chat is needed.

### F09 — P2: Freeze the actual baseline before evaluating improvements

**Evidence:** [evaluation plan](evaluation-plan.md), lines 29–35; [current launcher](../prompts/coding-task-launcher.md), lines 19–47. Routing, slice selection, authority and meaningful checks are already active guidance, although the application/runtime remains absent.

**Correction:** record an explicit condition matrix and document hashes. Baseline retains the current launcher, authority, source access and ordinary checks. Treatment adds only the newly operationalized packet/checkpoint/code-shape/measurement practices. A routing-versus-no-routing historical comparison must be separately labeled and equally verified. Do not credit already adopted practices to a new treatment or deliberately weaken the baseline.

### F10 — P2: Separate hosting cost, development spending and human effort

**Evidence:** [evaluation plan](evaluation-plan.md), lines 9 and 65–72 already include setup/maintenance/rework but leave `cost_usd` without a provenance or allocation rule. [Operations](../technical-plan/operations-and-costs.md) explicitly excludes development labor and service budgets from hosting.

**Correction:** record known AI/tool/test-infrastructure spending, attribution method and source separately from human minutes and hosting. Use UNKNOWN for unavailable per-task subscription/model charges. A defensible labor rate may support a total-cost estimate; otherwise report known spending and human time side by side. Include every attempt, delegated worker, review, integration, rework and workflow-maintenance cost.

The existing illustrative hosting model is $7.79 against an $8 cap, about $0.21 headroom. That is arithmetic on the saved assumptions, not a newly verified vendor quote. Preserve backup/security/recovery requirements when a budget gate fails; investigate configuration or revisit the proposed solution rather than silently weakening quality.

## A measurable interpretation of the targets

Keep four results separate. No single ratio establishes overall software quality.

| Dimension | Proposed measure | What a multiplier would actually mean |
| --- | --- | --- |
| Quality | Independently evaluated failed acceptance scenarios / evaluated scenarios at the first submitted candidate, reported by task class and severity; separately record escaped defects and follow-up maintenance findings | Baseline failure rate / treatment failure rate >=3 supports a **threefold reduction in that measured failure rate**, not “three times overall quality” |
| Context efficiency | Instrumented task-context payload delivered across all workers per matched accepted outcome, including packet construction, repeated reads, summaries and failed attempts | Baseline / treatment >=5 supports fivefold reduction in the specifically measured payload, only if critical fact coverage, correctness and successful resumption are retained |
| Productivity | Accepted comparable tasks / total human engineering hours, as already defined | Treatment / baseline >=3 supports threefold human productivity |
| Development cost | Known direct spend per accepted outcome; optionally total economic cost with an explicit labor rate and setup/maintenance allocation | A lower measured cost at the required quality gates; do not invent a multiplier or dollar value where telemetry is unavailable |

For context, exact total input tokens, cached input, output tokens, peak context occupancy and billed cost are additional useful measures **only when exposed by the client/provider**. Count all workers. A small parent context can conceal larger aggregate consumption. If only retrieved UTF-8 bytes or characters are observable, label the result “retrieved-payload reduction,” not model tokens, physical context-window capacity or billed usage. Measure retrieval time, repeat reads and fresh-session recovery time separately.

Evaluate equal task classes and completion requirements with prespecified budgets. First-submission defects indicate coding performance; accepted changes still have to pass all required integrity/access checks. Critical stock/money/access/migration failures block that change's rollout regardless of averages. Confirm all critical facts and evidence statuses survive context reduction; a short but wrong answer fails.

Do not compute infinite improvements from zero failures, zero accepted tasks or missing denominators. Report counts, exposure and uncertainty. A small pilot with no observed regression is useful engineering evidence but does not establish statistical noninferiority. For a strong multiplier claim, choose the outcome, stopping rule, sample size and uncertainty analysis before held-out confirmation; the confidence bound must support the stated ratio. “Up to” does not justify selecting only the best run.

### Minimum additions to the existing run record

```text
condition_manifest_hash,packet_hash,source_dependency_hashes,worker_count,
cost_source,cost_attribution,cost_status,
context_measurement_method,retrieved_payload_bytes,repeat_read_count,
input_tokens,cached_input_tokens,output_tokens,
critical_facts_required,critical_facts_correct,stale_fact_count,
resume_success,resume_minutes,
held_out_scenarios,failed_scenarios_by_severity,followup_review_result
```

Use null/UNKNOWN for unavailable values and record the measurement method. Retain the original timing, human effort, retries, actual acceptance evidence and rework fields. For context bytes, instrument retrieval at the source/tool boundary rather than assuming file size equals delivered output. Freeze a tokenizer/version if using tokenized payload estimates, and distinguish those estimates from provider telemetry. Avoid double-counting full logs merely stored on disk; count material actually delivered to workers and separately account for preparation costs.

## Minimal proposed rollout

Treat S00–S12 as milestones, not thirteen giant coding prompts. The following refines execution; it does not silently change their dependencies or authorize application development.

| Step | Bounded result | Completion evidence |
| --- | --- | --- |
| Documentation corrections | Resolve F01/F02/F04/F06 in the governing contracts, plan and test definitions; add the small template and measurement changes | Cross-document consistency and actionable acceptance criteria; preserve evidence/proposal status |
| S00a | Git/ignore/source boundaries, verified workspace identity and recorded design selection | Reproducible baseline; no secrets/generated clutter or lost originals |
| S00b | Pinned supported environment, local PostgreSQL, configuration and migration ownership | Clean environment can start; real pins and actual commands recorded |
| S00c | One documented scoped verification entry point and matching CI where available | Actual successful lint/type/migration/behavior checks; explicit effectful-test boundaries; failure exits propagate |
| S01 | Named access, capabilities and exact-unit catalogue | Required T cases and recovery examples with synthetic accounts; human review where already required by the plan |
| Bounded S02 tasks | Command/idempotency contract; inventory integrity; monetary integrity/period close; worker recovery | Separate inspectable changes with transaction/lock ownership and real PostgreSQL tests; one integration owner |
| S03 | Complete receipt workflow, safe references/uploads as selected, observable failure/retry states | T01–T03/T05/T13, direct-request permissions and meaningful browser checks pass |
| Early operating checkpoint | Synthetic constrained-VM run, backup, clean restore and migration | Measured partial evidence and failures recorded; final S11 remains required |
| Workflow pilot | Compare current workflow with the minimal additions | Quality/context/cost records; retain only useful process |
| S04–S12 | Continue existing business milestones with corrected completion dependencies | Full affected criteria, final operating proof and separately authorized clinic pilot/cutover |

S00c cannot demonstrate business behaviors that do not exist yet; subsequent slices add their tests to the same verified entry point. Do not create empty passing checks and call the acceptance catalogue implemented. A document link check likewise does not prove that prose invariants hold in code.

Start with one implementer and a bounded reviewer for consequential work. Delegate independent source/permission/concurrency investigations where useful, and measure the total cost. A reviewer should derive counterexamples from the contract and inspect the code/tests, not merely endorse the author's explanation. Automated review remains distinct from the maintainer and clinic acceptance already required by the plan.

### Cheap first experiments

**Before an application exists:** run six bounded documentation/context cases covering receipt, count/correction, supplier settlement, restricted payroll, interrupted work and a changed-contract resume. An independent evaluator first records required facts and evidence status. Compare current routing to compact packets in fresh sessions with identical source access. Use copies for deliberate stale-contract fixtures, preserving authoritative files. This tests retrieval and resumption only, not production application quality.

**After S00–S03 work:** use six matched coding task pairs, twelve independent runs, covering validation, duplicate/changed-payload handling, rollback, direct-request permission, uncertain-response UI and resumption. All prerequisites and acceptance contracts must exist first. Use isolated identical-base checkouts, fixed model/settings/tools/budgets, randomized conditions, independent acceptance and held-out checks. Retain failures and setup costs. These are feasibility runs, not a statistically justified proof of 3x/5x.

If the pilot helps, expand using its observed variance and bottlenecks. If a component consumes more effort without improving outcomes, remove it. Do not wait for the complete payroll/reporting product to find out whether the coding workflow helps.

## Recommendation for production quality at low cost

Keep the proposed modular monolith, explicit stock/finance command boundaries, exact arithmetic, immutable effects, restricted salaries and independent recovery. This review provides no new evidence requiring architecture replacement. Maintain the bounded ERP comparison as a conditional option, not a second product build.

The next useful investment is the targeted specification corrections plus a reproducible S00–S03 delivery path. Evaluate the workflow on real accepted changes, then expand. Do not add HumanLayer, GenSX, Kubernetes, an always-running agent service, a large memory platform or paid observability solely to imitate these repositories. Use cheaper/faster models for bounded work only after local acceptance evidence shows they preserve the required quality; this review did not benchmark any model.

The plan can guide a production application after these corrections and executed gates. The documents themselves cannot demonstrate that outcome or guarantee the requested multipliers.
