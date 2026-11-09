# Evidence: harness ideas from Dex Horthy's published work (2026-11-04)

Raw outputs behind `docs/program/HARNESS-IDEAS-HORTHY-2026-11.md`. These files are evidence, not
state: nothing here is edited after the fact. `manifest.sha256` lists every file's digest at the
time the document was committed.

| Path | What it is |
| --- | --- |
| `inventory.md` | The starting index (about 80 dated items), copied verbatim from the research session's scratchpad before the sweep |
| `sources-ledger.tsv` | Every text source the readers were given: kind, local path, bytes, words, sha256 and origin URL (the sources themselves stay out of the repository: they are other people's transcripts and posts) |
| `sweep/readers/R01..R46.json` | Each reader's structured output, verbatim (sources read with status, idea cards, gaps, new sources found) |
| `sweep/cards-raw.json` | Every card from every reader, in reader order |
| `sweep/cards-merged.json` | The cards after the plain-code dedupe (token Jaccard ≥ 0.4 on claim + quote, light stemming); newest source first; `also` lists the merged duplicates |
| `sweep/dedupe-merges.json` | Each merge the code made, with the similarity score and both claims, so a wrong merge can be found |
| `sweep/PRE-REVIEW-LIST.md` | The pre-review list rendered from `cards-merged.json`: every card, unjudged |
| `sweep/reader-summary.tsv` | Cards and source statuses per reader |
| `review/families.json` | The 838 claim families (Sonnet clustering, organising only) with both reviewers' scores, the refuter verdict where one ran, and the final disposition per family |
| `review/POST-REVIEW-LIST.md` | The post-review list: every family with scores, disposition, refuter verdict and a one-line reason, grouped by weakness |
| `review/card-dispositions.tsv` | Every card → its family → the final disposition |
| `review/reviews.json`, `review/refutations.json`, `review/critic.json` | The 24 reviewer outputs, the 144 refuter verdicts and the completeness critic, verbatim |
| `review/stats.json` | Counts per group and disposition, coverage validation |
| `workflows/*.js.txt` | The Workflow-tool scripts exactly as run (saved as `.txt` so the frontend lint job does not parse them) |
| `tools/*.txt` | The helper scripts used to fetch and render sources (YouTube transcripts via an ephemeral `uvx` run, X articles via the fxtwitter API, page-to-text, the Tessl CMS query) and to build the lists |
| `addendum-2026-11-09/` | The addendum of 2026-11-09: sources published or first readable after the first pass, their cards mapped onto the same 838 families, the re-adjudication and the refuter verdicts (its own README lists the files). Added later; no first-pass file was changed |

Readers were Sonnet at low or medium effort, blind to each other; reviewers and refuters were
Opus (high; refuters xhigh). The main session (Fable) briefed and judged and read no source in
full itself. Run ids: sweep `wf_5b59f5db-8bc` (40 readers), round 2 `wf_95340a7b-f40` (5),
round 3 `wf_5a1d0daf-5cb` (1); review `wf_73237cdf-5f8` (8 Sonnet clusterers, 24 Opus reviewers, 144 Opus refuters at xhigh, 1 Opus critic; two passes, the first lost its families to a script defect and was resumed from the cached clusterer outputs).
