#!/bin/sh
# Fake `docker ps` for the end_of_run.sh plumbing test (EOR_DOCKER_PS="sh fake_ps.sh"): the Nth call prints the
# container names in $FAKE_PS_<N> (space-separated; unset or empty = nothing running) and counts calls in
# $FAKE_PS_CNT. Any other docker subcommand is refused: end_of_run.sh only asks `ps` through this hook.
[ "$1" = ps ] || { echo "fake_ps.sh: only ps (got $1)" >&2; exit 2; }
n=$(cat "$FAKE_PS_CNT" 2>/dev/null || echo 0); n=$((n+1)); echo $n > "$FAKE_PS_CNT"
eval "v=\${FAKE_PS_$n:-}"
for c in $v; do echo "$c"; done
exit 0
