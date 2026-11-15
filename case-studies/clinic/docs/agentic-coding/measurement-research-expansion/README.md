# Trustworthy coding-workflow measurement: extensive research

Date: **2 October 2026**. Status: research synthesis and amended implementation proposal; no installed measurement system, live calibration, new coding benchmark or demonstrated improvement. [WF-04 task and verification](../../tasks/workflow-measurement-expansion/task.md) own current state. This extends [WF-03](../measurement-research.md) under the user's explicit request for multiple research agents and accurate, honest measurement.

The recommendation is to adopt established measurement and evaluation methods, reuse maintained evaluation/instrumentation tools where they qualify, and validate the entire chain from observations to decisions. We should build only the task-specific contracts and missing accounting glue. Neither a familiar dashboard nor a published standard makes an inappropriate metric accurate.

## Research package

| Report | Main contribution |
| --- | --- |
| [Methods and standards](methods-and-standards.md) | GQM, published ISO measurement/quality frameworks, ACM evidence standards, calibration, uncertainty, assignment/failure policies and inference |
| [Coding quality and evaluators](coding-quality-and-evaluators.md) | Test-oracle validity, property/stateful/differential/mutation methods, security and changeability evidence, maintained stack-specific tools and benchmark flaws |
| [Tools and integration](tools-and-integration.md) | Native evaluation providers, maintained Codex trace adapters, pinned source behavior, missingness/default traps, alternatives and adoption gates |
| [Trust and validation](trust-and-validation.md) | Decision-to-measure map, independent reference fixtures and G0-G8 qualification for the measurement system itself |
| [Source coverage](source-coverage.md) | Track-level inspected evidence, root checks, retrieval failures and limits |

Three agents researched distinct tracks; root integrated and cross-checked decision-changing sources. Automated research review remains distinct from independent human review. Broad source coverage is not a local product trial or a claim that every linked standard, repository or appendix was read in full.

## What “industry approved” can reasonably mean here

There is no single approval authority for an AI coding-workflow measurement stack. Use three evidence categories explicitly:

- **Published formal standards:** ISO/IEC/IEEE 15939:2017 addresses the measurement process; ISO/IEC 25010:2023, 25019:2023, 25023:2016 and 25040:2024 address quality models, measures and evaluation. The research inspected official public scopes/status, not all normative clauses. They inform the design without establishing ISO conformance.
- **Established methods and professional guidance:** GQM, ACM SIGSOFT evidence standards, NIST measurement/risk frameworks, original testing research and OWASP ASVS provide usable methods/checklists, with different scopes. Domain-specific tolerances and test oracles still need justification.
- **Maintained software:** native providers, test libraries and trace adapters have official documentation/source/release evidence. Their actual compatibility, field semantics, privacy, completeness and operating cost remain local qualification questions.

