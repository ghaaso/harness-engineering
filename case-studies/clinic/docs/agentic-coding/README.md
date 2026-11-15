# Coding workflow: start here

Navigation updated 5 October 2026. This is the entry point for **coding-workflow improvement and workflow-measurement research**. The library below preserves the research; it is not an initial reading assignment. [Project instructions](../../AGENTS.md) govern scope and authority.

The requested four-repository reassessment is recorded in its [canonical task](../tasks/upstream-workflow-reassessment/task.md) and [integrated disposition](reviews/upstream-2026-10-04/README.md). It clarifies scoped instruction files, whole-workflow measurement and comparison/ROI limits. For that review's continuation, read its state first. For a defect repair, use the route below; no RT finding was closed by source research.

The [lean-workflow proposal research](../tasks/lean-workflow-reassessment/task.md) connects the submitted one-file/no-docs proposal to these documents and current primary sources. The user's clarification makes the goal two connected views: a full understandable [human view with diagrams](../human/README.md) and compact task-specific agent context, sharing maintained facts and evidence. Test human presentation first with agent routing held constant, then route/record overhead separately. The human page is for explanation and view maintenance; it is not a routine prerequisite for every worker. That research adopted no documentation ban, client setting, measurement pipeline or code repair; ordinary repair continuation uses the route below.

The user-authorized [execution plan](../tasks/documentation-red-team/plan.md) now consolidates repair order, actual dependencies, both-audience completion criteria and the precise first RT-01 coding task. Use the selected task section rather than rereading the whole research library. The human view is used during repairs immediately; the presentation-first ordering above concerns controlled comparisons. The measurement first-task wording has been reconciled to one scope owner below.

Build orchestration (adopted 2 November 2026): the [orchestration rules](orchestration.md) and the [wave board](../tasks/clinic-build/task.md) govern parallel slice sessions, model tiers, the session tree and merge gates for the clinic build. They are not part of the workflow-repair route below.

## Resume route

