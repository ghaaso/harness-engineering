// One scene, two outputs with the same geometry:
//   toSVG(scene)    -> the picture (turned into a PNG by a headless browser)
//   toDrawio(scene) -> the editable draw.io file (lanes are real containers, a step is one cell)
// A scene holds: nodes (bands, panels, texts, dots, lanes, cards, map boxes) in drawing order, and edges.

// ---------- text measuring (Arial / Helvetica advance widths, 1/1000 em) ----------
const AW = { ' ': 278, '!': 278, '"': 355, '#': 556, '$': 556, '%': 889, '&': 667, "'": 191, '(': 333, ')': 333, '*': 389, '+': 584,
  ',': 278, '-': 333, '.': 278, '/': 278, ':': 278, ';': 278, '<': 584, '=': 584, '>': 584, '?': 556, '@': 1015,
  A: 667, B: 667, C: 722, D: 722, E: 667, F: 611, G: 778, H: 722, I: 278, J: 500, K: 667, L: 556, M: 833, N: 722, O: 778, P: 667,
  Q: 778, R: 722, S: 667, T: 611, U: 722, V: 667, W: 944, X: 667, Y: 667, Z: 611, '[': 278, ']': 278, '_': 556,
  a: 556, b: 556, c: 500, d: 556, e: 556, f: 278, g: 556, h: 556, i: 222, j: 222, k: 500, l: 222, m: 833, n: 556, o: 556, p: 556,
  q: 556, r: 333, s: 500, t: 278, u: 556, v: 500, w: 722, x: 500, y: 500, z: 500, '|': 260, '~': 584, '×': 584, '·': 278 };
for (const d of '0123456789') AW[d] = 556;
export function textWidth(s, fs, bold = false) {
  let w = 0;
  for (const ch of s) w += AW[ch] ?? 600;
  return (w / 1000) * fs * (bold ? 1.08 : 1) * 1.02;
}
export function wrap(s, fs, maxW, bold = false) {
  const out = [];
  for (const para of String(s).split('\n')) {
    let line = '';
    for (const word of para.split(' ')) {
      const t = line ? line + ' ' + word : word;
      if (line && textWidth(t, fs, bold) > maxW) { out.push(line); line = word; } else line = t;
    }
    out.push(line);
  }
  return out;
}

// ---------- palette ----------
export const HUES = {
  path:    { fill: '#e4edff', soft: '#f3f7ff', edge: '#1d4ed8', ink: '#0b2a6f' },
  know:    { fill: '#dff3e6', soft: '#f1faf4', edge: '#15803d', ink: '#0b4a24' },
  memory:  { fill: '#ebe3fc', soft: '#f6f2fe', edge: '#7c3aed', ink: '#3f1a8a' },
  guard:   { fill: '#fde2e2', soft: '#fef3f3', edge: '#b91c1c', ink: '#6b0f0f' },
  limit:   { fill: '#ffecc9', soft: '#fff8ea', edge: '#b45309', ink: '#6b2f02' },
  context: { fill: '#e2e8f0', soft: '#f3f5f8', edge: '#475569', ink: '#1e293b' },
  recover: { fill: '#d5f2ee', soft: '#eefaf8', edge: '#0f766e', ink: '#084742' },
  improve: { fill: '#fbdcea', soft: '#fef1f6', edge: '#be185d', ink: '#6d0f3a' },
};
export const STATUS = { b: '#16a34a', d: '#f59e0b', i: '#94a3b8', n: '#e11d48' };
export const INK = '#111827', MUTED = '#475569';
const LH = 1.25;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const r = (v) => Math.round(v * 10) / 10;

// ---------- sizes shared by both outputs ----------
export const CARD = { padX: 16, padT: 14, padB: 14, titleFs: 24, purpFs: 16, itemFs: 15, itemLH: 1.3, itemGap: 5, linkFs: 14.5, indent: 20 };
export const LANE = { headH: 104, pad: 26, codeFs: 30, titleFs: 34, purpFs: 19, footFs: 15 };
export const MAPB = { nameFs: 26, lineFs: 16, pad: 16 };

