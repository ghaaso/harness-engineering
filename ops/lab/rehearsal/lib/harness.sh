# shellcheck shell=bash
# Inner side of the rehearsals: runs as root INSIDE the stand-in host (fixflow-l4-host).
# Every runbook command is cut from the checkout's own docs/RUNBOOK-SELFHOST.md by runbook.py,
# placeholders are substituted (each substitution is written into the step's log), and the text
# is eval'd in THIS shell, so a variable set in one block (D, S, P_RUN) is still set in the next,
# exactly as in the owner's single SSH session.
#
#   rb_fence <step> <n> [sed-range]      print a fenced block (optionally only some lines)
#   rb_span  <step> <substring> [k]      print an inline `code` span
#   rb_run   <id> <text> [<from>=<to>]...  substitute, log, eval; sets RC and LOG (output file)
#   row <step> <verdict> <what was run> <check and its result> [note]
# Verdicts: DONE, FAILED, AMBIGUOUS, NRH (not rehearsable here), plus WT-* rows for wrong turns.
set -u
KIT=/srv/l4/kit
OUT="${OUT:-/srv/l4/out}"
mkdir -p "$OUT/steps"
RB_FILE="${RB_FILE:-/opt/fixflow/docs/RUNBOOK-SELFHOST.md}"
ROWS="$OUT/rows.tsv"
[ -f "$ROWS" ] || printf 'phase\tstep\tverdict\trun\tcheck\tnote\n' > "$ROWS"
PHASE="${PHASE:-restore}"

rb_fence() {
  local t
  t="$(python3 "$KIT/lib/runbook.py" fence "$RB_FILE" "$1" "$2")" || { echo "__RB_MISSING__ $1 fence $2"; return 3; }
  if [ -n "${3:-}" ]; then printf '%s\n' "$t" | sed -n "$3"; else printf '%s\n' "$t"; fi
}
rb_span() { python3 "$KIT/lib/runbook.py" span "$RB_FILE" "$1" "$2" "${3:-1}" || echo "__RB_MISSING__ $1 span $2"; }

# Exact-string placeholder substitution: rb_sub <text> [<from>=<to>]...
rb_sub() {
  local text="$1"; shift
  python3 -c '
import sys
t = sys.argv[1]
for pair in sys.argv[2:]:
    a, b = pair.split("=", 1)
    if a not in t:
        sys.stderr.write("rb_sub: placeholder %r not in the command\n" % a)
        sys.exit(4)
    t = t.replace(a, b)
sys.stdout.write(t)
' "$text" "$@"
}

RUN_N=0
rb_run() { # <id> <text> [<from>=<to>]...
  local id="$1" text="$2"; shift 2
  RUN_N=$((RUN_N + 1))
  LOG="$OUT/steps/$(printf '%03d' "$RUN_N")-$id.log"
  # OLOG: what the command printed (masked), alone; every Check reads this, never the command text
  mkdir -p "$OUT/.stepout"; OLOG="$OUT/.stepout/$(basename "$LOG" .log).out"; : > "$OLOG"
  case "$text" in *__RB_MISSING__*) { echo "RUNBOOK TEXT NOT FOUND: $text"; } > "$LOG"; RC=99; return 99 ;; esac
  local cmd
  if ! cmd="$(rb_sub "$text" "$@" 2>"$LOG.err")"; then
    { echo "SUBSTITUTION FAILED: $(cat "$LOG.err")"; echo "$text"; } > "$LOG"; rm -f "$LOG.err"; RC=98; return 98
  fi
  rm -f "$LOG.err"
  {
    echo "### step $id  ($(date -u +%FT%TZ))"
    [ "$#" -gt 0 ] && echo "### substituted: $*"
    echo "### command (from $RB_FILE):"
    printf '%s\n' "$cmd" | sed 's/^/  | /'
    echo "### output:"
  } > "$LOG"
  eval "$cmd" >> "$LOG.out" 2>&1
  RC=$?
  # never let a stand-in secret into the record: mask anything that looks like one of ours
  l4_mask < "$LOG.out" > "$OLOG"; cat "$OLOG" >> "$LOG"; rm -f "$LOG.out"
  echo "### exit=$RC" >> "$LOG"
  return 0
}
out_of() { cat "$OLOG"; }

# Values generated in 3.3 are stand-ins, but they still never reach a results file.
L4_SECRETS_FILE=/srv/l4/secrets.list
l4_mask() {
  if [ -s "$L4_SECRETS_FILE" ]; then
    python3 -c '
import sys
secrets = [s for s in open(sys.argv[1]).read().split() if len(s) >= 12]
for line in sys.stdin:
    for s in secrets:
        line = line.replace(s, "<stand-in secret>")
    sys.stdout.write(line)
' "$L4_SECRETS_FILE"
  else
    cat
  fi
}

clean() { printf '%s' "$1" | tr '\t\n' '  ' | sed 's/  */ /g' | cut -c1-"${2:-400}"; }
row() { # <step> <verdict> <run> <check> [note]
  printf '%s\t%s\t%s\t%s\t%s\t%s\n' "$PHASE" "$1" "$2" "$(clean "$3")" "$(clean "$4")" "$(clean "${5:-}" 600)" >> "$ROWS"
  printf '%-8s %-6s %-9s %s\n' "$PHASE" "$1" "$2" "$(clean "${5:-$4}" 160)"
}

# Deep health, the section-0 command, cut from the runbook.
DH_CMD=""
deep_health() { # prints the JSON (pretty), sets DH_RC
  [ -n "$DH_CMD" ] || DH_CMD="$(rb_fence 0 2 2>/dev/null)"
  eval "$DH_CMD" 2>/dev/null
  DH_RC=$?
}
jget() { python3 -c '
import json, sys
d = json.load(sys.stdin)
for p in sys.argv[1].split("."):
    if isinstance(d, list):
        d = next((c for c in d if c.get("name") == p), None)
    else:
        d = d.get(p) if d is not None else None
print(json.dumps(d) if isinstance(d, (dict, list)) else d)
' "$1"; }

wait_backend_healthy() { # <seconds>
  local i id st
  for i in $(seq 1 "$1"); do
    id="$(ffc ps -q backend 2>/dev/null)"
    st="$( [ -n "$id" ] && docker inspect --format '{{.State.Health.Status}}' "$id" 2>/dev/null)"
    [ "$st" = healthy ] && return 0
    sleep 1
  done
  return 1
}
psql_app() { ffc exec -T postgres psql -U fixflow_app -d fixflow -v ON_ERROR_STOP=1 -tA "$@"; }
