'use strict';
// Part 1: stitching and choice recomputation.
const L = require('./lib.js');
const { core, LANE, SEEDS, SCOPES, WS, path, fs } = L;
const OUT = __dirname;
const tasks = core.readJsonl(path.join(LANE, 'eval/tune_tasks.jsonl'));
const commitsJ = core.readJsonl(path.join(LANE, 'eval/tune_commits.jsonl'));
const plan = JSON.parse(fs.readFileSync(path.join(LANE, 'train/stageB/plan.json'), 'utf8'));
const cl = { pool: L.readCands('pool'), unrestricted: L.readCands('unrestricted') };
const comp = {};
for (const sc of SCOPES) comp[sc] = { PPR: core.readScoreTable(path.join(LANE, 'eval/comparators/PPR_' + sc + '.tsv.gz')), CO: core.readScoreTable(path.join(LANE, 'eval/comparators/CO_' + sc + '.tsv.gz')) };
const res = { checks: {}, arms: {} };
// date order checks
const order = new Map(tasks.map(t => [t.commit, t.date_order]));
const byAuthor = [...commitsJ].sort((a, b) => a.author_time - b.author_time || 0);
res.checks.date_order_matches_author_time = byAuthor.every((c, i) => c.date_order === i + 1);
res.checks.n_commits = commitsJ.length; res.checks.n_tasks = tasks.length;
res.checks.late50_is_date_order_gt15 = commitsJ.every(c => c.late50 === (c.date_order > 15));
res.checks.tasks_consistent_with_commits = tasks.every(t => { const c = commitsJ.find(x => x.commit === t.commit); return c && c.date_order === t.date_order && c.late50 === t.late50; });
const late = [...new Set(tasks.filter(t => t.late50).map(t => t.commit))].sort((a, b) => order.get(a) - order.get(b));
const blocks = []; for (let i = 0; i < 50; i += 10) blocks.push(late.slice(i, i + 10));
const byCommit = new Map(); for (const t of tasks) { if (!byCommit.has(t.commit)) byCommit.set(t.commit, []); byCommit.get(t.commit).push(t); }

function stdSE(v) { const n = v.length, m = L.mean(v); let ss = 0; for (const x of v) ss += (x - m) ** 2; return n > 1 ? Math.sqrt(ss / (n - 1)) / Math.sqrt(n) : 0; }
function size(cfg) { return [Number(cfg.embedding_dim || 0), Number(cfg.num_layers || 0)]; }
function cmpArr(a, b) { for (let i = 0; i < Math.max(a.length, b.length); i++) { const x = a[i], y = b[i]; if (x < y) return -1; if (x > y) return 1; } return 0; }
function stats(rows) {
  const st = rows.map(([key, cfg, w, v]) => ({ key, cfg, w, mean: L.mean(v), se: stdSE(v), n: v.length }));
  const top = Math.max(...st.map(s => s.mean));
  const tied = st.filter(s => s.mean === top).sort((a, b) => cmpArr([-a.se, a.key[0], a.w], [-b.se, b.key[0], b.w]));
  const best = tied[0];
  const band = st.filter(s => s.mean >= top - best.se);
  return { st, best, band };
}
function choose(rows) { const { st, best, band } = stats(rows); const pick = [...band].sort((a, b) => cmpArr([...size(a.cfg), -a.mean, a.key[0], a.w], [...size(b.cfg), -b.mean, b.key[0], b.w]))[0]; return { pick, st, best, band }; }
function chooseB(rows) { const { st, best, band } = stats(rows); const pick = [...band].sort((a, b) => cmpArr([...size(a.cfg), a.w, a.key[0], a.key[1]], [...size(b.cfg), b.w, b.key[0], b.key[1]]))[0]; return { pick, st, best, band }; }

