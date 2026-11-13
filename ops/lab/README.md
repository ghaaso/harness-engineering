# ops/lab — local Android compile gate

`android-compile.sh` answers one question in minutes instead of an EAS queue: **does this
worktree's `technician-app` compile to an Android APK?** CI's `npx expo export` bundles
JavaScript only; it cannot see a Gradle or native break (a config plugin that writes bad
Gradle, a `patch-package` patch that no longer applies, a native dependency mismatch). This
gate runs the real chain — `npm ci` → `expo prebuild --platform android` → `gradlew
assembleRelease` — in a container, on this machine's idle cores. Ship plan §7.5 phase L2.

## What it proves, and what it does not

| Proves | Does not prove |
| --- | --- |
| `npm ci` installs from the lockfile on Node 22 (CI's version) | that an **EAS** build passes: EAS bakes the `eas.json` profile's `EXPO_PUBLIC_*` env, uses its own image and the remote keystore and versionCode |
| every config plugin runs under `expo prebuild` and the generated native project is valid | anything about runtime behaviour, background execution or reliability on a phone (standing rule 2) |
| every native module compiles (Kotlin/Java, NDK/CMake for 4 ABIs), Hermes bytecode compiles, R8/resource shrinking pass, the APK packages and signs | that the app talks to the right API: no `EXPO_PUBLIC_API_URL` is set, so the bundle falls back to `http://10.0.2.2:8000` (`src/lib/config.ts`) |
| the worktree is not written to (mounted read-only; `git status` compared before/after) | iOS (out of scope for FixFlow) |

**The APK is signed with the prebuild template's public debug key.** It is a compile
artifact: it must **never** be installed on a roster phone (plan standing rule 1). It cannot
install over the field app anyway (different signing certificate), and it bakes no API host.
Only EAS builds reach phones.

## Run it

```bash
bash ops/lab/android-compile.sh <lane> <worktree> [release|debug]
# e.g. from a lane worktree:
bash ops/lab/android-compile.sh p5a . release
```

Run it in the background; it blocks until it holds **2 slots** of the shared lock
(`docs/program/lab/ff-slot.sh` on the program branch; its PID is on the slot, and a trap
releases the slots and removes the container on exit, error, Ctrl-C or TERM).

Output: `C:/Users/User/.fixflow-cache/lab/<lane>/android-<stamp>/`

- `app-<variant>.apk`
- `build.log` — the full log, with every value from `app.json`'s key/secret/id fields,
  `google-services.json` and `eas.json`'s `env` blocks replaced by `[REDACTED]`; the script
  re-scans and withholds the log (exit 97) if any remain
- `summary.txt` — `exit_code`, `failed_stage`, `wall_seconds`, per-stage seconds, `apk_bytes`,
  `abis`, `signer_sha256` (`apksigner verify --print-certs`), the `aapt2 dump badging` package
  line (package, versionCode, versionName), `git_status_unchanged`

Exit code: 0 only when an APK was produced, the redaction check passed and the worktree's
`git status` is unchanged. A build failure returns the build's code (`failed_stage` names the
stage: `copy`, `npm-ci`, `hook`, `prebuild`, `gradle`, `collect`); 124 = timeout; 137 = killed
(out of memory); 3 = refused to start (e.g. `technician-app/android/` exists in the worktree,
another build of the same lane is running); 4 = slot acquire failed; 5 = image build failed;
6 = no APK; 7 = the worktree changed.

### How it works

1. Builds `fixflow-android-build:<first 12 hex of sha256(Dockerfile.android)>` if missing,
   with **no build context** (`docker build - < Dockerfile.android`), so no repository file
   can enter an image layer.
2. Lists the worktree's `technician-app/` files with `git ls-files --cached --others
   --exclude-standard` (tracked + new-but-not-ignored: `.env`, `.eastoken`, `node_modules`
   never enter), mounts the worktree **read-only** at `/src`, and copies those files to
   `/work/technician-app` inside the container.
3. `npm ci`; then, for spikes only, the optional `FF_ANDROID_HOOK` script (the summary marks
   the run `MODIFIED`); `npx expo prebuild --platform android --no-install` in the copy;
   `./gradlew --build-cache assembleRelease` (or `assembleDebug`).
4. Caches: named volumes `fixflow-gradle-cache` (`/root/.gradle`: Gradle distribution,
   dependencies, build cache, and `ccache` for the NDK compiles via
   `CMAKE_<LANG>_COMPILER_LAUNCHER`) and `fixflow-npm-cache` (`/root/.npm`). The copy, the
   generated `android/` and the template's debug keystore live only in the container, which
   is `--rm`.
5. Limits: `--memory 10g` (no swap), `--cpuset-cpus 0-7` (the container sees 8 CPUs, which
   also bounds ninja/clang parallelism), Gradle `-Xmx4g`, Kotlin daemon `-Xmx2g`,
   `--max-workers 6`, a 100-minute timeout. All overridable: `FF_ANDROID_MEM`,
   `FF_ANDROID_CPUSET`, `FF_ANDROID_XMX`, `FF_ANDROID_WORKERS`, `FF_ANDROID_TIMEOUT_MIN`.

Never run `expo prebuild` or `expo run:android` in a checkout of `technician-app/` — it
creates `technician-app/android/`, which is not gitignored and makes EAS treat the project as
bare. This gate refuses to start if that directory exists.

## Toolchain (verified 2026-11-13)

MEASURED_TOOLCHAIN

## Measured times

MEASURED_TIMES

## `eas build --local` in this container?

EAS_LOCAL
