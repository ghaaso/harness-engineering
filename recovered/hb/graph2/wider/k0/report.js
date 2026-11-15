'use strict';
// Aggregates of one replay run -> <run>/report.json (and a console summary).
// Usage: node report.js <rundir>
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const C = require('./conf');

const RUN = path.resolve(process.argv[2] || path.join(C.OUT, 'final1'));
const R = JSON.parse(fs.readFileSync(path.join(RUN, 'replay.json'), 'utf8'));
const POL = R.policies;
const COL = { lookups: 0, hits: 1, stale: 2, recomputes: 3, avoidable: 4, cold: 5, reads: 6, subreads: 8 };

// one-sided 95 % Clopper-Pearson upper bound for x events in n trials (binomial; assumes independence)
function cdf(x, n, p) {
  if (p <= 0) return 1; if (p >= 1) return x >= n ? 1 : 0;
  let s = 0; const lp = Math.log(p); const lq = Math.log1p(-p);
  let lpmf = n * lq; // log P(X = 0)
  for (let k = 0; k <= x; k++) {
    s += Math.exp(lpmf);
    lpmf += Math.log((n - k) / (k + 1)) + lp - lq;
  }
  return Math.min(1, s);
}
function upper95(x, n) {
  if (n === 0) return null;
  if (x >= n) return 1;
  if (x === 0) return 1 - Math.pow(0.05, 1 / n);
  let lo = x / n; let hi = 1;
  for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (cdf(x, n, m) > 0.05) lo = m; else hi = m; }
  return hi;
}
const r4 = (x) => (x == null ? null : Math.round(x * 1e4) / 1e4);

function parseKey(k) { const [lane, pol, set, kind, rt, age, gap] = k.split('|'); return { lane, pol, set, kind, rt, age, gap }; }
const rows = Object.entries(R.agg).map(([k, v]) => ({ ...parseKey(k), v }));
function sum(filter) {
  const a = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  for (const r of rows) if (filter(r)) for (let i = 0; i < a.length; i++) a[i] += r.v[i];
  return a;
}
function stat(a) {
  const L = a[0]; const H = a[1]; const S = a[2]; const RC = a[3]; const AV = a[4];
  return {
    lookups: L, served: H, hit_rate: L ? r4(H / L) : null, stale_served: S,
    stale_rate_per_served: H ? r4(S / H) : null, stale_upper95_per_served: r4(upper95(S, H)),
    stale_rate_per_lookup: L ? r4(S / L) : null,
    recomputes: RC, avoidable_recomputes: AV, avoidable_share_of_recomputes: RC ? r4(AV / RC) : null,
    cold_misses: a[5], derivation_reads_spent: a[6], sub_rederive_reads: a[8],
  };
}
const by = (lane, extra, dimName, values) => {
  const o = {};
  for (const val of values) {
    o[val] = {};
    for (const p of POL) o[val][p] = stat(sum((r) => r.lane === lane && r.pol === p && extra(r) && r[dimName] === val));
  }
  return o;
};
const uniq = (f) => [...new Set(rows.map(f))].sort();
const KINDS = ['screen_tables', 'tests_reach', 'invariants_on_file', 'other_half', 'setting_readers', 'migrations_touch_table', 'route_clients', 'change_reach', 'completion'];
const AGES = ['1', '2', '3-5', '6-10', '11-20', '21-50', '51+'];
const GAPS = ['1', '2', '3-4', '5-8', '9+'];
const all = () => true;
const q8 = (r) => r.kind !== 'completion';

