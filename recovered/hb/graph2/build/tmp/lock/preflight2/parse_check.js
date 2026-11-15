'use strict';
// Pre-flight fix round 2: what the absent-member rule of arms/common/tqtarget.js changes.
// For every TQ question (tune and held-out: question TEXT only, an input) and every probe question of
// this lane, compare the parsed target (parse(), the round-1 parser, unchanged) with the resolved target
// (target(), parse() plus the absent-member rule against the frozen commit's canonical graph).
// Opens no arm store, runs no arm, produces no answer, reads nothing under sealed/ or audit/.
// Also counts nodes with no path (a LadybugDB label of such a node would read '::x' where SQLite gives
// NULL; this checks whether any such node can reach a question label).
//   inside graphtest:1:  node tmp/lock/preflight2/parse_check.js  -> tmp/lock/preflight2/parse_check.json
const fs = require('fs');
const path = require('path');
const B = process.env.GT_BUILD || path.resolve(__dirname, '..', '..', '..');
const P = require(path.join(B, 'arms/common/paths'));
const { graphFor } = require(path.join(B, 'arms/common/arms'));
const T = require(path.join(B, 'arms/common/tqtarget'));

const rl = (f) => fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map(JSON.parse);
const qs = [...rl(path.join(P.TASKS, 'tq_questions.jsonl')), ...rl(path.join(__dirname, 'probe_questions.jsonl'))];
const G = graphFor(P.FROZEN);
const have = new Set(G.nodes.map((n) => n.sid));
const rows = []; const changed = { tune: [], held_out: [], probe: [] }; const errors = [];
for (const q of qs) {
  let p = null; let t = null; let err = null;
  try { p = T.parse(q); t = T.target(q); } catch (e) { err = String(e.message || e); errors.push({ id: q.id, split: q.split, error: err }); }
  const row = { id: q.id, split: q.split, kind: q.kind, parsed: p, resolved: t, error: err,
    parsed_sid_exists: p && p.sid ? have.has(p.sid) : null, resolved_sid_exists: t && t.sid ? have.has(t.sid) : null };
  if (JSON.stringify(p) !== JSON.stringify(t)) (changed[q.split] || (changed[q.split] = [])).push({ id: q.id, kind: q.kind, from: p, to: t });
  rows.push(row);
}
const absentAfter = rows.filter((r) => r.resolved_sid_exists === false).map((r) => ({ id: r.id, split: r.split, sid: r.resolved.sid }));
const noPath = {}; let noPathLabelable = 0;
for (const n of G.nodes) {
  if (n.path != null && n.path !== '') continue;
  noPath[n.kind] = (noPath[n.kind] || 0) + 1;
  if (!n.is_test && n.runtime !== 'backend') noPathLabelable++;
}
const out = { frozen: P.FROZEN, nodes: G.nodes.length, questions: qs.length, by_split: qs.reduce((a, q) => ((a[q.split] = (a[q.split] || 0) + 1), a), {}),
  errors, changed, sid_targets_still_absent: absentAfter, nodes_without_path_by_kind: noPath, nodes_without_path_not_test_not_backend: noPathLabelable, rows };
fs.writeFileSync(path.join(__dirname, 'parse_check.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify({ questions: qs.length, errors: errors.length, changed_tune: changed.tune.length, changed_held_out: changed.held_out.map((x) => x.id), changed_probe: changed.probe.map((x) => x.id), still_absent: absentAfter.map((x) => x.id), nodes_without_path_by_kind: noPath, nodes_without_path_not_test_not_backend: noPathLabelable }));
for (const s of Object.keys(changed)) for (const c of changed[s]) console.log('changed', s, c.id, c.kind, JSON.stringify(c.from), '->', JSON.stringify(c.to));
process.exit(errors.length || changed.tune.length ? 1 : 0);
