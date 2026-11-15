'use strict';
// Checks 2-4 for the tuning-side numbers: the tuning sweep against the stage tables, frozen configurations against
// selection_v2.json, tuning identity and tuning questions recomputed from stored tuning answers, and the three worked examples
// re-selected by the stated rule and re-scored from the stored tuning answers with my own credit code.
const L = require('./lib.js');
const { fs, path, B, OUT, gz, jl, mean, median, r4, refTU, refHO, runtimeOf, shownItems, creditUnits, clusterMeans } = L;
const D = JSON.parse(fs.readFileSync(path.join(B, 'sealed/grader/heldout/v2/data.json'), 'utf8'));
const res = { checked: 0, ok: 0, mismatches: [], untraced: [], notes: [] };
const covered = new Set();
function cmp(p, dv, mv, kind = 'pt') { covered.add(p); res.checked++; if (mv === undefined) { res.untraced.push({ path: p, data: dv }); return; } let ok; if (dv === null || mv === null) ok = dv === mv; else if (kind === 'int' || kind === 'str') ok = dv === mv; else ok = Math.abs(dv - mv) <= 0.00006; if (ok) res.ok++; else res.mismatches.push({ path: p, data: dv, expected: kind === 'pt' && typeof mv === 'number' ? r4(mv) : mv }); }
// ---------- stage tables ----------
const TBL = {}; // arm -> name -> {primary, se, stage}
for (const st of ['stage1', 'stage2']) for (const a of ['relational', 'ladybug', 'duckpgq', 'search', 'floor-dir', 'floor-co']) {
  const f = path.join(B, 'sealed/grader', st, a + '.summary.json'); if (!fs.existsSync(f)) continue;
  for (const s of JSON.parse(fs.readFileSync(f, 'utf8'))) if (s.set === 'T1') { (TBL[a] = TBL[a] || {})[s.name] = { primary: s.metrics && s.metrics.primary ? s.metrics.primary.mean : null, se: s.metrics && s.metrics.primary ? s.metrics.primary.se : null, stage: st, hash: s.config_hash, clusters: s.clusters }; }
}
const look = (arm, name) => (TBL[arm] || {})[name];
const T = D.tuning;
function lvl(p, arm, x, base) { const t = look(arm, x.configuration); if (!t) { res.untraced.push({ path: p, configuration: x.configuration, arm }); return null; } cmp(p + '.primary', x.primary, t.primary); cmp(p + '.se', x.se, t.se); if (x.n_commits !== undefined) cmp(p + '.n_commits', x.n_commits, t.clusters, 'int'); if (x.change_from_base !== undefined) cmp(p + '.change_from_base', x.change_from_base, t.primary == null ? null : t.primary - base); return t; }
const tb = lvl('tuning.typed_base', 'relational', T.typed_base, 0); lvl('tuning.typed_frozen', 'relational', T.typed_frozen, 0);
for (const [i, f] of T.factors.entries()) { const b = lvl(`tuning.factors[${i}].base`, f.arm, f.base, 0); const ps = []; for (const [j, x] of f.levels.entries()) { const t = lvl(`tuning.factors[${i}].levels[${j}]`, f.arm, x, b ? b.primary : 0); if (t && t.primary != null) ps.push(t.primary); } cmp(`tuning.factors[${i}].range`, f.range, ps.length ? Math.max(...ps) - Math.min(...ps) : null); }
const sb = lvl('tuning.search_base', 'search', T.search_base, 0); lvl('tuning.search_best_without_padding', 'search', T.search_best_without_padding, 0);
for (const [i, f] of T.search_factors.entries()) { const b = lvl(`tuning.search_factors[${i}].base`, f.arm, f.base, 0); const ps = []; for (const [j, x] of f.levels.entries()) { const t = lvl(`tuning.search_factors[${i}].levels[${j}]`, f.arm, x, b ? b.primary : 0); if (t && t.primary != null) ps.push(t.primary); } cmp(`tuning.search_factors[${i}].range`, f.range, ps.length ? Math.max(...ps) - Math.min(...ps) : null); }
const unb = look('relational', 'hops=null');
for (const a of ['ladybug', 'duckpgq']) for (const [i, x] of T.native[a].entries()) { const t = lvl(`tuning.native.${a}[${i}]`, a, x, 0); if (t) { cmp(`tuning.native.${a}[${i}].change`, x.change, t.primary - look(a, /^base/.test(x.compared_with) ? 'base' : 'hops=null').primary); cmp(`tuning.native.${a}[${i}].compared_with value`, +x.compared_with.split(' ').pop(), look(a, /^base/.test(x.compared_with) ? 'base' : 'hops=null').primary); cmp(`tuning.native.${a}[${i}].stage`, x.stage, +t.stage.slice(-1), 'int'); } }
cmp('tuning.native.frozen_primary_for_reference', T.native.frozen_primary_for_reference, look('relational', 's2: hops=null rank=degnorm').primary);
// is each native list the full set of engine-native configurations? (count configurations whose name contains "native")
for (const a of ['ladybug', 'duckpgq']) res.notes.push(`${a}: data lists ${T.native[a].length} native rows; the tables hold ${Object.keys(TBL[a]).filter((n) => /native/.test(n)).length} configurations whose name contains "native"; best native in tables ${r4(Math.max(...Object.entries(TBL[a]).filter(([n]) => /native/.test(n)).map(([, v]) => v.primary || 0)))}`);
for (const [i, f] of T.floors.entries()) for (const [j, x] of f.rows.entries()) lvl(`tuning.floors[${i}].rows[${j}]`, f.arm, x, 0);
for (const [a, n] of Object.entries(T.counts)) cmp('tuning.counts.' + a, n, Object.keys(TBL[a] || {}).length, 'int');
for (const [i, f] of T.factor_summary.entries()) { const src = [...T.factors, ...T.search_factors].find((x) => x.arm === f.arm && x.factor === f.factor); cmp(`tuning.factor_summary[${i}].moved_primary_by`, f.moved_primary_by, src ? src.range : undefined); }
cmp('tuning.n_commits', T.n_commits, 65, 'int'); cmp('tuning.n_tasks_T1', T.n_tasks_T1, [...refTU.values()].filter((r) => r.set === 'T1').length, 'int');
// ---------- frozen configurations against selection_v2.json and the tables ----------
const SEL = JSON.parse(fs.readFileSync(path.join(B, 'sealed/grader/selection_v2.json'), 'utf8'));
const CX = (h) => { for (const [a, v] of Object.entries(SEL.arms)) { const all = JSON.stringify(v); if (all.includes(h)) { const c = v.chosen && v.chosen.config_hash === h ? v.chosen : null; return { arm: a, chosen: c, v }; } } return null; };
const findByHash = (h) => { for (const [a, t] of Object.entries(TBL)) for (const [n, v] of Object.entries(t)) if (v.hash === h) return { arm: a, name: n, ...v }; return null; };
const complexity = require(path.join(B, 'sealed/grader/complexity.js'));
for (const [i, f] of D.frozen_configurations.entries()) {
  const t = findByHash(f.hash); cmp(`frozen_configurations[${i}].tune_primary`, f.tune_primary, t ? t.primary : undefined);
  const c = CX(f.hash); let cx; const sv = JSON.stringify(SEL.arms);
  // complexity: from selection_v2 chosen records, or the s1/s2 records named in it
  const m = sv.match(new RegExp('"config_hash":"' + f.hash + '"[^}]*?"complexity":(\\d+)')) || sv.match(new RegExp('"complexity":(\\d+)[^{}]*?"config_hash":"' + f.hash + '"'));
  if (m) cx = +m[1];
  cmp(`frozen_configurations[${i}].complexity`, f.complexity, cx);
}
// ---------- identity on tuning, recomputed from the stored tuning answers ----------
const shownSig = (a) => JSON.stringify([a.items.map((i) => [i.path, i.shown, i.score]), a.budgets]);
const fullSig = (a) => JSON.stringify([a.items, a.budgets, a.ranked_sha, a.n_ranked, a.beyond_sample, a.seeds]);
const id = {};
for (const h of ['95e990307da3b42b', '6b70cc1222745385']) { id[h] = {};
  const load = (arm) => { const m = new Map(); for (const s of ['T1', 'T1x', 'T2']) { const f = path.join(B, 'results', arm, 'tune', `${h}.${s}.jsonl.gz`); if (!fs.existsSync(f)) return null; for (const a of gz(f)) m.set(s + a.id, a); } return m; };
  const R = load('relational');
  for (const o of ['ladybug', 'duckpgq', 'reference']) { const O = load(o); if (!O) { id[h][o] = 'no tuning answers'; continue; } let n = 0; let sh = 0; let fu = 0; for (const [k, a] of R) { const b = O.get(k); if (!b) continue; n++; if (shownSig(a) === shownSig(b)) sh++; if (fullSig(a) === fullSig(b)) fu++; } id[h][o] = { tasks: n, shown_identical: sh, full_record_identical: fu }; }
}
const IT = D.identity.tuning;
for (const [hk, h] of [['primary 95e990307da3b42b', '95e990307da3b42b'], ['S1 6b70cc1222745385', '6b70cc1222745385']]) for (const o of ['ladybug', 'duckpgq', 'reference']) { const d = IT[hk]['relational_vs_' + o]; const m = id[h][o]; const p = `identity.tuning.${hk}.relational_vs_${o}`;
  if (typeof d === 'string') { cmp(p, typeof m === 'string' ? 1 : 0, 1, 'int'); continue; } for (const f of ['tasks', 'shown_identical', 'full_record_identical']) cmp(`${p}.${f}`, d[f], m[f], 'int'); cmp(`${p}.n_commits`, d.n_commits, 65, 'int'); }
