'use strict';
// r58c/B/record_check.js (agent B, round 8, change C28 (ii) of orchestrator/end-order-changes-3.md, from ruling 103(c)).
// The leak audit judges every saved mount record against the mount list AS FROZEN at step 3, so a record made under
// an earlier form of its entry would fail the audit after the held-out run. freeze_list.sh (step 3) therefore calls
// this before it lists anything: every saved record in r58c/mounts/ (<name>.json and every kept <name>.<UTC>.json;
// ktest-eor of step 1, kge-H1P and kge-H1Pc of 2a, kge-H1R and kge-H1Rc of 2b, kge-R1 of 2c, any other) is compared
// with the CURRENT entry of its container in r58c/A/mounts-A.json or r58c/B/mounts-B.json. The comparison is exact
// as a set: every mount of the record matches one row of the entry (source, destination and mode) and every row of
// the entry matches one mount of the record. A card check (empty list) therefore passes only with no mount at all.
// Paths compare as the leak audit's norm(): C:/ form (also from /c/... and /run/desktop/mnt/host/c/...), "/"
// separators, no trailing slash, case-folded; an entry's {ARM} matches [a-z0-9_]+ and <STAMP> a 20261114T190928Z stamp.
// Nothing is moved, renamed or deleted here: a mismatch is reported and the coordinator rules on the earlier record.
// usage: node record_check.js <records folder> <mounts-A.json> <mounts-B.json>
// Exit: 0 every record equals its current entry, or the folder does not exist ("ok 0 records"); 1 a record differs
// from its entry, has no entry, or does not read (each named on stdout); 2 usage or an unreadable mount file.
const fs = require('fs');
const path = require('path');
const [dir, fa, fb] = process.argv.slice(2);
if (!fb) { console.error('usage: node record_check.js <records folder> <mounts-A.json> <mounts-B.json>'); process.exit(2); }
const entries = {};
for (const f of [fa, fb]) {
  let j; try { j = JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { console.error('record_check: cannot read ' + f + ': ' + e.message); process.exit(2); }
  for (const [k, v] of Object.entries(j)) if (!k.startsWith('_')) entries[k] = { allow: (v && v.allow) || [], file: path.basename(f) };
}
const hostNorm = (s) => { s = s.replace(/\\/g, '/'); const m = /^(?:\/run\/desktop\/mnt\/host)?\/([a-zA-Z])\/(.*)$/.exec(s); return m && !/^[A-Za-z]:\//.test(s) ? m[1].toUpperCase() + ':/' + m[2] : s; };
const norm = (s) => path.posix.normalize(hostNorm(s)).replace(/\/+$/, '').toLowerCase();
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const pat = (s, fold) => {
  let t = s.split('{ARM}').join('\u0001').split('<STAMP>').join('\u0002');
  t = fold ? norm(t) : t.replace(/\/+$/, '');
  return new RegExp('^' + esc(t).split('\u0001').join(fold ? '[a-z0-9_]+' : '[A-Za-z0-9_]+').split('\u0002').join(fold ? '[0-9]{8}t[0-9]{6}z' : '[0-9]{8}T[0-9]{6}Z') + '$');
};
if (!fs.existsSync(dir)) { console.log('ok 0 records (' + dir + ' does not exist)'); process.exit(0); }
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort();
const bad = [];
for (const f of files) {
  let j; try { j = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch (e) { bad.push(f + ': does not read as JSON'); continue; }
  const xs = Array.isArray(j) ? j : [j];
  const nm = (xs.find((x) => x && x.Name) || {}).Name;
  const name = nm ? nm.replace(/^\//, '') : f.replace(/(-inspect)?(\.[0-9TZ]+)?\.json$/, '');
  const E = entries[name];
  if (!E) { bad.push(f + ': container ' + name + ' has no entry in ' + path.basename(fa) + ' or ' + path.basename(fb)); continue; }
  const ms = xs.flatMap((x) => (x && x.Mounts) || []);
  const rows = E.allow.map((m) => ({ s: pat(m.src, true), d: pat(m.dst, false), mode: m.mode, txt: m.src + ' -> ' + m.dst + ' (' + m.mode + ')', hit: 0 }));
  const outside = [];
  for (const m of ms) {
    if (!m || !m.Source || !m.Destination) { outside.push('(a mount without Source or Destination)'); continue; }
    const s = norm(m.Source), d = m.Destination.replace(/\/+$/, ''), mode = m.RW ? 'rw' : 'ro';
    const r = rows.find((x) => x.s.test(s) && x.d.test(d) && x.mode === mode);
    if (r) r.hit++; else outside.push(hostNorm(m.Source) + ' -> ' + m.Destination + ' (' + mode + ')');
  }
  const missing = rows.filter((r) => r.hit === 0).map((r) => r.txt), twice = rows.filter((r) => r.hit > 1).map((r) => r.txt);
  if (outside.length || missing.length || twice.length)
    bad.push(f + ' (' + name + ', ' + E.file + '): the record differs from the current entry: ' +
      [outside.length && outside.length + ' mount(s) not in the entry: ' + outside.join('; '),
       missing.length && missing.length + ' entry row(s) not in the record: ' + missing.join('; '),
       twice.length && 'matched twice: ' + twice.join('; ')].filter(Boolean).join(' | '));
}
if (bad.length) { console.log(bad.join('\n')); process.exit(1); }
console.log('ok ' + files.length + ' records');
