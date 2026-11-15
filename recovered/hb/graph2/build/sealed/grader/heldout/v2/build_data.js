'use strict';
// v2 page data (grader lane). Assembles data.json for the owner page from stored aggregates only:
// ../scores.json, ../comparisons.json, recompute.json, tuning.json, the refuters' result record and the
// protocol addenda. Runs checks, then writes data.json here and a copy to the repository page folder.
const fs = require('fs'); const path = require('path');
const V2 = __dirname; const HO = path.resolve(V2, '..'); const B = path.resolve(V2, '..', '..', '..', '..');
const ROOTP = path.resolve(B, '..'); // graph2/
const REPO = 'C:/Users/User/Documents/projects/EMS_workshop1';
const PAGE = path.join(REPO, 'docs/program/graph-test/data');
const jl = (f) => fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map(JSON.parse);
const J = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const r4 = (x) => (x == null ? null : Math.round(x * 1e4) / 1e4);
const f3 = (x) => { const v = Math.sign(x) * Math.round(Math.abs(x) * 1000 + 1e-9) / 1000; return (v > 0 ? '+' : '') + v.toFixed(3); };
// tag every numeric result object (one with a difference, a cluster count or a task count) with its source
const tag = (o, src, n) => { if (Array.isArray(o)) { o.forEach((x) => tag(x, src, n)); return o; } if (o && typeof o === 'object') { if (('diff' in o || 'n_clusters' in o || 'tasks' in o || 'primary' in o) && !('source' in o)) { o.source = src; if (n && !('n_commits' in o) && !('n_clusters' in o)) o.n_commits = n; } for (const v of Object.values(o)) tag(v, src, n); } return o; };
const iv = (c) => `[${f3(c[0])}, ${f3(c[1])}]`;
const scores = J(path.join(HO, 'scores.json')).rows;
const cmp = J(path.join(HO, 'comparisons.json')).comparisons;
const rc = J(path.join(V2, 'recompute.json'));
const tu = J(path.join(V2, 'tuning.json'));
const RES = J(path.join(REPO, 'docs/program/evidence/harness-bottlenecks/graph2/build-e/result.json'));
const C = (id) => cmp.find((c) => c.id === id);
const HELD = 'held-out'; const TUNE = 'tuning';

