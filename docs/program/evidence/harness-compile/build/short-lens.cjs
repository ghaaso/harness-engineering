// Part 2 of the short edition under the owner's seven-metric lens (14 November 2026):
// the metrics and where we stand, which bottleneck limits which metric, then one block per bottleneck
// with what we measured and the ideas against it. Text comes from data/short.json (metrics, blocks, p2);
// counts come from data/metrics/blocks.json and classified.json through ctx.lens.
'use strict';
const { P, H, md, esc, meter, figure, legend, table } = require('./lib.cjs');
const C = require('./charts.cjs');
const F = require('./figures.cjs');

const MSHORT = { throughput: 'Throughput', efficiency: 'Efficiency', token_count: 'Token count', token_cost: 'Token cost', time: 'Time taken', quality: 'Quality', hallucination: 'Hallucinations' };
const MCOL = { throughput: 'Through- put', efficiency: 'Effi- ciency', token_count: 'Token count', token_cost: 'Token cost', time: 'Time taken', quality: 'Quality', hallucination: 'Halluci- nations' };
const chip = (m, on) => `<span class="mchip${on ? ' on' : ''}">${esc(MSHORT[m] || m)}</span>`;
const STEPS = [150, 250, 350, 450, 550, 650];
const stepOf = (v, max) => STEPS[Math.min(STEPS.length - 1, Math.floor((v / max) * STEPS.length * 0.999))];
const STATE_COLS = [C.CAT[0], '#86b6ef', '#c3c2b7'];

// Rows are the bottleneck blocks, columns the seven metrics; a cell counts the register rows of that block
// that limit that metric. At the right: the block's register rows split by state (the register at a glance,
// re-cut by block) and its idea count.
function metricMatrix(ctx, S) {
  const L = ctx.lens, blocks = L.blocks, cols = L.metrics;
  const byId = Object.fromEntries(ctx.reg.map(b => [b.id, b]));
  const W = 672, labW = 198, top = 32, cellH = 22, barW = 96, totW = 24, ideaW = 40, gapN = 12;
  const gridW = W - labW - gapN - barW - totW - ideaW, cellW = gridW / cols.length;
  const max = Math.max(1, ...blocks.map(b => Math.max(...cols.map(m => b.hit[m].bottlenecks))));
  const maxB = Math.max(1, ...blocks.map(b => b.bottlenecks.length));
  const head = (x, lines, anchor) => lines.forEach((ln, k, a) => { s += C.text(x, top - 8 - (a.length - 1 - k) * 10.5, ln, { fs: 9, anchor: anchor || 'middle', fill: C.INK2, weight: 600 }); });
  let s = '';
  cols.forEach((m, j) => head(labW + j * cellW + cellW / 2, MCOL[m].split(' ')));
  const xBar = labW + gridW + gapN, xIdea = xBar + barW + totW + ideaW / 2;
  head(xBar, ['Bottlenecks,', 'by state'], 'start');
  head(xIdea, ['Ideas']);
  blocks.forEach((b, i) => {
    const y = top + i * cellH, sb = (S.blocks || []).find(x => x.key === b.key) || {};
    s += C.text(0, y + cellH / 2 + 4, String(i + 1), { fs: 9.4, weight: 700, fill: '#1c5cab' });
    s += C.text(17, y + cellH / 2 + 4, sb.short || b.key, { fs: 9.8 });
    cols.forEach((m, j) => {
      const v = b.hit[m].bottlenecks, x = labW + j * cellW;
      if (!v) { s += C.rrect(x + 1, y + 1, cellW - 2, cellH - 2, 3, '#f5f4f1'); return; }
      const st = stepOf(v, max);
      s += C.rrect(x + 1, y + 1, cellW - 2, cellH - 2, 3, C.SEQ[st]);
      s += C.text(x + cellW / 2, y + cellH / 2 + 4, v, { fs: 9.8, anchor: 'middle', weight: 600, fill: st <= 250 ? C.INK : '#ffffff' });
    });
    const counts = ['open', 'partly closed', 'closed'].map(k => b.bottlenecks.filter(id => ((byId[id] || {}).stateKey || 'open') === k).length);
    let x = xBar;
    counts.forEach((v, k) => {
      if (!v) return;
      const w = (v / maxB) * barW, last = counts.slice(k + 1).every(q => !q), dw = Math.max(1, w - (last ? 0 : 1.5));
      s += last ? C.hbar(x, y + 5, dw, 12, STATE_COLS[k]) : `<rect x="${x}" y="${y + 5}" width="${dw}" height="12" fill="${STATE_COLS[k]}"/>`;
      x += w;
    });
    s += C.text(x + 5, y + cellH / 2 + 4, b.bottlenecks.length, { fs: 9.8, weight: 600 });
    s += C.text(xIdea, y + cellH / 2 + 4, b.ideas.length, { fs: 9.8, anchor: 'middle', fill: C.INK2 });
  });
  const leg = `<div class="legend"><span><i style="background:${STATE_COLS[0]}"></i>Open</span><span><i style="background:${STATE_COLS[1]}"></i>Partly closed</span><span><i style="background:${STATE_COLS[2]}"></i>Closed</span></div>`;
  return leg + C.svg(W, top + blocks.length * cellH + 2, s, 'Bottlenecks by block: the metric each limits, their state, and the ideas against them');
}

