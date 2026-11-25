/* Session Tool prototype: core (data helpers, replay clock, URL state, drawer, operating controls). */
(function () {
'use strict';
const D = window.TOOL_DATA;
const T0 = D.replayStart, T1 = D.replayEnd, DEFAULT_T = 8840;
const NB = ' ';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const tf = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
const df = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
const nf = new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 });
const at = m => new Date(2026, 10, 18, 0, Math.round(m));
const fmtT = m => tf.format(at(m));
const fmtD = m => df.format(at(m));
const tok = n => nf.format(n || 0);
const dur = min => { const r = Math.max(1, Math.round(min)), h = Math.floor(r / 60), mm = r % 60; return h ? (mm ? `${h}${NB}h${NB}${mm}${NB}min` : `${h}${NB}h`) : `${mm}${NB}min`; };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const store = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };

/* ---------- indexes ---------- */
const HUES = ['#0e7c86', '#6b4fb8', '#3a7d1e', '#b0306f', '#8a5a35', '#4f6475', '#6f6f0c', '#9b4dca'];
const sorted = D.sessions.slice().sort((a, b) => a.start - b.start);
const hueOf = {}; sorted.forEach((s, i) => { hueOf[s.id] = HUES[i % HUES.length]; });
const evByPart = {}, evBySession = {};
D.events.forEach(e => { (evByPart[e.part] = evByPart[e.part] || []).push(e); (evBySession[e.session] = evBySession[e.session] || []).push(e); });
const childrenOf = {}; D.sessions.forEach(s => { if (s.parent && D.sessionById[s.parent]) (childrenOf[s.parent] = childrenOf[s.parent] || []).push(s.id); });
const hookPasses = {}; D.events.forEach(e => { if (e.part.startsWith('hook:') && e.result === 'passed') hookPasses[e.part] = (hookPasses[e.part] || 0) + 1; });
// stretches where nothing ran (no turn, no helper)
const gaps = (() => {
  const iv = [];
  D.sessions.forEach(s => { s.segs.forEach(g => iv.push([g[0], g[1]])); s.helpers.forEach(h => iv.push([h.start, h.end == null ? T1 : h.end])); });
  iv.sort((a, b) => a[0] - b[0]);
  const m = []; iv.forEach(x => { const l = m[m.length - 1]; if (l && x[0] <= l[1] + 1) l[1] = Math.max(l[1], x[1]); else m.push([x[0], x[1]]); });
  const out = []; for (let i = 1; i < m.length; i++) if (m[i][0] - m[i - 1][1] >= 20) out.push({ a: m[i - 1][1], b: m[i][0], len: m[i][0] - m[i - 1][1] });
  return out;
})();
const iconOf = p => p.id.startsWith('git:') ? 'i-git' : ({ 'Hooks': 'i-hook', 'Helper kinds': 'i-kind', 'Commands': 'i-cmd', 'Slash commands': 'i-cmd', 'Scripts': 'i-script', 'Tests and git': 'i-test', 'Stores and settings': 'i-store', 'Documents': 'i-doc', 'Skills': 'i-skill' }[p.group] || 'i-doc');
const RES = { passed: 'Passed', refused: 'Refused', failed: 'Failed', 'not-on': 'Not On' };
const glyph = r => r === 'failed' ? '<svg class="mi" style="color:var(--fail)" aria-hidden="true"><use href="#m-fail"/></svg>' : r === 'refused' ? '<svg class="mi" style="color:var(--refuse)" aria-hidden="true"><use href="#m-refuse"/></svg>' : r === 'not-on' ? '<svg class="mi" style="color:var(--ink3)" aria-hidden="true"><use href="#m-noton"/></svg>' : '';
const tagH = id => { const s = D.sessionById[id] || A.userById[id]; return s ? `<span class="tag" style="--h:${hueOf[id] || '#555'}" translate="no">${esc(s.tag)}</span>` : ''; };

/* ---------- state ---------- */
const U = { page: 'now', s: null, p: null, ev: null, from: 8640, to: 9540 };
const R = { m: DEFAULT_T, start: DEFAULT_T, playing: true, speed: 10, last: 0, tickAt: 0, force: true };
const A = { D, $, $$, fmtT, fmtD, tok, dur, esc, nf, NB, hueOf, tagH, evByPart, evBySession, childrenOf, gaps, hookPasses, iconOf, glyph, RES, reduced, U, R, T0, T1,
  OV: {}, seen: new Set(), userSessions: [], userById: {}, eff: {}, effList: [], st: null, ui: { confirm: null, answering: null, draft: '' }, target: null, mods: {}, opener: 'pane' };
