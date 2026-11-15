# L06 — Composite problems: the merge pathway, walked on real cases

Pathway family: a problem that needed two or more earlier lessons together (the owner's
"graphs where branches can be merged").

Design read against: the owner's ten-step design, and the existing store design
`KNOWLEDGE-STORE-DESIGN-2026-11.md` v1.3.1 ("KS" below, line numbers of that file). Where KS
has a mechanism for a step, the step is counted as working.

No fixes are proposed here. Limits only.

## 0. Sources and what could not be seen

- FixFlow git (EMS_workshop1): 4a40423, 37821f5, 370e83a, 8dafcec, c731e66, da988e2, 1c546a3,
  0a40416, 67218b1, d1f78cd, 834311f, 906b990. Docs: `docs/HANDOFF-2026-07-28-open-work.md`,
  `docs/lifecycle-audit-followups-2026-07.md`, `CLAUDE.md`,
  `backend/app/features/customer_messaging/service.py:469-482`.
- Clinic git (24_Clinic_Workshop): 402d192, fc119d3, 53906e6, c1fb346, 1546deb, 5437ba0, b356158,
  089d5fd. Task record `.claude/worktrees/admiring-shirley-aaa51b/docs/tasks/opening-cutoff-guards/task.md`.
- Clinic transcripts: root session `C--Bilal-Migration-...-24-Clinic-Workshop/7f348b2c-....jsonl`
  (model `claude-fable-5-1`), implementing session
  `...--claude-worktrees-kind-grothendieck-2e7379/97380a1e-....jsonl` (model `claude-opus-5-5`).
- **Not available:** the July/August FixFlow session transcripts. The earliest FixFlow transcripts
  under `~/.claude/projects` are dated 2026-10-29. So the windows for C1, C2 and C4 are
  reconstructed from commit bodies and the handoff, which say what each session was handed and
  what it did. The clinic windows (C3) are read from transcripts.

Case check: every quoted detail in the four given cases was found at its source. Two corrections
and additions:

- C1: the #162 work contains a separate commit, **37821f5** (2026-07-27, Opus 5, branch-only),
  "prefill the completion form so correcting a bill can't wipe it". KS itself calls it
  "37821f5 incomplete" (KS L197). Its prefill is the code that later held the hole.
- C2: the dispatcher was **built by Fable 5** on 2026-07-08 (d1f78cd, 834311f trailers), three
  weeks before #162/#163 made `bill_sent_at` the freeze key. Its commit claims "Claim-before-send:
  a crash leaves a visible 'pending', never a duplicate" and "so enable_dispatcher stays safe to
  flip". The handoff (§4.5 items 3 and 5; B1, B3) shows both claims false.
- C3: the divergent stock rule was **written by the root (Fable 5.1) in the brief**:
  "refused when its event time is before that item's standing stock opening's cutoff (the opening
  count's observation)" (7f348b2c L9742, 2026-11-05T15:25Z). The same brief says of cash: "the
  opening is the balance at the end of the cutoff day".
- C4: the earlier lesson is **0a40416** (2026-06-10, Opus 4.8): "5 consecutive failures lock for
  30s doubling to a 15min cap - always self-healing (one manager account; a hard lock would be a
  DoS gift)".

