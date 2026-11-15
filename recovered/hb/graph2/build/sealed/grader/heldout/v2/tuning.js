'use strict';
// v2 page data, TUNING side (grader lane). Reads the stage-1 and stage-2 TUNE tables and stored TUNE
// answers only; runs no arm. Writes tuning.json in this folder: the sweep by factor, identity counts,
// and three worked examples chosen by a stated rule from the TUNING split (never held-out).
const fs = require('fs'); const path = require('path'); const zlib = require('zlib');
const V2 = __dirname; const B = path.resolve(V2, '..', '..', '..', '..'); const G = path.join(B, 'sealed/grader');
const S = require(path.join(B, 'arms/common/score.js'));
const gz = (f) => zlib.gunzipSync(fs.readFileSync(f)).toString('utf8').split('\n').filter(Boolean).map(JSON.parse);
const jl = (f) => fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map(JSON.parse);
const r4 = (x) => (x == null ? null : Math.round(x * 1e4) / 1e4);
const out = { written_at: new Date().toISOString(), source: 'tuning', note: 'T1 TUNE primary = recall of reference files and definitions inside an 8,000-token answer, mean over the 65 tuning commits (388 tasks); se = standard error over commits. Paths-only forms have no primary (scored on file ranking only).' };

// ---------- sweep tables ----------
const tab = {};
for (const arm of ['relational', 'ladybug', 'duckpgq', 'search', 'floor-dir', 'floor-co']) {
  tab[arm] = new Map();
  for (const st of ['stage1', 'stage2']) {
    const f = path.join(G, st, arm + '.summary.json'); if (!fs.existsSync(f)) continue;
    for (const e of JSON.parse(fs.readFileSync(f, 'utf8'))) if (e.set === 'T1') tab[arm].set(e.name || e.config_name, { name: e.name || e.config_name, stage: st === 'stage1' ? 1 : 2, hash: e.config_hash, primary: r4(e.metrics.primary.mean), se: r4(e.metrics.primary.se), r2000: r4(e.metrics.r2000.mean), auc: r4(e.metrics.auc.mean), file_r10: r4(e.metrics.file_r10.mean), cfg: e.cfg });
  }
}
const row = (arm, name) => { const r = tab[arm].get(name); if (!r) throw new Error('missing ' + arm + ' ' + name); return r; };
function factor(arm, title, base, levels, note) {
  const b = row(arm, base);
  const lv = levels.map(([label, name]) => { const r = row(arm, name); return { level: label, configuration: name, primary: r.primary, se: r.se, change_from_base: r.primary == null || b.primary == null ? null : r4(r.primary - b.primary), file_recall_at_10: r.primary == null ? r.file_r10 : undefined }; });
  const ps = lv.map((x) => x.primary).filter((x) => x != null);
  return { factor: title, arm, base: { configuration: base, primary: b.primary, se: b.se }, levels: lv, range: r4(Math.max(...ps) - Math.min(...ps)), note: note || null };
}
const T = 'relational';
out.typed_base = { configuration: 'base', description: '2 hops, both directions, the 8 base edge classes (structure, imports, calls, http, tests, data, config, history), personalised PageRank with restart 0.30 and co-change weight 1, no hub cut, file granularity, signature form, no padding, minimum edge confidence 0.5', primary: row(T, 'base').primary, se: row(T, 'base').se };
out.typed_frozen = { configuration: 's2: hops=null rank=degnorm', description: 'unbounded hops, both directions, base edge classes, degree-normalised ranking, file granularity, signature form, no padding', primary: row(T, 's2: hops=null rank=degnorm').primary, se: row(T, 's2: hops=null rank=degnorm').se };
out.factors = [
  factor(T, 'hop depth (personalised PageRank ranking)', 'base', [['1 hop', 'hops=1'], ['2 hops (base)', 'base'], ['3 hops', 'hops=3'], ['4 hops', 'hops=4'], ['6 hops', 'hops=6'], ['unbounded', 'hops=null']], 'The largest single factor. Deeper reach lets the ranking fill the 8,000-token answer with more candidates.'),
  factor(T, 'ranking mode at the base depth (2 hops)', 'base', [['traversal order', 'rank=bfs'], ['degree-normalised', 'rank=degnorm'], ['PageRank restart 0.15', 'rank=ppr r0.15'], ['PageRank restart 0.30 (base)', 'base'], ['PageRank restart 0.50', 'rank=ppr r0.50'], ['PageRank co-change weight 3', 'rank=ppr w3'], ['co-change weight', 'rank=cochange'], ['text match', 'rank=text'], ['hybrid PageRank + text', 'rank=hybrid ppr+text'], ['hybrid traversal + co-change + text', 'rank=hybrid bfs+cochange+text']], 'At 2 hops the ranking mode barely matters: every mode is within 0.014 of the base.'),
  factor(T, 'ranking mode at unbounded depth', 'hops=null', [['PageRank restart 0.30', 'hops=null'], ['degree-normalised (frozen primary)', 's2: hops=null rank=degnorm'], ['PageRank restart 0.50', 's2: hops=null rank=ppr r0.50'], ['PageRank co-change weight 3', 's2: hops=null rank=ppr w3'], ['co-change weight', 's2: hops=null rank=cochange'], ['hybrid PageRank + co-change', 's2: hops=null rank=hybrid ppr+cochange'], ['hybrid degree-normalised + co-change', 's2: hops=null rank=hybrid degnorm+cochange'], ['hybrid PageRank + text', 's2: hops=null rank=hybrid ppr+text'], ['weighted shortest path (SQL)', 's2: hops=null rank=x_wsp (SQL)']], 'At unbounded depth the ranking mode moves the primary by at most 0.023.'),
  factor(T, 'direction', 'base', [['both (base)', 'base'], ['dependents only', 'dir=dependents'], ['dependencies only', 'dir=dependencies']], 'Following edges one way only loses about 0.2.'),
  factor(T, 'hub cut at the base depth', 'base', [['none (base)', 'base'], ['in-degree over 5 cut', 'hub=indeg>5'], ['in-degree over 10 cut', 'hub=indeg>10'], ['transport nodes excluded', 'hub=transport']]),
  factor(T, 'hub cut at unbounded depth', 'hops=null', [['none', 'hops=null'], ['in-degree over 15 cut', 's2: hops=null hub=indeg>15'], ['transport nodes excluded', 's2: hops=null hub=transport']]),
  factor(T, 'output form and granularity (base depth)', 'base', [['file, signature lines (base)', 'base'], ['file, source snippet', 'form=snippet'], ['symbol, signature lines', 'gran=symbol'], ['symbol, source snippet', 'gran=symbol form=snippet'], ['file, paths only (no primary)', 'form=paths'], ['symbol, paths only (no primary)', 'gran=symbol form=paths']], 'Snippets spend the budget on source text and reach far fewer files. Paths-only forms show no content and are scored on file ranking only (file recall at 10 shown).'),
  factor(T, 'granularity at unbounded depth', 'hops=null', [['file', 'hops=null'], ['symbol', 's2: hops=null gran=symbol']]),
  factor(T, 'padding tail at the base depth', 'base', [['none (base)', 'base'], ['same directory (DIR)', 'pad=DIR'], ['co-change order (CO)', 'pad=CO']], 'Padding fills the budget left over at 2 hops; at unbounded depth the ranked list already fills it.'),
  factor(T, 'padding tail at deeper reach', 'hops=null', [['unbounded, none', 'hops=null'], ['unbounded, CO', 's2: hops=null pad=CO'], ['3 hops, CO', 's2: hops=3 pad=CO'], ['4 hops, CO', 's2: hops=4 pad=CO']]),
  factor(T, 'edge classes (base depth)', 'base', [['structure + imports', 'classes=structure+imports'], ['+ calls', 'classes=structure+imports+calls'], ['+ http', 'classes=structure+imports+calls+http'], ['+ tests', 'classes=structure+imports+calls+http+tests'], ['+ data + config (all code classes, no history)', 'classes=structure+imports+calls+http+tests+data+config'], ['+ history = base', 'base'], ['base + capability', 'classes=base+capability'], ['base + capability + docs', 'classes=base+capability+docs'], ['base + capability + docs + membership', 'classes=base+capability+docs+membership']], 'Adding the history class (co-change edges) moved the primary by 0.056, more than any single code class.'),
  factor(T, 'edge confidence threshold (base depth)', 'base', [['0', 'minConf=0'], ['0.5 (base)', 'base'], ['1', 'minConf=1']]),
  factor(T, 'traversal mode (base ranking)', 'base', [['2 hops (base)', 'base'], ['per-class hop budget B1', 'budget=B1'], ['per-class hop budget B2', 'budget=B2'], ['ordered metapath definitions > code > tests', 'metapath=defs>code1-2>tests']]),
];
const SA = 'search';
out.search_base = { configuration: 'base', description: 'two rounds of text search for the seed names, module path and route strings; import lines of the seed followed; no BM25; no padding; file granularity; signature form', primary: row(SA, 'base').primary, se: row(SA, 'base').se };
out.search_factors = [
  factor(SA, 'rounds of search', 'base', [['1 round', 'rounds=1'], ['2 rounds (base)', 'base'], ['3 rounds', 'rounds=3']]),
  factor(SA, 'BM25 ranking', 'base', [['no BM25 (base)', 'base'], ['BM25 added', 'bm25'], ['BM25, top 20', 'bm25 top=20'], ['BM25, top 100', 'bm25 top=100'], ['BM25 only', 'bm25only'], ['BM25 k1 0.9, b 0.4', 'bm25 k1=0.9 b=0.4']]),
  factor(SA, 'following imports', 'base', [['seed imports followed (base)', 'base'], ['seed imports not followed', 'seedImports=off'], ['symbol granularity', 'gran=symbol'], ['symbol granularity + follow imports of hits', 'gran=symbol followImports']]),
  factor(SA, 'route strings and name spellings', 'base', [['on (base)', 'base'], ['routes off', 'routes=off'], ['spellings off', 'spellings=off']]),
  factor(SA, 'padding tail', 'base', [['none (base)', 'base'], ['same directory (DIR)', 'pad=DIR'], ['co-change order (CO)', 'pad=CO']], 'The padding tail is the largest factor for search: the co-change tail adds 0.237.'),
  factor(SA, 'with the CO tail (stage 2)', 'pad=CO', [['CO, 2 rounds', 'pad=CO'], ['CO, 1 round', 'pad=CO rounds=1'], ['CO, 1 round, routes off (frozen primary)', 'pad=CO rounds=1 routes=off'], ['CO, co-change fused (RRF), 1 round (S2, best form)', 'pad=CO co rrf rounds=1'], ['CO, BM25', 'pad=CO bm25'], ['CO, 3 rounds', 'pad=CO rounds=3']]),
  factor(SA, 'output form', 'base', [['signature (base)', 'base'], ['snippet', 'form=snippet']]),
];
out.search_best_without_padding = (() => { const r = [...tab.search.values()].filter((x) => x.cfg && (x.cfg.pad || 'none') === 'none' && x.primary != null).sort((a, b) => b.primary - a.primary)[0]; return { configuration: r.name, primary: r.primary, se: r.se }; })();
// engine-native rows of each graph arm against its base (stage 1, 2 hops) and against unbounded depth (stage 2)
const nativeRows = (arm) => [...tab[arm].values()].filter((x) => /native/.test(x.name)).map((x) => ({ configuration: x.name, stage: x.stage, primary: x.primary, se: x.se, compared_with: /hops=null/.test(x.name) ? 'unbounded PageRank (hops=null) ' + row(arm, 'hops=null').primary : 'base (2 hops) ' + row(arm, 'base').primary, change: r4(x.primary - (/hops=null/.test(x.name) ? row(arm, 'hops=null').primary : row(arm, 'base').primary)) })).sort((a, b) => b.primary - a.primary);
out.native = { ladybug: nativeRows('ladybug'), duckpgq: nativeRows('duckpgq'), frozen_primary_for_reference: row(T, 's2: hops=null rank=degnorm').primary, note: 'Best engine-native row per graph arm: LadybugDB personalised PageRank fused with its stored Louvain community prior (unbounded) 0.7862, 0.0009 above the frozen shared-specification primary 0.7853; DuckPGQ PageRank-lifted personalised PageRank (unbounded) 0.7829. In the LadybugDB row the PageRank iterations run in application code; only the community grouping comes from the engine.' };
out.floors = ['floor-dir', 'floor-co'].map((a) => ({ arm: a, rows: [...tab[a].values()].map((x) => ({ configuration: x.name, primary: x.primary, se: x.se })) }));
out.counts = Object.fromEntries(Object.entries(tab).map(([a, m]) => [a, m.size]));
out.factor_summary = [...out.factors, ...out.search_factors].map((f) => ({ arm: f.arm, factor: f.factor, moved_primary_by: f.range }));

