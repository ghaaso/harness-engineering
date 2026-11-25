// Round 8 prototype "Now" (and the frame "Operate" reuses): a static picture from app/data.json.
// node now.mjs  -> now.html (Tue 24 Nov 03:33) and now-1303.html (Tue 24 Nov 13:03). No build, no framework.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
export const HERE = dirname(fileURLToPath(import.meta.url));
export const D = JSON.parse(readFileSync(join(HERE, '../../app/data.json'), 'utf8'));
export const B = D.base, MIN = 60000;
export const PARTS = D.harness.parts.parts;
export const HOOKS = [...PARTS.filter(p => p.kind === 'hook').map(p => ({ id: p.id.slice(5), name: p.name })), { id: 'creep-gate', name: 'Creep gate' }];
export const hm = t => new Date(t).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
export const day = t => new Date(t).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
export const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
export const cut = (s, n) => s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s;
export const dur = ms => { const m = Math.round(ms / MIN); return m < 60 ? m + ' min' : Math.floor(m / 60) + ' h' + (m % 60 ? ' ' + (m % 60) + ' min' : ''); };
export const C = { ink: '#1f1e1c', mid: '#5c5a55', soft: '#8b8982', line: '#d8d5ce', bg: '#f5f4f1', idle: '#eceae5', red: '#c8321e', amber: '#bd7100', blue: '#1d5fd1', bluebg: '#e8f0fd', area: '#c4c1ba' };

// ---- short tags, by rule from the title (a rail diagram's train id) ----
const used = new Map();
function mkTag(title) {
  const t = title.replace(/^[a-z-]+:\s*/, ''); let m;
  if ((m = t.match(/top(?: session)? ?(\d+\w?)/i))) return 'T' + m[1].toUpperCase();
  if (/big run/i.test(t)) { m = t.match(/third|fourth|fifth|successor/i); return 'BR' + (m ? { third: 3, fourth: 4, fifth: 5, successor: 2 }[m[0].toLowerCase()] : 1); }
  if ((m = t.match(/monitor round (\d)/i))) return 'M' + m[1];
  if (/monitor build/i.test(t)) return 'MB';
  if (/UI\/UX/.test(t)) return 'UX';
  return (t.match(/\b[A-Za-z]/g) || ['?']).slice(0, 3).join('').toUpperCase();
}
for (const s of D.sessions) { let g = mkTag(s.title || 'new'); if (used.has(g)) g += 'b'; used.set(g, 1); s.tag = g; s.name = (s.title || 'New session').replace(/^[a-z-]+:\s*/, '').replace(/^./, c => c.toUpperCase()); }
export const byId = Object.fromEntries(D.sessions.map(s => [s.id, s]));
const placeIdx = Object.fromEntries(D.places.map((p, i) => [p, i]));
const KINDS = ['locate', 'extract', 'read', 'collect', 'run', 'build', 'test', 'analyse', 'refute', 'build-invariant', 'orchestrate', 'design'];
const kindModel = {}; for (const k of KINDS) { const c = {}; for (const s of D.sessions) for (const h of s.helpers) if (h.kind === k) c[h.model] = (c[h.model] || 0) + 1; kindModel[k] = (Object.entries(c).sort((a, b) => b[1] - a[1])[0] || ['-'])[0].split('-')[0]; }

