'use strict';
// Structural check of this arm's stage-1 answer files and TQ answer file (no scoring, no sealed data),
// the same checks as tmp/harness-fix2/verify2.js applies to the other arms, plus a comparison of the
// ranked lists against the previous stage-1 answers of this arm.
//   node arms/duckpgq/dev/verify_answers.js <results root> <sweep log root> [<old tune folder>] > out.json
// Per answer: config_hash equals the file's hash; split tune; set; for every budget used <= budget, used
// recomputed from the items equals the logged value, head_tok + tail_tok equal the shown items' tokens,
// n_full + cut + beyond = n_units; the four budgets present; lookups = lookups_head + PAD_LOOKUPS[pad],
// lookups_head = 1 (this arm reports none); meta present. Per configuration and set: every TUNE task
// once, no extra or held-out id. List hash logged = recomputed. TQ: one answer file, 20 lines, fields.
// Old vs new: per (configuration hash, set, task) present in both, ranked_sha and packed content changed.
const fs = require('fs');
const path = require('path');
const B = process.env.GT_BUILD || path.resolve(__dirname, '..', '..', '..');
const H = require(path.join(B, 'arms/common/harness'));
const { countTokens } = require(path.join(B, 'arms/common/tokenizer'));
const root = process.argv[2]; const logRoot = process.argv[3]; const oldDir = process.argv[4] || null;
const ARM = 'duckpgq'; const SETS = ['T1', 'T1x', 'T2'];
const tasks = {}; for (const s of SETS) tasks[s] = new Set(H.loadTasks([s], 'tune').map((t) => t.id));
const rep = { problems: [], n_problems: 0 }; const bad = (m) => { if (rep.problems.length < 100) rep.problems.push(m); rep.n_problems++; };
// VERIFY_STAGE=2 checks the stage-2 list (arms/duckpgq/stage2.json) instead of stage 1
const STAGE = Number(process.env.VERIFY_STAGE || 1);
const L = H.loadArmList(ARM, STAGE, false);
const content = (a) => JSON.stringify([a.seeds, a.seed_match, a.n_ranked, a.n_units, a.n_head, a.items, a.budgets, a.beyond_sample]);
const r = { configs: L.list.length, files: 0, answers: 0, over_budget: 0, missing_files: 0, budgets_checked: 0 };
const old = { compared: 0, ranked_sha_changed: 0, content_changed: 0, by_config: {} };
// the previous list (argv[5], its sweep configs.json): an entry whose configuration changed is compared with
// the previous entry at the same list position
const oldList = process.argv[5] ? JSON.parse(fs.readFileSync(process.argv[5], 'utf8')).lists[ARM].configs : null;
L.list.forEach((c, i) => { c.oldHash = oldList && oldList[i] ? oldList[i].hash : c.hash; c.oldName = oldList && oldList[i] ? oldList[i].name : c.name; });
for (const c of L.list) for (const s of SETS) {
  const f = path.join(root, ARM, 'tune', c.hash + '.' + s + '.jsonl.gz');
  if (!fs.existsSync(f)) { r.missing_files++; bad('missing ' + c.name + ' ' + s); continue; }
  r.files++;
  const A = H.readGzJsonl(f); const ids = new Set();
  const of = oldDir ? path.join(oldDir, c.oldHash + '.' + s + '.jsonl.gz') : null;
  const OM = of && fs.existsSync(of) ? new Map(H.readGzJsonl(of).map((a) => [a.id, a])) : null;
  for (const a of A) {
    r.answers++;
    if (ids.has(a.id)) bad(f + ' duplicate ' + a.id); ids.add(a.id);
    if (!tasks[s].has(a.id)) bad(f + ' unexpected id ' + a.id);
    if (a.set !== s || a.split !== 'tune' || a.config_hash !== c.hash || a.arm !== ARM) bad(f + ' ' + a.id + ' set/split/hash/arm');
    if (Object.keys(a.budgets).sort().join() !== ['16000', '2000', '4000', '8000'].sort().join()) bad(f + ' ' + a.id + ' budgets');
    for (const [bs, v] of Object.entries(a.budgets)) {
      r.budgets_checked++;
      const b = Number(bs); if (v.used > b) { r.over_budget++; bad(f + ' ' + a.id + ' over budget ' + b); }
      let t = 0; let ht = 0; let tt = 0;
      for (let k = 0; k < v.n_full; k++) { const it = a.items[k]; t += it.tok; if (it.pad) tt += it.tok; else ht += it.tok; }
      if (v.cut) { t += v.cut.tok; if (v.cut.pad) tt += v.cut.tok; else ht += v.cut.tok; }
      const allFit = !v.cut && v.beyond === 0 && v.n_full === a.n_units;
      if (!allFit) t += countTokens('[+' + v.beyond + ' more not shown]\n');
      if (t !== v.used) bad(f + ' ' + a.id + ' budget ' + b + ' used ' + v.used + ' recomputed ' + t);
      if (ht !== v.head_tok || tt !== v.tail_tok) bad(f + ' ' + a.id + ' budget ' + b + ' head/tail tok');
      if (v.n_full + (v.cut ? 1 : 0) + v.beyond !== a.n_units) bad(f + ' ' + a.id + ' budget ' + b + ' unit counts');
    }
    if (a.lookups_head !== 1 || a.lookups_pad !== H.PAD_LOOKUPS[a.pad] || a.lookups !== a.lookups_head + a.lookups_pad) bad(f + ' ' + a.id + ' lookups');
    if (!a.meta || typeof a.meta !== 'object') bad(f + ' ' + a.id + ' meta missing');
    if (OM) {
      const o = OM.get(a.id); if (!o) continue;
      old.compared++; const bc = old.by_config[c.name] = old.by_config[c.name] || { previous_name: c.oldName, configuration_changed: c.oldHash !== c.hash, compared: 0, ranked_sha_changed: 0, content_changed: 0 };
      bc.compared++;
      if (o.ranked_sha !== a.ranked_sha) { old.ranked_sha_changed++; bc.ranked_sha_changed++; }
      if (content(o) !== content(a)) { old.content_changed++; bc.content_changed++; }
    } else if (oldDir) { old.by_config[c.name] = old.by_config[c.name] || { no_old_file: true }; }
  }
  for (const id of tasks[s]) if (!ids.has(id)) bad(f + ' missing task ' + id);
}
rep.answers = r;
rep.tasks_per_set = Object.fromEntries(SETS.map((s) => [s, tasks[s].size]));
// list hash logged by the sweep
const lf = path.join(logRoot, 'sweep', 'lists.jsonl');
const logged = fs.existsSync(lf) ? fs.readFileSync(lf, 'utf8').split('\n').filter(Boolean).map(JSON.parse).filter((x) => x.arm === ARM && x.stage === STAGE).map((x) => x.list_hash) : [];
rep.list_hash = { recomputed: L.hash, logged: [...new Set(logged)], match: logged.length > 0 && logged.every((h) => h === L.hash) };
if (!rep.list_hash.match) bad('list hash');
// TQ answer file
const qs = fs.readFileSync(path.join(B, 'tasks', 'tq_questions.jsonl'), 'utf8').split('\n').filter(Boolean).map(JSON.parse).filter((q) => q.split === 'tune');
const tf = path.join(root, 'tq', ARM + '.tune.answers.jsonl');
const others = fs.readdirSync(path.join(root, 'tq')).filter((x) => x.startsWith(ARM + '.') && x !== ARM + '.tune.answers.jsonl');
if (others.length) bad('tq extra files ' + others.join(','));
if (fs.existsSync(tf)) {
  const T = fs.readFileSync(tf, 'utf8').split('\n').filter(Boolean).map(JSON.parse); const ids = new Set(T.map((x) => x.id));
  rep.tq = { lines: T.length, all_questions: qs.every((q) => ids.has(q.id)) && ids.size === qs.length, errors: T.filter((x) => x.error).length,
    fields_ok: T.every((x) => ['id', 'answer', 'tokens', 'lookups', 'ms', 'arm', 'error'].every((k) => k in x)), other_files: others };
  if (!rep.tq.all_questions || rep.tq.errors || !rep.tq.fields_ok) bad('tq ' + JSON.stringify(rep.tq));
} else bad('tq answer file missing');
if (oldDir) {
  old.changed_configs = Object.entries(old.by_config).filter(([, v]) => v.no_old_file || v.ranked_sha_changed || v.content_changed).map(([k, v]) => ({ name: k, ...v }));
  delete old.by_config; rep.old_vs_new = old;
}
console.log(JSON.stringify(rep, null, 1));