// ---------- arms ----------
const arms = [
  { id: 'relational', name: 'Relational store (SQLite)', kind: 'typed store', what: 'The extracted facts (typed nodes such as files, functions, routes, tables and settings, and typed edges such as imports, calls, HTTP route to client call, test to code, table reads and writes, and co-change history) loaded into SQLite tables with indexes in both directions.', reads: 'Only the facts built from the parent commit of each task (never the task commit or anything later).', answers: 'A recursive SQL query walks from the seed file and symbol over the typed edges, scores every reached file, and the shared packer prints the best files first as a path line plus the signature lines of their definitions until the token budget is used.', scored: true },
  { id: 'ladybug', name: 'Graph engine LadybugDB', kind: 'typed store (graph engine)', what: 'The same facts loaded into LadybugDB, an embedded property-graph database with typed variable-length paths and a graph-algorithm extension (PageRank, Louvain communities, k-core).', reads: 'The same fact files as the relational store.', answers: 'Native graph queries for the walk; the same ranking and packer. Its best native form (S2) adds a stored Louvain community grouping to personalised PageRank; the PageRank iterations themselves run in application code.', scored: true },
  { id: 'duckpgq', name: 'Graph engine DuckDB with DuckPGQ', kind: 'typed store (graph engine)', what: 'The same facts in DuckDB with the DuckPGQ extension, which adds property-graph queries (bounded variable-length paths, PageRank) to SQL.', reads: 'The same fact files as the relational store.', answers: 'Property-graph and recursive SQL queries for the walk; the same ranking and packer. Its k-hop walk is recursive SQL, not a graph operator.', scored: true },
  { id: 'reference', name: 'Reference implementation (plain in-memory code)', kind: 'cross-check only', what: 'A plain JavaScript implementation of the shared specification, holding the graph in memory.', reads: 'The same fact files.', answers: 'Computes the same walk and ranking directly. Used only to check that the three stores return the same answers; never scored.', scored: false },
  { id: 'search', name: 'Scripted text search', kind: 'baseline', what: 'A script that does what a session typically does by hand: text search of the source tree for the seed\'s names, its module path and its route strings, then follows the seed\'s import lines. It is a fixed script, not an agent searching with judgement.', reads: 'The source tree exported at the parent commit, plus (for its padding tail) the earlier commit history.', answers: 'Ranks files by weighted hit counts, then appends a co-change padding tail (files that changed together with the seed file in earlier commits); same packer and budget as every arm.', scored: true },
  { id: 'floor-dir', name: 'Same-directory floor', kind: 'floor', what: 'No search and no graph: the files in the seed\'s own directory, then its capability folder, then outward.', reads: 'File paths at the parent commit.', answers: 'Prints those files in that order with their signature lines until the budget is used. Every method must beat it.', scored: true },
  { id: 'floor-co', name: 'Co-change floor', kind: 'floor', what: 'No search and no graph: the files that changed together with the seed file in earlier commits, most often and most recently first, then the same-directory order.', reads: 'Earlier commit history (ancestor commits only, same-PR siblings dropped) and file paths.', answers: 'Prints those files in that order with their signature lines until the budget is used. Every method must beat it.', scored: true },
];
const frozen = [
  { arm: 'relational, LadybugDB and DuckPGQ (the same configuration in all three)', role: 'primary', hash: '95e990307da3b42b', plain: 'Walk from the seed over every base edge class (structure, imports, calls, HTTP, tests, data, settings and co-change history) in both directions with no hop limit, using edges of confidence 0.5 or more; rank reached files by degree-normalised spreading (each node passes its score on, divided by its number of edges); show files with their signature lines; no padding tail.', tune_primary: 0.7853, complexity: 2 },
  { arm: 'relational, LadybugDB and DuckPGQ', role: 'S1 (the choice of the tie rule as first written)', hash: '6b70cc1222745385', plain: 'The same walk limited to 4 hops, ranked by personalised PageRank (restart 0.30, co-change weight 1). The rule as first written picked it because "hops=4" sorted first by name among 15 tied configurations.', tune_primary: 0.7681, complexity: 2 },
  { arm: 'LadybugDB', role: 'S2 (best form regardless of complexity)', hash: 'f233ae069bdba0ce', plain: 'Unbounded walk; personalised PageRank fused with the stored Louvain community grouping of the engine as a locality prior. Scored on the stored grouping and on four further community draws.', tune_primary: 0.7862, complexity: 4 },
  { arm: 'scripted search', role: 'primary', hash: 'e70177e5807f0252', plain: 'One round of text search for the seed\'s names and module path (route strings off), seed imports followed, then the co-change padding tail.', tune_primary: 0.7593, complexity: 3 },
  { arm: 'scripted search', role: 'S2 (best form)', hash: '950c029615d337c1', plain: 'One round with route strings on, co-change ranking fused into the search ranking by reciprocal rank fusion, then the co-change padding tail.', tune_primary: 0.7644, complexity: 5 },
  { arm: 'same-directory floor', role: 'primary', hash: '714a474060653c1f', plain: 'File granularity, signature form, same-directory order.', tune_primary: 0.7191, complexity: 1 },
  { arm: 'co-change floor', role: 'primary', hash: 'c4d2f0a60a3d199c', plain: 'File granularity, signature form, co-change order then same-directory order.', tune_primary: 0.7521, complexity: 1 },
];
const roles = [
  { role: 'primary', meaning: 'The configuration each arm froze by the selection rule: highest T1 tuning primary, then the simplest configuration within one standard error, ties broken by higher tuning primary (addendum 4). All verdicts rest on these rows.' },
  { role: 'S1', meaning: 'The choice the tie rule would have made as first written (ties broken by median tokens, then by name, which picked "hops=4"). Run on held-out only so the change of rule can be checked; no claim rests on it.' },
  { role: 'S2', meaning: 'The arm\'s highest tuning primary regardless of complexity, where it differs from the primary: LadybugDB (native community prior) and search. Secondary comparisons H1b and H3 against search S2.' },
];

