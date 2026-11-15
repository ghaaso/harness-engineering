// The short edition: at most 25 pages. It keeps every diagram of the full edition and cuts the detail to
// what a teammate needs to pick up work. The full edition is kept beside it as the reference edition, and
// this one says so wherever it leaves detail out.
// Built by: node build.cjs --short [--render]   (reads data/short.json for the condensed text)
'use strict';
const { P, H, UL, BOX, md, esc, meter, figure, legend, table, MAT_NAMES } = require('./lib.cjs');
const C = require('./charts.cjs');
const F = require('./figures.cjs');
const { matStrip } = require('./part3.cjs');
const { packageMap } = require('./part4.cjs');
const { CAT_TITLES, CAT_ORDER } = require('./back.cjs');
const LENS = require('./short-lens.cjs');

const REF = 'HARNESS-IDEAS-AND-BOTTLENECKS-2026-11-14-REFERENCE.pdf';

// Parts 2 to 4 flow on from the page before. The heading block stays with what follows it.
const partHead = (part, label, title, id, lead, newPage) =>
  `<div class="parthead kwn${newPage ? ' sec-start' : ''}" data-part="${esc(part)}"><div class="partlabel">${esc(label)}</div><h1 id="${id}">${md(title)}</h1><div class="rule"></div>${lead ? P(lead, 'lead') : ''}</div>`;
const tile = (v, l) => `<div class="tile"><div class="v">${md(v)}</div><div class="l">${md(l)}</div></div>`;

function cover(ctx, S) {
  const t = (v, l) => `<div class="tile"><div class="v">${esc(v)}</div><div class="l">${md(l)}</div></div>`;
  return `<div class="cover"><div class="band"></div>
  <div class="kicker">Harness programme · Short edition</div>
  <h1>Our AI build harness: the ideas, the bottlenecks and the work</h1>
  <div class="sub">${md((S.cover && S.cover.sub) || 'What we are building, the bottlenecks that slow it down, the ideas we have for each, and the work packages we can now split across the team.')}</div>
  <div class="tiles">${(S.cover && S.cover.tiles) ? S.cover.tiles.map(([v, l]) => t(String(v).replace('{ideas}', ctx.counts.ideas).replace('{bottlenecks}', ctx.counts.bottlenecks).replace('{packages}', ctx.counts.packages).replace('{themes}', ctx.counts.themes), l)).join('') : t(ctx.counts.ideas, 'ideas, whatever their results so far') + t(ctx.counts.themes, 'themes, one per kind of problem') + t(ctx.counts.bottlenecks, 'bottlenecks in one register') + t(ctx.counts.packages, 'work packages, each with an owner slot')}</div>
  <div class="cover-note">${md(S.coverNote)}</div>
  <div class="by"><b>Muhammad Bilal</b><br>${esc(S.date || '13 November 2026')}<br>${esc((S.cover && S.cover.from) || 'Compiled from the sessions of 31 October to 13 November 2026')}</div></div>`;
}

