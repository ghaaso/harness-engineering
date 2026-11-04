---
name: offline-sync-review
description: Review FixFlow's hand-rolled mobile offline engine (outbox, attendance, travel and media queues, read caches) against CLAUDE.md's outbox contract and plan section 0 rule 7. The outbox never deletes a write. A definitive 4xx parks in a visible failed list. A 401 pauses. An edge 404 with no app marker is connectivity, not a rejection (O-03, O-10). A replay by client_id is an idempotent success. Use it for the O-03 lens, for the Opus refute-by-default PR reviewer on P2a, P2b-1 and P2b-2, and for reading queue state in P4a, P4b and P4r: classification ladders, idempotency keys, reconciliation, head-of-line blocking, caps, the known unfixed stable-id race, the completionPrefill refusal, wizardState monotonicity, and what never-delete means for the UI. Do NOT use it to adopt a sync library (TanStack DB, WatermelonDB), for backend lifecycle, ledger or migration review (fastapi-alembic-safety), for geofence or background-task behaviour (android-background-execution), or for anything done on a roster phone.
---

# Offline-sync review (FixFlow)

This skill is for checking a change to the technician app's offline engine, or reviewing a PR
against it. It started from TanStack DB's offline-transactions skill (TanStack/db @ 8feab6e, MIT).
FixFlow keeps that skill's idempotency and serialisation ideas and rejects its error rules
(§6). Code facts were checked on 2026-11-04 against worktree `main` @ a31924a. Every
`path:line` below is repo-relative, except the pinned Expo sources under `~/.fixflow-cache/`.

## 1. FixFlow facts

### 1.1 The contract, and who owns it

- `CLAUDE.md:151` "Mobile mutations go through the outbox" (`sendOrQueue`, idempotency `client_id`).
- `CLAUDE.md:154` "The outbox never deletes a write." Success removes the item. A definitive 4xx
  goes to the visible failed list. Anything ambiguous is kept. `CLAUDE.md:158` makes pings and
  travel breadcrumbs the only "deliberately droppable" queues.
- `CLAUDE.md:161` "KNOWN DEFECT, UNFIXED: the outbox has no mutual exclusion on a stable id."
- `CLAUDE.md:185-186`: a lifecycle replay is an idempotent success, never a duplicate event.
- `CLAUDE.md:207` and `:212`: the completion form must never open blank against a real bill,
  and the arrival-wizard state is monotonic. `CLAUDE.md:218` says both client guards are pure
  functions on purpose: the app has no screen-test harness.
- `CLAUDE.md:224`: a client must be able to resume from server truth.
  `JobDetail.evidence` = `None` means "unknown", not zero.
- Plan §0 rule 7, `docs/program/SHIP-PLAN-2026-11.md:115`: "the outbox never deletes a write".
- Routing, `docs/program/SHIP-PLAN-2026-11.md:47`: "Opus owns anything touching the outbox contract, drain tooling".
  `:51`: every PR gets an Opus reviewer with a refute-by-default brief naming register ids. The
  reviewer names, for each fixed id, the test that fails on base and passes on head
  (`:53-55`).
- Ruling R8, `docs/program/SHIP-PLAN-2026-11.md:1484`: "no JSON-`detail` fallback" in origin classification.

### 1.2 Classification primitives (as on a31924a)

| Fact | path:line |
| --- | --- |
| `DEFINITIVE_4XX = new Set([400, 403, 404, 409, 422])`. 404 is in it, with no origin test | `technician-app/src/lib/syncClassification.ts:18` |
| `MAX_ATTEMPTS = 5` (poison cap for server-reachable errors) | `technician-app/src/lib/syncClassification.ts:24` |
| `isAuthFailure` is `status === 401` and is outside the definitive set | `technician-app/src/lib/syncClassification.ts:30-32` |
| `failureReason` falls back to `` `rejected (${e.status})` `` | `technician-app/src/lib/syncClassification.ts:37` |
| `ApiError` carries `status` only, no origin. The comment there: "string-matching on messages is what caused the v1 silent-drop bug" | `technician-app/src/lib/api.ts:66-80` |
| `REQUEST_TIMEOUT_MS = 15_000`. A timeout throws a plain `Error`, not an `ApiError`, so it counts as connectivity | `technician-app/src/lib/api.ts:85`, `:105` |
| A 401 clears the token and fires `onUnauthorized` | `technician-app/src/lib/api.ts:111-114` |
| Any non-OK response becomes an `ApiError`. Any 204 returns `undefined`, and any JSON body is returned as success (`O10-F4`) | `technician-app/src/lib/api.ts:115-121` |
| Outbox UI backoff `BASE_MS = 4_000`, `MAX_MS = 60_000` | `technician-app/src/lib/useOutboxSync.ts:18-19` |
| The origin marker `X-FixFlow-Api` does not exist yet. Only `X-Request-ID` is echoed | `backend/app/core/request_id.py:41-49`. `grep -rn X-FixFlow-Api backend/app technician-app/src` is empty (VERIFIED-BY-COMMAND 2026-11-04) |
| The marker is planned as `X-FixFlow-Api: 1` on every response, including unknown-route 404s and unhandled 500s (P1). P2a step 1 consumes it | `docs/program/SHIP-PLAN-2026-11.md:348-349`, `:389-399` |

