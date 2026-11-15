const fs = require('fs');
const base = process.argv[2];
const maps = JSON.parse(fs.readFileSync(base + '/out/mappings.json', 'utf8'));
const cut = (s, n) => (s.length > n ? s.slice(0, n) + '…' : s);
for (const f of ['supporting', 'fixflow-only']) {
  const list = maps.filter((m) => m.fit === f);
  console.log('=== ' + f + ' (' + list.length + ') ===');
  for (const m of list) {
    if (f === 'supporting') {
      console.log(m.id + ' [' + m.disposition_in_pr + '] ' + m.bottlenecks.join(',') + ' | ' + m.relation_to_compile + ' | ' + m.added_cost + (m.needs_owner_decision ? ' | OWNER' : ''));
      console.log('   idea: ' + cut(m.idea, 190));
      console.log('   fit: ' + cut(m.how_it_fits, 260));
      if (m.caveat) console.log('   caveat: ' + cut(m.caveat, 170));
      if (m.reopened_part) console.log('   REOPENED: ' + cut(m.reopened_part, 240));
    } else {
      console.log(m.id + ' [' + m.disposition_in_pr + '] ' + cut(m.idea, 110) + ' || ' + cut(m.how_it_fits, 120) + (m.reopened_part ? ' || REOPENED: ' + cut(m.reopened_part, 160) : ''));
    }
  }
}
