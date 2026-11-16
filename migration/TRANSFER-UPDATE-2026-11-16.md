# Transfer update — 16 November 2026

This update brings the archive up to date with harness work written in EMS_workshop1 after the earlier snapshot. It is additive: nothing already in this repository was deleted, moved or renamed, and nothing under `recovered/` was changed.

## What it covers

The earlier snapshot's update capture ended on **15 November 2026 at 18:33 UTC**. Work continued in EMS_workshop1 after that, mostly:

- the end of the embeddings trial: the coordinator's report (`COORDINATOR-REPORT.md`), the lane's `RESULT.md`, `result.json`, `AUDIT.md` and `CLAIMS.md`, and a curated copy of the lane's records and the coordinator's checks (`lane/`, `coordinator/`) under `docs/program/evidence/harness-bottlenecks/graph2/embeddings/`;
- protocol rulings 112 and 113 (`graph2/protocol-addendum-8.md`), the graph v2 page rebuilt with the measured trial (`docs/program/graph-v2/`, with new screenshots in `shots-embeddings/`), and updates to `GRAPH-V2-DESIGN-2026-11.md` and `HARNESS-BOTTLENECKS-2026-11.md`;
- `docs/program/RESEARCH-DIRECTION-2026-11-16.md`;
- the audit agents' scripts and outputs that checked the trial and its report, from the coordinating session's scratchpad.

Each file was compared with this repository by sha256 at copy time: same path and bytes (left alone), same path with newer bytes (replaced), same bytes at another path (not copied), or absent (added).

## Counts

| What | Files | MB |
| --- | ---: | ---: |
| Replaced with EMS_workshop1's newer bytes (same path) | 14 | 1.23 |
| Added from EMS_workshop1 `docs/program` (absent by path and by hash) | 573 | 52.73 |
| Added although the same bytes are held elsewhere here, because something reads them at this path (see below) | 18 | 0.38 |
| Added under `graph2/embeddings/coordinator/audit-work/` from the scratchpad's `coord/` folder | 251 | 9.40 |
| New files written for this update: `CLAUDE.md`, `docs/program/RESEARCH-TREE-PROTOCOL-2026-11-16.md`, `embeddings/PRESENT-ELSEWHERE.tsv`, `audit-work/README.md`, this file | 5 | 0.26 |

`docs/program/evidence/harness-bottlenecks/manifest.sha256` was regenerated for this repository's own tree (one line per file in that folder, sorted bytewise) instead of being copied.

The 18 path-bound copies are three data files the graph v2 page build (`docs/program/graph-v2/data/extras.js.txt`) reads (`lane/train/report/tune.json`, `lane/grader-returns/tune-item24.json`, `lane/train/heldout/item27.json`) and files that section 10 of `COORDINATOR-REPORT.md` names (`coordinator-rulings-103.md` to `-111.md`, `item27-verification.json`, `tune-rank.json`, four `counts.json` files in `r58c/sleep-check/`). Every other path the build and section 10 name, and both `MANIFEST.sha256` files, were absent here and are among the 573 additions; `protocol-addendum-8.md` is among the 14 replacements.

## Deliberately not copied

- **Same bytes already in this repository: 1,132 files of the curated `lane/`/`coordinator/` copy (69.3 MB).** Each is listed in `docs/program/evidence/harness-bottlenecks/graph2/embeddings/PRESENT-ELSEWHERE.tsv` with its sha256 and the path here (almost all under `recovered/`) that holds the same bytes. One further 19-byte file (`graph-v2/shots-embeddings/overflow-644.txt`) matches a file under `evidence/library-pathways/`.
- **From the scratchpad's `coord/` folder:** 1,736 files already held here by sha256 and 46 whose bytes the curated copy now carries.
- **Held-out truth:** from `coord/audit10b/heldout2/` the two held-out truth files and nine outputs derived from them (`score.json` and the `.out` files), 912,852 bytes in all; only its `.js` scripts and `.txt` notes were kept. No `sealed` folder, `.part` file, dependency folder or key file was among the candidates.
- **Product (ship-plan) files:** none of EMS_workshop1's product files under `docs/program` was newer or missing here, so none was copied or changed.
- **Size limit:** no candidate was over 45 MB; the largest addition is 6.7 MB.

## How to verify

- Each added or replaced file's sha256 equals the sha256 of its source file in EMS_workshop1 (or in the scratchpad's `coord/` folder for `audit-work/`). All 858 copies were compared after copying and all were equal.
- `sha256sum -c` run inside `docs/program/evidence/harness-bottlenecks/` against `manifest.sha256` checks that folder, including every file this update put there.
- Each row of `PRESENT-ELSEWHERE.tsv` can be checked by hashing its third-column path.
- A credential scan of every added or replaced file (private keys, token shapes, credential assignments, connection strings with passwords, e-mail addresses) found nothing.
