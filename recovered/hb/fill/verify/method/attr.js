// Parameterised re-implementation of run.js attribution. opt: thr (drop fraction), cpt, splitTok(fn item->weight), price ('ctx'|'cost'), breakAt(fn)
const S = JSON.parse(require('fs').readFileSync(__dirname + '/calls.json', 'utf8'));
const BK = { fetched: ['shell-read', 'file-read', 'search'], own: ['out-thinking', 'out-commands', 'out-writes', 'out-briefs', 'out-text'], start: ['window-start', 'window-start-after-compaction'], unclassified: ['shell-other'], messages: ['message-in'] };
const vis = (c) => Object.values(c.oc).reduce((a, b) => a + b, 0);
function run(opt = {}) {
  const thr = opt.thr == null ? 0.2 : opt.thr, cpt = opt.cpt || 2.21, iw = opt.itemW || ((it) => it.ch);
  const cat = {}, rep = {}, add = (o, k, v) => { o[k] = (o[k] || 0) + v; }; let act = 0, segs = 0;
  for (const s of S) { if (opt.group && s.g !== opt.group) continue; const C = s.calls; let st = 0, first = true;
    while (st < C.length) {
      let en = st; while (en + 1 < C.length && !(opt.breakAt ? opt.breakAt(C, en) : C[en + 1].ctx - C[en].ctx < -thr * C[en].ctx)) en++;
      segs++; const n = en - st + 1;
      // weight of content first present at call j: ctx mode -> number of calls j..en; cost mode -> 1.25 at first (cache write) + 0.1 each later read
      const W = (j) => opt.price === 'cost' ? (j > en ? 0 : 1.25 + 0.1 * (en - j)) : (en - j + 1);
      add(cat, first ? 'window-start' : 'window-start-after-compaction', C[st].ctx * W(st)); const seen = {};
      for (let k = st; k <= en; k++) { act += opt.price === 'cost' ? (C[k].cw * 1.25 + C[k].cr * 0.1 + C[k].inp) : C[k].ctx;
        if (opt.price === 'cost' && opt.outPrice) add(cat, 'out-generated', 5 * C[k].out);
        if (k === en) break;
        const w = W(k + 1), d = C[k + 1].ctx - C[k].ctx;
        const outC = Math.min(C[k].out, Math.max(0, d)), inT = Math.max(0, d - outC), v = vis(C[k]);
        const visT = C[k].th ? Math.min(outC, v / cpt) : outC;
        if (v > 0) for (const key in C[k].oc) add(cat, key, w * visT * C[k].oc[key] / v); else add(cat, 'out-thinking', w * visT);
        add(cat, 'out-thinking', w * (outC - visT));
        const items = C[k].inc.map((it) => ({ it, x: iw(it) })); const tot = items.reduce((a, b) => a + b.x, 0);
        if (tot === 0) { add(cat, 'unattributed', w * inT); continue; }
        for (const { it, x } of items) { const t = w * inT * x / tot; const c2 = opt.recat ? opt.recat(it) : it.cat; add(cat, c2, t);
          if ((c2 === 'file-read' || c2 === 'shell-read') && it.fp) { add(rep, seen[it.fp] ? 'again' : 'first', t); seen[it.fp] = 1; } else if (c2 === 'file-read' || c2 === 'shell-read') add(rep, 'nopath', t); }
      }
      st = en + 1; first = false; } }
  const tot = Object.values(cat).reduce((a, b) => a + b, 0); const r = { segs, actM: Math.round(act / 1e6), attM: Math.round(tot / 1e6) };
  for (const k in BK) r[k] = +(100 * BK[k].reduce((s, c) => s + (cat[c] || 0), 0) / tot).toFixed(1);
  r.rest = +(100 - Object.keys(BK).reduce((s, k) => s + r[k], 0)).toFixed(1);
  r.first = +(100 * (rep.first || 0) / tot).toFixed(1); r.again = +(100 * (rep.again || 0) / tot).toFixed(1);
  if (cat['out-generated']) r.outGen = +(100 * cat['out-generated'] / tot).toFixed(1);
  r.cat = cat; r.tot = tot; return r;
}
module.exports = { S, run, vis, BK };
if (require.main === module) { const r = run(); delete r.cat; console.log(r); }
