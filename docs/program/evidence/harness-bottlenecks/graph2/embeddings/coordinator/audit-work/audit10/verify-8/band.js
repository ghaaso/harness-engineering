const fs = require('fs'), path = require('path');
const L = 'C:\\Users\\User\\AppData\\Local\\Temp\\claude\\192654871f6b1294\\e24f17dc-4aea-4914-a9d1-280a723d620e\\scratchpad\\hb\\graph2\\wider\\embeddings\\train';
const plan = JSON.parse(fs.readFileSync(path.join(L, 'stageB', 'plan.json'), 'utf8'));
const out = [];
const sizes = {};
for (const arm of Object.keys(plan.configs).sort()) {
  sizes[arm] = plan.configs[arm].map(c => [c.config_id, c.cfg.embedding_dim, c.cfg.num_layers === undefined ? null : c.cfg.num_layers]);
}
out.push('SIZES ' + JSON.stringify(sizes));
function check(label, b) {
  const c = b.candidates;
  const top = Math.max(...c.map(x => x.mean));
  const tied = c.filter(x => x.mean === top);
  const seBest = Math.max(...tied.map(x => x.se));
  const floor = top - seBest;
  const band = c.filter(x => x.mean >= floor);
  const spread = top - Math.min(...c.map(x => x.mean));
  const minMargin = Math.min(...c.map(x => x.mean - floor));
  return `${label} n=${c.length} inBand=${band.length} top=${top.toFixed(4)} se=${seBest.toFixed(4)} spread=${spread.toFixed(4)} minMargin=${minMargin.toFixed(4)} chosen=${b.config_id},${b.w} best=${b.best.config_id},${b.best.w} storedBest=${b.best.mean.toFixed(4)}/${b.best.se.toFixed(4)}`;
}
for (const arm of ['E1', 'E2', 'E3', 'E4', 'E5', 'PLACEBO']) {
  const j = JSON.parse(fs.readFileSync(path.join(L, 'selectB', arm, 'choices.json'), 'utf8'));
  j.blocks.forEach(b => out.push(arm + ' ' + check('main block' + b.block, b)));
  out.push(arm + ' ' + check('main final_all65', j.final_all65));
  if (j.sensitivity_builder && j.sensitivity_builder.blocks) {
    j.sensitivity_builder.blocks.forEach(b => out.push(arm + ' ' + check('builder block' + b.block, b)));
    if (j.sensitivity_builder.final_all65) out.push(arm + ' ' + check('builder final_all65', j.sensitivity_builder.final_all65));
  }
  for (const w of Object.keys(j.fixed_w || {})) {
    const v = j.fixed_w[w];
    if (Array.isArray(v)) v.forEach(b => b.candidates && out.push(arm + ' ' + check('fixed_w' + w + ' block' + b.block, b)));
  }
}
fs.writeFileSync(path.join(__dirname, 'band-out.txt'), out.join('\n') + '\n');
console.log(out.join('\n'));
