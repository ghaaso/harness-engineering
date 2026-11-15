'use strict';
// Structural check of this arm's stage-1 answer files and TQ file (no scoring, no sealed data), with
// the same per-answer rules as the harness lane's tmp/harness-fix2/verify2.js:
// per answer: config_hash equals the file's hash; split tune; all four budgets; for each budget
// used <= budget, used recomputed from the items (full items + cut + footer) equals the logged value,
// head_tok + tail_tok equal the shown items' tokens, n_full + cut + beyond = n_units;
// lookups = lookups_head + PAD_LOOKUPS[pad] with lookups_head 1 (one query; this arm reports none).
// Per set: every configuration of the logged list present for every TUNE task, no duplicate, extra or
// held-out id, and the task ids equal the relational arm's for the same set.
// The logged list hash equals the recomputed one. TQ: one answer file, every TUNE question, all fields.
//   node verify.js [--root results] [--out file]
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const P = require('../common/paths');
const H = require('../common/harness');
const { countTokens } = require('../common/tokenizer');

// --stage 2 checks the stage-2 list (arms/ladybug/stage2.json) instead; the other stage's files in the
// same tune folder are then expected, not "unexpected".
const a = process.argv.slice(2); let root = P.RESULTS; let outF = null; let stage = 1;
for (let i = 0; i < a.length; i++) { if (a[i] === '--root') root = a[++i]; else if (a[i] === '--out') outF = a[++i]; else if (a[i] === '--stage') stage = Number(a[++i]); else throw new Error('unknown argument ' + a[i]); }
const SETS = ['T1', 'T1x', 'T2'];
const problems = []; let nProblems = 0;
const bad = (m) => { if (problems.length < 200) problems.push(m); nProblems++; };
const read = (f) => zlib.gunzipSync(fs.readFileSync(f)).toString('utf8').split('\n').filter(Boolean).map(JSON.parse);

function checkAnswer(a, file, hash) {
  if (a.config_hash !== hash) bad(file + ' ' + a.id + ' config_hash ' + a.config_hash);
  if (a.split !== 'tune') bad(file + ' ' + a.id + ' split ' + a.split);
  if (a.arm !== 'ladybug') bad(file + ' ' + a.id + ' arm ' + a.arm);
  for (const [bs, v] of Object.entries(a.budgets)) {
    const b = Number(bs);
    if (v.used > b) bad(file + ' ' + a.id + ' over budget ' + b + ': ' + v.used);
    let t = 0; let ht = 0; let tt = 0;
    for (let k = 0; k < v.n_full; k++) { const it = a.items[k]; t += it.tok; if (it.pad) tt += it.tok; else ht += it.tok; }
    if (v.cut) { t += v.cut.tok; if (v.cut.pad) tt += v.cut.tok; else ht += v.cut.tok; }
    const allFit = !v.cut && v.beyond === 0 && v.n_full === a.n_units;
    if (!allFit) t += countTokens('[+' + v.beyond + ' more not shown]\n');
    if (t !== v.used) bad(file + ' ' + a.id + ' budget ' + b + ' used ' + v.used + ' recomputed ' + t);
    if (ht !== v.head_tok || tt !== v.tail_tok) bad(file + ' ' + a.id + ' budget ' + b + ' head/tail tok');
    if (v.n_full + (v.cut ? 1 : 0) + v.beyond !== a.n_units) bad(file + ' ' + a.id + ' budget ' + b + ' n_full+cut+beyond != n_units');
  }
  if (Object.keys(a.budgets).sort().join() !== ['16000', '2000', '4000', '8000'].sort().join()) bad(file + ' ' + a.id + ' budgets');
  if (a.lookups_head !== 1 || a.lookups_pad !== H.PAD_LOOKUPS[a.pad] || a.lookups !== a.lookups_head + a.lookups_pad) bad(file + ' ' + a.id + ' lookups ' + [a.lookups, a.lookups_head, a.lookups_pad, a.pad]);
}

