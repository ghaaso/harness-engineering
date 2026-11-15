'use strict';
const L = require('./lib.js');
const B = 'C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/build/audit/facts/frozenA';
const snap = L.loadSnap(B); const nodes = snap.nodes;
const sup = nodes.map(x => (x.runtime||'?')+'/'+(x.slice||'?'));
const se = new Map();
for (const e of snap.edges) { if (!L.DEP_KINDS.has(e.kind)) continue; const a = sup[e.a], b = sup[e.b]; if (a === b) continue; if (!se.has(a)) se.set(a, new Set()); se.get(a).add(b); }
let txt = ''; for (const [a, bs] of se) txt += a + ' -> ' + Array.from(bs).join(', ') + '\n';
console.log('dependency slice map as adjacency text: lines', se.size, 'chars', txt.length, 'est tokens', Math.round(txt.length/4), '-', Math.round(txt.length/3));
const fs = require('fs'); 
console.log('nodes.jsonl bytes', fs.statSync(B + '/nodes.jsonl').size, 'edges.jsonl bytes', fs.statSync(B + '/edges.jsonl').size, '| structural CSR (fwd) bytes', 16662*4+5461*4);
