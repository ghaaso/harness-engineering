'use strict';
// Preflight check 5: held-out inputs. Per set T1, T1x, T2, T3, T4 (split heldout, with a file seed):
// task count, distinct parents, facts folder present with extractor 59da7b753a4d908e, seed file present
// as a file node, removal paths present at the parent or not. Leak probe: no held-out task commit (from
// sealed/references.jsonl; this auditor may read sealed/) is named, as a 40-hex or 12-hex prefix, in the
// parent folder's meta.json, commits.jsonl or co_changed edges.
// usage: node inputs.js <build> <out.json>
const fs = require('fs'); const path = require('path');
const B = process.argv[2];
const WANT = { T1: 418, T1x: 82, T2: 237, T3: 25, T4: 8 };
const EXT = '59da7b753a4d908e';
const tasks = fs.readFileSync(path.join(B, 'tasks', 'tasks.jsonl'), 'utf8').split('\n').filter(Boolean).map(JSON.parse);
const refs = fs.readFileSync(path.join(B, 'sealed', 'references.jsonl'), 'utf8').split('\n').filter(Boolean).map(JSON.parse);
const commitOf = new Map(refs.map((r) => [r.id, r.commit]));
// (future commits are computed per parent below)
const nodeCache = new Map();
function factsOf(sha) {
  if (nodeCache.has(sha)) return nodeCache.get(sha);
  const dir = path.join(B, 'facts', 'cache', sha);
  const o = { exists: fs.existsSync(path.join(dir, 'meta.json')) };
  if (o.exists) {
    o.ext = JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8')).extractor_version;
    o.paths = new Set();
    for (const l of fs.readFileSync(path.join(dir, 'nodes.jsonl'), 'utf8').split('\n')) { if (!l) continue; const n = JSON.parse(l); if ((n.kind === 'file' || n.kind === 'doc') && n.path) o.paths.add(n.path); }
    // leak probe
    const hits = [];
    const meta = fs.readFileSync(path.join(dir, 'meta.json'), 'utf8');
    const comm = fs.readFileSync(path.join(dir, 'commits.jsonl'), 'utf8');
    let co = '';
    for (const l of fs.readFileSync(path.join(dir, 'edges.jsonl'), 'utf8').split('\n')) if (l.includes('"co_changed"')) co += l + '\n';
    // the commits of the held-out tasks AT this parent are its future: none may be named here (a task
    // commit of an earlier parent is legitimately an ancestor of later parents)
    const future = [...new Set(refs.filter((r) => r.split === 'heldout' && r.parent === sha && r.commit && r.commit !== sha).map((r) => r.commit))];
    o.future_commits = future.length;
    for (const c of future) {
      const p12 = c.slice(0, 12);
      for (const [nm, txt] of [['meta.json', meta], ['commits.jsonl', comm], ['co_changed', co]]) if (txt.includes(p12)) hits.push(nm + ':' + p12);
    }
    o.leak_hits = hits;
  }
  nodeCache.set(sha, o); return o;
}
const res = { sets: {}, leak: [], tasks_without_file_seed_heldout: tasks.filter((t) => t.split === 'heldout' && !(t.seed && t.seed.path)).map((t) => t.set) };
for (const s of Object.keys(WANT)) {
  const ts = tasks.filter((t) => t.set === s && t.split === 'heldout' && t.seed && t.seed.path);
  const parents = [...new Set(ts.map((t) => t.parent))];
  const factsOk = parents.filter((p) => { const f = factsOf(p); return f.exists && f.ext === EXT; });
  const seedOk = ts.filter((t) => { const f = factsOf(t.parent); return f.exists && f.paths.has(t.seed.path); });
  const rm = {};
  for (const t of ts) for (const p of t.remove_paths || []) { const k = p + (factsOf(t.parent).paths.has(p) ? ' (present at parent)' : ' (absent at parent)'); rm[k] = (rm[k] || 0) + 1; }
  const parentIsAncestor = ts.filter((t) => commitOf.get(t.id) && commitOf.get(t.id) !== t.parent).length;
  res.sets[s] = { tasks: ts.length, expected: WANT[s], count_ok: ts.length === WANT[s], parents: parents.length, facts_ok: factsOk.length, seed_in_facts: seedOk.length, removals: rm, task_commit_differs_from_parent: parentIsAncestor };
  for (const p of parents) { const f = factsOf(p); if (f.leak_hits && f.leak_hits.length) res.leak.push({ parent: p.slice(0, 12), hits: f.leak_hits }); }
}
res.distinct_parents_all = new Set(tasks.filter((t) => t.split === 'heldout' && WANT[t.set]).map((t) => t.parent)).size;
res.pass = Object.values(res.sets).every((x) => x.count_ok && x.facts_ok === x.parents && x.seed_in_facts === x.tasks) && res.leak.length === 0;
fs.writeFileSync(process.argv[3], JSON.stringify(res, null, 1));
console.log(JSON.stringify(res, null, 1));
