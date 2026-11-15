// SVG chart builders for the harness compile PDF. Units are CSS px; a full-width chart is 672 px (178 mm).
// Rules followed (dataviz skill): thin bars (<= 24 px) with a 4 px rounded data end and a square baseline,
// 2 px surface gaps between touching fills, hairline solid grid, text in ink tokens never in series colours,
// labels inside a fill only when they fit, one axis per chart, categorical slots in fixed order.
'use strict';
const INK = '#0b0b0b', INK2 = '#52514e', MUTED = '#898781', GRID = '#e1e0d9', AXIS = '#c3c2b7', SURF = '#ffffff';
const CAT = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'];
const SEQ = { 100: '#cde2fb', 150: '#b7d3f6', 200: '#9ec5f4', 250: '#86b6ef', 300: '#6da7ec', 350: '#5598e7', 400: '#3987e5', 450: '#2a78d6', 500: '#256abf', 550: '#1c5cab', 600: '#184f95', 650: '#104281', 700: '#0d366b' };
const FONT = 'Segoe UI, system-ui, sans-serif';
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const tw = (s, fs, w) => String(s).length * fs * (w || 0.53);   // rough text width for Segoe UI
const insideInk = c => (c === '#eda100' || c === '#fab219' || c === SEQ[100] || c === SEQ[150] || c === SEQ[200] || c === SEQ[250] || c === SEQ[300] || c === '#e87ba4' || c === '#1baf7a') ? INK : '#ffffff';

function svg(w, h, body, label) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${esc(label || '')}" font-family="${FONT}">${body}</svg>`;
}
function text(x, y, s, o) {
  o = o || {};
  return `<text x="${x}" y="${y}" font-size="${o.fs || 10.5}" fill="${o.fill || INK}"${o.anchor ? ` text-anchor="${o.anchor}"` : ''}${o.weight ? ` font-weight="${o.weight}"` : ''}${o.base ? ` dominant-baseline="${o.base}"` : ''}>${esc(s)}</text>`;
}
// Horizontal bar: square at the baseline (left), 4 px rounded data end (right).
function hbar(x, y, w, h, fill) {
  if (w <= 0) return '';
  const r = Math.min(4, w / 2, h / 2);
  return `<path d="M${x},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h - r} Q${x + w},${y + h} ${x + w - r},${y + h} H${x} Z" fill="${fill}"/>`;
}
function rrect(x, y, w, h, r, fill, stroke) {
  return `<rect x="${x}" y="${y}" width="${Math.max(0, w)}" height="${h}" rx="${r}" fill="${fill}"${stroke ? ` stroke="${stroke}" stroke-width="1"` : ''}/>`;
}
function wrap(s, maxChars) {
  const words = String(s).split(/\s+/); const lines = []; let cur = '';
  words.forEach(w => { if ((cur + ' ' + w).trim().length > maxChars && cur) { lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); });
  if (cur) lines.push(cur);
  return lines;
}

// Tall segmented bars: each row is one whole split into parts (shares in %).
// rows: [{label, sub, values:[..]}], parts: [{name}] -> colours CAT[i]
function segmented(rows, parts, o) {
  o = o || {};
  const W = o.width || 672, labW = o.labW || 120, barH = 28, gap = 2, rowH = 46, top = 6;
  const plotW = W - labW - 8;
  let b = '';
  rows.forEach((r, i) => {
    const y = top + i * rowH;
    b += text(0, y + 12, r.label, { weight: 600, fs: 11 });
    if (r.sub) b += text(0, y + 26, r.sub, { fill: INK2, fs: 9.5 });
    const total = r.values.reduce((a, v) => a + v, 0);
    let x = labW;
    r.values.forEach((v, j) => {
      const w = (v / total) * plotW - (j < r.values.length - 1 ? gap : 0);
      const c = CAT[j];
      b += rrect(x, y, w, barH, 4, c);
      const lab = Math.round(v) + '%';
      if (tw(lab, 10.5) + 10 < w) b += text(x + 6, y + barH / 2 + 4, lab, { fill: insideInk(c), fs: 10.5, weight: 600 });
      x += w + gap;
    });
  });
  return svg(W, top + rows.length * rowH - 10, b, o.label);
}

