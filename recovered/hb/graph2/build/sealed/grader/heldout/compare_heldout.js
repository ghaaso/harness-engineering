'use strict';
// HELD-OUT scoring, step 2: the pre-declared comparisons (addendum 3 section E, addendum 4 section C,
// addendum 5 item 5), the questions, the runtime split and the removed-document check.
// Paired cluster bootstrap with arms/common/compare.js (10,000 resamples, seed 20261112, cluster = commit),
// questions with arms/common/tq_score.js. Reads scores.json from step 1.
// Writes comparisons.json, tq.json, extra.json, report_data.json (aggregates only) in this folder.
const fs = require('fs');
const path = require('path');
const B = path.resolve(__dirname, '..', '..', '..');
const S = require(path.join(B, 'arms', 'common', 'score'));
const CMP = require(path.join(B, 'arms', 'common', 'compare'));
const TQ = require(path.join(B, 'arms', 'common', 'tq_score'));
const H = require(path.join(B, 'arms', 'common', 'harness'));
const OUT = __dirname;
const SEED = 20261112; const NRES = 10000; const EPS = 0.05;
const refs = S.readRefs(path.join(OUT, 'refs_heldout.jsonl'));
const refRaw = new Map(fs.readFileSync(path.join(OUT, 'refs_heldout.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => { const r = JSON.parse(l); return [r.id, r]; }));
const scores = JSON.parse(fs.readFileSync(path.join(OUT, 'scores.json'), 'utf8')).rows;
const row = (arm, role, set) => scores.find((r) => r.arm === arm && r.role === role && r.set === set);
const file = (arm, role, set) => path.join(B, 'results', 'heldout', arm, role, set + '.jsonl.gz');
const r4 = (x) => (x == null ? null : Math.round(x * 1e4) / 1e4);
const sgn = (x) => (x > 0 ? 1 : x < 0 ? -1 : 0);

// ---------- questions (H4) ----------
const tqRefsAll = fs.readFileSync(path.join(B, 'sealed', 'tq_reference.jsonl'), 'utf8').split('\n').filter(Boolean).map(JSON.parse).filter((r) => r.split === 'held_out');
const judgement = { 21: ['device'], 25: ['backend/app/features/jobs/service.py::JobService._money_rates'], 31: ['CLAUDE.md:L239', 'CLAUDE.md:L243', 'CLAUDE.md:L246'], 39: ['CLAUDE.md:L224', 'CLAUDE.md:L199'] };
fs.writeFileSync(path.join(OUT, 'judgement_heldout.json'), JSON.stringify(judgement, null, 1));
const TOUCHED = [24, 27, 33, 40, 41, 46, 47];
const TQARMS = ['relational', 'ladybug', 'duckpgq', 'search'];
const tqAns = {}; for (const a of TQARMS) tqAns[a] = fs.readFileSync(path.join(B, 'results', 'heldout', 'tq', a + '.answers.jsonl'), 'utf8').split('\n').filter(Boolean).map(JSON.parse);
const typedIdentical = {};
for (const a of ['ladybug', 'duckpgq']) {
  const m = new Map(tqAns.relational.map((x) => [x.id, JSON.stringify(x.answer)]));
  const diff = tqAns[a].filter((x) => m.get(x.id) !== JSON.stringify(x.answer)).map((x) => x.id);
  typedIdentical[a] = { identical: tqAns[a].length - diff.length, differ: diff.length, differing_ids: diff };
}
const median = S.median;
function tqBlock(ids, withJ) {
  const rs = tqRefsAll.filter((r) => ids.includes(r.id));
  const out = { questions: rs.length, arms: {} };
  const perQ = {};
  for (const a of TQARMS) {
    const res = TQ.scoreTq(tqAns[a], rs, withJ ? {} : { judgement });
    const blk = withJ ? res.all : (res.without_judgement || res.all);
    perQ[a] = new Map(blk.per_question.map((q) => [q.id, q]));
    const toks = blk.per_question.map((q) => q.tokens).filter((v) => v != null);
    const lks = blk.per_question.map((q) => q.lookups).filter((v) => v != null);
    out.arms[a] = { macro_f1: r4(blk.macro.f1), macro_precision: r4(blk.macro.p), macro_recall: r4(blk.macro.r), micro_f1: r4(blk.micro.f1),
      median_tokens: median(toks), mean_tokens: r4(blk.tokens_mean), median_lookups: median(lks), mean_lookups: r4(blk.lookups_mean),
      items_removed: withJ ? 0 : (res.without_judgement ? res.without_judgement.items_removed : 0) };
  }
  const fa = new Map([...perQ.relational].map(([k, q]) => [String(k).padStart(3, '0'), q.f1]));
  const fb = new Map([...perQ.search].map(([k, q]) => [String(k).padStart(3, '0'), q.f1]));
  const ps = CMP.pairedStats(fa, fb, NRES, SEED);
  out.typed_minus_search_f1 = { diff: r4(ps.diff), ci95: ps.ci95.map(r4), excludes_zero: ps.excludes_zero, p_signflip: r4(ps.p_signflip), typed_higher: ps.wins, search_higher: ps.losses, ties: ps.ties, per_question_diffs: [...fa.keys()].sort().map((k) => r4(fa.get(k) - fb.get(k))) };
  out._perQ = perQ;
  return out;
}
const allIds = tqRefsAll.map((r) => r.id).sort((x, y) => x - y);
const untouched = allIds.filter((i) => !TOUCHED.includes(i));
const tq = { questions_all: allIds.length, untouched: untouched.length, touched_ids: TOUCHED, judgement_items: judgement, typed_answers_identical_to_relational: typedIdentical, blocks: {} };
const perTouched = {};
for (const [name, ids] of [['all30', allIds], ['untouched23', untouched]]) for (const withJ of [true, false]) {
  const b = tqBlock(ids, withJ); const key = name + (withJ ? '_with_judgement' : '_without_judgement');
  if (name === 'all30') for (const id of TOUCHED) { perTouched[id] ||= {}; for (const a of TQARMS) { const q = b._perQ[a].get(id); perTouched[id][a + (withJ ? '' : '_without_judgement')] = { f1: r4(q.f1), p: r4(q.p), r: r4(q.r), tokens: q.tokens, lookups: q.lookups, n_answer: q.na, n_reference: q.nr }; } }
  delete b._perQ; tq.blocks[key] = b;
}
tq.touched_per_question = Object.fromEntries(TOUCHED.map((id) => [id, { kind: tqRefsAll.find((r) => r.id === id).kind, ...perTouched[id] }]));

// ---------- set comparisons ----------
const pcCache = new Map();
function clusterMap(arm, role, set, metric) {
  const k = [arm, role, set].join('|');
  if (!pcCache.has(k)) { const [g] = S.scoreFile(file(arm, role, set), refs, { rule: 'content' }); pcCache.set(k, g); }
  return new Map(pcCache.get(k)._rows.map((r) => [r.cluster, r[metric]]));
}
const METRICS = ['primary', 'r2000', 'r4000', 'r16000', 'auc', 'matched'];
function cmpSet(A, Bm, set) {
  const r = CMP.compare(file(A.arm, A.role, set), file(Bm.arm, Bm.role, set), refs, { rule: 'content', resamples: NRES, seed: SEED, metrics: METRICS });
  const m = {};
  for (const [k, v] of Object.entries(r.metrics)) m[k] = { mean_a: r4(v.mean_a), mean_b: r4(v.mean_b), diff: r4(v.diff), diff_exact: v.diff, ci95: v.ci95 && v.ci95.map(r4), excludes_zero: v.excludes_zero, p_signflip: v.p_signflip == null ? null : r4(v.p_signflip), a_higher: v.wins, b_higher: v.losses, ties: v.ties, clusters: v.clusters, ...(k === 'matched' ? { tokens: v.tokens } : {}) };
  const va = clusterMap(A.arm, A.role, set, 'primary'); const vb = clusterMap(Bm.arm, Bm.role, set, 'primary');
  const keys = [...va.keys()].filter((k) => vb.has(k)).sort();
  m.primary.per_commit_diffs = keys.map((k) => r4(va.get(k) - vb.get(k)));
  m.primary.all_commit_diffs_zero = keys.every((k) => va.get(k) === vb.get(k));
  m.median_tokens_a = row(A.arm, A.role, set).median_tokens_8000; m.median_tokens_b = row(Bm.arm, Bm.role, set).median_tokens_8000;
  return m;
}
const tqDiffAll = tq.blocks.all30_with_judgement.typed_minus_search_f1.diff;
function verdict(A, Bm, bySet, tqSign) {
  const t1 = bySet.T1.primary; const d = t1.diff_exact; const ci = t1.ci95;
  const signals = { T1: sgn(d), T2: sgn(bySet.T2.primary.diff_exact), T3: sgn(bySet.T3.primary.diff_exact), TQ: tqSign };
  const avail = Object.entries(signals).filter(([, v]) => v !== null);
  const notes = [];
  if (t1.all_commit_diffs_zero) notes.push('Every per-commit T1 difference is exactly zero: the answers score identically, so the difference is zero by construction (same specification, same parameters). This shows the engines return the same answer quality for this configuration; it does not show that a graph engine cannot add quality with a different, engine-native configuration (see H1b), and it says nothing about engine cost (H5).');
  if (t1.excludes_zero) {
    const dir = sgn(d); const win = dir > 0 ? 'A' : 'B';
    const tokW = dir > 0 ? bySet.T1.median_tokens_a : bySet.T1.median_tokens_b; const tokL = dir > 0 ? bySet.T1.median_tokens_b : bySet.T1.median_tokens_a;
    const agree = avail.filter(([, v]) => v === dir).length;
    const tokOk = tokW <= tokL; const signOk = agree >= 3;
    if (tokOk && signOk) return { verdict: 'better', winner: win === 'A' ? A.label : Bm.label, decided_by: `T1 primary 95 % interval [${ci}] excludes zero; median answer tokens ${tokW} <= ${tokL}; sign agrees on ${agree} of ${avail.length} available signals (${avail.map(([k, v]) => k + (v > 0 ? '+' : v < 0 ? '-' : '0')).join(', ')}), at least 3 required.`, signals, notes };
    notes.push(`T1 interval excludes zero (favouring ${win === 'A' ? A.label : Bm.label}) but "better" fails: ${tokOk ? '' : `median tokens ${tokW} > ${tokL}; `}${signOk ? '' : `sign agrees on only ${agree} of ${avail.length} available signals (${avail.map(([k, v]) => k + (v > 0 ? '+' : v < 0 ? '-' : '0')).join(', ')}), at least 3 required`}.`);
  }
  if (ci[0] >= -EPS && ci[1] <= EPS) return { verdict: 'equivalent', winner: null, decided_by: `the whole T1 primary 95 % interval [${ci}] lies within plus or minus ${EPS}.`, signals, notes };
  return { verdict: 'inconclusive', winner: null, decided_by: t1.excludes_zero ? `the interval [${ci}] excludes zero but the other "better" conditions fail (see notes), and the interval is not inside plus or minus ${EPS}.` : `the T1 primary 95 % interval [${ci}] includes zero and is not inside plus or minus ${EPS}.`, signals, notes };
}
const P = (arm, role, label) => ({ arm, role, label: label || `${arm} ${role}` });
const REL = P('relational', 'primary', 'relational primary');
const TYPED = P('relational', 'primary', 'typed primary (relational = LadybugDB = DuckPGQ answers)');
const comparisons = [];
function run(id, group, A, Bm, sets, withVerdict, tqSign, extraNote) {
  const bySet = {}; for (const s of sets) bySet[s] = cmpSet(A, Bm, s);
  const c = { id, group, a: A.label, a_arm: A.arm, a_role: A.role, b: Bm.label, b_arm: Bm.arm, b_role: Bm.role, sets: bySet };
  if (withVerdict) Object.assign(c, verdict(A, Bm, bySet, tqSign)); else c.verdict = 'none (descriptive)';
  if (extraNote) c.note = extraNote;
  comparisons.push(c); return c;
}
const ALLSETS = ['T1', 'T2', 'T3', 'T1x', 'T4'];
run('H1', 'H1', P('ladybug', 'primary', 'LadybugDB primary'), REL, ALLSETS, true, 0, 'H1 graph arm = LadybugDB (tie on T1 TUNE primary, addendum 4 item 8). Questions: identical answers, difference 0.');
run('H2-ladybug', 'H2', P('ladybug', 'primary', 'LadybugDB primary'), REL, ALLSETS, true, 0);
run('H2-duckpgq', 'H2', P('duckpgq', 'primary', 'DuckPGQ primary'), REL, ALLSETS, true, 0);
run('H1b', 'H1b', P('ladybug', 's2', 'LadybugDB s2 (PPR + stored community prior), stored draw'), REL, ALLSETS, true, 0, 'Questions do not depend on the set configuration; LadybugDB question answers equal relational, so the TQ signal is 0.');
for (let k = 1; k <= 4; k++) run('H1b-draw' + k, 'H1b draws', P('ladybug', 's2-draw' + k, 'LadybugDB s2 draw ' + k), REL, ['T1', 'T2', 'T3'], false, null);
const tqS = sgn(tqDiffAll);
run('H3-search', 'H3', TYPED, P('search', 'primary', 'search primary'), ALLSETS, true, tqS);
run('H3-floor-dir', 'H3', TYPED, P('floor-dir', 'primary', 'floor-dir'), ALLSETS, true, null, 'No questions for floors: signals are T1, T2, T3 only, so all three must agree.');
run('H3-floor-co', 'H3', TYPED, P('floor-co', 'primary', 'floor-co'), ALLSETS, true, null, 'No questions for floors: signals are T1, T2, T3 only, so all three must agree.');
run('H3-search-s2', 'H3', TYPED, P('search', 's2', 'search s2 (best form)'), ALLSETS, true, tqS);
run('H3-s1-search', 'H3 s1', P('relational', 's1', 'typed s1 (hops=4)'), P('search', 'primary', 'search primary'), ALLSETS, false, null);
run('H3-s1-floor-dir', 'H3 s1', P('relational', 's1', 'typed s1 (hops=4)'), P('floor-dir', 'primary', 'floor-dir'), ALLSETS, false, null);
run('H3-s1-floor-co', 'H3 s1', P('relational', 's1', 'typed s1 (hops=4)'), P('floor-co', 'primary', 'floor-co'), ALLSETS, false, null);
run('X-floor-dir-search', 'extra', P('floor-dir', 'primary', 'floor-dir'), P('search', 'primary', 'search primary'), ['T1', 'T2', 'T3', 'T1x', 'T4'], false, null);
run('X-floor-co-search', 'extra', P('floor-co', 'primary', 'floor-co'), P('search', 'primary', 'search primary'), ['T1', 'T2', 'T3', 'T1x', 'T4'], false, null);
run('X-s1-primary', 'extra', P('relational', 's1', 'typed s1 (hops=4)'), REL, ['T1', 'T2', 'T3', 'T1x', 'T4'], false, null);
run('X-search-s2-primary', 'extra', P('search', 's2', 'search s2'), P('search', 'primary', 'search primary'), ['T1', 'T2', 'T3', 'T1x', 'T4'], false, null);

// H1b spread over the five community draws
const draws = ['s2', 's2-draw1', 's2-draw2', 's2-draw3', 's2-draw4'].map((r) => row('ladybug', r, 'T1').primary);
const dm = S.mean(draws);
const h1bSpread = { T1_primary_by_draw: draws, min: Math.min(...draws), max: Math.max(...draws), mean: r4(dm), sd: r4(Math.sqrt(draws.reduce((s, x) => s + (x - dm) ** 2, 0) / (draws.length - 1))), relational_primary_T1: row('relational', 'primary', 'T1').primary,
  diff_vs_relational_by_draw: ['H1b', 'H1b-draw1', 'H1b-draw2', 'H1b-draw3', 'H1b-draw4'].map((id) => { const c = comparisons.find((x) => x.id === id).sets.T1.primary; return { diff: c.diff, ci95: c.ci95, excludes_zero: c.excludes_zero }; }) };

// ---------- runtime split (T1 and T2, by the seed file's runtime) ----------
const rtOf = (p) => (p.startsWith('backend/') ? 'backend' : p.startsWith('technician-app/') ? 'mobile' : p.startsWith('src/') ? 'web' : 'other');
const RTARMS = [['relational', 'primary'], ['ladybug', 's2'], ['search', 'primary'], ['search', 's2'], ['floor-dir', 'primary'], ['floor-co', 'primary']];
const runtime = {};
for (const set of ['T1', 'T2']) {
  runtime[set] = {};
  const per = {}; for (const [a, r] of RTARMS) { const [g] = S.scoreFile(file(a, r, set), refs, { rule: 'content' }); per[a + ' ' + r] = g._per; }
  for (const rt of ['backend', 'web', 'mobile', 'other']) {
    const ids = new Set([...refRaw.values()].filter((x) => x.set === set && x.seed && rtOf(x.seed.path) === rt).map((x) => x.id));
    if (!ids.size) continue;
    const blk = { tasks: ids.size, arms: {} };
    const cm = {};
    for (const k of Object.keys(per)) { const rows = S.clusterValues(per[k].filter((t) => ids.has(t.id))); cm[k] = new Map(rows.map((r) => [r.cluster, r.primary])); blk.arms[k] = { primary: r4(S.mean(rows.map((r) => r.primary))), clusters: rows.length }; }
    for (const b of ['search primary', 'floor-dir primary', 'floor-co primary']) { const ps = CMP.pairedStats(cm['relational primary'], cm[b], NRES, SEED); blk['typed_minus_' + b.replace(' primary', '').replace(' ', '_')] = { diff: r4(ps.diff), ci95: ps.ci95 && ps.ci95.map(r4), clusters: ps.clusters }; }
    runtime[set][rt] = blk;
  }
}

// ---------- removed-document check, T3 and T4 (whole paths) ----------
const removed = [];
const seedPath = (s) => { const t = String(s); const i = t.indexOf(':'); let p = i >= 0 ? t.slice(i + 1) : t; p = p.split('::')[0].split('#')[0]; return p; };
for (const dir of fs.readdirSync(path.join(B, 'results', 'heldout'), { withFileTypes: true })) {
  if (!dir.isDirectory() || dir.name.startsWith('_') || dir.name === 'tq') continue;
  for (const role of fs.readdirSync(path.join(B, 'results', 'heldout', dir.name))) for (const set of ['T3', 'T4']) {
    const f = path.join(B, 'results', 'heldout', dir.name, role, set + '.jsonl.gz'); if (!fs.existsSync(f)) continue;
    let tasks = 0, withRemoved = 0, inShown = 0, inBeyond = 0, inSeeds = 0, inVia = 0;
    for (const a of H.readGzJsonl(f)) {
      const rp = (refRaw.get(a.id) || {}).remove_paths || []; tasks++; if (!rp.length) continue; withRemoved++;
      const has = (p) => rp.includes(p);
      if (a.items.some((it) => has(it.path))) inShown++;
      if ((a.beyond_sample || []).some((p) => has(typeof p === 'string' ? p : p && p.path))) inBeyond++;
      if ((a.seeds || []).some((s) => has(seedPath(s)))) inSeeds++;
      if (a.items.some((it) => (it.via || []).some((v) => typeof v === 'string' && rp.some((p) => v === p)))) inVia++;
    }
    removed.push({ arm: dir.name, role, set, tasks, tasks_with_removed_doc: withRemoved, answers_with_removed_path_in_shown_items: inShown, in_beyond_budget_sample: inBeyond, in_seeds: inSeeds, in_explanation_via: inVia });
  }
}
const nonode = JSON.parse(fs.readFileSync(path.join(OUT, 'nonode.json'), 'utf8'));
const extra = { h1b_spread: h1bSpread, runtime, removed_document_check: removed, removed_document_total_hits: removed.reduce((s, r) => s + r.answers_with_removed_path_in_shown_items + r.in_beyond_budget_sample + r.in_seeds + r.in_explanation_via, 0), definitions_without_node: nonode };
fs.writeFileSync(path.join(OUT, 'comparisons.json'), JSON.stringify({ written_at: new Date().toISOString(), method: 'arms/common/compare.js paired cluster bootstrap, 10,000 resamples, seed 20261112, cluster = commit (T3: task; T4: fix commit); difference = A - B', wording: 'better: T1 primary interval excludes zero AND winner median answer tokens no higher AND sign agrees on >= 3 of T1, T2, T3, questions (floors: T1, T2, T3 only); equivalent: whole T1 interval within +-0.05; else inconclusive', comparisons, h1b_spread: h1bSpread }, null, 1));
fs.writeFileSync(path.join(OUT, 'tq.json'), JSON.stringify(tq, null, 1));
fs.writeFileSync(path.join(OUT, 'extra.json'), JSON.stringify(extra, null, 1));

// ---------- report_data.json (aggregates only; no file names, no ids of tasks) ----------
const strip = (c) => ({ id: c.id, group: c.group, a: c.a, b: c.b, verdict: c.verdict, winner: c.winner || null, decided_by: c.decided_by || null, notes: c.notes || [], note: c.note || null, signals: c.signals || null,
  sets: Object.fromEntries(Object.entries(c.sets).map(([s, m]) => [s, { primary: { mean_a: m.primary.mean_a, mean_b: m.primary.mean_b, diff: m.primary.diff, ci95: m.primary.ci95, p_signflip: m.primary.p_signflip, a_higher: m.primary.a_higher, b_higher: m.primary.b_higher, ties: m.primary.ties, clusters: m.primary.clusters, all_commit_diffs_zero: m.primary.all_commit_diffs_zero },
    r2000: { diff: m.r2000.diff, ci95: m.r2000.ci95 }, r4000: { diff: m.r4000.diff, ci95: m.r4000.ci95 }, r16000: { diff: m.r16000.diff, ci95: m.r16000.ci95 }, auc: { diff: m.auc.diff, ci95: m.auc.ci95 }, matched: { tokens: m.matched.tokens, diff: m.matched.diff, ci95: m.matched.ci95 },
    median_tokens_a: m.median_tokens_a, median_tokens_b: m.median_tokens_b, per_commit_primary_diffs: m.primary.per_commit_diffs }])) });
const tables = scores.map((r) => { const o = { ...r }; delete o.curve; delete o.curve_grid_tokens; return o; });
const curves = scores.filter((r) => r.set === 'T1' || r.set === 'T2' || r.set === 'T3').map((r) => ({ arm: r.arm, role: r.role, set: r.set, budgets: [2000, 4000, 8000, 16000], recall_at_budget: [r.r2000, r.r4000, r.r8000, r.r16000], whole_item_grid_tokens: r.curve_grid_tokens, whole_item_recall: r.curve }));
const tqReport = JSON.parse(JSON.stringify(tq));
fs.writeFileSync(path.join(OUT, 'report_data.json'), JSON.stringify({ written_at: new Date().toISOString(), note: 'Aggregates only. Recall = share of reference files and definitions shown (rule content). Tokens = answer tokens. Primary = recall inside the 8,000-token answer, mean over commits of the per-commit mean over tasks.', tables, comparisons: comparisons.map(strip), h1b_spread: h1bSpread, questions: tqReport, runtime, removed_document_check: { rows: removed, total_hits: extra.removed_document_total_hits }, definitions_without_node: nonode, curves }, null, 1));
// console summary
for (const c of comparisons) { const t = c.sets.T1.primary; console.log(`${c.id}: ${c.a} - ${c.b} T1 ${t.mean_a} vs ${t.mean_b} diff ${t.diff} [${t.ci95}] | T2 ${c.sets.T2 ? c.sets.T2.primary.diff + ' [' + c.sets.T2.primary.ci95 + ']' : '-'} | T3 ${c.sets.T3 ? c.sets.T3.primary.diff + ' [' + c.sets.T3.primary.ci95 + ']' : '-'} | r2k ${c.sets.T1.r2000.diff} [${c.sets.T1.r2000.ci95}] r4k ${c.sets.T1.r4000.diff} [${c.sets.T1.r4000.ci95}] auc ${c.sets.T1.auc.diff} [${c.sets.T1.auc.ci95}] => ${c.verdict}${c.winner ? ' (' + c.winner + ')' : ''} ${c.decided_by || ''} ${(c.notes || []).join(' ')}`); }
console.log(JSON.stringify({ tq_blocks: Object.fromEntries(Object.entries(tq.blocks).map(([k, b]) => [k, { rel: b.arms.relational, search: b.arms.search, diff: b.typed_minus_search_f1 && { d: b.typed_minus_search_f1.diff, ci: b.typed_minus_search_f1.ci95 } }])), typedIdentical, h1bSpread, removed_total: extra.removed_document_total_hits }, null, 1));
