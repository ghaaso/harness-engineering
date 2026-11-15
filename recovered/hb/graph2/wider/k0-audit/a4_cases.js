'use strict';
// Audit check 4: hand-built dependency cases. Base = the frozen commit's snapshot (copied). Each case
// writes a mutated copy of it (new nodes/edges in a NEW file, or a rename caused by another file) into
// k0-audit/fake/, with file blob ids changed only for the files the mutation touches. The answer and its
// dependency record are computed at the base with k0's own recorder and programs (rec.js, programs.js,
// load.js), then every policy's validity rule (copied verbatim from k0/replay.js makeChecker and its
// cutoff branch) is evaluated against the mutated snapshot, and the served answer is compared with the
// answer recomputed at the mutated snapshot.
const fs = require('fs');
const path = require('path');
const K0 = path.resolve(__dirname, '..', 'k0');
const C = require(path.join(K0, 'conf'));
const ORIG_FACTS = C.FACTS; const ORIG_DATA = C.DATA;
const FAKE = path.join(__dirname, 'fake'); const FDATA = path.join(__dirname, 'fakedata');
fs.mkdirSync(path.join(FDATA, 'blobs'), { recursive: true });
const { Snap, INT } = require(path.join(K0, 'load'));
const { Rec, derivation, flatDep } = require(path.join(K0, 'rec'));
const { P } = require(path.join(K0, 'programs'));
C.FACTS = FAKE; C.DATA = FDATA;
const FROZEN = C.FROZEN;
const rdl = (f) => fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const baseN = rdl(path.join(ORIG_FACTS, FROZEN, 'nodes.jsonl'));
const baseE = rdl(path.join(ORIG_FACTS, FROZEN, 'edges.jsonl'));
const baseMeta = fs.readFileSync(path.join(ORIG_FACTS, FROZEN, 'meta.json'), 'utf8');
const baseBlobs = JSON.parse(fs.readFileSync(path.join(ORIG_DATA, 'blobs', FROZEN + '.json'), 'utf8'));
function writeSnap(name, nodes, edges, blobs) {
  const d = path.join(FAKE, name); fs.mkdirSync(d, { recursive: true });
  fs.writeFileSync(path.join(d, 'meta.json'), baseMeta);
  fs.writeFileSync(path.join(d, 'nodes.jsonl'), nodes.map((x) => JSON.stringify(x)).join('\n') + '\n');
  fs.writeFileSync(path.join(d, 'edges.jsonl'), edges.map((x) => JSON.stringify(x)).join('\n') + '\n');
  fs.writeFileSync(path.join(FDATA, 'blobs', name + '.json'), JSON.stringify(blobs));
  blobMaps.set(name, blobs);
}
const blobMaps = new Map();
writeSnap('base', baseN, baseE, baseBlobs);
const QS = JSON.parse(fs.readFileSync(path.join(K0, 'data', 'questions.json'), 'utf8')).questions;
const Q = (id) => QS.find((q) => q.qid === id);

// ---- copied from k0/replay.js (makeChecker, truth, entries) ----
function makeChecker(S) {
  const n = INT.size + 16;
  const hf = new Int32Array(n); const hs = new Int32Array(n);
  for (const g of S.G.nodes) { hf[g.key] = g.hf; hs[g.key] = g.hs; }
  for (const e of S.G.edges) { hf[e.key] = e.hf; hs[e.key] = e.hs; }
  function fact(d, sem, positiveOnly) {
    for (let i = 0; i < d.nk.length; i++) { const k = d.nk[i]; const cur = k < n ? (sem && !d.npos[i] ? hs[k] : hf[k]) : 0; if (cur !== (sem && !d.npos[i] ? d.nhs[i] : d.nhf[i])) return 1; }
    for (let i = 0; i < d.ek.length; i++) { const k = d.ek[i]; const cur = k < n ? (sem && !d.epos[i] ? hs[k] : hf[k]) : 0; if (cur !== (sem && !d.epos[i] ? d.ehs[i] : d.ehf[i])) return 1; }
    if (!positiveOnly) for (let i = 0; i < d.pk.length; i++) if (S.patHash(d.pk[i]) !== d.ph[i]) return 2;
    return 0;
  }
  function file(d) { for (let i = 0; i < d.fk.length; i++) if (S.blobOf(INT.str(d.fk[i]).slice(2)) !== d.fb[i]) return 1; return 0; }
  return { fact, file };
}
function truthAt(S, q) { const rec = new Rec(S); const ans = P[q.kind](rec, q.target); const dv = derivation(rec, ans); return { ans: JSON.stringify(ans), dv, flat: flatDep(dv) }; }
const subFlats = (t) => t.dv.subs.map((s) => ({ name: s.name, args: JSON.stringify(s.args), res: JSON.stringify(s.d.result), dep: flatDep(s.d) }));

