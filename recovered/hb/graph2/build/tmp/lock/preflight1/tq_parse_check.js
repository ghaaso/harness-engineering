'use strict';
// Pre-flight fix, round 1: the shared TQ target parser (arms/common/tqtarget.js) against the parsers it
// replaces. Reads the question TEXT only (inputs; held-out lines are read to check that every input
// parses). Opens no store, loads no arm, produces no answer, reads nothing under sealed/ or audit/.
//   node tmp/lock/preflight1/tq_parse_check.js [build root]  -> tmp/lock/preflight1/tq_parse_check.json
const fs = require('fs');
const path = require('path');
const B = process.argv[2] || path.resolve(__dirname, '..', '..', '..');
const { target } = require(path.join(B, 'arms/common/tqtarget.js'));

// the relational arm's target() before this fix (arms/relational/tq.js lines 162-180, copied verbatim;
// the DuckPGQ copy was identical, the LadybugDB arm imported this one)
function oldTarget(q) {
  const t = q.question.replace(/^\[repo at commit \w+\]\s*/, '');
  const ps0 = t.match(/([\w./-]+\.(?:py|tsx|ts|jsx|js|mjs))::([\w.]+)/);
  const ps = ps0 && [ps0[0], ps0[1], ps0[2].replace(/\.+$/, '')];
  const pathOnly = t.match(/([\w-]+\/[\w./-]+\.(?:py|tsx|ts|jsx|js|mjs))/);
  switch (q.kind) {
    case 'screen_tables': case 'invariants_on_file': return { path: pathOnly[1] };
    case 'tests_reach': case 'change_reach': return { sid: 'sym:' + ps[1] + '#' + ps[2] };
    case 'other_half': {
      if (ps) return { sid: 'sym:' + ps[1] + '#' + ps[2] };
      const m = t.match(/^([\w.]+) \(([\w./-]+)\)/);
      return { sid: 'sym:' + m[2] + '#' + m[1] };
    }
    case 'setting_readers': { const m = t.match(/setting (\w+) \(settings\.\w+, env (\w+)\)/); return { name: m[1], env: m[2] }; }
    case 'migrations_touch_table': return { table: t.match(/touch the table (\w+)/)[1] };
    case 'route_clients': return { route: t.match(/route ((?:GET|POST|PUT|PATCH|DELETE) \/[^\s,]+)/)[1] };
    default: throw new Error('kind ' + q.kind);
  }
}
// the search arm's extraction before this fix (arms/search/tq.js lines 153 and 198)
function oldSearch(q) {
  if (q.kind === 'setting_readers') {
    const key = (q.question.match(/settings\.(\w+)/) || [])[1]; const env = (q.question.match(/env (\w+)/) || [])[1];
    if (!key) throw new Error('no key');
    return { key, env: env || null };
  }
  if (q.kind === 'route_clients') { const m = q.question.match(/route (GET|POST|PUT|PATCH|DELETE) (\/api\/\S+?)[,\s(]/); return { routes: [m[1] + ' ' + m[2]] }; }
  return null;
}
// what the search arm now derives from the shared target (arms/search/tq.js)
function newSearch(tg, kind) {
  if (kind === 'setting_readers') return { key: tg.config || (tg.name ? tg.name.replace(/^shop\//, '') : null), env: tg.env || null };
  if (kind === 'route_clients') return { routes: tg.routes || [tg.route] };
  return null;
}

const qs = fs.readFileSync(path.join(B, 'tasks/tq_questions.jsonl'), 'utf8').split('\n').filter(Boolean).map(JSON.parse);
const out = { questions: qs.length, by_split: {}, typed: { old_failed: [], new_failed: [], tune_changed: [], heldout_changed_where_old_parsed: [] }, search: { old_failed: [], new_failed: [], tune_changed: [], heldout_changed_where_old_parsed: [] }, new_targets_heldout_failing_before: [] };
for (const q of qs) {
  out.by_split[q.split] = (out.by_split[q.split] || 0) + 1;
  let o = null; let n = null; let oe = null; let ne = null;
  try { o = oldTarget(q); } catch (e) { oe = e.message; out.typed.old_failed.push(q.id); }
  try { n = target(q); } catch (e) { ne = e.message; out.typed.new_failed.push({ id: q.id, error: ne }); }
  if (!oe && !ne && JSON.stringify(o) !== JSON.stringify(n)) (q.split === 'tune' ? out.typed.tune_changed : out.typed.heldout_changed_where_old_parsed).push({ id: q.id, old: o, new: n });
  if (oe && q.split === 'tune') out.typed.tune_changed.push({ id: q.id, old: 'error', new: n });
  if (oe && !ne) out.new_targets_heldout_failing_before.push({ id: q.id, split: q.split, kind: q.kind, target: n });
  if (q.kind === 'setting_readers' || q.kind === 'route_clients') {
    let so = null; let sn = null; let soe = null;
    try { so = oldSearch(q); } catch (e) { soe = e.message; out.search.old_failed.push(q.id); }
    if (n) sn = newSearch(n, q.kind); else out.search.new_failed.push(q.id);
    if (!soe && sn && JSON.stringify(so) !== JSON.stringify(sn)) (q.split === 'tune' ? out.search.tune_changed : out.search.heldout_changed_where_old_parsed).push({ id: q.id, old: so, new: sn });
    if (soe && q.split === 'tune') out.search.tune_changed.push({ id: q.id, old: 'error', new: sn });
  }
}
out.verdict = out.typed.new_failed.length === 0 && out.search.new_failed.length === 0 && out.typed.tune_changed.length === 0 && out.search.tune_changed.length === 0 && out.typed.heldout_changed_where_old_parsed.length === 0 ? 'ok' : 'CHECK';
fs.writeFileSync(path.join(__dirname, 'tq_parse_check.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