1. Read the [current task's current state](../tasks/documentation-red-team/task.md#current-state) and [next action](../tasks/documentation-red-team/task.md#next-action). They identify completed work, open work and the recommended next bounded task. The [compact handoff](../tasks/documentation-red-team/context.md) includes a reusable continuation prompt and freshness check.
2. Select **one** authorized finding in the table below. Read its complete entry, including reproduction, corrected remedy and closure criteria, the selected task section of the [execution plan](../tasks/documentation-red-team/plan.md), then the mapped code/contracts and relevant checks. The follow-up research is already incorporated into those entries. Open its [disposition](../tasks/documentation-red-team/research-follow-up.md) when a remedy's rationale is in question.
3. Inspect actual files and local changes; validate the declared handoff dependencies. Use the [command catalogue](command-catalogue.md) for executable checks and their limits. Expand reading only when a changed dependency, cross-cutting contract or unresolved question requires it. For a substantial implementation task, use the [operating guide](workflow-implementation.md) and relevant [template sections](workflow-templates.md) to create its own task record before changes.

For a new full audit, use the [coverage ledger](../tasks/documentation-red-team/coverage.md) and [review report](../tasks/documentation-red-team/report.md) to establish scope and changes since the reviewed baseline. A continuation of one finding does not require repeating the full audit. For a specifically authorized measurement slice, use the measurement route below.

## Read only the row for the selected finding

The register owns each finding's evidence and closure criteria. Paths below locate implementation surfaces; they are not assertions that fixes exist. Read adjacent callers and affected contracts when inspecting code. Reproduction records are linked from each finding; open the named result rather than dumping every evidence file into context.

| Finding | Start after reading its register entry |
| --- | --- |
| [RT-01: skipped tests pass](../tasks/documentation-red-team/defects.md#rt-01--p1--verification-succeeds-when-every-test-is-skipped) | [Verifier](../../tools/coding_workflow.py), `verify` branch; [workflow tests](../../tests/workflow/test_coding_workflow.py); catalogue's `verify` contract. |
| [RT-02: optimized oracle](../tasks/documentation-red-team/defects.md#rt-02--p1--optimization-disables-decisive-oracle-checks) | [Trial oracle](../../tests/workflow/agent_trial_oracle.py); finding's normal/optimized faulty-artifact evidence. |
| [RT-03: contradictory acceptance](../tasks/documentation-red-team/defects.md#rt-03--p1--acceptance-and-a-critical-failure-can-coexist-in-one-valid-record) | Verifier's `validate_run`; [run schema](evaluation-run.schema.json); [evaluation protocol](evaluation-plan.md) acceptance/supersession rules; [design](measurement-system-design.md) artifact binding. |
| [RT-04: unchecked staged bytes](../tasks/documentation-red-team/defects.md#rt-04--p2--hook-checks-different-bytes-from-those-being-committed) | [Commit hook](../../tools/git-hooks/pre-commit), [Git verification utility](../../tools/verify_git_foundations.py), catalogue's Git section and the two staged-content probes linked in the finding. |
| [RT-05: contaminated negative checks](../tasks/documentation-red-team/defects.md#rt-05--p2--git-verification-negative-controls-depend-on-ambient-configuration) | Git verification utility, hook interpreter selection and finding's paired environment results. |
| [RT-06: missingness and time](../tasks/documentation-red-team/defects.md#rt-06--p2--legacy-observation-fields-can-become-invented-zeros-or-double-counted-time) | Run schema, evaluation protocol, design's legacy-import rules and finding's lineage/arithmetic evidence. Read referenced raw records when implementing compatibility. |
| [RT-07: stale launcher](../tasks/documentation-red-team/defects.md#rt-07--p2--active-launcher-contradicts-the-implemented-git-baseline) | [Application launcher](../prompts/coding-task-launcher.md), AGENTS routing and catalogue's Git section; verify actual checkout capabilities. |
| [RT-08: task boundary (closed)](../tasks/documentation-red-team/defects.md#rt-08--p3--next-task-boundary-has-two-interpretations) | Documentation scope reconciled and reviewed. [Measurement task](../tasks/workflow-measurement-expansion/task.md), [synthesis](measurement-research-expansion/README.md) and [canonical first-task boundary](measurement-implementation-plan.md#first-implementation-task-to-make-concrete) now agree; no measurement implementation follows from closure. |
| [RT-09: Windows link rejection](../tasks/documentation-red-team/defects.md#rt-09--p2--valid-windows-links-are-rejected-before-path-normalization) | Verifier's `check_documents`, workflow link tests and finding's Windows path probe. |

## Where state belongs

| Information | Maintained source |
| --- | --- |
| Current review/continuation state and next action | [Red-team task](../tasks/documentation-red-team/task.md). A later implementation task owns its own work; link it here and from the review task when it becomes the active continuation. |
| Findings, contradictions, remedies and closure | [Defect register](../tasks/documentation-red-team/defects.md). Keep original evidence; append dated implementation/closure evidence. Normal checks alone do not close findings. |
| Repair sequence, dependencies, shared completion criteria and first-task design | [Execution plan](../tasks/documentation-red-team/plan.md). Task.md owns current state; the human page explains this plan rather than maintaining another roadmap. |
| Implemented commands and operation | [Command catalogue](command-catalogue.md), [operating guide](workflow-implementation.md), actual code and check results. |
| Proposed measurement contracts and slices | [System design](measurement-system-design.md), [implementation plan](measurement-implementation-plan.md), [qualification gates](measurement-research-expansion/trust-and-validation.md). A proposal does not establish implementation or measured gains. |
| Historical results and source coverage | Dated task/evidence records and source reviews below. Preserve them; later results supplement their original scope. |

If sources conflict, record the conflict and verify the affected code/evidence. A newer file date or this navigation page does not silently resolve it. On handoff, update the task, affected finding/contract and this route only if routing changed; refresh the context projection/checkpoint. Avoid a second independent status summary.

## Measurement work and scope boundaries

Before measurement implementation, read the selected H00/M00-M06 slice and its dependencies, relevant system-design contracts and qualification gates. The [first-task boundary](measurement-implementation-plan.md#first-implementation-task-to-make-concrete), aligned on 5 October, owns the M00 plus one H00 offline fit deliverables and stop condition. Independent reference arithmetic is required; reusable normalization/reporting, ongoing acquisition and live calibration are deferred. RT-03/RT-06 semantics constrain the new contracts; defective existing mechanisms must be repaired or excluded from trusted reliance. [WF-04](../tasks/workflow-measurement-expansion/task.md#next-action) owns measurement continuation; the register retains RT-08's original conflict and amendment evidence.

Open methods, quality or tool research only for the selected decision. Retain failed attempts and their resources; distinguish unknown, partial, estimated and observed values. Qualification and offline fixtures are not productivity evidence. Accepted tasks per human engineering hour, quality, context efficiency, latency and model cost have separate definitions in the evaluation protocol; no local multiplier is established.

Workflow-only work does not require the clinic PDF, S00-S12 plan or clinic context map. For **authorized clinic application coding**, use the [application launcher](../prompts/coding-task-launcher.md) and [technical plan](../technical-plan/README.md), checking the RT-07 warning against current capabilities. For **clinic architecture reassessment**, the [original handoff](../prompts/technical-architecture-handoff.md) retains its full-reading requirements with the current Documents root.

## Research and evidence library — open when needed

| Package | Contents and status |
| --- | --- |
| Latest review | [Report](../tasks/documentation-red-team/report.md), [register](../tasks/documentation-red-team/defects.md), [coverage](../tasks/documentation-red-team/coverage.md), [follow-up research disposition](../tasks/documentation-red-team/research-follow-up.md). |
| Four-repository reassessment, 4 October | [Task](../tasks/upstream-workflow-reassessment/task.md), [integrated disposition](reviews/upstream-2026-10-04/README.md), four pinned reports and per-file ledgers. HumanLayer/ACP are distinct from the older GenSX/enterprise source package. Scoped instruction and measurement qualification are recommendations, not installations or measured ROI. |
| Implemented workflow | [WF-01 task/evidence](../tasks/workflow-implementation/task.md): local tooling and synthetic pilot. [WF-02 task/evidence](../tasks/workflow-rollout/task.md): Git foundations and bounded agent trials. Neither establishes general productivity gains. |
| Measurement research | [WF-03 task](../tasks/workflow-measurement-research/task.md), [research](measurement-research.md), [sources](measurement-sources.md). [WF-04 task](../tasks/workflow-measurement-expansion/task.md), [expanded synthesis](measurement-research-expansion/README.md), [methods](measurement-research-expansion/methods-and-standards.md), [quality](measurement-research-expansion/coding-quality-and-evaluators.md), [tools](measurement-research-expansion/tools-and-integration.md), [source coverage](measurement-research-expansion/source-coverage.md). Research is not a running collector. |
| Original source lessons | [Adoption audit](source-adoption-audit.md), [synthesis](research-report.md), [effectiveness review](effectiveness-review.md). Read when reconsidering the workflow strategy or transferring a source recommendation. |
| Detailed source reviews | [ACE adoption](reviews/ace-adoption-audit.md), [12-factor adoption](reviews/twelve-factor-adoption-audit.md), [GenSX adoption](reviews/gensx-adoption-audit.md), [enterprise adoption](reviews/enterprise-adoption-audit.md); original [context engineering](reviews/context-engineering.md), [12-factor](reviews/twelve-factor-agents.md), [implementation examples](reviews/implementation-examples.md). |
| Original proposals and navigation | [Local audit](local-audit.md), [setup proposal](repo-setup-proposal.md), [clinic context map](project-context-routing.md). Dated recommendations may predate implemented foundations; check task evidence before repeating work. |
| Source preservation | [Pinned manifest](source-manifest.json), [641-file inventory](source-files.csv), [original preservation](preservation-check.json), [earlier verification](verification.md). Inventory counts are not a claim that every binary was read as prose. |

The previous version of this index and the other changed entry points is retained byte-for-byte in the review's [navigation snapshot](../tasks/documentation-red-team/evidence/handoff-before-001.json). Source research and historical evidence remain in place.
