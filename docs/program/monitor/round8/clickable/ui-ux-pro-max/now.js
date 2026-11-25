/* Now page: sessions rail, time ribbon, hook strips and the board of real working parts. */
(function () {
  'use strict';
  var APP = window.APP, D = APP.D, S = APP.S, $ = APP.$, $$ = APP.$$, el = APP.el, esc = APP.esc, I = APP.icon;
  var Now = APP.Now = {};

  /* ---------- derived data ---------- */
  var DS = 8460, DE = 9530, PPM = 2.3;               /* time domain of the strips: minutes, pixels per minute */
  var HOOKS = D.parts.filter(function (p) { return p.group === 'Hooks'; });
  var TROUBLE = D.events.filter(function (e) { return e.result !== 'passed'; });
  var EVSEEN = {};                                    /* parts with any event at all (a hook that never fires is drawn dashed) */
  D.events.forEach(function (e) { EVSEEN[e.part] = 1; });
  TROUBLE.forEach(function (e) { e.key = e.t + '|' + e.session + '|' + e.part; e.tag = (D.sessionById[e.session] || {}).tag || '?'; });
  /* cluster same-part events within one minute into one mark */
  var MARKS = [];
  (function () {
    var lastBy = {};
    TROUBLE.forEach(function (e) {
      var k = e.part + '|' + e.result, l = lastBy[k];
      if (l && e.t - l.last <= 1.2 && l.sessions.indexOf(e.tag) > -1 || (l && e.t - l.last <= 0.6)) { l.n++; l.last = e.t; if (l.sessions.indexOf(e.tag) < 0) l.sessions.push(e.tag); l.keys.push(e.key); return; }
      var mk = { t: e.t, last: e.t, part: e.part, result: e.result, n: 1, sessions: [e.tag], key: e.key, keys: [e.key] };
      lastBy[k] = mk; MARKS.push(mk);
    });
  })();
  var workN = new Array(DE - DS + 1).fill(0);
  D.sessions.forEach(function (s) { s.segs.forEach(function (g) { for (var m = Math.ceil(g[0]); m <= Math.floor(g[1]); m++) workN[m - DS]++; }); });
  var GAPS = (function () {
    var runs = [], st = null, first = workN.findIndex(function (v) { return v > 0; }), last = workN.length - 1 - workN.slice().reverse().findIndex(function (v) { return v > 0; });
    for (var i = first; i <= last + 1; i++) {
      if (workN[i] === 0 && i <= last) { if (st == null) st = i; }
      else { if (st != null && i - st >= 12) runs.push([st + DS, i + DS]); st = null; }
    }
    return runs;
  })();
  var MODEL = { haiku: '#0891B2', sonnet: '#4F46E5', opus: '#9333EA', fable: '#DB2777' };
  var ZONES = [
    ['kinds', 'Helper kinds', ['Helper kinds']], ['commands', 'Commands', ['Commands']], ['skills', 'Skills', ['Skills', 'Slash commands']],
    ['scripts', 'Scripts', ['Scripts']], ['tests', 'Tests and git', ['Tests and git']], ['stores', 'Stores and settings', ['Stores and settings']], ['docs', 'Documents', ['Documents']]
  ];
  function partIcon(p) {
    var id = p.id;
    if (p.group === 'Tests and git') return id.indexOf('git:') === 0 ? 'git' : 'test';
    return { 'hook:': 'hook', 'kind:': 'helper', 'tool:': 'command', 'skill': 'skill', 'cmd:': 'slash', 'script': 'script', 'store': 'store', 'setting': 'setting', 'doc:': 'doc', 'git:': 'git' }[id.slice(0, id.indexOf(':') + 1)] ||
      { skill: 'skill', script: 'script', store: 'store', setting: 'setting' }[id.split(':')[0]] || 'doc';
  }

  /* ---------- view state ---------- */
  var V = { W: 400, rows: {}, chips: {}, hookEls: {}, sess: {}, order: [], hdr: {}, stById: {}, seenCount: 0, unseen: {}, sinceFrom: null, vm: [], bySess: {} };

  /* ---------- the board (built once) ---------- */
  function chipHTML(p) {
    var kind = p.group === 'Helper kinds';
    return '<button class="chip' + (EVSEEN[p.id] || p.group !== 'Hooks' ? '' : ' never') + '" type="button" data-part="' + p.id + '" data-tip="' + esc(p.name) + '<br><span class=mono>' + esc(p.file || '(git)') + '</span>">' +
      (kind ? '<i class="mdl" style="background:' + MODEL[p.model] + '"></i>' : '') + I(partIcon(p)) + '<span class="nm">' + esc(p.name) + '</span>' + (kind ? '<span class="sub">' + esc(p.model) + '</span>' : '') +
      '<span class="trouble"></span><span class="tags"></span></button>';
  }
  function zoneHTML(z) {
    var parts = D.parts.filter(function (p) { return z[2].indexOf(p.group) > -1; });
    return '<section class="panel zone" data-zone="' + z[0] + '" aria-label="' + z[1] + '"><div class="panel-h"><span class="eyebrow">' + z[1] + '</span><span class="eyebrow num">' + parts.length + '</span></div><div class="chips">' + parts.map(chipHTML).join('') + '</div></section>';
  }
  function timePanel() {
    var rows = HOOKS.map(function (p, i) {
      return '<button class="hook-label' + (EVSEEN[p.id] ? '' : ' never') + '" type="button" data-part="' + p.id + '" style="grid-column:1;grid-row:' + (i + 2) + '" data-tip="' + esc(p.name) + '<br><span class=mono>' + esc(p.file) + '</span>">' + I('hook') + '<span class="nm">' + esc(p.name) + '</span><span class="tags"></span></button>' +
        '<div class="hook-count" style="grid-column:3;grid-row:' + (i + 2) + '" data-hc="' + p.id + '"></div>';
    }).join('');
    return '<section class="panel timepanel" aria-label="Time and hooks">' +
      '<div class="panel-h"><span class="eyebrow">Last 3 hours</span>' +
      '<div class="legend"><span style="color:var(--run)">' + I('work', 'sm') + 'working</span><span style="color:var(--wait)">' + I('wait', 'sm') + 'waits for you</span><span style="color:var(--bad)">' + I('tri', 'sm fill') + 'failed</span><span style="color:var(--warn)">' + I('dia', 'sm fill') + 'refused</span></div>' +
      '<button class="btn sm" id="seen-all" type="button" hidden>' + I('check', 'sm') + '<span>Mark all seen</span></button></div>' +
      '<div class="timewrap" style="grid-template-rows:164px repeat(10,30px)">' +
      '<div class="rib-side" style="grid-column:1;grid-row:1"><span class="eyebrow">Sessions</span><div><div class="big"><span id="rs-work">0</span><small>working</small></div><div style="margin-top:6px;color:var(--wait);font-weight:700" id="rs-wait"></div></div><span></span></div>' +
      '<div class="strip" id="strip" style="grid-column:2;grid-row:1 / span 11"><div class="pan" id="pan" style="display:flex;flex-direction:column"></div><div class="nowline"><span class="nowline-label" id="nowlabel"></span></div></div>' +
      '<div class="rib-right" style="grid-column:3;grid-row:1"><div class="eyebrow" style="text-align:right">Helpers</div><div class="big" style="font-size:28px;line-height:1;font-weight:700;color:var(--ink);text-align:right"><span id="rs-help">0</span></div><span style="height:8px"></span></div>' +
      rows + '</div></section>';
  }
  function buildBoard() {
    var z = {}; ZONES.forEach(function (x) { z[x[0]] = zoneHTML(x); });
    $('#board').innerHTML =
      '<div class="col">' + timePanel() + z.docs + '</div>' +
      '<div class="col"><div class="pair">' + z.commands + z.skills + '</div>' + z.kinds + '<div class="pair">' + z.scripts + '<div class="col">' + z.tests + z.stores + '</div></div></div>';
    $$('[data-part]').forEach(function (n) {
      V.chips[n.dataset.part] = { n: n, tags: $('.tags', n), tr: $('.trouble', n), on: false, tg: '', tc: '' };
      if (n.classList.contains('hook-label')) V.hookEls[n.dataset.part] = V.chips[n.dataset.part];
    });
    buildStrips();
  }

  function buildStrips() {
    var X = function (m) { return +((m - DS) * PPM).toFixed(1); };
    var Wd = Math.ceil((DE - DS) * PPM);
    /* ----- ribbon svg ----- */
    var s = ['<svg id="rib" width="' + Wd + '" height="164" viewBox="0 0 ' + Wd + ' 164" role="img" aria-label="Sessions working over time, starts, waits for you, trouble and his messages">',
      '<defs><pattern id="hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line class="hatch-l" x1="0" y1="0" x2="0" y2="7" stroke-width="1.6"/></pattern></defs>',
      '<rect id="since-r" class="since" x="0" y="0" width="0" height="164"/>'];
    /* hour grid + labels */
    for (var h = Math.ceil(DS / 60) * 60; h <= DE; h += 60) {
      var lab = (h % 1440 === 0) ? D.dayName(h).split(' ')[0] + ' 00:00' : APP.hm(h);
      s.push('<line class="gridl" x1="' + X(h) + '" x2="' + X(h) + '" y1="44" y2="150"/><text class="axt" x="' + X(h) + '" y="162" text-anchor="middle">' + lab + '</text>');
    }
    /* quiet stretches: hatched and labelled with their length */
    GAPS.forEach(function (g) {
      var w = (g[1] - g[0]) * PPM, label = (w > 118 ? 'Quiet ' : '') + APP.dur(g[1] - g[0]);
      s.push('<rect x="' + X(g[0]) + '" y="44" width="' + w.toFixed(1) + '" height="60" fill="url(#hatch)" opacity=".7"/>' +
        '<g data-tip="Nothing ran ' + APP.hm(g[0]) + ' to ' + APP.hm(g[1]) + '"><rect x="' + X(g[0]) + '" y="44" width="' + w.toFixed(1) + '" height="60" fill="transparent"/>' +
        '<text class="rt" x="' + (X(g[0]) + w / 2).toFixed(1) + '" y="78" text-anchor="middle" style="paint-order:stroke;stroke:var(--surface);stroke-width:5px">' + label + '</text></g>');
    });
    /* sessions working: step area */
    var top = function (v) { return 100 - v * 11.2; }, d = 'M' + X(DS) + ',100', prev = 0, line = '';
    for (var i = 0; i < workN.length; i++) {
      var v = workN[i];
      if (v !== prev || i === 0) { d += ' L' + X(DS + i) + ',' + top(prev).toFixed(1) + ' L' + X(DS + i) + ',' + top(v).toFixed(1); prev = v; }
    }
    d += ' L' + X(DE) + ',' + top(prev).toFixed(1);
    s.push('<path class="ribfill" d="' + d + ' L' + X(DE) + ',100 Z"/><path class="ribline" d="' + d.replace('M' + X(DS) + ',100 ', 'M' + X(DS) + ',' + top(0) + ' ') + '"/><line x1="0" x2="' + Wd + '" y1="100.5" y2="100.5" stroke="var(--line-strong)"/>');
    /* waits for him */
    D.sessions.forEach(function (ss) {
      ss.waits.forEach(function (w) {
        var x = X(w[0]), wd = Math.max(2, (w[1] - w[0]) * PPM);
        s.push('<g data-tip="' + esc(ss.tag) + ' waits for you<br>' + APP.hm(w[0]) + ' to ' + APP.hm(w[1]) + '"><rect class="waitb" x="' + x + '" y="105" width="' + wd.toFixed(1) + '" height="14" rx="3" opacity=".92"/>' +
          (wd > 40 ? '<text x="' + (x + 5) + '" y="116" fill="#fff" font-size="11.5" font-weight="700" font-family="var(--mono)">' + esc(ss.tag) + '</text>' : '') + '</g>');
      });
    });
    /* trouble row */
    MARKS.forEach(function (m) {
      var x = X(m.t), sh = m.result === 'failed' ? '<path class="m-bad" d="M' + x + ',123 l7,13 h-14z"/>' : '<path class="m-warn" d="M' + x + ',123 l7,7 l-7,7 l-7,-7z"/>';
      s.push('<g class="svm" data-mk="' + m.key + '" data-part="' + m.part + '" data-tip="' + esc((D.partById[m.part] || {}).name) + ' ' + m.result + (m.n > 1 ? ' ×' + m.n : '') + '<br>' + esc(m.sessions.join(', ')) + ' · ' + APP.hm(m.t) + '">' + sh + '<rect x="' + (x - 8) + '" y="120" width="16" height="20" fill="transparent"/></g>');
    });
    /* his messages */
    D.owner.messages.forEach(function (t) { if (t >= DS) s.push('<circle class="youdot" cx="' + X(t) + '" cy="147" r="3.6"/>'); });
    /* starts (flags in three lanes) and ends */
    var lanes = [-99, -99, -99];
    D.sessions.forEach(function (ss) {
      if (ss.start >= DS) {
        var x = X(ss.start), w = ss.tag.length * 7.6 + 12, ln = 0;
        while (ln < 2 && lanes[ln] > x - 4) ln++;
        lanes[ln] = x + w;
        var par = ss.parent && D.sessionById[ss.parent] ? ' · started by ' + D.sessionById[ss.parent].tag : '';
        s.push('<g data-tip="' + esc(ss.tag) + ' starts ' + APP.hm(ss.start) + par + '<br>' + esc(ss.name) + '"><line class="flagl" x1="' + x + '" x2="' + x + '" y1="' + (ln * 15 + 14) + '" y2="100"/><rect class="flag" x="' + x + '" y="' + (ln * 15) + '" width="' + w.toFixed(1) + '" height="14" rx="3"/><text class="flagt" x="' + (x + 6) + '" y="' + (ln * 15 + 11) + '">' + esc(ss.tag) + '</text></g>');
      }
      if (ss.end && ss.end >= DS) s.push('<g data-tip="' + esc(ss.tag) + ' ends ' + APP.hm(ss.end) + '"><line class="endt" x1="' + X(ss.end) + '" x2="' + X(ss.end) + '" y1="94" y2="104"/><rect x="' + (X(ss.end) - 4) + '" y="90" width="8" height="16" fill="transparent"/></g>');
    });
    s.push('</svg>');
    /* ----- hooks svg ----- */
    var h2 = ['<svg id="hk" width="' + Wd + '" height="300" viewBox="0 0 ' + Wd + ' 300" role="img" aria-label="Hook calls and trouble over time, one row per hook">', '<rect id="since-h" class="since" x="0" y="0" width="0" height="300"/>'];
    HOOKS.forEach(function (p, r) { if (r % 2 === 0) h2.push('<rect class="stripe" x="0" y="' + r * 30 + '" width="' + Wd + '" height="30" opacity=".7"/>'); });
    GAPS.forEach(function (g) { h2.push('<rect class="gapband" x="' + X(g[0]) + '" y="0" width="' + ((g[1] - g[0]) * PPM).toFixed(1) + '" height="300"/>'); });
    for (var hh = Math.ceil(DS / 60) * 60; hh <= DE; hh += 60) h2.push('<line class="gridl" x1="' + X(hh) + '" x2="' + X(hh) + '" y1="0" y2="300"/>');
    var rowOf = {}; HOOKS.forEach(function (p, r) { rowOf[p.id] = r; });
    D.events.forEach(function (e) {
      if (e.result !== 'passed' || rowOf[e.part] == null) return;
    });
    D.events.forEach(function (e) {
      if (e.result !== 'passed') return; var r = rowOf[e.part]; if (r == null) return;
      var op = Math.min(0.75, 0.22 + 0.11 * Math.log2((e.n || 1) + 1));
      h2.push('<rect class="pc" x="' + X(e.t) + '" y="' + (r * 30 + 8) + '" width="' + (5 * PPM - 1).toFixed(1) + '" height="14" rx="2" style="fill-opacity:' + op.toFixed(2) + '"/>');
    });
    MARKS.forEach(function (m) {
      var r = rowOf[m.part]; if (r == null) return; var x = X(m.t), cy = r * 30 + 15;
      var sh = m.result === 'failed' ? '<path class="m-bad" d="M' + x + ',' + (cy - 7) + ' l7.5,13.5 h-15z"/>' : '<path class="m-warn" d="M' + x + ',' + (cy - 7.5) + ' l7.5,7.5 l-7.5,7.5 l-7.5,-7.5z"/>';
      h2.push('<g class="svm" data-mk="' + m.key + '" data-part="' + m.part + '" data-tip="' + esc((D.partById[m.part] || {}).name) + ' ' + m.result + (m.n > 1 ? ' ×' + m.n : '') + '<br>' + esc(m.sessions.join(', ')) + ' · ' + APP.hm(m.t) + '"><circle class="unseen-ring ' + (m.result === 'failed' ? 'm-bad' : 'm-warn') + '" cx="' + x + '" cy="' + cy + '" r="8"/>' + sh + '<rect x="' + (x - 9) + '" y="' + (r * 30 + 2) + '" width="18" height="26" fill="transparent"/></g>');
    });
    h2.push('</svg>');
    $('#pan').innerHTML = s.join('') + h2.join('');
    V.pan = $('#pan'); V.since = [$('#since-r'), $('#since-h')];
  }

  /* ---------- rail ---------- */
  var GROUPS = [['waiting', 'Needs you'], ['working', 'Working'], ['quiet', 'Quiet'], ['ended', 'Ended']];
  function rowHTML() {
    return '<div class="confirm" role="group"><span class="cq"></span><button class="btn sm danger solid" data-yes type="button">Yes, stop</button><button class="btn sm" data-keep type="button">Keep</button></div>';
  }
  function makeRow(vm) {
    var r = el('div', { class: 'srow', 'data-id': vm.id });
    r.innerHTML =
      '<button class="srow-open" type="button"><span class="srow-main"><span class="sglyph"></span><span class="tag"></span><span class="sname"></span><span class="stok"></span></span>' +
      '<span class="srow-sub"><span class="step"></span><span class="since"></span><span class="mks"></span></span>' +
      '<span class="srow-helpers"></span><span class="progress"></span></button>' +
      '<button class="iconbtn sstop" type="button" style="border:0;height:28px;min-width:28px" hidden>' + I('stop', 'sm') + '</button>' +
      '<div class="ask"><label></label><q></q><div class="row"><input class="field a-in" type="text"><button class="btn primary a-go" type="button">Answer</button></div>' +
      '<div class="quick"><button class="qchip" type="button">Go on</button><button class="qchip" type="button">Hold on</button><button class="qchip" type="button">Show me first</button></div>' +
      '<div class="actions"><span class="actions-main"><button class="btn sm danger a-stop" type="button">' + I('stop', 'sm') + 'Stop</button></span></div></div>' + rowHTML();
    var o = { n: r, c: {}, id: vm.id };
    ['.sglyph', '.tag', '.sname', '.stok', '.step', '.since', '.mks', '.srow-helpers', '.progress', '.ask label', '.ask q', '.a-in', '.cq'].forEach(function (k) { o[k] = $(k, r); });
    o.open = $('.srow-open', r); o.stop = $('.sstop', r);
    o.open.addEventListener('click', function () { APP.openSession(vm.id, o.open); });
    r.addEventListener('pointerenter', function () { focusSession(vm.id); }); r.addEventListener('pointerleave', function () { focusSession(null); });
    r.addEventListener('focusin', function () { focusSession(vm.id); }); r.addEventListener('focusout', function () { focusSession(null); });
    var go = function (text) { answer(vm.id, text); };
    $('.a-go', r).onclick = function () { go(o['.a-in'].value.trim() || 'Go on'); };
    o['.a-in'].addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.isComposing && e.keyCode !== 229) { e.preventDefault(); go(o['.a-in'].value.trim() || 'Go on'); } });
    $$('.qchip', r).forEach(function (b) { b.onclick = function () { o['.a-in'].value = b.textContent; o['.a-in'].focus(); }; });
    var askStop = function () { r.classList.add('confirming'); $('.cq', r).textContent = 'Stop ' + vm.tag + '?'; $('[data-yes]', r).focus(); };
    $('.a-stop', r).onclick = askStop; o.stop.onclick = askStop;
    $('[data-keep]', r).onclick = function () { r.classList.remove('confirming'); };
    $('[data-yes]', r).onclick = function () { r.classList.remove('confirming'); S.stopped[vm.id] = S.minute; APP.toast('Stopped ' + vm.tag, { icon: 'stop' }); APP.say(vm.tag + ' stopped'); Now.update(S.lastTickState, true); };
    var ain = o['.a-in']; ain.addEventListener('focus', function () { APP.hold(1); }); ain.addEventListener('blur', function () { APP.hold(-1); });
    r.addEventListener('pointerenter', function () { if (r.dataset.state === 'waiting') { o.held = true; APP.hold(1); } });
    r.addEventListener('pointerleave', function () { if (o.held) { o.held = false; APP.hold(-1); } });
    return o;
  }
  function answer(id, text) {
    var vm = V.bySess[id]; if (!vm || !vm.wait) return;
    S.answered[id] = vm.wait.from;
    APP.toast('Answer sent to ' + vm.tag + ': ' + text); APP.say('Answer sent to ' + vm.tag);
    var r = V.sess[id]; if (r) { r['.a-in'].value = ''; r['.a-in'].blur(); }
    Now.update(S.lastTickState, true);
  }
  Now.reply = function (id, text) { if (V.bySess[id] && V.bySess[id].state === 'waiting') answer(id, text); };
  Now.addUserSession = function (text) {
    var n = S.userSessions.length + 1;
    var u = { id: 'u' + n, tag: 'N' + n, name: text.length > 60 ? text.slice(0, 58) + '…' : text, model: 'opus', start: S.minute, end: null, parent: null, plan: [], steps: [[S.minute, 'Started from your prompt']], helpers: [], waits: [], segs: [], tokens: [], tokensTotal: 0, user: true };
    S.userSessions.push(u); Now.update(S.lastTickState, true); return u;
  };

  function focusSession(id) {
    if (S.focusSession === id) return; S.focusSession = id;
    var vm = id && V.bySess[id], set = {};
    if (vm) vm.parts.forEach(function (p) { set[p] = 1; });
    for (var k in V.chips) V.chips[k].n.classList.toggle('hl', !!set[k]);
    for (var j in V.sess) V.sess[j].n.classList.toggle('hl', j === id);
  }

  /* ---------- view models: what each session looks like right now ---------- */
  function cumTokens(s, m) {
    var a = s.tokens; if (!a || !a.length) return 0;
    if (m <= a[0][0]) return a[0][1] * 1000;
    for (var i = a.length - 1; i >= 0; i--) if (a[i][0] <= m) { var n = a[i + 1]; return (n ? a[i][1] + (n[1] - a[i][1]) * (m - a[i][0]) / (n[0] - a[i][0]) : a[i][1]) * 1000; }
    return 0;
  }
  Now.effective = function (id) { var v = V.bySess[id]; return v ? { state: v.state, label: v.label, wait: v.wait } : { state: 'quiet', label: 'quiet' }; };
  function viewModels(st) {
    var m = S.minute, list = [];
    var counts = { working: 0, waiting: 0, quiet: 0, ended: 0 };
    st.sessions.forEach(function (x) {
      var s = D.sessionById[x.id], vm = { id: x.id, tag: x.tag, name: x.name, model: x.model, state: x.state, step: x.step, stepIndex: x.stepIndex, stepCount: x.stepCount, wait: x.wait, since: x.since, helpers: x.helpersRunning, done: x.helpersDone, parts: x.parts.concat(x.hooks || []), parent: x.parent, tokens: cumTokens(s, m), label: x.state };
      if (x.state === 'waiting' && S.answered[x.id] === x.wait.from) { vm.state = 'working'; vm.step = 'Working on your answer'; vm.wait = null; vm.label = 'working'; }
      if (S.stopped[x.id] != null) { vm.state = 'ended'; vm.step = 'Stopped by you'; vm.label = 'stopped by you'; vm.helpers = []; vm.wait = null; vm.stopped = true; }
      list.push(vm);
    });
    S.userSessions.forEach(function (u) {
      var vm = { id: u.id, tag: u.tag, name: u.name, model: 'opus', state: 'working', step: 'Starting from your prompt', stepIndex: 0, stepCount: 0, wait: null, helpers: [], done: 0, parts: ['tool:start_session'], tokens: 0, label: 'working', user: true };
      if (S.stopped[u.id] != null) { vm.state = 'ended'; vm.step = 'Stopped by you'; vm.label = 'stopped by you'; vm.stopped = true; }
      list.push(vm);
    });
    var rank = { waiting: 0, working: 1, quiet: 2, ended: 3 };
    list.forEach(function (v, i) { v.i = i; counts[v.state]++; });
    list.sort(function (a, b) { return rank[a.state] - rank[b.state] || (a.state === 'waiting' ? a.since - b.since : 0) || (b.user ? 1 : 0) - (a.user ? 1 : 0) || a.i - b.i; });
    return { list: list, counts: counts };
  }

  /* trouble the owner has not seen yet: since he last wrote, within 3 hours */
  function troubleWindow(m, st) {
    var lo = Math.max(m - 180, st.lastOwnerMessage != null ? st.lastOwnerMessage : m - 180), out = [];
    for (var i = 0; i < TROUBLE.length; i++) { var e = TROUBLE[i]; if (e.t > m) break; if (e.t >= m - 180) out.push(e); }
    return { lo: lo, events: out };
  }

  /* ---------- update (about four times a second) ---------- */
  var lastOrder = '';
  Now.update = function (st, force) {
    if (!st) return;
    V.pending = null;
    var m = S.minute, vms = viewModels(st), tw = troubleWindow(m, st);
    V.vm = vms.list; V.bySess = {}; vms.list.forEach(function (v) { V.bySess[v.id] = v; });
    /* trouble per part and per session */
    var perPart = {}, perSess = {}, unseen = 0, uf = 0, ur = 0, hasSince = {};
    tw.events.forEach(function (e) {
      var seen = !!S.seen[e.key];
      var p = perPart[e.part] || (perPart[e.part] = { f: 0, r: 0, uf: 0, ur: 0 });
      if (e.result === 'failed') { p.f++; if (!seen) p.uf++; } else { p.r++; if (!seen) p.ur++; }
      if (!seen) { var ps = perSess[e.session] || (perSess[e.session] = { f: 0, r: 0 }); if (e.result === 'failed') { ps.f++; uf++; } else { ps.r++; ur++; } unseen++; }
    });
    V.perPart = perPart; V.unseenN = unseen; V.sinceFrom = tw.lo;
    var helpers = st.counts.helpers + S.userSessions.length * 0;
    APP.setGlance({ working: vms.counts.working, waiting: vms.counts.waiting, helpers: helpers, failed: uf, refused: ur, tokens: vms.list.reduce(function (a, v) { return a + v.tokens; }, 0) });
    setText($('#rs-work'), vms.counts.working);
    setText($('#rs-wait'), vms.counts.waiting ? vms.counts.waiting + ' waits for you' : '');
    setText($('#rs-help'), helpers);
    setText($('#rail-count'), vms.list.length);
    /* rail rows: create, update, remove, order */
    var seenIds = {};
    vms.list.forEach(function (v) {
      seenIds[v.id] = 1;
      var r = V.sess[v.id] || (V.sess[v.id] = makeRow(v)); r.fresh = !r.n.parentNode;
      updateRow(r, v, perSess[v.id]);
    });
    for (var k in V.sess) if (!seenIds[k]) { V.sess[k].n.remove(); delete V.sess[k]; }
    var seq = [];
    GROUPS.forEach(function (g) {
      var rows = vms.list.filter(function (v) { return v.state === g[0]; });
      if (!rows.length) return;
      var h = V.hdr[g[0]] || (V.hdr[g[0]] = el('div', { class: 'sgroup eyebrow' }, g[1]));
      seq.push(h); rows.forEach(function (v) { seq.push(V.sess[v.id].n); });
    });
    var key = seq.map(function (n) { return n.dataset.id || n.textContent; }).join();
    if (key !== lastOrder || force) {
      var list = $('#rail-list'), before = {};
      Object.keys(V.sess).forEach(function (id) { before[id] = V.sess[id].n.getBoundingClientRect().top; });
      if (key !== lastOrder) { seq.forEach(function (n) { list.appendChild(n); }); $$('.sgroup', list).forEach(function (h) { if (seq.indexOf(h) < 0) h.remove(); }); }
      lastOrder = key;
      if (!S.reduce && S.page === 'now') Object.keys(V.sess).forEach(function (id) {
        var n = V.sess[id].n, d = (before[id] || 0) - n.getBoundingClientRect().top;
        if (V.sess[id].fresh) { n.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 260, easing: 'cubic-bezier(.2,.7,.2,1)' }); }
        else if (Math.abs(d) > 1) n.animate([{ transform: 'translateY(' + d + 'px)' }, { transform: 'none' }], { duration: 240, easing: 'cubic-bezier(.2,.7,.2,1)' });
      });
    }
    APP.setTargets(vms.list.filter(function (v) { return v.state !== 'ended'; }).map(function (v) { return { id: v.id, tag: v.tag, name: v.name }; }));
    updateBoard(st, perPart, m);
    $('#seen-all').hidden = !unseen; if (unseen) $('#seen-all span').textContent = 'Mark all seen (' + unseen + ')';
    markSeenStyles();
  };
  function setText(n, t) { if (n && n._t !== t) { n._t = t; n.textContent = t; } }
  function updateRow(r, v, tr) {
    var n = r.n; if (n.dataset.state !== v.state) n.dataset.state = v.state;
    var g = { waiting: 'wait', working: 'work', quiet: 'quiet', ended: v.stopped ? 'stopped' : 'ended' }[v.state];
    if (r.g !== g) { r.g = g; r['.sglyph'].innerHTML = I(g); }
    setText(r['.tag'], v.tag); setText(r['.sname'], v.name); n.querySelector('.tag').setAttribute('data-tip', esc(v.name) + (v.parent && D.sessionById[v.parent] ? '<br>started by ' + esc(D.sessionById[v.parent].tag) : ''));
    setText(r['.stok'], v.tokens ? APP.tok(v.tokens) : '');
    var step = v.state === 'waiting' ? '' : v.state === 'quiet' ? 'quiet ' + Math.max(1, Math.round(S.minute - (D.sessionById[v.id] ? lastSeg(D.sessionById[v.id]) : S.minute))) + ' min' : v.state === 'ended' ? (v.stopped ? 'stopped by you' : 'ended ' + APP.hm(D.sessionById[v.id].end)) : v.step;
    setText(r['.step'], step); r['.step'].style.display = step ? '' : 'none';
    var since = v.state === 'waiting' ? 'waits for you · ' + Math.max(0, Math.round(S.minute - v.since)) + ' min' : '';
    setText(r['.since'], since); r['.since'].style.display = since ? '' : 'none';
    var mk = tr ? (tr.f ? '<span class="mk bad">' + I('tri', 'sm fill') + tr.f + '</span>' : '') + (tr.r ? '<span class="mk warn">' + I('dia', 'sm fill') + tr.r + '</span>' : '') : '';
    if (r.mk !== mk) { r.mk = mk; r['.mks'].innerHTML = mk; }
    /* helpers packed in their session */
    var by = {}; v.helpers.forEach(function (h) { by[h.kind] = (by[h.kind] || 0) + 1; });
    var hh = Object.keys(by).map(function (k) { var mdl = (D.partById['kind:' + k] || {}).model || 'sonnet'; return '<span class="hp run"><i style="background:' + MODEL[mdl] + '"></i>' + k + (by[k] > 1 ? ' ×' + by[k] : '') + '</span>'; }).join('') + (v.done ? '<span class="hp">' + v.done + ' done</span>' : '');
    if (r.hh !== hh) { r.hh = hh; r['.srow-helpers'].innerHTML = hh; r['.srow-helpers'].style.display = hh ? '' : 'none'; }
    var pr = ''; if (v.stepCount && v.state !== 'ended') for (var i = 0; i < v.stepCount; i++) pr += '<i class="' + (i < v.stepIndex ? 'c' : i === v.stepIndex ? 'd' : '') + '"></i>';
    if (r.pr !== pr) { r.pr = pr; r['.progress'].innerHTML = pr; r['.progress'].style.display = pr ? '' : 'none'; }
    r.stop.hidden = v.state !== 'working' || !!v.user && false; r.stop.setAttribute('aria-label', 'Stop ' + v.tag); r.stop.setAttribute('data-tip', 'Stop ' + esc(v.tag));
    if (v.state === 'waiting' && v.wait) {
      setText(r['.ask label'], 'Answer ' + v.tag); setText(r['.ask q'], (v.wait.report ? v.wait.report.slice(0, 118) + (v.wait.report.length > 118 ? '… ' : ' ') : '') + v.wait.question);
      r['.a-in'].setAttribute('aria-label', 'Your answer to ' + v.tag); r['.a-in'].placeholder = 'Type an answer';
    }
    if (v.state !== 'waiting') n.classList.remove('confirming-w');
    r.open.setAttribute('aria-label', 'Open session ' + v.tag + ', ' + v.name + ', ' + v.label);
  }
  function lastSeg(s) { var l = 0; s.segs.forEach(function (g) { if (g[1] <= S.minute && g[1] > l) l = g[1]; }); return l || s.start; }

  function updateBoard(st, perPart, m) {
    var use = {}, tagsOf = function (ids) { return (ids || []).map(function (i) { return APP.tagOf(i); }); };
    for (var k in st.partUse) use[k] = tagsOf(st.partUse[k]);
    for (var h in st.hookUse) use[h] = tagsOf(st.hookUse[h]);
    var kinds = {}; st.helpersRunning.forEach(function (x) { kinds['kind:' + x.kind] = (kinds['kind:' + x.kind] || 0) + 1; });
    S.userSessions.forEach(function () { use['tool:start_session'] = (use['tool:start_session'] || []).concat([]); });
    for (var id in V.chips) {
      var c = V.chips[id], tags = use[id] || [], on = tags.length > 0 || !!kinds[id];
      var tg = tags.slice(0, 2).map(function (t) { return '<span class="tag">' + esc(t) + '</span>'; }).join('') + (tags.length > 2 ? '<span class="tag dim">+' + (tags.length - 2) + '</span>' : '');
      if (kinds[id]) tg = '<span class="badge" aria-label="' + kinds[id] + ' running">' + kinds[id] + '</span>' + tg;
      if (c.tg !== tg) { c.tg = tg; c.tags.innerHTML = tg; }
      if (c.on !== on) { c.on = on; c.n.classList.toggle('on', on); }
      var pp = perPart[id], tc = '';
      if (c.tr) { if (pp && (pp.uf || pp.ur) && !c.n.classList.contains('hook-label')) tc = (pp.uf ? '<span class="mk bad">' + I('tri', 'sm fill') + pp.uf + '</span>' : '') + (pp.ur ? '<span class="mk warn">' + I('dia', 'sm fill') + pp.ur + '</span>' : ''); if (c.tc !== tc) { c.tc = tc; c.tr.innerHTML = tc; } }
    }
    HOOKS.forEach(function (p) {
      var pp = perPart[p.id] || { f: 0, r: 0, uf: 0, ur: 0 }, cell = $('[data-hc="' + p.id + '"]'), html;
      if (!EVSEEN[p.id]) html = '<span style="color:var(--ink-3);font-weight:600">never fired</span>';
      else html = (pp.f ? '<span class="mk bad" style="opacity:' + (pp.uf ? 1 : .55) + '">' + I('tri', 'sm fill') + pp.f + '</span>' : '') + (pp.r ? '<span class="mk warn" style="opacity:' + (pp.ur ? 1 : .55) + '">' + I('dia', 'sm fill') + pp.r + '</span>' : '');
      if (cell._h !== html) { cell._h = html; cell.innerHTML = html; }
    });
  }

  /* ---------- seen: a mark stays loud until he has seen it ---------- */
  function markSeenStyles() {
    $$('.svm', V.pan).forEach(function (g) {
      var m = g._m || (g._m = MARKS.filter(function (x) { return x.key === g.dataset.mk; })[0]);
      var seen = !!m && m.keys.every(function (k) { return S.seen[k]; });
      var loud = !!m && !seen && m.t <= S.minute && m.t >= S.minute - 180;
      if (g._seen !== seen) { g._seen = seen; g.classList.toggle('mk-seen', seen); }
      if (g._loud !== loud) { g._loud = loud; g.classList.toggle('loud', loud); }
    });
  }
  Now.markSeenPart = function (id) { TROUBLE.forEach(function (e) { if (e.part === id && e.t <= S.minute) S.seen[e.key] = 1; }); Now.update(S.lastTickState, true); };
  function markSeenAll() { TROUBLE.forEach(function (e) { if (e.t <= S.minute) S.seen[e.key] = 1; }); Now.update(S.lastTickState, true); APP.toast('Marked seen'); }
  Now.partInfo = function (id) {
    var st = S.lastTickState, users = [], passed = 0, failed = 0, refused = 0, recent = [], unseen = 0;
    if (st) { (st.partUse[id] || st.hookUse[id] || []).forEach(function (s) { users.push(APP.tagOf(s)); }); }
    D.events.forEach(function (e) { if (e.part !== id || e.t > S.minute || e.t < S.minute - 180) return; if (e.result === 'passed') passed += e.n || 1; else { if (e.result === 'failed') failed++; else refused++; if (!S.seen[e.key]) unseen++; recent.push({ t: e.t, result: e.result, tag: (D.sessionById[e.session] || {}).tag || '?' }); } });
    recent.sort(function (a, b) { return b.t - a.t; });
    return { users: users, passed: passed, failed: failed, refused: refused, recent: recent.slice(0, 4), unseen: unseen };
  };

  /* ---------- frame: the strips move smoothly with the clock ---------- */
  Now.frame = function (m, discrete) {
    if (!V.pan) return;
    var tx = V.W - (m - DS) * PPM;
    V.pan.style.transform = 'translate3d(' + tx.toFixed(1) + 'px,0,0)';
    if (V.sinceFrom != null) { var x = (V.sinceFrom - DS) * PPM, w = Math.max(0, (m - V.sinceFrom) * PPM); V.since.forEach(function (r) { r.setAttribute('x', x.toFixed(1)); r.setAttribute('width', w.toFixed(1)); }); }
    var lab = $('#nowlabel'); var t = APP.hm(m); if (lab._t !== t) { lab._t = t; lab.textContent = t; }
  };
  Now.jump = function (m) { V.sinceFrom = null; Now.frame(m); };
  Now.show = function () { measure(); if (V.pending) Now.update(V.pending, true); Now.frame(S.minute); };
  function measure() { var s = $('#strip'); if (s && s.clientWidth) V.W = s.clientWidth; }

  /* ---------- canvas: zoom with buttons, keys or Ctrl+wheel; drag the background to pan ---------- */
  function setZoom(z, keepCenter) {
    z = Math.max(0.6, Math.min(1.6, Math.round(z * 100) / 100)); S.zoom = z;
    $('#board').style.zoom = z; $('#z-reset').textContent = Math.round(z * 100) + '%'; measure(); Now.frame(S.minute);
  }
  function wireCanvas() {
    var cv = $('#canvas');
    $('#z-in').innerHTML = I('plus'); $('#z-out').innerHTML = I('minus');
    $('#z-in').onclick = function () { setZoom(S.zoom + 0.1); }; $('#z-out').onclick = function () { setZoom(S.zoom - 0.1); }; $('#z-reset').onclick = function () { setZoom(1); };
    cv.addEventListener('wheel', function (e) { if (e.ctrlKey) { e.preventDefault(); setZoom(S.zoom + (e.deltaY < 0 ? 0.08 : -0.08)); } }, { passive: false });
    cv.addEventListener('keydown', function (e) { if (e.key === '+' || e.key === '=') setZoom(S.zoom + 0.1); else if (e.key === '-') setZoom(S.zoom - 0.1); else if (e.key === '0') setZoom(1); });
    var drag = null;
    cv.addEventListener('pointerdown', function (e) { if (e.button !== 0 || e.target.closest('button,a,input,.panel') && !e.target.closest('.panel-h')) { if (!(e.target === cv || e.target === $('#board') || e.target.classList.contains('col') || e.target.classList.contains('pair'))) return; } drag = { x: e.clientX, y: e.clientY, l: cv.scrollLeft, t: cv.scrollTop }; cv.classList.add('panning'); cv.setPointerCapture(e.pointerId); });
    cv.addEventListener('pointermove', function (e) { if (drag) { cv.scrollLeft = drag.l - (e.clientX - drag.x); cv.scrollTop = drag.t - (e.clientY - drag.y); } });
    var end = function () { drag = null; cv.classList.remove('panning'); };
    cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
    if ('ResizeObserver' in window) new ResizeObserver(function () { measure(); Now.frame(S.minute); }).observe($('#strip'));
  }

  /* ---------- parts: click inspects, double click opens ---------- */
  function wireParts() {
    var timers = {};
    document.addEventListener('click', function (e) {
      var g = e.target.closest('.svm'); var b = e.target.closest('#board [data-part]');
      if (g && !b) { var hl = V.hookEls[g.dataset.part]; APP.inspect(g.dataset.part, (hl && hl.n) || $('#strip')); return; }
      if (!b) return;
      var id = b.dataset.part; clearTimeout(timers[id]);
      if (e.detail > 1) return;
      $$('.chip.sel,.hook-label.sel').forEach(function (n) { n.classList.remove('sel'); });
      timers[id] = setTimeout(function () { if (document.contains(b)) APP.inspect(id, b); }, 230);
    });
    document.addEventListener('dblclick', function (e) { var b = e.target.closest('#board [data-part]'); if (!b) return; clearTimeout(timers[b.dataset.part]); var open = $('.pop'); if (open && open.parentNode) open.remove(); APP.openPart(b.dataset.part, b); });
    $('#seen-all').onclick = markSeenAll;
  }

  Now.demoOpen = function (spec) {
    var p = spec.split(':'), kind = p[0], rest = p.slice(1).join(':');
    if (kind === 'session') { var s = D.sessions.filter(function (x) { return x.tag === rest; })[0]; if (s) APP.openSession(s.id, $('#main')); }
    else if (kind === 'part') { APP.inspect(rest, V.chips[rest].n); }
    else if (kind === 'pane') { S.settings.open = 'pane'; APP.openPart(rest, V.chips[rest].n); }
    else if (kind === 'stop') { var v = V.vm.filter(function (x) { return x.tag === rest; })[0]; if (v && V.sess[v.id]) { V.sess[v.id].n.classList.add('confirming'); $('.cq', V.sess[v.id].n).textContent = 'Stop ' + v.tag + '?'; } }
    else if (kind === 'toast') APP.toast('Answer sent to UX: Go on');
  };

  Now.init = function () {
    buildBoard(); wireCanvas(); wireParts(); setZoom(S.zoom);
  };
})();
