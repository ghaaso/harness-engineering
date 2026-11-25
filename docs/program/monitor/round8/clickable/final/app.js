(() => {
'use strict';
const D = window.TOOL_DATA;
const $ = (s, e = document) => e.querySelector(s);
const $$ = (s, e = document) => Array.from(e.querySelectorAll(s));
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const hm = m => D.hm(m);
const dur = n => { n = Math.round(n); if (n < 60) return n + ' min'; const h = Math.floor(n / 60), r = n % 60; return r ? `${h} h ${r} min` : `${h} h`; };
const tok = n => n >= 1e7 ? Math.round(n / 1e6) + ' M' : n >= 1e6 ? (n / 1e6).toFixed(1) + ' M' : n >= 1e3 ? Math.round(n / 1e3) + ' k' : String(Math.round(n));
const ic = (n, c = '') => `<svg class="ic ${c}" aria-hidden="true"><use href="#i-${n}"/></svg>`;
const q = new URLSearchParams(location.search);
const parseT = s => { const r = /^(\d{1,2}):(\d{2})$/.exec(s || ''); return r ? D.minuteOf(6, +r[1], +r[2]) : null; };

const S = {
  page: q.get('page') === 'history' ? 'history' : 'now',
  m: parseT(q.get('t')) ?? D.minuteOf(6, 3, 29),
  playing: q.get('paused') !== '1', speed: 8, sel: null, part: null, openIn: q.get('open') === 'vscode' ? 'vscode' : 'file',
  answered: {}, stopped: {}, seen: new Set(), added: [], sent: {}, stopArm: null, hue: {}
};

/* ---------- hues: a working session gets its own colour; blue is only ever him ---------- */
const HUES = [195, 148, 303, 352, 112, 55];
function assignHues(list) {
  const live = list.filter(s => s.state === 'working');
  const liveIds = new Set(live.map(s => s.id));
  Object.keys(S.hue).forEach(id => { if (!liveIds.has(id)) delete S.hue[id]; });
  live.forEach(s => { if (S.hue[s.id] == null) { const used = new Set(Object.values(S.hue)); S.hue[s.id] = HUES.find(h => !used.has(h)) ?? HUES[0]; } });
}
const hueOf = id => S.hue[id];
const ring = (h, l = 58, c = .15) => `oklch(${l}% ${c} ${h})`;

/* ---------- indexes ---------- */
const evByPart = {};
D.events.forEach(e => (evByPart[e.part] ||= []).push(e));
const tagOf = id => (D.sessionById[id] || {}).tag || (S.added.find(a => a.id === id) || {}).tag || '?';
const nameOf = id => (D.sessionById[id] || {}).name || (S.added.find(a => a.id === id) || {}).name || '';
const lastActive = T => { let l = T.start; (T.segs || []).forEach(([a, b]) => { if (a <= S.m) l = Math.min(b, S.m); }); return l; };

/* ---------- the view: stateAt plus what he has done in this page ---------- */
function pseudo(a) {
  const age = S.m - a.at; if (age < 0) return null;
  const pool = ['tool:start_session', 'hook:tier-hook', 'doc:claude-md', 'tool:update_plan', 'hook:plan-gate', 'doc:start-here', 'script:lookup', 'store:journal'];
  const k = Math.floor(age / 3), parts = [pool[k % 8], pool[(k + 3) % 8], pool[(k + 5) % 8]];
  return { id: a.id, tag: a.tag, name: a.name, state: 'working', step: ['Read the brief', 'Plan the steps', 'Build it'][Math.min(2, Math.floor(age / 6))], stepIndex: Math.min(2, Math.floor(age / 6)), stepCount: 3, since: a.at, wait: null, helpersRunning: [], helpersDone: 0, tokens: 1200 + age * 900, parts, hooks: parts.filter(p => p.startsWith('hook:')), marks: [], parent: null, pseudo: true };
}
function view() {
  const raw = D.stateAt(S.m);
  const list = [];
  raw.sessions.forEach(s => {
    const ans = S.answered[s.id], stp = S.stopped[s.id];
    if (stp != null && S.m >= stp) list.push({ ...s, state: 'ended', stopped: true, since: stp, helpersRunning: [], parts: [], hooks: [] });
    else if (s.state === 'waiting' && ans != null && S.m >= ans) list.push({ ...s, state: 'working', wait: null, parts: ['tool:update_plan', 'doc:board', 'doc:start-here'], hooks: ['hook:plan-gate'] });
    else list.push(s);
  });
  S.added.forEach(a => { const p = pseudo(a); if (p) list.push(p); });
  const rank = { waiting: 0, working: 1, quiet: 2, ended: 3 };
  list.forEach((s, i) => s._i = i);
  list.sort((a, b) => rank[a.state] - rank[b.state] || a._i - b._i);
  assignHues(list);
  const marks = raw.marks.filter(mk => !S.seen.has(mk.session + '|' + mk.part + '|' + mk.t));
  return { raw, sessions: list, marks, counts: { working: list.filter(s => s.state === 'working').length, waiting: list.filter(s => s.state === 'waiting').length, helpers: raw.counts.helpers }, tokens: raw.tokens };
}
let V = null;

/* ---------- toast, tip, pop ---------- */
function toast(html, ms = 2600) {
  const t = document.createElement('div'); t.innerHTML = html; $('#toast').appendChild(t);
  while ($('#toast').children.length > 3) $('#toast').firstChild.remove();
  setTimeout(() => t.remove(), ms);
}
const tip = $('#tip'), pop = $('#pop');
function place(el, x, y) {
  el.hidden = false; const w = el.offsetWidth, h = el.offsetHeight;
  el.style.left = clamp(x + 14, 8, innerWidth - w - 8) + 'px';
  el.style.top = clamp(y + 16, 8, innerHeight - h - 8) + 'px';
}
function showTip(html, x, y) { tip.innerHTML = html; place(tip, x, y); }
function hideTip() { tip.hidden = true; }
function showPop(html, x, y) { pop.innerHTML = html; place(pop, x, y); }
function hidePop() { pop.hidden = true; }
document.addEventListener('keydown', e => { if (e.key === 'Escape') { hidePop(); hideTip(); closePane(); } });
document.addEventListener('pointerdown', e => { if (!pop.hidden && !pop.contains(e.target) && !e.target.closest('[data-pin]')) hidePop(); });

/* ---------- opening things (dummy: the real tool would hand over to the app or VS Code) ---------- */
function markSeenFor(id) { (V ? V.raw.marks : []).filter(mk => mk.session === id).forEach(mk => S.seen.add(mk.session + '|' + mk.part + '|' + mk.t)); }
function selectSession(id, o = {}) {
  S.sel = id; update(true);
  if (o.focus) { $('#dIn').focus(); }
}
function openSession(id) {
  markSeenFor(id); S.sel = id;
  toast(`${ic('open')} Opening <b>${esc(tagOf(id))}</b> ${esc(nameOf(id))} in Claude Code`);
  update(true);
}
function openPart(id) {
  const p = D.partById[id]; if (!p) return;
  if (S.openIn === 'vscode') {
    toast(p.file.startsWith('(') ? `${ic('open')} Opened <b>${esc(p.name)}</b> in VS Code, source control` : `${ic('open')} Opened in VS Code <code>${esc(p.file)}</code>`);
    flashPart(id);
  } else showPane(id);
}
function flashPart(id) { if (id.startsWith('hook:')) { flashHooks([id]); return; } const el = stEls[id]; if (el) { el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 2400); } }

const pane = $('#pane');
function showPane(id) {
  const p = D.partById[id]; const evs = (evByPart[id] || []).filter(e => e.t <= S.m && e.result !== 'passed').slice(-8).reverse();
  const last = (evByPart[id] || []).filter(e => e.t <= S.m && e.result === 'passed').slice(-1)[0];
  pane.innerHTML = `<button class="ibtn x" data-act="close" aria-label="Close">${ic('x')}</button><h3>${esc(p.name)}</h3>
    <div class="path">${esc(p.file)}</div>
    <div class="row"><b>${esc(p.group)}</b>${p.model ? `<span class="when">${esc(p.model)}</span>` : ''}</div>
    ${last ? `<div class="row">${ic('check')} Last passed<span class="when">${hm(last.t)}${last.n ? ' · ' + last.n + ' calls' : ''}</span></div>` : ''}
    ${evs.length ? evs.map(e => `<div class="row"><span class="${e.result === 'failed' ? 'f' : 'r'}">${ic(e.result === 'failed' ? 'tri' : e.result === 'refused' ? 'dia' : 'off')}</span><span class="tag">${esc(tagOf(e.session))}</span>${e.result}<span class="when">${hm(e.t)}</span></div>`).join('') : '<div class="row">No trouble so far today</div>'}
    <div class="acts"><button class="btn s" data-act="vscode">${ic('open')}Open in VS Code</button></div>`;
  pane.classList.add('open');
}
function closePane() { pane.classList.remove('open'); }
pane.addEventListener('click', e => {
  const a = e.target.closest('[data-act]'); if (!a) return;
  if (a.dataset.act === 'close') closePane();
  if (a.dataset.act === 'vscode') { toast(`${ic('open')} Opened in VS Code`); }
});

/* ---------- part cards (hover tip and pinned popover) ---------- */
function partCard(id, pinned) {
  const p = D.partById[id];
  const ev = (evByPart[id] || []).filter(e => e.t <= S.m && e.result !== 'passed').slice(-3).reverse();
  const rows = ev.map(e => `<div class="row"><span class="${e.result === 'failed' ? 'f' : 'r'}">${ic(e.result === 'failed' ? 'tri' : 'dia')}</span><b>${e.result}</b> ${esc(tagOf(e.session))}<span style="margin-left:auto;opacity:.7">${hm(e.t)}</span></div>`).join('');
  return `<div class="t"><b>${esc(p.name)}</b>${p.model ? ' · ' + p.model : ''}</div><div class="p">${esc(p.file)}</div>${rows}` +
    (pinned ? `<div class="acts"><button class="btn p" data-act="open" data-id="${id}">${ic('open')}Open</button></div>` : `<div class="sm">Double-click to open</div>`);
}

/* ---------- the board of parts (the canvas) ---------- */
const WORLD = { w: 1500, h: 700 };
const rowY = i => 60 + i * 112;
const LAYOUT = [
  { zone: 'Helper kinds', groups: ['Helper kinds'], row: 0, bx: 16, x0: 196, x1: 1450 },
  { zone: 'Commands', groups: ['Commands'], row: 1, bx: 16, x0: 190, x1: 716 },
  { zone: 'Tests and git', groups: ['Tests and git'], row: 1, bx: 752, x0: 930, x1: 1456 },
  { zone: 'Scripts', groups: ['Scripts'], row: 2, bx: 16, x0: 196, x1: 1450 },
  { zone: 'Stores and settings', groups: ['Stores and settings'], row: 3, bx: 16, x0: 190, x1: 716 },
  { zone: 'Skills and commands', groups: ['Skills', 'Slash commands'], row: 3, bx: 752, x0: 930, x1: 1456 },
  { zone: 'Documents', groups: ['Documents'], row: 4, bx: 16, x0: 196, x1: 1440, wrap: 9 }
];
const stEls = {}, zoneEls = {}, zoneParts = {}, stMax = {};
function buildWorld() {
  const world = $('#world'); let lines = '', html = '';
  LAYOUT.forEach(z => {
    const parts = D.parts.filter(p => z.groups.includes(p.group)); const y = rowY(z.row);
    zoneParts[z.zone] = parts.map(p => p.id);
    const n1 = z.wrap || parts.length, step = n1 > 1 ? (z.x1 - z.x0) / (n1 - 1) : 0, w = clamp(step - 6, 66, 124);
    const pos = [];
    parts.forEach((p, i) => { if (i < n1) pos.push([z.x0 + i * step, y]); else pos.push([z.x1 - (i - n1) * step, rowY(z.row + 1)]); });
    const lx = z.bx + 128;
    if (z.wrap) {
      const lastX = pos[pos.length - 1][0] - 40, R = 56, ax = z.x1 + 38;
      lines += `<path d="M${lx} ${y}H${ax}A${R} ${R} 0 0 1 ${ax} ${y + 2 * R}H${lastX}" />`;
    } else lines += `<path d="M${lx} ${y}H${pos[pos.length - 1][0] + 24}" />`;
    html += `<div class="zone" data-zone="${esc(z.zone)}" style="left:${z.bx}px;top:${y}px"><span>${esc(z.zone)}</span><b></b></div>`;
    parts.forEach((p, i) => {
      stMax[p.id] = step < 100 ? 1 : 2; html += `<button class="st" data-id="${p.id}" style="left:${pos[i][0]}px;top:${pos[i][1]}px;--w:${w}px" aria-label="${esc(p.name)}"><span class="pips"></span><span class="dot"></span><span class="lb">${esc(p.name)}</span>${p.model ? `<span class="md">${p.model}</span>` : ''}<span class="bd"></span><span class="tg"></span><span class="dt"></span></button>`;
    });
  });
  world.innerHTML = `<svg class="lines" width="${WORLD.w}" height="${WORLD.h}" fill="none" stroke="oklch(87% .02 250)" stroke-width="9" stroke-linecap="round" stroke-linejoin="round">${lines}</svg>` + html;
  $$('.st', world).forEach(el => stEls[el.dataset.id] = el);
  $$('.zone', world).forEach(el => zoneEls[el.dataset.zone] = el);
}

/* zoom and pan */
const canvas = $('#canvas'), world = $('#world');
const VW = { s: 1, x: 0, y: 0, user: false };
function applyView() {
  world.style.transform = `translate(${VW.x}px,${VW.y}px) scale(${VW.s})`;
  canvas.dataset.z = VW.s < .6 ? 'out' : VW.s > 1.5 ? 'in' : 'mid';
}
function fit() {
  const cw = canvas.clientWidth, ch = canvas.clientHeight; if (!cw) return;
  VW.s = Math.min(cw / WORLD.w, ch / WORLD.h) * .985; VW.x = (cw - WORLD.w * VW.s) / 2; VW.y = (ch - WORLD.h * VW.s) / 2; VW.user = false; applyView();
}
function zoomAt(f, cx, cy) {
  const s2 = clamp(VW.s * f, .4, 3); VW.x = cx - (cx - VW.x) * s2 / VW.s; VW.y = cy - (cy - VW.y) * s2 / VW.s; VW.s = s2; VW.user = true; applyView();
}
canvas.addEventListener('wheel', e => { e.preventDefault(); const r = canvas.getBoundingClientRect(); zoomAt(Math.exp(-e.deltaY * .0016), e.clientX - r.left, e.clientY - r.top); }, { passive: false });
let drag = null;
canvas.addEventListener('pointerdown', e => { if (e.target.closest('.zoom,.pane')) return; drag = { x: e.clientX, y: e.clientY, vx: VW.x, vy: VW.y, moved: false }; });
window.addEventListener('pointermove', e => {
  if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
  if (!drag.moved && Math.hypot(dx, dy) > 5) { drag.moved = true; canvas.classList.add('drag'); hideTip(); }
  if (drag.moved) { VW.x = drag.vx + dx; VW.y = drag.vy + dy; VW.user = true; applyView(); }
});
window.addEventListener('pointerup', () => { if (drag && drag.moved) { const d = drag; setTimeout(() => d.moved = false, 0); drag.done = true; } canvas.classList.remove('drag'); lastDrag = drag; drag = null; });
let lastDrag = null;
const wasDrag = () => lastDrag && lastDrag.moved;
$('#zIn').onclick = () => zoomAt(1.3, canvas.clientWidth / 2, canvas.clientHeight / 2);
$('#zOut').onclick = () => zoomAt(1 / 1.3, canvas.clientWidth / 2, canvas.clientHeight / 2);
$('#zFit').onclick = fit;
canvas.addEventListener('dblclick', e => { if (e.target === canvas || e.target === world || e.target.closest('svg.lines')) fit(); });

/* station interaction */
canvas.addEventListener('mouseover', e => { const st = e.target.closest('.st'); if (st && !drag) { const r = st.getBoundingClientRect(); showTip(partCard(st.dataset.id, false), r.right, r.top); } });
canvas.addEventListener('mouseout', e => { if (e.target.closest('.st')) hideTip(); });
canvas.addEventListener('click', e => {
  const st = e.target.closest('.st'); if (!st || wasDrag()) return;
  const id = st.dataset.id; S.part = S.part === id ? null : id; hideTip(); update(true);
  if (S.part) { const b = e.target.closest('.b'); const r = st.getBoundingClientRect(); st.setAttribute('data-pin', ''); showPop(partCard(id, true) + (b ? '' : ''), r.right, r.top); }
});
canvas.addEventListener('dblclick', e => { const st = e.target.closest('.st'); if (st) { hidePop(); openPart(st.dataset.id); } });
pop.addEventListener('click', e => {
  const a = e.target.closest('[data-act]'); if (!a) return; const act = a.dataset.act;
  if (act === 'open') { hidePop(); openPart(a.dataset.id); }
  if (act === 'seen') { (a.dataset.keys || '').split(';;').forEach(k => k && S.seen.add(k)); hidePop(); update(true); }
  if (act === 'session') { hidePop(); openSession(a.dataset.id); }
  if (act === 'part') { hidePop(); openPart(a.dataset.id); }
});

const stKey = {};
function renderBoard() {
  const st = {}; const get = id => st[id] ||= { ses: [], f: 0, r: 0, n: 0, help: [], keys: [] };
  const selS = V.sessions.find(s => s.id === (S.hov || S.sel)), selHue = selS ? hueOf(selS.id) : null;
  const spot = new Set(); const spotTag = {};
  V.sessions.forEach(s => {
    if (s.state !== 'working') return; const h = hueOf(s.id);
    const strong = new Set(); s.helpersRunning.forEach(hp => (hp.parts || []).forEach(p => strong.add(p)));
    new Set([...(s.parts || []), ...(s.hooks || [])]).forEach(p => { get(p).ses.push({ id: s.id, h, tag: s.tag, strong: strong.has(p) || p.startsWith('hook:') }); });
    s.helpersRunning.forEach(hp => get('kind:' + hp.kind).help.push(h));
  });
  V.marks.forEach(mk => { const e = get(mk.part); if (mk.result === 'failed') e.f++; else if (mk.result === 'refused') e.r++; else e.n++; e.keys.push(mk.session + '|' + mk.part + '|' + mk.t); });
  if (selS) {
    if (selS.state === 'working') (new Set([...selS.parts, ...selS.hooks])).forEach(p => { spot.add(p); (spotTag[p] ||= []).push(selS.tag); });
    V.marks.filter(mk => mk.session === selS.id).forEach(mk => { spot.add(mk.part); (spotTag[mk.part] ||= []).push(selS.tag); });
  }
  const zoneStat = {};
  Object.keys(stEls).forEach(id => {
    const el = stEls[id], e = st[id] || { ses: [], f: 0, r: 0, n: 0, help: [] };
    const ses = e.ses.slice(0, 3);
    const key = JSON.stringify([ses.map(x => [x.h, x.strong]), e.ses.length, e.f, e.r, e.n, e.help, !!selS, spot.has(id), S.part === id, spotTag[id] || 0, id.startsWith('hook:') || 0]);
    const z = (D.partById[id] || {}).group;
    if (e.ses.length || e.f + e.r + e.n) { const zn = LAYOUT.find(l => l.groups.includes(z)).zone; (zoneStat[zn] ||= { live: 0, bad: 0 }); if (e.ses.length) zoneStat[zn].live++; zoneStat[zn].bad += e.f + e.r + e.n; }
    if (stKey[id] === key) return; stKey[id] = key;
    const dot = $('.dot', el);
    const lit = e.ses.length > 0, hot = e.ses.some(x => x.strong);
    el.classList.toggle('lit', lit); el.classList.toggle('hot', hot);
    el.classList.toggle('tf', e.f > 0); el.classList.toggle('tr', !e.f && e.r > 0); el.classList.toggle('tn', !e.f && !e.r && e.n > 0);
    el.classList.toggle('sp', spot.has(id)); el.classList.toggle('psel', S.part === id);
    const c0 = lit ? ring(ses[0].h, 56, .16) : '', sh = [];
    dot.style.backgroundColor = lit && hot ? c0 : '';
    dot.style.borderColor = lit && !(e.f || e.r || e.n) ? c0 : '';
    if (lit && ses.length === 1) sh.push(`0 0 0 6px ${ring(ses[0].h, 91, .07)}`);
    else { let rr = 0; ses.forEach((x, i) => { if (i === 0) return; sh.push(`0 0 0 ${rr + 2}px #fff`, `0 0 0 ${rr + 5}px ${ring(x.h, 56, .16)}`); rr += 5; }); }
    dot.style.boxShadow = sh.join(',');
    $('.pips', el).innerHTML = e.help.slice(0, 5).map(h => `<i class="pip" style="--h:${h}"></i>`).join('');
    $('.bd', el).innerHTML = (e.f ? `<span class="b f" data-pin>${ic('tri')}${e.f > 1 ? e.f : ''}</span>` : '') + (e.r ? `<span class="b r">${ic('dia')}${e.r > 1 ? e.r : ''}</span>` : '') + (e.n ? `<span class="b n">${ic('off')}</span>` : '');
    const tags = (spotTag[id] ? [...new Set(spotTag[id])].map(t => `<span class="tag ${selHue != null ? 'hue' : 'you'}" style="--h:${selHue ?? 258}">${esc(t)}</span>`) : []).concat(S.sel ? [] : e.ses.slice(0, stMax[id] || 2).map(x => `<span class="tag hue" style="--h:${x.h}">${esc(x.tag)}</span>`).concat(e.ses.length > (stMax[id] || 2) ? [`<span class="tag more">+${e.ses.length - (stMax[id] || 2)}</span>`] : []));
    $('.tg', el).innerHTML = tags.join('');
    const last = (evByPart[id] || []).filter(x => x.t <= S.m && x.result !== 'passed').slice(-1)[0];
    $('.dt', el).textContent = last ? `${last.result} ${hm(last.t)} ${tagOf(last.session)}` : '';
  });
  canvas.toggleAttribute('data-sel', !!selS);
  Object.keys(zoneEls).forEach(zn => { const b = $('b', zoneEls[zn]), s = zoneStat[zn]; b.textContent = s ? (s.live ? s.live + ' live' : '') + (s.bad ? (s.live ? ' · ' : '') + s.bad + ' !' : '') : ''; });
}
canvas.addEventListener('click', e => {
  const b = e.target.closest('.b'); if (!b) return; const st = b.closest('.st'); const id = st.dataset.id;
  const mine = V.marks.filter(mk => mk.part === id); const r = b.getBoundingClientRect();
  const keys = mine.map(mk => mk.session + '|' + mk.part + '|' + mk.t).join(';;');
  showPop(`<div class="t">${esc(D.partById[id].name)}</div>` + mine.slice(0, 6).map(mk => `<div class="row"><span class="${mk.result === 'failed' ? 'f' : 'r'}">${ic(mk.result === 'failed' ? 'tri' : mk.result === 'refused' ? 'dia' : 'off')}</span><b>${mk.result}</b><span class="tag">${esc(mk.tag)}</span><span style="margin-left:auto;color:var(--ink-3)">${hm(mk.t)}</span></div>`).join('') +
    `<div class="acts"><button class="btn s" data-act="session" data-id="${mine[0].session}">${ic('open')}Open ${esc(mine[0].tag)}</button><button class="btn s" data-act="seen" data-keys="${esc(keys)}">${ic('check')}Seen</button></div>`, r.right, r.top);
  e.stopPropagation();
}, true);

/* ---------- the rail: sessions ---------- */
const railEl = $('#cards'), cards = {}; let railHover = false;
$('#rail').addEventListener('mouseenter', () => railHover = true); $('#rail').addEventListener('mouseleave', () => railHover = false);
function cardHTML(s) {
  const T = D.sessionById[s.id];
  const tagCls = s.state === 'waiting' ? 'tag you' : s.state === 'working' ? 'tag hue' : 'tag';
  const par = s.parent && D.sessionById[s.parent] ? `<span class="from" title="Started by ${esc(D.sessionById[s.parent].name)}">${ic('from')}${esc(D.sessionById[s.parent].tag)}</span>` : '';
  const head = `<div class="sc-h"><span class="${tagCls}">${esc(s.tag)}</span><span class="nm" title="${esc(s.name)}">${esc(s.name)}</span>${par}</div>`;
  if (s.state === 'ended') return `<div class="sc-h"><span class="tag">${esc(s.tag)}</span><span class="nm" title="${esc(s.name)}">${esc(s.name)}</span><span class="when">${s.stopped ? 'stopped' : 'ended'} ${hm(s.since ?? T.end)}</span></div>`;
  if (s.state === 'quiet') return head + `<div class="meta"><span>quiet ${dur(Math.max(1, S.m - lastActive(T)))}</span>${s.helpersDone ? `<span class="hp t">${s.helpersDone} helpers done</span>` : ''}<span class="spend">${tok(s.tokens)}</span></div>`;
  if (s.state === 'waiting') {
    const arm = S.stopArm && S.stopArm.id === s.id;
    return head + `<div class="wt">${ic('wait')}waits for you · <span class="wtd">${dur(Math.max(1, S.m - s.wait.from))}</span></div><div class="rp full">${esc(s.wait.report)}</div>
      ${s.wait.question && !s.wait.report.includes(s.wait.question) ? `<div class="qq">${esc(s.wait.question)}</div>` : ''}
      <div class="ans"><input class="ain" type="text" autocomplete="off" placeholder="Type an answer" aria-label="Answer ${esc(s.tag)}"><button class="btn p" data-act="answer">Answer</button></div>
      <div class="quick">${['Go on', 'Hold on', 'Show me first'].map(t => `<button class="qb" data-act="quick" data-q="${t}">${t}</button>`).join('')}</div>
      ${arm ? `<div class="confirm" role="alert">Stop ${esc(s.tag)}? <button class="btn s d" data-act="stopyes">${ic('stop')}Yes, stop</button><button class="btn s" data-act="stopno">Keep it</button></div>` : `<button class="btn s d sm" data-act="stop">${ic('stop')}Stop</button>`}`;
  }
  const by = {}; s.helpersRunning.forEach(h => by[h.kind] = (by[h.kind] || 0) + 1);
  const arm = S.stopArm && S.stopArm.id === s.id;
  const prog = `<span class="prog" title="Step ${s.stepIndex + 1} of ${s.stepCount}">${Array.from({ length: Math.min(s.stepCount, 14) }, (_, i) => `<i class="${i <= s.stepIndex ? 'f' : ''}"></i>`).join('')}</span>`;
  const sent = S.sent[s.id] != null && S.m - S.sent[s.id] < 25 ? `<span class="youn">you ${hm(S.sent[s.id])}</span>` : '';
  const maxTok = Math.max(1, ...V.sessions.map(x => x.tokens || 0));
  return head + `<div class="step">${esc(s.step)}</div><div class="meta">${prog}${Object.keys(by).map(k => `<span class="hp">${esc(k)}${by[k] > 1 ? ' ×' + by[k] : ''}</span>`).join('')}${sent}${s.tokens ? `<span class="spend">${tok(s.tokens)}<s><i style="width:${Math.max(4, s.tokens / maxTok * 100)}%"></i></s></span>` : ''}</div>` +
    '';
}
function renderRail() {
  const ids = V.sessions.map(s => s.id), partSes = S.part ? new Set((V.sessions.filter(s => (s.parts || []).includes(S.part) || (s.hooks || []).includes(S.part))).map(s => s.id)) : null;
  V.sessions.forEach(s => {
    let el = cards[s.id];
    if (!el) { el = cards[s.id] = document.createElement('article'); el.dataset.id = s.id; el.tabIndex = 0; el.setAttribute('role', 'button'); railEl.appendChild(el); }
    const cls = `sc ${s.state}${S.sel === s.id ? ' sel' : ''}${partSes && partSes.has(s.id) ? ' onpart' : ''}`;
    if (el._c !== cls) { el.className = el._c ? cls : cls; el._c = cls; }
    const h = hueOf(s.id); if (h != null && el._h !== h) { el.style.setProperty('--h', h); el._h = h; }
    const html = cardHTML(s); if (el._html !== html) { const ai = el.querySelector('.ain'), av = ai ? ai.value : '', af = ai && document.activeElement === ai, ac = ai ? ai.selectionStart : 0; el.innerHTML = html; el._html = html; const bi = el.querySelector('.ain'); if (bi && (av || af)) { bi.value = av; if (af) { bi.focus(); bi.setSelectionRange(ac, ac); } } }
    el.setAttribute('aria-label', `${s.tag} ${s.name}, ${s.state}`);
  });
  Object.keys(cards).forEach(id => { if (!ids.includes(id)) { cards[id].remove(); delete cards[id]; } });
  if (!railHover || !railEl.children.length) ids.forEach((id, i) => { if (railEl.children[i] !== cards[id]) railEl.insertBefore(cards[id], railEl.children[i] || null); });
  const c = V.counts, hd = `<div><span class="k"><i style="background:${ring(195, 52, .14)}"></i>${c.working} working</span><span class="k"><i style="background:var(--you)"></i>${c.waiting} waits for you</span></div><div><span class="k">${ic('helper')}${c.helpers} helpers running</span><span class="k">${tok(V.tokens)} tokens today</span></div>`;
  if ($('#railHead')._h !== hd) { $('#railHead').innerHTML = hd; $('#railHead')._h = hd; }
}
function answer(id, text) {
  const s = V.sessions.find(x => x.id === id); if (!s) return;
  S.answered[id] = S.m; S.sent[id] = S.m; markSeenFor(id); S.stopArm = null;
  toast(`${ic('check')} Answered <b>${esc(s.tag)}</b>: ${esc(text)}`); update(true);
}
function stopNow(id) { const s = V.sessions.find(x => x.id === id); S.stopped[id] = S.m; S.stopArm = null; toast(`${ic('stop')} Stopped <b>${esc(s ? s.tag : tagOf(id))}</b> <button class="tbtn" data-undo="${id}">Undo</button>`, 6000); update(true); }
railEl.addEventListener('click', e => {
  const card = e.target.closest('.sc'); if (!card) return; const id = card.dataset.id;
  const act = e.target.closest('[data-act]');
  if (e.target.closest('.ain')) return;
  if (act) {
    const k = act.dataset.act;
    if (k === 'answer') { const inp = card.querySelector('.ain'), v = inp ? inp.value.trim() : ''; if (!v) { inp.focus(); inp.classList.remove('nudge'); void inp.offsetWidth; inp.classList.add('nudge'); inp.placeholder = 'Type an answer, or pick one below'; return; } answer(id, v); return; }
    if (k === 'quick') { answer(id, act.dataset.q); return; }
    if (k === 'stop') { S.stopArm = { id }; update(true); return; }
    if (k === 'stopyes') { stopNow(id); return; }
    if (k === 'stopno') { S.stopArm = null; update(true); return; }
  }
  openSession(id);
});
railEl.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.classList.contains('ain')) { e.preventDefault(); e.stopPropagation(); const v = e.target.value.trim(); if (v) answer(e.target.closest('.sc').dataset.id, v); } }, true);
railEl.addEventListener('mouseover', e => { const c = e.target.closest('.sc'); const id = c ? c.dataset.id : null; if (id !== S.hov) { S.hov = id; update(true); } });
railEl.addEventListener('mouseleave', () => { if (S.hov) { S.hov = null; update(true); } });
railEl.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('sc')) { e.preventDefault(); openSession(e.target.dataset.id); } });

