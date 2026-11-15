// Grader: check results/heldout against results/frozen/PLAN.json before scoring.
// Reads only run logs, the inventory and answer-file bytes/line counts (no scoring, no reference).
const fs = require('fs'), path = require('path'), zlib = require('zlib'), crypto = require('crypto');
const B = path.resolve(__dirname, '../../..');
const plan = JSON.parse(fs.readFileSync(path.join(B, 'results/frozen/PLAN.json'), 'utf8'));
const inv = JSON.parse(fs.readFileSync(path.join(B, 'results/heldout/INVENTORY.json'), 'utf8'));
const runs = fs.readFileSync(path.join(B, 'results/heldout/runs.jsonl'), 'utf8').split('\n').filter(Boolean).map(JSON.parse);
const problems = [], notes = [];
const planned = [...plan.runs.map(r => ({ ...r, kind: 'set' })), ...plan.question_runs.map(r => ({ ...r, kind: 'tq' }))];
const norm = o => o.replace(/^results\//, '');
const runByOut = {};
for (const r of runs) { (runByOut[norm(r.out || '')] ||= []).push(r); }
// every run line
const exits = {}; for (const r of runs) exits[r.exit] = (exits[r.exit] || 0) + 1;
notes.push(`runs.jsonl lines ${runs.length}; exits ${JSON.stringify(exits)}; repeats>0: ${runs.filter(r => r.repeat > 0).length}`);
for (const r of runs) if (r.exit !== 'ok' || r.repeat !== 0) notes.push('non-first or non-ok line: ' + JSON.stringify({ arm: r.arm, role: r.role, set: r.set, draw: r.draw, exit: r.exit, repeat: r.repeat, reason: r.reason, refusal: r.refusal, error: r.error }));
const plannedOuts = new Set(planned.map(p => norm(p.out)));
for (const o of Object.keys(runByOut)) if (!plannedOuts.has(o)) problems.push('run line for unplanned out ' + o);
const invByFile = {}; for (const f of inv.files) invByFile[norm(f.file)] = f;
for (const o of Object.keys(invByFile)) if (!plannedOuts.has(o)) problems.push('inventory file not in plan ' + o);
const frozen = {};
for (const p of planned) {
  const o = norm(p.out);
  const lines = (runByOut[o] || []);
  const ok = lines.filter(l => l.exit === 'ok');
  if (ok.length !== 1) problems.push(`${o}: ${ok.length} ok run lines`);
  const last = ok[ok.length - 1];
  if (last) {
    if (last.arm !== p.arm) problems.push(o + ' arm mismatch');
    if (p.kind === 'set') {
      if (last.hash !== p.hash || last.set !== p.set || (last.draw || 0) !== (p.draw || 0)) problems.push(o + ' hash/set/draw mismatch');
      if (last.n_tasks !== p.expected_tasks) problems.push(`${o} n_tasks ${last.n_tasks} != ${p.expected_tasks}`);
    } else {
      if (last.n_tasks !== (p.expected_questions || 30)) problems.push(`${o} n ${last.n_tasks}`);
      if (last.errors) problems.push(`${o} errors ${last.errors}`);
    }
    // code hash vs frozen record
    const recPath = p.kind === 'set' ? path.join(B, 'results/frozen', p.arm, p.hash + '.json') : path.join(B, 'results/frozen', p.arm, 'tq.json');
    const rec = JSON.parse(fs.readFileSync(recPath, 'utf8'));
    if (rec.code_hash !== last.code_hash) problems.push(`${o} code hash ${last.code_hash.slice(0, 16)} != frozen ${String(rec.code_hash).slice(0, 16)}`);
  }
  const fp = path.join(B, 'results', o);
  if (!fs.existsSync(fp)) { problems.push('missing file ' + o); continue; }
  const buf = fs.readFileSync(fp);
  const sha = crypto.createHash('sha256').update(buf).digest('hex');
  const iv = invByFile[o];
  if (!iv) problems.push('not in inventory ' + o);
  else {
    if (iv.sha256 !== sha) problems.push(`${o} sha256 differs from inventory`);
    if (iv.bytes !== undefined && iv.bytes !== buf.length) problems.push(`${o} bytes differ`);
  }
  const text = o.endsWith('.gz') ? zlib.gunzipSync(buf).toString('utf8') : buf.toString('utf8');
  const n = text.split('\n').filter(Boolean).length;
  const exp = p.kind === 'set' ? p.expected_tasks : (p.expected_questions || 30);
  if (n !== exp) problems.push(`${o} has ${n} lines, expected ${exp}`);
  if (iv && iv.answers !== undefined && iv.answers !== n) problems.push(`${o} inventory answers ${iv.answers} != ${n}`);
}
// stray files on disk
function walk(d) { let out = []; for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) out = out.concat(walk(p)); else out.push(p); } return out; }
const disk = walk(path.join(B, 'results/heldout')).map(p => path.relative(path.join(B, 'results'), p).split(path.sep).join('/'));
const known = new Set([...plannedOuts, 'heldout/INVENTORY.json', 'heldout/runs.jsonl']);
const extra = disk.filter(d => !known.has(d));
if (extra.length) notes.push('other files under results/heldout: ' + JSON.stringify(extra));
for (const e of extra) if (/_running\//.test(e) || /\.part$/.test(e)) problems.push('leftover running marker or part file ' + e);
const out = { checked_at: new Date().toISOString(), planned_set_runs: plan.runs.length, planned_question_runs: plan.question_runs.length, run_lines: runs.length, inventory_files: inv.files.length, problems, notes };
fs.writeFileSync(path.join(__dirname, 'verify_inventory.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
