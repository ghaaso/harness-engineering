'use strict';
// REFUTER 1 independent held-out re-score. Written from protocol addendum 2 section A, addendum 3
// item 18 and addendum 5 item 5. Imports nothing from arms/ (no harness, no score.js, no compare.js,
// no tq_score.js). Reads results/heldout/ answers and sealed/references.jsonl, sealed/tq_reference.jsonl.
// Usage: node rescore.js <build>   -> writes into <build>/audit/heldout/rescore/out/
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');

const BUILD = path.resolve(process.argv[2]);
const OUT = path.join(BUILD, 'audit/heldout/rescore/out');
fs.mkdirSync(OUT, { recursive: true });
const SEED = 977; // my own seed (grader used 20261112)
const NBOOT = 10000;
const BUDGETS = [2000, 4000, 8000, 16000];
const SETS = ['T1', 'T1x', 'T2', 'T3', 'T4'];
const log = (...a) => { const s = a.join(' '); console.error(s); fs.appendFileSync(path.join(OUT, 'progress.log'), s + '\n'); };
fs.writeFileSync(path.join(OUT, 'progress.log'), 'start ' + new Date().toISOString() + '\n');

// ---------- references ----------
const refs = new Map();
for (const l of fs.readFileSync(path.join(BUILD, 'sealed/references.jsonl'), 'utf8').split(/\r?\n/)) {
  if (!l) continue; const r = JSON.parse(l);
  if (r.split === 'heldout' && SETS.includes(r.set)) refs.set(r.id, r);
}
function clusterOf(ref, t3mode) {
  if (ref.set === 'T4') return ref.fix_commit;
  if (ref.set === 'T3') return t3mode === 'parent' ? ref.parent : ref.id;
  return ref.commit;
}

// ---------- answers ----------
function readGz(f) { return zlib.gunzipSync(fs.readFileSync(f)).toString('utf8').split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l)); }
const ROLES = [];
const HO = path.join(BUILD, 'results/heldout');
for (const arm of fs.readdirSync(HO)) {
  const ad = path.join(HO, arm);
  if (!fs.statSync(ad).isDirectory() || arm === 'tq' || arm.startsWith('_')) continue;
  for (const role of fs.readdirSync(ad)) ROLES.push({ arm, role });
}

// inventory hashes (independent check that the files read are the logged ones)
const inv = JSON.parse(fs.readFileSync(path.join(HO, 'INVENTORY.json'), 'utf8'));
const invMap = new Map();
(function walk(x) { if (Array.isArray(x)) x.forEach(walk); else if (x && typeof x === 'object') { if (x.file && x.sha256) invMap.set(x.file.replace(/\\/g, '/'), x.sha256); else Object.values(x).forEach(walk); } })(inv);

