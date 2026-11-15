'use strict';
// Build time and size of every DuckPGQ store in the store folder (GT_STORE/duckpgq): one per (parent
// commit, removed document). Reads each store's meta table (times recorded by store.js at build).
//   node arms/duckpgq/stores_report.js   -> results/duckpgq/stores.json
const fs = require('fs');
const path = require('path');
const P = require('../common/paths');
const S_ = require('./store');

(async () => {
  const dir = P.storeFor('duckpgq');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.duckdb') && !f.startsWith('bench-') && fs.statSync(path.join(dir, f)).isFile());
  const rows = [];
  for (const f of files) {
    const db = await S_.connect(path.join(dir, f), { config: { access_mode: 'READ_ONLY' } });
    const m = Object.fromEntries((await db.all('SELECT k, v FROM meta')).map((r) => [r.k, r.v]));
    db.close();
    if (m.store_version !== S_.STORE_VERSION) continue;
    const ms = ['export_ms', 'load_ms', 'labels_ms', 'graph_ms', 'check_ms'].reduce((a, k) => a + Number(m[k] || 0), 0);
    rows.push({ file: f, sha: m.sha, removed: m.removed || '', nodes: Number(m.nodes), edges: Number(m.edges), labels: Number(m.labels), build_ms: +ms.toFixed(1), bytes: fs.statSync(path.join(dir, f)).size });
  }
  const q = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
  const b = rows.map((r) => r.build_ms); const z = rows.map((r) => r.bytes);
  const summary = { stores: rows.length, parents: new Set(rows.map((r) => r.sha)).size, with_removed_document: rows.filter((r) => r.removed).length,
    build_ms: { p50: q(b, 0.5), p95: q(b, 0.95), max: Math.max(...b), total: +b.reduce((x, y) => x + y, 0).toFixed(1) },
    bytes: { p50: q(z, 0.5), max: Math.max(...z), total: z.reduce((x, y) => x + y, 0) },
    nodes: { min: Math.min(...rows.map((r) => r.nodes)), max: Math.max(...rows.map((r) => r.nodes)) },
    note: 'build_ms = CSV export + bulk load and derived tables + label tables + arc table, TQ label tables and the two stored property graphs + load check, as recorded in each store; it excludes loading the canonical facts (facts.js) and opening the file.' };
  fs.mkdirSync(path.join(P.RESULTS, 'duckpgq'), { recursive: true });
  fs.writeFileSync(path.join(P.RESULTS, 'duckpgq', 'stores.json'), JSON.stringify({ summary, stores: rows }, null, 1));
  console.log(JSON.stringify(summary));
})().catch((e) => { console.error(e); process.exit(1); });
