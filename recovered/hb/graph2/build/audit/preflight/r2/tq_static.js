'use strict';
// Re-audit 2, check 7: the 50 questions against the question code WITHOUT running any arm. The shared
// parser arms/common/tqtarget.js (a pure function of the question text, no store, no facts) gives each
// target; every target is then looked up in the frozen commit's raw facts (facts/cache/<frozen>/), and
// for setting_readers the readers are classified the way the three typed queries do it: a reader whose
// node is not a definition kind is mapped to the innermost function/method/constant around the evidence
// line; when there is none, relational and duckpgq answer "<evidence path>::<setting name>", and the
// LadybugDB query (min(f2.path + '::' + ...) over an empty OPTIONAL MATCH) answers "::".
// Also: every kind of every question is dispatched in each of the four tq.js files (read as text).
// usage: node tq_static.js <build> <out.json>
const fs = require('fs'); const path = require('path');
const B = process.argv[2];
const FROZEN = 'a31924a3818f4ac94b695906d107c72c912792b2';
const { target, routesOf } = require(path.join(B, 'arms', 'common', 'tqtarget.js'));
const qs = fs.readFileSync(path.join(B, 'tasks', 'tq_questions.jsonl'), 'utf8').split('\n').filter(Boolean).map(JSON.parse);
const rdj = (f) => fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map(JSON.parse);
const N = rdj(path.join(B, 'facts', 'cache', FROZEN, 'nodes.jsonl'));
const E = rdj(path.join(B, 'facts', 'cache', FROZEN, 'edges.jsonl'));
const byId = new Map(N.map((n) => [n.id, n]));
const files = new Set(N.filter((n) => n.kind === 'file').map((n) => n.path));
const DEFK = new Set(['function', 'method', 'component', 'class', 'constant']);
const ENCK = new Set(['function', 'method', 'constant']);
function settingNodes(tg) {
  return N.filter((n) => (tg.name != null && n.id === 'setting:' + tg.name) || (tg.env != null && n.id === 'setting:env/' + tg.env) || (tg.config != null && n.name === tg.config && /^setting/.test(n.id)));
}
function readers(st) {
  const ids = new Set(st.map((n) => n.id)); const rows = [];
  for (const e of E) {
    if (e.kind !== 'reads_setting' || !ids.has(e.dst)) continue;
    const s = byId.get(e.src); if (!s || s.is_test) continue;
    if (DEFK.has(s.kind)) { rows.push({ src: s.id, kind: s.kind, mapped: 'self' }); continue; }
    const enc = N.filter((f) => f.path === e.evidence_path && ENCK.has(f.kind) && e.evidence_line >= f.line_start && e.evidence_line <= f.line_end);
    rows.push({ src: s.id, kind: s.kind, ev: e.evidence_path + ':' + e.evidence_line, mapped: enc.length ? 'enclosing' : 'NONE (ladybug gives "::")' });
  }
  return rows;
}
const armText = {};
for (const a of ['relational', 'ladybug', 'duckpgq', 'search']) armText[a] = fs.readFileSync(path.join(B, 'arms', a, 'tq.js'), 'utf8');
const rows = [];
for (const q of qs) {
  const r = { id: q.id, split: q.split, kind: q.kind };
  try { r.target = target(q); } catch (e) { r.target_error = e.message; rows.push(r); continue; }
  const tg = r.target;
  if (tg.sid) r.found = byId.has(tg.sid);
  else if (tg.path) r.found = files.has(tg.path);
  else if (tg.table) r.found = byId.has('table:' + tg.table);
  else if (tg.route || tg.routes) r.found = routesOf(tg).map((x) => byId.has('route:backend ' + x));
  if (q.kind === 'setting_readers') {
    const st = settingNodes(tg); r.setting_nodes = st.map((n) => n.id);
    r.found = st.length > 0;
    r.readers = readers(st);
    r.unenclosed_readers = r.readers.filter((x) => x.mapped.startsWith('NONE')).length;
  }
  if (tg.sid && !r.found) {
    const base = tg.sid.replace(/\.[^.#]+$/, '');
    r.nearest_existing = byId.has(base) ? base : null;
  }
  r.dispatched = Object.fromEntries(Object.entries(armText).map(([a, t]) => [a, new RegExp("(case '|\\b)" + q.kind + "\\b").test(t)]));
  rows.push(r);
}
const sum = (split) => {
  const R = rows.filter((r) => r.split === split);
  return {
    questions: R.length, kinds: [...new Set(R.map((r) => r.kind))].sort(), by_kind: R.reduce((o, r) => { o[r.kind] = (o[r.kind] || 0) + 1; return o; }, {}),
    target_errors: R.filter((r) => r.target_error).map((r) => r.id),
    target_missing_in_facts: R.filter((r) => r.found === false || (Array.isArray(r.found) && r.found.includes(false))).map((r) => r.id),
    setting_questions_with_unenclosed_readers: R.filter((r) => r.unenclosed_readers).map((r) => r.id + ' (' + r.unenclosed_readers + ' of ' + r.readers.length + ' readers)'),
    not_dispatched: R.filter((r) => r.dispatched && Object.values(r.dispatched).includes(false)).map((r) => r.id),
  };
};
const out = { tune: sum('tune'), held_out: sum('held_out'), rows };
fs.writeFileSync(process.argv[3], JSON.stringify(out, null, 1));
console.log(JSON.stringify({ tune: out.tune, held_out: out.held_out }, null, 1));
for (const r of rows.filter((x) => x.kind === 'setting_readers' || x.found === false || (Array.isArray(x.found) && x.found.includes(false)) || x.split === 'held_out' && x.kind === 'other_half')) console.log(r.split, r.id, r.kind, JSON.stringify(r.target), 'found', JSON.stringify(r.found), r.setting_nodes ? 'nodes ' + r.setting_nodes.join(',') : '', r.readers ? 'readers ' + r.readers.length + ' unenclosed ' + r.unenclosed_readers : '', r.nearest_existing ? 'nearest ' + r.nearest_existing : '');
