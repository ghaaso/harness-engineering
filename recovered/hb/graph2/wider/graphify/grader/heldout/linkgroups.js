'use strict';
// Grader, graphify held-out, step 4: the group of addendum 7 item 20 for T1 (questions are grouped in tq_g.js).
// Rule (written before any group score was computed):
//   Graph = the typed facts of the task's parent commit (build/facts/cache/<parent>/), restricted exactly as
//   the typed primary traverses them: edge classes structure, imports, calls, http, tests, data, config,
//   history (results/frozen/relational/95e990307da3b42b.json), confidence >= 0.5 (minConf; one edge per
//   kind/source/target with the highest confidence; co_changed one undirected edge per pair), both directions.
//   MISSING = the link kinds graphify does not build for this stack, as item 20 lists them:
//     route to client call: registers_route, calls_url, test_calls_route
//     table read or write:  reads_table, writes_table, writes_column, migration_touches, foreign_key
//     setting read:         reads_setting
//     changed-together:     co_changed
//   Every other kind stays in both graphs (so the split is conservative: a reference reached through an
//   outbox-kind or migration-chain link counts as reachable without the missing kinds).
//   Start = the seed file node and, when the seed names a definition, its node. Breadth-first, unbounded.
//   A reference path (a reference file, or the file of a reference definition) is
//     "only through a missing kind"  reachable with every kind, not reachable once the MISSING kinds are removed;
//     "without"                      reachable with the MISSING kinds removed;
//     "not reached"                  not reachable at all.
//   A task is in group NEEDS when at least one of its reference paths is "only through a missing kind";
//   otherwise in group WITHOUT. Sensitivity: the same with a 3-hop bound (graphify's frozen depth).
// Outputs (here): linkgroups.json (aggregates; per-commit difference arrays). Reads tasks.jsonl.gz (step 1).
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const G = path.resolve(__dirname, '..', '..');
const BUILD = path.resolve(G, '..', '..', 'build');
const S = require(path.join(BUILD, 'arms', 'common', 'score'));
const CMP = require(path.join(BUILD, 'arms', 'common', 'compare'));
const H = require(path.join(BUILD, 'arms', 'common', 'harness'));
const { classOf } = require(path.join(BUILD, 'arms', 'common', 'edgeclasses'));
const OUT = __dirname;
const SEED = 20261112; const NRES = 10000;
const r4 = (x) => (x == null ? null : Math.round(x * 1e4) / 1e4);
const CLASSES = new Set(['structure', 'imports', 'calls', 'http', 'tests', 'data', 'config', 'history']);
const MISSING = new Set(['registers_route', 'calls_url', 'test_calls_route', 'reads_table', 'writes_table', 'writes_column', 'migration_touches', 'foreign_key', 'reads_setting', 'co_changed']);
const REFS = path.join(BUILD, 'sealed', 'grader', 'heldout', 'refs_heldout.jsonl');
const refRaw = new Map(fs.readFileSync(REFS, 'utf8').split('\n').filter(Boolean).map((l) => { const r = JSON.parse(l); return [r.id, r]; }));
const refs = S.readRefs(REFS);
const tasks = fs.readFileSync(path.join(BUILD, 'tasks', 'tasks.jsonl'), 'utf8').split('\n').filter(Boolean).map(JSON.parse).filter((t) => t.split === 'heldout' && t.set === 'T1');
const per = zlib.gunzipSync(fs.readFileSync(path.join(OUT, 'tasks.jsonl.gz'))).toString('utf8').split('\n').filter(Boolean).map(JSON.parse);
const readJsonl = (f) => fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map(JSON.parse);

