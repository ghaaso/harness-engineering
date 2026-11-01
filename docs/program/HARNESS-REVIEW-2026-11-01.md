# Harness and architecture review (2026-11-01)

The fifth verification pass of the ship program, run before P0a at the owner's request: "before
starting work we need to optimize how we perform the work." It answers six questions the owner
asked, records what a four-lens architecture panel found, and sets the plan to **v6**. Method:
`docs/ORCHESTRATION-DESIGN-2026-10.md`. Provenance: workflow `wf_07e89689-064`, 101 agents
(94 completed, 7 refuters lost to a usage limit), about 10.1M subagent tokens, 34 minutes. Lanes:
four architects (Opus, xhigh, one lens each), two judges (Opus, xhigh; one skeptical of change,
one skeptical of keeping), 45 falsifiable claims each attacked by two Opus refuters (one from the
code, one from operations), a Sonnet tooling researcher with an Opus judge, two Opus reviewers of
the owner's clinic harness (adoption-maximalist and overhead-skeptic), and one Opus audit of this
session's own transcript for compaction loss. The main session (Fable) judged; rulings are
labelled **HR-…** and are binding on the plan from v6.

---

## 1. The six questions, answered

**Q1. Is the location tracking and geofencing code flawed?** Yes, in specific, code-verified
ways, on top of the environmental causes (dead host, OEM kills, permission decay). The
mechanisms are the right ones for Android: a passive OS geofence as the arrival prompt, a
foreground-service sampler only during the duty window, time-bounded privacy, the server as the
judge. The implementation breaks them:

| What | Where | Status |
| --- | --- | --- |
| Two different "inside" rules: phone judges the raw point under a 100 m ceiling, server judges fix-overlap under 200 m | `geofence.ts:89-113` vs `derive.py:94-95`, `config.py:54` | `O01-F04`, confirmed |
| A 20 s dwell plus a second GPS read, neither with a timeout, inside a headless job whose 15 s `jobFinished` timer and 2 s teardown make it fragile | `geofence.ts:58,122-134`; `location.ts:31-33`; `TaskService.java:52,196-218` | `O01-F05`, narrowed (§3) |
| Debounce stamp written before the crossing is recorded | `geofence.ts:164-176` | `O01-F10` |
| Geofence error swallowed, no re-register, no provider check | `useAttendanceBackground.ts`; G1 §1 item 3 | `O01-F03` |
| Sampler loses its foreground service after any restart; `isRunning()` never repairs it | `pingTracker.ts:185` | `O01-F01` |
| **New:** both location tasks share one `LocationTaskService`; ending a travel leg calls `stopForeground(true)` + `stopSelf()` on it, stripping the on-duty sampler's foreground state for the rest of the shift | `LocationTaskService.kt:49-52`; `LocationTaskConsumer.kt:62-64,226-228`; `travelTracker.ts:214-220` | **`O01-F20`**, code-confirmed by two refuters, device-unverified |
| Workshop Wi-Fi BSSID is captured on every crossing and punch but never feeds the verdict; a redacted BSSID would be stored as a miss | `service.py:1005-1006,1032-1033`; `wifi.ts:18-31` | **`O04-F18`** |
| Presence and ping queues have no drain trigger; a parked punch stops the sampler | G1 §1 item 4; `O3-F2` | confirmed |

**Q2. Have we reviewed the architecture, and are there better approaches?** Until today, no:
G1/G2 found defects and took three decisions; the plan repaired the current design in place. The
panel reviewed four areas against named alternatives (§2). Verdict: **no wrong foundation**;
eight of nine sub-areas are "sound but suboptimal" and one ("the phone as a second judge") is
wrong. Every change the panel recommends fits inside existing waits and none delays the fleet
drain. The one design question still open after this pass is whether a commercial background-
location SDK beats patched Expo on the fleet's phones; that is a one-session trial, not a
decision anyone can make from a desk.

