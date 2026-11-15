// check7.cjs — lookup-only share with shell-other classified from FULL command text (check6 per-id kinds); corrected tool-category shares
const fs = require('fs'), path = require('path'), readline = require('readline');
const D = path.join(__dirname, '..');
const TOOLCAT = eval('(' + fs.readFileSync(path.join(D, 'aggregate.cjs'), 'utf8').match(/const TOOLCAT = (\(n, t\) => \{[\s\S]*?\n\};)/)[1].replace(/;$/, '') + ')');
(async () => {
  const out = {};
  for (const g of ['fixflow', 'clinic']) {
    const perId = JSON.parse(fs.readFileSync(path.join(__dirname, g + '.perid.json'), 'utf8'));
    let calls = 0, ctx = 0, base = 0, baseCtx = 0, full = 0, fullCtx = 0, fullNoSedI = 0, fullNoSedICtx = 0, web = 0, webCtx = 0;
    let rcLookup = 0, rcAll = 0, rcLookupBase = 0;
    const rl = readline.createInterface({ input: fs.createReadStream(path.join(D, 'out', `${g}.calls.jsonl`)), crlfDelay: Infinity });
    for await (const line of rl) {
      const c = JSON.parse(line); calls++; const x = c.in + c.cc + c.cr; ctx += x;
      if (!c.tools.length) continue;
      const kinds = (perId[c.id] || []).slice();
      let soIdx = 0;
      const cls = c.tools.map(t => { const k = TOOLCAT(t.n, t); if (k === 'shell-other') { const kk = kinds[soIdx++] || 'unknown'; return { k, lk: /^lookup/.test(kk), rc: t.rc, cmd: t.cmd }; } return { k, lk: /read|search/.test(k), rc: t.rc, cmd: t.cmd }; });
      for (const t of cls) { rcAll += t.rc; if (t.lk) rcLookup += t.rc; if (/read|search/.test(t.k)) rcLookupBase += t.rc; }
      if (cls.every(t => /read|search/.test(t.k))) { base++; baseCtx += x; }
      if (cls.every(t => t.lk)) { full++; fullCtx += x; if (!cls.some(t => /\bsed\s+-i/.test(t.cmd || ''))) { fullNoSedI++; fullNoSedICtx += x; } }
      if (cls.every(t => t.lk || t.k === 'web')) { web++; webCtx += x; }
    }
    out[g] = { reportedBase: [base / calls, baseCtx / ctx], fullCmdLookup: [full / calls, fullCtx / ctx], fullCmdLookupMinusSedI: [fullNoSedI / calls, fullNoSedICtx / ctx], fullCmdLookupPlusWeb: [web / calls, webCtx / ctx], lookupShareOfToolResultChars: { reportedCats: rcLookupBase / rcAll, withShellOtherFullCmd: rcLookup / rcAll } };
  }
  const m = (k, i) => (out.fixflow[k][i] + out.clinic[k][i]) / 2;
  out.mean = { reportedBase: [m('reportedBase', 0), m('reportedBase', 1)], fullCmdLookupMinusSedI: [m('fullCmdLookupMinusSedI', 0), m('fullCmdLookupMinusSedI', 1)], fullCmdLookupPlusWeb: [m('fullCmdLookupPlusWeb', 0), m('fullCmdLookupPlusWeb', 1)], lookupRc: [(out.fixflow.lookupShareOfToolResultChars.reportedCats + out.clinic.lookupShareOfToolResultChars.reportedCats) / 2, (out.fixflow.lookupShareOfToolResultChars.withShellOtherFullCmd + out.clinic.lookupShareOfToolResultChars.withShellOtherFullCmd) / 2] };
  fs.writeFileSync(path.join(__dirname, 'check7.json'), JSON.stringify(out, null, 1));
  console.log(JSON.stringify(out, null, 1));
})();
