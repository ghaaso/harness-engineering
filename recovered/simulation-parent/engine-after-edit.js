/*
 * Pathway engine for the reasoning-library map.
 *
 * Reads the declarative description in map.json and computes, for a parameter
 * set and a policy: outcome chances, expected cost (total and by tier), calls,
 * every route with its chance and cost, the time path of the two stocks of
 * entries, the headline ratios, the ensemble (with tied draws), the
 * one-at-a-time swings, the three reference settings, the funnel and the
 * weight of each limitation (map revision 3, model-brief.md section 13).
 *
 * Pure functions, no dependencies. In node: require('./engine.js').
 * Inlined in a page: a global named PathwayEngine.
 *
 * Parameter kinds: chance and fraction lie in [0, 1]; scale is above zero; the
 * rest must not be negative. A measure is the flow into listed states
 * (flow_into) or along listed branches (flow_on). Each listed item may carry a
 * "times" expression that multiplies its flow. A measure may count only the
 * classes that match "where", may be divided by the chance of the classes that
 * match "per", and may be multiplied by "scale". Stock updates may use measures.
 *
 * The parameter table gives each unknown a side: "library" when it exists only
 * because of the library, else "other". A library-side unknown also has a
 * good_end, "high" or "low": the end of its range at which the mechanism works
 * as intended. Tied draws, the reference settings and the weights read these.
 *
 * Expressions in map.json are parsed by a small parser in this file. They may
 * use numbers, + - * / and brackets, the functions exp, min, max and safediv,
 * and only the names the map declares. Nothing is passed to eval.
 */
