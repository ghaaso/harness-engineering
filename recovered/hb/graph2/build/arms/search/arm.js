'use strict';
// Harness entry of arm (a) SEARCH (registry contract, arms/common/SPEC.md section 1):
//   open(G, opts) -> { rank(seedIds, cfg, seed), tq(question), close() }
// rank() returns only the search's own ranked head as canonical graph nodes, with its lookup count,
// the time spent searching, and the cost ledger in `meta`. Projection, the padding tail (cfg.pad),
// the four output forms and the token budgets are the shared packer's job, exactly as for every arm.
// The parent tree is read with `git archive` from paths.js REPO (GT_REPO = /repo inside graphtest:1);
// nothing is written. No store is used (opts.store is ignored).
const { Ctx } = require('./engine');
const { checkSearch, search, toRanked } = require('./search');

function open(G, opts = {}) {
  // Markdown is exported too: TQ reads CLAUDE.md. Grep and BM25 run over code files only.
  const t0 = process.hrtime.bigint();
  const ctx = new Ctx(G, { withDocs: true });
  const openMs = Number(process.hrtime.bigint() - t0) / 1e6;
  return {
    rank(seedIds, cfg, seed) {
      if (cfg.traversal || cfg.rank) throw new Error('INVALID CONFIG: the search arm takes no graph traversal or rank');
      const v = checkSearch(cfg.search);
      const t = process.hrtime.bigint();
      const res = search(ctx, seed, v);
      const ranked = toRanked(ctx, res, seed, seedIds);
      const ms = Number(process.hrtime.bigint() - t) / 1e6;
      return {
        ranked,
        engine_ms: ms,
        lookups: res.ledger.n,
        meta: {
          tokens_read: res.ledger.tokens,
          r1_lookups: res.meta.r1_lookups,
          names: res.meta.names,
          routes: res.meta.routes,
          ledger: res.ledger.lookups.map((l) => [l.op, l.label, l.tokens, l.lines == null ? null : l.lines]),
          seed_in_tree: ctx.files.has(seed.path),
        },
      };
    },
    tq(q) {
      const { answerTq } = require('./tq');
      return answerTq(ctx, q);
    },
    close() {},
    ctx, open_ms: openMs, parent: opts.parent || G.sha,
  };
}

module.exports = { open };
