# certify.mjs: specification (unit U2b)

Source of truth: `CONTRACT.md` §3.4 review, §3.11 commit record, §3.15 card status, §3.16 certificate,
§3.17 plants, §3.20 (`plants_k`, `plants_t`), §3.7 (`certificate`, `check`, `audit`, `intake` lines),
§2.1 (`x_` objects are certify's). Design rules: R43 (every cited card confirmed and passing R18), R44
(reads match the manifest; t of k plants, one against the hoped answer), R27 (session label), R19
(read-set hash, void on change), R40 (three values), R45 (plants t null = a reading); problem P13.
Where layer L3 adds an SPRT and a coverage condition, the design wins: neither is a condition here;
coverage is recorded.

## Purpose
Write the certificate of a committed review, every line computed by script: session label, cited cards,
plants found, coverage, and the read set whose hash voids the certificate when a status changes.

## Command line
```
node tcb/scripts/certify.mjs --root <abs> --ce <n> --task <id> --epoch <e> [--now <iso>] [--dry-run]
```

## Reads
`run/tasks.json` (row: `steps`, `question_ids`, `epoch`, `lib.attemptOf(row, e).manifest`), `store/commits/<task>.<step>.json`
for the step whose outputs hold the review, `store/objects/` (review, pack, cards, manifest),
`store/status/card_status.jsonl`, `run/ledger.jsonl` (last `audit` line for task+epoch; `intake` flags
on the review and pack; `queue` lines for `lib.flagCleared`), `sealed/plants/<task>.json`,
`store/qualification.json` (`escape {n, escaped}`, CONTRACT §3.22), `tcb/thresholds.json`, `run/coord.json`.

## Writes
The certificate object `store/objects/x_<16hex>.json` via `putObject` (identical bytes = no-op); a
`certificate` ledger line {id, result} and a `check` line {check: "certify", subject: review id,
result: pass|fail|not_run, reasons}. Both lines are skipped when the same certificate id already has a
`certificate` line (an identical repeat).

## Certificate fields (§3.16)
- task, subject = the review id, pack = `review.pack`, step_key = the commit record's.
- session_label: `label` of the last `audit` line for task+epoch; none → reason `audit-missing` (not_run).
- cited: every card id in any review sentence's `cites`, deduplicated; `confirmed` = those whose card
  label is `confirmed` (last status line; `superseded` as tms computes it counts as not confirmed);
  `failing` = [{card_id, code}] with code `not-confirmed`, `superseded`, or `r18-flag` (a sentence citing
  it carries an `intake` flag for which `lib.flagCleared` is false, CONTRACT §3.15).
- plants: k = plants in `sealed/plants/<task>.json`; a plant is found when some
  `our_work_findings` entry has `file` equal to the plant's and `locator` equal after trim and case
  fold; contra_found counts found plants with `against_hope`.
- coverage: approved = the row's `question_ids`; covered = approved ids named by a `confirmed` card of
  the pack or listed in `pack.not_covered`; not_covered = the rest (recorded, not a condition).
- seed_escape: qualification.json's `escape {n, escaped}` when the file exists, else omitted.
- read_set = [{card_id, status_seq}] for every card of the pack and every cited card, status_seq = seq of
  the card's last status line (0 if none), sorted by card_id; read_set_sha =
  `lib.readSetSha(read_set)` (CONTRACT §3.16, the same function tms uses).
- result and reasons (slugs, sorted):
  - not_run if `audit-missing`, `plants-missing` (no plant file while `plants_t` is a gate), or the
    status file is unreadable;
  - else certified iff session_label is `clean`, `failing` is empty, cited.n ≥ 1 for a review with fact
    sentences, and, when `plants_t` is a gate, found ≥ t and contra_found ≥ 1;
  - else not_certified with `tainted`, `cited-failing`, `plants-short`, `plant-contra-missed`.
  - `plants_t` null (a reading): plants are recorded and never a reason.

## Steps
1. Parse args; read the table (67), row (1 `no-task`); `--epoch` ≠ row epoch → 65.
2. Find the commit record holding exactly one review output; none → exit 2 `not-committed`, no
   certificate. Its `epoch` ≠ `--epoch` → 65. `getObject` the review, its pack and the manifest
   (mismatch → 3 via lib; missing → 2); sha256 of the manifest's canonical bytes ≠ the record's
   `step_key` → 3 `step-key-mismatch`.
3. A plant's `card_id` not stored → 2 `dangling`.
4. Compute the fields; `putObject` under the lock after `checkCe` (64); append the lines.

## Exit codes
0 certified; 1 not_certified; 2 not_run (incl. `not-committed`, `dangling`, `audit-missing`); 3
`object-mismatch`, `step-key-mismatch`; 64, 65, 66, 67, 70, 75.
Result: {certificate: x_id, result, reasons, cited: {n, confirmed}, plants: {k, found, contra_found},
read_set_sha, created: bool}.

## Behaviours
- T1 Review citing two confirmed cards, `audit` line clean, plants k 3 with found 3 incl. the contra one,
  `plants_t` 2 → certificate certified, `x_` object stored, `certificate` + `check` (pass) lines, exit 0.
- T2 Rerun unchanged → same id, `created: false`, no new lines, exit 0.
- T3 One cited card `witnessed` → not_certified, failing [{id, not-confirmed}], exit 1.
- T4 Cited card A superseded by confirmed B → failing `superseded`.
- T5 An `intake` flag `number-uncited` on a review sentence citing a confirmed card → `r18-flag`, exit 1;
  after a sentence-check confirmation of that node from a batch queued after the flag → certified.
- T6 Last `audit` line tainted → not_certified `tainted`; no audit line → not_run `audit-missing`,
  certificate still stored, `check` line not_run, exit 2.
- T7 `plants_t` 2 and found 1 → `plants-short`; found 2 none contra → `plant-contra-missed`; `plants_t`
  null and found 0 → certified (plants recorded only).
- T8 No plant file and `plants_t` set → not_run `plants-missing`.
- T9 Locator matching ignores case and outer spaces; a different `file` does not match.
- T10 Coverage: approved [a, b, c], a confirmed card answers a, pack not_covered lists b → covered 2,
  not_covered [c]; result unaffected.
- T11 read_set_sha equals sha256hex(canonicalize(read_set)) computed by the test; after a new status line
  for a pack card, a rerun writes a new certificate id (and tms marks the old STALE).
- T12 Review step not committed → exit 2 `not-committed`, no object.
- T13 Manifest object edited on disk → exit 3 `object-mismatch`; record `step_key` differing from the
  manifest → exit 3 `step-key-mismatch`.
- T14 `--epoch` stale → 65; `--ce` stale → 64, nothing written; lock busy → 75; corrupt table → 67;
  `--dry-run` → result printed, no object, no line.

## Needs the app
- None directly; whether audit's clean label reflects a real session's reads is audit's (§7 items 3, 7).
