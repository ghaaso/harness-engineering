// Where everything goes. Two columns:
//   left:  title, the system map, the path of one piece of work (six stages), the control pipelines
//   right: how to read, the code-knowledge pipelines, the memory pipelines, measure and improve
import { HUES, LANE, STATUS, INK, MUTED, measureCard, wrap } from './lib.mjs';
import { PATH, LANES, MAP } from './content.mjs';

const CW = 400, CG = 60, COLW = 3300, MX = 80, COLGAP = 140, LGAP = 84, SGAP = 76;
const W = 2 * MX + 2 * COLW + COLGAP, X0 = MX, X1 = MX + COLW + COLGAP;
const nodes = [], edges = [], problems = [];
const card = (c) => ({ title: c.t, purpose: c.p, items: c.items || [], link: c.link, status: c.s });
const byId = () => Object.fromEntries(nodes.filter((n) => n.id).map((n) => [n.id, n]));
const text = (x, y, t, fs, o = {}) => { nodes.push({ k: 'text', x, y, text: t, fs, ...o }); return (o.w ? wrap(t, fs, o.w, !!o.bold).length : t.split('\n').length) * fs * 1.25; };

// ---------- a pipeline drawn as a row of steps ----------
const laneW = (n) => 2 * LANE.pad + n * CW + (n - 1) * CG;
const cardsH = (spec) => Math.max(...spec.cards.map((c) => measureCard(card(c), CW).h));
const laneH = (spec, w, ch) => { const fl = spec.foot ? wrap(spec.foot, LANE.footFs, w - 2 * LANE.pad).length : 0; return LANE.headH + 12 + ch + (fl ? 14 + fl * LANE.footFs * 1.25 + 16 : 22); };
function placeLane(id, x, y, ch, h) {
  const spec = LANES[id], w = laneW(spec.cards.length);
  nodes.push({ k: 'lane', id, hue: spec.hue, x, y, w, h, code: id, title: spec.title, purpose: spec.purpose, foot: spec.foot, footY: y + LANE.headH + 12 + ch + 14 });
  spec.cards.forEach((c, i) => {
    nodes.push({ k: 'card', id: `${id}-${i + 1}`, parent: id, hue: spec.hue, x: x + LANE.pad + i * (CW + CG), y: y + LANE.headH + 12, w: CW, h: ch, ...card(c) });
    if (i && !spec.noSeq && !c.noArrow) edges.push({ from: `${id}-${i}`, to: `${id}-${i + 1}`, color: HUES[spec.hue].edge, wide: true });
  });
}
function laneRow(ids, x, y) {
  const ch = Math.max(...ids.map((id) => cardsH(LANES[id])));
  const ws = ids.map((id) => laneW(LANES[id].cards.length));
  const h = Math.max(...ids.map((id, i) => laneH(LANES[id], ws[i], ch)));
  const gap = ids.length > 1 ? (COLW - ws.reduce((a, b) => a + b, 0)) / (ids.length - 1) : 0;
  let cx = x; ids.forEach((id, i) => { placeLane(id, cx, y, ch, h); cx += ws[i] + gap; });
  return h;
}
// an arrow from the bottom of one pipeline (under one of its steps) to the top of the next (above one of its steps)
function hand(fromLane, fromCard, toLane, toCard, label) {
  const b = byId(), A = b[fromLane], B = b[toLane], c = b[fromCard], d = b[toCard];
  const x1 = c.x + c.w / 2, x2 = d.x + d.w / 2, my = (A.y + A.h + B.y) / 2;
  edges.push({ from: fromLane, to: toLane, fs: 'b', ts: 't', fo: x1 - (A.x + A.w / 2), to_: x2 - (B.x + B.w / 2), via: [[x1, my], [x2, my]], color: HUES[A.hue].edge, wide: true, label });
}