**Q3. Call graph and graphify.** No call-graph tool is in use. The repo has import-boundary
contracts (import-linter on the backend, ESLint on the web, nothing on mobile), a hand-written
`docs/CODE-MAP.md`, and a Haiku locator agent. Graphify is **skipped** (§5): discovery is the
phase this program has finished, the hot-path call sets are small enough for grep, the hook would
nudge every Grep/Read of every parallel agent, the graph goes stale under the cherry-pick-only
release branches, and the package (`graphifyy`, version 0.9.100 released today, issues past
#4900) fails the program's own two-weeks-old rule. The one gap it exposed is real: **mobile has no
boundary enforcement**, so the invariant "never fetch a write outside the outbox" is prose. That
becomes a dependency-cruiser rule in CI (P5b).

**Q4. The clinic tasks folder.** It is the record of a month spent building and measuring an
agentic-coding harness in the owner's other repository. Its useful transfer to FixFlow is
**conventions, not machinery** (§4): eight cheap rules go into the plan's §0 and two phases; its
Python tooling, hooks, checkpoints and measurement pipeline are skipped. Its best lessons are
about verification that goes green without testing anything (RT-01..RT-05), which this program
is exposed to in two places and now gates.

**Q5. Optimise before starting work.** Done by this pass: plan v6, the harness rules in §0, the
evidence folder, the owner view, a corrected memory file. Nothing else is worth doing before P0a.

**Q6. Compaction: are we losing data?** Measured on this session's transcript (§6): two
compactions, the first at 971k tokens (131 s pause) down to 22k, the second an idle compaction
at 580k. **Nothing lost caused a mistake or re-work.** Every user instruction, decision and file
change in both windows is in the summaries or durable in the repo or memory; both summaries got
the very latest state wrong ("nothing committed yet"), and the verbatim tail Claude Code keeps
after a summary corrected both. Two small real losses: the idle summary closed the "skills
wishlist" loop the owner reopened today, and the memory file carried a stale next step. The real
cost of long sessions is money and latency, not information: before the first compaction every
call re-sent up to 944k tokens. The owner's `autoCompactWindow: 400000` is keyed to
`claude-opus-5-5` and **does not apply** to this `claude-fable-5-1` session. Resolution is
procedural, not tooling: one phase per new session (the plan already says so), state in the repo,
the two §0 rules below. The owner's clinic context system is not installed (never run live,
Python-based, undocumented hook behaviour) and stays in its own repository per the owner's
2026-11-01 decision.

---

## 2. Architecture panel: verdicts and rulings

Areas: A1 background presence and on-duty location; A2 offline engine; A3 hosting; A4 the Odoo
hand-off. Scores are the two judges' 0–10 marks per lens. Refuter outcomes narrow or kill the
claims the recommendation rests on; the ruling is what survives.

### HR-A1a — the phone stops judging; delete the dwell (change now, P5a + P6a)

Panel: judge 1 "wrong → change_now", judge 2 "sound_but_suboptimal → change_now". Refuters:
"the 15 s timer kills the job" was **refuted** (it only calls `jobFinished`, releasing the
wakelock; the JS is torn down 2 s after the last tracked event), so the dwell overrun is a
fragility, not a certain loss; "removing the dwell keeps the handler inside its window" was
**refuted** (four other awaits and an untimed GPS fix remain); "fewer than one false ENTER per
day at ≥ 100 m" is **unmeasured** (P4a cannot produce it); "nothing downstream reads the phone's
`confirmed` flag" **survived** (write-only, echoed in `PresenceItem`).
**Ruling.** Delete the 20 s re-check and the second fix. One bounded fix per crossing:
`getLastKnownPositionAsync` (max age 2 min, accuracy ≤ 100 m), else `getCurrentPositionAsync`
under an 8 s timeout, else null coordinates. Enqueue the presence row **before** the fix
resolves; write the debounce stamp after the enqueue; prompt on every ENTER unless the single
fix is definitively outside under R1; EXIT hysteresis filters prompts only. Ruling R1 is
unchanged (one three-state rule, built in P6a); what changes is that the phone applies it only
to suppress, and the server recomputes every row. Net cost ≤ 0 sessions (P5a deletes code).

### HR-A1b — keep Expo; fix the new cross-stop; the SDK spike is the owner's call (trial first)

