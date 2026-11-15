// Renders the idea-fit-review workflow output and builds the final fit list (mapper fit corrected by the refuters, plus promoted dropped ideas).
const fs = require('fs');
const path = require('path');
const [outFile, base] = process.argv.slice(2);
const NL = String.fromCharCode(10);
const top = JSON.parse(fs.readFileSync(outFile, 'utf8'));
const r = top.result && top.result.adj ? top.result : top;
fs.writeFileSync(path.join(base, 'out', 'review.json'), JSON.stringify(r, null, 1));
const maps = JSON.parse(fs.readFileSync(path.join(base, 'out', 'mappings.json'), 'utf8'));
const cands = JSON.parse(fs.readFileSync(path.join(base, 'out', 'candidates.json'), 'utf8'));
const L = [];
const tallyOf = (list, key) => { const t = {}; for (const x of list) t[x[key]] = (t[x[key]] || 0) + 1; return JSON.stringify(t); };
L.push('FAILED LANES: ' + (r.failed && r.failed.length ? r.failed.join(', ') : 'none'));

const refV = r.ref.filter(Boolean).flatMap((x) => x.verdicts);
const refBy = new Map(refV.map((v) => [v.id, v]));
L.push('', '=== REFUTERS ON THE MAPPINGS (' + refV.length + ') === ' + tallyOf(refV, 'verdict'));
for (const x of r.ref.filter(Boolean)) L.push('  lane ' + x.lane_file + ' items_read=' + x.items_read + ' | ' + x.notes);
for (const v of refV) {
  const m = maps.find((y) => y.id === v.id) || {};
  L.push('- ' + v.id + ' ' + v.verdict + ': ' + (m.fit || '?') + ' ' + (m.bottlenecks || []).join(',') + ' => ' + v.corrected_fit + ' ' + v.corrected_bottlenecks.join(',') + ' | cost ' + v.corrected_cost + (v.needs_owner_decision ? ' | OWNER' : '') + (v.faithful_to_source ? '' : ' | NOT FAITHFUL') + (v.reopened_part !== 'none' ? ' | reopened part: ' + v.reopened_part : ''));
  L.push('    reason: ' + v.reason);
  if (v.fact_errors) L.push('    fact errors: ' + v.fact_errors);
  if (v.what_survives) L.push('    survives: ' + v.what_survives);
}
const exV = r.excl ? r.excl.verdicts : [];
L.push('', '=== EXCLUSION CHECK (' + exV.length + ') === ' + tallyOf(exV, 'verdict') + (r.excl ? ' | ' + r.excl.notes : ' | LANE FAILED'));
for (const v of exV.filter((x) => x.verdict === 'should-map')) L.push('- ' + v.id + ' should-map ' + v.fit + ' ' + v.bottlenecks.join(',') + ' | cost ' + v.added_cost + (v.needs_owner_decision ? ' | OWNER' : '') + NL + '    how: ' + v.how + NL + '    why: ' + v.why);

const adjV = r.adj.filter(Boolean).flatMap((x) => x.verdicts);
L.push('', '=== ADJUDICATION OF DROPPED CANDIDATES (' + adjV.length + ' of ' + cands.length + ') === ' + tallyOf(adjV, 'verdict') + ' | testbed practice ' + tallyOf(adjV, 'clinic_practice'));
for (const x of r.adj.filter(Boolean)) L.push('  lane ' + x.lane_file + ' items_read=' + x.items_read + ' | ' + x.notes);
for (const kind of ['promote-direct', 'promote-supporting', 'merge', 'stays-fallen']) {
  const list = adjV.filter((v) => v.verdict === kind);
  L.push('', '--- ' + kind + ' (' + list.length + ') ---');
  for (const v of list) {
    if (kind === 'stays-fallen') { L.push('- ' + v.id + ' [' + v.clinic_practice + '] ' + v.why); continue; }
    if (kind === 'merge') { L.push('- ' + v.id + ' -> ' + v.merges_into + ' [' + v.bottlenecks.join(',') + '; testbed: ' + v.clinic_practice + (v.clinic_evidence ? ' ' + v.clinic_evidence : '') + '] ' + v.why); continue; }
    L.push('- ' + v.id + ' -> ' + v.bottlenecks.join(',') + ' | testbed: ' + v.clinic_practice + (v.clinic_evidence ? ' (' + v.clinic_evidence + ')' : '') + ' | cost ' + v.added_cost + (v.needs_owner_decision ? ' | OWNER' : ''));
    L.push('    idea: ' + v.idea_for_v2);
    L.push('    why: ' + v.why);
  }
}

