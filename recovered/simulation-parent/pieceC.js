  // Everything reported for one parameter set: the three ways of working, the four ratios, the
  // funnels and the promoted-check measure, at the first and the last period.
  function measureSet(cm, values) {
    var path = pathCore(cm, values, { lean: true });
    function at(row) {
      return {
        period: row.period,
        stocks: Object.assign({}, row.stocks),
        library: { cost: row.library.cost, wrong: row.library.wrong },
        ratios: Object.assign({}, row.ratios),
        funnels: funnelsOf(cm, row.library),
        funnel_end: cm.funnelEnd ? row.library.measures[cm.funnelEnd] : null,
        promo: cm.promoMeasure ? row.library.measures[cm.promoMeasure] : null
      };
    }
    return {
      top_first: { cost: path.top_first.cost, wrong: path.top_first.wrong },
      cheap_ladder: { cost: path.cheap_ladder.cost, wrong: path.cheap_ladder.wrong },
      first: at(path.periods[0]),
      last: at(path.periods[path.periods.length - 1]),
      finalStocks: Object.assign({}, path.finalStocks)
    };
  }

  /**
   * Every reference setting the map declares (brief section 14, R18a), each with every measure the map
   * reports. Returns { id: { id, label, levels, params, adjusted, top_first, cheap_ladder, first, last,
   * finalStocks } } in the map's order.
   */
  function references(model, table) {
    var cm = compile(model);
    var out = {};
    cm.refSettings.forEach(function (r) {
      var prep = prepareParams(cm, settingParams(cm, table, r.levels));
      var res = measureSet(cm, prep.values);
      res.id = r.id;
      res.label = r.label;
      res.levels = Object.assign({}, r.levels);
      res.params = prep.values;
      res.adjusted = prep.adjusted;
      out[r.id] = res;
    });
    return out;
  }

  /**
   * The square the map declares (brief section 14, R18c): the x group across and the y group up, each at
   * steps levels from the poor end (0) to the good end (1), for each declared sheet; the fixed groups and
   * every other unknown at the middle value. opts: { sheets: [sheet ids] (default all) }.
   * Returns { x, y, steps, levels, period, ratios, sheets: [{ id, label, levels, cells }] } where
   * cells[i][j] is the cell at y level i and x level j: { x, y, ratios, library: { cost, wrong }, funnel_end, promo }.
   */
  function squareOf(model, table, opts) {
    var cm = compile(model);
    if (!cm.square) throw new Error('The map declares no square');
    var sq = cm.square;
    var o = opts || {};
    var steps = sq.steps;
    var levels = [];
    for (var k = 0; k < steps; k++) levels.push(k / (steps - 1));
    var sheets = (sq.sheets || []).filter(function (s) { return !o.sheets || o.sheets.indexOf(s.id) >= 0; }).map(function (s) {
      var cells = levels.map(function (ly) {
        return levels.map(function (lx) {
          var lv = Object.assign({}, sq.fixed || {}, s.levels || {});
          lv[sq.x] = lx;
          lv[sq.y] = ly;
          var prep = prepareParams(cm, settingParams(cm, table, lv));
          var path = pathCore(cm, prep.values, { lean: true });
          var row = pickRow(path, sq.period || 'last');
          return {
            x: lx, y: ly, ratios: Object.assign({}, row.ratios),
            library: { cost: row.library.cost, wrong: row.library.wrong },
            funnel_end: cm.funnelEnd ? row.library.measures[cm.funnelEnd] : null,
            promo: cm.promoMeasure ? row.library.measures[cm.promoMeasure] : null
          };
        });
      });
      return { id: s.id, label: s.label, levels: Object.assign({}, s.levels || {}), cells: cells };
    });
    return { x: sq.x, y: sq.y, steps: steps, levels: levels, period: sq.period || 'last', ratios: (sq.ratios || RATIO_IDS).slice(), sheets: sheets };
  }

  /**
   * The table of the shared groups (brief section 14, R20): for each base setting map.shared_table names
   * and each declared move (a list of shared groups, each moved to the ends it declares), the cost and the
   * wrong rate of the three ways of working at the table's period, and the four ratios.
   * Returns { period, rows: [{ base, moved, library, cheap_ladder, top_first, ratios }] }.
   */
  function sharedTableOf(model, table) {
    var cm = compile(model);
    if (!cm.sharedTable) throw new Error('The map declares no shared_table');
    var st = cm.sharedTable;
    var src = tableRows(table);
    var period = st.period || 'last';
    var rows = [];
    (st.bases || []).forEach(function (b) {
      var base = referenceParams(cm, table, b);
      (st.moves || [[]]).forEach(function (mv) {
        var p = Object.assign({}, base);
        mv.forEach(function (gid) {
          var g = cm.sharedGroups[cm.sharedIndex[gid]];
          Object.keys(g.moves).forEach(function (id) { p[id] = src[id][g.moves[id]]; });
        });
        var prep = prepareParams(cm, p);
        var path = pathCore(cm, prep.values, { lean: true });
        var row = pickRow(path, period);
        rows.push({
          base: b, moved: mv.slice(),
          library: { cost: row.library.cost, wrong: row.library.wrong },
          cheap_ladder: { cost: path.cheap_ladder.cost, wrong: path.cheap_ladder.wrong },
          top_first: { cost: path.top_first.cost, wrong: path.top_first.wrong },
          ratios: Object.assign({}, row.ratios)
        });
      });
    });
    return { period: period, rows: rows };
  }
