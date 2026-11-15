'use strict';
// Check 9: for 10 sampled held-out tasks (fixed seed), files ADDED by the task commit (git diff-tree, read-only)
// must be absent from the parent's facts (nodes/edges/commits/meta) and from the search arm's source tree of the
// parent (copied read-only out of volume gt-search into ./trees/ by c9_trees.sh).
const fs = require('fs'); const path = require('path'); const cp = require('child_process');
const B = 'C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/build';
const D = path.join(B, 'audit/heldout/discipline'); const REPO = 'C:/Users/User/Documents/projects/EMS_workshop1';
const mode = process.argv[2] || 'pick';
const tasks = fs.readFileSync(path.join(B, 'tasks/tasks.jsonl'), 'utf8').split('\n').filter(Boolean).map(JSON.parse).filter((t) => t.split !== 'tune' && t.set !== 'T5');
const refs = new Map(fs.readFileSync(path.join(B, 'sealed/references.jsonl'), 'utf8').split('\n').filter(Boolean).map(JSON.parse).map((r) => [r.id, r]));
let s = 20261113 >>> 0; const rnd = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const ids = tasks.map((t) => t.id).sort(); const pick = []; const usedC = new Set();
while (pick.length < 10) { const want = ids[Math.floor(rnd() * ids.length)]; const t = tasks.find((x) => x.id === want); const r = refs.get(t.id); const c = r && (r.commit || r.fix_commit); if (!c || usedC.has(c)) continue; usedC.add(c); pick.push({ id: t.id, set: t.set, parent: t.parent, commit: c }); }
if (mode === 'pick') { fs.writeFileSync(path.join(D, 'c9_pick.json'), JSON.stringify(pick, null, 1)); console.log(pick.map((p) => p.parent).join(' ')); process.exit(0); }
const esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const rows = [];
for (const p of pick) {
  const parentOfCommit = cp.execFileSync('git', ['-C', REPO, 'rev-parse', p.commit + '^'], { encoding: 'utf8' }).trim();
  const added = cp.execFileSync('git', ['-C', REPO, 'diff-tree', '-r', '--no-renames', '--no-commit-id', '--diff-filter=A', '--name-only', p.parent, p.commit], { encoding: 'utf8' }).split('\n').filter(Boolean);
  const factsDir = path.join(B, 'facts/cache', p.parent);
  const ftext = ['nodes.jsonl', 'edges.jsonl', 'commits.jsonl', 'meta.json'].map((f) => fs.existsSync(path.join(factsDir, f)) ? fs.readFileSync(path.join(factsDir, f), 'utf8') : '').join('\n');
  const nodes = fs.readFileSync(path.join(factsDir, 'nodes.jsonl'), 'utf8').split('\n').filter(Boolean).map(JSON.parse);
  const nodePaths = new Set(nodes.map((n) => n.path).filter(Boolean));
  const treeF = path.join(D, 'trees', p.parent + '.json'); const tree = fs.existsSync(treeF) ? JSON.parse(fs.readFileSync(treeF, 'utf8')) : null;
  const treeKeys = tree ? new Set(Object.keys(tree.files || tree.paths || tree)) : null;
  const r = { ...p, commit_parent_is_task_parent: parentOfCommit === p.parent, added_files: added.length, added_in_node_paths: [], added_mentioned_in_facts_text: [], added_in_search_tree: [], tree_present: !!tree, tree_entries: treeKeys ? treeKeys.size : null, ref_added_files_eq_git: null };
  for (const a of added) {
    if (nodePaths.has(a)) r.added_in_node_paths.push(a);
    const re = new RegExp('(^|[^A-Za-z0-9_./-])' + esc(a) + '($|[^A-Za-z0-9_/-])');
    if (re.test(ftext)) r.added_mentioned_in_facts_text.push(a);
    if (treeKeys && treeKeys.has(a)) r.added_in_search_tree.push(a);
  }
  const rf = refs.get(p.id); const ra = rf && rf.excluded_unreachable ? rf.excluded_unreachable.added_files || [] : null;
  if (ra) r.ref_added_files_eq_git = JSON.stringify([...ra].sort()) === JSON.stringify([...added].sort());
  r.added_sample = added.slice(0, 5);
  rows.push(r);
}
// detail for mentions: which facts lines mention them (could be docs citing a not-yet-existing file)
for (const r of rows) {
  r.mention_detail = [];
  if (!r.added_mentioned_in_facts_text.length) continue;
  const factsDir = path.join(B, 'facts/cache', r.parent);
  for (const f of ['nodes.jsonl', 'edges.jsonl', 'commits.jsonl', 'meta.json']) {
    const t = fs.existsSync(path.join(factsDir, f)) ? fs.readFileSync(path.join(factsDir, f), 'utf8').split('\n') : [];
    for (const a of r.added_mentioned_in_facts_text) { const l = t.find((x) => x.includes(a)); if (l) r.mention_detail.push({ file: f, path: a, line: l.slice(0, 300) }); }
  }
}
fs.writeFileSync(path.join(D, 'c9.json'), JSON.stringify(rows, null, 1));
console.log(JSON.stringify(rows.map((r) => ({ id: r.id, set: r.set, ok_parent: r.commit_parent_is_task_parent, added: r.added_files, node: r.added_in_node_paths.length, text: r.added_mentioned_in_facts_text.length, tree: r.tree_present, tree_n: r.tree_entries, in_tree: r.added_in_search_tree.length, ref_eq: r.ref_added_files_eq_git, md: r.mention_detail.slice(0, 3) })), null, 1));
