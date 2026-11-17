# promote.mjs: specification (unit U2b)

Source of truth: `CONTRACT.md` §2.1 (only writer of `store/status/card_status.jsonl`, append under the
lock), §3.14 witness record, §3.15 card status record, §3.17 seed key, queue item, [verdict], §3.7
`promote` line, decisions 9, 11. Design rules: R13, R16 (only promote rejects a card), R25, R26 (verdict
from the checker's own transcript; confirmed only for a witnessed card and a qualified class; off-enum
is unclear), R42 (seeds dropped; unqualified class reverts), R24.

## Purpose
The only writer of card status. Turns witness results into status lines, reads a checker's verdicts from
the checker's own transcript, drops seeds, applies qualification, and reverts confirmations of a class
that lost its qualification.

## Command line
```
node tcb/promote.mjs --root <abs> --ce <n> --from witness [--now] [--dry-run]
node tcb/promote.mjs --root <abs> --ce <n> --batch <b> --transcript <abs path> [--now] [--dry-run]
node tcb/promote.mjs revert --root <abs> --ce <n> --class J1|J2|J3|J4 [--now] [--dry-run]
```
Default mode needs exactly one of `--from witness` and `--batch`+`--transcript` (else 66).

## Reads
`store/witness.jsonl`, `store/status/card_status.jsonl`, `store/objects/c_*`, `store/qualification.json`
(`classes.<C>.qualified`, CONTRACT §3.22), `queue/<b>/batch.json`, `queue/<b>/item-*.json`, `sealed/seeds/<b>.json`, the checker
transcript, `run/coord.json` (`session`), `tcb/thresholds.json` (`transcripts_root`), `run/ledger.jsonl`,
`run/tasks.json` (only its validity: a writing script refuses a corrupt table, 67).

## Writes
Lines appended to `store/status/card_status.jsonl` (lib.appendJsonl under the run lock; seq = last + 1,
`at` = now); one `promote` ledger line {mode: witness|checker|revert, batch? (checker mode), class?
(revert mode), first_seq, last_seq} per run that wrote lines (CONTRACT §3.7); nothing when nothing
changes.

## Steps: --from witness
1. Lock + `checkCe`. Cursor = the largest `witness_seq` among status lines (0 if none).
2. For each card, take its last witness record with seq > cursor. An `s_` card id → exit 3 `seed-id`;
   `card_sha` ≠ sha256 of the stored card's bytes, or reason `card-changed` → exit 3 `card-changed`
   (nothing written in this run).
3. Rule: `witnessed` on a card now `confirmed` → no line (the confirmation stands); otherwise a line
   {card_id, card_sha, status: result, reason: witness reason, witness_seq}. `rejected` or
   `unverifiable` after `confirmed` is written (the card falls; tms makes its citers STALE).

## Steps: --batch --transcript
1. `batch.json` missing → 2 `no-batch`; `sealed/seeds/<b>.json` missing → 2 `no-key`; a `promote` line
   for `<b>` exists → exit 0 `already`, nothing written.
2. Transcript: `coord.session` null → 2 `no-coordinator-session`; the real path must lie under
   `<transcripts_root>/*/<coord.session>/subagents/` (any depth) → else 1 `transcript-outside`; absent →
   2 `transcript-missing`. Parse it (torn tail skipped).
3. Role check: every tool use is `Read` of a path under `<root>/queue/<b>/`; otherwise every verdict of
   the batch counts as `unclear` with reason `checker-out-of-role`.
4. Verdicts: `lib.checkerVerdicts(structured results, batch item ids)` ([checker-result] `{verdicts:
   verdict[]}`, CONTRACT §3.22 and §4.10, the same function seed uses): an invalid one or an item with no
   verdict → `unclear` (`verdict-missing` / `verdict-off-enum`); two different verdicts for one item →
   `unclear` (`verdict-conflict`); verdicts for ids not in the batch are ignored (`result.unknown_items`).
5. Per item in `batch.json` order: key `seed: true` → dropped (no line, counted). Else the queue item's
   `card` must equal the stored card object canonically → else exit 3 `card-changed`.
6. Card items (no `sentence`): `confirmed` → status `confirmed` only if the current status is
   `witnessed` and every class J1, J2, J4 is `qualified` in qualification.json (missing file: none is),
   else a line with status `witnessed`, reason `unqualified` (or no line and `skipped` when the current
   status is not witnessed); `number_mismatch`, `baseline_swapped`, `conditions_mismatch` → `rejected`,
   reason = verdict; `outside_conditions` (a sentence verdict) and `unclear` → a line with the current
   status, reason `unclear` (none if the card has no status). Every line carries `check {batch, item,
   verdict}`; a confirmation carries `classes: ["J1", "J2", "J4"]` (CONTRACT §3.15).
7. Sentence items (the key entry has `node`): a line with the card's current status (no status change)
   and `check {batch, item, verdict, node}`. Verdict `confirmed` with every class J1-J4 qualified →
   reason `sentence-check`, `classes: ["J1", "J2", "J3", "J4"]` (this line clears the R18 flag through
   `lib.flagCleared`); `confirmed` with some J1-J4 class not qualified → reason `sentence-unqualified`
   (clears nothing); any other verdict → reason `sentence-check` with that verdict (clears nothing:
   `flagCleared` needs `confirmed`). A queue item with a `sentence` whose key entry has no `node` → exit
   2 `no-key` (the key is incomplete), nothing written.
8. Append lines, then the `promote` line.

