'use strict';
// Removed-document dry run check (addendum 4 item 14): for every arm and configuration in tmp/lock/dry/,
// (1) the removed path appears in no answer (shown items, the beyond-budget sample, seeds); (2) against the
// stored TUNE answer of the same task without removal: how many held the document, how many changed.
// Equivalence of the typed arms against the reference arm is in dry/<primary|s1>/sweep/summary*.json.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const B = path.resolve(__dirname, '..', '..');
const D = path.join(__dirname, 'dry');
const rd = (f) => zlib.gunzipSync(fs.readFileSync(f)).toString('utf8').split('\n').filter(Boolean).map(JSON.parse);
const tasks = new Map(fs.readFileSync(path.join(__dirname, 'dry_tasks.jsonl'), 'utf8').split('\n').filter(Boolean).map(JSON.parse).map((t) => [t.id, t]));
const hasPath = (a, p) => a.items.some((i) => i.path === p) || (a.beyond_sample || []).some((i) => (i && (i.path === p || String(i).startsWith(p + ':') || i === p))) || (a.seeds || []).some((s) => s === p || s.startsWith(p + '#'));
const rows = [];
for (const run of ['primary', 's1', 'single']) {
  const R = path.join(D, run);
  if (!fs.existsSync(R)) continue;
  for (const arm of fs.readdirSync(R).filter((x) => fs.existsSync(path.join(R, x, 'tune')))) {
    for (const f of fs.readdirSync(path.join(R, arm, 'tune'))) {
      const hash = f.split('.')[0];
      let sf = path.join(B, 'results', arm, 'tune', f); let against = arm;
      if (!fs.existsSync(sf)) { sf = path.join(B, 'results', 'relational', 'tune', f); against = 'relational'; }
      const st = new Map(rd(sf).map((a) => [a.id, a]));
      const dry = rd(path.join(R, arm, 'tune', f));
      let leak = 0; let storedHad = 0; let changed = 0; let changedWhereHad = 0; let tok = 0;
      for (const a of dry) {
        const p = tasks.get(a.id).remove_paths[0];
        if (hasPath(a, p)) leak++;
        const s = st.get(a.id);
        const had = hasPath(s, p); if (had) storedHad++;
        const ch = JSON.stringify(a.items) !== JSON.stringify(s.items); if (ch) changed++; if (ch && had) changedWhereHad++;
        tok += a.budgets && a.budgets['8000'] ? a.budgets['8000'].used : 0;
      }
      rows.push({ run, arm, hash, tasks: dry.length, removed_path_in_answer: leak, stored_answers_holding_it: storedHad, answers_changed: changed, changed_where_stored_held_it: changedWhereHad, stored_from: against });
    }
  }
}
const eq = {};
for (const run of ['primary', 's1']) {
  const f = path.join(D, run, 'sweep', fs.readdirSync(path.join(D, run, 'sweep')).find((x) => /^summary.*\.json$/.test(x)));
  const s = JSON.parse(fs.readFileSync(f, 'utf8'));
  eq[run] = { tasks: s.tasks, parents: s.parents, mismatches: s.crosscheck.mismatches, pairs: Object.fromEntries(Object.entries(s.crosscheck.pairs).map(([k, v]) => [k, { compared: v.compared, equiv_fail: v.equiv_fail, strict: v.strict, strict_ranked_fail: v.strict_ranked_fail, strict_answer_fail: v.strict_answer_fail, answers_differ: v.answers_differ }])) };
}
const probe = fs.existsSync(path.join(__dirname, 'search_probe.json')) ? JSON.parse(fs.readFileSync(path.join(__dirname, 'search_probe.json'), 'utf8')) : null;
const out = { removed: [...new Set([...tasks.values()].map((t) => t.remove_paths[0]))], tasks: tasks.size, parents: new Set([...tasks.values()].map((t) => t.parent)).size, equivalence: eq, rows, search_probe: probe,
  leaks: rows.reduce((s, r) => s + r.removed_path_in_answer, 0) };
fs.writeFileSync(path.join(__dirname, 'dry_check.json'), JSON.stringify(out, null, 1));
for (const r of rows) console.log(r.run.padEnd(8), r.arm.padEnd(11), r.hash, 'tasks', r.tasks, 'leak', r.removed_path_in_answer, 'stored-held', r.stored_answers_holding_it, 'changed', r.answers_changed, 'changed-where-held', r.changed_where_stored_held_it, 'vs', r.stored_from);
console.log(JSON.stringify({ equivalence: eq, leaks: out.leaks }));
