// Applies the audit's corrections (AUDIT.md, 2026-11-13) to k0/result.json. No measured number is changed:
// text is corrected, the token figure is relabelled an estimate, and the audit's recomputed figures are added.
// Re-appliable: it starts from the backup taken before the first correction.
'use strict';
const fs = require('fs');
const path = require('path');
const REPO = 'C:/Users/User/Documents/projects/EMS_workshop1/docs/program';
const K0 = path.join(REPO, 'evidence/harness-bottlenecks/graph2/widen/k0/result.json');
const BEFORE = path.join(REPO, 'evidence/harness-bottlenecks/graph2/page/work3/k0-result.before.json');
const AUD = 'C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/k0-audit';
const r = JSON.parse(fs.readFileSync(BEFORE, 'utf8'));
const a5 = JSON.parse(fs.readFileSync(path.join(AUD, 'a5_spread.json'), 'utf8'));
const a6 = JSON.parse(fs.readFileSync(path.join(AUD, 'a6_tokens.json'), 'utf8'));
const a7 = JSON.parse(fs.readFileSync(path.join(AUD, 'a7_log.json'), 'utf8'));
const a2 = JSON.parse(fs.readFileSync(path.join(AUD, 'a2_truth_all.json'), 'utf8'));
const R = r.results;

