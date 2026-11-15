// agent B, r58c (coordinator, END-ORDER review of 1cdcb6e7, item 1): every launcher takes ONE memgate sample before
// `memgate.sh wait` and stops with a named code (MEMGATE_EMPTY) when it is empty or not two numbers, instead of
// waiting forever (a shell that cannot run PowerShell samples nothing). ktest.sh, lane_step.sh, rerun_check.sh: exit
// 9; end_of_run.sh: exit 14. Run from LANE.
const fs = require('fs');
function patch(P, pairs) {
  let s = fs.readFileSync(P, 'utf8');
  for (const [a, b] of pairs) { if (s.split(a).length !== 2) throw new Error(P + ': not exactly once: ' + a.slice(0, 90)); s = s.replace(a, () => b); }
  fs.writeFileSync(P, s); console.log('patched', P);
}
const HINT = 'run the launcher from a shell where orchestrator/memgate.sh sample prints two numbers';
fs.appendFileSync('r58c/B/race_gate.sh', `# rg_sample_ok <memgate.sh>: ONE sample before \`memgate.sh wait\` must print two non-negative integers; else it
# prints what it got and returns 1, and the launcher stops with MEMGATE_EMPTY (exit 9) instead of waiting forever (a
# shell that cannot run PowerShell, such as a sandboxed one, samples nothing). Test: r58c/B/tests/test_memgate_empty.sh.
rg_sample_ok() { rg_s=$(sh "$1" sample 2>/dev/null | tr -d '\\r'); set -- $rg_s
  if [ $# -eq 2 ]; then case "$1$2" in *[!0-9]*) ;; *) return 0 ;; esac; fi
  echo "memgate.sh sample printed \\"$rg_s\\", not two numbers"; return 1; }
`);
patch('r58c/B/ktest.sh', [
  [`say "$NAME: memgate wait"; sh $WB/orchestrator/memgate.sh wait;`,
   `m=$(rg_sample_ok $WB/orchestrator/memgate.sh) || { say "$NAME: MEMGATE_EMPTY: $m; not started (${HINT})"; exit 9; }
say "$NAME: memgate wait"; sh $WB/orchestrator/memgate.sh wait;`],
  [`# usage: sh ktest.sh ktest-bN`, `# Exit: 2 usage; 3 docker run or release failed; 9 MEMGATE_EMPTY (one sample before memgate.sh wait was not two numbers).
# usage: sh ktest.sh ktest-bN`]]);
patch('r58c/B/lane_step.sh', [
  [`sh $WB/orchestrator/memgate.sh wait\n`,
   `m=$(rg_sample_ok $WB/orchestrator/memgate.sh) || { say "$NAME: MEMGATE_EMPTY: $m; not started (${HINT})"; exit 9; }
sh $WB/orchestrator/memgate.sh wait\n`],
  [`# 4 not started; 5 the freeze check failed; 6 over the limit.`, `# 4 not started; 5 the freeze check failed; 6 over the limit; 9 MEMGATE_EMPTY (one sample before memgate.sh wait
# was not two numbers).`]]);
patch('r58c/B/rerun_check.sh', [
  [`say "memgate wait"; sh $WB/orchestrator/memgate.sh wait\n`,
   `m=$(rg_sample_ok $WB/orchestrator/memgate.sh) || { say "MEMGATE_EMPTY: $m; not started (${HINT})"; exit 9; }
say "memgate wait"; sh $WB/orchestrator/memgate.sh wait\n`],
  [`# mismatch, 3 an error) or 4 not started / stopped.`, `# mismatch, 3 an error) or 4 not started / stopped, or 9 MEMGATE_EMPTY (one sample before memgate.sh wait was
# not two numbers).`]]);
patch('orchestrator/end_of_run.sh', [
  [`t=0; until mem_ok; do`,
   `ms=$(sh $REAL/orchestrator/memgate.sh sample 2>/dev/null | tr -d '\\r'); set -- $ms  # one sample first: MEMGATE_EMPTY
{ [ $# -eq 2 ] && case "$1$2" in *[!0-9]*) false ;; *) true ;; esac; } || fail 14 "MEMGATE_EMPTY: memgate.sh sample printed \\"$ms\\", not two numbers (run end_of_run.sh from a shell where it prints two numbers)"
t=0; until mem_ok; do`],
  [`#   4  only once the memgate start rule holds (three samples 30 s apart: free >= 6 GB and commit < 40 GB; up to
#      EOR_MEM_TRIES tries, else stop) and still no kge-*/ktest-* runs,`,
   `#   4  one memgate sample first: empty or not two numbers -> exit 14 MEMGATE_EMPTY (no waiting); then only once the
#      memgate start rule holds (three samples 30 s apart: free >= 6 GB and commit < 40 GB; up to
#      EOR_MEM_TRIES tries, else stop) and still no kge-*/ktest-* runs,`]]);
