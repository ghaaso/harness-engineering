'use strict';
// fix_apply.js - applies the independent check of data.json (2026-11-13, grader lane).
// Recomputes every value the check named from the stored per-task scores, tuning tables and
// stored answers (no arm is run, nothing under arms/, tasks/, facts/ or results/ is written),
// corrects data.json where the recomputation agrees with the check, rewords the sentences the
// check found to state or imply a must-not-claim sentence, and writes:
//   data.json (in place, this folder), the page copy, fix_apply.json (every change, old -> new).
// Run:  node fix_apply.js            (dry run: writes fix_apply.json only)
//       node fix_apply.js --write    (also writes both data.json copies)
const fs = require('fs'); const path = require('path'); const zlib = require('zlib');
const V2 = __dirname; const HO = path.join(V2, '..'); const B = path.resolve(V2, '..', '..', '..', '..');
const PAGE = 'C:/Users/User/Documents/projects/EMS_workshop1/docs/program/graph-test/data/data.json';
const S = require(path.join(B, 'arms/common/score.js'));
const gz = (f) => zlib.gunzipSync(fs.readFileSync(f)).toString('utf8').split('\n').filter(Boolean).map(JSON.parse);
const jl = (f) => fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map(JSON.parse);
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
const r4 = (x) => (x == null ? null : Math.round(x * 1e4) / 1e4);
const TOL = 1e-12;
const D = JSON.parse(fs.readFileSync(path.join(V2, fs.existsSync(path.join(V2, 'data.before_check.json')) ? 'data.before_check.json' : 'data.json'), 'utf8')); // always start from the pre-check file, so a re-run is idempotent
const log = { written_at: new Date().toISOString(), tie_tolerance: TOL, changes: [], checks: [], not_changed: [] };
const change = (where, from, to, why) => { log.changes.push({ where, from, to, why }); };