window.App = A;
const markKey = m => m.t + '|' + m.part + '|' + m.session;
A.visibleMarks = st => st.marks.filter(m => !A.seen.has(markKey(m)));
A.markKey = markKey;

/* ---------- toasts and live region ---------- */
A.toast = (html, opt = {}) => {
  const t = document.createElement('div'); t.className = 'toast'; t.innerHTML = `<span>${html}</span>`;
  if (opt.undo) { const b = document.createElement('button'); b.type = 'button'; b.textContent = 'Undo'; b.addEventListener('click', () => { opt.undo(); kill(); }); t.appendChild(b); }
  $('#toasts').appendChild(t);
  const kill = () => { t.classList.add('out'); setTimeout(() => t.remove(), 220); };
  setTimeout(kill, opt.ms || 4200);
};
A.say = text => { $('#live').textContent = text; };

/* ---------- URL ---------- */
const readUrl = () => {
  const q = new URLSearchParams(location.search);
  if (q.get('page') === 'history') U.page = 'history';
  if (q.get('t')) R.m = Math.min(T1 - 1, Math.max(T0, +q.get('t')));
  if (q.get('play') === '0') R.playing = false;
  if (q.get('s') && D.sessionById[q.get('s')]) U.s = q.get('s');
  if (q.get('p') && D.partById[q.get('p')]) U.p = q.get('p');
  if (q.get('ev')) U.ev = q.get('ev');
  if (q.get('from')) { U.from = +q.get('from'); U.to = +q.get('to') || U.to; }
  if (q.get('speed')) R.speed = +q.get('speed');
  R.start = R.m;
};
A.syncUrl = () => {
  const q = new URLSearchParams(); q.set('page', U.page);
  if (U.s) q.set('s', U.s); if (U.p) q.set('p', U.p); if (U.ev) q.set('ev', U.ev);
  if (U.page === 'history') { q.set('from', Math.round(U.from)); q.set('to', Math.round(U.to)); }
  if (!R.playing) { q.set('t', Math.round(R.m)); q.set('play', '0'); }
  try { history.replaceState(null, '', '?' + q.toString()); } catch (e) {}
};

/* ---------- views of a session (works for any session, current or old) ---------- */
const stepsOf = s => (s.steps || []).filter(x => x[0] <= R.m);
A.view = id => {
  if (A.eff[id]) return A.eff[id];
  const s = D.sessionById[id]; if (!s) return null;
  const m = R.m; let state = 'ended';
  if (s.start > m) state = 'future';
  else if (s.end == null || s.end >= m) { state = s.segs.some(g => g[0] <= m && m <= g[1]) ? 'working' : 'quiet'; const w = s.waits.find(w => w[0] <= m && m <= w[1]); if (w) state = 'waiting'; }
  const st = stepsOf(s), last = st[st.length - 1];
  const tk = (s.tokens.filter(x => x[0] <= m).pop() || [0, 0])[1];
  const run = s.helpers.filter(h => h.start <= m && (h.end == null || h.end > m)).map(h => Object.assign({ session: id, tag: s.tag }, h));
  const marks = (evBySession[id] || []).filter(e => e.t <= m && e.result !== 'passed').reverse().slice(0, 12);
  return { id, tag: s.tag, name: s.name, state, step: last ? last[1] : '', stepIndex: st.length, stepCount: Math.max(st.length, (s.plan || []).length), since: null, wait: null,
    helpersRunning: run, helpersDone: s.helpers.filter(h => h.end != null && h.end <= m).length, tokens: tk, parts: [], hooks: [], marks, parent: s.parent };
};

/* apply the owner's answers and stops on top of the replay, and add sessions started from the tool */
const decorate = st => {
  const out = st.sessions.map(s => {
    const o = A.OV[s.id]; if (!o) return s;
    if (o.stopped) return Object.assign({}, s, { state: 'ended', wait: null, step: 'Stopped by you', stopped: true });
    if (o.answered && s.state === 'waiting') return Object.assign({}, s, { state: 'working', wait: null, step: 'Resuming after your answer…', answered: true });
    return s;
  });
  A.userSessions.forEach(u => out.unshift(Object.assign({}, u, { since: null })));
  return out;
};

