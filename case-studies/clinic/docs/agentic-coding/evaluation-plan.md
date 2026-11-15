# Evaluation protocol for quality, context, productivity and cost

Updated: 2 October 2026. W05's measurement specification and [run schema](evaluation-run.schema.json) are implemented. The [operating guide](workflow-implementation.md) records performed synthetic mechanism checks separately from unrun fresh-agent/coding experiments. The folder does not contain the clinic application or its acceptance suite. No measured 3x/5x claim is established.

Later measurement research, 1 October 2026: [WF-02](../tasks/workflow-rollout/task.md) completed the bounded real-agent feasibility trial. Its records preserve unavailable resource metrics. The user's next request led to [measurement research](measurement-research.md) and a [proposed collection/analysis system](measurement-system-design.md). The current v1 schema is a partial record contract; it does not collect telemetry or reconcile all evidence. Unknown count representation, timing consistency, per-worker acquisition and comparison eligibility need the [new implementation slices](measurement-implementation-plan.md). Historical records remain unchanged and no improvement ratio is established.

Extensive research amendment, 2 October 2026: [WF-04](measurement-research-expansion/README.md) adds GQM/measurement/evaluation standards, calibrated oracles, deeper native-tool inspection and qualification requirements. Use comparable **assigned** eligible workloads for the primary comparison; retain failures and unknowns, rather than filtering to common accepted tasks after assignment. A quality-preservation claim needs a prespecified margin and adequate precision. No assertions, missing fields normalized to zero and replay-only cost are not acceptance/resource evidence. Tool acquisition and the evaluators themselves require [G0-G8 validation](measurement-research-expansion/trust-and-validation.md).

## Define the claim before measuring

The primary productivity measure is **accepted tasks / human engineering hours**. Sum active human minutes spent planning, preparing condition-specific setup, supervising, reviewing, integrating, and reworking every attempt, then divide by 60. Sum person-minutes across people; one person's overlapping activities count once. Passive time awaiting an agent belongs to elapsed delivery time rather than active human effort. The comparison is the treatment rate divided by the baseline rate. Do not discard failed attempts or replace them with successful retries without counting their effort.

This measures human productivity, not a blended human-plus-compute resource rate. No conversion equating a machine minute to a person-minute is assumed. Separately require a declared elapsed-time and compute-cost bound so an apparent human-hour gain cannot conceal unacceptable delay or extra spending. Record condition-specific setup and recurring workflow maintenance; report both the full pilot cost and any explicitly declared amortized steady-state estimate.

Record these dimensions separately:

| Measure | Why it matters |
| --- | --- |
| Accepted-task throughput | Main target: useful completed work rather than generated code volume |
| End-to-end elapsed delivery time | The user's actual wait, including failures, integration, and required reviews |
| Human active minutes | Supervision and review burden; distinct from autonomous runtime |
| Agent/tool minutes and monetary cost | Whether a gain merely spends more compute or requires more agents |
| First-attempt acceptance rate | Recovery effort hidden by final pass/fail |
| Escaped defects and later rework | Speed that creates maintenance debt is not a comparable gain |
| Maintainability assessment | Whether another maintainer can explain and safely change the result |

Parallel work changes elapsed time differently from labor and compute. For a batch, elapsed time runs from its declared start to its last acceptance/stopping point; overlapping task intervals count once. For individual-task latency, use each task's start/end. Agent runtime is summed per worker, including its tool execution; do not add nested tool duration a second time to the same worker interval, and exclude a parent's idle wait for a child whose runtime is separately counted. Human person-minutes, elapsed time, and agent minutes are three separate totals. Use the same rules for both conditions.