// ---------- inputs ----------
const per = new Map();
for (const t of gz(path.join(HO, 'tasks.jsonl.gz'))) { const k = [t.arm, t.role, t.set].join('|'); if (!per.has(k)) per.set(k, []); per.get(k).push(t); }
const refRaw = new Map(jl(path.join(HO, 'refs_heldout.jsonl')).map((r) => [r.id, r]));
const ARMS = { typed: ['relational', 'primary'], ladybug: ['ladybug', 'primary'], duckpgq: ['duckpgq', 'primary'], s1: ['relational', 's1'], lbs2: ['ladybug', 's2'], lbs2d1: ['ladybug', 's2-draw1'], lbs2d2: ['ladybug', 's2-draw2'], lbs2d3: ['ladybug', 's2-draw3'], lbs2d4: ['ladybug', 's2-draw4'], search: ['search', 'primary'], search2: ['search', 's2'], fdir: ['floor-dir', 'primary'], fco: ['floor-co', 'primary'] };
const rows = (k, set) => per.get([...ARMS[k], set].join('|'));
const ansCache = new Map();
const answers = (k) => { if (!ansCache.has(k)) ansCache.set(k, new Map(gz(path.join(B, 'results/heldout', ...ARMS[k], 'T1.jsonl.gz')).map((a) => [a.id, a]))); return ansCache.get(k); };
const runtimeOf = (p) => (p.startsWith('technician-app/') ? 'mobile' : p.startsWith('backend/') ? 'backend' : p.startsWith('src/') ? 'web' : 'root');
const rt = (t) => runtimeOf(refRaw.get(t.id).seed.path);
const GROUPS = { mobile: (t) => rt(t) === 'mobile', backend: (t) => rt(t) === 'backend', web_without_root_task: (t) => rt(t) === 'web', web_with_root_task: (t) => ['web', 'root'].includes(rt(t)), not_mobile: (t) => rt(t) !== 'mobile', all: null };
function cm(k, set, o = {}) {
  const g = new Map();
  for (const t of rows(k, set)) { if (o.filter && !o.filter(t)) continue; const v = t[o.metric || 'primary']; if (v == null) continue; const c = o.keyOf ? o.keyOf(t) : t.cluster; if (!g.has(c)) g.set(c, []); g.get(c).push(v); }
  const m = new Map([...g].map(([c, v]) => [c, mean(v)])); if (o.drop) for (const c of o.drop) m.delete(c); return m;
}
function counts(a, b, set, o) {
  const ma = cm(a, set, o); const mb = cm(b, set, o); const d = [...ma.keys()].filter((c) => mb.has(c)).map((c) => ma.get(c) - mb.get(c));
  return { n: d.length, exact_diff: mean(d), strict: [d.filter((x) => x > 0).length, d.filter((x) => x < 0).length, d.filter((x) => x === 0).length], tol: [d.filter((x) => x > TOL).length, d.filter((x) => x < -TOL).length, d.filter((x) => Math.abs(x) <= TOL).length] };
}
// ---------- 1. win / loss / tie counts in every paired row of data.json ----------
const targets = [];
const RM = { H1: ['ladybug', 'typed'], 'H2-ladybug': ['ladybug', 'typed'], 'H2-duckpgq': ['duckpgq', 'typed'], H1b: ['lbs2', 'typed'], 'H3-search': ['typed', 'search'], 'H3-floor-dir': ['typed', 'fdir'], 'H3-floor-co': ['typed', 'fco'], 'H3-search-s2': ['typed', 'search2'], 'X-s1-primary': ['s1', 'typed'], 'X-floor-co-search': ['fco', 'search'], 'X-floor-dir-search': ['fdir', 'search'], 'X-search-s2-primary': ['search2', 'search'], 'H3-s1-search': ['s1', 'search'], 'H3-s1-floor-dir': ['s1', 'fdir'], 'H3-s1-floor-co': ['s1', 'fco'] };
const LONG = ['n_clusters', 'a_higher_clusters', 'b_higher_clusters', 'tied_clusters']; const SHORT = ['n_clusters', 'a_higher', 'b_higher', 'ties'];
for (const grp of ['rows', 'descriptive']) D.comparisons[grp].forEach((r, i) => { const m = RM[r.id]; if (!m) return; for (const set of Object.keys(r.sets || {})) targets.push({ where: `comparisons.${grp}[${i}].sets.${set} (${r.id})`, obj: r.sets[set], f: LONG, a: m[0], b: m[1], set }); });
targets.push({ where: 'trust.declared_changes_after_tuning_data[0].effect_on_heldout.s1_minus_primary_T1', obj: D.trust.declared_changes_after_tuning_data[0].effect_on_heldout.s1_minus_primary_T1, f: LONG, a: 's1', b: 'typed', set: 'T1' });
const H3LIST = { typed_vs_search: ['typed', 'search'], typed_vs_search_s2: ['typed', 'search2'], typed_vs_cochange_floor: ['typed', 'fco'], typed_vs_samedir_floor: ['typed', 'fdir'], cochange_floor_vs_search: ['fco', 'search'] };
for (const [name, [a, b]] of Object.entries(H3LIST)) for (const [g, f] of Object.entries(GROUPS)) { const o = D.splits.comparisons[name].groups[g]; if (o) targets.push({ where: `splits.comparisons.${name}.groups.${g}`, obj: o, f: SHORT, a, b, set: 'T1', o: { filter: f } }); }
// sensitivity: same drop rules as recompute.js
const commitInfo = new Map();
for (const t of rows('typed', 'T1')) { const r = refRaw.get(t.id); if (!commitInfo.has(t.cluster)) commitInfo.set(t.cluster, { commit: t.cluster, changed_files: r.commit_n_files_all, tasks: 0, units: 0 }); const o = commitInfo.get(t.cluster); o.tasks++; o.units += t.units; }
const largest = (k) => [...commitInfo.values()].sort((x, y) => y[k] - x[k] || (x.commit < y.commit ? -1 : 1)).slice(0, 3).map((o) => o.commit);
for (const [name, [a, b]] of Object.entries(H3LIST)) {
  const S0 = D.sensitivity.comparisons[name]; const ma = cm(a, 'T1'); const mb = cm(b, 'T1');
  const order = [...ma.keys()].map((c) => [c, ma.get(c) - mb.get(c)]).sort((x, y) => y[1] - x[1] || (x[0] < y[0] ? -1 : 1));
  const idBoth = (t) => answers(a).get(t.id).seed_match === 'id' && answers(b).get(t.id).seed_match === 'id';
  const V = { full: {}, drop_3_most_favourable_to_a: { drop: order.slice(0, 3).map((x) => x[0]) }, drop_5_most_favourable_to_a: { drop: order.slice(0, 5).map((x) => x[0]) }, drop_5_most_favourable_to_b: { drop: order.slice(-5).map((x) => x[0]) }, drop_3_largest_by_changed_files: { drop: largest('changed_files') }, drop_3_largest_by_tasks: { drop: largest('tasks') }, drop_3_largest_by_reference_units: { drop: largest('units') }, seeds_matched_by_id_only: { filter: idBoth }, at_2000_tokens: { metric: 'r2000' }, at_4000_tokens: { metric: 'r4000' }, at_16000_tokens: { metric: 'r16000' } };
  for (const [k, o] of Object.entries(V)) if (S0[k]) targets.push({ where: `sensitivity.comparisons.${name}.${k}`, obj: S0[k], f: SHORT, a, b, set: 'T1', o });
}
const T3KEY = { by_task: (t) => t.id, by_parent_commit: (t) => refRaw.get(t.id).parent, by_parent_and_document: (t) => refRaw.get(t.id).parent + '|' + refRaw.get(t.id).doc };
const T3LIST = { ...H3LIST, lbs2_vs_typed: ['lbs2', 'typed'], s1_vs_typed: ['s1', 'typed'] };
for (const [name, [a, b]] of Object.entries(T3LIST)) for (const [k, f] of Object.entries(T3KEY)) { const o = D.t3.comparisons[name] && D.t3.comparisons[name][k]; if (o) targets.push({ where: `t3.comparisons.${name}.${k}`, obj: o, f: SHORT, a, b, set: 'T3', o: { keyOf: f } }); }
['lbs2', 'lbs2d1', 'lbs2d2', 'lbs2d3', 'lbs2d4'].forEach((k, i) => { const r = D.draws.rows[i]; for (const [f, set, o] of [['T1', 'T1', {}], ['T2', 'T2', {}], ['T3', 'T3', {}], ['r2000', 'T1', { metric: 'r2000' }], ['r4000', 'T1', { metric: 'r4000' }]]) targets.push({ where: `draws.rows[${i}].${f}`, obj: r[f], f: SHORT, a: k, b: 'typed', set, o }); });

