const fs = require('fs');
const raw = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const res = raw.result || raw;
let out = '';
for (const r of res) {
  const x = r.result || {};
  out += '\n===== ' + r.key + ' :: ' + x.verdict + '\nSUMMARY: ' + x.summary + '\nNUMBERS: ' + (x.numbers || '') + '\n';
  for (const f of x.findings || []) out += '\n[' + f.id + '] ' + f.severity + ' | ' + f.target + '\n  FINDING: ' + f.finding + '\n  EVIDENCE: ' + f.evidence + '\n  FIX: ' + f.fix + '\n';
}
fs.writeFileSync('scratchpad/hb/fill/verify/check.txt', out);
console.log(out.length);