For the primary ratio, divide each condition's accepted tasks by its total human engineering hours, then divide treatment throughput by baseline throughput. Both human-time denominators must be complete and positive and acceptance known. A known zero treatment acceptance yields zero throughput and a zero observed ratio when baseline throughput is positive. Zero baseline throughput makes the ratio undefined; unknown/zero human effort also prevents it. Input/cost per accepted outcome is undefined when its accepted count is zero. For a prespecified comparable assigned workload completed within the declared quality/budget policy, baseline batch elapsed time divided by treatment batch elapsed time can be a secondary delivery-speed ratio. Otherwise report completion, time-to-stop and descriptive completer latency; do not choose a favorable successful subset after assignment. Label which ratio reaches 3x; a human productivity gain does not automatically establish a delivery-speed gain. A treatment that accepts fewer tasks must not get a speed credit by dropping the difficult ones.

## Baseline and treatment

Freeze the **actual current baseline** before a comparison: exact launcher/instruction/document hashes, task prerequisites, check suite, model/settings/toolset, limits and acceptance. The baseline already includes source authority, task routing, proportional program design, vertical slices and meaningful verification. Retain these rather than attributing them to a new treatment or deliberately omitting necessary tests. The implementation task's before-change manifest freezes the documentary starting point; a future experiment needs its own condition manifest at its actual base.

The treatment adds only newly implemented mechanisms: conditional code-shape/boundary fields, one current-state index, compact dependency-tracked projections, freshness/resume checks and explicit measurement records. Start with the smallest package. Use ablations on separate matched tasks: conditional fields; then compact checkpoint/resume; then any separately authorized review/delegation. Do not change the model or add parallel compute as part of the same treatment without declaring a different condition. More process is a hypothesis, not an automatic advantage.

Hold constant model/version, reasoning settings, task instructions, base application revision, tool availability, dependencies, acceptance suite, permission policy, time/token/retry limits, machine/resources, and eligible external context. Record unavoidable differences rather than silently changing them.

Use fresh isolated checkouts from the same base revision. Never run the second condition against code already fixed by the first. Use separate sessions without answer/trace contamination. Randomize task/condition order, reserve held-out tasks, and have acceptance assessed independently with the condition hidden where practical. If human familiarity can carry solutions between conditions, use matched task variants or rotate reviewers and record the residual limitation.

## Candidate task set

These are **synthetic future evaluation candidates**, not approved application features or already-defined clinic policies. Finalize acceptance against the selected architecture and authorized scope. A candidate is eligible only when its prerequisite implementation and contract exist. Use a mix of simple, medium, and difficult tasks so a result is not dominated by one easy class.

| ID | Candidate | Independent acceptance signal |
| --- | --- | --- |
| E01 | Correct a receipt validation defect | Valid/invalid cases behave according to contract; unrelated workflow remains intact |
| E02 | Prevent duplicate receipt posting | Same request twice produces one posting/stock effect |
| E03 | Protect the last stock unit under concurrent issue | Selected stock policy holds under simultaneous requests; no partial records |
| E04 | Handle a count with intervening movements | Result follows the selected count/snapshot rule and preserves audit context |
| E05 | Separate supplier return from credit settlement | Returning stock does not automatically invent a settled credit |
| E06 | Correct partial supplier-payment allocation | Balance and payment allocation follow contract with exact money handling |
| E07 | Prevent salary-report access through a direct request | Server authorization holds independently of hidden UI controls |
| E08 | Prevent payroll/expense double counting | Defined expense and cash reports have exactly the intended inclusion behavior |
| E09 | Recover from an uncertain posting response | User can determine outcome without creating a duplicate |
| E10 | Apply a backward-compatible data migration | Existing fixture data and behavior preserved; selected rollback/recovery demonstrated |
| E11 | Change a small report or interface behavior | Concrete acceptance met without unnecessary architecture/process expansion |
| E12 | Resume a multi-step task after an interruption | Fresh session completes from the handoff and current code without inventing progress |

Use the existing proposed acceptance catalogue: E02/E09 map to T05; E03 to T04; E04 to T06; E05 to T09; E06 to T08; E07 to T12; E08 to T11; E10 to T16; E11 to affected T18/T19 checks. E01 uses the relevant receipt T01/T02/T03 checks; E12 evaluates development handoffs rather than inventing a product test. SYN-01 supplies independent arithmetic examples. These mappings become eligible only when the corresponding application behavior exists.

