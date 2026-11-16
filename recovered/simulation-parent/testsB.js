test('R18c: the square is declared in the map and computed by the engine: three sheets of 11 by 11; its corner cells are the declared corners; each cell is the setting at its levels', () => {
  const sq = E.square(map, real);
  assert(map.square.x === 'reach' && map.square.y === 'quality' && map.square.steps === 11, 'declaration');
  assert(sq.sheets.length === 3 && sq.levels.length === 11 && sq.levels[0] === 0 && sq.levels[10] === 1, 'shape');
  sq.sheets.forEach(s => { assert(s.cells.length === 11, s.id + ' rows'); s.cells.forEach(r => assert(r.length === 11, s.id + ' columns')); });
  const ref = E.references(map, real);
  const corner = (sheet, i, j, id) => E.RATIO_IDS.forEach(r => near(sq.sheets.find(s => s.id === sheet).cells[i][j].ratios[r], ref[id].last.ratios[r], 12, sheet + ' ' + i + ',' + j + ' is not ' + id + ' at ' + r));
  // cells[y][x]: y is quality, x is reach
  corner('little', 0, 0, 'corner_000'); corner('little', 10, 0, 'corner_001'); corner('little', 0, 10, 'corner_010'); corner('little', 10, 10, 'corner_011');
  corner('much', 0, 0, 'corner_100'); corner('much', 10, 0, 'corner_101'); corner('much', 0, 10, 'corner_110'); corner('much', 10, 10, 'corner_111');
  // an inside cell of the middle sheet, by its levels
  const cell = sq.sheets.find(s => s.id === 'middle').cells[7][3];
  const tp = E.timePath(map, E.settingParams(map, real, { reach: 0.3, quality: 0.7, running_cost: 'middle', recurrence: 'middle' }));
  E.RATIO_IDS.forEach(r => near(cell.ratios[r], tp.last[r], 12, 'inside cell ' + r));
  const one = E.square(map, real, { sheets: ['middle'] });
  assert(one.sheets.length === 1 && JSON.stringify(one.sheets[0].cells[7][3]) === JSON.stringify(cell), 'one sheet');
});

// R19 helpers: the score of a parameter set, from the library's cost and wrong rate at the last period
function libLast(p) { const tp = E.timePath(map, p); const r = tp.periods[tp.periods.length - 1].library; return { cost: r.cost, wrong: r.wrong }; }
function scorer(tb) {
  const mid = E.referenceParams(map, tb, 'middle'), all = E.referenceParams(map, tb, 'all_good');
  const m = libLast(mid);
  const S = x => ((m.cost - x.cost) / m.cost + (m.wrong - x.wrong) / m.wrong) / 2;
  return { mid, all, S, full: S(libLast(all)) };
}

