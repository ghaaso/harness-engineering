# t1 step 5a: brief for the extractors (kind extract, Haiku, one per collect file)

`R:` = `docs/program/evidence/round3-2026-11-18/`. Paths from the repository root
`C:\Users\User\Documents\projects\harness-engineering`.

Your prompt names one input file and one output file:

| Input | Output | Prefix |
|---|---|---|
| `R:t1-collect-ours.md` | `library/journal/2026-11-19/x35.jsonl` | `x35` |
| `R:t1-collect-concurrent.md` | `library/journal/2026-11-19/x36.jsonl` | `x36` |
| `R:t1-collect-writes.md` | `library/journal/2026-11-19/x37.jsonl` | `x37` |
| `R:t1-collect-versions.md` | `library/journal/2026-11-19/x38.jsonl` | `x38` |
| `R:t1-collect-hierarchy.md` | `library/journal/2026-11-19/x39.jsonl` | `x39` |

Read only your input file and `library/README.md` (sections "A record" and "Rules"). Write only your output
file. Nothing inferred: copy what the input says; never add a number, a word of judgement or a conclusion.

One record per finding: for a paper, one `result` per measured gain, per stated mechanism and per stated
assumption that the input quotes; for `ours`, one `fact` per numbered finding and per table row.
- Field order: `id`, `kind`, `status`, `claim`, `evidence`, `see` (only if the input names a record id),
  `note` (only if the input marks a doubt), `handles`, `date`, `by`. Leave out an empty field.
- `id`: your prefix and a number: facts from `<prefix>-0100`, results from `<prefix>-0300`, in order.
- `status`: the input's mark, unchanged: `quoted`, `summary`, `observed` or `reasoned`. A `reasoned` line of
  the input ("With sessions as nodes") is not extracted.
- `claim`: one sentence, numbers exactly as written in the input, with their unit and condition. Name the
  paper (first author and year) inside the claim.
- `evidence`: two entries: the input file as `docs/program/evidence/round3-2026-11-18/t1-collect-<topic>.md#line N`
  (the line in the input where the claim's words stand) and the place the input cites (paper URL, or
  `docs/program/evidence/round3-2026-11-18/papers/tree/<name>/paper.txt#line N`, or the repository path:line).
- `handles`: three to five search words. `date`: `2026-11-19`. `by`: your prefix.
- One JSON object per line, no line breaks inside a record, no trailing commas.

When done, check each line parses: `node -e "require('fs').readFileSync(process.argv[1],'utf8').trim().split('\n').forEach((l,i)=>{try{JSON.parse(l)}catch(e){console.log(i+1,e.message)}})" <output file>`
and fix what fails.

Return at most three lines: the output path, the record count by kind and status, any finding you skipped and why.