const out = { run: path.basename(RUN), snapshots: R.snapshots_processed, questions: R.questions };
out.per_policy = {};
for (const lane of R.lanes) {
  out.per_policy[lane] = {};
  for (const p of POL) out.per_policy[lane][p] = {
    all_kinds: stat(sum((r) => r.lane === lane && r.pol === p)),
    kinds_1_to_8: stat(sum((r) => r.lane === lane && r.pol === p && q8(r))),
    completion: stat(sum((r) => r.lane === lane && r.pol === p && r.kind === 'completion')),
    set_tq50: stat(sum((r) => r.lane === lane && r.pol === p && r.set === 'tq50')),
    set_gen: stat(sum((r) => r.lane === lane && r.pol === p && r.set === 'gen')),
  };
}
out.per_kind_tree = by('tree', all, 'kind', KINDS);
out.per_runtime_tree_kinds_1_to_8 = by('tree', q8, 'rt', ['backend', 'web', 'mobile', 'other']);
out.per_runtime_tree_completion = by('tree', (r) => r.kind === 'completion', 'rt', ['backend', 'web', 'mobile']);
out.by_age_tree_kinds_1_to_8 = by('tree', q8, 'age', AGES);
out.by_age_tree_completion = by('tree', (r) => r.kind === 'completion', 'age', AGES);
out.by_gap_tree_kinds_1_to_8 = by('tree', q8, 'gap', GAPS);
out.by_gap_tree_completion = by('tree', (r) => r.kind === 'completion', 'gap', GAPS);
out.lanes_stride = {};
for (const lane of ['main_s1', 'main_s2', 'main_s4', 'main_s8']) {
  out.lanes_stride[lane] = {};
  for (const p of POL) out.lanes_stride[lane][p] = { kinds_1_to_8: stat(sum((r) => r.lane === lane && r.pol === p && q8(r))), completion: stat(sum((r) => r.lane === lane && r.pol === p && r.kind === 'completion')) };
}

// per-question view (tree lane) from the raw lookup log: questions with any served / any stale answer
const raw = zlib.gunzipSync(fs.readFileSync(path.join(RUN, 'lookups_tree.jsonl.gz'))).toString().split('\n').filter(Boolean).map(JSON.parse);
const Qmeta = new Map(JSON.parse(fs.readFileSync(path.join(C.DATA, 'questions.json'), 'utf8')).questions.map((q) => [q.qid, q]));
const perQ = {};
for (const p of POL) perQ[p] = { questions_with_served: 0, questions_with_stale: 0, k18_with_served: 0, k18_with_stale: 0 };
const qs = new Map();
for (const r of raw) { if (!qs.has(r.q)) qs.set(r.q, POL.map(() => [0, 0])); const a = qs.get(r.q); POL.forEach((p, i) => { const c = r.o[i]; if (c === 'H' || c === 'S') a[i][0]++; if (c === 'S') a[i][1]++; }); }
for (const [qid, a] of qs) {
  const k18 = Qmeta.get(qid).kind !== 'completion';
  POL.forEach((p, i) => {
    if (a[i][0]) { perQ[p].questions_with_served++; if (k18) perQ[p].k18_with_served++; }
    if (a[i][1]) { perQ[p].questions_with_stale++; if (k18) perQ[p].k18_with_stale++; }
  });
}
for (const p of POL) perQ[p].question_level_upper95_kinds_1_to_8 = r4(upper95(perQ[p].k18_with_stale, perQ[p].k18_with_served));
out.per_question_tree = perQ;
out.raw_rows_tree = raw.length;