test('R19: alone and last are shares of the full fall; a set with no library-side unknown gets zero; the union of every library-side unknown gets one; the score equals revision 3\'s', () => {
  const ids = LIB_IDS.filter(id => !map.parameters.find(p => p.id === id).run_setting);
  const W = E.weights(map, real, [
    { id: 'NONE', title: 'no unknown', main_step: 1, params: [] },
    { id: 'GATE', title: 'gate only', main_step: 1, params: ['g_review', 'l_found'] },
    { id: 'WORK', title: 'mix of work only', main_step: 1, params: ['need_visible'] },
    { id: 'ALL', title: 'every library-side unknown', main_step: 2, params: ids }
  ]);
  const row = id => W.limitations.find(r => r.id === id);
  ['NONE', 'GATE', 'WORK'].forEach(id => { assert(row(id).alone === 0 && row(id).last === 0 && !row(id).measured, id + ' not zero'); });
  assert(row('NONE').not_measured === 'no_setting' && row('GATE').not_measured === 'gate_or_ladder' && row('WORK').not_measured === 'other_side_only', 'reasons');
  assert(JSON.stringify(row('GATE').in_shared_groups) === JSON.stringify(['gate']), 'shared group of the gate row');
  near(row('ALL').last, 1, 12, 'last of every library-side unknown');
  near(row('ALL').alone, 1, 12, 'alone of every library-side unknown');
  near(W.sequence_end.cumulative, 1, 12, 'the sequence ends at the full fall');
  // the real limitations: rows with no library-side unknown are zero and say why
  const WR = E.weights(map, real, lims);
  WR.limitations.filter(r => !r.moved.length).forEach(r => {
    assert(r.alone === 0 && r.last === 0 && !r.measured, r.id);
    const l = lims.items.find(x => x.id === r.id);
    const gl = l.params.some(id => ['gate', 'ladder'].includes(map.parameters.find(p => p.id === id).group));
    assert(r.not_measured === (!l.params.length ? 'no_setting' : gl ? 'gate_or_ladder' : 'other_side_only'), r.id + ' reason ' + r.not_measured);
  });
  // the four groups together are every library-side unknown; each group row moves exactly its members
  const union = new Set();
  WR.groups.forEach(g => { g.moved.forEach(id => { assert(realRows[id].lib_group === g.id, id + ' in ' + g.id); union.add(id); }); });
  assert(union.size === ids.length, 'groups do not cover every library-side unknown');
  // the score equals revision 3's (mean fall of the four ratios), with p_promote at 0
  const W4 = E.weights(map, pinned, lims), W3 = E3.weights(map3, t3, lims3);
  W3.limitations.forEach(r => {
    const n = W4.limitations.find(x => x.id === r.id);
    near(n.alone_score, r.holds.score, 9, r.id + ' score');
    E.RATIO_IDS.forEach(k => near(n.alone_change[k], r.holds[k], 12, r.id + ' ' + k));
  });
  near(W4.full.score, W3.favourable.holds.score, 9, 'full fall');
  // the weight note words it as a measurement, never as advice
  assert(!/\bshould\b|\bfix(es)?\b|\brecommend|\bmitigat|\bimprove/i.test(map.weight.note), 'weight note reads like advice');
});

// Hand-worked R19 case on one small set X = { t_latent, d_deliver }, both reach, good end high.
//   t_latent: 0.02 / 0.15 / 0.6; d_deliver: 0.5 / 0.85 / 0.98 (low / middle / high).
//   alone(X): the middle setting with t_latent 0.6 and d_deliver 0.98; S of that, over S(all_good).
//   last(X):  the all-good setting with t_latent 0.15 and d_deliver 0.85; (S(all_good) - S of that) / S(all_good).
//   S(x) = ((c_mid - c_x) / c_mid + (w_mid - w_x) / w_mid) / 2, with c and w the library's cost and wrong rate
//   at the last period, read from the time path.
test('R19 by hand: alone and last for { t_latent, d_deliver } from the definitions; the full fall at p_promote 0 is the 0.290 of section 14', () => {
  assert(realRows.t_latent.low === 0.02 && realRows.t_latent.best === 0.15 && realRows.t_latent.high === 0.6, 't_latent range');
  assert(realRows.d_deliver.low === 0.5 && realRows.d_deliver.best === 0.85 && realRows.d_deliver.high === 0.98, 'd_deliver range');
  const W = E.weights(map, real, [{ id: 'X', title: 'x', main_step: 1, params: ['t_latent', 'd_deliver'] }]);
  const h = scorer(real);
  const a = Object.assign({}, h.mid, { t_latent: 0.6, d_deliver: 0.98 });
  const l = Object.assign({}, h.all, { t_latent: 0.15, d_deliver: 0.85 });
  near(W.full.score, h.full, 12, 'full fall');
  near(W.limitations[0].alone, h.S(libLast(a)) / h.full, 12, 'alone');
  near(W.limitations[0].last, (h.full - h.S(libLast(l))) / h.full, 12, 'last');
  assert(W.limitations[0].same_set.count === 0, 'same set');
  near(E.weights(map, pinned, []).full.score, 0.290, 3, 'S(all_good) at p_promote 0');
});

