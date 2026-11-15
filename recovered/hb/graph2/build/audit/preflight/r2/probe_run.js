'use strict';
// Re-audit 2, check 7 (supporting run, NO held-out question): the 7 probe questions of pre-flight fix
// round 1 (ids 901-907, tmp/lock/preflight1/probe_questions.jsonl; none has the target of a held-out
// question, checked before running) through each arm's own tq() on the frozen graph, to see the new
// target shapes ({path} other_half, {routes}, shop/X, {config}, {env}) answered alike by the three typed
// arms. Run inside graphtest:1 with /build/sealed hidden.
// usage: node probe_run.js <probe_questions.jsonl> <out.json>
const fs = require('fs');
const P = require('/build/arms/common/paths');
const { graphFor, openArm } = require('/build/arms/common/arms');
const qs = fs.readFileSync(process.argv[2], 'utf8').split('\n').filter(Boolean).map(JSON.parse);
(async () => {
  const G = graphFor(P.FROZEN);
  const ans = {};
  for (const a of ['relational', 'ladybug', 'duckpgq', 'search']) {
    const arm = await openArm(a, G);
    ans[a] = {};
    for (const q of qs) {
      let r; try { r = await arm.tq(q); r = r && typeof r === 'object' && !Array.isArray(r) && 'answer' in r ? r.answer : r; } catch (e) { r = { error: String(e.message || e) }; }
      ans[a][q.id] = r;
    }
    await arm.close();
  }
  const rows = qs.map((q) => {
    const t = ['relational', 'ladybug', 'duckpgq'].map((a) => JSON.stringify(ans[a][q.id]));
    return { id: q.id, kind: q.kind, typed_identical: t[0] === t[1] && t[1] === t[2], rel_eq_duck: t[0] === t[2], rel_eq_lb: t[0] === t[1], sizes: t.map((x) => x.length), lb: t[1].slice(0, 200), rel: t[0].slice(0, 200) };
  });
  fs.writeFileSync(process.argv[3], JSON.stringify({ rows, ans }, null, 1));
  for (const r of rows) console.log(r.id, r.kind, 'typed identical', r.typed_identical, 'rel=duck', r.rel_eq_duck, 'rel=lb', r.rel_eq_lb, r.sizes.join('/'), r.typed_identical ? '' : 'lb ' + r.lb + ' | rel ' + r.rel);
})().catch((e) => { console.error(e); process.exit(2); });