const list = H.loadArmList('ladybug', stage, false);
const want = list.list.map((c) => c.hash);
const otherHashes = H.loadArmList('ladybug', stage === 1 ? 2 : 1, false).list.map((c) => c.hash);
const tuneDir = path.join(root, 'ladybug', 'tune');
const rep = { stage, list_hash: list.hash, configs: want.length, files: 0, answers: 0, per_set: {} };
const logged = fs.readFileSync(path.join(root, 'ladybug', 'sweep', 'lists.jsonl'), 'utf8').split('\n').filter(Boolean).map(JSON.parse);
if (!logged.some((x) => x.list_hash === list.hash && (x.stage || 1) === stage)) bad('logged list hash differs from the recomputed ' + list.hash + ': ' + logged.map((x) => x.list_hash).join(','));
const present = new Set(fs.readdirSync(tuneDir).filter((f) => !otherHashes.includes(f.split('.')[0])));
for (const s of SETS) {
  const ids = new Set(H.loadTasks([s], 'tune').map((t) => t.id));
  const r = rep.per_set[s] = { tasks: ids.size, files: 0, answers: 0 };
  // the relational arm's task ids for the same set (any one of its files)
  const relDir = path.join(root, 'relational', 'tune');
  const relF = fs.existsSync(relDir) ? fs.readdirSync(relDir).find((f) => f.endsWith('.' + s + '.jsonl.gz')) : null;
  const relIds = relF ? new Set(read(path.join(relDir, relF)).map((x) => x.id)) : null;
  for (const h of want) {
    const f = h + '.' + s + '.jsonl.gz';
    if (!present.has(f)) { bad('missing file ' + f); continue; }
    present.delete(f);
    const rows = read(path.join(tuneDir, f)); r.files++; rep.files++;
    const seen = new Set();
    for (const x of rows) {
      if (seen.has(x.id)) bad(f + ' duplicate ' + x.id); seen.add(x.id);
      if (!ids.has(x.id)) bad(f + ' extra or held-out id ' + x.id);
      checkAnswer(x, f, h); r.answers++; rep.answers++;
    }
    for (const id of ids) if (!seen.has(id)) bad(f + ' missing task ' + id);
    if (relIds && (relIds.size !== seen.size || [...relIds].some((id) => !seen.has(id)))) bad(f + ' task ids differ from the relational arm');
  }
}
for (const f of present) bad('unexpected file ' + f);
// TQ
const tqF = path.join(root, 'tq', 'ladybug.tune.answers.jsonl');
const qs = fs.readFileSync(path.join(P.TASKS, 'tq_questions.jsonl'), 'utf8').split('\n').filter(Boolean).map(JSON.parse).filter((q) => q.split === 'tune');
const tq = fs.readFileSync(tqF, 'utf8').split('\n').filter(Boolean).map(JSON.parse);
rep.tq = { questions: qs.length, lines: tq.length, errors: tq.filter((x) => x.error).length };
if (tq.length !== qs.length) bad('TQ lines ' + tq.length + ' vs questions ' + qs.length);
for (const q of qs) { const x = tq.find((y) => y.id === q.id); if (!x) bad('TQ missing ' + q.id); else for (const k of ['answer', 'tokens', 'lookups', 'ms', 'arm', 'error']) if (!(k in x)) bad('TQ ' + q.id + ' field ' + k); }
const other = fs.readdirSync(path.join(root, 'tq')).filter((f) => f.startsWith('ladybug') && f !== 'ladybug.tune.answers.jsonl');
if (other.length) bad('other ladybug files in results/tq: ' + other.join(','));
rep.n_problems = nProblems; rep.problems = problems;
if (outF) fs.writeFileSync(outF, JSON.stringify(rep, null, 1));
console.log(JSON.stringify({ ...rep, problems: problems.slice(0, 10) }, null, 1));
