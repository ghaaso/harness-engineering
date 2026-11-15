const fs = require('fs');
const top = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const r = top.result && top.result.maps ? top.result : top;
const D = process.argv[3];
fs.writeFileSync(D + '/map.json', JSON.stringify(r, null, 1));
const cut = (s, n) => { s = (s || '').replace(/\s+/g, ' '); return s.length > n ? s.slice(0, n) + ' …' : s; };
const brief = [], full = [];
for (const m of r.maps.filter(Boolean)) {
  brief.push(`\n######## ${m.group}`); full.push(`\n######## ${m.group}`);
  for (const it of m.items) {
    brief.push(`\n== ${it.id} | class=${it.class} | research=${it.research_needed} | priority=${it.priority} | ToT=${it.thought_structures.relevance} | graph=${it.graph_recall.relevance}`);
    brief.push(`CAUSE: ${cut(it.cause, 900)}`);
    brief.push(`GAP: ${cut(it.residual_gap, 600)}`);
    if (it.research_question) brief.push(`RESEARCH Q: ${cut(it.research_question, 500)}`);
    it.mechanisms.forEach(k => brief.push(`MECH: ${k.name} — ${cut(k.what, 520)} | COST: ${cut(k.cost, 160)} | PROOF: ${cut(k.proof, 260)}`));
    brief.push(`EXISTING: ${it.existing_answers.map(e => `${e.ref} (${e.covers})`).join('; ')}`);
    brief.push(`ToT why: ${cut(it.thought_structures.why, 260)}`);
    brief.push(`GRAPH why: ${cut(it.graph_recall.why, 260)}`);
    brief.push(`GAIN: ${cut(it.expected_gain, 300)}`);
    full.push(`\n== ${it.id} | class=${it.class} | research=${it.research_needed} | priority=${it.priority}\nCAUSE: ${it.cause}\nEVIDENCE:\n${it.evidence.map(e => '- ' + e).join('\n')}\nALREADY TRIED:\n${it.already_tried.map(e => `- ${e.card}: ${e.outcome}`).join('\n')}\nEXISTING ANSWERS:\n${it.existing_answers.map(e => `- [${e.covers}] ${e.source} ${e.ref}: ${e.what}`).join('\n')}\nGAP: ${it.residual_gap}\nRESEARCH Q: ${it.research_question}\nMECHANISMS:\n${it.mechanisms.map(k => `- ${k.name}: ${k.what}\n  COST: ${k.cost}\n  PROOF: ${k.proof}`).join('\n')}\nTHOUGHT STRUCTURES (${it.thought_structures.relevance}): ${it.thought_structures.why}\nGRAPH RECALL (${it.graph_recall.relevance}): ${it.graph_recall.why}\nGAIN: ${it.expected_gain}`);
  }
  brief.push(`\nCROSS-CUTTING:\n${m.cross_cutting.map(c => '- ' + cut(c, 420)).join('\n')}`);
  full.push(`\nCROSS-CUTTING:\n${m.cross_cutting.map(c => '- ' + c).join('\n')}`);
}
const v = [];
for (const x of r.verdicts.filter(Boolean)) {
  v.push(`\n######## ${x.question}\nVERDICT: ${x.verdict_one_line}\nCONFIDENCE: ${x.confidence}\nEXPLANATION: ${x.plain_explanation}`);
  v.push('WHERE IT HELPS:'); x.where_it_helps.forEach(h => v.push(`- [${h.bottleneck}] ${h.place}: ${h.mechanism} | EVIDENCE: ${h.evidence} | COST: ${h.cost}`));
  v.push('WHERE IT DOES NOT:'); x.where_it_does_not.forEach(h => v.push(`- ${h.place}: ${h.why}`));
  v.push(`TRIAL: design: ${x.trial.design}\n  measurement: ${x.trial.measurement}\n  budget: ${x.trial.budget}\n  stop: ${x.trial.stop_rule}`);
  v.push('DO NOT BUILD:'); x.do_not_build.forEach(s => v.push('- ' + s));
  v.push('OPEN RESEARCH:'); x.open_research.forEach(s => v.push('- ' + s));
}
const f = [];
if (r.refute) {
  f.push('RECLASSIFICATIONS:'); r.refute.reclassifications.forEach(c => f.push(`- ${c.id}: ${c.from} -> ${c.to}: ${c.why}`));
  f.push('\nATTACKS:'); r.refute.attacks.forEach(a => f.push(`\n[${a.verdict}] ${a.target}: ${cut(a.claim, 260)}\n  EVIDENCE: ${cut(a.evidence, 700)}\n  AMENDMENT: ${cut(a.amendment, 600)}`));
  f.push('\nMISSED:'); r.refute.missed.forEach(s => f.push('- ' + s));
}
fs.writeFileSync(D + '/map-brief.txt', brief.join('\n'));
fs.writeFileSync(D + '/map-full.txt', full.join('\n'));
fs.writeFileSync(D + '/verdicts.txt', v.join('\n'));
fs.writeFileSync(D + '/refute.txt', f.join('\n'));
const cls = {}; for (const m of r.maps.filter(Boolean)) for (const it of m.items) cls[it.id] = `${it.class}/${it.research_needed}/${it.priority}`;
console.log(JSON.stringify(cls));
console.log('chars brief', brief.join('\n').length, 'full', full.join('\n').length, 'verdicts', v.join('\n').length, 'refute', f.join('\n').length, '| attacks', r.refute ? r.refute.attacks.length : 0, 'reclass', r.refute ? r.refute.reclassifications.length : 0);
