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

| Script                                                                | What it does                                                                                                                                                                                                                                                                                                                                                                                                                  |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `emu.sh start [--window] [--cold]                                     | stop                                                                                                                                                                                                                                                                                                                                                                                                                          | status` | Boots AVD `ff34` (headless unless `--window`), 2048 MB RAM cap, `-gpu host` with one automatic retry on `swiftshader_indirect` (software rendering: slower, so its timings are not comparable), waits for `sys.boot_completed`, enables `adb root`. Holds **one** heavy-pool `ff-slot.sh` slot for the emulator's whole life through a detached keeper, which stops an emulator no lab script has driven for `FF_EMU_IDLE_MIN` (20) minutes. One instance per AVD; port 5554 only (every script refuses `emulator-5584`, the coordinator's). The ANGLE GPU modes are never used: this PC's antivirus blocks `gles_angle/d3dcompiler_47.dll`. |
| `lab-backend.sh up                                                    | reset                                                                                                                                                                                                                                                                                                                                                                                                                         | down    | status`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Postgres 17 + the **app under test's** committed backend (`FF_LAB_APP_REF`, default `a31924a`, the same commit as the lab APK) in Docker, on the default bridge, published on `127.0.0.1:18431` (the emulator's `http://10.0.2.2:18431`). Migrated to head; the lab-only technician `lab1` is the one row written by SQL (the app under test has no create-technician API), its PIN is set through `PUT /api/technicians/lab1/pin`; the rest is seeded through the API. |
| reset \| down \| status`                                              | Postgres 16 + this worktree's committed backend in Docker, on the default bridge, published on `127.0.0.1:18431` (the emulator's `http://10.0.2.2:18431`). Migrated to head, seeded through the backend's own API.                                                                                                                                                                                                            |
| `lab-backend.sh edge404 \| 5xx \| hang`                               | Replaces the backend on the same port with `edge-stub.py` (stdlib only): the dead host's 404 + `x-railway-fallback: true` + text body + no `X-FixFlow-Api`; a 503; or accept-and-say-nothing for 20 s. `up` revives the backend with its database intact.                                                                                                                                                                     |
| `build-apk.sh [ref]`                                                  | The lab APK of `ref` (default `origin/main`) through L2's `ops/lab/android-compile.sh`, from a detached throwaway worktree, with a hook that bakes `EXPO_PUBLIC_API_URL=http://10.0.2.2:18431`, allows cleartext and writes a dummy Firebase project **in the container copy only**. Output `lab-COMPILE-ONLY-debugkey-<sha>-p18431.apk`: debug-signed, emulator only, never a phone. Needs 2 slots: stop the emulator first. |
| `app.sh install <apk> \| grant \| login \| state \| keys \| clear`    | Installs on the emulator only (refuses a bundle that lacks the lab base or contains any `eas.json` env value); grants fine, coarse, background location and notifications, denies camera (user-fixed, so a clock-in takes no selfie); signs in as the lab-only technician `lab1` by UI; dumps the queues from AsyncStorage.                                                                                                   |
| `protocol-tracker.sh [probe d f19 f14 a c b fneg doze reboot revoke]` | The adb-scriptable core of the O-01 field protocol.                                                                                                                                                                                                                                                                                                                                                                           |
| `protocol-offline.sh [control edge404 revival 5xx airplane]`          | The outage matrix.                                                                                                                                                                                                                                                                                                                                                                                                            |
| `calibrate-fence.sh`                                                  | Which edge fixes make Play services deliver an ENTER for the lab fence (pairs of distance and accuracy, plus an inside control). Why `d` is staged.                                                                                                                                                                                                                                                                           |
| `findings.sh <evidence-dir> ...`                                      | Tabulates `result.json` files into the findings table (verdicts counted as n of runs).                                                                                                                                                                                                                                                                                                                                        |

Shared code: `lib.sh` (paths, adb/docker wrappers, emulator guard), `lib-app.sh` (UI by text,
AsyncStorage reads, service probes, `result.json` entries), `lib-proto.sh` (evidence folder,
logcat, the location feeder, clock in/out, cleanup trap).

## Running it

```bash
source /c/Users/User/.fixflow-cache/android/env.sh
bash ops/lab/device/lab-backend.sh up
bash ops/lab/device/build-apk.sh            # only when the app changed; emulator must be stopped
bash ops/lab/device/emu.sh start            # --window to watch
bash ops/lab/device/app.sh install /c/Users/User/.fixflow-cache/lab/l3a/apk/lab-COMPILE-ONLY-debugkey-<sha>-p18431.apk
bash ops/lab/device/app.sh login
bash ops/lab/device/protocol-tracker.sh
bash ops/lab/device/protocol-offline.sh
bash ops/lab/device/emu.sh stop             # always: a running emulator holds a slot
bash ops/lab/device/lab-backend.sh down     # the two lab containers (protocol-offline revives them on exit)
```

