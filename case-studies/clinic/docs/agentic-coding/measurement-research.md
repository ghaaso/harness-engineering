# Research: measuring and improving the coding workflow

Research date: 1 October 2026. Status: completed research and **proposed measurement-system design**, not an installed collector or a measured workflow improvement. Requested after the user challenged the absence of a measurement system. [Task and performed checks](../tasks/workflow-measurement-research/task.md).

Follow-up, 2 October 2026: the user requested extensive research with multiple subagents. [WF-04's synthesis](measurement-research-expansion/README.md) adds three source-focused reports, formal measurement/evaluation guidance, maintained native Codex providers/adapters and measurement self-validation. Its decision register supersedes the earlier runner/analysis recommendations where amended; this document retains WF-03's original research scope and observations. The [current design](measurement-system-design.md) and [implementation plan](measurement-implementation-plan.md) incorporate those supported corrections.

The repository has useful evaluation definitions, a record validator and bounded trial evidence. It does **not** have a complete system that captures each task's resources, reconciles every worker, evaluates outcomes and computes defensible comparisons. Calling the workflow fully finished obscured this missing layer. WF-02 established feasibility on its selected cases; it did not establish productivity, cost or context gains.

The recommendation is a small, local measurement pipeline with versioned events, independent outcome checks, explicit completeness and reproducible reports. Collect operational evidence during ordinary work; use separately designed experiments to assess whether a workflow change caused an improvement. Do not purchase or install an observability platform merely because it displays attractive charts. This recommendation is an inference from the evidence below and the current repository, not a product trial.

Companion documents: [source register](measurement-sources.md), [system and metric contracts](measurement-system-design.md), [bounded implementation plan](measurement-implementation-plan.md). The existing [evaluation protocol](evaluation-plan.md) remains the starting point; this research supplies the missing acquisition and analysis design.

## Questions and research coverage

The investigation covers what exists locally; valid productivity and quality measures; context retention and total usage; time/cost accounting with parallel agents; client telemetry; independent grading; comparative experimental design; uncertainty; tool choices; and a concrete implementation sequence. Sources are original research or first-party documentation. The source register records inspected sections, dates, limits and retrieval problems.

Local coverage includes root instructions, the workflow index/guide/setup proposal/templates/context route, evaluation protocol/schema/validator/tests, affected ACE measurement and adoption review passages, WF-02's manifest/current summary/eight active exports/review limits, and the installed client's help/generated protocol schemas. The current root chat's local rollout was inspected for **event types and field names only**. Unrelated chats, credentials and raw prompts were not exported. No new agent/model run, remote service, telemetry setting change or paid experiment was performed.

## 1. What is actually measured today

At base commit `d3f72e3c59234a4ad6905976fc2decc3df4e3bee`, the [local audit](../tasks/workflow-measurement-research/evidence/local-audit.json) finds eight active trial exports: six accepted stages and two interrupted dispatches. Every record is schema-valid. Every export has null provider input/output/cache totals, human active effort, worker runtime, cost, retrieved payload size, resume duration, rework duration and escaped-defect count. These are absent measurements, not observed zeros.

| Present capability | What it establishes | What remains missing |
| --- | --- | --- |
| 29 workflow tests and document checks | Selected local mechanisms and structural checks pass | Application correctness; effectiveness of the workflow |
| Frozen fixture evaluator and preserved code | The trial's selected behavior checks passed; earlier tests survived changes | Representative real-task quality; independent human acceptance |
| Stage start/end timestamps | Coordinator preparation-to-evaluation observation intervals | Worker-active time, human-active time, clean dispatch/completion boundaries |
| Versioned checkpoints | Declared files changed or did not change | Semantic completeness; successful use of every decisive fact |
| Nullable JSON exports and validator | Selected shape/accounting rules hold | Automatic collection, event identity, provenance reconciliation, batch analysis |
| Two peer-review reports | Other implementers performed bounded static automated reviews | Calibrated graders; fresh independent reviewers; human maintainability assessment |

The 38 check executions are repeated cases across two trajectories and three stages. They are not 38 independent coding tasks. Both conditions passed their final nine cases. There is no measured improvement ratio to extract from these results. Historical evidence should remain unchanged; future imports must identify incomplete or incompatible records rather than retroactively filling them with estimates.

### Concrete contract gaps

Three [in-memory probes](../tasks/workflow-measurement-research/evidence/measurement-gap-probes.json), without editing old records or code, establish that the current validator:

- Accepts an elapsed amount 1,000 minutes greater than its timestamps imply.
- Accepts populated human hours with null active human minutes.
- Rejects null `repeat_read_count`, so an unavailable observation cannot be represented directly.

All eight current exports use zero for repeated reads without an automated read-count collector. Those zeros must not be used as measured efficiency evidence. An annotation can preserve the original record while marking that metric unavailable. The v1 schema also lacks structured experiment/task/stage/attempt/worker/call identities, metric-specific provenance, collection coverage, waiting causes and follow-up observation completeness. An evidence-path string is not verified evidence content. These are measurement-system requirements, not proof that the successful synthetic repairs were incorrect.

## 2. Productivity needs outcomes and several dimensions

SPACE treats productivity as multidimensional: satisfaction/well-being, performance, activity, collaboration, and efficiency/flow. Activity alone does not describe delivered value. DevEx adds feedback loops, cognitive load and flow, and combines developer perceptions with system observations. [SPACE](https://www.microsoft.com/en-us/research/publication/the-space-of-developer-productivity-theres-more-to-it-than-you-think/), [SPACE dimensions](https://azure.microsoft.com/en-us/blog/navigating-the-space-between-productivity-and-developer-happiness/), [DevEx, measurement section](https://www.michaelagreiler.com/wp-content/uploads/2024/06/DevEx-WhatDrivesProductivity.pdf).

For this repository, keep the existing primary **accepted tasks per active human engineering hour**, when those hours are actually observed. Accompany it with acceptance rate, end-to-end wait, resource use, rework and maintainability. Do not infer human effort from how long an agent ran or how many messages the user sent. If active effort is unknown or the denominator is zero, this productivity ratio is unavailable. An autonomous coding-task benchmark can still report acceptance, latency and compute without claiming a human productivity result.

Lines changed, commits, command counts, tokens, test counts and complexity can help diagnose behavior. They should not become interchangeable measures of useful work. Splitting a task into more stages must not increase primary throughput. Report stages and whole accepted tasks separately. Compare like task classes; a receipt fix, application foundation and authorization change have different work and risks.

DORA's current framework measures delivery throughput and instability through five production-oriented measures. It explicitly cautions against one-metric goals, disparate comparisons and excessive measurement work. [DORA metrics](https://dora.dev/guides/dora-metrics/). The clinic application has no production deployment, so deployment frequency, change failure rate and recovery metrics are **not applicable yet**. A local commit is not a production deployment. Add DORA later as a separate service-level view; keep request-to-acceptance development time separate from commit-to-production lead time.

## 3. Perceived speed and observational trends are insufficient

METR's early-2025 randomized study included 16 experienced developers and 246 real issues; in that setting, AI access increased completion time by 19%, despite participants believing they were faster. The authors explicitly limit generalization. [Original study](https://metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study/). This is evidence for measuring the whole process, not evidence that today's models or this workflow necessarily slow us down.

METR's February 2026 update reports that newer data has selection and time-accounting problems: developers and tasks can opt out of conditions, and concurrent-agent work complicates reported task time. It does not establish a reliable universal current speedup. [Study redesign](https://metr.org/blog/2026-02-24-uplift-update/).

The local implication is two complementary modes:

1. **Operational observation:** collect all eligible authorized work, failures and exclusions, then identify recurring bottlenecks. Report changes over time as associations. Model updates, task difficulty, increased familiarity and concurrent work remain possible explanations.
2. **Controlled comparison:** freeze a task population and current workflow baseline; randomize a small added mechanism while holding acceptance, model/settings/tools/budgets constant. Maintain isolated workspaces and evaluator separation. This supports a narrower causal statement about that change under those conditions.

Freeze eligibility before condition assignment. Record declines, cancellations, unfinished work, usage outages and missing measurements. Do not run only tasks likely to suit the treatment. Do not weaken authority or normal tests to create an artificially poor baseline. A comparison between different models or agent counts evaluates a broader package, not the isolated effect of a context packet.

## 4. Correctness checks and graders need their own validation

OpenAI recommends task-specific evaluations, representative datasets, logged evidence, automation and calibration against human judgments. It notes model-judge position and verbosity biases. Its Codex skill-evaluation example captures runs, checks deterministic artifacts/events, then adds structured qualitative evaluation. [Evaluation guidance](https://developers.openai.com/api/docs/guides/evaluation-best-practices), [Codex evaluation pattern](https://developers.openai.com/blog/eval-skills). These API/CLI examples do not prove that this desktop repository already has their tracing integrations.

The original MT-Bench judge research also describes position, verbosity and self-preference biases. Its chat-assistant results are not a validation of an automated code reviewer. [Judge study](https://arxiv.org/abs/2306.05685). Use a reviewer rubric, blind condition labels where possible, rotate presentation order for comparisons, preserve disagreement and calibrate on independently labelled examples. A reused implementing agent's approval must not be called independent human review.

The ICSE 2026 SWE-bench correctness study found that passing the benchmark's selected tests could still leave failures in other developer tests or uncertain behavioral discrepancies. It also distinguishes suspicious differences from proven incorrectness. [Patch-correctness study](https://software-lab.org/publications/icse2026_SWE-bench-correctness.pdf). Do not label every deviation from a reference implementation a defect. Use the selected contract and source authority, relevant regression coverage, independent boundary cases and declared unknowns. A fail-before/pass-after reproduction validates a specific repair; it does not prove all surrounding behavior.

For the clinic, eventual evaluators should exercise relevant T01-T20 contracts and invariants with synthetic fixtures, including money, permissions, transaction effects and concurrency where affected. They must not resolve provisional business policies by guessing. Grade correctness, business value and maintainability separately. Quality gates can block an affected change regardless of a favorable average resource ratio.

## 5. Context quality includes use, freshness and total acquisition cost

Lost in the Middle demonstrates that relevance position can affect performance in the studied long-context models. It does not establish a universal context threshold or today's Codex behavior. [Original context study](https://arxiv.org/abs/2307.03172). Test the actual client and task distribution. A small summary can remove necessary facts; a large context can include correct facts that the agent fails to use.

Use four separate observations: total reported model input including cache; bytes delivered at a declared retrieval boundary; required-fact correctness/freshness; and fresh-session resume outcome/time. Freeze the decisive facts and authoritative revisions before execution. Evaluate observable use of constraints, including status labels such as REPORTED and PROPOSED, rather than literal string presence alone. A checkpoint detecting changed bytes is only one component.

The context denominator must include parent, workers, packet creation, summaries, failed attempts, grader calls and coordination within the declared accounting scope. Also report implementation-only usage if useful, but do not substitute it for total delivery usage. Count cached input as model input; display discounts separately. Never sum cumulative usage snapshots as if each were a new model call. Do not mix logical token usage, unique retrieved content, network bytes and billing units.

SlopCodeBench v2 retains each agent's generated workspace while changing requirements, resets conversational context between checkpoints, and tests external behavior including inherited functionality. [Iterative-task method](https://arxiv.org/html/2603.24755v2). Transfer that design as an optional evaluation track; do not import its pass rates or static-code metrics as local improvement estimates. Separate warm-session follow-ups, cold-session resumption and seeded-stale-context recovery. WF-02 exercised a narrow combination of these, not every form of long-task handoff.

## 6. Telemetry is available in principle, but collection is not established

Official noninteractive documentation describes JSONL lifecycle/item events and usage on completed turns. App-server documentation describes thread usage notifications and lifecycle/error events. Advanced configuration documents opt-in OTel export, including request/tool events and usage on completion. [CLI output](https://learn.chatgpt.com/docs/non-interactive-mode), [App Server](https://learn.chatgpt.com/docs/app-server), [OTel configuration](https://learn.chatgpt.com/docs/config-file/config-advanced).

The [local capability probe](../tasks/workflow-measurement-research/evidence/capability-probe.json) establishes:

- Bundled `codex-cli 0.159.2` has `--json` and `--output-schema`; no inference run was invoked.
- Offline generated usage schemas distinguish last and total usage and include input/cache/output/reasoning fields.
- A generated account-usage response can optionally carry thread estimates, including estimated credit/USD fields when a billing route is available. Schema presence does not prove this account/session can retrieve them.
- The current root chat's persisted file contains token-count and token-usage event types. Only field names/counts were inspected; no validated task/worker/resource totals were calculated.

This corrects a broad assumption that the client cannot expose usage. More precisely, **WF-02 did not collect and reconcile complete usage through its execution tools**. A root-chat counter covers mixed work and cannot be substituted for two workers plus preparation and review. Do not retroactively claim measured spend or efficiency.

Use an owned CLI JSONL run as the leading controlled-run adapter; verify its usage semantics on a separately authorized small calibration run. For ongoing desktop work, prefer a supported lifecycle/usage export if accessible. Treat local rollout import as a version-pinned compatibility fallback with strict source selection, parse coverage and reset detection. Do not attach to an unknown server, scan other chats or alter global telemetry settings as part of this research.

## 7. Tool choices: collection and evaluation are separate responsibilities

| Option | First-party documented strength | Fit and remaining proof |
| --- | --- | --- |
| Local JSONL evidence + existing Python tooling | Uses already available local files, Git and a maintained validator | Recommended canonical store initially; proposed collector/analysis still need implementation and behavioral validation |
| Codex CLI / App Server / OTel adapters | Run/item/usage surfaces described above | Acquisition sources, not automatic independent acceptance or human-effort measurement |
| OpenTelemetry Collector | Receives/processes/exports logs, metrics and traces across backends | Optional routing/redaction bridge; it is not a coding-workflow evaluator |
| Langfuse | Traces, datasets, experiments, deterministic/model scoring and annotation workflows | Candidate shared review UI later; native Codex event mapping, privacy, operating burden and budget are unverified here |
| Phoenix | OTel-oriented tracing with annotations and evaluation | Candidate local/team trace UI; desktop event compatibility and full accounting require proof |
| Promptfoo | Deterministic/custom assertions and evaluation of precomputed outputs | Candidate rubric/fixture runner; artifact checks must inspect actual frozen code and tests, not just final text |

Evidence: [OTel Collector](https://opentelemetry.io/docs/collector/), [Langfuse observability](https://langfuse.com/docs/observability/overview), [Langfuse evaluation](https://langfuse.com/docs/evaluation/overview), [Phoenix tracing/evaluation](https://arize.com/docs/phoenix/tracing/tutorial), [Promptfoo assertions](https://www.promptfoo.dev/docs/configuration/expected-outputs/).

Vendor capability descriptions are documentation evidence, not comparative product trials. No service is selected or installed. Avoid making a platform UI the evidence owner: portable events, manifests, artifacts and deterministic calculations should survive a change of viewer. OTel's old GenAI pages now redirect readers to a separate conventions repository; pin the actual mapping/schema version instead of copying outdated field assumptions. [Current conventions location](https://github.com/open-telemetry/semantic-conventions-genai).

## 8. Statistical claims need independent units and missingness rules

The independent comparison unit should be a matched task/trajectory, not every test assertion, worker message or repeated stage. Preserve pairing when resampling; whole trajectories and repeated runs of the same task require a declared dependency/cluster treatment. SciPy documents paired-index resampling and warns about degenerate intervals; NIST explains the basic bootstrap principle. [SciPy bootstrap](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.bootstrap.html), [NIST bootstrap](https://www.itl.nist.gov/div898/handbook/eda/section3/bootplot.htm). Neither source grants validity to a two-trajectory performance claim.

Report assignment counts, completion/acceptance, measured coverage and failures before ratios. Unknown metrics, zero denominators, canceled tasks, incomplete trajectories and incompatible client versions must remain visible. Do not silently analyze only the successful or cheapest runs. For latency, report time-to-acceptance for completed work and budget/time-to-stop for unfinished work; failure-by-budget remains part of the quality result. Waiting due to account limits remains in user latency and has its own cause, not inferred compute.

A feasibility pilot can debug instrumentation and estimate variability. Its size is an engineering choice, not proof of statistical power. Confirmatory sample size, stopping, confidence method, task mix and quality tolerances should follow pilot information and be frozen before held-out evaluation. With few independent tasks, present descriptive results and uncertainty limitations rather than a precise-looking bootstrap. A prespecified lower confidence bound would need to support the exact 3x or 5x claim, with comparable quality and full accounting. Zero observed failures do not establish zero defect risk.

## Decisions changed by this research

1. **Completion wording:** working foundations and feasibility evidence are complete; automated measurement collection/analysis is a distinct unfinished layer.
2. **Acquisition priority:** test Codex-native structured usage before accepting permanent token unavailability or adding a third-party platform.
3. **Data contract:** introduce event identities, metric provenance/completeness, nullable unknown counts and waiting/observation states; retain v1 historical exports.
4. **Comparisons:** implement an explicit eligibility/claim checker. A dashboard can show operational observations without claiming a causal improvement.
5. **Review/quality:** maintain independent tests, rubric calibration and later change exercises; static peer approval alone is insufficient.
6. **Rollout order:** implement and calibrate the measurement mechanics before claiming gains from subsequent real-task comparisons. The research request does not authorize new model trials, subscriptions or application implementation.

Remaining unknowns are concrete: live per-worker event availability in the current desktop route; whether account thread estimates are accessible and how they reconcile; automatic capture overhead; actual human-effort recording burden; representative task variability; and independent maintainer availability. The proposed implementation plan includes acceptance checks for these rather than filling them with assumed numbers.