function howToRead(ctx, S) {
  const row = (cls, label, id) => `<tr class="${cls}"><td>${md(label)}</td><td class="pg" data-toc="${id}"></td></tr>`;
  const left = [['part', 'The short version', 'short'], ['part', 'Part 1 · What we are building', 'p1'], ['sub', 'What the harness is made of', 'p1-harness'], ['sub', 'Where the ideas came from', 'p1-sources'], ['sub', 'How it fits together: harness v2', 'p1-arch'],
    ['part', 'Part 2 · The bottlenecks', 'p2']].concat(S.blocks ? [['sub', 'The seven metrics, and where we stand', 'p2-metrics'], ['sub', 'Which bottleneck limits which metric', 'p2-matrix'], ['sub', 'The bottlenecks, one by one', 'p2-blocks']] : [['sub', 'How we found them', 'p2-found'], ['sub', 'Where the tokens go', 'p2-tokens'], ['sub', 'The machine and the check', 'p2-machine'], ['sub', 'The register at a glance', 'p2-glance'], ['sub', 'The bottlenecks that matter most', 'p2-key']]);
  const right = [['part', 'Part 3 · The ideas', 'p3'], ['sub', 'All ideas at a glance', 'p3-overview'], ['sub', 'The twelve themes', 'p3-themes'],
    ['part', 'Part 4 · Dividing the work', 'p4'], ['sub', 'How the packages fit together', 'p4-map'], ['sub', 'The work packages', 'p4-packages'], ['sub', 'Decisions waiting on me', 'p4-decisions'], ['sub', 'How we work', 'p4-rules'],
    ['part', 'Glossary', 'gloss'], ['part', 'Sources', 'sources'], ['sub', 'How this compile was made', 'howmade']];
  const toc = rows => `<table class="toc">${rows.map(r => row(...r)).join('')}</table>`;
  const tag = (t, name, def) => `<tr><td style="width:7mm"><span class="tg" style="font-size:7.2pt">${t}</span></td><td><b>${name}.</b> ${md(def)}</td></tr>`;
  const lvl = (n, def) => `<tr><td style="width:27mm">${meter(n)}</td><td>${md(def)}</td></tr>`;
  return `<div class="sec-start" data-part="How to read this"><div class="partlabel">Before you start</div><h1 id="howto">How to read this</h1><div class="rule"></div>
  ${P(S.howLead, 'lead')}</div>
  <div class="toc2">${toc(left)}${toc(right)}</div>
  <div class="pair"><div><h3>Every number says how sure we are of it</h3><table class="plain"><tbody>
  ${tag('M', 'Measured', 'Counted or timed on our own machine or in our own records.')}
  ${tag('E', 'Estimated', 'Worked out from measured data with a stated assumption.')}
  ${tag('G', 'Guess', 'A judgement, written down so a measurement can replace it.')}
  ${tag('S', 'Setting or outside figure', 'A configured value, or a number from an outside study or vendor.')}
  ${tag('T', 'Target', 'A bar we set for ourselves to clear.')}
  ${tag('I', 'Illustrative', 'An example that shows the arithmetic, not a result.')}
  </tbody></table></div>
  <div><h3>Every idea shows how far it has got</h3><table class="plain"><tbody>
  ${lvl(1, 'Proposed, or picked from an outside source to try.')}
  ${lvl(2, 'Written into a design or plan with its test.')}
  ${lvl(3, 'It exists, but is not measured or switched on yet.')}
  ${lvl(4, 'Measured, trialled or replayed, with results in.')}
  ${lvl(5, 'Part of how we work today.')}
  ${lvl(0, 'Not pursued for now, or replaced; the reason stays.')}
  </tbody></table></div></div>
  <h3>Ids and terms</h3>
  ${UL(S.howIds)}`;
}

function shortVersion(ctx, S) {
  const k = S.short || ctx.short;
  return `<div class="sec-start" data-part="The short version"><div class="partlabel">One page</div><h1 id="short">The short version</h1><div class="rule"></div>
  ${P(S.shortLead, 'lead')}</div>
  <div class="tiles">${tile(k.t1v, k.t1l)}${tile(k.t2v, k.t2l)}${tile(k.t3v, k.t3l)}${tile(k.t4v, k.t4l)}</div>
  <div class="keypoints">${k.points.map((p, i) => `<div class="kp"><div class="kpn">${i + 1}</div><div><b>${md(p.h)}</b> ${md(p.t)}</div></div>`).join('')}</div>
  ${BOX('callout', P(S.ask))}`;
}

function part1(ctx, S) {
  let h = partHead('Part 1 · What we are building', 'Part 1', 'What we are building', 'p1', S.p1.lead, true);
  h += H(2, 'What the harness is made of', 'p1-harness');
  h += UL(S.p1.harness);
  h += H(2, 'Where the ideas came from', 'p1-sources');
  h += P(S.p1.sources);
  h += figure(F.timeline(), 'Dates are when each document or result was written. Sources are listed at the back.', 'Each dot is a session or document that produced ideas or measurements. **Read left to right.**', 'Most of the record was written between 9 and 13 November, once the clinic testbed’s record was large enough to study as a whole.');
  h += H(2, 'How it fits together: harness v2', 'p1-arch');
  h += P(S.p1.arch);
  h += BOX('callout', P('**Speed = lanes × what one lane delivers, until the lowest limit.** A **lane** is one session building one slice of work. More lanes help only until the first of the four limits is reached. Past that point, the **knee**, they add queues, tokens and collisions, and no speed.'));
  h += figure(F.architecture(), 'Source: HARNESS-V2-DESIGN-2026-11.md §0 and harness-v2/architecture.json.', 'Boxes are the parts of the harness; arrows show what flows between them. The blue labels name the loops each part controls.', 'Every part has a single job. The library feeds every other part, and everything stands on the machine.');
  // The architecture figure already shows each part's job, so the parts table is left to the reference edition.
  if (!(S.blocks && ctx.lens)) {
    h += H(3, 'The loops each part controls');
    h += P(S.p1.loops, 'kwn');
    h += table([{ t: 'Loop', w: '34mm' }, { t: 'What happens' }, { t: 'What we saw in the testbed', w: '58mm' }], ctx.v2.loops.map(l => [`<span class="iid">${esc(l[0])}</span> <span class="nm" style="display:inline">${esc(l[1])}</span>`, md(l[2]), md(l[3])]), { cls: 'cmp' });
  } else if (S.p1.loopsNote) h += P(S.p1.loopsNote);
  return h;
}

