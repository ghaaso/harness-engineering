// map.mjs: the research run's two trees redrawn top-down (an organisation chart), with "You" above each coordinator.
// Writes research-run-map.svg and research-run-map.drawio beside build/; build/shoot.sh makes the PNG.
// Names and counts follow build/tree.mjs (left tree 111 + You, right tree 28 + You).
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..');
const AP = '’';
const W = 1870;
const ST = {
  you: { fs: 16, fill: '#2e7d5b', stroke: '#2e7d5b', ink: '#ffffff', bold: true },
  session: { fs: 16, fill: '#2f5d8a', stroke: '#2f5d8a', ink: '#ffffff', bold: true },
  helper: { fs: 14, fill: '#eef2f7', stroke: '#9fb0c2', ink: '#24313f', bold: false },
  dashed: { fs: 14, fill: '#ffffff', stroke: '#6b7885', ink: '#24313f', bold: false, dash: '5 3' } };
const tw = (s, fs, b) => { let w = 0; for (const ch of s) w += " iljtfI.,:;|!'’".includes(ch) ? 0.3 : 'mwMW'.includes(ch) ? 0.86 : /[A-Z0-9]/.test(ch) ? 0.67 : 0.54; return w * fs * (b ? 1.07 : 1); };
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const nodes = [], edges = [], frames = [];
let nid = 0;
const mk = (label, kind, x, y, w, h, band) => {
  const n = { id: 'n' + nid++, label, kind, x, y, w, h, band };
  if (tw(label, ST[kind].fs, ST[kind].bold) > w - 14) throw new Error('label too wide: ' + label);
  nodes.push(n); return n;
};
const ctr = (n) => n.x + n.w / 2, mid = (n) => n.y + n.h / 2;
const edge = (s, t, exit, entry, pts = [], dashed = false) => edges.push({ s, t, exit, entry, pts, dashed, band: s.band });

const PAD = 22, NW = 150, HH = 24, TH = 28, STEP = 29;
function build(band, y0, spec) {
  const ncols = spec.length;
  const pitch = (W - 2 * PAD) / ncols, colX = (i) => PAD + i * pitch;
  const cx = (colX(0) + 14 + NW / 2 + colX(ncols - 1) + 14 + NW / 2) / 2;
  const you = mk('You', 'you', cx - 55, y0, 110, 30, band), co = mk('Coordinator', 'session', cx - 70, y0 + 56, 140, 30, band);
  edge(you, co, [0.5, 1], [0.5, 0]);
  const busY = y0 + 122, top = y0 + 142;
  spec.forEach((col, i) => {
    const X = colX(i);
    if (col.frame) {
      const fh = 46 + col.items.length * STEP + 8;
      frames.push({ x: X, y: top, w: pitch - 4, h: fh, lines: col.lines, band });
      col.items.forEach((it, j) => {
        const n = mk(it[0], it[1], X + 18, top + 46 + j * STEP, 136, HH, band);
        edge(co, n, [0.5, 1], [0, 0.5], [[cx, busY], [X + 9, busY], [X + 9, mid(n)]]);
      });
      return;
    }
    const first = col.items[0];
    const t = mk(first[0], first[1], X + 14, top, NW, TH, band);
    edge(co, t, [0.5, 1], [0.5, 0], [[cx, busY], [ctr(t), busY]], first[1] === 'dashed');
    let y = top + TH + 12;
    (col.kids || []).forEach((kid) => {
      const n = mk(kid[0], kid[1], X + 14, y, NW, HH, band); y += STEP;
      if (col.below) edge(t, n, [0.5, 1], [0.5, 0]);
      else edge(t, n, [0, 0.5], [0, 0.5], [[X + 5, mid(t)], [X + 5, mid(n)]]);
    });
    col.items.slice(1).forEach((it, j) => {
      const n = mk(it[0], it[1], X + 14, top + (TH + 10) * (j + 1), NW, HH, band);
      edge(co, n, [0.5, 1], [0, 0.5], [[cx, busY], [X + 5, busY], [X + 5, mid(n)]], it[1] === 'dashed');
    });
  });
}
const H = (l) => [l, 'helper'], D = (l) => [l, 'dashed'], S = (l) => [l, 'session'];
// Band 1: as chosen
const field = (i) => ({ items: [H('Field ' + i)], kids: [1, 2, 3, 4, 5].map((r) => H('Reader ' + r)).concat(['Report writer', 'Quote gate', 'Fresh refuter', 'Scorer', 'Fold', 'Extraction', 'Record check'].map(H)) });
const spec1 = [{ items: [H('Problem sheet'), H('Planted copy')] }, ...[1, 2, 3, 4, 5, 6, 7].map(field),
  { items: [H('Closing helper')], kids: [1, 2, 3, 4, 5, 6, 7].map((i) => H('Sample reader ' + i)).concat(['Fold in packets', 'Draft board', 'Recall test', 'Synthesis', 'Synthesis refuter', 'Synthesis fold', 'Page for him'].map(H)) },
  { items: [D('Split leaf'), D('Successor')] }];
