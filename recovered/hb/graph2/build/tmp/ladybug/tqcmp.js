// Compare the Cypher TQ answers with the relational arm's SQL answers (in process, nothing written to
// the relational arm's files; the reference answers are not read).
const fs = require('fs');
const path = require('path');
const P = require('/build/arms/common/paths');
const { graphFor, openArm } = require('/build/arms/common/arms');
const RT = require('/build/arms/relational/tq');
const LT = require('/build/arms/ladybug/tq');
(async () => {
  const qs = fs.readFileSync(path.join(P.TASKS, 'tq_questions.jsonl'), 'utf8').split('\n').filter(Boolean).map(JSON.parse).filter((q) => q.split === 'tune');
  const G = graphFor(P.FROZEN);
  const rel = await openArm('relational', G); const lb = { raw: require('/build/arms/ladybug/arm').openInProc(G, { store: P.storeFor('ladybug') }) }; lb.close = () => lb.raw.close();
  let same = 0; const diffs = [];
  for (const q of qs) {
    let a; let b;
    try { a = RT.answer(rel.raw.db, q, RT.target(q)); } catch (e) { a = 'ERR ' + e.message; }
    try { b = LT.answer(lb.raw.lb, q).answer; } catch (e) { b = 'ERR ' + e.message; }
    if (JSON.stringify(a) === JSON.stringify(b)) same++; else diffs.push({ id: q.id, kind: q.kind, rel: JSON.stringify(a).slice(0, 400), lb: JSON.stringify(b).slice(0, 400) });
  }
  console.log(JSON.stringify({ questions: qs.length, identical: same }));
  for (const d of diffs) console.log(JSON.stringify(d));
  await rel.close(); await lb.close();
})();
