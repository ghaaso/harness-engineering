# HumanLayer/GenSX source-adoption audit

Integration note: this delegated report is preserved as supporting evidence for the [main audit](../source-adoption-audit.md). Its local line references and proposed corrections describe the pre-correction source review. The main audit subsequently applied G-F1/G-F2 to that review; statements below about no project edits refer to this delegated source-reading pass.

Reviewed 1 October 2026. Scope: what the linked GenSX example and directly relevant dependency/documentation evidence establish, and how accurately and fully the local agentic-coding documentation captures those lessons. This is not a clinic architecture assessment.

## Verdict

The local review captures the repository's broad purpose, execution-boundary approval pattern, incomplete package/webhook sketches, generated instructions, compilation exclusions, dependency pins and prototype limits. Its selective non-adoption of an additional runtime is reasonable. However, stopping at the example's own files misses behavior hidden in its locked dependencies. Following those boundaries produces two material corrections/additions and several useful lessons about error propagation, concurrency, context accumulation, dependency injection and trace semantics.

No framework was installed, no downloaded code was executed, and no external model, approval, message or workflow was run. Findings below are static deductions against exact published versions; tests in dependency packages were read, not executed.

## Coverage and provenance

Primary example: [dexhorthy/humanlayer-gensx-example at ea977e3a6abbbe0f56e7dfaff5daff889bb0ddc9](https://github.com/dexhorthy/humanlayer-gensx-example/tree/ea977e3a6abbbe0f56e7dfaff5daff889bb0ddc9).

Pinned local source root:

`C:\Users\User\.codex\visualizations\2026\09\30\01a0f24d-ce7d-7471-a139-511bca6ff58d\agentic-coding-research\sources\dexhorthy--humanlayer-gensx-example\humanlayer-gensx-example-ea977e3a6abbbe0f56e7dfaff5daff889bb0ddc9`

All 11 files were covered: 10 authored files, 695 lines in total; one generated 1,458-line lockfile parsed completely as dependency data. No images, videos, tests, CI or other original files exist in this snapshot.

| File | Lines | Coverage |
| --- | ---: | --- |
| README.md | 19 | Complete: scaffolding origin, install/dev instructions and edit path. |
| CLAUDE.md | 119 | Complete: managed section, commands, naming/style, component/provider/child-function examples, OpenAI/Anthropic/MCP snippets and placeholder custom section. |
| gensx.yaml | 5 | Complete: generated project metadata; description remains literal undefined. |
| nodemon.json | 7 | Complete: src-only watch and workflow execution on change. |
| package.json | 31 | Complete: module mode, scripts, engine, direct dependencies, metadata and license. |
| tsconfig.json | 27 | Complete: strict checking, NodeNext, custom JSX runtime, output directory and src-only include. |
| src/index.tsx | 119 | Complete: both tool definitions, SDK wrapper, prompts/model, provider and workflow invocation. |
| pkg/@gensx/humanlayer.ts | 53 | Complete: wrapper sketch and human-as-tool adapter. |
| pkg/@gensx/humanlayer-webhook-state.ts | 110 | Complete: request/pause boundary, fake state and comments-only continuation. |
| pkg/@gensx/weather-example-with-pkg.tsx | 105 | Complete: alternative composition and use of the package sketch. |
| package-lock.json | 1,458 | Parsed all 107 package records and all fields; inspected complete dependency/version/engine/peer/optional/install metadata as a graph, not as authored implementation. |

Lock observations: 106 resolved artifacts, all registry.npmjs.org; each has an integrity field. Root plus 106 artifacts; 59 dev-marked entries; 26 optional entries; 25 platform-specific esbuild binaries; 2 install-script entries (esbuild and optional Darwin fsevents). Direct runtime pins: @gensx/core 0.3.7, @gensx/openai 0.1.19, humanlayer 0.7.6, openai 4.90.0. TypeScript 5.7.2, tsx 4.19.3 and nodemon 3.1.9 are development tools. Zod 3.24.2 is imported directly by source but supplied transitively. The root's Node >=18 claim is wider than ini 5.0.0's ^18.17.0 || >=20.5.0 range. These observations do not constitute a vulnerability audit.

Dependency follow-through was necessary to resolve delegated behavior. Exact published archives were downloaded as inert source artifacts, not installed:

- `C:\Users\User\.codex\visualizations\2026\09\30\01a0f466-982e-79e3-8509-60da5cd00cde\gensx-source-audit\humanlayer.tgz`
- Same directory: `gensx-openai.tgz`, `gensx-core.tgz`.
- Each archive's SHA-512 matched the original example lockfile integrity, and SHA-1 matched npm metadata. HumanLayer SHA-1: 13c74c53461b5b9bd5873d056c33433b7986634b. GenSX OpenAI: f31829d35c33c69157978b3927cbded92be737fe. GenSX core: a360fb71e3f22864ec525d1c9c4b639191ec3536.
- HumanLayer npm metadata identifies source commit df4a0e761f6a3db79080773bacfd867ce4c1dcc0.
- npm provenance metadata for both GenSX packages identifies source commit 65fcf3c36bcd27bf72cc4bb98da32d2d0096ab28. The provenance statements were decoded; their signatures were not independently verified.
- Registry metadata, attestations, archives and extracted package files are saved in that scratch directory.
- Targeted dependency reading: HumanLayer approval source and matching exported ESM implementation, approval tests, protocol, README and package exports; GenSX tools, completion dispatch, provider, workflow/execute, component, JSX runtime and core README; selected checkpoint/config paths concerning recording, export, configuration and masking. This is not a claim to have audited every file of all three dependencies.

Important source links embedded in the example were followed. The live Vercel adapter and response-webhook documentation links now return 404. Their historical forms were recovered at HumanLayer's package commit: [adapter](https://github.com/humanlayer/humanlayer/blob/df4a0e761f6a3db79080773bacfd867ce4c1dcc0/humanlayer-ts-vercel-ai-sdk/src/approval.ts), [webhook documentation](https://github.com/humanlayer/humanlayer/blob/df4a0e761f6a3db79080773bacfd867ce4c1dcc0/docs/core/response-webhooks.mdx). Both were read fully. The GenSX homepage was inaccessible via the browsing tool; the versioned package README supplied framework/composition documentation instead. Tertiary FastAPI examples linked by the webhook document were not exhaustively audited because no webhook implementation is being adopted.

## Local document anchors

All local project paths below are under:

`C:\Users\User\OneDrive\Documents\Bilal_Migration\User\Downloads\20_PROJECTS\24_Clinic_Workshop`

- **R:** `docs/agentic-coding/reviews/implementation-examples.md`.
- **S:** `docs/agentic-coding/research-report.md`.
- **P:** `docs/agentic-coding/repo-setup-proposal.md`.
- **T:** `docs/agentic-coding/workflow-templates.md`.

Line anchors refer to the inspected versions. Full path example: [R:29](implementation-examples.md) (line 29).

Categories: **covered** means captured adequately in local documents, not implemented in a runtime; **partial** means recognized but under-specified or incomplete; **missing** means an important concrete lesson is absent; **not applicable** means intentional non-adoption appropriate to a coding-workflow study. A correction can coexist with a partially covered idea.

## Execution flow established by reading

The default command loads one TypeScript file. That file checks the HumanLayer API key, creates a client and shared in-process weather map, creates one read tool and one mutating tool, wraps the mutation, and constructs Respond beneath OpenAIProvider. Respond sends a generic system prompt and the given request to the fixed model with those two tool definitions. The workflow runs one hardcoded request and prints the returned text.

In the locked GenSX implementation, schemas become JSON tool definitions; model tool arguments are parsed and schema-validated by the dispatcher. All tool calls in a single response are dispatched concurrently. Their results become tool messages; the next model call receives the growing history. Tool errors throw out of this path. The loop stops when a completion supplies no tool calls; the example does not add a step, token or time limit.

The HumanLayer wrapper creates an approval request and polls the backend. Approval executes the original mutation. Denial returns textual feedback without executing the mutation. The example's outer tool callback discards that returned feedback and instead returns the map value. This distinction between enforcing an action and accurately reporting the action result is important.

## Two material findings requiring local documentation changes

### G-F1: Preserve denial feedback across an otherwise enforcing wrapper

**Confidence: high; static evidence, not a live trial.**

[Example src/index.tsx:79](https://github.com/dexhorthy/humanlayer-gensx-example/blob/ea977e3a6abbbe0f56e7dfaff5daff889bb0ddc9/src/index.tsx#L79) awaits the decorated mutation but discards its return value; line 80 returns the current map entry. [HumanLayer approval.ts:198-204](https://github.com/humanlayer/humanlayer/blob/df4a0e761f6a3db79080773bacfd867ce4c1dcc0/humanlayer-ts/src/approval.ts#L198) returns denial text when approval is false. The same behavior appears in the package's exported ESM at `humanlayer/package/dist/index.mjs:273`. Its denial test expects that text.

Consequently, the side effect is prevented, but the denial and human comment never reach the model through the tool response; it sees existing weather data instead. Do not infer that the model definitely claims success; the observable static problem is lost outcome information.

R:23 correctly recognizes enforcement, while R:55 explicitly leaves dependency behavior unaudited. Neither R:21-55 nor S:58-62 identifies this lost return value. This is a **missing** lesson, not evidence that the actual SDK wrapper is a no-op.

Transfer: review both directions of every adapter—validated inputs into the effect and all meaningful results back to the caller. Where applicable, preserve explicit approved/denied/failed/pending outcomes; test rejection and comments through the whole adapter rather than only proving no write occurred. For coding workflows, the parallel lesson is to retain rejected decisions and relevant feedback in task state; a completed tool call is not necessarily an accepted action.

### G-F2: Correct the claim that the sketch directly executes the original mutation

**Confidence: high for omitted enforcement and receiver mismatch; no runtime failure was observed.**

R:29 correctly says the package adapter never invokes HumanLayer, but goes further and says its protected-looking use directly executes the mutation. That stronger outcome is not supported by the locked implementation.

The [sketch at humanlayer.ts:25-30](https://github.com/dexhorthy/humanlayer-gensx-example/blob/ea977e3a6abbbe0f56e7dfaff5daff889bb0ddc9/pkg/%40gensx/humanlayer.ts#L25) forwards a method reference. In the exact [GenSX tools.tsx:45-56](https://github.com/gensx-inc/gensx/blob/65fcf3c36bcd27bf72cc4bb98da32d2d0096ab28/packages/gensx-openai/src/tools.tsx#L45), the constructor invokes that callback as a member of its parameter object, while the forwarded method relies on its receiver's executionComponent. The parameter object has no executionComponent. The emitted code has the same structure at `gensx-openai/package/dist/tools.js:31-37`; GenSX JSX code reads the supplied component's name at `gensx-core/package/dist/jsx-runtime.js:71`.

Static deduction: that path loses the original receiver and is expected to fail before reaching the original tool body. No error was reproduced at runtime. Correct R:29 to: the adapter does not enforce approval and also appears broken against its locked GSXTool API; it must not be treated as a functioning protected adapter. Keep S:58's narrower description that the callback is copied and approval is absent.

Transfer: thin wrappers must preserve receiver binding, complete result/error semantics and relevant metadata/options. Similar method names and generic type compatibility are insufficient evidence of substitutability. Follow an adapter into its versioned dependency and include the affected adapter in check scope.

## Exhaustive source-to-local transfer matrix

Each row represents a distinct mechanism or material limitation, rather than counting all lines as equally important.

| ID | Source mechanism / lesson and exact anchor | Local capture | Status and useful action |
| --- | --- | --- | --- |
| G01 | Read and write operations are separate; only the effect is decorated. Example src/index.tsx:27-32,47-82. | R:21-25; S:58-62; R:135. | **Covered.** Retain enforcement at the actual call boundary; no reason to require every read to pause. |
| G02 | Denial is a result with human feedback; example discards it. Example :79-80 plus locked HumanLayer approval.ts:198-204. | R:23,55; S:58-62 mention wrapper but not lost feedback. | **Missing.** Add G-F1 and an end-to-end denial/result check to adapter review examples. |
| G03 | Package-style adapter is explicitly a sketch, with no actual approval call. pkg/@gensx/humanlayer.ts:1-12,25-30. | R:27-31; S:58. | **Covered in principle; partial/correction needed.** Retain absence-of-enforcement finding; correct the direct-execution overclaim through G-F2. |
| G04 | Receiver-dependent method forwarding is not transparent. Locked tools.tsx:45-56; package sketch :30. | Not traced locally. | **Missing.** Add receiver/result/metadata fidelity to the concrete adapter lesson. |
| G05 | Name, description, schema and executable behavior are co-located. Example src/index.tsx:56-82; locked tools.tsx:26-43. | R:25; S:15,41. | **Covered.** A small explicit interface keeps local reasoning manageable. Framework syntax itself is optional. |
| G06 | Runtime validation lives in the dispatcher, not in the existence of a Zod schema. Locked tools.tsx:114-123; direct run :54-56. | R:25 supplies structural description; S:41 warns schemas are not enforcement. | **Partial.** State the actual enforcing path; direct use of run does not itself perform that dispatcher validation. Distinguish shape checks from semantic/authority checks. |
| G07 | Same-turn tool calls run via Promise.all, despite visually linear declarations. Locked tools.tsx:106-135. | R:21 delegates the loop to dependencies; no scheduler account. P:121-125 covers independent coding delegation generally. | **Missing concrete example.** Do not infer effect ordering from source declaration/JSX order or approval timing. Inspect scheduling before parallelizing dependent effects. |
| G08 | A tool's malformed JSON/schema error or thrown exception rejects dispatch; it is not appended as a recoverable tool result here. Locked tools.tsx:109-132. | P:129-131 has a good general recovery pattern; R:55 leaves SDK behavior open. | **Partial.** Add the explicit distinction between runtime throwing, model-visible errors and recovery policy; no claim that this sample self-heals. |
| G09 | Tool-result correlation uses tool_call_id and messages retain each result. Locked tools.tsx:123-127,162-190. | R:21; R:45 identifies run/tool/argument binding for future resumes. | **Partial.** Preserve result identity and correlate it with exact calls in evidence; this is more than generic logging. |
| G10 | Tool history grows by appending assistant/tool messages until there are no more tool calls; no compaction or iteration cap in this locked loop. Locked tools.tsx:146-190. | R:55 notes absent application-level step budget; S:40,45-46 propose context/recovery discipline. | **Partial.** This example does not implement the proposed context management; document the negative control and locate where a budget/compaction boundary would have to live. |
| G11 | HumanLayer backend approval polls at 3-second intervals until a decision; no overall deadline in this method. Locked approval.ts:169-206. | R:55 notes no app retry/budget; R:41 discusses sketch timeout. | **Partial.** Separate HTTP timeout, approval waiting deadline and tool/model loop budget. A network timeout option does not establish an end-to-end deadline. |
| G12 | Prompt/model are explicit versioned call-site inputs; the example's generic prompt and fixed model are not a measured policy. src/index.tsx:84-98. | R:21,51; S:39. | **Covered.** Keep prompts near their execution contract, but do not copy model choice or imply benchmarked quality. |
| G13 | Tools retrieve one city result rather than injecting the whole weather map into prompt text. src/index.tsx:34-65,90-98. | R:21 describes mechanics; S:40 and P:96 cover relevant context generally. | **Partial positive transfer.** Articulate narrow retrieval as a concrete context-selection example; no 5x result is measured. |
| G14 | Workflow, Respond, provider and tools have separate input/output boundaries. src/index.tsx:15-18,84-110; CLAUDE.md:37-83. | R:25; S:15. | **Partial.** Co-location is recorded, but a compact flow diagram or typed handback example would better operationalize composition. It does not require installing JSX. |
| G15 | JSX is a backend workflow runtime, not a React UI; children functions carry prior outputs, and providers scope clients/configuration. tsconfig.json:16-18; CLAUDE.md:54-83; locked core README and jsx-runtime.js:33-68. | R:25,53 mention provider/composition examples without explaining execution semantics. | **Partial.** Describe this distinction when teaching the example; use explicit data dependencies, not UI assumptions. Syntax choice is **not applicable** as clinic/tooling requirement. |
| G16 | A new Workflow.run creates a new execution context, but weather remains module-global. src/index.tsx:34-46,112-119; locked core execute.js:14-36. | R:55 already notes no run/user isolation and restart loss. | **Covered at outcome level.** It now has dependency evidence; fresh execution context is not fresh application state. |
| G17 | humanAsTool is separate from approval and delegates a message to a channel-configurable SDK method. package adapter:33-43. | R:31; S:44. | **Covered.** It is unused by a runnable example and should not justify a human-contact service for coding work. |
| G18 | Webhook sketch checkpoints before requesting approval, records a state ID, then stops; resume is not implemented. webhook-state.ts:22-100. | R:33-45; S:58; P:143. | **Covered.** Keep state reference, exact proposed operation and continuation separate; the saved comment is not durable execution. |
| G19 | Historical linked webhook docs distinguish several operation-ID choices, external storage versus state echo, and simpler decorator/fetch alternatives; signature validation is still a TODO in shown handler. linked response-webhooks.mdx:9-19,34-104,112-138. | R:41,45 covers missing implementation safeguards; no direct linked-doc choice/tradeoff discussion. | **Partial.** Add why webhooks are intentionally deferred and why a documentation snippet is not a completed secure implementation. This is conditional runtime learning, not a required coding feature. |
| G20 | Component nodes expose inputs/outputs/errors for tracing. Export needs configured GenSX credentials/org; printUrl alone does not enable it. core checkpoint.js:52-76,178-244; example :116. | R:55 broadly calls these observability examples and warns about data leaving. | **Partial.** Explain configuration-dependent trace recording and its evidence value. Do not claim this run produced a trace. |
| G21 | Trace serialization replaces functions and uploads an execution tree; it is not a crash-resume interpreter. core checkpoint.js:182-228; webhook sketch :49-100. | R:33-45 correctly denies durable resume but does not distinguish library checkpoints from resume state. | **Partial.** Separate diagnostic snapshots, business-state durability and executable continuation. |
| G22 | Provider marks apiKey as secret input, while application content needs separate treatment; tool code also uses console logs. openai.js:5-11; core component.js:17-33; example :20,28,48. | R:55; T:164 says omit sensitive material from handoffs. | **Covered general rule, partial mechanism.** Key masking is not proof every payload/output/log is safe; no broad privacy audit claimed. |
| G23 | Build and watch scope exclude all package sketches. tsconfig.json:21-26; nodemon.json:2-6. | R:49; S:58,62; P:50,141. | **Covered strongly.** Check the files actually changed; successful unrelated compilation proves little. |
| G24 | dev/start execute the workflow and potentially invoke model/approval APIs; dev repeats on src changes. package.json:9-12; nodemon.json:6; src/index.tsx:112-119. | R:49 describes commands; R:138 labels effectful integration commands generally. | **Partial.** In the example review explicitly classify build versus paid/network/effectful start/dev; generated README calls it a dev server but it is a one-shot workflow under a watcher. |
| G25 | A managed instruction section can be overwritten; custom project facts belong outside it. CLAUDE.md:3-5,117-119. | R:53; P:46-79 avoids drifting instruction copies. | **Covered.** Preserve manual facts and generated/framework snippets as separate sources. No requirement to adopt this client-specific file. |
| G26 | Generic memory contains unused provider/MCP examples and no actual project behavior, credentials or safe-check coverage. CLAUDE.md:86-114; source app/manifest. | R:53; P:48-50. | **Covered.** Replace generic examples with verified facts and relevant routes; no value in copying every snippet into persistent context. |
| G27 | Pins/transitive dependencies/engine ranges and lockfile integrity matter independently of README instructions. package.json:6-29; lock:452,467,989,1002,1184,1439. | R:51,66; S:103; P:50,149. | **Covered.** Source metadata is evidence, not current compatibility or a successful install. |
| G28 | The actual SDK offers injectable backend/ID/sleep for local tests, even though the example has no tests. locked approval.ts:34-45,58-98 and approval_require_approval.test.ts. | R:49 correctly says example has no suite; R:74 and S:66 learn dependency injection from the separate enterprise source. | **Partial positive transfer.** Add a credential-free testing seam as another way to investigate approvals and denial propagation. This need not adopt either framework. |
| G29 | No success criterion checks the final text against the mutation/denial outcome; final output is plain text. src/index.tsx:17-18,112-119; locked gsx-completion.js final content projection. | R:49 absence of tests; R:139 end-to-end acceptance lesson. | **Partial.** A returned answer is not acceptance evidence; check effect and report consistency separately. |
| G30 | Unknown-city read supplies a numeric default plus unknown conditions; schemas accept arbitrary city/conditions text. src/index.tsx:47-61,71-76. | R:21 notes default; S:41 distinguishes semantic validation. | **Covered generally / partial concrete example.** Type-valid output can still express fabricated defaults. Preserve unknown status rather than equating schema validation with factual quality. |
| G31 | No measured context/productivity evaluation, no deployment, no persistence implementation; license file absent despite package metadata. Whole inventory; package.json:19. | R:3,15,49-55,142; S:97,103-105. | **Covered.** These are examples, not a benchmark or production certification. |
| G32 | GenSX/HumanLayer installation, hosted approval, external contacts and a webhook service are optional runtime choices. Original README and example imports; historical webhook introduction. | S:7,15; P:9,143,156; R:45. | **Not applicable as mandatory coding-workflow infrastructure.** Their non-adoption is deliberate and should not count as lost potential. |

## Highest-value learning still to capture

1. Correct the source-to-runtime overclaim in R:29; preserve the broader warning about non-enforcing wrappers.
2. Add the lost-denial-feedback case. It shows why a control can enforce an effect correctly while its surrounding adapter still misleads the caller.
3. Trace the exact dependency boundaries for validation, concurrency, errors and loop growth. Those mechanisms are invisible in the small JSX entrypoint and determine whether the conceptual 12-factor advice is actually implemented.
4. Explain trace snapshots versus resumability, including the conditional trace configuration. A method called checkpoint is not proof of recovery.
5. Extract the positive patterns beyond warnings: co-located schema/behavior, bounded retrieval, explicit typed composition/provider context, and injectable backend/clock-like services for deterministic tests.
6. Explain the deliberate exclusions. Not installing GenSX, webhooks or hosted approval is not a weakness in a repository workflow; failing to extract these simpler invariants would be.

A compact dependency-boundary checklist in the existing review template would cover most of this: input validation; effect/authority boundary; every result/error path; scheduler/order; state lifetime; retry/loop/deadline owner; observable evidence; check coverage; and relevant dependency version. Apply it when adapting wrappers or effectful integrations, not to every document edit.

## Suggested precise corrections (not edits made)

Replace the overly certain second sentence of R:29 with a statement that the wrapper never invokes approval and also forwards a receiver-dependent method without preserving its receiver, so it is not a working protected adapter against the locked API. State that execution failure is a source deduction, not an observed test result.

Add a short paragraph after R:23 explaining that the real SDK prevents denied mutation, but the example discards denial feedback in its outer callback. Reference exact locked SDK implementation and distinguish effect enforcement from result correctness.

Amend R:55's prior dependency-audit limitation with a dated addendum covering only the inspected dependency paths. Keep its original historical status; do not turn new static inspection into a claimed live SDK test.

No changes were made to project documentation in this delegated audit. All new source artifacts and this report are outside the project.
