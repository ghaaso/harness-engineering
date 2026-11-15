'use strict';
// Adapter loss on the held-out run: nodes without a file, seeds not found, files graphify returned that
// the shared projection dropped, and reference files graphify's graph has no node for.
const fs = require('fs'); const path = require('path'); const L = require('./lib');
const refs = L.refs();
const SETS = ['T1', 'T1x', 'T2', 'T3', 'T4'];
const ans = new Map();
for (const s of SETS) for (const r of L.readGz(path.join(L.G, 'answers/heldout', s + '.jsonl.gz'))) ans.set(r.id, r);
const scoreRows = JSON.parse(fs.readFileSync(path.join(__dirname, 'out/heldout_tasks.json'), 'utf8'));
const score = new Map(); for (const s of SETS) for (const r of scoreRows['graphify/' + s]) score.set(r.id, r);
const o = { printed: 0, no_file: 0, unmapped_records: 0, seed_file_missing: 0, def_rule: {}, dropped: { tasks: 0, files: 0, ref_files: 0, examples: [], exts: {} },
  ref_not_in_graph: { files: 0, of: 0, exts: {}, T1_files: 0, T1_of: 0 }, ref_reachable_but_late: {} };
const graphFiles = new Map();
function gfiles(key) {
  if (!graphFiles.has(key)) { const g = JSON.parse(fs.readFileSync(path.join(L.G, 'graphs', key, 'graphify-out/graph.json'), 'utf8')); graphFiles.set(key, new Set(g.nodes.map((n) => n.source_file).filter(Boolean))); }
  return graphFiles.get(key);
}
const byDefRule = {};
for (const f of fs.readdirSync(path.join(L.G, 'answers/heldout/calls')).filter((x) => x.endsWith('.jsonl.gz'))) {
  for (const c of L.readGz(path.join(L.G, 'answers/heldout/calls', f))) {
    const call = c.calls['query:seed:full:d3']; const ref = refs.get(c.id); const a = ans.get(c.id);
    o.printed += call.items.length; o.no_file += call.items.filter((x) => !x.file).length;
    if (!c.seed_res.file_in_graph) o.seed_file_missing++;
    o.def_rule[c.seed_res.def_rule] = (o.def_rule[c.seed_res.def_rule] || 0) + 1;
    // distinct files in graphify order, seed file excluded
    const seen = []; for (const it of call.items) if (it.file && it.file !== c.seed.path && !seen.includes(it.file)) seen.push(it.file);
    // files in the packed answer: shown items plus the beyond list are a sample; use n_units for the count and the items+beyond_sample for identity
    const packed = new Set([...a.items.map((x) => x.path), ...(a.beyond_sample || [])]);
    const nUnits = a.n_units;
    if (nUnits < seen.length) {
      o.dropped.tasks++; o.dropped.files += seen.length - nUnits;
      // which ones: only checkable when the packed sample covers the whole list
      if (a.items.length + (a.beyond_sample || []).length >= nUnits) {
        const miss = seen.filter((p) => !packed.has(p));
        for (const p of miss) { const e = path.extname(p) || p; o.dropped.exts[e] = (o.dropped.exts[e] || 0) + 1; if (ref.files.some((x) => x.path === p)) o.dropped.ref_files++; }
        if (o.dropped.examples.length < 8 && miss.length) o.dropped.examples.push({ id: c.id, miss: miss.slice(0, 4) });
      }
    }
    // reference files graphify's graph has no node for
    const gf = gfiles(c.graph);
    for (const x of ref.files) { o.ref_not_in_graph.of++; if (ref.set === 'T1') o.ref_not_in_graph.T1_of++; if (!gf.has(x.path)) { o.ref_not_in_graph.files++; if (ref.set === 'T1') o.ref_not_in_graph.T1_files++; const e = path.extname(x.path) || x.path; o.ref_not_in_graph.exts[e] = (o.ref_not_in_graph.exts[e] || 0) + 1; } }
    if (ref.set === 'T1') { const k = c.seed_res.def_rule; (byDefRule[k] = byDefRule[k] || []).push(score.get(c.id).r8000); }
  }
}
o.T1_primary_by_def_rule_taskmean = Object.fromEntries(Object.entries(byDefRule).map(([k, v]) => [k, { tasks: v.length, mean_r8000: L.r4(L.mean(v)) }]));
fs.writeFileSync(path.join(__dirname, 'out/adapterloss.json'), JSON.stringify(o, null, 1));
console.log(JSON.stringify(o, null, 1));
