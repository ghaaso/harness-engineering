'use strict';
// Grader, graphify tuning (protocol addendum 7 items 9 and 10; addendum 4 item 1 tie order).
//   node grade.js
// 1. checks the 30 graphify tuning answer files (complete, stored format, budgets respected);
// 2. scores them with the shared scorer build/arms/common/score.js, rule content, against the TUNE
//    references sealed/grader/refs_tune.jsonl (the same file and scorer the finished test used);
// 3. recomputes the frozen arms' TUNE numbers from their stored answer files the same way;
// 4. gives each graphify configuration a complexity count and applies the selection rule of
//    sealed/grader/stage2/select.js (best = highest T1 TUNE primary; eligible = primary >= best - se(best);
//    lowest complexity; ties by higher T1 primary, lower median tokens of the 8,000-token T1 answer, name).
// Writes (this folder only): checks.json, scores.json (aggregates), clusters.jsonl and tasks.jsonl.gz
// (per-commit and per-task values; grader-only), selection.json, progress.log.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const G = path.resolve(__dirname, '..');
const BUILD = path.resolve(G, '..', '..', 'build');
const S = require(path.join(BUILD, 'arms', 'common', 'score'));
const H = require(path.join(BUILD, 'arms', 'common', 'harness'));
const LIB = require(path.join(G, 'adapter', 'lib'));
const OUT = __dirname;
const SETS = ['T1', 'T1x', 'T2'];
const BUDGETS = [2000, 4000, 8000, 16000];
const r4 = (x) => (x == null ? null : Math.round(x * 1e4) / 1e4);
const cmpName = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const log = (m) => { const l = new Date().toISOString() + ' ' + m; console.log(l); fs.appendFileSync(path.join(OUT, 'progress.log'), l + '\n'); };

// ---------- inputs
const refs = S.readRefs(path.join(BUILD, 'sealed', 'grader', 'refs_tune.jsonl'));
for (const r of refs.values()) if (r.split !== 'tune') throw new Error('non-tune reference');
const tasks = fs.readFileSync(path.join(BUILD, 'tasks', 'tasks.jsonl'), 'utf8').split('\n').filter(Boolean).map(JSON.parse);
const tuneIds = {}; for (const s of SETS) tuneIds[s] = new Set(tasks.filter((t) => t.set === s && t.split === 'tune').map((t) => t.id));
const cfgJson = JSON.parse(fs.readFileSync(path.join(G, 'answers', 'tune', 'configs.json'), 'utf8'));
const adapterNow = LIB.adapterHash(path.join(G, 'adapter'));
const cfgNow = LIB.configsAll();

// ---------- complexity (addendum 3 item 10 idea, as the task states it for graphify)
// 1 for the base command; +1 a non-default depth (any call with --depth); +1 a non-default budget (any
// call with --budget, or explain --all, which lifts explain's default cap of 20 connections); +1 a
// non-default traversal order (--dfs); +1 a union of two commands (calls of two different graphify
// commands). The same command issued on the definition and on its file is the one seed of the task
// (file plus definition), not a union. --seed is the input of query, not an option, and adds nothing.
// Variants for a sensitivity check: seedOpt (+1 for --seed), allFree (--all adds nothing),
// sameCmdUnion (the same command on two targets counts as a union).
function complexity(calls, v = {}) {
  const parts = { base_command: 1 };
  const cmds = new Set(calls.map((c) => c.cmd));
  if (calls.some((c) => c.depth != null)) parts.non_default_depth = 1;
  if (calls.some((c) => c.budget != null || (c.all && !v.allFree))) parts.non_default_budget = 1;
  if (calls.some((c) => c.dfs)) parts.non_default_order = 1;
  if (cmds.size > 1 || (v.sameCmdUnion && calls.length > 1 && calls.filter((c) => c.cmd !== 'query').length > 1)) parts.union_of_commands = 1;
  if (v.seedOpt && calls.some((c) => c.mode === 'seed')) parts.seed_option = 1;
  return { total: Object.values(parts).reduce((a, b) => a + b, 0), parts };
}