function graphOf(sha) {
  const nodes = readJsonl(path.join(BUILD, 'facts', 'cache', sha, 'nodes.jsonl'));
  const kindOf = new Map(nodes.map((n) => [n.id, n.kind]));
  const pathOf = new Map(nodes.map((n) => [n.id, n.path]));
  const best = new Map();
  for (const e of readJsonl(path.join(BUILD, 'facts', 'cache', sha, 'edges.jsonl'))) {
    if (e.src === e.dst) continue;
    let cls; try { cls = classOf(e.kind, kindOf.get(e.src)); } catch (x) { continue; }
    if (!CLASSES.has(cls)) continue;
    const k = e.kind === 'co_changed' ? [e.kind, ...[e.src, e.dst].sort()].join('\u0001') : [e.kind, e.src, e.dst].join('\u0001');
    const c = e.confidence == null ? 1 : e.confidence;
    if (!best.has(k) || best.get(k).c < c) best.set(k, { kind: e.kind, s: e.src, d: e.dst, c });
  }
  const adjAll = new Map(); const adjNo = new Map();
  const add = (m, a, b) => { if (!m.has(a)) m.set(a, []); m.get(a).push(b); };
  for (const e of best.values()) {
    if (e.c < 0.5) continue;
    add(adjAll, e.s, e.d); add(adjAll, e.d, e.s);
    if (!MISSING.has(e.kind)) { add(adjNo, e.s, e.d); add(adjNo, e.d, e.s); }
  }
  return { nodes, pathOf, adjAll, adjNo };
}
function bfs(adj, starts) {
  const dist = new Map(); let fr = [];
  for (const s of starts) if (!dist.has(s)) { dist.set(s, 0); fr.push(s); }
  let d = 0;
  while (fr.length) { d++; const nx = []; for (const n of fr) for (const m of adj.get(n) || []) if (!dist.has(m)) { dist.set(m, d); nx.push(m); } fr = nx; }
  return dist;
}
// file credit at 8,000 tokens, as score.js credits a file (whole path line shown)
function shownPaths(a, b = '8000') {
  const bb = a.budgets[b]; const s = new Set();
  for (let i = 0; i < bb.n_full; i++) s.add(a.items[i].path);
  if (bb.cut && a.items[bb.n_full]) { const ps = bb.cut.path_shown !== undefined ? bb.cut.path_shown : !!(bb.cut.shown && bb.cut.shown.length); if (ps) s.add(a.items[bb.n_full].path); }
  return s;
}
const ANS = {
  graphify: new Map(H.readGzJsonl(path.join(G, 'answers', 'heldout', '66367cd303fdd75b.T1.jsonl.gz')).map((a) => [a.id, a])),
  relational: new Map(H.readGzJsonl(path.join(BUILD, 'results', 'heldout', 'relational', 'primary', 'T1.jsonl.gz')).map((a) => [a.id, a])),
  search: new Map(H.readGzJsonl(path.join(BUILD, 'results', 'heldout', 'search', 'primary', 'T1.jsonl.gz')).map((a) => [a.id, a])),
};
const byParent = new Map(); for (const t of tasks) { if (!byParent.has(t.parent)) byParent.set(t.parent, []); byParent.get(t.parent).push(t); }
const taskClass = {}; const taskClass3 = {};
const unit = { unbounded: {}, hop3: {} }; // class -> {n, shown: {arm: count}}
const bump = (o, cls, shown) => { o[cls] ||= { reference_files: 0, shown_within_8000: { graphify: 0, relational: 0, search: 0 } }; o[cls].reference_files++; for (const a of Object.keys(shown)) if (shown[a]) o[cls].shown_within_8000[a]++; };
let pi = 0;
for (const [sha, ts] of byParent) {
  const g = graphOf(sha); pi++;
  const byPath = new Map(); for (const n of g.nodes) if (n.path) { if (!byPath.has(n.path)) byPath.set(n.path, []); byPath.get(n.path).push(n.id); }
  for (const t of ts) {
    const starts = ['file:' + t.seed.path];
    if (t.seed.symbol) { const sym = g.nodes.find((n) => n.path === t.seed.path && n.line_start === t.seed.symbol.start && n.kind !== 'file'); if (sym) starts.push(sym.id); }
    const dA = bfs(g.adjAll, starts); const dN = bfs(g.adjNo, starts);
    const ref = refs.get(t.id);
    const rpaths = [...new Set([...ref.files, ...ref.defs.map((d) => d.path)])];
    const dmin = (dist, p) => { let m = Infinity; for (const id of byPath.get(p) || []) if (dist.has(id)) m = Math.min(m, dist.get(id)); return m; };
    let needs = false; let needs3 = false;
    const shown = { graphify: shownPaths(ANS.graphify.get(t.id)), relational: shownPaths(ANS.relational.get(t.id)), search: shownPaths(ANS.search.get(t.id)) };
    for (const p of rpaths) {
      const a = dmin(dA, p); const n = dmin(dN, p);
      const cls = a === Infinity ? 'not_reached' : n === Infinity ? 'only_through_missing_kind' : 'without_missing_kind';
      const cls3 = a > 3 ? 'not_within_3_hops' : n > 3 ? 'only_through_missing_kind' : 'without_missing_kind';
      if (cls === 'only_through_missing_kind') needs = true;
      if (cls3 === 'only_through_missing_kind') needs3 = true;
      if (ref.files.includes(p)) { const sh = { graphify: shown.graphify.has(p), relational: shown.relational.has(p), search: shown.search.has(p) }; bump(unit.unbounded, cls, sh); bump(unit.hop3, cls3, sh); }
    }
    taskClass[t.id] = needs ? 'NEEDS' : 'WITHOUT';
    taskClass3[t.id] = needs3 ? 'NEEDS' : 'WITHOUT';
  }
  if (pi % 10 === 0) console.log('parents', pi, '/', byParent.size);
}
const perOf = (arm) => per.filter((t) => t.arm === arm && t.set === 'T1');
function block(cmap) {
  const out = {};
  for (const grp of ['NEEDS', 'WITHOUT']) {
    const ids = new Set(Object.entries(cmap).filter(([, v]) => v === grp).map(([k]) => k));
    const b = { tasks: ids.size, arms: {} };
    const cv = {};
    for (const a of ['graphify', 'relational', 'search', 'floor-co', 'floor-dir']) { const rows = S.clusterValues(perOf(a).filter((t) => ids.has(t.id))); cv[a] = rows; b.arms[a] = { primary: r4(S.mean(rows.map((r) => r.primary))), commits: rows.length }; }
    const ps = CMP.pairedStats(new Map(cv.graphify.map((r) => [r.cluster, r.primary])), new Map(cv.relational.map((r) => [r.cluster, r.primary])), NRES, SEED);
    b.graphify_minus_typed = { diff: r4(ps.diff), ci95: ps.ci95 && ps.ci95.map(r4), commits: ps.clusters, per_commit_diffs: [...new Map(cv.graphify.map((r) => [r.cluster, r.primary]))].filter(([k]) => cv.relational.some((r) => r.cluster === k)).sort((x, y) => (x[0] < y[0] ? -1 : 1)).map(([k, v]) => r4(v - cv.relational.find((r) => r.cluster === k).primary)) };
    out[grp] = b;
  }
  return out;
}
const fin = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, { ...v, share_shown: Object.fromEntries(Object.entries(v.shown_within_8000).map(([a, c]) => [a, r4(c / v.reference_files)])) }]));
const res = { written_at: new Date().toISOString(), rule: 'see the header of linkgroups.js', missing_kinds: [...MISSING], typed_classes: [...CLASSES], min_confidence: 0.5,
  tasks: tasks.length, unbounded: { groups: block(taskClass), reference_files_by_class: fin(unit.unbounded) }, hop3_sensitivity: { groups: block(taskClass3), reference_files_by_class: fin(unit.hop3) } };
fs.writeFileSync(path.join(OUT, 'linkgroups.json'), JSON.stringify(res, null, 1));
for (const k of ['unbounded', 'hop3_sensitivity']) { console.log(k); for (const [g, b] of Object.entries(res[k].groups)) console.log(' ', g, b.tasks, JSON.stringify(b.arms), b.graphify_minus_typed.diff, b.graphify_minus_typed.ci95, b.graphify_minus_typed.commits); console.log(JSON.stringify(res[k].reference_files_by_class)); }
