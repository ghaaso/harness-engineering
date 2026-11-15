// Small HTML helpers shared by the section builders.
'use strict';
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// Inline markup for prose written in this repo: **bold**, `code`, and number tags written as [M] [E] [G] [S] [T] [I].
function md(s) {
  return esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    // A short file name or id never breaks at its own hyphen ("ff-" / "slot.sh"); longer paths may still wrap.
    .replace(/`([^`]+)`/g, (m, c) => `<code${c.length <= 24 && !/\s/.test(c) ? ' class="nw"' : ''}>${c}</code>`)
    .replace(/\[(M|E|G|S|T|I)\]/g, '<span class="tg">$1</span>')
    // A number keeps its unit, and a tag keeps the word before it and the punctuation after it, on one line.
    .replace(/(\d) (%|s|ms|k|GB|GiB|MB|min)(?![\w-])/g, '$1 $2')
    .replace(/([^\s<>]+) ?<span class="tg">(\w)<\/span>([.,;:)]*)/g, '<span class="nw">$1 <span class="tg">$2</span>$3</span>');
}
const P = (s, cls) => `<p${cls ? ` class="${cls}"` : ''}>${md(s)}</p>`;
const H = (lvl, s, id, extra) => `<h${lvl}${id ? ` id="${id}"` : ''}${extra || ''}>${md(s)}</h${lvl}>`;
const UL = items => `<ul>${items.map(i => `<li>${md(i)}</li>`).join('')}</ul>`;
const OL = items => `<ol>${items.map(i => `<li>${md(i)}</li>`).join('')}</ol>`;
const BOX = (cls, inner) => `<div class="${cls}">${inner}</div>`;
// Maturity: 0 parked, 1 idea, 2 designed, 3 built, 4 tested, 5 in use.
const MAT_NAMES = ['Parked', 'Idea', 'Designed', 'Built', 'Tested', 'In use'];
function meter(level) {
  if (level === 0) return `<span class="mt parked">${'<i></i>'.repeat(5)}</span><span class="mtl">Parked</span>`;
  return `<span class="mt">${'<i class="on"></i>'.repeat(level)}${'<i></i>'.repeat(5 - level)}</span><span class="mtl">${MAT_NAMES[level]}</span>`;
}
function figure(svg, caption, howto, shows) {
  return `<figure class="keep">${howto ? `<div class="howto">${md(howto)}</div>` : ''}${svg}${shows ? `<div class="shows">${md(shows)}</div>` : ''}${caption ? `<figcaption>${md(caption)}</figcaption>` : ''}</figure>`;
}
function legend(items) { return `<div class="legend">${items.map(i => `<span><i style="background:${i.color}"></i>${esc(i.name)}</span>`).join('')}</div>`; }
function table(cols, rows, o) {
  o = o || {};
  const head = `<thead><tr>${cols.map(c => `<th${c.w ? ` style="width:${c.w}"` : ''}${c.num ? ' class="num"' : ''}>${esc(c.t)}</th>`).join('')}</tr></thead>`;
  const body = `<tbody>${rows.map(r => `<tr>${r.map((cell, i) => `<td${cols[i] && cols[i].num ? ' class="num"' : ''}>${cell}</td>`).join('')}</tr>`).join('')}</tbody>`;
  return `<table class="${o.split === false ? '' : 'split'}${o.cls ? ' ' + o.cls : ''}"${o.id ? ` id="${o.id}"` : ''}>${head}${body}</table>`;
}
module.exports = { esc, md, P, H, UL, OL, BOX, meter, figure, legend, table, MAT_NAMES };
