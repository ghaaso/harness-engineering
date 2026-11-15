'use strict';
// Does the search arm's text really lose a removed document? (addendum 4 item 14), TUNE only.
// 1. For every dry task's parent: the search context with and without remove_paths; is the document in
//    its exported tree (ctx.files, which the questions read) and in its grep/BM25 corpus (ctx.codePaths)?
// 2. A removed CODE file (the search arm greps code only, so a Markdown removal cannot change its
//    ranking): for the first dry task whose stored TUNE answer (e70177e5807f0252) has a head hit other
//    than the seed, remove that file and show the hit disappear and the answer change.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const H = require('../../arms/common/harness');
const { graphFor, openArm } = require('../../arms/common/arms');
const B = path.resolve(__dirname, '..', '..');
const tasks = fs.readFileSync(path.join(__dirname, 'dry_tasks.jsonl'), 'utf8').split('\n').filter(Boolean).map(JSON.parse);
const CFG = 'e70177e5807f0252';
const cfg = H.loadArmList('search', 2, false).list.find((c) => c.hash === CFG).cfg;
const stored = new Map(zlib.gunzipSync(fs.readFileSync(path.join(B, 'results', 'search', 'tune', CFG + '.T1.jsonl.gz'))).toString().split('\n').filter(Boolean).map(JSON.parse).map((a) => [a.id, a]));
const strip = (a) => JSON.stringify({ ...a, ms: null, engine_ms: null, config_name: null });

(async () => {
  const out = { parents: 0, doc_in_tree_without_removal: 0, doc_in_tree_with_removal: 0, doc_in_corpus_without_removal: 0, doc_in_corpus_with_removal: 0, doc_nodes_without: 0, doc_nodes_with: 0 };
  const seen = new Set();
  for (const t of tasks) {
    if (seen.has(t.parent)) continue; seen.add(t.parent); out.parents++;
    const doc = t.remove_paths[0];
    for (const [rm, tag] of [[[], 'without'], [t.remove_paths, 'with']]) {
      const G = graphFor(t.parent, rm);
      const a = await openArm('search', G);
      if (a.raw.ctx.files.has(doc)) out['doc_in_tree_' + tag + '_removal']++;
      if (a.raw.ctx.codePaths.includes(doc)) out['doc_in_corpus_' + tag + '_removal']++;
      out['doc_nodes_' + tag] += G.nodes.filter((n) => n.path === doc).length;
      await a.close();
    }
  }
  // 2. code-file removal
  let probe = null;
  for (const t of tasks) {
    const s = stored.get(t.id);
    const hit = s && s.items.find((i) => !i.pad && i.path && i.path !== t.seed.path && i.kind === 'file');
    if (!hit) continue;
    const G0 = graphFor(t.parent, []);
    const a0 = await openArm('search', G0);
    const sm0 = H.mapSeed(G0, t.seed);
    const r0 = await a0.rank(sm0.ids, cfg, t.seed);
    const ans0 = H.answer(G0, t, sm0, r0, cfg, 'search', 0);
    await a0.close();
    const G1 = graphFor(t.parent, [hit.path]);
    const a1 = await openArm('search', G1);
    const sm1 = H.mapSeed(G1, t.seed);
    const r1 = await a1.rank(sm1.ids, cfg, t.seed);
    const ans1 = H.answer(G1, { ...t, remove_paths: [hit.path] }, sm1, r1, cfg, 'search', 0);
    probe = { task: t.id, removed_code_file: hit.path, stored_rank_of_file: s.items.indexOf(hit) + 1,
      rerun_without_removal_equals_stored: strip(ans0) === strip(s),
      file_in_answer_without_removal: ans0.items.some((i) => i.path === hit.path),
      file_in_answer_with_removal: ans1.items.some((i) => i.path === hit.path),
      file_in_tree_with_removal: a1.raw.ctx.files.has(hit.path),
      answer_changed: JSON.stringify(ans0.items) !== JSON.stringify(ans1.items),
      head_items_without: ans0.n_head, head_items_with: ans1.n_head, lookups_without: ans0.lookups, lookups_with: ans1.lookups };
    await a1.close();
    break;
  }
  out.code_file_probe = probe;
  fs.writeFileSync(path.join(__dirname, 'search_probe.json'), JSON.stringify(out, null, 1));
  console.log(JSON.stringify(out));
})().catch((e) => { console.error(e); process.exit(1); });
