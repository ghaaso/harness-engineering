// Cost-weighted sample of episodes for manual reading. node dump2.js <product|program> <n> <seed> <minCalls>
const fs = require('fs'), path = require('path');
const LIM = +process.env.LIM || 14;
const [cls, n, seed, minCalls] = [process.argv[2], +process.argv[3] || 40, +process.argv[4] || 1, +process.argv[5] || 1];
const CPT = JSON.parse(fs.readFileSync(path.join(__dirname, 'out', 'cpt.json'), 'utf8')).median;
const EP = fs.readFileSync(path.join(__dirname, 'out', 'episodes-labelled.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const strip = (q) => String(q || '').replace(/^(\s*(cd\s+("[^"]*"|\S+)\s*(&&|;)|[A-Z]\w*=("[^"]*"|\S+);?)\s*)+/, '');
const short = (s, k) => String(s || '').replace(/\s+/g, ' ').slice(0, k);
const pool = EP.map((e, idx) => ({ e, idx })).filter(({ e }) => ((cls === 'product') === (e.tcls !== 'program')) && e.calls.length >= minCalls);
for (const p of pool) p.w = p.e.calls.reduce((a, c) => a + (c.rc / CPT) * (c.later || 0) + (c.sctx || 0), 0);
const W = pool.reduce((a, p) => a + p.w, 0);
let x = seed; const rnd = () => ((x = (x * 1103515245 + 12345) % 2147483648) / 2147483648);
const chosen = new Map();
let guard = 0;
while (chosen.size < Math.min(n, pool.length) && guard++ < 100000) { let r = rnd() * W; for (const p of pool) { r -= p.w; if (r <= 0) { chosen.set(p.idx, p); break; } } }
const list = [...chosen.values()].sort((a, b) => a.idx - b.idx);
for (const { e, idx, w } of list) {
  const fetched = e.calls.reduce((a, c) => a + c.rc / CPT, 0);
  console.log(`#${idx} [${e.folder}${e.sub ? '/sub' : ''}] calls=${e.calls.length} steps=${e.steps} fetched=${Math.round(fetched)} weight=${Math.round(w / 1000)}k end=${short(e.end, 80)}`);
  console.log('  TASK: ' + short(e.task, 160));
  if (e.prevText) console.log('  PREV: ' + short(e.prevText, 200));
  if (e.intent && e.intent !== e.prevText) console.log('  SAYS: ' + short(e.intent, 260));
  for (const c of e.calls.slice(0, LIM)) console.log(`   - [${c.form}] ${c.n === 'Bash' || c.n === 'PowerShell' ? short(strip(c.q), 170) : c.n + ' ' + short(c.t, 80) + (c.q ? ' q=' + short(c.q, 80) : '')} ~${Math.round(c.rc / CPT)}t x${c.later}${c.named === -1 ? ' NEVER-NAMED' : ''}${c.empty && c.k !== 'look-read' ? ' EMPTY' : ''}`);
  if (e.calls.length > LIM) console.log(`   ... ${e.calls.length - LIM} more: ` + [...new Set(e.calls.slice(LIM).map((c) => c.form))].join(', '));
  if (e.answer) console.log('  ANSWER: ' + short(e.answer, 200));
}
