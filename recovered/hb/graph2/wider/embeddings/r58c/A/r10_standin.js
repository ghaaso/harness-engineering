// Agent A, round r58c, round 8 (the lead's measurement of END-ORDER step 9.1, the leak audit in ktest-r10): the parts of
// the stand-in input that no other stand-in already holds. Writes only r58c/A/out/r10stand/:
//   heldout_parts/E1/c04/s<1..3>/<C>/{counts.json, meta.json}  the held-out run's parts in heldout.py's layout
//       (part_dir: parts/<arm>/<cid>/s<seed>/<C>), one per seed and held-out checkpoint of the plan, counts.json placing
//       each of the 418 held-out T1 tasks (build/tasks/tasks.jsonl: ids and parents only) on its planned checkpoint,
//       as the real run's 3 x 418 = 1,254 rows; meta.json as heldout.py's (synthetic: true)
//   records/<container>[.<n>].json  one synthetic `docker inspect` record per launch of every container that runs
//       before step 9.1 (ruling 95), each made from its own list in r58c/A/mounts-A.json or r58c/B/mounts-B.json, as
//       lane_step.sh and heldout.sh save them: kge-H1P and its card check; kge-H1R five times (rehearse.sh: E4 twice,
//       E5, E1, INJ) and its card check five times; kge-R1; ktest-r1..r4, ktest-r8, ktest-r9; kge-H1 and its card check
// The tune parts are agent B's full-size stand-in r58c/B/out/timing/asm/train/stageB/parts (2,385 parts) and the plan
// its frozen copy (asm/train/stageB/plan.json); neither is written here.  usage (host, from LANE): node r58c/A/r10_standin.js
const fs = require('fs'), path = require('path');
const L = path.resolve(__dirname, '..', '..');
const OUT = path.join(L, 'r58c', 'A', 'out', 'r10stand');
const GB = path.resolve(L, '..', '..', 'build');
fs.rmSync(OUT, { recursive: true, force: true });
const plan = JSON.parse(fs.readFileSync(path.join(L, 'r58c', 'B', 'out', 'timing', 'asm', 'train', 'stageB', 'plan.json'), 'utf8'));
const assign = plan.heldout.assignment;
const held = fs.readFileSync(path.join(GB, 'tasks', 'tasks.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
  .filter((r) => r.set === 'T1' && r.split === 'heldout');
const byC = {};
for (const r of held) { const C = assign[r.parent]; (byC[C] = byC[C] || {})[r.id] = { parent: r.parent, checkpoint: C, lag: 0 }; }
let parts = 0, rows = 0;
for (const s of [1, 2, 3]) for (const C of Object.keys(byC).sort()) {
  const d = path.join(OUT, 'heldout_parts', 'E1', 'c04', 's' + s, C); fs.mkdirSync(d, { recursive: true });
  fs.writeFileSync(path.join(d, 'counts.json'), JSON.stringify(byC[C], null, 1));
  fs.writeFileSync(path.join(d, 'meta.json'), JSON.stringify({ arm: 'E1', config_id: 'c04', seed: s, checkpoint: C, plan_hash: plan.plan_hash, synthetic: true }, null, 1));
  parts++; rows += Object.keys(byC[C]).length;
}
const MA = JSON.parse(fs.readFileSync(path.join(L, 'r58c', 'A', 'mounts-A.json'), 'utf8'));
const MB = JSON.parse(fs.readFileSync(path.join(L, 'r58c', 'B', 'mounts-B.json'), 'utf8'));
const R = path.join(OUT, 'records'); fs.mkdirSync(R, { recursive: true });
let nrec = 0;
const rec = (name, allow, file, arm) => {
  const Mounts = (allow || []).map((e) => ({ Type: 'bind', Source: e.src.split('{ARM}').join(arm || ''), Destination: e.dst, RW: e.mode === 'rw' }));
  fs.writeFileSync(path.join(R, file), JSON.stringify([{ Name: '/' + name, Mounts }], null, 1)); nrec++;
};
rec('kge-H1P', MA['kge-H1P'].allow, 'kge-H1P.json'); rec('kge-H1Pc', MA['kge-H1Pc'].allow, 'kge-H1Pc.json');
['E4', 'E4', 'E5', 'E1', 'INJ'].forEach((arm, i) => {
  rec('kge-H1R', MA['kge-H1R'].allow, 'kge-H1R' + (i ? '.2026111' + i + 'T000000Z' : '') + '.json', arm);
  rec('kge-H1Rc', MA['kge-H1Rc'].allow, 'kge-H1Rc' + (i ? '.2026111' + i + 'T000000Z' : '') + '.json');
});
for (const c of ['kge-R1', 'ktest-r1', 'ktest-r2', 'ktest-r3', 'ktest-r4', 'ktest-r8', 'ktest-r9']) rec(c, MB[c].allow, c + '.json');
rec('kge-H1', MA['kge-H1'].allow, 'kge-H1.json'); rec('kge-H1c', MA['kge-H1c'].allow, 'kge-H1c.json');
const missing = [];
for (const f of fs.readdirSync(R)) for (const m of JSON.parse(fs.readFileSync(path.join(R, f), 'utf8'))[0].Mounts) {
  const loc = m.Source.replace(/^C:\//, '/c/');
  if (!fs.existsSync(m.Source) && !missing.includes(m.Source)) missing.push(m.Source);
}
console.log(JSON.stringify({ heldout_parts: parts, heldout_rows: rows, heldout_tasks: held.length, heldout_checkpoints: Object.keys(byC).length,
  records: nrec, mount_sources_absent_now: missing.map((s) => s.replace(/^.*\/scratchpad\/hb\/graph2\//, '')) }));
