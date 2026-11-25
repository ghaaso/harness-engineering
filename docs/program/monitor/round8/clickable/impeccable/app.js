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
function flashPart(id) { const el = stEls[id]; if (el) { el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 2400); } }

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
const WORLD = { w: 1500, h: 812 };
const rowY = i => 74 + i * 112;
const LAYOUT = [
  { zone: 'Hooks', groups: ['Hooks'], row: 0, bx: 16, x0: 196, x1: 1450 },
  { zone: 'Helper kinds', groups: ['Helper kinds'], row: 1, bx: 16, x0: 196, x1: 1450 },
  { zone: 'Commands', groups: ['Commands'], row: 2, bx: 16, x0: 190, x1: 716 },
  { zone: 'Tests and git', groups: ['Tests and git'], row: 2, bx: 752, x0: 930, x1: 1456 },
  { zone: 'Scripts', groups: ['Scripts'], row: 3, bx: 16, x0: 196, x1: 1450 },
  { zone: 'Stores and settings', groups: ['Stores and settings'], row: 4, bx: 16, x0: 190, x1: 716 },
  { zone: 'Skills and commands', groups: ['Skills', 'Slash commands'], row: 4, bx: 752, x0: 930, x1: 1456 },
  { zone: 'Documents', groups: ['Documents'], row: 5, bx: 16, x0: 196, x1: 1440, wrap: 9 }
];
const stEls = {}, zoneEls = {}, zoneParts = {};
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
      html += `<button class="st" data-id="${p.id}" style="left:${pos[i][0]}px;top:${pos[i][1]}px;--w:${w}px" aria-label="${esc(p.name)}"><span class="pips"></span><span class="dot"></span><span class="lb">${esc(p.name)}</span>${p.model ? `<span class="md">${p.model}</span>` : ''}<span class="bd"></span><span class="tg"></span><span class="dt"></span></button>`;
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
    const tags = (spotTag[id] ? [...new Set(spotTag[id])].map(t => `<span class="tag ${selHue != null ? 'hue' : 'you'}" style="--h:${selHue ?? 258}">${esc(t)}</span>`) : []).concat(S.sel ? [] : e.ses.map(x => `<span class="tag hue" style="--h:${x.h}">${esc(x.tag)}</span>`));
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
    return head + `<div class="wt">${ic('wait')}waits for you · ${dur(Math.max(1, S.m - s.wait.from))}</div><div class="rp">${esc(s.wait.report)}</div>
      <div class="acts"><button class="btn p" data-act="answer">Answer</button><button class="btn s d${arm ? ' arm' : ''}" data-act="stop">${ic('stop')}${arm ? 'Confirm stop' : 'Stop'}</button></div>`;
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
    const html = cardHTML(s); if (el._html !== html) { el.innerHTML = html; el._html = html; }
    el.setAttribute('aria-label', `${s.tag} ${s.name}, ${s.state}`);
  });
  Object.keys(cards).forEach(id => { if (!ids.includes(id)) { cards[id].remove(); delete cards[id]; } });
  if (!railHover || !railEl.children.length) ids.forEach((id, i) => { if (railEl.children[i] !== cards[id]) railEl.insertBefore(cards[id], railEl.children[i] || null); });
  const c = V.counts, hd = `<div><span class="k"><i style="background:${ring(195, 52, .14)}"></i>${c.working} working</span><span class="k"><i style="background:var(--you)"></i>${c.waiting} waits for you</span></div><div><span class="k">${ic('helper')}${c.helpers} helpers running</span><span class="k">${tok(V.tokens)} tokens today</span></div>`;
  if ($('#railHead')._h !== hd) { $('#railHead').innerHTML = hd; $('#railHead')._h = hd; }
}
railEl.addEventListener('click', e => {
  const card = e.target.closest('.sc'); if (!card) return; const id = card.dataset.id;
  const act = e.target.closest('[data-act]'); const s = V.sessions.find(x => x.id === id);
  if (act && act.dataset.act === 'answer') { selectSession(id, { focus: true }); return; }
  if (act && act.dataset.act === 'stop') {
    if (S.stopArm && S.stopArm.id === id) { S.stopped[id] = S.m; S.stopArm = null; toast(`${ic('stop')} Stopped <b>${esc(s.tag)}</b>`); }
    else { S.stopArm = { id }; setTimeout(() => { if (S.stopArm && S.stopArm.id === id) { S.stopArm = null; update(true); } }, 3000); }
    update(true); return;
  }
  openSession(id);
});
railEl.addEventListener('mouseover', e => { const c = e.target.closest('.sc'); const id = c ? c.dataset.id : null; if (id !== S.hov) { S.hov = id; update(true); } });
railEl.addEventListener('mouseleave', () => { if (S.hov) { S.hov = null; update(true); } });
railEl.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('sc')) { e.preventDefault(); openSession(e.target.dataset.id); } });

