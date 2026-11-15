// Builds the second-pass inputs: candidate lanes for the adjudicators, mapping lanes for the refuters.
const fs = require('fs');
const path = require('path');
const base = process.argv[2];
const NL = String.fromCharCode(10);
const r = JSON.parse(fs.readFileSync(path.join(base, 'out', 'map.json'), 'utf8'));
const ids = new Map(JSON.parse(fs.readFileSync(path.join(base, 'in', 'horthy-ids.json'), 'utf8')).map((x) => [x.id, x.final]));
let fixed = 0;
const cand = (c, src) => {
  if (src === 'horthy' && ids.has(c.id) && ids.get(c.id) !== c.disposition_in_pr) { c.disposition_in_pr = ids.get(c.id); fixed++; }
  return ['### ' + c.id + ' (' + src + ', ' + c.disposition_in_pr + ' in the PR; screener strength: ' + c.strength + ')',
    '- bottlenecks proposed: ' + c.bottlenecks.join(', '),
    '- claim: ' + c.claim_short,
    '- why it fell: ' + c.why_it_fell + ' [class: ' + c.fell_reason_class + '; screener says the reason still holds against the bottleneck: ' + c.reason_still_holds_against_bottleneck + ']',
    '- what the screener says it would add: ' + c.what_it_would_add, ''].join(NL);
};
const mapping = (m) => ['### ' + m.id + ' (' + m.source + ', ' + m.disposition_in_pr + ' in the PR)',
  '- idea as mapped: ' + m.idea,
  '- fit: ' + m.fit + ' -> ' + (m.bottlenecks.join(', ') || 'none') + ' [' + m.relation_to_compile + '; cost: ' + m.added_cost + (m.needs_owner_decision ? '; needs owner decision' : '') + ']',
  '- how it fits: ' + m.how_it_fits,
  '- attaches to: ' + (m.attaches_to || '-'),
  '- caveat: ' + (m.caveat || '-'),
  '- proof on the record: ' + (m.proof_on_record || '-'),
  '- reopened part: ' + (m.reopened_part || '-'), ''].join(NL);
const w = (name, title, body, n) => { fs.writeFileSync(path.join(base, 'in2', name), '# ' + title + NL + NL + n + ' items.' + NL + NL + body); console.log(name, n, Buffer.byteLength(body)); };
const lanes = r.screen.map((l) => l.candidates);
const A = [...lanes[0], ...lanes[1]];
const B = lanes[2];
const C = [...lanes[3], ...lanes[4]];
w('adj-A.md', 'Fallen Horthy candidates, groups G1 and G2 (source rows: horthy-fallen-1.md, horthy-fallen-2.md)', A.map((c) => cand(c, 'horthy')).join(NL), A.length);
w('adj-B.md', 'Fallen candidates: Horthy groups G3, G5 and the addendum new families (source rows: horthy-fallen-3.md), and BAML cards (source rows: baml-post-review.md)', [...B.map((c) => cand(c, 'horthy')), ...r.baml.fallen_candidates.map((c) => cand(c, 'baml'))].join(NL), B.length + r.baml.fallen_candidates.length);
w('adj-C.md', 'Fallen Horthy candidates, group G4 (source rows: horthy-fallen-4.md, horthy-fallen-5.md)', C.map((c) => cand(c, 'horthy')).join(NL), C.length);
const all = [...r.map.flatMap((l) => l.mappings), ...r.baml.mappings];
const live = (m) => m.fit === 'direct' || m.fit === 'supporting' || m.fit === 'conflicts';
const laneOf = (m) => (m.source === 'baml' ? 'baml' : m.id.slice(0, 2));
const R1 = all.filter((m) => live(m) && ['G1', 'G2', 'G3', 'G5'].includes(laneOf(m)));
const R2 = all.filter((m) => live(m) && ['G4', 'baml'].includes(laneOf(m)));
const X = all.filter((m) => !live(m));
w('ref-1.md', 'Mappings to attack: Horthy groups G1, G2, G3, G5 (source rows: horthy-survivors-A.md, horthy-survivors-B.md)', R1.map(mapping).join(NL), R1.length);
w('ref-2.md', 'Mappings to attack: Horthy group G4 (source rows: horthy-survivors-C.md) and BAML (source: baml-post-review.md)', R2.map(mapping).join(NL), R2.length);
w('excl.md', 'Ideas the mappers ruled fixflow-only or none (source rows: horthy-survivors-A.md, -B.md, -C.md)', X.map(mapping).join(NL), X.length);
fs.writeFileSync(path.join(base, 'out', 'mappings.json'), JSON.stringify(all, null, 1));
console.log('dispositions corrected from the PR list:', fixed);
