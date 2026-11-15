'use strict';
// Per stage-2 configuration and set: median and 95th-percentile engine_ms, median wall ms, median n_ranked,
// and which layer answered (meta.native). No scores. node tmp/tune-duckpgq/timing.js <results root>
const fs = require('fs');
const path = require('path');
const B = process.env.GT_BUILD || path.resolve(__dirname, '..', '..');
const H = require(path.join(B, 'arms/common/harness'));
const root = process.argv[2] || path.join(B, 'results');
const L = H.loadArmList('duckpgq', 2, false);
const q = (a, p) => { const s = [...a].sort((x, y) => x - y); return s.length ? +s[Math.min(s.length - 1, Math.floor(p * s.length))].toFixed(1) : null; };
const out = [];
for (const c of L.list) {
  const row = { name: c.name, hash: c.hash };
  for (const s of ['T1', 'T1x', 'T2']) {
    const f = path.join(root, 'duckpgq', 'tune', c.hash + '.' + s + '.jsonl.gz');
    if (!fs.existsSync(f)) { row[s] = 'missing'; continue; }
    const A = H.readGzJsonl(f);
    const layers = new Set(A.map((a) => a.meta && a.meta.native ? JSON.stringify(a.meta.native) : 'none'));
    row[s] = { n: A.length, engine_p50: q(A.map((a) => a.engine_ms), 0.5), engine_p95: q(A.map((a) => a.engine_ms), 0.95), wall_p50: q(A.map((a) => a.ms), 0.5), n_ranked_p50: q(A.map((a) => a.n_ranked), 0.5), layers: [...layers] };
  }
  out.push(row);
}
console.log(JSON.stringify({ list_hash: L.hash, configs: out }, null, 1));