// What a card needs, for a given width: wrapped lines and the height.
export function measureCard(c, w) {
  const inner = w - 2 * CARD.padX;
  const tl = wrap(c.title, CARD.titleFs, inner - (c.status ? 24 : 0), true);
  const pl = c.purpose ? wrap(c.purpose, CARD.purpFs, inner) : [];
  const items = (c.items || []).map(([t, s]) => ({ s, lines: wrap(t, CARD.itemFs, inner - CARD.indent) }));
  const ll = c.link ? wrap(c.link[0], CARD.linkFs, inner, true) : [];
  let h = CARD.padT + tl.length * CARD.titleFs * LH;
  if (pl.length) h += 4 + pl.length * CARD.purpFs * LH;
  if (items.length) { h += 22; for (const it of items) h += it.lines.length * CARD.itemFs * CARD.itemLH + CARD.itemGap; h -= CARD.itemGap; }
  if (ll.length) h += 12 + ll.length * CARD.linkFs * LH;
  h += CARD.padB;
  return { tl, pl, items, ll, h: Math.ceil(h) };
}

// ---------- geometry of edges ----------
const sidePt = (b, side, off = 0) => {
  if (side === 'l') return [b.x, b.y + b.h / 2 + off];
  if (side === 'r') return [b.x + b.w, b.y + b.h / 2 + off];
  if (side === 't') return [b.x + b.w / 2 + off, b.y];
  return [b.x + b.w / 2 + off, b.y + b.h];
};
export function route(e, byId) {
  const A = byId[e.from], B = byId[e.to];
  const p0 = sidePt(A, e.fs || 'r', e.fo || 0), p1 = sidePt(B, e.ts || 'l', e.to_ || 0);
  return [p0, ...(e.via || []), p1];
}
function midPoint(pts) {
  let len = 0; const seg = [];
  for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(d); len += d; }
  let t = len / 2;
  for (let i = 0; i < seg.length; i++) {
    if (t <= seg[i]) { const k = seg[i] ? t / seg[i] : 0; return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k]; }
    t -= seg[i];
  }
  return pts[pts.length - 1];
}