### 1.3 The seven rows (CLAUDE.md offline-engine table, `CLAUDE.md:62`), ladder by ladder

Every drain loop has the same shape: guard, then per-tech skip, then send, then classify.
The differences between the queues are where defects hide.

| Queue (store key) | 401 | Definitive 4xx | ApiError 5xx/429 | Non-ApiError | Cap | Deletion paths |
| --- | --- | --- | --- | --- | --- | --- |
| Jobs outbox `jobs.outbox.v2` (`lib/outbox.ts:62`) | `pausedForAuth = true; break` (`lib/outboxSync.ts:214-217`). Live tap: rethrow, **not queued** (`:287`, O3-F8) | `markFailed` + continue (`:218-221`). Live tap: rethrow, not queued (`:287`, O3-F1) | `bumpAttempts`. At 5: `markFailed` + continue. Otherwise **break: head-of-line block** (`:226-233`) | break, never counted (`:234-236`) | none | success `removeItem` (`:211`); live-send supersede (`:280`); user Discard (`lib/outbox.ts:224-227`, called at `features/jobs/JobDetailScreen.tsx:74`) |
| Punches `attendance.queue.v1` (`features/attendance/queue.ts:43`) | break, no pause flag (`features/attendance/sync.ts:57`) | park only if `!server_event_id` (`sync.ts:64-67`) | bump, park at 5, else break (`sync.ts:70-80`) | break (`sync.ts:81`). A throwing selfie `uploadAsync` (`sync.ts:162-165`) lands here (O10-F8) | none | `pruneSettled`, `done` only (`sync.ts:100-114`); `discardPunch` (`sync.ts:122-132`) |
| Presence `attendance.presence.queue.v1` (`presenceQueue.ts:43`) | break (`presenceSync.ts:68`) | park (`presenceSync.ts:71-74`) | bump, park at 5, else break (`presenceSync.ts:75-85`) | break (`presenceSync.ts:86`) | **none** (`presenceQueue.ts:67-73`) | settled (`presenceSync.ts:89`); `discardPresence` (`presenceQueue.ts:132-133`) |
| Pings `attendance.pings.queue.v1` (`pingQueue.ts:35`) | falls through to break (`pingSync.ts:60-62`, `:75`) | **DROP** batch (`markPingsDone`, `pingSync.ts:63-72`) | break, uncounted (`pingSync.ts:73-75`) | break | `MAX_UNSENT_PINGS = 1000`, oldest first (`pingQueue.ts:38`, `:69-77`) | settled (`pingSync.ts:78`) |
| Travel `jobs.travel.queue.v1` (`features/jobs/travelQueue.ts:32`) | break, whole drain (`travelSync.ts:75-79`) | **DROP** batch (`travelSync.ts:67-74`) | break | break | `MAX_UNSENT_SAMPLES = 1000` (`travelQueue.ts:36`, `:67-75`) | settled (`travelSync.ts:84`) |
| Pending media `media.pending.v1` (`features/media/pendingMedia.ts:38`) | counted like a 5xx (no 401 branch, `:170-173`) | park by forcing `attempts = MAX_ATTEMPTS`; 413 too (`:158-168`, O3-F22) | count and **continue**, no head-of-line block (`:170-173`) | break (`:174`). A failed R2 PUT is a plain `Error` (`features/media/uploadMedia.ts:46-49`) | none | success `removeEntryIfUri` (`:153`); capture deleted (`:75-78`, called at `ArrivalJobWizard.tsx:325`) |
| Read caches `jobs.cache.list.v1`, `jobs.cache.detail.v1:` (`lib/jobsCache.ts:18-19`) | n/a | n/a | n/a | n/a | n/a | best-effort writes; a failed cache write "degrades to a stale read, never to a lost write" (`lib/jobsReconcile.ts:42-45`) |