Acceptance tests must check behavior and integrity rather than reproduce the implementation. Include negative cases and independent test fixtures. A domain policy that remains unknown must first become an explicitly selected test contract; an evaluator cannot invent the expected business answer after seeing generated code.

## Run record

Use one JSON record per attempt/checkpoint conforming to [evaluation-run.schema.json](evaluation-run.schema.json). Required fields retain unavailable telemetry as null, not invented zeros. The validator checks shape/accounting constraints; acceptance still requires actual evidence and independent evaluation. CSV summaries may project these fields:

```text
run_id,task_id,task_class,condition,order,base_commit,model,model_settings,
harness_version,toolset,environment_id,started_at,ended_at,elapsed_minutes,
human_active_minutes,human_engineering_hours,agent_tool_minutes,cost_usd,attempt_count,
accepted,first_attempt_accepted,acceptance_evidence,reviewer_type,
blocking_findings,maintainability_result,rework_minutes,escaped_defects,notes
```

The JSON schema additionally requires the frozen condition/harness, packet/dependency hashes, worker count, measurement method, delivered bytes/provider tokens, critical-fact coverage/staleness, cost source/attribution/status, resume kind/outcome, held-out/failed scenarios by severity and follow-up result. `maintainability_result` may be recorded in `followup_review_result`; do not silently interpret missing review as success. A fresh subprocess is `fresh_process`, never `fresh_agent`.

Derive human_engineering_hours as human_active_minutes / 60. Rework minutes are a labeled subset of the recorded activity, not a second amount to add to the denominator. Keep timestamps in a declared timezone or UTC and present user-facing dates in America/Los_Angeles. Save logs/artifact revisions for reproducibility, with secrets and sensitive records excluded. Record a check's exit status and actual result. An agent's statement that it passed is not acceptance evidence.

For per-attempt/checkpoint exports, `attempt_count` is the cumulative attempt ordinal for that task/condition/phase. Aggregate unique attempt IDs rather than summing successive counters, and exclude explicitly superseded exports. A trajectory's accepted stages and accepted whole tasks are distinct units. The [WF-02 run index](../tasks/workflow-rollout/evidence/run-record-index.json) demonstrates six successful contract stages plus two environment-interrupted dispatches without treating eight records as eight accepted tasks.

## Pilot and confirmation

1. Run a small feasibility pilot on approximately 8-12 eligible tasks or matched variants. This is an engineering proposal, not a statistically justified sample size. Use it to debug measurement, estimate variance, and identify unnecessary process.
2. Set a confirmatory task set, stopping rule, failure/retry budget, quality tolerances, and uncertainty method before evaluating held-out work. Choose sample size using pilot variance and desired confidence. Repeated independent runs may be needed because model outcomes vary.
3. Report per-class counts, acceptance, total/median time, human effort, cost, rework, and individual failures. Report the overall ratio with uncertainty; do not hide classes that worsen.
4. A strong **at least 3x** claim requires a prespecified uncertainty analysis whose lower bound supports 3x, comparable task completion, and quality/maintainability within the agreed tolerances. A point estimate above 3x in a small pilot is preliminary evidence only.

Critical stock/money/permission corruption is a release blocker regardless of a favorable time ratio. Define acceptable noncritical defect/rework tolerances before the run, not after. Follow accepted changes for a declared rework window, such as seven days or an equivalent review/change exercise when no real deployment occurs. Label a synthetic exercise clearly.

## How 3x could happen, and where it cannot

Illustrative delivery-time arithmetic: if a sequential baseline task consumes 20 elapsed minutes finding context, 25 implementing, 35 recovering from a poor initial design, and 10 reviewing, total latency is 90 minutes. A treatment that reduces those to 5, 12, 5, and 8 totals 30 minutes: a 3x delivery-speed ratio at identical acceptance. Human active minutes would need separate measurement to calculate the primary human-productivity ratio. These values are hypothetical, not results from the repositories or this folder.

