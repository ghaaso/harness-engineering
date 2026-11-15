'use strict';
// The shared packer and answer format (protocol section 5 "one packer"; addendum 2 A.2 and B.7).
// project(): ranked graph nodes (the arm's head) -> output units at file or symbol granularity.
// tail:      the shared padding tail (padding.js) appended after the head without duplicates.
// render():  one unit in one of the four output forms (paths; path+signature; path+line range; snippet).
// pack():    fill each token budget in unit order, headers counted, the last unit cut at the budget,
//            plus a "[+N more not shown]" footer whenever something lies beyond the cut. A cut unit
//            shows only the lines that fit WHOLE (with their newline): the scorer credits nothing else.
const { countTokens, prefixWithin } = require('./tokenizer');
const { BUDGETS, FOOTER_RESERVE } = require('./config');
const source = require('./source');
const { DEF_KINDS } = require('./seed');
const { tailUnits } = require('./padding');

const SYMBOL_EXCLUDED = new Set(['file', 'doc', 'slice', 'runtime']);

// ranked: [{i, hop, score, via}] in rank order, seeds excluded. Returns head units in output order.
function project(G, ranked, seedIds, granularity) {
  const seedSet = new Set(seedIds);
  const seedFiles = new Set(seedIds.map((s) => G.nodes[s - 1].file).filter(Boolean));
  const out = []; const seen = new Set();
  for (const r of ranked) {
    const n = G.nodes[r.i - 1];
    let u;
    if (granularity === 'file') {
      u = n.file;
      if (!u || seedFiles.has(u)) continue;
    } else {
      if (!n.path || !n.ls || SYMBOL_EXCLUDED.has(n.kind) || seedSet.has(n.i)) continue;
      u = n.i;
    }
    if (seen.has(u)) continue;
    seen.add(u);
    out.push({ u, from: r.i, hop: r.hop, score: r.score, via: r.via, pad: 0 });
  }
  return out;
}

// Head units followed by the padding tail (no duplicates; seed file and seed nodes never appear).
function withTail(G, head, seedIds, seedPath, pad, granularity) {
  if (!pad || pad === 'none') return head;
  const seedSet = new Set(seedIds);
  const seedFiles = new Set(seedIds.map((s) => G.nodes[s - 1].file).filter(Boolean));
  const seen = new Set(head.map((x) => x.u));
  const out = head.slice();
  for (const u of tailUnits(G, seedPath, pad, granularity)) {
    if (seen.has(u) || seedSet.has(u) || (granularity === 'file' && seedFiles.has(u))) continue;
    seen.add(u);
    out.push({ u, from: null, hop: null, score: null, via: null, pad: 1 });
  }
  return out;
}

function label(n) {
  const h = n.sid.indexOf('#');
  if ((n.sid.startsWith('sym:') || n.sid.startsWith('const:')) && h > 0) return n.sid.slice(h + 1);
  return n.kind + ':' + n.name;
}
const firstLine = (s) => (s || '').split('\n')[0].trim().slice(0, 200);

function fileDefs(G, path) {
  if (!G._defsByPath) {
    const m = new Map();
    for (const n of G.nodes) if (n.path && n.ls && DEF_KINDS.has(n.kind)) { if (!m.has(n.path)) m.set(n.path, []); m.get(n.path).push(n); }
    for (const a of m.values()) a.sort((x, y) => x.ls - y.ls || x.i - y.i);
    G._defsByPath = m;
  }
  return G._defsByPath.get(path) || [];
}

// Returns {text, layout, shown, first}. Line 0 of every rendering holds the path.
//   layout 'bare'    paths / range forms: no content lines (shown = null)
//   layout 'sigfile' file signature form: one line per definition after the path line (shown = [lines])
//   layout 'sigsym'  symbol signature form: one line "path:ls: signature" (shown = [ls])
//   layout 'snippet' header line then source lines first..last (shown = [first, last])
function render(G, unitId, form, granularity) {
  const n = G.nodes[unitId - 1];
  if (granularity === 'file') {
    if (form === 'paths') return { text: n.path + '\n', layout: 'bare', shown: null };
    if (form === 'range') return { text: n.path + ':1-' + (n.le || 1) + '\n', layout: 'bare', shown: null };
    if (form === 'signature') {
      const defs = fileDefs(G, n.path);
      let t = n.path + '\n'; const shown = [];
      for (const d of defs) { t += '  ' + d.ls + ': ' + (firstLine(d.signature) || label(d)) + '\n'; shown.push(d.ls); }
      return { text: t, layout: 'sigfile', shown };
    }
    const L = source.getLines(G.sha, n.path) || [];
    return { text: '--- ' + n.path + '\n' + L.map((x) => x + '\n').join(''), layout: 'snippet', shown: L.length ? [1, L.length] : null, first: 1 };
  }
  const lab = label(n);
  if (form === 'paths') return { text: n.path + '::' + lab + '\n', layout: 'bare', shown: null };
  if (form === 'range') return { text: n.path + '::' + lab + ' ' + n.ls + '-' + (n.le || n.ls) + '\n', layout: 'bare', shown: null };
  if (form === 'signature') return { text: n.path + ':' + n.ls + ': ' + (firstLine(n.signature) || lab) + '\n', layout: 'sigsym', shown: [n.ls] };
  const L = source.getLines(G.sha, n.path) || [];
  const le = n.le || n.ls;
  const body = L.slice(n.ls - 1, le);
  return { text: '--- ' + n.path + '::' + lab + ' ' + n.ls + '-' + le + '\n' + body.map((x) => x + '\n').join(''), layout: 'snippet', shown: body.length ? [n.ls, n.ls + body.length - 1] : null, first: n.ls };
}