// Ideas per theme by the metric they move (an idea counts once for each metric it moves).
function themeMetricHeat(ctx) {
  const L = ctx.lens;
  const m = ctx.themes.map(t => L.metrics.map(k => t.ideas.filter(i => (L.cls[i.id] || { metrics: [] }).metrics.includes(k)).length));
  return C.heatmap(ctx.themes.map(t => `${t.code} · ${t.short || t.title}`), L.metrics.map(k => MSHORT[k]), m, { labW: 190, cellH: 21, colWrap: 9, top: 44, label: 'Ideas per theme by the metric they move' });
}

// The two metrics most of a set of ideas move (by main metric).
function topMetrics(ctx, ideas, n) {
  const L = ctx.lens, c = {};
  ideas.forEach(i => { const x = L.cls[i.id]; if (x && x.primary && x.primary !== 'none') c[x.primary] = (c[x.primary] || 0) + 1; });
  return Object.keys(c).sort((a, b) => c[b] - c[a] || L.metrics.indexOf(a) - L.metrics.indexOf(b)).slice(0, n || 2);
}
function packageMoves(ctx, id) {
  const ideas = []; ctx.themes.forEach(t => t.ideas.forEach(i => { if (i.wp === id) ideas.push(i); }));
  return topMetrics(ctx, ideas, 2);
}

// The twelve themes in one table: what each is about, how far its ideas have got, what they move, who carries them.
function themeTable(ctx, S, matStrip) {
  const byCode = Object.fromEntries((S.themes || []).map(s => [s.code, s]));
  const blockOf = {}; ctx.lens.blocks.forEach((b, i) => b.ideas.forEach(id => { (blockOf[id] = blockOf[id] || []).push(i + 1); }));
  const rows = ctx.themes.map(t => {
    const c = matStrip(t.ideas);
    const counts = [[5, 'in use'], [4, 'tested'], [3, 'built'], [2, 'designed'], [1, 'ideas'], [0, 'parked']].filter(([k]) => c[k]).map(([k, l]) => `${c[k]} ${l}`).join(' · ');
    const n = {}; t.ideas.forEach(i => (blockOf[i.id] || []).forEach(b => { n[b] = (n[b] || 0) + 1; }));
    const blocks = Object.keys(n).map(Number).sort((a, b) => n[b] - n[a] || a - b).slice(0, 3).sort((a, b) => a - b);
    const s = byCode[t.code] || {};
    return [`<span class="iid">${esc(t.code)}</span><span class="nm">${esc(t.title)}</span>`,
      `${md(s.line || '')}<span class="org">${t.ideas.length} ideas: ${counts}</span>`,
      `${topMetrics(ctx, t.ideas, 2).map(m => chip(m, true)).join('')}<span class="org">Bottlenecks ${blocks.join(', ')} · ${(t.packages || []).map(esc).join(', ')}</span>`];
  });
  return table([{ t: 'Theme', w: '40mm' }, { t: 'What it is about, and how far its ideas have got' }, { t: 'Moves most; where in Part 2; packages', w: '50mm' }], rows, { cls: 'cmp thm' });
}

