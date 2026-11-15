// agent B, round r58c, ruling 94 (second pass): align r58c/B/mounts-B.json and the record names with agent A's
// train/leak_audit.py reader (ruling94(), load_allows, r94_in_scope, split_mounts):
//   1. every value of the mounts file is a {step, allow} object (no "_about" string: is_allow_file() would read the
//      whole file as an inspect record); the step is the bare END-ORDER id ("4", "2c", "9.1"), which r94_in_scope()
//      matches in full (a step "4 selectB" is out of scope, so its mounts would never be audited); the label moves to
//      a "what" key that both readers ignore;
//   2. no <STAMP> token in a src (_r94_pat() knows {ARM} only): kge-R1 mounts the scratch parent r58c/B/rerun-out
//      writable at /w/rerun-out and works in /w/rerun-out/<STAMP>;
//   3. an older record of the same container is kept as r58c/mounts/<name>.<UTC of the old record>.json (the audit reads
//      every *.json of the folder, so a failed earlier start is audited too), not <name>.json.prev-<stamp>.
// Run once from LANE: node r58c/B/patch_r94b.js
const fs = require('fs');
function patch(p, pairs) { let s = fs.readFileSync(p, 'utf8'); for (const [a, b] of pairs) { if (!s.includes(a)) throw new Error(p + ': no match: ' + a.slice(0, 80)); s = s.split(a).join(b); } fs.writeFileSync(p, s); console.log('patched', p); }

// 1 + 2: gen_mounts.js
{
  const p = 'r58c/B/gen_mounts.js'; let s = fs.readFileSync(p, 'utf8');
  const i = s.indexOf('const M = {'), j = s.indexOf('\n};', i);
  if (i < 0 || j < 0) throw new Error('gen_mounts: no object');
  const NEW = `// ruling 94(d): the fixed mount list of every container of agent B's launchers (r58c/B/lane_step.sh,
// r58c/B/rerun_check.sh), read by r58c/B/mounts.js and by train/leak_audit.py (ruling94: every value a {step, allow}
// object, the step the bare END-ORDER id); agent A's containers are in r58c/A/mounts-A.json. Nothing else is mounted.
// No step before r10 mounts the repository or the whole facts cache (ruling 94(a)); export/ only where a step reads
// graphs (r2, r5, kge-R1; ruling 94(f) with ruling 89). "what" is a label only.
const E = (step, what, allow) => ({ step, what, allow });
const M = {
  'ktest-r1': E('4', 'selectB', [...BASE, LW('train/selectB')]),
  'ktest-r2': E('4', 'report', [...BASE, L('export'), LW('train/report')]),
  'ktest-r3': E('6', 'item27', [...BASE, ...EXPORT_PINS, TASKS, PRIM, ...COMMON_JS, LW('train/heldout')]),
  'ktest-r4': E('5', 'answer_level tune', [...BASE, ro(W + '/tune_inputs/facts', '/build/facts/cache'),
    ro(W + '/tune_inputs/common', '/build/arms/common'), TASKS, PRIM, LW('train/report/answer_level')]),
  'ktest-r5': E('9.2', 'item22', [L('train'), L('eval'), L('export'), LW('train/report')]),
  'ktest-r6': E('9.3', 'write_result', [...BASE, L('grader-returns'), DELIV, PROTO]),
  // r7 reads section 9's evidence (ruling 86(b), 94(e)): the 2b and 2e rehearsals, both mount lists and every record
  'ktest-r7': E('9.4', 'write_audit_claims', [...BASE, L('grader-returns'), L('r58c/write_audit_claims.py'),
    L('export/checkpoints.py'), TASKS, L('r58c/rehearsal'), L('heldout-launch'), L('r58c/B/out/rehearsal'),
    L('r58c/B/logs'), L('r58c/mounts'), L('r58c/B/mounts-B.json'), L('r58c/A/mounts-A.json'), DELIV, PROTO]),
  'ktest-r8': E('5', 'pre-check of the tuning hand-off', [...BASE, L('r58c/A/precheck_handoff.py')]),
  'ktest-r9': E('8', 'pre-check of the held-out hand-off', [...BASE, L('r58c/A/precheck_handoff.py')]),
  'ktest-r10': E('9.1', 'leak audit (after the held-out return)', [ro(W, '/w'), ro(REPO, '/repo'),
    ro(GB + '/facts/cache', '/build/facts/cache'), TASKS, ro(GB + '/results/frozen/relational', '/build/results/frozen/relational'),
    ro(GB + '/arms/common', '/build/arms/common'), LW('train/leak_audit')]),
  // the scratch parent, writable; the run works in /w/rerun-out/<STAMP> (no token in a src: leak_audit knows {ARM} only)
  'kge-R1': E('2c', 're-run check', [L('export'), L('eval'), L('train'), L('orchestrator'),
    ro(W + '/r58c/B/rerun', '/w/rr'), rw(W + '/r58c/B/rerun-out', '/w/rerun-out')]),`;
  s = s.slice(0, i) + NEW + s.slice(j);
  fs.writeFileSync(p, s); console.log('patched', p);
}

