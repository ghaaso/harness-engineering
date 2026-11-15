// Saves the seven-metric classification (a workflow result) into data/metrics/classified.json and prints tallies.
// Usage: node metrics-tally.cjs [workflow-output.json]   (with no argument it only tallies the saved file)
'use strict';
const fs = require('fs'), path = require('path');
const DATA = path.resolve(__dirname, '..', 'data');
const OUT = path.join(DATA, 'metrics', 'classified.json');
if (process.argv[2]) {
  const raw = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  const r = raw.result || raw;
  fs.writeFileSync(OUT, JSON.stringify({ note: 'Seven-metric classification by eight Sonnet classifiers (14 Nov 2026); blind = an Opus second reading of every sixth item.', agreement: r.agreement, items: r.items, blind: r.blind, diffs: r.diffs }, null, 1));
}
const C = JSON.parse(fs.readFileSync(OUT, 'utf8'));
const cat = JSON.parse(fs.readFileSync(path.join(DATA, 'catalogue.json'), 'utf8'));
const reg = JSON.parse(fs.readFileSync(path.join(DATA, 'register.json'), 'utf8'));
const ideaIds = new Set([].concat(...cat.themes.map(t => t.ideas.map(i => i.id))));
const bnIds = new Set(reg.bottlenecks.map(b => b.id));
const by = {}; C.items.forEach(i => { by[i.id] = i; });
const missing = [...ideaIds, ...bnIds].filter(id => !by[id]);
const extra = C.items.filter(i => !ideaIds.has(i.id) && !bnIds.has(i.id)).map(i => i.id);
console.log('classified', C.items.length, 'missing', missing.length, missing.slice(0, 20).join(' '), 'unknown ids', extra.length, extra.slice(0, 10).join(' '));
const METRICS = ['throughput', 'efficiency', 'token_count', 'token_cost', 'time', 'quality', 'hallucination', 'none'];
const tally = (ids, f) => { const t = {}; ids.forEach(id => { const x = by[id]; if (!x) return; const k = f(x); (Array.isArray(k) ? k : [k]).forEach(v => { t[v] = (t[v] || 0) + 1; }); }); return t; };
const show = (title, t, order) => console.log(title + ': ' + (order || Object.keys(t).sort((a, b) => t[b] - t[a])).map(k => `${k} ${t[k] || 0}`).join(', '));
show('IDEAS primary', tally(ideaIds, x => x.primary), METRICS);
show('IDEAS any (each metric an idea lists)', tally(ideaIds, x => x.metrics), METRICS.slice(0, 7));
show('BOTTLENECKS primary', tally(bnIds, x => x.primary), METRICS);
show('BOTTLENECKS any', tally(bnIds, x => x.metrics), METRICS.slice(0, 7));
show('IDEAS mechanism', tally(ideaIds, x => x.mechanism));
show('BOTTLENECKS mechanism', tally(bnIds, x => x.mechanism));
show('IDEAS general', tally(ideaIds, x => String(x.general)));
show('BOTTLENECKS general', tally(bnIds, x => String(x.general)));
show('confidence', tally([...ideaIds, ...bnIds], x => x.confidence));
console.log('blind agreement', JSON.stringify(C.agreement), 'diffs', C.diffs.length);
// Mechanism x metric for bottlenecks (any metric listed).
const mechs = Object.keys(tally(bnIds, x => x.mechanism)).sort();
console.log('\nBOTTLENECKS mechanism x metric (any):');
console.log('mechanism'.padEnd(20) + METRICS.slice(0, 7).map(m => m.slice(0, 6).padStart(8)).join(''));
mechs.forEach(m => { const ids = [...bnIds].filter(id => by[id] && by[id].mechanism === m); console.log(m.padEnd(20) + METRICS.slice(0, 7).map(k => String(ids.filter(id => by[id].metrics.includes(k)).length).padStart(8)).join('') + '   n=' + ids.length); });