test('R19: a step moves the union of its limitations\' library-side unknowns; the steps moved one after another pick the largest cumulative score each time and end with the unnamed unknowns; limitations with the same set share a weight and count each other', () => {
  const W = E.weights(map, real, lims);
  const steps = [...new Set(lims.items.map(l => l.main_step))].sort((a, b) => a - b);
  assert(W.steps.length === steps.length, 'one row per step');
  W.steps.forEach(s => {
    const ids = new Set();
    lims.items.filter(l => l.main_step === s.step).forEach(l => l.params.forEach(id => { if (realRows[id].side === 'library') ids.add(id); }));
    assert(s.moved.length === ids.size && s.moved.every(id => ids.has(id)), 'step ' + s.step + ' moved set');
  });
  const h = scorer(real);
  const cum = ids => { const p = Object.assign({}, h.mid); ids.forEach(id => { p[id] = h.all[id]; }); return h.S(libLast(p)) / h.full; };
  let so = [];
  W.sequence.forEach((s, k) => {
    near(cum(s.moved_so_far), s.cumulative, 10, 'round ' + k + ' cumulative');
    W.sequence.slice(k + 1).forEach(o => {
      const st = W.steps.find(x => x.step === o.step);
      const ids = so.concat(st.moved.filter(id => so.indexOf(id) < 0));
      assert(cum(ids) <= s.cumulative + 1e-12, 'round ' + k + ': step ' + o.step + ' would have given more');
    });
    so = s.moved_so_far;
  });
  near(W.unnamed_share, 1 - W.sequence[W.sequence.length - 1].cumulative, 12, 'unnamed share');
  near(W.sequence_end.cumulative, 1, 12, 'the sequence ends at the full fall');
  const named = new Set();
  lims.items.forEach(l => l.params.forEach(id => { if (realRows[id].side === 'library') named.add(id); }));
  assert(JSON.stringify(W.unnamed.moved.slice().sort()) === JSON.stringify(W.unknowns.map(u => u.id).filter(id => !named.has(id)).sort()), 'unnamed set');
  // limitations with the same set of library-side unknowns
  const key = r => r.moved.slice().sort().join(',');
  W.limitations.filter(r => r.moved.length).forEach(r => {
    const others = W.limitations.filter(x => x !== r && x.moved.length && key(x) === key(r));
    assert(r.same_set.count === others.length, r.id + ' same-set count');
    others.forEach(o => { assert(o.alone === r.alone && o.last === r.last, r.id + ' and ' + o.id + ' differ'); });
  });
  assert(W.limitations.some(r => r.same_set && r.same_set.count > 0), 'no shared set to test');
  // rankings run by last, largest first
  ['limitations', 'steps', 'groups'].forEach(k => { const L = W.ranking[k]; for (let i = 1; i < L.length; i++) assert(L[i - 1].last >= L[i].last, k + ' not sorted by last'); });
});

test('R20: the shared table moves the gate and the ladder as declared, at middle and at all_good; each row is that setting\'s time path; the other two ways do not depend on the base', () => {
  const gate = map.shared_groups.find(g => g.id === 'gate').moves, ladder = map.shared_groups.find(g => g.id === 'ladder').moves;
  assert(JSON.stringify(gate) === JSON.stringify({ g_tests_visible: 'high', g_tests_latent: 'high', g_review: 'high', s_review: 'high' }), 'gate group');
  assert(JSON.stringify(ladder) === JSON.stringify({ rho_retry: 'high', o_opus: 'high', o_fable: 'high', c_handoff: 'low' }), 'ladder group');
  const T = E.sharedTable(map, real);
  assert(T.rows.length === 8, 'eight rows');
  T.rows.forEach(r => {
    const p = E.referenceParams(map, real, r.base);
    r.moved.forEach(g => { const mv = g === 'gate' ? gate : ladder; Object.keys(mv).forEach(id => { p[id] = realRows[id][mv[id]]; }); });
    const tp = E.timePath(map, p);
    const last = tp.periods[tp.periods.length - 1];
    near(r.library.cost, last.library.cost, 12, r.base + ' ' + r.moved + ' library cost');
    near(r.library.wrong, last.library.wrong, 12, r.base + ' ' + r.moved + ' library wrong');
    near(r.top_first.cost, tp.top_first.cost, 12, 'strong cost'); near(r.cheap_ladder.wrong, tp.cheap_ladder.wrong, 12, 'ladder wrong');
    const twin = T.rows.find(x => x.base !== r.base && x.moved.join() === r.moved.join());
    near(r.top_first.cost, twin.top_first.cost, 12, 'strong model depends on the base'); near(r.cheap_ladder.cost, twin.cheap_ladder.cost, 12, 'ladder depends on the base');
  });
});

