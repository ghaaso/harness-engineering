// The fixed figures of the compile: architecture, window fill, levers, measured wins, timeline,
// graph test, library funnel. Data are copied from the cited documents with their tags.
'use strict';
const C = require('./charts.cjs');
const { svg, text, rrect, CAT, INK, INK2, MUTED, GRID, AXIS, esc } = C;

function arrow(x1, y1, x2, y2, o) {
  o = o || {};
  const col = o.color || INK2;
  const ang = Math.atan2(y2 - y1, x2 - x1), L = 6;
  const ax = x2 - L * Math.cos(ang - 0.45), ay = y2 - L * Math.sin(ang - 0.45);
  const bx = x2 - L * Math.cos(ang + 0.45), by = y2 - L * Math.sin(ang + 0.45);
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${col}" stroke-width="1.3"/><path d="M${x2},${y2} L${ax},${ay} L${bx},${by} Z" fill="${col}"/>`;
}
function pathArrow(d, x2, y2, ang, color) {
  const L = 6, col = color || INK2;
  const ax = x2 - L * Math.cos(ang - 0.45), ay = y2 - L * Math.sin(ang - 0.45);
  const bx = x2 - L * Math.cos(ang + 0.45), by = y2 - L * Math.sin(ang + 0.45);
  return `<path d="${d}" fill="none" stroke="${col}" stroke-width="1.3"/><path d="M${x2},${y2} L${ax},${ay} L${bx},${by} Z" fill="${col}"/>`;
}
function box(x, y, w, h, title, job, o) {
  o = o || {};
  let b = rrect(x, y, w, h, 6, o.fill || '#ffffff', o.stroke || AXIS);
  b += text(x + 8, y + 16, title, { fs: 11, weight: 600 });
  (job || []).forEach((ln, i) => { b += text(x + 8, y + 30 + i * 11.5, ln, { fs: 9, fill: INK2 }); });
  return b;
}
function badge(x, y, s) {
  const w = C.tw(s, 8.6, 0.56) + 10;
  return rrect(x, y, w, 15, 7.5, '#eef4fc') + text(x + 5, y + 11, s, { fs: 8.6, fill: '#1c5cab', weight: 600 });
}

