'use strict';
// Arm (a) SEARCH, the core: what a careful person does with grep. Read the seed, grep its name, the
// spellings that import its module and its route strings (round one); then open the best hits and
// grep again from the definitions that hit (round two, and three when asked). Every grep, read and
// list goes into the cost ledger with the tokens it returns.
// It returns the search's OWN ranked head only. There is no directory fill here any more: padding is
// the shared packer option `pad` (addendum 2, B.7), applied by the harness like for every other arm.
const path = require('path');
const L = require('./lib');
const S = require('./spell');
const { Ledger, tokenize } = require('./engine');

// The search factors (protocol section 5a: rounds, terms, BM25, proximity, weights). Every
// configuration in sweep.js carries all of them explicitly under `search`, so the hash is complete.
const FIELDS = {
  rounds: (v) => [1, 2, 3].includes(v),              // grep rounds
  routes: (v) => typeof v === 'boolean',             // terms: grep the seed's route strings
  spellings: (v) => typeof v === 'boolean',          // terms: grep the module/import spellings
  nullNames: (v) => Number.isInteger(v) && v >= 0,   // terms: names grepped for a file seed (its top-level definitions)
  seedImports: (v) => typeof v === 'boolean',        // terms: the seed's own imports, seen when reading it
  namesPerFile: (v) => Number.isInteger(v) && v >= 1, // terms: round 2+ greps the top N definitions that hit in a file
  genericCap: (v) => Number.isInteger(v) && v >= 1,  // terms: a pattern with more hit lines than this is dropped
  followImports: (v) => typeof v === 'boolean',      // terms: follow an import hit to the definitions using the names
  k2: (v) => Number.isInteger(v) && v >= 1,          // rounds: files opened per later round
  decay: (v) => typeof v === 'number' && v > 0 && v <= 1, // rounds: weight of round r = decay^(r-1)
  bm25: (v) => typeof v === 'boolean',               // BM25: add a BM25 file ranking to the grep ranking
  bm25only: (v) => typeof v === 'boolean',           // BM25: BM25 alone (no grep rounds)
  bm25K1: (v) => typeof v === 'number' && v > 0,
  bm25B: (v) => typeof v === 'number' && v >= 0 && v <= 1,
  bm25Top: (v) => Number.isInteger(v) && v >= 1,     // BM25: files kept from the BM25 list
  prox: (v) => typeof v === 'number' && v >= 0,      // proximity prior: same dir 1+p, same capability 1+0.6p, same runtime 1+0.2p
  typeW: (v) => v && ['def', 'import', 'mock', 'call'].every((k) => typeof v[k] === 'number' && v[k] >= 0) && Object.keys(v).length === 4,
  countW: (v) => typeof v === 'number' && v >= 0,    // weights: file score += countW * log2(1 + hit lines)
  idf: (v) => typeof v === 'boolean',                // weights: down-weight a pattern by how many files it hits
};

function checkSearch(s) {
  if (!s || typeof s !== 'object') throw new Error('INVALID CONFIG: search arm needs a `search` object');
  for (const k of Object.keys(FIELDS)) if (!(k in s)) throw new Error('INVALID CONFIG: search.' + k + ' missing');
  for (const k of Object.keys(s)) {
    if (!FIELDS[k]) throw new Error('INVALID CONFIG: unknown search field ' + k);
    if (!FIELDS[k](s[k])) throw new Error('INVALID CONFIG: bad value for search.' + k + ': ' + JSON.stringify(s[k]));
  }
  return s;
}

function seedNames(ctx, seed, cap) {
  const sym = seed.symbol;
  if (sym) {
    if (sym.kind === 'test' || sym.name.includes(' > ')) return [];
    const parts = sym.name.split('.');
    let n = parts[parts.length - 1];
    if (n.startsWith('__') || n.length < 3) n = parts[0];
    return n && n.length >= 3 ? [n] : [];
  }
  if (L.isTestPath(seed.path)) return [];
  const defs = (ctx.nodes.get(seed.path) || []).filter((d) => !d.name.includes('.') && ['function', 'class', 'component', 'constant'].includes(d.kind));
  const seen = new Set(); const out = [];
  for (const d of defs) { if (d.name.length >= 3 && !seen.has(d.name)) { seen.add(d.name); out.push(d.name); } }
  return out.slice(0, cap);
}

