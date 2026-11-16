  // The stream of shared levels for tied draws. It is separate from the stream of own draws,
  // so the own draws are the same at every tie, and tie 0 reproduces the untied ensemble.
  function sharedSeed(seed) { return Math.imul((seed >>> 0) ^ 0x9E3779B9, 0x85EBCA6B) >>> 0; }
  // The stream of the parameters the map marks draw_stream "added" (brief section 14, R21).
  function addedSeed(seed) { return Math.imul((seed >>> 0) ^ 0x7F4A7C15, 0xC2B2AE35) >>> 0; }

  /**
   * The three streams of an ensemble with this seed: { random (own draws), shared (the shared levels),
   * added (the parameters marked draw_stream "added") }. A page that runs the ensemble in steps uses
   * these with drawRun() to draw exactly as ensemble() does.
   */
  function ensembleStreams(seed) {
    var s = seed === undefined ? 1 : seed;
    return { random: rng(s), shared: rng(sharedSeed(s)), added: rng(addedSeed(s)) };
  }

  /**
   * The draw of one run of the ensemble (brief section 14, R18b): four shared levels, one per declared
   * group, read from the shared stream in the order of map.lib_groups (always read, whatever the tie);
   * then every parameter. Returns { levels, raw }.
   */
  function drawRun(model, table, streams, tie) {
    var cm = compile(model);
    var levels = {};
    cm.libGroups.forEach(function (g) { levels[g.id] = streams.shared(); });
    var t = tie === undefined ? 0 : tie;
    var raw = drawParams(cm, table, streams.random, { tie: t, levels: t > 0 ? levels : undefined, added: streams.added });
    return { levels: levels, raw: raw };
  }

  /**
   * The ensemble of section 9.5, with tied draws (brief section 14, R18b: one shared level per group).
   * opts: { n (default 1000), seed (default 1), tie (default 0), percentiles (default 5,25,50,75,95), keepDraws }.
   * Besides the four ratios and the six levels, the series hold the funnel's last number (funnel_end) and,
   * when the map declares one, the promoted-check measure (promo).
   */
  function ensemble(model, table, opts) {
    var cm = compile(model);
    var o = opts || {};
    var n = o.n || 1000;
    var seed = o.seed === undefined ? 1 : o.seed;
    var tie = o.tie === undefined ? 0 : o.tie;
    var pcts = o.percentiles || [5, 25, 50, 75, 95];
    var streams = ensembleStreams(seed);
    var at = ['first', 'last'];
    var series = { first: {}, last: {} };
    var levelIds = ['library_cost', 'library_wrong', 'top_cost', 'top_wrong', 'ladder_cost', 'ladder_wrong'];
    if (cm.funnelEnd) levelIds.push('funnel_end');
    if (cm.promoMeasure) levelIds.push('promo');
    at.forEach(function (w) {
      RATIO_IDS.concat(levelIds).forEach(function (r) { series[w][r] = []; });
    });
    var better = { first: 0, last: 0 };
    var betterLadder = { first: 0, last: 0 };
    var drawn = {};
    cm.paramIds.forEach(function (id) { drawn[id] = []; });
    var adjustedDraws = 0;
    var draws = o.keepDraws ? [] : null;
    for (var d = 0; d < n; d++) {
      var run = drawRun(cm, table, streams, tie);
      var prep = prepareParams(cm, run.raw);
      if (prep.adjusted.length) adjustedDraws++;
      var path = pathCore(cm, prep.values, { lean: true });
      var rowsAt = { first: path.periods[0], last: path.periods[path.periods.length - 1] };
      at.forEach(function (w) {
        var row = rowsAt[w];
        RATIO_IDS.forEach(function (r) { series[w][r].push(row.ratios[r]); });
        series[w].library_cost.push(row.library.cost);
        series[w].library_wrong.push(row.library.wrong);
        series[w].top_cost.push(path.top_first.cost);
        series[w].top_wrong.push(path.top_first.wrong);
        series[w].ladder_cost.push(path.cheap_ladder.cost);
        series[w].ladder_wrong.push(path.cheap_ladder.wrong);
        if (cm.funnelEnd) series[w].funnel_end.push(row.library.measures[cm.funnelEnd]);
        if (cm.promoMeasure) series[w].promo.push(row.library.measures[cm.promoMeasure]);
        if (row.library.cost < path.top_first.cost && row.library.wrong <= path.top_first.wrong) better[w]++;
        if (row.library.cost < path.cheap_ladder.cost && row.library.wrong <= path.cheap_ladder.wrong) betterLadder[w]++;
      });
      cm.paramIds.forEach(function (id) { drawn[id].push(prep.values[id]); });
      if (draws) draws.push({ params: prep.values, raw: run.raw, levels: run.levels, first: rowsAt.first.ratios, last: rowsAt.last.ratios });
    }
    var spread = { first: {}, last: {} };
    var rank = { first: {}, last: {} };
    at.forEach(function (w) {
      Object.keys(series[w]).forEach(function (r) {
        var sorted = series[w][r].slice().sort(function (a, b) { return a - b; });
        var row = {};
        pcts.forEach(function (p) { row['p' + p] = percentile(sorted, p); });
        var finite = sorted.filter(isFinite);
        row.mean = finite.length ? finite.reduce(function (a, b) { return a + b; }, 0) / finite.length : NaN;
        spread[w][r] = row;
      });
      RATIO_IDS.forEach(function (r) {
        var list = cm.paramIds.map(function (id) {
          return { id: id, rho: spearman(drawn[id], series[w][r]) };
        }).filter(function (e) { return e.rho !== null; });
        list.sort(function (a, b) { return Math.abs(b.rho) - Math.abs(a.rho) || (a.id < b.id ? -1 : 1); });
        rank[w][r] = list;
      });
    });
    return {
      n: n,
      seed: seed,
      tie: tie,
      spread: spread,
      // share of draws where the library is cheaper with a wrong rate no higher
      shareBetter: { first: better.first / n, last: better.last / n },
      shareBetterVs: {
        top_first: { first: better.first / n, last: better.last / n },
        cheap_ladder: { first: betterLadder.first / n, last: betterLadder.last / n }
      },
      spearman: rank,
      adjustedDraws: adjustedDraws,
      draws: draws
    };
  }
