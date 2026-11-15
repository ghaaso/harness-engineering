# Repository setup proposal

Status: proposed, 30 September 2026. This document describes a reviewable setup. It does not select the clinic stack, authorize deployment, or install an agent framework.

Implementation update, 1 October 2026: [W02/W03 working templates and the local workflow tools](workflow-implementation.md) now implement the narrow workflow amendments. The application/Git/CI/skill layout below remains a proposal. Workflow document/checkpoint verification is distinct from application S00 and T01-T20 checks.

Later rollout update, 1 October 2026: [WF-02](../tasks/workflow-rollout/task.md) implements local Git/ignore/hook foundations and checks reproduction from committed HEAD. Its separately authorized two-agent trial tests seeded resumption and iterative synthetic code changes. The historical absence of Git below describes the initial review; current evidence/status is in WF-02. Remote CI and small skills were conditional proposals, not prerequisites that every workflow must install. Application behavior remains separate.

## 1. Design around the repository we actually have

The complete Documents project has strong evidence governance and all ten technical-plan documents, but no `.git`, clinic application, dependency manifest, automated application tests, or CI. Its one Python program builds a derived PDF and depends on ReportLab and Windows Arial font paths. The user corrected the project location; missing files in the initial D: copy were a copy mismatch, not unfinished planning. Use `C:\Users\User\OneDrive\Documents\Bilal_Migration\User\Downloads\20_PROJECTS\24_Clinic_Workshop` as the working project for this task.

The first gains should therefore come from reproducible foundations and reliable planning. Do not introduce a runtime agent system as a prerequisite for developing an ordinary clinic application. The small-clinic scope, $8/month hosting/VM constraint, and PC-independent production constraint make an additional always-running agent service a design choice requiring justification. Local development skills and Markdown handoffs do not themselves consume that hosting budget.

## 2. Proposed layout

Preserve existing names and source locations. The layout below is a target, not a claim that these application files already exist. Replace the future `app/` convention with the actual chosen framework's layout; do not force every framework into this tree.

```text
AGENTS.md                         existing authority + concise workflow routing
README.md                         entry point and verified local commands
.gitignore                        generated files, local environments, secrets
sources/                          authoritative originals and provenance
archive/                          historical originals
docs/
  clinic-planning-brief.md         existing user instruction register
  research/                       existing domain/stack/hosting research
  technical-plan/                 architecture, contracts, invariants, decisions
  agentic-coding/                  this research package; reference only
  tasks/<task-id>/
    task.md                       requested outcome, scope, acceptance criteria
    research.md                   relevant evidence and uncertainties
    plan.md                       chosen design, vertical slices, verification
    handoff.md                    timestamped projection of task.md
    context.md                    compact facts/statuses with source dependencies
    checkpoints/                  immutable dependency/packet snapshots
    review.md                     findings and disposition when useful
.agents/skills/                   optional, after workflows prove repeatable
  repo-research/SKILL.md
  change-design/SKILL.md
  change-review/SKILL.md
tools/                            deterministic, stack-appropriate checks
app/                              future application, framework-native structure
tests/                            future behavior and integrity checks
.github/workflows/                only if GitHub is the chosen remote/CI
```

