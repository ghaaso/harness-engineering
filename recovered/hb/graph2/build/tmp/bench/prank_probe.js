'use strict';
// Pre-flight fix round 1: why does the LadybugDB stored page_rank sum move after the update measure?
// (a) page_rank re-run on an unchanged fresh store; (b) after one delete + re-insert of a file.
// Inside graphtest:1, TUNE graph of the smoke plan only.
const fs = require('fs');
const path = require('path');
const L = require('../../bench/lib');
const A = require('../../bench/ladybug');
const { UPD, selection } = require('../../bench/update');
(async () => {
  const plan = L.readPlan(); const g = plan.graphs.tune; const { G } = L.graphFacts(g.sha);
  const root = '/benchstore/prank-probe'; fs.rmSync(root, { recursive: true, force: true });
  const b = await A.build(G, root);
  const U = UPD.ladybug; const h = await U.open(G, b.store, root);
  const pr = () => { const r = h.run('MATCH (n:N) RETURN count(n) AS n, sum(n.prank) AS s, min(n.prank) AS lo, max(n.prank) AS hi')[0]; return JSON.parse(JSON.stringify(r, (k, v) => (typeof v === 'bigint' ? Number(v) : v))); };
  const out = { built: pr() };
  const rerun = (tag) => { h.run(`CALL PROJECT_GRAPH('pr_${tag}', ['N'], {'A': '${h.S.PR_FILTER}'})`); h.run(`CALL page_rank('pr_${tag}') WITH node, rank SET node.prank = rank`); h.run(`CALL DROP_PROJECTED_GRAPH('pr_${tag}')`); };
  rerun('a'); out.rerun_unchanged = pr();
  rerun('b'); out.rerun_unchanged_again = pr();
  const F = g.seeds[0].seed.path; const sel = selection(G, F);
  U.update(h, G, sel); out.after_update = pr(); out.file = F; out.nodes_reinserted = sel.X.length;
  out.offsets = h.run('MATCH (n:N) RETURN max(offset(id(n))) AS mo, count(n) AS n').map((r) => JSON.parse(JSON.stringify(r, (k, v) => (typeof v === 'bigint' ? Number(v) : v))));
  await U.close(h);
  fs.writeFileSync(path.join(__dirname, 'prank_probe.json'), JSON.stringify(out, null, 1));
  console.log(JSON.stringify(out, null, 1));
  fs.rmSync(root, { recursive: true, force: true });
})().catch((e) => { console.error(e); process.exit(1); });
