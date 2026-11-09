# Addendum evidence (2026-11-09): sources published or first readable after the first pass

Raw outputs behind §4 of `docs/program/HARNESS-IDEAS-HORTHY-2026-11.md`. The first pass
(2026-11-04) is the parent folder; nothing in it was edited. The 838 claim families of the first
pass are fixed: new cards were attached to them, never re-clustered.

| Path | What it is |
| --- | --- |
| `sources-ledger-addendum.tsv` | Every source this round used: text, X posts, chart images and audio, with bytes, words, sha256, origin and how it was obtained (the sources themselves stay out of the repository) |
| `x-timeline-index.json` | The ids of the 159 posts by @dexhorthy from 2026-09-01 to 2026-11-09 that the readers were given, by date window, and the reposts of other people that were excluded |
| `sweep/readers/R47..R55.json` | Each reader's structured output, verbatim |
| `sweep/mappings/R47..R55.json` | Each mapper's output: new card → one of the 838 fixed family ids with a relation (restates, supports, updates, contradicts), or NEW |
| `sweep/cards.json` | The 311 new cards, numbered C1907–C2217, each with its family and relation |
| `sweep/PRE-REVIEW-ADDENDUM.md` | The same cards rendered, unjudged; committed before the addendum review ran |
| `sweep/affected-families.json` | Per first-pass family: the new cards attached and their relations |
| `sweep/selection.json` | Which families were re-adjudicated and why (a new card updates or contradicts the family; the family was adopt, trial or over-cap; or a new card brings measured evidence), which were attached only, and the cards no family covers |
| `sweep/summary.json` | Counts |
| `review/` | The addendum review's outputs (written after the pre-review commit): the two-lens re-adjudication, the refuter verdicts, the first-pass over-cap families now refuted, the new families |
| `workflows/*.js.txt` | The two Workflow-tool scripts exactly as run |
| `tools/*.txt` | The fetch, transcription and build scripts |

How the sources were obtained: X posts through the fxtwitter API (`/2/profile/<user>/statuses`
for the timeline, the status endpoint for articles); the Tessl and Build Wiz transcripts from the
`podcast:transcript` tags of the shows' RSS feeds; nine recordings as audio-only streams
(`yt-dlp`, one RSS enclosure) transcribed on this machine with faster-whisper `distil-large-v3`
on the GPU through an ephemeral `uv run` environment; seven SlopCodeBench charts as PNGs read as
images. Readers were Sonnet (low or medium), mappers Sonnet (medium); reviewers Opus (high);
refuters Opus (xhigh). Run ids: sweep `wf_680c14a9-4a7` (R47–R50) and `wf_e6bb6562-8d7`
(R51–R55); the review run id is in the document's §4.
