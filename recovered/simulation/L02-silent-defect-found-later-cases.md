# L02 Silent defect, found later: real cases (facts only)

FixFlow repo = C:/Users/User/Documents/projects/EMS_workshop1 (FF). Clinic repo = C:/Bilal_Migration/User/Downloads/20_PROJECTS/24_Clinic_Workshop (CL).
FF fix commits carry the trailer Co-Authored-By Claude Opus 5. The record read does not name the model that wrote the original faulty code.

## Case 1. A queued "ready" could reopen a settled, billed job (carry-in loop)
- Landed: transition() in the job lifecycle, commit 187ebb1 (2026-06-07); mobile completion flow 383dea7 (2026-07-12). Tests were green.
- Found: 2026-07-27, root-cause pass on the carry-in loop. Fixed in f440222 (migration 0043), PR #162 (4a40423).
- What happened: a carry-in job could never leave "ongoing". POST /completion wrote the bill and never touched status; the job reappeared, the wizard restarted, and "each lap silently rewrote the bill down to zero materials and ~2 minutes of labour".
- Evidence (f440222 message): "`transition()` previously dispatched on the action alone and never read the current status, so a queued `ready` replayed after a close silently REOPENED a settled, billed, paid job".
- Evidence (FF docs/lifecycle-audit-followups-2026-07.md, intro): "for each class the codebase already contains a correct implementation, built for a money path and never generalised."
- Evidence (FF docs/HANDOFF-2026-07-28-open-work.md section 6, item 1): "Before writing a new guard, grep for the one that already exists."
- Later moments:
  - 2026-07-28, ef90ccf (PR #163): a red-team of #162 found the new freeze "is the first thing in this codebase that can turn a *replay* into a conflict"; deployed phones send no client_id, so a landed completion was parked in the failed list. Fixed by byte-identical payload equality.
  - 2026-08-01, HANDOFF section 4.2 B2: "The automated Cloud API bill send never stamps `bill_sent_at` ... This reopens the exact carry-in loop #162/#163 closed, through the automated path." (Also CLAUDE.md dispatcher invariants.)

## Case 2. Evidence gate satisfied with zero bytes (media head_size)
- Landed: head_size swallowing every exception, ca362c0 (2026-06-06, "hardening from the pre-Jobs audit"); upload hardening and evidence freeze 2cf95b8 (2026-06-11); the close gate counts the row.
- Found: 2026-07-28 by "an adversarial audit of the slices the lifecycle sweeps never covered". Fixed aa4f589, merged 013a86b (PR #164).
- Evidence (aa4f589): "A technician with an ordinary token could satisfy the closing-handover video gate without shooting anything: POST /api/jobs/{id}/media -> 201 ... (never PUT the bytes) ... /complete {} -> 200, status='uploaded'". "`head_size()` swallowed every exception and returned None, so 'the object does not exist' and 'R2 was unreachable' arrived at the caller as the same answer."
- Evidence (aa4f589): the evidence-gaps report "only flags a phase where NOTHING was uploaded -- so total=1/uploaded=1 reads clean."
- Evidence (HANDOFF section 6, item 4): "The media fixture defaults `head_size -> None`, which *was* the fraud path -- the 'no bytes' case was the tested default and nothing asserted existence."
- Later moment: the rule "None means unknown, not zero" is in CLAUDE.md for `JobDetail.evidence`, and aa4f589 applies it again to `size_bytes` on a replayed finalize. The mobile guard has the same shape: CLAUDE.md says "A bare `catch { return; }` made 'offline' and 'this job has no completion' the same answer" (completionPrefill.ts).

## Case 3. Dispatcher with an unseeded cursor would message every old job
- Landed: dispatcher and cursor d1f78cd (2026-07-08, 0027); WhatsApp sender 834311f (2026-07-08, 0034). Default OFF, so nothing showed.
- Found: 2026-07-28 slice audit, HANDOFF section 4.2 B1. Hardened c731e66, merged da988e2 (2026-08-02, PR #170, migration 0046).
- Evidence (HANDOFF B1): "Enabling the dispatcher replays the entire `job_event` history as live customer WhatsApp messages ... `dispatch_cursor` is never seeded, and `run_dispatch_once` mints it at `last_seq=0`."
- Evidence (CLAUDE.md): "measured at 36 real messages about months-old jobs." and "The damage is permanent, not transient: `uq_customer_message_job_kind` makes the first decision per (job, kind) terminal, including a `suppressed` one."
- Second silent defect found in the same fix (HANDOFF section 3, 2026-08-01): the dead-letter guard "was aimed at a statement that cannot raise"; the sibling test "raises `RuntimeError`, which never poisons anything -- it is named for a property it does not exercise." The branch was also CI-red because a test "pinned the consent leak".
- Later moment: on the 2026-08-01 review, 0046's first downgrade "compared `last_seq` against the *current* `MAX(seq)`" and could delete a live cursor; made an explicit no-op because "an absent cursor is minted at `last_seq=0`, which **is** the whole-history replay" (HANDOFF section 3 item 4; c731e66).

## Case 4. Login lockout: the audit's own prescribed fix was wrong
- Landed: throttle, 0a40416 (2026-06-10). Two tests pinned the behaviour: backend/tests/test_identity_integration.py:80 and identity/tests/test_service.py:113.
- Found: 2026-07-28, HANDOFF A2: an unauthenticated attacker can hold all accounts locked; "a correct PIN during a lock is a 429". Also a lost-update race (no row lock). Fixed f3dfa6f, PR #169 (1c546a3).
- Evidence (HANDOFF section 6, item 2): "Tests pinned the broken behaviour ... A test passing is not evidence the behaviour is right."
- Evidence (f3dfa6f): "NOT the fix the handoff prescribed -- the prescribed one traded a DoS for a much worse brute-force hole." A tech PIN is 4 digits; unthrottled, "a handful of IPs finish in under an hour. The owner chose to keep the lock and make recovery explicit." The two tests "are NOT inverted"; each now carries a comment "so the next reader does not 'fix' them."
- Later moment: CLAUDE.md invariant "The login lock deliberately blocks a correct PIN too -- do not 'fix' this." It exists so a later agent reading HANDOFF A2 does not repeat the wrong fix.
- Sibling, same day: 9b98c88 / 2fe77f5 (PR #168, 2026-07-28). `hmac.compare_digest` on str raised TypeError on non-ASCII at three sites (ops proxy token, WhatsApp verify token, signature header). Introduced 30dc6d4 (2026-06-06) and bfb5714 (2026-07-01). Now CLAUDE.md: "Compare shared secrets with `compare_secret`"; c731e66 (2026-08-02) touches it again.

## Case 5 (Clinic). S10 import gate passed; same-day double count found in the follow-up
- Landed: S10 imports and openings passed the root gate and merged 2026-11-05 (merge b573e73; head 4e872ad; 1953 tests; check 7/7). CL docs/tasks/clinic-build/task.md line 20.
- Found: the cross-slice gap was recorded at the gate as G10-02/G10-16 (D10-38, "none built here") and carried as G10-20 (fcc7502, 2026-11-05). The guard build merged 2026-11-06 (5d6d493) after three more gate rounds. Round 1 (c1fb346): "one P1, three P2, nine P3"; GC-01 (P1) "same-day import double count".
- Evidence (CL docs/tasks/opening-cutoff-guards/task.md, "What the gap was"): "Nothing refused what other modules recorded afterwards with a date on or before the opening's cutoff, so a receipt, pay-out, accrual, issue or receipt of stock already contained in an opening could be counted a second time".
- Evidence (same file, round 1 table): GC-06 "test failed on message only"; GC-09 "test passed without the pay guard". Round 3: "GE-03 was real (after a reversed opening the next count's period read the reversal as a negative receipt and reported found stock)" (task.md line 643 of clinic-build).
- Evidence (D10-40, docs/application/s10-decision-record.md): GC-03, "this note first said every stock rule was 'on or before the cutoff' ... which the code did not do" (a record claiming more than the code).
- Later moments: round 2 GD-01..GD-09 (one P1) and round 3 GE-01..GE-06 on the same mechanism (2026-11-06); 2026-11-10 commits de71cba and f75ccad, real-data-switch review fixes ("a mapping made while on is refused after a revoke"); docs/tasks/real-data-switch/task.md line 36 lists "the first-record and cutoff rules" as unchanged.

## Searched
FF: docs/lifecycle-audit-followups-2026-07.md (items 1-10), HANDOFF-2026-07-28 sections 3, 4.1, 4.2, 6; CLAUDE.md invariants; git log --all and -S on head_size, failed_attempts, compare_digest/compare_secret, run_dispatch_once; bodies of f440222, ef90ccf, aa4f589, f3dfa6f, c731e66, 9b98c88. CL: task.md rows S10 and G10-20, opening-cutoff-guards/task.md, S10 decision record. Not read: session transcripts (.jsonl), so the model that wrote each original faulty change is not shown. Not examined: other clinic fix chains.
