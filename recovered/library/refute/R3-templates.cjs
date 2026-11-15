// R3 refuter: group transcript tool errors into normalised templates and count recurrence
// across sessions, stores (projects) and days. Read-only over R3-errors.jsonl.
const fs = require('fs');
const rows = fs.readFileSync('R3-errors.jsonl', 'utf8').trim().split('\n').map(JSON.parse);
const KEY = /error|not found|not recognized|denied|too long|invalid|cannot|can't|unable|failed|refused|exceeds|unknown|no such|unexpected|traceback|exception|not a valid|blocked|timed out|timeout|must|has not been|does not exist|missing/i;
function template(r) {
  const lines = r.err.split(/\r?\n/).map((s) => s.trim()).filter(Boolean).filter((s) => !/^Exit code \d+$/i.test(s) && !/^Error: Exit code/i.test(s));
  let l = lines.find((s) => KEY.test(s)) || lines[0] || '';
  l = l.replace(/<[^>]+>/g, '')
    .replace(/[A-Za-z]:[\\/][^\s'"`]*/g, 'PATH').replace(/(\.{0,2}\/[^\s'"`:]+)+/g, 'PATH')
    .replace(/\b[0-9a-f]{7,}\b/gi, 'HEX').replace(/\d+/g, 'N')
    .replace(/'[^']*'/g, "'S'").replace(/"[^"]*"/g, '"S"').replace(/`[^`]*`/g, '`S`')
    .replace(/\s+/g, ' ').trim().toLowerCase();
  return (r.tool + ' | ' + l).slice(0, 110);
}
const G = new Map();
for (const r of rows) {
  const t = template(r);
  if (!G.has(t)) G.set(t, { n: 0, sess: new Set(), stores: new Set(), days: new Set(), wins: new Set(), t0: Infinity, t1: 0, ex: r.cmd.slice(0, 80) });
  const g = G.get(t); g.n++; g.sess.add(r.sess); g.stores.add(r.store); g.wins.add(r.win);
  g.days.add(new Date(r.ts).toISOString().slice(0, 10)); g.t0 = Math.min(g.t0, r.ts); g.t1 = Math.max(g.t1, r.ts);
}
const list = [...G.entries()].map(([t, g]) => ({ t, n: g.n, sess: g.sess.size, stores: g.stores.size, wins: g.wins.size, days: g.days.size, spanDays: +((g.t1 - g.t0) / 864e5).toFixed(1), ex: g.ex }));
list.sort((a, b) => b.sess - a.sess || b.n - a.n);
const multi = list.filter((x) => x.sess >= 2);
console.log('rows', rows.length, 'templates', list.length, 'templates in >=2 sessions', multi.length, 'rows in those', multi.reduce((a, x) => a + x.n, 0));
console.log('templates in >=3 stores', list.filter((x) => x.stores >= 3).length);
for (const x of list.slice(0, 70)) console.log([x.n, x.sess, x.stores, x.days, x.spanDays].join('\t') + '\t' + x.t + '\t<< ' + x.ex.replace(/\s+/g, ' '));
fs.writeFileSync('R3-templates.json', JSON.stringify(list, null, 0));
