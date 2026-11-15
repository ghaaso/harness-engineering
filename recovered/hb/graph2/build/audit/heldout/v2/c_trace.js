'use strict';
// Check 1 + 2 (held-out part): every numeric leaf of data.json in the held-out sections is compared with my own
// recomputation (b_heldout.json, a_questions.json) or, where I did not recompute a measure, traced to scores.json.
// Tolerances: point values |data - mine| <= 0.00006 (4-decimal rounding); interval ends |data - mine| <= 0.005; counts exact.
const L = require('./lib.js');
const { fs, path, B, OUT, r4, refHO, refTU, gz } = L;
const D = JSON.parse(fs.readFileSync(path.join(B, 'sealed/grader/heldout/v2/data.json'), 'utf8'));
const M = JSON.parse(fs.readFileSync(path.join(OUT, 'b_heldout.json'), 'utf8'));
const Q = JSON.parse(fs.readFileSync(path.join(OUT, 'a_questions.json'), 'utf8'));
const S = JSON.parse(fs.readFileSync(path.join(B, 'sealed/grader/heldout/scores.json'), 'utf8')).rows;
const res = { checked: 0, ok: 0, traced_only: 0, mismatches: [], untraced: [] };
const covered = new Set();
function cmp(p, dv, mv, kind = 'pt', src = 'mine') {
  covered.add(p); res.checked++;
  if (mv === undefined) { res.untraced.push({ path: p, data: dv, why: 'no recomputed value' }); return; }
  let ok;
  if (dv === null || mv === null) ok = dv === mv || (dv === null && mv === undefined);
  else if (kind === 'int') ok = dv === mv;
  else if (kind === 'ci') ok = Math.abs(dv - mv) <= 0.005;
  else ok = Math.abs(dv - mv) <= 0.00006;
  if (src !== 'mine') res.traced_only++;
  if (ok) res.ok++; else res.mismatches.push({ path: p, data: dv, recomputed: kind === 'int' ? mv : r4(mv), kind, src });
}
const ci = (p, d, m) => { cmp(p + '[0]', d[0], m[0], 'ci'); cmp(p + '[1]', d[1], m[1], 'ci'); };
function brief(p, d, m, names = {}) { // n_clusters/mean_a/mean_b/diff/ci95/a_higher/b_higher/ties
  if (!d) return;
  const N = { n: 'n_clusters', diff: 'diff', a_higher: 'a_higher', b_higher: 'b_higher', ties: 'ties', ...names };
  if (d[N.n] !== undefined) cmp(p + '.' + N.n, d[N.n], m.n, 'int');
  for (const f of ['mean_a', 'mean_b']) if (d[f] !== undefined) cmp(p + '.' + f, d[f], m[f]);
  if (d[N.diff] !== undefined) cmp(p + '.' + N.diff, d[N.diff], m.diff);
  if (d.ci95) ci(p + '.ci95', d.ci95, m.ci95);
  for (const f of ['a_higher', 'b_higher', 'ties']) if (d[N[f]] !== undefined) cmp(p + '.' + N[f], d[N[f]], m[f], 'int');
}
// ---------- sets ----------
const cnt = (map, set) => { const r = [...map.values()].filter((x) => x.set === set); return { tasks: r.length, commits: new Set(r.map((x) => x.commit)).size }; };
for (const [i, s] of D.sets.entries()) {
  if (['T1', 'T1x', 'T2'].includes(s.id)) { const h = cnt(refHO, s.id); const t = cnt(refTU, s.id); cmp(`sets[${i}].heldout.tasks`, s.heldout.tasks, h.tasks, 'int'); cmp(`sets[${i}].heldout.commits`, s.heldout.commits, h.commits, 'int'); cmp(`sets[${i}].tuning.tasks`, s.tuning.tasks, t.tasks, 'int'); cmp(`sets[${i}].tuning.commits`, s.tuning.commits, t.commits, 'int'); }
  if (s.id === 'T3') { const r = [...refHO.values()].filter((x) => x.set === 'T3'); cmp(`sets[${i}].heldout.tasks`, s.heldout.tasks, r.length, 'int'); cmp(`sets[${i}].heldout.parent_commits`, s.heldout.parent_commits, new Set(r.map((x) => x.parent)).size, 'int'); cmp(`sets[${i}].heldout.documents`, s.heldout.documents, new Set(r.map((x) => x.doc)).size, 'int'); cmp(`sets[${i}].tuning.tasks`, s.tuning.tasks, [...refTU.values()].filter((x) => x.set === 'T3').length, 'int'); cmp(`sets[${i}].tuning.commits`, s.tuning.commits, 0, 'int'); }
  if (s.id === 'T4') { const r = [...refHO.values()].filter((x) => x.set === 'T4'); cmp(`sets[${i}].heldout.tasks`, s.heldout.tasks, r.length, 'int'); cmp(`sets[${i}].heldout.fix_commits`, s.heldout.fix_commits, new Set(r.map((x) => x.fix_commit)).size, 'int'); cmp(`sets[${i}].tuning.tasks`, s.tuning.tasks, [...refTU.values()].filter((x) => x.set === 'T4').length, 'int'); cmp(`sets[${i}].tuning.commits`, s.tuning.commits, 0, 'int'); }
  if (s.id === 'TQ') { cmp(`sets[${i}].heldout.questions`, s.heldout.questions, Q.blocks.all30_with_judgement.n, 'int'); cmp(`sets[${i}].tuning.questions`, s.tuning.questions, L.jl(path.join(B, 'tasks/tq_questions.jsonl')).filter((q) => q.split === 'tune').length, 'int'); }
}
// ---------- held-out table and curves ----------
const sk = (arm, role, set) => S.find((r) => r.arm === arm && r.role === role && r.set === set);
for (const [i, r] of D.heldout.table.entries()) {
  const m = M.table[`${r.arm}/${r.role}/${r.set}`]; const s = sk(r.arm, r.role, r.set); const p = `heldout.table[${i}]`;
  cmp(p + '.n_tasks', r.n_tasks, m.tasks, 'int'); cmp(p + '.n_clusters', r.n_clusters, m.clusters, 'int');
  cmp(p + '.primary_recall_at_8000_tokens', r.primary_recall_at_8000_tokens, m.primary); cmp(p + '.standard_error', r.standard_error, m.se);
  for (const b of [2000, 4000, 8000, 16000]) cmp(p + '.recall_at_' + b, r['recall_at_' + b], m['r' + b]);
  cmp(p + '.area_under_recall_curve', r.area_under_recall_curve, m.auc); cmp(p + '.definition_recall_at_8000', r.definition_recall_at_8000, m.def); cmp(p + '.file_recall_at_8000', r.file_recall_at_8000, m.file);
  cmp(p + '.recall_without_padding_tail_at_8000', r.recall_without_padding_tail_at_8000, m.unpad);
  cmp(p + '.median_answer_tokens_at_8000_budget', r.median_answer_tokens_at_8000_budget, m.median_tok8000, 'int'); cmp(p + '.median_lookups', r.median_lookups, m.median_lookups, 'int');
  cmp(p + '.share_of_tasks_reaching_80_percent_recall_within_16000', r.share_of_tasks_reaching_80_percent_recall_within_16000, s ? s.reach80_share_tasks : undefined, 'pt', 'scores.json');
  // not recomputed by me: traced to scores.json
  cmp(p + '.precision_at_8000', r.precision_at_8000, s ? s.precision8000 : undefined, 'pt', 'scores.json');
  cmp(p + '.median_tokens_read_by_search', r.median_tokens_read_by_search, s ? s.median_tokens_read_search : undefined, 'pt', 'scores.json');
  cmp(p + '.median_tokens_to_80_percent_where_reached', r.median_tokens_to_80_percent_where_reached, s ? s.median_t80_where_reached : undefined, 'pt', 'scores.json');
  cmp(p + '.tuning_primary_same_configuration', r.tuning_primary_same_configuration, s ? s.tune_primary : undefined, 'pt', 'scores.json');
  if (r.tuning_primary_same_configuration != null) cmp(p + '.tuning_minus_heldout', r.tuning_minus_heldout, s.tune_primary - m.primary); else cmp(p + '.tuning_minus_heldout', r.tuning_minus_heldout, null);
}
for (const [i, c] of D.heldout.curves.entries()) {
  const m = M.table[`${c.arm}/${c.role}/${c.set}`]; const s = sk(c.arm, c.role, c.set); const p = `heldout.curves[${i}]`;
  cmp(p + '.n_clusters', c.n_clusters, m.clusters, 'int');
  for (const [j, bp] of c.budget_points.entries()) { cmp(`${p}.budget_points[${j}].tokens`, bp.tokens, [0, 2000, 4000, 8000, 16000][j], 'int'); cmp(`${p}.budget_points[${j}].recall`, bp.recall, bp.tokens ? m['r' + bp.tokens] : 0); }
  for (const [j, g] of c.whole_item_grid.entries()) { cmp(`${p}.whole_item_grid[${j}].tokens`, g.tokens, s.curve_grid_tokens[j], 'int', 'scores.json'); cmp(`${p}.whole_item_grid[${j}].recall`, g.recall, s.curve[j], 'pt', 'scores.json'); }
}
// ---------- comparisons ----------
for (const grp of ['rows', 'descriptive']) for (const [i, row] of D.comparisons[grp].entries()) {
  const m = M.comparisons[row.id]; const p = `comparisons.${grp}[${i}]`;
  for (const [set, d] of Object.entries(row.sets || {})) {
    if (!m) { res.untraced.push({ path: p + '.sets.' + set, why: 'no recomputed comparison ' + row.id }); continue; }
    const ms = m.sets[set]; const q = `${p}.sets.${set}`;
    brief(q, d, ms.r8000, { diff: 'difference', a_higher: 'a_higher_clusters', b_higher: 'b_higher_clusters', ties: 'tied_clusters' });
    for (const [f, mm] of [['at_2000', 'r2000'], ['at_4000', 'r4000'], ['at_16000', 'r16000'], ['area_under_curve', 'auc']]) if (d[f]) { cmp(`${q}.${f}.difference`, d[f].difference, ms[mm].diff); ci(`${q}.${f}.ci95`, d[f].ci95, ms[mm].ci95); }
  }
  if (row.id === 'H4') for (const [b, x] of Object.entries(row.by_block || {})) { const qb = Q.blocks[b]; cmp(`${p}.by_block.${b}.diff`, x.diff, qb.diff); ci(`${p}.by_block.${b}.ci95`, x.ci95, qb.ci95); }
}
// ---------- splits ----------
const sp = D.splits;
for (const [g, c] of Object.entries(sp.heldout_counts)) { cmp(`splits.heldout_counts.${g}.tasks`, c.tasks, M.splits.counts[g].tasks, 'int'); cmp(`splits.heldout_counts.${g}.commits`, c.commits, M.splits.counts[g].commits, 'int'); }
for (const [n, c] of Object.entries(sp.comparisons)) for (const [g, d] of Object.entries(c.groups)) brief(`splits.comparisons.${n}.groups.${g}`, d, M.splits.comparisons[n][g]);
for (const [g, c] of Object.entries(sp.tuning_counts)) { cmp(`splits.tuning_counts.${g}.tasks`, c.tasks, M.tuning_split.counts[g].tasks, 'int'); cmp(`splits.tuning_counts.${g}.commits`, c.commits, M.tuning_split.counts[g].commits, 'int'); }
cmp('splits.tuning_root_tasks', sp.tuning_root_tasks, M.tuning_split.root, 'int');
const tt = M.tuning_split.counts.all.tasks; const tc = M.tuning_split.counts.all.commits; const ht = M.splits.counts.all.tasks; const hc = M.splits.counts.all.commits;
for (const g of ['mobile', 'backend', 'web_without_root_task']) { const x = sp.mix[g]; cmp(`splits.mix.${g}.tuning_share_of_tasks`, x.tuning_share_of_tasks, M.tuning_split.counts[g].tasks / tt); cmp(`splits.mix.${g}.heldout_share_of_tasks`, x.heldout_share_of_tasks, M.splits.counts[g].tasks / ht); cmp(`splits.mix.${g}.tuning_share_of_commits`, x.tuning_share_of_commits, M.tuning_split.counts[g].commits / tc); cmp(`splits.mix.${g}.heldout_share_of_commits`, x.heldout_share_of_commits, M.splits.counts[g].commits / hc); }
cmp('splits.mix.root.tuning_tasks', sp.mix.root.tuning_tasks, M.tuning_split.root, 'int'); cmp('splits.mix.root.heldout_tasks', sp.mix.root.heldout_tasks, M.splits.root_tasks.length, 'int');
const rfmap = { typed: 'typed', search: 'search', search2: 'search2', fco: 'fco', fdir: 'fdir' };
for (const [k, v] of Object.entries(sp.tuning_rows_found)) if (typeof v === 'number') cmp(`splits.tuning_rows_found.${k}`, v, M.tuning_split.rows_found[rfmap[k]], 'int');
for (const [n, c] of Object.entries(sp.tuning_comparisons)) for (const [g, d] of Object.entries(c)) brief(`splits.tuning_comparisons.${n}.${g}`, d, M.tuning_split.comparisons[n][g]);
for (const [n, v] of Object.entries(sp.heldout_reweighted_to_tuning_mix)) cmp(`splits.heldout_reweighted_to_tuning_mix.${n}`, v, M.splits.reweighted[n]);
// ---------- sensitivity ----------
const se = D.sensitivity;
for (const [k, list] of Object.entries(se.largest_commits)) for (const [i, x] of list.entries()) { const m = M.sensitivity.largest[k][i]; cmp(`sensitivity.largest_commits.${k}[${i}].commit`, x.commit === m.commit ? 1 : 0, 1, 'int'); for (const f of ['changed_files', 'tasks', 'units']) cmp(`sensitivity.largest_commits.${k}[${i}].${f}`, x[f], m[f], 'int'); }
for (const [n, c] of Object.entries(se.comparisons)) for (const [k, d] of Object.entries(c)) {
  if (k === 'a' || k === 'b') continue; const m = M.sensitivity.comparisons[n][k];
  if (k === 'leave_one_commit_out_range') { cmp(`sensitivity.comparisons.${n}.${k}[0]`, d[0], m[0]); cmp(`sensitivity.comparisons.${n}.${k}[1]`, d[1], m[1]); continue; }
  brief(`sensitivity.comparisons.${n}.${k}`, d, m);
}
for (const [k, d] of Object.entries(se.seed_match_distribution_T1_tasks)) for (const [f, v] of Object.entries(d)) cmp(`sensitivity.seed_match_distribution_T1_tasks.${k}.${f}`, v, M.sensitivity.seed_dist[k] ? M.sensitivity.seed_dist[k][f] : undefined, 'int');
for (const k of Object.keys(se)) if (!['largest_commits', 'comparisons', 'seed_match_distribution_T1_tasks'].includes(k) && typeof se[k] === 'number') { const map = { seeds_matched_by_id_only_tasks: M.sensitivity.id_only.tasks }; cmp('sensitivity.' + k, se[k], map[k], 'int'); }
// ---------- T3 ----------
const t3 = D.t3; const gsz = Object.values(M.t3.counts.groups);
cmp('t3.tasks', t3.tasks, M.t3.counts.tasks, 'int'); cmp('t3.parents', t3.parents, M.t3.counts.parents, 'int'); cmp('t3.documents', t3.documents, M.t3.counts.documents, 'int'); cmp('t3.parent_document_groups', t3.parent_document_groups, gsz.length, 'int'); cmp('t3.largest_group_tasks', t3.largest_group_tasks, Math.max(...gsz), 'int');
for (const [n, c] of Object.entries(t3.comparisons)) {
  const m = M.t3.comparisons[n]; brief(`t3.comparisons.${n}.by_task`, c.by_task, m.task); brief(`t3.comparisons.${n}.by_parent_commit`, c.by_parent_commit, m.parent); brief(`t3.comparisons.${n}.by_parent_and_document`, c.by_parent_and_document, m.parentdoc);
  const used = new Set();
  for (const [i, g] of c.per_group_sign.entries()) { const j = m.per_group.findIndex((x, k) => !used.has(k) && x.tasks === g.tasks && Math.abs(x.mean_a - g.mean_a) < 6e-5 && Math.abs(x.mean_b - g.mean_b) < 6e-5 && x.sign === g.sign); const p = `t3.comparisons.${n}.per_group_sign[${i}]`; if (j < 0) { res.mismatches.push({ path: p, data: g, recomputed: m.per_group }); res.checked += 4; } else { used.add(j); res.checked += 4; res.ok += 4; ['tasks', 'mean_a', 'mean_b', 'sign'].forEach((f) => covered.add(p + '.' + f)); } }
}
// ---------- draws ----------
const DR = ['lbs2', 'lbs2d1', 'lbs2d2', 'lbs2d3', 'lbs2d4'];
cmp('draws.relational_primary_T1', D.draws.relational_primary_T1, M.table['relational/primary/T1'].primary);
for (const [i, r] of D.draws.rows.entries()) { const m = M.draws.rows[DR[i]]; cmp(`draws.rows[${i}].T1_primary`, r.T1_primary, m.T1.mean_a); for (const k of ['T1', 'T2', 'T3', 'r2000', 'r4000']) brief(`draws.rows[${i}].${k}`, r[k], m[k]); }
cmp('draws.T1_spread.min', D.draws.T1_spread.min, M.draws.spread.min); cmp('draws.T1_spread.max', D.draws.T1_spread.max, M.draws.spread.max); cmp('draws.T1_spread.mean', D.draws.T1_spread.mean, M.draws.spread.mean); cmp('draws.T1_spread.sd', D.draws.T1_spread.sd, M.draws.spread.sd_sample);
// ---------- padding ----------
for (const [k, a] of Object.entries(D.padding.arms)) {
  const m = M.padding[k]; const p = 'padding.arms.' + k; cmp(p + '.tasks', a.tasks, m.tasks, 'int');
  for (const w of ['per_task', 'per_commit']) { cmp(`${p}.${w}.recall`, a[w].recall, m[w].recall); cmp(`${p}.${w}.from_own_head`, a[w].from_own_head, m[w].head); cmp(`${p}.${w}.from_padding_tail_only`, a[w].from_padding_tail_only, m[w].pad); cmp(`${p}.${w}.via_path_with_cochange_edge`, a[w].via_path_with_cochange_edge, ['typed', 's1', 'lbs2'].includes(k) ? m[w].co : 0); }
  cmp(p + '.share_from_padding_tail_per_task', a.share_from_padding_tail_per_task, m.share_pad); cmp(p + '.share_via_cochange_per_task', a.share_via_cochange_per_task, ['typed', 's1', 'lbs2'].includes(k) ? m.share_co : 0);
}
// ---------- questions ----------
const qd = D.questions;
for (const b of ['all30', 'untouched23', 'untouched22']) { const x = qd.h4[b]; const m = Q.blocks[b + '_with_judgement']; cmp(`questions.h4.${b}.diff`, x.diff, m.diff); ci(`questions.h4.${b}.ci95`, x.ci95, m.ci95); cmp(`questions.h4.${b}.typed_higher`, x.typed_higher, m.typed_higher, 'int'); cmp(`questions.h4.${b}.search_higher`, x.search_higher, m.search_higher, 'int'); cmp(`questions.h4.${b}.ties`, x.ties, m.ties, 'int'); }
qd.touched_questions.forEach((v, i) => cmp(`questions.touched_questions[${i}]`, v, [24, 25, 27, 33, 40, 41, 46, 47][i], 'int'));
for (const [b, x] of Object.entries(qd.blocks)) {
  const m = Q.blocks[b]; const p = 'questions.blocks.' + b; cmp(p + '.n_questions', x.n_questions, m.n, 'int');
  for (const [arm, mk] of [['typed', 'relational'], ['search', 'search']]) { const a = x.arms[arm]; const ma = m.arms[mk];
    for (const f of ['macro_f1', 'macro_precision', 'macro_recall', 'micro_f1', 'median_answer_tokens', 'mean_answer_tokens', 'median_lookups']) cmp(`${p}.arms.${arm}.${f}`, a[f], ma[f]);
    if (arm === 'search') { cmp(`${p}.arms.search.median_tokens_read`, a.median_tokens_read, ma.median_read); cmp(`${p}.arms.search.mean_tokens_read`, a.mean_tokens_read, ma.mean_read); } }
  const t = x.typed_minus_search_f1; cmp(p + '.typed_minus_search_f1.diff', t.diff, m.diff); ci(p + '.typed_minus_search_f1.ci95', t.ci95, m.ci95); cmp(p + '.typed_minus_search_f1.typed_higher', t.typed_higher, m.typed_higher, 'int'); cmp(p + '.typed_minus_search_f1.search_higher', t.search_higher, m.search_higher, 'int'); cmp(p + '.typed_minus_search_f1.ties', t.ties, m.ties, 'int');
  for (const [k, v] of Object.entries(x.per_kind)) { const mk = m.per_kind[k]; cmp(`${p}.per_kind.${k}.questions`, v.questions, mk.questions, 'int'); cmp(`${p}.per_kind.${k}.typed_mean_f1`, v.typed_mean_f1, mk.typed); cmp(`${p}.per_kind.${k}.search_mean_f1`, v.search_mean_f1, mk.search); cmp(`${p}.per_kind.${k}.mean_difference`, v.mean_difference, mk.diff); }
}
for (const [i, q] of qd.per_question.entries()) { const m = Q.per_question[i]; for (const f of Object.keys(q)) if (typeof q[f] === 'number') cmp(`questions.per_question[${i}].${f}`, q[f], m[f], ['id', 'typed_answer_tokens', 'search_answer_tokens', 'search_tokens_read', 'typed_lookups', 'search_lookups'].includes(f) ? 'int' : 'pt'); }
for (const b of ['all30', 'untouched23', 'untouched22']) { const x = qd.tokens_two_ways[b]; const m = Q.blocks[b + '_with_judgement'].arms; const p = 'questions.tokens_two_ways.' + b;
  cmp(p + '.typed_final_answer_tokens_median', x.typed_final_answer_tokens_median, m.relational.median_answer_tokens); cmp(p + '.search_final_answer_tokens_median', x.search_final_answer_tokens_median, m.search.median_answer_tokens); cmp(p + '.search_tokens_read_median', x.search_tokens_read_median, m.search.median_read);
  cmp(p + '.typed_final_answer_tokens_mean', x.typed_final_answer_tokens_mean, m.relational.mean_answer_tokens); cmp(p + '.search_final_answer_tokens_mean', x.search_final_answer_tokens_mean, m.search.mean_answer_tokens); cmp(p + '.search_tokens_read_mean', x.search_tokens_read_mean, m.search.mean_read); }
