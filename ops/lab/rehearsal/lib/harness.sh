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
# Verdicts: DONE, FAILED, AMBIGUOUS, NRH (not rehearsable here), N/A, and MOVED: the runbook's
# shape changed under a step the rig types (lib/runbook-pins.tsv), so nothing was typed for it.
#
# Modes (environment, set by the entry scripts):
#   L4_REPIN=1   check the runbook under test against pins made from itself instead of the
#                committed ones; the difference is written to $OUT/pins-diff-*.txt, and a reader
#                must check the rig's choice of every block listed there
#   L4_MUTATE=1  negative run: the runbook is read from a copy with lib/mutations.tsv's runbook
#                mutations applied, and l4_mut hooks change the stand-in's state (README, "Every
#                kind of check, shown failing")
set -u
# shellcheck disable=SC1091
[ -f /srv/l4/mode.env ] && . /srv/l4/mode.env
KIT=/srv/l4/kit
OUT="${OUT:-/srv/l4/out}"
mkdir -p "$OUT/steps"
RB_FILE="${RB_FILE:-/opt/fixflow/docs/RUNBOOK-SELFHOST.md}"
ROWS="$OUT/rows.tsv"
[ -f "$ROWS" ] || printf 'phase\tstep\tverdict\trun\tcheck\tnote\n' > "$ROWS"
PHASE="${PHASE:-restore}"
RB_MOVED=""

# The runbook file actually read, and the pins it is checked against. Cached by content: rb_fence
# runs inside command substitutions, and a subshell cannot keep a variable for the next call.
rb_eff() { # prints "<file> <pins>"
  local key d=/srv/l4/rbcache
  key="$(md5sum < "$RB_FILE" | cut -c1-12)"
  mkdir -p "$d"
  if [ "${L4_MUTATE:-0}" = 1 ]; then
    if [ ! -s "$d/$key.mut.md" ]; then
      python3 "$KIT/lib/mutate.py" "$RB_FILE" "$d/$key.mut.md" "$KIT/lib/mutations.tsv" "$KIT/lib/runbook-pins.tsv" \
        >> "$OUT/mutations-applied.log" 2>&1 || echo "L4: runbook mutation of $RB_FILE failed (mutations-applied.log)" >&2
    fi
    echo "$d/$key.mut.md $d/$key.mut.md.pins"
  elif [ "${L4_REPIN:-0}" = 1 ]; then
    if [ ! -s "$d/$key.pins" ]; then
      python3 "$KIT/lib/runbook.py" pins "$RB_FILE" > "$d/$key.pins"
      diff <(grep -v '^#' "$KIT/lib/runbook-pins.tsv") "$d/$key.pins" > "$OUT/pins-diff-$key.txt"
      echo "$RB_FILE" >> "$OUT/pins-diff-$key.txt"
    fi
    echo "$RB_FILE $d/$key.pins"
  else
    echo "$RB_FILE $KIT/lib/runbook-pins.tsv"
  fi
}
rb_fence() {
  local t eff f pins
  eff="$(rb_eff)"; f="${eff% *}"; pins="${eff#* }"
  if ! t="$(RB_PINS="$pins" python3 "$KIT/lib/runbook.py" fence "$f" "$1" "$2" 2>"$OUT/.rb.err")"; then
    echo "__RB_MISSING__ $1 fence $2: $(tr '\n' ' ' < "$OUT/.rb.err")"; return 3
  fi
  if [ -n "${3:-}" ]; then t="$(printf '%s\n' "$t" | sed -n "$3")"; fi
  # a line range that selects nothing is a moved block too
  [ -n "$t" ] || { echo "__RB_MISSING__ $1 fence $2 lines ${3:-}: selected nothing"; return 3; }
  printf '%s\n' "$t"
}
rb_span() {
  local eff f
  eff="$(rb_eff)"; f="${eff% *}"
  python3 "$KIT/lib/runbook.py" span "$f" "$1" "$2" "${3:-1}" 2>/dev/null || echo "__RB_MISSING__ $1 span $2"
}
# True when the runbook under rehearsal anchors a block <!-- block: <step>-<name> --> (the
# runbook batch of ruling C42 anchors every block it changed; a rehearsal then follows that text)
rb_anch() { # <step> <name>
  local eff f
  eff="$(rb_eff)"; f="${eff% *}"
  python3 "$KIT/lib/runbook.py" anchors "$f" "$1" 2>/dev/null | grep -qxF "$1-$2"
}
# True when the step's prose contains <text> (a Check whose wording the runbook changed)
rb_text_has() { # <step> <text>
  local eff f
  eff="$(rb_eff)"; f="${eff% *}"
  python3 "$KIT/lib/runbook.py" text "$f" "$1" 2>/dev/null | tr '\n' ' ' | tr -s ' ' | grep -qF -- "$2"
}
# Text cut but not handed to rb_run (typed line by line elsewhere) records a move the same way.
rb_moved_check() { # <id> <text>
  case "$2" in *__RB_MISSING__*) rb_moved "$1" "$2"; return 1 ;; esac
  return 0
}
rb_moved() { # <id> <text>
  RB_MOVED="${RB_MOVED:+$RB_MOVED; }$1"
  printf '%s\t%s\t%s\n' "$PHASE" "$1" "$(printf '%s' "$2" | tr '\t\n' '  ')" >> "$OUT/moved.log"
  echo "L4: RUNBOOK MOVED under step $1: $(printf '%s' "$2" | tr '\n' ' ' | cut -c1-200)" >&2
}

