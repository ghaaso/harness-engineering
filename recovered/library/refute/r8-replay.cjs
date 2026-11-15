// R8 refuter. Replays identifier-keyed push (diff warnings) over 154 first-parent PRs with several handle policies.
// Differences from D6's d6-union.cjs: (1) forward-only: an entry written at fix PR i can fire only on PRs j > i
// (D6 fired on all PRs, including the ones before the entry existed); (2) handles chosen with prior-only document
// frequency (no peeking at whether the handle will recur); (3) lockfiles skipped anywhere; (4) symbol-ish filter option.
// Usage: node r8-replay.cjs r8-prs.json
const fs = require('fs');
const { prs } = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const N = prs.length;
for (const p of prs) { p.plusS = new Set(p.plus); p.minusS = new Set(p.minus); p.all = new Set([...p.plus, ...p.minus]); p.fileS = new Set(p.files); }
const symbolish = t => /_/.test(t) || /[a-z][A-Z]/.test(t) || /^[A-Z][A-Z0-9_]{3,}$/.test(t);
const prOf = new Map(); prs.forEach(p => { prOf.set(p.s, p.i); for (const c of p.commits) prOf.set(c, p.i); });
const PAIRS = [['75b51f9', '981ae08'], ['2f09cec', 'f29f62f'], ['789d522', '0a3b38e'], ['b7a5b98', '6928828'], ['dbb3661', 'd440855']];
const pairIdx = PAIRS.map(([a, b]) => [prOf.get(a), prOf.get(b)]);
// document frequency over the full history (for D6 replica) and prefix df (prior only)
const dfAll = new Map(); for (const p of prs) for (const t of p.all) dfAll.set(t, (dfAll.get(t) || 0) + 1);
function dfPrior(i, win) { const m = new Map(); for (let j = Math.max(0, i - win); j < i; j++) for (const t of prs[j].all) m.set(t, (m.get(t) || 0) + 1); return m; }
const GATE = 7; // 5 % of ~150, as D6 and KS L261
function buildEntries(pol) {
  const es = [];
  prs.forEach(p => {
    if (!p.isFix) return;
    let src = pol.side === 'minus' ? p.minusS : pol.side === 'plus' ? p.plusS : p.all;
    let cand = [...src];
    if (pol.sym) cand = cand.filter(symbolish);
    let score;
    if (pol.symmetric) { cand = cand.filter(t => { const o = dfAll.get(t) - 1; return o >= 1 && o <= GATE; }); score = t => dfAll.get(t); }
    else {
      const dp = dfPrior(p.i, 150);
      cand = cand.filter(t => (dp.get(t) || 0) <= GATE && (dp.get(t) || 0) >= (pol.minPrior || 0));
      score = t => dp.get(t) || 0;
    }
    cand.sort((a, b) => (score(a) - score(b)) || (b.length - a.length) || (a < b ? -1 : 1));
    if (pol.files) { const fs2 = [...p.files].filter(f => !/test|spec|__tests__/.test(f)); if (fs2.length) es.push({ i: p.i, h: fs2, files: true }); return; }
    if (cand.length) es.push({ i: p.i, h: cand.slice(0, pol.K), need: pol.need || 1 });
  });
  return es;
}
function fires(e, j) {
  const q = prs[j];
  if (e.files) return e.h.some(f => q.fileS.has(f));
  let n = 0; for (const t of e.h) if (q.all.has(t)) { n++; if (n >= e.need) return true; } return false;
}
function run(name, pol) {
  const es = buildEntries(pol);
  let totalFires = 0, trueFires = 0, opp = 0, sameFileFalse = 0, falseFires = 0;
  const firedPR = new Array(N).fill(false); const libSize = new Array(N).fill(0);
  const lag = { '1-5': [0, 0], '6-20': [0, 0], '21-60': [0, 0], '61+': [0, 0] };
  const lagKey = d => d <= 5 ? '1-5' : d <= 20 ? '6-20' : d <= 60 ? '21-60' : '61+';
  for (const e of es) {
    for (let j = 0; j < N; j++) {
      if (j === e.i) continue;
      if (!pol.symmetric && j < e.i) continue;
      if (j > e.i) { opp++; lag[lagKey(j - e.i)][1]++; }
      if (fires(e, j)) {
        totalFires++; firedPR[j] = true;
        if (j > e.i) lag[lagKey(j - e.i)][0]++;
        const isTrue = pairIdx.some(([a, b]) => a === e.i && b === j);
        if (isTrue) trueFires++; else { falseFires++; if ([...prs[e.i].fileS].some(f => prs[j].fileS.has(f))) sameFileFalse++; }
      }
    }
  }
  // forward union by timeline: for PR j, entries from fix PRs i < j
  const fwdFired = new Array(N).fill(false);
  for (let j = 0; j < N; j++) { const lib = es.filter(e => e.i < j); libSize[j] = lib.length; fwdFired[j] = lib.some(e => fires(e, j)); }
  const band = (lo, hi) => { let f = 0, c = 0; for (let j = 0; j < N; j++) if (libSize[j] >= lo && libSize[j] <= hi) { c++; if (fwdFired[j]) f++; } return c ? `${f}/${c} = ${(100 * f / c).toFixed(1)}%` : 'n/a'; };
  const caught = pairIdx.map(([a, b]) => { const e = es.find(x => x.i === a); return e ? (a !== b && fires(e, b) ? 'Y' : 'n') : '-'; }).join('');
  const r = {
    name, entries: es.length, perEntryFwdFireRate_pct: +(100 * (es.reduce((s, e) => s + (() => { let f = 0, o = 0; for (let j = e.i + 1; j < N; j++) { o++; if (fires(e, j)) f++; } return o ? f / o : 0; })(), 0) / es.length)).toFixed(2),
    totalFires, trueFires, precision_pct: +(100 * trueFires / Math.max(1, totalFires)).toFixed(1), pairsCaught: caught,
    falseFiresSharingAFileWithTheFix_pct: +(100 * sameFileFalse / Math.max(1, falseFires)).toFixed(0),
    fwdUnion_lib1to9: band(1, 9), fwdUnion_lib10to19: band(10, 19), fwdUnion_lib20to29: band(20, 29), fwdUnion_lib30plus: band(30, 99),
    lagFireRate_pct: Object.fromEntries(Object.entries(lag).map(([k, [f, o]]) => [k, o ? +(100 * f / o).toFixed(2) + ` (${f}/${o})` : 'n/a'])),
  };
  if (pol.symmetric) { let u = 0; for (let j = 0; j < N; j++) if (es.some(e => e.i !== j && fires(e, j))) u++; r.symmetricUnionAllEntries = `${u}/${N} = ${(100 * u / N).toFixed(1)}%`; }
  return r;
}
const pols = [
  ['D6-replica K1 (symmetric, all tokens)', { symmetric: true, K: 1 }],
  ['D6-replica K3 (symmetric, all tokens)', { symmetric: true, K: 3 }],
  ['fwd K1 all tokens', { K: 1 }],
  ['fwd K3 all tokens', { K: 3 }],
  ['fwd K1 symbol-ish', { K: 1, sym: true }],
  ['fwd K3 symbol-ish', { K: 3, sym: true }],
  ['fwd K3 symbol-ish existing (prior df>=1)', { K: 3, sym: true, minPrior: 1 }],
  ['fwd K3 symbol-ish removed lines', { K: 3, sym: true, side: 'minus' }],
  ['fwd K5 symbol-ish AND>=2', { K: 5, sym: true, need: 2 }],
  ['fwd K10 symbol-ish AND>=3', { K: 10, sym: true, need: 3 }],
  ['fwd files (non-test; KS forbids, reference)', { files: true }],
];
const out = pols.map(([n, p]) => run(n, p));
for (const r of out) console.log(JSON.stringify(r));
fs.writeFileSync('r8-replay.json', JSON.stringify(out, null, 1));
// pair detail
console.log('pairs (prA,prB):', JSON.stringify(pairIdx));
for (const [a, b] of pairIdx) {
  const A = prs[a], B = prs[b];
  const shared = [...A.all].filter(t => B.all.has(t) && symbolish(t)).map(t => t + ':' + dfAll.get(t)).sort((x, y) => +x.split(':')[1] - +y.split(':')[1]);
  console.log(`${A.s}->${B.s} lagPRs=${b - a} sharedFiles=${[...A.fileS].filter(f => B.fileS.has(f)).join(',') || 'none'} sharedSymbolTokens(df)=${shared.slice(0, 15).join(' ')}`);
}
