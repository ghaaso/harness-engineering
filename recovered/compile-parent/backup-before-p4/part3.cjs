// Part 3: the ideas. An overview, then one section per theme with every idea.
'use strict';
const { P, H, UL, BOX, md, esc, meter, figure, legend, table, MAT_NAMES } = require('./lib.cjs');
const C = require('./charts.cjs');
const F = require('./figures.cjs');

function matStrip(ideas) {
  const counts = [0, 0, 0, 0, 0, 0];
  ideas.forEach(i => { counts[i.maturity] += 1; });
  return counts;
}

function overview(ctx) {
  let h = '';
  h += `<div class="sec-start" data-part="Part 3 · The ideas"><div class="partlabel">Part 3</div><h1 id="p3">The ideas</h1><div class="rule"></div>
  ${P(`Every harness idea we have had, whatever its results so far: ${ctx.counts.ideas} ideas in ${ctx.counts.themes} themes. Each one says the problem it is meant to solve, how it works, where it stands and what comes next. Ideas that were tried and taught us something, or that we parked, stay in the list with what we learned, so nobody has to rediscover them.`, 'lead')}</div>`;
  h += H(2, 'All ideas at a glance', 'p3-overview');
  h += table([{ t: 'Code', w: '14mm' }, { t: 'Theme', w: '58mm' }, { t: 'The kind of problem it covers' }, { t: 'Ideas', w: '12mm', num: true }],
    ctx.themes.map(t => [`<span class="tcode">${esc(t.code)}</span>`, `<span class="nm">${esc(t.title)}</span>`, md(t.covers), String(t.ideas.length)]), { split: false });
  const rows = ctx.themes.map(t => ({ label: `${t.code} · ${t.title}`, counts: matStrip(t.ideas) }));
  const tot = [0, 0, 0, 0, 0, 0]; rows.forEach(r => r.counts.forEach((v, i) => { tot[i] += v; }));
  const leg = legend([5, 4, 3, 2, 1, 0].map(k => ({ color: C.MAT_COLORS[k], name: MAT_NAMES[k] })));
  h += figure(leg + C.maturityStack(rows, { labW: 300, label: 'Ideas per theme by how far they have got' }),
    'Counts of ideas per theme. Maturity is the furthest stage any source reports for the idea.',
    'One bar per theme, split by maturity. **Darker = further along.** The number at the end is the theme’s total.',
    `${tot[5]} ideas are already in use and ${tot[4]} have been tested; ${tot[2] + tot[3]} more are designed or built and waiting for their first measurement. That middle band is where most of the next work is.`);
  if (ctx.heatSvg) h += figure(ctx.heatSvg, ctx.heatCap, ctx.heatHow, ctx.heatShows);
  return h;
}

function themeSection(t, ctx) {
  let h = '';
  const c = matStrip(t.ideas);
  const pk = (t.packages || []).map(p => `<span class="chip on">${esc(p)}</span>`).join('');
  h += `<div class="theme-head sec-start" id="th-${t.id}" data-part="Part 3 · ${esc(t.code)} ${esc(t.title)}"><div class="th-code">${esc(t.code)}</div><div class="th-main"><div class="partlabel">Theme · ${t.ideas.length} ideas</div><h2>${esc(t.title)}</h2><div class="th-meta">${c[5]} in use · ${c[4]} tested · ${c[3]} built · ${c[2]} designed · ${c[1]} ideas · ${c[0]} parked${pk ? ' &nbsp; Work packages: ' + pk : ''}</div></div></div>`;
  (t.intro || []).forEach(p => { h += P(p); });
  (t.figures || []).forEach(f => { h += figure(f.svg, f.caption, f.howto, f.shows); });
  h += table([{ t: 'Id', w: '15mm' }, { t: 'Idea and how it works', w: '50mm' }, { t: 'The problem it solves', w: '42mm' }, { t: 'Where it stands', w: '38mm' }, { t: 'Next step', w: '33mm' }],
    t.ideas.map(i => [
      `<span class="iid">${esc(i.id)}</span>${i.wp ? `<span class="wpref">${esc(i.wp)}</span>` : ''}`,
      `<span class="nm">${md(i.name)}</span><span class="sub">${md(i.how)}</span>${i.origin ? `<span class="org">${md(i.origin)}</span>` : ''}`,
      md(i.problem) + (i.bottlenecks && i.bottlenecks.length ? `<span class="bnref">${i.bottlenecks.map(esc).join(' · ')}</span>` : ''),
      `<span class="stage">${meter(i.maturity)}</span>${md(i.stands)}`,
      md(i.next),
    ]), { cls: 'ideas' });
  return h;
}

function part3(ctx) {
  let h = overview(ctx);
  ctx.themes.forEach(t => { h += themeSection(t, ctx); });
  return h;
}

module.exports = { part3, matStrip };