const B1 = 150;
build(1, B1 - 10, spec1);
// Band 2: as planned
const f2 = (i) => ({ items: [H('Field ' + i)], below: true, kids: [H('Readers')] });
const spec2 = [1, 2, 3, 4, 5, 6].map(f2).concat([{ items: [S('T')], below: true, kids: [H('T' + AP + 's readers')] }, { items: [D('Split leaf')] },
  { frame: 1, lines: ['Design checks', 'and tests'], items: ['Control', 'Canary', 'STPA', 'FMEA', 'Mapper'].map(S) },
  { frame: 1, lines: ['The pilot' + AP + 's test'], items: [S('S1'), S('S2'), S('R1'), S('R2'), H('Checkers'), H('Scorer')] },
  { items: [D('Successor')] }]);
const B2 = 810;
build(2, B2 + 40, spec2);
const HT = 1250;

// ---- SVG
const svg = [`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${HT}" viewBox="0 0 ${W} ${HT}" font-family="Helvetica, Arial, sans-serif">`, `<rect width="${W}" height="${HT}" fill="#ffffff"/>`];
const T = (x, y, s, fs, b, fill = '#1f2933') => { svg.push(`<text x="${x}" y="${y}" font-size="${fs}"${b ? ' font-weight="700"' : ''} fill="${fill}">${esc(s)}</text>`); };
const title = 'The research run: the plan chosen, and the plan as it was';
T(28, 44, title, 26, 1);
const FR = 'Framed: a test of the method, apart from the tree';
const legend = [['you', 'You (the owner)'], ['session', 'Session'], ['helper', 'Helper'], ['dashed', 'Dashed: only if needed (a split, a hand-over)']];
let lx = 28; const ly = 80; const lg = [];
for (const [k, t] of legend) { lg.push({ k, t, x: lx, y: ly }); lx += 38 + tw(t, 15) + 34; }
lg.push({ k: 'frame', t: FR, x: lx, y: ly });
for (const l of lg) {
  const s = ST[l.k];
  if (l.k === 'frame') svg.push(`<rect x="${l.x}" y="${l.y - 10}" width="30" height="20" rx="4" fill="#fff6e0" stroke="#e0a93b" stroke-dasharray="4 3"/>`);
  else svg.push(`<rect x="${l.x}" y="${l.y - 10}" width="30" height="20" rx="10" fill="${s.fill}" stroke="${s.stroke}"${s.dash ? ` stroke-dasharray="${s.dash}"` : ''}/>`);
  svg.push(`<text x="${l.x + 38}" y="${l.y}" font-size="15" dominant-baseline="central" fill="#24313f">${esc(l.t)}</text>`);
}
const heads = ['As chosen: a coordinator and one helper for each of seven fields', 'As planned: the full run, with the pilot inside it (the pilot is leaf T)'];
const seps = [B1 - 30, B2 - 30];
for (const y of seps) svg.push(`<line x1="28" y1="${y}" x2="${W - 28}" y2="${y}" stroke="#d5dbe2" stroke-width="1.5"/>`);
T(28, B1 - 4, heads[0], 20, 1); T(28, B2 - 4, heads[1], 20, 1);
for (const f of frames) {
  svg.push(`<rect x="${f.x}" y="${f.y}" width="${f.w}" height="${f.h}" rx="8" fill="#fff6e0" stroke="#e0a93b" stroke-dasharray="4 3"/>`);
  f.lines.forEach((ln, i) => svg.push(`<text x="${f.x + 20}" y="${f.y + 19 + i * 17}" font-size="14" font-weight="700" fill="#8a5a00">${esc(ln)}</text>`));
}
const ends = (e) => { const p = (n, f) => [n.x + f[0] * n.w, n.y + f[1] * n.h]; return [p(e.s, e.exit), ...e.pts, p(e.t, e.entry)]; };
for (const e of edges) svg.push(`<path d="${ends(e).map((p, i) => (i ? 'L' : 'M') + p[0] + ',' + p[1]).join(' ')}" fill="none" stroke="#8d99a6" stroke-width="1.5"${e.dashed ? ' stroke-dasharray="5 3"' : ''}/>`);
for (const n of nodes) {
  const s = ST[n.kind];
  svg.push(`<rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="${Math.min(n.h / 2, 13)}" fill="${s.fill}" stroke="${s.stroke}" stroke-width="1.2"${s.dash ? ` stroke-dasharray="${s.dash}"` : ''}/>`);
  svg.push(`<text x="${n.x + n.w / 2}" y="${mid(n)}" font-size="${s.fs}"${s.bold ? ' font-weight="700"' : ''} text-anchor="middle" dominant-baseline="central" fill="${s.ink}">${esc(n.label)}</text>`);
}
svg.push('</svg>'); writeFileSync(join(OUT, 'research-run-map.svg'), svg.join('\n'));

