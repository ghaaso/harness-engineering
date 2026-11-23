// assemble.mjs: build the blinded case files of replay-L6 from cases-src/ (SCORING.md "Arms and reviewers").
// Usage: node assemble.mjs   (run from any folder). Writes cases/cNN-A.md, cases/cNN-B.md, key.json, assemble-out.txt.
import fs from 'node:fs';
import path from 'node:path';

const HERE = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1');
const SRC = path.join(HERE, 'cases-src');
const OUT = path.join(HERE, 'cases');
fs.mkdirSync(OUT, { recursive: true });

// fixed-seed shuffle (mulberry32), seed written here before any verdict exists
let s = 20261123;
const rnd = () => { s |= 0; s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

const all = [], noV2 = [], bad = [];
for (const d of fs.readdirSync(SRC).sort()) {
  const dir = path.join(SRC, d);
  if (!fs.statSync(dir).isDirectory()) continue;
  let meta;
  try { meta = JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8')); } catch (e) { bad.push(`${d}: no meta.json`); continue; }
  if (!fs.existsSync(path.join(dir, 'v1.md'))) { bad.push(`${d}: no v1.md`); continue; }
  const hasV2 = fs.existsSync(path.join(dir, 'v2.md'));
  const row = { src: d, finding: meta.finding, cls: meta.class, claim: meta.claim, v2src: hasV2 ? (meta.v2 && meta.v2.source) : 'c' };
  if (!hasV2) { noV2.push(row); continue; }
  all.push(row);
}
for (let i = all.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [all[i], all[j]] = [all[j], all[i]]; }

const key = [];
all.forEach((r, i) => {
  const id = 'c' + String(i + 1).padStart(2, '0');
  const v1 = fs.readFileSync(path.join(SRC, r.src, 'v1.md'), 'utf8').trim();
  const v2 = fs.readFileSync(path.join(SRC, r.src, 'v2.md'), 'utf8').trim();
  const head = `# Case ${id}\n\nClaim under review: ${r.claim}\n\n`;
  fs.writeFileSync(path.join(OUT, `${id}-A.md`), head + `## The report\n\n${v1}\n`);
  fs.writeFileSync(path.join(OUT, `${id}-B.md`), head +
    `Two versions of the same worker's report on the same work follow.\n\n## Version 1\n\n${v1}\n\n## Version 2\n\n${v2}\n`);
  key.push({ id, ...r });
});
fs.writeFileSync(path.join(HERE, 'key.json'), JSON.stringify({ cases: key, noV2, bad }, null, 1));
const n = (c) => key.filter((k) => k.cls === c).length;
const lines = [`cases with v2: ${key.length} (overstated ${n('overstated')}, accurate ${n('accurate')})`,
  `v2 source: a ${key.filter((k) => k.v2src === 'a').length}, b ${key.filter((k) => k.v2src === 'b').length}`,
  `no v2 (left out of the paired comparison): ${noV2.length} ${noV2.map((r) => r.finding + '/' + r.cls).join(', ')}`,
  `unusable: ${bad.length} ${bad.join('; ')}`];
fs.writeFileSync(path.join(HERE, 'assemble-out.txt'), lines.join('\n') + '\n');
console.log(lines.join('\n'));
