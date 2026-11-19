# commit.mjs: specification (unit U2a)

Source of truth for formats, names and codes: `CONTRACT.md` (§1.4 exits, §2.1 writers, §3.1-§3.6,
§3.11, §3.12, §3.7 `intake`/`commit`/`zombie-write`). Design rules: R2, R13, R14, R16-R18, R24, R34.

## Purpose
The acceptor. `intake` validates an attempt's untrusted staging (and its checkpoint), stores each valid
object by exclusive create, rejects with a code (never repairs) and flags R18 (d)/(e) sentences for the
checker. `record` makes a step's outputs visible through one commit record. No script commits to git
in the pilot (CONTRACT §2); the record's `commit` ledger line carries `git: null`.

## Command line
```
node tcb/commit.mjs intake --root <abs> --ce <n> --task <id> --epoch <e> [--now <iso>] [--dry-run]
node tcb/commit.mjs record --root <abs> --ce <n> --task <id> --epoch <e> --step <s> [--now <iso>] [--dry-run]
```
All flags required except `--now`, `--dry-run`. `--step` matches the commit-step pattern (§1.5).

## Reads
`run/coord.json`, `run/tasks.json`, `run/ledger.jsonl`, `tcb/schemas/*.schema.json`, `tcb/thresholds.json`
(`transcripts_root`, `index_words`, `W_quality`, `child_prefix_tokens`, `review_reserve_tokens`);
`wt/<task>-e<e>/staging/**` listed by `lib.walkFiles` (minus `READY.json`; `staging/harvested/` is
origin `harvested`, the rest `session`) and `wt/<task>-e<e>/in/checkpoint/**` (origin `checkpoint`);
the transcripts of every session named in the row's attempts (each read through `lib.attemptOf`);
the current frozen protocol of the field (`lib.currentProtocol`); `store/objects/*`;
`store/status/card_status.jsonl`; `store/commits/*`; for `record` also `staging/READY.json`, the
attempt's manifest object and the ledger's `audit` lines.

## Writes
`store/objects/<id>.json` (lib.putObject); `wt/<task>-e<e>/view/rejected.json` and
`view/committed.json` (writeAtomic, [rejected] and [committed], CONTRACT §3.22);
`store/commits/<task>.<step>.json` (createExclusive, [commit-record]); `run/tasks.json` (`commits`,
state `committed`, via updateRow); ledger lines `intake`, `commit`, `zombie-write`, `incident`.
Nothing under `.git`.

## Steps: intake
1. Parse; read transcripts and staging outside the lock (both are only read). A `staging/` or
   `in/checkpoint/` that is a junction or link out of the attempt folder → exit 3 `untrusted-path`.
   The attempt folder and its `view/` must be real folders (no link or junction) inside the run
   root's `wt/` and the attempt folder respectively; else exit 3 `untrusted-path`, nothing stored,
   `incident` line, checked before anything is stored or written (review U2-F4; a `view/` created by
   this run is checked again after creation).
