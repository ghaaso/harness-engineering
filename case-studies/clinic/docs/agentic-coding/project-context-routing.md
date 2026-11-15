# Route coding tasks to the existing clinic plan

Status: context map based on the complete Documents planning package, reviewed 30 September 2026 and linked from the current project entry points. The architecture, business rules and broader workflow setup remain proposed and unimplemented. This map organizes the plan; it does not replace it or grant permission to develop/deploy the application.

Workflow implementation update, 1 October 2026: the [operating guide](workflow-implementation.md) provides implemented local document/checkpoint commands and amended task records. Application S00-S12 and T01-T20 remain unimplemented; this plan-routing map continues to govern their context selection.

## Start in the right project

Current project: this checkout (the repository root containing AGENTS.md).

The [current coding launcher](../prompts/coding-task-launcher.md) uses this root. The original architecture handoff contains historical D: paths. Before working, verify the root README, AGENTS.md, complete [technical-plan index](../technical-plan/README.md), and current revision/hash. Record the Git revision of the local repository (established 1 October 2026) as the base. Do not infer missing design work from the partial D: copy.

## Reuse the design and traceability chain

Record this chain in a substantial task: direct user request / USER or evidence ID -> proposed decision A-ID and status -> affected Q-ID -> slice S-ID -> contract/invariant -> acceptance T-ID -> actual code and check evidence.

| Work | Relevant existing documents | What the packet should retain |
| --- | --- | --- |
| S00 environment and baseline | [Architecture](../technical-plan/architecture.md), [implementation](../technical-plan/implementation-plan.md), [decisions](../technical-plan/decision-log.md) | Proposed stack, exact pins once chosen, reproducible local PostgreSQL, configuration, verification command and CI; no guessed successful commands |
| S01 identity/catalogue | [Data model](../technical-plan/domain-and-data-model.md), [permissions/contracts](../technical-plan/contracts-and-permissions.md) | Capabilities, unit quantum/conversion versions, batch/expiry, T01/T03/T20 |
| S02 posting foundations | Data model, contracts, decisions | Ownership, atomic posting, idempotency, audit, reversal dependencies, T05/T13/T18; split this broad slice into bounded packets |
| S03 purchase/receipt | Data model, contracts, [system dynamics](../technical-plan/system-dynamics.md), implementation | Accepted/rejected split, document states, exact units, independent stock/invoice/cash effects, T01/T02/T03/T05 |
| S04 issue | Data model, contracts, decisions | Issue event, reference linkage, eligibility, last-unit concurrency, T03/T04/T05/T07 |
| S05 count/case/correction | System dynamics, data model, contracts | Count cutoff, gate/stale states, delta applied to current balance, unresolved cause, T06/T07/T13 |
| S06 supplier finance | Data model, contracts, decisions | Obligation/allocation, advance, return versus credit/refund/replacement, T08/T09/T18 |
| S07 expense/cash | Data model, contracts, system dynamics | Accrual versus payment, transfers, cash observation versus correction, T10/T18 |
| S08 restricted pay information | Data model, contracts, [traceability](../technical-plan/requirements-traceability.md) | Accrual/payment separation and restrictions across reports/files/jobs/audit/aggregates, T11/T12 |
| S09 reports/export | Contracts, data model, traceability | Metric definitions, provenance/unknown cost, permission-filtered aggregates and freshness, T12/T18/T19 |
| S10 imports/openings | Implementation, data model, decisions | Mapping versions, source hashes, overlap/deduplication, evidence/reviewer status, T14 |
| S11 operating proof | [Operations/costs](../technical-plan/operations-and-costs.md), implementation, decisions | Proposed load/cost/recovery gates, deployment/restore/upgrade/rollback procedures, T15/T16/T17 |
| S12 pilot/cutover | Implementation, operations, decisions | Actual authorized pilot, second-maintainer reproducibility, operational acceptance and rollback; planned checks must become evidence |

The mapping is a navigation aid, not an exhaustive substitute for each slice's own dependencies and acceptance criteria. Read those in the [implementation plan](../technical-plan/implementation-plan.md); for example, S03 also requires T13 in addition to the tests abbreviated above. Include other affected tests when cross-module behavior changes.

## Preserve the important proposed invariants

The [data model](../technical-plan/domain-and-data-model.md) specifies exact Decimal/PostgreSQL numeric(20,6) quantities, immutable conversion versions, and integer minor-unit money with configured currency/exponent. Do not use binary floats for these calculations or assume a clinic currency from synthetic LCU examples.

Only inventory writes movements/holdings; only finance writes journals. Cross-module postings use one outer transaction. Posted records remain immutable, with linked opposite postings for corrections and controlled dependent-reversal rules. Stock, invoices, payments, cases and supplier settlements remain distinct effects.

Idempotency claims the key and canonical payload hash inside the transaction; same-key changed content conflicts, replay reauthorizes access, and a new key cannot repost an already-posted document. The proposed global lock order is documents -> stock scopes/balances/layers -> finance accounts -> obligations/allocations. Use actual PostgreSQL connections/fault injection for T04/T05/T13; mocked ORM calls cannot establish concurrency/atomicity.

Count adjustments apply the observed delta to current stock. Unknown cost remains NULL with coverage information, not zero. Salary restrictions extend to journals, totals, search, files, exports, jobs, audit and error responses. Read the full affected contract rather than assuming a hidden screen is a permission boundary.

## Use the existing interface and failure semantics

The proposed UI uses same-origin forms, CSRF and POST/redirect/GET; HTMX calls the same commands. Equivalent JSON contracts serve tests/future consumers without duplicating business rules. The server owns actor/capabilities and resulting balances.

The contract names errors including UNIT_PRECISION, RECEIPT_SPLIT, INSUFFICIENT_STOCK, COUNT_IN_PROGRESS, COUNT_STALE, VERSION_CONFLICT, IDEMPOTENCY_CONFLICT, DEPENDENT_POSTINGS and PERIOD_CLOSED. A timeout means an unknown outcome: query the operation/document and retry with the same key only as the contract allows. Update contracts, fixtures and acceptance tests together when changing behavior.

Application transaction retry limits are product behavior. They are separate from the coding agent's command-recovery budget. Likewise, proposed maker/reviewer controls for openings, corrections and privileges are product controls; they do not require a second human approval for every reversible coding edit.

## Start with the existing synthetic oracle

SYN-01 in [system dynamics](../technical-plan/system-dynamics.md) already provides a worked end-to-end example. Its quantities/currency/actors are synthetic. Useful independent expected results include:

- 12 packs delivered, 10 accepted and 2 rejected, 10 units/pack: 100 owned units; 20 rejected units excluded.
- Book 75 / count 73, then issue 3, then apply delta -2: current stock 70.
- Invoice 1,000 / payment 400 / physical return without recognized credit: payable still 600; credit 100 then produces 500.
- Pay accrual 300 / payment 200: due 100; payroll expense recognized once as 300.

These are planned test oracles, not completed runtime tests or clinic facts. Retain independent assertions and the T01-T20 catalogue instead of introducing a competing truth model.

## Verification remains to be implemented

The plan defines detailed gates but no installed application command that currently proves them. S00 should turn the selected tooling into documented, tested local/CI commands; subsequent slices implement their checks. Proposed recovery targets, resource thresholds, quoted hosting arithmetic and PC-off behavior must be measured before presenting them as demonstrated.

The A01-A14 decisions remain PROPOSED. Q01-Q15 are staged questions before their affected behavior/import/pilot/purchase/production work; they do not justify restarting all planning. Refine relevant choices within the user's authorized scope and keep material uncertainties attached to their actual consequences.
