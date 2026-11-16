'use strict';
// Independent recompute of E5 routing (kge.route / kge.score E5 branch) on the late-50 tuning tasks.
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const H = 'C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/coord/verify-item27/recompute';
const core = require(H + '/core.js');
const LANE = core.LANE;
const OUT = __dirname;
const AREAS = ['backend', 'mobile', 'web', 'other'];
const CO = 'co_changed';

function readCands(sc) {
  const txt = zlib.gunzipSync(fs.readFileSync(path.join(LANE, 'eval/comparators/candidates_' + sc + '.tsv.gz'))).toString('utf8');
  const out = new Map(); const ls = txt.split('\n');
  for (let i = 1; i < ls.length; i++) { if (!ls[i]) continue; const [t, c] = ls[i].split('\t'); if (!out.has(t)) out.set(t, []); out.get(t).push(c); }
  return out;
}
const gcache = new Map();
function graph(sha) {
  if (gcache.has(sha)) return gcache.get(sha);
  const d = path.join(LANE, 'export/graphs0', sha);
  const ents = new Map();
  const el = fs.readFileSync(path.join(d, 'entities.tsv'), 'utf8').split('\n');
  for (let i = 1; i < el.length; i++) { if (!el[i]) continue; const [id, kind, p, code, area] = el[i].split('\t'); ents.set(id, { kind, path: p, area, code: code === '1' }); }
  const tl = fs.readFileSync(path.join(d, 'triples.tsv'), 'utf8').split('\n');
  const tri = [];
  for (let i = 1; i < tl.length; i++) { if (!tl[i]) continue; const x = tl[i].split('\t'); tri.push(x); }
  const area = e => (ents.has(e) ? ents.get(e).area : 'other');
  const nb = new Map();
  const add = (a, b) => { if (!nb.has(a)) nb.set(a, new Set()); nb.get(a).add(b); };
  for (const [h, , t] of tri) if (h !== t) { add(h, t); add(t, h); }
  const known = {}, hasCo = {}, atC = new Set();
  for (const A of AREAS) {
    const k = new Set(); let co = false, n = 0;
    for (const [h, r, t] of tri) if (area(h) === A || area(t) === A) { k.add(h); k.add(t); n++; if (r === CO) co = true; }
    known[A] = k; hasCo[A] = co; for (const e of k) atC.add(e);
  }
  const g = { ents, tri, area, nb, known, hasCo, atC, nco: tri.filter(x => x[1] === CO).length };
  gcache.set(sha, g); return g;
}
function route(s, g) {
  const a1 = g.area(s);
  const c = new Map();
  for (const n of (g.nb.get(s) || [])) { const a = g.area(n); c.set(a, (c.get(a) || 0) + 1); }
  c.delete(a1);
  if (c.size === 0) return [a1];
  const top = Math.max(...c.values());
  return [a1, AREAS.find(a => c.get(a) === top)];
}

