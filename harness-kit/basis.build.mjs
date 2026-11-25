#!/usr/bin/env node
// harness-kit/basis.build.mjs: makes harness-kit/basis.json from the record book; nothing in basis.json is typed by hand.
//
//   node harness-kit/basis.build.mjs           writes harness-kit/basis.json
//   node harness-kit/basis.build.mjs --check   exits 1 if basis.json differs from what it would write
//
// Runs only where library/ exists (the owner's clone; main does not hold the record book). basis.json holds every
// record that harness-kit/ORCHESTRATION.md or harness-kit/RESULTS.md cites on a line that states a token figure ("0.20 M",
// "200-280 K", "404,000 tokens"): the lines that give the cost of a helper role or of a session; whose status in library/journal is measured or
// observed: { "id", "status", "date", "claim" } with the claim cut to its first 300 characters. The fan-out gate in kit
// mode accepts such an id as the basis of a stated limit (.claude/hooks/fanout-gate.mjs).
import { readFileSync, writeFileSync, readdirSync, existsSync, renameSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const KIT = dirname(fileURLToPath(import.meta.url));
const REPO = join(KIT, '..');
const JOURNAL = join(REPO, 'library', 'journal');
const OUT = join(KIT, 'basis.json');
const SOURCES = ['ORCHESTRATION.md', 'RESULTS.md'];
const ID = /\b([a-z][a-z0-9]*-\d{4})\b/g;
const COST = /\b\d+(?:[.,]\d+)?\s*[KMB]\b|\b\d{1,3}(?:,\d{3})+\s+tokens\b/;

if (!existsSync(JOURNAL)) {
  console.error('basis.build: library/journal is not in this clone; basis.json is made only where the record book is.');
  process.exit(1);
}
const cited = new Map(); // id -> the first source line that cites it as a cost
for (const f of SOURCES) {
  const text = readFileSync(join(KIT, f), 'utf8');
  for (const line of text.split(/\r?\n/)) {
    if (!COST.test(line)) continue;
    for (const m of line.matchAll(ID)) if (!cited.has(m[1])) cited.set(m[1], f);
  }
}
const records = new Map();
const walk = (d) => {
  for (const e of readdirSync(d, { withFileTypes: true })) {
    const p = join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.jsonl')) for (const l of readFileSync(p, 'utf8').split('\n')) {
      if (!l.startsWith('{')) continue;
      let o; try { o = JSON.parse(l); } catch { continue; }
      if (o && typeof o.id === 'string' && cited.has(o.id) && !records.has(o.id)) records.set(o.id, o);
    }
  }
};
walk(JOURNAL);
const out = [], left = [];
for (const id of [...cited.keys()].sort()) {
  const o = records.get(id);
  if (!o) { left.push(`${id} (not in library/journal)`); continue; }
  if (!['measured', 'observed'].includes(o.status)) { left.push(`${id} (${o.status || 'no status'})`); continue; }
  out.push({ id, status: o.status, date: String(o.date || ''), claim: String(o.claim || '').slice(0, 300) });
}
const text = JSON.stringify(out, null, 1) + '\n';
if (process.argv.includes('--check')) {
  const now = existsSync(OUT) ? readFileSync(OUT, 'utf8') : '';
  if (now !== text) { console.error('basis.build: harness-kit/basis.json is not what the record book gives; run node harness-kit/basis.build.mjs'); process.exit(1); }
  console.log(`basis.build: basis.json matches (${out.length} records)`);
  process.exit(0);
}
writeFileSync(OUT + '.tmp', text);
renameSync(OUT + '.tmp', OUT);
console.log(`basis.build: wrote harness-kit/basis.json, ${out.length} records cited as a cost in ${SOURCES.join(' and ')}; left out ${left.length}: ${left.join(', ') || 'none'}`);