let nTargets = 0;
for (const t of targets) {
  const c = counts(t.a, t.b, t.set, t.o || {}); nTargets++;
  const [fn, fa, fb, ft] = t.f; const cur = [t.obj[fa], t.obj[fb], t.obj[ft]];
  if (t.obj[fn] !== c.n) { log.checks.push({ where: t.where, problem: `cluster count ${t.obj[fn]} in data, ${c.n} recomputed` }); continue; }
  if (JSON.stringify(cur) !== JSON.stringify(c.strict)) { log.checks.push({ where: t.where, problem: `stored counts ${cur} do not equal the strict recount ${c.strict}` }); continue; }
  if (JSON.stringify(c.strict) !== JSON.stringify(c.tol)) {
    change(t.where, { [fa]: cur[0], [fb]: cur[1], [ft]: cur[2] }, { [fa]: c.tol[0], [fb]: c.tol[1], [ft]: c.tol[2] }, 'a cluster whose two means are equal up to floating-point rounding (absolute difference at most 1e-12, here about 1e-16) was counted as a win or a loss; recounted as a tie');
    t.obj[fa] = c.tol[0]; t.obj[fb] = c.tol[1]; t.obj[ft] = c.tol[2];
  }
}
log.checks.push({ what: 'paired rows recounted', rows: nTargets });

// ---------- 2. held-out per-runtime differences re-weighted to the tuning mix ----------
const tuneRefs = jl(path.join(B, 'sealed/grader/refs_tune.jsonl')).filter((r) => r.set === 'T1');
const wt = (g) => tuneRefs.filter((r) => runtimeOf(r.seed.path) === g).length / tuneRefs.length;
for (const [name, [a, b]] of Object.entries(H3LIST)) {
  const gd = (g) => counts(a, b, 'T1', { filter: GROUPS[g] }).exact_diff;
  const exact = gd('mobile') * wt('mobile') + gd('backend') * wt('backend') + gd('web_without_root_task') * wt('web');
  const cur = D.splits.heldout_reweighted_to_tuning_mix[name];
  log.checks.push({ what: 'reweighted ' + name, data: cur, exact: Number(exact.toFixed(6)) });
  if (r4(exact) !== cur) { change(`splits.heldout_reweighted_to_tuning_mix.${name}`, cur, r4(exact), `computed from rounded group differences; exact ${exact.toFixed(6)}`); D.splits.heldout_reweighted_to_tuning_mix[name] = r4(exact); }
}

