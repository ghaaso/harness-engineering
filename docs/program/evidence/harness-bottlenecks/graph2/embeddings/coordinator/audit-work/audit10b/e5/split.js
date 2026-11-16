'use strict';
// Ties vs the percentile merge; P@10 of E5 alone vs E1 alone on task subsets; like-for-like on E5-scored candidates.
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const H = 'C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/coord/verify-item27/recompute';
const core = require(H + '/core.js');
const LANE = core.LANE, OUT = __dirname;
const R = JSON.parse(fs.readFileSync(path.join(OUT, 'route-pertask.json'), 'utf8'));
const tasks = core.readJsonl(path.join(LANE, 'eval/tune_tasks.jsonl')).filter(t => t.late50);
function readCands(sc) {
  const txt = zlib.gunzipSync(fs.readFileSync(path.join(LANE, 'eval/comparators/candidates_' + sc + '.tsv.gz'))).toString('utf8');
  const out = new Map(); const ls = txt.split('\n');
  for (let i = 1; i < ls.length; i++) { if (!ls[i]) continue; const [t, c] = ls[i].split('\t'); if (!out.has(t)) out.set(t, []); out.get(t).push(c); }
  return out;
}
const cands = { pool: readCands('pool'), unrestricted: readCands('unrestricted') };
const T = {};
for (const arm of ['E1', 'E5']) for (const sc of ['pool', 'unrestricted']) for (const s of [1, 2, 3]) T[arm + sc + s] = core.readScoreTable(path.join(LANE, 'train/selectB', arm, 'alone_' + sc + '_s' + s + '.tsv.gz'));
const choices = JSON.parse(fs.readFileSync(path.join(LANE, 'train/selectB/E5/choices.json'), 'utf8'));
const out = { choices_E5: choices.blocks.map(b => [b.config_id, b.w]), choices_E1: JSON.parse(fs.readFileSync(path.join(LANE, 'train/selectB/E1/choices.json'), 'utf8')).blocks.map(b => [b.config_id, b.w]) };

// ---- ties and merge structure (E5, every seed, both scopes)
out.ties = {};
for (const sc of ['pool', 'unrestricted']) for (const s of [1, 2, 3]) {
  const tab = T['E5' + sc + s];
  let tiedTasks = 0, tiedTop10 = 0, tiedSingleUse = 0, structBad = 0, structChecked = 0; const bad = [];
  for (const t of tasks) {
    const p = R.per_task[t.task_id]; const row = tab.get(t.task_id) || new Map();
    const vals = [...row.values()];
    const cnt = new Map(); for (const v of vals) cnt.set(v, (cnt.get(v) || 0) + 1);
    const tied = [...cnt.values()].some(n => n > 1);
    if (tied) {
      tiedTasks++; if (p.use.length === 1) tiedSingleUse++;
      const ranked = core.rank(t.task_id, cands[sc].get(t.task_id) || [], row).slice(0, 10);
      const tv = new Set([...cnt].filter(([, n]) => n > 1).map(([v]) => v));
      if (ranked.some(c => row.has(c) && tv.has(row.get(c)))) tiedTop10++;
    }
    // structure: n_A = task candidates known to specialist A (within this scope's list)
    const by = p[sc].by; const use = p.use;
    const nA = use.map(A => Object.values(by).filter(b => b.includes(A)).length);
    for (const [c, v] of row) {
      structChecked++;
      const b = by[c]; let ok;
      if (b.length === 1) { const n = nA[use.indexOf(b[0])]; const i = v * n; ok = Math.abs(i - Math.round(i)) < 1e-4 * n && Math.round(i) >= 1 && Math.round(i) <= n; }
      else { ok = false; const [n1, n2] = nA; for (let i = 1; i <= n1 && !ok; i++) { const j = (2 * v - i / n1) * n2; if (Math.abs(j - Math.round(j)) < 1e-4 * n2 && Math.round(j) >= 1 && Math.round(j) <= n2) ok = true; } }
      if (!ok) { structBad++; if (bad.length < 5) bad.push([t.task_id, c, v, b, nA]); }
    }
  }
  out.ties[sc + '_s' + s] = { tasks_with_tie: tiedTasks, with_tie_in_top10: tiedTop10, tied_tasks_with_one_usable_specialist: tiedSingleUse, merge_structure_checked: structChecked, merge_structure_bad: structBad, bad };
}
// single-specialist tasks: are the scores exactly {1/n..n/n}? (within float32)
{
  let n1 = 0, okc = 0;
  for (const t of tasks) { const p = R.per_task[t.task_id]; if (p.use.length !== 1) continue; for (const sc of ['pool']) { const row = T['E5pool1'].get(t.task_id) || new Map(); const v = [...row.values()].sort((a, b) => a - b); n1++; const n = v.length; if (v.every((x, i) => Math.abs(x - (i + 1) / n) < 1e-6)) okc++; } }
  out.single_specialist_scores_are_i_over_n = { tasks: n1, ok: okc };
}

