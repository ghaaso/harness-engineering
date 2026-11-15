'use strict';
// Read-only measurement for the selection/interface lane. Requires the build modules, writes nothing there.
process.env.GT_SRCSTORE = 'C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/lane-sel-iface/srcstore';
process.env.GT_TMP = 'C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/lane-sel-iface/tmp';
const B = 'C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/build/arms/common/';
const P = require(B + 'paths');
const { loadFacts } = require(B + 'facts');
const { render } = require(B + 'packer');
const { countTokens } = require(B + 'tokenizer');
const G = loadFacts(P.FROZEN);
console.log('nodes', G.nodes.length, 'edges', G.edges.length, 'kinds', G.kinds.length);
const stat = (a) => { a = a.slice().sort((x, y) => x - y); const n = a.length; const m = a.reduce((s, x) => s + x, 0) / n; const sd = Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / n); const q = (p) => a[Math.min(n - 1, Math.floor(p * n))]; return { n, mean: +m.toFixed(1), cv: +(sd / m).toFixed(2), p10: q(.1), p50: q(.5), p90: q(.9), p99: q(.99), max: a[n - 1] }; };
// 1. cost spread per output unit
const files = G.nodes.filter((n) => n.kind === 'file' && n.path);
const defs = G.nodes.filter((n) => ['function', 'method', 'component', 'class'].includes(n.kind) && n.file && n.ls);
for (const form of ['paths', 'range', 'signature']) {
  console.log('file/' + form, JSON.stringify(stat(files.map((n) => countTokens(render(G, n.i, form, 'file').text)))));
  console.log('symbol/' + form, JSON.stringify(stat(defs.map((n) => countTokens(render(G, n.i, form, 'symbol').text)))));
}
console.log('symbol/snippet', JSON.stringify(stat(defs.slice(0, 1500).map((n) => countTokens(render(G, n.i, 'snippet', 'symbol').text)))));
console.log('file/snippet', JSON.stringify(stat(files.slice(0, 400).map((n) => countTokens(render(G, n.i, 'snippet', 'file').text)))));
const kindCount = {}; for (const e of G.edges) kindCount[e.kind] = (kindCount[e.kind] || 0) + 1;
console.log('edge kinds', JSON.stringify(kindCount));
// 2. format comparison on one-hop neighbourhoods of sampled symbol seeds
const adj = new Map();
const push=(k,v)=>{let a=adj.get(k);if(!a){a=[];adj.set(k,a);}a.push(v);};
for (const e of G.edges) { push(e.s,{o:e.d,kind:e.kind,dir:'out'}); push(e.d,{o:e.s,kind:e.kind,dir:'in'}); }
const lab = (n) => (n.path || n.kind) + (n.name && n.kind !== 'file' ? '::' + n.name : '');
const short = (n) => (n.path ? n.path.split('/').slice(-2).join('/') : n.kind) + (n.name && n.kind !== 'file' ? '::' + n.name : '');
const seeds = defs.filter((n, i) => i % Math.floor(defs.length / 300) === 0).slice(0, 300);
const acc = { triples: [], adjacency: [], tree: [], json: [], sentences: [], edges: [] };
for (const s of seeds) {
  const nb = (adj.get(s.i) || []).slice(0, 30);
  if (nb.length < 8) continue;
  const sn = lab(s);
  const triples = nb.map((x) => x.dir === 'out' ? sn + ' ' + x.kind + ' ' + lab(G.nodes[x.o - 1]) : lab(G.nodes[x.o - 1]) + ' ' + x.kind + ' ' + sn).join('\n') + '\n';
  const byKind = {}; for (const x of nb) { const k = (x.dir === 'out' ? '' : '<-') + x.kind; (byKind[k] = byKind[k] || []).push(lab(G.nodes[x.o - 1])); }
  const adjacency = sn + '\n' + Object.entries(byKind).map(([k, v]) => '  ' + k + ': ' + v.join(', ')).join('\n') + '\n';
  // tree: group by file so the path is printed once
  const byFile = {}; for (const x of nb) { const n = G.nodes[x.o - 1]; const f = n.path || n.kind; (byFile[f] = byFile[f] || []).push({ k: (x.dir === 'out' ? '' : '<-') + x.kind, name: n.name && n.kind !== 'file' ? n.name : '' }); }
  const tree = sn + '\n' + Object.entries(byFile).map(([f, v]) => '  ' + f + '\n' + v.map((y) => '    ' + y.k + (y.name ? ' ' + y.name : '')).join('\n')).join('\n') + '\n';
  const json = JSON.stringify({ node: sn, edges: nb.map((x) => ({ rel: x.kind, dir: x.dir, node: lab(G.nodes[x.o - 1]) })) }) + '\n';
  const sentences = nb.map((x) => x.dir === 'out' ? 'The ' + G.nodes[s.i - 1].kind + ' ' + sn + ' ' + x.kind.replace(/_/g, ' ') + ' the ' + G.nodes[x.o - 1].kind + ' ' + lab(G.nodes[x.o - 1]) + '.' : 'The ' + G.nodes[x.o - 1].kind + ' ' + lab(G.nodes[x.o - 1]) + ' ' + x.kind.replace(/_/g, ' ') + ' the ' + G.nodes[s.i - 1].kind + ' ' + sn + '.').join('\n') + '\n';
  acc.triples.push(countTokens(triples)); acc.adjacency.push(countTokens(adjacency)); acc.tree.push(countTokens(tree)); acc.json.push(countTokens(json)); acc.sentences.push(countTokens(sentences)); acc.edges.push(nb.length);
}
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
console.log('seeds measured', acc.edges.length, 'mean edges', mean(acc.edges).toFixed(1));
for (const k of ['triples', 'adjacency', 'tree', 'json', 'sentences']) console.log(k, 'mean tokens', mean(acc[k]).toFixed(0), 'per edge', (mean(acc[k]) / mean(acc.edges)).toFixed(1), 'ratio to triples', (mean(acc[k]) / mean(acc.triples)).toFixed(2));
// 3. how heavy is the tail of node degree: what a 1-hop dump costs
const deg = G.nodes.map((n) => (adj.get(n.i) || []).length);
console.log('degree', JSON.stringify(stat(deg.filter((d) => d > 0))));
