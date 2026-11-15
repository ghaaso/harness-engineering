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
// the steps of END-ORDER 4-6 and 8-9: the lane's code and tables, the comparators, the RUNLOG's PASS logs
const BASE = [L('train'), L('eval'), L('orchestrator'), L('progress.jsonl'), L('r58c/A/logs'), L('r58c/B/out/logs')];
const DELIV = rw(REPO + '/' + G2 + '/embeddings', '/repo/' + G2 + '/embeddings');
const PROTO = ro(REPO + '/' + G2 + '/protocol-addendum-8.md', '/repo/' + G2 + '/protocol-addendum-8.md');
const EXPORT_PINS = ['export/checkpoints.py', 'export/parents.jsonl', 'export/parents_git.jsonl'].map(L);
const COMMON_JS = fs.readdirSync(GB + '/arms/common').filter((f) => f.endsWith('.js')).sort()
  .map((f) => ro(GB + '/arms/common/' + f, '/build/arms/common/' + f));
const M = {
  _about: 'ruling 94(d): the fixed mount list of every container of agent B\'s launchers (r58c/B/lane_step.sh, ' +
    'r58c/B/rerun_check.sh), read by r58c/B/mounts.js only; agent A\'s containers are in r58c/A/mounts-A.json. ' +
    'Nothing else is mounted. No step before r10 mounts the repository or the whole facts cache (ruling 94(a)); ' +
    'export/ only where a step reads graphs (r2, r5, kge-R1; ruling 94(f) with ruling 89).',
  'ktest-r1': { step: '4 selectB', allow: [...BASE, LW('train/selectB')] },
  'ktest-r2': { step: '4 report', allow: [...BASE, L('export'), LW('train/report')] },
  'ktest-r3': { step: '6 item27', allow: [...BASE, ...EXPORT_PINS, TASKS, PRIM, ...COMMON_JS, LW('train/heldout')] },
  'ktest-r4': { step: '5 answer_level tune', allow: [...BASE, ro(W + '/tune_inputs/facts', '/build/facts/cache'),
    ro(W + '/tune_inputs/common', '/build/arms/common'), TASKS, PRIM, LW('train/report/answer_level')] },
  'ktest-r5': { step: '9.2 item22', allow: [L('train'), L('eval'), L('export'), LW('train/report')] },
  'ktest-r6': { step: '9.3 write_result', allow: [...BASE, L('grader-returns'), DELIV, PROTO] },
  'ktest-r7': { step: '9.4 write_audit_claims', allow: [...BASE, L('grader-returns'), L('r58c/write_audit_claims.py'),
    L('export/checkpoints.py'), TASKS, L('r58c/rehearsal'), L('heldout-launch'), L('r58c/B/out/rehearsal'),
    L('r58c/B/logs'), L('r58c/mounts'), L('r58c/B/mounts-B.json'), L('r58c/A/mounts-A.json'), DELIV, PROTO] },
  // r7 reads section 9's evidence (ruling 86(b), 94(e)): the 2b and 2e rehearsals, both mount lists and every record
  'ktest-r8': { step: '5 pre-check of the tuning hand-off', allow: [...BASE, L('r58c/A/precheck_handoff.py')] },
  'ktest-r9': { step: '8 pre-check of the held-out hand-off', allow: [...BASE, L('r58c/A/precheck_handoff.py')] },
  'ktest-r10': { step: '9.1 leak audit (after the held-out return)', allow: [ro(W, '/w'), ro(REPO, '/repo'),
    ro(GB + '/facts/cache', '/build/facts/cache'), TASKS, ro(GB + '/results/frozen/relational', '/build/results/frozen/relational'),
    ro(GB + '/arms/common', '/build/arms/common'), LW('train/leak_audit')] },
  'kge-R1': { step: '2c re-run check', allow: [L('export'), L('eval'), L('train'), L('orchestrator'),
    ro(W + '/r58c/B/rerun', '/w/rr'), rw(W + '/r58c/B/rerun-out/<STAMP>', '/w/out')] },
};
fs.writeFileSync(W + '/r58c/B/mounts-B.json', JSON.stringify(M, null, 1) + '\n');
console.log('wrote r58c/B/mounts-B.json');
