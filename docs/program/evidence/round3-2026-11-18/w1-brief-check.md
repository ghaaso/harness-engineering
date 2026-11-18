# w1 step 5b: check (sonnet, run): the lane's records

Read first: `R:w1-brief-common.md`; `library/README.md` section "A record" (the field order).

Files: `library/journal/2026-11-19/x25.jsonl` to `x29.jsonl`, `x40.jsonl` and `library/journal/2026-11-19/w1.jsonl`.

For every record:
1. The line parses as JSON.
2. Its keys come in the README's order (`id, kind, status, claim, when, quote, evidence, see, note, handles,
   footprint, supersedes, date, by`), with no other key.
3. Its id is unique across the six files and has the file's prefix; `date` is `2026-11-19`; `by` is the prefix.
4. For an `x` record: every number in `claim` stands at the collect file line its `evidence` cites (within 3
   lines); the paper named in the claim is the paper of that block. For a `w1` record: every path in `evidence`
   exists in the repository (a URL is not checked).
5. `see` and `supersedes` name only ids that exist (`grep -rho '"id":"[^"]*"' library/journal`); a `w1` record
   supersedes nothing.

Write a small node script in the scratch folder named by your launch, not in the repository. Change no record.
Write `R:w1-check.md`: per file the counts checked and failed, then one line per failure (`id | check | what`).

Done returns (at most ten lines): the path; counts checked and failed per file; the failing ids.
