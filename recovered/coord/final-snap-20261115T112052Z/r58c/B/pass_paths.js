'use strict';
// r58c/B/pass_paths.js (agent B, round 8, C8): every path the ruling-58/83 guard opens INSIDE a real step's container
// must lie under one of that container's mounts. selectB.r58_guard (train/selectB.py) reads, from the RUNLOG, the LAST
// line-start `sha256 <hex> <role> <path>` per role (SR-6) and the last `PASS <role> <log>` and
// `PASS assemble-checks <log> ...` lines, then opens <root>/<path> and <root>/<log>. The guard runs in ktest-r1
// (selectB), ktest-r2 (report) and ktest-r3 (item27) with root /w. A PASS log under r58c/A/logs, which none of them
// mounts, makes steps 4 and 6 exit 3 (final-reread SR-2, LO-2); 2d therefore copies agent A's role logs unchanged into
// r58c/B/out/logs/ (mounted read-only in all three) and the PASS lines name those copies.
// The RUNLOG regexes are selectB.py's (train/selectB.py:101-106, anchored at the line start since round 8).
// usage: node r58c/B/pass_paths.js [--runlog <lane-relative RUNLOG, default train/RUNLOG.md>] [--mounts <mounts file>]
//        exit 0 every path under a mount of r1, r2 and r3 (and the file present in the lane); 1 otherwise; 2 usage.
const fs = require('fs'), path = require('path');
const W = process.env.PP_LANE || 'C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings';
const ROLES = ['item27', 'heldout-driver', 'item24-adapter', 'leak-audit', 'selectB', 'report'];  // selectB.R58_ROLES
const STEPS = ['ktest-r1', 'ktest-r2', 'ktest-r3'];
const a = process.argv.slice(2); const opt = (k, d) => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : d; };
const runlog = opt('--runlog', 'train/RUNLOG.md'), mf = opt('--mounts', path.join(W, 'r58c/B/mounts-B.json'));
if (a.some((x, i) => x.startsWith('--') && !['--runlog', '--mounts'].includes(x)) ) { console.error('usage: node pass_paths.js [--runlog R] [--mounts M]'); process.exit(2); }
const rl = path.isAbsolute(runlog) ? runlog : path.join(W, runlog);
if (!fs.existsSync(rl)) { console.error('pass_paths: ' + rl + ' missing'); process.exit(2); }
const J = JSON.parse(fs.readFileSync(mf, 'utf8'));
const R = ROLES.join('|').replace(/-/g, '\\-');
const SHA = new RegExp('^\\s*sha256\\s+([0-9a-f]{64})\\s+(' + R + ')\\s+(\\S+)'), PASS = new RegExp('^\\s*PASS\\s+(' + R + ')\\s+(\\S+)\\s*$'),
  AC = /^\s*PASS\s+assemble-checks\s+(\S+)(?:\s+tables_digest\s+([0-9a-f]{64}))?\s*$/;
const seen = {}, passed = {};
fs.readFileSync(rl, 'utf8').split('\n').forEach((l0) => { const l = l0.replace(/\r$/, ''); let m;
  if ((m = l.match(SHA))) seen[m[2]] = m[3];
  if ((m = l.match(PASS))) passed[m[1]] = m[2];
  if ((m = l.match(AC))) passed['assemble-checks'] = m[1]; });
const want = [];
for (const r of ROLES) { want.push([r + ' sha256 line', seen[r]]); want.push([r + ' PASS log', passed[r]]); }
want.push(['assemble-checks PASS log', passed['assemble-checks']]);
let bad = 0;
const under = (p, allow) => allow.some((m) => p === m.dst || p.startsWith(m.dst.replace(/\/$/, '') + '/'));
console.log('pass_paths: RUNLOG ' + runlog + '; mounts ' + path.basename(mf) + '; steps ' + STEPS.join(', '));
for (const [what, rel] of want) {
  if (!rel) { bad++; console.log('MISSING  ' + what + ': no line'); continue; }
  const p = '/w/' + rel.replace(/^\.?\//, ''); const miss = STEPS.filter((s) => !J[s] || !under(p, J[s].allow));
  const here = fs.existsSync(path.join(W, rel));
  if (miss.length || !here) bad++;
  console.log((miss.length || !here ? 'OUTSIDE  ' : 'ok       ') + what + ': ' + rel + (here ? '' : ' (not in the lane)') + (miss.length ? ' (not under a mount of ' + miss.join(', ') + ')' : ''));
}
console.log('RESULT ' + (bad ? 'FAIL' : 'PASS') + ' pass-paths (' + want.length + ' paths, ' + bad + ' outside or missing)');
process.exit(bad ? 1 : 0);