// ---------- 3. padding shares (same rule as recompute.js item h, exact ratios) ----------
const refsS = S.readRefs(path.join(HO, 'refs_heldout.jsonl'));
for (const k of Object.keys(D.padding.arms)) {
  const recs = [];
  for (const [id, a] of answers(k)) {
    const ref = refsS.get(id); const base = S.scoreAnswer(a, ref); if (!base) continue;
    const isHist = (it) => !it.pad && (it.via || []).includes('co_changed');
    const m = { ...a, items: a.items.map((it) => ({ ...it, pad: isHist(it) ? 0 : 1 })), budgets: JSON.parse(JSON.stringify(a.budgets)) };
    for (const bb of Object.values(m.budgets)) if (bb.cut && a.items[bb.n_full]) bb.cut.pad = isHist(a.items[bb.n_full]) ? 0 : 1;
    const h = S.scoreAnswer(m, ref); recs.push({ r: base.r8000, unpad: base.unpad_r8000, hist: h.unpad_r8000 });
  }
  const R = mean(recs.map((x) => x.r)); const pad = mean(recs.map((x) => x.r - x.unpad)) / R; const via = mean(recs.map((x) => x.hist)) / R;
  const o = D.padding.arms[k];
  log.checks.push({ what: 'padding shares ' + k, tasks: recs.length, recall: Number(R.toFixed(6)), share_padding_exact: pad.toPrecision(10), share_via_cochange_exact: via.toPrecision(10), data: [o.share_from_padding_tail_per_task, o.share_via_cochange_per_task] });
  if (r4(pad) !== o.share_from_padding_tail_per_task) { change(`padding.arms.${k}.share_from_padding_tail_per_task`, o.share_from_padding_tail_per_task, r4(pad), `ratio of rounded values; exact ${pad.toFixed(6)}`); o.share_from_padding_tail_per_task = r4(pad); }
  if (r4(via) !== o.share_via_cochange_per_task) { change(`padding.arms.${k}.share_via_cochange_per_task`, o.share_via_cochange_per_task, r4(via), `ratio of rounded values; exact ${via.toPrecision(8)}`); o.share_via_cochange_per_task = r4(via); }
}

// ---------- 4. tuning factor ranges and changes from the unrounded tables ----------
const tab = {};
for (const arm of ['relational', 'ladybug', 'duckpgq', 'search', 'floor-dir', 'floor-co']) {
  tab[arm] = new Map();
  for (const st of ['stage1', 'stage2']) { const f = path.join(B, 'sealed/grader', st, arm + '.summary.json'); if (!fs.existsSync(f)) continue; for (const e of JSON.parse(fs.readFileSync(f, 'utf8'))) if (e.set === 'T1') tab[arm].set(e.name || e.config_name, e.metrics.primary.mean); }
}
for (const grp of ['factors', 'search_factors']) D.tuning[grp].forEach((f, i) => {
  const ex = (name) => tab[f.arm].get(name); const b = ex(f.base.configuration);
  const ps = f.levels.map((l) => ex(l.configuration)).filter((x) => x != null);
  const range = Math.max(...ps) - Math.min(...ps);
  if (r4(range) !== f.range) {
    change(`tuning.${grp}[${i}].range (${f.factor})`, f.range, r4(range), `taken from rounded level values; exact ${range.toFixed(6)}`);
    const s = D.tuning.factor_summary.find((x) => x.arm === f.arm && x.factor === f.factor);
    if (s && s.moved_primary_by === f.range) { change(`tuning.factor_summary (${f.factor}).moved_primary_by`, s.moved_primary_by, r4(range), 'the same range, repeated in the summary'); s.moved_primary_by = r4(range); }
    f.range = r4(range);
  }
  f.levels.forEach((l, j) => { const v = ex(l.configuration); if (v == null || b == null || l.change_from_base == null) return; const c = r4(v - b); if (c !== l.change_from_base) { change(`tuning.${grp}[${i}].levels[${j}].change_from_base`, l.change_from_base, c, `difference of rounded values; exact ${(v - b).toFixed(6)}`); l.change_from_base = c; } });
});

