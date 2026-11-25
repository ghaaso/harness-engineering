/* Now page: sessions rail, last-three-hours river, parts canvas. */
(function () {
'use strict';
const A = window.App, D = A.D, $ = A.$, $$ = A.$$, esc = A.esc, R = A.R, U = A.U;
const hue = A.hueOf;
const mk = (c, n, tag) => `<span class="mk mk-${c}">${A.glyph(c)}${tag ? `<span translate="no">${esc(tag)}</span>` : ''}${n > 1 ? '×' + n : ''}</span>`;
let focusId = null, railHover = false;

/* ============ rail ============ */
const cardsEl = () => $('#cards'), sigs = {};
const RANK = { waiting: 0, working: 1, quiet: 2, ended: 3 };
const spark = s => {
  const raw = D.sessionById[s.id]; if (!raw) return '';
  const pts = raw.tokens.filter(p => p[0] <= R.m).slice(-9); if (pts.length < 2) return '';
  const d = []; for (let i = 1; i < pts.length; i++) d.push(Math.max(0, pts[i][1] - pts[i - 1][1]));
  const mx = Math.max(...d, 1);
  return `<svg class="spark" viewBox="0 0 56 18" aria-hidden="true">${d.map((v, i) => { const h = Math.max(1.5, v / mx * 16); return `<rect x="${i * 7}" y="${18 - h}" width="5" height="${h}" rx="1" fill="${hue[s.id]}" opacity=".75"/>`; }).join('')}</svg>`;
};
const cardHTML = (s, marks) => {
  const run = s.helpersRunning || [], byK = {};
  run.forEach(h => { const k = byK[h.kind] = byK[h.kind] || { n: 0, m: h.model }; k.n++; });
  const pills = Object.keys(byK).map(k => `<span class="pill" data-m="${byK[k].m}"><i></i><span translate="no">${esc(k)}</span>${byK[k].n > 1 ? ' ×' + byK[k].n : ''}</span>`).join('');
  const mine = marks.filter(m => m.session === s.id), c = {}; mine.forEach(m => { c[m.result] = (c[m.result] || 0) + 1; });
  const mks = ['failed', 'refused', 'not-on'].filter(r => c[r]).map(r => mk(r, c[r])).join('');
  const raw = D.sessionById[s.id];
  let r2;
  if (s.state === 'ended') r2 = s.stopped ? 'Stopped by you' : `Ended ${A.fmtT(raw ? raw.end : R.m)}`;
  else if (s.user) r2 = 'Starting from your prompt…';
  else r2 = s.stepCount ? `Step ${s.stepIndex} of ${s.stepCount} · ${esc(s.step)}` : esc(s.step || '');
  const from = raw && raw.parent && D.sessionById[raw.parent] ? `<span class="pill" title="Started by ${esc(D.sessionById[raw.parent].tag)}">from ${A.tagH(raw.parent)}</span>` : '';
  const tk = s.user || !s.tokens ? '' : `<span class="tk num">${A.tok(s.tokens)}</span>`;
  const head = `<button type="button" class="card-open" data-act="open" data-sid="${s.id}">
    <span class="r1">${A.tagH(s.id)}<span class="nm" title="${esc(s.name)}">${esc(s.name)}</span>${tk}</span>
    <span class="r2">${r2}</span>
    ${s.state === 'waiting' ? `<span class="r3">${A.stateHTML(s)}${mks}</span>` : `<span class="r3">${A.stateHTML(s)}${pills}${mks}${s.state === 'ended' ? '' : spark(s)}${from}</span>`}
  </button>`;
  return head + A.actionsHTML(s, 'rail');
};
const renderRail = (list, marks) => {
  const ul = cardsEl(), want = list.slice().sort((a, b) => (RANK[a.state] - RANK[b.state]) || ((b.user ? 1 : 0) - (a.user ? 1 : 0)));
  const keep = new Set();
  want.forEach(s => {
    keep.add(s.id);
    let li = ul.querySelector(`[data-sid-li="${s.id}"]`);
    if (!li) { li = document.createElement('li'); li.className = 'card'; li.dataset.sidLi = s.id; li.style.setProperty('--h', hue[s.id] || '#555'); ul.appendChild(li); }
    const mine = marks.filter(m => m.session === s.id);
    const run = (s.helpersRunning || []).map(h => h.kind).sort().join();
    const sig = [s.state, s.step, s.stepIndex, run, s.helpersDone, Math.floor((s.tokens || 0) / 200000), mine.map(m => m.result).join(), A.ui.confirm === s.id, A.ui.answering === s.id, focusId === s.id,
      s.state === 'waiting' ? Math.floor(R.m - s.since) : '', !!(A.OV[s.id])].join('|');
    if (sigs[s.id] === sig) return; sigs[s.id] = sig;
    const act = document.activeElement, had = li.contains(act), key = had && act.dataset ? (act.dataset.act || 'ta') + (act.dataset.sid || '') : null;
    li.dataset.state = s.state; li.classList.toggle('sel', focusId === s.id);
    li.innerHTML = cardHTML(s, marks);
    if (key) { const el = $$('[data-act],textarea', li).find(e => ((e.dataset.act || 'ta') + (e.dataset.sid || '')) === key); if (el) el.focus({ preventScroll: true }); }
  });
  $$('.card', ul).forEach(li => { if (!keep.has(li.dataset.sidLi)) { li.remove(); delete sigs[li.dataset.sidLi]; } });
  const order = want.map(s => s.id), cur = $$('.card', ul).map(li => li.dataset.sidLi);
  if (order.join() !== cur.join() && !railHover && !ul.contains(document.activeElement)) order.forEach(id => ul.appendChild(ul.querySelector(`[data-sid-li="${id}"]`)));
};
const trouble = D.events.filter(e => e.result !== 'passed');
let sinceSig = '';
const renderSince = st => {
  const last = st.lastOwnerMessage, el = $('#since');
  if (last == null) { el.innerHTML = ''; sinceSig = ''; return; }
  const m = R.m;
  const started = D.sessions.filter(s => s.start > last && s.start <= m).length;
  const ended = D.sessions.filter(s => s.end != null && s.end > last && s.end <= m).length;
  let ref = 0, fail = 0; trouble.forEach(e => { if (e.t > last && e.t <= m) { if (e.result === 'refused') ref++; else if (e.result === 'failed') fail++; } });
  const sig = [Math.round(last), started, ended, ref, fail].join();
  if (sig === sinceSig) return; sinceSig = sig;
  const c = (n, label, extra) => `<span class="sc ${n ? '' : 'z'}">${extra || ''}<b class="num">${n}</b>${label}</span>`;
  el.innerHTML = `<span class="sc lead">Since <b class="num">${A.fmtT(last)}</b></span>${c(started, 'Started')}${c(ended, 'Finished')}${c(ref, 'Refused', A.glyph('refused'))}${c(fail, 'Failed', A.glyph('failed'))}`;
};

/* ============ river (last three hours) ============ */
const RS = A.T0 - 190, RV = { W: 0, pxm: 1, lanes: [], laneOf: {}, top: 54, lh: 15 };
const buildRiver = () => {
  const view = $('#rv-view'); const W = view.clientWidth; if (!W) return false;
  RV.W = W; const pxm = RV.pxm = W / 180; const X = t => (t - RS) * pxm;
  // lanes: pack the sessions of the day by their lifespan
  const ss = D.sessions.filter(s => (s.end == null ? A.T1 : s.end) > RS).sort((a, b) => a.start - b.start), ends = []; RV.laneOf = {};
  ss.forEach(s => { let l = ends.findIndex(e => e <= s.start); if (l < 0) { l = ends.length; ends.push(0); } ends[l] = s.end == null ? A.T1 : s.end; RV.laneOf[s.id] = l; });
  RV.lanes = ends.length; const lh = RV.lh, top = RV.top, H = top + RV.lanes * lh + 20;
  const totalW = X(A.T1 + 30);
  let g = '';
  // quiet stretches
  A.gaps.filter(q => q.b > RS).forEach(q => { const x0 = X(Math.max(q.a, RS)), x1 = X(q.b), w = x1 - x0; g += `<rect x="${x0}" y="22" width="${w}" height="${H - 42}" fill="url(#hatch)" opacity=".85"/>`; if (w > 170) g += `<text x="${x0 + w / 2}" y="${22 + (H - 42) / 2 + 5}" text-anchor="middle" font-size="14" font-weight="700" fill="#454c56" paint-order="stroke" stroke="#f1efe7" stroke-width="5">Nothing ran · ${A.dur(q.len)}</text>`; });
  // you row: away bands and messages
  D.owner.away.filter(a => a.back > RS).forEach(a => { const x0 = X(Math.max(a.left, RS)), x1 = X(a.back); g += `<rect x="${x0}" y="2" width="${x1 - x0}" height="17" rx="4" fill="#e7efff"/>`; if (x1 - x0 > 120) g += `<text x="${x0 + 8}" y="14.500" font-size="11.500" font-weight="700" fill="#154aa8">Away ${A.dur(a.minutes)}</text>`; });
  D.owner.messages.filter(t => t > RS).forEach(t => { g += `<circle cx="${X(t)}" cy="10.500" r="3.200" fill="#1c5fd4"/>`; });
  // helpers area
  const n = Math.ceil(A.T1 - RS) + 2, diff = new Int16Array(n + 2);
  D.sessions.forEach(s => s.helpers.forEach(h => { const a = Math.max(0, Math.floor(h.start - RS)), b = Math.min(n, Math.ceil((h.end == null ? A.T1 : h.end) - RS)); if (b > 0 && a < n) { diff[a]++; diff[b]--; } }));
  let c = 0, mx = 1; const cnt = []; for (let i = 0; i < n; i++) { c += diff[i]; cnt.push(c); if (c > mx) mx = c; }
  mx = Math.max(mx, 6); const hb = 50, hh = 26; let path = `M0 ${hb}`;
  for (let i = 0; i < n; i += 2) { const y = hb - cnt[i] / mx * hh; path += `L${i * pxm} ${y.toFixed(1)}`; }
  path += `L${n * pxm} ${hb}Z`;
  g += `<path d="${path}" fill="#c9d3da"/><line x1="0" x2="${totalW}" y1="${hb}" y2="${hb}" stroke="#b9c3ca"/>`;
  // hour grid
  for (let t = Math.ceil(RS / 60) * 60; t <= A.T1 + 30; t += 60) { const x = X(t), mid = t % 1440 === 0; g += `<line x1="${x}" x2="${x}" y1="20" y2="${top + RV.lanes * lh}" stroke="${mid ? '#9aa0a8' : '#e8e5dc'}"/><text x="${x + 4}" y="${H - 5}" font-size="11.500" font-weight="${mid ? 800 : 600}" fill="#5a626e">${mid ? A.fmtD(t) + ' ' : ''}${A.fmtT(t)}</text>`; }
  // sessions
  ss.forEach(s => {
    const y = top + RV.laneOf[s.id] * lh + lh / 2, col = hue[s.id], e = s.end == null ? A.T1 : s.end;
    let b = `<line x1="${X(Math.max(s.start, RS))}" x2="${X(e)}" y1="${y}" y2="${y}" stroke="${col}" stroke-opacity=".38" stroke-width="2"/>`;
    s.waits.forEach(w => { b += `<rect x="${X(w[0])}" y="${y - 2.5}" width="${Math.max(2, X(w[1]) - X(w[0]))}" height="5" rx="2.500" fill="#1c5fd4"/>`; });
    s.segs.forEach(sg => { b += `<rect x="${X(sg[0])}" y="${y - 4.500}" width="${Math.max(2.5, X(sg[1]) - X(sg[0]))}" height="9" rx="2" fill="${col}"/>`; });
    if (s.start >= RS) b += `<circle cx="${X(s.start)}" cy="${y}" r="3.800" fill="#fff" stroke="${col}" stroke-width="2"/><text x="${X(s.start) - 7}" y="${y + 4}" text-anchor="end" font-size="11" font-weight="800" fill="${col}" translate="no">${esc(s.tag)}</text>`;
    g += `<g data-sid="${s.id}"><title>${esc(s.tag + ' · ' + s.name)}</title>${b}</g>`;
  });
  // trouble ticks
  trouble.forEach(e => { if (e.t < RS || !(e.session in RV.laneOf)) return; const y = top + RV.laneOf[e.session] * lh + lh / 2, x = X(e.t), id = e.result === 'failed' ? 'm-fail' : e.result === 'refused' ? 'm-refuse' : 'm-noton', col = e.result === 'failed' ? '#c4281a' : e.result === 'refused' ? '#c47400' : '#5a626e';
    g += `<use href="#${id}" x="${x - 6}" y="${y - 6}" width="12" height="12" color="${col}" data-ev="${esc(A.markKey(e))}" data-part="${e.part}"><title>${esc(((D.partById[e.part] || {}).name || e.part) + ' · ' + A.RES[e.result] + ' · ' + (D.sessionById[e.session] || {}).tag + ' · ' + A.fmtT(e.t))}</title></use>`; });
  $('#rv-layer').innerHTML = `<svg width="${totalW}" height="${H}" viewBox="0 0 ${totalW} ${H}" role="img" aria-label="Timeline of the last three hours: his messages, helpers running, and each session's turns, waits and trouble marks.">${g}</svg>`;
  $('#rv-view').style.setProperty('--rvh', H + 'px'); $('#rv-gutter').style.height = H + 'px';
  let gl = `<span class="gl" style="top:2px">You</span><span class="gl" style="top:${hb - 22}px">Helpers <b id="g-hc" class="num" style="color:var(--ink)">0</b></span>`;
  for (let l = 0; l < RV.lanes; l++) gl += `<button type="button" class="lane-chip" data-lane="${l}" style="top:${top + l * lh + 0}px" hidden></button>`;
  $('#rv-gutter').innerHTML = gl; RV.cnt = cnt; RV.H = H;
  return true;
};
const slide = m => { const l = $('#rv-layer'); if (l) l.style.transform = `translate3d(${(RV.W - (m - RS) * RV.pxm).toFixed(1)}px,0,0)`; };
const riverTick = (st, list) => {
  slide(R.m);
  const hc = RV.cnt ? RV.cnt[Math.min(RV.cnt.length - 1, Math.max(0, Math.round(R.m - RS)))] : 0; const e = $('#g-hc'); if (e && e.textContent != hc) e.textContent = hc;
  $$('.lane-chip').forEach(b => {
    const l = +b.dataset.lane; let hit = null;
    for (const s of list) if (!s.user && RV.laneOf[s.id] === l && s.state !== 'ended') { hit = s; break; }
    if (!hit) { b.hidden = true; return; }
    b.hidden = false; b.dataset.state = hit.state; b.dataset.sid = hit.id; b.dataset.act = 'open'; b.style.setProperty('--h', hue[hit.id]); b.textContent = hit.tag; b.setAttribute('aria-label', 'Open session ' + hit.tag);
  });
};

/* ============ board ============ */
const ZONES = [
  [['Hooks', ['Hooks'], 5, 'hooks'], ['Documents', ['Documents'], 6]],
  [['Helper Kinds', ['Helper kinds'], 4], ['Scripts', ['Scripts'], 4], ['Commands', ['Commands'], 2]],
  [['Skills', ['Skills', 'Slash commands'], 4], ['Stores and Settings', ['Stores and settings'], 4], ['Tests and Git', ['Tests and git'], 3]]
];
const tiles = {};
const buildBoard = () => {
  $('#board').innerHTML = ZONES.map(row => `<div class="brow">${row.map(([title, groups, cols, cls]) => {
    const parts = D.parts.filter(p => groups.includes(p.group));
    return `<section class="zone ${cls || ''}" aria-label="${title}"><h3 class="zt">${title} <span class="zc num">${parts.length}</span></h3><div class="zgrid" style="--cols:${cols}">${parts.map(p => `<button type="button" class="tile ${p.id.startsWith('hook:') && !A.hookPasses[p.id] ? 'never' : ''}" data-act="open-part" data-part="${p.id}" ${p.model ? `data-m="${p.model}"` : ''} title="${esc(p.file)}" translate="no"><span class="top1"><svg class="ic" aria-hidden="true"><use href="#${A.iconOf(p)}"/></svg><span class="nm">${esc(p.name)}</span></span>${p.model ? `<span class="md"><i></i>${p.model}</span>` : ''}<span class="chips"></span></button>`).join('')}</div></section>`;
  }).join('')}</div>`).join('');
  $$('.tile').forEach(t => { tiles[t.dataset.part] = { el: t, chips: t.querySelector('.chips'), sig: '', users: 0 }; });
};
const partTick = (st, list, marks) => {
  const byPart = {}; marks.forEach(m => { (byPart[m.part] = byPart[m.part] || []).push(m); });
  const fs = focusId ? A.eff[focusId] : null, rel = fs && !fs.user ? new Set([].concat(fs.parts || [], fs.hooks || [])) : null;
  const live = new Set(list.filter(s => s.state === 'working').map(s => s.id));
  Object.keys(tiles).forEach(id => {
    const T = tiles[id], p = D.partById[id];
    const users = (st.partUse[id] || st.hookUse[id] || []).filter(u => live.has(u) || (A.eff[u] && A.eff[u].state === 'waiting'));
    const ms = byPart[id] || [], c = {}; ms.forEach(m => { c[m.result] = c[m.result] || {}; c[m.result][m.session] = (c[m.result][m.session] || 0) + 1; });
    const dim = rel && !rel.has(id) && !(U.p === id);
    const sig = [users.join(), JSON.stringify(c), dim, U.p === id].join('|');
    if (sig === T.sig) return; T.sig = sig;
    const el = T.el, bad = !!c.failed, warn = !!c.refused, first = users[0] || (ms[0] && ms[0].session);
    el.classList.toggle('use', users.length > 0); el.classList.toggle('bad', bad); el.classList.toggle('warn', warn && !bad); el.classList.toggle('dim', !!dim); el.classList.toggle('sel', U.p === id);
    if (first) el.style.setProperty('--uh', hue[first]); else el.style.removeProperty('--uh');
    let h = users.slice(0, 3).map(u => `<span class="tdot" style="--h:${hue[u]}" translate="no">${esc((A.eff[u] || D.sessionById[u] || {}).tag || '')}</span>`).join('') + (users.length > 3 ? `<span class="tdot" style="--h:#555">+${users.length - 3}</span>` : '');
    const mchips = []; ['failed', 'refused', 'not-on'].forEach(r => { if (c[r]) Object.keys(c[r]).forEach(sid => mchips.push(mk(r, c[r][sid], (D.sessionById[sid] || {}).tag))); });
    h += mchips.slice(0, 2).join('') + (mchips.length > 2 ? `<span class="mk mk-not-on">+${mchips.length - 2}</span>` : '');
    T.chips.innerHTML = h;
    el.setAttribute('aria-label', `${p.name}. ${p.group}.${users.length ? ' In use by ' + users.map(u => (A.eff[u] || {}).tag).join(', ') + '.' : ''}${c.failed ? ' Failed.' : ''}${c.refused ? ' Refused.' : ''}`);
    if (users.length > T.users) { el.classList.remove('pulse'); requestAnimationFrame(() => requestAnimationFrame(() => { el.classList.add('pulse'); setTimeout(() => el.classList.remove('pulse'), 1200); })); }
    T.users = users.length;
  });
};

/* ---- canvas pan and zoom ---- */
const V = { k: 1, x: 0, y: 0, user: false };
const applyV = () => { $('#board').style.transform = `translate3d(${V.x}px,${V.y}px,0) scale(${V.k})`; $('#z-val').textContent = Math.round(V.k * 100) + '%'; };
const fit = () => {
  const vp = $('#vp'), b = $('#board'), vw = vp.clientWidth, vh = vp.clientHeight, bw = b.offsetWidth, bh = b.offsetHeight; if (!vw || !bw) return;
  V.k = Math.min(vw / bw, vh / bh, 1.3); V.x = (vw - bw * V.k) / 2; V.y = Math.max(0, (vh - bh * V.k) / 2); V.user = false; applyV();
};
const zoomAt = (cx, cy, f) => { const k = Math.min(3, Math.max(.35, V.k * f)); V.x = cx - (cx - V.x) * k / V.k; V.y = cy - (cy - V.y) * k / V.k; V.k = k; V.user = true; applyV(); };
const initCanvas = () => {
  const vp = $('#vp'); let drag = null;
  const mid = () => ({ x: vp.clientWidth / 2, y: vp.clientHeight / 2 });
  $('#z-in').addEventListener('click', () => { const c = mid(); zoomAt(c.x, c.y, 1.2); });
  $('#z-out').addEventListener('click', () => { const c = mid(); zoomAt(c.x, c.y, 1 / 1.2); });
  $('#z-fit').addEventListener('click', fit);
  vp.addEventListener('wheel', e => { e.preventDefault(); if (e.ctrlKey || e.metaKey) { const r = vp.getBoundingClientRect(); zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * .01)); } else { V.x -= e.deltaX; V.y -= e.deltaY; V.user = true; applyV(); } }, { passive: false });
  vp.addEventListener('pointerdown', e => { if (e.button) return; drag = { x: e.clientX, y: e.clientY, vx: V.x, vy: V.y, on: false, id: e.pointerId }; });
  vp.addEventListener('pointermove', e => { if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (!drag.on && Math.hypot(dx, dy) > 5) { drag.on = true; vp.classList.add('drag'); $('#board').inert = true; vp.setPointerCapture(drag.id); } if (drag.on) { V.x = drag.vx + dx; V.y = drag.vy + dy; V.user = true; applyV(); } });
  const end = () => { if (drag && drag.on) { vp.classList.remove('drag'); $('#board').inert = false; } drag = null; };
  vp.addEventListener('pointerup', end); vp.addEventListener('pointercancel', end);
  vp.addEventListener('keydown', e => {
    if (e.target !== vp) { if ((e.key === 'o' || e.key === 'O') && e.target.dataset && e.target.dataset.part) { e.preventDefault(); A.openFile(e.target.dataset.part); } return; }
    const s = 60, c = mid();
    if (e.key === 'ArrowLeft') V.x += s; else if (e.key === 'ArrowRight') V.x -= s; else if (e.key === 'ArrowUp') V.y += s; else if (e.key === 'ArrowDown') V.y -= s;
    else if (e.key === '+' || e.key === '=') zoomAt(c.x, c.y, 1.2); else if (e.key === '-') zoomAt(c.x, c.y, 1 / 1.2); else if (e.key === '0') { fit(); return; } else return;
    e.preventDefault(); V.user = true; applyV();
  });
  $('#board').addEventListener('dblclick', e => { const t = e.target.closest('.tile'); if (t) A.openFile(t.dataset.part); });
};