Short names in this section resolve under `technician-app/src/`. They are in `lib/` (outbox,
outboxSync, api, syncClassification, mutex, jobs*, useOutboxSync), `features/attendance/`
(queue, sync, punch, presence*, ping*, useAttendance, geofence, pingTracker, ClockScreen),
`features/jobs/` (travel*, TravelScreen, JobDetailScreen, completionPrefill,
`arrival-job/`) or `features/media/`. `App.tsx` is `technician-app/App.tsx`.
Other facts that bound the ladders:

- Parked rows are skipped by every drain: `outboxSync.ts:202`, `queue.ts:100-102`,
  `presenceQueue.ts:89`, `pendingMedia.ts:140`. Retry is per id (`outbox.ts:214-222`,
  `queue.ts:128-136`). So a classifier fix alone drains none of the outage rows (O10-F2).
- Single-flight flags are module-level and drop a trigger that arrives mid-drain, with no
  rerun: `outboxSync.ts:160`, `sync.ts:46`, `presenceSync.ts:36`, `pingSync.ts:29`,
  `travelSync.ts:26`, `pendingMedia.ts:114`. The storage mutex (`lib/mutex.ts:14-25`, one per
  store, e.g. `outbox.ts:99`) serialises load-modify-save only. It does not serialise network
  sends.
- Headless drains rehydrate the bearer first: `presenceSync.ts:45`, `pingSync.ts:35`,
  `travelSync.ts:32`. expo-task-manager 12.0.6 keeps separate task-manager tables "when both
  foreground and background apps are launching at the same time"
  (`~/.fixflow-cache/expo-src/expo-task-manager-12.0.6/package/android/src/main/java/expo/modules/taskManager/TaskService.java:238-242`).
  So two JS contexts, each with its own flags and mutex, may drain one store at the same
  time (INFERRED, §7).
- Shared-device skip: `outboxSync.ts:205`, `sync.ts:53`, `presenceSync.ts:49`,
  `pingSync.ts:37`, `travelSync.ts:35`. The counts are not filtered by tech
  (`outbox.ts:234-240`, O3-F21).
- Corrupt store: a parse failure reads as `[]` and the next `mutate` overwrites the bytes
  (`outbox.ts:105-109` with `:146-149`; `queue.ts:54-58`; O3-F17). Only the v1 outbox is
  preserved (`outbox.ts:123-126`, key `jobs.outbox.v1.corrupt` at `:66`).
- Drain triggers differ per queue (O3-F9). The outbox drains on connect, `active` and backoff
  (`useOutboxSync.ts:29-66`). Media drains on connect, `active` and any outbox change
  (`features/media/usePendingMediaDrain.ts:17-24`). Travel drains from `App.tsx:68`, `:72`.
  Punches drain only from `punch.ts:57` and `useAttendance.ts:122`, `:255`. Presence drains
  from `geofence.ts:211` and `useAttendance.ts:258`. Pings drain from `pingTracker.ts:304`.
- `isOutboxPaused` (`outboxSync.ts:172-174`) has no consumer. `listPendingMedia` and
  `pendingMediaCount` have no importer outside `pendingMedia.ts` (O3-F14, O3-F5).

### 1.4 The server half of idempotency (`backend/app/features/jobs/service.py`)

- `create` deduplicates on `client_id` (`:815-817`). `transition` replays by `client_id`
  (`:1059-1061`). With no `client_id` (deployed APKs), the settled-state check returns
  success without a new event (`:1070-1077`). A forbidden state raises 409
  `"cannot {action} this job (current status: {row.status})"` (`:1133`). Three clients regex
  that suffix (`:1130`).
- A completion resubmit of the byte-identical form is an idempotent success, even when the bill
  is frozen (`:1197-1207`). Payments are idempotent on `client_id` (`:1447`), and GPS punches
  too (`:1543`).
- The outbox kinds and the API call each one replays to: `technician-app/src/lib/outbox.ts:23-33`
  and `technician-app/src/lib/outboxSync.ts:108-148`.

### 1.5 The client guards that exist because of the race