// ---------- scoring (rule `content`) ----------
function shown(rec, B) {
  const b = rec.budgets[String(B)];
  const paths = new Set(); const lines = new Map();
  const add = (p, ls) => { if (!lines.has(p)) lines.set(p, new Set()); for (const x of ls || []) lines.get(p).add(x); };
  for (let k = 0; k < b.n_full; k++) { const it = rec.items[k]; paths.add(it.path); add(it.path, it.shown); }
  if (b.cut) {
    const it = rec.items[b.n_full];
    if (!it) throw new Error('cut item missing ' + rec.id);
    if (b.cut.path_shown) paths.add(it.path);
    add(it.path, b.cut.shown); // cut.shown lists only lines that fit whole
  }
  return { paths, lines, used: b.used };
}
function shownUnpadded(rec, B) {
  // same as shown() but pad items left out
  const b = rec.budgets[String(B)];
  const paths = new Set(); const lines = new Map();
  const add = (p, ls) => { if (!lines.has(p)) lines.set(p, new Set()); for (const x of ls || []) lines.get(p).add(x); };
  for (let k = 0; k < b.n_full; k++) { const it = rec.items[k]; if (it.pad) continue; paths.add(it.path); add(it.path, it.shown); }
  if (b.cut && !b.cut.pad) { const it = rec.items[b.n_full]; if (b.cut.path_shown) paths.add(it.path); add(it.path, b.cut.shown); }
  return { paths, lines };
}
function credit(s, ref) {
  let f = 0; let d = 0;
  for (const x of ref.files) if (s.paths.has(x.path)) f++;
  for (const x of ref.defs) { const ls = s.lines.get(x.path); if (ls) { for (const l of ls) if (l >= x.start && l <= x.end) { d++; break; } } }
  return { f, d };
}
function scoreTask(rec, ref) {
  const units = ref.files.length + ref.defs.length;
  const o = { id: rec.id, units, nF: ref.files.length, nD: ref.defs.length, lookups: rec.lookups };
  for (const B of BUDGETS) {
    const s = shown(rec, B); const c = credit(s, ref);
    o['r' + B] = units ? (c.f + c.d) / units : null;
    o['cf' + B] = c.f; o['cd' + B] = c.d; o['tok' + B] = s.used;
  }
  const su = shownUnpadded(rec, 8000); const cu = credit(su, ref);
  o.unpad8000 = units ? (cu.f + cu.d) / units : null;
  o.def8000 = ref.defs.length ? o.cd8000 / ref.defs.length : null;
  o.file8000 = ref.files.length ? o.cf8000 / ref.files.length : null;
  return o;
}
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
const median = (a) => { const s = [...a].sort((x, y) => x - y); const n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };
function clusterMeans(rows, key, t3mode) {
  const by = new Map();
  for (const r of rows) { if (r[key] == null) continue; const c = clusterOf(refs.get(r.id), t3mode); if (!by.has(c)) by.set(c, []); by.get(c).push(r[key]); }
  const m = new Map(); for (const [c, v] of by) m.set(c, mean(v)); return m;
}
function stats(cm) {
  const v = [...cm.values()]; const n = v.length; const m = mean(v);
  const ss = v.reduce((s, x) => s + (x - m) ** 2, 0);
  return { mean: m, se: Math.sqrt(ss / (n - 1)) / Math.sqrt(n), se_pop: Math.sqrt(ss / n) / Math.sqrt(n), clusters: n };
}

const perTask = {}; // key arm/role/set -> rows
const table = [];
const checks = [];
for (const { arm, role } of ROLES) {
  for (const set of SETS) {
    const rel = `${arm}/${role}/${set}.jsonl.gz`;
    const f = path.join(HO, rel);
    if (!fs.existsSync(f)) { checks.push('MISSING ' + rel); continue; }
    const sha = crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
    const invSha = invMap.get(rel) || invMap.get('results/heldout/' + rel);
    if (invSha && invSha !== sha) checks.push('SHA MISMATCH ' + rel);
    if (!invSha) checks.push('not in inventory map ' + rel);
    const recs = readGz(f); const rows = []; const ids = new Set();
    for (const rec of recs) {
      if (rec.split !== 'heldout' || rec.set !== set) checks.push('bad split/set ' + rel + ' ' + rec.id);
      if (ids.has(rec.id)) checks.push('dup ' + rel + ' ' + rec.id); ids.add(rec.id);
      const ref = refs.get(rec.id); if (!ref) { checks.push('no ref ' + rec.id); continue; }
      if (ref.parent !== rec.parent) checks.push('parent differs ' + rec.id);
      rows.push(scoreTask(rec, ref));
    }
    const nRef = [...refs.values()].filter((r) => r.set === set).length;
    if (rows.length !== nRef) checks.push(`count ${rel} ${rows.length} vs refs ${nRef}`);
    perTask[`${arm}/${role}/${set}`] = rows;
    const st = stats(clusterMeans(rows, 'r8000'));
    const row = { arm, role, set, tasks: rows.length, clusters: st.clusters, primary: st.mean, se: st.se, se_pop: st.se_pop,
      r2000: stats(clusterMeans(rows, 'r2000')).mean, r4000: stats(clusterMeans(rows, 'r4000')).mean, r16000: stats(clusterMeans(rows, 'r16000')).mean,
      unpad8000: stats(clusterMeans(rows, 'unpad8000')).mean,
      def8000: stats(clusterMeans(rows, 'def8000')).mean, file8000: stats(clusterMeans(rows, 'file8000')).mean,
      median_tokens_8000: median(rows.map((r) => r.tok8000)), median_lookups: median(rows.map((r) => r.lookups)) };
    if (set === 'T3') { const p = stats(clusterMeans(rows, 'r8000', 'parent')); row.primary_T3_parentclusters = p.mean; row.se_T3_parentclusters = p.se; row.clusters_T3_parent = p.clusters; }
    table.push(row);
  }
  log('scored', arm, role);
}
fs.writeFileSync(path.join(OUT, 'my_table.json'), JSON.stringify({ checks, rows: table }, null, 1));
{ const gz = zlib.gzipSync(Object.entries(perTask).map(([k, rows]) => rows.map((r) => JSON.stringify({ key: k, ...r })).join('\n')).join('\n')); fs.writeFileSync(path.join(OUT, 'my_tasks.jsonl.gz'), gz); }

