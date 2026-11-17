# witness.mjs (unit U3a): spec

Source of truth: `CONTRACT.md` §1, §2.1 (`store/witness.jsonl` row), §3.1 (card), §3.13 (snapshot
metadata, `by-url`, `urlKey`), §3.14 (witness record), §3.7 (`witness` and `check` lines, fixed
subjects), §1.4 (tamper record), §4, decision 36.

## Purpose
The script half of promotion (R25): for a committed card, find its exact quote in the stored text
of its source and its number within w characters of the quote, and bind the result to the card's
and the snapshot's hashes. Results are `witnessed`, `rejected` or `unverifiable` (not-run, never
passed). It writes witness records only; promote.mjs alone turns them into card status (R13, §8.9).

## Command line
```
node <root>/tcb/scripts/witness.mjs --root <dir> --ce <n> [--card <c_id>]... [--now <iso>] [--dry-run]
```
- No `--card`: the default set (step 3). Each `--card` must match `^c_[0-9a-f]{16}$` (an `s_` seed id
  or any other form is 66); repeated `--card` names an explicit list, deduplicated, sorted.

## Reads
- `tcb/thresholds.json` (`w_chars`), `run/coord.json` (ce).
- `store/objects/c_*.json` through `lib.getObject` (hash-checked), `store/witness.jsonl`
  (`lib.readJsonl`), `.snapshots/by-url/<urlKey>.jsonl`, `.snapshots/meta/<raw_sha>.json`,
  `.snapshots/text/<text_sha>`. `urlKey = lib.urlKey(source.url)`.

## Writes
- `store/witness.jsonl` [witness]: one record per card witnessed in this run, appended under
  `run/run.lock` by `lib.appendJsonl`; `seq` = last parseable record's `seq` + 1 (1 when empty),
  read inside the lock.
- Ledger (`lib.appendLedger`, same lock): one `witness` line `{counts: {witnessed, rejected,
  unverifiable}, first_seq, last_seq}` and one `check` line `{check: "witness", subject: "witness",
  result: pass|fail|not_run, reasons}` (R40; the subject is the fixed string of CONTRACT §3.7, and
  the reasons carry `{code: "range", detail: {cards: n, first_seq, last_seq}}` first, then one reason
  per rejected or unverifiable reason slug with its card ids). No line when nothing was witnessed.
  A `card-changed` run also appends the §1.4 tamper `incident` {class: refusal, detail: {tamper:
  true, script: "witness", code: "card-changed"}} before exiting 3.

## Steps
1. Parse arguments (66); read thresholds (`param-missing` 2); `lib.checkCe` without the lock.
2. Load the cards: `--card` ids, else every `c_` object. A missing id: 2 `missing`. Bytes not
   hashing to the name: 3 `object-mismatch`, nothing written.
3. For each card choose its snapshot: the latest `by-url` line with a non-null `raw_sha`. Its meta
   with `text_sha` → that text; meta `reason: pdf` → unverifiable `pdf`; `empty-text` →
   `empty-text`; no such line, another reason, or a missing meta or text file → `no-snapshot`.
   The text file's bytes must hash to its name (else 3 `snapshot-mismatch`).
   Default set only: skip a card whose last witness record has the same `card_sha`, `raw_sha` and
   `text_sha` as the ones chosen now (nothing changed). With `--card` every named card is
   witnessed again (the freeze and post-review runs need a record at that point).
4. Tamper check: a card's last witness record whose `card_sha` differs from the sha256 of the card's
   canonical bytes now → `rejected` with reason `card-changed`, and the run exits 3 after writing.
5. Normalise (one function for text and quote, with a map from each normalised index back to a
   UTF-16 index of the stored text): NFKC; lower case (`toLowerCase`); remove soft hyphen and
   zero-width characters (U+00AD, U+200B-U+200D, U+2060, U+FEFF); a hyphen followed by a line break
   between two letters is removed with the break; curly and angle quotes to `'` or `"`; every dash
   and minus (U+2010-U+2015, U+2212, U+FE58, U+FE63, U+FF0D) to `-`; whitespace runs to one space;
   trim. The quote additionally loses leading and trailing quote marks and `...`.
6. Quote: exact substring search of the normalised quote in the normalised text; every occurrence
   is a candidate.
7. Number: when `measured.value` is a number, scan for numeric tokens (`[-+]?` digits with optional
   thousands groups of three separated by `,`, space or thin space, optional decimal part with `.`
   or `,`); a token grouped by spaces also yields each space-separated part as a token of its own
   (`3 100` reads as 3100, 3 and 100). A token matches when one of its readings (comma as
   thousands, comma as decimal) equals
   the value exactly or equals its absolute value (an unsigned token; sign variants), with a
   following `%` or `percent` accepted when `unit` is a percent. No rounding, no scaling (an S2 seed
   ×10 or ÷10 must miss). A token is bound when it starts within `w` characters before the quote's
   start or after its end, in normalised text. Among candidates the first occurrence with a bound
   token wins, else the first occurrence.
