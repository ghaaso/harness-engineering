---
name: eas-expo-release
description: FixFlow technician-app release operations for the APK sessions - preparing, checking and recording an EAS build of the `fleet` APK (Expo SDK 52, React Native 0.76.9, expo-dev-client ~5.0.0, Android only), versionCode and keystore custody, proving the API URL and Sentry DSN baked into the built bundle, and the per-phone installed-build receipt (versionCode, signing-cert SHA-256, dumpsys firstInstallTime/lastUpdateTime) for plan phases P2b-1 (fleet profile), P2c, P5b-2, P5c, P5d-1a, P14-n and P14-fleet. Use it whenever a session builds, inspects or installs a technician APK, or asks which build is on a phone. Do NOT use it for OTA updates (expo-updates is ruled out, R7), expo prebuild or expo run:android (forbidden), store submission, the drain protocol itself (O-10), geofence analysis, or logcat forensics. Builds, eas credentials, eas build:version:set and every install on a roster phone are [owner] steps; an agent's procedure stops there.
---

# EAS / Expo release for the FixFlow technician app

Written 2026-11-04 against `main` @ a31924a. Short forms used below: **plan** =
`docs/program/SHIP-PLAN-2026-11.md`, **design** = `docs/ORCHESTRATION-DESIGN-2026-10.md`,
**O-10** / **O-08** / **O-01** = `docs/program/w2/O-10-design.md` / `O-08-design.md` /
`O-01-design.md` (all on PR #182; see References). Marks: VERIFIED-IN-CODE, WEB (URL, fetched
2026-11-04), INFERRED.

## 1. FixFlow facts

### The rulings, first

| Rule | Source | What it means for a release session |
| --- | --- | --- |
| **No `expo-updates`** | plan:1483 — "**R7 — no `expo-updates`.** It bypasses the once-per-versionCode manifest and rule 1."; restated for every SDK upgrade at plan:1267 | Every JS fix is a new APK with a new versionCode and a P2c re-run (plan:74-75). `expo-updates` is absent from `technician-app/package.json` (only the transitive `expo-updates-interface` at `technician-app/package-lock.json:7202`); `docs/HANDOFF.md:83` — "no OTA configured". |
| **Never `expo prebuild` / `expo run:android`** | design:598 — "**Never run `expo prebuild` or `expo run:android` in `technician-app/`.**" (it creates an untracked `android/`, after which EAS treats the project as bare and skips config plugins, design:599-600) | `technician-app/package.json:9` still carries `"android": "expo run:android"` — never run `npm run android`. `technician-app/android/` does not exist on `main` @ a31924a (checked 2026-11-04); its appearance is a stop. |
| **Stack** | CLAUDE.md:28 — Expo **SDK 52**, RN **0.76.9**, **Android-only**, "needs an **EAS dev build**" | `technician-app/package.json:19` `"expo": "~52.0.0"`, `:25` `"expo-dev-client": "~5.0.0"`, `:36` `"react-native": "0.76.9"`, `:30` expo-location ~18.0.10, `:33` expo-task-manager ~12.0.6. "EAS dev build" = an EAS-built custom binary (not Expo Go); the field APK is the release-variant `fleet` build, not the `developmentClient` profile (`technician-app/eas.json:8`), which needs Metro (`package.json:8` `expo start --dev-client`). |
| **Same applicationId + same signing cert** | O-10:45 — "Same package com.fixflow.technician and the same EAS keystore."; O-08:56 | `technician-app/app.json:16` (key `android.package`). A different cert is the K=no branch (plan:153-159). |
| **`adb install -r`, never uninstall** | plan:95-98 (standing rule 1: "Installs are per phone, supervised, and never an uninstall"); O-10:63 (E2) | The only uninstall is K=no, after A3 photos, every row retried or transcribed, and the owner's written per-phone sign-off (plan:96-98; O-10:100). Uninstall erases the AsyncStorage queues (O-08:56). |
| **No phone gets a new app before its drain** | plan:95 — "Nothing ships to a phone before the drain protocol has run **on that phone** and its AFTER check passed." | P5d-1a requires a P4b/P4r/retired row and an empty Drain Report per phone (plan:896-899). The P2c spare phone is not a roster phone. |