// ---------- a section: a grey band with a title and a line ----------
function section(title, line, x, y, body) {
  const band = { k: 'band', x: x - 26, y, w: COLW + 52, h: 0 }; nodes.push(band);
  let cy = y + 26;
  cy += text(x, cy, title, 54, { bold: true, color: '#334155' }) + 4;
  cy += text(x, cy, line, 21, { color: INK }) + 26;
  cy = body(cy);
  band.h = cy + 26 - y;
  return y + band.h;
}

// ---------- the path: six stages side by side, steps top to bottom ----------
function placePath(x, y) {
  const SW = CW + 2 * LANE.pad, HEAD = 132, VG = 46, gap = (COLW - 6 * SW) / 5;
  const rowH = [0, 1, 2, 3].map((k) => Math.max(...PATH.map((s) => measureCard(card(s.cards[k]), CW).h)));
  const ch = rowH.reduce((a, b) => a + b, 0) + 3 * VG;
  const fh = Math.max(...PATH.map((s) => wrap(s.foot, LANE.footFs, CW).length)) * LANE.footFs * 1.25;
  const h = HEAD + 12 + ch + 14 + fh + 16;
  PATH.forEach((s, i) => {
    const sx = x + i * (SW + gap);
    nodes.push({ k: 'lane', id: s.id, hue: 'path', x: sx, y, w: SW, h, code: s.code, title: s.title, purpose: s.purpose, foot: s.foot, footY: y + HEAD + 12 + ch + 14, headH: HEAD, purpLines: 2 });
    let cy = y + HEAD + 12;
    s.cards.forEach((c, k) => {
      nodes.push({ k: 'card', id: `${s.id}-${k + 1}`, parent: s.id, hue: 'path', x: sx + LANE.pad, y: cy, w: CW, h: rowH[k], ...card(c) });
      if (k) edges.push({ from: `${s.id}-${k}`, to: `${s.id}-${k + 1}`, fs: 'b', ts: 't', color: HUES.path.edge, wide: true });
      cy += rowH[k] + VG;
    });
    if (i) edges.push({ from: PATH[i - 1].id, to: s.id, fo: -h / 2 + 40, to_: -h / 2 + 40, color: HUES.path.edge, wide: true });
  });
  return h;
}

// ---------- the system map ----------
function placeMap(x, y) {
  const H = 884, BW = 400, BH = 122, pitch = 472;
  nodes.push({ k: 'panel', x, y, w: COLW, h: H });
  text(x + 30, y + 22, 'THE WHOLE SYSTEM IN ONE PICTURE', 32, { bold: true, color: '#0f172a' });
  text(x + 30, y + 68, 'Every box is one pipeline. Each is drawn in full under the same letter or number. An arrow shows what one pipeline hands to another.', 19);
  const sx = (i) => x + 50 + i * pitch, cx = (i) => sx(i) + BW / 2, yT = y + 190, yP = y + 424, yB = y + 658;
  const box = (d, i, by, bh, filled) => { if (d) nodes.push({ k: 'mapbox', id: d[0], hue: d[1], x: sx(i), y: by, w: BW, h: bh, code: d[2], name: d[3], line: d[4], target: d[5], filled }); };
  MAP.top.forEach((d, i) => box(d, i, yT, BH, false));
  MAP.path.forEach((d, i) => box(d, i + 1, yP, BH, true));
  MAP.bottom.forEach((d, i) => box(d, i, yB, BH, false));
  box(MAP.west[0], 0, yP, 56, false); box(MAP.west[1], 0, yP + 66, 56, false);
  const E = (from, to, fs, ts, hue, o = {}) => edges.push({ from, to, fs, ts, color: HUES[hue].edge, wide: true, ...o });
  for (let i = 1; i < 6; i++) E(`m${i}`, `m${i + 1}`, 'r', 'l', 'path');
  E('mB5', 'm1', 'r', 'l', 'memory', { to_: -33 }); E('mB3', 'm1', 'r', 'l', 'memory', { to_: 33 });
  E('mB2', 'm1', 'b', 't', 'memory', { label: 'ask memory first' });
  E('mB4', 'm2', 'b', 't', 'memory', { label: 'the cheapest model\nthat can do it' });
  E('mA3', 'm3', 'b', 't', 'know', { label: 'a small, right answer' });
  E('m5', 'mA1', 't', 'b', 'know', { label: 'changed code\nis read again' });
  E('m6', 'mB1', 't', 'b', 'memory', { label: 'what was solved' });
  E('mA1', 'mA2', 'l', 'r', 'know'); E('mA2', 'mA3', 'l', 'r', 'know');
  E('mA1', 'mA3', 't', 't', 'know', { fo: -100, to_: 100, via: [[cx(5) - 100, y + 152], [cx(3) + 100, y + 152]], label: 'the graph itself' });
  E('mB1', 'mB2', 't', 't', 'memory', { via: [[cx(6), y + 114], [cx(1), y + 114]], label: 'kept in the knowledge store' });
  E('mC', 'm1', 't', 'b', 'guard', { label: 'refuses what\nbreaks a rule' });
  E('mD', 'm2', 't', 'b', 'limit', { label: 'how many may\nstart now' });
  E('mE', 'm3', 't', 'b', 'context', { fo: -70, to_: -70, label: 'keeps every\nwindow small' });
  E('mF', 'm3', 't', 'b', 'recover', { to_: 120, via: [[cx(4), y + 616], [cx(3) + 120, y + 616]], label: 'restarts what is stuck' });
  E('m6', 'mG', 'b', 't', 'improve', { label: 'transcripts, timings,\nverdicts' });
  E('mG', 'mB3', 'b', 'l', 'improve', { dash: true, via: [[cx(6), y + 838], [x + 24, y + 838], [x + 24, yP + 94]], label: 'what was measured and researched comes back as records and better rules' });
  return H;
}