- `technician-app/src/features/jobs/completionPrefill.ts`: a queued completion means
  `blocked/"queued"` (`:86-88`). Its rationale is the stable-id race (`:25-30`). If it cannot be
  established that a completion exists, the result is `blocked/"unknown"`, not `new` (`:114`).
  A failed item is never a prefill source (`:79-84`). `freezeReason` mirrors the server's arms
  (`:65-74`; server `service.py:1176`).
- `technician-app/src/features/jobs/arrival-job/wizardState.ts`: once the wizard has left `run`
  it never returns there (latch `:80`). Server truth is the only exit from `pending` (`:77`).
  An old draft flag is a hard floor (`:84`). The reason is in the comment at `:10-17`: the flush
  calls `removeItem` before it notifies landed-listeners (`outboxSync.ts:211-212`).
- Reconciliation: both the live path and the replay path go through `reconcileJob`
  (`outboxSync.ts:210`, `:281`; `lib/jobsReconcile.ts:37-47`). The outcome is the union
  `sent | queued` (`outboxSync.ts:254`), never `T | null`.

### 1.6 Phases and register ids

Phase headings are in `docs/program/SHIP-PLAN-2026-11.md`:

- **P2a** (`:384`): offline engine honesty. One `classify(error, kind)` with a per-kind policy
  table, and `drop` only on the ping and travel rows (`:393-399`). Covers O3-F1, F2, F3, F6,
  F7, F8, F9, F10, F11, F14, F17, F18, F22.
- **P2b-1** (`:421`): drain tooling. Manifest and un-park (O10-F1, O10-F2), retry advice at
  336 h (O3-F4), Discard copy (O3-F13), pending-media retry and the needs-attention list (O3-F5,
  O3-F12).
- **P2b-2** (`:458`): `drain_audit.py`, matching rules for kinds without `client_id`.
- **P4a** (`:667`), **P4b** (`:710`), **P4r** (`:746`): pilot drain, fleet drain and late
  re-open. In these phases this skill only reads queue state and audit output.

The register is `references/register-o03-o10.md` (O3-F1..F22, O10-F1..F4). The O-03 design's
ten steps are in `docs/program/w2/O-03-design.md:13-23`, with the amendments at `:27-38`.

## 2. Procedure

1. Read the brief. It names the phase, the PR head SHA or file set, the register ids to try to
   break, and whether you "run commands". Without that phrase you are read-only.
2. Map the change onto the §1.3 rows. Any row it touches gets the full §3 checklist. A row it
   does not touch still gets C3 (deletion paths), because one shared classifier can change every row.
3. For each named register id, write the failing condition in one sentence from the register
   row. Then try to make it happen on head: read the path, then the test. When you cannot break
   it, name the test that pins it and confirm that test would fail on base (`docs/program/SHIP-PLAN-2026-11.md:53-55`).
   With no such test, say so. That fact is evidence, not a verdict.
4. Re-locate every citation by symbol on the SHA under review. The evidence files' line numbers
   drift (`references/register-o03-o10.md`).
5. If the brief says "runs commands": `cd technician-app && npm run typecheck && npm test --
   <files>` (Jest via `jest-expo`). Report the exit code and the tail. Never run builds, `expo`,
   `eas` or `adb`.
6. Return the output contract the brief asks for (named in the agent definition). Stop.
7. [owner] Anything on a roster phone: reading its AsyncStorage over adb, Retry or Discard
   under the drain protocol, and `adb install -r` only per phone, supervised, inside that
   phone's drain protocol (plan rule 1, `docs/program/SHIP-PLAN-2026-11.md:95-98`).
   Never uninstall or clear app data: "An uninstall or storage clear wipes every queue"
   (`docs/program/w2/O-10-design.md:6`; release notice, `docs/program/SHIP-PLAN-2026-11.md:471-472`).
   The only exception is [owner]: the K=no branch, after the A3 photos, every row retried or
   transcribed, and the owner's written per-phone sign-off (rule 1; `docs/program/w2/O-10-design.md:94`).
8. [owner] Telling technicians anything: the hold and release notices (rule 6, `:111-113`;
   `docs/program/w2/O-10-design.md:6`).
9. [owner] Switching the old-host stub mode (hang or proxy), opening or cutting the tunnel
   route, deploying the drain image, and running `drain_audit.py` on the box
   (rules 3 and 5, `:100-110`).
10. [owner] Enabling the dispatcher or re-seeding the cursor (rule 4, `:102-104`).

## 3. Checklist (each item: what proves it)