// ---------- 5. trust block ----------
const drops = D.trust.tuning_to_heldout_drop.map((r) => r.drop);
log.checks.push({ what: 'tuning-to-held-out drops', min: Math.min(...drops), max: Math.max(...drops) });
const tc = D.tuning.counts; log.checks.push({ what: 'tuning counts', counts: tc });
const txt = (where, get, set, from, to, why) => { const cur = get(); if (!cur.includes(from)) { log.checks.push({ where, problem: 'expected text not found: ' + from }); return; } const nv = cur.split(from).join(to); set(nv); change(where, from, to, why); };
txt('trust.drop_note', () => D.trust.drop_note, (v) => { D.trust.drop_note = v; }, '0.06 to 0.17 lower', `${(Math.floor(Math.min(...drops) * 100) / 100).toFixed(2)} to ${(Math.round(Math.max(...drops) * 100) / 100).toFixed(2)} lower`, `the smallest drop is ${Math.min(...drops)} (LadybugDB S2 draw 1, T1); the largest ${Math.max(...drops)}`);
if (tc['floor-dir'] === 8 && tc['floor-co'] === 8) txt('trust.timeline[5].what', () => D.trust.timeline[5].what, (v) => { D.trust.timeline[5].what = v; }, '4 for each floor', '8 for each floor', 'tuning.counts and the stage tables hold 8 T1 configurations for each floor');
txt('trust.timeline[7].changed', () => D.trust.timeline[7].changed, (v) => { D.trust.timeline[7].changed = v; }, 'Round 3 passed.', 'Round 3 passed. Question 40 is still answered empty by all three typed arms (addendum 6 item 6).', 'discipline must-not-claim 4: the cut-back rule did not give the typed arms an answer to question 40');
txt('trust.timeline[8].what', () => D.trust.timeline[8].what, (v) => { D.trust.timeline[8].what = v; }, 'reference answers hidden from every arm process.', 'reference answers hidden from every arm process; the live working tree, with the full git history and untracked copies of the sealed notes and statistics but no held-out answer or id, was mounted read-only (addendum 6 item 7).', 'discipline must-not-claim 5: the mount caveat belongs with the statement');
txt('arms[4].what', () => D.arms[4].what, (v) => { D.arms[4].what = v; }, 'A script that does what a session typically does by hand:', 'A fixed script modelled on the searches sessions run:', 'claims must-not-claim 6: the scripted search is not shown to be how sessions search today');

// ---------- 6. comparison sentences ----------
const R = (id) => D.comparisons.rows.find((r) => r.id === id);
const sp = D.splits.comparisons; const f3 = (x) => (x >= 0 ? '+' : '') + x.toFixed(3); const iv = (g) => `${f3(g.diff)} [${f3(g.ci95[0])}, ${f3(g.ci95[1])}]`;
const pad = D.padding.arms.search;
log.checks.push({ what: 'search padding share', per_task: [pad.per_task.from_padding_tail_only, pad.per_task.recall, pad.share_from_padding_tail_per_task], per_commit: [pad.per_commit.from_padding_tail_only, pad.per_commit.recall] });
const pshare = Math.round(pad.share_from_padding_tail_per_task * 100);
txt('comparisons.descriptive[1].qualification', () => D.comparisons.descriptive[1].qualification, (v) => { D.comparisons.descriptive[1].qualification = v; }, 'most of its credited recall comes from the same co-change tail.', `about half of its credited recall (${pshare} % per task) comes from the same co-change tail.`, `false as written: ${pad.per_task.from_padding_tail_only} of ${pad.per_task.recall} recall per task (${pshare} %) and ${Math.round(pad.per_commit.from_padding_tail_only / pad.per_commit.recall * 100)} % per commit`);
const s4 = sp.typed_vs_search.groups;
txt('comparisons.rows[4].qualification (H3-search)', () => R('H3-search').qualification, (v) => { R('H3-search').qualification = v; }, 'The whole T1 gain comes from changes seeded in the mobile app: mobile', 'The T1 gain rests on changes seeded in the mobile app: mobile', `overstated: outside the mobile app the estimate is ${iv(s4.not_mobile)}, which cannot be told apart from zero but is not shown to be zero`);
txt('comparisons.rows[4].qualification (H3-search)', () => R('H3-search').qualification, (v) => { R('H3-search').qualification = v; }, '; outside the mobile app +0.024', '; outside the mobile app it cannot be told apart from zero, +0.024', 'states the outside-mobile estimate as indistinguishable from zero rather than as no gain');
const s6 = sp.typed_vs_cochange_floor.groups;
txt('comparisons.rows[6].qualification (H3-floor-co)', () => R('H3-floor-co').qualification, (v) => { R('H3-floor-co').qualification = v; }, `On backend and web seeds it ties co-change (outside mobile ${iv(s6.not_mobile)}; backend ${iv(s6.backend)}).`, `On backend and web seeds it cannot be told apart from co-change (outside mobile ${iv(s6.not_mobile)}; backend ${iv(s6.backend)}; web ${iv(s6.web_without_root_task)} without the root-level task, ${iv(s6.web_with_root_task)} with it).`, '"ties" implies equivalence, which the wording rule does not grant; the web figure was missing (addendum 6 item 11)');
const s5 = sp.typed_vs_samedir_floor.groups;
txt('comparisons.rows[5].qualification (H3-floor-dir)', () => R('H3-floor-dir').qualification, (v) => { R('H3-floor-dir').qualification = v; }, 'the same-directory floor is about as good: -0.109 [-0.238, +0.057] without the root-level task, +0.002 [-0.206, +0.264] with it.', 'the same-directory floor scored 0.109 higher without the root-level task (-0.109 [-0.238, +0.057]); with it the typed store scored 0.002 higher (+0.002 [-0.206, +0.264]). Both intervals include zero.', '"about as good" understated a lead for the floor');

