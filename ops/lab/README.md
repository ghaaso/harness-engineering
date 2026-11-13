# ops/lab — local Android compile gate

`android-compile.sh` answers one question in minutes instead of an EAS queue: **does this
worktree's `technician-app` compile to an Android APK?** CI's `npx expo export` bundles
JavaScript only. It cannot see a Gradle or native break: a config plugin that writes bad
Gradle, a `patch-package` patch that no longer applies, a native dependency mismatch. This
gate runs the real chain (`npm ci`, `expo prebuild --platform android`, `gradlew
assembleRelease`) in a container. Ship plan §7.5, phase L2.

## The APK is compile evidence only

**The APK this gate produces (`COMPILE-ONLY-debugkey-<variant>.apk`) is never installed on any
phone, roster or spare, and is never distributed.** It exists to prove that the native project compiles, and it is kept only as
that evidence (plan standing rule 1: only EAS builds reach phones).

- It is signed with the prebuild template's **public** debug key, so it could not install
  over the field app anyway (different signing certificate).
- It cannot reach a real server: no `EXPO_PUBLIC_API_URL` is set, so the bundle bakes the
  fallback API base, the emulator loopback `http://10.0.2.2:8000`
  (`technician-app/src/lib/config.ts`), and no Sentry DSN is set. To keep it that way the
  script refuses (exit 3, naming the files, never their contents) a copy list that carries
  `technician-app/.env*` other than `.env.example`, a `credentials.json`, or a `*.keystore` /
  `*.jks`: those are not gitignored, and Expo would load an `.env.production` into the release
  bundle without the redaction ever seeing it.
- It does carry the Maps and Firebase keys from `app.json` / `google-services.json`, as any
  build of this app does, so the output directory must stay outside every git checkout; the
  script refuses an `FF_LAB_OUT` inside one.

## What it proves, and what it does not