// ---------- sets ----------
const tasks = jl(path.join(B, 'tasks/tasks.jsonl'));
const refsTune = jl(path.join(B, 'sealed/grader/refs_tune.jsonl'));
const refsHeld = jl(path.join(HO, 'refs_heldout.jsonl'));
const cnt = (split, set) => tasks.filter((t) => t.split === split && t.set === set).length;
const commits = (refs, set) => new Set(refs.filter((r) => r.set === set).map((r) => r.commit || r.fix_commit)).size;
const t3 = rc.t3;
const sets = [
  { id: 'T1', name: 'Change completion (primary set)', sentence: 'Given one changed file and symbol of a real commit as the seed, find the other files and definitions that the same commit changed.', tuning: { tasks: cnt('tune', 'T1'), commits: commits(refsTune, 'T1') }, heldout: { tasks: cnt('heldout', 'T1'), commits: commits(refsHeld, 'T1') } },
  { id: 'T1x', name: 'Cross-runtime subset of T1', sentence: 'The T1 tasks from commits that changed more than one runtime (mobile app, backend, web); descriptive only because there are few commits.', tuning: { tasks: cnt('tune', 'T1x'), commits: commits(refsTune, 'T1x') }, heldout: { tasks: cnt('heldout', 'T1x'), commits: commits(refsHeld, 'T1x') } },
  { id: 'T2', name: 'Tests to update', sentence: 'Given changed production code as the seed, find the existing test files the same commit changed.', tuning: { tasks: cnt('tune', 'T2'), commits: commits(refsTune, 'T2') }, heldout: { tasks: cnt('heldout', 'T2'), commits: commits(refsHeld, 'T2') } },
  { id: 'T3', name: 'Documented chains', sentence: 'Chains of connected files written down in the project\'s own documents (the lifecycle audit, the open-work handoff and the invariants in CLAUDE.md): seed = the first named file, reference = the others, with the document removed from the facts.', tuning: { tasks: 0, commits: 0 }, heldout: { tasks: cnt('heldout', 'T3'), parent_commits: t3.parents, documents: t3.documents }, note: `${t3.tasks} tasks from ${t3.parents} parent commits and ${t3.documents} documents; ${t3.largest_group_tasks} of them from one document at one parent. Held-out only; carries a sign, not an effect size.` },
  { id: 'T4', name: 'Defect register to fix files', sentence: 'Defects recorded in the project\'s handoff register: seed = the named file, reference = the files of the commit that fixed it. Descriptive only.', tuning: { tasks: 0, commits: 0 }, heldout: { tasks: cnt('heldout', 'T4'), fix_commits: commits(refsHeld, 'T4') } },
  { id: 'TQ', name: 'Code-reading questions', sentence: 'Structured questions whose answers are fixed by reading the code (for example which tables a screen writes, which tests reach a function, which invariants govern a file, which code reads a setting), in 8 kinds; each answer written by one reader, checked blind by a second, disagreements resolved by a third.', tuning: { questions: 20 }, heldout: { questions: 30 } },
  { id: 'T5', name: 'Document lookups (not run)', sentence: 'Free-text lookups typed in past sessions. Not run (addendum 4 item 7): the seed contract maps a file or definition, and T5 had no tuning part on which a text-to-seed step could be built.', tuning: { tasks: 0 }, heldout: { tasks_listed: cnt('heldout', 'T5'), run: false } },
];

// ---------- held-out per-arm table and curves ----------
const ARMNAME = { relational: 'relational', ladybug: 'LadybugDB', duckpgq: 'DuckPGQ', search: 'scripted search', 'floor-dir': 'same-directory floor', 'floor-co': 'co-change floor' };
const ROLENAME = (r) => (r === 'primary' ? 'primary' : r === 's1' ? 'S1' : r === 's2' ? 'S2 (stored community draw for LadybugDB)' : r.replace('s2-draw', 'S2, community draw '));
const table = scores.map((r) => ({ arm: r.arm, arm_name: ARMNAME[r.arm], role: r.role, role_name: ROLENAME(r.role), set: r.set, source: HELD, n_tasks: r.tasks, n_clusters: r.clusters, cluster_unit: r.set === 'T3' ? 'task' : r.set === 'T4' ? 'fix commit' : 'commit',
  primary_recall_at_8000_tokens: r.primary, standard_error: r.primary_se, recall_at_2000: r.r2000, recall_at_4000: r.r4000, recall_at_8000: r.r8000, recall_at_16000: r.r16000, area_under_recall_curve: r.auc,
  definition_recall_at_8000: r.def_r8000, file_recall_at_8000: r.file_r8000, recall_without_padding_tail_at_8000: r.unpad_r8000, precision_at_8000: r.precision8000,
  median_answer_tokens_at_8000_budget: r.median_tokens_8000, median_lookups: r.median_lookups, median_tokens_read_by_search: r.median_tokens_read_search,
  share_of_tasks_reaching_80_percent_recall_within_16000: r.reach80_share_tasks, median_tokens_to_80_percent_where_reached: r.median_t80_where_reached,
  tuning_primary_same_configuration: r.tune_primary, tuning_minus_heldout: r.tune_primary == null ? null : r4(r.tune_primary - r.primary) }));
const curves = scores.filter((r) => ['T1', 'T2', 'T3'].includes(r.set) && (r.role === 'primary' || r.role === 's1' || r.role === 's2') && !(r.role === 's1' && r.arm !== 'relational') && !(r.role === 'primary' && (r.arm === 'ladybug' || r.arm === 'duckpgq'))).map((r) => ({ arm: r.arm, arm_name: ARMNAME[r.arm], role: r.role, set: r.set, source: HELD, n_clusters: r.clusters, budget_points: [{ tokens: 0, recall: 0 }, { tokens: 2000, recall: r.r2000 }, { tokens: 4000, recall: r.r4000 }, { tokens: 8000, recall: r.r8000 }, { tokens: 16000, recall: r.r16000 }], whole_item_grid: r.curve_grid_tokens.map((t, i) => ({ tokens: t, recall: r.curve[i] })) }));

