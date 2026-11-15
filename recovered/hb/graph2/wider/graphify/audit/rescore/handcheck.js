'use strict';
// (1) For all 770 held-out tasks: the packed order equals graphify's printed file order (first
// occurrence, seed file left out). (2) 10 tasks printed in full for a hand check: graphify's printed
// files, the packed answer at 8,000 tokens, the reference, and the credit worked out line by line.
const fs = require('fs'); const path = require('path'); const crypto = require('crypto'); const L = require('./lib');
const refs = L.refs(); const SETS = ['T1', 'T1x', 'T2', 'T3', 'T4'];
const ans = new Map(); for (const s of SETS) for (const r of L.readGz(path.join(L.G, 'answers/heldout', s + '.jsonl.gz'))) ans.set(r.id, r);
const calls = new Map();
for (const f of fs.readdirSync(path.join(L.G, 'answers/heldout/calls')).filter((x) => x.endsWith('.jsonl.gz'))) for (const c of L.readGz(path.join(L.G, 'answers/heldout/calls', f))) calls.set(c.id, c);
let orderOk = 0; const orderBad = [];
for (const [id, a] of ans) {
  const c = calls.get(id); const seen = [];
  for (const it of c.calls['query:seed:full:d3'].items) if (it.file && it.file !== c.seed.path && !seen.includes(it.file)) seen.push(it.file);
  const got = [...a.items.map((x) => x.path), ...(a.beyond_sample || [])].slice(0, a.items.length);
  if (JSON.stringify(got) === JSON.stringify(seen.slice(0, got.length)) && a.n_units === seen.length) orderOk++; else orderBad.push(id);
}
// grader per-task values
const gt = new Map(); for (const r of L.readGz(path.join(L.G, 'grader/heldout/tasks.jsonl.gz'))) if (r.arm === 'graphify' || /graphify/.test(r.key || '')) gt.set(r.id, r);
// pick 10: 4 T1, 2 T2, 2 T3, 1 T1x, 1 T4, by smallest sha256(id + 'refuter1')
const pick = (set, n) => [...ans.keys()].filter((i) => ans.get(i).set === set).sort((x, y) => crypto.createHash('sha256').update(x + 'refuter1').digest('hex').localeCompare(crypto.createHash('sha256').update(y + 'refuter1').digest('hex'))).slice(0, n);
const ids = [...pick('T1', 4), ...pick('T2', 2), ...pick('T3', 2), ...pick('T1x', 1), ...pick('T4', 1)];
const lines = [];
const P = (s) => lines.push(s);
for (const id of ids) {
  const a = ans.get(id); const c = calls.get(id); const ref = refs.get(id); const call = c.calls['query:seed:full:d3'];
  P(`=== ${id} (${a.set}) parent ${a.parent.slice(0, 10)} seed ${c.seed.path}${c.seed.symbol ? '::' + c.seed.symbol.name : ''} def_rule=${c.seed_res.def_rule}`);
  P(`graphify argv: ${call.argv.join(' ')} | exit ${call.exit} | printed nodes ${call.items.length} | header: ${(call.header && call.header.first || '').slice(0, 160)}`);
  const seen = []; for (const it of call.items) if (it.file && it.file !== c.seed.path && !seen.includes(it.file)) seen.push(it.file);
  P(`graphify file order (first 20 of ${seen.length}): ${seen.slice(0, 20).join(', ')}`);
  const b = a.budgets['8000'];
  P(`packed at 8000: n_full ${b.n_full}, used ${b.used}, cut ${b.cut ? a.items[b.n_full].path + ' path_shown=' + b.cut.path_shown + ' lines=' + b.cut.shown.length : 'none'}`);
  const s = L.shown(a, 8000);
  const fileHits = ref.files.map((x) => `${s.paths.has(x.path) ? 'HIT ' : 'miss'} ${x.path}${s.paths.has(x.path) ? ' (rank ' + (seen.indexOf(x.path) + 1) + ')' : ' (graphify rank ' + (seen.indexOf(x.path) + 1 || 'absent') + ')'}`);
  const defHits = ref.defs.map((x) => { const ls = s.lines.get(x.path); const hit = ls && [...ls].some((l) => l >= x.start && l <= x.end); return `${hit ? 'HIT ' : 'miss'} ${x.path}::${x.name} [${x.start}-${x.end}]${ls ? ' shown lines in file: ' + [...ls].filter((l) => l >= x.start - 2 && l <= x.end + 2).slice(0, 6).join(',') : ' file not shown'}`; });
  P('reference files:'); fileHits.forEach((x) => P('  ' + x)); P('reference definitions:'); defHits.forEach((x) => P('  ' + x));
  const hand = (fileHits.filter((x) => x.startsWith('HIT')).length + defHits.filter((x) => x.startsWith('HIT')).length) / (ref.files.length + ref.defs.length);
  const g = gt.get(id);
  P(`credit by hand: ${fileHits.filter((x) => x.startsWith('HIT')).length} files + ${defHits.filter((x) => x.startsWith('HIT')).length} defs of ${ref.files.length + ref.defs.length} = ${hand.toFixed(4)} | my scorer ${L.scoreTask(a, ref).r8000.toFixed(4)} | grader ${g ? (g.r8000 ?? g.recall8000 ?? JSON.stringify(g).slice(0, 80)) : 'n/a'}`);
  P('');
}
const out = { order_equal_all: orderOk, order_differs: orderBad, picked: ids };
fs.writeFileSync(path.join(__dirname, 'out/handcheck.txt'), lines.join('\n'));
fs.writeFileSync(path.join(__dirname, 'out/handcheck.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out)); console.log('grader task keys', JSON.stringify([...gt.values()][0] || null).slice(0, 300));