// ---------- paired cluster bootstrap ----------
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function quant(sorted, q) { const h = (sorted.length - 1) * q; const lo = Math.floor(h); const hi = Math.ceil(h); return sorted[lo] + (sorted[hi] - sorted[lo]) * (h - lo); }
function pairedBoot(diffs, seed) {
  const n = diffs.length; const R = rng(seed); const bs = new Float64Array(NBOOT);
  for (let b = 0; b < NBOOT; b++) { let s = 0; for (let i = 0; i < n; i++) s += diffs[Math.floor(R() * n)]; bs[b] = s / n; }
  const so = Array.from(bs).sort((x, y) => x - y);
  return [quant(so, 0.025), quant(so, 0.975)];
}
function compareSets(aKey, bKey, set, metric) {
  const A = clusterMeans(perTask[`${aKey}/${set}`], metric); const Bm = clusterMeans(perTask[`${bKey}/${set}`], metric);
  const ks = [...A.keys()].filter((k) => Bm.has(k)).sort();
  if (ks.length !== A.size || ks.length !== Bm.size) throw new Error('cluster sets differ ' + aKey + ' ' + bKey + ' ' + set);
  const d = ks.map((k) => A.get(k) - Bm.get(k));
  const ci = d.every((x) => x === 0) ? [0, 0] : pairedBoot(d, SEED);
  const medA = median(perTask[`${aKey}/${set}`].map((r) => r.tok8000)); const medB = median(perTask[`${bKey}/${set}`].map((r) => r.tok8000));
  return { diff: mean(d), ci95: ci, clusters: ks.length, a_higher: d.filter((x) => x > 0).length, b_higher: d.filter((x) => x < 0).length, ties: d.filter((x) => x === 0).length, median_tokens_a: medA, median_tokens_b: medB };
}

