'use strict';
const L = require('./lib.js');
const B = 'C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/build/audit/facts/frozenA';
const snap = L.loadSnap(B); const n = snap.nodes.length;
for (const [nm, f] of [['all kinds', null], ['dependency kinds', e => L.DEP_KINDS.has(e.kind)]]) {
  const g = L.csr(n, L.pairsOf(snap, f, 'und')); const deg = []; for (let v = 0; v < n; v++) deg.push(g.off[v+1]-g.off[v]);
  const connected = deg.filter(d => d > 0); const avg = connected.reduce((a,b)=>a+b,0)/connected.length;
  const hot = connected.filter(d => d >= avg); const hotEdges = hot.reduce((a,b)=>a+b,0)/connected.reduce((a,b)=>a+b,0);
  console.log(nm, ': vertices with an edge', connected.length, 'avg degree', avg.toFixed(2), '| hot (degree >= avg)', (hot.length/connected.length*100).toFixed(1)+'% of vertices hold', (hotEdges*100).toFixed(1)+'% of edge endpoints');
}
