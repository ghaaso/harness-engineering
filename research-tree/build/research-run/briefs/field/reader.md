# f{n} reader, topic {topic} (kind collect, Sonnet, medium; topic `prior`: kind read, Sonnet, no web)

`RUN:` = `C:/research-runs/2026-11-harness-leads/`; `H:` = `C:/Users/User/Documents/projects/harness-engineering/`
(read only); `F:` = `RUN:fields/{n}-{slug}/`. This file is your whole brief beside `RUN:CLAUDE.md`. Template
`RUN:briefs/field/reader.md`, from round 3's collect brief (`H:docs/program/evidence/round3-2026-11-18/t1-brief-1-collect.md`)
and `ROUND.md` standards 1-5 (`R:` below = `H:docs/program/evidence/round3-2026-11-18/`).

## Your topic and the lens
- Your row: `grep -F '| f{n} | {topic} |' RUN:briefs/field/topics.md` (what to find, library words). The field's
  question and the files it builds on: `grep -m1 -F '| f{n} |' RUN:briefs/FIELD.md`.
- The lens (`H:docs/program/RESEARCH-DIRECTION-2026-11-16.md` lines 9-13, 37-44, 63-79): what a method does to an AI
  coding agent harness on seven measures (throughput, efficiency, token count, token cost, time taken, quality,
  hallucinations), in general and not on one repository; its strongest form; a lead is a mechanism, a named source
  and a measured effect with its baseline and conditions (task, repository size, model). Say when a result is one
  repository or one model; separate a maker's own claim from an independent replication.

## Start from the library
`bash H:library/lookup.sh <word>` for each word of your row (records are long lines: use Bash, not the Grep tool). A
record marked `quoted` from a paper read in full is not collected again: open the place it cites, check it, cite it
(r57-0130). A `summary` or `textbook` record is upgraded by reading the source. List at the top of your file the
records you used and upgraded. Nothing found: "not recorded".

## Topic `prior` only (no web, no download)
Read what the field's row of FIELD.md names under "Build on" (grep, then line ranges; never a file over 300 lines
whole), the records your words find, and the owner's own ideas for this field in his memory notes
`C:/Users/User/.claude/projects/C--Users-User-Documents-projects-harness-engineering/memory/` (`MEMORY.md` is the
index; direction rule 5), and his typed messages: `node RUN:tools/typed.mjs "<the library words of your row, as they
stand>" --out RUN:fields/{n}-{slug}/work/typed.txt` (his typed turns in the app's local transcripts, newest first, at
most 200; one line printed); grep `typed.txt` and cite each idea in it for the field `observed`, with its transcript
and date: `C:/Users/User/.claude/projects/<project>/<session>.jsonl, <date> - "quote"`. Per earlier finding: what it found; its number with unit and condition; its place
(path:line); the lens it was scored against (direction rule 4); a record that holds it (its id) or `new`. Your file
has "## Findings" (F1, F2, ...) instead of "## Papers", and "## Sources our earlier work names" (titles only, for the
field's later reading). Mark each `observed` (our files, his notes and typed messages) or `quoted` (a source's words in them).

