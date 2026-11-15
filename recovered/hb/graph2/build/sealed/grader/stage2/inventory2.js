'use strict';
// Stage 2, step 1: locate and check every arm's stage-2 TUNE answer files (no reference is read here).
//   node inventory2.js > inventory2.json
// Per arm (relational, search, ladybug, duckpgq): the stage-2 list (exactly 20, hash recomputed, nothing
// logged); one file per (configuration, set) at results/<arm>/tune/<hash>.<set>.jsonl.gz; each file holds
// every TUNE task of its set exactly once, split tune, the right config_hash, arm and parent; the sweep
// summaries' list hash and task ids match; answers newer than the facts. Also: the stage-1 lists and
// files are unchanged since stage-1 grading, and across arms the answers of identical configuration
// hashes are compared (packed content only), over stage 1 and stage 2 together.
const fs = require('fs');
const path = require('path');
const B = process.env.GT_BUILD || path.resolve(__dirname, '..', '..', '..');
const H = require(path.join(B, 'arms', 'common', 'harness'));
const SETS = ['T1', 'T1x', 'T2'];
const ARMS = ['relational', 'search', 'ladybug', 'duckpgq'];
const SUMMARIES = {
  relational: SETS.map((s) => `results/relational/stage2/relational+reference_${s}.summary.stage2.json`),
  search: ['results/search/stage2/summary.stage2.json'],
  ladybug: ['results/ladybug/sweep/stage2/ladybug+reference_T1+T1x+T2.summary.json'],
  duckpgq: ['results/duckpgq/stage2_sweep/T1_T2_crosscheck/summary.stage2.json', 'results/duckpgq/stage2_sweep/T1x/summary.stage2.json'],
};
const inv1 = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'stage1', 'inventory.json'), 'utf8'));
const tasks = H.loadTasks(SETS, 'tune');
const bySet = Object.fromEntries(SETS.map((s) => [s, tasks.filter((t) => t.set === s)]));
const parentOf = new Map(tasks.map((t) => [t.id, t.parent]));
const factsLatest = Date.parse(inv1.facts.latest_facts_write);
const out = { task_counts: Object.fromEntries(SETS.map((s) => [s, bySet[s].length])), facts_latest: inv1.facts.latest_facts_write, arms: {}, problems: [], cross_arm: {} };
const strip = (a) => JSON.stringify({ items: a.items, budgets: a.budgets, n_units: a.n_units, n_head: a.n_head, seeds: a.seeds, ranked_sha: a.ranked_sha });
const content = {};
for (const arm of ARMS) {
  const L1 = H.loadArmList(arm, 1, false); const L2 = H.loadArmList(arm, 2, false);
  const A = out.arms[arm] = { stage1_list_hash: L1.hash, stage1_list_hash_at_stage1_grading: inv1.arms[arm].list_hash, stage2_list_hash: L2.hash, stage2_configs: L2.list.length,
    files_expected: L2.list.length * SETS.length, files_found: 0, answers: 0, answers_per_set: {}, oldest_stage2_file: null, newest_stage2_file: null, newest_stage1_file: null, summary_list_hashes: [] };
  if (L1.hash !== inv1.arms[arm].list_hash) out.problems.push(arm + ': stage-1 list changed since stage-1 grading');
  if (L2.list.length !== 20) out.problems.push(arm + ': stage-2 list has ' + L2.list.length);
  const dir = path.join(B, 'results', arm, 'tune');
  content[arm] = {};
  let oldest = Infinity; let newest = 0; let newest1 = 0;
  for (const x of L1.list) for (const s of SETS) { const f = path.join(dir, x.hash + '.' + s + '.jsonl.gz'); if (fs.existsSync(f)) newest1 = Math.max(newest1, fs.statSync(f).mtimeMs); }
  A.newest_stage1_file = new Date(newest1).toISOString();
  if (newest1 > Date.parse(inv1.arms[arm].newest_answer_file) + 1000) out.problems.push(arm + ': a stage-1 answer file was rewritten after stage-1 grading');
  for (const [st, L] of [[1, L1], [2, L2]]) for (const x of L.list) for (const s of SETS) {
    const f = path.join(dir, x.hash + '.' + s + '.jsonl.gz');
    if (!fs.existsSync(f)) { out.problems.push(`${arm}: missing ${path.basename(f)} (${x.name})`); continue; }
    const rows = H.readGzJsonl(f);
    if (st === 2) {
      A.files_found++; const mt = fs.statSync(f).mtimeMs; oldest = Math.min(oldest, mt); newest = Math.max(newest, mt);
      A.answers += rows.length; A.answers_per_set[s] = (A.answers_per_set[s] || 0) + rows.length;
      const ids = new Map(); for (const a of rows) ids.set(a.id, (ids.get(a.id) || 0) + 1);
      const exp = bySet[s].map((t) => t.id); const expS = new Set(exp);
      const missing = exp.filter((id) => !ids.has(id)); const dup = [...ids].filter(([, n]) => n > 1).length; const extra = [...ids.keys()].filter((id) => !expS.has(id)).length;
      if (missing.length || dup || extra) out.problems.push(`${arm} ${x.name} ${s}: missing ${missing.length}, duplicated ${dup}, extra ${extra}`);
      for (const a of rows) {
        if (a.split !== 'tune' || a.set !== s) { out.problems.push(`${arm} ${x.name} ${s}: answer ${a.id} split ${a.split} set ${a.set}`); break; }
        if (a.config_hash !== x.hash) { out.problems.push(`${arm} ${x.name} ${s}: config_hash ${a.config_hash}`); break; }
        if (a.arm !== arm) { out.problems.push(`${arm} ${x.name} ${s}: arm field ${a.arm}`); break; }
        if (parentOf.get(a.id) !== a.parent) { out.problems.push(`${arm} ${x.name} ${s}: parent of ${a.id}`); break; }
      }
    }
    if (arm !== 'search') { if (!content[arm][x.hash]) content[arm][x.hash] = { name: x.name, stage: st }; content[arm][x.hash][s] = new Map(rows.map((a) => [a.id, strip(a)])); }
  }
  A.oldest_stage2_file = new Date(oldest).toISOString(); A.newest_stage2_file = new Date(newest).toISOString();
  if (oldest < factsLatest) out.problems.push(arm + ': a stage-2 answer file is older than the facts');
  const ids = new Set();
  for (const rel of SUMMARIES[arm]) {
    const f = path.join(B, rel);
    if (!fs.existsSync(f)) { out.problems.push(arm + ': summary missing ' + rel); continue; }
    const sm = JSON.parse(fs.readFileSync(f, 'utf8'));
    const lh = sm.lists && (sm.lists[arm] || sm.lists[Object.keys(sm.lists)[0]]);
    A.summary_list_hashes.push({ file: rel, hash: lh ? lh.hash : null, stage: sm.stage });
    if (!lh || lh.hash !== L2.hash) out.problems.push(`${arm}: summary ${rel} list hash ${lh && lh.hash} differs from the current ${L2.hash}`);
    for (const id of sm.task_ids || []) ids.add(id);
  }
  for (const s of SETS) if (!bySet[s].every((t) => ids.has(t.id))) out.problems.push(`${arm} ${s}: stage-2 summary task ids do not cover the set`);
}
for (const [a, b] of [['relational', 'ladybug'], ['relational', 'duckpgq'], ['ladybug', 'duckpgq']]) {
  const shared = Object.keys(content[a]).filter((h) => content[b][h]);
  const res = { shared_configs: shared.length, shared_stage2_involved: shared.filter((h) => content[a][h].stage === 2 || content[b][h].stage === 2).length, answers: 0, packed_identical: 0, ranked_sha_identical: 0, configs_fully_identical: 0, differing_configs: [] };
  for (const h of shared) {
    let nd = 0;
    for (const s of SETS) {
      const ma = content[a][h][s]; const mb = content[b][h][s]; if (!ma || !mb) continue;
      for (const [id, va] of ma) {
        res.answers++; const vb = mb.get(id);
        if (va === vb) res.packed_identical++; else nd++;
        if (vb && JSON.parse(va).ranked_sha === JSON.parse(vb).ranked_sha) res.ranked_sha_identical++;
      }
    }
    if (!nd) res.configs_fully_identical++; else res.differing_configs.push({ hash: h, a_name: content[a][h].name, b_name: content[b][h].name, answers_differing: nd });
  }
  out.cross_arm[a + ' vs ' + b] = res;
}
console.log(JSON.stringify(out, null, 1));
