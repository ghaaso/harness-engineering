'use strict';
// Preflight: what the run volumes already hold for held-out parents (read-only; mounted at /v/<name>).
// For each volume: source trees (src/trees/<sha>.json) and arm stores whose name or meta names a
// held-out-only parent (a parent of a held-out T1..T4 task that is not a TUNE parent), and whether each
// such tree lacks a doc that exists at that parent (a tree written under a removal).
// usage (in graphtest:1): node volscan.js /build <out.json> /v/gt-relational /v/gt-ladybug ...
const fs = require('fs'); const path = require('path');
const B = process.argv[2]; const OUT = process.argv[3]; const vols = process.argv.slice(4);
const tasks = fs.readFileSync(path.join(B, 'tasks', 'tasks.jsonl'), 'utf8').split('\n').filter(Boolean).map(JSON.parse);
const tuneP = new Set(tasks.filter((t) => t.split === 'tune').map((t) => t.parent));
const heldP = new Set(tasks.filter((t) => t.split !== 'tune' && t.seed && t.seed.path).map((t) => t.parent));
const heldOnly = new Set([...heldP].filter((p) => !tuneP.has(p)));
const FROZEN = 'a31924a3818f4ac94b695906d107c72c912792b2';
const out = { held_only_parents: heldOnly.size, volumes: {} };
function walk(d, acc, depth = 0) { if (depth > 4 || !fs.existsSync(d)) return acc; for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); acc.push(p); if (e.isDirectory()) walk(p, acc, depth + 1); } return acc; }
for (const v of vols) {
  const o = { exists: fs.existsSync(v), top: fs.existsSync(v) ? fs.readdirSync(v) : [], trees_total: 0, held_only_trees: [], entries_naming_held_only_parent: [] };
  const td = path.join(v, 'src', 'trees');
  if (fs.existsSync(td)) for (const f of fs.readdirSync(td)) {
    o.trees_total++;
    const sha = f.replace(/\.json$/, '');
    if (heldOnly.has(sha) || (heldP.has(sha) && sha !== FROZEN)) {
      const tree = JSON.parse(fs.readFileSync(path.join(td, f), 'utf8'));
      o.held_only_trees.push({ sha: sha.slice(0, 10), held_only: heldOnly.has(sha), paths: Object.keys(tree).length, has_CLAUDE_md: 'CLAUDE.md' in tree, mtime: fs.statSync(path.join(td, f)).mtime.toISOString() });
    }
  }
  for (const p of walk(v, [])) {
    if (p.startsWith(td)) continue;
    for (const h of heldOnly) if (p.includes(h.slice(0, 12)) || p.includes(h)) o.entries_naming_held_only_parent.push(p.replace(v, ''));
  }
  o.entries_naming_held_only_parent = o.entries_naming_held_only_parent.slice(0, 20);
  out.volumes[path.basename(v)] = o;
}
fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
for (const [k, o] of Object.entries(out.volumes)) console.log(k, 'top', JSON.stringify(o.top), 'trees', o.trees_total, 'held trees', JSON.stringify(o.held_only_trees), 'named entries', o.entries_naming_held_only_parent.length);
