'use strict';
// Parts 2-6: metrics, contrasts, words, Holm, robustness, placebo harness check.
const L = require('./lib.js');
const { core, LANE, SEEDS, SCOPES, WS, METRICS, path, fs } = L;
const OUT = __dirname;
const tune = JSON.parse(fs.readFileSync(path.join(LANE, 'train/report/tune.json'), 'utf8'));
const tasks = core.readJsonl(path.join(LANE, 'eval/tune_tasks.jsonl'));
const sub = tasks.filter(t => t.late50);
const late = new Set(sub.map(t => t.commit));
const pilotShared = new Set(tasks.filter(t => t.late50_pilot && t.late50).map(t => t.commit));
const sets = { late50: late, late50_pilot_shared: pilotShared };
const cl = { pool: L.readCands('pool'), unrestricted: L.readCands('unrestricted') };
const MYSEEDS = [11, 222, 3333];
const res = { checks: {}, metric_cmp: { max_abs: 0, n: 0, worst: null, over1e9: [] }, contrasts: {}, words: {}, holm: {}, robust: {}, harness: {} };

// candidate list check against RANDOM tables (every candidate is a row there)
for (const sc of SCOPES) {
  const R = core.readScoreTable(path.join(LANE, 'eval/comparators/RANDOM_' + sc + '.tsv.gz'));
  let bad = 0; for (const t of tasks) { const a = (cl[sc].get(t.task_id) || []).slice().sort().join('\n'); const b = [...(R.get(t.task_id) || new Map()).keys()].sort().join('\n'); if (a !== b) bad++; }
  res.checks['cands_equal_RANDOM_rows_' + sc] = bad === 0 ? 'all 388 tasks equal' : bad + ' tasks differ';
}
const arms = ['E1', 'E2', 'E3', 'E4', 'E5', 'PLACEBO'];
const variants = a => ['alone', 'fused', 'alone_builder', 'fused_builder'].concat(a === 'PLACEBO' ? WS.map(w => 'fused_w' + w) : []);
const pt = new Map(); // key|sc -> seed-mean ; key|sc|s -> per seed
for (const sc of SCOPES) {
  for (const n of ['RRF', 'PPR', 'CO', 'DIR', 'RANDOM']) pt.set(n + '|' + sc, L.evalTable(core.readScoreTable(path.join(LANE, 'eval/comparators/' + n + '_' + sc + '.tsv.gz')), cl[sc], sub));
  for (const a of arms) for (const v of variants(a)) {
    const ps = SEEDS.map(s => L.evalTable(core.readScoreTable(path.join(LANE, 'train/selectB', a, v + '_' + sc + '_s' + s + '.tsv.gz')), cl[sc], sub));
    ps.forEach((p, i) => pt.set(a + '_' + v + '|' + sc + '|' + SEEDS[i], p));
    pt.set(a + '_' + v + '|' + sc, L.meanSeeds(ps));
  }
}
function cmp(stored, mine, label) {
  const d = Math.abs(stored - mine); res.metric_cmp.n++;
  if (!(d <= res.metric_cmp.max_abs)) { res.metric_cmp.max_abs = d; res.metric_cmp.worst = label; }
  if (!(d <= 1e-9)) res.metric_cmp.over1e9.push([label, stored, mine]);
}
for (const [setname, cs] of Object.entries(sets)) for (const sc of SCOPES) {
  for (const n of ['RRF', 'PPR', 'CO', 'DIR', 'RANDOM']) { const m = L.summary(pt.get(n + '|' + sc), sub, cs); METRICS.forEach((k, i) => cmp(tune.comparators[setname][sc][n][k], m[i], [setname, sc, n, k].join('/'))); }
  for (const a of arms) for (const v of variants(a)) {
    const key = a + '_' + v, d = tune.arms[setname][sc][key];
    const m = L.summary(pt.get(key + '|' + sc), sub, cs); METRICS.forEach((k, i) => cmp(d.seed_mean[k], m[i], [setname, sc, key, 'mean', k].join('/')));
    for (const s of SEEDS) { const ms = L.summary(pt.get(key + '|' + sc + '|' + s), sub, cs); METRICS.forEach((k, i) => cmp(d.per_seed[s][k], ms[i], [setname, sc, key, 's' + s, k].join('/'))); }
  }
}
res.metric_cmp.over1e9 = res.metric_cmp.over1e9.slice(0, 20);
// also compare with eval/comparators/metrics.json (late50)
const mj = JSON.parse(fs.readFileSync(path.join(LANE, 'eval/comparators/metrics.json'), 'utf8'));
res.checks.metrics_json_vs_tune = {};
for (const sc of SCOPES) for (const n of ['RRF', 'PPR', 'CO', 'DIR', 'RANDOM']) { const k = n + '_' + sc; if (mj[k] && mj[k].late50) res.checks.metrics_json_vs_tune[k] = Math.max(...METRICS.map(m => Math.abs(mj[k].late50[m] - tune.comparators.late50[sc][n][m]))); }

