<!-- Trimmed from https://github.com/expo/skills @ a9e5bd3fa00b4e61f632e43f85da73aee1942582 plugins/expo/skills/expo-dev-client/SKILL.md (MIT): kept sections "Important: When Development Clients Are Needed", "EAS Configuration", "Building Locally" (Android lines only), "Installing Local Builds" (Android lines only), "Checking Build Status", "Troubleshooting"; dropped frontmatter, the pricing note, TestFlight, iOS install, "Building for Specific Platform", "Using the Dev Client", "Submitting Feedback". Text below is verbatim except the five marked lines (next comment). -->
<!-- FixFlow replaced five upstream command lines below with `# [rejected: …]` markers (upstream :83 `--local` build, :111 install without -r, :161 credentials on a signing error, :167 the iOS cache-clear example, :174 the OTA command); every other line is verbatim. Read SKILL.md "Where upstream disagrees" before acting on anything here. Upstream carries no SDK-version note for these sections; it tracks the current SDK, not SDK 52. -->

## Important: When Development Clients Are Needed

**Development clients are the recommended setup for any real or production app.** Expo Go is a playground for learning and quick experiments with the native libraries it bundles; most apps outgrow it and move to a development client. See [Expo Go vs. development builds](https://docs.expo.dev/develop/development-builds/introduction/) for the full reasoning.

You need a dev client ONLY when using:

- Local Expo modules (custom native code)
- Apple targets (widgets, app clips, extensions)
- Third-party native modules not in Expo Go
- Config plugins, or testing remote push notifications and App/Universal Links

## EAS Configuration

Ensure `eas.json` has a development profile:

```json
{
  "cli": {
    "version": ">= 16.0.1",
    "appVersionSource": "remote"
  },
  "build": {
    "production": {
      "autoIncrement": true
    },
    "development": {
      "autoIncrement": true,
      "developmentClient": true
    }
  },
  "submit": {
    "production": {},
    "development": {}
  }
}
```

Key settings:

- `developmentClient: true` - Bundles expo-dev-client for development builds
- `autoIncrement: true` - Automatically increments build numbers
- `appVersionSource: "remote"` - Uses EAS as the source of truth for version numbers

## Building Locally

Build a development client on your machine:

```bash
# Android
# [rejected: upstream :83 `--local` development build. Windows is unsupported and the field never gets the development profile. See SKILL.md §5]
```

Local builds output:

- Android: `.apk` or `.aab` file

## Installing Local Builds

Install Android build:

```bash
# [rejected: upstream :111 install without `-r`. FixFlow installs are `adb install -r`, [owner], per phone. See SKILL.md §5]
```

## Checking Build Status

```bash
# List recent builds
eas build:list

# View build details
eas build:view
```

## Troubleshooting

**Build fails with signing errors:**

```bash
# [rejected: upstream :161 credentials command. A signing error is an [owner] stop; keystore custody is [owner]. See SKILL.md §5]
```

**Clear build cache:**

```bash
# [rejected: upstream :167 iOS cache-clear example. FixFlow is Android-only. See SKILL.md §5]
```

**Check EAS CLI version:**

```bash
eas --version
# [rejected: upstream :174 OTA command. Ruling R7 forbids it, even as a probe. See SKILL.md §5]
```