// ---- what is true at the moment T ----
export function stateAt(T) {
  const rows = [];
  for (const s of D.sessions) {
    if (s.t0 > T || !s.title) continue;
    const run = s.helpers.filter(h => h.t0 <= T && T <= h.t1), done = s.helpers.filter(h => h.t1 < T);
    const inSeg = s.segs.some(x => x[0] <= T && T <= x[1]);
    const lastHuman = Math.max(0, ...s.humans.filter(t => t <= T));
    const w = s.wraps.filter(x => x[0] <= T).pop();
    const waiting = !!(w && w[2] && lastHuman < w[0] && T - w[0] < 12 * 60 * MIN);
    const state = waiting ? 'waiting' : inSeg || run.length ? 'working' : T <= s.t1 ? 'quiet' : T - s.t1 < 6 * 60 * MIN ? 'ended' : null;
    if (!state) continue;
    const all = [s, ...s.helpers.filter(h => h.t0 <= T)];
    let tok = 0; const spark = new Array(15).fill(0);
    for (const x of all) for (const e of x.ev) { const a = B + e[0] * 1000, b = a + Math.max(e[1], 1) * 1000; if (a > T) continue; tok += e[3];
      for (let i = 0; i < 15; i++) { const lo = T - (15 - i) * 2 * MIN, hi = lo + 2 * MIN, ov = Math.min(b, hi) - Math.max(a, lo); if (ov > 0) spark[i] += e[3] * ov / (b - a); } }
    const places = new Set();
    if (state === 'working') for (const x of [s, ...run]) { for (const e of x.ev) { const a = B + e[0] * 1000, b = a + e[1] * 1000; if (a <= T && b >= T - 10 * MIN) places.add(e[2]); } for (const c of x.tch || []) { const a = B + c[0] * 1000; if (a <= T && a >= T - 10 * MIN) places.add(c[1]); } }
    const parts = PARTS.filter(p => p.kind !== 'hook' && p.kind !== 'agent' && places.has(placeIdx[p.step]) && s.use[p.id] && s.use[p.id][3] <= T).map(p => p.id);
    if (state === 'waiting') parts.push('tool:wrap_up');
    const marks = s.marks.map(m => ({ t: B + m[0] * 1000, kind: m[2], hook: m[2] === 'window' ? 'window-ceiling' : m[3] })).filter(m => m.t <= T && m.t > lastHuman && m.t > T - 3 * 60 * MIN);
    const step = (s.steps.filter(x => x[0] <= T).pop() || [0, ''])[1];
    rows.push({ s, state, run, done, tok: tok / 1000, spark, parts, marks, step, ask: waiting ? w : null, lastHuman, since: state === 'ended' ? s.t1 : waiting ? w[0] : Math.max(lastHuman, ...s.segs.filter(x => x[1] <= T).map(x => x[1]), s.t0) });
  }
  const ord = { waiting: 0, working: 1, quiet: 2, ended: 3 };
  rows.sort((a, b) => ord[a.state] - ord[b.state] || (a.state === 'ended' ? b.s.t1 - a.s.t1 : a.s.t0 - b.s.t0));
  return rows;
}
// per-minute count of sessions in a turn plus helpers running, for [t0, t1)
export function loadPerMinute(t0, t1) {
  const n = Math.round((t1 - t0) / MIN), tot = new Array(n).fill(0), ses = new Array(n).fill(0);
  const add = (a, b, arr) => { for (let i = Math.max(0, Math.floor((a - t0) / MIN)); i <= Math.min(n - 1, Math.floor((b - t0) / MIN)); i++) arr[i]++; };
  for (const s of D.sessions) { for (const x of s.segs) if (x[1] >= t0 && x[0] < t1) { add(x[0], x[1], tot); add(x[0], x[1], ses); } for (const h of s.helpers) if (h.t1 >= t0 && h.t0 < t1) add(h.t0, h.t1, tot); }
  return { tot, ses };
}
export function allMarks(t0, t1) { const o = []; for (const s of D.sessions) for (const m of s.marks) { const t = B + m[0] * 1000; if (t >= t0 && t < t1) o.push({ t, s, kind: m[2], hook: m[2] === 'window' ? 'window-ceiling' : m[3] }); } return o; }
export const sev = k => k === 'hookfail' || k === 'window' ? 'red' : k === 'noton' ? 'off' : 'amber';

