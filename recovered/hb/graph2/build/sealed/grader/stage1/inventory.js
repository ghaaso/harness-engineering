'use strict';
// Step 2: locate and check every arm's stage-1 TUNE answer files (no reference is read here).
//   node inventory.js > inventory.json
// Per arm: the current list (hash recomputed, nothing logged), one file per (configuration, set) at
// results/<arm>/tune/<hash>.<set>.jsonl.gz; each file holds every TUNE task of its set exactly once,
// split tune only, the right config_hash, arm and parent; the sweep summary's list hash and task ids
// match; every parent's facts carry extractor 59da7b753a4d908e and were written before the answers.
// Also: across arms, answers of configurations with the same hash compared (packed content only).
const fs = require('fs');
const path = require('path');
const B = process.env.GT_BUILD || path.resolve(__dirname, '..', '..', '..');
const H = require(path.join(B, 'arms', 'common', 'harness'));
const C = require(path.join(B, 'arms', 'common', 'config'));
const EXTRACTOR = '59da7b753a4d908e';
const SETS = ['T1', 'T1x', 'T2'];
const ARMS = ['relational', 'reference', 'search', 'ladybug', 'duckpgq', 'floor-dir', 'floor-co'];
const SUMMARIES = {
  relational: (s) => `results/sweep/stage1/relational+reference_${s}.summary.json`, reference: (s) => `results/sweep/stage1/relational+reference_${s}.summary.json`,
  search: (s) => `results/sweep/stage1/search_${s}.summary.json`,
  'floor-dir': (s) => `results/sweep/stage1/floor-dir+floor-co_${s}.summary.json`, 'floor-co': (s) => `results/sweep/stage1/floor-dir+floor-co_${s}.summary.json`,
  ladybug: () => 'results/ladybug/sweep/stage1/ladybug_T1+T1x+T2.summary.json', duckpgq: () => 'results/duckpgq/stage1_sweep/summary.json',
};
const tasks = H.loadTasks(SETS, 'tune');
const bySet = Object.fromEntries(SETS.map((s) => [s, tasks.filter((t) => t.set === s)]));
const parentOf = new Map(tasks.map((t) => [t.id, t.parent]));
const out = { extractor: EXTRACTOR, task_counts: Object.fromEntries(SETS.map((s) => [s, bySet[s].length])), facts: {}, arms: {}, problems: [], cross_arm: {} };
// facts
let factsLatest = 0;
for (const p of new Set(tasks.map((t) => t.parent))) {
  const f = path.join(B, 'facts', 'cache', p, 'meta.json');
  if (!fs.existsSync(f)) { out.problems.push('facts missing for parent ' + p.slice(0, 8)); continue; }
  const m = JSON.parse(fs.readFileSync(f, 'utf8'));
  if (m.extractor_version !== EXTRACTOR) out.problems.push('parent ' + p.slice(0, 8) + ' extractor ' + m.extractor_version);
  factsLatest = Math.max(factsLatest, fs.statSync(f).mtimeMs);
  for (const g of ['nodes.jsonl', 'edges.jsonl']) { const q = path.join(B, 'facts', 'cache', p, g); if (fs.existsSync(q)) factsLatest = Math.max(factsLatest, fs.statSync(q).mtimeMs); }
}
out.facts = { parents: new Set(tasks.map((t) => t.parent)).size, latest_facts_write: new Date(factsLatest).toISOString() };
const strip = (a) => JSON.stringify({ items: a.items, budgets: a.budgets, n_units: a.n_units, n_head: a.n_head, seeds: a.seeds, ranked_sha: a.ranked_sha });
const content = {}; // arm -> hash -> set -> Map(id -> stripped)
for (const arm of ARMS) {
  const L = arm === 'reference' ? H.loadArmList('relational', 1, false) : H.loadArmList(arm, 1, false);
  const A = out.arms[arm] = { list_hash: L.hash, configs: L.list.length, files_expected: L.list.length * SETS.length, files_found: 0, answers: 0, oldest_answer_file: null, newest_answer_file: null, summary_list_hashes: {}, extra_files: [] };
  const dir = path.join(B, 'results', arm, 'tune');
  const want = new Set();
  content[arm] = {};
  let oldest = Infinity; let newest = 0;
  for (const x of L.list) for (const s of SETS) {
    const f = path.join(dir, x.hash + '.' + s + '.jsonl.gz'); want.add(path.basename(f));
    if (!fs.existsSync(f)) { out.problems.push(arm + ': missing ' + path.basename(f) + ' (' + x.name + ')'); continue; }
    A.files_found++; const st = fs.statSync(f); oldest = Math.min(oldest, st.mtimeMs); newest = Math.max(newest, st.mtimeMs);
    const rows = H.readGzJsonl(f); A.answers += rows.length;
    const ids = new Map(); for (const a of rows) ids.set(a.id, (ids.get(a.id) || 0) + 1);
    const exp = bySet[s].map((t) => t.id);
    const missing = exp.filter((id) => !ids.has(id)); const dup = [...ids].filter(([, n]) => n > 1).map(([id]) => id); const extra = [...ids.keys()].filter((id) => !exp.includes(id));
    if (missing.length || dup.length || extra.length) out.problems.push(`${arm} ${x.name} ${s}: missing ${missing.length}, duplicated ${dup.length}, extra ${extra.length}`);
    for (const a of rows) {
      if (a.split !== 'tune' || a.set !== s) { out.problems.push(`${arm} ${x.name} ${s}: answer ${a.id} split ${a.split} set ${a.set}`); break; }
      if (a.config_hash !== x.hash) { out.problems.push(`${arm} ${x.name} ${s}: config_hash ${a.config_hash}`); break; }
      if (a.arm !== arm) { out.problems.push(`${arm} ${x.name} ${s}: arm field ${a.arm}`); break; }
      if (parentOf.get(a.id) !== a.parent) { out.problems.push(`${arm} ${x.name} ${s}: parent of ${a.id}`); break; }
    }
    if (arm !== 'search' && !arm.startsWith('floor')) {
      if (!content[arm][x.hash]) content[arm][x.hash] = {};
      content[arm][x.hash][s] = new Map(rows.map((a) => [a.id, strip(a)]));
    }
  }
  const have = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.jsonl.gz')) : [];
  A.extra_files = have.filter((f) => !want.has(f));
  if (A.extra_files.length) out.problems.push(arm + ': ' + A.extra_files.length + ' files in tune/ not in the current list');
  A.oldest_answer_file = new Date(oldest).toISOString(); A.newest_answer_file = new Date(newest).toISOString();
  if (oldest < factsLatest) out.problems.push(arm + ': an answer file is older than the facts');
  for (const s of SETS) {
    const f = path.join(B, SUMMARIES[arm](s));
    if (!fs.existsSync(f)) { out.problems.push(arm + ': summary missing ' + SUMMARIES[arm](s)); continue; }
    const sm = JSON.parse(fs.readFileSync(f, 'utf8'));
    const lh = sm.lists && (sm.lists[arm] || sm.lists[Object.keys(sm.lists)[0]]);
    A.summary_list_hashes[s] = lh ? lh.hash : null;
    if (!lh || lh.hash !== L.hash) out.problems.push(`${arm} ${s}: summary list hash ${lh && lh.hash} differs from the current ${L.hash}`);
    const ids = new Set(sm.task_ids || []); const exp = bySet[s].map((t) => t.id);
    if (!exp.every((id) => ids.has(id))) out.problems.push(`${arm} ${s}: summary task ids do not cover the set`);
  }
}
// cross-arm identity on shared configuration hashes (packed content: items, budgets, units, seeds, ranked_sha)
for (const [a, b] of [['relational', 'reference'], ['relational', 'ladybug'], ['relational', 'duckpgq'], ['ladybug', 'duckpgq']]) {
  const shared = Object.keys(content[a]).filter((h) => content[b][h]);
  const res = { shared_configs: shared.length, answers: 0, packed_identical: 0, ranked_sha_identical: 0, configs_fully_identical: 0, differing_configs: [] };
  for (const h of shared) {
    let allSame = true; let nd = 0;
    for (const s of SETS) {
      const ma = content[a][h][s]; const mb = content[b][h][s]; if (!ma || !mb) continue;
      for (const [id, va] of ma) {
        res.answers++; const vb = mb.get(id);
        if (va === vb) res.packed_identical++; else { allSame = false; nd++; }
        if (vb && JSON.parse(va).ranked_sha === JSON.parse(vb).ranked_sha) res.ranked_sha_identical++;
      }
    }
    if (allSame) res.configs_fully_identical++; else res.differing_configs.push({ hash: h, answers_differing: nd });
  }
  out.cross_arm[a + ' vs ' + b] = res;
}
console.log(JSON.stringify(out, null, 1));
