// Independent recomputation of every candidate (config, w) mean and SE from the assembled stage-B pool tables,
// for the five blocks' earlier commits and all 65, then ruling 53; compared with the stored choices.json.
// Read-only on the lane. Usage: node recompute.js <lane root (Windows path)> <out file>
const fs = require('fs'), path = require('path'), zlib = require('zlib'), crypto = require('crypto');
const LANE = process.argv[2], OUT = process.argv[3];
const P = (...a) => path.join(LANE, ...a);

// ---------------- BLAKE2b (RFC 7693), BigInt, variable digest length
const M64 = (1n << 64n) - 1n;
const IV = [0x6a09e667f3bcc908n, 0xbb67ae8584caa73bn, 0x3c6ef372fe94f82bn, 0xa54ff53a5f1d36f1n,
  0x510e527fade682d1n, 0x9b05688c2b3e6c1fn, 0x1f83d9abfb41bd6bn, 0x5be0cd19137e2179n];
const SIG = [[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15],[14,10,4,8,9,15,13,6,1,12,0,2,11,7,5,3],[11,8,12,0,5,2,15,13,10,14,3,6,7,1,9,4],
  [7,9,3,1,13,12,11,14,2,6,5,10,4,0,15,8],[9,0,5,7,2,4,10,15,14,1,11,12,6,8,3,13],[2,12,6,10,0,11,8,3,4,13,7,5,15,14,1,9],
  [12,5,1,15,14,13,4,10,0,7,6,3,9,2,8,11],[13,11,7,14,12,1,3,9,5,0,15,4,8,6,2,10],[6,15,14,9,11,3,0,8,12,2,13,7,1,4,10,5],
  [10,2,8,4,7,6,1,5,15,11,9,14,3,12,13,0]];
const rotr = (x, n) => ((x >> BigInt(n)) | (x << BigInt(64 - n))) & M64;
function compress(h, block, t, last) {
  const m = []; for (let i = 0; i < 16; i++) { let x = 0n; for (let j = 7; j >= 0; j--) x = (x << 8n) | BigInt(block[i * 8 + j]); m.push(x); }
  const v = h.concat(IV); v[12] ^= (BigInt(t) & M64); v[13] ^= (BigInt(t) >> 64n) & M64; if (last) v[14] ^= M64;
  const G = (a, b, c, d, x, y) => {
    v[a] = (v[a] + v[b] + x) & M64; v[d] = rotr(v[d] ^ v[a], 32); v[c] = (v[c] + v[d]) & M64; v[b] = rotr(v[b] ^ v[c], 24);
    v[a] = (v[a] + v[b] + y) & M64; v[d] = rotr(v[d] ^ v[a], 16); v[c] = (v[c] + v[d]) & M64; v[b] = rotr(v[b] ^ v[c], 63); };
  for (let r = 0; r < 12; r++) { const s = SIG[r % 10];
    G(0,4,8,12,m[s[0]],m[s[1]]); G(1,5,9,13,m[s[2]],m[s[3]]); G(2,6,10,14,m[s[4]],m[s[5]]); G(3,7,11,15,m[s[6]],m[s[7]]);
    G(0,5,10,15,m[s[8]],m[s[9]]); G(1,6,11,12,m[s[10]],m[s[11]]); G(2,7,8,13,m[s[12]],m[s[13]]); G(3,4,9,14,m[s[14]],m[s[15]]); }
  for (let i = 0; i < 8; i++) h[i] ^= v[i] ^ v[i + 8];
}
function blake2b(buf, nn) {
  const h = IV.slice(); h[0] ^= 0x01010000n ^ BigInt(nn);
  let t = 0; let off = 0; const n = buf.length;
  while (n - off > 128) { t += 128; compress(h, buf.subarray(off, off + 128), t, false); off += 128; }
  const b = Buffer.alloc(128); buf.copy(b, 0, off); t += n - off; compress(h, b, t, true);
  const out = Buffer.alloc(64); for (let i = 0; i < 8; i++) { let x = h[i]; for (let j = 0; j < 8; j++) { out[i * 8 + j] = Number(x & 0xffn); x >>= 8n; } }
  return out.subarray(0, nn);
}
// self-test against Node's own BLAKE2b-512
for (const s of ['abc', '', 'x'.repeat(300)]) {
  const a = blake2b(Buffer.from(s), 64).toString('hex'), b = crypto.createHash('blake2b512').update(s).digest('hex');
  if (a !== b) throw new Error('blake2b self-test failed on ' + JSON.stringify(s.slice(0, 5)));
}
const TWO64 = 2 ** 64;
const h8 = s => Number(BigInt('0x' + blake2b(Buffer.from(s, 'utf8'), 8).toString('hex'))) / TWO64;
const TBC = new Map();
const tiebreak = (tid, c) => { const k = tid + '\u0000' + c; let v = TBC.get(k); if (v === undefined) { v = h8('20261114|' + tid + '|' + c); TBC.set(k, v); } return v; };