// The split-and-merge figure, then what WP12's replay of 14 November found (S.p2.replay: a title, column heads and
// rows of text; S.p2.replayShows: its reading). Two blocks, so a table that misses the page moves alone.
function splitFigure(S) {
  const how = 'Each box is one session and the bar inside is how full its window is. **The dashed line is where a session splits.** Left: what happens today.';
  let h = figure(F.splitMerge(), S.p2.splitCap, how, S.p2.splitShows);
  const rp = S.p2.replay;
  if (!rp) return h;
  const cells = (r, tag) => r.map((c, i) => `<${tag}${i ? ' class="num"' : ''}>${md(c)}</${tag}>`).join('');
  h += `<figure class="keep rpf"><div class="rpt">${md(rp.title)}</div><table class="rp"><thead><tr>${cells(rp.cols, 'th')}</tr></thead><tbody>${rp.rows.map(r => `<tr>${cells(r, 'td')}</tr>`).join('')}</tbody></table>${S.p2.replayShows ? `<div class="shows">${md(S.p2.replayShows)}</div>` : ''}</figure>`;
  return h;
}

// Figures that belong to a block. Captions carry their sources as before.
function blockFigures(key, ctx, S, only) {
  // In the reference edition the token, test and check charts keep their own sections, so a block shows only the new diagram.
  if (only === 'new') return key === 'context' ? splitFigure(S) : '';
  const n = ctx.n, th = id => ctx.themes.find(t => t.id === id) || { figures: [] };
  const fromTheme = f => figure(f.svg, f.caption, f.howto, f.shows);
  let h = '';
  if (key === 'context') {
    h += splitFigure(S);
    const wf = F.windowFill();
    h += figure(legend(wf.parts.map((p, i) => ({ color: C.CAT[i], name: p.name }))) + wf.svg,
      'Source: TOKEN-BOTTLENECK-2026-11.md, “What the windows hold”. Estimated from how the context grew between calls, weighted by re-reads; 5–8 % stays unclassified. [E]',
      'Each bar is one project’s context tokens split by what they were. **Wider = more of the tokens.**',
      'FixFlow’s largest share (47 % [E]) is the **fixed start** every agent re-reads; the clinic’s largest (31 % [E]) is the model’s **own earlier output** carried forward. Content fetched by reading, which indexes and knowledge stores aim at, is about a quarter in both.');
    h += figure(legend([{ color: C.CAT[0], name: 'FixFlow' }, { color: C.CAT[1], name: 'Clinic testbed' }]) + F.levers(),
      'Source: TOKEN-BOTTLENECK-2026-11.md, “Levers, in order of size”. Lever 1 is a share of the cache-read tokens (the re-reads), the others of all context tokens. The shares overlap, so they do not add up.',
      'Four levers, each with the share of each project’s tokens it can act on. **Longer bar = more room to save.** This is exposure, not a promised saving.',
      S.p2.leversShows);
  }
  if (key === 'orientation') th('retrieval').figures.forEach(f => { h += fromTheme(f); });
  if (key === 'memory') th('memory').figures.forEach(f => { h += fromTheme(f); });
  if (key === 'checks') {
    h += figure(F.wins(), 'Sources: HARNESS-BOTTLENECKS-2026-11.md and its evidence folder (machine-facts.md); HARNESS-V2-DESIGN-2026-11.md. The page factor divides the midpoints of 9–13 s and 0.1–0.5 s, so it is an estimate: anywhere from about 18× to 130× [E].',
      'Each bar is the new time as a share of the old one. **Shorter bar = bigger win.** The factor on the right is old ÷ new.',
      `The clinic testbed ran ${n.clinicCommits} commits and ${n.clinicMerges} merges in eight working days on one PC [M]. Every one of these wins was built and timed there; all but the Linux check are in use.`);
  }
  if (key === 'local' && ctx.clinicGridSvg) h += figure(ctx.clinicGridSvg, 'Source: HARNESS-V2-DESIGN-2026-11.md §3. Class and phase as set by the compile of 11 November.', 'The 21 bottlenecks the clinic testbed gave us, placed by the harness v2 phase that answers them. **Each chip is one bottleneck; its colour is its class.**', S.p2.gridShows);
  return h;
}

