# CARD-RUN: the 12 GB card run, D4 and D2 Phase A as one run (big run, session 589e137c, 2026-11-24)

Owner's approvals: r57-0064 (the run, cap 600 M for the whole big run) and, on 2026-11-24, the downloads in
`research-tree/build/runbig/DOWNLOADS.md` (about 2.3 GB: Qwen3-Embedding-0.6B, SweRankEmbed-Small (non-commercial,
research use), the zulip/zulip clone, the Temurin 17 JRE image, AnyBURL, the Python packages and their dependencies).
Nothing outside that list is downloaded or installed (CLAUDE.md rule 3); a missing item goes back to the coordinator.
MAIN = `C:/Users/User/Documents/projects/harness-engineering`. CR = `C:/Users/User/Documents/projects/card-run-2026-11/`
(outside every repository: downloads, clones, indexes, logs, results). Code goes in `MAIN/research-tree/build/runbig/card/`
(new files only; commit nothing: the coordinator commits). Rule 4: no project name, path or code in any outside request.
Rule 8: build, run targeted tests, run; no plan, spec or page.

What the run is: `MAIN/research-tree/build/TRACK-PLAN.md` sections 3.6 (D4, lines 246-280) and 3.7 (D2 Phase A,
lines 281-294), read in full, with step 2a/2b's results in DOWNLOADS.md (n = 617 held-out commits, per-commit scores
absent; card hours there are a linear guess). The earlier test and its code: `MAIN/docs/program/evidence/harness-bottlenecks/graph2/embeddings/`
(COORDINATOR-REPORT.md, RESULT.md, result.json; its code is evidence: copy, never edit in place, rule 1). Repositories:
FixFlow and the clinic as the earlier test found them, and zulip/zulip from CR.

Common rules:
- Every experiment runs in a container with the network off (`--network none`); downloads only in the fetch step.
- The card: one card job at a time across both builders: take `CR/GPU.lock` with `mkdir` (atomic) before a card job,
  remove it after; a job that waits says so in its log. Card container memory cap 6 GB (section 3.6).
- Scoring is fixed before any arm runs (sections 3.6 and 3.7: leak-free splits by date, files each held-out commit
  edited, random tie-breaking); write it in your code's README first and do not change it after a result is seen.
- The PC sleeps after 15 idle minutes: while a long job runs, watch its log in calls under 150 s each until it ends.
- Before starting any single job projected (from its own first minutes) past 6 hours, stop and write the projection
  to your report, then go on with the rest; the coordinator decides on it.
- Report in under 300 words, also written to `MAIN/research-tree/build/runbig/<your part>-report.md`: what ran, each
  arm's score with its interval, the verdict against the gate, card hours and wall time, what broke.

## Fetch (run, sonnet)
Download every approved item into CR (models under `CR/models/`, the clone under `CR/repos/zulip`, the jar under
`CR/tools/`), pull the Temurin 17 JRE image, and build one CPU/GPU image for D2 from the earlier image
`graphtest-kge-gpu:1` plus the approved Python packages (record the transitive packages pip pulled and their total
size). Check sizes against DOWNLOADS.md; write `CR/FETCHED.md` (item, path, bytes, sha256). Do not start Docker
Desktop or reset it; it is running.

## D4 builder (build, sonnet): section 3.6 whole, pre-tests first
## D2 builder (build, sonnet): section 3.7 whole

## Refuter (refute, opus), one per builder, before the full runs
Once a builder's code runs on a small slice, one blind check of that code only against its section's scoring rules:
leaks across the date split, an arm seeing the answer, wrong tie-breaking, a wrong gate. Verdict to
`MAIN/research-tree/build/refute/CARD-<D4|D2>.md`, breaking findings first; only those go back.
