'use strict';
// Leak scan of return files: every reference path (files, child paths, definition paths), truth path and seed path
// of ALL 806 T1 tasks, every T1 task commit sha (full and 12-char prefix), task-id patterns, lists, non-finite or
// out-of-range numbers. Prints counts only.  node aud_leak.js <return.json>...
const fs = require('fs'); const path = require('path');
const B = 'C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/build';
const jl = (f) => fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const refs = jl(path.join(B, 'sealed/references.jsonl')).filter((r) => r.set === 'T1');
const S = new Set(); const SHA = new Set();
for (const r of refs) {
  for (const f of r.files) { S.add(f.path); if (f.child_path) S.add(f.child_path); }
  for (const d of r.defs) S.add(d.path); S.add(r.seed.path); SHA.add(r.commit);
}
for (const t of jl(path.join(__dirname, 'aud_truth.jsonl'))) for (const p of t.truth) S.add(p);
S.delete('');
const out = {};
for (const f of process.argv.slice(2)) {
  const txt = fs.readFileSync(f, 'utf8'); const o = JSON.parse(txt);
  let nums = 0; let lists = 0; let bad = 0; let range = 0; let keysTask = 0; let strs = 0;
  const walk = (x, k) => {
    if (Array.isArray(x)) { lists++; x.forEach((y) => walk(y, k)); }
    else if (x && typeof x === 'object') for (const [kk, v] of Object.entries(x)) { if (/T[0-9][a-z]?-[0-9]{3,}/.test(kk)) keysTask++; walk(v, kk); }
    else if (typeof x === 'number') { nums++; if (!Number.isFinite(x)) bad++; if (!['tasks', 'commits', 'tasks_checked', 'equal_to_lane', 'task_commit_in_checkpoint_history', 'parent_mismatch'].includes(k) && (x < -1 || x > 1)) range++; }
    else if (typeof x === 'string') strs++;
  };
  walk(o, '');
  out[f.split('/').slice(-3).join('/')] = { bytes: txt.length, numbers: nums, strings: strs, lists, non_finite: bad, out_of_unit_range: range, task_id_keys: keysTask,
    task_id_pattern: (txt.match(/T[0-9][a-z]?-[0-9]{3,}/g) || []).length, reference_or_truth_paths: [...S].filter((s) => txt.includes(s)).length,
    task_commit_shas: [...SHA].filter((s) => txt.includes(s) || txt.includes(s.slice(0, 12))).length, top_keys: Object.keys(o).sort().join(',') };
}
console.log(JSON.stringify({ paths_searched: S.size, shas_searched: SHA.size, files: out }, null, 1));
