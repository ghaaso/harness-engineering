<!-- Trimmed from https://github.com/skydoves/android-testing-skills @ 8665ed59643c90eb1056a256a6ddec161aa1cfa1 adb/observability/extracting-logs-with-logcat/SKILL.md (Apache-2.0, author Jaewoong Eum (skydoves)): kept the title, Prerequisites, Three fundamental operations, Buffer selection, Priority ladder + filter expressions, Format flags, Time and PID filters, Buffer rotation and persistence, Patterns, and Mandatory rules minus the two R8 bullets; dropped the frontmatter, intro, When to use / When NOT, the R8 section, Verification and References. Text below is verbatim. -->
<!-- FixFlow override (see ../SKILL.md "Where upstream disagrees"): on a technician phone never run `adb logcat -c` or `-G`; use `-T '<step-0 clock time>'` instead of clearing. -->

# Extracting Logs With logcat — Reading Device Logs
## Prerequisites

- `adb get-state` returns `device`. See `../../devices/connecting-to-devices/SKILL.md`.
- For `-v json`: device API 30+ (Android 11+). Stack with `-v UTC -v year` for unambiguous timestamps.
- For per-PID filtering: `adb shell pidof -s <pkg>` requires API 24+ (toybox `pidof -s`); on older releases use `adb shell ps -A | grep <pkg>`.

## Three fundamental operations

| Command | Behavior |
|---|---|
| `adb logcat` | Stream the device log to stdout; runs until interrupted. |
| `adb logcat -d` | "Dumps the log and exits." Snapshot mode — perfect for CI. |
| `adb logcat -c` | "Clears the log buffer." Run this before reproducing a bug. |

(Verbatim quotes from developer.android.com/tools/logcat.)

Idiomatic CI capture pattern:

```bash
adb logcat -c                           # clear before scenario
./run-scenario.sh                       # reproduce
adb logcat -d > artifacts/log.txt       # dump after
```

## Buffer selection

`-b <name>` selects which kernel/userspace ring buffer is read. Buffers (developer.android.com/tools/logcat):

| Buffer | What it contains |
|---|---|
| `main` | Default app-side buffer. Does NOT contain system/crash. |
| `system` | Framework / system_server messages. |
| `crash` | Tombstones + unhandled-exception output. |
| `events` | Structured/binary system event buffer. Pair with `-v descriptive` to decode tag names. |
| `radio` | Radio/telephony related messages. |
| `kernel` | Kernel buffer. |
| `all` | Every buffer. |
| `default` | Implicit set: `main`, `system`, `crash`. |

Multiple `-b` flags or comma-separated lists both work:

```bash
adb logcat -b radio
adb logcat -b main -b radio -b events
adb logcat -b main,radio,events
```

The `events` buffer is where to look for `am_*`, `wm_*`, `input_focus`, `notification_*` — emitted by the framework for instrumentation, not for human reading. Decode tag names with:

```bash
adb logcat -b events -v descriptive
```

## Priority ladder + filter expressions

Filter specs are space-separated `tag:priority` pairs. `*` matches every tag.

| Letter | Meaning |
|---|---|
| `V` | Verbose |
| `D` | Debug |
| `I` | Info |
| `W` | Warning |
| `E` | Error |
| `F` | Fatal |
| `S` | "Silent (highest priority, nothing is printed)" |

Setting `*:S` *silences everything*, then any preceding `tag:P` re-enables that tag at priority `P` or above. The canonical "show only my app's logs" idiom:

```bash
adb logcat ActivityManager:I MyApp:D *:S
```

> "Suppress all logs except ActivityManager (Info+) and MyApp (Debug+)" — developer.android.com/tools/logcat.

Other staples:

```bash
adb logcat *:W                          # warnings and above, all tags
adb logcat *:E                          # errors and above (very common in CI)
```

zsh/bash will glob-expand `*:S` outside of quotes when there is a file named `S` in cwd — quote when scripting:

