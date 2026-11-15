// allsess.cjs — for every session with cost-state: split transcript list$ into
// before startTime | inside [startTime, lastCS] | after lastCS, and compare with cost-state usd.
const fs = require('fs'), path = require('path'), readline = require('readline');
const T = 'C:/Users/User/AppData/Local/Temp/claude/b6c3202ba5123743/05fc6dc4-8dea-4418-8b3c-6244e4758c7b/scratchpad/tokens';
const ROOT = 'C:/Users/User/.claude/projects';
const P = JSON.parse(fs.readFileSync(T + '/pricing.json', 'utf8'));
P['claude-opus-4-8'] = { input: 5, cache_write_5m: 6.25, cache_write_1h: 10, cache_read: 0.5, output: 25 };
function price(m, r) { const p = P[m]; if (!p) return 0; let c5 = r.cc5m, c1 = r.cc1h; if (c5 + c1 < r.cc) c5 += r.cc - c5 - c1; return (r.in * p.input + c5 * p.cache_write_5m + c1 * p.cache_write_1h + r.cr * p.cache_read + r.out * p.output) / 1e6; }
(async () => {
  const res = {};
  for (const g of ['fixflow', 'clinic']) {
    const sess = JSON.parse(fs.readFileSync(`${T}/out/${g}.sessions.json`, 'utf8'));
    const rows = fs.readFileSync(`${T}/out/${g}.calls.jsonl`, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
    const seen = new Set();
    for (const r of rows) { r.usd = price(r.model, r); r.dup = seen.has(r.id); seen.add(r.id); }
    const acc = { list: 0, listDedup: 0, noCs: 0, csZero: 0, before: 0, inside: 0, after: 0, cs: 0, csDupFork: 0, insideMinusCsByRun: 0, dupRows: 0 };
    const csSeen = new Map(); const per = [];
    for (const s of sess) {
      const R = rows.filter(r => r.sid === s.sid);
      const L = R.reduce((a, r) => a + r.usd, 0), Ld = R.filter(r => !r.dup).reduce((a, r) => a + r.usd, 0);
      acc.list += L; acc.listDedup += Ld; acc.dupRows += L - Ld;
      if (!s.costState) { acc.noCs += Ld; continue; }
      // scan transcript for last cost-state
      const rl = readline.createInterface({ input: fs.createReadStream(path.join(ROOT, s.store, s.sid + '.jsonl')), crlfDelay: Infinity });
      let lastTs = '', last = null;
      for await (const line of rl) {
        if (line.startsWith('{"type":"api-request-blob"') || line.startsWith('{"type":"file-history')) continue;
        if (!line.includes('"timestamp"') && !line.startsWith('{"type":"cost-state"')) continue;
        let x; try { x = JSON.parse(line); } catch { continue; }
        if (x.timestamp) lastTs = x.timestamp;
        if (x.type === 'cost-state') last = { ts: lastTs, start: new Date(x.startTime).toISOString(), usd: x.totalCostUSD, key: x.startTime + ':' + x.totalCostUSD };
      }
      if (s.costState.usd === 0) { acc.csZero += Ld; per.push({ sid: s.sid.slice(0, 8), cs: 0, list: +Ld.toFixed(2) }); continue; }
      const fork = csSeen.has(last.key); csSeen.set(last.key, s.sid);
      if (fork) acc.csDupFork += last.usd; else acc.cs += last.usd;
      const D = R.filter(r => !r.dup);
      const before = D.filter(r => r.ts < last.start).reduce((a, r) => a + r.usd, 0);
      const after = D.filter(r => r.ts > last.ts).reduce((a, r) => a + r.usd, 0);
      const inside = Ld - before - after;
      acc.before += before; acc.after += after; acc.inside += inside;
      per.push({ sid: s.sid.slice(0, 8), cs: +last.usd.toFixed(2), fork, list: +Ld.toFixed(2), before: +before.toFixed(2), inside: +inside.toFixed(2), after: +after.toFixed(2), insideMinusCs: +(inside - (fork ? 0 : last.usd)).toFixed(2) });
    }
    for (const k in acc) acc[k] = +acc[k].toFixed(2);
    res[g] = { acc, per };
    console.log(g, JSON.stringify(acc));
  }
  fs.writeFileSync(T + '/coststate/allsess.json', JSON.stringify(res, null, 1));
  for (const g in res) for (const p of res[g].per) if (Math.abs(p.insideMinusCs || 0) > 3 || p.before > 1 || p.after > 1 || p.fork) console.log(g, JSON.stringify(p));
})();
