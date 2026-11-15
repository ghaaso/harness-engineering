'use strict';
// Ruling 94 (b, d): agent A's launchers (train/heldout.sh for kge-H1, kge-H1P, kge-H1R and their card checks) build
// their docker -v flags from ONE file, r58c/A/mounts-A.json: {"<container>": {"step": "<id>", "allow": [{"src", "dst",
// "mode": "ro|rw"}]}} ("{ARM}" = the rehearsal's arm). leak_audit.py reads the same file and every saved record.
// usage: node r58c/A/mounts.js flags <container> [ARM]   -> the -v flags on one line (exit 2: unknown container or
//                                                          a bad entry; exit 3: {ARM} needed and not given)
//        node r58c/A/mounts.js check [FILE]              -> exit 0 when every entry has src, dst, mode ro|rw and a step
const fs = require('fs');
const path = require('path');
const FILE = path.join(__dirname, 'mounts-A.json');

function load(f) { return JSON.parse(fs.readFileSync(f || FILE, 'utf8')); }
function bad(c, v) {
  if (!v || typeof v !== 'object' || !v.step || !Array.isArray(v.allow)) return c + ': needs a step and an allow list';
  for (const e of v.allow) {
    if (!e || !e.src || !e.dst || !['ro', 'rw'].includes(e.mode)) return c + ': an allow entry needs src, dst and mode ro|rw';
    if (/\s|:(?!\/)/.test(e.src.slice(2)) || /\s|:/.test(e.dst)) return c + ': a path holds a space or a colon: ' + e.src + ' ' + e.dst;
  }
  return null;
}
const [cmd, a1, a2] = process.argv.slice(2);
if (cmd === 'flags') {
  const j = load(); const v = j[a1];
  if (!v) { console.error('mounts.js: no container ' + a1 + ' in ' + FILE); process.exit(2); }
  const b = bad(a1, v); if (b) { console.error('mounts.js: ' + b); process.exit(2); }
  const out = [];
  for (const e of v.allow) {
    let s = e.src, d = e.dst;
    if ((s + d).includes('{ARM}')) {
      if (!a2 || !/^[A-Za-z0-9_]+$/.test(a2)) { console.error('mounts.js: ' + a1 + ' needs an ARM'); process.exit(3); }
      s = s.split('{ARM}').join(a2); d = d.split('{ARM}').join(a2);
    }
    out.push('-v ' + s + ':' + d + (e.mode === 'ro' ? ':ro' : ''));
  }
  console.log(out.join(' '));
} else if (cmd === 'check') {
  const j = load(a1); const probs = Object.keys(j).map((c) => bad(c, j[c])).filter(Boolean);
  if (probs.length) { console.log(probs.join('\n')); process.exit(1); }
  console.log('mounts.js: ' + Object.keys(j).length + ' containers, ' + Object.values(j).reduce((n, v) => n + v.allow.length, 0) + ' mounts, shape ok');
} else { console.error('usage: node mounts.js flags <container> [ARM] | check [FILE]'); process.exit(2); }