// per commit diff vector, metric index m
function diffs(ptA, ptB, cs, m) { const a = L.perCommit(ptA, sub, cs).arr, b = L.perCommit(ptB, sub, cs).arr; return a.map((r, i) => r[m] - b[i][m]); }
function boot3(v, level = 0.95) { const r = MYSEEDS.map(s => L.bootstrap(v, 10000, s, level)); return { diff: r[0][0], lo: r.map(x => x[1]), hi: r.map(x => x[2]), p: r.map(x => x[3]) }; }
const span = a => [Math.min(...a), Math.max(...a)];
let maxLoDev = 0, maxHiDev = 0, maxPDev = 0, maxDiff = 0, outside = [];
for (const [setname, cs] of Object.entries(sets)) for (const sc of SCOPES) for (const a of arms) for (const v of variants(a)) {
  const key = a + '_' + v, row = tune.contrasts[setname][sc][key];
  for (let mi = 0; mi < 4; mi++) {
    const st = row.vs_RRF[METRICS[mi]]; const b = boot3(diffs(pt.get(key + '|' + sc), pt.get('RRF|' + sc), cs, mi));
    maxDiff = Math.max(maxDiff, Math.abs(st.diff - b.diff));
    const [l0, l1] = span(b.lo), [h0, h1] = span(b.hi), [p0, p1] = span(b.p);
    const dl = Math.max(Math.abs(st.lo - l0), Math.abs(st.lo - l1)), dh = Math.max(Math.abs(st.hi - h0), Math.abs(st.hi - h1));
    maxLoDev = Math.max(maxLoDev, dl); maxHiDev = Math.max(maxHiDev, dh); maxPDev = Math.max(maxPDev, Math.abs(st.p - p0), Math.abs(st.p - p1));
    if (dl > 0.0008 || dh > 0.0008) outside.push([setname, sc, key, METRICS[mi], st, b]);
    if (mi === 0) {
      res.contrasts[[setname, sc, key].join('/')] = { stored: [st.diff, st.lo, st.hi, st.p], mine_lo: b.lo, mine_hi: b.hi, mine_p: b.p, stored_word: row.verdict_P10 || null, my_words: b.lo.map((lo, i) => L.verdict(b.diff, lo, b.hi[i])), word_from_stored: L.verdict(st.diff, st.lo, st.hi), sensitivity: !!row.sensitivity };
      // per-seed contrasts
      for (const s of SEEDS) { const ps = row.per_seed_P10_vs_RRF[s]; const bs = L.bootstrap(diffs(pt.get(key + '|' + sc + '|' + s), pt.get('RRF|' + sc), cs, 0), 10000, MYSEEDS[0]); maxDiff = Math.max(maxDiff, Math.abs(ps.diff - bs[0])); maxLoDev = Math.max(maxLoDev, Math.abs(ps.lo - bs[1])); maxHiDev = Math.max(maxHiDev, Math.abs(ps.hi - bs[2])); }
    }
  }
}
res.checks.bootstrap = { max_abs_diff_point: maxDiff, max_lo_dev: maxLoDev, max_hi_dev: maxHiDev, max_p_dev: maxPDev, n_outside_0p0008: outside.length, outside: outside.slice(0, 5) };
// MC spread for the primary contrasts
res.checks.mc_spread_primary = {};
for (const a of arms) { const c = res.contrasts['late50/pool/' + a + '_fused']; res.checks.mc_spread_primary[a] = { lo_spread: span(c.mine_lo), hi_spread: span(c.mine_hi), stored: c.stored }; }
// words
let wordBad = [];
for (const a of arms) for (const v of ['alone', 'fused']) for (const sc of SCOPES) {
  const c = res.contrasts['late50/' + sc + '/' + a + '_' + v];
  const stored = tune.verdicts.late50[a][v + '_' + sc];
  if (c.my_words.some(w => w !== stored) || c.word_from_stored !== stored || c.stored_word !== stored) wordBad.push([a, v, sc, stored, c.my_words, c.word_from_stored]);
  res.words[a + '_' + v + '_' + sc] = { stored, mine: c.my_words, from_stored_interval: c.word_from_stored, interval: c.stored.slice(1, 3) };
}
for (const a of arms) if (tune.verdicts.late50[a].primary !== tune.verdicts.late50[a].fused_pool) wordBad.push([a, 'primary']);
res.checks.words_disagree = wordBad;
// Holm
const emb = ['E1', 'E2', 'E3', 'E4', 'E5'];
let holmBad = [], holmIntDev = 0;
for (const [setname, cs] of Object.entries(sets)) for (const sc of SCOPES) for (const v of ['alone', 'fused']) for (let mi = 0; mi < 4; mi++) {
  const H = tune.holm[setname][sc][v][METRICS[mi]];
  const ps = emb.map(a => H[a].p_raw);
  // p_raw must equal the contrast p (same bootstrap call, seed 0)
  emb.forEach(a => { if (H[a].p_raw !== tune.contrasts[setname][sc][a + '_' + v].vs_RRF[METRICS[mi]].p) holmBad.push(['p_raw != contrast p', setname, sc, v, METRICS[mi], a]); });
  const { adj, order } = L.holm(ps);
  // ties: levels for tied p depend on argsort order; accept any permutation among ties
  emb.forEach((a, i) => {
    if (Math.abs(adj[i] - H[a].p_holm) > 1e-12) holmBad.push(['p_holm', setname, sc, v, METRICS[mi], a, H[a].p_holm, adj[i]]);
    const tiedRanks = order.map((j, r) => [j, r]).filter(([j]) => ps[j] === ps[i]).map(([, r]) => 1 - 0.05 / (5 - r));
    if (!tiedRanks.some(l => Math.abs(l - H[a].level) < 1e-12)) holmBad.push(['level', setname, sc, v, METRICS[mi], a, H[a].level, tiedRanks]);
    if (mi === 0 && setname === 'late50') {
      const dv = diffs(pt.get(a + '_' + v + '|' + sc), pt.get('RRF|' + sc), cs, 0); const b = L.bootstrap(dv, 10000, MYSEEDS[0], H[a].level);
      holmIntDev = Math.max(holmIntDev, Math.abs(b[1] - H[a].lo), Math.abs(b[2] - H[a].hi));
      res.holm[[sc, v, a].join('/')] = { stored: [H[a].diff, H[a].lo, H[a].hi, H[a].p_raw, H[a].p_holm, H[a].level], mine: [b[1], b[2]] };
    }
  });
}
res.checks.holm_disagree = holmBad; res.checks.holm_interval_max_dev_P10_late50 = holmIntDev;

