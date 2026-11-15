'use strict';
// Stage-1 sweep list of the SEARCH arm (protocol addendum 2, C.10): exactly 40 configurations, one
// factor at a time around this arm's own BASE, written on 2026-11-12 without any score. The earlier
// 40-entry list and the selection made from it with proxy labels are void (addendum 2, C.11).
//
// BASE: the search fields are the pre-score defaults the arm was first written with (two rounds,
// names + module spellings + routes, typed hit weights 3/2/1.5/1, no BM25, no proximity prior); the
// old private directory fill is gone and the shared factors are set like the relational arm's base
// (file granularity, signature form, pad none), so padding enters through the shared `pad` factor.
// Budgets are not list entries: every configuration is packed at 2k, 4k, 8k and 16k tokens.
// minConf is a shared factor with no effect on this arm (it reads no edges), so it is not swept.
const BASE = {
  granularity: 'file', form: 'signature', pad: 'none',
  search: {
    rounds: 2, routes: true, spellings: true, nullNames: 8, seedImports: true, namesPerFile: 3,
    genericCap: 300, followImports: false, k2: 5, decay: 0.5,
    bm25: false, bm25only: false, bm25K1: 1.2, bm25B: 0.75, bm25Top: 50,
    prox: 0, typeW: { def: 3, import: 2, mock: 1.5, call: 1 }, countW: 0.25, idf: true,
  },
};
const clone = (o) => JSON.parse(JSON.stringify(o));
const v = (name, shared, search) => { const c = clone(BASE); Object.assign(c, shared || {}); Object.assign(c.search, search || {}); c.name = name; return c; };
const s = (name, search) => v(name, null, search);

const STAGE1 = [
  v('base'),
  // shared factors: padding, granularity, output form (7)
  v('pad=DIR', { pad: 'DIR' }),
  v('pad=CO', { pad: 'CO' }),
  v('gran=symbol', { granularity: 'symbol' }),
  v('form=paths', { form: 'paths' }),
  v('form=snippet', { form: 'snippet' }),
  v('gran=symbol form=paths', { granularity: 'symbol', form: 'paths' }),
  v('gran=symbol form=snippet', { granularity: 'symbol', form: 'snippet' }),
  // rounds (5)
  s('rounds=1', { rounds: 1 }),
  s('rounds=3', { rounds: 3 }),
  s('k2=3', { k2: 3 }),
  s('k2=8', { k2: 8 }),
  s('k2=12', { k2: 12 }),
  // round decay (2)
  s('decay=0.25', { decay: 0.25 }),
  s('decay=1', { decay: 1 }),
  // terms (11)
  s('routes=off', { routes: false }),
  s('spellings=off', { spellings: false }),
  s('seedImports=off', { seedImports: false }),
  s('nullNames=0', { nullNames: 0 }),
  s('nullNames=3', { nullNames: 3 }),
  s('nullNames=16', { nullNames: 16 }),
  s('namesPerFile=1', { namesPerFile: 1 }),
  s('namesPerFile=6', { namesPerFile: 6 }),
  s('genericCap=100', { genericCap: 100 }),
  s('genericCap=1000', { genericCap: 1000 }),
  v('gran=symbol followImports', { granularity: 'symbol' }, { followImports: true }),
  // BM25 (5)
  s('bm25', { bm25: true }),
  s('bm25only', { bm25only: true }),
  s('bm25 k1=0.9 b=0.4', { bm25: true, bm25K1: 0.9, bm25B: 0.4 }),
  s('bm25 top=20', { bm25: true, bm25Top: 20 }),
  s('bm25 top=100', { bm25: true, bm25Top: 100 }),
  // proximity (3)
  s('prox=0.5', { prox: 0.5 }),
  s('prox=1.5', { prox: 1.5 }),
  s('prox=3', { prox: 3 }),
  // weights (6)
  s('typeW=flat', { typeW: { def: 1, import: 1, mock: 1, call: 1 } }),
  s('typeW=def-heavy', { typeW: { def: 5, import: 2, mock: 1, call: 1 } }),
  s('typeW=import-heavy', { typeW: { def: 2, import: 4, mock: 1.5, call: 1 } }),
  s('countW=0', { countW: 0 }),
  s('countW=1', { countW: 1 }),
  s('idf=off', { idf: false }),
];
if (STAGE1.length !== 40) throw new Error('search stage-1 list has ' + STAGE1.length + ' entries, not 40');

// "Simplest configuration within one standard error" (addendum 2, C.9): fewer moving parts (a
// person's effort) first. Written with the list, before any score.
function complexity(c) {
  const x = c.search;
  let k = 0;
  k += x.bm25only ? 0.5 : x.rounds;                   // grep rounds
  k += x.rounds >= 2 && !x.bm25only ? x.k2 / 5 : 0;   // files opened per later round
  k += (x.routes ? 0.5 : 0) + (x.spellings ? 0.5 : 0) + (x.seedImports ? 0.25 : 0) + (x.followImports ? 0.5 : 0);
  k += x.nullNames / 16;
  k += x.bm25 ? 1 : 0;
  k += x.prox ? 0.5 : 0;
  k += c.pad && c.pad !== 'none' ? 0.5 : 0;
  k += c.granularity === 'symbol' ? 0.5 : 0;
  return k;
}

module.exports = { BASE, STAGE1, complexity };
