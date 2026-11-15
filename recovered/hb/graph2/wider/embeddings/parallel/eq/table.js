// Ruling 69 (ii) / 68 equality table from parallel/eq/eq.jsonl (rerun_unit.py records). node table.js [eq.jsonl]
// Per config: run 1 vs run 2, byte-identity of the loss list, every representation tensor (path by path), both score
// tables (gunzipped bytes) and the counts. "hash" below = sha256 over the reps tensor map (reps_sha256); the loss,
// table and count hashes are compared too. Writes parallel/eq/equality.json.
const fs = require('fs'), path = require('path');
const f = process.argv[2] || path.join(__dirname, 'eq.jsonl');
const recs = fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
const by = {}; for (const r of recs) if (r.tag) by[r.tag] = r;
const rows = [];
for (const c of ['c12', 'c13', 'c16']) {
  const a = by[c + '_r1'], b = by[c + '_r2'];
  if (!a || !b || a.status !== 'done' || b.status !== 'done') { rows.push({ config: c, error: [a && (a.status + ' ' + (a.error || '')), b && (b.status + ' ' + (b.error || ''))] }); continue; }
  const tens = Object.keys(a.reps_tensors).length === Object.keys(b.reps_tensors).length &&
    Object.keys(a.reps_tensors).every(k => JSON.stringify(a.reps_tensors[k]) === JSON.stringify(b.reps_tensors[k]));
  const parts = {
    losses: a.losses_sha256 === b.losses_sha256 && JSON.stringify(a.losses) === JSON.stringify(b.losses),
    reps_tensors: tens && a.reps_sha256 === b.reps_sha256,
    pool: a.tables_sha256.pool === b.tables_sha256.pool, unrestricted: a.tables_sha256.unrestricted === b.tables_sha256.unrestricted,
    counts: a.counts_sha256 === b.counts_sha256,
  };
  let first = null; for (let i = 0; i < Math.min(a.losses.length, b.losses.length); i++) if (a.losses[i] !== b.losses[i]) { first = i + 1; break; }
  rows.push({ config: c, unit: a.unit, epochs: a.epochs, det: [a.det_flag, b.det_flag], cublas: [a.cublas_ws, b.cublas_ws],
    run1_reps_sha256: a.reps_sha256, run2_reps_sha256: b.reps_sha256, run1_losses_sha256: a.losses_sha256, run2_losses_sha256: b.losses_sha256,
    tables: [a.tables_sha256, b.tables_sha256], counts: [a.counts_sha256, b.counts_sha256], rows: a.rows, tasks: a.tasks,
    equal: Object.values(parts).every(Boolean), parts, first_loss_difference_epoch: first,
    s_per_epoch: [a.s_per_epoch, b.s_per_epoch].map(x => +x.toFixed(4)), wall_s_train: [a.wall_s_train, b.wall_s_train].map(x => +x.toFixed(1)),
    peak_rss_mb: [a.peak_rss_mb, b.peak_rss_mb].map(x => +x.toFixed(0)), peak_cuda_alloc_mb: [a.peak_cuda_alloc_mb, b.peak_cuda_alloc_mb].map(x => x && +x.toFixed(0)) });
}
const small = by['c12_smallest_untrained'];
const out = { source: f, rows, smallest_checkpoint: small ? { unit: small.unit, status: small.status, note: small.note } : null,
  all_equal: rows.every(r => r.equal === true) };
fs.writeFileSync(path.join(path.dirname(f), 'equality.json'), JSON.stringify(out, null, 1));
for (const r of rows) console.log([r.config, (r.run1_reps_sha256 || '').slice(0, 16), (r.run2_reps_sha256 || '').slice(0, 16), r.equal ? 'yes' : 'NO',
  JSON.stringify(r.parts || r.error), r.s_per_epoch && r.s_per_epoch.join(' / ')].join('\t'));
console.log('all_equal', out.all_equal, 'smallest', JSON.stringify(out.smallest_checkpoint));
