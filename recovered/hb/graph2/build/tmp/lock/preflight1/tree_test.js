'use strict';
// Pre-flight fix round 1, minor defect "source tree cache keyed by sha alone": shows that a full load
// after a removal load gives the same canonical graph as a clean full load, and that a partial tree
// written by the old code is healed. TUNE parent only. Each case runs in a child process with its own
// fresh GT_SRCSTORE under /tmp (never the shared store).
//   node tmp/lock/preflight1/tree_test.js        (inside graphtest:1)
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const B = process.env.GT_BUILD || path.resolve(__dirname, '..', '..', '..');
const SHA = '7b3a745281898d3d5808c5a15c4916d1d9dbb1b4'; // a TUNE parent (the bench's tune graph)
const DOC = 'ARCHITECTURE.md';
const ROOT = '/tmp/gt-treetest';

if (process.argv[2] === 'child') {
  // child <steps json>: each step = removePaths array; prints the canonical hash of the LAST full load
  const { loadFacts, exportCanon } = require(path.join(B, 'arms/common/facts'));
  const steps = JSON.parse(process.argv[3]); const hashes = [];
  for (const rm of steps) {
    const G = loadFacts(SHA, { removePaths: rm });
    const d = fs.mkdtempSync('/tmp/gt-canon-');
    hashes.push({ removed: rm, nodes: G.nodes.length, hash: exportCanon(G, d).hash, docNodesWithText: G.nodes.filter((n) => n.path === DOC && n.text).length });
    fs.rmSync(d, { recursive: true, force: true });
  }
  process.stdout.write(JSON.stringify(hashes) + '\n');
  process.exit(0);
}

const run = (store, steps) => JSON.parse(execFileSync(process.execPath, [__filename, 'child', JSON.stringify(steps)], { env: { ...process.env, GT_SRCSTORE: store }, maxBuffer: 1 << 28 }).toString().trim().split('\n').pop());
fs.rmSync(ROOT, { recursive: true, force: true });
const out = {};
// A: clean full load on an empty store
out.clean = run(ROOT + '/A', [[]]);
// B: removal load first on an empty store, then a full load (a separate process, as a later run would be)
out.removal_then_full = [...run(ROOT + '/B', [[DOC]]), ...run(ROOT + '/B', [[]])];
// C: a partial tree as the OLD code wrote it (the clean tree minus the removed document), then a full load
fs.cpSync(ROOT + '/A', ROOT + '/C', { recursive: true });
const tf = ROOT + '/C/trees/' + SHA + '.json';
const t = JSON.parse(fs.readFileSync(tf, 'utf8')); delete t[DOC]; fs.writeFileSync(tf, JSON.stringify(t));
out.partial_tree_then_full = run(ROOT + '/C', [[]]);
out.healed_tree_has_doc = DOC in JSON.parse(fs.readFileSync(tf, 'utf8'));
out.tree_B_has_doc = DOC in JSON.parse(fs.readFileSync(ROOT + '/B/trees/' + SHA + '.json', 'utf8'));
const h0 = out.clean[0].hash;
out.verdict = out.removal_then_full[1].hash === h0 && out.partial_tree_then_full[0].hash === h0 && out.healed_tree_has_doc && out.tree_B_has_doc && out.removal_then_full[0].hash !== h0 ? 'ok' : 'FAIL';
fs.writeFileSync(path.join(__dirname, 'tree_test.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
fs.rmSync(ROOT, { recursive: true, force: true });
process.exit(out.verdict === 'ok' ? 0 : 1);
