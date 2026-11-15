// Independent application of ruling 53 (+ ruling 64 for an exact tie) to the stored candidates.
const fs = require('fs'), path = require('path');
const LANE = process.argv[2];
const OUT = process.argv[3];
const T = path.join(LANE, 'train');
const plan = JSON.parse(fs.readFileSync(path.join(T, 'stageB', 'plan.json'), 'utf8'));
const ARMS = ['E1', 'E2', 'E3', 'E4', 'E5', 'PLACEBO'];
function sizeOf(arm, cid) {
  if (arm === 'PLACEBO') return [0, 0];
  const c = plan.configs[arm].find(x => x.config_id === cid);
  if (!c) throw new Error('no cfg ' + arm + ' ' + cid);
  return [Number(c.cfg.embedding_dim), Number(c.cfg.num_layers || 0)];
}
function cmpArr(a, b) { for (let i = 0; i < a.length; i++) { if (a[i] < b[i]) return -1; if (a[i] > b[i]) return 1; } return 0; }
function apply(arm, cands) {
  const top = Math.max(...cands.map(c => c.mean));
  const tied = cands.filter(c => c.mean === top);
  const seBest = Math.max(...tied.map(c => c.se));
  const thr = top - seBest;
  const band = cands.filter(c => c.mean >= thr);
  const sorted = band.slice().sort((a, b) => {
    const s = cmpArr(sizeOf(arm, a.config_id), sizeOf(arm, b.config_id)); if (s) return s;
    if (a.mean !== b.mean) return b.mean - a.mean;
    if (a.config_id !== b.config_id) return a.config_id < b.config_id ? -1 : 1;
    return a.w - b.w;
  });
  const pick = sorted[0];
  // fragility: band edge margins, and the decisive tie-break margins
  const frag = [];
  for (const c of cands) { const m = c.mean - thr; if (Math.abs(m) < 1e-6) frag.push({ kind: 'band_edge', config_id: c.config_id, w: c.w, margin: m }); }
  if (tied.length > 1) frag.push({ kind: 'exact_tie_for_best', n: tied.length });
  // among same-size candidates in band, gap between pick and runner-up mean
  const same = sorted.filter(c => cmpArr(sizeOf(arm, c.config_id), sizeOf(arm, pick.config_id)) === 0);
  if (same.length > 1) { const g = same[0].mean - same[1].mean; if (Math.abs(g) < 1e-6) frag.push({ kind: 'mean_tie_same_size', a: [same[0].config_id, same[0].w], b: [same[1].config_id, same[1].w], gap: g }); }
  // the next best smaller model just outside band
  const out = cands.filter(c => c.mean < thr).map(c => ({ c, m: thr - c.mean })).sort((a, b) => a.m - b.m);
  return { pick: { config_id: pick.config_id, w: pick.w, mean: pick.mean, se: pick.se }, top, seBest, thr, bandSize: band.length,
    nearestOutside: out.length ? { config_id: out[0].c.config_id, w: out[0].c.w, below_by: out[0].m } : null,
    minInsideMargin: Math.min(...band.map(c => c.mean - thr)), frag,
    sameSizeGap: same.length > 1 ? same[0].mean - same[1].mean : null };
}
const res = []; let agree = 0, total = 0;
for (const arm of ARMS) {
  const C = JSON.parse(fs.readFileSync(path.join(T, 'selectB', arm, 'choices.json'), 'utf8'));
  const items = [['final_all65', C.final_all65]].concat(C.blocks.map(b => ['block' + b.block, b]));
  for (const [name, rec] of items) {
    const r = apply(arm, rec.candidates);
    const ok = r.pick.config_id === rec.config_id && Number(r.pick.w) === Number(rec.w) && r.pick.mean === rec.mean && r.pick.se === rec.se;
    const bestOk = rec.best && rec.best.mean === r.top;
    total++; if (ok) agree++;
    res.push({ arm, name, stored: [rec.config_id, rec.w, rec.mean, rec.se], mine: [r.pick.config_id, r.pick.w, r.pick.mean, r.pick.se], ok, bestOk,
      ncand: rec.candidates.length, earlier: rec.earlier_commits, n_commits: rec.n_commits, top: r.top, seBest: r.seBest, thr: r.thr, bandSize: r.bandSize,
      minInsideMargin: r.minInsideMargin, nearestOutside: r.nearestOutside, sameSizeGap: r.sameSizeGap, frag: r.frag });
  }
  // PLACEBO fixed-w variants
  if (C.fixed_w) for (const w in C.fixed_w) for (const b of C.fixed_w[w]) {
    const r = apply(arm, b.candidates);
    res.push({ arm, name: 'fixed_w' + w + '_block' + b.block, stored: [b.config_id, b.w], mine: [r.pick.config_id, r.pick.w], ok: r.pick.config_id === b.config_id && r.pick.w === b.w, ncand: b.candidates.length, frag: r.frag, minInsideMargin: r.minInsideMargin, nearestOutside: r.nearestOutside, sameSizeGap: r.sameSizeGap });
  }
}
fs.writeFileSync(OUT, JSON.stringify({ agree, total, res }, null, 1));
console.log('agree', agree, 'of', total);
for (const r of res) console.log(r.arm, r.name, 'ok=' + r.ok, 'best=' + r.bestOk, 'n=' + r.ncand, 'earlier=' + r.earlier, 'stored', JSON.stringify(r.stored), 'band', r.bandSize,
  'minIn', r.minInsideMargin && r.minInsideMargin.toExponential(3), 'out', r.nearestOutside && JSON.stringify([r.nearestOutside.config_id, r.nearestOutside.w, r.nearestOutside.below_by.toExponential(3)]),
  'ssgap', r.sameSizeGap === null || r.sameSizeGap === undefined ? '-' : r.sameSizeGap.toExponential(3), r.frag.length ? 'FRAG ' + JSON.stringify(r.frag) : '');
