const fs = require('fs');
const dir = 'C:/Users/User/Documents/projects/EMS_workshop1/docs/program/evidence/library-pathways/proto/tree/src/';
let c = fs.readFileSync(dir + 'page.css.txt', 'utf8');
const a = c.indexOf('/* ---------------------------------------------------------------- medium widths */');
const b = c.indexOf('.legend-m { display: none; }');
const band = `
  .strip { position: sticky; top: 0; z-index: 12; max-height: none; overflow: visible; background: var(--bg); padding: 6px 0 4px; border-bottom: 1px solid var(--line); }
  .strip > h2, .strip .legend { display: none; }
  .stg-list { display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 3px; border-left: 0; }
  .stg-btn { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 3px 0 4px; margin: 0; border-left: 0; border-bottom: 3px solid transparent; border-radius: 6px; }
  .stg-btn .nm, .stg-btn .q, .stg-btn .ev { display: none; }
  .stg-btn .no { font-size: 13px; }
  .stg-btn .wk { margin: 0; width: 100%; padding: 0 3px; }
  .stg-btn .wk > span:not(.trk) { display: none; }
  .stg-btn .wk .trk { height: 6px; }
  .stg-btn.inview { border-bottom-color: var(--accent); }
  .strip .cap { display: block; font-size: 13.5px; color: var(--ink-2); margin: 3px 0 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .colsbar { top: 66px; }
  .totals .tlegend { display: block; }
`;
const resp = `/* ---------------------------------------------------------------- medium widths: the strip becomes a band over the tree */
@media (max-width: 1499px) {
  .layout { grid-template-columns: minmax(0, 1fr) 340px; gap: 8px 18px; padding-left: 16px; padding-right: 16px; }
  .controls, .top { padding-left: 16px; padding-right: 16px; }
  .strip { grid-column: 1; grid-row: 1; }
  .treecol { grid-column: 1; grid-row: 2; }
  .totals { grid-column: 2; grid-row: 1 / span 2; }
  .cbars { height: 110px; }
${band}}
@container tree (max-width: 980px) {
  .r, .cols { grid-template-columns: minmax(0, 1fr) 60px 160px 120px; column-gap: 8px; }
  .compare .r, .compare .cols { grid-template-columns: minmax(0, 1fr) 58px 76px 76px 76px 100px; }
  .co .each { display: none; }
  .fh .arrive .tri { grid-template-columns: repeat(3, 76px); column-gap: 8px; }
  .ct .trk { width: 90px; }
  .compare .ct .trk { width: 26px; }
}
@container tree (max-width: 640px) {
  .a > .r { display: flex; flex-wrap: wrap; align-items: center; gap: 3px 12px; }
  .a > .r .lbl { flex-basis: 100%; }
  .a > .r .ch { font-size: 14px; }
  .a > .r .ctwrap { display: flex; gap: 10px; align-items: center; }
  .a > .r .co .each { display: inline; }
  .fh.r, .compare .fh.r { grid-template-columns: minmax(0, 1fr); }
  .fh .qcell { grid-column: 1; }
  .fh .arrive, .compare .fh .arrive { grid-column: 1; text-align: left; padding-left: 32px; }
  .fh .arrive .tri { grid-template-columns: repeat(3, auto); gap: 12px; text-align: left; }
  .ct .trk { width: 80px; }
  .compare .ct .trk { display: none; }
  .compare .ct b { min-width: 0; }
  .compare .ctwrap .ct::before { content: attr(data-w); font-size: 12px; color: var(--ink-3); margin-right: 3px; }
  .a > .fork { margin-left: 8px; }
  .ans { margin-left: 4px; }
  .a > .r { padding-left: 13px; }
  .a > .r::before { width: 9px; }
  .reason, .inc, .evp { margin-left: 4px; }
  .evp .cols2 { grid-template-columns: 1fr; }
  .rbtn { grid-template-columns: 34px minmax(0, 1fr) 76px; }
  .rbtn .v.c2 { display: none; }
  .stepper { grid-template-columns: 1fr; }
  .stepper .row { justify-content: flex-start; }
}

/* ---------------------------------------------------------------- narrow: one column */
@media (max-width: 1060px) {
  .layout { grid-template-columns: minmax(0, 1fr); padding: 10px 12px 80px; gap: 12px; }
  .strip { grid-row: auto; order: 0; margin: 0 -12px; padding-left: 12px; padding-right: 12px; }
  .treecol, .totals { grid-column: 1; grid-row: auto; }
  .totals, .totals .twocol { display: contents; }
  .totals .card { order: 1; margin-bottom: 0; }
  .totals .card.stock, .totals .tlegend { order: 3; }
  .treecol { order: 2; }
  .cbars { height: 96px; }
  .controls { gap: 12px 18px; padding: 10px 12px; }
  .top { padding: 12px 12px 4px; }
}
@media (max-width: 720px) {
  h1 { font-size: 23px; }
  .ctl > .says { max-width: none; }
  .seg button { padding: 6px 10px; font-size: 14px; }
  .per input { width: 140px; }
}
`;
c = c.slice(0, a) + resp + c.slice(b);
const rc = (x, y) => { if (!c.includes(x)) { console.log('MISSING CSS', x.slice(0, 90)); return; } c = c.split(x).join(y); };
rc('.treehead { position: sticky; top: 0; z-index: 6; background: var(--bg); padding: 4px 0 6px; border-bottom: 1px solid var(--line); }', '.treehead { padding: 4px 0 2px; }\n.colsbar { position: sticky; top: 0; z-index: 6; background: var(--bg); padding: 6px 0 6px; border-bottom: 1px solid var(--line); }\n.totals .tlegend { display: none; }\n.quietroot { margin: 0 0 4px; }\n.quietroot .fork > .fh { padding: 2px 0; }\n.quietroot .fh .q { font-size: 15.5px; }');
rc('.ans { list-style: none; margin: 0 0 4px 12px;', '.ans { list-style: none; margin: 0 0 4px 10px;');
rc('.a > .r { position: relative; padding: 5px 4px 5px 20px;', '.a > .r { position: relative; padding: 5px 4px 5px 18px;');
rc('.a > .r::before { content: ""; position: absolute; left: 0; top: 50%; width: 14px;', '.a > .r::before { content: ""; position: absolute; left: 0; top: 50%; width: 12px;');
rc('.a > .fork { margin-left: 22px; }', '.a > .fork { margin-left: 14px; }');
fs.writeFileSync(dir + 'page.css.txt', c);

