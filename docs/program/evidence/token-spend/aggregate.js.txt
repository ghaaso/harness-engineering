// aggregate.cjs — turn <group>.calls.jsonl + <group>.sessions.json into <group>.agg.json
// Usage: node aggregate.cjs <group> <dir>
const fs = require('fs'), path = require('path'), readline = require('readline');
const [group, dir] = process.argv.slice(2);
const pricing = JSON.parse(fs.readFileSync(path.join(__dirname, 'pricing.json'), 'utf8'));
const sessions = JSON.parse(fs.readFileSync(path.join(dir, `${group}.sessions.json`), 'utf8'));
const sessById = Object.fromEntries(sessions.map(s => [s.sid, s]));
const price = (model, c) => {
  const p = pricing[model] || pricing['claude-fable-5-1'];
  const cc5 = c.cc5m || c.cc1h ? c.cc5m : c.cc, cc1 = c.cc5m || c.cc1h ? c.cc1h : 0;
  return (c.in * p.input + cc5 * p.cache_write_5m + cc1 * p.cache_write_1h + c.cr * p.cache_read + c.out * p.output) / 1e6;
};
const TOOLCAT = (n, t) => {
  if (n === 'Read') return 'file-read';
  if (n === 'Grep' || n === 'Glob') return 'search';
  if (n === 'Bash' || n === 'PowerShell') {
    const c = (t.cmd || '').trim().replace(/^cd\s+[^&;|]*(&&|;)\s*/, '').trim();
    const w = c.split(/\s+/)[0] || '';
    if (/^(cat|head|tail|sed|less|more|nl|bat|Get-Content|gc|type)$/i.test(w) && !/<<|>>?\s*[^&]/.test(c.slice(0, 60))) return 'shell-read';
    if (/^(grep|rg|find|ls|wc|dir|tree|fd|Get-ChildItem|Select-String|stat|du)$/i.test(w)) return 'shell-search';
    if (/^git\s+(diff|show|log|status|blame|grep|ls-files)/.test(c)) return 'shell-git-read';
    if (/^git/.test(c)) return 'shell-git-write';
    if (/^(npm|npx|pytest|node|python|uv|ruff|mypy|alembic|docker|eas|railway|gh|curl)\b/.test(c) && !/<<|>>?\s*[^&]/.test(c)) return 'shell-run';
    if (/<<|>>?\s*[^&]|\bcp\b|\bmv\b|\brm\b|mkdir|tee\b/.test(c)) return 'shell-write';
    return 'shell-other';
  }
  if (n === 'Edit' || n === 'Write' || n === 'NotebookEdit') return 'edit';
  if (n === 'Agent' || n === 'Workflow' || n === 'SendMessage' || n === 'TaskStop') return 'delegation';
  if (n === 'WebSearch' || n === 'WebFetch') return 'web';
  if (/^mcp__Claude_Browser|^mcp__claude-in-chrome/.test(n)) return 'browser';
  if (/^mcp__ccd_/.test(n)) return 'app-mcp';
  if (/^mcp__/.test(n)) return 'other-mcp';
  if (n === 'Skill' || n === 'ToolSearch') return 'skill-toolsearch';
  if (n === 'Artifact' || n === 'AskUserQuestion' || n === 'StructuredOutput') return 'ui';
  return 'other';
};
const inc = (o, k, v = 1) => { o[k] = (o[k] || 0) + v; };
const tokAcc = () => ({ calls: 0, in: 0, cc: 0, cr: 0, out: 0, th: 0, ctx: 0, usd: 0 });
const addTok = (a, c, usd) => { a.calls++; a.in += c.in; a.cc += c.cc; a.cr += c.cr; a.out += c.out; a.th += c.th; a.ctx += c.in + c.cc + c.cr; a.usd += usd; };
const A = { group, total: tokAcc(), byModel: {}, byRole: {}, byRoleModel: {}, byMonth: {}, byDay: {}, bySession: {}, ctxHist: {}, ctxHistUsd: {}, tools: {}, toolCats: {}, out: { thinkCh: 0, textCh: 0, toolInCh: 0, calls: 0, noToolCalls: 0, stopReasons: {} }, cache: { cc5m: 0, cc1h: 0, uncachedShareCalls: 0 }, agentReports: { n: 0, totalTokens: 0 }, lookupOnlyCalls: 0, lookupOnlyCtx: 0, compactAfterCalls: 0, summaryCh: 0, injectedCh: 0, errTools: 0 };
let hiCtx400 = tokAcc(), hiCtx200 = tokAcc();
(async () => {
  const rl = readline.createInterface({ input: fs.createReadStream(path.join(dir, `${group}.calls.jsonl`)), crlfDelay: Infinity });
  for await (const line of rl) {
    const c = JSON.parse(line);
    const usd = price(c.model, c), ctx = c.in + c.cc + c.cr;
    addTok(A.total, c, usd);
    A.byModel[c.model] ||= tokAcc(); addTok(A.byModel[c.model], c, usd);
    A.byRole[c.role] ||= tokAcc(); addTok(A.byRole[c.role], c, usd);
    const rm = c.role === 'main' ? 'main' : `${c.role}:${c.mm || '?'}:${c.at || '?'}`;
    A.byRoleModel[rm] ||= tokAcc(); addTok(A.byRoleModel[rm], c, usd);
    const mo = (c.ts || '').slice(0, 7) || 'unknown', day = (c.ts || '').slice(0, 10) || 'unknown';
    A.byMonth[mo] ||= tokAcc(); addTok(A.byMonth[mo], c, usd);
    A.byDay[day] ||= tokAcc(); addTok(A.byDay[day], c, usd);
    A.bySession[c.sid] ||= { ...tokAcc(), main: tokAcc(), sub: tokAcc(), models: {} }; addTok(A.bySession[c.sid], c, usd);
    addTok(c.role === 'main' ? A.bySession[c.sid].main : A.bySession[c.sid].sub, c, usd); inc(A.bySession[c.sid].models, c.model, usd);
    const b = Math.min(10, Math.floor(ctx / 100000)) * 100 + 'k'; inc(A.ctxHist, b); inc(A.ctxHistUsd, b, usd);
    if (ctx > 400000) addTok(hiCtx400, c, usd); if (ctx > 200000) addTok(hiCtx200, c, usd);
    A.out.thinkCh += c.thinkCh; A.out.textCh += c.textCh; A.out.calls++; if (!c.tools.length) A.out.noToolCalls++; inc(A.out.stopReasons, c.stop || 'none');
    A.cache.cc5m += c.cc5m || 0; A.cache.cc1h += c.cc1h || 0; if (c.cr === 0) A.cache.uncachedShareCalls++;
    if (c.compactAfter) A.compactAfterCalls++; A.summaryCh += c.summaryCh || 0; A.injectedCh += c.injectedCh || 0;
    let lookupOnly = c.tools.length > 0;
    for (const t of c.tools) {
      A.out.toolInCh += t.ic;
      const cat = TOOLCAT(t.n, t);
      if (!/read|search/.test(cat)) lookupOnly = false;
      A.tools[t.n] ||= { n: 0, ic: 0, rc: 0, err: 0 }; A.tools[t.n].n++; A.tools[t.n].ic += t.ic; A.tools[t.n].rc += t.rc; if (t.err) { A.tools[t.n].err++; A.errTools++; }
      A.toolCats[cat] ||= { n: 0, ic: 0, rc: 0, err: 0 }; A.toolCats[cat].n++; A.toolCats[cat].ic += t.ic; A.toolCats[cat].rc += t.rc; if (t.err) A.toolCats[cat].err++;
      if (t.au && t.au.totalTokens) { A.agentReports.n++; A.agentReports.totalTokens += t.au.totalTokens; }
    }
    if (lookupOnly) { A.lookupOnlyCalls++; A.lookupOnlyCtx += ctx; }
  }
  A.hiCtx400 = hiCtx400; A.hiCtx200 = hiCtx200;
  // sessions: titles, harness cost, prefix sizes, compactions, prompts
  let harnessUsd = 0, harnessModelUsage = {}, prefixCh = 0, prefixCalls = 0, compactions = { main: 0, sub: 0 }, prompts = 0, promptCh = 0, apiErrors = 0, apiMs = 0, toolMs = 0, linesAdded = 0, linesRemoved = 0;
  const sessRows = [];
  for (const s of sessions) {
    const agg = A.bySession[s.sid] || { ...tokAcc(), main: tokAcc(), sub: tokAcc(), models: {} };
    if (s.costState) { harnessUsd += s.costState.usd || 0; apiMs += s.costState.apiMs || 0; toolMs += s.costState.toolMs || 0; linesAdded += s.costState.linesAdded || 0; linesRemoved += s.costState.linesRemoved || 0;
      for (const [m, u] of Object.entries(s.costState.modelUsage || {})) { harnessModelUsage[m] ||= { in: 0, out: 0, cr: 0, cc: 0, usd: 0 }; harnessModelUsage[m].in += u.inputTokens || 0; harnessModelUsage[m].out += u.outputTokens || 0; harnessModelUsage[m].cr += u.cacheReadInputTokens || 0; harnessModelUsage[m].cc += u.cacheCreationInputTokens || 0; harnessModelUsage[m].usd += u.costUSD || 0; } }
    if (s.shape) { prefixCh += (s.shape.systemCh + s.shape.toolsCh) * agg.main.calls; prefixCalls += agg.main.calls; }
    compactions.main += s.compactions || 0; for (const sub of s.subagents) compactions.sub += sub.compactions || 0;
    prompts += s.prompts || 0; promptCh += s.promptCh || 0; apiErrors += (s.apiErrors || 0) + s.subagents.reduce((a, b) => a + (b.apiErrors || 0), 0);
    sessRows.push({ sid: s.sid, store: s.store, title: s.title, firstPrompt: (s.firstPrompt || '').slice(0, 160), from: (s.firstTs || '').slice(0, 10), to: (s.lastTs || '').slice(0, 10), bytes: s.bytes, calls: agg.calls, mainCalls: agg.main.calls, subCalls: agg.sub.calls, nSub: s.subagents.length, ctx: agg.ctx, out: agg.out, usd: agg.usd, usdMain: agg.main.usd, usdSub: agg.sub.usd, harnessUsd: s.costState ? s.costState.usd : null, compactions: s.compactions, prompts: s.prompts, avgCtxMain: agg.main.calls ? Math.round(agg.main.ctx / agg.main.calls) : 0, prefixTokEst: s.shape ? Math.round((s.shape.systemCh + s.shape.toolsCh) / 4) : null, nTools: s.shape ? s.shape.nTools : null, models: agg.models, version: s.version });
  }
  sessRows.sort((a, b) => b.usd - a.usd);
  const totUsd = A.total.usd;
  const cum = (n) => sessRows.slice(0, n).reduce((a, b) => a + b.usd, 0) / totUsd;
  A.sessions = sessRows;
  A.summary = {
    sessions: sessions.length, subagentFiles: sessions.reduce((a, s) => a + s.subagents.length, 0), harnessUsd, harnessModelUsage, pricingUsd: totUsd,
    concentration: { top1: cum(1), top3: cum(3), top5: cum(5), top10: cum(10) },
    prefixTokPerMainCallEst: prefixCalls ? Math.round(prefixCh / 4 / prefixCalls) : null, prefixShareOfMainCtxEst: A.byRole.main ? (prefixCh / 4) / A.byRole.main.ctx : null,
    compactions, prompts, promptCh, callsPerPrompt: prompts ? A.total.calls / prompts : null, apiErrors, apiHours: apiMs / 3.6e6, toolHours: toolMs / 3.6e6, linesAdded, linesRemoved,
    activeDays: Object.keys(A.byDay).filter(d => d !== 'unknown').length,
  };
  fs.writeFileSync(path.join(dir, `${group}.agg.json`), JSON.stringify(A, null, 1));
  // short text summary
  const pct = (x, y) => (100 * x / y).toFixed(1) + '%';
  const T = A.total; const L = [];
  L.push(`# ${group}: ${A.summary.sessions} main sessions, ${A.summary.subagentFiles} subagent transcripts, ${T.calls} API calls, ${A.summary.activeDays} active days`);
  L.push(`tokens: ctx ${(T.ctx / 1e9).toFixed(3)}B = input ${pct(T.in, T.ctx)} | cache-write ${pct(T.cc, T.ctx)} | cache-read ${pct(T.cr, T.ctx)}; output ${(T.out / 1e6).toFixed(1)}M (thinking ${pct(T.th, T.out)})`);
  L.push(`cost (list pricing): $${T.usd.toFixed(0)}  | harness cost-state sum: $${harnessUsd.toFixed(0)}`);
  L.push(`cost split by token type: input ${pct(Object.values(A.byModel).reduce((a, m) => a + m.in * (pricing[Object.keys(A.byModel).find(k => A.byModel[k] === m)] || pricing['claude-fable-5-1']).input / 1e6, 0), T.usd)}`);
  const row = (k, v) => `  ${k.padEnd(44)} calls ${String(v.calls).padStart(6)}  ctx ${pct(v.ctx, T.ctx).padStart(6)}  out ${pct(v.out, T.out).padStart(6)}  usd ${pct(v.usd, T.usd).padStart(6)}  avgctx ${Math.round(v.ctx / Math.max(1, v.calls) / 1000)}k`;
  L.push('by model:'); for (const [k, v] of Object.entries(A.byModel).sort((a, b) => b[1].usd - a[1].usd)) L.push(row(k, v));
  L.push('by role:'); for (const [k, v] of Object.entries(A.byRole).sort((a, b) => b[1].usd - a[1].usd)) L.push(row(k, v));
  L.push('by role:model:type:'); for (const [k, v] of Object.entries(A.byRoleModel).sort((a, b) => b[1].usd - a[1].usd)) L.push(row(k, v));
  L.push('by month:'); for (const [k, v] of Object.entries(A.byMonth).sort()) L.push(row(k, v));
  L.push(`ctx>200k: ${pct(hiCtx200.usd, T.usd)} of usd, ${pct(hiCtx200.cr, T.cr)} of cache-read; ctx>400k: ${pct(hiCtx400.usd, T.usd)} of usd, ${pct(hiCtx400.cr, T.cr)} of cache-read`);
  L.push('ctx histogram (calls / usd%): ' + Object.entries(A.ctxHist).sort((a, b) => parseInt(a[0]) - parseInt(b[0])).map(([k, v]) => `${k}:${v}/${pct(A.ctxHistUsd[k], T.usd)}`).join(' '));
  L.push(`lookup-only calls: ${A.lookupOnlyCalls} (${pct(A.lookupOnlyCalls, T.calls)}) re-reading ${pct(A.lookupOnlyCtx, T.ctx)} of ctx`);
  L.push(`output chars: thinking ${(A.out.thinkCh / 1e6).toFixed(1)}M text ${(A.out.textCh / 1e6).toFixed(1)}M tool-input ${(A.out.toolInCh / 1e6).toFixed(1)}M; calls with no tool ${A.out.noToolCalls}`);
  L.push(`cache: 5m-write ${(A.cache.cc5m / 1e6).toFixed(1)}M 1h-write ${(A.cache.cc1h / 1e6).toFixed(1)}M (old-format calls lack split); calls with zero cache-read ${A.cache.uncachedShareCalls}`);
  L.push(`prefix est: ~${A.summary.prefixTokPerMainCallEst} tok per main call (chars/4), ${A.summary.prefixShareOfMainCtxEst == null ? 'n/a' : pct(A.summary.prefixShareOfMainCtxEst, 1)} of main ctx; compactions main ${compactions.main} sub ${compactions.sub}; prompts ${prompts} (${A.summary.callsPerPrompt && A.summary.callsPerPrompt.toFixed(1)} calls/prompt); api errors ${apiErrors}`);
  L.push(`concentration of usd: top1 ${pct(A.summary.concentration.top1, 1)} top3 ${pct(A.summary.concentration.top3, 1)} top5 ${pct(A.summary.concentration.top5, 1)} top10 ${pct(A.summary.concentration.top10, 1)}`);
  L.push('tool categories (count / result Mchars / input Mchars / errors):'); for (const [k, v] of Object.entries(A.toolCats).sort((a, b) => b[1].rc - a[1].rc)) L.push(`  ${k.padEnd(18)} ${String(v.n).padStart(6)}  ${(v.rc / 1e6).toFixed(2).padStart(8)}  ${(v.ic / 1e6).toFixed(2).padStart(8)}  ${v.err}`);
  L.push('top tools by result chars:'); for (const [k, v] of Object.entries(A.tools).sort((a, b) => b[1].rc - a[1].rc).slice(0, 15)) L.push(`  ${k.padEnd(44)} ${String(v.n).padStart(6)}  ${(v.rc / 1e6).toFixed(2).padStart(8)}  ${(v.ic / 1e6).toFixed(2).padStart(8)}  ${v.err}`);
  L.push(`Agent tool reports: ${A.agentReports.n} with totalTokens sum ${(A.agentReports.totalTokens / 1e6).toFixed(1)}M (vs measured subagent ctx+out ${(((A.byRole.agent || tokAcc()).ctx + (A.byRole.agent || tokAcc()).out) / 1e6).toFixed(1)}M)`);
  L.push('top 12 sessions by usd:'); for (const s of sessRows.slice(0, 12)) L.push(`  $${s.usd.toFixed(0).padStart(5)} (${pct(s.usd, T.usd).padStart(5)}) main $${s.usdMain.toFixed(0)} sub $${s.usdSub.toFixed(0)} harness $${s.harnessUsd == null ? '?' : s.harnessUsd.toFixed(0)} calls ${s.calls} subs ${s.nSub} cmp ${s.compactions} ${s.from}..${s.to} [${s.store.slice(0, 30)}] ${s.title || s.firstPrompt.slice(0, 60)}`);
  fs.writeFileSync(path.join(dir, `${group}.summary.txt`), L.join('\n'));
  console.log(L.join('\n'));
})();
