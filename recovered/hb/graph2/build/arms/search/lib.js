'use strict';
// Shared helpers for the SEARCH arm: export a commit (git archive, parsed in memory, never the
// working tree), classify files, count tokens, map a line to its enclosing definition.
// Locations come from arms/common/paths.js (GT_REPO = /repo inside graphtest:1), tokens from the
// shared tokenizer, definitions from the canonical graph G every arm loads (no edges are used).
const path = require('path');
const { execFileSync } = require('child_process');
const P = require('../common/paths');
const { countTokens } = require('../common/tokenizer');

const CODE_EXT = ['.py', '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'];
const tokens = (s) => countTokens(s || '');

// ---- export: git archive of the commit, tar parsed in memory (nothing is written) ----
function exportTree(sha, { withDocs = false } = {}) {
  const buf = execFileSync('git', ['-C', P.REPO, 'archive', '--format=tar', sha], { maxBuffer: 1 << 30 });
  const files = new Map();
  let off = 0; let paxPath = null;
  while (off + 512 <= buf.length) {
    const h = buf.subarray(off, off + 512);
    if (h.every((b) => b === 0)) break;
    const str = (a, b) => h.subarray(a, b).toString('utf8').replace(/\0.*$/s, '');
    let name = str(0, 100);
    const prefix = str(345, 500);
    if (prefix) name = prefix + '/' + name;
    const size = parseInt(str(124, 136).trim() || '0', 8);
    const type = String.fromCharCode(h[156] || 48);
    const body = buf.subarray(off + 512, off + 512 + size);
    off += 512 + Math.ceil(size / 512) * 512;
    if (type === 'x') {
      const m = body.toString('utf8').match(/\d+ path=([^\n]*)\n/);
      paxPath = m ? m[1] : null; continue;
    }
    if (type === 'g') continue;
    if (paxPath) { name = paxPath; paxPath = null; }
    if (type !== '0' && type !== '\0') continue;
    const ext = path.extname(name).toLowerCase();
    const isCode = CODE_EXT.includes(ext);
    if (!isCode && !(withDocs && ext === '.md')) continue;
    if (body.includes(0)) continue;
    files.set(name, body.toString('utf8'));
  }
  return files;
}

// ---- classification (same rule as research/scoring/history_stats.py classify) ----
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
  if (!CODE_EXT.includes(path.extname(low))) return 'other';
  if (low.includes('/alembic/versions/')) return 'migration';
  if (isTestPath(p)) return 'test';
  if (!runtimeOf(p)) return 'config_code';
  return 'code';
}
const isCTM = (p) => ['code', 'test', 'migration'].includes(classify(p));

// ---- capability folder (same-named folder per runtime) ----
function capabilityOf(p) {
  let m = p.match(/^backend\/app\/features\/([^/]+)\//); if (m) return m[1];
  m = p.match(/^technician-app\/src\/features\/([^/]+)\//); if (m) return m[1];
  m = p.match(/^src\/features\/([^/]+)\//); if (m) return m[1];
  return null;
}
const CAP_ROOTS = ['backend/app/features/', 'src/features/', 'technician-app/src/features/'];

// ---- definition nodes of the canonical graph G (node table only; no edges are used) ----
// Each record carries the graph's integer id `i`, so a hit maps to a node without any lookup by name.
const SYM_KINDS = new Set(['function', 'method', 'class', 'component', 'test', 'constant']);
function nodesFromG(G) {
  const byPath = new Map();
  for (const n of G.nodes) {
    if (!SYM_KINDS.has(n.kind) || !n.path || !n.ls) continue;
    // qualified name as the seeds write it: Owner.member for members
    const q = n.sid.includes('#') ? n.sid.slice(n.sid.indexOf('#') + 1) : n.name;
    const rec = { i: n.i, sid: n.sid, name: q, kind: n.kind, start: n.ls, end: n.le || n.ls, signature: n.signature || '', tokens: n.tokens };
    if (!byPath.has(n.path)) byPath.set(n.path, []);
    byPath.get(n.path).push(rec);
  }
  for (const arr of byPath.values()) arr.sort((a, b) => a.start - b.start || b.end - a.end || a.i - b.i);
  return byPath;
}
// file node id by path (file or doc nodes)
function fileIdsFromG(G) {
  const m = new Map();
  for (const n of G.nodes) if ((n.kind === 'file' || n.kind === 'doc') && n.path && !m.has(n.path)) m.set(n.path, n.i);
  return m;
}
function enclosing(nodesByPath, p, line) {
  const arr = nodesByPath.get(p); if (!arr) return null;
  let best = null;
  for (const n of arr) {
    if (n.start > line) break;
    if (n.end >= line && (!best || n.end - n.start <= best.end - best.start)) best = n;
  }
  return best;
}

module.exports = { CODE_EXT, tokens, exportTree, isTestPath, runtimeOf,
  classify, isCTM, capabilityOf, CAP_ROOTS, nodesFromG, fileIdsFromG, enclosing };