### Files, keys, constants (eas.json / app.json: key names only — they hold real values)

- `technician-app/eas.json` keys: `cli.appVersionSource` (:4), `build.development`
  {`developmentClient` :8, `distribution` :9}, `build.preview` {`extends` :15, `distribution`
  :16, `android.buildType` :18, `env.EXPO_PUBLIC_API_URL` :21, `env.EXPO_PUBLIC_SENTRY_DSN` :22},
  `build.production` {`autoIncrement` :26, `android.buildType` :28, `env.EXPO_PUBLIC_API_URL`
  :31, `env.EXPO_PUBLIC_SENTRY_DSN` :32}, `submit.production` (:36). **No `fleet` profile on
  `main` @ a31924a** — P2b-1 D1 creates it (plan:428-430). No `runtimeVersion` / `updates` key.
- Both existing profiles bake a host the owner does not control: preview (APK) the dead Railway
  host, production an app-bundle on a placeholder host (`docs/program/evidence/w2/O-10.txt:126`
  O10-F11; G2 `docs/program/G2-deep-dive-gate-2026-11-01.md:213` O08-F05/O08-F14). Never build
  the fleet from either (plan:429-430: "every later build names `fleet`").
- `technician-app/app.json` keys: `expo.version` (:6; the UI shows only versionName 0.1.0,
  O-10:8), `android.package` (:16), `android.config.googleMaps.apiKey` (:20), `plugins` (:38),
  `extra.eas.projectId` (:63). **No `android.versionCode` key**: versionCode is EAS-remote
  (`eas.json:4`), auto-incremented only where `autoIncrement` is set (`eas.json:26`; preview
  inherits it through `extends`, O10-F12 at `docs/program/evidence/w2/O-10.txt:135`).
- API URL: `technician-app/src/lib/config.ts:14` —
  `const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? "http://10.0.2.2:8000";` inlined at build
  time (`config.ts:2-3`); unset falls back **silently** to the emulator loopback. Every request
  is `${config.apiUrl}${path}` (`technician-app/src/lib/api.ts:93`); queued items hold paths only,
  so they flush to whatever host the installed APK bakes (O-08:56).
- v2 outbox marker: `technician-app/src/lib/outbox.ts:62` — `const KEY_V2 = "jobs.outbox.v2";`
  (the v2 grep of plan:259-260 and O10-F15, `docs/program/evidence/w2/O-10.txt:166`).
- Sentry traps: CLAUDE.md:81 (never an empty `EXPO_PUBLIC_SENTRY_DSN` in `eas.json` — every
  `eas build` fails), CLAUDE.md:84 (never the Sentry Expo config plugin in `app.json`).