// ---------- questions ----------
const tqRef = new Map();
for (const l of fs.readFileSync(path.join(BUILD, 'sealed/tq_reference.jsonl'), 'utf8').split(/\r?\n/)) { if (!l) continue; const r = JSON.parse(l); if (r.split !== 'tune') tqRef.set(r.id, r); }
const TOUCHED = new Set([24, 27, 33, 40, 41, 46, 47]);
// judgement items (both readers left them OUT): from sealed/tq_agreement.txt via the grader's judgement list; checked below
// Taken by hand from sealed/tq_agreement.txt line 34 (the "excluded" agreed calls on held-out ids 21-50).
const JUDGE = { 21: ['device'], 25: ['backend/app/features/jobs/service.py::JobService._money_rates'], 31: ['CLAUDE.md:L239', 'CLAUDE.md:L243', 'CLAUDE.md:L246'], 39: ['CLAUDE.md:L224', 'CLAUDE.md:L199'] };
function itemsOf(ans) {
  if (Array.isArray(ans)) return ans.map((x) => String(x).trim());
  if (ans && typeof ans === 'object') { const o = []; for (const k of Object.keys(ans)) for (const x of ans[k] || []) o.push(k + '\u0001' + String(x).trim()); return o; }
  return [];
}
function scoreQ(ansRaw, ref, dropJudge) {
  const aliases = ref.accept_aliases || {};
  let ans = itemsOf(ansRaw);
  const isObj = !Array.isArray(ref.answer);
  if (dropJudge) { const J = new Set((JUDGE[String(ref.id)] || JUDGE[ref.id] || []).map(String)); ans = ans.filter((x) => !J.has(isObj ? x.split('\u0001')[1] : x)); }
  ans = [...new Set(ans)];
  const refItems = [...new Set(itemsOf(ref.answer))];
  const canon = (x) => { // map an answer item to a reference item via aliases
    for (const r of refItems) {
      const [rk, rv] = isObj ? r.split('\u0001') : [null, r];
      const [ak, av] = isObj ? x.split('\u0001') : [null, x];
      if (rk !== ak) continue;
      if (av === rv || (aliases[rv] || []).includes(av)) return r;
    }
    return null;
  };
  const hit = new Set(); let tpA = 0;
  for (const a of ans) { const c = canon(a); if (c) { tpA++; hit.add(c); } }
  const nA = ans.length; const nR = refItems.length;
  let p; let r; let f1;
  if (nA === 0 && nR === 0) { p = 1; r = 1; f1 = 1; } else {
    p = nA ? tpA / nA : 0; // convention A: empty answer to a non-empty reference has precision 0
    r = nR ? hit.size / nR : 0; // non-empty answer to empty reference: recall 0
    f1 = p + r ? (2 * p * r) / (p + r) : 0;
  }
  const pAlt = nA ? tpA / nA : (nR ? 1 : 1); // convention B: empty answer has precision 1
  return { p, r, f1, pAlt, tp: hit.size, tpA, nA, nR };
}
const TQARMS = ['relational', 'ladybug', 'duckpgq', 'search'];
const tqAns = {};
for (const a of TQARMS) { tqAns[a] = new Map(); for (const l of fs.readFileSync(path.join(HO, 'tq', a + '.answers.jsonl'), 'utf8').split(/\r?\n/)) { if (!l) continue; const x = JSON.parse(l); tqAns[a].set(x.id, x); } }
const tq = { per_question: {}, blocks: {} };
const ids = [...tqRef.keys()].sort((x, y) => x - y);
for (const blk of ['all30', 'untouched23']) for (const dj of [false, true]) {
  const qs = ids.filter((i) => blk === 'all30' || !TOUCHED.has(i));
  const name = `${blk}_${dj ? 'without' : 'with'}_judgement`;
  const arms = {}; const perQ = {};
  for (const a of TQARMS) {
    const s = qs.map((i) => { const x = tqAns[a].get(i); if (!x) throw new Error('no answer ' + a + ' ' + i); return { id: i, ...scoreQ(x.answer, tqRef.get(i), dj), tokens: x.tokens, lookups: x.lookups, error: x.error }; });
    perQ[a] = s;
    const tp = s.reduce((t, x) => t + x.tpA, 0); const nA = s.reduce((t, x) => t + x.nA, 0); const tpR = s.reduce((t, x) => t + x.tp, 0); const nR = s.reduce((t, x) => t + x.nR, 0);
    const mp = nA ? tp / nA : 0; const mr = nR ? tpR / nR : 0;
    arms[a] = { macro_f1: mean(s.map((x) => x.f1)), macro_precision: mean(s.map((x) => x.p)), macro_precision_emptyIs1: mean(s.map((x) => x.pAlt)), macro_recall: mean(s.map((x) => x.r)),
      micro_f1: mp + mr ? (2 * mp * mr) / (mp + mr) : 0, median_tokens: median(s.map((x) => x.tokens)), mean_tokens: mean(s.map((x) => x.tokens)), median_lookups: median(s.map((x) => x.lookups)), errors: s.filter((x) => x.error).length };
  }
  const d = qs.map((_, k) => perQ.relational[k].f1 - perQ.search[k].f1);
  const ci = pairedBoot(d, SEED + 1);
  tq.blocks[name] = { questions: qs.length, arms, typed_minus_search_f1: { diff: mean(d), ci95: ci, per_question: Object.fromEntries(qs.map((q, k) => [q, d[k]])) },
    graph_identical: Object.fromEntries(['ladybug', 'duckpgq'].map((a) => [a, qs.filter((i) => JSON.stringify(tqAns[a].get(i).answer) === JSON.stringify(tqAns.relational.get(i).answer)).length])) };
  if (name === 'all30_with_judgement') for (const a of TQARMS) tq.per_question[a] = perQ[a];
}
fs.writeFileSync(path.join(OUT, 'my_tq.json'), JSON.stringify(tq, null, 1));
log('questions done');

