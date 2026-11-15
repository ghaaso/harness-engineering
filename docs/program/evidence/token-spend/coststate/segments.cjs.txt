// segments.cjs — per cost-state line: startTime, usd, and list$ of rows between consecutive cost-state lines.
const fs = require('fs'), path = require('path'), readline = require('readline');
const T = 'C:/Users/User/AppData/Local/Temp/claude/b6c3202ba5123743/05fc6dc4-8dea-4418-8b3c-6244e4758c7b/scratchpad/tokens';
const P = JSON.parse(fs.readFileSync(T + '/pricing.json', 'utf8'));
const ROOT = 'C:/Users/User/.claude/projects';
const o = JSON.parse(fs.readFileSync(T + '/coststate/recon.json', 'utf8'));
function price(m, r) { const p = P[m]; if (!p) return 0; let c5 = r.cc5m, c1 = r.cc1h; if (c5 + c1 < r.cc) c5 += r.cc - c5 - c1; return (r.in * p.input + c5 * p.cache_write_5m + c1 * p.cache_write_1h + r.cr * p.cache_read + r.out * p.output) / 1e6; }
(async () => {
  const rows = {};
  for (const g of ['fixflow', 'clinic']) rows[g] = fs.readFileSync(`${T}/out/${g}.calls.jsonl`, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
  for (const s of o) {
    const file = path.join(ROOT, s.store, s.sid + '.jsonl');
    const rl = readline.createInterface({ input: fs.createReadStream(file), crlfDelay: Infinity });
    let n = 0, lastTs = '', ev = [], ver = '', prevTs = '';
    for await (const line of rl) {
      n++;
      if (line.startsWith('{"type":"api-request-blob"') || line.startsWith('{"type":"file-history')) continue;
      let x; try { x = JSON.parse(line); } catch { continue; }
      if (x.timestamp) {
        // detect gaps > 30 min (likely process restarts)
        if (prevTs && (new Date(x.timestamp) - new Date(prevTs)) > 30 * 60e3) ev.push({ k: 'gap', line: n, from: prevTs, to: x.timestamp });
        prevTs = x.timestamp; lastTs = x.timestamp;
      }
      if (x.version && x.version !== ver) { ev.push({ k: 'ver', line: n, ts: x.timestamp, v: x.version }); ver = x.version; }
      if (x.type === 'cost-state') ev.push({ k: 'cs', line: n, ts: lastTs, usd: x.totalCostUSD, start: new Date(x.startTime).toISOString(), dur: x.totalDuration });
      if (x.type === 'system' && x.subtype === 'compact_boundary') ev.push({ k: 'compact', line: n, ts: lastTs });
    }
    const R = rows[s.g].filter(r => r.sid === s.sid);
    const list = (a, b) => R.filter(r => r.ts > a && r.ts <= b).reduce((x, r) => x + price(r.model, r), 0);
    console.log(`\n=== ${s.g} ${s.sid.slice(0, 8)}`);
    let prevCsTs = '', prevUsd = 0, gapTs = '';
    for (const e of ev) {
      if (e.k === 'cs') {
        const seg = list(prevCsTs, e.ts);
        console.log(`  cs  L${e.line} ${e.ts} start=${e.start} usd=${e.usd.toFixed(2)} dUsd=${(e.usd - prevUsd).toFixed(2)} list$sinceprevCS=${seg.toFixed(2)} list$sinceStart=${list(e.start, e.ts).toFixed(2)}`);
        prevCsTs = e.ts; prevUsd = e.usd;
      } else if (e.k === 'gap') console.log(`  gap L${e.line} ${e.from} -> ${e.to}`);
      else if (e.k === 'ver') console.log(`  ver L${e.line} ${e.ts} ${e.v}`);
      else console.log(`  ${e.k} L${e.line} ${e.ts}`);
    }
    console.log(`  END list$ after last cs=${list(prevCsTs, '9999').toFixed(2)}`);
  }
})();