// ---------- 7. H4: the 23-question list and the token condition ----------
const Q = D.questions; const h4 = R('H4'); const tw = Q.tokens_two_ways;
const T23 = tw.untouched23; const T22 = tw.untouched22;
log.checks.push({ what: 'H4 token medians', q23: { typed_final: T23.typed_final_answer_tokens_median, search_final: T23.search_final_answer_tokens_median, search_read: T23.search_tokens_read_median }, q22: { typed_final: T22.typed_final_answer_tokens_median, search_final: T22.search_final_answer_tokens_median, search_read: T22.search_tokens_read_median } });
// the stored per-question tokens the verdict code compared: typed final answer against search tokens read
const tokWord = (t) => `better (typed) only when the typed final answer (median ${t.typed_final_answer_tokens_median} tokens) is compared with what the scripted search read (median ${t.search_tokens_read_median}); on final answers alone (typed ${t.typed_final_answer_tokens_median} against search ${t.search_final_answer_tokens_median} tokens) the token condition fails and the word is inconclusive`;
const renameKey = (o, from, to, where) => { if (!(from in o)) return; const e = Object.entries(o).map(([k, v]) => [k === from ? to : k, v]); for (const k of Object.keys(o)) delete o[k]; for (const [k, v] of e) o[k] = v; change(where + ' (key)', from, to, 'discipline must-not-claim 1: 22, not 23, questions are untouched in every arm; the 23 are the addendum 5 list'); };
const NEW23 = 'addendum5_list23';
for (const [k, t] of [['untouched23', T23], ['untouched22', T22]]) {
  for (const sfx of ['_with_judgement', '_without_judgement']) { const b = Q.blocks[k + sfx]; if (b.verdict_word_on_its_own === 'better (typed)') { change(`questions.blocks.${k}${sfx}.verdict_word_on_its_own`, b.verdict_word_on_its_own, tokWord(t), 'compares two different quantities (addendum 6 item 14; claims must-not-claim 9)'); b.verdict_word_on_its_own = tokWord(t); } }
  if (Q.h4.words[k] === 'better (typed)') { change(`questions.h4.words.${k}`, Q.h4.words[k], tokWord(t), 'as above'); Q.h4.words[k] = tokWord(t); }
  if (h4.v2_words[k] === 'better (typed)') { change(`comparisons.rows[8].v2_words.${k}`, h4.v2_words[k], tokWord(t), 'as above'); h4.v2_words[k] = tokWord(t); }
}
for (const sfx of ['_with_judgement', '_without_judgement']) {
  const b = h4.by_block['untouched23' + sfx]; const from = `median tokens per question ${T23.typed_final_answer_tokens_median} <= ${T23.search_tokens_read_median};`;
  txt(`comparisons.rows[8].by_block.untouched23${sfx}.decided_by`, () => b.decided_by, (v) => { b.decided_by = v; }, from, `median tokens per question ${T23.typed_final_answer_tokens_median} (typed final answer) <= ${T23.search_tokens_read_median} (what the scripted search read; on final answers alone ${T23.typed_final_answer_tokens_median} > ${T23.search_final_answer_tokens_median}, so like for like the token condition fails);`, 'the token condition compared two different quantities (addendum 6 item 14)');
}
txt('comparisons.rows[8].decided_by', () => h4.decided_by, (v) => { h4.decided_by = v; }, 'the 23 untouched questions give better (difference 0.1886 [0.0489,0.3461])', 'the 23 questions of the addendum 5 list (22 are untouched in every arm) give better (difference 0.1886 [0.0489,0.3461]) only by comparing the typed final answer with what the scripted search read', 'discipline must-not-claim 1 and addendum 6 item 14');
txt('comparisons.rows[8].qualification', () => h4.qualification, (v) => { h4.qualification = v; }, 'while the untouched subsets give "better".', `while the subsets of 23 and 22 questions give "better" only by comparing the typed final answer with what the scripted search read; on final answers alone (typed ${T23.typed_final_answer_tokens_median} against search ${T23.search_final_answer_tokens_median} tokens on 23 questions, ${T22.typed_final_answer_tokens_median} against ${T22.search_final_answer_tokens_median} on 22) the token condition fails for them too.`, 'as above');
// key renames (labels only; numbers unchanged)
renameKey(Q.h4, 'untouched23', NEW23, 'questions.h4'); renameKey(Q.h4.words, 'untouched23', NEW23, 'questions.h4.words');
renameKey(Q.tokens_two_ways, 'untouched23', NEW23, 'questions.tokens_two_ways'); renameKey(h4.v2_words, 'untouched23', NEW23, 'comparisons.rows[8].v2_words');
for (const sfx of ['_with_judgement', '_without_judgement']) { renameKey(Q.blocks, 'untouched23' + sfx, NEW23 + sfx, 'questions.blocks'); renameKey(h4.by_block, 'untouched23' + sfx, NEW23 + sfx, 'comparisons.rows[8].by_block'); }
const rule = 'if a subset of untouched questions gives';
txt('questions.h4.rule', () => Q.h4.rule, (v) => { Q.h4.rule = v; }, rule, 'if the 23 questions of the addendum 5 list or the 22 untouched in every arm give', 'names the two subsets exactly');

