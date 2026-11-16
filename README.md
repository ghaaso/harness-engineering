# Harness engineering

Research, ideas, orchestration methods, simulations, graph retrieval experiments, model training, and supporting evidence recovered from **Tempest-Zero/EMS_workshop1** on **15 November 2026**.

This is a private research repository. The original EMS/FixFlow repository remains intact. Original research files retain their paths and bytes; the PDF is an index to the work, not the authority for its findings. Read the protocols, results, refutations, and subsequent corrections together.

**Completeness correction, 16 November:** a broader audit found 190 omitted files, including older simulation/report variants, custom gates and a test fixture. They are now preserved in `main`. Read the [audit and remaining limits](migration/COMPLETENESS-AUDIT-2026-11-16.md); integrity checks alone do not establish exhaustive coverage.

## Start here

| Area | Entry points |
| --- | --- |
| Ideas and bottlenecks | [Full source catalogue](docs/program/evidence/harness-compile/data/catalogue.json), [bottleneck register](docs/program/evidence/harness-compile/data/register.json), [short PDF](docs/program/HARNESS-IDEAS-AND-BOTTLENECKS-2026-11-14.pdf), [reference PDF](docs/program/HARNESS-IDEAS-AND-BOTTLENECKS-2026-11-14-REFERENCE.pdf) |
| Harness design | [Original orchestration design](docs/ORCHESTRATION-DESIGN-2026-10.md), [review](docs/program/HARNESS-REVIEW-2026-11-01.md), [bottlenecks](docs/program/HARNESS-BOTTLENECKS-2026-11.md), [v2 design](docs/program/HARNESS-V2-DESIGN-2026-11.md) |
| Recovered research branches | [Knowledge store](docs/program/KNOWLEDGE-STORE-DESIGN-2026-11.md), [BAML](docs/program/HARNESS-IDEAS-BAML-2026-11.md), [Dex Horthy](docs/program/HARNESS-IDEAS-HORTHY-2026-11.md) |
| Memory and simulations | [Library pathways](docs/program/LIBRARY-PATHWAYS-2026-11.md), [simulation engine](docs/program/library-pathways/engine.js), [compaction](docs/program/AFTER-COMPACTION-2026-11.md), [summary checks](docs/program/SUMMARY-CHECK-2026-11.md) |
| Tokens and orchestration splitting | [Token study](docs/program/TOKEN-BOTTLENECK-2026-11.md), [split rule and replay](docs/program/SPLIT-RULE-2026-11.md) |
| Graphs and trained models | [Graph test](docs/program/GRAPH-TEST-RESULT-2026-11.md), [graph v2](docs/program/GRAPH-V2-DESIGN-2026-11.md), [training recovery guide](migration/TRAINING.md), [recovered graph source](recovered/hb/graph2/), [end-of-run coordination](recovered/coord/) |
| Agent methods and practical gates | [Skills](.claude/skills/), [agents](.claude/agents/), [lane and gate scripts](docs/program/lab/), [Android/device/rehearsal harnesses](ops/lab/) |
| Supporting case studies | [FixFlow context](case-studies/fixflow/), [Clinic harness implementations](case-studies/clinic/), [original ship programme](docs/program/SHIP-PLAN-2026-11.md) |
| Extraction coverage | [Migration report](migration/REPORT.md), [source manifest](migration/source-manifest.json), [commit mapping](migration/commit-map.tsv), [artifact inventory](migration/release-assets.json) |

## Model and dataset files

Original custom data, weights, graphs, tables, intermediate experiments, and diagnostics are preserved in the private GitHub release **`recovery-2026-11-15`**. Source code and design files are browsable in Git. The large release assets use content-addressed objects to preserve duplicate historical variants without storing their bytes repeatedly.

With Python 3.10+ and an authenticated GitHub CLI:

```sh
gh release download recovery-2026-11-15 --repo Tempest-Zero/harness-engineering --pattern 'recovery-*.zip' --dir artifacts
python tools/restore_artifacts.py --assets artifacts --verify-only
python tools/restore_artifacts.py --assets artifacts
python tools/verify_extraction.py --include-restored-data
```

Restoration rebuilds the original relative layout below `recovered/`. It verifies archive and file SHA-256 hashes, refuses path escapes, and does not replace differing files. These are research snapshots; restoring them does not execute experiments. Allow about 11 GB of additional disk space for both downloaded archives and restored data. Without the assets, `python tools/verify_extraction.py` verifies the files carried directly in Git.

## Reproducibility and scope

The saved library-model tests and both report builders passed during extraction. [Validation details](migration/VALIDATION.md) distinguish those checks from training and live application tests, which were not rerun.

The FixFlow lab and deployment scripts require the original EMS application. Frozen source snapshots used as graph benchmark inputs are retained in the recovery assets; regenerating them requires the original private Git history. Historical absolute paths, Docker image recipes, and model locks are preserved as evidence and may need configuration on a new machine. Dependency wheels, installed packages, raw private conversation dumps, and application secrets are outside the extracted corpus; [exclusions](migration/recovery-exclusions.json) and the migration report document the boundary.

`history/heads/*` and `history/remotes/*` preserve the selected paths across the available source refs. Filtering changes commit IDs; the commit map records the relationship to EMS. `main` combines the research branches and captures the uncommitted research. The original project and its Git history were not rewritten.

Third-party skill and research materials retain their existing licenses and source attribution. No new blanket license is asserted over this collected corpus.
