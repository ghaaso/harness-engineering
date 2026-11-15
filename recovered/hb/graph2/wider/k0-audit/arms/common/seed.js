'use strict';
// Map a task seed {path, symbol:{name,kind,start,end}|null} to graph node ids.
// Seeds = the file node of the path, plus the symbol node when one matches. Match order:
//   1. a node in that file whose id ends "#<name>" (or "#test:<name>" for a JS test block)
//   2. a definition node in that file whose name equals the last part of <name> and whose first
//      line equals symbol.start
//   3. a definition node in that file whose first line equals symbol.start
//   4. (object literal or describe block) every definition node inside [start, end], at most 50
//   otherwise the file alone (Python module variables have no node)
// The match rule is reported per task (seed_match), so unmatched symbols are visible, not hidden.
const DEF_KINDS = new Set(['function', 'method', 'class', 'component', 'constant', 'test', 'migration']);

function indexByPath(G) {
  if (G._byPath) return G._byPath;
  const m = new Map();
  for (const n of G.nodes) if (n.path) { if (!m.has(n.path)) m.set(n.path, []); m.get(n.path).push(n); }
  G._byPath = m; return m;
}

function mapSeed(G, seed) {
  const byPath = indexByPath(G);
  const inFile = byPath.get(seed.path) || [];
  const file = inFile.find((n) => (n.kind === 'file' || n.kind === 'doc') && n.path === seed.path);
  const ids = []; let match = 'none'; let sym = null;
  if (seed.symbol) {
    const s = seed.symbol;
    const suf1 = '#' + s.name; const suf2 = '#test:' + s.name;
    sym = inFile.find((n) => n.sid.endsWith(suf1) || n.sid.endsWith(suf2));
    if (sym) match = 'id';
    if (!sym) {
      const last = s.name.split(/[.>]/).pop().trim();
      sym = inFile.find((n) => DEF_KINDS.has(n.kind) && n.name === last && n.ls === s.start);
      if (sym) match = 'name+line';
    }
    if (!sym) {
      sym = inFile.filter((n) => DEF_KINDS.has(n.kind) && n.ls === s.start).sort((a, b) => a.i - b.i)[0];
      if (sym) match = 'line';
    }
  }
  let members = [];
  if (seed.symbol && !sym) {
    // 4. an object literal or a describe block: its member definitions inside [start, end]
    const s = seed.symbol;
    members = inFile.filter((n) => DEF_KINDS.has(n.kind) && n.ls >= s.start && (n.le || n.ls) <= s.end)
      .sort((a, b) => a.i - b.i).slice(0, 50);
    if (members.length) match = 'members';
  }
  if (file) ids.push(file.i);
  if (sym) ids.push(sym.i);
  for (const n of members) ids.push(n.i);
  ids.sort((a, b) => a - b);
  return { ids, file: file ? file.i : 0, sym: sym ? sym.i : 0, match: seed.symbol ? match : 'file-only', fileFound: !!file };
}

module.exports = { mapSeed, DEF_KINDS };
