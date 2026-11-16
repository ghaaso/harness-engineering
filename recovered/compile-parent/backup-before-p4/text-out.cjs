// Splits the built HTML into plain-text files by part, for the reader test.
// Usage: node text-out.cjs   -> out/text/*.txt
'use strict';
const fs = require('fs'), path = require('path');
const OUT = path.resolve(__dirname, '..', 'out');
const html = fs.readFileSync(path.join(OUT, 'harness-compile.html'), 'utf8')
  .replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<script[\s\S]*?<\/script>/g, ' ');
const cat = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'data', 'catalogue.json'), 'utf8'));
const strip = s => s
  .replace(/<svg[\s\S]*?<\/svg>/g, m => ' [chart: ' + (m.match(/<title>([^<]*)<\/title>/) || [, ''])[1] + '] ' + (m.match(/>([^<>]{2,})</g) || []).map(t => t.slice(1, -1)).join(' | ') + ' ')
  .replace(/<(tr|p|li|h[1-6]|div|figcaption|br)[^>]*>/g, '\n').replace(/<td[^>]*>/g, ' | ').replace(/<[^>]+>/g, '')
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&[a-z#0-9]+;/g, ' ')
  .replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim();
const at = id => { const i = html.indexOf(`id="${id}"`); if (i < 0) throw new Error('no id ' + id); return html.lastIndexOf('<', i); };
const cuts = [
  ['01-front-part1-part2', at('contents'), at('p2-register')],
  ['02-register', at('p2-register'), at('p3')],
];
const th = cat.themes.map(t => t.id);
const groups = [th.slice(0, 3), th.slice(3, 6), th.slice(6, 9), th.slice(9)];
cuts.push(['03-part3-overview', at('p3'), at('th-' + th[0])]);
groups.forEach((g, k) => {
  const end = k + 1 < groups.length ? at('th-' + groups[k + 1][0]) : at('p4');
  cuts.push([`04-part3-themes-${k + 1}-${g.join('-')}`, at('th-' + g[0]), end]);
});
cuts.push(['05-part4', at('p4'), at('gloss')]);
cuts.push(['06-glossary-sources', at('gloss'), html.length]);
const dir = path.join(OUT, 'text');
fs.mkdirSync(dir, { recursive: true });
cuts.forEach(([name, a, b]) => {
  const t = strip(html.slice(a, b));
  fs.writeFileSync(path.join(dir, name + '.txt'), t);
  console.log(name, t.length, 'chars', t.split(/\s+/).length, 'words');
});
