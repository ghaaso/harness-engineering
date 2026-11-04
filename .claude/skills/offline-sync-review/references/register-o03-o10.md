<!-- Authored for FixFlow, 2026-11-04 -->
# O-03 / O-10 register rows this skill reviews against

Source rows live on PR #182 (head 3415b5e): `docs/program/evidence/w2/O-03.txt`,
`docs/program/evidence/w2/O-10.txt`, `docs/program/G2-deep-dive-gate-2026-11-01.md` §2
(lines 133-153), `docs/program/HARNESS-REVIEW-2026-11-01.md` §3 (line 240), and the plan's
coverage table `docs/program/SHIP-PLAN-2026-11.md` §5 (lines 1330-1333). Line numbers below
refer to that head. Titles are compressed; read the row before citing it.

**Line-drift warning (checked 2026-11-04 against worktree `main` @ a31924a).** Several
`path:line` citations inside the evidence files do not match a31924a, for example
`O-03.txt:101` cites `technician-app/src/lib/api.ts:149-152` for the 401 path, which is
`api.ts:111-114` here; `O-10.txt:55` cites `api.ts:158-159` for the 204 return, which is
`api.ts:120-121` here; `O-03.txt:38` and `O-03.txt:60` cite `attendance/sync.ts:236-249` and
`pingSync.ts:162-170`, but those files are 179 and 82 lines long. G2 recorded such citations
as `MOVED` (line drift only, G2:39-41). Re-locate every evidence citation by symbol before
quoting it; never copy an evidence line number into a finding.

## O-03 — offline-sync-correctness (`O-03.txt`)

| Id | Line | Title (compressed) | Closing phase (plan line) |
| --- | --- | --- | --- |
| O3-F1 | 20 | Online job writes against the dead edge refused at tap time, never queued | P2a step 2 (:400) |
| O3-F2 | 33 | Parked punches drive `dutyStatus`; on-duty pings stop after every landed clock-in | P2a step 3 (:401, :1330) |
| O3-F3 | 53 | Clock screen and background sampler disagree about duty while a punch is parked | P2a step 3 (:401) |
| O3-F4 | 64 | Retrying a stale parked punch/crossing lands it on today's attendance day | P2b-1 step 6 (:438-439) + P4c (:1331) |
| O3-F5 | 75 | Pending media parked by one 404 is stuck forever, no UI, no retry | P2b-1 step 7 (:442) |
| O3-F6 | 86 | Proxy 5xx during an origin outage counts toward the poison cap and parks real writes | P2a step 1 (:391) |
| O3-F7 | 97 | Headless 401 clears the token but leaves the tech "signed in" to the privacy gates | P2a step 4 (:402-403) |
| O3-F8 | 108 | A 401 on a live tap discards the write instead of pausing it | P2a step 2 (:400) |
| O3-F9 | 119 | Presence, ping and offline-punch queues lack app-wide drain triggers | P2a step 5 (:404-405) |
| O3-F10 | 130 | Stable location outbox id deletes an unsent punch from an earlier trip | P2a step 8 (:406-407) |
| O3-F11 | 139 | A queued depart hides ARRIVE; a re-tap replaces the depart | P2a step 8 (:406) |
| O3-F12 | 150 | A failed offline create and its voice notes cannot be reached | P2b-1 step 7 (:442) |
| O3-F13 | 161 | Discard copy says the server rejected an edge-404 record | P2b-1 step 6 (:440) |
| O3-F14 | 171 | Paused or unauthenticated queues are never shown as such | P2a step 10 (:409) |
| O3-F15 | 181 | The two drains are unordered; the uploaded voice id is never written back | not assigned in the plan (G2:153 P3 band) |
| O3-F16 | 192 | An offline-painted job list never repaints on reconcile | P2a backlog (:419) |
| O3-F17 | 202 | A corrupt v2 outbox or attendance queue is overwritten with `[]` | P2a step 9 (:408) |
| O3-F18 | 213 | `sendPunch` reports a queued arrival as "Arrival recorded" | P2a step 10 (:409-410) |
| O3-F19 | 222 | Arrival anchor is the first-ever arrive punch | P2a backlog (:419) |
| O3-F20 | 231 | No server-evidence fallback for after-video or remark | P2a backlog (:419) |
| O3-F21 | 240 | The offline banner counts other technicians' items | P2a backlog (:419) |
| O3-F22 | HR:240 | Pending-media queue keeps a private error ladder outside the shared classifier | P2a step 1 (:395) |

O-03 backlog rows worth re-checking in any queue PR (`O-03.txt:250-255`): missing selfie file
throws a non-ApiError and blocks every later punch; presence queue has no cap; no bulk
Retry/Discard; the 1000-row ping cap evicts silently.

## O-10 — fleet-drain-protocol (`O-10.txt`), the rows this package carries

| Id | Line | Title (compressed) | Closing phase |
| --- | --- | --- | --- |
| O10-F1 | 18 | The field APK cannot produce the per-phone BEFORE counts the drain proof needs | P2b-1 (:1332) |
| O10-F2 | 29 | Rows parked during the outage stay parked after any classifier fix; recovery is per-row Retry | P2b-1 (:1332, D3 un-park :433-434) |
| O10-F3 | 40 | A 503 stub on the old hostname parks every queued item after five flushes | P3a stub modes, P3c step 4 (:1333); rule 5 (:105-110) |
| O10-F4 | 51 | Any 2xx JSON or 204 from the old hostname deletes queued items as "landed" | P3a, P3c step 4 (:1333); rule 5 (:105-110) |

Related O-10 rows a reviewer meets in the same files (not this package's register, cite them
only by id): O10-F8 (selfie throw stalls the punch drain, P2b-1 :443-444), O10-F10 (queues
drain only under their owner's session, P2b-1 :435-436), O10-F17 (manifest records no
storage size; Android AsyncStorage cap 6 MB, P2b-1 :431-432).

## O-10 rollback rules that bound any drain-time change (`docs/program/w2/O-10-design.md`)

- R3 (:106): the mid-drain abort lever is cutting the tunnel route; never abort with app
  4xx/5xx or a 2xx stub.
- R4 (:107): if an app-origin 5xx appears, cut the tunnel before five flushes (`MAX_ATTEMPTS`).
- R6 (:109): manifest upload failed means no drain. R7 (:110): an AFTER mismatch on the pilot
  phone halts the fleet.
- A1 (:6): technicians are told not to uninstall, clear storage, Discard, Retry or log out.
  Telling them is an [owner] step.
