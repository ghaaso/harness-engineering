'use strict';
// Coordinator's delta of the lane's code against the 09:24:35Z copy. It only reads the lane.
// (A shell version lost lines: appending to a file in a loop fails now and then on this machine with
// "Device or resource busy". This one builds everything in memory and writes each file once, with retries.)
// usage: node delta.js   -> writes coord/delta-<UTC>/ : SUMMARY.txt, CHANGED.tsv, NEW.tsv, REMOVED.txt, diff/*.diff, new/<copies>
const fs = require('fs'), path = require('path'), crypto = require('crypto'), cp = require('child_process');
const COORD = __dirname;
const SNAP = path.resolve(process.argv[2] || path.join(COORD, 'snap-20261115T092435Z'));  // the base copy; argument: another copy folder
const LANE = 'C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings';
const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
const OUT = path.join(COORD, 'delta-' + stamp);
const retry = (fn) => { let e; for (let i = 0; i < 20; i++) { try { return fn(); } catch (err) { e = err; if (!/EBUSY|EPERM|EACCES/.test(String(err.code))) throw err; Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 150); } } throw e; };
const write = (f, s) => retry(() => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, s); });
const read = (f) => retry(() => fs.readFileSync(f));
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const ls = (dir, re, deep) => { const d = path.join(LANE, dir); if (!fs.existsSync(d)) return []; return fs.readdirSync(d, { withFileTypes: true }).filter((e) => e.isFile() && re.test(e.name)).map((e) => dir + '/' + e.name); };
// the same selection as the snapshot's FILES.txt
const live = new Set([
  ...ls('orchestrator', /\.(sh|js|py|md)$/), ...ls('train', /\.(py|js|sh|md)$/),
  ...ls('r58c/A', /(\.(py|sh|js|json|md)$|^READY-)/), ...ls('r58c/B', /(\.(py|sh|js|json|md)$|^READY-)/),
  ...['r58c/B/tests', 'r58c/B/eor', 'r58c/B/rerun', 'r58c/B/rehearsal', 'r58c/B/frozen', 'r58c/B/timing', 'r58c/tests', 'train/r58/tests', 'fixes/tests'].flatMap((d) => ls(d, /./)),
  ...ls('r58c', /\.(py|txt|md)$/),
]);
const snap = new Set(fs.readFileSync(path.join(SNAP, 'FILES.txt'), 'utf8').split('\n').map((s) => s.trim()).filter(Boolean));
const changed = [], same = [], removed = [], added = [];
fs.mkdirSync(path.join(OUT, 'diff'), { recursive: true }); fs.mkdirSync(path.join(OUT, 'new'), { recursive: true });  // also when nothing changed
for (const f of [...snap].sort()) {
  if (!live.has(f)) { removed.push(f); continue; }
  const a = read(path.join(SNAP, f)), b = read(path.join(LANE, f));
  if (a.equals(b)) { same.push(f); continue; }
  const r = cp.spawnSync('diff', ['-u', path.join(SNAP, f), path.join(LANE, f)], { encoding: 'utf8', maxBuffer: 1 << 28 });
  const d = r.stdout || ''; const lines = d.split('\n');
  const add = lines.filter((l) => /^\+(?!\+\+ )/.test(l)).length, del = lines.filter((l) => /^-(?!-- )/.test(l)).length;
  write(path.join(OUT, 'diff', f.replace(/\//g, '_') + '.diff'), d);
  changed.push([f, '+' + add, '-' + del, sha(b), sha(a)]);
}
for (const f of [...live].sort()) if (!snap.has(f)) { const b = read(path.join(LANE, f)); write(path.join(OUT, 'new', f), b); added.push([f, b.toString('utf8').split('\n').length - 1 + ' lines', sha(b)]); }
write(path.join(OUT, 'CHANGED.tsv'), changed.map((r) => r.join('\t')).join('\n') + '\n');
write(path.join(OUT, 'NEW.tsv'), added.map((r) => r.join('\t')).join('\n') + '\n');
write(path.join(OUT, 'REMOVED.txt'), removed.join('\n') + '\n');
const sum = ['delta against ' + SNAP + ' at ' + new Date().toISOString(),
  'snapshot files ' + snap.size + ': unchanged ' + same.length + ', changed ' + changed.length + ', removed ' + removed.length + '; new ' + added.length,
  '--- changed (path, added, removed, sha256 now, sha256 in the copy)', ...changed.map((r) => r.join('\t')), '--- new (path, lines, sha256)', ...added.map((r) => r.join('\t')), '--- removed', ...removed];
write(path.join(OUT, 'SUMMARY.txt'), sum.join('\n') + '\n');
// self-check: read the lists back and compare the counts with what was computed
const back = fs.readFileSync(path.join(OUT, 'CHANGED.tsv'), 'utf8').split('\n').filter(Boolean).length;
const diffs = fs.readdirSync(path.join(OUT, 'diff')).length;
if (back !== changed.length || diffs !== changed.length || same.length + changed.length + removed.length !== snap.size) { console.error('DELTA SELF-CHECK FAILED', back, diffs, changed.length); process.exit(1); }
console.log(OUT.replace(/\\/g, '/'));
console.log(sum[1]);