/* ---------- replay clock ---------- */
const mod = () => A.mods[U.page];
const tick = () => {
  const st = D.stateAt(R.m); A.st = st;
  A.effList = decorate(st); A.eff = {}; A.effList.forEach(s => { A.eff[s.id] = s; });
  const marks = A.visibleMarks(st);
  const work = A.effList.filter(s => s.state === 'working').length, wait = A.effList.filter(s => s.state === 'waiting').length;
  const set = (id, v, on) => { const e = $('#' + id); if (e.textContent !== String(v)) e.textContent = v; e.parentElement.classList.toggle('zero', !(+v) && v !== '0 '); };
  set('g-work', work); set('g-wait', wait); set('g-help', st.counts.helpers); set('g-bad', marks.length); $('#g-tok').textContent = tok(st.tokens);
  $('.g-wait').classList.toggle('on', wait > 0); $('.g-bad').classList.toggle('on', marks.length > 0);
  $('#clock-d').textContent = fmtD(R.m); $('#clock-t').textContent = fmtT(R.m);
  const sc = $('#scrub'); if (document.activeElement !== sc) sc.value = Math.round(R.m);
  const w = A.effList.filter(s => s.state === 'waiting').map(s => s.tag).join(', ');
  if (w !== A._w) { if (w) A.say(w + ' waiting for you'); A._w = w; }
  A.mods.now.tick(st, A.effList, marks);
  if (U.page === 'history') A.mods.history.tick(R.m);
  A.drawerRefresh();
};
A.refresh = () => { R.force = true; };
const frame = ts => {
  const dt = Math.min(ts - R.last, 120); R.last = ts;
  if (R.playing) {
    R.m += dt / 1000 * R.speed;
    if (R.m >= T1) { R.m = R.start; A.OV = {}; A.seen.clear(); A.toast('Replay Restarted at ' + fmtT(R.m)); R.force = true; }
  }
  const md = mod(); if (md && md.frame) md.frame(R.m, ts);
  if (ts - R.tickAt >= 250 || R.force) { R.tickAt = ts; R.force = false; tick(); }
  requestAnimationFrame(frame);
};
const setPlaying = on => {
  R.playing = on; const b = $('#play');
  b.innerHTML = `<svg class="ic" aria-hidden="true"><use href="#${on ? 'i-pause' : 'i-play'}"/></svg>`;
  b.setAttribute('aria-label', on ? 'Pause Replay' : 'Play Replay'); A.syncUrl();
};

