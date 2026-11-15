# Measurement methods and standards: research expansion

Research/access date: **2 October 2026**. Status: desk research and proposed amendments, **not measurement implementation, calibration, conformance assessment, a product trial or a demonstrated workflow gain**. Scope: formal measurement processes, product/evaluation models, instrument uncertainty, experimental validity, estimands, failure/missing-data policy and statistical claims. This supplements [WF-03 research](../measurement-research.md), [the source register](../measurement-sources.md), [system design](../measurement-system-design.md) and [implementation plan](../measurement-implementation-plan.md).

The existing design is a strong starting proposal. Its event identity, source provenance, complete/partial/unavailable states, frozen acceptance, failed-attempt accounting and offline reports should be retained. The most consequential additions are explicit decision-to-measure contracts; reference-based validation of the collector and evaluator; separation of measurement uncertainty from sampling uncertainty; and a prespecified comparison estimand that retains all assigned work. Standards supply useful structure, not approval of this particular workflow.

Local reading: `AGENTS.md`, the agentic-coding index, all four WF-03 measurement documents, the implemented workflow guide, context map and evaluation protocol. This review does not re-audit the historical run bytes, inspect the clinic PDF, assess the completed application architecture or rerun any trial. Their current status is taken from those documents: the clinic app is unimplemented and M00-M06 remain proposed. Only this expansion document was written.

## 1. Highest-priority consequences

These are **recommendations inferred from the inspected evidence**, not requirements proven by a full standard audit.

| Priority | Existing design to retain | Concrete amendment | Why it changes the decision |
| --- | --- | --- | --- |
| P0 | Separate quality, effort, latency, tokens and cost | Each metric must state its information need, decision owner, object/population, unit, boundaries, source, derivation, uncertainty and intended action | A correctly calculated number can still answer the wrong question |
| P0 | M01 arithmetic fixtures and M03 live calibration | Require reference truth established independently of the collector, measured residuals, test range, source independence and limitations | Agreement between two projections of the same erroneous upstream counter is insufficient |
| P0 | All attempts retained | Add distinct target effects for assigned workflow delivery and optional uninterrupted capability; freeze interruption, rescue, cancellation and missingness policies | An account outage and lost telemetry are different phenomena |
| P0 | Whole-task units and quality gates | Replace the requirement for equal **accepted** sets with comparable **assigned** eligible work and prespecified quality tolerances | Filtering to success after assignment can bias the result |
| P0 | Lower confidence bounds for 3x/5x | Add separate states: point estimate, evidence of any improvement, exact-threshold support, inconclusive, and meaningful harm | A 3.2x estimate with a wide interval cannot substantiate at least 3x |
| P1 | Pilot before confirmation | Plan precision/power against the actual estimand, task/developer clustering, quality margin and rare-event risk; do not treat 8-12 as a statistical rule | The required number of independent units may exceed a practical pilot |
| P1 | Reviewer calibration | Preserve individual ratings before adjudication; identify rating scale, disagreement, independent reference labels and uncertainty | A consensus final label hides whether grading is dependable |
| P1 | Version pins and coverage warnings | Add a versioned measurement assurance record and recheck triggers after adapter, client, rubric, task mix or timing-method changes | Yesterday's compatible parser is not proof of today's measurement validity |

## 2. What established standards do and do not provide

### Measurement process

**Published-standard evidence:** ISO/IEC/IEEE 15939:2017 addresses measurement information needs, selecting/applying/improving suitable measures, analysis use and validity. ISO's page still lists the published 2017 edition; it was confirmed in 2022, but is now marked for revision, with a replacement DIS under development. This review inspected only the official public abstract/status/lifecycle, not its 39-page normative text. [ISO/IEC/IEEE 15939](https://www.iso.org/standard/71197.html).

**Established-method evidence:** Basili, Caldiera and Rombach's Goal Question Metric (GQM) article derives metrics from questions about explicit goals, with interpretation tied to object, purpose, quality issue, viewpoint and environment. It distinguishes product/process/resource objects and objective/subjective measures, and places collection, validation and analysis after measurement-model specification. The substantive author paper hosted by the University of Maryland was readable; the linked six-page encyclopedia scan was not text-extractable. [The Goal Question Metric Approach, §§1-3](https://www.cs.umd.edu/~mvz/handouts/gqm.pdf). GQM is an established approach, not a certification or proof of local benefit.

**Adoption recommendation:** add a small measurement-specification record, reused across tasks rather than a form per event. Its chain should be:

`decision to make -> information needed -> entity/attribute -> observation and unit -> derivation -> analysis assumptions -> decision rule -> review of usefulness`

