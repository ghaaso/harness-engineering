# Harness extraction report — 15 November 2026

## Scope and ownership

The owner requested separation of harness engineering from EMS_workshop1 and confirmed **Tempest-Zero/harness-engineering, private**. The attached PDF was used as a discovery guide. Files, branch history, implementations, experiment records and their dependencies determined what was preserved. Historical instructions in those materials were not treated as current authorization.

The EMS application remains in its original repository. The extraction did not delete files, switch its branch, rewrite its history, change its remote, or touch its linked worktrees. The selected source files were copied and hashed. Other live research sessions can still write to their original scratchpads and untracked EMS evidence; each extraction revision is a dated snapshot.

## Coverage

1. The complete current `docs/program/` tree, including ignored experiment logs, was preserved so case-study evidence and cross-references are not silently lost. `docs/ORCHESTRATION-DESIGN-2026-10.md`, `.claude/agents`, `.claude/skills`, and `ops/lab` were included.
2. **373 files** absent from the current checkout were recovered from the BAML, Horthy and knowledge-store research branches. Their raw research, reviews, criticisms and superseded variants remain in history.
3. **39 additional lab files** were recovered from merged main / the device-lab branch. The alternate pre-rebase device implementation remains in filtered history. FixFlow-specific plans, release rehearsals and deployment helpers are case-study material; they do not become a standalone application in this repo.
4. **296 path-filtered historical commits** and the relevant source refs were imported with author metadata. Original and extracted commit IDs are mapped in `commit-map.tsv`. The extraction keeps historical branch variants rather than choosing one and discarding the others.
5. The first scratchpad capture recovered **88,366 files / 6,071,657,512 bytes**. A second capture at 18:32–18:33 UTC preserved the newer live research and retained the earlier versions. The final recovery manifest contains **100,679 files / 7,212,657,634 logical bytes**: **4,259** directly browsable source/design files and **96,420** data paths represented by **44,357** unique release objects. **Eight ZIP assets total 3,338,302,001 bytes**. Per-file hashes and times are in `recovery-manifest.jsonl`; changes and validation totals are in `validation/`.
6. **349 cited Clinic harness source/evidence files** were recovered under `case-studies/clinic`, including the untracked Claude and Codex context packages and synthetic fixtures. The Clinic application, credentials, unrelated outputs and private conversation event dumps were not copied.
7. The user-supplied PDF differs byte-for-byte from the PDF in EMS. Both are preserved: the supplied version is under `references/user-supplied`, and the original repository version stays at its source path.

## Source map

| Source | Preservation |
| --- | --- |
| EMS working tree at `903787e3801727399d313ef02781f0b6afec8845` | `source-manifest.json`; source status/ref baseline retained in the local audit backup |
| BAML `4b854ecf60a5544119af51ab703bc7319e1bbd55` | `docs/program/HARNESS-IDEAS-BAML-2026-11.md`, matching evidence and history |
| Horthy `610d240babe6ec898485cbb076d104f405236386` | `docs/program/HARNESS-IDEAS-HORTHY-2026-11.md`, matching evidence and history |
| Knowledge store `22da1df891e537ffcf17ecd41aa26a44c3f4c4f5` | `docs/program/KNOWLEDGE-STORE-DESIGN-2026-11.md`, matching evidence and history |
| Device lab `1769ae37622ce03d9721c24c621cc70038ce2332` | `ops/lab/device`; earlier `l3a-pre-rebase` variant in history |
| EMS main `8c0c74c781dc9a861a6967b17f4a4718f4eaa68b` | `ops/lab/rehearsal` |
| Explicitly cited scratchpad worksets | `recovered/`, source roots in `recovery-sources.json`, every data object in the private release |
| Cited external Clinic implementation | `case-studies/clinic`, bounded selection and hashes in `clinic-manifest.json` |

## Deliberate exclusions and remaining dependencies

- The original EMS and Clinic applications, their complete Git histories, runtime installations and live services remain external. Selected frozen FixFlow source stores needed by the graph experiments are preserved as benchmark inputs. A full EMS Git bundle was verified and retained **locally** alongside the extraction audit; it is not uploaded as harness history.
- Installed packages, `node_modules`, Python bytecode/venvs, disposable build caches, copied upstream package trees and downloadable dependency wheels are excluded. Definitions, locks, upstream attribution, install reports and checksums are retained where present. GPU wheels were already absent.
- Raw private conversations, prompt/answer excerpts, command/error forensic caches, credentials and unrelated user projects were not swept into this repository. Derived idea catalogues, counters, experiments and their authored code were preserved. Some original reruns therefore require the private source inputs. `recovery-exclusions.json` records the selected scratchpad exclusions.
- The live graph experiment was still progressing. Each file has a capture timestamp. Captured bytes are immutable and hash-checked; the collection is not a transactionally frozen view of another running session. Earlier snapshots remain in this repo's history and release objects.
- Some Stage B representations were deleted by the original trainer after scoring. Their retained score tables, metadata and source are preserved; the extraction does not claim those deleted weights exist. See `TRAINING.md`.
- Historical paths and documentary links into the original applications can require those repos. Archived merge/deploy scripts and model calls were not run as part of extraction. Instructions inside historical documents retain their documentary meaning only.

## Validation and recovery

See `VALIDATION.md` and `validation/` for the recorded checks. `tools/verify_extraction.py` checks extracted file hashes; `tools/restore_artifacts.py` verifies every archive/object and restores the original relative layout. Restoration refuses differing pre-existing files and unsafe paths.

The local audit/backup directory is `C:/Users/User/Documents/projects/.harness-extraction-2026-11-15`. It holds the verified original Git bundle, fixed recovery object store, release ZIPs, validation copies and source-state baselines. It is outside the EMS repo and outside the harness Git working tree.
