#!/usr/bin/env node
// ladder-move.mjs: between two tiers of a ladder run (see RUN-LADDER.md), takes the results that stopped at the
// smaller size out of results/, so that the next tier runs those parts again in its normal pool, several at once,
// instead of alone. Nothing is deleted: each file goes to <side>/at-<size>/<config>/<part>.json and stays there
// as the record of that attempt.
//
//   node ladder-move.mjs <results folder> <side folder> <size MB>
//
// Prints one JSON line: how many were moved, per configuration.
import fs from 'node:fs';
import path from 'node:path';

const [, , RES, SIDE, SIZE] = process.argv;
const size = Number(SIZE);
if (!RES || !SIDE || !(size > 0)) { process.stderr.write('usage: node ladder-move.mjs <results folder> <side folder> <size MB>\n'); process.exit(64); }

let moved = 0;
const per = {};
for (const d of fs.readdirSync(RES, { withFileTypes: true })) {
  if (!d.isDirectory()) continue;
  const dir = path.join(RES, d.name);
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.json')) continue;
    let r;
    try { r = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch { continue; } // a torn file is the runner's to judge
    if (r.status === 'complete' || r.mem_mb !== size) continue; // only what stopped (bounded or failed) at exactly this tier's size
    const to = path.join(SIDE, 'at-' + size, d.name);
    fs.mkdirSync(to, { recursive: true });
    fs.renameSync(path.join(dir, f), path.join(to, f));
    moved++;
    per[d.name] = (per[d.name] || 0) + 1;
  }
}
process.stdout.write(JSON.stringify({ t: new Date().toISOString(), moved_from_size_mb: size, moved, per_config: per }) + '\n');
