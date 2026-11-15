'use strict';
// Held-out inputs exist (lock lane, item g). Reads only inputs: held-out task lines of tasks/tasks.jsonl
// (seeds, parents, remove_paths) and facts/cache/<parent>/meta.json and nodes.jsonl; plus read-only git
// object reads of the repository. Runs no arm. Writes tmp/lock/inputs_check.json.
//   node tmp/lock/inputs_check.js
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const B = path.resolve(__dirname, '..', '..');
const REPO = process.env.GT_REPO || 'C:/Users/User/Documents/projects/EMS_workshop1';
const EXTRACTOR = '59da7b753a4d908e';
const EXPECT = { T1: 418, T1x: 82, T2: 237, T3: 25, T4: 8 };
const all = fs.readFileSync(path.join(B, 'tasks', 'tasks.jsonl'), 'utf8').split('\n').filter(Boolean).map(JSON.parse);
const ho = all.filter((t) => t.split === 'heldout');
const inTree = (sha, p) => { try { execFileSync('git', ['-C', REPO, 'cat-file', '-e', sha + ':' + p], { stdio: 'ignore' }); return true; } catch (e) { return false; } };
const blobType = (sha, p) => { try { return execFileSync('git', ['-C', REPO, 'cat-file', '-t', sha + ':' + p], { encoding: 'utf8' }).trim(); } catch (e) { return null; } };
const nodePaths = new Map();
function factsPaths(sha) {
  if (!nodePaths.has(sha)) {
    const f = path.join(B, 'facts', 'cache', sha, 'nodes.jsonl');
    nodePaths.set(sha, fs.existsSync(f) ? new Set(fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l).path).filter(Boolean)) : null);
  }
  return nodePaths.get(sha);
}
const out = { sets: {}, problems: [] };
for (const set of Object.keys(EXPECT).concat(['T5'])) {
  const ts = ho.filter((t) => t.set === set);
  const parents = [...new Set(ts.map((t) => t.parent))];
  const r = { tasks: ts.length, expected: EXPECT[set] == null ? null : EXPECT[set], parents: parents.length, with_seed_path: ts.filter((t) => t.seed && t.seed.path).length,
    facts_missing: 0, facts_wrong_extractor: 0, seed_file_not_in_facts: 0, seed_file_not_in_tree: 0 };
  if (set === 'T5') { r.note = 'not run (addendum 4 item 7); the harness refuses set T5'; out.sets[set] = r; continue; }
  for (const p of parents) {
    const m = path.join(B, 'facts', 'cache', p, 'meta.json');
    if (!fs.existsSync(m)) { r.facts_missing++; out.problems.push(set + ' parent ' + p + ': facts/cache/<parent>/meta.json missing'); continue; }
    const v = JSON.parse(fs.readFileSync(m, 'utf8')).extractor_version;
    if (v !== EXTRACTOR) { r.facts_wrong_extractor++; out.problems.push(set + ' parent ' + p + ': extractor ' + v); }
  }
  for (const t of ts) {
    const fp = factsPaths(t.parent);
    if (fp && !fp.has(t.seed.path)) { r.seed_file_not_in_facts++; out.problems.push(set + ' ' + t.id + ': seed path not a node path in the facts'); }
    if (!inTree(t.parent, t.seed.path)) { r.seed_file_not_in_tree++; out.problems.push(set + ' ' + t.id + ': seed path not in the parent tree'); }
  }
  if (set === 'T3' || set === 'T4') {
    r.remove_entries = 0; r.remove_missing_in_tree = 0; r.remove_missing_in_facts = 0; r.remove_paths = {};
    for (const t of ts) for (const p of t.remove_paths || []) {
      r.remove_entries++;
      r.remove_paths[p] = (r.remove_paths[p] || 0) + 1;
      if (blobType(t.parent, p) !== 'blob') { r.remove_missing_in_tree++; out.problems.push(set + ' ' + t.id + ': remove path ' + p + ' not in the parent tree'); }
      const fp = factsPaths(t.parent);
      if (!fp || !fp.has(p)) { r.remove_missing_in_facts++; out.problems.push(set + ' ' + t.id + ': remove path ' + p + ' has no node in the parent facts'); }
    }
    r.tasks_without_remove_paths = ts.filter((t) => !(t.remove_paths && t.remove_paths.length)).length;
  }
  out.sets[set] = r;
}
out.all_parents = [...new Set(ho.filter((t) => t.set !== 'T5').map((t) => t.parent))].length;
fs.writeFileSync(path.join(__dirname, 'inputs_check.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
