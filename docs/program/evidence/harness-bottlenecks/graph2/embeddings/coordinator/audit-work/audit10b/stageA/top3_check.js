const fs = require('fs'), path = require('path');
const T = 'C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings/train';
const C = JSON.parse(fs.readFileSync(path.join(T, 'stageA_configs.json'), 'utf8'));
const KEY = { E1: 'E1_RotatE', E2: 'E2_ComplEx_N3', E3: 'E3_TransE', E4: 'E4_CompGCN', E5: 'E5_Routed_RotatE' };
function grid(arm) { const g = C[KEY[arm]].grid; const ks = Object.keys(g); let out = [{}];
  for (const k of ks) { const n = []; for (const o of out) for (const v of g[k]) n.push({ ...o, [k]: v }); out = n; }
  return out.map((c, i) => ['c' + String(i + 1).padStart(2, '0'), c]); }
const freq = a => (a === 'E4' ? 5 : 10);
const plan = JSON.parse(fs.readFileSync(path.join(T, 'stageB/plan.json'), 'utf8'));
const top3file = JSON.parse(fs.readFileSync(path.join(T, 'stageA/top3.json'), 'utf8'));
const out = {}; const issues = [];
for (const arm of ['E1', 'E2', 'E3', 'E4', 'E5']) {
  const rows = [];
  for (const [cid, cfg] of grid(arm)) {
    const m = JSON.parse(fs.readFileSync(path.join(T, 'stageA', arm, cid, 'meta.json'), 'utf8'));
    const same = JSON.stringify(Object.keys(cfg).sort().map(k => [k, cfg[k]])) === JSON.stringify(Object.keys(m.cfg).sort().map(k => [k, m.cfg[k]]));
    if (!same) issues.push(`${arm}/${cid} cfg differs from grid`);
    if (m.seed !== 1 || m.sha !== 'cd806c803c4ad8ec198790096d196460789951f0') issues.push(`${arm}/${cid} seed/sha`);
    const vmax = m.val.reduce((a, b) => (b[1] > a[1] ? b : a));
    const atBest = m.val.find(v => v[0] === m.best_epoch);
    if (!atBest || atBest[1] !== m.val_mrr) issues.push(`${arm}/${cid} val_mrr not at best_epoch`);
    rows.push({ cid, dim: cfg.embedding_dim, val: m.val_mrr, best_epoch: m.best_epoch, argmax_epoch: vmax[0], argmax_val: vmax[1], epochs: m.epochs, n_evals: m.val.length, last_eval: m.val[m.val.length - 1][0] });
  }
  const rs = rows.slice().sort((a, b) => b.val - a.val || a.dim - b.dim || (a.cid < b.cid ? -1 : 1));
  const mine = rs.slice(0, 3).map(r => r.cid);
  const tf = top3file[arm].top3.map(x => x.config_id);
  const pl = plan.configs[arm].map(x => x.config_id);
  const plEp = plan.configs[arm].map(x => x.epochs);
  const ruleEp = rs.slice(0, 3).map(r => Math.max(20, Math.ceil(r.best_epoch / freq(arm)) * freq(arm)));
  const argmaxEp = rs.slice(0, 3).map(r => Math.max(20, Math.ceil(r.argmax_epoch / freq(arm)) * freq(arm)));
  const fourth = rs[3];
  out[arm] = { recomputed_top3: mine, top3_json: tf, plan: pl, plan_epochs: plEp, rule36_epochs_from_best_epoch: ruleEp, rule36_epochs_from_val_argmax: argmaxEp,
    top3_vals: rs.slice(0, 3).map(r => +r.val.toFixed(4)), fourth: [fourth.cid, +fourth.val.toFixed(4)], gap_3rd_4th: +(rs[2].val - fourth.val).toFixed(4),
    units_where_best_epoch_ne_argmax: rows.filter(r => r.best_epoch !== r.argmax_epoch).map(r => `${r.cid}:${r.best_epoch}->${r.argmax_epoch} (${r.val.toFixed(4)} vs ${r.argmax_val.toFixed(4)})`),
    units_stopped_by_max_epochs: rows.filter(r => r.epochs >= (arm === 'E2' ? 200 : arm === 'E4' ? 150 : 400)).map(r => r.cid),
    units_peak_at_first_eval: rows.filter(r => r.best_epoch === freq(arm)).map(r => r.cid),
    all: rs.map(r => `${r.cid} ${r.val.toFixed(4)} d${r.dim} be${r.best_epoch} ep${r.epochs}`) };
  if (JSON.stringify(mine) !== JSON.stringify(tf) || JSON.stringify(mine) !== JSON.stringify(pl)) issues.push(arm + ' top3 mismatch');
  if (JSON.stringify(ruleEp) !== JSON.stringify(plEp)) issues.push(arm + ' epochs mismatch');
}
out.issues = issues;
fs.writeFileSync(path.join(__dirname, 'top3_check.out.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
