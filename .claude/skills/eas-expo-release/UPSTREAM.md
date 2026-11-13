# UPSTREAM — eas-expo-release

Status: **sourced**. Maintainer file; agents read `SKILL.md`.

## expo/skills

| Field | Value |
| --- | --- |
| Repo | https://github.com/expo/skills |
| Commit | a9e5bd3fa00b4e61f632e43f85da73aee1942582 |
| Branch | main |
| Fetched | 2026-11-04 (sparse, shallow clone) |
| Paths taken | `plugins/expo/skills/eas-app-stores/` (SKILL.md, references/play-store.md, references/workflows.md read), `plugins/expo/skills/eas-update/SKILL.md`, `plugins/expo/skills/expo-dev-client/SKILL.md`, `plugins/expo/LICENSE` |
| Licence | MIT (SPDX `MIT`), "Copyright (c) 2025-present 650 Industries, Inc. (aka Expo)"; each SKILL.md frontmatter also says `license: MIT` |
| Licence file here | `LICENSE-expo-skills` (copied with `cp`; sha256 0e19d24423e0… identical to the clone) |

Upstream version notes kept: `eas-app-stores/SKILL.md:162` "verified with EAS CLI 23.2.0" and
`:167` (submission commands "not in the tested 18.6.0 installation") — both kept verbatim in
`references/eas-app-stores.md`. The `"version": ">= 16.0.1"` example (`eas-app-stores/SKILL.md:89`,
`expo-dev-client/SKILL.md:29`) is kept verbatim in `references/expo-dev-client.md`. Upstream
states no SDK-52 note anywhere; it tracks the current SDK (`eas-update/SKILL.md:89` names
"SDK 55 and later", `expo-dev-client/SKILL.md:154` names "SDK 58+" / "SDK 57 and earlier").

### Taken

- `references/expo-dev-client.md` — trimmed, verbatim text, from
  `plugins/expo/skills/expo-dev-client/SKILL.md`: "Important: When Development Clients Are
  Needed" (11-20), "EAS Configuration" (22-52), "Building Locally" (74-89, Android lines),
  "Installing Local Builds" (108-112, Android), "Checking Build Status" (127-135),
  "Troubleshooting" (156-175). Five rejected command lines (:83, :111, :161, :167, :174) are
  replaced in place by `# [rejected: …]` markers; no runnable copy of them is vendored.
- `references/eas-app-stores.md` — trimmed, verbatim text, from
  `plugins/expo/skills/eas-app-stores/SKILL.md`: "Version Management" (139-151), "Monitoring"
  (153-167), minus the :167 sentence that points to the iOS-only `references/testflight.md`.

### Changed (adapted into SKILL.md)

- Dev-client need (expo-dev-client 11-20) → the "EAS-built binary required" line, tied to
  CLAUDE.md:28 and `technician-app/package.json:25`; the field build is the `fleet` release
  build, not the `developmentClient` profile.
- `appVersionSource: "remote"` / `autoIncrement` meanings (expo-dev-client 48-52) → §1 versionCode
  facts against `technician-app/eas.json:4` and `:26`, plus the remote-counter downgrade risk
  (O10-F12).
- `build:version:get` / `build:version:set` (eas-app-stores 143-149) → procedure steps 4 (agent,
  read-only) and 5 ([owner]).
- `build:list` / `build:view` (eas-app-stores 155-160) → step 8, following FixFlow's own
  runbook (`docs/HANDOFF.md:83`: poll `build:list`, not `build:view`).
- `adb install build.apk` (expo-dev-client 111) → `adb install -r`, [owner], with BEFORE/AFTER
  receipts (`references/fixflow-build-receipt.md`).
- `eas credentials` (expo-dev-client 161; play-store 158) → keystore custody steps 16-19, all
  [owner], download-only.
- Local build (expo-dev-client 74-89) → forbidden on the Windows owner machine per the
  local-builds page (below).
- eas-update model (43-62, 64-70, 101-110) → the reasons R7 holds, in §5 only.

### Rejected (with reason)

- `eas-update/SKILL.md` as a whole (not vendored): ruling R7
  (`docs/program/SHIP-PLAN-2026-11.md:1483`). Cited by path only so no OTA instruction sits in
  the package. Specific collisions: :12 (OTA without a binary), :28 (`expo install
  expo-updates`), :34 (`update:configure`), :83-87 (`update --channel`), :127 (channel surfing).
