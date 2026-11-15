# r58c/B/race_gate.sh: sourced (not run) by r58c/B/ktest.sh, lane_step.sh and rerun_check.sh (round r58c, after the
# 2026-11-14 reset; coordinator: ktest-b13 and ktest-G40 both passed "no ktest-* running" in the same second and ran
# side by side). The check and `docker run` are two steps, so a check alone cannot exclude a twin. Therefore:
#   1. the container's command is wrapped by rg_wrap: it first waits for /tmp/go (at most RG_HOLD s, then exit 97)
#      and does nothing else until then, so a container removed before its release has read and written nothing;
#   2. after `docker run`, rg_others lists the OTHER running containers matching the launcher's own pattern;
#   3. none: rg_release (`docker exec NAME touch /tmp/go`) lets the command run. Some: the launcher removes its own
#      container, waits rg_backoff seconds (30 to 59, random, so two launchers that met do not meet again in step)
#      and retries from its pre-check. Both twins see each other in step 2, so both step back; neither runs alone
#      into the other. Test: r58c/B/tests/test_race_gate.sh (a fake docker; no container).
RG_HOLD=120
rg_wrap() { printf 'rg_n=0; until [ -f /tmp/go ]; do rg_n=$((rg_n+1)); [ $rg_n -gt %s ] && exit 97; sleep 1; done; %s' "$RG_HOLD" "$1"; }
rg_others() { docker ps --format '{{.Names}}' | tr -d '\r' | grep -E "$1" | grep -vx "$2" | tr '\n' ' ' | sed 's/ $//'; }
rg_release() { docker exec "$1" touch /tmp/go; }
rg_backoff() { awk -v s="$(date +%s)$$" 'BEGIN { srand(s); printf "%d", 30 + int(rand() * 30) }'; }
# rg_clear PATTERN NAME: looks right after the start and again 3 s later (agent A's r58c/A/ktest.sh does the same
# second look); prints the others and returns 1 when either look finds one, returns 0 when both are clean.
rg_clear() { o=$(rg_others "$1" "$2"); [ -z "$o" ] || { echo "$o"; return 1; }; sleep 3; o=$(rg_others "$1" "$2"); [ -z "$o" ] || { echo "$o"; return 1; }; return 0; }