// answer changes and dependency cases
out.answer_changes_tree = {};
for (const [k, v] of Object.entries(R.changes)) out.answer_changes_tree[k] = { consecutive_lookup_pairs: v[0], answer_changed: v[1], changed_while_no_dependency_file_changed: v[2] };
out.empty_answers = R.empty_answers ? Object.fromEntries(Object.entries(R.empty_answers).map(([k, v]) => [k, { fresh_answers: v[0], empty: v[1], share_empty: r4(v[1] / v[0]) }])) : null;
const dc = {};
for (const d of R.dependency_cases) {
  const k = d.kind; if (!dc[k]) dc[k] = { cases: 0, by_cause: {}, by_runtime: {}, distinct_questions: new Set(), distinct_steps: new Set(), pattern_kinds: {} };
  dc[k].cases++; dc[k].by_cause[d.fact_check] = (dc[k].by_cause[d.fact_check] || 0) + 1;
  dc[k].by_runtime[d.runtime] = (dc[k].by_runtime[d.runtime] || 0) + 1;
  dc[k].distinct_questions.add(d.qid); dc[k].distinct_steps.add(d.sha);
  for (const [pk, n] of Object.entries(d.why.patterns || {})) dc[k].pattern_kinds[pk] = (dc[k].pattern_kinds[pk] || 0) + n;
  for (const [ek, n] of Object.entries(d.why.edges || {})) dc[k].pattern_kinds['edge ' + ek] = (dc[k].pattern_kinds['edge ' + ek] || 0) + n;
  for (const [nk, n] of Object.entries(d.why.nodes || {})) dc[k].pattern_kinds['node ' + nk] = (dc[k].pattern_kinds['node ' + nk] || 0) + n;
}
for (const k of Object.keys(dc)) { dc[k].distinct_questions = dc[k].distinct_questions.size; dc[k].distinct_steps = dc[k].distinct_steps.size; }
out.dependency_cases = { total: R.dependency_cases.length, total_kinds_1_to_8: R.dependency_cases.filter((d) => d.kind !== 'completion').length, distinct_steps: new Set(R.dependency_cases.map((d) => d.sha)).size, per_kind: dc, examples: R.dependency_cases.filter((d) => d.kind !== 'completion').slice(0, 6).map((d) => ({ qid: d.qid, kind: d.kind, step: d.parent.slice(0, 8) + '->' + d.sha.slice(0, 8), before: d.before, after: d.after, cause: d.why.examples })) };
out.stale_fact_level = R.stale_fact;
const sf = {};
for (const d of R.stale_file) { const k = d.kind + ' | ' + d.cause; sf[k] = (sf[k] || 0) + 1; }
out.stale_file_tree_by_cause = sf;

// cutoff extras
out.cutoff = R.cutoff;
out.dep_sizes = R.dep_sizes;

// token bound (kinds 1-8, tree lane): each served answer priced at the tokens its derivation cost in the
// finished test (held-out medians per kind: the scripted search's tokens read, the typed answer's tokens)
const PRICE = {
  search: { screen_tables: 7169, tests_reach: 693, invariants_on_file: 3347, other_half: 598.5, setting_readers: 271, migrations_touch_table: 3545.5, route_clients: 181.5, change_reach: 433 },
  typed: { screen_tables: 7, tests_reach: 56.5, invariants_on_file: 8, other_half: 38.5, setting_readers: 27, migrations_touch_table: 10, route_clients: 58, change_reach: 67.5 },
  overall: { search: 694.5, typed: 31 },
};
out.token_bound = { prices: PRICE, per_100_lookups_tree_kinds_1_to_8: {} };
for (const p of POL) {
  let L = 0; let H = 0; let S = 0; let gs = 0; let gt = 0; let ns = 0;
  for (const k of KINDS.slice(0, 8)) {
    const a = sum((r) => r.lane === 'tree' && r.pol === p && r.kind === k);
    L += a[0]; H += a[1]; S += a[2];
    gs += a[1] * PRICE.search[k]; gt += a[1] * PRICE.typed[k]; ns += a[1] * Math.max(0, PRICE.search[k] - PRICE.typed[k]);
  }
  out.token_bound.per_100_lookups_tree_kinds_1_to_8[p] = {
    lookups: L, served: H, stale_served_per_100: L ? r4((100 * S) / L) : null,
    bound_if_each_hit_replaces_a_search_derivation_per_kind_prices: L ? Math.round((100 * gs) / L) : null,
    same_minus_the_cached_answer_tokens_still_read: L ? Math.round((100 * ns) / L) : null,
    bound_with_overall_prices_695_minus_31: L ? Math.round((100 * H * (PRICE.overall.search - PRICE.overall.typed)) / L) : null,
    bound_if_each_hit_replaces_a_typed_query: L ? Math.round((100 * gt) / L) : null,
    note: 'a typed query already returns the answer at the size of the cached answer, so against typed queries a hit saves no tokens, only compute',
  };
}

