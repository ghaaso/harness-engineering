#!/bin/sh
# Fake docker for r58c/B/eor/test_eor_lock.sh (first on PATH as `docker`; no daemon, no container). Records every
# call in $FD_STATE/calls.log, and at `run` and `wait` whether the grader has freed its lock ($FD_STATE/released)
# and whether $FD_LOCK exists. `ps` is never asked here (end_of_run.sh asks it through EOR_DOCKER_PS).
L=$FD_STATE/calls.log; echo "docker $*" >> "$L"
lk() { [ -d "$FD_LOCK" ] && echo 1 || echo 0; }
case "$1" in
  image) echo sha256:fakeimage ;;
  run) echo "EVENT run grader_done $(cat "$FD_STATE/released" 2>/dev/null || echo 0) lock $(lk)" >> "$L"; echo fakeid ;;
  exec) echo "EVENT release" >> "$L" ;;
  wait) echo "EVENT wait lock $(lk)" >> "$L"; echo 0 ;;
  rm|stop) echo "EVENT $1" >> "$L" ;;
  *) echo "fake docker: $1 not modelled" >&2; exit 1 ;;
esac
exit 0
