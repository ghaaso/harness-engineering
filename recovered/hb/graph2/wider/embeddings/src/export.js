'use strict';
// Leak-safe graph export for the embedding step (protocol addendum 8, items 4, 5, 8, 16).
// Runs in a container: /build = the build tree (read-only), /out = embeddings/ (writable).
// For every distinct parent of a T1 task (tune and held-out; a graph at a parent reads no answer):
//   export/graphs/<sha>/entities.tsv    id, kind, path, is_code_file, area          (shared loader nodes)
//   export/graphs/<sha>/triples.tsv     head, relation, tail                         (shared loader edges,
//                                       w >= minConf 0.5 (the loader default), all kinds; co_changed in
//                                       both directions, every other kind as stored)
//   export/graphs/<sha>/pilot_graph.tsv a, b, kinds   file-collapsed undirected pilot graph (a < b), built
//                                       from the raw facts exactly as graph-v2-pilot-ranking/feat.py does
//   export/graphs/<sha>/pilot_co.tsv    a, b, conf, support, recency, conf_max   co-change per file pair;
//                                       conf/support/recency = the pilot's (last raw row of the pair wins),
//                                       conf_max = the shared loader's (max over rows)
//   export/graphs/<sha>/ancestors.txt   the shas in the parent's commits.jsonl (the commits an arm may use)
//   export/graphs/<sha>/sizes.json
// Then export/parents.jsonl (one row per parent: split(s), commit_time, order per split, ancestor task
// parents) and export/sizes.jsonl. Progress: progress.jsonl (step "export", unit = sha); a unit whose
// status is done and whose files exist is never rerun.
const fs = require('fs');
const path = require('path');
const BUILD = process.env.GT_BUILD || '/build';
const OUT = process.env.EMB_OUT || '/out';
// The shared loader asks the source store for doc-section text; text is not exported, so the source
// store is bypassed (it would otherwise run `git archive` and write under arms/common). The graph is
// unaffected: text only feeds node.text.
const source = require(path.join(BUILD, 'arms/common/source.js'));
source.ensureTree = () => {};
source.getLines = () => null;
const { loadFacts } = require(path.join(BUILD, 'arms/common/facts.js'));

const MINCONF = 0.5;
const CODE = /^(backend|src|technician-app)\/.*\.(py|ts|tsx|js|jsx|mjs|cjs)$/;
const area = (p) => !p ? 'other' : p.startsWith('backend/') ? 'backend' : p.startsWith('technician-app/') ? 'mobile' : p.startsWith('src/') ? 'web' : 'other';
const tsv = (v) => (v === null || v === undefined ? '' : String(v).replace(/[\t\n\r]/g, ' '));
const readJsonl = (f) => fs.existsSync(f) ? fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map(JSON.parse) : [];

const PROG = path.join(OUT, 'progress.jsonl');
const done = new Set(readJsonl(PROG).filter((r) => r.step === 'export' && r.status === 'done').map((r) => r.unit));
const logp = (o) => fs.appendFileSync(PROG, JSON.stringify({ ...o, t: new Date().toISOString() }) + '\n');

const tasks = readJsonl(path.join(BUILD, 'tasks/tasks.jsonl')).filter((t) => t.set === 'T1');
const splitsOf = new Map();
for (const t of tasks) { if (!splitsOf.has(t.parent)) splitsOf.set(t.parent, new Set()); splitsOf.get(t.parent).add(t.split); }
const parents = [...splitsOf.keys()].sort();
const FILES = ['entities.tsv', 'triples.tsv', 'pilot_graph.tsv', 'pilot_co.tsv', 'ancestors.txt', 'sizes.json'];

function pilotGraph(dir) {
  // mirror of feat.py lines 29-49 (nodes: last row of an id wins; key F:<path> or N:<id>)
  const nodes = new Map();
  for (const n of readJsonl(path.join(dir, 'nodes.jsonl'))) nodes.set(n.id, n);
  const key = (i) => { const n = nodes.get(i); if (!n) return null; return n.path ? 'F:' + n.path : 'N:' + i; };
  const nb = new Map(); const co = new Map();
  const add = (a, b, k) => { if (!nb.has(a)) nb.set(a, new Map()); const m = nb.get(a); if (!m.has(b)) m.set(b, new Set()); m.get(b).add(k); };
  for (const e of readJsonl(path.join(dir, 'edges.jsonl'))) {
    const a = key(e.src); const b = key(e.dst);
    if (a === null || b === null || a === b) continue;
    if (e.kind === 'co_changed') {
      const at = e.attrs || {};
      const conf = e.confidence || 0;
      const pk = a < b ? a + '\t' + b : b + '\t' + a;
      const prev = co.get(pk);
      co.set(pk, { conf, support: at.support === undefined ? 1 : at.support, recency: at.recency_weight || 0,
        conf_max: prev ? Math.max(prev.conf_max, conf) : conf });
      continue;
    }
    if (e.kind === 'contains' && ['runtime', 'slice', 'invariant_group'].includes(nodes.get(e.src).kind)) continue;
    add(a, b, e.kind); add(b, a, e.kind);
  }
  return { nb, co };
}

