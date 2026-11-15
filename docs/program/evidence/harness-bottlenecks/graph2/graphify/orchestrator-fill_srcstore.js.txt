'use strict';
// Orchestrator step (2026-11-13): fill the shared source-text cache for the held-out parents, on the host,
// so the frozen graphify adapter's pack step finds every tree. Input cache only: no code and no answer changes.
const fs = require('fs'); const path = require('path'); const crypto = require('crypto');
const BUILD = process.argv[2];
const facts = require(path.join(BUILD, 'arms', 'common', 'facts.js'));
const treesDir = path.join(BUILD, 'arms', 'common', 'srcstore', 'trees');
const sha256 = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const before = {}; for (const f of fs.readdirSync(treesDir)) before[f] = sha256(path.join(treesDir, f));
const tasks = fs.readFileSync(path.join(BUILD, 'tasks', 'tasks.jsonl'), 'utf8').split('\n').filter(Boolean).map(JSON.parse);
const parents = [...new Set(tasks.filter((t) => t.split === 'heldout' && ['T1', 'T1x', 'T2', 'T3', 'T4'].includes(t.set)).map((t) => t.parent))].sort();
const out = { parents: parents.length, made: [], had: [], failed: [] };
for (const sha of parents) {
  const tf = path.join(treesDir, sha + '.json');
  const had = fs.existsSync(tf);
  try { facts.loadFacts(sha); (had ? out.had : out.made).push(sha); } catch (e) { out.failed.push(sha + ': ' + String(e.message).slice(0, 200)); }
}
const changed = []; for (const f of Object.keys(before)) { const p = path.join(treesDir, f); if (!fs.existsSync(p) || sha256(p) !== before[f]) changed.push(f); }
const sizes = parents.map((s) => { const tf = path.join(treesDir, s + '.json'); return fs.existsSync(tf) ? Object.keys(JSON.parse(fs.readFileSync(tf, 'utf8'))).length : 0; });
out.existing_tree_files_before = Object.keys(before).length; out.existing_changed = changed;
out.trees_now = fs.readdirSync(treesDir).filter((f) => f.endsWith('.json') && !f.endsWith('.absent.json')).length;
out.paths_per_tree_min = Math.min(...sizes); out.paths_per_tree_max = Math.max(...sizes); out.missing_after = parents.filter((s) => !fs.existsSync(path.join(treesDir, s + '.json')));
fs.writeFileSync(path.join(process.argv[3], 'fill_srcstore.result.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify({ parents: out.parents, made: out.made.length, had: out.had.length, failed: out.failed, existing_changed: changed, trees_now: out.trees_now, min: out.paths_per_tree_min, max: out.paths_per_tree_max, missing_after: out.missing_after.length }));