/* ---------- drawer ---------- */
const dr = () => $('#drawer');
let lastFocus = null, drSig = '';
const stateHTML = s => {
  if (s.state === 'waiting') return `<span class="state w"><svg class="mi" aria-hidden="true"><use href="#m-wait"/></svg>Waits for You · ${dur(R.m - (s.since || R.m))}</span>`;
  if (s.state === 'working') return `<span class="state"><span class="live-dot" style="--h:${hueOf[s.id]}"></span>Working</span>`;
  if (s.state === 'quiet') return `<span class="state">Quiet</span>`;
  return `<span class="state">${s.stopped ? 'Stopped' : 'Ended'}</span>`;
};
A.stateHTML = stateHTML;
/* the block that lets him answer or stop: shared by the rail card and the drawer */
A.actionsHTML = (s, where) => {
  if (s.user) return '';
  const id = s.id, ui = A.ui;
  let h = '';
  if (s.state === 'waiting') {
    h += `<div class="wait"><div class="q">${esc(s.wait.question)}</div><div class="rep">${esc(s.wait.report)}</div>`;
    if (ui.answering === id) {
      h += `<div class="answer"><div class="quick"><button type="button" class="btn sm you" data-act="quick" data-sid="${id}" data-text="Yes, go on">Yes, Go On</button><button type="button" class="btn sm" data-act="quick" data-sid="${id}" data-text="Not yet">Not Yet</button></div>
      <label class="sr-only" for="ans-${where}-${id}">Your answer to ${esc(s.tag)}</label>
      <textarea id="ans-${where}-${id}" name="answer" data-draft="1" autocomplete="off" placeholder="Write an answer… e.g. “Yes, but skip the tests”">${esc(ui.draft)}</textarea>
      <div class="acts"><button type="button" class="btn sm you" data-act="send-answer" data-sid="${id}">Send Answer</button><button type="button" class="btn sm" data-act="cancel-answer">Cancel</button></div></div>`;
    } else if (ui.confirm === id) {
      h += confirmHTML(s);
    } else {
      h += `<div class="acts"><button type="button" class="btn sm you" data-act="answer" data-sid="${id}">Answer</button>${where === 'rail' ? `<button type="button" class="btn sm" data-act="open" data-sid="${id}">Open Session</button>` : ''}<button type="button" class="btn sm" data-act="stop" data-sid="${id}">Stop</button></div>`;
    }
    return h + '</div>';
  }
  if (s.state === 'working' || s.state === 'quiet') {
    if (ui.confirm === id) return `<div class="wait">${confirmHTML(s)}</div>`;
    if (where === 'drawer') return `<div class="acts"><button type="button" class="btn sm" data-act="stop" data-sid="${id}">Stop Session</button></div>`;
  }
  return '';
};
const confirmHTML = s => `<div class="confirm" role="alertdialog" aria-label="Confirm stop">Stop ${esc(s.tag)}? <button type="button" class="btn sm danger" data-act="stop-yes" data-sid="${s.id}">Stop Session</button><button type="button" class="btn sm" data-act="stop-no">Keep Running</button></div>`;