const sizes = [];
for (const sha of parents) {
  const od = path.join(OUT, 'export/graphs', sha);
  const have = FILES.every((f) => fs.existsSync(path.join(od, f)));
  if (done.has(sha) && have) { sizes.push(JSON.parse(fs.readFileSync(path.join(od, 'sizes.json'), 'utf8'))); continue; }
  fs.mkdirSync(od, { recursive: true });
  const G = loadFacts(sha);
  const put = (name, text) => { fs.writeFileSync(path.join(od, name + '.part'), text); fs.renameSync(path.join(od, name + '.part'), path.join(od, name)); };
  let ent = 'id\tkind\tpath\tis_code_file\tarea\n'; let nCode = 0;
  for (const n of G.nodes) {
    const isCode = n.kind === 'file' && n.path && CODE.test(n.path) ? 1 : 0; nCode += isCode;
    ent += [n.sid, n.kind, n.path, isCode, area(n.path)].map(tsv).join('\t') + '\n';
  }
  const sid = (i) => G.nodes[i - 1].sid;
  let tri = 'head\trelation\ttail\n'; let nT = 0; let nCo = 0; const rels = new Set(); const byRel = {};
  for (const e of G.edges) {
    if (e.w < MINCONF) continue;
    const pairs = e.sym ? [[e.s, e.d], [e.d, e.s]] : [[e.s, e.d]];
    for (const [h, t] of pairs) { tri += sid(h) + '\t' + e.kind + '\t' + sid(t) + '\n'; nT++; byRel[e.kind] = (byRel[e.kind] || 0) + 1; }
    if (e.kind === 'co_changed') nCo += pairs.length;
    rels.add(e.kind);
  }
  const { nb, co } = pilotGraph(G.dir);
  let pg = 'a\tb\tkinds\n'; let nPg = 0;
  for (const [a, m] of nb) for (const [b, ks] of m) if (a < b) { pg += a + '\t' + b + '\t' + [...ks].sort().join(',') + '\n'; nPg++; }
  let pc = 'a\tb\tconf\tsupport\trecency\tconf_max\n';
  for (const [k, v] of co) pc += k + '\t' + v.conf + '\t' + v.support + '\t' + v.recency + '\t' + v.conf_max + '\n';
  const anc = G.commits.map((c) => c.sha).filter(Boolean);
  const meta = JSON.parse(fs.readFileSync(path.join(G.dir, 'meta.json'), 'utf8'));
  const sz = { sha, splits: [...splitsOf.get(sha)].sort(), commit_time: meta.commit_time, entities: G.nodes.length,
    triples: nT, relations: rels.size, co_changed_triples: nCo, triples_by_relation: byRel,
    edges_all_conf: G.edges.length, edges_below_minconf: G.edges.filter((e) => e.w < MINCONF).length,
    code_files: nCode, pilot_graph_nodes: nb.size, pilot_graph_pairs: nPg, pilot_co_pairs: co.size,
    ancestors: anc.length, loader_version: G.loader_version, extractor_version: G.meta.extractor_version, minConf: MINCONF };
  put('entities.tsv', ent); put('triples.tsv', tri); put('pilot_graph.tsv', pg); put('pilot_co.tsv', pc);
  put('ancestors.txt', anc.join('\n') + '\n'); put('sizes.json', JSON.stringify(sz, null, 1));
  sizes.push(sz);
  logp({ step: 'export', unit: sha, status: 'done', entities: sz.entities, triples: nT });
  process.stdout.write('.');
}
// parents.jsonl: checkpoint data. order_<split> = 1-based rank of the parent by commit_time among the
// distinct task parents of that split; ancestor_parents = other T1 task parents listed in this parent's
// commits.jsonl (so "C == P or C in ancestor_parents" is the leak rule's ancestry test).
const anc = new Map(parents.map((s) => [s, new Set(fs.readFileSync(path.join(OUT, 'export/graphs', s, 'ancestors.txt'), 'utf8').split('\n').filter(Boolean))]));
const bySha = new Map(sizes.map((s) => [s.sha, s]));
const rows = parents.map((s) => ({ sha: s, splits: bySha.get(s).splits, commit_time: bySha.get(s).commit_time,
  ancestor_parents: parents.filter((c) => c !== s && anc.get(s).has(c)) }));
for (const sp of ['tune', 'heldout']) {
  const r = rows.filter((x) => x.splits.includes(sp)).sort((a, b) => a.commit_time - b.commit_time || (a.sha < b.sha ? -1 : 1));
  r.forEach((x, i) => { x['order_' + sp] = i + 1; });
}
const all = [...rows].sort((a, b) => a.commit_time - b.commit_time || (a.sha < b.sha ? -1 : 1));
all.forEach((x, i) => { x.order_all = i + 1; });
fs.writeFileSync(path.join(OUT, 'export/parents.jsonl'), all.map((x) => JSON.stringify(x)).join('\n') + '\n');
fs.writeFileSync(path.join(OUT, 'export/sizes.jsonl'), sizes.sort((a, b) => a.commit_time - b.commit_time).map((x) => JSON.stringify(x)).join('\n') + '\n');
// consistency: a parent whose commit_time is later must not be listed as an ancestor of an earlier one
let bad = 0; for (const x of rows) for (const c of x.ancestor_parents) if (bySha.get(c).commit_time > x.commit_time) bad++;
console.log('\nparents', parents.length, 'tune', rows.filter((x) => x.splits.includes('tune')).length,
  'heldout', rows.filter((x) => x.splits.includes('heldout')).length, 'ancestor-time violations', bad);
