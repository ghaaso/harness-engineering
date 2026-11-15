# Using the implemented coding workflow

Implementation date: 1 October 2026. The user authorized this workflow work with “start doing it.” [WF-01 task index](../tasks/workflow-implementation/task.md) owns current implementation state and exact verification evidence. The clinic application remains unimplemented.

Rollout correction: WF-01 completed the local-tool phase, not the whole rollout. [WF-02](../tasks/workflow-rollout/task.md) now owns the subsequent Git foundations and real-agent trial status. Original WF-01 pilot/evidence limits below remain historical; use WF-02 for later performed trials.

Measurement clarification, 1 October 2026: the core workflow and bounded feasibility trial are available, but the repository has no complete automatic resource-collection/analysis system. [WF-03 research](../tasks/workflow-measurement-research/task.md) documents this gap, actual client capabilities and a [proposed measurement system](measurement-system-design.md). Existing schema-valid records do not establish measured resource efficiency; implementation/calibration and representative comparisons remain separate work.

Measurement research expansion, 2 October 2026: [WF-04](measurement-research-expansion/README.md) adds three-agent primary-source research into measurement standards, calibrated code evaluators and maintained native tools. Follow its adoption decisions and validation gates for later measurement implementation. The core commands below still have their existing narrow scope; no trace adapter, measurement collector, live calibration or new improvement experiment was added by this research.

## What is available

| Amendment | Implemented now | Remaining evidence/work |
| --- | --- | --- |
| W02 design and boundaries | Conditional code-shape, adapter/configuration and bug-test-integrity fields in the templates and launcher; the toolkit's own [design](../tasks/workflow-implementation/plan.md) demonstrates their use. | Application tasks must apply relevant fields to actual code. |
| W03 state and context | One task index; separate design/review records; timestamped checkpoint projections; relevant task/packet/source hash validation, deletion detection and explicit error retirement. WF-02 exercised seeded resumption with two fresh agents and source refresh through later changes. | General resumption/context-efficiency performance remains unmeasured. |
| W04 command evidence | Working local document/provenance, behavior-test, checkpoint and evaluation-record commands; local Git/ignore/commit-hook foundations and Git-checkout/failure checks, documented in the [command catalogue](command-catalogue.md). | Application setup and T01-T20 checks require S00 and affected slices. Remote CI is conditional on selecting a provider; none is selected. |
| W05 evaluation specification | Separate quality/context/productivity/cost definitions, nullable telemetry, worker/attempt accounting, iterative-change and instruction-regression protocols; executable [run-record schema](evaluation-run.schema.json) validation. | Actual independent task acceptance and model/effort/cost telemetry need eligible trials. |
| W06 pilot | WF-01's six deterministic cases plus WF-02's two isolated real-agent trajectories: seeded repair, two undisclosed changes, 38 evaluator check executions and two static automated peer reviews. [Trial summary](../tasks/workflow-rollout/evidence/trial-summary-final.json). | Larger application tasks, independent human/maintainer review, total provider usage/cost, human effort and confirmatory gain evaluation remain unrun/unmeasured. |

W01 source corrections and the original source reviews are historical evidence. This guide supplements their dated status; it does not rewrite earlier preservation snapshots. Ordinary Markdown templates are available without installing skills, plugins or the reviewed example runtimes.

## Start a task

1. Confirm the user's scope. For clinic coding, follow the [current launcher](../prompts/coding-task-launcher.md), select an existing slice and read its affected contracts, decisions, questions and acceptance criteria. For workflow-only changes, route to the affected working instructions and actual toolkit code.
2. For substantial work, create `docs/tasks/<id>/task.md` from the [task template](workflow-templates.md). One integrating implementer owns its current state and next action. Keep design in `plan.md` and review evidence in `review.md`. Tiny edits need only outcome and verification.
3. Make `context.md` a short projection of the relevant evidence, statuses, unresolved failures and next action. Keep source references. Add code shape for substantial code; add boundary/configuration checks only when affected. Bug fixes preserve fail-before/pass-after evidence and disclose changes to expected values, assertions or skips.
4. Run the relevant real checks and record their actual output. An unavailable application command is an unrun check. A schema-valid record does not establish independent acceptance.
5. Before interruption, save a new checkpoint with task, packet and relevant dependencies. On resume, validate it, inspect changed dependencies and refresh affected facts and the task/packet. Save a new checkpoint after refresh. Preserve old evidence; retire resolved errors from active context while linking their history.

## Run local checks

The toolkit uses Python 3.10 or later and its standard library. Select an actual interpreter; the Windows application-execution alias alone does not prove Python is installed. Run from the repository root. The interpreter used here is recorded in the saved verification result.

```powershell
$workflowPython = 'C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe'
& $workflowPython tools/coding_workflow.py doctor
& $workflowPython tools/coding_workflow.py verify
```

