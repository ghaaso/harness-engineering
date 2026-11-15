const { S, run } = require('./attr.js');
let sumNoBreak = 0, minFrac = 1; for (const s of S) { const C = s.calls; for (let k = 0; k + 1 < C.length; k++) { const a = C[k], d = C[k + 1].ctx - a.ctx; if (a.inc.some((x) => x.cat === 'summary')) { if (d >= -0.2 * a.ctx) sumNoBreak++; else minFrac = Math.min(minFrac, -d / a.ctx); } } }
// summaries in the last call of a file (no next call)
let sumLast = 0; for (const s of S) { const c = s.calls[s.calls.length - 1]; if (c && c.inc.some((x) => x.cat === 'summary')) sumLast++; }
console.log('summary gaps without a >20% drop', sumNoBreak, 'smallest compaction drop', minFrac.toFixed(2), 'summary after last call', sumLast);
const pick = (r) => { const o = {}; for (const k of ['segs', 'attM', 'fetched', 'own', 'start', 'unclassified', 'messages', 'rest', 'first', 'again']) o[k] = r[k]; return o; };
for (const thr of [0.02, 0.1, 0.2, 0.5, 0.6]) console.log('thr', thr, JSON.stringify(pick(run({ thr }))));
console.log('break on summary only', JSON.stringify(pick(run({ breakAt: (C, en) => C[en].inc.some((x) => x.cat === 'summary') }))));
