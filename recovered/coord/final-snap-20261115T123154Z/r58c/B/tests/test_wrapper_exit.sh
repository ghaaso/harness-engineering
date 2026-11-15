#!/bin/sh
# Change 9: the in-container wrappers exit non-zero when a test fails, so r58c/B/ktest.sh (which exits with the
# container's code) reports a failed run as failed. A test name with no file is a failing test. After bytes:
# kt_inner.sh and role.sh exit 1; before bytes (r58c/B/pre-exitcode/) exit 0 (fail before). Scratch: $BOUT/wexit.
# usage: sh r58c/B/ktest.sh ktest-b<N> /w/r58c/B/tests/test_wrapper_exit.sh
B0=$BOUT; f=0; n=0
for k in after before; do d=/w/r58c/B/tests; [ $k = before ] && d=/w/r58c/B/pre-exitcode
  echo "sha256 $(sha256sum $d/kt_inner.sh | cut -c1-64) ${d#/w/}/kt_inner.sh; $(sha256sum $d/role.sh | cut -c1-64) ${d#/w/}/role.sh"
  BOUT=$B0/wexit/$k sh $d/kt_inner.sh no_such_test_x > /dev/null 2>&1; r1=$?
  BOUT=$B0/wexit/$k ROLE=wexit RF=train/selectB.py sh $d/role.sh wexit train/selectB.py no_such_test_x > /dev/null 2>&1; r2=$?
  want="1 1"; [ $k = before ] && want="0 0"; n=$((n+1))
  if [ "$r1 $r2" = "$want" ]; then echo "PASS $k: kt_inner.sh and role.sh exit $r1 $r2 on a failing test"; else f=$((f+1)); echo "FAIL $k: got $r1 $r2 want $want"; fi
done
[ $f = 0 ] && echo "RESULT PASS wrapper-exit ($n checks)" || echo "RESULT FAIL wrapper-exit"; exit $f
