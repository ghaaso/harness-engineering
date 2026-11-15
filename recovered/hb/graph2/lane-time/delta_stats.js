'use strict';
// Read-only: size of the fact delta between each snapshot and its first-parent-tree parent (189 steps).
// Reads build/facts/cache/<sha>/{nodes,edges}.jsonl and wider/k0/data/tree.json. Writes only to stdout.
const fs = require('fs');
const path = require('path');
const ROOT = 'C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2';
const tree = JSON.parse(fs.readFileSync(path.join(ROOT, 'wider/k0/data/tree.json'), 'utf8'));
const cache = path.join(ROOT, 'build/facts/cache');

function loadSnap(sha) {
  const nodes = new Map();
  for (const line of fs.readFileSync(path.join(cache, sha, 'nodes.jsonl'), 'utf8').split('\n')) {
    if (!line) continue;
    const n = JSON.parse(line);
    nodes.set(n.id, n.kind);
  }
  // canonical edge key = kind|src|dst ; co_changed is symmetric, order the endpoints
  const edges = new Map(); // key -> kind
  // semantic signature of evidence: sorted set of evidence_path (so a line shift is NOT a change)
  const sig = new Map();
  for (const line of fs.readFileSync(path.join(cache, sha, 'edges.jsonl'), 'utf8').split('\n')) {
    if (!line) continue;
    const e = JSON.parse(line);
    let a = e.src, b = e.dst;
    if (e.kind === 'co_changed' && a > b) { const t = a; a = b; b = t; }
    const k = e.kind + '|' + a + '|' + b;
    edges.set(k, e.kind);
    const s = (e.evidence_path || '') + ';' + (e.confidence ?? '');
    sig.set(k, (sig.get(k) || new Set()).add(s));
  }
  return { nodes, edges, sig };
}

function q(arr, p) { const s = [...arr].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; }

const order = tree.order;
const rows = [];
const cacheMemo = new Map();
function get(sha) { if (!cacheMemo.has(sha)) cacheMemo.set(sha, loadSnap(sha)); return cacheMemo.get(sha); }
for (const sha of order) {
  const node = tree.nodes[sha];
  if (!node.parent) continue;
  const P = get(node.parent), C = get(sha);
  const add = {}, rem = {}, chg = {};
  let nAdd = 0, nRem = 0;
  for (const [id] of C.nodes) if (!P.nodes.has(id)) nAdd++;
  for (const [id] of P.nodes) if (!C.nodes.has(id)) nRem++;
  for (const [k, kind] of C.edges) {
    if (!P.edges.has(k)) add[kind] = (add[kind] || 0) + 1;
    else {
      const a = [...P.sig.get(k)].sort().join('|'), b = [...C.sig.get(k)].sort().join('|');
      if (a !== b) chg[kind] = (chg[kind] || 0) + 1;
    }
  }
  for (const [k, kind] of P.edges) if (!C.edges.has(k)) rem[kind] = (rem[kind] || 0) + 1;
  const sum = (o, skip) => Object.entries(o).reduce((s, [k, v]) => s + (k === skip ? 0 : v), 0);
  rows.push({
    sha: sha.slice(0, 10), gap: node.gap, nAdd, nRem,
    eAdd: sum(add), eRem: sum(rem), eChg: sum(chg),
    eAddNoCo: sum(add, 'co_changed'), eRemNoCo: sum(rem, 'co_changed'), eChgNoCo: sum(chg, 'co_changed'),
    coAdd: add.co_changed || 0, coRem: rem.co_changed || 0, coChg: chg.co_changed || 0,
    kinds: Object.fromEntries(Object.entries({ ...add }).concat(Object.entries(rem).map(([k, v]) => ['-' + k, v])).sort()),
  });
  // free memory for snapshots no longer needed (keep parent chain cheap)
  if (cacheMemo.size > 6) { const first = cacheMemo.keys().next().value; cacheMemo.delete(first); }
}

const tot = (r) => r.eAdd + r.eRem + r.eChg;
const totNoCo = (r) => r.eAddNoCo + r.eRemNoCo + r.eChgNoCo;
const stat = (name, f) => {
  const v = rows.map(f);
  console.log(name.padEnd(46), 'median', q(v, 0.5), 'p90', q(v, 0.9), 'max', Math.max(...v), 'min', Math.min(...v));
};
console.log('steps', rows.length);
stat('edges added+removed+evidence-changed (all)', tot);
stat('same, excluding co_changed', totNoCo);
stat('co_changed added+removed+changed', (r) => r.coAdd + r.coRem + r.coChg);
stat('nodes added+removed', (r) => r.nAdd + r.nRem);
const small = rows.filter((r) => totNoCo(r) <= 50).length;
const small200 = rows.filter((r) => totNoCo(r) <= 200).length;
console.log('steps with non-history edge delta <= 50:', small, ' <= 200:', small200, ' of', rows.length);
const gap1 = rows.filter((r) => r.gap === 1);
console.log('gap-1 steps', gap1.length, 'median non-history delta', q(gap1.map(totNoCo), 0.5), 'p90', q(gap1.map(totNoCo), 0.9));
// kind totals over all steps
const kindTot = {};
for (const r of rows) for (const [k, v] of Object.entries(r.kinds)) kindTot[k] = (kindTot[k] || 0) + v;
console.log('kind totals (sorted by size):', JSON.stringify(Object.entries(kindTot).sort((a, b) => b[1] - a[1]).slice(0, 14)));
fs.writeFileSync(path.join(ROOT, 'lane-time/delta_stats_out.json'), JSON.stringify(rows));
