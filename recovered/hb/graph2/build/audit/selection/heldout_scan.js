'use strict';
// Check 6: no answer, result or score file anywhere in the build holds a held-out record.
// Scans every .json, .jsonl, .jsonl.gz, .log, .md, .txt file under results/, tmp/, sealed/grader/,
// audit/ and arms/ (skipping the source-text store) for the split strings "heldout" / "held_out" and for
// held-out task ids; task-definition files (tasks/, sealed/references.jsonl, sealed/tq_*) are the only
// places they may appear and are reported separately.   node heldout_scan.js <build>
const fs = require('fs'); const path = require('path'); const zlib = require('zlib');
const B = path.resolve(process.argv[2]);
const tasks = fs.readFileSync(path.join(B, 'tasks/tasks.jsonl'), 'utf8').split('\n').filter(Boolean).map(JSON.parse);
const heldIds = new Set(tasks.filter((t) => t.split !== 'tune').map((t) => t.id));
const qs = fs.readFileSync(path.join(B, 'tasks/tq_questions.jsonl'), 'utf8').split('\n').filter(Boolean).map(JSON.parse);
const heldQ = new Set(qs.filter((q) => q.split !== 'tune').map((q) => q.id));
const roots = ['results', 'tmp', 'sealed/grader', 'audit', 'arms'];
const hits = []; let files = 0; let bytes = 0;
const reSplit = /"split"\s*:\s*"(heldout|held_out)"/g;
const reId = /"id"\s*:\s*"((?:T1x?|T2|T3|T4|T5)-\d{4})"/g;
function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { if (e.name === 'srcstore' || e.name === 'node_modules' || e.name === 'audit-selection') continue; walk(p); continue; }
    if (!/\.(json|jsonl|gz|log|md|txt)$/.test(e.name)) continue;
    let t;
    try { const buf = fs.readFileSync(p); t = e.name.endsWith('.gz') ? zlib.gunzipSync(buf).toString('utf8') : buf.toString('utf8'); } catch (x) { hits.push({ file: path.relative(B, p), error: String(x.message) }); continue; }
    files++; bytes += t.length;
    const ns = (t.match(reSplit) || []).length;
    let nid = 0; let m; reId.lastIndex = 0; while ((m = reId.exec(t))) if (heldIds.has(m[1])) nid++;
    if (ns || nid) hits.push({ file: path.relative(B, p), split_strings: ns, heldout_task_ids: nid });
  }
}
for (const r of roots) if (fs.existsSync(path.join(B, r))) walk(path.join(B, r));
// TQ answer files: any held-out question id?
const tqHits = [];
for (const dir of ['results/tq', 'tmp/grader/results/tq']) {
  const d = path.join(B, dir); if (!fs.existsSync(d)) continue;
  for (const f of fs.readdirSync(d)) {
    const ids = fs.readFileSync(path.join(d, f), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l).id);
    tqHits.push({ file: dir + '/' + f, questions: ids.length, heldout_questions: ids.filter((i) => heldQ.has(i)).length });
  }
}
const frozenDir = path.join(B, 'results/frozen');
console.log(JSON.stringify({ scanned_files: files, scanned_chars: bytes, heldout_task_ids_known: heldIds.size, hits, tq_answer_files: tqHits,
  frozen_folder: fs.readdirSync(frozenDir), heldout_answer_dirs: roots.flatMap((r) => { const out = []; const w = (d) => { if (!fs.existsSync(d)) return; for (const e of fs.readdirSync(d, { withFileTypes: true })) if (e.isDirectory()) { if (/held/i.test(e.name)) out.push(path.relative(B, path.join(d, e.name))); if (e.name !== 'srcstore') w(path.join(d, e.name)); } }; w(path.join(B, r)); return out; }) }, null, 1));
