// check3.cjs — shell-other reclassification, lookup-only sensitivity, prefix estimate vs first-call ctx, pooled-weight errors
const fs = require('fs'), path = require('path'), readline = require('readline');
const D = path.join(__dirname, '..');
const TOOLCAT = eval('(' + fs.readFileSync(path.join(D, 'aggregate.cjs'), 'utf8').match(/const TOOLCAT = (\(n, t\) => \{[\s\S]*?\n\};)/)[1].replace(/;$/, '') + ')');
// segment-aware reclassifier for shell-other: strip assignments/cd/echo/export/set-location, then look at verbs in all segments
const ACT = [
  ['run', /\b(python(3)?(\.exe)?|\$py|\$pp|uv run|uv|node|npm|npx|pytest|ruff|mypy|alembic|docker|railway|gh|curl|bash\s+\S+\.sh|pwsh|sleep|Start-Process|Get-VM)\b|^&\s/],
  ['git-read', /\bgit\s+(-C\s+\S+\s+)?(-c\s+\S+\s+)?(diff|show|log|status|blame|grep|ls-files|rev-parse|branch|cat-file)\b/],
  ['git-write', /\bgit\s+(-C\s+\S+\s+)?(-c\s+\S+\s+)?(add|commit|push|checkout|switch|merge|rebase|stash|worktree|clone|fetch|pull|reset|sparse-checkout)\b/],
  ['write', /(^|[;&|\n]\s*)(cp|mv|rm|mkdir|tee|touch|Set-Content|Out-File|New-Item|Copy-Item|Remove-Item)\b|\bsed\s+-i|\s>{1,2}\s*["']?[\w$\/.~]/],
  ['read', /(^|[;&|\n(]\s*|\bdo\s+|\bthen\s+)(cat|head|tail|sed|awk|nl|Get-Content|gc|type|less|jq)\b/],
  ['search', /(^|[;&|\n(]\s*|\bdo\s+|\bthen\s+)(grep|rg|find|ls|wc|dir|tree|Get-ChildItem|Select-String|stat|du|diff)\b/],
];
const reclass = (cmd) => {
  const c = (cmd || '');
  for (const [k, re] of ACT) if (re.test(c)) return k;
  if (/^\s*(for|while)\b/.test(c)) return 'loop-unknown';
  if (/^\s*echo\b/.test(c)) return 'echo';
  return 'unknown';
};
(async () => {
  const R = {};
  for (const g of ['fixflow', 'clinic']) {
    const r = R[g] = { soN: 0, soRc: 0, reN: {}, reRc: {}, truncated: 0, lookupBase: 0, lookupBaseCtx: 0, lookupPlusShellOtherReads: 0, lookupPlusShellOtherReadsCtx: 0, lookupPlusWeb: 0, lookupPlusWebCtx: 0, lookupMinusSedI: 0, calls: 0, ctx: 0, sample: [], firstMain: {}, catWrite2devnull: 0 };
    const rl = readline.createInterface({ input: fs.createReadStream(path.join(D, 'out', `${g}.calls.jsonl`)), crlfDelay: Infinity });
    let seed = 11; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
    for await (const line of rl) {
      const c = JSON.parse(line); r.calls++; const ctx = c.in + c.cc + c.cr; r.ctx += ctx;
      if (c.role === 'main' && !r.firstMain[c.sid]) r.firstMain[c.sid] = { ts: c.ts, ctx, cc: c.cc, cr: c.cr, in: c.in };
      else if (c.role === 'main' && c.ts < r.firstMain[c.sid].ts) r.firstMain[c.sid] = { ts: c.ts, ctx, cc: c.cc, cr: c.cr, in: c.in };
      const cats = c.tools.map(t => { const k = TOOLCAT(t.n, t); if (k === 'shell-other') { const rc2 = reclass(t.cmd); return { k, rc2 }; } return { k }; });
      for (let i = 0; i < c.tools.length; i++) {
        const t = c.tools[i];
        if (cats[i].k === 'shell-write' && /^\s*(cd\s+[^&;|]*(&&|;)\s*)?(cat|head|tail|sed)\b/.test(t.cmd || '') && /2>\s*\/dev\/null|2>\$null/.test((t.cmd || '').slice(0, 80)) && !/\s>{1,2}\s*["']?[\w$\/.~]/.test((t.cmd || '').replace(/2>\s*\/dev\/null/g, ''))) r.catWrite2devnull++;
        if (cats[i].k !== 'shell-other') continue;
        r.soN++; r.soRc += t.rc; if ((t.cmd || '').length >= 160) r.truncated++;
        const k = cats[i].rc2; r.reN[k] = (r.reN[k] || 0) + 1; r.reRc[k] = (r.reRc[k] || 0) + t.rc;
        if (r.sample.length < 30 && rnd() < 0.012) r.sample.push(`${k} [${t.rc}] ${(t.cmd || '').replace(/\s+/g, ' ').slice(0, 160)}`);
      }
      if (!c.tools.length) continue;
      const isL = (x) => /read|search/.test(x.k);
      const base = cats.every(isL);
      if (base) { r.lookupBase++; r.lookupBaseCtx += ctx; }
      const plusSO = cats.every(x => isL(x) || (x.k === 'shell-other' && /read|search|git-read/.test(x.rc2)));
      if (plusSO) { r.lookupPlusShellOtherReads++; r.lookupPlusShellOtherReadsCtx += ctx; }
      const plusWeb = cats.every(x => isL(x) || x.k === 'web' || (x.k === 'shell-other' && /read|search|git-read/.test(x.rc2)));
      if (plusWeb) { r.lookupPlusWeb++; r.lookupPlusWebCtx += ctx; }
      if (base && !c.tools.some(t => /\bsed\s+-i/.test(t.cmd || ''))) r.lookupMinusSedI++;
    }
    for (const k of Object.keys(r.reRc)) r.reRc[k] = +(100 * r.reRc[k] / r.soRc).toFixed(1) + '%';
    r.lookupShares = { base: [r.lookupBase / r.calls, r.lookupBaseCtx / r.ctx], plusShellOtherReads: [r.lookupPlusShellOtherReads / r.calls, r.lookupPlusShellOtherReadsCtx / r.ctx], plusWebToo: [r.lookupPlusWeb / r.calls, r.lookupPlusWebCtx / r.ctx], minusSedI: r.lookupMinusSedI / r.calls };
    // prefix check: first main call ctx vs prefixTokEst
    const sess = JSON.parse(fs.readFileSync(path.join(D, 'out', `${g}.sessions.json`), 'utf8'));
    r.prefix = sess.filter(s => s.shape && r.firstMain[s.sid]).map(s => ({ sid: s.sid.slice(0, 8), estTok: Math.round((s.shape.systemCh + s.shape.toolsCh) / 4), sysCh: s.shape.systemCh, toolsCh: s.shape.toolsCh, nTools: s.shape.nTools, nShapes: s.nShapes, first: r.firstMain[s.sid], firstPromptCh: (s.firstPrompt || '').length }));
    r.noShape = sess.filter(s => !s.shape).length;
    delete r.firstMain;
  }
  // pooled with the right weights
  const A = { fixflow: JSON.parse(fs.readFileSync(path.join(D, 'out', 'fixflow.agg.json'))), clinic: JSON.parse(fs.readFileSync(path.join(D, 'out', 'clinic.agg.json'))) };
  const f = A.fixflow, c = A.clinic;
  const pooledCalls = {}; for (const k of ['main', 'workflow', 'agent']) pooledCalls[k] = ((f.byRole[k] || {}).calls + (c.byRole[k] || {}).calls) / (f.total.calls + c.total.calls);
  const pooledCtx = {}; for (const k of ['main', 'workflow', 'agent']) pooledCtx[k] = ((f.byRole[k] || {}).ctx + (c.byRole[k] || {}).ctx) / (f.total.ctx + c.total.ctx);
  const pooledUsd = {}; for (const k of ['main', 'workflow', 'agent']) pooledUsd[k] = ((f.byRole[k] || {}).usd + (c.byRole[k] || {}).usd) / (f.total.usd + c.total.usd);
  const rcT = (G) => Object.values(G.toolCats).reduce((a, v) => a + v.rc, 0);
  const pooledRc = {}; for (const k of new Set([...Object.keys(f.toolCats), ...Object.keys(c.toolCats)])) pooledRc[k] = (((f.toolCats[k] || {}).rc || 0) + ((c.toolCats[k] || {}).rc || 0)) / (rcT(f) + rcT(c));
  const histT = (G) => Object.values(G.ctxHist).reduce((a, b) => a + b, 0);
  const pooledHist = {}; for (const k of Object.keys(c.ctxHist)) pooledHist[k] = ((f.ctxHist[k] || 0) + (c.ctxHist[k] || 0)) / (histT(f) + histT(c));
  const lookupPooled = (f.lookupOnlyCalls + c.lookupOnlyCalls) / (f.total.calls + c.total.calls);
  R.pooledCorrect = { callsByRole: pooledCalls, ctxByRole: pooledCtx, usdByRole: pooledUsd, toolRc: pooledRc, histCalls: pooledHist, lookupOnlyCallsShare: lookupPooled, lookupCtxPooled: (f.lookupOnlyCtx + c.lookupOnlyCtx) / (f.total.ctx + c.total.ctx), prefixShareMainPooled: null };
  fs.writeFileSync(path.join(__dirname, 'check3.json'), JSON.stringify(R, null, 1));
  console.log(JSON.stringify(R, null, 1));
})();