`docs/tasks/` holds durable task state. It is distinct from `.agents/skills/`, which holds reusable workflow instructions. Skill discovery is documented in the current [OpenAI skills guide](https://learn.chatgpt.com/docs/build-skills). Do not assume Claude command files or old `.codex/skills` examples have identical loading behavior in every installed client.

Start with ordinary templates and direct prompts. Create two or three narrowly scoped skills only after repeated use identifies a useful invariant workflow. Skill descriptions should identify their trigger and exclusions. Avoid a skill that activates on every edit, and avoid embedding the entire research corpus in its instructions.

## 3. Keep AGENTS.md short and factual

The current file contains important project-specific evidence rules. Its size is not the principal problem. Retain the source authority, historical-material boundaries, later user instructions, and operational uncertainties. Do not replace it with the upstream placeholder `CLAUDE.md`.

Add only information that is useful across tasks: commands that have actually succeeded, how to choose relevant documents, the current stage, and durable workflow expectations. Put detailed design and domain content in linked documents. Record local commands with working directory, required environment, scope and expected exit status. The existing plan proposes Django/PostgreSQL and pytest/Ruff tooling, but these are not yet installed application commands. Do not claim `npm test`, `make check`, `pytest`, or deployment checks succeeded before the application/environment exists.

Proposed additive guidance, after the referenced files and commands exist:

```markdown
## Development workflow

- The clinic evidence and planning authority above continue to govern work.
- Use docs/technical-plan/ for architecture, contracts and invariants, checking
  their decision status: the current planning baseline remains PROPOSED.
  Use the clinic planning brief for requested scope and source pages for affected
  operational claims. Record proposed policy separately from established evidence.
- Follow the complete source-reading requirement when executing the architecture
  handoff. For a bounded coding task, load the relevant contracts, decisions, code,
  tests, and evidence; do not silently treat a summary as original clinic evidence.
- For a complex or ambiguous change, create or update docs/tasks/<id>/plan.md.
  Include the intended behavior, design, end-to-end slices, and verification.
  Small corrections can use a short task record without the whole ceremony.
- Continue authorized local implementation and disposable-fixture verification
  until the task's acceptance criteria are met. Ask only for an unresolved choice
  that materially changes the requested behavior or an action requiring permission.
- Preserve an executable handoff at interruption or context pressure: current
  files, decisions, unresolved issues, checks run, and exact next action.
- Report checks actually performed and their results; do not claim independent
  human review, product acceptance, or deployment from a local test.
```

This is a draft addition, not a change made to the active instructions. It intentionally adds no approval requirement at every planning or implementation phase. The human checkpoints in upstream examples should be placed at consequential choices, while work already authorized by the user should proceed.

Codex's [AGENTS.md guide](https://learn.chatgpt.com/docs/agent-configuration/agents-md) documents root-to-working-directory instruction discovery. Arbitrary documents are not automatically read merely because they exist; routing must be explicit. A `CLAUDE.md` compatibility file can later point to the same shared guidance and contain only genuinely client-specific details. Verify the chosen Claude client's current instruction-loading behavior before configuring that bridge. Avoid two drifting copies of the policy.

## 4. Route by the task's uncertainty and consequence

| Task | Default workflow | Extra work only when needed |
| --- | --- | --- |
| Typo, small document correction, isolated styling | Inspect affected material, make the change, verify result | No compulsory multi-agent research or lengthy plan |
| Localized behavior fix | Reproduce or identify failure, inspect relevant flow, implement, check behavior | Brief design when the contract is unclear |
| New business behavior or several modules | Evidence packet, program design, small vertical slices, review | Explicit decisions for affected unknown policies |
| Ledger, permission, migration, recovery change | Relevant invariants, failure cases, deterministic tests, targeted review | Rehearsal/rollback evidence proportionate to risk |
| Architecture planning | Existing full handoff and all required source reading | No substitution of this agent-workflow research for clinic evidence |
| Production action | Concrete prepared result and required operational authorization | A source document or agent suggestion does not grant permission |

A larger task should produce more useful evidence and design, not merely more prompt text. Current [OpenAI guidance on instructions](https://developers.openai.com/blog/rethinking-skills-and-prompts-for-gpt-6-astra) supports task-relevant reading and narrow skill scope rather than mandatory full-repository reading for routine edits.

## 5. Research packet and program design

Research returns a bounded artifact: the files/functions/contracts that matter, evidence links, source revisions, observed behavior, concrete uncertainties, and facts that would invalidate the packet. It should describe the current system before recommending changes. Historical notes can guide discovery but must be checked against current files and the governing user instructions.

Program design goes beyond a list of features. Specify the affected state transitions, record ownership, transaction boundaries, permissions, request/form contracts, retry behavior, migration needs, and the behavior that tests will establish. Resolve consequential design choices before a long implementation. Use a short spike if a specific technical question cannot be settled from documentation; timebox it and state the selection rule.

Use the compact code-shape block in [the working templates](workflow-templates.md) for substantial changes: files/responsibilities, actual types/signatures, call path, reuse, effect ownership and decisive checks. For an adapter or configuration change, add its conditional boundary block. Bug fixes retain a base reproduction and test-integrity review where feasible. These fields refine the existing plan; they are not a second architecture specification.

Use stable evidence IDs and file/symbol references alongside a commit or content hash. Bare line numbers drift after edits. Treat code and tests as current implementation evidence, the user/source authority as requirements evidence, and an approved decision record as design authority. If they disagree, make the disagreement explicit rather than silently elevating a stale plan.

For this clinic, preserve the distinction among physical stock movement, invoice, payment, correction, and discrepancy explanation. Do not turn unknown payer/liability/settlement rules into automatic financial behavior. Shared UI/backend contracts should make ambiguous rules visible and allow reversible planning.

## 6. Implement vertical slices

Follow the existing implementation plan: S00 creates the reproducible baseline, S01 establishes identity/catalogue, S02 establishes posting foundations, and S03 delivers the first complete receipt workflow with synthetic fixtures. S03 covers the interface/form, server validation, persistence, stock effect, access control, error/retry response and observable result. Use the existing domain/data-model and contract proposals; refine only the program details needed for the slice.

Candidate acceptance cases, to finalize against the selected design:

- An authorized user can prepare and post a receipt with units and batch/expiry fields.
- Rejected/damaged quantity is represented according to the proposed receipt policy and never silently contributes to accepted stock.
- Repeating the same posting request does not increase stock twice.
- A failure during posting does not leave a partial stock/document result.
- An unauthorized user cannot post through a direct request.
- The UI makes success, failure, and uncertain network outcomes understandable.

These are proposed engineering checks, not observations of clinic practice. Tie them to the existing S03 and T01/T02/T03/T05 contracts rather than creating another acceptance catalogue. Implement the complete small behavior before building every table, then every endpoint, then every screen. Follow the existing later slices for issue/concurrency, counts/corrections, supplier settlement, expenses/cash, restricted payroll information, reports and operations. Each adds specific behavior and evidence. A slice need not have an arbitrary fixed line-count limit, but it must be small enough for a maintainer to understand and review. Split the broad S02 foundation into bounded work packets with one integration owner.

## 7. Bounded delegation and ownership

Useful independent tasks include locating the affected flow, checking domain evidence, examining a dependency's official documentation, reviewing a migration, or testing a specific concurrency invariant. Give each helper a question, source scope, expected artifact, and stopping condition. Return concise evidence to the integration owner; do not merge their entire tool history into the main context.

For code work, agree shared contracts first and assign disjoint files/modules where possible. Keep one integration owner responsible for cross-module behavior and final verification. Git worktrees or isolated branches become useful once this folder is a Git repository; they do not replace contract coordination. Start with one implementer plus a bounded independent reviewer for consequential changes. Compare the benefit before increasing the agent count.

An agent review is another automated review. It does not satisfy a requirement for independent human review or clinic acceptance. Reviewers should inspect behavior, permissions, invariants, errors, and tests against the task contract rather than rewarding the implementer's narrative.

## 8. Error recovery and durable handoffs

On failure, keep the exact command, exit status, concise error, relevant stack frame, and the artifact being changed. Save full logs outside the prompt and link them when needed. Do not repeatedly append complete build output to the conversation. Classify the failure as implementation, environment, dependency, flaky check, or unrelated baseline before changing code.

Try a small bounded recovery: for example, two evidence-based attempts at the same failure class, then reassess the premise or record the blocker. This is a configurable workflow proposal, not a universal model limit. Avoid asking for human input simply because one local command failed; continue independent work and ask only for the specific missing decision/access when necessary.

Write a handoff when changing chats, handing off a task, nearing context pressure, or leaving unfinished work. It must state requested outcome, revision/files, completed behavior, unresolved decisions, checks and failures, and the exact next action. Revalidate the code/evidence it references before resuming. A checkpoint records observed state; it does not create permission or count as completion.

`task.md` is the current-state index with one integration owner. Plan owns design, review owns findings, and handoff/context/checkpoint are timestamped projections with dependency hashes. If they disagree, inspect current sources/check evidence and repair the index; do not vote among stale summaries. Use the [checkpoint/resume commands](command-catalogue.md) to detect changed relevant files, then inspect and refresh facts. Resolved errors leave the active packet after their resolution evidence is recorded; full historical logs remain linked. An unrelated changed file does not invalidate a task's context.

The [OpenAI execution-plan example](https://developers.openai.com/cookbook/articles/codex_exec_plans) is a useful historical pattern for living plans. It is currently marked archived, so use the idea of a self-contained, updated plan rather than adopting its model/version recommendations or every prescribed ceremony.

## 9. Deterministic checks and CI

The implemented [workflow verification entry point](command-catalogue.md) checks document targets, JSON, source provenance, required workflow contracts and its own behavior tests. It rejects an incomplete project and preserves originals. Its portable check operates on the supplied project copy, rather than requiring this user's absolute path. For the PDF builder, record a supported Python/ReportLab environment and font dependency before promising portability. Workflow checks do not establish any clinic application behavior.

After stack selection, expose a single documented verification entry point with scoped checks. It may dispatch format/lint, type checks, relevant tests, migration checks, and build checks. CI should run the same supported commands as local development. Add behavior tests for stock/money integrity, duplicate retries, permissions, concurrency, and rollback where they prove meaningful outcomes; do not manufacture tests that merely mirror implementation details.

No upstream sample is sufficient evidence for production webhook/state handling. If an agent runtime is later needed, separately implement and verify durable state, validation, timeout/denial handling, idempotent resume, authorization, bounded loops, and observability. That work is outside a basic coding-workflow setup.

## 10. Rollout and definition of done

| Stage | Concrete deliverable | Completion evidence |
| --- | --- | --- |
| Foundations | Git/ignore decisions; document/source check; verified environment commands | Team can reproduce checks from a clean checkout; originals remain hash-identical |
| Plan-to-task routing | Existing complete planning deliverables mapped to tasks | Current location, decision status, affected contracts/invariant/test IDs, working navigation |
| First slice | One complete synthetic receipt behavior | Acceptance cases work; failures/permissions/retries covered; maintainer can explain it |
| Workflow pilot | Task records and narrow routing; optional small skills | Useful artifacts without mandatory ceremony on trivial tasks |
| Evaluation | Baseline and treatment run records | Independent acceptance, time/cost/rework accounting, quality comparison |
| Expansion | Additional slices and repeatable skills | Measured benefit retained; stale/redundant instructions removed |

Avoid installing GenSX, HumanLayer, BAML, Kubernetes, Pipedrive, or a large agent framework solely because they appear in the examples. Adopt a dependency only for an actual runtime requirement and after reviewing current API/support/license behavior. The first setup should be understandable without those services.
