// Held-out truth from git with the tuning definition (build_tune.py): child commit's first parent == task parent,
// diff-tree -r --name-status -M <commit> (first parent), seeds = status M/R code files (old path), 2..30 of them.
const fs = require('fs'), cp = require('child_process');
const L = 'C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings';
const R = 'C:/Users/User/Documents/projects/EMS_workshop1';
const OUT = 'C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/coord/audit10b/heldout2/';
const CODE0 = /^(backend|src|technician-app)\/.*\.(py|ts|tsx|js|jsx|mjs|cjs)$/;
const CODE = { test: (p) => CODE0.test(p) || p === 'ops-server.mjs' };
const git = (a) => cp.execFileSync('git', ['-C', R, ...a], { encoding: 'utf8', maxBuffer: 1 << 28 });
const tasks = fs.readFileSync(L + '/train/heldout/tasks_used.jsonl', 'utf8').trim().split('\n').map(JSON.parse);
const all = git(['rev-list', '--all', '--parents']).trim().split('\n').map((l) => l.split(' '));
const kids = {}; // parent -> [{c, idx(which parent position), nparents}]
for (const [c, ...ps] of all) ps.forEach((p, i) => (kids[p] = kids[p] || []).push({ c, pos: i, np: ps.length }));
function ns(args) {
  return git(['diff-tree', '--no-commit-id', '-r', '--name-status', ...args]).split('\n').filter(Boolean).map((l) => l.split('\t'));
}
const log = [];
// runs of tasks by parent in file order
const runs = []; for (const t of tasks) { const r = runs[runs.length - 1]; if (r && r.parent === t.parent) r.tasks.push(t); else runs.push({ parent: t.parent, tasks: [t] }); }
const commitInfo = {};
for (const p of new Set(tasks.map((t) => t.parent))) {
  const ks = kids[p] || [];
  commitInfo[p] = ks.map((k) => {
    const single = ns(['-M', k.c]); // as build_tune: diff against first parent; merges: default (nothing)
    const vsP = ns(['-M', p, k.c]); // explicit parent..commit
    const vsP0 = ns(['-M0', p, k.c]);
    const seeds = (x) => x.filter((f) => 'MR'.includes(f[0][0]) && CODE.test(f[f.length - 1])).map((f) => f[1]);
    const added = vsP.filter((f) => f[0][0] === 'A' && CODE.test(f[1])).map((f) => f[1]);
    return { c: k.c, pos: k.pos, np: k.np, seedsSingle: seeds(single), seedsVsP: seeds(vsP), seedsM0: vsP0.filter((f) => f[0] === 'M' && CODE.test(f[1])).map((f) => f[1]), added,
      renames: vsP.filter((f) => f[0][0] === 'R').map((f) => f.join(' ')), date: git(['show', '-s', '--format=%ad|%at|%ct', '--date=short', k.c]).trim() };
  });
}
// match each run to commit(s): split run into consecutive chunks whose seed sets equal a child's seed list
const rows = []; const usedCommits = new Map();
for (const run of runs) {
  let j = 0; const ks = commitInfo[run.parent];
  while (j < run.tasks.length) {
    let hit = null;
    for (const k of ks) {
      const n = k.seedsVsP.length; const chunk = run.tasks.slice(j, j + n);
      if (n >= 2 && n <= 30 && chunk.length === n && chunk.map((t) => t.seed.path).sort().join('|') === [...k.seedsVsP].sort().join('|')) {
        if (!hit) hit = []; hit.push(k);
      }
    }
    if (!hit) { log.push('NO MATCH run at ' + run.tasks[j].id + ' parent ' + run.parent.slice(0, 12) + ' kids ' + ks.map((k) => k.c.slice(0, 8) + '/np' + k.np + '/pos' + k.pos + '/' + k.seedsVsP.length).join(',')); j++; continue; }
    // prefer the non-merge first-parent child, as build_tune (first parent, single-commit diff-tree)
    const pick = hit.find((k) => k.np === 1) || hit.find((k) => k.pos === 0) || hit[0];
    if (hit.length > 1) log.push('AMBIG at ' + run.tasks[j].id + ': ' + hit.map((k) => k.c.slice(0, 8) + '/np' + k.np + '/pos' + k.pos + '/single' + k.seedsSingle.length + '/' + k.date).join(' ; ') + ' -> picked ' + pick.c.slice(0, 8));
    const n = pick.seedsVsP.length;
    for (const t of run.tasks.slice(j, j + n)) {
      rows.push({ task_id: t.id, parent: t.parent, commit: pick.c, seed: t.seed.path, truth: pick.seedsVsP.filter((x) => x !== t.seed.path && CODE0.test(x)), truthB: pick.seedsVsP.filter((x) => x !== t.seed.path),
        alt_commits: hit.filter((k) => k !== pick).map((k) => k.c), truthM0: pick.seedsM0.filter((x) => x !== t.seed.path && CODE0.test(x)), single_ok: pick.seedsSingle.length === n, np: pick.np, pos: pick.pos, date: pick.date });
    }
    usedCommits.set(pick.c, (usedCommits.get(pick.c) || 0) + n);
    j += n;
  }
}
// per parent summary
const per = Object.entries(commitInfo).map(([p, ks]) => p.slice(0, 12) + ': ' + ks.map((k) => k.c.slice(0, 8) + ' np' + k.np + ' pos' + k.pos + ' seeds' + k.seedsVsP.length + ' single' + k.seedsSingle.length + ' M0:' + k.seedsM0.length + ' A:' + k.added.length + (k.renames.length ? ' R:' + k.renames.join(';') : '') + ' ' + k.date).join(' | '));
const diffM0 = rows.filter((r) => r.truth.slice().sort().join('|') !== r.truthM0.slice().sort().join('|')).length;
const s = ['tasks ' + tasks.length + ' matched rows ' + rows.length + ' commits ' + usedCommits.size + ' distinct parents ' + new Set(rows.map((r) => r.parent)).size,
  'rows whose -M0 status-M truth differs from -M M/R truth: ' + diffM0,
  'rows where single-commit diff-tree (build_tune form) gives a different seed count: ' + rows.filter((r) => !r.single_ok).length,
  'picked merge commits: ' + [...usedCommits.keys()].filter((c) => rows.find((r) => r.commit === c).np > 1).length,
  'dates of picked commits: ' + [...new Set(rows.map((r) => r.date.split('|')[0]))].sort().join(','),
  ...log, '--- per parent children', ...per].join('\n');
fs.writeFileSync(OUT + 'truth2.out', s + '\n');
fs.writeFileSync(OUT + 'heldout_truth2.jsonl', rows.map((r) => JSON.stringify(r)).join('\n') + '\n');
console.log(s.split('\n').slice(0, 40).join('\n'));
