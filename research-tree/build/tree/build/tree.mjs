// tree.mjs: draws the research run's tree twice, as nodes and lines (every agent one node, a line to the one that starts it).
// Writes research-run-tree.svg and research-run-tree.drawio beside build/; build/shoot.sh makes the PNG.
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..');
const N = (label, kind, children = [], o = {}) => ({ label, kind, children, ...o });
const S = (l, c) => N(l, 'session', c), H = (l, c) => N(l, 'helper', c), D = (l) => N(l, 'dashed');
const AP = '’';

// ---- Tree 1: the chosen plan (COMPLEXITY.md v2 section 5, path e2)
const field = (i) => H('Field ' + i, [1, 2, 3, 4, 5].map((r) => H('Reader ' + r)).concat([H('Report writer'), H('Quote gate'),
  H('Fresh refuter'), H('Scorer'), H('Fold'), H('Extraction'), H('Record check')]));
const t1 = S('Coordinator', [H('Problem sheet'), H('Planted copy'), ...[1, 2, 3, 4, 5, 6, 7].map(field),
  D('Split leaf'), H('Closing helper', [1, 2, 3, 4, 5, 6, 7].map((i) => H('Sample reader ' + i)).concat([H('Fold in packets'),
    H('Draft board'), H('Recall test'), H('Synthesis'), H('Synthesis refuter'), H('Synthesis fold'), H('Page for him')])),
  D('Successor')]);
// ---- Tree 2: the plan as planned (PILOT-PLAN.md v2 and the owner's sketch)
const t2 = S('Coordinator', [...[1, 2, 3, 4, 5, 6].map((i) => H('Field ' + i, [H('Readers')])), S('T', [H('T' + AP + 's readers')]),
  D('Split leaf'), S('Control'), S('Canary'), S('STPA'), S('FMEA'), S('Mapper'), S('S1'), S('S2'), S('R1'), S('R2'),
  H('Checkers'), H('Scorer'), D('Successor')]);
t2.children.forEach((c) => {
  if (['Control', 'Canary', 'STPA', 'FMEA', 'Mapper'].includes(c.label)) c.frame = 'Design checks and tests';
  if (['S1', 'S2', 'R1', 'R2', 'Checkers', 'Scorer'].includes(c.label)) c.frame = 'The pilot' + AP + 's test';
});

const ST = {
  session: { fs: 15, h: 26, px: 12, fill: '#2f5d8a', stroke: '#2f5d8a', ink: '#ffffff', bold: true },
  helper: { fs: 13, h: 19, px: 9, fill: '#eef2f7', stroke: '#9fb0c2', ink: '#24313f', bold: false },
  dashed: { fs: 13, h: 19, px: 9, fill: '#ffffff', stroke: '#6b7885', ink: '#24313f', bold: false, dash: '5 3' } };
