'use strict';
// Audit check 5: spread of the questions and the share whose answer never changes over the snapshots.
// Truths are the audit's own recomputation (truths_all.json from a2_truth_dump.js); lookup codes from
// k0's per-lookup log of the tree lane.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const K0 = path.resolve(__dirname, '..', 'k0');
const POL = ['none', 'repo', 'file', 'fact_pos', 'fact', 'fact_sem', 'cutoff', 'cutoff_sem', 'ttl5', 'ttl20', 'never'];
const QS = JSON.parse(fs.readFileSync(path.join(K0, 'data', 'questions.json'), 'utf8')).questions;
const qById = new Map(QS.map((q) => [q.qid, q]));
const truths = JSON.parse(fs.readFileSync(path.join(__dirname, 'truths_all.json'), 'utf8'));
const per = new Map();
for (const [k, a] of truths) { const qid = k.slice(41); if (!per.has(qid)) per.set(qid, new Map()); const m = per.get(qid); m.set(a, (m.get(a) || 0) + 1); }
const isEmptyStr = (s) => { const a = JSON.parse(s); return Array.isArray(a) ? a.length === 0 : a.items ? a.items.length === 0 : Object.values(a).every((v) => Array.isArray(v) && v.length === 0); };
const out = { questions_with_truths: per.size, by_kind: {}, by_set: {} };
const staticQ = new Set(); const emptyStaticQ = new Set(); const everEmptyOnly = new Set();
for (const [qid, m] of per) {
  const q = qById.get(qid);
  const b = out.by_kind[q.kind] || (out.by_kind[q.kind] = { questions: 0, never_changes: 0, never_changes_and_always_empty: 0, distinct_answers_median: 0, _d: [] });
  const s = out.by_set[q.set] || (out.by_set[q.set] = { questions: 0, never_changes: 0, never_changes_and_always_empty: 0 });
  b.questions++; s.questions++; b._d.push(m.size);
  if (m.size === 1) { staticQ.add(qid); b.never_changes++; s.never_changes++; if (isEmptyStr([...m.keys()][0])) { emptyStaticQ.add(qid); b.never_changes_and_always_empty++; s.never_changes_and_always_empty++; } }
  if ([...m.keys()].every(isEmptyStr)) everEmptyOnly.add(qid);
}
for (const b of Object.values(out.by_kind)) { b._d.sort((x, y) => x - y); b.distinct_answers_median = b._d[Math.floor((b._d.length - 1) / 2)]; b.distinct_answers_max = b._d[b._d.length - 1]; delete b._d; }
const k18 = [...per.keys()].filter((q) => qById.get(q).kind !== 'completion');
out.kinds_1_8 = { questions: k18.length, never_changes: k18.filter((q) => staticQ.has(q)).length, never_changes_and_always_empty: k18.filter((q) => emptyStaticQ.has(q)).length };
out.completion = { questions: per.size - k18.length, never_changes: [...staticQ].filter((q) => qById.get(q).kind === 'completion').length };

// lookups: hit and stale rates on questions whose answer changes at least once
const rows = zlib.gunzipSync(fs.readFileSync(path.join(K0, 'out', 'final1', 'lookups_tree.jsonl.gz'))).toString().split('\n').filter(Boolean).map((l) => JSON.parse(l));
function rates(filter) {
  const r = { lookups: 0 };
  for (const row of rows) { if (row.o[4] === 'C' || !filter(row)) continue; r.lookups++; for (let i = 2; i < POL.length; i++) { const c = row.o[i]; const p = POL[i]; r[p] = r[p] || { served: 0, stale: 0 }; if (c === 'H' || c === 'S') r[p].served++; if (c === 'S') r[p].stale++; } }
  for (let i = 2; i < POL.length; i++) { const p = POL[i]; if (r[p]) r[p] = { hit: +(100 * r[p].served / r.lookups).toFixed(1), stale_per_served: +(100 * r[p].stale / Math.max(1, r[p].served)).toFixed(2), stale: r[p].stale }; }
  return r;
}
const kind = (row) => qById.get(row.q).kind;
out.lookups_kinds_1_8_on_static_questions = rows.filter((r) => r.o[4] !== 'C' && kind(r) !== 'completion' && staticQ.has(r.q)).length;
out.lookups_kinds_1_8_total = rows.filter((r) => r.o[4] !== 'C' && kind(r) !== 'completion').length;
out.rates_kinds_1_8_changing_questions_only = rates((r) => kind(r) !== 'completion' && !staticQ.has(r.q));
out.rates_kinds_1_8_static_questions_only = rates((r) => kind(r) !== 'completion' && staticQ.has(r.q));
out.rates_kinds_1_8_changing_and_not_always_empty = rates((r) => kind(r) !== 'completion' && !staticQ.has(r.q) && !everEmptyOnly.has(r.q));
// a lookup is "at a change" when the answer differs from the previous lookup on the path
out.lookups_kinds_1_8_where_answer_changed = rows.filter((r) => r.o[4] !== 'C' && kind(r) !== 'completion' && r.ch === 1).length;

// spread of the question set
const gen = QS.filter((q) => q.set !== 'tq50' && q.kind !== 'completion');
const anchors50 = new Set(QS.filter((q) => q.set === 'tq50').flatMap((q) => q.anchors));
out.spread = {
  sets: QS.reduce((a, q) => { a[q.set] = (a[q.set] || 0) + 1; return a; }, {}),
  kind_runtime_generated: gen.reduce((a, q) => { const k = q.kind + '/' + q.runtime; a[k] = (a[k] || 0) + 1; return a; }, {}),
  completion_runtime: QS.filter((q) => q.kind === 'completion').reduce((a, q) => { a[q.runtime] = (a[q.runtime] || 0) + 1; return a; }, {}),
  generated_anchor_also_in_50: gen.filter((q) => q.anchors.some((a) => anchors50.has(a))).length,
  generated_max_run_main_below_20: QS.filter((q) => q.set !== 'tq50').filter((q) => q.max_run_main < 20).length,
  exists_at_snapshots: (() => { const v = QS.map((q) => q.exists_at.length).sort((a, b) => a - b); return { min: v[0], median: v[Math.floor(v.length / 2)], max: v[v.length - 1] }; })(),
  tq50_exists_at_min: Math.min(...QS.filter((q) => q.set === 'tq50').map((q) => q.exists_at.length)),
};
fs.writeFileSync(path.join(__dirname, 'a5_spread.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
