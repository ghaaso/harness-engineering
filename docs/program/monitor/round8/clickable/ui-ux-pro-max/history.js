/* History page: the week as seven day strips (never cut), a window onto one day with session lanes, helpers packed in, hook rows on the same clock. */
(function () {
  'use strict';
  var APP = window.APP, D = APP.D, S = APP.S, $ = APP.$, $$ = APP.$$, el = APP.el, esc = APP.esc, I = APP.icon;
  var H = APP.History = {};
  var DAYS = D.week.days, DS = 8460, DE = 9530;
  var HOOKS = D.parts.filter(function (p) { return p.group === 'Hooks'; });
  var HEAT = ['var(--heat-0)', 'var(--heat-1)', 'var(--heat-2)', 'var(--heat-3)', 'var(--heat-4)'];
  var MAXH = Math.max.apply(null, DAYS.map(function (d) { return Math.max.apply(null, d.helpers); }));
  var ST = { day: 6, w0: null, w1: null, unfold: {} };
  var TROUBLE = D.events.filter(function (e) { return e.result !== 'passed'; });
  var workN = new Array(DE - DS + 1).fill(0);
  D.sessions.forEach(function (s) { s.segs.forEach(function (g) { for (var m = Math.ceil(g[0]); m <= Math.floor(g[1]); m++) workN[m - DS]++; }); });

  var css = '.day-label,.day-cell,.day-sum{height:38px!important}.day-cell svg{height:38px!important}.day-label small{line-height:1.1}#page-history{padding:12px 16px}.axis-row{height:18px}' + '.dayrow{display:grid;grid-template-columns:138px minmax(0,1fr) 118px;width:100%;border-radius:8px;align-items:center;margin:0}.weekgrid{display:block}.dayrow:hover{background:var(--surface-2)}.dayrow.sel{background:var(--wait-tint)}' +
    '.dayrow>*{background:none!important}.day-cell{cursor:crosshair}.day-sum{font-variant-numeric:tabular-nums}.hd-grid{display:flex;align-items:flex-start}.hd-l{flex:none;width:250px}.hd-r{flex:1;min-width:0}' +
    '.lab-h{height:26px}.lab-hook{display:block;width:100%;height:13px;line-height:13px;font-size:12px;font-weight:600;color:var(--ink-2);padding-left:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:left;border-radius:3px}.lab-hook:hover{background:var(--surface-2);color:var(--ink)}' +
    '.sumchips{display:flex;gap:6px;flex-wrap:wrap}.sumchip{display:inline-flex;align-items:center;gap:6px;height:28px;padding:0 10px;border-radius:14px;background:var(--surface-2);border:1px solid var(--line);font-weight:700;font-size:13px;color:var(--ink-2)}.sumchip b{color:var(--ink);font-variant-numeric:tabular-nums}' +
    '.hist-swatch{display:inline-block;width:14px;height:12px;border-radius:2px;vertical-align:-2px;margin-right:4px}.lane-hit{fill:transparent}.fold:focus-visible{outline:3px solid var(--focus)}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  function d0(di) { return di * 1440; }
  function dayEnd(di) { return di === 6 ? Math.min(d0(6) + 1440, D.replayEnd + 5) : d0(di) + 1440; }
  function gapRuns(w0, w1, minLen) {
    var runs = [], s = null, a = Math.max(Math.ceil(w0), DS), b = Math.min(Math.floor(w1), DE), first = -1, last = -1, m;
    for (m = a; m < b; m++) if (workN[m - DS] > 0) { if (first < 0) first = m; last = m; }
    if (first < 0) return runs;
    for (m = first; m <= last + 1; m++) {
      if (m <= last && workN[m - DS] === 0) { if (s == null) s = m; } else { if (s != null && m - s >= minLen) runs.push([s, m]); s = null; }
    }
    return runs;
  }
  function laneOrder(w0, w1) {
    var list = D.sessions.filter(function (s) { return s.start < w1 && (s.end == null || s.end > w0); }), ids = {}, out = [];
    list.forEach(function (s) { ids[s.id] = s; });
    function add(s, depth) { out.push({ s: s, depth: depth }); list.filter(function (c) { return c.parent === s.id; }).sort(function (a, b) { return a.start - b.start; }).forEach(function (c) { add(c, depth + 1); }); }
    list.filter(function (s) { return !s.parent || !ids[s.parent]; }).sort(function (a, b) { return a.start - b.start; }).forEach(function (s) { add(s, 0); });
    return out;
  }
  function tri(x, y, w) { return 'M' + x.toFixed(1) + ',' + (y - w * 0.7).toFixed(1) + ' l' + w + ',' + (w * 1.35).toFixed(1) + ' h' + (-2 * w) + 'z'; }
  function dia(x, y, w) { return 'M' + x.toFixed(1) + ',' + (y - w).toFixed(1) + ' l' + w + ',' + w + ' l' + (-w) + ',' + w + ' l' + (-w) + ',' + (-w) + 'z'; }

  /* ---------- skeleton ---------- */
  H.init = function () {
    var r = $('#page-history');
    r.innerHTML =
      '<section class="panel hist-week" aria-label="The week"><div class="panel-h"><span class="eyebrow">The week</span>' +
      '<div class="legend"><span>' + [0, 1, 2, 3, 4].map(function (i) { return '<i class="hist-swatch" style="background:' + HEAT[i] + '"></i>' + (i === 4 ? '4' : i); }).join(' ') + ' sessions at once</span><span style="color:var(--bad)">' + I('tri', 'sm fill') + 'trouble</span><span style="color:var(--wait)">' + I('user', 'sm') + 'you wrote · away</span></div></div>' +
      '<div class="axis-row"><span></span><div class="ax" id="wk-ax"></div><span></span></div><div class="weekgrid" id="wk-rows" role="group" aria-label="Choose a day"></div></section>' +
      '<section class="panel hist-day" aria-label="One day"><div class="panel-h"><span class="eyebrow" id="hd-title"></span><div class="sumchips" id="hd-sum"></div><span style="flex:1"></span>' +
      '<div class="presets"><button class="btn sm" id="pr-all" type="button">Whole day</button><button class="btn sm" id="pr-busy" type="button">Busiest 3 h</button>' +
      '<button class="iconbtn" id="pr-l" type="button" aria-label="Earlier">' + I('back', 'sm') + '</button><button class="iconbtn" id="pr-r" type="button" aria-label="Later"><span style="display:inline-flex;transform:scaleX(-1)">' + I('back', 'sm') + '</span></button></div></div>' +
      '<div class="hd-grid" id="hd-body"></div></section>';
    var q = new URLSearchParams(location.search);
    if (q.get('day') != null) ST.day = +q.get('day');
    if (q.get('win')) { var m = q.get('win').split('-'); ST.w0 = d0(6) + (+m[0].split(':')[0]) * 60 + (+m[0].split(':')[1] || 0); ST.w1 = d0(6) + (+m[1].split(':')[0]) * 60 + (+m[1].split(':')[1] || 0); }
    $('#pr-all').onclick = function () { setWin(null); };
    $('#pr-busy').onclick = function () { busiest(); };
    $('#pr-l').onclick = function () { pan(-1); }; $('#pr-r').onclick = function () { pan(1); };
    var t; window.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(function () { if (S.page === 'history') render(); }, 150); });
    wire();
  };
  H.show = function () { render(); };
  H.redraw = function () { if (S.page === 'history') render(); };

  function win() { var a = ST.w0 == null ? d0(ST.day) : ST.w0, b = ST.w1 == null ? dayEnd(ST.day) : ST.w1; return [a, b]; }
  function setWin(a, b) { if (a == null) { ST.w0 = ST.w1 = null; } else { var lo = d0(ST.day), hi = dayEnd(ST.day), len = Math.max(30, b - a); a = Math.max(lo, Math.min(a, hi - len)); ST.w0 = a; ST.w1 = Math.min(hi, a + len); } render(); }
  function pan(dir) { var w = win(), len = w[1] - w[0]; if (len >= dayEnd(ST.day) - d0(ST.day) - 1) return; setWin(w[0] + dir * len / 2, w[0] + dir * len / 2 + len); }
  function busiest() {
    var day = DAYS[ST.day], best = 0, bi = 0;
    for (var i = 0; i < 288 - 36; i += 3) { var s = 0; for (var j = 0; j < 36; j++) s += day.trouble[i + j]; if (s > best) { best = s; bi = i; } }
    setWin(d0(ST.day) + bi * 5, d0(ST.day) + bi * 5 + 180);
  }

  /* ---------- the week ---------- */
  function weekSVG(di, W) {
    var d = DAYS[di], bw = W / 288, o = d0(di), s = ['<svg width="' + W + '" height="38" role="img" aria-label="' + esc(d.label) + ': sessions at once, trouble and your messages">'];
    for (var i = 0; i < 288; i++) {
      var v = d.sessions[i], h = d.helpers[i], t = d.trouble[i], x = i * bw;
      if (v > 0) s.push('<rect x="' + x.toFixed(1) + '" y="9" width="' + (bw + 0.4).toFixed(1) + '" height="15" fill="' + HEAT[Math.min(4, v)] + '"/>');
      if (h > 0) { var hh = Math.max(1.5, h / MAXH * 7); s.push('<rect x="' + x.toFixed(1) + '" y="' + (38 - hh).toFixed(1) + '" width="' + Math.max(1, bw - 0.3).toFixed(1) + '" height="' + hh.toFixed(1) + '" fill="var(--ink-3)" opacity=".5"/>'); }
      if (t > 0) s.push('<path class="m-bad" d="' + tri(x + bw / 2, 4.5, 4) + '"/>');
    }
    D.owner.away.forEach(function (a) { var l = Math.max(a.left, o), b = Math.min(a.back, o + 1440); if (b > l) s.push('<line x1="' + ((l - o) / 1440 * W).toFixed(1) + '" x2="' + ((b - o) / 1440 * W).toFixed(1) + '" y1="28" y2="28" stroke="var(--wait-fill)" stroke-width="2" opacity=".55"/>'); });
    D.owner.messages.forEach(function (m) { if (m >= o && m < o + 1440) s.push('<circle class="youdot" cx="' + ((m - o) / 1440 * W).toFixed(1) + '" cy="28" r="2.6"/>'); });
    if (di === ST.day) {
      var w = win(), bx = (w[0] - o) / 1440 * W, bwid = (w[1] - w[0]) / 1440 * W;
      s.push('<rect x="' + bx.toFixed(1) + '" y="1" width="' + bwid.toFixed(1) + '" height="36" rx="3" fill="var(--wait-fill)" fill-opacity=".10" stroke="var(--wait-fill)" stroke-width="2"/>');
    }
    s.push('</svg>');
    return s.join('');
  }
  function drawWeek() {
    var rows = $('#wk-rows'); rows.innerHTML = '';
    DAYS.forEach(function (d, di) {
      var peak = Math.max.apply(null, d.sessions), hp = Math.max.apply(null, d.helpers), tr = d.trouble.reduce(function (a, b) { return a + b; }, 0);
      var b = el('button', { class: 'dayrow' + (di === ST.day ? ' sel' : ''), type: 'button', 'data-day': di, 'aria-pressed': String(di === ST.day), 'aria-label': d.label + ', peak ' + peak + ' sessions, ' + tr + ' trouble marks' });
      b.innerHTML = '<span class="day-label">' + esc(d.label.replace(' Nov', '')) + '<small>peak ' + peak + ' · ' + hp + ' helpers</small></span><span class="day-cell"></span><span class="day-sum" style="color:' + (tr ? 'var(--bad)' : 'var(--ink-3)') + '">' + (tr ? I('tri', 'sm fill') + tr : '–') + '</span>';
      rows.appendChild(b);
    });
    var W = $('.day-cell', rows).clientWidth || 1400;
    $$('.dayrow', rows).forEach(function (b) { $('.day-cell', b).innerHTML = weekSVG(+b.dataset.day, W); });
    var ax = $('#wk-ax'); ax.innerHTML = [0, 3, 6, 9, 12, 15, 18, 21, 24].map(function (h) { return '<span style="left:' + (h / 24 * 100) + '%">' + (h < 10 ? '0' : '') + h + ':00</span>'; }).join('');
    V.weekW = W;
  }
  var V = { weekW: 1400 };

  /* ---------- the day ---------- */
  function buildMap(w0, w1, Wpx) {
    var parts = [], cur = w0, gaps = gapRuns(w0, w1, 15);
    gaps.forEach(function (g) { if (g[1] - g[0] >= 120 && !ST.unfold[g[0]]) { if (g[0] > cur) parts.push({ a: cur, b: g[0], fold: false }); parts.push({ a: g[0], b: g[1], fold: true }); cur = g[1]; } });
    if (cur < w1) parts.push({ a: cur, b: w1, fold: false });
    var nf = parts.filter(function (p) { return p.fold; }).length, FW = 76, normal = parts.reduce(function (s, p) { return s + (p.fold ? 0 : p.b - p.a); }, 0) || 1, scale = (Wpx - FW * nf) / normal, x = 0;
    parts.forEach(function (p) { p.x = x; p.w = p.fold ? FW : (p.b - p.a) * scale; x += p.w; });
    var map = {
      parts: parts, scale: scale, gaps: gaps,
      X: function (m) {
        for (var i = 0; i < parts.length; i++) { var p = parts[i]; if (m <= p.b || i === parts.length - 1) { if (m < p.a) return p.x; var mm = Math.min(m, p.b); return p.fold ? p.x + (mm - p.a) / (p.b - p.a) * p.w : p.x + (mm - p.a) * scale; } }
        return x;
      },
      inv: function (px) { for (var i = 0; i < parts.length; i++) { var p = parts[i]; if (px <= p.x + p.w || i === parts.length - 1) return p.fold ? p.a : p.a + Math.max(0, px - p.x) / scale; } return w1; }
    };
    return map;
  }

  function drawDay() {
    var di = ST.day, body = $('#hd-body'), d = DAYS[di], w = win();
    $('#hd-title').textContent = d.label;
    var all = w[0] <= d0(di) && w[1] >= dayEnd(di) - 1;
    $('#pr-all').setAttribute('aria-pressed', String(all)); $('#pr-l').disabled = $('#pr-r').disabled = all;
    if (di !== 6) { drawAgg(body, d, di); return; }
    var lanes = laneOrder(w[0], w[1]);
    var tr = TROUBLE.filter(function (e) { return e.t >= w[0] && e.t < w[1]; });
    $('#hd-sum').innerHTML = '<span class="sumchip"><b>' + lanes.length + '</b> sessions</span><span class="sumchip" style="color:var(--bad)">' + I('tri', 'sm fill') + '<b style="color:var(--bad)">' + tr.filter(function (e) { return e.result === 'failed'; }).length + '</b> failed</span><span class="sumchip" style="color:var(--warn)">' + I('dia', 'sm fill') + '<b style="color:var(--warn)">' + tr.filter(function (e) { return e.result === 'refused'; }).length + '</b> refused</span>';
    var LH = 20, AX = 26, HR = 13, H1 = AX + lanes.length * LH, H2 = H1 + 12 + HOOKS.length * HR;
    body.innerHTML = '<div class="hd-l" id="hd-l"></div><div class="hd-r" id="hd-r"></div>';
    var Wpx = Math.max(300, $('#hd-r').clientWidth || 1400), M = buildMap(w[0], w[1], Wpx), X = M.X;
    /* labels */
    var lab = '<div class="lab-h"></div>' + lanes.map(function (l) {
      return '<button class="lane-label" type="button" data-sid="' + l.s.id + '" style="padding-left:' + (l.depth * 14) + 'px;height:' + LH + 'px" aria-label="Open session ' + esc(l.s.tag) + ', ' + esc(l.s.name) + '" data-tip="' + esc(l.s.name) + (l.s.parent && D.sessionById[l.s.parent] ? '<br>started by ' + esc(D.sessionById[l.s.parent].tag) : '') + '"><span class="tag">' + esc(l.s.tag) + '</span><span class="nm">' + esc(l.s.name) + '</span></button>';
    }).join('') + '<div style="height:12px"></div>' + HOOKS.map(function (p) { return '<button class="lab-hook" type="button" data-hpart="' + p.id + '" data-tip="' + esc(p.name) + '">' + esc(p.name) + '</button>'; }).join('');
    $('#hd-l').innerHTML = lab;
    /* svg */
    var s = ['<svg class="hist-svg" id="hd-svg" width="' + Wpx + '" height="' + H2 + '" role="img" aria-label="Session lanes and hook rows for ' + esc(d.label) + '"><defs><pattern id="hh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line class="hatch-l" x1="0" y1="0" x2="0" y2="7" stroke-width="1.6"/></pattern></defs>'];
    lanes.forEach(function (l, i) { if (i % 2 === 0) s.push('<rect class="stripe" x="0" y="' + (AX + i * LH) + '" width="' + Wpx + '" height="' + LH + '" opacity=".7"/>'); });
    HOOKS.forEach(function (p, i) { if (i % 2 === 0) s.push('<rect class="stripe" x="0" y="' + (H1 + 12 + i * HR) + '" width="' + Wpx + '" height="' + HR + '" opacity=".7"/>'); });
    /* hour grid + axis */
    var pxh = 60 * M.scale, step = pxh >= 38 ? 1 : pxh >= 19 ? 2 : 3, first = Math.ceil(w[0] / 60);
    for (var h = first; h * 60 <= w[1]; h++) {
      var m = h * 60, inFold = M.parts.some(function (p) { return p.fold && m > p.a && m < p.b; }); if (inFold) continue;
      s.push('<line class="gridl" x1="' + X(m).toFixed(1) + '" x2="' + X(m).toFixed(1) + '" y1="' + (AX - 6) + '" y2="' + H2 + '"/>');
      if (h % step === 0) s.push('<text class="axt" x="' + X(m).toFixed(1) + '" y="12" text-anchor="middle">' + APP.hm(m) + '</text>');
    }
    /* quiet stretches */
    M.gaps.forEach(function (g) {
      var folded = M.parts.some(function (p) { return p.fold && p.a === g[0]; }); if (folded) return;
      var x1 = X(g[0]), x2 = X(g[1]);
      s.push('<rect x="' + x1.toFixed(1) + '" y="' + AX + '" width="' + (x2 - x1).toFixed(1) + '" height="' + (H2 - AX) + '" fill="url(#hh)" opacity=".5"/><text class="rt" x="' + ((x1 + x2) / 2).toFixed(1) + '" y="' + (AX + 14) + '" text-anchor="middle" style="fill:var(--ink-2);paint-order:stroke;stroke:var(--surface);stroke-width:5px">' + (x2 - x1 > 90 ? 'quiet ' : '') + APP.dur(g[1] - g[0]) + '</text>');
    });
    /* lanes */
    var perSess = {}; TROUBLE.forEach(function (e) { (perSess[e.session] = perSess[e.session] || []).push(e); });
    lanes.forEach(function (l, i) {
      var y0 = AX + i * LH, sx = l.s;
      sx.segs.forEach(function (g) { var a = Math.max(g[0], w[0]), b = Math.min(g[1], w[1]); if (b > a) s.push('<rect x="' + X(a).toFixed(1) + '" y="' + (y0 + 3) + '" width="' + Math.max(2, X(b) - X(a)).toFixed(1) + '" height="10" rx="2" fill="var(--ink-2)"/>'); });
      sx.waits.forEach(function (g) { var a = Math.max(g[0], w[0]), b = Math.min(g[1], w[1]); if (b > a) s.push('<rect class="waitb" x="' + X(a).toFixed(1) + '" y="' + (y0 + 3) + '" width="' + Math.max(2, X(b) - X(a)).toFixed(1) + '" height="10" rx="2" opacity=".9"/>'); });
      /* helpers packed under the bar: running count in 10 minute bins */
      var bins = {}; sx.helpers.forEach(function (hp) { var e = hp.end == null ? w[1] : hp.end; for (var m = Math.floor(Math.max(hp.start, w[0]) / 10); m * 10 < Math.min(e, w[1]); m++) bins[m] = (bins[m] || 0) + 1; });
      Object.keys(bins).forEach(function (k) { var a = k * 10, bh = Math.min(6, 1.5 + bins[k] * 0.7); s.push('<rect x="' + X(a).toFixed(1) + '" y="' + (y0 + 20 - bh - 1).toFixed(1) + '" width="' + Math.max(1, X(a + 10) - X(a) - 0.4).toFixed(1) + '" height="' + bh.toFixed(1) + '" fill="var(--ink-3)" opacity=".55"/>'); });
      var last = null;
      (perSess[sx.id] || []).forEach(function (e) {
        if (e.t < w[0] || e.t >= w[1]) return; if (last && last.part === e.part && last.result === e.result && e.t - last.t < 1.2) return; last = e;
        var x = X(e.t); s.push('<g class="svm" data-part="' + e.part + '" data-tip="' + esc((D.partById[e.part] || {}).name) + ' ' + e.result + '<br>' + esc(sx.tag) + ' · ' + APP.hm(e.t) + '"><path class="' + (e.result === 'failed' ? 'm-bad' : 'm-warn') + '" d="' + (e.result === 'failed' ? tri(x, y0 + 9, 5.5) : dia(x, y0 + 9, 5.5)) + '" stroke="var(--surface)" stroke-width="1"/></g>');
      });
      s.push('<rect class="lane-hit" data-sid="' + sx.id + '" x="0" y="' + y0 + '" width="' + Wpx + '" height="' + LH + '"/>');
    });
    /* hook rows on the same clock */
    var rowOf = {}; HOOKS.forEach(function (p, i) { rowOf[p.id] = i; });
    D.events.forEach(function (e) {
      var r = rowOf[e.part]; if (r == null || e.t < w[0] || e.t >= w[1]) return; var y = H1 + 12 + r * HR, x = X(e.t);
      if (e.result === 'passed') s.push('<rect class="pc" x="' + x.toFixed(1) + '" y="' + (y + 2) + '" width="' + Math.max(1.5, X(e.t + 5) - x - 0.4).toFixed(1) + '" height="9" style="fill-opacity:' + Math.min(0.7, 0.2 + 0.11 * Math.log2((e.n || 1) + 1)).toFixed(2) + '"/>');
    });
    D.events.forEach(function (e) {
      var r = rowOf[e.part]; if (r == null || e.result === 'passed' || e.t < w[0] || e.t >= w[1]) return; var y = H1 + 12 + r * HR + 6.5, x = X(e.t);
      s.push('<g class="svm" data-part="' + e.part + '" data-tip="' + esc((D.partById[e.part] || {}).name) + ' ' + e.result + '<br>' + esc((D.sessionById[e.session] || {}).tag) + ' · ' + APP.hm(e.t) + '"><path class="' + (e.result === 'failed' ? 'm-bad' : 'm-warn') + '" d="' + (e.result === 'failed' ? tri(x, y, 5) : dia(x, y, 5)) + '"/></g>');
    });
    /* his messages and the times he was away */
    D.owner.away.forEach(function (a) { var l = Math.max(a.left, w[0]), b = Math.min(a.back, w[1]); if (b > l) { var x1 = X(l), x2 = X(b); s.push('<g data-tip="You were away ' + APP.dur(a.minutes) + '<br>' + APP.hm(a.left) + ' to ' + APP.hm(a.back) + '"><line x1="' + x1.toFixed(1) + '" x2="' + x2.toFixed(1) + '" y1="21" y2="21" stroke="var(--wait-fill)" stroke-width="3" opacity=".5"/><rect x="' + x1.toFixed(1) + '" y="16" width="' + Math.max(2, x2 - x1).toFixed(1) + '" height="10" fill="transparent"/></g>'); } });
    D.owner.messages.forEach(function (m) { if (m >= w[0] && m < w[1]) s.push('<circle class="youdot" cx="' + X(m).toFixed(1) + '" cy="21" r="3"/>'); });
    /* folds */
    M.parts.forEach(function (p) {
      if (!p.fold) return;
      s.push('<g class="fold" tabindex="0" role="button" aria-label="Unfold ' + APP.dur(p.b - p.a) + ' with nothing running" data-fold="' + p.a + '" data-tip="Nothing ran ' + APP.hm(p.a) + ' to ' + APP.hm(p.b) + '<br>Click to unfold"><rect class="fb" x="' + p.x.toFixed(1) + '" y="' + AX + '" width="' + p.w + '" height="' + (H2 - AX) + '" fill="var(--surface)"/><rect x="' + p.x.toFixed(1) + '" y="' + AX + '" width="' + p.w + '" height="' + (H2 - AX) + '" fill="url(#hh)" opacity=".8"/>' +
        '<rect x="' + (p.x + 4).toFixed(1) + '" y="' + (AX + 8) + '" width="' + (p.w - 8) + '" height="40" rx="6" fill="var(--surface)" stroke="var(--line-strong)"/><text class="rt" x="' + (p.x + p.w / 2).toFixed(1) + '" y="' + (AX + 26) + '" text-anchor="middle">' + APP.dur(p.b - p.a) + '</text><text class="axt" x="' + (p.x + p.w / 2).toFixed(1) + '" y="' + (AX + 42) + '" text-anchor="middle">quiet</text></g>');
    });
    s.push('</svg>');
    $('#hd-r').innerHTML = s.join('');
    V.map = M; V.w = w;
  }

  function drawAgg(body, d, di) {
    var o = d0(di), w = win(), Wp = Math.max(300, body.clientWidth || 1500), x = function (m) { return (m - w[0]) / (w[1] - w[0]) * Wp; };
    var peak = Math.max.apply(null, d.sessions), hp = Math.max.apply(null, d.helpers), tr = d.trouble.reduce(function (a, b) { return a + b; }, 0);
    $('#hd-sum').innerHTML = '<span class="sumchip"><b>' + peak + '</b> at most at once</span><span class="sumchip"><b>' + hp + '</b> helpers at most</span><span class="sumchip" style="color:var(--bad)">' + I('tri', 'sm fill') + '<b style="color:var(--bad)">' + tr + '</b> trouble</span>';
    var bw = Wp / 288, s = ['<svg class="hist-svg" width="' + Wp + '" height="250" role="img" aria-label="' + esc(d.label) + ': sessions at once, helpers running, trouble and your messages">'];
    for (var h = 0; h <= 24; h += 2) s.push('<line class="gridl" x1="' + (h / 24 * Wp).toFixed(1) + '" x2="' + (h / 24 * Wp).toFixed(1) + '" y1="14" y2="244"/><text class="axt" x="' + (h / 24 * Wp).toFixed(1) + '" y="11" text-anchor="' + (h === 0 ? 'start' : h === 24 ? 'end' : 'middle') + '">' + (h < 10 ? '0' : '') + h + ':00</text>');
    s.push('<text class="rt" x="4" y="32" style="fill:var(--ink-3)">Sessions at once</text><text class="rt" x="4" y="136" style="fill:var(--ink-3)">Helpers running</text>');
    for (var i = 0; i < 288; i++) {
      var v = d.sessions[i], hh = d.helpers[i], t = d.trouble[i];
      if (v > 0) s.push('<rect x="' + (i * bw).toFixed(1) + '" y="' + (100 - v * 16) + '" width="' + (bw + 0.3).toFixed(1) + '" height="' + (v * 16) + '" fill="' + HEAT[Math.min(4, v)] + '"/>');
      if (hh > 0) { var bh = Math.max(2, hh / Math.max(1, hp) * 70); s.push('<rect x="' + (i * bw).toFixed(1) + '" y="' + (190 - bh).toFixed(1) + '" width="' + (bw + 0.3).toFixed(1) + '" height="' + bh.toFixed(1) + '" fill="var(--ink-3)" opacity=".55"/>'); }
      if (t > 0) s.push('<g class="svm" data-tip="' + t + ' trouble marks · ' + APP.hm(o + i * 5) + '"><path class="m-bad" d="' + tri(i * bw + bw / 2, 214, 5) + '"/></g>');
    }
    s.push('<line x1="0" x2="' + Wp + '" y1="100.5" y2="100.5" stroke="var(--line-strong)"/><line x1="0" x2="' + Wp + '" y1="190.5" y2="190.5" stroke="var(--line-strong)"/>');
    D.owner.messages.forEach(function (m) { if (m >= o && m < o + 1440) s.push('<circle class="youdot" cx="' + ((m - o) / 1440 * Wp).toFixed(1) + '" cy="234" r="3.2"/>'); });
    s.push('</svg>');
    body.innerHTML = '<div style="width:100%"><div class="empty-box" style="margin-bottom:10px">Session lanes for this day are not in the replay data</div>' + s.join('') + '</div>';
    V.map = null;
  }

  /* ---------- wiring ---------- */
  function wire() {
    var page = $('#page-history'), timers = {}, drag = null;
    page.addEventListener('click', function (e) {
      var row = e.target.closest('.dayrow');
      if (row && !V.dragged) { var di = +row.dataset.day; if (di !== ST.day) { ST.day = di; ST.w0 = ST.w1 = null; ST.unfold = {}; render(); APP.say(DAYS[di].label + ' selected'); } return; }
      var lab = e.target.closest('[data-sid]'); if (lab && !V.dragged) { APP.openSession(lab.dataset.sid, lab); return; }
      var f = e.target.closest('.fold'); if (f) { ST.unfold[+f.dataset.fold] = !ST.unfold[+f.dataset.fold]; render(); return; }
      var g = e.target.closest('.svm'); if (g) { var hp = $('[data-hpart="' + g.dataset.part + '"]'); APP.inspect(g.dataset.part, hp || g); return; }
      var hb = e.target.closest('[data-hpart]'); if (hb) { var id = hb.dataset.hpart; clearTimeout(timers[id]); if (e.detail > 1) return; timers[id] = setTimeout(function () { APP.inspect(id, hb); }, 230); }
    });
    page.addEventListener('dblclick', function (e) { var hb = e.target.closest('[data-hpart]'); if (!hb) return; clearTimeout(timers[hb.dataset.hpart]); var p = $('.pop'); if (p) p.remove(); APP.openPart(hb.dataset.hpart, hb); });
    page.addEventListener('keydown', function (e) { var f = e.target.closest && e.target.closest('.fold'); if (f && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); ST.unfold[+f.dataset.fold] = !ST.unfold[+f.dataset.fold]; render(); } });
    /* dynamic tooltips: the week cell and the lane bars say what is under the pointer */
    page.addEventListener('pointermove', function (e) {
      var c = e.target.closest('.day-cell'), r;
      if (c) { r = c.getBoundingClientRect(); var di = +c.parentNode.dataset.day, i = Math.max(0, Math.min(287, Math.floor((e.clientX - r.left) / r.width * 288))), d = DAYS[di];
        c.setAttribute('data-tip', '<b>' + D.dayName(d0(di)).split(' ')[0] + ' ' + APP.hm(d0(di) + i * 5) + '</b><br>' + d.sessions[i] + ' sessions · ' + d.helpers[i] + ' helpers' + (d.trouble[i] ? ' · ' + d.trouble[i] + ' trouble' : '')); }
      var lh = e.target.closest && e.target.closest('.lane-hit');
      if (lh && V.map) { r = lh.getBoundingClientRect(); var m = V.map.inv(e.clientX - r.left), s = D.sessionById[lh.dataset.sid], step = ''; (s.steps || []).forEach(function (x) { if (x[0] <= m) step = x[1]; });
        lh.setAttribute('data-tip', '<b>' + esc(s.tag) + '</b> · ' + APP.hm(m) + (step ? '<br>' + esc(step) : '') + '<br>' + APP.tok(s.tokensTotal) + ' tokens in all'); }
      if (drag) { drag.x1 = e.clientX; V.dragged = Math.abs(drag.x1 - drag.x0) > 6; if (V.dragged) previewBrush(); }
    });
    /* drag on the chosen day's strip to pick a window (buttons offer the same) */
    page.addEventListener('pointerdown', function (e) {
      var c = e.target.closest('.day-cell'); if (!c || +c.parentNode.dataset.day !== ST.day || ST.day !== 6 && false) return;
      var r = c.getBoundingClientRect(); drag = { x0: e.clientX, x1: e.clientX, l: r.left, w: r.width, c: c }; V.dragged = false; c.setPointerCapture(e.pointerId);
    });
    page.addEventListener('pointerup', function () {
      if (!drag) return; var d = drag; drag = null;
      if (V.dragged) { var a = Math.min(d.x0, d.x1), b = Math.max(d.x0, d.x1), o = d0(ST.day); setWin(o + (a - d.l) / d.w * 1440, o + (b - d.l) / d.w * 1440); }
      setTimeout(function () { V.dragged = false; }, 0);
    });
  }
  function previewBrush() {
    var d = drag, svg = $('svg', d.c), r = $('.prev', svg) || svg.appendChild(document.createElementNS('http://www.w3.org/2000/svg', 'rect'));
    r.setAttribute('class', 'prev'); r.setAttribute('y', 1); r.setAttribute('height', 36); r.setAttribute('fill', 'var(--wait-fill)'); r.setAttribute('fill-opacity', '.25');
    var a = Math.min(d.x0, d.x1) - d.l, b = Math.max(d.x0, d.x1) - d.l; r.setAttribute('x', a); r.setAttribute('width', Math.max(1, b - a));
  }

  function render() { drawWeek(); drawDay(); drawWeek(); }
})();
