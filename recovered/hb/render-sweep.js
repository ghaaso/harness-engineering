const fs = require('fs');
const top = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const r = top.result && top.result.lanes ? top.result : top;
const D = process.argv[3];
fs.writeFileSync(D + '/sweep.json', JSON.stringify(r, null, 1));
const full = [], idx = [], tabs = [], notes = [];
const cardFull = (c) => `\n[${c.id}] ${c.name}\n  kind=${c.kind} status=${c.status} evidence=${c.evidence_quality} addresses=${c.addresses.join(',')}\n  WHAT: ${c.what_it_is}\n  WHERE: ${c.where.join(' ; ')}\n  MEASURED: ${c.measured}\n  LIMITS: ${c.limits}\n  TRANSFER: ${c.transfer_to_fixflow}`;
const cardIdx = (c) => `${c.id} | ${c.kind} | ${c.status} | ${c.evidence_quality} | ${c.addresses.join(',')} | ${c.name} | M: ${c.measured.replace(/\s+/g, ' ').slice(0, 230)}`;
let n = 0;
for (const l of r.lanes) {
  const x = l.result;
  full.push(`\n\n################ ${l.key} — ${x.lane} (${x.cards.length} cards)`);
  idx.push(`\n## ${l.key} (${x.cards.length} cards)`);
  x.cards.forEach(c => { full.push(cardFull(c)); idx.push(cardIdx(c)); n++; });
  x.data_tables.forEach(t => { tabs.push(`\n### ${l.key}: ${t.title}`); t.rows.forEach(row => tabs.push(row)); });
  notes.push(`\n## ${l.key}\nNOT FOUND:\n${x.not_found.map(s => '- ' + s).join('\n')}\nUNREAD:\n${x.unread.map(s => '- ' + s).join('\n')}\nNOTES: ${x.notes}`);
}
const cr = r.critic, c = [];
if (cr) {
  full.push(`\n\n################ CRITIC missed cards (${cr.missed_cards.length})`);
  idx.push(`\n## CRITIC missed cards (${cr.missed_cards.length})`);
  cr.missed_cards.forEach(k => { full.push(cardFull(k)); idx.push(cardIdx(k)); n++; });
  c.push('CLOSEST TO OWNER RECOLLECTION:\n' + cr.closest_to_owner_recollection);
  c.push('\nCONFIRMED NOT FOUND:\n' + cr.confirmed_not_found.map(s => '- ' + s).join('\n'));
  c.push('\nOVERTURNED NOT FOUND:\n' + cr.overturned_not_found.map(s => '- ' + s).join('\n'));
  c.push('\nCOVERAGE GAPS:\n' + cr.coverage_gaps.map(s => '- ' + s).join('\n'));
  c.push('\nSUSPECT CARDS:\n' + cr.suspect_cards.map(s => `- ${s.card_id}: ${s.why}`).join('\n'));
}
fs.writeFileSync(D + '/sweep-cards.txt', full.join('\n'));
fs.writeFileSync(D + '/sweep-index.txt', idx.join('\n'));
fs.writeFileSync(D + '/sweep-tables.txt', tabs.join('\n'));
fs.writeFileSync(D + '/sweep-notes.txt', notes.join('\n'));
fs.writeFileSync(D + '/sweep-critic.txt', c.join('\n'));
console.log('cards', n, 'failed', JSON.stringify(r.failed), '| chars: cards', full.join('\n').length, 'index', idx.join('\n').length, 'tables', tabs.join('\n').length, 'notes', notes.join('\n').length, 'critic', c.join('\n').length);
for (const l of r.lanes) console.log(l.key, l.result.cards.length, 'cards,', l.result.data_tables.length, 'tables');