I split C1 into two moments (C1a = #162, C1b = #170), because each is a different merge.

---

## C1a — #162: four money-path patterns needed by a lifecycle bug

**What happened.** 4a40423 (2026-07-27): "Never one bug: three mobile faults and two backend
contract gaps composing into a closed cycle." And: "the codebase already contained the correct
pattern for every one of these — `try_claim`, `void_ledger_entry`, `useAttendance`,
`todayCache`. All were built for money paths and never generalised to lifecycle paths."

**Entry as the earlier solver could have written it** (from 67218b1, 2026-06-10, Opus 4.8; the
other three patterns were feature work, not fixes):

> Two technicians can both claim one job (silent steal). Cause: claim read nothing before
> writing the assignee. Fix: one atomic conditional UPDATE, WHERE unassigned-or-mine AND not
> closed; the loser gets 409 naming the holder; re-claiming your own job is an idempotent 200 and
> writes no second timeline event. Same family: log_payment's concurrent duplicate is caught by
> uq_job_payment_client at flush; roll back and return the job, as attendance punches do. Check:
> integration test with two concurrent claims. Handles: claim, steal, 409, race, idempotent.

**The later moment.** A technician's complaint, twice: the carry-in job "never left 'ongoing'"
and reopening it "re-demanded every photo even though the media was already in R2". No error
text. The window: CLAUDE.md and the complaint. The session was diagnosing, with no diff yet.

**What a lookup would return.** Keyed on the symptom ("ongoing", "photos", "re-demanded",
"carry-in"): nothing. The entry above speaks of claim, steal, 409. KS retrieval is lexical; "a
symptom with no word in common is a miss" (KS L522). Keyed on code: no `--diff` exists while
diagnosing. The four patterns become relevant only after the loop is split into five faults.

| Step | Status | Note |
| --- | --- | --- |
| 1 Window | strains | A field complaint, not a problem. It holds no error text and no hint that five faults compose. |
| 2 Trigger | breaks | No error, no failed gate. A cheap model fixes the visible fault (the `popToTop()` past Close) and stops. The real signal was the technician hitting it again. |
| 3 Query | breaks | Symptom words only. The useful entries are written in mechanism words (claim, punch, void, cache). |
| 4 Match | breaks | Miss. Each pattern sits in another slice; nothing names lifecycle. |
| 5 Delivery | not_reached | Nothing to deliver. Had all four matched, KS shows one lead and one candidate (L304). |
| 6 Use | not_reached | Had it arrived: `try_claim` became a transition table and migration 0043, not a copy. |
| 7 Check | breaks | "594 unit + 131 integration" were green. A red team found the freeze gaps the next morning (370e83a). |
| 8 Ladder | strains | The failure signal came from the field, twice. Nothing inside the cheap run would have climbed. |
| 9 Capture | breaks | The captured fix was half-right: 37821f5's prefill is where the later hole sat, and the freeze missed `bill_negotiated_paisa` (370e83a). |
| 10 Afterlife | breaks | The bill-freeze contract it created made the July-08 dispatcher wrong (C2, B2) in files the entry never touched. |

---

## C1b — #170 (8dafcec → da988e2): the #162 and #163 lessons together

**What happened.** da988e2: "C1 had THREE doors, not the one the handoff described." The third:
"done + offline — NOT in the handoff ... a blank form wipes a real bill. The #163 freeze only
catches this once the bill is sent/negotiated/paid." The first plan was wrong too: "three of the
first version's design choices were refuted and replaced, including its central claim that
same-id re-queueing is last-write-wins."

**Entries as the solvers could have written them:**

> **E2 (37821f5 + 4a40423, 2026-07-27, Opus 5).** Correcting a completion wipes the bill. The
> correction CTA opened a blank form. The server upsert replaces material lines and re-prices
> labour from the payload, so a blank submit destroys the bill. Fix: the screen loads the
> existing completion and prefills materials, time and remarks; labour from
> `labour_rate_paisa`; fuel only when `fuel_basis` is manual; a frozen bill is shown on open.
> Check: mobile suite (296). Handles: completion, correct, blank, prefill, wipe.

> **E3 (370e83a, 2026-07-28, Opus 5).** A replayed completion came back 409 and parked a landed
> write in the failed list. Cause: the #162 freeze turns a replay into a conflict, and phones
> send no `client_id`. Fix: a byte-identical resubmit is an idempotent success; the freeze also
> covers `bill_negotiated_paisa`; labour capped at 24h. Freeze = `bill_sent_at` set, negotiated
> set, or a non-voided payment; a manager may correct until close. Handles: freeze, 409, replay.

**The later moment.** The session was handed handoff C1 and C2 (it "Closes C1 and C2 from the
2026-07-28 handoff"). C1 named one door with file:line and said "The guard already exists in-repo
and was simply not applied here (`JobDetailScreen.tsx:201/:265`)". The session was planning a
mobile fix in `technician-app`.

**What a lookup would return.** Keyed on the handoff's words ("correct the completion",
"blank", "queued completion"): E2 as the lead-shaped hit and E3 as the candidate. That is two
cards, which fits KS's cap. Under KS's gate, E2's cause ("no prefill") is absent on HEAD, so it
reads `not_applies`. The real cause had moved inside E2's own fix: the prefill's
`catch { return; }`.

| Step | Status | Note |
| --- | --- | --- |
| 1 Window | works | A precise handoff item with file:line and the outbox mechanics. |
| 2 Trigger | works | KS `--prescription` covers a fix that a prose register prescribes (L446). |
| 3 Query | works | The handoff is in the solvers' own words, so lexical overlap with E2 and E3 is high. |
| 4 Match | breaks | Two partial entries come back. E2's fix is the code with the hole. The third part, outbox replace-by-id racing a live send, is in neither. |
| 5 Delivery | works | Two cards fit under 2,000 characters. KS is pull-only, into the window that asked. |
| 6 Use | breaks | Applying the prescribed `!pending` guard closes one route of four. Reading E3 as "the server guards a done job" leaves done+offline open. |
| 7 Check | breaks | "zero screen tests in 39 suites". The doors live in components no test asserts. KS: ex5 is lead-capable only via Jest ids after KS-6a. |
| 8 Ladder | breaks | Nothing fails. The wrong plan was caught by a red team before coding, not by a rung. |
| 9 Capture | works | KS ex5 (Jest ids on pure modules), with supersede for E2 and an open item for the stable-id race. |
| 10 Afterlife | breaks | CLAUDE.md: the outbox race is "UNFIXED"; the completion refusal depends on that defect existing. A fix to the race changes the entry's meaning in another file. |

---

## C2 — The WhatsApp dispatcher: three findings and #163 on one switch

**What happened.** Handoff B1 (unseeded cursor replays history), B2 (the automated send never
stamps `bill_sent_at`: "This reopens the exact carry-in loop #162/#163 closed, through the
automated path"), B3 (claim not durable). Fixed in c731e66 (branch-only), squashed as da988e2.
The review pass then found handoff §3 item 3: a rollback after Meta accepted leaves the row
pending, "and `bill_sent_at` is never stamped — B2 resurrected inside the error path that fixes
B2." Left open: "The resume-vs-double-send design decision is still open".

**Entry as the earlier solver could have written it** (d1f78cd + 834311f, 2026-07-08, Fable 5):

> `job_event` as a transactional outbox with a WhatsApp dispatcher. `seq` is gap-free;
> `run_dispatch_once` drains past a cursor in seq order and advances only past accepted events.
> `customer_message` UNIQUE(job_id, kind) is the idempotency guard. Claim-before-send: a crash
> leaves a visible 'pending', never a duplicate. Consent-gated, log-only while the Cloud settings
> are empty, so `enable_dispatcher` stays safe to flip. Check: integration tests; seq backfill
> rehearsed read-only on prod (56 rows). Handles: dispatcher, cursor, claim, outbox, whatsapp.

Every safety claim in it is false (handoff §4.5: "`jobs/models.py:229` 'gap-free global
ordering key ...' — false on both properties"; "the claim is flush-only, so it is not durable").

**The later moments.**
(a) Discovery, 2026-07-28: an Opus adversarial sweep of messaging/outbox/scheduler. No change
had touched the dispatcher; #163 had changed the meaning of `bill_sent_at` elsewhere.
(b) The fix, 2026-08-01/02: the session on `fix/mobile-completion-guards` had B1–B3 with their
"Fix:" lines and was writing 0046, the age cap, per-event commit and `log_customer_message`.

**What a lookup would return.** At (a): nothing triggers; no diff touches the dispatcher. At
(b), keyed on the prescriptions ("seed the cursor", "commit the claim before
`_post_cloud_api`", "mirror log_customer_message"): the Fable entry as the lead-shaped hit
(dispatcher, claim, cursor) and E3 as the candidate. The lead asserts the opposite of the
prescription. Neither says who stamps `bill_sent_at`.

| Step | Status | Note |
| --- | --- | --- |
| 1 Window | works | At (b): three register items with file:line and one-line fixes. |
| 2 Trigger | strains | `--prescription` exists for (b). Discovery (a) has no trigger: a contract changed in jobs; the dispatcher was untouched. |
| 3 Query | works | The prescriptions share words with the dispatcher entry and E3. |
| 4 Match | breaks | The top hit is a top-tier entry whose claims are false. Four parts (B1, B2, B3, #163) meet a two-card cap. |
| 5 Delivery | strains | Pull-only, 2,000 characters. At most two of the four parts arrive. |
| 6 Use | breaks | Each fix is right alone. Together they reopen B2 in the error path (§3 item 3). |
| 7 Check | breaks | A test "pinned the consent leak"; a dead-letter test "is named for a property it does not exercise"; nothing tests 0046 or the age guard (KS L524). |
| 8 Ladder | breaks | The error came from the top rung (Fable). A second Opus review pass found the seam. The last question went to the owner and is still open. |
| 9 Capture | strains | KS ex4 is seeded from da988e2 by patch-id (c731e66 is not on main). It stays candidate-only until a `db_probe` and an age-guard test exist (L281). |
| 10 Afterlife | strains | The operator flip on Railway is outside git; KS reaches it only by the `action` wording "enable dispatcher" (L263). A hand cursor reset has no lookup at all. |

---

## C3 — Clinic opening cutoff guards (G10-20): one rule across cash, pay and stock

**What happened.** The root's brief gave cash and pay "the balance at the end of the cutoff
day" and stock "the opening count's observation" (7f348b2c L9742, Fable 5.1). The implementing
session (Opus 5.5) built that (53906e6: "A stock opening is its opening count, observed when the
import posts"). Root gate round 1, two Opus refute-reviews: GC-01 (P1) "Same-day import double
count". The root's message gave a minute-by-minute sequence and two options: "(a) stock follows
cash and pay ... or (b) the smallest change". Option (a) was taken (c1fb346). Its re-review found
"three new P2s caused by the end-of-day rule" (task.md:63). The RR-2 hold then produced GD-01
(P1, "The RR-2 hold never ends"). Round 3 found GE-03: "the next count's period ... read the
reversal as a receipt of -10". A kernel gate later found a lock-order deadlock (b356158).

**Entries as the earlier solvers could have written them:**

> **E5 (S07/S09, cash).** A cash opening is the account's balance at the end of its cutoff day.
> Refuse any posting dated on or before the cutoff, after `lock_accounts`; database triggers
> repeat the rule. "One basis for everything: what was recorded by the end of the cutoff day."
> Handles: opening, cutoff, balance, end of day.

> **E6 (S05, G05-01).** A movement whose event is before a count's observation makes that count
> stale. Refuse such a posting rather than make the count stale. Handles: count, observation,
> stale, movement, event time.

**The later moment.** In the implementing window both rules sat in one tool call: "a cash
opening is the account's balance at the end of the cutoff day and a pay opening the employee's
unpaid pay at the end of it ...; a stock opening is its opening count, observed when the batch
posts" (97380a1e L1235, 2026-11-05T16:28Z). The model was writing the decision records for a
brief that had already chosen the stock rule.

**What a lookup would return.** Keyed on "stock opening cutoff, count, staleness" (the brief's
words): E6 as the lead and E5 as the candidate. Two rules for one word, "cutoff", that disagree
about the cutoff day. KS would not answer at all: it is a FixFlow store (F1 §9; title L1).

| Step | Status | Note |
| --- | --- | --- |
| 1 Window | strains | An 11,840-character brief from the top rung that already embeds the divergent rule. |
| 2 Trigger | breaks | A spec task with no failure. KS `--prescription` covers prose registers, not a root brief; and KS is single-project. |
| 3 Query | works | If asked, the brief's own words reach both entries. |
| 4 Match | breaks | Two partial entries that conflict on what "cutoff" means. The brief picked E6. |
| 5 Delivery | works | Both rules were already in the implementing window. Delivery was not the gap. |
| 6 Use | breaks | Holding both, the model kept them apart. Merging them needed new rules: no approval on the cutoff day, holds, and a set-aside after reversal. |
| 7 Check | breaks | "Root check: 7/7, 1990 passed"; "every stock test posts the day after" (root, GC-01). GE-03's "book ended right (+7)" hid a wrong period figure. |
| 8 Ladder | strains | Found by Opus reviewers; Fable "confirmed GC-01 in the code myself". The fix was a choice, (a) or (b): "Choose and record". |
| 9 Capture | breaks | Captured after GC-01, the rule "stock follows cash and pay" then produced RR-1..3, GD-01 and RS-1. No round was "solved". |
| 10 Afterlife | strains | b356158: the opening's lock order deadlocked with receipts in another module. Cross-project reuse: KS says nothing (F1 §9). |

---

## C4 — Login lock: the DoS lesson against the brute-force lesson

**What happened.** Handoff A2 (an Opus finding that "survived an adversarial verifier"):
"*Fix:* gate the lock on the **failure** path only, so a correct PIN clears it ... Two existing
tests pin the broken behaviour ... and must be inverted." 1c546a3 (2026-07-28, Opus 5) refused:
"to know a PIN is correct you must verify every PIN, which is exactly what stops the lock
throttling brute force", and "The owner chose to keep the lock and make recovery explicit
instead."

**Entries as the earlier solvers could have written them:**

> **E7 (0a40416, 2026-06-10, Opus 4.8).** Login lockout: 5 consecutive failures lock for 30 s,
> doubling to a 15-minute cap, always self-healing, because with one manager account a hard
> lock would be a DoS gift. The router commits before raising 401/429 so the counter survives.
> An in-memory per-IP window sits behind the DB lock. Check: counter-survives test; a correct
> PIN during a lock is refused. Handles: lock, PIN, 429, DoS, throttle.

> **E8 (handoff A2, 2026-07-28, Opus verifier).** An unauthenticated attacker holds every
> account locked: the roster is public, the lock is checked before `verify_pin`, and one wrong
> PIN per 900 s re-arms it. Fix: gate the lock on the failure path so a correct PIN clears it;
> add `unlock_account.py`; invert the two tests that pin the old behaviour.

**The later moment.** The session was handed handoff §7 item 3: "PR: identity lockout — A2
plus the lost-update row lock ... Budget time to invert the two tests that pin the broken
behaviour." The window held the prescription as the task.

**What a lookup would return.** Keyed on the prescription (`--prescription`, `doc_ref`
HANDOFF#A2): E8 itself, and E7 as the candidate. Both point at DoS. E7's "per-IP window behind
the DB lock" invites the exact false comfort 1c546a3 refuted: "only the 20-per-60s IP limiter
remains and a handful of IPs finish in under an hour." No do-not-apply entry exists yet: this
solve creates it.

| Step | Status | Note |
| --- | --- | --- |
| 1 Window | strains | The task is a prescription: it carries the wrong answer and tells the agent to invert two tests. |
| 2 Trigger | works | KS's `--prescription` route fires before applying a register fix (L446). |
| 3 Query | works | The prescription's wording, plus a `doc_ref` exact handle. |
| 4 Match | breaks | First time: E8 and E7 agree on DoS. The brute-force argument is in neither. |
| 5 Delivery | works | Two cards, pull-only. |
| 6 Use | breaks | The fix is easy to apply and does damage: a 4-digit PIN with no throttle. |
| 7 Check | breaks | Inverting the two tests, as told, turns the suite green. Nothing tests the throttle itself. |
| 8 Ladder | breaks | No failure, so no climb. An Opus implementer refused an Opus verifier; the owner made the final call. |
| 9 Capture | works | KS ex6: a do-not-apply entry with `doc_ref` to HANDOFF#A2 and protective test ids; owner-confirmed (L458). The commit body holds the full reasoning. |
| 10 Afterlife | works | The prohibition is printed and never withheld (L434); "the handoff still prescribes the wrong fix" (L197). KS admits a new login path in a new file escapes the protective test (L358). |

---

## Where the design breaks on this pathway (most clearly shown first)

1. **Two checked answers did not make a checked merge (known 14).** In all four cases the seam
   held a fact that neither parent entry held. C1b: done+offline wipes a bill the freeze does not
   yet cover. C2: B2's fix plus B3's fix leave a stuck pending row. C3: end-of-day plus count
   staleness gave a same-day double count, then RR-1..3. C4: E7 plus E8 gave a brute-force hole.
2. **Failure was seen only by a separate adversarial pass (known 23).** Tests were green each
   time: 594+131 (#162), 1990 (53906e6), a test that "pinned the consent leak", and two tests
   the prescription said to invert. Each failure was found by a red team or refute-review.
3. **"Equal to the strong model" had no fixed target (new).** In three cases the top-tier or
   verified answer was the wrong one. Fable 5 wrote the dispatcher's false claims; Fable 5.1's
   brief chose the stock rule behind GC-01; an Opus-verified fix (A2) was refused by another
   Opus session. The correction came from a role (adversarial reviewer), not a higher rung.
4. **Half-right entries would anchor the merge (known 8, 21).** 37821f5's prefill held the
   `catch { return; }`; 0a40416 said "always self-healing"; 834311f said "never a duplicate".
   Each would have told the cheap model the door was closed.
5. **A trade between lessons was settled by the owner, not a rung (new).** C4: "The owner chose
   to keep the lock". C2: "The resume-vs-double-send design decision is still open". C3: "Choose
   and record: (a) ... or (b)", and the rules are "PROPOSED engineering defaults".
6. **No capture point was "solved" (known 26).** #162 was revised in 9 hours (370e83a) and again
   in 3 days (8dafcec). c731e66 left §3 item 3 open. GC-01's fix spawned five more findings.
7. **The parts were known only after diagnosis (known 6, 2).** C1a's symptom shares no word with
   the claim, punch, void and cache entries. C2's B2 had no symptom at all.
8. **"Either/or" looked like "both" (known 13).** C3: two stored rules for one word, "cutoff".
   C4: E7 and E8 looked complementary; E8 removed the throttle that E7 existed for.
9. **The answer channel holds two cards (new).** KS shows "at most one lead and one candidate"
   in 2,000 characters (L304). C1a needed four patterns; C2 needed B1, B2, B3 and #163.
10. **A later fix changed an older entry's truth in files it never touched (new; KS L358 admits
    "semantic changes outside the footprint").** #163 made `bill_sent_at` the freeze key; the
    dispatcher, built 07-08, never stamps it. b356158: the opening's lock order deadlocked with
    receipts in another module.
11. **The entries share no node to join on (known 15).** Joining `try_claim` (claims) to
    lifecycle transitions is an analogy across slices. KS joins only on a shared `root_cause_id`
    (L239).
12. **The writer could not know which details mattered (known 29).** The handoff named one door
    of four. 834311f's "claim-before-send" left out the deciding detail: the claim is flush-only.

## Did not break, or mattered less here

- **9 (empty at the start).** In C1a the needed patterns existed six to seven weeks earlier
  (67218b1 on 2026-06-10, useAttendance 1ff4062 on 2026-06-04). The store would not have been
  empty. Matching failed, not coverage.
- **17 (compaction drops a fetched entry).** In C3 both rules sat in one tool call of the
  implementing window (97380a1e L1235), and the divergence happened anyway. Retention was not
  the cause.
- **25 (the hand-up is a polluted window or the failing model's brief).** In C3 the hand-up was
  the reviewer's brief: a timed sequence and two options. Its fix held at re-review ("GC-01,
  GC-02 and GC-08 hold").
- **27 (only an after-the-fact write-up).** In C4 the write-up carries the deciding argument
  word for word. The do-not-apply entry needs nothing more.

## What works, and what it would have saved

- **C4, after the first solve.** KS ex6 (do-not-apply, `doc_ref` HANDOFF#A2, prohibition never
  withheld) stops any later agent who picks up the still-wrong A2 prescription before code is
  written. Saved: one PR that inverts two tests and ships an unthrottled 4-digit PIN. CLAUDE.md
  already carries the same warning, so the store matches that incumbent rather than beating it.
- **C2, after the fix.** `--action "enable dispatcher"` reaches ex4 (KS L263). Saved: the
  history replay CLAUDE.md measured at "36 real messages about months-old jobs", plus permanent
  `suppressed` rows. Only when an agent is asked to flip it; candidate-only until a `db_probe`
  exists.
- **C1b, after #170.** The guards became pure modules (`completionPrefill.ts`,
  `wizardState.ts`) with Jest tests. Via `--diff` ident handles, a later "simplify" gets a warning
  and a failing test. Saved: a blank form wiping a real bill, and the loop reopening.
- **Capture material.** 4a40423, 370e83a, da988e2 and 1c546a3 are full write-ups at solve time,
  with mechanism, numbers and ruled-out options. KS's write-through-at-solving-time rule has
  good material in every FixFlow case.
- **Lexical match on the solvers' own words.** In C1b and C4 the later problem arrived phrased
  by the same writers, so KS's lexical retrieval found the right neighbours.

Note on cost (no saving claimed): every FixFlow fix here is in an area KS reserves to Opus
("the outbox, migrations, auth, PIN, money, the job lifecycle", L444). Under KS the cheap model
never applies these fixes; "the store has saved the diagnosis, not the whole solve".