function evaluate(caseName, q, S0, S1, what) {
  const t0 = truthAt(S0, q); const t1 = truthAt(S1, q);
  const ck = makeChecker(S1);
  const files = [...t0.flat.fk].map((k) => INT.str(k).slice(2));
  const b0 = blobMaps.get(S0.sha); const b1 = blobMaps.get(S1.sha);
  const changedFiles = [...new Set([...Object.keys(b0), ...Object.keys(b1)])].filter((p) => b0[p] !== b1[p]);
  const out = { case: caseName, qid: q.qid, kind: q.kind, what, answer_changed: t0.ans !== t1.ans, before: t0.ans.slice(0, 300), after: t1.ans.slice(0, 300),
    dep_files: files.length, changed_files: changedFiles, changed_files_in_dep_set: changedFiles.filter((p) => files.includes(p)), policies: {} };
  const verdict = (serve) => (serve ? (t0.ans === t1.ans ? 'served, fresh' : 'SERVED STALE') : (t0.ans === t1.ans ? 'recomputed (unneeded)' : 'recomputed (needed)'));
  out.policies.file = verdict(ck.file(t0.flat) === 0);
  out.policies.fact_pos = verdict(ck.fact(t0.flat, false, true) === 0);
  out.policies.fact = verdict(ck.fact(t0.flat, false) === 0);
  out.policies.fact_sem = verdict(ck.fact(t0.flat, true) === 0);
  for (const pol of ['cutoff', 'cutoff_sem']) {
    const sem = pol === 'cutoff_sem';
    let serve = ck.fact(flatDep({ own: t0.dv.own, subs: [] }), sem) === 0;
    const s0 = subFlats(t0); const s1 = subFlats(t1);
    for (let i = 0; i < s0.length && serve; i++) {
      if (ck.fact(s0[i].dep, sem) === 0) continue;
      const fresh = s1.find((x) => x.name === s0[i].name && x.args === s0[i].args);
      if (!(fresh && fresh.res === s0[i].res)) serve = false;
    }
    out.policies[pol] = verdict(serve);
  }
  out.policies.never = verdict(true);
  return out;
}

const results = [];
const S0 = new Snap('base');
const addFile = (p, runtime, slice) => ({ id: 'file:' + p, kind: 'file', path: p, name: path.basename(p), line_start: 1, line_end: 20, signature: null, runtime, slice, is_test: false, tokens: 60 });
const addFn = (p, nm, runtime, slice, kind = 'function') => ({ id: 'sym:' + p + '#' + nm, kind, path: p, name: nm, line_start: 2, line_end: 10, signature: 'function ' + nm + '()', runtime, slice, is_test: false, tokens: 40 });
const E = (src, dst, kind, p, line, attrs = null) => ({ src, dst, kind, evidence_path: p, evidence_line: line, confidence: 1, attrs });

