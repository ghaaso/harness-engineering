# w1 step 5a: extract (haiku, one per collect file, at once)

Read first: `R:w1-brief-common.md`; `library/README.md` sections "A record" and "Rules". Look at the first two
lines of `library/journal/2026-11-18/x02.jsonl` to see the form an extractor record takes.

Your launch names one collect file and one output file:

| Collect file | Output | Prefix |
|---|---|---|
| `R:w1-collect-isolation.md` | `library/journal/2026-11-19/x25.jsonl` | `x25` |
| `R:w1-collect-grain.md` | `library/journal/2026-11-19/x26.jsonl` | `x26` |
| `R:w1-collect-engines.md` | `library/journal/2026-11-19/x27.jsonl` | `x27` |
| `R:w1-collect-order.md` | `library/journal/2026-11-19/x28.jsonl` | `x28` |
| `R:w1-collect-merge.md` | `library/journal/2026-11-19/x29.jsonl` | `x29` |
| `R:w1-collect-long.md` | `library/journal/2026-11-19/x40.jsonl` | `x40` |

`mkdir -p library/journal/2026-11-19`. Write only your output file.

One record per paper finding in the collect file: a problem solved, a mechanism, a measured figure with its
conditions. Nothing inferred: copy what the collect file states; leave out its "For model-session writers" lines
(those are reasoning, not findings).
- Fields in this order, each present only if it has a value: `id`, `kind`, `status`, `claim`, `evidence`,
  `handles`, `date`, `by`.
- `id`: `<prefix>-0301`, `<prefix>-0302`, ... in order. `kind`: `result`. `status`: `quoted` if the collect file
  marks that paper `quoted`, `summary` if it marks it `summary`. Skip papers marked `not opened`.
- `claim`: one sentence, with the number, its unit and its condition (baseline, workload, scale) exactly as the
  collect file gives them. Name the paper (first author and year) in the claim.
- `evidence`: a list: `docs/program/evidence/round3-2026-11-18/w1-collect-<topic>.md#line <n>` (the line of the
  collect file holding the figure), and the paper's URL as the collect file gives it.
- `handles`: three to six words a later session would search for.
- `date`: `2026-11-19`. `by`: your prefix.

Check before you finish: `node -e "require('fs').readFileSync(process.argv[1],'utf8').trim().split('\n').forEach((l,i)=>JSON.parse(l))" <file>`.

Done returns (at most five lines): the path; the count of records by status.