- **C1 Origin.** Does any branch decide "definitive" or "count toward the cap" from the status
  alone? On a31924a, every branch does (`syncClassification.ts:18`, `outboxSync.ts:226`).
  After P2a a status counts only when the app marker is present, and a `{"detail": …}` body
  without the marker is not definitive (`docs/program/SHIP-PLAN-2026-11.md:389-392`). Proof: a test per
  queue in which a markerless 404 leaves the item queued and unchanged
  (`docs/program/w2/O-03-design.md:14`).
- **C2 401 is a pause.** On the flush path, every queue stops and keeps the item. On the live
  path, `sendOrQueue` must enqueue on a 401 (P2a step 2, O3-F8). A 401 must never reach a drop
  branch: `pingSync.ts:60-62` relies on 401 being outside `DEFINITIVE_4XX`.
- **C3 Deletion paths.** Every `removeItem`, `remove*`, `markPingsDone` or
  `markTravelSamplesDone` must be one of these seven: success, live-send supersede, user Discard,
  settled prune, a ping/travel drop, the user deleting a capture before upload
  (`pendingMedia.ts:75-78`), or the v1-to-v2 store merge (`outbox.ts:114-128`). Anything else
  breaks `CLAUDE.md:154`. Run the grep in §4; ignore hits on non-queue keys (auth token, tech
  key, travel state, arrival draft).
- **C4 Success means landed.** A 2xx or 204 is taken as landed whatever its body
  (`api.ts:120-121`). A change that widens "success" (a new 2xx-returning path, a stub, a
  health route) must not let a non-app answer delete queued items (O10-F4; rule 5 at `docs/program/SHIP-PLAN-2026-11.md:105-110`).
- **C5 Poison cap and head-of-line.** The outbox, punch and presence queues break on a 5xx
  below the cap. That is a deliberate block, which clears at `MAX_ATTEMPTS = 5`. Pending media
  continues instead. A markerless 5xx (Cloudflare 502/530, a proxy) must not count (O3-F6), and
  neither may a 503 stub (O10-F3). Any new throw inside a sync step must be classified, or it
  becomes a permanent break (O10-F8).
- **C6 Idempotency key.** Every queued write either carries a `client_id` the server
  deduplicates on, or is idempotent by value (§1.4). A stable outbox id replaces by id
  (`outbox.ts:152-161`). That is right only when "replace" cannot drop an unsent earlier
  record. `location:${kind}:${id}` (`features/jobs/TravelScreen.tsx:173`) failed that test
  (O3-F10, P2a step 8: one id per tap).
- **C7 The race.** Nothing serialises a live `sendOrQueue` against a concurrent `flushOutbox`
  for one stable id (`CLAUDE.md:161-166`). A change that assumes last-write-wins, adds a
  stable-id kind without a refusal like `completionPrefill`'s, or removes that refusal, reopens
  the race. The planned fix is single-flight per stable id in one command log after the drain
  (P14-fleet, `docs/program/w2/O-03-design.md:35-38`), never before it.
- **C8 Blank is a delete.** Every completion-form path must keep `blocked/"unknown"` distinct
  from `new` (`completionPrefill.ts:114`) and keep failed items out of the prefill.
- **C9 Monotonic wizard.** No live re-derivation that can return `run` after
  `pending | failed | done` (`wizardState.ts:80`). Proof: `wizardState.test.ts`.
- **C10 Reconcile and resume.** A landed row goes through `reconcileJob` on both paths. An
  offline-painted list never repaints (O3-F16). `evidence = None` is never read as zero
  (`CLAUDE.md:224-227`).
- **C11 Shared device.** Drains skip other techs' rows, counts and selectors filter by tech
  (`wizardState.ts:55-59` is the pattern; O3-F21), and the banner and Drain Report say whose
  rows are waiting (O10-F10).
- **C12 Storage.** A corrupt store is preserved before any save (O3-F17). Caps exist only on
  ping and travel (presence and outbox are uncapped). The 6 MB Android AsyncStorage cap is
  unmeasured (O10-F17).
- **C13 Triggers and ordering.** Every queue drains on mount, `active`, connect and login
  through one `drainAll` in a fixed order (P2a step 5, `docs/program/w2/O-03-design.md:18`). A trigger that
  arrives mid-drain is not lost (O3-F15).
- **C14 Privacy bounds.** Classification changes must not let a sampler run for a signed-out
  tech (O3-F7) or past `maxDutyHours` / `MAX_TRAVEL_MS` (`CLAUDE.md:171`). Coordinate with
  android-background-execution and do not re-derive those bounds here.

