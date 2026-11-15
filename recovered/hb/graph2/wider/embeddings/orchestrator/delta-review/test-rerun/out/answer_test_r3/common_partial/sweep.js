'use strict';
// TUNE sweep driver. Runs a per-arm configuration list (arms/<arm>/sweep.js STAGE1, exactly 40, or
// arms/<arm>/stage2.json, exactly 20; any other size is refused and every list's hash is logged) over
// the TUNE tasks for one or more arms. When several arms run the same list it is also the cross-check:
// every pair of arms is compared with equiv.js (same reach set and hops, scores within 1e-9, the same
// order wherever scores differ by more than 1e-9, valid shortest explanation paths), and relational
// versus reference is additionally compared byte for byte (ranked lists and packed answers).
// It never runs HELD-OUT (the split is fixed to tune; run.js holds the held-out lock).
//   node sweep.js [--arms relational,reference] [--list relational] [--stage 1|2] [--sets T1,T2]
//                 [--limit N] [--tasks id,id | --tasks-file f | --tasks-jsonl <TUNE variants>] [--only name,...] [--out dir]
// Stage 2 (--stage 2) runs arms/<arm>/stage2.json (exactly 20, none repeating a stage-1 entry); the
// answers land beside stage 1 (results/<arm>/tune/<hash>.<set>.jsonl.gz), the list hash is logged in
// sweep/lists.jsonl, and the run's files are sweep/summary.stage2.json, configs.stage2.json and
// crosscheck_mismatches.stage2.jsonl (stage 1 keeps the names without a suffix).
// Floors: an arm named floor-* has one fixed list of 8 (arms/<floor>/configs.js), accepted as its
// stage-1 list, so `--arms search,floor-dir,floor-co` runs the floors on exactly the same tasks.
// Extensions (an x_ mode or a native variant, SPEC 9.4) are never cross-checked: on a shared list
// such an entry runs only on the list's own arm (--list, else the first arm) and no pair compares it.
// Tasks are grouped by (parent, removed documents), as in run.js.
const fs = require('fs');
const path = require('path');
const P = require('./paths');
const C = require('./config');
const H = require('./harness');
const E = require('./equiv');
const { graphFor, openArm } = require('./arms');

function args() {
  const a = process.argv.slice(2);
  const o = { arms: ['relational', 'reference'], sets: ['T1', 'T2'], limit: 0, only: null, stage: 1, list: null, tasks: null };
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--arms') o.arms = a[++i].split(',');
    else if (a[i] === '--list') o.list = a[++i];
    else if (a[i] === '--stage') o.stage = Number(a[++i]);
    else if (a[i] === '--sets') o.sets = a[++i].split(',');
    else if (a[i] === '--limit') o.limit = Number(a[++i]);
    else if (a[i] === '--tasks') o.tasks = a[++i].split(',');
    else if (a[i] === '--tasks-file') o.tasks = fs.readFileSync(a[++i], 'utf8').split('\n').map((x) => x.trim()).filter(Boolean).map((x) => (x.startsWith('{') ? JSON.parse(x).id : x));
    else if (a[i] === '--tasks-jsonl') o.tasksJsonl = a[++i];
    else if (a[i] === '--only') o.only = a[++i].split(',');
    else if (a[i] === '--out') o.out = a[++i];
    else throw new Error('unknown argument ' + a[i]);
  }
  return o;
}
const now = () => Number(process.hrtime.bigint()) / 1e6;
const pct = (a, q) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(q * s.length))] : null; };

