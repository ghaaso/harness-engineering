// R5 refuter: fits and partitions over r5-extract output. Read-only.
const fs = require('fs');
function load(f) { return fs.readFileSync(f, 'utf8').trim().split('\n').map(l => JSON.parse(l)); }
function solve(A, b) { const k = b.length; A = A.map(r => r.slice()); b = b.slice();
  for (let i = 0; i < k; i++) { let mx = i; for (let r = i + 1; r < k; r++) if (Math.abs(A[r][i]) > Math.abs(A[mx][i])) mx = r; [A[i], A[mx]] = [A[mx], A[i]]; [b[i], b[mx]] = [b[mx], b[i]];
    for (let r = 0; r < k; r++) { if (r === i) continue; const f = A[r][i] / A[i][i]; for (let c = i; c < k; c++) A[r][c] -= f * A[i][c]; b[r] -= f * b[i]; } }
  return b.map((v, i) => v / A[i][i]); }
function wls(X, y, w) { const k = X[0].length; const A = Array.from({ length: k }, () => Array(k).fill(0)); const b = Array(k).fill(0);
  for (let i = 0; i < X.length; i++) { const wi = w ? w[i] : 1; for (let p = 0; p < k; p++) { b[p] += wi * X[i][p] * y[i]; for (let q = 0; q < k; q++) A[p][q] += wi * X[i][p] * X[i][q]; } }
  return solve(A, b); }
