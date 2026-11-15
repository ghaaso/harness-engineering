'use strict';
// Smoke checks for the search-fix lane (TUNE only; the harness refuses held-out anyway).
//  1. Each floor arm (floor-dir, floor-co) gives, for all 8 of its configurations, an answer identical
//     to the built-in arm `none` with the same pad (fields arm, ms, engine_ms, lookups ignored).
//  2. The search arm is deterministic: two separate opens give byte-identical ranked lists for every
//     stage-1 configuration (ms and engine_ms ignored).
//  3. The search ranked list does not depend on granularity, form or pad (one rankKey = one list).
//   node floor_check.js --tasks id,id,...
const path = require('path');
const B = process.env.GT_BUILD || path.resolve(__dirname, '..', '..');
const H = require(path.join(B, 'arms/common/harness'));
const C = require(path.join(B, 'arms/common/config'));
const { graphFor, openArm } = require(path.join(B, 'arms/common/arms'));

async function main() {
  const i = process.argv.indexOf('--tasks');
  const ids = i > 0 ? process.argv[i + 1].split(',') : null;
  let tasks = H.loadTasks(['T1', 'T2'], 'tune');
  if (ids) tasks = tasks.filter((t) => ids.includes(t.id));
  const floors = { 'floor-dir': require(path.join(B, 'arms/floor-dir/configs')).CONFIGS, 'floor-co': require(path.join(B, 'arms/floor-co/configs')).CONFIGS };
  const list = H.loadArmList('search', 1, false).list;
  const byParent = new Map();
  for (const t of tasks) { if (!byParent.has(t.parent)) byParent.set(t.parent, []); byParent.get(t.parent).push(t); }
  const strip = (a) => JSON.stringify({ ...a, arm: null, ms: null, engine_ms: null, lookups: null });
  const st = { tasks: tasks.length, floor_compared: 0, floor_diff: 0, floor_lookups: {}, search_lists: 0, search_nondet: 0, rankkey_violations: 0 };
  for (const [parent, ts] of [...byParent].sort()) {
    const G = graphFor(parent);
    const none = await openArm('none', G);
    const fa = { 'floor-dir': await openArm('floor-dir', G), 'floor-co': await openArm('floor-co', G) };
    const s1 = await openArm('search', G); const s2 = await openArm('search', G);
    for (const t of ts) {
      const sm = H.mapSeed(G, t.seed);
      for (const [fname, cfgs] of Object.entries(floors)) {
        for (const c of cfgs) {
          const cfg = C.normalise(c);
          const ra = sm.ids.length ? await fa[fname].rank(sm.ids, cfg, t.seed) : [];
          const rn = sm.ids.length ? await none.rank(sm.ids, cfg, t.seed) : [];
          const a = H.answer(G, t, sm, ra, cfg, fname, 0); const b = H.answer(G, t, sm, rn, cfg, 'none', 0);
          st.floor_compared++; if (strip(a) !== strip(b)) st.floor_diff++;
          st.floor_lookups[fname] = a.lookups;
        }
      }
      if (!sm.ids.length) continue;
      const byKey = new Map();
      for (const c of list) {
        const r1 = H.normRank(await s1.rank(sm.ids, c.cfg, t.seed)); const r2 = H.normRank(await s2.rank(sm.ids, c.cfg, t.seed));
        st.search_lists++;
        if (JSON.stringify(r1.ranked) !== JSON.stringify(r2.ranked) || r1.lookups !== r2.lookups) st.search_nondet++;
        const k = C.rankKey(c.cfg); const sig = JSON.stringify(r1.ranked) + '|' + r1.lookups;
        if (byKey.has(k) && byKey.get(k) !== sig) st.rankkey_violations++;
        byKey.set(k, sig);
      }
    }
  }
  console.log(JSON.stringify(st));
}
main().catch((e) => { console.error(e); process.exit(1); });