// ---- drawing pieces ----
export const txt = (x, y, s, o = {}) => `<text x="${x}" y="${y}" font-size="${o.size || 12}" font-weight="${o.w || 400}" fill="${o.fill || C.ink}"${o.anchor ? ` text-anchor="${o.anchor}"` : ''}${o.ls ? ` letter-spacing="${o.ls}"` : ''}>${esc(s)}</text>`;
export function chip(x, y, tag, style = 'solid') { // returns [svg, width]; y is the top
  const w = tag.length * 7.2 + 12, f = style === 'solid' ? C.ink : style === 'blue' ? C.blue : 'none', st = style === 'outline' ? C.mid : 'none';
  return [`<rect x="${x}" y="${y}" width="${w}" height="18" rx="3" fill="${f}" stroke="${st}"/>` + txt(x + w / 2, y + 13, tag, { size: 11, w: 700, fill: style === 'outline' ? C.mid : '#fff', anchor: 'middle', ls: '.3' }), w];
}
export function mark(x, y, kind) { // 16 px glyph, x y top-left; shape as well as colour
  const v = sev(kind), cx = x + 8, cy = y + 8;
  if (v === 'red') return `<path d="M${cx} ${y}L${x + 16} ${y + 15}H${x}Z" fill="${C.red}"/><rect x="${cx - 1}" y="${y + 5}" width="2" height="5.5" fill="#fff"/><rect x="${cx - 1}" y="${y + 11.5}" width="2" height="2" fill="#fff"/>`;
  if (v === 'off') return `<circle cx="${cx}" cy="${cy}" r="6.5" fill="none" stroke="${C.mid}" stroke-width="1.5" stroke-dasharray="3 2.2"/>`;
  if (kind === 'unchecked') return `<circle cx="${cx}" cy="${cy}" r="6.2" fill="none" stroke="${C.amber}" stroke-width="2.4"/>`;
  return `<circle cx="${cx}" cy="${cy}" r="8" fill="${C.amber}"/><rect x="${cx - 4.5}" y="${cy - 1.5}" width="9" height="3" fill="#fff"/>`;
}
const glyph = (k, x, y, c) => ({
  hook: `<path d="M${x + 1.5} ${y + 12}V${y + 2}H${x + 10.5}V${y + 12}M${x + 1.5} ${y + 6.5}H${x + 10.5}" fill="none" stroke="${c}" stroke-width="1.6"/>`,
  document: `<path d="M${x + 2} ${y + 1}H${x + 7.5}L${x + 10.5} ${y + 4}V${y + 12}H${x + 2}Z M${x + 7.5} ${y + 1}V${y + 4}H${x + 10.5}" fill="none" stroke="${c}" stroke-width="1.3"/>`,
  store: `<ellipse cx="${x + 6}" cy="${y + 3}" rx="5" ry="2" fill="none" stroke="${c}" stroke-width="1.3"/><path d="M${x + 1} ${y + 3}V${y + 10}A5 2 0 0 0 ${x + 11} ${y + 10}V${y + 3}" fill="none" stroke="${c}" stroke-width="1.3"/>`,
  script: `<path d="M${x + 1} ${y + 3}L${x + 5} ${y + 6.5}L${x + 1} ${y + 10}M${x + 6.5} ${y + 11}H${x + 11.5}" fill="none" stroke="${c}" stroke-width="1.6"/>`,
  tool: `<path d="M${x + 8.5} ${y + 1}L${x + 3.5} ${y + 12}" fill="none" stroke="${c}" stroke-width="1.8"/>`,
  setting: `<circle cx="${x + 6}" cy="${y + 6.5}" r="4" fill="none" stroke="${c}" stroke-width="1.5"/><circle cx="${x + 6}" cy="${y + 6.5}" r="1.2" fill="${c}"/>`,
  agent: `<rect x="${x + 1.5}" y="${y + 2}" width="9" height="9" rx="2" fill="none" stroke="${c}" stroke-width="1.5"/>`,
}[k] || '');