function architecture() {
  const W = 672;
  let b = '';
  // Governor
  b += box(150, 0, 250, 44, 'Governor', ['Keeps the token window from stopping everything:', 'slows lanes before the limit does']);
  // Main row
  const y = 82, h = 66;
  b += box(0, y, 120, h, 'Planner', ['Before work starts:', 'which slices can run', 'together; how many lanes']);
  b += box(150, y, 112, h, 'Scheduler', ['Turns the plan into', 'running sessions; brings', 'them back after a stop']);
  // lanes as a stack
  b += rrect(298, y + 8, 116, h, 6, '#fafaf8', AXIS) + rrect(294, y + 4, 116, h, 6, '#fcfcfb', AXIS);
  b += box(290, y, 116, h, 'Lanes', ['Sessions that build', 'one slice each; ask', 'first; results on disk']);
  b += box(436, y, 106, h, 'Gate', ['Decides whether a', 'slice is good, by tests', 'it runs itself']);
  b += box(566, y, 106, h, 'Merge queue', ['The one serial step,', 'kept short because', 'it is a script']);
  // Library
  b += box(0, 200, 542, 48, 'Library  (the harness’s memory)', ['What is true now · what a change touches · solved problems · measured rates. Written by the tools at the moment', 'something becomes true; asked, never pushed; an entry goes stale when its files change']);
  // Machine
  b += rrect(0, 268, W, 34, 6, '#f5f4f1', AXIS);
  b += text(10, 283, 'The machine', { fs: 11, weight: 600 });
  b += text(10, 296, 'Power, restart, the off-machine copy and an always-on logger. Everything above stands on it.', { fs: 9, fill: INK2 });
  // Arrows on the main row
  b += arrow(120, y + 33, 148, y + 33);
  b += arrow(262, y + 33, 288, y + 33);
  b += arrow(406, y + 33, 434, y + 33);
  b += arrow(542, y + 33, 564, y + 33);
  // Gate sends work back (fix spiral)
  b += pathArrow(`M${489},${y + h} C${489},${y + h + 26} ${352},${y + h + 26} ${352},${y + h + 4}`, 352, y + h + 4, -Math.PI / 2);
  b += text(420, y + h + 34, 'sent back for fixes', { fs: 8.6, fill: INK2, anchor: 'middle' });
  // Governor controls
  b += arrow(206, 44, 206, y - 2);
  b += arrow(345, 44, 345, y - 2);
  b += text(212, 64, 'pace', { fs: 8.6, fill: INK2 });
  b += text(351, 64, 'pace', { fs: 8.6, fill: INK2 });
  // Library flows
  b += arrow(60, 200, 60, y + h + 2);
  b += text(66, 188, 'rates, footprints', { fs: 8.6, fill: INK2 });
  b += arrow(330, 200, 330, y + h + 10);
  b += text(250, 188, 'answers when asked', { fs: 8.6, fill: INK2 });
  b += arrow(470, y + h + 2, 470, 198);
  b += arrow(600, y + h + 2, 600, 224);
  b += `<line x1="600" y1="224" x2="544" y2="224" stroke="${INK2}" stroke-width="1.3"/>`;
  b += text(478, 188, 'verdicts, rates', { fs: 8.6, fill: INK2 });
  // Limits and loops as badges
  b += badge(410, 6, 'B3 limit stop · R2 context growth');
  b += badge(0, y - 22, 'B5 lanes at the knee');
  b += badge(150, y - 22, 'R4 pile-up');
  b += badge(436, y - 22, 'B1 check capacity · R1 fix spiral');
  b += badge(566, y + h + 6, 'B2 the serial gate');
  b += badge(330, 250, 'R3 compounds · B4 staleness');
  return svg(W, 304, b, 'Harness v2 architecture: planner, scheduler, governor, lanes, gate, merge queue, library, machine');
}

function windowFill() {
  const parts = [{ name: 'Fixed start of every call (system prompt, tool and connector schemas, CLAUDE.md, briefs)' }, { name: 'The model’s own earlier output carried forward' }, { name: 'Content fetched by reading and searching' }, { name: 'Compaction summaries read again' }, { name: 'Other (shell output, messages, unclassified)' }];
  const rows = [
    { label: 'FixFlow', sub: '2.13 B tokens', values: [47, 15, 23, 2, 13] },
    { label: 'Clinic testbed', sub: '5.23 B tokens', values: [19, 31, 27, 11, 12] },
    { label: 'Both', sub: '7.35 B tokens', values: [27, 26, 26, 8, 13] },
  ];
  return { svg: C.segmented(rows, parts, { labW: 104, label: 'What the context windows hold' }), parts };
}

