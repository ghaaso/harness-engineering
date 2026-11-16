'use strict';
// Read-only audit of the arms: graph counts, loss curves, per-config alone P@10, fold/unscored counts.
const L = require('C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/coord/audit10/stats/lib.js');
const { core, LANE, SEEDS, path, fs } = L;
const OUT = __dirname;
const res = { graphs: {}, loss: {}, alone: {}, counts: {}, stageA: {} };
const plan = JSON.parse(fs.readFileSync(path.join(LANE, 'train/stageB/plan.json'), 'utf8'));

// 1. graphs
function readTsv(p) { return fs.readFileSync(p, 'utf8').split('\n').slice(1).filter(x => x.length).map(l => l.split('\t')); }
const shas = ['cd806c803c4ad8ec198790096d196460789951f0', '7b3a745281898d3d5808c5a15c4916d1d9dbb1b4', plan.checkpoints[0]];
for (const sha of shas) {
  const d = path.join(LANE, 'export/graphs0', sha);
  const sz = JSON.parse(fs.readFileSync(path.join(d, 'sizes.json'), 'utf8'));
  const ents = readTsv(path.join(d, 'entities.tsv'));
  const tri = readTsv(path.join(d, 'triples.tsv'));
  const uniq = new Set(tri.map(t => t.join('\u0001')));
  const rels = {}; for (const t of tri) rels[t[1]] = (rels[t[1]] || 0) + 1;
  const eid = new Set(ents.map(e => e[0]));
  const inTri = new Set(); for (const t of tri) { inTri.add(t[0]); inTri.add(t[2]); }
  const missing = [...inTri].filter(e => !eid.has(e)).length;
  const isolated = [...eid].filter(e => !inTri.has(e));
  const co = new Set(tri.filter(t => t[1] === 'co_changed').map(t => t[0] + '|' + t[2]));
  let asym = 0; for (const k of co) { const [a, b] = k.split('|'); if (!co.has(b + '|' + a)) asym++; }
  const selfloops = tri.filter(t => t[0] === t[2]).length;
  let relMismatch = []; for (const r in sz.triples_by_relation) if (sz.triples_by_relation[r] !== rels[r]) relMismatch.push([r, sz.triples_by_relation[r], rels[r]]);
  for (const r in rels) if (!(r in sz.triples_by_relation)) relMismatch.push([r, null, rels[r]]);
  const kinds = {}; for (const e of ents) kinds[e[1]] = (kinds[e[1]] || 0) + 1;
  const areas = {}; for (const e of ents) areas[e[4]] = (areas[e[4]] || 0) + 1;
  const invInFile = Object.keys(rels).filter(r => r.endsWith('__inv')).length;
  res.graphs[sha] = { sizes: { entities: sz.entities, triples: sz.triples, relations: sz.relations, co: sz.co_changed_triples, minConf: sz.minConf },
    counted: { entity_rows: ents.length, triple_rows: tri.length, unique_triples: uniq.size, relations: Object.keys(rels).length, co: rels.co_changed || 0,
      entities_in_triples: inTri.size, triple_entities_missing_from_entities_tsv: missing, isolated_entities: isolated.length, isolated_sample: isolated.slice(0, 5),
      co_changed_asymmetric: asym, self_loops: selfloops, relation_count_mismatches: relMismatch, inverse_relations_in_file: invInFile,
      relations_with_explicit_inverse_in_training: Object.keys(rels).length * 2, kinds, areas } };
}