// ---------- comparisons ----------
const sp = rc.splits.comparisons; const sens = rc.sensitivity.comparisons; const pad = rc.padding.arms; const mix = rc.splits.mix;
const g = (name, grp) => sp[name].groups[grp];
const sx = (p) => `${f3(p.diff)} ${iv(p.ci95)}`;
const qual = {
  H1: 'The three implementations compute the same answers from the same facts with the same method (identical shown answers on 770 of 770 held-out tasks). This shows that, not that graphs add nothing, and it says nothing about speed, size or effort, which the timing run (H5) measures and has not reported yet.',
  'H2-ladybug': 'Same reading as H1: identical answers by construction, so the difference is exactly zero.',
  'H2-duckpgq': 'Same reading as H1. The hash of the full ranked list, beyond what is shown, differs from the reference arm on 3 DuckPGQ tasks; every shown item and every score is identical.',
  H1b: `Adding a stored community prior to personalised PageRank gave no gain of 0.05 recall or more on T1. Stored draw ${sx(rc.draws.rows[0].T1)}; the five community draws give ${f3(Math.min(...rc.draws.rows.map((d) => d.T1.diff)))} to ${f3(Math.max(...rc.draws.rows.map((d) => d.T1.diff)))}, and draw 1 alone (${sx(rc.draws.rows[1].T1)}) would be "inconclusive" under the same rule. On T2 the stored draw is ${sx(rc.draws.rows[0].T2)}, not inside plus or minus 0.05. The PageRank iterations run in application code; only the community grouping comes from the engine. One configuration, one repository.`,
  'H3-search': `The whole T1 gain comes from changes seeded in the mobile app: mobile ${sx(g('typed_vs_search', 'mobile'))} over ${g('typed_vs_search', 'mobile').n_clusters} commits; outside the mobile app ${sx(g('typed_vs_search', 'not_mobile'))} over ${g('typed_vs_search', 'not_mobile').n_clusters} commits (backend ${sx(g('typed_vs_search', 'backend'))}). Mobile seeds were ${Math.round(mix.mobile.tuning_share_of_tasks * 100)} % of tuning tasks and ${Math.round(mix.mobile.heldout_share_of_tasks * 100)} % of held-out tasks. The search arm is a scripted search, not an agent: ${Math.round(pad.search.share_from_padding_tail_per_task * 100)} % of its credited recall per task comes from its co-change padding tail, and it does not beat the co-change floor. The lower bound (0.036) is below the 0.05 smallest effect worth acting on. Every answer fills its 8,000-token budget, so the token condition never decided anything.`,
  'H3-search-s2': `Same qualifications as against search primary: mobile ${sx(g('typed_vs_search_s2', 'mobile'))}, outside mobile ${sx(g('typed_vs_search_s2', 'not_mobile'))}. Its T3 interval includes zero. The questions sign was borrowed from the search primary's question run (search S2 has none); without it T1, T2 and T3 are still 3 of 3 positive, so the verdict stands.`,
  'H3-floor-co': `A typed graph that includes co-change history beat plain co-change by 0.06 recall on T1. The gain comes from mobile-seeded changes (${sx(g('typed_vs_cochange_floor', 'mobile'))}), where co-change alone is weak. On backend and web seeds it ties co-change (outside mobile ${sx(g('typed_vs_cochange_floor', 'not_mobile'))}; backend ${sx(g('typed_vs_cochange_floor', 'backend'))}). The lower bound (0.019) is below the 0.05 smallest effect of interest. It is the most fragile "better": dropping the five commits most favourable to the typed store gives ${sx(sens.typed_vs_cochange_floor.drop_5_most_favourable_to_a)}, and keeping only tasks whose seed both arms matched by id gives ${sx(sens.typed_vs_cochange_floor.seeds_matched_by_id_only)}. About half of the typed store's credited recall per task (${pad.typed.per_task.via_path_with_cochange_edge} of ${pad.typed.per_task.recall}) was reached through a stored path containing a co-change edge.`,
  'H3-floor-dir': `Survives every check (dropping the largest or most favourable commits, every budget, backend and mobile seeds). One exception: on web seeds (7 to 8 commits) the same-directory floor is about as good: ${sx(g('typed_vs_samedir_floor', 'web_without_root_task'))} without the root-level task, ${sx(g('typed_vs_samedir_floor', 'web_with_root_task'))} with it.`,
  H4: 'Inconclusive by the pre-declared rule: all 30 questions give an interval that includes zero, while the untouched subsets give "better". Question handling changed for 8 questions after their text was read (not 7 as first written). Tokens are counted differently by the two arms: final answers are about the same size (median 31 against 29.5 tokens); the scripted search read a median of 694.5 tokens of grep and file output to produce its answer. The typed side\'s own costs (knowing the schema, the query programs written per question kind) are not counted. Both arms answer the 8 known kinds with programs written on the 20 tuning questions, so unseen kinds of question were not tested.',
  H5: 'Engine measures (build time, size, memory, latency, update cost, query length) are measured by another lane after this grading; no number here.',
};
const comparisons = cmp.filter((c) => c.verdict && !/^H1b-draw/.test(c.id)).map((c) => {
  const o = { id: c.id, group: c.group, a: c.a, b: c.b, source: HELD, verdict: c.verdict, decided_by: c.decided_by || c.note || null, qualification: qual[c.id] || null, predeclared: /^H/.test(c.id) && !/s1/.test(c.id), sets: {} };
  if (c.sets) for (const [s, m] of Object.entries(c.sets)) o.sets[s] = { n_clusters: m.primary.clusters, mean_a: m.primary.mean_a, mean_b: m.primary.mean_b, difference: m.primary.diff, ci95: m.primary.ci95, a_higher_clusters: m.primary.a_higher, b_higher_clusters: m.primary.b_higher, tied_clusters: m.primary.ties, at_2000: { difference: m.r2000.diff, ci95: m.r2000.ci95 }, at_4000: { difference: m.r4000.diff, ci95: m.r4000.ci95 }, at_16000: { difference: m.r16000.diff, ci95: m.r16000.ci95 }, area_under_curve: { difference: m.auc.diff, ci95: m.auc.ci95 } };
  if (c.id === 'H4') { o.by_block = c.by_block; o.v2_subset_22 = rc.questions.h4.untouched22; o.v2_words = rc.questions.h4.words; o.verdict = rc.questions.h4.verdict; }
  if (c.verdict === 'none (descriptive)') o.kind = 'descriptive';
  return o;
});
const descriptive = ['X-s1-primary', 'X-floor-co-search', 'X-floor-dir-search', 'X-search-s2-primary', 'H3-s1-search', 'H3-s1-floor-dir', 'H3-s1-floor-co'].map((id) => comparisons.find((c) => c.id === id)).filter(Boolean);
for (const d of descriptive) { d.kind = 'descriptive'; if (d.id === 'X-s1-primary') d.qualification = 'The first-written tie rule\'s choice (4 hops) scored 0.011 higher on held-out than the amended choice. That is shown; it supports no claim about either rule. It is lower at 2,000 tokens and on T4.'; if (d.id === 'X-floor-co-search') d.qualification = 'The scripted search does not beat the co-change floor; most of its credited recall comes from the same co-change tail.'; }
const wording_rule = 'Better: the 95 % interval of the T1 difference excludes zero, the winner\'s median answer tokens are no higher, and the sign agrees on at least three of T1, T2, T3 and the questions (floors: T1, T2, T3). Equivalent: the whole interval lies inside plus or minus 0.05 recall. Otherwise inconclusive. Intervals: paired cluster bootstrap over commits, 10,000 resamples, seed 20261112.';

