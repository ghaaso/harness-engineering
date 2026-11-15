'use strict';
// Per-task answer-level primary of one answer file, scored exactly as the earlier grader scored the stored arms:
// arms/common/score.js scoreAnswer, rule "content", against sealed/references.jsonl; primary = recall of
// reference files and definitions within 8,000 tokens (signature or snippet form).
//   node answer_score.js --answers <file.jsonl.gz> --refs <references.jsonl> --out <per_task.jsonl>
//                        [--arm <expected arm field>] [--config-hash <expected config_hash>]
// Writes one row per scored task {id, primary, units} to --out (a sealed folder) and prints one JSON line of
// counts. Exit 2 on a malformed file: a duplicate task, an unexpected arm or configuration, a non-content form,
// a missing reference, or a task whose primary is null while it has reference units.
const fs = require('fs');
const path = require('path');
const S = require('/build/arms/common/score.js');
const H = require('/build/arms/common/harness.js');

const a = process.argv.slice(2); const o = {};
for (let i = 0; i < a.length; i += 2) o[a[i].replace(/^--/, '')] = a[i + 1];
if (!o.answers || !o.refs || !o.out) { console.error('usage: answer_score.js --answers F --refs R --out O [--arm A] [--config-hash H]'); process.exit(2); }
const refs = S.readRefs(o.refs);
const answers = H.readGzJsonl(o.answers);
const seen = new Set(); const rows = []; const bad = []; let zero = 0;
for (const ans of answers) {
  if (seen.has(ans.id)) { bad.push('duplicate task'); continue; }
  seen.add(ans.id);
  if (o.arm !== undefined && ans.arm !== o.arm) bad.push('arm field differs from the variant');
  if (o['config-hash'] !== undefined && ans.config_hash !== o['config-hash']) bad.push('config_hash differs');
  if (ans.form !== 'signature' && ans.form !== 'snippet') bad.push('not a content form');
  const ref = refs.get(ans.id);
  if (!ref) { bad.push('no reference for a task'); continue; }
  const s = S.scoreAnswer(ans, ref, { rule: 'content' });
  if (!s) { zero++; continue; } // score.js drops a task with no reference unit (zero_unit_refs)
  if (s.primary === null || s.primary === undefined || !Number.isFinite(s.primary)) { bad.push('null primary'); continue; }
  rows.push({ id: ans.id, primary: s.primary, units: s.units });
}
if (bad.length) { console.log(JSON.stringify({ ok: false, problems: [...new Set(bad)], count: bad.length })); process.exit(2); }
rows.sort((x, y) => (x.id < y.id ? -1 : 1));
fs.writeFileSync(o.out, rows.map((r) => JSON.stringify(r)).join('\n') + '\n');
console.log(JSON.stringify({ ok: true, answers: answers.length, scored: rows.length, zero_unit_refs: zero }));
