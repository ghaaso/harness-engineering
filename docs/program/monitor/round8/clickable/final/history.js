(() => {
'use strict';
const A = window.APP, D = A.D, { $, $$, esc, hm, dur, tok, ic, clamp, tagOf, toast, showTip, hideTip, showPop, hidePop } = A;
const LAB = 258, RT = 64, LH = 22, HR = 13, NOW = D.replayEnd, FW = 66;
const H = { day: 6, w0: null, w1: null, unfold: new Set(), drag: null };
const root = $('#pageHist');
let mp = null, plotW = 0, hbody = null;
const bv = (t, k) => { const d = Math.floor(t / 1440); if (d < 0 || d > 6) return 0; const a = D.week.days[d][k]; return a ? a[Math.floor((t - d * 1440) / 5)] || 0 : 0; };
const hooks = D.parts.filter(p => p.group === 'Hooks');
const trouble = D.events.map((e, i) => ({ e, i })).filter(o => o.e.result !== 'passed');
const trBy = {}; trouble.forEach(o => (trBy[o.e.session] ||= []).push(o));
const passBy = {}; D.events.forEach((e, i) => { if (e.result === 'passed') (passBy[e.part] ||= []).push(e); });
const problem = {}; trouble.forEach(o => (problem[o.e.part] ||= []).push(o));

function activeRange(d) {
  let a = 0, b = 287; while (a < 288 && !bv(d * 1440 + a * 5, 'sessions') && !bv(d * 1440 + a * 5, 'helpers')) a++; while (b > a && !bv(d * 1440 + b * 5, 'sessions') && !bv(d * 1440 + b * 5, 'helpers')) b--;
  if (a >= b) return [d * 1440, d * 1440 + 1440];
  return [d * 1440 + Math.max(0, a * 5 - 15), Math.min(d * 1440 + 1440, d === 6 ? NOW + 6 : d * 1440 + (b + 1) * 5 + 15)];
}
function idleRuns(w0, w1) {
  const runs = []; let r = null;
  for (let t = Math.floor(w0 / 5) * 5; t < w1; t += 5) {
    const idle = t < NOW && !bv(t, 'sessions') && !bv(t, 'helpers');
    if (idle) { if (!r) r = { t0: Math.max(t, w0), t1: t + 5 }; else r.t1 = t + 5; } else if (r) { runs.push(r); r = null; }
  }
  if (r) runs.push(r);
  return runs.filter(x => x.t1 - x.t0 >= 90).map(x => ({ t0: x.t0, t1: Math.min(x.t1, w1) }));
}
function buildMap(w0, w1, W, runs) {
  const pcs = []; let c = w0;
  runs.forEach(f => { if (f.t0 > c) pcs.push({ a: c, b: f.t0 }); pcs.push({ a: f.t0, b: f.t1, fold: !H.unfold.has(f.t0), run: f }); c = f.t1; });
  if (c < w1) pcs.push({ a: c, b: w1 });
  const nf = pcs.filter(p => p.fold).length, un = pcs.filter(p => !p.fold).reduce((s, p) => s + p.b - p.a, 0), k = (W - nf * FW) / un;
  let acc = 0; pcs.forEach(p => { p.x0 = acc; p.w = p.fold ? FW : (p.b - p.a) * k; acc += p.w; });
  const last = pcs[pcs.length - 1];
  const x = t => { for (const p of pcs) if (t <= p.b || p === last) return p.x0 + p.w * clamp((t - p.a) / (p.b - p.a), 0, 1); return 0; };
  const inv = px => { for (const p of pcs) if (px <= p.x0 + p.w || p === last) return p.a + (p.b - p.a) * clamp((px - p.x0) / p.w, 0, 1); return w1; };
  return { pcs, x, inv };
}

/* tree order of the sessions of the day */
function laneOrder(d) {
  const [a, b] = [d * 1440, d * 1440 + 1440];
  const list = D.sessions.filter(s => s.start < b && (s.end == null || s.end > a)), ids = new Set(list.map(s => s.id));
  const kids = {}; list.forEach(s => { const p = s.parent && ids.has(s.parent) ? s.parent : 'root'; (kids[p] ||= []).push(s); });
  const out = []; const walk = (p, depth) => (kids[p] || []).sort((x, y) => x.start - y.start).forEach(s => { out.push({ s, depth }); walk(s.id, depth + 1); });
  walk('root', 0); return out;
}

/* week strips */
function weekSVG(d, W) {
  let hs = 6; for (let i = 0; i < 288; i++) hs = Math.max(hs, D.week.days[d].helpers[i]);
  const y = (v, mx) => 22 - Math.min(v, mx) / mx * 17, bw = W / 288;
  let aS = `M0 22`, aH = `M0 22`, tr = '', dots = '';
  for (let i = 0; i < 288; i++) {
    const x0 = i * bw, x1 = x0 + bw, s = D.week.days[d].sessions[i], h = D.week.days[d].helpers[i], t = D.week.days[d].trouble[i];
    aS += `L${x0} ${y(s, 4)}L${x1} ${y(s, 4)}`; aH += `L${x0} ${y(h, hs)}L${x1} ${y(h, hs)}`;
    if (t) tr += `<rect x="${x0 - 1}" y="0" width="3" height="${Math.min(10, 4 + t * 2)}" rx="1" fill="var(--trouble)"/>`;
  }
  D.owner.messages.forEach(t => { if (t >= d * 1440 && t < d * 1440 + 1440) dots += `<circle cx="${(t - d * 1440) / 1440 * W}" cy="22.5" r="2.4" fill="var(--you)"/>`; });
  let brush = '';
  if (d === H.day && (H.w1 - H.w0 < 1430)) brush = `<rect x="${(H.w0 - d * 1440) / 1440 * W}" y="1" width="${(H.w1 - H.w0) / 1440 * W}" height="24" rx="3" fill="none" stroke="var(--you)" stroke-width="2"/>`;
  return `<svg width="${W}" height="26" viewBox="0 0 ${W} 26"><path d="${aH}L${W} 22Z" fill="oklch(90% .03 250)"/><path d="${aS}L${W} 22Z" fill="oklch(66% .06 255)"/><line x1="0" x2="${W}" y1="22.5" y2="22.5" stroke="var(--line-2)"/>${tr}${dots}${brush}</svg>`;
}

function glyph(o, x, cy, sz = 9) {
  const col = o.e.result === 'failed' ? 'evf' : 'evr';
  return o.e.result === 'failed' ? `<path class="${col}" data-ei="${o.i}" d="M${x} ${cy - sz / 2 - 1}L${x + sz / 2 + 1} ${cy + sz / 2}H${x - sz / 2 - 1}Z" stroke="#fff" stroke-width="1"/>` : `<path class="${col}" data-ei="${o.i}" d="M${x} ${cy - sz / 2 - 1}L${x + sz / 2 + 1} ${cy}L${x} ${cy + sz / 2 + 1}L${x - sz / 2 - 1} ${cy}Z" stroke="#fff" stroke-width="1"/>`;
}
const helperConc = {};
function laneSVG(s, W, w0, w1) {
  const x = mp.x; let g = '';
  const a = Math.max(s.start, w0), b = Math.min(s.end ?? NOW, w1);
  if (b > a) g += `<line class="open" x1="${x(a)}" x2="${x(b)}" y1="10" y2="10"/>`;
  // helpers running, packed under the bar as one step area
  const key = s.id + '|' + w0 + '|' + w1;
  if (!helperConc[key] && s.helpers && s.helpers.length) {
    const conc = []; for (let t = Math.floor(w0 / 5) * 5; t < w1; t += 5) { let c = 0; s.helpers.forEach(h => { if (h.start <= t + 5 && (h.end ?? NOW) > t) c++; }); conc.push([t, c]); } helperConc[key] = conc;
  }
  const conc = helperConc[key];
  if (conc && conc.some(c => c[1])) { const mx = Math.max(5, ...conc.map(c => c[1])); let p = ''; conc.forEach(([t, c]) => { if (c) p += `M${x(t)} 22h${Math.max(1, x(t + 5) - x(t))}v${-Math.max(2, c / mx * 7)}h${-Math.max(1, x(t + 5) - x(t))}z`; }); g += `<path class="hlp" d="${p}"/>`; }
  (s.waits || []).forEach(([f, t]) => { if (t > w0 && f < w1) g += `<rect class="wait" x="${x(Math.max(f, w0))}" y="6.5" width="${Math.max(2, x(Math.min(t, w1)) - x(Math.max(f, w0)))}" height="7" rx="3.5"/>`; });
  (s.segs || []).forEach(([f, t]) => { if (t > w0 && f < w1) g += `<rect class="turn" x="${x(Math.max(f, w0))}" y="4.5" width="${Math.max(2, x(Math.min(t, w1)) - x(Math.max(f, w0)))}" height="11" rx="2.5"/>`; });
  (s.owner || []).forEach(t => { if (t >= w0 && t <= w1) g += `<circle class="msg" cx="${x(t)}" cy="2.5" r="2.4"/>`; });
  (trBy[s.id] || []).forEach(o => { if (o.e.t >= w0 && o.e.t <= w1) g += glyph(o, x(o.e.t), 10); });
  return `<svg width="${W}" height="${LH}" viewBox="0 0 ${W} ${LH}" data-sid="${s.id}">${g}</svg>`;
}
function hookSVG(p, W, w0, w1) {
  const x = mp.x; let g = '';
  if (!(passBy[p.id] || []).length && !(problem[p.id] || []).length) return `<svg width="${W}" height="${HR}"><line x1="0" x2="${W}" y1="6.5" y2="6.5" stroke="var(--line-3)" stroke-dasharray="3 5"/></svg>`;
  (passBy[p.id] || []).forEach(e => { if (e.t >= w0 && e.t <= w1) g += `<rect class="pass" x="${x(e.t)}" y="4" width="${Math.max(2, x(e.t + 5) - x(e.t))}" height="5" rx="1"/>`; });
  (problem[p.id] || []).forEach(o => { if (o.e.t >= w0 && o.e.t <= w1) g += glyph(o, x(o.e.t), 6.5, 8); });
  return `<svg width="${W}" height="${HR}" viewBox="0 0 ${W} ${HR}" data-hk="${p.id}">${g}</svg>`;
}

function render() {
  const rw = root.clientWidth || 1500; plotW = Math.max(600, rw - 40 - LAB - RT);
  if (H.w0 == null) [H.w0, H.w1] = activeRange(H.day);
  const w0 = H.w0, w1 = H.w1, runs = idleRuns(w0, w1); mp = buildMap(w0, w1, plotW, runs);
  const full = activeRange(H.day), zoomed = (w1 - w0) < (full[1] - full[0]) - 5;
  // week
  let wk = `<div class="hwk" style="--lab:${LAB}px">`;
  for (let d = 0; d < 7; d++) {
    const T = D.week.days[d], tr = T.trouble.reduce((s, v) => s + v, 0);
    const pk = Math.max(...T.sessions), ph = Math.max(...T.helpers);
    wk += `<div class="hrow${d === H.day ? ' on' : ''}" data-day="${d}"><div class="lab">${T.label}<small>${pk ? `peak ${pk} · ${ph} helpers` : 'nothing ran'}</small>${tr ? `<em>${tr}</em>` : ''}</div>${weekSVG(d, plotW)}</div>`;
  }
  wk += '</div>';
  // axis
  const span = w1 - w0, step = span <= 150 ? 15 : span <= 420 ? 30 : 60; let ax = '', chips = '';
  mp.pcs.forEach(p => { if (p.fold) return; for (let t = Math.ceil(p.a / step) * step; t < p.b; t += step) ax += `<span style="left:${mp.x(t)}px">${hm(t)}</span>`; });
  mp.pcs.forEach(p => { if (p.run) { const c = (p.x0 + p.w / 2); chips += `<button class="foldchip${p.fold ? '' : ' open'}" data-fold="${p.run.t0}" style="left:${c}px" aria-label="${p.fold ? 'Unfold' : 'Fold'} the quiet stretch" title="${p.fold ? 'Click to show it at true length' : 'Click to fold it'}">${dur(p.run.t1 - p.run.t0)}${p.fold ? '' : ' ×'}</button>`; } });
  // lanes
  const order = laneOrder(H.day); let lanes = '';
  order.forEach(({ s, depth }) => {
    lanes += `<div class="lane" data-sid="${s.id}"><div class="lab"><span class="ind" style="width:${depth * 14}px">${depth ? `<svg width="${depth * 14}" height="22" style="position:absolute;left:0;top:0"><path d="M${depth * 14 - 6} 0V11H${depth * 14 - 1}" fill="none" stroke="var(--line-3)" stroke-width="1.5"/></svg>` : ''}</span><span class="tag">${esc(s.tag)}</span><span class="nm" title="${esc(s.name)}">${esc(s.name)}</span></div>${laneSVG(s, plotW, w0, w1)}<div class="tk">${tok(s.tokensTotal)}</div></div>`;
  });
  let hk = '';
  hooks.forEach(p => { const off = !(passBy[p.id] || []).length && !(problem[p.id] || []).length; hk += `<div class="hk${off ? ' off' : ''}" data-hook="${p.id}"><div class="lab" title="Double-click to open">${esc(p.name)}</div>${hookSVG(p, plotW, w0, w1)}</div>`; });
  // bands: away from him, folded stretches
  let bands = '';
  D.owner.away.forEach(a => { const lo = Math.max(a.left, w0), hi = Math.min(a.back, w1); if (hi > lo) { const x0 = mp.x(lo), w = mp.x(hi) - x0; bands += `<rect x="${x0}" width="${w}" y="0" height="100%" fill="var(--you-tint)" opacity=".8"/>` + (w > 96 ? `<text x="${x0 + 6}" y="${order.length * LH + 10}" style="fill:var(--you);font-weight:700">you away ${dur(a.minutes)}</text>` : ''); } });
  mp.pcs.forEach(p => { if (p.fold) bands += `<rect x="${p.x0}" width="${p.w}" y="0" height="100%" fill="url(#hatch)"/>`; });
  const day = D.week.days[H.day].label;
  root.innerHTML = wk + `<div class="hday" style="--lab:${LAB}px"><div class="hhead"><h2>${day}</h2><span class="win">${hm(w0)} to ${w1 >= NOW && H.day === 6 ? hm(NOW) + ' now' : hm(w1)}</span>
    <button class="ibtn" id="hOut" aria-label="Zoom out">${ic('minus')}</button><button class="ibtn" id="hIn" aria-label="Zoom in">${ic('plus')}</button><button class="ibtn" id="hFit" aria-label="Whole day">${ic('fit')}</button><span class="tnav"><button class="btn s" id="hPrev">‹ Previous trouble</button><button class="btn s" id="hNext">Next trouble ›</button></span></div>
    <div class="haxis">${ax}${chips}</div>
    <div class="hbody" id="hbody"><svg class="bands" style="left:${LAB}px;width:${plotW}px">${bands}</svg>${lanes}<div class="hsep"></div>${hk}<div class="xh" hidden><b></b></div></div></div>`;
  $$('.ibtn', root).forEach(b => b.style.cssText = 'background:var(--surface);color:var(--ink);box-shadow:0 0 0 1px var(--line-2)');
  hbody = $('#hbody');
}

/* interactions */
function tAtPointer(e) { const r = hbody.getBoundingClientRect(); return mp.inv(e.clientX - r.left - LAB); }
function eventTip(i) { const e = D.events[i], p = D.partById[e.part]; return `<div class="t"><b>${esc(p.name)}</b> ${e.result}</div><div>${esc(tagOf(e.session))} · ${hm(e.t)}</div>`; }
root.addEventListener('mousemove', e => {
  if (!hbody) return; const xh = $('.xh', hbody); const r = hbody.getBoundingClientRect(), px = e.clientX - r.left - LAB;
  $$('.hk.hl', root).forEach(x => x.classList.remove('hl'));
  const ev = e.target.closest('[data-ei]');
  if (px >= 0 && px <= plotW && !H.drag) { xh.hidden = false; xh.style.left = (LAB + px) + 'px'; $('b', xh).textContent = hm(mp.inv(px)); } else xh.hidden = true;
  if (ev) { const i = +ev.dataset.ei, ee = D.events[i]; $('.hk[data-hook="' + ee.part + '"]', root)?.classList.add('hl'); showTip(`<b>${esc(D.partById[ee.part].name)}</b> ${ee.result}<div class="sm">${esc(tagOf(ee.session))} · ${hm(ee.t)}</div>`, e.clientX, e.clientY); }
  else {
    const ln = e.target.closest('.lane'); const rowDay = e.target.closest('.hrow');
    if (ln && px >= 0) { const s = D.sessionById[ln.dataset.sid], t = mp.inv(px), inWait = (s.waits || []).some(w => t >= w[0] && t <= w[1]), inTurn = (s.segs || []).some(w => t >= w[0] && t <= w[1]); showTip(`<b>${esc(s.tag)}</b> ${esc(s.name)}<div class="sm">${hm(t)} · ${inWait ? 'waiting for you' : inTurn ? 'working' : 'open, idle'}</div>`, e.clientX, e.clientY); }
    else if (rowDay) { const d = +rowDay.dataset.day; showTip(`<b>${D.week.days[d].label}</b><div class="sm">Click to open the day</div>`, e.clientX, e.clientY); }
    else hideTip();
  }
});
root.addEventListener('mouseleave', () => { hideTip(); const xh = $('.xh', root); if (xh) xh.hidden = true; });
root.addEventListener('click', e => {
  const fold = e.target.closest('[data-fold]'); if (fold) { const t = +fold.dataset.fold; H.unfold.has(t) ? H.unfold.delete(t) : H.unfold.add(t); render(); return; }
  const ev = e.target.closest('[data-ei]');
  if (ev) { const ee = D.events[+ev.dataset.ei]; hideTip(); showPop(`<div class="t"><span class="${ee.result === 'failed' ? 'f' : 'r'}">${ic(ee.result === 'failed' ? 'tri' : 'dia')}</span> ${esc(D.partById[ee.part].name)} ${ee.result}</div><div class="row"><span class="tag">${esc(tagOf(ee.session))}</span>${hm(ee.t)}</div><div class="acts"><button class="btn s" data-act="session" data-id="${ee.session}">${ic('open')}Open ${esc(tagOf(ee.session))}</button><button class="btn s" data-act="part" data-id="${ee.part}">${ic('open')}Open part</button></div>`, e.clientX, e.clientY); return; }
  const day = e.target.closest('[data-day]'); if (day) { H.day = +day.dataset.day; H.w0 = H.w1 = null; H.unfold.clear(); render(); return; }
  const ln = e.target.closest('.lane'); if (ln) { A.openSession(ln.dataset.sid); return; }
  if (e.target.id === 'hFit' || e.target.closest('#hFit')) { H.w0 = H.w1 = null; render(); }
  if (e.target.closest('#hPrev') || e.target.closest('#hNext')) { goTrouble(e.target.closest('#hNext') ? 1 : -1); return; }
  if (e.target.closest('#hIn')) zoom(.6, .5); if (e.target.closest('#hOut')) zoom(1.6, .5);
});
root.addEventListener('dblclick', e => { const hk = e.target.closest('[data-hook]'); if (hk && e.target.closest('.lab')) { A.openPart(hk.dataset.hook); return; } if (e.target.closest('svg') && !e.target.closest('[data-ei]') && !e.target.closest('[data-day]')) { H.w0 = H.w1 = null; render(); } });
function goTrouble(dir) {
  const list = trouble.filter(o => Math.floor(o.e.t / 1440) === H.day && o.e.t <= NOW).sort((p, q) => p.e.t - q.e.t); if (!list.length) { toast('No trouble on this day'); return; }
  const c = H.ti != null ? list.findIndex(o => o.i === H.ti) : -1;
  const k = c < 0 ? (dir > 0 ? 0 : list.length - 1) : clamp(c + dir, 0, list.length - 1); if (k === c) { toast(dir > 0 ? 'That was the last trouble of the day' : 'That was the first trouble of the day', 1600); return; }
  const o = list[k]; H.ti = o.i; const full = activeRange(H.day); const ns = 90; H.w0 = clamp(o.e.t - ns / 2, full[0], full[1] - ns); H.w1 = H.w0 + ns; render();
  const el = root.querySelector('[data-ei="' + o.i + '"]'); if (el) { const r = el.getBoundingClientRect(); el.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: r.x + r.width / 2, clientY: r.y + r.height / 2 })); }
}
function zoom(f, frac) {
  const full = activeRange(H.day), span = H.w1 - H.w0, ns = clamp(span * f, 30, full[1] - full[0]), c = H.w0 + span * frac;
  H.w0 = clamp(c - ns * frac, full[0], full[1] - ns); H.w1 = H.w0 + ns; render();
}
root.addEventListener('wheel', e => { if (!hbody || !e.target.closest('#hbody')) return; e.preventDefault(); const r = hbody.getBoundingClientRect(); zoom(Math.exp(e.deltaY * .0014), clamp((e.clientX - r.left - LAB) / plotW, 0, 1)); }, { passive: false });
root.addEventListener('pointerdown', e => { if (!e.target.closest('.lane svg,.hk svg') || e.target.closest('[data-ei]')) return; H.drag = { x: e.clientX, w0: H.w0, w1: H.w1, moved: false }; });
window.addEventListener('pointermove', e => {
  const d = H.drag; if (!d) return; const dx = e.clientX - d.x; if (Math.abs(dx) > 5) d.moved = true; if (!d.moved) return;
  const full = activeRange(H.day), span = d.w1 - d.w0, dm = -dx / plotW * span; const w0 = clamp(d.w0 + dm, full[0], full[1] - span);
  H.w0 = w0; H.w1 = w0 + span; render(); hideTip();
});
window.addEventListener('pointerup', () => { if (H.drag && H.drag.moved) { const sup = ev => { ev.stopPropagation(); }; window.addEventListener('click', sup, { capture: true, once: true }); } H.drag = null; });
window.addEventListener('resize', () => { if (A.S.page === 'history') render(); });

A.history = { render };
})();
