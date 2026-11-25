// Round 8 prototype "History": the week as seven day-strips that are never cut, and a window onto session lanes
// (helpers packed under their session, one thin row per hook on the same clock, long quiet stretches folded into a
// band that carries its length). A static picture from app/data.json.  node history.mjs -> history.html
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { HERE, D, B, MIN, C, HOOKS, txt, chip, mark, cut, dur, hm, loadPerMinute, allMarks, sev } from './now.mjs';

const W = 1870, H = 1050, DAY = 1440 * MIN;
const at = s => new Date(s).getTime();
const WEEK0 = at('2026-11-18T00:00:00'), W0 = at('2026-11-24T00:00:00'), W1 = at('2026-11-24T14:06:00');
let o = '';
o += txt(16, 30, 'Now', { size: 17, w: 500, fill: C.mid }) + txt(76, 30, 'History', { size: 17, w: 700 }) + `<rect x="76" y="37" width="60" height="3" fill="${C.ink}"/>`;
o += txt(W - 14, 30, 'Wed 18 to Tue 24 Nov', { size: 17, w: 700, anchor: 'end' });
const label = (x, y, s) => txt(x, y, s.toUpperCase(), { size: 11.5, w: 700, fill: C.mid, ls: '1.1' });

// ---- the week, never cut: one strip per day, white where nothing ran ----
const SX = 96, SW = W - SX - 14, SY = 70, SP = 32, SH = 26, sx = t => SX + ((t - WEEK0) % DAY) / DAY * SW;
{ const L = loadPerMinute(WEEK0, WEEK0 + 7 * DAY), top = Math.max(...L.tot), marks = allMarks(WEEK0, WEEK0 + 7 * DAY);
  for (let h = 0; h <= 24; h += 3) o += txt(SX + h / 24 * SW, SY - 8, String(h).padStart(2, '0') + ':00', { size: 11, fill: C.mid, anchor: h === 24 ? 'end' : h ? 'middle' : 'start' });
  for (let d = 0; d < 7; d++) { const y = SY + d * SP, base = y + SH, t0 = WEEK0 + d * DAY;
    o += `<rect x="${SX}" y="${y}" width="${SW}" height="${SH}" fill="#fff"/>` + txt(SX - 12, base - 9, new Date(t0 + DAY / 2).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' }), { size: 13, w: 600, anchor: 'end' });
    let p = `M${SX} ${base}`, prev = -1; for (let i = 0; i <= 1440; i++) { const v = i < 1440 ? L.tot[d * 1440 + i] : 0; if (v !== prev) { const x = (SX + i / 1440 * SW).toFixed(1); p += `L${x} ${(base - Math.sqrt(Math.max(prev, 0) / top) * (SH - 5)).toFixed(1)}L${x} ${(base - Math.sqrt(v / top) * (SH - 5)).toFixed(1)}`; prev = v; } }
    o += `<path d="${p}Z" fill="${C.area}"/><line x1="${SX}" y1="${base}" x2="${SX + SW}" y2="${base}" stroke="${C.mid}" stroke-width=".8"/>`;
    for (const m of marks) if (m.t >= t0 && m.t < t0 + DAY && sev(m.kind) !== 'off') o += `<rect x="${sx(m.t) - 1}" y="${y + 1}" width="2" height="8" fill="${sev(m.kind) === 'red' ? C.red : C.amber}"/>`;
    for (const s of D.sessions) for (const t of s.humans) if (t >= t0 && t < t0 + DAY) o += `<circle cx="${sx(t)}" cy="${base + 3}" r="2" fill="${C.blue}"/>`;
  }
}
// ---- the window: Tue 24 Nov, with long empty stretches folded ----
const LX = 262, LW = 1500, FW = 54, L = loadPerMinute(W0, W1), n = L.tot.length;
const runs = (arr, min) => { const out = []; let q = -1; arr.concat([1]).forEach((v, i) => { if (!v && q < 0) q = i; if (v && q >= 0) { if (i - q >= min) out.push([W0 + q * MIN, W0 + Math.min(i, n) * MIN]); q = -1; } }); return out; };
const folds = runs(L.tot, 60), quiet = runs(L.ses, 20).filter(q => !folds.some(f => f[0] < q[1] && f[1] > q[0]));
const ppm = (LW - folds.length * FW) / (n - folds.reduce((a, f) => a + (f[1] - f[0]) / MIN, 0));
const x = t => { t = Math.max(W0, Math.min(W1, t)); let px = LX, cur = W0; for (const f of folds) { if (t <= f[0]) break; px += (f[0] - cur) / MIN * ppm; if (t < f[1]) return px + FW * (t - f[0]) / (f[1] - f[0]); px += FW; cur = f[1]; } return px + (t - cur) / MIN * ppm; };
const sess = D.sessions.filter(s => s.title && s.t1 >= W0 && s.t0 <= W1), ids = new Set(sess.map(s => s.id)), kids = {}, lanes = [];
for (const s of sess) if (s.parent && ids.has(s.parent)) (kids[s.parent] = kids[s.parent] || []).push(s);
const walk = (s, d) => { lanes.push({ s, d }); for (const c of kids[s.id] || []) walk(c, d + 1); };
sess.filter(s => !(s.parent && ids.has(s.parent))).forEach(s => walk(s, 0));
for (const ln of lanes) { const rows = []; ln.bars = [];
  for (const h of ln.s.helpers.filter(h => h.t1 >= W0 && h.t0 <= W1).sort((a, b) => a.t0 - b.t0)) { const a = x(h.t0), b = Math.max(x(h.t1), a + 1.5); let r = rows.findIndex(e => e <= a - 1); if (r < 0) r = rows.length < 6 ? rows.push(0) - 1 : 5; rows[r] = b; ln.bars.push([a, b, r]); }
  ln.h = Math.max(19, 11 + rows.length * 4 + 3); ln.tok = (ln.s.tokens + ln.s.helpers.reduce((a, h) => a + h.tokens, 0)) / 1e6; }
const AY = 342, LY = AY + 14, lanesH = lanes.reduce((a, l) => a + l.h, 0), HKY = LY + lanesH + 24, HKP = 14, BOT = HKY + HOOKS.length * HKP;
console.log('lanes', lanes.length, 'height', lanesH, 'bottom', BOT, 'folds', folds.map(f => hm(f[0]) + '-' + hm(f[1])).join(' '), 'quiet', quiet.map(f => hm(f[0]) + '-' + hm(f[1])).join(' '));
// the window on the week strip, and the funnel down to the lanes
{ const y = SY + 6 * SP, a = sx(W0), b = SX + (W1 - W0) / DAY * SW;
  o += `<path d="M${a} ${y + SH + 3}L${LX} ${AY - 26}H${LX + LW}L${b} ${y + SH + 3}Z" fill="#e9e7e1"/>`;
  o += `<rect x="${a}" y="${y - 3}" width="${b - a}" height="${SH + 6}" fill="none" stroke="${C.ink}" stroke-width="2.2" rx="3"/><rect x="${a - 3}" y="${y + 7}" width="6" height="16" rx="2" fill="${C.ink}"/><rect x="${b - 3}" y="${y + 7}" width="6" height="16" rx="2" fill="${C.ink}"/>`; }
// axis, hour lines, folds, quiet stretches
o += `<defs><pattern id="hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="7" height="7" fill="#efede8"/><line x1="0" y1="0" x2="0" y2="7" stroke="#b9b6ae" stroke-width="2"/></pattern></defs>`;
o += `<rect x="${LX}" y="${LY - 6}" width="${LW}" height="${BOT - LY + 10}" fill="#fff"/>`;
for (let t = W0; t <= W1; t += 60 * MIN) { if (folds.some(f => t > f[0] && t < f[1])) continue; o += `<line x1="${x(t)}" y1="${LY - 6}" x2="${x(t)}" y2="${BOT + 4}" stroke="#eceae5"/>` + txt(x(t), AY, hm(t), { size: 11.5, fill: C.mid, anchor: t === W0 ? 'start' : 'middle' }); }
for (const f of folds) { const a = x(f[0]); o += `<rect x="${a}" y="${LY - 6}" width="${FW}" height="${BOT - LY + 10}" fill="url(#hatch)"/><rect x="${a - 16}" y="${AY - 15}" width="${FW + 32}" height="20" rx="10" fill="${C.ink}"/>` + txt(a + FW / 2, AY - 1, dur(f[1] - f[0]), { size: 11.5, w: 700, fill: '#fff', anchor: 'middle' }); }
for (const q of quiet) { const a = x(q[0]), b = x(q[1]); o += `<path d="M${a + 1} ${AY - 14}v-5H${b - 1}v5" fill="none" stroke="${C.ink}" stroke-width="1.3"/><rect x="${(a + b) / 2 - 38}" y="${AY - 29}" width="76" height="18" fill="${C.bg}"/>` + txt((a + b) / 2, AY - 15, dur(q[1] - q[0]), { size: 12.5, w: 700, anchor: 'middle' }); }
// lanes: a session's turns as a dark bar, the time it waited for him as a blue line, helpers packed under it
{ let y = LY; const topTok = Math.max(...lanes.map(l => l.tok)), yOf = new Map(); let tree = '';
  for (const ln of lanes) { const s = ln.s, cy = y + 6.5, ix = 14 + ln.d * 11; yOf.set(s.id, cy);
    if (s.parent && yOf.has(s.parent)) tree += `<path d="M${ix - 6} ${yOf.get(s.parent) + 9}V${cy}H${ix}" fill="none" stroke="${C.soft}" stroke-width="1.2"/>`;
    o += chip(ix, y - 2.5, s.tag, 'outline')[0] + txt(ix + s.tag.length * 7.2 + 20, cy + 4.5, cut(s.name, 25 - ln.d * 2), { size: 12.5 });
    o += `<line x1="${x(s.t0)}" y1="${cy}" x2="${x(s.t1)}" y2="${cy}" stroke="${C.soft}" stroke-width="1.2"/>`;
    for (const w of s.wraps) if (w[2]) { const nx = s.humans.find(t => t > w[0]) || Math.min(W1, w[0] + 12 * 60 * MIN); if (nx > W0 && w[0] < W1 && nx - w[0] > 3 * MIN) o += `<line x1="${x(w[0])}" y1="${cy}" x2="${x(nx)}" y2="${cy}" stroke="${C.blue}" stroke-width="3.4"/>`; }
    for (const g of s.segs) if (g[1] >= W0 && g[0] <= W1) o += `<rect x="${x(g[0])}" y="${cy - 4}" width="${Math.max(1.5, x(g[1]) - x(g[0]))}" height="8" fill="#3b3a37"/>`;
    for (const [a, b, r] of ln.bars) o += `<rect x="${a}" y="${y + 11.5 + r * 4}" width="${b - a}" height="3" fill="${C.soft}"/>`;
    for (const m of s.marks) { const t = B + m[0] * 1000; if (t >= W0 && t <= W1 && sev(m[2]) !== 'off') o += `<rect x="${x(t) - 1.5}" y="${cy - 9}" width="3" height="11" fill="${sev(m[2]) === 'red' ? C.red : C.amber}"/>`; }
    for (const t of s.humans) if (t >= W0 && t <= W1) o += `<circle cx="${x(t)}" cy="${cy}" r="3" fill="${C.blue}" stroke="#fff" stroke-width="1"/>`;
    const bw = ln.tok / topTok * 46; o += `<rect x="${LX + LW + 10}" y="${cy - 4}" width="${bw}" height="8" fill="${C.area}"/>` + txt(LX + LW + 16 + bw, cy + 4.5, Math.round(ln.tok) + ' M', { size: 11.5, fill: C.mid });
    y += ln.h; }
  o = o.replace('<!--tree-->', '') + tree; }
// one thin row per hook, on the same clock: a mark at each refusal or failure, pale where calls passed, empty before it existed
{ o += `<line x1="${LX}" y1="${HKY - 11}" x2="${LX + LW}" y2="${HKY - 11}" stroke="${C.line}"/>`; const marks = allMarks(W0, W1);
  HOOKS.forEach((hk, i) => { const y = HKY + i * HKP, mine = marks.filter(m => m.hook === hk.id), info = D.hooks[hk.id], never = info && !info.lines;
    const since = info ? info.installed || Infinity : Math.min(...allMarks(0, W1).filter(m => m.hook === hk.id).map(m => m.t));
    o += txt(LX - 12, y + 4, hk.name, { size: 12.5, anchor: 'end', fill: never ? C.mid : C.ink });
    if (never) { o += `<line x1="${LX}" y1="${y}" x2="${LX + LW}" y2="${y}" stroke="${C.soft}" stroke-dasharray="3 4"/>` + mark(LX - 118, y - 8, 'noton'); return; }
    for (const s of sess) if ((s.hooksOn || []).includes(hk.id)) for (const g of s.segs) { const a = Math.max(g[0], since, W0), b = Math.min(g[1], W1); if (b > a) o += `<rect x="${x(a)}" y="${y - 2}" width="${Math.max(1, x(b) - x(a))}" height="4" fill="#d5d2cb"/>`; }
    if (since > W0 && since < W1) o += `<path d="M${x(since)} ${y - 5}v10M${x(since)} ${y}h5" stroke="${C.ink}" stroke-width="1.4" fill="none"/>`;
    for (const m of mine) if (sev(m.kind) !== 'off') o += `<rect x="${x(m.t) - 1.5}" y="${y - 6}" width="3" height="12" fill="${sev(m.kind) === 'red' ? C.red : C.amber}"/>`;
  }); }
o += label(16, SY - 8, 'The week') + label(16, AY, 'Tue 24 Nov') + label(16, HKY + 4, 'Hooks');
writeFileSync(join(HERE, 'history.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>History</title><style>html,body{margin:0;background:${C.bg}}svg{display:block;font-family:"Segoe UI",system-ui,sans-serif;font-variant-numeric:tabular-nums}</style></head><body><svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="History: the week of 18 to 24 November and the sessions of Tuesday 24">${o}</svg></body></html>`);
