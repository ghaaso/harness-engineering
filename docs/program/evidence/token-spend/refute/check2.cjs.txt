// check2.cjs — harness cost-state vs parser: segments by startTime, per-model tokens & cost; long-context premium test
const fs = require('fs'), path = require('path'), readline = require('readline');
const D = path.join(__dirname, '..');
const pricing = JSON.parse(fs.readFileSync(path.join(D, 'pricing.json'), 'utf8'));
const STORE = 'C:/Users/User/.claude/projects';
(async () => {
  const out = [];
  for (const g of ['fixflow', 'clinic']) {
    const sessions = JSON.parse(fs.readFileSync(path.join(D, 'out', `${g}.sessions.json`), 'utf8'));
    // parser per session per model (all roles) and main-only, plus time windows
    const per = {};
    const rl = readline.createInterface({ input: fs.createReadStream(path.join(D, 'out', `${g}.calls.jsonl`)), crlfDelay: Infinity });
    for await (const line of rl) {
      const c = JSON.parse(line);
      per[c.sid] ||= [];
      per[c.sid].push({ ts: Date.parse(c.ts), m: c.model, role: c.role, in: c.in, cc: c.cc, cc5m: c.cc5m, cc1h: c.cc1h, cr: c.cr, out: c.out });
    }
    for (const s of sessions) {
      const f = path.join(STORE, s.store, s.sid + '.jsonl');
      // collect cost-state segments: by startTime, keep last (max) per startTime
      const segs = new Map();
      const rl2 = readline.createInterface({ input: fs.createReadStream(f), crlfDelay: Infinity });
      for await (const line of rl2) {
        if (!line.startsWith('{"type":"cost-state"')) continue;
        const o = JSON.parse(line);
        const prev = segs.get(o.startTime);
        if (!prev || o.totalCostUSD >= prev.totalCostUSD) segs.set(o.startTime, o);
      }
      if (!segs.size) { out.push({ g, sid: s.sid.slice(0, 8), title: (s.title || '').slice(0, 40), segs: 0 }); continue; }
      const segList = [...segs.values()];
      const harnessAll = segList.reduce((a, b) => a + b.totalCostUSD, 0);
      // compare the LAST segment's per-model tokens vs parser calls with ts >= startTime
      const last = segList.sort((a, b) => a.startTime - b.startTime)[segList.length - 1];
      const calls = (per[s.sid] || []).filter(c => c.ts >= last.startTime - 1000);
      const pm = {};
      for (const c of calls) { pm[c.m] ||= { in: 0, cc: 0, cc5m: 0, cc1h: 0, cr: 0, out: 0, usd: 0, mainIn: 0 }; const x = pm[c.m]; x.in += c.in; x.cc += c.cc; x.cc5m += c.cc5m; x.cc1h += c.cc1h; x.cr += c.cr; x.out += c.out; const p = pricing[c.m] || pricing['claude-fable-5-1']; x.usd += (c.in * p.input + c.cc5m * p.cache_write_5m + c.cc1h * p.cache_write_1h + c.cr * p.cache_read + c.out * p.output) / 1e6; }
      const cmp = {};
      for (const [m, u] of Object.entries(last.modelUsage || {})) {
        const x = pm[m] || {}; const p = pricing[m];
        const h5 = p ? (u.inputTokens * p.input + u.cacheCreationInputTokens * p.cache_write_5m + u.cacheReadInputTokens * p.cache_read + u.outputTokens * p.output) / 1e6 : null;
        const h1 = p ? (u.inputTokens * p.input + u.cacheCreationInputTokens * p.cache_write_1h + u.cacheReadInputTokens * p.cache_read + u.outputTokens * p.output) / 1e6 : null;
        cmp[m] = { hCost: +u.costUSD.toFixed(3), ourPriceOnHarnessTok5m: h5 && +h5.toFixed(3), ourPriceOnHarnessTok1h: h1 && +h1.toFixed(3), hCR: u.cacheReadInputTokens, pCR: x.cr || 0, hCC: u.cacheCreationInputTokens, pCC: x.cc || 0, pCC1h: x.cc1h || 0, hOut: u.outputTokens, pOut: x.out || 0, hThink: u.thinkingTokens, pUsd: x.usd && +x.usd.toFixed(3) };
      }
      out.push({ g, sid: s.sid.slice(0, 8), title: (s.title || s.firstPrompt || '').slice(0, 40), segs: segs.size, harnessAllSegs: +harnessAll.toFixed(2), parserLastStored: s.costState && +s.costState.usd.toFixed(2), cmp });
    }
  }
  fs.writeFileSync(path.join(__dirname, 'check2.json'), JSON.stringify(out, null, 1));
  // compact print
  let agg = { segSessions: 0, multiSeg: 0, sumAll: { fixflow: 0, clinic: 0 }, sumParserStored: { fixflow: 0, clinic: 0 } };
  const modelFit = {};
  for (const r of out) {
    if (!r.segs) continue; agg.segSessions++; if (r.segs > 1) agg.multiSeg++; agg.sumAll[r.g] += r.harnessAllSegs; agg.sumParserStored[r.g] += r.parserLastStored || 0;
    for (const [m, v] of Object.entries(r.cmp)) { modelFit[m] ||= { h: 0, o5: 0, o1: 0, hCR: 0, pCR: 0, hOut: 0, pOut: 0, hCC: 0, pCC: 0, pUsd: 0 }; const f = modelFit[m]; f.h += v.hCost; f.o5 += v.ourPriceOnHarnessTok5m || 0; f.o1 += v.ourPriceOnHarnessTok1h || 0; f.hCR += v.hCR; f.pCR += v.pCR; f.hOut += v.hOut; f.pOut += v.pOut; f.hCC += v.hCC; f.pCC += v.pCC; f.pUsd += v.pUsd || 0; }
  }
  console.log(JSON.stringify({ agg, modelFit }, null, 1));
  for (const r of out) if (r.segs) console.log(r.g, r.sid, r.segs, r.harnessAllSegs, r.parserLastStored, r.title, Object.entries(r.cmp).map(([m, v]) => `${m.replace('claude-', '')}: h$${v.hCost} our5m$${v.ourPriceOnHarnessTok5m} our1h$${v.ourPriceOnHarnessTok1h} p$${v.pUsd} cr ${v.hCR}/${v.pCR} out ${v.hOut}/${v.pOut}`).join(' | '));
})();
