'use strict';
// Agent B, round r58c, end-order-changes-2 change 5: a FULL-SIZE synthetic lane copy for timing the end order's steps
// that read the stage-B parts and tables (stageB.py assemble + assemble_checks.py, then selectB.py and report.py),
// never train/stageB: <out>/train holds copies of the train/*.py code and a plan.json that is the frozen copy of the
// real plan (r58c/B/frozen/plan.json: all 15 settings, 53 checkpoints, s = 1), and synthetic parts for every
// (arm, config, seed, checkpoint) of it, 2,385 in all: counts.json placing each of the 388 tune tasks on its planned
// checkpoint (zero fold counts, as at s = 1), pool.tsv.gz and unrestricted.tsv.gz scoring EVERY candidate of each of
// those tasks (eval/comparators/candidates_*.tsv.gz; the real parts can only hold fewer rows: a task without a
// co_changed fact is unscored), with fake scores, and meta.json with the plan hash and the single guard's runner
// (E4: det=1); plus train/progress.jsonl done lines, <out>/eval and <out>/export (the code and small files the
// imports read), and <out>/orchestrator (assemble_checks.py and a completed guard log).
// Reads only r58c/B/frozen/plan.json, eval/ and export/*.py|*.jsonl, train/*.py, orchestrator/assemble_checks.py.
// usage (host, from LANE): node r58c/B/timing/make_full_copy.js r58c/B/out/timing/asm
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const L = '.';
const OUT = process.argv[2];
if (!OUT || !/r58c[\\/]B[\\/]out[\\/]timing[\\/]/.test(OUT)) { console.error('usage: node make_full_copy.js r58c/B/out/timing/<name>'); process.exit(2); }
fs.rmSync(OUT, { recursive: true, force: true });
const T = path.join(OUT, 'train'), SB = path.join(T, 'stageB');
for (const d of [path.join(SB, 'tables'), path.join(OUT, 'orchestrator'), path.join(OUT, 'eval', 'comparators'), path.join(OUT, 'export')])
  fs.mkdirSync(d, { recursive: true });
for (const f of fs.readdirSync(path.join(L, 'train'))) {
  const p = path.join(L, 'train', f);
  if (fs.statSync(p).isFile() && (f.endsWith('.py') || f === 'RUNLOG.md' || f === 'stageA_configs.json')) fs.copyFileSync(p, path.join(T, f));
}
for (const f of fs.readdirSync(path.join(L, 'eval'))) { const p = path.join(L, 'eval', f); if (fs.statSync(p).isFile()) fs.copyFileSync(p, path.join(OUT, 'eval', f)); }
for (const f of fs.readdirSync(path.join(L, 'eval', 'comparators'))) fs.copyFileSync(path.join(L, 'eval', 'comparators', f), path.join(OUT, 'eval', 'comparators', f));
for (const f of fs.readdirSync(path.join(L, 'export'))) {
  const p = path.join(L, 'export', f);
  if (fs.statSync(p).isFile() && (f.endsWith('.py') || f.endsWith('.jsonl'))) fs.copyFileSync(p, path.join(OUT, 'export', f));
}
fs.copyFileSync(path.join(L, 'orchestrator', 'assemble_checks.py'), path.join(OUT, 'orchestrator', 'assemble_checks.py'));
const planBytes = fs.readFileSync(path.join(L, 'r58c', 'B', 'frozen', 'plan.json'));  // MF-8: the frozen copy, never train/stageB/
fs.writeFileSync(path.join(SB, 'plan.json'), planBytes);
const plan = JSON.parse(planBytes);
const tasks = fs.readFileSync(path.join(L, 'eval', 'tune_tasks.jsonl'), 'utf8').split('\n').filter((l) => l.trim())
  .map((l) => { const r = JSON.parse(l); return { id: r.task_id, parent: r.parent }; });
const cands = {};
for (const sc of ['pool', 'unrestricted']) {
  const m = {}; const rows = zlib.gunzipSync(fs.readFileSync(path.join(L, 'eval', 'comparators', 'candidates_' + sc + '.tsv.gz'))).toString('utf8').split('\n').slice(1);
  for (const r of rows) { if (!r) continue; const [tid, c] = r.split('\t'); (m[tid] = m[tid] || []).push(c); }
  cands[sc] = m;
}
const byC = {};
for (const t of tasks) { const C = plan.assignment[t.parent]; (byC[C] = byC[C] || []).push(t); }
let x = 123456789;  // a fixed LCG: fake scores in (0, 1), shortest round-trip form (Python's repr reads them back exactly)
const rnd = () => { x = (x * 1103515245 + 12345) % 2147483648; return (x + 0.5) / 2147483648; };
const RUNNER = 'guard-stageB.sh kge-B1 procs=1 image=sha256:a890c54808c11c460d910945c4bf981390f7de43c8dfc5840269b76f5861cbe7';
const prog = []; let n = 0, rows = 0;
for (const arm of Object.keys(plan.configs).sort()) for (const c of plan.configs[arm]) for (const s of [1, 2, 3]) for (const C of plan.checkpoints) {
  const d = path.join(SB, 'parts', arm, c.config_id, 's' + s, C); fs.mkdirSync(d, { recursive: true });
  const counts = {};
  const mine = (byC[C] || []).slice().sort((a, b) => (a.id < b.id ? -1 : 1));
  for (const t of mine) counts[t.id] = { parent: t.parent, checkpoint: C, lag: 0,
    pool: { seeds: 1, seeds_folded: 0, cands: (cands.pool[t.id] || []).length, cands_folded: 0 },
    unrestricted: { seeds: 1, seeds_folded: 0, cands: (cands.unrestricted[t.id] || []).length, cands_folded: 0 } };
  fs.writeFileSync(path.join(d, 'counts.json'), JSON.stringify(counts, null, 1));
  fs.writeFileSync(path.join(d, 'meta.json'), JSON.stringify({ arm, config_id: c.config_id, seed: s, checkpoint: C, plan_hash: plan.plan_hash,
    runner: RUNNER + (arm === 'E4' ? ' det=1' : ''), processes: 1, synthetic: true }, null, 1));
  for (const sc of ['pool', 'unrestricted']) {
    const out = ['task_id\tcandidate\tscore'];
    for (const t of mine) for (const cd of (cands[sc][t.id] || []).slice().sort()) { out.push(t.id + '\t' + cd + '\t' + String(rnd())); rows++; }
    fs.writeFileSync(path.join(d, sc + '.tsv.gz'), zlib.gzipSync(out.join('\n') + '\n'));
  }
  prog.push(JSON.stringify({ step: 'stageB', unit: arm + '/' + c.config_id + '/s' + s + '/' + C.slice(0, 12), status: 'done', t: 'synthetic' })); n++;
}
fs.writeFileSync(path.join(T, 'progress.jsonl'), prog.join('\n') + '\n');
fs.writeFileSync(path.join(OUT, 'progress.jsonl'), '');
fs.writeFileSync(path.join(OUT, 'orchestrator', 'guard-stageB.log'),
  '2026-11-14T00:00:00Z guard start: synthetic copy\n2026-11-14T00:00:02Z stage B complete: no unit left (synthetic)\n');
console.log('copy ' + OUT + ': parts=' + n + ' score rows=' + rows + ' tasks=' + tasks.length + ' checkpoints=' + plan.checkpoints.length +
  ' settings=' + Object.values(plan.configs).reduce((a, v) => a + v.length, 0) + ' plan_hash=' + plan.plan_hash.slice(0, 12));
