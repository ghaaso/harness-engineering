# L2 — local Android compile gate: hand-over note (lane l2)

PR #188 (draft), branch `claude/l2-android-compile-gate-3d0bf0`. Files: `ops/lab/` only.

## For lanes that want a compile check (P5a, P5b-1, L3a)

    bash ops/lab/android-compile.sh <lane> <worktree> release   # run in the background

- Takes 2 slots (the whole machine), PID on the slots, releases in a trap (INT/TERM/HUP tested).
- Output: `C:/Users/User/.fixflow-cache/lab/<lane>/android-<stamp>/{app-release.apk,build.log,summary.txt}`.
- Exit codes: 0 ok; 3 refused; 4 slot acquire failed (now prints ff-slot's exit code); 6 no APK;
  7 worktree changed during the run; 8 docker could not start; 10 build failed; 11 timeout;
  12 OOM/killed; 13 redaction failed.
- Do NOT edit or save files in the worktree while it runs: the git-status/HEAD check fails the
  run with 7 (that is what produced the first run's `git_status_unchanged: NO` — my own README
  write, not the build).
- Shared caches: volumes `fixflow-gradle-cache`, `fixflow-npm-cache`. For a cold build without
  wiping them: `FF_ANDROID_GRADLE_VOL=fixflow-<x> FF_ANDROID_NPM_VOL=fixflow-<y>`.
- The APK is compile evidence only (template debug key, no API host). Never install it.

## Measured on `main`'s technician-app

- cold release (first image, 10g cap): 1460 s; warm release (6g cap): 81 s after the slot,
  peak 5218 MiB, 0 OOM kills. No native break on `main`.

## For the coordinator: `ff-slot.sh` findings (not this lane's file)

From the in-loop Opus self-check, plus one observation:
1. SIGKILL of a holder: the lock reaps its slots 2 min after the PID dies, but a container it
   started keeps running (android-compile labels it `fixflow.holder=<holder>`). A reaper that
   treats a slot as live while `docker ps --filter label=fixflow.holder=<holder>` is non-empty
   would close it.
2. Ctrl-C between `mkdir slot-N` and writing `slot-N/holder` leaves a holderless slot for
   STALE_MIN (240) min.
3. MSYS PIDs are not Windows PIDs; a non-Git-Bash caller that passes a PID would have its live
   slots reaped.
4. Observed 2026-11-13 ~14:26: an L2 `acquire` (queued, weight 2) exited non-zero after 143 s
   with no output; the acquire loop has no such exit, so it was probably killed from outside
   (the lock was being revised at the time). Requeued.

## Final (2026-11-13 ~15:35), PR #188 ready for review at 7cb4c7d, CI green

- P5-spike desk half: react-native-background-geolocation 5.8.2 + expo-gradle-ext-vars 0.1.3
  prebuild and assembleRelease on SDK 52 / RN 0.76.9 old arch: YES (Gradle 143 s, APK +8.0 MB).
  Peak memory hit the 6g cap exactly (6144 MiB incl. page cache), 0 OOM kills: a P5 build that
  adds this SDK may need FF_ANDROID_MEM=7g if it ever gets killed (exit 12).
- Cold build at 6g: not measured (coordinator deferral). Follow-up when the queue is idle:
  FF_ANDROID_GRADLE_VOL=fixflow-l2-cold-gradle FF_ANDROID_NPM_VOL=fixflow-l2-cold-npm \
    bash ops/lab/android-compile.sh l2 <worktree> release   # then docker volume rm both
- A waiting acquire that MSYS fails to fork (exit 254) is requeued by the gate (seen once).