// 2. loss curves of stage-B parts
const P = path.join(LANE, 'train/stageB/parts');
const arms = ['E1', 'E2', 'E3', 'E4', 'E5'];
const counts = {};
for (const a of arms) {
  res.loss[a] = {}; counts[a] = {};
  for (const c of plan.configs[a]) {
    const cid = c.config_id; const rows = []; const cnt = {};
    for (const s of SEEDS) {
      const ds = path.join(P, a, cid, 's' + s);
      for (const C of fs.readdirSync(ds)) {
        if (C.endsWith('.part') || C.endsWith('.model')) continue;
        const m = JSON.parse(fs.readFileSync(path.join(ds, C, 'meta.json'), 'utf8'));
        const cj = JSON.parse(fs.readFileSync(path.join(ds, C, 'counts.json'), 'utf8'));
        for (const tid in cj) for (const sc of ['pool', 'unrestricted']) for (const k in (cj[tid][sc] || {})) { const key = sc + '/' + k; cnt[key] = (cnt[key] || 0) + cj[tid][sc][k]; }
        if (m.trained === false || !m.losses) { cnt.untrained_parts = (cnt.untrained_parts || 0) + 1; continue; }
        const Ls = m.losses; let mi = 0; for (let i = 1; i < Ls.length; i++) if (Ls[i] < Ls[mi]) mi = i;
        rows.push({ first: Ls[0], min: Ls[mi], argmin: mi + 1, last: Ls[Ls.length - 1], n: Ls.length, epochs: m.epochs });
      }
    }
    const med = (f) => { const v = rows.map(f).sort((x, y) => x - y); return v[Math.floor(v.length / 2)]; };
    res.loss[a][cid] = { units: rows.length, planned_epochs: c.epochs, epochs_all_equal_plan: rows.every(r => r.n === c.epochs && r.epochs === c.epochs),
      median_first: med(r => r.first), median_min: med(r => r.min), median_argmin_epoch: med(r => r.argmin), median_last: med(r => r.last),
      share_last_above_min_by_10pct: rows.filter(r => r.last > 1.1 * r.min).length / rows.length,
      median_last_over_first: med(r => r.last / r.first), max_last_over_first: Math.max(...rows.map(r => r.last / r.first)) };
    counts[a][cid] = cnt;
  }
}
res.counts = counts;

// 3. stage-A curves of the top 3
const top = JSON.parse(fs.readFileSync(path.join(LANE, 'train/stageA/top3.json'), 'utf8'));
for (const a of arms) {
  res.stageA[a] = top[a].top3.map(r => { const m = JSON.parse(fs.readFileSync(path.join(LANE, 'train/stageA', a, r.config_id, 'meta.json'), 'utf8'));
    return { cid: r.config_id, best_epoch: m.best_epoch, epochs: m.epochs, val: m.val.map(v => [v[0], +v[1].toFixed(3)]), loss_first: m.losses[0], loss_min: Math.min(...m.losses), loss_last: m.losses[m.losses.length - 1], untrained_entities: m.untrained_entities, kind: m.kind, specialist_triples: m.specialist_triples }; });
}

// 4. alone pool P@10 per config (late 50, seed mean), from the assembled tables
const tasks = core.readJsonl(path.join(LANE, 'eval/tune_tasks.jsonl'));
const late = tasks.filter(t => t.late50);
const cands = L.readCands('pool');
const lateCommits = new Set(late.map(t => t.commit));
for (const a of arms) {
  res.alone[a] = {};
  for (const c of plan.configs[a]) {
    const pts = SEEDS.map(s => L.evalTable(core.readScoreTable(path.join(LANE, 'train/stageB/tables', a + '_' + c.config_id + '_s' + s + '_pool.tsv.gz')), cands, late));
    const ms = L.meanSeeds(pts);
    res.alone[a][c.config_id] = { epochs: c.epochs, cfg: c.cfg, late50_pool: L.summary(ms, late, lateCommits).map(x => +x.toFixed(4)) };
  }
}
for (const comp of ['RRF', 'PPR', 'CO']) {
  const f = path.join(LANE, 'eval/comparators/' + comp + '_pool.tsv.gz');
  if (fs.existsSync(f)) res.alone['ref_' + comp] = L.summary(L.evalTable(core.readScoreTable(f), cands, late), late, lateCommits).map(x => +x.toFixed(4));
}
fs.writeFileSync(path.join(OUT, 'arms1.out.json'), JSON.stringify(res, null, 1));
console.log('done');
