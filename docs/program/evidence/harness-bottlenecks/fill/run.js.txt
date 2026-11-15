// Attribute November context tokens to categories and print shares per group.
const H = require('./fill.js'), parse = require('./parse.js');
const G = {}; const TOP = {}; let WIN = 0;
const add = (o, k, v) => { o[k] = (o[k] || 0) + v; };
(async () => {
  const all = [];
  for (const d of H.dirs) {
    const isWt = d.includes('worktrees');
    for (const f of H.walk(H.path.join(H.P, d), [])) {
      const rel = H.path.relative(H.path.join(H.P, d), f).split(H.path.sep).join('/');
      const isSub = rel.includes('/');
      const g = isSub ? 'subagents' : isWt ? 'slice-main' : 'root-main';
      all.push({ g, calls: await parse(f, isSub) });
    }
  }
  // chars per output token, from calls that carried no thinking block
  let vc = 0, vo = 0;
  for (const s of all) for (const c of s.calls) if (!c.th && c.out > 0) { vc += Object.values(c.oc).reduce((a, b) => a + b, 0); vo += c.out; }
  const cpt = vc / vo;
  for (const s of all) {
    const R = (G[s.g] = G[s.g] || { cat: {}, kind: {}, words: {}, repeat: {}, actual: 0, cr: 0, calls: 0, files: 0, segs: 0, bases: [] });
    const C = s.calls; if (!C.length) continue; R.files++;
    let st = 0, first = true;
    while (st < C.length) {
      let en = st; while (en + 1 < C.length && C[en + 1].ctx - C[en].ctx >= -0.2 * C[en].ctx) en++;
      const suf = new Array(en - st + 2).fill(0);
      for (let k = en; k >= st; k--) suf[k - st] = suf[k - st + 1] + (C[k].nov ? 1 : 0);
      R.segs++; if (first) R.bases.push(C[st].ctx);
      add(R.cat, first ? 'window-start' : 'window-start-after-compaction', C[st].ctx * suf[0]);
      const seen = {}; WIN++;
      for (let k = st; k <= en; k++) {
        if (C[k].nov) { R.actual += C[k].ctx; R.cr += C[k].cr; R.calls++; }
        if (k === en) break;
        const w = suf[k + 1 - st]; const d = C[k + 1].ctx - C[k].ctx;
        const outC = Math.min(C[k].out, Math.max(0, d)), inT = Math.max(0, d - outC);
        const vis = Object.values(C[k].oc).reduce((a, b) => a + b, 0);
        const visT = C[k].th ? Math.min(outC, vis / cpt) : outC;
        if (vis > 0) for (const key in C[k].oc) add(R.cat, key, w * visT * C[k].oc[key] / vis); else add(R.cat, 'out-thinking', w * visT);
        add(R.cat, 'out-thinking', w * (outC - visT));
        const tot = C[k].inc.reduce((a, b) => a + b.ch, 0);
        if (tot === 0) { add(R.cat, 'unattributed', w * inT); continue; }
        for (const it of C[k].inc) {
          const t = w * inT * it.ch / tot; add(R.cat, it.cat, t);
          if (it.cat === 'file-read' || it.cat === 'shell-read') add(R.kind, it.cat + ':' + it.kind, t);
          if (it.cat.startsWith('shell')) add(R.words, it.cat + ' ' + it.extra, t);
          if ((it.cat === 'file-read' || it.cat === 'shell-read') && it.fp) { add(R.repeat, seen[it.fp] ? 'opened again in the same window' : 'first open in the window', t); seen[it.fp] = 1; const T = (TOP[it.fp] = TOP[it.fp] || { t: 0, w: {}, g: {} }); T.t += t; T.w[WIN] = 1; add(T.g, s.g, t); } else if (it.cat === 'file-read' || it.cat === 'shell-read') add(R.repeat, 'no file path in the command', t);
        }
      }
      st = en + 1; first = false;
    }
  }
  const top = Object.entries(TOP).map(([k, v]) => ({ path: k, tokens: Math.round(v.t), windows: Object.keys(v.w).length, groups: v.g })).sort((x, y) => y.tokens - x.tokens);
  H.fs.writeFileSync('fill-result.json', JSON.stringify({ cpt, G, windows: WIN, distinctPaths: top.length, top: top.slice(0, 60) }, null, 1));
  console.log('chars per output token (no-thinking calls): ' + cpt.toFixed(2));
})();
