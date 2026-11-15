// recon.cjs — reconcile last cost-state line vs transcript call rows for chosen sessions.
const fs = require('fs'), path = require('path'), readline = require('readline');
const T = 'C:/Users/User/AppData/Local/Temp/claude/b6c3202ba5123743/05fc6dc4-8dea-4418-8b3c-6244e4758c7b/scratchpad/tokens';
const P = JSON.parse(fs.readFileSync(T + '/pricing.json', 'utf8'));
const ROOT = 'C:/Users/User/.claude/projects';
const pick = { fixflow: ['e24f17dc-4aea-4914-a9d1-280a723d620e', '9c3f9742-d1e5-4e7b-ad89-bb5bcaada06a', '701c2346-b7e4-4d4c-9b66-800d834d86a3'],
  clinic: ['7f348b2c-75ba-41bd-8132-d395ef24a5f6', '2d443524-e65c-40cb-9f2b-07f620551390', '6c9a1a7a-9848-4531-b2b8-734b1fa172aa', '186f2bac-5a99-486a-bd8c-5972d479cb41', '3b820b0e-1995-489f-9988-d8a5d5062ee3'] };
function price(m, r) {
  const p = P[m]; if (!p) return NaN;
  let c5 = r.cc5m, c1 = r.cc1h; if (c5 + c1 < r.cc) c5 += r.cc - c5 - c1; // unknown split -> 5m
  return (r.in * p.input + c5 * p.cache_write_5m + c1 * p.cache_write_1h + r.cr * p.cache_read + r.out * p.output) / 1e6;
}
async function scan(file) {
  const rl = readline.createInterface({ input: fs.createReadStream(file), crlfDelay: Infinity });
  let n = 0, lastTs = '', cs = [], firstTs = '', lastCallTs = '', compacts = 0, lines = 0;
  for await (const line of rl) {
    n++;
    if (line.startsWith('{"type":"api-request-blob"') || line.startsWith('{"type":"file-history')) continue;
    let o; try { o = JSON.parse(line); } catch { continue; }
    if (o.timestamp) { if (!firstTs) firstTs = o.timestamp; lastTs = o.timestamp; }
    if (o.type === 'assistant' && o.message && o.message.usage) lastCallTs = o.timestamp;
    if (o.type === 'system' && o.subtype === 'compact_boundary') compacts++;
    if (o.type === 'cost-state') cs.push({ line: n, prevTs: lastTs, prevCallTs: lastCallTs, usd: o.totalCostUSD, startTime: o.startTime, own: o.timestamp, mu: o.modelUsage, keys: Object.keys(o) });
  }
  return { totalLines: n, firstTs, lastTs, lastCallTs, cs, compacts };
}
(async () => {
  const out = [];
  for (const g of Object.keys(pick)) {
    const sess = JSON.parse(fs.readFileSync(`${T}/out/${g}.sessions.json`, 'utf8'));
    const rows = fs.readFileSync(`${T}/out/${g}.calls.jsonl`, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
    for (const sid of pick[g]) {
      const s = sess.find(x => x.sid === sid);
      const file = path.join(ROOT, s.store, sid + '.jsonl');
      const sc = await scan(file);
      const last = sc.cs[sc.cs.length - 1];
      // monotonic check
      let mono = true; for (let i = 1; i < sc.cs.length; i++) if (sc.cs[i].usd < sc.cs[i - 1].usd - 1e-9) mono = false;
      const cut = last.prevTs;
      const R = rows.filter(r => r.sid === sid);
      const agg = {}; // role -> model -> sums
      const aggAll = {};
      for (const r of R) {
        for (const [bucket, use] of [['upto', r.ts <= cut], ['all', true]]) {
          if (!use) continue;
          const k = `${bucket}|${r.role}|${r.model}`;
          const a = agg[k] || (agg[k] = { in: 0, cc: 0, cr: 0, out: 0, th: 0, cc5m: 0, cc1h: 0, n: 0, usd: 0 });
          a.in += r.in; a.cc += r.cc; a.cr += r.cr; a.out += r.out; a.th += r.th; a.cc5m += r.cc5m; a.cc1h += r.cc1h; a.n++; a.usd += price(r.model, r);
        }
      }
      // first cost-state values (resume baseline?)
      const first = sc.cs[0];
      out.push({ g, sid, store: s.store, nCostState: sc.cs.length, mono, lastLine: last.line, totalLines: sc.totalLines, lastCsPrevTs: cut, lastCsOwnTs: last.own, startTime: last.startTime, firstCsUsd: first.usd, firstCsLine: first.line, transcriptLastTs: sc.lastTs, transcriptLastCallTs: sc.lastCallTs, compacts: sc.compacts, keys: last.keys, usd: last.usd, modelUsage: last.mu, agg, csSeries: sc.cs.map(c => [c.line, c.prevTs, +c.usd.toFixed(3)]).filter((_, i, a) => i < 3 || i > a.length - 4) });
    }
  }
  fs.writeFileSync(T + '/coststate/recon.json', JSON.stringify(out, null, 1));
  console.log('ok', out.length);
})();
