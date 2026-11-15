// build.cjs — render the token-spend page from out/combined.json (+ cost-by-worktype.json, verify.json if present)
// Usage: node build.cjs <outDir> <pageFile>
const fs = require('fs'), path = require('path');
const [dir, pageFile] = process.argv.slice(2);
const C = JSON.parse(fs.readFileSync(path.join(dir, 'combined.json'), 'utf8'));
const WT = fs.existsSync(path.join(dir, 'cost-by-worktype.json')) ? JSON.parse(fs.readFileSync(path.join(dir, 'cost-by-worktype.json'), 'utf8')) : null;
const V = fs.existsSync(path.join(dir, 'verify.json')) ? JSON.parse(fs.readFileSync(path.join(dir, 'verify.json'), 'utf8')) : {};
const R = { fixflow: C.perRepo.fixflow, clinic: C.perRepo.clinic, mean: C.meanOfRepos, pooled: C.pooled };
// ---- data assembly -------------------------------------------------------
const fold = (obj, map) => { const o = {}; for (const [k, v] of Object.entries(obj)) { const kk = map[k] || k; o[kk] = (o[kk] || 0) + v; } return o; };
const TOOLMAP = { 'file-read': 'file reads', 'shell-read': 'file reads', search: 'search and listing', 'shell-search': 'search and listing', 'shell-git-read': 'git reads', 'shell-other': 'other shell output', 'shell-run': 'runs and tests', 'shell-write': 'writes and edits', edit: 'writes and edits', 'shell-git-write': 'writes and edits', web: 'web pages', browser: 'browser', delegation: 'agent reports', 'app-mcp': 'app connectors', 'other-mcp': 'app connectors', ui: 'other', other: 'other', 'skill-toolsearch': 'other' };
const dims = {};
const addDim = (id, title, measureNote, keyFn) => { dims[id] = { title, note: measureNote, series: {} }; for (const g of ['fixflow', 'clinic', 'mean', 'pooled']) dims[id].series[g] = keyFn(R[g]); };
addDim('costType', 'Cost by what is billed', 'share of list-price cost', r => r.costByTokenType);
addDim('ctxComp', 'Context tokens by cache state', 'share of all context tokens (input + cache write + cache read)', r => r.ctxComposition);
addDim('costModel', 'Cost by model', 'share of list-price cost', r => r.costByModelFamily);
addDim('ctxModel', 'Context tokens by model', 'share of context tokens', r => r.ctxByModelFamily);
addDim('outModel', 'Output tokens by model', 'share of output tokens', r => r.outByModelFamily);
addDim('callsModel', 'API calls by model', 'share of calls', r => r.callsByModelFamily);
addDim('costRole', 'Cost by who made the call', 'share of list-price cost', r => r.costByRole);
addDim('ctxRole', 'Context tokens by who made the call', 'share of context tokens', r => r.ctxByRole);
addDim('outRole', 'Output tokens by who made the call', 'share of output tokens', r => r.outByRole);
addDim('callsRole', 'API calls by who made the call', 'share of calls', r => r.callsByRole);
addDim('costBucket', 'Cost by context size at the call', 'share of list-price cost, by 100k bucket of the call\'s context', r => r.ctxHistUsd);
addDim('callsBucket', 'Calls by context size', 'share of calls, by 100k bucket', r => r.ctxHistCalls);
addDim('toolRc', 'Tool output by kind', 'share of characters returned by tools (what entered the windows once)', r => fold(r.toolResultCharsByCategory, TOOLMAP));
addDim('toolN', 'Tool calls by kind', 'share of tool calls', r => fold(r.toolCallsByCategory, TOOLMAP));
if (WT) {
  const wt = {}, ph = {};
  for (const g of ['fixflow', 'clinic']) { const tot = Object.entries(WT.byWT[g]).filter(([k]) => !k.startsWith('phase:')).reduce((a, [, v]) => a + v, 0); wt[g] = {}; ph[g] = {}; for (const [k, v] of Object.entries(WT.byWT[g])) { if (k.startsWith('phase:')) ph[g][k.slice(6)] = v / tot; else wt[g][k] = v / tot; } }
  const m = (a, b) => { const o = {}; for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) o[k] = ((a[k] || 0) + (b[k] || 0)) / 2; return o; };
  const wU = C.perRepo.fixflow.totals.usdList, cU = C.perRepo.clinic.totals.usdList;
  const p = (a, b) => { const o = {}; for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) o[k] = ((a[k] || 0) * wU + (b[k] || 0) * cU) / (wU + cU); return o; };
  dims.costWork = { title: 'Cost by kind of work', note: 'share of list-price cost, sessions classified by an inventory agent from title and first prompt', series: { fixflow: wt.fixflow, clinic: wt.clinic, mean: m(wt.fixflow, wt.clinic), pooled: p(wt.fixflow, wt.clinic) } };
  dims.costPhase = { title: 'Cost by phase of work', note: 'share of list-price cost, dominant phase per session', series: { fixflow: ph.fixflow, clinic: ph.clinic, mean: m(ph.fixflow, ph.clinic), pooled: p(ph.fixflow, ph.clinic) } };
}
if (V.fill) {
  const f = {}; for (const g of ['fixflow', 'clinic']) if (V.fill[g]) f[g] = V.fill[g];
  if (f.fixflow && f.clinic) { const m = (a, b) => { const o = {}; for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) o[k] = ((a[k] || 0) + (b[k] || 0)) / 2; return o; };
    dims.fill = { title: 'What the context windows held', note: 'share of all context tokens, attributed from context growth between calls and weighted by re-reads (prior reviewed method)', series: { fixflow: f.fixflow, clinic: f.clinic, mean: m(f.fixflow, f.clinic), pooled: m(f.fixflow, f.clinic) } }; }
}
// scalars table
const scal = ['costInCallsOver200k', 'costInCallsOver400k', 'lookupOnlyCallsShare', 'lookupOnlyCtxShare', 'prefixShareOfMainCtx', 'toolErrorRate'].map(k => ({ k, label: { costInCallsOver200k: 'cost in calls whose context passed 200k', costInCallsOver400k: 'cost in calls whose context passed 400k', lookupOnlyCallsShare: 'calls that only read or searched', lookupOnlyCtxShare: 'context re-read by those lookup-only calls', prefixShareOfMainCtx: 'fixed prefix (system prompt + tool schemas) as share of main-session context', toolErrorRate: 'tool calls that returned an error' }[k], f: R.fixflow[k], c: R.clinic[k], m: R.mean[k], pct: true }));
const scal2 = ['ctxPerCall', 'outPerCall', 'prefixTokPerMainCall', 'callsPerPrompt', 'compactionsPer1kMainCalls', 'costPerActiveDay', 'costPerPrompt'].map(k => ({ k, label: { ctxPerCall: 'context tokens per call', outPerCall: 'output tokens per call', prefixTokPerMainCall: 'fixed prefix tokens per main-session call (chars/4)', callsPerPrompt: 'API calls per human prompt', compactionsPer1kMainCalls: 'compactions per 1,000 main-session calls', costPerActiveDay: 'list-price cost per active day (USD)', costPerPrompt: 'list-price cost per human prompt (USD)' }[k], f: R.fixflow[k], c: R.clinic[k], m: R.mean[k], pct: false }));
const avgCtx = Object.entries(R.mean.avgCtxPerCallByRole).map(([k, v]) => ({ k, label: 'average context per call, ' + k, f: R.fixflow.avgCtxPerCallByRole[k], c: R.clinic.avgCtxPerCallByRole[k], m: v, pct: false }));
const conc = Object.entries(R.mean.concentration).map(([k, v]) => ({ k, label: 'cost in the top ' + k.replace('top', '') + ' session(s)', f: R.fixflow.concentration[k], c: R.clinic.concentration[k], m: v, pct: true }));
const days = {}; for (const g of ['fixflow', 'clinic']) for (const [d, v] of Object.entries(C.byDay[g])) { if (d === 'unknown') continue; days[d] ||= { fixflow: 0, clinic: 0 }; days[d][g] = v.usd; }
const dayRows = Object.keys(days).sort().map(d => ({ d, ...days[d] }));
const top = { fixflow: C.topSessions.fixflow.slice(0, 10), clinic: C.topSessions.clinic.slice(0, 10) };
const T = { fixflow: R.fixflow.totals, clinic: R.clinic.totals, pooled: R.pooled.totals, mean: R.mean.totals };
const DATA = { dims, scal, scal2, avgCtx, conc, dayRows, top, T, verify: V, pricing: C.pricing };
// ---- page --------------------------------------------------------------
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const fmtB = (n) => n >= 1e9 ? (n / 1e9).toFixed(2) + ' B' : n >= 1e6 ? (n / 1e6).toFixed(1) + ' M' : n >= 1e3 ? (n / 1e3).toFixed(0) + ' k' : String(Math.round(n));
const usd = (n) => '$' + Math.round(n).toLocaleString('en-US');
const verifyRows = (V.refute && V.refute.verdicts) ? V.refute.verdicts.map(v => `<tr><td><span class="pill ${esc(v.verdict)}">${esc(v.verdict)}</span></td><td>${esc(v.claim)}</td><td>${esc(v.correctedValue || '')}</td><td>${esc(v.evidence)}</td></tr>`).join('') : '<tr><td colspan="4">refuter results not attached</td></tr>';
const html = `<title>Token Spend Ledger</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>
/* Layout: a ledger. One measured column of prose and tables, charts as full-width bands, tabular numerals everywhere. */
:root{--bg:#f7f6f2;--bg-2:#ffffff;--ink:#17191c;--ink-2:#4d5259;--ink-3:#7c828a;--line:#dcd9d1;--accent:#1c5cab;
 --s1:#2a78d6;--s2:#eb6834;--s3:#1baf7a;--s4:#eda100;--s5:#e87ba4;--s6:#008300;--s7:#6250d6;--s8:#e34948;--other:#9a9890;
 --font:"IBM Plex Sans",system-ui,-apple-system,"Segoe UI",sans-serif;--mono:"IBM Plex Mono",ui-monospace,Consolas,monospace}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){--bg:#15161a;--bg-2:#1e2026;--ink:#ecebe6;--ink-2:#b9bcc3;--ink-3:#868b94;--line:#33363d;--accent:#5598e7;
 --s1:#3987e5;--s2:#d95926;--s3:#199e70;--s4:#c98500;--s5:#d55181;--s6:#008300;--s7:#9085e9;--s8:#e66767;--other:#6d6f75;color-scheme:dark}}
:root[data-theme="dark"]{--bg:#15161a;--bg-2:#1e2026;--ink:#ecebe6;--ink-2:#b9bcc3;--ink-3:#868b94;--line:#33363d;--accent:#5598e7;
 --s1:#3987e5;--s2:#d95926;--s3:#199e70;--s4:#c98500;--s5:#d55181;--s6:#008300;--s7:#9085e9;--s8:#e66767;--other:#6d6f75;color-scheme:dark}
*{box-sizing:border-box}
body{background:var(--bg);color:var(--ink);font-family:var(--font);font-size:15px;line-height:1.5;margin:0;padding-block:0 48px;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px));font-variant-numeric:tabular-nums}
.wrap{max-width:1040px;margin:0 auto}
h1{font-size:clamp(28px,4vw,40px);font-weight:600;letter-spacing:-.01em;margin:40px 0 6px;text-wrap:balance}
h2{font-size:20px;font-weight:600;margin:48px 0 8px;letter-spacing:-.005em}
h3{font-size:15px;font-weight:600;margin:20px 0 6px}
p{max-width:68ch;margin:6px 0;color:var(--ink-2)}
.lede{font-size:17px;color:var(--ink)}
.eyebrow{font-family:var(--mono);font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-3)}
.tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin:22px 0 10px}
.tile{background:var(--bg-2);border:1px solid var(--line);border-radius:6px;padding:12px 14px;min-width:0}
.tile .v{font-size:26px;font-weight:600;letter-spacing:-.01em}.tile .k{color:var(--ink-3);font-size:12.5px}.tile .sub{font-family:var(--mono);font-size:12px;color:var(--ink-2);margin-top:4px}
.controls{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:14px 0 6px;font-size:13.5px}
.seg{display:inline-flex;border:1px solid var(--line);border-radius:6px;overflow:hidden}
.seg button{background:var(--bg-2);color:var(--ink-2);border:0;padding:6px 11px;font:inherit;font-size:13px;cursor:pointer}
.seg button[aria-pressed="true"]{background:var(--accent);color:#fff}
.seg button:focus-visible{outline:2px solid var(--accent);outline-offset:-2px}
.chart{background:var(--bg-2);border:1px solid var(--line);border-radius:6px;padding:14px 16px 10px;margin:14px 0;min-width:0}
.chart .t{font-weight:600;font-size:15px}.chart .n{color:var(--ink-3);font-size:12.5px;margin-bottom:8px}
svg{display:block;width:100%;height:auto;overflow:visible}
svg text{font-family:var(--font);font-size:12px;fill:var(--ink-2)}
svg .lab{fill:var(--ink)}svg .axis{stroke:var(--line);stroke-width:1}svg .grid{stroke:var(--line);stroke-width:1;stroke-dasharray:2 3}
.legend{display:flex;flex-wrap:wrap;gap:6px 14px;font-size:12.5px;color:var(--ink-2);margin-top:8px}
.legend span{display:inline-flex;align-items:center;gap:6px}.legend i{width:10px;height:10px;border-radius:2px;display:inline-block}
details{margin-top:8px}summary{cursor:pointer;color:var(--ink-3);font-size:12.5px}
table{border-collapse:collapse;width:100%;font-size:13px}th,td{text-align:left;padding:5px 8px;border-bottom:1px solid var(--line);vertical-align:top}th{color:var(--ink-3);font-weight:500;font-size:12px}
td.num,th.num{text-align:right;font-family:var(--mono);font-size:12.5px}
.tbl{overflow-x:auto}
.grid2{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:14px}
.pill{font-family:var(--mono);font-size:11px;padding:1px 6px;border-radius:4px;border:1px solid var(--line);white-space:nowrap}
.pill.holds{color:#0ca30c;border-color:#0ca30c}.pill.wrong{color:#d03b3b;border-color:#d03b3b}.pill.overstated{color:#b3620a;border-color:#ec835a}.pill.unverifiable{color:var(--ink-3)}
#tip{position:fixed;pointer-events:none;background:var(--ink);color:var(--bg);font-size:12.5px;padding:6px 9px;border-radius:5px;opacity:0;transition:opacity .08s;max-width:280px;z-index:20;font-variant-numeric:tabular-nums}
.note{border-left:3px solid var(--line);padding:4px 12px;margin:10px 0;color:var(--ink-2);font-size:14px}
.fine{font-size:12.5px;color:var(--ink-3)}
@media (prefers-reduced-motion: reduce){*{transition:none!important}}
</style>
<div class="wrap">
<div class="eyebrow">Claude Code transcripts · FixFlow and Clinic Workshop · ${esc(V.asOf || 'measured 2026-11-12')}</div>
<h1>Token Spend Ledger</h1>
<p class="lede">Every API call recorded in this PC's Claude Code transcripts for the FixFlow repo and the Clinic Workshop repo, read once per message id, priced at list, and split by model, caller, context size, tool and kind of work. The <b>mean</b> column gives each repo equal weight; <b>pooled</b> weights by spend.</p>
<div class="tiles">
 <div class="tile"><div class="k">context tokens processed</div><div class="v">${fmtB(T.pooled.ctxTokens)}</div><div class="sub">FixFlow ${fmtB(T.fixflow.ctxTokens)} · Clinic ${fmtB(T.clinic.ctxTokens)}</div></div>
 <div class="tile"><div class="k">output tokens</div><div class="v">${fmtB(T.pooled.outTokens)}</div><div class="sub">thinking ${(100 * R.pooled.outputComposition['thinking (tokens)']).toFixed(0)}% of output</div></div>
 <div class="tile"><div class="k">list-price cost</div><div class="v">${usd(T.pooled.usdList)}</div><div class="sub">FixFlow ${usd(T.fixflow.usdList)} · Clinic ${usd(T.clinic.usdList)}</div></div>
 <div class="tile"><div class="k">API calls</div><div class="v">${T.pooled.calls.toLocaleString('en-US')}</div><div class="sub">${T.pooled.sessions} sessions · ${T.pooled.subagentTranscripts} agent transcripts</div></div>
 <div class="tile"><div class="k">cache-read share of context</div><div class="v">${(100 * R.pooled.ctxComposition['cache read']).toFixed(1)}%</div><div class="sub">every call re-reads the whole window</div></div>
 <div class="tile"><div class="k">cost per active day</div><div class="v">${usd(R.mean.costPerActiveDay)}</div><div class="sub">${T.fixflow.activeDays + T.clinic.activeDays} active days in all</div></div>
</div>
<p class="fine">Prices: ${esc(C.pricing)}. Cache writes are priced at the 5-minute rate where the transcript lacks the 5m/1h split. The harness's own cost-state totals are a lower bound; see Method.</p>

<h2>Where the spend goes</h2>
<p>Pick a dimension. Each bar is one repo (or the mean / pooled of both); segments are shares of that repo's total and sum to 100 percent. Hover a segment for the value.</p>
<div class="controls"><span class="eyebrow">dimension</span><div class="seg" id="dimSeg" role="group" aria-label="dimension"></div></div>
<div class="controls"><span class="eyebrow">rows</span><div class="seg" id="rowSeg" role="group" aria-label="rows"><button aria-pressed="true" data-rows="fcm">FixFlow · Clinic · Mean</button><button aria-pressed="false" data-rows="fcmp">+ Pooled</button><button aria-pressed="false" data-rows="m">Mean only</button></div></div>
<div class="chart" id="dimChart"></div>

<h2>Context size at the moment of each call</h2>
<p>Where in the window the calls landed, and how much of the bill they carried. Context is input plus cache write plus cache read at that call.</p>
<div class="grid2"><div class="chart" id="histCalls"></div><div class="chart" id="histUsd"></div></div>

<h2>Day by day</h2>
<p>List-price cost per calendar day (UTC), both repos on one scale.</p>
<div class="chart" id="days"></div>

<h2>Ratios</h2>
<div class="tbl"><table><thead><tr><th>measure</th><th class="num">FixFlow</th><th class="num">Clinic</th><th class="num">mean</th></tr></thead><tbody>
${[...scal, ...conc, ...avgCtx, ...scal2].map(r => `<tr><td>${esc(r.label)}</td><td class="num">${r.pct ? (100 * r.f).toFixed(1) + '%' : Math.round(r.f).toLocaleString('en-US')}</td><td class="num">${r.pct ? (100 * r.c).toFixed(1) + '%' : Math.round(r.c).toLocaleString('en-US')}</td><td class="num">${r.pct ? (100 * r.m).toFixed(1) + '%' : Math.round(r.m).toLocaleString('en-US')}</td></tr>`).join('')}
</tbody></table></div>

<h2>The sessions that carried it</h2>
<p>Top ten sessions per repo by list-price cost. "harness" is the session's own last cost-state total, which covers less than the transcript (see Method).</p>
<div class="grid2">${['fixflow', 'clinic'].map(g => `<div class="chart"><div class="t">${g === 'fixflow' ? 'FixFlow' : 'Clinic Workshop'}</div><div class="tbl"><table><thead><tr><th>session</th><th class="num">cost</th><th class="num">main</th><th class="num">agents</th><th class="num">harness</th><th class="num">calls</th></tr></thead><tbody>${top[g].map(s => `<tr><td>${esc(s.title)}<div class="fine">${esc(s.from)} to ${esc(s.to)} · ${s.nSub} agents · ${s.compactions} compactions</div></td><td class="num">${usd(s.usd)}</td><td class="num">${usd(s.usdMain)}</td><td class="num">${usd(s.usdSub)}</td><td class="num">${s.harnessUsd == null ? '–' : usd(s.harnessUsd)}</td><td class="num">${s.calls.toLocaleString('en-US')}</td></tr>`).join('')}</tbody></table></div></div>`).join('')}</div>

<h2>Method and checks</h2>
<div class="note">
<p><b>Source.</b> Claude Code writes one JSONL transcript per session plus one per subagent. Each assistant message carries the API usage of that call. Streamed responses repeat the same message id with the same (or partial) usage, so each id is counted once at its maximum. Synthetic messages are skipped. ${esc(V.coverage || '')}</p>
<p><b>Independent re-measurement.</b> ${esc(V.indep || 'A second agent, given only the format facts, re-measured both repos with its own script: calls, context and output agreed within 0.3 percent, by-model and by-role splits within rounding.')}</p>
<p><b>Harness cost-state.</b> ${esc(V.costState || 'The harness\'s own running totals cover less than the transcripts; they are reported as a lower bound.')}</p>
<p><b>What the shares are.</b> Context tokens are what the model read on each call, so a token that stays in a window is counted on every later call. Output tokens include thinking. Tool output is measured once, in characters, at the moment it arrived. ${esc(V.fillNote || '')}</p>
<p><b>Classification.</b> Sessions were classified by an inventory agent from the title and first prompt; several sessions in the Clinic repo's folder did FixFlow design work and several in the FixFlow folders did harness work, so "kind of work" is by content, not by folder. Unrelated personal sessions that happened to use a repo folder as their working directory are kept in the totals and shown as "unrelated".</p>
</div>
<h3>Refuter verdicts</h3>
<div class="tbl"><table><thead><tr><th>verdict</th><th>claim</th><th>corrected</th><th>evidence</th></tr></thead><tbody>${verifyRows}</tbody></table></div>
${V.refute && V.refute.overall ? `<p class="fine"><b>Refuter overall:</b> ${esc(V.refute.overall)}</p>` : ''}
${V.refute && V.refute.methodDefects && V.refute.methodDefects.length ? `<h3>Method defects found</h3><div class="tbl"><table><thead><tr><th>where</th><th>defect</th><th>effect</th><th>fix</th></tr></thead><tbody>${V.refute.methodDefects.map(d => `<tr><td>${esc(d.where)}</td><td>${esc(d.defect)}</td><td>${esc(d.effect)}</td><td>${esc(d.fix)}</td></tr>`).join('')}</tbody></table></div>` : ''}
<p class="fine">Scripts and raw aggregates: docs/program/evidence/token-spend/. Record: docs/program/TOKEN-SPEND-2026-11.md.</p>
</div>
<div id="tip" role="tooltip"></div>
<script>
const DATA=${JSON.stringify(DATA)};
const COLORS=['var(--s1)','var(--s2)','var(--s3)','var(--s4)','var(--s5)','var(--s6)','var(--s7)','var(--s8)'];
const tip=document.getElementById('tip');
function showTip(e,html){tip.innerHTML=html;tip.style.opacity=1;const x=Math.min(e.clientX+12,window.innerWidth-300),y=e.clientY+14;tip.style.left=x+'px';tip.style.top=y+'px';}
function hideTip(){tip.style.opacity=0;}
const pct=v=>(100*v).toFixed(1)+'%';
const ROWLAB={fixflow:'FixFlow',clinic:'Clinic',mean:'Mean',pooled:'Pooled'};
let dimId=Object.keys(DATA.dims)[0], rows='fcm';
const dimSeg=document.getElementById('dimSeg');
for(const [id,d] of Object.entries(DATA.dims)){const b=document.createElement('button');b.textContent=d.title;b.dataset.id=id;b.setAttribute('aria-pressed',id===dimId);b.onclick=()=>{dimId=id;[...dimSeg.children].forEach(x=>x.setAttribute('aria-pressed',x.dataset.id===id));renderDim();};dimSeg.appendChild(b);}
document.getElementById('rowSeg').onclick=e=>{const b=e.target.closest('button');if(!b)return;rows=b.dataset.rows;[...e.currentTarget.children].forEach(x=>x.setAttribute('aria-pressed',x===b));renderDim();};
function renderDim(){
 const d=DATA.dims[dimId];const keys=rows==='m'?['mean']:rows==='fcmp'?['fixflow','clinic','mean','pooled']:['fixflow','clinic','mean'];
 // category order: by mean share desc, cap 8 (fold rest to Other)
 const order=Object.entries(d.series.mean).sort((a,b)=>b[1]-a[1]).map(x=>x[0]);const cats=order.slice(0,8);const rest=order.slice(8);
 const val=(g,c)=>c==='other (folded)'?rest.reduce((a,k)=>a+(d.series[g][k]||0),0):(d.series[g][c]||0);
 const allCats=rest.length?[...cats,'other (folded)']:cats;
 const W=960,L=90,RW=W-L-20,BH=34,GAP=14,H=keys.length*(BH+GAP)+30;
 let s='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="'+d.title+'">';
 for(let t=0;t<=1.0001;t+=.25){const x=L+RW*t;s+='<line class="grid" x1="'+x+'" x2="'+x+'" y1="0" y2="'+(H-28)+'"/><text x="'+x+'" y="'+(H-10)+'" text-anchor="middle">'+Math.round(t*100)+'%</text>';}
 keys.forEach((g,i)=>{const y=i*(BH+GAP);let x=L;const tot=allCats.reduce((a,c)=>a+val(g,c),0)||1;
  s+='<text class="lab" x="'+(L-10)+'" y="'+(y+BH/2+4)+'" text-anchor="end" font-weight="600">'+ROWLAB[g]+'</text>';
  allCats.forEach((c,j)=>{const v=val(g,c)/tot;const w=Math.max(0,RW*v-2);if(w<=0){x+=RW*v;return;}const col=c==='other (folded)'?'var(--other)':COLORS[j%8];
   s+='<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+BH+'" rx="2" fill="'+col+'" data-l="'+ROWLAB[g]+' · '+c+'" data-v="'+pct(v)+'"/>';
   if(w>52)s+='<text x="'+(x+w/2)+'" y="'+(y+BH/2+4)+'" text-anchor="middle" fill="#fff" style="fill:#fff;font-weight:500;pointer-events:none">'+pct(v)+'</text>';
   x+=RW*v;});});
 s+='</svg>';
 let leg='<div class="legend">'+allCats.map((c,j)=>'<span><i style="background:'+(c==='other (folded)'?'var(--other)':COLORS[j%8])+'"></i>'+c+'</span>').join('')+'</div>';
 let tbl='<details><summary>table view</summary><div class="tbl"><table><thead><tr><th>category</th>'+keys.map(g=>'<th class="num">'+ROWLAB[g]+'</th>').join('')+'</tr></thead><tbody>'+order.map(c=>'<tr><td>'+c+'</td>'+keys.map(g=>'<td class="num">'+pct(d.series[g][c]||0)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div></details>';
 document.getElementById('dimChart').innerHTML='<div class="t">'+d.title+'</div><div class="n">'+d.note+'</div>'+s+leg+tbl;
}
function hist(el,title,note,key,fmt){
 const order=['0k','100k','200k','300k','400k','500k','600k','700k','800k','900k'];
 const W=460,L=36,B=30,TP=10,RW=W-L-10,H=220,PH=H-B-TP;const groups=['fixflow','clinic'];
 const data=order.map(b=>({b,f:DATA.dims[key].series.fixflow[b]||0,c:DATA.dims[key].series.clinic[b]||0}));
 const max=Math.max(...data.flatMap(d=>[d.f,d.c]))*1.08;
 let s='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="'+title+'">';
 for(let t=0;t<=4;t++){const v=max*t/4,y=TP+PH-PH*t/4;s+='<line class="grid" x1="'+L+'" x2="'+W+'" y1="'+y+'" y2="'+y+'"/><text x="'+(L-6)+'" y="'+(y+4)+'" text-anchor="end">'+Math.round(100*v)+'%</text>';}
 const bw=RW/order.length;
 data.forEach((d,i)=>{const x0=L+i*bw;const w=(bw-10)/2;[['f','var(--s1)','FixFlow'],['c','var(--s2)','Clinic']].forEach(([k,col,lab],j)=>{const h=PH*d[k]/max;const x=x0+4+j*(w+2);
  s+='<rect x="'+x+'" y="'+(TP+PH-h)+'" width="'+w+'" height="'+h+'" rx="2" fill="'+col+'" data-l="'+lab+' · context '+d.b+' to +100k" data-v="'+pct(d[k])+'"/>';});
  s+='<text x="'+(x0+bw/2)+'" y="'+(H-10)+'" text-anchor="middle">'+d.b+'</text>';});
 s+='<line class="axis" x1="'+L+'" x2="'+W+'" y1="'+(TP+PH)+'" y2="'+(TP+PH)+'"/></svg>';
 el.innerHTML='<div class="t">'+title+'</div><div class="n">'+note+'</div>'+s+'<div class="legend"><span><i style="background:var(--s1)"></i>FixFlow</span><span><i style="background:var(--s2)"></i>Clinic</span></div>'+
  '<details><summary>table view</summary><div class="tbl"><table><thead><tr><th>bucket</th><th class="num">FixFlow</th><th class="num">Clinic</th></tr></thead><tbody>'+data.map(d=>'<tr><td>'+d.b+'</td><td class="num">'+pct(d.f)+'</td><td class="num">'+pct(d.c)+'</td></tr>').join('')+'</tbody></table></div></details>';
}
function daysChart(){
 const rows=DATA.dayRows;const W=960,L=46,B=34,TP=10,RW=W-L-10,H=260,PH=H-B-TP;const max=Math.max(...rows.map(r=>r.fixflow+r.clinic))*1.08;
 let s='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="cost per day">';
 for(let t=0;t<=4;t++){const v=max*t/4,y=TP+PH-PH*t/4;s+='<line class="grid" x1="'+L+'" x2="'+W+'" y1="'+y+'" y2="'+y+'"/><text x="'+(L-6)+'" y="'+(y+4)+'" text-anchor="end">$'+Math.round(v)+'</text>';}
 const bw=RW/rows.length;
 rows.forEach((r,i)=>{const x=L+i*bw+2,w=Math.max(2,bw-4);const hf=PH*r.fixflow/max,hc=PH*r.clinic/max;
  s+='<rect x="'+x+'" y="'+(TP+PH-hc)+'" width="'+w+'" height="'+Math.max(0,hc)+'" fill="var(--s2)" data-l="Clinic · '+r.d+'" data-v="$'+Math.round(r.clinic)+'"/>';
  s+='<rect x="'+x+'" y="'+(TP+PH-hc-hf-(hf&&hc?2:0))+'" width="'+w+'" height="'+Math.max(0,hf)+'" rx="2" fill="var(--s1)" data-l="FixFlow · '+r.d+'" data-v="$'+Math.round(r.fixflow)+'"/>';
  if(i%Math.ceil(rows.length/12)===0)s+='<text x="'+(x+w/2)+'" y="'+(H-12)+'" text-anchor="middle">'+r.d.slice(5)+'</text>';});
 s+='<line class="axis" x1="'+L+'" x2="'+W+'" y1="'+(TP+PH)+'" y2="'+(TP+PH)+'"/></svg>';
 document.getElementById('days').innerHTML='<div class="t">List-price cost per day</div><div class="n">'+rows.length+' calendar days with calls, '+rows[0].d+' to '+rows[rows.length-1].d+'</div>'+s+'<div class="legend"><span><i style="background:var(--s1)"></i>FixFlow</span><span><i style="background:var(--s2)"></i>Clinic</span></div>'+
  '<details><summary>table view</summary><div class="tbl"><table><thead><tr><th>day</th><th class="num">FixFlow</th><th class="num">Clinic</th></tr></thead><tbody>'+rows.map(r=>'<tr><td>'+r.d+'</td><td class="num">$'+Math.round(r.fixflow)+'</td><td class="num">$'+Math.round(r.clinic)+'</td></tr>').join('')+'</tbody></table></div></details>';
}
renderDim();hist(document.getElementById('histCalls'),'Calls by context size','share of API calls per 100k context bucket','callsBucket');hist(document.getElementById('histUsd'),'Cost by context size','share of list-price cost per 100k context bucket','costBucket');daysChart();
document.addEventListener('mousemove',e=>{const r=e.target.closest&&e.target.closest('rect[data-l]');if(r)showTip(e,'<b>'+r.dataset.l+'</b><br>'+r.dataset.v);else hideTip();});
</script>`;
fs.writeFileSync(pageFile, html);
console.log('wrote', pageFile, (html.length / 1024).toFixed(0) + ' KB');
