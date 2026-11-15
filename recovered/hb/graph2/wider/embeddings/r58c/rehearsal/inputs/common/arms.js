'use strict';
// Arm registry by convention: arms/<name>/arm.js exports
//   open(G, opts) -> { rank(seedIds, cfg, seed), close(), tq?(question) }   (open may be async)
// rank() may return a promise; it resolves to the ranked array or to {ranked, engine_ms, lookups, meta}
// (SPEC.md section 10). opts = { store: a folder for the arm's database files (P.storeFor(name), on the
// container filesystem when GT_STORE is set), parent, removePaths }.
// Built-in arm "none": ranks nothing, so with pad = DIR or CO it is the DIR or CO floor (addendum 2, B.8).
const fs = require('fs');
const path = require('path');
const P = require('./paths');
const { loadFacts } = require('./facts');

const gCache = new Map();
function graphFor(sha, removePaths = []) {
  const key = sha + '|' + removePaths.join(',');
  if (!gCache.has(key)) {
    if (gCache.size >= 2) gCache.clear();
    gCache.set(key, loadFacts(sha, { removePaths }));
  }
  return gCache.get(key);
}

const BUILTIN = {
  // an empty head issues no query (lookups 0); the harness adds the padding tail's lookups
  none: { open: () => ({ rank: () => ({ ranked: [], engine_ms: 0, lookups: 0 }), close() {} }) },
};

function armModule(name) {
  if (BUILTIN[name]) return BUILTIN[name];
  if (!/^[a-z0-9_-]+$/.test(name)) throw new Error('bad arm name ' + name);
  const f = path.join(P.ARMS, name, 'arm.js');
  if (!fs.existsSync(f)) throw new Error('unknown arm ' + name + ' (no arms/' + name + '/arm.js)');
  const m = require(f);
  if (typeof m.open !== 'function') throw new Error('arms/' + name + '/arm.js does not export open(G, opts)');
  return m;
}

async function openArm(name, G, extra = {}) {
  const m = armModule(name);
  const a = await m.open(G, { store: P.storeFor(name), parent: G.sha, removePaths: G.removed, ...extra });
  if (!a || typeof a.rank !== 'function' || typeof a.close !== 'function') throw new Error('arm ' + name + ': open() must return {rank, close}');
  return { name, ...a, rank: a.rank.bind(a), close: a.close.bind(a), tq: a.tq ? a.tq.bind(a) : null, raw: a };
}

// register(name, module): add an in-process arm (tests and development only; reported runs use folders)
function register(name, m) { BUILTIN[name] = m; }

module.exports = { graphFor, openArm, armModule, register };
