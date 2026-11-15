'use strict';
// Preflight check 8: compare the re-run TUNE answers with the stored ones. Every field is compared
// except ms and engine_ms (wall times) and config_name (written by sweep.js only); `meta` differences are counted separately. The reference arm's
// 95e990307da3b42b has no stored TUNE file, so it is compared with the relational arm's (as the lock
// lane did). TQ: every field except ms. Tasks whose parent tree in the volume's source store was first
// written by the removed-document run (check 4) are listed apart (see NOTES, source-store defect).
// usage: node compare_regress.js <build> <out.json> [poisoned parents comma list]
const fs = require('fs'); const path = require('path'); const zlib = require('zlib');
const B = process.argv[2]; const D = path.join(B, 'audit', 'preflight', 'r2', process.env.SUB || 'regress');
const poisoned = new Set((process.argv[4] || '').split(',').filter(Boolean));
const rd = (f) => zlib.gunzipSync(fs.readFileSync(f)).toString('utf8').split('\n').filter(Boolean).map(JSON.parse);
const strip = (r, meta) => { const o = { ...r }; delete o.ms; delete o.engine_ms; delete o.config_name; if (!meta) delete o.meta; return JSON.stringify(o); };
const runs = ['relational:95e990307da3b42b', 'reference:95e990307da3b42b', 'ladybug:95e990307da3b42b', 'duckpgq:95e990307da3b42b',
  'relational:6b70cc1222745385', 'reference:6b70cc1222745385', 'ladybug:6b70cc1222745385', 'duckpgq:6b70cc1222745385',
  'ladybug:f233ae069bdba0ce', 'search:e70177e5807f0252', 'search:950c029615d337c1', 'floor-dir:714a474060653c1f', 'floor-co:c4d2f0a60a3d199c'];
const res = { runs: {}, tq: {} };
for (const x of runs) {
  const [arm, h] = x.split(':');
  const fresh = rd(path.join(D, 'ans', arm + '_' + h, arm, 'tune', h + '.' + (process.env.SET || 'T1') + '.jsonl.gz'));
  const sa = arm === 'reference' && h === '95e990307da3b42b' ? 'relational' : arm;
  const stored = new Map(rd(path.join(B, 'results', sa, 'tune', h + '.' + (process.env.SET || 'T1') + '.jsonl.gz')).map((r) => [r.id, r]));
  let same = 0; let metaSame = 0; const diff = []; const diffMetaOnly = [];
  for (const r of fresh) {
    const s = stored.get(r.id); if (!s) { diff.push(r.id + ':missing'); continue; }
    const a = { ...r, arm: sa }; // the arm field names the arm that wrote it
    if (strip(a, false) === strip(s, false)) { same++; if (strip(a, true) === strip(s, true)) metaSame++; else diffMetaOnly.push(r.id); } else diff.push(r.id + (poisoned.has(r.parent.slice(0, 10)) ? ' (poisoned parent ' + r.parent.slice(0, 10) + ')' : ''));
  }
  res.runs[x] = { tasks: fresh.length, identical_without_meta: same, identical_with_meta: metaSame, differing: diff, meta_only_differences: diffMetaOnly.length };
}
for (const a of fs.existsSync(path.join(D, 'tq')) ? ['relational', 'ladybug', 'duckpgq', 'search'] : []) {
  const f = path.join(D, 'tq', 'tq', a + '.tune.answers.jsonl');
  const fresh = fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map(JSON.parse);
  const stored = new Map(fs.readFileSync(path.join(B, 'results', 'tq', a + '.tune.answers.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => { const o = JSON.parse(l); return [o.id, o]; }));
  let same = 0; const diff = [];
  for (const r of fresh) { const s = stored.get(r.id); const x = { ...r }; delete x.ms; const y = s ? { ...s } : null; if (y) delete y.ms; if (y && JSON.stringify(x) === JSON.stringify(y)) same++; else diff.push(r.id); }
  res.tq[a] = { questions: fresh.length, identical: same, differing: diff };
}
fs.writeFileSync(process.argv[3], JSON.stringify(res, null, 1));
for (const [k, v] of Object.entries(res.runs)) console.log(k, v.tasks, 'same', v.identical_without_meta, 'same+meta', v.identical_with_meta, 'diff', JSON.stringify(v.differing));
for (const [k, v] of Object.entries(res.tq)) console.log('tq', k, v.questions, 'same', v.identical, 'diff', JSON.stringify(v.differing));
