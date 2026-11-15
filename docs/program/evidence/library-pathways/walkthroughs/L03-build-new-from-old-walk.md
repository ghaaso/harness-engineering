# L03 — Building something new where similar things exist: a walk through the library design

Pathway family: a new slice, table or queue is written while earlier pieces of the same shape
already sit in the repository. Five cases: the four collected (C1 to C4) and one added (C5, the
mobile offline queues), to widen the mix from backend migrations to concurrency in the second
repository and to a TypeScript client.

Rules followed: read-only; no fixes, mitigations or redesigns; where the knowledge-store design
(`KNOWLEDGE-STORE-DESIGN-2026-11.md`, called KS below) already has a mechanism for a step, the
step is counted as working and the section is named.

Statuses: works, strains, breaks, not_specified, not_reached.

---

## 0. Corrections to the collected cases (checked against the sources)

- **C1. The `*_minor` rule did not start with 0039.** It entered CLAUDE.md on 2026-07-08 in
  `85c88c0` (the 0033 truth pass): "**new** money columns are named `*_minor`". 0039 was its
  first user. Three days after the rule, 0035 (`05cc9e4`, 2026-07-11, Fable) added a **new** money
  column `job_completion.fuel_rate_paisa_per_km`, "same contract as ``labour_rate_paisa``"
  (`0035_job_travel_sample.py:20`).
- **C1. `labour_rate_paisa` on jobs is an old column** (since `ee343da`, 2026-06-10), so
  `7d567c7` snapshotting into it obeys the carve-out. The new settings registry, however, holds
  both forms side by side: `KEY_LABOUR_RATE_PAISA = "labour_rate_paisa"` (specs.py:30) and
  `KEY_ADVANCE_ABSOLUTE_CAP_MINOR = "advance_absolute_cap_minor"` (specs.py:39).
- **C1. The "new empty table, FKs VALID" rule was also older.** 0035 already says "Brand-new
  empty table, so its FKs (→ job, → technician) are inline at create; no backfill, no NOT VALID
  dance" (`0035_job_travel_sample.py:13`). 0039, 0040 and 0042 restate it in their docstrings.
- **C1. 0042 was half-right when merged.** The next day `842c3dc` (Opus 5) added the advance
  stacking guard (`AdvancePendingError`), the advisory-lock serialisation of decisions and the
  approve-time balance re-check; HANDOFF §5.2 lists three still open, first "`actor="auto"` is a
  live FK violation" (`docs/HANDOFF-2026-07-28-open-work.md:478`).
