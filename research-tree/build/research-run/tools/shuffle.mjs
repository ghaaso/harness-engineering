// node shuffle.mjs f<n> <review file> <review file>
// Writes fields/<n>-<slug>/score-in/review-1.md and review-2.md in random order, key to sealed/f<n>-arms.json.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { RUN } from './lib.mjs';

const ARM = /\b(R_same|same[- ]window|refuters?|writers?|fresh|arms?)\b/gi;
// Metadata a form puts above the rows (never a table row, so no row's source, model or file is touched).
const META = /^\s*[*_>-]*\s*(arm|reviewer|review by|writer|author|produced by|written by|model|session|window)\s*:/i;

// A header naming an arm and a metadata line are dropped; elsewhere the word is masked and the row kept.
export function scrub(text) {
  const out = [];
  let i = 0;
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  if (lines[0] === '---') { i = 1; while (i < lines.length && lines[i] !== '---') i++; i++; }
  for (; i < lines.length; i++) {
    const l = lines[i];
    ARM.lastIndex = 0;
    const has = ARM.test(l);
    ARM.lastIndex = 0;
    if (/^\s*#/.test(l) && has) continue;
    if (META.test(l)) continue;
    out.push(has ? l.replace(ARM, '[x]') : l);
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

if (import.meta.main) {
  const [f, a, b] = process.argv.slice(2);
  const m = /^f(\d)$/.exec(f || '');
  if (!m || !a || !b) { console.log('usage: node shuffle.mjs f<n> <review file> <review file>'); process.exit(64); }
  const fieldsDir = path.join(RUN, 'fields');
  const dirs = fs.existsSync(fieldsDir) ? fs.readdirSync(fieldsDir).filter(d => d.startsWith(m[1] + '-')) : [];
  if (dirs.length !== 1) { console.log(`REFUSED ${f}: expected one folder fields/${m[1]}-*, found ${dirs.length}`); process.exit(2); }
  const src = [a, b].map(p => path.resolve(RUN, p));
  for (const p of src) if (!fs.existsSync(p)) { console.log(`REFUSED ${f}: no file ${p}`); process.exit(2); }
  const inDir = path.join(fieldsDir, dirs[0], 'score-in');
  fs.mkdirSync(inDir, { recursive: true });
  fs.mkdirSync(path.join(RUN, 'sealed'), { recursive: true });
  // A repeat (a rerun after a crash) reuses the sealed assignment; a new key is never made.
  let order = crypto.randomInt(2) === 1 ? [1, 0] : [0, 1];
  let reuse = false;
  try {
    const k = JSON.parse(fs.readFileSync(path.join(RUN, 'sealed', `${f}-arms.json`), 'utf8'));
    const o = [k['review-1.md'].argument - 1, k['review-2.md'].argument - 1];
    if (o.slice().sort().join() === '0,1') { order = o; reuse = true; }
  } catch {}
  order.forEach((k, j) => fs.writeFileSync(path.join(inDir, `review-${j + 1}.md`), scrub(fs.readFileSync(src[k], 'utf8'))));
  if (!reuse) fs.writeFileSync(path.join(RUN, 'sealed', `${f}-arms.json`), JSON.stringify({
    'review-1.md': { from: src[order[0]], argument: order[0] + 1 },
    'review-2.md': { from: src[order[1]], argument: order[1] + 1 },
    made: new Date().toISOString() }, null, 1));
  console.log(`${f} shuffled: fields/${dirs[0]}/score-in/review-1.md and review-2.md written; key sealed`);
}
