'use strict';
// Compare the independent scorer (myscore.js) with the grader's per-task and per-configuration values.
// node compare_grader.js <build> <mydir>
const fs = require('fs'); const path = require('path'); const zlib = require('zlib');
const BUILD = path.resolve(process.argv[2]); const MY = path.resolve(process.argv[3]);
const rd = (f) => zlib.gunzipSync(fs.readFileSync(f)).toString('utf8').split('\n').filter(Boolean).map(JSON.parse);
const ARMS = ['relational', 'search', 'ladybug', 'duckpgq', 'floor-dir', 'floor-co'];
const mine = new Map();
for (const r of rd(path.join(MY, 'my_tasks.jsonl.gz'))) mine.set(r.arm + '|' + r.hash + '|' + r.set + '|' + r.id, r);
const tables = JSON.parse(fs.readFileSync(path.join(MY, 'my_tables.json'), 'utf8'));

// deterministic sampler (mulberry32)
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const R = rng(20261112);

const out = { all_tasks: {}, sample40: [], config_tables: {} };
const KEYS = ['r2000', 'r4000', 'r8000', 'r16000', 'tok8000'];
for (const arm of ARMS) {
  const g = [];
  for (const st of ['stage1', 'stage2']) {
    const f = path.join(BUILD, 'sealed/grader', st, arm + '.tasks.jsonl.gz');
    if (fs.existsSync(f)) for (const r of rd(f)) if (r.set === 'T1') g.push({ ...r, stage: st });
  }
  let n = 0; let diff = 0; let missing = 0; const ex = [];
  for (const r of g) {
    const m = mine.get(arm + '|' + r.config_hash + '|T1|' + r.id);
    if (!m) { missing++; continue; }
    n++;
    for (const k of KEYS) {
      const gv = r[k]; const mv = m[k];
      if (!((gv == null && mv == null) || (gv != null && mv != null && Math.abs(gv - mv) < 1e-12))) { diff++; if (ex.length < 5) ex.push({ id: r.id, name: r.name, k, grader: gv, mine: mv }); break; }
    }
  }
  out.all_tasks[arm] = { grader_T1_rows: g.length, compared: n, differing_rows: diff, missing_in_mine: missing, examples: ex };
  // the 40-answer sample: stage-1 and stage-2 rows, spread over arms
  const per = arm.startsWith('floor') ? { stage1: 4 } : { stage1: 4, stage2: 4 };
  for (const [st, k] of Object.entries(per)) {
    const pool = g.filter((r) => r.stage === st);
    for (let i = 0; i < k; i++) {
      const r = pool[Math.floor(R() * pool.length)];
      const m = mine.get(arm + '|' + r.config_hash + '|T1|' + r.id);
      out.sample40.push({ arm, stage: st, config: r.name, id: r.id, units: m.units, grader_r8000: r.r8000, mine_r8000: m.r8000, grader_r2000: r.r2000, mine_r2000: m.r2000, grader_r16000: r.r16000, mine_r16000: m.r16000, agree: KEYS.every((q) => (r[q] == null && m[q] == null) || Math.abs(r[q] - m[q]) < 1e-12) });
    }
  }
  // configuration tables: primary and se
  const sums = [];
  for (const st of ['stage1', 'stage2']) { const f = path.join(BUILD, 'sealed/grader', st, arm + '.summary.json'); if (fs.existsSync(f)) for (const s of JSON.parse(fs.readFileSync(f, 'utf8'))) if (s.set === 'T1') sums.push(s); }
  let cmpd = 0; let pd = 0; let sed = 0; let ted = 0; const ex2 = [];
  for (const s of sums) {
    const t = tables[arm].find((x) => x.hash === s.config_hash && x.set === 'T1');
    if (!t) continue; cmpd++;
    const gp = s.metrics.primary.mean; const gse = s.metrics.primary.se; const gt = s.metrics.tok8000.median_over_tasks;
    if (!((gp == null && t.primary == null) || Math.abs(gp - t.primary) < 1e-12)) { pd++; if (ex2.length < 3) ex2.push({ name: s.name, gp, mp: t.primary }); }
    if (gse != null && Math.abs(gse - t.se) > 1e-12) { sed++; if (ex2.length < 6) ex2.push({ name: s.name, gse, mse: t.se, mse_n: t.se_n }); }
    if (gt !== t.tok8000_median) { ted++; if (ex2.length < 9) ex2.push({ name: s.name, gt, mt: t.tok8000_median, mtl: t.tok8000_median_low }); }
  }
  out.config_tables[arm] = { compared: cmpd, primary_diff: pd, se_diff: sed, tok_median_diff: ted, examples: ex2 };
}
out.sample40_agree = out.sample40.filter((x) => x.agree).length;
console.log(JSON.stringify(out, null, 1));
