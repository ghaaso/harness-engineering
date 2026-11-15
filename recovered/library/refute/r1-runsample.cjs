// R1 refuter: for exploration runs contained (>=80 % of files) in one earlier finished window, where does the
// containing window sit (same session or another), and what are the run sizes. Prints a small sample.
const fs = require('fs');
const [inF, seed] = process.argv.slice(2);
const calls = fs.readFileSync(inF, 'utf8').trim().split('\n').map(JSON.parse);
const LOOK = new Set(['Read', 'Grep', 'Glob', 'LS', 'WebFetch', 'WebSearch', 'ToolSearch']);
const WRITE = /\bsed\s+-i\b|\btee\b|(^|[^0-9&>2])>\s*[^&\s]|\bmkdir\b|\brm\b|\bmv\b|\bcp\b|\bnpm\b|\bnpx\b|\bpytest\b|\bnode\b|\bpython3?\b|\bdocker\b|\bgit\s+(commit|push|merge|checkout|add|rebase|reset|worktree|stash)/i;
const look = c => c.tools.length && c.tools.every(t => LOOK.has(t.n) || ((t.n === 'Bash' || t.n === 'PowerShell') && t.cmd && !WRITE.test(t.cmd)));
const W = new Map();
for (const c of calls) { let w = W.get(c.win); if (!w) { w = { id: c.win, role: c.role, start: c.ts, end: c.ts, P: new Set() }; W.set(c.win, w); } w.end = Math.max(w.end, c.ts); w.start = Math.min(w.start, c.ts); for (const t of c.tools) for (const p of (t.rp || [])) w.P.add(p); }
const byWin = new Map(); for (const c of calls) { const l = byWin.get(c.win) || []; l.push(c); byWin.set(c.win, l); }
const runs = [];
for (const [id, l] of byWin) { let r = null; for (const c of l) { if (look(c)) { if (!r) r = { win: id, ts: c.ts, tok: 0, n: 0, P: new Set() }; r.tok += c.ctx; r.n++; for (const t of c.tools) for (const p of (t.rp || [])) r.P.add(p); } else if (r) { runs.push(r); r = null; } } if (r) runs.push(r); }
let tot = 0; const agg = { sameSess: 0, otherSess: 0, gapH: [], sizes: {} }; const sample = [];
for (const r of runs) {
  if (!r.P.size) continue;
  let best = null, bc = 0;
  for (const w of W.values()) { if (w.id === r.win || w.end > r.ts || !w.P.size) continue; let k = 0; for (const p of r.P) if (w.P.has(p)) k++; const cc = k / r.P.size; if (cc > bc || (cc === bc && best && w.end > best.end)) { bc = cc; best = w; } }
  if (bc < 0.8) continue;
  tot += r.tok;
  const same = best.id.split('/')[0] === r.win.split('/')[0];
  if (same) agg.sameSess += r.tok; else agg.otherSess += r.tok;
  agg.gapH.push((r.ts - best.end) / 3.6e6);
  const sz = r.P.size >= 5 ? '5+' : String(r.P.size); agg.sizes[sz] = (agg.sizes[sz] || 0) + r.tok;
  sample.push({ run: r.win.slice(-30) + ' (' + W.get(r.win).role + ')', files: [...r.P].slice(0, 4), calls: r.n, by: best.id.slice(-30) + ' (' + best.role + ')', gapH: +((r.ts - best.end) / 3.6e6).toFixed(1) });
}
agg.gapH.sort((a, b) => a - b);
const pct = x => (100 * x).toFixed(1) + '%';
console.log(JSON.stringify({ containedRunTokens: tot, sameSession: pct(agg.sameSess / tot), otherSession: pct(agg.otherSess / tot), medianGapHours: agg.gapH[Math.floor(agg.gapH.length / 2)].toFixed(1), byDistinctFilesInRun: Object.fromEntries(Object.entries(agg.sizes).map(([k, v]) => [k, pct(v / tot)])) }));
let s = +seed || 7; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
for (let i = 0; i < 8; i++) console.log(JSON.stringify(sample[Math.floor(rnd() * sample.length)]));