// ---- the page ----
export function page(T, { operate = false, title = 'Now' } = {}) {
  const W = 1870, H = 1050, RX = 12, RW = 392, BX = 434, BW = 1424, GAP = 8, CW = (BW - 9 * GAP) / 10;
  const rows = stateAt(T), live = rows.filter(r => r.state === 'working'), sel = operate ? rows.find(r => r.state === 'waiting') : null;
  const styleOf = r => r.state === 'waiting' || r === sel ? 'blue' : 'solid';
  let o = `<rect x="0" y="0" width="${RX + RW + 12}" height="${H}" fill="#fff"/><line x1="${RX + RW + 12}" y1="0" x2="${RX + RW + 12}" y2="${H}" stroke="${C.line}"/>`;
  // top bar
  o += txt(RX + 4, 30, 'Now', { size: 17, w: 700 }) + `<rect x="${RX + 4}" y="37" width="38" height="3" fill="${C.ink}"/>` + txt(RX + 64, 30, 'History', { size: 17, w: 500, fill: C.mid });
  o += txt(RX + RW, 30, day(T) + '  ' + hm(T), { size: 17, w: 700, anchor: 'end' });
  // the last two hours, on the clock
  { const t0 = T - 120 * MIN, x = t => BX + (t - t0) / (120 * MIN) * BW, base = 124, L = loadPerMinute(t0, T), top = Math.max(6, ...L.tot);
    let d = `M${BX} ${base}`; L.tot.forEach((v, i) => { const y = base - v / top * 54; d += `L${x(t0 + i * MIN)} ${y}L${x(t0 + (i + 1) * MIN)} ${y}`; }); d += `L${BX + BW} ${base}Z`;
    o += `<path d="${d}" fill="${C.area}"/><line x1="${BX}" y1="${base}" x2="${BX + BW}" y2="${base}" stroke="${C.mid}"/>`;
    for (let t = Math.ceil(t0 / (30 * MIN)) * 30 * MIN; t < T - 6 * MIN; t += 30 * MIN) if (x(t) > BX + 20) o += `<line x1="${x(t)}" y1="${base}" x2="${x(t)}" y2="${base + 4}" stroke="${C.mid}"/>` + txt(x(t), base + 15, hm(t), { size: 11, fill: C.mid, anchor: 'middle' });
    o += txt(BX + BW, base + 15, 'now', { size: 11, w: 700, anchor: 'end' });
    for (const m of allMarks(t0, T)) if (sev(m.kind) !== 'off') o += `<rect x="${x(m.t) - 1.5}" y="${base - L.tot[Math.min(L.tot.length - 1, Math.floor((m.t - t0) / MIN))] / top * 54 - 15}" width="3" height="11" fill="${sev(m.kind) === 'red' ? C.red : C.amber}"/>`;
    for (const s of D.sessions) for (const t of s.humans) if (t >= t0 && t <= T) o += `<circle cx="${x(t)}" cy="${base + 4.5}" r="3" fill="${C.blue}"/>`;
    { const hs = D.sessions.flatMap(s => s.humans).filter(t => t >= t0 && t <= T); if (hs.length) { const t = Math.max(...hs); o += txt(Math.min(x(t), BX + BW - 60), base + 27, 'you ' + hm(t), { size: 11.5, w: 700, fill: C.blue, anchor: 'middle' }); } }
    let q = -1; L.ses.concat([1]).forEach((v, i) => { if (!v && q < 0) q = i; if (v && q >= 0) { if (i - q >= 20) { const a = x(t0 + q * MIN), b = x(t0 + i * MIN); o += `<path d="M${a + 2} ${base - 16}v-5H${b - 2}v5" fill="none" stroke="${C.ink}" stroke-width="1.3"/>` + txt((a + b) / 2, base - 27, dur((i - q) * MIN), { size: 13, w: 700, anchor: 'middle' }); } q = -1; } });
  }
  // ---- the board ----
  const CW0 = CW, col = i => BX + i * (CW + GAP), lit = new Map(); // part id -> [[tag, style, n]]
  const put = (id, r, n) => { const a = lit.get(id) || lit.set(id, []).get(id); a.push([r.s.tag, styleOf(r), n]); };
  for (const r of rows) { for (const id of r.parts) put(id, r); const k = {}; for (const h of r.run) k[h.kind] = (k[h.kind] || 0) + 1; for (const [kind, n] of Object.entries(k)) put('kind:' + kind, r, n); }
  const zone = (x, y, name) => txt(x, y, name.toUpperCase(), { size: 11.5, w: 700, fill: C.mid, ls: '1.1' });
  function tile(x, y, h, id, name, kind, sub, CW = CW0) {
    const on = lit.get(id) || [], f = on.length ? '#fff' : 'none', c = on.length ? C.ink : C.mid;
    let g = `<rect x="${x}" y="${y}" width="${CW}" height="${h}" rx="5" fill="${f}" stroke="${on.length ? C.ink : C.line}" stroke-width="${on.length ? 1.6 : 1}"/>` + glyph(kind, x + 9, y + 10, c) + txt(x + 27, y + 21, cut(name, CW > 150 ? 19 : 16), { size: 13.5, w: 600, fill: c });
    if (sub) g += txt(x + 27, y + 37, sub, { size: 11.5, fill: C.mid });
    let cx = x + 9; const cy = y + h - 27;
    on.forEach(([tag, st, n], i) => { const lab = n > 1 ? tag + ' ×' + n : tag, w = lab.length * 7.2 + 12; if (cx + w > x + CW - 6) { if (cx + 20 <= x + CW) g += txt(cx, cy + 13, '+' + (on.length - i), { size: 11, w: 700 }); cx = 1e9; return; } g += chip(cx, cy, lab, st)[0]; cx += w + 4; });
    return g;
  }
  // hooks: every call passes them; a dot per session being checked now; a mark stays until he has seen it
  const HY = 168, HH = 150; let tip = null; o += zone(BX, HY - 8, 'Hooks');
  const mk = new Map(); for (const r of rows) for (const m of r.marks) { const key = m.hook + '|' + r.s.id + '|' + (sev(m.kind) === 'red' ? 'hookfail' : m.kind); const e = mk.get(key) || mk.set(key, { hook: m.hook, r, kind: m.kind, n: 0 }).get(key); e.n++; }
  HOOKS.forEach((hk, i) => {
    const x = col(i), mine = [...mk.values()].filter(e => e.hook === hk.id).sort((a, b) => (sev(a.kind) === 'red' ? 0 : 1) - (sev(b.kind) === 'red' ? 0 : 1));
    const pass = live.filter(r => (r.s.hooksOn || []).includes(hk.id)), silent = hk.id === 'journal-watch' && !D.hooks[hk.id].lines;
    const active = pass.length && !silent, c = active || mine.length ? C.ink : C.mid;
    o += `<rect x="${x}" y="${HY}" width="${CW}" height="${HH}" rx="5" fill="${active || mine.length ? '#fff' : 'none'}" stroke="${mine.some(e => sev(e.kind) === 'red') ? C.red : active || mine.length ? C.ink : silent ? C.soft : C.line}" stroke-width="${mine.some(e => sev(e.kind) === 'red') ? 2.4 : 1.6}"${silent ? ' stroke-dasharray="4 3"' : ''}/>` + glyph('hook', x + 9, y0(HY), c) + txt(x + 27, HY + 21, hk.name, { size: 13.5, w: 600, fill: c });
    if (silent) o += mark(x + 9, HY + 34, 'noton'); else pass.forEach((r, j) => { o += `<circle cx="${x + 13 + j * 11}" cy="${HY + 37}" r="3.5" fill="${C.soft}"/>`; });
    let py = HY + 54; for (const v of ['red', 'amber']) { const g = mine.filter(e => (sev(e.kind) === 'red') === (v === 'red')); if (!g.length) continue; o += mark(x + 8, py + 1, g[0].kind); let px = x + 30; for (const e of g) { const lab = e.r.s.tag + (e.n > 1 ? '×' + e.n : ''), w = lab.length * 7.2 + 12; if (px + w > x + CW - 5 && px > x + 30) { px = x + 30; py += 22; } o += chip(px, py, lab, styleOf(e.r))[0]; px += w + 4; } py += 27; }
    if (operate && hk.id === 'owner-report') tip = [x, PARTS.find(p => p.id === 'hook:owner-report').path];
  });
  function y0(y) { return y + 10; }
  const tipSvg = () => tip ? `<rect x="${tip[0] - 40}" y="${HY + HH + 5}" width="268" height="26" rx="5" fill="${C.ink}"/>` + txt(tip[0] - 28, HY + HH + 23, tip[1] + '   ↗ File pane', { size: 12.5, fill: '#fff' }) + `<path d="M${tip[0] + 96} ${HY + HH - 22}v17l4.5-4l3 6.5l3-1.4l-3-6.4h6z" fill="#fff" stroke="${C.ink}" stroke-width="1.3"/>` : '';
  // the other parts, fixed places
  const TH = 84, Z1 = 352, Z2 = Z1 + 20 + 2 * TH + GAP + 16, Z3 = Z2 + 20 + 2 * TH + GAP + 16;
  const grid = (list, c0, cols, zy, f) => list.forEach((p, i) => { o += f(col(c0 + i % cols), zy + 8 + Math.floor(i / cols) * (TH + GAP), p); });
  const P = k => PARTS.filter(p => p.kind === k), pt = (x, y, p) => tile(x, y, TH, p.id, p.name, p.kind);
  o += zone(col(0), Z1, 'Helper kinds'); grid(KINDS, 0, 6, Z1, (x, y, k) => tile(x, y, TH, 'kind:' + k, k, 'agent', kindModel[k]));
  o += zone(col(6), Z1, 'Commands'); grid(P('tool'), 6, 3, Z1, pt);
  const tg = ['script:hook-tests', 'script:check-commit']; o += zone(col(9), Z1, 'Tests and git'); grid(PARTS.filter(p => tg.includes(p.id)), 9, 1, Z1, pt);
  o += zone(col(0), Z2, 'Scripts'); grid(P('script').filter(p => !tg.includes(p.id)), 0, 6, Z2, pt);
  o += zone(col(6), Z2, 'Stores and settings'); grid([...P('store'), ...P('setting')], 6, 4, Z2, pt);
  const W9 = (BW - 8 * GAP) / 9; o += zone(col(0), Z3, 'Documents'); P('document').forEach((p, i) => { o += tile(BX + (i % 9) * (W9 + GAP), Z3 + 8 + Math.floor(i / 9) * (TH + GAP), TH, p.id, p.name, p.kind, '', W9); });
  // ---- the prompt dock, always in the same place ----
  { const y = 990, bw = sel ? 250 : 92, iw = BW - bw - 250;
    o += `<rect x="${BX}" y="${y}" width="${iw}" height="46" rx="8" fill="#fff" stroke="${sel ? C.blue : C.mid}" stroke-width="${sel ? 2 : 1.2}"/>`;
    if (sel) { o += txt(BX + 16, y + 29, 'To', { size: 14, fill: C.mid }) + chip(BX + 40, y + 14, sel.s.tag, 'blue')[0] + `<rect x="${BX + 78}" y="${y + 12}" width="1.5" height="22" fill="${C.ink}"/>` + txt(BX + 88, y + 29, 'Answer…', { size: 14, fill: C.soft }); }
    else o += txt(BX + 16, y + 29, 'Prompt a new session…', { size: 14, fill: C.soft });
    const btn = (x, w, label, kind) => `<rect x="${x}" y="${y}" width="${w}" height="46" rx="8" fill="${kind === 1 ? (sel ? C.blue : C.ink) : '#fff'}" stroke="${kind === 1 ? 'none' : kind === 2 ? C.red : C.mid}" stroke-width="1.3"/>` + txt(x + w / 2, y + 29, label, { size: 14, w: 600, anchor: 'middle', fill: kind === 1 ? '#fff' : kind === 2 ? C.red : C.ink });
    if (sel) o += btn(BX + iw + 8, 76, 'Send', 1) + btn(BX + iw + 92, 76, 'Queue', 0) + btn(BX + iw + 176, 74, 'Stop', 2); else o += btn(BX + iw + 8, 84, 'Start', 1);
    const sx = BX + BW - 232; o += txt(sx, y + 29, 'Parts open in', { size: 12.5, fill: C.mid }) + `<rect x="${sx + 84}" y="${y + 9}" width="148" height="28" rx="6" fill="${C.idle}"/><rect x="${sx + 158}" y="${y + 11}" width="72" height="24" rx="5" fill="#fff" stroke="${C.mid}"/>` + txt(sx + 121, y + 28, 'VS Code', { size: 12.5, fill: C.mid, anchor: 'middle' }) + txt(sx + 194, y + 28, 'File pane', { size: 12.5, w: 600, anchor: 'middle' });
  }
  // ---- the rail: one strip per session, ordered by need ----
  let y = 56; const smax = Math.max(1, ...rows.flatMap(r => r.spark));
  const marksOf = (r, x, yy) => { const g = {}; for (const m of r.marks) { const k = sev(m.kind) === 'red' ? 'hookfail' : m.kind; g[k] = (g[k] || 0) + 1; } let s = '', px = x; for (const [k, n] of Object.entries(g).sort((a, b) => (a[0] === 'hookfail' ? 0 : 1) - (b[0] === 'hookfail' ? 0 : 1)).reverse()) { px -= 18; s += mark(px, yy, k); if (n > 1) { s += txt(px - 3, yy + 13, n, { size: 11.5, w: 700, anchor: 'end' }); px -= 12; } px -= 6; } return s; };
  for (const r of rows) {
    const s = r.s, big = r.state === 'working' || r.state === 'waiting', off = r.state === 'waiting' ? 16 : 0, x = RX + off;
    if (!big) { // quiet or ended: a thin strip
      if (y + 30 > H - 10) break;
      o += `<rect x="${x}" y="${y}" width="${RW}" height="30" rx="5" fill="none" stroke="${C.line}"/>` + chip(x + 8, y + 6, s.tag, 'outline')[0] + txt(x + 62, y + 20, cut(s.name, 30), { size: 12.5, fill: C.mid });
      o += txt(x + RW - 10, y + 20, r.state === 'ended' ? 'ended ' + hm(s.t1) : 'quiet ' + dur(T - r.since), { size: 11.5, fill: C.mid, anchor: 'end' });
      if (r.state === 'ended' && r.lastHuman < s.t1 - 5 * MIN) o += `<circle cx="${x + RW - 96}" cy="${y + 15}" r="4" fill="${C.blue}"/>`;
      if (operate && r.state === 'ended') o += `<rect x="${x + RW - 124}" y="${y + 7}" width="16" height="16" rx="3" fill="#fff" stroke="${C.mid}"/><path d="M${x + RW - 120} ${y + 15}l3 3l6-7" fill="none" stroke="${C.mid}" stroke-width="1.5"/>`;
      o += marksOf(r, x + RW - (operate && r.state === 'ended' ? 130 : r.state === 'ended' ? 106 : 96), y + 7);
      y += 36; continue;
    }
    const askLines = r.ask ? wrap(r.ask[1].split(/(?<=[.]) /)[0], 54).slice(0, 2).map((l, i, a) => i === 1 && a.length === 2 ? cut(l + ' …', 54) : l) : [], doneRows = Math.ceil(r.done.length / 46);
    const h = 54 + (r.ask ? askLines.length * 17 + 6 + (operate ? 40 : 0) : 22) + (doneRows ? doneRows * 8 + 6 : 0);
    o += `<rect x="${x}" y="${y}" width="${RW}" height="${h}" rx="6" fill="${r.ask ? C.bluebg : '#fff'}" stroke="${r.ask ? C.blue : C.ink}" stroke-width="${r.ask ? 2.2 : 1.2}"/>`;
    if (r.ask) o += `<rect x="${x}" y="${y}" width="6" height="${h}" rx="3" fill="${C.blue}"/>`;
    o += chip(x + 12, y + 9, s.tag, styleOf(r))[0] + txt(x + 66, y + 23, cut(s.name, 32), { size: 13.5, w: 700 }) + txt(x + RW - 10, y + 23, (r.tok < 10 ? r.tok.toFixed(1) : Math.round(r.tok)) + ' M', { size: 13.5, w: 700, anchor: 'end' });
    r.spark.forEach((v, i) => { const bh = Math.max(1, Math.sqrt(v / smax) * 22); o += `<rect x="${x + RW - 85 + i * 5}" y="${y + 52 - bh}" width="4" height="${bh}" fill="${C.mid}"/>`; });
    let yy = y + 52;
    if (r.ask) { o += `<rect x="${x + 14}" y="${y + 34}" width="3.5" height="12" fill="${C.blue}"/><rect x="${x + 20.5}" y="${y + 34}" width="3.5" height="12" fill="${C.blue}"/>` + txt(x + 32, y + 45, 'waits for you · ' + dur(T - r.ask[0]), { size: 12.5, w: 700, fill: C.blue });
      askLines.forEach((l, i) => { o += txt(x + 14, yy + 14 + i * 17, l, { size: 12.5 }); }); yy += askLines.length * 17 + 6;
      if (operate) { const b = (bx, w, label, k) => `<rect x="${bx}" y="${yy + 4}" width="${w}" height="28" rx="6" fill="${k === 1 ? C.blue : '#fff'}" stroke="${k === 1 ? 'none' : k === 2 ? C.red : C.mid}" stroke-width="1.2"/>` + txt(bx + w / 2, yy + 23, label, { size: 13, w: 600, anchor: 'middle', fill: k === 1 ? '#fff' : k === 2 ? C.red : C.ink }); o += b(x + 14, 84, 'Answer', 1) + b(x + 104, 112, 'Open session', 0) + b(x + 222, 62, 'Stop', 2); yy += 40; }
    } else { o += txt(x + 12, y + 45, cut(r.step || 'working', 40), { size: 12.5, fill: C.mid });
      let px = x + 12; for (const hlp of r.run.slice(0, 5)) { const lab = hlp.kind + (T - hlp.t0 > 30 * MIN ? ' · ' + dur(T - hlp.t0) : ''), w = lab.length * 6.4 + 14; o += `<rect x="${px}" y="${yy + 1}" width="${w}" height="17" rx="8.5" fill="${C.ink}"/>` + txt(px + w / 2, yy + 13.5, lab, { size: 11, w: 600, fill: '#fff', anchor: 'middle' }); px += w + 4; }
      if (!r.run.length) o += txt(x + 12, yy + 14, 'no helper running', { size: 11.5, fill: C.soft });
      o += marksOf(r, x + RW - 8, yy + 1); yy += 22; }
    if (r.ask) o += marksOf(r, x + RW - 78, y + 32);
    r.done.forEach((_, i) => { o += `<rect x="${x + 12 + (i % 46) * 8}" y="${yy + 2 + Math.floor(i / 46) * 8}" width="6" height="6" fill="${C.area}"/>`; });
    y += h + 8;
  }
  // who started whom, among the sessions on the rail: nodes and lines
  { const ids = new Set(rows.map(r => r.s.id)), kids = {}, roots = [], pos = new Map(); let leaf = 0;
    for (const r of rows) { const p = r.s.parent; if (p && ids.has(p)) (kids[p] = kids[p] || []).push(r); else roots.push(r); }
    const place = (r, d) => { const k = (kids[r.s.id] || []).sort((a, b) => a.s.t0 - b.s.t0); let px; if (!k.length) px = leaf++; else { const xs = k.map(c => place(c, d + 1)); px = (xs[0] + xs[xs.length - 1]) / 2; } pos.set(r, [px, d]); return px; };
    roots.sort((a, b) => a.s.t0 - b.s.t0).forEach(r => place(r, 0));
    const depth = Math.max(...[...pos.values()].map(p => p[1])) + 1, slot = Math.min(58, (RW - 16) / leaf), ty = H - 26 - depth * 38, X = r => RX + 8 + (pos.get(r)[0] + .5) * slot, Y = r => ty + pos.get(r)[1] * 38;
    if (ty > y + 34 && rows.length > 1) { o += txt(RX + 4, ty - 16, 'WHO STARTED WHOM', { size: 11.5, w: 700, fill: C.mid, ls: '1.1' }); let lines = '', nodes = '';
      for (const r of rows) { for (const c of kids[r.s.id] || []) lines += `<path d="M${X(r)} ${Y(r) + 18}V${Y(c) - 10}H${X(c)}V${Y(c)}" fill="none" stroke="${C.mid}" stroke-width="1.3"/>`; const w = r.s.tag.length * 7.2 + 12; nodes += chip(X(r) - w / 2, Y(r), r.s.tag, r.state === 'waiting' ? 'blue' : r.state === 'working' ? 'solid' : 'outline')[0].replace('fill="none"', 'fill="#fff"'); }
      o += lines + nodes; } }
  o += tipSvg();
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${title}</title><style>html,body{margin:0;background:${C.bg}}svg{display:block;font-family:"Segoe UI",system-ui,sans-serif;font-variant-numeric:tabular-nums}</style></head><body><svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${title}: sessions, helpers and the parts they touch at ${hm(T)}">${o}</svg></body></html>`;
}
export function wrap(s, n) { const out = ['']; for (const w of s.split(' ')) { if ((out[out.length - 1] + ' ' + w).trim().length > n) out.push(w); else out[out.length - 1] = (out[out.length - 1] + ' ' + w).trim(); } return out; }

if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('/now.mjs')) {
  for (const [f, t] of [['now.html', '2026-11-24T03:33:00'], ['now-1303.html', '2026-11-24T13:03:00']]) {
    const T = new Date(t).getTime(); writeFileSync(join(HERE, f), page(T));
    for (const r of stateAt(T).slice(0, 3)) console.log(r.s.tag, 'own', Math.round(r.s.ev.filter(e => B + e[0] * 1000 <= T).reduce((a, e) => a + e[3], 0) / 1000), 'helpers', r.s.helpers.map(h => Math.round(h.ev.filter(e => B + e[0] * 1000 <= T).reduce((a, e) => a + e[3], 0) / 1000)).join(','), 'total', Math.round(r.s.tokens / 1e6), 'htok', r.s.helpers.map(h => Math.round(h.tokens / 1e6)).join(','));
    console.log(f, stateAt(T).map(r => `${r.s.tag}:${r.state}:h${r.run.length}/${r.done.length}:m${r.marks.length}:[${r.parts.map(p => p.split(':')[1]).join(',')}]`).join('  '));
  }
}
