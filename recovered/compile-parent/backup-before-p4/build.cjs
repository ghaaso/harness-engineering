// Assembles the harness compile into one HTML file of A4 pages and (with --render) prints the PDF.
// Usage: node build.cjs [--render] [--pages=1-5] [--noshots]
'use strict';
const fs = require('fs'), path = require('path'), cp = require('child_process');
const C = require('./charts.cjs');
const F = require('./figures.cjs');
const NAR = require('./narrative.cjs');
const { cover, contents, howToRead, shortVersion } = require('./front.cjs');
const { part1 } = require('./part1.cjs');
const { part2 } = require('./part2.cjs');
const { part3 } = require('./part3.cjs');
const { part4 } = require('./part4.cjs');
const { glossary, sources } = require('./back.cjs');

const ROOT = path.resolve(__dirname, '..');
const DATA = path.join(ROOT, 'data');
const OUT = path.join(ROOT, 'out');
fs.mkdirSync(OUT, { recursive: true });
const load = f => JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8'));

const cat = load('catalogue.json');       // { themes: [...] }
const reg = load('register.json');        // { families: [{id,title}], bottlenecks: [...] }
const gl = load('glossary.json');         // { terms: [...] }
const work = load('packages.json');       // { packages, decisions, lead, decLead, mapShows }
const src = load('sources.json');         // { sources: [[name, path, date, what]], note }

const FAM = {}; reg.families.forEach(f => { FAM[f.id] = f.title; });
const regRows = reg.bottlenecks.map(b => Object.assign({}, b, { familyTitle: FAM[b.family] || b.family }));

// Each package card lists the register ids it answers and counts the ideas it carries, from the data.
const MATN = ['set aside', 'proposed', 'designed', 'built', 'tested', 'in use'];
work.packages.forEach(p => {
  const ids = reg.bottlenecks.filter(b => b.wp === p.id).map(b => '`' + b.id + '`');
  p.bottlenecks = ids.length ? `${ids.length} in the register: ${ids.join(', ')}.` : 'None of its own; it serves the other packages.';
  const ideas = [].concat(...cat.themes.map(t => t.ideas)).filter(i => i.wp === p.id);
  const m = [0, 0, 0, 0, 0, 0]; ideas.forEach(i => { m[i.maturity] += 1; });
  const parts = [5, 4, 3, 2, 1, 0].filter(k => m[k]).map(k => `${m[k]} ${MATN[k]}`);
  p.ideas = `${ideas.length} ideas: ${parts.join(', ')}. Part 3 tags each one ${p.id}.`;
});

// Register at a glance: bottlenecks per family, split by state.
function regGlance() {
  const states = ['open', 'partly closed', 'closed'];
  const rows = reg.families.map(f => {
    const bs = reg.bottlenecks.filter(b => b.family === f.id);
    return { label: f.title, counts: states.map(s => bs.filter(b => (b.stateKey || 'open') === s).length) };
  }).filter(r => r.counts.some(Boolean));
  const W = 672, labW = 250, barH = 16, rowH = 25, top = 4;
  const max = Math.max(...rows.map(r => r.counts.reduce((a, v) => a + v, 0)));
  const plotW = W - labW - 40;
  const cols = [C.CAT[0], '#86b6ef', '#c3c2b7'];
  let b = '';
  rows.forEach((r, i) => {
    const y = top + i * rowH; let x = labW;
    b += C.text(0, y + 12, r.label, { fs: 10.2 });
    r.counts.forEach((v, k) => {
      if (!v) return;
      const w = (v / max) * plotW; const last = r.counts.slice(k + 1).every(q => !q);
      const dw = Math.max(1, w - (last ? 0 : 2));
      b += last ? C.hbar(x, y, dw, barH, cols[k]) : `<rect x="${x}" y="${y}" width="${dw}" height="${barH}" fill="${cols[k]}"/>`;
      if (C.tw(String(v), 9.5) + 6 < dw) b += C.text(x + dw / 2, y + 12, v, { fs: 9.5, anchor: 'middle', weight: 600, fill: k === 0 ? '#ffffff' : C.INK });
      x += w;
    });
    b += C.text(x + 6, y + 12, r.counts.reduce((a, v) => a + v, 0), { fs: 10.2, weight: 600 });
  });
  const leg = `<div class="legend"><span><i style="background:${cols[0]}"></i>Open</span><span><i style="background:${cols[1]}"></i>Partly closed</span><span><i style="background:${cols[2]}"></i>Closed</span></div>`;
  return leg + C.svg(W, top + rows.length * rowH - 6, b, 'Bottlenecks per family by state');
}

