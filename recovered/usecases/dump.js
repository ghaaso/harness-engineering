// Dump compact views of episodes for reading. usage: node dump.js <class: product|program> <seed> <n> [minCalls]
const fs = require('fs'), path = require('path');
const [cls, seed, n, minCalls] = [process.argv[2], +process.argv[3] || 1, +process.argv[4] || 40, +process.argv[5] || 1];
const EP = fs.readFileSync(path.join(__dirname, 'out', 'episodes.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const pick = EP.map((e, idx) => ({ e, idx })).filter(({ e }) => (cls === 'product' ? e.tcls !== 'program' : e.tcls === 'program') && e.calls.length >= minCalls);
let x = seed; const rnd = () => ((x = (x * 1103515245 + 12345) % 2147483648) / 2147483648);
const sample = []; const used = new Set(); while (sample.length < Math.min(n, pick.length)) { const j = Math.floor(rnd() * pick.length); if (!used.has(j)) { used.add(j); sample.push(pick[j]); } }
const strip = (q) => String(q || '').replace(/^(\s*(cd\s+("[^"]*"|\S+)\s*(&&|;)|[A-Z]\w*=("[^"]*"|\S+);?)\s*)+/, '');
const short = (s, k) => String(s || '').replace(/\s+/g, ' ').slice(0, k);
for (const { e, idx } of sample) {
  console.log(`#${idx} [${e.tcls}${e.sub ? '/sub' : ''} ${e.folder}] steps=${e.steps} end=${short(e.end, 70)}`);
  console.log('  TASK: ' + short(e.task, 200)); console.log('  PREV: ' + short(e.prevText, 160));
  console.log('  INTENT: ' + short(e.intent, 260));
  for (const c of e.calls) console.log(`   - ${c.k} ${c.z} ${short(c.t, 70)} ${c.q ? 'q=' + short(strip(c.q), 150) : ''} rc=${c.rc}${c.empty ? ' EMPTY' : ''}${c.err ? ' ERR' : ''}`);
  if (e.answer) console.log('  ANSWER: ' + short(e.answer, 160));
}