function part2(ctx, S) {
  if (S.blocks && ctx.lens) return LENS.part2Lens(ctx, S, partHead);
  const n = ctx.n;
  let h = partHead('Part 2 · The bottlenecks', 'Part 2', 'The bottlenecks', 'p2', S.p2.lead);
  h += H(2, 'How we found them', 'p2-found');
  h += table([{ t: 'Session', w: '46mm' }, { t: 'What it gave us' }], ctx.found.map(f => [`<span class="nm">${md(f[0])}</span><span class="org" style="margin-top:0">${esc(f[1])}</span>`, md(f[2])]), { cls: 'cmp' });
  h += P(S.p2.classes);
  h += H(2, 'Where the tokens go', 'p2-tokens');
  h += P(`We counted every model call on this PC for both projects: ${n.calls} calls [M] and ${n.ctxTokens} context tokens [M]. The finding is simple and useful. **Token use is calls × window size.** ${n.reread} [M] of all tokens are the model re-reading a window it has already seen; what it writes is ${n.output} [M]. So the way to spend fewer tokens is fewer calls and smaller windows, not shorter answers.`);
  const wf = F.windowFill();
  h += figure(legend(wf.parts.map((p, i) => ({ color: C.CAT[i], name: p.name }))) + wf.svg,
    'Source: TOKEN-BOTTLENECK-2026-11.md, “What the windows hold”. Estimated from how the context grew between calls, weighted by re-reads; 5–8 % stays unclassified. [E]',
    'Each bar is one project’s context tokens split by what they were. **Wider = more of the tokens.**',
    'FixFlow’s largest share (47 % [E]) is the **fixed start** every agent re-reads; the clinic’s largest (31 % [E]) is the model’s **own earlier output** carried forward. Content fetched by reading, which indexes and knowledge stores aim at, is about a quarter in both.');
  h += P(S.p2.shapes);
  h += figure(legend([{ color: C.CAT[0], name: 'FixFlow' }, { color: C.CAT[1], name: 'Clinic testbed' }]) + F.levers(),
    'Source: TOKEN-BOTTLENECK-2026-11.md, “Levers, in order of size”. Lever 1 is a share of the cache-read tokens (the re-reads), the others of all context tokens. The shares overlap, so they do not add up.',
    'Four levers, each with the share of each project’s tokens it can act on. **Longer bar = more room to save.** This is exposure, not a promised saving.',
    'Every lever is a change to how we run sessions, not a new tool. Lever 1 matters most for the clinic’s long windows, lever 2 for FixFlow’s many agents.');
  h += BOX('note', P(S.p2.ruledOut));
  h += H(2, 'The machine and the check', 'p2-machine');
  h += P(`The clinic testbed ran ${n.clinicCommits} commits and ${n.clinicMerges} merges in eight working days on one PC [M]. Its record shows where the time went and, better, where we have already won a lot of it back.`, 'kwn');
  h += figure(F.wins(), 'Sources: HARNESS-BOTTLENECKS-2026-11.md and its evidence folder (machine-facts.md); HARNESS-V2-DESIGN-2026-11.md. The page factor divides the midpoints of 9–13 s and 0.1–0.5 s, so it is an estimate: anywhere from about 18× to 130× [E].',
    'Each bar is the new time as a share of the old one. **Shorter bar = bigger win.** The factor on the right is old ÷ new.',
    'Every one of these was built and measured on our own PC. They are ready to carry from the testbed into FixFlow.');
  h += `<div class="tiles">${tile('24 [M]', 'unexpected shutdowns of the PC, 7 October to 10 November')}${tile('2.8 [M]', 'review rounds per slice; 64 % [M] of reviews sent work back')}${tile('2,030 s [M]', 'longest wait for the one check slot')}${tile('~70k [M]', 'tokens every clinic testbed agent re-read before doing any work')}</div>`;
  h += P(S.p2.machine);
  h += H(2, 'The register at a glance', 'p2-glance');
  h += P(`The register joins every session’s bottlenecks into one list of ${ctx.reg.length}. Duplicates found by more than one session are merged, and each keeps the id its first session gave it.`, 'kwn');
  h += figure(ctx.regGlanceSvg, 'Source: the register; the reference edition prints it in full.', ctx.regGlanceHow, ctx.regGlanceShows);
  if (ctx.clinicGridSvg) h += figure(ctx.clinicGridSvg, 'Source: HARNESS-V2-DESIGN-2026-11.md §3. Class and phase as set by the compile of 11 November.', 'The 21 clinic bottlenecks, placed by the harness v2 phase that answers them. **Each chip is one bottleneck; its colour is its class.**', 'Every one of the 21 has a home in the first four phases, a first step and a test that will show whether it is solved.');
  h += keyBottlenecks(ctx, S);
  return h;
}