const sessionDrawer = id => {
  const s = A.view(id); if (!s) return null;
  const st = A.st, hue = hueOf[id];
  const steps = stepsOf(D.sessionById[id] || { steps: [] }).slice(-7);
  const kids = childrenOf[id] || [];
  const run = s.helpersRunning || [];
  const byKind = {}; run.forEach(h => { const k = byKind[h.kind] = byKind[h.kind] || { n: 0, model: h.model }; k.n++; });
  const head = `<div style="flex:1;min-width:0"><h2 id="dr-title" tabindex="-1"><span translate="no">${tagH(id)}</span> ${esc(s.name)}</h2><div class="sub">${stateHTML(s)}${s.tokens ? `<span class="num">${tok(s.tokens)} tokens</span>` : ''}</div></div>
    <button type="button" class="btn sm" data-act="open-cc" data-sid="${id}">Open in App <svg class="ic" style="width:13px;height:13px" aria-hidden="true"><use href="#i-ext"/></svg></button>
    <button type="button" class="btn icon sm" data-act="close" aria-label="Close Panel"><svg class="ic" aria-hidden="true"><use href="#i-x"/></svg></button>`;
  let b = A.actionsHTML(s, 'drawer');
  b += `<section aria-labelledby="d-steps"><h3 id="d-steps">Steps${s.stepCount ? ` <span class="num">${s.stepIndex} of ${s.stepCount}</span>` : ''}</h3>${s.stepCount ? `<div class="bar" style="--h:${hue}"><i style="width:${Math.min(100, s.stepIndex / s.stepCount * 100)}%"></i></div>` : ''}
    ${steps.length ? `<ul class="list" style="margin-top:8px">${steps.map((x, i) => `<li class="${i === steps.length - 1 && s.state !== 'ended' ? 'cur' : 'done'}"><span class="when num">${fmtT(x[0])}</span><svg class="mi" style="color:${i === steps.length - 1 && s.state !== 'ended' ? hue : 'var(--ink3)'}" aria-hidden="true"><use href="#${i === steps.length - 1 && s.state !== 'ended' ? 'm-work' : 'i-test'}"/></svg><span class="txt" title="${esc(x[1])}">${esc(x[1])}</span></li>`).join('')}</ul>` : `<p class="empty">No steps yet.</p>`}</section>`;
  b += `<section aria-labelledby="d-help"><h3 id="d-help">Helpers</h3>${Object.keys(byKind).length ? `<div class="chiprow">${Object.keys(byKind).map(k => `<span class="pill" data-m="${byKind[k].model}"><i></i>${esc(k)}${byKind[k].n > 1 ? ' ×' + byKind[k].n : ''}</span>`).join('')}</div>` : `<p class="empty">None running.</p>`}<p class="num" style="margin:8px 0 0;font-weight:600;color:var(--ink2)">${s.helpersDone || 0} Finished</p></section>`;
  if (s.marks && s.marks.length) b += `<section aria-labelledby="d-trouble"><h3 id="d-trouble">Trouble</h3><ul class="list">${s.marks.slice(0, 8).map(m => `<li><button type="button" class="rowbtn" data-act="open-part" data-part="${m.part}" data-ev="${esc(markKey(m))}">${glyph(m.result)}<span class="txt">${esc((D.partById[m.part] || {}).name || m.part)} · ${RES[m.result]}</span><span class="when num">${fmtT(m.t)}</span></button></li>`).join('')}</ul></section>`;
  if (s.parts && s.parts.length) b += `<section aria-labelledby="d-parts"><h3 id="d-parts">Parts in Use</h3><div class="chiprow">${s.parts.slice(0, 14).map(p => `<button type="button" class="chipbtn" data-act="open-part" data-part="${p}" translate="no">${esc(D.partById[p].name)}</button>`).join('')}</div></section>`;
  const rel = [];
  if (s.parent && D.sessionById[s.parent]) rel.push(`<span class="num" style="font-weight:600;color:var(--ink2)">Started by</span><button type="button" class="chipbtn" data-act="open" data-sid="${s.parent}">${tagH(s.parent)}</button>`);
  if (kids.length) rel.push(`<span class="num" style="font-weight:600;color:var(--ink2)">Started</span>${kids.map(k => `<button type="button" class="chipbtn" data-act="open" data-sid="${k}">${tagH(k)}</button>`).join('')}`);
  if (rel.length) b += `<section aria-label="Family"><div class="chiprow" style="align-items:center">${rel.join('')}</div></section>`;
  return { head, body: b, sig: [s.state, s.stepIndex, run.length, s.helpersDone, (s.marks || []).length, A.ui.confirm, A.ui.answering, !!A.OV[id]].join('|') };
};
const partDrawer = id => {
  const p = D.partById[id]; if (!p) return null;
  const evs = (evByPart[id] || []).filter(e => e.t <= R.m);
  const cnt = { passed: 0, refused: 0, failed: 0, 'not-on': 0 }; evs.forEach(e => { cnt[e.result] += e.n || 1; });
  const recent = evs.slice().reverse().slice(0, 11);
  const users = (A.st.partUse[id] || A.st.hookUse[id] || []);
  const isHook = id.startsWith('hook:');
  const file = p.file.startsWith('(') ? '' : p.file;
  const head = `<div style="flex:1;min-width:0"><h2 id="dr-title" tabindex="-1" translate="no">${esc(p.name)}</h2><div class="sub"><svg class="ic" aria-hidden="true"><use href="#${iconOf(p)}"/></svg><span class="state">${esc(p.group)}${p.model ? ' · ' + p.model : ''}</span></div></div>
    <button type="button" class="btn icon sm" data-act="close" aria-label="Close Panel"><svg class="ic" aria-hidden="true"><use href="#i-x"/></svg></button>`;
  let b = `<section aria-label="File">${file ? `<div class="path" translate="no">${esc(file)}</div>` : `<div class="path" translate="no">${esc(p.name)}</div>`}
    <div class="acts" style="margin-top:10px"><button type="button" class="btn ${A.opener === 'vscode' ? 'primary' : ''}" data-act="open-file" data-part="${id}" data-with="vscode">Open in VS Code</button><button type="button" class="btn ${A.opener === 'pane' ? 'primary' : ''}" data-act="open-file" data-part="${id}" data-with="pane">Open in File Pane</button></div></section>`;
  b += `<section aria-label="Counts"><div class="counts"><div><b class="num">${cnt.passed}</b>${isHook ? 'Passed' : 'Calls'}</div><div><b class="num" style="color:var(--refuse-ink)">${cnt.refused}</b>Refused</div><div><b class="num" style="color:var(--fail)">${cnt.failed}</b>Failed</div>${cnt['not-on'] ? `<div><b class="num">${cnt['not-on']}</b>Not On</div>` : ''}</div></section>`;
  if (users.length) b += `<section aria-labelledby="d-use"><h3 id="d-use">In Use by</h3><div class="chiprow">${users.map(u => `<button type="button" class="chipbtn" data-act="open" data-sid="${u}">${tagH(u)}</button>`).join('')}</div></section>`;
  b += `<section aria-labelledby="d-rec"><h3 id="d-rec">Recent</h3>${recent.length ? `<ul class="list">${recent.map(e => { const k = markKey(e); return `<li class="${U.ev === k ? 'hl' : ''}"><span class="when num">${fmtT(e.t)}</span>${glyph(e.result) || '<span class="mi"></span>'}<button type="button" class="rowbtn" style="margin:0" data-act="open" data-sid="${e.session}">${tagH(e.session)}<span class="txt">${RES[e.result]}${e.n > 1 ? ' ×' + e.n : ''}</span></button></li>`; }).join('')}</ul>` : `<p class="empty">Nothing yet.</p>`}</section>`;
  return { head, body: b, sig: [id, cnt.passed, cnt.refused, cnt.failed, users.join(','), U.ev, A.opener].join('|') };
};
A.drawerRefresh = (force) => {
  if (!dr().classList.contains('open')) return;
  const r = U.s ? sessionDrawer(U.s) : U.p ? partDrawer(U.p) : null;
  if (!r) return;
  if (!force && r.sig === drSig) return;
  drSig = r.sig;
  const body = $('#dr-body'), top = body.scrollTop, had = document.activeElement && dr().contains(document.activeElement);
  const key = had && document.activeElement.dataset ? (document.activeElement.dataset.act || document.activeElement.dataset.draft && 'draft') + '|' + (document.activeElement.dataset.sid || document.activeElement.dataset.part || '') : null;
  $('#dr-head').innerHTML = r.head; body.innerHTML = r.body; body.scrollTop = top;
  if (key) { const el = $$('[data-act],[data-draft]', dr()).find(e => ((e.dataset.act || 'draft') + '|' + (e.dataset.sid || e.dataset.part || '')) === key); if (el) el.focus({ preventScroll: true }); }
};
const showDrawer = viaKey => {
  const d = dr(); lastFocus = document.activeElement; drSig = ''; d.removeAttribute('inert'); d.setAttribute('aria-hidden', 'false');
  A.drawerRefresh(true); d.classList.add('open');
  if (viaKey) setTimeout(() => { const h = $('#dr-title'); if (h) h.focus(); }, 30);
};
A.closeDrawer = () => {
  const d = dr(); if (!d.classList.contains('open')) return;
  d.classList.remove('open'); d.setAttribute('aria-hidden', 'true'); d.setAttribute('inert', '');
  U.s = null; U.p = null; U.ev = null; A.target = null; A.ui.confirm = null; A.ui.answering = null; updateDock(); A.syncUrl(); A.mods.now.focusSession(null); A.refresh();
  if (lastFocus && document.contains(lastFocus) && lastFocus !== document.body) lastFocus.focus({ preventScroll: true });
};
A.markSeenSession = id => { A.st && A.st.marks.forEach(m => { if (m.session === id) A.seen.add(markKey(m)); }); };
A.openSession = (id, viaKey) => {
  if (!D.sessionById[id] && !A.userById[id]) return;
  U.s = id; U.p = null; U.ev = null; A.target = A.userById[id] ? null : id; A.markSeenSession(id); updateDock(); A.syncUrl();
  A.mods.now.focusSession(id); showDrawer(viaKey); A.refresh();
};
A.openPart = (id, evKey, viaKey) => {
  U.p = id; U.s = null; U.ev = evKey || null; A.target = null; A.ui.confirm = null;
  A.st && A.st.marks.forEach(m => { if (m.part === id) A.seen.add(markKey(m)); });
  updateDock(); A.syncUrl(); A.mods.now.focusSession(null); showDrawer(viaKey); A.refresh();
  if (U.page === 'history' && A.mods.history.selectEvent) A.mods.history.selectEvent(evKey);
};
A.openFile = (id, how) => {
  const p = D.partById[id]; if (!p) return; const w = how || A.opener;
  const label = p.file.startsWith('(') ? `<code translate="no">${esc(p.name)}</code>` : `<code translate="no">${esc(p.file)}</code>`;
  A.toast(`Opened ${label} in ${w === 'vscode' ? 'VS Code' : 'File Pane'}`);
  A.mods.now.flash(id);
  if (w === 'pane') A.openPart(id);
};

