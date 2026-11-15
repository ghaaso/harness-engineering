'use strict';
// Preload for the leak re-run: reuses audit/arms/accesslog.js (sync fs calls, child processes, SQLite
// opens) and adds what that one does not see: fs callback and promise APIs, fs.accessSync/realpathSync,
// LadybugDB Database opens, DuckDB instance creation and every SQL / Cypher text the arm sends to an
// engine that names a quoted file path (COPY ... FROM '<path>', read_csv('<path>'), ATTACH '<path>').
// Load with NODE_OPTIONS="--require <this file>" so forked children are logged too; ACCESS_LOG = file.
const path = require('path');
require(path.join(__dirname, '..', 'arms', 'accesslog.js'));
const fs = require('fs');
const Module = require('module');
const fd = fs.openSync(process.env.ACCESS_LOG, 'a');
const writeSync = fs.writeSync.bind(fs);
const seen = new Set();
const log = (o) => { o.pid = process.pid; const s = JSON.stringify(o); if (seen.has(s)) return; seen.add(s); try { writeSync(fd, s + '\n'); } catch (e) { /* ignore */ } };
const norm = (p) => String(p && p.href ? p.href : p).split('\\').join('/');
const isP = (p) => typeof p === 'string' || Buffer.isBuffer(p) || (p && p.href);
for (const fn of ['readFile', 'open', 'readdir', 'stat', 'lstat', 'access', 'writeFile', 'appendFile', 'mkdir', 'rm', 'rename', 'copyFile', 'opendir', 'accessSync', 'realpathSync', 'opendirSync']) {
  const orig = fs[fn]; if (typeof orig !== 'function') continue;
  fs[fn] = function (p, ...rest) { if (isP(p)) log({ op: 'fs.' + fn, path: norm(p) }); return orig.call(this, p, ...rest); };
}
for (const fn of ['readFile', 'open', 'readdir', 'stat', 'lstat', 'access', 'writeFile', 'appendFile', 'mkdir', 'rm', 'rename', 'copyFile', 'opendir', 'cp']) {
  const orig = fs.promises[fn]; if (typeof orig !== 'function') continue;
  fs.promises[fn] = function (p, ...rest) { if (isP(p)) log({ op: 'fsp.' + fn, path: norm(p) }); return orig.call(this, p, ...rest); };
}
const QUOTED = /(?:FROM|read_csv|read_parquet|read_json|ATTACH|COPY[^']*TO)\s*\(?\s*'([^']+)'/gi;
const logSql = (src, q) => { if (typeof q !== 'string') return; for (const m of q.matchAll(QUOTED)) log({ op: src + '.sqlpath', path: m[1] }); };
function wrapMethods(obj, names, src) {
  for (const n of names) { const o = obj && obj[n]; if (typeof o !== 'function' || o.__w) continue; const w = function (q, ...r) { logSql(src, q); return o.call(this, q, ...r); }; w.__w = true; obj[n] = w; }
}
const origLoad = Module._load;
Module._load = function (req) {
  const m = origLoad.apply(this, arguments);
  try {
    if (req === '@ladybugdb/core' && !m.__lw) {
      m.__lw = true;
      // the subclass keeps the name "Database": ladybug's Connection checks database.constructor.name
      if (m.Database) { const D = m.Database; m.Database = class Database extends D { constructor(p, ...r) { log({ op: 'ladybug.open', path: norm(p) }); super(p, ...r); } }; }
      if (m.Connection) wrapMethods(m.Connection.prototype, ['query', 'querySync', 'prepare', 'prepareSync', 'execute', 'executeSync'], 'ladybug');
    }
    if (req === '@duckdb/node-api' && !m.__dw) {
      m.__dw = true;
      const I = m.DuckDBInstance;
      if (I && typeof I.create === 'function') { const c = I.create; I.create = function (p, ...r) { log({ op: 'duckdb.open', path: norm(p) }); return c.call(this, p, ...r); }; }
      if (I && typeof I.fromCache === 'function') { const c = I.fromCache; I.fromCache = function (p, ...r) { log({ op: 'duckdb.open', path: norm(p) }); return c.call(this, p, ...r); }; }
      if (m.DuckDBConnection) wrapMethods(m.DuckDBConnection.prototype, ['run', 'runAndReadAll', 'runAndRead', 'stream', 'streamAndReadAll', 'prepare', 'start', 'startStream'], 'duckdb');
    }
  } catch (e) { log({ op: 'accesslog2.wrap_error', path: String(e.message || e) }); }
  return m;
};
