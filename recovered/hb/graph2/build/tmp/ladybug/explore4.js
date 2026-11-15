const lbug = require('@ladybugdb/core');
const db = new lbug.Database(':memory:'); const c = new lbug.Connection(db);
const q = (x) => { try { const r = c.querySync(x); return JSON.stringify((Array.isArray(r) ? r[r.length - 1] : r).getAllSync(), (k, v) => (typeof v === 'bigint' ? Number(v) : v)).slice(0, 300); } catch (e) { return 'ERR ' + String(e.message).slice(0, 250); } };
const F = '/build/tmp/ladybug/canon-frozen/nodes.csv';
const COLS = 'id INT64, sid STRING, kind STRING, path STRING, name STRING, ls INT64, le INT64, runtime STRING, slice STRING, is_test INT64, file INT64, tokens INT64, text STRING';
for (const o of ["header=true", "header=true, parallel=false", "header=true, parallel=false, quote='\"', escape='\"'", "header=true, escape='\"'", "header=true, parallel=false, escape='\\\\'"]) {
  console.log(o, q(`LOAD FROM '${F}' (${o}) RETURN count(*)`));
  console.log(o, 'typed', q(`LOAD WITH HEADERS (${COLS}) FROM '${F}' (${o}) RETURN count(*), max(id)`));
}
const fs = require('fs');
const lines = fs.readFileSync(F, 'utf8').split('\n');
fs.writeFileSync('/tmp/one.csv', lines[0] + '\n' + lines[1455] + '\n');
console.log('one', q(`LOAD FROM '/tmp/one.csv' (header=true) RETURN *`));
fs.writeFileSync('/tmp/two.csv', lines[0] + '\n' + lines.slice(1440, 1460).join('\n') + '\n');
console.log('two', q(`LOAD WITH HEADERS (${COLS}) FROM '/tmp/two.csv' (header=true, parallel=false) RETURN count(*)`));
const maxLen = Math.max(...lines.map((l) => l.length)); console.log('max line', maxLen, lines.findIndex((l) => l.length === maxLen));
