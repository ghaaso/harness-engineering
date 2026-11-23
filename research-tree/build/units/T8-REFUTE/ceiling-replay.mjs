import { readFileSync, existsSync } from 'node:fs'; import { join, resolve } from 'node:path'; import { homedir } from 'node:os'; const root='C:/Users/User/Documents/projects/harness-engineering';
const ORIENT = 17;          // r57-0171: orientation of an Opus root, 17 calls
const R_REC = 2_330_000;    // r57-0171: those 17 calls cost 2.33 M tokens of context
const K = 10;               // ORCHESTRATION.md section 5: 10 calls to reach a quiet point and write the checkpoint
const COMPACT_AT = 0.92;    // ORCHESTRATION.md section 5: the app compacts at 92 % of autoCompactWindow (368 K of 400 K)
const WINDOW_BY_FAMILY = { fable: 1_000_000, sonnet: 1_000_000 }; // ORCHESTRATION.md section 5: "near the 1M window"
const kfmt = (x) => (Number.isFinite(x) ? `${Math.round(x / 1000)} K` : 'none');
function freshState(path) {
  return { v: 1, path, off: 0, n: 0, lastId: null, seg: 0, boundary: false, segN: 0, segFirst: 0, segF: 0, segLast: 0, first17: [], model: '' };
}
function addCall(s, id, ctx, model) {
  if (id && id === s.lastId) { // another content block of the same call: keep the largest reading
    if (ctx <= s.segLast) return;
    s.segLast = ctx;
    if (s.segN === 1) s.segFirst = ctx;
    if (s.segN <= ORIENT) s.segF = ctx;
    if (s.n <= ORIENT) s.first17[s.n - 1] = ctx;
    return;
  }
  if (s.boundary) { s.seg++; s.segN = 0; s.boundary = false; }
  s.n++; s.segN++; s.lastId = id;
  if (s.segN === 1) s.segFirst = ctx;
  if (s.segN <= ORIENT) s.segF = ctx;
  s.segLast = ctx;
  if (s.n <= ORIENT) s.first17.push(ctx);
  if (model) s.model = model;
}
function scanText(s, text, helper) {
  for (const line of text.split('\n')) {
    if (line.includes('"compact_boundary"')) {
      try { const j = JSON.parse(line); if (j.type === 'system' && j.subtype === 'compact_boundary') s.boundary = true; } catch {}
      continue;
    }
    if (!line.includes('"assistant"') || !line.includes('"usage"')) continue;
    let j; try { j = JSON.parse(line); } catch { continue; }
    if (j.type !== 'assistant' || !j.message || !j.message.usage) continue;
    if (!helper && j.isSidechain) continue;
    const m = j.message, u = m.usage;
    if (m.model === '<synthetic>') continue;
    const ctx = (u.input_tokens || 0) + (u.cache_creation_input_tokens || 0) + (u.cache_read_input_tokens || 0) + (u.output_tokens || 0);
    if (!(ctx > 0)) continue;
    addCall(s, m.id || j.uuid || null, ctx, m.model || '');
  }
}
function windowFor(model) {
  const files = [process.env.WINDOW_CEILING_SETTINGS || join(homedir(), '.claude', 'settings.json'),
    resolve(root, '.claude', 'settings.json'), resolve(root, '.claude', 'settings.local.json')];
  for (const f of files) {
    try {
      const ms = JSON.parse(readFileSync(f, 'utf8')).modelSettings || {};
      const w = ms[model] && Number(ms[model].autoCompactWindow);
      if (w > 0) return { window: w, from: 'settings' };
    } catch {}
  }
  const fam = Object.keys(WINDOW_BY_FAMILY).find((f) => String(model).toLowerCase().includes(f));
  return fam ? { window: WINDOW_BY_FAMILY[fam], from: 'family' } : { window: null, from: 'unknown' };
}
function lines(s, helper) {
  const ctx = s.segLast;
  const { window } = windowFor(s.model);
  const A = window ? COMPACT_AT * window : Infinity;
  const gAll = s.segN > 1 ? (ctx - s.segFirst) / (s.segN - 1) : 0;
  const out = { ctx, calls: s.n, seg: s.seg, segCalls: s.segN, model: s.model, window, A };
  if (helper) {
    const g = Math.max(gAll, 0);
    out.g = g;
    out.hard = A - K * g;
    out.warn = out.hard - K * g;
    return out;
  }
  const R = s.first17.length >= ORIENT ? s.first17.slice(0, ORIENT).reduce((a, b) => a + b, 0) : R_REC;
  const F = s.segF;
  const work = s.segN - Math.min(s.segN, ORIENT);
  const gWork = work > 0 ? (ctx - F) / work : null;
  const g = gWork !== null && gWork > 0 ? gWork : Math.max(gAll, 0);
  const Wstar = gWork !== null && gWork > 0 ? F + Math.sqrt(2 * R * gWork) : Infinity;
  out.F = F; out.R = R; out.g = g; out.Wstar = Wstar;
  out.hard = Math.min(Wstar + K * g, A - K * g);
  out.warn = Math.min(Wstar, out.hard - K * g);
  return out;
}
const f = process.argv[2], helper = process.argv[3] === 'helper';
const s = freshState(f);
let firstWarn = null, firstHard = null, maxCtx = 0, rows = [];
for (const line of readFileSync(f, 'utf8').split('\n')) {
  const n0 = s.n;
  scanText(s, line + '\n', helper);
  if (s.n !== n0) {
    const l = lines(s, helper);
    maxCtx = Math.max(maxCtx, l.ctx);
    if (!firstWarn && l.ctx >= l.warn) firstWarn = { call: s.n, ctx: l.ctx, warn: Math.round(l.warn), hard: Math.round(l.hard), seg: s.seg };
    if (!firstHard && l.ctx >= l.hard) firstHard = { call: s.n, ctx: l.ctx, warn: Math.round(l.warn), hard: Math.round(l.hard), seg: s.seg };
    if (s.n % 20 === 0) rows.push(`${s.n}:${Math.round(l.ctx/1000)}/${Math.round(l.warn/1000)}/${Math.round(l.hard/1000)}s${s.seg}`);
  }
}
console.log(JSON.stringify({ calls: s.n, maxCtx, firstWarn, firstHard }));
console.log(rows.join(' '));
