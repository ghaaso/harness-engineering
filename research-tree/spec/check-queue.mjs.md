# check-queue.mjs: spec

Source of truth: `CONTRACT.md` (§1, §2.1, §3.14, §3.15, §3.17, §5 row U4b, §8 decisions 10, 11, 19). Design: R26,
R42, R43, R24, R25 (paraphrase case), R40, sections 9 (P1, P17, P20, G7, G11). Items marked **needs-app** are
written and skipped (CONTRACT §7).

## Purpose
Build one checker batch: for each item that needs judgment, one file with the typed card, about 200 words of the
stored snapshot around the offset and, for a citation, the sentence; mix in seeds (through seed.mjs's `makeSeed`),
one per class at most, at random positions; keep the key in `sealed/`. The checker (Read only, on its batch) sees
opaque `i_` items and cannot tell a seed from a real item. The coordinator, never a child, starts the checker.

## Command line
```
node check-queue.mjs --root R --ce N --mode intake|freeze|post-review [--field <f>] [--batch-size <n>]
     [--classes <c>]... [--no-seeds] [--requeue] [--rng-seed <s>] [--now iso] [--dry-run]
```
`--mode` required. `--field` limits to one field (absent: all). `--batch-size` int, default threshold `batch_size`
(12): the most real items. `--classes` (list, default S1-S4 J1-J4) limits the seed classes; `--no-seeds` (bool) makes a batch of real items only (tests, and the pilot's first real batches). `--requeue` includes
items still in flight (below). `--rng-seed` overrides the derived seed (tests). The layer draft's `sample` mode is
not built (R43's uncited-card lot is "later").

## Reads
`tcb/thresholds.json` (`batch_size`, `window_words`); `store/status/card_status.jsonl` (last line per card);
`store/witness.jsonl` (last record per card: `text_sha`, `quote_offset`, `number_offset`, reason);
`.snapshots/text/<text_sha>` (offsets are UTF-16 indexes into this stored text, as witness writes them);
`store/objects/` cards, packs, reviews; `store/commits/*.json` and the ledger (`commit` and `intake` lines) to find
the committed pack or review and its flagged sentences; `queue/*/batch.json` and `sealed/seeds/*.json` (earlier
batches, in-flight test, next batch number); `run/ledger.jsonl` head (for the derived `rng_seed`).

## Writes
`sealed/seeds/<batch>.json` (first), `queue/<batch>/item-<item_id>.json` for every item, `queue/<batch>/batch.json`
(last: a folder without it is an incomplete batch and is ignored), all by exclusive create (canonical JSON + `\n`);
one `queue` ledger line {batch, n, n_seeds, rng_seed}. Under `run.lock`; `--ce` is checked inside it.

## Steps
1. Candidates by mode, in trusted terms only (R24). `intake`: `lib.intakeCandidates(root)` (CONTRACT §4.10, the
   same function the watcher counts for class 14): cards whose last status is `witnessed` (or `rejected` with
   reason `number-without-quote`, the paraphrase case: window around `number_offset`) with no `check` on that
   last line, or reverted as unqualified while qualification now holds; no sentence. `freeze` / `post-review`: the committed pack / review of each
   field (the object of that kind named by the commit record whose `commit` line has the highest seq); one item
   per (fact sentence, cited card) where the card is not `confirmed`, plus every (sentence, cited card) of a
   sentence named in a `flagged` entry (scope-outside, scope-dropped, number-uncited) even when the card is
   confirmed. A cited card that is not witnessed or confirmed is not queued; it is listed `untrusted` (certify fails it).
2. In flight: a card that is a real item of an earlier batch of the same mode with no status line whose
   `check.batch` is that batch is skipped unless `--requeue` (in `intake` mode this is `intakeCandidates`'
   `in_flight`).
3. Order candidates by (field, card id, sid), take `batch-size`. Nothing left -> exit 0, `batch: null`, `n: 0`,
   reason `nothing-to-check`, no file, no ledger line, no batch number used. Candidates exist but none has a
   readable window (witness record, text file or offset missing) -> exit 2 `inputs-missing`, each listed.
4. Window: split the stored text on whitespace; the `window_words` words centred on the word holding the offset
   (clamped at both ends), as the original substring from the first word's start to the last word's end.
5. Batch number `b<ce>-<n>`, `n` = 1 + the highest existing under `queue/` and `sealed/seeds/` for this ce.
6. Seeds: for each class in `--classes` (`S3`, `S4`, `J3` need two cards / a sentence: S4 and J3 are not seeded in
   `intake`), draw a source card from the eligible pool (witnessed or confirmed, with a window), never one that is a
   real item of this batch, with `rng = rng(rng_seed)`; `makeSeed`; a failed precondition skips the class and
   lists `{class, reason}`. In modes with sentences every item, seed included, carries a sentence; in `intake` none does.
7. `rng_seed` default `<batch>:<first 16 hex of the ledger head hash>`. Item ids: real `i_ + 16 hex of sha256(
   canonical{batch, card_id, sid|null})`, seed `i_ + 16 hex of sha256(canonical{batch, seed_id})`. Shuffle the
   union with `rng`; write the key, the items, `batch.json {batch, mode, items}`, then the ledger line.
8. Item body `{item, card, window, sentence?}`: `card` is the stored card object (no id); `sentence` has `cites: []`.
   Key per CONTRACT §3.17: `{batch, rng_seed, items: {<item_id>: {seed:false, card_id, node?} | {seed:true, class,
   operator, from_card, seed_id}}}`; a real sentence item carries `node` = `"<obj_id>#<sid>"`, so promote can
   attach a sentence-level verdict to its sentence (R18 clearing, CONTRACT §3.15).

## Exit codes
0 queue written, or nothing to check; 2 `inputs-missing` (also: `store/` unreadable, a threshold absent);
3 `seed-id` if a real candidate's id is `s_...` (tamper); 64, 66, 67, 70, 75 as the contract. 1 is not used
(the layer draft's "1 nothing to check" is exit 0 here, CONTRACT §5 lists 0 and 2 only). `--dry-run`: same
decisions, result with `dry_run:true`, `batch` and counts, no file, no ledger line.

## Behaviours
- T1 Intake, 3 witnessed cards with offsets and snapshot texts, `--batch-size 2`: batch `b1-1` has 2 real items
  (cards 1 and 2 by id order) and no seeds (`--no-seeds`); files `item-<id>.json` match `batch.json` items,
  `sealed/seeds/b1-1.json` maps each to `seed:false` and its `card_id`; ledger `queue` line {n: 2, n_seeds: 0}.
- T2 An item file has exactly `item`, `card`, `window` (no `sentence` in intake); `card` has no id and no `status`;
  `window` is a substring of the snapshot text, holds the quote and is about `window_words` words (+-1).
- T3 Window clamping: an offset in the first word gives a window starting at word 0; near the end it ends at the last
  word; a text shorter than `window_words` is returned whole.
- T4 Seeds: with default classes in `freeze` mode and enough cards, the key holds at most one seed per class, each
  seed has `class`, `operator`, `from_card` (a card not among the batch's real items), `seed_id` `s_...`; `n_seeds`
  in the ledger line equals the key's count; a class whose precondition fails is in `result.skipped` with a reason.
- T5 Seed positions are random but reproducible: the same `--rng-seed` on a copy of the same root gives the same
  `batch.json` order; a different `--rng-seed` changes the order; the `rng_seed` is in the key and the ledger line.
- T6 Opacity: no item file contains `s_` followed by 16 hex, the word "seed", a class name or an operator name; real
  and seed items have the same key set; in a batch all items have a sentence or none has (intake: S4 and J3 are
  skipped, `skipped` names them).
- T7 Item ids are `i_` + 16 hex, distinct, equal for the same batch and card on a re-created root, and not derived from
  the seed id's text.
- T8 `post-review`: a review with 2 fact sentences citing 3 cards (one already `confirmed`, one `rejected`): items
  for the unconfirmed witnessed pairs; the rejected card is in `result.untrusted`; a sentence flagged
  `scope-outside` in an `intake` line is queued for its confirmed card too; `cites` is `[]` in every item sentence;
  each real sentence item's key entry has `node` `"<review id>#<sid>"`, intake items have none.
- T21 Intake re-queue: a card whose last status line is `witnessed` with reason `unqualified-revert` is not a
  candidate while qualification marks J1 unqualified, and is once J1, J2 and J4 are qualified.
- T9 `freeze` reads the pack of the latest `commit` line, not an older one of the same field; `--field` excludes
  another field's objects.
- T10 In flight: a second run (same mode) right after the first skips the cards already queued and uses `b1-2` or
  reports `nothing-to-check` when none are left; `--requeue` includes them; once promote's status line carries
  `check.batch` for them they are skipped again.
- T11 Paraphrase case: a card rejected with `number-without-quote` is queued in `intake` with a window around
  `number_offset`; a card rejected `quote-missing` is not.
- T12 No candidates -> exit 0, `batch: null`, reason `nothing-to-check`, no `queue/` folder, no ledger line, and the
  next real run still gets batch number 1.
- T13 Candidates but a missing snapshot text file or a witness record without offset -> exit 2 `inputs-missing`
  listing the card ids; nothing written.
- T14 Crash safety: delete `batch.json` from a written batch; the next run takes the next number and the half-batch
  is ignored (not counted in flight).
- T15 `--dry-run`: stdout like a real run with `dry_run:true` and the planned `batch`, `n`, `n_seeds`; no file, no ledger line.
- T16 Stale `--ce` -> 64 and nothing written; busy lock (live sleeper) -> 75 and nothing written; unknown `--mode`,
  missing `--mode`, `--batch-size abc` -> 66.
- T17 A real candidate with an `s_` id -> 3 `seed-id`, nothing written.
- T18 The ledger written by the tests passes `verifyLedger`; `queue` data has exactly batch, n, n_seeds, rng_seed.
- T19 Seeded items are valid [queue-item] objects (`checkFormat`); each real item's `card` equals the stored card
  object; a seed's `card` differs from its `from_card` only in the fields its operator mutates (spot-check S2, J2).
- T20 `--classes J1 --classes J2` seeds only those; `--classes` naming an unknown class -> 66.

## Cannot be tested without the app
- That a checker started with Read only can read nothing but its batch folder (CONTRACT §7 items 1 and 2) and that
  its brief never reveals seeding (briefs are U5c's).
- That real witness offsets and stored texts from real pages give sensible windows (items 7, 10).
- That a real checker's detection varies with batch size (a pilot parameter, not a test).
