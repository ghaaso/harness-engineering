'use strict';
// Grader, graphify held-out, step 1: score the graphify held-out answer files and the four stored
// comparators (typed primary = relational, scripted search primary, changed-together floor, same-folder
// floor) with build/arms/common/score.js, rule content, against the held-out references
// (build/sealed/grader/heldout/refs_heldout.jsonl = the held-out lines of sealed/references.jsonl for
// T1, T1x, T2, T3, T4; the file the finished test's grader wrote and scored with).
// Checks each comparator row against the finished test's stored scores (sealed/grader/heldout/scores.json).
// Writes here: scores.json (aggregate rows), clusters.jsonl and tasks.jsonl.gz (grader only).
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const G = path.resolve(__dirname, '..', '..');
const BUILD = path.resolve(G, '..', '..', 'build');
const S = require(path.join(BUILD, 'arms', 'common', 'score'));
const H = require(path.join(BUILD, 'arms', 'common', 'harness'));
const OUT = __dirname;
const REFS = path.join(BUILD, 'sealed', 'grader', 'heldout', 'refs_heldout.jsonl');
const refs = S.readRefs(REFS);
const SETS = ['T1', 'T1x', 'T2', 'T3', 'T4'];
const r4 = (x) => (x == null ? null : Math.round(x * 1e4) / 1e4);
const ARMS = [
  { arm: 'graphify', label: 'graphify code layer (query-seed-full-d3)', file: (s) => path.join(G, 'answers', 'heldout', '66367cd303fdd75b.' + s + '.jsonl.gz') },
  { arm: 'relational', label: 'typed primary (relational = LadybugDB = DuckPGQ)', file: (s) => path.join(BUILD, 'results', 'heldout', 'relational', 'primary', s + '.jsonl.gz') },
  { arm: 'search', label: 'scripted search primary', file: (s) => path.join(BUILD, 'results', 'heldout', 'search', 'primary', s + '.jsonl.gz') },
  { arm: 'floor-co', label: 'changed-together floor', file: (s) => path.join(BUILD, 'results', 'heldout', 'floor-co', 'primary', s + '.jsonl.gz') },
  { arm: 'floor-dir', label: 'same-folder floor', file: (s) => path.join(BUILD, 'results', 'heldout', 'floor-dir', 'primary', s + '.jsonl.gz') },
];
const stored = JSON.parse(fs.readFileSync(path.join(BUILD, 'sealed', 'grader', 'heldout', 'scores.json'), 'utf8')).rows;
const rows = []; const clusters = []; const per = []; const mismatches = [];
for (const A of ARMS) for (const s of SETS) {
  const f = A.file(s);
  const res = S.scoreFile(f, refs, { rule: 'content' });
  if (res.length !== 1) throw new Error(f + ': ' + res.length + ' groups');
  const g = res[0];
  const recs = H.readGzJsonl(f);
  for (const r of g._rows) clusters.push({ arm: A.arm, set: s, ...r });
  for (const t of g._per) per.push({ arm: A.arm, set: s, ...t });
  const m = g.metrics;
  const row = { arm: A.arm, label: A.label, set: s, config_hash: g.config_hash, tasks: g.tasks, commits_or_clusters: g.clusters, missing_refs: g.missing_refs, zero_unit_refs: g.zero_unit_refs,
    primary: r4(m.primary.mean), primary_se: r4(m.primary.se), r2000: r4(m.r2000.mean), r4000: r4(m.r4000.mean), r8000: r4(m.r8000.mean), r16000: r4(m.r16000.mean), auc: r4(m.auc.mean),
    file_r2000: r4(m.file_r2000.mean), file_r8000: r4(m.file_r8000.mean), def_r8000: r4(m.def_r8000.mean), precision8000: r4(m.precision8000.mean),
    file_r10: r4(m.file_r10.mean), ndcg10: r4(m.ndcg10.mean), mrr: r4(m.mrr.mean),
    median_tokens_2000: m.tok2000.median_over_tasks, median_tokens_4000: m.tok4000.median_over_tasks, median_tokens_8000: m.tok8000.median_over_tasks, median_tokens_16000: m.tok16000.median_over_tasks,
    mean_tokens_8000: r4(m.tok8000.mean),
    empty_answers: recs.filter((a) => !a.items.length).length,
    median_lookups: S.median(recs.map((a) => a.lookups).filter((v) => v != null)) };
  rows.push(row);
  if (A.arm !== 'graphify') {
    const st = stored.find((x) => x.arm === A.arm && x.role === 'primary' && x.set === s);
    for (const k of ['tasks', 'primary', 'primary_se', 'r2000', 'r4000', 'r16000', 'auc']) {
      const a = k === 'tasks' ? row.tasks : row[k]; const b = st && st[k];
      if (!st || a !== b) mismatches.push({ arm: A.arm, set: s, k, now: a, stored: b });
    }
  }
  console.log([A.arm, s, row.tasks, row.commits_or_clusters, 'P=' + row.primary, '+-' + row.primary_se, 'r2k=' + row.r2000, 'r4k=' + row.r4000, 'r16k=' + row.r16000, 'tok=' + row.median_tokens_8000, 'empty=' + row.empty_answers, 'miss=' + row.missing_refs].join(' '));
}
fs.writeFileSync(path.join(OUT, 'scores.json'), JSON.stringify({ written_at: new Date().toISOString(), scorer: 'build/arms/common/score.js, rule content', refs: 'build/sealed/grader/heldout/refs_heldout.jsonl', cluster_rule: 'commit for T1, T1x, T2; fix commit for T4; the task for T3', comparator_rows_equal_finished_test: mismatches.length === 0, comparator_mismatches: mismatches, rows }, null, 1));
fs.writeFileSync(path.join(OUT, 'clusters.jsonl'), clusters.map((x) => JSON.stringify(x)).join('\n') + '\n');
fs.writeFileSync(path.join(OUT, 'tasks.jsonl.gz'), zlib.gzipSync(per.map((x) => JSON.stringify(x)).join('\n') + '\n'));
console.log('comparator mismatches against the finished test:', mismatches.length, JSON.stringify(mismatches.slice(0, 5)));