// ---------------- numpy-like reductions
function pairwise(a, lo, n) {
  if (n < 8) { let res = -0.0; res = 0.0; for (let i = 0; i < n; i++) res += a[lo + i]; return res; }
  if (n <= 128) { const r = []; for (let j = 0; j < 8; j++) r.push(a[lo + j]); let i;
    for (i = 8; i < n - (n % 8); i += 8) for (let j = 0; j < 8; j++) r[j] += a[lo + i + j];
    let res = ((r[0] + r[1]) + (r[2] + r[3])) + ((r[4] + r[5]) + (r[6] + r[7]));
    for (; i < n; i++) res += a[lo + i]; return res; }
  let n2 = Math.floor(n / 2); n2 -= n2 % 8; return pairwise(a, lo, n2) + pairwise(a, lo + n2, n - n2);
}
const npsum = a => 0.0 + pairwise(a, 0, a.length);
const npmean = a => npsum(a) / a.length;
function npse(a) { const n = a.length; if (n <= 1) return 0; const m = npmean(a); const d = a.map(x => (x - m) * (x - m)); return Math.sqrt(npsum(d) / (n - 1)) / Math.sqrt(n); }

// ---------------- data
const gz = p => zlib.gunzipSync(fs.readFileSync(p)).toString('utf8');
let nonFinite = 0, nonFiniteFiles = {};
function parseNum(s, file) {
  let v;
  if (s === 'inf') v = Infinity; else if (s === '-inf') v = -Infinity; else if (s === 'nan') v = NaN; else v = Number(s);
  if (!Number.isFinite(v)) { nonFinite++; nonFiniteFiles[file] = (nonFiniteFiles[file] || 0) + 1; }
  if (Number.isNaN(v) && s !== 'nan') throw new Error('unparsed ' + s + ' in ' + file);
  return v;
}
function readTable(p) {
  const out = new Map(); const L = gz(p).split('\n');
  for (let i = 1; i < L.length; i++) { if (!L[i]) continue; const [tid, c, s] = L[i].split('\t');
    let m = out.get(tid); if (!m) { m = new Map(); out.set(tid, m); } m.set(c, parseNum(s, path.basename(p))); }
  return out;
}
const tasks = fs.readFileSync(P('eval', 'tune_tasks.jsonl'), 'utf8').split('\n').filter(x => x.trim()).map(JSON.parse);
const cl = new Map(); { const L = gz(P('eval', 'comparators', 'candidates_pool.tsv.gz')).split('\n');
  for (let i = 1; i < L.length; i++) { if (!L[i]) continue; const [tid, c] = L[i].split('\t'); if (!cl.has(tid)) cl.set(tid, []); cl.get(tid).push(c); } }
const PPR = readTable(P('eval', 'comparators', 'PPR_pool.tsv.gz')), CO = readTable(P('eval', 'comparators', 'CO_pool.tsv.gz'));
const plan = JSON.parse(fs.readFileSync(P('train', 'stageB', 'plan.json'), 'utf8'));

