'use strict';
// Preflight check 9: can an arm process read a reference file? Run inside graphtest:1 with
//   --mount type=tmpfs,destination=/build/sealed
// (a) direct reads of every sealed file name taken from a host-written list (sealed_list.txt), through
//     /build/sealed and two alternative spellings of the path; (b) the mount table entry; (c) a walk of
//     everything else under /build (facts/ excluded: inputs) for files that carry reference-only
//     markers, i.e. a copy of a reference file outside sealed/: the key names of references.jsonl
//     ("commit_n_files_all", "excluded_unreachable") and of tq_reference.jsonl (see `TQREF_KEYS`, read
//     from the host-written list), and any line with a held-out id plus a "files"/"defs" reference list.
// usage: node hide.js <sealed_list.txt> <out.json>
const fs = require('fs'); const path = require('path'); const zlib = require('zlib');
const list = fs.readFileSync(process.argv[2], 'utf8').split('\n').filter(Boolean);
const out = { sealed_dir_listing: null, reads: [], mount: null, copies: [], scanned_files: 0 };
try { out.sealed_dir_listing = fs.readdirSync('/build/sealed'); } catch (e) { out.sealed_dir_listing = 'error ' + e.code; }
for (const rel of list) {
  for (const p of ['/build/sealed/' + rel, '/build/./sealed/' + rel, '/build/arms/../sealed/' + rel]) {
    let r; try { fs.readFileSync(p); r = 'READ'; } catch (e) { r = e.code; }
    out.reads.push({ path: p, result: r });
  }
}
out.mount = fs.readFileSync('/proc/mounts', 'utf8').split('\n').filter((l) => l.includes('/build')).map((l) => l.split(' ').slice(0, 3).join(' '));
const MARK = [/"commit_n_files_all"/, /"excluded_unreachable"/];
const tasks = fs.readFileSync('/build/tasks/tasks.jsonl', 'utf8').split('\n').filter(Boolean).map(JSON.parse);
const held = new Set(tasks.filter((t) => t.split !== 'tune').map((t) => t.id));
function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (p === '/build/sealed' || p === '/build/facts') continue;
    if (e.isDirectory()) { walk(p); continue; }
    if (!e.isFile()) continue;
    const st = fs.statSync(p); if (st.size > 300 * 1024 * 1024) continue;
    let b = fs.readFileSync(p); if (p.endsWith('.gz')) { try { b = zlib.gunzipSync(b); } catch (err) { continue; } }
    if (b.subarray(0, 65536).includes(0)) continue;
    out.scanned_files++;
    const t = b.toString('utf8');
    const hits = MARK.filter((m) => m.test(t)).map(String);
    if (/"defs"\s*:\s*\[/.test(t) && /"files"\s*:\s*\[/.test(t)) for (const m of t.matchAll(/"id"\s*:\s*"(T[0-9x]+-\d+)"/g)) if (held.has(m[1])) { hits.push('held-out id with files/defs lists: ' + m[1]); break; }
    if (hits.length) out.copies.push({ file: p, hits });
  }
}
walk('/build');
out.any_read = out.reads.some((r) => r.result === 'READ');
fs.writeFileSync(process.argv[3], JSON.stringify(out, null, 1));
console.log(JSON.stringify({ listing: out.sealed_dir_listing, reads: out.reads.length, any_read: out.any_read, mount: out.mount, scanned: out.scanned_files, copies: out.copies.slice(0, 20) }, null, 1));
