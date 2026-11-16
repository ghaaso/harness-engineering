// Merges the package-split workflow's assignments into data/overrides.json (moves).
// Usage: node merge-split.cjs [--write]
'use strict';
const fs = require('fs'), path = require('path');
const DATA = path.resolve(__dirname, '..', 'data');
const out = JSON.parse(fs.readFileSync(path.join(DATA, 'gate', 'package-split-output.json'), 'utf8'));
const ovPath = path.join(DATA, 'overrides.json');
const ov = JSON.parse(fs.readFileSync(ovPath, 'utf8'));
const cat = JSON.parse(fs.readFileSync(path.join(DATA, 'catalogue.json'), 'utf8'));
const known = new Map();
cat.themes.forEach(t => t.ideas.forEach(i => known.set(i.k, i)));

const moves = Object.assign({}, ov.moves);
const conflicts = [], unknown = [], added = [];
const seen = new Map();
out.result.forEach(x => (x.assign && x.assign.assignments || []).forEach(a => {
  let k = a.k;
  // The WP10 assigner keyed two rows as method#9; the first (wave board) is really method#17.
  if (x.w === 'WP10' && k === 'method#9') {
    const n = (seen.get('WP10:method#9') || 0) + 1; seen.set('WP10:method#9', n);
    if (n === 1) k = 'method#17';
  }
  if (!known.has(k)) unknown.push(`${x.w}\t${k}\t${a.to}`);
  if (moves[k] && moves[k] !== a.to) { conflicts.push(`${k}\texisting ${moves[k]}\tsplit ${a.to}\t${a.reason}`); return; }
  if (!moves[k]) { moves[k] = a.to; added.push(`${k}\t${a.to}`); }
}));
console.log('added', added.length, 'conflicts (existing kept)', conflicts.length, 'unknown keys', unknown.length);
conflicts.forEach(c => console.log('CONFLICT\t' + c));
unknown.forEach(u => console.log('UNKNOWN\t' + u));
// Ideas still sitting in a package that no longer exists, after these moves.
const OLD = new Set(['WP2', 'WP6', 'WP10']);
const left = [];
known.forEach((i, k) => { const wp = moves[k] || i.wp; if (OLD.has(wp)) left.push(`${k}\t${i.id}\t${wp}\t${i.name}`); });
console.log('still in an old package:', left.length);
left.forEach(l => console.log('LEFT\t' + l));
if (process.argv.includes('--write')) {
  ov.moves = moves;
  fs.writeFileSync(ovPath, JSON.stringify(ov, null, 1));
  console.log('wrote', ovPath);
}
