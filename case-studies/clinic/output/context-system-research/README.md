# Automated context compression with quality preservation

Research corrected on 9 October 2026. The problem is Claude Code accumulating roughly 800k active tokens during project work, despite state-file/new-chat handoffs. The requested outcome is **roughly 300–400k active tokens carrying the useful information and task quality of that longer history, automatically, across ongoing work and later runs**. A token ceiling alone is insufficient.

**Closest shipped match found: Claude Code Infinite 1.0.14 with MemTree.** It combines continuous request compression, background hierarchical memory and access to original transcript details. Its maintainer reports the closest relevant quality comparison: Opus 5.5, a 775k-token starting history, about 420k after compression, similar task scores to the full-history arm and shorter completion time. This is a small reported benchmark, not established equivalence for every project, repeated restart, 300–400k setting or Ultracode.

Read the [decision report](report.md). Supporting audits:

- [Claude Code Infinite and YesMem](infinite-and-yesmem.md): continuous workflow, original recovery, publication, quality evidence, latency and deployment tradeoffs.
- [Virtual Context and Rolling Context](virtual-context-and-rolling.md): a configurable alternative with canonical history, automatic paging and quote/tool recovery.
- [LCM and native Claude behavior](lcm-and-native.md): summary lineage, actual Claude integration and evidence limits.
- [Surgery and quality contracts](surgery-and-quality-contracts.md): Distil, Jev and Scalpel, including measured quality/cost qualifications.
- [Sources and verification](verification.json): pins, committed source hashes, original-file preservation and focused mocked tests.

[Task state](../../docs/tasks/context-admission-research/task.md) is the continuation owner. [Earlier audits](../corpus-map-justification/10-context-admission-research/README.md) remain historical source evidence; their corpus-specific selection criteria and squeez-first recommendation are superseded. The work being performed in the project does not define the context-system requirements.

Research has not installed a system, changed Claude settings, sent project history to a memory service or conducted a paid/live model trial.
