'use strict';
// Re-audit 2, check 6: no held-out content before the held-out run. Extends ../scan.js:
//  - walks results/, tmp/, arms/, bench/ and sealed/grader/ (gz decompressed; >300 MB or NUL in the first
//    64 KB listed as skipped); audit/ is not scanned (auditors' own evidence);
//  (a) held-out task ids; (b) JSON lines with "split":"heldout"/"held_out" (with their ids);
//  (c) held-out question answers: any JSON object, in a JSON-lines file OR anywhere inside a whole JSON
//      document, whose `id` is a held-out question id and that carries answer, answers, result, rows,
//      items or tq_reference (reported with the keys it has);
//  (d) held-out question text (first 60 characters) outside tasks/;
//  (e) held-out TASK COMMITS (from sealed/references.jsonl, date >= 2026-07-01, minus every commit that is
//      itself a task parent): any 12-hex prefix of one in a scanned file;
//  plus every regular file under results/heldout/.
// usage: node scan2.js <build> <out.json>
const fs = require('fs'); const path = require('path'); const zlib = require('zlib');
const B = process.argv[2];
const tasks = fs.readFileSync(path.join(B, 'tasks', 'tasks.jsonl'), 'utf8').split('\n').filter(Boolean).map(JSON.parse);
const held = new Set(tasks.filter((t) => t.split !== 'tune').map((t) => t.id));
const parents = new Set(tasks.map((t) => t.parent));
const qs = fs.readFileSync(path.join(B, 'tasks', 'tq_questions.jsonl'), 'utf8').split('\n').filter(Boolean).map(JSON.parse);
const heldQ = new Set(qs.filter((q) => q.split !== 'tune').map((q) => q.id));
const heldQText = qs.filter((q) => q.split !== 'tune').map((q) => ({ id: q.id, t: q.question.slice(0, 60) }));
const refs = fs.readFileSync(path.join(B, 'sealed', 'references.jsonl'), 'utf8').split('\n').filter(Boolean).map(JSON.parse);
const heldCommits = [...new Set(refs.filter((r) => r.commit && r.date >= '2026-07-01').map((r) => r.commit))].filter((c) => !parents.has(c));
const heldPrefix = heldCommits.map((c) => c.slice(0, 12));
const ID_RE = /\b(T1x?-\d{4}|T2-\d{4}|T[345]-\d{3})\b/g;
const ANS_KEYS = ['answer', 'answers', 'result', 'rows', 'items', 'tq_reference'];
const out = { held_commits_checked: heldCommits.length, files: 0, bytes: 0, skipped: [], heldout_ids: {}, split_heldout_lines: {}, heldout_q_answers: [], heldout_q_text: {}, heldout_commits: {}, heldout_dir_files: [] };
function visit(o, rel, depth) {
  if (!o || typeof o !== 'object' || depth > 12) return;
  if (Array.isArray(o)) { for (const x of o) visit(x, rel, depth + 1); return; }
  if ('id' in o && heldQ.has(o.id) && ANS_KEYS.some((k) => k in o) && !('question' in o && !('answer' in o))) out.heldout_q_answers.push({ file: rel, id: o.id, keys: Object.keys(o).slice(0, 12) });
  for (const v of Object.values(o)) visit(v, rel, depth + 1);
}
function scanText(rel, txt) {
  for (const m of txt.matchAll(ID_RE)) if (held.has(m[1])) { (out.heldout_ids[rel] = out.heldout_ids[rel] || new Set()).add(m[1]); }
  if (/"split"\s*:\s*"held_?out"/.test(txt)) {
    const ids = new Set();
    for (const l of txt.split('\n')) if (/"split"\s*:\s*"held_?out"/.test(l)) { const m = l.match(/"id"\s*:\s*"?([A-Za-z0-9x-]+)"?/); ids.add(m ? m[1] : '?'); }
    out.split_heldout_lines[rel] = { n: ids.size, heldout_task_ids: [...ids].filter((i) => held.has(i)).length, sample: [...ids].slice(0, 3) };
  }
  if (/"id"/.test(txt)) {
    let whole = null;
    if (/\.json$/.test(rel) && txt.length < 200e6) { try { whole = JSON.parse(txt); } catch (e) { whole = null; } }
    if (whole) visit(whole, rel, 0);
    else for (const l of txt.split('\n')) { if (!l.includes('"id"')) continue; try { visit(JSON.parse(l), rel, 0); } catch (e) { /* not JSON */ } }
  }
  for (const q of heldQText) if (txt.includes(q.t)) (out.heldout_q_text[rel] = out.heldout_q_text[rel] || []).push(q.id);
  for (const p of heldPrefix) if (txt.includes(p)) (out.heldout_commits[rel] = out.heldout_commits[rel] || []).push(p);
}
function walk(abs, rel) {
  if (!fs.existsSync(abs)) return;
  for (const e of fs.readdirSync(abs, { withFileTypes: true })) {
    const a = path.join(abs, e.name); const r = rel + '/' + e.name;
    if (e.isDirectory()) { walk(a, r); continue; }
    if (!e.isFile()) continue;
    const st = fs.statSync(a);
    if (st.size > 300 * 1024 * 1024) { out.skipped.push(r + ' (' + st.size + ' bytes)'); continue; }
    let buf = fs.readFileSync(a);
    if (r.endsWith('.gz')) { try { buf = zlib.gunzipSync(buf); } catch (err) { out.skipped.push(r + ' (bad gzip)'); continue; } }
    if (buf.subarray(0, 65536).includes(0)) { out.skipped.push(r + ' (binary)'); continue; }
    out.files++; out.bytes += buf.length;
    scanText(r, buf.toString('utf8'));
  }
}
for (const d of ['results', 'tmp', 'arms', 'bench', 'sealed/grader']) walk(path.join(B, d), d);
function listAll(abs, rel) { for (const e of fs.readdirSync(abs, { withFileTypes: true })) { const a = path.join(abs, e.name); if (e.isDirectory()) listAll(a, rel + '/' + e.name); else out.heldout_dir_files.push(rel + '/' + e.name); } }
listAll(path.join(B, 'results', 'heldout'), 'results/heldout');
for (const k of Object.keys(out.heldout_ids)) out.heldout_ids[k] = [...out.heldout_ids[k]].slice(0, 10).concat(out.heldout_ids[k].size > 10 ? ['... ' + out.heldout_ids[k].size + ' ids'] : []);
for (const k of Object.keys(out.heldout_commits)) out.heldout_commits[k] = out.heldout_commits[k].slice(0, 5).concat(out.heldout_commits[k].length > 5 ? ['... ' + out.heldout_commits[k].length] : []);
fs.writeFileSync(process.argv[3], JSON.stringify(out, null, 1));
console.log(JSON.stringify({ held_commits_checked: out.held_commits_checked, files: out.files, MB: Math.round(out.bytes / 1e6), skipped: out.skipped.length, files_with_heldout_ids: Object.keys(out.heldout_ids), files_with_split_heldout: Object.keys(out.split_heldout_lines), heldout_q_answers: out.heldout_q_answers, files_with_heldout_q_text: Object.keys(out.heldout_q_text), files_with_heldout_commits: Object.keys(out.heldout_commits), heldout_dir_files: out.heldout_dir_files }, null, 1));