// 2 + 3: rerun_check.sh
patch('r58c/B/rerun_check.sh', [
  ['$MOUNTS -w /w/out "$IMGID" sh -c', '$MOUNTS -w /w/rerun-out/$STAMP "$IMGID" sh -c'],
  ['"$(rg_wrap "python /w/rr/rerun_check.py run --tree /w/train --out /w/out > /w/out/run.log 2>&1; echo \\$? > /w/out/rc")"',
   '"$(rg_wrap "python /w/rr/rerun_check.py run --tree /w/train --out /w/rerun-out/$STAMP > /w/rerun-out/$STAMP/run.log 2>&1; echo \\$? > /w/rerun-out/$STAMP/rc")"'],
  ['[ -f "$MR" ] && mv "$MR" "$MR.prev-$STAMP"', '[ -f "$MR" ] && mv "$MR" "$WB/r58c/mounts/$NAME.$(date -u -r "$MR" +%Y%m%dT%H%M%SZ).json"'],
  ['an older one is kept as kge-R1.json.prev-<stamp>).', 'an older one is kept as kge-R1.<UTC of that record>.json; the\n# leak audit reads every *.json there). kge-R1 mounts the scratch parent r58c/B/rerun-out writable at /w/rerun-out and\n# works in /w/rerun-out/<STAMP> (r58c/B/mounts-B.json holds no token: leak_audit.py matches {ARM} only).'],
]);
// 3: lane_step.sh
patch('r58c/B/lane_step.sh', [
  ['[ -f "$MR" ] && mv "$MR" "$MR.prev-$STAMP"', '[ -f "$MR" ] && mv "$MR" "$WB/r58c/mounts/$NAME.$(date -u -r "$MR" +%Y%m%dT%H%M%SZ).json"'],
  ['kept as <name>.json.prev-<stamp>); the leak audit reads it.', 'kept as <name>.<UTC of that record>.json); the leak audit reads every *.json there.'],
]);
// 3: write_audit_claims.py section 9's earlier records
patch('r58c/write_audit_claims.py', [
  ["if '.prev-' in f]", "if re.match(r'^.+\\.[0-9]{8}T[0-9]{6}Z\\.json$', f)]"],
]);
patch('r58c/B/tests/test_write_audit_claims.py', [
  ["put('r58c/mounts/ktest-r1.json.prev-20261115T000000Z', '[]')", "put('r58c/mounts/ktest-r1.20261115T000000Z.json', '[]')"],
  ["'.prev-20261115T000000Z' in s9", "'r58c/mounts/ktest-r1.20261115T000000Z.json' in s9"],
]);
// the host tests' lane copies: kge-R1's fake entry mirrors the real one (scratch parent, no token)
const OLDF = '{"src": "%s/r58c/B/rerun-out/<STAMP>", "dst": "/w/out", "mode": "rw"}';
const NEWF = '{"src": "%s/r58c/B/rerun-out", "dst": "/w/rerun-out", "mode": "rw"}';
patch('r58c/B/tests/test_memgate_empty.sh', [[OLDF, NEWF]]);
patch('r58c/B/tests/test_race_gate.sh', [[OLDF, NEWF],
  ['"-v $CW/orchestrator:/w/orchestrator:ro -v $CW/r58c/B/rerun-out/"', '"-v $CW/orchestrator:/w/orchestrator:ro -v $CW/r58c/B/rerun-out:/w/rerun-out -w /w/rerun-out/2"'],
]);
