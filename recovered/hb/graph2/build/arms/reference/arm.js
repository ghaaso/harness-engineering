'use strict';
// Harness entry of the reference arm (convention: arms/<name>/arm.js exports open(G, opts)).
const { RefGraph } = require('./ref');

function open(G) {
  const r = new RefGraph(G);
  return {
    rank(seedIds, cfg, seed) {
      const t = process.hrtime.bigint();
      const ranked = r.rank(seedIds, cfg, seed);
      return { ranked, engine_ms: Number(process.hrtime.bigint() - t) / 1e6 };
    },
    explainChecker: (seedIds, cfg) => r.explainChecker(seedIds, cfg),
    close() {},
    ref: r,
  };
}

module.exports = { open };
