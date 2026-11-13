<!-- Authored for FixFlow, 2026-11-04 -->

# Selectors the flows use, the strings a flow must never tap, and the missing testIDs

Read against `main` @ a31924a (technician-app). `grep -rn "testID\|accessibilityLabel"
technician-app/src` returned **0 hits** on 2026-11-04, so every flow selects by visible text.
Maestro treats `text` as a regex ("Since `text` and `id` are regex-based by default", WEB
https://docs.maestro.dev/api-reference/selectors fetched 2026-11-04), so `+ ? ( ) .` are escaped
and emoji-prefixed labels are matched with a leading `.*`. Whether a text selector also matches a
TextInput's placeholder (hint) is **not stated** on that page: the `"••••"`, `"Name"`, `"0\\.00"`
and address/problem placeholders are INFERRED to work and the first run on a phone confirms them.

## Selectors in use (string → file:line)

| Screen | Selector | Source |
| --- | --- | --- |
| Login | `Technician sign-in` | `technician-app/src/features/auth/LoginScreen.tsx:64` |
| Login | `${MAESTRO_FIXFLOW_TECH}` (roster name) | `LoginScreen.tsx:85` |
| Login | `••••` (PIN placeholder) | `LoginScreen.tsx:99` |
| Login | `Log in` / `Wrong PIN, or login failed.` | `LoginScreen.tsx:112` / `:56` |
| Onboarding | `Never forget to clock in` (flows stop) | `features/onboarding/OnboardingScreen.tsx:61` |
| Dashboard | `Welcome back,` / `Jobs` | `features/dashboard/DashboardScreen.tsx:50` / `:71` |
| Banner | `N change(s) saved offline — syncing when reconnected…` / `… need attention (see the job) …` | `technician-app/App.tsx:46` / `:45` |
| Jobs hub | `Task Management` / `On-Going Tasks` / FAB `+` | `features/jobs/JobCategoriesScreen.tsx:19` / `:46` / `:67-68` |
| Lists | `ACTIVE ON-GOING JOBS` / `AWAITING HANDOVER / PICKUP` / `Offline — showing last synced data (…)` | `features/jobs/JobsListScreen.tsx:235` / `:243` / `:209` |
| Intake 1 | `Who`, keypad digits, `Name`, `Next` | `create-job/CreateJobStep1Screen.tsx:78`, `:146-148`, `:119`, `:162` |
| Intake 2 | `What's the issue?`, appliance chip, brand chip, `Type`, problem placeholder, `Next` | `create-job/CreateJobStep2.tsx:289`, `:300-301` (fallback list `:10`), `:318` (fallback `:11`), `:338`, `:352`, `:372` |
| Intake 3 | `Where & how`, `Home visit`/`Carry-in`, address placeholder, `📍 My location`, `Pin set — …`, `Today 4-6`, `Next` | `create-job/CreateJobStep3.tsx:118`, `:122`, `:175`, `:160`, `:165`, `:235`, `:267` |
| Intake 4 | `Estimate & Approval`, `0.00`, `WhatsApp updates`, `Create Task` | `create-job/CreateJobStep4.tsx:42`, `:50`, `:92`, `:113` |
| Intake result | `Saved offline` alert | `create-job/CreateJobWizard.tsx:183` |
| Job detail | `WORKSHOP WORK`, `📋 Open Job Wizard`, `🚀 START TRAVEL` | `features/jobs/JobDetailScreen.tsx:548`, `:567`, `:543` |
| Travel | `Punch out of the workshop — …`, `🚀 START TRAVEL`, `I HAVE ARRIVED`, `Arrival recorded`, distance error | `features/jobs/TravelScreen.tsx:453`, `:461`, `:482`, `:241`, `:229` |
| Wizard 1 | `1 / 6`, `Capture Serial Plate`, `Condition Snap (n of 2)`, `Is there an error code?`, `No`, `Record Before-Video`, `Evidence Secured`, `Continue to Voice Summary` | `arrival-job/ArrivalCapturesScreen.tsx:271`, `:202`, `:210`, `:219`, `:225`, `:249`, `:257`, `:333` |
| Wizard 2 | `Voice summary`, `Summary Recorded`, `Done` | `arrival-job/ArrivalJobStep2.tsx:195`, `:247`, `:266` |
| Wizard 3-4 | `Diagnosis`, `skip — codes stay optional`, `Materials`, `Next` | `arrival-job/ArrivalJobStep3.tsx:65`, `:150`; `ArrivalJobStep4.tsx:130`, `:180` |
| Wizard 5-6 | `After-video`, `Record After-Video`, `After-video captured`, `Continue to Outcome & Time`, `Outcome & time`, `Repaired`, `Submit → bill opens` | `arrival-job/ArrivalAfterVideoScreen.tsx:99`, `:116`, `:122`, `:150`; `ArrivalJobStep5.tsx:77`, `:13`, `:164` |
| Bill | `Bill · job #…`, `Done — back to dashboard` | `arrival-job/ArrivalJobBillScreen.tsx:448`, `:678` |

Paths without a prefix are under `technician-app/src/features/jobs/`.

## Strings no flow may tap (each is a write a smoke must not make)

| String | Source | Why |
| --- | --- | --- |
| WhatsApp consent `Switch` (no text) | `create-job/CreateJobStep4.tsx:97` | the only input to the consent gate, default OFF (`CreateJobWizard.tsx:73-82`) |
| `Send on WhatsApp`, `Acknowledge intake`, `Ready for pickup` | `ArrivalJobBillScreen.tsx:674`; `JobDetailScreen.tsx:895`, `:906` | messaging a customer is `[owner]` |
| `Close job — record handover video`, `Close + video`, `Mark Ready`, `Abandon job (nothing to bill)…`, `Put on hold`, `Convert to carry-in (haul to shop)` | `ArrivalJobBillScreen.tsx:650`; `JobDetailScreen.tsx:658`, `:642`, `:702`, `:964`, `:992` | lifecycle transitions on a real job; a smoke stops at the bill |
| `Correct it and send again` | `arrival-job/ArrivalAlreadyDoneScreen.tsx:90` | a completion resubmit over a real bill (CLAUDE.md bill freeze) |
| `Retry` / `Discard` on a failed item | detail screens (`App.tsx:33-34` comment) | O-10 A1: "do not tap Discard, do not tap Retry" |
| `Turn on reminders` | `OnboardingScreen.tsx:99` | requests OS permissions — device state under test |
| `Attendance` card and anything on the Clock screen | `DashboardScreen.tsx:84` | attendance punches are payroll rows |

## Missing testIDs — what a session adds, and how

None exist. These are the places where text is absent or fragile; each takes one `testID="…"`
prop (React Native maps it to the Android view's resource id, per upstream SKILL.md:196 —
INFERRED for Maestro's `id:` matcher, confirm on the first run):

| Proposed testID | Element | file:line |
| --- | --- | --- |
| `arrival-voice-mic` | hold-to-record mic, icon only (the reason the voice step is operator-assisted) | `arrival-job/ArrivalJobStep2.tsx:200` |
| `intake-consent-switch` | WhatsApp switch, so a flow can assert `checked: false` without tapping it | `create-job/CreateJobStep4.tsx:97` |
| `login-pin` | PIN field (placeholder match unverified) | `features/auth/LoginScreen.tsx:95` |
| `jobs-create-fab` | `+` FAB (regex-escaped text on main @ a31924a) | `JobCategoriesScreen.tsx:67` |
| `intake-phone` | phone box (keypad taps on main @ a31924a) | `create-job/CreateJobStep1Screen.tsx:80` |
| `travel-depart`, `travel-arrive` | travel buttons (emoji/caps text) | `TravelScreen.tsx:455`, `:472` |
| `drain-report-root` | the P2b-1 Drain Report (not on main @ a31924a) | P2b-1 code |
| `diag-stop-travel-60s` | the P5c Diagnostics "stop travel in 60 s" action (not on main @ a31924a; `docs/program/SHIP-PLAN-2026-11.md:887` on PR #182) | P5b code |

How: a Sonnet implementation session adds the props only (no logic), runs
`npm run typecheck && npm test` in `technician-app/`, and proves presence with
`grep -rn 'testID=' technician-app/src`. There is no screen-test harness to assert them
(CLAUDE.md "no `@testing-library/react-native`"). They reach a phone only inside the next
normal versionCode by the normal install path (plan standing rule 1) — never a special build
for a roster phone. Flows switch a selector to `id:` only after
`adb shell dumpsys package com.fixflow.technician | grep versionCode` shows that build.
