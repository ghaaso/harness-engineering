// (r58c/B copy of r58b/eor/make_copy.js; plan from r58c/B/frozen/plan.json.) Builds a SYNTHETIC lane copy for the end_of_run.sh plumbing test (never train/stageB): <out>/train holds copies of
// the train/*.py code and RUNLOG.md, a plan.json that is the real plan with configs cut to E1:[c04] and E4:[c12]
// (other arms empty), and synthetic parts for 3 seeds x every planned checkpoint (counts.json placing each tune task
// on its planned checkpoint with zero fold counts, header-only score tables, meta.json with the plan hash and the
// given runner), plus progress.jsonl done lines; <out>/orchestrator holds copies of assemble_checks.py and a guard
// log. Reads only plan.json and the task_id/parent fields of eval/tune_tasks.jsonl.
// usage: node make_copy.js <real lane root> <out> <E1 runner> <E4 runner> [guard last line]
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const [L, OUT, R1, R4, LAST] = process.argv.slice(2);
fs.rmSync(OUT, { recursive: true, force: true });
const T = path.join(OUT, 'train'), SB = path.join(T, 'stageB');
fs.mkdirSync(path.join(SB, 'tables'), { recursive: true });
fs.mkdirSync(path.join(OUT, 'orchestrator', 'end-of-run'), { recursive: true });
for (const f of fs.readdirSync(path.join(L, 'train'))) {
  const p = path.join(L, 'train', f);
  if (fs.statSync(p).isFile() && (f.endsWith('.py') || f === 'RUNLOG.md' || (f.endsWith('.json') && !f.startsWith('progress')))) fs.copyFileSync(p, path.join(T, f));
}
fs.copyFileSync(path.join(L, 'orchestrator', 'assemble_checks.py'), path.join(OUT, 'orchestrator', 'assemble_checks.py'));
const plan = JSON.parse(fs.readFileSync(path.join(L, 'r58c', 'B', 'frozen', 'plan.json'), 'utf8'));  // MF-8: the frozen copy, never train/stageB/
const keep = { E1: 'c04', E4: 'c12' };
for (const a of Object.keys(plan.configs)) plan.configs[a] = plan.configs[a].filter(c => keep[a] === c.config_id);
fs.writeFileSync(path.join(SB, 'plan.json'), JSON.stringify(plan, null, 1));
const tasks = fs.readFileSync(path.join(L, 'eval', 'tune_tasks.jsonl'), 'utf8').split('\n').filter(l => l.trim())
  .map(l => { const r = JSON.parse(l); return { id: r.task_id, parent: r.parent }; });
const byC = {};
for (const t of tasks) { const C = plan.assignment[t.parent]; (byC[C] = byC[C] || []).push(t); }
const empty = zlib.gzipSync('task_id\tcandidate\tscore\n');
const prog = []; let n = 0;
for (const [arm, cid] of Object.entries(keep)) for (const s of [1, 2, 3]) for (const C of plan.checkpoints) {
  const d = path.join(SB, 'parts', arm, cid, 's' + s, C); fs.mkdirSync(d, { recursive: true });
  const counts = {};
  for (const t of byC[C] || []) counts[t.id] = { parent: t.parent, checkpoint: C, lag: 0,
    pool: { seeds: 1, seeds_folded: 0, cands: 0, cands_folded: 0 }, unrestricted: { seeds: 1, seeds_folded: 0, cands: 0, cands_folded: 0 } };
  fs.writeFileSync(path.join(d, 'counts.json'), JSON.stringify(counts));
  fs.writeFileSync(path.join(d, 'meta.json'), JSON.stringify({ arm, config_id: cid, seed: s, checkpoint: C, plan_hash: plan.plan_hash,
    runner: arm === 'E4' ? R4 : R1, processes: 1, synthetic: true }));
  fs.writeFileSync(path.join(d, 'pool.tsv.gz'), empty); fs.writeFileSync(path.join(d, 'unrestricted.tsv.gz'), empty);
  prog.push(JSON.stringify({ step: 'stageB', unit: arm + '/' + cid + '/s' + s + '/' + C.slice(0, 12), status: 'done', t: 'synthetic' })); n++;
}
fs.writeFileSync(path.join(T, 'progress.jsonl'), prog.join('\n') + '\n');
fs.writeFileSync(path.join(OUT, 'orchestrator', 'guard-stageB.log'),
  '2026-11-14T00:00:00Z guard start: synthetic copy\n2026-11-14T00:00:01Z launched kge-B1 (synthetic)\n' +
  (LAST || '2026-11-14T00:00:02Z stage B complete: no unit left (assemble ran per arm)') + '\n');
console.log('copy ' + OUT + ': parts=' + n + ' tasks=' + tasks.length + ' checkpoints=' + plan.checkpoints.length + ' plan_hash=' + plan.plan_hash.slice(0, 12));