// Two series per row (FixFlow, clinic), share of each project's tokens. Exposures overlap; they are not savings.
function grouped(items, series, o) {
  o = o || {};
  const W = 672, labW = o.labW || 300, top = 20, barH = 11, gap = 2, rowH = o.rowH || 50, plotW = W - labW - 56;
  let b = '';
  [0, 25, 50, 75, 100].forEach(t => {
    const x = labW + (t / 100) * plotW;
    b += `<line x1="${x}" y1="${top - 4}" x2="${x}" y2="${top + items.length * rowH - 14}" stroke="${t === 0 ? AXIS : GRID}" stroke-width="1"/>`;
    b += text(x, top - 8, t + '%', { fs: 9, fill: MUTED, anchor: 'middle' });
  });
  items.forEach((it, i) => {
    const y = top + i * rowH;
    C.wrap(it.label, o.wrap || 46).slice(0, 2).forEach((ln, k) => { b += text(0, y + 10 + k * 12.5, ln, { fs: 10.2, weight: 600 }); });
    const nl = Math.min(2, C.wrap(it.label, o.wrap || 46).length);
    C.wrap(it.sub || '', o.subWrap || 56).slice(0, 2).forEach((ln, k) => { b += text(0, y + 10 + nl * 12.5 + k * 11, ln, { fs: 9, fill: INK2 }); });
    it.values.forEach((v, j) => {
      const yy = y + 2 + j * (barH + gap);
      const w = (v / 100) * plotW;
      b += C.hbar(labW, yy, w, barH, CAT[j]);
      b += text(labW + w + 5, yy + 9.5, v + '%', { fs: 9.6, weight: 600 });
    });
    if (it.tag) b += text(labW + plotW + 34, y + 12, '[' + it.tag + ']', { fs: 8.5, fill: MUTED });
  });
  return svg(W, top + items.length * rowH - 10, b, o.label);
}
function levers() {
  const items = [
    { label: 'Cache-read tokens in calls past a 200k window', sub: 'Lever 1: cap the orchestrator window at 150–200k', values: [39, 74], tag: 'M' },
    { label: 'The fixed start every call re-reads', sub: 'Lever 2: strip the agent prefix (about 60k tokens each)', values: [47, 19], tag: 'E' },
    { label: 'Tokens in calls that only read or search', sub: 'Lever 3: batch two lookups per command (about a third fewer calls, E)', values: [55, 41], tag: 'M' },
    { label: 'The model’s own earlier output, carried forward', sub: 'Lever 4: write big files by script; compact after heavy writing', values: [15, 31], tag: 'E' },
  ];
  return grouped(items, ['FixFlow', 'Clinic testbed'], { rowH: 62, label: 'Share of each project’s tokens that each lever can act on' });
}

function wins() {
  const items = [
    { label: 'The test check, run in parallel', detail: '855 s → 284 s (mean of 12 runs)', before: 855.2, after: 283.8, factor: '3.0× faster', note: 'in use in the testbed [M]' },
    { label: 'The check in a Linux container', detail: '367 s native → 230 s', before: 367.2, after: 230.1, factor: '1.6× faster', note: 'built, not yet the gate [M]' },
    { label: 'Test start-up, after tracing', detail: '43 s → 11.5 s (16-test run)', before: 43, after: 11.5, factor: '3.7× faster', note: 'in use [M]' },
    { label: 'A heavy page at 75,016 documents', detail: '9–13 s → 0.1–0.5 s', before: 11, after: 0.3, factor: 'about 37× faster', note: 'at the midpoints [E]; in use' },
    { label: 'Database queries on that page', detail: '29,346 → 28', before: 29346, after: 28, factor: '1,000× fewer', note: 'in use [M]' },
  ];
  return C.beforeAfter(items.map(i => Object.assign({}, i, { note: i.note.replace(/ \[([MEGSTI])\]/g, ' ($1)') })), { label: 'Measured wins already in the clinic testbed' });
}

function timeline() {
  const ev = [
    { date: '2026-10-31', label: 'Orchestration design', sub: 'roles, model tiers, gates', lane: 0 },
    { date: '2026-11-01', label: 'Harness review; gates G1, G2', sub: 'what carries over from the clinic', lane: 1 },
    { date: '2026-11-02', label: 'Knowledge-store design', sub: 'PR #183, opened 2 Nov', lane: 2 },
    { date: '2026-11-04', label: 'BAML and Horthy sweeps; skills', sub: 'PR #184, #186, #185', lane: 0 },
    { date: '2026-11-09', label: 'Horthy addendum', sub: 'PR #186, section 4', lane: 1, anchor: 'end' },
    { date: '2026-11-11', label: 'Bottleneck compile; harness v2', sub: 'B01–B21 and the design', lane: 2, anchor: 'end' },
    { date: '2026-11-12', label: 'Token measurement', sub: 'every call counted', lane: 0, anchor: 'end' },
    { date: '2026-11-13', label: 'Library map; graph test', sub: 'and FixFlow’s lanes', lane: 1, anchor: 'end' },
  ];
  return C.timeline(ev, { from: '2026-10-30', to: '2026-11-14', label: 'Where the ideas came from, by date' });
}