// ---------- identity counts on TUNE (computed here) ----------
const tuneAns = (arm, hash, set) => { const f = path.join(B, 'results', arm, 'tune', hash + '.' + set + '.jsonl.gz'); return fs.existsSync(f) ? new Map(gz(f).map((a) => [a.id, a])) : null; };
const shownKey = (a) => JSON.stringify([a.seeds, a.seed_match, a.items, a.budgets]);
const packedKey = (a) => JSON.stringify([a.seeds, a.seed_match, a.n_ranked, a.ranked_sha, a.n_units, a.n_head, a.items, a.budgets, a.beyond_sample]);
out.identity_tuning = {};
for (const [name, hash] of [['primary 95e990307da3b42b', '95e990307da3b42b'], ['S1 6b70cc1222745385', '6b70cc1222745385']]) {
  const res = {};
  for (const other of ['ladybug', 'duckpgq', 'reference']) {
    let n = 0, shown = 0, packed = 0, missing = false;
    for (const set of ['T1', 'T1x', 'T2']) { const A = tuneAns('relational', hash, set); const O = tuneAns(other, hash, set); if (!A || !O) { missing = true; continue; } for (const [id, a] of A) { const o = O.get(id); n++; if (o && shownKey(a) === shownKey(o)) shown++; if (o && packedKey(a) === packedKey(o)) packed++; } }
    res['relational_vs_' + other] = missing && !n ? 'no stored tuning answers for this configuration in that arm' : { tasks: n, shown_identical: shown, full_record_identical: packed };
  }
  out.identity_tuning[name] = res;
}
const tqT = Object.fromEntries(['relational', 'ladybug', 'duckpgq'].map((a) => [a, jl(path.join(B, 'results/tq', a + '.tune.answers.jsonl'))]));
out.identity_tuning.questions_tune = Object.fromEntries(['ladybug', 'duckpgq'].map((a) => [a, { questions: tqT[a].length, identical_to_relational: tqT[a].filter((x) => JSON.stringify(x.answer) === JSON.stringify(tqT.relational.find((y) => y.id === x.id).answer)).length }]));
out.identity_tuning.recorded_in_stage_notes = ['Relational against LadybugDB: 44 shared configurations over stages 1 and 2, all 33,968 tuning answers identical.', 'Relational against DuckPGQ: 44 shared configurations, 33,962 of 33,968 identical; the other 6 answers differ only by one stored score at the twelfth decimal (0.01059323928 against 0.010593239279); items and order identical.', 'The configuration first chosen (S1, 4 hops): 772 tuning answers identical across relational, reference, LadybugDB and DuckPGQ (2,316 of 2,316 comparisons).', 'After the pre-flight code changes, all 80 stored tuning question answers and 390 sampled tuning task answers were reproduced exactly (addendum 5 item 4).'];
const tq = (a) => JSON.parse(fs.readFileSync(path.join(G, 'stage2/tq', a + '.tq.json'), 'utf8'));
out.questions_tuning = { questions: 20, typed_macro_f1: r4(tq('relational').all.macro.f1), search_macro_f1: r4(tq('search').all.macro.f1), typed_mean_tokens: r4(tq('relational').all.tokens_mean), search_mean_tokens_read: r4(tq('search').all.tokens_mean) };

