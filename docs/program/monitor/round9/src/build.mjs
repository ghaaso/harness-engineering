// Builds the self-contained level pages of round 9 from draw.js, and runs the drawing once in node as a smoke test.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const out = 'C:/Users/User/Documents/projects/harness-engineering/docs/program/monitor/round9';
const draw = fs.readFileSync(path.join(here, 'draw.js'), 'utf8').replace(/\nif \(typeof module[^\n]*\n?$/, '\n');

const pages = [
  { file: 'level0.html', level: 0, t: [3, 29], open: 'BR1', title: 'Level 0: overview' },
  { file: 'level1.html', level: 1, t: [3, 29], open: 'BR1', title: 'Level 1: with the hooks' },
  { file: 'level2.html', level: 2, t: [3, 29], open: 'BR1', title: 'Level 2: with one session opened' },
  { file: 'level3.html', level: 3, t: [3, 29], open: 'BR1', title: 'Level 3: with the history' },
  { file: 'level3-1303.html', level: 3, t: [13, 3], open: 'BR4', title: 'Level 3 at 13:03' },
];

const page = (p) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>${p.title}</title>
<style>
  html, body { margin: 0; height: 100%; background: #fff; color: #18212d; font-family: "Segoe UI", system-ui, sans-serif; overflow: hidden; }
  #head { height: 58px; display: flex; align-items: center; gap: 14px; padding: 0 28px; border-bottom: 1px solid #e3e6eb; box-sizing: border-box; }
  #clock { font-size: 21px; font-weight: 700; margin-right: 14px; font-variant-numeric: tabular-nums; }
  .chip { display: inline-flex; align-items: center; gap: 8px; height: 34px; padding: 0 14px; border-radius: 17px; font-size: 15.5px; font-weight: 600; border: 1.6px solid; }
  .chip.work { color: #0f6f49; background: #ecf9f2; border-color: #178f60; }
  .chip.wait { color: #fff; background: #1463dd; border-color: #1463dd; }
  .chip.nowait { color: #5a6676; background: #fff; border-color: #cfd4db; font-weight: 400; }
  .chip.fail { color: #fff; background: #d42a1c; border-color: #d42a1c; }
  .dot { width: 10px; height: 10px; border-radius: 50%; background: #178f60; }
  #pic { display: block; width: 100vw; height: calc(100vh - 58px); }
  #err { color: #d42a1c; padding: 20px; white-space: pre-wrap; font: 14px Consolas, monospace; }
</style></head>
<body>
<div id="head"><span id="clock"></span></div>
<svg id="pic" xmlns="http://www.w3.org/2000/svg" font-family='"Segoe UI", system-ui, sans-serif'></svg>
<div id="err"></div>
<script src="../round8/clickable/shared/data.js"></script>
<script>
// One fixed state: Tue 24 Nov 2026 at ${String(p.t[0]).padStart(2, '0')}:${String(p.t[1]).padStart(2, '0')}, layers up to ${p.level}. No buttons, no replay.
var CFG = { level: ${p.level}, hour: ${p.t[0]}, minute: ${p.t[1]}, open: '${p.open}' };
${draw}
(function () {
  try {
    var D = window.TOOL_DATA, ctx = document.createElement('canvas').getContext('2d');
    function measure(t, font) { ctx.font = font; return ctx.measureText(t).width; }
    var r = renderPicture(D, { level: CFG.level, now: D.minuteOf(6, CFG.hour, CFG.minute), open: CFG.open }, measure);
    var svg = document.getElementById('pic'), W = window.innerWidth, H = window.innerHeight - 58, pad = 26, maxScale = 1.3;
    var bw = r.bb.x1 - r.bb.x0 + pad * 2, bh = r.bb.y1 - r.bb.y0 + pad * 2, s = Math.min(W / bw, H / bh, maxScale);
    var vw = W / s, vh = H / s, cx = (r.bb.x0 + r.bb.x1) / 2, cy = (r.bb.y0 + r.bb.y1) / 2;
    svg.setAttribute('viewBox', (cx - vw / 2) + ' ' + (cy - vh / 2) + ' ' + vw + ' ' + vh);
    svg.innerHTML = r.svg;
    var h = document.getElementById('head'), html = '<span id="clock">' + r.day + ' · ' + r.clock + '</span>';
    html += '<span class="chip work"><span class="dot"></span>' + r.working + ' working</span>';
    html += r.waitingTags.length ? '<span class="chip wait">&#10073;&#10073; ' + r.waitingTags.join(', ') + ' waits for you</span>' : '<span class="chip nowait">nothing waits for you</span>';
    if (r.failHooks.length) html += '<span class="chip fail">&#9650; ' + r.failHooks.join(', ') + ' failed on ' + r.failTags.join(', ') + '</span>';
    h.innerHTML = html;
    document.title += ' (scale ' + s.toFixed(2) + ')';
    document.body.setAttribute('data-scale', s.toFixed(3));
  } catch (e) { document.getElementById('err').textContent = String(e && e.stack || e); }
})();
</script>
</body></html>
`;

for (const p of pages) fs.writeFileSync(path.join(out, p.file), page(p));

// smoke test in node with an approximate text measure
globalThis.window = {};
require('C:/Users/User/Documents/projects/harness-engineering/docs/program/monitor/round8/clickable/shared/data.js');
const D = globalThis.window.TOOL_DATA;
const renderPicture = require(path.join(here, 'draw.js'));
const approx = (t, font) => { const m = /(\d+) ([\d.]+)px/.exec(font); return t.length * (+m[2]) * (+m[1] >= 600 ? 0.56 : 0.52); };
for (const p of pages) {
  const r = renderPicture(D, { level: p.level, now: D.minuteOf(6, p.t[0], p.t[1]), open: p.open }, approx);
  console.log(p.file, 'bbox', Object.values(r.bb).map(Math.round).join(' '), 'svg', r.svg.length, 'NaN:', /NaN|undefined/.test(r.svg));
  if (p.level === 3) console.log('  ', r.debug.cols.join(' | '), '\n  gaps', r.debug.gaps.join(' ; '), 'treeW', Math.round(r.debug.treeW), 'wallW', r.debug.wallW);
}