let h = fs.readFileSync(dir + 'page.html.txt', 'utf8');
h = h.replace('<div class="treehead" id="treehead"></div>', '<div class="treehead" id="treehead"></div>\n    <div class="colsbar" id="colsbar"></div>');
fs.writeFileSync(dir + 'page.html.txt', h);

let s = fs.readFileSync(dir + 'page.js.txt', 'utf8');
const rep = (x, y) => { if (!s.includes(x)) { console.log('MISSING JS', x.slice(0, 90)); return; } s = s.split(x).join(y); };
rep(`'<p class="lead">' + lead + '</p>' + tools + '<div class="cols">' + cols + '</div>';`, `'<p class="lead">' + lead + '</p>' + tools;\n    $('#colsbar').innerHTML = '<div class="cols">' + cols + '</div>';`);
rep(`' Stage' + (empty.length > 1 ? 's ' : ' ') + empty.map(function (sg) { return STAGE_NO[sg]; }).join(', ')`, `' Stage' + (empty.length > 1 ? 's ' : ' ') + ranges(empty.map(function (sg) { return +STAGE_NO[sg]; }))`);
rep(`  function renderTreeHead() {`, `  function ranges(ns) {
    var out = [], i = 0;
    while (i < ns.length) { var j = i; while (j + 1 < ns.length && ns[j + 1] === ns[j] + 1) j++; out.push(j - i >= 2 ? ns[i] + ' to ' + ns[j] : j > i ? ns[i] + ', ' + ns[j] : String(ns[i])); i = j + 1; }
    return out.join(', ');
  }
  function renderTreeHead() {`);
rep(`      h += '<div class="root"><div class="root-head">`, `      if (!liveAny(r) && !isOpen(r)) { h += '<div class="root quietroot">' + fork(r, 0, onR, cur) + '</div>'; return; }\n      h += '<div class="root"><div class="root-head">`);
rep(`    h += stockCard();\n    $('#totals').innerHTML = h;`, `    h += stockCard();\n    h += '<div class="card legend tlegend">' + legendHtml() + '</div>';\n    $('#totals').innerHTML = h;`);
rep(`$('#treecol').classList.toggle('compare', V.compare);`, `$('#treecol').classList.toggle('compare', V.compare);`);
fs.writeFileSync(dir + 'page.js.txt', s);
console.log('patched r3');
