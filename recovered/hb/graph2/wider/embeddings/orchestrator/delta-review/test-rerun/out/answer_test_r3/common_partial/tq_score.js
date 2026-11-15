'use strict';
// The one scorer for the code-reading questions (TQ; protocol addendum 2, A.6). Grader only.
//   node tq_score.js --answers <arm answers.jsonl> --refs <tq_reference.jsonl> [--split tune|held_out]
//                    [--judgement <file.json>] [--out result.json]
// Answer file (SPEC.md section 12): one JSON line per question {id, answer, tokens, lookups, ms}.
// Matching: an item is trimmed; an answer item equal to a reference item, or to one of its
// accept_aliases, counts as that reference item (each reference item at most once).
// Per question: TP, |answer|, |reference|; precision = TP / |answer|, recall = TP / |reference|,
// F1 = 2PR / (P + R). Conventions: empty answer and empty reference -> P = R = F1 = 1; empty answer
// and non-empty reference -> P = 0, R = 0, F1 = 0; non-empty answer and empty reference -> P = 0,
// R = 1, F1 = 0. Object-shaped answers ({"real": [...], "fake": [...]}, ...) are scored per named
// array (a missing key is an empty array; an array where an object is expected counts as empty for
// every key) and pooled: TP, |answer| and |reference| summed over the arrays.
// Averages: macro (mean over questions of the pooled P, R, F1), micro (from summed counts), mean
// tokens and lookups. With --judgement (a JSON object id -> [reference items], or a reference line's
// own "judgement_items" array), every result is also reported without those items (removed from the
// reference, and any answer item matching them removed from the answer).
const fs = require('fs');

const readJsonl = (f) => fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map(JSON.parse);
const norm = (s) => String(s).trim();

function aliasMap(ref) {
  const m = new Map();
  const add = (canon) => m.set(norm(canon), norm(canon));
  const walk = (v) => { if (Array.isArray(v)) v.forEach(add); else if (v && typeof v === 'object') Object.values(v).forEach(walk); };
  walk(ref.answer);
  for (const [canon, alts] of Object.entries(ref.accept_aliases || {})) { add(canon); for (const a of alts || []) m.set(norm(a), norm(canon)); }
  return m;
}

function scoreArray(ans, refItems, amap, drop) {
  const R = new Set(refItems.map(norm).filter((x) => !drop.has(x)));
  const A = new Set();
  for (const x of Array.isArray(ans) ? ans : []) { const c = amap.get(norm(x)) || norm(x); if (!drop.has(c)) A.add(c); }
  let tp = 0; for (const x of A) if (R.has(x)) tp++;
  return { tp, na: A.size, nr: R.size };
}
function prf(tp, na, nr) {
  if (!na && !nr) return { p: 1, r: 1, f1: 1 };
  if (!na) return { p: 0, r: 0, f1: 0 };
  if (!nr) return { p: 0, r: 1, f1: 0 };
  const p = tp / na; const r = tp / nr; return { p, r, f1: p + r ? (2 * p * r) / (p + r) : 0 };
}

function scoreQuestion(a, ref, dropItems) {
  const amap = aliasMap(ref); const drop = new Set((dropItems || []).map(norm));
  const out = { id: ref.id, kind: ref.kind, parts: {} };
  let tp = 0; let na = 0; let nr = 0;
  if (Array.isArray(ref.answer)) {
    const s = scoreArray(a ? a.answer : [], ref.answer, amap, drop); tp = s.tp; na = s.na; nr = s.nr;
  } else {
    const ans = a && a.answer && typeof a.answer === 'object' && !Array.isArray(a.answer) ? a.answer : {};
    for (const k of Object.keys(ref.answer).sort()) {
      const s = scoreArray(ans[k] || [], ref.answer[k] || [], amap, drop);
      out.parts[k] = { ...s, ...prf(s.tp, s.na, s.nr) };
      tp += s.tp; na += s.na; nr += s.nr;
    }
  }
  Object.assign(out, { tp, na, nr, ...prf(tp, na, nr), answered: !!a, tokens: a ? a.tokens : null, lookups: a ? a.lookups : null, ms: a ? a.ms : null });
  return out;
}

function average(qs) {
  const mean = (xs) => { const v = xs.filter((x) => x != null); return v.length ? v.reduce((x, y) => x + y, 0) / v.length : null; };
  const T = qs.reduce((s, q) => s + q.tp, 0); const NA = qs.reduce((s, q) => s + q.na, 0); const NR = qs.reduce((s, q) => s + q.nr, 0);
  return { questions: qs.length, answered: qs.filter((q) => q.answered).length,
    macro: { p: mean(qs.map((q) => q.p)), r: mean(qs.map((q) => q.r)), f1: mean(qs.map((q) => q.f1)) },
    micro: prf(T, NA, NR), tokens_mean: mean(qs.map((q) => q.tokens)), lookups_mean: mean(qs.map((q) => q.lookups)), ms_mean: mean(qs.map((q) => q.ms)) };
}

function scoreTq(answers, refs, opts = {}) {
  const am = new Map(answers.map((a) => [a.id, a]));
  const rs = refs.filter((r) => !opts.split || r.split === opts.split);
  const judg = opts.judgement || {};
  const all = rs.map((r) => scoreQuestion(am.get(r.id), r, []));
  const res = { all: { ...average(all), per_question: all } };
  const hasJ = rs.some((r) => (judg[r.id] && judg[r.id].length) || (r.judgement_items && r.judgement_items.length));
  if (hasJ) {
    const wo = rs.map((r) => scoreQuestion(am.get(r.id), r, judg[r.id] || r.judgement_items || []));
    res.without_judgement = { ...average(wo), items_removed: rs.reduce((s, r) => s + (judg[r.id] || r.judgement_items || []).length, 0), per_question: wo };
  } else res.without_judgement = null;
  return res;
}

function main() {
  const a = process.argv.slice(2); const o = {};
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--answers') o.answers = a[++i]; else if (a[i] === '--refs') o.refs = a[++i];
    else if (a[i] === '--split') o.split = a[++i] === 'heldout' ? 'held_out' : a[i];
    else if (a[i] === '--judgement') o.judgement = JSON.parse(fs.readFileSync(a[++i], 'utf8'));
    else if (a[i] === '--out') o.out = a[++i]; else throw new Error('unknown argument ' + a[i]);
  }
  if (!o.answers || !o.refs) throw new Error('usage: tq_score.js --answers <jsonl> --refs <tq_reference.jsonl>');
  const r = scoreTq(readJsonl(o.answers), readJsonl(o.refs), o);
  if (o.out) fs.writeFileSync(o.out, JSON.stringify(r, null, 1));
  const brief = (x) => x && { questions: x.questions, macro: x.macro, micro: x.micro, tokens_mean: x.tokens_mean, lookups_mean: x.lookups_mean };
  console.log(JSON.stringify({ all: brief(r.all), without_judgement: brief(r.without_judgement) }, null, 1));
}

if (require.main === module) main();
module.exports = { scoreTq, scoreQuestion, prf };
