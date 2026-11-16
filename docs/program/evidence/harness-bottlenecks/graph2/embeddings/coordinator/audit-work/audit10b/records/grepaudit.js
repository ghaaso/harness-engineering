// usage: node grepaudit.js <regex> [ctx] [maxhits]  -- searches AUDIT.md, prints line:col and context
const fs = require('fs');
const P = 'C:/Users/User/Documents/projects/EMS_workshop1/docs/program/evidence/harness-bottlenecks/graph2/embeddings/' + (process.env.F || 'AUDIT.md');
const re = new RegExp(process.argv[2], 'g'); const ctx = +(process.argv[3] || 200); const max = +(process.argv[4] || 20);
const lines = fs.readFileSync(P, 'utf8').split('\n'); let n = 0;
for (let i = 0; i < lines.length && n < max; i++) {
  let m; re.lastIndex = 0;
  while ((m = re.exec(lines[i])) && n < max) {
    n++; const s = Math.max(0, m.index - ctx), e = Math.min(lines[i].length, m.index + m[0].length + ctx);
    console.log('L' + (i + 1) + ':' + m.index + ' (len ' + lines[i].length + ') | ' + lines[i].slice(s, e).replace(/\s+/g, ' '));
  }
}
console.log('hits ' + n);
