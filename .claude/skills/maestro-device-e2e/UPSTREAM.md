# UPSTREAM — maestro-device-e2e

Status: **sourced**. Written 2026-11-04.

## terminalskills-skills

| Field | Value |
| --- | --- |
| Repo | https://github.com/TerminalSkills/skills |
| Commit | `0abb852010feb21984fa40f0bf52352a440ae6d4` |
| Branch | `main` |
| Fetched | 2026-11-04 (sparse, shallow clone) |
| Paths taken | `skills/maestro/SKILL.md` (8802 B). `skills/maestro/_scores.json` (scorer metadata) not taken |
| Licence | Apache-2.0 (root `LICENSE`; the skill's frontmatter `license: Apache-2.0`, upstream `SKILL.md:10`) |
| Licence file here | `LICENSE-terminalskills` — the root `LICENSE` copied verbatim with `cp` (sha256 prefix `7ca6708e12ed99de` on both copies) |
| Upstream version note | "Checked against CLI 2.11.0 (29 September 2026)." (`SKILL.md:24`); metadata `version: "1.1.0"` (`SKILL.md:14`) — kept in the trimmed reference |

The tool itself (https://github.com/mobile-dev-inc/maestro) is not vendored.

### Taken

- `references/maestro-upstream.md` — **trimmed** from `skills/maestro/SKILL.md`: Overview (incl.
  the 2.11.0 note), Install (checksum-verified zip + the Windows sentence; brew dropped), Devices
  (Android lines), the `appId` and env-passing sentences of "A basic flow", the command/selector
  paragraph of "Scrolling, conditions and sub-flows", "Running suites and reports" whole, and five
  Guidelines bullets (`:196-200`). Text kept verbatim; header comment names what was dropped.

### Changed (adapted into SKILL.md and the authored references)

- Upstream's generic flows (fictional `com.brightbasket.shop`, email/password login) became
  FixFlow flows under `references/flows/` selecting the strings at the `file:line`s in
  `references/selectors-and-testids.md`; no `launchApp` (upstream `:69`, `:91`) — a person opens
  the app.
- Upstream's "pass with `-e` or `MAESTRO_*`" (`:79`, `:198`) narrowed to `MAESTRO_FIXFLOW_PIN` /
  `MAESTRO_FIXFLOW_TECH` set in the owner's own shell, one login attempt, no `retry`.
- Upstream's "prefer `id` selectors" (`:196`) became the missing-testID table and the rule that
  testIDs ship only inside a normal versionCode (plan standing rule 1).
- Upstream's `--format junit --output` and `--test-output-dir` (`:119`, `:125`) kept as the run
  command, with the output folder outside the repository.
- Upstream's `extendedWaitUntil` advice (`:197`) used for the operator-assisted camera/mic waits.

### Rejected (with reason)

Every collision from the survey's SOURCE-NOTES §5, plus the ones found while writing:

| Upstream (line) | Rejected because |
| --- | --- |
| `:160` `adb install app/build/outputs/apk/debug/app-debug.apk` | plan rule 1 and O-10 E2: signed EAS builds, `adb install -r`, owner-supervised, never on a roster phone before its drain; a local debug APK implies `expo run:android`/`prebuild` (README rule 2) |
| `:70` `clearState: true`; `:191` `permissions: { all: allow }` | clearing wipes every queue (O-10 A1; CLAUDE.md "The outbox never deletes a write"); grants are the state the O-01 protocol measures |
| `:69`, `:91` bare `launchApp` | the launchApp page says stopApp "Defaults to `true`" and "By default, all permissions are allowed" (WEB, fetched 2026-11-04): a force-stop (O-01 "Avoid `am force-stop`") plus a silent grant |
| `:54`, `:56`, `:173-174` any connected device / `start-device` emulator | one named spare or pilot phone; an emulator is not fleet evidence (plan rule 2) |
| `:129-133` Maestro MCP "an agent can inspect a live device, tap…", `claude mcp add` / `codex mcp add` | unscripted taps are writes (CLAUDE.md "Mobile mutations go through the outbox"); agent/MCP configuration is the owner's |
| `:79`, `:82`, `:174` `-e PASSWORD="$QA_PASSWORD"` | the PIN never appears on a command line an agent writes (README rule 3) |
| `:40-43`, `:48` curl download / install script | a binary download and `PATH` change on the owner's laptop are `[owner]` |
| `:136-166` GitHub Actions emulator job; `:166` `maestro cloud` | no device gate in CI (CLAUDE.md "`expo export` … bundles JS only"); Cloud uploads the APK and screens with customer data to a third party |
| `:112` `setPermissions`, `runScript`/`evalScript`, `openLink` | device-state changes and outbox bypasses (SKILL.md §4 items 12, 14) |
| `:55`, `:179-191`, `:195`, `:201` iOS / physical iPhone / Detox-Appium notes | the app is Android-only (CLAUDE.md) |
| `:26` Maestro Studio / Viewer / Cloud overview | kept in the trimmed text for orientation only; Studio and Cloud are not used |
| `:118` `--include-tags` | not dropped from the reference, but not relied on: the survey found no docs page for it; the procedure runs one flow file at a time |

## Web sources

Fetched in this run (2026-11-04):

| URL | Used for |
| --- | --- |
| https://docs.maestro.dev/api-reference/commands/launchapp | stopApp default `true`; "By default, all permissions are allowed"; clearState |
| https://docs.maestro.dev/advanced/parameters-and-constants | `MAESTRO_` prefix read automatically (CLI only); `-e`; `${VAR \|\| "default"}` |
| https://docs.maestro.dev/get-started/supported-platform/android | "USB Debugging" on physical devices; connects via ADB; silent on a helper app |
| https://docs.maestro.dev/api-reference/selectors | `text` and `id` are regex-based; Accessibility Tree; silent on full-match and hint text |

From the survey (SOURCE-NOTES §6, fetched 2026-11-04, re-used not re-fetched):

| URL | Fact |
| --- | --- |
| https://github.com/mobile-dev-inc/maestro/releases/latest | latest `cli-2.12.1`, "02 Nov" (year INFERRED 2026) |
| https://docs.maestro.dev/maestro-cli/how-to-install-maestro-cli | Java 17+, `JAVA_HOME`; Windows zip + `PATH`; WSL needs an adb server on Windows |
| https://docs.maestro.dev/cli/test-suites-and-reports | `--test-output-dir`, `--format junit --output`; per-flow `device-logcat.txt` |
| https://docs.maestro.dev/getting-started/installing-maestro | attempted; Studio installers only, no CLI facts (not useful) |

Not verified anywhere: `--include-tags`; whether Maestro installs a helper app on the phone;
whether `inputText` values (the PIN) are echoed into `commands.json` or the console.
