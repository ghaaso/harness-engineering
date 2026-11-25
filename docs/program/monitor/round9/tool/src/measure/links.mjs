// links.json: links between parts' files. node links.mjs
import { readFileSync, writeFileSync, statSync, existsSync } from 'node:fs';
import { dirname, posix } from 'node:path';
import { REPO, DATA_DIR, parts, realFiles, norm, patternSpecs } from './common.mjs';
const files = {}, owner = new Map(); // file -> [partIds]
for (const p of parts) { if (p.dummy) continue; const f = realFiles(p); files[p.id] = f; for (const x of f) (owner.get(x) || owner.set(x, []).get(x)).push(p.id); }
// needles for plain names: every file of a part if few, else its static directory
const needles = [];
for (const p of parts) {
  if (p.dummy || !files[p.id].length) continue;
  if (files[p.id].length <= 300) for (const f of files[p.id]) needles.push([f, p.id]);
  else { for (const s of patternSpecs(p.file)) { const st = s.glob.split('/').filter(x => !/[*<]/.test(x)).join('/'); if (st && !s.glob.startsWith('<')) needles.push([st + (s.dir ? '/' : ''), p.id]); } }
}
const TEXT = /\.(md|mjs|js|json|jsonl|sh|ps1|txt|html|css|cjs|ts|yml|yaml)$/i;
const resolveRel = (from, spec) => {
  const base = posix.normalize(posix.join(posix.dirname(from), spec.split(/[?#]/)[0]));
  for (const c of [base, base + '.mjs', base + '.js', base + '.json', base + '/index.mjs', base + '/index.js']) if (owner.has(c)) return c;
  return null;
};
const out = { parts: {}, files };
let total = 0;
for (const p of parts) {
  if (p.dummy) continue;
  const seen = new Map(); // key to|how|file -> entry
  const add = (to, how, file, line) => { if (to === p.id) return; const k = to + '|' + how + '|' + file; if (!seen.has(k)) seen.set(k, { to, how, file, line }); };
  if (files[p.id].length <= 300) for (const file of files[p.id]) {
    if (!TEXT.test(file)) continue;
    let text; try { if (statSync(REPO + '/' + file).size > 2e6) continue; text = readFileSync(REPO + '/' + file, 'utf8'); } catch { continue; }
    const ls = text.split(/\r?\n/);
    ls.forEach((l, i) => {
      const n = i + 1, nl = norm(l);
      let m;
      if (file.endsWith('.md')) { const re = /\[[^\]]*\]\(([^)\s]+)\)/g; while ((m = re.exec(l))) { if (/^[a-z]+:/i.test(m[1])) continue; const r = resolveRel(file, decodeURI(m[1])); if (r) for (const t of owner.get(r)) add(t, 'link', file, n); } }
      const ire = /(?:import\s[^'"]*?from\s*|import\s*\(\s*|import\s+|require\s*\(\s*)['"]([^'"]+)['"]/g;
      while ((m = ire.exec(l))) if (m[1].startsWith('.')) { const r = resolveRel(file, m[1]); if (r) for (const t of owner.get(r)) add(t, 'import', file, n); }
      for (const [nd, to] of needles) { const k = nl.indexOf(nd); if (k >= 0 && (nd.includes('/') || !/[A-Za-z0-9_./-]/.test(nl[k - 1] || ' '))) add(to, 'names', file, n); }
    });
  }
  out.parts[p.id] = [...seen.values()].sort((a, b) => a.to.localeCompare(b.to) || a.how.localeCompare(b.how) || a.file.localeCompare(b.file));
  total += out.parts[p.id].length;
}
writeFileSync(DATA_DIR + '/links.json', JSON.stringify(out, null, 1));
const byHow = {}; for (const a of Object.values(out.parts)) for (const e of a) byHow[e.how] = (byHow[e.how] || 0) + 1;
console.log('links', total, byHow, 'parts with files', Object.values(files).filter(f => f.length).length);
console.log(Object.entries(files).map(([k, v]) => k + ':' + v.length).join(' '));
