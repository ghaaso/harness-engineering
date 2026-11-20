#!/usr/bin/env bash
# Run every offline check this repository can run on its own, in a fresh temporary workspace.
#   tools/run_checks.sh           all suites (~2-3 min)
#   tools/run_checks.sh --quick   skip the two ~60 s library-pathways tests
# Never writes inside the repository: suites run on copies, HOME and TMPDIR point into the
# workspace, and Python writes no bytecode. Needs Python >= 3.10 and Node. No network.
# Exit 0 when every suite passes, 1 otherwise. The full log stays in the workspace.
set -u

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
QUICK=0
for a in "$@"; do
  case "$a" in
    --quick) QUICK=1 ;;
    -h|--help) sed -n '2,7p' "$0" | cut -c3-; exit 0 ;;
    *) echo "unknown option: $a (try --help)" >&2; exit 2 ;;
  esac
done

TMP0="${TMPDIR:-/tmp}"
WS="$(mktemp -d "${TMP0%/}/run-checks.XXXXXX")" || exit 1
LOG="$WS/run-checks.log"
export HOME="$WS/home" TMPDIR="$WS/tmp" PYTHONDONTWRITEBYTECODE=1
mkdir -p "$HOME" "$TMPDIR"

# First interpreter that is Python >= 3.10 (the clinic suites and the runbook self-test need it).
PY=""
for c in python3.14 python3.13 python3.12 python3.11 python3.10 python3; do
  if command -v "$c" >/dev/null 2>&1 && "$c" -c 'import sys; sys.exit(sys.version_info < (3, 10))' 2>/dev/null; then
    PY="$(command -v "$c")"; break
  fi
done
need_py() { [ -n "$PY" ] || { echo "no Python >= 3.10 found (tried python3.14 .. python3.10, python3)"; return 127; }; }
need_node() { command -v node >/dev/null 2>&1 || { echo "node not found on PATH"; return 127; }; }

{ echo "repo: $REPO"; echo "workspace: $WS"; echo "python: ${PY:-none >= 3.10}"
  echo "node: $(node --version 2>/dev/null || echo none)"; echo "quick: $QUICK"; } | tee "$LOG"

# Copies: the library tests resolve ../../library-pathways from their own folder, and the
# rev4 regression writes its console file next to itself.
LIBDIR="$WS/lib/docs/program/evidence/library-pathways"
if [ "$QUICK" = 0 ]; then
  mkdir -p "$WS/lib/docs/program/evidence"
  cp -R "$REPO/docs/program/library-pathways" "$WS/lib/docs/program/"
  cp -R "$REPO/docs/program/evidence/library-pathways" "$WS/lib/docs/program/evidence/"
fi
cp -R "$REPO/case-studies/clinic" "$WS/clinic"
mkdir -p "$WS/rb" && cp -R "$REPO/ops/lab/rehearsal/lib" "$WS/rb/lib"
cp "$REPO/case-studies/fixflow/docs/RUNBOOK-SELFHOST.md" "$WS/rb/"

# Suites: s_* runs one, c_* turns its output file into a counts line.
s_verify()   { "${PY:-python3}" "$REPO/tools/verify_extraction.py"; }
c_verify()   { echo "$(sed -n 's/.*"checked_files": \([0-9]*\).*/\1/p' "$1") files, $(grep -cE ': (missing|changed)"' "$1") failures"; }
s_engine()   { need_node && cd "$LIBDIR" && node - < engine-test.js.txt; }
c_engine()   { grep -E 'tests passed' "$1" | tail -1 | cut -c1-60; }
s_rev4()     { need_node && cd "$LIBDIR" && node - < rev4-regression.js.txt; }
c_rev4()     { grep -q '^section 14 targets: ' "$1" || return; echo "$(sed -n 's/^section 14 targets: \([0-9]*\) checked, \([0-9]*\) missed.*/\1 targets, \2 missed/p' "$1");" \
                    "$(sed -n 's/^largest relative gap over \([0-9]*\) compared.*/\1 numbers/p' "$1"), $(sed -n 's/.*all misses: \([0-9]*\).*/\1/p' "$1") misses"; }
s_ctx()      { need_py && cd "$WS/clinic" && "$PY" -m unittest tests/test_context_system.py; }
s_codex()    { need_py && cd "$WS/clinic" && "$PY" -m unittest discover -s tools/context_system_codex/tests; }
s_workflow() { need_py && cd "$WS/clinic" && "$PY" -m unittest discover -s tests/workflow; }
c_unit()     { echo "$(sed -n 's/^Ran \([0-9]*\) tests\{0,1\} .*/\1/p' "$1") run, $(grep -E '^(OK|FAILED)' "$1" | tail -1)"; }
# OUT: lib/harness.sh, which the self-test sources, otherwise creates /srv/l4/out.
s_runbook()  { need_py && cd "$WS/rb" && OUT="$WS/rb/out" "$PY" lib/selftest-runbook.py RUNBOOK-SELFHOST.md lib/runbook-pins.tsv; }
c_runbook()  { echo "$(grep -c '^ok' "$1") ok, $(grep -c '^FAIL' "$1") FAIL"; }

ROWS=""; FAILED=0
step() { # <name> <suite fn> <counts fn>
  local out="$WS/$1.out" t0 rc secs res counts
  t0=$(date +%s)
  ( "$2" ) > "$out" 2>&1; rc=$?
  secs=$(( $(date +%s) - t0 ))
  counts="$("$3" "$out" 2>/dev/null | tr -s ' \n' ' ' | sed 's/ $//')"
  if [ "$rc" = 0 ]; then res=PASS; else res=FAIL; FAILED=1; counts="${counts:-$(tail -1 "$out")} (exit $rc)"; fi
  { printf '\n===== %s: %s (exit %s, %ss)\n' "$1" "$res" "$rc" "$secs"; cat "$out"; } >> "$LOG"
  printf '%-4s  %-28s %s  (%ss)\n' "$res" "$1" "$counts" "$secs"
  ROWS="$ROWS$(printf '%-28s %-6s %7s  %s' "$1" "$res" "$secs" "$counts")"$'\n'
}

echo
T0=$(date +%s)
step verify_extraction        s_verify   c_verify
if [ "$QUICK" = 0 ]; then
  step library_engine_test    s_engine   c_engine
  step library_rev4_regression s_rev4    c_rev4
fi
step clinic_context_system    s_ctx      c_unit
step clinic_codex_adapter     s_codex    c_unit
step clinic_workflow          s_workflow c_unit
step runbook_selftest         s_runbook  c_runbook

rm -rf "$WS/lib" "$WS/clinic" "$WS/rb" "$WS/tmp" "$WS/home"  # keep only the log and per-suite output
echo
printf '%-28s %-6s %7s  %s\n' SUITE RESULT SECONDS COUNTS
printf '%s' "$ROWS"
[ "$QUICK" = 1 ] && echo "(--quick: library_engine_test and library_rev4_regression skipped)"
echo "total: $(( $(date +%s) - T0 ))s; overall: $([ "$FAILED" = 0 ] && echo PASS || echo FAIL)"
echo "full log: $LOG"
exit "$FAILED"
