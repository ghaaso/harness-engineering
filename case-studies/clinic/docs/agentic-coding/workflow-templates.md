# Workflow templates

Updated: 1 October 2026. W02/W03 amendments are implemented as working templates. These are ordinary documents, not installed skills or mandatory forms for every edit. Use only the records that make the task easier to understand, execute, or resume. Replace sample text with actual evidence; a checked box does not establish that a check happened. See the [operating guide](workflow-implementation.md) for executable local checks and checkpoints.

Audience amendment, 5 October: apply the [shared completion criteria](../tasks/documentation-red-team/plan.md#completion-criteria-for-every-substantial-task) to substantial tasks. Keep the agent packet focused; link a human explanation or maintained section showing the outcome, affected flow, choice, before/after, evidence/limits and next action. Use diagrams when useful. Both views refer to the existing task/contract owners; an explanation is not another state ledger, and no new file is required for every small edit.

## Current-state ownership

`docs/tasks/<id>/task.md` is the current-state index, maintained by the integrating implementer. It points to the selected plan, actual check artifacts, unresolved questions/errors and exact next action. `plan.md` owns design; `review.md` owns review findings; `handoff.md`, context packets and checkpoint JSON are timestamped projections. They cannot overrule a newer task index. Current source/code and performed checks govern factual claims, even when the index needs correction.

On resumption, compare only the task's relevant dependency hashes and the task/packet hashes. Inspect changed dependencies and refresh affected facts before relying on them; do not invalidate context for an unrelated file edit. An unchanged hash proves unchanged bytes, not correctness or completeness. Never infer completed work from a filename, checked box or successful structural check.

Keep full logs outside the packet. Retain concise unresolved diagnostics, command/exit/result links and failures that explain a lasting constraint. Retire a resolved error from the active summary after recording its resolution/evidence in the historical log or review. Preserve failed/unrun check status until a recorded execution supersedes it.

## Task record: docs/tasks/<id>/task.md

```markdown
# <Task ID>: <observable outcome>

Status: proposed / in progress / verified / blocked
Requested by: <direct user instruction or authorized task reference>
Base revision: <commit; until Git exists, relevant file hashes>

## Outcome
After this change, <user/role> can <observable action>.
Current behavior: <observed implementation or explicit absence>.

## Scope and constraints
In scope: <bounded behavior>.
Relevant USER-/evidence/A-decision IDs: <references and evidence/decision status>.
Existing slice/test/question IDs: <S-ID, affected T-IDs, Q-ID; SYN-01 when useful>.
Affected uncertainty: <rule and consequence; do not broaden into a global block>.
Operational authority: <what the user actually requested>.

## Acceptance
- <Concrete success case and observable result>.
- <Relevant failure/retry/permission/integrity case>.
- <For substantial work: human explanation location and source/candidate reference; actual result, choices, evidence/limits and next action understandable>.

## Context route
Read: <specific domain/contract/code/test sources and why>.
Supplement if needed: <targeted source or official documentation>.

## Verification record
<command, environment, result, artifact, date; fill after execution>.

## Current state
Selected design: <plan link and status>.
Performed checks: <links to exact artifacts/revisions; passed/failed/unrun>.
Human explanation: <maintained section/view link; represented source/candidate identity; refresh when its facts change>.
Open questions and concise unresolved errors: <affected behavior, evidence, needed action>.
Resolved history: <links; retain only lasting constraints here>.

## Next action
<One exact authorized next action and its decisive check, or completion with limits>.
```

## Research packet: research.md

```markdown
# Research for <task>

Question: <what must be learned before choosing a change>
Source revision/hash: <what was actually inspected>
Coverage: <files/sections/pages inspected; explicit gaps>

## Current behavior and evidence
| Finding | Evidence location | Status | Implication |
| --- | --- | --- | --- |
| <finding> | <path:symbol/line and revision, PDF page, official URL> | <observed/reported/proposed/etc.> | <task consequence> |

## Relevant flow
<entry point -> validation -> state change -> observable result>
Contracts/invariants: <links>.
Relevant failure or concurrency behavior: <evidence>.

## Unknowns and contradictions
<what is unknown, why it matters, and how to resolve it>

## Handback
What the design/implementation task can rely on: <bounded facts>.
What it must not assume: <specific unsupported inference>.
Invalidation triggers: <code, dependency, source, or decision changes>.
```

The research agent should answer the assigned question rather than independently expand project scope. If it recommends an approach, keep that recommendation visibly separate from current behavior.

## Program design and slice plan: plan.md

```markdown
# Design and implementation plan for <task>

Requested outcome: <task link>.
Status: proposed / selected within authorized scope / superseded.
Evidence packet and base revision: <links>.

## Chosen design
<affected modules, state transitions, record ownership, contracts>
Transaction boundary: <all-or-nothing behavior and locking, if relevant>.
Permissions: <server-enforced capability>.
Retry/idempotency behavior: <duplicate and uncertain outcome handling>.
Migration/compatibility: <existing data and rollback implications>.
Alternatives rejected: <brief reasons tied to this task>.
Provisional policy: <unknown clinic rule and reversible assumption>.

## Code shape (substantial changes only)
Files and responsibilities: <new/changed files; reused modules>.
Key types/signatures and result/error shapes: <concrete symbols>.
Call path: <entry -> validation -> command -> persistence/effect -> response -> consumer>.
Ownership: <transaction/lock, permissions, retry/deadline and integration owner>.
Observable demonstration: <one complete behavior and independent failure checks>.

## Boundary checks (adapters/configuration/shared interfaces only)
Dependency version/source: <exact inspected pin; relevant consumers>.
Input validation and authority boundary: <where enforcement actually occurs>.
Effect -> result/error/denial -> caller: <each material path; partial success>.
Scheduler/order/state lifetime: <concurrent effects; restart/per-run state>.
Retry/loop/deadline owner and fake/clock seam: <bounded recovery and deterministic tests>.
Configuration: <option -> generated value -> validated input -> consuming branch -> result>.
Disabled/invalid cases and generated artifact actually consumed: <checks>.

## Vertical slices
| Slice | Complete observable behavior | Dependencies | Files/contracts | Acceptance/check |
| --- | --- | --- | --- | --- |
| 1 | <one end-to-end result> | <only real prerequisites> | <locations> | <behavior and failure case> |

## Progress and decisions
Progress projection as of: <timestamp + task.md hash/revision>.
Current status/results/next action live in task.md; link them rather than creating a competing checklist.
Decision changes: <what changed, why, affected contract/test>.

## Verification and review
<actual results, remaining failures, reviewer findings and disposition>
```

Planning should resolve important program choices before a long run of generated code. Use the complete existing clinic plan and its S/T/A/Q identifiers; do not create a competing domain specification. Refine only the program detail needed for the change, and update the affected contract/fixtures/tests together. It need not freeze everything: revise it when evidence changes, and record the reason. Already-authorized work should continue through the milestones without repeated permission requests.

## Implementation launcher

```text
Implement <task ID> in the current workspace.
Read the current AGENTS.md, the task record, and its selected design/contract.
Check that referenced code and evidence still match the recorded revision.
Use task.md as the current-state index; plans and handoffs are versioned projections.
For a bug fix, retain a fail-before/pass-after reproduction where feasible and
explain any limitation. Review changed expectations, skips and removed assertions.
Deliver the next complete end-to-end slice and the task's meaningful verification.
Update the task progress and handoff with actual files, decisions, and check results.
Continue authorized local work until the acceptance criteria are met.
If a consequential rule remains unknown, isolate the affected behavior and ask
the specific missing question while continuing independent work.
Report the outcome, changes, actual verification, and remaining limitations.
```

This launcher is a reusable pattern. It does not grant deployment authority or override project instructions.

## Focused review: review.md

```markdown
# Review of <task/slice>

Reviewer type: automated agent / human / clinic acceptance participant.
Revision reviewed: <commit or relevant hashes>.
Task/contract: <links>.
Coverage: <code paths, tests, evidence; limitations>.

For bug fixes: <base reproduction fails / changed version passes; limitation if infeasible>.
Test integrity: <changed expected values, removed assertions/skips; justification>.
For affected boundaries: <actual caller/effect/result/error/denial/configuration consumers,
dependency pin, ordering/state/retry owner; personally verified versus static deduction>.

## Findings
| Severity | Observable problem | Evidence | Consequence | Disposition |
| --- | --- | --- | --- | --- |
| <severity> | <trigger and failure> | <path/reproduction> | <user/integrity effect> | <fixed/deferred/rejected with reason> |

## Verification
Checks personally performed: <command/result>.
Checks reported by implementer: <distinct list>.
Remaining uncertainty: <what this review did not establish>.
```

Review against behavior and invariants, including counterexamples. Avoid mirroring the implementation as a test oracle. Example questions for later clinic code: Can a duplicate receipt post twice? Can a direct request bypass salary access? Does a supplier return incorrectly settle a balance before a credit exists? Can a failed transaction leave stock changed without its associated posting record?

## Handoff: handoff.md

```markdown
# Handoff for <task ID>

Updated: <date/time and timezone>.
Requested outcome and current status: <short statement>.
Projection of task.md: <path + SHA-256/commit; does not own current status>.
Workspace/base revision: <where to work; commit/hash>.
Relevant dependency hashes and context packet: <checkpoint link; current sources/symbols>.
Current changes: <files, modifications, uncommitted/untracked state>.

Completed behavior: <what actually works and evidence>.
Chosen decisions and rationale: <links>.
Open questions/blockers: <affected behavior and needed input>.
Checks run: <exact command, exit/result, environment, log path>.
Failed or unrun checks: <reason and practical consequence>.

## Resume
1. Run the documented checkpoint resume check, inspect changed dependencies, and refresh affected facts. Read task.md for current state; do not use this projection if it is stale.
2. Perform <exact next action>.
3. Verify <observable result and next check>.

Authority remains: <user instruction/project authority links>.
```

Store full noisy logs separately; preserve concise unresolved failures and lasting constraints in the handoff. Retire resolved noise with a link to its resolution evidence. Do not include secrets, actual salary amounts, patient data, or credentials merely to make the packet self-contained. Use synthetic test examples and authorized records only within their established access boundaries.

## Delegation brief

```text
Question: <specific independent question>.
Source scope: <paths, revision, relevant authority/contract>.
Ownership: <read-only or assigned disjoint files>.
Return: <short evidence-backed answer plus saved artifact when useful>.
Stop when: <question answered / concrete access or decision blocker reached>.
Do not expand product scope or reinterpret a source proposal as user authorization.
```

Parallelize independent inspection and review. Coordinate code edits through agreed contracts and a single integration owner. A helpful delegation result reduces uncertainty; it does not create a vote-based substitute for factual evidence.
