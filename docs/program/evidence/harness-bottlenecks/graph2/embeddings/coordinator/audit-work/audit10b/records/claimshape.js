const fs = require('fs');
const D = 'C:/Users/User/Documents/projects/EMS_workshop1/docs/program/evidence/harness-bottlenecks/graph2/embeddings';
const l = fs.readFileSync(D + '/CLAIMS.md', 'utf8').split('\n'); const st = {}, fk = {}, nonrow = [];
l.forEach((s, i) => {
  if (!/^\| \d+ \| \d+ \|/.test(s)) { nonrow.push((i + 1) + ': ' + s.slice(0, 150)); return; }
  const p = s.split(/(?<!\\)\|/).slice(1, -1).map(x => x.trim());
  if (p.length !== 8) nonrow.push('COLS ' + p.length + ' at ' + (i + 1));
  st[p[7]] = (st[p[7]] || 0) + 1;
  const kf = p[3] + ' :: ' + (p[5].startsWith('/') ? '/ptr' : p[5].slice(0, 50));
  fk[kf] = (fk[kf] || 0) + 1;
});
console.log(JSON.stringify(st, null, 1)); console.log(JSON.stringify(fk, null, 1)); console.log(nonrow.join('\n'));