### 3.1 What an edge 404 means versus an app 404

| Response | On a31924a | Contract from P2a on |
| --- | --- | --- |
| App 404 (marker present): a route or row the recovered DB really lacks | definitive: park (the outbox and attendance queues) or drop (ping/travel) | definitive. A write for a job created after `T_restore` "stay[s] parked, correctly" (`docs/program/w2/O-10-design.md:86`) |
| Edge 404 (no marker), e.g. Railway's "Application not found" (`docs/program/evidence/w2/O-03.txt:31`) | identical to an app 404: punches and presence parked, pings and travel dropped, online job writes refused (`docs/program/w2/O-03-design.md:3-10`) | connectivity: break, no park, no drop, no count (`docs/program/w2/O-10-design.md:46`) |
| `{"detail": …}` body, no marker | definitive | **not** definitive (R8, `docs/program/SHIP-PLAN-2026-11.md:392`, `:1484-1485`) |
| Cloudflare 403/502/530, captive portal | 403 definitive; 5xx counted toward a park | connectivity (`docs/program/SHIP-PLAN-2026-11.md:389-391`) |
| 2xx JSON or 204 from a non-app host | landed: the item is deleted or marked done (O10-F4) | forbidden at the source (rule 5). Backlog, not P2a scope: `docs/program/evidence/w2/O-10.txt:60` suggests requiring the marker on a 2xx; plan P2a (`docs/program/SHIP-PLAN-2026-11.md:388-410`) does not, so do not fail a P2a PR on it |
| Hang stub: no bytes for ≥ 20 s (rule 5); the client aborts at 15 s (`api.ts:85`) | plain `Error`: connectivity, never counted (`api.ts:105`) | same. This is why the old host may only hang (`docs/program/SHIP-PLAN-2026-11.md:105-106`) |

### 3.2 What "never delete a write" implies for the UI

- The tap is the success (`outbox.ts:6-7`). The screen must say "saved, will sync", not
  "recorded", whenever the outcome is `queued`. O3-F18 is the counter-example: `sendPunch`
  reports a queued arrival as "Arrival recorded".
- Every parked row needs a visible, reachable place with Retry and Discard. Pending media has
  none (O3-F5). A failed offline create has no screen (O3-F12). The banner is
  `App.tsx:45-46`.
- Discard is the only deletion a human makes, and its copy must state the origin truthfully.
  On a31924a (checked 2026-11-04) both dialogs say the server rejected the row (`features/attendance/ClockScreen.tsx:164`,
  `features/jobs/JobDetailScreen.tsx:733`), even for an edge 404 the app never saw (O3-F13).
  P2b-1 adds telemetry on every Discard (`docs/program/SHIP-PLAN-2026-11.md:440-441`).
- Retry has consequences: a punch older than the server ceiling lands on the day of the retry (O3-F4). The UI
  asks first, at a shared constant of 336 h (`docs/program/SHIP-PLAN-2026-11.md:438-439`).
- A paused or signed-out engine must look different from "no signal" (O3-F14).
- Server truth outranks a rejected local payload (`completionPrefill.ts:79-84`).

## 4. Checks (read-only; run from the repo root)

```bash
# C1: the definitive set and the cap
grep -n "DEFINITIVE_4XX\|MAX_ATTEMPTS =" technician-app/src/lib/syncClassification.ts
# C1/C4: is the origin marker built yet? Empty means P1 and P2a have not landed
grep -rn "X-FixFlow-Api" backend/app technician-app/src
# C3: every deletion path; each queue hit must be one of the seven allowed kinds
grep -rn "removeItem(\|removePunches(\|removePresence(\|removePings(\|removeTravelSamples(\|removeEntry\(IfUri\)\?(\|markPingsDone(\|markTravelSamplesDone(\|discard[A-Z][a-zA-Z]*(" technician-app/src --include=*.ts --include=*.tsx | grep -v "\.test\."
# CLAUDE.md:151: no screen writes outside the outbox (expect no hits in *.tsx)
grep -rn "jobsApi\.\(create\|submitCompletion\|logPayment\|voidPayment\|negotiateBill\|recordLocation\|setCustomerPin\|transition\|addNote\)(" technician-app/src --include=*.tsx
# C11/C14 and the UI rows: consumers of the pause flag and of pending media
grep -rn "isOutboxPaused\|listPendingMedia\|pendingMediaCount" technician-app/src technician-app/App.tsx | grep -v "\.test\."
# C5/C12: the constants that bound queues and retries
grep -rn "MAX_UNSENT_\|MAX_BATCH =\|REQUEST_TIMEOUT_MS =\|BASE_MS =\|MAX_MS =" technician-app/src
```

