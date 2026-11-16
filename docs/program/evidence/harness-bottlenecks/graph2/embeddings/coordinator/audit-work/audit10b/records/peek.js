const fs = require('fs'), zlib = require('zlib');
for (const f of process.argv.slice(2)) {
  const t = f.endsWith('.gz') ? zlib.gunzipSync(fs.readFileSync(f)).toString('utf8') : fs.readFileSync(f, 'utf8');
  const ls = t.split('\n');
  console.log('== ' + f + ' lines ' + ls.length + ' last-empty ' + (ls[ls.length - 1] === ''));
  console.log(ls.slice(0, 3).map(s => s.slice(0, 300)).join('\n'));
}
