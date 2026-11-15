// Does the two-component path key merge different files? Resolve cd + path for shell reads, full path for Read.
const { S } = require('./attr.js'); const BS = String.fromCharCode(92);
const norm = (p) => p.split(BS).join('/').replace(/^\/c\//i, 'c:/').toLowerCase().replace(/.*\.claude\/worktrees\/[^/]+\//, 'WT/').replace(/.*24_clinic_workshop\//, 'WT/');
function full(it) {
  if (it.cat === 'file-read') return norm(String(it.rp || ''));
  const t = String(it.cmd || '').split(BS).join('/'); const cd = (t.match(/^\s*cd\s+("([^"]*)"|(\S+))/) || []); const base = cd[2] || cd[3] || '';
  const rest = t.replace(/^cd\s+("[^"]*"|\S+)\s*(&&|;)?/, ''); const m = rest.match(/[\w.\/~-]+\.[A-Za-z0-9]{1,6}(?![\w.\/])/); if (!m) return '';
  const p = m[0]; return norm(/^([a-z]:|\/)/i.test(p) ? p : (base ? base.replace(/\/$/, '') + '/' : '?/') + p);
}
let ag = 0, col = 0, unk = 0, tot = 0; const ex = [];
for (const s of S) { const C = s.calls; let st = 0; while (st < C.length) { let en = st; while (en + 1 < C.length && C[en + 1].ctx - C[en].ctx >= -0.2 * C[en].ctx) en++;
  tot += C[st].ctx * (en - st + 1); const seen = {};
  for (let k = st; k < en; k++) { const a = C[k], d = C[k + 1].ctx - a.ctx, inT = Math.max(0, d - Math.min(a.out, Math.max(0, d))), w = en - k, t0 = a.inc.reduce((x, y) => x + y.ch, 0); tot += w * Math.max(0, d);
    for (const it of a.inc) { if (!((it.cat === 'file-read' || it.cat === 'shell-read') && it.fp)) continue; const tok = t0 ? w * inT * it.ch / t0 : 0; const f = full(it);
      if (seen[it.fp]) { ag += tok; const prev = seen[it.fp]; if (f.includes('?/') || [...prev].some((x) => x.includes('?/'))) unk += tok; else if (!prev.has(f)) { col += tok; if (ex.length < 12) ex.push([it.fp, [...prev].slice(0, 2), f]); } }
      (seen[it.fp] = seen[it.fp] || new Set()).add(f); } }
  st = en + 1; } }
console.log('again', (100 * ag / tot).toFixed(2) + '%', 'resolved to a different full path', (100 * col / tot).toFixed(2) + '%', 'unresolvable (no cd)', (100 * unk / tot).toFixed(2) + '%');
ex.forEach((e) => console.log(JSON.stringify(e).slice(0, 300)));
