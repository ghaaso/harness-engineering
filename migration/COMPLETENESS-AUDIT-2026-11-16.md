# Completeness re-audit — 16 November 2026

The first extraction was **not exhaustive**. Its integrity checks proved that selected files were copied accurately; they did not prove that the selection included every relevant file. A second audit, prompted by the owner's question, found and repaired concrete omissions.

## Recovered in this correction

**190 files, 5,279,113 bytes**, recorded individually in `completeness-additions.json`:

| Files | Content and original omission |
| ---: | --- |
| 96 | Earlier simulation engines, tests, report/model variants, data, backups and prior test workspaces beside the selected `sim` folder. The original allowlist stopped at the child folder. |
| 40 | Report-building scripts, editorial/reviewer output, earlier package definitions and relevant saved project-memory notes beside the selected `compile` folder. The notes include harness ideas and corrections and are historical evidence, not active instructions. |
| 28 | Seven measurement scripts; two document-checking utilities and a screenshot; eighteen files in the synthetic `coord/fixture/stale` test case. A generic `stale` directory exclusion incorrectly classified that fixture as a dependency cache. |
| 22 | FixFlow context/gate implementations and configuration, two distinct untracked reviewer prototypes, the earlier Node context checker, case-study wiring, and distinct merged-main smoke-gate versions. These were outside the initial path filter. |
| 4 | Outputs for the held-out unit ending `157158eb8b84`, written during the original capture. Its completion reached the saved progress log after the file enumeration had already passed its directory. |

The fixture and evaluation outputs are restored at their original relative paths. The generic `stale` exclusion has been narrowed to the actual dependency-wheel directory. New historical variants are separated from the original captured evidence. Original EMS/Clinic files and live experiments were not changed or executed.

## What was checked

- All **2,831 files currently inside the original EMS selection roots** still match the original capture; no new or changed paths were found there during this audit.
- A broader scan of **44 worktrees** found two distinct non-cache untracked reviewer prototypes outside the first filter; both are now included. The broader Git-path audit also located the omitted context guards and historical checker.
- The known scratchpad roots and their immediate parents were enumerated. This exposed the adjacent model/report versions missed by the first allowlist. Their authored code, saved results, relevant notes and variants are now included, including duplicates where needed to retain directory context.
- The copied-app exclusions were checked against original Git blobs; the excluded `g2c` backend and mobile copies match existing EMS objects. Other reviewed exclusions were upstream package code, generated build/typecheck caches, or dependency wheels. These are documented external/reconstructible dependencies.
- The saved catalogue contains 484 unique idea records with origin fields. That establishes preservation of the catalogue, not proof that every idea ever expressed in private conversations appears in it.
- All **77 completed units in the archived held-out log** now have their metadata and data files; **231 recorded data hashes match**. The original capture was a partial run, not a completed evaluation.

## Confidence and limits

After these fixes, no additional unexplained omission was found within the audited repository refs, worktrees, named worksets and adjacent research folders. This is bounded evidence, not an absolute guarantee about every file or idea on the machine.

Raw private conversation/error inputs, unrelated application work, installed dependencies and some runtime caches remain outside this repo. The original application repositories are required for certain case-study scripts. Known exclusions are listed in `recovery-exclusions.json` and `completeness-exclusions.json`; the wrongly excluded fixture is explicitly marked recovered.

The live held-out run continued after the snapshot. Later outputs are newer work, not part of this historical capture. At the audit's last read it had reached 174 of 210 units and still had no final handoff or grader return. Those later outputs were not swept into this correction. Some intermediate training representations had already been deleted by the original trainer and cannot be recovered from this snapshot.

The first eight release archives remain unchanged and retain their verified server hashes. The 190 corrections are carried directly in Git, and the integrity checker now includes their separate manifest. Use the latest `main` checkout together with the release assets; the original release tag describes the earlier snapshot.
