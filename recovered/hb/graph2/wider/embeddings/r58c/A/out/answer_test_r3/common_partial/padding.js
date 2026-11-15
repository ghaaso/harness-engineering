'use strict';
// The shared padding tail (protocol addendum 2, B.7): one packer option, identical for every arm, and
// the only implementation of it (the search arm's own directory fill was removed; its earlier
// dirOrder/coFloor functions, from which this was ported, no longer exist).
//   pad = none | DIR | CO
//   DIR: the files directly in the seed's directory, then the same-named capability folder in every
//        runtime (shallower first, then path), then for the seed's directory and each parent up to
//        the root every file under it (shallower first, then path); each file once, never the seed.
//   CO:  co-change order from the facts' commits.jsonl (files changed together with the seed file in
//        counted ancestor commits: count desc, recency weight desc, path), then the DIR order.
// The universe is the file nodes of the canonical graph whose path is code, test or migration
// (classify() below, the same rule as arms/search/lib.js), so every tail unit is a graph node.
// Lookups of a tail (DIR 1, CO 2) are counted in arms/common/harness.js (PAD_LOOKUPS), not here.
const path = require('path');

const CODE_EXT = ['.py', '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'];
function isTestPath(p) {
  const low = p.toLowerCase(); const name = low.split('/').pop();
  return low.includes('/tests/') || low.startsWith('tests/') || low.includes('/__tests__/') ||
    name.startsWith('test_') || name.endsWith('_test.py') || name.includes('.test.') ||
    name.includes('.spec.') || name === 'conftest.py' || name.startsWith('vitest.setup') ||
    name.startsWith('jest.setup');
}
function runtimeOf(p) {
  if (p.startsWith('backend/')) return 'backend';
  if (p.startsWith('technician-app/')) return 'mobile';
  if (p.startsWith('src/') || p === 'ops-server.mjs') return 'web';
  return null;
}
function classify(p) {
  const low = p.toLowerCase();
  if (low.endsWith('.md')) return 'doc';
  if (!CODE_EXT.includes(path.posix.extname(low))) return 'other';
  if (low.includes('/alembic/versions/')) return 'migration';
  if (isTestPath(p)) return 'test';
  if (!runtimeOf(p)) return 'config_code';
  return 'code';
}
const isCTM = (p) => ['code', 'test', 'migration'].includes(classify(p));
function capabilityOf(p) {
  let m = p.match(/^backend\/app\/features\/([^/]+)\//); if (m) return m[1];
  m = p.match(/^technician-app\/src\/features\/([^/]+)\//); if (m) return m[1];
  m = p.match(/^src\/features\/([^/]+)\//); if (m) return m[1];
  return null;
}
const cmpPath = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const depth = (p) => p.split('/').length;

function universe(G) {
  if (!G._padUni) {
    const m = new Map();
    for (const n of G.nodes) if (n.kind === 'file' && n.path && isCTM(n.path) && !m.has(n.path)) m.set(n.path, n.i);
    G._padUni = { paths: [...m.keys()].sort(cmpPath), id: m };
  }
  return G._padUni;
}

// DIR order of file paths for one seed path (the seed's own file excluded).
function dirOrder(G, seedPath) {
  const uni = universe(G).paths;
  const out = []; const seen = new Set([seedPath]);
  const push = (arr) => { for (const f of arr) if (!seen.has(f)) { seen.add(f); out.push(f); } };
  const dir = path.posix.dirname(seedPath) + '/';
  push(uni.filter((f) => path.posix.dirname(f) + '/' === dir));
  const cap = capabilityOf(seedPath);
  if (cap) push(uni.filter((f) => capabilityOf(f) === cap).sort((a, b) => depth(a) - depth(b) || cmpPath(a, b)));
  const parts = seedPath.split('/');
  for (let d = parts.length - 1; d >= 0; d--) {
    const pre = parts.slice(0, d).join('/') + (d ? '/' : '');
    push(uni.filter((f) => f.startsWith(pre)).sort((a, b) => depth(a) - depth(b) || cmpPath(a, b)));
  }
  return out;
}

// A commit counts for co-change when it was used by the extractor: `used` true when the field exists,
// otherwise 2 to 30 changed files (n_files, else the length of files); `dropped` set means excluded.
function commitCounts(c) {
  if (c.dropped) return false;
  if (typeof c.used === 'boolean') return c.used;
  const n = c.n_files != null ? c.n_files : (c.files || []).length;
  return n >= 2 && n <= 30;
}

// CO order: files changed with the seed file in counted commits, by count desc, then recency weight
// (sum of 0.5^(age_days / 30), age from the newest commit in commits.jsonl) desc, then path; then DIR.
function coOrder(G, seedPath) {
  const uni = universe(G).id;
  const commits = G.commits || [];
  let tP = 0; for (const c of commits) if (c.time > tP) tP = c.time;
  const cnt = new Map(); const rec = new Map();
  for (const c of commits) {
    if (!commitCounts(c) || !(c.files || []).includes(seedPath)) continue;
    const wt = Math.pow(0.5, (tP - c.time) / 86400 / 30);
    for (const x of c.files) if (x !== seedPath && uni.has(x)) { cnt.set(x, (cnt.get(x) || 0) + 1); rec.set(x, (rec.get(x) || 0) + wt); }
  }
  const ranked = [...cnt.keys()].sort((a, b) => cnt.get(b) - cnt.get(a) || rec.get(b) - rec.get(a) || cmpPath(a, b));
  const have = new Set(ranked);
  for (const x of dirOrder(G, seedPath)) if (!have.has(x)) ranked.push(x);
  return ranked;
}

// Definition nodes of a file in line order (symbol-granularity tail units).
const DEF_KINDS = new Set(['function', 'method', 'class', 'component', 'constant', 'test', 'migration']);
function defsOf(G, p) {
  if (!G._padDefs) {
    const m = new Map();
    for (const n of G.nodes) if (n.path && n.ls && DEF_KINDS.has(n.kind)) { if (!m.has(n.path)) m.set(n.path, []); m.get(n.path).push(n.i); }
    for (const a of m.values()) a.sort((x, y) => G.nodes[x - 1].ls - G.nodes[y - 1].ls || x - y);
    G._padDefs = m;
  }
  return G._padDefs.get(p) || [];
}

// Tail units for a pad mode: file granularity = file node ids in pad order (seed file excluded);
// symbol granularity = the seed file's own definitions first, then each pad file's definitions.
function tailUnits(G, seedPath, pad, granularity) {
  if (pad === 'none' || !seedPath) return [];
  const order = pad === 'DIR' ? dirOrder(G, seedPath) : pad === 'CO' ? coOrder(G, seedPath) : null;
  if (!order) throw new Error('unknown pad ' + pad);
  const uni = universe(G).id;
  if (granularity === 'file') return order.map((p) => uni.get(p)).filter(Boolean);
  const out = [...defsOf(G, seedPath)];
  for (const p of order) for (const d of defsOf(G, p)) out.push(d);
  return out;
}

module.exports = { tailUnits, dirOrder, coOrder, classify, isCTM, capabilityOf, isTestPath, runtimeOf, commitCounts };
