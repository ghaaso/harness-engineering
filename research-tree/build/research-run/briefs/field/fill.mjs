// node fill.mjs <n> [run root]: fills the step templates of RUN:briefs/field/ for field f<n> into
// RUN:fields/<n>-<slug>/briefs/ (a template holding {topic} is written once per topic of topics.md). One line printed.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const n = process.argv[2];
const RUN = path.resolve(process.argv[3] || path.join(here, '..', '..'));
const SLUG = { 2: 'graphs', 3: 'encoders', 4: 'memory', 5: 'neurosymbolic', 6: 'localcard', 7: 'orchestration', 8: 'measurement' };
if (!SLUG[n]) { console.log('usage: node fill.mjs <2-8> [run root]'); process.exit(64); }
const src = path.join(RUN, 'briefs', 'field');
const topics = fs.readFileSync(path.join(src, 'topics.md'), 'utf8').split(/\r?\n/)
  .filter(l => l.startsWith(`| f${n} |`)).map(l => l.split('|')[2].trim());
if (topics.length !== 5) { console.log(`REFUSED f${n}: ${topics.length} topics in topics.md, need 5`); process.exit(2); }
const x0 = 50 + 5 * (Number(n) - 2);
const xs = topics.map((_, k) => 'x' + (x0 + k));
const base = { '{n}': n, '{slug}': SLUG[n], '{prefix}': 'd' + n, '{x_files}': `${xs[0]} to ${xs[4]}` };
const out = path.join(RUN, 'fields', `${n}-${SLUG[n]}`, 'briefs');
fs.mkdirSync(out, { recursive: true });
const fill = (t, extra) => Object.entries({ ...base, ...extra }).reduce((s, [k, v]) => s.split(k).join(v), t);
const made = [];
for (const f of fs.readdirSync(src).filter(f => f.endsWith('.md') && f !== 'topics.md')) {
  const t = fs.readFileSync(path.join(src, f), 'utf8');
  if (t.includes('{topic}')) {
    topics.forEach((tp, k) => {
      const name = f.replace(/\.md$/, `-${tp}.md`);
      fs.writeFileSync(path.join(out, name), fill(t, { '{topic}': tp, '{x_file}': xs[k] }));
      made.push(name);
    });
  } else { fs.writeFileSync(path.join(out, f), fill(t, {})); made.push(f); }
}
const left = made.filter(m => /\{(n|slug|prefix|x_files|x_file|topic)\}/.test(fs.readFileSync(path.join(out, m), 'utf8')));
console.log(`f${n} filled ${made.length} briefs in fields/${n}-${SLUG[n]}/briefs/ (topics ${topics.join(', ')}; ${xs[0]} to ${xs[4]})` +
  (left.length ? `; PLACEHOLDERS LEFT in ${left.join(', ')}` : ''));