// The 21 clinic bottlenecks by v2 phase, coloured by class.
function clinicGrid() {
  const list = reg.clinic21 || [];
  if (!list.length) return '';
  const phases = [1, 2, 3, 4];
  const titles = { 1: 'Phase 1 · Machine', 2: 'Phase 2 · The check', 3: 'Phase 3 · Gate and review', 4: 'Phase 4 · First use' };
  const clsCol = { build: C.CAT[0], decide: C.CAT[1], diagnose: C.CAT[2], trial: C.CAT[3] };
  const W = 672, colW = 162, gap = 8, chipH = 30, top = 18;
  let b = '';
  phases.forEach((p, ci) => {
    const x = ci * (colW + gap);
    b += C.text(x, 10, titles[p], { fs: 9.6, weight: 600, fill: C.INK2 });
    list.filter(z => z.phase === p).forEach((z, ri) => {
      const y = top + ri * (chipH + 5);
      b += C.rrect(x, y, colW, chipH, 5, '#ffffff', C.AXIS);
      b += C.rrect(x, y, 5, chipH, 2, clsCol[z.cls] || C.AXIS);
      b += C.text(x + 11, y + 12.5, z.id, { fs: 9, weight: 700, fill: C.INK2 });
      C.wrap(z.name, 27).slice(0, 2).forEach((ln, k) => { b += C.text(x + 38, y + 12.5 + k * 11, ln, { fs: 9.2, weight: k === 0 ? 600 : 400 }); });
    });
  });
  const rows = Math.max(...phases.map(p => list.filter(z => z.phase === p).length));
  const leg = `<div class="legend"><span><i style="background:${clsCol.build}"></i>Build</span><span><i style="background:${clsCol.decide}"></i>Decide</span><span><i style="background:${clsCol.diagnose}"></i>Diagnose</span><span><i style="background:${clsCol.trial}"></i>Trial</span></div>`;
  return leg + C.svg(W, top + rows * (chipH + 5), b, 'The 21 clinic bottlenecks by harness v2 phase and class');
}

// Ideas x bottleneck families: how many ideas in each theme answer each family.
function heat(themes) {
  const fams = reg.families.filter(f => themes.some(t => t.ideas.some(i => (i.families || []).includes(f.id))));
  const m = themes.map(t => fams.map(f => t.ideas.filter(i => (i.families || []).includes(f.id)).length));
  return { svg: C.heatmap(themes.map(t => `${t.code} · ${t.short || t.title}`), fams.map(f => f.short || f.title), m, { labW: 190, cellH: 21, colWrap: 10, top: 58, label: 'Ideas per theme by the bottleneck family they answer' }), fams };
}

const themes = cat.themes;
themes.forEach(t => { t.figures = []; });
const th = id => themes.find(t => t.id === id);
if (th('retrieval')) th('retrieval').figures.push(
  { svg: F.graphRecall(), caption: 'Source: the graph test’s held-out run (evidence/harness-bottlenecks/graph2/). Recall within an 8,000-token answer over 75 [M] held-out commits (July and August 2026); settings were frozen on 65 earlier commits.', howto: 'Each bar is the share of the files and definitions a real commit changed that a method put in front of the reader within 8,000 tokens. **Longer = found more.**', shows: 'The typed store found the most [M]. The three engines tried (SQLite, LadybugDB and the DuckDB graph layer) gave identical answers on 770 of 770 [M] tasks, so the engine is a free choice.' },
  { svg: F.graphDiff(), caption: 'Differences in recall with 95 % intervals from resampling the commits. An interval that stays right of zero is a clear gain.', howto: 'Each dot is a difference in recall; **the line through it is the range the true difference most likely sits in.**', shows: 'Over all 75 commits the typed store beats both search and the changed-together floor, and the gain sits in the mobile app. Outside the mobile app the differences are too small to call, and the mobile app made up 36 % of held-out tasks against 17 % in tuning [M]. No agent used the store in this run; that is the next test.' });