```bash
adb logcat "ActivityManager:I MyApp:D *:S"
```

The same filter can be the host default via env var:

```bash
export ANDROID_LOG_TAGS="ActivityManager:I MyApp:D *:S"
```

## Format flags — `-v <format>`

| Format | What you get |
|---|---|
| `brief` | "Displays priority, tag, and PID" |
| `long` | "All metadata fields with blank lines between messages" |
| `process` | "PID only" |
| `raw` | "Raw log message with no metadata" |
| `tag` | "Priority and tag only" |
| `thread` | "Legacy format showing priority, PID, and TID" |
| `threadtime` | DEFAULT. "Date, time, priority, tag, PID, and TID" |
| `time` | "Date, time, priority, tag, and PID" |

Format **modifiers** stack with `-v` (comma-combinable or repeatable):

| Modifier | Effect |
|---|---|
| `color` | Per-priority colour. |
| `descriptive` | Decode event log tag names. |
| `epoch` | Time in seconds since 1970-01-01. |
| `monotonic` | CPU seconds from last boot. |
| `printable` | Escape binary content. |
| `uid` | UID or Android ID of logged process. |
| `usec` | Time with microsecond precision. |
| `UTC` | Time as UTC. |
| `year` | Add year to displayed time. |
| `zone` | Add local time zone. |

```bash
adb logcat -v json -v UTC -v year       # Android 11+; structured stream, unambiguous time
adb logcat -b all -v color -d           # color dump, all buffers
```

Default-line example (developer.android.com/tools/logcat):

```
I/ActivityManager(  585): Starting activity: Intent { action=android.intent.action.MAIN ... }
```

Schema for `brief`: `<priority>/<tag>(<PID>): <message>`. `threadtime` adds date/time/TID.

## Time and PID filters

- `-T '<date> <time>'` — start at the first entry on or after the given timestamp. Format matches `threadtime`, e.g. `'01-01 12:00:00.000'`.
- `-T <count>` — print the last N entries from the buffer, then continue streaming.
- `-t <count>` — print the last N entries, **then exit** (i.e. `-t` is `-T` with auto-quit).
- `--pid <pid>` — emit only entries from a single process. Combine with `pidof`:

```bash
adb logcat --pid=$(adb shell pidof -s com.example.app)
```

`pidof -s` returns a single pid; without `-s` you get a space-separated list which `--pid` will not accept directly. Wrap a re-resolution loop if the app may be killed and restarted (Doze, ANR, crash):

```bash
while true; do
  PID=$(adb shell pidof -s com.example.app 2>/dev/null)
  [ -n "$PID" ] && adb logcat --pid="$PID"
  sleep 1
done
```

## Buffer rotation and persistence

For long captures, persist to a file with rotation:

| Flag | Meaning |
|---|---|
| `-f <file>` | Write to `<file>` instead of stdout. **Subtle:** with `adb logcat -f`, the file is host-side; with `adb shell logcat -f`, the path is device-side. |
| `-r <kbytes>` | Rotate output every N kilobytes. Requires `-f`. |
| `-n <count>` | Keep at most `<count>` rotated files (`logfile`, `logfile.1`, ...). |
| `-G <size>` | Resize the kernel log buffer for the selected `-b` ring (e.g. `1M`, `16M`). Persists for the life of `logd`. |
| `-g` | Print buffer sizes and current usages, then exit. Cheap diagnostics for "why am I missing logs?". |

```bash
adb logcat -G 16M                                     # grow the main buffer
adb logcat -g                                         # inspect sizes
adb logcat -b main -f /data/local/tmp/app.log \
           -r 1024 -n 8                               # 8x ~1MB rotated files (device-side)
adb shell logcat -b main -f /data/local/tmp/app.log \
           -r 1024 -n 8                               # same, but the device runs it
```