- `expo-dev-client/SKILL.md:111` `adb install build.apk` (no `-r`): standing rule 1, O-10 E2.
- `expo-dev-client/SKILL.md:158-161` and `play-store.md:153` (run `eas credentials` on
  signing errors, where a keystore can be regenerated; "Upload key can be reset"): keystore
  not re-mintable (O-08 §1), no Play signing, README rule 4.
- `expo-dev-client/SKILL.md:167` `eas build -p ios --profile development --clear-cache`: iOS,
  and never the `development` profile for the field.
- `eas-app-stores/SKILL.md:167` sentence "See `references/testflight.md` …": points to an iOS
  file that is not vendored; dropped from the trim.
- `expo-dev-client/SKILL.md:174` `eas update` as a version check: R7.
- `eas-app-stores/SKILL.md:65-76` and `play-store.md:132-143` (`--auto-submit`, `eas submit`,
  `npx testflight`): FixFlow publishes to no store; README rule 4.
- `eas-app-stores/SKILL.md:38, 45, 56-62` (`npm install -g eas-cli`, `npx eas-cli@latest`):
  README rule 6, exact versions.
- `eas-app-stores/SKILL.md:148` `build:version:set` as routine: an [owner] write (O10-F12).
- `play-store.md` (not vendored): service account, tracks, staged rollout, Play App Signing —
  no Play listing. Its :225 "internal distribution via `--profile development`" and :230 "Or use
  EAS Update" collide with the fleet-only rule (plan:429-430) and R7.
- `expo-dev-client/SKILL.md:83` `--local` build: Windows unsupported (web fact below), and
  never the `development` profile for the field.
- `references/app-store-metadata.md`, `ios-app-store.md`, `native-ios.md`, `testflight.md`;
  expo-dev-client TestFlight / iOS install (54-72, 93-106): iOS; FixFlow is Android-only.
- `expo-dev-client/SKILL.md:137-154` "Using the Dev Client" (Metro, launch URLs): field APKs
  are not Metro-connected; the SDK-57-and-earlier URL form is unverified for expo-dev-client
  5.0.x.
- `references/workflows.md`, "Web & API Route Hosting", `agents/openai.yaml` files: FixFlow
  builds by hand; unrelated; other tool format.
- "Submitting Feedback" sections (`npx --yes @expo/agent-cli@latest feedback …`): an agent
  never sends data to a third party unasked; unpinned.
- In-repo collision recorded, not upstream: `technician-app/package.json:9`
  `"android": "expo run:android"` vs design §8 (`docs/ORCHESTRATION-DESIGN-2026-10.md:598`).

All ten collisions in the survey's §4 (SOURCE-NOTES, 2026-11-04) are rejected above; none
adopted.

## Web sources (re-fetched by the author, 2026-11-04)

| URL | Result | Used for |
| --- | --- | --- |
| https://docs.expo.dev/build-reference/local-builds/ | ok | "do not support Windows for local builds (macOS and Linux are supported)"; WSL untested; secret-visibility variables unsupported locally; managed credentials downloaded for the build |
| https://docs.expo.dev/build-reference/app-versions/ | ok | "The `remote` version source is the recommended behavior from EAS CLI version `12.0.0`."; production builds auto-increment versionCode; `build:version:set` syncs the last published number (`build:version:get` not on that page) |
| https://docs.expo.dev/app-signing/app-credentials/ | ok | keystore private, never in the repo; outside Play App Signing a lost keystore cannot be recovered or reset; `eas credentials` download flow |
| https://docs.expo.dev/build/internal-distribution/ | ok | `"distribution": "internal"` builds an APK instead of an AAB; install over USB |
| https://docs.expo.dev/versions/v52.0.0/sdk/dev-client/ | failed for SDK 52 (survey fetch, 2026-11-04: served SDK 58 content) | `WEB_UNAVAILABLE: SDK 52 expo-dev-client 5.0.x docs page` |
| https://docs.expo.dev/eas-update/introduction/ | ok (survey fetch, 2026-11-04; not re-fetched) | not used beyond confirming the OTA model R7 rejects |
