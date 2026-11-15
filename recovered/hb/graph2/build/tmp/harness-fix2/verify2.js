'use strict';
// Harness-fix2 lane: structural check of every answer file (no scoring, no sealed data), extending
// tmp/rerun/verify.js with the addendum-3 checks, plus a comparison against the previous answer files.
//   node verify2.js <new results root> [<old results root>]
// Per answer: config_hash equals the file's hash; split tune; for every budget, used <= budget, used
// recomputed from the items (full items + cut + footer) equals the logged value, head_tok + tail_tok
// equal the shown items' tokens, n_full + cut + beyond = n_units; the four budgets present;
// lookups = lookups_head + PAD_LOOKUPS[pad]; floors report head 0; relational/reference head 1 and
// meta null; search meta.tokens_read a number and meta.ledger_len = lookups_head.
// Per arm: every configuration present for every TUNE task of every set (no duplicates, no extra ids,
// no held-out); the floors' task ids per set equal the swept arms'. Logged list hashes equal the
// recomputed ones. Relational and reference answers identical apart from arm and timing.
// TQ: results/tq/<arm>.tune.answers.jsonl only (no other relational/search file), all questions.
// Old vs new (when an old root is given): per (arm, configuration, set, task), ranked_sha changed, and
// packed content changed (items, budgets, n_units, n_head, seeds, beyond_sample).
const fs = require('fs');
const path = require('path');
const B = process.env.GT_BUILD || path.resolve(__dirname, '..', '..');
const H = require(path.join(B, 'arms/common/harness'));
const { countTokens } = require(path.join(B, 'arms/common/tokenizer'));
const root = process.argv[2]; const oldRoot = process.argv[3] || null;
const SETS = ['T1', 'T1x', 'T2'];
const tasks = {};
for (const s of SETS) tasks[s] = new Set(H.loadTasks([s], 'tune').map((t) => t.id));
const report = { arms: {}, problems: [], n_problems: 0 };
const bad = (m) => { if (report.problems.length < 200) report.problems.push(m); report.n_problems++; };

const expected = (arm) => H.loadArmList(arm === 'reference' ? 'relational' : arm, 1, false).list.map((c) => c.hash);

function checkAnswer(arm, a, file, hash) {
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
    if (v.n_full + (v.cut ? 1 : 0) + v.beyond !== a.n_units) bad(file + ' ' + a.id + ' budget ' + b + ' n_full+cut+beyond != n_units');
  }
  if (Object.keys(a.budgets).sort().join() !== ['16000', '2000', '4000', '8000'].sort().join()) bad(file + ' ' + a.id + ' budgets');
  // lookups (addendum 3 D.11) and meta (D.12)
  if (a.lookups !== a.lookups_head + H.PAD_LOOKUPS[a.pad] || a.lookups_pad !== H.PAD_LOOKUPS[a.pad]) bad(file + ' ' + a.id + ' lookups ' + [a.lookups, a.lookups_head, a.lookups_pad, a.pad]);
  if (H.isFloor(arm) && a.lookups_head !== 0) bad(file + ' ' + a.id + ' floor head lookups ' + a.lookups_head);
  if ((arm === 'relational' || arm === 'reference') && (a.lookups_head !== 1 || a.meta !== null)) bad(file + ' ' + a.id + ' rel/ref lookups or meta');
  if (arm === 'search' && !(a.meta && typeof a.meta.tokens_read === 'number' && a.meta.ledger_len === a.lookups_head)) bad(file + ' ' + a.id + ' search meta ' + JSON.stringify(a.meta));
}

