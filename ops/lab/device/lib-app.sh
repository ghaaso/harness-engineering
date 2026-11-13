#!/usr/bin/env bash
# App-level helpers for the FixFlow device lab: UI driving by text, AsyncStorage reads, process
# and service probes. Sourced by app.sh and the protocol scripts (after lib.sh); never run alone.
#
# UI driving is `uiautomator dump` + `input tap` at the centre of the node whose text (or
# content-desc) matches. Brittle by nature: it depends on the exact copy on screen (a wording
# change breaks it), on React Native exposing the text as an accessibility node (it does for
# <Text>, not for icons), on nothing overlaying the target (a system dialog, a notification
# shade, the keyboard), and on the node being on screen (no scrolling search). Every tap
# helper fails loudly when the text is absent instead of tapping a guessed coordinate.
#
# App state is read WITHOUT the screen: `adb root` + sqlite3 on the app's AsyncStorage
# database (RKStorage, table catalystLocalStorage). The key names below are copied from the
# app's source on this commit; `app.sh keys` checks them against the source when run from a
# checkout.

APP_DB="/data/data/$APP_PKG/databases/RKStorage"
# Queue and state keys (technician-app/src, grep `KEY =`):
QUEUE_KEYS=(
  "jobs.outbox.v2"               # lib/outbox.ts KEY_V2
  "jobs.outbox.v1"               # lib/outbox.ts KEY_V1 (legacy, adopted on login)
  "attendance.queue.v1"          # features/attendance/queue.ts (punches)
  "attendance.presence.queue.v1" # features/attendance/presenceQueue.ts
  "attendance.pings.queue.v1"    # features/attendance/pingQueue.ts
  "jobs.travel.queue.v1"         # features/jobs/travelQueue.ts (breadcrumbs)
  "media.pending.v1"             # features/media/pendingMedia.ts
)
STATE_KEYS=(
  "attendance.duty.v1"                   # pingTracker.ts DUTY_KEY
  "attendance.geofence.cache.v1"         # geofence.ts FENCE_CACHE_KEY
  "attendance.presence.lastCrossing.v1"  # geofence.ts LAST_CROSSING_KEY
  "jobs.travel.active.v1"                # travelTracker.ts TRAVEL_KEY
  "attendance.onboarded.v1"              # onboarding/permissions.ts
  "fixflow_tech"                         # AuthContext.tsx TECH_KEY
)
# fixflow_token is never dumped: only whether it is present and its length.

UI_XML="$LAB_RUN/ui.xml"

# ---- storage -------------------------------------------------------------------------------
sq() { ash "sqlite3 $APP_DB \"$1\""; }

# The raw JSON value of one AsyncStorage key (empty when absent).
kv() { sq "select value from catalystLocalStorage where key='$1'"; }

# A JSON object {key: value-or-null, ...} for the queue + state keys, plus token presence.
dump_state() { # out-file
  local out="$1" k v first=1
  {
    echo "{"
    for k in "${QUEUE_KEYS[@]}" "${STATE_KEYS[@]}"; do
      v="$(kv "$k")"
      [ "$first" -eq 1 ] || echo ","
      first=0
      if [ -z "$v" ]; then printf '  "%s": null' "$k"; else printf '  "%s": %s' "$k" "$v"; fi
    done
    v="$(kv fixflow_token)"
    printf ',\n  "fixflow_token": {"present": %s, "length": %s}\n}\n' \
      "$([ -n "$v" ] && echo true || echo false)" "${#v}"
  } > "$out"
}

# Count items in a queue key, optionally filtered: qcount <key> [jq-ish filter word]
# Filter words: all | done | failed | queued | pending
qcount() {
  local key="$1" f="${2:-all}" v
  v="$(kv "$key")"
  [ -z "$v" ] && {
    echo 0
    return
  }
  node -e '
    const v = JSON.parse(process.argv[1]); const f = process.argv[2];
    const items = Array.isArray(v) ? v : (v && Array.isArray(v.items) ? v.items : []);
    const pick = {
      all: () => true,
      done: (i) => i.done === true,
      failed: (i) => i.status === "failed" || !!i.failed || !!i.failedReason || !!i.failed_reason,
      queued: (i) => (i.status ? i.status === "queued" : !i.done && !i.failed && !i.failed_reason),
      pending: (i) => !i.done,
    }[f];
    console.log(items.filter(pick).length);
  ' "$v" "$f"
}

# ---- process / services ----------------------------------------------------------------------
app_pid() { ash pidof "$APP_PKG"; }

