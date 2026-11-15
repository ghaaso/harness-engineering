// Uniform random sample of lookup calls with their question form, for a manual accuracy check. node check.js <product|program> <n> <seed>
const fs = require('fs'), path = require('path');
const [cls, n, seed] = [process.argv[2], +process.argv[3] || 40, +process.argv[4] || 5];
const EP = fs.readFileSync(path.join(__dirname, 'out', 'episodes-qf.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const strip = (q) => String(q || '').replace(/^(\s*(cd\s+("[^"]*"|\S+)\s*(&&|;)|[A-Z]\w*=("[^"]*"|\S+);?)\s*)+/, '');
const all = []; for (const e of EP) if ((cls === 'product') === (e.tcls !== 'program')) for (const c of e.calls) all.push(c);
let x = seed; const rnd = () => ((x = (x * 1103515245 + 12345) % 2147483648) / 2147483648);
for (let k = 0; k < n; k++) { const c = all[Math.floor(rnd() * all.length)]; const body = c.n === 'Bash' || c.n === 'PowerShell' ? strip(c.q) : c.n + ' ' + String(c.t || '').replace(/.*EMS_workshop1\/?/i, '').slice(-70) + (c.q ? ' q=' + c.q : ''); console.log(`${k + 1}. ${c.qf.split(':')[0]} | ${body.replace(/\s+/g, ' ').replace(/C:\/Users\/User\/AppData\/Local\/Temp\/claude\/[^ ]*?\/(scratchpad|tasks)/g, '<tmp>/$1').slice(0, 190)}`); }