const tw = (s, fs, b) => { let w = 0; for (const ch of s) w += " iljtfI.,:;|!'’".includes(ch) ? 0.3 : 'mwMW'.includes(ch) ? 0.86 : /[A-Z0-9]/.test(ch) ? 0.67 : 0.54; return w * fs * (b ? 1.07 : 1); };
const GAPY = 3, GAPX = 34;
function layout(root, x0, y0) {
  let cursor = y0; const colW = []; const all = [];
  const place = (n, d) => {
    const s = ST[n.kind]; n.d = d; n.h = s.h; n.w = Math.ceil(tw(n.label, s.fs, s.bold) + 2 * s.px); colW[d] = Math.max(colW[d] || 0, n.w); all.push(n);
    if (!n.children.length) { n.y = cursor; cursor += n.h + GAPY; return; }
    let prev = null; for (const c of n.children) { if (prev !== null && (c.frame || "") !== prev) cursor += 34; prev = c.frame || ""; place(c, d + 1); }
    const a = n.children[0], b = n.children[n.children.length - 1]; n.y = (a.y + b.y + b.h) / 2 - n.h / 2;
  };
  place(root, 0);
  const colX = [x0]; for (let d = 1; d < colW.length; d++) colX[d] = colX[d - 1] + colW[d - 1] + GAPX;
  all.forEach((n) => (n.x = colX[n.d]));
  return { all, colX, colW, bottom: cursor, right: colX[colW.length - 1] + colW[colW.length - 1] };
}
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const cy = (n) => n.y + n.h / 2;
const L1 = layout(t1, 28, 190);
const W = 1870, X2 = 900;
const L2 = layout(t2, X2 + 20, 200);
const HT = Math.ceil(Math.max(L1.bottom, L2.bottom) + 50);
const svg = [`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${HT}" viewBox="0 0 ${W} ${HT}" font-family="Helvetica, Arial, sans-serif">`, `<rect width="${W}" height="${HT}" fill="#ffffff"/>`];
const T = (x, y, s, fs, w, fill = '#1f2933') => svg.push(`<text x="${x}" y="${y}" font-size="${fs}"${w ? ' font-weight="700"' : ''} fill="${fill}">${esc(s)}</text>`);
T(28, 46, 'The research run: the plan chosen, and the plan as it was', 26, 1);
let lx = 28; const ly = 84;
for (const [k, t] of [['session', 'Session'], ['helper', 'Helper'], ['dashed', 'Only if needed: a split, a hand-over']]) {
  const s = ST[k]; svg.push(`<rect x="${lx}" y="${ly - 10}" width="30" height="20" rx="10" fill="${s.fill}" stroke="${s.stroke}"${s.dash ? ` stroke-dasharray="${s.dash}"` : ''}/>`);
  svg.push(`<text x="${lx + 38}" y="${ly}" font-size="15" dominant-baseline="central" fill="#24313f">${esc(t)}</text>`); lx += 38 + tw(t, 15) + 30;
}
const FR = 'Framed: a test of the method, apart from the tree';
svg.push(`<rect x="${lx}" y="${ly - 10}" width="30" height="20" rx="4" fill="#fff6e0" stroke="#e0a93b" stroke-dasharray="4 3"/>`);
svg.push(`<text x="${lx + 38}" y="${ly}" font-size="15" dominant-baseline="central" fill="#24313f">${FR}</text>`);
T(28, 112, 'A line joins each one to the one that starts it.', 15, 0, '#24313f');
svg.push(`<line x1="${X2 - 30}" y1="125" x2="${X2 - 30}" y2="${HT - 30}" stroke="#d5dbe2"/>`);
T(28, 148, 'As chosen: a coordinator and one helper for each of seven fields', 18, 1);
T(X2 + 20, 148, 'As planned: the full run, with the pilot inside it', 18, 1);
T(X2 + 20, 170, 'The pilot is one leaf, T, and its test.', 14, 0, '#5b6876');
function draw(L, root, frames) {
  const solid = [], dash = [];
  (function walk(n) {
    if (!n.children.length) return;
    const tx = L.colX[n.d + 1] - GAPX / 2; const a = n.children[0], b = n.children[n.children.length - 1];
    solid.push(`M${n.x + n.w},${cy(n)} H${tx}`); solid.push(`M${tx},${cy(a)} V${cy(b)}`);
    for (const c of n.children) { (c.kind === 'dashed' ? dash : solid).push(`M${tx},${cy(c)} H${c.x}`); walk(c); }
  })(root);
  if (frames) {
    const g = {}; root.children.forEach((c) => { if (c.frame) (g[c.frame] = g[c.frame] || []).push(c); });
    for (const [name, m] of Object.entries(g)) {
      const y1 = m[0].y - 24, y2 = m[m.length - 1].y + m[m.length - 1].h + 8; const x1 = L.colX[1] - 12, x2 = L.right + 14;
      svg.push(`<rect x="${x1}" y="${y1}" width="${x2 - x1}" height="${y2 - y1}" rx="8" fill="#fff6e0" stroke="#e0a93b" stroke-dasharray="4 3"/>`);
      svg.push(`<text x="${x1 + 10}" y="${y1 + 14}" font-size="13" font-weight="700" fill="#8a5a00">${esc(name)}</text>`);
    }
  }
  svg.push(`<path d="${solid.join(' ')}" fill="none" stroke="#8d99a6" stroke-width="1.4"/>`);
  svg.push(`<path d="${dash.join(' ')}" fill="none" stroke="#8d99a6" stroke-width="1.4" stroke-dasharray="5 3"/>`);
  for (const n of L.all) {
    const s = ST[n.kind];
    svg.push(`<rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="${n.h / 2}" fill="${s.fill}" stroke="${s.stroke}" stroke-width="1.2"${s.dash ? ` stroke-dasharray="${s.dash}"` : ''}/>`);
    svg.push(`<text x="${n.x + n.w / 2}" y="${cy(n)}" font-size="${s.fs}"${s.bold ? ' font-weight="700"' : ''} text-anchor="middle" dominant-baseline="central" fill="${s.ink}">${esc(n.label)}</text>`);
  }
}
draw(L1, t1, false); draw(L2, t2, true);
svg.push('</svg>'); writeFileSync(join(OUT, 'research-run-tree.svg'), svg.join('\n'));

