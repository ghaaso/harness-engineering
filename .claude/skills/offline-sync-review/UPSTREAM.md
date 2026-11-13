# Provenance: offline-sync-review

Status: **sourced**. One upstream.

## tanstack-db

| Field | Value |
| --- | --- |
| Repo | https://github.com/TanStack/db |
| Commit | `8feab6ea3eaae4456f738da39fa93508ddd5cc01` |
| Branch | `main` |
| Fetched | 2026-11-04 (sparse, shallow clone; the clone's git metadata broke on a Windows long-path pack, but the fetched files are intact) |
| Path taken | `packages/offline-transactions/skills/offline/SKILL.md` (13963 bytes, the only file in the path) |
| Licence | MIT (SPDX `MIT`), "Copyright (c) 2025 Kyle Mathews", from the repo root `LICENSE`. The skill directory has no licence file of its own |
| Licence file here | `LICENSE-tanstack-db` (root `LICENSE`, copied verbatim with `cp`) |
| Version note | Upstream has no "verified on <date>" sentence. Its only version statement is the frontmatter `library_version: '0.6.17'` (upstream line 13), kept verbatim in the vendored copy. The `@tanstack/offline-transactions` package.json in the same clone is version 1.2.0. Wording here: verified against TanStack/db@8feab6e, library_version 0.6.17, fetched 2026-11-04 |

### Taken

- `references/tanstack-offline-SKILL.md`: the upstream file **verbatim** (all 425 lines). It is
  prefixed by one HTML-comment header line, so upstream line N is line N+1 there. The size was
  checked at 13963 + 425 header bytes = 14388. It is vendored whole rather than trimmed,
  because `SKILL.md` §6 cites lines from six separate sections and the checker needs the
  surrounding text to confirm each row.

### Changed (adapted into SKILL.md)

- The idempotency-key rule (upstream :260-274) and the "CRITICAL Not passing idempotencyKey"
  rule (:307-332) become checklist item C6. They are restated against FixFlow's `client_id`
  dedupe and the server code at `backend/app/features/jobs/service.py` (create :815-817,
  transition :1059-1061, payment :1447, location :1543).
- The transaction lifecycle (:111-118) becomes the §1.3 ladder: enqueue, drain, remove on
  success only. Optimistic apply and replay-on-reload map to `sendOrQueue` and the drain
  triggers.
- The `OutboxManager` FIFO and `KeyScheduler` rows (:105-106) become C5 (head-of-line
  blocking) and C7 (FixFlow has no per-key serialisation: `CLAUDE.md:161`).
- The leader-election concept (:120-137) becomes C12/§7: the analogue is one drainer per JS
  context (module flags), plus the open question of foreground and headless contexts.
- Storage degradation and the custom storage adapter (:139-157, :178-188) become C12: corrupt
  stores must be preserved (FixFlow keeps only `jobs.outbox.v1.corrupt` on a31924a).
- "Classify failures according to whether the app can recover" (:416) is kept as a principle
  only. FixFlow's application of it is the opposite on 401 and on non-app 404s (§6 U4, U5).

### Rejected (with reason)

Every row is a collision with `CLAUDE.md` or plan §0. They are numbered as in `SKILL.md` §6.
The survey's seven collisions (SOURCE-NOTES §5, items 1-7) are U1, U2, U4/U5, U6, U7, U8 and
U3.

| # | Upstream | Reason it is rejected |
| --- | --- | --- |
| U1 | :210, `NonRetriableError` removes the transaction from the outbox | `CLAUDE.md:154`: the outbox never deletes a write. Plan §0 rule 7 (`docs/program/SHIP-PLAN-2026-11.md:115`). FixFlow parks the item with `markFailed` (`technician-app/src/lib/outbox.ts:200-211`) |
| U2 | :225-230, if the hook throws, the row is recorded as terminal, removed, and not replayed by a fresh executor | Same rule. A failed row stays retryable (`outbox.ts:214-222`). Only a person, through a confirmed Discard, removes it |
| U3 | :201-202 and :404-405, 409 as "Duplicate detected", a non-retriable delete | `CLAUDE.md:185`: a replay is an idempotent success on the server, by `client_id`, settled state or identical payload. A 409 that reaches the phone is a real conflict and parks visibly (`technician-app/src/lib/syncClassification.ts:18`) |
| U4 | :407-409 and :418, 404/405/410 treated as permanent | An edge 404 without the app marker is connectivity (`docs/program/w2/O-10-design.md:46`; plan P2a `docs/program/SHIP-PLAN-2026-11.md:389-392`). On a31924a code an edge 404 parks the outbox, punch, presence and pending-media rows and drops ping and travel batches (`docs/program/w2/O-03-design.md:3-10`, "code on main; field APK unconfirmed"); the field APK's behaviour is unknown until the P2b-1 manifest. `docs/program/w2/O-03-design.md:14` states the marker rule, but its JSON-`detail` fallback is void under ruling R8 (`docs/program/SHIP-PLAN-2026-11.md:1484`) |
| U5 | :416-418, the default policy stops on a message containing 400, 401, 403 or 422 | FixFlow classifies by `ApiError.status`, never by message text (`technician-app/src/lib/api.ts:66-71`). A 401 is a pause and never a failure (`syncClassification.ts:5`, `:30-32`) |
| U6 | :298-299, `clearOutbox()` | Bulk deletion of pending work contradicts `CLAUDE.md:154`. Discard is per item and only with explicit user confirmation (`outbox.ts:224-227`). Technicians are told not to Discard during the drain (`docs/program/w2/O-10-design.md:6`) |
| U7 | :157, :77, :96, :122, online-only or non-leader modes "aren't persisted" | Rejected as a mode: no storage-unavailable or non-leader mode may exist. Transient failure always enqueues (`technician-app/src/lib/outboxSync.ts:288-291`), and screens never write directly (`CLAUDE.md:151-153`). Not every tap is persisted: on a31924a a live 401 or definitive 4xx is rethrown, not queued (`outboxSync.ts:287`, O3-F1, O3-F8); P2a step 2 makes 401 and non-app errors enqueue (`docs/program/SHIP-PLAN-2026-11.md:400`), while an app-origin definitive 4xx on a live tap is still shown to the technician by design. A corrupt v2 store is overwritten with `[]` until P2a step 9 (O3-F17) |
| U8 | :117, exponential backoff, and :417, "retry other errors indefinitely" | A model difference, not a rule collision. FixFlow flushes on triggers with a 4 s to 60 s UI backoff (`technician-app/src/lib/useOutboxSync.ts:18-19`) and parks a poison write at `MAX_ATTEMPTS = 5` (`syncClassification.ts:24`) so it cannot block the queue for ever. "Indefinitely" is not adopted |
| U9 | :276-286, the React Native entry point, i.e. adopting the library | `CLAUDE.md:97`: no offline sync library. The planned consolidation is a hand-built expo-sqlite command log after the drain (`docs/program/w2/O-03-design.md:35-38`) |
| U10 | :106, `KeyScheduler` serialises same-key transactions | Not rejected as a goal, rejected as an assumption: FixFlow does not have it (`CLAUDE.md:161`). Recorded so no reviewer imports it as a fact |
| — | :27-96, :159-176, :334-373: `startOfflineExecutor`, `createOfflineTransaction`/`Action`, the collections map, `waitForInit` | TanStack DB collection coupling, with no FixFlow analogue |
| — | :104-109, :120-137: IndexedDB/localStorage, WebLocks/BroadcastChannel, `navigator.onLine` | Web-only primitives. FixFlow is React Native with AsyncStorage and NetInfo |
| — | :23 and :423-425: the `db-core`, `db-core/mutations-optimistic` and `db-core/collection-setup` siblings | Not fetched (outside the requested path), and not needed. Listed as an unknown in `SKILL.md` §7 |

No collision was found on the other §0 subjects: Alembic or downgrade, Railway rollback, money
floats, `expo-updates`, `expo prebuild`, Supabase-native features, deploy, restore, rotate, or
messaging (SOURCE-NOTES §5, re-checked against the vendored text on 2026-11-04).

## Web research

None. The survey's web status was `not_needed`, and no URLs were fetched.

## Stale copy outside the package

On 2026-11-04 a first draft of `SKILL.md` was published by mistake as a private claude.ai
artifact (id `74mAEQo1kuM4KD9iKspdLd`). It predates the refuter pass, was never reviewed, and
differs from this package. Treat it as stale; this folder is the only source. [owner] Decide
whether to delete it (deletion needs the owner's confirmation; no agent deletes it on its own)
and record the decision here. Decision as of 2026-11-04: pending.
