'use strict';
// Refuter 3: (1) which held-out T1 seed is classed differently by runtime; (2) TUNE split by seed runtime for
// the frozen configurations, from the grader's stored TUNE per-task scores (no arm run).
const fs = require('fs'); const zlib = require('zlib');
const B = 'C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/build';
const OUT = B + '/audit/heldout/claims';
const gz = (f) => zlib.gunzipSync(fs.readFileSync(f)).toString('utf8').split('\n').filter(Boolean).map(JSON.parse);
const tasks = new Map(fs.readFileSync(B + '/tasks/tasks.jsonl', 'utf8').split('\n').filter(Boolean).map(JSON.parse).map((t) => [t.id, t]));
const rd = JSON.parse(fs.readFileSync(B + '/sealed/grader/heldout/report_data.json', 'utf8'));
const out = {};
// (1) seeds outside backend/ technician-app/ src/
const odd = [];
for (const t of tasks.values()) if (t.set === 'T1' && t.split === 'heldout') { const p = t.seed.path; if (!/^(backend|technician-app|src)\//.test(p)) odd.push({ id: t.id, path: p }); }
out.heldout_T1_seeds_outside_three_roots = odd;
out.grader_runtime_rule = rd.runtime && rd.runtime.rule ? rd.runtime.rule : Object.keys(rd.runtime || {});
// (2) TUNE by runtime
const rt = (p) => (p.startsWith('technician-app/') ? 'mobile' : p.startsWith('backend/') ? 'backend' : p.startsWith('src/') ? 'web' : 'other');
const want = { relational: ['95e990307da3b42b', '6b70cc1222745385'], ladybug: ['f233ae069bdba0ce'], search: ['e70177e5807f0252', '950c029615d337c1'], 'floor-dir': ['714a474060653c1f'], 'floor-co': ['c4d2f0a60a3d199c'] };
const per = {};
for (const [arm, hs] of Object.entries(want)) for (const st of ['stage1', 'stage2']) {
  const f = `${B}/sealed/grader/${st}/${arm}.tasks.jsonl.gz`; if (!fs.existsSync(f)) continue;
  for (const r of gz(f)) if (hs.includes(r.config_hash) && r.set === 'T1') { const k = arm + ':' + r.config_hash; (per[k] = per[k] || new Map()).set(r.id, r); }
}
const mean = (x) => x.reduce((a, b) => a + b, 0) / x.length;
function byClusters(m, filt) { const g = new Map(); for (const r of m.values()) { if (!filt(r)) continue; if (!g.has(r.cluster)) g.set(r.cluster, []); g.get(r.cluster).push(r.r8000); } const o = new Map(); for (const [c, v] of g) o.set(c, mean(v)); return o; }
const keys = Object.keys(per);
out.tune_rows_found = Object.fromEntries(keys.map((k) => [k, per[k].size]));
const typedK = 'relational:95e990307da3b42b';
out.tune = {};
for (const rtn of ['all', 'backend', 'web', 'mobile', 'other']) {
  const f = (r) => rtn === 'all' || rt(tasks.get(r.id).seed.path) === rtn;
  const row = { tasks: [...per[typedK].values()].filter(f).length };
  const ct = byClusters(per[typedK], f); row.clusters = ct.size;
  for (const k of keys) { const c = byClusters(per[k], f); row[k] = Math.round(mean([...c.values()]) * 10000) / 10000; if (k !== typedK) { const ks = [...ct.keys()].filter((x) => c.has(x)); row['typed-' + k] = Math.round(mean(ks.map((x) => ct.get(x) - c.get(x))) * 10000) / 10000; } }
  out.tune[rtn] = row;
}
// share of T1 tasks by seed runtime, tune vs heldout
const share = { tune: {}, heldout: {} };
for (const t of tasks.values()) if (t.set === 'T1') { const s = t.split; share[s][rt(t.seed.path)] = (share[s][rt(t.seed.path)] || 0) + 1; }
out.T1_tasks_by_runtime = share;
fs.writeFileSync(OUT + '/a3_tune_runtime.json', JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
