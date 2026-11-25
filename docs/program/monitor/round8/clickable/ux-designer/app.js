/* Session tool: shared parts. Clock, state, toasts, drawer, popover, search, dock. Front end only, dummy data. */
'use strict';
(function () {
  const D = window.TOOL_DATA;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const HUES = ['#0b7a7c', '#6a3fc0', '#2f7d2f', '#a02f7e', '#8a5f12', '#4d6783', '#5f6d12', '#8f3f6a'];
  const sIdx = {}; D.sessions.forEach((s, i) => { sIdx[s.id] = i; });
  const hue = id => (sIdx[id] != null ? HUES[sIdx[id] % HUES.length] : '#3a3a38');
  const T0 = D.replayStart, T1 = D.replayEnd;
  const hm = m => { m = ((Math.round(m) % 1440) + 1440) % 1440; return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); };
  const dur = x => { x = Math.max(0, Math.round(x)); return x < 60 ? x + ' min' : Math.floor(x / 60) + ' h ' + String(x % 60).padStart(2, '0') + ' min'; };
  const tok = n => n >= 1e8 ? Math.round(n / 1e6) + ' M' : n >= 1e6 ? (n / 1e6).toFixed(1) + ' M' : n >= 1e3 ? Math.round(n / 1e3) + ' K' : String(n | 0);
  const GL = {
    f: '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M6 1 11.4 10.8H.6Z" fill="currentColor"/></svg>',
    r: '<svg viewBox="0 0 12 12" aria-hidden="true"><circle cx="6" cy="6" r="5.4" fill="currentColor"/><rect x="2.8" y="5.1" width="6.4" height="1.8" rx=".5" fill="#fff"/></svg>',
    n: '<svg viewBox="0 0 12 12" aria-hidden="true"><circle cx="6" cy="6" r="4.8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-dasharray="2.4 1.8"/></svg>'
  };
  const RK = { failed: 'f', refused: 'r', 'not-on': 'n' };
  const RW = { failed: 'failed', refused: 'refused', 'not-on': 'was not on' };
  const Q = new URLSearchParams(location.search);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let openIn = 'pane';
  try { openIn = localStorage.getItem('st.openIn') || 'pane'; } catch (e) { }
  if (Q.get('openin')) openIn = Q.get('openin');

  const S = { m: T0 + 190, playing: true, speed: 4, page: 'now', sel: null, snap: null, lastMi: -1, dirty: true, seen: new Set(), answered: {}, stopped: {}, extras: [], openIn, view: null, hover: null };
  const subs = { tick: [], frame: [], sel: [], page: [] };
  const on = (e, f) => subs[e].push(f);
  const emit = (e, a) => subs[e].forEach(f => { try { f(a); } catch (err) { fail(err); } });
  function fail(err) { const b = document.body; b.setAttribute('data-err', (b.getAttribute('data-err') || '') + ' | ' + (err && err.stack ? err.stack.split('\n').slice(0, 3).join(' / ') : err)); console.error(err); }
  window.addEventListener('error', e => fail(e.message + ' @' + (e.filename || '').split('/').pop() + ':' + e.lineno));

  /* ---- events indexed by part ---- */
  const evByPart = {}, trouble = [];
  D.events.forEach((e, i) => { e.i = i; (evByPart[e.part] = evByPart[e.part] || []).push(e); if (e.result !== 'passed') trouble.push(e); });
  function partStats(id) {
    const a = evByPart[id] || []; const st = { passes: 0, refused: 0, failed: 0, noton: 0, last: [] };
    a.forEach(e => { if (e.result === 'passed') st.passes += e.n || 1; else if (e.result === 'refused') st.refused++; else if (e.result === 'failed') st.failed++; else st.noton++; });
    st.last = a.filter(e => e.result !== 'passed' && e.t <= S.m).slice(-3).reverse();
    return st;
  }
  const mkKey = m => m.t + '|' + m.session + '|' + m.part;

  /* ---- view: the snapshot with his own answers, stops and new sessions laid over ---- */
  function computeView() {
    const sn = S.snap, list = [];
    for (const s of sn.sessions) {
      const o = Object.assign({}, s), meta = D.sessionById[s.id];
      o.start = meta.start; o.end = meta.end;
      if (S.stopped[s.id] != null) { o.state = 'ended'; o.stopped = true; o.wait = null; }
      else if (S.answered[s.id]) { if (s.state === 'waiting') { o.state = 'working'; o.answered = true; o.wait = null; } else delete S.answered[s.id]; }
      list.push(o);
    }
    S.extras.forEach(e => list.push(e));
    const c = { working: 0, waiting: 0, quiet: 0, ended: 0, helpers: sn.counts.helpers };
    list.forEach(s => { c[s.state]++; });
    S.view = { sessions: list, counts: c, marks: sn.marks.filter(m => !S.seen.has(mkKey(m))), snap: sn };
  }
  function sessView(id) {
    const v = S.view && S.view.sessions.find(s => s.id === id);
    if (v) return v;
    const m = D.sessionById[id];
    return m ? { id, tag: m.tag, name: m.name, state: 'ended', step: '', stepIndex: m.plan.length, stepCount: m.plan.length, helpersRunning: [], helpersDone: m.helpers.length, tokens: m.tokensTotal, parts: [], hooks: [], marks: [], parent: m.parent, start: m.start, end: m.end, wait: null, gone: true } : null;
  }

  /* ---- replay clock ---- */
  let lastT = performance.now();
  function frame(now) {
    const dt = Math.min(0.25, (now - lastT) / 1000); lastT = now;
    if (S.playing && !S.drag) {
      S.m = Math.min(S.m + dt * S.speed, T1);
      if (S.m >= T1) { S.playing = false; syncPlay(); toast('Replay reached 14:45', { act: 'Start again', fn: () => { seek(T0 + 190); S.playing = true; syncPlay(); } }); }
    }
    const mi = Math.floor(S.m);
    if (mi !== S.lastMi || S.dirty) { S.snap = D.stateAt(mi); S.lastMi = mi; S.dirty = false; computeView(); emit('tick'); announce(); }
    emit('frame');
    requestAnimationFrame(frame);
  }
  function seek(m) { S.m = Math.max(T0, Math.min(T1, m)); S.dirty = true; }
  function syncPlay() {
    document.body.classList.toggle('paused', !S.playing);
    $('#playBtn').innerHTML = S.playing ? '<svg width="14" height="14" viewBox="0 0 14 14"><rect x="2" y="1" width="3.6" height="12" rx="1" fill="currentColor"/><rect x="8.4" y="1" width="3.6" height="12" rx="1" fill="currentColor"/></svg>' : '<svg width="14" height="14" viewBox="0 0 14 14"><path d="M3 1.4v11.2L12.4 7z" fill="currentColor"/></svg>';
    $('#playBtn').setAttribute('aria-label', S.playing ? 'Pause the replay' : 'Play the replay');
    $('#liveDot').title = S.playing ? 'Replaying Tuesday 24 November' : 'Paused: this is not live';
  }
  let lastWaiting = '', lastTr = 0;
  function announce() { // screen reader: only what needs him
    const w = S.view.sessions.filter(s => s.state === 'waiting').map(s => s.tag).join(',');
    if (w !== lastWaiting) { if (w) $('#sr').textContent = w + ' waits for you'; lastWaiting = w; }
  }

  /* ---- toast: newest on top, three at most; one with an action stays until closed ---- */
  function toast(msg, o) {
    o = o || {};
    const box = $('#toasts'), t = document.createElement('div');
    t.className = 'toast'; t.setAttribute('role', 'status');
    t.innerHTML = '<span>' + esc(msg) + (o.sub ? '<small>' + esc(o.sub) + '</small>' : '') + '</span>';
    const close = () => { t.remove(); };
    if (o.act) { const b = document.createElement('button'); b.textContent = o.act; b.onclick = () => { try { o.fn && o.fn(); } finally { close(); } }; t.appendChild(b); }
    const x = document.createElement('button'); x.className = 'x'; x.setAttribute('aria-label', 'Close'); x.textContent = '✕'; x.onclick = close; t.appendChild(x);
    box.prepend(t);
    while (box.children.length > 3) box.lastChild.remove();
    if (!o.act) setTimeout(close, o.ms || 5000);
  }

  /* ---- popover ---- */
  const pop = $('#pop');
  function showPop(anchor, html, after) {
    pop.innerHTML = ''; if (typeof html === 'string') pop.innerHTML = html; else pop.appendChild(html);
    pop.hidden = false;
    const r = anchor.getBoundingClientRect ? anchor.getBoundingClientRect() : { left: anchor.x, right: anchor.x, top: anchor.y, bottom: anchor.y, width: 0, height: 0 };
    const pw = pop.offsetWidth, ph = pop.offsetHeight;
    let x = r.left + r.width / 2 - pw / 2, y = r.bottom + 10;
    if (y + ph > innerHeight - 76) y = Math.max(64, r.top - ph - 10);
    x = Math.max(12, Math.min(innerWidth - pw - 12, x));
    pop.style.left = x + 'px'; pop.style.top = y + 'px';
    if (after) after(pop);
  }
  function hidePop() { pop.hidden = true; pop.innerHTML = ''; }
  document.addEventListener('pointerdown', e => { if (!pop.hidden && !pop.contains(e.target) && !e.target.closest('[data-keeppop]')) hidePop(); }, true);

  /* ---- reply box (used on the card popover and in the drawer) ---- */
  function replyBox(id) {
    const s = sessView(id), w = s.wait || {};
    const el = document.createElement('div'); el.className = 'reply';
    el.innerHTML = '<q>' + esc((w.report || '').slice(0, 170)) + '</q><strong>' + esc(w.question || 'Shall I go on?') + '</strong>' +
      '<div class="row"><button class="btn primary sm" data-q="Yes, go on">Yes, go on</button><button class="btn sm" data-q="Not yet, wait">Not yet</button></div>' +
      '<textarea rows="2" placeholder="Or write an answer" aria-label="Answer to ' + esc(s.tag) + '"></textarea>' +
      '<div class="row"><button class="btn primary sm" data-send disabled>Send answer</button><button class="btn danger sm" data-stop>Stop ' + esc(s.tag) + '</button></div>';
    const ta = $('textarea', el), sb = $('[data-send]', el);
    ta.oninput = () => { sb.disabled = !ta.value.trim(); };
    el.onclick = e => {
      const q = e.target.closest('[data-q]');
      if (q) return sendAnswer(id, q.dataset.q);
      if (e.target.closest('[data-send]')) return sendAnswer(id, ta.value.trim());
      if (e.target.closest('[data-stop]')) return confirmStop(id, el);
    };
    return el;
  }
  function sendAnswer(id, text) {
    const s = sessView(id); S.answered[id] = true; S.dirty = true; hidePop();
    toast('Answer sent to ' + s.tag, { sub: text });
    if (S.sel === id) renderDrawer();
  }
  function confirmStop(id, host) {
    const s = sessView(id);
    const c = document.createElement('div'); c.className = 'row'; c.style.marginTop = '8px';
    c.innerHTML = '<b>Stop ' + esc(s.tag) + '?</b><button class="btn danger sm" data-y>Stop it</button><button class="btn sm" data-n>Keep it</button>';
    host.appendChild(c);
    c.onclick = e => { if (e.target.closest('[data-y]')) doStop(id); else if (e.target.closest('[data-n]')) c.remove(); };
  }
  function doStop(id) {
    const s = sessView(id); S.stopped[id] = S.m; S.dirty = true; hidePop();
    toast('Stopped ' + s.tag, { act: 'Undo', fn: () => { delete S.stopped[id]; S.dirty = true; if (S.sel === id) renderDrawer(); } });
    if (S.sel === id) renderDrawer();
  }

  /* ---- drawer: a session (stand-in for going to it in the app) or a file (the app's file pane) ---- */
  const drawer = $('#drawer');
  let dmode = null;
  function openSession(id) {
    const s = sessView(id); if (!s) return;
    S.sel = id; dmode = { k: 's', id }; hidePop();
    D.events.length; S.view.marks.filter(m => m.session === id).forEach(m => S.seen.add(mkKey(m))); S.dirty = true;
    renderDrawer(); drawer.hidden = false; requestAnimationFrame(() => drawer.classList.add('open'));
    emit('sel', id); syncTarget();
    toast('Opened ' + s.tag + ' in the app', { ms: 3000 });
  }
  function closeDrawer() { drawer.classList.remove('open'); dmode = null; setTimeout(() => { if (!dmode) drawer.hidden = true; }, 280); if (S.sel) { S.sel = null; emit('sel', null); syncTarget(); } }
  function renderDrawer() {
    if (!dmode) return;
    if (dmode.k === 'f') return;
    const s = sessView(dmode.id); if (!s) return;
    const meta = D.sessionById[s.id], plan = meta ? meta.plan : [];
    const cur = s.state === 'ended' ? plan.length + 1 : (s.stepIndex || 1);
    const marks = (S.view.snap.marks || []).filter(m => m.session === s.id).slice(0, 6);
    const stateTxt = { working: 'Working', waiting: 'Waits for you · ' + dur(S.m - (s.since || S.m)), quiet: 'Quiet · ' + dur(S.m - (s.since || S.m)), ended: s.stopped ? 'Stopped by you' : 'Ended ' + (s.end ? hm(s.end) : '') }[s.state];
    let h = '<div class="d-head"><span class="tag" style="--h:' + hue(s.id) + '">' + esc(s.tag) + '</span><h2>' + esc(s.name) + '</h2><button class="d-x" aria-label="Close" data-close>✕</button></div>';
    h += '<div class="d-state"><span>' + esc(stateTxt) + '</span><span style="margin-left:auto;color:var(--ink3)">' + esc(tok(s.tokens || 0)) + ' tokens</span></div>';
    if (s.state === 'waiting' && s.wait) h += '<div class="d-sec" id="dReply"></div>';
    if (plan.length) h += '<div class="d-sec"><h3>Plan</h3><ul class="steps">' + plan.map((p, i) => { const c = i + 1 < cur ? 'done' : i + 1 === cur ? 'cur' : ''; return '<li class="' + c + '"><span class="ck">' + (c === 'done' ? '✓' : c === 'cur' ? '●' : '○') + '</span><span>' + esc(p.text) + '</span></li>'; }).join('') + '</ul></div>';
    if (s.helpersRunning && s.helpersRunning.length) h += '<div class="d-sec"><h3>Helpers running</h3><div class="row">' + s.helpersRunning.map(x => '<span class="pill"><i class="' + x.model + '"></i>' + esc(x.kind) + ' · ' + esc(x.model) + ' · ' + dur(S.m - x.start) + '</span>').join('') + '</div></div>';
    if (marks.length) h += '<div class="d-sec"><h3>What broke</h3>' + marks.map(m => '<div class="mk" data-part="' + esc(m.part) + '"><span class="g ' + RK[m.result] + '">' + GL[RK[m.result]] + '</span><span>' + esc((D.partById[m.part] || {}).name) + ' ' + RW[m.result] + '</span><span class="t">' + hm(m.t) + '</span></div>').join('') + '</div>';
    if (s.state !== 'ended' && s.state !== 'waiting') h += '<div class="d-sec"><button class="btn danger sm" data-stop>Stop ' + esc(s.tag) + '</button></div>';
    if (s.state === 'ended' && s.stopped) h += '<div class="d-sec"><button class="btn sm" data-undostop>Undo stop</button></div>';
    const keep = $('textarea', drawer) && drawer.contains(document.activeElement) ? { v: $('textarea', drawer).value } : null;
    if (keep && !$('#dReply', drawer)) { /* typing elsewhere: leave the drawer as it is */ }
    const sig = h.replace(/\d+ min|\d+ h \d+ min/g, '');
    if (drawer._sig === sig && !drawer._force) { drawer._force = false; return; }
    drawer._sig = sig;
    drawer.innerHTML = h;
    const slot = $('#dReply', drawer); if (slot) slot.appendChild(replyBox(s.id));
    drawer.onclick = e => {
      if (e.target.closest('[data-close]')) return closeDrawer();
      const mk = e.target.closest('[data-part]'); if (mk) return inspectPart(mk.dataset.part, mk);
      if (e.target.closest('[data-stop]')) return confirmStop(s.id, e.target.closest('.d-sec'));
      if (e.target.closest('[data-undostop]')) { delete S.stopped[s.id]; S.dirty = true; drawer._sig = ''; renderDrawer(); }
    };
  }
  function openPart(id, anchor) {
    const p = D.partById[id]; if (!p) return; hidePop();
    if (S.openIn === 'vscode') { toast('Opened in VS Code', { sub: p.file }); return; }
    dmode = { k: 'f', id };
    let h = '<div class="d-head"><div><h2>' + esc(p.name) + '</h2><div style="color:var(--ink3);font-size:13.5px">' + esc(p.group) + '</div></div><button class="d-x" aria-label="Close" data-close>✕</button></div>';
    h += '<div class="path">' + esc(p.file) + '</div><div class="d-sec">' + [92, 78, 86, 54, 90, 70, 38, 82, 64, 88, 46].map(w => '<div class="skel" style="width:' + w + '%"></div>').join('') + '</div>';
    drawer.innerHTML = h; drawer._sig = ''; drawer.hidden = false; requestAnimationFrame(() => drawer.classList.add('open'));
    drawer.onclick = e => { if (e.target.closest('[data-close]')) closeDrawer(); };
    toast('Opened in the file pane', { sub: p.file, ms: 3000 });
  }
  function inspectPart(id, anchor) {
    const p = D.partById[id]; if (!p) return; const st = partStats(id);
    const using = (S.snap.partUse[id] || S.snap.hookUse[id] || []).map(sid => sessView(sid)).filter(Boolean);
    let h = '<h4>' + esc(p.name) + '</h4><div class="sub">' + esc(p.group) + (p.model ? ' · ' + esc(p.model) : '') + '</div><div class="path">' + esc(p.file) + '</div>';
    if (st.passes + st.refused + st.failed + st.noton) h += '<div class="stat"><div><b>' + st.passes + '</b><span>let through</span></div><div><b style="color:var(--amber)">' + st.refused + '</b><span>refused</span></div><div><b style="color:var(--red)">' + st.failed + '</b><span>failed</span></div></div>';
    else h += '<div class="stat"><div><b style="color:var(--ink3)">0</b><span>times it acted today</span></div></div>';
    if (st.last.length) h += st.last.map(e => '<div class="mk" data-sess="' + e.session + '"><span class="g ' + RK[e.result] + '">' + GL[RK[e.result]] + '</span><span>' + RW[e.result] + ' · ' + esc((sessView(e.session) || {}).tag) + '</span><span class="t">' + hm(e.t) + '</span></div>').join('');
    if (using.length) h += '<div class="row" style="margin:8px 0">' + using.map(u => '<button class="tag" style="--h:' + hue(u.id) + ';border:0;cursor:pointer" data-sess="' + u.id + '">' + esc(u.tag) + '</button>').join('') + '<span style="color:var(--ink3);font-size:13px">at work on it</span></div>';
    h += '<div class="row" style="margin-top:12px"><button class="btn primary sm" data-open>Open in ' + (S.openIn === 'vscode' ? 'VS Code' : 'the file pane') + '</button><button class="btn sm" data-copy>Copy path</button></div>';
    showPop(anchor, h, el => {
      el.onclick = e => {
        if (e.target.closest('[data-open]')) return openPart(id);
        if (e.target.closest('[data-copy]')) { try { navigator.clipboard.writeText(p.file); } catch (x) { } return toast('Path copied', { sub: p.file, ms: 2500 }); }
        const s = e.target.closest('[data-sess]'); if (s) openSession(s.dataset.sess);
      };
    });
  }

  /* ---- jump search: any session or part in two keystrokes ---- */
  const jump = $('#jump'), jl = $('#jumpList'); let jitems = [], jsel = 0;
  function jumpRun() {
    const q = jump.value.trim().toLowerCase();
    const mk = (kind, id, label, sub, tag) => ({ kind, id, label, sub, tag });
    const all = D.sessions.map(s => mk('s', s.id, s.name, s.tag, s.tag)).concat(D.parts.map(p => mk('p', p.id, p.name, p.group, null)));
    jitems = q ? all.filter(x => (x.label + ' ' + x.sub + ' ' + ((D.partById[x.id] || {}).file || '')).toLowerCase().includes(q)).slice(0, 9) : all.filter(x => x.kind === 's').filter(s => { const v = S.view.sessions.find(z => z.id === s.id); return v && v.state !== 'ended'; }).slice(0, 6);
    jsel = 0;
    const hl = t => { if (!q) return esc(t); const i = t.toLowerCase().indexOf(q); return i < 0 ? esc(t) : esc(t.slice(0, i)) + '<mark>' + esc(t.slice(i, i + q.length)) + '</mark>' + esc(t.slice(i + q.length)); };
    let h = '', last = '';
    jitems.forEach((it, i) => {
      const g = it.kind === 's' ? (q ? 'Sessions' : 'Running now') : 'Parts';
      if (g !== last) { h += '<div class="grp">' + g + '</div>'; last = g; }
      h += '<div role="option" id="jo' + i + '" data-i="' + i + '" aria-selected="' + (i === 0) + '">' + (it.tag ? '<span class="tag" style="--h:' + hue(it.id) + '">' + esc(it.tag) + '</span>' : '') + '<span>' + hl(it.label) + '</span><span class="sub">' + (it.kind === 'p' ? esc(it.sub) : '') + '</span></div>';
    });
    if (!jitems.length) h = '<div class="none">Nothing matches “' + esc(jump.value) + '”. Try a tag such as BR1, or a part name.</div>';
    jl.innerHTML = h; jl.hidden = false; jump.setAttribute('aria-expanded', 'true');
  }
  function jumpClose() { jl.hidden = true; jump.setAttribute('aria-expanded', 'false'); }
  function jumpGo(i) {
    const it = jitems[i]; if (!it) return; jumpClose(); jump.value = ''; jump.blur();
    if (it.kind === 's') { if (S.page === 'now' && window.Now) Now.focusSession(it.id); openSession(it.id); }
    else { if (S.page !== 'now') go('now'); setTimeout(() => window.Now && Now.focusPart(it.id), S.page === 'now' ? 0 : 60); }
  }
  jump.addEventListener('input', jumpRun);
  jump.addEventListener('focus', jumpRun);
  jump.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); jsel = (jsel + (e.key === 'ArrowDown' ? 1 : -1) + jitems.length) % Math.max(1, jitems.length); $$('[role=option]', jl).forEach((o, i) => o.setAttribute('aria-selected', i === jsel)); const o = $('#jo' + jsel); if (o) o.scrollIntoView({ block: 'nearest' }); }
    else if (e.key === 'Enter') { e.preventDefault(); jumpGo(jsel); }
    else if (e.key === 'Escape') { jumpClose(); jump.blur(); }
  });
  jl.addEventListener('pointerdown', e => { const o = e.target.closest('[role=option]'); if (o) { e.preventDefault(); jumpGo(+o.dataset.i); } });
  document.addEventListener('pointerdown', e => { if (!e.target.closest('.search')) jumpClose(); });

  /* ---- dock: one prompt box, always in the same place ---- */
  const prompt = $('#prompt'), sendB = $('#send'), tgt = $('#target');
  function syncTarget() {
    const s = S.sel && sessView(S.sel);
    if (s) { tgt.innerHTML = 'To <span class="tag" style="--h:' + hue(s.id) + '">' + esc(s.tag) + '</span> ✕'; prompt.placeholder = s.state === 'waiting' ? 'Answer ' + s.tag : 'Message ' + s.tag; tgt.title = 'Click to write a new session instead'; }
    else { tgt.textContent = 'New session'; prompt.placeholder = 'Prompt a new session'; tgt.title = 'Click a session to write to it'; }
  }
  tgt.onclick = () => { if (S.sel) closeDrawer(); prompt.focus(); };
  prompt.addEventListener('input', () => { sendB.disabled = !prompt.value.trim(); sendB.title = sendB.disabled ? 'Write a message first' : 'Send (Enter)'; prompt.style.height = 'auto'; prompt.style.height = Math.min(96, prompt.scrollHeight) + 'px'; });
  prompt.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } });
  sendB.onclick = send;
  function send() {
    const t = prompt.value.trim(); if (!t) return;
    prompt.value = ''; prompt.style.height = 'auto'; sendB.disabled = true;
    if (S.sel) { const s = sessView(S.sel); if (s.state === 'waiting') return sendAnswer(S.sel, t); toast('Sent to ' + s.tag, { sub: t }); return; }
    const n = S.extras.length + 1;
    S.extras.push({ id: 'new' + n, tag: 'N' + n, name: t.length > 46 ? t.slice(0, 45) + '…' : t, state: 'working', step: 'Starting', stepIndex: 0, stepCount: 0, since: S.m, wait: null, helpersRunning: [], helpersDone: 0, tokens: 0, parts: [], hooks: [], marks: [], parent: null, start: S.m, extra: true });
    S.dirty = true; toast('Started a new session', { sub: t });
  }

  /* ---- header controls, router, keys ---- */
  function go(page) {
    if (S.page === page) return; S.page = page; hidePop();
    document.body.dataset.page = page;
    $('#pageNow').hidden = page !== 'now'; $('#pageHist').hidden = page !== 'history';
    $$('.nav button').forEach(b => b.setAttribute('aria-current', b.dataset.go === page ? 'page' : 'false'));
    emit('page', page);
  }
  function setOpenIn(v) { S.openIn = v; try { localStorage.setItem('st.openIn', v); } catch (e) { } $$('#openIn button').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === v)); }
  function start() {
    if (Q.get('t')) { const [a, b] = Q.get('t').split(':').map(Number); S.m = T0 + a * 60 + (b || 0); }
    if (Q.get('speed')) S.speed = +Q.get('speed');
    if (Q.get('paused')) S.playing = false;
    $$('#speed button').forEach(b => b.setAttribute('aria-pressed', +b.dataset.s === S.speed));
    syncPlay(); setOpenIn(S.openIn);
    $('#playBtn').onclick = () => { S.playing = !S.playing; if (S.playing && S.m >= T1) seek(T0 + 190); syncPlay(); };
    $('#speed').onclick = e => { const b = e.target.closest('button'); if (!b) return; S.speed = +b.dataset.s; $$('#speed button').forEach(x => x.setAttribute('aria-pressed', x === b)); };
    $('#openIn').onclick = e => { const b = e.target.closest('button'); if (b) { setOpenIn(b.dataset.v); toast('Parts now open in ' + (b.dataset.v === 'vscode' ? 'VS Code' : 'the file pane'), { ms: 2500 }); } };
    $$('.nav button').forEach(b => b.onclick = () => go(b.dataset.go));
    on('frame', () => { $('#clockT').textContent = hm(S.m); });
    on('tick', () => { $('#clockD').textContent = S.snap.day; const w = S.view.counts.waiting; const bd = $('#needBadge'); bd.hidden = !w; bd.textContent = w; document.title = (w ? '(' + w + ') ' : '') + 'Session tool'; if (dmode && dmode.k === 's') renderDrawer(); });
    document.addEventListener('keydown', e => {
      const typing = /^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName);
      if (e.key === '/' && !typing) { e.preventDefault(); jump.focus(); }
      else if (e.key === 'Escape') { if (!pop.hidden) hidePop(); else if (dmode) closeDrawer(); else if (S.sel) { S.sel = null; emit('sel', null); syncTarget(); } }
      else if (e.key === ' ' && !typing && !/^(BUTTON|A)$/.test(document.activeElement.tagName)) { e.preventDefault(); $('#playBtn').click(); }
    });
    if (Q.get('page') === 'history') go('history');
    D.sessions.length; // data loaded
    S.snap = D.stateAt(Math.floor(S.m)); computeView();
    mods.forEach(m => m.init && m.init());
    if (Q.get('sel')) { const s = D.sessions.find(x => x.tag === Q.get('sel')); if (s) openSession(s.id); }
    if (Q.get('open')) { const p = D.parts.find(x => x.id === Q.get('open') || x.name === Q.get('open')); if (p) openPart(p.id); }
    requestAnimationFrame(frame);
  }
  const mods = [];
  window.App = { D, $, $$, esc, hue, hm, dur, tok, GL, RK, RW, S, Q, reduced, on, emit, toast, showPop, hidePop, replyBox, sendAnswer, doStop, confirmStop, openSession, closeDrawer, openPart, inspectPart, partStats, evByPart, trouble, mkKey, sessView, seek, go, start, mods, T0, T1 };
})();
