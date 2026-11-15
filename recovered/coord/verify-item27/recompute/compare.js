'use strict';
const fs = require('fs');
const L = 'C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings';
const blind = JSON.parse(fs.readFileSync(__dirname + '/blind-result.json', 'utf8'));
const tune = JSON.parse(fs.readFileSync(L + '/train/report/tune.json', 'utf8'));
const it27 = JSON.parse(fs.readFileSync(L + '/train/heldout/item27.json', 'utf8'));
const TOL = 1e-9;
const out = { maxdiff: { mean: 0, se: 0 }, mismatches: [], arms: {} };
const key = (c, w) => c + '/w' + Number(w);
function cmpCands(arm, where, mine, stored) {
  // mine: Map key -> {mean, se}; stored: [{config_id,w,mean,se}]
  if (stored.length !== mine.size) out.mismatches.push(`${arm} ${where}: count ${stored.length} vs ${mine.size}`);
  for (const s of stored) {
    const m = mine.get(key(s.config_id, s.w));
    if (!m) { out.mismatches.push(`${arm} ${where}: missing ${key(s.config_id, s.w)}`); continue; }
    const dm = Math.abs(m.mean - s.mean), ds = Math.abs(m.se - s.se);
    out.maxdiff.mean = Math.max(out.maxdiff.mean, dm); out.maxdiff.se = Math.max(out.maxdiff.se, ds);
    if (dm > TOL || ds > TOL) out.mismatches.push(`${arm} ${where} ${key(s.config_id, s.w)} mean ${m.mean} vs ${s.mean} se ${m.se} vs ${s.se}`);
  }
}
for (const arm of ['E1', 'E2', 'E3', 'E4', 'E5']) {
  const ch = JSON.parse(fs.readFileSync(`${L}/train/selectB/${arm}/choices.json`, 'utf8'));
  const B = blind.arms[arm];
  const m65 = new Map(B.candidates.map(c => [key(c.config_id, c.w), { mean: c.all65_mean, se: c.all65_se1 }]));
  cmpCands(arm, 'final_all65', m65, ch.final_all65.candidates);
  cmpCands(arm, 'tune.final_all65', m65, tune.choices[arm].final_all65.candidates);
  cmpCands(arm, 'item27.arms', m65, it27.arms[arm].candidates);
  const A = { final: { mine: key(B.final_all65.choice.config_id, B.final_all65.choice.w), stored: key(ch.final_all65.config_id, ch.final_all65.w),
    tune: key(tune.choices[arm].final_all65.config_id, tune.choices[arm].final_all65.w), item27: key(it27.arms[arm].config_id, it27.arms[arm].w),
    best_mine: B.final_all65.best.join(','), best_stored: key(ch.final_all65.best.config_id, ch.final_all65.best.w),
    mean_mine: B.final_all65.choice.mean, mean_stored: ch.final_all65.mean, item27_mean: it27.arms[arm].mean, item27_se: it27.arms[arm].se,
    band_mine: B.final_all65.band.slice().sort().join(',') }, blocks: [] };
  // stored band recomputed from stored candidates with the same rule threshold
  const sb = ch.final_all65.best; const thr = sb.mean - sb.se;
  A.final.band_from_stored = ch.final_all65.candidates.filter(c => c.mean >= thr).map(c => key(c.config_id, c.w)).sort().join(',');
  if (A.final.band_from_stored !== A.final.band_mine) out.mismatches.push(arm + ' final band differs');
  for (const k of ['stored', 'tune', 'item27']) if (A.final[k] !== A.final.mine) out.mismatches.push(`${arm} final choice ${k} ${A.final[k]} vs ${A.final.mine}`);
  if (A.final.best_stored !== A.final.best_mine) out.mismatches.push(arm + ' best differs');
  for (let i = 0; i < 5; i++) {
    const sbk = ch.blocks[i], mb = B.blocks[i];
    const mm = new Map(B.candidates.map(c => [key(c.config_id, c.w), { mean: c.blocks[i].mean, se: c.blocks[i].se1 }]));
    cmpCands(arm, 'block' + sbk.block, mm, sbk.candidates);
    const thrb = sbk.best.mean - sbk.best.se;
    const bandS = sbk.candidates.filter(c => c.mean >= thrb).map(c => key(c.config_id, c.w)).sort().join(',');
    const row = { block_stored: sbk.block, earlier_stored: sbk.earlier_commits, earlier_mine: mb.n_earlier,
      mine: key(mb.choice.config_id, mb.choice.w), stored: key(sbk.config_id, sbk.w), tune: key(tune.choices[arm].blocks[i][1], tune.choices[arm].blocks[i][2]),
      best_mine: mb.best.join(','), best_stored: key(sbk.best.config_id, sbk.best.w), band_same: bandS === mb.band.slice().sort().join(',') };
    // block commit membership
    const late = blind; // not stored; compare by count only
    if (row.mine !== row.stored || row.mine !== row.tune || row.best_mine !== row.best_stored || !row.band_same || row.earlier_mine !== row.earlier_stored) out.mismatches.push(`${arm} block ${i + 1} ${JSON.stringify(row)}`);
    A.blocks.push(row);
  }
  out.arms[arm] = A;
}
out.item27 = { mine: blind.item27.selected, record: it27.chosen, tie_group_4dp: it27.tie_group_4dp, record_figures: Object.fromEntries(Object.entries(it27.arms).map(([a, v]) => [a, [v.config_id, v.w, v.mean]])),
  mine_figures: Object.fromEntries(blind.item27.arm_figures.map(f => [f.arm, [f.config_id, f.w, f.figure]])) };
for (const f of blind.item27.arm_figures) { const d = Math.abs(f.figure - it27.arms[f.arm].mean); if (d > TOL) out.mismatches.push('item27 figure ' + f.arm); }
if (it27.chosen.arm !== blind.item27.selected.arm || it27.chosen.config_id !== blind.item27.selected.config_id || Number(it27.chosen.w) !== blind.item27.selected.w) out.mismatches.push('item27 selection differs');
fs.writeFileSync(__dirname + '/compare-result.json', JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
