# c1 step 5 brief: extract (Haiku, one per collect file) and check (Sonnet)

Repository root: `C:\Users\User\Documents\projects\harness-engineering`. `R:` = `docs/program/evidence/round3-2026-11-18/`.

| Collect file | Writes | Ids |
|---|---|---|
| `R:c1-collect-queue.md` | `library/journal/2026-11-19/x30.jsonl` | `x30-0300` upward |
| `R:c1-collect-group.md` | `library/journal/2026-11-19/x31.jsonl` | `x31-0300` upward |
| `R:c1-collect-mergeq.md` | `library/journal/2026-11-19/x32.jsonl` | `x32-0300` upward |
| `R:c1-collect-shorter.md` | `library/journal/2026-11-19/x33.jsonl` | `x33-0300` upward |
| `R:c1-collect-bottleneck.md` | `library/journal/2026-11-19/x34.jsonl` | `x34-0300` upward |

## Extract (Haiku; your prompt names your one collect file)
Read `library/README.md` sections "A record" and "Rules", then your collect file. Write one `result` record per
published finding in it: a quotation, a measured gain, a stated condition or a stated failure. Nothing inferred:
skip lines marked `reasoned` and the "With model sessions" lines. Copy numbers exactly with their unit and
condition. One JSON object per line, fields in this order, empty ones left out:
`id, kind, status, claim, evidence, note, handles, date, by`.
- `kind` "result"; `status` "quoted" if the collect file marks it quoted with a txt line, else "summary".
- `claim`: one sentence naming the paper's first author and year, the finding, its number with unit and condition.
- `evidence`: `["docs/program/evidence/round3-2026-11-18/c1-collect-<topic>.md#line N", "<paper URL>"]`, where N
  is the line of the collect file that holds the finding.
- `handles`: 3 to 6 search words; `date` "2026-11-19"; `by` "x3N" (your file's prefix).
At most 99 records. Write only your one file. Return: the path and the record count.

## Check (Sonnet, after all five extracts)
For each of the five files: every line parses (`node -e`); fields in the order above; ids unique and in
0300 to 0399; each claim's numbers stand at the cited collect-file line (lines N-3 to N+3). Where a number or
word does not stand, correct the record to the text at that line, or remove the record if no finding is there;
log every change. These files are not yet committed, so a correction here is not an edit of the journal.
Write `R:c1-check.md`: counts per file (records, parse faults, order faults, numbers that did not stand,
changes made). Write nothing else; no git writes. Return the path and the counts (at most ten lines).