if (th('memory')) th('memory').figures.push(
  { svg: `<div class="legend"><span><i style="background:${C.CAT[0]}"></i>All-good setting</span><span><i style="background:#86b6ef"></i>Middle values</span></div>` + F.libraryFunnel(), caption: 'Source: LIBRARY-PATHWAYS-2026-11.md §2, last period. Model outputs from guessed inputs [G]; the 59 [M] real cases show where steps break, not how often.', howto: 'Start with 100 pieces of work the cheap model would get wrong on its own. **Each bar is how many are still on track after that step.**', shows: 'With every input at its good end the library rescues about 32 [G] of the 100; at middle values only 4.8 [G] are still on track after the first two steps. That tells us where to build first: make sure entries exist and get looked up.' });

const counts = { ideas: themes.reduce((a, t) => a + t.ideas.length, 0), themes: themes.length, bottlenecks: reg.bottlenecks.length, packages: work.packages.length };
const hm = heat(themes);
const ctx = {
  counts, n: NAR.n, v2: NAR.v2, found: NAR.found, short: NAR.short, rules: NAR.rules,
  themes, reg: regRows, gloss: gl.terms, packages: work.packages, decisions: work.decisions,
  p4lead: work.lead, decLead: work.decLead, mapShows: work.mapShows, before: work.before,
  sources: src.sources, sourcesNote: src.note,
  coverNote: cat.coverNote || '', howMade: cat.howMade || '',
  regGlanceSvg: regGlance(), regGlanceCap: 'Source: the register on the following pages.', regGlanceHow: 'One bar per family of bottleneck, split by state. **The number at the end is the family’s total.**', regGlanceShows: reg.glanceShows || '',
  clinicGridSvg: clinicGrid(),
  heatSvg: hm.svg, heatCap: 'An idea counts once for every family it answers, so rows add up to more than the theme’s idea count.', heatHow: 'Rows are themes, columns are bottleneck families. **Darker = more ideas aimed at that family.**', heatShows: cat.heatShows || '',
};

const css = fs.readFileSync(path.join(__dirname, 'styles.css'), 'utf8');
const pag = fs.readFileSync(path.join(__dirname, 'paginate.js'), 'utf8');
const body = [cover(ctx), contents(ctx), howToRead(ctx), shortVersion(ctx), part1(ctx), part2(ctx), part3(ctx), part4(ctx), glossary(ctx), sources(ctx)].join('\n');
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Our AI build harness: the ideas, the bottlenecks and the work</title><meta name="author" content="Muhammad Bilal"><style>${css}</style></head>
<body data-short="Our AI build harness" data-foot="13 November 2026"><div id="flow">${body}</div><div id="pages"></div><script>${pag}</script></body></html>`;
const outHtml = path.join(OUT, 'harness-compile.html');
fs.writeFileSync(outHtml, html);
console.log('wrote', outHtml, Math.round(html.length / 1024) + ' KB', JSON.stringify(counts));

if (process.argv.includes('--render')) {
  const extra = process.argv.filter(a => a.startsWith('--pages=') || a === '--noshots' || a.startsWith('--scale='));
  const r = cp.spawnSync(process.execPath, [path.join(__dirname, 'render.cjs'), outHtml, path.join(OUT, 'harness-compile.pdf'), path.join(OUT, 'shots'), ...extra], { stdio: 'inherit' });
  process.exit(r.status);
}
