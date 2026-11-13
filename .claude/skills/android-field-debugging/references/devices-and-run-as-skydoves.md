<!-- Trimmed from https://github.com/skydoves/android-testing-skills @ 8665ed59643c90eb1056a256a6ddec161aa1cfa1 (Apache-2.0, author Jaewoong Eum (skydoves)): kept adb/devices/connecting-to-devices/SKILL.md Workflow steps 1-3 and 5 (step 4, which reboots and injects a key event, is dropped), and adb/transfer/extracting-test-artifacts/SKILL.md "Path permission rules" (table, /sdcard, /data/data) and "run-as on debuggable builds". Text below each heading is verbatim. -->
<!-- FixFlow override (see ../SKILL.md): run-as on a technician phone is read-only (cat, ls, tar cf -) and only after the [owner] approves; whether the field APK is debuggable is unknown until `dumpsys package` shows its pkgFlags. -->

## From adb/devices/connecting-to-devices/SKILL.md

## Workflow

- [ ] **1. Run `adb devices` first, every time.** It prints one line per attached transport in the form `<serial> <state> [details...]`. Add `-l` whenever scripting:
    ```bash
    adb devices -l
    # List of devices attached
    # emulator-5556  device  product:sdk_google_phone_x86_64 model:Android_SDK_built_for_x86_64 device:generic_x86_64 transport_id:1
    # 0a388e93       device  usb:1-1 product:razor model:Nexus_7 device:flo transport_id:2
    ```
    `-l` adds `product`, `model`, `device`, `transport_id`, and (for USB) the USB bus path.

- [ ] **2. Pick the right selector for the situation:**
    | Flag | Meaning | Fails when |
    |---|---|---|
    | `-s <serial>` | Explicit serial. Works for USB serials (`0a388e93`), emulators (`emulator-5554`), and TCP devices (`192.168.1.42:5555`). Overrides `$ANDROID_SERIAL`. | Serial not connected. |
    | `-d` | The single USB device. | Zero or more than one USB device. |
    | `-e` | The single TCP/IP device (covers emulators and `adb connect`-ed phones). | Zero or more than one TCP device. |
    | `-t <transport_id>` | Numeric transport ID from `adb devices -l`. Stable across re-plugs of the same port. | Transport ID not present. |

    Note: `-t` is the **transport ID**, not a timeout flag. Wrap with shell `timeout` (or `gtimeout` on macOS) if the goal is a per-command time limit.

- [ ] **3. Filter to "ready" devices in scripts:**
    ```bash
    adb devices | awk '$2=="device"{print $1}'
    ```
    Single-device shortcuts: `adb get-serialno` returns the serial, `adb get-state` returns one of `offline | bootloader | device`, `adb get-devpath` returns the USB path. For the full state set, parse `adb devices` directly.

- [ ] **5. Read device states correctly.** From the adb page (`Query for devices`) plus `adb help`:
    | State | Meaning | Recovery |
    |---|---|---|
    | `device` | Online, `adbd` is responsive. **Does not** imply boot complete — gate on `sys.boot_completed`. | n/a |
    | `offline` | Transport exists but `adbd` isn't talking. Common after suspend/resume or USB hubs. | `adb reconnect offline`, then re-plug if needed. |
    | `unauthorized` | Host RSA key not yet accepted on-device. | Unlock device, tap **Allow** on the on-device dialog. Try a different USB cable if no dialog appears (some "charge-only" cables block data). |
    | `recovery` | Booted into recovery. Only a small subset of `adb` works. | n/a |
    | `sideload` | OTA sideload mode. Use `adb sideload package.zip`. | n/a |
    | `bootloader` | At the bootloader (fastboot). `adb` cannot talk; use `fastboot`. | n/a |
    | `rescue` | Rescue Party mode (Android 10+). | n/a |
    | `connecting` | Transient TLS handshake state over wireless. | wait. |
    | `no permissions` | (Linux only) USB visible but blocked by missing udev rules. | install rules — see step 7. |


## From adb/transfer/extracting-test-artifacts/SKILL.md

## Path permission rules

This is the load-bearing table. Most "permission denied" `adb pull` failures come from misunderstanding it.

| Path | adb shell writable? | `pull` works? |
|---|---|---|
| `/data/local/tmp/` | Yes | Yes |
| `/sdcard/` (= `/storage/emulated/0/`) | Yes (scoped storage rules on API 30+) | Yes |
| `/data/data/<pkg>/` | Only via `run-as <pkg>` (debuggable builds) | Only via `run-as` |
| `/sdcard/Android/data/<pkg>/files/` | Package-owned, scoped storage | Yes for the owning package, and yes for `adb shell` (FUSE/sdcardfs bridge) |
### `/sdcard/`

Alias `/storage/emulated/0/`, sometimes `/storage/self/primary/`. Public/external storage. ADB's `shell` user retains FUSE/sdcardfs access on API 30+, so `adb push /sdcard/...` and `adb pull /sdcard/...` work for tests even after scoped storage tightening. App-side writes are gated through MediaStore on API 30+.

### `/data/data/<pkg>/` — `run-as` only

Owned by the app's UID; `0700` on the dir itself. A bare `adb pull /data/data/com.example/...` fails on production user builds. Two viable paths:

- **`run-as <pkg>`** on debuggable builds (most common).
- **`adb root`** on `userdebug`/`eng` builds (covered briefly in `../../automation/scripting-adb-for-ci/SKILL.md`).
## `run-as` on debuggable builds

`run-as <pkg>` is a setuid helper baked into Android since Gingerbread. It drops shell into the app's UID **if and only if** the APK has `android:debuggable="true"` in its merged manifest (the default for the `debug` build variant). Usage: `adb shell run-as <pkg> <cmd>`.

### Text-file grab

```bash
adb shell run-as com.example.app cat databases/main.db > main.db
```

This works for short text files. For binary files it can corrupt bytes via PTY translation (see `exec-out` below).

### Binary-clean grab via `exec-out` + `tar`

For directories, binary files, or anything with `\n` in the bytes, **MUST** use `exec-out` (binary-clean stdout) and pipe through `tar`:

```bash
adb exec-out run-as com.example.app tar cf - databases/ \
  | tar xf - -C ./pulled
```

The `tar cf -` produces an archive on stdout; the local `tar xf -` extracts it into `./pulled/`. No intermediate file, no PTY translation, works for arbitrary binary content.

### Single-file binary grab

```bash
adb exec-out run-as com.example.app cat databases/main.db > main.db
```

`exec-out` keeps stdout binary-clean.

### Listing

```bash
adb shell run-as com.example.app ls -lR files/
```

### Three things `run-as` cannot do

1. Work on release / non-debuggable builds. Will print "Package is not debuggable".
2. Switch to a system UID (only the target package's UID).
3. Cross profile boundaries by itself. Use `--user N` if needed.
