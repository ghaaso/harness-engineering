// Round 9 tool: the approved picture, laid out for one minute and one level of detail.
// Levels: 0 = all sessions (hooks folded to names); 1 = the hooks (who was let through, refused, failed);
//         2 = one session (its hooks, helpers and parts); 3 = that session's files, by folder, with reads, writes and links.
// cfg.history adds the clock down the side, every session of the day, and quiet stretches folded into one band.
// cfg.maxW is the widest the picture may be: past it the tree is drawn as rails (as a commit log graph) and rows wrap.
// It returns keyed nodes (so the page moves a thing instead of redrawing it), the lines, and the points arrows use.
function partIsFile(p) { return !!p && (p.group === 'Documents' || p.group === 'Scripts' || p.group === 'Stores and settings' || p.group === 'Tests and git') && p.file !== '(git)'; }
function partHasFile(p) { return !!p && !!p.file && p.file !== '(git)' && !p.dummy && (partIsFile(p) || p.group === 'Hooks'); }
// stretches of MIN minutes or more in which no session was in a turn and no helper ran
function quietGaps(D, MIN) {
  if (D._quiet) return D._quiet;
  var iv = [], out = [], end = null;
  D.sessions.forEach(function (s) { s.segs.forEach(function (g) { iv.push([g[0], g[1]]); }); s.helpers.forEach(function (h) { iv.push([h.start, h.end]); }); });
  iv.sort(function (a, b) { return a[0] - b[0]; });
  iv.forEach(function (v) { if (end !== null && v[0] - end >= MIN) out.push({ from: end, to: v[0] }); end = end === null ? v[1] : Math.max(end, v[1]); });
  D._quiet = out; D._quietEnd = end; return out;
}
function layoutPicture(D, cfg, measureText) {
  var hm = D.hm, now = cfg.now, LEVEL = cfg.level, HIST = !!cfg.history, MAXW = cfg.maxW || 1e9;
  var DAY0 = Math.floor(now / 1440) * 1440;
  var st = D.stateAt(now), stById = {};
  st.sessions.forEach(function (s) { stById[s.id] = s; });
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function F(size, weight) { return (weight || 400) + ' ' + size + 'px "Segoe UI", system-ui, sans-serif'; }
  function tw(t, size, weight) { return measureText(String(t), F(size, weight)); }
  function fit(t, size, weight, maxW) {
    t = String(t); if (tw(t, size, weight) <= maxW) return t;
    var s = t; while (s.length > 1 && tw(s + '…', size, weight) > maxW) s = s.slice(0, -1);
    return s.replace(/[\s,;:·]+$/, '') + '…';
  }
  function wrap(t, size, weight, maxW, maxLines) {
    var words = String(t).split(/\s+/), lines = [], i = 0;
    while (i < words.length) {
      if (lines.length === maxLines - 1) { lines.push(fit(words.slice(i).join(' '), size, weight, maxW)); break; }
      var cur = words[i++];
      while (i < words.length && tw(cur + ' ' + words[i], size, weight) <= maxW) cur += ' ' + words[i++];
      lines.push(cur);
    }
    return lines;
  }
  function dur(m) { m = Math.max(1, Math.round(m)); if (m < 60) return m + ' min'; var h = Math.floor(m / 60), r = m % 60; return h + ' h' + (r ? ' ' + (r < 10 ? '0' : '') + r + ' min' : ''); }
  function hookName(id) { return (D.partById[id] || { name: id }).name; }
  function uniq(a) { return a.filter(function (v, i) { return a.indexOf(v) === i; }); }
  function r1(v) { return Math.round(v * 10) / 10; }

  var C = { ink: '#18212d', grey: '#566272', faint: '#8691a0', line: '#a9b2be', soft: '#eef0f3', softer: '#f5f6f8',
    work: '#178f60', workBg: '#ecf9f2', wait: '#1463dd', waitBg: '#e6f0ff', fail: '#d42a1c', failBg: '#fdebe8',
    ref: '#c97a00', refBg: '#fff4dc', pass: '#54a889', quiet: '#7a8695' };

  var nodes = [], L = [], O = [], bb = { x0: 1e9, y0: 1e9, x1: -1e9, y1: -1e9 };
  var anchors = { sess: {}, hook: {}, file: {} };
  function ext(x0, y0, x1, y1) { bb.x0 = Math.min(bb.x0, x0); bb.y0 = Math.min(bb.y0, y0); bb.x1 = Math.max(bb.x1, x1); bb.y1 = Math.max(bb.y1, y1); }
  function put(k, kind, x, y, w, h, html, act, back, tip) { nodes.push({ k: k, kind: kind, x: r1(x), y: r1(y), html: html, act: act || '', back: !!back, tip: tip || '' }); ext(x, y, x + w, y + h); }
  function text(x, y, t, size, weight, fill, anchor, extra) { return '<text x="' + r1(x) + '" y="' + r1(y) + '" font-size="' + size + '" font-weight="' + (weight || 400) + '" fill="' + fill + '"' + (anchor ? ' text-anchor="' + anchor + '"' : '') + (extra || '') + '>' + esc(t) + '</text>'; }
  function tri(x, y, s, fill, stroke) { return '<path d="M' + x + ',' + (y - s) + ' L' + (x + s) + ',' + (y + s * 0.8) + ' L' + (x - s) + ',' + (y + s * 0.8) + ' Z" fill="' + fill + '" stroke="' + (stroke || fill) + '" stroke-width="1.6" stroke-linejoin="round"/>'; }
  function dia(x, y, s, fill) { return '<path d="M' + x + ',' + (y - s) + ' L' + (x + s) + ',' + y + ' L' + x + ',' + (y + s) + ' L' + (x - s) + ',' + y + ' Z" fill="' + fill + '"/>'; }
  function check(x, cy, col) { return '<path d="M' + (x + 1) + ',' + cy + ' l3.6,4 l6.4,-8.4" fill="none" stroke="' + col + '" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/>'; }
  function vline(d, arrow, col, sw, extra) { L.push('<path d="' + d + '" fill="none" stroke="' + (col || C.line) + '" stroke-width="' + (sw || 2) + '"' + (arrow ? ' marker-end="url(#' + arrow + ')"' : '') + (extra || '') + '/>'); }
  var HALO = ' stroke="#fff" stroke-width="5" paint-order="stroke" stroke-linejoin="round"';

  // ---------- the sessions of the day ----------
  var EMPTY = { helpersRunning: [], marks: [], step: '', wait: null };
  var all = D.sessions.filter(function (s) { return s.start <= now && (s.end === null || s.end >= DAY0); }).map(function (s) {
    var x = stById[s.id], state = x ? x.state : 'ended';
    return { s: s, id: s.id, tag: s.tag, name: s.name, start: s.start, state: state, open: state !== 'ended', x: x || EMPTY, kids: [], parent: null };
  });
  var byId = {}; all.forEach(function (n) { byId[n.id] = n; });
  all.forEach(function (n) { var p = n.s.parent && byId[n.s.parent]; if (p) { n.parent = p; p.kids.push(n); } });
  all.sort(function (a, b) { return a.start - b.start; });
  all.forEach(function (n) {
    n.kids.sort(function (a, b) { return a.start - b.start; });
    n.unseenFailNames = uniq((n.x.marks || []).filter(function (m) { return m.result === 'failed'; }).map(function (m) { return hookName(m.part); }));
    n.failIds = uniq((n.x.marks || []).filter(function (m) { return m.result === 'failed'; }).map(function (m) { return m.part; }));
    n.pastIds = HIST && cfg.failedEarlier ? cfg.failedEarlier(n.id) : [];
    n.pastFail = uniq(n.pastIds.map(hookName)).filter(function (x) { return n.unseenFailNames.indexOf(x) < 0; });
  });
  function hasOpen(n) { return n.open || n.kids.some(hasOpen); }
  // several sessions opened together (cfg.group, two tags or more): the one-session view grown to that range
  var foc = null, GRP = null, boxes = [], keep = [];   // keep: the hooks' heading and captions, which a result label must not cover
  if (LEVEL === 2 && cfg.group && cfg.group.length > 1) { GRP = all.filter(function (n) { return cfg.group.indexOf(n.tag) >= 0; }); if (GRP.length < 2) GRP = null; }
  if (LEVEL >= 2 && !GRP) { foc = all.filter(function (n) { return n.tag === cfg.open; })[0]; if (!foc) return { missing: true }; }

  var CW = 232, WW = 300, PILL_H = 26;
  function sizeCard(n) {
    var waiting = n.state === 'waiting'; n.card = true; n.w = waiting ? WW : CW;
    n.titleLines = wrap(n.name, 15.5, 600, n.w - 24, 2);
    var h = 37 + n.titleLines.length * 19;
    if (waiting) { n.reportLines = wrap('“' + n.x.wait.report + '”', 13.5, 400, n.w - 24, 4); h += 3 + n.reportLines.length * 17; }
    else { n.stepLine = n.open && n.x.step ? fit(n.x.step, 13.5, 400, n.w - 24) : ''; if (n.stepLine || n.open) h += 19; }
    n.hr = n.x.helpersRunning.length; n.hd = n.x.helpersDone || 0; if (n.hr || n.open) h += 19;
    h += 9; if (n.unseenFailNames.length) h += 9; n.h = h;
  }
  function sizePill(n) {
    n.card = false; n.h = PILL_H; n.titleFit = fit(n.name, 13, 400, 122); n.mark = (n.unseenFailNames.length || n.pastFail.length) ? 17 : (n.open ? 15 : 0);
    n.pillW = 10 + n.mark + tw(n.tag, 13, 700) + 7 + tw(n.titleFit, 13, 400) + 11;
    n.badgeW = n.unseenFailNames.length ? 7 + tw(n.unseenFailNames.join(', ') + ' failed', 13, 600) : 0;
    n.w = n.pillW + n.badgeW;
  }

  var shown, treeBottom = 0, xYou = 0, yYou = -78, yBus = -34, RAILS = false, treeL = 0, treeR = 0, bands = [], busX = 0, boxX = 0, marginX = 0, BAND_H = 28, maxCol = -1;
  if (!foc) {
    // the tree: start order runs downward; a session keeps its own line, the child that takes over continues it
    // several opened together: only they (as cards) and the sessions above them, so the lines say who started whom
    var inS = {};
    if (GRP) { GRP.forEach(function (n) { n.pick = true; for (var q = n; q; q = q.parent) inS[q.id] = 1; }); shown = all.filter(function (n) { return inS[n.id]; }); }
    else shown = HIST ? all.slice() : all.filter(hasOpen);
    shown.forEach(function (n) {
      if (GRP) n.kids = n.kids.filter(function (k) { return inS[k.id]; }); else if (!HIST) n.kids = n.kids.filter(hasOpen);
      if (GRP ? n.pick : n.open) sizeCard(n); else sizePill(n);
      n.deep = n.open && n.card;
      n.heir = (!n.deep && n.kids.length) ? n.kids[n.kids.length - 1] : null;
    });
    var gaps = [];
    if (HIST && !GRP && shown.length) {
      quietGaps(D, 30).forEach(function (g) { if (g.to > shown[0].start && g.from < now) { var to = Math.min(g.to, now); if (to - g.from >= 30) gaps.push({ from: g.from, to: to, open: g.to > now }); } });
      if (D._quietEnd !== null && D._quietEnd < now - 30) gaps.push({ from: D._quietEnd, to: now, open: true });
    }
    var layRows = function (rails) {
      var ROW = 29, CARD_GAP = 26, rowY = 0, rowT = -1e9, rowIds = {}, first = true, bottom = 0, tb = 0, minY = 0, gi = 0, prevCard = false;
      bands = [];
      shown.forEach(function (n) {
        while (gi < gaps.length && gaps[gi].to <= n.start + 0.05) { if (!first) { bands.push({ g: gaps[gi], y: bottom + 12 }); minY = bottom + 12 + BAND_H + 14; } gi++; }
        var same = !rails && !first && minY <= rowY && (n.start - rowT) <= 3 && !(n.parent && rowIds[n.parent.id]);
        var y = first ? 0 : same ? rowY : rails ? bottom + ((n.card || prevCard) ? 12 : 5) : rowY + ROW;
        if (!rails && n.parent) {
          var p = n.parent; y = Math.max(y, p.y + p.h + (p.card ? CARD_GAP : (p.heir === n ? 5 : 12)));
          for (var i = 0; i < p.kids.length; i++) { var sib = p.kids[i]; if (sib === n) break; if (sib.card && y !== sib.y && y < sib.y + sib.h + CARD_GAP) y = sib.y + sib.h + CARD_GAP; }
        }
        y = Math.max(y, minY);
        if (!same || y !== rowY) { rowY = y; rowT = n.start; rowIds = {}; }
        rowIds[n.id] = 1; n.y = y; tb = Math.max(tb, y + n.h); bottom = Math.max(bottom, y + n.h + (n.card && n.unseenFailNames.length ? 14 : 0)); first = false; prevCard = n.card;
      });
      while (gi < gaps.length) { bands.push({ g: gaps[gi], y: bottom + 12 }); bottom += 12 + BAND_H; tb = bottom; gi++; }
      treeBottom = tb;
    };
    var layCols = function () {
      var occ = []; maxCol = -1;
      function isFree(c, a, b) { return !(occ[c] || []).some(function (p) { return a < p[1] && b > p[0]; }); }
      function take(c, a, b) { (occ[c] = occ[c] || []).push([a, b]); }
      function place(n, col) {
        n.col = col; maxCol = Math.max(maxCol, col); take(col, n.y - 8, n.deep ? 1e9 : n.y + n.h + 8);
        if (n.heir) { take(col, n.y, n.heir.y); place(n.heir, col); }
        n.kids.forEach(function (k) { if (k === n.heir) return; var c = col + 1; while (!isFree(c, k.y - 22, k.deep ? 1e9 : k.y + k.h + 8)) c++; place(k, c); });
      }
      shown.filter(function (n) { return !n.parent; }).forEach(function (r) { place(r, maxCol + 1); });
    };
    layRows(false); layCols();
    var cols = []; for (var ci = 0; ci <= maxCol; ci++) cols.push({ L: 40, R: 40 });
    shown.forEach(function (n) { var c = cols[n.col]; c.L = Math.max(c.L, n.card ? n.w / 2 : n.pillW / 2); c.R = Math.max(c.R, n.card ? n.w / 2 : n.w - n.pillW / 2); });
    var CG = 26, xx = 0; cols.forEach(function (c) { c.x = xx + c.L; xx += c.L + c.R + CG; });
    var treeW = Math.max(0, xx - CG);
    if (treeW + (HIST ? 170 : 0) > MAXW) RAILS = true;
    if (!RAILS) {
      shown.forEach(function (n) { n.cx = cols[n.col].x - treeW / 2; });
      treeL = -treeW / 2; treeR = treeW / 2;
      var rootXs = shown.filter(function (n) { return !n.parent; }).map(function (n) { return n.cx; });
      xYou = rootXs.length ? (Math.min.apply(null, rootXs) + Math.max.apply(null, rootXs)) / 2 : 0;
    } else {
      // rails: one row per session, its line at the left as in a commit log graph, its box to the right of all lines
      layRows(true); layCols();
      var RP = 20, mw = 0, railsW = (maxCol + 1) * RP + 12;
      shown.forEach(function (n) { mw = Math.max(mw, n.w); });
      treeL = -Math.round((railsW + mw + 36) / 2) + (HIST ? 82 : 0); boxX = treeL + railsW;
      shown.forEach(function (n) { n.rx = treeL + n.col * RP + 8; n.dy = n.card ? 20 : 13; n.cx = boxX + (n.card ? n.w / 2 : n.pillW / 2); });
      treeR = boxX + mw; busX = treeR + 16; xYou = boxX + 100;
    }
    if (HIST && shown.length) {
      // the clock down the side: a row's start time (a click plays back from there), your absences, the folded stretches
      marginX = treeL - 14;
      var lastLy = -1e9;
      shown.forEach(function (n) {
        var ly = n.y + (n.card ? 25.5 : 17.8); if (ly - lastLy < 15) return; lastLy = ly;
        var lab = (n.start < DAY0 ? D.dayName(n.start).slice(0, 3) + ' ' : '') + hm(n.start), w = tw(lab, 13, 400) + 8;
        put('tm:' + n.id, 'time', marginX - w, ly - 15, w, 20, '<rect class="hit" x="-4" y="0" width="' + r1(w + 8) + '" height="20" rx="5" fill="#fff" stroke="#fff"/>' + text(w, 15, lab, 13, 400, C.grey, 'end'), 't:' + n.start, false, 'Play back from ' + lab);
      });
      if (!GRP) {
      var pts = [], mxRun = -1e9;
      shown.forEach(function (n) { pts.push([n.start, n.y + (n.card ? 20 : 13)]); });
      bands.forEach(function (b) { pts.push([b.g.from, b.y]); pts.push([b.g.to, b.y + BAND_H]); });
      pts.push([now, treeBottom + 14]);
      pts.sort(function (a, b) { return a[0] - b[0]; });
      pts.forEach(function (p) { mxRun = Math.max(mxRun, p[1]); p[1] = mxRun; });
      var tY = function (t) { if (t <= pts[0][0]) return pts[0][1]; for (var i = 1; i < pts.length; i++) if (t <= pts[i][0]) { var a = pts[i - 1], b = pts[i]; return a[1] + (b[1] - a[1]) * (t - a[0]) / Math.max(0.01, b[0] - a[0]); } return pts[pts.length - 1][1]; };
      var awB = -1e9, ax = marginX - 76;
      ((D.owner && D.owner.away) || []).forEach(function (a) {
        if (a.back <= shown[0].start || a.left >= now) return;
        var y0 = Math.max(tY(Math.max(a.left, shown[0].start)), awB + 8), y1 = Math.max(y0 + 30, tY(Math.min(a.back, now))), hh = y1 - y0; awB = y1;
        put('aw:' + a.left, 'away', ax - 70, y0, 76, hh, '<rect x="70" y="0" width="4" height="' + r1(hh) + '" rx="2" fill="#9db7f2"/>' + text(62, r1(hh / 2 - 2), 'you away', 12.5, 400, '#3b6fd4', 'end') + text(62, r1(hh / 2 + 12), dur(Math.min(a.back, now) - a.left), 12.5, 400, '#3b6fd4', 'end'), '', false, 'You wrote nothing from ' + hm(a.left) + ' to ' + hm(a.back));
      });
      var nl = 'now ' + hm(Math.floor(now + 1e-6)), nlw = tw(nl, 13, 700) + 8;
      put('tm:now', 'time', marginX - nlw, treeBottom + 6, nlw, 20, text(nlw, 15, nl, 13, 700, C.ink, 'end'));
      treeBottom += 28;
      var bx0 = marginX - 150;
      bands.forEach(function (b) {
        var g = b.g, t1 = g.open ? 'since ' + hm(g.from) : hm(g.from) + ' to ' + hm(g.to), t2 = 'nothing ran for ' + dur(g.to - g.from);
        var waited = D.sessions.filter(function (s) { return s.waits.some(function (w) { return w[0] <= g.from + 10 && w[1] >= g.to - 10; }); }).map(function (s) { return s.tag; });
        var w1 = tw(t1, 13, 600), w2 = tw(t2, 13, 400), wt = waited.length ? waited.join(', ') + ' waited for you' : '', ww = wt ? tw(wt, 12.5, 600) + 34 : 0;
        var lw = 12 + w1 + 10 + w2 + 12, tot = lw + (ww ? ww + 8 : 0);
        var tx = RAILS ? treeL : Math.max(treeL, -tot / 2), bw = Math.max((RAILS ? busX : treeR) - bx0, tx + tot + 8 - bx0);
        put('band:' + g.from, 'band', bx0, b.y, bw, BAND_H, '<rect class="hit" x="0" y="0" width="' + r1(bw) + '" height="' + BAND_H + '" rx="5" fill="url(#hatch)" stroke="#e1e4e9"/>', 't:' + g.to, true, 'Go to ' + hm(g.to));
        var o = '<rect x="0" y="3" width="' + r1(lw) + '" height="' + (BAND_H - 6) + '" rx="4" fill="#fff"/>' + text(12, 18.5, t1, 13, 600, C.ink) + text(12 + w1 + 10, 18.5, t2, 13, 400, C.grey);
        if (ww) { var px = lw + 8; o += '<rect x="' + r1(px) + '" y="4" width="' + r1(ww) + '" height="20" rx="10" fill="' + C.waitBg + '" stroke="' + C.wait + '" stroke-width="1.3"/><rect x="' + r1(px + 9) + '" y="9" width="3" height="10" fill="' + C.wait + '"/><rect x="' + r1(px + 14.5) + '" y="9" width="3" height="10" fill="' + C.wait + '"/>' + text(px + 24, 18.2, wt, 12.5, 600, C.wait); }
        put('bandt:' + g.from, 'bandt', tx, b.y, tot, BAND_H, o, 't:' + g.to, false, 'Go to ' + hm(g.to));
      });
      }
    }
  } else {
    // one session: who started it above (as a chain), the session itself, what it started beside it
    var anc = [], q0 = foc.parent; while (q0) { anc.unshift(q0); q0 = q0.parent; }
    var fy = 0;
    anc.forEach(function (n) { sizePill(n); n.cx = 0; n.y = fy; fy += PILL_H + 22; });
    sizeCard(foc); foc.cx = 0; foc.y = fy;
    var ky = foc.y + 8;
    foc.kids.forEach(function (k) { sizePill(k); k.side = true; k.cx = foc.w / 2 + 58 + k.pillW / 2; k.y = ky; ky += PILL_H + 9; });
    shown = anc.concat([foc], foc.kids);
    treeBottom = Math.max(foc.y + foc.h, foc.kids.length ? ky - 9 : 0);
    foc.anc = anc;
  }

  // ---------- hooks ----------
  var HOOKS_ON = LEVEL <= 2, COMPACT = LEVEL === 0;
  var GROUPS = [
    { cap: 'when a session starts', hooks: ['hook:library-start'] },
    { cap: 'the session’s window', hooks: ['hook:window-ceiling'] },
    { cap: 'when a helper starts', hooks: ['hook:tier-hook', 'hook:plan-gate', 'hook:count-gate', 'hook:fanout-gate', 'hook:creep-gate'] },
    { cap: 'writes to the record', hooks: ['hook:record-guard', 'hook:journal-watch'] },
    { cap: 'what reaches you', hooks: ['hook:owner-report'] }];
  var GIN = 12, GOUT = COMPACT ? 22 : 30, gates = {}, gateList = [], wallW = 0, rank = { passed: 1, refused: 2, failed: 3 };
  var ROWS = [['failed', 'failed'], ['refused', 'refused'], ['passed', 'let through'], ['earlier', 'failed earlier']];
  var yA = treeBottom + 8, yWall = treeBottom + 92, GH = 36, wallBottom = yWall, wsegs = [], nWallRows = 1, WP = 0;
  function tagW(t) { return tw(t, 12.5, 700) + 12; }
  if (HOOKS_ON) {
    GROUPS.forEach(function (g) { g.hooks.forEach(function (h) { gates[h] = { id: h, name: hookName(h), group: g, rows: { failed: [], refused: [], passed: [], earlier: [] }, inc: [] }; gateList.push(gates[h]); }); });
    st.sessions.forEach(function (x) {
      if (foc ? x.id !== foc.id : GRP && !(byId[x.id] && byId[x.id].pick)) return;
      var m = {}; cfg.hookPass(x.id).forEach(function (h) { m[h] = 'passed'; });
      x.marks.forEach(function (k) { if (!m[k.part] || rank[k.result] > rank[m[k.part]]) m[k.part] = k.result; });
      Object.keys(m).forEach(function (h) { if (gates[h] && rank[m[h]]) gates[h].rows[m[h]].push(x.tag); });
      if (byId[x.id]) byId[x.id].hookRes = m;
    });
    if (HIST) all.forEach(function (n) { if (foc ? n !== foc : GRP && !n.pick) return; uniq(n.pastIds).forEach(function (h) { if (gates[h] && gates[h].rows.failed.indexOf(n.tag) < 0) gates[h].rows.earlier.push(n.tag); }); });
    var maxRows = 1, mem = cfg.mem || {};
    function keepW(g) { var k = (COMPACT ? 'c' : 'w') + g.id; g.w = mem[k] = Math.max(mem[k] || 0, g.w); }
    gateList.forEach(function (g) {
      g.fired = cfg.fired(g.id);
      g.worst = g.rows.failed.length ? 'failed' : g.rows.refused.length ? 'refused' : g.rows.passed.length ? 'passed' : '';
      if (COMPACT) { g.w = tw(g.name, 14.5, 600) + 28 + (g.worst === 'failed' || g.worst === 'refused' ? 19 : 0); keepW(g); return; }
      var w = tw(g.name, 15.5, 600) + 30, nr = 0;
      ROWS.forEach(function (r) { var tags = g.rows[r[0]]; if (!tags.length) return; nr++; var rw = 12 + 18 + tw(r[1], 13, 600) + 8; tags.forEach(function (t) { rw += tagW(t) + 5; }); w = Math.max(w, rw + 7); });
      if (!g.fired) w = Math.max(w, tw('not fired today', 13, 400) + 26);
      g.w = Math.max(w, 112); keepW(g); maxRows = Math.max(maxRows, nr);
    });
    if (!COMPACT) { maxRows = mem.rows = Math.max(mem.rows || 1, maxRows); GH = 31 + maxRows * 25 + 6; }
    // the hooks in order, left to right; a new row when the picture may not be wider
    var WALLMAX = MAXW - 32, wxp = 0, wrow = 0, lastGap = 0, rowsW = [];
    GROUPS.forEach(function (g) {
      var seg = null;
      g.hooks.forEach(function (h, i) {
        var gt = gates[h];
        if (wxp > 0 && wxp + gt.w > WALLMAX) { rowsW[wrow] = wxp - lastGap; wrow++; wxp = 0; seg = null; }
        if (!seg) { seg = { g: g, row: wrow, x0: wxp }; wsegs.push(seg); }
        gt.x = wxp; gt.row = wrow; wxp += gt.w; seg.x1 = wxp; lastGap = i < g.hooks.length - 1 ? GIN : GOUT; wxp += lastGap;
      });
    });
    rowsW[wrow] = wxp - lastGap; nWallRows = wrow + 1; wallW = Math.max.apply(null, rowsW);
    // the pitch of the rows when the hooks wrap: a result label (26 high, 14 above its hook) fits between a row's caption and the next row
    WP = GH + (COMPACT ? 46 : 72);
    gateList.forEach(function (g) { g.x -= rowsW[g.row] / 2; g.y = yWall + g.row * WP; });
    wsegs.forEach(function (s) { s.x0 -= rowsW[s.row] / 2; s.x1 -= rowsW[s.row] / 2; });
    wallBottom = yWall + (nWallRows - 1) * WP + GH + (COMPACT ? 12 : 30);
    shown.forEach(function (n) {
      n.hookLines = [];
      if (!n.card || !n.open || !n.hookRes) return;
      Object.keys(n.hookRes).forEach(function (h) {
        var res = n.hookRes[h]; if (!gates[h] || !rank[res]) return;
        // several opened together: two get every line; three or more only refusals and failures (the tags on a hook say the rest)
        if (res === 'failed' ? LEVEL >= 1 : (LEVEL >= 2 && (n === foc || (GRP && n.pick && (GRP.length === 2 || res === 'refused'))))) { var l = { n: n, gate: gates[h], result: res }; n.hookLines.push(l); gates[h].inc.push(l); }
      });
    });
    gateList.forEach(function (g) { anchors.hook[g.id] = { x: r1(g.x + g.w / 2), y: g.y, x0: r1(g.x), w: r1(g.w), h: GH }; });
  }
  shown.forEach(function (n) {
    if (!n.card) return;
    if (RAILS) { var my = n.y + Math.min(n.h / 2, 26); anchors.sess[n.id] = { x: busX, y: my, ya: yA, pre: [[boxX + n.w, my], [busX, my]], tag: n.tag }; }
    else anchors.sess[n.id] = { x: r1(n.cx), y: n.y + n.h, ya: yA, tag: n.tag };
  });

  // ---------- you, and the lines of the tree ----------
  if (!foc && RAILS) {
    var rroots = shown.filter(function (n) { return !n.parent; });
    if (rroots.length) {
      var rxs = rroots.map(function (n) { return n.rx; });
      vline('M' + xYou + ',' + (yYou + 24) + ' V' + yBus + ' M' + Math.min(xYou, Math.min.apply(null, rxs)) + ',' + yBus + ' H' + xYou);
      rroots.forEach(function (n) { vline('M' + n.rx + ',' + yBus + ' V' + (n.y + n.dy - 8), 'ar'); });
    }
    shown.forEach(function (p) {
      var py = p.y + p.dy;
      p.kids.forEach(function (k) {
        var ky2 = k.y + k.dy;
        if (k.col === p.col) vline('M' + p.rx + ',' + (py + 6) + ' V' + (ky2 - 8), 'ar');
        else vline('M' + p.rx + ',' + (py + 6) + ' V' + (ky2 - 22) + ' C' + p.rx + ',' + (ky2 - 9) + ' ' + k.rx + ',' + (ky2 - 24) + ' ' + k.rx + ',' + (ky2 - 8), 'ar');
      });
      L.push('<path d="M' + (p.rx + 7) + ',' + py + ' H' + (boxX - 3) + '" fill="none" stroke="#cfd4db" stroke-width="1.2" stroke-dasharray="2 3"/>');
    });
  } else if (!foc) {
    var roots = shown.filter(function (n) { return !n.parent; });
    if (roots.length) {
      var rxs2 = roots.map(function (n) { return n.cx; }), ux0 = Math.min(xYou, Math.min.apply(null, rxs2)), ux1 = Math.max(xYou, Math.max.apply(null, rxs2));
      vline('M' + xYou + ',' + (yYou + 24) + ' V' + yBus + ' M' + ux0 + ',' + yBus + ' H' + ux1);
      roots.forEach(function (n) { vline('M' + n.cx + ',' + yBus + ' V' + (n.y - 2), 'ar'); });
    }
    shown.forEach(function (p) {
      var endY = p.y + p.h;
      if (p.heir) endY = Math.max(endY, p.heir.y);
      p.kids.forEach(function (k) { if (k !== p.heir) endY = Math.max(endY, k.y - 10); });
      if (p.hookLines && p.hookLines.length) endY = Math.max(endY, yA);
      var toHeir = p.heir && endY === p.heir.y;
      if (endY > p.y + p.h) vline('M' + p.cx + ',' + (p.y + p.h) + ' V' + (endY - (toHeir ? 2 : 0)), toHeir ? 'ar' : '');
      p.kids.forEach(function (k) {
        if (k === p.heir) return; var ry = k.y - 10, dir = k.cx > p.cx ? 1 : -1;
        vline('M' + p.cx + ',' + ry + ' H' + (k.cx - 7 * dir) + ' Q' + k.cx + ',' + ry + ' ' + k.cx + ',' + (ry + 5) + ' V' + (k.y - 2), 'ar');
      });
    });
  } else {
    var prevB = yYou + 24;
    foc.anc.concat([foc]).forEach(function (n) { vline('M0,' + prevB + ' V' + (n.y - 2), 'ar'); prevB = n.y + n.h; });
    foc.kids.forEach(function (k) { var yy = k.y + PILL_H / 2, x0 = foc.w / 2, x1 = k.cx - k.pillW / 2 - 2, by = Math.min(yy, foc.y + foc.h - 14);
      vline('M' + x0 + ',' + by + ' H' + (x0 + 26) + (by !== yy ? ' V' + yy : '') + ' H' + x1, 'ar'); });
    if (HOOKS_ON || LEVEL === 3) vline('M0,' + (foc.y + foc.h) + ' V' + yA);
  }
  put('you', 'you', xYou - 80, yYou - 26, 110, 52,
    '<circle cx="80" cy="26" r="24" fill="' + C.ink + '"/><circle cx="80" cy="19" r="7.2" fill="#fff"/><path d="M67.5,40 a12.5,11.5 0 0 1 25,0 z" fill="#fff"/>' + text(45, 32.5, 'You', 19, 700, C.ink, 'end'));

  // lines to the hooks that stay drawn: a failure not yet seen, and everything of the opened session
  if (HOOKS_ON && LEVEL >= 1) {
    var order = { passed: 0, refused: 1, failed: 2 }, hl = [];
    shown.forEach(function (n) { (n.hookLines || []).forEach(function (l) { hl.push(l); }); });
    hl.sort(function (a, b) { return order[a.result] - order[b.result]; });
    hl.forEach(function (l) {
      var g = l.gate, gx = r1(g.x + g.w / 2), x0 = RAILS ? busX : l.n.cx, gy = g.y, my = (yA + gy) / 2, sa = anchors.sess[l.n.id];
      var col = l.result === 'failed' ? C.fail : l.result === 'refused' ? C.ref : C.pass, sw = l.result === 'failed' ? 3.2 : l.result === 'refused' ? 2.4 : 1.8;
      L.push('<path d="' + (RAILS && sa ? 'M' + sa.pre[0][0] + ',' + sa.y + ' H' + busX + ' V' + yA : 'M' + x0 + ',' + yA) + ' C' + x0 + ',' + (my + 22) + ' ' + gx + ',' + (my - 22) + ' ' + gx + ',' + (gy - 3) + '" fill="none" stroke="' + col + '" stroke-width="' + sw + '"/>');
      if (l.result === 'failed') L.push(tri(gx, gy - 7, 6, C.fail)); else if (l.result === 'refused') L.push(dia(gx, gy - 7, 6, C.ref)); else L.push('<circle cx="' + gx + '" cy="' + (gy - 5) + '" r="3.8" fill="' + C.pass + '"/>');
    });
  }

  // the waiting line back to you
  var wtags = [];
  shown.forEach(function (n) {
    if (!n.card || n.state !== 'waiting') return;
    if (RAILS) {
      var wy = n.y + 14, wbx = busX + 14;
      L.push('<path d="M' + (boxX + n.w + 2) + ',' + wy + ' H' + (wbx - 12) + ' Q' + wbx + ',' + wy + ' ' + wbx + ',' + (wy - 12) + ' V' + (yYou + 14) + ' Q' + wbx + ',' + yYou + ' ' + (wbx - 14) + ',' + yYou + ' H' + (xYou + 30) + '" fill="none" stroke="' + C.wait + '" stroke-width="2.6" stroke-dasharray="7 5" marker-end="url(#arw)"/>');
      wtags.push(n.tag);
      ext(xYou, yYou - 26, wbx + 6, n.y);
      return;
    }
    var wx = n.cx + n.w / 2 - 44;
    L.push('<path d="M' + wx + ',' + (n.y - 2) + ' V' + (yYou + 14) + ' Q' + wx + ',' + yYou + ' ' + (wx - 14) + ',' + yYou + ' H' + (xYou + 30) + '" fill="none" stroke="' + C.wait + '" stroke-width="2.6" stroke-dasharray="7 5" marker-end="url(#arw)"/>');
    wtags.push(n.tag);
    ext(xYou, yYou - 26, wx + 6, n.y);
  });
  if (wtags.length) { var wlab = (wtags.length > 3 ? wtags.slice(0, 3).join(', ') + ' and ' + (wtags.length - 3) + ' more' : wtags.join(', ')) + (wtags.length > 1 ? ' wait for your answer' : ' waits for your answer'); L.push(text(xYou + 46, yYou - 9, wlab, 14, 600, C.wait)); ext(xYou, yYou - 26, xYou + 46 + tw(wlab, 14, 600), yYou); }

  // ---------- session nodes ----------
  function cardHtml(n) {
    var o = '', waiting = n.state === 'waiting', working = n.state === 'working', fails = n.unseenFailNames;
    var stroke = waiting ? C.wait : working ? C.work : '#b5bdc8', fill = waiting ? C.waitBg : working ? C.workBg : '#fafbfc', sw = waiting ? 3 : working ? 2.2 : 1.5;
    o += '<rect class="hit" x="0" y="0" width="' + n.w + '" height="' + n.h + '" rx="11" fill="' + fill + '" stroke="' + stroke + '" stroke-width="' + sw + '"/>';
    var tgW = tw(n.tag, 13.5, 700) + 16, chipFill = waiting ? C.wait : working ? C.work : C.quiet;
    o += '<rect x="10" y="9" width="' + r1(tgW) + '" height="23" rx="6" fill="' + chipFill + '"/>' + text(10 + tgW / 2, 25.5, n.tag, 13.5, 700, '#fff', 'middle');
    var stx = n.w - 12;
    if (waiting) { var wl = 'waits for you · ' + dur(now - n.x.wait.from); o += text(stx, 25.5, wl, 14, 700, C.wait, 'end'); var px = r1(stx - tw(wl, 14, 700) - 15); o += '<rect x="' + px + '" y="14" width="3.6" height="12" fill="' + C.wait + '"/><rect x="' + (px + 6.4) + '" y="14" width="3.6" height="12" fill="' + C.wait + '"/>'; }
    else if (working) { o += text(stx, 25.5, 'working', 13.5, 600, C.work, 'end'); o += '<circle cx="' + r1(stx - tw('working', 13.5, 600) - 10) + '" cy="21" r="4.5" fill="' + C.work + '"/>'; }
    else if (!n.open) o += text(stx, 25.5, (n.x.stopped ? 'stopped ' : 'ended ') + hm(n.x.since || n.s.end || now), 13.5, 400, C.grey, 'end');
    else { var last = n.s.start; n.s.segs.forEach(function (g) { if (g[1] <= now) last = Math.max(last, g[1]); }); n.s.helpers.forEach(function (h) { if (h.end <= now) last = Math.max(last, h.end); }); o += text(stx, 25.5, 'quiet ' + dur(now - last), 13.5, 400, C.grey, 'end'); }
    var ty = 52;
    n.titleLines.forEach(function (l) { o += text(12, ty, l, 15.5, 600, working || waiting ? C.ink : C.grey); ty += 19; });
    if (waiting) { ty += 1; n.reportLines.forEach(function (l) { o += text(12, ty, l, 13.5, 400, C.ink); ty += 17; }); }
    else if (n.stepLine || n.open) { if (n.stepLine) o += text(12, ty - 1, n.stepLine, 13.5, 400, C.grey); ty += 19; }
    if (n.hr) { for (var i = 0; i < n.hr; i++) o += '<circle cx="' + (17 + i * 13) + '" cy="' + (ty - 5) + '" r="4.6" fill="' + C.work + '"/>'; o += text(17 + n.hr * 13 + 1, ty - 0.5, n.hr + (n.hr === 1 ? ' helper' : ' helpers'), 13, 400, C.grey); }
    else if (n.open && n.hd) o += text(12, ty - 0.5, n.hd + (n.hd === 1 ? ' helper finished' : ' helpers finished'), 13, 400, C.faint);
    if (fails.length) { var ft = fails.join(', ') + ' failed', fw = r1(tw(ft, 13, 700) + 34), fy0 = n.h - 12;
      o += '<g class="ev" data-ev="failed|' + n.tag + '|' + n.failIds.join(',') + '"><title>Open what failed</title><rect x="12" y="' + fy0 + '" width="' + fw + '" height="24" rx="12" fill="' + C.fail + '" stroke="' + C.fail + '" stroke-width="1.6"/>' + tri(27, fy0 + 12, 5.5, '#fff') + text(38, fy0 + 16.6, ft, 13, 700, '#fff') + '</g>'; }
    return o;
  }
  function pillHtml(n) {
    var o = '', fails = n.unseenFailNames, past = n.pastFail.length > 0, working = n.state === 'working', waiting = n.state === 'waiting';
    var stroke = fails.length || past ? C.fail : working ? C.work : waiting ? C.wait : n.open ? '#b5bdc8' : '#d9dde3';
    o += '<rect class="hit" x="0" y="0" width="' + r1(n.pillW) + '" height="' + n.h + '" rx="13" fill="' + (working ? C.workBg : waiting ? C.waitBg : C.soft) + '" stroke="' + stroke + '" stroke-width="' + (fails.length || past || working || waiting ? 1.6 : 1) + '"/>';
    if (fails.length) o += tri(16, 13, 5.5, C.fail);
    else if (past) o += tri(16, 13, 5.2, '#fff', C.fail);
    else if (working) o += '<circle cx="15.5" cy="13" r="4.5" fill="' + C.work + '"/>';
    else if (waiting) o += '<rect x="11" y="7.5" width="3.4" height="11" fill="' + C.wait + '"/><rect x="17" y="7.5" width="3.4" height="11" fill="' + C.wait + '"/>';
    else if (n.open) o += '<circle cx="15.5" cy="13" r="4" fill="none" stroke="' + C.quiet + '" stroke-width="1.6"/>';
    var tc = n.open ? C.ink : C.grey;
    o += text(10 + n.mark, 17.8, n.tag, 13, 700, tc) + text(10 + n.mark + tw(n.tag, 13, 700) + 7, 17.8, n.titleFit, 13, 400, C.grey);
    if (fails.length) o += '<g class="ev" data-ev="failed|' + n.tag + '|' + n.failIds.join(',') + '"><title>Open what failed</title><rect x="' + r1(n.pillW + 3) + '" y="2" width="' + r1(n.badgeW) + '" height="22" rx="5" fill="#fff" fill-opacity="0" stroke="none"/>' + text(n.pillW + 7, 17.8, fails.join(', ') + ' failed', 13, 600, C.fail) + '</g>';
    return o;
  }
  shown.forEach(function (n) {
    var x = n.cx - (n.card ? n.w / 2 : n.pillW / 2), html = n.card ? cardHtml(n) : pillHtml(n);
    if (RAILS) {
      var dc = n.unseenFailNames.length ? C.fail : n.state === 'working' ? C.work : n.state === 'waiting' ? C.wait : n.open ? '#fff' : '#aab2bd';
      html += '<circle cx="' + r1(n.rx - x) + '" cy="' + n.dy + '" r="5.2" fill="' + dc + '" stroke="' + (dc === '#fff' ? C.quiet : '#fff') + '" stroke-width="1.6"/>';
      ext(n.rx - 7, n.y, n.rx + 7, n.y + n.h);
    }
    put('s:' + n.id, n.card ? 'card' : 'pill', x, n.y, n.w, n.h + (n.card && n.unseenFailNames.length ? 14 : 0), html, 's:' + n.tag,
      false, n.tag + ' · ' + n.name + (n.pastFail.length ? ' · ' + n.pastFail.join(', ') + ' failed earlier' : ''));
    n.x0 = x;
    boxes.push({ k: 's', id: n.id, tag: n.tag, x0: r1(x), y0: n.y, x1: r1(x + (n.card ? n.w : n.pillW)), y1: n.y + n.h });
  });
  // what he can do with the opened session, beside it
  if (foc) {
    var ops = [], oy = foc.y + 2, opsW = 0;
    if (foc.state === 'waiting') ops.push(['answer', 'Answer', true]);
    ops.push(['app', 'Open in the app', false]);
    if (foc.open) ops.push(['stop', 'Stop', false]);
    ops.forEach(function (o) {
      var w = tw(o[1], 13.5, 600) + 28; opsW = Math.max(opsW, w);
      put('op:' + o[0], 'op', -foc.w / 2 - 14 - w, oy, w, 28, '<rect class="hit" x="0" y="0" width="' + r1(w) + '" height="28" rx="14" fill="' + (o[2] ? C.wait : '#fff') + '" stroke="' + (o[2] ? C.wait : '#b5bdc8') + '" stroke-width="1.5"/>' + text(w / 2, 18.8, o[1], 13.5, 600, o[2] ? '#fff' : C.ink, 'middle'), 'op:' + o[0] + ':' + foc.tag);
      oy += 34;
    });
    if (HIST) foc.anc.concat([foc]).forEach(function (n) {
      var lab = (n.start < DAY0 ? D.dayName(n.start).slice(0, 3) + ' ' : '') + hm(n.start), w = tw(lab, 13, 400) + 8, xr = n === foc ? -foc.w / 2 - 14 - opsW - 12 : -n.pillW / 2 - 12;
      put('tm:' + n.id, 'time', xr - w, n.y + (n.card ? 10.5 : 2.8), w, 20, '<rect class="hit" x="-4" y="0" width="' + r1(w + 8) + '" height="20" rx="5" fill="#fff" stroke="#fff"/>' + text(w, 15, lab, 13, 400, C.grey, 'end'), 't:' + n.start, false, 'Play back from ' + lab);
    });
  }

  // ---------- the hooks, drawn ----------
  if (HOOKS_ON) {
    var wx0 = -wallW / 2 - 16, wy0 = yWall - 36, wh = '';
    wh += '<rect x="0" y="24" width="' + r1(wallW + 32) + '" height="' + ((nWallRows - 1) * WP + (COMPACT ? GH + 24 : GH + 44)) + '" rx="12" fill="' + C.softer + '" stroke="#e1e4e9"/>';
    wh += text(0, 15, 'Hooks', 14.5, 700, C.grey); keep.push({ x0: wx0, y0: wy0 + 2, x1: wx0 + tw('Hooks', 14.5, 700), y1: wy0 + 19 });
    if (!COMPACT) wsegs.forEach(function (s) { var sy = s.row * WP, cw = tw(s.g.cap, 13, 400) / 2, cx = (s.x0 + s.x1) / 2; keep.push({ x0: cx - cw, y0: wy0 + sy + GH + 46, x1: cx + cw, y1: wy0 + sy + GH + 62 }); wh += text((s.x0 + s.x1) / 2 - wx0, sy + GH + 58, s.g.cap, 13, 400, C.grey, 'middle'); if (s.g.hooks.length > 1) wh += '<path d="M' + r1(s.x0 - wx0) + ',' + (sy + GH + 42) + ' H' + r1(s.x1 - wx0) + '" stroke="#cfd4db" stroke-width="1.5"/>'; });
    put('wall', 'wall', wx0, wy0, wallW + 32, 36 + (nWallRows - 1) * WP + GH + (COMPACT ? 12 : 34), wh, '', true);
    gateList.forEach(function (g) {
      var f = g.worst === 'failed', r = g.worst === 'refused', p = g.worst === 'passed', stroke = f ? C.fail : r ? C.ref : p ? C.pass : '#c3c9d2', o = '';
      o += '<rect class="hit" x="0" y="0" width="' + r1(g.w) + '" height="' + GH + '" rx="9" fill="' + (g.fired ? '#fff' : C.softer) + '" stroke="' + stroke + '" stroke-width="' + (f ? 3 : r ? 2.2 : 1.6) + '"' + (g.fired ? '' : ' stroke-dasharray="5 4"') + '/>';
      if (COMPACT) {
        var mk = f || r ? 19 : 0, nx = (g.w - mk) / 2 + mk;
        if (f) o += tri(nx - tw(g.name, 14.5, 600) / 2 - 11, 18, 5.5, C.fail); else if (r) o += dia(nx - tw(g.name, 14.5, 600) / 2 - 11, 18, 6, C.ref);
        o += text(nx, 23, g.name, 14.5, 600, g.fired ? C.ink : C.faint, 'middle');
      } else {
        o += text(g.w / 2, 23, g.name, 15.5, 600, g.fired ? C.ink : C.faint, 'middle');
        var any = g.worst || g.rows.earlier.length;
        if (!g.fired) o += text(g.w / 2, 47, 'not fired today', 13, 400, C.faint, 'middle');
        else if (!any) o += text(g.w / 2, 47, 'quiet now', 13, 400, C.grey, 'middle');
        var ry = 33;
        ROWS.forEach(function (rw) {
          var tags = g.rows[rw[0]]; if (!tags.length) return; var k = rw[0], x = 12, cy = ry + 11, red = k === 'failed' || k === 'earlier';
          if (k === 'failed') o += tri(x + 6, cy, 5.5, C.fail); else if (k === 'earlier') o += tri(x + 6, cy, 5, '#fff', C.fail); else if (k === 'refused') o += dia(x + 6, cy, 6, C.ref); else o += check(x, cy, C.pass);
          o += text(x + 18, ry + 15.6, rw[1], 13, 600, k === 'refused' ? '#9a5d00' : k === 'passed' ? '#3c7f66' : C.fail); x += 18 + tw(rw[1], 13, 600) + 8;
          tags.forEach(function (t) { var w = tagW(t), evk = k === 'passed' ? '' : k === 'refused' ? 'refused' : 'failed';
            o += (evk ? '<g class="ev" data-ev="' + evk + '|' + t + '|' + g.id + '"><title>Open what ' + (evk === 'refused' ? 'was refused' : 'failed') + '</title>' : '') + '<rect x="' + r1(x) + '" y="' + (ry + 1) + '" width="' + r1(w) + '" height="20" rx="5" fill="' + (k === 'failed' ? C.fail : k === 'refused' ? C.refBg : '#fff') + '" stroke="' + (red ? C.fail : k === 'refused' ? C.ref : C.pass) + '" stroke-width="1.3"/>' + text(x + w / 2, ry + 15.4, t, 12.5, 700, k === 'failed' ? '#fff' : k === 'earlier' ? C.fail : k === 'refused' ? '#8a5300' : '#0f6f49', 'middle') + (evk ? '</g>' : ''); x += w + 5; });
          ry += 25;
        });
      }
      put('h:' + g.id, COMPACT ? 'chip' : 'gate', g.x, g.y, g.w, GH, o, COMPACT ? 'hooks' : 'h:' + g.id, false, g.name + ' · ' + g.group.cap + (COMPACT ? '' : ' · click opens it at the side'));
      boxes.push({ k: 'h', id: g.id, tags: uniq(g.rows.failed.concat(g.rows.refused, g.rows.passed, g.rows.earlier)), x0: g.x, y0: g.y, x1: g.x + g.w, y1: g.y + GH });
    });
  }

  // ---------- one session opened: its helpers, and the parts they touch ----------
  function icon(g, x, y, col) {
    if (g === 'Documents') return '<path d="M' + x + ',' + y + ' h8 l4,4 v12 h-12 z" fill="none" stroke="' + col + '" stroke-width="1.5" stroke-linejoin="round"/><path d="M' + (x + 3) + ',' + (y + 8) + ' h6 M' + (x + 3) + ',' + (y + 12) + ' h6" stroke="' + col + '" stroke-width="1.2"/>';
    if (g === 'Scripts') return '<rect x="' + (x - 1) + '" y="' + (y + 1) + '" width="15" height="14" rx="2.5" fill="none" stroke="' + col + '" stroke-width="1.5"/><path d="M' + (x + 2.5) + ',' + (y + 5) + ' l3,3 l-3,3 M' + (x + 8) + ',' + (y + 11.5) + ' h3.5" fill="none" stroke="' + col + '" stroke-width="1.4"/>';
    if (g === 'Stores and settings') return '<ellipse cx="' + (x + 6.5) + '" cy="' + (y + 3) + '" rx="6.5" ry="2.8" fill="none" stroke="' + col + '" stroke-width="1.5"/><path d="M' + x + ',' + (y + 3) + ' v10 a6.5,2.8 0 0 0 13,0 v-10" fill="none" stroke="' + col + '" stroke-width="1.5"/>';
    if (g === 'Tests and git') return '<circle cx="' + (x + 6.5) + '" cy="' + (y + 8) + '" r="7" fill="none" stroke="' + col + '" stroke-width="1.5"/><path d="M' + (x + 3) + ',' + (y + 8) + ' l2.6,2.8 l4.6,-5.6" fill="none" stroke="' + col + '" stroke-width="1.5"/>';
    return '<rect x="' + x + '" y="' + (y + 1) + '" width="13" height="14" rx="3" fill="none" stroke="' + col + '" stroke-width="1.5"/><path d="M' + (x + 4.5) + ',' + (y + 4.5) + ' l5,3.5 l-5,3.5 z" fill="' + col + '"/>';
  }
  var hs = foc ? foc.s.helpers.filter(function (h) { return h.start <= now; }).map(function (h) { return { h: h, run: foc.open && now <= h.end }; }) : [];
  hs.sort(function (a, b) { return (a.run - b.run) || (a.h.start - b.h.start); });
  if (LEVEL === 2 && foc) {
    var sg = wsegs.filter(function (s) { return s.g === GROUPS[2]; })[0], gcx = r1((sg.x0 + sg.x1) / 2), yTop = yWall + sg.row * WP - 12, my2 = (yA + yTop) / 2;
    var hx0 = sg.row === nWallRows - 1 ? gcx : 0;
    if (hs.length) L.push('<path d="M0,' + yA + ' C0,' + (my2 + 24) + ' ' + gcx + ',' + (my2 - 24) + ' ' + gcx + ',' + yTop + '" fill="none" stroke="' + C.work + '" stroke-width="5" opacity="0.4"/>');
    var HH = 48, yH = wallBottom + 54, HG = 10, hx = 0, done = hs.filter(function (q) { return !q.run; }), run = hs.filter(function (q) { return q.run; });
    var capD = done.length ? tw('finished', 13, 400) + 10 : 0, capR = run.length ? tw('running now', 13, 600) + 10 : 0;
    done.forEach(function (q) { q.label = q.h.kind + ' · ' + q.h.model; q.w = tw(q.label, 13, 400) + 22; q.hh = 28; });
    run.forEach(function (q) { q.w = Math.max(tw(q.h.kind, 15.5, 600), tw(q.h.model, 13.5, 400)) + 36; q.hh = HH; });
    var runW = run.reduce(function (a, q) { return a + q.w + HG; }, capR), doneW = done.reduce(function (a, q) { return a + q.w + HG; }, 0), budget = Math.max(wallW < 700 ? 150 : 320, wallW - runW - capD - 110), more = 0, moreQ = null;
    while (done.length > 1 && doneW > budget) { doneW -= done[0].w + HG; done.shift(); more++; }
    // one row when it fits under the hooks; else the finished ones above the running ones
    var TWO = done.length && run.length && capD + doneW + 20 + runW > Math.max(wallW, 420);
    if (TWO) { budget = Math.max(150, wallW - capD - 110); doneW = done.reduce(function (a, q) { return a + q.w + HG; }, 0); while (done.length > 1 && doneW > budget) { doneW -= done[0].w + HG; done.shift(); more++; } }
    hs = done.concat(run);
    hx = capD;
    if (more) { moreQ = { label: '+' + more + ' earlier', hh: 28, x: hx }; moreQ.w = tw(moreQ.label, 13, 600) + 22; hx += moreQ.w + HG; }
    done.forEach(function (q) { q.x = hx; hx += q.w + HG; });
    var dW = Math.max(0, hx - HG);
    if (TWO) hx = 0; else if (done.length && run.length) hx += 20;
    var runCapX = hx; hx += capR;
    run.forEach(function (q) { q.x = hx; hx += q.w + HG; });
    var hW = Math.max(TWO ? dW : 0, hx - HG, 0), hOff = Math.max(-wallW / 2, Math.min(wallW / 2 - hW, hx0 - hW / 2));
    if (hW > wallW) hOff = -hW / 2;
    var HROW = TWO ? 40 : 0;
    hs.forEach(function (q) { q.x += hOff; q.cx = q.x + q.w / 2; q.y = yH + (q.run ? HROW : 0) + (TWO && !q.run ? 0 : (HH - q.hh) / 2); });
    hs.forEach(function (q) { var my3 = (wallBottom + q.y) / 2 + 4;
      L.push('<path d="M' + hx0 + ',' + (wallBottom + 2) + ' C' + hx0 + ',' + (my3 + 14) + ' ' + r1(q.cx) + ',' + (my3 - 14) + ' ' + r1(q.cx) + ',' + q.y + '" fill="none" stroke="' + (q.run ? C.work : '#c3c9d2') + '" stroke-width="' + (q.run ? 2.6 : 1.3) + '"/>'); });
    var pm = {}, plist = [];
    hs.forEach(function (q) { q.h.parts.forEach(function (p) { if (p.indexOf('kind:') === 0) return; var e = pm[p]; if (!e) { e = pm[p] = { id: p, part: D.partById[p] || { name: p, group: '' }, from: [], run: false }; plist.push(e); } e.from.push(q); if (q.run) e.run = true; }); });
    plist.forEach(function (e) { var src = e.run ? e.from.filter(function (q) { return q.run; }) : e.from; e.src = src; e.bary = src.reduce(function (a, q) { return a + q.cx; }, 0) / src.length; e.w = tw(e.part.name, 14, e.run ? 600 : 400) + 44; });
    plist.sort(function (a, b) { return (a.run - b.run) || (a.bary - b.bary); });
    // the parts in rows no wider than the hooks
    var yP = yH + HROW + HH + 66, pmid = hOff + hW / 2, pMax = Math.max(wallW, 420), prow = [], prows = [prow], pxw = 0;
    plist.forEach(function (e) { if (prow.length && pxw + e.w > pMax) { prow.w = pxw - 10; prow = []; prows.push(prow); pxw = 0; } prow.push(e); pxw += e.w + 10; });
    prow.w = pxw - 10;
    prows.forEach(function (row, ri) {
      var px0 = Math.max(-wallW / 2, Math.min(wallW / 2 - row.w, pmid - row.w / 2)); if (row.w > wallW) px0 = -row.w / 2;
      row.forEach(function (e) { e.x = px0; e.cx = px0 + e.w / 2; e.y = yP + ri * 44; px0 += e.w + 10; });
    });
    plist.forEach(function (e) { e.src.forEach(function (q) { var y0 = q.y + q.hh, my4 = (y0 + e.y) / 2;
      L.push('<path d="M' + r1(q.cx) + ',' + y0 + ' C' + r1(q.cx) + ',' + (my4 + 12) + ' ' + r1(e.cx) + ',' + (my4 - 12) + ' ' + r1(e.cx) + ',' + e.y + '" fill="none" stroke="' + (q.run ? '#6f7d8f' : '#cdd2d9') + '" stroke-width="' + (q.run ? 1.7 : 1.1) + '"/>'); }); });
    hs.forEach(function (q) {
      var o = q.run ? '<rect x="0" y="0" width="' + r1(q.w) + '" height="' + q.hh + '" rx="24" fill="' + C.workBg + '" stroke="' + C.work + '" stroke-width="2.2"/>' + text(q.w / 2, 21.5, q.h.kind, 15.5, 600, C.ink, 'middle') + text(q.w / 2, 39, q.h.model, 13.5, 400, C.grey, 'middle')
        : '<rect x="0" y="0" width="' + r1(q.w) + '" height="' + q.hh + '" rx="14" fill="' + C.soft + '" stroke="#d9dde3"/>' + text(q.w / 2, 18.6, q.label, 13, 400, C.grey, 'middle');
      put('hp:' + q.h.id, q.run ? 'hrun' : 'hdone', q.x, q.y, q.w, q.hh, o);
    });
    if (moreQ) put('hp:more', 'hdone', moreQ.x + hOff, yH + (TWO ? 0 : (HH - 28) / 2), moreQ.w, 28, '<rect x="0" y="0" width="' + r1(moreQ.w) + '" height="28" rx="14" fill="#fff" stroke="#c3c9d2" stroke-dasharray="4 3"/>' + text(moreQ.w / 2, 18.6, moreQ.label, 13, 600, C.grey, 'middle'));
    var labX = -wallW / 2 - 16;
    if (hs.length) {
      var lh = text(0, 14, 'Helpers of ' + foc.tag, 14.5, 700, C.grey, null, HALO);
      if (done.length) lh += text(hOff - labX, 26 + (TWO ? 18.5 : HH / 2 + 4.5), 'finished', 13, 400, C.faint);
      if (run.length) lh += text(hOff + runCapX - labX, 26 + HROW + HH / 2 + 4.5, 'running now', 13, 600, C.work);
      put('lab:helpers', 'lab', labX, yH - 26, 200, 20, lh);
      ext(Math.min(labX, hOff), yH - 26, hOff + hW, yH + HROW + HH);
    } else put('lab:helpers', 'lab', labX, yH - 26, 260, 20, text(0, 14, 'Helpers of ' + foc.tag, 14.5, 700, C.grey) + text(0, 44, 'none started yet', 13.5, 400, C.faint));
    if (plist.length) put('lab:parts', 'lab', Math.min(labX, prows[0][0].x), yP - 30, 160, 20, text(0, 14, 'Parts they touch', 14.5, 700, C.grey, null, HALO));
    plist.forEach(function (e) { var col = e.run ? C.ink : C.faint;
      put('p:' + e.id, 'part', e.x, e.y, e.w, 34, '<rect class="hit" x="0" y="0" width="' + r1(e.w) + '" height="34" rx="7" fill="#fff" stroke="' + (e.run ? '#6f7d8f' : '#d3d8df') + '" stroke-width="' + (e.run ? 1.8 : 1.2) + '"/>' + icon(e.part.group, 11, 9, e.run ? C.grey : C.faint) + text(32, 22.5, e.part.name, 14, e.run ? 600 : 400, col), 'p:' + e.id, false, (e.part.file || e.part.name) + ' · click opens it at the side'); });
  }

  // ---------- that session's files, by the folder they live in: what it reads, what it writes, how the files link ----------
  // ---------- several sessions opened together: how they relate, each one's helpers, and their parts drawn once ----------
  var relText = '';
  if (LEVEL === 2 && GRP) {
    var gX = -wallW / 2 - 16, gW = Math.max(wallW + 32, 460), gy = wallBottom + 26, gtags = GRP.map(function (n) { return n.tag; });
    var gpm = {}, gpl = [], grows = [];
    GRP.forEach(function (n) {
      var a = n.s.helpers.filter(function (h) { return h.start <= now; }).map(function (h) { return { h: h, run: n.open && now <= h.end }; });
      a.sort(function (p, q) { return (p.run - q.run) || (p.h.start - q.h.start); });
      a.forEach(function (q) { q.h.parts.forEach(function (p) { if (p.indexOf('kind:') === 0) return; var e = gpm[p]; if (!e) { e = gpm[p] = { id: p, part: D.partById[p] || { name: p, group: '' }, tags: [], run: false }; gpl.push(e); } if (e.tags.indexOf(n.tag) < 0) e.tags.push(n.tag); if (q.run) e.run = true; }); });
      grows.push({ n: n, hs: a });
    });
    // one line that says how they relate: who started whom, the hooks two or more of them called, the parts they share
    var nSh = gpl.filter(function (e) { return e.tags.length > 1; }).length, both = GRP.length === 2, stt = [];
    var shH = gateList.filter(function (g) { return uniq(g.rows.failed.concat(g.rows.refused, g.rows.passed, g.rows.earlier)).length > 1; }).map(function (g) { return g.name; });
    GRP.forEach(function (n) { for (var q = n.parent, dir = true; q; q = q.parent, dir = false) if (q.pick) { stt.push(dir ? q.tag + ' started ' + n.tag : n.tag + ' comes from ' + q.tag); break; } });
    var par0 = GRP[0].parent, sameP = GRP.every(function (n) { return n.parent === par0; });
    var who = stt.length ? stt.slice(0, 3).join(', ') + (stt.length > 3 ? ' and ' + (stt.length - 3) + ' more' : '') : sameP ? (both ? 'both' : 'all') + ' started by ' + (par0 ? par0.tag : 'you') : 'none started another';
    relText = (both ? gtags.join(' and ') : GRP.length + ' sessions') + ': ' + who + ' · ' + (shH.length ? (both ? 'both called ' : 'two or more called ') + shH.join(', ') : 'no hook in common now') + ' · ' + (nSh ? nSh + (nSh === 1 ? ' part' : ' parts') + ' shared' : 'no part in common');
    var rl = wrap(relText, 15, 600, gW, 3), rh = '';
    rl.forEach(function (l, i) { rh += text(0, 15 + i * 21, l, 15, 600, C.ink, null, HALO); });
    put('lab:rel', 'lab', gX, gy, gW, rl.length * 21, rh); gy += rl.length * 21 + 16;
    put('lab:helpers', 'lab', gX, gy, 200, 20, text(0, 14, 'Helpers', 14.5, 700, C.grey)); gy += 26;
    grows.forEach(function (rw) {
      var n = rw.n, cw = tw(n.tag, 13, 700) + 16, x = cw + 12, o = '', more = 0, a = rw.hs, tot = 0;
      a.forEach(function (q) { q.label = q.h.kind + ' · ' + q.h.model; q.w = tw(q.label, 13, q.run ? 600 : 400) + 22 + (q.run ? 14 : 0); tot += q.w + 8; });
      while (a.length > 1 && !a[0].run && x + tot + 90 > gW) { tot -= a[0].w + 8; a.shift(); more++; }
      o += '<rect x="0" y="2" width="' + r1(cw) + '" height="24" rx="6" fill="' + (n.state === 'waiting' ? C.wait : n.state === 'working' ? C.work : C.quiet) + '"/>' + text(cw / 2, 18.6, n.tag, 13, 700, '#fff', 'middle');
      if (!a.length) o += text(x, 19, 'no helper started', 13, 400, C.faint);
      if (more) { var ml = '+' + more + ' earlier', mw2 = tw(ml, 13, 600) + 20; o += '<rect x="' + r1(x) + '" y="0" width="' + r1(mw2) + '" height="28" rx="14" fill="#fff" stroke="#c3c9d2" stroke-dasharray="4 3"/>' + text(x + mw2 / 2, 18.6, ml, 13, 600, C.grey, 'middle'); x += mw2 + 8; }
      a.forEach(function (q) {
        o += '<rect x="' + r1(x) + '" y="0" width="' + r1(q.w) + '" height="28" rx="14" fill="' + (q.run ? C.workBg : C.soft) + '" stroke="' + (q.run ? C.work : '#d9dde3') + '" stroke-width="' + (q.run ? 2 : 1) + '"/>' + (q.run ? '<circle cx="' + r1(x + 14) + '" cy="14" r="4.2" fill="' + C.work + '"/>' : '') + text(x + (q.run ? 24 : 11), 18.6, q.label, 13, q.run ? 600 : 400, q.run ? C.ink : C.grey);
        x += q.w + 8;
      });
      put('hg:' + n.id, 'hrow', gX, gy, Math.max(x, 160), 28, o, '', false, 'Helpers ' + n.tag + ' has started' + (more ? ' (' + more + ' earlier ones folded)' : '')); gy += 36;
    });
    gy += 12;
    var pl0 = 'Parts their helpers touch';
    put('lab:parts', 'lab', gX, gy, 460, gpl.length ? 20 : 46, text(0, 14, pl0, 14.5, 700, C.grey, null, HALO) + (gpl.length ? text(tw(pl0, 14.5, 700) + 14, 14, 'each drawn once, with the sessions that touch it', 13, 400, C.faint) : text(0, 40, 'none yet', 13.5, 400, C.faint))); gy += 28;
    gpl.sort(function (a, b) { return (b.tags.length - a.tags.length) || (gtags.indexOf(a.tags[0]) - gtags.indexOf(b.tags[0])) || (a.part.name < b.part.name ? -1 : 1); });
    var gpx = 0;
    gpl.forEach(function (e) {
      var sh = e.tags.length > 1, nw = tw(e.part.name, 14, sh ? 600 : 400), w = 32 + nw + 8, o = '', tx;
      e.tags.forEach(function (t) { w += tagW(t) + 4; }); w += 6;
      if (gpx > 0 && gpx + w > gW) { gpx = 0; gy += 42; }
      o += '<rect class="hit" x="0" y="0" width="' + r1(w) + '" height="34" rx="7" fill="#fff" stroke="' + (sh ? '#3d4a5c' : '#d3d8df') + '" stroke-width="' + (sh ? 1.9 : 1.2) + '"/>' + icon(e.part.group, 11, 9, sh ? C.grey : C.faint) + text(32, 22.5, e.part.name, 14, sh ? 600 : 400, sh ? C.ink : C.grey);
      tx = 32 + nw + 8;
      e.tags.forEach(function (t) { var w1 = tagW(t); o += '<rect x="' + r1(tx) + '" y="7" width="' + r1(w1) + '" height="20" rx="5" fill="' + (sh ? '#eef2f8' : '#fff') + '" stroke="#8a95a3" stroke-width="1.2"/>' + text(tx + w1 / 2, 21.4, t, 12.5, 700, C.ink, 'middle'); tx += w1 + 4; });
      put('p:' + e.id, 'part', gX + gpx, gy, w, 34, o, 'p:' + e.id, false, (e.part.file || e.part.name) + ' · touched by helpers of ' + e.tags.join(', ') + ' · click opens it at the side');
      gpx += w + 10;
    });
  }

  var selInfo = null;
  if (LEVEL === 3) {
    var fm = {}, flist = [], rwAll = (cfg.rw && cfg.rw(foc.id)) || {}, LK = cfg.links || { out: {}, inn: {} }, sel = cfg.sel || '';
    var fget = function (p, any) { var part = D.partById[p]; if (!(any ? partHasFile(part) : partIsFile(part))) return null; var e = fm[p]; if (!e) { e = fm[p] = { id: p, part: part, lit: false, self: false, helpers: 0, rw: null, extra: false }; flist.push(e); } return e; };
    cfg.filesOf(foc.id).forEach(function (u) { var e = fget(u.part); if (e && now - u.last <= 10) { e.lit = true; e.self = true; } });
    hs.forEach(function (q) { q.h.parts.forEach(function (p) { var e = fget(p); if (e && q.run) { e.lit = true; e.helpers++; } }); });
    Object.keys(rwAll).forEach(function (p) { var e = fget(p, true); if (e) e.rw = rwAll[p]; });
    // the links of the picked file: the files it names, and the files that name it
    var lout = {}, lin = {}, nFold = 0;
    if (sel) {
      (LK.out[sel] || []).forEach(function (l) { if (partHasFile(D.partById[l[0]])) lout[l[0]] = l; });
      (LK.inn[sel] || []).forEach(function (l) { if (partHasFile(D.partById[l[0]])) lin[l[0]] = l; });
      // linked files this session has not used stay folded into one count until he asks for them (cfg.unfold)
      uniq([sel].concat(Object.keys(lout), Object.keys(lin))).forEach(function (p) { if (fm[p]) return; if (p !== sel && !cfg.unfold) { nFold++; return; } var e = fget(p, true); if (e) e.extra = p === sel ? 'sel' : lout[p] ? 'out' : 'in'; });
    }
    var folderOf = function (file) {
      if (/^(C:|~)/.test(file)) return 'outside the repository';
      var cut = file.search(/[{*<,]/), f = cut >= 0 ? file.slice(0, cut) : file, i = f.lastIndexOf('/');
      return i < 0 ? 'repository root' : f.slice(0, i).split('/').slice(0, 2).join('/');
    };
    var sn = sel && D.partById[sel] ? D.partById[sel].name : '', XN = { sel: 'picked, not used by ' + foc.tag, out: sn + ' names these too (not used by ' + foc.tag + ')', inn: 'these name ' + sn + ' (not used by ' + foc.tag + ')' }, cnt = {};
    flist.forEach(function (e) { e.folder = e.extra ? XN[e.extra === 'in' ? 'inn' : e.extra] : folderOf(e.part.file); cnt[e.folder] = (cnt[e.folder] || 0) + 1; });
    flist.forEach(function (e) { if (!e.extra && e.folder.indexOf('/') > 0 && cnt[e.folder] < 3) e.folder = e.folder.split('/')[0]; });
    var folders = {}, flds = [];
    flist.forEach(function (e) { var f = folders[e.folder]; if (!f) { f = folders[e.folder] = { name: e.folder, files: [], writes: false, extra: e.extra }; flds.push(f); } f.files.push(e); if (e.rw && e.rw.write) f.writes = true; });
    var fo = function (f) { return f.extra ? 2 : f.name.indexOf('outside') === 0 ? 1 : 0; };
    flds.sort(function (a, b) { return (fo(a) - fo(b)) || (a.name < b.name ? -1 : 1); });
    var FW = 170, FG = 8, PADL = 20, PADR = 10, PG = 14, yF = treeBottom + 104, FMAX = Math.max(MAXW, 240), prx = 0, pry = yF, prh = 0, frow = 0, allW = 0;
    // Link lines run only in the gaps: beside a column of files and under a row of folders, never over a file. The gap
    // between two columns is PADR + PG + PADL wide; a track keeps 5 px from a file and from a folder's border and 7 px from
    // the next track. The tracks that fit are the most lines drawn at once (4 with these sizes); the other links are marked.
    var LGAP = PADR + PG + PADL, TR = [];
    [[5, PADR - 5], [PADR + 5, PADR + PG - 5], [PADR + PG + 5, LGAP - 5]].forEach(function (z) { for (var g = z[0]; g <= z[1]; g += 7) TR.push(g); });
    var fci = 0, LMAX = TR.length, LANE =sel && fm[sel] && (Object.keys(lout).length || Object.keys(lin).length) ? 8 + 7 * LMAX : 0, rowBot = [];
    flds.forEach(function (f) {
      f.files.sort(function (a, b) { return a.part.name < b.part.name ? -1 : 1; });
      f.cols = f.extra ? Math.max(1, Math.min(Math.ceil(f.files.length / 6), Math.floor((FMAX - PADL - PADR) / (FW + FG)))) : 1;
      f.w = PADL + f.cols * (FW + FG) - FG + PADR;
      var cy = [], k; for (k = 0; k < f.cols; k++) cy.push(34);
      f.files.forEach(function (e) { var c = 0; for (k = 1; k < f.cols; k++) if (cy[k] < cy[c]) c = k; e.h = e.rw ? 62 : 46; e.dx = PADL + c * (FW + FG); e.dy = cy[c]; cy[c] += e.h + FG; });
      f.h = Math.max.apply(null, cy) + 4;
      if (prx > 0 && prx + f.w > FMAX) { prx = 0; pry += prh + 16 + LANE; prh = 0; frow++; fci = 0; }
      f.x = prx; f.y = pry; f.row = frow; f.ci = fci++; prx += f.w + PG; prh = Math.max(prh, f.h); allW = Math.max(allW, prx - PG);
      rowBot[frow] = pry + prh;
    });
    var filesBottom = pry + prh + LANE, pos = {};
    var nOut = Object.keys(lout).length, nIn = Object.keys(lin).length, selPart = sel && D.partById[sel];
    var title = flist.length ? 'Files ' + foc.tag + ' and its helpers use' : foc.tag + ' has used no file yet';
    if (selPart && fm[sel]) { title = selPart.name + (nOut + nIn ? ': names ' + nOut + (nOut === 1 ? ' file' : ' files') + ' · ' + nIn + (nIn === 1 ? ' names it' : ' name it') : ': no link to another file was found'); selInfo = { id: sel, out: nOut, inn: nIn, lines: 0, marked: 0, folded: nFold, most: LMAX }; }
    var relOf = function (id) { return lout[id] && lin[id] ? 'names ' + sn + ' · named by it' : lout[id] ? 'named by ' + sn : 'names ' + sn; };
    flds.forEach(function (f) {
      var x0 = f.x - allW / 2, gx = r1(x0 + 9), my = (yA + f.y) / 2;
      if (f.row === 0 && !f.extra) L.push('<path d="M0,' + yA + ' C0,' + (my + 26) + ' ' + gx + ',' + (my - 26) + ' ' + gx + ',' + f.y + '" fill="none" stroke="#c3c9d2" stroke-width="1.4"/>');
      var wl = f.writes, wlw = wl ? 22 : 0;
      put('fold:' + f.name, 'fold', x0, f.y, f.w, f.h, '<rect x="0" y="0" width="' + f.w + '" height="' + f.h + '" rx="10" fill="' + C.softer + '" stroke="' + (f.extra ? '#c3c9d2' : '#e1e4e9') + '"' + (f.extra ? ' stroke-dasharray="5 4"' : '') + '/>' + text(PADL, 21, fit(f.name + (f.name.indexOf(' ') < 0 ? '/' : ''), 13.5, 600, f.w - PADL - 6 - wlw), 13.5, 600, C.grey) + (wl ? '<path d="M' + (f.w - 24) + ',24 l2.2,-6.6 l8.6,-8.6 l4.4,4.4 l-8.6,8.6 z" fill="none" stroke="' + C.ink + '" stroke-width="1.4" stroke-linejoin="round"/>' : ''), '', true, f.writes ? foc.tag + ' or its helpers wrote to files here today' : '');
      f.files.forEach(function (e) {
        var bx = x0 + e.dx, by = f.y + e.dy, tail = e.part.file.indexOf(f.name + '/') === 0 ? e.part.file.slice(f.name.length + 1) : e.part.file;
        var isSel = e.id === sel, linked = !!(lout[e.id] || lin[e.id]), dim = sel && fm[sel] && !isSel && !linked;
        var stroke = isSel ? C.ink : linked ? '#3d4a5c' : e.helpers ? C.work : e.lit ? '#3d4a5c' : '#d3d8df', o = '';
        o += '<rect class="hit" x="0" y="0" width="' + FW + '" height="' + e.h + '" rx="7" fill="' + (isSel ? '#eef2f8' : '#fff') + '" stroke="' + stroke + '" stroke-width="' + (isSel ? 3 : linked || e.lit ? 2 : 1.2) + '"' + (e.extra ? ' stroke-dasharray="5 3"' : '') + '/>' + icon(e.part.group, 10, 8, e.lit || isSel ? C.grey : C.faint);
        // a linked file says how it is linked where its path stands (the path stays in the tooltip); most links get no line
        o += text(31, 20, fit(e.part.name, 14, e.lit || isSel ? 600 : 400, FW - 38 - e.helpers * 11), 14, e.lit || isSel ? 600 : 400, e.lit || isSel || linked ? C.ink : C.grey) + (linked && fm[sel] ? text(10, 38, fit(relOf(e.id), 12.5, 400, FW - 18), 12.5, 400, C.ink) : text(10, 38, fit(tail, 12.5, 400, FW - 18), 12.5, 400, e.lit ? C.grey : C.faint));
        for (var d = 0; d < e.helpers; d++) o += '<circle cx="' + (FW - 11 - d * 11) + '" cy="15" r="4.2" fill="' + C.work + '"/>';
        var tip = e.part.file;
        if (e.rw) {
          var rx = 10;
          if (e.rw.read) { o += text(rx, 54, 'reads', 12.5, 400, C.grey); rx += tw('reads', 12.5, 400); }
          if (e.rw.read && e.rw.write) { o += text(rx + 4, 54, '·', 12.5, 400, C.faint); rx += 12; }
          if (e.rw.write) { o += text(rx, 54, 'writes', 12.5, 700, C.ink); o += '<path d="M' + (FW - 24) + ',56 l2.2,-6.6 l8.6,-8.6 l4.4,4.4 l-8.6,8.6 z" fill="none" stroke="' + C.ink + '" stroke-width="1.4" stroke-linejoin="round"/>'; }
          tip += ' · read ' + e.rw.read + ' times, written ' + e.rw.write + ' times today';
        }
        if (lout[e.id]) tip += ' · named in ' + lout[e.id][2] + ' line ' + lout[e.id][3];
        if (lin[e.id]) tip += ' · it names this in ' + lin[e.id][2] + ' line ' + lin[e.id][3];
        put('p:' + e.id, 'file', bx, by, FW, e.h, dim ? '<g opacity="0.38">' + o + '</g>' : o, 'f:' + e.id, false, tip + ' · double-click opens it at the side');
        pos[e.id] = { x: r1(bx), y: by, w: FW, h: e.h, f: f, my: by + e.h / 2 };
        anchors.file[e.id] = { x: r1(bx), y: by + e.h / 2, gx: gx, top: f.y, x0: r1(bx), y0: by, w: FW, h: e.h };
      });
    });
    // The lines: the links with the most mentions first, as many as there are tracks (LMAX). Each line leaves the picked
    // file on its own height, runs on its own track beside the columns and under the row, and enters its file from the
    // side: none crosses a file or another line. Inner track = lower exit for a line going down, higher for one going up.
    var rpath = function (p) {
      var d = 'M' + r1(p[0][0]) + ',' + r1(p[0][1]);
      for (var i = 1; i < p.length; i++) {
        var a = p[i - 1], b = p[i], c = p[i + 1];
        var l1 = Math.abs(b[0] - a[0]) + Math.abs(b[1] - a[1]), l2 = c ? Math.abs(c[0] - b[0]) + Math.abs(c[1] - b[1]) : 0, r = Math.min(6, l1 / 2, l2 / 2);
        if (!c || r < 0.5) { d += ' L' + r1(b[0]) + ',' + r1(b[1]); continue; }
        d += ' L' + r1(b[0] + (a[0] - b[0]) / l1 * r) + ',' + r1(b[1] + (a[1] - b[1]) / l1 * r) + ' Q' + r1(b[0]) + ',' + r1(b[1]) + ' ' + r1(b[0] + (c[0] - b[0]) / l2 * r) + ',' + r1(b[1] + (c[1] - b[1]) / l2 * r);
      }
      return d;
    };
    var nLines = 0, nMarked = 0;
    if (sel && pos[sel]) {
      var A = pos[sel], cands = [], G = 4;
      Object.keys(lout).concat(Object.keys(lin).filter(function (p) { return !lout[p]; })).forEach(function (p) {
        var B = pos[p]; if (!B || p === sel) return;
        nMarked++;
        if (fm[p].extra || B.f.row !== A.f.row) return;                 // an unfolded file, or one in another row: marked only
        cands.push({ p: p, B: B, n: (lout[p] ? lout[p][1] : 0) + (lin[p] ? lin[p][1] : 0), out: !!lout[p] });
      });
      cands.sort(function (a, b) { return b.n - a.n || (a.p < b.p ? -1 : 1); });
      cands = cands.slice(0, LMAX); nLines = cands.length;
      [1, -1].forEach(function (sd) {
        var ls = cands.filter(function (c) { return (c.B.f === A.f || c.B.x > A.x ? 1 : -1) === sd; }); if (!ls.length) return;
        // type 0: same column; 1: under the row to a farther column; 2: the next column
        ls.forEach(function (c) { c.type = c.B.f === A.f ? 0 : Math.abs(c.B.f.ci - A.f.ci) === 1 ? 2 : 1; c.up = c.type !== 1 && c.B.my < A.my; c.dx = Math.abs(c.B.x - A.x); c.dy = Math.abs(c.B.my - A.my); });
        var inner = function (a, b) { return a.type - b.type || (a.type === 0 ? a.dy - b.dy : a.type === 1 ? (b.dx - a.dx || b.B.my - a.B.my) : b.dy - a.dy); };
        var ups = ls.filter(function (c) { return c.up; }).sort(inner), downs = ls.filter(function (c) { return !c.up; }).sort(inner);
        ups.forEach(function (c, k) { c.k = k; }); downs.forEach(function (c, k) { c.k = k; });
        var order = ups.concat(downs.slice().reverse());                  // the exits, from the top down
        order.forEach(function (c, i) { c.ey = A.my + (i - (order.length - 1) / 2) * 8; });
        var lanes = downs.filter(function (c) { return c.type === 1; }), byF = {};
        lanes.forEach(function (c, i) { var lo = Math.min(c.B.f.ci, A.f.ci), hi = Math.max(c.B.f.ci, A.f.ci), bot = 0; flds.forEach(function (f) { if (f.row === A.f.row && f.ci > lo && f.ci < hi) bot = Math.max(bot, f.y + f.h); }); c.ly = bot + 8 + 7 * (lanes.length - 1 - i); });
        lanes.slice().sort(function (a, b) { return b.B.my - a.B.my; }).forEach(function (c) { var key = c.B.f.name, j = byF[key] = byF[key] === undefined ? 0 : byF[key] + 1; c.tx = sd > 0 ? c.B.x - LGAP + TR[LMAX - 1 - j] : c.B.x + c.B.w + TR[j]; });
        ls.forEach(function (c) {
          var B = c.B, ax = sd > 0 ? A.x + A.w + G : A.x - G, cx = sd > 0 ? A.x + A.w + TR[c.k] : A.x - LGAP + TR[LMAX - 1 - c.k];
          var bx = c.type === 0 ? B.x + B.w + G : sd > 0 ? B.x - G : B.x + B.w + G, pts = [[ax, c.ey], [cx, c.ey]];
          if (c.type === 1) pts.push([cx, c.ly], [c.tx, c.ly], [c.tx, B.my]); else pts.push([cx, B.my]);
          pts.push([bx, B.my]);
          pts.forEach(function (q) { ext(q[0] - 3, q[1] - 3, q[0] + 3, q[1] + 3); });
          if (c.out) O.push('<path d="' + rpath(pts) + '" fill="none" stroke="' + C.ink + '" stroke-width="1.6" opacity="0.9" marker-end="url(#arl)"/>');
          else O.push('<path d="' + rpath(pts.reverse()) + '" fill="none" stroke="#6b7788" stroke-width="1.5" stroke-dasharray="6 4" marker-end="url(#ar)"/>');
        });
      });
    }
    // the title; how many links have a line; the fold of linked files this session has not used; what the counts do not see
    var tcol = selPart && fm[sel] ? C.ink : C.grey, th = text(0, 14, title, 14.5, 700, tcol, null, HALO), sub = '', yb = filesBottom + 12, lw = Math.max(300, Math.min(allW, 1100));
    if (selInfo) { selInfo.lines = nLines; selInfo.marked = nMarked - nLines; }
    if (nLines && nMarked > nLines) sub = 'Lines go to the ' + nLines + ' files linked most often. The other ' + (nMarked - nLines) + ' are outlined and say how they are linked.';
    else if (nMarked && !nLines) sub = 'The ' + nMarked + ' linked ' + (nMarked === 1 ? 'file is' : 'files are') + ' outlined and say how they are linked.';
    var subFits = sub && tw(title, 14.5, 700) + 16 + tw(sub, 13.5, 400) <= Math.max(allW, 300);
    if (subFits) th += text(tw(title, 14.5, 700) + 16, 14, sub, 13.5, 400, C.grey, null, HALO);
    put('lab:files', 'lab', -allW / 2, yF - 30, 300, 20, th);
    var nOpen = flist.filter(function (e) { return e.extra && e.extra !== 'sel'; }).length;
    if (nFold || nOpen) {
      var ct = nFold ? nFold + ' more linked ' + (nFold === 1 ? 'file is' : 'files are') + ' not used by ' + foc.tag + ' · show ' + (nFold === 1 ? 'it' : 'them') : 'Fold the ' + nOpen + ' linked ' + (nOpen === 1 ? 'file' : 'files') + ' ' + foc.tag + ' has not used', cw = tw(ct, 13.5, 600) + 30;
      put('fx:fold', 'part', -allW / 2, yb, cw, 30, '<rect class="hit" x="0" y="0" width="' + r1(cw) + '" height="30" rx="15" fill="#fff" stroke="#8a95a3" stroke-width="1.3" stroke-dasharray="5 3"/>' + text(15, 20, ct, 13.5, 600, C.ink), 'unfold', false, nFold ? 'Show the linked files this session has not used' : 'Fold them into one count again');
      yb += 42;
    }
    if (sub && !subFits) { var sl = wrap(sub, 13.5, 400, lw, 3), sh = ''; sl.forEach(function (l, i) { sh += text(0, 14 + i * 18, l, 13.5, 400, C.grey); }); put('lab:lines', 'lab', -allW / 2, yb, lw, sl.length * 18 + 2, sh); yb += sl.length * 18 + 8; }
    // what the counts and the links do not see
    var note = wrap('Reads and writes are counted over the whole day, from each tool call. A read done by a shell command is not counted; a path built while a script runs is not seen. A link is one file naming another by its path; click a file to see its links.', 12.5, 400, lw, 5), nh = '';
    note.forEach(function (l, i) { nh += text(0, 13 + i * 17, l, 12.5, 400, C.faint); });
    put('lab:limits', 'lab', -allW / 2, yb + 2, lw, note.length * 17 + 2, nh);
  }

  // header facts
  var waitingTags = st.sessions.filter(function (s) { return s.state === 'waiting'; }).map(function (s) { return s.tag; });
  var fm2 = st.marks.filter(function (m) { return m.result === 'failed'; });
  return { nodes: nodes, lines: L.join(''), over: O.join(''), bb: bb, anchors: anchors, clock: st.clock, day: st.day, working: st.counts.working, helpers: st.counts.helpers,
    waitingTags: waitingTags, failHooks: uniq(fm2.map(function (m) { return hookName(m.part); })), failTags: uniq(fm2.map(function (m) { return m.tag; })).reverse(),
    group: GRP ? GRP.map(function (n) { return n.tag; }) : null, boxes: boxes, keep: keep, rel: relText, fails: fm2.map(function (m) { return [m.tag, m.part]; }),
    focus: foc ? foc.tag : '', focusState: foc ? foc.state : '', rails: RAILS, sel: selInfo, tags: shown.filter(function (n) { return n.card; }).map(function (n) { return n.tag; }), stSessions: st.sessions };
}
if (typeof module !== 'undefined') module.exports = { layoutPicture: layoutPicture, partIsFile: partIsFile, partHasFile: partHasFile, quietGaps: quietGaps };
