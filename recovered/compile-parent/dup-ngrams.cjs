// Finds a run of N or more words that appears twice inside one text field (a sign of a botched fix).
// Usage: node dup-ngrams.cjs <data dir> [N]
'use strict';
const path = require('path');
const D = process.argv[2];
const N = Number(process.argv[3] || 5);
const words = s => String(s || '').toLowerCase().replace(/\[[a-z]\]/g, ' ').replace(/[^a-z0-9%’' -]+/g, ' ').split(/\s+/).filter(Boolean);
function dups(s) {
  const w = words(s); const seen = new Map(); const out = new Set();
  for (let i = 0; i + N <= w.length; i++) {
    const k = w.slice(i, i + N).join(' ');
    if (seen.has(k) && i - seen.get(k) >= N) out.add(k); else if (!seen.has(k)) seen.set(k, i);
  }
  return [...out];
}
const report = (where, s) => { const d = dups(s); if (d.length) console.log(where, '|', d.slice(0, 3).join(' || ')); };
const g = require(path.join(D, 'glossary.json'));
g.terms.forEach(t => report('gloss ' + t.key + ' ' + t.term, t.definition + ' ' + t.origin));
const c = require(path.join(D, 'catalogue.json'));
c.themes.forEach(t => t.ideas.forEach(i => ['name', 'how', 'problem', 'stands', 'next', 'origin'].forEach(f => report('idea ' + i.id + ' ' + f, i[f]))));
const r = require(path.join(D, 'register.json'));
r.bottlenecks.forEach(b => Object.keys(b).forEach(f => { if (typeof b[f] === 'string' && b[f].length > 40) report('reg ' + b.id + ' ' + f, b[f]); }));
const p = require(path.join(D, 'packages.json'));
p.packages.forEach(k => Object.keys(k).forEach(f => { if (typeof k[f] === 'string' && k[f].length > 40) report('wp ' + k.id + ' ' + f, k[f]); }));
console.log('done, N =', N);