function keyBottlenecks(ctx, S) {
  const picks = S.picks || [];
  let h = H(2, 'The bottlenecks that matter most', 'p2-key');
  h += P(`The register holds ${ctx.reg.length}. These ${picks.length} matter most now: the largest measured costs and the most work waiting behind them, from every family. The reference edition lists all ${ctx.reg.length} with their evidence and first steps.`, 'kwn');
  const byId = Object.fromEntries(ctx.reg.map(b => [b.id, b]));
  h += table([{ t: 'Bottleneck', w: '46mm' }, { t: 'How big it is' }, { t: 'What fixing it unlocks', w: '56mm' }],
    picks.map(p => {
      const b = byId[p.id] || {};
      // One line of id, package and state; the family shows in the chart above and the class in the clinic grid.
      const meta = [p.wp || b.wp, b.stateKey || 'open'].filter(Boolean).map(esc).join(' · ');
      return [`<span class="iid">${esc(p.id)}</span><span class="kmeta"> · ${meta}</span><span class="nm">${md(p.name)}</span>`, md(p.big), md(p.unlocks)];
    }), { cls: 'key' });
  return h;
}

// The two metrics most of a theme's ideas move (by main metric).
function themeMoves(t, ctx) {
  const L = ctx.lens, n = {};
  t.ideas.forEach(i => { const c = L.cls[i.id]; if (c && c.primary && c.primary !== 'none') n[c.primary] = (n[c.primary] || 0) + 1; });
  return Object.keys(n).sort((a, b) => n[b] - n[a] || L.metrics.indexOf(a) - L.metrics.indexOf(b)).slice(0, 2);
}

function themeCard(t, s, ctx) {
  const c = matStrip(t.ideas);
  const pk = (t.packages || []).map(p => `<span class="chip on">${esc(p)}</span>`).join('');
  const byId = Object.fromEntries(t.ideas.map(i => [i.id, i]));
  const counts = [[5, 'in use'], [4, 'tested'], [3, 'built'], [2, 'designed'], [1, 'ideas'], [0, 'parked']].filter(([k]) => c[k]).map(([k, l]) => `${c[k]} ${l}`).join(' · ');
  const moves = ctx.lens ? themeMoves(t, ctx).map(m => LENS.chip(m, true)).join('') : '';
  const rows = (s.key || []).map(k => {
    const i = byId[k.id] || {};
    return `<tr><td class="kidl"><span class="iid">${esc(k.id)}</span>${i.maturity != null ? `<span class="kmt">${meter(i.maturity)}</span>` : ''}</td><td><b>${md(k.name)}.</b> ${md(k.line)}</td></tr>`;
  }).join('');
  return `<div class="tcard" id="th-${t.id}"><div class="tch"><div class="tcb">${esc(t.code)}</div><div><h3>${esc(t.title)}</h3><div class="tcm">${t.ideas.length} ideas: ${counts}${pk ? ' &nbsp; ' + pk : ''}${moves ? ' &nbsp; ' + moves : ''}</div></div></div>
  <p class="tcs">${md(s.summary || '')}</p>${rows ? `<table class="kid"><tbody>${rows}</tbody></table>` : ''}</div>`;
}

