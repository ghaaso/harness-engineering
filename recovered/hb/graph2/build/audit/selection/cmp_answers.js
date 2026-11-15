'use strict';
// Compare packed answers (audit-selection lane, checks 4 and 5). The answer CONTENT is compared:
// every field except arm, ms, engine_ms and meta (timing and the arm's own query counters).
// Two modes:
//   node cmp_answers.js s2xc <build> <arm>   fresh <arm> answers vs fresh reference answers (spec
//        configurations) AND fresh <arm> answers vs the stored stage-2 answers in results/<arm>/tune
//   node cmp_answers.js repro <build> <arm>  three fresh builds (tmp/audit-selection/repro/<arm>/b1..b3)
//        vs each other and vs the stored answers
const fs = require('fs'); const path = require('path'); const zlib = require('zlib');
const [mode, Braw, arm] = process.argv.slice(2); const B = path.resolve(Braw);
const rd = (f) => zlib.gunzipSync(fs.readFileSync(f)).toString('utf8').split('\n').filter(Boolean).map(JSON.parse);
const strip = (r) => { const o = { ...r }; delete o.arm; delete o.ms; delete o.engine_ms; delete o.meta; delete o.config_name; /* sweep.js adds the name, run.js does not */ return JSON.stringify(o); };
const byId = (rows) => new Map(rows.map((r) => [r.id, r]));
function cmpDirs(a, b, onlyHashes) {
  const out = { files: 0, answers: 0, differ: 0, missing: 0, examples: [] };
  for (const f of fs.readdirSync(a).filter((x) => x.endsWith('.jsonl.gz'))) {
    if (onlyHashes && !onlyHashes.has(f.split('.')[0])) continue;
    const fb = path.join(b, f);
    const A = rd(path.join(a, f));
    if (!fs.existsSync(fb)) { out.missing += A.length; continue; }
    const M = byId(rd(fb)); out.files++;
    for (const r of A) { out.answers++; const s = M.get(r.id); if (!s) { out.missing++; continue; } if (strip(r) !== strip(s)) { out.differ++; if (out.examples.length < 3) out.examples.push({ file: f, id: r.id }); } }
  }
  return out;
}
const res = { mode, arm };
if (mode === 's2xc') {
  const root = path.join(B, 'tmp/audit-selection/s2xc', arm);
  const sum = JSON.parse(fs.readFileSync(path.join(root, 'sweep/summary.stage2.json'), 'utf8'));
  res.sweep_crosscheck = sum.crosscheck; res.tasks = sum.tasks; res.parents = sum.parents; res.wall_s = sum.wall_s;
  const refHashes = new Set(fs.readdirSync(path.join(root, 'reference/tune')).map((f) => f.split('.')[0]));
  res.spec_configs_run_on_reference = refHashes.size;
  res.arm_vs_reference = cmpDirs(path.join(root, arm, 'tune'), path.join(root, 'reference/tune'), refHashes);
  res.fresh_vs_stored_all20 = cmpDirs(path.join(root, arm, 'tune'), path.join(B, 'results', arm, 'tune'));
} else {
  const root = path.join(B, 'tmp/audit-selection/repro', arm);
  const d = (k) => path.join(root, 'b' + k, arm, 'tune');
  res.b1_vs_b2 = cmpDirs(d(1), d(2)); res.b1_vs_b3 = cmpDirs(d(1), d(3));
  res.b1_vs_stored = cmpDirs(d(1), path.join(B, 'results', arm, 'tune'));
  res.b2_vs_stored = cmpDirs(d(2), path.join(B, 'results', arm, 'tune'));
  res.b3_vs_stored = cmpDirs(d(3), path.join(B, 'results', arm, 'tune'));
  res.configs = fs.readdirSync(d(1));
}
console.log(JSON.stringify(res, null, 1));
