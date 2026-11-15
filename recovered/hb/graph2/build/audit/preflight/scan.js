'use strict';
// Preflight check 6: no held-out content before the held-out run. Walks results/, tmp/, arms/ and
// sealed/grader/ (gz files decompressed; files over 300 MB or with NUL bytes in the first 64 KB are
// listed as skipped). Flags: (a) any held-out task id (T1-0389..0806, T1x-0145..0226, T2-0241..0477,
// T3-*, T4-*, T5-*); (b) any JSON line with "split":"heldout"/"held_out" (reported with its id, so the
// lock lane's relabelled TUNE tasks can be told apart); (c) any JSON line with an `answer` field and a
// held-out question id (21..50); (d) any held-out question text (first 60 characters) outside tasks/.
// Also lists every regular file under results/heldout/.
// usage: node scan.js <build> <out.json>
const fs = require('fs'); const path = require('path'); const zlib = require('zlib');
const B = process.argv[2];
const tasks = fs.readFileSync(path.join(B, 'tasks', 'tasks.jsonl'), 'utf8').split('\n').filter(Boolean).map(JSON.parse);
const held = new Set(tasks.filter((t) => t.split !== 'tune').map((t) => t.id));
const qs = fs.readFileSync(path.join(B, 'tasks', 'tq_questions.jsonl'), 'utf8').split('\n').filter(Boolean).map(JSON.parse);
const heldQ = new Set(qs.filter((q) => q.split !== 'tune').map((q) => q.id));
const heldQText = qs.filter((q) => q.split !== 'tune').map((q) => ({ id: q.id, t: q.question.slice(0, 60) }));
const ID_RE = /\b(T1x?-\d{4}|T2-\d{4}|T[345]-\d{3})\b/g;
const out = { files: 0, bytes: 0, skipped: [], heldout_ids: {}, split_heldout_lines: {}, heldout_q_answers: [], heldout_q_text: {}, heldout_dir_files: [] };
function scanText(rel, txt) {
  for (const m of txt.matchAll(ID_RE)) if (held.has(m[1])) { (out.heldout_ids[rel] = out.heldout_ids[rel] || new Set()).add(m[1]); }
  if (/"split"\s*:\s*"held_?out"/.test(txt)) {
    const ids = new Set();
    for (const l of txt.split('\n')) if (/"split"\s*:\s*"held_?out"/.test(l)) { const m = l.match(/"id"\s*:\s*"?([A-Za-z0-9x-]+)"?/); ids.add(m ? m[1] : '?'); }
    out.split_heldout_lines[rel] = { n: ids.size, heldout_ids: [...ids].filter((i) => held.has(i)).length, sample: [...ids].slice(0, 3) };
  }
  if (txt.includes('"answer"')) {
    for (const l of txt.split('\n')) {
      if (!l.includes('"answer"')) continue;
      try { const o = JSON.parse(l); if (o && heldQ.has(o.id) && 'answer' in o) out.heldout_q_answers.push({ file: rel, id: o.id }); } catch (e) { /* not a JSON line */ }
    }
  }
  for (const q of heldQText) if (txt.includes(q.t)) (out.heldout_q_text[rel] = out.heldout_q_text[rel] || []).push(q.id);
}
function walk(abs, rel) {
  for (const e of fs.readdirSync(abs, { withFileTypes: true })) {
    const a = path.join(abs, e.name); const r = rel + '/' + e.name;
    if (e.isDirectory()) { walk(a, r); continue; }
    if (!e.isFile()) continue;
    if (r.startsWith('audit/preflight')) continue;
    const st = fs.statSync(a);
    if (st.size > 300 * 1024 * 1024) { out.skipped.push(r + ' (' + st.size + ' bytes)'); continue; }
    let buf = fs.readFileSync(a);
    if (r.endsWith('.gz')) { try { buf = zlib.gunzipSync(buf); } catch (err) { out.skipped.push(r + ' (bad gzip)'); continue; } }
    if (buf.subarray(0, 65536).includes(0)) { out.skipped.push(r + ' (binary)'); continue; }
    out.files++; out.bytes += buf.length;
    scanText(r, buf.toString('utf8'));
  }
}
for (const d of ['results', 'tmp', 'arms', 'sealed/grader']) walk(path.join(B, d), d);
function listAll(abs, rel) { for (const e of fs.readdirSync(abs, { withFileTypes: true })) { const a = path.join(abs, e.name); if (e.isDirectory()) listAll(a, rel + '/' + e.name); else out.heldout_dir_files.push(rel + '/' + e.name); } }
listAll(path.join(B, 'results', 'heldout'), 'results/heldout');
for (const k of Object.keys(out.heldout_ids)) out.heldout_ids[k] = [...out.heldout_ids[k]].slice(0, 10).concat(out.heldout_ids[k].size > 10 ? ['... ' + out.heldout_ids[k].size + ' ids'] : []);
fs.writeFileSync(process.argv[3], JSON.stringify(out, null, 1));
console.log(JSON.stringify({ files: out.files, MB: Math.round(out.bytes / 1e6), skipped: out.skipped.length, files_with_heldout_ids: Object.keys(out.heldout_ids).length, files_with_split_heldout: Object.keys(out.split_heldout_lines).length, heldout_q_answers: out.heldout_q_answers.length, files_with_heldout_q_text: Object.keys(out.heldout_q_text).length, heldout_dir_files: out.heldout_dir_files }));