// What a cut prefix shows under the whole-line rule: m = number of complete lines (newlines) in it.
function shownOfPrefix(r, prefix) {
  const m = (prefix.match(/\n/g) || []).length;
  const pathShown = m >= 1;
  let shown = null;
  if (r.layout === 'sigfile') shown = r.shown.slice(0, Math.max(0, m - 1));
  else if (r.layout === 'sigsym') shown = m >= 1 ? r.shown.slice() : [];
  else if (r.layout === 'snippet') shown = (r.shown && m >= 2) ? [r.first, Math.min(r.shown[1], r.first + m - 2)] : null;
  return { path_shown: pathShown, shown };
}

function itemMeta(G, unit, granularity) {
  const n = G.nodes[unit.u - 1];
  return {
    kind: n.kind, path: n.path, symbol: granularity === 'file' ? null : label(n),
    ls: n.ls || null, le: n.le || null, hop: unit.hop, via: unit.via, score: unit.score, pad: unit.pad ? 1 : 0,
  };
}

// Pack units at every budget. Items are rendered lazily up to the largest budget.
// budgets[b] = {n_full, cut: null | {tok, path_shown, shown, pad}, used, beyond, head_tok, tail_tok}
// used includes the footer; head_tok / tail_tok split the shown items' tokens (cut included) by origin.
function pack(G, units, form, granularity, budgets = BUDGETS) {
  const maxB = Math.max(...budgets);
  const items = []; let cum = 0;
  for (let j = 0; j < units.length && cum <= maxB; j++) {
    const r = render(G, units[j].u, form, granularity);
    const tok = countTokens(r.text);
    items.push({ ...itemMeta(G, units[j], granularity), tok, shown: r.shown, _r: r });
    cum += tok;
  }
  const res = {};
  for (const b of budgets) {
    let total = 0; for (const it of items) { total += it.tok; if (total > b) break; }
    if (total <= b && items.length === units.length) {
      let ht = 0; let tt = 0; for (const it of items) { if (it.pad) tt += it.tok; else ht += it.tok; }
      res[b] = { n_full: items.length, cut: null, used: total, beyond: 0, head_tok: ht, tail_tok: tt };
      continue;
    }
    const avail = b - FOOTER_RESERVE;
    let used = 0; let k = 0; let ht = 0; let tt = 0;
    while (k < items.length && used + items[k].tok <= avail) { used += items[k].tok; if (items[k].pad) tt += items[k].tok; else ht += items[k].tok; k++; }
    let cut = null;
    if (k < items.length && avail - used > 0) {
      const p = prefixWithin(items[k]._r.text, avail - used);
      if (p.tokens > 0) {
        cut = { tok: p.tokens, ...shownOfPrefix(items[k]._r, p.text), pad: items[k].pad };
        used += p.tokens; if (items[k].pad) tt += p.tokens; else ht += p.tokens;
      }
    }
    const nShown = k + (cut ? 1 : 0);
    const beyond = units.length - nShown;
    used += countTokens('[+' + beyond + ' more not shown]\n');
    res[b] = { n_full: k, cut, used, beyond, head_tok: ht, tail_tok: tt };
  }
  for (const it of items) delete it._r;
  const keep = Math.max(...budgets.map((b) => res[b].n_full + (res[b].cut ? 1 : 0)));
  const beyondSample = units.slice(keep, keep + 50).map((u) => { const n = G.nodes[u.u - 1]; return granularity === 'file' ? n.path : n.path + '::' + label(n); });
  return { items: items.slice(0, keep), budgets: res, n_units: units.length, n_head: units.filter((u) => !u.pad).length, beyond_sample: beyondSample };
}

module.exports = { project, withTail, render, pack, label, countTokens, shownOfPrefix };
