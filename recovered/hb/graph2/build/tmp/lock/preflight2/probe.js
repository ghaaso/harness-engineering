'use strict';
// Pre-flight fix round 2: the probe questions of this lane (tmp/lock/preflight2/probe_questions.jsonl:
// round 1's 901-907 unchanged, plus 908 and 909 for the absent-member rule). Not held-out questions;
// no reference answer exists. Checks, per question:
//   (1) no arm throws; (2) relational, ladybug and duckpgq return identical answers (7 of 7 on 901-907
//   is the auditor's condition; 908 and 909 too); (3) 907 equals the merge of the stored TUNE answers
//   of questions 7 and 15 in each typed arm; (4) 908 names an absent member of
//   JobService.submit_completion, so each typed arm must answer it exactly as it answers 902; (5) 909
//   names a symbol of a file that does not exist: no error, an empty answer in each typed arm.
// Inside graphtest:1 with /build/sealed hidden:  node tmp/lock/preflight2/probe.js
const fs = require('fs');
const path = require('path');
const B = process.env.GT_BUILD || path.resolve(__dirname, '..', '..', '..');
const P = require(path.join(B, 'arms/common/paths'));
const { graphFor, openArm } = require(path.join(B, 'arms/common/arms'));
const { target } = require(path.join(B, 'arms/common/tqtarget'));
const TYPED = ['relational', 'ladybug', 'duckpgq'];

(async () => {
  const qs = fs.readFileSync(path.join(__dirname, 'probe_questions.jsonl'), 'utf8').split('\n').filter(Boolean).map(JSON.parse);
  const G = graphFor(P.FROZEN);
  const res = {};
  for (const arm of [...TYPED, 'search']) {
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
    const t = TYPED.map((arm) => JSON.stringify(res[arm][q.id].answer));
    row.typed_identical = t[0] === t[1] && t[1] === t[2];
    if (!row.typed_identical) problems++;
    row.typed_answers = Object.fromEntries(TYPED.map((arm) => [arm, res[arm][q.id].answer]));
    row.search_answer = res.search[q.id].answer;
    if (q.id === 907) {
      row.merge_of_tune_7_and_15 = {};
      for (const arm of TYPED) {
        const s = stored(arm); const a7 = s.get(7); const a15 = s.get(15);
        const want = { call_sites: merge(a7.call_sites, a15.call_sites), via_bff: merge(a7.via_bff, a15.via_bff), direct_callers: merge(a7.direct_callers, a15.direct_callers) };
        const ok = JSON.stringify(want) === JSON.stringify(res[arm][q.id].answer);
        row.merge_of_tune_7_and_15[arm] = ok; if (!ok) problems++;
      }
    }
    if (q.id === 908) {
      row.equals_902 = {};
      for (const arm of TYPED) { const ok = JSON.stringify(res[arm][908].answer) === JSON.stringify(res[arm][902].answer) && Array.isArray(res[arm][908].answer) && res[arm][908].answer.length > 0; row.equals_902[arm] = ok; if (!ok) problems++; }
    }
    if (q.id === 909) {
      row.empty = {};
      for (const arm of TYPED) { const ok = Array.isArray(res[arm][909].answer) && res[arm][909].answer.length === 0; row.empty[arm] = ok; if (!ok) problems++; }
    }
    rows.push(row);
  }
  const first7 = rows.filter((r) => r.id <= 907);
  const out = { questions: qs.length, arms: Object.keys(res), problems, typed_identical_901_907: first7.filter((r) => r.typed_identical).length + ' of ' + first7.length, rows };
  fs.writeFileSync(path.join(__dirname, 'probe.json'), JSON.stringify(out, null, 1));
  for (const r of rows) console.log(r.id, r.kind, JSON.stringify(r.target), 'errors', JSON.stringify(r.errors), 'typed identical', r.typed_identical, 'sizes', JSON.stringify(r.sizes), r.merge_of_tune_7_and_15 ? 'merge ' + JSON.stringify(r.merge_of_tune_7_and_15) : '', r.equals_902 ? 'equals 902 ' + JSON.stringify(r.equals_902) : '', r.empty ? 'empty ' + JSON.stringify(r.empty) : '');
  console.log(JSON.stringify({ problems, typed_identical_901_907: out.typed_identical_901_907 }));
  process.exit(problems ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