The [methods report](methods-and-standards.md) records edition/status limits, including revision of ISO 15939 and 25023. Draft replacements are not adopted final standards. The public [ISO 15939 scope](https://www.iso.org/standard/71197.html) is useful for information-needs and validity; [ISO 25040's scope](https://www.iso.org/standard/83467.html) explicitly leaves specific test methods to the evaluator.

## Evidence that changes the previous proposal

| Decision | Earlier WF-03 position | Current proposed decision and evidence |
| --- | --- | --- |
| D01: metric selection | Provenance, formulas and coverage fields | Add a GQM decision/question/metric specification, scale and validity argument before collection. [Methods §§2-3](methods-and-standards.md). |
| D02: runner reuse | Owned CLI JSONL wrapper leading candidate | Qualify Promptfoo's documented native Codex SDK/app-server providers before duplicating dispatch, dataset/assertion and export mechanics. Owned CLI remains fallback/reference. [Tools report](tools-and-integration.md). |
| D03: operational trace capture | Supported events preferred; custom versioned rollout fallback possible | First inspect maintained Langfuse/Phoenix Codex adapters against selected-stream, privacy, interruption and worker-attribution requirements. Their presence replaces the assumption that rollout parsing must be written from scratch. Reconcile source records/counters/expected children independently; successful delivery alone does not establish completeness. |
| D04: provider completeness | Null versus zero required by our contract | Preserve raw allowed presence/scope before normalization. Native tool defaults can convert absent fields or replay execution into zeros. No-assertion success is not task acceptance. |
| D05: independent acceptance | Frozen tests/holdouts and required review | Qualify the oracle on independently established defective and alternative correct artifacts; add risk-to-case mapping, required case IDs and invalid/evaluator-unavailable outcomes. [Quality §§1,8](coding-quality-and-evaluators.md). |
| D06: holdout protection | Holdouts outside worker checkout | Prove inaccessibility under actual filesystem, mounts, network and Git-history permissions; another folder/hash alone does not protect answers. |
| D07: comparison unit | Whole task/trajectory; “equal accepted sets” phrase in design | Compare all assigned eligible work and retain its effort. Filtering after assignment to common successful tasks can bias results. Current design/protocol wording is corrected. [Methods §4](methods-and-standards.md). |
| D08: quality preservation | Predeclared quality tolerances | Specify a meaningful noninferiority/equivalence margin and adequate precision; insignificant difference is insufficient. Critical corruption remains a separate gate. |
| D09: self-validation | Parser/accounting self-tests and live calibration | Add reference provenance, false-accept/false-reject checks, uncertainty separation, missingness/coverage and an assurance record with drift/recheck triggers. [G0-G8](trust-and-validation.md). |
| D10: application-quality tools | General acceptance/review design | Use selected native tests and maintained diagnostics; add property/stateful checks and targeted mutation for actual risks. Test transactional behavior on real PostgreSQL boundaries if that proposed stack is adopted. |
| D11: public benchmark evidence | SWE-bench harness patterns and correctness limitations | Keep transport/evaluator ideas, with stronger current audit caveats. OpenAI's July 2026 audit withdrew its earlier SWE-bench Pro recommendation. Public rank cannot validate local workflow quality. [Quality §8](coding-quality-and-evaluators.md). |
| D12: implementation order | M00-M01 plus synthetic M04; custom module decomposition | Start measurement/oracle contracts and H00 maintained-tool qualification. Implement only uncovered reconciliation, time/worker attribution and eligibility needs, then calibrate one live route. |

These are research-based proposal amendments, not runtime selections already installed or client-approved clinic business rules. The [current system design](../measurement-system-design.md), [implementation slices](../measurement-implementation-plan.md) and [evaluation protocol](../evaluation-plan.md) carry the dependent corrections. Prior source files, technical architecture and WF-01/WF-02/WF-03 task evidence retain their history.

## Proposed minimal stack and adoption gates

| Layer | Leading approach | Why and qualification boundary |
| --- | --- | --- |
| Measurement process | GQM plus tailored ISO 15939 concepts and the relevant ACM benchmarking/human-study checklist | Connect decisions to measures; preserve workload, units, failure policies and analysis. No formal conformance asserted. |
| Controlled evaluation | Promptfoo native Codex provider, pinned version after H00 | Existing provider/assertion/export mechanisms can reduce custom code. Assert on the submitted code/state with a protected evaluator, rather than only final prose. Require explicit oracles and actual case results. |
| Operational observation | Conditional maintained Codex trace adapter | Langfuse plugin is a strong candidate for interruption/child reconstruction; Phoenix's adapter offers another route with different coverage. Qualify scope/minimization/retention and failure evidence first. Existing Desktop capture is unverified. |
| Code correctness | Existing workflow checks; later selected application's native tests plus reviewed reference models/Hypothesis where appropriate | Reuse known commands. Future clinic tests require implemented contracts and actual database/UI boundaries; do not migrate the current suite just to change runners. |
| Diagnostics | Selected lint, branch coverage and dependency advisory checks; targeted mutation/browser/security tools as prerequisites justify | Report confirmed defects, exclusions and scope separately. No universal percentage or score certifies quality. |
| Storage/reporting | Portable sanitized manifests/events/results and deterministic offline derivation | Keep task/attempt/worker identity, original presence, active-human intervals and claim gates where products do not provide them. Reports remain rebuildable and evidence-linked. |
| Analysis | Prespecified design with established statistical implementations when needed | Independent units, assignment, quality margin and missingness determine the method. Do not implement ad hoc inference or treat a library result as validation. |
| Shared UI | Deferred until repeated team need and validated evidence | Langfuse/Phoenix/MLflow can serve specific roles; do not deploy multiple services to solve undefined units or unobserved effort. |

The tools report also assesses Inspect AI, MLflow, OpenTelemetry, Harbor and the listed observability products. Their different integration/runner assumptions mean there is no benefit in adopting them all. A dashboard can inspect traces; a code oracle decides whether the artifact satisfies a requirement; an experimental design determines what improvement claim follows. Keep those responsibilities distinct.

No maintained product inspected here automatically supplies this project's confirmed business rules, active human effort, complete cost attribution and causal validity. That is why a small project-specific contract/accounting layer remains justified after tool qualification. It must expose unknowns and retain failed work rather than manufacture a comforting quality score.

## How results should read

Use a report with separate acceptance, defects/severity, regression/changeability, human effort, latency, resources, coverage and uncertainty. A qualitative rubric can be useful but is not a ratio scale: a score of 4 cannot automatically mean twice the quality of 2.

| Evidence level | Honest statement | Unsupported leap |
| --- | --- | --- |
| Contracts/reference replay qualified | “Accounting matches these independent fixtures.” | “All live task resources are measured.” |
| Selected live route calibrated | “This source captures these identified events, with stated gaps.” | “Every Desktop/child/reviewer is observed.” |
| Task evaluator calibrated | “This artifact passed the named contract and selected checks under these conditions.” | “The software has no defects.” |
| Representative feasibility recorded | “Observed point estimates, failures and overhead suggest this mechanism may help.” | “The workflow is generally 3x better.” |
| Confirmatory evidence supports a defined threshold | “The prespecified interval supports this dimension and population, with quality gates satisfied.” | “All quality, productivity and context improved by the same multiplier.” |

A comparison must be able to conclude improvement, harm or inconclusive evidence. Report missing observations next to the affected results; unknown human effort prevents a human-productivity claim, even if acceptance is known. Saved tokens with worse task acceptance or extra human repair must remain visible.

## Concrete next implementation scope

Scope clarified on 5 October 2026: the selected first task is **M00 plus one H00 offline fit result**, including independently established sanitized arithmetic/oracle fixtures. The [measurement plan's first-task section](../measurement-implementation-plan.md#first-implementation-task-to-make-concrete) owns its detailed deliverables and stop condition; [WF-04](../../tasks/workflow-measurement-expansion/task.md#next-action) owns continuation state. Stop after the contracts, independent references and one pinned reviewed offline fit, with gaps explicit. Reusable M01 normalization, M02 ongoing acquisition, M04 reporting infrastructure, M03 live calibration and comparisons are deferred. Offline thread/export evidence is reported within its actual scope; the actual collector remains unqualified until the selected live route passes M03.

Do not start a large improvement experiment before those gates pass. Pilot tasks debug instruments, evaluator fairness, overhead and assignment; confirmation needs a separately frozen population/analysis and sufficient precision. No fixed task count guarantees that. The clinic application's later T01-T20 tests remain separate implementation work, with unresolved policies visible.

This task delivers the researched decision and validation basis. Measurement acquisition, tool installation, live calibration, human review and improvement experiments remain unperformed. Research is not evidence that the proposed system already gives accurate results.
