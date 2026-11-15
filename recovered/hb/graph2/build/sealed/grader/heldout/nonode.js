// Share of reference definitions with no node in the facts of the task's parent commit.
// A definition has a node when a symbol node (function, class, method, test, component, constant)
// of the same path starts on the definition's start line, or has the same last name segment and a
// line range that contains the definition's start line. Run on TUNE (to compare with the audit's
// 182 of 4,162) and on HELD-OUT. Output: nonode.json (aggregates only).
const fs = require('fs'), path = require('path');
const B = path.resolve(__dirname, '../../..');
const L = fs.readFileSync(path.join(B, 'sealed/references.jsonl'), 'utf8').split('\n').filter(Boolean).map(JSON.parse);
const SYM = new Set(['function', 'class', 'method', 'test', 'component', 'constant']);
const cache = new Map();
function nodesOf(parent) {
  if (cache.has(parent)) return cache.get(parent);
  const dir = fs.readdirSync(path.join(B, 'facts/cache')).find((d) => d.startsWith(parent));
  const byPath = new Map();
  if (dir) for (const l of fs.readFileSync(path.join(B, 'facts/cache', dir, 'nodes.jsonl'), 'utf8').split('\n')) {
    if (!l) continue; const o = JSON.parse(l); if (!SYM.has(o.kind) || !o.path) continue;
    if (!byPath.has(o.path)) byPath.set(o.path, []); byPath.get(o.path).push(o);
  }
  const r = dir ? byPath : null; cache.set(parent, r); return r;
}
const last = (s) => String(s || '').split(/[.:#]/).filter(Boolean).pop();
const out = {};
for (const split of ['tune', 'heldout']) for (const set of ['T1', 'T2', 'T3', 'T4']) {
  let n = 0, none = 0, noFacts = 0; const byKind = {};
  for (const r of L) {
    if (r.set !== set || r.split !== split) continue;
    const parent = r.parent; const nb = parent ? nodesOf(parent) : null;
    for (const d of r.defs || []) {
      n++;
      if (!nb) { noFacts++; continue; }
      const cands = nb.get(d.path) || [];
      const hit = cands.some((o) => o.line_start === d.start || (last(o.name) === last(d.name) && o.line_start <= d.start && d.start <= o.line_end));
      if (!hit) { none++; byKind[d.kind] = (byKind[d.kind] || 0) + 1; }
    }
  }
  if (n) out[split + '|' + set] = { defs: n, no_node: none, share: none / n, by_kind: byKind, refs_without_parent_facts: noFacts };
}
fs.writeFileSync(path.join(__dirname, 'nonode.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
