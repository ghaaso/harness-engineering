'use strict';
// Check 1 (H4 on 30, 23, 22 questions) and the question numbers of data.json. Own scorer (no arms/common/tq_score.js);
// the shared tokenizer is used only to count the size of a final answer (its definition of "tokens").
const L = require('./lib.js');
const { fs, path, B, OUT, jl, mean, median, r4, bootMean } = L;
const TOK = require(path.join(B, 'arms/common/tokenizer.js'));
const ref = new Map(jl(path.join(B, 'sealed/tq_reference.jsonl')).filter((r) => r.split !== 'tune').map((r) => [r.id, r]));
const kind = new Map(jl(path.join(B, 'tasks/tq_questions.jsonl')).map((q) => [q.id, q.kind]));
// judgement items: read by hand from sealed/tq_agreement.txt line 34 ("excluded" calls on held-out ids 21-50)
const JUDGE = { 21: ['device'], 25: ['backend/app/features/jobs/service.py::JobService._money_rates'], 31: ['CLAUDE.md:L239', 'CLAUDE.md:L243', 'CLAUDE.md:L246'], 39: ['CLAUDE.md:L224', 'CLAUDE.md:L199'] };
const T7 = [24, 27, 33, 40, 41, 46, 47]; const T8 = [...T7, 25];
const ARMS = ['relational', 'ladybug', 'duckpgq', 'search'];
const ans = {}; for (const a of ARMS) ans[a] = new Map(jl(path.join(B, 'results/heldout/tq', a + '.answers.jsonl')).map((x) => [x.id, x]));
function items(x) { if (Array.isArray(x)) return x.map((v) => String(v).trim()); if (x && typeof x === 'object') { const o = []; for (const k of Object.keys(x)) for (const v of x[k] || []) o.push(k + '\u0001' + String(v).trim()); return o; } return []; }
function score(answer, r, dropJ) {
  const isObj = !Array.isArray(r.answer); const al = r.accept_aliases || {};
  let a = items(answer);
  if (dropJ) { const J = new Set(JUDGE[r.id] || []); a = a.filter((x) => !J.has(isObj ? x.split('\u0001')[1] : x)); }
  a = [...new Set(a)]; const R = [...new Set(items(r.answer))];
  const match = (x) => R.find((y) => { const [yk, yv] = isObj ? y.split('\u0001') : [0, y]; const [xk, xv] = isObj ? x.split('\u0001') : [0, x]; return yk === xk && (xv === yv || (al[yv] || []).includes(xv)); });
  const hit = new Set(); let tpA = 0; for (const x of a) { const m = match(x); if (m) { tpA++; hit.add(m); } }
  let p, rc, f;
  if (!a.length && !R.length) { p = 1; rc = 1; f = 1; } else { p = a.length ? tpA / a.length : 0; rc = R.length ? hit.size / R.length : 1; f = p + rc ? (2 * p * rc) / (p + rc) : 0; }
  if (R.length === 0 && a.length) f = 0; // F1 0 for a non-empty answer to an empty reference (addendum 6 item 16)
  return { p, r: rc, f1: f, tpA, tp: hit.size, nA: a.length, nR: R.length, nAdropped: items(answer).length - a.length };
}
const ids = [...ref.keys()].sort((x, y) => x - y);
const blocks = { all30: ids, untouched23: ids.filter((i) => !T7.includes(i)), untouched22: ids.filter((i) => !T8.includes(i)), touched8: T8.slice().sort((a, b) => a - b), touched7: T7 };
const out = { blocks: {}, per_question: [], identical: {}, tokens: {} };
for (const [bn, qs] of Object.entries(blocks)) for (const dj of [false, true]) {
  const name = bn + (dj ? '_without_judgement' : '_with_judgement');
  const per = {}; const armsOut = {};
  for (const a of ARMS) {
    per[a] = qs.map((i) => ({ id: i, ...score(ans[a].get(i).answer, ref.get(i), dj), anstok: TOK.countTokens(JSON.stringify(ans[a].get(i).answer)), read: ans[a].get(i).tokens, lookups: ans[a].get(i).lookups }));
    const s = per[a]; const sum = (k) => s.reduce((t, x) => t + x[k], 0);
    const mp = sum('nA') ? sum('tpA') / sum('nA') : 0; const mr = sum('nR') ? sum('tp') / sum('nR') : 0;
    armsOut[a] = { macro_f1: mean(s.map((x) => x.f1)), macro_precision: mean(s.map((x) => x.p)), macro_recall: mean(s.map((x) => x.r)), micro_f1: mp + mr ? 2 * mp * mr / (mp + mr) : 0,
      median_answer_tokens: median(s.map((x) => x.anstok)), mean_answer_tokens: mean(s.map((x) => x.anstok)), median_lookups: median(s.map((x) => x.lookups)), median_read: median(s.map((x) => x.read)), mean_read: mean(s.map((x) => x.read)) };
  }
  const d = qs.map((_, k) => per.relational[k].f1 - per.search[k].f1);
  const perKind = {};
  for (const k of [...new Set(qs.map((i) => kind.get(i)))].sort()) { const ix = qs.map((i, j) => [i, j]).filter(([i]) => kind.get(i) === k).map(([, j]) => j); perKind[k] = { questions: ix.length, typed: mean(ix.map((j) => per.relational[j].f1)), search: mean(ix.map((j) => per.search[j].f1)), diff: mean(ix.map((j) => d[j])) }; }
  out.blocks[name] = { n: qs.length, arms: armsOut, diff: mean(d), ci95: bootMean(d), typed_higher: d.filter((x) => x > 1e-12).length, search_higher: d.filter((x) => x < -1e-12).length, ties: d.filter((x) => Math.abs(x) <= 1e-12).length, per_kind: perKind };
  if (name === 'all30_with_judgement') out.per_question = qs.map((i, k) => ({ id: i, kind: kind.get(i), touched: T8.includes(i), typed_f1: per.relational[k].f1, typed_precision: per.relational[k].p, typed_recall: per.relational[k].r, search_f1: per.search[k].f1, search_precision: per.search[k].p, search_recall: per.search[k].r, typed_answer_tokens: per.relational[k].anstok, search_answer_tokens: per.search[k].anstok, search_tokens_read: per.search[k].read, typed_lookups: per.relational[k].lookups, search_lookups: per.search[k].lookups, typed_tokens_field: per.relational[k].read }));
}
for (const a of ['ladybug', 'duckpgq']) out.identical[a] = ids.filter((i) => JSON.stringify(ans[a].get(i).answer) === JSON.stringify(ans.relational.get(i).answer)).length;
out.identical.search_differs = ids.filter((i) => JSON.stringify(ans.search.get(i).answer) !== JSON.stringify(ans.relational.get(i).answer)).length;
out.typed_tokens_field_equals_recount = out.per_question.filter((q) => q.typed_tokens_field === q.typed_answer_tokens).length;
// verdict words per block (protocol section 7 + addendum 3 item 18): typed sign agreement with T1,T2,T3 of H3-search (all +) assumed checked elsewhere
for (const [n, b] of Object.entries(out.blocks)) { const ex = b.ci95[0] > 0 || b.ci95[1] < 0; const tokOk = b.arms.relational.median_answer_tokens <= b.arms.search.median_read; b.word = ex && b.diff > 0 && tokOk ? 'better (typed)' : (b.ci95[0] >= -0.05 && b.ci95[1] <= 0.05 ? 'equivalent' : 'inconclusive'); }
fs.writeFileSync(path.join(OUT, 'a_questions.json'), JSON.stringify(out, null, 1));
for (const [n, b] of Object.entries(out.blocks)) console.log(n, b.n, r4(b.arms.relational.macro_f1), r4(b.arms.search.macro_f1), r4(b.diff), b.ci95.map(r4), b.typed_higher, b.search_higher, b.ties, b.word);
console.log('identical', JSON.stringify(out.identical), 'tokfield==recount', out.typed_tokens_field_equals_recount);
