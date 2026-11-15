'use strict';
// Harness entry of the relational arm (convention: arms/<name>/arm.js exports open(G, opts)).
// The SQLite store is built once per (commit, removed document, loader version, extractor version)
// into opts.store, which inside graphtest:1 is on the container filesystem (GT_STORE), never /build.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { buildDb, openDb } = require('./db');
const { RelGraph } = require('./rel');

function dbFile(G, store) {
  const tag = crypto.createHash('sha1').update(G.loader_version + '|' + G.meta.extractor_version + '|' + G.removed.join(',')).digest('hex').slice(0, 8);
  return path.join(store, G.sha + '-' + tag + '.sqlite');
}

function open(G, opts) {
  const f = dbFile(G, opts.store);
  let build = null;
  if (!fs.existsSync(f)) build = buildDb(G, f);
  const db = openDb(f);
  const r = new RelGraph(db);
  return {
    rank(seedIds, cfg, seed) {
      const t = process.hrtime.bigint();
      const ranked = r.rank(seedIds, cfg, seed);
      return { ranked, engine_ms: Number(process.hrtime.bigint() - t) / 1e6 };
    },
    tq(q) {
      const tq = require('./tq');
      const tg = tq.target(q);
      return { answer: tq.answer(db, q, tg), lookups: 1 };
    },
    close() { db.close(); },
    build, file: f, rel: r, db,
  };
}

module.exports = { open, dbFile };
