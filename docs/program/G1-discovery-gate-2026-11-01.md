# G1 — discovery gate (2026-11-01)

The first Fable gate of the ship program (method: `docs/ORCHESTRATION-DESIGN-2026-10.md`).
Inputs: W1 `fixflow-discover`, run `wf_989263ce-0ef`, coverage 16/16, no nulls, about 1.67M
subagent tokens, 14 min. Per-agent results live in the session scratchpad (`w1-results/`);
this file records the verdicts, not the raw maps.

## 1. What W1 established that changes the picture

1. **No commit since the handoff touched any background, location, queue or sync file**
   (S-06 APK-to-main diff; S-01a F34/F35). For Q1, the code on `main` is the field code,
   except for whichever June/July additions (D5 confirmation, battery exemption, ping cap, the
   14 h / 4 h failsafes) the installed APK predates. W0 settles that with the EAS commit.
2. **The phone and the server disagree on what "inside the fence" means.** The server judges
   fix-overlap, `distance - accuracy_m <= radius_m` (S-03 F5, `derive.py:95`); the phone's
   `evaluateFix` judges the raw point with no accuracy, under a 100 m ceiling against an 80 m
   fence (S-01a F04). A fix the server would accept as inside can be "contradicted" twice on
   the phone, which then suppresses the arrival prompt.
3. **A geofence error is swallowed and never repaired.** On `GEOFENCE_NOT_AVAILABLE` (location
   services toggled) Expo hands the task an `error`; the app handler does `if (error) return;`
   and nothing re-registers until the next foreground (S-01b F24; S-01a F19: no provider check
   anywhere). `addGeofences` has no listeners; `startGeofencing` returns silently with no
   provider (S-01b F27).
4. **Presence and ping queues have no drain trigger.** Presence drains only on the next
   crossing or a ClockScreen retry; pings only on the next ping; neither has an AppState or
   NetInfo trigger, unlike punches and travel (S-01a F21, F36). Parked crossings can sit for
   days even while the app is open.
5. **A headless 401 strands the device.** The token is wiped but `fixflow_tech` stays, so every
   later headless sync runs unauthenticated and the tech is never told (S-01a F22, F24).
6. **The headless budget is softer and stranger than "15 s".** `jobFinished` does not stop the
   JS; the headless React instance is torn down 2 s after the last tracked event finishes, and
   a second concurrent event id is never tracked (S-01b F16, F22). An ENTER with a 20 s dwell
   overlapping an EXIT flap can have its instance destroyed mid-task, before
   `enqueuePresence` runs.
7. **The foreground-service family is settled natively** (S-01b F10, F32, F34, F35) and, per the
   Android docs R-01 fetched, the OS would allow a location foreground service to start from a
   geofence transition or `BOOT_COMPLETED`. Expo's `isForegrounded` refusal is stricter than
   Android, so a fix is possible (native patch, or a foreground re-arm that does not
   short-circuit on `isRunning()`).
8. **Permission decay is real for this fleet.** Android app hibernation resets runtime
   permissions after a few months of no use (R-01); the app never re-asks (S-01a F15); the
   fleet produced 9 punches ever.
9. **The server cannot see a dead sampler.** `_duty_breakdown` returns nothing without a
   clock-out and at least one ping (S-03 F10); no telemetry, view or alert covers it (F26).
10. **Odoo's external API needs the Custom plan.** Standard and One App Free do not include it
    (R-02 F7/F8, Odoo docs and pricing); legacy XML-RPC/JSON-RPC are deprecated from 19.0; API
    keys expire within three months; fair use is about one call per second. **The CSV import
    with External IDs is the default path**; a live push exists only if the owner buys Custom.
11. **The docs' "erp cursor row already exists" is wrong**: 0046 seeds only `whatsapp` (S-04
    F11). `negotiate_bill` and `log_payment` are open to any authenticated principal; a void is
    an in-place flag with no reversal row; `bill_original_paisa` is overwritten on resubmit;
    payment events carry no paisa amount or id in payload (S-04 F4, F6, F10, F26). There is no
    approval boundary today that could serve as "pakka".
12. **Technician ids are fixed slugs** (`t1..t5`, `m1`) seeded by migration (S-04 F32): a fresh
    database accepts the phones' attendance writes; job-linked writes would 404.
13. **MinIO's community repo is archived (2026-04-25)**; R2's free tier is generous and egress is
    free; Cloudflare Tunnel is outbound-only (CGNAT is fine); Docker bypasses `ufw` for published
    ports; `pg_dump` output from 17 is not guaranteed to load into 16 (R-03).
14. **CI-equivalent gates pass locally on Node 24**: web 106 tests, mobile 334 tests, lint,
    format, build, typecheck, `expo export` (S-07a). Backend gates were blocked on the Docker
    engine.