// ---------- 1. checks
const stored = {}; // reference format: the frozen typed arm's stored tuning answers
for (const s of SETS) stored[s] = H.readGzJsonl(path.join(BUILD, 'results', 'relational', 'tune', '95e990307da3b42b.' + s + '.jsonl.gz'));
const keysOf = (o) => Object.keys(o).sort().join(',');
const refRec = {}; for (const s of SETS) { const a = stored[s].find((x) => x.items.length && x.budgets['8000'].cut) || stored[s][0]; refRec[s] = { rec: keysOf(a), item: keysOf(a.items[0]), budget: keysOf(a.budgets['8000']) }; }
const checks = { adapter_hash_recomputed: adapterNow.hash, adapter_hash_in_configs_json: cfgJson.adapter.hash, adapter_hash_equal: adapterNow.hash === cfgJson.adapter.hash, files: [], problems: [] };
const P = (m) => checks.problems.push(m);
for (const c of cfgJson.configs) {
  const now = cfgNow.find((x) => x.name === c.name);
  if (!now || now.hash !== c.hash) P(c.name + ': configuration hash in configs.json ' + c.hash + ' differs from configs.js ' + (now && now.hash));
}
if (cfgJson.configs.length !== 10 || cfgNow.length !== 10) P('expected 10 configurations');
const answers = {}; // name -> set -> records
for (const c of cfgJson.configs) {
  answers[c.name] = {};
  for (const s of SETS) {
    const f = path.join(G, 'answers', 'tune', c.hash + '.' + s + '.jsonl.gz');
    const fc = { file: path.basename(f), config: c.name, set: s, records: 0, missing: 0, duplicates: 0, extra: 0, format_mismatch: 0, over_budget: 0, padded_items: 0, empty: 0, empty_without_reason: 0 };
    if (!fs.existsSync(f)) { P('missing file ' + f); checks.files.push(fc); continue; }
    const recs = H.readGzJsonl(f); answers[c.name][s] = recs; fc.records = recs.length;
    const seen = new Set();
    for (const a of recs) {
      if (seen.has(a.id)) fc.duplicates++; seen.add(a.id);
      if (!tuneIds[s].has(a.id)) fc.extra++;
      let bad = a.arm !== 'graphify' || a.config_hash !== c.hash || a.set !== s || a.split !== 'tune' || a.granularity !== 'file' || a.form !== 'signature' || (a.pad || 'none') !== 'none' || a.config_name !== c.name;
      if (keysOf(a) !== refRec[s].rec) bad = true;
      for (const it of a.items) { if (keysOf(it) !== refRec[s].item) bad = true; if (it.pad) fc.padded_items++; }
      for (const b of BUDGETS) {
        const bb = a.budgets[String(b)];
        if (!bb) { bad = true; continue; }
        if (keysOf(bb) !== refRec[s].budget) bad = true;
        let shown = 0; for (let i = 0; i < bb.n_full; i++) shown += a.items[i].tok;
        if (bb.cut) shown += bb.cut.tok;
        if (shown > b || bb.used > b) fc.over_budget++;
      }
      if (bad) fc.format_mismatch++;
      if (!a.items.length) { fc.empty++; if (!(a.meta && a.meta.empty_reason)) fc.empty_without_reason++; }
    }
    for (const id of tuneIds[s]) if (!seen.has(id)) fc.missing++;
    for (const k of ['missing', 'duplicates', 'extra', 'format_mismatch', 'over_budget', 'padded_items', 'empty_without_reason']) if (fc[k]) P(fc.file + ': ' + k + ' ' + fc[k]);
    if (fc.records !== tuneIds[s].size) P(fc.file + ': ' + fc.records + ' records, expected ' + tuneIds[s].size);
    checks.files.push(fc);
  }
}
checks.ok = checks.problems.length === 0;
fs.writeFileSync(path.join(OUT, 'checks.json'), JSON.stringify(checks, null, 1));
log('checks: ' + checks.files.length + ' files, problems ' + checks.problems.length + (checks.problems.length ? ': ' + checks.problems.slice(0, 5).join('; ') : ''));

// ---------- 2 and 3. scoring
const clusters = []; const per = []; const rows = [];
function scoreOne(arm, name, hash, file, set, extra) {
  const res = S.scoreFile(file, refs, { rule: 'content' });
  if (res.length !== 1) throw new Error(file + ': ' + res.length + ' groups');
  const g = res[0];
  const key = { arm, name, config_hash: hash, set };
  for (const r of g._rows) clusters.push({ ...key, ...r });
  for (const t of g._per) per.push({ ...key, ...t });
  const m = g.metrics;
  const recs = H.readGzJsonl(file);
  const row = { ...key, tasks: g.tasks, commits: g.clusters, missing_refs: g.missing_refs, zero_unit_refs: g.zero_unit_refs,
    primary: m.primary.mean, se: m.primary.se, r2000: m.r2000.mean, r4000: m.r4000.mean, r16000: m.r16000.mean, auc: m.auc.mean,
    tok8000_median: m.tok8000.median_over_tasks, tok2000_median: m.tok2000.median_over_tasks, tok16000_median: m.tok16000.median_over_tasks,
    file_r10: m.file_r10.mean, mrr: m.mrr.mean, precision8000: m.precision8000.mean,
    empty_answers: recs.filter((a) => !a.items.length).length,
    lookups_median: S.median(recs.map((a) => a.lookups).filter((v) => v != null)), ...extra };
  rows.push(row);
  return row;
}
for (const c of cfgJson.configs) {
  const now = cfgNow.find((x) => x.name === c.name);
  const cx = complexity(now.cfg.graphify.calls);
  for (const s of SETS) scoreOne('graphify', c.name, c.hash, path.join(G, 'answers', 'tune', c.hash + '.' + s + '.jsonl.gz'), s, { complexity: cx.total, complexity_parts: cx.parts, user: now.user });
  log('scored ' + c.name);
}
const FROZEN_ARMS = [
  { arm: 'relational', label: 'typed primary (relational = LadybugDB = DuckPGQ)', hash: '95e990307da3b42b' },
  { arm: 'search', label: 'scripted search primary', hash: 'e70177e5807f0252' },
  { arm: 'floor-co', label: 'changed-together floor', hash: 'c4d2f0a60a3d199c' },
  { arm: 'floor-dir', label: 'same-folder floor', hash: '714a474060653c1f' },
];
for (const f of FROZEN_ARMS) for (const s of SETS) scoreOne(f.arm, f.label, f.hash, path.join(BUILD, 'results', f.arm, 'tune', f.hash + '.' + s + '.jsonl.gz'), s, {});
log('scored frozen arms');
fs.writeFileSync(path.join(OUT, 'scores.json'), JSON.stringify(rows.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, typeof v === 'number' && !Number.isInteger(v) ? r4(v) : v]))), null, 1));
fs.writeFileSync(path.join(OUT, 'clusters.jsonl'), clusters.map((x) => JSON.stringify(x)).join('\n') + '\n');
fs.writeFileSync(path.join(OUT, 'tasks.jsonl.gz'), zlib.gzipSync(per.map((x) => JSON.stringify(x)).join('\n') + '\n'));