// ---- P@10 per task, seed mean
function p10(arm, sc, t, restrict) {
  const vals = [1, 2, 3].map(s => {
    const row = T[arm + sc + s].get(t.task_id) || new Map();
    let cl = cands[sc].get(t.task_id) || []; let truth = t.truth;
    if (restrict) { const un = new Set(R.per_task[t.task_id][sc].unscored); cl = cl.filter(c => !un.has(c)); truth = truth.filter(c => !un.has(c)); }
    return core.p10(core.rank(t.task_id, cl, row), truth);
  });
  return (vals[0] + vals[1] + vals[2]) / 3;
}
function agg(sub, f) {
  const by = new Map(); for (const t of sub) { if (!by.has(t.commit)) by.set(t.commit, []); by.get(t.commit).push(f(t)); }
  const cm = [...by.values()].map(a => a.reduce((x, y) => x + y, 0) / a.length);
  const all = sub.map(f);
  return { tasks: sub.length, commits: by.size, commit_mean: cm.reduce((x, y) => x + y, 0) / cm.length, task_mean: all.reduce((x, y) => x + y, 0) / all.length };
}
out.p10 = {};
for (const sc of ['pool', 'unrestricted']) {
  const P = {}; for (const t of tasks) P[t.task_id] = { E5: p10('E5', sc, t), E1: p10('E1', sc, t), E5r: p10('E5', sc, t, true), E1r: p10('E1', sc, t, true) };
  const parts = {
    all: tasks,
    has_unscored: tasks.filter(t => R.per_task[t.task_id][sc].unscored.length > 0),
    no_unscored: tasks.filter(t => R.per_task[t.task_id][sc].unscored.length === 0),
    truth_unscored: tasks.filter(t => R.per_task[t.task_id][sc].truth_unscored > 0),
    single_area: tasks.filter(t => R.per_task[t.task_id].route.length === 1),
    two_area: tasks.filter(t => R.per_task[t.task_id].route.length === 2),
    two_area_second_other: tasks.filter(t => R.per_task[t.task_id].route.length === 2 && R.per_task[t.task_id].route[1] === 'other'),
    two_area_second_code: tasks.filter(t => R.per_task[t.task_id].route.length === 2 && R.per_task[t.task_id].route[1] !== 'other'),
    single_no_unscored: tasks.filter(t => R.per_task[t.task_id].route.length === 1 && R.per_task[t.task_id][sc].unscored.length === 0),
    single_has_unscored: tasks.filter(t => R.per_task[t.task_id].route.length === 1 && R.per_task[t.task_id][sc].unscored.length > 0),
    two_no_unscored: tasks.filter(t => R.per_task[t.task_id].route.length === 2 && R.per_task[t.task_id][sc].unscored.length === 0),
    two_has_unscored: tasks.filter(t => R.per_task[t.task_id].route.length === 2 && R.per_task[t.task_id][sc].unscored.length > 0),
  };
  const res = {};
  for (const k in parts) {
    const sub = parts[k]; if (!sub.length) { res[k] = { tasks: 0 }; continue; }
    const a5 = agg(sub, t => P[t.task_id].E5), a1 = agg(sub, t => P[t.task_id].E1), r5 = agg(sub, t => P[t.task_id].E5r), r1 = agg(sub, t => P[t.task_id].E1r);
    // contribution to the all-313 task-sum difference
    const contrib = sub.reduce((x, t) => x + P[t.task_id].E5 - P[t.task_id].E1, 0) / tasks.length;
    res[k] = { tasks: sub.length, commits: a5.commits, E5_commit: +a5.commit_mean.toFixed(4), E1_commit: +a1.commit_mean.toFixed(4), diff_commit: +(a5.commit_mean - a1.commit_mean).toFixed(4), E5_task: +a5.task_mean.toFixed(4), E1_task: +a1.task_mean.toFixed(4), diff_task: +(a5.task_mean - a1.task_mean).toFixed(4), share_of_all_task_diff: +contrib.toFixed(4), scored_only_E5_task: +r5.task_mean.toFixed(4), scored_only_E1_task: +r1.task_mean.toFixed(4), scored_only_diff_task: +(r5.task_mean - r1.task_mean).toFixed(4), scored_only_diff_commit: +(r5.commit_mean - r1.commit_mean).toFixed(4) };
  }
  out.p10[sc] = res;
  // per-task win/loss counts
  let w = 0, l = 0, e = 0; for (const t of tasks) { const d = P[t.task_id].E5 - P[t.task_id].E1; if (d > 1e-9) w++; else if (d < -1e-9) l++; else e++; }
  out.p10[sc].E5_vs_E1_tasks = { better: w, worse: l, equal: e };
}
fs.writeFileSync(path.join(OUT, 'split-out.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
