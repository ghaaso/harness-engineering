---
name: maestro-device-e2e
description: >-
  Maestro device smoke tests for the FixFlow technician app (Expo SDK 52, Android-only, no
  screen-test harness): authored carry-in, offline-intake, arrival and drain-report flows in
  references/flows, the rules for running them on a spare or pilot phone, and what a pass can
  and cannot prove about headless delivery. Use in verification sessions - plan P2c (drain
  report smoke), P5c (pilot validation of v2), P5d-1b (per-OEM runs) and P4a (only to record
  that Maestro does not run during a drain) - for register ids O-01, O-03 and O-10, or when a
  session adds testIDs for these flows. Do NOT use to judge field or background reliability
  (pair with android-field-debugging and adb evidence), on a roster or pilot phone before the
  owner's own first Maestro run on it, on any phone between its drain start and its AFTER check, for iOS, CI
  emulators or Maestro Cloud, or to install, uninstall, clear, sign in to or reconfigure
  anything on a phone.
---

# Maestro device E2E for FixFlow

A Maestro flow here is a **functional smoke on one real phone**: it drives the foreground UI,
waits for named screen states and takes screenshots. It never decides whether background
location works in the field; adb evidence and the O-01 protocol do that.

## 1. FixFlow facts (verified 2026-11-04 on `main` @ a31924a unless marked PR #182)

**The app and why this skill exists**

- Mobile is Expo **SDK 52**, React Native **0.76.9**, **Android-only**, "needs an **EAS dev
  build**" (`CLAUDE.md:28`). The app "has no screen-test harness (no
  `@testing-library/react-native`, no `react-test-renderer`)" (`CLAUDE.md:219`). Design §9 row:
  "a Maestro skill is the cheapest route to an automated carry-in/arrival smoke on a real
  device" (`docs/ORCHESTRATION-DESIGN-2026-10.md:733`, PR #182).
- No device job in CI: the mobile job is "Mobile · TypeScript · Jest" (`.github/workflows/ci.yml:48`)
  running `npm run typecheck` and `npm test -- --ci --passWithNoTests` (`ci.yml:68`, `:71`);
  "`expo export` (in CI) bundles JS only" (`CLAUDE.md:86`).
- `grep -rn "testID\|accessibilityLabel" technician-app/src` → **0 hits** (VERIFIED-BY-COMMAND).
  Every flow selects by visible text; the list, the strings never to tap, and the testIDs a
  session should add are in `references/selectors-and-testids.md`.
