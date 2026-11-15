# Proposed implementation plan for measurement

Date: 1 October 2026; amended 2 and 5 October. Status: **first task boundary selected in the authorized planning consolidation; H00/M00-M06 are not implemented**. Reuse [the system design](measurement-system-design.md) and [research evidence](measurement-research.md). This is development-workflow measurement, separate from clinic S00-S12 implementation and deployment. No new coding-performance trial, account changes, installs or purchases are included in the completed research.

Research amendment, 2 October 2026: [WF-04](measurement-research-expansion/README.md) expands the evidence with three research agents. Its adoption decisions and [G0-G8 qualification gates](measurement-research-expansion/trust-and-validation.md) supplement the slices below. The proposal now begins with existing-tool qualification and measurement/oracle contracts; new custom code is limited to demonstrated gaps. No new coding benchmark, collector or platform has been implemented by either research stage.

## Bounded slices and acceptance

| Slice | Concrete deliverable | Dependencies | Acceptance before claiming completion |
| --- | --- | --- | --- |
| H00: maintained-tool qualification | Pin the selected native Codex evaluator/provider; map fields/artifacts to the measurement contract; check route-specific gaps before duplicating a runner | Prepared M00 contracts; WF-04 tools/source review; available local runtime and reviewed fixture scope | Offline reference fixtures distinguish no assertions, zero tests, absent usage, replay cost, estimates and original spend; SDK thread/trajectory isolation and tracing behavior preserved; export can be independently rebuilt. Include malformed records, reopened-step duplicate counters, missing children and partial conversion. Live claims still wait for M03 |
| M00: identity, policy and versioned contracts | Decision/question/metric/estimand and oracle contracts; experiment/task/stage/attempt/worker/call IDs; metric status/provenance; raw-data scope/retention/export rules; v1 compatibility annotation | Current schema/export audit, WF-04 validity requirements and design | Independent reference arithmetic and correct/defective/ambiguous labels have recorded provenance; assertion requirements are visible; unknown counts remain null; historical exports retain original bytes; stage/task counting unambiguous; sanitized fixture has no credentials or sensitive source content |
| M01: offline normalization and reconciliation | Reuse qualified native exports/adapters; add only missing pure normalization/reconciliation for pinned synthetic fixtures; immutable normalized events; correction/dedup logic | M00 and relevant H00 fit results | Same fixture imported twice is unchanged; last/total/duplicate sources not double counted; fork/reset/out-of-order/truncated cases become correct or explicitly partial; unsupported format reported; native records and expected workers reconcile independently of delivered span totals |
| M02: local outcome and activity acquisition | Actual command-result/artifact recorder; acceptance binding; minimal human interval entries; source coverage tracking | M00-M01 | Real passing/failing/zero-test/collection-error probes distinguished; artifact drift detected; overlaps don't inflate person-minutes; unresolved evidence cannot become acceptance |
| M03: live client calibration | One selected authorized acquisition route, version pin and real completion/failure/resume/counter-boundary checks | M01-M02; explicit scope/budget for new model runs | Exact session/worker identities; source-reported usage reconciles against a second source where available, with shared-upstream independence limits; capture qualification does not imply independently validated billing/resource truth; partial failures retained; no unrelated-chat capture; live availability/unknown cost reported honestly |
| M04: offline metrics and reports | Deterministic derived totals, class/task report, missingness/claim eligibility, optional rebuildable query index | M00-M03 for live metrics; synthetic arithmetic can precede M03 | Golden independent arithmetic fixtures for overlapping work, failed attempts, incomplete cost, zero denominators and mixed classes; same sealed inputs reproduce same report; no provider call needed to analyze |
| M05: feasibility on representative tasks | Predeclared eligible tasks, smallest treatment, frozen evaluators, bounded retries, independent review and variance/overhead report | M03-M04; actual task prerequisites; agent/reviewer authorization where relevant | All assignments/attempts retained; resource coverage supports selected metric; no future-answer leakage; prior cases retained; descriptive outcomes/limits and retain/change/drop decision |
| M06: confirmation and ongoing learning | Separate held-out protocol; sample/stopping/uncertainty decisions; operational observation and periodic regression review | Pilot information and selected useful mechanism | Claim-specific confidence/quality conditions satisfied or claim withheld; known task/model/client drift; rework observation window and review disagreements visible |

M00-M02 and synthetic M04 validation can be built without paying for model calls or accessing raw chats. A full automatic measurement system is not complete until a selected live adapter and resulting reports are calibrated. Do not substitute a replay-only parser demonstration for M03. M05 is not automatically authorized by permission for the earlier two-agent trial; the new run's scope and resource budget need to be explicit when requested.

