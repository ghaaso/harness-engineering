'use strict';
// Tuner lane (relational): structural check of the stage-2 answer files (no scoring, no sealed data).
//   node verify_stage2.js <dir holding out_T1, out_T1x, out_T2>
// Per answer: config_hash equals the file's; split tune; set; every budget used <= budget, used
// recomputed from the items equals the logged value, head_tok + tail_tok equal the shown items' tokens,
// n_full + cut + beyond = n_units; the four budgets; lookups = 1 + PAD_LOOKUPS[pad], meta null.
// Per arm and set: every stage-2 configuration present for every TUNE task (no duplicates, no extra or
// held-out ids); reference runs every configuration except the x_ entry. Relational and reference
// answers identical apart from arm and timing. Timing: median and 95th percentile engine_ms per config.
const fs = require('fs');
const path = require('path');
const B = process.env.GT_BUILD || path.resolve(__dirname, '..', '..');
const H = require(path.join(B, 'arms/common/harness'));
const C = require(path.join(B, 'arms/common/config'));
const { countTokens } = require(path.join(B, 'arms/common/tokenizer'));
const root = process.argv[2];
const SETS = ['T1', 'T1x', 'T2'];
const list = H.loadArmList('relational', 2, false).list;
const report = { list_hash: H.loadArmList('relational', 2, false).hash, sets: {}, timing: {}, problems: [], n_problems: 0 };
const bad = (m) => { if (report.problems.length < 200) report.problems.push(m); report.n_problems++; };
const strip = (a) => JSON.stringify({ ...a, arm: null, ms: null, engine_ms: null });
const q = (x, p) => { const s = [...x].sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : null; };

function checkAnswer(a, f, hash, set) {
  if (a.config_hash !== hash) bad(f + ' ' + a.id + ' config_hash');
  if (a.split !== 'tune') bad(f + ' ' + a.id + ' split ' + a.split);
  if (a.set !== set) bad(f + ' ' + a.id + ' set ' + a.set);
  for (const [bs, v] of Object.entries(a.budgets)) {
    const b = Number(bs);
    if (v.used > b) bad(f + ' ' + a.id + ' over budget ' + b + ': ' + v.used);
    let t = 0; let ht = 0; let tt = 0;
    for (let k = 0; k < v.n_full; k++) { const it = a.items[k]; t += it.tok; if (it.pad) tt += it.tok; else ht += it.tok; }
    if (v.cut) { t += v.cut.tok; if (v.cut.pad) tt += v.cut.tok; else ht += v.cut.tok; }
    const allFit = !v.cut && v.beyond === 0 && v.n_full === a.n_units;
    if (!allFit) t += countTokens('[+' + v.beyond + ' more not shown]\n');
    if (t !== v.used) bad(f + ' ' + a.id + ' budget ' + b + ' used ' + v.used + ' recomputed ' + t);
    if (ht !== v.head_tok || tt !== v.tail_tok) bad(f + ' ' + a.id + ' budget ' + b + ' head/tail tok');
    if (v.n_full + (v.cut ? 1 : 0) + v.beyond !== a.n_units) bad(f + ' ' + a.id + ' n_full+cut+beyond');
  }
  if (Object.keys(a.budgets).sort().join() !== ['16000', '2000', '4000', '8000'].sort().join()) bad(f + ' ' + a.id + ' budgets');
  if (a.lookups !== 1 + H.PAD_LOOKUPS[a.pad] || a.lookups_head !== 1 || a.meta !== null) bad(f + ' ' + a.id + ' lookups/meta');
}

for (const s of SETS) {
  const ids = new Set(H.loadTasks([s], 'tune').map((t) => t.id));
  const r = { tasks: ids.size, relational_files: 0, reference_files: 0, answers: 0, over_budget: 0, rel_vs_ref_compared: 0, rel_vs_ref_ranked_differ: 0, rel_vs_ref_answers_differ: 0 };
  for (const c of list) {
    const ext = C.isExtension(c.cfg);
    const T = report.timing[c.name] = report.timing[c.name] || { ext, rel_ms: [], ref_ms: [] };
    const per = {};
    for (const arm of ext ? ['relational'] : ['relational', 'reference']) {
      const f = path.join(root, 'out_' + s, arm, 'tune', c.hash + '.' + s + '.jsonl.gz');
      if (!fs.existsSync(f)) { bad('missing ' + arm + ' ' + c.name + ' ' + s); continue; }
      r[arm + '_files']++;
      const A = H.readGzJsonl(f); const seen = new Set();
      for (const a of A) {
        if (seen.has(a.id)) bad(f + ' duplicate ' + a.id); seen.add(a.id);
        if (!ids.has(a.id)) bad(f + ' unexpected id ' + a.id);
        for (const [k, v] of Object.entries(a.budgets)) if (v.used > Number(k)) r.over_budget++;
        checkAnswer(a, path.basename(f), c.hash, s); r.answers++;
        if (arm === 'relational' && a.engine_ms != null) T.rel_ms.push(a.engine_ms);
        if (arm === 'reference' && a.engine_ms != null) T.ref_ms.push(a.engine_ms);
      }
      for (const id of ids) if (!seen.has(id)) bad(f + ' missing task ' + id);
      per[arm] = new Map(A.map((a) => [a.id, a]));
    }
    if (ext) { const f = path.join(root, 'out_' + s, 'reference', 'tune', c.hash + '.' + s + '.jsonl.gz'); if (fs.existsSync(f)) bad('reference ran the x_ entry ' + c.name); }
    if (per.relational && per.reference) {
      for (const [id, a] of per.relational) {
        const b = per.reference.get(id); r.rel_vs_ref_compared++;
        if (!b) { r.rel_vs_ref_answers_differ++; continue; }
        if (a.ranked_sha !== b.ranked_sha) r.rel_vs_ref_ranked_differ++;
        if (strip(a) !== strip(b)) r.rel_vs_ref_answers_differ++;
      }
    }
  }
  const sf = path.join(root, 'out_' + s, 'sweep', 'summary.stage2.json');
  if (fs.existsSync(sf)) { const sm = JSON.parse(fs.readFileSync(sf, 'utf8')); r.sweep_summary = { tasks: sm.tasks, parents: sm.parents, mismatches: sm.crosscheck.mismatches, pairs: Object.fromEntries(Object.entries(sm.crosscheck.pairs).map(([k, v]) => [k, { compared: v.compared, equiv_fail: v.equiv_fail, strict_ranked_fail: v.strict_ranked_fail, strict_answer_fail: v.strict_answer_fail, answers_differ: v.answers_differ }])), wall_s: sm.wall_s, extension_runs_skipped: sm.extension_runs_skipped, seed_match: sm.seed_match };
    const tot = { relational: 0, reference: 0 }; for (const [k, v] of Object.entries(sm.timing)) tot[k.split('|')[0]] += v.wall_total_s; r.rank_wall_total_s = tot; }
  else bad('no summary.stage2.json for ' + s);
  if (r.rel_vs_ref_ranked_differ || r.rel_vs_ref_answers_differ) bad('relational vs reference differ in ' + s);
  report.sets[s] = r;
}
for (const [n, T] of Object.entries(report.timing)) report.timing[n] = { ext: T.ext, n: T.rel_ms.length, rel_p50_ms: q(T.rel_ms, 0.5), rel_p95_ms: q(T.rel_ms, 0.95), ref_p50_ms: q(T.ref_ms, 0.5), ref_p95_ms: q(T.ref_ms, 0.95) };
console.log(JSON.stringify(report, null, 1));
