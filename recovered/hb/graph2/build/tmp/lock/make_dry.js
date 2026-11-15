'use strict';
// Removed-document dry run (protocol addendum 4 item 14): 40 seeded TUNE T1 tasks, each with
// remove_paths = [a document that exists at its parent]: CLAUDE.md where the parent's facts hold it as a
// doc node and git holds it in the parent tree, else the first such doc by path. TUNE only.
//   node tmp/lock/make_dry.js [--n 40] [--seed 20261113] [--out tmp/lock/dry_tasks.jsonl]
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const B = process.env.GT_BUILD || path.resolve(__dirname, '..', '..');
const REPO = process.env.GT_REPO || 'C:/Users/User/Documents/projects/EMS_workshop1';
const a = process.argv.slice(2); const opt = { n: 40, seed: 20261113, out: path.join(B, 'tmp', 'lock', 'dry_tasks.jsonl') };
for (let i = 0; i < a.length; i++) { if (a[i] === '--n') opt.n = Number(a[++i]); else if (a[i] === '--seed') opt.seed = Number(a[++i]); else if (a[i] === '--out') opt.out = a[++i]; }

function mulberry32(s) { return () => { s |= 0; s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const tasks = fs.readFileSync(path.join(B, 'tasks', 'tasks.jsonl'), 'utf8').split('\n').filter(Boolean).map(JSON.parse).filter((t) => t.set === 'T1' && t.split === 'tune' && t.seed && t.seed.path);
tasks.sort((x, y) => (x.id < y.id ? -1 : 1));
const r = mulberry32(opt.seed);
for (let i = tasks.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [tasks[i], tasks[j]] = [tasks[j], tasks[i]]; }

const docCache = new Map();
function docsAt(sha) {
  if (docCache.has(sha)) return docCache.get(sha);
  const nodes = fs.readFileSync(path.join(B, 'facts', 'cache', sha, 'nodes.jsonl'), 'utf8').split('\n').filter(Boolean).map(JSON.parse);
  const docs = [...new Set(nodes.filter((n) => n.kind === 'doc' && n.path).map((n) => n.path))].sort();
  docCache.set(sha, docs); return docs;
}
function inTree(sha, p) { try { execFileSync('git', ['-C', REPO, 'cat-file', '-e', sha + ':' + p], { stdio: 'ignore' }); return true; } catch (e) { return false; } }

const out = []; const stats = { claude: 0, other: 0, parents: new Set() };
for (const t of tasks) {
  if (out.length >= opt.n) break;
  const docs = docsAt(t.parent).filter((p) => inTree(t.parent, p));
  // CLAUDE.md was added on the split date (commit bfb5714, 2026-07-01), so no TUNE parent holds it; the
  // nearest equivalent present at every TUNE parent is ARCHITECTURE.md (in 310 of 388 stored TUNE T1
  // answers of the typed primary, so its removal is visible)
  const doc = ['CLAUDE.md', 'ARCHITECTURE.md'].find((p) => docs.includes(p)) || docs[0];
  if (!doc) continue;
  if (doc === 'CLAUDE.md') stats.claude++; else stats.other++;
  stats.parents.add(t.parent);
  out.push({ id: t.id, set: t.set, split: t.split, parent: t.parent, seed: t.seed, remove_paths: [doc] });
}
fs.mkdirSync(path.dirname(opt.out), { recursive: true });
fs.writeFileSync(opt.out, out.map((x) => JSON.stringify(x)).join('\n') + '\n');
console.log(JSON.stringify({ tasks: out.length, claude_md: stats.claude, other_doc: stats.other, parents: stats.parents.size, out: opt.out, removed: [...new Set(out.map((x) => x.remove_paths[0]))] }));