/* ---------- the day strip: the whole day so far, long quiet stretches folded, each hook a row on the same clock ----------
   From UX Designer (the day as one strip: starts, "nothing ran", "you were away", trouble, drag back) and UI UX Pro Max
   (one row per hook on the sessions' clock, "never fired" said plainly). The scale holds still within the hour; when the
   day grows past it, or a quiet stretch closes and folds, the strip eases to the new scale (no jump). */
const rb = $('#rbsvg');
const HOOKS = D.parts.filter(p => p.group === 'Hooks');
const DAY0 = D.replayStart, LW = 214, RW = 92, FW = 74;
const RB = { flag: 0, top: 22, base: 66, you: 80, hk0: 98, hkH: 16 };
RB.axis = RB.hk0 + HOOKS.length * RB.hkH + 16;
const bv = (t, k) => { const d = Math.floor(t / 1440); if (d < 0 || d > 6) return 0; const a = D.week.days[d][k]; return a ? a[Math.floor((t - d * 1440) / 5)] || 0 : 0; };
const hookPass = {}, hookBad = {}, otherBad = [];
HOOKS.forEach(h => { hookPass[h.id] = new Uint8Array(300); hookBad[h.id] = []; });
D.events.forEach((e, i) => {
  if (e.t < DAY0 || e.t >= DAY0 + 1440) return;
  if (hookPass[e.part]) { if (e.result === 'passed') hookPass[e.part][Math.floor((e.t - DAY0) / 5)] = 1; else hookBad[e.part].push(i); }
  else if (e.result !== 'passed') otherBad.push(i);
});
function quietRuns(t0, t1) {
  const runs = []; let r = null;
  for (let t = t0; t < t1; t += 5) { const idle = !bv(t, 'sessions') && !bv(t, 'helpers'); if (idle) { if (!r) r = { a: t, b: t + 5 }; else r.b = t + 5; } else if (r) { runs.push(r); r = null; } }
  if (r) { r.b = Math.min(r.b, t1); r.open = true; runs.push(r); }
  return runs;
}
function makeMap(m) {
  const t0 = DAY0, t1 = t0 + Math.max(60, Math.ceil((m - t0 + 8) / 60) * 60);
  const W = Math.max(400, (rb.clientWidth || 1500) - LW - RW);
  const runs = quietRuns(t0, Math.min(m, t1)), folds = runs.filter(r => !r.open && r.b - r.a >= 60);
  const pcs = []; let c = t0;
  folds.forEach(f => { if (f.a > c) pcs.push({ a: c, b: f.a }); pcs.push({ a: f.a, b: f.b, fold: true }); c = f.b; });
  if (c < t1) pcs.push({ a: c, b: t1 });
  const un = pcs.filter(p => !p.fold).reduce((s, p) => s + p.b - p.a, 0), k = (W - folds.length * FW) / un;
  let acc = 0; pcs.forEach(p => { p.x0 = acc; p.w = p.fold ? FW : (p.b - p.a) * k; acc += p.w; });
  const last = pcs[pcs.length - 1];
  const x = t => { for (const p of pcs) if (t <= p.b || p === last) return p.x0 + p.w * clamp((t - p.a) / (p.b - p.a), 0, 1); return 0; };
  const inv = px => { for (const p of pcs) if (px <= p.x0 + p.w || p === last) return p.a + (p.b - p.a) * clamp((px - p.x0) / p.w, 0, 1); return t1; };
  return { t0, t1, W, pcs, runs, x, inv, sig: t1 + '|' + W + '|' + folds.map(f => f.a).join(',') };
}
const MP = { cur: null, prev: null, at: 0, dur: 650 };
function curMap() {
  const n = makeMap(S.m);
  if (!MP.cur) MP.cur = n;
  else if (n.sig !== MP.cur.sig) { MP.prev = MP.cur; MP.cur = n; MP.at = performance.now(); }
  else MP.cur = n;
  const k = MP.prev ? clamp((performance.now() - MP.at) / MP.dur, 0, 1) : 1;
  if (k >= 1) MP.prev = null;
  if (!MP.prev) return MP.cur;
  const e = 1 - Math.pow(1 - k, 3), a = MP.prev, b = MP.cur;
  return { ...b, x: t => a.x(t) + (b.x(t) - a.x(t)) * e, anim: true };
}
const flashH = { ids: new Set(), until: 0 };
function flashHooks(ids) { flashH.ids = new Set(ids); flashH.until = performance.now() + 2600; renderRibbon(); setTimeout(() => S.page === 'now' && renderRibbon(), 2700); }
const glyphUse = (res, x, y, s, extra = '') => `<use href="#i-${res === 'failed' ? 'tri' : res === 'refused' ? 'dia' : 'off'}" x="${x - s / 2}" y="${y - s / 2}" width="${s}" height="${s}" style="color:${res === 'failed' ? 'var(--failed)' : res === 'refused' ? 'var(--refused)' : 'var(--ink-3)'}" ${extra}/>`;
let lastMap = null;
function renderRibbon() {
  const mp = curMap(); lastMap = mp; const m = S.m, X = t => LW + mp.x(t), now = X(m), right = LW + mp.W;
  const selS = V.sessions.find(s => s.id === (S.hov || S.sel));
  const selHooks = new Set(selS ? [...(selS.hooks || []), ...V.marks.filter(mk => mk.session === selS.id).map(mk => mk.part)] : []);
  const H = RB.axis + 22; rb.setAttribute('height', H);
  let g = '';
  // hour grid and the axis
  const span = mp.t1 - mp.t0, step = span <= 240 ? 30 : 60;
  for (let t = mp.t0; t <= mp.t1; t += step) {
    if (mp.pcs.some(p => p.fold && t > p.a && t < p.b)) continue;
    const x = X(t), hr = t % 60 === 0;
    g += `<line x1="${x}" x2="${x}" y1="${RB.top}" y2="${RB.axis - 8}" stroke="${hr ? 'var(--line-2)' : 'var(--line)'}" stroke-width="1"/>` + (hr ? `<text class="ax" x="${x}" y="${RB.axis + 8}" text-anchor="middle">${hm(t)}</text>` : '');
  }
  // folded and open quiet stretches: hatched, with their length
  mp.pcs.forEach(p => { if (!p.fold) return; const x0 = X(p.a), x1 = X(p.b); g += `<rect x="${x0}" y="${RB.top}" width="${x1 - x0}" height="${RB.axis - 8 - RB.top}" fill="url(#hatch)" data-tip="${esc(`Nothing ran ${hm(p.a)} to ${hm(p.b)}, ${dur(p.b - p.a)} (folded)`)}"/><text class="ql" x="${(x0 + x1) / 2}" y="${RB.top + 14}" text-anchor="middle">${dur(p.b - p.a)}</text><text class="qs" x="${(x0 + x1) / 2}" y="${RB.top + 28}" text-anchor="middle">nothing ran</text>`; });
  mp.runs.forEach(r => { if (r.b - r.a < 15) return; const x0 = X(r.a), x1 = X(Math.min(r.b, m)); if (mp.pcs.some(p => p.fold && p.a === r.a)) return; if (x1 - x0 < 30) return;
    g += `<rect x="${x0}" y="${RB.top}" width="${x1 - x0}" height="${RB.base - RB.top}" fill="url(#hatch)" opacity=".9"/>` + (x1 - x0 > 54 ? `<text class="ql" x="${(x0 + x1) / 2}" y="${RB.top + 14}" text-anchor="middle">${r.open ? 'quiet ' : ''}${dur(Math.min(r.b, m) - r.a)}</text>` : ''); });
  // sessions at work (dark) and helpers (light), up to now
  let hmax = 6; for (let t = mp.t0; t <= m; t += 5) hmax = Math.max(hmax, bv(t, 'helpers'));
  const AH = RB.base - RB.top - 6; let aS = `M${X(mp.t0)} ${RB.base}`, aH = aS;
  for (let t = mp.t0; t < m; t += 5) {
    const vs = bv(t, 'sessions'), vh = bv(t, 'helpers'), x0 = X(t), x1 = X(Math.min(t + 5, m));
    aS += `L${x0} ${RB.base - Math.min(vs, 4) / 4 * AH}L${x1} ${RB.base - Math.min(vs, 4) / 4 * AH}`; aH += `L${x0} ${RB.base - vh / hmax * AH}L${x1} ${RB.base - vh / hmax * AH}`;
  }
  aS += `L${now} ${RB.base}Z`; aH += `L${now} ${RB.base}Z`;
  g += `<path d="${aH}" fill="oklch(90% .03 250)"/><path d="${aS}" fill="oklch(64% .06 255)"/><line x1="${LW}" x2="${now}" y1="${RB.base}" y2="${RB.base}" stroke="var(--line-3)" stroke-width="1.5"/>`;
  // starts as flags
  let lastEnd = -1e9;
  D.sessions.filter(s => s.start >= mp.t0 && s.start <= m).forEach(s => {
    const x = X(s.start), live = S.hue[s.id] != null, w = 12 + s.tag.length * 8;
    g += `<line x1="${x}" x2="${x}" y1="${RB.flag + 12}" y2="${RB.base}" stroke="${live ? ring(S.hue[s.id], 56, .15) : 'var(--line-3)'}" stroke-width="2"/>`;
    if (x > lastEnd + 4) { g += `<g class="flag" data-sid="${s.id}" data-tip="${esc(`${s.tag} started ${hm(s.start)} · ${s.name}`)}"><rect x="${x}" y="${RB.flag}" width="${w}" height="16" rx="4" fill="${live ? ring(S.hue[s.id], 93, .05) : 'var(--surface)'}" stroke="${live ? ring(S.hue[s.id], 62, .13) : 'var(--line-3)'}"/><text x="${x + w / 2}" y="${RB.flag + 12}" text-anchor="middle">${esc(s.tag)}</text></g>`; lastEnd = x + w; }
  });
  // trouble on parts that are not hooks, on the session line
  otherBad.forEach(i => { const e = D.events[i]; if (e.t > m || S.seen.has(e.session + '|' + e.part + '|' + e.t)) return; g += glyphUse(e.result, X(e.t), RB.top + 2, 12, `data-ei="${i}" class="gl" data-tip="${esc(`${e.result} · ${D.partById[e.part].name} · ${tagOf(e.session)} · ${hm(e.t)}`)}"`); });
  // you: away bands, messages, when you last wrote
  g += `<text class="rl" x="${LW - 12}" y="${RB.you + 4}" text-anchor="end">You</text>`;
  D.owner.away.forEach(a => { const lo = Math.max(a.left, mp.t0), hi = Math.min(a.back, m); if (hi <= lo) return; const x0 = X(lo), x1 = X(hi);
    g += `<rect x="${x0}" y="${RB.you - 7}" width="${x1 - x0}" height="14" rx="3" fill="var(--you-tint)" stroke="var(--you-soft)"/>` + (x1 - x0 > 110 ? `<text class="aw" x="${x0 + 6}" y="${RB.you + 4}">you away ${dur(hi - lo)}</text>` : ''); });
  D.owner.messages.forEach(t => { if (t >= mp.t0 && t <= m) g += `<circle cx="${X(t)}" cy="${RB.you}" r="3.4" fill="var(--you)"><title>you wrote ${hm(t)}</title></circle>`; });
  const lo = V.raw.lastOwnerMessage;
  if (lo != null && lo >= mp.t0) g += `<rect x="${X(lo)}" y="${RB.top}" width="${Math.max(0, now - X(lo))}" height="${RB.axis - 8 - RB.top}" fill="var(--you-tint)" opacity=".45"/><line x1="${X(lo)}" x2="${X(lo)}" y1="${RB.top - 4}" y2="${RB.axis - 8}" stroke="var(--you)" stroke-width="1.5" stroke-dasharray="4 3"/>`;
  // one row per hook
  const fl = performance.now() < flashH.until ? flashH.ids : new Set();
  HOOKS.forEach((h, i) => {
    const y = RB.hk0 + i * RB.hkH, cy = y + RB.hkH / 2, users = (V.raw.hookUse[h.id] || []).filter(id => S.hue[id] != null);
    const bad = hookBad[h.id].filter(ei => D.events[ei].t <= m), pass = hookPass[h.id];
    const off = !bad.length && !pass.some((v, b) => v && DAY0 + b * 5 <= m);
    const on = selHooks.has(h.id) || S.part === h.id, fx = fl.has(h.id);
    g += `<g class="hk${off ? ' off' : ''}${on ? ' on' : ''}${fx ? ' fx' : ''}" data-hook="${h.id}"><rect class="hkbg" x="0" y="${y}" width="${right + RW}" height="${RB.hkH}"/><text class="hn" x="10" y="${cy + 4.5}">${esc(h.name)}</text>`;
    let tx = 124; users.slice(0, 2).forEach(id => { const tg = tagOf(id), w = 10 + tg.length * 7.2; g += `<rect x="${tx}" y="${y + 1.5}" width="${w}" height="${RB.hkH - 3}" rx="3" fill="${ring(S.hue[id], 93, .05)}" stroke="${ring(S.hue[id], 60, .14)}"/><text class="ht" x="${tx + w / 2}" y="${cy + 4}" text-anchor="middle">${esc(tg)}</text>`; tx += w + 3; });
    g += '</g>';
    let r0 = -1; const endB = Math.floor((Math.min(m, mp.t1) - DAY0) / 5);
    for (let b = 0; b <= endB + 1; b++) { const v = b <= endB && pass[b]; if (v && r0 < 0) r0 = b; if (!v && r0 >= 0) { const x0 = X(DAY0 + r0 * 5), x1 = Math.min(now, X(DAY0 + b * 5)); g += `<rect class="ps" x="${x0}" y="${cy - 3}" width="${Math.max(2, x1 - x0 - 1)}" height="6" rx="1.5"/>`; r0 = -1; } }
    bad.forEach(ei => { const e = D.events[ei], seen = S.seen.has(e.session + '|' + e.part + '|' + e.t); g += glyphUse(e.result, X(e.t), cy, seen ? 9 : 12, `data-ei="${ei}" class="gl${seen ? ' seen' : ''}" data-tip="${esc(`${e.result} · ${h.name} · ${tagOf(e.session)} · ${hm(e.t)}`)}"`); });
    const nf = bad.filter(ei => D.events[ei].result === 'failed').length, nr = bad.filter(ei => D.events[ei].result === 'refused').length, nn = bad.length - nf - nr;
    g += `<text class="hc" x="${right + 12}" y="${cy + 4.5}">${off ? 'never fired' : (nf ? `<tspan class="f">▲${nf}</tspan> ` : '') + (nr ? `<tspan class="r">◆${nr}</tspan> ` : '') + (nn ? `<tspan>○${nn}</tspan>` : '') + (!nf && !nr && !nn ? '<tspan class="ok">all let through</tspan>' : '')}</text>`;
  });
  g += `<text class="rl" x="${LW - 12}" y="${RB.top + 26}" text-anchor="end">Sessions</text><text class="rl s" x="${LW - 12}" y="${RB.top + 40}" text-anchor="end">and helpers</text>`;
  rb.innerHTML = g + `<g id="nowl"><line x1="0" x2="0" y1="${RB.flag + 2}" y2="${RB.axis - 4}" stroke="var(--ink)" stroke-width="2.5"/><circle cx="0" cy="${RB.base}" r="4.5" fill="var(--ink)"/><rect x="-22" y="${RB.axis - 2}" width="44" height="17" rx="4" fill="var(--ink)"/><text class="nw" x="0" y="${RB.axis + 10}" text-anchor="middle">${hm(m)}</text></g>`;
  moveNow();
}
function moveNow() { const n = rb.querySelector('#nowl'); if (n && lastMap) n.setAttribute('transform', `translate(${LW + lastMap.x(S.m)} 0)`); }
function ribbonFrame() { if (MP.prev) renderRibbon(); else moveNow(); }
const rbH = $('#rbHover');
const tAt = e => { const r = rb.getBoundingClientRect(), x = e.clientX - r.left - LW; return lastMap ? lastMap.inv ? lastMap.inv(x) : MP.cur.inv(x) : S.m; };
rb.addEventListener('mousemove', e => {
  const r = rb.getBoundingClientRect(), x = e.clientX - r.left;
  if (x > LW && x < LW + (lastMap ? lastMap.W : 0)) { rbH.hidden = false; rbH.style.left = (x + 16) + 'px'; rbH.innerHTML = `<b>${hm(MP.cur.inv(x - LW))}</b>`; } else rbH.hidden = true;
  const tp = e.target.closest('[data-tip]'); if (tp) showTip(esc(tp.dataset.tip), e.clientX, e.clientY); else hideTip();
});
rb.addEventListener('mouseleave', () => { rbH.hidden = true; hideTip(); });
rb.addEventListener('click', e => {
  const gl = e.target.closest('[data-ei]');
  if (gl) {
    const ei = +gl.dataset.ei, ev = D.events[ei], key = ev.session + '|' + ev.part + '|' + ev.t; hideTip();
    showPop(`<div class="t"><span class="${ev.result === 'failed' ? 'f' : 'r'}">${ic(ev.result === 'failed' ? 'tri' : ev.result === 'refused' ? 'dia' : 'off')}</span> <b>${esc(D.partById[ev.part].name)}</b> ${ev.result}</div><div class="row"><span class="tag">${esc(tagOf(ev.session))}</span>${esc(nameOf(ev.session))}<span style="margin-left:auto;color:var(--ink-3)">${hm(ev.t)}</span></div><div class="p">${esc(D.partById[ev.part].file)}</div>
      <div class="acts"><button class="btn s" data-act="session" data-id="${ev.session}">${ic('open')}Open ${esc(tagOf(ev.session))}</button><button class="btn s" data-act="part" data-id="${ev.part}">${ic('open')}Open the hook</button><button class="btn s" data-act="seen" data-keys="${esc(key)}">${ic('check')}Seen</button></div>`, e.clientX, e.clientY);
    return;
  }
  const fg = e.target.closest('.flag'); if (fg) { openSession(fg.dataset.sid); return; }
  const hk = e.target.closest('[data-hook]'); const r = rb.getBoundingClientRect(), x = e.clientX - r.left;
  if (hk && x < LW) { const id = hk.dataset.hook; S.part = S.part === id ? null : id; hidePop(); update(true); if (S.part) showPop(partCard(id, true), e.clientX, e.clientY); return; }
  if (x > LW && x < LW + MP.cur.W) { const t = MP.cur.inv(x - LW); if (t < S.m - 1) { S.m = clamp(t, D.replayStart, D.replayEnd); toast(`Back to ${hm(S.m)}; press play to run on`, 1800); S.playing = false; syncPlay(); update(true); } }
});
rb.addEventListener('dblclick', e => { const hk = e.target.closest('[data-hook]'); const r = rb.getBoundingClientRect(); if (hk && e.clientX - r.left < LW) { hidePop(); openPart(hk.dataset.hook); } });