function graphRecall() {
  const items = [
    { label: 'Typed code store', sub: 'SQLite = LadybugDB = DuckDB: identical answers', value: 70.0, show: '0.700', tag: 'M' },
    { label: 'Files that changed together before', sub: 'the co-change floor', value: 63.8, show: '0.638', tag: 'M', color: '#9ec5f4' },
    { label: 'Scripted search', sub: 'a fixed search script, not an agent', value: 62.5, show: '0.625', tag: 'M', color: '#9ec5f4' },
    { label: 'Same folder', sub: 'the directory floor', value: 54.9, show: '0.549', tag: 'M', color: '#9ec5f4' },
  ];
  return C.hbars(items, { labW: 250, max: 100, ticks: [0, 25, 50, 75, 100], rowH: 34, label: 'Recall of the files and definitions that really changed, held-out commits' });
}
function graphDiff() {
  const items = [
    { label: 'Typed store vs scripted search', sub: 'all 75 held-out commits', value: 0.076, lo: 0.036, hi: 0.118 },
    { label: 'Typed store vs changed-together', sub: 'all 75 held-out commits', value: 0.063, lo: 0.019, hi: 0.110 },
    { label: 'Typed store vs search, mobile-app seeds', sub: '31 commits: where the gain sits', value: 0.151, lo: 0.097, hi: 0.207 },
    { label: 'Typed store vs search, outside mobile', sub: '48 commits: the rest of the repo', value: 0.024, lo: -0.023, hi: 0.075 },
    { label: 'Typed store vs changed-together, outside mobile', sub: '48 commits', value: 0.001, lo: -0.051, hi: 0.056 },
    { label: 'Community prior added to the ranking', sub: 'personalised PageRank with and without it', value: 0.015, lo: -0.010, hi: 0.042 },
  ];
  return C.diffChart(items, { min: -0.06, max: 0.22, ticks: [-0.05, 0, 0.05, 0.10, 0.15, 0.20], labW: 250, label: 'Differences in recall with 95 % intervals' });
}

function libraryFunnel() {
  const steps = [['An entry exists for it', 13.1, 92.0], ['A lookup is triggered', 4.8, 67.5], ['The right entry comes back', 2.3, 59.7], ['The entry is good', 1.3, 55.7], ['It passes the screen', 1.1, 55.0], ['It is in the window when needed', 0.97, 53.9], ['The cheap model then gets it right', 0.35, 31.7]];
  const W = 672, labW = 230, rowH = 30, top = 22, plotW = W - labW - 90;
  let b = '';
  [0, 25, 50, 75, 100].forEach(t => { const x = labW + (t / 100) * plotW; b += `<line x1="${x}" y1="${top - 4}" x2="${x}" y2="${top + steps.length * rowH - 6}" stroke="${t === 0 ? AXIS : GRID}"/>`; b += text(x, top - 8, String(t), { fs: 9, fill: MUTED, anchor: 'middle' }); });
  steps.forEach((s, i) => {
    const y = top + i * rowH;
    b += text(0, y + 12, s[0], { fs: 10, weight: i === steps.length - 1 ? 600 : 400 });
    b += C.hbar(labW, y + 1, (s[2] / 100) * plotW, 10, CAT[0]);
    b += C.hbar(labW, y + 13, Math.max(1.5, (s[1] / 100) * plotW), 10, '#86b6ef');
    b += text(labW + (s[2] / 100) * plotW + 6, y + 10, String(s[2]), { fs: 9.6, weight: 600 });
    b += text(labW + Math.max(1.5, (s[1] / 100) * plotW) + 6, y + 22, String(s[1]), { fs: 9.6, fill: INK2 });
  });
  return svg(W, top + steps.length * rowH, b, 'Library funnel: of 100 pieces of work the cheap model would get wrong alone');
}

module.exports = { architecture, windowFill, levers, wins, timeline, graphRecall, graphDiff, libraryFunnel };
