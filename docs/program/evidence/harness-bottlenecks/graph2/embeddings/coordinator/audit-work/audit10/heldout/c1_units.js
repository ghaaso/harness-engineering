'use strict';
const fs = require('fs'), path = require('path'), zlib = require('zlib'), crypto = require('crypto');
const LANE = 'C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings';
const OUT = 'C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/coord/audit10/heldout';
const H = LANE + '/train/heldout';
const sha = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const rec = JSON.parse(fs.readFileSync(H + '/item27.json'));
const fsha = sha(H + '/item27.json');
const plan = JSON.parse(fs.readFileSync(LANE + '/train/stageB/plan.json'));
const asg = plan.heldout.assignment;
const parents = Object.keys(asg);
const ckpts = new Set(Object.values(asg));
const planE1 = plan.configs.E1.find(c => c.config_id === 'c04');
const R = { fsha, chosen: rec.chosen, planE1, plan_hash_match: plan.plan_hash === rec.plan_hash, s: plan.s, problems: [] };
const P = m => R.problems.push(m);
if (JSON.stringify(planE1.cfg) !== JSON.stringify(rec.chosen.cfg)) P('cfg differs plan vs record');
if (planE1.epochs !== rec.chosen.epochs) P('epochs differ plan vs record');
// tasks
const tasks = fs.readFileSync(H + '/tasks_used.jsonl', 'utf8').split('\n').filter(l => l.trim()).map(JSON.parse);
R.tasks_used = tasks.length; R.tasks_keys = [...new Set(tasks.flatMap(t => Object.keys(t)))].sort();
R.tasks_split = [...new Set(tasks.map(t => t.set + '/' + t.split))];
R.tasks_parents = new Set(tasks.map(t => t.parent)).size;
R.tasks_parents_eq_plan = [...new Set(tasks.map(t => t.parent))].every(p => asg[p]) && R.tasks_parents === parents.length;
const taskById = new Map(tasks.map(t => [t.id, t]));
R.tasks_unique = taskById.size;
// progress
const prog = fs.readFileSync(H + '/progress.jsonl', 'utf8').split('\n').filter(l => l.trim()).map(JSON.parse);
R.prog_lines = prog.length;
R.prog_units = {};
for (const r of prog) { const k = r.unit.startsWith('unit/') ? 'unit:' + r.status : r.unit + ':' + r.status; R.prog_units[k] = (R.prog_units[k] || 0) + 1; }
const doneLines = prog.filter(r => r.unit.startsWith('unit/') && r.status === 'done');
const unitNames = doneLines.map(r => r.unit);
R.unit_done_unique = new Set(unitNames).size;
R.starts = prog.filter(r => r.unit === 'start').map(r => ({ t: r.t, freeze: r.freeze_sha256 === fsha }));
// parts
const losses = {}; const seedCover = {}; const walls = [];
let partCount = 0;
for (const s of [1, 2, 3]) {
  const sd = H + '/parts/E1/c04/s' + s; const dirs = fs.readdirSync(sd);
  seedCover[s] = new Map();
  for (const C of dirs) {
    partCount++;
    const d = sd + '/' + C;
    const files = fs.readdirSync(d).sort().join(',');
    if (files !== 'counts.json,meta.json,pool.tsv.gz,unrestricted.tsv.gz') P('files ' + d + ' ' + files);
    const m = JSON.parse(fs.readFileSync(d + '/meta.json'));
    if (m.arm !== 'E1' || m.config_id !== 'c04' || JSON.stringify(m.cfg) !== JSON.stringify(rec.chosen.cfg)) P('arm/cfg ' + d);
    if (m.seed !== s) P('seed ' + d); if (m.checkpoint !== C) P('ckpt ' + d);
    if (!ckpts.has(C)) P('ckpt not in plan.heldout ' + C);
    if (m.freeze_sha256 !== fsha) P('freeze ' + d);
    if (m.split !== 'heldout') P('split ' + d);
    if (m.plan_hash !== rec.plan_hash) P('plan_hash ' + d);
    if (m.epochs !== 70) P('epochs ' + d + ' ' + m.epochs);
    if (!Array.isArray(m.losses) || m.losses.length !== 70) P('losses len ' + d);
    if (!m.losses.every(Number.isFinite)) P('nonfinite loss ' + d);
    if (m.trained === false) P('untrained ' + d);
    losses[s + '/' + C] = m.losses;
    walls.push({ s, C, meta_wall: m.wall_s, runner: m.runner, host: m.host, pid: m.pid });
    const cnt = JSON.parse(fs.readFileSync(d + '/counts.json'));
    for (const [tid, r] of Object.entries(cnt)) {
      if (seedCover[s].has(tid)) P('task twice ' + s + ' ' + tid);
      seedCover[s].set(tid, C);
      const t = taskById.get(tid); if (!t) P('task not in tasks_used ' + tid);
      else if (asg[t.parent] !== C) P('task on wrong checkpoint ' + tid);
    }
    // done line sha match
    const unit = 'unit/E1/c04/s' + s + '/' + C.slice(0, 12);
    const dl = doneLines.filter(r => r.unit === unit);
    if (dl.length !== 1) P('done lines ' + unit + ' ' + dl.length);
    else {
      for (const f of ['pool.tsv.gz', 'unrestricted.tsv.gz', 'counts.json']) if (dl[0].sha256[f] !== sha(d + '/' + f)) P('sha mismatch ' + unit + ' ' + f);
      if (dl[0].tasks !== Object.keys(cnt).length) P('tasks count ' + unit);
    }
    // nonfinite scores
    for (const sc of ['pool', 'unrestricted']) {
      const txt = zlib.gunzipSync(fs.readFileSync(d + '/' + sc + '.tsv.gz')).toString();
      const bad = txt.split('\n').slice(1).filter(l => l && !Number.isFinite(Number(l.split('\t')[2]))).length;
      if (bad) P('nonfinite score ' + d + ' ' + sc + ' ' + bad);
    }
  }
}
R.partCount = partCount;
R.seedCover = Object.fromEntries(Object.entries(seedCover).map(([s, m]) => [s, m.size]));
R.allTasksEachSeed = [1, 2, 3].every(s => tasks.every(t => seedCover[s].has(t.id)));
R.ckpts_each_seed = [1, 2, 3].map(s => fs.readdirSync(H + '/parts/E1/c04/s' + s).filter(c => ckpts.has(c)).length);
R.runners = [...new Set(walls.map(w => w.runner + '@' + w.host))];
fs.writeFileSync(OUT + '/c1_units.json', JSON.stringify(R, null, 1));
fs.writeFileSync(OUT + '/losses.json', JSON.stringify(losses));
fs.writeFileSync(OUT + '/walls.json', JSON.stringify({ walls, prog: doneLines.map(r => ({ unit: r.unit, t: r.t, wall_s: r.wall_s, tasks: r.tasks })) }));
console.log(JSON.stringify(R, null, 1).slice(0, 4000));
