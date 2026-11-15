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
//        node graph_rows.js test-file <out> [--plan P]     a TEST mounts file (ruling 103(b), round 8), marked "_test": "r103";
//          it differs from the real entries of mounts-B.json ONLY in these rows:
//            ktest-r4  the real writable row(s) dropped (train/report/answer_level); added: agent A's fake stage
//                      r58c/A/out/fakestage read-only and ONE writable test folder r58c/B/out/r4test (outside every real
//                      output folder; made by hand before the run, never by a test path); the 38 late-50 graph rows as real
//            ktest-r8  added: the test hand-off r58c/handoff-test/tune-late50 read-only
//            ktest-r9  the 70 held-out graph rows replaced by 70 TUNING rows (export/graphs/<P> for the 53 tuning parents
//                      of plan.json `assignment`, and export/graphs0/<P> for the first 17 of them in sorted order), so the
//                      test line has the real line's row count and about its length; added: the test hand-off
//                      r58c/handoff-test/heldout read-only
//          Refused (exit 3): a row of a held-out parent's folder, or a writable row anywhere but r58c/B/out/r4test.
//        node graph_rows.js diff <real mounts> <test mounts> <name>   the TEST entry against the real one, row by row:
//          "= src -> dst (mode)" in both, "+ ..." TEST only, "- ..." real only, then a count line (lane_step.sh logs it)
//   (sets: late50, heldout, pick8 as above; tuning = the 53 keys of plan.json `assignment`)
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
const isGraphRow = (m) => m.dst.startsWith('/w/export/graphs/') || m.dst.startsWith('/w/export/graphs0/') || m.dst === '/w/export/graphs' || m.dst === '/w/export';

function parents(set, plan) {
  const P = JSON.parse(fs.readFileSync(plan, 'utf8'));
  if (set === 'heldout') {
    const hp = Object.keys((P.heldout || {}).assignment || {}).sort();
    if (!hp.length) die(3, plan + ' has no heldout.assignment');
    return hp;
  }
  if (set === 'tuning') {
    const tp = Object.keys(P.assignment || {}).sort(), hp = new Set(Object.keys((P.heldout || {}).assignment || {}));
    if (!tp.length) die(3, plan + ' has no assignment');
    if (tp.some((p) => hp.has(p))) die(3, 'a tuning parent is also a held-out parent');
    return tp;
  }
  if (set !== 'late50' && set !== 'pick8') die(2, 'set must be late50, heldout, pick8 or tuning');
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
if (cmd === 'diff') {  // ruling 103(b): the TEST entry against the real entry, row by row
  const [, rf, tf, n] = a; if (!n) die(2, 'diff <real mounts> <test mounts> <name>');
  const R = JSON.parse(fs.readFileSync(rf, 'utf8'))[n], T = JSON.parse(fs.readFileSync(tf, 'utf8'))[n];
  if (!R || !T) die(2, n + ' missing in ' + (R ? tf : rf));
  const key = (m) => m.src + ' -> ' + m.dst + ' (' + m.mode + ')';
  const rk = R.allow.map(key), tk = T.allow.map(key), rs = new Set(rk), ts = new Set(tk);
  const same = tk.filter((k) => rs.has(k)), plus = tk.filter((k) => !rs.has(k)), minus = rk.filter((k) => !ts.has(k));
  for (const k of same) console.log('= ' + k);
  for (const k of plus) console.log('+ ' + k + '   [TEST only]');
  for (const k of minus) console.log('- ' + k + '   [real only]');
  console.log(n + ': TEST ' + tk.length + ' rows, real ' + rk.length + ' rows; ' + same.length + ' the same, ' + plus.length + ' TEST only, ' + minus.length + ' real only');
  process.exit(0);
}
const MB = path.join(LANE, 'r58c', 'B', 'mounts-B.json');
const J = JSON.parse(fs.readFileSync(MB, 'utf8'));
if (cmd === 'write') {
  for (const [n, set] of Object.entries(STEPS)) { if (!J[n]) die(3, n + ' missing in mounts-B.json'); J[n] = replaced(J[n], set, plan, n); }
  fs.writeFileSync(MB, JSON.stringify(J, null, 1) + '\n');
  console.log('graph rows: ' + Object.entries(STEPS).map(([n, s]) => n + ' ' + s + ' ' + J[n].allow.filter(isGraphRow).length).join(', '));
  process.exit(0);
}
if (cmd === 'test-file') {  // ruling 103(b)
  const out = a[1]; if (!out || a.length !== 2) die(2, 'test-file <out> (ruling 103(b); the old form test-file <set> <out> is gone)');
  const R4TEST = { src: W + '/r58c/B/out/r4test', dst: '/w/r58c/B/out/r4test', mode: 'rw' };
  const FAKE = { src: W + '/r58c/A/out/fakestage', dst: '/w/r58c/A/out/fakestage', mode: 'ro' };
  const HO = (d) => ({ src: W + '/r58c/handoff-test/' + d, dst: '/w/r58c/handoff-test/' + d, mode: 'ro' });
  const T = { _test: 'r103' };
  T['ktest-r4'] = { ...J['ktest-r4'], allow: [...J['ktest-r4'].allow.filter((m) => m.mode !== 'rw'), FAKE, R4TEST] };
  T['ktest-r8'] = { ...J['ktest-r8'], allow: [...J['ktest-r8'].allow, HO('tune-late50')] };
  const tp = parents('tuning', plan);
  const g70 = [...tp.map((p) => ({ src: W + '/export/graphs/' + p, dst: '/w/export/graphs/' + p, mode: 'ro' })),
    ...tp.slice(0, 17).map((p) => ({ src: W + '/export/graphs0/' + p, dst: '/w/export/graphs0/' + p, mode: 'ro' }))];
  T['ktest-r9'] = { ...J['ktest-r9'], allow: [...J['ktest-r9'].allow.filter((m) => !isGraphRow(m)), ...g70, HO('heldout')] };
  const hp = parents('heldout', plan), bad = [];
  for (const n of Object.keys(STEPS)) for (const m of T[n].allow) {
    const seg = m.src.split('/');
    if (hp.some((p) => seg.includes(p))) bad.push(n + ': ' + m.src + " is a held-out parent's folder");
    if (m.mode === 'rw' && !(n === 'ktest-r4' && m.src === R4TEST.src)) bad.push(n + ': ' + m.src + ' is writable');
  }
  if (bad.length) die(3, 'TEST file refused: ' + bad.join('; '));
  fs.writeFileSync(out, JSON.stringify(T, null, 1) + '\n');
  console.log('test mounts file ' + out + ' (ruling 103(b)): ' + Object.keys(STEPS).map((n) => n + ' ' + T[n].allow.length + ' rows (' + T[n].allow.filter(isGraphRow).length + ' graph)').join(', '));
  process.exit(0);
}
die(2, 'usage: node graph_rows.js parents|rows <set> | write | test-file <out> | diff <real> <test> <name>   [--plan P]');
