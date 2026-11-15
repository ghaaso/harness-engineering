# Evidence: the BAML harness-ideas sweep (raw workflow outputs)

Raw per-agent outputs of the BAML sweep (`HARNESS-IDEAS-BAML-2026-11.md`), workflow
`wf_c1ca7657-850`, copied verbatim from the workflow journal on 2026-11-04 so the pre-review and
post-review lists rest on files in the repository rather than in a temporary folder.

| file | what it is |
| --- | --- |
| `read-D.json` … `read-P.json` | the six blind Sonnet readers, one lane each (D docs, R repository, B blog, T talks, I independent critiques, P prior art): tool status, URLs attempted, what could not be read, idea cards |
| `pre-review-merged.json` | the merged pre-review list after plain-code dedup (same URL and quote, or claim-token Jaccard ≥ 0.6); `merged_from` names the cards folded in |
| `merge-log.json` | every card the dedup folded away, with the claim it carried |
| `assess.json` | the one Opus assessment (high effort): five 0–3 scores and a disposition per card; the answer to the main session's prior claim |
| `refute.json` | the one fresh-context Opus refuter (xhigh): a verdict per adopt and trial card, default refuted |
| `critic.json` | the one short completeness critic: what was not read |
| `run.json` | run id and the counts the document quotes |
| `compare/P.md` | the problem case P (one deep-dive lane, steps 1–5) and the ten comparison dimensions R1–R10, written by the orchestrator for §4 |
| `compare/A-baml-design.md` | Sonnet agent A: P built in BAML v1's own structure from the canary standard-library source, with INFERRED and UNKNOWN marks |
| `compare/B-comparison.md` | Sonnet agent B: the two structures compared per dimension, with three of A's claims verified at source |

`manifest.sha256` lists every file's digest at copy time. These files are evidence, not state:
nothing here is updated after the fact.