/* ---------- since you left: one line of what changed (from the Vercel guidelines prototype) ---------- */
function renderSince() {
  const lo = V.raw.lastOwnerMessage, el = $('#since'); if (lo == null) { el.innerHTML = ''; return; }
  let f = 0, r = 0, st = 0, en = 0;
  D.events.forEach(e => { if (e.t > lo && e.t <= S.m && !S.seen.has(e.session + '|' + e.part + '|' + e.t)) { if (e.result === 'failed') f++; else if (e.result === 'refused') r++; } });
  D.sessions.forEach(s => { if (s.start > lo && s.start <= S.m) st++; if (s.end != null && s.end > lo && s.end <= S.m) en++; });
  S.added.forEach(a => { if (a.at > lo && a.at <= S.m) st++; });
  const it = (k, cls, icn, n, w) => `<button class="si ${cls}${n ? '' : ' z'}" data-k="${k}">${icn}<b>${n}</b> ${w}</button>`;
  const html = `<div class="sh">Since you left <time>${hm(lo)}</time> · ${dur(Math.max(1, S.m - lo))} ago</div><div class="sl">${it('st', '', ic('play'), st, 'started')}${it('en', '', ic('check'), en, 'finished')}${it('r', 'r', ic('dia'), r, 'refused')}${it('f', 'f', ic('tri'), f, 'failed')}</div>`;
  if (el._h !== html) { el.innerHTML = html; el._h = html; }
}
$('#since').addEventListener('click', e => {
  const c = e.target.closest('.si'); if (!c) return; const k = c.dataset.k, lo = V.raw.lastOwnerMessage;
  if (S.page !== 'now') setPage('now');
  const els = [], hk = [];
  if (k === 'f' || k === 'r') V.marks.filter(mk => mk.t > lo && (k === 'f' ? mk.result === 'failed' : mk.result === 'refused')).forEach(mk => { if (mk.part.startsWith('hook:')) hk.push(mk.part); else if (stEls[mk.part]) els.push(stEls[mk.part]); });
  if (k === 'st' || k === 'en') D.sessions.filter(s => k === 'st' ? s.start > lo && s.start <= S.m : s.end != null && s.end > lo && s.end <= S.m).forEach(s => cards[s.id] && els.push(cards[s.id]));
  if (!els.length && !hk.length) { toast('Nothing of that kind since you left', 1500); return; }
  if (hk.length) flashHooks(hk);
  els.forEach(el => { el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 2600); });
  if (els[0]) els[0].scrollIntoView({ block: 'nearest' });
});

