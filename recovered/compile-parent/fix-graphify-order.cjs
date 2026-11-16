// 1. Graphify is a tool name: capitalise it where the text uses it as one (not the pip name graphifyy).
// 2. Decisions table: D21, D22, D23 in id order (D23 sat between D20 and D21).
// Usage: node fix-graphify-order.cjs <data dir>
'use strict';
const fs = require('fs'), path = require('path');
const D = process.argv[2];
const rfPath = path.join(D, 'reader-fixes.json');
const rf = JSON.parse(fs.readFileSync(rfPath, 'utf8'));
const lit = [
  ['while evaluating graphify', 'while evaluating Graphify'],
  ['via graphify;', 'via Graphify;'],
  ['and graphify as an arm', 'and Graphify as an arm'],
  ['decide on graphify and', 'decide on Graphify and'],
  ['a graph database server, graphify, an embedding model', 'a graph database server, Graphify, an embedding model'],
];
const have = new Set(rf.lit.map(p => p[0]));
let nl = 0;
lit.forEach(p => { if (!have.has(p[0])) { rf.lit.push(p); nl += 1; } });
fs.writeFileSync(rfPath, JSON.stringify(rf, null, 1) + '\n');

const pkPath = path.join(D, 'packages.json');
const pk = JSON.parse(fs.readFileSync(pkPath, 'utf8'));
const id = d => d.id || d[0];
const i23 = pk.decisions.findIndex(d => id(d) === 'D23');
const i22 = pk.decisions.findIndex(d => id(d) === 'D22');
let moved = false;
if (i23 >= 0 && i22 >= 0 && i23 < i22) {
  const [d23] = pk.decisions.splice(i23, 1);
  const j = pk.decisions.findIndex(d => id(d) === 'D22');
  pk.decisions.splice(j + 1, 0, d23);
  moved = true;
}
fs.writeFileSync(pkPath, JSON.stringify(pk, null, 1) + '\n');
console.log('lit +' + nl, 'D23 moved', moved, pk.decisions.map(id).join(' '));
