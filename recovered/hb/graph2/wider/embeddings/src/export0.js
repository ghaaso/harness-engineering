'use strict';
// Ruling 34 (protocol addendum 8): the training graph per parent at minConf 0 (every fact the comparators
// read). Same loader and same triple rule as export.js (one triple per (kind, source, target);
// co_changed in both directions), only the confidence filter is off. Writes only
//   export/graphs0/<sha>/entities.tsv, triples.tsv, sizes.json
// and leaves export/graphs/ (minConf 0.5), parents.jsonl and sizes.jsonl untouched.
// Container mounts: /build/{arms/common,facts,tasks} read-only, /out0 = export/graphs0 (rw).
// Progress: /out0/progress.jsonl (step "export0", unit = sha); outputs .part then rename.
const fs = require('fs');
const path = require('path');
const BUILD = process.env.GT_BUILD || '/build';
const OUT0 = process.env.EMB_OUT0 || '/out0';
const source = require(path.join(BUILD, 'arms/common/source.js'));
source.ensureTree = () => {};
source.getLines = () => null;
const { loadFacts } = require(path.join(BUILD, 'arms/common/facts.js'));
const MINCONF = 0;
const CODE = /^(backend|src|technician-app)\/.*\.(py|ts|tsx|js|jsx|mjs|cjs)$/;
const area = (p) => !p ? 'other' : p.startsWith('backend/') ? 'backend' : p.startsWith('technician-app/') ? 'mobile' : p.startsWith('src/') ? 'web' : 'other';
const tsv = (v) => (v === null || v === undefined ? '' : String(v).replace(/[\t\n\r]/g, ' '));
const readJsonl = (f) => fs.existsSync(f) ? fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map(JSON.parse) : [];
const PROG = path.join(OUT0, 'progress.jsonl');
const done = new Set(readJsonl(PROG).filter((r) => r.step === 'export0' && r.status === 'done').map((r) => r.unit));
const logp = (o) => fs.appendFileSync(PROG, JSON.stringify({ ...o, t: new Date().toISOString() }) + '\n');
const tasks = readJsonl(path.join(BUILD, 'tasks/tasks.jsonl')).filter((t) => t.set === 'T1');
const splitsOf = new Map();
for (const t of tasks) { if (!splitsOf.has(t.parent)) splitsOf.set(t.parent, new Set()); splitsOf.get(t.parent).add(t.split); }
const parents = [...splitsOf.keys()].sort();
const FILES = ['entities.tsv', 'triples.tsv', 'sizes.json'];
let n = 0;
for (const sha of parents) {
  const od = path.join(OUT0, sha);
  if (done.has(sha) && FILES.every((f) => fs.existsSync(path.join(od, f)))) continue;
  fs.mkdirSync(od, { recursive: true });
  const G = loadFacts(sha);
  const put = (name, text) => { fs.writeFileSync(path.join(od, name + '.part'), text); fs.renameSync(path.join(od, name + '.part'), path.join(od, name)); };
  let ent = 'id\tkind\tpath\tis_code_file\tarea\n'; let nCode = 0;
  for (const nd of G.nodes) {
    const isCode = nd.kind === 'file' && nd.path && CODE.test(nd.path) ? 1 : 0; nCode += isCode;
    ent += [nd.sid, nd.kind, nd.path, isCode, area(nd.path)].map(tsv).join('\t') + '\n';
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
  const meta = JSON.parse(fs.readFileSync(path.join(G.dir, 'meta.json'), 'utf8'));
  const sz = { sha, splits: [...splitsOf.get(sha)].sort(), commit_time: meta.commit_time, entities: G.nodes.length,
    triples: nT, relations: rels.size, co_changed_triples: nCo, triples_by_relation: byRel,
    edges_all_conf: G.edges.length, code_files: nCode, loader_version: G.loader_version,
    extractor_version: G.meta.extractor_version, minConf: MINCONF };
  put('entities.tsv', ent); put('triples.tsv', tri); put('sizes.json', JSON.stringify(sz, null, 1));
  logp({ step: 'export0', unit: sha, status: 'done', entities: sz.entities, triples: nT });
  n++;
}
console.log('export0: parents', parents.length, 'written now', n);
