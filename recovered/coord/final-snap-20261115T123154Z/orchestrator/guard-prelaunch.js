// Host-side helpers of guard-stageB.sh (release-gate round, 2026-11-14). Not hashed; node only (no Python on the host).
// usage: node guard-prelaunch.js <cmd> <train dir (C:/... form)> [plan.json]
//   sanitize    (operations-02) every progress*.jsonl: a line that is not one JSON object (torn, NUL-filled) moves
//               to <file>.torn; the file is made to end in a newline. Prints "sanitize moved=<n> newline_fixed=<n>".
//   validate    (operations-02) every done stage-B unit: counts.json and meta.json must parse as objects and
//               pool/unrestricted.tsv.gz must gunzip with the evalcore header; a failing unit folder moves to
//               stageB/quarantine/<UTC stamp>/<arm>/<cid>/s<seed>/<checkpoint>, so stageB.py redoes it (its skip
//               test needs counts.json). Prints "validate done=<n> checked=<n> missing=<n> quarantined=<n>".
//   renamefails (operations-10) the longest run of consecutive stage-B 'failed' lines carrying RenameFailed at
//               the END of any progress*.jsonl (a done line ends a run). Prints the number.
//   left        units left = 5 arms x 3 configs x 3 seeds x checkpoints minus the distinct done units whose part
//               folder holds counts.json (stageB.py's own skip test, so a quarantined unit counts as left); needs
//               plan.json, -1 without it.
//   donen       number of stage-B 'done' lines (all files, plan line excluded): grows with every finished unit,
//               a redone (quarantined) unit included, so the guard's no-progress count sees it.
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const [cmd, train, planPath] = process.argv.slice(2);
const HEADER = 'task_id\tcandidate\tscore';

function progFiles() {
  return fs.readdirSync(train).filter(n => /^progress.*\.jsonl$/.test(n)).sort().map(n => path.join(train, n));
}
function parse(l) {
  if (l.indexOf('\u0000') >= 0) return null;
  try { const r = JSON.parse(l); return (r && typeof r === 'object' && !Array.isArray(r)) ? r : null; } catch (e) { return null; }
}
function records() {
  const out = [];
  for (const f of progFiles()) for (const l of fs.readFileSync(f, 'utf8').split('\n')) { if (!l.trim()) continue; const r = parse(l); if (r) out.push([f, r]); }
  return out;
}
function partDir(u) {  // the unit's finished part folder, or null
  const m = /^(E\d)\/(c\d+)\/(s\d)\/([0-9a-f]{12})$/.exec(u || ''); if (!m) return null;
  const dir = path.join(train, 'stageB', 'parts', m[1], m[2], m[3]); if (!fs.existsSync(dir)) return null;
  const h = fs.readdirSync(dir).find(n => n.startsWith(m[4]) && !n.includes('.part') && !n.endsWith('.model'));
  return h ? path.join(dir, h) : null;
}
function doneUnits() {
  const d = new Set();
  for (const [, r] of records()) if (r.step === 'stageB' && r.status === 'done') d.add(r.unit);
  return d;
}

if (cmd === 'sanitize') {
  let moved = 0, nl = 0;
  for (const f of progFiles()) {
    const txt = fs.readFileSync(f, 'utf8');
    const lines = txt.split('\n'); if (lines.length && lines[lines.length - 1] === '') lines.pop();
    const keep = [], bad = [];
    for (const l of lines) { if (!l.trim()) continue; (parse(l) ? keep : bad).push(l); }
    const want = keep.length ? keep.join('\n') + '\n' : '';
    if (bad.length) { fs.appendFileSync(f + '.torn', bad.map(b => b.replace(/\u0000/g, '\\u0000')).join('\n') + '\n'); moved += bad.length; }
    if (want !== txt) {
      if (!bad.length) nl++;
      const tmp = f + '.sanitize.tmp'; fs.writeFileSync(tmp, want); fs.renameSync(tmp, f);
    }
  }
  console.log('sanitize moved=' + moved + ' newline_fixed=' + nl);
} else if (cmd === 'validate') {
  const done = doneUnits(); let checked = 0, missing = 0, quarantined = 0;
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  for (const u of done) {
    if (!u || u === 'plan') continue;
    const m = /^(E\d)\/(c\d+)\/(s\d)\/([0-9a-f]{12})$/.exec(u); if (!m) continue;
    const dir = path.join(train, 'stageB', 'parts', m[1], m[2], m[3]);
    const hits = fs.existsSync(dir) ? fs.readdirSync(dir).filter(n => n.startsWith(m[4]) && !/\.(part|model)$/.test(n) && !n.includes('.part')) : [];
    if (!hits.length) { missing++; continue; }
    for (const h of hits) {
      const ud = path.join(dir, h); checked++; const why = [];
      for (const j of ['counts.json', 'meta.json']) {
        try { const r = JSON.parse(fs.readFileSync(path.join(ud, j), 'utf8')); if (!r || typeof r !== 'object') why.push(j + ' not an object'); }
        catch (e) { why.push(j + ': ' + e.message.slice(0, 60)); }
      }
      for (const t of ['pool.tsv.gz', 'unrestricted.tsv.gz']) {
        try { const s = zlib.gunzipSync(fs.readFileSync(path.join(ud, t))).toString('utf8'); if (s.split('\n')[0] !== HEADER) why.push(t + ' header'); }
        catch (e) { why.push(t + ': ' + e.message.slice(0, 60)); }
      }
      if (why.length) {
        const q = path.join(train, 'stageB', 'quarantine', stamp, m[1], m[2], m[3]);
        fs.mkdirSync(q, { recursive: true }); fs.renameSync(ud, path.join(q, h)); quarantined++;
        console.log('quarantined ' + u + ' (' + why.join('; ') + ')');
      }
    }
  }
  console.log('validate done=' + done.size + ' checked=' + checked + ' missing=' + missing + ' quarantined=' + quarantined);
} else if (cmd === 'renamefails') {
  let worst = 0;
  for (const f of progFiles()) {
    let run = 0;
    for (const l of fs.readFileSync(f, 'utf8').split('\n')) {
      const r = l.trim() ? parse(l) : null; if (!r || r.step !== 'stageB' || r.unit === 'plan') continue;
      if (r.status === 'failed' && String(r.error || '').includes('RenameFailed')) run++;
      else if (r.status === 'done' || r.status === 'failed') run = 0;
    }
    worst = Math.max(worst, run);
  }
  console.log(worst);
} else if (cmd === 'left') {
  if (!planPath || !fs.existsSync(planPath)) { console.log(-1); process.exit(0); }
  const p = JSON.parse(fs.readFileSync(planPath, 'utf8')); let n = 0;
  for (const a of Object.keys(p.configs)) n += p.configs[a].length * 3 * p.checkpoints.length;
  let have = 0; for (const u of doneUnits()) { const p = partDir(u); if (p && fs.existsSync(path.join(p, 'counts.json'))) have++; }
  console.log(n - have);
} else if (cmd === 'donen') {
  let k = 0; for (const [, r] of records()) if (r.step === 'stageB' && r.status === 'done' && r.unit !== 'plan') k++;
  console.log(k);
} else { console.error('unknown command ' + cmd); process.exit(2); }
