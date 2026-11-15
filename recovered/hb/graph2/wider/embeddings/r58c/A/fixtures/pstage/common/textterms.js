'use strict';
// Shared text normalisation for the text-match score. Both arms index the same normalised text, so the
// relational arm's FTS5 (unicode61 tokenizer) and the reference arm's own BM25 see identical terms:
// every identifier run [A-Za-z0-9_]+ emits its whole lower-cased form (underscores removed) and, when
// it has several parts, each camelCase / snake_case / digit part lower-cased. Output is words of
// [a-z0-9] separated by single spaces, which unicode61 splits exactly on the spaces.
function terms(text) {
  const out = [];
  if (!text) return out;
  const re = /[A-Za-z0-9_]+/g; let m;
  while ((m = re.exec(text)) !== null) {
    const w = m[0];
    const whole = w.replace(/_/g, '').toLowerCase();
    if (!whole) continue;
    const parts = w.match(/[A-Z]+(?![a-z])|[A-Z]?[a-z]+|[0-9]+/g) || [];
    out.push(whole);
    if (parts.length > 1) for (const p of parts) out.push(p.toLowerCase());
  }
  return out;
}
const stripExt = (p) => p.replace(/\.[A-Za-z0-9]+$/, '');

// Indexed text of one node: its path without extension, its name, its signature, and for a doc
// section the section's own lines.
function nodeText(n, sectionLines) {
  const parts = [];
  if (n.path) parts.push(stripExt(n.path));
  if (n.name) parts.push(n.name);
  if (n.signature) parts.push(n.signature);
  if (sectionLines) parts.push(sectionLines);
  return terms(parts.join(' ')).join(' ');
}

// Query terms of a seed: the symbol name, the file name without extension and its directory name;
// distinct, in order of first appearance, length >= 2.
function seedQuery(seed) {
  const raw = [];
  if (seed.symbol && seed.symbol.name) raw.push(seed.symbol.name);
  const segs = seed.path.split('/');
  raw.push(stripExt(segs[segs.length - 1]));
  if (segs.length > 1) raw.push(segs[segs.length - 2]);
  const seen = new Set(); const q = [];
  for (const t of terms(raw.join(' '))) if (t.length >= 2 && !seen.has(t)) { seen.add(t); q.push(t); }
  return q;
}

module.exports = { terms, nodeText, seedQuery };
