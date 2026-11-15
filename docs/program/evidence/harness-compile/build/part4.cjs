// Part 4: dividing the work. Package map, package cards, assignment board, decisions, how we work.
'use strict';
const { P, H, UL, BOX, md, esc, figure, legend, table } = require('./lib.cjs');
const C = require('./charts.cjs');
const LENS = require('./short-lens.cjs');

// Package map: columns are start waves, boxes are packages, arrows are dependencies.
function packageMap(pkgs) {
  const W = 672, colW = 206, gapX = 27, boxH = 45, gapY = 8, top = 38;
  const waves = [...new Set(pkgs.map(p => p.wave))].sort();
  const pos = {};
  let b = '';
  waves.forEach((w, ci) => {
    const x = ci * (colW + gapX);
    b += C.text(x, 10, pkgs.find(p => p.wave === w).waveTitle, { fs: 9.6, weight: 600, fill: C.INK2 });
    const col = pkgs.filter(p => p.wave === w).slice().sort((a, b2) => (a.mapRow || 99) - (b2.mapRow || 99));
    col.forEach((p, ri) => {
      const y = top + ri * (boxH + gapY);
      pos[p.id] = { x, y, ci, ri };
      b += C.rrect(x, y, colW, boxH, 6, '#ffffff', C.AXIS);
      b += C.rrect(x, y, 5, boxH, 2, C.CAT[0]);
      b += C.text(x + 12, y + 16, p.id, { fs: 9.6, weight: 700, fill: '#1c5cab' });
      b += C.text(x + 12 + C.tw(p.id, 9.6, 0.6) + 6, y + 16, p.short, { fs: 10, weight: 600 });
      C.wrap(p.mapLine, 40).slice(0, 2).forEach((ln, k) => { b += C.text(x + 12, y + 30 + k * 11.5, ln, { fs: 8.8, fill: C.INK2 }); });
    });
  });
  const rows = Math.max(...waves.map(w => pkgs.filter(p => p.wave === w).length));
  // Dependency arrows. Next column: a curve in the gutter. Two columns on: an orthogonal route over the
  // top channel, so it never crosses a box. Same column, next row: a short vertical arrow in the row gap.
  let arrows = '';
  let lane = 0;
  const head = (x, y, dir, col) => {
    if (dir === 'right') return `<path d="M${x},${y} l-6,-3.5 l0,7 z" fill="${col}"/>`;
    if (dir === 'down') return `<path d="M${x},${y} l-3.5,-6 l7,0 z" fill="${col}"/>`;
    return `<path d="M${x},${y} l-3.5,6 l7,0 z" fill="${col}"/>`;
  };
  pkgs.forEach(p => (p.dependsOn || []).forEach(d => {
    const a = pos[d.id], z = pos[p.id]; if (!a || !z) return;
    const col = d.hard ? C.INK2 : C.AXIS;
    const dash = d.hard ? '' : ' stroke-dasharray="4 3"';
    if (z.ci === a.ci + 1) {
      const x1 = a.x + colW, y1 = a.y + boxH / 2, x2 = z.x - 2, y2 = z.y + boxH / 2;
      const mx = (x1 + x2) / 2;
      arrows += `<path d="M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}" fill="none" stroke="${col}" stroke-width="1.3"${dash}/>`;
      arrows += head(x2, y2, 'right', col);
    } else if (z.ci > a.ci + 1) {
      const off = 8 + lane * 7, cy = top - 10 - lane * 6; lane += 1;
      const g1 = a.x + colW + off, g2 = z.x - gapX + off;
      const y1 = a.y + boxH / 2 + (lane % 2 ? -6 : 6), y2 = z.y + boxH / 2;
      arrows += `<path d="M${a.x + colW},${y1} H${g1} V${cy} H${g2} V${y2} H${z.x - 2}" fill="none" stroke="${col}" stroke-width="1.3" stroke-linejoin="round"${dash}/>`;
      arrows += head(z.x - 2, y2, 'right', col);
    } else if (z.ci === a.ci && Math.abs(z.ri - a.ri) === 1) {
      const x = a.x + colW / 2 + (z.ri > a.ri ? 30 : -30);
      if (z.ri > a.ri) { arrows += `<path d="M${x},${a.y + boxH} V${z.y - 2}" stroke="${col}" stroke-width="1.3"${dash}/>` + head(x, z.y - 1, 'down', col); }
      else { arrows += `<path d="M${x},${a.y} V${z.y + boxH + 2}" stroke="${col}" stroke-width="1.3"${dash}/>` + head(x, z.y + boxH + 1, 'up', col); }
    }
  }));
  return C.svg(W, top + rows * (boxH + gapY) - gapY + 2, arrows + b, 'Work packages by when they can start, with dependencies');
}

