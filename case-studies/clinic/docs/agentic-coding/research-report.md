# Research synthesis: making agentic coding better in this project

Researched 30 September 2026. Recommendations are analyst proposals based on pinned source inspection and the local workflow audit. They are not production validation or a measured 3x gain.

## Main conclusion

Use these repositories to build a dependable engineering workflow around the coding agent: accurate evidence, bounded context, explicit design, small complete behaviors, deterministic feedback, and durable state. The highest-value adaptation is a set of clear repository contracts and execution habits. Installing the example frameworks is neither required nor justified by the current project stage.

The four repositories play different roles. Treating them as interchangeable setup guides would miss both their useful ideas and their limitations.

| Repository and pinned default head | What it actually contributes | Fit for this project |
| --- | --- | --- |
| [Advanced context engineering](https://github.com/humanlayer/advanced-context-engineering-for-coding-agents/tree/f2bc7aec4575418d2d2e83fec078266cc56d3e6a) | Research/design/implementation artifacts, context management, newer program-design and review guidance, iterative benchmark discussion | Primary source for coding workflow, adapted by task size |
| [12-factor agents](https://github.com/humanlayer/12-factor-agents/tree/d20c728368bf9c189d6d7aab704744decb6ec0cc) | Reliable LLM-application design: prompts, context, structured decisions, state, control flow, bounded agents and recovery | Useful principles; runtime features are conditional rather than mandatory repo infrastructure |
| [HumanLayer/GenSX example](https://github.com/dexhorthy/humanlayer-gensx-example/tree/ea977e3a6abbbe0f56e7dfaff5daff889bb0ddc9) | One actual SDK approval wrapper, composable tool definitions, and incomplete package/resume sketches | Study execution boundaries and coverage gaps; avoid copying unfinished adapters |
| [Enterprise GTM starter](https://github.com/dexhorthy/enterprise-gtm-starter/tree/b2a1108673618f8f7a5d99867600573b2938fd57) | A 2019 license-signup application with small client interfaces, injected dependencies, development tooling and deployment examples | Transfer testability and explicit commands; dated stack and integrations are not agent infrastructure |

The default snapshots total 641 files. The detailed reviews distinguish substantive source, generated duplicates/dependency data and media; they also record selected linked references and supplementary branch coverage. Complete source archives were obtained before synthesis, not just README excerpts. No external sample application or live integration was exercised.

## 1. Context engineering: the newer guidance changes the recommendation

The original [ACE article](https://github.com/humanlayer/advanced-context-engineering-for-coding-agents/blob/f2bc7aec4575418d2d2e83fec078266cc56d3e6a/ace-fca.md) describes durable research, plans, focused delegation, and intentional compaction. The useful mechanism is to preserve the evidence needed for the next decision while discarding exploration noise. Its context-utilization percentages and productivity anecdotes are heuristics/case studies, not guarantees.

The newer [Why Software Factories Fail](https://github.com/humanlayer/advanced-context-engineering-for-coding-agents/blob/f2bc7aec4575418d2d2e83fec078266cc56d3e6a/wsff.md) revises optimism about replacing code review with specs. It emphasizes concrete program design, inspectable vertical slices, and human engagement proportionate to task difficulty. The distinction matters: a correct architecture diagram does not decide the actual record ownership, signatures, transaction boundaries, or error behavior generated code will need.

A linked planning prompt still presents horizontal database/backend/API/UI phases, which conflicts with that newer guidance. It also assumes Claude-specific tools and environment commands, plus repeated human pauses. Adapt the evidence/output contracts instead of copying the command verbatim. Existing user authorization should govern whether a pause is required.

For this project, research should point from USER-/source evidence to a domain contract, affected code and independent acceptance. Design should settle important program choices; implementation should deliver one complete small behavior; verification should produce concrete results. A routine correction can skip separate research/plan files.

The two [benchmark](https://github.com/humanlayer/advanced-context-engineering-for-coding-agents/blob/f2bc7aec4575418d2d2e83fec078266cc56d3e6a/benchmarking-opus-5-on-slop-code-bench.md) [reports](https://github.com/humanlayer/advanced-context-engineering-for-coding-agents/blob/f2bc7aec4575418d2d2e83fec078266cc56d3e6a/benchmarking-sol-fable-kimi-on-slop-code-bench.md) are valuable for thinking about evolving code and inherited defects. Small selected task sets, single runs, differing harnesses/test suites, static quality proxies, missing raw artifacts, and editorial inconsistencies limit conclusions. They do not evaluate the proposed setup against this repository or establish a workflow multiplier. See the [full review](reviews/context-engineering.md) for chart/prose cross-checks and detailed limits.

## 2. Translate the 12 factors carefully

The factors primarily address software that runs an LLM agent for users. Our current goal is software development using a coding agent. The following table explicitly distinguishes direct adaptations from conditional runtime work. These are our mappings, not a claim that the source prescribes this exact repository structure.

| Factor | Proposed coding-workflow adaptation | Runtime work only if actually needed |
| --- | --- | --- |
| 1. Natural language to tool calls | Turn the request into concrete tasks, files, commands and acceptance outcomes | Validate model-selected actions before execution |
| 2. Own prompts | Version project instructions and focused workflow templates | Version actual LLM prompts alongside their call sites and evaluations |
| 3. Own context window | Task-specific evidence packet, progressive disclosure, compact handoff | Control prompt assembly, retrieval and compaction explicitly |
| 4. Tools are structured outputs | Define input/output contracts; verify actual tool behavior | Schemas do not replace authorization, semantic validation, or enforcement |
| 5. Unify execution and business state | Task status, selected decisions, files and checks in one durable task record | Persist real workflow state rather than hiding it in ephemeral chat memory |
| 6. Launch/pause/resume APIs | Resume from a task/handoff after checking referenced revisions | Durable, authorized, idempotent interruption and continuation |
| 7. Contact humans through tool calls | Ask a specific missing question with a concrete decision artifact | A verified human-interaction tool with denial/expiry/cancellation behavior |
| 8. Own control flow | Deterministic check commands, clear completion, bounded retries | Explicit dispatch, termination, error and recovery paths |
| 9. Compact errors | Keep command/exit/error evidence, store noisy full logs separately | Model-facing recoverable errors with a retry budget |
| 10. Small focused agents | Delegate bounded questions and independent review with ownership | Short agent loops rather than an unconstrained general-purpose worker |
| 11. Trigger from anywhere | A portable task record usable across chats and contributors | Webhooks/schedules/channels only when a product requirement exists |
| 12. Stateless reducer | Reconstruct work from durable artifacts and current repository state | Persist state externally and derive validated next actions from it |
| Optional 13. Pre-fetch context | Fetch likely relevant contracts/code/evidence once for the task | Deterministic retrieval; avoid dumping every document into every prompt |

Canonical source: [factor index](https://github.com/humanlayer/12-factor-agents/blob/d20c728368bf9c189d6d7aab704744decb6ec0cc/README.md). Exact chapter and package evidence is in the [12-factor review](reviews/twelve-factor-agents.md).

The upstream repository's generic `CLAUDE.md` includes placeholders and assumptions such as missing persona files, large mandatory reads and frequent commit instructions. Its starter package also contains illustrative defects rather than a dependable runtime. These are evidence that conceptual guidance and reference scaffolding need separate review. They should not override this project's established evidence rules or become the new root policy.

## 3. The examples expose why names and build success are insufficient

In the GenSX entrypoint, the actual HumanLayer SDK wrapper protects the mutation at execution. In the proposed package adapter, `requireApproval` copies the original callback unchanged. The webhook file fabricates state and leaves continuation as comments. Normal TypeScript compilation covers `src`, so it would not verify the package sketches. These are source-inspection findings; live SDK behavior was not tested.

Sources: [actual wrapper](https://github.com/dexhorthy/humanlayer-gensx-example/blob/ea977e3a6abbbe0f56e7dfaff5daff889bb0ddc9/src/index.tsx), [non-enforcing adapter](https://github.com/dexhorthy/humanlayer-gensx-example/blob/ea977e3a6abbbe0f56e7dfaff5daff889bb0ddc9/pkg/%40gensx/humanlayer.ts), [resume sketch](https://github.com/dexhorthy/humanlayer-gensx-example/blob/ea977e3a6abbbe0f56e7dfaff5daff889bb0ddc9/pkg/%40gensx/humanlayer-webhook-state.ts), [compilation scope](https://github.com/dexhorthy/humanlayer-gensx-example/blob/ea977e3a6abbbe0f56e7dfaff5daff889bb0ddc9/tsconfig.json).

The transferable lesson is to check the enforcing call path and observable behavior. A named wrapper, completed checklist, generated instruction file, or successful check outside the changed files does not establish correctness. If the clinic later uses AI/OCR, model output should become a reviewable draft under the existing planning boundary; production stock/money actions need real validation and authority.

The enterprise starter supplies clear external-client interfaces and an injected clock, which make the signup logic locally understandable and testable. It also contains source/config/UI drift, unsafe debug logging, a missing build-script target, and tests that create live external licenses. Its newer [fix-install branch](https://github.com/dexhorthy/enterprise-gtm-starter/tree/659c8712053af68f4ea3457fd138c49ec48e753b) adds downloads, webhooks and Pipedrive absent from default master. The review examined those changes; they remain conventional business integrations with incomplete replay/recovery safeguards.

Adopt small adapters, deterministic fixtures and verified commands. Treat live integration tests as effectful operations with a separately documented environment and authority. The complete [examples review](reviews/implementation-examples.md) records default-versus-branch behavior, lockfiles, diagrams, source deductions and execution limits.

## 4. What fits the current local repository

The existing AGENTS.md is already useful. It preserves clinic authority, reported-versus-observed evidence, historical scope, later user instructions, and unresolved financial/stock policy. The architecture handoff already asks for concrete design and vertical slices. We should improve execution around that foundation rather than replace it with a generic agent persona.

The user clarified that the complete project is in Documents. That copy contains all ten substantive planning documents, including the proposed Django/PostgreSQL modular monolith, shared contracts, invariants and S00-S12 implementation sequence. The initial D: copy was incomplete. The actual gaps are no Git history and no application/check environment; the planning work need not be repeated. Start with the correct project location and the plan's reproducible S00 baseline, then route tasks to the affected decisions and contracts. See [local audit](local-audit.md).

Once application work begins, a task packet should include only what affects the change: its source/USER IDs, selected policy, contract/invariants, current code/tests, commands and acceptance. Preserve full-source reading where explicitly required for the architecture task. Keep a durable plan for complex changes and a current handoff at interruptions. Use independent agents to reduce uncertainty or review a bounded behavior, with a single integration owner.

The [setup proposal](repo-setup-proposal.md) defines the target layout, a draft additive AGENTS section, task-size routing, vertical-slice acceptance, ownership, recovery, CI, and staged rollout. The [workflow templates](workflow-templates.md) make that recommendation immediately reviewable without activating policy or installing a runtime.

## 5. What to avoid

- Universal research/plan/review ceremonies for small edits; long instructions that repeatedly load irrelevant material.
- Treating every unresolved business policy as a reason to stop all authorized planning.
- Copying Claude tools, Make/Bun commands, persona paths, old model settings, or constant context thresholds without local evidence.
- Horizontal implementation that postpones observable integration until the end.
- Multiple agents editing shared contracts without ownership, or automated review presented as human acceptance.
- Memory/checkpoints trusted without checking current source and code revisions.
- Framework installation, Kubernetes, CRM services, or hosted agent infrastructure without an actual product need.
- Measuring generated LOC, successful final attempts only, or tiny selected tasks as proof of a universal 3x gain.

These are specific pitfalls supported by the source and local inspection, not reasons to defer ordinary authorized development.

## 6. Evidence needed for the user's target

The most plausible gain comes from reducing wrong assumptions, rediscovery, poor initial design and rework. The source anecdotes make that worth piloting. They do not establish a minimum multiplier. This folder has no local coding baseline yet.

The proposed primary metric is accepted tasks per human engineering hour, with elapsed delivery time, agent/tool runtime, compute/cost, defects and rework reported separately. Use matched tasks, fresh identical base revisions, fixed model/tool limits, independent acceptance and held-out work. Include failed attempts and follow-on modifications so a fast first patch cannot hide later maintenance cost. See [evaluation plan](evaluation-plan.md).

The 3x ambition should become a measurable target, not a property claimed because we added AGENTS.md or skills. Start with a useful first slice and a modest pilot; refine the workflow using the measured bottlenecks. Stronger claims require comparable quality and enough evidence to support the ratio's uncertainty.

## 7. Scope, licensing and remaining limits

The primary sources were inspected at pinned commits; selected linked prompts and papers are supplemental and may use other revisions. Coverage records are in each review. Generated duplicates/dependency graphs, media, external videos and unexamined dependencies are labeled rather than counted as new original implementation evidence.

The 12-factor repository distinguishes CC BY-SA 4.0 content/images and Apache 2.0 code. The ACE snapshot has no detected license file; GenSX has package license metadata but no standalone license; the enterprise repository has conflicting LICENSE/package metadata. Verify copying rights and current compatibility before importing code. This package paraphrases findings and supplies original proposed templates; it does not vendor or install the upstream code into the clinic project.

No full security assessment, external application execution, live service test, model comparison, clinical validation, deployment, or productivity experiment was performed. The package provides a source-backed setup proposal and evaluation design, ready for the next implementation stage.
