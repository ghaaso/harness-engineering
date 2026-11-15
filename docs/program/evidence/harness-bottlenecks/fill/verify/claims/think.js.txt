// Is thinking carried forward? Compare context growth minus output against incoming characters, for calls with and without thinking.
const H = require('./fill.js'), parse = require('./parse2.js');
(async () => {
  const S = { th: { d: 0, out: 0, ch: 0, n: 0, neg: 0 }, no: { d: 0, out: 0, ch: 0, n: 0, neg: 0 } };
  for (const d of H.dirs) for (const f of H.walk(H.path.join(H.P, d), [])) {
    const C = await parse(f, H.path.relative(H.path.join(H.P, d), f).includes(H.path.sep));
    for (let k = 0; k + 1 < C.length; k++) {
      const a = C[k], b = C[k + 1]; if (!b.nov) continue; const dd = b.ctx - a.ctx; if (dd < -0.2 * a.ctx) continue;
      const ch = a.inc.reduce((s, x) => s + x.ch, 0); const vis = Object.values(a.oc).reduce((s, x) => s + x, 0);
      const s = a.th ? S.th : S.no; s.n++; s.d += dd; s.out += a.out; s.ch += ch; s.vis = (s.vis || 0) + vis; if (dd - a.out < 0) s.neg++;
    }
  }
  for (const k in S) { const s = S[k]; console.log(k, 'calls', s.n, 'growth', (s.d / 1e6).toFixed(1) + 'M', 'output', (s.out / 1e6).toFixed(1) + 'M', 'visible out chars', ((s.vis || 0) / 1e6).toFixed(1) + 'M', 'incoming chars', (s.ch / 1e6).toFixed(1) + 'M', '(growth-output)/incoming chars', ((s.d - s.out) / s.ch).toFixed(3), 'calls with growth<output', s.neg); }
})();