// Proximity prior: same directory > same capability folder (any runtime) > same runtime.
function proxBoost(seedPath, p, prox) {
  if (!prox) return 1;
  if (path.posix.dirname(p) === path.posix.dirname(seedPath)) return 1 + prox;
  const c = L.capabilityOf(seedPath);
  if (c && L.capabilityOf(p) === c) return 1 + prox * 0.6;
  if (L.runtimeOf(p) && L.runtimeOf(p) === L.runtimeOf(seedPath)) return 1 + prox * 0.2;
  return 1;
}

function addSym(a, enc, score, lk, round) {
  const key = enc ? enc.i : '#file';
  if (!a.syms.has(key)) a.syms.set(key, { enc, score: 0, lookup: lk, round });
  a.syms.get(key).score += score;
}

// One search pass for a set of patterns. acc: path -> {score, syms: Map(key -> {enc, score, lookup, round}), lookup, round}
function runPatterns(ctx, ledger, pats, acc, mult, seed, done, v, round) {
  const N = ctx.codePaths.length; const W = v.typeW;
  for (const pt of pats) {
    if (done.has(pt.label)) continue; done.add(pt.label);
    let hits = ctx.grep(pt.re);
    if (pt.verify) hits = hits.filter(pt.verify);
    const lk = ledger.grepCost(pt.label, hits);
    if (hits.length > v.genericCap) continue; // too generic: a person refines or drops it
    const byFile = new Map();
    for (const h of hits) { if (!byFile.has(h.path)) byFile.set(h.path, []); byFile.get(h.path).push(h); }
    const w = v.idf ? Math.log(1 + N / Math.max(1, byFile.size)) / Math.log(1 + N) : 1;
    for (const [p, hs] of byFile) {
      const imp = ctx.importLineSet(p);
      if (!acc.has(p)) acc.set(p, { score: 0, syms: new Map(), lookup: lk, round });
      const a = acc.get(p); let best = 0; const m = mult * w * proxBoost(seed.path, p, v.prox);
      for (const h of hs) {
        const ty = pt.type || S.hitType(p, h.text, pt.name || '', imp, h.line);
        best = Math.max(best, W[ty]);
        const enc = imp.has(h.line) ? null : L.enclosing(ctx.nodes, p, h.line);
        addSym(a, enc, m * W[ty], lk, round);
        // follow an import hit to the definitions that use the imported names (one more grep, costed)
        if (v.followImports && imp.has(h.line)) {
          const im = ctx.imports(p).find((x) => x.line <= h.line && h.line <= x.endLine);
          const nm = im ? (im.names.length ? im.names : [im.spec.split(/[./]/).pop()]) : [];
          const used = []; const ls = ctx.lines.get(p);
          if (nm.length) {
            const re = new RegExp('\\b(' + nm.map(S.esc).join('|') + ')\\b');
            for (let i = 0; i < ls.length; i++) if (!imp.has(i + 1) && re.test(ls[i])) used.push(i + 1);
          }
          const lk2 = ledger.grepCost(`names from ${pt.label} in ${p}`, used.map((ln) => ({ path: p, line: ln, text: ls[ln - 1] })));
          for (const ln of used) addSym(a, L.enclosing(ctx.nodes, p, ln), m * W.call, lk2, round);
        }
      }
      a.score += m * (best + v.countW * Math.log2(1 + hs.length));
    }
  }
}

const namePatterns = (names) => names.map((n) => ({ label: 'name ' + n, name: n, re: new RegExp('\\b' + S.esc(n) + '\\b') }));
function spellingPatterns(ctx, target, v) {
  if (!v.spellings) return [];
  return S.moduleSpellings(target).map((sp) => ({ ...sp, label: sp.label, type: 'import',
    verify: sp.js ? (h) => (h.path !== target && ctx.imports(h.path).some((im) => im.line <= h.line && h.line <= im.endLine && im.resolved.includes(target))) : (h) => h.path !== target }));
}
function routePatterns(routes) {
  const out = [];
  for (const r of routes) { const rp = S.routePattern(r); if (rp) out.push({ label: rp.label, re: rp.re, name: '' }); }
  return out;
}