function part3(ctx, S) {
  const lens = !!(S.blocks && ctx.lens);
  let h = partHead('Part 3 · The ideas', 'Part 3', 'The ideas', 'p3', (S.p3 && S.p3.lead ? S.p3.lead.replace('{ideas}', ctx.counts.ideas).replace('{themes}', ctx.counts.themes) : `Every harness idea we have had, whatever its results: ${ctx.counts.ideas} [M] ideas in ${ctx.counts.themes} themes. Two charts show where they stand; a card per theme gives the ideas a teammate most needs. The reference edition lists every idea in full.`));
  h += H(2, 'All ideas at a glance', 'p3-overview');
  const rows = ctx.themes.map(t => ({ label: `${t.code} · ${t.title}`, counts: matStrip(t.ideas) }));
  const tot = [0, 0, 0, 0, 0, 0]; rows.forEach(r => r.counts.forEach((v, i) => { tot[i] += v; }));
  const leg = legend([5, 4, 3, 2, 1, 0].map(k => ({ color: C.MAT_COLORS[k], name: MAT_NAMES[k] })));
  h += figure(leg + C.maturityStack(rows, { labW: 300, label: 'Ideas per theme by how far they have got' }),
    'Counts of ideas per theme. Maturity is the furthest stage any source reports for the idea; “How to read this” defines the six stages.',
    'One bar per theme, split by maturity. **Darker = further along.** The number at the end is the theme’s total.',
    `${tot[5]} [M] ideas are already in use and ${tot[4]} [M] have been tested; ${tot[2] + tot[3]} [M] more are designed or built and waiting for their first measurement. Those designed and built ideas are where most of the next work is.`);
  if (lens) h += figure(LENS.themeMetricHeat(ctx), S.p3.heatCap, 'Rows are themes, columns are the seven metrics. **Darker = more ideas that move that metric.**', S.p3.heatShows);
  else if (ctx.heatSvg) h += figure(ctx.heatSvg, ctx.heatCap, ctx.heatHow, ctx.heatShows);
  h += H(2, 'The twelve themes', 'p3-themes');
  h += P((S.p3 && S.p3.themesLead) || 'Each card gives the theme’s idea count by stage and the work packages that carry it, what the theme is about, and its key ideas with how far each has got. The library model’s funnel and the graph test’s results, which belong to the memory and retrieval themes, follow those cards.', 'kwn');
  if (lens) { h += LENS.themeTable(ctx, S, matStrip); return h; }
  const byCode = Object.fromEntries((S.themes || []).map(s => [s.code, s]));
  ctx.themes.forEach(t => {
    h += themeCard(t, byCode[t.code] || {}, ctx);
    // The test charts may float to the top of the next page, so whole cards fill the page before them.
    if (!lens) (t.figures || []).forEach(f => { h += figure(f.svg, f.caption, f.howto, f.shows).replace('<figure class="keep">', '<figure class="keep float">'); });
  });
  return h;
}

