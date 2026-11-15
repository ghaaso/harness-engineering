// Renders the idea-fit-map workflow output into readable text and checks ids against the PR lists.
const fs = require('fs');
const path = require('path');
const [outFile, base] = process.argv.slice(2);
const NL = String.fromCharCode(10);
const top = JSON.parse(fs.readFileSync(outFile, 'utf8'));
const r = top.result && top.result.map ? top.result : top;
const ids = new Map(JSON.parse(fs.readFileSync(path.join(base, 'in', 'horthy-ids.json'), 'utf8')).map((x) => [x.id, x.final]));
fs.writeFileSync(path.join(base, 'out', 'map.json'), JSON.stringify(r, null, 1));

const maps = [...r.map.flatMap((l) => l.mappings), ...r.baml.mappings];
const cands = [...r.screen.flatMap((l) => l.candidates), ...r.baml.fallen_candidates.map((c) => ({ ...c, baml: true }))];
const problems = [];
const seen = new Map();
for (const m of maps) {
  seen.set(m.id, (seen.get(m.id) || 0) + 1);
  if (m.source === 'horthy') {
    if (!ids.has(m.id)) problems.push('mapping id not in PR list: ' + m.id);
    else if (ids.get(m.id) !== m.disposition_in_pr) problems.push('mapping disposition differs: ' + m.id + ' says ' + m.disposition_in_pr + ', PR says ' + ids.get(m.id));
  }
}
for (const [id, fin] of ids) if ((fin === 'adopt' || fin === 'trial') && !seen.has(id)) problems.push('survivor not mapped: ' + id);
for (const [id, n] of seen) if (n > 1) problems.push('mapped more than once: ' + id);
for (const c of cands) {
  if (c.baml) continue;
  if (!ids.has(c.id)) problems.push('candidate id not in PR list: ' + c.id);
  else if (ids.get(c.id) !== c.disposition_in_pr) problems.push('candidate disposition differs: ' + c.id + ' says ' + c.disposition_in_pr + ', PR says ' + ids.get(c.id));
}

const L = [];
L.push('LANES');
for (const l of r.screen) L.push('  screen ' + l.lane_file + ' rows_read=' + l.rows_read + ' candidates=' + l.candidates.length + ' | ' + l.notes);
for (const l of r.map) L.push('  map ' + l.lane_file + ' rows_read=' + l.rows_read + ' mappings=' + l.mappings.length + ' | ' + l.notes);
L.push('  map ' + r.baml.lane_file + ' cards_read=' + r.baml.cards_read + ' mappings=' + r.baml.mappings.length + ' fallen_candidates=' + r.baml.fallen_candidates.length + ' | ' + r.baml.notes);
L.push('', 'ID CHECK: ' + (problems.length ? problems.length + ' problems' : 'clean'));
for (const p of problems) L.push('  ' + p);

const tally = {};
for (const m of maps) tally[m.fit] = (tally[m.fit] || 0) + 1;
L.push('', 'SURVIVOR FIT TALLY ' + JSON.stringify(tally) + ' total ' + maps.length);

const order = ['direct', 'supporting', 'conflicts', 'fixflow-only', 'none'];
for (const f of order) {
  const list = maps.filter((m) => m.fit === f);
  L.push('', '=== ' + f.toUpperCase() + ' (' + list.length + ') ===');
  for (const m of list) {
    L.push('- ' + m.id + ' [' + m.source + ' ' + m.disposition_in_pr + '] -> ' + (m.bottlenecks.join(',') || 'none') + ' | ' + m.relation_to_compile + ' | cost ' + m.added_cost + (m.needs_owner_decision ? ' | OWNER' : ''));
    L.push('    idea: ' + m.idea);
    L.push('    fit: ' + m.how_it_fits);
    if (f === 'direct' || f === 'supporting' || f === 'conflicts') {
      if (m.attaches_to) L.push('    at: ' + m.attaches_to);
      if (m.caveat) L.push('    caveat: ' + m.caveat);
      if (m.proof_on_record) L.push('    proof: ' + m.proof_on_record);
    }
    if (m.reopened_part) L.push('    REOPENED: ' + m.reopened_part);
  }
}

const bids = [];
for (let i = 1; i <= 21; i++) bids.push('B' + String(i).padStart(2, '0'));
L.push('', '=== COVERAGE BY BOTTLENECK ===');
for (const b of bids) {
  const d = maps.filter((m) => m.fit === 'direct' && m.bottlenecks.includes(b)).map((m) => m.id);
  const s = maps.filter((m) => m.fit === 'supporting' && m.bottlenecks.includes(b)).map((m) => m.id);
  const c = cands.filter((x) => x.bottlenecks.includes(b));
  L.push(b + ' direct[' + d.length + ']: ' + d.join(' ') + ' | supporting[' + s.length + ']: ' + s.join(' ') + ' | fallen candidates[' + c.length + '] strong ' + c.filter((x) => x.strength === 'strong').length);
}

const ctally = {};
for (const c of cands) { const k = c.fell_reason_class + ' / holds:' + c.reason_still_holds_against_bottleneck; ctally[k] = (ctally[k] || 0) + 1; }
L.push('', '=== FALLEN CANDIDATES (' + cands.length + ') === ' + JSON.stringify(ctally));
const so = { strong: 0, moderate: 1, weak: 2 };
for (const c of cands.slice().sort((a, b) => so[a.strength] - so[b.strength] || a.id.localeCompare(b.id))) {
  L.push('- ' + c.id + (c.baml ? ' [baml]' : '') + ' [' + c.disposition_in_pr + '] ' + c.strength + ' -> ' + c.bottlenecks.join(',') + ' | ' + c.fell_reason_class + ' | holds: ' + c.reason_still_holds_against_bottleneck);
  L.push('    claim: ' + c.claim_short);
  L.push('    fell: ' + c.why_it_fell);
  L.push('    adds: ' + c.what_it_would_add);
}
fs.writeFileSync(path.join(base, 'out', 'map.txt'), L.join(NL) + NL);
fs.writeFileSync(path.join(base, 'out', 'candidates.json'), JSON.stringify(cands, null, 1));
fs.writeFileSync(path.join(base, 'out', 'mappings.json'), JSON.stringify(maps, null, 1));
console.log('maps', maps.length, 'candidates', cands.length, 'problems', problems.length, 'bytes', Buffer.byteLength(L.join(NL)));