// ---------------- evalcore mirror
function isScored(scores, c) { if (!scores.has(c)) return false; const v = scores.get(c); return !(typeof v === 'number' && Number.isNaN(v)); }
function rank(tid, cands, scores) {
  const sc = [], un = [];
  for (const c of cands) { if (isScored(scores, c)) sc.push([-scores.get(c), tiebreak(tid, c), c]); }
  const scored = new Set(sc.map(x => x[2]));
  for (const c of cands) if (!scored.has(c)) un.push([tiebreak(tid, c), c]);
  sc.sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]) || (a[2] < b[2] ? -1 : a[2] > b[2] ? 1 : 0));
  un.sort((a, b) => (a[0] - b[0]) || (a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0));
  return sc.map(x => x[2]).concat(un.map(x => x[1]));
}
function ranksWithin(tid, cands, scores) { const o = rank(tid, cands.filter(c => scores.has(c)), scores); const r = new Map(); o.forEach((c, i) => r.set(c, i + 1)); return r; }
const EMPTY = new Map();
function fused(tid, cands, ppr, co, emb, w) {
  const out = new Map(); for (const c of cands) out.set(c, 0.0);
  for (const [s, wt] of [[ppr, 1.0], [co, 1.0], [emb, w]]) for (const [c, r] of ranksWithin(tid, cands, s)) out.set(c, out.get(c) + wt / (60 + r));
  return out;
}
const p10 = (ranked, truth) => { const T = new Set(truth); let h = 0; for (const c of ranked.slice(0, 10)) if (T.has(c)) h++; return h / 10.0; };
function placeboTable(cfg, seed) {
  const m = new Map(); for (const t of tasks) { const mm = new Map(); for (const c of (cl.get(t.task_id) || [])) mm.set(c, h8('placebo|' + cfg + '|' + seed + '|' + t.task_id + '|' + c)); m.set(t.task_id, mm); }
  return m;
}

// ---------------- commit sets
const order = {}; for (const t of tasks) order[t.commit] = t.date_order;
const commits = Object.keys(order).sort((a, b) => order[a] - order[b]);
const late = commits.filter(c => tasks.find(t => t.commit === c).late50);
const blocks = []; for (let i = 0; i < 50; i += 10) blocks.push(late.slice(i, i + 10));
const byCommit = {}; for (const t of tasks) (byCommit[t.commit] = byCommit[t.commit] || []).push(t);
const checks = {};
checks.n_tasks = tasks.length; checks.n_commits = commits.length; checks.n_late = late.length;
checks.distinct_date_orders = new Set(Object.values(order)).size;
checks.late50_is_date_order_gt15 = commits.every(c => (order[c] > 15) === tasks.find(t => t.commit === c).late50);
checks.date_order_consistent_within_commit = tasks.every(t => t.date_order === order[t.commit]);
const pilotSet = new Set(tasks.filter(t => t.late50_pilot).map(t => t.commit));
checks.pilot_n = pilotSet.size; checks.pilot_only = [...pilotSet].filter(c => !late.includes(c)).sort((a, b) => order[a] - order[b]);
checks.pilot_only_date_orders = checks.pilot_only.map(c => order[c]);
checks.tasks_without_pool_candidates = tasks.filter(t => !(cl.get(t.task_id) || []).length).length;

// ---------------- rule 53
function sizeOf(arm, cid) { if (arm === 'PLACEBO') return [0, 0]; const c = plan.configs[arm].find(x => x.config_id === cid); return [Number(c.cfg.embedding_dim), Number(c.cfg.num_layers || 0)]; }
function choose(arm, st) {
  const top = Math.max(...st.map(s => s.mean)); const tied = st.filter(s => s.mean === top); const se = Math.max(...tied.map(s => s.se));
  const band = st.filter(s => s.mean >= top - se);
  band.sort((a, b) => { const A = sizeOf(arm, a.config_id), B = sizeOf(arm, b.config_id);
    return (A[0] - B[0]) || (A[1] - B[1]) || (b.mean - a.mean) || (a.config_id < b.config_id ? -1 : a.config_id > b.config_id ? 1 : 0) || (a.w - b.w); });
  return band[0];
}

