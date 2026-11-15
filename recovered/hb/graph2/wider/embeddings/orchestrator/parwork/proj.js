// Stage-B projection for two containers from the measured pair factors (node proj.js). Writes proj.json.
const fs = require('fs'), path = require('path');
const base = { E1: 2.97, E2: 0.23, E3: 2.04, E4: 4.69, E5: 4.44 };       // lane table, one process, nondet E4 (h)
const E4DET = { lo: 1.08, mid: 1.18, hi: 1.20 };                          // M1: det/nondet s per epoch (small 1.08, large 1.20), unit wall large 1.185
// throughput of row arm when beside column arm, as a fraction of its alone speed
const M = { // measured in M3
  'E4|E1': 0.655, 'E1|E4': 0.841, 'E1|E5': 0.628, 'E5|E1': 0.604, 'E3|E2': 0.825, 'E2|E3': 0.806 };
const proxyFrom = { // unmeasured pairs take the factor of the nearest measured pair (stated in RESULT.json)
  'E4|E5': 'E4|E1', 'E4|E3': 'E4|E1', 'E4|E2': 'E4|E1', 'E5|E4': 'E1|E4', 'E3|E4': 'E1|E4', 'E2|E4': 'E2|E3',
  'E1|E3': 'E1|E5', 'E3|E1': 'E5|E1', 'E3|E5': 'E5|E1', 'E5|E3': 'E1|E5', 'E1|E2': 'E3|E2', 'E5|E2': 'E3|E2', 'E2|E1': 'E2|E3', 'E2|E5': 'E2|E3' };
const rate = (a, b) => b == null ? 1 : (M[a + '|' + b] ?? M[proxyFrom[a + '|' + b]]);
function sim(QA, QB, H) {
  const q = [QA.map(a => ({ a, w: H[a] })), QB.map(a => ({ a, w: H[a] }))]; let t = 0; const log = [];
  while (q[0].length || q[1].length) {
    const x = q[0][0], y = q[1][0]; const ra = x ? rate(x.a, y && y.a) : 0, rb = y ? rate(y.a, x && x.a) : 0;
    const dt = Math.min(x ? x.w / ra : Infinity, y ? y.w / rb : Infinity);
    log.push(`${t.toFixed(2)}-${(t + dt).toFixed(2)} h: ${x ? x.a + ' @' + ra : '-'} | ${y ? y.a + ' @' + rb : '-'}`);
    if (x) x.w -= ra * dt; if (y) y.w -= rb * dt; t += dt;
    if (x && x.w < 1e-9) q[0].shift(); if (y && y.w < 1e-9) q[1].shift();
  }
  return { t, log };
}
function perms(a) { return a.length <= 1 ? [a] : a.flatMap((x, i) => perms([...a.slice(0, i), ...a.slice(i + 1)]).map(p => [x, ...p])); }
const arms = Object.keys(base); const res = {};
for (const [lab, f] of Object.entries(E4DET)) {
  const H = { ...base, E4: base.E4 * f }; let best = null; const all = [];
  for (let m = 0; m < 32; m++) {
    const A = arms.filter((_, i) => m & (1 << i)), B = arms.filter((_, i) => !(m & (1 << i)));
    if (!A.includes('E4')) continue;
    let bs = null; for (const pa of perms(A)) for (const pb of perms(B)) { const s = sim(pa, pb, H); if (!bs || s.t < bs.t) bs = { A: pa, B: pb, ...s }; }
    all.push({ A: bs.A.join('+'), B: bs.B.join('+') || '(none)', hours: +bs.t.toFixed(2) });
    if (!best || bs.t < best.t) best = bs;
  }
  all.sort((x, y) => x.hours - y.hours);
  const serial = Object.values(H).reduce((x, y) => x + y, 0);
  res[lab] = { e4det_factor: f, e4det_alone_h: +H.E4.toFixed(2), one_container_h: +serial.toFixed(2), one_container_nondet_e4_h: 14.37,
    best: { A: best.A, B: best.B, hours: +best.t.toFixed(2), timeline: best.log }, splits_ranked: all.slice(0, 8) };
}
fs.writeFileSync(path.join(__dirname, 'proj.json'), JSON.stringify({ base_hours: base, measured: M, proxies: proxyFrom, results: res }, null, 1));
for (const [k, r] of Object.entries(res)) { console.log(k, 'E4det', r.e4det_alone_h, 'serial', r.one_container_h, 'best', r.best.A.join('+'), '||', r.best.B.join('+'), r.best.hours); r.best.timeline.forEach(l => console.log('   ', l)); console.log('  ranked', JSON.stringify(r.splits_ranked)); }
