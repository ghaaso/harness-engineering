const fs = require('fs');
const dir = 'C:/Users/User/Documents/projects/EMS_workshop1/docs/program/evidence/library-pathways/proto/tree/src/';
let s = fs.readFileSync(dir + 'page.js.txt', 'utf8');
const rep = (a, b) => { if (!s.includes(a)) { console.log('MISSING JS', a.slice(0, 90)); return; } s = s.split(a).join(b); };
rep(`    if (ST.owner[to] === b.id) return '<span class="nest" aria-hidden="true">↓ next question below</span>';`, `    if (ST.owner[to] === b.id) return '';`);
rep(`(z ? '<button type="button" class="linkbtn why" data-why="b:' + b.id + '" aria-expanded="' + !!V.why['b:' + b.id] + '">Why 0?</button>' : '') + '</span>' +`,
  `(z ? '<button type="button" class="linkbtn why" data-why="b:' + b.id + '" aria-expanded="' + !!V.why['b:' + b.id] + '">Why 0?</button>' : '') + (function () { var d = destCell(b); return d ? '<span class="de">' + d + '</span>' : ''; })() + '</span>' +`);
rep(`'<span class="ctwrap">' + countCells('b', b.id) + '</span>' + costCell(b.id) + '<span class="de">' + destCell(b) + '</span></div>';`, `'<span class="ctwrap">' + countCells('b', b.id) + '</span>' + costCell(b.id) + '</div>';`);
rep(`    h += ctl('compare', seg('Counts shown', [['one', 'This way only'], ['three', 'All three ways']], V.compare ? 'three' : 'one'));\n`, '');
rep(`    var tools = '<div class="treetools"><span>' + esc(TX.controls.forks.label) + '</span>' + seg('Questions', [['all', 'Open all'], ['auto', 'Only with work'], ['none', 'Close all']], V.forkMode) + '<span class="muted">' + esc(TX.controls.forks.says) + '</span></div>';`,
  `    var tools = '<div class="treetools"><span class="tt" data-tt="compare"><span class="lab">' + esc(TX.controls.compare.label) + '</span>' + seg('Counts shown', [['one', 'This way only'], ['three', 'All three ways']], V.compare ? 'three' : 'one') + '<span class="muted">' + esc(TX.controls.compare.says) + '</span></span><span class="tt" data-tt="forks"><span class="lab">' + esc(TX.controls.forks.label) + '</span>' + seg('Questions', [['all', 'Open all'], ['auto', 'Only with work'], ['none', 'Close all']], V.forkMode) + '<span class="muted">' + esc(TX.controls.forks.says) + '</span></span></div>';`);
rep(`    var b = e.target.closest('button[data-v]'); if (!b) return;\n    V.forkMode = b.dataset.v; V.open = {}; renderTreeHead(); renderTree(); observe();`,
  `    var b = e.target.closest('button[data-v]'); if (!b) return;\n    var tt = b.closest('[data-tt]').dataset.tt;\n    if (tt === 'compare') { V.compare = b.dataset.v === 'three'; update(true); return; }\n    V.forkMode = b.dataset.v; V.open = {}; renderTreeHead(); renderTree(); observe();`);
rep(`'<span class="num">cost: each · for 100</span><span class="c-de">goes to</span>'\n      : '<span>Question, then its answers</span><span class="num">chance</span><span class="num">pieces of 100</span><span class="num">cost: each · for 100</span><span class="c-de">goes to</span>';`,
  `'<span class="num">cost: each · for 100</span>'\n      : '<span>Question, then its answers and where they go</span><span class="num">chance</span><span class="num">pieces of 100</span><span class="num">cost: each · for 100</span>';`);
rep(`? '<span>Question, then its answers</span><span class="num">chance</span>'`, `? '<span>Question, then its answers and where they go</span><span class="num">chance</span>'`);
fs.writeFileSync(dir + 'page.js.txt', s);

