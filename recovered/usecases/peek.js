// node peek.js <class product|program> <form> <n> [seed]  -- show sample calls of one form
const fs = require('fs'), path = require('path');
const [cls, f, n, seed] = [process.argv[2], process.argv[3], +process.argv[4] || 30, +process.argv[5] || 3];
const EP = fs.readFileSync(path.join(__dirname, 'out', 'episodes-labelled.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const strip = (q) => String(q || '').replace(/^(\s*(cd\s+("[^"]*"|\S+)\s*(&&|;)|[A-Z]\w*=("[^"]*"|\S+);?)\s*)+/, '');
const all = [];
for (const e of EP) if ((cls === 'product') === (e.tcls !== 'program')) for (const c of e.calls) if (c.form === f) all.push({ e, c });
let x = seed; const rnd = () => ((x = (x * 1103515245 + 12345) % 2147483648) / 2147483648);
for (let k = 0; k < Math.min(n, all.length); k++) { const { e, c } = all[Math.floor(rnd() * all.length)]; console.log(`[${e.folder}${e.sub ? '/sub' : ''}] ${c.n} z=${c.zone2} t=${String(c.t || '').slice(-60)} q=${strip(c.q).replace(/\s+/g, ' ').slice(0, 220)} rc=${c.rc}`); }
console.log('total', all.length);