// the copy under tuning.identity_tuning must equal identity.tuning
cmp('tuning.identity_tuning (equals identity.tuning)', JSON.stringify(T.identity_tuning) === JSON.stringify(Object.fromEntries(Object.entries(D.identity.tuning).filter(([k]) => k !== 'source'))) ? 1 : 0, 1, 'int');
// ---------- questions on tuning ----------
const qref = new Map(jl(path.join(B, 'sealed/tq_reference.jsonl')).filter((r) => r.split === 'tune').map((r) => [r.id, r]));
const qa = {}; for (const a of ['relational', 'ladybug', 'duckpgq', 'search']) qa[a] = new Map(jl(path.join(B, 'results/tq', a + '.tune.answers.jsonl')).map((x) => [x.id, x]));
function items(x) { if (Array.isArray(x)) return x.map((v) => String(v).trim()); const o = []; for (const k of Object.keys(x || {})) for (const v of x[k] || []) o.push(k + '\u0001' + String(v).trim()); return o; }
function f1(answer, r) { const isObj = !Array.isArray(r.answer); const al = r.accept_aliases || {}; const a = [...new Set(items(answer))]; const R = [...new Set(items(r.answer))]; const hit = new Set(); let tp = 0; for (const x of a) { const m = R.find((y) => { const [yk, yv] = isObj ? y.split('\u0001') : [0, y]; const [xk, xv] = isObj ? x.split('\u0001') : [0, x]; return yk === xk && (xv === yv || (al[yv] || []).includes(xv)); }); if (m) { tp++; hit.add(m); } } if (!a.length && !R.length) return 1; if (!R.length) return 0; const p = a.length ? tp / a.length : 0; const rc = hit.size / R.length; return p + rc ? 2 * p * rc / (p + rc) : 0; }
const qids = [...qref.keys()];
const QT = D.questions.tuning;
cmp('questions.tuning.questions', QT.questions, qids.length, 'int');
cmp('questions.tuning.typed_macro_f1', QT.typed_macro_f1, mean(qids.map((i) => f1(qa.relational.get(i).answer, qref.get(i)))));
cmp('questions.tuning.search_macro_f1', QT.search_macro_f1, mean(qids.map((i) => f1(qa.search.get(i).answer, qref.get(i)))));
cmp('questions.tuning.typed_mean_tokens', QT.typed_mean_tokens, mean(qids.map((i) => qa.relational.get(i).tokens)));
cmp('questions.tuning.search_mean_tokens_read', QT.search_mean_tokens_read, mean(qids.map((i) => qa.search.get(i).tokens)));
const tq = T.questions_tuning; for (const [k, v] of Object.entries(tq)) if (QT[{ questions: 'questions', typed_macro_f1: 'typed_macro_f1', search_macro_f1: 'search_macro_f1', typed_mean_tokens: 'typed_mean_tokens', search_mean_tokens_read: 'search_mean_tokens_read' }[k]] !== undefined) cmp('tuning.questions_tuning.' + k, v, QT[k]);
for (const a of ['ladybug', 'duckpgq']) { const n = qids.filter((i) => JSON.stringify(qa[a].get(i).answer) === JSON.stringify(qa.relational.get(i).answer)).length; cmp(`identity.tuning.questions_tune.${a}.identical_to_relational`, IT.questions_tune[a].identical_to_relational, n, 'int'); cmp(`identity.tuning.questions_tune.${a}.questions`, IT.questions_tune[a].questions, qids.length, 'int'); }
fs.writeFileSync(path.join(OUT, 'e_tuning.json'), JSON.stringify({ ...res, identity_recomputed: id, covered: [...covered] }, null, 1));
console.log('checked', res.checked, 'ok', res.ok, 'mismatches', res.mismatches.length, 'untraced', res.untraced.length);
for (const m of res.mismatches) console.log('MISMATCH', JSON.stringify(m)); for (const m of res.untraced) console.log('UNTRACED', JSON.stringify(m)); for (const n of res.notes) console.log('NOTE', n);
console.log(JSON.stringify(id));