const tasks = core.readJsonl(path.join(LANE, 'eval/tune_tasks.jsonl'));
const plan = JSON.parse(fs.readFileSync(path.join(LANE, 'train/stageB/plan.json'), 'utf8'));
const late = tasks.filter(t => t.late50);
const cands = { pool: readCands('pool'), unrestricted: readCands('unrestricted') };
const res = { n_late_tasks: late.length, n_late_commits: new Set(late.map(t => t.commit)).size, scopes: {}, per_task: {} };
const routeCount = {}; let single = 0, two = 0, skipped = 0, ckNotP = 0;
const singleAreas = {};
for (const t of late) {
  const C = plan.assignment[t.parent]; if (C !== t.parent) ckNotP++;
  const g = graph(C);
  const s = 'file:' + t.seed;
  const r = route(s, g);
  const use = r.filter(A => g.hasCo[A] && g.known[A].has(s));
  if (use.length < r.length) skipped++;
  if (r.length === 1) { single++; singleAreas[r[0]] = (singleAreas[r[0]] || 0) + 1; } else two++;
  const key = r.join('>'); routeCount[key] = (routeCount[key] || 0) + 1;
  const pt = { route: r, use, seed_area: g.area(s), deg: (g.nb.get(s) || new Set()).size, nco: g.nco };
  for (const sc of ['pool', 'unrestricted']) {
    const cl = cands[sc].get(t.task_id) || [];
    const st = cl.map(c => {
      const e = 'file:' + c;
      const by = use.filter(A => g.known[A].has(e));
      return { c, by, area: g.area(e), atC: g.atC.has(e) };
    });
    pt[sc] = { n: cl.length, unscored: st.filter(x => x.by.length === 0).map(x => x.c), unscored_absent: st.filter(x => x.by.length === 0 && !x.atC).length, both: st.filter(x => x.by.length === 2).length, onlyFirst: st.filter(x => x.by.length === 1 && x.by[0] === use[0]).length, onlySecond: st.filter(x => x.by.length === 1 && x.by[0] !== use[0]).length, truth_unscored: st.filter(x => x.by.length === 0 && t.truth.includes(x.c)).length, truth_in_cands: st.filter(x => t.truth.includes(x.c)).length, unscored_areas: st.filter(x => x.by.length === 0).reduce((m, x) => (m[x.area] = (m[x.area] || 0) + 1, m), {}) };
    pt[sc].by = Object.fromEntries(st.map(x => [x.c, x.by]));
  }
  res.per_task[t.task_id] = pt;
}
res.routing = { single, two, skipped_tasks: skipped, routes: routeCount, single_areas: singleAreas, tasks_checkpoint_not_parent: ckNotP };
// compare with stage-B counts and with stored score tables (every E5 config and seed)
for (const sc of ['pool', 'unrestricted']) {
  let occ = 0, un = 0, unAbs = 0, tasksWithUn = 0, truthUn = 0, truthAll = 0;
  const dist = new Set(), distCk = new Set();
  for (const t of late) { const p = res.per_task[t.task_id][sc]; occ += p.n; un += p.unscored.length; unAbs += p.unscored_absent; if (p.unscored.length) tasksWithUn++; truthUn += p.truth_unscored; truthAll += p.truth_in_cands; for (const c of p.unscored) { dist.add(c); distCk.add(plan.assignment[t.parent] + '|' + c); } }
  const S = { occurrences: occ, unscored: un, unscored_absent_at_C: unAbs, tasks_with_unscored: tasksWithUn, distinct_unscored: dist.size, distinct_ck_unscored: distCk.size, truth_occ_in_cands: truthAll, truth_occ_unscored: truthUn };
  // stage-B counts
  const cmp = {};
  for (const cid of plan.configs.E5.map(c => c.config_id)) for (const s of [1, 2, 3]) {
    const cnt = JSON.parse(fs.readFileSync(path.join(LANE, 'train/stageB/tables', 'E5_' + cid + '_s' + s + '_counts.json'), 'utf8'));
    const tab = core.readScoreTable(path.join(LANE, 'train/stageB/tables', 'E5_' + cid + '_s' + s + '_' + sc + '.tsv.gz'));
    let cntMis = 0, tabMis = 0, sumUn = 0; const ex = [];
    for (const t of late) {
      const p = res.per_task[t.task_id][sc]; const r = cnt[t.task_id][sc];
      sumUn += r.cands_unscored || 0;
      if ((r.cands_unscored || 0) !== p.unscored.length || r.cands !== p.n || (r.cands_unscored_not_in_routed_specialists || 0) !== p.unscored.length - p.unscored_absent) { cntMis++; if (ex.length < 3) ex.push(['cnt', t.task_id, r, p.unscored.length]); }
      const row = tab.get(t.task_id) || new Map();
      const want = new Set((cands[sc].get(t.task_id) || []).filter(c => !p.unscored.includes(c)));
      const got = new Set(row.keys());
      const same = want.size === got.size && [...want].every(c => got.has(c));
      if (!same) { tabMis++; if (ex.length < 6) ex.push(['tab', t.task_id, want.size, got.size]); }
    }
    cmp[cid + '_s' + s] = { counts_mismatch_tasks: cntMis, table_scored_set_mismatch_tasks: tabMis, counts_sum_unscored: sumUn, examples: ex };
  }
  S.compare = cmp;
  res.scopes[sc] = S;
}
const slim = JSON.parse(JSON.stringify(res));
fs.writeFileSync(path.join(OUT, 'route-pertask.json'), JSON.stringify(res));
for (const k in slim.per_task) { for (const sc of ['pool', 'unrestricted']) delete slim.per_task[k][sc].by; }
delete slim.per_task;
fs.writeFileSync(path.join(OUT, 'route-out.json'), JSON.stringify(slim, null, 1));
console.log(JSON.stringify(slim, null, 1));