// ---------- SVG ----------
export function toSVG(S) {
  const o = [];
  const byId = Object.fromEntries(S.nodes.filter((n) => n.id).map((n) => [n.id, n]));
  o.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${S.W}" height="${S.H}" viewBox="0 0 ${S.W} ${S.H}" font-family="Arial, Helvetica, sans-serif">`);
  const cols = new Set([INK]); for (const e of S.edges) cols.add(e.color || INK);
  const mk = {}; let mi = 0;
  o.push('<defs>');
  for (const c of cols) {
    mk[c] = `m${mi++}`;
    o.push(`<marker id="${mk[c]}" viewBox="0 0 12 12" refX="10.5" refY="6" markerWidth="13" markerHeight="13" markerUnits="userSpaceOnUse" orient="auto-start-reverse"><path d="M1 1.5 L11 6 L1 10.5 Z" fill="${c}"/></marker>`);
    o.push(`<marker id="${mk[c]}w" viewBox="0 0 12 12" refX="10.5" refY="6" markerWidth="22" markerHeight="22" markerUnits="userSpaceOnUse" orient="auto-start-reverse"><path d="M1 1.5 L11 6 L1 10.5 Z" fill="${c}"/></marker>`);
  }
  o.push('</defs>');
  o.push(`<rect width="${S.W}" height="${S.H}" fill="#ffffff"/>`);
  const text = (x, y, lines, fs, fill, bold, anchor = 'start', lh = LH) => {
    lines.forEach((ln, i) => {
      const by = y + i * fs * lh + (fs * lh - fs) / 2 + fs * 0.8;
      o.push(`<text x="${r(x)}" y="${r(by)}" font-size="${fs}" fill="${fill}"${bold ? ' font-weight="700"' : ''}${anchor !== 'start' ? ` text-anchor="${anchor}"` : ''}>${esc(ln)}</text>`);
    });
  };
  const drawEdges = (layer) => {
    for (const e of S.edges) {
      if ((e.layer || 'under') !== layer) continue;
      const pts = route(e, byId); e._pts = pts;
      const c = e.color || INK, m = mk[c] + (e.wide ? 'w' : '');
      o.push(`<polyline points="${pts.map((p) => `${r(p[0])},${r(p[1])}`).join(' ')}" fill="none" stroke="${c}" stroke-width="${e.wide ? 6 : 3}"${e.dash ? ' stroke-dasharray="12 9"' : ''} stroke-linejoin="round" marker-end="url(#${m})"${e.both ? ` marker-start="url(#${m})"` : ''}/>`);
    }
  };
  for (const n of S.nodes) {
    if (n.k === 'band') o.push(`<rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="30" fill="${n.fill || '#f3f4f6'}"/>`);
    else if (n.k === 'panel') o.push(`<rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="24" fill="#ffffff" stroke="#94a3b8" stroke-width="2"/>`);
    else if (n.k === 'text') text(n.x, n.y, n.w ? wrap(n.text, n.fs, n.w, !!n.bold) : n.text.split('\n'), n.fs, n.color || INK, !!n.bold);
    else if (n.k === 'dot') o.push(n.sq
      ? `<rect x="${n.x - n.r}" y="${n.y - n.r}" width="${2 * n.r}" height="${2 * n.r}" rx="4" fill="${n.fill}" stroke="${n.color}" stroke-width="2"/>`
      : `<circle cx="${n.x}" cy="${n.y}" r="${n.r}" fill="${n.color}"/>`);
    else if (n.k === 'lane') {
      const h = HUES[n.hue];
      o.push(`<rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="22" fill="${h.fill}" stroke="${h.edge}" stroke-width="3"/>`);
      const cw = textWidth(n.code, LANE.codeFs, true) + 28;
      o.push(`<rect x="${n.x + LANE.pad}" y="${n.y + 18}" width="${r(cw)}" height="44" rx="10" fill="${h.edge}"/>`);
      text(n.x + LANE.pad + cw / 2, n.y + 18 + (44 - LANE.codeFs * LH) / 2, [n.code], LANE.codeFs, '#ffffff', true, 'middle');
      text(n.x + LANE.pad + cw + 16, n.y + 18 + (44 - LANE.titleFs * LH) / 2, [n.title], LANE.titleFs, h.ink, true);
      text(n.x + LANE.pad, n.y + 68, wrap(n.purpose, LANE.purpFs, n.w - 2 * LANE.pad), LANE.purpFs, INK, false);
      if (n.foot) text(n.x + LANE.pad, n.footY, wrap(n.foot, LANE.footFs, n.w - 2 * LANE.pad), LANE.footFs, MUTED, false);
    } else if (n.k === 'card') {
      const h = HUES[n.hue], m = measureCard(n, n.w);
      o.push(`<rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="12" fill="#ffffff" stroke="${h.edge}" stroke-width="2.2"/>`);
      let y = n.y + CARD.padT; const x = n.x + CARD.padX;
      text(x, y, m.tl, CARD.titleFs, h.ink, true); y += m.tl.length * CARD.titleFs * LH;
      if (n.status) o.push(`<circle cx="${n.x + n.w - 20}" cy="${n.y + 26}" r="7.5" fill="${STATUS[n.status]}"/>`);
      if (m.pl.length) { y += 4; text(x, y, m.pl, CARD.purpFs, INK, false); y += m.pl.length * CARD.purpFs * LH; }
      if (m.items.length) {
        y += 11; o.push(`<line x1="${x}" y1="${r(y)}" x2="${n.x + n.w - CARD.padX}" y2="${r(y)}" stroke="${h.edge}" stroke-opacity="0.35" stroke-width="1.2"/>`); y += 11;
        for (const it of m.items) {
          o.push(`<circle cx="${x + 6}" cy="${r(y + CARD.itemFs * CARD.itemLH / 2)}" r="5.2" fill="${STATUS[it.s]}"/>`);
          text(x + CARD.indent, y, it.lines, CARD.itemFs, '#1f2937', false, 'start', CARD.itemLH);
          y += it.lines.length * CARD.itemFs * CARD.itemLH + CARD.itemGap;
        }
        y -= CARD.itemGap;
      }
      if (m.ll.length) text(x, n.y + n.h - CARD.padB - m.ll.length * CARD.linkFs * LH, m.ll, CARD.linkFs, HUES[n.link[1]].edge, true);
    } else if (n.k === 'mapbox') {
      const h = HUES[n.hue];
      o.push(`<rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="14" fill="${n.filled ? h.fill : '#ffffff'}" stroke="${h.edge}" stroke-width="3"/>`);
      const nl = wrap(`${n.code}  ${n.name}`, MAPB.nameFs, n.w - 2 * MAPB.pad, true);
      const ll = n.line ? wrap(n.line, MAPB.lineFs, n.w - 2 * MAPB.pad) : [];
      const th = nl.length * MAPB.nameFs * LH + (ll.length ? 4 + ll.length * MAPB.lineFs * LH : 0);
      let y = n.y + (n.h - th) / 2;
      text(n.x + MAPB.pad, y, nl, MAPB.nameFs, h.ink, true); y += nl.length * MAPB.nameFs * LH + 4;
      if (ll.length) text(n.x + MAPB.pad, y, ll, MAPB.lineFs, INK, false);
    } else if (n.k === 'edges') drawEdges(n.layer || 'under');
  }
  for (const e of S.edges) {
    if (!e.label || !e._pts) continue;
    const fs = 15.5, lines = e.label.split('\n');
    const w = Math.max(...lines.map((l) => textWidth(l, fs, true))) + 20, hh = lines.length * fs * LH + 10;
    const [mx, my] = midPoint(e._pts);
    o.push(`<rect x="${r(mx - w / 2)}" y="${r(my - hh / 2)}" width="${r(w)}" height="${r(hh)}" rx="7" fill="#ffffff" stroke="${e.color || INK}" stroke-width="1.3"/>`);
    text(mx, my - hh / 2 + 5, lines, fs, e.color || INK, true, 'middle');
  }
  o.push('</svg>');
  return o.join('\n');
}

