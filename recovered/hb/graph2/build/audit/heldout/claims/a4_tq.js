'use strict';
// Refuter 3: question (H4) per-question differences, by kind, own bootstrap, and token like-for-like.
const fs = require('fs');
const B = 'C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/build';
const OUT = B + '/audit/heldout/claims';
let tok = null; try { const T = require(B + '/arms/common/tokenizer.js'); tok = T.count || T.countTokens || T.tokens || (typeof T === 'function' ? T : null); } catch (e) { tok = null; }
const rel = JSON.parse(fs.readFileSync(OUT + '/tq_relational.json', 'utf8'));
const sea = JSON.parse(fs.readFileSync(OUT + '/tq_search.json', 'utf8'));
const ans = (a) => new Map(fs.readFileSync(`${B}/results/heldout/tq/${a}.answers.jsonl`, 'utf8').split('\n').filter(Boolean).map(JSON.parse).map((x) => [x.id, x]));
const ar = ans('relational'); const as = ans('search');
const pq = (o, block) => new Map((o[block] || o.all).per_question.map((q) => [q.id, q]));
const touched = new Set([24, 27, 33, 40, 41, 46, 47]);
function rng(seed) { let x = seed >>> 0; let y = 362436069; return () => { const t = x ^ (x << 11); x = y; y = (y ^ (y >>> 19)) ^ (t ^ (t >>> 8)); return (y >>> 0) / 4294967296; }; }
function boot(d, n = 10000) { const r = rng(4242); const k = d.length; const ms = []; for (let i = 0; i < n; i++) { let s = 0; for (let j = 0; j < k; j++) s += d[(r() * k) | 0]; ms.push(s / k); } ms.sort((a, b) => a - b); return [ms[250], ms[9749]]; }
const mean = (x) => x.reduce((a, b) => a + b, 0) / x.length; const r4 = (x) => Math.round(x * 10000) / 10000;
const out = { tokenizer_loaded: !!tok, per_question: [], by_kind: {}, blocks: {} };
const R = pq(rel, 'all'); const S = pq(sea, 'all');
for (const id of [...R.keys()].sort((a, b) => a - b)) {
  const r = R.get(id); const s = S.get(id);
  const ansTokS = tok ? tok(JSON.stringify(as.get(id).answer)) : JSON.stringify(as.get(id).answer).length / 4;
  const ansTokR = tok ? tok(JSON.stringify(ar.get(id).answer)) : JSON.stringify(ar.get(id).answer).length / 4;
  out.per_question.push({ id, kind: r.kind, touched: touched.has(id), f1_typed: r4(r.f1), f1_search: r4(s.f1), d: r4(r.f1 - s.f1), tokens_typed: r.tokens, tokens_search_read: s.tokens, answer_tokens_typed: ansTokR, answer_tokens_search: ansTokS, lookups_typed: r.lookups, lookups_search: s.lookups });
}
for (const q of out.per_question) { (out.by_kind[q.kind] = out.by_kind[q.kind] || { n: 0, d: [] }).n++; out.by_kind[q.kind].d.push(q.d); }
for (const k of Object.keys(out.by_kind)) { const o = out.by_kind[k]; o.mean_d = r4(mean(o.d)); delete o.d; }
const blk = (name, f) => { const qs = out.per_question.filter(f); const d = qs.map((q) => q.d); const ci = boot(d); out.blocks[name] = { n: qs.length, diff: r4(mean(d)), ci95: [r4(ci[0]), r4(ci[1])], wins: d.filter((x) => x > 0).length, losses: d.filter((x) => x < 0).length, ties: d.filter((x) => x === 0).length }; };
blk('all30', () => true); blk('untouched23', (q) => !q.touched); blk('touched7', (q) => q.touched);
const med = (x) => { const s = [...x].sort((a, b) => a - b); const k = s.length >> 1; return s.length % 2 ? s[k] : (s[k - 1] + s[k]) / 2; };
out.tokens = { median_typed_answer: med(out.per_question.map((q) => q.tokens_typed)), median_search_read: med(out.per_question.map((q) => q.tokens_search_read)), median_search_answer_only: med(out.per_question.map((q) => q.answer_tokens_search)), median_typed_answer_recount: med(out.per_question.map((q) => q.answer_tokens_typed)) };
fs.writeFileSync(OUT + '/a4_tq.json', JSON.stringify(out, null, 1));
console.log(JSON.stringify({ blocks: out.blocks, by_kind: out.by_kind, tokens: out.tokens, tokenizer: out.tokenizer_loaded }, null, 1));
console.log(out.per_question.map((q) => `${q.id} ${q.kind} ${q.touched ? 'T' : ' '} ${q.f1_typed} ${q.f1_search} tokT ${q.tokens_typed} tokSread ${q.tokens_search_read} tokSans ${q.answer_tokens_search}`).join('\n'));