function part4(ctx, S) {
  const pk = ctx.packages;
  let h = partHead('Part 4 · Dividing the work', 'Part 4', 'Dividing the work', 'p4', S.p4.lead);
  h += H(2, 'How the packages fit together', 'p4-map');
  h += figure(legend([{ color: C.INK2, name: 'Needs the other first (hard)' }, { color: C.AXIS, name: 'Easier after the other (soft)' }]) + packageMap(pk),
    'Dependencies follow the harness v2 plan (`docs/program/HARNESS-V2-DESIGN-2026-11.md` §2) and the other plans each package names (the ship plan, PR #183 and PR #185).',
    'Columns are when a package can start. **Solid arrows** mean the later package needs a deliverable of the earlier one first; **dashed** ones mean it helps to have it first.',
    S.p4.mapShows || ctx.mapShows);
  const before = S.before || [];
  if (before.length) h += BOX('before keep', `<div class="bh">Before you start</div>${before.map(r => `<p><b>${md(r.title)}.</b> ${md(r.text)}</p>`).join('')}`);
  h += H(2, 'The work packages', 'p4-packages');
  h += P(S.p4.packages, 'kwn');
  const startTxt = p => p.startNote || (p.wave === '1' ? 'today' : p.wave === '2' ? 'on my word' : 'after ' + (p.dependsOn || []).filter(d => d.hard).map(d => d.id).join(', '));
  const rowsBy = Object.fromEntries((S.rows || []).map(r => [r.id, r]));
  h += table([{ t: 'Package', w: '31mm' }, { t: 'What it is for, and the first deliverable' }, { t: 'Done when, and what it waits on from me', w: '62mm' }, { t: 'Owner', w: '22mm' }],
    pk.map(p => {
      const r = rowsBy[p.id] || {};
      return [`<span class="iid">${esc(p.id)}</span><span class="nm">${esc(p.short)}</span><span class="org">Size: ${md(p.sizeShort || 'not sized yet')}<br>Starts: ${esc(startTxt(p))}${ctx.lens && LENS.packageMoves(ctx, p.id).length ? '<br>Moves: ' + LENS.packageMoves(ctx, p.id).map(m => esc(LENS.MSHORT[m].toLowerCase())).join(', ') : ''}</span>`,
        `${md(r.goal || '')}<span class="sub" style="margin-top:0.8mm"><b>First:</b> ${md(r.first || '')}</span>`,
        `${md(r.done || '')}<span class="sub" style="margin-top:0.8mm"><b>Waits on me:</b> ${md(r.waits || '')}</span>`, '<span class="blank"></span>'];
    }), { cls: 'pk' });
  h += H(2, 'Decisions waiting on me', 'p4-decisions');
  h += P(S.p4.decisions, 'kwn');
  // The options and the recommended one stay in the reference edition; the team needs what each decision holds up.
  // A decision answered after the reference edition was built (decisionsSkip) is left out; the lead above says so.
  const decSkip = new Set(S.decisionsSkip || []);
  h += table([{ t: 'Id', w: '15mm' }, { t: 'Decision' }, { t: 'When', w: '46mm' }, { t: 'Unblocks', w: '40mm' }],
    ctx.decisions.filter(d => !decSkip.has(d.id)).map(d => [`<span class="iid">${esc(d.id)}</span>`, md(d.q), md(d.when || ''), md(d.unblocks)]), { cls: 'dec cmp' });
  h += H(2, 'How we work', 'p4-rules');
  // Rules that the “Before you start” box already gives in full are left out here and named instead.
  const skip = new Set(S.rulesSkip || []);
  h += P('The rules we follow or are adopting now, so a new person can work the same way from day one.' + (skip.size ? ' Two more, the ship plan first and one budget, are in the box under the map.' : ''), 'kwn');
  h += table([{ t: 'Rule', w: '50mm' }, { t: 'What it means in practice' }],
    ctx.rules.filter(r => !skip.has(r[0])).map(r => [`<span class="nm">${md(r[0])}</span><span class="org" style="margin:0">${md(r[2])}</span>`, md(r[1])]), { cls: 'rules cmp' });
  return h;
}