/* ---------- the header: who waits for you, on both pages; jump to anything (from the UX Designer prototype) ---------- */
function renderPill() {
  const w = V.sessions.filter(s => s.state === 'waiting'), p = $('#waitPill');
  const html = !w.length ? '' : w.length === 1 ? `<span class="tag you inv">${esc(w[0].tag)}</span>waits for you · ${dur(Math.max(1, S.m - w[0].wait.from))}<b>Answer</b>` : `<b class="n">${w.length}</b>wait for you<b>Answer</b>`;
  p.hidden = !w.length; if (p._h !== html) { p.innerHTML = html; p._h = html; p.dataset.id = w[0] ? w[0].id : ''; }
}
$('#waitPill').onclick = () => {
  const id = $('#waitPill').dataset.id; if (!id) return; if (S.page !== 'now') setPage('now');
  const c = cards[id]; if (!c) return; c.scrollIntoView({ block: 'nearest' }); c.classList.remove('flash'); void c.offsetWidth; c.classList.add('flash'); setTimeout(() => c.classList.remove('flash'), 2000);
  const a = c.querySelector('.ain'); if (a) a.focus();
};
const jIn = $('#jumpIn'), jList = $('#jumpList'); let jRes = [], jI = 0;
function jumpSearch() {
  const v = jIn.value.trim().toLowerCase(); if (!v) { jList.hidden = true; return; }
  const ses = D.sessions.concat(S.added).filter(s => (s.tag + ' ' + s.name).toLowerCase().includes(v)).slice(0, 5).map(s => ({ k: 's', id: s.id, a: s.tag, b: s.name }));
  const parts = D.parts.filter(p => (p.name + ' ' + p.file).toLowerCase().includes(v)).slice(0, 7).map(p => ({ k: 'p', id: p.id, a: p.group, b: p.name }));
  jRes = ses.concat(parts); jI = 0;
  const mark = s => esc(s).replace(new RegExp('(' + v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig'), '<mark>$1</mark>');
  jList.innerHTML = jRes.length ? jRes.map((r, i) => `<button class="jr${i === jI ? ' on' : ''}" data-i="${i}">${r.k === 's' ? `<span class="tag">${esc(r.a)}</span>` : `<span class="jg">${esc(r.a)}</span>`}<span>${mark(r.b)}</span></button>`).join('') : `<div class="jn">No session or part called "${esc(jIn.value)}"</div>`;
  jList.hidden = false;
}
function jumpGo(i) {
  const r = jRes[i]; if (!r) return; jList.hidden = true; jIn.value = ''; jIn.blur(); if (S.page !== 'now') setPage('now');
  if (r.k === 's') { openSession(r.id); const c = cards[r.id]; if (c) c.scrollIntoView({ block: 'nearest' }); return; }
  S.part = r.id; update(true);
  if (r.id.startsWith('hook:')) { flashHooks([r.id]); return; }
  flashPart(r.id); const el = stEls[r.id]; if (el) { const b = el.getBoundingClientRect(); showPop(partCard(r.id, true), b.right, b.top); }
}
jIn.addEventListener('input', jumpSearch);
jIn.addEventListener('keydown', e => {
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); jI = clamp(jI + (e.key === 'ArrowDown' ? 1 : -1), 0, jRes.length - 1); $$('.jr', jList).forEach((b, i) => b.classList.toggle('on', i === jI)); }
  if (e.key === 'Enter') jumpGo(jI);
  if (e.key === 'Escape') { jList.hidden = true; jIn.blur(); }
});
jList.addEventListener('click', e => { const b = e.target.closest('.jr'); if (b) jumpGo(+b.dataset.i); });
jIn.addEventListener('blur', () => setTimeout(() => jList.hidden = true, 150));
document.addEventListener('keydown', e => { if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { e.preventDefault(); jIn.focus(); } });
$('#toast').addEventListener('click', e => { const u = e.target.closest('[data-undo]'); if (!u) return; delete S.stopped[u.dataset.undo]; u.closest('div').remove(); toast(`Undone: <b>${esc(tagOf(u.dataset.undo))}</b> runs on`, 1800); update(true); });
const typing = () => { const a = document.activeElement; return !!a && ((a.classList && a.classList.contains('ain')) || (a.id === 'dIn' && a.value)); };

