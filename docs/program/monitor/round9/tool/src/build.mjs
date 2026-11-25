// Builds tool/index.html: one self-contained page (the replay data, the measured links and reads/writes, the drawing code and the page code inlined).
// Run: node docs/program/monitor/round9/tool/src/build.mjs   (from anywhere). It also runs the layout once per view in node.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const tool = path.dirname(here);
const repo = path.resolve(tool, '../../../../..').split(path.sep).join('/');
const dataFile = path.resolve(tool, '../../round8/clickable/shared/data.js');
const read = (f) => fs.readFileSync(path.join(here, f), 'utf8');
const draw = read('draw.js').replace(/\nif \(typeof module[^\n]*\n?$/, '\n');

// the replay data, with its indexing function kept by name so that live data can be indexed again
const dl = fs.readFileSync(dataFile, 'utf8').split('\n');
const jsonLine = dl.findIndex((l) => l.startsWith('window.TOOL_DATA = '));
let indexer = dl.slice(jsonLine + 1).join('\n').trim();
if (!indexer.startsWith('(function (D) {') || !indexer.endsWith('})(window.TOOL_DATA);')) throw new Error('data.js: the indexing function has another shape than expected');
indexer = 'window.TOOL_INDEX = function (D) {' + indexer.slice('(function (D) {'.length, -'})(window.TOOL_DATA);'.length) + '};\nwindow.TOOL_INDEX(window.TOOL_DATA);';

// the measured facts (tool/data, made by src/measure): links between files, one row per pair; the first real file of a part; reads and writes
const readJson = (f) => { try { return JSON.parse(fs.readFileSync(path.join(tool, 'data', f), 'utf8')); } catch (e) { console.log('missing', f); return null; } };
const LJ = readJson('links.json') || { parts: {}, files: {} }, RW = readJson('rw.json') || {};
const links = {}; let pairs = 0;
for (const from of Object.keys(LJ.parts)) {
  const by = new Map();
  for (const l of LJ.parts[from]) { if (l.to === from) continue; const e = by.get(l.to); if (e) e[1]++; else by.set(l.to, [l.to, 1, l.file, l.line]); }
  if (by.size) { links[from] = [...by.values()]; pairs += by.size; }
}
const files = {}; for (const id of Object.keys(LJ.files)) if (LJ.files[id].length) files[id] = LJ.files[id][0];
const extra = { repo, links, files, rw: RW };

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Sessions: now</title>
<style>
${read('style.css')}</style></head>
<body>
<div id="head">
  <span id="pages"><button data-p="now">Now</button><button data-p="history">History</button></span>
  <span id="clock"></span><span id="chips"></span>
  <div id="levels">
    <button class="end" id="wider" title="One step wider (Esc)">&minus;<span class="w"> Wider</span></button>
    <span class="steps"><button data-l="0" id="l0">All sessions</button><button data-l="1" id="l1">Hooks</button><button data-l="2" id="l2">One session</button><button data-l="3" id="l3">Its files</button></span>
    <button class="end" id="narrower" title="One step narrower (click a session)"><span class="w">Narrower </span>+</button>
    <button class="end" id="jumpb" title="Go to a session, a hook or a file">Jump<kbd>/</kbd></button>
  </div>
</div>
<div id="mid">
<div id="stage">
<svg id="pic" xmlns="http://www.w3.org/2000/svg" font-family='"Segoe UI", system-ui, sans-serif'>
  <defs>
    <marker id="ar" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#a9b2be"/></marker>
    <marker id="arw" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7.5" markerHeight="7.5" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#1463dd"/></marker>
    <marker id="arl" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#18212d"/></marker>
    <pattern id="hatch" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="9" height="9" fill="#f5f6f8"/><rect width="3" height="9" fill="#e4e7ec"/></pattern>
  </defs>
  <g id="cam"><g id="back"></g><g id="lines"></g><g id="arrows"></g><g id="nodes"></g><g id="over"></g><g id="top"></g></g>
</svg>
</div>
<div id="side" hidden></div>
</div>
<div id="replay">
  <button id="play">Pause</button>
  <span id="lab"></span>
  <input id="scrub" type="range" aria-label="Time">
  <span id="speeds"><span class="w">speed</span> <button data-s="1">1&times;</button><button data-s="10">10&times;</button><button data-s="60">60&times;</button></span>
  <span id="livest" hidden></span>
  <span id="hint" class="w">a click opens a hook or a part at the side &middot; drag a box to open several sessions</span>
</div>
<div id="sheet" hidden></div>
<div id="toast" hidden></div>
<div id="box" hidden><span></span></div>
<div id="jump" hidden><div class="jbox"><input id="jumpin" placeholder="A session, a hook or a file" aria-label="Go to"><div id="jumplist"></div></div></div>
<div id="err"></div>
<script>
${dl[jsonLine]}
${indexer}
window.TOOL_EXTRA = ${JSON.stringify(extra)};
</script>
<script>
window.addEventListener('error', function (e) { document.getElementById('err').textContent = String(e.message) + ' @' + e.lineno; });
${draw}
${read('app.js')}
</script>
</body></html>
`;
fs.writeFileSync(path.join(tool, 'index.html'), html);
console.log('index.html', Buffer.byteLength(html), 'bytes;', pairs, 'link pairs,', Object.keys(RW).length, 'sessions with reads and writes');
if (Buffer.byteLength(html) > 500000) console.log('TOO LARGE for the browser pane (over 500,000 bytes)');

// smoke test in node with an approximate text measure: every view, both pages, wide and narrow
globalThis.window = {};
require(dataFile);
const D = globalThis.window.TOOL_DATA;
const { layoutPicture } = require(path.join(here, 'draw.js'));
const approx = (t, font) => { const m = /(\d+) ([\d.]+)px/.exec(font); return t.length * (+m[2]) * (+m[1] >= 600 ? 0.56 : 0.52); };
const inn = {}; for (const f of Object.keys(links)) for (const l of links[f]) (inn[l[0]] = inn[l[0]] || []).push([f, l[1], l[2], l[3]]);
const fails = {}; D.events.forEach((e) => { if (e.result === 'failed') (fails[e.session] = fails[e.session] || []).push(e); });
let bad = 0;
const runs = [];
for (const [hh, mm, open] of [[3, 29, 'BR1'], [13, 3, 'BR4'], [0, 5, 'T7'], [14, 45, 'BR4']]) for (const history of [false, true]) for (const maxW of [1913, 816]) for (const level of [0, 1, 2, 3]) runs.push([hh, mm, open, history, maxW, level, null]);
// several sessions opened together: two, four, one with an ended session, three later in the day; wide, beside the panel, and narrow
for (const [hh, mm, group] of [[3, 29, ['BR1', 'BR2']], [3, 29, ['BR1', 'BR2', 'HAP', 'UX']], [3, 29, ['T7', 'UX']], [13, 3, ['BR4', 'T7', 'UX']]]) for (const history of [false, true]) for (const maxW of [1913, 1190, 816]) runs.push([hh, mm, group[0], history, maxW, 2, group]);
for (const [hh, mm, open, history, maxW, level, group] of runs) {
  const now = D.minuteOf(6, hh, mm);
  const cfg = { now, level, open, group, history, maxW, mem: {}, hookPass: () => ['hook:window-ceiling'], filesOf: () => [{ part: 'doc:briefs', last: now - 2 }, { part: 'script:lookup', last: now - 60 }], fired: () => true,
    failedEarlier: (sid) => (fails[sid] || []).filter((e) => e.t <= now).map((e) => e.part), rw: (sid) => RW[sid], links: { out: links, inn }, sel: level === 3 ? 'doc:briefs' : '' };
  let r; try { r = layoutPicture(D, cfg, approx); } catch (e) { bad++; console.log('THROWS', hh, mm, level, history, maxW, group, e.stack.split('\n').slice(0, 3).join(' | ')); continue; }
  if (r.missing) continue;
  const all = r.nodes.map((n) => n.html + n.x + ' ' + n.y).join('') + r.lines + r.over, w = Math.round(r.bb.x1 - r.bb.x0), h = Math.round(r.bb.y1 - r.bb.y0);
  const flaw = /NaN|undefined/.test(all) ? ' BAD: NaN or undefined' : '', wide = w > maxW + 4 ? ' WIDER than ' + maxW : '', lost = group && !r.group ? ' (the group is not all there at this minute: one session drawn)' : '';
  if (flaw || wide) bad++;
  if (flaw || wide || group || ((hh === 14 || hh === 3) && maxW !== 1190)) console.log(String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0'), history ? 'history' : 'now    ', 'max', maxW, group ? 'group ' + (r.group || []).join('+') : 'level ' + level, 'nodes', r.nodes.length, 'size', w, 'x', h, r.rails ? 'rails' : '', flaw, wide, lost, group && maxW === 1913 && !history ? '| ' + r.rel : '');
}
console.log(bad ? bad + ' layouts with a flaw' : 'all ' + runs.length + ' layouts ran clean');
