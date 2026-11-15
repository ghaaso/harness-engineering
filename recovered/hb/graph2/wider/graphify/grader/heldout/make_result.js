'use strict';
// Writes the repository copy result.json (aggregates only: no reference content, no per-task or
// per-question score, no per-commit arrays) from this folder's outputs.
const fs = require('fs');
const path = require('path');
const H = __dirname;
const OUT = 'C:/Users/User/Documents/projects/EMS_workshop1/docs/program/evidence/harness-bottlenecks/graph2/graphify/result.json';
const J = (f) => JSON.parse(fs.readFileSync(path.join(H, f), 'utf8'));
const sc = J('scores.json'); const cp = J('comparisons.json'); const lg = J('linkgroups.json'); const nt = J('native_g.json'); const tq = J('tq_g.json'); const bc = J('buildcost.json'); const vi = J('verify_inventory.json'); const hc = J('handcheck.json');
const strip = (o) => JSON.parse(JSON.stringify(o, (k, v) => (/per_cluster_diffs|per_commit_diffs|per_question_f1_diffs|diff_exact|ci95_exact/.test(k) ? undefined : v)));
const res = {
  written_at: new Date().toISOString(),
  what: 'Held-out scoring of graphify 0.9.108 code layer (configuration query-seed-full-d3, hash 66367cd303fdd75b) on the known-answer tasks and questions of the graph test, against the stored held-out answers of the typed primary, scripted search and both floors (protocol addendum 7).',
  inventory: { ok: vi.ok, files_checked: vi.files_checked, adapter_code_hash: vi.adapter_code_hash_now, comparator_files_checked: vi.comparator_files_checked, scoring_started_utc: fs.readFileSync(path.join(H, 'SCORING_STARTED'), 'utf8').trim() },
  scorer: 'build/arms/common/score.js, rule content, references = held-out lines of sealed/references.jsonl; comparator rows reproduce the finished test exactly: ' + sc.comparator_rows_equal_finished_test,
  independent_rescore: hc,
  table: sc.rows.map((r) => ({ arm: r.arm, set: r.set, tasks: r.tasks, clusters: r.commits_or_clusters, primary: r.primary, se: r.primary_se, r2000: r.r2000, r4000: r.r4000, r16000: r.r16000, median_tokens_8000: r.median_tokens_8000, empty_answers: r.empty_answers })),
  comparisons: strip(cp.comparisons),
  by_seed_location: strip(cp.runtime),
  t3_by_parent_commit: cp.t3_by_parent,
  sensitivity_five_most_favourable_commits_dropped: cp.sensitivity,
  graphify_empty_answers: Object.fromEntries(Object.entries(cp.graphify_empty_answers).map(([s, v]) => [s, { count: v.length, reason: [...new Set(v.map((x) => x.reason))], seed_location: v.map((x) => x.seed_runtime) }])),
  primary_with_graphify_empty_seeds_excluded: cp.primary_with_graphify_empty_seeds_excluded,
  native_form_G5: strip(nt),
  questions_G6: strip({ matching_rule: 'file: whole path in the text; path::Name: one line holds the path and the last name part as a word; migration id: a migration file path with that prefix; table: whole word; route: URL path verbatim; doc line: doc path and line label on one line. Object keys pooled. Answer items = distinct candidates of the reference form named in the text (see tq_g.js). Conventions of tq_score.js (empty reference: recall 1; empty answer and empty reference: 1/1/1).',
    all30: tq.all30, untouched22: tq.untouched22, by_kind: tq.by_kind, graphify_answer_tokens: tq.graphify_answer_tokens, graphify_answer_items_median: tq.graphify_answer_items_median, sensitivity_definition_counts_on_path_alone: tq.sensitivity_definition_counts_on_path_alone }),
  link_kind_groups_item20: { tasks_T1: strip(lg), questions: strip({ rule: tq.link_groups.rule, groups: tq.link_groups.groups }) },
  build_cost: bc,
};
fs.writeFileSync(OUT, JSON.stringify(res, null, 1) + '\n');
// guard: no task id other than T1-0786, no reference path strings
const txt = fs.readFileSync(OUT, 'utf8');
const ids = [...new Set((txt.match(/T[1-4]x?-\d{3,4}/g) || []))];
const paths = (txt.match(/(backend|technician-app|src)\/[A-Za-z0-9_./-]+\.(py|ts|tsx|js|jsx)/g) || []);
console.log('written', OUT, 'bytes', txt.length, 'task ids:', ids.join(','), 'repo paths:', paths.length);