// ---------- worked examples (TUNE only) ----------
const refs = S.readRefs(path.join(G, 'refs_tune.jsonl'));
const refRaw = new Map(jl(path.join(G, 'refs_tune.jsonl')).map((r) => [r.id, r]));
const FZ = { typed: ['relational', '95e990307da3b42b', 'stage2'], search: ['search', 'e70177e5807f0252', 'stage2'], fco: ['floor-co', 'c4d2f0a60a3d199c', 'stage1'] };
const perT = {};
for (const [k, [arm, h, st]] of Object.entries(FZ)) { perT[k] = new Map(); for (const r of gz(path.join(G, st, arm + '.tasks.jsonl.gz'))) if (r.config_hash === h && r.set === 'T1') perT[k].set(r.id, r); }
const cand = [...perT.typed.keys()].filter((id) => { const u = refs.get(id).files.length + refs.get(id).defs.length; return u >= 3 && u <= 8; }).sort();
const med = (arr) => arr[(arr.length - 1) >> 1];
const g1 = cand.filter((id) => perT.typed.get(id).r8000 - perT.search.get(id).r8000 >= 0.3).sort((a, b) => (perT.typed.get(a).r8000 - perT.search.get(a).r8000) - (perT.typed.get(b).r8000 - perT.search.get(b).r8000) || (a < b ? -1 : 1));
const g2 = cand.filter((id) => { const t = perT.typed.get(id).r8000; return t === perT.search.get(id).r8000 && t === perT.fco.get(id).r8000 && t > 0 && t < 1; }).sort((a, b) => (refs.get(a).files.length + refs.get(a).defs.length) - (refs.get(b).files.length + refs.get(b).defs.length) || (a < b ? -1 : 1));
const g3 = cand.filter((id) => Math.max(perT.search.get(id).r8000, perT.fco.get(id).r8000) - perT.typed.get(id).r8000 >= 0.3).sort((a, b) => (Math.max(perT.search.get(a).r8000, perT.fco.get(a).r8000) - perT.typed.get(a).r8000) - (Math.max(perT.search.get(b).r8000, perT.fco.get(b).r8000) - perT.typed.get(b).r8000) || (a < b ? -1 : 1));
out.examples_rule = 'From the 388 TUNE T1 tasks whose reference has 3 to 8 units (files plus definitions), so that an example fits on the page: (1) typed clearly beats search = typed recall minus search recall at 8,000 tokens of at least 0.30; (2) tie = typed, search and the co-change floor all have the same recall, strictly between 0 and 1; (3) search or the co-change floor beats typed = the better of the two minus typed of at least 0.30. In each group the tasks are sorted by that difference (for the tie, by reference size), then by task id, and the median task is taken (the lower one when the count is even). Never held-out.';
out.examples_group_sizes = { candidates: cand.length, typed_beats_search: g1.length, tie: g2.length, search_or_floor_beats_typed: g3.length };
function shownFiles(a, ref) {
  const bb = a.budgets['8000'] || a.budgets[8000]; const list = [];
  const push = (it, shown, pathShown) => {
    const defs = []; ref.defs.forEach((d, j) => { if (it.path === d.path && shown && shown.some((l) => l >= d.start && l <= d.end)) defs.push(j); });
    list.push({ path: it.path, padding: !!it.pad, file_hit: pathShown && ref.files.includes(it.path), definitions_credited: defs.map((j) => ref.defs[j].name), lines_shown: shown ? shown.length : 0, cut: !pathShown || it === null ? undefined : undefined });
  };
  for (let i = 0; i < bb.n_full; i++) push(a.items[i], a.items[i].shown, true);
  if (bb.cut && a.items[bb.n_full]) { const ps = bb.cut.path_shown !== undefined ? bb.cut.path_shown : !!(bb.cut.shown && bb.cut.shown.length); if (ps) { push(a.items[bb.n_full], bb.cut.shown, true); list[list.length - 1].cut_at_budget = true; } }
  return { tokens_used: bb.used, files_shown: list.length, items: list.map((x) => ({ path: x.path, hit: x.file_hit || x.definitions_credited.length > 0, file_hit: x.file_hit, definitions_credited: x.definitions_credited, padding: x.padding, cut_at_budget: !!x.cut_at_budget })) };
}
const LAB = { typed: 'typed primary (unbounded hops, degree-normalised)', search: 'scripted search primary (1 round, routes off, co-change tail)', fco: 'co-change floor' };
out.examples = [['typed store clearly beats search', g1], ['tie', g2], ['search or a floor beats the typed store', g3]].map(([title, g]) => {
  const id = med(g); const ref = refs.get(id); const raw = refRaw.get(id);
  const ex = { title, task: id, split: 'tuning', group_size: g.length, seed: { path: raw.seed.path, symbol: raw.seed.symbol ? raw.seed.symbol.name : null, symbol_kind: raw.seed.symbol ? raw.seed.symbol.kind : null }, commit_changed_files_total: raw.commit_n_files_all, reference: { files: ref.files, definitions: ref.defs.map((d) => d.path + '::' + d.name), units: ref.files.length + ref.defs.length }, arms: {} };
  for (const k of ['typed', 'search', 'fco']) {
    const [arm, h] = FZ[k]; const a = tuneAns(arm, h, 'T1').get(id); const sf = shownFiles(a, ref);
    const credited = new Set(); sf.items.forEach((x) => { if (x.file_hit) credited.add('f:' + x.path); x.definitions_credited.forEach((n) => credited.add('d:' + n)); });
    const my = credited.size / (ref.files.length + ref.defs.length);
    ex.arms[k] = { label: LAB[k], recall_at_8000: r4(perT[k].get(id).r8000), recall_recomputed_here: r4(my), recall_agrees: Math.abs(my - perT[k].get(id).r8000) < 1e-9, reference_files_found: ref.files.filter((p) => sf.items.some((x) => x.path === p && x.file_hit)), reference_definitions_found: [...new Set(sf.items.flatMap((x) => x.definitions_credited))], ...sf };
  }
  return ex;
});

fs.writeFileSync(path.join(V2, 'tuning.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out.factor_summary)); console.log(JSON.stringify(out.identity_tuning)); console.log(JSON.stringify(out.examples_group_sizes));
for (const e of out.examples) console.log(e.title, e.task, JSON.stringify(e.seed), e.reference.units, Object.entries(e.arms).map(([k, v]) => k + ' ' + v.recall_at_8000 + '/' + v.recall_recomputed_here + ' ' + v.files_shown).join(' | '));
console.log(JSON.stringify(out.native)); console.log(JSON.stringify(out.search_best_without_padding), JSON.stringify(out.questions_tuning));