// ---------- trust: tuning-to-held-out drop ----------
const armName = { relational: 'relational', LadybugDB: 'ladybug', DuckPGQ: 'duckpgq', search: 'search', 'scripted search': 'search', 'floor-dir': 'floor-dir', 'floor-co': 'floor-co', 'same-directory floor': 'floor-dir', 'co-change floor': 'floor-co', ladybug: 'ladybug', duckpgq: 'duckpgq' };
for (const [i, r] of D.trust.tuning_to_heldout_drop.entries()) { const a = armName[r.arm] || r.arm; const m = M.table[`${a}/${r.role}/${r.set}`]; const s = sk(a, r.role, r.set); const p = `trust.tuning_to_heldout_drop[${i}]`;
  if (!m) { res.untraced.push({ path: p, why: 'arm name ' + r.arm }); continue; }
  cmp(p + '.heldout_primary', r.heldout_primary, m.primary); cmp(p + '.tuning_primary', r.tuning_primary, s.tune_primary, 'pt', 'scores.json'); cmp(p + '.drop', r.drop, s.tune_primary - m.primary); cmp(p + '.tuning_n_commits', r.tuning_n_commits, 65, 'int'); cmp(p + '.heldout_n_commits', r.heldout_n_commits, m.clusters, 'int'); }
{ const e = D.trust.declared_changes_after_tuning_data; const s1 = M.comparisons['X-s1-primary'].sets.T1; const x = e[0].effect_on_heldout.s1_minus_primary_T1; brief('trust.declared_changes_after_tuning_data[0].effect_on_heldout.s1_minus_primary_T1', x, s1.r8000, { diff: 'difference', a_higher: 'a_higher_clusters', b_higher: 'b_higher_clusters', ties: 'tied_clusters' });
  for (const [f, mm] of [['at_2000', 'r2000'], ['at_4000', 'r4000'], ['at_16000', 'r16000'], ['area_under_curve', 'auc']]) { cmp(`trust.declared_changes_after_tuning_data[0].effect_on_heldout.s1_minus_primary_T1.${f}.difference`, x[f].difference, s1[mm].diff); ci(`trust.declared_changes_after_tuning_data[0].effect_on_heldout.s1_minus_primary_T1.${f}.ci95`, x[f].ci95, s1[mm].ci95); }
  const y = e[1].effect_on_heldout; cmp('trust.declared_changes_after_tuning_data[1].effect_on_heldout.touched_questions', y.touched_questions, 8, 'int');
  for (const [k, b] of [['h4_all30', 'all30_with_judgement'], ['h4_untouched22', 'untouched22_with_judgement']]) { const p = 'trust.declared_changes_after_tuning_data[1].effect_on_heldout.' + k; cmp(p + '.diff', y[k].diff, Q.blocks[b].diff); ci(p + '.ci95', y[k].ci95, Q.blocks[b].ci95); cmp(p + '.typed_higher', y[k].typed_higher, Q.blocks[b].typed_higher, 'int'); cmp(p + '.search_higher', y[k].search_higher, Q.blocks[b].search_higher, 'int'); cmp(p + '.ties', y[k].ties, Q.blocks[b].ties, 'int'); } }
// ---------- leaves not covered by this script ----------
const left = [];
(function walk(x, p) { if (typeof x === 'number') { if (!covered.has(p)) left.push([p, x]); } else if (Array.isArray(x)) x.forEach((v, i) => walk(v, `${p}[${i}]`)); else if (x && typeof x === 'object') for (const k of Object.keys(x)) walk(x[k], p ? p + '.' + k : k); })(D, '');
res.not_covered_here = left.length; res.not_covered_by_section = left.reduce((m, [p]) => { const s = p.split(/[.[]/)[0]; m[s] = (m[s] || 0) + 1; return m; }, {});
fs.writeFileSync(path.join(OUT, 'c_trace.json'), JSON.stringify({ ...res, not_covered_list: left }, null, 1));
console.log('checked', res.checked, 'ok', res.ok, 'traced to scores.json', res.traced_only, 'mismatches', res.mismatches.length, 'untraced', res.untraced.length, 'not covered here', left.length, JSON.stringify(res.not_covered_by_section));
for (const m of res.mismatches.slice(0, 60)) console.log('MISMATCH', JSON.stringify(m));
for (const m of res.untraced.slice(0, 30)) console.log('UNTRACED', JSON.stringify(m));
