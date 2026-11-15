// repo.cjs — repo-level decomposition of (transcript list$) vs (sum of last cost-state).
const fs = require('fs');
const T = 'C:/Users/User/AppData/Local/Temp/claude/b6c3202ba5123743/05fc6dc4-8dea-4418-8b3c-6244e4758c7b/scratchpad/tokens';
const P = JSON.parse(fs.readFileSync(T + '/pricing.json', 'utf8'));
P['claude-opus-4-8'] = { input: 5, cache_write_5m: 6.25, cache_write_1h: 10, cache_read: 0.5, output: 25 };
P['claude-haiku-4-5-20251001'] = { input: 1, cache_write_5m: 1.25, cache_write_1h: 2, cache_read: 0.1, output: 5 };
function price(m, r) { const p = P[m]; if (!p) return 0; let c5 = r.cc5m, c1 = r.cc1h; if (c5 + c1 < r.cc) c5 += r.cc - c5 - c1; return (r.in * p.input + c5 * p.cache_write_5m + c1 * p.cache_write_1h + r.cr * p.cache_read + r.out * p.output) / 1e6; }
const out = {};
for (const g of ['fixflow', 'clinic']) {
  const sess = JSON.parse(fs.readFileSync(`${T}/out/${g}.sessions.json`, 'utf8'));
  const rows = fs.readFileSync(`${T}/out/${g}.calls.jsonl`, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
  // need last cost-state ts per session: approximate via recon? we only have sessions.json costState w/o ts; use startTime from? Not present -> rescan cheaply is costly; use modelUsage only.
  const seen = new Map(); let dupUsd = 0, total = 0, unpriced = 0;
  const bySid = {};
  for (const r of rows) {
    const u = price(r.model, r); total += u; if (!P[r.model]) unpriced++;
    const k = r.id; if (seen.has(k)) { dupUsd += u; r.dup = true; } else seen.set(k, r.sid);
    const b = bySid[r.sid] || (bySid[r.sid] = { usd: 0, dedup: 0, main: 0, agent: 0, workflow: 0 }); b.usd += u; b[r.role] += u; if (!r.dup) b.dedup += u;
  }
  let csSum = 0, csSessions = 0, noCsUsd = 0, zeroCsUsd = 0, withCsUsd = 0; const csKeys = new Map(); let csDup = 0;
  const per = [];
  for (const s of sess) {
    const b = bySid[s.sid] || { usd: 0, dedup: 0 };
    if (!s.costState) { noCsUsd += b.usd; per.push({ sid: s.sid.slice(0, 8), cs: null, list: +b.usd.toFixed(2) }); continue; }
    csSum += s.costState.usd; csSessions++;
    const key = JSON.stringify(s.costState.modelUsage);
    if (s.costState.usd > 0 && csKeys.has(key)) csDup += s.costState.usd; else csKeys.set(key, s.sid);
    if (s.costState.usd === 0) zeroCsUsd += b.usd; else withCsUsd += b.usd;
    per.push({ sid: s.sid.slice(0, 8), cs: +s.costState.usd.toFixed(2), list: +b.usd.toFixed(2), dedup: +b.dedup.toFixed(2) });
  }
  out[g] = { total: +total.toFixed(2), unpricedRows: unpriced, dupRowUsd: +dupUsd.toFixed(2), dedupTotal: +(total - dupUsd).toFixed(2), csSum: +csSum.toFixed(2), csDupForkUsd: +csDup.toFixed(2), csSessions, sessions: sess.length, listInSessionsNoCs: +noCsUsd.toFixed(2), listInSessionsCsZero: +zeroCsUsd.toFixed(2), listInSessionsWithCs: +withCsUsd.toFixed(2), per };
}
fs.writeFileSync(T + '/coststate/repo.json', JSON.stringify(out, null, 1));
for (const g in out) { const { per, ...rest } = out[g]; console.log(g, JSON.stringify(rest)); console.log(per.sort((a, b) => b.list - a.list).map(p => `${p.sid} cs=${p.cs} list=${p.list} dedup=${p.dedup}`).join('\n')); }