// Hand case 6 (R21). Library, visible, cheap model alone wrong, no look-alike, stocks E_good 60 and E_bad 20
// (bad share 0.25). The shared numbers H of cases 1 to 3, with c_check_share 0.4, p_promote 0.5,
// k_promo_exact 0.8 and k_promo_similar 0.2.
//   g = 1 - (1 - 0.5)(1 - 0.4 * 0.5) = 0.6.
//   exact held:   promo = 0.8 * (1 - 0.25) * 0.4 * 0.5 = 0.12;  g_lib = 0.6 + 0.4 * 0.12 = 0.648 = 1 - 0.4 * 0.88.
//   similar held: promo = 0.2 * 0.75 * 0.4 * 0.5 = 0.03;         g_lib = 0.6 + 0.4 * 0.03 = 0.612.
//   composite or nothing held: promo = 0; g_lib = g = 0.6.
//   More caught at the first gate, per 100 such pieces: 100 * (flow into the first gate's wrong state) * 0.4 * promo.
//   Under the two other ways nothing is held, so promo is 0 there whatever p_promote is.
test('hand case 6 (R21): promo and g_lib in one class, at every gate; the promoted-check measures; nothing changes under the two other ways', () => {
  const p = withP(Object.assign({}, H, { c_check_share: 0.4, p_promote: 0.5, k_promo_exact: 0.8, k_promo_similar: 0.2 }));
  const stocks = { E_good: 60, E_bad: 20 };
  const want = { exact: [0.12, 0.648], similar: [0.03, 0.612], composite: [0, 0.6], nothing: [0, 0.6] };
  Object.keys(want).forEach(held => {
    const c = E.evaluateClass(map, p, 'library', { kind: 'visible', need: 'cheap_wrong', held, distractor: 'no' }, stocks);
    [['l6_caught', 'L6_wrong'], ['l7_caught', 'L7_wrong'], ['l8_caught', 'L8_wrong'], ['l9_caught', 'L9_wrong']].forEach(([b, s]) => {
      if (s === 'L6_wrong' || s === 'L8_wrong') assert(c.stateFlow[s] > 0, held + ': no flow into ' + s);
      if (!(c.stateFlow[s] > 0)) return;
      near(c.branchFlow[b] / c.stateFlow[s], want[held][1], 12, held + ' catch chance at ' + s);
    });
    near(c.measures.fw_promo_caught, 100 * c.stateFlow.L6_wrong * 0.4 * want[held][0], 12, held + ' more caught at the first gate');
    near(c.measures.use_promo_strength, 100 * want[held][0], 12, held + ' catch chance added');
    near(c.measures.use_promo_caught_all, 100 * 0.4 * want[held][0] * (c.stateFlow.L6_wrong + c.stateFlow.L7_wrong + c.stateFlow.L8_wrong + c.stateFlow.L9_wrong), 12, held + ' caught at any gate');
  });
  ['top_first', 'cheap_ladder'].forEach(pol => {
    const a = E.evaluatePolicy(map, Object.assign({}, p, { p_promote: 0 }), pol, stocks).overall, b = E.evaluatePolicy(map, Object.assign({}, p, { p_promote: 1, k_promo_exact: 1 }), pol, stocks).overall;
    assert(a.cost === b.cost && a.wrong === b.wrong, pol + ' moved by promoted checks');
    near(b.measures.use_promo_strength, 0, 15, pol + ' has promoted checks');
  });
});