function rankFiles(acc, bm, seedPath) {
  const g = [...acc.entries()].filter(([p]) => p !== seedPath).map(([p, a]) => ({ path: p, g: a.score }));
  const maxG = Math.max(1e-9, ...g.map((x) => x.g));
  const m = new Map(g.map((x) => [x.path, { path: x.path, score: x.g / maxG }]));
  if (bm && bm.length) {
    const maxB = Math.max(...bm.map((r) => r.score));
    for (const r of bm) { if (!m.has(r.path)) m.set(r.path, { path: r.path, score: 0, lookup: r.lookup }); m.get(r.path).score += r.score / maxB; }
  }
  return [...m.values()].sort((a, b) => b.score - a.score || (a.path < b.path ? -1 : 1));
}

// Returns {files, acc, seedPath, ledger, meta}: the file ranking (seed file excluded) and, per file,
// the definitions that hit with their scores and the lookup that first returned them.
function search(ctx, seed, v) {
  const ledger = new Ledger(); const acc = new Map(); const done = new Set();
  const text = ctx.files.get(seed.path) || '';
  const range = seed.symbol ? [seed.symbol.start, seed.symbol.end] : null;
  // Look 1: read the seed (its symbol, or the whole file). A session always opens the seed first.
  const seedText = range ? text.split('\n').slice(range[0] - 1, range[1]).join('\n') : text;
  ledger.readCost('read seed ' + seed.path, seedText);
  if (v.seedImports && !v.bm25only) {
    // the seed's own in-repo imports seen in that read (for a symbol seed, only the names it uses)
    const usedIn = (nm) => !range || new RegExp('\\b' + S.esc(nm) + '\\b').test(seedText);
    const ims = ctx.imports(seed.path).filter((im) => !range || !im.names.length || im.names.some(usedIn));
    for (const im of ims) for (const f of im.resolved) {
      if (f === seed.path) continue;
      if (!acc.has(f)) acc.set(f, { score: 0, syms: new Map(), lookup: 1, round: 1 });
      const a = acc.get(f); a.score += v.typeW.import * 0.5 * proxBoost(seed.path, f, v.prox);
      const defs = (ctx.nodes.get(f) || []).filter((d) => im.names.includes(d.name));
      for (const d of defs) addSym(a, d, v.typeW.import * 0.5, 1, 1);
    }
  }
  const names = seedNames(ctx, seed, v.nullNames);
  const routes = v.routes ? S.routeStrings(seed.path, text, range) : [];
  if (!v.bm25only) runPatterns(ctx, ledger, [...namePatterns(names), ...spellingPatterns(ctx, seed.path, v), ...routePatterns(routes)], acc, 1, seed, done, v, 1);
  const r1Lookups = ledger.n;
  let bm = null;
  if (v.bm25 || v.bm25only) {
    const qt = []; for (const n of names) qt.push(...tokenize(n));
    for (const sp of S.moduleSpellings(seed.path)) qt.push(...tokenize(sp.label.split(' ').pop()));
    for (const r of routes) qt.push(...tokenize(r.replace(/\{[^}]*\}/g, ' ').replace(/\bapi\b/g, ' ')));
    if (!names.length) qt.push(...tokenize(path.posix.basename(seed.path).replace(/\.[^.]+$/, '')));
    bm = ctx.bm25Search(qt, v.bm25K1, v.bm25B).filter((r) => r.path !== seed.path).slice(0, v.bm25Top);
    const bmLk = ledger.listCost('bm25 ' + [...new Set(qt)].slice(0, 12).join(' '), bm.map((r) => r.path));
    for (const r of bm) { r.lookup = bmLk; r.score *= proxBoost(seed.path, r.path, v.prox); }
  }
  // Later rounds: open the top k2 files not yet opened, grep the definitions that hit there, their
  // module spellings and the routes inside those definitions. Round r weighs decay^(r-1).
  const opened = new Set();
  for (let round = 2; round <= v.rounds && !v.bm25only; round++) {
    const top = rankFiles(acc, bm, seed.path).filter((t) => !opened.has(t.path)).slice(0, v.k2);
    const maxS = Math.max(1e-9, ...top.map((t) => t.score));
    const sub = new Map();
    for (const t of top) {
      opened.add(t.path);
      const a = acc.get(t.path); if (!a) continue;
      const defs = [...a.syms.values()].filter((s) => s.enc).sort((x, y) => y.score - x.score || x.enc.start - y.enc.start).slice(0, v.namesPerFile).map((s) => s.enc);
      const body = defs.map((d) => ctx.lines.get(t.path).slice(d.start - 1, d.end).join('\n')).join('\n');
      ledger.readCost('read hits in ' + t.path, body || (ctx.files.get(t.path) || '').slice(0, 2000));
      const n2 = [...new Set(defs.map((d) => d.name.split('.').pop()).filter((n) => n.length >= 3 && !n.startsWith('__') && !/\s/.test(n)))];
      const r2 = v.routes ? [...new Set(defs.flatMap((d) => S.routeStrings(t.path, ctx.files.get(t.path), [d.start, d.end])))] : [];
      runPatterns(ctx, ledger, [...namePatterns(n2), ...spellingPatterns(ctx, t.path, v), ...routePatterns(r2)], sub, Math.pow(v.decay, round - 1) * (t.score / maxS), seed, done, v, round);
    }
    for (const [p, s] of sub) {
      if (!acc.has(p)) { acc.set(p, s); continue; }
      const a2 = acc.get(p); a2.score += s.score;
      for (const [k, sy] of s.syms) { if (!a2.syms.has(k)) a2.syms.set(k, sy); else a2.syms.get(k).score += sy.score; }
    }
  }
  const files = rankFiles(acc, bm, seed.path);
  return { files, acc, ledger, meta: { names, routes, r1_lookups: r1Lookups } };
}

