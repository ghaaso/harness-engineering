#!/bin/sh
# Fixture test for ops/selfhost/bin/restore-gate.sh: every spelling Compose's env_file parser
# passes through must close the gate, and the shipped example must leave it open. No Docker.
# CI runs it (.github/workflows/ci.yml); the smoke runs it in the gate's own image (mawk).
#
#   sh ops/selfhost/smoke/restore-gate.test.sh
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../../.." && pwd)"
GATE="$ROOT/ops/selfhost/bin/restore-gate.sh"
EXAMPLE="$ROOT/ops/selfhost/env/backend.env.example"
T="$(mktemp -d)"
trap 'rm -rf "$T"' EXIT
fails=0
n=0

# case <expected exit> <label> <backend.env content, printf format> [sign-off content]
case_() {
  want="$1"; label="$2"; body="$3"; signoff="${4-signed off by smoke}"
  n=$((n + 1))
  d="$T/c$n"; mkdir -p "$d"
  [ "$signoff" = "-" ] || printf '%s' "$signoff" > "$d/restore-signed-off"
  [ "$body" = "-" ] || printf "$body" > "$d/backend.env"
  out="$(GATE_DIR="$d" sh "$GATE" 2>&1)"; got=$?
  if [ "$got" != "$want" ]; then
    echo "FAIL $label: exit $got, want $want: $out"; fails=$((fails + 1))
  elif printf '%s' "$out" | grep -q LEAKED; then
    echo "FAIL $label: the gate printed a value: $out"; fails=$((fails + 1))
  else
    echo "ok   $label (exit $got)"
  fi
}

# The sign-off file.
case_ 1 "no sign-off file" 'FIXFLOW_DATABASE_URL=x\n' -
case_ 1 "empty sign-off file" 'FIXFLOW_DATABASE_URL=x\n' ""
case_ 1 "no backend.env" -
# Open: the exact NAME= form is beaten by the compose override (smoke S5 proves the override).
case_ 0 "exact forced keys" 'FIXFLOW_ENVIRONMENT=LEAKED\nFIXFLOW_ENABLE_DISPATCHER=LEAKED\nFIXFLOW_BACKUP_ENABLED=LEAKED\nFIXFLOW_BACKUP_PREFIX=LEAKED\n'
case_ 0 "comments, blanks, unrelated keys" '# fixflow_environment=LEAKED\n\n   # FIXFLOW_ENABLE_DISPATCHER: LEAKED\nFIXFLOW_CORS_ORIGINS=https://app.example.invalid\nfixflow_cors_origins=LEAKED\n'
case_ 0 "CRLF exact" 'FIXFLOW_ENVIRONMENT=LEAKED\r\nFIXFLOW_DATABASE_URL=x\r\n'
case_ 0 "BOM then exact" '\357\273\277FIXFLOW_ENVIRONMENT=LEAKED\n'
# Closed: every other spelling Compose accepts (each checked with docker compose config).
case_ 1 "lowercase =" 'fixflow_environment=LEAKED\n'
case_ 1 "mixed case =" 'Fixflow_Enable_Dispatcher=LEAKED\n'
case_ 1 "lowercase colon" 'fixflow_enable_dispatcher: LEAKED\n'
case_ 1 "exact name, colon" 'FIXFLOW_ENVIRONMENT: LEAKED\n'
case_ 1 "exact name, colon no space" 'FIXFLOW_BACKUP_PREFIX:LEAKED\n'
case_ 1 "spaced =" 'FIXFLOW_ENVIRONMENT = LEAKED\n'
case_ 1 "leading spaces" '   FIXFLOW_BACKUP_ENABLED=LEAKED\n'
case_ 1 "leading tab, tab before =" '\tfixflow_environment\t=\tLEAKED\n'
case_ 1 "export exact" 'export FIXFLOW_ENVIRONMENT=LEAKED\n'
case_ 1 "export lowercase colon" 'export   fixflow_enable_dispatcher:LEAKED\n'
case_ 1 "bare name (value from the shell)" 'fixflow_environment\n'
case_ 1 "Kelvin sign (str.lower gives k)" 'fixflow_bac\342\204\252up_enabled=LEAKED\n'
case_ 1 "BOM then lowercase" '\357\273\277fixflow_environment=LEAKED\n'
case_ 1 "CRLF lowercase" 'FIXFLOW_DATABASE_URL=x\r\nfixflow_environment=LEAKED\r\n'
case_ 1 "a hostile line among good ones" 'FIXFLOW_DATABASE_URL=x\nFIXFLOW_ENVIRONMENT=LEAKED\nfixflow_backup_prefix: LEAKED\nFIXFLOW_CORS_ORIGINS=y\n'

# The shipped example must open the gate as written.
n=$((n + 1)); d="$T/c$n"; mkdir -p "$d"
cp "$EXAMPLE" "$d/backend.env"; echo "smoke" > "$d/restore-signed-off"
if out="$(GATE_DIR="$d" sh "$GATE" 2>&1)"; then echo "ok   backend.env.example opens the gate"
else echo "FAIL backend.env.example closes the gate: $out"; fails=$((fails + 1)); fi

# --env-only (runbook 3.6): no sign-off needed, the key check still bites.
n=$((n + 1)); d="$T/c$n"; mkdir -p "$d"
cp "$EXAMPLE" "$d/backend.env"
if out="$(GATE_DIR="$d" sh "$GATE" --env-only 2>&1)"; then echo "ok   --env-only: example passes without a sign-off"
else echo "FAIL --env-only on the example: $out"; fails=$((fails + 1)); fi
n=$((n + 1))
printf 'fixflow_environment: dev\n' >> "$d/backend.env"
if GATE_DIR="$d" sh "$GATE" --env-only >/dev/null 2>&1; then echo "FAIL --env-only let a colon line through"; fails=$((fails + 1))
else echo "ok   --env-only: a colon line closes it"; fi

echo "restore-gate.test: $n cases, FAILS=$fails"
[ "$fails" = 0 ]
