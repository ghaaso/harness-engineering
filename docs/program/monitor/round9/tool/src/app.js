// Round 9 tool, stage 2: Now and History on one picture, fed by the replay of Tue 24 Nov or by the live server.
// One scene. A thing on the picture is an element with a key: it is moved, never redrawn (round8/research/d1, finding 13).
(function () {
  'use strict';
  var D = window.TOOL_DATA, X = window.TOOL_EXTRA || { links: {}, files: {}, rw: {}, repo: '' };
  var NS = 'http://www.w3.org/2000/svg', Q = new URLSearchParams(location.search);
  var SERVED = /^http/.test(location.protocol), LIVE = SERVED && !Q.has('replay'), DRY = Q.has('dry');   // served: the tool's server can read files for the side panel
  var BASE = new Date(2026, 10, 18).getTime(), DN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], MN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var FLOOR = 0.95; // the picture is never drawn smaller than this: past it, rows wrap and the stage scrolls
  function $(id) { return document.getElementById(id); }
  function each(sel, fn) { Array.prototype.forEach.call(document.querySelectorAll(sel), fn); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  var ctx = document.createElement('canvas').getContext('2d'), wc = new Map();
  function measure(t, font) { var k = font + '|' + t, v = wc.get(k); if (v === undefined) { ctx.font = font; v = ctx.measureText(t).width; wc.set(k, v); } return v; }
  function tw(t, size, weight) { return measure(String(t), (weight || 400) + ' ' + size + 'px "Segoe UI", system-ui, sans-serif'); }
  function nowM() { return (Date.now() - BASE) / 60000; }
  function ub(a, t) { var lo = 0, hi = a.length; while (lo < hi) { var mid = (lo + hi) >> 1; if (a[mid].t <= t) lo = mid + 1; else hi = mid; } return lo; }

  // the links between files, both ways
  var LINKS = { out: X.links || {}, inn: {} };
  Object.keys(LINKS.out).forEach(function (from) { LINKS.out[from].forEach(function (l) { (LINKS.inn[l[0]] = LINKS.inn[l[0]] || []).push([from, l[1], l[2], l[3]]); }); });

  // ---------- state ----------
  var T0, T1, HOOKC = [], FILEC = [], hookBy = {}, fileBy = {}, failBy = {}, firstFired = {}, CAP = 4, SCH_H, SCH_F, rawState;
  var answered = {}, stopped = {}, pending = [], liveMade = 0;
  var page = Q.get('page') === 'history' ? 'history' : 'now', follow = LIVE && page === 'now', saved = null;
  var m = 0, playing = !Q.has('paused'), speed = +Q.get('speed') || (LIVE ? 1 : 10), rate = speed / 60000, holding = false;
  var level = clamp(+(Q.get('level') || 0), 0, 3), openQ = (Q.get('open') || '').split(',').filter(Boolean), open = openQ[0] || '', sel = Q.get('sel') || '', unfold = false;   // unfold: the linked files the open session has not used are shown
  var group = level === 2 && openQ.length > 1 ? openQ : [];   // two sessions or more opened together (the wheel between two, or a dragged box)
  var mems = {}, jump = true, R = null, dirty = true, lastTick = -1, lastIdx = -1, hideUntil = 0, hoverTag = '', version = 0, flash = null;
  var TRAVEL = 900, HOLD = 1700, FADE = 500; // milliseconds on the wall clock

  // ---------- the calls of the day ----------
  // A refusal or a failure carries its real time. A "let through" recorded as a count per 5 minutes is spread evenly over those 5 minutes.
  function expand(keep) {
    var out = [];
    D.events.forEach(function (e) {
      var s = D.sessionById[e.session]; if (!s || e.t < T0 - 10 || !keep(e)) return;
      if (e.result === 'passed' && e.n) { var n = Math.min(e.n, 40); for (var i = 0; i < n; i++) out.push({ t: e.t + (i + 0.5) * 5 / n, sid: e.session, tag: s.tag, part: e.part, result: 'passed' }); }
      else out.push({ t: e.t, sid: e.session, tag: s.tag, part: e.part, result: e.result });
    });
    out.sort(function (a, b) { return a.t - b.t; });
    return out;
  }
  function bySession(calls) { var by = {}; calls.forEach(function (c) { (by[c.sid] = by[c.sid] || []).push(c); }); return by; }
  function schedule(calls, rt, pre) {
    var lag = TRAVEL * rt, last = {}, groups = [], flights = [], folds = [], air = [];
    calls.forEach(function (c) { var k = c.sid + '|' + c.part + '|' + c.result, g = last[k]; if (g && c.t - g.t <= lag) { g.n++; return; } g = last[k] = { t: c.t, sid: c.sid, tag: c.tag, part: c.part, result: c.result, n: 1 }; groups.push(g); });
    groups.forEach(function (g, i) { g.id = pre + i; var launch = g.t - lag; air = air.filter(function (f) { return f.t > launch; }); if (air.length >= CAP) folds.push(g); else { flights.push(g); air.push(g); } });
    return { flights: flights, folds: folds };
  }
  function resched() { SCH_H = schedule(HOOKC, rate, 'h'); SCH_F = schedule(FILEC, rate, 'f'); }
  function wrapState() {
    rawState = D.stateAt;
    D.dayName = function (t) { var d = new Date(BASE + Math.floor(t / 1440) * 86400000 + 43200000); return DN[d.getDay()] + ' ' + d.getDate() + ' ' + MN[d.getMonth()]; };
    D.stateAt = function (t) {
      var st = rawState(follow ? Math.min(t, D.replayEnd) : t);
      st.sessions.forEach(function (x) {
        var a = answered[x.id];
        if (x.state === 'waiting' && x.wait && a && a.from === x.wait.from) { x.state = 'quiet'; x.step = 'You answered: ' + a.text; x.wait = null; st.counts.waiting--; st.counts.quiet++; }
        if (stopped[x.id] !== undefined && t >= stopped[x.id] && x.state !== 'ended') { st.counts[x.state]--; st.counts.ended++; st.counts.helpers -= x.helpersRunning.length; x.state = 'ended'; x.stopped = true; x.since = stopped[x.id]; x.wait = null; x.helpersRunning = []; }
      });
      return st;
    };
  }
  function ingest() {
    T0 = D.replayStart; T1 = D.replayEnd; D._quiet = null;
    wrapState();
    HOOKC = expand(function (e) { return e.part.indexOf('hook:') === 0 && (e.result === 'passed' || e.result === 'refused' || e.result === 'failed'); });
    FILEC = expand(function (e) { return e.result === 'passed' && partIsFile(D.partById[e.part]); });
    FILEC.forEach(function (c) { c.result = 'used'; });
    hookBy = bySession(HOOKC); fileBy = bySession(FILEC); failBy = {}; firstFired = {};
    HOOKC.forEach(function (c) { if (c.result === 'failed') (failBy[c.sid] = failBy[c.sid] || []).push(c); if (c.t >= T0 && firstFired[c.part] === undefined) firstFired[c.part] = c.t; });
    // How many arrows may move at once: as many as sessions called a hook within the busiest minute of the day.
    var per = {}, best = 1; HOOKC.forEach(function (c) { var k = Math.floor(c.t), o = per[k] = per[k] || {}; o[c.sid] = 1; });
    Object.keys(per).forEach(function (k) { best = Math.max(best, Object.keys(per[k]).length); }); CAP = best;
    resched(); mems = {}; dirty = true;
    var sc = $('scrub'); sc.min = T0; sc.max = T1;
  }
  function parseT(s) { var x = /^(\d\d?):(\d\d)(?:[.:](\d+))?$/.exec(s || ''); return x ? Math.floor(T0 / 1440) * 1440 + (+x[1]) * 60 + (+x[2]) + (x[3] ? +('0.' + x[3]) : 0) : null; }

  function hookPass(sid) { var a = hookBy[sid] || [], out = []; for (var i = ub(a, m) - 1; i >= 0 && a[i].t > m - 5; i--) if (a[i].result === 'passed' && out.indexOf(a[i].part) < 0) out.push(a[i].part); return out; }
  function filesOf(sid) { var a = fileBy[sid] || [], n = ub(a, m), seen = {}, out = []; for (var i = 0; i < n; i++) { if (a[i].t < T0) continue; var u = seen[a[i].part]; if (!u) { u = seen[a[i].part] = { part: a[i].part, last: a[i].t }; out.push(u); } u.last = a[i].t; } return out; }
  function fired(h) { return firstFired[h] !== undefined && firstFired[h] <= m; }
  function failedEarlier(sid) { var a = failBy[sid] || [], out = []; for (var i = 0; i < a.length && a[i].t <= m; i++) if (out.indexOf(a[i].part) < 0) out.push(a[i].part); return out; }

  // ---------- the scene ----------
  var svg = $('pic'), stg = $('stage'), camG = $('cam'), backG = $('back'), linesG = $('lines'), arrowsG = $('arrows'), nodesG = $('nodes'), overG = $('over'), topG = $('top');
  var els = {}, linesHtml = null, overHtml = '', curCam = null;
  function tr(x, y) { return 'translate(' + x + 'px,' + y + 'px)'; }
  function pad() { return stg.clientWidth < 1000 ? 12 : 26; }
  function fitCam(bb) {
    var W = stg.clientWidth, H = stg.clientHeight, p = pad();
    var bw = bb.x1 - bb.x0 + p * 2, bh = bb.y1 - bb.y0 + p * 2, s = Math.min(W / bw, H / bh, 1.3);
    if (s < FLOOR) s = Math.max(FLOOR, Math.min(W / bw, 1));
    var cw = bw * s > W + 1 ? bw * s : 0, ch = bh * s > H + 1 ? bh * s : 0;
    return { s: s, tx: (cw || W) / 2 - (bb.x0 + bb.x1) / 2 * s, ty: (ch || H) / 2 - (bb.y0 + bb.y1) / 2 * s, w: cw, h: ch };
  }
  function apply(r, instant) {
    var moved = false, fresh = [], seen = {};
    if (instant) svg.classList.add('instant');
    r.nodes.forEach(function (n) {
      var e = els[n.k], html = n.html + (n.tip ? '<title>' + esc(n.tip) + '</title>' : ''); seen[n.k] = 1;
      if (!e) {
        var g = document.createElementNS(NS, 'g'); g.setAttribute('class', 'n'); g.setAttribute('data-k', n.k);
        g.style.transform = tr(n.x, n.y); g.style.opacity = 0; g.innerHTML = html; (n.back ? backG : nodesG).appendChild(g);
        e = els[n.k] = { g: g, html: html, x: n.x, y: n.y }; fresh.push(g);
      } else {
        if (e.x !== n.x || e.y !== n.y) { e.g.style.transform = tr(n.x, n.y); e.x = n.x; e.y = n.y; moved = true; }
        if (e.html !== html) { e.g.innerHTML = html; e.html = html; }
      }
      e.g.setAttribute('data-a', n.act); e.g.classList.toggle('act', !!n.act);
    });
    Object.keys(els).forEach(function (k) {
      if (seen[k]) return; var g = els[k].g; delete els[k]; g.style.opacity = 0; g.style.pointerEvents = 'none';
      setTimeout(function () { g.remove(); }, instant ? 0 : 300);
    });
    var cam = fitCam(r.bb), scroll = cam.w || cam.h;
    if (curCam && !jump && !instant && !scroll && !curCam.w && !curCam.h && cam.s <= curCam.s * 1.08 && r.bb.x0 * curCam.s + curCam.tx >= 8 && r.bb.x1 * curCam.s + curCam.tx <= stg.clientWidth - 8 && r.bb.y0 * curCam.s + curCam.ty >= 8 && r.bb.y1 * curCam.s + curCam.ty <= stg.clientHeight - 8) cam = curCam;
    if (!curCam || Math.abs(cam.s - curCam.s) > 0.002 || Math.abs(cam.tx - curCam.tx) > 1 || Math.abs(cam.ty - curCam.ty) > 1 || cam.w !== curCam.w || cam.h !== curCam.h) {
      camG.style.transform = tr(cam.tx, cam.ty) + ' scale(' + cam.s + ')';
      svg.style.width = cam.w ? Math.ceil(cam.w) + 'px' : '100%'; svg.style.height = cam.h ? Math.ceil(cam.h) + 'px' : '100%';
      curCam = cam;
    }
    if (jump) { stg.scrollTop = 0; stg.scrollLeft = cam.w ? (cam.w - stg.clientWidth) / 2 : 0; }
    if (r.lines !== linesHtml) {
      linesHtml = r.lines;
      Array.prototype.forEach.call(linesG.children, function (o) { o.style.transitionDelay = '0s'; o.style.opacity = 0; setTimeout(function () { o.remove(); }, instant ? 0 : 260); });
      var lg = document.createElementNS(NS, 'g'); lg.setAttribute('class', 'll'); lg.innerHTML = r.lines; lg.style.opacity = 0;
      if (jump && moved && !instant) lg.style.transitionDelay = '.3s';
      linesG.appendChild(lg); fresh.push(lg);
    }
    if (r.over !== overHtml) { overHtml = r.over; overG.innerHTML = r.over; }
    if (fresh.length) { void getComputedStyle(fresh[0]).opacity; fresh.forEach(function (g) { g.style.opacity = 1; }); }
    if (instant) { void getComputedStyle(svg).opacity; svg.classList.remove('instant'); }
    jump = false;
    document.body.setAttribute('data-scale', curCam.s.toFixed(3));
  }

  var instantNext = true, headKey = '', scrubbing = false;
  function render() {
    var mw = Math.floor((stg.clientWidth - 2 * pad()) / FLOOR), hist = page === 'history';
    var grp = level === 2 && group.length > 1;
    var mk = page + '|' + level + '|' + (level >= 2 ? (grp ? group.join('+') : open) : '') + '|' + mw, cfg = { now: m, level: level, open: open, group: grp ? group : null, hookPass: hookPass, filesOf: filesOf, fired: fired, mem: mems[mk] = mems[mk] || {},
      history: hist, maxW: mw, failedEarlier: failedEarlier, rw: function (sid) { return X.rw[sid]; }, links: LINKS, sel: level === 3 ? sel : '', unfold: unfold };
    var r = layoutPicture(D, cfg, measure);
    if (r.missing) { level = 1; open = ''; cfg.open = ''; cfg.level = 1; cfg.sel = ''; cfg.mem = {}; cfg.group = null; r = layoutPicture(D, cfg, measure); }
    if (grp && !r.group) { group = []; grp = false; }
    R = r; version++;
    apply(r, instantNext); instantNext = false;
    var chips = '<span class="chip work"><span class="dot"></span>' + r.working + ' working</span>';
    chips += r.waitingTags.length ? '<button class="chip wait" data-ans="' + esc(r.waitingTags[0]) + '" title="Answer here">&#10073;&#10073; ' + esc(r.waitingTags.join(', ')) + (r.waitingTags.length > 1 ? ' wait for you' : ' waits for you') + ' &middot; Answer</button>' : '<span class="chip nowait">nothing waits for you</span>';
    if (r.failHooks.length) chips += '<button class="chip fail" data-evs title="Open what failed">&#9650; ' + esc(r.failHooks.join(', ')) + ' failed on ' + esc(r.failTags.join(', ')) + '</button>';
    var nar = window.innerWidth <= 1150, key = chips + level + open + group.join() + page + nar;
    if (key !== headKey) {
      headKey = key; $('chips').innerHTML = chips;
      each('#levels [data-l]', function (b) { b.classList.toggle('on', +b.getAttribute('data-l') === level); });
      each('#pages [data-p]', function (b) { b.classList.toggle('on', b.getAttribute('data-p') === page); });
      $('l0').textContent = nar ? 'All' : 'All sessions';
      $('l2').textContent = grp ? (group.length === 2 ? group.join(' + ') : group.length + ' sessions') : level >= 2 && open ? (nar ? open : 'One session: ' + open) : (nar ? 'One' : 'One session');
      $('l3').textContent = nar ? 'Files' : level >= 2 && open && !grp ? 'Files of ' + open : 'Its files'; $('l3').disabled = grp;
      $('l2').title = level >= 2 ? '' : PICK; $('l3').title = level >= 2 ? '' : PICK;
      $('wider').disabled = level === 0; $('narrower').disabled = level === 3 || grp;
      document.title = hist ? 'Sessions: history' : 'Sessions: now';
    }
    if (!scrubbing) { var sc = $('scrub'); if (LIVE) sc.max = T1; sc.value = m; }
    $('clock').textContent = r.day + ' · ' + D.hm(Math.floor(m + 1e-6));
  }
  function bar() {
    var liveNow = follow;
    $('play').hidden = liveNow; $('scrub').hidden = liveNow; $('speeds').hidden = liveNow; $('livest').hidden = !liveNow;
    $('lab').textContent = liveNow ? '' : page === 'history' ? 'History of ' + D.dayName(T0) : 'Replay of ' + D.dayName(T0);
    if (liveNow) $('livest').innerHTML = '<span class="dot"></span> Live &middot; sessions read ' + (liveMade ? Math.max(0, Math.round((Date.now() - liveMade) / 1000)) + ' s ago' : 'not yet') + ' &middot; a hook call shows within a second';
  }

  // ---------- the arrows ----------
  var COL = { passed: '#178f60', refused: '#c97a00', failed: '#d42a1c', used: '#3d4a5c', fly: '#3d4a5c' }, WORD = { passed: 'let through', refused: 'refused', failed: 'failed' };
  var live = {}, tops = {};
  function bez(p0, p1, p2, p3, out) { for (var i = 0; i <= 30; i++) { var t = i / 30, u = 1 - t; out.push([u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]); } }
  function pathFor(src, dst) {
    var pts = src.pre ? src.pre.slice() : [[src.x, src.y]], my;
    if (dst.gx !== undefined) { my = (src.ya + dst.top) / 2; bez([src.x, src.ya], [src.x, my + 26], [dst.gx, my - 26], [dst.gx, dst.top], pts); pts.push([dst.gx, dst.y], [dst.x - 1, dst.y]); }
    else { my = (src.ya + dst.y) / 2; bez([src.x, src.ya], [src.x, my + 22], [dst.x, my - 22], [dst.x, dst.y - 3], pts); }
    var len = [0], tot = 0;
    for (var i = 1; i < pts.length; i++) { tot += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); len.push(tot); }
    return { pts: pts, len: len, total: tot };
  }
  function ease(p) { return p * p * (3 - 2 * p); }
  function mark(result, x, y, col) {
    if (result === 'failed') return '<path d="M' + x + ',' + (y - 6) + ' L' + (x + 6) + ',' + (y + 4.8) + ' L' + (x - 6) + ',' + (y + 4.8) + ' Z" fill="' + col + '" stroke="' + col + '" stroke-width="1.6" stroke-linejoin="round"/>';
    if (result === 'refused') return '<path d="M' + x + ',' + (y - 6) + ' L' + (x + 6) + ',' + y + ' L' + x + ',' + (y + 6) + ' L' + (x - 6) + ',' + y + ' Z" fill="' + col + '"/>';
    return '<path d="M' + (x - 5.5) + ',' + y + ' l3.8,4.2 l7,-9" fill="none" stroke="' + col + '" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>';
  }
  function keyed(store, parent, id, html) {
    var e = store[id];
    if (!e) { e = store[id] = { g: document.createElementNS(NS, 'g'), html: null }; parent.appendChild(e.g); }
    if (e.html !== html) { e.g.innerHTML = html; e.html = html; }
    e.used = true; return e.g;
  }
  function sweep(store) { Object.keys(store).forEach(function (k) { if (store[k].used) store[k].used = false; else { store[k].g.remove(); delete store[k]; } }); }
  function drawArrows() {
    var hidden = performance.now() < hideUntil, op = hidden ? '0' : '1';
    if (arrowsG.style.opacity !== op) { arrowsG.style.opacity = op; topG.style.opacity = op; }
    if (!R) return;
    var sch = level === 3 ? SCH_F : SCH_H, dsts = level === 3 ? R.anchors.file : R.anchors.hook;
    var lag = TRAVEL * rate, hold = HOLD * rate, fade = FADE * rate, slots = {}, foldN = {}, landed = [], RANK = { passed: 1, refused: 2, failed: 3 };
    var fl = sch.flights, i0 = ub(fl, m - hold - fade), i1 = ub(fl, m + lag), i;
    for (i = i0; i < i1; i++) {
      var f = fl[i], src = R.anchors.sess[f.sid], dst = dsts[f.part];
      if (!dst) continue;
      var arrived = m >= f.t, alpha = arrived ? 1 - clamp((m - f.t - hold) / fade, 0, 1) : 1;
      if (!src) { if (arrived && level < 2) { var fk0 = f.part + '|' + f.result; foldN[fk0] = (foldN[fk0] || { n: 0, a: 0, dst: dst, result: f.result }); foldN[fk0].n += f.n; foldN[fk0].a = Math.max(foldN[fk0].a, alpha); } continue; }
      if (f._v !== version) { f._p = pathFor(src, dst); f._v = version; }
      var P = f._p, p = arrived ? 1 : ease(clamp((m - (f.t - lag)) / lag, 0, 1)), d = p * P.total, pts = P.pts, len = P.len, s = '', k = 1, tip, ang;
      while (k < pts.length - 1 && len[k] < d) k++;
      for (var j = 0; j < k; j++) s += pts[j][0].toFixed(1) + ',' + pts[j][1].toFixed(1) + ' ';
      var seg = len[k] - len[k - 1], u = seg > 0 ? clamp((d - len[k - 1]) / seg, 0, 1) : 1;
      tip = [pts[k - 1][0] + (pts[k][0] - pts[k - 1][0]) * u, pts[k - 1][1] + (pts[k][1] - pts[k - 1][1]) * u];
      ang = Math.atan2(pts[k][1] - pts[k - 1][1], pts[k][0] - pts[k - 1][0]) * 180 / Math.PI;
      s += tip[0].toFixed(1) + ',' + tip[1].toFixed(1);
      var col = arrived ? COL[f.result] : COL.fly, sw = arrived ? (f.result === 'failed' ? 3.4 : f.result === 'refused' ? 3 : 2.2) : 2.6;
      var g = keyed(live, arrowsG, f.id, '<polyline fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M1,0 L-11,-5.5 L-11,5.5 Z"/><circle r="4.2"/>');
      var pl = g.firstChild, hd = pl.nextSibling, dot = hd.nextSibling;
      pl.setAttribute('points', s); pl.setAttribute('stroke', col); pl.setAttribute('stroke-width', sw);
      hd.setAttribute('transform', 'translate(' + tip[0].toFixed(1) + ',' + tip[1].toFixed(1) + ') rotate(' + ang.toFixed(1) + ')'); hd.setAttribute('fill', col);
      dot.setAttribute('cx', pts[0][0]); dot.setAttribute('cy', pts[0][1]); dot.setAttribute('fill', col);
      g.style.opacity = alpha;
      if (!arrived) continue;
      if (level === 3) keyed(tops, topG, f.id, '<rect x="' + (dst.x0 - 3) + '" y="' + (dst.y0 - 3) + '" width="' + (dst.w + 6) + '" height="' + (dst.h + 6) + '" rx="9" fill="none" stroke="' + COL.used + '" stroke-width="3"/>').style.opacity = alpha;
      else landed.push({ f: f, src: src, dst: dst, alpha: alpha, col: col });
    }
    // Result labels. Which calls get one: the two that matter most on each hook (failed, then refused, then let through, newest
    // first); the rest go into the count on the hook. Where one sits: beside the arrow's landing point just above its hook, on the
    // side the arrow came from, else the other side, else one row higher. A place is taken only when it is clear of every session,
    // every hook, the hooks' heading and captions, and every label already placed; older labels are placed first and a label keeps
    // its place while that stays clear, so nothing jumps when a new one arrives. With no clear place it goes into the count.
    function foldIn(f, dst, a) { var k = f.part + '|' + f.result, o = foldN[k] = (foldN[k] || { n: 0, a: 0, dst: dst, result: f.result }); o.n += f.n; o.a = Math.max(o.a, a); }
    function clearAt(x, y, w) {
      var x1 = x + w, y1 = y + 26, i, b, sets = [R.boxes, R.keep || []];
      for (var q = 0; q < 2; q++) for (i = 0; i < sets[q].length; i++) { b = sets[q][i]; if (b.x0 - 3 < x1 && b.x1 + 3 > x && b.y0 - 3 < y1 && b.y1 + 3 > y) return false; }
      for (i = 0; i < taken.length; i++) { b = taken[i]; if (b[0] - 5 < x1 && b[2] + 5 > x && b[1] - 4 < y1 && b[3] + 4 > y) return false; }
      return true;
    }
    var withLabel = [], taken = [];
    landed.sort(function (a, b) { return (RANK[b.f.result] - RANK[a.f.result]) || (b.f.t - a.f.t); });
    landed.forEach(function (e) { var slot = slots[e.f.part] = (slots[e.f.part] || 0) + 1; if (slot > 2) foldIn(e.f, e.dst, e.alpha); else withLabel.push(e); });
    withLabel.sort(function (a, b) { return ((a.f._ci === undefined) - (b.f._ci === undefined)) || (a.f.t - b.f.t) || (a.f.id < b.f.id ? -1 : 1); });
    withLabel.forEach(function (e) {
      var f = e.f, dst = e.dst, col = e.col;
      var quiet = f.result === 'passed', label = f.tag + ' ' + WORD[f.result] + (f.n > 1 ? ' ×' + f.n : ''), pw = Math.round(tw(label, 13.5, 700)) + 40;
      var right = e.src.x <= dst.x, order = f._ci === undefined ? [0, 1, 2, 3] : [f._ci, 0, 1, 2, 3], ok = false, ci, px, py;
      for (var c = 0; c < order.length && !ok; c++) {
        ci = order[c]; px = clamp(Math.round(((ci & 1) ? !right : right) ? dst.x + 10 : dst.x - 10 - pw), R.bb.x0, R.bb.x1 - pw); py = dst.y - 10 - (1 + (ci >> 1)) * 30;
        ok = clearAt(px, py, pw);
      }
      var html = '<rect x="' + (dst.x0 - 3) + '" y="' + (dst.y - 3) + '" width="' + (dst.w + 6) + '" height="' + (dst.h + 6) + '" rx="11" fill="none" stroke="' + col + '" stroke-width="' + (quiet ? 2.4 : 3.4) + '"/>';
      if (ok) {
        f._ci = ci; taken.push([px, py, px + pw, py + 26]);
        html += '<rect class="al" x="' + px + '" y="' + py + '" width="' + pw + '" height="26" rx="13" fill="' + (quiet ? '#fff' : col) + '" stroke="' + col + '" stroke-width="1.8"/>' + mark(f.result, px + 16, py + 13, quiet ? col : '#fff') +
          '<text x="' + (px + 29) + '" y="' + (py + 17.8) + '" font-size="13.5" font-weight="700" fill="' + (quiet ? '#0f6f49' : '#fff') + '">' + esc(label) + '</text>';
      } else { f._ci = undefined; foldIn(f, dst, e.alpha); }
      keyed(tops, topG, f.id, html).style.opacity = e.alpha;
    });
    // calls that got no arrow of their own: a count on the hook
    if (level < 3) {
      var fo = sch.folds, a0 = ub(fo, m - hold - fade), a1 = ub(fo, m);
      for (i = a0; i < a1; i++) { var q = fo[i], qd = dsts[q.part]; if (!qd || (level === 2 && !R.anchors.sess[q.sid])) continue; var fk = q.part + '|' + q.result, o = foldN[fk] = (foldN[fk] || { n: 0, a: 0, dst: qd, result: q.result }); o.n += q.n; o.a = Math.max(o.a, 1 - clamp((m - q.t - hold) / fade, 0, 1)); }
      var used = {};
      Object.keys(foldN).sort(function (a, b) { return RANK[foldN[b].result] - RANK[foldN[a].result]; }).forEach(function (fk2) {
        var o2 = foldN[fk2], lab = '+' + o2.n, w = Math.round(tw(lab, 13, 700)) + 30, hk = fk2.split('|')[0], x = Math.round(o2.dst.x0 + o2.dst.w + 8 - (used[hk] || 0) - w), y = o2.dst.y - 13;
        used[hk] = (used[hk] || 0) + w + 3;
        var tg = keyed(tops, topG, 'fold|' + fk2, '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="22" rx="11" fill="' + COL[o2.result] + '" stroke="#fff" stroke-width="2"/>' + mark(o2.result, x + 12, y + 11, '#fff').replace('stroke-width="2.6"', 'stroke-width="2.2"') + '<text x="' + (x + 22) + '" y="' + (y + 15.6) + '" font-size="13" font-weight="700" fill="#fff">' + lab + '</text>');
        tg.style.opacity = o2.a;
      });
    }
    // a hook he jumped to: a ring round it for a moment
    if (flash && performance.now() < flash.until && R.anchors.hook[flash.id]) { var fa = R.anchors.hook[flash.id]; keyed(tops, topG, 'flash', '<rect x="' + (fa.x0 - 5) + '" y="' + (fa.y - 5) + '" width="' + (fa.w + 10) + '" height="' + (fa.h + 10) + '" rx="13" fill="none" stroke="#18212d" stroke-width="3.5"/>').style.opacity = clamp((flash.until - performance.now()) / 600, 0, 1); }
    sweep(live); sweep(tops);
  }

  // ---------- the clock ----------
  var lastTs = 0, frames = [], lastBar = 0;
  function step(ts) {
    var dt = lastTs ? ts - lastTs : 0; lastTs = ts;
    if (follow) { m = nowM(); T1 = m; if (dt) frames.push(dt); }
    else if (playing && !holding) {
      if (dt) frames.push(dt);
      if (LIVE) T1 = nowM();
      m = Math.min(T1, m + Math.min(dt, 100) * rate);
      if (m >= T1) setPlaying(false);
    }
    var tick = Math.floor(m * 4), idx = ub(HOOKC, m);
    if (dirty || tick !== lastTick || idx !== lastIdx) { dirty = false; lastTick = tick; lastIdx = idx; render(); }
    drawArrows();
    if (ts - lastBar > 1000) { lastBar = ts; bar(); }
  }
  // a fault in one frame is shown and the next frame still runs: the page never stops for good
  function frame(ts) {
    try { step(ts); } catch (e) { $('err').textContent = String((e && e.stack) || e).split('\n').slice(0, 3).join(' | '); }
    requestAnimationFrame(frame);
  }

  // ---------- wider and narrower ----------
  // A session is opened only when he points at it (a click, the wheel at it, a box, the jump list). No view of one session is
  // ever opened from a remembered session or from the first one: leaving for All sessions or Hooks forgets the one that was open,
  // and the steps "One session" and "Its files" then ask him to pick one on the picture and outline the sessions for a moment.
  var PICK = 'Click a session on the picture to open it', pickT = 0;
  function askPick() {
    toast('Click a session on the picture to open it. <span class="dim">Between two opens both; a dragged box opens several.</span>', 4200);
    var on = function (v) { Object.keys(els).forEach(function (k) { if (k.indexOf('s:') === 0) els[k].g.classList.toggle('pick', v); }); };
    on(true); clearTimeout(pickT); pickT = setTimeout(function () { if (!drag) on(false); }, 1800);
  }
  function known(tag) { return D.sessions.some(function (s) { return s.tag === tag && s.start <= m; }); }
  function setLevel(l, tag) {   // tag: one session, or a list of two or more to open together
    l = clamp(l, 0, 3);
    var g = Array.isArray(tag) ? tag.filter(function (t) { return known(t); }) : null; if (g) tag = g[0] || '';
    if (l >= 2) { if (tag) open = tag; else if (level < 2) { askPick(); return; } if (!open || !known(open)) l = 1; }
    if (l === level && !tag) return;
    if (l !== 3) sel = '';
    if (l < 2) open = '';
    group = l === 2 && g && g.length > 1 ? g : [];
    level = l; dirty = true; jump = true; hideUntil = performance.now() + 560;
  }
  function wider() { setLevel(level - 1); }

  // ---------- narrowing with the wheel: the session at the cursor, the two it lies between, or none ----------
  // Distances are in the picture's own units (one unit is 1 to 1.3 px on the screen). NEAR is the gap the layout leaves
  // between two cards (26): further than one gap from a session, the cursor is not at it. Between two: the cursor is outside
  // both, they lie on opposite sides of it (more than 120 degrees apart), and neither is further than REACH (two gaps, 52).
  // A remembered session is never used: with no session at the cursor the wheel stops at the views that need none.
  var NEAR = 26, REACH = 52, mouse = null, hintAt = 0;
  function picPt(cx, cy) { var b = svg.getBoundingClientRect(); return [(cx - b.left - curCam.tx) / curCam.s, (cy - b.top - curCam.ty) / curCam.s]; }
  function aim(cx, cy) {
    if (!R || !curCam || cx == null) return [];
    var p = picPt(cx, cy), a = R.boxes.filter(function (b) { return b.k === 's'; }).map(function (b) {
      var nx = clamp(p[0], b.x0, b.x1) - p[0], ny = clamp(p[1], b.y0, b.y1) - p[1]; return { tag: b.tag, nx: nx, ny: ny, d: Math.hypot(nx, ny) };
    }).sort(function (x, y) { return x.d - y.d; });
    if (!a.length || a[0].d > REACH) return [];
    if (a[0].d === 0) return [a[0].tag];
    if (a[1] && a[1].d <= REACH && a[0].nx * a[1].nx + a[0].ny * a[1].ny < -0.5 * a[0].d * a[1].d) return [a[0].tag, a[1].tag];
    return a[0].d <= NEAR ? [a[0].tag] : [];
  }
  function hint() {
    var t = performance.now(); if (t < hintAt) return; hintAt = t + 5000;
    toast(level === 2 && !group.length ? 'Point at <b>' + esc(open) + '</b> to go on to its files, or at another session to open that one.' : 'Point at a session to go into it, between two to open both, or drag a box round several.', 3800);
  }
  function zoomIn(pt) {
    var a = pt ? aim(pt[0], pt[1]) : [];
    if (a.length > 1) setLevel(2, a);
    else if (a.length) { if (level === 2 && !group.length && a[0] === open) setLevel(3); else if (level !== 3 || a[0] !== open) setLevel(level === 3 ? 3 : 2, a[0]); }
    else if (level === 0) setLevel(1);
    else if (level === 2 && !group.length && !pt) setLevel(3);   // the Narrower button, which is at no place: one step on from the session on show, as the step beside it says ("Files of BR1")
    else if (level < 3) hint();
  }
  function setPage(p) {
    if (p === page) return;
    closeSheet();
    if (p === 'history') { saved = { m: m, playing: playing, speed: speed }; setPlaying(false); follow = false; m = LIVE ? nowM() : T1; if (LIVE) { T1 = m; setSpeed(10); } }
    else if (LIVE) { follow = true; setSpeed(1); }
    else if (saved) { m = saved.m; setSpeed(saved.speed); setPlaying(saved.playing); }
    page = p; sel = level === 3 ? sel : ''; dirty = true; jump = true; instantNext = true; headKey = ''; bar();
  }
  function playFrom(t) { if (page !== 'history') setPage('history'); m = clamp(t, T0, T1); if (speed < 10) setSpeed(10); setPlaying(true); dirty = true; jump = true; }
  function nodeOf(t) { while (t && t !== svg) { if (t.getAttribute && t.getAttribute('data-k')) return t; t = t.parentNode; } return null; }
  svg.addEventListener('click', function (ev) {
    if (performance.now() < skipClick) return;
    var e = ev.target.closest && ev.target.closest('[data-ev]');   // a failure or refusal tag: open what it was
    if (e) { var q = e.getAttribute('data-ev').split('|'); openEv(q[0], q[2].split(',').map(function (h) { return [q[1], h]; })); return; }
    var g = nodeOf(ev.target), a = g && g.getAttribute('data-a'); if (!a) return;
    if (a === 'hooks') setLevel(1);
    else if (a.indexOf('s:') === 0) { var tag = a.slice(2); if (level < 2 || group.length) setLevel(2, tag); else if (tag === open) { if (level === 2) setLevel(3); } else setLevel(level, tag); }
    else if (a.indexOf('t:') === 0) playFrom(+a.slice(2));
    else if (a.indexOf('f:') === 0) { var fid = a.slice(2), was = sel === fid; sel = was ? '' : fid; unfold = false; dirty = true; if (!was && panes.length) openPart(fid); }   // with the panel open, a click switches it to this file
    else if (a.indexOf('h:') === 0 || a.indexOf('p:') === 0) openPart(a.slice(2));
    else if (a === 'unfold') { unfold = !unfold; dirty = true; }
    else if (a.indexOf('op:') === 0) { var op = a.split(':'); if (op[1] === 'answer') openAnswer(op[2]); else if (op[1] === 'stop') askStop(op[2]); else openApp(op[2]); }
  });
  svg.addEventListener('dblclick', function (ev) {
    var g = nodeOf(ev.target), k = g && g.getAttribute('data-k'); if (!k) return;
    if (k.indexOf('h:') === 0) openPart(k.slice(2)); else if (k.indexOf('p:') === 0) openPart(k.slice(2));
  });
  stg.addEventListener('mousemove', function (ev) { mouse = [ev.clientX, ev.clientY]; });
  stg.addEventListener('mouseleave', function () { mouse = null; });
  var wheelLock = 0;
  stg.addEventListener('wheel', function (ev) {
    // when the picture is larger than the window the wheel moves it; Ctrl and the wheel (or a pinch) still go wider and narrower
    if ((stg.scrollHeight > stg.clientHeight + 2 || stg.scrollWidth > stg.clientWidth + 2) && !ev.ctrlKey) return;
    ev.preventDefault(); var t = performance.now(); if (t < wheelLock || Math.abs(ev.deltaY) < 4) return; wheelLock = t + 620;
    if (ev.deltaY < 0) zoomIn([ev.clientX, ev.clientY]); else wider();
  }, { passive: false });
  $('wider').addEventListener('click', wider);
  $('narrower').addEventListener('click', function () { zoomIn(null); });

  // ---------- a dragged box: the sessions it covers open together ----------
  // Nothing pans by dragging (a picture larger than the window moves by the wheel and the scroll bars), so a drag anywhere,
  // on empty space too, draws the box. A box with no session but with hooks takes the sessions marked on those hooks now.
  var drag = null, boxEl = $('box'), skipClick = 0;
  function boxPick(d) {
    var a = picPt(Math.min(d.x, d.x1), Math.min(d.y, d.y1)), b = picPt(Math.max(d.x, d.x1), Math.max(d.y, d.y1));
    var hit = R.boxes.filter(function (q) { return q.x0 < b[0] && q.x1 > a[0] && q.y0 < b[1] && q.y1 > a[1]; });
    var ss = hit.filter(function (q) { return q.k === 's'; }), hs = hit.filter(function (q) { return q.k === 'h'; }), tags = ss.map(function (q) { return q.tag; }), via = '';
    if (!tags.length && hs.length) { hs.forEach(function (h) { h.tags.forEach(function (t) { if (tags.indexOf(t) < 0) tags.push(t); }); }); via = hs.length + (hs.length === 1 ? ' hook' : ' hooks'); }
    var n = tags.length;
    return { tags: tags, ids: ss.map(function (q) { return q.id; }), label: n ? (via ? via + ' · ' : '') + n + (n === 1 ? ' session: ' : ' sessions: ') + tags.slice(0, 6).join(', ') + (n > 6 ? ' and ' + (n - 6) + ' more' : '') : via ? via + ', no session on them now' : 'no session in the box' };
  }
  function boxDraw() {
    var d = drag, pk = boxPick(d), ids = {};
    boxEl.style.left = Math.min(d.x, d.x1) + 'px'; boxEl.style.top = Math.min(d.y, d.y1) + 'px'; boxEl.style.width = Math.abs(d.x1 - d.x) + 'px'; boxEl.style.height = Math.abs(d.y1 - d.y) + 'px';
    boxEl.classList.toggle('up', Math.max(d.y, d.y1) > window.innerHeight - 90);
    boxEl.firstChild.textContent = pk.label;
    pk.ids.forEach(function (i) { ids['s:' + i] = 1; });
    Object.keys(els).forEach(function (k) { if (k.indexOf('s:') === 0) els[k].g.classList.toggle('pick', !!ids[k]); });
  }
  stg.addEventListener('mousedown', function (ev) {
    if (ev.button !== 0 || (ev.target === stg && (ev.offsetX >= stg.clientWidth || ev.offsetY >= stg.clientHeight))) return;   // not on a scroll bar
    drag = { x: ev.clientX, y: ev.clientY, on: false };
  });
  window.addEventListener('mousemove', function (ev) {
    if (!drag || !R || !curCam) return;
    if (!drag.on) { if (Math.hypot(ev.clientX - drag.x, ev.clientY - drag.y) < 6) return; drag.on = true; boxEl.hidden = false; }
    drag.x1 = ev.clientX; drag.y1 = ev.clientY; boxDraw();
  });
  window.addEventListener('mouseup', function () {
    var d = drag; drag = null; if (!d || !d.on) return;
    boxEl.hidden = true; skipClick = performance.now() + 300; each('.n.pick', function (g) { g.classList.remove('pick'); });
    var pk = boxPick(d);
    if (pk.tags.length > 1) setLevel(2, pk.tags); else if (pk.tags.length) setLevel(2, pk.tags[0]); else toast('No session in the box');
  });
  each('#levels [data-l]', function (b) { b.addEventListener('click', function () { setLevel(+b.getAttribute('data-l')); }); });
  each('#pages [data-p]', function (b) { b.addEventListener('click', function () { setPage(b.getAttribute('data-p')); }); });
  $('chips').addEventListener('click', function (ev) { var b = ev.target.closest('[data-ans]'); if (b) openAnswer(b.getAttribute('data-ans')); else if (ev.target.closest('[data-evs]') && R) openEv('failed', R.fails); });

  // ---------- operating: answer, stop, open ----------
  var sheet = $('sheet'), toastEl = $('toast'), toastT = 0;
  function toast(html, ms) { toastEl.innerHTML = html; toastEl.hidden = false; clearTimeout(toastT); toastT = setTimeout(function () { toastEl.hidden = true; }, ms || 3200); }
  function sessOf(tag) { return D.sessions.filter(function (s) { return s.tag === tag; })[0]; }
  function post(body) { return fetch('/outbox', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }).then(function (r) { return r.ok; }).catch(function () { return false; }); }
  function closeSheet() { sheet.hidden = true; sheet.innerHTML = ''; holding = false; }
  function openAnswer(tag) {
    var s = sessOf(tag), x = s && D.stateAt(m).sessions.filter(function (q) { return q.id === s.id; })[0];
    if (!x || x.state !== 'waiting') { toast(esc(tag) + ' does not wait for you now'); return; }
    var mins = Math.max(1, Math.round(m - x.wait.from));
    sheet.innerHTML = '<div class="sh-h"><span class="tg">' + esc(tag) + '</span> waits for you &middot; ' + (mins < 60 ? mins + ' min' : Math.floor(mins / 60) + ' h ' + (mins % 60) + ' min') + '<button class="x" data-x title="Close (Esc)">&times;</button></div>' +
      '<div class="sh-n">' + esc(s.name) + '</div><div class="sh-r">&ldquo;' + esc(x.wait.report) + '&rdquo;</div>' +
      '<textarea id="ans" rows="3" placeholder="Your answer to ' + esc(tag) + '"></textarea>' +
      '<div class="sh-b"><button data-q="Go on">Go on</button><button data-q="Hold on">Hold on</button><button data-q="Show me first">Show me first</button><button class="go" data-send>Answer</button></div>';
    sheet.setAttribute('data-tag', tag); sheet.setAttribute('data-kind', 'answer'); sheet.hidden = false; holding = true;
    setTimeout(function () { var a = $('ans'); if (a) a.focus(); }, 30);
  }
  function sendAnswer(tag, text) {
    var s = sessOf(tag), x = s && D.stateAt(m).sessions.filter(function (q) { return q.id === s.id; })[0];
    if (!x || !x.wait) { closeSheet(); return; }
    closeSheet();
    if (LIVE) post({ kind: 'answer', session: s.id, text: text }).then(function (ok) { toast(ok ? 'Answer for <b>' + esc(tag) + '</b> is in the outbox. Nothing carries it into the app yet.' : 'The answer could not be saved', 6000); });
    else { answered[s.id] = { from: x.wait.from, text: text }; toast('Answered <b>' + esc(tag) + '</b>: ' + esc(text) + ' <span class="dim">(on the replay only)</span>', 4200); }
    dirty = true;
  }
  function askStop(tag) {
    var s = sessOf(tag), x = s && D.stateAt(m).sessions.filter(function (q) { return q.id === s.id; })[0]; if (!x || x.state === 'ended') return;
    var hr = x.helpersRunning.length;
    sheet.innerHTML = '<div class="sh-h">Stop <span class="tg">' + esc(tag) + '</span>?<button class="x" data-x title="Close (Esc)">&times;</button></div><div class="sh-n">' + esc(s.name) + (hr ? ' &middot; its ' + hr + (hr === 1 ? ' helper stops' : ' helpers stop') + ' with it' : '') + '</div>' +
      '<div class="sh-b"><button class="stop" data-stop>Yes, stop</button><button data-x>Keep it</button></div>';
    sheet.setAttribute('data-tag', tag); sheet.setAttribute('data-kind', 'stop'); sheet.hidden = false;
  }
  function stopNow(tag) {
    var s = sessOf(tag); closeSheet(); if (!s) return;
    if (LIVE) post({ kind: 'stop', session: s.id, text: '' }).then(function (ok) { toast(ok ? 'Stop for <b>' + esc(tag) + '</b> is in the outbox. Nothing carries it into the app yet. <button data-undo="' + esc(tag) + '">Undo</button>' : 'The stop could not be saved', 8000); });
    else { stopped[s.id] = m; toast('Stopped <b>' + esc(tag) + '</b> <span class="dim">(on the replay only)</span> <button data-undo="' + esc(tag) + '">Undo</button>', 8000); }
    dirty = true;
  }
  function undoStop(tag) {
    var s = sessOf(tag); if (!s) return;
    if (LIVE) post({ kind: 'undo-stop', session: s.id, text: '' }); else delete stopped[s.id];
    toast('Undone: <b>' + esc(tag) + '</b> runs on', 2200); dirty = true;
  }
  function openApp(tag) { toast('Opening <b>' + esc(tag) + '</b> in the app is not connected yet: the page has no way into the app.', 5200); }
  function relOf(id) { var p = D.partById[id]; if (!p || !partHasFile(p)) return ''; return X.files[id] || p.file; }

  // ---------- the side panel: a file, a hook or a failure, read inside the tool ----------
  // One pane by default: a new click switches it. "Keep" holds a pane, and the next click then opens beside it.
  // The page cannot read files itself: the tool's server reads them (GET /file, read-only, inside the repository only).
  var side = $('side'), panes = [];
  var HOWTO = 'This page was opened from the disk, and a page opened from the disk cannot read files. To read it here, start the tool’s server and open the served page:<pre class="mc">node docs/program/monitor/round9/tool/server.mjs\n\nhttp://127.0.0.1:7419/          your live sessions\nhttp://127.0.0.1:7419/?replay   this replay</pre>Until then, VS Code and File pane above open the file outside the tool.';
  function sideSync() { side.hidden = !panes.length; document.body.style.setProperty('--side', panes.length && getComputedStyle(side).position !== 'absolute' ? side.offsetWidth + 'px' : '0px'); }
  function paneHead(d) {
    return '<div class="ph"><span class="pk pk-' + d.kind + '">' + d.kind + '</span><b title="' + esc(d.title) + '">' + esc(d.title) + '</b><span class="pbs">' +
      '<button data-keep title="Keep this one open: the next click then opens beside it">Keep</button>' +
      (d.rel ? '<button data-ext="vscode" title="Open the file in VS Code">VS Code</button><button data-ext="pane" title="Open the file in a tab of the file pane">File pane</button>' : '') +
      '<button data-close class="x" title="Close (Esc)">&times;</button></span></div><div class="pp">' + esc(d.sub || d.rel || '') + '</div>';
  }
  function setBody(d, html, sub) { if (panes.indexOf(d) < 0) return; if (sub) d.el.querySelector('.pp').textContent = sub; d.el.querySelector('.pb').innerHTML = html; }
  function openPane(d) {
    var same = panes.filter(function (p) { return p.key === d.key; })[0];
    if (same) { same.el.classList.remove('blink'); void same.el.offsetWidth; same.el.classList.add('blink'); return same; }
    var slot = panes.filter(function (p) { return !p.keep; })[0], cap = Math.max(2, Math.floor((stg.clientHeight || 600) / 230));   // a pane needs about 230 px of height to be read
    if (!slot && panes.length >= cap) { toast(panes.length + ' are kept open, the most that fit here. Close one to open another.', 4200); return null; }
    d.keep = false; d.el = document.createElement('section'); d.el.className = 'pane';
    d.el.innerHTML = paneHead(d) + '<div class="pb"><div class="pmsg">Reading…</div></div>';
    if (slot) { side.replaceChild(d.el, slot.el); panes[panes.indexOf(slot)] = d; } else { side.appendChild(d.el); panes.push(d); }
    sideSync(); d.load(d); return d;
  }
  function closePane(d) { var i = panes.indexOf(d); if (i < 0) return; panes.splice(i, 1); d.el.remove(); sideSync(); }
  function openOutside(d, how) {
    var rel = d.rel, abs = /^[A-Za-z]:/.test(rel) ? rel : rel.indexOf('~/') === 0 ? '' : X.repo + '/' + rel, vs = how === 'vscode';
    if (SERVED && !vs) { toast('The file pane is reached only from the copy of this page opened from the disk. Use VS Code here.', 5200); return; }
    if (!DRY) {
      if (SERVED) fetch('/open?path=' + encodeURIComponent(rel)).catch(function () {});
      else if (abs) { if (vs) location.href = 'vscode://file/' + encodeURI(abs); else window.open('file:///' + encodeURI(abs), '_blank'); }
    }
    toast('Opening <b>' + esc(d.title) + '</b> in ' + (vs ? 'VS Code' : 'the file pane') + ' <span class="dim">' + esc(rel) + '</span>', 3600);
  }
  side.addEventListener('click', function (ev) {
    var el = ev.target.closest('.pane'), d = panes.filter(function (p) { return p.el === el; })[0], b = ev.target.closest('button'); if (!d || !b) return;
    if (b.hasAttribute('data-close')) closePane(d);
    else if (b.hasAttribute('data-keep')) { d.keep = !d.keep; b.classList.toggle('on', d.keep); b.textContent = d.keep ? 'Kept' : 'Keep'; }
    else if (b.hasAttribute('data-ext')) openOutside(d, b.getAttribute('data-ext'));
  });
  // markdown as text with its headings; anything else as code with line numbers
  function inl(s) { return esc(s).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>'); }
  function mdHtml(text) {
    var out = [], code = null;
    text.split(/\r?\n/).forEach(function (l) {
      if (/^\s*```/.test(l)) { if (code) { out.push('<pre class="mc">' + esc(code.join('\n')) + '</pre>'); code = null; } else code = []; return; }
      if (code) { code.push(l); return; }
      var h = /^(#{1,6})\s+(.*)$/.exec(l), ind = /^\s*/.exec(l)[0].length;
      if (h) out.push('<div class="mh mh' + Math.min(h[1].length, 4) + '">' + inl(h[2]) + '</div>');
      else if (!l.trim()) out.push('<div class="mb"></div>');
      else if (/^\s*\|/.test(l)) out.push('<div class="mt">' + esc(l) + '</div>');
      else if (/^\s*>/.test(l)) out.push('<div class="mq">' + inl(l.replace(/^\s*>\s?/, '')) + '</div>');
      else out.push('<div class="mp"' + (ind ? ' style="margin-left:' + Math.min(ind, 12) * 7 + 'px"' : '') + '>' + inl(l.trim()) + '</div>');
    });
    if (code) out.push('<pre class="mc">' + esc(code.join('\n')) + '</pre>');
    return '<div class="md">' + out.join('') + '</div>';
  }
  function codeHtml(text) {
    var a = text.replace(/\r/g, '').split('\n'), nums = ''; if (a.length > 1 && a[a.length - 1] === '') a.pop();
    for (var i = 1; i <= a.length; i++) nums += i + '\n';
    return '<div class="code"><pre class="ln">' + nums + '</pre><pre class="tx">' + esc(a.join('\n')) + '</pre></div>';
  }
  function getJson(u) { return fetch(u, { cache: 'no-store' }).then(function (r) { return r.json(); }).catch(function () { return { ok: false, reason: 'the tool’s server did not answer' }; }); }
  function fileHtml(rel, j) {
    if (!j.ok) return '<div class="pmsg"><b>' + esc(rel) + '</b> is not shown: ' + esc(j.reason || 'it could not be read') + '.</div>';
    if (j.dir) return '<div class="pmsg"><b>' + esc(rel) + '</b> is a folder. In it:</div><pre class="mc">' + esc(j.names.join('\n')) + '</pre>';
    return (j.shown < j.size ? '<div class="pmsg">The first ' + Math.round(j.shown / 1000) + ' KB of ' + Math.round(j.size / 1000) + ' KB are shown.</div>' : '') + (/\.(md|markdown)$/i.test(rel) ? mdHtml(j.text) : codeHtml(j.text));
  }
  function loadPart(d) {
    var rel = d.rel;
    if (!rel) return setBody(d, '<div class="pmsg"><b>' + esc(d.title) + '</b> has no single file to show' + (d.sub ? ' (' + esc(d.sub) + ')' : '') + '.</div>');
    if (/^([A-Za-z]:|~\/)/.test(rel)) return setBody(d, '<div class="pmsg">This file is outside the repository, so the tool does not read it. VS Code above opens it.</div>');
    if (!SERVED) return setBody(d, '<div class="pmsg">' + HOWTO + '</div>');
    getJson('/file?path=' + encodeURIComponent(rel)).then(function (j) { setBody(d, fileHtml(rel, j), j.ok && !j.dir ? rel + ' · ' + j.text.split('\n').length + ' lines' + (d.first ? ' · the first of this part’s files' : '') : ''); });
  }
  function openPart(id) {
    var p = D.partById[id]; if (!p) return;
    var rel = relOf(id), one = rel && !/[{*<]/.test(rel);
    openPane({ key: 'f:' + id, kind: p.group === 'Hooks' ? 'hook' : 'file', title: p.name, rel: one ? rel : '', sub: rel || p.file || '', first: !!X.files[id] && X.files[id] !== p.file, load: loadPart });
  }
  // a failure (or a refusal): which hook, which session, when, what on; the hook's file below it
  var EVW = { failed: 'failed on', refused: 'refused' };
  function when(ms) { var t = (ms - BASE) / 60000; return D.dayName(t) + ' ' + D.hm(Math.floor(t)); }
  function openEv(result, pairs) {
    var seen = {}, hooks = [], tags = [];
    pairs = pairs.filter(function (q) { var k = q.join('|'); if (seen[k] || !sessOf(q[0]) || !D.partById[q[1]]) return false; seen[k] = 1; return true; });
    if (!pairs.length) return;
    pairs.forEach(function (q) { if (tags.indexOf(q[0]) < 0) tags.push(q[0]); if (hooks.indexOf(q[1]) < 0) hooks.push(q[1]); });
    openPane({ key: 'ev:' + result + '|' + pairs.join(';'), kind: result === 'refused' ? 'refusal' : 'failure', title: hooks.map(function (h) { return D.partById[h].name; }).join(', ') + ' ' + EVW[result] + ' ' + tags.join(', '),
      rel: D.partById[hooks[0]].file, sub: hooks.map(function (h) { return D.partById[h].file; }).join(' · '), pairs: pairs, result: result, hooks: hooks, load: loadEv });
  }
  function loadEv(d) {
    var nowMs = BASE + (m + 1) * 60000, html = '';
    d.pairs.forEach(function (q) {
      var s = sessOf(q[0]), p = D.partById[q[1]], same = function (e) { return (e.session || e.sid) === s.id && e.part === q[1] && e.result === d.result && e.t <= m + 0.5; };
      var evs = D.events.filter(same); if (!evs.length) evs = HOOKC.filter(same);
      var last = evs[evs.length - 1], times = evs.map(function (e) { return D.hm(Math.floor(e.t)); });
      var base = d.result === 'refused' ? 'The hook refused a call of this session.' : last && last.kind === 'window' ? 'The session’s window went past its limit.' : 'The app recorded an error from this hook when a turn of the session ended.';
      html += '<div class="evb"><div class="evt">' + (d.result === 'failed' ? '&#9650; ' : '&#9670; ') + esc(p.name + ' ' + EVW[d.result] + ' ' + s.tag) + '</div><dl>' +
        '<dt>Hook</dt><dd><b>' + esc(p.name) + '</b> &middot; ' + esc(p.file) + '</dd>' +
        '<dt>Session</dt><dd><b>' + esc(s.tag) + '</b> &middot; ' + esc(s.name) + '</dd>' +
        '<dt>When</dt><dd>' + (last ? '<b>' + esc(D.dayName(last.t) + ' ' + times[times.length - 1]) + '</b>' + (times.length > 1 ? ' &middot; ' + times.length + ' times so far: ' + esc(times.slice(-8).join(', ')) : '') : 'no time was recorded') + '</dd>' +
        '<dt>' + (d.result === 'failed' ? 'Failed on' : 'Refused') + '</dt><dd class="evw">' + base + (SERVED ? ' Reading its words…' : ' Its own words are in the hook’s log and the session’s transcript, which this page cannot read (see below).') + '</dd></dl></div>';
    });
    d.hooks.slice(0, 2).forEach(function (h) { html += '<div class="evf">The hook’s file &middot; ' + esc(D.partById[h].file) + '</div><div class="evfile">' + (SERVED ? '<div class="pmsg">Reading…</div>' : '') + '</div>'; });
    setBody(d, '<div class="' + d.result + '">' + html + '</div>' + (SERVED ? '' : '<div class="pmsg">' + HOWTO + '</div>'));
    if (!SERVED) return;
    d.pairs.forEach(function (q, i) {
      getJson('/fail?session=' + sessOf(q[0]).id + '&part=' + encodeURIComponent(q[1]) + '&result=' + d.result).then(function (j) {
        var slot = d.el.querySelectorAll('.evw')[i], h = ''; if (!slot) return;
        (j.items || []).filter(function (x) { return LIVE || x.ms <= nowMs; }).slice(-3).reverse().forEach(function (x) {
          h += '<div class="evi"><div class="evm">' + esc(when(x.ms)) + ' &middot; from ' + (x.src === 'log' ? 'the hook’s log' : 'the session’s transcript') + '</div>' + (x.text ? '<div class="evx">' + esc(x.text) + '</div>' : '') + (x.fields ? '<div class="evk">' + esc(x.fields) + '</div>' : '') + '</div>';
        });
        slot.innerHTML = h || (j.ok ? 'No record of it was found in the hook’s log or the session’s transcript.' : 'Not read: ' + esc(j.reason || 'the server refused') + '.');
      });
    });
    d.hooks.slice(0, 2).forEach(function (h, i) {
      var rel = D.partById[h].file;
      getJson('/file?path=' + encodeURIComponent(rel)).then(function (j) { var slot = d.el.querySelectorAll('.evfile')[i]; if (slot) slot.innerHTML = fileHtml(rel, j); });
    });
  }
  sheet.addEventListener('click', function (ev) {
    var t = ev.target, tag = sheet.getAttribute('data-tag');
    if (t.closest('[data-x]')) closeSheet();
    else if (t.closest('[data-q]')) sendAnswer(tag, t.closest('[data-q]').getAttribute('data-q'));
    else if (t.closest('[data-send]')) { var a = $('ans'), v = a.value.trim(); if (!v) { a.placeholder = 'Write an answer first, or pick one below'; a.focus(); } else sendAnswer(tag, v); }
    else if (t.closest('[data-stop]')) stopNow(tag);
  });
  toastEl.addEventListener('click', function (ev) { var u = ev.target.closest('[data-undo]'); if (u) undoStop(u.getAttribute('data-undo')); });

  // ---------- jump: press / and type a session, a hook or a file ----------
  var jumpEl = $('jump'), jumpIn = $('jumpin'), jumpList = $('jumplist'), jumpIt = [], jumpSel = 0;
  function sessionUsing(pid) {
    var c = D.sessions.filter(function (s) { return s.start <= m; }).sort(function (a, b) { return (b.tag === open) - (a.tag === open) || b.start - a.start; });
    for (var i = 0; i < c.length; i++) { var s = c[i]; if ((X.rw[s.id] || {})[pid] || (fileBy[s.id] || []).some(function (q) { return q.part === pid && q.t <= m; }) || s.helpers.some(function (h) { return h.start <= m && h.parts.indexOf(pid) >= 0; })) return s.tag; }
    return '';
  }
  function jumpItems(q) {
    q = q.trim().toLowerCase(); var out = [];
    D.sessions.forEach(function (s) { if (s.start <= m + 0.01 && (!q || (s.tag + ' ' + s.name).toLowerCase().indexOf(q) >= 0)) out.push({ k: 's', id: s.tag, a: s.tag, b: s.name, c: 'session' }); });
    D.parts.forEach(function (p) { if (!partHasFile(p)) return; if (q && (p.name + ' ' + p.file).toLowerCase().indexOf(q) >= 0) out.push({ k: 'p', id: p.id, a: p.name, b: p.file, c: p.group === 'Hooks' ? 'hook' : 'file' }); });
    return out.slice(0, 9);
  }
  function jumpDraw() { jumpIt = jumpItems(jumpIn.value); jumpSel = clamp(jumpSel, 0, Math.max(0, jumpIt.length - 1)); jumpList.innerHTML = jumpIt.map(function (it, i) { return '<div class="ji' + (i === jumpSel ? ' on' : '') + '" data-i="' + i + '"><b>' + esc(it.a) + '</b><span>' + esc(it.b) + '</span><i>' + it.c + '</i></div>'; }).join('') || '<div class="ji none">nothing by that name</div>'; }
  function jumpOpen(q) { jumpEl.hidden = false; jumpIn.value = q || ''; jumpSel = 0; jumpDraw(); jumpIn.focus(); }
  function jumpClose() { jumpEl.hidden = true; jumpIn.blur(); }
  function jumpGo(it) {
    jumpClose(); if (!it) return;
    if (it.k === 's') setLevel(2, it.id);
    else if (it.c === 'hook') { setLevel(1); flash = { id: it.id, until: performance.now() + 2800 }; }
    else { var tag = sessionUsing(it.id); if (!tag) { toast('No session has used <b>' + esc(it.a) + '</b> so far today'); return; } setLevel(3, tag); sel = it.id; dirty = true; }
  }
  jumpIn.addEventListener('input', function () { jumpSel = 0; jumpDraw(); });
  jumpIn.addEventListener('keydown', function (ev) {
    if (ev.key === 'ArrowDown') { jumpSel++; jumpDraw(); ev.preventDefault(); } else if (ev.key === 'ArrowUp') { jumpSel--; jumpDraw(); ev.preventDefault(); }
    else if (ev.key === 'Enter') jumpGo(jumpIt[jumpSel]); else if (ev.key === 'Escape') jumpClose();
    ev.stopPropagation();
  });
  jumpList.addEventListener('mousedown', function (ev) { var d = ev.target.closest('[data-i]'); if (d) jumpGo(jumpIt[+d.getAttribute('data-i')]); });
  $('jumpb').addEventListener('click', function () { jumpOpen(''); });
  jumpEl.addEventListener('mousedown', function (ev) { if (ev.target === jumpEl) jumpClose(); });

  // ---------- the replay ----------
  function setPlaying(v) { playing = v; $('play').textContent = v ? 'Pause' : 'Play'; $('play').classList.toggle('on', v); }
  function setSpeed(v) { speed = v; rate = v / 60000; resched(); each('#speeds [data-s]', function (b) { b.classList.toggle('on', +b.getAttribute('data-s') === v); }); }
  $('play').addEventListener('click', function () { if (!playing && m >= T1) m = T0; setPlaying(!playing); });
  each('#speeds [data-s]', function (b) { b.addEventListener('click', function () { setSpeed(+b.getAttribute('data-s')); }); });
  var sc0 = $('scrub'); sc0.step = 0.05;
  sc0.addEventListener('input', function () { scrubbing = true; m = +sc0.value; dirty = true; });
  sc0.addEventListener('change', function () { scrubbing = false; });
  document.addEventListener('keydown', function (ev) {
    var tg = ev.target && ev.target.tagName, typing = tg === 'INPUT' || tg === 'TEXTAREA';
    if (ev.key === 'Escape') { if (!sheet.hidden) { closeSheet(); return; } if (!jumpEl.hidden) { jumpClose(); return; } if (typing) return; var un = panes.filter(function (p) { return !p.keep; })[0]; if (un) { closePane(un); return; } wider(); return; }
    if (typing) { if (tg === 'TEXTAREA' && ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey)) { var v = ev.target.value.trim(); if (v) sendAnswer(sheet.getAttribute('data-tag'), v); } return; }
    if (ev.key === '/') { ev.preventDefault(); jumpOpen(''); }
    else if (ev.key === '+' || ev.key === '=') zoomIn(mouse || [-1e6, -1e6]);   // the key follows the cursor as the wheel does; off the picture it is at nothing
    else if (ev.key === '-' || ev.key === 'Backspace') wider();
    else if (ev.key === ' ' && !follow) { ev.preventDefault(); setPlaying(!playing); }
    else if (ev.key === 'ArrowRight' && !follow) { m = Math.min(T1, m + 1); dirty = true; }
    else if (ev.key === 'ArrowLeft' && !follow) { m = Math.max(T0, m - 1); dirty = true; }
  });
  var lastW = 0, lastH = 0;
  function resized() { var w = stg.clientWidth, h = stg.clientHeight; if (Math.abs(w - lastW) < 2 && Math.abs(h - lastH) < 2) return; lastW = w; lastH = h; dirty = true; jump = true; }
  if (window.ResizeObserver) new ResizeObserver(resized).observe(stg);
  window.addEventListener('resize', resized);

  // ---------- live: the same page fed by the server ----------
  function addCall(c) { HOOKC.push(c); (hookBy[c.sid] = hookBy[c.sid] || []).push(c); if (c.result === 'failed') (failBy[c.sid] = failBy[c.sid] || []).push(c); if (firstFired[c.part] === undefined) firstFired[c.part] = c.t; }
  function loadLive() {
    return fetch('/data.json', { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
      if (!j) return;
      Object.keys(j).forEach(function (k) { D[k] = j[k]; }); window.TOOL_INDEX(D); liveMade = j.madeMs || Date.now();
      ingest();
      pending = pending.filter(function (c) { return c.ms > liveMade; }); pending.forEach(addCall); if (pending.length) resched();
      if (follow) { m = nowM(); T1 = m; }
      jump = true; bar();
    }).catch(function () { /* the server is away: the last picture stays */ });
  }
  function startLive() {
    loadLive();
    var es = new EventSource('/live');
    es.addEventListener('data', function () { loadLive(); });
    es.addEventListener('hook', function (ev) {
      var e; try { e = JSON.parse(ev.data); } catch (x) { return; }
      var sid = String(e.session || '').slice(0, 8), s = D.sessionById[sid]; if (!s || !e.part) return;
      var c = { t: Math.max(e.t || 0, nowM() + TRAVEL * rate, HOOKC.length ? HOOKC[HOOKC.length - 1].t : 0), sid: sid, tag: s.tag, part: e.part, result: e.result, ms: Date.now() };
      pending.push(c); addCall(c); resched();
    });
  }

  // for checks from outside the page (screenshots, the frame measure)
  window.__tool = {
    set: function (o) {
      if (o.page) setPage(o.page); if (o.speed) setSpeed(o.speed); if (o.m !== undefined) m = o.m; if (o.t) m = parseT(o.t); if (o.paused !== undefined) setPlaying(!o.paused);
      if (o.level !== undefined) setLevel(o.level, o.group || o.open || ''); if (o.sel !== undefined) { sel = o.sel; unfold = false; } if (o.panes === 0) panes.slice().forEach(closePane); if (o.pane) openPart(o.pane); if (o.unfold !== undefined) unfold = !!o.unfold; if (o.answer) openAnswer(o.answer); if (o.stop) askStop(o.stop); if (o.jump !== undefined) jumpOpen(o.jump);
      if (o.instant) { instantNext = true; hideUntil = 0; } dirty = true;
    },
    aim: aim,
    state: function () { return { page: page, live: LIVE, m: m, clock: D.hm(Math.floor(m)), level: level, open: open, group: group, rel: R && R.rel, panes: panes.map(function (p) { return p.kind + ': ' + p.title + (p.keep ? ' (kept)' : ''); }), near: NEAR, reach: REACH, sel: sel, links: R && R.sel, playing: playing, speed: speed, cap: CAP, scale: curCam && curCam.s, scroll: curCam && [Math.round(curCam.w), Math.round(curCam.h)], rails: R && R.rails, nodes: R && R.nodes.length, flights: SCH_H.flights.length, folds: SCH_H.folds.length, calls: HOOKC.length, sessions: D.sessions.length, pending: pending.length }; },
    perf: function (reset) { var n = frames.length, max = 0, over = 0; frames.forEach(function (d) { if (d > max) max = d; if (d > 34) over++; }); if (reset) frames = []; return { frames: n, slowest: Math.round(max * 10) / 10, over34: over }; },
    schedule: function () { return SCH_H; }, push: function (c) { addCall(c); resched(); }
  };

  ingest();
  m = Q.has('m') ? +Q.get('m') : (parseT(Q.get('t')) || (page === 'history' ? T1 : Math.floor(T0 / 1440) * 1440 + 205.4));
  if (page === 'history' && !Q.has('t') && !Q.has('m')) playing = false;
  setSpeed(speed); setPlaying(playing);
  if (level < 2 || !open) { level = Math.min(level, 1); open = ''; group = []; }   // a view of one session only with the session named
  if (LIVE) { m = nowM(); startLive(); }
  bar();
  requestAnimationFrame(frame);
})();
