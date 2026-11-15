'use strict';
// The first-parent ancestry tree of all cached snapshots (read-only git). Each snapshot's parent in the
// tree is its nearest cached ancestor along its own first-parent chain; gap = first-parent commits
// between them. Output: data/tree.json and file content hashes per snapshot (git ls-tree, blob ids):
// data/blobs/<sha>.json = { path: blob }.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const C = require('./conf');

const git = (...a) => execFileSync('git', ['-C', C.REPO, ...a], { maxBuffer: 1 << 28 }).toString();
const chain = JSON.parse(fs.readFileSync(path.join(C.DATA, 'chain.json'), 'utf8'));
const snaps = [...chain.snapshots.map((x) => x.sha), ...chain.off_chain.map((x) => x.sha)];
const set = new Set(snaps);
const onMain = new Set(chain.snapshots.map((x) => x.sha));
const nodes = {};
for (const s of snaps) {
  const fp = git('rev-list', '--first-parent', s).trim().split('\n');
  let parent = null; let gap = null;
  for (let i = 1; i < fp.length; i++) if (set.has(fp[i])) { parent = fp[i]; gap = i; break; }
  nodes[s] = { sha: s, parent, gap, depth_fp: fp.length - 1, on_main_fp: onMain.has(s) };
}
// children, roots, order (parents before children: by first-parent depth, then sha)
for (const s of snaps) nodes[s].children = [];
for (const s of snaps) if (nodes[s].parent) nodes[nodes[s].parent].children.push(s);
const order = snaps.slice().sort((a, b) => nodes[a].depth_fp - nodes[b].depth_fp || (a < b ? -1 : 1));
const roots = order.filter((s) => !nodes[s].parent);
const gapHist = {}; for (const s of snaps) if (nodes[s].gap != null) gapHist[nodes[s].gap] = (gapHist[nodes[s].gap] || 0) + 1;
const branching = snaps.filter((s) => nodes[s].children.length > 1).length;
fs.writeFileSync(path.join(C.DATA, 'tree.json'), JSON.stringify({ roots, order, nodes, gapHist, branching }, null, 1));
console.log(JSON.stringify({ n: snaps.length, roots: roots.length, gapHist, branching, steps: snaps.length - roots.length }));

// blob ids per snapshot
const bd = path.join(C.DATA, 'blobs');
fs.mkdirSync(bd, { recursive: true });
for (const s of snaps) {
  const f = path.join(bd, s + '.json');
  if (fs.existsSync(f)) continue;
  const m = {};
  for (const line of git('ls-tree', '-r', '--full-tree', s).split('\n')) {
    if (!line) continue;
    const t = line.indexOf('\t');
    const [, type, blob] = line.slice(0, t).split(' ');
    if (type === 'blob') m[line.slice(t + 1)] = blob;
  }
  fs.writeFileSync(f, JSON.stringify(m));
}
console.log('blobs done');