// ---- drawio
const cells = []; let k = 0;
const tx = (v, x, y, w, fs, b) => cells.push(`<mxCell id="t${k++}" value="${esc(v)}" style="text;html=1;align=left;verticalAlign=middle;whiteSpace=nowrap;fontSize=${fs};${b ? 'fontStyle=1;' : ''}" vertex="1" parent="1"><mxGeometry x="${x}" y="${y}" width="${w}" height="28" as="geometry"/></mxCell>`);
const style = (s) => `rounded=1;arcSize=50;whiteSpace=nowrap;html=1;fillColor=${s.fill};strokeColor=${s.stroke};fontColor=${s.ink};fontSize=${s.fs};${s.bold ? 'fontStyle=1;' : ''}${s.dash ? 'dashed=1;' : ''}`;
tx(title, 28, 20, 900, 26, 1);
for (const l of lg) {
  const s = ST[l.k] || {};
  cells.push(l.k === 'frame' ? `<mxCell id="l${k++}" value="" style="rounded=1;arcSize=15;dashed=1;fillColor=#fff6e0;strokeColor=#e0a93b;" vertex="1" parent="1"><mxGeometry x="${l.x}" y="${l.y - 10}" width="30" height="20" as="geometry"/></mxCell>`
    : `<mxCell id="l${k++}" value="" style="${style(s)}" vertex="1" parent="1"><mxGeometry x="${l.x}" y="${l.y - 10}" width="30" height="20" as="geometry"/></mxCell>`);
  tx(l.t, l.x + 38, l.y - 14, Math.ceil(tw(l.t, 15)) + 20, 15);
}
tx(heads[0], 28, B1 - 28, 1000, 20, 1); tx(heads[1], 28, B2 - 28, 1000, 20, 1);
for (const y of seps) cells.push(`<mxCell id="s${k++}" value="" style="endArrow=none;html=1;strokeColor=#d5dbe2;strokeWidth=1.5;" edge="1" parent="1"><mxGeometry relative="1" as="geometry"><mxPoint x="28" y="${y}" as="sourcePoint"/><mxPoint x="${W - 28}" y="${y}" as="targetPoint"/></mxGeometry></mxCell>`);
for (const f of frames) cells.push(`<mxCell id="f${k++}" value="${esc(f.lines.join(' '))}" style="rounded=1;arcSize=6;dashed=1;fillColor=#fff6e0;strokeColor=#e0a93b;fontColor=#8a5a00;fontStyle=1;fontSize=14;align=left;verticalAlign=top;spacingLeft=20;spacingTop=4;whiteSpace=wrap;" vertex="1" parent="1"><mxGeometry x="${f.x}" y="${f.y}" width="${f.w}" height="${f.h}" as="geometry"/></mxCell>`);
for (const n of nodes) cells.push(`<mxCell id="${n.id}" value="${esc(n.label)}" style="${style(ST[n.kind])}" vertex="1" parent="1"><mxGeometry x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" as="geometry"/></mxCell>`);
for (const e of edges) cells.push(`<mxCell id="e${k++}" style="edgeStyle=none;rounded=0;html=1;endArrow=none;strokeColor=#8d99a6;strokeWidth=1.5;${e.dashed ? 'dashed=1;' : ''}exitX=${e.exit[0]};exitY=${e.exit[1]};exitDx=0;exitDy=0;entryX=${e.entry[0]};entryY=${e.entry[1]};entryDx=0;entryDy=0;" edge="1" parent="1" source="${e.s.id}" target="${e.t.id}"><mxGeometry relative="1" as="geometry">${e.pts.length ? `<Array as="points">${e.pts.map((p) => `<mxPoint x="${p[0]}" y="${p[1]}"/>`).join('')}</Array>` : ''}</mxGeometry></mxCell>`);
writeFileSync(join(OUT, 'research-run-map.drawio'), `<mxfile host="research-run-map"><diagram id="map" name="Research run map"><mxGraphModel dx="0" dy="0" grid="0" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="0" pageScale="1" pageWidth="${W}" pageHeight="${HT}" math="0" shadow="0"><root><mxCell id="0"/><mxCell id="1" parent="0"/>${cells.join('')}</root></mxGraphModel></diagram></mxfile>`);
const cnt = (b) => { const a = nodes.filter((n) => n.band === b); return { nodes: a.length, edges: edges.filter((e) => e.band === b).length, you: a.filter((n) => n.kind === 'you').length, session: a.filter((n) => n.kind === 'session').length, helper: a.filter((n) => n.kind === 'helper').length, dashed: a.filter((n) => n.kind === 'dashed').length }; };
console.log(JSON.stringify({ W, HT, band1: cnt(1), band2: cnt(2), frames: frames.length }));
