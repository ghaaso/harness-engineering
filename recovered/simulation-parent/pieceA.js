  /**
   * The side of an unknown, read from its table row (brief section 13, R13):
   * { side: 'library' | 'other', good_end: 'high' | 'low' | null }.
   * A library-side row must say which end is good; an other-side row must not.
   */
  function sideOf(row, id) {
    var side = row && row.side;
    if (side !== 'library' && side !== 'other') throw new Error('The table row for ' + id + ' has no side (library or other)');
    if (side === 'library') {
      if (row.good_end !== 'high' && row.good_end !== 'low') throw new Error('The library-side row ' + id + ' has no good_end (high or low)');
      return { side: side, good_end: row.good_end };
    }
    if (row.good_end !== undefined && row.good_end !== null) throw new Error('The other-side row ' + id + ' must not carry a good_end');
    return { side: side, good_end: null };
  }

  /**
   * The group of an unknown (brief section 14, R18): the lib_group of a library-side row, which must be
   * one the map declares; null for an other-side row, which must carry none. Run settings have none.
   */
  function groupOf(model, row, id) {
    var cm = compile(model);
    var sd = sideOf(row, id);
    if (sd.side !== 'library') {
      if (row.lib_group !== undefined && row.lib_group !== null) throw new Error('The other-side row ' + id + ' must not carry a lib_group');
      return null;
    }
    if (!hasOwn.call(cm.libGroupIndex, row.lib_group)) throw new Error('The library-side row ' + id + ' has no lib_group the map declares (got ' + row.lib_group + ')');
    return row.lib_group;
  }

  // A level: 'poor', 'good', 'middle', or a number from 0 to 1 (a quantile counted from the poor end).
  function checkLevel(v, where) {
    if (v === 'poor' || v === 'good' || v === 'middle') return;
    if (typeof v === 'number' && v >= 0 && v <= 1) return;
    throw new Error((where || 'A level') + ' must be poor, good, middle or a number from 0 to 1 (got ' + v + ')');
  }

  // The value at position pos (0 = low, 1 = high) of a row's range.
  function atPosition(row, pos) {
    var lo = row.low, hi = row.high;
    if (lo === hi) return lo;
    if (row.dist === 'log') return Math.exp(Math.log(lo) + pos * (Math.log(hi) - Math.log(lo)));
    return lo + pos * (hi - lo);
  }

  // The good end (good true) or the poor end (good false) of a library-side row.
  function endValue(row, goodEnd, good) {
    var high = goodEnd === 'high' ? good : !good;
    return high ? row.high : row.low;
  }

  // The value of a library-side row at a level. The two ends are read exactly; a number in between is the
  // quantile counted from the poor end, as in the tied draws.
  function valueAtLevel(row, goodEnd, level) {
    if (level === 'middle') return row.best;
    var q = level === 'poor' ? 0 : level === 'good' ? 1 : level;
    if (q === 0) return endValue(row, goodEnd, false);
    if (q === 1) return endValue(row, goodEnd, true);
    return atPosition(row, goodEnd === 'high' ? q : 1 - q);
  }

  // The shared levels of one tied draw: one number from 0 to 1 per declared group. A single number
  // places every group at that level; an object must give every group.
  function resolveLevels(cm, levels) {
    var out = {};
    cm.libGroups.forEach(function (g) {
      var v = typeof levels === 'number' ? levels : levels && levels[g.id];
      if (!(typeof v === 'number' && v >= 0 && v <= 1)) throw new Error('A tie above 0 needs a shared level between 0 and 1 for every group (missing for ' + g.id + ')');
      out[g.id] = v;
    });
    return out;
  }

  // When drawParams gets no stream for the added parameters, each main stream gets one of its own,
  // made on first use from a fixed seed, so the main stream is never read for them.
  var ADDED_FALLBACK_SEED = 0x2545F491;
  var addedFallback = typeof WeakMap === 'function' ? new WeakMap() : null;
  function fallbackAdded(random) {
    if (!addedFallback) return rng(ADDED_FALLBACK_SEED);
    var s = addedFallback.get(random);
    if (!s) { s = rng(ADDED_FALLBACK_SEED); addedFallback.set(random, s); }
    return s;
  }

  /**
   * One random draw of every parameter from its range in the table. Run settings stay at their best value.
   * random: the main stream. One number is read per main-stream parameter, in map order, even when the
   * row is fixed. Parameters the map marks draw_stream "added" read opts.added instead (a stream of their
   * own; without it, a stream tied to random is made). So adding them leaves every earlier draw the same.
   * opts.tie (0 to 1) and opts.levels (brief section 14, R18b: the run's shared level per group, each from
   * 0 to 1; a single number gives every group that level): each library-side unknown is placed at the
   * quantile tie * U + (1 - tie) * V of its range, counted from its poor end, where U is its group's level
   * and V its own draw counted from that same end. Other unknowns are drawn on their own.
   * With tie 0 (the default) every value equals the untied draw, number for number.
   */
  function drawParams(model, table, random, opts) {
    var cm = compile(model);
    var src = tableRows(table);
    var o = opts || {};
    var tie = o.tie === undefined ? 0 : o.tie;
    if (!(tie >= 0 && tie <= 1)) throw new Error('tie must lie between 0 and 1 (got ' + tie + ')');
    var levels = tie > 0 ? resolveLevels(cm, o.levels) : null;
    var out = {};
    function place(id, u) {
      var row = src[id];
      if (isRunSetting(cm, id, row)) { out[id] = row.best; return; }
      var pos = u;
      if (tie > 0) {
        var g = groupOf(cm, row, id);
        if (g !== null) {
          var level = levels[g];
          // Own draw counted from the poor end: u when that end is low, 1 - u when it is high.
          // Position from the low end: tie * U + (1 - tie) * u when the good end is high;
          // 1 - (tie * U + (1 - tie) * (1 - u)) = tie * (1 - U) + (1 - tie) * u when it is low.
          pos = row.good_end === 'high' ? tie * level + (1 - tie) * u : tie * (1 - level) + (1 - tie) * u;
        }
      }
      out[id] = atPosition(row, pos);
    }
    cm.mainIds.forEach(function (id) {
      if (!src[id]) throw new Error('The table has no row for ' + id);
      place(id, random()); // drawn even when unused, so the stream does not depend on which rows are fixed
    });
    if (cm.addedIds.length) {
      var added = o.added || fallbackAdded(random);
      cm.addedIds.forEach(function (id) {
        if (!src[id]) throw new Error('The table has no row for ' + id);
        place(id, added());
      });
    }
    return out;
  }

  /**
   * A parameter set at given group levels (brief section 14, R18a): levels is { group id: level } with
   * level 'poor', 'good', 'middle' or a number from 0 to 1. Library-side unknowns of a named group sit at
   * that level; those of a group not named, every other-side unknown and every run setting sit at their
   * best (middle) value.
   */
  function settingParams(model, table, levels) {
    var cm = compile(model);
    var src = tableRows(table);
    var lv = levels || {};
    Object.keys(lv).forEach(function (g) {
      if (!hasOwn.call(cm.libGroupIndex, g)) throw new Error('Unknown lib_group ' + g);
      checkLevel(lv[g], 'The level of ' + g);
    });
    var out = {};
    cm.paramIds.forEach(function (id) {
      var row = src[id];
      if (!row) throw new Error('The table has no row for ' + id);
      if (isRunSetting(cm, id, row)) { out[id] = row.best; return; }
      var g = groupOf(cm, row, id);
      out[id] = g === null || lv[g] === undefined ? row.best : valueAtLevel(row, row.good_end, lv[g]);
    });
    return out;
  }

  /**
   * One of the reference settings the map declares (map.reference_settings, brief section 14, R18a), by id.
   * Nothing is computed for a setting the map does not declare.
   */
  function referenceParams(model, table, which) {
    var cm = compile(model);
    if (!hasOwn.call(cm.refIndex, which)) throw new Error('The map declares no reference setting ' + which + '; it declares ' + cm.refSettings.map(function (r) { return r.id; }).join(', '));
    return settingParams(cm, table, cm.refSettings[cm.refIndex[which]].levels);
  }