8. Result: quote found and (number bound, or `value` is `"not stated"`) → `witnessed` / `ok`
   (`number_bound` false when not stated); quote found, number not bound → `rejected` /
   `number-missing`; quote not found but a matching token anywhere in the text → `rejected` /
   `number-without-quote` (the paraphrase case the checker gets, G7); neither → `rejected` /
   `quote-missing`. Offsets are UTF-16 indexes in the stored text via the map.
   `source_changed` = the chosen `by-url` line says so, or the card's previous record named another
   `text_sha`.
9. `--dry-run`: print the records that would be written, no lock, no write. Else take the lock
   (`withRunLock` with `ce`), append the records, then the two ledger lines.
10. `result = {records: [{card_id, result, reason, seq?}], counts, skipped: n}`.

## Exit codes
0 every card witnessed or nothing to do; 1 one or more `rejected` (no `card-changed`); 2 none
rejected and one or more `unverifiable`, or an input missing; 3 `object-mismatch`,
`snapshot-mismatch`, `card-changed`; 64, 66, 67, 70, 75. Precedence: 3 > 1 > 2 > 0.

## Rules implemented
R25 (witness by script, bound to hashes, `source_changed`, number-without-quote to the checker, runs
at intake, freeze and after the review), R24, R13 and §8.9 (witness writes `witness.jsonl`, never
status), R40 (three values; unverifiable is not-run), R42 (S1-S4 are caught here: the S seeds'
detection is measured on this function), R31 (ledger lines), problems N8, G3, G7, N10.

## Behaviours (fixtures: invented cards and texts written by the test into `.snapshots/` with
correct hashes and `by-url` lines; pure-function tests import the exported `normalize`,
`numberTokens` and `witnessCard`, which do nothing on import)
- T1 Text contains the quote and `12.5%` 40 characters after it; card value 12.5, unit `%`:
  `witnessed`, `ok`, `number_bound: true`, offsets point at the quote and the number in the stored
  text; exit 0; one `witness` and one `check` (pass) ledger line; the ledger verifies.
- T2 Quote in text, number 125 (×10, an S2 seed) absent: `rejected`, `number-missing`, exit 1.
- T3 Quote altered by one word (an S1 seed) while 12.5 appears in the text: `rejected`,
  `number-without-quote`; with the number also absent: `quote-missing`.
- T4 Normalisation: curly quotes, an en dash, `ﬁ` ligature, non-breaking spaces, a soft hyphen and
  `effec-\ntive` in the text all match a plain ASCII quote; upper case in the quote matches.
- T5 The number 300 characters past the quote's end with `w_chars` 300 is bound; at 301 it is not.
- T6 Thousands and decimal variants: value 1234.5 matches `1,234.5`, `1 234,5`, `1234.5`; value
  -3 matches `-3`, `−3` and an unsigned `3`; value 3 does not match `30` or `0.3`, nor a signed
  `-3` or `−3`; value 12.5 with unit `%` matches `12.5%` and `12.5 percent`, with unit `ms` it
  matches neither.
- T7 `value: "not stated"` and the quote present: `witnessed`, `number_bound: false`.
- T8 No `by-url` file: `unverifiable`, `no-snapshot`, exit 2; meta `reason: pdf`: `pdf`; meta
  `empty-text`: `empty-text`.
- T9 A mix of one rejected and one unverifiable card: exit 1; the `check` line result `fail`.
- T10 Default run twice with nothing changed: the second run appends nothing and exits 0 with
  `skipped` equal to the card count; after a new `by-url` line with a new text, that card is
  witnessed again with `source_changed: true`.
- T11 `--card c_x --card c_x`: one record; running it again appends a second record (explicit runs
  always record).
- T12 `--card s_0123456789abcdef` and `--card nothex`: exit 66, nothing read.
- T13 A text file edited after storing (bytes no longer hash to its name): exit 3
  `snapshot-mismatch`, no record written.
- T14 A `c_` object file edited: exit 3 `object-mismatch`.
- T15 A last witness record whose `card_sha` the test altered: that card's new record is `rejected`
  `card-changed`, a tamper `incident` line is appended, and the run exits 3.
- T22 The `check` line's `subject` is the string `"witness"` and its first reason is `range` with the
  run's first and last seq, equal to the `witness` line's.
- T16 Stale ce (`--ce 2`, coord ce 1): exit 64, `witness.jsonl` and the ledger unchanged.
- T17 Lock held by a test-spawned live process: exit 75, nothing appended.
- T18 `witness.jsonl` with a torn tail: the tail moves to `.corrupt`, `seq` continues from the last
  whole record; `tasks.json` unparseable does not matter (not read).
- T19 `run/coord.json` corrupt: exit 67; missing: exit 2 `no-coordinator`.
- T20 `--dry-run`: records printed with `dry_run: true`, nothing written, no lock file.
- T21 Two occurrences of the quote, the number bound only near the second: the second is chosen.

## Cannot be tested without the app
- Real pages (needs-app 10): the share of honest cards whose reader saw only a fetch summary and
  whose quote is a paraphrase (G7), measured in the pilot, not here.
