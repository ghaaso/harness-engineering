// Read-only: for each window, how much of its reading repeats an EARLIER window's reading set?
// Proxy for "this discovery was done before" (whole-window reuse route). Token-weighted by window tokens.
// Usage: node overlap.cjs reads.jsonl timing.jsonl
const fs = require('fs');
const [rf, tf] = process.argv.slice(2);
const reads = fs.readFileSync(rf, 'utf8').trim().split('\n').map(JSON.parse).filter(r => r.ts);
const tok = new Map(), role = new Map();
for (const l of fs.readFileSync(tf, 'utf8').trim().split('\n')) { const r = JSON.parse(l); tok.set(r.f, (tok.get(r.f) || 0) + r.ctx); role.set(r.f, r.role); }
const W = new Map();
for (const r of reads) { const b = r.w.split('/').pop(); let w = W.get(b); if (!w) { w = { start: r.ts, paths: new Map() }; W.set(b, w); } w.start = Math.min(w.start, r.ts); w.paths.set(r.p, (w.paths.get(r.p) || 0) + r.ch); }
const wins = [...W.entries()].sort((a, b) => a[1].start - b[1].start);
const res = { main: { n: 0, T: 0, j50: 0, j80: 0, cov80: 0, covAll: 0 }, sub: { n: 0, T: 0, j50: 0, j80: 0, cov80: 0, covAll: 0 } };
const seen = []; // earlier windows' path sets
const everRead = new Set();
for (const [b, w] of wins) {
  const T = tok.get(b) || 0; const R = (role.get(b) === 'main') ? res.main : res.sub;
  const P = new Set(w.paths.keys());
  let best = 0;
  for (const S of seen) { let inter = 0; for (const p of P) if (S.has(p)) inter++; const j = inter / (P.size + S.size - inter); if (j > best) best = j; }
  // coverage: share of this window's read chars on paths ANY earlier window read
  let chAll = 0, chSeen = 0; for (const [p, ch] of w.paths) { chAll += ch; if (everRead.has(p)) chSeen += ch; }
  const cov = chAll ? chSeen / chAll : 0;
  R.n++; R.T += T; if (best >= 0.5) R.j50 += T; if (best >= 0.8) R.j80 += T; if (cov >= 0.8) R.cov80 += T; R.covAll += cov * T;
  seen.push(P); for (const p of P) everRead.add(p);
}
for (const [k, R] of Object.entries(res)) console.log(k, { windowsWithReads: R.n, tokensBn: (R.T / 1e9).toFixed(2), shareTok_jaccard50: (R.j50 / R.T).toFixed(3), shareTok_jaccard80: (R.j80 / R.T).toFixed(3), shareTok_80pctOfReadsSeenBefore: (R.cov80 / R.T).toFixed(3), tokWeightedSeenBeforeShare: (R.covAll / R.T).toFixed(3) });