r.status = 'done: K0 replay complete over all 190 snapshots, deterministic (two runs byte-identical), zero stale answers served by any fact-level policy against the extractor\'s own facts (expected by construction for programs whose every read is recorded), no fix to the dependency recording was needed. Corrected on 2026-11-13 after the audit (AUDIT.md): the token figure is an estimate at median prices, not a bound; the share of questions that never change and the rates on the changing questions are added; 90 of the 91 side-branch snapshots were merged, not all; two rates rounded once. No measured number changed.';
r.where.audit = path.join(REPO, 'evidence/harness-bottlenecks/graph2/widen/k0/AUDIT.md').replace(/\//g, '\\');
r.corrections_after_audit = {
  date: '2026-11-13',
  source: 'AUDIT.md beside this file (audit code and outputs in the session scratchpad, k0-audit, a1_order.js to a7_log.js)',
  made: [
    'The token figure (58,125 tokens per 100 lookups for fact) is an estimate at median prices under the assumption that each hit replaces one scripted-search derivation. It is not a bound and not a saving. Mean prices give 161,515 and per-kind median prices 185,388 tokens per 100 lookups. results.token_bound is renamed results.token_estimate and its keys renamed from bound_* to estimate_*.',
    'Added results.static_and_changing_questions_tree: 138 of 250 questions of kinds 1-8 never change (55.2 %), 47.6 % of lookups are of them, and every policy\'s rate on the 112 changing questions.',
    'Added results.audit_recomputation: all 40,880 warm tree-lane lookups recomputed independently, 0 disagreements; main-chain lanes, age and gap tables not re-checked.',
    'setup.snapshots: 90 of the 91 off-chain snapshots are ancestors of main 34f1dcd; 8dafcecc7f (a leaf, 342 logged lookups) was never merged.',
    'Rounding: fact_pos hit rate 25,765 of 29,097 is 88.5 % (was written 88.6 %); completion cutoff 2,881 of 11,783 is 24.5 % (was written 24.4 %).',
    'what_it_does_not_show gains: the replay imposed the lookup schedule; zero stale is expected by construction for deterministic programs whose every read is recorded; the static share; prices from 3 to 4 questions per kind; the 20-snapshot anchor rule was not varied.'
  ]
};

// snapshots
const off = a7.off_chain_not_ancestor_of_chain_main[0];
r.setup.snapshots.off_chain_merged_into_main = 90;
r.setup.snapshots.off_chain_never_merged = { sha: off.sha, tree_parent: off.tree_parent, gap_commits: off.gap, children_in_tree: off.children_in_tree, lookups_logged: off.lookups_logged };
r.setup.snapshots.note = '90 of the 91 off-chain snapshots are ancestors of main 34f1dcd (merged side branches); 8dafcecc7f is a leaf on a branch that was never merged. The order check is unaffected (AUDIT.md section 2).';

// static and changing questions (audit check 5)
const pol = ['file', 'fact_pos', 'fact', 'fact_sem', 'cutoff', 'cutoff_sem', 'ttl5', 'ttl20', 'never'];
const rate = o => Object.fromEntries(pol.map(p => [p, { hit_pct: o[p].hit, stale_per_served_pct: o[p].stale_per_served, stale: o[p].stale }]));
R.static_and_changing_questions_tree = {
  source: 'AUDIT.md section 6, recomputed by the audit over every lookup of the tree lane (a5_spread.js); hit and stale shares in per cent',
  kinds_1_to_8: { questions: a5.kinds_1_8.questions, never_change: a5.kinds_1_8.never_changes, never_change_pct: 55.2, never_change_and_always_empty: a5.kinds_1_8.never_changes_and_always_empty, always_empty_pct_of_all: 25.2,
    lookups: a5.lookups_kinds_1_8_total, lookups_on_never_changing: a5.lookups_kinds_1_8_on_static_questions, lookups_on_never_changing_pct: 47.6,
    changing_questions: a5.kinds_1_8.questions - a5.kinds_1_8.never_changes, lookups_on_changing: a5.rates_kinds_1_8_changing_questions_only.lookups,
    lookups_at_a_change: a5.lookups_kinds_1_8_where_answer_changed, lookups_at_a_change_pct: 1.39 },
  never_change_by_kind: Object.fromEntries(Object.entries(a5.by_kind).filter(([k]) => k !== 'completion').map(([k, v]) => [k, { questions: v.questions, never_change: v.never_changes, never_change_and_always_empty: v.never_changes_and_always_empty }])),
  never_change_by_set: { finished_test_50: a5.by_set.tq50.never_changes, generated_200: a5.by_set.gen.never_changes },
  completion: { questions: a5.completion.questions, never_change: a5.completion.never_changes, distinct_answers_median: a5.by_kind.completion.distinct_answers_median, distinct_answers_max: a5.by_kind.completion.distinct_answers_max },
  rates_on_changing_questions: Object.assign({ lookups: a5.rates_kinds_1_8_changing_questions_only.lookups }, rate(a5.rates_kinds_1_8_changing_questions_only)),
  rates_on_never_changing_questions: Object.assign({ lookups: a5.rates_kinds_1_8_static_questions_only.lookups }, rate(a5.rates_kinds_1_8_static_questions_only)),
  note: 'Every policy, the stale control included, is never stale on the questions that never change, so they lift every hit rate without testing invalidation.'
};

// audit recomputation
R.audit_recomputation = {
  source: 'AUDIT.md section 3 (a2_truth_all.js, a7_log.js)',
  warm_lookups_recomputed: 40880, kinds_1_to_8: 29097, completion: 11783, snapshots: 189, disagreements: 0,
  stale_found_by_audit_all_kinds: { file: 1654, fact_pos: 1760, ttl5: 4885, ttl20: 10512, never: 20064, fact: 0, fact_sem: 0, cutoff: 0, cutoff_sem: 0 },
  changes_flagged: { total: 3206, kinds_1_to_8: 404, completion: 2802 },
  how: 'The audit\'s own loader, the finished test\'s original SQL question programs (kinds 1-8) and reference arm (completion), and its own reconstruction of what each policy served.',
  not_rechecked: ['the four main-chain stride lanes', 'the tables by age and by gap', 'the dependency-size medians', 'the 40 held-out T1 records check for completion (agreed at all 11,783 completion lookups instead)'],
  limit: 'A mistake shared with the finished test\'s own question programs, about what a question means, would not show.'
};
R.completion_rates_tree_audit_log = a7.completion;
R.kinds_1_to_8_rates_tree_audit_log = a7.k18;

// token estimate (rename keys; add mean and largest-search prices from the audit)
const tb = R.token_bound; delete R.token_bound;
const per = {};
for (const [p, v] of Object.entries(tb.per_100_lookups_tree_kinds_1_to_8)) {
  const rec = a6.recomputed_per_100_lookups[p];
  per[p] = { lookups: v.lookups, served: v.served, stale_served_per_100: v.stale_served_per_100,
    estimate_median_prices_694_5_minus_31: v.bound_with_overall_prices_695_minus_31,
    estimate_mean_prices_1903_6_minus_59_9: rec.mean_prices,
    estimate_per_kind_median_prices: v.same_minus_the_cached_answer_tokens_still_read,
    estimate_per_kind_median_prices_before_subtracting_answer_tokens: v.bound_if_each_hit_replaces_a_search_derivation_per_kind_prices,
    estimate_at_largest_single_measured_search_7711: rec.max_search_price,
    against_typed_queries: 0,
    typed_answer_tokens_still_read_per_kind: v.bound_if_each_hit_replaces_a_typed_query,
    note: 'Against typed queries a hit avoids 0 tokens: a typed query already returns an answer of the cached answer\'s size; the cached answer is still read.' };
}
R.token_estimate = {
  label: 'ESTIMATE UNDER ONE ASSUMPTION, NOT A BOUND AND NOT A SAVING',
  assumption: 'Each served answer of kinds 1-8 replaces one scripted-search derivation, minus the answer tokens a served answer still costs to read. No tokens of any model or agent were measured.',
  prices: Object.assign({}, tb.prices, { overall_mean: { search: a6.arms.search.mean, typed: a6.arms.relational.mean }, largest_single_search: a6.arms.search.max, held_out_questions: a6.arms.search.n,
    measured: 'once, at the frozen commit, on 30 held-out questions answered by a scripted search (not an agent); per-kind prices rest on 3 to 4 questions each' }),
  per_100_lookups_tree_kinds_1_to_8: per,
  correction: 'An earlier version labelled the median-price column an upper bound ("at most about 58,100 tokens per 100 lookups"). A median is not a maximum: the audit (AUDIT.md section 7) gives 161,515 at mean prices and 185,388 at per-kind prices for fact.',
  completion: 'The completion kind has no measured derivation price and is left out.'
};

// texts
const ws = r.what_it_shows;
ws[0] = ws[0] + ' On the 112 questions whose answer changes at least once (15,240 lookups) the rates are 82.5 % (fact), 93.8 % (fact_sem) and 94.2 % (cutoff_sem), with 0 stale. An independent recomputation of all 40,880 warm tree-lane lookups agreed at every lookup (AUDIT.md).';
ws[2] = ws[2].replace('69 of the 250 questions served at least one stale answer.', '69 of the 250 questions served at least one stale answer. On the 112 changing questions it served 80.9 % with 13.2 % of served answers stale.');
ws[7] = ws[7].replace('early cutoff 24.4 %', 'early cutoff 24.5 %');
ws[11] = 'As an estimate under one assumption, not a bound and not a saving: if each served answer replaced one scripted-search derivation, fact level would avoid about 58,100 tokens per 100 lookups of kinds 1-8 at the finished test\'s median prices (694.5 tokens read, 31 tokens of answer), about 161,500 at its mean prices and about 185,400 at its per-kind median prices; against typed queries it avoids 0 tokens.';
ws.push('138 of the 250 questions of kinds 1-8 (55.2 %) never change their answer over the replay, and 13,857 of the 29,097 lookups (47.6 %) are of those questions; every policy is right on them, so rates over all questions are higher than on the questions that test invalidation.');
const wn = r.what_it_does_not_show;
wn[7] = 'The token figure is an estimate, not a bound and not a saving: it assumes each served answer would otherwise cost one scripted-search derivation, its prices were measured once on 30 held-out questions (3 to 4 per kind) at one commit, the three ways of pricing differ by a factor of about 3, and it ignores the prompt-cache share and every other token bucket of a session.';
wn.splice(2, 0,
  'It does not show how an agent would look things up: the replay scheduled every lookup itself (every live question at every snapshot). No agent decided whether or when to look something up, what to ask, or whether to trust a served answer.',
  'It does not show that fact-level invalidation is safe in general: zero stale answers is what a correct recorder must give when a deterministic program reads the graph only through it, so it is expected by construction. It shows that this recorder has no gaps for these nine programs on this history; it does not carry over to conclusions a model draws from reads nobody records.');
wn.push('It does not give rates on a mix of changing questions: 55.2 % of the questions of kinds 1-8 never change and 47.6 % of the lookups are of those questions (rates on the changing questions are in results.static_and_changing_questions_tree).',
  'It does not vary the anchor rule: questions were drawn only from anchors that live in at least 20 consecutive main-chain snapshots.');
const mn = r.must_not_claim;
mn[2] = 'The cache saves, or avoids at most, about 58,000 tokens per 100 lookups, or any stated token saving (the figure is an estimate at median prices, not a bound: mean prices give 161,515 and per-kind prices 185,388; nothing was measured; against typed queries it is 0).';
mn[1] = 'Fact-level invalidation is proven safe, or never serves a stale answer (zero stale is against the extractor\'s own facts, for nine fixed programs, on one history, and is expected by construction when every read is recorded).';
mn[7] = 'The hit rate an agent would see is 87.6 % or 95.9 % (the replay imposed the lookup schedule, 47.6 % of lookups are of questions that never change, and the empty-answer share and the gap between lookups both move it).';
mn[6] = 'File-level caching serves 6.5 % stale answers in general, or is unsafe in general (13.2 % on the changing questions here; it depends on the question mix).';
mn.push('The cached answers are correct about the code (the truth is the same extractor\'s facts).',
  'Removed tests defeat file-level caching (in the audit\'s hand-built case the removed test\'s own file was in the dependency set).',
  'The main-chain lanes, the age table or the gap table were independently verified.',
  'All side-branch snapshots were merged into main (90 of 91 were).',
  'Traversal caching was tested.');
r.problems.push('One of the 91 off-chain snapshots (8dafcecc7f, 342 logged lookups) is on a branch that was never merged; the first version of the notes said all were merged.',
  'The first version of the notes called the token figure an upper bound; it uses median prices and is an estimate (AUDIT.md section 7).',
  'The first version did not report that 55.2 % of the questions of kinds 1-8 never change; rates on the changing questions are now given.',
  'Two rates were rounded twice in the first version (fact_pos 88.6 % for 88.548 %, completion cutoff 24.4 % for 24.45 %).');

fs.writeFileSync(K0, JSON.stringify(r, null, 1));
console.log('written', fs.statSync(K0).size, 'bytes; a2 disagreements field:', JSON.stringify(a2).match(/disagree\w*"?:\s*\d+/g));
