# f{n} extractor, topic {topic} (kind extract, Haiku; effort low, medium where names vary)

`RUN:` = `C:/research-runs/2026-11-harness-leads/`; `H:` = `C:/Users/User/Documents/projects/harness-engineering/`.
Description `extract: f{n} {topic}`. From round 3's extractor brief
(`H:docs/program/evidence/round3-2026-11-18/t1-brief-5-extract.md`).

Input `RUN:fields/{n}-{slug}/collect-{topic}.md`; output `RUN:journal/2026-11-23/{x_file}.jsonl`; prefix `{x_file}`.
Read only your input file and `H:library/README.md` (sections "A record" and "Rules"). Write only your output file.
Nothing inferred: copy what the input says; never add a number, a word of judgement or a conclusion.

One record per finding: for a paper, one `result` per measured effect, per stated mechanism and per stated assumption
that the input quotes; for topic `prior`, one `fact` per finding marked `new` (a finding that names a record id is
already held: skip it).
- Field order: `id`, `kind`, `status`, `claim`, `evidence`, `see` (only if the input names a record id), `note` (only
  if the input marks a doubt), `handles`, `date`, `by`. Leave out an empty field.
- `id`: facts from `{x_file}-0100`, results from `{x_file}-0300`, in order.
- `status`: the input's mark, unchanged: `quoted`, `summary`, `observed` or `reasoned`. A `reasoned` line of the input
  ("For an agent harness") is not extracted.
- `claim`: one sentence, numbers exactly as written in the input, with their unit and condition; name the paper (first
  author and year) inside it; a maker's own figure keeps "self-reported".
- `evidence`: two entries: `C:/research-runs/2026-11-harness-leads/fields/{n}-{slug}/collect-{topic}.md#line N` (where
  the claim's words stand in the input) and the place the input cites (the paper's or page's URL,
  or `C:/research-runs/2026-11-harness-leads/papers/f{n}/<short>/paper.txt#line N` or `.../page.txt#line N`, or the
  path:line of our file, or the transcript and date of his typed message).
- `handles`: three to five search words. `date`: today's UTC date. `by`: `{x_file}`.
- One JSON object per line, no line breaks inside a record, no trailing commas.

Check each line parses: `node -e "require('fs').readFileSync(process.argv[1],'utf8').trim().split('\n').forEach((l,i)=>
{try{JSON.parse(l)}catch(e){console.log(i+1,e.message)}})" <output file>`, and fix what fails. Then write
`RUN:fields/{n}-{slug}/done/extract-{topic}.done` last (one line: `records <k>`).

Limit 1.9 M tokens. Return at most three lines: the output path, the record count by kind and status, any finding
skipped and why.

## Changes after the review (2026-11-21)
- 3, 5: the place cited may also be a raw page's `page.txt`, or the transcript and date of his typed message.