// Horizontal bars, one series, values in % of a whole (0..max). items: [{label, sub, value, show, tag}]
function hbars(items, o) {
  o = o || {};
  const W = o.width || 672, labW = o.labW || 250, barH = 16, rowH = o.rowH || 34, top = 18, max = o.max || 100;
  const plotW = W - labW - 70;
  let b = '';
  // grid
  const ticks = o.ticks || [0, 25, 50, 75, 100];
  ticks.forEach(t => {
    const x = labW + (t / max) * plotW;
    b += `<line x1="${x}" y1="${top - 4}" x2="${x}" y2="${top + items.length * rowH - 8}" stroke="${t === 0 ? AXIS : GRID}" stroke-width="1"/>`;
    b += text(x, top - 8, t + (o.unit || '%'), { fs: 9, fill: MUTED, anchor: 'middle' });
  });
  items.forEach((it, i) => {
    const y = top + i * rowH;
    const lines = wrap(it.label, o.wrap || 40);
    lines.slice(0, 2).forEach((ln, k) => { b += text(0, y + 10 + k * 12, ln, { fs: 10.2, weight: k === 0 ? 600 : 400 }); });
    if (it.sub) b += text(0, y + 10 + Math.min(lines.length, 2) * 12, it.sub, { fs: 9, fill: INK2 });
    const w = (it.value / max) * plotW;
    b += hbar(labW, y + 2, w, barH, it.color || CAT[0]);
    if (it.value2 != null) { const w2 = (it.value2 / max) * plotW; b += `<line x1="${labW + w2}" y1="${y - 1}" x2="${labW + w2}" y2="${y + barH + 5}" stroke="${INK}" stroke-width="2"/>`; }
    b += text(labW + Math.max(w, it.value2 != null ? (it.value2 / max) * plotW : 0) + 6, y + 14, it.show || (it.value + '%'), { fs: 10.2, weight: 600 });
    if (it.tag) b += text(labW + Math.max(w, it.value2 != null ? (it.value2 / max) * plotW : 0) + 6 + tw(it.show || (it.value + '%'), 10.2, 0.56) + 4, y + 14, '[' + it.tag + ']', { fs: 8.5, fill: MUTED });
  });
  return svg(W, top + items.length * rowH - 4, b, o.label);
}

// Before -> after: bar = what is left of the old time (after / before), on one 0-100 % axis.
// items: [{label, before, after, unit, factor}]
function beforeAfter(items, o) {
  o = o || {};
  const W = o.width || 672, labW = 230, rowH = 36, top = 18, plotW = W - labW - 150;
  let b = '';
  [0, 25, 50, 75, 100].forEach(t => {
    const x = labW + (t / 100) * plotW;
    b += `<line x1="${x}" y1="${top - 4}" x2="${x}" y2="${top + items.length * rowH - 8}" stroke="${t === 0 ? AXIS : GRID}" stroke-width="1"/>`;
    b += text(x, top - 8, t + '%', { fs: 9, fill: MUTED, anchor: 'middle' });
  });
  items.forEach((it, i) => {
    const y = top + i * rowH;
    b += text(0, y + 10, it.label, { fs: 10.2, weight: 600 });
    b += text(0, y + 23, it.detail, { fs: 9, fill: INK2 });
    const share = Math.max(0.4, (it.after / it.before) * 100);
    b += rrect(labW, y + 3, plotW, 14, 4, '#eef4fc');
    b += hbar(labW, y + 3, (share / 100) * plotW, 14, CAT[0]);
    b += text(labW + plotW + 8, y + 10, it.factor, { fs: 10.5, weight: 600 });
    b += text(labW + plotW + 8, y + 23, it.note || '', { fs: 8.8, fill: INK2 });
  });
  return svg(W, top + items.length * rowH - 4, b, o.label);
}

