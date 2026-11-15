// Identity test: d = ctx(k+1)-ctx(k) vs out_k + incChars/r. Thinking kept or dropped?
const S = JSON.parse(require('fs').readFileSync('calls.json', 'utf8'));
const vis = (c) => Object.values(c.oc).reduce((a, b) => a + b, 0);
const B = {};
const add = (k, d, o, i, v) => { const b = (B[k] = B[k] || { n: 0, d: 0, o: 0, i: 0, v: 0, neg: 0 }); b.n++; b.d += d; b.o += o; b.i += i; b.v += v; if (d - o < 0) b.neg++; };
for (const s of S) { const C = s.calls; for (let k = 0; k + 1 < C.length; k++) {
  const a = C[k], b = C[k + 1], d = b.ctx - a.ctx; if (d < -0.2 * a.ctx) continue;
  const inc = a.inc.reduce((x, y) => x + y.ch, 0); const hasMsg = a.inc.some((x) => x.cat === 'message-in'); const hasSum = a.inc.some((x) => x.cat === 'summary');
  const key = (a.th ? 'TH' : 'no') + (hasMsg ? '+msg' : '') + (hasSum ? '+sum' : '') + ' ' + a.model.replace('claude-', '');
  add(key, d, a.out, inc, vis(a));
} }
for (const [k, b] of Object.entries(B).sort()) if (b.n > 20) console.log(k.padEnd(28), 'n', b.n, 'sum d', (b.d / 1e6).toFixed(2) + 'M', 'out', (b.o / 1e6).toFixed(2) + 'M', 'd-out', ((b.d - b.o) / 1e6).toFixed(2) + 'M', 'incChars/(d-out)', (b.i / (b.d - b.o)).toFixed(2), 'incChars/(d-vis/2.21)', (b.i / (b.d - b.v / 2.21)).toFixed(2), 'neg(d<out)', b.neg);