// ---------- draw.io ----------
export function toDrawio(S, pageName = 'The whole harness') {
  const byId = Object.fromEntries(S.nodes.filter((n) => n.id).map((n) => [n.id, n]));
  const cells = []; let auto = 0;
  const geo = (x, y, w, h) => `<mxGeometry x="${r(x)}" y="${r(y)}" width="${r(w)}" height="${r(h)}" as="geometry"/>`;
  const vertex = (id, value, style, x, y, w, h, parent = '1', link = null) => {
    const cell = `<mxCell${link ? '' : ` id="${id}" value="${esc(value)}"`} style="${style}" vertex="1" parent="${parent}">${geo(x, y, w, h)}</mxCell>`;
    cells.push(link ? `<UserObject label="${esc(value)}" link="${esc(link)}" id="${id}">${cell}</UserObject>` : cell);
  };
  const font = 'fontFamily=Helvetica;';
  for (const n of S.nodes) {
    if (n.k === 'band') vertex(n.id || `x${auto++}`, '', `rounded=1;arcSize=3;fillColor=${n.fill || '#f3f4f6'};strokeColor=none;connectable=0;`, n.x, n.y, n.w, n.h);
    else if (n.k === 'panel') vertex(n.id || `x${auto++}`, '', 'rounded=1;arcSize=3;fillColor=#ffffff;strokeColor=#94a3b8;strokeWidth=2;connectable=0;', n.x, n.y, n.w, n.h);
    else if (n.k === 'text') {
      const lines = n.w ? wrap(n.text, n.fs, n.w, !!n.bold) : n.text.split('\n');
      const w = n.w || Math.max(...lines.map((l) => textWidth(l, n.fs, !!n.bold))) + 8;
      vertex(n.id || `x${auto++}`, n.text.replace(/\n/g, '<br>'), `text;html=1;${n.w ? 'whiteSpace=wrap;' : ''}align=left;verticalAlign=top;spacing=0;${font}fontSize=${n.fs};fontColor=${n.color || INK};fontStyle=${n.bold ? 1 : 0};`,
        n.x, n.y, w + 6, lines.length * n.fs * LH + 6, n.parent ? n.parent : '1');
    } else if (n.k === 'dot') vertex(`x${auto++}`, '', n.sq ? `rounded=1;fillColor=${n.fill};strokeColor=${n.color};strokeWidth=2;connectable=0;` : `ellipse;fillColor=${n.color};strokeColor=none;connectable=0;`, n.x - n.r, n.y - n.r, 2 * n.r, 2 * n.r);
    else if (n.k === 'lane') {
      const h = HUES[n.hue];
      const label = `<span style="background-color:${h.edge};color:#ffffff;font-size:${LANE.codeFs}px;border-radius:8px;">&nbsp;${esc(n.code)}&nbsp;</span>&nbsp;&nbsp;<span style="font-size:${LANE.titleFs}px;color:${h.ink};">${esc(n.title)}</span><div style="font-size:${LANE.purpFs}px;font-weight:normal;color:${INK};margin-top:6px;">${esc(n.purpose)}</div>`;
      vertex(n.id, label, `swimlane;html=1;whiteSpace=wrap;startSize=${n.headH || LANE.headH};horizontal=1;rounded=1;arcSize=6;collapsible=1;fillColor=${h.fill};swimlaneFillColor=${h.fill};strokeColor=${h.edge};strokeWidth=3;align=left;verticalAlign=middle;spacingLeft=${LANE.pad};spacingRight=${LANE.pad};${font}fontStyle=1;fontSize=${LANE.titleFs};swimlaneLine=0;`, n.x, n.y, n.w, n.h);
      if (n.foot) vertex(`${n.id}-foot`, esc(n.foot), `text;html=1;whiteSpace=wrap;align=left;verticalAlign=top;spacing=0;${font}fontSize=${LANE.footFs};fontColor=${MUTED};connectable=0;`, LANE.pad, n.footY - n.y, n.w - 2 * LANE.pad, n.y + n.h - n.footY - 8, n.id);
    } else if (n.k === 'card') {
      const h = HUES[n.hue], p = byId[n.parent];
      let html = `<div style="line-height:${LH};font-size:${CARD.titleFs}px;color:${h.ink};"><b>${esc(n.title)}</b>${n.status ? `&nbsp;<font color="${STATUS[n.status]}" style="font-size:18px;">&#9679;</font>` : ''}</div>`;
      if (n.purpose) html += `<div style="line-height:${LH};font-size:${CARD.purpFs}px;margin-top:4px;">${esc(n.purpose)}</div>`;
      if (n.items && n.items.length) {
        html += `<hr size="1" style="border:none;border-top:1px solid ${h.edge};opacity:0.4;margin:10px 0;">`;
        for (const [t, s] of n.items) html += `<div style="line-height:${CARD.itemLH};font-size:${CARD.itemFs}px;color:#1f2937;padding-left:${CARD.indent}px;text-indent:-${CARD.indent}px;margin-bottom:${CARD.itemGap}px;"><font color="${STATUS[s]}">&#9679;</font>&nbsp;${esc(t)}</div>`;
      }
      if (n.link) html += `<div style="line-height:${LH};font-size:${CARD.linkFs}px;margin-top:8px;color:${HUES[n.link[1]].edge};"><b>${esc(n.link[0])}</b></div>`;
      vertex(n.id, html, `rounded=1;arcSize=5;html=1;whiteSpace=wrap;align=left;verticalAlign=top;spacingLeft=${CARD.padX - 2};spacingRight=${CARD.padX - 2};spacingTop=${CARD.padT - 6};spacingBottom=6;fillColor=#ffffff;strokeColor=${h.edge};strokeWidth=2;${font}fontSize=${CARD.itemFs};fontColor=${INK};`,
        n.x - p.x, n.y - p.y, n.w, n.h, n.parent);
    } else if (n.k === 'mapbox') {
      const h = HUES[n.hue];
      const html = `<div style="line-height:${LH};font-size:${MAPB.nameFs}px;color:${h.ink};"><b>${esc(n.code)}&nbsp;&nbsp;${esc(n.name)}</b></div>${n.line ? `<div style="line-height:${LH};font-size:${MAPB.lineFs}px;margin-top:4px;">${esc(n.line)}</div>` : ''}`;
      const link = n.target ? `data:action/json,${JSON.stringify({ title: `Go to ${n.code}`, actions: [{ scroll: { cells: [n.target] } }, { highlight: { cells: [n.target], color: h.edge, duration: 1500 } }] })}` : null;
      vertex(n.id, html, `rounded=1;arcSize=10;html=1;whiteSpace=wrap;align=left;verticalAlign=middle;spacingLeft=${MAPB.pad - 2};spacingRight=${MAPB.pad - 2};fillColor=${n.filled ? h.fill : '#ffffff'};strokeColor=${h.edge};strokeWidth=3;${font}fontSize=${MAPB.lineFs};fontColor=${INK};`, n.x, n.y, n.w, n.h, '1', link);
    }
  }
  const frac = (b, side, off) => (side === 'l' ? [0, 0.5 + off / b.h] : side === 'r' ? [1, 0.5 + off / b.h] : side === 't' ? [0.5 + off / b.w, 0] : [0.5 + off / b.w, 1]);
  S.edges.forEach((e, i) => {
    const A = byId[e.from], B = byId[e.to], c = e.color || INK;
    const [ex, ey] = frac(A, e.fs || 'r', e.fo || 0), [nx, ny] = frac(B, e.ts || 'l', e.to_ || 0);
    const sameParent = A.parent && A.parent === B.parent && !(e.via && e.via.length);
    const style = `edgeStyle=${e.via && e.via.length ? 'orthogonalEdgeStyle' : 'none'};rounded=0;html=1;exitX=${r(ex * 1000) / 1000};exitY=${r(ey * 1000) / 1000};exitDx=0;exitDy=0;entryX=${r(nx * 1000) / 1000};entryY=${r(ny * 1000) / 1000};entryDx=0;entryDy=0;endArrow=block;endFill=1;endSize=${e.wide ? 10 : 7};${e.both ? `startArrow=block;startFill=1;startSize=${e.wide ? 10 : 7};` : ''}strokeWidth=${e.wide ? 5 : 3};strokeColor=${c};${e.dash ? 'dashed=1;dashPattern=3 2;' : ''}${font}fontSize=15;fontStyle=1;fontColor=${c};labelBackgroundColor=#ffffff;labelBorderColor=${c};spacing=5;`;
    const pts = (e.via || []).map((p) => `<mxPoint x="${r(p[0])}" y="${r(p[1])}"/>`).join('');
    cells.push(`<mxCell id="e${i}" value="${esc((e.label || '').replace(/\n/g, '<br>'))}" style="${style}" edge="1" parent="${sameParent ? A.parent : '1'}" source="${e.from}" target="${e.to}"><mxGeometry relative="1" as="geometry">${pts ? `<Array as="points">${pts}</Array>` : ''}</mxGeometry></mxCell>`);
  });
  return `<mxfile host="app.diagrams.net" agent="harness-pipeline generator" version="24.7.17">\n<diagram id="whole" name="${esc(pageName)}">\n<mxGraphModel dx="1600" dy="900" grid="0" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="0" pageScale="1" pageWidth="${S.W}" pageHeight="${S.H}" math="0" shadow="0">\n<root>\n<mxCell id="0"/>\n<mxCell id="1" parent="0"/>\n${cells.join('\n')}\n</root>\n</mxGraphModel>\n</diagram>\n</mxfile>\n`;
}