// ---------- questions ----------
const qb = rc.questions.blocks;
const qblock = (k) => { const b = qb[k]; return { source: HELD, n_questions: b.questions, arms: { typed: { ...b.arms.relational, note: 'relational; LadybugDB and DuckPGQ answered identically' }, search: b.arms.search }, typed_minus_search_f1: b.typed_minus_search_f1, verdict_word_on_its_own: b.verdict_word_on_its_own, per_kind: b.per_kind }; };
const questions = { recall_convention: rc.questions.recall_convention, touched_questions: rc.questions.touched_8_addendum6, touched_note: 'Question handling changed after the held-out question text was read for 8 questions: 24, 27, 33, 40, 41, 46 and 47 in the typed arms (parser), 27, 33, 41, 47 and 25 in search (parser), 40 (cut-back rule) and 47 (LadybugDB setting fix). Addendum 5 listed 7; question 25 was found later.', judgement_items_note: 'Judgement items are the 7 answer items on held-out questions that both readers left out of the reference; "without" removes them from the answers.',
  h4: rc.questions.h4, corrected_sentence: rc.questions.corrected_sentence,
  blocks: Object.fromEntries(['all30', 'untouched23', 'untouched22', 'touched8', 'touched7'].flatMap((n) => [[n + '_with_judgement', qblock(n + '_with_judgement')], [n + '_without_judgement', qblock(n + '_without_judgement')]])),
  per_question: qb.all30_with_judgement.per_question.map((q) => ({ id: q.id, kind: q.kind, touched: q.touched, typed_f1: q.typed.f1, typed_precision: q.typed.precision, typed_recall: q.typed.recall, search_f1: q.search.f1, search_precision: q.search.precision, search_recall: q.search.recall, typed_answer_tokens: q.typed.answer_tokens, search_answer_tokens: q.search.answer_tokens, search_tokens_read: q.search.tokens_read, typed_lookups: q.typed.lookups, search_lookups: q.search.lookups })),
  tokens_two_ways: { source: HELD, ...rc.questions.tokens_two_ways },
  tuning: { source: TUNE, ...tu.questions_tuning } };

