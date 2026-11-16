test('R18b: at tie 1 every library-side unknown sits at its own group\'s level, counted from its poor end; two groups differ; other unknowns keep their own draws; at tie 0.5 the quantile is half the level plus half the own draw', () => {
  let differ = 0, runs = 0;
  [table, real].forEach((tb, k) => {
    const rows = E.tableRows(tb);
    const r0 = E.rng(55 + k), r1 = E.rng(55 + k), r5 = E.rng(55 + k), lv = E.rng(99 + k);
    for (let i = 0; i < 200; i++) {
      const U = levelsFrom(lv);
      const d0 = E.drawParams(map, tb, r0);
      const d1 = E.drawParams(map, tb, r1, { tie: 1, levels: U });
      const d5 = E.drawParams(map, tb, r5, { tie: 0.5, levels: U });
      const seen = {};
      map.parameters.forEach(p => {
        const row = rows[p.id];
        if (p.run_setting || row.low === row.high) return;
        const log = row.dist === 'log';
        const pos = v => log ? (Math.log(v) - Math.log(row.low)) / (Math.log(row.high) - Math.log(row.low)) : (v - row.low) / (row.high - row.low);
        if (row.side !== 'library') {
          assert(d1[p.id] === d0[p.id] && d5[p.id] === d0[p.id], p.id + ' (other side) changed with the tie');
          return;
        }
        const fromPoor = v => row.good_end === 'high' ? pos(v) : 1 - pos(v);
        near(fromPoor(d1[p.id]), U[row.lib_group], 9, 'tie 1, ' + p.id);
        near(fromPoor(d5[p.id]), 0.5 * U[row.lib_group] + 0.5 * fromPoor(d0[p.id]), 9, 'tie 0.5, ' + p.id);
        seen[row.lib_group] = fromPoor(d1[p.id]);
      });
      runs++;
      if (Math.abs(seen.reach - seen.quality) > 1e-6 && Math.abs(seen.recurrence - seen.running_cost) > 1e-6) differ++;
    }
  });
  assert(differ === runs, 'two groups sat at the same level in ' + (runs - differ) + ' runs');
  // by hand, own draw 0.7 for every row, tie 0.5, levels: recurrence 0.2, reach 0.6, quality 0.9, running cost 0.1.
  //   k_fill (recurrence, good end low, 10 to 300): quantile from the poor (high) end 0.5 * 0.2 + 0.5 * (1 - 0.7) = 0.25
  //     -> 300 - 0.25 * 290 = 227.5.
  //   t_visible (reach, good end high, 0.2 to 1): 0.5 * 0.6 + 0.5 * 0.7 = 0.65 -> 0.2 + 0.65 * 0.8 = 0.72.
  //   e_right (quality, good end high, 0.35 to 0.95): 0.5 * 0.9 + 0.5 * 0.7 = 0.8 -> 0.35 + 0.8 * 0.6 = 0.83.
  //   c_lookup (running cost, good end low, 0.1 to 2): 0.5 * 0.1 + 0.5 * (1 - 0.7) = 0.2 -> 2 - 0.2 * 1.9 = 1.62.
  //   p_visible (other side, 0.1 to 0.8): its own draw, 0.1 + 0.7 * 0.7 = 0.59.
  const L = { recurrence: 0.2, reach: 0.6, quality: 0.9, running_cost: 0.1 };
  const one = E.drawParams(map, real, () => 0.7, { tie: 0.5, levels: L, added: () => 0.7 });
  near(one.k_fill, 227.5, 9, 'k_fill by hand');
  near(one.t_visible, 0.72, 12, 't_visible by hand');
  near(one.e_right, 0.83, 12, 'e_right by hand');
  near(one.c_lookup, 1.62, 12, 'c_lookup by hand');
  near(one.p_visible, 0.59, 12, 'p_visible by hand');
  // p_promote (quality, 0 to 1, from the added stream): 0.5 * 0.9 + 0.5 * 0.7 = 0.8
  near(one.p_promote, 0.8, 12, 'p_promote by hand');
  let threw = 0;
  try { E.drawParams(map, real, E.rng(1), { tie: 0.5 }); } catch (e) { threw++; }
  try { E.drawParams(map, real, E.rng(1), { tie: 0.5, levels: { recurrence: 0.1, reach: 0.2, quality: 0.3 } }); } catch (e) { threw++; }
  assert(threw === 2, 'a tie above 0 without a level for every group was accepted');
});

