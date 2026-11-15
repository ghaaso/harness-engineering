'use strict';
// Sealed auxiliary records for the literal check (ruling 73) and the list checks (HANDOFF-FORMAT v2 section 5).
// Host only (node + read-only git: rev-list, ls-tree). Writes beside this file:
//   ancestry.jsonl  one row per possible checkpoint {checkpoint, task_commits}: every T1 task commit that is the
//                   checkpoint itself or a git ancestor of it (git rev-list <checkpoint>, the full ancestry, not
//                   the facts cache's commits.jsonl, which leaves ancestors out; audit finding A1).
//                   Possible checkpoints = every facts-cache sha, every lane export graph sha (graphs, graphs0),
//                   every T1 task parent and every T1 task commit. A checkpoint outside this set is refused.
//   universe.jsonl  one row per T1 task parent {parent, code_files}: the code files (evalcore.CODE) of
//                   git ls-tree -r <parent>. Equal, for all 123 parents, to the code entities of the lane's
//                   export graph at that parent (checked here; a difference stops the script, exit 3).
// Prints counts only.   node truth/build_aux.js
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const HERE = __dirname;
const BUILD = path.resolve(HERE, '..', '..', '..', '..');
const LANE = path.resolve(BUILD, '..', 'wider', 'embeddings');
const REPO = 'C:/Users/User/Documents/projects/EMS_workshop1';
const CODE = /^(backend|src|technician-app)\/.*\.(py|ts|tsx|js|jsx|mjs|cjs)$/;
const SHA = /^[0-9a-f]{40}$/;
const git = (...a) => execFileSync('git', ['-C', REPO, ...a], { encoding: 'utf8', maxBuffer: 1 << 28 });
const jl = (f) => fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const dirs = (d) => (fs.existsSync(d) ? fs.readdirSync(d).filter((x) => SHA.test(x)) : []);

const truth = jl(path.join(HERE, 'truth.jsonl'));
const taskCommits = [...new Set(truth.map((t) => t.commit))].sort();
const parents = [...new Set(truth.map((t) => t.parent))].sort();
const facts = dirs(path.join(BUILD, 'facts', 'cache'));
const graphs = [...new Set([...dirs(path.join(LANE, 'export', 'graphs')), ...dirs(path.join(LANE, 'export', 'graphs0'))])];
const cps = [...new Set([...facts, ...graphs, ...parents, ...taskCommits])].sort();

const anc = []; let pairs = 0; let factsPairs = 0; let factsMissed = 0; let factsExtra = 0; let factsLists = 0;
for (const c of cps) {
  const G = new Set(git('rev-list', c).split('\n').filter(Boolean));
  if (!G.has(c)) { console.error('rev-list does not hold its own commit'); process.exit(3); }
  const hit = taskCommits.filter((t) => G.has(t));
  pairs += hit.length; anc.push({ checkpoint: c, task_commits: hit });
  const f = path.join(BUILD, 'facts', 'cache', c, 'commits.jsonl');
  if (fs.existsSync(f)) {
    factsLists++;
    const F = new Set(jl(f).map((r) => r.sha));
    for (const t of taskCommits) { const g = G.has(t); const l = F.has(t) || t === c; factsPairs += l; if (g && !l) factsMissed++; if (l && !g) factsExtra++; }
  }
}
fs.writeFileSync(path.join(HERE, 'ancestry.jsonl'), anc.map((r) => JSON.stringify(r)).join('\n') + '\n');

const uni = []; let graphEqual = 0;
for (const p of parents) {
  const files = git('ls-tree', '-r', '--name-only', p).split('\n').filter((x) => CODE.test(x)).sort();
  const ef = path.join(LANE, 'export', 'graphs', p, 'entities.tsv');
  if (fs.existsSync(ef)) {
    const E = new Set();
    for (const l of fs.readFileSync(ef, 'utf8').split('\n').slice(1)) { if (!l) continue; const c = l.split('\t'); if (c[3] === '1') E.add(c[2]); }
    const S = new Set(files);
    if (E.size !== S.size || [...E].some((x) => !S.has(x))) { console.error('git code files and the export graph differ at a parent'); process.exit(3); }
    graphEqual++;
  }
  uni.push({ parent: p, code_files: files });
}
fs.writeFileSync(path.join(HERE, 'universe.jsonl'), uni.map((r) => JSON.stringify(r)).join('\n') + '\n');
console.log(JSON.stringify({ checkpoints: cps.length, facts_cache: facts.length, export_graphs: graphs.length, task_commits: taskCommits.length,
  ancestor_pairs_git: pairs, facts_lists: factsLists, facts_pairs: factsPairs, facts_missed: factsMissed, facts_extra: factsExtra,
  parents: parents.length, universe_equal_to_export_graph: graphEqual }));
