'use strict';
// Preflight check 4, step 1: 15 TUNE tasks (12 T1 + 3 T2, distinct parents, seeded draw 7707) with a
// document removed. For each task the removed document is a Markdown doc node at its parent that the
// stored typed-primary TUNE answer (relational 95e990307da3b42b) shows, other than ARCHITECTURE.md (the
// lock lane's choice), so the removal bites; fallback README.md. For 5 of the 15 a code file that the
// stored search primary answer shows (not the seed) is removed as well, so the search arm's text path is
// tested with a file it actually reads. Writes <out>/variants.jsonl and <out>/variants_meta.json.
// usage: node make_variants2.js <build> <out dir> <seed>
const fs = require('fs'); const path = require('path'); const zlib = require('zlib');
const B = process.argv[2]; const OUT = process.argv[3];
const rd = (f) => zlib.gunzipSync(fs.readFileSync(f)).toString('utf8').split('\n').filter(Boolean).map(JSON.parse);
const tasks = fs.readFileSync(path.join(B, 'tasks', 'tasks.jsonl'), 'utf8').split('\n').filter(Boolean).map(JSON.parse).filter((t) => t.split === 'tune' && (t.set === 'T1' || t.set === 'T2') && t.seed && t.seed.path);
let a = Number(process.argv[4] || 7707) >>> 0; const rnd = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const shuffled = [...tasks]; for (let i = shuffled.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; }
const ans = {};
for (const s of ['T1', 'T2']) {
  ans['rel' + s] = new Map(rd(path.join(B, 'results', 'relational', 'tune', '95e990307da3b42b.' + s + '.jsonl.gz')).map((r) => [r.id, r]));
  ans['sea' + s] = new Map(rd(path.join(B, 'results', 'search', 'tune', 'e70177e5807f0252.' + s + '.jsonl.gz')).map((r) => [r.id, r]));
}
const docsAt = new Map();
function docs(sha) {
  if (!docsAt.has(sha)) {
    const s = new Set();
    for (const l of fs.readFileSync(path.join(B, 'facts', 'cache', sha, 'nodes.jsonl'), 'utf8').split('\n')) { if (!l) continue; const n = JSON.parse(l); if (n.kind === 'doc' && n.path) s.add(n.path); }
    docsAt.set(sha, s);
  }
  return docsAt.get(sha);
}
const out = []; const meta = []; const usedParents = new Set(); let nT2 = 0; let nCode = 0;
for (const t of shuffled) {
  if (out.length >= 15) break;
  if (usedParents.has(t.parent)) continue;
  if (t.set === 'T2' && nT2 >= 3) continue;
  if (t.set === 'T1' && out.length - nT2 >= 12) continue;
  const r = ans['rel' + t.set].get(t.id); const s = ans['sea' + t.set].get(t.id);
  if (!r || !s) continue;
  const D = docs(t.parent);
  const shownDocs = [...new Set(r.items.map((x) => x.path))].filter((p) => p && p.endsWith('.md') && p !== 'ARCHITECTURE.md' && D.has(p));
  const doc = shownDocs.length ? shownDocs[0] : (D.has('README.md') ? 'README.md' : null);
  if (!doc) continue;
  const rm = [doc];
  let code = null;
  if (nCode < 5) {
    const sp = s.items.map((x) => x.path).filter((p) => p && p !== t.seed.path && /\.(py|ts|tsx|js|jsx)$/.test(p));
    if (sp.length) { code = sp[0]; rm.push(code); nCode++; }
  }
  usedParents.add(t.parent); if (t.set === 'T2') nT2++;
  out.push({ id: t.id, set: t.set, split: t.split, parent: t.parent, seed: t.seed, remove_paths: rm });
  meta.push({ id: t.id, set: t.set, parent: t.parent.slice(0, 10), doc, doc_in_stored_relational_answer: shownDocs.length > 0, code_removed: code });
}
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'variants.jsonl'), out.map((x) => JSON.stringify(x)).join('\n') + '\n');
fs.writeFileSync(path.join(OUT, 'variants_meta.json'), JSON.stringify(meta, null, 1));
console.log(JSON.stringify(meta, null, 0));
