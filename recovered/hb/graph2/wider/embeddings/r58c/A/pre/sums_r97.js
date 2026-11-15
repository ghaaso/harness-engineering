// Agent A, r58c: sha256 of every file A changed or added (against r58c/A/pre where a before copy exists), and the
// RESULT line of each test log. Run from the host: node r58c/A/sums.js
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const L = path.resolve(__dirname, '..', '..');
const sha = p => fs.existsSync(p) ? crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex') : 'MISSING';
const owned = ['train/HANDOFF-FORMAT.md', 'train/answer_level.py', 'train/answer_level.js', 'train/heldout.py', 'train/heldout.sh',
  'train/heldout_inputs.js', 'train/leak_audit.py', 'train/r58/tests/test_heldout.py', 'train/r58/tests/test_heldout_e4.py',
  'train/r58/tests/hotest.py', 'train/r58/tests/test_probe.py', 'train/r58/tests/test_leak_audit.py', 'train/r58/tests/test_answer_level.py'];
const preOf = r => path.join(L, 'r58c', 'A', 'pre', r.startsWith('train/r58/tests/') ? 'tests/' + path.basename(r) : path.basename(r));
for (const r of owned) {
  const now = sha(path.join(L, r)), before = sha(preOf(r));
  console.log(now + '  ' + r + (before === now ? '  (unchanged)' : '  (before ' + before.slice(0, 12) + ')'));
}
for (const r of ['r58c/A/mounts-A.json', 'r58c/A/mounts.js', 'r58c/A/time_tune.py', 'r58c/A/test_tune_staging.sh', 'r58c/A/test_rehearse_stop.sh',
  'r58c/A/test_heldout_mounts.sh', 'r58c/A/test_kt_inner.sh', 'r58c/A/tune_late50.py', 'r58c/A/RUNLOG-A.md', 'r58c/handoff-test/tune/HANDOFF.json', 'r58c/handoff-test/heldout/HANDOFF.json',
  'r58c/A/ktest.sh', 'r58c/A/kt_inner.sh', 'r58c/A/build_handoffs.py', 'r58c/A/precheck_handoff.py', 'r58c/A/rehearsal.py', 'r58c/A/rehearse.sh',
  'r58c/A/write_ready.js', 'r58c/A/test_ktest_race.sh', 'r58c/A/precheck_r96_check.py', 'r58c/A/FAKESEL-READY', 'r58c/A/out/fakesel.manifest',
  'r58c/handoff-test/tune-late50/HANDOFF.json', 'r58c/A/out/ho_rec/item27.json', 'r58c/A/ROUND3-DONE', 'r58c/A/ROUND3-BLOCKED', 'r58c/A/test_precheck_seed.py', 'r58c/A/precheck_three.py', 'r58c/A/ROUND4-DONE', 'r58c/A/ROUND5-DONE', 'r58c/A/STATE-after-reset.md', 'r58c/A/TEST-QUEUE.md', 'r58c/A/sums.js', 'r58c/A/fixtures/pstage.sha256', 'r58c/READY-format'])
  console.log(sha(path.join(L, r)) + '  ' + r + '  (new)');
// ROUND6 (rulings 96, 97): changed files against their r96 before copies, and the new files
for (const [r, b] of [['train/heldout.py', 'heldout_r96.py'], ['train/r58/tests/test_probe.py', 'tests/test_probe_r96.py'], ['r58c/A/rehearsal.py', 'rehearsal_r96.py'],
  ['r58c/A/rehearse.sh', 'rehearse_r96.sh'], ['r58c/A/sums.js', 'sums_r96.js']])
  console.log(sha(path.join(L, r)) + '  ' + r + '  (round 6; before ' + sha(path.join(L, 'r58c', 'A', 'pre', b)).slice(0, 12) + ' = r58c/A/pre/' + b + ')');
for (const r of ['r58c/A/inject_kinds.py', 'r58c/A/test_inject_kinds.py', 'r58c/A/inject_case.py', 'r58c/A/inject_standin.py', 'r58c/A/standin_chain.sh',
  'r58c/A/test_probe_r97.py', 'r58c/A/staging_blobs.js', 'r58c/A/test_staging_blobs.sh', 'r58c/A/test_rehearsal_negative.py', 'r58c/A/test_rehearsal_inj.py',
  'r58c/A/test_rehearse_inj.sh', 'r58c/A/ROUND6-DONE', 'r58c/A/ROUND6-BLOCKED'])
  console.log(sha(path.join(L, r)) + '  ' + r + '  (round 6, new)');
const LG = path.join(L, 'r58c', 'A', 'logs');
for (const f of fs.readdirSync(LG).filter(f => /^(test_|build_|precheck_|time_tune|tune_late50|inject_)/.test(f) && !f.endsWith('.json') && !/.ad+-/.test(f)).sort()) {
  const t = fs.readFileSync(path.join(LG, f), 'utf8').split(/\r?\n/);
  const i = t.findIndex(x => x.startsWith('RESULT'));
  console.log((i < 0 ? 'NO RESULT' : t[i].slice(0, 40)) + '  r58c/A/logs/' + f + (i < 0 ? '' : ':' + (i + 1)));
}