H00 is a proposed compatibility exercise, not an installed command. Prefer Promptfoo's native providers for bounded controlled evaluations if the pinned release qualifies. Separately qualify maintained Langfuse/Phoenix Codex adapters only for the scope each actually observes. Langfuse's inspected plugin has interruption/child reconstruction, with scope and content-capture limits; Phoenix's completed-turn notify capture does not establish interrupted-attempt or all-child coverage. Hosted observability, broad global capture and additional platforms remain conditional. Record a failed fit and use the owned CLI/reference route if required; do not lower integrity gates to make a selected product appear sufficient.

## Proposed code shape for a later implementation task

Keep new functionality separate from existing checkpoint/document mechanics:

The paths below remain a possible decomposition, not a mandate to build a second general evaluation framework. H00 determines which responsibilities a maintained tool already provides. Keep only needed field-presence/provenance, task/worker/time accounting, outcome binding and claim-eligibility glue; prefer tool exports and established test/statistics libraries where their semantics qualify. Application tests enter only when executable prerequisites exist.

| Proposed module | Responsibility |
| --- | --- |
| `tools/workflow_measurement/contracts.py` | Validate versioned identity, status, provenance, units and manifest relations |
| `tools/workflow_measurement/adapters/` | Decode pinned input formats; expose observations/coverage without policy guesses |
| `tools/workflow_measurement/ledger.py` | Per-writer streams, event identity, corrections, sealed artifact references and deterministic projection |
| `tools/workflow_measurement/accounting.py` | Interval unions, scoped usage/cost reconciliation and complete/partial/null results |
| `tools/workflow_measurement/evaluation.py` | Bind frozen artifact/check/review outcomes; distinct evaluator failure and task outcome |
| `tools/workflow_measurement/analysis.py` | Class/task aggregates, comparison eligibility and declared statistical method |
| `tools/workflow_measurement/reporting.py` | Offline human-readable report plus auditable machine-readable summary |
| `tools/workflow_measurement.py` | Thin explicit CLI; no hidden model invocation during import/analysis/reporting |
| `tests/workflow_measurement/` | Independent fixtures for parser/accounting/evaluation behavior and corruption cases |

These paths are a proposed decomposition, not files already present. Keep only modules justified by the first bounded implementation. Candidate commands are import, validate, record-check/activity, seal, summarize and compare; names/options belong to the implementation design review. They are not entries in the verified command catalogue today.

## First implementation task to make concrete