function lad(X, y) { let beta = wls(X, y); for (let it = 0; it < 60; it++) { const w = X.map((x, i) => 1 / Math.max(0.05, Math.abs(y[i] - x.reduce((a, v, j) => a + v * beta[j], 0)))); beta = wls(X, y, w); } return beta; }
function r2(X, y, beta) { const my = y.reduce((a, v) => a + v, 0) / y.length; let ss = 0, sr = 0; for (let i = 0; i < y.length; i++) { const p = X[i].reduce((a, v, j) => a + v * beta[j], 0); sr += (y[i] - p) ** 2; ss += (y[i] - my) ** 2; } return 1 - sr / ss; }
const f2 = v => (+v).toFixed(2), pc = v => (100 * v).toFixed(1) + '%';
const LOOK = new Set(['Read', 'Grep', 'Glob', 'LS', 'WebFetch', 'WebSearch', 'ToolSearch', 'TaskOutput', 'TaskGet', 'TaskList']);
const WRITE_RUN = /\bsed\s+-i\b|\btee\b|(^|[^0-9&>2])>\s*[^&\s]|>>|\bmkdir\b|\brm\b|\bmv\b|\bcp\b|\btouch\b|\bnpm\b|\bnpx\b|\bpnpm\b|\byarn\b|\bpytest\b|\bnode\b|\bpython\d?\b|\bpip\b|\bdocker\b|\bmake\b|\bcurl\b|\bgh\b|\bgit\s+(commit|push|pull|fetch|merge|checkout|switch|add|rebase|reset|worktree|stash|cherry-pick|restore|rm|mv|tag|clone|apply)\b|\bsleep\b|\bSet-Content\b|\bOut-File\b|\bRemove-Item\b|\bNew-Item\b|\bCopy-Item\b|\bMove-Item\b|\bStart-Sleep\b|\buv\b|\bmanage\.py\b|\balembic\b|\bruff\b|\bmypy\b|\btsc\b|\bvitest\b|\bjest\b/;
const READ_SEG = /^(cat|sed\s+-n|head|tail|nl|grep|rg|egrep|fgrep|ls|dir|find|wc|git\s+(log|show|diff|status|blame|ls-files|ls-tree|grep|rev-parse|branch|cat-file|config\s+--get|remote|describe|shortlog|reflog|merge-base)|awk|sort|uniq|cut|tr|echo|printf|pwd|stat|file|tree|type|which|jq|du|diff|cmp|md5sum|sha256sum|basename|dirname|realpath|readlink|Get-Content|Select-String|Get-ChildItem|Test-Path|Get-Item|Measure-Object|Select-Object|Where-Object|ForEach-Object|Format-\w+)\b/;
function shellLook(cmd, strict) { let c = String(cmd || '').trim(); if (!c) return false; if (WRITE_RUN.test(c)) return false; if (!strict) return true;
  c = c.replace(/^cd\s+("[^"]*"|'[^']*'|\S+)\s*(&&|;)\s*/, '');
  const segs = c.split(/\s*(?:&&|\|\||;|\||\n)\s*/).map(s => s.trim()).filter(Boolean);
  return segs.length > 0 && segs.every(s => READ_SEG.test(s) || /^(for|do|done|then|fi|if|else|xargs|while|2>\/dev\/null|\}|\{)\b/.test(s)); }
function isLook(c, strict) { return c.tools.length > 0 && c.tools.every(t => LOOK.has(t.n) || ((t.n === 'Bash' || t.n === 'PowerShell') && shellLook(t.cmd, strict))); }
const fam = m => /opus/.test(m) ? 'opus' : /sonnet/.test(m) ? 'sonnet' : /fable/.test(m) ? 'fable' : /haiku/.test(m) ? 'haiku' : 'other';
const res = {};
for (const g of ['ff', 'cl']) {
  const R = load(`${g}-r5.jsonl`); const C = R.filter(r => r.k === 'call'), W = R.filter(r => r.k === 'win');
  const ok = C.filter(r => r.lat != null && r.lat > 0 && r.lat < 900);
  const y = ok.map(r => r.lat);
  const X1 = ok.map(r => [1, r.out / 1000, r.ctx / 1e5]);
  const b1 = wls(X1, y), l1 = lad(X1, y);
  const X2 = ok.map(r => [1, r.out / 1000, r.ctx / 1e5, (r.out / 1000) * (r.ctx / 1e5), r.cw / 1e4]);
  const b2 = wls(X2, y), l2 = lad(X2, y);
  const Xo = ok.map(r => [1, r.out / 1000]); const bo = wls(Xo, y);
  const sum = a => a.reduce((s, v) => s + v, 0);
  const T = sum(y), O = sum(ok.map(r => r.out)) / 1000, K = sum(ok.map(r => r.ctx)) / 1e5, OK = sum(ok.map(r => (r.out / 1000) * (r.ctx / 1e5))), CW = sum(ok.map(r => r.cw)) / 1e4;
  const share1 = { fixed: b1[0] * ok.length / T, out: b1[1] * O / T, ctx: b1[2] * K / T };
  const share2 = { fixed: b2[0] * ok.length / T, out: b2[1] * O / T, ctx: b2[2] * K / T, outXctx: b2[3] * OK / T, cacheWrite: b2[4] * CW / T };
  const meanCtx = K / ok.length * 1e5;
  // effective seconds per 1k output at the mean context, from the interaction model
  const spk = ctx => b2[1] + b2[3] * ctx / 1e5;
  const byModel = {};
  for (const m of ['opus', 'sonnet', 'fable']) { const s = ok.filter(r => fam(r.model) === m); if (s.length < 100) continue;
    const Xm = s.map(r => [1, r.out / 1000, r.ctx / 1e5]); const bm = wls(Xm, s.map(r => r.lat)); const lm = lad(Xm, s.map(r => r.lat));
    byModel[m] = { n: s.length, ols: bm.map(f2), lad: lm.map(f2), meanOut: Math.round(sum(s.map(r => r.out)) / s.length), meanCtx: Math.round(sum(s.map(r => r.ctx)) / s.length), meanLat: f2(sum(s.map(r => r.lat)) / s.length), secPer1kOutRaw: f2(sum(s.map(r => r.lat)) / sum(s.map(r => r.out)) * 1000) }; }
  // context-binned speed: median seconds per 1k output for calls with out>=1500, by ctx bucket
  const bins = [[0, 1e5], [1e5, 2e5], [2e5, 3e5], [3e5, 4e5], [4e5, 1e7]]; const ctxBins = {};
  for (const [a, b] of bins) { const s = ok.filter(r => r.ctx >= a && r.ctx < b && r.out >= 1500).map(r => r.lat / r.out * 1000).sort((p, q) => p - q); const s2 = ok.filter(r => r.ctx >= a && r.ctx < b && r.out < 300).map(r => r.lat).sort((p, q) => p - q);
    ctxBins[`${a / 1e3}-${b >= 1e7 ? 'inf' : b / 1e3}k`] = { nBig: s.length, medSecPer1k_out1500plus: s.length ? f2(s[s.length >> 1]) : null, nSmall: s2.length, medLat_out_lt300: s2.length ? f2(s2[s2.length >> 1]) : null }; }
  // lookup-only shares
  const look = {};
  for (const strict of [false, true]) { const key = strict ? 'strict' : 'loose';
    let nL = 0, latL = 0, latAll = 0, tokL = 0, tokAll = 0, outL = 0, outAll = 0;
    for (const r of C) { const L = isLook(r, strict); tokAll += r.ctx; outAll += r.out; if (L) { nL++; tokL += r.ctx; outL += r.out; } }
    for (const r of ok) { latAll += r.lat; if (isLook(r, strict)) latL += r.lat; }
    look[key] = { callShare: pc(nL / C.length), tokShare: pc(tokL / tokAll), outShare: pc(outL / outAll), modelTimeShare: pc(latL / latAll) }; }
  // time partition
  const mS = sum(W.map(w => w.modelS)), aS = sum(W.map(w => w.activeNoSubS)), aAll = sum(W.map(w => w.activeAllS)), sub = sum(W.map(w => w.subWaitS));
  const kinds = {}; for (const w of W) for (const [k, v] of Object.entries(w.toolUncoveredByKindS)) kinds[k] = (kinds[k] || 0) + v;
  const kindsTop = Object.entries(kinds).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k, v]) => `${k} ${(v / 3600).toFixed(1)}h`);
  const latLookLoose = sum(ok.filter(r => isLook(r, false)).map(r => r.lat)) / 3600, latLookStrict = sum(ok.filter(r => isLook(r, true)).map(r => r.lat)) / 3600;
  res[g] = { calls: C.length, okCalls: ok.length, startFromApiRequest: pc(C.filter(r => r.startSrc === 'req').length / C.length), modelHours_sumLat: f2(T / 3600),
    olsSimple: { b: b1.map(f2), r2: f2(r2(X1, y, b1)), share: Object.fromEntries(Object.entries(share1).map(([k, v]) => [k, pc(v)])) },
    ladSimple: l1.map(f2), outputOnly: { b: bo.map(f2), r2: f2(r2(Xo, y, bo)) },
    olsInteraction: { b: b2.map(f2), r2: f2(r2(X2, y, b2)), share: Object.fromEntries(Object.entries(share2).map(([k, v]) => [k, pc(v)])), secPer1kAt100k: f2(spk(1e5)), secPer1kAt300k: f2(spk(3e5)), secPer1kAtMeanCtx: f2(spk(meanCtx)), meanCtx: Math.round(meanCtx) },
    ladInteraction: l2.map(f2), byModel, ctxBins, look,
    partition: { modelUnionH: f2(mS / 3600), activeNoSubH: f2(aS / 3600), modelShareOfActive: pc(mS / aS), activeInclSubWaitH: f2(aAll / 3600), subagentWaitH: f2(sub / 3600), toolOnlyByKind: kindsTop,
      lookLooseModelH: f2(latLookLoose), lookStrictModelH: f2(latLookStrict), lookLooseShareOfActive: pc(latLookLoose * 3600 / aS), lookStrictShareOfActive: pc(latLookStrict * 3600 / aS) } };
}
fs.writeFileSync('r5-fit.json', JSON.stringify(res, null, 1));
console.log(JSON.stringify(res, null, 1));
