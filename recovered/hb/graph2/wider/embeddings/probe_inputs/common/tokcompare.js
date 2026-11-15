'use strict';
// How the shared tokenizer compares with characters / 4 on real outputs: the rendered items of every
// output form for 60 seeds at the frozen commit (the text an agent would receive), plus whole source
// files by language.  node tokcompare.js -> results/tokenizer/compare.json
const fs = require('fs');
const path = require('path');
const P = require('./paths');
const C = require('./config');
const { loadFacts } = require('./facts');
const { RefGraph } = require('../reference/ref');
const { project, render } = require('./packer');
const { countTokens } = require('./tokenizer');
const source = require('./source');

const G = loadFacts(P.FROZEN);
const R = new RefGraph(G);
const defs = G.nodes.filter((n) => ['function', 'method', 'component', 'class'].includes(n.kind) && n.file);
const k = Math.floor(defs.length / 60);
const acc = {};
const add = (key, text) => {
  const a = acc[key] = acc[key] || { items: 0, chars: 0, tokens: 0, ratios: [] };
  const t = countTokens(text); const c = text.length;
  a.items++; a.chars += c; a.tokens += t; if (c >= 20) a.ratios.push(t / (c / 4));
};
for (let j = 0; j < 60; j++) {
  const n = defs[j * k]; const ids = [n.file, n.i].sort((a, b) => a - b);
  const ranked = R.rank(ids, C.normalise(require('../relational/sweep').BASE), { path: n.path, symbol: { name: n.name } });
  for (const gran of ['file', 'symbol']) {
    const units = project(G, ranked, ids, gran).slice(0, 15);
    for (const form of ['paths', 'signature', 'range', 'snippet']) for (const u of units) add(gran + '/' + form, render(G, u.u, form, gran).text);
  }
}
const files = G.nodes.filter((n) => n.kind === 'file' || n.kind === 'doc');
for (const f of files) {
  const L = source.getLines(G.sha, f.path); if (!L) continue;
  const ext = (f.path.match(/\.([a-z]+)$/) || [, 'other'])[1];
  add('whole file .' + ext, L.join('\n') + '\n');
}
const out = { rule: require('./tokenizer').RULE, by_output: {} };
for (const [key, a] of Object.entries(acc)) {
  if (a.items < 3) continue;
  const r = a.ratios.sort((x, y) => x - y);
  out.by_output[key] = { items: a.items, chars: a.chars, tokens: a.tokens, chars_div_4: Math.round(a.chars / 4),
    tokens_over_chars4: +(a.tokens / (a.chars / 4)).toFixed(3), chars_per_token: +(a.chars / a.tokens).toFixed(2),
    per_item_ratio_p10: r.length ? +r[Math.floor(r.length * 0.1)].toFixed(3) : null, per_item_ratio_p90: r.length ? +r[Math.floor(r.length * 0.9)].toFixed(3) : null };
}
fs.mkdirSync(path.join(P.RESULTS, 'tokenizer'), { recursive: true });
fs.writeFileSync(path.join(P.RESULTS, 'tokenizer', 'compare.json'), JSON.stringify(out, null, 1));
for (const [k2, v] of Object.entries(out.by_output)) console.log(k2.padEnd(22), 'items', String(v.items).padStart(5), 'tokens/(chars/4)', v.tokens_over_chars4, 'chars/token', v.chars_per_token, 'p10-p90', v.per_item_ratio_p10, v.per_item_ratio_p90);