test('R18b: tie 0 equals the frozen revision-3 tie-0 ensemble draw for draw; with p_promote pinned at 0 every reported number is equal too; the R21 unknowns come from their own stream', () => {
  const a3 = E3.ensemble(map3, t3, { n: 150, seed: 77, tie: 0, keepDraws: true });
  const a4 = E.ensemble(map, real, { n: 150, seed: 77, tie: 0, keepDraws: true });
  const p4 = E.ensemble(map, pinned, { n: 150, seed: 77, tie: 0, keepDraws: true });
  a3.draws.forEach((d, i) => {
    map3.parameters.forEach(p => {
      assert(a4.draws[i].params[p.id] === d.params[p.id], 'run ' + i + ' ' + p.id + ' differs from revision 3');
      assert(p4.draws[i].params[p.id] === d.params[p.id], 'pinned run ' + i + ' ' + p.id);
    });
    E.RATIO_IDS.forEach(r => assert(p4.draws[i].last[r] === d.last[r] && p4.draws[i].first[r] === d.first[r], 'pinned run ' + i + ' ratio ' + r));
  });
  ['first', 'last'].forEach(at => {
    Object.keys(a3.spread[at]).forEach(k => assert(JSON.stringify(p4.spread[at][k]) === JSON.stringify(a3.spread[at][k]), 'spread ' + at + ' ' + k));
    E.RATIO_IDS.forEach(r => assert(JSON.stringify(p4.spearman[at][r].filter(e => !R21_IDS.includes(e.id))) === JSON.stringify(a3.spearman[at][r]), 'rank ' + at + ' ' + r));
  });
  assert(JSON.stringify(p4.shareBetterVs) === JSON.stringify(a3.shareBetterVs), 'shares');
  const pp = a4.draws.map(d => d.params.p_promote);
  assert(Math.max(...pp) - Math.min(...pp) > 0.8, 'p_promote is not drawn');
  // without an added stream, drawParams still never reads the main stream for the R21 unknowns
  const r4 = E.rng(5), r3 = E3.rng(5);
  for (let i = 0; i < 50; i++) {
    const a = E.drawParams(map, real, r4), b = E3.drawParams(map3, t3, r3);
    map3.parameters.forEach(p => assert(a[p.id] === b[p.id], 'draw ' + i + ' ' + p.id));
  }
  // each run reads four shared levels, in the order of lib_groups, from the shared stream
  const t1 = E.ensemble(map, real, { n: 30, seed: 8, tie: 1, keepDraws: true });
  const sh = E.ensembleStreams(8).shared;
  t1.draws.forEach((d, i) => GROUPS.forEach(g => assert(d.levels[g] === sh(), 'run ' + i + ' level ' + g)));
  // drawRun on the ensemble's streams gives the ensemble's draws
  const st = E.ensembleStreams(8);
  t1.draws.forEach((d, i) => { const r = E.drawRun(map, real, st, 1); map.parameters.forEach(p => assert(r.raw[p.id] === d.raw[p.id], 'drawRun ' + i + ' ' + p.id)); });
});