test('R21: promoted checks never lower the catch chance; it equals 1 - (1 - g)(1 - promo) in every class; a larger p_promote never lowers it; conservation holds with promotion at its top', () => {
  const random = E.rng(2121);
  const wide = JSON.parse(JSON.stringify(real));
  wide.parameters.forEach(r => { const p = map.parameters.find(x => x.id === r.id); if (p.kind === 'chance' || p.kind === 'fraction') { r.low = 0; r.high = 1; } });
  const kinds = ['visible', 'latent'], helds = ['exact', 'similar', 'composite', 'nothing'];
  for (let i = 0; i < 120; i++) {
    const q = E.prepareParams(map, E.drawParams(map, i % 2 ? wide : real, random, { tie: [0, 0.5, 1][i % 3], levels: levelsFrom(random) })).values;
    if (i % 10 === 0) Object.assign(q, { p_promote: 1, k_promo_exact: 1, k_promo_similar: 1, c_check_share: 1 });
    const stocks = randomStocks(random);
    if (i % 7 === 0) stocks.E_bad = 0;
    const ws = stocks.E_bad / (stocks.E_good + stocks.E_bad);
    const r = E.conservation(map, q, { stocks });
    assert(r.ok, 'draw ' + i + ': ' + r.problems.slice(0, 2).join('; '));
    kinds.forEach(kind => helds.forEach(held => {
      const cls = { kind, need: 'cheap_wrong', held, distractor: 'no' };
      const c = E.evaluateClass(map, q, 'library', cls, stocks);
      const c0 = E.evaluateClass(map, Object.assign({}, q, { p_promote: 0 }), 'library', cls, stocks);
      const cUp = E.evaluateClass(map, Object.assign({}, q, { p_promote: Math.min(1, q.p_promote + 0.3) }), 'library', cls, stocks);
      if (!(c.stateFlow.L6_wrong > 1e-9)) return;
      const gl = c.branchFlow.l6_caught / c.stateFlow.L6_wrong, g = c0.branchFlow.l6_caught / c0.stateFlow.L6_wrong, gu = cUp.branchFlow.l6_caught / cUp.stateFlow.L6_wrong;
      assert(gl >= g - 1e-12, 'draw ' + i + ' ' + kind + ' ' + held + ': promoted checks lowered the catch chance');
      assert(gu >= gl - 1e-12, 'draw ' + i + ' ' + kind + ' ' + held + ': more promotion lowered the catch chance');
      const k = held === 'exact' ? q.k_promo_exact : held === 'similar' ? q.k_promo_similar : 0;
      const promo = k * (1 - ws) * q.c_check_share * q.p_promote;
      near(gl, 1 - (1 - g) * (1 - promo), 10, 'draw ' + i + ' ' + kind + ' ' + held + ' g_lib');
    }));
  }
});

test('R21: with p_promote at 0 every number of revision 3 comes back (time paths of random draws, revision-3 engine and map)', () => {
  const rr = E3.rng(4405);
  for (let i = 0; i < 30; i++) {
    const p3 = E3.drawParams(map3, t3, rr, { tie: [0, 0.5, 1][i % 3], level: rr() });
    const p4 = Object.assign({}, p3, { p_promote: 0, k_promo_exact: rr(), k_promo_similar: rr() });
    const a = E.timePath(map, p4), b = E3.timePath(map3, p3);
    b.periods.forEach((row, t) => {
      E.RATIO_IDS.forEach(r => assert(a.periods[t].ratios[r] === row.ratios[r], 'draw ' + i + ' period ' + t + ' ' + r));
      Object.keys(row.library.measures).forEach(m => assert(a.periods[t].library.measures[m] === row.library.measures[m], 'draw ' + i + ' ' + m));
      Object.keys(row.stocks).forEach(s => assert(a.periods[t].stocks[s] === row.stocks[s], 'draw ' + i + ' stock ' + s));
    });
  }
});

