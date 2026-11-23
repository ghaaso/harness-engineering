// Replays the window ceiling's lines call by call over every transcript of this project (read only), with the hook's
// own functions (unit T8-FIX, 2026-11-24). Usage: node replay-ceiling.mjs <hook file> [projects dir]
// Prints, per kind, the transcripts that would be refused and where; and the helpers' growth per call.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
globalThis.WINDOW_CEILING_IMPORT = true;
const H = await import(pathToFileURL(resolve(process.argv[2])).href);
const P = process.argv[3] || 'C:/Users/User/.claude/projects/C--Users-User-Documents-projects-harness-engineering';
const mains = readdirSync(P).filter((n) => n.endsWith('.jsonl')).map((n) => join(P, n));
const helpers = [];
for (const n of readdirSync(P)) { const d = join(P, n, 'subagents'); if (existsSync(d)) for (const f of readdirSync(d)) if (/^agent-.*\.jsonl$/.test(f)) helpers.push(join(d, f)); }
function replay(f, kind) {
  const s = H.freshState(f); let first = null, firstWarn = null, refusedCalls = 0, maxCtx = 0, ctxs = [];
  for (const line of readFileSync(f, 'utf8').split('\n')) {
    const n0 = s.n, last0 = s.segLast;
    H.scanText(s, line + '\n', kind === 'helper');
    if (s.n === n0 && s.segLast === last0) continue;
    if (s.n !== n0) ctxs.push(s.segLast); else ctxs[ctxs.length - 1] = s.segLast;
    const l = H.lines(s, kind); maxCtx = Math.max(maxCtx, l.ctx);
    if (s.n === n0) continue;
    if (l.ctx >= l.warn && !firstWarn) firstWarn = { call: s.n, ctx: l.ctx, warn: Math.round(l.warn) };
    if (l.ctx >= l.hard) { refusedCalls++; if (!first) first = { call: s.n, seg: s.seg, segCall: s.segN, ctx: l.ctx, hard: Math.round(l.hard), g: Math.round(l.g), from: l.gFrom }; }
  }
  return { f: f.slice(P.length + 1), calls: s.n, maxCtx, first, firstWarn, refusedCalls, ctxs, model: s.model };
}
const q = (a, p) => { const b = [...a].sort((x, y) => x - y); return b[Math.floor(p * (b.length - 1))]; };
const out = { helpers: helpers.length, mains: mains.length };
const hr = helpers.map((f) => replay(f, 'helper'));
out.helperRefused = hr.filter((r) => r.first).map((r) => ({ f: r.f.slice(0, 60), calls: r.calls, maxCtx: r.maxCtx, ...r.first, refusedCalls: r.refusedCalls }));
out.helperNoticedEarly = hr.filter((r) => r.firstWarn && r.firstWarn.call <= 17).length;
for (const kind of ['session', 'coordinator']) {
  const mr = mains.map((f) => replay(f, kind));
  out[kind + 'Refused'] = mr.filter((r) => r.first).map((r) => ({ f: r.f.slice(0, 8), calls: r.calls, maxCtx: r.maxCtx, ...r.first, refusedCalls: r.refusedCalls }));
}
// Growth per call of helpers (opus, 10 calls or more): each helper's mean, and every step.
const means = [], steps = [];
for (const r of hr) { if (!/opus/.test(r.model) || r.ctxs.length < 10) continue; means.push((r.ctxs[r.ctxs.length - 1] - r.ctxs[0]) / (r.ctxs.length - 1)); for (let i = 1; i < r.ctxs.length; i++) steps.push(r.ctxs[i] - r.ctxs[i - 1]); }
out.opusHelpers10 = means.length;
out.meanGrowth = { q1: Math.round(q(means, 0.25)), median: Math.round(q(means, 0.5)), q3: Math.round(q(means, 0.75)), max: Math.round(q(means, 1)) };
out.stepGrowth = { n: steps.length, median: Math.round(q(steps, 0.5)), q3: Math.round(q(steps, 0.75)), p90: Math.round(q(steps, 0.9)) };
console.log(JSON.stringify(out, null, 1));
