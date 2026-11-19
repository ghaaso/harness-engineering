const t = require('fs').readFileSync(process.argv[2], 'utf8').split(/\r?\n/);
let key = ''; const out = [];
for (const l of t) {
  if (l.startsWith('HKEY_')) { key = l.split('\\Services\\')[1] || l; continue; }
  const m = /Altitude\s+REG_SZ\s+(\S+)/.exec(l);
  if (m) { const parts = key.split('\\'); out.push([m[1], parts[0], parts.slice(1).join('/')]); }
}
out.sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]));
for (const o of out) console.log(o[0].padEnd(12), o[1].padEnd(24), o[2]);
console.log('count', out.length);
