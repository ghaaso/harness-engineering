'use strict';
// Check 4 (second half): scan every file outside sealed/ and audit/ (what an arm process can see) for
// (a) keys that only reference records carry, (b) held-out TQ reference evidence notes (distinctive text),
// (c) a held-out task id together with a score key in the same file (possible per-task held-out score).
const fs = require('fs'); const path = require('path'); const zlib = require('zlib');
const B = 'C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/build';
const OUT = path.join(B, 'audit/heldout/discipline/scan.json');
const refKeys = ['cochanged_before_xpr', 'same_file_as_seed', 'excluded_unreachable', 'evidence_second', 'naive_search_gets_wrong', 'final_equals_writer', 'commit_n_files_all', 'defs_in_added_files', 'second_confidence'];
const tqr = fs.readFileSync(path.join(B, 'sealed/tq_reference.jsonl'), 'utf8').split('\n').filter(Boolean).map(JSON.parse).filter((q) => q.split !== 'tune');
const notes = []; for (const q of tqr) for (const ev of [...(q.evidence || []), ...(q.evidence_second || [])]) if (ev && typeof ev.note === 'string' && ev.note.length >= 30) notes.push(ev.note);
const wn = tqr.map((q) => q.writer_notes).filter((s) => typeof s === 'string' && s.length >= 40).map((s) => s.slice(0, 60));
const markers = [...new Set([...notes, ...wn])];
const tasks = fs.readFileSync(path.join(B, 'tasks/tasks.jsonl'), 'utf8').split('\n').filter(Boolean).map(JSON.parse);
const hoIds = tasks.filter((t) => t.split !== 'tune' && t.set !== 'T5').map((t) => t.id);
const hoIdRe = new RegExp('"(' + hoIds.map((s) => s.replace(/[-]/g, '\\-')).join('|') + ')"');
const scoreRe = /"(recall|ndcg|ndcg10|mrr|f1|primary|recall_8000|rec8k|precision)"\s*:/;
const SKIP_DIR = new Set(['sealed', 'audit']);
const res = { at: new Date().toISOString(), files: 0, bytes: 0, skipped_binary: 0, ref_key_hits: [], tq_note_hits: [], heldout_id_with_score: [], heldout_id_files: {}, markers: markers.length, heldout_ids: hoIds.length };
const binExt = /\.(duckdb|lbug|db|sqlite|wal|bin|png|jpg|pdf|kz|parquet|arrow)$/i;
function walk(d, rel) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f); const r = rel ? rel + '/' + f : f; let st; try { st = fs.statSync(p); } catch (e) { continue; }
    if (st.isDirectory()) { if (!rel && SKIP_DIR.has(f)) continue; walk(p, r); continue; }
    if (binExt.test(f) || st.size > 400 * 1024 * 1024) { res.skipped_binary++; continue; }
    let buf = fs.readFileSync(p); if (f.endsWith('.gz')) { try { buf = zlib.gunzipSync(buf); } catch (e) { continue; } }
    if (buf.indexOf(0) !== -1 && !f.endsWith('.gz') && buf.indexOf(0) < 4096) { res.skipped_binary++; continue; }
    res.files++; res.bytes += buf.length;
    const s = buf.toString('utf8');
    for (const k of refKeys) if (s.includes(k)) res.ref_key_hits.push(r + ' :: ' + k);
    for (const m of markers) if (s.includes(m)) { res.tq_note_hits.push(r + ' :: ' + m.slice(0, 50)); break; }
    if (hoIdRe.test(s)) {
      const area = r.split('/').slice(0, 2).join('/');
      res.heldout_id_files[area] = (res.heldout_id_files[area] || 0) + 1;
      if (scoreRe.test(s)) res.heldout_id_with_score.push(r);
    }
  }
}
walk(B, '');
fs.writeFileSync(OUT, JSON.stringify(res, null, 1));
console.log(JSON.stringify({ files: res.files, gb: (res.bytes / 1e9).toFixed(2), skipped: res.skipped_binary, markers: res.markers, ref_key_hits: res.ref_key_hits.slice(0, 40), tq_note_hits: res.tq_note_hits.slice(0, 40), heldout_id_with_score: res.heldout_id_with_score.slice(0, 40), heldout_id_files: res.heldout_id_files }, null, 1));
