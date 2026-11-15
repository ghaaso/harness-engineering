const fs = require('fs'), path = require('path');
const T = path.join(process.argv[2], 'train');
const rd = p => JSON.parse(fs.readFileSync(path.join(T, p), 'utf8'));
const rec = rd('heldout/item27.json'), tune = rd('report/tune.json'), plan = rd('stageB/plan.json');
const ARMS = ['E1', 'E2', 'E3', 'E4', 'E5'], ORDER = ['E3', 'E1', 'E2', 'E4', 'E5'];
const lines = []; const L = s => { lines.push(s); console.log(s); };
const figs = {};
for (const a of ARMS) {
  const ch = rd('selectB/' + a + '/choices.json').final_all65;
  const tc = tune.choices[a].final_all65;
  const r = rec.arms[a];
  const same = (x, y) => JSON.stringify(x) === JSON.stringify(y);
  const candSame = same(ch.candidates.map(c => [c.config_id, c.w, c.mean, c.se]), r.candidates.map(c => [c.config_id, c.w, c.mean, c.se]));
  const candSameTune = same(ch.candidates, tc.candidates);
  const pc = plan.configs[a].find(c => c.config_id === r.config_id);
  const size = [Number(pc.cfg.embedding_dim), Number(pc.cfg.num_layers || 0)];
  figs[a] = { mean: ch.mean, size };
  // blocks in tune.json equal choices.json blocks
  const blk = rd('selectB/' + a + '/choices.json').blocks.map(b => [b.block, b.config_id, b.w]);
  L([a, 'rec', r.config_id, r.w, r.mean, 'choices', ch.config_id, ch.w, ch.mean, 'tune', tc.config_id, tc.w, tc.mean,
    'eq_choice', r.config_id === ch.config_id && r.w === ch.w && r.mean === ch.mean && r.se === ch.se,
    'eq_tune', tc.config_id === ch.config_id && tc.w === ch.w && tc.mean === ch.mean,
    'cands_rec=choices', candSame, 'cands_tune=choices', candSameTune, 'blocks_tune=choices', same(blk, tune.choices[a].blocks),
    'rec_cfg=plan', same(r.cfg, pc.cfg), 'rec_epochs', r.epochs, 'plan_epochs', pc.epochs, 'stageA_best', pc.stageA_best_epoch,
    'size', JSON.stringify(size), 'rec_size', JSON.stringify(r.size), '4dp', ch.mean.toFixed(4), 'x1e4', (ch.mean * 1e4).toFixed(6)].join(' '));
}
const top = Math.max(...ARMS.map(a => Number(figs[a].mean.toFixed(4))));
const tied = ARMS.filter(a => Number(figs[a].mean.toFixed(4)) === top);
tied.sort((x, y) => (figs[x].size[0] - figs[y].size[0]) || (figs[x].size[1] - figs[y].size[1]) || (ORDER.indexOf(x) - ORDER.indexOf(y)));
L('my selected arm ' + tied[0] + ' tie group ' + JSON.stringify(tied) + ' top4dp ' + top);
L('record chosen ' + JSON.stringify(rec.chosen) + ' tie_group ' + JSON.stringify(rec.tie_group_4dp) + ' s ' + rec.s + ' device ' + rec.device);
const sortedM = ARMS.map(a => [a, figs[a].mean]).sort((x, y) => y[1] - x[1]);
L('ranking ' + JSON.stringify(sortedM) + ' gap1-2 ' + (sortedM[0][1] - sortedM[1][1]));
// distance of each figure from a 4-dp rounding boundary
for (const a of ARMS) { const x = figs[a].mean * 1e4; const f = x - Math.floor(x); L(a + ' frac_at_4dp ' + f.toFixed(6) + ' dist_from_half ' + Math.abs(f - 0.5).toExponential(3)); }
L('plan s ' + plan.s + ' rec plan_hash==plan ' + (rec.plan_hash === plan.plan_hash) + ' rec test ' + rec.test);
fs.writeFileSync(path.join(__dirname, 'item27check-out.txt'), lines.join('\n') + '\n');
