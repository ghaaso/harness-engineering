// Agent A, r58c round 7 (the coordinator's point 1): r58c/A/sums.js's log filter skips ktest copies named <test>.a<N>-<x>.log.
// Names only (no log is opened): the current bytes (node sums.js keep ...) skip test_probe.a11-fail.log and
// test_probe.a18-fail.log and keep test_probe.log; the r96 bytes' pattern /.ad+-/ (r58c/A/pre/sums_r97.js, read as text
// here, not run) keeps both (fail before). Then the current filter over the real logs/ listing keeps no *.a<N>-* name.
// usage: node r58c/A/test_sums_filter.js   -> RESULT PASS|FAIL sums-filter
const fs = require('fs'), path = require('path'), cp = require('child_process'), crypto = require('crypto');
const A = __dirname;
for (const f of ['sums.js', 'pre/sums_r97.js']) console.log('sha256 ' + crypto.createHash('sha256').update(fs.readFileSync(path.join(A, f))).digest('hex') + ' r58c/A/' + f);
const names = ['test_probe.a11-fail.log', 'test_probe.a18-fail.log', 'test_probe.log', 'test_heldout.a7-x.log'];
const cur = cp.execFileSync('node', [path.join(A, 'sums.js'), 'keep', ...names], { encoding: 'utf8' }).trim().split(/\r?\n/);
const old = fs.readFileSync(path.join(A, 'pre', 'sums_r97.js'), 'utf8');
const m = /!\/(\.ad\+-)\/\.test\(f\)/.exec(old);
const oldRe = m ? new RegExp(m[1]) : null;
const oldKeep = names.map((f) => (oldRe && !oldRe.test(f) ? 'keep ' : 'skip ') + f);
console.log('current: ' + cur.join(', '));
console.log('r96 pattern ' + (m ? '/' + m[1] + '/' : 'NOT FOUND') + ': ' + oldKeep.join(', '));
const listing = fs.readdirSync(path.join(A, 'logs'));
const kept = cp.execFileSync('node', [path.join(A, 'sums.js'), 'keep', ...listing], { encoding: 'utf8' }).trim().split(/\r?\n/).filter((l) => l.startsWith('keep '));
const keptCopies = kept.filter((l) => /\.a\d+-/.test(l));
console.log('logs/: ' + listing.length + ' names, ' + kept.length + ' kept, kept ktest copies (.a<N>-): ' + keptCopies.length);
const ok = cur.join('|') === 'skip test_probe.a11-fail.log|skip test_probe.a18-fail.log|keep test_probe.log|skip test_heldout.a7-x.log'
  && oldRe && oldKeep[0].startsWith('keep') && oldKeep[1].startsWith('keep') && keptCopies.length === 0;
console.log('RESULT ' + (ok ? 'PASS' : 'FAIL') + ' sums-filter');
process.exit(ok ? 0 : 1);
