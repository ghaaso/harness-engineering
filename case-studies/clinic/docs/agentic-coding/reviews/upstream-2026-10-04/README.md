# Four HumanLayer repositories: workflow, context and measurement disposition

Assessment date: 4 October 2026. This document integrates the requested source
review; [the canonical task](../../../tasks/upstream-workflow-reassessment/task.md)
owns completion state and continuation. It supplements the
[earlier bridge assessment](../../workflow-bridge-assessment.md), preserving its
history. No runtime, clinic application, plugin, nested instruction tree or
measurement collector was installed or implemented in this review.

## Decision

**Keep the existing lightweight vendor workflow as a candidate to test. Correct
the one-file rule to one authority per rule, with selective directory scope.
Start measurement with a bounded contract/acquisition qualification, not a full
platform. A fair comparison is required before claiming improvement or ROI.**

The existing plans contain enough to select that small task. They do not contain
an implemented, calibrated whole-workflow collector or results proving benefit.
Several demonstrated local acceptance/measurement defects remain open. The
source review supplies sharper requirements and limits; it does not close them.

The four repositories form a related body of practice: principles, context
methods, concrete coding prompts/old product implementations, and a Kubernetes
agent runtime. They share authors and lineage. Four links are not four
independent replications of our proposed workflow.

## Source coverage and what “everything” means

| Pinned current default tree | Tracked files | Detailed review and per-file evidence |
| --- | ---: | --- |
| HumanLayer, `99abe673498cf8bdcd5f989aebe9406a27185b3b` | 794 | [Review](humanlayer-review.md), [coverage](humanlayer-coverage.json) |
| Agent Control Plane, `eaa2a7ed1d9cb4e13dc53defaf420e36f481dcad` | 289 | [Review](agentcontrolplane-review.md), [coverage](agentcontrolplane-coverage.json) |
| 12-Factor Agents, `d20c728368bf9c189d6d7aab704744decb6ec0cc` | 499 | [Review](12-factor-review.md), [coverage](12-factor-coverage.json) |
| Advanced Context Engineering, `f2bc7aec4575418d2d2e83fec078266cc56d3e6a` | 76 | [Review](ace-review.md), [coverage](ace-coverage.json) |

The inventories cover **1,658 tracked files**. Completeness of a file inventory
and hash match is different from substantive reading. The reports distinguish
full authored reading, duplicate reuse, baseline-plus-full-diff reading,
generated-code/lock structural inspection and visual sampling. The review
includes tests, fixtures, configuration, migrations, CI/release material,
unfinished examples and contradictory/stale guidance, rather than stopping at
the READMEs. Final coverage methods and remaining limits belong in each ledger.

Important boundaries: dependency implementation, all branches/history/issues,
every external link and the newer hosted product are outside these pinned
trees. ACP's approximately 100 MB executable was identified and hashed, not
executed or disassembled. Animated media were decoded and inspected using
representative frames, with per-file methods recorded. There is no
claim to have visually examined every animation frame. None of the upstream
tests or applications was run. Static test reading is evidence about assertions,
not reproduction of a failure or production validation.

This is new complete-tree work on HumanLayer and ACP. It must not be confused
with the old 641-member source package, whose four sources included a separate
GenSX example and enterprise agent guide. The 12-factor/ACE pins match their
earlier local reviews; this review expands their verified coverage rather than
inventing an upstream update.

## Multiple AGENTS.md: the precise correction

The user's concern is valid: **directory-specific guidance can be useful**. The
specific HumanLayer tree contains nine `CLAUDE.md` paths and zero `AGENTS.md`.
Root, workflow, Go-daemon and desktop-UI files have different purposes; five
other files repeat one generic Bun template. ACP contains one `CLAUDE.md` and
zero `AGENTS.md`; 12-factor has two `CLAUDE.md` and zero `AGENTS.md`; ACE has
neither. This demonstrates scoped instructions and duplication risks, not a
universal instruction to distribute AGENTS.md throughout every repository.

Current vendor behavior matters independently of these examples:

- Codex assembles instructions from the project root toward its working
  directory, with later scopes taking precedence. It selects one recognized
  file per directory and has a size limit. A root-started session should not be
  assumed to preload every descendant instruction. Explicitly route affected
  module guidance. [Official Codex instruction guide](https://learn.chatgpt.com/docs/agent-configuration/agents-md).
- Current Claude supports AGENTS.md under documented version/configuration
  conditions. Its default can prefer CLAUDE files when present. Ancestor loading
  and lazy descendant loading differ from Codex. Imports are not restricted to
  the first line; `@AGENTS.md` compatibility does not require the handoff's
  first-line claim. Check actual configuration and loaded instructions.
  [Official Claude memory guide](https://code.claude.com/docs/en/memory).

Do not assume an AGENTS.override.md, a generated thoughts/CLAUDE.md, a custom
command, or a saved CustomInstructions field has the same consumer in both
tools. HumanLayer stores CustomInstructions but its reviewed CLI argument
builder does not forward that field. A filename or database record is not proof
of vendor consumption.

The maintainable local arrangement is:

| Information | Owner and reason |
| --- | --- |
| Shared authority, scope, evidence distinctions, permission boundaries | Root AGENTS.md; keep this concise and shared |
| Stable module-specific checks/conventions | A short scoped AGENTS.md only when a real module needs different guidance; add local rules rather than copying global policy |
| Business facts, design decisions, contracts and acceptance criteria | Existing ordinary documents, selected through the context route |
| Current objective, progress, stop reason and next action | The substantial task's task.md |
| Handoff/checkpoint | Projection of that state plus declared dependency evidence |
| Measured observations and comparison assignment | Run/evidence records; preserve raw provenance and missingness |

The current project is mostly documents plus workflow tools. Root instructions
and the selected-task route already supply scope. There is no demonstrated need
to create many new files today. As application code arrives, distinct test,
migration, UI or data-access conventions can justify small scoped files. Keep
clinic source authority at the root; local instructions cannot override
provisional business rules or import repair-workshop requirements.

Before adopting scope, qualify both tools in a harmless fixture: launch at the
root and a nested directory; read a nested file from a root session; exercise
root/local conflict, compatibility import and relevant global/config settings;
record versions and observed loaded instructions. A prompt telling a model to
read a file is different from native auto-loading. This qualification is still
unperformed, not a claim that the current sessions satisfy it.

## What each source contributes and where it does not fit

| Source | Transferable value | Limit or rejected expansion |
| --- | --- | --- |
| HumanLayer | Focused repository locators/analyzers; concrete plans; automatic/manual verification; resume from real files; permissions distinct from decisions | Current README marks retained code largely deprecated. Prompts are guidance, not enforced policy. Ralph loops, thoughts synchronization and collaborative prototypes add operational effects and maintenance. No need to install them |
| ACP | Explicit state, bounded reconciliation, approval events, actual consumer paths, recovery/idempotency questions | Alpha Kubernetes runtime for application agents; its separate coding hack includes automatic edits/merge/cleanup. Neither is our read-only review loop or a measurement solution |
| 12-factor | Own prompts/context/control; one state owner; compact errors; small focused work; pause/resume; humans as explicit decision points | Tutorials include in-memory state and unfinished webhook/resume handlers. Generator tests test generation, not workflow quality. Principles do not require building an orchestrator |
| ACE | Selective code research, reviewed concrete design, vertical slices, actual code review and future change cost | Original practices were revised after incidents/rewrite. Heuristics and small evolving benchmarks do not establish our speedup or a universal best process |

The full 12-factor mapping, including the optional prefetch factor, is in its
review. Every principle already has a possible local home: launcher/plan,
selected context, task state, permission/acceptance boundaries, bounded repair,
handoff and evidence. Some are implemented locally, some proposed, and runtime
integration is conditional. “Adopt the principle” need not mean a new service.

### Research and planning are connected but have different boundaries

HumanLayer/ACE repository research explains current code and behavior. The
bridge's Perplexity stage gathers **public-web prior art** when an unfamiliar
external choice matters. These complement each other; one does not replace the
other. A routine change following an established repository pattern can skip
external discovery. Planning still inspects actual code, feasibility and
affected contracts.

Keep a versioned note recording the question, listed options, URLs/tradeoffs,
selected basis and limitations. It constrains the writing session. If planning
finds that none of its options fits, stop that decision and return through the
research boundary with a reason and revised note. Freezing an incorrect account
forever is harmful; ACE describes discarding wrong research. Count that rework.

Do not copy HumanLayer's “no open questions” instruction into clinic planning:
the clinic's affected financial/payroll/return rules remain explicitly
provisional. A technical plan can be reviewable while identifying what must be
validated before a specific behavior is accepted.

ACE often uses fresh stage contexts; the bridge prefers Claude planning and
implementation in one approved session. These are alternative controls to test,
not requirements to combine indiscriminately. Preserve the approved plan and
candidate identity under either choice. No evidence here settles which costs
less for our task families.

### Read-only review needs a complete acceptance leg

Keep the candidate diff/check environment stable for review. Codex reports
findings; the user accepts, rejects or disputes them. Accepted findings return
to Claude, which repairs and reruns affected checks. Rebind acceptance to the
final candidate and record whether the accepted finding was actually resolved.
A changed library reopens the prior-art decision. A disputed finding needs
reproduction/contract evidence, not repeated model voting until someone agrees.

This preserves the no-rewrite/no-auto-fix/no-review-gate choice. Adding a
reviewer can catch defects but also adds triage, delay and repair. False positives,
missed defects and unnecessary accepted changes all affect its net return.
HumanLayer approvals and ACP human callbacks authorize tool effects; they are
not independent acceptance of a generated software artifact.

## Measurement readiness: good foundations, unfinished qualification

The [evaluation protocol](../../evaluation-plan.md),
[system design](../../measurement-system-design.md),
[implementation plan](../../measurement-implementation-plan.md) and
[trust/qualification gates](../../measurement-research-expansion/trust-and-validation.md)
already address task/stage/attempt/call identities, human effort, missingness,
artifact binding, retries, cost and comparison. Reuse them. Do not rewrite them
around whatever an upstream dashboard happens to expose.

| Layer | Current conclusion |
| --- | --- |
| Question and measurement contracts | Substantive proposals exist; enough to select a bounded M00/H00 qualification |
| Existing local workflow/Git tools | Implemented with saved checks/trials; known RT blind spots remain |
| Full pipeline and acquisition route | Proposed; H00 and M00–M06 have not been implemented/qualified as a whole |
| Real provider calibration | Not established by mock/synthetic fixtures or this source review |
| Comparative improvement or ROI | No fair local baseline/treatment result establishes it |

### Newly sharpened acquisition requirements

1. **Cover the question's whole workflow.** Codex-only telemetry misses Claude
   writing and Perplexity research. Record research, planning, review, human
   triage, accepted repair/integration and later reopenings, using manual records
   where necessary. Qualify one route at a time; do not imply one qualified
   provider captures the whole loop.
2. **Identify actual semantics.** HumanLayer's session manager overwrites token
   fields with the latest root assistant usage, excludes subagents, and ignores
   cumulative result usage for those fields. They describe context usage rather
   than total billing. Its proxy can synthesize 100/50 tokens without provenance.
   ACP discards returned usage in a client path. Storage/display does not make
   any of those values complete task spend.
   Record the realized adapter/provider/model, forwarded options and assembled
   context. Proxy transformations and dropped configuration fields can change
   the treatment despite an unchanged selected label or saved configuration.
3. **Preserve denominator and missingness.** Leaf-only/filtered session views,
   archived/deleted runs, bounded event buffers and SSE without replay can lose
   retries or events. Known zero, unavailable, partial, estimated and complete
   must remain distinct. A subscription usage percentage is not a per-task bill.
4. **Bind correctness to the final artifact.** Runtime completion, approval,
   trace presence and command exit are separate from required behavior. Record
   check exposure, skipped/failed cases, candidate revision and human outcome.
   Do not let an accepted flag coexist with an unresolved critical failure.
   WUI text-based success previews, model-provided todo completion and scripted
   demo states are presentation/model outputs, not independent acceptance.
5. **Qualify arithmetic independently.** Count all attempts; avoid summing nested
   wall spans or treating parallel occupancy as elapsed latency. Union overlapping
   active-time intervals per person, then sum different people's effort. Keep
   cache counts and provider counter conventions explicit. Use independently
   expected fixtures before relying on production reporting.
6. **Retain recoverable evidence without indiscriminate export.** Raw transcripts
   and config can contain source and secrets. Preserve required provenance and
   failure lineage with appropriate local handling. Mutable dashboards are not
   a sealed outcome ledger; backup/restart behavior requires its own trial.

Upstream tests reinforce these requirements: some error checks catch their own
assertion and then pass/skip; migration tests reopen fresh in-memory databases;
memory/performance tests do not measure the named resource; mock token readback
does not establish acquisition accuracy. None of these was executed here. They
show why meaningful assertions and actual qualification are necessary.

The local [RT register](../../../tasks/documentation-red-team/defects.md) remains
OPEN in full. RT-01/02 affect whether decisive checks actually fail; RT-03 affects
acceptance; RT-06 affects measurement imports/arithmetic. RT-04/05 affect commit
and negative-control trust; RT-07/09 affect routing/check behavior. RT-08 records
the unresolved first-measurement-task boundary. Fix dependencies for the selected
slice rather than requiring every unrelated repair before useful work.

For measurement, the narrow recommendation remains **M00 plus one H00 fit
result, independent reference arithmetic and a clear stop boundary**. Resolve
RT-08 in the governing task/plan before implementation; this report does not
silently amend it. Production normalization/reporting, live calibration and
comparison are later slices. The current recommended implementation continuation
remains RT-01, subject to the user's chosen coding task.

## Comparing results so “better” has a meaning

Separate three questions: does the capture/check system work; does a chosen
workflow improve outcomes; and is its benefit worth recurring/setup cost?
Passing the first is not evidence for the other two.

| Comparison element | Predeclare and retain |
| --- | --- |
| Baseline | The actual current process, including existing authority, routing and checks |
| Treatment | One addition, such as read-only second-model review or external prior-art constraint; a bundled bridge measures only the bundle |
| Task population | Family, complexity, risk, source start state and acceptance scope; avoid only easy successes |
| Allocation | Randomized/counterbalanced matched tasks or isolated copies; disclose human learning and repeated-task contamination |
| Stable conditions | Realized models/adapters/tool versions, forwarded options, assembled context/permitted information, acceptance suite and review policy; split changed conditions into separate cohorts |
| Primary result | Independently checked accepted tasks per active human hour, alongside completion rate and quality |
| Additional results | Time to acceptance, model spend/coverage, useful/rejected/disputed findings, repair, escaped defects and follow-up change effort |
| Complete accounting | Every assigned/aborted/discarded attempt, research and planning, waiting, triage, repair, setup and maintenance |

Use the same acceptance standard for both arms. Keep review findings on one arm
from leaking into the other. A human participating in both repeated tasks can
learn even with fresh model sessions; independent task allocation helps but does
not remove all uncertainty. If acceptance tests change, rescore relevant saved
artifacts consistently or begin a new cohort. Preserve both final success and
isolated requirement/checkpoint results where they answer different questions.

First use a small pilot, for example 8–12 bounded tasks, to discover missing
fields, burden, variance and failure modes. That number is illustrative,
**not a statistically justified sample size** or proof of ROI. Choose a later
confirmation sample based on observed variation and the improvement worth
detecting; reserve new tasks rather than reporting tuning cases as confirmation.
Report inconclusive results honestly. Keep task-level records and dispersion,
not only one average or a weighted quality score that hides critical failures.

ACE's benchmarks change harnesses, problem tests and accounting, include inherited
checkpoint failures and lack raw repeated local workflow trials. HumanLayer's
healthcare migration case uses an expected alternative schedule. 12-factor and
ACP supply no causal developer-productivity comparison. They inform questions
and controls, not a numeric baseline for this project.

## ROI and future growth

Measure incremental return above what we already have. For human time:

**Net minutes saved = comparable task count × (avoided work per task − added
process per task) − setup/maintenance minutes.**

Break-even requires recurring savings to exceed recurring overhead. Add tool
charges and an explicitly chosen human-time value only for a monetary analysis;
do not invent hourly rates or allocate a subscription bill as exact marginal
task spend. Report quality and high-consequence integrity separately. A check
protecting data/permissions can be necessary even when it does not maximize speed.

The leverage depends on the real bottleneck. If only 20% of total effort can be
removed, eliminating all of it yields at most 1.25× throughput at equal acceptance
before overhead. This is an illustrative mathematical bound, not a local estimate.
Faster generation can lose its value in review, integration and future repair.

| Stage | Useful capability now or when needed | Evidence that justifies expansion |
| --- | --- | --- |
| Current workflow | Reliable selected acceptance gates; small task/evidence records; reuse research and routes | A real recurring failure or question that existing controls cannot answer |
| First clinic coding | Use completed plan and S00; establish actual application checks and bounded vertical behavior | Working code, qualified checks and observed maintainer needs |
| More modules | Scoped local instructions, contract/permission/transaction regression checks | Repeated wrong context or cross-module regressions; instruction loading qualified |
| More maintainers | Reproducible setup, owned task handoffs and a selected shared-repo/CI route | Actual parallel work and review/coordination backlog; no remote CI exists now |
| More measurements | One qualified capture route, independent normalization and useful offline reports | Repeated decision value plus manual-accounting burden; then justify automation |
| Operational use | Authorized pilot, restore/upgrade and staff acceptance evidence | Actual clinic operation; desk research remains distinct from validation |

The portable connecting record is task → selected evidence/plan → candidate →
checks → review dispositions/repair → accepted artifact → comparable observations.
Each result feeds a bounded change to context, checks or workflow. Shared rules
stay compact; domain details stay routed; current state has one owner. This lets
the system grow through observed needs rather than accumulating frameworks.

The immediate payoff is to stop broad rediscovery and do a bounded real task
with trustworthy checks and a small honest record. This review is sufficient for
that decision. Reopen upstream research only when a selected dependency,
behavior or evidence changes. No new orchestrator is justified.
