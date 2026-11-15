'use strict';
// Question set for the K0 replay -> data/questions.json
//  (a) the 50 structured questions of the finished test (targets parsed by the shared parser
//      lib/common/tqtarget.js, the absent-member rule applied against the frozen commit's graph)
//  (b) generated questions, 25 per kind, by this seeded rule (seed conf.SEED, mulberry32):
//      candidates = anchor nodes of the right kind (below) that exist in at least 20 consecutive
//      snapshots of main's first-parent chain; not an anchor of an (a) question; per kind the candidates
//      are split by runtime (backend / web incl. the ops console / mobile), each list sorted by node id
//      and shuffled, then taken round-robin over runtimes until 25 are taken.
//        screen_tables        file:<path> of a non-test web or mobile file holding a component or screen
//        tests_reach          a non-test function, method, class or component
//        invariants_on_file   file:<path> of a file holding a node that a constrains edge points to at the
//                             frozen commit (otherwise every answer is empty)
//        other_half           a non-test backend function or method in a service.py or repository.py
//        setting_readers      a setting node (target form chosen from its id, as the parser would read it)
//        migrations_touch_table  a table node
//        route_clients        a backend route node
//        change_reach         a non-test function or method
//  (c) completion: 100 non-test code files (.py .ts .tsx .js .jsx .mjs) with the same 20-snapshot rule,
//      34 backend, 33 web, 33 mobile, by the same seeded shuffle.
// Deviation from the brief: the brief said "from the first snapshot graph". The first snapshot is the
// repository's first commit (237 nodes, web only: no route, table, setting, migration or test node), so
// anchors are drawn from every snapshot instead, with the 20-consecutive-snapshot rule.
// Also written: for every question, the snapshots (all 190) at which its anchor exists.
const fs = require('fs');
const path = require('path');
const C = require('./conf');
const tqt = require('./lib/common/tqtarget');

function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const rnd = mulberry32(C.SEED);
const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
const rtOf = (r) => (r === 'backend' ? 'backend' : r === 'web' || r === 'ops' ? 'web' : r === 'mobile' ? 'mobile' : 'other');

const chain = JSON.parse(fs.readFileSync(path.join(C.DATA, 'chain.json'), 'utf8'));
const tree = JSON.parse(fs.readFileSync(path.join(C.DATA, 'tree.json'), 'utf8'));
const mainShas = chain.snapshots.map((x) => x.sha);
const allShas = tree.order;
const rd = (f) => fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map(JSON.parse);

// node existence per snapshot (sid -> Set of snapshot index in allShas); names of setting nodes
const exist = new Map(); const nodeAt = new Map(); // sid -> last seen record
const namesAt = []; // per snapshot: Map name -> true (for config targets)
allShas.forEach((sha, si) => {
  const names = new Set();
  for (const l of fs.readFileSync(path.join(C.FACTS, sha, 'nodes.jsonl'), 'utf8').split('\n')) {
    if (!l) continue;
    const n = JSON.parse(l);
    let s = exist.get(n.id); if (!s) { s = new Set(); exist.set(n.id, s); }
    s.add(si);
    if (sha === C.FROZEN || !nodeAt.has(n.id)) nodeAt.set(n.id, n);
    if (n.name != null) names.add(n.name);
  }
  namesAt.push(names);
});
const mainIdx = mainShas.map((s) => allShas.indexOf(s));
function maxRunMain(sid) {
  const s = exist.get(sid); if (!s) return 0;
  let best = 0; let cur = 0;
  for (const i of mainIdx) { if (s.has(i)) { cur++; if (cur > best) best = cur; } else cur = 0; }
  return best;
}
const frozenEdges = rd(path.join(C.FACTS, C.FROZEN, 'edges.jsonl'));
const frozenNodes = rd(path.join(C.FACTS, C.FROZEN, 'nodes.jsonl'));
const fz = new Map(frozenNodes.map((n) => [n.id, n]));
const have = new Set(fz.keys());

// (a) the 50
const qs = [];
const tq = rd(path.join(C.TASKS, 'tq_questions.jsonl'));
function anchorsOf(kind, tg) {
  // the node ids whose presence makes the question live
  if (tg.sid) return [tg.sid];
  if (tg.path) return ['file:' + tg.path];
  if (kind === 'setting_readers') { const a = []; if (tg.name) a.push('setting:' + tg.name); if (tg.env) a.push('setting:env/' + tg.env); if (tg.config) a.push('name:' + tg.config); return a; }
  if (kind === 'migrations_touch_table') return ['table:' + tg.table];
  if (kind === 'route_clients') { const rs = tg.routes || [tg.route]; return rs.flatMap((r) => ['route:backend ' + r, 'route:ops ' + r]); }
  throw new Error('anchor ' + kind);
}
function runtimeOfTarget(kind, tg) {
  for (const a of anchorsOf(kind, tg)) {
    if (a.startsWith('name:')) { const n = frozenNodes.find((x) => x.name === a.slice(5)); if (n) return rtOf(n.runtime); continue; }
    const n = fz.get(a); if (n) return rtOf(n.runtime);
  }
  return 'other';
}
const usedAnchors = new Set();
for (const q of tq) {
  let tg = tqt.parse(q);
  if (tg.sid != null && tg.sid.startsWith('sym:')) tg = tqt.nearest(tg.sid, have);
  const anchors = anchorsOf(q.kind, tg);
  anchors.forEach((a) => usedAnchors.add(a));
  qs.push({ qid: 'tq' + q.id, set: 'tq50', kind: q.kind, target: tg, runtime: runtimeOfTarget(q.kind, tg), anchors, split: q.split });
}