- **C2. 0027's own backfill orders by `created_at`** ("backfilled by `row_number() OVER (ORDER BY
  created_at, id)`", 0027 docstring lines 10-12). And 0041, built the same evening, deliberately
  does **not** use a DB sequence: "per-shop ``pg_advisory_xact_lock`` (NOT a DB sequence, which
  would leave gaps on rollback and could not carry ``prev_hash`` linkage)"
  (`attendance/models.py:498-500`); its backfill orders by `created_at` with explicit tie-breaks
  (`attendance/chain.py:351-353`).
- **C3. 0027 and 0034 are the same day, same model** (`d1f78cd` 10:48, `834311f` 23:19, both
  Fable). The 0027 cursor model plans three consumers: "One row per outbox consumer
  (``whatsapp``, ``erp``, ``analytics``)" (d1f78cd, `DispatchCursor` docstring). `c731e66` is a
  branch-only commit (`origin/fix/mobile-completion-guards`); the squash on main is `da988e2`.
- **C4. The S07 session had G02-20 in its window before it copied the 32-bit form.** Transcript
  `C--Bilal-...--claude-worktrees-funny-noyce-58e1dc/733bc52b-80e5-4346-a3a0-537ec7b7ed33.jsonl`:
  18:39:58Z reads `task.md` lines 100-180, whose result holds "G02-20 | ... advisory locks use
  32-bit `hashtext`, so a collision serializes two unrelated keys | P3 | S11 review; record";
  18:40:25Z reads `operations/kernel.py`; 18:48:54Z writes `0005_cash_guards.py` with
  `PERFORM pg_advisory_xact_lock(2007, hashtext(...`; 18:52:57Z writes the Python lock the same way.
- **C4. S04 copied S01's lock verbatim, then its own review found the deadlock.** Transcript
  `...quirky-vaughan-9f1401/a9b52f2e-....jsonl`: `_lock_item` docstring "S01's item lock: the item
  row FOR UPDATE, at the version step 1 saw, still active" (04:38-04:50Z); review round 1 finding 2
  "P2: Lock-order inversion" at 05:40:39Z; switched to FOR NO KEY UPDATE at 05:50Z. S03 had merged
  at 04:26Z (`37c172d`, 09:26 +0500), before S04 learned it.
- **C4. The FOR KEY SHARE fact existed a day earlier in S02's record**, worded as a test remark:
  "the foreign-key check's FOR KEY SHARE already makes a raw insert wait"
  (`docs/tasks/s02-posting/evidence/review-round-2-root-gate.md:57`).
- **C4. The copies are still on the old form today:** `src/clinic/finance/cash.py:409`,
  `src/clinic/issuing/references.py:166`, `finance/migrations/0005_cash_guards.py:158,167`,
  `issuing/migrations/0004_bill_line_item_version.py:29-30`.

---

## C1. Staff money chain (0039 to 0042) and the money-naming rule

**What happened.** 0039 (`26c9f1e`, 13:55) built `staff_ledger`. 0040 (`7d567c7`, 17:23) the
settings registry. 0041 (`acba12a`, 18:42) the hash chain. 0042 (`db545cb`, 19:13) advances,
reusing the ledger's unique `client_id` as the exactly-once guard. All Fable, one day. CLAUDE.md
was updated in the same or the next commit (`bb23851` one minute after 0039; `7d567c7`, `acba12a`,
`db545cb`), so by 0042 it already described 0039 to 0041.

**Entry as the 0039 solver could have written it (13:55).**
> staff_ledger (0039): append-only staff money. `amount_minor` unsigned with a DB CHECK; sign
> comes from `kind` via `LEDGER_SIGN`. Corrections void and re-log with a reason, never edit.
> Balances only through `repository.ledger_balances`, the one place voided rows are filtered.
> Writes idempotent on a unique `client_id`. New empty table, so FKs are created VALID; the NOT
> VALID two-step is for populated tables. New money columns are `*_minor`; old `*_paisa` names
> stay. Payroll CSV stays money-free: a point-in-time balance would break its idempotent export.

**The later moment.** A cheap model is given "3.4 earned-wage advances". Its window holds CLAUDE.md
(with the 0039 to 0041 summaries), the requirements text and the attendance slice. It is designing
the request table, approval and disbursement. A lookup keyed on "advance disbursement exactly once
ledger" returns the 0039 entry as a likely lead; "advance policy caps settings" returns 0040;
"ledger" also pulls 0041. Nothing returns the step that made 0042 work: a pre-minted
`disbursement_client_id` that becomes the ledger row's `client_id`. Nothing warns that two requests
can stack, that approval must re-check the balance, or that `actor="auto"` cannot go into
`recorded_by`, a VALID FK to `technician.id`.

| Step | Status | Note |
| --- | --- | --- |
| 1 Window | works | CLAUDE.md already summarised 0039, 0040 and 0041 when 0042 began; each solver updated it in the same commit. The shapes are in the window before any lookup. |
| 2 Trigger | breaks | Building 0042 raised no error. KS lookups fire on escalation, retry, a prescribed fix, or a `--diff` ident of a do_not_apply/open_defect/trap entry (§7.2). None covers stacking or a system actor. |
| 3 Query | strains | "Exactly-once disbursement" shares words with the 0039 entry. No query in the task's words asks whether `recorded_by` is an FK or whether two requests can stack. |
| 4 Match | strains | Four partial matches (0039 dedup, 0040 registry, 0041 chain, the storage-backend seam). KS shows at most one lead and one candidate within 2,000 characters (§4.1), so pieces drop out. |
| 5 Delivery | works | The main session pulls the cards into its own window (KS §7.2). One session builds the slice. |
| 6 Use | breaks | The working step (pre-minted `disbursement_client_id`) is in no entry. Reusing 0039's VALID `recorded_by` FK with a new `actor="auto"` composes into an FK violation (HANDOFF:478). |
| 7 Check | breaks | 544 unit and 7 integration tests passed. The stacking race, the re-check and the auto-approve failure were invisible ("no test ever sets a non-zero threshold"). An Opus audit added guards next day (`842c3dc`). |
| 8 Ladder | not_reached | Nothing failed during the task, so nothing was handed up. The fixes came from a later audit, outside any ladder. |
| 9 Capture | breaks | Stored at "solved" (`db545cb`), the entry holds the half-right design. KS's write rule (escalation, two failures, burned build, §7.3) stores nothing here; the owner's rule stores the flawed version. |
| 10 Afterlife | breaks | "Turning dehari on changes the advances blast radius: `accrued_credits` is lifetime-gross" (HANDOFF:449). The registry holds `labour_rate_paisa` beside `advance_absolute_cap_minor`; the rule's carve-out does not say which a new key follows. |

**What it would have saved.** The 0039 entry carries the exactly-once primitive a cheap model needs
for any money row; 0042 reused it correctly. That saves re-deriving idempotency, not the
composition and not the guards.

---

## C2. shop_setting 0040: the borrowed seq idea, first copy on `created_at`

**What happened.** `7d567c7` (17:23) ordered "latest write wins" by `created_at`. CI's real-Postgres
integration test failed. `12c16f1` (17:37): "now() is transaction-start time in Postgres ... seq
(the job_event_seq client-side-default pattern) is monotonic across and within transactions".
Fourteen minutes. At 18:42 the same day 0041 needed a per-shop **gapless** seq and chose "NOT a DB
sequence".

**Entry as the 0027 solver could have written it (2026-07-08).**
> job_event.seq (0027): to give an append-only log a total order, add `seq` NULL; backfill with
> `row_number() OVER (ORDER BY created_at, id)` (rehearsed read-only on prod: 56 rows, gap-free,
> no created_at ties); create `job_event_seq`, `setval` past the max; then NOT NULL + UNIQUE.
> The ORM attaches the sequence as a client-side default, so no server DEFAULT appears and
> `alembic check` stays clean.

**Entry as the 12c16f1 solver could have written it (17:37).**
> Latest-row-wins tables: do not order by `created_at`. `now()` is transaction-start time, so two
> writes in one transaction tie and UUID order picks the winner. Use a monotonic seq (the
> `job_event_seq` client-side-default pattern). Caught by a CI integration test on real Postgres.

**The later moments.** (a) At 0040 a cheap model is designing "effective value = latest row per
(shop, key)". It does not know it has a problem. A lookup in its words ("latest write wins,
append-only settings") shares few words with the 0027 entry, and that entry would not warn anyway:
its own backfill orders by `created_at`. CI fails; KS's "failing gate, before retrying" trigger
fires on a wrong-value assertion that names neither `now()` nor `created_at`; it misses.
(b) At 0041 the model is building a hash chain. A lookup on "append-only ordering seq" now hits the
fresh 12c16f1 entry: "use a DB sequence; never `created_at`". Both halves are wrong for 0041.

| Step | Status | Note |
| --- | --- | --- |
| 1 Window | works | Task 3.1, CLAUDE.md, tenancy code. The `job_event_seq` pattern lived in 0027's code and docstring. |
| 2 Trigger | strains | Nothing triggers while designing. The CI failure is a KS trigger (failing gate, before retrying, §7.2), so a lookup runs only after one CI round. |
| 3 Query | breaks | "Latest row wins per key" shares little with 0027's words (outbox, seq, backfill). The CI error is an assertion on a value; it does not name the cause. |
| 4 Match | breaks | 0027's entry is the right neighbour but holds no reason against `created_at`; it uses `created_at` itself. At 0041 the fresh 12c16f1 entry is a wrong match. |
| 5 Delivery | works | Main session, where the design happens. |
| 6 Use | breaks | At 0041, "use a DB sequence" breaks the chain: gaps on rollback, no `prev_hash` linkage. "Never `created_at`" flags 0041's backfill, which orders by `created_at` with tie-breaks, correctly. |
| 7 Check | works | The real-Postgres CI integration test caught the tie in 14 minutes. Here the check reproduces the cause. |
| 8 Ladder | strains | A cheap model facing a wrong-value assertion would escalate. The strong model fixed it in 14 minutes, one commit; any rung costs more than that. |
| 9 Capture | strains | KS stores nothing (one failed approach, no escalation, no burned build). The owner's rule stores it, and the general form is too broad for 0041 four hours later. |
| 10 Afterlife | breaks | Within four hours the entry points the next slice the wrong way on both its seq and its backfill order. |

**What it would have saved.** For another append-only latest-wins table, the 12c16f1 entry saves
one CI round and one fix commit, if the query wording reaches it.

---

## C3. customer_messaging 0034 on the 0027 outbox; the cursor hazard

**What happened.** 0027 (`d1f78cd`, 10:48) added `dispatch_cursor` and `run_dispatch_once`, which
mints a missing cursor as `DispatchCursor(consumer=consumer, last_seq=0)`; the whatsapp consumer was
log-only and the dispatcher OFF. 0034 (`834311f`, 23:19) made the consumer real and concluded:
"UNIQUE(job_id, kind) IS the idempotency guard, so outbox replays ... can never double-send" and
"enable_dispatcher stays safe to flip". An audit on 2026-07-28 found B1 ("Enabling the dispatcher
replays the entire `job_event` history", HANDOFF:303). 0046 measured "36 WhatsApp messages about
jobs that may be months old, to real customers", and that a `suppressed` first decision is permanent.

**Entry as the 0027 solver could have written it (10:48).**
> Transactional outbox (0027): `job_event.seq` gives a gap-free global order; `dispatch_cursor`
> holds one row per consumer (whatsapp, erp, analytics). `run_dispatch_once` reads `seq >
> last_seq` in order and advances only past events the handler accepts; a failure halts the batch
> for retry. A scheduler interval job runs it behind `settings.enable_dispatcher`, default OFF.
> The whatsapp consumer is log-only for now.

**The later moment.** The same evening a cheap model is told to make the WhatsApp consumer real.
Its window holds the WhatsApp plan, the 0027 code and CLAUDE.md. Its question is "can a replay
double-send?" A lookup on "outbox consumer idempotent send" returns the 0027 entry as a strong
match. The entry does not mention the `last_seq=0` mint: harmless for a log-only consumer, and the
right behaviour for the erp and analytics consumers 0027 planned. The model adds UNIQUE(job_id,
kind), tests it, and writes "safe to flip".

| Step | Status | Note |
| --- | --- | --- |
| 1 Window | works | Same day as 0027, same model. The dispatcher code was fresh; the WhatsApp plan set the task. |
| 2 Trigger | breaks | Nothing fails: dispatcher OFF, Cloud settings empty. No trigger exists for "a new consumer on an old cursor". |
| 3 Query | breaks | The builder asked about double-send on replay, answered by UNIQUE. The hazard answers another question: what does the first tick do with history? |
| 4 Match | strains | Returns 0027's entry, the right neighbour, without the mint-at-zero default, which was not a hazard when written. |
| 5 Delivery | works | Main session window. |
| 6 Use | breaks | The hazard exists only in the merge: an old default (drain from zero), a new real sender, and a permanent first decision per (job, kind). Neither parent holds it. |
| 7 Check | breaks | Tests passed; the UNIQUE guard was tested. Nothing tested a first tick against history. An Opus audit found it 20 days later; the fix landed 24 days later (`da988e2`). |
| 8 Ladder | not_reached | No failure was visible, so nothing went up. The finder was a later audit. |
| 9 Capture | breaks | The stored conclusion would be "enable_dispatcher stays safe to flip": wrong, and fetched by anyone about to flip the variable. |
| 10 Afterlife | strains | After 0046, KS's ex4 has an `action` handle "enable dispatcher" and `--diff` idents that warned on 13 of 154 past commits, all dispatcher, outbox or messaging work (§7.2). That works. "Seed at head" is right for whatsapp only. |

**What it would have saved.** After 0046, KS's ex4 guards the one operator action (the env flip)
that would send 36 messages and write permanent `suppressed` rows. Before 0046 the library held the
wrong "safe to flip" conclusion.

---

## C4. Clinic: item lock strength and the 32-bit advisory key across parallel slices

**What happened.** S02's kernel (`f98e351`, 2026-11-03) locked keys with
`pg_advisory_xact_lock(n, hashtext(key))`. S02's gate recorded G02-20 (32-bit collisions, P3, owner
"S11 review") on the board. S07 read that row, then copied the form into a trigger and a Python
lock. S04 copied S01's FOR UPDATE item lock; its own Opus review found the deadlock with other
stock writers' deferred FK checks (FOR KEY SHARE) and moved to FOR NO KEY UPDATE (D04-06). S03 had
merged before that. The kernel follow-up (merge `c6adf7b`, 2026-11-09) fixed S03's receipt and moved
the kernel to 64-bit keys; S07's and S04's copies stay on the 32-bit form.

**Entry as the S02 solver could have written it (2026-11-03).**
> Kernel `run_command` (S02): one transaction per command. Idempotency key and per-sender key are
> serialized with `pg_advisory_xact_lock(namespace, hashtext(key))`. Retry only on 40001/40P01,
> at most three times, only when `run_command` owns the transaction. Deferred FK checks take
> FOR KEY SHARE on referenced rows at commit (E4: a raw insert against the ledger's FOR UPDATE
> waits). Open: G02-20, `hashtext` is 32-bit, so a collision serializes unrelated keys (P3, S11).

**The later moments.** (a) S07, 18:39Z on 2026-11-03: the session reads 55 tool results, 392,125
characters, in nine minutes: the board (with G02-20), conventions, the S02 record, `kernel.py`.
Then it writes its cash-reference guard with the 32-bit form. The warning was delivered and lost.
(b) S04, 04:38Z on 2026-11-04: it writes `_lock_item` as "S01's item lock: the item row FOR
UPDATE". A lookup on "lock the item row before posting" returns S01's lock: right shape, wrong
strength. S02's E4 remark is worded as a test-validity note and does not match a lock query.

| Step | Status | Note |
| --- | --- | --- |
| 1 Window | strains | Slice sessions open on the board, conventions, decision records and kernel code. S07 read 392,125 characters in nine minutes before its lock; S04 averaged about 231k cache-read tokens per call (193M over 835 calls). |
| 2 Trigger | breaks | Writing a lock raises no error; the kernel retries the deadlock and outcomes stay right. `select_for_update` is too common to pass KS's 5 % selectivity gate; a missing `no_key` is an absence (§3.3, §3.4). |
| 3 Query | strains | "Lock the item before posting" finds S01's lock. The FOR KEY SHARE fact sits under a test-validity remark and a lock-order query does not reach it. |
| 4 Match | breaks | The best matches, S01's FOR UPDATE and the kernel's `hashtext` form, are the defect sources. The sibling is the problem. |
| 5 Delivery | works | G02-20 entered S07's main window at 18:39:59Z, nine minutes before the copy, with no compaction between. |
| 6 Use | breaks | S07 wrote `hashtext` anyway at 18:48:54Z. The row carried "P3" and an owner elsewhere ("S11 review"). S04 copied S01's FOR UPDATE. Working sibling code outranked the note. |
| 7 Check | breaks | Tests pass; deadlocks are retried. S04's was found by an Opus review ("CONFIRMED by tracing"); the collision by a staging drill (F-S02-2, `f_posix_checks-20261104T104717Z.md:861,876`). |
| 8 Ladder | strains | The higher tier caught it as a reviewer of the diff, not because the builder failed and handed up. The builder never knew. |
| 9 Capture | works | S04 wrote D04-06 and conventions line 95 the same day, naming the sites still wrong. The repository's conventions file did the capture. |
| 10 Afterlife | breaks | S03 merged at 04:26Z, before S04 learned the rule at 05:40Z; fixed five days later. The kernel went 64-bit on 2026-11-06; S07's and S04's copies are still 32-bit. D02-38 keeps the reversal FOR UPDATE on purpose. |

**What it would have saved.** If G02-20 had been an entry with a `hashtext` ident handle, KS's
`--diff` arm would print a warning at S07's, S04's and S05's first commits, sparing item 4 of the
kernel follow-up and the copies still open. KS keeps most open defects in the register instead
("Roughly 128 open defects stay in the register", F1 §3); G02-20 was in the register and S07 read it.

---

## C5 (added). Mobile offline queues after the jobs outbox

**What happened.** Outbox v2 (`60c026d`, 2026-06-10, Fable): "flush moves definitive 4xx to a
visible failed list on the job (Retry / Discard, never auto-delete), retries 5xx/429/timeouts, and
pauses the whole queue on 401". The presence queue (`e48c3b4`, 2026-06-30, Opus 4.8, "offline
presence outbox") and the ping queue (`436e180`, 2026-07-03 07:02, Opus 4.8) retried every error.
`c27bb39` (12:01 the same day, Opus 4.8): "a 403 or 422 became a permanently stuck 'pending' badge
... the exact silent-retry-forever the jobs outbox already fixed but that was never carried over".
It extracted `lib/syncClassification.ts`; pings drop a definitive-4xx batch by design. The ping
author had carried the general rule and broken it on purpose: "the ONE exception to 'the queue
never drops unsent'".

**Entry as the outbox v2 solver could have written it (2026-06-10).**
> Mobile outbox v2: v1 deleted any queued write the server answered with a non-network error, so
> a payment syncing into a 502 mid-deploy, or under an expired token, was destroyed. Classify by
> status: definitive 4xx goes to a visible failed list with Retry/Discard, never auto-deleted;
> 5xx, 429 and timeouts retry; 401 pauses the whole queue until re-login, items survive logout.
> Tag each item with the signed-in tech.

**The later moment.** A cheap model builds the geofence presence queue on 2026-06-30. Its window
holds the presence task and the attendance code. Its own words for the piece are "offline presence
outbox". Nothing fails: a 403 just leaves a pending badge. If a lookup ran, "offline outbox" would
reach the v2 entry. For presence the entry is the same contract. For pings, built three days later,
it is half wrong: pings must drop a definitive 4xx.

| Step | Status | Note |
| --- | --- | --- |
| 1 Window | works | The presence task and attendance code; the outbox lesson lived in `outboxSync.ts` and the `60c026d` body. |
| 2 Trigger | breaks | Nothing fails. A 403 or 422 leaves a "pending" badge forever with no error to look up. |
| 3 Query | works | The builder's words, "offline presence outbox", share "offline" and "outbox" with the entry. KS's lexical retrieval reaches it. |
| 4 Match | strains | Presence and punches: same contract. Pings: similar, not the same; droppable by design. |
| 5 Delivery | works | Main session. |
| 6 Use | strains | Presence must park a definitive 4xx; pings must drop it while 401 still stops the drain. The ping author carried "never drops unsent" and broke it on purpose, but not the classification. |
| 7 Check | breaks | Jest tests with a mocked network passed; none sent a 4xx. The ping gap was found by its author five hours later; the presence gap lived three days. |
| 8 Ladder | not_reached | No failure was visible; nothing went up. |
| 9 Capture | works | `c27bb39` turned the lesson into shared code; CLAUDE.md states the contract and its two droppable exceptions. |
| 10 Afterlife | works | `pendingMedia.ts` (2026-07-11) and `travelSync.ts` (2026-07-12) imported `isDefinitiveRejection` from their first commit and chose park or drop correctly. |

**What it would have saved.** Delivered on 2026-06-30, the v2 entry carries exactly the missing
classification for presence and punches: three days of stuck badges and the `c27bb39` rework, if a
trigger had fired.

---

## Breaks, clearest first

1. **Building raises no failure, so nothing triggers a lookup** (step 2; known #1, #23; 5 cases).
   Every defect here was written while building, with tests green. KS's triggers are escalation,
   retry, prescription and `--diff` idents; `select_for_update` is too common to be a handle, a
   missing guard is an absence, and a silent pending badge or an OFF dispatcher emits nothing.
2. **Green tests; only a later stronger review, real-DB CI or a drill saw the defect** (step 7;
   known #4, #23; 4 cases). 0042: Opus audit next day. 0034: Opus audit 20 days later. S04: Opus
   review round 1. Hash collision: staging drill. Pings: the author five hours later.
3. **A sibling needs the opposite adaptation** (step 6; known #3; 4 cases). 0041 needs a gapless
   per-shop seq, not 0040's DB sequence, and orders its backfill by `created_at` correctly. Pings
   drop a 4xx that the outbox parks. The cursor's drain-from-zero is right for erp/analytics,
   wrong for whatsapp. D02-38 keeps the reversal FOR UPDATE on purpose.
4. **The closest sibling carries the defect, so a match spreads it** (step 4; known #8; 3 cases).
   S04 matched S01's FOR UPDATE; S07 and S05 the kernel's `hashtext`; 0034 the 0027 cursor; 0040
   a seq entry whose own backfill uses `created_at`.
5. **Stored at "solved", the strong answer was still wrong** (step 9; known #26; 3 cases).
   `7d567c7` ordered by `created_at`; `834311f` wrote "safe to flip"; `db545cb` lacked three
   guards and still has three open defects.
6. **The detail that mattered was harmless when written** (step 9; known #29; 3 cases). The
   `last_seq=0` mint was harmless for a log-only consumer; 0027 had no ties in prod; S02's FOR KEY
   SHARE fact was a test-validity remark, not a lock-order rule.
7. **A warning already in the window loses to working sibling code** (step 6; new; 2 cases). S07
   read G02-20 and nine minutes later copied the flagged form; the row's P3 label and remote owner
   read as someone else's problem. 0035 added `fuel_rate_paisa_per_km` "same contract as
   labour_rate_paisa" three days after the `*_minor` rule entered the always-loaded CLAUDE.md.
8. **The library duplicates what solvers already write into always-loaded files or shared code**
   (step 9; new; 3 cases). CLAUDE.md was updated in the same commit as 0040, 0041 and 0042, and
   one minute after 0039 (`bb23851`); S04 wrote
   conventions line 95 the same day; c27bb39 made the lesson a shared module that later queues
   imported. The capture cost (KS: 5-10k Opus author tokens plus 2-4k reviewer tokens per entry,
   §7.7) buys a second copy.
9. **Two checked parents, an unchecked merge** (step 6; known #14; 2 cases). 0039's VALID
   `recorded_by` FK plus 0042's `actor="auto"` fails only when auto-approve is on, which no test
   sets. 0027's cursor plus 0034's real sender is the replay hazard; each part was tested.
10. **The builder asked the question it had, not the one that mattered** (step 3; known #2; 2
    cases). 0034 asked about double-send and got UNIQUE; the hazard was the first tick. At 0040 the
    CI error named a wrong value, not `now()`.
11. **A corrected parent leaves its copies behind** (step 10; known #35; 1 case). The kernel moved
    to 64-bit keys on 2026-11-06; `cash.py:409`, `references.py:166` and two trigger migrations are
    still 32-bit, "until their owners move both together".
12. **Parallel slices cannot receive a lesson learned an hour later** (step 10; known #31; 1 case).
    S03 merged at 04:26Z; S04 learned the lock rule at 05:40Z; the merged receipt stayed wrong five
    days, until the kernel follow-up.

## Where the design works

- **C3 afterlife.** Once 0046 exists, KS's ex4 (`action` handle "enable dispatcher", `--diff`
  idents firing on 13 of 154 past commits, all dispatcher, outbox or messaging work) guards the
  env flip that would send 36 old-job messages and write permanent `suppressed` rows.
- **C5 match.** The builder's own words ("offline presence outbox") reach the v2 entry lexically;
  for presence and punches it is the exact missing classification. Saved, had a trigger fired:
  three days of stuck badges and the `c27bb39` rework.
- **C2 check.** Real-Postgres CI caught the tie in 14 minutes. A stored 12c16f1 entry saves the
  next latest-wins table one CI round and a fix commit, if the wording reaches it.
- **C1 reuse.** The 0039 `client_id` dedup is the exactly-once primitive for any later money row;
  0042 reused it correctly.
- **C4 and C5 capture.** The clinic's conventions file and FixFlow's shared module already did
  capture and afterlife well: S08 read D04-06 and reasoned its own exception (D08-19); later queues
  imported the classifier from day one.

## Did not break, or mattered less here

- **#16 short subagent windows start empty.** The copies were made in long main sessions (S04: 835
  calls, 2 subagents; S07: 831 calls, 1 subagent); subagents were reviewers, and they caught things.
- **#17 compaction drops a fetched entry.** G02-20 was read nine minutes before the copy with no
  compaction between; it was present and still lost.
- **#30 the session may die before writing.** Each solver wrote the lesson in the same commit
  (CLAUDE.md in `bb23851` one minute after 0039; S04's D04-06 in-session).
- **#9 empty at the start.** The needed entries were hours old and in the same project (0039 to
  0042 one day; 0027 to 0034 one day; S02 to S07 within an hour). Freshness bit (S03 vs S04), not
  emptiness.
- **#10 lookup overhead.** Four KS turns per phase against S04's ~231k cache-read tokens per call
  over 835 calls is about 0.5 % of that session.
- **#24 every rung paid.** No rung was climbed in any case; defects were found by reviews after.
- **#27 raw reasoning unavailable.** The write-ups were detailed (12c16f1 body, 0046 docstring,
  D04-06). What was missing was what the writer did not know (#29), not the raw chain.

## Tools used (read-only scans)

Node scripts in `sim/tools/` (`scan.js`, `sess.js`, `window.js`, `first-ts.js`) streamed the
transcripts line by line. FixFlow transcripts start in October 2026, so C1 to C3 and C5 rest on git
commits, docstrings and docs; C4 rests on the clinic transcripts and git.
