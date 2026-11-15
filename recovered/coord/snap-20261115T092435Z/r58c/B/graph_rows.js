'use strict';
// r58c/B/graph_rows.js (agent B, round 8; rulings 101 (a) and 102): the ONE generator of the graph-folder mount rows of
// ktest-r4 (the tuning hand-off), ktest-r8 (its pre-check) and ktest-r9 (the pre-check of the held-out hand-off).
// One read-only row per parent folder, export/graphs/<P> -> /w/export/graphs/<P>, for the parents the step concerns and no
// others; never export/ or export/graphs whole. The parent sets come from the PLAN, never from a hand-off:
//   late50   the late-50 tuning parents: the `parent` of every eval/tune_commits.jsonl row with late50 true (50 commits,
//            38 parents), each of which must be a key of plan.json `assignment` (the tuning parents); the same rule as
//            train/heldout_inputs.js lateTuneParents                                       -> ktest-r4, ktest-r8
//   heldout  the keys of plan.json `heldout.assignment` (70 parents)                        -> ktest-r9 (with tasks.jsonl)
//   pick8    TEST ONLY: the parents of the late-50 commits sorted by date_order at positions 0, 6, ..., 42 (the rule of
//            train/answer_level.py test_set_ids('pick8')): the TEST held-out hand-off's set
// usage: node graph_rows.js parents <set> [--plan P]       one parent per line
//        node graph_rows.js rows <set> [--plan P]          the rows as JSON
//        node graph_rows.js write [--plan P]               rewrites the graph rows of ktest-r4, r8, r9 in r58c/B/mounts-B.json
//                                                          (every other row and entry unchanged; r9 also gets tasks.jsonl)
//        node graph_rows.js test-file <set> <out> [--plan P]  a TEST mounts file: the three entries of mounts-B.json with
//                                                          their graph rows replaced by <set>'s, marked "_test": "<set>"
// --plan defaults to LANE/train/stageB/plan.json (tests pass r58c/B/frozen/plan.json, the frozen copy).
const fs = require('fs');
const path = require('path');
const W = 'C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings';
const GB = 'C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/build';
const LANE = process.env.GR_LANE || W;  // tests point this at a fake lane
const PICK8_POSITIONS = [0, 6, 12, 18, 24, 30, 36, 42];
const STEPS = { 'ktest-r4': 'late50', 'ktest-r8': 'late50', 'ktest-r9': 'heldout' };
const TASKS = { src: GB + '/tasks/tasks.jsonl', dst: '/build/tasks/tasks.jsonl', mode: 'ro' };
const die = (c, m) => { console.error('graph_rows: ' + m); process.exit(c); };
const isGraphRow = (m) => m.dst.startsWith('/w/export/graphs/') || m.dst === '/w/export/graphs' || m.dst === '/w/export';

function parents(set, plan) {
  const P = JSON.parse(fs.readFileSync(plan, 'utf8'));
  if (set === 'heldout') {
    const hp = Object.keys((P.heldout || {}).assignment || {}).sort();
    if (!hp.length) die(3, plan + ' has no heldout.assignment');
    return hp;
  }
  if (set !== 'late50' && set !== 'pick8') die(2, 'set must be late50, heldout or pick8');
  const late = fs.readFileSync(path.join(LANE, 'eval', 'tune_commits.jsonl'), 'utf8').split('\n').map((l) => l.trim()).filter(Boolean)
    .map((l) => JSON.parse(l)).filter((c) => c.late50 === true).sort((a, b) => a.date_order - b.date_order);
  if (late.length !== 50) die(3, 'eval/tune_commits.jsonl has ' + late.length + ' late-50 commits, not 50');
  const pick = set === 'late50' ? late : PICK8_POSITIONS.map((i) => late[i]);
  const ps = [...new Set(pick.map((c) => c.parent))].sort();
  const odd = ps.filter((p) => !(p in (P.assignment || {})));
  if (odd.length) die(3, odd.length + ' parent(s) not tuning parents of the plan, e.g. ' + odd[0]);
  return ps;
}
const rows = (set, plan) => parents(set, plan).map((p) => ({ src: W + '/export/graphs/' + p, dst: '/w/export/graphs/' + p, mode: 'ro' }));
function replaced(entry, set, plan, name) {
  const keep = entry.allow.filter((m) => !isGraphRow(m));
  const tasks = name === 'ktest-r9' && !keep.some((m) => m.dst === TASKS.dst) ? [TASKS] : [];  // ruling 102: r9 reads the task list
  return { ...entry, allow: [...keep, ...tasks, ...rows(set, plan)] };
}

const a = process.argv.slice(2); const cmd = a[0];
const pi = a.indexOf('--plan'); const plan = pi >= 0 ? a[pi + 1] : path.join(LANE, 'train', 'stageB', 'plan.json');
if (pi >= 0) a.splice(pi, 2);
if (cmd === 'parents') { console.log(parents(a[1], plan).join('\n')); process.exit(0); }
if (cmd === 'rows') { console.log(JSON.stringify(rows(a[1], plan), null, 1)); process.exit(0); }
const MB = path.join(LANE, 'r58c', 'B', 'mounts-B.json');
const J = JSON.parse(fs.readFileSync(MB, 'utf8'));
if (cmd === 'write') {
  for (const [n, set] of Object.entries(STEPS)) { if (!J[n]) die(3, n + ' missing in mounts-B.json'); J[n] = replaced(J[n], set, plan, n); }
  fs.writeFileSync(MB, JSON.stringify(J, null, 1) + '\n');
  console.log('graph rows: ' + Object.entries(STEPS).map(([n, s]) => n + ' ' + s + ' ' + J[n].allow.filter(isGraphRow).length).join(', '));
  process.exit(0);
}
if (cmd === 'test-file') {
  const set = a[1], out = a[2]; if (!out) die(2, 'test-file <set> <out>');
  const T = { _test: set };
  for (const n of Object.keys(STEPS)) T[n] = replaced(J[n], set, plan, n);
  fs.writeFileSync(out, JSON.stringify(T, null, 1) + '\n');
  console.log('test mounts file ' + out + ' (' + set + '): ' + Object.keys(STEPS).map((n) => n + ' ' + T[n].allow.filter(isGraphRow).length).join(', '));
  process.exit(0);
}
die(2, 'usage: node graph_rows.js parents|rows <set> | write | test-file <set> <out>   [--plan P]');
