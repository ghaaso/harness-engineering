# FixFlow device lab (L3a)

A stock Android 14 emulator on this PC, a local backend, and today's technician app, driven by
adb scripts that record what happens. Ship plan §7.5, phase L3a (the first part of L3). It turns
"the app does not behave as predicted in production" into checks anyone can re-run in minutes,
and gives the mobile fix phases (P2a, P2b-1, P5a) a regression check that needs no technician.

**What it cannot tell you.** This is stock Android on an emulator. It supports **no claim about
the fleet's phones**, their OEM battery managers, their radios or their owners' habits (plan
standing rule 2). A "reproduced" here means the mechanism exists in the code on stock Android;
a "not reproduced" means stock Android does not trigger it under this script, nothing more. A
field session confirms; the lab only makes it confirm instead of explore.

## The pieces

| Script                                                             | What it does                                                                                                                                                                                                                                                                                               |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `emu.sh start [--window] [--cold] \| stop \| status`               | Boots AVD `ff34` (headless unless `--window`), 2048 MB RAM cap, `-gpu host` with one automatic retry on `swiftshader_indirect`, waits for `sys.boot_completed`, enables `adb root`. Holds **one** `ff-slot.sh` slot for the emulator's whole life through a detached keeper process.                       |
| `lab-backend.sh up \| reset \| down \| status`                     | Postgres 16 + this worktree's committed backend in Docker, on the default bridge, published on `127.0.0.1:18431` (the emulator's `http://10.0.2.2:18431`). Migrated to head, seeded through the backend's own API.                                                                                         |
| `lab-backend.sh edge404 \| 5xx \| hang`                            | Replaces the backend on the same port with `edge-stub.py` (stdlib only): the dead host's 404 + `x-railway-fallback: true` + text body + no `X-FixFlow-Api`; a 503; or accept-and-say-nothing for 20 s. `up` revives the backend with its database intact.                                                  |
| `build-apk.sh [ref]`                                               | The lab APK of `ref` (default `origin/main`) through L2's `ops/lab/android-compile.sh`, from a detached throwaway worktree, with a hook that bakes `EXPO_PUBLIC_API_URL=http://10.0.2.2:18431` and allows cleartext **in the container copy only**. Needs 2 slots: stop the emulator first.                |
| `app.sh install <apk> \| grant \| login \| state \| keys \| clear` | Installs on the emulator only (refuses a bundle that lacks the lab base or contains any `eas.json` env value); grants fine, coarse, background location and notifications, denies camera (user-fixed, so a clock-in takes no selfie); signs in as lab tech `t2` by UI; dumps the queues from AsyncStorage. |
| `protocol-tracker.sh [probe d f19 a c b doze reboot revoke]`       | The adb-scriptable core of the O-01 field protocol.                                                                                                                                                                                                                                                        |
| `protocol-offline.sh [control edge404 revival 5xx airplane]`       | The outage matrix.                                                                                                                                                                                                                                                                                         |

Shared code: `lib.sh` (paths, adb/docker wrappers, emulator guard), `lib-app.sh` (UI by text,
AsyncStorage reads, service probes, `result.json` entries), `lib-proto.sh` (evidence folder,
logcat, the location feeder, clock in/out, cleanup trap).

## Running it

```bash
source /c/Users/User/.fixflow-cache/android/env.sh
bash ops/lab/device/lab-backend.sh up
bash ops/lab/device/build-apk.sh            # only when the app changed; emulator must be stopped
bash ops/lab/device/emu.sh start            # --window to watch
bash ops/lab/device/app.sh install /c/Users/User/.fixflow-cache/lab/l3a/apk/lab-<sha>-p18431.apk
bash ops/lab/device/app.sh login
bash ops/lab/device/protocol-tracker.sh
bash ops/lab/device/protocol-offline.sh
bash ops/lab/device/emu.sh stop             # always: a running emulator holds a slot
```

Evidence lands in `C:/Users/User/.fixflow-cache/lab/l3a/<protocol>-<stamp>/`, never in the
repository: `logcat.txt`, `timeline.txt` (every step, also written to logcat under tag
`FFLAB`), `services-*.txt` (`dumpsys activity services`), `state-*.json` (the queue keys),
`backend-*.txt` (the lab database rows), `stub-*.log` (every request the stub saw),
`screen-*.mp4`, and `result.json`: one entry per check with the register id it bears on, what the
register predicts, what happened, the verdict and the evidence file.