// ---------- how to read ----------
function placeKey(x, y) {
  const panel = { k: 'panel', x, y, w: COLW, h: 0 }; nodes.push(panel);
  text(x + 30, y + 22, 'HOW TO READ THIS', 32, { bold: true, color: '#0f172a' });
  const top = y + 82; let ends = [];
  let cy = top;
  for (const t of ['Start with the map on the left. Every box in it is one pipeline.',
    'Each pipeline is then drawn in full, under the same letter or number: a row of steps joined by arrows.',
    'Inside a step: one sentence on what it does, then the parts it is made of.',
    'The coloured line at the bottom of a step names the pipeline it feeds or uses.']) cy += text(x + 30, cy, t, 19, { w: 880 }) + 10;
  ends.push(cy);
  cy = top + text(x + 1010, top, 'THE DOT ON EVERY PART', 19, { bold: true, color: '#0f172a' }) + 10;
  for (const [k, t] of [['b', 'Built: it exists and has run, or passed its tests.'], ['d', 'Designed: worked out, not built yet.'], ['i', 'Idea: discussed, not designed yet.'], ['n', 'Tested once, no gain yet: one form, on one repository. Not a verdict.']]) {
    nodes.push({ k: 'dot', x: x + 1019, y: cy + 12, r: 8, color: STATUS[k] });
    cy += text(x + 1040, cy, t, 18, { w: 560 }) + 9;
  }
  ends.push(cy);
  const words = ['Token: a piece of a word. Models read, write and are metered in tokens.', 'Context window: everything the model reads on one call. It grows as a session goes on.',
    'Session: one run of a model with its own context window.', 'Helper: a short-lived agent that a session starts for one job.', 'Unit: one planned job for one session.',
    'Worktree: a separate copy of the repository on its own branch.', 'Hook: a script the app runs before a tool call. It can refuse the call.',
    'Compaction: the app replaces a full window by a summary of it.', 'The check: the full test suite a change must pass before it lands.', 'Commit: one saved change in the history of the repository.'];
  cy = top + text(x + 1710, top, 'WORDS', 19, { bold: true, color: '#0f172a' }) + 10;
  const start = cy;
  words.slice(0, 5).forEach((t) => { cy += text(x + 1710, cy, t, 17, { w: 740 }) + 7; }); ends.push(cy);
  cy = start; words.slice(5).forEach((t) => { cy += text(x + 2510, cy, t, 17, { w: 740 }) + 7; }); ends.push(cy);
  panel.h = Math.max(...ends) + 20 - y;
  return panel.h;
}

