'use strict';
// Stage 2: score one arm's stage-2 (copy of stage1/score_arm.js; only the list stage differs) TUNE answer files with arms/common/score.js (rule content) against
// the TUNE lines of sealed/references.jsonl (sealed/grader/refs_tune.jsonl), keeping everything:
//   <arm>.summary.json   one entry per (configuration, set): score.js summary + name + engine/lookup medians
//   <arm>.clusters.jsonl per-cluster (commit) values of every metric
//   <arm>.tasks.jsonl.gz per-task values
//   node score_arm.js <arm>
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const B = path.resolve(__dirname, '..', '..', '..');
const S = require(path.join(B, 'arms', 'common', 'score'));
const H = require(path.join(B, 'arms', 'common', 'harness'));
const arm = process.argv[2];
const refsFile = path.join(__dirname, '..', 'refs_tune.jsonl');
const refs = S.readRefs(refsFile);
for (const r of refs.values()) if (r.split !== 'tune') throw new Error('non-tune reference in ' + refsFile);
const L = H.loadArmList(arm, 2, false);
const SETS = ['T1', 'T1x', 'T2'];
const median = S.median;
const summary = []; const clusters = []; const per = [];
for (const x of L.list) for (const s of SETS) {
  const f = path.join(B, 'results', arm, 'tune', x.hash + '.' + s + '.jsonl.gz');
  const res = S.scoreFile(f, refs, { rule: 'content' });
  if (res.length !== 1) throw new Error(f + ': ' + res.length + ' groups');
  const g = res[0];
  const answers = H.readGzJsonl(f);
  const eng = answers.map((a) => a.engine_ms).filter((v) => v != null);
  const wall = answers.map((a) => a.ms).filter((v) => v != null);
  const key = { arm, name: x.name, config_hash: x.hash, set: s };
  for (const r of g._rows) clusters.push({ ...key, ...r });
  for (const t of g._per) per.push({ ...key, ...t });
  delete g._rows; delete g._per;
  summary.push({ ...key, cfg: x.cfg, ...g, config_name: x.name,
    engine_ms_median: median(eng), engine_ms_n: eng.length, wall_ms_median: median(wall),
    lookups_median: median(answers.map((a) => a.lookups)), lookups_head_median: median(answers.map((a) => a.lookups_head)),
    tokens_read_median: median(answers.map((a) => (a.meta && a.meta.tokens_read != null ? a.meta.tokens_read : null)).filter((v) => v != null)) });
}
fs.writeFileSync(path.join(__dirname, arm + '.summary.json'), JSON.stringify(summary, null, 1));
fs.writeFileSync(path.join(__dirname, arm + '.clusters.jsonl'), clusters.map((x) => JSON.stringify(x)).join('\n') + '\n');
fs.writeFileSync(path.join(__dirname, arm + '.tasks.jsonl.gz'), zlib.gzipSync(per.map((x) => JSON.stringify(x)).join('\n') + '\n'));
console.log(arm + ': ' + summary.length + ' (configuration, set) groups, ' + per.length + ' task scores, missing refs ' + summary.reduce((a, g) => a + g.missing_refs, 0) + ', zero-unit refs ' + summary.reduce((a, g) => a + g.zero_unit_refs, 0));
