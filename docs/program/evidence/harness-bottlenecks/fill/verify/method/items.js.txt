// Every incoming item with its attributed tokens under the baseline method. Writes items.json (shell + read items with commands).
const { S } = require('./attr.js'); const out = []; let tot = 0;
for (const s of S) { const C = s.calls; let st = 0, wi = 0; while (st < C.length) { let en = st; while (en + 1 < C.length && C[en + 1].ctx - C[en].ctx >= -0.2 * C[en].ctx) en++; wi++;
  tot += C[st].ctx * (en - st + 1);
  for (let k = st; k < en; k++) { const a = C[k], d = C[k + 1].ctx - a.ctx, inT = Math.max(0, d - Math.min(a.out, Math.max(0, d))), w = en - k; const t0 = a.inc.reduce((x, y) => x + y.ch, 0); tot += w * Math.max(0, d); if (!t0) continue;
    a.inc.forEach((it, j) => { if (it.cat.startsWith('shell') || it.cat === 'file-read') out.push({ f: s.f, g: s.g, wt: s.f.startsWith('--claude-worktrees'), win: wi, k, j, cat: it.cat, w: it.extra, fp: it.fp, tok: w * inT * it.ch / t0, ch: it.ch, cmd: it.cmd, rp: it.rp, off: it.off, lim: it.lim, err: it.err, edits: a.edits.map((e) => e.fp) }); }); }
  st = en + 1; } }
require('fs').writeFileSync('items.json', JSON.stringify({ tot, items: out }));
const by = {}; for (const i of out) by[i.cat] = (by[i.cat] || 0) + i.tok; for (const k in by) console.log(k, (100 * by[k] / tot).toFixed(2) + '%'); console.log('items', out.length, 'tot', (tot / 1e6).toFixed(0) + 'M');