// ---------- left column ----------
let ly = 44;
ly += text(X0, ly, 'THE HARNESS: THE WHOLE PIPELINE', 76, { bold: true, color: '#0f172a' }) + 10;
ly += text(X0, ly, 'A harness is everything around the AI model. It turns one request into a checked, merged change, while spending as few tokens and as little time as it can. This is the pipeline as it is meant to work when every part works. The dot on each part says how far that part is today.', 26, { w: COLW }) + 30;
ly += placeMap(X0, ly) + SGAP;
ly = section('THE PATH OF ONE PIECE OF WORK', 'Six stages, read left to right. Inside a stage, the steps run top to bottom.', X0, ly, (y) => y + placePath(X0, y)) + SGAP;
ly = section('WHAT KEEPS IT IN BOUNDS', 'Four pipelines that run beside the path: they check each step, limit how much runs, keep each session small, and bring failed work back.', X0, ly, (y) => {
  y += laneRow(['C'], X0, y) + LGAP;
  y += laneRow(['D', 'E'], X0, y) + LGAP;
  y += laneRow(['F'], X0, y);
  return y;
});

// ---------- right column ----------
let ry = 44;
ry += placeKey(X1, ry) + SGAP;
ry = section('KNOWLEDGE OF THE CODE', 'Three pipelines in a chain: the first builds a map of the code, the second learns from it, the third answers questions with it.', X1, ry, (y) => {
  y += laneRow(['A1'], X1, y) + LGAP;
  y += laneRow(['A2'], X1, y) + LGAP;
  y += laneRow(['A3'], X1, y);
  hand('A1', 'A1-4', 'A2', 'A2-1', 'the graph, as training data');
  hand('A2', 'A2-5', 'A3', 'A3-4', 'link scores');
  const b = byId(), xr = X1 + COLW - 150;
  edges.push({ from: 'A1', to: 'A3', fs: 'r', ts: 'r', via: [[xr, b.A1.y + b.A1.h / 2], [xr, b.A3.y + b.A3.h / 2]], color: HUES.know.edge, wide: true, label: 'the graph,\nwalked directly' });
  return y;
}) + SGAP;
ry = section('MEMORY', 'What earlier sessions learned, kept so that nobody solves the same problem twice.', X1, ry, (y) => {
  y += laneRow(['B1'], X1, y) + LGAP;
  y += laneRow(['B2'], X1, y) + LGAP;
  hand('B1', 'B1-5', 'B2', 'B2-2', 'the knowledge store');
  y += laneRow(['B3', 'B5'], X1, y) + LGAP;
  y += laneRow(['B4'], X1, y);
  return y;
}) + SGAP;
ry = section('HOW IT GETS BETTER', 'One pipeline that turns what was measured into better rules.', X1, ry, (y) => y + laneRow(['G'], X1, y));

nodes.push({ k: 'edges' });
const H = Math.ceil(Math.max(ly, ry) + 50);
const parts = nodes.filter((n) => n.k === 'card').flatMap((c) => (c.items.length ? c.items.map((i) => i[1]) : [c.status]));
export const stats = { left: Math.round(ly), right: Math.round(ry), steps: nodes.filter((n) => n.k === 'card').length, pipelines: nodes.filter((n) => n.k === 'lane').length,
  parts: parts.length, b: parts.filter((s) => s === 'b').length, d: parts.filter((s) => s === 'd').length, i: parts.filter((s) => s === 'i').length, n: parts.filter((s) => s === 'n').length };
export const scene = { W, H, nodes, edges, problems };
export const mapRegion = (() => { const p = nodes.find((n) => n.k === 'panel'); return [p.x - 20, p.y - 20, p.w + 40, p.h + 40]; })();