// Robustness for each arm's alone/fused x pool/unrestricted (P@10)
function tq975(df) { // Student t 0.975 quantile by bisection on the CDF (regularised incomplete beta via continued fraction)
  const lgamma = x => { const c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5]; let y = x, t = x + 5.5; t -= (x + 0.5) * Math.log(t); let s = 1.000000000190015; for (const k of c) s += k / ++y; return -t + Math.log(2.5066282746310005 * s / x); };
  const betacf = (a, b, x) => { let qab = a + b, qap = a + 1, qam = a - 1, c = 1, d = 1 - qab * x / qap; d = 1 / d; let h = d; for (let m = 1; m <= 200; m++) { const m2 = 2 * m; let aa = m * (b - m) * x / ((qam + m2) * (a + m2)); d = 1 + aa * d; d = 1 / d; c = 1 + aa / c; h *= d * c; aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2)); d = 1 + aa * d; d = 1 / d; c = 1 + aa / c; h *= d * c; } return h; };
  const ibeta = (a, b, x) => { const bt = Math.exp(lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x)); return x < (a + 1) / (a + b + 2) ? bt * betacf(a, b, x) / a : 1 - bt * betacf(b, a, 1 - x) / b; };
  const cdf = t => 1 - 0.5 * ibeta(df / 2, 0.5, df / (df + t * t));
  let lo = 0, hi = 10; for (let i = 0; i < 200; i++) { const m = (lo + hi) / 2; if (cdf(m) < 0.975) lo = m; else hi = m; } return (lo + hi) / 2;
}
const T49 = tq975(49), T45 = tq975(45);
res.checks.t_quantiles = { df49: T49, df45: T45 };
function tint(v) { const n = v.length, m = L.mean(v); let ss = 0; for (const x of v) ss += (x - m) ** 2; const se = Math.sqrt(ss / (n - 1) / n); const q = tq975(n - 1); return [m, m - q * se, m + q * se]; }
function seedMeanOf(key, sc, seeds) { const list = seeds.map(s => pt.get(key + '|' + sc + '|' + s)); return L.meanSeeds(list); }
for (const a of arms) for (const v of ['alone', 'fused']) for (const sc of SCOPES) {
  const key = a + '_' + v; const out = {};
  const dc = diffs(pt.get(key + '|' + sc), pt.get('RRF|' + sc), late, 0);
  const b = boot3(dc); out.by_commit_boot = [b.diff, Math.min(...b.lo), Math.max(...b.hi)];
  out.t_by_commit = tint(dc);
  // by task: per-task diff of seed means
  const A = pt.get(key + '|' + sc), R = pt.get('RRF|' + sc); const dt = sub.map(t => A.get(t.task_id)[0] - R.get(t.task_id)[0]);
  const bt = boot3(dt); out.by_task_boot = [bt.diff, Math.min(...bt.lo), Math.max(...bt.hi)];
  for (const drop of SEEDS) { const keep = SEEDS.filter(s => s !== drop); const d2 = diffs(seedMeanOf(key, sc, keep), R, late, 0); const b2 = boot3(d2); out['drop_s' + drop] = [b2.diff, Math.min(...b2.lo), Math.max(...b2.hi)]; }
  for (const s of SEEDS) { const d1 = diffs(pt.get(key + '|' + sc + '|' + s), R, late, 0); const b1 = boot3(d1); out['only_s' + s] = [b1.diff, Math.min(...b1.lo), Math.max(...b1.hi)]; }
  const dp = diffs(pt.get(key + '|' + sc), R, pilotShared, 0); const bp = boot3(dp); out.pilot_shared = [bp.diff, Math.min(...bp.lo), Math.max(...bp.hi)];
  const kb = a + '_' + v + '_builder'; const db = diffs(pt.get(kb + '|' + sc), R, late, 0); const bb = boot3(db); out.builder = [bb.diff, Math.min(...bb.lo), Math.max(...bb.hi)];
  const words = {}; let widest = null, extremeLo = null, extremeHi = null;
  for (const [k, x] of Object.entries(out)) { words[k] = L.verdict(x[0], x[1], x[2]); const wdt = x[2] - x[1]; if (!widest || wdt > widest[1]) widest = [k, wdt, x]; if (!extremeLo || x[1] < extremeLo[1][1]) extremeLo = [k, x]; if (!extremeHi || x[2] > extremeHi[1][2]) extremeHi = [k, x]; }
  res.robust[key + '_' + sc] = { intervals: out, words, word_changes: Object.entries(words).filter(([, w]) => w !== tune.verdicts.late50[a][v + '_' + sc]), widest, extreme_low: extremeLo, extreme_high: extremeHi };
}
// harness check
const hc = tune.harness_check;
res.harness = { stored: hc, placebo_primary_matches_verdicts: hc.placebo_primary_late50 === tune.verdicts.late50.PLACEBO.primary, ok_consistent: hc.ok === (hc.placebo_primary_late50 !== 'adds'), fixed_w_equal_contrasts: WS.every(w => JSON.stringify(hc.placebo_fixed_w_late50_pool_P10_vs_RRF['w' + w]) === JSON.stringify(tune.contrasts.late50.pool['PLACEBO_fused_w' + w].vs_RRF['P@10'])), fixed_w_mine: WS.map(w => res.contrasts['late50/pool/PLACEBO_fused_w' + w]) };
L.writeJson(path.join(OUT, 'metrics-out.json'), res);
console.log(JSON.stringify({ checks: res.checks, metric_cmp: { max_abs: res.metric_cmp.max_abs, n: res.metric_cmp.n, worst: res.metric_cmp.worst, over: res.metric_cmp.over1e9.length } }, null, 1).slice(0, 6000));