On another machine, replace that interpreter path with the team's Python executable. The script derives its project root from its own location; `--root <copied-project>` before the subcommand explicitly selects a different complete project. There are no third-party packages, credentials or network calls.

```powershell
& $workflowPython tools/coding_workflow.py checkpoint --task docs/tasks/my-task/task.md --packet docs/tasks/my-task/context.md --source docs/technical-plan/contracts-and-permissions.md --source docs/technical-plan/decision-log.md --output docs/tasks/my-task/checkpoints/001.json
& $workflowPython tools/coding_workflow.py resume docs/tasks/my-task/checkpoints/001.json
& $workflowPython tools/coding_workflow.py validate-run docs/tasks/my-task/evidence/run-001.json
```

These task names are examples; create the referenced task files first. Include affected code, tests and instructions among dependencies when they govern the task. All tool path arguments are repository-relative. Evidence outputs must be new JSON files under `docs/tasks/` or `output/coding-workflow/`; existing evidence is never overwritten. The exclusive create prevents overwrite but is not a crash-recovery/transactional storage guarantee. Checkpoint hashes prove unchanged bytes only; choose dependencies deliberately and still read the current task and evidence.

`verify --output output/coding-workflow/<new-run>/verification.json` saves a new result. `pilot --output output/coding-workflow/<new-run>/pilot.json` saves a synthetic mechanism run. Exit 0 means the command's scoped checks succeeded; exit 2 means invalid input or a failed scoped check. Check the catalogue for effects and exclusions.

## Interpret the pilot honestly

The predeclared [six-case manifest](../../tests/workflow/pilot-cases.json) supplies synthetic required facts independently of the projection logic. Deterministic readers receive both baseline and compact packets twice; treatment accounting also includes the actual preparation read. The pilot records UTF-8 bytes read/emitted at this local harness boundary. Its intentionally constructed background and deterministic extraction are not a measured distribution of real agent retrievals.

Each case must retain every required fact and reject removal of one. Checkpoint tests must accept unchanged and unrelated files and reject relevant changes. A fresh Python subprocess proves reconstruction from disk; it does not exercise a fresh LLM session. Provider tokens, provider cost and human productivity stay null. These checks support retaining the narrow mechanics while the evaluation gates remain open; they establish no 3x/5x gain, independent human acceptance or clinic behavior.

## Maintain this workflow

Execution-plan amendment, 5 October 2026: use the [current repair plan](../tasks/documentation-red-team/plan.md) and selected register entry for remaining workflow work. Its [completion criteria](../tasks/documentation-red-team/plan.md#completion-criteria-for-every-substantial-task) require both a focused agent packet and a human explanation of the goal, affected flow, choice, before/after result, checks/limits and next action. Refresh the human overview only when its represented facts change; no extra file or diagram is required for every small edit. Record canonical facts first and refresh affected views. The human explanation is a delivery requirement; automatic synchronization remains unimplemented. This supplements the steps above and does not turn a local test pass into human acceptance.

When instructions or the tool change, run `verify`, retain new evidence and update the catalogue/task record. The tests include stale/deleted dependencies, path/evidence boundaries, instruction/provenance defects, malformed accounting and decisive-fact loss. They test mechanisms, not the clinic's business T acceptance catalogue. Use the [evaluation protocol](evaluation-plan.md) when measuring agent outcomes; freeze the actual current baseline and condition hashes rather than attributing practices already present to this implementation.

## What the completed feasibility trial establishes

WF-02's workers started from the same committed project and broken synthetic adapter runner. The treatment additionally received a compact packet and deliberately stale checkpoint. Both inspected current source, repaired retry behavior, then retained their own generated code through later payload-conflict and strict configuration/denial requirements. The outside evaluator was frozen before dispatch; original and previously added tests stayed byte-identical. Each condition passed 4, then 6, then 9 evaluator cases. These are 38 executions across six accepted stages, with nine distinct final cases per condition.

Two follow-up dispatches hit the account usage limit before coding; resumed attempts and the roughly three-hour wait remain in the records. Two other-implementer automated static reviews found no current-contract defects. Reviews reused worker conversations after code freeze, not independent human or fresh-reviewer sessions. The [run index](../tasks/workflow-rollout/evidence/run-record-index.json) selects eight active attempt/checkpoint records and excludes two superseded export versions whose interrupted-attempt hashes were corrected.

The local workflow is available for coding now. Retain scoped checks, conditional design fields and selective checkpoints; the pilot gives no measured reason to impose more forms, install skills/services or claim a multiplier. Provider tokens/cost and active human effort remain UNKNOWN. The next clinic coding task starts with its existing S00 route; it does not require another workflow-planning round. Application-specific checks are added as their implementations exist. Remote CI and optional reusable skills are conditional extensions, not missing mandatory setup.