// ---------- comparisons of the grader's list, recomputed ----------
const G = JSON.parse(fs.readFileSync(path.join(BUILD, 'sealed/grader/heldout/comparisons.json'), 'utf8'));
const myCmp = [];
for (const c of G.comparisons) {
  if (!c.a_arm || !c.sets) { myCmp.push({ id: c.id, skipped: true }); continue; }
  const aKey = `${c.a_arm}/${c.a_role}`; const bKey = `${c.b_arm}/${c.b_role}`;
  const o = { id: c.id, a: aKey, b: bKey, sets: {} };
  for (const set of Object.keys(c.sets)) {
    o.sets[set] = { primary: compareSets(aKey, bKey, set, 'r8000') };
    if (set === 'T1') for (const m of ['r2000', 'r4000', 'r16000']) o.sets[set][m] = compareSets(aKey, bKey, set, m);
  }
  if (o.sets.T3) { // sensitivity: T3 clustered by parent commit
    const A = clusterMeans(perTask[`${aKey}/T3`], 'r8000', 'parent'); const Bm = clusterMeans(perTask[`${bKey}/T3`], 'r8000', 'parent');
    const ks = [...A.keys()].sort(); const d = ks.map((k) => A.get(k) - Bm.get(k));
    o.T3_parent_clusters = { diff: mean(d), ci95: d.every((x) => x === 0) ? [0, 0] : pairedBoot(d, SEED), clusters: ks.length };
  }
  // wording (addendum 3 item 18 + protocol section 7)
  const T1 = o.sets.T1.primary; const isFloor = /floor/.test(c.b_arm) || /floor/.test(c.a_arm);
  const tqSig = (c.b_arm === 'search' && c.a_arm !== 'search' && !/floor/.test(c.a_arm)) ? Math.sign(tq.blocks.all30_with_judgement.typed_minus_search_f1.diff) : (c.a_arm === 'ladybug' && c.b_arm === 'relational' ? 0 : null);
  const sig = { T1: Math.sign(T1.diff), T2: o.sets.T2 ? Math.sign(o.sets.T2.primary.diff) : null, T3: o.sets.T3 ? Math.sign(o.sets.T3.primary.diff) : null, TQ: isFloor ? null : tqSig };
  const winSign = Math.sign(T1.diff);
  const avail = Object.values(sig).filter((x) => x !== null);
  const agree = avail.filter((x) => x === winSign).length;
  const excl = T1.ci95[0] > 0 || T1.ci95[1] < 0;
  const tokOk = winSign > 0 ? T1.median_tokens_a <= T1.median_tokens_b : T1.median_tokens_b <= T1.median_tokens_a;
  const need = isFloor ? 3 : 3;
  let verdict;
  if (excl && tokOk && agree >= need) verdict = 'better'; else if (T1.ci95[0] >= -0.05 && T1.ci95[1] <= 0.05) verdict = 'equivalent'; else verdict = 'inconclusive';
  o.signals = sig; o.agree = agree; o.verdict = verdict; o.grader_verdict = c.verdict;
  myCmp.push(o);
}
// H4 wording
const h4 = {};
for (const [k, b] of Object.entries(tq.blocks)) {
  const ci = b.typed_minus_search_f1.ci95; const d = b.typed_minus_search_f1.diff;
  const h3 = myCmp.find((x) => x.id === 'H3-search');
  const sig = [Math.sign(h3.sets.T1.primary.diff), Math.sign(h3.sets.T2.primary.diff), Math.sign(h3.sets.T3.primary.diff), Math.sign(d)];
  const agree = sig.filter((x) => x === Math.sign(d)).length;
  const tokOk = d > 0 ? b.arms.relational.median_tokens <= b.arms.search.median_tokens : b.arms.search.median_tokens <= b.arms.relational.median_tokens;
  const excl = ci[0] > 0 || ci[1] < 0;
  h4[k] = { diff: d, ci95: ci, verdict: excl && tokOk && agree >= 3 ? 'better' : (ci[0] >= -0.05 && ci[1] <= 0.05 ? 'equivalent' : 'inconclusive') };
}
h4.overall = (h4.all30_with_judgement.verdict !== h4.untouched23_with_judgement.verdict || Math.sign(h4.all30_with_judgement.diff) !== Math.sign(h4.untouched23_with_judgement.diff)) ? 'inconclusive (blocks disagree, addendum 5 item 5)' : h4.all30_with_judgement.verdict;
fs.writeFileSync(path.join(OUT, 'my_comparisons.json'), JSON.stringify({ seed: SEED, nboot: NBOOT, comparisons: myCmp, h4 }, null, 1));
log('comparisons done', new Date().toISOString());
