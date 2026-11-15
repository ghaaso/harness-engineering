// window.cjs — does cost-state == list price over rows in [startTime, cut]?  Plus implied rates.
const fs = require('fs');
const T = 'C:/Users/User/AppData/Local/Temp/claude/b6c3202ba5123743/05fc6dc4-8dea-4418-8b3c-6244e4758c7b/scratchpad/tokens';
const P = JSON.parse(fs.readFileSync(T + '/pricing.json', 'utf8'));
const o = JSON.parse(fs.readFileSync(T + '/coststate/recon.json', 'utf8'));
const rows = {};
for (const g of ['fixflow', 'clinic']) rows[g] = fs.readFileSync(`${T}/out/${g}.calls.jsonl`, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
function price(m, r) { const p = P[m]; if (!p) return 0; let c5 = r.cc5m, c1 = r.cc1h; if (c5 + c1 < r.cc) c5 += r.cc - c5 - c1; return (r.in * p.input + c5 * p.cache_write_5m + c1 * p.cache_write_1h + r.cr * p.cache_read + r.out * p.output) / 1e6; }
const res = [];
for (const s of o) {
  const st = new Date(s.startTime).toISOString(), cut = s.lastCsPrevTs;
  const R = rows[s.g].filter(r => r.sid === s.sid);
  const bucket = (pred) => { const b = {}; for (const r of R) if (pred(r)) { const k = r.model; const a = b[k] || (b[k] = { n: 0, in: 0, cc: 0, cr: 0, out: 0, usd: 0, byRole: {} }); a.n++; a.in += r.in; a.cc += r.cc; a.cr += r.cr; a.out += r.out; const u = price(r.model, r); a.usd += u; a.byRole[r.role] = (a.byRole[r.role] || 0) + u; } return b; };
  const win = bucket(r => r.ts >= st && r.ts <= cut), before = bucket(r => r.ts < st), after = bucket(r => r.ts > cut);
  const tot = (b) => Object.values(b).reduce((x, y) => x + y.usd, 0);
  const firstRowTs = R.map(r => r.ts).sort()[0];
  console.log(`\n=== ${s.g} ${s.sid.slice(0, 8)} rows ${firstRowTs} .. start ${st} .. cut ${cut}`);
  console.log(`  CS$=${s.usd.toFixed(2)}  list$ before-start=${tot(before).toFixed(2)} window=${tot(win).toFixed(2)} after-cut=${tot(after).toFixed(2)}`);
  for (const m of new Set([...Object.keys(s.modelUsage), ...Object.keys(win)])) {
    const u = s.modelUsage[m], w = win[m] || { n: 0, cr: 0, cc: 0, out: 0, in: 0, usd: 0, byRole: {} };
    console.log(`  ${m.padEnd(26)} CS cr=${u ? (u.cacheReadInputTokens / 1e6).toFixed(2) : '-'}M cc=${u ? (u.cacheCreationInputTokens / 1e6).toFixed(2) : '-'}M out=${u ? u.outputTokens : '-'} in=${u ? u.inputTokens : '-'} $=${u ? u.costUSD.toFixed(2) : '-'} | win n=${w.n} cr=${(w.cr / 1e6).toFixed(2)}M cc=${(w.cc / 1e6).toFixed(2)}M out=${w.out} in=${w.in} list$=${w.usd.toFixed(2)} roles=${JSON.stringify(Object.fromEntries(Object.entries(w.byRole).map(([k, v]) => [k, +v.toFixed(2)])))}`);
  }
  res.push({ g: s.g, sid: s.sid, cs: s.usd, before: tot(before), win: tot(win), after: tot(after) });
}
fs.writeFileSync(T + '/coststate/window.json', JSON.stringify(res, null, 1));