/* ---------- operating: answer, stop, prompt ---------- */
A.answer = (id, text) => {
  const s = A.view(id); if (!s) return;
  A.OV[id] = Object.assign(A.OV[id] || {}, { answered: R.m, text }); A.ui.answering = null; A.ui.draft = '';
  A.toast(`Sent to ${esc(s.tag)}: “${esc(text.length > 48 ? text.slice(0, 47) + '…' : text)}”`);
  A.say('Answer sent to ' + s.tag); A.refresh();
  if (U.s === id) A.drawerRefresh(true);
};
A.stop = id => {
  const s = A.view(id); if (!s) return;
  A.OV[id] = Object.assign(A.OV[id] || {}, { stopped: R.m }); A.ui.confirm = null;
  A.toast(`Stopped ${esc(s.tag)}`, { undo: () => { if (A.OV[id]) delete A.OV[id].stopped; A.refresh(); if (U.s === id) A.drawerRefresh(true); }, ms: 8000 });
  A.refresh(); if (U.s === id) A.drawerRefresh(true);
};
const updateDock = () => {
  const s = A.target ? A.view(A.target) : null;
  $('#to-name').textContent = s ? s.tag : 'New Session';
  $('#to-chip').classList.toggle('you', !!s);
  $('#to-chip').setAttribute('aria-label', s ? `Prompt target: ${s.tag}. Activate to prompt a new session instead.` : 'Prompt target: New Session. Choose a session on the left to prompt it.');
  $('#send-lbl').textContent = s ? 'Send to ' + s.tag : 'Start Session';
};
const submitDock = e => {
  e.preventDefault();
  const ta = $('#prompt'), err = $('#prompt-err'), btn = $('#send'), text = ta.value.trim();
  if (btn.getAttribute('aria-busy') === 'true') return;
  if (!text) { err.textContent = 'Write a prompt first, then press Start Session.'; err.hidden = false; ta.focus(); return; }
  err.hidden = true; btn.setAttribute('aria-busy', 'true');
  const target = A.target, lbl = $('#send-lbl'), old = lbl.textContent;
  lbl.innerHTML = '<span class="spin" aria-hidden="true"></span> ' + (target ? 'Sending…' : 'Starting…');
  setTimeout(() => {
    btn.removeAttribute('aria-busy'); ta.value = ''; ta.style.height = '';
    if (target) { const s = A.view(target); if (s && s.state === 'waiting') A.answer(target, text); else A.toast(`Sent to ${esc(s ? s.tag : '')}: “${esc(text.length > 48 ? text.slice(0, 47) + '…' : text)}”`); }
    else {
      const id = 'u' + (A.userSessions.length + 1); hueOf[id] = HUES[7];
      const u = { id, tag: 'NEW', name: text.length > 60 ? text.slice(0, 59) + '…' : text, state: 'working', user: true, step: 'Starting…', stepIndex: 0, stepCount: 0, helpersRunning: [], helpersDone: 0, tokens: 0, parts: [], hooks: [], marks: [], parent: null, started: R.m };
      A.userSessions.unshift(u); A.userById[id] = u; A.toast(`Started a new session: “${esc(u.name)}”`); A.say('Started a new session');
    }
    updateDock(); A.refresh();
  }, 900);
};
addEventListener('beforeunload', e => { if ($('#prompt') && $('#prompt').value.trim()) { e.preventDefault(); e.returnValue = ''; } });