// (b) generated
const constrainedPaths = new Set();
for (const e of frozenEdges) if (e.kind === 'constrains') { const t = fz.get(e.dst); if (t && t.path) constrainedPaths.add(t.path); }
const compPaths = new Set();
for (const [, n] of nodeAt) if ((n.kind === 'component' || n.kind === 'screen') && n.path && !n.is_test) compPaths.add(n.path);
const settingTarget = (sid, n) => {
  if (sid.startsWith('setting:env/')) return { env: sid.slice('setting:env/'.length) };
  if (sid.indexOf('#') > 0) return { config: n.name };
  return { name: sid.slice('setting:'.length) };
};
const GEN = {
  screen_tables: (sid, n) => n.kind === 'file' && !n.is_test && compPaths.has(n.path) && (n.path.startsWith('src/') || n.path.startsWith('technician-app/')) && { path: n.path },
  tests_reach: (sid, n) => ['function', 'method', 'class', 'component'].includes(n.kind) && !n.is_test && sid.startsWith('sym:') && { sid },
  invariants_on_file: (sid, n) => n.kind === 'file' && constrainedPaths.has(n.path) && { path: n.path },
  other_half: (sid, n) => ['function', 'method'].includes(n.kind) && !n.is_test && n.runtime === 'backend' && /\/(service|repository)\.py$/.test(n.path || '') && sid.startsWith('sym:') && { sid },
  setting_readers: (sid, n) => n.kind === 'setting' && settingTarget(sid, n),
  migrations_touch_table: (sid, n) => n.kind === 'table' && { table: sid.slice('table:'.length) },
  route_clients: (sid, n) => n.kind === 'route' && sid.startsWith('route:backend ') && { route: sid.slice('route:backend '.length) },
  change_reach: (sid, n) => ['function', 'method'].includes(n.kind) && !n.is_test && sid.startsWith('sym:') && { sid },
};
const PER_KIND = 25;
const sids = [...nodeAt.keys()].sort();
const eligible = new Map();
for (const sid of sids) eligible.set(sid, maxRunMain(sid) >= 20);
const genCounts = {};
for (const kind of Object.keys(GEN)) {
  const byRt = new Map();
  for (const sid of sids) {
    if (!eligible.get(sid) || usedAnchors.has(sid)) continue;
    const n = nodeAt.get(sid);
    const tg = GEN[kind](sid, n);
    if (!tg) continue;
    const rt = rtOf(n.runtime);
    if (!byRt.has(rt)) byRt.set(rt, []);
    byRt.get(rt).push({ sid, tg, rt });
  }
  const order = ['backend', 'web', 'mobile', 'other'].filter((r) => byRt.has(r));
  const lists = order.map((r) => shuffle(byRt.get(r)));
  const taken = [];
  for (let i = 0; taken.length < PER_KIND && lists.some((l) => l.length > i); i++) for (const l of lists) if (l[i] && taken.length < PER_KIND) taken.push(l[i]);
  genCounts[kind] = { taken: taken.length, candidates: Object.fromEntries(order.map((r, j) => [r, lists[j].length])) };
  taken.forEach((x, j) => qs.push({ qid: 'g_' + kind + '_' + j, set: 'gen', kind, target: x.tg, runtime: x.rt, anchors: [x.sid] }));
}

// (c) completion seeds
const CODE = /\.(py|ts|tsx|js|jsx|mjs)$/;
const byRt = new Map();
for (const sid of sids) {
  const n = nodeAt.get(sid);
  if (n.kind !== 'file' || n.is_test || !CODE.test(n.path) || !eligible.get(sid)) continue;
  const rt = rtOf(n.runtime); if (rt === 'other') continue;
  if (!byRt.has(rt)) byRt.set(rt, []);
  byRt.get(rt).push(sid);
}
const quota = { backend: 34, web: 33, mobile: 33 };
const compCounts = {};
for (const rt of ['backend', 'web', 'mobile']) {
  const l = shuffle(byRt.get(rt) || []).slice(0, quota[rt]);
  compCounts[rt] = { taken: l.length, candidates: (byRt.get(rt) || []).length };
  l.forEach((sid, j) => qs.push({ qid: 'c_' + rt + '_' + j, set: 'completion', kind: 'completion', target: { path: sid.slice(5) }, runtime: rt, anchors: [sid] }));
}

// live snapshots per question: where any anchor exists
for (const q of qs) {
  const s = new Set();
  for (const a of q.anchors) {
    if (a.startsWith('name:')) { namesAt.forEach((ns, i) => { if (ns.has(a.slice(5))) s.add(i); }); continue; }
    for (const i of exist.get(a) || []) s.add(i);
  }
  q.exists_at = [...s].sort((a, b) => a - b).map((i) => allShas[i]);
  q.max_run_main = Math.max(...q.anchors.map((a) => (a.startsWith('name:') ? 0 : maxRunMain(a))));
}
const counts = {};
for (const q of qs) { const k = q.set + '/' + q.kind + '/' + q.runtime; counts[k] = (counts[k] || 0) + 1; }
fs.writeFileSync(path.join(C.DATA, 'questions.json'), JSON.stringify({ seed: C.SEED, genCounts, compCounts, counts, questions: qs }, null, 1));
console.log(JSON.stringify({ n: qs.length, genCounts, compCounts, counts }, null, 1));
