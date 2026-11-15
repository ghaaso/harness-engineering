'use strict';
// Removed documents and graph inputs: per held-out T3/T4 task, the graph used, its removed.txt, and its build record.
const fs = require('fs'); const path = require('path'); const zlib = require('zlib'); const L = require('./lib');
const refs = L.refs();
const tasks = L.readJsonl(path.join(L.BUILD, 'tasks/tasks.jsonl'));
const out = { tasks: [], graphs: {}, problems: [] };
const callGraph = new Map();
for (const f of fs.readdirSync(path.join(L.G, 'answers/heldout/calls'))) if (f.endsWith('.jsonl.gz')) for (const r of L.readGz(path.join(L.G, 'answers/heldout/calls', f))) callGraph.set(r.id, r.graph);
for (const t of tasks.filter((x) => x.split === 'heldout' && ['T1', 'T1x', 'T2', 'T3', 'T4'].includes(x.set))) {
  const ref = refs.get(t.id); const g = callGraph.get(t.id);
  if (!g) { out.problems.push('no call record ' + t.id); continue; }
  const rp = (ref.remove_paths || []).slice().sort(); const tp = (t.remove_paths || []).slice().sort();
  if (JSON.stringify(rp) !== JSON.stringify(tp)) out.problems.push('task/ref remove paths differ ' + t.id);
  if (!g.startsWith(t.parent)) out.problems.push('graph not of parent ' + t.id);
  const gd = path.join(L.G, 'graphs', g);
  const removed = fs.existsSync(path.join(gd, 'removed.txt')) ? fs.readFileSync(path.join(gd, 'removed.txt'), 'utf8').trim().split(/\r?\n/).map((s) => s.replace(/^removed /, '')).filter(Boolean).sort() : [];
  if (JSON.stringify(removed) !== JSON.stringify(rp)) out.problems.push(`removed.txt ${g} ${removed} vs ref ${rp} (${t.id})`);
  if (rp.length) out.tasks.push({ id: t.id, set: t.set, graph: g, removed: rp });
}
// every held-out graph: source_file extensions, removed path present as node?, network words in the extract log
const heldGraphs = new Set(callGraph.values());
const ext = {};
for (const g of heldGraphs) {
  const gd = path.join(L.G, 'graphs', g); const gj = JSON.parse(fs.readFileSync(path.join(gd, 'graphify-out/graph.json'), 'utf8'));
  const nodes = gj.nodes || []; const files = new Set(nodes.map((n) => n.source_file).filter(Boolean));
  for (const f of files) { const e = path.extname(f) || f; ext[e] = (ext[e] || 0) + 1; }
  const b = JSON.parse(fs.readFileSync(path.join(gd, 'build.json'), 'utf8'));
  const rem = b.remove_paths || [];
  for (const p of rem) if (files.has(p)) out.problems.push('removed path has nodes ' + g + ' ' + p);
  const xlog = fs.readFileSync(path.join(gd, 'extract.log'), 'utf8');
  const net = (xlog.match(/https?:\/\/|network|connect|socket|download|api key|openai|anthropic/gi) || []);
  // was the removed document present in the parent's typed facts (i.e. did it exist at the parent)?
  const factsDir = path.join(L.BUILD, 'facts/cache', b.sha);
  let present = null;
  if (rem.length && fs.existsSync(factsDir)) { const txt = fs.readdirSync(factsDir).filter((f) => /node/i.test(f)).map((f) => { let x = fs.readFileSync(path.join(factsDir, f)); if (f.endsWith('.gz')) x = zlib.gunzipSync(x); return x.toString('utf8'); }).join('\n'); present = rem.map((p) => [p, txt.includes('"' + p + '"')]); }
  out.graphs[g] = { sha: b.sha, remove_paths: rem, extract_exit: b.extract_exit, nodes: b.nodes, net_words: [...new Set(net.map((x) => x.toLowerCase()))], doc_in_parent_facts: present };
}
out.extensions_of_source_files = ext;
out.n_heldout_graphs = heldGraphs.size;
fs.writeFileSync(path.join(__dirname, 'out/removal.json'), JSON.stringify(out, null, 1));
console.log('problems', out.problems.length, out.problems.slice(0, 10));
console.log('graphs', heldGraphs.size, 'tasks with removal', out.tasks.length);
console.log('ext', JSON.stringify(ext));
console.log('rm graphs', JSON.stringify(Object.entries(out.graphs).filter(([k]) => k.includes('-rm-')).map(([k, v]) => [k.slice(0, 8), v.remove_paths, v.doc_in_parent_facts])));
console.log('net words', JSON.stringify([...new Set(Object.values(out.graphs).flatMap((v) => v.net_words))]));
