'use strict';
// Checks 5, 6, 7 recomputed from the stored held-out answer files (no arm code loaded, no reference read).
const fs = require('fs'); const path = require('path'); const zlib = require('zlib');
const B = 'C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/build';
const OUT = path.join(B, 'audit/heldout/discipline/c567.json');
const plan = JSON.parse(fs.readFileSync(path.join(B, 'results/frozen/PLAN.json'), 'utf8'));
const tasks = fs.readFileSync(path.join(B, 'tasks/tasks.jsonl'), 'utf8').split('\n').filter(Boolean).map(JSON.parse);
const byId = new Map(tasks.map((t) => [t.id, t]));
const rd = (f) => zlib.gunzipSync(fs.readFileSync(path.join(B, f))).toString('utf8').split('\n').filter(Boolean).map(JSON.parse);
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function strings(x, acc) { if (typeof x === 'string') acc.push(x); else if (Array.isArray(x)) x.forEach((y) => strings(y, acc)); else if (x && typeof x === 'object') Object.entries(x).forEach(([k, y]) => { acc.push(k); strings(y, acc); }); return acc; }
const res = { c5: { rows: [] }, c6: { rows: [], typed: [] }, c7: {} };

// ---- check 5: whole path match anywhere in the answer object (all fields, keys included)
let totHits = 0; let totSub = 0;
for (const e of plan.runs.filter((r) => r.set === 'T3' || r.set === 'T4')) {
  const A = rd(e.out); let withRp = 0; let whole = 0; let sub = 0; const ex = [];
  for (const a of A) {
    const rp = (byId.get(a.id) || {}).remove_paths || []; if (rp.length) withRp++;
    const all = strings(a, []);
    for (const p of rp) {
      const re = new RegExp('(^|[^A-Za-z0-9_./-])' + esc(p) + '($|[^A-Za-z0-9_/-]|\\.(?![A-Za-z0-9_]))');
      const w = all.filter((s) => re.test(s)); const ss = all.filter((s) => s.includes(p));
      if (w.length) { whole++; if (ex.length < 3) ex.push({ id: a.id, p, s: w[0].slice(0, 160) }); }
      if (ss.length) { sub++; if (!w.length && ex.length < 6) ex.push({ id: a.id, p, substring_only: ss[0].slice(0, 160) }); }
    }
  }
  totHits += whole; totSub += sub;
  res.c5.rows.push({ n: e.n, arm: e.arm, role: e.role, draw: e.draw || 0, set: e.set, answers: A.length, tasks_with_remove: withRp, whole_path_hits: whole, substring_hits: sub, examples: ex });
}
res.c5.total_whole_path_hits = totHits; res.c5.total_substring_hits = totSub; res.c5.files = res.c5.rows.length;
res.c5.remove_paths_used = [...new Set(tasks.filter((t) => t.split !== 'tune' && (t.set === 'T3' || t.set === 'T4')).flatMap((t) => t.remove_paths || []))];