Panel: both judges "trial_first". Refuters: the cross-stop prediction **survived** twice at code
level (deterministic in `expo-location` 18.0.10; unverified on a device); "P4a attributes gaps to
engine causes rather than OEM kills" was **refuted** (P4a has not run; its 55-minute one-phone
protocol cannot produce that attribution, though steps 2–3 do separate a restart loss from a
kill); whether Transistorsoft's current release builds on SDK 52 / RN 0.76.9 old-architecture is
**unknown** (never tried here; plausible); "its kill and gap rates are materially lower" is
**unmeasured on both sides**.
**Ruling.** (1) `O01-F20` enters the register at P1 and P5a's scope: after `stopJobTravel` while
on duty, the ping task re-asserts its foreground service; P5c verifies with `adb shell dumpsys
activity services` (`isForeground=true` after a travel leg ends). Consolidating the two tasks
into one mode-switching sampler is allowed but not required. (2) The commercial-SDK question is a
**§4 owner decision**: a one-session debug-build spike on the spare phone during the P4a waits
(no licence needed in debug), decided at P5b entry. Recommended **yes**, because the cost
asymmetry is large (a swap after v2 is fleet-wide costs 4–6 sessions plus another install round)
and the spike is one session; declined, the patched-Expo path stands as planned. The licence
cost is not verified here and is the owner's to check.

### HR-A1c — two more presence signals (change now, P6a + P5b, premises checked in P0a)

Panel: both judges "change_now". Refuters: `expo-notifications` 0.29.14 WEEKLY triggers on
AlarmManager with boot re-arm and no new native config **survived**; "fleet phones join the
workshop Wi-Fi and report a real BSSID" is **unverified** (no production data; redaction
`02:00:00:00:00:00` is possible); "the owner accepts a time-based nudge" is **unrecorded**;
"a daily trigger survives a swipe from recents on the dominant OEM" is **unknown** (the OEM
roster is a P0a item).
**Ruling.** P6a adds the server-side rule: `wifi_match=true` against the fence's existing
`wifi_bssids` column promotes a punch or crossing to inside after the GPS rule; a redacted BSSID
is stored as null. Inert until P0a item 14 records the BSSIDs, so it costs nothing if the premise
fails. P5b adds the shift-start reminder (working days from the cached shift, cancelled by the
clock-in punch, rescheduled on foreground and login, a pure scheduling function with Jest tests)
as a §4 decision with default **yes**. The geofence remains the instant prompt. The P0a form
gains the Wi-Fi question.

### HR-A2 — keep the hand-rolled engine; two seams now, one engine after ship

Panel: unanimous "keep, unify after ship" (offline-sync lens 9/10 from both judges). Refuters:
"one JS VM, so the per-store mutex prevents lost updates" — premise survived (one process, one
React instance), conclusion **refuted** (`sendOrQueue`'s live send bypasses the flush guard;
the known defect in CLAUDE.md stands); "P2b-1 records the byte size" was **refuted** (it does
not; the 6 MB AsyncStorage cap is real and unmeasured); "no cross-queue divergence after P2a's
classify" was **refuted** (the pending-media queue keeps its own ladder: 413 special case, park
by forcing `attempts`); "no replicated read model needed before P14" **survived**.
**Ruling.** Sync engines are rejected on the merits: every offline write here is a command to a
server-owned guarded state machine (`try_transition`, the bill freeze, `client_id` dedupe), and
PowerSync, ElectricSQL, Zero and WatermelonDB either route writes through the same API code or
replace command semantics with row conflict resolution. Now, at zero extra cost: P2a step 1
becomes one pure `classify(error, kind)` returning an outcome from a per-kind policy table that
every loop calls, **pending media included** (`O3-F22`); P2b-1's manifest records the phone's
total AsyncStorage bytes (`O10-F17`). After P5d-2, riding the P14-fleet install: the six queues
collapse into one durable command log (expo-sqlite) with one dispatcher, single-flight per stable
id for live sends and replays (closing the known defect), one classifier, a per-kind park/drop
policy and one trigger set. Not before the drain: it would invalidate the drain tooling.

### HR-A3 — VPS primary for the drain window; the box after a readiness gate (change now, P0b)

