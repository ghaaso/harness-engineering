# Orchestration rules for the clinic build

Status: adopted by the owner on 2 November 2026 as the working method ("we're going to do it this way"). These rules say how sessions, agents and merges are organised. What counts as done is still the plan's per-slice definition of done ([implementation plan](../technical-plan/implementation-plan.md)) and the authority rules in [AGENTS.md](../../AGENTS.md). Current build state lives on the [wave board](../tasks/clinic-build/task.md), not here.

## 1. Roles and tiers

| Node | Model and effort | Does | Never does |
| --- | --- | --- | --- |
| Root session (this project's orchestrator) | Fable | Holds the wave board, writes the briefs, reads every diff and task record, judges gates, merges slice branches into `main`, edits the shared documents | Implementation, subagent-style reading, anything a cheaper tier does equally well |
| Slice lead session | Opus, high, for slices that touch stock posting, money, counts and corrections, migrations, permissions or imports (S02, S03, S04, S05, S06, S07, S08, S10). Sonnet, medium or high, with an Opus reviewer for mechanical slices (S01, S09, S11) | Owns one slice branch, splits the slice into bounded tasks, writes or closely reviews invariant-sensitive code, runs the slice gate for its children, keeps its task record | Edits to shared documents; work outside its slice's files |
| Child session | Sonnet unless the piece is invariant-sensitive | One file-disjoint piece of a slice on a branch cut from the slice branch | Starting its own children |
| Subagents inside any session | Haiku for literal extraction into typed schemas; Sonnet for maps, command runs, citation checks and well-specified implementation; Opus for analysis, adversarial review and invariant-sensitive code | Bounded reading, extraction, verification | Decisions |

Rules: raise effort on the current tier before moving up a tier. Every `start_session` and every workflow `agent()` passes `model` and `effort` explicitly; nothing inherits the root's model. A subagent pays fixed overhead before it works, so tiny tasks are inline commands and claims are batched per verifier. Subagents reply with their full result as text; file writes from subagents are refused here.

## 2. The session tree

Depth: root, then slice sessions, then at most one level of child sessions, then subagents inside any node. There is no fourth session level: each level is a lossy handoff (a parent sees a 400-character note per turn and must read the diff itself), and three is where the loss is still cheaper than doing the work serially.

Fan-out: at most three running children per node. The account's session limit is shared by every running session (the notebook reconciliation hit it once), and the parent's review bandwidth is the real ceiling.

File ownership: every node owns exactly one file set, its worktree and branch. Siblings never share files. A child branches from its parent's branch; merges flow upward only; the root merges slice branches into `main` in dependency order. S00 is the one exception: it runs in the shared checkout on `main` because it is the foundation and has no sibling.

State lives in the repository, not in sessions: every node keeps `docs/tasks/<id>/task.md` (status, current state, next action) and evidence under it. A parent judges by reading the diff and the task record, never by the turn note alone. If a session dies (limit, error, stop), a new session resumes from the branch and the task record; every brief names both.

Shared documents are edited only by the root: AGENTS.md, README.md, the decision log, contracts, data model, implementation plan, the planning brief, this page and the wave board. Children record proposed changes to them in their own task record; the root applies them at the gate.

Communication: downward is the brief, then `SendMessage` for follow-ups; upward is the task record plus commit hashes; siblings do not talk to each other.

## 3. Gates

| Gate | Who | Passes when |
| --- | --- | --- |
| Child merge (child branch into slice branch) | the slice lead | the application check command passes on the merged branch; the piece's named tests pass; an Opus reviewer briefed to refute found no open critical finding; the child's task record is final |
| Slice merge (slice branch into `main`) | the root | the application check command passes; every item of the plan's definition of done for that slice is shown with evidence; migrations linearize cleanly over `main`; an Opus reviewer briefed to refute found no open critical finding; proposed shared-document changes were applied or recorded as open questions; the slice task record is final |
| Every commit | the pre-commit hook | `tools/coding_workflow.py verify` (document links, provenance, the 29 workflow tests); the application check command is separate and must fail when tests are skipped or none ran |

Agent output is never independent approval; the root records what a human has and has not reviewed.

## 4. Waves for the plan

Parallel work follows the plan's dependency graph, never a guess. Since 4 November 2026 the root starts the next slice sessions on its own as soon as their dependencies have merged (owner instruction USER-21 in the [planning brief](../clinic-planning-brief.md)); before that date each start waited for the owner's word.

| Wave | Slices | Parallel-safe because | Lead tier |
| --- | --- | --- | --- |
| 0 | S00 | foundation; nothing else may start | Opus, high |
| 1 | S01, then S02 | catalogue needs the baseline; posting primitives need the catalogue; the UI contract freezes at S01 (Q-19) | Sonnet with Opus review; Opus for S02 |
| 2 | S03 | purchasing and receipts need the primitives | Opus |
| 3 | S04, S06, S07 in parallel | issues, supplier balances and cash depend only on S02 and S03 and own separate modules | Opus, each |
| 4 | S05, S08 in parallel | counts need issues; pay information needs cash | Opus, each |
| 5 | S09, then S10, S11, S12 | reports converge on everything above; the rest is sequential by nature | Sonnet with Opus review for S09 and S11; Opus for S10; S12 is human-driven |

Preconditions for any wave with more than one slice: each slice owns its Django apps and their migrations (two branches must never both create the same migration number); the shared vocabulary, contracts and synthetic fixtures are frozen at S01 before fan-out; each branch uses its own local database; the root holds the merge order.

When a slice may fan out into children: when it splits into file-disjoint modules behind a frozen interface, for example S03 into purchase orders and receipts, S09 into reports per domain, S10 into one importer per source, S11 into backup-and-restore and monitoring; and a parallel reviewer session is always a valid child. When it must not: S00 to S02, anything that edits shared documents, and pieces small enough to finish in one bounded task.

The UI track (USER-12) runs as its own slice-level session once S00 has delivered the UI state glossary, building four-region screens (A16) against the contracts' synthetic examples; it merges through the same slice gate.

## 5. Brief contract

Every brief names: the goal; the files or area the node owns; the branch it starts from and the task record it keeps; the hypotheses or acceptance IDs it bears on; the settled facts to take as given; what done returns. If the root cannot write that in a paragraph, the task is not understood well enough to delegate.

Prepend this block, filled in, to every session brief and workflow agent prompt:

```text
PROJECT CONTEXT (established by the root session; do not re-derive):
- Repository root: this checkout (the directory containing AGENTS.md). Branch: <branch>. Task record: docs/tasks/<id>/task.md.
- Product: one-clinic inventory, purchases, supplier balances, expenses, cash, restricted pay information and dashboard web application; Django 5.2 / PostgreSQL 17 modular monolith; one VPS at most USD 8/month; no production dependency on the owner's PC; team maintenance; no deadline.
- Authority: sources/MD Health Clinic Inventory final.pdf is the source of truth; the October notebook is supplementary REPORTED evidence; decisions A01-A16 and questions Q-01-Q-19 are in docs/technical-plan/decision-log.md; the four-region screen budget (A16, T23) applies to every screen.
- Settled for this task (take as given): <facts>.
- Owned files: <paths>. Shared documents are read-only for you; record proposed changes in your task record.
RULES: cite every claim as "path:line - quote"; mark facts VERIFIED-IN-CODE / VERIFIED-BY-COMMAND / INFERRED; no purchases, deployment, real clinic data or production actions; commit with -c user.name="Local workflow implementation" -c user.email="workflow-baseline@localhost"; the pre-commit hook must pass; end commit messages with the attribution line the app provides.
```

## 6. Cost rules

Deterministic work (counts, greps, git status, hashes) is done inline before any agent is spawned. Discovery agents return facts, lines and names, never verdicts; judgement is the root's. Verification is bought where it moves a decision: a Sonnet citation check over every quoted claim, Opus skeptics only for findings that would change a gate, with a hard cap and an open-risks list for the overflow (never silently dropped). Every workflow script keeps stable labels, resolves every agent to a value or null, and logs what it dropped. Reference: the owner's FixFlow orchestration design, whose tier guide and script contract this page adapts.