**Verdicts.** `reproduced` = the register's predicted behaviour happened. `not_reproduced` = it
did not, under this script. `inconclusive` = the precondition failed or the evidence cannot
decide, with the reason in `observed`. Rows with `register_id: control` are the lab checking
itself: their `reproduced` means the expected control outcome happened (a write landed against
the live backend, the FGS probe saw the service on duty and did not see it off duty, a headless
crossing recorded). Not every register check has a same-probe control for the other outcome:
the findings table says which do (f19 pairs each run with a headless depart; d with a clean
arrival; probe covers the FGS probe used by a and c), and which only show the other outcome
across checks (b and a never produced a "reproduced" here).

## Safety properties

- **No lab build can reach a real server** (plan §7.5, §7.8 finding 19). The only API base a lab
  APK bakes is `http://10.0.2.2:18431`, written into the container copy by the build hook;
  `app.sh install` unzips the JS bundle and refuses it unless that base is present and no
  `technician-app/eas.json` env value appears in it (compared by value, never printed). The
  emulator signs in only to the lab backend, as seeded lab tech `t2`.
- **The lab backend reaches nothing outside**: scheduler, backups and dispatcher off; R2, FCM,
  WhatsApp and Sentry unset, except a dummy R2 account id (an empty one makes the attendance
  service 500) whose hostname is pinned to `127.0.0.1` inside the container namespace.
- **Nothing writes into a checkout's `technician-app/`**: L2's script copies the app into its
  container; the build worktree is a fresh detached checkout under the cache folder, mounted
  read-only.
- **Only `fixflow-l3a-lab*` containers** are created or removed; no Docker network is created.
- **adb only ever targets `emulator-5554`**, and `require_emulator` refuses a device that does
  not report `ro.boot.qemu=1`.
- **Slots**: the emulator holds one for its life (released by the keeper's trap, or reaped by
  `ff-slot.sh` when the keeper is gone); the APK build holds two inside L2's script. The lab
  backend takes none (two 512 MB containers, not a gate run).

## Emulator caveats (what the lab changes about the phone)

- **Location is a mock provider.** The emulated GPS hardware (`adb emu geo fix`) produces fixes
  only while some client requests GPS. Once the app's HIGH-accuracy read ended, the GPS provider
  went `ProviderRequest[OFF]`, the emulator has no network location, and Play services'
  geofencer (BALANCED) and the on-duty sampler (BALANCED) received nothing: no transitions, one
  ping in a run. The lab therefore installs a Location-Manager test provider named `gps` (as the
  shell uid: root is refused `MOCK_LOCATION`, so `appops set com.android.shell
android:mock_location allow` first) and feeds it every 3 s. Every fix is flagged mock: the
  phone sends `is_mock_location=true` and the server records it (it does not reject mock).
  Accuracy is whatever the script says.
- **F04 is staged.** Play services decides ENTER on the raw point: a calibration run
  (`calib-f04-*`) delivered no ENTER for any fix 85-100 m from the centre of the 80 m fence at
  10-40 m accuracy. So `d` delivers ENTER from an inside fix and, as soon as the job starts, moves
  the fix 100 m out at the same 30 m accuracy, so the handler's own confirmation read is the
  edge fix. That is the register's condition (OS says inside, the fresh fix says just outside);
  how often a real phone sees it is a field question.
- **Pings are not evidence here.** The on-duty sampler (Balanced) barely receives the test
  provider's fixes: 4 pings landed in about two hours at a 1-minute lab cadence. Checks read the
  sampler's foreground service instead; a ping count is printed but labelled not-evidence.
- **Firebase.** Until commit `a5a65e8` the lab APK carried the production
  `google-services.json`, so the emulator initialised Firebase with the production project
  (logcat: `FirebaseInitProvider: FirebaseApp initialization successful`). The build hook now
  writes a dummy project and `app.sh check` fails an APK that carries the production values.
- **The geofencer is nudged.** Play services re-evaluates a fence on its own schedule (it
  requested `@5m` while 556 m away and had not re-evaluated after 8 min of fixes), on a provider
  change, and on re-registration. `geo_nudge` switches the test provider off and on so it
  evaluates now. The lab says nothing about how soon a real phone notices a crossing.
- **No OEM layer**: no autostart manager, no app battery saver, no lock-in-recents. A check that
  needs an OEM kill (O01-F05's loss, O01-F02) cannot reproduce here.
- **NetInfo** probes `clients3.google.com` for reachability; the lab APK keeps that (it is
  Google's, not a FixFlow host) and the emulator has internet through the host.
- **UI by text is brittle**: the scripts find buttons by their visible text in a
  `uiautomator dump` (`app.sh`, `lib-app.sh`). A copy change in the app breaks a step; the step
  then records `inconclusive` with the screen dump, never a pass.

## Findings

_Filled from the runs below._
