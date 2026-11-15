// Claims check: same window-fill method as fill/run.js, plus finer read kinds, repeat-read kinds, call kinds, usage totals.
const H = require('./fill.js'), parse = require('./parse2.js'), K = require('./cls.js'), IV = require('./iv.js');
const add = (o, k, v) => { o[k] = (o[k] || 0) + v; };
const READC = new Set(['file-read', 'shell-read', 'search']);
(async () => {
  const all = [];
  for (const d of H.dirs) {
    const isWt = d.includes('worktrees');
    for (const f of H.walk(H.path.join(H.P, d), [])) {
      const rel = H.path.relative(H.path.join(H.P, d), f).split(H.path.sep).join('/');
      const isSub = rel.includes('/');
      all.push({ g: isSub ? 'subagents' : isWt ? 'slice-main' : 'root-main', calls: await parse(f, isSub) });
    }
  }
  let vc = 0, vo = 0;
  for (const s of all) for (const c of s.calls) if (!c.th && c.out > 0) { vc += Object.values(c.oc).reduce((a, b) => a + b, 0); vo += c.out; }
  const cpt = vc / vo; const G = {}; const TOP = {}; let WIN = 0;
  for (const s of all) {
    const R = (G[s.g] = G[s.g] || { tot: 0, cat: {}, fine: {}, rep2: {}, rep3: {}, raw: {}, ed: {}, callK: {}, callN: {}, use: { inp: 0, cr: 0, cw: 0, cw1: 0, out: 0 }, models: {} });
    const C = s.calls; let st = 0;
    for (const c of C) if (c.nov) {
      R.use.inp += c.inp; R.use.cr += c.cr; R.use.cw += c.cw; R.use.cw1 += c.cw1; R.use.out += c.out; add(R.models, c.model, c.ctx);
      const ks = c.uses.map((u) => { const rc = H.resultCat(u); return READC.has(rc[0]) ? (K.LOCATE(K.fine(u.name, u.input)) ? 'locate' : 'read') : 'other'; });
      const kk = !ks.length ? 'no tool' : ks.every((x) => x === 'locate') ? 'locate only' : ks.every((x) => x !== 'other') ? 'read/locate only' : 'other tool';
      add(R.callK, kk, c.ctx); add(R.callN, kk, 1);
    }
    while (st < C.length) {
      let en = st; while (en + 1 < C.length && C[en + 1].ctx - C[en].ctx >= -0.2 * C[en].ctx) en++;
      const suf = new Array(en - st + 2).fill(0);
      for (let k = en; k >= st; k--) suf[k - st] = suf[k - st + 1] + (C[k].nov ? 1 : 0);
      add(R.cat, 'window-start', C[st].ctx * suf[0]); if (C[st].nov) add(R.raw, 'window-start', C[st].ctx); R.tot += C[st].ctx * suf[0];
      const seen = {}, lastSig = {}, edited = {}, ivs = {}, wEd = {}, wRd = []; WIN++;
      for (let k = st; k < en; k++) {
        const w = suf[k + 1 - st]; const d = C[k + 1].ctx - C[k].ctx;
        const outC = Math.min(C[k].out, Math.max(0, d)), inT = Math.max(0, d - outC);
        R.tot += w * outC; add(R.cat, 'own output', w * outC); if (C[k+1].nov) { add(R.raw, 'own output', outC); }
        for (const u of C[k].uses) {
          const nm = u.name; const ip = u.input || {};
          if (['Edit', 'Write', 'MultiEdit', 'NotebookEdit'].includes(nm)) { edited[K.pathOf(ip.file_path)] = 1; wEd[K.pathOf(ip.file_path)] = 1; }
          if ((nm === 'Bash' || nm === 'PowerShell') && /^sed -i|>\s*\S/.test(K.strip(ip.command))) { const p = K.pathOf(K.strip(ip.command).split('>').pop()); if (p) { edited[p] = 1; wEd[p] = 1; } }
        }
        const tot = C[k].inc.reduce((a, b) => a + b.ch, 0);
        if (tot === 0) { R.tot += w * inT; add(R.cat, 'unattributed', w * inT); continue; }
        for (const it of C[k].inc) {
          const t = w * inT * it.ch / tot; R.tot += t; add(R.cat, READC.has(it.cat) ? 'fetched' : 'other in', t); if (C[k+1].nov) add(R.raw, READC.has(it.cat) ? 'fetched' : 'other in', inT * it.ch / tot);
          if (!READC.has(it.cat)) continue;
          add(R.fine, K.fine(it.tn, it.ti), t);
          if (it.cat === 'search' || !it.fp) continue;
          const ti0 = it.ti || {}; const sig = it.tn + '|' + (ti0.command != null ? String(ti0.command).trim() : JSON.stringify([ti0.file_path, ti0.offset, ti0.limit, ti0.pattern, ti0.path]));
          let r;
          if (!seen[it.fp]) r = 'first open'; else if (edited[it.fp]) r = 'again, after an edit of that path'; else if (lastSig[it.fp] && lastSig[it.fp].has(sig)) r = 'again, identical command, no edit between'; else r = 'again, different command/range, no edit';
          add(R.rep2, r, t); { const x = IV(it.tn, it.ti); if (edited[it.fp]) ivs[it.fp] = []; const Lv = ivs[it.fp] || []; if (!x) add(R.rep3, seen[it.fp] ? 'repeat path, not a line read (grep/git etc)' : 'first, not a line read', t); else if (!seen[it.fp] || !Lv.length) add(R.rep3, 'lines new to the window', t); else { const c = IV.covered(x, Lv); if (c < 0) add(R.rep3, 'whole file after ranges only (overlap unknown)', t); else { add(R.rep3, 'lines already read in this window, no edit between', t * c); add(R.rep3, 'lines new to the window', t * (1 - c)); } } if (x) (ivs[it.fp] = Lv).push(x); } seen[it.fp] = 1; if (edited[it.fp]) { lastSig[it.fp] = new Set(); delete edited[it.fp]; }
          (lastSig[it.fp] = lastSig[it.fp] || new Set()).add(sig);
          wRd.push([it.fp, t, K.LOCATE(K.fine(it.tn, it.ti))]); const T = (TOP[it.fp] = TOP[it.fp] || { t: 0, w: {}, firstT: 0 }); T.t += t; if (!T.w[WIN]) { T.w[WIN] = 1; } if (r === 'first open') T.firstT += t;
        }
      }
      for (const [p, t, loc] of wRd) add(R.ed, loc ? 'locate on a path' : wEd[p] ? 'read of a path edited in this window' : 'read of a path not edited in this window', t); st = en + 1;
    }
  }
  const top = Object.entries(TOP).map(([k, v]) => ({ p: k, t: v.t, n: Object.keys(v.w).length, f: v.firstT })).sort((a, b) => b.t - a.t);
  H.fs.writeFileSync('run2-result.json', JSON.stringify({ cpt, WIN, G, top }, null, 0));
  console.log('done cpt ' + cpt.toFixed(2) + ' windows ' + WIN + ' paths ' + top.length);
})();
