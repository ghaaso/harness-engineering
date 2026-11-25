/* History page: the week, then sessions and hooks on one clock with the long quiet stretches folded. */
(function () {
'use strict';
const A = window.App, D = A.D, $ = A.$, $$ = A.$$, esc = A.esc, R = A.R, U = A.U, hue = A.hueOf;
const LW = 248, MODEL = { haiku: '#9db3bf', sonnet: '#6d8796', opus: '#2f3f4b', fable: '#8d4fb8' };
const H = { PW: 0, map: null, wk: null, sel: null, rows: null, drag: false };
const trouble = D.events.filter(e => e.result !== 'passed'), evByKey = {}; trouble.forEach(e => { evByKey[A.markKey(e)] = e; });
const hooks = D.parts.filter(p => p.group === 'Hooks');
const clampWin = (a, b) => {
  const w = Math.min(10080, Math.max(60, b - a)), c = (a + b) / 2; a = c - w / 2; b = c + w / 2;
  if (b > A.T1 + 60) { a -= b - (A.T1 + 60); b = A.T1 + 60; } if (a < 0) { b -= a; a = 0; }
  return [a, b];
};
const glyphId = r => r === 'failed' ? 'm-fail' : r === 'refused' ? 'm-refuse' : 'm-noton';
const glyphCol = r => r === 'failed' ? '#c4281a' : r === 'refused' ? '#c47400' : '#5a626e';
const tickSVG = (e, x, y, sz) => `<use href="#${glyphId(e.result)}" x="${(x - sz / 2).toFixed(1)}" y="${(y - sz / 2).toFixed(1)}" width="${sz}" height="${sz}" color="${glyphCol(e.result)}" data-ev="${esc(A.markKey(e))}" data-part="${e.part}"><title>${esc(((D.partById[e.part] || {}).name || e.part) + ' · ' + A.RES[e.result] + ' · ' + ((D.sessionById[e.session] || {}).tag || '') + ' · ' + A.fmtT(e.t))}</title></use>`;

/* ---- time map with folded quiet stretches ---- */
const makeMap = (a, b, PW) => {
  const FW = 58, folds = A.gaps.filter(g => g.len >= 90 && g.a < b && g.b > a).map(g => ({ a: Math.max(g.a, a), b: Math.min(g.b, b), len: g.len })).filter(f => f.b - f.a >= 90);
  const normal = (b - a) - folds.reduce((s, f) => s + (f.b - f.a), 0), sc = (PW - folds.length * FW) / Math.max(1, normal);
  const pieces = []; let x = 0, cur = a;
  folds.forEach(f => { if (f.a > cur) { pieces.push({ t0: cur, t1: f.a, x0: x, x1: x + (f.a - cur) * sc }); x += (f.a - cur) * sc; } pieces.push({ t0: f.a, t1: f.b, x0: x, x1: x + FW, fold: f }); x += FW; cur = f.b; });
  if (cur < b) pieces.push({ t0: cur, t1: b, x0: x, x1: x + (b - cur) * sc });
  const X = t => { if (t <= a) return 0; for (const p of pieces) if (t <= p.t1) return p.x0 + (t - p.t0) / (p.t1 - p.t0) * (p.x1 - p.x0); return PW; };
  const inv = x => { for (const p of pieces) if (x <= p.x1) return p.t0 + (x - p.x0) / (p.x1 - p.x0) * (p.t1 - p.t0); return b; };
  return { X, inv, pieces, folds, sc };
};

/* ---- the week ---- */
const buildWeek = () => {
  const box = $('#hweek'), Wk = box.clientWidth; if (!Wk) return;
  const x0 = LW, Wp = Wk - LW - 12, rowH = 24, top = 20, hs = 17;
  H.wk = { x0, Wp, rowH, top, Wk };
  const hmax = Math.max(...D.week.days.map(d => Math.max(...d.helpers)), 1);
  let s = `<svg width="${Wk}" height="${top + 7 * rowH + 2}" role="img" aria-label="The week, one strip per day: sessions running, trouble marks and your messages.">`;
  for (let h = 0; h <= 24; h += 3) { const x = x0 + h / 24 * Wp; s += `<line x1="${x}" x2="${x}" y1="17" y2="${top + 7 * rowH}" stroke="#eeebe2"/><text x="${x}" y="13" font-size="11.500" font-weight="600" fill="#5a626e" text-anchor="${h === 0 ? 'start' : h === 24 ? 'end' : 'middle'}">${A.fmtT(h * 60)}</text>`; }
  D.week.days.forEach((d, i) => {
    const y = top + i * rowH, base = y + rowH - 3; let ph = `M${x0} ${base}`, ps = `M${x0} ${base}`;
    for (let k = 0; k < 288; k++) { const xa = x0 + k * Wp / 288, xb = xa + Wp / 288; ph += `L${xa.toFixed(1)} ${(base - d.helpers[k] / hmax * hs).toFixed(1)}L${xb.toFixed(1)} ${(base - d.helpers[k] / hmax * hs).toFixed(1)}`; ps += `L${xa.toFixed(1)} ${(base - d.sessions[k] / 4 * hs).toFixed(1)}L${xb.toFixed(1)} ${(base - d.sessions[k] / 4 * hs).toFixed(1)}`; }
    s += `<line x1="${x0}" x2="${x0 + Wp}" y1="${base}" y2="${base}" stroke="#d6d3c8"/><path d="${ph}L${x0 + Wp} ${base}Z" fill="#dfe5e9"/><path d="${ps}L${x0 + Wp} ${base}Z" fill="#7b8791"/>`;
    for (let k = 0; k < 288; k++) if (d.trouble[k] > 0) s += `<rect x="${(x0 + k * Wp / 288).toFixed(1)}" y="${y + 1}" width="2.200" height="6" fill="#c47400"/>`;
  });
  D.owner.messages.forEach(t => { const d = Math.floor(t / 1440); if (d < 0 || d > 6) return; s += `<circle cx="${(x0 + (t - d * 1440) / 1440 * Wp).toFixed(1)}" cy="${top + d * rowH + rowH - 1.5}" r="1.900" fill="#1c5fd4"/>`; });
  s += `<rect id="wkfut" x="${x0 + Wp}" y="${top + 6 * rowH}" width="0" height="${rowH}" fill="#fff" opacity=".9"/><g id="brush"></g></svg>`;
  box.innerHTML = s + D.week.days.map((d, i) => `<button type="button" class="dayb" data-day="${i}" style="top:${top + i * rowH}px" aria-label="Show ${d.label}">${esc(d.label)}</button>`).join('');
  drawBrush();
};
const drawBrush = () => {
  const g = $('#brush'); if (!g || !H.wk) return; const { x0, Wp, rowH, top } = H.wk; let h = '';
  for (let d = 0; d < 7; d++) { const a = Math.max(U.from, d * 1440), b = Math.min(U.to, d * 1440 + 1440); if (b <= a) continue; const xa = x0 + (a - d * 1440) / 1440 * Wp, xb = x0 + (b - d * 1440) / 1440 * Wp; h += `<rect x="${xa}" y="${top + d * rowH + 1}" width="${Math.max(2, xb - xa)}" height="${rowH - 2}" rx="3" fill="rgba(28,95,212,.08)" stroke="#1c5fd4" stroke-width="2"/>`; }
  g.innerHTML = h; $('#h-span').textContent = A.dur(U.to - U.from);
};

/* ---- lanes and hooks ---- */
const buildLanes = () => {
  const plot = $('#hplot'), PW = plot.clientWidth; if (!PW) return;
  H.PW = PW; const a = U.from, b = U.to, map = H.map = makeMap(a, b, PW), X = map.X;
  const ss = D.sessions.filter(s => (s.end == null ? A.T1 : s.end) > a && s.start < b).sort((p, q) => p.start - q.start), ids = new Set(ss.map(s => s.id)), order = [];
  const walk = (s, d) => { order.push({ s, d }); (A.childrenOf[s.id] || []).filter(i => ids.has(i)).map(i => D.sessionById[i]).sort((p, q) => p.start - q.start).forEach(c => walk(c, d + 1)); };
  ss.filter(s => !s.parent || !ids.has(s.parent)).forEach(s => walk(s, 0));
  let y = 24; const youY = y; y += 22;
  order.forEach(o => {
    const hs = o.s.helpers.filter(h => h.end > a && h.start < b).sort((p, q) => p.start - q.start), ends = []; o.hp = [];
    hs.forEach(h => { let r = ends.findIndex(e => e <= h.start); if (r < 0) { if (ends.length < 4) { r = ends.length; ends.push(0); } else r = 3; } ends[r] = h.end; o.hp.push([h, r]); });
    o.k = ends.length; o.h = 13 + o.k * 2.5 + 4; o.y = y; y += o.h;
  });
  y += 8; const hkLbl = y; y += 20; const hkTop = y; y += hooks.length * 14; const Ht = y + 8;
  H.rows = { order, hkTop, Ht, youY };
  const dayLine = []; let g = '';
  // hour axis, only in unfolded pieces
  const avg = (PW - map.folds.length * 58) / Math.max(1, (b - a) - map.folds.reduce((s, f) => s + f.b - f.a, 0));
  const step = [5, 10, 15, 30, 60, 120, 180, 360, 720, 1440].find(v => v * avg >= 78) || 1440;
  map.pieces.forEach(p => { if (p.fold) return; for (let t = Math.ceil(p.t0 / step) * step; t <= p.t1; t += step) { const x = X(t), mid = t % 1440 === 0; g += `<line x1="${x}" x2="${x}" y1="20" y2="${Ht}" stroke="${mid ? '#9aa0a8' : '#ece9e0'}"/>`; dayLine.push(`<text x="${x + 4}" y="14" font-size="11.500" font-weight="${mid ? 800 : 600}" fill="#454c56">${mid ? A.fmtD(t) + ' ' : ''}${A.fmtT(t)}</text>`); } });
  // folds, and shorter quiet stretches
  map.pieces.forEach(p => { if (!p.fold) return; const lab = A.dur(p.fold.len).split(' '), cx = (p.x0 + p.x1) / 2;
    g += `<rect x="${p.x0}" y="20" width="${p.x1 - p.x0}" height="${Ht - 20}" fill="url(#hatch)"/><rect x="${cx - 26}" y="34" width="52" height="40" rx="6" fill="#fff" stroke="#9aa0a8"/><text x="${cx}" y="50" text-anchor="middle" font-size="12" font-weight="800" fill="#1a1e23"><tspan x="${cx}">${lab.slice(0, 2).join(' ')}</tspan><tspan x="${cx}" dy="15">${lab.slice(2).join(' ') || 'quiet'}</tspan></text>`; });
  A.gaps.filter(q => q.len < 90 && q.len >= 15 && q.b > a && q.a < b).forEach(q => { const xa = X(q.a), xb = X(q.b); dayLine.push(`<path d="M${xa} 5v5h${xb - xa}v-5" fill="none" stroke="#5a626e" stroke-width="1.500"/><text x="${(xa + xb) / 2}" y="3" text-anchor="middle" font-size="11" font-weight="800" fill="#1a1e23" dominant-baseline="hanging" paint-order="stroke" stroke="#fff" stroke-width="4">${A.dur(q.len)}</text>`); });
  // you row
  g += `<line x1="0" x2="${PW}" y1="${youY + 9}" y2="${youY + 9}" stroke="#eeebe2"/>`;
  D.owner.away.filter(q => q.back > a && q.left < b).forEach(q => { const xa = X(Math.max(q.left, a)), xb = X(Math.min(q.back, b)); g += `<rect x="${xa}" y="${youY + 1}" width="${Math.max(0, xb - xa)}" height="16" rx="4" fill="#e7efff"/>`; });
  D.owner.messages.filter(t => t >= a && t <= b).forEach(t => { g += `<circle cx="${X(t).toFixed(1)}" cy="${youY + 9}" r="3.200" fill="#1c5fd4"/>`; });
  // sessions
  order.forEach(o => {
    const s = o.s, col = hue[s.id], cy = o.y + 6, e = s.end == null ? A.T1 : s.end; let t = '';
    t += `<line x1="${X(Math.max(s.start, a))}" x2="${X(Math.min(e, b))}" y1="${cy}" y2="${cy}" stroke="${col}" stroke-opacity=".38" stroke-width="2"/>`;
    s.waits.forEach(w => { if (w[1] > a && w[0] < b) t += `<rect x="${X(w[0])}" y="${cy - 2}" width="${Math.max(2, X(Math.min(w[1], b)) - X(Math.max(w[0], a)))}" height="4" rx="2" fill="#1c5fd4"/>`; });
    s.segs.forEach(sg => { if (sg[1] > a && sg[0] < b) t += `<rect x="${X(Math.max(sg[0], a)).toFixed(1)}" y="${cy - 4.5}" width="${Math.max(2.5, X(Math.min(sg[1], b)) - X(Math.max(sg[0], a))).toFixed(1)}" height="9" rx="2" fill="${col}"/>`; });
    o.hp.forEach(([h, r]) => { t += `<rect x="${X(Math.max(h.start, a)).toFixed(1)}" y="${o.y + 13 + r * 2.5}" width="${Math.max(2, X(Math.min(h.end, b)) - X(Math.max(h.start, a))).toFixed(1)}" height="1.8" fill="${MODEL[h.model] || '#888'}"><title>${esc(h.kind + ' · ' + h.model + ' · ' + A.tok(h.tokens) + ' tokens')}</title></rect>`; });
    g += `<g data-sid="${s.id}"><title>${esc(s.tag + ' · ' + s.name)}</title>${t}</g>`;
    (A.evBySession[s.id] || []).forEach(ev => { if (ev.result !== 'passed' && ev.t >= a && ev.t <= b) g += tickSVG(ev, X(ev.t), cy, 12); });
  });
  // hooks on the same clock
  hooks.forEach((hk, i) => {
    const yy = hkTop + i * 14 + 7, evs = A.evByPart[hk.id] || [], never = !A.hookPasses[hk.id];
    g += `<line x1="0" x2="${PW}" y1="${yy}" y2="${yy}" stroke="${never ? '#9aa0a8' : '#eeebe2'}" ${never ? 'stroke-dasharray="4 4"' : ''}/>`;
    let cur = null; const segs = [];
    evs.forEach(ev => { if (ev.result !== 'passed' || ev.t + 5 < a || ev.t > b) return; if (cur && ev.t <= cur[1] + 6) cur[1] = Math.max(cur[1], ev.t + 5); else { cur = [ev.t, ev.t + 5]; segs.push(cur); } });
    segs.forEach(sg => { g += `<rect x="${X(Math.max(sg[0], a)).toFixed(1)}" y="${yy - 2}" width="${Math.max(2, X(Math.min(sg[1], b)) - X(Math.max(sg[0], a))).toFixed(1)}" height="4" rx="1.500" fill="#b4bdc4"/>`; });
    evs.forEach(ev => { if (ev.result !== 'passed' && ev.t >= a && ev.t <= b) g += tickSVG(ev, X(ev.t), yy, 11); });
  });
  const defs = `<clipPath id="nowclip"><rect id="nowrect" x="0" y="0" width="${PW}" height="${Ht}"/></clipPath>`;
  plot.innerHTML = `<svg width="${PW}" height="${Ht}" viewBox="0 0 ${PW} ${Ht}" role="img" aria-label="Sessions as bars over time with helpers under each, blue where a session waited for you, trouble marks, and one row per hook on the same clock."><defs>${defs}</defs>${dayLine.join('')}<g clip-path="url(#nowclip)">${g}<g id="selg"></g></g></svg><div class="cross" id="cross"><span id="cross-t"></span></div><div class="nowline" id="nowline"><span>Now</span></div>`;
  // labels
  let l = `<h3 class="lbl" style="position:absolute;left:4px;top:${youY + 2}px">You</h3>`;
  order.forEach(o => { l += `<button type="button" class="hl" data-act="open" data-sid="${o.s.id}" data-s0="${o.s.start}" style="top:${o.y}px;padding-left:${4 + Math.min(o.d, 3) * 12}px" title="${esc(o.s.name)}">${A.tagH(o.s.id)}<span class="nm">${esc(o.s.name)}</span><span class="num" style="color:var(--ink3);font-size:11.5px;font-weight:700">${A.tok(o.s.tokensTotal)}</span></button>`; });
  l += `<h3 class="lbl" style="position:absolute;left:4px;top:${hkLbl + 2}px">Hooks</h3>`;
  hooks.forEach((hk, i) => { l += `<button type="button" class="hl hookl" data-act="open-part" data-part="${hk.id}" style="top:${hkTop + i * 14 + 1}px;width:240px" translate="no">${esc(hk.name)}</button>`; });
  $('#hlabels').innerHTML = l; $('#hlabels').style.height = Ht + 'px';
  drawSel(); A.mods.history.tick(R.m);
};
const drawSel = () => {
  const g = $('#selg'); if (!g || !H.map) return; const e = H.sel && evByKey[H.sel];
  if (!e || e.t < U.from || e.t > U.to) { g.innerHTML = ''; return; }
  const x = H.map.X(e.t), r = H.rows; let h = `<line x1="${x}" x2="${x}" y1="20" y2="${r.Ht}" stroke="#1c5fd4" stroke-width="2" opacity=".75"/>`;
  const o = r.order.find(q => q.s.id === e.session); if (o) h += `<circle cx="${x}" cy="${o.y + 6}" r="9" fill="none" stroke="#1c5fd4" stroke-width="2.200"/>`;
  const hi = hooks.findIndex(k => k.id === e.part); if (hi >= 0) h += `<circle cx="${x}" cy="${r.hkTop + hi * 14 + 7}" r="9" fill="none" stroke="#1c5fd4" stroke-width="2.200"/>`;
  g.innerHTML = h;
};
const setWindow = (a, b) => { [U.from, U.to] = clampWin(a, b); buildLanes(); drawBrush(); A.syncUrl(); };
const centre = () => (U.from + U.to) / 2;
const goTrouble = dir => {
  const list = trouble.filter(e => e.t <= R.m), cur = H.sel && evByKey[H.sel], ref = cur ? cur.t : centre();
  const e = dir > 0 ? list.find(x => x.t > ref + 0.01) : list.slice().reverse().find(x => x.t < ref - 0.01);
  if (!e) { A.toast(dir > 0 ? 'No later trouble' : 'No earlier trouble'); return; }
  if (e.t < U.from || e.t > U.to) { const w = U.to - U.from; [U.from, U.to] = clampWin(e.t - w / 2, e.t + w / 2); buildLanes(); drawBrush(); }
  A.openPart(e.part, A.markKey(e));
};

A.mods.history = {
  init() {
    const ctl = (id, fn) => $(id).addEventListener('click', fn), w = () => U.to - U.from;
    ctl('#h-left', () => setWindow(U.from - w() / 2, U.to - w() / 2)); ctl('#h-right', () => setWindow(U.from + w() / 2, U.to + w() / 2));
    ctl('#h-in', () => setWindow(centre() - w() / 4, centre() + w() / 4)); ctl('#h-out', () => setWindow(centre() - w(), centre() + w()));
    ctl('#h-next', () => goTrouble(1)); ctl('#h-prev', () => goTrouble(-1));
    const wk = $('#hweek');
    const brushAt = e => { if (!H.wk) return; const r = wk.getBoundingClientRect(), { x0, Wp, rowH, top } = H.wk; const d = Math.min(6, Math.max(0, Math.floor((e.clientY - r.top - top) / rowH))), mn = d * 1440 + Math.min(1, Math.max(0, (e.clientX - r.left - x0) / Wp)) * 1440; setWindow(mn - w() / 2, mn + w() / 2); };
    wk.addEventListener('pointerdown', e => { if (e.target.closest('.dayb')) return; H.drag = true; wk.setPointerCapture(e.pointerId); brushAt(e); });
    wk.addEventListener('pointermove', e => { if (H.drag) { cancelAnimationFrame(H.raf); H.raf = requestAnimationFrame(() => brushAt(e)); } });
    wk.addEventListener('pointerup', () => { H.drag = false; }); wk.addEventListener('pointercancel', () => { H.drag = false; });
    wk.addEventListener('click', e => { const b = e.target.closest('.dayb'); if (!b) return; const d = +b.dataset.day; setWindow(d * 1440, d === 6 ? 9540 : d * 1440 + 1440); });
    const plot = $('#hplot'); let rect = null;
    plot.addEventListener('pointerenter', () => { rect = plot.getBoundingClientRect(); });
    plot.addEventListener('pointermove', e => { if (!H.map) return; if (!rect) rect = plot.getBoundingClientRect(); const x = e.clientX - rect.left, c = $('#cross'); c.style.transform = `translateX(${x}px)`; c.classList.add('on'); $('#cross-t').textContent = A.fmtT(H.map.inv(x)); });
    plot.addEventListener('pointerleave', () => { const c = $('#cross'); c && c.classList.remove('on'); rect = null; });
    plot.addEventListener('click', e => { const t = e.target.closest('[data-ev]'); if (t) { A.openPart(t.dataset.part, t.dataset.ev); return; } const s = e.target.closest('[data-sid]'); if (s) A.openSession(s.dataset.sid); });
    plot.addEventListener('wheel', e => { if (!(e.ctrlKey || e.metaKey) || !H.map) return; e.preventDefault(); const r = plot.getBoundingClientRect(), t = H.map.inv(e.clientX - r.left), f = Math.exp(e.deltaY * .002); setWindow(t - (t - U.from) * f, t + (U.to - t) * f); }, { passive: false });
    $('#hlabels').addEventListener('dblclick', e => { const b = e.target.closest('[data-part]'); if (b) A.openFile(b.dataset.part); });
    $('#hblock').addEventListener('keydown', e => {
      if (e.target !== $('#hblock')) return;
      if (e.key === 'ArrowLeft') setWindow(U.from - w() / 4, U.to - w() / 4); else if (e.key === 'ArrowRight') setWindow(U.from + w() / 4, U.to + w() / 4);
      else if (e.key === '+' || e.key === '=') setWindow(centre() - w() / 4, centre() + w() / 4); else if (e.key === '-') setWindow(centre() - w(), centre() + w()); else return;
      e.preventDefault();
    });
  },
  show() { requestAnimationFrame(() => { if (U.from == null) return; [U.from, U.to] = clampWin(U.from, U.to); buildWeek(); buildLanes(); }); },
  resize() { if ($('#page-history').hidden) return; buildWeek(); buildLanes(); },
  tick(m) {
    if (!H.map) return;
    const xn = H.map.X(m), inWin = m >= U.from && m <= U.to, r = $('#nowrect'); if (r) r.setAttribute('width', m < U.from ? 0 : m > U.to ? H.PW : xn);
    const nl = $('#nowline'); if (nl) { nl.style.opacity = inWin ? 1 : 0; nl.style.transform = `translateX(${xn - 2}px)`; }
    $$('.hl[data-s0]').forEach(b => { b.style.visibility = +b.dataset.s0 > m ? 'hidden' : 'visible'; });
    const f = $('#wkfut'); if (f && H.wk) { const d = Math.floor(m / 1440); if (d === 6) { const x = H.wk.x0 + (m - 8640) / 1440 * H.wk.Wp; f.setAttribute('x', x); f.setAttribute('width', Math.max(0, H.wk.x0 + H.wk.Wp - x)); } }
  },
  selectEvent(key) { H.sel = key; drawSel(); }
};
})();