# State mutations (negative run only): true when <id> is a state mutation listed in mutations.tsv
l4_mut() { # <hook name: the step column of a state mutation>
  [ "${L4_MUTATE:-0}" = 1 ] || return 1
  local id
  id="$(awk -F'\t' -v h="$1" -v r="${L4_REHEARSAL:-}" '$4==h && $3=="state" && (r=="" || $2==r){print $1; exit}' "$KIT/lib/mutations.tsv")"
  [ -n "$id" ] || return 1
  printf '%s\t%s\tstate mutation %s (%s) applied\n' "$(date -u +%FT%TZ)" "$PHASE" "$id" "$1" >> "$OUT/mutations-applied.log"
  return 0
}

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
  case "$text" in *__RB_MISSING__*) { echo "RUNBOOK TEXT NOT FOUND OR MOVED (nothing typed): $text"; } > "$LOG"; RC=99; rb_moved "$id" "$text"; return 99 ;; esac
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
  # a guard line drops only the rest of its line, as in the owner's interactive shell (lib/guardwrap.py)
  local ecmd; ecmd="$(printf '%s\n' "$cmd" | python3 "$KIT/lib/guardwrap.py")" || ecmd="$cmd"
  # the owner's shell has no nounset: an unset variable in typed text expands empty, as there
  local nu=0; case $- in *u*) nu=1; set +u ;; esac
  eval "$ecmd" >> "$LOG.out" 2>&1
  RC=$?
  [ $nu = 1 ] && set -u
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
import re
vals = open(sys.argv[1]).read().split()
long_ = [s for s in vals if len(s) >= 12]
# short values (the six-digit stand-in PINs) are masked as whole tokens only
pat = "|".join("(?<![0-9A-Za-z])" + re.escape(s) + "(?![0-9A-Za-z])" for s in vals if 4 <= len(s) < 12)
short = re.compile(pat) if pat else None
for line in sys.stdin:
    for s in long_:
        line = line.replace(s, "<stand-in secret>")
    if short:
        line = short.sub("<stand-in PIN>", line)
    sys.stdout.write(line)
' "$L4_SECRETS_FILE"
  else
    cat
  fi
}

clean() { printf '%s' "$1" | tr '\t\n' '  ' | sed 's/  */ /g' | cut -c1-"${2:-400}"; }
row() { # <step> <verdict> <run> <check> [note]
  # a step whose runbook text moved is MOVED, whatever its check would have said
  if [ -n "$RB_MOVED" ]; then
    case "$2" in
      NRH | N/A) ;;
      *) set -- "$1" MOVED "$3" "$4" "runbook moved under: $RB_MOVED (moved.log); nothing was typed for it, so its check proves nothing. ${5:-}" ;;
    esac
    RB_MOVED=""
  fi
  printf '%s\t%s\t%s\t%s\t%s\t%s\n' "$PHASE" "$1" "$2" "$(clean "$3")" "$(clean "$4")" "$(clean "${5:-}" 600)" >> "$ROWS"
  printf '%-8s %-6s %-9s %s\n' "$PHASE" "$1" "$2" "$(clean "${5:-$4}" 160)"
}

# Deep health, the section-0 command, cut from the runbook.
DH_CMD=""
deep_health() { # prints the JSON (pretty), sets DH_RC
  [ -n "$DH_CMD" ] || DH_CMD="$(rb_fence 0 2 2>/dev/null)"
  rb_moved_check "0 (deep health)" "$DH_CMD" || { DH_CMD=""; DH_RC=99; return 99; }
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
