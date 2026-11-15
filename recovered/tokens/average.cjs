// average.cjs — combine fixflow.agg.json and clinic.agg.json into shares per repo, the mean of the two repos' shares, and pooled shares.
// Usage: node average.cjs <dir>  -> writes <dir>/combined.json and prints a table
const fs = require('fs'), path = require('path');
const dir = process.argv[2];
const pricing = JSON.parse(fs.readFileSync(path.join(__dirname, 'pricing.json'), 'utf8'));
const A = { fixflow: JSON.parse(fs.readFileSync(path.join(dir, 'fixflow.agg.json'))), clinic: JSON.parse(fs.readFileSync(path.join(dir, 'clinic.agg.json'))) };
const share = (obj, key) => { const tot = Object.values(obj).reduce((a, v) => a + v[key], 0); return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, tot ? v[key] / tot : 0])); };
const roleOf = (k) => k === 'main' ? 'main session' : k.startsWith('workflow') ? 'workflow agents' : 'Agent-tool agents';
const modelFamily = (m) => /fable/.test(m) ? 'fable' : /opus/.test(m) ? 'opus' : /sonnet/.test(m) ? 'sonnet' : /haiku/.test(m) ? 'haiku' : 'other';
function dims(G) {
  const T = G.total;
  // cost by token type
  const costType = { input: 0, 'cache write': 0, 'cache read': 0, output: 0 };
  for (const [m, v] of Object.entries(G.byModel)) { const p = pricing[m] || pricing['claude-fable-5-1']; costType.input += v.in * p.input / 1e6; costType['cache write'] += v.cc * p.cache_write_5m / 1e6; costType['cache read'] += v.cr * p.cache_read / 1e6; costType.output += v.out * p.output / 1e6; }
  const costTot = Object.values(costType).reduce((a, b) => a + b, 0);
  const fam = {}; for (const [m, v] of Object.entries(G.byModel)) { const f = modelFamily(m); fam[f] ||= { ctx: 0, out: 0, usd: 0, calls: 0 }; fam[f].ctx += v.ctx; fam[f].out += v.out; fam[f].usd += v.usd; fam[f].calls += v.calls; }
  const role = {}; for (const [k, v] of Object.entries(G.byRole)) { const r = roleOf(k); role[r] ||= { ctx: 0, out: 0, usd: 0, calls: 0 }; role[r].ctx += v.ctx; role[r].out += v.out; role[r].usd += v.usd; role[r].calls += v.calls; }
  const toolRc = {}; const rcTot = Object.values(G.toolCats).reduce((a, v) => a + v.rc, 0); for (const [k, v] of Object.entries(G.toolCats)) toolRc[k] = v.rc / rcTot;
  const toolN = {}; const nTot = Object.values(G.toolCats).reduce((a, v) => a + v.n, 0); for (const [k, v] of Object.entries(G.toolCats)) toolN[k] = v.n / nTot;
  const hist = {}; const histUsd = {}; const hc = Object.values(G.ctxHist).reduce((a, b) => a + b, 0); for (const k of Object.keys(G.ctxHist)) { hist[k] = G.ctxHist[k] / hc; histUsd[k] = G.ctxHistUsd[k] / T.usd; }
  const outCh = G.out.textCh + G.out.toolInCh; // thinking chars are redacted in transcripts
  return {
    totals: { calls: T.calls, ctxTokens: T.ctx, outTokens: T.out, thinkingTokens: T.th, usdList: T.usd, usdHarnessLowerBound: G.summary.harnessUsd, sessions: G.summary.sessions, subagentTranscripts: G.summary.subagentFiles, activeDays: G.summary.activeDays, prompts: G.summary.prompts, compactions: G.summary.compactions },
    ctxComposition: { 'uncached input': T.in / T.ctx, 'cache write': T.cc / T.ctx, 'cache read': T.cr / T.ctx },
    costByTokenType: Object.fromEntries(Object.entries(costType).map(([k, v]) => [k, v / costTot])),
    costByModelFamily: share(fam, 'usd'), ctxByModelFamily: share(fam, 'ctx'), outByModelFamily: share(fam, 'out'), callsByModelFamily: share(fam, 'calls'),
    costByRole: share(role, 'usd'), ctxByRole: share(role, 'ctx'), outByRole: share(role, 'out'), callsByRole: share(role, 'calls'),
    avgCtxPerCallByRole: Object.fromEntries(Object.entries(role).map(([k, v]) => [k, v.ctx / v.calls])),
    costByMonth: share(G.byMonth, 'usd'), ctxByMonth: share(G.byMonth, 'ctx'),
    ctxHistCalls: hist, ctxHistUsd: histUsd, costInCallsOver200k: G.hiCtx200.usd / T.usd, costInCallsOver400k: G.hiCtx400.usd / T.usd, cacheReadInCallsOver400k: G.hiCtx400.cr / T.cr,
    toolResultCharsByCategory: toolRc, toolCallsByCategory: toolN, toolResultMchars: rcTot / 1e6, toolCalls: nTot, toolErrorRate: G.errTools / nTot,
    outputComposition: { 'thinking (tokens)': T.th / T.out, 'visible text + tool input (tokens)': 1 - T.th / T.out, 'tool-input share of visible chars': G.out.toolInCh / outCh, 'text share of visible chars': G.out.textCh / outCh },
    lookupOnlyCallsShare: G.lookupOnlyCalls / T.calls, lookupOnlyCtxShare: G.lookupOnlyCtx / T.ctx,
    prefixTokPerMainCall: G.summary.prefixTokPerMainCallEst, prefixShareOfMainCtx: G.summary.prefixShareOfMainCtxEst,
    concentration: G.summary.concentration, callsPerPrompt: G.summary.callsPerPrompt, compactionsPer1kMainCalls: 1000 * G.summary.compactions.main / (G.byRole.main ? G.byRole.main.calls : 1),
    costPerActiveDay: T.usd / G.summary.activeDays, costPerPrompt: T.usd / G.summary.prompts, costPerMainCall: T.usd / (G.byRole.main ? G.byRole.main.calls : 1), ctxPerCall: T.ctx / T.calls, outPerCall: T.out / T.calls,
  };
}
const D = { fixflow: dims(A.fixflow), clinic: dims(A.clinic) };
// mean of shares (each repo weighted equally) and pooled (token/usd-weighted)
const isShareObj = (v) => v && typeof v === 'object' && Object.values(v).every(x => typeof x === 'number');
const mean = {}, pooled = {};
const wUsd = { fixflow: A.fixflow.total.usd, clinic: A.clinic.total.usd }, wTot = wUsd.fixflow + wUsd.clinic;
for (const k of Object.keys(D.fixflow)) {
  const a = D.fixflow[k], b = D.clinic[k];
  if (typeof a === 'number') { mean[k] = (a + b) / 2; pooled[k] = (a * wUsd.fixflow + b * wUsd.clinic) / wTot; }
  else if (isShareObj(a) && k !== 'totals' && k !== 'concentration' && k !== 'avgCtxPerCallByRole') {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]); mean[k] = {}; pooled[k] = {};
    for (const kk of keys) { const x = a[kk] || 0, y = b[kk] || 0; mean[k][kk] = (x + y) / 2; pooled[k][kk] = (x * wUsd.fixflow + y * wUsd.clinic) / wTot; }
  } else if (k === 'totals') { mean[k] = {}; for (const kk of Object.keys(a)) if (typeof a[kk] === 'number') mean[k][kk] = (a[kk] + b[kk]) / 2; pooled[k] = {}; for (const kk of Object.keys(a)) if (typeof a[kk] === 'number') pooled[k][kk] = a[kk] + b[kk]; }
  else if (k === 'concentration' || k === 'avgCtxPerCallByRole') { mean[k] = {}; for (const kk of Object.keys(a)) mean[k][kk] = ((a[kk] || 0) + (b[kk] || 0)) / 2; }
}
// pooled shares computed from raw sums are more honest than usd-weighted means of shares for token-type dims; recompute the key ones
const pool = (dimFn) => { const f = A.fixflow, c = A.clinic; return dimFn(f, c); };
pooled.ctxComposition = pool((f, c) => { const ctx = f.total.ctx + c.total.ctx; return { 'uncached input': (f.total.in + c.total.in) / ctx, 'cache write': (f.total.cc + c.total.cc) / ctx, 'cache read': (f.total.cr + c.total.cr) / ctx }; });
pooled.outputComposition = pool((f, c) => ({ 'thinking (tokens)': (f.total.th + c.total.th) / (f.total.out + c.total.out) }));
const out = { generated: 'see run log', pricing: pricing._source, perRepo: D, meanOfRepos: mean, pooled, topSessions: { fixflow: A.fixflow.sessions.slice(0, 15).map(s => ({ title: s.title || s.firstPrompt.slice(0, 80), usd: s.usd, usdMain: s.usdMain, usdSub: s.usdSub, calls: s.calls, nSub: s.nSub, from: s.from, to: s.to, store: s.store, compactions: s.compactions, harnessUsd: s.harnessUsd })), clinic: A.clinic.sessions.slice(0, 15).map(s => ({ title: s.title || s.firstPrompt.slice(0, 80), usd: s.usd, usdMain: s.usdMain, usdSub: s.usdSub, calls: s.calls, nSub: s.nSub, from: s.from, to: s.to, store: s.store, compactions: s.compactions, harnessUsd: s.harnessUsd })) }, byDay: { fixflow: A.fixflow.byDay, clinic: A.clinic.byDay }, byModel: { fixflow: A.fixflow.byModel, clinic: A.clinic.byModel }, byRoleModel: { fixflow: A.fixflow.byRoleModel, clinic: A.clinic.byRoleModel }, toolCats: { fixflow: A.fixflow.toolCats, clinic: A.clinic.toolCats }, tools: { fixflow: A.fixflow.tools, clinic: A.clinic.tools }, allSessions: { fixflow: A.fixflow.sessions, clinic: A.clinic.sessions } };
fs.writeFileSync(path.join(dir, 'combined.json'), JSON.stringify(out, null, 1));
const pct = (x) => (100 * x).toFixed(1).padStart(6) + '%';
const L = [];
const tbl = (title, key) => { L.push(`\n## ${title}`); const keys = new Set([...Object.keys(D.fixflow[key] || {}), ...Object.keys(D.clinic[key] || {})]); L.push(`${'key'.padEnd(34)} fixflow  clinic   MEAN    pooled`); for (const k of [...keys].sort((a, b) => (mean[key][b] || 0) - (mean[key][a] || 0))) L.push(`${k.padEnd(34)} ${pct(D.fixflow[key][k] || 0)} ${pct(D.clinic[key][k] || 0)} ${pct(mean[key][k] || 0)} ${pct((pooled[key] || {})[k] || 0)}`); };
L.push(`# Token spend distribution — FixFlow vs Clinic, mean of the two repos (equal weight) and pooled`);
L.push(`totals: fixflow calls ${D.fixflow.totals.calls} ctx ${(D.fixflow.totals.ctxTokens / 1e9).toFixed(2)}B out ${(D.fixflow.totals.outTokens / 1e6).toFixed(1)}M $${D.fixflow.totals.usdList.toFixed(0)} | clinic calls ${D.clinic.totals.calls} ctx ${(D.clinic.totals.ctxTokens / 1e9).toFixed(2)}B out ${(D.clinic.totals.outTokens / 1e6).toFixed(1)}M $${D.clinic.totals.usdList.toFixed(0)}`);
for (const [t, k] of [['Context tokens by cache state', 'ctxComposition'], ['Cost (list price) by token type', 'costByTokenType'], ['Cost by model family', 'costByModelFamily'], ['Context tokens by model family', 'ctxByModelFamily'], ['Output tokens by model family', 'outByModelFamily'], ['Calls by model family', 'callsByModelFamily'], ['Cost by role', 'costByRole'], ['Context tokens by role', 'ctxByRole'], ['Output tokens by role', 'outByRole'], ['Calls by role', 'callsByRole'], ['Cost by month', 'costByMonth'], ['Calls by context-size bucket', 'ctxHistCalls'], ['Cost by context-size bucket', 'ctxHistUsd'], ['Tool result chars by category', 'toolResultCharsByCategory'], ['Tool calls by category', 'toolCallsByCategory'], ['Output composition', 'outputComposition']]) tbl(t, k);
L.push('\n## Scalars'); for (const k of ['costInCallsOver200k', 'costInCallsOver400k', 'cacheReadInCallsOver400k', 'lookupOnlyCallsShare', 'lookupOnlyCtxShare', 'prefixShareOfMainCtx', 'toolErrorRate']) L.push(`${k.padEnd(34)} ${pct(D.fixflow[k])} ${pct(D.clinic[k])} ${pct(mean[k])} ${pct(pooled[k])}`);
for (const k of ['prefixTokPerMainCall', 'callsPerPrompt', 'compactionsPer1kMainCalls', 'costPerActiveDay', 'costPerPrompt', 'costPerMainCall', 'ctxPerCall', 'outPerCall']) L.push(`${k.padEnd(34)} ${String(Math.round(D.fixflow[k])).padStart(7)} ${String(Math.round(D.clinic[k])).padStart(7)} ${String(Math.round(mean[k])).padStart(7)}`);
L.push('\n## Avg context per call by role (tokens)'); for (const k of Object.keys(mean.avgCtxPerCallByRole)) L.push(`${k.padEnd(34)} ${String(Math.round(D.fixflow.avgCtxPerCallByRole[k] || 0)).padStart(7)} ${String(Math.round(D.clinic.avgCtxPerCallByRole[k] || 0)).padStart(7)} ${String(Math.round(mean.avgCtxPerCallByRole[k])).padStart(7)}`);
L.push('\n## Concentration of cost in top sessions'); for (const k of Object.keys(mean.concentration)) L.push(`${k.padEnd(34)} ${pct(D.fixflow.concentration[k])} ${pct(D.clinic.concentration[k])} ${pct(mean.concentration[k])}`);
fs.writeFileSync(path.join(dir, 'combined.txt'), L.join('\n'));
console.log(L.join('\n'));
