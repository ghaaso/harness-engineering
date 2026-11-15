'use strict';
// Auditor's literal check (ruling 73) of a hand-off folder, from read-only git: a task counts when its task commit
// (sealed records) equals a checkpoint or is an ancestor of one (git merge-base --is-ancestor); checkpoints are every
// seed's `checkpoint` in tables/counts.json, else the hand-off parent. parent_mismatch: hand-off parent differs from
// the sealed record's. Prints counts only.  node aud_literal.js <handoff dir>
const fs = require('fs'); const path = require('path'); const { spawnSync } = require('child_process');
const REPO = 'C:/Users/User/Documents/projects/EMS_workshop1';
const D = process.argv[2];
const jl = (f) => fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const T = new Map(jl(path.join(__dirname, 'aud_truth.jsonl')).map((x) => [x.id, x]));
const rows = jl(path.join(D, 'tasks_used.jsonl'));
let cp = {}; const cf = path.join(D, 'tables', 'counts.json');
if (fs.existsSync(cf)) { const C = JSON.parse(fs.readFileSync(cf, 'utf8')); for (const per of Object.values(C)) if (per && typeof per === 'object') for (const [i, r] of Object.entries(per)) if (r && r.checkpoint) (cp[i] = cp[i] || new Set()).add(r.checkpoint); }
let leak = 0; let mism = 0; let withcp = 0;
for (const r of rows) {
  const t = T.get(r.id); if (r.parent !== t.parent) mism++;
  const cs = cp[r.id] ? [...cp[r.id]] : [r.parent]; if (cp[r.id]) withcp++;
  let bad = false;
  for (const c of cs) { const p = spawnSync('git', ['-C', REPO, 'merge-base', '--is-ancestor', t.commit, c]); if (p.status === 0) bad = true; else if (p.status !== 1) throw new Error('git error'); }
  leak += bad;
}
console.log(JSON.stringify({ tasks: rows.length, task_commit_in_checkpoint_history: leak, parent_mismatch: mism, tasks_with_counts_checkpoint: withcp }));