let c = fs.readFileSync(dir + 'page.css.txt', 'utf8');
const rc = (a, b) => { if (!c.includes(a)) { console.log('MISSING CSS', a.slice(0, 90)); return; } c = c.split(a).join(b); };
rc(`.r, .cols { grid-template-columns: minmax(0, 1fr) 70px 190px 170px 230px; column-gap: 8px; }\n.compare .r, .compare .cols { grid-template-columns: minmax(0, 1fr) 70px 96px 96px 96px 150px 200px; }`,
  `.r, .cols { grid-template-columns: minmax(0, 1fr) 70px 190px 180px; column-gap: 10px; }\n.compare .r, .compare .cols { grid-template-columns: minmax(0, 1fr) 66px 100px 100px 100px 170px; }`);
rc(`.stock svg { width: 100%; height: auto; display: block; }\n.stock svg text { fill: var(--ink); font-family: var(--font); }\n`, '');
rc(`.a .lbl { font-size: 15.5px; line-height: 1.3; min-width: 0; }`, `.a .lbl { font-size: 15.5px; line-height: 1.3; min-width: 0; display: flex; flex-wrap: wrap; align-items: center; gap: 4px 8px; }\n.a .lbl .de { flex-basis: 100%; }`);
rc(`  .r, .cols { grid-template-columns: minmax(0, 1fr) 62px 170px 150px; }\n  .compare .r, .compare .cols { grid-template-columns: minmax(0, 1fr) 62px 84px 84px 84px 130px; }\n  .cols .c-de { display: none; }\n  .a > .r .de { grid-column: 1 / -1; padding-left: 0; }\n`,
  `  .r, .cols { grid-template-columns: minmax(0, 1fr) 60px 160px 150px; column-gap: 8px; }\n  .compare .r, .compare .cols { grid-template-columns: minmax(0, 1fr) 58px 76px 76px 76px 130px; }\n  .co .each { display: none; }\n`);
rc(`.fh .arrive .tri { display: inline-grid; grid-template-columns: repeat(3, 96px); text-align: right; }`, `.fh .arrive .tri { display: inline-grid; grid-template-columns: repeat(3, 100px); column-gap: 10px; text-align: right; }`);
rc(`  .fh .arrive .tri { grid-template-columns: repeat(3, 84px); }`, `  .fh .arrive .tri { grid-template-columns: repeat(3, 76px); column-gap: 8px; }`);
rc(`  .r, .compare .r { grid-template-columns: minmax(0, 1fr) auto; }\n  .a > .r { grid-template-areas: "l l" "ch ct" "co co" "de de"; row-gap: 3px; }\n  .a > .r .lbl { grid-area: l; }\n  .a > .r .ch { grid-area: ch; text-align: left; }\n  .a > .r .ch::after { content: " at this question"; color: var(--ink-3); font-size: 13px; }\n  .a > .r .ctwrap { grid-area: ct; display: flex; gap: 6px; justify-content: flex-end; }\n  .a > .r .co { grid-area: co; justify-content: flex-start; }\n  .a > .r .de { grid-area: de; }\n`,
  `  .a > .r { display: flex; flex-wrap: wrap; align-items: center; gap: 3px 12px; }\n  .a > .r .lbl { flex-basis: 100%; }\n  .a > .r .ch { font-size: 14px; }\n  .a > .r .ctwrap { display: flex; gap: 10px; align-items: center; }\n  .a > .r .co .each { display: inline; }\n`);
rc(`  .stg-btn .wk span { display: none; }`, `  .stg-btn .wk > span:not(.trk) { display: none; }`);
rc(`  .totals { position: static; max-height: none; overflow: visible; order: 1; }`, `  .totals, .totals .twocol { display: contents; }\n  .totals .card { order: 1; margin-bottom: 0; }\n  .totals .card.stock { order: 3; }\n  .cbars { height: 96px; }`);
c += `\n.treetools .tt { display: inline-flex; flex-wrap: wrap; align-items: center; gap: 4px 8px; margin-right: 18px; }\n.treetools .tt .lab { font-weight: 650; color: var(--ink-2); }\n`;
fs.writeFileSync(dir + 'page.css.txt', c);
console.log('patched');