test('R18b: the tied ensemble is deterministic, reports its tie, keeps every share in range, and raises the spread of the library-side unknowns together', () => {
  const a = E.ensemble(map, real, { n: 120, seed: 21, tie: 1 });
  const b = E.ensemble(map, real, { n: 120, seed: 21, tie: 1 });
  assert(JSON.stringify(a) === JSON.stringify(b), 'not deterministic');
  assert(a.tie === 1, 'tie not reported');
  const z = E.ensemble(map, real, { n: 120, seed: 21, tie: 0 });
  ['first', 'last'].forEach(w => ['top_first', 'cheap_ladder'].forEach(pol => {
    assert(a.shareBetterVs[pol][w] >= 0 && a.shareBetterVs[pol][w] <= 1, 'share out of range');
  }));
  assert(a.spread.last.funnel_end && a.spread.last.funnel_end.p95 >= a.spread.last.funnel_end.p5, 'funnel end series missing');
  assert(a.spread.last.promo && a.spread.last.promo.p95 >= a.spread.last.promo.p5, 'promoted-check series missing');
  const width = e => e.spread.last.funnel_end.p95 - e.spread.last.funnel_end.p5;
  assert(width(a) > width(z), 'tying did not widen the funnel end');
  for (const r of ['top_cost', 'ladder_cost', 'top_wrong', 'ladder_wrong']) {
    assert(JSON.stringify(a.spread.last[r]) === JSON.stringify(z.spread.last[r]), r + ' changed with the tie');
  }
});

test('R18: every library-side unknown has the one lib_group the brief gives it, declared in the map with plain labels; other-side unknowns have none', () => {
  const want = {
    recurrence: ['u_exact', 'u_similar', 'u_composite', 'latent_coverage_factor', 'ok_coverage_factor', 'k_fill'],
    reach: ['t_visible', 't_latent', 'r_exact', 'r_similar', 'r_comp_full', 'r_comp_part', 'd_deliver', 'w_write'],
    quality: ['v_max', 'k_distract', 'f_false', 'c_check_share', 'a_right', 'a_wrong', 'q_exact', 'q_similar', 'q_comp', 'q_part', 'h_harm',
      'e_right', 'fix_on_found', 'delta_stale', 'retire_bad', 's_exact', 's_similar', 's_comp', 's_part'].concat(R21_IDS),
    running_cost: ['c_lookup', 'c_screen', 'c_carry', 'c_write']
  };
  assert(JSON.stringify(GROUPS) === JSON.stringify(Object.keys(want)), 'groups or their order: ' + GROUPS.join(','));
  map.lib_groups.forEach(g => ['label', 'short', 'poor', 'good'].forEach(k => assert(typeof g[k] === 'string' && g[k].length > 0, g.id + ' ' + k)));
  let lib = 0;
  real.parameters.forEach(r => {
    if (r.side === 'library') {
      lib++;
      assert(want[r.lib_group] && want[r.lib_group].includes(r.id), r.id + ' is in group ' + r.lib_group);
      assert(E.groupOf(map, r, r.id) === r.lib_group, r.id + ' read back');
    } else {
      assert(r.lib_group === undefined && E.groupOf(map, r, r.id) === null, r.id + ' (other side) has a group');
    }
  });
  assert(lib === Object.values(want).reduce((a, x) => a + x.length, 0), 'library-side count ' + lib);
  let threw = 0;
  [{ side: 'library', good_end: 'high' }, { side: 'library', good_end: 'high', lib_group: 'nonsense' }, { side: 'other', lib_group: 'reach' }].forEach(row => {
    try { E.groupOf(map, row, 'x'); } catch (e) { threw++; }
  });
  assert(threw === 3, 'groupOf accepted a bad row');
});

