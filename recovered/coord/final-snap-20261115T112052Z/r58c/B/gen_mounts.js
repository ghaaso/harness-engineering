'use strict';
// Writes r58c/B/mounts-B.json once (agent B, round r58c, ruling 94). The JSON file is the authority the launchers
// read; this script only produced it (it lists build/arms/common/*.js at the time it ran). Not a launcher.
// usage: node r58c/B/gen_mounts.js   (from LANE)
const fs = require('fs');
const W = 'C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings';
const GB = 'C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/build';
const REPO = 'C:/Users/User/Documents/projects/EMS_workshop1';
const G2 = 'docs/program/evidence/harness-bottlenecks/graph2';
const ro = (src, dst) => ({ src, dst, mode: 'ro' });
const rw = (src, dst) => ({ src, dst, mode: 'rw' });
const L = (p) => ro(W + '/' + p, '/w/' + p);
const LW = (p) => rw(W + '/' + p, '/w/' + p);
const PRIMARY = 'results/frozen/relational/95e990307da3b42b.json';
const TASKS = ro(GB + '/tasks/tasks.jsonl', '/build/tasks/tasks.jsonl');
const PRIM = ro(GB + '/' + PRIMARY, '/build/' + PRIMARY);
// the steps of END-ORDER 4-6 and 8-9: the lane's code and tables, the comparators, the RUNLOG's PASS logs. No step reads
// agent A's logs (r58c/A/logs), so none mounts them (ruling 94(d); round 4; r7's 2b/2e evidence is r58c/rehearsal/,
// heldout-launch/, r58c/B/out/rehearsal and r58c/B/out/logs). mounts-B.json is hand-edited since (ktest-r11): do not regenerate.
const BASE = [L('train'), L('eval'), L('orchestrator'), L('progress.jsonl'), L('r58c/B/out/logs')];
const DELIV = rw(REPO + '/' + G2 + '/embeddings', '/repo/' + G2 + '/embeddings');
const PROTO = ro(REPO + '/' + G2 + '/protocol-addendum-8.md', '/repo/' + G2 + '/protocol-addendum-8.md');
const EXPORT_PINS = ['export/checkpoints.py', 'export/parents.jsonl', 'export/parents_git.jsonl'].map(L);
const COMMON_JS = fs.readdirSync(GB + '/arms/common').filter((f) => f.endsWith('.js')).sort()
  .map((f) => ro(GB + '/arms/common/' + f, '/build/arms/common/' + f));
// ruling 94(d): the fixed mount list of every container of agent B's launchers (r58c/B/lane_step.sh,
// r58c/B/rerun_check.sh), read by r58c/B/mounts.js and by train/leak_audit.py (ruling94: every value a {step, allow}
// object, the step the bare END-ORDER id); agent A's containers are in r58c/A/mounts-A.json. Nothing else is mounted.
// No step before r10 mounts the repository or the whole facts cache (ruling 94(a)); export/ only where a step reads
// graphs (r2, r5, kge-R1; ruling 94(f) with ruling 89). "what" is a label only.
const E = (step, what, allow) => ({ step, what, allow });
// rulings 101 (a) and 102 (round 8): the graph-folder rows of r4, r8 (the late-50 tuning parents) and r9 (the 70 held-out
// parents) come from ONE generator, r58c/B/graph_rows.js, over the plan; `node graph_rows.js write` puts them into mounts-B.json
const GR = (set) => JSON.parse(require('child_process').execFileSync('node', [W + '/r58c/B/graph_rows.js', 'rows', set], { encoding: 'utf8' }));
const M = {
  'ktest-r1': E('4', 'selectB', [...BASE, LW('train/selectB')]),
  'ktest-r2': E('4', 'report', [...BASE, L('export'), LW('train/report')]),
  'ktest-r3': E('6', 'item27', [...BASE, ...EXPORT_PINS, TASKS, PRIM, ...COMMON_JS, L('grader-returns/tune-rank.json'), LW('train/heldout')]),  // C15: item27 checks the accepted line against it
  'ktest-r4': E('5', 'answer_level tune', [...BASE, ro(W + '/tune_inputs/facts', '/build/facts/cache'),
    ro(W + '/tune_inputs/common', '/build/arms/common'), TASKS, PRIM, LW('train/report/answer_level'), ...GR('late50')]),
  'ktest-r5': E('9.2', 'item22', [L('train'), L('eval'), L('export'), LW('train/report')]),
  'ktest-r6': E('9.3', 'write_result', [...BASE, L('grader-returns'), DELIV, PROTO]),
  // r7 reads section 9's evidence (ruling 86(b), 94(e)): the 2b and 2e rehearsals, both mount lists and every record
  'ktest-r7': E('9.4', 'write_audit_claims', [...BASE, L('grader-returns'), L('r58c/write_audit_claims.py'),
    L('export/checkpoints.py'), TASKS, L('r58c/rehearsal'), L('heldout-launch'), L('r58c/B/out/rehearsal'),
    L('r58c/B/logs'), L('r58c/mounts'), L('r58c/B/mounts-B.json'), L('r58c/A/mounts-A.json'), DELIV, PROTO]),
  'ktest-r8': E('5', 'pre-check of the tuning hand-off', [...BASE, L('r58c/A/precheck_handoff.py'), ...GR('late50')]),
  'ktest-r9': E('8', 'pre-check of the held-out hand-off', [...BASE, L('r58c/A/precheck_handoff.py'), TASKS, ...GR('heldout')]),
  // ruling 101 (e), round 8: the end-of-run container (orchestrator/end_of_run.sh), only what stageB.py assemble and
  // assemble_checks.py read; the tables and the log folder writable (mounts.js allows /w/train/stageB/tables for ktest-eor only)
  'ktest-eor': E('1', 'end-of-run: stageB.py assemble and assemble_checks.py (ruling 101 (e))', [...EXPORT_PINS, L('eval'), L('train'), LW('train/stageB/tables'),
    L('orchestrator/assemble_checks.py'), rw(W + '/orchestrator/end-of-run', '/w/eor')]),
  'ktest-r10': E('9.1', 'leak audit (after the held-out return)', [ro(W, '/w'), ro(REPO, '/repo'),
    ro(GB + '/facts/cache', '/build/facts/cache'), TASKS, ro(GB + '/results/frozen/relational', '/build/results/frozen/relational'),
    ro(GB + '/arms/common', '/build/arms/common'), LW('train/leak_audit')]),
  // the scratch parent, writable; the run works in /w/rerun-out/<STAMP> (no token in a src: leak_audit knows {ARM} only)
  'kge-R1': E('2c', 're-run check', [L('export'), L('eval'), L('train'), L('orchestrator'),
    ro(W + '/r58c/B/rerun', '/w/rr'), rw(W + '/r58c/B/rerun-out', '/w/rerun-out')]),
};
fs.writeFileSync(W + '/r58c/B/mounts-B.json', JSON.stringify(M, null, 1) + '\n');
console.log('wrote r58c/B/mounts-B.json');
