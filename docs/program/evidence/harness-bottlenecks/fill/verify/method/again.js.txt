// Classify every "opened again in the same window" item: exact repeat, edited in between, other range/command.
const { S } = require('./attr.js'); const H = require('./fill.js'); const BS = String.fromCharCode(92);
const key = (p) => { const t = String(p || '').split(BS).join('/'); const m = t.match(/[\w.\/~-]+\.[A-Za-z0-9]{1,6}(?![\w.\/])/); return m ? m[0].split('/').slice(-2).join('/').toLowerCase() : ''; };
const allPaths = (s) => (String(s || '').split(BS).join('/').match(/[\w.\/~-]+\.[A-Za-z0-9]{1,6}(?![\w.\/])/g) || []).map((m) => m.split('/').slice(-2).join('/').toLowerCase());
const writeCmd = (c) => /\bsed\s+(-[a-zA-Z]*i|--in-place)|perl\s+-[a-z0-9]*i|cat\s*>|write_text|write_bytes|open\([^)]*['"]w|\.write\(|ruff format|ruff check --fix|git (checkout|restore|stash|apply)|\bcp\b|\bmv\b/.test(c);
const out = []; const A = {}; const add = (k, v) => (A[k] = (A[k] || 0) + v); let totAll = 0;
for (const s of S) { const C = s.calls; let st = 0;
  while (st < C.length) { let en = st; while (en + 1 < C.length && C[en + 1].ctx - C[en].ctx >= -0.2 * C[en].ctx) en++;
    totAll += C[st].ctx * (en - st + 1);
    const seen = {}, edits = {}; // fp -> [{k, sig, full, cmd}], fp -> [k]
    for (let k = st; k <= en; k++) { const a = C[k];
      for (const e of a.edits) { const f = key(e.fp); if (f) (edits[f] = edits[f] || []).push(k); }
      for (const it of a.inc) if (it.cmd && writeCmd(it.cmd)) for (const f of allPaths(it.cmd)) (edits[f] = edits[f] || []).push(k);
      if (k === en) break;
      const d = C[k + 1].ctx - a.ctx, inT = Math.max(0, d - Math.min(a.out, Math.max(0, d))), w = en - k, t0 = a.inc.reduce((x, y) => x + y.ch, 0); totAll += w * Math.max(0, d);
      for (const it of a.inc) { if (!((it.cat === 'file-read' || it.cat === 'shell-read') && it.fp)) continue; const tok = t0 ? w * inT * it.ch / t0 : 0;
        const sig = it.cat === 'file-read' ? 'R|' + it.rp + '|' + (it.off || '') + '|' + (it.lim || '') : 'B|' + String(it.cmd).replace(/\s+/g, ' ');
        const prev = seen[it.fp];
        if (prev) { const p = prev[prev.length - 1]; const ed = (edits[it.fp] || []).some((x) => x > p.k && x <= k);
          const exact = prev.some((q) => q.sig === sig); const fullDiff = it.cat === 'file-read' && prev.some((q) => q.full && it.rp && q.full.toLowerCase() !== String(it.rp).toLowerCase()) && !prev.some((q) => q.full && String(q.full).toLowerCase() === String(it.rp).toLowerCase());
          const cls = fullDiff ? 'different file, same key' : ed ? (exact ? 'exact repeat after an edit' : 'other read after an edit') : exact ? 'exact repeat, no edit between' : 'other range/command, no edit between';
          add(cls, tok); if (out.length < 5000) out.push({ cls, tok: Math.round(tok), fp: it.fp, k, pk: p.k, prev: p.sig.slice(0, 300), now: sig.slice(0, 300) });
        }
        (seen[it.fp] = seen[it.fp] || []).push({ k, sig, full: it.rp }); } }
    st = en + 1; } }
let ag = 0; for (const k in A) ag += A[k]; console.log('again total', (100 * ag / totAll).toFixed(2) + '% of all');
for (const [k, v] of Object.entries(A).sort((a, b) => b[1] - a[1])) console.log(k.padEnd(40), (100 * v / totAll).toFixed(2) + '% of all', (100 * v / ag).toFixed(1) + '% of again');
require('fs').writeFileSync('again.json', JSON.stringify(out));