/* ---------- the dock: one prompt box, always in the same place ---------- */
const dIn = $('#dIn'), dSend = $('#dSend'), dStop = $('#dStop'), dT = $('#dTarget');
function target() { return S.sel ? V.sessions.find(s => s.id === S.sel) : null; }
function renderDock() {
  const s = target(); let h, ph, lbl;
  if (!s) { h = `<span class="tag">+</span><span class="nm">New session</span>`; ph = 'Prompt a new session…'; lbl = 'Start'; }
  else {
    const tc = s.state === 'waiting' ? 'tag you' : s.state === 'working' ? 'tag hue' : 'tag';
    h = `<span class="${tc}" style="--h:${hueOf(s.id) ?? 258}">${esc(s.tag)}</span><span class="nm">${esc(s.name)}</span>${ic('x')}`;
    ph = s.state === 'waiting' ? (s.wait.question || 'Answer…') : s.state === 'ended' ? 'This session has ended. Start a follow-up…' : `Message ${s.tag}…`; lbl = s.state === 'waiting' ? 'Answer' : 'Send';
  }
  if (dT._h !== h) { dT.innerHTML = h; dT._h = h; }
  if (dIn.placeholder !== ph) dIn.placeholder = ph;
  const L = `${lbl}${' '}${ic('send')}`; if (dSend._h !== L) { dSend.innerHTML = L; dSend._h = L; }
  dStop.hidden = !(s && (s.state === 'working' || s.state === 'waiting'));
  const arm = S.stopArm && s && S.stopArm.id === s.id; dStop.classList.toggle('arm', !!arm); dStop.lastChild.textContent = arm ? 'Confirm stop' : 'Stop';
}
dT.onclick = () => { if (S.sel) { S.sel = null; update(true); } dIn.focus(); };
function submit() {
  const v = dIn.value.trim(), s = target();
  if (!s) {
    if (!v) { toast('Type a prompt to start a session'); dIn.focus(); return; }
    const n = S.added.length + 1, id = 'new' + n; S.added.push({ id, tag: 'N' + n, name: v.slice(0, 46), at: S.m }); S.sel = id;
    toast(`${ic('send')} Started <b>N${n}</b> in Claude Code`);
  } else if (s.state === 'waiting') { answer(s.id, v || 'Go on'); }
  else { S.sent[s.id] = S.m; toast(`${ic('send')} Sent to <b>${esc(s.tag)}</b>`); }
  dIn.value = ''; update(true);
}
dSend.onclick = submit;
dIn.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
dStop.onclick = () => { const s = target(); if (!s) return; if (S.stopArm && S.stopArm.id === s.id) { stopNow(s.id); return; } else { S.stopArm = { id: s.id }; setTimeout(() => { if (S.stopArm && S.stopArm.id === s.id) { S.stopArm = null; update(true); } }, 3000); } update(true); };

