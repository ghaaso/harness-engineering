'use strict';
// Audit: recount the headline tree-lane figures of k0's notes from the per-lookup log (whose every code
// the audit's own recomputation confirmed, a2_truth_all.json), and name the side-branch snapshot that is
// not an ancestor of the chain's main.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { execFileSync } = require('child_process');
const K0 = path.resolve(__dirname, '..', 'k0');
const POL = ['none', 'repo', 'file', 'fact_pos', 'fact', 'fact_sem', 'cutoff', 'cutoff_sem', 'ttl5', 'ttl20', 'never'];
const QS = JSON.parse(fs.readFileSync(path.join(K0, 'data', 'questions.json'), 'utf8')).questions;
const kindOf = new Map(QS.map((q) => [q.qid, q.kind]));
const rows = zlib.gunzipSync(fs.readFileSync(path.join(K0, 'out', 'final1', 'lookups_tree.jsonl.gz'))).toString().split('\n').filter(Boolean).map((l) => JSON.parse(l));
const out = {};
for (const grp of ['k18', 'completion']) {
  const R = rows.filter((r) => (kindOf.get(r.q) === 'completion') === (grp === 'completion') && r.o[4] !== 'C');
  const o = { lookups: R.length };
  for (let i = 2; i < POL.length; i++) {
    let h = 0; let s = 0; const qStale = new Set();
    for (const r of R) { const c = r.o[i]; if (c === 'H' || c === 'S') h++; if (c === 'S') { s++; qStale.add(r.q); } }
    o[POL[i]] = { hit_pct: +(100 * h / R.length).toFixed(1), served: h, stale: s, stale_per_served_pct: +(100 * s / Math.max(1, h)).toFixed(2), questions_with_a_stale_serve: qStale.size };
  }
  o.answer_changed = R.filter((r) => r.ch === 1).length;
  out[grp] = o;
}
const chain = JSON.parse(fs.readFileSync(path.join(K0, 'data', 'chain.json'), 'utf8'));
const { mine } = JSON.parse(fs.readFileSync(path.join(__dirname, 'mytree.json'), 'utf8'));
out.off_chain_not_ancestor_of_chain_main = [];
for (const x of chain.off_chain) {
  try { execFileSync('git', ['-C', 'C:/Users/User/Documents/projects/EMS_workshop1', 'merge-base', '--is-ancestor', x.sha, chain.main]); } catch (e) {
    const kids = Object.keys(mine).filter((s) => mine[s].parent === x.sha).length;
    const lookups = rows.filter((r) => r.s === x.sha.slice(0, 10)).length;
    out.off_chain_not_ancestor_of_chain_main.push({ sha: x.sha.slice(0, 10), tree_parent: mine[x.sha].parent && mine[x.sha].parent.slice(0, 10), gap: mine[x.sha].gap, children_in_tree: kids, lookups_logged: lookups, in_main_history: x.in_main_history });
  }
}
fs.writeFileSync(path.join(__dirname, 'a7_log.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
