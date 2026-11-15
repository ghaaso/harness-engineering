'use strict';
// Held-out questions (lock lane, item h): the kinds of the 30 held-out questions, whether each typed and
// search arm dispatches every kind (read from their code as text; no arm code is loaded or run), and a
// format check of the question texts with COPIES of the target-extraction patterns written in the arms'
// tq.js files (relational, duckpgq and, through relational, ladybug: target(); search: its own patterns).
// No store is opened and no answer is produced.
const fs = require('fs');
const path = require('path');
const B = path.resolve(__dirname, '..', '..');
const qs = fs.readFileSync(path.join(B, 'tasks', 'tq_questions.jsonl'), 'utf8').split('\n').filter(Boolean).map(JSON.parse);
const ho = qs.filter((q) => q.split === 'held_out');
const kinds = {}; for (const q of ho) kinds[q.kind] = (kinds[q.kind] || 0) + 1;
const tuneKinds = new Set(qs.filter((q) => q.split === 'tune').map((q) => q.kind));
const src = (a) => fs.readFileSync(path.join(B, 'arms', a, 'tq.js'), 'utf8');
const handled = {
  relational: (k) => new RegExp("case '" + k + "'").test(src('relational')),
  duckpgq: (k) => new RegExp("case '" + k + "'").test(src('duckpgq')),
  ladybug: (k) => new RegExp('^  ' + k + '\\(g, tg\\)', 'm').test(src('ladybug')) && /require\('\.\.\/relational\/tq'\)/.test(src('ladybug')),
  search: (k) => new RegExp('^H\\.' + k + ' = ', 'm').test(src('search')),
};
// copy of target() in arms/relational/tq.js and arms/duckpgq/tq.js (identical text)
function target(q) {
  const t = q.question.replace(/^\[repo at commit \w+\]\s*/, '');
  const ps0 = t.match(/([\w./-]+\.(?:py|tsx|ts|jsx|js|mjs))::([\w.]+)/);
  const ps = ps0 && [ps0[0], ps0[1], ps0[2].replace(/\.+$/, '')];
  const pathOnly = t.match(/([\w-]+\/[\w./-]+\.(?:py|tsx|ts|jsx|js|mjs))/);
  switch (q.kind) {
    case 'screen_tables': case 'invariants_on_file': return pathOnly && pathOnly[1];
    case 'tests_reach': case 'change_reach': return ps && ps[1] + '#' + ps[2];
    case 'other_half': { if (ps) return ps[1] + '#' + ps[2]; const m = t.match(/^([\w.]+) \(([\w./-]+)\)/); return m && m[2] + '#' + m[1]; }
    case 'setting_readers': { const m = t.match(/setting (\w+) \(settings\.\w+, env (\w+)\)/); return m && m[1] + '/' + m[2]; }
    case 'migrations_touch_table': { const m = t.match(/touch the table (\w+)/); return m && m[1]; }
    case 'route_clients': { const m = t.match(/route ((?:GET|POST|PUT|PATCH|DELETE) \/[^\s,]+)/); return m && m[1]; }
    default: return null;
  }
}
// copies of the search arm's patterns (arms/search/tq.js lines 16, 17, 153, 170, 198)
function searchTarget(q) {
  const s = q.question;
  switch (q.kind) {
    case 'setting_readers': return (s.match(/settings\.(\w+)/) || [])[1] && (s.match(/env (\w+)/) || [])[1] ? 'ok' : null;
    case 'migrations_touch_table': return (s.match(/touch the table (\w+)/) || [])[1] || null;
    case 'route_clients': { const m = s.match(/route (GET|POST|PUT|PATCH|DELETE) (\/api\/\S+?)[,\s(]/); return m ? m[1] + ' ' + m[2] : null; }
    case 'screen_tables': case 'invariants_on_file': return (s.match(/((?:backend|src|technician-app)\/[\w./-]+\.(?:py|jsx?|tsx?|mjs))/) || [])[1] || (s.match(/([\w./-]+\.(?:py|jsx?|tsx?|mjs))/) || [])[1] || null;
    default: { const m = s.match(/([\w./-]+\.(?:py|jsx?|tsx?|mjs))::([\w.]+)/); return m ? m[1] + '#' + m[2] : ((s.match(/([\w./-]+\.(?:py|jsx?|tsx?|mjs))/) || [])[1] || null); }
  }
}
const out = { held_out_questions: ho.length, kinds, kinds_not_in_tune: Object.keys(kinds).filter((k) => !tuneKinds.has(k)), dispatch: {}, unhandled: [], typed_target_parse_failures: [], search_target_parse_failures: [] };
for (const a of Object.keys(handled)) out.dispatch[a] = Object.fromEntries(Object.keys(kinds).map((k) => [k, handled[a](k)]));
for (const [a, m] of Object.entries(out.dispatch)) for (const [k, v] of Object.entries(m)) if (!v) out.unhandled.push(a + ':' + k);
for (const q of ho) { if (!target(q)) out.typed_target_parse_failures.push(q.id + ':' + q.kind); if (!searchTarget(q)) out.search_target_parse_failures.push(q.id + ':' + q.kind); }
fs.writeFileSync(path.join(__dirname, 'tq_kinds.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
