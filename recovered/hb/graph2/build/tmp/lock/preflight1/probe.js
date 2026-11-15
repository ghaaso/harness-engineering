'use strict';
// Pre-flight fix round 1: exercise the NEW target forms of arms/common/tqtarget.js on every TQ arm with
// seven probe questions written by this lane (tmp/lock/preflight1/probe_questions.jsonl). They are not
// held-out questions and have no reference answer; the check is (1) no arm throws, (2) the three typed
// arms return identical answers (the engine-equivalence rule), (3) the two-route probe 907 equals the
// merge of the stored TUNE answers of its two single-route questions (7 and 15), per typed arm.
// Inside graphtest:1 with /build/sealed hidden:  node tmp/lock/preflight1/probe.js
const fs = require('fs');
const path = require('path');
const B = process.env.GT_BUILD || path.resolve(__dirname, '..', '..', '..');
const P = require(path.join(B, 'arms/common/paths'));
const { graphFor, openArm } = require(path.join(B, 'arms/common/arms'));
const { target } = require(path.join(B, 'arms/common/tqtarget'));

(async () => {
  const qs = fs.readFileSync(path.join(__dirname, 'probe_questions.jsonl'), 'utf8').split('\n').filter(Boolean).map(JSON.parse);
  const G = graphFor(P.FROZEN);
  const res = {};
  for (const arm of ['relational', 'ladybug', 'duckpgq', 'search']) {
    const a = await openArm(arm, G);
    res[arm] = {};
    for (const q of qs) {
      let r = null; let err = null;
      try { r = await a.tq(q); } catch (e) { err = String(e.message || e); }
      const ans = r && typeof r === 'object' && !Array.isArray(r) && 'answer' in r ? r.answer : r;
      res[arm][q.id] = { answer: ans, error: err };
    }
    await a.close();
  }
  const stored = (arm) => new Map(fs.readFileSync(path.join(P.RESULTS, 'tq', arm + '.tune.answers.jsonl'), 'utf8').split('\n').filter(Boolean).map(JSON.parse).map((x) => [x.id, x.answer]));
  const byBytes = (a, b) => Buffer.compare(Buffer.from(String(a)), Buffer.from(String(b)));
  const merge = (a, b) => [...new Set([...a, ...b])].sort(byBytes);
  const rows = []; let problems = 0;
  for (const q of qs) {
    const row = { id: q.id, kind: q.kind, target: target(q), errors: {}, typed_identical: null, sizes: {} };
    for (const arm of Object.keys(res)) { if (res[arm][q.id].error) { row.errors[arm] = res[arm][q.id].error; problems++; } row.sizes[arm] = JSON.stringify(res[arm][q.id].answer).length; }
    const t = ['relational', 'ladybug', 'duckpgq'].map((arm) => JSON.stringify(res[arm][q.id].answer));
    row.typed_identical = t[0] === t[1] && t[1] === t[2];
    if (!row.typed_identical) problems++;
    row.relational_answer = res.relational[q.id].answer;
    row.search_answer = res.search[q.id].answer;
    if (q.id === 907) {
      row.merge_of_tune_7_and_15 = {};
      for (const arm of ['relational', 'ladybug', 'duckpgq']) {
        const s = stored(arm); const a7 = s.get(7); const a15 = s.get(15);
        const want = { call_sites: merge(a7.call_sites, a15.call_sites), via_bff: merge(a7.via_bff, a15.via_bff), direct_callers: merge(a7.direct_callers, a15.direct_callers) };
        const ok = JSON.stringify(want) === JSON.stringify(res[arm][q.id].answer);
        row.merge_of_tune_7_and_15[arm] = ok; if (!ok) problems++;
      }
    }
    rows.push(row);
  }
  const out = { questions: qs.length, arms: Object.keys(res), problems, rows };
  fs.writeFileSync(path.join(__dirname, 'probe.json'), JSON.stringify(out, null, 1));
  for (const r of rows) console.log(r.id, r.kind, JSON.stringify(r.target), 'errors', JSON.stringify(r.errors), 'typed identical', r.typed_identical, 'sizes', JSON.stringify(r.sizes), r.merge_of_tune_7_and_15 ? 'merge ' + JSON.stringify(r.merge_of_tune_7_and_15) : '');
  console.log(JSON.stringify({ problems }));
  process.exit(problems ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