A grep hit proves where the code is (VERIFIED-BY-COMMAND). Only a Jest test proves behaviour
(`technician-app/src/lib/outboxSync.test.ts`, `outbox.test.ts`,
`features/attendance/{sync,presenceSync,pingSync,queue,presenceQueue,pingQueue}.test.ts`,
`features/jobs/{travelSync,travelQueue,completionPrefill}.test.ts`,
`features/jobs/arrival-job/wizardState.test.ts`, `features/media/pendingMedia.test.ts`). On
a31924a there is no `syncClassification.test.ts`, and no test pins 404 (`docs/program/w2/O-03-design.md:14`).

## 5. Forbidden actions

- A path that deletes, drops or "clears" a write outside the seven kinds in C3
  (`CLAUDE.md:154-160`; plan rule 7, `docs/program/SHIP-PLAN-2026-11.md:115`).
- Adopting TanStack DB offline-transactions, WatermelonDB or any sync library, or the
  `/react-native` entry (`CLAUDE.md:97`). The command-log rewrite is P14-fleet, after the drain
  (`docs/program/w2/O-03-design.md:35-38`).
- A screen calling a `jobsApi` write directly (`CLAUDE.md:151-153`).
- Removing the `completionPrefill` refusal, or deriving `wizardState` live (`CLAUDE.md:166`,
  `:212-217`).
- A JSON-`detail` fallback in origin classification (R8), or a request-side app marker (R3,
  `docs/program/SHIP-PLAN-2026-11.md:1471-1472`).
- Shipping a classifier fix through `expo-updates` (R7, `docs/program/SHIP-PLAN-2026-11.md:1483`).
- A stub or route that answers 2xx, 204 or 5xx on the old hostname (rule 5,
  `docs/program/SHIP-PLAN-2026-11.md:105-110`).
- Any [owner] step in §2. No `git` write, `npm install`, `expo`, `eas` or `adb`. Never open a
  `.env`, or read a value out of `technician-app/eas.json` or `technician-app/app.json` (key
  names only).

## 6. Where upstream disagrees

Upstream is `packages/offline-transactions/skills/offline/SKILL.md` at TanStack/db@8feab6e.
Line N upstream is line N+1 in `references/tanstack-offline-SKILL.md`. In every row below,
FixFlow's rule wins. `UPSTREAM.md` records each one under Rejected.

