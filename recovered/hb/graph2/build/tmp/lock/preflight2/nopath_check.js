'use strict';
// Pre-flight fix round 2: can a node with no path ever be labelled by LadybugDB's LABEL() in tq.js?
// LABEL() is applied to the sources of calls_url and calls edges (other_half, route_clients). Counts, in
// the frozen commit's canonical graph, the path-less nodes that are the source of such an edge.
//   inside graphtest:1:  node tmp/lock/preflight2/nopath_check.js  -> nopath_check.json
const fs = require('fs');
const path = require('path');
const B = process.env.GT_BUILD || path.resolve(__dirname, '..', '..', '..');
const P = require(path.join(B, 'arms/common/paths'));
const { graphFor } = require(path.join(B, 'arms/common/arms'));
const G = graphFor(P.FROZEN);
const noPath = new Set(G.nodes.filter((n) => n.path == null || n.path === '').map((n) => n.i));
const hits = {};
for (const e of G.edges) if ((e.kind === 'calls_url' || e.kind === 'calls') && noPath.has(e.s)) hits[e.kind] = (hits[e.kind] || 0) + 1;
const out = { nodes_without_path: noPath.size, calls_or_calls_url_edges_from_them: hits };
fs.writeFileSync(path.join(__dirname, 'nopath_check.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out));
