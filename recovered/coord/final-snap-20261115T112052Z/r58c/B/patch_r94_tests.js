// agent B, round r58c, ruling 94: the host tests of the launchers give each lane copy its own mounts file and the
// reader, and call the new two-argument lane_step.sh. Run once from LANE: node r58c/B/patch_r94_tests.js
const fs = require('fs');
function patch(p, pairs) { let s = fs.readFileSync(p, 'utf8'); for (const [a, b] of pairs) { if (!s.includes(a)) throw new Error(p + ': no match: ' + a.slice(0, 70)); s = s.split(a).join(b); } fs.writeFileSync(p, s); console.log('patched', p); }
// a lane copy's own mounts file (only the copy's folders) and r58c/B/mounts.js, written by mk() after the scripts
const MK = `  cp $WB/r58c/B/mounts.js $d/r58c/B/mounts.js  # ruling 94: the copy's launchers read the copy's own mounts file
  printf '{"ktest-r99": {"step": "test", "allow": [{"src": "%s/r58c", "dst": "/w/r58c", "mode": "ro"}]},\\n "kge-R1": {"step": "test", "allow": [{"src": "%s/orchestrator", "dst": "/w/orchestrator", "mode": "ro"}, {"src": "%s/r58c/B/rerun-out/<STAMP>", "dst": "/w/out", "mode": "rw"}]}}\\n' "$DW" "$DW" "$DW" > $d/r58c/B/mounts-B.json
`;
patch('r58c/B/tests/test_race_gate.sh', [
  [`  cp $WB/r58c/B/race_gate.sh $d/r58c/B/race_gate.sh\n`, `  cp $WB/r58c/B/race_gate.sh $d/r58c/B/race_gate.sh\n` + MK],
  [`    rc=$(go $b-after-race $s 1 ktest-r99 x "echo hi"); e=$(ev $b-after-race)`, `    rc=$(go $b-after-race $s 1 ktest-r99 "echo hi"); e=$(ev $b-after-race)`],
  [`  if [ $s = lane_step.sh ]; then rc=$(go $b-after-alone $s 0 ktest-r99 x "echo hi")`, `  if [ $s = lane_step.sh ]; then rc=$(go $b-after-alone $s 0 ktest-r99 "echo hi")`],
  [`# usage: sh r58c/B/tests/test_race_gate.sh`, `# Round r58c, ruling 94: every copy gets its own mounts-B.json (its own folders only) and mounts.js; the after bytes of\n# lane_step.sh take two arguments (name, command), the before bytes three.\n# usage: sh r58c/B/tests/test_race_gate.sh`],
]);
patch('r58c/B/tests/test_memgate_empty.sh', [
  [`  cp $2/race_gate.sh $d/r58c/B/race_gate.sh\n`, `  cp $2/race_gate.sh $d/r58c/B/race_gate.sh\n` + MK],
  [`    lane_step.sh) ( sh $RT/$c/r58c/B/$s ktest-r99 x "echo hi" > $RT/$c/out.txt 2>&1 ); echo $? ;;`,
   `    lane_step.sh) case $c in *-before) set -- ktest-r99 x "echo hi" ;; *) set -- ktest-r99 "echo hi" ;; esac  # ruling 94: two arguments after\n      ( sh $RT/$c/r58c/B/$s "$@" > $RT/$c/out.txt 2>&1 ); echo $? ;;`],
]);