// drawio: one cell per node, one connector per line, frames as rectangles
const style = (s) => `rounded=1;arcSize=50;whiteSpace=nowrap;html=1;fillColor=${s.fill};strokeColor=${s.stroke};fontColor=${s.ink};fontSize=${s.fs};${s.bold ? 'fontStyle=1;' : ''}${s.dash ? 'dashed=1;' : ''}`;
const cells = []; let id = 0;
const text = (v, x, y, w, fs, b) => cells.push(`<mxCell id="t${id++}" value="${esc(v)}" style="text;html=1;align=left;verticalAlign=middle;fontSize=${fs};${b ? 'fontStyle=1;' : ''}" vertex="1" parent="1"><mxGeometry x="${x}" y="${y}" width="${w}" height="28" as="geometry"/></mxCell>`);
text('The research run: the plan chosen, and the plan as it was', 28, 20, 900, 26, 1);
text('Dark: session. Light: helper. Dashed: only if needed (a split, a hand-over). Framed: a test of the method, apart from the tree. A line joins each one to the one that starts it.', 28, 70, 1800, 15);
text('As chosen: a coordinator and one helper for each of seven fields', 28, 130, 800, 18, 1);
text('As planned: the full run, with the pilot inside it', X2 + 20, 130, 800, 18, 1);
let k = 0;
for (const [L, root, fr] of [[L1, t1, false], [L2, t2, true]]) {
  if (fr) {
    const g = {}; root.children.forEach((c) => { if (c.frame) (g[c.frame] = g[c.frame] || []).push(c); });
    for (const [name, m] of Object.entries(g)) {
      const y1 = m[0].y - 24, y2 = m[m.length - 1].y + m[m.length - 1].h + 8; const x1 = L.colX[1] - 12, x2 = L.right + 14;
      cells.push(`<mxCell id="f${k++}" value="${esc(name)}" style="rounded=1;arcSize=6;dashed=1;fillColor=#fff6e0;strokeColor=#e0a93b;fontColor=#8a5a00;fontStyle=1;fontSize=13;align=left;verticalAlign=top;spacingLeft=8;" vertex="1" parent="1"><mxGeometry x="${x1}" y="${y1}" width="${x2 - x1}" height="${y2 - y1}" as="geometry"/></mxCell>`);
    }
  }
  for (const n of L.all) { n.cid = 'n' + k++; cells.push(`<mxCell id="${n.cid}" value="${esc(n.label)}" style="${style(ST[n.kind])}" vertex="1" parent="1"><mxGeometry x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" as="geometry"/></mxCell>`); }
  for (const n of L.all) for (const c of n.children) cells.push(`<mxCell id="e${k++}" style="edgeStyle=elbowEdgeStyle;elbow=horizontal;rounded=0;html=1;endArrow=none;strokeColor=#8d99a6;${c.kind === 'dashed' ? 'dashed=1;' : ''}exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;" edge="1" parent="1" source="${n.cid}" target="${c.cid}"><mxGeometry relative="1" as="geometry"/></mxCell>`);
}
writeFileSync(join(OUT, 'research-run-tree.drawio'), `<mxfile host="research-run-tree"><diagram id="tree" name="Research run tree"><mxGraphModel dx="0" dy="0" grid="0" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="0" pageScale="1" pageWidth="${W}" pageHeight="${HT}" math="0" shadow="0"><root><mxCell id="0"/><mxCell id="1" parent="0"/>${cells.join('')}</root></mxGraphModel></diagram></mxfile>`);
const cnt = (L) => ({ all: L.all.length, session: L.all.filter((n) => n.kind === 'session').length, helper: L.all.filter((n) => n.kind === 'helper').length, dashed: L.all.filter((n) => n.kind === 'dashed').length });
console.log(JSON.stringify({ W, HT, chosen: cnt(L1), planned: cnt(L2), right1: L1.right }));