Panel: three lenses and both judges "change_now" (VPS primary), one lens "keep with an explicit
trigger". Refuters: "the candidate box cannot stay powered" was **refuted as a fact** (no box
exists; P0b is unticked) and **survived as a gate** (the plan requires only "a Linux host with
SSH"; second uplink defaults to none); "a Mumbai/Singapore/EU VPS meets p95 < 805 ms" is
**unmeasured**, and the only Karachi measurements on record (ADR-0001: Singapore 1.20 s, EU
1.03 s warm RTT via Railway) argue against Singapore and the EU, leaving Mumbai as the first
candidate; "the owner can pay a foreign recurring bill" is an **assumption** the current design
already rests on (R2, Cloudflare, Sentry).
**Ruling.** The host-agnostic decisions of G2-D2 stand (owned domain, portable compose, R2
off-box, co-located DB). The default primary from P3b through P5d-2 is a **2 vCPU / 4 GB VPS**
(Mumbai measured first in P3c, then Singapore), because after a landed write the phone deletes
its copy and the drain host is forward-only (O-10 R2), so the host that receives the drain must
be the most reliable one available, not the one with the best latency. The home box becomes
primary by a tunnel move after `T_close` once a 14-day heartbeat shows ≥ 99.5 % reachability
or a second uplink exists, and the owner may invert the default at P3b if a box with UPS covering
box, ONT and router already exists. Regardless of host: an hourly `pg_dump` to R2 from the first
drain on, and a manual dump after every phone's P4b row. Recurring cost about USD 5–15 a month.

### HR-A4 — the Odoo hand-off: decide before building; two unconditional fixes

Panel: both judges "trial_first" for the shape, "keep" for Odoo Online + CSV (self-hosted
Community verified in the odoo/odoo 19.0 source to ship the API free, but it lacks the
Enterprise accounting reports, adds a second stateful app to one developer's host and would put
the pakka books in the same failure domain as the kacha books), "keep" for the kacha source
model (event-sourcing the money journal rejected at 9 lifetime payments). Refuters:
`negotiate_bill`'s check-then-set race against a concurrent close **survived** twice (no row
lock, no status predicate, READ COMMITTED), and `log_payment` has **no closed check at all**
today; "no Odoo org / accountant / chart confirmed" **survived** (every record treats them as
open); "the developer has spare sessions so P9a-1 in parallel costs nothing" was **refuted**
(P7a→P8a→P8b→P9a-1 are four Docker-gated Opus PRs coupled to the P4c train); "techs hold cash
before remitting" is **unverified as a premise** but "FixFlow records nothing about a hand-over"
is **code-verified** (`job_payment` has no custodian, destination or remitted state; no
remittance concept anywhere); "cash basis, no sales-tax registration" is an **open owner
question** the owner's own notes lean toward. Four refuters on A4b/A4c did not run (usage limit):
those claims stay as owner questions, not findings.
**Ruling.** (1) P7a makes the closed-job guards atomic (`O07-F16`): a conditional UPDATE with
the status predicate or `SELECT … FOR UPDATE` in the same transaction, with a race test. (2) A
new owner phase **P9-0** gates P9a-1: answer the G1 Odoo questions, open an Odoo test company
on the Pakistani chart, export one real week into the O-07 CSV shape with a half-session script,
import it twice, and let the accountant choose granularity and the approval unit; P9a-1 also
waits for P5d-2 so the accounting chain never competes with the fleet work. (3) If P0a item 15
confirms that technicians hold field cash or online receipts, O-07 gains a manager-recorded
`cash_remittance` source with `cash_with_staff[tech]` and `receipts_clearing` accounts
(`O07-F17`); the invoice kind waits for a basis decision. (4) P8b routes every `job.bill_*`
write through one service function that appends `job_bill_revision` in the same transaction.
(5) Odoo Online + CSV stays the default; self-hosted Community is recorded as the option if a
live push or the parked connector product ever matters.

---

## 3. Register addendum (G2 §2 numbering continues; status codes as in G2)

| Id | Sev | Status | Claim | Owner |
| --- | --- | --- | --- | --- |
| `O01-F20` | P1 | C (two refuters, code) | Ending a job-travel leg strips the shared `LocationTaskService` of foreground state; the on-duty ping sampler then runs throttled until the next foreground | P5a fix, P5c check |
| `O04-F18` | P2 | C | `wifi_match` is computed on every punch, crossing and ping but never feeds `inside`; a redacted BSSID would be stored as a miss | P6a |
| `O3-F22` | P2 | C | The pending-media queue keeps a private error ladder (413 special case, park by forcing `attempts`) outside the shared classifier | P2a |
| `O10-F17` | P3 | C | The drain manifest records no storage size; the 6 MB AsyncStorage cap is unmeasured on every phone | P2b-1 |
| `O07-F16` | P1 | C (two refuters) | `negotiate_bill` is check-then-set with no row lock; a close that commits between load and flush is overwritten; `log_payment` has no closed check today | P7a |
| `O07-F17` | P1 | G | No record of field-cash custody or hand-over; O-07 books tech-collected cash straight into the till account | P9-0, O-07 |