The mechanism is avoiding wrong assumptions, repeated discovery, bad design, and rework. If the current workflow already spends most of its time on necessary implementation and effective review, a 3x total gain may be impossible without changing task scope, tools, or model capability. For example, reducing a 20% avoidable component to zero yields at most 1.25x overall under unchanged remaining work. This is a reason to measure bottlenecks before adding elaborate process.

The outcome may be 3x, smaller improvement, or a slowdown for small tasks. Keep the practices that measurably help and remove the rest. No evidence in this task establishes a local multiplier yet.

## Quality, context and cost

Declare one primary outcome and denominator for each claim before execution. Quality is evaluated through independent acceptance scenarios and severity, first-attempt acceptance, escaped regressions and follow-up maintainability. A baseline failure rate divided by treatment failure rate can support a specifically named defect-rate reduction; it cannot mean threefold overall quality. Critical stock/money/access/migration failures block the affected change regardless of averages. Report exposures and uncertainty; zero failures or missing denominators do not create infinite improvements.

For context, prefer total provider input tokens across every worker/call per accepted comparable outcome, including cached input, packet preparation, rereads, failed attempts and summaries. Track output/cached costs separately. Where telemetry is unavailable, use **delivered UTF-8 payload bytes**, instrumented where content is delivered to the reader. Do not substitute file size, characters or a small parent packet for total model usage. Stored full logs are not delivered payload until read; packet preparation reads count. A 5x claim needs comparable accepted outcomes, preserved decisive facts, successful fresh-session resumption and a confidence bound supporting the declared measure.

Before a context run, freeze an evaluator's required facts/statuses: governing constraint, affected unknown, current revision, unresolved failure and exact next action. Deliberately mutate a relevant contract in a disposable fixture and verify detection/refresh. Changing an unrelated file must not force indiscriminate rereading. Hash equality only proves unchanged content. Loss of a decisive fact fails the context-quality gate even if the packet is smaller.

Report known model/tool/test-infrastructure spend per accepted outcome and for the whole experiment. Record source/date, cached/uncached/output usage, allocation method and every worker/attempt. Human effort is separate unless a declared labor rate supports an explicit economic estimate. Unavailable subscription/per-task/model charges are null/UNKNOWN; zero is reserved for an actually measured zero. The USD 8/month clinic hosting cap is a separate operating constraint. Include setup, maintenance, review, coordination, escalation and repair in the declared allocation.

## Iterative change and instruction regression

Add an eligible trajectory consisting of an initial task plus two later undisclosed changes. Each condition keeps its own generated workspace; retain earlier acceptance cases and record inherited regressions separately from current-feature failures. Do not replace it with a reference solution or disclose future requests to the implementer. Keep model/settings/tools/budgets constant; separate evaluator holdouts from visible developer tests.

Additional candidates: E13 iterative follow-up trajectory; E14 adapter denial/error/partial-success propagation; E15 option-to-consumer configuration changes; E16 changed workflow instruction with routing/resume regression. They become eligible only when their code/contracts exist. Every step has task/source hashes, attempt effort, first/final acceptance and an explicit follow-up review. No generated expected output is an evaluator oracle.

The six D01-D06 cases in [the mechanism pilot manifest](../../tests/workflow/pilot-cases.json) predeclare receipt, count, supplier settlement, restricted salary context, interrupted work and freshness expectations. Local automation can check projection/freshness behavior, missing facts and reconstruction in a fresh process now. This is an engineering mechanism test with constructed packets, not a test of LLM judgment, independent human acceptance, actual clinic behavior or a fresh-agent performance comparison.

Fresh-agent trials require isolated sessions with identical eligible evidence and predeclared evaluator facts. Treat the treatment handoff as an explicit condition input and preserve every retrieval/call/worker cost. The initial documentation pilot can precede clinic code; coding/adapter/configuration trajectories wait for executable prerequisites. Prespecify confirmatory stopping rules, tolerances and uncertainty using pilot variance. Do not credit the deterministic mechanism pilot with 3x/5x gains or general noninferiority.