test('R18a: the reference settings are declared in the map (middle, eight corners, all_good, worst_corner and all_good_costly); "unfavourable" is retired; all_good is at least as good as middle on the funnel\'s last number', () => {
  const ids = map.reference_settings.map(r => r.id);
  assert(JSON.stringify(ids) === JSON.stringify(['middle', 'corner_000', 'corner_001', 'corner_010', 'corner_011', 'corner_100', 'corner_101', 'corner_110', 'corner_111', 'all_good', 'worst_corner', 'all_good_costly']), ids.join(','));
  const ref = E.references(map, real);
  assert(JSON.stringify(Object.keys(ref)) === JSON.stringify(ids), 'references() order');
  const LV = ['poor', 'good'];
  map.reference_settings.forEach(s => {
    if (/^corner_/.test(s.id)) {
      const d = s.id.slice(7).split('').map(Number);
      assert(s.levels.recurrence === LV[d[0]] && s.levels.reach === LV[d[1]] && s.levels.quality === LV[d[2]] && s.levels.running_cost === undefined, s.id + ' levels');
    }
    map.parameters.forEach(p => {
      const r = realRows[p.id];
      const v = ref[s.id].params[p.id];
      if (r.side === 'other' || p.run_setting) { near(v, r.best, 15, s.id + ' other side at middle ' + p.id); return; }
      const lv = s.levels[r.lib_group];
      near(v, lv === 'good' ? goodEnd(r) : lv === 'poor' ? poorEnd(r) : r.best, 15, s.id + ' ' + p.id);
    });
  });
  assert(JSON.stringify(map.reference_settings.find(s => s.id === 'worst_corner').levels) === JSON.stringify({ recurrence: 'good', reach: 'good', quality: 'poor', running_cost: 'poor' }), 'worst corner');
  assert(GROUPS.every(g => map.reference_settings.find(s => s.id === 'all_good').levels[g] === 'good'), 'all_good');
  assert(map.funnel_mark === 'all_good', 'the funnel mark');
  ['first', 'last'].forEach(w => assert(ref.all_good[w].funnel_end >= ref.middle[w].funnel_end - 1e-12, w + ': all_good below middle'));
  // the other ways of working are the same in every setting
  ids.forEach(id => ['top_first', 'cheap_ladder'].forEach(pol => {
    near(ref[id][pol].cost, ref.middle[pol].cost, 12, id + ' ' + pol + ' cost');
    near(ref[id][pol].wrong, ref.middle[pol].wrong, 12, id + ' ' + pol + ' wrong');
  }));
  // the same order on random tables whose middle values are drawn inside the real ranges
  const random = E.rng(315);
  for (let i = 0; i < 15; i++) {
    const t2 = JSON.parse(JSON.stringify(real));
    const d = E.drawParams(map, real, random);
    t2.parameters.forEach(r => { if (!r.run_setting) r.best = Math.min(r.high, Math.max(r.low, d[r.id])); });
    const f = E.funnel(map, E.referenceParams(map, t2, 'all_good')).end;
    const b = E.funnel(map, E.referenceParams(map, t2, 'middle')).end;
    assert(f >= b - 1e-12, 'random middle ' + i + ': all_good ' + f + ' below middle ' + b);
  }
  // a numeric level: 0 is the poor end, 1 the good end, 0.5 the midpoint of the range counted from the poor end
  const a = E.settingParams(map, real, { reach: 0 }), b = E.settingParams(map, real, { reach: 1 }), c = E.settingParams(map, real, { reach: 0.5 });
  near(a.t_visible, realRows.t_visible.low, 15, 'level 0'); near(b.t_visible, realRows.t_visible.high, 15, 'level 1');
  near(c.t_visible, (realRows.t_visible.low + realRows.t_visible.high) / 2, 12, 'level 0.5');
  // retired and undeclared names are refused
  ['unfavourable', 'favourable', 'best'].forEach(w => { let threw = false; try { E.referenceParams(map, real, w); } catch (e) { threw = true; } assert(threw, w + ' accepted'); });
  const engineText = fs.readFileSync(path.join(dir, 'engine.js'), 'utf8');
  [['map.json', JSON.stringify(map)], ['params.json', JSON.stringify(real)], ['limitations.json', JSON.stringify(lims)], ['engine.js', engineText]].forEach(([n, txt]) => {
    assert(!/unfavourable/i.test(txt), n + ' still says unfavourable');
  });
});

