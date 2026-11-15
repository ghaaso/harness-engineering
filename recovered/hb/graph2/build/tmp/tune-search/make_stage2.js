'use strict';
// Writes arms/search/stage2.json: exactly 20 configurations around the stage-1 best (pad=CO /
// pad=DIR, bm25), every search field explicit, including the stage-2 fields fuse and co.
const fs = require('fs');
const path = require('path');
const { BASE } = require('../../arms/search/sweep.js');
const clone = (o) => JSON.parse(JSON.stringify(o));
const B = clone(BASE); B.search.fuse = 'sum'; B.search.co = false;
const v = (name, shared, search) => { const c = clone(B); Object.assign(c, shared || {}); Object.assign(c.search, search || {}); return { name, ...c }; };
const CO = { pad: 'CO' };
const LIST = [
  v('pad=CO rounds=1', CO, { rounds: 1 }),
  v('pad=CO rounds=1 routes=off', CO, { rounds: 1, routes: false }),
  v('pad=DIR rounds=1', { pad: 'DIR' }, { rounds: 1 }),
  v('pad=CO rounds=3', CO, { rounds: 3 }),
  v('pad=CO k2=12', CO, { k2: 12 }),
  v('pad=CO bm25 top=10', CO, { bm25: true, bm25Top: 10 }),
  v('pad=CO bm25 top=20', CO, { bm25: true, bm25Top: 20 }),
  v('pad=CO bm25', CO, { bm25: true }),
  v('pad=CO rounds=1 bm25 top=20', CO, { rounds: 1, bm25: true, bm25Top: 20 }),
  // bm25only runs no grep and ignores seedImports, so both are written as off (honest complexity)
  v('pad=CO bm25only top=20', CO, { rounds: 1, bm25only: true, bm25Top: 20, seedImports: false }),
  v('bm25 top=100 rounds=3', null, { rounds: 3, bm25: true, bm25Top: 100 }),
  v('pad=CO bm25 top=20 prox=1.5', CO, { bm25: true, bm25Top: 20, prox: 1.5 }),
  v('pad=CO prox=1.5', CO, { prox: 1.5 }),
  v('pad=CO typeW=flat countW=1', CO, { typeW: { def: 1, import: 1, mock: 1, call: 1 }, countW: 1 }),
  v('pad=CO gran=symbol', { pad: 'CO', granularity: 'symbol' }, {}),
  v('pad=CO rrf bm25 top=20', CO, { bm25: true, bm25Top: 20, fuse: 'rrf' }),
  v('pad=CO co sum', CO, { co: true }),
  v('pad=CO co rrf', CO, { co: true, fuse: 'rrf' }),
  v('pad=CO co rrf bm25 top=20', CO, { co: true, fuse: 'rrf', bm25: true, bm25Top: 20 }),
  v('pad=CO co rrf rounds=1', CO, { co: true, fuse: 'rrf', rounds: 1 }),
];
if (LIST.length !== 20) throw new Error('need 20, have ' + LIST.length);
const out = path.join(__dirname, '..', '..', 'arms', 'search', 'stage2.json');
fs.writeFileSync(out, JSON.stringify(LIST, null, 1) + '\n');
console.log('wrote', out, LIST.length);