// Heat map: rows x cols, counts; sequential blue, numbers inside; zero cells left blank.
function heatmap(rows, cols, m, o) {
  o = o || {};
  // The header band is as tall as the longest wrapped column label needs, capped at o.top.
  const hdrLines = Math.max(1, ...cols.map(c => Math.min(4, wrap(c, o.colWrap || 11).length)));
  const W = o.width || 672, labW = o.labW || 170, top = Math.min(o.top || 64, 20 + 11 * hdrLines), cellH = o.cellH || 22;
  const cellW = (W - labW) / cols.length;
  const max = Math.max(1, ...m.flat());
  const steps = [150, 250, 350, 450, 550, 650];
  let b = '';
  cols.forEach((c, j) => {
    const x = labW + j * cellW + cellW / 2;
    const lines = wrap(c, o.colWrap || 11);
    lines.slice(-4).forEach((ln, k, arr) => { b += text(x, top - 8 - (arr.length - 1 - k) * 11, ln, { fs: 9, anchor: 'middle', fill: INK2, weight: 600 }); });
  });
  rows.forEach((r, i) => {
    const y = top + i * cellH;
    b += text(0, y + cellH / 2 + 4, r, { fs: 9.8 });
    cols.forEach((c, j) => {
      const v = m[i][j] || 0; const x = labW + j * cellW;
      if (!v) { b += rrect(x + 1, y + 1, cellW - 2, cellH - 2, 3, '#f5f4f1'); return; }
      const step = steps[Math.min(steps.length - 1, Math.floor((v / max) * steps.length * 0.999))];
      const fill = SEQ[step];
      b += rrect(x + 1, y + 1, cellW - 2, cellH - 2, 3, fill);
      b += text(x + cellW / 2, y + cellH / 2 + 4, v, { fs: 9.8, anchor: 'middle', weight: 600, fill: step <= 250 ? INK : '#ffffff' });
    });
  });
  return svg(W, top + rows.length * cellH + 2, b, o.label);
}

// Stacked bars by maturity (ordinal ramp + grey for parked). rows: [{label, counts:[parked, idea, designed, built, tested, inuse]}]
const MAT_COLORS = ['#d9d8d2', SEQ[250], SEQ[350], SEQ[450], SEQ[550], SEQ[650]];   // parked, idea, designed, built, tested, in use (validated ordinal ramp)
function maturityStack(rows, o) {
  o = o || {};
  const W = o.width || 672, labW = o.labW || 230, barH = 18, rowH = 27, top = 4;
  const max = o.max || Math.max(...rows.map(r => r.counts.reduce((a, v) => a + v, 0)));
  const plotW = W - labW - 40;
  let b = '';
  rows.forEach((r, i) => {
    const y = top + i * rowH;
    b += text(0, y + 13, r.label, { fs: 10.2, weight: r.bold ? 600 : 400 });
    let x = labW; const total = r.counts.reduce((a, v) => a + v, 0);
    // order: in use (darkest) first from the baseline, parked last
    const order = [5, 4, 3, 2, 1, 0];
    order.forEach((k, idx) => {
      const v = r.counts[k]; if (!v) return;
      const w = (v / max) * plotW;
      const last = order.slice(idx + 1).every(q => !r.counts[q]);
      const drawW = Math.max(1, w - (last ? 0 : 2));
      b += last ? hbar(x, y, drawW, barH, MAT_COLORS[k]) : `<rect x="${x}" y="${y}" width="${drawW}" height="${barH}" fill="${MAT_COLORS[k]}"/>`;
      if (tw(String(v), 9.5) + 6 < drawW) b += text(x + drawW / 2, y + 13, v, { fs: 9.5, anchor: 'middle', weight: 600, fill: k === 1 ? INK : (k === 0 ? INK2 : '#ffffff') });
      x += w;
    });
    b += text(x + 6, y + 13, total, { fs: 10.2, weight: 600 });
  });
  return svg(W, top + rows.length * rowH - 6, b, o.label);
}

// Grouped bars with interval whiskers for differences. items: [{label, sub, value, lo, hi}], axis min..max around zero
function diffChart(items, o) {
  o = o || {};
  const W = o.width || 672, labW = o.labW || 250, rowH = 34, top = 20, min = o.min, max = o.max;
  const plotW = W - labW - 60;
  const X = v => labW + ((v - min) / (max - min)) * plotW;
  let b = '';
  (o.ticks || []).forEach(t => {
    b += `<line x1="${X(t)}" y1="${top - 4}" x2="${X(t)}" y2="${top + items.length * rowH - 8}" stroke="${t === 0 ? AXIS : GRID}" stroke-width="${t === 0 ? 1.5 : 1}"/>`;
    b += text(X(t), top - 8, (t > 0 ? '+' : '') + t.toFixed(2), { fs: 9, fill: MUTED, anchor: 'middle' });
  });
  items.forEach((it, i) => {
    const y = top + i * rowH;
    b += text(0, y + 10, it.label, { fs: 10.2, weight: 600 });
    if (it.sub) b += text(0, y + 23, it.sub, { fs: 9, fill: INK2 });
    if (it.lo != null) {
      b += `<line x1="${X(it.lo)}" y1="${y + 9}" x2="${X(it.hi)}" y2="${y + 9}" stroke="${INK2}" stroke-width="2" stroke-linecap="round"/>`;
      b += `<line x1="${X(it.lo)}" y1="${y + 4}" x2="${X(it.lo)}" y2="${y + 14}" stroke="${INK2}" stroke-width="1.5"/>`;
      b += `<line x1="${X(it.hi)}" y1="${y + 4}" x2="${X(it.hi)}" y2="${y + 14}" stroke="${INK2}" stroke-width="1.5"/>`;
    }
    b += `<circle cx="${X(it.value)}" cy="${y + 9}" r="5" fill="${CAT[0]}" stroke="${SURF}" stroke-width="2"/>`;
    b += text(X(Math.max(it.value, it.hi == null ? it.value : it.hi)) + 9, y + 13, (it.value > 0 ? '+' : '') + it.value.toFixed(3), { fs: 10, weight: 600 });
  });
  return svg(W, top + items.length * rowH - 4, b, o.label);
}

