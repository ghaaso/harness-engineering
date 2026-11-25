/* Session tool prototype: shell, clock, router, overlays, prompt bar. Front end only, dummy data (../shared/data.js). */
(function () {
  'use strict';
  var D = window.TOOL_DATA;
  var APP = window.APP = {};
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  function el(tag, attrs, html) {
    var n = document.createElement(tag);
    if (attrs) for (var k in attrs) { if (k === 'class') n.className = attrs[k]; else if (attrs[k] === true) n.setAttribute(k, ''); else if (attrs[k] !== false && attrs[k] != null) n.setAttribute(k, attrs[k]); }
    if (html != null) n.innerHTML = html;
    return n;
  }
  APP.D = D; APP.$ = $; APP.$$ = $$; APP.esc = esc; APP.el = el;

  /* ---------- storage (always in try/catch: it can be blocked) ---------- */
  var KEY = 'session-tool.ui-ux-pro-max.v1';
  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify({ open: S.settings.open, theme: S.settings.theme, zoom: S.zoom })); } catch (e) { /* ignore */ } }

  var q = new URLSearchParams(location.search);
  var saved = load();
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var S = APP.S = {
    page: 'now', minute: 8849, playing: true, speed: 2, held: 0,
    settings: { open: saved.open || 'vscode', theme: q.get('theme') || saved.theme || 'light' },
    zoom: saved.zoom || 1, reduce: reduce,
    seen: {}, answered: {}, stopped: {}, userSessions: [], focusSession: null, lastTickState: null
  };

  /* ---------- formatting ---------- */
  APP.hm = function (m) { return D.hm(((m % 1440) + 1440) % 1440); };
  APP.tok = function (n) { return n >= 1e6 ? (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + ' M' : n >= 1e3 ? Math.round(n / 1e3) + ' K' : String(Math.round(n)); };
  APP.dur = function (min) { min = Math.round(min); if (min < 60) return min + ' min'; var h = Math.floor(min / 60), r = min % 60; return h + ' h' + (r ? ' ' + r + ' min' : ''); };
  APP.icon = window.ICON;

  /* ---------- live announcements and toasts ---------- */
  var live = $('#sr-live'), lastSay = '';
  APP.say = function (t) { if (t !== lastSay) { lastSay = t; live.textContent = t; } };
  APP.toast = function (msg, o) {
    o = o || {};
    var t = el('div', { class: 'toast' }, APP.icon(o.icon || 'check') + '<span>' + esc(msg) + '</span>');
    if (o.action) { var b = el('button', { type: 'button' }, esc(o.action.label)); b.onclick = function () { o.action.fn(); kill(); }; t.appendChild(b); }
    $('#toasts').appendChild(t);
    var timer = setTimeout(kill, o.ms || 4200);
    function kill() { clearTimeout(timer); if (!t.parentNode) return; t.classList.add('out'); setTimeout(function () { t.remove(); }, 180); }
    while ($('#toasts').children.length > 3) $('#toasts').firstChild.remove();
  };

  /* ---------- tooltip (pointer and keyboard) ---------- */
  var tip = $('#tip');
  function showTip(target, x, y) {
    var t = target.getAttribute('data-tip'); if (!t) return;
    tip.innerHTML = t; tip.hidden = false;
    var r = tip.getBoundingClientRect(), W = innerWidth, H = innerHeight;
    var px = Math.min(Math.max(8, x + 14), W - r.width - 8), py = y + 18 + r.height > H ? y - r.height - 12 : y + 18;
    tip.style.left = px + 'px'; tip.style.top = py + 'px';
  }
  document.addEventListener('pointerover', function (e) { var t = e.target.closest && e.target.closest('[data-tip]'); if (t) showTip(t, e.clientX, e.clientY); });
  document.addEventListener('pointermove', function (e) { if (!tip.hidden) { var t = e.target.closest && e.target.closest('[data-tip]'); if (t) showTip(t, e.clientX, e.clientY); else tip.hidden = true; } });
  document.addEventListener('pointerout', function (e) { var t = e.target.closest && e.target.closest('[data-tip]'); if (t && !(e.relatedTarget && t.contains(e.relatedTarget))) tip.hidden = true; });
  document.addEventListener('focusin', function (e) { var t = e.target.closest && e.target.closest('[data-tip]'); if (t && t.matches(':focus-visible')) { var r = t.getBoundingClientRect(); showTip(t, r.left, r.bottom - 14); } });
  document.addEventListener('focusout', function () { tip.hidden = true; });

  /* ---------- hold: the replay does not move under the pointer while he works on something ---------- */
  APP.hold = function (n) { S.held = Math.max(0, S.held + n); updateClockLabel(); };

  /* ---------- overlays (focus moves in, Tab stays in, Esc closes, focus returns) ---------- */
  var stack = [];
  function focusables(root) { return $$('a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])', root).filter(function (n) { return n.offsetParent !== null; }); }
  APP.overlay = function (node, o) {
    o = o || {};
    var rec = { node: node, opener: o.opener || document.activeElement, modal: !!o.modal, onClose: o.onClose, closing: false };
    stack.push(rec);
    $('#overlays').appendChild(node);
    APP.hold(1);
    var f = o.focus ? $(o.focus, node) : focusables(node)[0];
    (f || node).focus({ preventScroll: true });
    rec.close = function (restore) {
      if (rec.closing) return; rec.closing = true;
      var i = stack.indexOf(rec); if (i > -1) stack.splice(i, 1);
      APP.hold(-1);
      if (rec.onClose) rec.onClose();
      var kill = function () { node.remove(); if (rec.scrim) rec.scrim.remove(); };
      if (node.classList.contains('appwin') || node.classList.contains('filepane')) { node.classList.add('closing'); setTimeout(kill, S.reduce ? 0 : 170); } else kill();
      if (rec.scrim) rec.scrim.style.opacity = 0;
      if (restore !== false && rec.opener && document.contains(rec.opener)) rec.opener.focus({ preventScroll: true });
    };
    return rec;
  };
  document.addEventListener('keydown', function (e) {
    var top = stack[stack.length - 1];
    if (e.key === 'Escape' && top) { e.preventDefault(); top.close(); return; }
    if (e.key === 'Tab' && top && top.modal) {
      var f = focusables(top.node); if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  document.addEventListener('pointerdown', function (e) {
    var top = stack[stack.length - 1];
    if (top && !top.modal && !top.node.contains(e.target) && !(top.opener && top.opener.contains && top.opener.contains(e.target))) top.close(false);
  }, true);

  /* ---------- sessions: his side of the data ---------- */
  APP.session = function (id) {
    var s = D.sessionById[id]; if (s) return s;
    return S.userSessions.filter(function (u) { return u.id === id; })[0] || null;
  };
  APP.tagOf = function (id) { var s = APP.session(id); return s ? s.tag : id; };

  /* the session window the app would show (dummy destination of a click on a session) */
  APP.openSession = function (id, opener) {
    var s = APP.session(id); if (!s) return;
    var eff = APP.Now ? APP.Now.effective(id) : { state: 'quiet' };
    var plan = (s.plan && s.plan.length) ? s.plan : [{ text: 'Reading the prompt', status: 'in_progress' }];
    var steps = (s.steps || []).filter(function (x) { return x[0] <= S.minute; }).slice(-14);
    var ph = {
      completed: APP.icon('check'), in_progress: APP.icon('spin'), pending: APP.icon('ring')
    };
    var node = el('div', { class: 'sheet appwin', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Session ' + s.tag + ': ' + s.name });
    node.innerHTML =
      '<header><button class="btn sm" data-close type="button">' + APP.icon('back', 'sm') + 'Back to the tool</button>' +
      '<span class="eyebrow">Claude Code</span><span class="tag">' + esc(s.tag) + '</span><span class="ttl">' + esc(s.name) + '</span>' +
      '<span class="spacer" style="flex:1"></span><span class="hp ' + (eff.state === 'working' ? 'run' : '') + '">' + esc(eff.label || eff.state) + '</span></header>' +
      '<div class="body"><div class="plan"><div class="eyebrow" style="margin-bottom:6px">Plan</div><ul>' +
      plan.map(function (p) { return '<li class="' + p.status + '"><span class="st">' + ph[p.status] + '</span><span>' + esc(p.text) + '</span></li>'; }).join('') +
      '</ul></div><div class="tx" tabindex="0" aria-label="Transcript">' +
      (steps.length ? steps.map(function (x) { return '<div><time>' + APP.hm(x[0]) + '</time><span>' + esc(x[1]) + '</span></div>'; }).join('') : '<div><time>' + APP.hm(S.minute) + '</time><span>Started from the tool.</span></div>') +
      (eff.state === 'waiting' && eff.wait ? '<div><time>' + APP.hm(eff.wait.from) + '</time><span style="color:var(--wait);font-weight:700">Waits for you: ' + esc(eff.wait.question) + '</span></div>' : '') +
      '</div></div><footer>' + esc(s.tag) + ' · ' + esc(s.model || 'opus') + ' · ' + APP.hm(S.minute) + '</footer>';
    var scrim = el('div', { class: 'scrim' });
    var rec = APP.overlay(node, { modal: true, opener: opener, focus: '[data-close]' });
    rec.scrim = scrim; $('#overlays').insertBefore(scrim, node);
    scrim.onclick = function () { rec.close(); };
    $('[data-close]', node).onclick = function () { rec.close(); };
  };

  /* ---------- parts: single click inspects, double click or Enter opens (VS Code or the app's file pane) ---------- */
  function dummyFile(p) {
    var f = p.file || '(git)';
    if (/\.mjs$/.test(f)) return '#!/usr/bin/env node\n// ' + p.name + '\n// ' + f + '\n\nimport fs from "node:fs";\n\nconst input = JSON.parse(fs.readFileSync(0, "utf8"));\nconst verdict = check(input);\nprocess.stdout.write(JSON.stringify(verdict));\n\nfunction check(call) {\n  // dummy preview: the real file opens in the app\n  return { decision: "allow" };\n}\n';
    if (/\.md$|CLAUDE|SKILL/.test(f)) return '# ' + p.name + '\n\n' + f + '\n\n- dummy preview of the file\n- the real one opens in the app\n';
    return '// ' + p.name + '\n// ' + f + '\n// dummy preview\n';
  }
  APP.openPart = function (id, opener) {
    var p = D.partById[id]; if (!p) return;
    var where = S.settings.open;
    if (where === 'vscode') {
      APP.toast('Opened ' + (p.file || p.name) + ' in VS Code', { icon: 'external' });
      if (opener && opener.classList) { opener.classList.remove('opened'); void opener.offsetWidth; opener.classList.add('opened'); }
      return;
    }
    var old = $('.filepane'); if (old) old.remove();
    var node = el('aside', { class: 'sheet filepane', role: 'dialog', 'aria-label': 'File: ' + p.name });
    node.innerHTML = '<header><button class="iconbtn" data-close aria-label="Close the file pane">' + APP.icon('x') + '</button><div style="min-width:0"><div style="font-weight:700">' + esc(p.name) + '</div><div class="mono" style="font-size:12.5px;color:var(--ink-3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(p.file || '(git)') + '</div></div><span style="flex:1"></span><button class="btn sm" data-vs type="button">' + APP.icon('code', 'sm') + 'VS Code</button></header><code tabindex="0">' + esc(dummyFile(p)) + '</code>';
    var rec = APP.overlay(node, { modal: false, opener: opener, focus: '[data-close]' });
    $('[data-close]', node).onclick = function () { rec.close(); };
    $('[data-vs]', node).onclick = function () { APP.toast('Opened ' + (p.file || p.name) + ' in VS Code', { icon: 'external' }); };
  };

  APP.inspect = function (id, anchor) {
    var p = D.partById[id]; if (!p) return;
    var info = APP.Now ? APP.Now.partInfo(id) : { users: [], passed: 0, failed: 0, refused: 0, recent: [], unseen: 0 };
    var node = el('div', { class: 'pop', role: 'dialog', 'aria-label': p.name });
    node.innerHTML = '<h3>' + esc(p.name) + '</h3><div class="path">' + esc(p.file || '(git)') + '</div><dl class="kv">' +
      '<dt>Group</dt><dd>' + esc(p.group) + (p.model ? ' · ' + esc(p.model) : '') + '</dd>' +
      '<dt>Used by</dt><dd>' + (info.users.length ? info.users.map(function (t) { return '<span class="tag">' + esc(t) + '</span>'; }).join(' ') : '<span style="color:var(--ink-3)">no session now</span>') + '</dd>' +
      (p.group === 'Hooks' ? '<dt>Last 3 h</dt><dd class="num">' + info.passed + ' passed · <span style="color:var(--bad)">' + info.failed + ' failed</span> · <span style="color:var(--warn)">' + info.refused + ' refused</span></dd>' : '') +
      '</dl>' +
      (info.recent.length ? '<ul>' + info.recent.map(function (r) { return '<li><span style="color:' + (r.result === 'failed' ? 'var(--bad)' : 'var(--warn)') + '">' + APP.icon(r.result === 'failed' ? 'tri' : 'dia', 'sm fill') + '</span>' + APP.hm(r.t) + '<span class="tag dim">' + esc(r.tag) + '</span>' + esc(r.result) + '</li>'; }).join('') + '</ul>' : '') +
      '<div class="acts"><button class="btn sm primary" data-open type="button" style="background:var(--ink);border-color:var(--ink)">' + APP.icon(S.settings.open === 'vscode' ? 'code' : 'panel', 'sm') + 'Open</button>' +
      '<button class="btn sm" data-copy type="button">' + APP.icon('copy', 'sm') + 'Copy path</button>' +
      (info.unseen ? '<button class="btn sm" data-seen type="button">' + APP.icon('check', 'sm') + 'Seen (' + info.unseen + ')</button>' : '') + '</div>';
    var r = anchor.getBoundingClientRect(), W = innerWidth, H = innerHeight;
    document.body.appendChild(node); var b = node.getBoundingClientRect();
    node.style.left = Math.max(8, Math.min(r.left, W - b.width - 8)) + 'px';
    node.style.top = (r.bottom + 6 + b.height > H - 8 ? Math.max(8, r.top - b.height - 6) : r.bottom + 6) + 'px';
    var rec = { node: node, opener: anchor, modal: false };
    stack.push(rec); APP.hold(1);
    rec.close = function (restore) { if (rec.done) return; rec.done = true; var i = stack.indexOf(rec); if (i > -1) stack.splice(i, 1); APP.hold(-1); node.remove(); if (restore !== false) anchor.focus({ preventScroll: true }); };
    $('[data-open]', node).onclick = function () { rec.close(false); APP.openPart(id, anchor); };
    $('[data-copy]', node).onclick = function () { try { navigator.clipboard && navigator.clipboard.writeText(p.file || p.name); } catch (e) { /* ignore */ } APP.toast('Copied ' + (p.file || p.name), { icon: 'copy' }); };
    var sb = $('[data-seen]', node); if (sb) sb.onclick = function () { APP.Now.markSeenPart(id); rec.close(); APP.toast('Marked seen'); };
    $('[data-open]', node).focus({ preventScroll: true });
  };

  /* ---------- settings ---------- */
  function applyTheme() { document.documentElement.setAttribute('data-theme', S.settings.theme); $('#btn-settings').innerHTML = APP.icon('setting'); }
  function openSettings() {
    var btn = $('#btn-settings');
    if (btn.getAttribute('aria-expanded') === 'true') return;
    var node = el('div', { class: 'pop settings', role: 'dialog', 'aria-label': 'Settings' });
    function seg(name, opts, cur) { return '<div class="seg" role="radiogroup" aria-label="' + name + '">' + opts.map(function (o) { return '<button type="button" role="radio" aria-checked="' + (o[0] === cur) + '" data-v="' + o[0] + '">' + (o[2] ? APP.icon(o[2], 'sm') + ' ' : '') + o[1] + '</button>'; }).join('') + '</div>'; }
    node.innerHTML = '<div class="grp"><span>Double-click a part opens it in</span>' + seg('Open parts in', [['vscode', 'VS Code', 'code'], ['pane', 'File pane', 'panel']], S.settings.open) + '</div>' +
      '<div class="grp"><span>Theme</span>' + seg('Theme', [['light', 'Light', 'sun'], ['dark', 'Dark', 'moon']], S.settings.theme) + '</div>';
    node.style.right = '16px'; node.style.top = '60px';
    btn.setAttribute('aria-expanded', 'true');
    var rec = APP.overlay(node, { modal: false, opener: btn, onClose: function () { btn.setAttribute('aria-expanded', 'false'); } });
    $$('.seg', node).forEach(function (g) {
      g.addEventListener('click', function (e) {
        var b = e.target.closest('button[data-v]'); if (!b) return;
        $$('button', g).forEach(function (x) { x.setAttribute('aria-checked', String(x === b)); });
        if (g.getAttribute('aria-label') === 'Theme') { S.settings.theme = b.dataset.v; applyTheme(); if (APP.History) APP.History.redraw(); }
        else { S.settings.open = b.dataset.v; APP.toast('Parts open in ' + (b.dataset.v === 'vscode' ? 'VS Code' : 'the file pane'), { icon: 'check' }); }
        save();
      });
    });
  }

  /* ---------- header: glance and replay controls ---------- */
  var G = {};
  function buildGlance() {
    var g = $('#glance');
    g.innerHTML =
      '<span class="stat run" data-k="working">' + APP.icon('work') + '<b>0</b><span>working</span></span>' +
      '<span class="stat wait zero" data-k="waiting">' + APP.icon('wait') + '<b>0</b><span>waits for you</span></span>' +
      '<span class="stat" data-k="helpers">' + APP.icon('helpers') + '<b>0</b><span>helpers</span></span>' +
      '<span class="stat bad zero" data-k="failed" title="Failed since you wrote, not yet seen"><span style="color:inherit">' + APP.icon('tri', 'fill') + '</span><b>0</b><span>failed</span></span>' +
      '<span class="stat bad zero" data-k="refused" title="Refused since you wrote, not yet seen"><span class="warnc">' + APP.icon('dia', 'fill') + '</span><b>0</b><span>refused</span></span>' +
      '<span class="stat" data-k="tokens"><b>0</b><span>tokens</span></span>';
    $$('.stat', g).forEach(function (n) { G[n.dataset.k] = { n: n, b: $('b', n), v: null }; });
  }
  APP.setGlance = function (c) {
    function set(k, v, fmt) { var x = G[k]; if (!x || x.v === v) return; x.v = v; x.b.textContent = fmt ? fmt(v) : v; if (k === 'waiting' || k === 'failed' || k === 'refused') x.n.classList.toggle('zero', !v); }
    set('working', c.working); set('waiting', c.waiting); set('helpers', c.helpers); set('failed', c.failed); set('refused', c.refused); set('tokens', c.tokens, APP.tok);
    if (G.refused) { G.refused.n.style.color = c.refused ? 'var(--warn)' : ''; G.refused.n.style.background = c.refused ? 'var(--warn-tint)' : ''; G.refused.n.style.borderColor = c.refused ? 'transparent' : ''; $('b', G.refused.n).style.color = c.refused ? 'var(--warn)' : ''; }
    var w = [c.waiting ? c.waiting + ' session' + (c.waiting > 1 ? 's wait' : ' waits') + ' for you' : '', c.failed + c.refused ? (c.failed + ' failed, ' + c.refused + ' refused, not yet seen') : ''].filter(Boolean).join('. ');
    APP.say(w || 'Nothing waits for you');
  };

  var R = {};
  function buildReplay() {
    var r = $('#replay');
    r.innerHTML =
      '<button class="iconbtn" id="r-play" aria-label="Pause the replay" title="Pause / play (Space)"></button>' +
      '<div class="seg" role="radiogroup" aria-label="Replay speed"><button type="button" role="radio" data-sp="0.5">Slow</button><button type="button" role="radio" data-sp="2">Normal</button><button type="button" role="radio" data-sp="8">Fast</button></div>' +
      '<input class="scrub" id="r-scrub" type="range" min="' + D.replayStart + '" max="' + D.replayEnd + '" step="1" aria-label="Replay time">' +
      '<button class="iconbtn" data-jump="' + D.minuteOf(6, 3, 29) + '" title="Crowded night, a session waits for you">03:29</button>' +
      '<button class="iconbtn" data-jump="' + D.minuteOf(6, 13, 3) + '" title="After the quiet stretch">13:03</button>' +
      '<div class="clock" id="r-clock" aria-live="off"><small id="r-sub"></small><span id="r-time"></span></div>';
    R.play = $('#r-play'); R.scrub = $('#r-scrub'); R.time = $('#r-time'); R.sub = $('#r-sub');
    R.play.onclick = function () { setPlaying(!S.playing); };
    $$('[data-sp]', r).forEach(function (b) { b.onclick = function () { S.speed = +b.dataset.sp; syncSpeed(); }; });
    $$('[data-jump]', r).forEach(function (b) { b.onclick = function () { APP.jump(+b.dataset.jump); }; });
    R.scrub.oninput = function () { APP.jump(+R.scrub.value, true); };
    syncSpeed(); setPlaying(S.playing);
  }
  function syncSpeed() { $$('[data-sp]').forEach(function (b) { b.setAttribute('aria-checked', String(+b.dataset.sp === S.speed)); }); }
  function setPlaying(p) {
    S.playing = p;
    R.play.innerHTML = APP.icon(p ? 'pause' : 'play', p ? '' : 'fill');
    R.play.setAttribute('aria-label', p ? 'Pause the replay' : 'Play the replay');
    document.body.classList.toggle('paused', !p);
    updateClockLabel();
  }
  function updateClockLabel() { if (!R.sub) return; R.sub.textContent = !S.playing ? 'Replay paused' : S.held ? 'Held while you work' : 'Replay · ' + D.dayName(S.minute); }
  APP.jump = function (m, fromScrub) {
    S.minute = Math.max(D.replayStart, Math.min(D.replayEnd - 0.01, m));
    if (!fromScrub) R.scrub.value = Math.round(S.minute);
    if (APP.Now) APP.Now.jump(S.minute);
    APP.tick(true);
  };

  /* ---------- router: Now and History, URL reflects the state ---------- */
  APP.go = function (page, o) {
    o = o || {};
    S.page = page;
    $('#page-now').hidden = page !== 'now';
    $('#page-history').hidden = page !== 'history';
    $$('.nav a').forEach(function (a) { if (a.dataset.page === page) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    document.title = (page === 'now' ? 'Now' : 'History') + ' · Session tool';
    if (page === 'history' && APP.History) APP.History.show();
    if (page === 'now' && APP.Now) APP.Now.show();
    if (R.scrub) APP.tick(true);
    if (o.focus !== false) $('#main').focus({ preventScroll: true });
  };
  window.addEventListener('hashchange', function () { var p = location.hash.replace('#', '').split('/')[0]; if (p === 'now' || p === 'history') APP.go(p); });

  /* ---------- the clock: a frame loop for smooth motion, a tick for the data ---------- */
  var last = 0, acc = 0;
  APP.tick = function (force) {
    var st = D.stateAt(S.minute);
    S.lastTickState = st;
    if (APP.Now) APP.Now.update(st, force);
    R.time.textContent = D.dayName(S.minute).split(' ')[0] + ' ' + APP.hm(S.minute);
    var rs = Math.round(S.minute); if (+R.scrub.value !== rs && document.activeElement !== R.scrub) R.scrub.value = rs;
  };
  function frame(ts) {
    var dt = Math.min(0.1, (ts - last) / 1000); last = ts;
    if (S.playing && !S.held && !document.hidden) {
      S.minute += dt * S.speed;
      if (S.minute >= D.replayEnd) { S.minute = D.replayStart; if (APP.Now) APP.Now.jump(S.minute); }
      if (APP.Now && S.page === 'now') APP.Now.frame(S.minute, S.reduce);
      acc += dt;
      if (acc >= 0.25) { acc = 0; APP.tick(false); }
    }
    requestAnimationFrame(frame);
  }

  /* ---------- prompt bar: one box, in a fixed place ---------- */
  var P = {};
  function buildPrompt() {
    P.target = $('#p-target'); P.input = $('#p-input'); P.form = $('#promptbar'); P.hint = $('.hint', P.form);
    $('#p-send-ic').innerHTML = APP.icon('send', 'sm');
    P.input.addEventListener('keydown', function (e) { if (e.key === 'Enter' && (e.isComposing || e.keyCode === 229)) return; });
    P.target.addEventListener('change', function () { P.input.placeholder = P.target.value === 'new' ? 'Prompt for a new session…' : 'Message to ' + APP.tagOf(P.target.value) + '…'; });
    P.form.addEventListener('submit', function (e) {
      e.preventDefault();
      var text = P.input.value.trim();
      if (!text) { P.input.setAttribute('aria-invalid', 'true'); P.hint.textContent = 'Write the prompt first'; P.hint.style.color = 'var(--bad)'; APP.say('Write the prompt first'); P.input.focus(); setTimeout(function () { P.input.removeAttribute('aria-invalid'); P.hint.textContent = 'Enter sends'; P.hint.style.color = ''; }, 2600); return; }
      if (P.target.value === 'new') { var u = APP.Now.addUserSession(text); APP.toast('Started ' + u.tag + ': ' + text, { icon: 'play' }); }
      else { APP.Now.reply(P.target.value, text); APP.toast('Sent to ' + APP.tagOf(P.target.value)); }
      P.input.value = '';
    });
  }
  APP.setTargets = function (list) {
    var cur = P.target.value || 'new';
    var key = list.map(function (s) { return s.id; }).join();
    if (P.key === key) return; P.key = key;
    P.target.innerHTML = '<option value="new">New session</option>' + list.map(function (s) { return '<option value="' + s.id + '">Reply to ' + esc(s.tag) + ' · ' + esc(s.name.slice(0, 34)) + '</option>'; }).join('');
    P.target.value = list.some(function (s) { return s.id === cur; }) ? cur : 'new';
  };
  APP.promptFor = function (id) { P.target.value = id; P.target.dispatchEvent(new Event('change')); P.input.focus(); };

  /* ---------- keyboard ---------- */
  document.addEventListener('keydown', function (e) {
    if (e.target.matches && e.target.matches('input,textarea,select')) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === ' ' && !e.target.closest('button,a,[role="button"]')) { e.preventDefault(); setPlaying(!S.playing); }
    else if (e.key === '1') location.hash = '#now';
    else if (e.key === '2') location.hash = '#history';
    else if (e.key === '/') { e.preventDefault(); P.input.focus(); }
  });

  /* ---------- start ---------- */
  APP.start = function () {
    $('#brand-ic').innerHTML = APP.icon('logo');
    applyTheme();
    buildGlance(); buildReplay(); buildPrompt();
    $('#btn-settings').onclick = openSettings;
    var m = q.get('t');
    if (m) { var pr = m.split(':'); S.minute = pr.length > 1 ? D.minuteOf(6, +pr[0], +pr[1]) : +m; }
    if (q.get('speed')) S.speed = +q.get('speed');
    if (q.get('paused') === '1') S.playing = false;
    syncSpeed(); setPlaying(S.playing);
    R.scrub.value = Math.round(S.minute);
    APP.Now.init(); APP.History.init();
    var page = q.get('page') || location.hash.replace('#', '').split('/')[0] || 'now';
    APP.go(page === 'history' ? 'history' : 'now', { focus: false });
    if (q.get('settings') === '1') openSettings();
    if (q.get('open')) APP.Now.demoOpen(q.get('open'));
    APP.tick(true);
    last = performance.now(); requestAnimationFrame(frame);
  };
})();