// ---------- trust ----------
const drop = scores.filter((r) => r.set === 'T1' && r.tune_primary != null).map((r) => ({ arm: ARMNAME[r.arm], role: r.role, set: 'T1', tuning_primary: r.tune_primary, heldout_primary: r.primary, drop: r4(r.tune_primary - r.primary), tuning_n_commits: 65, heldout_n_commits: r.clusters }));
const trust = {
  timeline: [
    { step: 'Protocol frozen', when: '2026-11-12, before any arm was built', what: 'What is varied (facts, algorithm, output, engine), the task sets, the arms, the scoring and the statistics were written down. Held-out tasks (75 commits from July and August) were set aside to be run once.', caught: null, changed: null },
    { step: 'Environment fixed (addendum 1)', when: '2026-11-12', what: 'Every arm moved into one Linux image after LadybugDB\'s algorithm extension would not load on Windows; running the graph side without it would have handicapped it.', caught: 'A handicap to one arm on Windows.', changed: 'One Linux image for all arms; facts still built on Windows from the same files.' },
    { step: 'Facts built', when: '2026-11-12', what: 'One shared extractor built typed nodes and edges at each task\'s parent commit, cached by commit; both stores load the same files.', caught: null, changed: null },
    { step: 'Phase A audits (addendum 2)', when: '2026-11-12', what: 'Audits of scoring, facts and the search arm before any configuration was chosen.', caught: 'The old scoring rule credited a bare list of every code file with 0.94 recall, so it could not tell arms apart; the search arm had selected its own configuration on its own labels; extractor gaps (mobile config reads, SQL in strings, URLs in loops and ternaries, Protocol-typed calls); a co-change rule beyond the protocol.', changed: 'Content scoring (a definition counts only when its own lines are shown); one scorer run only by the grader; padding made a shared option every arm may use; search labels sealed and its self-selection voided; extractor fixed and every arm re-run.' },
    { step: 'Phase B audits (addendum 3)', when: '2026-11-12 evening, before any arm was scored', what: 'Audits of the arms against the shared specification.', caught: 'Two arms divided by zero and two dropped a term in degree-normalised ranking at nodes with no out-edges; weighted shortest path defined differently in the two graph engines; LadybugDB communities differed with each store build; DuckPGQ computed path lengths beyond the hop limit.', changed: 'One definition for each; communities stored once per graph and reused; DuckPGQ fixed; equal stage-2 budgets (20 configurations per arm) and a parsimony rule; held-out comparisons H1 to H5 declared in advance.' },
    { step: 'Tuning (stages 1 and 2)', when: '2026-11-12 evening', what: '60 configurations for each of relational, LadybugDB, DuckPGQ and search (40 one factor at a time, then 20 proposed from each arm\'s own table), 4 for each floor, all on the 65 tuning commits.', caught: null, changed: null },
    { step: 'Selection audit (addendum 4)', when: '2026-11-13, before any held-out run', what: 'Audit of how configurations were chosen.', caught: 'The tie measure (median tokens) was inert because every answer fills its budget, so the choice fell to alphabetical order and picked "hops=4", the weakest of 15 tied configurations.', changed: 'Ties broken by higher tuning primary instead; the first choice kept as row S1 and run on held-out so the change can be checked; harness records keyed by arm and configuration.' },
    { step: 'Three pre-flight audits (addendum 5)', when: '2026-11-13 morning', what: 'Checks of the run plan, the lock and the question code before the held-out run.', caught: 'Rounds 1 and 2 refused the run: the question parsers threw on 7 held-out questions in the typed arms and 4 in search; LadybugDB returned "::" where SQL returns nothing for a setting read outside any definition; a question naming a member with no node answered empty.', changed: 'One shared question parser; the LadybugDB translation fixed to match SQL; a cut-back rule for missing members; every tuning answer reproduced and all records re-frozen. Round 3 passed.' },
    { step: 'Held-out run', when: '2026-11-13 05:55 to 06:40 UTC', what: '89 of 89 declared invocations ran once each; no repeat; input hashes unchanged before and after; reference answers hidden from every arm process.', caught: null, changed: null },
    { step: 'Scoring', when: '2026-11-13 from 06:43 UTC', what: 'The grader marked scoring started after checking the inventory, scored every answer file once with the same scorer as tuning, and ran the declared comparisons.', caught: null, changed: null },
    { step: 'Three refuters (addendum 6)', when: '2026-11-13', what: 'An independent re-scorer, a run-discipline auditor and a claims refuter.', caught: 'Re-scorer: 1,151 values and 46,200 per-task values reproduced; no verdict changes. Discipline: 8 touched questions, not 7; the full ranked-list hash differs on 5 relational and 3 DuckPGQ tasks beyond the shown items; containers mounted the live working tree read-only; two containers ran at once. Claims: the T1 advantage over search and the co-change floor comes from mobile-app seeds; search is half co-change padding; H1b depends on the community draw; question tokens were counted differently; one notes sentence was wrong (corrected here).', changed: 'No answer, score or verdict changed. Reporting rules bound (addendum 6 section C); this data file applies them.' },
  ],
  declared_changes_after_tuning_data: [
    { change: 'Selection tie rule', when: 'after the tuning tables existed, before any held-out run (addendum 4)', why: 'The old tie measure was inert and the choice fell to alphabetical order.', effect_on_heldout: { s1_minus_primary_T1: rc ? comparisons.find((c) => c.id === 'X-s1-primary').sets.T1 : null, note: 'The first-written choice scored 0.011 higher on held-out [-0.004, +0.026]; shown, supports no claim about either rule.' } },
    { change: 'Question code', when: 'after the held-out question text was read, before any held-out question was run (addendum 5; corrected in addendum 6)', why: 'Parsers threw on held-out question phrasing; a LadybugDB translation defect; a cut-back rule for members with no node.', effect_on_heldout: { touched_questions: 8, h4_all30: rc.questions.h4.all30, h4_untouched22: rc.questions.h4.untouched22, note: 'No reference answer was used. Auditors computed from the facts what the typed arms would answer on setting questions 25, 33, 41 and 47 before the run, and the question-47 result drove the LadybugDB fix.' } },
  ],
  tuning_to_heldout_drop: drop,
  drop_note: 'Every arm scored 0.06 to 0.17 lower on the 75 held-out commits than on the 65 tuning commits it was chosen on. Part of it is selection on the tuning set; part is a different mix of changes (mobile seeds 17 % of tuning tasks, 36 % of held-out tasks).',
  reproduction: { rescore: 'An independent scorer reproduced 1,151 point values to four decimals and all 46,200 per-task values; no verdict word changes.', this_file: `This v2 recomputation reproduced ${rc.reproduction.filter((r) => r.equal).length} of ${rc.reproduction.length} stored comparison rows exactly (difference and interval, T1, T2 and T3).` },
};