For example, the decision “retain compact context packets” needs both total delivery-input consumption and preservation of decisive facts, acceptance and human review burden. A packet-byte counter alone cannot decide it. The following fields are proposed project contracts; they are not copied normative ISO clauses:

The local GQM interpretation is: goal = improve efficient delivery from the maintainer's viewpoint in this project; questions = does the packet preserve acceptance and decisive facts, and reduce full delivery input without extra human burden; metrics = assigned-task acceptance, fact-correctness gates, total input per accepted outcome and total human effort. This is a project-specific model to validate, not an effect demonstrated by the historical paper.

| Field | Example or rule |
| --- | --- |
| Information need and owner | Maintainer decides whether one added context mechanism is useful |
| Intended population | Eligible workflow tasks at pinned project/client/model versions |
| Measured entity and attribute | Whole-task delivery; total active human person-minutes |
| Unit/scale | Minutes on a ratio scale; acceptance nominal; rubric levels ordinal |
| Boundaries/exposure | Preparation, supervision, review, integration, failed attempts and rework included |
| Base observations | Explicit actor intervals, attempt identity, final acceptance evidence |
| Derivation | Per-person interval union; sum people; accepted tasks divided by total hours |
| Instrument/source | Adapter and timing method/version, evidence/hash, counter semantics |
| Quality of observation | Coverage, reference comparison, rounding, disagreement, known systematic error |
| Estimand and analysis | Defined population effect, unit of assignment, clustering and weighting |
| Decision rule | Exact threshold and quality/cost/latency tolerances before results |
| Usefulness/retirement | Was the metric actionable, affordable to collect and sufficiently trustworthy? |

An ordinal rubric labelled 1-5 does not acquire a ratio scale: “4 is twice the quality of 2” remains unsupported. Count metrics still require exposure and duplicate rules. Avoid a composite score that trades a money/access corruption defect against saved tokens.

### Product quality, quality in use and evaluation

The SQuaRE standards are complementary. The inspected public scopes establish the distinctions below; **none establishes a completed local conformity assessment**.

