#!/bin/sh
# Agent A, r58c: host-only check of the launcher's start race (2026-11-14: ktest-b13 and ktest-G40 both passed the
# "no ktest running" check in the same second). No container runs: `docker` is a stub on PATH, the lane lock, the
# launch log, memgate and the 30 s sleeps are swapped for temporary ones in a COPY of the launcher (the same edits on
# the before bytes r58c/A/pre/ktest_r92.sh and on the current r58c/A/ktest.sh).
# Also item 9 of end-order-changes-2: the launcher exits with the container's exit code (before bytes r58c/A/pre/ktest_r93.sh),
# and (2026-11-15, ktest-a21) a container that ends before docker wait keeps its code: no --rm (before r58c/A/pre/ktest_r95.sh).
# usage (Git Bash, from anywhere): sh r58c/A/test_ktest_race.sh     -> RESULT PASS|FAIL ktest-race
A=$(cd "$(dirname "$0")" && pwd)
T=$(mktemp -d); export T
mkdir -p $T/bin
cat > $T/bin/docker <<'EOF'
#!/bin/sh
case "$1" in
  ps) if [ -f $T/running ]; then echo "$FAKE_NAME"; [ -n "$RIVAL" ] && echo "$RIVAL"; fi; exit 0 ;;
  image) echo sha256:fake; exit 0 ;;
  run) touch $T/running; rm -f $T/rmflag; for a in "$@"; do [ "$a" = --rm ] && touch $T/rmflag; done; echo run >> $T/calls; echo deadbeef; exit 0 ;;
  wait) echo wait >> $T/calls; rm -f $T/running
        if [ -n "$GONE" ] && [ -f $T/rmflag ]; then echo 'Error: No such container' >&2; exit 1; fi  # ended and removed (--rm) before the wait
        echo ${WAIT_RC:-0}; exit 0 ;;
  stop|rm) echo "$1" >> $T/calls; rm -f $T/running; exit 0 ;;
esac
exit 0
EOF
chmod +x $T/bin/docker
mk() {  # $1 launcher -> $T/kt.sh with the lock, log, memgate and sleeps replaced
  sed -e 's|\$WB/r58c/ktest.lock|$T/lock|g' -e 's|^LOG=.*|LOG=$T/launch.log|' -e 's|sh \$WB/orchestrator/memgate.sh sample|echo 9999999 1|' \
      -e 's|sleep 30|sleep 0|g' -e 's|^mkdir -p \$WB/r58c/A/logs.*|:|' "$1" > $T/kt.sh
}
run() {  # $1 launcher, $2 rival name or '', $3 the container rc docker wait reports, $4 GONE: it ended before the wait -> "rc=<n> calls=<a,b,..> stopped=<0|1>"
  rm -f $T/calls $T/running $T/launch.log; rmdir $T/lock 2>/dev/null; mk "$1"
  GONE=$4 WAIT_RC=${3:-0} RIVAL=$2 FAKE_NAME=ktest-a99 PATH="$T/bin:$PATH" sh $T/kt.sh ktest-a99 "test_x" > $T/out 2>&1; rc=$?
  st=0; grep -q 'another ktest started beside it' $T/launch.log 2>/dev/null && st=1
  echo "rc=$rc calls=$(tr '\n' ',' < $T/calls 2>/dev/null) stopped=$st"
}
ok=1
pre_race=$(run $A/pre/ktest_r92.sh ktest-b99); echo "before bytes, a rival appears after the run: $pre_race"
case "$pre_race" in *"calls=run,wait,"*) echo "  fail before: the rival was not seen; the test ran beside it";; *) ok=0; echo "  UNEXPECTED";; esac
new_race=$(run $A/ktest.sh ktest-b99); echo "current bytes, a rival appears after the run: $new_race"
case "$new_race" in "rc=14 calls=run,rm, stopped=1") echo "  pass after: stopped its own container only, exit 14";; *) ok=0; echo "  FAILED";; esac
new_alone=$(run $A/ktest.sh ''); echo "current bytes, no rival: $new_alone"
case "$new_alone" in "rc=0 calls=run,wait,rm, stopped=0") echo "  ran and waited as before, exit 0";; *) ok=0; echo "  FAILED";; esac
# end-order-changes-2 item 9: the launcher exits with the container's exit code
pre_rc=$(run $A/pre/ktest_r93.sh '' 3); echo "before bytes (r93), the container ends rc 3: $pre_rc"
case "$pre_rc" in "rc="[01]" "*) echo "  fail before: the launcher's own exit code was not the container's";; *) ok=0; echo "  UNEXPECTED";; esac
new_rc=$(run $A/ktest.sh '' 3); echo "current bytes, the container ends rc 3: $new_rc"
case "$new_rc" in "rc=3 calls=run,wait,rm, stopped=0") echo "  pass after: exit 3";; *) ok=0; echo "  FAILED";; esac
# 2026-11-15 (ktest-a21): the container ends (rc 12) within the 3 s re-check, before docker wait
pre_gone=$(run $A/pre/ktest_r95.sh '' 12 1); echo "before bytes (r95, --rm), the container ended before the wait: $pre_gone"
case "$pre_gone" in "rc=124 "*) echo "  fail before: a finished run was logged over the limit, rc 124, its own code lost";; *) ok=0; echo "  UNEXPECTED";; esac
new_gone=$(run $A/ktest.sh '' 12 1); echo "current bytes (no --rm), the container ended before the wait: $new_gone"
case "$new_gone" in "rc=12 calls=run,wait,rm, stopped=0") echo "  pass after: exit 12";; *) ok=0; echo "  FAILED";; esac
rm -rf $T
echo "sha256 $(sha256sum $A/ktest.sh | cut -c1-64) r58c/A/ktest.sh"
[ $ok = 1 ] && echo "RESULT PASS ktest-race" || echo "RESULT FAIL ktest-race"
[ $ok = 1 ]
