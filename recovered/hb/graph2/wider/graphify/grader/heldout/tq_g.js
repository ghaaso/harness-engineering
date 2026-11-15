'use strict';
// Grader, graphify held-out, step 5: G-6, the 30 held-out questions (addendum 7 item 16; descriptive).
// graphify's raw answer to `graphify query "<question text>"` on the frozen commit's graph (default
// settings, and the --budget 8000 variant) is scored against sealed/tq_reference.jsonl.
// MATCHING RULE (a reference item counts as found when):
//   file path            its full path appears in the answer as a whole path;
//   path::Name           one line of the answer holds the path and the last part of the name as a word
//                        (graphify prints a definition as `NODE <label> [src=<path> ...]`);
//   migration id "0001"  a migration file path backend/alembic/versions/0001_... appears;
//   table name           the table name appears as a whole word (no path exists for a table);
//   route "GET /api/x"   the URL path appears verbatim;
//   doc line "CLAUDE.md:L154"  one line holds CLAUDE.md and L154 (a code-only graph has no document nodes).
//   Keys of object-shaped references (real/fake, call_sites/via_bff/direct_callers, backend/web/mobile)
//   are pooled: graphify's text has no keys, so an item is found under whichever key it sits.
// ANSWER ITEMS (the denominator of precision): the distinct candidates of the reference's forms that the
//   answer names: files (src= paths; for tests_reach test files only, by the shared path rule), definitions
//   (NODE lines that are not file nodes, as (path, label)), migration files, table names of the typed facts
//   at the frozen commit, backend route paths of the typed facts, doc lines; every found reference item is
//   also an answer item. Empty-reference questions use the kind's form. Conventions of tq_score.js:
//   empty answer and empty reference -> 1/1/1; non-empty answer and empty reference -> P 0, R 1, F1 0.
// Typed (relational; LadybugDB and DuckPGQ answered identically) and scripted search are scored with
// build/arms/common/tq_score.js exactly as the finished test (judgement items kept, "with").
// Writes tq_g.json (aggregates; per-question values are grader-only in tq_g.per_question.json).
const fs = require('fs');
const path = require('path');
const G = path.resolve(__dirname, '..', '..');
const BUILD = path.resolve(G, '..', '..', 'build');
const S = require(path.join(BUILD, 'arms', 'common', 'score'));
const CMP = require(path.join(BUILD, 'arms', 'common', 'compare'));
const TQ = require(path.join(BUILD, 'arms', 'common', 'tq_score'));
const TOK = require(path.join(BUILD, 'arms', 'common', 'tokenizer'));
const OUT = __dirname;
const SEED = 20261112; const NRES = 10000;
const r4 = (x) => (x == null ? null : Math.round(x * 1e4) / 1e4);
const readJsonl = (f) => fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map(JSON.parse);
const refsAll = readJsonl(path.join(BUILD, 'sealed', 'tq_reference.jsonl')).filter((r) => r.split === 'held_out').sort((a, b) => a.id - b.id);
const TOUCHED = [24, 25, 27, 33, 40, 41, 46, 47];
const FROZEN = 'a31924a3818f4ac94b695906d107c72c912792b2';
const fnodes = readJsonl(path.join(BUILD, 'facts', 'cache', FROZEN, 'nodes.jsonl'));
const fedges = readJsonl(path.join(BUILD, 'facts', 'cache', FROZEN, 'edges.jsonl'));
const TABLES = [...new Set(fnodes.filter((n) => n.kind === 'table').map((n) => n.name))];
const ROUTES = [...new Set(fnodes.filter((n) => n.kind === 'route' && n.runtime === 'backend').map((n) => String(n.name).replace(/^[A-Z]+\s+/, '')))];
const isTest = (p) => /(^|\/)(tests|__tests__)\//.test(p) || /(^|\/)test_[^/]*\.py$/.test(p) || /\.test\.[a-z]+$/.test(p) || /(^|\/)conftest\.py$/.test(p);
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const wholePath = (text, p) => new RegExp('(^|[^A-Za-z0-9_./-])' + esc(p) + '($|[^A-Za-z0-9_./-])').test(text);
const word = (text, w) => new RegExp('(^|[^A-Za-z0-9_])' + esc(w) + '($|[^A-Za-z0-9_])').test(text);
function formOf(item) {
  const s = String(item);
  if (/^CLAUDE\.md:L\d+$/.test(s) || /\.md:L\d+$/.test(s)) return 'docline';
  if (/^\d{4}$/.test(s)) return 'migration';
  if (/^[A-Z]+ \//.test(s)) return 'route';
  if (s.includes('::')) return 'definition';
  if (/\//.test(s) && /\.[a-z]+$/.test(s)) return 'file';
  return 'table';
}
const KIND_FORM = { route_clients: 'definition', invariants_on_file: 'docline', other_half: 'definition' };
let LENIENT = false; // sensitivity: a path::Name item counts when its path alone appears
function found(text, lines, item) {
  const s = String(item); const f = formOf(s);
  if (f === 'file') return wholePath(text, s);
  if (f === 'definition') { const [p, n] = s.split('::'); const last = n.split('.').pop(); return LENIENT ? wholePath(text, p) : lines.some((l) => wholePath(l, p) && word(l, last)); }
  if (f === 'migration') return new RegExp('backend/alembic/versions/' + s + '_').test(text);
  if (f === 'table') return word(text, s);
  if (f === 'route') return text.includes(s.replace(/^[A-Z]+\s+/, ''));
  if (f === 'docline') { const [p, l] = s.split(':'); return lines.some((x) => x.includes(p) && word(x, l)); }
  return false;
}
function candidates(text, lines, forms, kind) {
  const c = new Set();
  const nodeLines = lines.filter((l) => /^NODE /.test(l));
  for (const l of nodeLines) {
    const m = l.match(/^NODE (.*?) \[src=([^\s\]]+)/); if (!m) continue;
    const label = m[1]; const src = m[2];
    const isFileNode = /\.[a-z]+$/.test(label) && src.endsWith(label);
    if (forms.has('file') && (kind !== 'tests_reach' || isTest(src))) c.add('file:' + src);
    if (forms.has('definition') && !isFileNode) c.add('def:' + src + '|' + label);
    if (forms.has('migration')) { const mm = src.match(/^backend\/alembic\/versions\/(\d{4})_/); if (mm) c.add('mig:' + mm[1]); }
  }
  if (forms.has('table')) for (const t of TABLES) if (word(text, t)) c.add('table:' + t);
  if (forms.has('route')) for (const r of ROUTES) if (text.includes(r)) c.add('route:' + r);
  return c;
}
function scoreGraphify(rec, ref) {
  const text = rec.text; const lines = text.split('\n');
  const items = []; const walk = (v) => { if (Array.isArray(v)) items.push(...v); else if (v && typeof v === 'object') Object.values(v).forEach(walk); }; walk(ref.answer);
  const uniq = [...new Set(items.map(String))];
  const forms = new Set(uniq.map(formOf)); if (!uniq.length) forms.add(KIND_FORM[ref.kind] || 'definition');
  const hit = uniq.filter((x) => found(text, lines, x));
  const cand = candidates(text, lines, forms, ref.kind);
  const na = Math.max(cand.size, hit.length) + 0; // every found item is an answer item
  const naFinal = cand.size + hit.filter((x) => !candHas(cand, x)).length;
  const p = TQ.prf(hit.length, naFinal, uniq.length);
  return { id: ref.id, kind: ref.kind, tp: hit.length, na: naFinal, nr: uniq.length, ...p, tokens: rec.tokens, forms: [...forms] };
}
function candHas(cand, x) {
  const f = formOf(x); const s = String(x);
  if (f === 'file') return cand.has('file:' + s);
  if (f === 'migration') return cand.has('mig:' + s);
  if (f === 'table') return cand.has('table:' + s);
  if (f === 'route') return cand.has('route:' + s.replace(/^[A-Z]+\s+/, ''));
  if (f === 'definition') { const [p, n] = s.split('::'); const last = n.split('.').pop(); return [...cand].some((c) => c.startsWith('def:' + p + '|') && word(c.split('|')[1], last)); }
  return false;
}
// ---- graphify, both settings
const GV = {};
for (const v of ['default', 'b8000']) {
  const recs = new Map(readJsonl(path.join(G, 'answers', 'heldout', 'tq', 'graphify.held_out.' + v + '.jsonl')).map((r) => [r.id, r]));
  GV[v] = refsAll.map((r) => scoreGraphify(recs.get(r.id), r));
  LENIENT = true; GV[v + '_lenient'] = refsAll.map((r) => scoreGraphify(recs.get(r.id), r)); LENIENT = false;
}
const lenientBlock = (ids) => Object.fromEntries(['default_lenient', 'b8000_lenient'].map((k) => { const q = GV[k].filter((x) => ids.includes(x.id)); return [k, { macro_recall: r4(S.mean(q.map((x) => x.r))), macro_precision: r4(S.mean(q.map((x) => x.p))), macro_f1: r4(S.mean(q.map((x) => x.f1))) }]; }));
// ---- typed and search, tq_score.js as the finished test
const ans = { relational: readJsonl(path.join(BUILD, 'results', 'heldout', 'tq', 'relational.answers.jsonl')), search: readJsonl(path.join(BUILD, 'results', 'heldout', 'tq', 'search.answers.jsonl')) };
const PQ = {};
for (const a of ['relational', 'search']) {
  const res = TQ.scoreTq(ans[a], refsAll);
  const am = new Map(ans[a].map((x) => [x.id, x]));
  PQ[a] = res.all.per_question.map((q) => ({ id: q.id, kind: q.kind, tp: q.tp, na: q.na, nr: q.nr, p: q.p, r: q.r, f1: q.f1, tokens_final_answer: TOK.countTokens(JSON.stringify(am.get(q.id).answer)), tokens_stored: q.tokens }));
}
// ---- group of addendum 7 item 20 for the questions (kinds the typed store's question program follows)
// needs a missing kind: screen_tables (client call to route, table write), setting_readers (setting read),
// migrations_touch_table (table), route_clients and other_half (route to client call), change_reach (route).
// tests_reach: per question, the reference test files reachable from the target with calls, depends_injects,
// passes_callable, renders only (reverse, unbounded) are "without"; a question is NEEDS when any of its
// reference test files is reachable only with registers_route / test_calls_route added.
// invariants_on_file: document links, which the code layer does not build (its own group).
const KIND_GROUP = { screen_tables: 'NEEDS', setting_readers: 'NEEDS', migrations_touch_table: 'NEEDS', route_clients: 'NEEDS', other_half: 'NEEDS', change_reach: 'NEEDS', invariants_on_file: 'DOCUMENT' };
const rev = (kinds) => { const m = new Map(); for (const e of fedges) if (kinds.has(e.kind) && (e.confidence == null || e.confidence >= 0.5)) { if (!m.has(e.dst)) m.set(e.dst, []); m.get(e.dst).push(e.src); } return m; };
const pathOf = new Map(fnodes.map((n) => [n.id, n.path]));
const reach = (adj, start) => { const seen = new Set([start]); let fr = [start]; while (fr.length) { const nx = []; for (const n of fr) for (const m of adj.get(n) || []) if (!seen.has(m)) { seen.add(m); nx.push(m); } fr = nx; } return new Set([...seen].map((x) => pathOf.get(x)).filter(Boolean)); };
const adjG = rev(new Set(['calls', 'depends_injects', 'passes_callable', 'renders']));
const adjR = rev(new Set(['calls', 'depends_injects', 'passes_callable', 'renders', 'registers_route', 'test_calls_route']));
const qGroup = {}; const testsReachDetail = {};
for (const r of refsAll) {
  if (r.kind !== 'tests_reach') { qGroup[r.id] = KIND_GROUP[r.kind]; continue; }
  const sid = 'sym:' + String(r.target).split('::')[0] + '#' + String(r.target).split('::')[1];
  const tests = [...(r.answer.real || []), ...(r.answer.fake || [])];
  const pg = reach(adjG, sid); const pr = reach(adjR, sid);
  const only = tests.filter((t) => !pg.has(t) && pr.has(t)).length; const without = tests.filter((t) => pg.has(t)).length;
  testsReachDetail[r.id] = { target_node_found: fnodes.some((n) => n.id === sid), reference_tests: tests.length, without_missing_kind: without, only_through_route_link: only, not_reached: tests.length - without - only };
  qGroup[r.id] = only ? 'NEEDS' : 'WITHOUT';
}
// ---- aggregates
const ARMS = { 'graphify default': GV.default, 'graphify --budget 8000': GV.b8000, typed: PQ.relational, 'scripted search': PQ.search };
const meanOf = (xs, k) => r4(S.mean(xs.map((x) => x[k])));
function blockOf(ids) {
  const b = { questions: ids.length, arms: {}, diffs: {} };
  for (const [name, qs] of Object.entries(ARMS)) {
    const q = qs.filter((x) => ids.includes(x.id));
    const tp = q.reduce((s, x) => s + x.tp, 0); const na = q.reduce((s, x) => s + x.na, 0); const nr = q.reduce((s, x) => s + x.nr, 0);
    b.arms[name] = { macro_recall: meanOf(q, 'r'), macro_precision: meanOf(q, 'p'), macro_f1: meanOf(q, 'f1'), micro: Object.fromEntries(Object.entries(TQ.prf(tp, na, nr)).map(([k, v]) => [k, r4(v)])),
      median_answer_tokens: S.median(q.map((x) => (x.tokens_final_answer != null ? x.tokens_final_answer : x.tokens))),
      ...(name === 'scripted search' ? { median_tokens_read: S.median(q.map((x) => x.tokens_stored)) } : {}) };
  }
  for (const g of ['graphify default', 'graphify --budget 8000']) for (const o of ['typed', 'scripted search']) {
    const fa = new Map(ARMS[g].filter((x) => ids.includes(x.id)).map((x) => [String(x.id).padStart(3, '0'), x.f1]));
    const fb = new Map(ARMS[o].filter((x) => ids.includes(x.id)).map((x) => [String(x.id).padStart(3, '0'), x.f1]));
    const ps = CMP.pairedStats(fa, fb, NRES, SEED);
    const fr = new Map(ARMS[g].filter((x) => ids.includes(x.id)).map((x) => [String(x.id).padStart(3, '0'), x.r]));
    const frb = new Map(ARMS[o].filter((x) => ids.includes(x.id)).map((x) => [String(x.id).padStart(3, '0'), x.r]));
    const pr = CMP.pairedStats(fr, frb, NRES, SEED);
    b.diffs[g + ' - ' + o] = { f1: { diff: r4(ps.diff), ci95: ps.ci95 && ps.ci95.map(r4), graphify_higher: ps.wins, other_higher: ps.losses, tied: ps.ties }, recall: { diff: r4(pr.diff), ci95: pr.ci95 && pr.ci95.map(r4) }, per_question_f1_diffs: [...fa.keys()].sort().map((k) => r4(fa.get(k) - fb.get(k))) };
  }
  return b;
}
const all = refsAll.map((r) => r.id); const untouched = all.filter((i) => !TOUCHED.includes(i));
const kinds = [...new Set(refsAll.map((r) => r.kind))];
const res = { written_at: new Date().toISOString(), matching_rule: 'see header of tq_g.js', judgement_items: 'kept (scored "with", as the finished test\'s verdict block)',
  all30: blockOf(all), untouched22: blockOf(untouched),
  by_kind: Object.fromEntries(kinds.map((k) => [k, blockOf(refsAll.filter((r) => r.kind === k).map((r) => r.id))])),
  link_groups: { rule: 'see tq_g.js: kinds the typed store\'s question program follows; tests_reach per question from the typed facts at the frozen commit', tests_reach_detail: testsReachDetail,
    groups: Object.fromEntries(['NEEDS', 'WITHOUT', 'DOCUMENT'].map((g) => [g, blockOf(all.filter((i) => qGroup[i] === g))])) },
  graphify_answer_tokens: { default: { median: S.median(GV.default.map((x) => x.tokens)), min: Math.min(...GV.default.map((x) => x.tokens)), max: Math.max(...GV.default.map((x) => x.tokens)) }, b8000: { median: S.median(GV.b8000.map((x) => x.tokens)), min: Math.min(...GV.b8000.map((x) => x.tokens)), max: Math.max(...GV.b8000.map((x) => x.tokens)) } },
  graphify_answer_items_median: { default: S.median(GV.default.map((x) => x.na)), b8000: S.median(GV.b8000.map((x) => x.na)) },
  sensitivity_definition_counts_on_path_alone: { all30: lenientBlock(all), untouched22: lenientBlock(untouched) } };
console.log('lenient', JSON.stringify(res.sensitivity_definition_counts_on_path_alone));
// per-question block stripped of the long diff arrays for the console
fs.writeFileSync(path.join(OUT, 'tq_g.json'), JSON.stringify(res, null, 1));
fs.writeFileSync(path.join(OUT, 'tq_g.per_question.json'), JSON.stringify({ note: 'grader only: per-question values', group: qGroup, graphify_default: GV.default, graphify_b8000: GV.b8000, typed: PQ.relational, search: PQ.search }, null, 1));
const show = (b) => JSON.stringify({ n: b.questions, arms: Object.fromEntries(Object.entries(b.arms).map(([k, v]) => [k, [v.macro_recall, v.macro_precision, v.macro_f1, v.median_answer_tokens]])), d: Object.fromEntries(Object.entries(b.diffs).map(([k, v]) => [k, [v.f1.diff, v.f1.ci95]])) });
console.log('all30', show(res.all30)); console.log('untouched22', show(res.untouched22));
for (const k of kinds) console.log(k, show(res.by_kind[k]));
for (const g of Object.keys(res.link_groups.groups)) console.log('group', g, show(res.link_groups.groups[g]));
console.log(JSON.stringify(testsReachDetail), JSON.stringify(res.graphify_answer_tokens), JSON.stringify(res.graphify_answer_items_median));