/* ---------- the unbroken ribbon: the last three hours ---------- */
const rb = $('#rbsvg'); let rbM0 = 0, rbPx = 1, rbPad = 14;
const bv = (t, k) => { const d = Math.floor(t / 1440); if (d < 0 || d > 6) return 0; const a = D.week.days[d][k]; return a ? a[Math.floor((t - d * 1440) / 5)] || 0 : 0; };
function renderRibbon() {
  const W = rb.clientWidth || 1400, span = 180, padR = 30, base = 90, AH = 40;
  const pxm = (W - rbPad - padR) / span, m0 = S.m, t0 = m0 - span; rbM0 = m0; rbPx = pxm;
  const X = t => rbPad + (t - t0) * pxm;
  const b0 = Math.floor(t0 / 5) * 5; let hmax = 6; for (let t = b0; t <= m0; t += 5) hmax = Math.max(hmax, bv(t, 'helpers'));
  let aS = `M${X(b0)} ${base}`, aH = aS, runs = [], run = null;
  for (let t = b0; t <= m0; t += 5) {
    const vs = bv(t, 'sessions'), vh = bv(t, 'helpers'), x0 = X(t), x1 = X(Math.min(t + 5, m0));
    aS += `L${x0} ${base - Math.min(vs, 4) / 4 * AH}L${x1} ${base - Math.min(vs, 4) / 4 * AH}`; aH += `L${x0} ${base - Math.min(vh, hmax) / hmax * AH}L${x1} ${base - Math.min(vh, hmax) / hmax * AH}`;
    if (!vs && !vh) { if (!run) run = { a: Math.max(t, t0), b: t + 5 }; else run.b = t + 5; } else if (run) { runs.push(run); run = null; }
  }
  if (run) runs.push(run);
  aS += `L${X(m0)} ${base}Z`; aH += `L${X(m0)} ${base}Z`;
  let g = `<path d="${aH}" fill="oklch(90% .03 250)"/><path d="${aS}" fill="oklch(66% .06 255)"/><line x1="${X(b0)}" x2="${X(m0)}" y1="${base}" y2="${base}" stroke="var(--line-3)" stroke-width="1.5"/>`;
  for (let t = Math.ceil(t0 / 30) * 30; t <= m0; t += 30) { const x = X(t), hr = t % 60 === 0; g += `<line x1="${x}" x2="${x}" y1="${hr ? 24 : 76}" y2="${base + 5}" stroke="${hr ? 'var(--line-2)' : 'var(--line)'}" stroke-width="1"/>` + (hr ? `<text x="${x}" y="118" text-anchor="middle">${hm(t)}</text>` : ''); }
  runs.filter(r => r.b - r.a >= 15 && r.b - r.a < 1e4).forEach(r => { const x0 = X(r.a), x1 = X(Math.min(r.b, m0)); g += `<path d="M${x0 + 2} ${base - 14}v-6H${x1 - 2}v6" fill="none" stroke="var(--ink-3)" stroke-width="1.5"/><text x="${(x0 + x1) / 2}" y="${base - 28}" text-anchor="middle" style="font-weight:700;fill:var(--ink-2)">${dur(Math.min(r.b, m0) - r.a)}</text>`; });
  const lo = V.raw.lastOwnerMessage;
  if (lo != null && lo > t0) g += `<rect x="${X(lo)}" y="24" width="${Math.max(0, X(m0) - X(lo))}" height="${base - 24}" fill="var(--you-tint)" opacity=".55"/>`;
  D.owner.messages.forEach(t => { if (t > t0 && t <= m0) g += `<circle cx="${X(t)}" cy="${base + 8}" r="3.6" fill="var(--you)"><title>you ${hm(t)}</title></circle>`; });
  if (lo != null && lo > t0) g += `<line x1="${X(lo)}" x2="${X(lo)}" y1="22" y2="${base + 5}" stroke="var(--you)" stroke-width="2"/>`;
  D.events.forEach((e, i) => { if (e.result === 'passed' || e.t <= t0 || e.t > m0) return; const x = X(e.t); g += `<use href="#i-${e.result === 'failed' ? 'tri' : e.result === 'refused' ? 'dia' : 'off'}" x="${x - 6}" y="26" width="12" height="12" style="color:${e.result === 'failed' ? 'var(--failed)' : 'var(--refused)'}" data-tip="${esc(`${e.result} · ${D.partById[e.part].name} · ${tagOf(e.session)} · ${hm(e.t)}`)}"/>`; });
  let lastEnd = -1e9;
  D.sessions.forEach(s => { if (s.start > t0 && s.start <= m0) { const x = X(s.start), live = S.hue[s.id] != null; g += `<line x1="${x}" x2="${x}" y1="14" y2="${base}" stroke="${live ? ring(S.hue[s.id], 56, .15) : 'var(--line-3)'}" stroke-width="2"/>`; if (x > lastEnd + 6 && x > 330) { const w = 12 + s.tag.length * 8; g += `<g data-tip="${esc(`${s.tag} starts ${hm(s.start)} · ${s.name}`)}"><rect x="${x}" y="0" width="${w}" height="16" rx="4" fill="${live ? ring(S.hue[s.id], 93, .05) : 'var(--surface)'}" stroke="${live ? ring(S.hue[s.id], 62, .13) : 'var(--line-3)'}"/><text x="${x + w / 2}" y="12" text-anchor="middle" style="font-weight:700;fill:var(--ink)">${esc(s.tag)}</text></g>`; lastEnd = x + w; } } });
  const now = X(m0);
  rb.innerHTML = `<g id="sl">${g}</g><line x1="${now}" x2="${now}" y1="18" y2="${base + 6}" stroke="var(--ink)" stroke-width="2.5"/><circle cx="${now}" cy="${base}" r="4.5" fill="var(--ink)"/>`;
}
function slideRibbon() { const g = rb.querySelector('#sl'); if (g) g.setAttribute('transform', `translate(${-(S.m - rbM0) * rbPx} 0)`); }
const rbH = $('#rbHover');
rb.addEventListener('mousemove', e => {
  const r = rb.getBoundingClientRect(), x = e.clientX - r.left, t = rbM0 - 180 + (x + (S.m - rbM0) * rbPx - rbPad) / rbPx;
  rbH.hidden = false; rbH.style.left = (x + 20) + 'px'; rbH.innerHTML = `<b>${hm(Math.max(t, 0))}</b>`;
  const tp = e.target.closest('[data-tip]'); if (tp) showTip(esc(tp.dataset.tip), e.clientX, e.clientY); else hideTip();
});
rb.addEventListener('mouseleave', () => { rbH.hidden = true; hideTip(); });
rb.addEventListener('click', e => { const r = rb.getBoundingClientRect(), x = e.clientX - r.left, t = rbM0 - 180 + (x + (S.m - rbM0) * rbPx - rbPad) / rbPx; S.m = clamp(t, D.replayStart - 120, Math.min(S.m, D.replayEnd)); toast(`Back to ${hm(S.m)}`, 1400); update(true); });