// Timeline: events [{date:'2026-10-31', label, sub, lane}] laid on a day axis, labels in lanes to avoid collisions.
function timeline(events, o) {
  o = o || {};
  const W = o.width || 672, d0 = new Date(o.from + 'T00:00:00Z').getTime(), d1 = new Date(o.to + 'T00:00:00Z').getTime();
  const left = 8, right = 8, axisY = o.axisY || 30, laneH = 40;
  const X = d => left + ((new Date(d + 'T00:00:00Z').getTime() - d0) / (d1 - d0)) * (W - left - right);
  let b = '';
  b += `<line x1="${left}" y1="${axisY}" x2="${W - right}" y2="${axisY}" stroke="${AXIS}" stroke-width="1.5"/>`;
  for (let t = d0; t <= d1; t += 86400000) {
    const d = new Date(t); const ds = d.toISOString().slice(0, 10); const x = X(ds);
    b += `<line x1="${x}" y1="${axisY - 3}" x2="${x}" y2="${axisY + 3}" stroke="${AXIS}" stroke-width="1"/>`;
    const lab = d.getUTCDate() + (d.getUTCDate() === 1 || t === d0 ? ' ' + ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getUTCMonth()] : '');
    b += text(x, axisY - 8, lab, { fs: 8.8, fill: MUTED, anchor: t === d0 ? 'start' : 'middle' });
  }
  const lanesMax = Math.max(...events.map(e => e.lane)) + 1;
  // Leader lines first, then dots, then each label on a white backing box, so a deeper lane's line never
  // runs through an earlier label. (A stroked text halo would do it too, but Chrome's PDF then stores the
  // text twice and a copied label reads "OOrrcchh…".)
  const backing = (tx, anchor, top, h, w) => {
    const x0 = anchor === 'start' ? tx - 2 : anchor === 'end' ? tx - w + 2 : tx - w / 2;
    return `<rect x="${x0}" y="${top}" width="${w}" height="${h}" fill="#ffffff"/>`;
  };
  events.forEach(e => {
    const x = X(e.date); const y = axisY + 16 + e.lane * laneH;
    b += `<line x1="${x}" y1="${axisY}" x2="${x}" y2="${y - 2}" stroke="${GRID}" stroke-width="1"/>`;
  });
  events.forEach(e => { b += `<circle cx="${X(e.date)}" cy="${axisY}" r="4" fill="${CAT[0]}" stroke="#fff" stroke-width="2"/>`; });
  events.forEach(e => {
    const x = X(e.date); const y = axisY + 16 + e.lane * laneH;
    const anchor = e.anchor || 'start';
    const tx = anchor === 'start' ? x + 2 : anchor === 'end' ? x - 2 : x;
    b += backing(tx, anchor, y - 2, 13, tw(e.label, 9.8, 0.58) + 4);
    b += text(tx, y + 8, e.label, { fs: 9.8, weight: 600, anchor });
    if (e.sub) {
      b += backing(tx, anchor, y + 11, 12, tw(e.sub, 8.8) + 4);
      b += text(tx, y + 20, e.sub, { fs: 8.8, fill: INK2, anchor });
    }
  });
  return svg(W, axisY + 16 + lanesMax * laneH, b, o.label);
}

module.exports = { svg, text, hbar, rrect, wrap, segmented, hbars, beforeAfter, heatmap, maturityStack, diffChart, timeline, CAT, SEQ, INK, INK2, MUTED, GRID, AXIS, MAT_COLORS, esc, tw };
