'use strict';
// Preflight check 7: the held-out questions against the question code, by reading, not running.
// The typed arms' target() (relational/tq.js lines 162-180; duckpgq/tq.js lines 21-39 is the same text;
// ladybug imports relational's) and the search arm's extractors (search/tq.js lines 16-17, 153, 170,
// 198, 232) are re-typed here as copies, applied to the question TEXT only (an input), and each target
// is looked up in the frozen commit's facts (nodes.jsonl): no arm module is loaded and no store opened.
// Also: the target-function text of relational and duckpgq is compared byte for byte.
// usage: node tq_targets.js <build> <out.json>
const fs = require('fs'); const path = require('path');
const B = process.argv[2];
const FROZEN = 'a31924a3818f4ac94b695906d107c72c912792b2';
const qs = fs.readFileSync(path.join(B, 'tasks', 'tq_questions.jsonl'), 'utf8').split('\n').filter(Boolean).map(JSON.parse);
const nodes = new Map(); const routes = new Set(); const tables = new Set(); const settings = new Set();
for (const l of fs.readFileSync(path.join(B, 'facts', 'cache', FROZEN, 'nodes.jsonl'), 'utf8').split('\n')) {
  if (!l) continue; const n = JSON.parse(l); nodes.set(n.id, n);
  if (n.kind === 'route') routes.add(n.name || n.id); if (n.kind === 'table') tables.add(n.name); if (n.kind === 'settings_key' || n.kind === 'setting') settings.add(n.name);
}
const files = new Set([...nodes.values()].filter((n) => n.kind === 'file').map((n) => n.path));
function typed(q) {
  const t = q.question.replace(/^\[repo at commit \w+\]\s*/, '');
  const ps0 = t.match(/([\w./-]+\.(?:py|tsx|ts|jsx|js|mjs))::([\w.]+)/);
  const ps = ps0 && [ps0[0], ps0[1], ps0[2].replace(/\.+$/, '')];
  const pathOnly = t.match(/([\w-]+\/[\w./-]+\.(?:py|tsx|ts|jsx|js|mjs))/);
  switch (q.kind) {
    case 'screen_tables': case 'invariants_on_file': return { path: pathOnly[1] };
    case 'tests_reach': case 'change_reach': return { sid: 'sym:' + ps[1] + '#' + ps[2] };
    case 'other_half': { if (ps) return { sid: 'sym:' + ps[1] + '#' + ps[2] }; const m = t.match(/^([\w.]+) \(([\w./-]+)\)/); return { sid: 'sym:' + m[2] + '#' + m[1] }; }
    case 'setting_readers': { const m = t.match(/setting (\w+) \(settings\.\w+, env (\w+)\)/); return { name: m[1], env: m[2] }; }
    case 'migrations_touch_table': return { table: t.match(/touch the table (\w+)/)[1] };
    case 'route_clients': return { route: t.match(/route ((?:GET|POST|PUT|PATCH|DELETE) \/[^\s,]+)/)[1] };
    default: throw new Error('kind ' + q.kind);
  }
}
function search(q) {
  const t = q.question;
  switch (q.kind) {
    case 'setting_readers': { const key = (t.match(/settings\.(\w+)/) || [])[1]; if (!key) throw new Error('no settings.<key> in the text (key undefined; T.esc throws)'); return { key }; }
    case 'migrations_touch_table': { const tb = (t.match(/touch the table (\w+)/) || [])[1]; if (!tb) throw new Error('no table'); return { table: tb }; }
    case 'route_clients': { const m = t.match(/route (GET|POST|PUT|PATCH|DELETE) (\/api\/\S+?)[,\s(]/); if (!m) throw new Error('no "route METHOD /api/..." (m is null)'); return { route: m[1] + ' ' + m[2] }; }
    case 'change_reach': { const m = t.match(/([\w./-]+\.(?:py|jsx?|tsx?|mjs))::([\w.]+)/); if (!m) throw new Error('no path::symbol'); return { sym: m[2] }; }
    case 'tests_reach': case 'screen_tables': case 'invariants_on_file': { const m = t.match(/((?:backend|src|technician-app)\/[\w./-]+\.(?:py|jsx?|tsx?|mjs))/); if (!m) throw new Error('no path'); return { path: m[1] }; }
    default: return { note: 'no target needed (' + q.kind + ')' };
  }
}
const rows = [];
for (const q of qs) {
  const r = { id: q.id, split: q.split, kind: q.kind };
  try { r.typed = typed(q); } catch (e) { r.typed_error = e.message; }
  try { r.search = search(q); } catch (e) { r.search_error = e.message; }
  if (r.typed) {
    if (r.typed.sid) r.typed_target_in_facts = nodes.has(r.typed.sid);
    else if (r.typed.path) r.typed_target_in_facts = files.has(r.typed.path);
    else if (r.typed.table) r.typed_target_in_facts = tables.has(r.typed.table);
    else r.typed_target_in_facts = null; // routes and settings: matched by name inside the query
  }
  rows.push(r);
}
// the function text from "function target(q) {" to the first line "}", trailing // comments removed
const fnText = (f) => { const t = fs.readFileSync(f, 'utf8'); const a = t.indexOf('function target(q) {'); const b = t.indexOf('\n}\n', a); return t.slice(a, b).split('\n').map((l) => l.replace(/; \/\/ .*$/, ';')).join('\n'); };
const relT = fnText(path.join(B, 'arms', 'relational', 'tq.js'));
const dkT = fnText(path.join(B, 'arms', 'duckpgq', 'tq.js'));
const sum = (split) => {
  const R = rows.filter((r) => r.split === split);
  return { questions: R.length, typed_errors: R.filter((r) => r.typed_error).map((r) => r.id), search_errors: R.filter((r) => r.search_error).map((r) => r.id),
    typed_target_missing_in_facts: R.filter((r) => r.typed_target_in_facts === false).map((r) => r.id), kinds: [...new Set(R.map((r) => r.kind))].length };
};
const out = { tune: sum('tune'), held_out: sum('held_out'), target_fn_identical_relational_duckpgq: relT === dkT, rows };
fs.writeFileSync(process.argv[3], JSON.stringify(out, null, 1));
console.log(JSON.stringify({ tune: out.tune, held_out: out.held_out, identical: out.target_fn_identical_relational_duckpgq }, null, 1));
for (const r of rows.filter((x) => x.split !== 'tune' && (x.typed_error || x.search_error || x.typed_target_in_facts === false))) console.log(r.id, r.kind, '| typed:', r.typed_error || JSON.stringify(r.typed) + ' in facts ' + r.typed_target_in_facts, '| search:', r.search_error || 'ok');
