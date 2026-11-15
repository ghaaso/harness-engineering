# 12-factor-agents: source-to-local adoption audit

Reviewed 1 October 2026. Scope: whether this project's agentic-coding documentation has learned the useful lessons of **humanlayer/12-factor-agents**, not application architecture or deployment readiness.

Source pin: [d20c728368bf9c189d6d7aab704744decb6ec0cc](https://github.com/humanlayer/12-factor-agents/tree/d20c728368bf9c189d6d7aab704744decb6ec0cc). Source root and hashes are recorded in the project's [source manifest](../source-manifest.json) and [source inventory](../source-files.csv). This pass independently inventoried 499 files in [the adoption inventory](twelve-factor-adoption-inventory.json).

Integration note: this delegated report is preserved as supporting evidence for the [main audit](../source-adoption-audit.md). Local line references describe the documents as inspected, before the main audit's dated corrections.

## Judgment

The local package has learned almost all the canonical principles accurately. It distinguishes coding with an agent from building an agent runtime, preserves the project's authority, adopts narrow context and durable handoffs, and correctly rejects copying incomplete frameworks or generic personas. The gaps are mostly **in translating already-understood principles into precise workflow instructions**, not missing whole factors or missing installations.

The strongest additional transfers are: prompt/instruction regression examples; a single owner of current task state across the optional records; and explicit retirement of resolved error details from active context. Deterministic prefetch and prompt/context observability are already mentioned but could have clearer output contracts. None requires a new application architecture, hosted agent framework, BAML installation, or a compulsory five-document ceremony.

“Full” below means the useful principle is sufficiently captured in documentation for this project's scope. It does not mean installed tooling or measured effectiveness. “Partial” identifies a specific instruction-design gap. “Conditional” is runtime functionality that would apply only if a future requirement actually needs it.

## Reading and inspection coverage

This was direct source reading, with differences used to avoid rereading identical staged copies. No upstream programs, tests, notebooks, network integrations, package installations or agent runtimes were executed. A local read-only inspection helper generated inventory and image contact sheets in the visualization scratch directory.

| Source area | Coverage in this pass |
| --- | --- |
| Root | README substantive argument/resources/license declaration; full CLAUDE.md and Makefile. License identity and declarations inspected as metadata; no legal assessment. |
| Canonical content | All twelve zero-padded chapters, optional appendix 13, complete software-history essay, and all nine one-line legacy redirects. |
| Draft | Complete a2h-spec.md, including unfinished ending and inconsistent object field spellings; ah2-openapi.json verified empty. |
| Agent template | All six TypeScript files; all four BAML files; package.json and tsconfig.json; README compared with cumulative workshop README and canonical YAML. |
| Walkthrough generator | Complete CLI, entry point, original design prompt, README, package/configuration, full Jest end-to-end suite, both utility files, both example YAMLs and all unique example code/configuration. |
| May workshop | Original TypeScript/BAML progression read as the starting files plus every consecutive substantive diff: agent, CLI, server, tests, serialization, state and approval stages. Complete original YAML read. State store, initial configuration and Makefile read. |
| May 17 workshop | Full original-stage diff against May; changes are provider/prompt configuration, not a second independent TypeScript implementation. YAML diff read; generated unique BAML differences inspected. Package and compiler configuration read. |
| July workshop | All unique original Python files and BAML differences; converter; notebook simulation script; log analyzer, output inspector, test shell script, testing document, CLAUDE.md and pyproject.toml. Enhanced-YAML changes inspected. Primary YAML's substantive tutorial text and steps read through the corresponding saved notebook; this was not an independent line-by-line reread of every raw YAML line. |
| Notebooks | Parsed both notebooks. Read all 100 cells in workshop_final.ipynb, using exact original-Python matches to avoid duplicate code reads. It has 40 code cells, null execution counts and no saved outputs. Read the one-cell diagnostic notebook. No notebook execution. |
| Generated sections/final folders | Content hashes and unique-file inventory distinguish copies. All unique generated code/configuration differences identified by that inventory were inspected, including BAML generator versions, package dependency drift and commented client changes. Generated prose/Markdown was checked through its canonical YAML, generator behavior and README diffs, not reread as hundreds of independent authored files. No complete regeneration/equality proof was performed. |
| Images | All 36 PNG files were represented by 30 unique content hashes and visually inspected in contact sheets; factor-12, unified-state and context-engineering figures also viewed separately. Includes three unique email screenshots repeated across workshops. |
| Animation/video | Nine GIFs and four MP4s inventoried. Static counterpart diagrams were viewed. No complete animation/video playback or frame-by-frame audit is claimed. |
| Dependencies | Lockfiles inventoried as dependency metadata, not audited as transitive application source. No translated-language edition directory was found. |
| Contributor helper | Full Python utility and project metadata; empty README. It is an avatar-generation utility, not an agent-quality technique. |

The inventory contains 499 paths. With PNG/GIF/MP4, notebooks, .lock files and every filename ending in lock.json excluded, remaining text has **175 distinct hashes**. The earlier local review's 176 count used the narrower exact package-lock.json exclusion and consequently included 00-package-lock.json. These are different stated filters, not evidence of a missing substantive source. Normal Python path traversal initially missed long paths; the final inventory uses the Windows long-path prefix and reaches all 499.

Material linked background consulted: [Hamel's prompt inspection article](https://hamel.dev/blog/posts/prompt/), [Anthropic's effective-agents article](https://www.anthropic.com/engineering/building-effective-agents), and [BoundaryML's schema-aligned parsing article](https://boundaryml.com/blog/schema-aligned-parsing). These help explain visible prompts, hidden call overhead, deterministic handling and format tradeoffs. They are supplementary webpages retrieved during this pass, not files at the repository pin. Every outgoing link, external video, linked library and historical social post was not exhaustively reviewed.

## Local reference key

All local paths below are relative to this exact project:
C:\Users\User\OneDrive\Documents\Bilal_Migration\User\Downloads\20_PROJECTS\24_Clinic_Workshop

- **review** = docs/agentic-coding/reviews/twelve-factor-agents.md
- **synthesis** = docs/agentic-coding/research-report.md
- **setup** = docs/agentic-coding/repo-setup-proposal.md
- **templates** = docs/agentic-coding/workflow-templates.md
- **routing** = docs/agentic-coding/project-context-routing.md
- **launcher** = docs/prompts/coding-task-launcher.md
- **evaluation** = docs/agentic-coding/evaluation-plan.md

## Canonical principle-by-principle mapping

All external file paths in this table refer to the pinned repository above.

| Principle and source | Meaningful lesson | Local adoption and status | Smallest useful adjustment |
| --- | --- | --- | --- |
| F01, content/factor-01-natural-language-to-tool-calls.md | Translate intent into explicit actions/payloads handled by ordinary software; a complete autonomous loop is optional. | **Full for scope.** synthesis:38, templates:14-27, launcher:16-27 define observable work and acceptance. Runtime dispatch is **conditional**, correctly separated at synthesis:34-41. | Keep observable task contracts. Do not install a dispatcher merely to imitate the example. |
| F02, content/factor-02-own-your-prompts.md:80 | Own readable instructions, version them, and evaluate behavior after prompt changes. | **Partial.** review:33 and synthesis:39 recognize evaluation; setup:44-79 and templates own explicit prompts. evaluation:43-54 mainly lists future coding defects and one handoff case, not instruction/routing regressions. | Add a small set of known-context prompt cases with expected decisions/evidence, including clarification and mid-task continuation. See finding 1. |
| F03, content/factor-03-own-your-context-window.md | Design instructions, retrieved evidence, history, tool schemas and memory together; stored history can differ from the active prompt; protect sensitive information. | **Full core, partial lifecycle.** review:34, synthesis:40, setup:96-100/129, templates:43-62/164 and routing:13-47 preserve bounded evidence and uncertainty. Retirement of resolved failures and context-format comparisons are thinner. | Add the resolved-error rule in finding 3; compare representative compact packets by preserved facts, not an assumed XML advantage. |
| F04, content/factor-04-tools-are-structured-outputs.md | A model's proposed action is data; deterministic code may validate, reject, pause or route it before invocation. | **Full for scope.** synthesis:41/62, review:35 and setup:141-143 explicitly separate named wrappers/checklists from actual enforcement. | Retain real exit/results in future verification tools. Schema validation and authorization are conditional runtime requirements, not missing clinic workflow dependencies. |
| F05, content/factor-05-unify-execution-state.md:32 | Keep one coherent source of current state; enable inspection, serialization and resumption without incompatible parallel state stores. | **Partial.** synthesis:42 and review:36 explicitly say one durable task record, but templates:10/73/90-96/145-159 repeat mutable status, progress, revisions and checks in different optional files. | Define one current task-state owner and treat the other records as linked details/checkpoint snapshots. See finding 2. |
| F06, content/factor-06-launch-pause-resume.md | Persist enough state to resume; selection and execution are separable boundaries, especially before consequential actions. | **Full workflow adaptation.** setup:68-74/77/133 and templates:145-161 retain authority, uncommitted state, checks and exact next action. launcher:29-47 revalidates current implementation. Runtime APIs are **conditional**. | A resume exercise is useful evidence, already represented by E12; absence of an installed resume service is not a missing lesson. |
| F07, content/factor-07-contact-humans-with-tools.md | Represent questions and responses explicitly; ask with relevant context; pause for needed input while preserving state. All-JSON communication is experimental. | **Full core.** review:38, setup:68-77/131, templates:110-111/152/161 and launcher:37-39 ask only material missing questions and preserve prior authorization. | When awaiting an actual decision, retain the precise question and response reference in the canonical task record. No extra approval gate for ordinary edits. |
| F08, content/factor-08-own-your-control-flow.md | Own branching, termination, recovery, logging, waits, compaction and optional deterministic caching rather than blindly looping. | **Full principles, partial observability detail.** setup:81-90/129-143, templates:25-34/95-96 and evaluation:23/65-72 define workflow, limits, actual results and costs. Cached context/prompt composition are not yet precisely specified. | Add only the bounded prefetch/visibility output contract if useful; do not impose a new controller on the existing coding client. |
| F09, content/factor-09-compact-errors.md | Give the model useful errors, revise the next action, limit repeated failures and restructure context to avoid spin-outs. | **Full recovery, partial retirement.** setup:129-131, templates:153-164, review:40. Counts are correctly configurable, not magical three-attempt rules. | Distinguish active failure from resolved historical failure in the handoff. See finding 3. |
| F10, content/factor-10-small-focused-agents.md | Bound scope, responsibilities and run length; expand only while quality holds. | **Full.** setup:121-125, templates:166-177, evaluation:23/31/33. One integration owner; disjoint writes; compact handback; agent review not mislabeled human acceptance. | Keep this. Historical 3–10/20-step heuristics do not need to become universal limits. |
| F11, content/factor-11-trigger-from-anywhere.md | Separate a task from the initiating channel and allow appropriate human interaction. | **Full conceptual fit; channel integrations explicitly not applicable now.** review:42, synthesis:48 and templates:5-35 define a portable task. Slack/email/webhooks remain optional authorized integrations. | Reuse the same task contract across future channels, only when requested. |
| F12, content/factor-12-stateless-reducer.md plus img/1c0 and img/1c5 | A step consumes persisted context and produces updated context through model selection plus deterministic handling. Stateless execution does not erase durable memory or make model output deterministic. | **Full core; shares F05's ownership refinement.** review:43, synthesis:49, setup:133, templates:156-161. The sparse chapter's diagrams were inspected directly. | Use current checkout plus a canonical task record; no event-sourcing framework is necessary. |
| F13, content/appendix-13-pre-fetch.md:3/147 | Fetch predictable read-only inputs deterministically instead of spending model turns deciding to fetch them. | **Captured, partially specified.** review:44/108 and synthesis:50 name bootstrap/doctor and bounded prefetch; routing:15-31 and launcher:19-27 provide the selection map. | Define a short preflight packet/output contract: observed root/revision, selected source IDs, status, affected files and verified commands. The lesson is already present; the refinement is concrete scope and invalidation, not an installation requirement. |
| History essay and README | Add small LLM components to ordinary software; unnecessary abstraction and ever-expanding loops impose quality/cost risks. | **Full.** synthesis:7/34/78-87; setup:9/44/85/156. | Preserve proportionality and avoid importing runtime stacks merely because the reference repository contains them. |

## Lessons in the implementation material

| Source mechanism or limitation | Useful engineering lesson | Existing local transfer |
| --- | --- | --- |
| May 04b/04c-agent.baml; July 04b/04c-agent.baml | Assert output properties, arguments and next steps; test intermediate history and completed history separately. | review:52/71 names assertions, but the workflow's own regression scenarios are **partial**. See finding 1. |
| May 05b/05c-agent.baml; template MathOperationPostClarification | Exercise ambiguity and the response to corrected information. A changed prompt may change an old test's expected behavior. | templates:22/57/110 and launcher:37-39 capture uncertainty handling; instruction-level replay remains **partial**. Contract decides expected behavior; do not merely update the oracle to whatever the model now emits. |
| May 07b-agent.ts; July Thread.serialize_as_json / serialize_as_xml | Stored events and presented context can use different forms. | **Full principle**, setup:129 and templates:164. XML-specific efficiency remains an unproven example, correctly qualified at review:34/82. |
| Template Thread.serializeOneEvent | Raw tag interpolation and object string coercion can corrupt structure/fidelity. | **Full caution** in review:64; no proposed need to copy the serializer. |
| May ThreadStore uses a Map; template FileSystemThreadStore serializes files | In-process continuity, filesystem persistence and safely concurrent durable state are different properties. | **Full caution** in review:60-67 and setup:143. Minor wording refinement: review:52's “persisted thread state” should explicitly distinguish the workshop's in-memory store from the later template filesystem store. |
| Template server outerLoop | Async persistence calls lack await; compile-time casts do not validate requests; approved events execute the current last event without a full authenticated/deduplicated resume design. | **Full caution**, review:60/65-67 and setup:143. Require real handling if a runtime is ever adopted; no present app-runtime gap. |
| Template DetermineNextStep includes ProcessRefund; agentLoop omits its handler and default failure | Structured output unions and dispatch coverage must agree. A prompt asking for approval cannot create execution enforcement. | **Full caution**, review:62, synthesis:41/62 and setup:143. |
| May human-approval stage; template askHumanCLI | Put review before invocation and include the concrete arguments; denial is feedback, not implicit permission. | **Full**, setup:68-77/90 and templates:23/161. Preserve the user's explicit authorization rather than copying confirmation at every phase. |
| May webhook 12/12a/12aa/12b stages | An unfinished callback that appends a response is not end-to-end resumability. | **Full caution**, review:67 and setup:143; continuation, correlation, denial/timeout and repeated delivery would require real behavior checks. |
| July 05-agent.py has max_iterations; 07-agent.py removes it | Adding a feature can accidentally remove an earlier reliability constraint. | **Full recognized limitation**, review:71; setup:131 preserves bounded recovery. Prompt regression examples can additionally test retained constraints. |
| May 17 Qwen3 configuration and /nothink; July stale /nothink comments | Provider workarounds are dated and specific, not universal prompting rules. | **Full**, review:54 and synthesis:82. |
| Multiple BAML generator/package versions; generated final uses baml while other stages use @boundaryml/baml | Generated snapshots and current setup directions can drift; package names and exact pins must match. | **Full**, review:61/74-78, setup:50/139-141. New observation reinforces the existing lesson; no new dependency recommendation. |
| walkthroughgen applyStepsToWorkingDir | Incremental commands run, failures are logged and processing continues; printed “results” are author-provided, not validated output. | **Full**, review:86-90, setup:50/139-141, evaluation:72, launcher:41-44. |
| walkthroughgen Jest suite | Tests prove Markdown content, file copying, incremental command semantics and pre-section snapshots, not model quality or successful tutorial execution. | **Full**, review:90 and evaluation:58/72. |
| Generator examples and package metadata | Advertised global CLI/install/init/build conventions and actual entry point/schema differ; a generated guide can look complete despite incompatibilities. | **Full principle**, review:90; setup:50. Keep verified commands, not copied command names. |
| July converter and notebook helper | Environment-specific workarounds need exact configuration, fresh generated clients and actual artifact output evidence. Fetching main creates moving-input drift. | **Full caution**, review:73-82; setup:50/100/139-141. Do not adopt unsupported “notebooks cannot use async” as a general rule. |
| July simulator and testing.md | Local simulation is not the real hosted environment. Empty saved outputs are not passing tests. Expected log excerpts and absent helper functions are not observed evidence. | **Full**, review:79-82; templates:133-135; evaluation:72. |
| A2H draft and a2h.ts | Separate agent scope from administrative contact details; distinguish requests, status and responder identity. A protocol draft/type declaration is not working enforcement. | **Full appropriate boundary**, review:94 and synthesis:44. A2H service adoption is **not applicable** to current coding workflow. |
| Root CLAUDE.md | Persona paths, source-reading quotas, deletion preferences and frequent commits are generic scaffold, not empirical performance laws. | **Full deliberate non-adoption**, review:96; setup:44-79 and synthesis:54/80-87. |
| Contributor helper, lockfiles and license declarations | Distinguish peripheral utility/dependency metadata from transferable agent mechanisms; resolve copying provenance before importing code. | **Full**, review:22/125-131; synthesis:103. No need to install the contributor helper. |

## Narrow missing or under-transferred instructions

### 1. Give prompt and routing changes their own small regression cases

Evidence: F02 explicitly says to evaluate prompts like code (content/factor-02-own-your-prompts.md:80). The workshop's 04b/04c and 05b fixtures test selected intents, arguments, intermediate state and post-clarification behavior. Local review:33 recognizes this, but evaluation:43-54 evaluates mainly future application changes, while setup:139 proposes only structural document checks.

A link checker cannot detect an agent following the archived D: path, treating a proposal as observed clinic evidence, inventing payer liability, requiring full-source architecture rereading for a typo, or resuming from a stale handoff.

Minimal adjustment: add a compact, versioned table of input context, expected decisions, required source references, prohibited inference and scoring evidence. Include routing, authority conflict, missing policy, prior correction, failed-versus-unrun check, and interrupted-task continuation. Use fresh sessions after material launcher/instruction changes. This adds neither an agent runtime nor application features. It can be exercised at the present documentation stage.

### 2. Specify which file owns current task state

Evidence: F05:32 says one source of state. Local synthesis:42 and review:36 agree, yet templates:10 carries status, plan:90-96 carries progress/results, and handoff:145-159 carries status, files, checks and next action.

These optional files can all be sensible views, but the templates do not say which is authoritative when one was updated later or a resumed worker observes a conflict. The risk is duplicated mutable state, not merely having several documents.

Minimal adjustment: task.md owns current task status, next action and pointers to selected plan/review/latest checkpoint. Research is evidence; plan is selected design; handoff is a timestamped snapshot with revision and state pointer. Before resuming, compare it with the checkout and canonical task state. Alternatively use one task file for small work. Do not require every template.

### 3. Retire resolved error details from active context

Evidence: content/factor-03-own-your-context-window.md:230 explicitly discusses hiding resolved failures; factor 9 permits restructuring/removing previous context. setup:129-133 stores concise errors and full logs, and templates:153-164 preserves failures, but neither states when resolved failure detail should leave the active packet.

Minimal adjustment: keep unresolved failures with command/exit/diagnostic/hypothesis; after an issue is fixed and the relevant check passes, keep a short resolution, any lasting constraint and the log link. Do not carry obsolete stack traces and failed hypotheses into every handoff. Preserve logs for audit; never erase a failure to make acceptance history look clean.

### 4. Make the existing prefetch proposal specific without expanding scope

Evidence: appendix 13 says deterministic retrieval avoids an unnecessary model turn. review:44/108 and synthesis:50 already transfer it; the launcher still expresses a reading route rather than a packet contract.

Minimal adjustment: specify a bounded preflight result containing observed workspace/revision, requested task, selected USER/A/Q/S/T references and statuses, relevant source/code/test paths, actual supported commands and missing prerequisites. Batch predictable read-only checks; refresh only changed dependencies. This is **a refinement of an already-learned lesson**, not evidence that the repository forgot factor 13 or must install a new tool.

### 5. Keep prompt visibility and format experiments honest

F02/F03 and the linked Hamel article support inspecting what the model actually receives and how many calls an abstraction makes. The local package already rejects black-box frameworks and counts worker time/cost. It is less explicit about distinguishing a hand-authored packet from the effective prompt actually delivered by the client, and about validating compaction's retained facts.

Minimal adjustment: where supported, record the instruction/packet revision and accessible delivered-context trace with sensitive data excluded. Record availability limits rather than claiming access to hidden client context. Compare compact representations using identical information and fact-preservation checks. Character counts in July 07-agent.py are not token counts; shorter XML is not automatically better context quality. Do not install a traffic-interception proxy or change the user's client merely to obtain telemetry.

## What not to add

- HumanLayer, BAML, A2H, a webhook service, Kubernetes, CRM/email approval channels or a second agent runtime solely to “use all factors.”
- Blanket 1500-line reading requirements, arbitrary commit cadence, universal 3–10-step limits, or forced raw chain-of-thought output.
- A requirement to implement all proposed workflow tooling before doing useful authorized work.
- Architecture changes unrelated to this source-adoption question.
- A multiplier claim from source anecdotes, static diagrams, generated Markdown, unexecuted notebooks or dependency presence.

The source's strongest lesson is control and inspectability with proportionate complexity. The local documentation already reflects that lesson. A few explicit lifecycle and regression rules would complete the transfer more effectively than adding another large process layer.