/* ============ module ============ */
A.mods.now = {
  init() {
    buildBoard(); initCanvas();
    const rail = $('.rail'); rail.addEventListener('pointerenter', () => { railHover = true; }); rail.addEventListener('pointerleave', () => { railHover = false; });
    $('#rv-layer').addEventListener('click', e => { const t = e.target.closest('[data-ev]'); if (t) { A.openPart(t.dataset.part, t.dataset.ev); return; } const s = e.target.closest('[data-sid]'); if (s) A.openSession(s.dataset.sid); });
  },
  show() { requestAnimationFrame(() => { if (!RV.W || RV.W !== $('#rv-view').clientWidth) buildRiver(); if (!V.user) fit(); }); },
  resize() { if ($('#page-now').hidden) return; buildRiver(); if (!V.user) fit(); },
  frame(m) { if (!A.reduced()) slide(m); },
  tick(st, list, marks) {
    renderRail(list, marks); renderSince(st);
    if (!$('#page-now').hidden) { if (!RV.cnt) buildRiver(); riverTick(st, list); partTick(st, list, marks); }
  },
  focusSession(id) { focusId = id; Object.keys(sigs).forEach(k => delete sigs[k]); Object.values(tiles).forEach(t => { t.sig = ''; }); },
  flash(id) { const T = tiles[id]; if (!T) return; T.el.classList.remove('flash'); requestAnimationFrame(() => requestAnimationFrame(() => { T.el.classList.add('flash'); setTimeout(() => T.el.classList.remove('flash'), 1000); })); }
};
})();
