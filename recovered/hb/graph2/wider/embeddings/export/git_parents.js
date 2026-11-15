'use strict';
// Git facts for the stage-B checkpoint rules (coordinator rulings 49, 50, 52; addendum 8 section M).
// Runs on the HOST (git is not in the training image): node export/git_parents.js
// Reads export/parents.jsonl (the 123 distinct T1 task parents, both splits; no task truth) and the repo the
// facts were built from (FACTS_REPO, default the build tree's REPO). Writes export/parents_git.jsonl, one row per
// parent: sha, author_time (%at), committer_time (%ct), n_git_parents (2+ = merge commit),
// git_ancestor_parents = the OTHER task parents (any split) that are proper git ancestors of this parent
// (from `git rev-list <sha>`, merges included). Read by export/checkpoints.py (rulings 49-52).
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const HERE = __dirname;
const REPO = process.env.FACTS_REPO || 'C:/Users/User/Documents/projects/EMS_workshop1';
const git = (args) => cp.execFileSync('git', ['-C', REPO, ...args], { encoding: 'utf8', maxBuffer: 1 << 28 });
const parents = fs.readFileSync(path.join(HERE, 'parents.jsonl'), 'utf8').split('\n').filter(Boolean).map(JSON.parse);
const shas = new Set(parents.map((r) => r.sha));
const rows = [];
for (const r of parents) {
  const [at, ct, ...ps] = git(['show', '-s', '--format=%at %ct %P', r.sha]).trim().split(/\s+/);
  if (Number(ct) !== r.commit_time) throw new Error('committer time differs from parents.jsonl for ' + r.sha);
  const anc = new Set(git(['rev-list', r.sha]).split('\n').filter(Boolean));
  if (!anc.has(r.sha)) throw new Error('rev-list without self ' + r.sha);
  rows.push({ sha: r.sha, author_time: Number(at), committer_time: Number(ct), n_git_parents: ps.length,
    git_ancestor_parents: [...shas].filter((s) => s !== r.sha && anc.has(s)).sort() });
}
rows.sort((a, b) => (a.sha < b.sha ? -1 : 1));
const out = path.join(HERE, 'parents_git.jsonl');
fs.writeFileSync(out + '.part', rows.map((x) => JSON.stringify(x)).join('\n') + '\n');
fs.renameSync(out + '.part', out);
console.log('wrote', out, rows.length, 'parents;', 'merges', rows.filter((x) => x.n_git_parents > 1).length,
  'git-ancestor pairs', rows.reduce((n, x) => n + x.git_ancestor_parents.length, 0));