// ---- Glossary: only the terms this edition uses. ----
// A term like "Docker / container / Docker Desktop" is used when any of its forms appears in the text.
// Id families ("B01 to B21", "D01-D23") match any id with that prefix.
function termForms(term) {
  const forms = [];
  const ranges = [];
  // A range names its prefix on both ends ("D01-D23", "B01 to B21", "RT-01..RT-09"); "G05-01" is one id, not a range.
  const reRange = /([A-Z][A-Za-z]*-?[A-Z]?)(\d+)[a-z]?(?:\s*(?:to|–|\.\.)\s*\1|-\1)(\d+)/g;
  let m;
  while ((m = reRange.exec(term))) ranges.push({ pre: m[1], lo: Number(m[2]), hi: Number(m[3]), w: m[2].length });
  const base = term.replace(/\(([^)]*)\)/g, ' / $1 / ');
  base.split(/\s*(?:\/|;|,|\band\b)\s*/).map(s => s.trim()).filter(Boolean).forEach(s => {
    if (/[A-Z]\d+[a-z]?(?:\s*(?:to|–|\.\.)\s*|-)[A-Z][A-Za-z-]*\d+/.test(s)) return;    // a range, handled above
    forms.push(s.replace(/\s*\.\.\.$/, ''));
  });
  return { forms, ranges };
}
function formRe(f) {
  const e = f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
  const sensitive = /[A-Z].*[A-Z]|\d|^[A-Z]{2}/.test(f) || f.length <= 3;
  return new RegExp('(?<![\\w-])' + e + '(?:s|es)?(?![\\w-])', sensitive ? '' : 'i');
}
function pickTerms(gloss, text, include, exclude) {
  const inc = new Set(include || []), exc = new Set(exclude || []);
  const used = [];
  gloss.forEach(t => {
    if (exc.has(t.key)) return;
    if (inc.has(t.key)) { used.push({ t, why: 'included by hand' }); return; }
    const { forms, ranges } = termForms(t.term);
    let why = null;
    for (const r of ranges) {
      const re = new RegExp('(?<![\\w-])' + r.pre.replace(/-/g, '\\-') + '(\\d+)[a-z]?(?![\\w])', 'g');
      let mm;
      while ((mm = re.exec(text))) { const v = Number(mm[1]); if (v >= r.lo && v <= r.hi && (r.w < 2 || mm[1].length === r.w)) { why = mm[0]; break; } }
      if (why) break;
    }
    if (!why) for (const f of forms) { if (f.length < 2) continue; const mm = text.match(formRe(f)); if (mm) { why = mm[0]; break; } }
    if (why) used.push({ t, why });
  });
  return used;
}

function glossary(ctx, S, used) {
  let h = partHead('Glossary', 'Glossary', 'The terms this edition uses', 'gloss', `${used.length} terms, grouped by where they come from and sorted A to Z inside each group. “Coined by us” means the term was made up in one of our own documents, named after it. The reference edition’s glossary has all ${ctx.gloss.length}, with longer definitions.`);
  let items = '';
  // A short entry (checked against the full one) where there is one; otherwise the full entry. A short entry may
  // also print the term under the name this edition uses (term) or in another group (cat), e.g. "Arm" out of a combined entry.
  const entries = used.map(u => { const s = (S.glossShort || {})[u.t.key]; return { t: u.t, s, term: (s && s.term) || u.t.term, cat: (s && s.cat) || u.t.category }; });
  CAT_ORDER.forEach(c => {
    const terms = entries.filter(e => e.cat === c).sort((a, b) => a.term.localeCompare(b.term, 'en', { sensitivity: 'base' }));
    if (!terms.length) return;
    items += `<h4>${esc(CAT_TITLES[c])}</h4>`;
    terms.forEach(e => {
      items += `<div class="gt"><b>${esc(e.term)}</b> ${md(e.s ? e.s.def : e.t.definition)} <span class="go">${md(e.s ? e.s.from : e.t.origin)}</span></div>`;
    });
  });
  h += `<div class="colflow" data-cls="gls" data-balance="1">${items}</div>`;
  return h;
}

function sources(ctx, S) {
  let h = partHead('Sources', 'Sources', 'Where everything comes from', 'sources', 'The documents this edition draws on: what each one holds and where it lives.');
  // A two-column list: name and date, what it is, then where it lives (sourcesWhere: a place that changed after the reference edition).
  const where = S.sourcesWhere || {};
  h += `<div class="colflow" data-cls="srcs" data-balance="1">${ctx.sources.map(s => `<div class="si"><b>${esc(s[0])}</b> <span class="sdt">${esc(s[2])}</span><br>${md(s[3])}<span class="sp">${esc(where[s[0]] || s[1])}</span></div>`).join('')}</div>`;
  h += `<div class="note"><p>${md(S.sourcesNote || ctx.sourcesNote)}</p></div>`;
  h += H(2, 'How this compile was made', 'howmade') + (S.howMade || []).map(p => P(p)).join('');
  return h;
}

const strip = html => html.replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');

function build(ctx, S) {
  const main = [cover(ctx, S), howToRead(ctx, S), shortVersion(ctx, S), part1(ctx, S), part2(ctx, S), part3(ctx, S), part4(ctx, S)].join('\n');
  const src = sources(ctx, S);
  const used = pickTerms(ctx.gloss, strip(main + src), S.glossInclude, S.glossExclude);
  return { html: [main, glossary(ctx, S, used), src].join('\n'), used, text: strip(main + src) };
}

module.exports = { build, pickTerms, termForms, REF };