// cost of the dependency index (from timing.json, not part of the determinism check)
const TM = JSON.parse(fs.readFileSync(path.join(RUN, 'timing.json'), 'utf8'));
const med = (a) => { a = a.slice().sort((x, y) => x - y); return a.length ? a[Math.floor((a.length - 1) / 2)] : null; };
const truthMs = TM.per_snapshot.map((t) => Object.values(t.truth).reduce((a, b) => a + b, 0));
const checkMs = {};
for (const p of POL) checkMs[p] = r4(med(TM.per_snapshot.map((t) => (t.check && t.check[p]) || 0)));
out.index_cost = {
  wall_s: TM.wall_s,
  median_ms_per_snapshot: { load_and_hash: med(TM.per_snapshot.map((t) => t.load)), fresh_answers_with_recording_all_questions: r4(med(truthMs)), checks_by_policy_all_lanes: checkMs },
  median_truth_ms_per_snapshot_by_kind: Object.fromEntries(KINDS.map((k) => [k, r4(med(TM.per_snapshot.map((t) => t.truth[k] || 0)))])),
  median_dependency_entries_checked_per_snapshot_all_lanes_policies: med(TM.per_snapshot.map((t) => t.checks)),
  bytes_per_entry_assumed: { node_or_edge_fact: 13, pattern: 8, file: 8 },
};
out.index_cost.median_bytes_per_answer_by_kind = Object.fromEntries(Object.entries(R.dep_sizes).map(([k, v]) => [k, v.nodes.median * 13 + v.edges.median * 13 + v.patterns.median * 8 + v.files.median * 8]));

fs.writeFileSync(path.join(RUN, 'report.json'), JSON.stringify(out, null, 1));

// console summary
const line = (s) => console.log(s);
line('RUN ' + out.run + ' snapshots ' + out.snapshots + ' questions ' + out.questions);
for (const lane of ['tree']) for (const part of ['kinds_1_to_8', 'completion']) {
  line(`\n${lane} ${part}: policy lookups served hit stale stale/served up95 recomputes avoidable`);
  for (const p of POL) { const s = out.per_policy[lane][p][part]; line([p, s.lookups, s.served, s.hit_rate, s.stale_served, s.stale_rate_per_served, s.stale_upper95_per_served, s.recomputes, s.avoidable_recomputes].join(' ')); }
}
line('\nper kind (tree) hit rate / stale per served:');
for (const k of KINDS) line(k + ': ' + POL.map((p) => p + '=' + out.per_kind_tree[k][p].hit_rate + '/' + out.per_kind_tree[k][p].stale_rate_per_served).join(' '));
line('\ndependency cases ' + JSON.stringify({ total: out.dependency_cases.total, k18: out.dependency_cases.total_kinds_1_to_8, steps: out.dependency_cases.distinct_steps }));
for (const [k, v] of Object.entries(dc)) line('  ' + k + ' ' + v.cases + ' ' + JSON.stringify(v.by_cause));
line('stale fact-level: ' + R.stale_fact.length);
line('per question: ' + JSON.stringify(perQ));
line('token bound: ' + JSON.stringify(out.token_bound.per_100_lookups_tree_kinds_1_to_8, null, 0));
line('strides: ' + JSON.stringify(Object.fromEntries(Object.entries(out.lanes_stride).map(([l, v]) => [l, Object.fromEntries(POL.map((p) => [p, [v[p].kinds_1_to_8.hit_rate, v[p].kinds_1_to_8.stale_rate_per_served, v[p].completion.hit_rate]]))]))));
line('index cost: ' + JSON.stringify(out.index_cost));
