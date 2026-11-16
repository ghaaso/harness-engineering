'use strict';
// Task-set checks: pilot T1 rule from git, vs pilot_commits.json, tune_commits/tune_tasks, build tasks.jsonl; held-out disjointness and dates.
const fs = require('fs');
const LANE = 'C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings';
const TASKS = 'C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/build/tasks/tasks.jsonl';
const OUT = __dirname;
const rj = p => fs.readFileSync(p, 'utf8').split('\n').filter(l => l.trim()).map(l => JSON.parse(l));
const code = /^(backend|src|technician-app)\/.*\.(py|ts|tsx|js|jsx|mjs|cjs)$/;
const commits = []; let cur = null;
for (const l of fs.readFileSync(OUT + '/gl2.txt', 'utf8').split('\n')) {
  if (l.startsWith('@@')) { const [h, d, p, at, ct] = l.slice(2).split('|'); const ps = p ? p.split(' ') : []; cur = { h, d, p: ps[0] || null, np: ps.length, at: +at, ct: +ct, f: [] }; commits.push(cur); }
  else if (l.trim()) cur.f.push(l.split('\t'));
}
const rep = { nonmerge_commits_to_a31924a: commits.length };
function t1(c) { const ex = c.f.filter(p => 'MR'.includes(p[0][0]) && code.test(p[p.length - 1])).map(p => p[1]); return ex; }
const renames = [];
const allT1 = [];
for (const c of commits) { const ex = t1(c); if (ex.length >= 2 && ex.length <= 30) { allT1.push({ c, ex }); for (const p of c.f) if (p[0][0] === 'R' && code.test(p[p.length - 1])) renames.push({ h: c.h, d: c.d, st: p[0], from: p[1], to: p[2] }); } }
// pilot tune: June, stable sort by day (git log order inside a day)
const tune = allT1.filter(x => x.c.d >= '2026-06-01' && x.c.d < '2026-07-01');
const tuneSorted = tune.map((x, i) => ({ ...x, i })).sort((a, b) => a.c.d < b.c.d ? -1 : a.c.d > b.c.d ? 1 : a.i - b.i);
rep.pilot_rule_tune_commits = tuneSorted.length;
rep.pilot_rule_tune_seeds = tuneSorted.reduce((s, x) => s + x.ex.length, 0);
// pilot's own list (pilot_commits.json)
const pc = JSON.parse(fs.readFileSync(LANE + '/eval/git/pilot_commits.json', 'utf8'));
rep.pilot_commits_json = { n: pc.length, same_order_and_seeds: pc.length === tuneSorted.length && pc.every((x, i) => x[0] === tuneSorted[i].c.h && x[1] === tuneSorted[i].c.d && JSON.stringify(x[2]) === JSON.stringify(tuneSorted[i].ex)) };
if (!rep.pilot_commits_json.same_order_and_seeds) rep.pilot_commits_json.diffs = pc.map((x, i) => [i, x[0].slice(0, 8), tuneSorted[i] && tuneSorted[i].c.h.slice(0, 8), JSON.stringify(x[2]) === JSON.stringify(tuneSorted[i] && tuneSorted[i].ex)]).filter(r => r[1] !== r[2] || !r[3]).slice(0, 20);
// lane tune_commits / tune_tasks
const tc = rj(LANE + '/eval/tune_commits.jsonl'), tt = rj(LANE + '/eval/tune_tasks.jsonl');
const byH = new Map(tuneSorted.map((x, i) => [x.c.h, { ...x, pilot_order: i + 1 }]));
const probs = [];
for (const r of tc) {
  const g = byH.get(r.commit); if (!g) { probs.push('not in pilot rule: ' + r.commit); continue; }
  if (r.parent !== g.c.p) probs.push('parent ' + r.commit);
  if (r.n_parents !== g.c.np) probs.push('np ' + r.commit);
  if (r.author_time !== g.c.at || r.commit_time !== g.c.ct || r.day !== g.c.d) probs.push('time ' + r.commit);
  if (r.pilot_order !== g.pilot_order) probs.push('pilot_order ' + r.commit + ' ' + r.pilot_order + ' vs ' + g.pilot_order);
  if (JSON.stringify([...r.seeds].sort()) !== JSON.stringify([...g.ex].sort())) probs.push('seeds ' + r.commit);
  if (r.late50_pilot !== (g.pilot_order > 15)) probs.push('late50_pilot ' + r.commit);
}
for (const h of byH.keys()) if (!tc.some(r => r.commit === h)) probs.push('missing ' + h);
// date order: author time, ties?
const sortedAT = [...tc].sort((a, b) => a.author_time - b.author_time || a.commit_time - b.commit_time || (a.commit < b.commit ? -1 : 1));
sortedAT.forEach((r, i) => { if (r.date_order !== i + 1) probs.push('date_order ' + r.commit + ' ' + r.date_order + ' vs ' + (i + 1)); if (r.late50 !== (i + 1 > 15)) probs.push('late50 ' + r.commit); });
const atCounts = new Map(); for (const r of tc) atCounts.set(r.author_time, (atCounts.get(r.author_time) || 0) + 1);
rep.author_time_ties = [...atCounts].filter(([k, v]) => v > 1).length;
rep.sortedAT_15_16 = [sortedAT[14].author_time, sortedAT[15].author_time];
rep.late50_n = tc.filter(r => r.late50).length; rep.late50_pilot_n = tc.filter(r => r.late50_pilot).length;
rep.late50_shared = tc.filter(r => r.late50 && r.late50_pilot).length;
rep.pilot_only = tc.filter(r => r.late50_pilot && !r.late50).map(r => ({ c: r.commit.slice(0, 8), date_order: r.date_order, pilot_order: r.pilot_order, tasks: r.task_ids.length }));
rep.date_only = tc.filter(r => !r.late50_pilot && r.late50).map(r => ({ c: r.commit.slice(0, 8), date_order: r.date_order, pilot_order: r.pilot_order, tasks: r.task_ids.length }));
rep.late50_tasks = tt.filter(t => t.late50).length; rep.late50_pilot_tasks = tt.filter(t => t.late50_pilot).length;
// tasks: each seed once, truth = others, flags consistent with commit rows
const tcm = new Map(tc.map(r => [r.commit, r]));
let ntask = 0;
for (const t of tt) {
  const r = tcm.get(t.commit); ntask++;
  if (!r) { probs.push('task commit ' + t.task_id); continue; }
  if (!r.task_ids.includes(t.task_id)) probs.push('task id ' + t.task_id);
  const others = r.seeds.filter(s => s !== t.seed).sort();
  if (JSON.stringify([...t.truth].sort()) !== JSON.stringify(others)) probs.push('truth ' + t.task_id);
  if (t.parent !== r.parent || t.late50 !== r.late50 || t.late50_pilot !== r.late50_pilot || t.date_order !== r.date_order || t.pilot_order !== r.pilot_order) probs.push('flags ' + t.task_id);
  if (JSON.stringify(t.commit_seeds) !== JSON.stringify(r.seeds)) probs.push('commit_seeds ' + t.task_id);
}
const seen = new Set(tt.map(t => t.commit + '|' + t.seed)); rep.unique_commit_seed = seen.size;
// build tasks.jsonl
const bt = rj(TASKS); const bT1 = bt.filter(t => t.set === 'T1');
const btTune = bT1.filter(t => t.split === 'tune'), btHeld = bT1.filter(t => t.split === 'heldout');
rep.build_T1 = { tune: btTune.length, heldout: btHeld.length };
const byId = new Map(btTune.map(t => [t.id, t]));
for (const t of tt) { const b = byId.get(t.task_id); if (!b) { probs.push('build row missing ' + t.task_id); continue; } if (b.parent !== t.parent || b.seed.path !== t.seed) probs.push('build row differs ' + t.task_id); }
rep.problems = probs;
// held-out: pilot rule on dates >= 2026-07-01
const held = allT1.filter(x => x.c.d >= '2026-07-01');
rep.T1_rule_heldout_commits = held.length; rep.T1_rule_heldout_seeds = held.reduce((s, x) => s + x.ex.length, 0);
const tuneSet = new Set(tc.map(r => r.commit));
const hmap = new Map(); // key parent|seed -> commits
for (const x of held) for (const s of x.ex) { const k = x.c.p + '|' + s; if (!hmap.has(k)) hmap.set(k, []); hmap.get(k).push(x.c); }
const hprob = []; const heldCommits = new Map();
for (const r of btHeld) { const m = hmap.get(r.parent + '|' + r.seed.path) || []; if (m.length !== 1) hprob.push({ id: r.id, matches: m.map(c => c.h.slice(0, 8)) }); else { const c = m[0]; if (!heldCommits.has(c.h)) heldCommits.set(c.h, { c, n: 0 }); heldCommits.get(c.h).n++; } }
// children of each held-out parent in git (all refs) for completeness
const kids = new Map(); for (const l of fs.readFileSync(OUT + '/allrefs.txt', 'utf8').split('\n').filter(Boolean)) { const [h, d, p, at] = l.split('|'); for (const q of (p ? p.split(' ') : [])) { if (!kids.has(q)) kids.set(q, []); kids.get(q).push({ h, d, at: +at }); } }
const hparents = new Set(btHeld.map(r => r.parent));
rep.heldout = {
  rows_unmatched_or_ambiguous: hprob, commits: heldCommits.size,
  tasks_matched: [...heldCommits.values()].reduce((s, x) => s + x.n, 0),
  overlap_with_tune: [...heldCommits.keys()].filter(h => tuneSet.has(h)),
  parents_shared_with_tune: [...hparents].filter(p => tc.some(r => r.parent === p)),
  min_author_time_heldout: Math.min(...[...heldCommits.values()].map(x => x.c.at)), max_author_time_tune: Math.max(...tc.map(r => r.author_time)),
  min_day_heldout: [...heldCommits.values()].map(x => x.c.d).sort()[0], max_day_tune: tc.map(r => r.day).sort().pop(),
  heldout_commits_with_author_before_last_tune: [...heldCommits.values()].filter(x => x.c.at <= Math.max(...tc.map(r => r.author_time))).map(x => x.c.h.slice(0, 8)),
  all_seeds_of_matched_commits_present: [...heldCommits.values()].every(x => { const ex = t1(x.c); return ex.length === x.n; }),
  T1_rule_heldout_commits_not_in_tasks: held.filter(x => !heldCommits.has(x.c.h)).map(x => x.c.h.slice(0, 8) + ' ' + x.c.d),
  heldout_parents_with_multiple_T1_children: [...hparents].filter(p => held.filter(x => x.c.p === p).length > 1).length,
  heldout_parent_is_tune_commit_or_descendant_note: [...hparents].filter(p => tuneSet.has(p)).length,
  tune_commit_parent_dates_max: null
};
rep.renames_in_T1 = renames.filter(r => r.d < '2026-07-01' && r.d >= '2026-06-01');
rep.renames_heldout = renames.filter(r => r.d >= '2026-07-01').length;
rep.T1_total = allT1.length;
// non-merge commit count and history size up to largest graphs
fs.writeFileSync(OUT + '/tasks-result.json', JSON.stringify(rep, null, 1));
console.log(JSON.stringify(rep, null, 1).slice(0, 8000));