| # | Upstream (line) | FixFlow rule and why it wins |
| --- | --- | --- |
| U1 | `NonRetriableError` "stops retry and removes the transaction from the outbox" (:210) | A definitive rejection **parks** the item (`outbox.ts:200-211`). The bias is spelled out at `syncClassification.ts:8-9`: a wrong "fail" costs a human glance, but a wrong "drop" is silent data loss. `CLAUDE.md:154`, rule 7 |
| U2 | If the `shouldRetry` hook throws, the executor records a terminal rejection, removes the row, and a fresh executor does not replay it (:225-230) | Nothing is terminal without a person. A failed row stays retryable (`outbox.ts:214-222`). The executor itself never decides to delete |
| U3 | 409 means "Duplicate detected", so throw `NonRetriableError` (:201-202, :404-405) | A replay is an idempotent **server** success, by `client_id` or by settled state or identical payload (`service.py:1059-1077`, `:1197-1207`; `CLAUDE.md:185`). A 409 that reaches the phone is a real conflict ("(current status: X)", `service.py:1133`) and parks visibly. Deleting it would hide a reopened-bill class of bug |
| U4 | 404, 405 and 410 treated as permanent (:407-409, :418) | A 404 is definitive only when the app itself said it (marker). An edge 404 is connectivity (`docs/program/SHIP-PLAN-2026-11.md:389-392`; O-10). `docs/program/w2/O-03-design.md:14` states the same rule, but its "JSON object body with a 'detail' key" fallback is void (R8, `docs/program/SHIP-PLAN-2026-11.md:1484`). On a31924a code an edge 404 parks the outbox, punch, presence and pending-media rows and drops ping and travel batches (`docs/program/w2/O-03-design.md:3-10`, "code on main; field APK unconfirmed"). What the field APK did is unknown until the P2b-1 manifest (rule 2, `docs/program/SHIP-PLAN-2026-11.md:99`). 405 and 410 are not in `DEFINITIVE_4XX` and stay transient |
| U5 | The default policy stops when an error message contains 400, 401, 403 or 422 (:416-418) | FixFlow classifies on `ApiError.status` and never on message text (`api.ts:66-71`). A 401 is a pause, never a stop and never a failure (`syncClassification.ts:5`, `:30-32`; `outboxSync.ts:214-217`) |
| U6 | `clearOutbox()` clears every pending transaction (:298-299) | No bulk clear exists or may exist. Discard is per item and only on explicit user confirmation (`outbox.ts:224-227`). During the drain, technicians are told not to Discard at all (`docs/program/w2/O-10-design.md:6`) |
| U7 | Storage unavailable leads to online-only mode, "aren't persisted" (:157). A non-leader tab runs with "no offline persistence" (:77, :96, :122) | Rule: no storage-unavailable or non-leader mode exists or may be added, and a transient failure always enqueues (`outboxSync.ts:288-291`). That is not a claim that every tap is persisted. On a31924a a live 401 or definitive 4xx is rethrown and not queued (`outboxSync.ts:287`, O3-F1, O3-F8), and a corrupt v2 store reads as `[]` and is overwritten (`outbox.ts:105-109` with `:146-149`, O3-F17). P2a step 2 makes 401 and non-app errors enqueue (`docs/program/SHIP-PLAN-2026-11.md:400`); an app-origin definitive 4xx on a live tap is still shown to the technician, by design (`outboxSync.ts:284-286`). Step 9 preserves a corrupt store (`:408`) |
| U8 | On failure, "retried with exponential backoff" (:117), and the default "can retry other errors indefinitely" (:417) | FixFlow retries on triggers (with a 4 s to 60 s UI backoff, `useOutboxSync.ts:18-19`) and parks a server-reachable poison write at `MAX_ATTEMPTS = 5` (`syncClassification.ts:20-24`), so one write cannot block the queue for ever. This is a model difference. Do not import "indefinitely" |
| U9 | React Native: use the library's `/react-native` entry (:276-286) | Hand-rolled engine (`CLAUDE.md:62`, `:97`). Adopting a library before the drain would invalidate the drain tooling (`docs/program/w2/O-03-design.md:38`) |
| U10 | `KeyScheduler` serialises transactions touching the same keys (:106) | A good target, but FixFlow does **not** have it (`CLAUDE.md:161`). A reviewer must not assume per-key serialisation exists. It is the P14-fleet single-flight goal |

Kept, with no conflict: the idempotency-key rule (:260-274, :307-332), where TanStack uses an
`Idempotency-Key` header. On a31924a it maps to `client_id` on create, payment, location,
transition and ready (`service.py:815-817`, `:1447`, `:1543`, `:1059-1061`), and to value
idempotency on completion (`service.py:1197-1207`), customer_pin (`outboxSync.ts:85-87`) and
void (`service.py:1505`). `negotiate` sets the amount by value but appends a `bill` event on
every call (`service.py:1392`, `:1400`). `note` has neither: no `client_id` in its payload
(`outboxSync.ts:92-94`, `:138`) and no dedupe on the server (`service.py:972-981`). A reviewer
checks every kind under C6 and does not assume coverage.

## 7. Unknowns (carry them; do not guess)

- Whether a headless task's JS context and the foreground's can drain the same AsyncStorage
  key at once on the fleet's Android versions. That would defeat both the module flags and the
  per-store mutex. The source only shows that the two can coexist (`TaskService.java:238-242`).
  Device evidence is an android-background-execution question.
- What the field APK's queues actually hold. Code on `main` gives candidates, and only the
  P2b-1 manifest gives counts (O10-F1). Reading a roster phone is [owner].
- The TanStack skill's `db-core` and `db-core/mutations-optimistic` siblings (upstream :23)
  were not fetched. Nothing here depends on them.
- O3-F15 has no closing phase in the plan.

## 8. References

- `references/register-o03-o10.md`: the O3-F1..F22 and O10-F1..F4 rows with their evidence
  lines and closing phases, the O-10 rollback rules, and the evidence line-drift warning.
- `references/tanstack-offline-SKILL.md`: the upstream skill, verbatim (MIT,
  library_version 0.6.17). Read it only to check a §6 row.
- docs/ORCHESTRATION-DESIGN-2026-10.md and docs/program/* are on PR #182 (head 3415b5e) at write time; their line numbers refer to that head.