# The app's services as dumpsys sees them: one line per ServiceRecord with isForeground.
fgs_lines() { ash dumpsys activity services "$APP_PKG"; }
# expo-location runs BOTH location tasks (on-duty pings and job travel) in one service class,
# expo.modules.location.services.LocationTaskService (HARNESS-REVIEW: O01-F20). These read only
# that ServiceRecord block in `dumpsys activity services`.
# "yes" when the location service is in the foreground right now.
# Only a record bound to a LIVE process counts: after a kill the record keeps
# isForeground=true with app=null (and a "Restarting" copy), which is not a running service.
fgs_up() {
  fgs_lines | awk '
    /ServiceRecord\{/ { inb = ($0 ~ /LocationTaskService/ && $0 !~ /Restarting/); live = 0 }
    inb && /app=ProcessRecord\{/ { live = 1 }
    inb && live && /isForeground=true/ { f = 1 }
    END { print (f ? "yes" : "no") }'
}
# "yes" when a LocationTaskService record exists at all (foreground or not).
loc_svc_present() {
  if fgs_lines | grep -q "ServiceRecord{.*LocationTaskService"; then echo yes; else echo no; fi
}

notif_dump() { ash dumpsys notification --noredact; }

# ---- UI ------------------------------------------------------------------------------------
ui_dump() {
  local i
  for i in 1 2 3; do
    ash uiautomator dump /sdcard/ff-ui.xml > /dev/null 2>&1
    ash cat /sdcard/ff-ui.xml > "$UI_XML" 2> /dev/null
    grep -q "<hierarchy" "$UI_XML" && return 0
    sleep 1
  done
  return 1
}

# Centre "x y" of the first node whose text or content-desc equals (or, with ~, contains) $1.
ui_find() { # text [~]
  ui_dump || return 1
  node -e '
    const fs = require("fs");
    const xml = fs.readFileSync(process.argv[1], "utf8");
    const want = process.argv[2], contains = process.argv[3] === "~";
    const esc = (s) => s.replace(/&amp;/g, "&").replace(/&quot;/g, "\"").replace(/&#39;/g, "'"'"'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#([0-9]+);/g, (m, d) => String.fromCodePoint(+d));
    for (const m of xml.matchAll(/<node [^>]*>/g)) {
      const n = m[0];
      const text = esc((/ text="([^"]*)"/.exec(n) || [])[1] || "");
      const desc = esc((/ content-desc="([^"]*)"/.exec(n) || [])[1] || "");
      const hit = contains ? (text.includes(want) || desc.includes(want)) : (text === want || desc === want);
      if (!hit) continue;
      const b = / bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/.exec(n);
      if (!b) continue;
      console.log(Math.round((+b[1] + +b[3]) / 2) + " " + Math.round((+b[2] + +b[4]) / 2));
      process.exit(0);
    }
    process.exit(1);
  ' "$(winpath "$UI_XML")" "$1" "${2:-}"
}

ui_has() { ui_find "$1" "${2:-}" > /dev/null; }

# Tap the node with this text; fails (non-zero, message on stderr) when it is not on screen.
tap_text() { # text [~]
  local xy
  xy="$(ui_find "$1" "${2:-}")" || {
    echo "tap_text: '$1' not on screen" >&2
    return 1
  }
  # shellcheck disable=SC2086
  ash input tap $xy
}

# Wait up to N seconds for a text to appear.
# Swipe a list up until the text is on screen: a uiautomator dump sees only what is visible, and
# the c runs' fresh jobs push the oldest one (LAB customer) below the fold. text [swipes=8]
scroll_to_text() {
  local i w h
  read -r w h <<< "$(ash wm size | sed -n 's/.*: \([0-9]*\)x\([0-9]*\).*/\1 \2/p' | tail -n1)"
  [ -n "${h:-}" ] || return 1
  for i in $(seq 0 "${2:-8}"); do
    ui_has "$1" && return 0
    ash input swipe $((w / 2)) $((h * 3 / 4)) $((w / 2)) $((h / 4)) 400
    sleep 2
  done
  return 1
}
wait_text() { # text seconds [~]
  local t=0
  while [ "$t" -lt "$2" ]; do
    ui_has "$1" "${3:-}" && return 0
    sleep 2
    t=$((t + 2))
  done
  return 1
}

tap_class() { # android class name (first match), e.g. android.widget.EditText
  ui_dump || return 1
  local xy
  xy="$(node -e '
    const xml = require("fs").readFileSync(process.argv[1], "utf8");
    for (const m of xml.matchAll(/<node [^>]*>/g)) {
      const n = m[0];
      if (!n.includes(` class="${process.argv[2]}"`)) continue;
      const b = / bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/.exec(n);
      if (b) { console.log(Math.round((+b[1] + +b[3]) / 2) + " " + Math.round((+b[2] + +b[4]) / 2)); process.exit(0); }
    }
    process.exit(1);
  ' "$(winpath "$UI_XML")" "$1")" || return 1
  # shellcheck disable=SC2086
  ash input tap $xy
}

launch_app() { ash monkey -p "$APP_PKG" -c android.intent.category.LAUNCHER 1 > /dev/null 2>&1; }

# Bring the app to the dashboard hub from wherever it is (back presses, then relaunch).
to_dashboard() {
  local i
  for i in 1 2 3 4; do
    ui_has "Welcome back," && return 0
    ash input keyevent KEYCODE_BACK
    sleep 1
  done
  launch_app
  wait_text "Welcome back," 30
}

# Open the Attendance (Clock) screen from the dashboard.
open_clock() {
  to_dashboard || return 1
  tap_text "Attendance" || return 1
  wait_text "Clock in / out" 20
}

# ---- evidence ------------------------------------------------------------------------------
# A result.json entry, appended to $EV/results.ndjson; assembled into result.json at the end.
# record <check> <register_id> <predicted> <observed> <verdict> <evidence-file>
record() {
  node -e '
    const [check, id, predicted, observed, verdict, evidence] = process.argv.slice(1);
    const ok = ["reproduced", "not_reproduced", "inconclusive", "not_scripted"].includes(verdict);
    if (!ok) { console.error("bad verdict " + verdict); process.exit(2); }
    console.log(JSON.stringify({ check, register_id: id, predicted, observed, verdict, evidence, at: new Date().toISOString() }));
  ' "$@" > "$EV/.result.tmp" || return 1
  # Windows can briefly lock an appended file ("Device or resource busy"): retry, loudly
  local i ok=0
  for i in 1 2 3 4 5 6 7 8 9 10; do
    if cat "$EV/.result.tmp" >> "$EV/results.ndjson" 2> /dev/null; then
      ok=1
      break
    fi
    sleep 0.5
  done
  [ "$ok" = 1 ] || echo "RESULT NOT WRITTEN to results.ndjson: $1" >&2
  log "RESULT $1 [$2] => $5 :: $4"
}

finish_results() { # meta-json
  node -e '
    const fs = require("fs");
    const lines = fs.readFileSync(process.argv[1], "utf8").split("\n").filter(Boolean).map(JSON.parse);
    const meta = JSON.parse(process.argv[3]);
    fs.writeFileSync(process.argv[2], JSON.stringify({ ...meta, checks: lines }, null, 2) + "\n");
  ' "$(winpath "$EV/results.ndjson")" "$(winpath "$EV/result.json")" "$1"
}

# Start a screen recording on the device (max 180 s per segment; restarted by rec_roll).
REC_PID=""
REC_N=0
rec_start() {
  REC_N=$((REC_N + 1))
  adb_ shell screenrecord --time-limit 180 "/sdcard/ff-rec-$REC_N.mp4" > /dev/null 2>&1 &
  REC_PID=$!
}
rec_stop() {
  ash pkill -INT screenrecord > /dev/null 2>&1
  [ -n "$REC_PID" ] && wait "$REC_PID" 2> /dev/null
  REC_PID=""
  sleep 1
}
rec_roll() { # stop the current segment and start the next (call between checks)
  rec_stop
  rec_start
}
rec_collect() {
  rec_stop
  local i
  for i in $(seq 1 "$REC_N"); do
    adb_ pull "/sdcard/ff-rec-$i.mp4" "$(winpath "$EV/screen-$i.mp4")" > /dev/null 2>&1
    ash rm -f "/sdcard/ff-rec-$i.mp4" > /dev/null 2>&1
  done
}

# Backend rows the protocols compare before/after (lab DB only).
backend_rows() { # out-file
  {
    echo "## attendance_event"
    lab_sql "select client_id, tech_id, kind, device_time, server_time from attendance_event order by server_time" 2>&1
    echo "## attendance_presence_event"
    lab_sql "select client_id, tech_id, kind, lat, lng, accuracy_m, inside_geofence, distance_m, confirmed, is_mock_location, device_time from attendance_presence_event order by device_time" 2>&1
    echo "## attendance_ping (count, latest)"
    lab_sql "select count(*), max(captured_at) from attendance_ping" 2>&1
    echo "## job_event (latest 20)"
    lab_sql "select seq, job_id, kind, left(coalesce(text, ''), 40), created_at from job_event order by seq desc limit 20" 2>&1
    echo "## job_location"
    lab_sql "select job_id, kind, lat, lng, accuracy_m, device_time from job_location order by device_time" 2>&1
    echo "## job_travel_sample (count)"
    lab_sql "select count(*) from job_travel_sample" 2>&1
  } > "$1"
}

# One-line summary of a queue key: total, done, parked (with reasons), queued, max attempts.
# Works for both shapes: attendance queues (done / failed_reason / attempts) and the jobs
# outbox v2 (status queued|failed / failedReason / attempts).
qsummary() { # key [kind-filter]
  kv "$1" | node -e '
    let s = ""; process.stdin.on("data", (d) => (s += d)).on("end", () => {
      let v = []; try { v = JSON.parse(s || "[]"); } catch { console.log("unparseable"); return; }
      let items = Array.isArray(v) ? v : (v && Array.isArray(v.items) ? v.items : []);
      const k = process.argv[1]; if (k) items = items.filter((i) => i.kind === k);
      const parked = items.filter((i) => !i.done && (i.failed_reason !== undefined || i.status === "failed"));
      const done = items.filter((i) => i.done === true).length;
      const queued = items.length - done - parked.length;
      const att = Math.max(0, ...items.map((i) => i.attempts || 0));
      const reasons = [...new Set(parked.map((i) => i.failed_reason || i.failedReason))].join(" | ");
      console.log(`total=${items.length} done=${done} parked=${parked.length}${reasons ? " [" + reasons + "]" : ""} queued=${queued} max_attempts=${att}`);
    });' "${2:-}"
}