const strip = (a) => JSON.stringify({ ...a, arm: null, ms: null, engine_ms: null });
const content = (a) => JSON.stringify([a.seeds, a.seed_match, a.n_ranked, a.n_units, a.n_head, a.items, a.budgets, a.beyond_sample]);
const KNOWN = ['relational', 'reference', 'search', 'floor-dir', 'floor-co'];
const idsBySet = {};
const lookStats = {};
for (const arm of KNOWN.filter((d) => fs.existsSync(path.join(root, d, 'tune')))) {
  const want = expected(arm);
  const r = { configs_expected: want.length, files: 0, answers: 0, missing_files: 0, over_budget: 0 };
  const ls = lookStats[arm] = { head: [], total_padded: [] };
  for (const h of want) for (const s of SETS) {
    const f = path.join(root, arm, 'tune', h + '.' + s + '.jsonl.gz');
    if (!fs.existsSync(f)) { r.missing_files++; bad('missing ' + arm + ' ' + h + ' ' + s); continue; }
    r.files++;
    const A = H.readGzJsonl(f); const ids = new Set();
    for (const a of A) {
      if (ids.has(a.id)) bad(f + ' duplicate ' + a.id); ids.add(a.id);
      if (!tasks[s].has(a.id)) bad(f + ' unexpected id ' + a.id);
      if (a.set !== s) bad(f + ' set ' + a.set);
      for (const [k, v] of Object.entries(a.budgets)) if (v.used > Number(k)) r.over_budget++;
      checkAnswer(arm, a, path.basename(f), h);
      ls.head.push(a.lookups_head); if (a.pad !== 'none') ls.total_padded.push(a.lookups);
      r.answers++;
    }
    for (const id of tasks[s]) if (!ids.has(id)) bad(f + ' missing task ' + id);
    const key = [...ids].sort().join(',');
    idsBySet[s] = idsBySet[s] || {}; idsBySet[s][arm] = idsBySet[s][arm] || new Set(); idsBySet[s][arm].add(key);
  }
  report.arms[arm] = r;
}
report.lookups = Object.fromEntries(Object.entries(lookStats).map(([a, v]) => {
  const med = (x) => { const s = [...x].sort((p, q) => p - q); return s.length ? s[Math.floor(s.length / 2)] : null; };
  return [a, { head_median: med(v.head), head_max: v.head.length ? Math.max(...v.head) : null, padded_total_median: med(v.total_padded) }];
}));
// one task set for every arm, per set (floors included)
report.task_sets = {};
for (const s of SETS) {
  const per = idsBySet[s] || {}; const keys = new Set();
  for (const [arm, ks] of Object.entries(per)) { if (ks.size !== 1) bad('arm ' + arm + ' set ' + s + ' has differing task sets across configurations'); for (const k of ks) keys.add(k); }
  report.task_sets[s] = { arms: Object.keys(per), identical: keys.size === 1, tasks: tasks[s].size };
  if (keys.size !== 1) bad('set ' + s + ': arms ran different task sets');
}
// relational vs reference, answer by answer
if (report.arms.relational && report.arms.reference) {
  let n = 0; let diff = 0; let rdiff = 0;
  for (const h of expected('relational')) for (const s of SETS) {
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
  if (rdiff || diff) bad('relational vs reference differ');
}
// list hashes
const lh = {};
const lf = path.join(root, 'sweep', 'lists.jsonl');
if (fs.existsSync(lf)) for (const l of fs.readFileSync(lf, 'utf8').split('\n').filter(Boolean).map(JSON.parse)) { const k = l.arm + '|' + l.stage; lh[k] = lh[k] || new Set(); lh[k].add(l.list_hash); }
report.list_hashes = {};
for (const [k, s] of Object.entries(lh)) {
  const [arm, st] = k.split('|');
  const re = H.loadArmList(arm, Number(st), false).hash;
  report.list_hashes[k] = { logged: [...s], recomputed: re, match: s.size === 1 && s.has(re) };
  if (!report.list_hashes[k].match) bad('list hash mismatch ' + k);
}
// TQ files: one name per arm
report.tq = {};
const qs = fs.readFileSync(path.join(B, 'tasks', 'tq_questions.jsonl'), 'utf8').split('\n').filter(Boolean).map(JSON.parse).filter((q) => q.split === 'tune');
const tqDir = path.join(root, 'tq');
for (const arm of ['relational', 'search']) {
  const f = path.join(tqDir, arm + '.tune.answers.jsonl');
  const others = fs.existsSync(tqDir) ? fs.readdirSync(tqDir).filter((x) => x.startsWith(arm + '.') && x !== arm + '.tune.answers.jsonl') : [];
  if (others.length) bad('tq ' + arm + ' extra files ' + others.join(','));
  if (!fs.existsSync(f)) { report.tq[arm] = 'missing'; bad('tq ' + arm + ' missing'); continue; }
  const L = fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map(JSON.parse);
  const ids = new Set(L.map((x) => x.id));
  const r = { lines: L.length, all_questions: qs.every((q) => ids.has(q.id)) && ids.size === qs.length, errors: L.filter((x) => x.error).length,
    fields_ok: L.every((x) => ['id', 'answer', 'tokens', 'lookups', 'ms', 'arm', 'error'].every((k) => k in x)),
    tokens_recompute_equal: L.filter((x) => x.tokens === countTokens(JSON.stringify(x.answer))).length,
    tokens_median: L.map((x) => x.tokens).sort((a, b) => a - b)[Math.floor(L.length / 2)], lookups_max: Math.max(...L.map((x) => x.lookups)), other_files: others };
  if (!r.all_questions || r.errors || !r.fields_ok) bad('tq ' + arm + ' ' + JSON.stringify(r));
  report.tq[arm] = r;
}
// old vs new
if (oldRoot) {
  report.old_vs_new = {};
  for (const arm of Object.keys(report.arms)) {
    const o = { compared: 0, missing_old: 0, ranked_changed: 0, content_changed: 0, by_config: {}, examples: [] };
    const names = new Map(H.loadArmList(arm === 'reference' ? 'relational' : arm, 1, false).list.map((c) => [c.hash, c.name]));
    for (const h of expected(arm)) for (const s of SETS) {
      const fo = path.join(oldRoot, arm, 'tune', h + '.' + s + '.jsonl.gz'); const fn = path.join(root, arm, 'tune', h + '.' + s + '.jsonl.gz');
      if (!fs.existsSync(fn)) continue;
      if (!fs.existsSync(fo)) { o.missing_old++; continue; }
      const mo = new Map(H.readGzJsonl(fo).map((a) => [a.id, a]));
      for (const a of H.readGzJsonl(fn)) {
        const b = mo.get(a.id); if (!b) { o.missing_old++; continue; }
        o.compared++;
        const rc = a.ranked_sha !== b.ranked_sha; const cc = content(a) !== content(b);
        if (rc) o.ranked_changed++; if (cc) o.content_changed++;
        if (rc || cc) {
          const bc = o.by_config[names.get(h)] = o.by_config[names.get(h)] || { ranked: 0, content: 0 };
          if (rc) bc.ranked++; if (cc) bc.content++;
          if (o.examples.length < 5) o.examples.push({ config: names.get(h), set: s, id: a.id, ranked_changed: rc, n_ranked: [b.n_ranked, a.n_ranked] });
        }
      }
    }
    report.old_vs_new[arm] = o;
  }
  // old TQ answers
  report.old_vs_new.tq = {};
  for (const arm of ['relational', 'search']) {
    const fo = path.join(oldRoot, 'tq', arm + '.tune.answers.jsonl'); const fn = path.join(tqDir, arm + '.tune.answers.jsonl');
    if (!fs.existsSync(fo) || !fs.existsSync(fn)) { report.old_vs_new.tq[arm] = 'missing'; continue; }
    const mo = new Map(fs.readFileSync(fo, 'utf8').split('\n').filter(Boolean).map(JSON.parse).map((x) => [x.id, x]));
    let ch = 0; let n = 0;
    for (const x of fs.readFileSync(fn, 'utf8').split('\n').filter(Boolean).map(JSON.parse)) { n++; const y = mo.get(x.id); if (!y || JSON.stringify([x.answer, x.tokens, x.lookups]) !== JSON.stringify([y.answer, y.tokens, y.lookups])) ch++; }
    report.old_vs_new.tq[arm] = { compared: n, changed: ch };
  }
}
console.log(JSON.stringify(report, null, 1));
