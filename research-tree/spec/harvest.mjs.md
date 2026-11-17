# harvest.mjs: specification (unit U2a)

Source of truth: `CONTRACT.md` §1, §2.1 (`staging/harvested/` is harvest's, exclusive create), §3.1 card,
§3.22 [reader-result], §4.3 (`walkFiles`), §4.6 (`attemptOf`), §4.8 transcript parser, decision 7. Design rules: R15 (harvest, never retype), R32 (re-validate against
tcb's card schema; cards made otherwise count as `copied_by_session`), R13.

## Purpose
Copy each reader's schema-checked result from the transcripts into the attempt's
`staging/harvested/`, re-validated against `tcb/schemas/card.schema.json`, so no session retypes card
fields. A result that does not validate is counted, never repaired.

## Command line
```
node tcb/harvest.mjs --root <abs> --ce <n> --task <id> --epoch <e> [--now <iso>] [--dry-run]
```
No mode. All flags required except `--now`, `--dry-run`.

## Reads
`run/coord.json`, `run/tasks.json`, `tcb/thresholds.json` (`transcripts_root`), `tcb/schemas/card.schema.json`;
the transcripts of the attempt's session: `lib.sessionTranscripts(transcripts_root, S)` where S is
`lib.attemptOf(row, e).session`; existing files in `wt/<task>-e<e>/staging/harvested/` (listed by
`lib.walkFiles`).

## Writes
`wt/<task>-e<e>/staging/harvested/<c_id>.card.json` by `createExclusive`, bytes = canonical JSON of the
card, `<c_id>` = `objectId('c', card)`. Nothing else: no ledger kind exists for harvest (commit's
`intake` line records the origin), so harvest appends no ledger line.

## Candidates
- Helper transcripts: every `structured` entry's `data` of every helper of S.
- The session's own transcript: every `structured` entry tied to an `Agent`/`Task` tool use (its
  `toolUseId`), and every tool result whose `toolUseId` belongs to an `Agent`/`Task` tool use and whose
  whole `text` parses as JSON. Such a result written in prose is no candidate (it is not counted); one
  whose text starts with `{` or `[` (after leading white space) and does not parse is a broken result:
  it counts as a candidate and as `unparseable`. The session's own `StructuredOutput` input or own `structured_output`
  attachment is no candidate: it is the session's own claim, and commit does not check the URL of a
  harvested card (R34, review U2-F2).
- A candidate is a bare card, or a [reader-result] `{schema_version: 1, cards: card[], skipped: [...]}`
  (CONTRACT §3.22), whose `cards` are taken; nothing else is read.
- Each card is checked with `checkFormat(root, 'card', value)` exactly as it is: no field is added,
  dropped, trimmed or coerced. A card failing it is counted `invalid` with its errors; a candidate that
  is no JSON object or holds no card is counted `unparseable`.

## Steps
1. Parse args. Read the table without the lock to find S (`readTasks`; corrupt → 67). No session → exit
   2 `no-session`. `sessionTranscripts` → main null and no helpers → exit 2 `transcript-missing`.
2. Parse every transcript (outside the lock; transcripts are append-only). Torn tails are skipped;
   `badLines` counted in `result.bad_lines` (not a failure).
3. Collect candidates, validate, dedupe by id (the same card from a helper and from the parent is one).
4. `withRunLock` + `checkCe` (64); `readTasks` again; `--epoch` ≠ row epoch → 65 `stale-epoch` (no
   zombie-write line: that kind belongs to commit and watch); row not `active` at `started`|`bound` → 65
   `wrong-step`.
5. `staging/harvested/` (created if missing): realpath must lie under the attempt folder (`isUnder`),
   else exit 3 `untrusted-path` (plus the §1.4 tamper `incident` line), nothing written. `walkFiles` of it:
   any entry in `links` → the same exit 3. A file there whose name is not `<c_id>.card.json` of its own
   canonical content is reported in `result.foreign` (audit's concern), never removed.
6. `createExclusive` each card: `created` or `identical` (counted `already`); `exists-different` → exit 3
   `harvested-differs` (the name is a content hash, so different bytes mean a foreign write). Every
   existing file is compared first, so a differing one exits 3 before any card is written, also
   under `--dry-run`.
7. Release; print the result.

## Exit codes
0 every candidate valid (also when zero were found); 1 `some-invalid` (≥1 candidate `invalid` or
`unparseable`; valid ones are still written); 2 `no-session`, `transcript-missing`, `param-missing`;
3 `untrusted-path`, `harvested-differs`; 64, 65, 66, 67, 70, 75.
Result: {session, transcripts: n, candidates: n, written: [c_id], already: n, invalid: [{source:
{file, line}, errors}], unparseable: n, bad_lines: n, foreign: [name]}.

## Design rules served
R15, R32 (P4 loss at a hand-over, P5 web text steering a session, G9). R13 by writing only its own
folder by exclusive create.

## Behaviours
- T1 A fake session transcript with one helper whose `structured_output` attachment holds a valid card:
  `staging/harvested/<c_id>.card.json` holds the canonical bytes, `<c_id>` equals `objectId('c',
  card)`, exit 0, `written` has the id.
- T2 The same card returned as a `StructuredOutput` tool-use input in the helper and as an Agent tool
  result's JSON text in the parent: one file, `candidates: 2`, `written` length 1.
- T3 A reader result `{cards: [a, b]}`: two files.
- T4 Rerun with nothing new: no file changed, `already: 1`, exit 0.
- T5 A card with a quote of 16 words, one with `measured.value: "12"` (string, not "not stated"), and
  one carrying `status: "confirmed"`: none written, `invalid` lists three with the schema errors, exit
  1; a valid fourth card in the same run is written.
- T6 An Agent tool result whose text is broken JSON (starts with `{` and does not parse), and a
  structured result that is a JSON array of numbers: `unparseable: 2`, exit 1. An Agent tool result
  in prose in the same session is no candidate: `candidates: 2`.
- T7 A card without `schema_version` is invalid (no field is added); a card with extra whitespace in the
  quote is written with the quote as given (no trimming) when it validates.
- T8 Row with no session for epoch e → exit 2 `no-session`, nothing written; session id with no
  transcript under `transcripts_root` → exit 2 `transcript-missing`.
- T9 A transcript with a torn last line: the complete lines are harvested, exit 0.
- T10 `--epoch 1` with the row at 2 → exit 65, nothing written; `--ce` stale → 64; lock held by a live
  sleeper → 75; corrupt `tasks.json` → 67.
- T11 `staging/harvested` is a junction to a folder outside the attempt → exit 3 `untrusted-path`,
  nothing written there; a junction or hard link inside `staging/harvested/` → the same.
- T15 A reader result `{schema_version: 1, cards: [a], skipped: [{url, reason: "blocked"}]}` → one file;
  an object with `cards` but no `schema_version` is `unparseable` (not a [reader-result]).
- T12 A file already at `harvested/<c_id>.card.json` with other bytes → exit 3 `harvested-differs`.
- T13 `--dry-run`: the result lists what would be written, `dry_run: true`, no folder or file created.
- T14 stdout is one JSON line per §1.3 on every exit above; stderr only for people.
- X2 (U2-F2) The session's own `StructuredOutput` input and own `structured_output` attachment holding
  cards → no candidates, nothing written for them; a helper's result in the same run is still harvested.
- X3 `staging/` a junction to an outside folder that already holds a real `harvested/` (walkFiles sees
  no link there) → exit 3 `untrusted-path`, nothing written behind it, one `incident` line.
- X4 one new card and one whose `harvested/<c_id>.card.json` holds other bytes → exit 3
  `harvested-differs` before anything is written (the new card is not written either); `--dry-run`
  exits 3 the same way.

## Needs the app
- §7 item 7: that a real reader's schema-checked result appears as `StructuredOutput` input or a
  `structured_output` attachment in its helper transcript, and that helper transcripts lie below
  `<session>/subagents/` (incl. `workflows/<run>/`).
- §7 item 8: the harness's schema retry of a helper result (retries are counted elsewhere).
