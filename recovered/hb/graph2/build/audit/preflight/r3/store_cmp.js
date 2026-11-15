'use strict';
// Re-audit 3: the held-out question runs open the frozen commit's store that already sits on each arm's
// volume when one exists (the arms rebuild only when the store file is missing). gt-duckpgq holds
// duckpgq/a31924a...-28870c30.duckdb, built 2026-11-12 16:35 UTC, three minutes BEFORE the last change to
// arms/duckpgq/store.js (16:38 UTC), with the same store version D2. This script builds a fresh store of
// the frozen commit with the frozen code (into /tmp) and compares it, table by table (row count and an
// order-free sum of row hashes; meta row by row), with a COPY of the volume's store.
// usage (inside graphtest:1, gt-duckpgq mounted read-only at /old): node store_cmp.js <old store file> <out.json>
const fs = require('fs'); const path = require('path');
process.env.GT_BUILD = process.env.GT_BUILD || '/build';
const { DuckDBInstance } = require('@duckdb/node-api');
const { graphFor } = require('/build/arms/common/arms.js');
const S_ = require('/build/arms/duckpgq/store.js');
const P = require('/build/arms/common/paths.js');
(async () => {
  const G = graphFor(P.FROZEN);
  const fresh = path.join('/tmp/storecmp', path.basename(S_.storeFile(G, '/tmp/storecmp')));
  fs.mkdirSync('/tmp/storecmp', { recursive: true });
  const oldCopy = '/tmp/storecmp/old.duckdb';
  fs.copyFileSync(process.argv[2], oldCopy);
  if (fs.existsSync(process.argv[2] + '.wal')) fs.copyFileSync(process.argv[2] + '.wal', oldCopy + '.wal');
  const sameName = path.basename(fresh) === path.basename(process.argv[2]);
  if (fs.existsSync(fresh)) fs.rmSync(fresh);
  await S_.buildStore(G, fresh);
  const summ = async (f) => {
    const inst = await DuckDBInstance.create(f, { access_mode: 'READ_ONLY' });
    const c = await inst.connect();
    const rows = async (sql) => (await c.runAndReadAll(sql)).getRowObjects();
    const tabs = (await rows("SELECT table_name FROM information_schema.tables WHERE table_type = 'BASE TABLE' ORDER BY 1")).map((r) => r.table_name);
    const o = {};
    for (const t of tabs) {
      if (t === 'meta') { o.meta = Object.fromEntries((await rows('SELECT * FROM meta')).map((r) => [String(r.k), String(r.v)])); continue; }
      const r = (await rows(`SELECT count(*)::VARCHAR AS n, coalesce(sum(hash(x))::VARCHAR, '0') AS h FROM "${t}" x`))[0];
      o[t] = r.n + ':' + r.h;
    }
    c.closeSync ? c.closeSync() : null;
    return o;
  };
  const a = await summ(oldCopy); const b = await summ(fresh);
  const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])].sort();
  const tableDiff = keys.filter((k) => k !== 'meta' && a[k] !== b[k]).map((k) => ({ table: k, old: a[k] || null, fresh: b[k] || null }));
  const mk = [...new Set([...Object.keys(a.meta || {}), ...Object.keys(b.meta || {})])].sort();
  const metaDiff = mk.filter((k) => (a.meta || {})[k] !== (b.meta || {})[k]).map((k) => ({ k, old: (a.meta || {})[k], fresh: (b.meta || {})[k] }));
  const out = { old_store: process.argv[2], fresh_store_name: path.basename(fresh), same_file_name: sameName, tables_old: Object.keys(a).length, tables_fresh: Object.keys(b).length, table_differences: tableDiff, meta_differences: metaDiff, old_summary: a, fresh_summary: b };
  fs.writeFileSync(process.argv[3], JSON.stringify(out, null, 1));
  console.log(JSON.stringify({ same_file_name: sameName, tables_old: out.tables_old, tables_fresh: out.tables_fresh, table_differences: tableDiff.length, meta_differences: metaDiff.map((x) => x.k) }));
  for (const d of tableDiff) console.log('TABLE DIFF', JSON.stringify(d));
  for (const d of metaDiff) console.log('META DIFF', JSON.stringify(d).slice(0, 300));
})().catch((e) => { console.error(e); process.exit(2); });