/* ---------- routing ---------- */
A.showPage = (p, noUrl) => {
  U.page = p;
  $('#page-now').hidden = p !== 'now'; $('#page-history').hidden = p !== 'history';
  $$('.tabs a').forEach(a => { if (a.dataset.page === p) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  A.mods[p].show(); R.force = true; if (!noUrl) A.syncUrl();
};

/* ---------- events ---------- */
const onClick = e => {
  const t = e.target.closest('[data-act]'); if (!t) return;
  const act = t.dataset.act, id = t.dataset.sid, key = e.detail === 0;
  switch (act) {
    case 'open': A.openSession(id, key); break;
    case 'open-part': A.openPart(t.dataset.part, t.dataset.ev, key); break;
    case 'open-file': A.openFile(t.dataset.part, t.dataset.with); break;
    case 'open-cc': A.toast(`Opened ${esc(A.view(id).tag)} in Claude Code`); break;
    case 'close': A.closeDrawer(); break;
    case 'answer': A.ui.answering = id; A.ui.confirm = null; A.target = id; updateDock(); A.refresh(); A.drawerRefresh(true); setTimeout(() => { const ta = $('textarea[data-draft]'); if (ta) ta.focus({ preventScroll: true }); }, 30); break;
    case 'cancel-answer': A.ui.answering = null; A.refresh(); A.drawerRefresh(true); break;
    case 'quick': A.answer(id, t.dataset.text); break;
    case 'send-answer': { const ta = t.closest('.answer').querySelector('textarea'); const v = ta.value.trim(); if (!v) { ta.focus(); ta.placeholder = 'Write an answer first…'; return; } A.answer(id, v); break; }
    case 'stop': A.ui.confirm = id; A.ui.answering = null; A.refresh(); A.drawerRefresh(true); setTimeout(() => { const b = $('[data-act="stop-no"]'); if (b) b.focus({ preventScroll: true }); }, 30); break;
    case 'stop-yes': A.stop(id); break;
    case 'stop-no': A.ui.confirm = null; A.refresh(); A.drawerRefresh(true); break;
  }
};
const onInput = e => { if (e.target.dataset && e.target.dataset.draft) A.ui.draft = e.target.value; };
const onKey = e => {
  if (e.key === 'Escape') {
    if (A.ui.confirm || A.ui.answering) { A.ui.confirm = null; A.ui.answering = null; A.refresh(); A.drawerRefresh(true); return; }
    if (dr().classList.contains('open')) { A.closeDrawer(); return; }
  }
  const tg = e.target, typing = tg.matches && tg.matches('input,textarea,select,[contenteditable]');
  if (e.key === '/' && !typing && !e.metaKey && !e.ctrlKey) { e.preventDefault(); $('#prompt').focus(); }
};

A.start = () => {
  readUrl();
  A.opener = store.get('st.opener') === 'vscode' ? 'vscode' : 'pane';
  $$('#opener input').forEach(i => { i.checked = i.value === A.opener; i.addEventListener('change', () => { A.opener = i.value; store.set('st.opener', i.value); A.toast('Parts now open in ' + (i.value === 'vscode' ? 'VS Code' : 'File Pane')); A.drawerRefresh(true); }); });
  const sp = $('#speed'); sp.value = String(R.speed); if (!$$('#speed option').some(o => +o.value === R.speed)) sp.value = '10';
  sp.addEventListener('change', () => { R.speed = +sp.value; });
  $('#play').addEventListener('click', () => setPlaying(!R.playing));
  $('#scrub').addEventListener('input', e => { R.m = +e.target.value; R.force = true; });
  $('#scrub').setAttribute('aria-valuetext', '');
  $$('.tabs a').forEach(a => a.addEventListener('click', e => { if (e.metaKey || e.ctrlKey || e.shiftKey || e.button) return; e.preventDefault(); A.showPage(a.dataset.page); }));
  document.addEventListener('click', onClick); document.addEventListener('input', onInput); document.addEventListener('keydown', onKey);
  $('#dock').addEventListener('submit', submitDock);
  $('#prompt').addEventListener('input', () => { $('#prompt-err').hidden = true; });
  $('#prompt').addEventListener('keydown', e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); $('#dock').requestSubmit(); } });
  $('#to-chip').addEventListener('click', () => { if (A.target) { A.target = null; updateDock(); A.toast('Next prompt starts a new session'); } else $('#prompt').focus(); });
  Object.values(A.mods).forEach(m => m.init && m.init());
  setPlaying(R.playing);
  updateDock();
  A.showPage(U.page, true);
  tick();
  if (U.s) { A.openSession(U.s); } else if (U.p) { A.openPart(U.p, U.ev); }
  if (window.ResizeObserver) new ResizeObserver(() => { cancelAnimationFrame(A._rz); A._rz = requestAnimationFrame(() => { const md = mod(); md && md.resize && md.resize(); }); }).observe($('main'));
  requestAnimationFrame(ts => { R.last = ts; frame(ts); });
};
})();