| Published standard | What the inspected scope establishes | Practical consequence and limit |
| --- | --- | --- |
| [ISO/IEC 25010:2023](https://www.iso.org/standard/78176.html) | Product-quality reference model with nine characteristics; applicable to specification, measurement, evaluation and acceptance | Use it to check coverage of relevant quality dimensions; do not claim its full taxonomy or Annex C was inspected |
| [ISO/IEC 25019:2023](https://www.iso.org/standard/78177.html) | Quality in use is defined for a specified context; changing that context requires reconsidering prerequisites | Distinguish artifact acceptance from whether maintainers can use/change the result in their actual context; no live-user outcome is established here |
| [ISO/IEC 25023:2016](https://www.iso.org/standard/35747.html) | Product-quality measures; it does not supply universal metric ranges or compliance grades | Select thresholds for the project's needs and exposure. Official page lists the published edition for revision and a draft 25000-23.2 replacement; drafts are not an adopted final standard |
| [ISO/IEC 25040:2024](https://www.iso.org/standard/83467.html) | Quality-evaluation framework for ICT products, data and IT services; explicitly does not provide specific test methods or guidance on using results | The team still has to define actual evaluators, fixtures, defect adjudication and decision rules |

**Recommendation:** use a selective requirements-to-evidence matrix alongside the existing T01-T20 route when application code exists. Keep separate rows for functional behavior, security/permissions, reliability/concurrency, maintainability/changeability, performance/resource use and the chosen interaction checks. These are recommended evaluation concerns, not a reproduction of all current ISO characteristic definitions. A receipt repair and a salary-authorization change need different evidence. Passing local document checks demonstrates neither product quality across these dimensions nor quality in use.

The useful claim today is “design informed by published measurement and evaluation frameworks.” Avoid “ISO compliant,” “ISO certified,” “industry approved,” or “standards validated.” Full applicable text, edition-aware traceability, actual execution evidence and an appropriate assessment would be needed for a stronger claim. Purchasing standards is not required for this research and no purchase was made.

## 3. Calibration and uncertainty need an explicit measurement layer

**Metrology guidance evidence:** JCGM VIM distinguishes precision under repeatability versus changed reproducibility conditions; calibration is distinct from instrument adjustment. It also distinguishes a measurement coverage interval from a statistical confidence interval. Targeted entries were inspected, not the full bilingual volume. [JCGM 200:2012](https://www.bipm.org/documents/20126/2071204/JCGM_200_2012.pdf).

GUM's inspected passages distinguish uncertainty evaluated from repeated observations from evaluation using other available information; dependent observations and correlated inputs need appropriate treatment. This is conceptual guidance, not an automatic formula for software productivity. [JCGM 100:2008, §§4.1-4.3 and 5.2](https://www.bipm.org/documents/20126/2071204/JCGM_100_2008_E.pdf). The current [BIPM portal](https://www.bipm.org/en/web/guest/publications/guides) also lists a 2026 amendment and newer GUM volumes; those contents were not inspected, so this document does not claim complete current-GUM coverage.

NIST's engineering-statistics handbook separates bias, short-term variability, long-term variability and uncertainty. It cautions that long-term variability can exceed short-term precision and that properly calibrated equipment can still leave other systematic errors. Its discussion is primarily about ongoing physical measurement processes; applying its assurance ideas to software collection is an explicit transfer. [Characterization](https://www.itl.nist.gov/div898/handbook/mpc/section1/mpc11.htm), [bias](https://www.itl.nist.gov/div898/handbook/mpc/section1/mpc113.htm), [variability](https://www.itl.nist.gov/div898/handbook/mpc/section1/mpc114.htm).

### Proposed assurance sequence

1. **Define what is being measured.** “Exact provider input tokens reported for identified calls” is different from “exact complete task context” or “invoice dollars.” A counter can be decoded correctly yet omit a worker, platform preparation or failed call.
2. **Establish reference cases outside the implementation.** Hand-derived event ledgers, known interval schedules and independently constructed pass/fail/invalid evaluator artifacts should supply expected results. Store how reference values were obtained. A duplicated parser or a fixture generated by the implementation under test is weak evidence.
3. **Check repeatability and reproducibility.** Identical sealed input should reproduce identical accounting, with nondeterministic presentation fields excluded explicitly. A second maintainer/environment should rebuild it. Live acquisition must also be tested under the documented changed conditions; rerunning one offline fixture does not demonstrate live reproducibility.
4. **Measure discrepancy across the intended range.** Test small/large counters, concurrency, forks, reset boundaries, failure/resume, rounding, timer stops, clock mismatch and partial finalization. Exact integer accounting should match an exact reference; timing comparisons need a declared tolerance and reference uncertainty. “Within 1%” has no universal justification.
5. **Characterize systematic omissions.** Trace expected participants and attempt boundaries. Preserve disagreements between sources instead of selecting whichever gives the cheaper total. Two sources fed by one upstream usage counter are corroborating transport evidence, not independent proof of its completeness or billing truth.
6. **Assess observation burden.** Collector overhead, human timing friction and evaluator feedback can alter the work being studied. Include recurring measurement effort in the delivery accounting; report experimental harness overhead separately as well.
7. **Retain assurance history.** Store scope, versions, reference artifacts, residuals, exclusions, tolerances, reviewer, status and recheck triggers. Recheck after a material source/schema/clock/rubric change; retain supported historical results rather than silently reinterpreting them.

These are proposed engineering checks, not SI-traceable calibration or laboratory accreditation. NIST's physical Gauge R&R model and automotive percentage thresholds should not be imported mechanically into human effort or code quality. For subjective labels, evaluator disagreement and relation to independently reviewed examples are the relevant questions.

### Separate four kinds of uncertainty

| Kind | Example | Appropriate response |
| --- | --- | --- |
| Instrument/observation | Retrospective effort estimate, timer rounding, grader disagreement | Disclose method, quantify discrepancy when possible, sensitivity/bounds |
| Sampling/model variability | Different tasks, developers and stochastic agent runs | Design-aware uncertainty using independent/cluster units |
| Missingness/coverage | Unobserved reviewer, unfinished stream, absent follow-up | Explicit missing state and bounds where supportable; do not fabricate a precision estimate |
| Validity/transport | Toy tasks, policy ambiguity, changing model or client | Limit the target claim; add relevant evidence or start a new epoch |

A bootstrap interval over tasks addresses only the sampling assumptions built into it. It cannot repair omitted worker usage, biased human time entries, an invalid oracle or an unrepresentative task frame. Arithmetic precision is not measurement accuracy. Do not sum uncertainty components as if independent when they share a clock, observer or upstream source.

JCGM's conformity guidance discusses decision rules and false acceptance/rejection risk when measurements are uncertain. [JCGM 106:2012, §8](https://www.bipm.org/documents/20126/2071204/JCGM_106_2012_E.pdf). **Project recommendation:** make the evidence threshold explicit and add “inconclusive” when uncertainty crosses it. This is an analogy to guarded decisions; it is not a direct application of that guide's dimensional guard-band formula to productivity ratios.

## 4. Comparison design: define the target effect before selecting an estimator

### Match the evidence standard to the study

The [ACM SIGSOFT evidence standards](https://www2.sigsoft.org/EmpiricalStandards/) describe software-engineering community expectations for methods and reporting. They are not ISO certification criteria. Their separate [human-participant experiment checklist](https://raw.githubusercontent.com/acmsigsoft/EmpiricalStandards/master/docs/standards/Experiments.md) asks for measured constructs/units, randomization or justified alternatives, design-appropriate analysis, sample-size justification, uncertainty and alternative interpretations. Its stated scope includes human participants; it should not be described as directly governing every autonomous-agent benchmark.

The [software benchmarking checklist](https://raw.githubusercontent.com/acmsigsoft/EmpiricalStandards/master/docs/standards/Benchmarking.md) instead emphasizes the selected quality, metrics, workload, setup, repeatability and construct validity, including raw results for offline analysis. **Recommendation:** use that checklist for an agent harness; use human-experiment guidance when measuring real human planning/review effort; explain any combined design. Preserve raw sanitized per-unit results and analysis inputs rather than only aggregate dashboard values.

The [sampling supplement](https://raw.githubusercontent.com/acmsigsoft/EmpiricalStandards/master/docs/supplements/Sampling.md) distinguishes a target population from its sampling frame and warns that random selection from a biased frame does not make the sample representative. **Recommendation:** define the eligible task backlog and exclusions before assignment. Include repair, new feature, iterative change, cold resumption and small maintenance classes only where executable prerequisites exist. Label constructed workflow fixtures as such. Do not generalize to all clinic development from selected adapter repairs or to production behavior before the application exists.

### Prespecify an estimand record

**Cross-domain methodological evidence:** ICH E9(R1) distinguishes the target effect, analysis, events that affect interpretation and genuinely missing observations. It identifies treatment, population, endpoint, handling of intercurrent events and population summary, and warns about comparing post-treatment subsets. This is pharmaceutical-trial guidance, **not a standard imposed on coding work or clinic deployment**. Only the transferable clarity is used here. [Final FDA guidance PDF, A.1/A.3/A.4/A.5](https://www.fda.gov/media/148473/download).

For each local claim, freeze these proposed fields:

- **Intervention:** current workflow versus one selected amendment; say if model, agent count, permissions or resource budget changes too.
- **Population/frame:** eligible whole tasks/trajectories and maintainers at declared versions; exclusions decided before assignment.
- **Outcome:** acceptance within a fixed budget, complete human effort and/or complete token input, with exact exposure and start/stop boundaries.
- **Event policy:** handling of quota outage, tool failure, retries, human rescue, cancellation, model reroute and evaluator breakdown.
- **Summary:** ratio of condition-level accepted tasks to all condition-level human effort; or another named quantity with its own interpretation.
- **Assignment/dependence:** randomized task/variant/maintainer units, blocks, repeats and trajectory clustering.
- **Decision:** threshold, quality margin, cost/latency bounds, uncertainty level, stopping and multiplicity policy.

For the existing productivity estimand, use `R = (A_t/H_t) / (A_b/H_b)` with all assigned effort included, positive complete denominators and nonzero baseline acceptance. Converting minutes to hours cancels in this ratio. This ratio of sums is not the mean of task-level speed ratios or a median completion-time ratio. Report the estimand actually computed. Class weights, if needed, must be chosen before results and applied consistently; do not derive “difficulty” weights from time observed under a treatment.

**Correction to system-design §8:** its equal-accepted-set wording is too restrictive if read as a requirement to discard noncommon successes. Compare comparable assigned eligible workloads; retain all assignments. Unequal acceptance is an outcome to report and judge against a declared quality tolerance. Restriction to the intersection of accepted tasks is post-assignment selection and supports, at most, a separately labelled descriptive analysis. A fixed-completion experiment is another legitimate design, but must count the full failure/retry budget and inability to complete the suite.

### Randomization, blocks and interference

NIST explains blocking of important controlled nuisance factors alongside randomization for remaining nuisance variation. [Randomized block designs](https://www.itl.nist.gov/div898/handbook/pri/section3/pri332.htm). **Recommendation:** block on baseline task class/familiarity or a validated matched pair; randomize condition and order within blocks. Record the actual allocation algorithm/seed. Separate code/context histories and later undisclosed changes. Label residual differences in variant difficulty rather than assuming matching succeeded.

Repeated tasks, trajectory stages and developers create dependency. Use the unit actually assigned and resample/analyze whole relevant clusters. NIST cautions that ignoring nested variation can produce invalid conclusions. [Nested variation](https://www.itl.nist.gov/div898/handbook/pri/section5/pri55.htm). Do not count assertions, messages or worker spans as independent task observations. If one developer performs both conditions, task-solution learning can persist after a fresh session; separate workspaces do not erase that human carryover.

A shared quota, machine or parent coordinator can also create interference between nominally separate runs. Freeze or record concurrency/resource contention. A packet intervention with extra agents estimates the package effect unless an additional design isolates those components. Operational before/after charts remain associations when model/task/familiarity changes are uncontrolled.

## 5. Failures, missing measurements and censoring

The following is a proposed event policy table, to be selected before a comparison. Preserve event causes even when more than one label applies.

| Event | Delivery outcome/accounting | Additional interpretation |
| --- | --- | --- |
| Code fails valid acceptance within budget | Not accepted; all observed attempts/effort/resources retained | A capability/quality failure for that contract |
| Account/tool outage, later successful retry | User wait and all attempts retained under assigned-workflow policy | Separate uninterrupted-capability analysis needs a predeclared different question; cannot silently remove outage |
| Human rescue or manual implementation | Retain effort, original assignment and actual rescue | Report assisted success; does not demonstrate autonomous success |
| Evaluator cannot run or oracle is ambiguous | Acceptance unknown pending valid evidence | Evaluator/policy failure is not automatically incorrect generated code; still affects delivery |
| Usage stream is partial | Artifact outcome can remain known; affected resources partial | Missing resources are not a code failure and not zero resource use |
| User cancels scope | Preserve assigned task, stop time and reason | Cancellation policy defines delivery-by-budget outcome; capability result may remain unavailable |
| Follow-up ends before rework/defect observation | Record actual observed period and censoring | No escaped defects observed is not complete proof of no defects |
| Client/model changes mid-run | Retain requested and realized versions | Flag protocol deviation; do not pool with unchanged runs automatically |

For an acceptance report with `N` assigned, `a` confirmed accepted and `u` unavailable outcomes, a transparent descriptive bound is `[a/N, (a+u)/N]`. This is **a missing-data bound, not a confidence interval**. Example: 6 confirmed acceptances, 2 confirmed failures and 2 unavailable evaluations among 10 assignments imply 60%-80% possible acceptance, before sampling uncertainty. “Exclude the unavailable two” would instead change the population and require justification.

For unknown human effort or tokens, retain the observed minimum. Use a finite upper bound only if a documented exposure/budget genuinely bounds the unobserved quantity. A wall-duration cap cannot bound summed human person-minutes without participant/allocation assumptions. If missing effort is unbounded, a savings/productivity multiplier is unavailable. Sensitivity scenarios should disclose assumptions and show when the decision changes, not upgrade an assumed number to measured truth.

Latency among successful tasks is useful descriptive evidence but excludes the difficult failures. Keep by-budget completion rate, time-to-stop and failure reasons beside it. Right-censored time-to-acceptance needs an analysis whose assumptions fit the setting; treating every failure as ordinary independent censoring is unsafe. For early bounded trials, descriptive records and explicit completion-by-budget are preferable to a poorly justified survival model.

## 6. Statistical assurance and exact-threshold claims

### Choose the inferential goal, then the sample size

Lakens's original methodological paper separates sample-size justification by desired precision, power, resources, population coverage or other disclosed grounds. It distinguishes a smallest useful effect from an expected effect and warns against treating observed post-hoc power as new information. [Sample Size Justification, 2022](https://doi.org/10.1525/collabra.33267). **Recommendation:** retain 8-12 tasks only as a bounded engineering pilot, with no guaranteed statistical informativeness. Plan confirmation against the actual ratio and quality margin, using plausible variance/failure/missingness/dependence scenarios. Report the resource-constrained choice honestly if adequate precision is unaffordable.

The ASA cautions that a p-value is not effect magnitude, practical importance or the probability a hypothesis is true; inference requires transparent reporting. [ASA official release, six principles](https://www.amstat.org/asa/files/pdfs/p-valuestatement.pdf). **Recommendation:** lead with assignment counts, acceptance, complete resources, effect estimates, intervals, harms and scope. Do not turn `p < .05` into a 3x/5x conclusion.

The following are separate questions:

| Question | Evidence needed |
| --- | --- |
| What happened in the collected tasks? | Descriptive point estimate and raw records |
| Is a useful gain supported in the declared population? | Design-aware interval/test relative to a prespecified useful-effect threshold |
| Is at least 3x productivity or 5x input efficiency supported? | Appropriate prespecified lower bound reaching that exact threshold, plus required quality/resource gates |
| Is quality preserved within tolerance? | Interval/test relative to a defined noninferiority/equivalence margin and required severity gates |
| What should change operationally? | Effect magnitude, uncertainty, burden, cost, failure pattern and target context |

Absence of a statistically detectable quality difference is not evidence of equivalent quality. Lakens's equivalence primer illustrates why explicit equivalence bounds and adequate precision are required. Its specific t-test examples are not ready-made tests for a clustered binary task endpoint. [Equivalence Tests, 2017](https://journals.sagepub.com/doi/full/10.1177/1948550617697177). **Recommendation:** for an acceptance margin `delta`, a suitable lower confidence bound on `p_t - p_b` must lie above `-delta` to support that prespecified noninferiority claim; the estimator must respect pairing/clustering. Critical defects retain a separate gate. The team must choose the margin's substantive meaning before results; a convenient wide margin cannot prove practical safety.

Zero observed failures do not establish zero risk. NIST describes binomial intervals and alternatives to invalid normal intervals. [Proportion confidence intervals](https://www.itl.nist.gov/div898/handbook/prc/section2/prc241.htm). **Illustrative arithmetic, not a local result:** with zero failures in `n` truly independent, identically distributed Bernoulli trials, the exact one-sided 95% upper failure bound is `1 - 0.05^(1/n)`, obtained by solving `(1-p)^n = 0.05`. For `n=2` it is about 77.6%; for `n=30`, about 9.5%. WF-02's selected trajectories do not establish the assumptions for applying that interval to clinic task risk.

### Analysis and monitoring

Select analysis using the allocation/dependence structure. Paired/cluster resampling can be a candidate for sufficiently informative units, but tiny independent-unit counts, degenerate acceptance and near-zero effort make ratio inference fragile. A library returning an interval is not a validity check. Randomization inference must follow the actual assignment design and its null; a permutation test for no effect is not automatically a confidence bound for a nonlinear 3x ratio. Leave advanced methods unimplemented until their assumptions and reference behavior are demonstrated.

Declare a fixed confirmation/stopping plan initially. Original confidence-sequence research shows that continual inspection using ordinary fixed-sample intervals can inflate error, and develops methods with time-uniform guarantees under specified conditions. [Howard et al., introduction and confidence-sequence definition](https://arxiv.org/abs/1810.08240). **Recommendation:** operational charts may update descriptively; do not stop an experiment when the first attractive ordinary interval appears. A future sequential method must match task dependence, boundedness/tail assumptions and the target effect; the paper's formulas are not a drop-in productivity-ratio estimator.

Freeze one primary claim or a declared hierarchy/multiple-claim procedure. Choosing the most favorable among quality, tokens, latency and effort after results overstates evidence. Preserve all explored analyses. The ACM [registered-reports supplement](https://raw.githubusercontent.com/acmsigsoft/EmpiricalStandards/master/docs/supplements/RegisteredReports.md) emphasizes a verifiably committed plan, justified deviations and labelled post-hoc analyses. A local sealed protocol can adopt these principles; it is **not** public preregistration or a journal-accepted registered report.

NIST distinguishes statistical control limits from specification limits and notes that weakly estimated limits can behave differently from assumed ones. [Variables control charts](https://www.itl.nist.gov/div898/handbook/pmc/section3/pmc32.htm). **Recommendation:** defer automated control-limit alarms until a stable, sufficiently characterized task/instrument stream exists. Do not apply manufacturing rules of thumb to a heterogeneous handful of coding tasks, recalculate limits after every bad point or treat “in control” as proof of desired quality or causation.

## 7. Grader agreement is useful but does not establish truth

ACM's [inter-rater supplement](https://raw.githubusercontent.com/acmsigsoft/EmpiricalStandards/master/docs/supplements/InterRaterReliabilityAndAgreement.md) distinguishes exact-value agreement from consistency in ordering items; it calls for the rated property, independent-rating process, rating scale, disagreement resolution and an appropriate statistic, or a justified single-rater design. It warns against selecting the most favorable coefficient and notes coefficient anomalies. Its stated scope is human raters; model-judge calibration is a transfer requiring separate evidence.

**Recommendation:** independently rate a held-out range of clean, defective, borderline and unavailable-evidence artifacts before group discussion. Record individual labels, rationale and artifact hashes, then adjudicate. Report confusion/disagreement by severity and dimension, not just one correlation. High agreement between two judges can coexist with shared systematic mistakes. A shared model or reused worker history is not independent human judgment. If only one qualified maintainer is available, state that limit rather than fabricate multi-rater validation. Do not mandate one universal kappa threshold for every rating type or defect prevalence.

## 8. Changes to M00-M06 and evidence required to trust them

| Slice | Added proposed acceptance condition |
| --- | --- |
| M00 | Measurement specifications link each collected field to an information need and decision; scale, boundaries, coverage and estimand/event policies are machine-checkable or explicit reviewed records |
| M01 | Reference provenance and expected accounting are independent of the decoder; reset/fork/duplicate/partial cases retain exact or honestly partial values; known-format coverage cannot be asserted from schema validity alone |
| M02 | Acceptance unknown/failure/evaluator invalid are distinct; all actor timing methods and rounding/overlap assumptions are recorded; individual review labels survive adjudication |
| M03 | Live assurance record names versions, scope, tested range, expected participants, independent comparison source/limitations, residuals, failures and recheck triggers; no claim of formal metrological traceability |
| M04 | Ratio-of-sums, missingness bounds, quality-margin logic, zero/near-zero denominators and claim-state distinctions have independent worked examples; proposed uncertainty algorithms are checked on assumptions and known-reference behavior |
| M05 | Pilot tests observation burden, source completeness, task-variant matching, assignment feasibility and evaluator sensitivity; describes variance without asserting confirmatory power |
| M06 | Frozen target population, estimand, analysis, quality margins, multiplicity/stopping and deviation policy; adequate uncertainty for the exact claim or an explicit unsupported/inconclusive conclusion |

Trust is claim-specific. A validated offline arithmetic pipeline can be trusted to compute fixture totals while live task-resource completeness remains unproven. Correct source decoding can be established while human-effort estimation remains weak. A calibrated evaluator can identify selected defects while overall maintainability and real-user outcomes remain unobserved. Reports should carry these separations through to each conclusion.

## 9. Evidence coverage and access limits

All URLs below were accessed on **2026-10-02**. Primary organization pages, official source files and original papers were used; secondary search results were not used as technical evidence. Source entries describe targeted coverage, not full-library reading. No standard was purchased. No instrument, product or experiment was installed or run.

| ID | Primary source and exact inspected coverage | Limits |
| --- | --- | --- |
| MS01 | [ISO 15939:2017](https://www.iso.org/standard/71197.html): abstract, published status, confirmation/revision lifecycle and replacement-DIS label | Full clauses/annexes unseen; no conformance |
| MS02 | [ISO 25010:2023](https://www.iso.org/standard/78176.html): abstract/model purpose, nine-characteristic statement, uses and publication metadata | No full taxonomy/Annex C inspection |
| MS03 | [ISO 25019:2023](https://www.iso.org/standard/78177.html): abstract, context-of-use prerequisite and uses/status | No full characteristics/conformance |
| MS04 | [ISO 25023:2016](https://www.iso.org/standard/35747.html): public scope, no universal ranges/grades, edition/revision/draft-replacement status | 2016 measure catalogue and newer draft not read |
| MS05 | [ISO 25040:2024](https://www.iso.org/standard/83467.html): public scope, audience, test-method exclusion, published metadata | Full evaluation process clauses unseen |
| MS06 | [JCGM VIM PDF](https://www.bipm.org/documents/20126/2071204/JCGM_200_2012.pdf): targeted entries 2.21, 2.24-2.26, 2.36-2.39, PDF pages 40-44 (one-based; printed 24-28) | Selected English definitions/notes, not all 108 pages or figures |
| MS07 | [JCGM GUM PDF](https://www.bipm.org/documents/20126/2071204/JCGM_100_2008_E.pdf): targeted §§4.1.5-4.2.8, 4.3.1-4.3.3 and 5.2.5, PDF pages 21-24 and 35 | Base 2008 passages; not all 134 pages, proofs/examples or 2026 amendment |
| MS08 | [BIPM guides portal](https://www.bipm.org/en/web/guest/publications/guides): current guide/version listing | Listing only for newer documents |
| MS09 | [JCGM 106 PDF](https://www.bipm.org/documents/20126/2071204/JCGM_106_2012_E.pdf): targeted §8.3 guarded-acceptance/decision-rule passages, PDF pages 30-31 | Not a full 57-page conformity-risk treatment; analogy only |
| MS10 | [NIST characterization](https://www.itl.nist.gov/div898/handbook/mpc/section1/mpc11.htm): complete substantive text | Physical-process scope; transfer explicitly labelled |
| MS11 | [NIST bias](https://www.itl.nist.gov/div898/handbook/mpc/section1/mpc113.htm): complete substantive text, reference comparisons and residual-error caveat | No laboratory procedure adopted |
| MS12 | [NIST variability](https://www.itl.nist.gov/div898/handbook/mpc/section1/mpc114.htm): complete substantive text; short/long-term variation and terminology caveat | Visual depictions not audited; no full gauge study |
| MS13 | [ACM official overview](https://www2.sigsoft.org/EmpiricalStandards/): authority/purpose; [Experiments source](https://raw.githubusercontent.com/acmsigsoft/EmpiricalStandards/master/docs/standards/Experiments.md): application, essential/desirable attributes, quality criteria, antipatterns and invalid criticisms | Human-participant scope; linked exemplar papers not read |
| MS14 | [ACM Benchmarking source](https://raw.githubusercontent.com/acmsigsoft/EmpiricalStandards/master/docs/standards/Benchmarking.md): application and all substantive checklists/criteria/antipatterns | Bibliographic exemplars not separately assessed; no local benchmark validation |
| MS15 | [ACM Sampling source](https://raw.githubusercontent.com/acmsigsoft/EmpiricalStandards/master/docs/supplements/Sampling.md): application, attributes, antipatterns and invalid criticisms | Task-frame representativeness remains to establish |
| MS16 | [ACM Registered Reports source](https://raw.githubusercontent.com/acmsigsoft/EmpiricalStandards/master/docs/supplements/RegisteredReports.md): definition, scope, phase requirements/deviations and timestamp antipattern | Local plan is neither public registration nor venue acceptance |
| MS17 | [ACM Inter-rater source](https://raw.githubusercontent.com/acmsigsoft/EmpiricalStandards/master/docs/supplements/InterRaterReliabilityAndAgreement.md): definitions, scope, attributes, antipatterns, acceptable deviations, invalid criticisms and notes | No listed external coefficient paper or local grader calibration performed |
| MS18 | [FDA final E9(R1) PDF](https://www.fda.gov/media/148473/download): targeted A.1 event/missingness distinction, A.3.2 principal-stratum caveat, A.3.3 attributes, A.4 collection implications, A.5.2 sensitivity distinction and glossary; PDF pages 6, 12-14, 17, 20-21 and 23 | Clinical-trial source, methodological transfer only; no medical/regulatory applicability asserted |
| MS19 | [NIST blocks](https://www.itl.nist.gov/div898/handbook/pri/section3/pri332.htm): nuisance-factor/blocking/randomization text and model | Example model not automatically assumed for coding outcomes |
| MS20 | [NIST nested variation](https://www.itl.nist.gov/div898/handbook/pri/section5/pri55.htm): experimental-unit/nesting and wrong-error-model caveat | No local variance-component fit or complete handbook read |
| MS21 | [Lakens 2022](https://doi.org/10.1525/collabra.33267): abstract, six justifications/table, power assumptions/multiple tests, smallest effect, literature-effect limitations, post-hoc-power and sequential-design discussions | No author software run or sample-size calculation performed |
| MS22 | [ASA release PDF](https://www.amstat.org/asa/files/pdfs/p-valuestatement.pdf): substantive official release and six principles, PDF pages 1-2 | Release, not full journal statement/commentaries |
| MS23 | [Lakens 2017](https://journals.sagepub.com/doi/full/10.1177/1948550617697177): introduction, equivalence boundaries, sensitivity/precision and discussion | No plug-in adoption of t-test formulas for binary/cluster outcomes |
| MS24 | [NIST proportion intervals](https://www.itl.nist.gov/div898/handbook/prc/section2/prc241.htm): score/Wilson formulas, normal-interval caveat and one-sided discussion | Zero-event formula in this document is a stated binomial derivation; iid assumptions unproven locally |
| MS25 | [Howard et al.](https://arxiv.org/abs/1810.08240): abstract, introduction, time-uniform definition, listed properties and assumptions | Proofs, application-specific ratio method and software reproduction not inspected |
| MS26 | [NIST control charts](https://www.itl.nist.gov/div898/handbook/pmc/section3/pmc32.htm): control/specification distinction, limits estimated from limited data, recalculation and false-alarm discussion | Not all chart types; no control chart fitted |
| MS27 | [Basili/Caldiera/Rombach GQM author paper](https://www.cs.umd.edu/~mvz/handouts/gqm.pdf): substantive §§1-3 text, hierarchical levels, goal coordinates, measure selection and validation/analysis sequence; PDF pages 1-8 | Ten-page university-hosted author text; figures read through extracted labels, no visual audit. The [six-page 1994 publication scan](https://www.cs.umd.edu/~basili/publications/technical/T89.pdf) returned no extractable text; screenshots supplied no viewable image in this tool path, so that scan is not claimed read |

For ACM, the official repository's observed `master` HEAD metadata was `554118c6b60580aeba4cbe1222fbe12df5e62171`, committed 2026-09-17T14:48:02Z. [Commit](https://github.com/acmsigsoft/EmpiricalStandards/commit/554118c6b60580aeba4cbe1222fbe12df5e62171). The reading used live official raw files plus the rendered standards/supplements pages; no full cloned or byte-hashed snapshot was retained. Two initial guessed raw paths failed; correct paths were subsequently resolved from the official repository API. The official GitHub folder UI also failed in the web reader; read-only API directory metadata supplied locations. A mistakenly selected FDA navigation link supplied no evidence; the final guidance was retrieved through its actual download link. Older draft guidance found in search was not substituted for the May 2021 final document.

Future implementation should recheck standards editions and adapter behavior when adopting them. Broader source reading or a normative assessment can be requested separately. Nothing in these sources changes clinic source authority, resolves provisional clinic business rules or supplies deployment approval.