// ---------- identity ----------
const identity = {
  heldout: { source: HELD, shown_answers_identical_to_reference_arm: { relational: '770 of 770 tasks', ladybug: '770 of 770 tasks', duckpgq: '770 of 770 tasks' }, full_record_identical_to_reference_arm: { relational: '765 of 770 tasks', ladybug: '770 of 770 tasks', duckpgq: '767 of 770 tasks' }, s1_identical: '770 of 770 tasks for all three and the reference arm', questions_identical_to_relational: { ladybug: `${rc.questions.typed_arms_identical.ladybug} of 30`, duckpgq: `${rc.questions.typed_arms_identical.duckpgq} of 30` }, search_questions_differ: '18 of 30',
    ranked_hash_differences: { pairs: rc.ranked_hash.rows.length, distinct_queries: 2, explanation: 'The 8 (arm, task) pairs are 2 distinct queries: one seed at one parent commit appears in T1, T1x and T2, and another in T1 and T2. In every pair the shown items (80 or 86 items, scores included), the budgets, the seeds and the 50-path sample beyond the budget are identical, and every score field is identical. The hash covers about 3,900 ranked nodes with their raw scores; the reference arm rounds scores to 12 decimals, so a last-digit difference in a deep-tail score or the order of two nodes with equal rounded scores, somewhere past position 130, changes it. The stored answers hold only the hash of that tail, so which of the two it was cannot be told from them. No reported measure reads beyond the items packed into the 16,000-token answer: the scorer reads only items, budgets and seeds.', rows: rc.ranked_hash.rows } },
  tuning: { source: TUNE, ...tu.identity_tuning },
};

// ---------- limits ----------
const add6 = fs.readFileSync(path.join(ROOTP, 'protocol-addendum-6.md'), 'utf8');
const secD = add6.split('## D. Not shown by this test')[1].trim().split(/\n(?=\d+\. )/).map((s) => s.replace(/\s*\n\s*/g, ' ').trim());
const limits = { not_shown_by_this_test_addendum6_section_D: secD, must_not_claim_claims_refuter: RES['refute:claims'].must_not_claim, must_not_claim_discipline_refuter: RES['refute:discipline'].must_not_claim, further: RES['grade:heldout'].limits };

// ---------- assemble ----------
const data = {
  meta: { title: 'Typed code store against scripted search: held-out result', written_at: new Date().toISOString(), generator: 'sealed/grader/heldout/v2/build_data.js (grader lane)', sources: { 'held-out': 'the single held-out run on 75 commits from July and August 2026, scored once', tuning: 'the 65 tuning commits from June 2026 on which every configuration was chosen' }, primary_metric: 'Recall: the share of reference files and definitions (those the same commit changed) that appear inside an 8,000-token answer, averaged over a commit\'s tasks and then over commits. A definition counts only when its own lines are shown.', wording_rule, reporting_rules: 'Addendum 6 section C binds every summary: H1 and H2 are worded as the three implementations computing the same answers; H1b as no gain of 0.05 recall or more from adding a stored community prior; every H3 verdict is shown with the runtime split and the tuning-to-held-out mix change; search is called a scripted search; question tokens are shown two ways; T3 carries a sign only; the refuters\' must-not-claim sentences may not appear.' },
  arms, frozen_configurations: frozen, roles, sets,
  heldout: { source: HELD, table, curves, curve_note: 'budget_points: recall when the answer is packed to that budget (the last item may be cut). whole_item_grid: recall of whole items of the 16,000-token answer within each cumulative token count, in steps of 500 tokens.' },
  comparisons: { wording_rule, rows: comparisons.filter((c) => !descriptive.includes(c)), descriptive },
  splits: rc.splits, sensitivity: rc.sensitivity, t3: rc.t3, draws: rc.draws, padding: rc.padding,
  questions, tuning: tu, identity, trust, limits,
  examples: { source: TUNE, rule: tu.examples_rule, group_sizes: tu.examples_group_sizes, items: tu.examples },
  engines: { status: 'measuring' },
};
delete data.tuning.examples; delete data.tuning.examples_rule; delete data.tuning.examples_group_sizes;
// sources: tuning parts of the split first, then everything held-out
tag(data.splits.tuning_counts, TUNE); tag(data.splits.tuning_comparisons, TUNE); data.splits.tuning_rows_found = { source: TUNE, ...data.splits.tuning_rows_found };
for (const k of ['heldout_counts', 'comparisons', 'mix', 'heldout_reweighted_to_tuning_mix']) tag(data.splits[k], HELD);
data.splits.source_note = 'Fields named tuning_* come from the 65 tuning commits (388 T1 tasks); every other field from the 75 held-out commits (418 T1 tasks). mix gives both.';
for (const k of ['sensitivity', 't3', 'draws', 'padding']) { data[k].source = HELD; tag(data[k], HELD); }
tag(data.tuning, TUNE, 65); data.tuning.n_commits = 65; data.tuning.n_tasks_T1 = 388;
tag(data.examples.items, TUNE);

