const fs = require('fs');
const f = 'C:/Users/User/Documents/projects/EMS_workshop1/docs/program/evidence/library-pathways/page-src/page.js.txt';
let s = fs.readFileSync(f, 'utf8');
const pairs = [
  ["esc(all.length) + ' branches</b>'", "'<span data-label=\"1\">' + esc(all.length) + ' branches</span></b>'"],
  ["' <small class=\"muted\">(' + list.length + ')</small></h4>'", "' <small class=\"muted\">(' + list.length + ' ' + tagEl('M') + ')</small></h4>'"],
  ["<summary><span>' + esc(GROUP_TITLE(g)) + '</span><small>' + ids.length + ' settings</small></summary>", "<summary><span data-label=\"1\">' + esc(GROUP_TITLE(g)) + '</span><small data-label=\"1\">' + ids.length + ' settings</small></summary>"],
  ["<div class=\"sh\"><b>' + esc(m.meaning) + '</b>", "<div class=\"sh\"><b data-label=\"definition\">' + esc(m.meaning) + '</b>"],
  ["<span class=\"lpbadge\">", "<span class=\"lpbadge\" data-label=\"1\">"],
  ["<select id=\"ensN\">", "<select id=\"ensN\" data-label=\"1\">"],
  ["<p class=\"note\">The box holds the middle half", "<p class=\"note\" data-label=\"definition\">The box holds the middle half"],
  ["</p><p>' + esc(MAP.unit) + ' ' + esc(MAP.cost_unit) + '</p>'", "</p><p data-label=\"definition\">' + esc(MAP.unit) + ' ' + esc(MAP.cost_unit) + '</p>'"]
];
for (const [a, b] of pairs) {
  const n = s.split(a).length - 1;
  if (n !== 1) throw new Error('count ' + n + ' for: ' + a);
  s = s.split(a).join(b);
}
fs.writeFileSync(f, s);
console.log('ok', pairs.length);
