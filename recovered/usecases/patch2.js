const fs = require('fs');
const f = __dirname + '/forms.js';
const L = fs.readFileSync(f, 'utf8').split('\n');
for (let i = 0; i < L.length; i++) {
  if (L[i].startsWith("  if (c.n === 'Read' || c.n === 'Grep' || c.n === 'Glob') {")) {
    L[i] = "  if (c.n === 'Read' || c.n === 'Grep' || c.n === 'Glob') { const z = pzone(c.t); if (z !== 'unknown') return z; if (c.n === 'Read') return 'unknown'; return byResult(c) || (/\\.(py|tsx?|jsx?)\\b|\\b(py|ts|js)\\b/.test(String(c.g || '')) ? 'code' : 'repo-wide'); }";
  }
  if (L[i].startsWith("  if (z === 'scratch') {")) {
    L[i] = "  if (z === 'scratch') { const all = (c.t || '') + ' ' + q; if (/handoff|reviews?\\/|verdict|report|findings|refute|critic|audit/i.test(all)) return 'prior-conclusions'; if (/\\/tasks\\/[\\w-]+\\.output|\\.output\\b|tool-results/.test(all)) return 'agent-or-job-output'; if (/\\.log\\b|tail\\s|gate|ci-|pytest|jest|lab\\//i.test(all)) return 'run-log'; return 'scratch-work-files'; }";
  }
}
fs.writeFileSync(f, L.join('\n'));
console.log(L.filter((l) => /[\x00-\x08]/.test(l)).length, 'lines with control chars');
