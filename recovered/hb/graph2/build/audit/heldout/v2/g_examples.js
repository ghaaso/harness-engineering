'use strict';
// Check 4 (worked examples re-selected by the stated rule and re-scored from stored tuning answers) and the held-out
// identity block of data.json (recomputed from the stored held-out answers).
const L = require('./lib.js');
const { fs, path, B, OUT, gz, refTU, refHO, r4 } = L;
const D = JSON.parse(fs.readFileSync(path.join(B, 'sealed/grader/heldout/v2/data.json'), 'utf8'));
const res = { checked: 0, ok: 0, mismatches: [], notes: [] };
function cmp(p, dv, mv) { res.checked++; const ok = typeof dv === 'number' && typeof mv === 'number' ? Math.abs(dv - mv) <= 0.00006 : JSON.stringify(dv) === JSON.stringify(mv); if (ok) res.ok++; else res.mismatches.push({ path: p, data: dv, expected: mv }); }
// ---------- re-score tuning T1 answers of three frozen configurations ----------
const F = { typed: ['relational', '95e990307da3b42b'], search: ['search', 'e70177e5807f0252'], fco: ['floor-co', 'c4d2f0a60a3d199c'] };
const A = {}; for (const [k, [arm, h]] of Object.entries(F)) A[k] = new Map(gz(path.join(B, 'results', arm, 'tune', h + '.T1.jsonl.gz')).map((a) => [a.id, a]));
function detail(rec, ref) {
  const b = rec.budgets['8000']; const n = b.n_full + (b.cut ? 1 : 0); const fileSet = new Set(ref.files.map((f) => f.path)); const credited = new Set(); const filesFound = new Set();
  const items = [];
  for (let k = 0; k < n; k++) { const it = rec.items[k]; const cut = k === b.n_full; const shown = cut ? b.cut.shown : it.shown; const pathShown = cut ? b.cut.path_shown : true;
    const fh = pathShown && fileSet.has(it.path); if (fh) filesFound.add(it.path);
    const defs = ref.defs.filter((d) => d.path === it.path && (shown || []).some((l) => l >= d.start && l <= d.end)).map((d) => d.name);
    defs.forEach((x) => credited.add(it.path + '::' + x));
    items.push({ path: it.path, hit: fh || defs.length > 0, file_hit: fh, definitions_credited: defs, padding: !!it.pad, cut_at_budget: cut }); }
  const u = ref.files.length + ref.defs.length;
  return { recall: (filesFound.size + credited.size) / u, items, files_found: [...filesFound], defs_found: [...credited].map((x) => x.split('::').pop()), tokens: b.used, n_items: n };
}
const rows = [];
for (const [id, ref] of refTU) { if (ref.set !== 'T1') continue; const u = ref.files.length + ref.defs.length; if (u < 3 || u > 8) continue;
  const r = {}; for (const k of Object.keys(F)) r[k] = L.creditUnits(L.shownItems(A[k].get(id), 8000), ref) / u; rows.push({ id, u, ...r }); }
