# WF-04 source and review coverage

Access date: 2 October 2026. This is an extension of [WF-03's 22-entry register](../measurement-sources.md), not a claim that all earlier sources were fully reread. Each research track owns its source-to-claim evidence and limitations. A standard abstract, paper, vendor manual, pinned source file and local experiment establish different kinds of evidence.

| Track | Coverage record | What the evidence can establish |
| --- | --- | --- |
| Formal methods | [Methods and standards](methods-and-standards.md) | Public standard scope/status, original measurement/evidence methods and their applicability limits |
| Coding quality | [Quality and evaluators](coding-quality-and-evaluators.md) | Documented tests/tool behavior, quality dimensions, constraints and evaluator-validation techniques |
| Tool integration | [Tools and integration](tools-and-integration.md) | Maintained vendor capabilities, selected pinned source behavior, integration boundaries and untested fit |
| Root validation | [Trust and validation](trust-and-validation.md) plus the table below | Cross-cutting method checks, source verification and proposed qualification gates |

## Root inspected sources

| ID | Primary source | Inspected evidence | Limit |
| --- | --- | --- | --- |
| X01 | [NIST AI RMF core](https://airc.nist.gov/airmf-resources/airmf/5-sec-core/) | MEASURE function/categories, related MAP and scope | Voluntary framework; no whole-framework compliance review |
| X02 | [NIST AI 600-1, Generative AI Profile](https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf) | Introduction, selected measurement actions including MS-2.5-001/MS-2.13-001, structured feedback and limitations | Targeted PDF text, not full 64-page reading or local evaluation |
| X03 | [Anthropic: Demystifying evals for AI agents, 9 January 2026](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents) | Definitions, outcome/grader distinctions, repeat trials, reference solutions, calibration/isolation/maintenance | First-party practice; suggested starter counts not power analysis; linked studies not reproduced |
| X04 | [Anthropic infrastructure-noise experiment, 5 February 2026](https://www.anthropic.com/engineering/infrastructure-noise) | All substantive article text: configurations, results, caveats and enforcement recommendations | Vendor experiment; graph/raw data not reconstructed; resource multiplier not portable |
| X05 | [NIST exact-binomial reference](https://itl.nist.gov/div898/software/dataplot/refman2/auxillar/exacbino.htm); [confidence-interval guide](https://www.itl.nist.gov/div898/handbook/prc/section2/prc241.htm) | Exact/one-sided interval construction and small-sample caveats | Illustration assumes independent Bernoulli observations; no Dataplot execution |
| X06 | [NPL validation of measurement software, January 2007, hosted by NIST](https://www.nist.gov/system/files/documents/2017/05/09/NPL-Best-Practice-Guide-No-1-Validation-of-Software-in-Measurement-Systems-Jan2007.pdf) | Overview and selected PDF pages 13, 22, 51-53, 86-89, 107: assurance, requirements, reference results and independent comparison | Older physical-metrology guide; excludes research/feasibility software formally; no full 144-page reading or safety certification |
| X07 | [NIST evaluation probes, ongoing project started April 2026](https://www.nist.gov/programs-projects/building-evaluation-probes-agentic-ai) | Project description, reference corpus/rubrics, audit-trail goals and status | Early research; code/webinar not audited, grounding is not full coding correctness |
| X08 | [Dioptra overview](https://pages.nist.gov/dioptra/); [architecture](https://pages.nist.gov/dioptra/explanation/architecture-overview.html) | Reproducible test-platform intent, queue/storage/container architecture | No installation, resource benchmark or Codex adapter test |
| X09 | [Promptfoo Codex SDK provider](https://www.promptfoo.dev/docs/providers/openai-codex-sdk/) | Selected capabilities, usage/cost, persistence/cache-key behavior, streaming/deep tracing and limitations | Root doc cross-check; source/release evidence in tools track; no local integration run |
| X10 | [Promptfoo coding-agent guide](https://www.promptfoo.dev/docs/guides/evaluate-coding-agents/) | Native-provider boundaries, final-output and artifact implications, separate app-server process | Alias does not attach to existing Desktop UI; examples do not establish local behavior |
| X11 | [OpenAI coding-evaluation audit, 8 July 2026](https://openai.com/index/separating-signal-from-noise-coding-evaluations/) | Methodology, flagged-subset human review, failure categories and retraction | Primary research publication, not product configuration guidance; vendor's audit not independently rerun; percentages do not predict local defects |
| X12 | [ISO 15939:2017](https://www.iso.org/standard/71197.html); [ISO 25040:2024](https://www.iso.org/standard/83467.html) | Public abstract/status/revision information; evaluation framework's explicit test-method exclusion | No normative text purchase or clause-level conformity assessment |
| X13 | [ACM SIGSOFT Benchmarking source](https://raw.githubusercontent.com/acmsigsoft/EmpiricalStandards/master/docs/standards/Benchmarking.md) | Application, workload/metric/replication/validity requirements, raw-data and tailoring antipatterns | Method-specific community standard; no ACM artifact badge or independent replication obtained |
| X14 | [Lakens equivalence article](https://journals.sagepub.com/doi/full/10.1177/1948550617697177) | Targeted scope and equivalence/precision interpretation cross-check | Not all article sections or formulas; no local statistical analysis |
| X15 | [Langfuse Codex integration](https://langfuse.com/integrations/developer-tools/codex) | Stop/transcript mechanism, interruption/children, full-content capture, fail-open and project/global scope documentation | Documented behavior; pinned implementation deeper in tools track; current Desktop integration untested |
| X16 | [Phoenix Codex integration](https://arize.com/docs/phoenix/integrations/coding-agents/codex) | Selected capture/redaction/turn-scope claims | Source inspection in tools track narrows coverage; no installer executed |
| X17 | [Django 5.2 QuerySet reference](https://docs.djangoproject.com/en/5.2/ref/models/querysets/#select-for-update) | TransactionTestCase/TestCase locking warning | A testing-mechanics issue, not an observed defect in this unimplemented application |
| X18 | [Promptfoo released assertion results](https://raw.githubusercontent.com/promptfoo/promptfoo/0.123.1/src/assertions/assertionsResult.ts) | Targeted no-assertion/default result and threshold handling; root independent source check | Source semantics, not a local grader execution |
| X19 | [Promptfoo released app-server provider](https://raw.githubusercontent.com/promptfoo/promptfoo/0.123.1/src/providers/openai/codex-app-server.ts) | Targeted raw usage selection and mapping; root independent source check | Original-field presence and total scope still need a live fixture |
| X20 | [Pinned Langfuse plugin trace source](https://raw.githubusercontent.com/langfuse/codex-observability-plugin/f4be3a47ac2c9c43721223a8f2e5d13f12e676c7/plugins/tracing/src/trace.ts) | Targeted session-root indexing, relationship recovery and final/delivery selection; root independent source check | Selected source ranges, no transcript access or upload trial |
| X21 | [Inspect scoring policy](https://inspect.aisi.org.uk/scoring-policy.html) | Targeted partial-state scoring, scorer errors, NaN unscored results and epoch coverage; peer-review correction cross-check | No local Inspect scoring or reproduction |
| X22 | [Pinned Langfuse parser](https://raw.githubusercontent.com/langfuse/codex-observability-plugin/f4be3a47ac2c9c43721223a8f2e5d13f12e676c7/plugins/tracing/src/parse.ts) | Targeted step opening/closing and token snapshot behavior; peer-review cross-check | Duplicate-count risk is a static inference requiring a fixture, not an observed upload defect |

Some rows group separate pages; do not treat the row count as a count of unique papers or independent validation. Several tracks inspect overlapping primary pages. Agreement among the agents does not make those pages independent evidence. The three agent registers contain 27 methods, 23 quality and 44 tooling source groups; those are scoped reference groups, not 94 independent studies. A mechanical URL inventory can audit citations but cannot establish what was read.

The [mechanical document/citation inventory](../../tasks/workflow-measurement-expansion/evidence/source-inventory.json) records package hashes, source-group IDs and linked URL occurrences with line locations. Its counts are descriptive inventory evidence; the scoped reading/claim limits in the tables govern interpretation.

## Retrieval and exclusion notes

- Root's attempted ACM artifact-badging page and guessed NPL site URL failed; no unseen content was adopted from them.
- The NIST-hosted NPL PDF opened in the web reader, but subsequent searches failed. The same PDF was downloaded to ignored scratch storage and selected text extracted locally. Its 144-page container was inventoried; all pages were not substantively read. SHA-256: `047746160854c72eebb1a02ebe81200e687c5273bceb7147b70b9092df64ec11`.
- Search snippets surfaced secondary summaries, community anecdotes and recent preprints. Unopened results do not support this report's technical recommendations. The original primary page must support each adopted claim.
- Standards available only through public scope/status pages remain scope evidence. No paywalled text was purchased, full clause-level conformity asserted or industry certification inferred.
- Software versions/source hashes are reported only where inspected. Dynamic documentation may be ahead of a release; the selected implementation must pin a release and recheck relevant files.
- Research providers and the clinic's proposed production architecture are separate. This work makes no hosting-price, production-capacity, deployed-security or clinical-validation claim.

## Local and agent evidence

[WF-04 task](../../tasks/workflow-measurement-expansion/task.md) records ownership, preservation and checks. Three research agents were dispatched under the user's explicit authorization. They researched and authored separate reports; these are automated research contributions, not human review or a measured coding-workflow trial. Root reviewed their deliverables and cross-checked the decision-changing primary sources. The reports disclose their own inspected sections and gaps; the source inventory does not imply every linked appendix/source repository was read in full.
