  // How much a move from state a to state b lowers each ratio (a - b, so a positive number means the
  // ratio was held up by what was moved) and raises the funnel's last number (b - a).
  function change(cm, a, b) {
    var holds = {};
    RATIO_IDS.forEach(function (r) { holds[r] = a.ratios[r] - b.ratios[r]; });
    holds.funnel_end = (b.funnel_end || 0) - (a.funnel_end || 0);
    return holds;
  }

  /**
   * The two weights (brief section 14, R19). The score S(x) of a setting x is the mean of the relative
   * fall, from the base setting (map.weight.base, 'middle'), in the library way's cost and in its wrong
   * rate, at the map's weight period. It equals the mean relative fall of the four ratios, because
   * library-side unknowns never move the other two ways. The full fall is S(full), where full is
   * map.weight.full ('all_good'). For a set X of library-side unknowns:
   *   alone(X) = S(base with X at their values in full) / S(full): what moving only this gives;
   *   last(X)  = (S(full) - S(full with X back at their base values)) / S(full): what is lost if only
   *              this stays where it is.
   * Both are shares of the full fall; alone can be below zero and last above one; they do not add up.
   * Reported for every limitation, every design step (the union of its limitations' unknowns, by
   * groupBy), each declared group, every library-side unknown alone, and the library-side unknowns no
   * limitation names. Steps are also moved one after another, each time the step whose addition gives
   * the largest score, as cumulative shares of the full fall, ending with the unnamed unknowns.
   * A row with no library-side unknown has alone and last zero, measured false and not_measured:
   * 'no_setting' (no unknown at all), 'gate_or_ladder' (only other-side unknowns, at least one in the
   * map's gate or ladder parameter group; in_shared_groups lists the shared groups that hold one) or
   * 'other_side_only'. same_set counts the other limitations with the same set of library-side unknowns.
   * limitations: an array of { id, title, main_step, params }, or an object holding one as "items".
   * opts: { period, groupBy (default map.weight.group_by or 'main_step'), stepLabels }.
   */
  function weights(model, table, limitations, opts) {
    var cm = compile(model);
    var o = opts || {};
    var wd = cm.weight || {};
    var period = o.period || wd.period || 'last';
    var groupBy = o.groupBy || wd.group_by || 'main_step';
    var baseId = wd.base || 'middle';
    var fullId = wd.full || 'all_good';
    var list = Array.isArray(limitations) ? limitations : (limitations && limitations.items) || [];
    var src = tableRows(table);
    var known = new Set(cm.paramIds);
    var mapGroup = {};
    cm.params.forEach(function (p) { mapGroup[p.id] = p.group; });
    var mid = referenceParams(cm, table, baseId);
    var fullP = referenceParams(cm, table, fullId);

    function measuresAt(raw) {
      var prep = prepareParams(cm, raw);
      var path = pathCore(cm, prep.values, { lean: true });
      var row = pickRow(path, period);
      return {
        ratios: Object.assign({}, row.ratios),
        library: { cost: row.library.cost, wrong: row.library.wrong },
        funnel_end: cm.funnelEnd ? row.library.measures[cm.funnelEnd] : null
      };
    }
    var base = measuresAt(mid);
    var full = measuresAt(fullP);
    function S(x) {
      return ((base.library.cost - x.library.cost) / base.library.cost + (base.library.wrong - x.library.wrong) / base.library.wrong) / 2;
    }
    var fullScore = S(full);
    function share(v) { return fullScore !== 0 && isFinite(fullScore) ? v / fullScore : null; }
    var memo = {};
    // kind 'alone': the base setting with ids at their full values; kind 'last': the full setting with ids at their base values
    function stateOf(kind, ids) {
      if (!ids.length) return kind === 'alone' ? base : full;
      var key = kind + ':' + ids.slice().sort().join(',');
      if (!hasOwn.call(memo, key)) {
        var p = Object.assign({}, kind === 'alone' ? mid : fullP);
        var from = kind === 'alone' ? fullP : mid;
        ids.forEach(function (id) { p[id] = from[id]; });
        memo[key] = measuresAt(p);
      }
      return memo[key];
    }
    function weigh(ids) {
      var a = stateOf('alone', ids), l = stateOf('last', ids);
      var sa = S(a), sl = fullScore - S(l);
      return {
        alone: share(sa), last: share(sl), alone_score: sa, last_score: sl,
        alone_change: change(cm, base, a), last_change: change(cm, l, full),
        alone_values: a, last_values: l
      };
    }
    function split(ids) {
      var moved = [], other = [], missing = [];
      ids.forEach(function (id) {
        if (!known.has(id)) { missing.push(id); return; }
        if (sideOf(src[id], id).side === 'library') { if (moved.indexOf(id) < 0) moved.push(id); }
        else if (other.indexOf(id) < 0) other.push(id);
      });
      return { moved: moved, other: other, missing: missing };
    }
    function reasonOf(params, sp) {
      if (sp.moved.length) return null;
      if (!params.length) return 'no_setting';
      if (sp.other.some(function (id) { return mapGroup[id] === 'gate' || mapGroup[id] === 'ladder'; })) return 'gate_or_ladder';
      return 'other_side_only';
    }
    function sharedOf(other) {
      return cm.sharedGroups.filter(function (g) { return other.some(function (id) { return hasOwn.call(g.moves, id); }); }).map(function (g) { return g.id; });
    }
    function row(extra, params, sp) {
      var w = weigh(sp.moved);
      var reason = reasonOf(params, sp);
      return Object.assign(extra, {
        moved: sp.moved, left_at_middle: sp.other, not_in_map: sp.missing,
        measured: reason === null, not_measured: reason, in_shared_groups: sharedOf(sp.other)
      }, w);
    }

    // every library-side unknown on its own (the finest grain of the same measure)
    var libIds = cm.paramIds.filter(function (id) { return !isRunSetting(cm, id, src[id]) && sideOf(src[id], id).side === 'library'; });
    var unknowns = libIds.map(function (id) {
      var w = weigh([id]);
      return { id: id, group: groupOf(cm, src[id], id), alone: w.alone, last: w.last, alone_change: w.alone_change, last_change: w.last_change };
    });
    var unknownById = {};
    unknowns.forEach(function (u) { unknownById[u.id] = u; });
    function byLast(a, b) {
      var x = a.last === null ? -Infinity : a.last, y = b.last === null ? -Infinity : b.last;
      return y - x || (b.alone || 0) - (a.alone || 0) || (String(a.id || a.step) < String(b.id || b.step) ? -1 : 1);
    }
    function partsOf(ids) { return ids.map(function (id) { return unknownById[id]; }).sort(byLast); }

    // limitations
    var limRows = list.map(function (l) {
      var params = l.params || [];
      var sp = split(params);
      var r = row({ id: l.id, title: l.title, step: l[groupBy], unknowns: params.slice() }, params, sp);
      r.parts = partsOf(sp.moved);
      return r;
    });
    var setKey = function (r) { return r.moved.slice().sort().join(','); };
    limRows.forEach(function (r) {
      if (!r.moved.length) { r.same_set = null; return; }
      var k = setKey(r);
      var ids = limRows.filter(function (x) { return x !== r && x.moved.length && setKey(x) === k; }).map(function (x) { return x.id; });
      r.same_set = { count: ids.length, ids: ids };
    });

    // design steps, all their limitations together
    var stepIds = [];
    list.forEach(function (l) { var s = l[groupBy]; if (s !== undefined && stepIds.indexOf(s) < 0) stepIds.push(s); });
    stepIds.sort(function (a, b) { return a < b ? -1 : a > b ? 1 : 0; });
    var steps = stepIds.map(function (s) {
      var lims = list.filter(function (l) { return l[groupBy] === s; });
      var ids = [];
      lims.forEach(function (l) { ids = ids.concat(l.params || []); });
      var sp = split(ids);
      return row({ step: s, label: o.stepLabels ? o.stepLabels[s] : undefined, limitations: lims.map(function (l) { return l.id; }) }, ids, sp);
    });

    // the declared groups of library-side unknowns
    var groups = cm.libGroups.map(function (g) {
      var ids = libIds.filter(function (id) { return groupOf(cm, src[id], id) === g.id; });
      return row({ id: g.id, label: g.label }, ids, split(ids));
    });

    // the library-side unknowns no limitation names
    var named = {};
    limRows.forEach(function (r) { r.moved.forEach(function (id) { named[id] = true; }); });
    var unnamedIds = libIds.filter(function (id) { return !named[id]; });
    var unnamed = row({ id: 'unnamed', ids: unnamedIds }, unnamedIds, split(unnamedIds));

    // steps moved one after another: each time the step whose addition gives the largest score
    var sequence = [];
    var current = [];
    var currentScore = 0;
    var left = steps.slice();
    while (left.length) {
      var bestK = -1, bestScore = 0, bestIds = null, bestRes = null;
      for (var k = 0; k < left.length; k++) {
        var ids = current.slice();
        left[k].moved.forEach(function (id) { if (ids.indexOf(id) < 0) ids.push(id); });
        var res = stateOf('alone', ids);
        var sc = S(res);
        if (bestK < 0 || sc > bestScore + 1e-15) { bestK = k; bestScore = sc; bestIds = ids; bestRes = res; }
      }
      var st = left.splice(bestK, 1)[0];
      sequence.push({ step: st.step, label: st.label, added: share(bestScore - currentScore), cumulative: share(bestScore), moved_so_far: bestIds.slice(), values: bestRes });
      current = bestIds;
      currentScore = bestScore;
    }
    var allIds = current.slice();
    unnamedIds.forEach(function (id) { if (allIds.indexOf(id) < 0) allIds.push(id); });
    var endRes = stateOf('alone', allIds);
    var sequenceEnd = { unnamed: true, ids: unnamedIds.slice(), added: share(S(endRes) - currentScore), cumulative: share(S(endRes)), values: endRes };

    return {
      period: period,
      base_setting: baseId,
      full_setting: fullId,
      base: base,
      full: { values: full, score: fullScore, cost_fall: (base.library.cost - full.library.cost) / base.library.cost, wrong_fall: (base.library.wrong - full.library.wrong) / base.library.wrong },
      unknowns: unknowns,
      groups: groups,
      steps: steps,
      limitations: limRows,
      unnamed: unnamed,
      ranking: {
        limitations: limRows.slice().sort(byLast).map(function (r) { return { id: r.id, alone: r.alone, last: r.last, measured: r.measured }; }),
        steps: steps.slice().sort(byLast).map(function (r) { return { step: r.step, alone: r.alone, last: r.last }; }),
        groups: groups.slice().sort(byLast).map(function (r) { return { id: r.id, alone: r.alone, last: r.last }; })
      },
      sequence: sequence,
      sequence_end: sequenceEnd,
      unnamed_share: share(fullScore - currentScore)
    };
  }