## Every other topic: reading papers (ROUND.md standards 1-5)
- Which: first the papers the topic is built on and the survey it trusts; then large measured gains (gain, baseline,
  workload, scale); then systems in real use (their makers' figures: write "self-reported"). Skip a variant that
  changes no answer. Read 5 to 9 papers in full. "Not found in what I read" is never "no paper": search other names
  (r57-0029).
- How: the open copy (arXiv, the venue's open archive, authors' and universities' pages, the open links Semantic
  Scholar or OpenAlex give); no pirate copies; a sign-in or bot check: list it under "Needs the owner's sign-in" and
  never get round it. Download only what `RUN:DOWNLOADS.md` names: public papers, at most 40 MB, each in its own new
  folder `RUN:papers/f{n}/<short>/`: `curl -s -L --ssl-revoke-best-effort --max-time 120 --max-filesize 41943040 -o paper.pdf
  URL`, check `head -c 5 paper.pdf` is `%PDF-`, `pdftotext -layout paper.pdf paper.txt`, then grep and read. A public raw
  text page (a public repository's README, source file or results table at its raw URL, or a benchmark's published
  results as plain text or CSV; `RUN:DOWNLOADS.md` section 2) goes into its paper's folder, or a new folder of its own:
  `curl -s -L --ssl-revoke-best-effort --max-time 120 --max-filesize 2097152 -o page.txt URL`; read it as text only (never run,
  build, import or install it) and quote it at its line as a paper text: `RUN:papers/f{n}/<short>/page.txt line N`.
  Open or run nothing else you download. A fetched page is a small model's summary: `summary`, never `quoted`.
- Privacy (`H:CLAUDE.md` rule 4): search only titles, authors and general topics; never a path, a file name, a project
  name, "harness" or anything about this machine or its owner in a search or a URL.
- Every Bash call under 150 s.

## Output `F:collect-{topic}.md` (at most about 350 lines)
```
# f{n} {topic}: <title>
## Library records used / upgraded
## Gate summary   (at most 12 lines: one per paper: the result, its number, its mark, its line)
## Papers
### P1. Authors, "Title", Venue Year. Read from: URL. Folder: RUN:papers/f{n}/<short>/. Pages read: all / which.
- Problem:
- Mechanism (two lines):
- Measured effect: which of the seven measures; the number, its baseline, task, repository size or scale, model;
  quoted, with (paper.txt line N).
- Strongest form and what it needs: data, compute, card memory (quoted where the paper says).
- Evidence: replicated, independent, or the maker's own (self-reported).
- Where it failed or did not help (quoted).
- Assumes: ...  For an agent harness (reasoned): across repositories? small and very large projects? a 12 GB card?
- Status: quoted / summary / not opened (reason).
## Could not open   (title | every route tried | why)
## Needs the owner's sign-in   (title | URL of the sign-in or bot-check page)
```
Cite every claim as `RUN:papers/f{n}/<short>/paper.txt line N - "quote"` (a raw page: `page.txt line N`) or
`path:line - "quote"`; mark it `quoted`,
`summary`, `observed` or `reasoned`. Fewer well-evidenced items beat many speculative ones. Write only your file,
your paper folders and (topic `prior`) `RUN:fields/{n}-{slug}/work/typed.txt`. No git command that writes.

## Second attempt (only when your prompt says "second attempt")
Read only your file's "Could not open" section and any "not found" line. Per paper, public routes in this order until
one gives a PDF that starts with `%PDF-`: the venue's or publisher's open archive; the authors' and their university's
pages (also the Internet Archive copy of a dead page); arXiv; a technical-report copy; the open links Semantic Scholar
or OpenAlex give. Per gap: search under other names and at other sizes (r57-0029) and read the 3 to 6 strongest
(`R:t1-brief-1b-second.md`). Append `## Second attempt`: per paper the block above, or one line `title | routes tried
| why still closed`. Change nothing above it; end with `Second attempt finished.`

## Finish
Write `F:done/reader-{topic}.done` last (second attempt: `F:done/reader-{topic}-2.done`), one line: `read <k> in full,
<m> could not open, <s> sign-in`. Limit 9.3 M tokens (`RUN:briefs/FIELD.md` section 3); normal work stays far under
it; make no count calls. Return at most ten lines: the output path; papers read in full; could not open (count, and how
many have a public route not yet tried); gaps searched; the three results most useful to the field, each with its mark
and line.

## Changes after the review (2026-11-21)
- 3: topic `prior` also searches his typed messages with `tools/typed.mjs` and cites matches `observed` with
  transcript and date.
- 5: the raw text page route (`page.txt`, at most 2 MB, quoted at its line).
