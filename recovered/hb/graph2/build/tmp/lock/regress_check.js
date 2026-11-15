'use strict';
// Compare the regression re-run (tmp/lock/regress/<arm>/tune/<hash>.T1.jsonl.gz) with the stored TUNE
// answers (results/<arm>/tune/<hash>.T1.jsonl.gz). The reference arm's stored answers of the stage-2
// primary live outside results/, so it is compared with the relational arm's stored answers (the
// relational and reference arms are byte-identical by the strict cross-check). Fields set aside: wall
// time (ms), engine time (engine_ms), the sweep's config_name, and timing fields inside meta
// (query_ms); for reference against relational also `arm`. The answer content is every other field
// except `meta` (the arm's own diagnostics); meta is compared separately and its differing keys listed
// (the ladybug arm's `queries` count depends on its application-code cache, which a 60-configuration
// sweep keeps warm across configurations and a single-configuration run does not).
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const B = path.resolve(__dirname, '..', '..');
const D = path.join(__dirname, 'regress');
const rd = (f) => zlib.gunzipSync(fs.readFileSync(f)).toString('utf8').split('\n').filter(Boolean).map(JSON.parse);
const ids = fs.readFileSync(path.join(D, 'ids.txt'), 'utf8').split('\n').filter(Boolean);
function norm(a, dropArm) {
  return JSON.stringify({ ...a, ms: null, engine_ms: null, config_name: null, meta: null, arm: dropArm ? null : a.arm });
}
const metaNoMs = (m) => (m ? Object.fromEntries(Object.entries(m).filter(([k]) => !/(^|_)ms$/.test(k))) : m);
const rows = []; let bad = 0;
for (const arm of fs.readdirSync(D).filter((x) => fs.statSync(path.join(D, x)).isDirectory())) {
  for (const f of fs.readdirSync(path.join(D, arm, 'tune'))) {
    const hash = f.split('.')[0];
    let sf = path.join(B, 'results', arm, 'tune', f); let against = arm;
    if (!fs.existsSync(sf)) { sf = path.join(B, 'results', 'relational', 'tune', f); against = 'relational'; }
    const now = rd(path.join(D, arm, 'tune', f));
    const st = new Map(rd(sf).map((a) => [a.id, a]));
    let same = 0; const diff = []; const metaKeys = {}; let metaDiff = 0;
    for (const a of now) {
      const s = st.get(a.id);
      if (s && norm(a, against !== arm) === norm(s, against !== arm)) same++; else diff.push(a.id);
      const ma = metaNoMs(a.meta) || {}; const ms = (s && metaNoMs(s.meta)) || {};
      if (against === arm && JSON.stringify(ma) !== JSON.stringify(ms)) { metaDiff++; for (const k of new Set([...Object.keys(ma), ...Object.keys(ms)])) if (JSON.stringify(ma[k]) !== JSON.stringify(ms[k])) metaKeys[k] = (metaKeys[k] || 0) + 1; }
    }
    const missing = ids.filter((i) => !now.some((a) => a.id === i));
    if (diff.length || missing.length) bad++;
    rows.push({ arm, hash, against: against + '/' + f, tasks: now.length, identical: same, differ: diff, missing, meta_differs: metaDiff, meta_keys_differing: metaKeys });
  }
}
const out = { tasks_per_run: ids.length, runs: rows.length, runs_not_identical: bad, rows };
fs.writeFileSync(path.join(__dirname, 'regress.json'), JSON.stringify(out, null, 1));
for (const r of rows) console.log(r.arm.padEnd(11), r.hash, 'tasks', r.tasks, 'identical', r.identical, 'differ', r.differ.length, 'missing', r.missing.length, 'meta-differs', r.meta_differs, JSON.stringify(r.meta_keys_differing), 'vs', r.against);
console.log(JSON.stringify({ runs: rows.length, runs_not_identical: bad }));
process.exit(bad ? 1 : 0);