The `-G` resize is global to that buffer and persists across `logd` restarts (until reboot). Don't set 16 MB on a memory-constrained device and forget — release memory back with `-G 256K` after the suite if your CI farm is shared.
## Patterns

### Pattern: WRONG — `adb logcat | grep MyApp` for filtering

```bash
# WRONG
adb logcat | grep MyApp
# WRONG because: the device sends every log line over the USB/TCP transport, then the host
# discards 99% via grep. On a busy device this saturates the transport and the grep can lag
# behind real time. Worse, `grep` runs without -F, so a tag that contains regex metacharacters
# (`.`, `(`, `+`) silently mismatches.
```

```bash
# RIGHT — filter at the logcat level
adb logcat MyApp:D *:S
```

The device only emits matching lines; the transport is uncongested.

### Pattern: WRONG — assuming `-T <count>` exits

```bash
# WRONG
adb logcat -T 100 > tail.txt
# Hangs forever — -T <count> prints the last 100 lines THEN CONTINUES STREAMING.
```

```bash
# RIGHT — `-t` is `-T` with auto-exit
adb logcat -t 100 > tail.txt
```

### Pattern: structured logs for machine ingestion

```bash
adb logcat -v json -v UTC -v year -d -b all > run.jsonl
```

Each line is a single JSON object — pipe through `jq`:

```bash
jq -c 'select(.priority == "ERROR")' run.jsonl
```

(`-v json` requires Android 11+ on the device.)

### Pattern: capture-on-failure — clear, run, dump

```bash
adb logcat -c
./run-scenario.sh
RC=$?
if [ "$RC" -ne 0 ]; then
  adb logcat -d -v threadtime               > artifacts/logcat.txt
  adb logcat -d -b crash    -v threadtime   > artifacts/crash.txt
  adb logcat -d -b events   -v descriptive  > artifacts/events.txt
fi
exit "$RC"
```

`-c` clears before the run so the dump captures only the scenario's logs.

### Pattern: PID-bound stream that survives a process restart

```bash
while true; do
  PID=$(adb shell pidof -s com.example.app 2>/dev/null)
  if [ -n "$PID" ]; then
    adb logcat --pid="$PID" -v threadtime
  fi
  sleep 1
done
```

The outer loop re-resolves the PID after Doze/ANR/crash kills and restarts the app.

### Pattern: `-f` host vs device side

```bash
# host-side rotation (file lives on the developer machine)
adb logcat -b main -f ~/logs/app.log -r 1024 -n 8

# device-side rotation (file lives in /data/local/tmp on the device)
adb shell logcat -b main -f /data/local/tmp/app.log -r 1024 -n 8
adb pull /data/local/tmp/app.log ~/logs/app.log     # later
```

## Mandatory rules

- **MUST** filter at the logcat level (e.g. `MyApp:D *:S`), not via host-side `grep`. Filtering on the device avoids saturating the transport.
- **MUST** quote filter strings containing `*` in zsh/bash (e.g. `"MyApp:D *:S"`) — globbing eats the asterisk if a file named `S` exists in cwd.
- **MUST** use `-t <count>` for "tail and exit". `-T <count>` continues streaming after the initial dump.
- **MUST** use `-d` for snapshot dumps in CI. Streaming `adb logcat` requires explicit termination.
- **MUST** call `adb logcat -c` before reproducing a bug whose log dump you want to attach. Otherwise the dump includes irrelevant prior history.
- **MUST** distinguish `adb logcat -f <file>` (host-side path) from `adb shell logcat -f <file>` (device-side path). The shell forms diverge.
- **MUST NOT** rely on `-v json` on devices below Android 11 — silently emits an empty stream.
- **PREFERRED:** stack `-v threadtime,year,UTC` (or `-v threadtime -v year -v UTC`) for unambiguous absolute timestamps in CI artefacts.
- **PREFERRED:** run with `-G 16M` for the `main` buffer when capturing slow-burning bugs, and reset to default in teardown.
