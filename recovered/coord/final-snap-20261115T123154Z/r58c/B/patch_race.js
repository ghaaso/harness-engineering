// agent B, r58c, after the 2026-11-14 reset: the start race (coordinator item 2) in ktest.sh, lane_step.sh,
// rerun_check.sh and end_of_run.sh; ruling 93 in kt_inner.sh. Run from LANE: node r58c/B/patch_race.js
const fs = require('fs');
function patch(P, pairs) {
  let s = fs.readFileSync(P, 'utf8');
  for (const [a, b] of pairs) { if (s.split(a).length !== 2) throw new Error(P + ': not exactly once: ' + a.slice(0, 90)); s = s.replace(a, () => b); }
  fs.writeFileSync(P, s); console.log('patched', P);
}
const NOTE = `# After \`docker run\` it looks again (r58c/B/race_gate.sh): the container waits for /tmp/go and is released only when
# no other matching container runs; otherwise it is removed before its release (it has run nothing) and the start is
# retried after a random 30-59 s (coordinator, after ktest-b13 and ktest-G40 started in the same second).
`;
// ---- ktest.sh
patch('r58c/B/ktest.sh', [
  [`NAME=$1; shift; INNER=$1; shift\n`, NOTE + `NAME=$1; shift; INNER=$1; shift\n`],
  [`echo "$NAME $(date -u +%FT%TZ)" > /dev/null
while docker ps --format '{{.Names}}' | grep -q '^ktest-'; do`,
   `. $WB/r58c/B/race_gate.sh
while :; do
while docker ps --format '{{.Names}}' | grep -q '^ktest-'; do`],
  [` -w /w/train "$IMGID" sh "$INNER" "$@" >/dev/null || { say "$NAME: docker run failed"; exit 3; }
`, ` -w /w/train "$IMGID" sh -c "$(rg_wrap 'exec sh "$0" "$@"')" "$INNER" "$@" >/dev/null || { say "$NAME: docker run failed"; exit 3; }
o=$(rg_others '^ktest-' $NAME); [ -z "$o" ] && break
b=$(rg_backoff); say "$NAME: $o runs as well after the start; $NAME removed before its release (it ran nothing); retry in $b s"
docker rm -f $NAME >/dev/null 2>&1; sleep $b
done
rg_release $NAME || { say "$NAME: release failed"; exit 3; }
say "$NAME: released (no other ktest-* running after its start)"
`]]);
// ---- lane_step.sh
patch('r58c/B/lane_step.sh', [
  [`# usage: sh lane_step.sh ktest-r<N>`, NOTE + `# usage: sh lane_step.sh ktest-r<N>`],
  [`docker ps -a --format '{{.Names}}' | grep -qx "$NAME" && { say "$NAME exists: not starting"; exit 4; }
`, `docker ps -a --format '{{.Names}}' | grep -qx "$NAME" && { say "$NAME exists: not starting"; exit 4; }
. $WB/r58c/B/race_gate.sh
while :; do
`],
  [`say "docker run line: $RUN \\"$CMD\\""
MSYS_NO_PATHCONV=1 $RUN "$CMD" >/dev/null 2>>"$LOG" || { say "$NAME: docker run failed"; exit 4; }
`, `say "docker run line: $RUN \\"$(rg_wrap "$CMD")\\""
MSYS_NO_PATHCONV=1 $RUN "$(rg_wrap "$CMD")" >/dev/null 2>>"$LOG" || { say "$NAME: docker run failed"; exit 4; }
o=$(rg_others '^(ktest|kge)-' $NAME); [ -z "$o" ] && break
b=$(rg_backoff); say "$NAME: $o runs as well after the start; $NAME removed before its release (it ran nothing); retry in $b s"
docker rm -f $NAME >/dev/null 2>&1; sleep $b
done
rg_release $NAME || { say "$NAME: release failed"; docker rm -f $NAME >/dev/null 2>&1; exit 4; }
say "$NAME: released (no other ktest-* or kge-* running after its start)"
`]]);
// ---- rerun_check.sh
patch('r58c/B/rerun_check.sh', [
  [`# C: >= 15 GB free; no other kge-* and no ktest-* container running or present under the name kge-R1.
`, `# C: >= 15 GB free; no other kge-* running (refused, exit 4) and no ktest-* running (waited for, at most 40 checks
# 30 s apart, then exit 4); nothing present under the name kge-R1.
` + NOTE.replace('retried after', 'retried (at most 10 times) after')],
  [`docker ps -a --format '{{.Names}}' | grep -qx $NAME && { say "$NAME exists: not starting"; exit 4; }
docker ps --format '{{.Names}}' | grep -q '^kge-' && { say "another kge-* container runs ($(docker ps --format '{{.Names}}' | grep '^kge-' | tr '\\n' ' ')): the card window has not opened; not starting"; exit 4; }
docker ps --format '{{.Names}}' | grep -q '^ktest-' && { say "a ktest-* container runs: not starting"; exit 4; }
`, `. $WB/r58c/B/race_gate.sh
tries=0
while :; do
docker ps -a --format '{{.Names}}' | grep -qx $NAME && { say "$NAME exists: not starting"; exit 4; }
docker ps --format '{{.Names}}' | grep -q '^kge-' && { say "another kge-* container runs ($(docker ps --format '{{.Names}}' | grep '^kge-' | tr '\\n' ' ')): the card window has not opened; not starting"; exit 4; }
w=0; while docker ps --format '{{.Names}}' | grep -q '^ktest-'; do w=$((w+1)); [ $w -gt 40 ] && { say "a ktest-* container ran through 40 checks 30 s apart: not starting"; exit 4; }; say "a ktest-* container runs; retry in 30 s"; sleep 30; done
`],
  [`  "python /w/rr/rerun_check.py run --tree /w/train --out /w/out > /w/out/run.log 2>&1; echo \\$? > /w/out/rc" \\
  >/dev/null 2>>"$LOG" || { say "docker run failed"; exit 4; }
`, `  "$(rg_wrap "python /w/rr/rerun_check.py run --tree /w/train --out /w/out > /w/out/run.log 2>&1; echo \\$? > /w/out/rc")" \\
  >/dev/null 2>>"$LOG" || { say "docker run failed"; exit 4; }
o=$(rg_others '^(kge|ktest)-' $NAME); [ -z "$o" ] && break
docker rm -f $NAME >/dev/null 2>&1; tries=$((tries+1))
[ $tries -ge 10 ] && { say "$o ran as well after each of 10 starts: not starting"; exit 4; }
b=$(rg_backoff); say "$o runs as well after the start; $NAME removed before its release (it ran nothing); retry in $b s"; sleep $b
done
rg_release $NAME || { say "release of $NAME failed"; docker rm -f $NAME >/dev/null 2>&1; exit 4; }
`]]);
// ---- end_of_run.sh (no retry: a collision is exit 11, as its other "containers running" stops)
patch('orchestrator/end_of_run.sh', [
  [`AL=assemble-$STAMP; AC=assemble_checks-$STAMP
`, `AL=assemble-$STAMP; AC=assemble_checks-$STAMP
# the start race (round r58c, after the 2026-11-14 reset): the container waits for /tmp/go (at most 120 s, then exit
# 97) and is released only when no other kge-*/ktest-* runs after its start; otherwise it is removed unreleased (exit 11)
eor_wrap() { printf 'eor_n=0; until [ -f /tmp/go ]; do eor_n=$((eor_n+1)); [ $eor_n -gt 120 ] && exit 97; sleep 1; done; %s' "$1"; }
`],
  [`  sh -c "python stageB.py assemble > /w/eor/$AL.log 2>&1; echo \\$? > /w/eor/$AL.rc; if [ \\"\\$(cat /w/eor/$AL.rc)\\" = 0 ]; then python /w/orchestrator/assemble_checks.py --train /w/train --plan /w/train/stageB/plan.json --report /w/eor/$AC.json > /w/eor/$AC.log 2>&1; echo \\$? > /w/eor/$AC.rc; fi" >/dev/null \\
  || fail 41 "docker run of $NAME failed"
`, `  sh -c "$(eor_wrap "python stageB.py assemble > /w/eor/$AL.log 2>&1; echo \\$? > /w/eor/$AL.rc; if [ \\"\\$(cat /w/eor/$AL.rc)\\" = 0 ]; then python /w/orchestrator/assemble_checks.py --train /w/train --plan /w/train/stageB/plan.json --report /w/eor/$AC.json > /w/eor/$AC.log 2>&1; echo \\$? > /w/eor/$AC.rc; fi")" >/dev/null \\
  || fail 41 "docker run of $NAME failed"
others=$(\${EOR_DOCKER_PS:-docker} ps --format '{{.Names}}' | tr -d '\\r' | grep -E '^(kge-|ktest-)' | grep -vx "$NAME" | tr '\\n' ' ')
[ -z "$others" ] || { docker rm -f $NAME >/dev/null 2>&1; fail 11 "containers running after the start of $NAME ($NAME removed before its release): $others"; }
docker exec $NAME touch /tmp/go >/dev/null 2>&1 || { docker rm -f $NAME >/dev/null 2>&1; fail 41 "release of $NAME failed"; }
`]]);
// ---- kt_inner.sh (ruling 93 lifts ruling 92's keep-outputs-small request)
patch('r58c/B/tests/kt_inner.sh', [
  [`# ruling 92 (disk): each test's log is kept in $LOGS; its scratch output is deleted once every test has run
# (test_write_audit_claims reads test_write_result's output, so nothing goes before the end); KEEP_OUT=1 keeps it
if [ "\${KEEP_OUT:-0}" != 1 ]; then`,
   `# ruling 93 withdrew ruling 92: scratch output is kept by default; DROP_OUT=1 deletes it once every test has run
# (test_write_audit_claims reads test_write_result's output, so nothing goes before the end); logs are always kept
if [ "\${DROP_OUT:-0}" = 1 ]; then`]]);
