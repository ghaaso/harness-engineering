'use strict';
// Compose the kept result file: <evidence>/widen/k0/result.json, from out/final1 (report.json,
// nonempty.json), out/bench_index.json, the three checks, the chain and the question set, plus the
// determinism hashes of out/final1 against out/final2 (and out/run1 against out/run2).
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');
const C = require('./conf');

const rj = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const F1 = path.join(C.OUT, 'final1'); const F2 = path.join(C.OUT, 'final2');
const rep = rj(path.join(F1, 'report.json'));
const ne = rj(path.join(F1, 'nonempty.json'));
const bench = rj(path.join(C.OUT, 'bench_index.json'));
const chain = rj(path.join(C.DATA, 'chain.json'));
const tree = rj(path.join(C.DATA, 'tree.json'));
const qset = rj(path.join(C.DATA, 'questions.json'));
const det = {};
for (const [a, b, lab] of [[F1, F2, 'final'], [path.join(C.OUT, 'run1'), path.join(C.OUT, 'run2'), 'first_pair_older_code']]) {
  if (!fs.existsSync(path.join(a, 'replay.json')) || !fs.existsSync(path.join(b, 'replay.json'))) continue;
  const ra = sha(fs.readFileSync(path.join(a, 'replay.json'))); const rb = sha(fs.readFileSync(path.join(b, 'replay.json')));
  const la = sha(zlib.gunzipSync(fs.readFileSync(path.join(a, 'lookups_tree.jsonl.gz')))); const lb = sha(zlib.gunzipSync(fs.readFileSync(path.join(b, 'lookups_tree.jsonl.gz'))));
  det[lab] = { replay_json_sha256: [ra, rb], lookups_log_sha256: [la, lb], identical: ra === rb && la === lb };
}
const kindCounts = {};
for (const q of qset.questions) { const k = q.kind; if (!kindCounts[k]) kindCounts[k] = { tq50: 0, gen: 0, completion: 0, by_runtime: {} }; kindCounts[k][q.set]++; kindCounts[k].by_runtime[q.runtime] = (kindCounts[k].by_runtime[q.runtime] || 0) + 1; }
const T = rj(path.join(C.K0, 'text.json'));

const result = {
  lane: 'K0 cache replay (deterministic, no model, no agent)',
  date: '2026-11-13',
  status: T.status,
  where: {
    code_and_raw: C.K0,
    final_run: F1,
    notes: path.join(C.NOTES_DIR, 'NOTES.md'),
  },
  setup: {
    snapshots: { cached: chain.n_snapshots, on_main_first_parent_chain: chain.n_on_chain, off_chain: chain.n_off_chain, main_first_parent_commits: chain.fp_len, main_chain_span: '2026-05-31 to 2026-08-03 (first-parent index 0 to 154)', extractor_version: chain.extractor_versions_on_chain },
    tree: { snapshots: tree.order.length, roots: tree.roots.length, steps: tree.order.length - tree.roots.length, branch_points: tree.branching, step_gap_commits_histogram: tree.gapHist },
    main_chain_gaps: { stride_1: 'mean 1.57, median 1, max 7 commits (98 steps)', stride_2: 'mean 3.14, median 2, max 13 (49 steps)', stride_4: 'mean 6.33, median 5, max 15 (24 steps)', stride_8: 'mean 12.67, median 9, max 26 (12 steps)' },
    questions: { total: qset.questions.length, per_kind: kindCounts, generation_seed: qset.seed, generated_candidates: qset.genCounts, completion_candidates: qset.compCounts },
    checks: {
      frozen_commit_vs_sql_answer_files: rj(path.join(C.OUT, 'check_frozen.json')).same + ' of 50 identical',
      js_vs_sql_at_40_snapshots: (() => { const c = rj(path.join(C.OUT, 'crosscheck.json')); return c.identical + ' of ' + c.compared + ' identical'; })(),
      completion_vs_frozen_reference_records: (() => { const c = rj(path.join(C.OUT, 'check_completion.json')); return c.identical + ' of ' + c.checked + ' held-out T1 records identical (items shown inside 8,000 tokens)'; })(),
    },
    determinism: det,
    policies: T.policy_definitions,
  },
  results: {
    per_policy: rep.per_policy,
    per_kind_tree: rep.per_kind_tree,
    per_runtime_tree_kinds_1_to_8: rep.per_runtime_tree_kinds_1_to_8,
    per_runtime_tree_completion: rep.per_runtime_tree_completion,
    by_age_tree_kinds_1_to_8: rep.by_age_tree_kinds_1_to_8,
    by_age_tree_completion: rep.by_age_tree_completion,
    by_gap_tree_kinds_1_to_8: rep.by_gap_tree_kinds_1_to_8,
    by_gap_tree_completion: rep.by_gap_tree_completion,
    stride_lanes_main_chain: rep.lanes_stride,
    nonempty_answers_tree_kinds_1_to_8: ne,
    per_question_tree: rep.per_question_tree,
    answer_changes_tree: rep.answer_changes_tree,
    empty_answers: rep.empty_answers,
    dependency_cases: rep.dependency_cases,
    stale_served_by_fact_level_policies: rep.stale_fact_level,
    fixes_to_dependency_recording: [],
    stale_file_level_tree_by_cause: rep.stale_file_tree_by_cause,
    early_cutoff_counters: rep.cutoff,
    dependency_index: { sizes_per_answer_by_kind_over_all_derivations: rep.dep_sizes, replay_timing: rep.index_cost, bench_at_frozen_commit_run_alone: bench },
    token_bound: { label: 'UPPER BOUND, NOT A SAVING', ...rep.token_bound, wording: T.token_wording },
  },
  what_it_shows: T.what_it_shows,
  what_it_does_not_show: T.what_it_does_not_show,
  must_not_claim: T.must_not_claim,
  problems: T.problems,
};
fs.mkdirSync(C.NOTES_DIR, { recursive: true });
fs.writeFileSync(path.join(C.NOTES_DIR, 'result.json'), JSON.stringify(result, null, 1));
console.log('wrote', path.join(C.NOTES_DIR, 'result.json'), JSON.stringify(det));
