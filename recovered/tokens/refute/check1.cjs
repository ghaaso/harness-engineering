// check1.cjs — pricing application, role attribution, token-type cost split, hist, lookup, shell-other sample
const fs = require('fs'), path = require('path'), readline = require('readline');
const D = path.join(__dirname, '..');
const pricing = JSON.parse(fs.readFileSync(path.join(D, 'pricing.json'), 'utf8'));
const P = (m) => pricing[m];
const TOOLCAT = eval('(' + fs.readFileSync(path.join(D, 'aggregate.cjs'), 'utf8').match(/const TOOLCAT = (\(n, t\) => \{[\s\S]*?\n\};)/)[1].replace(/;$/, '') + ')');
(async () => {
  const R = {};
  for (const g of ['fixflow', 'clinic']) {
    const r = R[g] = { calls: 0, ccNoSplit: 0, ccNoSplitTok: 0, ccNoSplitByModelRole: {}, splitMismatch: 0, splitMismatchTok: 0, thGtOut: 0, unknownModels: {}, costType: { input: 0, cw5: 0, cw1: 0, cr: 0, out: 0 }, costTypeAvgScript: { input: 0, cw: 0, cr: 0, out: 0 }, usd: 0, noSplitByMonth: {}, splitByMonth: {}, ccByRole: {}, cc1hByRole: {}, main: { calls: 0, ctx: 0, usd: 0, crUsd: 0, ccUsd: 0, outUsd: 0, fableCalls: 0 }, over1M: 0, shellOther: [], lookupMixed: 0, lookupWithSed_i: 0, outputThinkOnlyCalls: 0 };
    const rl = readline.createInterface({ input: fs.createReadStream(path.join(D, 'out', `${g}.calls.jsonl`)), crlfDelay: Infinity });
    for await (const line of rl) {
      const c = JSON.parse(line); r.calls++;
      const p = P(c.model);
      if (!p) { r.unknownModels[c.model] = (r.unknownModels[c.model] || 0) + 1; }
      const pp = p || pricing['claude-fable-5-1'];
      const hasSplit = !!(c.cc5m || c.cc1h);
      const mo = (c.ts || '').slice(0, 10);
      if (c.cc > 0 && !hasSplit) { r.ccNoSplit++; r.ccNoSplitTok += c.cc; const k = c.role + ':' + c.model; r.ccNoSplitByModelRole[k] = (r.ccNoSplitByModelRole[k] || 0) + c.cc; r.noSplitByMonth[mo] = (r.noSplitByMonth[mo] || 0) + 1; }
      if (hasSplit) { r.splitByMonth[mo] = (r.splitByMonth[mo] || 0) + 1; if (c.cc5m + c.cc1h !== c.cc) { r.splitMismatch++; r.splitMismatchTok += c.cc - c.cc5m - c.cc1h; } }
      if (c.th > c.out) r.thGtOut++;
      const cc5 = hasSplit ? c.cc5m : c.cc, cc1 = hasSplit ? c.cc1h : 0;
      r.costType.input += c.in * pp.input / 1e6; r.costType.cw5 += cc5 * pp.cache_write_5m / 1e6; r.costType.cw1 += cc1 * pp.cache_write_1h / 1e6; r.costType.cr += c.cr * pp.cache_read / 1e6; r.costType.out += c.out * pp.output / 1e6;
      r.costTypeAvgScript.input += c.in * pp.input / 1e6; r.costTypeAvgScript.cw += c.cc * pp.cache_write_5m / 1e6; r.costTypeAvgScript.cr += c.cr * pp.cache_read / 1e6; r.costTypeAvgScript.out += c.out * pp.output / 1e6;
      const usd = (c.in * pp.input + cc5 * pp.cache_write_5m + cc1 * pp.cache_write_1h + c.cr * pp.cache_read + c.out * pp.output) / 1e6; r.usd += usd;
      r.ccByRole[c.role] = (r.ccByRole[c.role] || 0) + c.cc; r.cc1hByRole[c.role] = (r.cc1hByRole[c.role] || 0) + (c.cc1h || 0);
      const ctx = c.in + c.cc + c.cr; if (ctx > 1e6) r.over1M++;
      if (c.role === 'main') { r.main.calls++; r.main.ctx += ctx; r.main.usd += usd; r.main.crUsd += c.cr * pp.cache_read / 1e6; r.main.ccUsd += (cc5 * pp.cache_write_5m + cc1 * pp.cache_write_1h) / 1e6; r.main.outUsd += c.out * pp.output / 1e6; if (/fable/.test(c.model)) r.main.fableCalls++; }
      let cats = c.tools.map(t => TOOLCAT(t.n, t));
      for (const t of c.tools) { const cat = TOOLCAT(t.n, t); if (cat === 'shell-other') r.shellOther.push({ cmd: t.cmd, rc: t.rc }); }
      if (cats.length && cats.every(x => /read|search/.test(x))) { if (c.tools.some(t => /\bsed\s+-i/.test(t.cmd || ''))) r.lookupWithSed_i++; }
    }
    // sample shell-other: top 30 by rc share + random 30
    const so = r.shellOther; const totRc = so.reduce((a, b) => a + b.rc, 0);
    const first = {}; for (const s of so) { let w = (s.cmd || '').trim().replace(/^cd\s+("[^"]*"|'[^']*'|\S+)\s*(&&|;)\s*/, '').trim(); w = w.split(/\s+/)[0] || ''; first[w] ||= { n: 0, rc: 0 }; first[w].n++; first[w].rc += s.rc; }
    r.shellOtherFirstWord = Object.entries(first).sort((a, b) => b[1].rc - a[1].rc).slice(0, 25).map(([k, v]) => `${k} n=${v.n} rc%=${(100 * v.rc / totRc).toFixed(1)}`);
    let seed = 7; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
    r.shellOtherSample = Array.from({ length: 30 }, () => so[Math.floor(rnd() * so.length)]).map(s => `[${s.rc}] ${(s.cmd || '').slice(0, 130)}`);
    r.shellOtherN = so.length; r.shellOtherRc = totRc;
    delete r.shellOther;
    const ct = r.costType, tot = ct.input + ct.cw5 + ct.cw1 + ct.cr + ct.out;
    r.costTypeShareCorrect = { input: ct.input / tot, cacheWrite: (ct.cw5 + ct.cw1) / tot, cacheRead: ct.cr / tot, output: ct.out / tot, total: tot };
    const ca = r.costTypeAvgScript, ta = ca.input + ca.cw + ca.cr + ca.out;
    r.costTypeShareAvgScript = { cacheWrite: ca.cw / ta, cacheRead: ca.cr / ta, output: ca.out / ta, total: ta };
  }
  fs.writeFileSync(path.join(__dirname, 'check1.json'), JSON.stringify(R, null, 1));
  console.log(JSON.stringify(R, null, 1));
})();
