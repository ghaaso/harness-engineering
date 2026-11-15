'use strict';
// One deterministic code tokenizer for every arm (protocol section 5, "one deterministic tokenizer").
// No model tokenizer may be installed, so this is a regex approximation of a byte-pair code tokenizer
// in the style of the Agent Retrieval Bench regex tokenizer. The rule, applied left to right:
//   1. "\n" (or "\r\n")                          -> 1 token
//   2. a run of spaces/tabs: length 1            -> 0 tokens (merges into the next token, as " foo" does)
//                            length n >= 2       -> ceil(n / 8) tokens (indentation runs merge)
//   3. an identifier run [A-Za-z0-9_]+ is split into pieces: camelCase humps, ALLCAPS runs, digit runs;
//      underscores join the following piece and are not counted;
//        letter piece of length L                -> ceil(L / 8) tokens (a common word is one token)
//        digit piece of length L                 -> ceil(L / 3) tokens (digits group by three)
//   4. a run of ASCII punctuation of length n    -> ceil(n / 2) tokens (pairs such as "()", "=>", "};" merge)
//   5. any other character (non-ASCII)           -> ceil(utf8 bytes / 2) tokens
// countTokens(text) is the only number any arm reports as "tokens". segments(text) returns the same
// count split into atomic segments, so the packer can cut the last item at the budget.
const RE = /\r?\n|[ \t]+|[A-Za-z0-9_]+|[!-\/:-@\[-^`{-~]+|[^\x00-\x7f]|[\x00-\x08\x0b-\x1f\x7f]/g;
const PIECE = /_*(?:[A-Z]+(?![a-z])|[A-Z]?[a-z]+|[0-9]+)/g;

function identTokens(w) {
  let n = 0; let m;
  PIECE.lastIndex = 0;
  let matched = 0;
  while ((m = PIECE.exec(w)) !== null) {
    const p = m[0].replace(/^_+/, '');
    matched += m[0].length;
    if (!p) continue;
    n += /^[0-9]/.test(p) ? Math.ceil(p.length / 3) : Math.ceil(p.length / 8);
  }
  if (n === 0) n = 1; // e.g. "__" alone
  return n;
}

function segTokens(s) {
  const c = s.charCodeAt(0);
  if (s === '\n' || s === '\r\n') return 1;
  if (c === 32 || c === 9) return s.length === 1 ? 0 : Math.ceil(s.length / 8);
  if (/^[A-Za-z0-9_]/.test(s)) return identTokens(s);
  if (c < 128 && /[!-\/:-@\[-^`{-~]/.test(s[0])) return Math.ceil(s.length / 2);
  if (c < 128) return 1;
  return Math.ceil(Buffer.byteLength(s, 'utf8') / 2);
}

function countTokens(text) {
  if (!text) return 0;
  let n = 0; let m;
  RE.lastIndex = 0;
  while ((m = RE.exec(text)) !== null) n += segTokens(m[0]);
  return n;
}

// [{end, tok}] cumulative: end = char offset after the segment, tok = tokens up to and including it.
function prefixWithin(text, limit) {
  // Longest prefix of `text` whose token count is <= limit (segments are atomic).
  let n = 0; let m; let end = 0;
  RE.lastIndex = 0;
  while ((m = RE.exec(text)) !== null) {
    const t = segTokens(m[0]);
    if (n + t > limit) break;
    n += t; end = m.index + m[0].length;
  }
  return { text: text.slice(0, end), tokens: n };
}

module.exports = { countTokens, prefixWithin, RULE: 'regex-bpe-approx v1' };