// ---------- 8. T3 one-task groups: sign only ----------
for (const [name, c] of Object.entries(D.t3.comparisons)) (c.per_group_sign || []).forEach((g, i) => { if (g.tasks === 1 && ('mean_a' in g || 'mean_b' in g)) { change(`t3.comparisons.${name}.per_group_sign[${i}]`, { mean_a: g.mean_a, mean_b: g.mean_b }, 'removed (sign kept)', 'a one-task group exposes that held-out task\'s score; T3 carries a sign only (addendum 6 item 15)'); delete g.mean_a; delete g.mean_b; } });

// ---------- 9. not changed here (owner decision) ----------
log.not_changed.push({ where: 'questions.per_question', why: 'per-question held-out F1, precision, recall, tokens and lookups for the 30 held-out questions; the check leaves keeping or aggregating them to the owner' });
log.not_changed.push({ where: 'sensitivity.largest_commits', why: 'names 5 held-out commit SHAs with reference sizes (check 6, item 3); not listed as a defect; left for the owner' });

// ---------- final scan: no flagged phrase left ----------
const BAD = [/untouched23/, /23 untouched/, /most of its credited recall/, /whole T1 gain/, /ties co-change/, /about as good/, /typically does by hand/, /0\.06 to 0\.17/, /4 for each floor/, /^better \(typed\)$/];
const left = []; (function w(o, p) { if (typeof o === 'string') { if (BAD.some((re) => re.test(o)) && !/^d\.limits\./.test(p)) left.push(p); return; } if (o && typeof o === 'object') for (const k of Object.keys(o)) { if (BAD.some((re) => re.test(k))) left.push(p + '.' + k + ' (key)'); w(o[k], p + '.' + k); } })(D, 'd');
log.checks.push({ what: 'flagged phrases left outside limits', left });
D.meta.corrected_at = new Date().toISOString(); D.meta.correction = 'Independent check applied by the grader lane (sealed/grader/heldout/v2/fix_apply.js; every change in fix_apply.json and NOTES.md). No answer, score or verdict changed.';
fs.writeFileSync(path.join(V2, 'fix_apply.json'), JSON.stringify(log, null, 1));
console.log('changes', log.changes.length, 'checks', JSON.stringify(log.checks.filter((c) => c.problem || c.left), null, 0));
if (process.argv.includes('--write')) { const s = JSON.stringify(D, null, 1); fs.writeFileSync(path.join(V2, 'data.json'), s); fs.writeFileSync(PAGE, s); console.log('written both copies'); }
