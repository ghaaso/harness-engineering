'use strict';
// Writes results/bench/plan.json: the two graphs, the seeds, the configurations and the query classes of
// the engine benches (protocol addendum 4, section E). Deterministic: run it twice, get the same file.
//   node bench/prep.js            (inside graphtest:1; reads facts/cache, tasks/ and the arm lists only)
// Inputs read: tasks.jsonl through harness.loadTasks(..., 'tune') (TUNE lines only), the TUNE lines of
// tq_questions.jsonl, facts of the TUNE parents and of the frozen commit, the arms' configuration lists
// (loaded without logging). Nothing held-out is read or run; no arm is opened.
const fs = require('fs');
const path = require('path');
const L = require('./lib');
const H = require('../arms/common/harness');
const C = require('../arms/common/config');
const { mapSeed } = require('../arms/common/seed');

const N_SEEDS = 200; const N_CALIB = 20;
const SEED_TUNE = 20261113; const SEED_FROZEN = 20261114;

// configurations of addendum 4, found by hash in the arms' own lists
const WANT = {
  primary: { hash: '95e990307da3b42b', role: 'typed primary (relational, LadybugDB, DuckPGQ)' },
  S1: { hash: '6b70cc1222745385', role: 'S1, the selection rule as first written (hops=4, PPR)' },
  base: { hash: '8067b9cf65e59b2f', role: 'the 2-hop base configuration (stage-1 BASE of every typed arm)' },
  S2: { hash: 'f233ae069bdba0ce', role: 'LadybugDB S2 (PPR fused with the stored community prior; native engine mode)' },
  search_primary: { hash: 'e70177e5807f0252', role: 'search primary (not an engine: not timed here)' },
  search_S2: { hash: '950c029615d337c1', role: 'search S2 (not an engine: not timed here)' },
  floor_dir: { hash: '714a474060653c1f', role: 'DIR floor (not an engine: not timed here)' },
  floor_co: { hash: 'c4d2f0a60a3d199c', role: 'CO floor (not an engine: not timed here)' },
};
const LISTS = [['relational', 1], ['relational', 2], ['reference', 1], ['reference', 2], ['ladybug', 1], ['ladybug', 2], ['duckpgq', 1], ['duckpgq', 2], ['search', 1], ['search', 2], ['floor-dir', 1], ['floor-co', 1]];

function findConfigs() {
  const found = {};
  for (const [arm, st] of LISTS) {
    const Ls = H.loadArmList(arm, st, false); // false: no line appended to results/sweep/lists.jsonl
    for (const x of Ls.list) for (const [k, w] of Object.entries(WANT)) {
      if (x.hash !== w.hash) continue;
      if (C.configHash(x.cfg) !== w.hash) throw new Error('hash mismatch ' + k);
      (found[k] = found[k] || { hash: w.hash, role: w.role, config: x.cfg, found_in: [] }).found_in.push({ arm, stage: st, name: x.name, list_hash: Ls.hash });
    }
  }
  for (const k of Object.keys(WANT)) if (!found[k]) throw new Error('configuration ' + k + ' ' + WANT[k].hash + ' not found in any arm list');
  return found;
}