// ---- check 6: identity, primary and s1, per set
const content = (a) => JSON.stringify([a.seeds, a.seed_match, a.n_ranked, a.ranked_sha, a.n_units, a.n_head, a.items, a.budgets, a.beyond_sample]);
const shown = (a) => JSON.stringify([a.seeds, a.items, a.budgets]);
const whole = (a) => { const o = Object.assign({}, a); for (const k of ['ms', 'engine_ms', 'config_name', 'meta', 'arm']) delete o[k]; return JSON.stringify(o); };
const fr = (arm, role, hash, set) => plan.runs.find((r) => r.arm === arm && r.role === role && r.hash === hash && r.set === set && !r.draw);
for (const [role, hash] of [['primary', '95e990307da3b42b'], ['s1', '6b70cc1222745385']]) {
  for (const set of ['T1', 'T1x', 'T2', 'T3', 'T4']) {
    const R = new Map(rd(fr('reference', 'crosscheck', hash, set).out).map((a) => [a.id, a]));
    const T = {}; for (const arm of ['relational', 'ladybug', 'duckpgq']) T[arm] = new Map(rd(fr(arm, role, hash, set).out).map((a) => [a.id, a]));
    for (const arm of ['relational', 'ladybug', 'duckpgq']) {
      let n = 0; let cEq = 0; let sEq = 0; let wEq = 0; let rsEq = 0; const diffIds = [];
      for (const [id, a] of T[arm]) { const b = R.get(id); if (!b) continue; n++; const c = content(a) === content(b); if (c) cEq++; else diffIds.push(id); if (shown(a) === shown(b)) sEq++; if (whole(a) === whole(b)) wEq++; if (a.ranked_sha === b.ranked_sha) rsEq++; }
      res.c6.rows.push({ role, set, arm, vs: 'reference', tasks: n, packed_content_equal: cEq, shown_items_equal: sEq, whole_answer_equal_excl_timing_meta: wEq, ranked_sha_equal: rsEq, differing_ids: diffIds.slice(0, 10) });
    }
    let n = 0; let all3 = 0; let rl = 0; let rdq = 0; let ld = 0; let sh3 = 0;
    for (const [id, a] of T.relational) { const l = T.ladybug.get(id); const d = T.duckpgq.get(id); if (!l || !d) continue; n++; const [x, y, z] = [content(a), content(l), content(d)]; if (x === y) rl++; if (x === z) rdq++; if (y === z) ld++; if (x === y && y === z) all3++; if (shown(a) === shown(l) && shown(l) === shown(d)) sh3++; }
    res.c6.typed.push({ role, set, tasks: n, all_three_packed_equal: all3, shown_items_all_three_equal: sh3, relational_eq_ladybug: rl, relational_eq_duckpgq: rdq, ladybug_eq_duckpgq: ld });
  }
}
const sum = (rows, f) => rows.reduce((s, r) => s + r[f], 0);
res.c6.totals = {};
for (const role of ['primary', 's1']) for (const arm of ['relational', 'ladybug', 'duckpgq']) { const rows = res.c6.rows.filter((r) => r.role === role && r.arm === arm); res.c6.totals[role + ' ' + arm + ' vs reference'] = { tasks: sum(rows, 'tasks'), packed_equal: sum(rows, 'packed_content_equal'), shown_equal: sum(rows, 'shown_items_equal'), whole_equal: sum(rows, 'whole_answer_equal_excl_timing_meta'), ranked_sha_equal: sum(rows, 'ranked_sha_equal') }; }
for (const role of ['primary', 's1']) { const rows = res.c6.typed.filter((r) => r.role === role); res.c6.totals[role + ' typed three-way'] = { tasks: sum(rows, 'tasks'), all_three_packed_equal: sum(rows, 'all_three_packed_equal'), shown_all_three_equal: sum(rows, 'shown_items_all_three_equal'), rel_eq_lb: sum(rows, 'relational_eq_ladybug'), rel_eq_dq: sum(rows, 'relational_eq_duckpgq'), lb_eq_dq: sum(rows, 'ladybug_eq_duckpgq') }; }
// TQ identity across typed arms
const tq = {}; for (const q of plan.question_runs) tq[q.arm] = new Map(fs.readFileSync(path.join(B, q.out), 'utf8').split('\n').filter(Boolean).map(JSON.parse).map((x) => [x.id, x]));
const tqd = {}; for (const arm of ['ladybug', 'duckpgq', 'search']) { const d = []; for (const [id, x] of tq.relational) { const y = tq[arm].get(id); if (!y || JSON.stringify(x.answer) !== JSON.stringify(y.answer) || (x.error == null) !== (y.error == null)) d.push(id); } tqd[arm + ' vs relational'] = { differ: d.length, ids: d }; }
res.c6.tq = tqd;
res.c6.tq_errors = Object.fromEntries(Object.entries(tq).map(([a, m]) => [a, [...m.values()].filter((x) => x.error != null).map((x) => x.id)]));

// ---- check 7
const runs = fs.readFileSync(path.join(B, 'results/heldout/runs.jsonl'), 'utf8').split('\n').filter(Boolean).map(JSON.parse);
res.c7.t5_in_plan = plan.runs.filter((r) => r.set === 'T5').length;
res.c7.t5_in_runs = runs.filter((r) => r.set === 'T5' || (r.argv || []).includes('T5')).length;
const walk = (d, acc = []) => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p, acc); else acc.push(p); } return acc; };
res.c7.t5_files = walk(path.join(B, 'results/heldout')).filter((p) => /T5/.test(path.basename(p))).length;
res.c7.tq_runs = runs.filter((r) => r.role === 'tq').map((r) => { const rec = JSON.parse(fs.readFileSync(path.join(B, 'results/frozen', r.arm, 'tq.json'), 'utf8')); return { arm: r.arm, code_hash_eq_frozen_tq: r.code_hash === rec.code_hash, errors: r.errors, n: r.n_tasks, at_start: r.at_start }; });
fs.writeFileSync(OUT, JSON.stringify(res, null, 1));
console.log(JSON.stringify({ c5: { files: res.c5.files, whole: totHits, sub: totSub, ex: res.c5.rows.filter((r) => r.examples.length).map((r) => [r.n, r.examples]), rp: res.c5.remove_paths_used }, c6: res.c6.totals, c6rows: res.c6.rows.filter((r) => r.packed_content_equal !== r.tasks), tq: res.c6.tq, tqerr: res.c6.tq_errors, c7: res.c7 }, null, 1));