Evidence lands in `C:/Users/User/.fixflow-cache/lab/l3a/<protocol>-<stamp>/`, never in this
branch: `logcat.txt`, `timeline.txt` (every step, also written to logcat under tag
`FFLAB`), `services-*.txt` (`dumpsys activity services`), `state-*.json` (the queue keys),
`backend-*.txt` (the lab database rows), `stub-*.log` (every request the stub saw),
`adb-processes.txt` (every `adb.exe` before and after the logcat stream stops), `screen-*.mp4`,
and `result.json`: one entry per check with the register id it bears on, what the register
predicts, what happened, the verdict and the evidence file, plus the lab account, the app ref and
each recording's sha256. For every run the findings cite, a small bundle (its `result.json` and
the cited excerpt files only; no full logcat, no recording) is committed on the plan branch under
`docs/program/evidence/lab/<run>/`; the findings cite that path.

**Verdicts.** `reproduced` = the register's predicted behaviour happened. `not_reproduced` = it
did not, under this script. `inconclusive` = the precondition failed or the evidence cannot
decide, with the reason in `observed`. Rows with `register_id: control` are the lab checking
itself: their `reproduced` means the expected control outcome happened (a write landed against
the live backend, the FGS probe saw the service on duty and did not see it off duty or on a
process restored after a kill, the fence probe lost the fence after `pm clear`, a headless crossing
recorded). Every probe a verdict rests on is shown giving both answers in the same run; a check
whose own precondition did not happen (no geofence error delivered, no pings without doze) says
`inconclusive`, never `not_reproduced`.

## Safety properties

- **No lab build can reach a real server** (plan §7.5, §7.8 finding 19). The only API base a lab
  APK bakes is `http://10.0.2.2:18431`, written into the container copy by the build hook;
  `app.sh install` unzips the JS bundle and refuses it unless that base is present and no
  `technician-app/eas.json` env value appears in it (compared by value, never printed). The
  emulator signs in only to the lab backend, as the lab-only technician `lab1` (never a roster technician).
- **The lab backend reaches nothing outside**: scheduler, backups and dispatcher off; R2, FCM,
  WhatsApp and Sentry unset, except a dummy R2 account id (an empty one makes the attendance
  service 500) whose hostnames are pinned to `127.0.0.1` inside the container namespace: the
  account one the backend signs (path-style, measured) and the bucket-style one.
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
- **Ping counts need a whole phase.** The on-duty sampler (Balanced) receives few of the test
  provider's fixes, and a batch often goes out only at the next sync (the next foreground), so a
  count over a short window says nothing (the first edge404 run read "no batch in 150 s" while the
  stub log showed three batch POSTs answered 404 later in the phase). Ping rows count over the
  whole phase after a final foreground; FGS presence (record plus notification) is the signal for
  O01-F01, O01-F20 and O3-F2; doze needs an equal no-doze window with pings before it can say
  anything.
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

Runs of 2026-11-13: app `a31924a` (the fleet's code; lab APK `lab-a31924a3818f-p18431.apk`, which
passes `app.sh check`), stock Android 14 emulator `ff34`, GMS geofencer, lab backend from the
same commit. Evidence folders are under `C:/Users/User/.fixflow-cache/lab/l3a/`. **Stock Android
only: none of this is a statement about the fleet's phones.**

