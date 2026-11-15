const { S, run, vis } = require('./attr.js');
const K = {}; const add = (k, c, o) => { const x = (K[k] = K[k] || { c: 0, o: 0, n: 0 }); x.c += c; x.o += o; x.n++; };
let tc = 0, tv = 0, to = 0, tn = 0;
for (const s of S) for (const c of s.calls) { const v = vis(c); if (!c.th && c.out > 0) { let dom = 'mixed'; for (const k in c.oc) if (c.oc[k] > 0.9 * v) dom = k; add(dom + ' ' + c.model.replace('claude-', ''), v, c.out); add('ALL nothink', v, c.out); }
  if (c.th && c.thc > 0) { tc += c.thc; tv += v; to += c.out; tn++; } }
for (const [k, x] of Object.entries(K).sort()) if (x.n > 30) console.log(k.padEnd(30), 'n', x.n, 'chars/token', (x.c / x.o).toFixed(2));
console.log('calls with thinking text recorded', tn, '(thinking+visible chars)/out', ((tc + tv) / to).toFixed(2), 'visible share', (tv / (tc + tv)).toFixed(2));
const pick = (r) => { const c = r.cat, t = r.tot, p = (k) => +(100 * (c[k] || 0) / t).toFixed(1); return { own: r.own, thinking: p('out-thinking'), commands: p('out-commands'), writes: p('out-writes'), text: p('out-text') }; };
for (const cpt of [1.6, 2.21, 2.8, 3.5]) console.log('cpt', cpt, JSON.stringify(pick(run({ cpt }))));