- appId is `com.fixflow.technician`: the plan's adb commands use it
  (`docs/program/w2/O-10-design.md:8`, PR #182), and the value under key `android.package` in
  `technician-app/app.json:16` has the same sha256 fingerprint `b6b62d05c691` (over the value
  bytes, no trailing newline; VERIFIED-BY-COMMAND; the file holds real values — read key names only).
- `technician-app/eas.json` profile keys: `development` (`:7`, `developmentClient` `:8`),
  `preview` (`:14`), `production` (`:25`). The `fleet` profile is a P2c plan item
  (`docs/program/SHIP-PLAN-2026-11.md:483`, PR #182), not in the file.

**What the flows touch**

- Sign-in is roster name + PIN, one submit (`technician-app/src/features/auth/LoginScreen.tsx:46-58`);
  "The login lock deliberately blocks a correct PIN too" (`CLAUDE.md:140`), so a flow signs in
  at most once and never retries.
- "Mobile mutations go through the outbox" (`CLAUDE.md:151`); "The outbox never deletes a
  write" (`CLAUDE.md:154`). The outbox is mounted once for the authed app
  (`technician-app/App.tsx:58`); its banner reads `N change(s) saved offline — syncing when
  reconnected…` or `… need attention (see the job) …` (`App.tsx:45-46`). The intake create
  goes through `sendOrQueue` with a client-minted id (`features/jobs/create-job/CreateJobWizard.tsx:160-162`);
  offline it shows the "Saved offline" alert (`CreateJobWizard.tsx:181-186`).
- The WhatsApp consent switch defaults OFF and is the only input to the consent gate
  (`CreateJobWizard.tsx:73-82`). No flow touches it.
- Carry-in vs visit: `"Carry-in": "carry-in"` (`create-job/createJobPayload.ts:40`); a carry-in
  completion moves the job to `ready` ("home-visit closes on the spot instead", `CLAUDE.md:191-192`).
  A completion resubmit over a sent/agreed/paid bill is frozen (`CLAUDE.md:199`): smokes create a
  fresh job every run and never reopen a billed one.
- Arrival gate: `ARRIVE_RADIUS_M = 250` (`features/jobs/arrivalGate.ts:24`),
  `GATE_ACCURACY_MAX_M = 100` (`arrivalGate.ts:27`); a visit with no customer pin goes to
  "SAVE PIN" first (`features/jobs/TravelScreen.tsx:130`). The arrival flow therefore sets the pin
  from the phone's own real fix at intake ("My location", `create-job/CreateJobStep3.tsx:89-101`).
- The arrival punch runs the privacy stop of the travel sampler (`TravelScreen.tsx:234`); an
  un-arrived leg samples until `MAX_TRAVEL_MS` = 4 h (`features/jobs/travelTracker.ts:39`).
- Wizard captures open the phone's own camera app (`ImagePicker.launchCameraAsync`,
  `features/jobs/arrival-job/ArrivalCapturesScreen.tsx:67`); the voice summary is an icon-only
  hold-to-record button (`arrival-job/ArrivalJobStep2.tsx:200-216`). Those steps are
  **operator-assisted**: a person at the phone shoots/holds while the flow waits.
- Wizard state is monotonic and its draft is AsyncStorage (`CLAUDE.md:212`;
  `` `jobs.arrivalDraft.v1:${jobId}` `` at `arrival-job/arrivalDraft.ts:72`); the jobs outbox key is
  `jobs.outbox.v2` (`technician-app/src/lib/outbox.ts:62`). Clearing app state wipes all of it.

**Register ids** (design §4.5; the survey's labels "arrival / carry-in completion / drain smoke"
are this skill's flow names, not the design notes' titles)

| Id | Design note says (PR #182) | Flows here |
| --- | --- | --- |
| O-01 | phone background/geofence; FIELD PROTOCOL, ~55 min, adb (`docs/program/w2/O-01-design.md:10`) | `arrival-1-depart.yaml`, `arrival-2-arrive.yaml`; `O01-F20` cross-stop check (`O-01-design.md:129-139`) |
| O-03 | offline/outbox fleet experience (`docs/program/w2/O-03-design.md:3-4`) | `carry-in-completion.yaml`, `carry-in-offline-intake.yaml`; `O3-F8` live-tap loss (`docs/program/G2-deep-dive-gate-2026-11-01.md:145`) |
| O-10 | fleet drain protocol (`docs/program/w2/O-10-design.md:3`) | `drain-report-smoke.yaml`; A1 freeze rules (`O-10-design.md:6`) |

**Phases** (headings of `docs/program/SHIP-PLAN-2026-11.md`, PR #182)

| Phase | Line | What Maestro does there |
| --- | --- | --- |
| P2c | `:479` | spare phone, network off, "the Drain Report renders (empty: the spare phone cannot log in)" (`:488-490`) → `drain-report-smoke.yaml` only |
| P4a | `:667` | **nothing on the pilot phone.** Step 0 keeps the network cut while the app is opened (`:677-678`) and logcat is captured before the app is opened, "no sync before the manifest receipt" (`:686-687`). Record "Maestro: not run" in the row |
| P5c | `:875` | after the owner's install-over of v2: the arrival pair around adb `dumpsys` for the cross-stop check's foreground case (`:885-890`); carry-in smoke if the owner approves writes |
| P5d-1b | `:905` | optional `readonly-smoke.yaml` on one phone per OEM, owner-approved per phone; log start/end time (`:907-910`) |

Standing rules that bind every run (`SHIP-PLAN-2026-11.md`, PR #182): rule 1 "Nothing ships to
a phone before the drain protocol has run **on that phone** … Installs are per phone,
supervised, and never an uninstall" (`:95-96`); rule 2 "No field-reliability claim without
device evidence from the phone models in the fleet" (`:99`); rule 4 "The dispatcher stays OFF"
(`:102`). A debug build in the drain window "never signs in to `api.<domain>` and never as a
roster tech … (an extra row would break a per-tech AFTER check, O-10 R7)" (`:771-773`).

**Maestro itself**

- Upstream "Checked against CLI 2.11.0 (29 September 2026)" (`references/maestro-upstream.md`,
  upstream `SKILL.md:24`); latest release `cli-2.12.1`, released "02 Nov" (year INFERRED 2026;
  WEB https://github.com/mobile-dev-inc/maestro/releases/latest, fetched 2026-11-04 by the
  survey). Java 17+ with `JAVA_HOME` set (WEB https://docs.maestro.dev/maestro-cli/how-to-install-maestro-cli,
  2026-11-04).
- `launchApp`: stopApp "Defaults to `true`" and "By default, all permissions are allowed"
  (WEB https://docs.maestro.dev/api-reference/commands/launchapp, fetched 2026-11-04). On a
  FixFlow phone that is a force-stop plus a silent grant of the location permissions the O-01
  protocol measures — so **no FixFlow flow contains `launchApp`**; a person opens the app.
- "Maestro automatically reads shell environment variables prefixed with `MAESTRO_`"
  (WEB https://docs.maestro.dev/advanced/parameters-and-constants, fetched 2026-11-04).
- Physical devices need "USB Debugging" enabled (WEB
  https://docs.maestro.dev/get-started/supported-platform/android, fetched 2026-11-04). That page
  does not say whether Maestro installs a helper app on the phone; INFERRED that it does, so the
  checks compare `pm list packages` before and after.
- Not verified on the docs: `--include-tags` (only upstream `SKILL.md:118` claims it). Run one
  flow file at a time instead of filtering by tag.

## 2. Procedure

An agent's procedure stops at every `[owner]` step until the owner reports it done in the brief.

1. Read the brief: phase, phone (spare / pilot / roster), flows, and whether it says
   "runs commands". Without "runs commands" do steps 5 and 11 as a plan and stop.
2. `[owner]` Install Java 17+ and the Maestro CLI on the laptop (checksum-verified release zip,
   `bin` on `PATH`; a binary download and a `PATH` change are the owner's). The agent only reads
   `java -version` and `maestro --version`.
3. `[owner]` Choose the phone. Spare phone: any phase above. Pilot phone: only after its P4a
   AFTER check passed (rule 1). Roster phone: only `readonly-smoke.yaml` in P5d-1b. **The first
   Maestro run on a roster or pilot phone is the owner's**: it is INFERRED to install Maestro's
   helper app, and no agent installs on those phones (README rule 4; §4 item 9). The owner runs
   that first `maestro --device <serial> test …` (or installs the helper APKs) and puts the
   after-run `adb -s <serial> shell pm list packages | grep -i maestro` output in the brief. An
   agent runs `maestro test` on a roster or pilot phone only when the brief records that output;
   on the spare phone it may make the first run itself under "runs commands".
4. `[owner]` Install FixFlow on a roster or pilot phone: `adb install -r` of a **signed** EAS
   build after its drain (O-10 E2, `O-10-design.md:63`), never an uninstall. On the spare phone
   a session may run `adb install -r <signed.apk>` only when the brief says "runs commands"
   and `apksigner verify --print-certs` matched the expected cert (P2c, `SHIP-PLAN:485-487`).
5. **A `fixflow-write` flow runs only on a build whose baked API host the brief names as
   non-production (a lab backend, a stand-in). Nothing in the flow files checks this: the flows
   target the production package id `com.fixflow.technician` and write real rows wherever that
   build points. On a pilot or roster phone every write flow is `[owner]`, never the agent's.**
   `[owner]` For any flow tagged `fixflow-write`: name the backend the installed build bakes;
   designate the test technician account (creating one is the owner's); approve the rows the
   flow creates (a job, customer phone `03000000000`, punches, breadcrumbs) and the time window;
   confirm no drain window is open for that technician (`SHIP-PLAN:771-773`); set
   `MAESTRO_FIXFLOW_TECH` and `MAESTRO_FIXFLOW_PIN` in the owner's own shell. On the pilot
   phone the flows run as the signed-in pilot technician (the login subflow is conditional and
   logging out is forbidden, §4 item 4), so the owner approves rows under that tech, including
   the travel route "recorded for the fuel bill" (`TravelScreen.tsx:453`).
6. Preflight (agent, read-only): run the §3 preflight rows. Stop with `DEVICE_NOT_PRESENT` if
   `adb devices -l` does not list exactly the one phone the brief names. On a roster or pilot
   phone stop with `OWNER_STEP_PENDING: first Maestro run` if the pre-run
   `pm list packages | grep -i maestro` is empty or differs from the output the brief records.
7. `[owner]` A person opens FixFlow on the phone (flows never start, stop or reset it). For
   `carry-in-offline-intake.yaml` that person first cuts FixFlow's Wi-Fi and mobile data in the
   OEM per-app data settings (as O-01 step 0, `O-01-design.md:16`).
8. For the arrival pair, start the logcat capture and the baseline `dumpsys` from
   `references/background-delivery-evidence.md`.
9. Run one flow, recording the clock time before and after:
   `maestro --device <serial> test --format junit --output <out>/report.xml --test-output-dir <out> references/flows/<flow>.yaml`
   with `<out>` outside the repository (whether Maestro echoes `inputText` values such as the
   PIN into `commands.json` or the console is unverified: never paste `<out>` or console text
   into a report; cite file names only). Operator-assisted waits (photo, video, mic) allow 3 min each.
   Arrival: part 1 → `dumpsys` → part 2 → `dumpsys` → optionally `subflows/wizard-to-bill.yaml`.
10. `[owner]` Offline flow: a person restores FixFlow's network when the
    `offline-banner-one-queued` screenshot is taken; the flow then waits up to 5 min for the drain.
11. Post-run (agent, read-only): §3 post-run rows; stop the logcat capture; fill the output table.
    On a roster or pilot phone, a post-run Maestro package list that differs from the pre-run one
    means the run installed something: report it and run nothing more on that phone.
    A failure is reported with the failing command, the screenshot path and the hierarchy dump —
    never "fixed" by editing the flow to pass and re-running against the same job.
12. `[owner]` Confirm server-side that the rows landed (manager side), decide what happens to
    the test jobs, and whether Maestro's helper app stays on the phone. The agent stops here.

## 3. Checks (read-only) and what each proves

Preflight (each line's proof in the comment; `F` = `.claude/skills/maestro-device-e2e/references/flows/`):

```
java -version; maestro --version                 # Java 17+; record the CLI version
adb devices -l                                   # exactly one device: the brief's serial
adb -s <serial> shell getprop ro.product.manufacturer   # the OEM row this run belongs to
adb -s <serial> shell getprop ro.product.model
adb -s <serial> shell dumpsys package com.fixflow.technician | grep -E 'versionCode|versionName|lastUpdateTime'   # which build (O-01-design.md:19)
adb -s <serial> shell pm list packages | grep -i maestro          # Maestro helper before the run
grep -rnE 'launchApp|clearState|stopApp|killApp|clearKeychain|setLocation|AirplaneMode|setPermissions|runScript|evalScript|openLink' F    # expect no output
grep -rnE 'tapOn.*(Discard|Retry|Log ?out|Abandon|Send on|Close|Mark Ready|Convert|Put on hold|Turn on reminders|Attendance|Acknowledge|Ready for pickup)' F   # expect no output
grep -rn 'inputText' F                           # only ${...} variables or fixed non-secret strings
```

Run and post-run:

| Evidence | Proves |
| --- | --- |
| `maestro … test` exit code and `<out>/report.xml` | the flow's assertions held at the moment they ran |
| screenshots in `<out>` (`carry-in-created`, `bill-opened`, `offline-banner-drained`, `arrival-recorded`, …) | the named screen states, for the row |
| `adb -s <serial> shell dumpsys activity services com.fixflow.technician` after each arrival part | foreground-service state, read per `references/background-delivery-evidence.md` |
| `adb -s <serial> shell pm list packages \| grep -i maestro` after the run | what the run left on the phone |

A green run proves foreground states only. It never proves a row landed server-side, a headless
delivery, or field reliability (rule 2) — see `references/background-delivery-evidence.md`.

## 4. Forbidden actions (and the rule each comes from)

1. **`clearState`, `pm clear`, uninstalling FixFlow** — "Never uninstall, clear data or tap
   Discard" (`O-01-design.md:11`); "do not clear app storage" (`O-10-design.md:6`); "The outbox
   never deletes a write" (`CLAUDE.md:154`); rule 1 "never an uninstall" (`SHIP-PLAN:96`).
2. **`launchApp`, `stopApp`, `killApp`** — launchApp force-stops and grants all permissions by
   default (WEB above); O-01 says "Avoid `am force-stop` until the end" (`O-01-design.md:13`).
3. **`setLocation` or any mock location** — "Use no mock locations" (`O-01-design.md:12`).
4. **Tapping Retry, Discard, or logging out** — O-10 A1 (`O-10-design.md:6`).
5. **Tapping the WhatsApp switch or any WhatsApp send** — consent gate (`CreateJobWizard.tsx:73-82`);
   messaging a customer is `[owner]` (README rule 4); the dispatcher stays OFF (rule 4, `SHIP-PLAN:102`).
6. **Close, Mark Ready, Abandon, hold, convert, payments, negotiated amounts, completion
   resubmits** — guarded lifecycle and the bill freeze (`CLAUDE.md:181`, `:199`); a smoke stops at the bill.
7. **A second login attempt, or `retry` around login** — the per-account lock (`CLAUDE.md:140`).
8. **A PIN in a flow file, in `-e` on a command line, in a report or a commit** — README rule 3;
   the owner sets `MAESTRO_FIXFLOW_PIN` in their own shell.
9. **Any install by an agent on a roster or pilot phone (including Maestro's first run there,
   which is INFERRED to install its helper app); any debug APK on a roster phone;
   `expo run:android` / `expo prebuild` builds** — rule 1 (`SHIP-PLAN:95-96`), O-10 E2
   (`O-10-design.md:63`), README rules 2 and 4.
10. **Maestro on the pilot phone during P4a, or on any phone between its drain start and its
    AFTER check** — O-10 D4 ordering (`SHIP-PLAN:686-687`).
11. **Write flows as a roster technician in a drain window** — `SHIP-PLAN:771-773` (O-10 R7).
12. **`runScript`/`evalScript` HTTP calls, `openLink` deep links into writes** — bypass the
    outbox (`CLAUDE.md:151`).
13. **Attendance taps (clock in/out)** — real payroll rows; the tech's own duty state is the
    O-01 precondition, never set by a flow.
14. **Changing phone settings (permissions, battery, autostart, airplane mode)** — they are the
    state the O-01 protocol measures (`O-01-design.md:18-32`); a person changes network access
    only where a flow's header says so.
15. **`maestro cloud`, `maestro record` without `--local`, `maestro mcp` against a FixFlow
    phone, `claude mcp add`** — screens carry customer names, phones and locations; MCP taps are
    unscripted writes; adding an MCP server is a config change for the owner.
16. **A field-reliability or background-delivery claim from a Maestro pass** — rule 2 (`SHIP-PLAN:99`).

## 5. Where upstream disagrees

From `skills/maestro/SKILL.md` @ 0abb852 (TerminalSkills). FixFlow's rule wins in every row.

| Upstream (line) | Says | FixFlow rule and reason |
| --- | --- | --- |
| `:160` | `adb install app/build/outputs/apk/debug/app-debug.apk` | signed EAS builds only, `adb install -r`, installs on roster/pilot phones are `[owner]` after the drain (rule 1; O-10 E2); a local debug APK implies `expo run:android`/`prebuild` (README rule 2) |
| `:69-70`, `:191` | `launchApp: clearState: true`; `permissions: { all: allow }` | clearing wipes every queue (`O-10-design.md:6`, `CLAUDE.md:154`); permission grants are the measured state (O-01 step 1) |
| `:69`, `:91` | flows begin with `launchApp` | it force-stops and grants all permissions by default (WEB launchapp page); a person opens the app |
| `:54`, `:56`, `:173-174` | `start-device` / any connected device or emulator | one named spare or pilot phone; an emulator is not fleet evidence (rule 2) |
| `:129-133` | "an agent can inspect a live device, tap, assert and write flows" via `maestro mcp`; `claude mcp add` | a tap is a write through the outbox (`CLAUDE.md:151`); no unscripted taps; MCP config is the owner's |
| `:79`, `:82`, `:174`, `:198` | pass secrets with `-e PASSWORD=…` or `MAESTRO_*` | the PIN only via `MAESTRO_FIXFLOW_PIN` in the owner's shell; never on a command line an agent writes (README rule 3) |
| `:40`, `:48` | curl the release zip / install script | a binary download onto the owner's laptop is `[owner]` |
| `:136-166` | GitHub Actions emulator job; `maestro cloud --app-file` | no device gate in CI (`CLAUDE.md:86`); Cloud uploads the APK and screens to a third party |
| `:112` | `setPermissions`, `runScript`/`evalScript`, `openLink` as "useful" commands | forbidden here (items 12, 14) |
| `:196` | "Prefer `id` selectors" | none exist (0 testIDs); adding them is an app change that ships only by rule 1 — text selectors until then |

## 6. References

- `references/flows/` — authored flows: `drain-report-smoke.yaml` (O-10, P2c),
  `carry-in-completion.yaml` and `carry-in-offline-intake.yaml` (O-03), `arrival-1-depart.yaml`
  and `arrival-2-arrive.yaml` (O-01), `readonly-smoke.yaml` (P5d-1b); `subflows/` holds
  `login.yaml`, `preconditions.yaml`, `intake-who-what.yaml`, `intake-estimate.yaml`,
  `wizard-to-bill.yaml`.
- `references/selectors-and-testids.md` — every selector with its `file:line`, the strings no
  flow may tap, the missing testIDs and how a session adds them.
- `references/background-delivery-evidence.md` — what a pass can and cannot prove; the adb
  pairing; what to record per run.
- `references/maestro-upstream.md` — the upstream skill, trimmed (install, devices, commands,
  reports, guidelines); read §5 above before following anything in it.
- Pair with the `android-field-debugging` skill for every background claim.
- docs/ORCHESTRATION-DESIGN-2026-10.md and docs/program/* are on PR #182 (head 3415b5e) at write time; their line numbers refer to that head.