function block(b, i, ctx, S, only) {
  const L = ctx.lens, lb = L.blocks.find(x => x.key === b.key) || { bottlenecks: [], ideas: [] };
  const ideaById = {}; ctx.themes.forEach(t => t.ideas.forEach(x => { ideaById[x.id] = x; }));
  const chips = (b.hits || []).map((x, k) => chip(x.metric, k < 2)).join('');
  let h = `<h3 class="blkh" id="blk-${esc(b.key)}"><span class="bn">${i + 1}</span><span>${md(b.title)}</span></h3>`;
  h += `<div class="blkm kwn"><span class="blkl">Limits</span>${chips}<span class="blkc">${lb.bottlenecks.length} register rows · ${lb.ideas.length} ideas${b.local ? ' · specific to our PC and plan' : ''}</span></div>`;
  h += P(`**What happens.** ${b.what}`, 'blkp');
  h += P(`**What we measured.** ${b.measured}${b.unmeasured ? ` **Not yet measured.** ${b.unmeasured}` : ''}`, 'blkp');
  const rows = (b.ideas || []).map(k => {
    const x = ideaById[k.id] || {};
    return `<tr><td class="kidl"><span class="iid">${esc(k.id)}</span>${x.maturity != null ? `<span class="kmt">${meter(x.maturity)}</span>` : ''}</td><td><b>${md(k.name)}.</b> ${md(k.result)}</td></tr>`;
  }).join('');
  // The ideas sit right under the text; the block's figures follow them.
  if (rows) h += `<table class="kid bid"><thead><tr><th colspan="2">Ideas against bottleneck ${i + 1}, and how far each has got</th></tr></thead><tbody>${rows}</tbody></table>`;
  h += blockFigures(b.key, ctx, S, only);
  return h;
}

function part2Lens(ctx, S, partHead) {
  return partHead('Part 2 · The bottlenecks', 'Part 2', 'The bottlenecks', 'p2', S.p2.lead) + lensSections(ctx, S);
}

// The scoreboard, the grid and the blocks. only = 'new' leaves out the charts the reference edition prints elsewhere.
function lensSections(ctx, S, only) {
  let h = '';
  h += H(2, 'The seven metrics, and where we stand', 'p2-metrics');
  h += P(S.p2.metricsLead, 'kwn');
  h += table([{ t: 'Metric', w: '37mm' }, { t: 'Where we stand' }, { t: 'What limits it most', w: '44mm' }, { t: 'Not yet measured', w: '38mm' }],
    (S.metrics || []).map(m => [`<span class="nm">${esc(m.name)}</span><span class="org" style="margin-top:0">${md(m.means)}</span>`, md(m.stand), md(m.limiter), md(m.gap)]), { cls: 'cmp msc' });
  h += H(2, 'Which bottleneck limits which metric', 'p2-matrix');
  h += P(S.p2.matrixLead, 'kwn');
  h += figure(metricMatrix(ctx, S), S.p2.matrixCap, `Rows are the ${ctx.lens.blocks.length} bottlenecks of this part, columns the seven metrics. **Each cell counts the recorded bottlenecks of that row that limit that metric; darker = more.** The bar shows how many of the row’s bottlenecks are open, partly closed or closed.`, S.p2.matrixShows);
  h += H(2, 'The bottlenecks, one by one', 'p2-blocks');
  h += P(S.p2.blocksLead, 'kwn');
  (S.blocks || []).forEach((b, i) => { h += block(b, i, ctx, S, only); });
  return h;
}

// One line for a record: the metrics it moves, the main one first.
function movesLine(ctx, id) {
  const c = ctx.lens && ctx.lens.cls[id];
  if (!c || !c.metrics || !c.metrics.length) return '';
  return c.metrics.map(m => MSHORT[m].toLowerCase()).join(' · ');
}

module.exports = { part2Lens, lensSections, movesLine, themeMetricHeat, themeTable, packageMoves, topMetrics, metricMatrix, MSHORT, chip };
