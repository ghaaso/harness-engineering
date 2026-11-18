# a1 step 5 brief: extract (Haiku, one per collect file) and check (Sonnet)

Repository root: `C:\Users\User\Documents\projects\harness-engineering`. `R:` = `docs/program/evidence/round3-2026-11-18/`.

| Collect file | Writes | Ids |
|---|---|---|
| `R:a1-collect-pacing.md` | `library/journal/2026-11-19/x44.jsonl` | `x44-0300` upward |
| `R:a1-collect-allocation.md` | `library/journal/2026-11-19/x45.jsonl` | `x45-0300` upward |
| `R:a1-collect-quotas.md` | `library/journal/2026-11-19/x46.jsonl` | `x46-0300` upward |
| `R:a1-collect-longjobs.md` | `library/journal/2026-11-19/x47.jsonl` | `x47-0300` upward |
| `R:a1-collect-llmbudget.md` | `library/journal/2026-11-19/x48.jsonl` | `x48-0300` upward |

## Extract (Haiku; your prompt names your one collect file)
Read `library/README.md` sections "A record" and "Rules", then your collect file (including any "Second attempt"
section). Write one `result` record per published finding in it: a quotation, a measured gain, a stated condition
or a stated failure. Nothing inferred: skip lines marked `reasoned`, the "With model sessions" lines and the
"Needs to know" lines. Copy numbers exactly with their unit, baseline and condition. A company's own figure keeps
the word "self-reported" in the claim. A provider's documentation keeps its fetch date. A source marked `summary`
or `not opened` gives no `quoted` record. One JSON object per line, fields in this order, empty ones left out:
`id, kind, status, claim, evidence, note, handles, date, by`.
- `kind` "result"; `status` "quoted" if the collect file marks it quoted with a txt line, else "summary".
- `claim`: one sentence naming the source's first author (or the company) and year, the finding, its number with
  unit and condition.
- `evidence`: `["docs/program/evidence/round3-2026-11-18/a1-collect-<topic>.md#line N", "<source URL>"]`, where N
  is the line of the collect file that holds the finding.
- `handles`: 3 to 6 search words; `date` "2026-11-19"; `by` "x4N" (your file's prefix).
At most 99 records. Create the folder `library/journal/2026-11-19/` if missing. Write only your one file. Return:
the path and the record count.

## Check (Sonnet, after all five extracts)
For each of the five files, every record, not a sample: every line parses (`node -e`); fields in the order above;
ids unique and in 0300 to 0399; each claim's numbers and names stand at the cited collect-file line (lines N-3 to
N+3); a company's figure says "self-reported"; no `quoted` record cites a source the collect file marks `summary`
or `not opened`. Where a number or word does not stand, correct the record to the text at that line, or remove the
record if no finding is there; log every change. These files are not yet committed, so a correction here is not an
edit of the journal. Write `R:a1-check.md`: counts per file (records, parse faults, order faults, numbers that did
not stand, records corrected, records removed) and the log. Write nothing else; no git writes. Return the path and
the counts (at most ten lines).