// ---------- checks ----------
export function check(S) {
  const problems = [];
  const ids = new Set();
  for (const n of S.nodes) { if (!n.id) continue; if (ids.has(n.id)) problems.push(`duplicate id ${n.id}`); ids.add(n.id); }
  for (const n of S.nodes) {
    if (n.k === 'card') {
      const m = measureCard(n, n.w);
      if (m.h > n.h + 0.5) problems.push(`card ${n.id} "${n.title}": needs ${m.h} px, has ${n.h}`);
      for (const l of m.tl) if (textWidth(l, CARD.titleFs, true) > n.w - 2 * CARD.padX) problems.push(`card ${n.id}: title word too wide: ${l}`);
    }
    if (n.k === 'mapbox') {
      const nl = wrap(`${n.code}  ${n.name}`, MAPB.nameFs, n.w - 2 * MAPB.pad, true), ll = n.line ? wrap(n.line, MAPB.lineFs, n.w - 2 * MAPB.pad) : [];
      const th = nl.length * MAPB.nameFs * LH + (ll.length ? 4 + ll.length * MAPB.lineFs * LH : 0);
      if (th > n.h - 12) problems.push(`map box ${n.id}: text needs ${Math.ceil(th)} px, box is ${n.h}`);
    }
    if (n.k === 'lane') {
      if (wrap(n.purpose, LANE.purpFs, n.w - 2 * LANE.pad).length > (n.purpLines || 1)) problems.push(`lane ${n.id}: the line under its title runs to too many lines`);
      if (textWidth(n.title, LANE.titleFs, true) + textWidth(n.code, LANE.codeFs, true) + 44 > n.w - 2 * LANE.pad) problems.push(`lane ${n.id}: title too wide`);
    }
    if (n.x != null && n.w != null && (n.x < 0 || n.y < 0 || n.x + n.w > S.W || n.y + n.h > S.H)) problems.push(`${n.k} ${n.id || ''}: outside the canvas`);
  }
  for (const e of S.edges) { if (!ids.has(e.from)) problems.push(`edge from unknown ${e.from}`); if (!ids.has(e.to)) problems.push(`edge to unknown ${e.to}`); }
  return problems;
}
