'use strict';
// r58c/B/mounts.js (agent B, round r58c, ruling 94(d)): the ONE reader of a mounts file, r58c/B/mounts-B.json for the
// lane's launchers (lane_step.sh: ktest-r1..r10; rerun_check.sh: kge-R1). Shape (coordinator, ruling 94):
//   {"<container name>": {"step": "<id>", "allow": [{"src": "<host path>", "dst": "<container path>", "mode": "ro|rw"}]}}
// A src may hold the token <STAMP> (kge-R1's scratch folder r58c/B/rerun-out/<STAMP>), replaced by the launcher's stamp
// (form 20261114T190928Z). Keys starting with "_" are comments.
// usage: node mounts.js flags <mounts.json> <name> [<stamp>]  -> one line of `-v src:dst[:ro]` flags, in file order;
//                                                             every ro source is checked, then every rw folder created
//        node mounts.js check <mounts.json>                   -> "ok <n> containers" or the problems
// Exit: 0; 2 usage, a broken file, an unknown name or a rule broken; 3 a read-only source missing (nothing is
// started on a mount that would come up empty: docker would create an empty folder in its place).
// Rules (checked by both commands for the whole file): src absolute (drive letter form X:/...), dst absolute, neither
// holds `..`, ":" only as the drive's; mode ro or rw; no dst twice in one container; a rw dst never at or under
// /w/train/stageB, /w/export or /build, and never the whole /w or /repo; a <STAMP> src only for rw.
const fs = require('fs');
const path = require('path');
const [cmd, file, name, stamp] = process.argv.slice(2);
const die = (c, m) => { console.error('mounts.js: ' + m); process.exit(c); };
if (!['flags', 'check'].includes(cmd) || !file || (cmd === 'flags' && !name)) die(2, 'usage: node mounts.js flags FILE NAME [STAMP] | check FILE');
let J;
try { J = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { die(2, 'cannot read ' + file + ': ' + e.message); }
const under = (p, root) => p === root || p.startsWith(root + '/');
function problems(J) {
  const bad = [];
  if (!J || typeof J !== 'object' || Array.isArray(J)) return ['the file is not an object'];
  for (const [k, v] of Object.entries(J)) {
    if (k.startsWith('_')) continue;
    if (!/^(ktest-r[0-9]+|kge-[A-Z][A-Z0-9]*)$/.test(k)) bad.push(k + ': not a ktest-r<N> or kge-<X> name');
    if (!v || typeof v.step !== 'string' || !v.step) { bad.push(k + ': no step'); continue; }
    if (!Array.isArray(v.allow) || !v.allow.length) { bad.push(k + ': no allow list'); continue; }
    const seen = new Set();
    for (const m of v.allow) {
      const id = k + ' ' + JSON.stringify(m);
      if (!m || typeof m.src !== 'string' || typeof m.dst !== 'string') { bad.push(id + ': src and dst must be strings'); continue; }
      if (!/^[A-Za-z]:\/[^:]*$/.test(m.src)) bad.push(id + ': src is not an absolute X:/ path');
      if (!/^\/[^:]*$/.test(m.dst)) bad.push(id + ': dst is not an absolute container path');
      if ((m.src + '/' + m.dst).split('/').includes('..')) bad.push(id + ': ".." is refused');
      if (m.mode !== 'ro' && m.mode !== 'rw') bad.push(id + ': mode must be ro or rw');
      if (seen.has(m.dst)) bad.push(id + ': dst twice'); seen.add(m.dst);
      if (m.mode === 'rw' && (under(m.dst, '/w/train/stageB') || under(m.dst, '/w/export') || under(m.dst, '/build') || m.dst === '/w' || m.dst === '/repo'))
        bad.push(id + ': a writable mount there is refused');
      if (m.src.includes('<STAMP>') && m.mode !== 'rw') bad.push(id + ': <STAMP> only in a writable src');
    }
  }
  return bad;
}
const bad = problems(J);
if (bad.length) die(2, bad.join('; '));
if (cmd === 'check') { console.log('ok ' + Object.keys(J).filter((k) => !k.startsWith('_')).length + ' containers'); process.exit(0); }
const E = J[name];
if (!E || name.startsWith('_')) die(2, name + ' has no entry in ' + file);
for (const m of E.allow) if (m.mode === 'ro' && !fs.existsSync(m.src)) die(3, name + ': read-only source ' + m.src + ' is missing');
const out = [];  // every read-only source is checked above before any writable folder is created
for (const m of E.allow) {
  let src = m.src;
  if (src.includes('<STAMP>')) {
    if (!/^[0-9]{8}T[0-9]{6}Z$/.test(stamp || '')) die(2, name + ': ' + m.src + ' needs a stamp of the form 20261114T190928Z');
    src = src.split('<STAMP>').join(stamp);
  }
  if (m.mode === 'rw') {
    try { fs.mkdirSync(src, { recursive: true }); } catch (e) { die(3, 'cannot create ' + src + ': ' + e.message); }
    if (!fs.statSync(src).isDirectory()) die(3, src + ' (rw) is not a folder');
  } else if (!fs.existsSync(src)) die(3, name + ': read-only source ' + src + ' is missing');
  out.push('-v ' + src + ':' + m.dst + (m.mode === 'ro' ? ':ro' : ''));
}
console.log(out.join(' '));