15. **Dependency advisories:** mobile 2 critical / 17 high, almost all in the Expo and React
    Native build toolchain; root `react-router` high (open redirect via backslash, fix
    available). Committed values: the Google Maps key (`app.json`), the Firebase `api_key`
    (`google-services.json`), the Sentry DSN (`eas.json`), recorded by fingerprint only (S-08).

## 2. Hypothesis verdicts

| ID | Verdict | Basis | Owner in W2 |
| --- | --- | --- | --- |
| H1 OEM kill / autostart / force-stop | supported, open | R-01 vendor facts; PendingIntent and broadcast delivery die with a force-stop | O-01 ranks; field protocol |
| H2 headless budget | mechanism refined | S-01b F14-F16, F22: 60 s job deadline, 15 s `jobFinished`, 2 s teardown after the last tracked event, untracked concurrent event | O-01 ranks the flap/teardown loss path |
| H3 radius vs accuracy | settled as a code inconsistency (phone raw point vs server overlap) | S-01a F04, S-03 F5 | O-01 ranks prevalence; the fix is to adopt the server rule |
| H4 fence row | owner / dump | S-03 F29: placeholder -> `null` -> phone stops | W0 |
| H5 session expiry | settled; residual is the headless 401 loop with no UI signal | S-01a F22, F24 | O-03, O-10 |
| H6 unreachable period | W0 | - | owner |
| H7 edge 404 | settled; new: no drain triggers for presence/pings | S-01a F21, F36 | O-03 |
| H8 OEM notification defaults | residual, unverified | R-01 found no primary source | device test (Stage 3) |
| H9 permission decay | strongly supported | R-01 hibernation; S-01a F15 no re-ask | O-01 ranks; fix obvious |
| H10 FGS family | settled natively; OS exemptions make a fix feasible | S-01b F10/F32/F34/F35; R-01 | O-01 (prevalence), fix phase |
| H11 Expo defects | open, now readable | R-01 listed #52544, #49424, #46505, #52230, #50060, #47023 (bodies were 403); `gh` is now authenticated | O-01 reads them |
| H12 / H13 | registered, unchanged | S-06 | O-04 / O-03 confirm or refute |
| H14 APK != main | narrowed: background code identical since handoff | S-06 | W0 for the June/July features |
| H15 baked URL | settled | - | O-08, O-10 constraint |
| H16 location toggle | settled mechanism (error ignored, no re-register, no provider check) | S-01b F24/F27, S-01a F19 | O-01 prevalence |
| H17 OEM background data | open, low priority | not covered | O-01 if cheap |
| H18 silent-kill detection | settled gap | S-03 F10/F26 | O-04 designs the signal |

## 3. Recovery branch

W0 is still with the owner, so the branch is unresolved. W2 runs with `recoveryCase=unknown`;
O-10 treats the keystore match, hostname control and recovery case as parameters and writes
the protocol for all three cases. The G1 rule stands: no phase ships before the drain protocol.

## 4. W2 scope changes against the design

- O-07 keeps Opus; its default branch is now the **CSV External-ID export** (plan gating), with
  the JSON-2 push as an adapter behind a Protocol for a Custom plan. It must also design the
  **approval boundary** that does not exist today.
- O-08 runs now as a Sonnet draft with the box location, domain and ISP as explicit unknowns,
  because the drain protocol needs a backend on an owned domain in every recovery case; MinIO
  is out, R2 stays the media and backup store in the draft.
- O-01 may use the GitHub CLI (`"C:\Program Files\GitHub CLI\gh.exe" issue view expo/expo#<n>`)
  to read the six Expo issues; W1 could not (unauthenticated 403).
- O-03 receives the no-drain-trigger and headless-401 facts as settled and ranks their
  contribution to "offline does not behave".
- The latency decision (Q5) is already visible and will be taken at G2: production is gone and
  the destination is a self-hosted box, so the Supabase region move is moot; any interim cloud
  deployment must co-locate DB and backend; the ADR's cutover runbook is replaced by the
  self-host cutover.

## 5. Owner-decision form (issued at G1)

Odoo: (1) does the org exist, and on which plan? The external API needs Custom; Standard means
CSV import only. (2) Which records are "pakka": payments only, bills, materials, payroll,
advances? (3) Who approves and at what unit: per payment, daily close, weekly close?
(4) Full-fidelity export by default, or selective declaration (your explicit call)?
(5) Tax regime and chart of accounts. (6) Customer mapping: per-customer partner, or one cash
partner.

Self-host: (1) Where does the box physically sit? (2) Hardware, UPS, ISP, CGNAT vs static IP
(compare the router WAN IP with the public IP). (3) The owned domain for the Tunnel and the
APK. (4) Which externals stay: R2 is recommended; FCM; Sentry or GlitchTip. (5) RPO/RTO and who
answers the phone. (6) Do the web and ops consoles move too?
