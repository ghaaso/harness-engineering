const fs = require('fs'); const S = process.argv[2]; const R = 'C:/Users/User/Documents/projects/harness-engineering/';
const NL = String.fromCharCode(10);
const recs = (fs.readFileSync(S + '/g1.jsonl', 'utf8') + fs.readFileSync(S + '/g2.jsonl', 'utf8')).split(NL).filter(Boolean).map(JSON.parse);
const dec = recs.filter(r => r.id), dismiss = (recs.find(r => r.dismiss) || {}).dismiss || {};
const LD = fs.readFileSync(R + 'docs/program/learning/MECHANISMS-DATA.md', 'utf8'), LN = fs.readFileSync(R + 'docs/program/learning/MECHANISMS-NEURAL.md', 'utf8');
const has = (k, n) => (k === 'D' ? LD : LN).includes(NL + '**' + n + ' ');
const faults = [], used = new Set(), byId = Object.fromEntries(dec.map(d => [d.id, d]));
const refs = s => [...s.matchAll(/([ND]) (\d+\.\d+)/g)].map(m => [m[1], m[2]]);
for (const d of dec) {
  if (d.options.filter(o => o.s === 'chosen').length !== 1) faults.push(d.id + ': not exactly one chosen option');
  if (d.options.length < 2) faults.push(d.id + ': fewer than two options');
  for (const o of d.options) {
    const rs = refs(o.by); for (const [k, n] of rs) { if (!has(k, n)) faults.push(d.id + ': no entry ' + k + ' ' + n); else if (k === 'D') used.add(n); }
    if (o.s === 'chosen' && rs.length === 0) faults.push(d.id + ': chosen option without an entry');
    if (o.s === 'out' && rs.length === 0 && !/assumption|record/.test(o.by)) faults.push(d.id + ': ruled out without a reason: ' + o.t);
  }
  for (const p of d.depends) if (!byId[p]) faults.push(d.id + ': depends on unknown ' + p);
}
for (const r of ['R1', 'R2', 'R3', 'R4', 'R5', 'R6']) if (!dec.some(d => d.requires.includes(r))) faults.push('demand ' + r + ' is served by no decision');
const layer = {}; const L = id => (id in layer) ? layer[id] : (layer[id] = byId[id].depends.length ? 1 + Math.max(...byId[id].depends.map(L)) : 0); dec.forEach(d => L(d.id));
const entries = [...LD.matchAll(/^\*\*(\d+\.\d+) /gm)].map(m => m[1]);
const cov = entries.map(n => ({ n, st: used.has(n) ? 'used' : dismiss['D ' + n] ? (dismiss['D ' + n].startsWith('carried') ? 'carried' : 'set aside') : 'MISSING', why: dismiss['D ' + n] || '' }));
cov.filter(c => c.st === 'MISSING').forEach(c => faults.push('entry D ' + c.n + ' neither used nor set aside'));
fs.writeFileSync(R + 'docs/program/hypotheses/DATA-REASONING-GRAPH-2026-11-25.jsonl', recs.map(r => JSON.stringify(r)).join(NL) + NL);
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const wrap = (s, n) => { const out = []; let cur = ''; for (const w of s.split(' ')) { if ((cur + ' ' + w).trim().length > n) { out.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); } if (cur) out.push(cur); return out; };
const CW = 300, GAP = 22, W = 1290; const rows = []; dec.forEach(d => (rows[layer[d.id]] = rows[layer[d.id]] || []).push(d));
let y = 10, cards = '', pos = {};
for (const row of rows) { let hmax = 0; const x0 = (W - (row.length * CW + (row.length - 1) * GAP)) / 2;
  row.forEach((d, i) => { let h = 40, body = '';
    for (const o of d.options) { const ls = wrap(o.t, 42); const mark = o.s === 'chosen' ? 'ok' : o.s === 'out' ? 'bad' : 'dom';
      body += `<div class="o ${mark}">` + ls.map(l => `<div>${esc(l)}</div>`).join('') + `<div class="by">${o.s === 'chosen' ? 'rests on ' : o.s === 'out' ? 'ruled out by ' : ''}${esc(o.by.length > 50 ? o.by.slice(0, 49) + '…' : o.by)}</div></div>`; h += ls.length * 17 + 24; }
    const x = x0 + i * (CW + GAP); pos[d.id] = { x, y, h }; hmax = Math.max(hmax, h);
    cards += `<div class="card" style="left:${x}px;top:${y}px;width:${CW}px;height:${h}px"><div class="h"><b>${d.id}</b> ${esc(d.title)} <span class="rq">${d.requires.length === 6 ? 'all demands' : d.requires.join(' ')}</span></div>${body}</div>`; });
  y += hmax + 46; }
let lines = ''; for (const d of dec) for (const p of d.depends) { const a = pos[p], b = pos[d.id]; const x1 = a.x + CW / 2, y1 = a.y + a.h, x2 = b.x + CW / 2, y2 = b.y; lines += `<path d="M${x1},${y1} C${x1},${y1 + 26} ${x2},${y2 - 26} ${x2},${y2}"/>`; }
const strip = cov.map(c => `<span class="cv ${c.st === 'used' ? 'u' : c.st === 'carried' ? 'c' : 's'}" title="${esc(c.why)}">${c.n}</span>`).join('');
const list = k => dec.flatMap(d => (d[k] || []).map(t => `<li><b>${d.id}</b> ${esc(t)}</li>`)).join('');
const page = fs.readFileSync(S + '/gpage.html', 'utf8').replace('@@H@@', y).replace('@@CARDS@@', cards).replace('@@LINES@@', lines).replace('@@STRIP@@', strip).replace('@@COUNTS@@', list('counts')).replace('@@ASSUME@@', list('assume')).replace('@@NUSED@@', cov.filter(c => c.st === 'used').length).replace('@@NALL@@', cov.length);
fs.writeFileSync(R + 'research-tree/build/improve/review-page/data-graph.html', page);
console.log(dec.length + ' decisions, ' + dec.reduce((a, d) => a + d.options.length, 0) + ' options, entries ' + cov.length + ' (used ' + cov.filter(c => c.st === 'used').length + '), faults: ' + (faults.length ? NL + faults.join(NL) : 'none'));