const round9 = (x) => Math.round(x * 1e9) / 1e9;

// The ranked head as canonical graph nodes (SPEC.md section 1), seeds excluded, in rank order:
//   1. definitions that hit inside the seed's own file (score order), shown only at symbol granularity
//      (at file granularity the harness drops the seed file);
//   2. per file in file-rank order: the file node, then the definitions that hit in it (score
//      desc, then first line); a file with no definition hit (reached by an import, a module-level
//      line or BM25) gives its first three top-level definitions.
// So file granularity projects to the file ranking, and symbol granularity to the definitions in
// that order: one list serves both, as the harness requires (rankKey ignores granularity).
// Fields: hop = the round that first reached the node (1..3); score = the file's score (Round9);
// via = ["L<k>", "read<t>"]: k = the 1-based index in this answer's lookup ledger of the lookup that
// first returned the node, t = tokens read by the search through that lookup; path = null (search has
// no explanation path).
function toRanked(ctx, res, seed, seedIds) {
  const { files, acc, ledger } = res;
  const seedSet = new Set(seedIds);
  const out = []; const seen = new Set();
  const viaOf = (lk) => ['L' + lk, 'read' + ledger.tokensThrough(lk)];
  const push = (i, hop, score, lk) => {
    if (!i || seen.has(i) || seedSet.has(i)) return;
    seen.add(i);
    out.push({ i, hop, score: round9(score), via: viaOf(lk), path: null });
  };
  const symsOf = (a) => [...a.syms.values()].filter((s) => s.enc).sort((x, y) => y.score - x.score || x.enc.start - y.enc.start || x.enc.i - y.enc.i);
  const sa = acc.get(seed.path);
  if (sa) for (const s of symsOf(sa)) push(s.enc.i, s.round || 1, 1, s.lookup);
  for (const f of files) {
    const a = acc.get(f.path);
    const lk = a ? a.lookup : (f.lookup || 1);
    const round = a ? (a.round || 1) : 1;
    push(ctx.fileId.get(f.path), round, f.score, lk);
    const syms = a ? symsOf(a) : [];
    if (syms.length) { for (const s of syms) push(s.enc.i, s.round || round, f.score, s.lookup); continue; }
    const top = (ctx.nodes.get(f.path) || []).filter((x) => !x.name.includes('.') && !x.name.includes(' > ')).slice(0, 3);
    for (const d of top) push(d.i, round, f.score, lk);
  }
  return out;
}

module.exports = { FIELDS, checkSearch, search, toRanked, seedNames, proxBoost };
