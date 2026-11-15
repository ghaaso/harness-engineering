const fs = require('fs');
const top = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const r = top.result && top.result.lanes ? top.result : top;
fs.writeFileSync(process.argv[3] + '/research.json', JSON.stringify(r, null, 1));
const full = [], brief = [];
for (const l of r.lanes) {
  const x = l.result;
  full.push(`\n\n######## ${l.key} — ${x.topic}`);
  brief.push(`\n\n######## ${l.key}`);
  x.claims.forEach((c, i) => {
    full.push(`\n[${c.verdict}] C${i + 1}. ${c.claim}\n   ${c.what_sources_say}`);
    c.sources.forEach(s => full.push(`   src(${s.read}${s.date ? ', ' + s.date : ''}): ${s.title} ${s.url}`));
    brief.push(`[${c.verdict}] C${i + 1}. ${c.claim}`);
  });
  full.push(`\nIMPLICATIONS:`); brief.push(`IMPLICATIONS:`);
  x.implications.forEach(m => { const s = `- ${m.bottleneck} (${m.confidence}): ${m.implication}`; full.push(s); brief.push(s); });
  full.push(`\nNOTES: ${x.notes}`);
  brief.push(`NOTES: ${x.notes.slice(0, 700)}`);
}
full.push(`\n\nWRITE PROBE: ${JSON.stringify(r.write_probe)}`);
brief.push(`\n\nWRITE PROBE: ${JSON.stringify(r.write_probe)}`);
fs.writeFileSync(process.argv[3] + '/research.txt', full.join('\n'));
fs.writeFileSync(process.argv[3] + '/research-brief.txt', brief.join('\n'));
console.log('full chars', full.join('\n').length, 'brief chars', brief.join('\n').length, 'failed', JSON.stringify(r.failed));