`O01-F05` is narrowed: the 15 s timer releases the job's wakelock without stopping the JS; the
loss path is the 2 s teardown after the last tracked event plus untimed GPS reads, which HR-A1a
removes. The amendments to the W2 notes are appended to `w2/O-01`, `O-03`, `O-07` and `O-08`.

---

## 4. The clinic harness: what transfers

Two reviewers read all eight task folders, the context system, the workflow CLI, the templates,
the human-view design and the upstream disposition, then argued opposite cases. Rulings:

| Mechanism | Ruling | Where it lands |
| --- | --- | --- |
| Draft PR body starts with `Plan @ <sha>`; resume runs `git diff --stat <sha>..origin/main -- docs/program/` and re-reads changed sections | **adopt** | plan §0 Resume |
| A "Decisions / ruled out / owner corrections (this phase)" list in the draft PR body, appended when they occur | **adopt** | plan §0 Resume |
| Reviewer verdict bound to the PR head SHA; fail-before/pass-after named per register id; changed expectations, removed assertions and new skips listed | **adopt** | plan §0 Routing |
| Phase-closing message answers six questions (goal, fit, choice, before/after, evidence incl. skipped counts, remaining) | **adopt** (as a message format, not a file) | plan §0 Resume |
| Skip-aware gates: `pytest -rs --junitxml`, fail when integration tests were skipped (`backend/tests/conftest.py:65-69` skips them all when `FIXFLOW_TEST_DATABASE_URL` is unset); mobile CI drops `--passWithNoTests` | **adopt** | P1 deliverables, design Appendix A |
| CI check that CLAUDE.md's Alembic head equals the `down_revision` chain head and every path CLAUDE.md names exists | **adopt** | P1 deliverables |
| Commit the W1/W2 raw outputs that the register cites (they lived only in a %TEMP% scratchpad) | **adopt** | `docs/program/evidence/` with a sha256 manifest |
| Memory file as a pointer, not a state restatement (it carried a stale next step) | **adopt** | memory rewritten |
| One-page owner view with a diagram, derived from the plan, refreshed at phase close | **adopt** | `docs/program/OWNER-VIEW.md` |
| `docs/tasks/<id>/task.md` state-owner tree; context.md projections; evidence JSON with before/after hashes; preservation manifests | skip | FixFlow already has one owner per kind of state (plan, PR body, W0-results, git) |
| Python checkpoint hashing and `resume` freshness | skip (git version adopted above) | — |
| Pre-commit verification hook | skip (RT-04/05 defects; CI gates the PRs) | — |
| Context system (PreCompact snapshot, SessionStart restore, recall, large-read admission) | skip | never run live; Python; undocumented PreCompact behaviour; owner decision 2026-11-01 keeps it in its repo |
| A `SessionStart(compact)` hook printing branch, last commits and the resume pointer | skip for now | one phase per session makes compaction rare; the exact JSON is in §6 if a phase session compacts mid-phase |
| Measurement pipeline M00–M06; evaluation-run schema | skip | a month of research established no gain; owner priority low |
| Doctor script | skip | P0a item 10 covers tools; one fact corrected instead: a Python 3 interpreter exists at the Codex runtime path (`C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe`), so "no Python on this machine" in the design doc and memory was wrong |

