// Host-side helpers of guard-stageAB.sh (ruling 69, two containers). Not hashed; node only (no Python on the host).
// Scoped forms of guard-prelaunch.js (which stays as it is for guard-stageB.sh): a repair before a launch touches
// ONLY the launching container's own progress file and its own model types, never the sibling's, because the
// sibling may be appending to its file or writing its parts at that moment.
// usage: node guard-prelaunch-ab.js <cmd> <train dir (C:/... form)> ...
//   sanitize    <train> <progress file name>   that one file: a line that is not one JSON object (torn, NUL-filled)
//               moves to <file>.torn; the file is made to end in a newline. Prints "sanitize <file> moved=<n> newline_fixed=<0|1>".
//   validate    <train> <arms csv>             done stage-B units of those arms only (done lines read from every
//               progress*.jsonl, read only): counts.json and meta.json parse as objects, pool/unrestricted.tsv.gz
//               gunzip with the evalcore header; a failing unit folder moves to stageB/quarantine/<UTC stamp>/<arm>/
//               <cid>/s<seed>/<checkpoint> so stageB.py redoes it. Prints "validate arms=<csv> done=<n> checked=<n>
//               missing=<n> quarantined=<n>".
//   renamefails <train> <progress file name>   longest run of consecutive stage-B 'failed' lines carrying RenameFailed
//               at the END of that file (a done line ends a run).
//   left        <train> <plan.json> <arms csv> units left for those arms = configs x 3 seeds x checkpoints minus the
//               distinct done units whose part folder holds counts.json (stageB.py's skip test); -1 without a plan.
//   donen       <train> <arms csv>             stage-B 'done' lines of those arms in every progress file.
//   armlines    <train> <progress file name> <arm>   stage-B lines of any status for that arm in that one file.
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const [cmd, train, a3, a4] = process.argv.slice(2);
const HEADER = 'task_id\tcandidate\tscore';
const UNIT = /^(E\d)\/(c\d+)\/(s\d)\/([0-9a-f]{12})$/;

function armSet(csv) { return new Set(String(csv || '').split(',').map(s => s.trim()).filter(Boolean)); }
function progFiles() {
  return fs.readdirSync(train).filter(n => /^progress.*\.jsonl$/.test(n)).sort().map(n => path.join(train, n));
}
function ownFile(name) {
  if (!/^progress.*\.jsonl$/.test(name || '') || name.includes('/') || name.includes('\\')) { console.error('bad progress file name ' + name); process.exit(2); }
  return path.join(train, name);
}
function parse(l) {
  if (l.indexOf('\u0000') >= 0) return null;
  try { const r = JSON.parse(l); return (r && typeof r === 'object' && !Array.isArray(r)) ? r : null; } catch (e) { return null; }
}
function recordsOf(files) {
  const out = [];
  for (const f of files) {
    if (!fs.existsSync(f)) continue;
    for (const l of fs.readFileSync(f, 'utf8').split('\n')) { if (!l.trim()) continue; const r = parse(l); if (r) out.push(r); }
  }
  return out;
}
function armOf(u) { const m = UNIT.exec(u || ''); return m ? m[1] : null; }
function doneUnits(arms) {
  const d = new Set();
  for (const r of recordsOf(progFiles())) if (r.step === 'stageB' && r.status === 'done' && arms.has(armOf(r.unit))) d.add(r.unit);
  return d;
}
function partDir(u) {
  const m = UNIT.exec(u || ''); if (!m) return null;
  const dir = path.join(train, 'stageB', 'parts', m[1], m[2], m[3]); if (!fs.existsSync(dir)) return null;
  const h = fs.readdirSync(dir).find(n => n.startsWith(m[4]) && !n.includes('.part') && !n.endsWith('.model'));
  return h ? path.join(dir, h) : null;
}

if (cmd === 'sanitize') {
  const f = ownFile(a3); let moved = 0, nl = 0;
  if (fs.existsSync(f)) {
    const txt = fs.readFileSync(f, 'utf8');
    const lines = txt.split('\n'); if (lines.length && lines[lines.length - 1] === '') lines.pop();
    const keep = [], bad = [];
    for (const l of lines) { if (!l.trim()) continue; (parse(l) ? keep : bad).push(l); }
    const want = keep.length ? keep.join('\n') + '\n' : '';
    if (bad.length) { fs.appendFileSync(f + '.torn', bad.map(b => b.replace(/\u0000/g, '\\u0000')).join('\n') + '\n'); moved = bad.length; }
    if (want !== txt) {
      if (!bad.length) nl = 1;
      const tmp = f + '.sanitize.tmp'; fs.writeFileSync(tmp, want); fs.renameSync(tmp, f);
    }
  }
  console.log('sanitize ' + a3 + ' moved=' + moved + ' newline_fixed=' + nl);
} else if (cmd === 'validate') {
  const arms = armSet(a3); if (!arms.size) { console.error('validate needs arms'); process.exit(2); }
  const done = doneUnits(arms); let checked = 0, missing = 0, quarantined = 0;
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  for (const u of done) {
    const m = UNIT.exec(u); if (!m || !arms.has(m[1])) continue;
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
  console.log('validate arms=' + [...arms].join(',') + ' done=' + done.size + ' checked=' + checked + ' missing=' + missing + ' quarantined=' + quarantined);
} else if (cmd === 'renamefails') {
  const f = ownFile(a3); let run = 0;
  if (fs.existsSync(f)) for (const l of fs.readFileSync(f, 'utf8').split('\n')) {
    const r = l.trim() ? parse(l) : null; if (!r || r.step !== 'stageB' || r.unit === 'plan') continue;
    if (r.status === 'failed' && String(r.error || '').includes('RenameFailed')) run++;
    else if (r.status === 'done' || r.status === 'failed') run = 0;
  }
  console.log(run);
} else if (cmd === 'left') {
  const arms = armSet(a4);
  if (!a3 || !fs.existsSync(a3)) { console.log(-1); process.exit(0); }
  const p = JSON.parse(fs.readFileSync(a3, 'utf8')); let n = 0;
  for (const a of Object.keys(p.configs)) if (arms.has(a)) n += p.configs[a].length * 3 * p.checkpoints.length;
  let have = 0; for (const u of doneUnits(arms)) { const d = partDir(u); if (d && fs.existsSync(path.join(d, 'counts.json'))) have++; }
  console.log(n - have);
} else if (cmd === 'donen') {
  const arms = armSet(a3); let k = 0;
  for (const r of recordsOf(progFiles())) if (r.step === 'stageB' && r.status === 'done' && r.unit !== 'plan' && arms.has(armOf(r.unit))) k++;
  console.log(k);
} else if (cmd === 'armlines') {
  let k = 0;
  for (const r of recordsOf([ownFile(a3)])) if (r.step === 'stageB' && armOf(r.unit) === a4) k++;
  console.log(k);
} else { console.error('unknown command ' + cmd); process.exit(2); }
