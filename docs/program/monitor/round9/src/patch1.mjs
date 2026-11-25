import fs from 'node:fs';
let s = fs.readFileSync('draw.js', 'utf8');
const cut = (a, b, rep) => { const i = s.indexOf(a), j = s.indexOf(b, i); if (i < 0 || j < 0) throw new Error('marker not found: ' + a.slice(0, 40) + ' / ' + b.slice(0, 40)); s = s.slice(0, i) + rep + s.slice(j); };

// 1. hooks: gates sized by what they show; tags of the sessions each hook acted on
cut("  var GW = 158, GH = 56", "  // ---------- drawing ----------", `  var GIN = 12, GOUT = 34, gates = {}, gateList = [], wallW = 0, rank = { passed: 1, refused: 2, failed: 3 };
  var ROWS = [['failed', 'failed'], ['refused', 'refused'], ['passed', 'let through']];
  GROUPS.forEach(function (g) { g.hooks.forEach(function (h) { gates[h] = { id: h, name: hookName(h), group: g, rows: { failed: [], refused: [], passed: [] }, inc: [] }; gateList.push(gates[h]); }); });
  st.sessions.forEach(function (x) {
    var m = {}; (x.hooks || []).forEach(function (h) { m[h] = 'passed'; });
    x.marks.forEach(function (k) { if (!m[k.part] || rank[k.result] > rank[m[k.part]]) m[k.part] = k.result; });
    Object.keys(m).forEach(function (h) { if (gates[h]) gates[h].rows[m[h]].push(x.tag); });
    if (byId[x.id]) byId[x.id].hookRes = m;
  });
  function tagW(t) { return tw(t, 12, 700) + 12; }
  var maxRows = 1;
  gateList.forEach(function (g) {
    g.fired = D.events.some(function (e) { return e.part === g.id && e.t >= DAY0 && e.t <= now; });
    var w = tw(g.name, 15, 600) + 30, nr = 0;
    ROWS.forEach(function (r) { var tags = g.rows[r[0]]; if (!tags.length) return; nr++; var rw = 12 + 18 + tw(r[1], 12.5, 600) + 8; tags.forEach(function (t) { rw += tagW(t) + 5; }); w = Math.max(w, rw + 7); });
    if (!g.fired) w = Math.max(w, tw('not fired today', 12.5, 400) + 26);
    g.w = Math.max(w, 112); g.nr = nr; maxRows = Math.max(maxRows, nr);
  });
  var GH = 32 + maxRows * 25 + 6;
  GROUPS.forEach(function (g, gi) { g.x0 = wallW; g.hooks.forEach(function (h, i) { gates[h].x = wallW; wallW += gates[h].w + (i < g.hooks.length - 1 ? GIN : 0); }); g.x1 = wallW; if (gi < GROUPS.length - 1) wallW += GOUT; });
  GROUPS.forEach(function (g) { g.x0 -= wallW / 2; g.x1 -= wallW / 2; }); gateList.forEach(function (g) { g.x -= wallW / 2; });
  var yA = treeBottom + 10, yWall = treeBottom + 118, wallBottom = yWall + GH + 30;
  all.forEach(function (n) {
    n.hookLines = [];
    if (!n.open || !n.hookRes) return;
    Object.keys(n.hookRes).forEach(function (h) {
      var res = n.hookRes[h]; if (!gates[h]) return;
      if (res === 'failed' ? LEVEL >= 1 : (LEVEL >= 2 && n.tag === cfg.open)) { var l = { n: n, gate: gates[h], result: res }; n.hookLines.push(l); gates[h].inc.push(l); }
    });
  });

`);

// 2. hook lines: arrival points use the gate's own width
s = s.replace("gx = g.x + GW / 2 + (i - (g.inc.length - 1) / 2) * 15", "gx = g.x + g.w / 2 + (i - (g.inc.length - 1) / 2) * 16");
s = s.replace("Object.keys(gates).forEach(function (k) { gates[k].inc.sort(function (a, b) { return a.n.cx - b.n.cx; }); });", "gateList.forEach(function (g) { g.inc.sort(function (a, b) { return a.n.cx - b.n.cx; }); });");

// 3. the wall
cut("    Object.keys(gates).forEach(function (k) {\n      var g = gates[k], f = g.fail > 0", "    ext(-wallW / 2 - 16, yWall - 36", `    gateList.forEach(function (g) {
      var f = g.rows.failed.length > 0, r = g.rows.refused.length > 0, p = g.rows.passed.length > 0, stroke = f ? C.fail : r ? C.ref : p ? C.pass : '#c3c9d2';
      o.push('<rect x="' + g.x + '" y="' + yWall + '" width="' + g.w + '" height="' + GH + '" rx="9" fill="' + (g.fired ? '#fff' : 'none') + '" stroke="' + stroke + '" stroke-width="' + (f ? 3 : r ? 2.2 : 1.6) + '"' + (g.fired ? '' : ' stroke-dasharray="5 4"') + '/>');
      o.push(text(g.x + g.w / 2, yWall + 23, g.name, 15, 600, g.fired ? C.ink : C.faint, 'middle'));
      if (!g.fired) o.push(text(g.x + g.w / 2, yWall + 47, 'not fired today', 12.5, 400, C.faint, 'middle'));
      var ry = yWall + 34;
      ROWS.forEach(function (rw) {
        var tags = g.rows[rw[0]]; if (!tags.length) return; var k = rw[0], col = k === 'failed' ? C.fail : k === 'refused' ? C.ref : C.work, x = g.x + 12, cy = ry + 11;
        if (k === 'failed') o.push(tri(x + 6, cy, 5.5, C.fail)); else if (k === 'refused') o.push(dia(x + 6, cy, 6, C.ref)); else o.push('<path d="M' + (x + 1) + ',' + cy + ' l3.6,4 l6.4,-8.4" fill="none" stroke="' + C.pass + '" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/>');
        o.push(text(x + 18, ry + 15.5, rw[1], 12.5, 600, k === 'refused' ? '#9a5d00' : k === 'failed' ? C.fail : '#3c7f66')); x += 18 + tw(rw[1], 12.5, 600) + 8;
        tags.forEach(function (t) { var w = tagW(t);
          o.push('<rect x="' + x + '" y="' + (ry + 1) + '" width="' + w + '" height="20" rx="5" fill="' + (k === 'failed' ? C.fail : k === 'refused' ? C.refBg : '#fff') + '" stroke="' + (k === 'failed' ? C.fail : k === 'refused' ? C.ref : C.pass) + '" stroke-width="1.3"/>' + text(x + w / 2, ry + 15.3, t, 12, 700, k === 'failed' ? '#fff' : k === 'refused' ? '#8a5300' : '#0f6f49', 'middle')); x += w + 5; });
        ry += 25;
      });
    });
`);
s = s.replace(/yWall \+ GH \+ 22, g\.cap/, "yWall + GH + 22, g.cap");
fs.writeFileSync('draw.js', s);
console.log('patched');
