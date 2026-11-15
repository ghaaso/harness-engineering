# L02 — Silent defect, found later: six cases walked through the library design

Pathway family: work that passed its checks when built and was found wrong later by an audit, a review, a red-team or a person in production.

Scope of this walk. Five cases from the brief (C1 to C5), checked against their sources, plus one of my own (C6) to widen the spread. The six differ in who found the defect (a technician in production, an adversarial audit, a red-team of a fix, an owner decision against an audit, a root gate over three rounds, a red-team the next day), in project (FixFlow and the clinic), in runtime (FastAPI backend, React Native, Django), in author (Opus 4.8, Opus 5, Opus 5.5, Fable 5) and in where the harm lands (a code path, an operator action, a test suite, a ledger).

Limits of the evidence. The July FixFlow session transcripts are not on this machine (the FixFlow project folders hold sessions from 2026-10-28 on). For C1 to C4 and C6 the "later moment" is rebuilt from commit messages and the HANDOFF, not from a window. For C5 the transcript exists and is quoted with line numbers.

Design mechanisms counted as working come from `KNOWLEDGE-STORE-DESIGN-2026-11.md` (KS, line numbers of that file).

---

## C1 — A queued `ready` could reopen a settled, billed job

**Checked sources.** `187ebb1` (2026-06-07, Co-Authored-By Claude Opus 4.8) built `/transition`. `383dea7` (2026-07-12, Claude Fable 5) wired the bill sheet: "WhatsApp: consent-gated preview → wa.me open → send-log witnessed on the timeline, then back to the dashboard". `4a40423` (#162) names that as a cause: "The bill sheet's WhatsApp and Done CTAs `popToTop()`ed past the only Close button". `f440222`: "`transition()` previously dispatched on the action alone and never read the current status". `ef90ccf` (next day): "#162's bill freeze is the first thing in this codebase that can turn a *replay* into a conflict". HANDOFF line 317 (B2): "This reopens the exact carry-in loop #162/#163 closed, through the automated path."

**Entry as the solver could have written it (187ebb1, Opus 4.8).**
> Job lifecycle, persistent (J2a). Need: job status that survives sessions, with an audit trail. Solution: append-only `job_event` (id, job_id, kind, text, actor, created_at), indexed (job_id, created_at); the row holds current state, events are the trail. `POST /jobs/{id}/transition`, action ∈ ready | close | abandon | reschedule | haul: each action updates the job and appends an event; actor = the token's tech_id; abandon without a reason → 400; create_job seeds a `create` event. Traps met: `JobEvent.text` shadowed `sqlalchemy.text`; a repo `list()` shadowed builtin `list`. Check: 7 service units (one per transition), 4 router, 2 real-DB integration; 94 passed.

**The later moment as the model saw it.** 2026-07-12, a Fable 5 session is told to wire the bill sheet. Its window holds the brief, CLAUDE.md and the bill-sheet files. It is doing UI and outbox work. Nothing is failing. Fifteen days later a technician reports a carry-in job that "never left 'ongoing'" (4a40423). The Opus 5 root-cause session has a user story in its window, not an error.

**What a lookup would return.** At 383dea7, keyed on "bill sheet", "WhatsApp send", "dashboard": payment and outbox entries, nothing about status. Keyed on "transition" or "ready": the J2a entry above, which carries the defect. Keyed on "replay" or "idempotent": `try_claim` and the payment entries, filed under money words. At the root-cause session, keyed on "job stays ongoing", "wizard restarts": a miss.

| Step | Status | Note |
| --- | --- | --- |
| 1 Task | strains | The Fable session got "wire the bill sheet", a task. Nothing in its window says a CTA can strand a job's lifecycle. |
| 2 Trigger | breaks | Tests were green at 187ebb1 and at 383dea7. Nothing failed, so nothing asks. The first signal was a person in production, weeks later. |
| 3 Query | breaks | Any query names the task (bill sheet, send, dashboard), not the hazard (a `ready` replayed after `close`). |
| 4 Match | breaks | "transition"/"ready" match the J2a entry, which is the defect. The correct pattern, `try_claim`, is filed under money words and does not match: the lifecycle audit's own framing is "built for a money path and never generalised". |
| 5 Delivery | not_specified | The design does not say whether the entry goes to the session or to a subagent writing one screen. |
| 6 Use | breaks | Adapting J2a reproduces "dispatch on the action alone". Nothing in the entry says to read the current status. |
| 7 Check | breaks | J2a's checks test each transition from one state. The 42-case every-action-from-every-status matrix arrived only with the fix (f440222). The stored check passes the copy. |
| 8 Ladder | breaks | No model failed. A technician noticed. There is nothing to hand up to Opus or Fable, and the failing parts were written by Opus 4.8 and Fable 5. |
| 9 Capture | strains | f440222 is a hard solve and would be stored (KS L452). It was half-right: the next day ef90ccf found its freeze parked landed writes as 409s for phones that send no `client_id`. KS records before PR-ready, so the half-right version is the one stored. |
| 10 Afterlife | breaks | B2: the dispatcher handler (2026-07-08) predates the freeze and never stamps `bill_sent_at`. A new entry does not look back at code already written; KS `--diff` reads changed lines only (L447). An audit found it. |

---

## C2 — The evidence gate was satisfied with zero bytes

**Checked sources.** `ca362c0` (2026-06-06, Opus 4.8) added `head_size`. Its docstring: "A missing object or transient error returns ``None`` so the caller can fall back." `2cf95b8` (2026-06-11, Fable 5) hardened media and wrote that "the closing-video gate counts rows by exactly that key", without seeing the no-bytes path. `aa4f589` (2026-07-28, Opus 5): "`head_size()` swallowed every exception and returned None". `bee11dc`: "the selfie finalize is the second head_size caller … Caught by an adversarial re-read of the landed diff, not by the suite". HANDOFF line 205: "Commit 1 was reviewed, tested, and pushed with only the caller I was thinking about fixed."

**Entry as the solver could have written it (ca362c0, Opus 4.8).**
> Upload size ceiling for R2 pre-signed PUTs. Problem: a pre-signed PUT cannot cap Content-Length, and a client can under-report `size_bytes` to slip a large file past `r2_max_upload_bytes`. Solution: at finalize (`complete_upload`, `complete_selfie`) read the object's real size with a HEAD (`StorageClient.head_size`) and reject and purge anything over the ceiling. A missing object or a transient error returns None so the caller can fall back to the client's reported size; log a warning. Check: unit tests "real size over client report" ×2; suite green (62).

**The later moment.** 2026-06-11: a Fable 5 session hardens media uploads. It reasons about who may reserve rows and that the close gate counts rows. 2026-07-28: an adversarial audit of "the slices the lifecycle sweeps never covered" walks `POST media → 201`, never PUTs, `complete {}` → `uploaded`. The same day, the fixing session changes the Protocol and pushes with one caller fixed.

**What a lookup would return.** At 2cf95b8, keyed on "upload", "R2", "size", "finalize": the ca362c0 entry, an exact same-problem match. Its rule "missing → None → fall back" is the hole. At bee11dc, keyed on `head_size`: nothing yet (the fix entry is written after the PR).

| Step | Status | Note |
| --- | --- | --- |
| 1 Task | strains | "Harden media uploads" is a task. The integrity of the evidence gate is not named in it. |
| 2 Trigger | breaks | The fixture defaults `head_size → None`; the suite is green. Nothing fails, so nothing looks up. |
| 3 Query | works | The task's own words ("upload", "size", "R2") find the entry. That is the problem: retrieval works and delivers the defect. |
| 4 Match | breaks | Same problem, exact match, wrong answer. The stored reasoning states the conflation as the design. |
| 5 Delivery | not_specified | Not said. |
| 6 Use | breaks | The cheap model copies "fall back on None", which the entry calls safe. |
| 7 Check | breaks | HANDOFF §6 item 4: "the 'no bytes' case was the tested default and nothing asserted existence". The stored check certifies the copy. |
| 8 Ladder | breaks | No visible failure for 52 days. Found by an audit, not by a failing model; nothing climbs. |
| 9 Capture | strains | aa4f589's rule ("None means UNKNOWN, never zero") is a good entry. Captured at commit 1 it would omit the selfie caller that bee11dc found an hour later. |
| 10 Afterlife | strains | KS `ident` handle `head_size` would fire on later diffs to that symbol (works). The same shape in other words, a mobile bare `catch` (C6), is a lexical miss (KS L522). |

---

## C3 — A dispatcher with an unseeded cursor would message every old job

**Checked sources.** `d1f78cd` and `834311f` (2026-07-08, both Claude Fable 5). 834311f: "consent-gated per send, log-only while the Cloud settings are empty, so enable_dispatcher stays safe to flip." `8ce9530` (Fable 5) added the dead-letter path. HANDOFF B1: "`dispatch_cursor` is never seeded, and `run_dispatch_once` mints it at `last_seq=0`." HANDOFF §3 item 2: the dead-letter guard "was aimed at a statement that cannot raise"; "the sibling test above it raises `RuntimeError`, which never poisons anything". CLAUDE.md: "measured at 36 real messages about months-old jobs". KS L281: "nothing in the suite tests the 0046 seed or the age guard".

**Entry as the solver could have written it (d1f78cd + 834311f, Fable 5).**
> Customer messages through a transactional outbox. `job_event` gains a gap-free global `seq` (backfill rehearsed read-only on prod: 56 rows) and a JSONB payload. `dispatch_cursor` per consumer; `run_dispatch_once` drains events past the cursor in seq order and advances only past accepted events; a failure halts the batch. WhatsApp consumer: create→intake_ack, complete→bill, ready→ready; consent-gated; log-only while Cloud settings are empty, so `enable_dispatcher` stays safe to flip. `UNIQUE(job_id, kind)` is the idempotency guard; claim-before-send: a crash leaves `pending`, never a duplicate.

**The later moment.** The dangerous moment is not a model task. It is one Railway variables edit (HANDOFF B1). The defect was found by an audit reading code on 2026-07-28. On 2026-08-01 a review of the fix branch found three more silent defects inside the dispatcher work.

**What a lookup would return.** Keyed on "enable dispatcher" (KS `action` handle, L263): before 2026-08-02, this entry, saying it is safe. After c731e66: the hardened entry with the seed and the age guard.

| Step | Status | Note |
| --- | --- | --- |
| 1 Task | strains | "Turn on WhatsApp Cloud sending" is an operator change with no code. The owner's design speaks of problems a model solves. |
| 2 Trigger | strains | Nothing fails before the flip; the flip is the failure. KS has a route (`--action`, L263) but the owner's design names none. |
| 3 Query | works | "Enable dispatcher" is the entry's own phrase. It matches. |
| 4 Match | breaks | It returns Fable's conclusion "stays safe to flip". A stored reassurance at the one moment it can do harm. |
| 5 Delivery | not_specified | Not said. |
| 6 Use | breaks | Acting on the entry sends the whole history: 36 real messages about months-old jobs, and suppressed rows that are permanent (`uq_customer_message_job_kind`). |
| 7 Check | breaks | No check can say "safe to flip": nothing tested the seed or the age guard. The 2026-08-01 review found a test that "pinned the consent leak" and a dead-letter test "named for a property it does not exercise". |
| 8 Ladder | breaks | The author was Fable 5, the top rung. There is nowhere higher to send it; Opus 5 audits found it. |
| 9 Capture | strains | c731e66 would be stored. But the 2026-08-01 review found three defects inside the fix branch (dead-letter guard, consent test, a downgrade that deletes a live cursor) before merge. Which version is "solved" is the reviewer's call, not the solver's. |
| 10 Afterlife | works | After the fix, KS's `action` handle is the stated only route to an operator hazard (env flip, cursor reset, snapshot restore, L263). It would reach the next operator. Saves a mass-message incident. |

---

## C4 — Login lockout: the tests pinned a "defect" and the prescribed fix was worse

**Checked sources.** `0a40416` (2026-06-10, Opus 4.8): "5 consecutive failures lock for 30s doubling to a 15min cap - always self-healing (one manager account; a hard lock would be a DoS gift)." HANDOFF A2 (still in the file today, lines 243–246): "*Fix:* gate the lock on the **failure** path only … **Two existing tests pin the broken behaviour** … must be inverted." `f3dfa6f` (2026-07-28, Opus 5): "NOT the fix the handoff prescribed — … the prescribed one traded a DoS for a much worse brute-force hole"; the two tests "are NOT inverted". Same day `9b98c88`: "the handoff prescribed `scope['route'].path` — that does not exist", and "the 'grows without bound → OOM' claim does not hold". HANDOFF header: everything "survived an adversarial verifier whose default verdict was REFUTED".

**Entry as the solver could have written it (0a40416, Opus 4.8).**
> Login lockout for name/PIN login. `failed_attempts` and `locked_until` on the technician row; 5 consecutive failures lock 30 s, doubling to a 15-minute cap, always self-healing (one manager account; a hard lock would be a DoS gift). The lock is checked before `verify_pin`. The router commits before raising 401/429 so the counter survives the error. 429 carries Retry-After. An in-memory per-IP window sits behind the DB lock. PIN rotation does not bump `token_version` (the APK outbox drops queued writes on 401). Check: counter-persistence regression test; a correct PIN during a lock returns 429.

**The later moment.** 2026-07-28. An Opus 5 session has HANDOFF A2 in its window: a file:line finding, a prescribed fix and two tests to invert, all marked adversarially verified. It is asked to fix A2. It refutes the prescription; the owner chooses to keep the lock.

**What a lookup would return.** Keyed on "lockout", "correct PIN", "429": the 0a40416 entry ("self-healing", so DoS is handled — wrong), and, if the audit was captured, the A2 entry with its prescription. Neither holds the brute-force argument. After f3dfa6f: a do-not-apply entry (KS ex6).

| Step | Status | Note |
| --- | --- | --- |
| 1 Task | works | "Fix A2" is a stated problem with file and line. Here the task is a problem. |
| 2 Trigger | works | Applying a fix a prose register prescribes is a KS lookup trigger (`--prescription`, L446). |
| 3 Query | works | The words line up: lock, correct PIN, 429. |
| 4 Match | breaks | Before f3dfa6f both hits are wrong: Opus 4.8's "self-healing" claim and the audit's prescription. Each comes from a strong model and passed its own check. |
| 5 Delivery | not_specified | Not said. |
| 6 Use | breaks | A cheap model applying A2 inverts two tests and opens 4-digit PIN brute force: "a handful of IPs finish in under an hour" (f3dfa6f). |
| 7 Check | breaks | The inverted tests pass. Three strong outputs, two positions: Opus 4.8's lock, the audit's fix, Opus 5's refutation. Only an owner decision settled it. "Equal to the strong model" has no single target. |
| 8 Ladder | breaks | The wrong fix is silent too. The audit was already a strong-model product; climbing reaches the same tier that wrote it. |
| 9 Capture | works | f3dfa6f is a model capture: the reason, the owner decision, comments on the two tests. KS stores it as do-not-apply with owner confirmation (L458). |
| 10 Afterlife | works | KS `doc_ref` on HANDOFF#A2 stops the next agent (L262, L446); CLAUDE.md already says "do not 'fix' this". The clinic's own probe expects a correct password refused while locked: the rule held in the other project. |

---

## C5 — Clinic opening cutoffs: each round "passed" and the next round found it wrong

**Checked sources (clinic repo).** S10 merged `b573e73` (2026-11-05) with G10-02 carried as a recorded gap. The follow-up "opening cutoff guards" ran in one session, `97380a1e-e421-4c64-8597-48b3c3f6cd60.jsonl` (worktree `kind-grothendieck-2e7379`, model `claude-opus-5-5`). Its own Opus review, `evidence/review-opus.md` R1-2: "A delivery on the cutoff day itself was accepted, although cash treats the cutoff as the end of that day", fixed by assuming "With the import posted the day after the cutoff". Root round 1 (`task.md` line 49): "GC-01 (P1) same-day import double count". Round 2: "GD-01 (P1) the hold never released", a defect the round-1 fix created. Round 3, `clinic-build/task.md` line 643: "GE-03 was real". S10 decision record D10-13: "The earlier rule (no posting on or before the cutoff) let a close or a later posting already counted by S07 be counted again."

**Entry as the solver could have written it (the cutoff-guards session, after its own Opus review, about 16:50 UTC on 5 November).**
> Opening cutoff guards (G10-20). One registry, `clinic.operations.cutoffs`, readers per subject (cash_account, employee, item); `operations` imports nothing from `imports`. Cash: the opening is the balance at the end of the cutoff day; refuse postings dated on or before it, after `lock_accounts`. Pay: refuse accruals for periods starting on or before it; no period runs across it. Stock: the opening is its count, observed when the batch posts; refuse events before the day of observation; with the import posted the day after the cutoff, that is "on or before", as for cash. A delivery on the cutoff day checked in after the count is after it. Check: `test_cutoff_*.py` green; R1-1 to R1-3 fixed.

**The later moment, from the transcript.** Line 793 (16:13 UTC) is the session writing the test that pins the defect: "# Delivered on the cutoff day and checked in after the opening count: after it." The window compacts two minutes later (line 846). At line 2101 (20:07 UTC) the root's cross-session message arrives: "GC-01 (P1) Same-day import double count … every stock test posts the day after." The window just before was 366,229 tokens (line 2097). It compacts at once (lines 2113–2117); the next call reads 87,658 tokens (line 2146). The session compacts three times in all, each time near 366k.

**What a lookup would return.** Keyed on "cutoff", "opening", "stock", "double count": the session's own entry above (half-right), and S10's D10-13 "the earlier rule (no posting on or before the cutoff) … counted again" — a "no" for the opening's side that G10-20 needs as a "yes" on the other modules' side.

| Step | Status | Note |
| --- | --- | --- |
| 1 Task | strains | G10-20 is a stated gap, a problem. Whether stock follows cash on the cutoff day was not known to be a question until GC-01 asked it. |
| 2 Trigger | breaks | The session's tests and its own Opus review passed. Nothing failed until a separate root review, three times. |
| 3 Query | strains | Good words exist ("cutoff", "double count"). The deciding detail, an import posted on the count day, is in no query. |
| 4 Match | breaks | Returns D10-13's refuted cutoff rule (a "no" for one direction) or the half-right stock rule. "Either/or" between two rules that are both right, on different sides. |
| 5 Delivery | strains | The finding arrived at 366k and the window compacted in the next turn. A fetched entry rides into a summary. KS is pull-only and says nothing about after compaction. |
| 6 Use | strains | The round-1 fix added a hold; round 2 found it "never released" (GD-01 P1). Adapting a rule to new state made a new P1. |
| 7 Check | breaks | Two Opus reviews read the same code and disagreed (R1-2 passed it, GC-01 failed it). The in-session test asserted the double count as correct. |
| 8 Ladder | breaks | All work was Opus 5.5; the "ladder" in practice was a root review per round. Nothing failed visibly, so nothing escalated by itself. |
| 9 Capture | breaks | Which version is the entry: after the own review (half-right), after round 1 (contains GD-01), after round 2 (contains GE-03)? Each passed its checks. The reasoning behind the first rule was compacted before GC-01 arrived. |
| 10 Afterlife | works | The final rule ("the position at the end of the cutoff day, for cash, pay and stock alike", D10-40) carried into the 2026-11-10 real-data switch unchanged (`real-data-switch/task.md` line 36). A stable entry reused without re-derivation. |

---

## C6 (added) — The fix's own correction form bailed on a bare `catch`

**Checked sources.** `f440222` (2026-07-27 16:57, Opus 5) wrote, for `JobDetail.evidence`: "None means 'unknown', so a client falls back to local state". `37821f5` (17:50 the same day, Opus 5, same PR #162):

```
} catch {
  return; // offline — a blank first completion is still valid
}
```

HANDOFF §4.3 C1: "The guard already exists in-repo and was simply not applied here (`JobDetailScreen.tsx:201/:265`)." `da988e2` (fix 8dafcec): "C1 had THREE doors, not the one the handoff described", plus a fourth route.

**Entry as the solver could have written it (37821f5, Opus 5).**
> Completion correction form must not wipe a bill. Problem: "correct the completion" opened a blank form, and the server upsert replaces materials and re-prices labour from the payload, so a blank submit destroys the bill. Solution: load the existing completion and prefill materials, time and remarks; price labour from the server-pinned `labour_rate_paisa`; prefill fuel only when `fuel_basis` is manual; say a submit replaces what is there; show the freeze on open. If the fetch fails, return: offline, a blank first completion is still valid. Check: mobile Jest suite green.

**The later moment.** 2026-07-28, the red-team of #162 (HANDOFF: "18 from the #162 red-team") finds the blank form can replace a queued real completion offline. 2026-07-30, the fixing session finds more doors than the audit named.

**What a lookup would return.** Keyed on "prefill", "offline", "completion form": the 37821f5 entry with its bare-catch rule. The "None means unknown" entry from 53 minutes earlier shares no key words with it.

| Step | Status | Note |
| --- | --- | --- |
| 1 Task | works | It was a stated problem: a blank form wipes a bill. |
| 2 Trigger | breaks | Jest green; nothing fails. CLAUDE.md: "this app has no screen-test harness". |
| 3 Query | strains | A query would say "prefill", "offline". The governing rule is worded "evidence", "media counts", "None". |
| 4 Match | breaks | The right rule exists and does not match; the same author wrote it 53 minutes earlier. |
| 5 Delivery | not_specified | Not said. |
| 6 Use | breaks | The comment states the conflation outright. A fresh, self-written rule did not stop it, so a fetched entry is a weaker reminder still. |
| 7 Check | breaks | No screen test exists; logic inside the component is asserted by nothing. |
| 8 Ladder | breaks | Found by a red-team a day later. No model failed. |
| 9 Capture | strains | 8dafcec found three doors where the audit named one. An entry written from the audit would be incomplete. |
| 10 Afterlife | works | The rule now lives as a pure function (`completionPrefill.ts`) with tests, and in CLAUDE.md. KS `ident` handles on it would fire on later diffs. |

---

## Breaks, clearest first

1. **No failure, no lookup, no ladder.** (seen before: 1, 23; 6 cases) Every defect passed its checks. Nothing failed inside a session, so no trigger fired and nothing climbed. Detection came from outside: a technician (C1), audits (C2, C3), an owner decision (C4), a root review (C5), a red-team (C6).
2. **"Equal to the strong model" is the wrong target here.** (new; 6 cases) Every defect was written by a top-tier model: Opus 4.8 (C1, C2, C4), Fable 5 (C1, C3), Opus 5 (C6), Opus 5.5 (C5). An output equal to the strong model's reproduces the defect. In C4 three strong outputs held two positions; only the owner settled it.
3. **The stored entry is the defect, with its reasoning.** (seen before: 8, 21; 6 cases) "A missing object or transient error returns None so the caller can fall back" (ca362c0). "enable_dispatcher stays safe to flip" (834311f). At an operator action (C3) the match returns a reassurance.
4. **The entry's own check certifies the defect.** (new, related to 22; 3 cases) C2's fixture default was the fraud path. C3 had a test that "pinned the consent leak". C5's test said a same-day delivery "is after it". A stored check passes a faithful copy.
5. **"Solved" moves after capture; the fix is half-right.** (seen before: 26, 8; 5 cases) ef90ccf the next day (C1); the selfie caller an hour later (C2); three defects inside the fix branch (C3); GC-01, GD-01, GE-03 across rounds (C5); three doors, not one (C6).
6. **The ladder's order is wrong for silent defects.** (new; 3 cases) Fable 5 wrote C3's dispatcher and dead-letter path, part of C1, and reviewed C2's media without seeing the hole. Opus 5 audits with fresh windows found them. Higher was not more right; nothing climbs.
7. **Same mechanism in other words is a miss; same words can be another mechanism.** (seen before: 2, 3; 3 cases) `try_claim` (money) vs transitions (C1). "None means unknown" vs a bare `catch` (C6). The mobile dead-letter (5609001) shares words with the backend one, where failure surfaces at commit and a rollback expires the identity map (C3).
8. **A new entry does not reach code already written.** (new; 2 cases) The freeze (f440222) made the older dispatcher handler wrong (B2). The `head_size` failure-mode change made the existing selfie caller a 500 (bee11dc). Lookups fire on new work; KS `--diff` reads changed lines (L447).
9. **Recognition, not retrieval.** (new; 1 case) The same model wrote "None means unknown" at 16:57 and a bare `catch` treating offline as "no completion" at 17:50, in the same PR. Having the rule fresh in hand did not make it see the new site as an instance.
10. **Adversarially verified audit findings carry wrong prescriptions.** (seen before: 8, 21; 2 cases) A2's prescribed fix opens PIN brute force; A6 named an attribute "that does not exist"; a severity claim "does not hold" (9b98c88). The audit described one door where there were three (C6).
11. **Capture happens in a compacting window.** (seen before: 17, 27, 30; 1 case) C5's session wrote the pinning test at 16:13 and compacted at 16:15. GC-01 arrived at 366,229 tokens and the next call read 87,658. Three compactions in one session.
12. **A stored "no" or "clean" reads wider than it was.** (seen before: 19, 13; 2 cases) D10-13 refuted a cutoff rule on the opening's side; G10-20 needed it on the other modules' side (C5). HANDOFF §8 (line 611) lists "webhook signature verification" as verified clean, "do not re-audit without cause", while §4.4 (line 389) lists a signature-header 500 (C4's sibling).

## Did not break, or mattered less

- **9, empty at the start.** In all six cases an empty library would have done less harm than a full one. The entries that would have existed were the defects.
- **16, short subagent windows start empty.** Fresh windows found every defect: the red-team, the audits, the adversarial re-read in bee11dc, the root's refute-reviews. Here an empty window was an asset.
- **24, hard problems pay every rung.** No case climbed. Nothing failed visibly, so the rung costs never arose.
- **34, a rule in one project is a bug in another.** The clinic's security probe expects "correct password … expected refused (locked)": FixFlow's lock rule held there. Only its reason (a 4-digit PIN) does not carry to passwords.
- **10, lookup overhead.** Never the binding cost. No lookup fired in the silent phase.

## Where the design would have helped

- **C4, after f3dfa6f.** HANDOFF A2 still prescribes the wrong fix. A do-not-apply entry reached by `doc_ref` or `--prescription` stops the next agent. Saves a brute-force hole and a review round. CLAUDE.md already does this.
- **C3, after c731e66.** The `action` handle ("enable dispatcher", "reset cursor", "restore snapshot") is the one route to an operator hazard. Saves a mass-message incident with permanent suppression rows.
- **C1, after ef90ccf.** "A replay of an identical body is an idempotent success; deployed phones send no `client_id`" saves the next freeze-builder a red-team round.
- **C2 and C6, after the fix.** `ident` handles on `head_size` and the prefill guard fire on later diffs to those symbols. Saves a 500 regression or a reopened bill-wipe. CI tests pin both too.
- **C5, after round 3.** The final cutoff rule was reused unchanged by the 2026-11-10 real-data switch. Saves a re-derivation in a fresh session.

In every case the design helps only after the defect is found. Before that it stores and serves the defect.