const c = r.cons;
if (c) {
  L.push('', '=== CONSOLIDATION: MECHANISMS (' + c.mechanisms.length + ') ===');
  for (const m of c.mechanisms.slice().sort((a, b) => a.order - b.order)) {
    L.push(m.order + '. ' + m.name + ' -> ' + m.bottlenecks.join(',') + ' | cost ' + m.cost + (m.needs_owner_decision ? ' | OWNER: ' + m.owner_decision_what : ''));
    L.push('    absorbs: ' + m.absorbs_ids.join(' '));
    L.push('    is: ' + m.what_it_is);
    L.push('    adds: ' + m.what_the_ideas_add);
    L.push('    proof: ' + m.proof);
  }
  L.push('', '=== CONFLICTS (' + c.conflicts.length + ') ===');
  for (const x of c.conflicts) L.push('- ' + x.between + NL + '    why: ' + x.why + NL + '    resolution: ' + x.resolution);
  L.push('', '=== PER BOTTLENECK ===');
  for (const x of c.per_bottleneck.slice().sort((a, b) => a.id.localeCompare(b.id))) L.push(x.id + ' ' + x.contribution + ': ' + x.line);
  L.push('', '=== DO NOT TAKE (' + c.do_not_take.length + ') ===');
  for (const x of c.do_not_take) L.push('- ' + x.id + ': ' + x.why);
  L.push('', 'BUDGET: ' + c.budget_note, '', 'UNABSORBED: ' + (c.unabsorbed_ids.join(' ') || 'none'), '', 'MISSING: ' + c.missing);
} else L.push('', 'CONSOLIDATION FAILED');

// Final fit list.
const fin = [];
for (const m of maps) {
  const v = refBy.get(m.id);
  const ex = exV.find((x) => x.id === m.id && x.verdict === 'should-map');
  let fit = m.fit, b = m.bottlenecks, how = m.how_it_fits, cost = m.added_cost, owner = m.needs_owner_decision, status = 'mapper only';
  if (v) {
    fit = v.verdict === 'downgraded-to-fixflow-only' ? (v.corrected_fit === 'none' ? 'none' : 'fixflow-only') : v.corrected_fit;
    b = fit === 'fixflow-only' || fit === 'none' ? [] : v.corrected_bottlenecks;
    how = v.what_survives || v.reason; cost = v.corrected_cost; owner = v.needs_owner_decision; status = 'refuter: ' + v.verdict;
  } else if (ex) {
    fit = ex.fit; b = ex.bottlenecks; how = ex.how; cost = ex.added_cost; owner = ex.needs_owner_decision; status = 'exclusion check: should-map';
  } else if (m.fit === 'fixflow-only' || m.fit === 'none') status = exV.find((x) => x.id === m.id) ? 'exclusion check: stays' : 'mapper only';
  fin.push({ id: m.id, source: m.source, disposition_in_pr: m.disposition_in_pr, idea: m.idea, fit, bottlenecks: b, how, cost, owner, status });
}
for (const v of adjV.filter((x) => x.verdict.startsWith('promote'))) {
  const cd = cands.find((x) => x.id === v.id) || {};
  fin.push({ id: v.id, source: cd.baml ? 'baml' : 'horthy', disposition_in_pr: (cd.disposition_in_pr || '?') + ' (dropped)', idea: v.idea_for_v2, fit: v.verdict === 'promote-direct' ? 'direct' : 'supporting', bottlenecks: v.bottlenecks, how: v.why, cost: v.added_cost, owner: v.needs_owner_decision, status: 'promoted; testbed practice ' + v.clinic_practice + (v.clinic_evidence ? ' (' + v.clinic_evidence + ')' : '') });
}
fs.writeFileSync(path.join(base, 'out', 'fit-final.json'), JSON.stringify(fin, null, 1));
const ft = {};
for (const f of fin) ft[f.fit] = (ft[f.fit] || 0) + 1;
L.push('', '=== FINAL FIT LIST (' + fin.length + ') === ' + JSON.stringify(ft));
const bids = [];
for (let i = 1; i <= 21; i++) bids.push('B' + String(i).padStart(2, '0'));
for (const b of bids) {
  const d = fin.filter((f) => f.fit === 'direct' && f.bottlenecks.includes(b)).map((f) => f.id);
  const s = fin.filter((f) => f.fit === 'supporting' && f.bottlenecks.includes(b)).map((f) => f.id);
  L.push(b + ' direct[' + d.length + '] ' + d.join(' ') + ' | supporting[' + s.length + '] ' + s.join(' '));
}
const unver = fin.filter((f) => f.status === 'mapper only' && (f.fit === 'direct' || f.fit === 'supporting'));
L.push('', 'UNVERIFIED LIVE MAPPINGS: ' + (unver.map((f) => f.id).join(' ') || 'none'));
const adjMissing = cands.filter((x) => !adjV.find((v) => v.id === x.id)).map((x) => x.id);
L.push('CANDIDATES WITHOUT A VERDICT: ' + (adjMissing.join(' ') || 'none'));
fs.writeFileSync(path.join(base, 'out', 'review.txt'), L.join(NL) + NL);
console.log('refuter verdicts', refV.length, 'exclusion', exV.length, 'adjudicated', adjV.length, 'final', fin.length, JSON.stringify(ft), 'bytes', Buffer.byteLength(L.join(NL)));
