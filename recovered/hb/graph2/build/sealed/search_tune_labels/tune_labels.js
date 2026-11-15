'use strict';
// TUNE-ONLY proxy labels for choosing this arm's configuration (deviation: the sealed reference
// is never read; these labels are re-derived from git for TUNE tasks only, by the rule in
// tasks/README.md: the other existing changed code/test/migration files of the task commit, and the
// definitions at the parent that the diff touches). A HELD-OUT task makes the script exit.
//   node tune_labels.js > tune_labels.jsonl
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const L = require('./lib');

const git = (...a) => execFileSync('git', ['-C', L.REPO, ...a], { maxBuffer: 1 << 28 }).toString('utf8');
const tasks = fs.readFileSync(path.join(L.BUILD, 'tasks', 'tasks.jsonl'), 'utf8').split('\n').filter(Boolean).map(JSON.parse)
  .filter((t) => ['T1', 'T1x', 'T2'].includes(t.set));
const FROZEN = 'a31924a3818f4ac94b695906d107c72c912792b2';
const SPLIT = Date.parse('2026-07-01T00:00:00Z');
// non-merge commits on the frozen main, by first parent
const children = new Map();
for (const line of git('rev-list', '--no-merges', '--parents', '--format=%H %aI', FROZEN).split('\n')) {
  if (!line || line.startsWith('commit ')) continue;
  const [h, date] = line.split(' ');
  children.set(h, { h, date });
}
const firstParent = new Map();
for (const line of git('rev-list', '--no-merges', '--parents', FROZEN).split('\n')) {
  const p = line.split(' '); if (p.length >= 2) { if (!firstParent.has(p[1])) firstParent.set(p[1], []); firstParent.get(p[1]).push(p[0]); }
}
const nodeCache = new Map();
function defsAt(parent) {
  if (!nodeCache.has(parent)) nodeCache.set(parent, L.loadNodes(path.join(L.FACTS_CACHE, parent)));
  return nodeCache.get(parent);
}
const out = [];
for (const t of tasks) {
  if (t.split !== 'tune') continue;
  const cands = (firstParent.get(t.parent) || []).filter((c) => Date.parse(children.get(c).date) < SPLIT);
  let child = null; let changed = null;
  for (const c of cands) {
    const files = git('diff', '--name-only', '--no-renames', t.parent, c).split('\n').filter(Boolean);
    if (files.includes(t.seed.path)) { child = c; changed = files; break; }
  }
  if (!child) { out.push({ id: t.id, error: 'no child' }); continue; }
  if (Date.parse(children.get(child).date) >= SPLIT) { console.error('HELD-OUT commit reached; abort'); process.exit(3); }
  const existing = new Set(git('ls-tree', '-r', '--name-only', t.parent).split('\n'));
  const ctm = changed.filter((f) => existing.has(f) && L.isCTM(f));
  let refFiles = ctm.filter((f) => f !== t.seed.path);
  if (t.set === 'T2') refFiles = refFiles.filter((f) => L.classify(f) === 'test');
  // changed definitions: old-side hunks mapped to the innermost definition at the parent
  const nodes = defsAt(t.parent); const defs = new Set();
  const diff = git('diff', '-U0', '--no-renames', t.parent, child, '--', ...ctm);
  let cur = null;
  for (const l of diff.split('\n')) {
    if (l.startsWith('--- ')) { cur = l.startsWith('--- a/') ? l.slice(6) : null; continue; }
    const m = l.match(/^@@ -(\d+)(?:,(\d+))? /); if (!m || !cur) continue;
    const s = +m[1]; const n = m[2] == null ? 1 : +m[2];
    for (let ln = s; ln <= Math.max(s, s + n - 1); ln++) { const e = L.enclosing(nodes, cur, ln); if (e) defs.add(cur + '::' + e.name); }
  }
  const seedKey = t.seed.symbol ? t.seed.path + '::' + t.seed.symbol.name : null;
  let refDefs = [...defs].filter((d) => d !== seedKey);
  if (t.set === 'T2') refDefs = refDefs.filter((d) => refFiles.includes(d.split('::')[0]));
  out.push({ id: t.id, set: t.set, parent: t.parent, commit_group: child.slice(0, 12), ref_files: refFiles.sort(), ref_defs: refDefs.sort() });
}
for (const r of out) process.stdout.write(JSON.stringify(r) + '\n');
console.error('labels', out.length, 'errors', out.filter((r) => r.error).length);
