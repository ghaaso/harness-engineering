'use strict';
// Re-run lane: structural check of every answer file (no scoring, no sealed data).
//   node verify.js <results root>
// Checks per answer: config_hash equals the file's hash; for every budget, used <= budget, and used
// recomputed from the items (full items + cut + footer) equals the logged value, head_tok + tail_tok
// equal the shown items' tokens; every configuration present for every TUNE task of every set
// (no duplicates, no extra ids, no held-out); the logged list hashes equal the hash recomputed from
// the arm's list; relational and reference answers identical apart from arm and timing fields.
const fs = require('fs');
const path = require('path');
const B = process.env.GT_BUILD || path.resolve(__dirname, '..', '..');
const H = require(path.join(B, 'arms/common/harness'));
const C = require(path.join(B, 'arms/common/config'));
const { countTokens } = require(path.join(B, 'arms/common/tokenizer'));
const root = process.argv[2];
const SETS = ['T1', 'T1x', 'T2'];
const tasks = {};
for (const s of SETS) tasks[s] = new Set(H.loadTasks([s], 'tune').map((t) => t.id));
const report = { arms: {}, problems: [] };
const bad = (m) => { if (report.problems.length < 200) report.problems.push(m); report.n_problems = (report.n_problems || 0) + 1; };

function expectedHashes(arm) {
  if (arm === 'floor-dir' || arm === 'floor-co') {
    const dir = path.join(B, 'arms', arm, 'configs');
    return fs.readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => C.configHash(C.normalise(JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')))));
  }
  const L = H.loadArmList(arm === 'reference' ? 'relational' : arm, 1, false);
  return L.list.map((c) => c.hash);
}

function checkAnswer(a, file, hash) {
  if (a.config_hash !== hash) bad(file + ' ' + a.id + ' config_hash ' + a.config_hash);
  if (a.split !== 'tune') bad(file + ' ' + a.id + ' split ' + a.split);
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
    const shownN = v.n_full + (v.cut ? 1 : 0);
    if (shownN + v.beyond !== a.n_units) bad(file + ' ' + a.id + ' budget ' + b + ' n_full+cut+beyond != n_units');
  }
  if (Object.keys(a.budgets).sort().join() !== ['16000', '2000', '4000', '8000'].sort().join()) bad(file + ' ' + a.id + ' budgets ' + Object.keys(a.budgets));
}

const strip = (a) => JSON.stringify({ ...a, arm: null, ms: null, engine_ms: null });
const KNOWN = ['relational', 'reference', 'search', 'floor-dir', 'floor-co'];
for (const arm of fs.readdirSync(root).filter((d) => KNOWN.includes(d) && fs.existsSync(path.join(root, d, 'tune')))) {
  const want = expectedHashes(arm);
  const r = { configs_expected: want.length, files: 0, answers: 0, missing_files: 0, over_budget: 0 };
  for (const h of want) for (const s of SETS) {
    const f = path.join(root, arm, 'tune', h + '.' + s + '.jsonl.gz');
    if (!fs.existsSync(f)) { r.missing_files++; bad('missing ' + arm + ' ' + h + ' ' + s); continue; }
    r.files++;
    const A = H.readGzJsonl(f); const ids = new Set();
    for (const a of A) {
      if (ids.has(a.id)) bad(f + ' duplicate ' + a.id); ids.add(a.id);
      if (!tasks[s].has(a.id)) bad(f + ' unexpected id ' + a.id);
      if (a.set !== s) bad(f + ' set ' + a.set);
      for (const v of Object.values(a.budgets)) if (v.used > Number(Object.keys(a.budgets).find((k) => a.budgets[k] === v))) r.over_budget++;
      checkAnswer(a, path.basename(f), h);
      r.answers++;
    }
    for (const id of tasks[s]) if (!ids.has(id)) bad(f + ' missing task ' + id);
  }
  report.arms[arm] = r;
}
// relational vs reference, answer by answer
if (report.arms.relational && report.arms.reference) {
  let n = 0; let diff = 0; let rdiff = 0;
  for (const h of expectedHashes('relational')) for (const s of SETS) {
    const fa = path.join(root, 'relational', 'tune', h + '.' + s + '.jsonl.gz');
    const fb = path.join(root, 'reference', 'tune', h + '.' + s + '.jsonl.gz');
    if (!fs.existsSync(fa) || !fs.existsSync(fb)) continue;
    const mb = new Map(H.readGzJsonl(fb).map((a) => [a.id, a]));
    for (const a of H.readGzJsonl(fa)) {
      const b = mb.get(a.id); n++;
      if (!b) { diff++; continue; }
      if (a.ranked_sha !== b.ranked_sha) rdiff++;
      if (strip(a) !== strip(b)) diff++;
    }
  }
  report.relational_vs_reference = { answers_compared: n, ranked_sha_differ: rdiff, answers_differ: diff };
}
// list hashes
const lh = {};
for (const f of [path.join(root, 'sweep', 'lists.jsonl')]) if (fs.existsSync(f)) for (const l of fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map(JSON.parse)) { lh[l.arm] = lh[l.arm] || new Set(); lh[l.arm].add(l.list_hash); }
report.list_hashes = {};
for (const [arm, s] of Object.entries(lh)) {
  const re = H.loadArmList(arm, 1, false).hash;
  report.list_hashes[arm] = { logged: [...s], recomputed: re, match: s.size === 1 && s.has(re) };
  if (!report.list_hashes[arm].match) bad('list hash mismatch ' + arm);
}
// TQ files
report.tq = {};
const qs = fs.readFileSync(path.join(B, 'tasks', 'tq_questions.jsonl'), 'utf8').split('\n').filter(Boolean).map(JSON.parse).filter((q) => q.split === 'tune');
for (const arm of ['relational', 'search']) {
  const f = path.join(root, 'tq', arm + '.tune.jsonl');
  if (!fs.existsSync(f)) { report.tq[arm] = 'missing'; continue; }
  const L = fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map(JSON.parse);
  const ids = new Set(L.map((x) => x.id));
  const r = { lines: L.length, all_questions: qs.every((q) => ids.has(q.id)) && ids.size === qs.length, errors: L.filter((x) => x.error).length,
    fields_ok: L.every((x) => ['id', 'answer', 'tokens', 'lookups', 'ms', 'arm', 'error'].every((k) => k in x)),
    tokens_recompute_equal: L.filter((x) => x.tokens === countTokens(JSON.stringify(x.answer))).length,
    tokens_median: L.map((x) => x.tokens).sort((a, b) => a - b)[Math.floor(L.length / 2)], lookups_max: Math.max(...L.map((x) => x.lookups)) };
  if (!r.all_questions || r.errors || !r.fields_ok) bad('tq ' + arm + ' ' + JSON.stringify(r));
  report.tq[arm] = r;
}
report.n_problems = report.n_problems || 0;
console.log(JSON.stringify(report, null, 1));