/* global module */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module && module.exports) module.exports = api;
  else if (root) root.PathwayEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // ---------------------------------------------------------------- expressions

  var FUNCS = {
    exp: { min: 1, max: 1, f: Math.exp },
    min: { min: 2, max: 8, f: Math.min },
    max: { min: 2, max: 8, f: Math.max },
    safediv: { min: 2, max: 2, f: function (a, b) { return b === 0 ? 0 : a / b; } }
  };
  var hasOwn = Object.prototype.hasOwnProperty;

  function tokenize(src) {
    var toks = [];
    var i = 0;
    while (i < src.length) {
      var c = src[i];
      if (c === ' ' || c === '\t' || c === '\n' || c === '\r') { i++; continue; }
      var rest = src.slice(i);
      var m;
      if ((m = /^(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/.exec(rest))) {
        toks.push({ t: 'num', v: parseFloat(m[0]) }); i += m[0].length; continue;
      }
      if ((m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(rest))) {
        toks.push({ t: 'id', v: m[0] }); i += m[0].length; continue;
      }
      if ('+-*/(),'.indexOf(c) >= 0) { toks.push({ t: c }); i++; continue; }
      throw new Error('Unexpected character "' + c + '" in expression: ' + src);
    }
    toks.push({ t: 'end' });
    return toks;
  }

  /**
   * Compile an expression string against a whitelist of names.
   * Returns { src, fn(scope) -> number, ids: array of names used }.
   */
  function compileExpr(src, allowed) {
    if (typeof src === 'number') src = String(src);
    if (typeof src !== 'string' || src.trim() === '') throw new Error('Expression must be a non-empty string');
    var toks = tokenize(src);
    var p = 0;
    var ids = {};
    function peek() { return toks[p]; }
    function next() { return toks[p++]; }
    function expect(t) {
      if (toks[p].t !== t) throw new Error('Expected "' + t + '" in expression: ' + src);
      p++;
    }
    // Each operator node gets its own closure over its own two operands.
    function binary(op, a, b) {
      if (op === '+') return function (s) { return a(s) + b(s); };
      if (op === '-') return function (s) { return a(s) - b(s); };
      if (op === '*') return function (s) { return a(s) * b(s); };
      return function (s) { return a(s) / b(s); };
    }
    function expr() {
      var left = term();
      while (peek().t === '+' || peek().t === '-') {
        var op = next().t;
        left = binary(op, left, term());
      }
      return left;
    }
    function term() {
      var left = unary();
      while (peek().t === '*' || peek().t === '/') {
        var op = next().t;
        left = binary(op, left, unary());
      }
      return left;
    }
    function unary() {
      if (peek().t === '-') { next(); var a = unary(); return function (s) { return -a(s); }; }
      if (peek().t === '+') { next(); return unary(); }
      return primary();
    }
    function primary() {
      var tk = next();
      if (tk.t === 'num') { var v = tk.v; return function () { return v; }; }
      if (tk.t === '(') { var inner = expr(); expect(')'); return inner; }
      if (tk.t === 'id') {
        var name = tk.v;
        if (peek().t === '(') {
          if (!hasOwn.call(FUNCS, name)) throw new Error('Unknown function "' + name + '" in expression: ' + src);
          var def = FUNCS[name];
          next();
          var args = [];
          if (peek().t !== ')') {
            args.push(expr());
            while (peek().t === ',') { next(); args.push(expr()); }
          }
          expect(')');
          if (args.length < def.min || args.length > def.max) throw new Error('Wrong number of arguments to ' + name + ' in expression: ' + src);
          var f = def.f;
          if (args.length === 1) { var a1 = args[0]; return function (s) { return f(a1(s)); }; }
          if (args.length === 2) { var x = args[0], y = args[1]; return function (s) { return f(x(s), y(s)); }; }
          return function (s) { return f.apply(null, args.map(function (g) { return g(s); })); };
        }
        if (!allowed.has(name)) throw new Error('Unknown name "' + name + '" in expression: ' + src);
        ids[name] = true;
        return function (s) {
          var val = s[name];
          if (typeof val !== 'number') throw new Error('No value for "' + name + '" while evaluating: ' + src);
          return val;
        };
      }
      throw new Error('Unexpected token in expression: ' + src);
    }
    var fn = expr();
    expect('end');
    return { src: src, fn: fn, ids: Object.keys(ids) };
  }

  // ---------------------------------------------------------------- compile the map

  var cache = typeof WeakMap === 'function' ? new WeakMap() : null;

  function compile(map) {
    if (map && map.__compiled) return map;
    if (cache && cache.has(map)) return cache.get(map);
    var cm = buildModel(map);
    if (cache) cache.set(map, cm);
    return cm;
  }

  function setOf() {
    var s = new Set();
    for (var i = 0; i < arguments.length; i++) arguments[i].forEach(function (x) { s.add(x); });
    return s;
  }

  function buildModel(map) {
    if (!map || !Array.isArray(map.parameters) || !Array.isArray(map.states) || !Array.isArray(map.branches)) {
      throw new Error('The map needs parameters, states and branches');
    }
    var params = map.parameters;
    var paramIds = params.map(function (p) { return p.id; });
    var P = new Set(paramIds);
    if (P.size !== paramIds.length) throw new Error('Duplicate parameter id');

    var stockIds = Object.keys(map.stocks.initial);
    var S = new Set(stockIds);

    // stock values (wrong_share, fill, distract)
    var svAllowed = setOf(P, S);
    var stockValues = map.stocks.values.map(function (v) {
      var c = compileExpr(v.expr, svAllowed);
      svAllowed.add(v.id);
      return { id: v.id, label: v.label, fn: c.fn, ids: c.ids, src: v.expr };
    });
    var svIds = stockValues.map(function (v) { return v.id; });

    // attribute flags
    var flagNames = new Set();
    map.attributes.forEach(function (a) {
      var keys = null;
      a.values.forEach(function (v) {
        var k = Object.keys(v.flags).sort().join(',');
        if (keys === null) keys = k;
        else if (keys !== k) throw new Error('Values of attribute ' + a.id + ' must set the same flags');
        Object.keys(v.flags).forEach(function (f) { flagNames.add(f); });
      });
    });
    var policyFlagNames = new Set();
    map.policies.forEach(function (pol) { Object.keys(pol.flags).forEach(function (f) { policyFlagNames.add(f); }); });
    map.policies.forEach(function (pol) {
      policyFlagNames.forEach(function (f) {
        if (!hasOwn.call(pol.flags, f)) throw new Error('Policy ' + pol.id + ' does not set flag ' + f);
      });
    });

    var classAllowed = setOf(P, S, new Set(svIds), flagNames, policyFlagNames);
    var derived = map.derived.map(function (d) {
      if (classAllowed.has(d.id)) throw new Error('Derived value ' + d.id + ' shadows another name');
      var c = compileExpr(d.expr, classAllowed);
      classAllowed.add(d.id);
      return { id: d.id, label: d.label, fn: c.fn, ids: c.ids, src: d.expr };
    });

    var attributes = map.attributes.map(function (a) {
      return {
        id: a.id,
        label: a.label,
        values: a.values.map(function (v) {
          var c = compileExpr(v.chance, classAllowed);
          return { id: v.id, label: v.label, flags: v.flags, fn: c.fn, ids: c.ids, src: v.chance };
        })
      };
    });

    // tiers
    var tiers = map.tiers.map(function (t) { return t.id; });
    var tierIndex = {};
    tiers.forEach(function (t, i) { tierIndex[t] = i; });

    // states
    var stateIndex = {};
    var states = map.states.map(function (s, i) {
      if (hasOwn.call(stateIndex, s.id)) throw new Error('Duplicate state ' + s.id);
      stateIndex[s.id] = i;
      return { id: s.id, label: s.label, step: s.step, entry: s.entry, outcome: !!s.outcome };
    });
    var outcomes = map.outcomes.map(function (o) {
      if (!hasOwn.call(stateIndex, o.id) || !states[stateIndex[o.id]].outcome) throw new Error('Outcome ' + o.id + ' is not an outcome state');
      return { id: o.id, label: o.label, right: !!o.right, index: stateIndex[o.id] };
    });
    states.forEach(function (s) {
      if (s.outcome && !outcomes.some(function (o) { return o.id === s.id; })) throw new Error('Outcome state ' + s.id + ' is not listed in outcomes');
    });

    // branches
    var branchIndex = {};
    var out = states.map(function () { return []; });
    var branches = map.branches.map(function (b, i) {
      if (hasOwn.call(branchIndex, b.id)) throw new Error('Duplicate branch ' + b.id);
      branchIndex[b.id] = i;
      if (!hasOwn.call(stateIndex, b.from)) throw new Error('Branch ' + b.id + ' starts at unknown state ' + b.from);
      if (!hasOwn.call(stateIndex, b.to)) throw new Error('Branch ' + b.id + ' ends at unknown state ' + b.to);
      if (states[stateIndex[b.from]].outcome) throw new Error('Branch ' + b.id + ' leaves an outcome');
      var tier = b.tier === null || b.tier === undefined ? -1 : tierIndex[b.tier];
      if (tier === undefined) throw new Error('Branch ' + b.id + ' has unknown tier ' + b.tier);
      var ch = compileExpr(b.chance, classAllowed);
      var co = compileExpr(b.cost, classAllowed);
      var ca = compileExpr(b.calls, classAllowed);
      if (tier === -1 && (b.cost !== '0' || b.calls !== '0')) throw new Error('Branch ' + b.id + ' has a cost but no tier');
      out[stateIndex[b.from]].push(i);
      return {
        id: b.id, from: stateIndex[b.from], to: stateIndex[b.to], label: b.label, tier: tier,
        chance: ch, cost: co, calls: ca, limitations: Array.isArray(b.limitations) ? b.limitations.slice() : []
      };
    });
    states.forEach(function (s, i) {
      if (!s.outcome && out[i].length === 0) throw new Error('State ' + s.id + ' has no way out');
    });

    // order: reverse post-order of a depth-first walk; topological when there is no cycle
    var mark = new Array(states.length).fill(0);
    var post = [];
    var hasCycle = false;
    function visit(i) {
      if (mark[i] === 2) return;
      if (mark[i] === 1) { hasCycle = true; return; }
      mark[i] = 1;
      out[i].forEach(function (b) { visit(branches[b].to); });
      mark[i] = 2;
      post.push(i);
    }
    states.forEach(function (_, i) { visit(i); });
    var order = post.reverse();

    // class filters ("where" and "per" of a measure): { attribute id: [value ids] }
    var attrIds = {};
    map.attributes.forEach(function (a) { attrIds[a.id] = a.values.map(function (v) { return v.id; }); });
    function compileFilter(f, mid) {
      if (f === undefined || f === null) return null;
      return Object.keys(f).map(function (aid) {
        if (!hasOwn.call(attrIds, aid)) throw new Error('Measure ' + mid + ' filters on unknown attribute ' + aid);
        var vals = Array.isArray(f[aid]) ? f[aid] : [f[aid]];
        vals.forEach(function (v) {
          if (attrIds[aid].indexOf(v) < 0) throw new Error('Measure ' + mid + ' filters on unknown value ' + aid + '=' + v);
        });
        return { attr: aid, values: vals.slice() };
      });
    }

    // measures
    // A measure is the flow into a list of states (flow_into) or along a list of branches (flow_on).
    // Each item is an id, or { state | branch, times } where times multiplies that item's flow.
    var measures = map.measures.map(function (m) {
      var terms = [];
      (m.flow_into || []).forEach(function (t) {
        var sid = typeof t === 'string' ? t : t && t.state;
        if (!hasOwn.call(stateIndex, sid)) throw new Error('Measure ' + m.id + ' names unknown state ' + sid);
        terms.push({ into: true, index: stateIndex[sid], times: typeof t === 'object' && t.times !== undefined ? compileExpr(t.times, classAllowed) : null });
      });
      (m.flow_on || []).forEach(function (t) {
        var bid = typeof t === 'string' ? t : t && t.branch;
        if (!hasOwn.call(branchIndex, bid)) throw new Error('Measure ' + m.id + ' names unknown branch ' + bid);
        terms.push({ into: false, index: branchIndex[bid], times: typeof t === 'object' && t.times !== undefined ? compileExpr(t.times, classAllowed) : null });
      });
      if (terms.length === 0) throw new Error('Measure ' + m.id + ' names no state and no branch');
      var scale = m.scale === undefined ? 1 : m.scale;
      if (typeof scale !== 'number' || !(scale > 0)) throw new Error('Measure ' + m.id + ' has a bad scale');
      return {
        id: m.id, label: m.label, unit: m.unit, terms: terms,
        where: compileFilter(m.where, m.id), per: compileFilter(m.per, m.id), scale: scale
      };
    });
    var measureIndex = {};
    measures.forEach(function (m, i) {
      if (hasOwn.call(measureIndex, m.id)) throw new Error('Duplicate measure ' + m.id);
      measureIndex[m.id] = i;
    });

    // funnels: ordered lists of measures (brief section 13, R16)
    var funnels = (map.funnels || []).map(function (f) {
      if (!Array.isArray(f.stages) || f.stages.length === 0) throw new Error('Funnel ' + f.id + ' has no stages');
      f.stages.forEach(function (sid) { if (!hasOwn.call(measureIndex, sid)) throw new Error('Funnel ' + f.id + ' names unknown measure ' + sid); });
      return { id: f.id, label: f.label, stages: f.stages.slice(), monotone: f.monotone === undefined ? f.stages.slice() : f.monotone.slice() };
    });
    var funnelEnd = map.funnel_end || null;
    if (funnelEnd && !hasOwn.call(measureIndex, funnelEnd)) throw new Error('funnel_end names unknown measure ' + funnelEnd);

    var updAllowed = setOf(P, S, new Set(svIds), new Set(measures.map(function (m) { return m.id; })));
    var updates = map.stocks.update.map(function (u) {
      if (!S.has(u.id)) throw new Error('Update for unknown stock ' + u.id);
      var c = compileExpr(u.expr, updAllowed);
      return { id: u.id, fn: c.fn, ids: c.ids, src: u.expr };
    });

    // policies and their classes
    var attrById = {};
    attributes.forEach(function (a) { attrById[a.id] = a; });
    var policies = map.policies.map(function (pol) {
      if (!hasOwn.call(stateIndex, pol.start)) throw new Error('Policy ' + pol.id + ' starts at unknown state');
      var fixed = pol.fixed || {};
      Object.keys(fixed).forEach(function (aid) {
        if (!attrById[aid] || !attrById[aid].values.some(function (v) { return v.id === fixed[aid]; })) {
          throw new Error('Policy ' + pol.id + ' fixes an unknown attribute value ' + aid + '=' + fixed[aid]);
        }
      });
      var combos = [{ values: {}, flags: {}, fns: [] }];
      attributes.forEach(function (a) {
        var choices = hasOwn.call(fixed, a.id)
          ? a.values.filter(function (v) { return v.id === fixed[a.id]; }).map(function (v) { return { v: v, fixedHere: true }; })
          : a.values.map(function (v) { return { v: v, fixedHere: false }; });
        var nextCombos = [];
        combos.forEach(function (c) {
          choices.forEach(function (ch) {
            var values = Object.assign({}, c.values); values[a.id] = ch.v.id;
            var flags = Object.assign({}, c.flags, ch.v.flags);
            var fns = ch.fixedHere ? c.fns : c.fns.concat([ch.v.fn]);
            nextCombos.push({ values: values, flags: flags, fns: fns });
          });
        });
        combos = nextCombos;
      });
      combos.forEach(function (c) {
        c.id = attributes.map(function (a) { return c.values[a.id]; }).join('/');
      });
      return { id: pol.id, label: pol.label, start: stateIndex[pol.start], flags: pol.flags, fixed: fixed, combos: combos };
    });
    var policyIndex = {};
    policies.forEach(function (pol, i) { policyIndex[pol.id] = i; });

    var constraints = (map.constraints || []).map(function (c) {
      if (c.kind !== 'sum_at_most') throw new Error('Unknown constraint kind ' + c.kind);
      c.ids.forEach(function (id) { if (!P.has(id)) throw new Error('Constraint names unknown parameter ' + id); });
      return { id: c.id, ids: c.ids.slice(), limit: c.limit };
    });

    return {
      __compiled: true,
      map: map,
      params: params,
      paramIds: paramIds,
      stockIds: stockIds,
      stockValues: stockValues,
      derived: derived,
      attributes: attributes,
      tiers: tiers,
      states: states,
      stateIndex: stateIndex,
      outcomes: outcomes,
      branches: branches,
      branchIndex: branchIndex,
      out: out,
      order: order,
      hasCycle: hasCycle,
      measures: measures,
      measureIndex: measureIndex,
      funnels: funnels,
      funnelEnd: funnelEnd,
      weight: map.weight || null,
      updates: updates,
      policies: policies,
      policyIndex: policyIndex,
      constraints: constraints
    };
  }

  // ---------------------------------------------------------------- parameters

  /**
   * Check and tidy a parameter set. Chances and fractions must lie in [0, 1]; costs, calls and
   * multipliers must not be negative; scales must be positive. Groups bound by a
   * sum_at_most constraint are scaled down in proportion when they break it.
   * Returns { values, adjusted: [notes] }.
   */
  function prepareParams(model, params) {
    var cm = compile(model);
    var values = {};
    var missing = [];
    cm.params.forEach(function (p) {
      var v = params ? params[p.id] : undefined;
      if (typeof v !== 'number' || !isFinite(v)) { missing.push(p.id); return; }
      if (p.integer) v = Math.round(v);
      if ((p.kind === 'chance' || p.kind === 'fraction') && (v < 0 || v > 1)) throw new Error(p.id + ' is a ' + p.kind + ' and must lie between 0 and 1 (got ' + v + ')');
      if (p.kind === 'scale' && !(v > 0)) throw new Error(p.id + ' must be above zero (got ' + v + ')');
      if (v < 0) throw new Error(p.id + ' must not be negative (got ' + v + ')');
      values[p.id] = v;
    });
    if (missing.length) throw new Error('Missing or non-numeric parameter values: ' + missing.join(', '));
    var adjusted = [];
    cm.constraints.forEach(function (c) {
      var sum = 0;
      c.ids.forEach(function (id) { sum += values[id]; });
      if (sum > c.limit) {
        var k = c.limit / sum;
        c.ids.forEach(function (id) { values[id] *= k; });
        adjusted.push(c.id);
      }
    });
    return { values: values, adjusted: adjusted };
  }

  /**
   * The rows of a parameter table, keyed by parameter id. A table may hold its rows
   * as an object keyed by id ({ parameters: { id: row } }) or as a list of rows that
   * each carry an id ({ parameters: [ { id, low, best, high } ] }).
   */
  function tableRows(table) {
    var src = table && table.parameters ? table.parameters : table;
    if (!Array.isArray(src)) return src;
    var rows = {};
    src.forEach(function (row) {
      if (!row || typeof row.id !== 'string') throw new Error('A row of the parameter table has no id');
      if (hasOwn.call(rows, row.id)) throw new Error('The parameter table has two rows for ' + row.id);
      rows[row.id] = row;
    });
    return rows;
  }

  /** Read one column (best, low or high) of a parameter table into a plain parameter set. */
  function paramsFromTable(table, which) {
    var col = which || 'best';
    var src = tableRows(table);
    var out = {};
    Object.keys(src).forEach(function (id) {
      var row = src[id];
      if (row && typeof row === 'object' && typeof row[col] === 'number') out[id] = row[col];
    });
    return out;
  }

  // ---------------------------------------------------------------- evaluation core

  function stockScope(cm, values, stocks) {
    var s = Object.assign({}, values);
    cm.stockIds.forEach(function (id) { s[id] = stocks && typeof stocks[id] === 'number' ? stocks[id] : 0; });
    cm.stockValues.forEach(function (v) { s[v.id] = v.fn(s); });
    return s;
  }

  function classScope(cm, base, policy, combo) {
    var s = Object.assign({}, base, policy.flags, combo.flags);
    for (var i = 0; i < cm.derived.length; i++) s[cm.derived[i].id] = cm.derived[i].fn(s);
    var chance = 1;
    for (var j = 0; j < combo.fns.length; j++) chance *= combo.fns[j](s);
    return { scope: s, chance: chance };
  }

  function branchValues(cm, scope) {
    var n = cm.branches.length;
    var c = new Float64Array(n), k = new Float64Array(n), q = new Float64Array(n);
    for (var i = 0; i < n; i++) {
      var b = cm.branches[i];
      c[i] = b.chance.fn(scope);
      k[i] = b.cost.fn(scope);
      q[i] = b.calls.fn(scope);
    }
    return { c: c, k: k, q: q };
  }

  // Push one unit of probability from the start state to the outcomes.
  function propagate(cm, start, bv) {
    var S = cm.states.length, T = cm.tiers.length;
    var mass = new Float64Array(S), through = new Float64Array(S);
    var bflow = new Float64Array(cm.branches.length);
    var costT = new Float64Array(T), callsT = new Float64Array(T);
    mass[start] = 1; through[start] = 1;
    var passes = 0;
    for (;;) {
      for (var oi = 0; oi < cm.order.length; oi++) {
        var s = cm.order[oi];
        var m = mass[s];
        if (m === 0 || cm.states[s].outcome) continue;
        mass[s] = 0;
        var outs = cm.out[s];
        for (var j = 0; j < outs.length; j++) {
          var b = outs[j];
          var f = m * bv.c[b];
          if (f === 0) continue;
          bflow[b] += f;
          var to = cm.branches[b].to;
          mass[to] += f; through[to] += f;
          var ti = cm.branches[b].tier;
          if (ti >= 0) { costT[ti] += f * bv.k[b]; callsT[ti] += f * bv.q[b]; }
        }
      }
      passes++;
      if (!cm.hasCycle) break;
      var rest = 0;
      for (var r = 0; r < S; r++) if (!cm.states[r].outcome) rest += Math.abs(mass[r]);
      if (rest < 1e-15 || passes > 100000) break;
    }
    return { mass: mass, through: through, bflow: bflow, costT: costT, callsT: callsT };
  }

  function emptyAcc(cm) {
    return {
      out: new Float64Array(cm.outcomes.length),
      costT: new Float64Array(cm.tiers.length),
      callsT: new Float64Array(cm.tiers.length),
      through: new Float64Array(cm.states.length),
      bflow: new Float64Array(cm.branches.length),
      mnum: new Float64Array(cm.measures.length),
      mden: new Float64Array(cm.measures.length),
      chance: 0
    };
  }

  function matches(filter, values) {
    if (!filter) return true;
    for (var i = 0; i < filter.length; i++) {
      if (filter[i].values.indexOf(values[filter[i].attr]) < 0) return false;
    }
    return true;
  }

  // One class's contribution to every measure: the flows it names, each times its factor,
  // counted only when the class matches "where"; and whether the class counts toward "per".
  function classMeasures(cm, pr, scope, values) {
    var n = cm.measures.length;
    var c = new Float64Array(n), p = new Float64Array(n);
    for (var i = 0; i < n; i++) {
      var m = cm.measures[i];
      p[i] = matches(m.per, values) ? 1 : 0;
      if (!matches(m.where, values)) continue;
      var v = 0;
      for (var j = 0; j < m.terms.length; j++) {
        var t = m.terms[j];
        var flow = t.into ? pr.through[t.index] : pr.bflow[t.index];
        if (flow === 0) continue;
        v += t.times ? flow * t.times.fn(scope) : flow;
      }
      c[i] = v;
    }
    return { c: c, p: p };
  }

  function addInto(acc, w, pr, cm, mc) {
    var i;
    for (i = 0; i < cm.outcomes.length; i++) acc.out[i] += w * pr.mass[cm.outcomes[i].index];
    for (i = 0; i < acc.costT.length; i++) { acc.costT[i] += w * pr.costT[i]; acc.callsT[i] += w * pr.callsT[i]; }
    for (i = 0; i < acc.through.length; i++) acc.through[i] += w * pr.through[i];
    for (i = 0; i < acc.bflow.length; i++) acc.bflow[i] += w * pr.bflow[i];
    for (i = 0; i < acc.mnum.length; i++) { acc.mnum[i] += w * mc.c[i]; acc.mden[i] += w * mc.p[i]; }
    acc.chance += w;
  }

  function summarize(cm, acc) {
    var outcomes = {}, costByTier = {}, callsByTier = {};
    var wrong = 0, cost = 0, calls = 0;
    cm.outcomes.forEach(function (o, i) { outcomes[o.id] = acc.out[i]; if (!o.right) wrong += acc.out[i]; });
    cm.tiers.forEach(function (t, i) { costByTier[t] = acc.costT[i]; callsByTier[t] = acc.callsT[i]; cost += acc.costT[i]; calls += acc.callsT[i]; });
    var measures = {};
    cm.measures.forEach(function (m, i) {
      // without "per" a measure is per piece of work; with it, per piece of work in that group
      var v = m.per ? (acc.mden[i] > 0 ? acc.mnum[i] / acc.mden[i] : 0) : acc.mnum[i];
      measures[m.id] = v * m.scale;
    });
    return { outcomes: outcomes, wrong: wrong, cost: cost, costByTier: costByTier, calls: calls, callsByTier: callsByTier, measures: measures };
  }

  function flowsById(cm, acc) {
    var stateFlow = {}, branchFlow = {};
    cm.states.forEach(function (s, i) { stateFlow[s.id] = acc.through[i]; });
    cm.branches.forEach(function (b, i) { branchFlow[b.id] = acc.bflow[i]; });
    return { stateFlow: stateFlow, branchFlow: branchFlow };
  }

  function getPolicy(cm, policyId) {
    var i = cm.policyIndex[policyId];
    if (i === undefined) throw new Error('Unknown policy ' + policyId);
    return cm.policies[i];
  }

  // Evaluate a policy on prepared values. opts.classes: keep per-class results.
  function evalPolicy(cm, values, policy, stocks, opts) {
    var keepClasses = !!(opts && opts.classes);
    var keepZero = !!(opts && opts.zeroClasses);
    var base = stockScope(cm, values, stocks);
    var acc = emptyAcc(cm);
    var classes = keepClasses ? [] : null;
    var attrShares = {};
    cm.attributes.forEach(function (a) { attrShares[a.id] = {}; a.values.forEach(function (v) { attrShares[a.id][v.id] = 0; }); });
    var classTotal = 0;
    for (var ci = 0; ci < policy.combos.length; ci++) {
      var combo = policy.combos[ci];
      var cs = classScope(cm, base, policy, combo);
      classTotal += cs.chance;
      Object.keys(combo.values).forEach(function (aid) { attrShares[aid][combo.values[aid]] += cs.chance; });
      if (cs.chance === 0 && !keepZero) continue;
      var bv = branchValues(cm, cs.scope);
      var pr = propagate(cm, policy.start, bv);
      var mc = classMeasures(cm, pr, cs.scope, combo.values);
      if (cs.chance !== 0) addInto(acc, cs.chance, pr, cm, mc);
      if (keepClasses) {
        var one = emptyAcc(cm);
        addInto(one, 1, pr, cm, mc);
        var sum = summarize(cm, one);
        sum.id = combo.id;
        sum.values = Object.assign({}, combo.values);
        sum.chance = cs.chance;
        classes.push(sum);
      }
    }
    // overall figures are averages over classes; class chances sum to 1
    var overall = summarize(cm, acc);
    return { overall: overall, acc: acc, classes: classes, attrShares: attrShares, classTotal: classTotal, base: base };
  }

  function ratio(a, b) {
    if (b === 0) return a === 0 ? 1 : Infinity;
    return a / b;
  }

  var RATIO_IDS = ['cost_vs_top', 'wrong_vs_top', 'cost_vs_ladder', 'wrong_vs_ladder'];

  /** Headline ratios of the library policy against the two others. Each argument is a summary. */
  function headline(lib, top, ladder) {
    return {
      cost_vs_top: ratio(lib.cost, top.cost),
      wrong_vs_top: ratio(lib.wrong, top.wrong),
      cost_vs_ladder: ratio(lib.cost, ladder.cost),
      wrong_vs_ladder: ratio(lib.wrong, ladder.wrong)
    };
  }

  // The time path on prepared values.
  function pathCore(cm, values, opts) {
    var full = !(opts && opts.lean);
    var periods = Math.max(1, Math.round(values.periods));
    var zero = {};
    cm.stockIds.forEach(function (id) { zero[id] = cm.map.stocks.initial[id]; });
    var top = evalPolicy(cm, values, getPolicy(cm, 'top_first'), zero).overall;
    var ladder = evalPolicy(cm, values, getPolicy(cm, 'cheap_ladder'), zero).overall;
    var libPol = getPolicy(cm, 'library');
    var stocks = Object.assign({}, zero);
    var rows = [];
    for (var t = 0; t < periods; t++) {
      var ev = evalPolicy(cm, values, libPol, stocks);
      var lib = ev.overall;
      var row = {
        period: t,
        stocks: Object.assign({}, stocks),
        library: lib,
        ratios: headline(lib, top, ladder)
      };
      var scope = Object.assign({}, ev.base, lib.measures);
      var next = {};
      cm.updates.forEach(function (u) { next[u.id] = u.fn(scope); });
      if (full) {
        var sv = {};
        cm.stockValues.forEach(function (v) { sv[v.id] = ev.base[v.id]; });
        row.stockValues = sv;
        row.shares = ev.attrShares;
        row.next = Object.assign({}, next);
        Object.assign(row, flowsById(cm, ev.acc));
      }
      rows.push(row);
      stocks = next;
    }
    return {
      periods: rows,
      top_first: top,
      cheap_ladder: ladder,
      first: rows[0].ratios,
      last: rows[rows.length - 1].ratios,
      finalStocks: stocks
    };
  }

  // ---------------------------------------------------------------- public: evaluation

  /**
   * Outcomes and costs for one policy at given stocks.
   * Returns { policy, overall, classes, stateFlow, branchFlow, shares, adjusted }.
   */
  function evaluatePolicy(model, params, policyId, stocks, opts) {
    var cm = compile(model);
    var prep = prepareParams(cm, params);
    var o = Object.assign({ classes: true }, opts || {});
    var ev = evalPolicy(cm, prep.values, getPolicy(cm, policyId), stocks || {}, o);
    var fl = flowsById(cm, ev.acc);
    return {
      policy: policyId,
      overall: ev.overall,
      classes: ev.classes,
      shares: ev.attrShares,
      classTotal: ev.classTotal,
      stateFlow: fl.stateFlow,
      branchFlow: fl.branchFlow,
      adjusted: prep.adjusted
    };
  }

  /**
   * One class on its own. values: { kind, need, held, distractor } by value id.
   * Returns the class summary plus its chance under the given stocks.
   */
  function evaluateClass(model, params, policyId, classValues, stocks) {
    var cm = compile(model);
    var prep = prepareParams(cm, params);
    var policy = getPolicy(cm, policyId);
    var hits = policy.combos.filter(function (c) {
      return Object.keys(classValues).every(function (aid) { return c.values[aid] === classValues[aid]; });
    });
    if (hits.length !== 1) {
      throw new Error((hits.length ? 'More than one class matches' : 'No such class') + ' under policy ' + policyId + ': ' + JSON.stringify(classValues));
    }
    var combo = hits[0];
    var base = stockScope(cm, prep.values, stocks || {});
    var cs = classScope(cm, base, policy, combo);
    var pr = propagate(cm, policy.start, branchValues(cm, cs.scope));
    var acc = emptyAcc(cm);
    addInto(acc, 1, pr, cm, classMeasures(cm, pr, cs.scope, combo.values));
    var sum = summarize(cm, acc);
    var fl = flowsById(cm, acc);
    sum.id = combo.id;
    sum.values = Object.assign({}, combo.values);
    sum.chance = cs.chance;
    sum.stateFlow = fl.stateFlow;
    sum.branchFlow = fl.branchFlow;
    return sum;
  }

  /** The time path of section 8, with the two other policies alongside (constant in time). */
  function timePath(model, params, opts) {
    var cm = compile(model);
    var prep = prepareParams(cm, params);
    var res = pathCore(cm, prep.values, opts);
    res.adjusted = prep.adjusted;
    return res;
  }

  // ---------------------------------------------------------------- public: routes (the tree view)

  /**
   * Every route from the policy's start to an outcome, with its chance and cost.
   * opts: { stocks, classValues, maxVisits (loop bound, default 2), minChance (default 0) }.
   * Without classValues the routes of all classes are merged: chance is summed over
   * classes and cost is the chance-weighted average. carried = chance * cost.
   */
  function routes(model, params, policyId, opts) {
    var cm = compile(model);
    var o = opts || {};
    var maxVisits = o.maxVisits || 2;
    var minChance = o.minChance || 0;
    var prep = prepareParams(cm, params);
    var policy = getPolicy(cm, policyId);
    var base = stockScope(cm, prep.values, o.stocks || {});
    var merged = {};
    var truncated = 0;
    var T = cm.tiers.length;
    policy.combos.forEach(function (combo) {
      if (o.classValues) {
        var ok = Object.keys(o.classValues).every(function (aid) { return combo.values[aid] === o.classValues[aid]; });
        if (!ok) return;
      }
      var cs = classScope(cm, base, policy, combo);
      var w = o.classValues ? 1 : cs.chance;
      if (w === 0) return;
      var bv = branchValues(cm, cs.scope);
      var visits = new Int32Array(cm.states.length);
      var path = [];
      var tierCost = new Float64Array(T);
      function walk(s, chance, cost) {
        if (cm.states[s].outcome) {
          var key = path.join('>');
          var r = merged[key];
          if (!r) {
            r = merged[key] = { branches: path.map(function (b) { return cm.branches[b].id; }), outcome: cm.states[s].id, chance: 0, costW: 0, tierW: new Float64Array(T) };
          }
          r.chance += w * chance;
          r.costW += w * chance * cost;
          for (var t = 0; t < T; t++) r.tierW[t] += w * chance * tierCost[t];
          return;
        }
        if (visits[s] >= maxVisits) { truncated += w * chance; return; }
        visits[s]++;
        var outs = cm.out[s];
        for (var j = 0; j < outs.length; j++) {
          var b = outs[j];
          var c = chance * bv.c[b];
          if (c === 0 || c <= minChance) { if (c > 0) truncated += w * c; continue; }
          var ti = cm.branches[b].tier;
          if (ti >= 0) tierCost[ti] += bv.k[b];
          path.push(b);
          walk(cm.branches[b].to, c, cost + (ti >= 0 ? bv.k[b] : 0));
          path.pop();
          if (ti >= 0) tierCost[ti] -= bv.k[b];
        }
        visits[s]--;
      }
      walk(policy.start, 1, 0);
    });
    var list = Object.keys(merged).map(function (key) {
      var r = merged[key];
      var cost = r.chance > 0 ? r.costW / r.chance : 0;
      var costByTier = {};
      cm.tiers.forEach(function (t, i) { costByTier[t] = r.chance > 0 ? r.tierW[i] / r.chance : 0; });
      var states = [cm.states[policy.start].id].concat(r.branches.map(function (bid) { return cm.states[cm.branches[cm.branchIndex[bid]].to].id; }));
      return { id: key, branches: r.branches, states: states, outcome: r.outcome, chance: r.chance, cost: cost, costByTier: costByTier, carried: r.chance * cost };
    });
    var total = 0;
    list.forEach(function (r) { total += r.chance; });
    sortRoutes(list, o.sortBy || 'chance');
    return { policy: policyId, routes: list, count: list.length, totalChance: total, truncatedChance: truncated, loopBound: maxVisits };
  }

  /** Sort routes in place, largest first, by 'chance', 'cost' or 'carried'. */
  function sortRoutes(list, by) {
    var key = by || 'chance';
    if (['chance', 'cost', 'carried'].indexOf(key) < 0) throw new Error('Sort by chance, cost or carried');
    list.sort(function (a, b) { return b[key] - a[key] || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0); });
    return list;
  }

  // ---------------------------------------------------------------- public: ensemble

  /** Seeded random numbers in [0, 1): mulberry32. Every whole-number seed gives its own stream. */
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // A run setting (such as the number of periods) is a chosen horizon, not an unknown:
  // it is held at its best value in the ensemble and left out of the swings.
  function isRunSetting(cm, id, row) {
    var p = cm.params[cm.paramIds.indexOf(id)];
    return !!((p && p.run_setting) || (row && row.run_setting));
  }

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

  // The value at position pos (0 = low, 1 = high) of a row's range.
  function atPosition(row, pos) {
    var lo = row.low, hi = row.high;
    if (lo === hi) return lo;
    if (row.dist === 'log') return Math.exp(Math.log(lo) + pos * (Math.log(hi) - Math.log(lo)));
    return lo + pos * (hi - lo);
  }

  /**
   * One random draw of every parameter from its range in the table. Run settings stay at their best value.
   * opts.tie (0 to 1) and opts.level (the run's shared level U, 0 to 1): each library-side unknown is
   * placed at the quantile tie * U + (1 - tie) * V of its range, counted from its unfavourable end,
   * where V is its own draw counted from that same end. Other unknowns are drawn on their own.
   * With tie 0 (the default) every value equals the earlier draw, number for number: one random
   * number per row in map order, read from the low end.
   */
  function drawParams(model, table, random, opts) {
    var cm = compile(model);
    var src = tableRows(table);
    var o = opts || {};
    var tie = o.tie === undefined ? 0 : o.tie;
    if (!(tie >= 0 && tie <= 1)) throw new Error('tie must lie between 0 and 1 (got ' + tie + ')');
    var level = o.level;
    if (tie > 0 && !(typeof level === 'number' && level >= 0 && level <= 1)) throw new Error('A tie above 0 needs a shared level between 0 and 1');
    var out = {};
    cm.paramIds.forEach(function (id) {
      var row = src[id];
      if (!row) throw new Error('The table has no row for ' + id);
      var u = random(); // drawn even when unused, so the stream does not depend on which rows are fixed
      if (isRunSetting(cm, id, row)) { out[id] = row.best; return; }
      var pos = u;
      if (tie > 0) {
        var sd = sideOf(row, id);
        if (sd.side === 'library') {
          // Own draw counted from the unfavourable end: u when that end is low, 1 - u when it is high.
          // Position from the low end: tie * U + (1 - tie) * u when the good end is high;
          // 1 - (tie * U + (1 - tie) * (1 - u)) = tie * (1 - U) + (1 - tie) * u when it is low.
          pos = sd.good_end === 'high' ? tie * level + (1 - tie) * u : tie * (1 - level) + (1 - tie) * u;
        }
      }
      out[id] = atPosition(row, pos);
    });
    return out;
  }

  /**
   * One of the three reference settings (brief section 13, R15): every library-side unknown at its
   * unfavourable end ('unfavourable'), at its best value ('best') or at its favourable end
   * ('favourable'); every other unknown at its best value.
   */
  function referenceParams(model, table, which) {
    var cm = compile(model);
    var src = tableRows(table);
    if (['unfavourable', 'best', 'favourable'].indexOf(which) < 0) throw new Error('A reference setting is unfavourable, best or favourable');
    var out = {};
    cm.paramIds.forEach(function (id) {
      var row = src[id];
      if (!row) throw new Error('The table has no row for ' + id);
      var sd = sideOf(row, id);
      if (sd.side !== 'library' || which === 'best' || isRunSetting(cm, id, row)) { out[id] = row.best; return; }
      out[id] = endValue(row, sd.good_end, which === 'favourable');
    });
    return out;
  }

  // The favourable (good) or the unfavourable end of a library-side row.
  function endValue(row, goodEnd, favourable) {
    var high = goodEnd === 'high' ? favourable : !favourable;
    return high ? row.high : row.low;
  }

  function percentile(sorted, pct) {
    if (sorted.length === 0) return NaN;
    var pos = (pct / 100) * (sorted.length - 1);
    var lo = Math.floor(pos), hi = Math.ceil(pos);
    var a = sorted[lo], b = sorted[hi];
    if (a === b || lo === hi) return a;
    return a + (b - a) * (pos - lo);
  }

  function ranks(xs) {
    var idx = xs.map(function (_, i) { return i; });
    idx.sort(function (i, j) { return xs[i] - xs[j]; });
    var r = new Array(xs.length);
    var i = 0;
    while (i < idx.length) {
      var j = i;
      while (j + 1 < idx.length && xs[idx[j + 1]] === xs[idx[i]]) j++;
      var avg = (i + j) / 2 + 1;
      for (var k = i; k <= j; k++) r[idx[k]] = avg;
      i = j + 1;
    }
    return r;
  }

  /** Spearman rank correlation; null when either side does not vary. */
  function spearman(x, y) {
    var n = x.length;
    if (n < 2 || y.length !== n) return null;
    var rx = ranks(x), ry = ranks(y);
    var mx = 0, my = 0;
    for (var i = 0; i < n; i++) { mx += rx[i]; my += ry[i]; }
    mx /= n; my /= n;
    var sxy = 0, sxx = 0, syy = 0;
    for (var k = 0; k < n; k++) {
      var dx = rx[k] - mx, dy = ry[k] - my;
      sxy += dx * dy; sxx += dx * dx; syy += dy * dy;
    }
    if (sxx === 0 || syy === 0) return null;
    return sxy / Math.sqrt(sxx * syy);
  }

  // The stream of shared levels for tied draws. It is separate from the stream of own draws,
  // so the own draws are the same at every tie, and tie 0 reproduces the untied ensemble.
  function sharedSeed(seed) { return Math.imul((seed >>> 0) ^ 0x9E3779B9, 0x85EBCA6B) >>> 0; }

  /**
   * The ensemble of section 9.5, with tied draws (brief section 13, R14).
   * opts: { n (default 1000), seed (default 1), tie (default 0), percentiles (default 5,25,50,75,95), keepDraws }.
   * Besides the four ratios and the six levels, the series hold the funnel's last number (funnel_end).
   */
  function ensemble(model, table, opts) {
    var cm = compile(model);
    var o = opts || {};
    var n = o.n || 1000;
    var seed = o.seed === undefined ? 1 : o.seed;
    var tie = o.tie === undefined ? 0 : o.tie;
    var pcts = o.percentiles || [5, 25, 50, 75, 95];
    var random = rng(seed);
    var shared = rng(sharedSeed(seed));
    var at = ['first', 'last'];
    var series = { first: {}, last: {} };
    var levelIds = ['library_cost', 'library_wrong', 'top_cost', 'top_wrong', 'ladder_cost', 'ladder_wrong'];
    if (cm.funnelEnd) levelIds.push('funnel_end');
    at.forEach(function (w) {
      RATIO_IDS.concat(levelIds).forEach(function (r) { series[w][r] = []; });
    });
    var better = { first: 0, last: 0 };
    var betterLadder = { first: 0, last: 0 };
    var drawn = {};
    cm.paramIds.forEach(function (id) { drawn[id] = []; });
    var adjustedDraws = 0;
    var draws = o.keepDraws ? [] : null;
    var levels = [];
    for (var d = 0; d < n; d++) {
      var level = shared(); // one shared level per run, used only when tie is above 0
      levels.push(level);
      var raw = drawParams(cm, table, random, { tie: tie, level: level });
      var prep = prepareParams(cm, raw);
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
        if (row.library.cost < path.top_first.cost && row.library.wrong <= path.top_first.wrong) better[w]++;
        if (row.library.cost < path.cheap_ladder.cost && row.library.wrong <= path.cheap_ladder.wrong) betterLadder[w]++;
      });
      cm.paramIds.forEach(function (id) { drawn[id].push(prep.values[id]); });
      if (draws) draws.push({ params: prep.values, raw: raw, level: level, first: rowsAt.first.ratios, last: rowsAt.last.ratios });
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

  /**
   * One-at-a-time swings: each parameter at its low and at its high, the others at best.
   * Run settings are not swung.
   * Returns { base, rows: [{ id, low, high }], ranking: { first|last: { ratio: [{ id, swing }] } } }.
   */
  function swings(model, table) {
    var cm = compile(model);
    var src = tableRows(table);
    var best = paramsFromTable(table, 'best');
    function run(p) {
      var path = pathCore(cm, prepareParams(cm, p).values, { lean: true });
      return { first: path.first, last: path.last };
    }
    var base = run(best);
    var rows = [];
    cm.paramIds.forEach(function (id) {
      var row = src[id];
      if (!row) throw new Error('The table has no row for ' + id);
      if (row.low === row.high || isRunSetting(cm, id, row)) return;
      var lo = Object.assign({}, best); lo[id] = row.low;
      var hi = Object.assign({}, best); hi[id] = row.high;
      rows.push({ id: id, low: run(lo), high: run(hi) });
    });
    var ranking = { first: {}, last: {} };
    ['first', 'last'].forEach(function (w) {
      RATIO_IDS.forEach(function (r) {
        var list = rows.map(function (row) {
          var a = row.low[w][r], b = row.high[w][r];
          var sw = Math.abs(b - a);
          return { id: row.id, low: a, high: b, swing: isFinite(sw) ? sw : Infinity };
        });
        list.sort(function (x, y) { return y.swing - x.swing || (x.id < y.id ? -1 : 1); });
        ranking[w][r] = list;
      });
    });
    return { base: base, rows: rows, ranking: ranking };
  }

  // ---------------------------------------------------------------- public: funnel, reference settings, weights

  /** The funnels declared in the map, read from one summary of the library policy. */
  function funnelsOf(cm, summary) {
    var out = {};
    cm.funnels.forEach(function (f) {
      out[f.id] = f.stages.map(function (sid) {
        var m = cm.measures[cm.measureIndex[sid]];
        return { id: sid, label: m.label, unit: m.unit, value: summary.measures[sid] };
      });
    });
    return out;
  }

  function pickRow(path, period) {
    var rows = path.periods;
    if (period === undefined || period === null || period === 'last') return rows[rows.length - 1];
    if (period === 'first') return rows[0];
    if (typeof period === 'number' && period >= 0 && period < rows.length) return rows[Math.floor(period)];
    throw new Error('A period is first, last or an index from 0 to ' + (rows.length - 1));
  }

  /**
   * The funnel of the library policy at one period (brief section 13, R16): for each funnel the map
   * declares, the value of each stage, in order. opts: { period: 'first' | 'last' (default) | index }.
   */
  function funnel(model, params, opts) {
    var cm = compile(model);
    var prep = prepareParams(cm, params);
    var path = pathCore(cm, prep.values, { lean: true });
    var row = pickRow(path, opts && opts.period);
    return {
      period: row.period,
      stocks: Object.assign({}, row.stocks),
      funnels: funnelsOf(cm, row.library),
      end: cm.funnelEnd ? row.library.measures[cm.funnelEnd] : null,
      adjusted: prep.adjusted
    };
  }

  // Everything reported for one parameter set: the three ways of working, the four ratios and the
  // funnels, at the first and the last period.
  function measureSet(cm, values) {
    var path = pathCore(cm, values, { lean: true });
    function at(row) {
      return {
        period: row.period,
        stocks: Object.assign({}, row.stocks),
        library: { cost: row.library.cost, wrong: row.library.wrong },
        ratios: Object.assign({}, row.ratios),
        funnels: funnelsOf(cm, row.library),
        funnel_end: cm.funnelEnd ? row.library.measures[cm.funnelEnd] : null
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
   * The three reference settings (brief section 13, R15), each with every measure the map reports.
   * Returns { unfavourable, best, favourable }, each { params, adjusted, top_first, cheap_ladder, first, last }.
   */
  function references(model, table) {
    var cm = compile(model);
    var out = {};
    ['unfavourable', 'best', 'favourable'].forEach(function (which) {
      var raw = referenceParams(cm, table, which);
      var prep = prepareParams(cm, raw);
      var res = measureSet(cm, prep.values);
      res.params = prep.values;
      res.adjusted = prep.adjusted;
      out[which] = res;
    });
    return out;
  }

  /**
   * A variant the map declares (map.variants): the given parameter set with some values replaced.
   * Returns the same measures as one reference setting: { id, label, params, adjusted, top_first,
   * cheap_ladder, first, last, finalStocks }. Nothing is computed for a variant the map does not declare.
   */
  function variant(model, params, id) {
    var cm = compile(model);
    var v = (cm.map.variants || []).filter(function (x) { return x.id === id; })[0];
    if (!v) throw new Error('The map declares no variant ' + id);
    var raw = Object.assign({}, params);
    Object.keys(v.set || {}).forEach(function (k) {
      if (cm.paramIds.indexOf(k) < 0) throw new Error('Variant ' + id + ' sets unknown parameter ' + k);
      raw[k] = v.set[k];
    });
    var prep = prepareParams(cm, raw);
    var res = measureSet(cm, prep.values);
    res.id = id;
    res.label = v.label;
    res.params = prep.values;
    res.adjusted = prep.adjusted;
    return res;
  }

  // How much a move from state a to state b lowers each ratio (a - b, so a positive number means the
  // ratio was held up by what was moved) and raises the funnel's last number (b - a); and the score,
  // the mean over the declared ratios of the drop counted as a share of the ratio in state a.
  function change(cm, a, b) {
    var ratios = (cm.weight && cm.weight.ratios) || RATIO_IDS;
    var holds = {};
    RATIO_IDS.forEach(function (r) { holds[r] = a.ratios[r] - b.ratios[r]; });
    holds.funnel_end = (b.funnel_end || 0) - (a.funnel_end || 0);
    var s = 0;
    ratios.forEach(function (r) {
      var d = a.ratios[r] > 0 && isFinite(a.ratios[r]) && isFinite(b.ratios[r]) ? (a.ratios[r] - b.ratios[r]) / a.ratios[r] : 0;
      s += d;
    });
    holds.score = s / ratios.length;
    return holds;
  }

  /**
   * The weight of each limitation (brief section 13, R17): how much it holds the result down.
   * For a limitation, its library-side unknowns move to their favourable end and every other unknown
   * stays at its best value; the weight is the change in the four ratios and in the funnel's last
   * number, at the period the map's weight block names (default the last). Other-side unknowns a
   * limitation names stay at best and are listed. A limitation with no library-side unknown has weight zero.
   * The same is done for every design step with all its limitations together (grouped by main_step),
   * and for steps added one after another, each time the step that changes the score most.
   * A row that moves no library-side unknown is not measured: measured is false, not_measured says
   * why ('no_setting' or 'no_library_unknown'), and its holds stay zero. Each row also lists its
   * library-side unknowns moved one at a time (parts), largest first. The result also gives every
   * library-side unknown moved alone (unknowns), all of them moved together (favourable: the
   * favourable reference setting), and those no limitation names (unnamed), moved together.
   * limitations: an array of { id, title, main_step, params }, or an object holding one as "items".
   * opts: { period, groupBy (default 'main_step'), stepLabels }.
   */
  function weights(model, table, limitations, opts) {
    var cm = compile(model);
    var o = opts || {};
    var period = o.period || (cm.weight && cm.weight.period) || 'last';
    var groupBy = o.groupBy || 'main_step';
    var list = Array.isArray(limitations) ? limitations : (limitations && limitations.items) || [];
    var src = tableRows(table);
    var best = referenceParams(cm, table, 'best');
    var known = new Set(cm.paramIds);

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
    function movedSet(ids) {
      var p = Object.assign({}, best);
      ids.forEach(function (id) {
        var row = src[id];
        p[id] = endValue(row, sideOf(row, id).good_end, true);
      });
      return p;
    }
    function split(ids) {
      var moved = [], other = [], missing = [];
      ids.forEach(function (id) {
        if (!known.has(id)) { missing.push(id); return; }
        var sd = sideOf(src[id], id);
        if (sd.side === 'library') { if (moved.indexOf(id) < 0) moved.push(id); }
        else if (other.indexOf(id) < 0) other.push(id);
      });
      return { moved: moved, other: other, missing: missing };
    }

    var base = measuresAt(best);
    var memo = {};
    function evalMoved(ids) {
      var key = ids.slice().sort().join(',');
      if (!hasOwn.call(memo, key)) memo[key] = ids.length ? measuresAt(movedSet(ids)) : base;
      return memo[key];
    }

    // every library-side unknown moved alone (the finest grain of the same measure)
    var libIds = cm.paramIds.filter(function (id) { return !isRunSetting(cm, id, src[id]) && sideOf(src[id], id).side === 'library'; });
    var alone = {};
    libIds.forEach(function (id) { alone[id] = change(cm, base, evalMoved([id])); });
    function partsOf(ids) {
      return ids.map(function (id) { return { id: id, holds: alone[id] }; })
        .sort(function (a, b) { return Math.abs(b.holds.score) - Math.abs(a.holds.score) || (a.id < b.id ? -1 : 1); });
    }
    // A row with no library-side unknown moves nothing, so the measure says nothing about it.
    // Its holds stay zero; measured is false and not_measured gives the reason.
    function measuredOf(params, moved) {
      if (moved.length) return { measured: true, not_measured: null };
      return { measured: false, not_measured: params.length ? 'no_library_unknown' : 'no_setting' };
    }

    var limRows = list.map(function (l) {
      var sp = split(l.params || []);
      var at = evalMoved(sp.moved);
      var ms = measuredOf(l.params || [], sp.moved);
      return {
        id: l.id, title: l.title, step: l[groupBy],
        unknowns: (l.params || []).slice(), moved: sp.moved, left_at_best: sp.other, not_in_map: sp.missing,
        values: at, holds: change(cm, base, at), measured: ms.measured, not_measured: ms.not_measured, parts: partsOf(sp.moved)
      };
    });
    var byScore = limRows.slice().sort(function (a, b) { return b.holds.score - a.holds.score || (a.id < b.id ? -1 : 1); });

    // design steps, all their limitations together
    var stepIds = [];
    list.forEach(function (l) { var s = l[groupBy]; if (s !== undefined && stepIds.indexOf(s) < 0) stepIds.push(s); });
    stepIds.sort(function (a, b) { return a < b ? -1 : a > b ? 1 : 0; });
    var steps = stepIds.map(function (s) {
      var lims = list.filter(function (l) { return l[groupBy] === s; });
      var ids = [];
      lims.forEach(function (l) { ids = ids.concat(l.params || []); });
      var sp = split(ids);
      var at = evalMoved(sp.moved);
      var ms = measuredOf(ids, sp.moved);
      return {
        step: s, label: o.stepLabels ? o.stepLabels[s] : undefined,
        limitations: lims.map(function (l) { return l.id; }),
        moved: sp.moved, left_at_best: sp.other, values: at, holds: change(cm, base, at), measured: ms.measured, not_measured: ms.not_measured
      };
    });
    var stepsByScore = steps.slice().sort(function (a, b) { return b.holds.score - a.holds.score || (a.step < b.step ? -1 : 1); });

    // steps added one after another, each time the one whose addition changes the score most
    var sequence = [];
    var current = [];
    var currentAt = base;
    var left = steps.slice();
    while (left.length) {
      var bestK = -1, bestRes = null, bestChange = null, bestIds = null;
      for (var k = 0; k < left.length; k++) {
        var ids = current.slice();
        left[k].moved.forEach(function (id) { if (ids.indexOf(id) < 0) ids.push(id); });
        var res = evalMoved(ids);
        var ch = change(cm, currentAt, res);
        if (bestK < 0 || ch.score > bestChange.score + 1e-15) { bestK = k; bestRes = res; bestChange = ch; bestIds = ids; }
      }
      var st = left.splice(bestK, 1)[0];
      current = bestIds;
      currentAt = bestRes;
      sequence.push({ step: st.step, label: st.label, added: bestChange, cumulative: change(cm, base, bestRes), values: bestRes, moved_so_far: current.slice() });
    }

    // Every library-side unknown at its favourable end (the favourable reference setting), and the
    // library-side unknowns that no limitation names: what the sequence above can never move.
    var named = {};
    limRows.forEach(function (r) { r.moved.forEach(function (id) { named[id] = true; }); });
    var unnamedIds = libIds.filter(function (id) { return !named[id]; });
    var favAt = evalMoved(libIds);
    var unnamedAt = evalMoved(unnamedIds);

    return {
      period: period,
      base: base,
      unknowns: partsOf(libIds),
      favourable: { values: favAt, holds: change(cm, base, favAt) },
      unnamed: { ids: unnamedIds, values: unnamedAt, holds: change(cm, base, unnamedAt) },
      limitations: limRows,
      ranking: byScore.map(function (r) { return { id: r.id, score: r.holds.score }; }),
      steps: steps,
      stepRanking: stepsByScore.map(function (r) { return { step: r.step, score: r.holds.score }; }),
      sequence: sequence
    };
  }

  // ---------------------------------------------------------------- public: checks

  /**
   * Conservation: for every policy and every class (zero-chance classes included),
   * the branch chances out of every state sum to 1 and none is outside [0, 1];
   * the outcome chances sum to 1; the class chances sum to 1.
   */
  function conservation(model, params, opts) {
    var cm = compile(model);
    var o = opts || {};
    var tol = o.tol || 1e-9;
    var prep = prepareParams(cm, params);
    var problems = [];
    var maxError = 0;
    var checks = 0;
    function note(err, msg) {
      checks++;
      if (err > maxError) maxError = err;
      if (err > tol && problems.length < 50) problems.push(msg + ' (off by ' + err.toExponential(2) + ')');
    }
    cm.policies.forEach(function (policy) {
      var base = stockScope(cm, prep.values, o.stocks || {});
      var classSum = 0;
      policy.combos.forEach(function (combo) {
        var cs = classScope(cm, base, policy, combo);
        note(Math.max(0, -cs.chance, cs.chance - 1), policy.id + ' ' + combo.id + ': class chance outside 0 to 1');
        classSum += cs.chance;
        var bv = branchValues(cm, cs.scope);
        cm.states.forEach(function (s, si) {
          if (s.outcome) return;
          var sum = 0;
          cm.out[si].forEach(function (b) {
            var c = bv.c[b];
            sum += c;
            note(Math.max(0, -c, c - 1), policy.id + ' ' + combo.id + ' branch ' + cm.branches[b].id + ': chance outside 0 to 1');
          });
          note(Math.abs(sum - 1), policy.id + ' ' + combo.id + ' state ' + s.id + ': branch chances do not sum to 1');
        });
        var pr = propagate(cm, policy.start, bv);
        var os = 0;
        cm.outcomes.forEach(function (oc) { os += pr.mass[oc.index]; });
        note(Math.abs(os - 1), policy.id + ' ' + combo.id + ': outcome chances do not sum to 1');
      });
      note(Math.abs(classSum - 1), policy.id + ': class chances do not sum to 1');
    });
    return { ok: problems.length === 0, maxError: maxError, checks: checks, problems: problems, adjusted: prep.adjusted };
  }

  function words(s) { return String(s).trim().split(/\s+/).filter(Boolean).length; }

  /**
   * Checks on the map itself: label lengths, plain meanings, every parameter used,
   * pure cost parameters never reaching a chance, every state reachable.
   * Returns { ok, problems }.
   */
  function checkMap(map) {
    var problems = [];
    var cm;
    try { cm = compile(map); } catch (e) { return { ok: false, problems: ['The map does not compile: ' + e.message] }; }
    map.states.forEach(function (s) { if (words(s.label) > 6) problems.push('State label over six words: ' + s.id); });
    map.branches.forEach(function (b) {
      if (words(b.label) > 8) problems.push('Branch label over eight words: ' + b.id);
      if (!Array.isArray(b.limitations)) problems.push('Branch has no limitation list: ' + b.id);
    });
    map.parameters.forEach(function (p) {
      if (!p.meaning || words(p.meaning) >= 25) problems.push('Parameter meaning missing or 25 words or more: ' + p.id);
      if (!p.group || !map.groups.some(function (g) { return g.id === p.group; })) problems.push('Parameter has no known group: ' + p.id);
    });

    // which names each expression family uses
    var derivedIds = {};
    cm.derived.forEach(function (d) { derivedIds[d.id] = d.ids; });
    function expand(ids, seen) {
      ids.forEach(function (id) {
        if (seen[id]) return;
        seen[id] = true;
        if (derivedIds[id]) expand(derivedIds[id], seen);
      });
      return seen;
    }
    var chanceIds = {};
    cm.branches.forEach(function (b) { expand(b.chance.ids, chanceIds); });
    cm.attributes.forEach(function (a) { a.values.forEach(function (v) { expand(v.ids, chanceIds); }); });
    cm.stockValues.forEach(function (v) { expand(v.ids, chanceIds); });
    cm.updates.forEach(function (u) { expand(u.ids, chanceIds); });
    var allIds = Object.assign({}, chanceIds);
    cm.branches.forEach(function (b) { expand(b.cost.ids, allIds); expand(b.calls.ids, allIds); });
    cm.params.forEach(function (p) {
      if (!allIds[p.id] && !p.run_setting) problems.push('Parameter is never used: ' + p.id);
      if (p.pure_cost && chanceIds[p.id]) problems.push('Pure cost parameter reaches a chance: ' + p.id);
    });
    // reachability
    var seen = new Array(cm.states.length).fill(false);
    cm.policies.forEach(function (pol) {
      var stack = [pol.start];
      while (stack.length) {
        var s = stack.pop();
        if (seen[s]) continue;
        seen[s] = true;
        cm.out[s].forEach(function (b) { stack.push(cm.branches[b].to); });
      }
    });
    cm.states.forEach(function (s, i) { if (!seen[i]) problems.push('State cannot be reached from any policy start: ' + s.id); });
    return { ok: problems.length === 0, problems: problems };
  }

  return {
    compileExpr: compileExpr,
    compile: compile,
    prepareParams: prepareParams,
    tableRows: tableRows,
    paramsFromTable: paramsFromTable,
    evaluatePolicy: evaluatePolicy,
    evaluateClass: evaluateClass,
    timePath: timePath,
    headline: headline,
    routes: routes,
    sortRoutes: sortRoutes,
    rng: rng,
    drawParams: drawParams,
    spearman: spearman,
    percentile: percentile,
    ensemble: ensemble,
    swings: swings,
    sideOf: sideOf,
    referenceParams: referenceParams,
    references: references,
    variant: variant,
    funnel: funnel,
    weights: weights,
    conservation: conservation,
    checkMap: checkMap,
    RATIO_IDS: RATIO_IDS.slice()
  };
});
