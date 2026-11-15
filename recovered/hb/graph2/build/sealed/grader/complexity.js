'use strict';
// Parsimony complexity of a configuration (protocol addendum 3, item 10). Written once by the grader;
// reused for stage 1, stage 2 and the final selection. complexity(cfg) -> {total, parts: {reason: n}}.
//
// Graph and relational arms (a configuration with a traversal):
//   ranking parts: 1 for a single ranking, k for a hybrid of k parts. An x_ ranking that combines a
//     personalised PageRank with a second signal (a nested `ppr` field, or the name x_ppr_lift) counts
//     as 2 parts, because it is a fusion of two rankings.
//   +1 budget or metapath traversal (traversal.mode budget or metapath)
//   +1 unbounded or more than 3 hops. The depth is the traversal's effective cap: k-hop `hops`;
//     budget min(hops, sum of the budgets); metapath min(hops, sum of the steps' max). null = unbounded.
//   +1 any hub cut (hub indeg or transport)
//   +1 padding (pad DIR or CO)
//   +1 symbol granularity
//   +1 an engine-only native mode: any x_ traversal or ranking, or a `variant` on either (counted once)
// Search arm (a configuration with a `search` block and no traversal):
//   1 for its one ranking (+1 when `co` adds a co-change part), +(rounds - 1) for rounds beyond the first, +1 routes on, +1 BM25 (bm25 or
//   bm25only), +1 import following (seedImports or followImports on; counted once), +1 padding,
//   +1 symbol granularity.
// Floors (no traversal, no search block): 0 ranking parts, +1 padding, +1 symbol granularity.
// Ties (addendum 3, item 10) go to the lower median token use, then to the configuration name; that
// ordering is applied by the selector, not here.
const isExt = (m) => typeof m === 'string' && m.startsWith('x_');

function rankParts(rk) {
  if (!rk) return 0;
  if (rk.mode === 'hybrid') return (rk.parts || []).reduce((s, p) => s + rankParts(p), 0);
  if (isExt(rk.mode) && (rk.ppr || rk.mode === 'x_ppr_lift')) return 2;
  return 1;
}
function usesNative(cfg) {
  const tr = cfg.traversal || {}; const rk = cfg.rank || {};
  const parts = rk.mode === 'hybrid' ? [rk, ...(rk.parts || [])] : [rk];
  return !!(isExt(tr.mode) || tr.variant || parts.some((p) => isExt(p.mode) || p.variant));
}
function depthCap(tr) {
  const sum = (xs) => xs.reduce((a, b) => a + b, 0);
  let cap = null;
  if (tr.mode === 'budget') cap = sum(Object.values(tr.budgets || {}));
  else if (tr.mode === 'metapath') cap = sum((tr.steps || []).map((s) => (s.max == null ? 1 : s.max)));
  if (tr.hops == null) return cap; // khop/x_ with hops null: unbounded (cap stays null)
  return cap == null ? tr.hops : Math.min(tr.hops, cap);
}

function complexity(cfg) {
  const parts = {};
  if (cfg.traversal) {
    parts.ranking_parts = rankParts(cfg.rank);
    const tr = cfg.traversal;
    if (tr.mode === 'budget' || tr.mode === 'metapath') parts.budget_or_metapath = 1;
    const d = depthCap(tr);
    if (d == null || d > 3) parts.unbounded_or_over_3_hops = 1;
    if (cfg.hub && cfg.hub.mode && cfg.hub.mode !== 'none') parts.hub_cut = 1;
    if (usesNative(cfg)) parts.native_mode = 1;
  } else if (cfg.search) {
    const s = cfg.search;
    // stage-2 addition (grader, before any stage-2 score was read): the search arm's `co` field adds a
    // co-change ranking part inside the head, so the head becomes a hybrid of 2 parts (k parts = k);
    // `fuse` (sum or rrf) only says how the parts combine and adds nothing. No stage-1 entry has `co`.
    parts.ranking_parts = 1 + (s.co ? 1 : 0);
    if ((s.rounds || 1) > 1) parts.extra_rounds = s.rounds - 1;
    if (s.routes) parts.routes = 1;
    if (s.bm25 || s.bm25only) parts.bm25 = 1;
    if (s.seedImports || s.followImports) parts.import_following = 1;
  } else parts.ranking_parts = 0;
  if (cfg.pad && cfg.pad !== 'none') parts.padding = 1;
  if (cfg.granularity === 'symbol') parts.symbol_granularity = 1;
  const total = Object.values(parts).reduce((a, b) => a + b, 0);
  return { total, parts };
}

module.exports = { complexity, rankParts, depthCap, usesNative };