| Register id | Check            | Predicted                                                                                                                 | Result                | What happened                                                                                                                                                                                                                                                         | Evidence                                                                         |
| ----------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------- | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| O01-F19     | `f19`            | a crossing with the Activity alive in the background hangs in `requestForegroundPermissionsAsync` until the app is opened | **reproduced 3 of 3** | no row while backgrounded; Android logged `Background activity launch blocked … REQUEST_PERMISSIONS`; the row landed 113–115 s after the EXIT, only after reopening. Control (same depart, process dead): recorded in 10 s, 3 of 3                                    | `tracker-20261113T170700/f19-*.txt`, `f19h-*.txt`                                |
| O01-F14     | `f14`            | opening the app while a headless task instance is alive drops the TaskManager for the rest of the process                 | **reproduced 3 of 3** | app opened 0.3–1.5 s after a headless job began (during it, or 0.1 s after its `Finished task`); the next ENTER logged `Handling job` and never `Finished task`, no row. Control (opened 10–11 s after `Finished task`): the next ENTER finished and recorded, 3 of 3 | `tracker-20261113T175803/f14-*-test.txt`, `f14-*-control.txt`                    |
| O01-F20     | `c`              | ending a travel leg strips the on-duty sampler's FGS                                                                      | **reproduced 3 of 3** | FGS up before and during the leg, gone 10 s after arrival while still clocked in. Probe control: FGS seen on duty, not seen off duty                                                                                                                                  | `tracker-20261113T183907/services-c*-post.txt`                                   |
| O01-F01     | `a`              | after a process kill and reopen the sampler returns without its FGS                                                       | not reproduced 3 of 3 | FGS back within 15 s of reopening every time                                                                                                                                                                                                                          | `tracker-20261113T170700/services-a*-reopened.txt`                               |
| O01-F03     | `b`              | a location off/on removes the fence; nothing re-registers it until the app is opened                                      | not reproduced 1 of 1 | fence still in Play services' dump after the toggle; a headless EXIT was delivered and recorded                                                                                                                                                                       | `tracker-20261113T170700/fence-b-after.txt`                                      |
| O01-F04     | `d`              | phone says `confirmed=false` while the server stores `inside_geofence=true`                                               | inconclusive 3 of 3   | not stageable here: Play services gives no ENTER for an edge fix (calibration: 0 of 7 edge pairs at 85–100 m; inside control 40 m fired), and the staged divergence lost the race (the handler read its fix 0.2–1.6 s into the job, before the script moved it)       | `calib-f04-20261113T174715/calib.txt`, `tracker-20261113T170700/presence-d*.txt` |
| O01-F05     | `d`              | the contradicted path runs past Expo's 15 s window                                                                        | inconclusive 3 of 3   | needs the contradicted path, which F04's race never reached; uncontradicted handler ran 0.2–6.2 s                                                                                                                                                                     | as above                                                                         |
| O-03 (2)    | `edge-punch-in`  | a clock-in against the dead edge is kept but parked `rejected (404)`; screen says not clocked in while the sampler runs   | **reproduced 1 of 1** | parked `rejected (404)`; screen `DID NOT SYNC` + `Not clocked in`; sampler FGS up                                                                                                                                                                                     | `offline-20261113T190847/ui-edge-clock.xml`                                      |
| O-03 (3)    | `edge-crossing`  | a presence row against the dead edge is parked at capture                                                                 | **reproduced 1 of 1** | parked `rejected (404)`                                                                                                                                                                                                                                               | `offline-20261113T190847/state-edge-after.json`                                  |
| O3-F1       | `edge-note`      | an online job write against the dead edge is refused at tap time and never queued                                         | **reproduced 1 of 1** | UI `Couldn't add the note`; outbox empty                                                                                                                                                                                                                              | `offline-20261113T190847/ui-note-LABedge190846.xml`                              |
| O-03 (1)    | `airplane-note`  | a job write in airplane mode is queued, then parked on reconnect to the dead edge                                         | **reproduced 1 of 1** | `saved offline`, queued; 60 s after reconnect parked `rejected (404)`                                                                                                                                                                                                 | `offline-20261113T190847/state-airplane.json`                                    |
| O10-F2      | `revival-parked` | rows parked during the outage stay parked after revival                                                                   | **reproduced 1 of 1** | 60 s after the backend came back with the app open: 1 punch and 3 presence rows still parked, server punches unchanged                                                                                                                                                | `offline-20261113T190847/state-revival-1.json`                                   |
| O3-F6       | `5xx-punch`      | a transient 5xx counts toward the poison cap and parks a real write                                                       | **reproduced 1 of 1** | after 7 foregrounds against a 503: `gave up after 5 attempts (server 503)`                                                                                                                                                                                            | `offline-20261113T190847/stub-5xx.log`                                           |
| O-03 (2)    | `edge-punch-out` | a clock-out against the dead edge is parked too                                                                           | inconclusive          | no clock-out could be captured: the parked clock-in leaves the screen at `Not clocked in` (no Clock Out button). The run's `result.json` says `not_reproduced` (the gate before `bdc0ddd`); the evidence says nothing was attempted                                   | `offline-20261113T190847/ui-edge-clock.xml`                                      |
| O3-F2       | `revival-duty`   | after a landed clock-in, a parked clock-out stops the sampler                                                             | inconclusive          | its precondition (a parked clock-out) never existed, for the same reason; `result.json` says `not_reproduced` (gate fixed in `bdc0ddd`)                                                                                                                               | `offline-20261113T190847/services-revival.txt`                                   |
| O-03 (4)    | `edge-pings`     | ping batches are dropped on the 404                                                                                       | inconclusive          | the lab sampler sent no batch in 150 s (pings are not evidence here)                                                                                                                                                                                                  | `offline-20261113T190847/logcat.txt`                                             |

Controls that did not come out as expected: `control-pings` (no ping landed in 170 s against the
live backend: the same sampler limit). Every other control did: punch, crossing, note (offline);
probe on/off, `d-control`, `f19-headless` ×3, `f14-control` ×3 (tracker).

**Not scripted yet**, or scripted and not run in the final session:

- `doze`, `reboot`, `revoke` are scripted in `protocol-tracker.sh` but were not run in the final
  session; their rows record `inconclusive` by design (they report what happened, not a verdict).
- O01-F02 and O01-F05's loss need an OEM kill (autostart manager, app battery saver): no stock
  emulator reproduces them.
- O01-F04/F05 need a fix that Play services calls inside while the handler's own read says just
  outside; a field session or an instrumented build that can hold the handler's read.
- O3-F2 and the clock-out half of O-03 (2) need a clock-in that landed **before** the outage;
  the offline protocol clocks in during it.
- Ping-based rows (O-03 (4), the on-duty cadence): the lab's Balanced sampler barely receives the
  test provider's fixes.
- The drain rehearsal (O-10): not scripted. See the PR for what it needs.