// ---------- checks ----------
const problems = [];
const text = JSON.stringify(data);
// 1. comparison numbers equal the stored comparisons
for (const c of data.comparisons.rows.concat(data.comparisons.descriptive)) for (const [s, m] of Object.entries(c.sets)) { const st = C(c.id).sets[s].primary; if (st.diff !== m.difference || JSON.stringify(st.ci95) !== JSON.stringify(m.ci95)) problems.push('comparison mismatch ' + c.id + ' ' + s); }
// 2. recompute reproduced the stored rows
if (!rc.reproduction.every((r) => r.equal)) problems.push('recompute does not reproduce stored comparisons');
// 3. no question text and no question reference content
const tqRefs = jl(path.join(B, 'sealed/tq_reference.jsonl'));
for (const q of tqRefs) { if (text.includes(q.question)) problems.push('question text present ' + q.id); }
// (the tuning examples list real file paths of tuning answers; a path there may also happen to be a
// held-out question item, so this check reads everything except the examples)
const textNoEx = JSON.stringify({ ...data, examples: null });
for (const q of tqRefs.filter((x) => x.split === 'held_out')) { const items = []; const walk = (v) => { if (Array.isArray(v)) v.forEach((x) => items.push(String(x))); else if (v && typeof v === 'object') Object.values(v).forEach(walk); }; walk(q.answer); for (const it of items) if (it.length > 12 && textNoEx.includes(JSON.stringify(it))) problems.push('held-out question reference item present ' + q.id); }
// 4. examples are tuning tasks
for (const e of data.examples.items) { const t = tasks.find((x) => x.id === e.task); if (!t || t.split !== 'tune') problems.push('example not a tuning task ' + e.task); if (!Object.values(e.arms).every((a) => a.recall_agrees)) problems.push('example recall mismatch ' + e.task); }
// 5. no held-out task id other than the named root-level task
const heldIds = new Set(tasks.filter((t) => t.split === 'heldout').map((t) => t.id));
const idsInText = new Set((text.match(/T[1-5]x?-\d{3,4}/g) || []).filter((x) => heldIds.has(x)));
const allowed = new Set(['T1-0786', ...rc.ranked_hash.rows.map((r) => r.id)]);
for (const id of idsInText) if (!allowed.has(id)) problems.push('held-out task id present ' + id);
// 6. held-out reference content: no held-out reference definition string (path::name) present
for (const r of refsHeld) for (const d of r.defs || []) { const s = d.path + '::' + d.name; if (text.includes(s) && !data.examples.items.some((e) => JSON.stringify(e).includes(s))) { problems.push('held-out reference definition present ' + s); break; } }
// 7. engines placeholder
if (data.engines.status !== 'measuring') problems.push('engines placeholder');
data.meta.checks = { run_at: new Date().toISOString(), problems, passed: problems.length === 0, list: ['every comparison difference and interval equals sealed/grader/heldout/comparisons.json', 'the v2 recomputation reproduces the stored comparison rows exactly', 'no question text and no held-out question reference item', 'every worked example is a tuning task and its recall recomputed from the shown items equals the stored score', 'no held-out task id except the root-level task named by the reporting rule and the 5 tasks of the ranked-hash note', 'no held-out reference definition', 'engines left as a placeholder'] };
const s = JSON.stringify(data, null, 1);
fs.writeFileSync(path.join(V2, 'data.json'), s);
fs.mkdirSync(PAGE, { recursive: true });
fs.writeFileSync(path.join(PAGE, 'data.json'), s);
console.log('checks', JSON.stringify(data.meta.checks.problems), 'bytes', s.length, 'comparisons', data.comparisons.rows.length, 'descriptive', data.comparisons.descriptive.length, 'table rows', table.length, 'curves', curves.length);
