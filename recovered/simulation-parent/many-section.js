  // ------------------------------------------------------------ section 6: many runs, at three ties
  var TIES = (MAP.ensemble_ties && MAP.ensemble_ties.levels) || [0, 0.5, 1];
  var ENSR = null, RUNS = null, ENS = null;
  var RLAB = { cost_vs_ladder: 'Cost ratio', wrong_vs_ladder: 'Wrong-rate ratio', cost_vs_top: 'Cost ratio', wrong_vs_top: 'Wrong-rate ratio' };
  function renderEnsControls() {
    var M = TX.sections.many;
    $('#ensControls').innerHTML = '<div class="ctl"><span>Runs at each tie</span><select id="ensN" data-label="1"><option>300</option><option>1000</option><option>2000</option></select></div>' +
      '<div class="ctl"><span data-tip="' + esc('A whole number that fixes the random draws. The same seed always gives the same runs.') + '">Seed</span><input type="number" id="ensSeed" value="20261112" style="width:9rem"></div>' +
      '<button class="btn primary" type="button" id="ensRun">Run at all three ties</button>' +
      '<div class="ctl"><span>Progress</span><div class="row"><div class="progress"><i id="ensBar"></i></div><span class="small" id="ensTxt" data-label="1">not run yet</span></div></div>' +
      '<p class="note" style="flex-basis:100%">' + rich('{{c:guess}} of the {{c:drawn}} drawn unknowns are guesses.') + ' ' + esc(M.tie) + ' ' + esc(M.follows) + '</p>';
  }
  document.addEventListener('click', function (e) {
    if (e.target.id === 'ensRun') runEnsemble();
    var w = e.target.closest('#ensWhen button[data-v]'); if (w) { ST.ensWhen = w.dataset.v; renderEnsemble(); }
    var t = e.target.closest('#ensTie button[data-v]'); if (t) { ST.ensTie = +t.dataset.v; renderEnsemble(); }
  });
  function runEnsemble() {
    if (RUNS) return;
    var n = +$('#ensN').value, seed = Math.round(+$('#ensSeed').value) || 0;
    RUNS = TIES.map(function (tie) { return C.ensembleRunner(E, MAP, TABLE, { n: n, seed: seed, tie: tie }); });
    $('#ensRun').disabled = true;
    // Yield through a message channel, not setTimeout: timers are clamped or throttled in some panes
    // and background tabs. Each slice holds the thread for at most about 40 ms.
    var ch = typeof MessageChannel === 'function' ? new MessageChannel() : null;
    var later = ch ? function (f) { ch.port1.onmessage = function () { f(); }; ch.port2.postMessage(0); } : function (f) { setTimeout(f, 0); };
    var total = n * TIES.length;
    (function tick() {
      var t0 = performance.now();
      var r = RUNS.filter(function (x) { return !x.done(); })[0];
      while (r && performance.now() - t0 < 40) { r.step(1); if (r.done()) r = RUNS.filter(function (x) { return !x.done(); })[0]; }
      var k = RUNS.reduce(function (a, x) { return a + x.count(); }, 0);
      $('#ensBar').style.width = (100 * k / total) + '%';
      $('#ensTxt').textContent = k + ' of ' + total + ' runs';
      if (r) { later(tick); return; }
      if (ch) { ch.port1.close(); ch.port2.close(); }
      ENSR = {};
      RUNS.forEach(function (x) { var res = x.result(); res.draws = x.draws(); ENSR[x.tie] = res; });
      RUNS = null;
      $('#ensRun').disabled = false;
      renderEnsemble();
    })();
  }
  function spreadChart(title, ids, S) {
    var W = 520, H = 130, L = 118, Rm = 16, T = 28;
    var vals = []; ids.forEach(function (r) { vals.push(S[r].p5, S[r].p95); }); vals.push(1);
    vals = vals.filter(isFinite);
    var lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals), pad = (hi - lo) * 0.08 || 0.05; lo -= pad; hi += pad;
    var X = function (v) { return L + (Math.max(lo, Math.min(hi, v)) - lo) / (hi - lo) * (W - L - Rm); };
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(title) + '"><text class="lbl-strong" x="4" y="14">' + esc(title) + '</text>' + svgTag(W - 22, 4, 'G');
    niceTicks(lo, hi, 5).forEach(function (t) { s += '<line x1="' + X(t) + '" x2="' + X(t) + '" y1="' + T + '" y2="' + (H - 22) + '" stroke="var(--line)"/><text class="lbl" x="' + X(t) + '" y="' + (H - 8) + '" text-anchor="middle">' + fmt(t, 'ratio') + '</text>'; });
    s += '<line x1="' + X(1) + '" x2="' + X(1) + '" y1="' + (T - 4) + '" y2="' + (H - 22) + '" stroke="currentColor" stroke-dasharray="1 3"/><text class="lbl" x="' + (X(1) + 3) + '" y="' + (T - 2) + '">equal</text>';
    ids.forEach(function (r, i) {
      var y = T + 18 + i * 38, q = S[r];
      s += '<text class="lbl" x="' + (L - 8) + '" y="' + (y + 4) + '" text-anchor="end" style="fill:var(--ink)">' + esc(RLAB[r]) + '</text>' +
        '<line x1="' + X(q.p5) + '" x2="' + X(q.p95) + '" y1="' + y + '" y2="' + y + '" stroke="currentColor" stroke-width="1.3"/>' +
        '<line x1="' + X(q.p5) + '" x2="' + X(q.p5) + '" y1="' + (y - 6) + '" y2="' + (y + 6) + '" stroke="currentColor"/><line x1="' + X(q.p95) + '" x2="' + X(q.p95) + '" y1="' + (y - 6) + '" y2="' + (y + 6) + '" stroke="currentColor"/>' +
        '<rect x="' + X(q.p25) + '" y="' + (y - 9) + '" width="' + Math.max(1.5, X(q.p75) - X(q.p25)) + '" height="18" fill="var(--surface)" stroke="currentColor" stroke-width="1.6"' + (r.indexOf('wrong') === 0 ? ' stroke-dasharray="4 2.5"' : '') + '/>' +
        '<line x1="' + X(q.p50) + '" x2="' + X(q.p50) + '" y1="' + (y - 9) + '" y2="' + (y + 9) + '" stroke="currentColor" stroke-width="3"/>';
    });
    return '<div class="chartbox spread chart-scroll" data-tagged="G">' + s + '</svg></div>';
  }
  function scatter(title, kc, kw, w) {
    var W = 420, H = 300, L = 46, Rm = 12, T = 26, B = 40;
    var xs = ENS.draws.map(function (d) { return d[w].ratios[kc]; }), ys = ENS.draws.map(function (d) { return d[w].ratios[kw]; });
    var sx = xs.filter(isFinite).slice().sort(function (a, b) { return a - b; }), sy = ys.filter(isFinite).slice().sort(function (a, b) { return a - b; });
    var x0 = Math.min(E.percentile(sx, 0.5), 1), x1 = Math.max(E.percentile(sx, 99.5), 1), y0 = Math.min(E.percentile(sy, 0.5), 1), y1 = Math.max(E.percentile(sy, 99.5), 1);
    var px = (x1 - x0) * 0.06 || 0.02, py = (y1 - y0) * 0.06 || 0.02; x0 -= px; x1 += px; y0 -= py; y1 += py;
    var clipped = 0;
    var X = function (v) { return L + (v - x0) / (x1 - x0) * (W - L - Rm); }, Y = function (v) { return T + (y1 - v) / (y1 - y0) * (H - T - B); };
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(title) + '"><text class="lbl-strong" x="' + L + '" y="14">' + esc(title) + '</text>' + svgTag(W - 22, 4, 'G');
    niceTicks(x0, x1, 5).forEach(function (t) { s += '<line x1="' + X(t) + '" x2="' + X(t) + '" y1="' + T + '" y2="' + (H - B) + '" stroke="var(--line)"/><text class="lbl" x="' + X(t) + '" y="' + (H - B + 14) + '" text-anchor="middle">' + fmt(t, 'ratio') + '</text>'; });
    niceTicks(y0, y1, 5).forEach(function (t) { s += '<line x1="' + L + '" x2="' + (W - Rm) + '" y1="' + Y(t) + '" y2="' + Y(t) + '" stroke="var(--line)"/><text class="lbl" x="' + (L - 5) + '" y="' + (Y(t) + 3.5) + '" text-anchor="end">' + fmt(t, 'ratio') + '</text>'; });
    s += '<line x1="' + X(1) + '" x2="' + X(1) + '" y1="' + T + '" y2="' + (H - B) + '" stroke="currentColor" stroke-dasharray="1 3"/><line x1="' + L + '" x2="' + (W - Rm) + '" y1="' + Y(1) + '" y2="' + Y(1) + '" stroke="currentColor" stroke-dasharray="1 3"/>';
    var dots = '';
    for (var i = 0; i < xs.length; i++) {
      var a = xs[i], b = ys[i]; if (!isFinite(a) || !isFinite(b)) { clipped++; continue; }
      if (a < x0 || a > x1 || b < y0 || b > y1) clipped++;
      dots += '<circle cx="' + X(Math.max(x0, Math.min(x1, a))).toFixed(1) + '" cy="' + Y(Math.max(y0, Math.min(y1, b))).toFixed(1) + '" r="1.7"/>';
    }
    s += '<g fill="currentColor" opacity=".35">' + dots + '</g>';
    s += '<text class="lbl" x="' + ((L + W - Rm) / 2) + '" y="' + (H - 8) + '" text-anchor="middle">cost ratio (left of the dotted line: cheaper)</text>';
    s += '<text class="lbl" transform="translate(12 ' + ((T + H - B) / 2) + ') rotate(-90)" text-anchor="middle">wrong-rate ratio (below: fewer wrong)</text>';
    return '<div class="chartbox" data-tagged="G">' + s + '</svg>' + (clipped ? '<p class="small muted">' + clipped + ' runs lie beyond the edges and sit on the edge.</p>' : '') + '</div>';
  }
  function rankList(title, r, w) {
    var list = ENS.spearman[w][r].slice(0, 8);
    return '<div class="chartbox" data-tagged="G"><h4 style="margin-bottom:6px">' + esc(title) + ' ' + tagEl('G') + '</h4>' + list.map(function (e) {
      var row = ROWS[e.id], a = Math.abs(e.rho);
      return '<div class="rk" data-tip="' + esc('<b>' + esc(pname(e.id)) + '</b><br>' + esc(PMETA[e.id].meaning) + '<br><span class="muted">Name in the files: ' + e.id + '</span>') + '"><span class="rn">' + esc(pname(e.id)) + tagEl(row.tag) + '</span><span class="rb"><i class="' + (e.rho >= 0 ? 'p-solid' : 'p-hatch') + '" style="width:' + (100 * a).toFixed(1) + '%"></i></span><span class="rv">' + esc(fmt(e.rho, 'rho')) + '</span></div>';
    }).join('') + '</div>';
  }
  function tieTable(w) {
    var mid = function (S, k, kind) { var q = S[k]; return '<b>' + esc(fmt(q.p50, kind)) + '</b><br><small class="muted">' + esc(fmt(q.p5, kind)) + ' to ' + esc(fmt(q.p95, kind)) + '</small>'; };
    var rows = [['cost_vs_ladder', 'Cost against the ladder', 'ratio'], ['wrong_vs_ladder', 'Wrong rate against the ladder', 'ratio'], ['cost_vs_top', 'Cost against the strong model', 'ratio'], ['wrong_vs_top', 'Wrong rate against the strong model', 'ratio']];
    if (CM.funnelEnd) rows.push(['funnel_end', 'Funnel’s last number, of a hundred', 'funnel']);
    var h = '<div class="chart-scroll"><table class="ptable tiet" data-tagged="G"><tr><th>Middle run, and 5 to 95 in 100 ' + tagEl('G') + '</th>' + TIES.map(function (t) { return '<th>tie ' + t + '</th>'; }).join('') + '</tr>';
    rows.forEach(function (r) { h += '<tr><td>' + esc(r[1]) + '</td>' + TIES.map(function (t) { return '<td data-tie="' + t + '">' + mid(ENSR[t].spread[w], r[0], r[2]) + '</td>'; }).join('') + '</tr>'; });
    h += '<tr><td>Runs cheaper with a wrong rate no higher, against the ladder</td>' + TIES.map(function (t) { return '<td>' + esc(fmt(ENSR[t].shareBetterVs.cheap_ladder[w], 'pct')) + '</td>'; }).join('') + '</tr>';
    h += '<tr><td>The same, against the strong model</td>' + TIES.map(function (t) { return '<td>' + esc(fmt(ENSR[t].shareBetterVs.top_first[w], 'pct')) + '</td>'; }).join('') + '</tr></table></div>';
    return h;
  }
  function renderEnsemble() {
    var out = $('#ensOut');
    if (!ENSR) { out.innerHTML = '<p class="note">Press the button. The page stays usable while it runs.</p>'; return; }
    var w = ST.ensWhen;
    ENS = ENSR[ST.ensTie];
    var S = ENS.spread[w];
    var noise = 2 / Math.sqrt(ENS.n);
    var h = '<div class="row"><span class="small muted">Show the</span>' + seg('Period', [['first', 'first period'], ['last', 'last period']], w).replace('class="seg"', 'class="seg" id="ensWhen"') + '<span class="small muted" data-label="1">' + ENS.n + ' runs at each tie, seed ' + ENS.seed + '</span></div>';
    h += tieTable(w);
    h += '<div class="row"><span class="small muted">Details for</span>' + seg('Tie', TIES.map(function (t) { return [String(t), 'tie ' + t]; }), String(ST.ensTie)).replace('class="seg"', 'class="seg" id="ensTie"') + '</div>';
    h += '<p class="note" data-label="definition">Box: the middle half of the runs. Thick tick: the middle run. Whiskers: 5 and 95 in every hundred. Dashed box: wrong-rate ratio.</p>';
    h += '<div class="charts2 fit">' + spreadChart('Against the cheap model with the ladder', ['cost_vs_ladder', 'wrong_vs_ladder'], S) + spreadChart('Against the strong model directly', ['cost_vs_top', 'wrong_vs_top'], S) + '</div>';
    h += '<h3>Cost ratio against wrong-rate ratio, one dot per run</h3><div class="charts2">' + scatter('Against the cheap model with the ladder', 'cost_vs_ladder', 'wrong_vs_ladder', w) + scatter('Against the strong model directly', 'cost_vs_top', 'wrong_vs_top', w) + '</div>';
    h += '<h3>Which unknowns move each ratio most</h3><p class="note">' + esc(TX.sections.many.rank_read) + ' Values closer than about ' + num(noise, 'G', 'ratio') + ' are not well separated. Solid bar: rises with it. Hatched: falls.</p>';
    h += '<div class="ranks">' + rankList('Cost, against the ladder', 'cost_vs_ladder', w) + rankList('Wrong rate, against the ladder', 'wrong_vs_ladder', w) + rankList('Cost, against the strong model', 'cost_vs_top', w) + rankList('Wrong rate, against the strong model', 'wrong_vs_top', w) + '</div>';
    out.innerHTML = h;
  }