Lessons carried into the plan without a mechanism: an "accepted" row must never sit beside a
failed AFTER check (RT-03; standing rule 1 already depends on this); decisive checks in
`drain_audit.py` use `if/raise`, never bare `assert` (RT-02); P1's "manual boot with no env
fails closed" test runs in a cleaned environment (RT-05); unknown is recorded as "unknown",
never 0, in every W0-results table (RT-06); verify a plan rewrite by content, not by commit
message (this program's one recorded state loss, 093b793); write the gate record before
dispatching the next workflow; allocate a capped verification budget by priority, not
first-come (G2 lost its skeptics to the first four analysts).

---

## 5. Graphify and call graphs

Facts (Sonnet, web + repo): `graphifyy` 0.9.100 on PyPI (released 2026-11-01, Apache-2.0,
Python ≥ 3.10); code parsed locally with tree-sitter for about 40 languages including Python,
TypeScript/TSX and JavaScript; docs and PDFs go through an LLM; a PreToolUse hook nudges the
assistant toward graph queries before search-style calls and, on Claude Code, before Reads;
updates by git hook, `watch` or `--update`; open Windows and monorepo issues; repo size here
about 56k lines (141 Python, 138 TS/TSX, 111 JS/JSX files). Verdict (Opus): **skip**. Reasons in
Q3 above. Trial design, should the owner still want evidence: a throwaway clone after P2a merges,
pipx-isolated, a version at least 14 days old, code-only, no `graphify install` and no git hook;
ten fixed questions answered by a Sonnet agent with grep/ast-grep as ground truth; keep it only if
it finds a caller grep missed. Better alternative, adopted: **dependency-cruiser** in
`technician-app` with rules mirroring the backend import-linter contracts plus "no raw write
`fetch` outside `lib/outbox*`, `features/*/sync*` and `pendingMedia`", run in CI beside the
mobile job (P5b).

---

## 6. Compaction audit of this session

| Boundary | Trigger | Before → after | Pause | Summary quality |
| --- | --- | --- | --- | --- |
| line 1944 | auto, at 971,158 tokens | 971k → 22k (948k dropped) | 131 s, synchronous | complete on instructions, decisions and files; wrong about the latest commit state, corrected by the verbatim tail |
| line 2735 | idle (precomputed summary, 6.5 h old) | 580k → 12k | 34 ms | dropped the open "skills wishlist" loop; wrong about the closing message, corrected by the tail |

Growth: window 1 about 8k tokens per call over 108 calls (68 % tool results, 26 % Write/Edit
payloads and workflow scripts); window 2 about 10.7k per call. Cost: 50.3M cache-read tokens
before the first boundary. Config facts (docs, verified this run): `autoCompactWindow` is keyed
per canonical model id under `modelSettings`, the owner's entry names `claude-opus-5-5` only;
`autoCompactEnabled` default true; `idleCompaction` default true (threshold 200k tokens);
PreCompact can only block, `custom_instructions` is null for auto; PostCompact receives the
summary; `SessionStart` with `source: compact` adds plain stdout or `additionalContext` (10,000
characters) to context.

Rulings. **HR-C1:** one phase per new session; this session ends after this pass and P0a starts
fresh. **HR-C2:** the two §0 rules above (plan sha and decisions list in the PR body) are the
compaction defence. **HR-C3:** no PreCompact hook, no context-system install, idle compaction
left on. **HR-C4:** a Fable-keyed window is not set now; if a phase session is observed past
500k, add `"claude-fable-5-1": {"autoCompactWindow": 500000}` beside the Opus entry in
`~/.claude/settings.json`. **HR-C5 (deferred, exact text):** should a phase session compact
mid-phase, add to `.claude/settings.json`:

```json
{"hooks":{"SessionStart":[{"matcher":"compact","hooks":[{"type":"command","command":"cd \"$CLAUDE_PROJECT_DIR\" && echo \"Resumed after compaction on $(git branch --show-current) at $(git rev-parse --short HEAD). Read docs/program/SHIP-PLAN-2026-11.md section 0, then the current phase's draft PR checklist (gh pr view) or W0-results step table.\" && git log --oneline -3"}]}]}}
```

---

## 7. What v6 changes in the plan

§0 Resume and Routing (four harness rules); header and §6.6; P0a items 14–16 (workshop Wi-Fi,
cash custody, books basis); P0b and §4 (VPS primary default, box readiness gate); P1 (skip-aware
gates, CLAUDE.md head check); P2a (classify outcome incl. pending media); P2b-1 (storage bytes);
P3b (host wording); P3c (region order, hourly dumps, post-drain dump); P5a (single bounded fix,
dwell deleted, `O01-F20`); P5b (shift reminder, dependency-cruiser, SDK decision point); P5c
(dumpsys check); P6a (Wi-Fi rule); P7a (atomic guards); P8b (single bill-write function); new
**P9-0**; P9a-1 entry; P9a-2 kinds; §4 new rows. Rulings R1–R10 are unchanged. The W2 notes
carry dated amendment sections; their original text is untouched.