test('R21: the promoted-check pathway is drawn in the map (a link from the good stock to the gate, via promo, with no lookup) and its measure is the class-by-class sum', () => {
  assert(map.links.length === 1, 'one link');
  const l = map.links[0];
  assert(l.id === 'promoted_checks' && l.from_stock === 'E_good' && l.via === 'promo' && l.lookup === false && l.policy === 'library', 'link');
  const gates = ['l6_caught', 'l6_escaped', 'l7_caught', 'l7_escaped', 'l8_caught', 'l8_escaped', 'l9_caught', 'l9_escaped'];
  assert(JSON.stringify(l.to_branches) === JSON.stringify(gates), 'the gate branches');
  gates.forEach(id => assert(map.branches.find(b => b.id === id).chance === (/_caught$/.test(id) ? 'g_lib' : '1 - g_lib'), id));
  assert(map.derived.find(d => d.id === 'promo').expr === '(held_exact * k_promo_exact + held_similar * k_promo_similar) * (1 - wrong_share) * c_check_share * p_promote', 'promo as written');
  assert(l.loops.length >= 1 && l.loops.every(x => x.polarity === 'R' || x.polarity === 'B'), 'loops');
  R21_IDS.forEach(id => { const r = realRows[id]; assert(r.side === 'library' && r.good_end === 'high' && r.lib_group === 'quality' && r.tag === 'G', id); });
  assert(realRows.p_promote.low === 0 && realRows.p_promote.best === 0.5 && realRows.p_promote.high === 1, 'p_promote range');
  assert(realRows.k_promo_exact.low === 0.3 && realRows.k_promo_exact.best === 0.7 && realRows.k_promo_exact.high === 0.95, 'k_promo_exact range');
  assert(realRows.k_promo_similar.low === 0 && realRows.k_promo_similar.best === 0.05 && realRows.k_promo_similar.high === 0.3, 'k_promo_similar range');
  // no funnel stage counts the gate
  map.funnels.forEach(f => f.stages.forEach(id => { const m = map.measures.find(x => x.id === id); assert(!JSON.stringify(m).includes('L6_'), id + ' reaches the gate'); }));
  assert(map.promo_measure === 'fw_promo_caught', 'the promoted-check measure');
  ['use_promo_caught_first', 'use_promo_caught_all', 'use_promo_strength'].forEach(id => assert(map.usage_measures.includes(id), id + ' not a usage measure'));
  // a broken link is refused when the map compiles
  const bad = JSON.parse(JSON.stringify(map));
  bad.links[0].to_branches = ['l1_lookup'];
  let threw = false; try { E.compile(bad); } catch (e) { threw = /does not use promo/.test(e.message); }
  assert(threw, 'a link to a branch that does not use promo was accepted');
  // the measure, summed class by class here
  const stocks = { E_good: 120, E_bad: 40 }, p = realBest;
  const ev = E.evaluatePolicy(map, p, 'library', stocks);
  const ws = 40 / 160;
  let num = 0, den = 0, all1 = 0, allAny = 0, str = 0;
  ['visible', 'latent'].forEach(kind => ['cheap_ok', 'cheap_wrong'].forEach(need => ['exact', 'similar', 'composite', 'nothing'].forEach(held => ['yes', 'no'].forEach(d => {
    const c = E.evaluateClass(map, p, 'library', { kind, need, held, distractor: d }, stocks);
    const gt = kind === 'visible' ? p.g_tests_visible : p.g_tests_latent;
    const g = 1 - (1 - gt) * (1 - p.s_review * p.g_review);
    const promo = (held === 'exact' ? p.k_promo_exact : held === 'similar' ? p.k_promo_similar : 0) * (1 - ws) * p.c_check_share * p.p_promote;
    const extra = (1 - g) * promo;
    if (need === 'cheap_wrong') { num += c.chance * c.stateFlow.L6_wrong * extra; den += c.chance; }
    all1 += c.chance * c.stateFlow.L6_wrong * extra;
    allAny += c.chance * extra * (c.stateFlow.L6_wrong + c.stateFlow.L7_wrong + c.stateFlow.L8_wrong + c.stateFlow.L9_wrong);
    str += c.chance * promo;
  }))));
  near(ev.overall.measures.fw_promo_caught, 100 * num / den, 10, 'fw_promo_caught');
  near(ev.overall.measures.use_promo_caught_first, 100 * all1, 10, 'use_promo_caught_first');
  near(ev.overall.measures.use_promo_caught_all, 100 * allAny, 10, 'use_promo_caught_all');
  near(ev.overall.measures.use_promo_strength, 100 * str, 10, 'use_promo_strength');
  assert(ev.overall.measures.use_promo_caught_all >= ev.overall.measures.use_promo_caught_first, 'any gate below the first gate');
  assert(ev.overall.measures.fw_promo_caught > 0, 'nothing caught through promoted checks at the middle values');
});

