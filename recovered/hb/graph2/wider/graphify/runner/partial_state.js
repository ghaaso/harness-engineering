'use strict';
// State of the held-out run after the pack step failed: graphs built, graphify raw call output, and
// checks that do not need an answer file. Reads no reference. Writes runner/partial_state.json.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');
const G = path.resolve(__dirname, '..');
const BUILD = path.resolve(G, '..', '..', 'build');
const OUT = path.join(G, 'answers', 'heldout');
const SETS = ['T1', 'T1x', 'T2', 'T3', 'T4'];
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const gz = (f) => zlib.gunzipSync(fs.readFileSync(f)).toString('utf8').split('\n').filter(Boolean).map(JSON.parse);
const med = (a) => { const s = a.slice().sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const key = (p, rp) => { const r = (rp || []).slice().sort(); return r.length ? p + '-rm-' + sha(r.join('\n')).slice(0, 8) : p; };
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const whole = (p) => new RegExp('(^|[\\s\\[\\](=,\'"`])' + esc(p) + '($|[\\s\\]\\[):,\'"`])', 'm');
const tasks = fs.readFileSync(path.join(BUILD, 'tasks', 'tasks.jsonl'), 'utf8').split('\n').filter(Boolean).map(JSON.parse)
  .filter((t) => t.split === 'heldout' && SETS.includes(t.set));
const keys = [...new Set(tasks.map((t) => key(t.parent, t.remove_paths)))].sort();
const srcTrees = path.join(BUILD, 'arms', 'common', 'srcstore', 'trees');
const out = { at: new Date().toISOString(), tasks: tasks.length, per_set: {}, graphs: [], calls: { files: 0, records: 0, ids: 0, per_set: {}, exits: {}, zero_node_calls: {}, skipped: 0, ms_median: {}, ms_max: {} }, removed: { checked: 0, hits: [], graphs: [] }, parents_without_source_tree: 0, inventory: [] };
for (const t of tasks) out.per_set[t.set] = (out.per_set[t.set] || 0) + 1;
const ids = new Set(); const ms = {};
for (const k of keys) {
  const b = JSON.parse(fs.readFileSync(path.join(G, 'graphs', k, 'build.json'), 'utf8'));
  const n = tasks.filter((t) => key(t.parent, t.remove_paths) === k);
  out.graphs.push({ key: k, sets: [...new Set(n.map((t) => t.set))].sort(), tasks: n.length, extract_s: +b.extract_s.toFixed(2), container_s: +b.container_wall_s.toFixed(1), extract_exit: b.extract_exit, source_files: b.source_files, nodes: b.nodes, edges: b.edges, remove_paths: b.remove_paths, source_tree_in_shared_store: fs.existsSync(path.join(srcTrees, b.sha + '.json')) });
  const f = path.join(OUT, 'calls', k + '.jsonl.gz');
  out.calls.files++;
  out.inventory.push({ path: 'answers/heldout/calls/' + k + '.jsonl.gz', sha256: sha(fs.readFileSync(f)) });
  const recs = gz(f);
  for (const r of recs) {
    out.calls.records++; ids.add(r.id); out.calls.per_set[r.set] = (out.calls.per_set[r.set] || 0) + 1;
    for (const [ck, c] of Object.entries(r.calls)) {
      if (!c.argv) { out.calls.skipped++; continue; }
      const e = ck + ' exit ' + c.exit; out.calls.exits[e] = (out.calls.exits[e] || 0) + 1;
      if (!(c.items || []).length) out.calls.zero_node_calls[ck] = (out.calls.zero_node_calls[ck] || 0) + 1;
      (ms[ck] = ms[ck] || []).push(c.ms);
    }
    const t = tasks.find((x) => x.id === r.id);
    for (const p of (t.remove_paths || [])) {
      out.removed.checked++;
      const w = Object.entries(r.calls).filter(([, c]) => whole(p).test(c.stdout || '') || (c.items || []).some((it) => it.file === p)).map(([ck]) => ck);
      if (w.length) out.removed.hits.push({ id: r.id, path: p, calls: w });
    }
  }
  if (b.remove_paths.length) {
    const gj = JSON.parse(fs.readFileSync(path.join(G, 'graphs', k, 'graphify-out', 'graph.json'), 'utf8'));
    const rt = fs.existsSync(path.join(G, 'graphs', k, 'removed.txt')) ? fs.readFileSync(path.join(G, 'graphs', k, 'removed.txt'), 'utf8').trim().split('\n') : [];
    out.removed.graphs.push({ key: k, remove_paths: b.remove_paths, removed_txt: rt, node_with_removed_source_file: b.remove_paths.filter((p) => gj.nodes.some((x) => x.source_file === p)) });
  }
}
out.calls.ids = ids.size;
for (const [k, v] of Object.entries(ms)) { out.calls.ms_median[k] = med(v); out.calls.ms_max[k] = Math.max(...v); }
out.parents_without_source_tree = new Set(out.graphs.filter((g) => !g.source_tree_in_shared_store).map((g) => g.key.slice(0, 40))).size;
out.parents = new Set(out.graphs.map((g) => g.key.slice(0, 40))).size;
const ex = out.graphs.map((g) => g.extract_s); const cs = out.graphs.map((g) => g.container_s);
out.graph_summary = { count: out.graphs.length, extract_s_median: med(ex), extract_s_min: Math.min(...ex), extract_s_max: Math.max(...ex), container_s_median: med(cs), container_s_total: +cs.reduce((a, b) => a + b, 0).toFixed(1),
  nodes_min: Math.min(...out.graphs.map((g) => g.nodes)), nodes_median: med(out.graphs.map((g) => g.nodes)), nodes_max: Math.max(...out.graphs.map((g) => g.nodes)),
  edges_min: Math.min(...out.graphs.map((g) => g.edges)), edges_median: med(out.graphs.map((g) => g.edges)), edges_max: Math.max(...out.graphs.map((g) => g.edges)),
  files_min: Math.min(...out.graphs.map((g) => g.source_files)), files_max: Math.max(...out.graphs.map((g) => g.source_files)) };
out.exports_left = fs.readdirSync(path.join(G, 'exports'));
fs.writeFileSync(path.join(__dirname, 'partial_state.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify({ ...out, graphs: undefined, inventory: undefined, removed: { checked: out.removed.checked, hits: out.removed.hits, graphs: out.removed.graphs } }, null, 1));