const g1 = rows.filter((r) => r.typed - r.search >= 0.30 - 1e-12);
const g2 = rows.filter((r) => Math.abs(r.typed - r.search) < 1e-12 && Math.abs(r.typed - r.fco) < 1e-12 && r.typed > 0 && r.typed < 1);
const g3 = rows.filter((r) => Math.max(r.search, r.fco) - r.typed >= 0.30 - 1e-12);
const med = (arr) => arr[Math.floor((arr.length - 1) / 2)];
const pickBy = (arr, f, dir) => med([...arr].sort((x, y) => dir * (f(x) - f(y)) || (x.id < y.id ? -1 : 1)));
const sel = { g1_asc: pickBy(g1, (r) => r.typed - r.search, 1), g1_desc: pickBy(g1, (r) => r.typed - r.search, -1), g2_asc: pickBy(g2, (r) => r.u, 1), g2_desc: pickBy(g2, (r) => r.u, -1), g3_asc: pickBy(g3, (r) => Math.max(r.search, r.fco) - r.typed, 1), g3_desc: pickBy(g3, (r) => Math.max(r.search, r.fco) - r.typed, -1) };
res.selection = { candidates: rows.length, sizes: [g1.length, g2.length, g3.length], chosen: Object.fromEntries(Object.entries(sel).map(([k, v]) => [k, v.id])), g1: g1.map((r) => [r.id, r4(r.typed - r.search)]), g3: g3.map((r) => [r.id, r4(Math.max(r.search, r.fco) - r.typed)]) };
const E = D.examples;
cmp('examples.group_sizes.candidates', E.group_sizes.candidates, rows.length); cmp('examples.group_sizes.typed_beats_search', E.group_sizes.typed_beats_search, g1.length); cmp('examples.group_sizes.tie', E.group_sizes.tie, g2.length); cmp('examples.group_sizes.search_or_floor_beats_typed', E.group_sizes.search_or_floor_beats_typed, g3.length);
for (const [i, it] of E.items.entries()) {
  const p = `examples.items[${i}]`; const ref = refTU.get(it.task);
  cmp(p + '.split is tuning (task in tuning references, not held-out)', !!ref && !refHO.has(it.task), true);
  cmp(p + '.group_size', it.group_size, [g1, g2, g3][i].length);
  cmp(p + '.task chosen by rule (ascending sort)', it.task, [sel.g1_asc, sel.g2_asc, sel.g3_asc][i].id);
  cmp(p + '.seed.path', it.seed.path, ref.seed.path); cmp(p + '.seed.symbol', it.seed.symbol, ref.seed.symbol ? ref.seed.symbol.name : null);
  cmp(p + '.commit_changed_files_total', it.commit_changed_files_total, ref.commit_n_files_all);
  cmp(p + '.reference.files', it.reference.files, ref.files.map((f) => f.path)); cmp(p + '.reference.definitions', it.reference.definitions, ref.defs.map((d) => d.path + '::' + d.name)); cmp(p + '.reference.units', it.reference.units, ref.files.length + ref.defs.length);
  for (const [k, a] of Object.entries(it.arms)) { const dt = detail(A[k].get(it.task), ref); const q = `${p}.arms.${k}`;
    cmp(q + '.recall_at_8000', a.recall_at_8000, dt.recall); cmp(q + '.recall_recomputed_here', a.recall_recomputed_here, dt.recall); cmp(q + '.tokens_used', a.tokens_used, dt.tokens); cmp(q + '.files_shown', a.files_shown, dt.n_items);
    cmp(q + '.reference_files_found', [...a.reference_files_found].sort(), [...dt.files_found].sort()); cmp(q + '.reference_definitions_found', [...a.reference_definitions_found].sort(), [...dt.defs_found].sort());
    cmp(q + '.items.length', a.items.length, dt.items.length);
    let bad = 0; a.items.forEach((x, j) => { const y = dt.items[j]; if (!y || JSON.stringify([x.path, x.hit, x.file_hit, [...x.definitions_credited].sort(), x.padding, x.cut_at_budget]) !== JSON.stringify([y.path, y.hit, y.file_hit, [...y.definitions_credited].sort(), y.padding, y.cut_at_budget])) bad++; });
    res.checked += a.items.length; res.ok += a.items.length - bad; if (bad) res.mismatches.push({ path: q + '.items', bad_items: bad });
    res.notes.push(`${it.task} ${k}: recall ${r4(dt.recall)}, ${a.items.length} items marked, ${a.items.filter((x) => x.hit).length} hits`); }
}
// ---------- held-out identity ----------
const shownSig = (a) => JSON.stringify([a.items.map((i) => [i.path, i.shown, i.score, i.pad]), a.budgets]);
const fullSig = (a) => JSON.stringify([a.items, a.budgets, a.ranked_sha, a.n_ranked, a.beyond_sample, a.seeds, a.seed_match]);
const id = {}; const diffs = [];
for (const [role, h] of [['primary', '95e990307da3b42b'], ['s1', '6b70cc1222745385']]) for (const arm of ['relational', 'ladybug', 'duckpgq']) {
  let n = 0; let sh = 0; let fu = 0;
  for (const set of ['T1', 'T1x', 'T2', 'T3', 'T4']) { const R = new Map(gz(path.join(B, 'results/heldout/reference', 'crosscheck-' + h, set + '.jsonl.gz')).map((a) => [a.id, a])); for (const a of gz(path.join(B, 'results/heldout', arm, role, set + '.jsonl.gz'))) { const b = R.get(a.id); n++; if (shownSig(a) === shownSig(b)) sh++; if (fullSig(a) === fullSig(b)) fu++; else if (role === 'primary') diffs.push({ arm, set, id: a.id, ranked_sha_differs: a.ranked_sha !== b.ranked_sha, n_ranked: [a.n_ranked, b.n_ranked], shown_items: a.items.length, beyond_same: JSON.stringify(a.beyond_sample) === JSON.stringify(b.beyond_sample), eq_adjacent: a.items.slice(1).filter((x, k) => x.score === a.items[k].score).length }); } }
  id[role + ' ' + arm] = { n, shown: sh, full: fu };
}
res.identity = id; res.ranked_diffs = diffs;
const IH = D.identity.heldout;
for (const arm of ['relational', 'ladybug', 'duckpgq']) { cmp(`identity.heldout.shown_answers_identical_to_reference_arm.${arm}`, IH.shown_answers_identical_to_reference_arm[arm], `${id['primary ' + arm].shown} of ${id['primary ' + arm].n} tasks`); cmp(`identity.heldout.full_record_identical_to_reference_arm.${arm}`, IH.full_record_identical_to_reference_arm[arm], `${id['primary ' + arm].full} of ${id['primary ' + arm].n} tasks`); }
cmp('identity.heldout.s1_identical (all full-record identical)', ['relational', 'ladybug', 'duckpgq'].every((a) => id['s1 ' + a].full === 770 && id['s1 ' + a].n === 770), true);
cmp('identity.heldout.ranked_hash_differences.pairs', IH.ranked_hash_differences.pairs, diffs.length);
for (const [i, r] of IH.ranked_hash_differences.rows.entries()) { const m = diffs.find((x) => x.arm === r.arm && x.set === r.set && x.id === r.id); const p = `identity.heldout.ranked_hash_differences.rows[${i}]`; if (!m) { res.mismatches.push({ path: p, why: 'pair not found in my recount' }); continue; }
  cmp(p + '.n_ranked_arm', r.n_ranked_arm, m.n_ranked[0]); cmp(p + '.n_ranked_reference', r.n_ranked_reference, m.n_ranked[1]); cmp(p + '.shown_items', r.shown_items, m.shown_items); cmp(p + '.beyond_sample_identical', r.beyond_sample_identical, m.beyond_same); cmp(p + '.equal_adjacent_scores_in_shown_items', r.equal_adjacent_scores_in_shown_items, m.eq_adjacent); }
// distinct queries: (parent, seed file/symbol) of the 8 pairs
const qk = new Set(diffs.map((d) => { const a = gz(path.join(B, 'results/heldout', d.arm, 'primary', d.set + '.jsonl.gz')).find((x) => x.id === d.id); return a.parent + JSON.stringify(a.seeds); }));
cmp('identity.heldout.ranked_hash_differences.distinct_queries', IH.ranked_hash_differences.distinct_queries, qk.size);
fs.writeFileSync(path.join(OUT, 'g_examples.json'), JSON.stringify(res, null, 1));
console.log('checked', res.checked, 'ok', res.ok, 'mismatches', res.mismatches.length); for (const m of res.mismatches) console.log('MISMATCH', JSON.stringify(m).slice(0, 400));
console.log(JSON.stringify(res.selection)); console.log(JSON.stringify(id)); for (const n of res.notes) console.log(n);
