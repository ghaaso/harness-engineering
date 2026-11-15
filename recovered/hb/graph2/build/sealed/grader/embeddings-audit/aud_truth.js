'use strict';
// Auditor's own truth (addendum 8 item 4), written from the addendum text only; it reads no grader file for the
// derivation. Task -> commit from sealed/references.jsonl; truth from read-only git: the commit's files with status M
// against its first parent (no rename detection: a renamed file is not "modified"), code per item 4's regex, seed
// excluded. A second form from the sealed records (files with status M). Date order: author time (ruling 32),
// ties reported. Writes aud_truth.jsonl here (sealed). Prints counts only.
// Then compares with the builder's truth/truth.jsonl and the lane's eval/tune_tasks.jsonl (counts only).
const fs = require('fs'); const path = require('path'); const { execFileSync } = require('child_process');
const BUILD = 'C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/build';
const LANE = 'C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings';
const REPO = 'C:/Users/User/Documents/projects/EMS_workshop1';
const CODE = /^(backend|src|technician-app)\/.*\.(py|ts|tsx|js|jsx|mjs|cjs)$/;
const git = (...a) => execFileSync('git', ['-C', REPO, ...a], { encoding: 'utf8', maxBuffer: 1 << 28 });
const jl = (f) => fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const refs = jl(path.join(BUILD, 'sealed/references.jsonl')).filter((r) => r.set === 'T1');
const tasksB = new Map(jl(path.join(BUILD, 'tasks/tasks.jsonl')).filter((r) => r.set === 'T1').map((r) => [r.id, r]));
const C = new Map(); const cnt = { tasks: refs.length, tune: 0, heldout: 0, taskrow_mismatch: 0, not_first_parent: 0, merges: 0, T_status: 0, R_code: 0 };
for (const r of refs) {
  cnt[r.split]++;
  const t = tasksB.get(r.id); if (!t || t.parent !== r.parent || t.seed.path !== r.seed.path || t.split !== r.split) cnt.taskrow_mismatch++;
  if (!C.has(r.commit)) C.set(r.commit, { commit: r.commit, parent: r.parent, split: r.split });
}
for (const c of C.values()) {
  const [at, ct, ps] = git('log', '-1', '--format=%at%n%ct%n%P', c.commit).trim().split('\n');
  c.at = +at; c.ct = +ct; const P = ps.split(' '); if (P.length > 1) cnt.merges++; if (P[0] !== c.parent) cnt.not_first_parent++;
  const ns = git('diff-tree', '-r', '--no-renames', '--name-status', c.parent, c.commit).split('\n').filter(Boolean).map((l) => l.split('\t'));
  c.M = new Set(ns.filter((x) => x[0] === 'M').map((x) => x[1]));
  cnt.T_status += ns.filter((x) => x[0][0] === 'T' && CODE.test(x[1])).length;
  const nr = git('diff-tree', '-r', '-M', '--name-status', c.parent, c.commit).split('\n').filter(Boolean).map((l) => l.split('\t'));
  cnt.R_code += nr.filter((x) => x[0][0] === 'R' && CODE.test(x[1])).length;
}
const order = {};
for (const sp of ['tune', 'heldout']) {
  const cs = [...C.values()].filter((c) => c.split === sp).sort((a, b) => a.at - b.at || a.ct - b.ct || (a.commit < b.commit ? -1 : 1));
  cnt['commits_' + sp] = cs.length; cnt['author_time_ties_' + sp] = cs.filter((c, i) => i && c.at === cs[i - 1].at).length;
  cs.forEach((c, i) => { c.order = i + 1; c.late50 = sp === 'tune' ? i >= cs.length - 50 : null; });
}
cnt.heldout_parents = new Set([...C.values()].filter((c) => c.split === 'heldout').map((c) => c.parent)).size;
const out = []; let recEqGit = 0; let empty = 0;
for (const r of refs) {
  const c = C.get(r.commit);
  const g = [...c.M].filter((p) => CODE.test(p) && p !== r.seed.path).sort();
  const s = [...new Set(r.files.filter((f) => f.status === 'M').map((f) => f.path))].filter((p) => CODE.test(p) && p !== r.seed.path).sort();
  if (JSON.stringify(g) === JSON.stringify(s)) recEqGit++;
  if (!g.length) empty++;
  out.push({ id: r.id, split: r.split, commit: r.commit, parent: r.parent, seed: r.seed.path, order: c.order, late50: c.late50, truth: g });
}
cnt.records_equal_git = recEqGit; cnt.empty_truth = empty;
cnt.late50_tasks = out.filter((x) => x.late50).length; cnt.late50_commits = new Set(out.filter((x) => x.late50).map((x) => x.commit)).size;
out.sort((a, b) => (a.id < b.id ? -1 : 1));
fs.writeFileSync(path.join(__dirname, 'aud_truth.jsonl'), out.map((x) => JSON.stringify(x)).join('\n') + '\n');
// compare with the builder
const bt = new Map(jl(path.join(BUILD, 'sealed/grader/embeddings/truth/truth.jsonl')).map((x) => [x.id, x]));
const cmp = { builder_rows: bt.size, tune_equal: 0, heldout_equal: 0, commit_equal: 0, late50_equal: 0, date_order_equal: 0 };
for (const x of out) {
  const b = bt.get(x.id); if (!b) continue;
  if (JSON.stringify([...b.truth].sort()) === JSON.stringify(x.truth)) cmp[x.split + '_equal']++;
  if (b.commit === x.commit) cmp.commit_equal++; if (b.late50 === x.late50) cmp.late50_equal++; if (b.date_order === x.order) cmp.date_order_equal++;
}
// compare with the lane
const lane = jl(path.join(LANE, 'eval/tune_tasks.jsonl')); const mine = new Map(out.map((x) => [x.id, x]));
const lc = { lane_rows: lane.length, id_found: 0, commit_seed_parent_equal: 0, truth_equal: 0, late50_equal: 0, date_order_equal: 0 };
for (const l of lane) {
  const x = mine.get(l.task_id); if (!x) continue; lc.id_found++;
  if (x.commit === l.commit && x.seed === l.seed && x.parent === l.parent) lc.commit_seed_parent_equal++;
  if (JSON.stringify([...l.truth].sort()) === JSON.stringify(x.truth)) lc.truth_equal++;
  if (x.late50 === l.late50) lc.late50_equal++; if (x.order === l.date_order) lc.date_order_equal++;
}
console.log(JSON.stringify({ mine: cnt, vs_builder: cmp, vs_lane: lc }));
