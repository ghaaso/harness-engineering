# Local project audit

Inspected 30 September 2026; revised after the user identified the complete Documents copy. This is a coding-workflow audit, not a new clinic transaction study or architecture selection.

## Canonical location for this task

Use C:\Users\User\OneDrive\Documents\Bilal_Migration\User\Downloads\20_PROJECTS\24_Clinic_Workshop, as directed by the user. The configured D: workspace is a partial earlier copy. Its technical-plan directory contained only reading-coverage.md, but the complete Documents project contains all ten planning documents. The plans were located and reviewed; they do not need to be recreated.

This location mismatch is itself a context-engineering finding: agents need to verify the intended checkout and source revision before interpreting missing files. The Documents README already identifies the current location; the earlier handoff retains historical D: paths. A launch/task record should state the current project explicitly. Do not treat historical paths as evidence that work was not done.

## Observed state of the complete Documents project

| Item | Observed evidence | Implication |
| --- | --- | --- |
| Version control | No .git at the project root | No commit-based baseline, branch isolation, or clean-checkout workflow yet |
| Application | No clinic application, dependency manifest, application tests, or CI in the inventory; only the existing PDF builder | The stack is a planning proposal; application commands and measured coding gains do not yet exist |
| Instructions | Root AGENTS.md preserves the same source-authority rules as D: | Retain its project-specific evidence model rather than replacing it with upstream personas |
| Planning package | README, reading coverage, traceability, system dynamics, architecture, data model, contracts/permissions, operations/costs, implementation plan, decision log | Substantive design already exists; task packets should route to it and record affected decisions rather than restart broad planning |
| Proposed architecture | Django 5.2 LTS/Python 3.13/PostgreSQL modular monolith; server-rendered forms/HTMX; ERPNext fallback | Tailor the future coding setup to this proposal while preserving its proposed/untested status |
| Proposed implementation | S00 reproducible baseline, S01 identity/catalogue, S02 posting foundations, S03 first complete receipt, later slices through S12 | Use the existing dependency order, acceptance tests and shared contract |
| Source authority | Original PDF/provenance plus USER-01 through USER-14 in clinic-planning-brief.md | Separate requirements, evidence, design proposals and actual implementation results |
| Existing tooling | tools/build_clinic_charter.py imports ReportLab and Windows Arial paths | Document its own environment; it is not a clinic application test suite |

The complete plan is labeled a completed planning package, with architecture and business rules still proposed. It does not establish a built product, ERP trial, hosting benchmark, restore test, clinic acceptance or deployment. Public stack/version/price statements remain the prior plan's dated evidence; this workflow research does not newly certify them.

## Existing strengths to preserve

The project distinguishes REPORTED, OBSERVED, DOCUMENTED, INFERRED, PROPOSED and UNKNOWN. It records later user instructions separately from source evidence. It prevents archived requirements, synthetic scenarios and unrelated workshop materials from becoming clinic facts. The planning package already defines command ownership, stock/financial invariants, capabilities, retry behavior, a synthetic walkthrough and meaningful acceptance tests.

The useful additions are executable foundations, compact task-specific context, proportional design refinement and check evidence. Preserve the full source-reading requirement when executing an architecture task that requires it. Reading the complete existing plan for workflow mapping does not turn its proposals into accepted clinic policy.

## Reading coverage for this task

Root instructions/navigation, planning brief, research index and original architecture handoff were read in the D: copy; the Documents root instructions/navigation and all ten technical-plan documents were then read by the research team after the user's location correction. Individual plan reviews were split across architecture/coverage, domain/contracts/implementation, operations/decisions/traceability; root reviewed system dynamics and integrated the results.

The original clinic PDF, archived PDFs, DWG geometry and flyers were not newly read for this coding-workflow task. No new operational finding relies on independently rereading those originals. Existing source-audit/reconciliation text was consulted for evidence boundaries, without claiming a new complete 41-page audit. The prior plan's reading record remains prior-work evidence rather than this task's own PDF-reading claim.

No document builder, upstream agent runtime, live service integration or application benchmark was executed. Hash checks in the [verification record](verification.md) establish preservation of authority/source/planning files; they do not establish clinical accuracy or runtime correctness.

## Prioritized improvements

1. Use the Documents project consistently; put the canonical work directory and base revision/hash in launchers and handoffs. Avoid developing against the incomplete D: copy by mistake.
2. Establish Git/ignore boundaries and reproducible commands through S00, while preserving sources and the completed plan.
3. Route bounded tasks to existing decisions, contracts, invariant/test IDs and relevant source evidence. Capture only the additional design needed for the slice.
4. Deliver the existing S01/S02 prerequisites and S03 receipt behavior with synthetic fixtures and real PostgreSQL integrity checks when development is authorized.
5. Pilot and measure the workflow before claiming a coding multiplier or adding runtime frameworks.

These remain setup proposals. Original root instructions, source evidence and technical-plan files were preserved.