| Proves                                                                                                                                                 | Does not prove                                                                                                                           |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `npm ci` installs from the lockfile on Node 22 (CI's version)                                                                                          | that an **EAS** build passes: EAS bakes the `eas.json` profile's env, uses its own image, the remote keystore and the remote versionCode |
| every config plugin runs under `expo prebuild` and the generated native project is valid                                                               | anything about runtime behaviour, background execution or reliability on a phone (standing rule 2)                                       |
| every native module compiles (Kotlin/Java; NDK/CMake for 4 ABIs), Hermes bytecode compiles, R8 and resource shrinking pass, the APK packages and signs | that the app talks to the right API (see above)                                                                                          |
| the worktree is not written to (mounted read-only; `git status` and HEAD compared before and after)                                                    | iOS (out of scope for FixFlow)                                                                                                           |

## Run it

```bash
bash ops/lab/android-compile.sh <lane> <worktree> [release|debug]
```

For example, from a lane worktree: `bash ops/lab/android-compile.sh p5a . release`. Run it in
the background. It queues for **2 slots** of the shared lock (`ff-slot.sh` in
`docs/program/lab/` on the program branch), which is the whole machine, with its own PID on
the slots. It checks `docker info` first, so a stopped Docker fails at once instead of after the
queue. A trap releases the slots and removes the container on exit, error, Ctrl-C, TERM or
HUP. A hard kill (SIGKILL, a task stop, `taskkill /F`) cannot be trapped: the lock reaps the
slots once the PID is gone, but the container (labelled `fixflow.holder=<holder>`) runs on.
The next run therefore removes, as soon as it holds every slot and before starting its own,
any running container named `fixflow-*-android` that carries that label or this image
(`orphans_removed` in its summary). Every run that gets as far as creating its output folder
leaves a `summary.txt`, including refusals and interrupts.

Output goes to `C:/Users/User/.fixflow-cache/lab/<lane>/android-<stamp>/`:

- `COMPILE-ONLY-debugkey-<variant>.apk` (the name says what it is: compile evidence, debug-key
  signed)
- `build.log`: the full log. Every value from `app.json`'s key, secret, token, DSN, id and URL
  fields, from `google-services.json` and from `eas.json`'s `env` blocks is replaced by
  `[REDACTED]`. The script re-scans the log and withholds it (exit 13) if any value remains,
  or if those files cannot be parsed.
- `summary.txt`: `exit_code`, `note`, `failed_stage`, `wall_seconds`, `slot_wait_seconds`,
  per-stage seconds, `worktree_head`, `worktree_dirty`, `copy_sha256` (a hash of the exact
  bytes copied), `apk_bytes`, `abis`, `signer_sha256` (`apksigner verify --print-certs`), the
  `aapt2 dump badging` package line (package, versionCode, versionName), min/target SDK,
  `container_memory_peak_mib`, `container_oom_kills`, `ccache` hits, `sdk_autoinstalls`
  (should be 0), `slot_acquire_requeues`, `orphans_removed`, and `git_status_unchanged`.

Exit codes:

| Code | Meaning                                                                                                                                                                                                 |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0    | APK built, redaction check passed, worktree unchanged                                                                                                                                                   |
| 2    | usage                                                                                                                                                                                                   |
| 3    | refused to start: Docker not reachable, `FF_ANDROID_XMX` above 4g, `technician-app/android/` exists, `FF_LAB_OUT` is inside a checkout, a secret-bearing file is in the copy list, a git command failed |
| 4    | slot acquire failed                                                                                                                                                                                     |
| 5    | image build failed                                                                                                                                                                                      |
| 6    | the build exited 0 but produced no APK                                                                                                                                                                  |
| 7    | the worktree's status or HEAD changed during the run                                                                                                                                                    |
| 8    | `docker run` could not start the container                                                                                                                                                              |
| 10   | the build failed (`failed_stage` names the stage: `copy`, `npm-ci`, `hook`, `prebuild`, `gradle`, `collect`)                                                                                            |
| 11   | timed out                                                                                                                                                                                               |
| 12   | killed: out of memory (also when only a Gradle child was OOM-killed: the cgroup's `oom_kill` counter decides), or a timeout's kill-after                                                                |
| 13   | redaction check failed: `build.log` withheld                                                                                                                                                            |
| 130  | interrupted                                                                                                                                                                                             |

### How it works

1. It builds `fixflow-android-build:<first 12 hex of sha256(Dockerfile.android)>` if that tag
   is missing, with **no build context** (`docker build - < Dockerfile.android`), so no
   repository file can enter an image layer.
2. After the slot wait it records HEAD and `git status`, and lists the worktree's
   `technician-app/` files with `git ls-files --cached --others --exclude-standard`: tracked
   files plus new files that are not ignored, so `.env`, `.eastoken` and `node_modules` never
   enter. It mounts the worktree **read-only** at `/src` and copies those files to
   `/work/technician-app` inside the container.
3. In the copy: `npm ci`; for spikes only, the `FF_ANDROID_HOOK` script (the summary marks
   the run `MODIFIED`); `npx expo prebuild --platform android --no-install --template
expo-template-bare-minimum@52.0.79` (pinned: the `sdk-52` dist-tag moves; 52.0.79 is what it
   resolved to when this gate was verified); the generated Gradle wrapper gets the
   `distributionSha256Sum` that services.gradle.org publishes for `gradle-8.10.2-all.zip`
   (the template ships none); then `./gradlew --build-cache assembleRelease` (or
   `assembleDebug`).
4. Caches live in named volumes: `fixflow-gradle-cache` at `/root/.gradle` holds the Gradle
   distribution, dependencies, the build cache, and `ccache` for the NDK compiles (through
   `CMAKE_<LANG>_COMPILER_LAUNCHER`); `fixflow-npm-cache` sits at `/root/.npm`. The copy, the
   generated `android/` and the template's debug keystore live only in the container, which
   runs with `--rm`. **The `fixflow-gradle-cache` volume is secret-bearing:** the Gradle build
   cache stores task outputs, including the processed `google-services` resources and the
   merged manifest with the Maps key, unredacted. Never export, copy or attach that volume.
   `FF_ANDROID_GRADLE_VOL` / `FF_ANDROID_NPM_VOL` name other volumes (`fixflow-*`) for a cold
   build without wiping the shared ones.
5. Limits: `--memory 6g` with no swap; `--cpuset-cpus 0-7`, so the container sees 8 CPUs,
   which also bounds ninja and clang; Gradle `-Xmx3g` with Kotlin compiling inside the Gradle
   JVM; `--max-workers 8`; a 100-minute timeout. Each is overridable: `FF_ANDROID_MEM`,
   `FF_ANDROID_CPUSET`, `FF_ANDROID_XMX` (at most 4g), `FF_ANDROID_WORKERS`,
   `FF_ANDROID_TIMEOUT_MIN`.

Never run `expo prebuild` or `expo run:android` in a checkout of `technician-app/`. It creates
`technician-app/android/`, which is not gitignored and makes EAS treat the project as bare.
This gate refuses to start if that directory exists.

## Toolchain (verified 2026-11-13)

| Component                       | Version                                                      | Where it was verified                                                                                                                            |
| ------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| base image                      | `node:22-bookworm` (Node 22.23.5), pinned by digest          | Docker Official Image; Node 22 is what CI pins (`.github/workflows/ci.yml`)                                                                      |
| JDK                             | OpenJDK 17 (Debian bookworm package)                         | the JDK EAS uses for SDK 52; AGP 8.6's minimum                                                                                                   |
| compileSdk / targetSdk / minSdk | 35 / 34 / 24                                                 | `react-native@0.76.9` `gradle/libs.versions.toml`; `expo-template-bare-minimum@sdk-52` (52.0.79) `android/build.gradle`; the built APK's badging |
| build-tools                     | 35.0.0, plus 34.0.0                                          | 35.0.0 from the two files above; 34.0.0 is AGP 8.6's default for library modules that set none (the first run downloaded it mid-build)           |
| NDK                             | 26.1.10909125                                                | both files above                                                                                                                                 |
| CMake                           | 3.22.1                                                       | `react-native@0.76.9` `ReactAndroid/build.gradle.kts`                                                                                            |
| Gradle / AGP / Kotlin           | 8.10.2 / 8.6.0 / 1.9.25                                      | the template's wrapper; `libs.versions.toml`                                                                                                     |
| architecture                    | old (`newArchEnabled=false`), Hermes on                      | the template's `gradle.properties`; `app.json` sets no `newArchEnabled`                                                                          |
| command-line tools              | `commandlinetools-linux-15859902_latest.zip`, sha256-checked | file name and sha256 as published on <https://developer.android.com/studio>                                                                      |
| prebuild template               | `expo-template-bare-minimum@52.0.79`, pinned                 | what `sdk-52` resolved to on 2026-11-13                                                                                                          |

The image build accepts the Android SDK licence agreements (`yes | sdkmanager --licenses`) on
the builder's behalf, as Android Studio and EAS's images do. Known and unpinned: the Debian apt
packages (`openjdk-17-jdk-headless`, `unzip`, `ccache`) and `platform-tools` track their
current release, so two image builds from the same Dockerfile can differ there; the tag hashes
the Dockerfile only.

## Measured times

Release builds of `main`'s `technician-app` (2026-11-13), times counted after the slots were held:

| Run                                     | Cap                                         | Time                  | Stages                                                                                                        | Peak memory                    |
| --------------------------------------- | ------------------------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| cold (empty cache volumes, first image) | 10g, Gradle 4g + separate Kotlin daemon     | **1460 s** (24.3 min) | npm ci 36 s, prebuild 3 s, Gradle 1400 s, which includes downloading Gradle 8.10.2 and every Maven dependency | about 9.1 GiB (`docker stats`) |
| warm (caches filled)                    | 6g, Gradle 3g, Kotlin in-process, 8 workers | **81 s**              | npm ci 18 s, prebuild 2 s, Gradle 50 s (619 tasks from the build cache, ccache 204/204 hits)                  | 5218 MiB, 0 OOM kills          |

Cold build at the 6g cap: not measured. The warm build at 6g peaked at 5218 MiB with no OOM;
the cold build was measured at 10g (1460 s). Both APKs: 79,870,313 bytes, ABIs `arm64-v8a
armeabi-v7a x86 x86_64`, signer SHA-256
`fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c` (the template debug key).

The redaction matches the exact secret strings. The in-loop review checked the real logs for
URL-encoded, JSON-escaped, base64 and truncated forms of each value and found none.

## Could this container run `eas build --local`?

Technically close; it has not been tried, because it needs the owner's Expo login. According
to <https://docs.expo.dev/build-reference/local-builds/> (read 2026-11-13), a local build
runs on Linux and needs Node, the project's package manager, and the Android SDK and NDK,
all of which this image has. It talks to Expo's servers only to check that the project
exists and, with managed credentials, to download them. "Caching is not supported", and the
`node`, `ndk` and `image` fields in `eas.json` are ignored. It would additionally need:

1. **The owner's Expo authentication**: `EXPO_TOKEN` passed into the container, never
   written to the image, a volume or a log. The repo's `technician-app/.eastoken` is
   gitignored, so it would never be in the copy anyway.
2. **`eas-cli`** at a pinned version, plus its local build plugin, which it fetches on first
   use.
3. **A git repository or `EAS_NO_VCS=1`**: a worktree's `.git` is a pointer file into the
   main repository, and that is not mounted, so the copy has no usable git.
4. **A decision about side effects.** `cli.appVersionSource` in `eas.json` is `remote`, so a
   local build reads, and for a profile with `autoIncrement` bumps, the versionCode on Expo's
   servers. The `remote` credentials source also downloads the **production keystore** into
   the container. Both are owner-level actions under the release rules (the
   `eas-expo-release` skill; plan P2b-1/P2c), so an agent must not run them.

This gate deliberately does not use EAS: it needs no login, writes no remote state, and
never touches the real keystore.