## Steps: revert --class
1. qualification.json missing → 2 `no-qualification`; the class `qualified` → 1 `class-qualified`.
2. Per card, read every line, not only the last (promote writes status-keeping lines after a
   confirmation: card-item `unclear`, `sentence-unqualified`, `sentence-check` lines; review U2-F1):
   - the card's own reliance: the card is `confirmed` now and its latest line with status
     `confirmed`, `check.verdict` `confirmed` and no `check.node` (reason other than
     `unqualified-revert`) has `classes` including the class;
   - a sentence clearing: some `sentence-check` line with `check.verdict` `confirmed` has `classes`
     including the class;
   each counting only when no later line of the card has reason `unqualified-revert` naming the class.
   Either → one line reason `unqualified-revert`, `classes: [<class>]`, status `witnessed` when the
   card's own confirmation relies on the class, else the card's current status (the line then only
   reopens the clearing, §3.15; a confirmation that relies on other classes stands). Nothing to
   revert → exit 0, no line. (CONTRACT §3.15 states the same rule: status `witnessed` for every such
   line would, for a clearing-only revert, knock down a confirmation that does not rely on the class.)

## Exit codes
0 written or nothing to do; 1 a verdict missing, off-enum or conflicting, `checker-out-of-role`,
`transcript-outside`, `class-qualified`; 2 `no-batch`, `no-key`, `no-coordinator-session`,
`transcript-missing`, `no-qualification`; 3 `seed-id`, `card-changed`; 64, 66, 67, 70, 75.
Result: {mode, written: [{seq, card_id, status, reason}], seeds_dropped, unclear: [{item, reason}],
skipped: [card_id], unknown_items}.

## Behaviours
- T1 witness: two records (witnessed, unverifiable) for two cards → two lines seq 1-2 with
  `witness_seq`, `promote` line {mode: "witness", first_seq: 1, last_seq: 2} (no `batch`), exit 0.
  Rerun → no line, exit 0.
- T2 witness: card A has witness seq 3 witnessed and seq 5 rejected after the cursor → one line, rejected.
- T3 witness `witnessed` on a confirmed card → no line; `rejected` on a confirmed card → line rejected.
- T4 witness record whose `card_sha` differs from the object → exit 3 `card-changed`, nothing appended;
  record for `s_…` → exit 3 `seed-id`.
- T5 batch: 3 real items + 1 seed, checker transcript under `<tr>/p/<coord>/subagents/agent-1.jsonl`
  with Read calls inside `queue/<b>/` and verdicts confirmed/number_mismatch/unclear/confirmed(seed),
  all J classes qualified, cards witnessed → lines confirmed, rejected `number_mismatch`, witnessed
  `unclear`; no line for the seed; `seeds_dropped: 1`; exit 0.
- T6 Same with J2 unqualified → the confirmed item gets status witnessed, reason `unqualified`.
- T7 A verdict `"approved"` (off-enum) and one item with no verdict → both `unclear`, exit 1.
- T8 Checker transcript with a Read of `<root>/store/…` or a WebFetch → every item `unclear`
  `checker-out-of-role`, exit 1, no confirmation written.
- T9 Transcript path inside `wt/` or another session's folder → exit 1 `transcript-outside`, nothing
  written; path absent → 2; `sealed/seeds/<b>.json` absent → 2 `no-key`.
- T10 Second run for the same batch → exit 0 `already`, no line.
- T11 Queue item card differing from the stored card → exit 3 `card-changed`.
- T12 revert --class J2 (unqualified) with two checker-confirmed cards (`classes` J1, J2, J4) and one
  confirmed by no check → two lines witnessed `unqualified-revert` `classes: ["J2"]`, a `promote` line
  {mode: "revert", class: "J2"}; rerun → exit 0, no line; J2 qualified → exit 1. revert --class J3 on
  the same root → no line (no card confirmation relies on J3).
- T12c (U2-F1) A card confirmed with J1, J2, J4 whose last line is a later status-keeping card-item
  `unclear` line: revert --class J2 → one line `witnessed` `unqualified-revert` `classes: ["J2"]`.
- T12d (U2-F1) revert --class J3: a card confirmation that relies on J1, J2, J4 only stays confirmed;
  every card with a J3 sentence clearing gets one `unqualified-revert` line `classes: ["J3"]` keeping
  its current status, so `lib.flagCleared` reopens the clearing.
- T15 Sentence items: a batch key entry with `node: "r_x#s1"`, verdict confirmed, J1-J4 qualified →
  a line with the card's unchanged status, reason `sentence-check`, `check.node` `r_x#s1`, `classes`
  J1-J4; with J3 unqualified → reason `sentence-unqualified`; verdict `outside_conditions` → reason
  `sentence-check`, verdict kept, no status change. A sentence item whose key entry lacks `node` → 2
  `no-key`.
- T16 The `promote` line of a checker run is {mode: "checker", batch, first_seq, last_seq}.
- T13 A torn last line in `card_status.jsonl` → moved to `.corrupt` by appendJsonl, new seq follows the
  last complete line, `torn-tail` handled by lib; ledger verifies.
- T14 `--ce` stale → 64, nothing written; lock busy → 75; `--from witness` with `--batch` → 66;
  `--class J5` → 66; `--dry-run` → lines listed in result, no file or ledger change.

## Needs the app
- §7 item 7: a real checker's verdict appears in its own helper transcript as a structured result, and
  checker helper transcripts lie under the coordinator's `subagents/` folder.
- §7 item 1: that the checker could only Read its batch (promote detects, it does not prevent).