function main() {
  const t0 = L.now();
  const configs = findConfigs();
  const all = H.loadTasks(['T1', 'T1x', 'T2', 'T3', 'T4'], 'tune');
  const parents = [...new Set(all.map((t) => t.parent))].sort();
  const sizes = [];
  for (const sha of parents) { const { G } = L.graphFacts(sha); sizes.push({ sha, nodes: G.nodes.length, edges: G.edges.length }); }
  sizes.sort((a, b) => b.edges - a.edges || b.nodes - a.nodes || (a.sha < b.sha ? -1 : 1));
  const largest = sizes[0];
  const Gt = L.graphFacts(largest.sha).G;
  // seeds on the TUNE parent: seeded draw of distinct TUNE T1 task seeds, mapped onto that graph
  const t1 = H.loadTasks(['T1'], 'tune');
  const seen = new Set(); const uniq = [];
  for (const t of t1) { const k = t.seed.path + '#' + (t.seed.symbol ? t.seed.symbol.name + ':' + t.seed.symbol.start : ''); if (!seen.has(k)) { seen.add(k); uniq.push(t); } }
  const take = []; const skipped = [];
  for (const t of L.shuffle(uniq, SEED_TUNE)) {
    if (take.length >= N_SEEDS + N_CALIB) break;
    const m = mapSeed(Gt, t.seed);
    if (!m.fileFound || !m.ids.length) { skipped.push({ id: t.id, path: t.seed.path, why: 'file not in this graph' }); continue; }
    take.push({ task: t.id, task_parent_is_this_graph: t.parent === largest.sha, ids: m.ids, match: m.match, seed: t.seed });
  }
  if (take.length < N_SEEDS + N_CALIB) throw new Error('only ' + take.length + ' mappable TUNE T1 seeds');
  // seeds on the frozen commit: seeded random file nodes (no task involved)
  const Gf = L.graphFacts(L.P.FROZEN).G;
  const files = Gf.nodes.filter((n) => n.kind === 'file');
  const fdraw = L.shuffle(files, SEED_FROZEN).slice(0, N_SEEDS + N_CALIB).map((n) => ({ node: n.sid, ids: [n.i], seed: { path: n.path, symbol: null } }));
  // the 20 TUNE questions (inputs only)
  const tq = fs.readFileSync(path.join(L.P.TASKS, 'tq_questions.jsonl'), 'utf8').split('\n').filter(Boolean).map(JSON.parse).filter((q) => q.split === 'tune');
  if (tq.some((q) => q.split !== 'tune')) throw new Error('held-out question');
  const rankCls = (key, engines) => ({ key, kind: 'rank', config_hash: configs[key].hash, role: configs[key].role, config: configs[key].config, graphs: ['tune', 'frozen'], engines });
  const plan = {
    note: 'Engine bench plan (addendum 4 section E). TUNE inputs only. Seeds: tune = seeded draw (mulberry32 ' + SEED_TUNE + ') of distinct TUNE T1 task seeds mapped onto the largest TUNE parent graph (first ' + N_SEEDS + ' measured, next ' + N_CALIB + ' for the thread calibration); frozen = seeded draw (mulberry32 ' + SEED_FROZEN + ') of file nodes of the frozen commit.',
    n_seeds: N_SEEDS, n_calib: N_CALIB,
    graphs: {
      tune: { sha: largest.sha, nodes: Gt.nodes.length, edges: Gt.edges.length, why: 'the TUNE parent with the most canonical edges (ties: nodes)', seeds: take.slice(0, N_SEEDS), calib: take.slice(N_SEEDS), skipped_unmappable: skipped.length, seeds_from_tasks_of_this_parent: take.slice(0, N_SEEDS).filter((x) => x.task_parent_is_this_graph).length },
      frozen: { sha: L.P.FROZEN, nodes: Gf.nodes.length, edges: Gf.edges.length, file_nodes: files.length, seeds: fdraw.slice(0, N_SEEDS), calib: fdraw.slice(N_SEEDS) },
    },
    tune_parent_sizes: sizes,
    configs,
    classes: [
      rankCls('primary'), rankCls('S1'), rankCls('base'), rankCls('S2', ['ladybug']),
      { key: 'tq', kind: 'tq', role: 'the 20 TUNE question lookups (frozen commit)', graphs: ['frozen'] },
    ],
    tq,
  };
  plan.plan_hash = C.hash(plan);
  fs.mkdirSync(path.dirname(L.PLAN_FILE), { recursive: true });
  fs.writeFileSync(L.PLAN_FILE, JSON.stringify(plan, null, 1));
  console.log(JSON.stringify({ plan: L.PLAN_FILE, plan_hash: plan.plan_hash, tune: { sha: largest.sha, nodes: plan.graphs.tune.nodes, edges: plan.graphs.tune.edges, skipped: skipped.length, own_parent: plan.graphs.tune.seeds_from_tasks_of_this_parent }, frozen: { nodes: Gf.nodes.length, edges: Gf.edges.length, files: files.length }, tq: tq.length, ms: Math.round(L.now() - t0) }));
}

main();
