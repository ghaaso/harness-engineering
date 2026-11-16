// Each co_changed pair of the stage-A graph: is there a commit among cd806c80's history (ancestors.txt)
// that touched both files? And does any later commit (tuning date_order >= 16) appear? Read-only git.
const fs = require('fs'), path = require('path'), cp = require('child_process');
const LANE = 'C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings';
const REPO = 'C:/Users/User/Documents/projects/EMS_workshop1';
const SHA = 'cd806c803c4ad8ec198790096d196460789951f0';
const anc = fs.readFileSync(path.join(LANE, 'export/graphs', SHA, 'ancestors.txt'), 'utf8').trim().split('\n');
const files = {}; const atime = {};
for (const c of anc) {
  const o = cp.execFileSync('git', ['-C', REPO, 'show', '--no-renames', '--name-only', '--format=%at', c], { encoding: 'utf8' }).trim().split('\n');
  atime[c] = +o[0]; files[c] = new Set(o.slice(1).filter(Boolean));
}
const tri = fs.readFileSync(path.join(LANE, 'export/graphs0', SHA, 'triples.tsv'), 'utf8').split('\n').slice(1).filter(Boolean).map(l => l.split('\t'));
const pairs = new Map(); for (const [h, r, t] of tri) if (r === 'co_changed') { const k = [h, t].sort().join('|'); pairs.set(k, [h, t].sort()); }
let ok = 0; const bad = []; const support = {};
for (const [k, [a, b]] of pairs) {
  const pa = a.replace(/^file:/, ''), pb = b.replace(/^file:/, '');
  const cs = anc.filter(c => files[c].has(pa) && files[c].has(pb));
  if (cs.length) ok++; else bad.push(k); support[k] = cs.length;
}
// pairs co-changed in some ancestor commit but absent from the graph (expected: filters, e.g. size caps)
const tune = fs.readFileSync(path.join(LANE, 'eval/tune_commits.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
const late = tune.filter(x => x.date_order >= 16).map(x => x.commit);
const out = {
  ancestors: anc.length, max_ancestor_author_time: Math.max(...Object.values(atime)),
  min_late_tuning_author_time: Math.min(...tune.filter(x => x.date_order >= 16).map(x => x.author_time)),
  late_tuning_commits_in_ancestors: late.filter(c => anc.includes(c)).length,
  inner_tuning_commits_in_ancestors: tune.filter(x => x.date_order <= 15 && anc.includes(x.commit)).map(x => x.date_order),
  pairs: pairs.size, pairs_supported_by_an_ancestor_commit: ok, unsupported: bad,
};
fs.writeFileSync(path.join(__dirname, 'co_git.out.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