function card(p, ctx) {
  const moves = ctx && ctx.lensText ? LENS.packageMoves(ctx, p.id).map(m => LENS.MSHORT[m].toLowerCase()) : [];
  const li = a => a.map(x => `<li>${md(x)}</li>`).join('');
  return `<div class="wp" id="wp-${p.id}"><div class="wph"><h3><span class="wpid">${esc(p.id)}</span>${esc(p.name)}</h3><div class="owner">Owner<span></span></div></div>
  <div class="goal">${md(p.goal)}</div>
  ${moves.length ? `<div class="where"><b>Moves most:</b> ${esc(moves.join(' and '))}</div>` : ''}
  ${p.worksIn ? `<div class="where"><b>Works in:</b> ${md(p.worksIn)}</div>` : ''}
  <div class="cols">
    <div><div class="k">Bottlenecks it answers</div>${md(p.bottlenecks)}</div>
    <div><div class="k">Ideas it carries</div>${md(p.ideas)}</div>
    <div><div class="k">First deliverable</div>${md(p.first)}</div>
    <div><div class="k">Done when</div>${md(p.done)}</div>
    <div><div class="k">Good fit for</div>${md(p.skills)}</div>
    <div><div class="k">Size and dependencies</div>${md(p.size)}${p.depText ? ' ' + md(p.depText) : ''}</div>
  </div>
  ${p.mine ? `<div class="mine"><b>Waiting on me:</b> ${md(p.mine)}</div>` : ''}</div>`;
}

function part4(ctx) {
  const pk = ctx.packages;
  let h = '';
  h += `<div class="sec-start" data-part="Part 4 · Dividing the work"><div class="partlabel">Part 4</div><h1 id="p4">Dividing the work</h1><div class="rule"></div>
  ${P(ctx.p4lead, 'lead')}</div>`;
  h += H(2, 'How the packages fit together', 'p4-map');
  h += figure(legend([{ color: C.INK2, name: 'Needs the other first (hard)' }, { color: C.AXIS, name: 'Easier after the other (soft)' }]) + packageMap(pk),
    'Dependencies follow the harness v2 plan (`docs/program/HARNESS-V2-DESIGN-2026-11.md` §2) and the other plans each card names (the ship plan, PR #183 and PR #185).',
    'Columns are when a package can start. **Solid arrows** mean the later package needs a deliverable of the earlier one first (its card names which); **dashed** ones mean it helps to have it first.',
    ctx.mapShows);
  if (ctx.before && ctx.before.length) h += BOX('before keep', `<div class="bh">Before you start</div>${ctx.before.map(r => `<p><b>${md(r[0])}.</b> ${md(r[1])}</p>`).join('')}`);
  h += H(2, 'The work packages', 'p4-packages');
  h += P('Each card says what the package is for, which bottlenecks and ideas it carries, the first thing to deliver, how we will know it is done, and the kind of person it suits. Each size carries its tag: [E] where a design estimated it, [G] where it is my guess until the first step reports; a package not yet sized says so. Write your name on the line when you take one.');
  pk.forEach(p => { h += card(p, ctx); });
  h += H(2, 'The assignment board', 'p4-board');
  h += P('One line per package, to fill in together. Two people can share a package; one person should not hold two packages from the same start column (today, on my word, after another package).');
  const startTxt = p => p.startNote || (p.wave === '1' ? 'today' : p.wave === '2' ? 'on my word' : 'after ' + (p.dependsOn || []).filter(d => d.hard).map(d => d.id).join(', '));
  h += table([{ t: 'Package', w: '44mm' }, { t: 'First deliverable' }, { t: 'Size', w: '24mm' }, { t: 'Can start', w: '20mm' }, { t: 'Owner', w: '32mm' }],
    pk.map(p => [`<span class="iid">${esc(p.id)}</span> <span class="nm" style="display:inline">${esc(p.short)}</span>`, md(p.firstShort || p.first), md(p.sizeShort || ''), esc(startTxt(p)), '<span class="blank"></span>']), { cls: 'board' });
  h += H(2, 'Decisions waiting on me', 'p4-decisions');
  h += P(ctx.decLead);
  h += table([{ t: 'Id', w: '13mm' }, { t: 'Decision', w: '52mm' }, { t: 'Options (the recommended one in bold)' }, { t: 'Unblocks', w: '22mm' }],
    ctx.decisions.filter(d => !((ctx.lensText && ctx.lensText.decisionsSkip) || []).includes(d.id)).map(d => [`<span class="iid">${esc(d.id)}</span>`, `<span class="nm">${md(d.q)}</span>${d.when ? `<span class="org">${md(d.when)}</span>` : ''}`, md(d.options), md(d.unblocks)]), { cls: 'dec' });
  h += H(2, 'How we work', 'p4-rules');
  h += P('These are the rules we follow or are adopting now, collected so a new person can work the same way from day one. Each says where it comes from.');
  h += table([{ t: 'Rule', w: '50mm' }, { t: 'What it means in practice' }, { t: 'From', w: '38mm' }],
    ctx.rules.map(r => [`<span class="nm">${md(r[0])}</span>`, md(r[1]), `<span class="org" style="margin:0">${md(r[2])}</span>`]), { cls: 'rules' });
  return h;
}

module.exports = { part4, packageMap };