const report = { checks, arms: {} };
const WS = [0.25, 0.5, 1.0];
let maxDiffMean = 0, maxDiffSe = 0, exactMean = 0, exactSe = 0, nVals = 0, allChoicesAgree = true;
const unscoredSeedTasks = {};
for (const arm of ['E1', 'E2', 'E3', 'E4', 'E5', 'PLACEBO']) {
  const cfgs = arm === 'PLACEBO' ? ['p1', 'p2', 'p3'] : plan.configs[arm].map(c => c.config_id);
  const emb = {};
  for (const cid of cfgs) for (const s of [1, 2, 3])
    emb[cid + '|' + s] = arm === 'PLACEBO' ? placeboTable(cid, s) : readTable(P('train', 'stageB', 'tables', arm + '_' + cid + '_s' + s + '_pool.tsv.gz'));
  // tasks absent from a table / with no scored pool candidate (item 17: fused = RRF there)
  for (const cid of cfgs) for (const s of [1, 2, 3]) { const tb = emb[cid + '|' + s]; let n = 0;
    for (const t of tasks) { const m = tb.get(t.task_id) || EMPTY; if (!(cl.get(t.task_id) || []).some(c => m.has(c))) n++; }
    unscoredSeedTasks[arm + '_' + cid + '_s' + s] = n; }
  const P10 = {};
  for (const cid of cfgs) for (const w of WS) for (const t of tasks) {
    const cands = cl.get(t.task_id) || []; const v = [];
    for (const s of [1, 2, 3]) v.push(p10(rank(t.task_id, cands, fused(t.task_id, cands, PPR.get(t.task_id) || EMPTY, CO.get(t.task_id) || EMPTY, emb[cid + '|' + s].get(t.task_id) || EMPTY, w)), t.truth));
    P10[cid + '|' + w + '|' + t.task_id] = npmean(v);
  }
  const stats = cs => { const out = []; for (const cid of cfgs) for (const w of WS) {
    const vals = cs.map(c => npmean(byCommit[c].map(t => P10[cid + '|' + w + '|' + t.task_id])));
    out.push({ config_id: cid, w, mean: npmean(vals), se: npse(vals), n: vals.length }); } return out; };
  const C = JSON.parse(fs.readFileSync(P('train', 'selectB', arm, 'choices.json'), 'utf8'));
  const sets = [['final_all65', commits, C.final_all65]].concat(blocks.map((b, i) => ['block' + (i + 1), commits.filter(c => order[c] < order[b[0]]), C.blocks[i]]));
  report.arms[arm] = [];
  for (const [name, cs, stored] of sets) {
    const st = stats(cs); const pick = choose(arm, st);
    const blockCommitsOk = name === 'final_all65' ? true : JSON.stringify(stored.commits) === JSON.stringify(blocks[+name.slice(5) - 1]) && stored.earlier_commits === cs.length;
    let dm = 0, ds = 0;
    st.forEach(s => { const o = stored.candidates.find(x => x.config_id === s.config_id && Number(x.w) === s.w);
      const a = Math.abs(o.mean - s.mean), b = Math.abs(o.se - s.se); dm = Math.max(dm, a); ds = Math.max(ds, b);
      nVals++; if (a === 0) exactMean++; if (b === 0) exactSe++; });
    maxDiffMean = Math.max(maxDiffMean, dm); maxDiffSe = Math.max(maxDiffSe, ds);
    const agree = pick.config_id === stored.config_id && pick.w === Number(stored.w);
    if (!agree) allChoicesAgree = false;
    report.arms[arm].push({ name, n_commits: cs.length, mine: [pick.config_id, pick.w, pick.mean, pick.se], stored: [stored.config_id, stored.w, stored.mean, stored.se], agree, blockCommitsOk, maxAbsDiffMean: dm, maxAbsDiffSe: ds });
    // placebo fixed-w
    if (arm === 'PLACEBO' && name !== 'final_all65') for (const w of WS) {
      const key = String(w === 1 ? 1 : w); const fw = (C.fixed_w[key] || C.fixed_w[String(w)])[+name.slice(5) - 1];
      const pk = choose(arm, st.filter(s => s.w === w));
      report.arms[arm].push({ name: name + '_fixedw' + w, mine: [pk.config_id, pk.w], stored: [fw.config_id, fw.w], agree: pk.config_id === fw.config_id && pk.w === Number(fw.w) });
      if (!(pk.config_id === fw.config_id && pk.w === Number(fw.w))) allChoicesAgree = false;
    }
  }
}
report.summary = { allChoicesAgree, maxDiffMean, maxDiffSe, exactMean, exactSe, nVals, nonFinite, nonFiniteFiles, unscoredSeedTasks };
fs.writeFileSync(OUT, JSON.stringify(report, null, 1));
console.log(JSON.stringify(checks));
for (const a in report.arms) for (const r of report.arms[a]) console.log(a, r.name, r.agree, JSON.stringify(r.mine), r.blockCommitsOk, r.maxAbsDiffMean, r.maxAbsDiffSe);
console.log(JSON.stringify(report.summary));