/* "since you wrote": what changed while he was away */
function renderChips() {
  const lo = V.raw.lastOwnerMessage; let html = '';
  if (lo == null) { $('#chips').innerHTML = ''; return; }
  let f = 0, r = 0, st = 0, en = 0;
  D.events.forEach(e => { if (e.t > lo && e.t <= S.m && !S.seen.has(e.session + '|' + e.part + '|' + e.t)) { if (e.result === 'failed') f++; else if (e.result === 'refused') r++; } });
  D.sessions.forEach(s => { if (s.start > lo && s.start <= S.m) st++; if (s.end != null && s.end > lo && s.end <= S.m) en++; });
  const chip = (cls, k, icn, n, tp) => `<button class="chip ${cls}${n ? '' : ' z'}" data-k="${k}" title="${tp}">${icn}${n}</button>`;
  html = `<button class="chip you" data-k="you" title="You last wrote at ${hm(lo)}">you ${hm(lo)}</button>` + chip('f', 'f', ic('tri'), f, 'Failed since you wrote') + chip('r', 'r', ic('dia'), r, 'Refused since you wrote') + chip('', 'st', ic('play'), st, 'Sessions started since you wrote');
  if ($('#chips')._h !== html) { $('#chips').innerHTML = html; $('#chips')._h = html; }
}
$('#chips').addEventListener('click', e => {
  const c = e.target.closest('.chip'); if (!c || !c.dataset.k) return; const k = c.dataset.k, lo = V.raw.lastOwnerMessage;
  const flashEls = [];
  if (k === 'f' || k === 'r') V.marks.filter(mk => mk.t > lo && (k === 'f' ? mk.result === 'failed' : mk.result === 'refused')).forEach(mk => stEls[mk.part] && flashEls.push(stEls[mk.part]));
  if (k === 'st' || k === 'en') D.sessions.filter(s => k === 'st' ? s.start > lo && s.start <= S.m : s.end != null && s.end > lo && s.end <= S.m).forEach(s => cards[s.id] && flashEls.push(cards[s.id]));
  if (!flashEls.length) { toast(k === 'you' ? `You last wrote at ${hm(lo)}` : 'Nothing of that kind since', 1500); return; }
  flashEls.forEach(el => { el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 2600); });
  flashEls[0].scrollIntoView({ block: 'nearest' });
});

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
  } else if (s.state === 'waiting') { S.answered[s.id] = S.m; S.sent[s.id] = S.m; markSeenFor(s.id); toast(`${ic('check')} Answered <b>${esc(s.tag)}</b>: ${esc(v || 'Yes, go on')}`); }
  else { S.sent[s.id] = S.m; toast(`${ic('send')} Sent to <b>${esc(s.tag)}</b>`); }
  dIn.value = ''; update(true);
}
dSend.onclick = submit;
dIn.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
dStop.onclick = () => { const s = target(); if (!s) return; if (S.stopArm && S.stopArm.id === s.id) { S.stopped[s.id] = S.m; S.stopArm = null; toast(`${ic('stop')} Stopped <b>${esc(s.tag)}</b>`); } else { S.stopArm = { id: s.id }; setTimeout(() => { if (S.stopArm && S.stopArm.id === s.id) { S.stopArm = null; update(true); } }, 3000); } update(true); };

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
  if (S.page === 'now') { renderBoard(); renderRibbon(); renderChips(); }
  else if (APP.history && APP.history.live) APP.history.live();
}
function frame(now) {
  const dt = Math.min(.25, (now - last) / 1000); last = now;
  if (S.playing) { S.m += dt * S.speed; if (S.m >= D.replayEnd) { S.m = D.replayEnd; S.playing = false; syncPlay(); } }
  update(false); if (S.page === 'now') slideRibbon();
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
  requestAnimationFrame(t => { last = t; frame(t); });
}
window.APP = { D, S, $, $$, esc, hm, dur, tok, ic, clamp, tagOf, nameOf, toast, showTip, hideTip, showPop, hidePop, openSession, openPart, selectSession, start, getV: () => V, history: null, tagOfSes: tagOf };
})();