**Canonical scope, selected 5 October 2026: M00 plus one H00 offline fit result.** This section owns the detailed first-task deliverables and stopping boundary. [WF-04 task](../tasks/workflow-measurement-expansion/task.md#next-action) owns continuation state; the [workflow execution plan](../tasks/documentation-red-team/plan.md) supplies the surrounding repair order. The earlier instruction to implement M01 and M04 in this first task is superseded; its exact prior wording is preserved in [the planning snapshot](../tasks/documentation-red-team/evidence/planning-before-001.json).

Required deliverables:

1. **One versioned M00 contract bundle.** Define decision/question/metric and intended scope; experiment/task/stage/attempt/worker/call/evaluation/artifact identity; source presence, provenance, units and participant/counter coverage; the existing five metric statuses; separate human active time, worker occupancy and wall latency; artifact-bound outcomes and invalid evaluations; genuine repair history versus erroneous-export correction; legacy compatibility annotations; raw-data scope, sanitization, retention/export and claim eligibility. Keep RT-03/RT-06 semantics explicit. Existing raw records retain their bytes.
2. **Independently established sanitized reference fixtures.** Record provenance for expected arithmetic and correct/defective/ambiguous labels before evaluating an implementation. Include a parent, child, failed dispatch, retry and stopped task; cumulative/duplicate/reopened counters, cached-input subsets, missing children/reviewer, observed zero versus unavailable/partial/estimated values, overlapping human intervals and nested wall spans. Include critical fail-then-repair, stale/nested artifact mismatch, absent assertions, zero tests, collection errors, invalid references, malformed records and partial conversion. Retain both actual failed and repaired attempts/resources; correcting an export must count its underlying work once. No-assertion defaults, absent-to-zero coercion and replay-zero cost fail their relevant claim gates.
3. **One pinned H00 offline fit result.** Select one already-researched maintained provider/export for the task and record version/configuration. Map its native fields/artifacts to M00, exercise the available sanitized exports/replay fixtures, and classify each requirement as **met**, **not met** or **untestable**. Separate inspected/source evidence, executed offline evidence and untested live behavior. Thread/persistence/isolation claims extend only as far as the offline evidence supports. Identify demonstrated gaps and the next justified slice. A failed fit is a legitimate completed qualification result.

Small offline arithmetic or export demonstrations needed to qualify these contracts are in scope. **Stop** when the contracts, independent references and one reviewed fit result agree, missing responsibilities are explicit, historical sources are preserved and the task/synthesis/plan point to this same boundary. Do not add a general runner to make a provider appear sufficient or weaken requirements to obtain a pass.

**Deferred:** reusable M01 normalization/reconciliation, M02 ongoing acquisition, M04 reporting/analysis infrastructure, M03 live completion/failure/resume calibration, M05/M06 comparisons, hosted services/global capture and new model calls. Independent arithmetic is required evidence here; it is not the deferred production reporting system. Future implementation glue is selected from the observed fit gaps.

Prerequisites are conditional on actual reliance: RT-01/02 must be repaired or excluded before their verifier/oracle supplies trusted acceptance; RT-03/06's corrected semantics must be present in contracts/reference fixtures, and their existing implementations cannot be trusted while defective. RT-04/05 govern committed-candidate/probe claims, not contract drafting. RT-07/09 apply to the selected launcher/link route. G0/G1 and applicable offline G3/G4/G6 evidence govern this bounded task; live capture, judge calibration, comparisons and operational burden remain later evidence under the relevant gates. An unavailable pinned offline runtime/export limits the H00 result to inspected or untestable items; it does not establish an executed fit.

## Independent acceptance examples

The following are **synthetic acceptance fixtures**, not research findings, historical run corrections or clinic facts:

- A cumulative input counter reads 100, 150, 150, 220 after an observed zero start. Total is 220, not 620. If the first observed boundary is already 100 and earlier consumption is unknown, describe coverage before deriving an interval delta.
- Last input 70 and cumulative input 220 describe different scopes; do not sum them to 290. Cached input 50 belongs within its declared input total, not an additional 50 tokens.
- Two known worker input totals of 200 and 300, plus an unobserved reviewer, yield observed 500 with partial delivery coverage. Do not declare total delivery input 500 or compute a 5x claim.
- Two overlapping active intervals for one person, 10:00-10:10 and 10:05-10:15, contribute 15 person-minutes. A second person's independent five minutes makes 20. Rework within an interval is not added again.
- Parent occupancy 20 minutes containing a 10-minute tool span stays 20 minutes occupancy. Two concurrent workers' occupancy is separate from the batch's wall span; neither is inferred human effort.
- A completed task and a failed task each consume 100 units. Accepted-task resource is 200 per one acceptance, with one of two assigned tasks accepted. Success-only filtering must not report 100 as full delivery cost.
- A successful code artifact with unknown human effort remains accepted, but human-productivity comparison is unavailable. Unknown repeated reads and unobserved escaped defects remain null.
- A command exits zero but runs zero tests. Its process success does not establish test acceptance. A frozen result whose code hash differs from final code is stale evidence.
- Two trajectories with three accepted stages each count as two whole tasks and six stage milestones. Repeated prior-case execution is not independent statistical evidence.
- An account-limit interruption changes dispatch-first-attempt reliability and user wait. It is distinct from an implementation-caused failing test and does not become assumed compute time.

Derive fixture expectations independently of the new code and retain fail-before/pass-after proof where relevant. A parser that passes its own mirrored examples is inadequate evidence for true accounting.

## Integration and preservation

Leave authoritative clinic sources, archive, technical plan and WF-01/WF-02 evidence unchanged. Add new task-ledger links and dated working-document updates. Introduce any new schema as versioned; do not make historical evidence disappear because it cannot meet a later telemetry contract. Import annotations explain missingness and supersession.

Application checks enter the measurement system when their S00-S12 implementations and contract/test prerequisites exist. The collector must not choose unresolved clinic policies or operate on production records. A development collector on the user's machine does not make the production clinic app depend on that PC.

Before live acquisition, decide exactly which task/session streams are in scope and where detailed evidence is stored. Verify child/reviewer inclusion and supported client behavior. Before shared hosting or paid tooling, make the selected setup, operating cost and data exposure reviewable under the user's actual authorization. Research recommendations alone do not authorize external services.

## Completion language for later tasks

Use precise milestones: contracts/parser implemented; offline accounting verified; selected live adapter calibrated; operational collection running; feasibility experiment performed; confirmatory improvement supported or unsupported. Do not describe the first three as proof of workflow gains. If a metric remains unavailable, show that in the report rather than declaring everything measured.