// case 1: a new caller in another (new) file of an existing client call site of a route
{
  const q = Q('tq7'); const route = 'route:backend ' + q.target.route;
  const nodeOf = new Map(baseN.map((n) => [n.id, n]));
  const site = baseE.find((e) => e.kind === 'calls_url' && e.dst === route && nodeOf.get(e.src) && !nodeOf.get(e.src).is_test && nodeOf.get(e.src).runtime !== 'backend').src;
  const p = 'src/features/audit/NewCaller.jsx';
  const fn = addFn(p, 'auditNewCaller', 'web', 'audit');
  writeSnap('c1', [...baseN, addFile(p, 'web', 'audit'), fn], [...baseE, E(fn.id, site, 'calls', p, 4, { how: 'name' })], { ...baseBlobs, [p]: 'a0d1700000000000000000000000000000000001' });
  results.push(evaluate('1 new caller in another file', q, S0, new Snap('c1'), 'new function in a new file calls the existing call site ' + site));
}
// case 2: a new reader of a setting, in a new file
{
  const q = Q('tq5'); const p = 'backend/app/features/audit/reader.py';
  const fn = addFn(p, 'read_flag', 'backend', 'audit');
  writeSnap('c2', [...baseN, addFile(p, 'backend', 'audit'), fn], [...baseE, E(fn.id, 'setting:' + q.target.name, 'reads_setting', p, 4)], { ...baseBlobs, [p]: 'a0d1700000000000000000000000000000000002' });
  results.push(evaluate('2 new reader of a setting', q, S0, new Snap('c2'), 'new function in a new file reads setting:' + q.target.name));
}
// case 3: a new route (new router file) registers an existing handler -> change_reach of the handler
{
  const q = Q('tq8'); const p = 'backend/app/features/audit/router.py';
  const r = { id: 'route:backend POST /api/audit/consent', kind: 'route', path: p, name: 'POST /api/audit/consent', line_start: 3, line_end: 6, signature: "router.post('/consent')", runtime: 'backend', slice: 'audit', is_test: false, tokens: 12 };
  writeSnap('c3', [...baseN, addFile(p, 'backend', 'audit'), r], [...baseE, E(r.id, q.target.sid, 'registers_route', p, 3, { mounted: true })], { ...baseBlobs, [p]: 'a0d1700000000000000000000000000000000003' });
  results.push(evaluate('3 new route registers an existing handler', q, S0, new Snap('c3'), 'new route in a new router file registers ' + q.target.sid));
}
// case 4: a removed test (its test file deleted) for a tests_reach question with a non-empty real list
{
  const S = S0; let pick = null;
  for (const q of QS.filter((x) => x.kind === 'tests_reach')) { if (!S.node.get(q.target.sid)) continue; const a = JSON.parse(truthAt(S, q).ans); if (a.real.length) { pick = { q, a }; break; } }
  const victim = pick.a.real[0];
  const gone = new Set(baseN.filter((n) => n.path === victim).map((n) => n.id));
  const blobs = { ...baseBlobs }; delete blobs[victim];
  writeSnap('c4', baseN.filter((n) => !gone.has(n.id)), baseE.filter((e) => !gone.has(e.src) && !gone.has(e.dst) && e.evidence_path !== victim), blobs);
  results.push(evaluate('4 removed test', pick.q, S0, new Snap('c4'), 'test file ' + victim + ' deleted'));
}
// case 4b: a test stops reaching the target because an intermediate helper (in another, non-test file) drops its call
{
  let done = false;
  for (const q of QS.filter((x) => x.kind === 'tests_reach')) {
    if (done || !S0.node.get(q.target.sid)) continue;
    const a = JSON.parse(truthAt(S0, q).ans); if (!a.real.length) continue;
    // edges into the target from non-test nodes in another file
    const into = baseE.filter((e) => e.dst === q.target.sid && e.kind === 'calls');
    for (const e of into) {
      const src = S0.node.get(e.src); if (!src || src.is_test || src.path === S0.node.get(q.target.sid).path) continue;
      const blobs = { ...baseBlobs, [e.evidence_path]: 'a0d1700000000000000000000000000000000004' };
      writeSnap('c4b', baseN, baseE.filter((x) => x !== e), blobs);
      const r = evaluate('4b test no longer reaches the target (a helper in another file drops its call)', q, S0, new Snap('c4b'), 'removed edge ' + e.src + ' -calls-> ' + e.dst + ' (file ' + e.evidence_path + ' edited)');
      if (r.answer_changed) { results.push(r); done = true; break; }
    }
  }
}
// case 5: a renamed symbol whose own file does not change: the route id changes because its prefix is set
// in another file (backend/app/main.py edited); client calls_url edges no longer match it
{
  const q = Q('tq7'); const old = 'route:backend ' + q.target.route; const nu = old.replace('/api/jobs/', '/api/v2/jobs/');
  const nodes = baseN.map((n) => (n.id === old ? { ...n, id: nu, name: n.name.replace('/api/jobs/', '/api/v2/jobs/') } : n));
  const edges = baseE.filter((e) => !(e.kind === 'calls_url' && e.dst === old)).map((e) => (e.src === old ? { ...e, src: nu } : e.dst === old ? { ...e, dst: nu } : e));
  writeSnap('c5', nodes, edges, { ...baseBlobs, 'backend/app/main.py': 'a0d1700000000000000000000000000000000005' });
  results.push(evaluate('5 renamed route id (prefix set in another file)', q, S0, new Snap('c5'), 'route id ' + old + ' -> ' + nu + '; main.py edited; client calls_url edges to the old id dropped'));
}
// case 5b: a renamed caller symbol (its own file edited)
{
  const q = Q('tq7'); const route = 'route:backend ' + q.target.route;
  const nodeOf = new Map(baseN.map((n) => [n.id, n]));
  const site = baseE.find((e) => e.kind === 'calls_url' && e.dst === route && nodeOf.get(e.src) && !nodeOf.get(e.src).is_test && nodeOf.get(e.src).runtime !== 'backend').src;
  const caller = baseE.find((e) => e.kind === 'calls' && e.dst === site && nodeOf.get(e.src) && !nodeOf.get(e.src).is_test && e.src.startsWith('sym:'));
  if (caller) {
    const old = caller.src; const nu = old + 'Renamed'; const p = nodeOf.get(old).path;
    const nodes = baseN.map((n) => (n.id === old ? { ...n, id: nu, name: n.name + 'Renamed' } : n));
    const edges = baseE.map((e) => (e.src === old ? { ...e, src: nu } : e.dst === old ? { ...e, dst: nu } : e));
    writeSnap('c5b', nodes, edges, { ...baseBlobs, [p]: 'a0d1700000000000000000000000000000000006' });
    results.push(evaluate('5b renamed caller symbol (own file edited)', q, S0, new Snap('c5b'), 'caller ' + old + ' renamed'));
  }
}
fs.writeFileSync(path.join(__dirname, 'a4_cases.json'), JSON.stringify(results, null, 1));
for (const r of results) console.log(JSON.stringify({ case: r.case, q: r.qid, changed: r.answer_changed, chg_files: r.changed_files, in_dep: r.changed_files_in_dep_set, pol: r.policies, before: r.before.slice(0, 160), after: r.after.slice(0, 160) }));