// ---------- 4. selection (rule of sealed/grader/stage2/select.js, addendum 4 item 1)
function select(variant) {
  const cand = cfgJson.configs.map((c) => {
    const now = cfgNow.find((x) => x.name === c.name);
    const t1 = rows.find((r) => r.arm === 'graphify' && r.name === c.name && r.set === 'T1');
    return { name: c.name, config_hash: c.hash, complexity: complexity(now.cfg.graphify.calls, variant).total, primary: t1.primary, se: t1.se, tok: t1.tok8000_median };
  });
  cand.sort((a, b) => b.primary - a.primary || a.complexity - b.complexity || a.tok - b.tok || cmpName(a.name, b.name));
  const best = cand[0]; const thr = best.primary - best.se;
  const elig = cand.filter((x) => x.primary >= thr);
  const pick = [...elig].sort((a, b) => a.complexity - b.complexity || b.primary - a.primary || a.tok - b.tok || cmpName(a.name, b.name));
  const ch = pick[0]; const nx = pick[1];
  const why = !(nx && nx.complexity === ch.complexity) ? 'lowest complexity among the eligible'
    : nx.primary !== ch.primary ? 'tie on complexity, broken by higher T1 TUNE primary'
    : nx.tok !== ch.tok ? 'tie on complexity and primary, broken by lower median tokens' : 'tie broken by name';
  return { best: { name: best.name, config_hash: best.config_hash, primary: r4(best.primary), se: r4(best.se), complexity: best.complexity }, threshold: r4(thr),
    eligible: pick.map((x) => ({ name: x.name, complexity: x.complexity, primary: r4(x.primary), tok8000_median: x.tok })),
    chosen: { name: ch.name, config_hash: ch.config_hash, complexity: ch.complexity, primary: r4(ch.primary), se: r4(ch.se), tok8000_median: ch.tok, reason: why } };
}
const sel = select({});
const sens = { seed_option_counts: select({ seedOpt: true }).chosen, explain_all_free: select({ allFree: true }).chosen, same_command_on_two_targets_is_union: select({ sameCmdUnion: true }).chosen,
  all_three: select({ seedOpt: true, allFree: true, sameCmdUnion: true }).chosen };
const selection = { rule: 'Highest T1 TUNE primary; eligible = primary >= best primary - se of the best (standard error over commits); among the eligible the lowest complexity; ties by higher T1 TUNE primary, then lower median tokens of the 8,000-token T1 answer, then name (addendum 4 item 1; code of sealed/grader/stage2/select.js).',
  complexity_rule: '1 base command; +1 non-default depth; +1 non-default budget (--budget, or explain --all); +1 non-default traversal order (--dfs); +1 union of two different graphify commands. Same command on definition and file = one seed, not a union; --seed adds nothing.',
  generated: new Date().toISOString(), ...sel, sensitivity_of_choice_to_complexity_reading: sens,
  adapter_code_hash: adapterNow.hash };
fs.writeFileSync(path.join(OUT, 'selection.json'), JSON.stringify(selection, null, 1));
log('selection: best ' + sel.best.name + ' ' + sel.best.primary + ' +- ' + sel.best.se + ', threshold ' + sel.threshold + ', chosen ' + sel.chosen.name + ' (' + sel.chosen.config_hash + ') ' + sel.chosen.primary + ' cx ' + sel.chosen.complexity + ' [' + sel.chosen.reason + ']');
for (const [k, v] of Object.entries(sens)) log('  sensitivity ' + k + ': ' + v.name);
// console table
for (const s of SETS) {
  console.log('\n' + s);
  for (const r of rows.filter((x) => x.set === s)) console.log([r.arm, r.name, r.complexity == null ? '' : 'cx' + r.complexity, 'P=' + r4(r.primary), 'se=' + r4(r.se), 'r2k=' + r4(r.r2000), 'r4k=' + r4(r.r4000), 'r16k=' + r4(r.r16000), 'tok=' + r.tok8000_median, 'empty=' + r.empty_answers, 'n=' + r.tasks + '/' + r.commits].join(' '));
}
