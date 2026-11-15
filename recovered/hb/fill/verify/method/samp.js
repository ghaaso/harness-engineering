const { tot, items } = JSON.parse(require('fs').readFileSync('items.json', 'utf8'));
let seed = 20261111; const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
const [cat, n] = [process.argv[2], +process.argv[3]];
const pool = items.filter((i) => i.wt && i.cat === cat && i.cmd); const pick = []; const used = new Set();
while (pick.length < n) { const j = Math.floor(rnd() * pool.length); if (used.has(j)) continue; used.add(j); pick.push(pool[j]); }
const s = { cat, pool: pool.length, sample: pick.map((i, x) => ({ x, tok: Math.round(i.tok), ch: i.ch, w: i.w, cmd: i.cmd })) };
require('fs').writeFileSync('sample-' + cat + '.json', JSON.stringify(s, null, 1));
for (const p of s.sample) console.log(p.x, '[' + p.w + '] tok', p.tok, '|', p.cmd.replace(/\s+/g, ' ').slice(0, 200));