const ARMS = (process.argv[2] ? process.argv.slice(2) : ['E1', 'E2', 'E3', 'E4', 'E5', 'PLACEBO']);
for (const arm of ARMS) {
  const t0 = Date.now();
  const R = { mismatches: [], maxdiff_fused: 0, maxdiff_alone: 0, rows_checked: 0 };
  const cj = JSON.parse(fs.readFileSync(path.join(LANE, 'train/selectB', arm, 'choices.json'), 'utf8'));
  let cfgs, embGet;
  const embCache = new Map();
  if (arm === 'PLACEBO') {
    cfgs = [['p1', {}], ['p2', {}], ['p3', {}]];
    embGet = (cid, s, sc, tid) => { const k = cid + s + sc + tid; if (!embCache.has(k)) embCache.set(k, L.placebo(s, tid, cl[sc].get(tid) || [], cid)); return embCache.get(k); };
  } else {
    cfgs = plan.configs[arm].map(c => [c.config_id, c.cfg]);
    const T = {};
    for (const [cid] of cfgs) for (const s of SEEDS) for (const sc of SCOPES) T[cid + '|' + s + '|' + sc] = core.readScoreTable(path.join(LANE, 'train/stageB/tables', arm + '_' + cid + '_s' + s + '_' + sc + '.tsv.gz'));
    embGet = (cid, s, sc, tid) => T[cid + '|' + s + '|' + sc].get(tid) || new Map();
  }
  const fusedCache = new Map();
  const fused = (cid, s, sc, w, t) => {
    const k = [cid, s, sc, w, t.task_id].join('|');
    if (!fusedCache.has(k)) { const tid = t.task_id; const cands = cl[sc].get(tid) || []; fusedCache.set(k, core.rrfScores(tid, cands, [[comp[sc].PPR.get(tid) || new Map(), 1], [comp[sc].CO.get(tid) || new Map(), 1], [embGet(cid, s, sc, tid), w]])); }
    return fusedCache.get(k);
  };
  const p10 = new Map();
  for (const [cid] of cfgs) for (const w of WS) for (const t of tasks) {
    const v = SEEDS.map(s => core.p10(core.rank(t.task_id, cl.pool.get(t.task_id) || [], fused(cid, s, 'pool', w, t)), t.truth));
    p10.set(cid + '|' + w + '|' + t.task_id, L.mean(v));
  }
  const pcv = (cid, w, cs) => cs.map(c => L.mean(byCommit.get(c).map(t => p10.get(cid + '|' + w + '|' + t.task_id))));
  const rowsFor = (cs, ws = WS) => { const r = []; for (const [cid, cfg] of cfgs) for (const w of ws) r.push([[cid, w], cfg, w, pcv(cid, w, cs)]); return r; };
  const variants = { '': choose, '_builder': chooseB };
  if (arm === 'PLACEBO') for (const w of WS) variants['_w' + w] = rows => choose(rows.filter(r => r[2] === w));
  const mine = {};
  for (const v in variants) {
    mine[v] = [];
    blocks.forEach((blk, bi) => {
      const first = order.get(blk[0]);
      const earlier = [...order.keys()].filter(c => order.get(c) < first).sort((a, b) => order.get(a) - order.get(b));
      const later_used = earlier.filter(c => order.get(c) >= first).length;
      const { pick, best, band } = variants[v](rowsFor(earlier));
      mine[v].push({ block: bi + 1, earlier: earlier.length, later_used, config_id: pick.key[0], w: pick.w, mean: pick.mean, se: pick.se, best: best.key, band: band.map(b => b.key.join('@')), band_margin: Math.min(...band.map(b => b.mean - (Math.max(...rowsFor(earlier).map(r => L.mean(r[3]))) - best.se))) });
    });
  }
  const stored = { '': cj.blocks, '_builder': cj.sensitivity_builder.blocks };
  if (arm === 'PLACEBO') for (const w of WS) stored['_w' + w] = cj.fixed_w[String(w)];
  R.choices = {};
  for (const v in mine) {
    R.choices[v || 'main'] = mine[v].map((m, i) => {
      const s = stored[v][i];
      const candOk = v === '' || v === '_builder' ? s.candidates.every(sc => { const r = rowsFor([...order.keys()].filter(c => order.get(c) < order.get(blocks[i][0])).sort((a, b) => order.get(a) - order.get(b))).find(r => r[0][0] === sc.config_id && r[0][1] === sc.w); return Math.abs(L.mean(r[3]) - sc.mean) < 1e-12 && Math.abs(stdSE(r[3]) - sc.se) < 1e-12; }) : null;
      return { block: m.block, mine: [m.config_id, m.w], stored: [s.config_id, s.w], same: m.config_id === s.config_id && m.w === s.w, earlier_mine: m.earlier, earlier_stored: s.earlier_commits, commits_same: JSON.stringify(s.commits) === JSON.stringify(blocks[i]), mean_diff: Math.abs(m.mean - s.mean), se_diff: Math.abs(m.se - s.se), candidates_match_1e12: candOk, band: m.band, min_band_margin: m.band_margin, later_used: m.later_used };
    });
  }
  // final all65
  const allc = [...order.keys()].sort((a, b) => order.get(a) - order.get(b));
  const f = choose(rowsFor(allc)), fb = chooseB(rowsFor(allc));
  R.final_all65 = { mine: [f.pick.key[0], f.pick.w, f.pick.mean, f.pick.se], stored: [cj.final_all65.config_id, cj.final_all65.w, cj.final_all65.mean, cj.final_all65.se], builder_mine: [fb.pick.key[0], fb.pick.w], builder_stored: [cj.sensitivity_builder.final_all65.config_id, cj.sensitivity_builder.final_all65.w], band: f.band.map(b => b.key.join('@')) };
  // stitched tables: compare using STORED choices
  for (const v in stored) {
    const assign = new Map(); stored[v].forEach((b, bi) => { for (const c of blocks[bi]) assign.set(c, b); });
    for (const s of SEEDS) for (const sc of SCOPES) {
      const kinds = v.startsWith('_w') ? ['fused'] : ['alone', 'fused'];
      for (const kind of kinds) {
        const fn = path.join(LANE, 'train/selectB', arm, kind + v + '_' + sc + '_s' + s + '.tsv.gz');
        const tab = core.readScoreTable(fn);
        const seen = new Set();
        for (const [c, ch] of assign) for (const t of byCommit.get(c)) {
          const tid = t.task_id; seen.add(tid);
          const want = kind === 'alone' ? embGet(ch.config_id, s, sc, tid) : fused(ch.config_id, s, sc, ch.w, t);
          const got = tab.get(tid) || new Map();
          if (got.size !== want.size) R.mismatches.push([fn, tid, 'size', got.size, want.size]);
          for (const [cand, x] of want) {
            R.rows_checked++;
            if (!got.has(cand)) { R.mismatches.push([fn, tid, cand, 'missing']); continue; }
            const d = Math.abs(got.get(cand) - x);
            if (kind === 'alone') R.maxdiff_alone = Math.max(R.maxdiff_alone, d); else R.maxdiff_fused = Math.max(R.maxdiff_fused, d);
            if (!(d <= 1e-12)) R.mismatches.push([fn, tid, cand, got.get(cand), x]);
          }
        }
        for (const tid of tab.keys()) if (!seen.has(tid)) R.mismatches.push([fn, tid, 'extra task']);
      }
    }
  }
  R.n_mismatches = R.mismatches.length; R.mismatches = R.mismatches.slice(0, 10);
  R.seconds = (Date.now() - t0) / 1000;
  res.arms[arm] = R;
  console.log(arm, 'mism', R.n_mismatches, 'rows', R.rows_checked, 'maxF', R.maxdiff_fused, 'maxA', R.maxdiff_alone, 'choices same', Object.fromEntries(Object.entries(R.choices).map(([k, v]) => [k, v.every(x => x.same && x.candidates_match_1e12 !== false && x.commits_same && x.earlier_mine === x.earlier_stored)])), 'final', JSON.stringify(R.final_all65.mine), JSON.stringify(R.final_all65.stored), R.seconds + 's');
}
L.writeJson(path.join(OUT, 'stitch-' + ARMS.join('_') + '.json'), res);
console.log(JSON.stringify(res.checks));
