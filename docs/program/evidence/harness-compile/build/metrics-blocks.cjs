// Groups every bottleneck and idea into the bottleneck blocks of the short edition's Part 2 (the owner's seven-metric lens)
// and writes one dossier per block: the full records a writer or checker needs.
// Reads data/metrics/classified.json (+ data/added.json for records added later), writes data/metrics/block-<key>.md and blocks.json.
// Usage: node metrics-blocks.cjs
'use strict';
const fs = require('fs'), path = require('path');
const DATA = path.resolve(__dirname, '..', 'data');
const M = path.join(DATA, 'metrics');
const rd = f => JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8'));
const cat = rd('catalogue.json'), reg = rd('register.json'), C = rd('metrics/classified.json');
const added = fs.existsSync(path.join(DATA, 'added.json')) ? rd('added.json') : {};
const LBL = ['Parked', 'Idea', 'Designed', 'Built', 'Tested', 'In use'];
const METRICS = ['throughput', 'efficiency', 'token_count', 'token_cost', 'time', 'quality', 'hallucination'];

// The blocks, in the order the edition prints them: what limits any team building with AI agents first, our own PC last.
const BLOCKS = [
  { key: 'context', mechs: ['context_growth'], local: false },
  { key: 'claims', mechs: ['unverified_claims'], local: false },
  { key: 'orchestration', mechs: ['serial_gate', 'parallelism', 'usage_limit'], local: false },
  { key: 'start', mechs: ['fixed_start', 'model_tier'], local: false },
  { key: 'orientation', mechs: ['orientation'], local: false },
  { key: 'memory', mechs: ['no_memory'], local: false },
  { key: 'rework', mechs: ['rework', 'late_discovery'], local: false },
  { key: 'checks', mechs: ['check_capacity'], local: false },
  { key: 'measurement', mechs: ['measurement'], local: false },
  { key: 'method', mechs: ['method', 'other'], local: false },
  { key: 'local', mechs: ['machine', 'human_wait'], local: true },
];
// A record that plainly belongs to a second block as well (it has two sides).
const ALSO = { B04: ['orchestration'], 'PR-PHASESIZE': ['orchestration'], B16: ['orchestration'], 'PR-FALSEGREEN': ['claims'], 'PR-DOCDRIFT': ['claims'], 'PR-BRIEFFACTS': ['claims'], 'LIB-EVAL': ['orientation'] };

const cls = {}; C.items.forEach(i => { cls[i.id] = i; });
// Records added after the classification carry their own.
(added.ideas || []).forEach(a => { cls[a.id] = { id: a.id, primary: a.primary, metrics: a.metrics, mechanism: a.mechanism, general: a.general !== false, confidence: 'high', why: 'set by hand when added' }; });
(added.register || []).forEach(a => { cls[a.id] = { id: a.id, primary: a.primary, metrics: a.metrics, mechanism: a.mechanism, general: a.general !== false, confidence: 'high', why: 'set by hand when added' }; });
const ideas = [].concat(...cat.themes.map(t => t.ideas.map(i => Object.assign({ theme: t.code }, i))));
const noCls = [...ideas.map(i => i.id), ...reg.bottlenecks.map(b => b.id)].filter(id => !cls[id]);
if (noCls.length) { console.log('NOT CLASSIFIED: ' + noCls.join(' ')); process.exit(1); }

const out = { metrics: METRICS, blocks: [] };
BLOCKS.forEach(B => {
  const inBlock = id => B.mechs.includes(cls[id].mechanism) || (ALSO[id] || []).includes(B.key);
  const bns = reg.bottlenecks.filter(b => inBlock(b.id));
  const ids = ideas.filter(i => inBlock(i.id)).sort((a, b) => b.maturity - a.maturity);
  const hit = {}; METRICS.forEach(m => { hit[m] = { bottlenecks: bns.filter(b => cls[b.id].metrics.includes(m)).length, primary: bns.filter(b => cls[b.id].primary === m).length, ideas: ids.filter(i => cls[i.id].metrics.includes(m)).length }; });
  const st = { open: 0, 'partly closed': 0, closed: 0 }; bns.forEach(b => { st[b.stateKey] = (st[b.stateKey] || 0) + 1; });
  const mat = [0, 0, 0, 0, 0, 0]; ids.forEach(i => { mat[i.maturity] += 1; });
  out.blocks.push({ key: B.key, local: B.local, mechs: B.mechs, bottlenecks: bns.map(b => b.id), ideas: ids.map(i => i.id), hit, states: st, maturity: mat });
  let t = `# Dossier: block "${B.key}" (mechanisms: ${B.mechs.join(', ')})\n\n${bns.length} bottlenecks and ${ids.length} ideas. Numbers carry tags: [M] measured, [E] estimated, [G] guess, [S] setting or outside figure, [T] target, [I] illustrative.\n\n## Bottlenecks\n`;
  bns.forEach(b => { const c = cls[b.id]; t += `\n### ${b.id} · ${b.name}\nfamily ${b.family}; state: ${b.state}; package ${b.wp || '-'}; metrics: ${c.metrics.join(', ') || 'none'} (primary ${c.primary})\nwhat: ${b.what}\nevidence: ${b.evidence}\nwhat fixing it unlocks: ${b.potential}\nfirst step: ${b.first_step}\n`; });
  t += `\n## Ideas (most mature first)\n`;
  ids.forEach(i => { const c = cls[i.id]; t += `\n### ${i.id} · ${i.name}\nstage: ${LBL[i.maturity]}${i.added ? ' · ADDED FROM CHAT: ' + i.added : ''}; package ${i.wp || '-'}; metrics: ${c.metrics.join(', ') || 'none'} (primary ${c.primary}); answers: ${(i.bottlenecks || []).join(', ') || '-'}\nproblem: ${i.problem}\nhow: ${i.how}\nwhere it stands: ${i.stands}\nnext: ${i.next}\norigin: ${i.origin}\n`; });
  fs.writeFileSync(path.join(M, `block-${B.key}.md`), t);
  console.log(`${B.key.padEnd(14)} bottlenecks ${String(bns.length).padStart(3)}  ideas ${String(ids.length).padStart(3)}  ${t.length} chars  metrics(bn any): ${METRICS.map(m => m.slice(0, 5) + ' ' + hit[m].bottlenecks).join(', ')}`);
});
const placed = new Set([].concat(...out.blocks.map(b => b.bottlenecks.concat(b.ideas))));
const rest = [...ideas.map(i => i.id), ...reg.bottlenecks.map(b => b.id)].filter(id => !placed.has(id));
out.unplaced = { bottlenecks: rest.filter(id => reg.bottlenecks.some(b => b.id === id)), ideas: rest.filter(id => !reg.bottlenecks.some(b => b.id === id)).length };
// Totals by metric over everything, for the charts.
out.totals = {}; METRICS.forEach(m => { out.totals[m] = { bottlenecksPrimary: reg.bottlenecks.filter(b => cls[b.id].primary === m).length, bottlenecksAny: reg.bottlenecks.filter(b => cls[b.id].metrics.includes(m)).length, ideasPrimary: ideas.filter(i => cls[i.id].primary === m).length, ideasAny: ideas.filter(i => cls[i.id].metrics.includes(m)).length }; });
out.general = { ideas: ideas.filter(i => cls[i.id].general).length, bottlenecks: reg.bottlenecks.filter(b => cls[b.id].general).length };
fs.writeFileSync(path.join(M, 'blocks.json'), JSON.stringify(out, null, 1));
console.log('unplaced (method/other): bottlenecks ' + out.unplaced.bottlenecks.join(' ') + '; ideas ' + out.unplaced.ideas);