2. `withRunLock` + `checkCe`; `readTasks`; row missing → 1 `no-task`. `--epoch` ≠ row epoch → append
   `zombie-write` {epoch_seen: e, tokens: spendOf(that attempt's transcripts).total or null}, exit 65.
   Row not `active` at step `started`|`bound` → 65 `wrong-step`.
3. List files with `lib.walkFiles`: `*.json` only (others ignored, listed in `result.ignored`); each
   entry of `links` → rejected `untrusted-path`, not followed. Parse each (`unparseable`); `kind` decides the schema
   (`card`, `pack`, `review`, `stpa`, `fmea`, `hazards`; else `unknown-kind`); `*.card.json` must be a
   card, `pack.json` a pack, `review.json` a review (`name-kind`). `checkFormat` → `schema-version` /
   `schema-invalid`.
4. Any `s_` id in any field of any file → exit 3 `seed-id`, nothing stored, `incident` line.
5. Cards first: `field` = row field (`wrong-field`); every `question_ids` entry in the row's
   `question_ids` (`question-not-owned`); `supersedes` and `supersede_reason` both or neither
   (`supersede-reason`); `supersedes` resolves to a stored or same-run card (`supersedes-missing`);
   origin `session`/`checkpoint`: `source.url` appears verbatim in what some attempt's transcripts
   (the session's and its helpers') show was found, never in what the session wrote itself
   (`url-not-in-transcript`, R34; review U2-F2): the URL a WebFetch was sent to (`access.urls`, not
   its `prompt`); the result text of a WebFetch, WebSearch or Agent/Task call, and the `urls` of
   such a result (CONTRACT §4.8: the URLs of its full text, past the 2,000-character cut); a structured result in
   a helper transcript, or in the session's own transcript only when tied to an Agent/Task call. Never
   a Write/Edit/Bash input or result, a Read result, a search query, or the session's own
   StructuredOutput.
6. Packs: `questions_sha` equals `lib.questionsSha` of the current frozen protocol's `question_ids`
   (`questions-sha`; no frozen protocol → the same code); `cards` sorted and unique (`not-sorted`);
   each id a stored or same-run card (`fk-card`); `parent` a stored pack or a pack accepted in this
   same intake, never one rejected in it (`fk-parent`; fixpoint over chains, review U2-F3: a child of
   a rejected same-run parent would be stored with a dangling parent and the next fsck exits 3); each `index[].summary` ≤ `index_words` words and its `cards` in
   the pack (`index-invalid`; the cap is a threshold, so no static schema holds it). Reviews: `pack` a stored pack (`fk-pack`); `parent` a stored
   review or one accepted in this same intake (`fk-parent`, the same fixpoint). Sentences (pack `conclusions`, review `sentences`): `sid` unique (`dup-sid`); a fact has ≥1
   cite (`uncited-fact`); every cite in the named pack's `cards` (`cite-outside-pack`); review
   `verdicts[].supports` and `dismissals[].sid` name existing sids (`bad-sid`); dismissal `supports`
   in the pack (`cite-outside-pack`).
7. Flags (object still stored): for each cited card c, an `applies_to` key whose values are not all in
   c's `conditions` key (strings by equality, arrays by membership) → `scope-outside`; a non-empty
   condition of c absent from `applies_to` → `scope-dropped`; a number in `text` (digits with optional
   decimals, thousands commas, sign, `%`; not touching a letter or `_`) equal to no numeric `value` or
   `baseline` of the cited cards when those are rounded to the decimals printed → `number-uncited`.
   An unsigned number matches either sign ("fell 12.5%" for −12.47); a printed `+` or `-` must match
   the value's sign too ("+12.5%" against −12.47 is uncited, review U2-F5).
8. `putObject` each accepted object (`id-collision` → 3). Write `view/rejected.json` (full current
   list) and `view/committed.json` (every object accepted for this task+epoch so far, `{id, kind,
   file}`).
9. Append one `intake` line {objects (only ids not already listed for this task+epoch by an earlier
   `intake` line), rejected, flagged} unless nothing is new and `rejected` equals the last line's.

## Steps: record
1-2. As intake 1-2 (zombie-write and 65 on a stale epoch). `--step` not in row `steps` → 1 `step-not-listed`.
3. Run the intake pass; if it appended a line → exit 6 `intake-new` (fsck must see the new objects).
4. The outcome log (FX-OUT, CONTRACT §3.23; READY.json is not read): a fenced log → 1 `attempt-fenced`
   {reason}; a bad log → 3 `outcome-tamper`; no ready slot → 2 `no-ready`; no ready slot for the step or a
   later one → 1 `ready-mismatch` {ready: steps}. (Before FX-OUT: `READY.json`: missing or unparseable → 2 `no-ready`; `kind` ≠ ready, `task`/`epoch` ≠ the call, or
   `step` not `--step` nor a later entry of `steps` → 1 `ready-mismatch`.)
5. Every earlier entry of `steps` has a commit record → else 1 `step-order`.
6. A passing `fsck` line newer than the last `intake` line of this task+epoch and newer than any failing
   `fsck` line → else 6 `fsck-stale` (R23, decision 18).
6b. An `audit` line of this task+epoch with seq greater than the last `intake` line of this
   task+epoch → else 6 `audit-missing` (the coordinator runs `audit` first; status `next` shows
   `audit`). The last such line has `label: tainted` → 1 `tainted` (decision 32).
7. Outputs = objects named by this task+epoch's `intake` lines whose kind is in the manifest's
   `outputs[step].kinds` (CONTRACT §3.22 steps and kinds); `getObject` each (mismatch → 3). Empty → 1
   `no-outputs`. A pack step needs exactly one pack (`pack-count`) whose cards have a status: any
   `pending` → 6 `cards-pending`; any `rejected` → 1 `untrusted-cards` with ids (R24). A review step
   needs exactly one review (`review-count`) whose `pack` is an output of some commit record
   (`pack-not-frozen`).
7b. R47 capacity (pack step only, decision 33): `tokens` = ⌈(canonical bytes of the pack + of each of
   its cards) / 4⌉; `cap` = `W_quality − child_prefix_tokens − review_reserve_tokens`; tokens > cap
   and the pack has no `index` → 1 `pack-over-capacity` {tokens, cap}. Every card of the row's field
   whose last status is `confirmed` must be in the pack's `cards` or superseded by a card in it → else
   1 `confirmed-card-cut` with the ids.
8. Record {schema_version, task, step, epoch, step_key = sha256 of the manifest's canonical bytes,
   outputs sorted by id, outputs_sha}; `createExclusive`: `identical` → go to 9 (repair a torn commit);
   `exists-different` → 1 `commit-differs`.
9. `updateRow`: `commits[step]` = sha256 of the record's bytes; all steps present → state `committed`.
10. No git step (CONTRACT §2: no script commits).
11. Append `commit` {step, outputs_sha, n, git: null} unless one for this task+step+outputs_sha exists.

## Exit codes
0 ok (incl. identical repeat); 1 rejected files (intake) or a refusal listed above (`tainted`,
`pack-over-capacity`, `confirmed-card-cut` among them); 2 `no-ready`, or no transcript found for a
card's URL check (those cards left unstored, `result.not_run`); 3 `untrusted-path`, `seed-id`,
`id-collision`, `object-mismatch`; 6 `intake-new`, `fsck-stale`, `audit-missing`, `cards-pending`;
64, 65, 66, 67, 70, 75. The §1.3 `code` is the exit's slug; the specific cause is `reasons[0].code`.
Result: intake {stored: [{id, kind, origin, created}], rejected, flagged, ignored, not_run};
record {record_sha, outputs_sha, n, state, git: null}.

## Behaviours
- T1 intake, valid card + pack + review in staging (URL in a fake transcript): three objects stored by
  canonical bytes, `intake` line lists them with origins, exit 0, `view/rejected.json` has `rejected: []`.
- T2 intake twice, nothing changed: second run stores nothing, appends no line, exit 0.
- T3 card with a `status` field → rejected `schema-invalid`; quote of 16 words → `schema-invalid`;
  `schema_version: 2` → `schema-version`; truncated JSON → `unparseable`; exit 1, other files stored.
- T4 fact sentence with `cites: []` → `uncited-fact`; cite not in the pack → `cite-outside-pack`; pack
  with unsorted cards → `not-sorted`; review naming an unknown pack → `fk-pack`. Nothing stored for them.
- T5 sentence with `applies_to.language: ["go"]` on a card with `["python"]` → stored, flagged
  `scope-outside`; card has `model_family` and the sentence omits it → `scope-dropped`; text "rose
  12.5%" with card value 12.47 → no flag; text "rose 14%" with value 12.47, baseline 10 → `number-uncited`.
- T6 session card whose URL is in no transcript → `url-not-in-transcript`; the same URL inside a helper's
  tool result → accepted, origin `session`; a file under `staging/harvested/` → origin `harvested`.
- T6b A URL found only past the 2,000-character cut of a helper's WebFetch result → accepted (through
  the result's `urls`); a URL in no result → still `url-not-in-transcript`.
- T7 `supersedes` without `supersede_reason` → `supersede-reason`; naming an absent card →
  `supersedes-missing`.
- T8 a cite `s_0123456789abcdef` → exit 3 `seed-id`, no object stored, `incident` line.
- T9 `staging` replaced by a junction to a folder outside the attempt → exit 3 `untrusted-path`.
- T10 `--epoch 1` when the row is at 2 → exit 65, `zombie-write` line {epoch_seen: 1, tokens: the fake
  transcript's total}; no object stored.
- T11 `--ce 1` with `coord.json` ce 2 → exit 64, nothing written; `run.lock` held by a live sleeper →
  75; `tasks.json` unparseable → 67, `tasks.json.prev` untouched.
- T12 `--dry-run`: stdout as T1 with `dry_run: true`, no object, no ledger line, no `rejected.json`.
- T13 record after intake, a passing fsck line and a clean `audit` line: commit record file as §3.11, row `commits.pack` = its
  sha256, `commit` line, exit 0; with one step listed the row becomes `committed`.
- T14 record repeated: exit 0, no second `commit` line. A torn commit (record file present,
  `commits[step]` absent from the row, no `commit` line): rerun sets both, exit 0. Different outputs for an existing record → 1 `commit-differs`.
- T15 record with no READY → 2 `no-ready`; READY of epoch 1 in the epoch-2 folder → 1 `ready-mismatch`;
  READY `step: review` and `--step pack` with steps `[pack, review]` → accepted.
- T16 record `--step review` before `pack` is recorded → 1 `step-order`.
- T17 record with no fsck line after the last intake → 6 `fsck-stale`; new staging file present → 6
  `intake-new` and an `intake` line.
- T18 pack citing a card with no status line → 6 `cards-pending`; with status `rejected` → 1
  `untrusted-cards` listing the id; unverifiable cards are accepted.
- T19 a stored object's bytes altered on disk before record → 3 `object-mismatch`.
- T20 with `git init` in the temp root: record exits 0, the `commit` line has `git: null` and `git
  log` shows no new commit (no script commits). Every ledger written verifies with `verifyLedger`.
- T21 record with an `audit` line older than the last intake line, or none → 6 `audit-missing`; the
  newest audit line `label: tainted` → 1 `tainted`; clean → passes this step.
- T22 pack whose canonical bytes / 4 exceed `W_quality − child_prefix_tokens − review_reserve_tokens`
  (thresholds set small in the fixture) and no `index` → 1 `pack-over-capacity`; the same pack with an
  `index` → accepted. A field card with status `confirmed` neither in the pack nor superseded by one
  of its cards → 1 `confirmed-card-cut` with its id.
- T23 a pack whose `questions_sha` differs from `lib.questionsSha` of the frozen protocol →
  rejected `questions-sha` at intake.
- T24 intake writes `view/committed.json` listing every accepted id with its kind and file; a second
  intake adding one object lists both.
- T25 a symbolic link or junction inside `staging/cards/` → listed by `walkFiles` as a link,
  rejected `untrusted-path`, never read.
- X5 (U2-F2) a session card whose URL is only in the session's own Write input, a Read result, a
  WebFetch prompt, a search query and its own StructuredOutput (all at once) → `url-not-in-transcript`;
  the URL in a helper's WebSearch result → accepted.
- X6 (U2-F3) a pack whose parent is a same-run pack rejected `questions-sha` → `fk-parent`, and a
  review whose parent is a same-run review rejected `fk-pack` → `fk-parent`; a parent accepted in the
  same run → both stored.
- X7 (U2-F4) `view/` replaced by a junction out of the attempt → exit 3 `untrusted-path`, nothing
  stored, nothing written behind it, one `incident` line.
- X8 (U2-F5) card value −12.47: "+12.5%" → `number-uncited`; "-12.5%" and "fell 12.5%" → no flag.

## Needs the app
- That a real reader's URLs appear in the child's or helper's transcript in the §4.8 shape (§7 item 7).