- CI proves JS only: `.github/workflows/ci.yml:76-77` `npx expo export --platform android`;
  CLAUDE.md:86 — "It does NOT catch native/Gradle compile breaks." Since L2 (#188, 2026-11-13) the
  local compile gate is `ops/lab/android-compile.sh` (compile evidence only, never installed on a
  phone); `eas build --profile fleet` in P5a and P5b-1 (plan:828, plan:847-849) remains the only
  build a phone receives.
- Token: `.gitignore:50-52` ignore `technician-app/.eastoken`; the runbook exports it into
  `EXPO_TOKEN` (`docs/HANDOFF.md:83`). Never read or print it.
- Keystore files are **not** ignored: neither `.gitignore` nor `technician-app/.gitignore:2-4`
  has a `*.jks`, `*.keystore` or `credentials.json` pattern (VERIFIED-BY-COMMAND, grep,
  2026-11-04). The Maps key is restricted to `com.fixflow.technician` + "the EAS keystore SHA-1s"
  (`docs/HANDOFF.md:48`), so a re-minted keystore also breaks maps.
- `eas credentials` is interactive-only (`docs/HANDOFF.md:97`).
- Install-over restarts headless work at once: expo-task-manager 12.0.6 registers
  `MY_PACKAGE_REPLACED`
  (`C:/Users/User/.fixflow-cache/expo-src/expo-task-manager-12.0.6/package/android/src/main/AndroidManifest.xml:9`),
  hence the manifest gate "a headless task restored by MY_PACKAGE_REPLACED therefore cannot drain
  first" (O-10:48).
- Superseded in-repo runbooks: `docs/HANDOFF.md:83` and `technician-app/README.md:105` build
  `--profile preview`; `technician-app/README.md:82` installs an unpinned global `eas-cli`. From
  P2b-1 on, plan:428-430 wins.

### Phases and register ids served

| Phase | What this skill does there | Plan |
| --- | --- | --- |
| P0a item 6 | per-phone field receipt (pulled `base.apk`, cert, versionCode, bundle grep); keystore **exported** | plan:258-261 |
| P2b-1 D1 | review the `fleet` profile (APK, owned-domain URL, real DSN, versionCode above fleet max) | plan:426-430 |
| P2c | fleet APK v1: build, grep, cert, install-over on the spare phone; W0-results "Fleet APK v1" row | plan:479-495 |
| P5a / P5b-1 | compile gate: `eas build --profile fleet` compiles, not installed | plan:828, :847 |
| P5b-2 | fleet v2 build finished green, bundle grep and cert check recorded | plan:870-871 |
| P5c | install-over on the pilot (rule 1) | plan:880 |
| P5d-1a (×n) | per phone: versionCode check, Drain Report empty, `adb install -r`, row in FIELD-VALIDATION.md | plan:898-900 |
| P14-n / P14-fleet (×n) | SDK-major upgrade build, "No `expo-updates`", per-phone rows as P5d-1a | plan:1264-1270 |

Register ids: **O-10** E2 install-over (O-10:63), D1 (O-10:45), O10-F11, O10-F12, O10-F15 (the
v2 grep decides it; §4 default "no", plan:1290); **O-08** keystore not re-mintable (O-08:24),
O08-F05/O08-F14; **O-01** field-APK static state (O-01:19); **R7** (plan:1483); **HR-A1b**
(keep Expo; the P5-spike builds under a separate applicationId, never `api.<domain>`,
plan:771-773, plan:1508-1509); **HR-A2** (keep the hand-rolled engine, plan:1512; its P14-log migration rides a P14-n build,
plan:1273-1277).

## 2. Procedure

An agent runs only the unmarked steps, and only commands the brief allows ("runs commands");
at an **[owner]** step it returns the prepared command and the receipt so far, and stops.

**A. Before any build**

1. Name the phase and confirm its Entry line in the plan (P2c: P2b-1 merged, domain in DNS,
   P0a item 6 for every roster phone, plan:481-482).
2. Rulings check (read-only): `grep -c 'expo-updates"' technician-app/package.json` → 0;
   `test ! -d technician-app/android`; `grep -c '"runtimeVersion"\|"updates"' technician-app/app.json technician-app/eas.json` → 0;
   no Sentry plugin in `app.json` `plugins` (CLAUDE.md:84).
3. Fleet profile check, key names and counts only: `"fleet"` exists under `build`; it sets
   `android.buildType` to `apk`; `EXPO_PUBLIC_API_URL` matches the expected value
   (`grep -c '"EXPO_PUBLIC_API_URL": "https://api.<domain>"' technician-app/eas.json` → 1 — the
   agent supplies the string, never prints the file's); `EXPO_PUBLIC_SENTRY_DSN` non-empty
   (`grep -c '"EXPO_PUBLIC_SENTRY_DSN": "[^"]\{1,\}"'`) (CLAUDE.md:81). Report a value only as a
   12-hex sha256 fingerprint.
4. versionCode: in the owner's logged-in shell, `npx eas-cli@<pinned> build:version:get -p android`
   (read-only) against the maximum field versionCode from every P0a item 6 row (plan:426).
   Not above → step 5.
5. **[owner]** `eas build:version:set` to a value above the fleet maximum (O-10:45, O10-F12). It
   writes EAS project state.
6. Optional local JS gates (brief must say "runs commands"): mobile `typecheck`, `test`,
   `npx expo export --platform android`. These prove the code, not the bake: a local export takes
   `EXPO_PUBLIC_*` from the shell / `.env` (`config.ts:5`), not from `eas.json`.

**B. Build**

7. **[owner]** `npx eas-cli@<pinned> build --profile fleet --platform android --non-interactive --no-wait`
   from `technician-app/` (cloud). Record the build id in the phase's W0-results step table at
   once; a slow queue ends the session at "submitted" and resumes from `eas build:list`
   (plan:36, plan:483-484). Queue: 20-40 min on the free tier (`docs/HANDOFF.md:83`).
8. Poll `build:list --platform android --limit 5 --json` (HANDOFF:83 — "NOT `build:view`").
9. **[owner]** download the artifact to a scratch folder outside the worktree.

**C. Build receipt** — `references/fixflow-build-receipt.md` §A (rows A1-A8): package and
versionCode (`aapt2 dump badging`), cert (`apksigner verify --print-certs`), and `grep -a` of
`assets/index.android.bundle` for `api.<domain>`, `jobs.outbox.v2`, `drain_manifest`, a DSN
count, and zero hits for the old Railway host, the placeholder host and `10.0.2.2`.

10. Return the W0-results row (plan:491). Any failed row: no install anywhere; report it.

**D. Install, per phone** — `references/fixflow-build-receipt.md` §B.

11. Precondition: spare phone with FixFlow's network **off** (P2c, plan:488-489), or a roster
    phone with its drain AFTER passed / P4b-P4r row and an empty Drain Report (rule 1,
    plan:898).
12. BEFORE receipt (B1-B3): `dumpsys package` versionCode / firstInstallTime / lastUpdateTime
    (O-01:19), pulled `base.apk` cert (O-10:8). Same package, same cert, phone versionCode below
    the build's — else **STOP this phone, re-check K, never uninstall** (plan:150-152; O-10:63).
13. **[owner]** `adb install -r fleet.apk` (or tap-to-update) on that phone, supervised. K=no
    fresh install only per plan:153-159 with the written sign-off.
14. AFTER receipt (B4-B6): versionCode = build, lastUpdateTime later, **firstInstallTime
    unchanged** (no uninstall happened), cert unchanged, app opens, permissions re-granted if
    hibernation revoked them (O-10:64 — the tech or owner taps, not the agent).
15. Return the row for W0-results (P2c) or `docs/program/FIELD-VALIDATION.md` (P5d-1a,
    P14-fleet).

**E. Keystore custody (P0a item 6; all [owner])**

16. **[owner]** `eas credentials` → Android → the profile → `credentials.json` → "Download
    credentials from EAS to credentials.json" (WEB https://docs.expo.dev/app-signing/app-credentials/,
    fetched 2026-11-04; interactive-only, HANDOFF:97). The files land in `technician-app/`,
    where nothing ignores them: move both out of the worktree before any `git` command
    (INFERRED: the keystore lands beside `credentials.json`).
17. **[owner]** keep an encrypted copy (password manager + printed recovery sheet, O-08:24);
    "Under no circumstances should you check it into your repository." (WEB, same page).
18. **[owner]** record the keystore cert SHA-256 and SHA-1 (public values) in W0-results; K per
    phone = field cert equals it (plan:147-148, plan:261).
19. Never re-mint. O-08:24 — "Not re-mintable: the Android keystore (W0 item 3, export it)".
    The fetched page: outside Play App Signing "if the keystore was lost there was no way to
    recover or reset it" (WEB, same page). A new keystore is a new cert: K=no for the whole fleet
    and a broken Maps restriction (HANDOFF:48).

**F. Rebaking the API URL (design:732 asks "how to rebake the API URL safely")**

20. The URL lives only in the bundle: change `build.fleet.env.EXPO_PUBLIC_API_URL` in a
    reviewed PR (P2b-1, plan:428), then a new versionCode, new build, and a full §C receipt —
    A4 and A5 are the proof, never the PR diff. No runtime switch and no OTA (R7). The P5-spike
    build never points at `api.<domain>` during the window (plan:771-773).

## 3. Checks (read-only; what proves what)

| Command | Proves |
| --- | --- |
| `grep -c 'expo-updates"' technician-app/package.json` = 0 | R7 holds in the source |
| `test ! -d technician-app/android` | no prebuild has run (design:598-600) |
| `aapt2 dump badging fleet.apk` package + versionCode | same applicationId; versionCode above the fleet max |
| `apksigner verify --print-certs` on the build and on the pulled `base.apk` | K: same signing cert |
| `unzip -p fleet.apk assets/index.android.bundle \| grep -a -c '<s>'` | the host / `jobs.outbox.v2` / `drain_manifest` / DSN is baked (built APK only) |
| `adb shell dumpsys package com.fixflow.technician` BEFORE vs AFTER | installed versionCode; `firstInstallTime` unchanged = install-over, not uninstall |
| `eas build:list --platform android --limit 5 --json` | build id, profile, status, commit |
| `npx expo export --platform android` green | JS bundles; proves nothing about Gradle (CLAUDE.md:86) or the baked env |

## 4. Forbidden actions

- Adding `expo-updates`, `eas update`, `update:configure`, channels or `runtimeVersion` — R7
  (plan:1483, plan:1267).
- `expo prebuild`, `expo run:android`, `npm run android` (`package.json:9`) — design:598.
- `adb uninstall`, `pm clear`, "clear storage", `adb install` without `-r` over a field build,
  `adb install -d` (downgrade) — standing rule 1 (plan:95-98), O-10:63, O-08:56.
- Any install on a roster phone before its drain AFTER check — plan:95.
- Any install, `eas build`, `eas build:version:set`, `eas credentials` write, `eas submit` by an
  agent — skills README rule 4; design §3 (Sonnet runs and reports, design:96).
- Building the fleet from `preview`, `production` or `development` — plan:429-430, O10-F11.
- An empty `EXPO_PUBLIC_SENTRY_DSN` or the Sentry config plugin — CLAUDE.md:81, :84.
- Re-minting, deleting or replacing the keystore — O-08:24.
- Reading `.eastoken`, echoing `EXPO_TOKEN`, printing an `eas.json` / `app.json` value — skills
  README rule 3; `.gitignore:50-52`.
- Unpinned `eas-cli@latest` / `npm install -g eas-cli` — skills README rule 6.
- `eas build --local` on the owner's Windows 11 machine — WEB
  https://docs.expo.dev/build-reference/local-builds/ (fetched 2026-11-04): Expo does "not
  support Windows for local builds (macOS and Linux are supported)"; WSL is untested by Expo.
- Treating a green `expo export` as a compile or bake proof — CLAUDE.md:86.

## 5. Where upstream disagrees

Upstream = https://github.com/expo/skills @ a9e5bd3fa00b4e61f632e43f85da73aee1942582
(`plugins/expo/skills/…`). FixFlow's rule wins in each case.

| Upstream sentence (path:line) | FixFlow rule | Why FixFlow wins |
| --- | --- | --- |
| eas-update/SKILL.md:12 "deliver compatible JavaScript, styling, and asset changes to installed apps without submitting a new native binary." | R7, plan:1483 | an OTA lands on a phone with no supervised session and no versionCode change, so the once-per-versionCode manifest (O-10:48) is never re-taken and rule 1 is bypassed; upstream itself says the update applies "on a later restart" (:103), i.e. unsupervised |
| eas-update/SKILL.md:28 `npx expo install expo-updates`; :34 `update:configure`; :83-87 `update --channel` | R7 | same; and expo-updates is native, so adding it is itself a new build (:68) |
| eas-update/SKILL.md:127 channel surfing via `expo-channel-name` | R7 | no channels exist or will |
| expo-dev-client/SKILL.md:174 `eas update` under "Check EAS CLI version" | R7 | never run it, not even as a probe |
| play-store.md:230 "Or use EAS Update for OTA updates to existing installs." | R7 | same |
| expo-dev-client/SKILL.md:111 `adb install build.apk` | `adb install -r`, plan:95-98, O-10:63 | without `-r` the install fails over an existing app and invites the uninstall that erases the queues (O-08:56) |
| expo-dev-client/SKILL.md:158-161 signing errors → `eas credentials`; play-store.md:153 "Upload key can be reset if compromised" | O-08:24 not re-mintable; skills README rule 4 | FixFlow sideloads; there is no Play reset path, and a new key is K=no for every phone |
| eas-app-stores/SKILL.md:69, :72 `--auto-submit`; play-store.md:136, :139 `eas submit` | no store distribution; README rule 4 | APKs go per phone under rule 1 |
| play-store.md:225 internal distribution via `eas build -p android --profile development` | fleet profile only, plan:429-430 | FixFlow's `development` profile is a `developmentClient` build that needs Metro (`eas.json:8`) |
| eas-app-stores/SKILL.md:38 `npm install -g eas-cli`; :45, :56 `npx eas-cli@latest` | README rule 6 (exact versions) | a floating CLI makes a resumed session differ from the one that started |
| eas-app-stores/SKILL.md:148 `eas build:version:set` as a routine step | [owner] step (O10-F12) | it writes remote EAS state that decides whether install-over succeeds |
| expo-dev-client/SKILL.md:83 `eas build -p android --profile development --local` | WEB local-builds page; owner machine is Windows 11 | unsupported on Windows; and FixFlow never builds `development` for the field |
| expo-dev-client/SKILL.md:167 `eas build -p ios --profile development --clear-cache` | Android-only, CLAUDE.md:28 | iOS example; and no field build uses the `development` profile |

Self-collision (not upstream): `technician-app/package.json:9` `"android": "expo run:android"`
vs design:598. Removing the script is a code change for a phase PR, not for this skill.

## 6. Unknowns (carry into any brief)

- `WEB_UNAVAILABLE: SDK 52 expo-dev-client 5.0.x docs page` — the v52 URL served SDK 58
  content on 2026-11-04; upstream tracks the current SDK, not 52.
- `eas build --local`: Windows unsupported; whether the owner builds locally on Linux/WSL or
  stays cloud-only is an owner decision (the cloud queue is the default).
- Which exact `eas-cli` version to pin: not recorded anywhere; it must satisfy `eas.json:3`
  (`cli.version`). Upstream verified its submit commands with 23.2.0 (eas-app-stores/SKILL.md:162).
- Whether the `fleet` profile keeps `autoIncrement` (inherited if it extends production,
  O-10:45) — P2b-1's choice; the receipt checks the outcome either way.
- `distribution` for `fleet`: internal makes EAS produce an APK (WEB
  https://docs.expo.dev/build/internal-distribution/, fetched 2026-11-04); `android.buildType: apk`
  does too. Either is fine; installs are by `adb` over USB.

## 7. References

- `references/fixflow-build-receipt.md` — the build receipt (A1-A8) and the per-phone
  installed-build receipt (B1-B6), with the row formats.
- `references/expo-dev-client.md` — trimmed upstream: dev-client need, EAS keys, local build,
  status, troubleshooting; five rejected command lines are `# [rejected: …]` markers (read §5 first).
- `references/eas-app-stores.md` — trimmed upstream: `build:version:get/set`, `build:list`,
  with the upstream "verified with EAS CLI 23.2.0" note.
- Not vendored, cited by path only: `plugins/expo/skills/eas-update/SKILL.md` @ a9e5bd3 (taken
  only to document the R7 rejection).
- docs/ORCHESTRATION-DESIGN-2026-10.md and docs/program/* are on PR #182 (head 3415b5e) at write time; their line numbers refer to that head.
