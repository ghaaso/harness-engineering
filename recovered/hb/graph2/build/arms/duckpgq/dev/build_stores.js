'use strict';
// Builds (if missing) the DuckPGQ store of every TUNE parent (T1, T1x, T2) and of the frozen commit, one
// after another, so that later runs in parallel containers never build the same store at once. Then
// removes store files of an older STORE_VERSION from the store folder.
//   node arms/duckpgq/dev/build_stores.js
const fs = require('fs');
const path = require('path');
const P = require('../../common/paths');
const H = require('../../common/harness');
const { graphFor } = require('../../common/arms');
const S_ = require('../store');

(async () => {
  const dir = P.storeFor('duckpgq'); fs.mkdirSync(dir, { recursive: true });
  const tasks = H.loadTasks(['T1', 'T1x', 'T2'], 'tune');
  const keys = new Map(); for (const t of tasks) keys.set(t.parent + '|' + (t.remove_paths || []).join(','), [t.parent, t.remove_paths || []]);
  keys.set(P.FROZEN + '|', [P.FROZEN, []]);
  const keep = new Set(); let built = 0;
  for (const [parent, rm] of keys.values()) {
    const G = graphFor(parent, rm); const f = S_.storeFile(G, dir); keep.add(path.basename(f));
    if (!fs.existsSync(f)) { await S_.buildStore(G, f); built++; }
  }
  let removed = 0;
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (!fs.statSync(full).isFile() || !/\.duckdb(\.wal)?$/.test(f) || f.startsWith('bench-') || keep.has(f)) continue;
    const db = await S_.connect(full, { config: { access_mode: 'READ_ONLY' } }).catch(() => null);
    let v = null; if (db) { try { v = (await db.all("SELECT v FROM meta WHERE k = 'store_version'"))[0].v; } catch (e) { v = null; } db.close(); }
    if (v !== S_.STORE_VERSION) { fs.rmSync(full, { force: true }); fs.rmSync(full + '.wal', { force: true }); removed++; }
  }
  console.log(JSON.stringify({ stores_needed: keys.size, built, old_version_files_removed: removed }));
})().catch((e) => { console.error(e); process.exit(1); });