async function main() {
  const o = args();
  const outRoot = o.out || P.RESULTS;
  // one list for all arms (cross-check), or each arm its own list (no cross-check)
  const lists = {};
  for (const a of o.arms) lists[a] = H.loadArmList(o.list || a, o.stage, true, outRoot);
  const shared = new Set(Object.values(lists).map((l) => l.hash)).size === 1;
  const owner = o.list || o.arms[0]; // the arm an extension entry of a shared list runs on
  const sel = (l) => l.list.filter((c) => !o.only || o.only.includes(c.name));
  const sfx = o.stage === 2 ? '.stage2' : '';
  fs.mkdirSync(path.join(outRoot, 'sweep'), { recursive: true });
  fs.writeFileSync(path.join(outRoot, 'sweep', 'configs' + sfx + '.json'), JSON.stringify({ stage: o.stage, budgets: C.BUDGETS, lists: Object.fromEntries(Object.entries(lists).map(([a, l]) => [a, { list_of: l.arm, stage: l.stage, kind: l.kind, hash: l.hash, count: l.list.length, configs: l.list }])) }, null, 1));
  // --tasks-jsonl: TUNE task variants with remove_paths (addendum 4 item 14), validated by the harness
  let tasks = o.tasksJsonl ? H.loadTuneVariants(o.tasksJsonl, o.sets) : H.loadTasks(o.sets, 'tune');
  if (o.tasks) { const want = new Set(o.tasks); tasks = tasks.filter((t) => want.has(t.id)); }
  if (o.limit) tasks = tasks.slice(0, o.limit);
  // group by (parent, removed documents), exactly as run.js does
  const byParent = new Map();
  for (const t of tasks) { const k = t.parent + '|' + (t.remove_paths || []).join(','); if (!byParent.has(k)) byParent.set(k, []); byParent.get(k).push(t); }
  const writers = new Map();
  const W = (arm, hash, set) => {
    const k = arm + '|' + hash + '|' + set;
    if (!writers.has(k)) writers.set(k, new H.GzWriter(path.join(outRoot, arm, 'tune', hash + '.' + set + '.jsonl.gz')));
    return writers.get(k);
  };
  const pairs = [];
  if (shared) for (let x = 0; x < o.arms.length; x++) for (let y = x + 1; y < o.arms.length; y++) pairs.push([x, y]);
  const isStrict = (x, y) => [o.arms[x], o.arms[y]].sort().join('|') === 'reference|relational';
  const cc = { pairs: {}, mismatches: 0 };
  for (const [x, y] of pairs) cc.pairs[o.arms[x] + '~' + o.arms[y]] = { compared: 0, equiv_fail: 0, strict: isStrict(x, y), strict_ranked_fail: 0, strict_answer_fail: 0, answers_differ: 0, by_config: {} };
  const mm = fs.createWriteStream(path.join(outRoot, 'sweep', 'crosscheck_mismatches' + sfx + '.jsonl'));
  const timing = {}; const seedStats = {}; let extSkipped = 0;
  const { RefGraph } = require('../reference/ref');
  const t0 = Date.now(); let done = 0;
  for (const gkey of [...byParent.keys()].sort()) {
    const ts0 = byParent.get(gkey);
    const G = graphFor(ts0[0].parent, ts0[0].remove_paths || []);
    const arms = [];
    for (const a of o.arms) arms.push(await openArm(a, G));
    const checker = pairs.length ? new RefGraph(G) : null;
    for (const t of ts0) {
      const sm = H.mapSeed(G, t.seed);
      seedStats[sm.match] = (seedStats[sm.match] || 0) + 1;
      const memo = arms.map(() => new Map());
      const nCfg = Math.max(...o.arms.map((a) => sel(lists[a]).length));
      for (let ci = 0; ci < nCfg; ci++) {
        const res = new Array(arms.length).fill(null);
        for (let ai = 0; ai < arms.length; ai++) {
          const arm = arms[ai]; const c = sel(lists[o.arms[ai]])[ci];
          if (!c) continue;
          // an extension entry of a shared list runs only on the list's own arm (never cross-checked)
          if (shared && o.arms.length > 1 && C.isExtension(c.cfg) && o.arms[ai] !== owner) { extSkipped++; continue; }
          const rk = C.rankKey(c.cfg);
          // a configuration that differs only in granularity, form or pad reuses the ranked list (and
          // reports the wall time of the ranking that produced it)
          let m = memo[ai].get(rk); let r; let ms;
          if (m) { r = m.r; ms = m.ms; } else {
            const s = now();
            r = H.normRank(sm.ids.length ? await arm.rank(sm.ids, c.cfg, t.seed) : []);
            ms = now() - s;
            memo[ai].set(rk, { r, ms });
            const tk = arm.name + '|' + c.name; timing[tk] = timing[tk] || { wall: [], engine: [] };
            timing[tk].wall.push(ms); if (r.engine_ms != null) timing[tk].engine.push(r.engine_ms);
          }
          const a = H.answer(G, t, sm, r, c.cfg, arm.name, ms);
          a.config_name = c.name;
          W(arm.name, c.hash, t.set).write(a);
          res[ai] = { r: r.ranked, a, cfg: c.cfg, name: c.name };
        }
        for (const [x, y] of pairs) {
          if (!res[x] || !res[y]) continue;
          const pc = cc.pairs[o.arms[x] + '~' + o.arms[y]];
          const bc = pc.by_config[res[x].name] = pc.by_config[res[x].name] || { tasks: 0, equiv_fail: 0, strict_fail: 0 };
          pc.compared++; bc.tasks++;
          const chk = checker.explainChecker(sm.ids, res[x].cfg);
          const ev = E.equivalent(res[x].r, res[y].r, chk, chk);
          // meta is the arm's own diagnostics (query counts, timings; addendum 3 D.12), not answer content
          const strip = (a) => JSON.stringify({ ...a, arm: null, ms: null, engine_ms: null, meta: null });
          const sameA = strip(res[x].a) === strip(res[y].a);
          if (!sameA) pc.answers_differ++;
          let bad = !ev.ok;
          if (!ev.ok) { pc.equiv_fail++; bc.equiv_fail++; }
          if (pc.strict) {
            const sr = E.strict(res[x].r, res[y].r);
            if (!sr) pc.strict_ranked_fail++;
            if (!sameA) pc.strict_answer_fail++;
            if (!sr || !sameA) { bc.strict_fail++; bad = true; }
          }
          if (bad) {
            cc.mismatches++;
            let i = 0; const A = res[x].r; const B = res[y].r;
            while (i < Math.max(A.length, B.length) && JSON.stringify(A[i]) === JSON.stringify(B[i])) i++;
            mm.write(JSON.stringify({ pair: o.arms[x] + '~' + o.arms[y], task: t.id, config: res[x].name, equiv: ev, first_diff: i, a: A[i], b: B[i], na: A.length, nb: B.length }) + '\n');
          }
        }
      }
      done++;
      if (done % 10 === 0) process.stderr.write(`${done}/${tasks.length} tasks, ${((Date.now() - t0) / 1000).toFixed(0)} s, mismatches ${cc.mismatches}\n`);
    }
    for (const a of arms) await a.close();
  }
  for (const w of writers.values()) await w.close();
  await new Promise((r) => mm.end(r));
  const tim = {};
  for (const [k, v] of Object.entries(timing)) {
    tim[k] = { n: v.wall.length, wall_p50_ms: +pct(v.wall, 0.5).toFixed(2), wall_p95_ms: +pct(v.wall, 0.95).toFixed(2),
      engine_p50_ms: v.engine.length ? +pct(v.engine, 0.5).toFixed(2) : null, engine_p95_ms: v.engine.length ? +pct(v.engine, 0.95).toFixed(2) : null,
      wall_total_s: +(v.wall.reduce((x, y) => x + y, 0) / 1000).toFixed(2) };
  }
  const summary = { stage: o.stage, arms: o.arms, lists: Object.fromEntries(Object.entries(lists).map(([a, l]) => [a, { list_of: l.arm, stage: l.stage, kind: l.kind, hash: l.hash }])), shared_list: shared,
    sets: o.sets, tasks: tasks.length, task_ids: tasks.map((t) => t.id), parents: byParent.size, configs: Object.fromEntries(o.arms.map((a) => [a, sel(lists[a]).length])),
    extension_runs_skipped: extSkipped, seed_match: seedStats, crosscheck: cc, wall_s: (Date.now() - t0) / 1000, timing: tim };
  fs.writeFileSync(path.join(outRoot, 'sweep', 'summary' + sfx + '.json'), JSON.stringify(summary, null, 1));
  console.log(JSON.stringify({ tasks: tasks.length, configs: summary.configs, mismatches: cc.mismatches, pairs: Object.fromEntries(Object.entries(cc.pairs).map(([k, v]) => [k, { compared: v.compared, equiv_fail: v.equiv_fail, strict_ranked_fail: v.strict_ranked_fail, strict_answer_fail: v.strict_answer_fail }])), wall_s: summary.wall_s, seed_match: seedStats }));
}

main().catch((e) => { console.error(e); process.exit(1); });
