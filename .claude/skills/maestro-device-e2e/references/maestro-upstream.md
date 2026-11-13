<!-- Trimmed from https://github.com/TerminalSkills/skills @ 0abb852010feb21984fa40f0bf52352a440ae6d4 skills/maestro/SKILL.md (Apache-2.0): kept sections Overview, Install (zip + Windows), Devices (Android lines), the env-passing sentence of "A basic flow", the command/selector paragraph of "Scrolling, conditions and sub-flows", "Running suites and reports", and five Guidelines bullets; dropped the frontmatter, every example flow (fictional app, clearState), iOS lines, the MCP `mcp add` lines, the GitHub Actions job and the Examples section. FixFlow's overrides are in ../SKILL.md "Where upstream disagrees" — this file is reference, not procedure. -->

# Maestro

## Overview

Maestro tests an app the way a user sees it: it reads the screen through the platform accessibility layer and taps, types and scrolls by text or id. Flows are plain YAML interpreted at run time (no compile step), the same syntax covers React Native, Flutter, native Android/iOS and web, and built-in waiting removes most manual `sleep` calls. Checked against CLI 2.11.0 (29 September 2026).

Pieces to know: the open-source CLI (`maestro test`, `maestro mcp`), Maestro Studio (a free desktop app for building flows visually; the old `maestro studio` command was removed from the CLI in 2.6), Maestro Viewer, and Maestro Cloud (paid parallel runs on hosted devices).

## Instructions

### Install

Maestro needs Java 17+ (`java -version`, and `JAVA_HOME` must point to it).

```bash
# Linux / CI: download the release zip and check it against the published checksum
curl -fsSLO https://github.com/mobile-dev-inc/maestro/releases/download/cli-2.11.0/maestro.zip
curl -fsSL https://github.com/mobile-dev-inc/maestro/releases/download/cli-2.11.0/checksums_sha256.txt | sha256sum -c -
unzip -q maestro.zip -d "$HOME/.maestro-cli"
export PATH="$HOME/.maestro-cli/maestro/bin:$PATH"

maestro --version
```

The docs also show an install script (`curl ... get.maestro.mobile.dev | bash`); prefer the package manager or the checksum-verified zip above. On Windows, unzip `maestro.zip` and add its `bin` folder to `PATH`.

### Devices

```bash
maestro list-devices                            # emulators/simulators and connected devices
maestro --device emulator-5554 test flows/login.yaml   # pick one device explicitly
```

### A basic flow

The header holds `appId` (Android package or iOS bundle id; for web use `url:` instead). Everything after `---` is a command list.

Pass values with `-e` or export shell variables prefixed `MAESTRO_` (CLI only). Parameters arrive as strings; `env:` in the flow defines constants and defaults.

### Scrolling, conditions and sub-flows

Other useful commands: `assertNotVisible`, `extendedWaitUntil` (custom timeout), `retry`, `repeat`, `swipe`, `back`, `hideKeyboard`, `openLink`, `setPermissions`, `runScript`/`evalScript` (JavaScript), `startRecording`. Selectors accept `text`, `id`, `index`, `point`, relational (`below`, `childOf`) and state (`enabled`, `checked`) matchers; prefer `id` (accessibility identifier) when text is ambiguous or localized.

### Running suites and reports

```bash
maestro test flows/                                    # every flow in a folder
maestro test --include-tags=smoke flows/               # tags are set in each flow header
maestro test --format junit --output report.xml flows/ # JUNIT or HTML reports
maestro test --shard-split 2 flows/                    # spread flows over 2 connected devices
maestro test --continuous flows/login.yaml             # re-run on file change while authoring
maestro record --local flows/login.yaml                # render an MP4 on your machine
```

Screenshots, logs and `commands.json` land in `~/.maestro/tests` unless `--test-output-dir` is set. A workspace `config.yaml` can set `flows`, tags, `executionOrder` and `onFlowStart`/`onFlowComplete` hooks.

## Guidelines

- Prefer `id` selectors plus accessibility labels in the app (`accessibilityIdentifier` on iOS, `testID`/resource ids on Android and React Native, `Semantics` in Flutter); text selectors break when copy or locale changes.
- Do not add `sleep`-style waits: use `assertVisible`, `extendedWaitUntil` or `scrollUntilVisible`, which retry automatically.
- Keep secrets out of flows: pass them with `-e` or `MAESTRO_*` variables from CI secrets; never commit real credentials. Use a card number like Stripe's test card only against a sandbox.
- `maestro record` without `--local` uploads the capture to Maestro's servers for rendering (a deprecated path); use `--local` for private apps.
- `maestro chat` was discontinued; use the MCP server. Parameters are strings, so parse numbers in JavaScript.