/* ---------- top bar controls ---------- */
function setPage(p) {
  S.page = p; $('#pageNow').hidden = p !== 'now'; $('#pageHist').hidden = p !== 'history';
  $$('.tabs button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.page === p)));
  hideTip(); hidePop(); if (p === 'history') APP.history && APP.history.render(); else fit();
}
$$('.tabs button').forEach(b => b.onclick = () => setPage(b.dataset.page));
function syncPlay() { $('#rpPlay').innerHTML = ic(S.playing ? 'pause' : 'play'); $('#rpPlay').setAttribute('aria-label', S.playing ? 'Pause replay' : 'Play replay'); }
$('#rpPlay').onclick = () => { if (!S.playing && S.m >= D.replayEnd - .5) S.m = D.minuteOf(6, 3, 29); S.playing = !S.playing; syncPlay(); };
{ const SP = [[2, '1×'], [8, '4×'], [30, '15×']]; $('#rpSpeed').onclick = () => { const i = (SP.findIndex(s => s[0] === S.speed) + 1) % 3; S.speed = SP[i][0]; $('#rpSpeed').textContent = SP[i][1]; }; }
$('#rpJump').onchange = e => { const v = parseT(e.target.value); if (v != null) { S.m = v; update(true); } e.target.value = ''; };
$$('#openIn button').forEach(b => b.onclick = () => { S.openIn = b.dataset.v; $$('#openIn button').forEach(x => x.classList.toggle('on', x === b)); toast(S.openIn === 'vscode' ? 'Double-click a part: opens in VS Code' : 'Double-click a part: opens in the file pane', 1800); });
document.addEventListener('keydown', e => { if (e.code === 'Space' && !/INPUT|SELECT|BUTTON/.test(document.activeElement.tagName)) { e.preventDefault(); $('#rpPlay').click(); } });

/* ---------- the loop ---------- */
let lastK = -1, last = 0;
function update(force) {
  const k = Math.floor(S.m * 2); if (!force && k === lastK) return; lastK = k;
  V = view(); $('#clock').textContent = `${D.dayName(S.m)} ${hm(S.m)}`;
  renderRail(); renderDock();
  renderSince(); renderPill();
  if (S.page === 'now') { renderBoard(); renderRibbon(); }
  else if (APP.history && APP.history.live) APP.history.live();
}
function frame(now) {
  const dt = Math.min(.25, (now - last) / 1000); last = now;
  if (S.playing && !typing()) { S.m += dt * S.speed; if (S.m >= D.replayEnd) { S.m = D.replayEnd; S.playing = false; syncPlay(); } }
  update(false); if (S.page === 'now') ribbonFrame();
  requestAnimationFrame(frame);
}
function start() {
  buildWorld(); fit(); new ResizeObserver(() => { if (!VW.user && S.page === 'now') fit(); }).observe(canvas);
  const sp = q.get('speed'); if (sp) S.speed = +sp;
  syncPlay(); V = view();
  const sel = q.get('sel'); if (sel) { const f = V.sessions.find(s => s.tag === sel); if (f) S.sel = f.id; }
  if (q.get('part')) S.part = q.get('part');
  if (q.get('z')) { zoomAt(+q.get('z') / VW.s, 520, 140); }
  update(true); setPage(S.page);
  if (q.get('pane')) showPane(q.get('pane'));
  if (q.get('focus') === 'answer') setTimeout(() => $('#waitPill').click(), 300);
  if (q.get('stop') === '1') setTimeout(() => { const w = V.sessions.find(s => s.state === 'waiting'); if (w) { S.stopArm = { id: w.id }; update(true); } }, 300);
  if (q.get('jump')) setTimeout(() => { jIn.value = q.get('jump'); jumpSearch(); jIn.focus(); }, 300);
  requestAnimationFrame(t => { last = t; frame(t); });
}
window.APP = { D, S, $, $$, esc, hm, dur, tok, ic, clamp, tagOf, nameOf, toast, showTip, hideTip, showPop, hidePop, openSession, openPart, selectSession, start, getV: () => V, history: null, tagOfSes: tagOf };
})();
