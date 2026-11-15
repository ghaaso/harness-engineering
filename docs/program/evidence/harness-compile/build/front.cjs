// Front matter: cover, contents, how to read, the short version. Written in the owner's voice.
'use strict';
const { P, H, UL, BOX, md, esc, meter } = require('./lib.cjs');

function cover(ctx) {
  const t = (v, l) => `<div class="tile"><div class="v">${esc(v)}</div><div class="l">${md(l)}</div></div>`;
  return `<div class="cover"><div class="band"></div>
  <div class="kicker">Harness programme · FixFlow and the clinic testbed</div>
  <h1>Our AI build harness: the ideas, the bottlenecks and the work</h1>
  <div class="sub">Every idea we have had for building software with AI agents, the problem each one is meant to solve, the bottlenecks our sessions found and sized, and the work packages we can now split across the team.</div>
  <div class="tiles">${t(ctx.counts.ideas, 'ideas, whatever their results so far')}${t(ctx.counts.themes, 'themes, one per kind of problem')}${t(ctx.counts.bottlenecks, 'bottlenecks in one register')}${t(ctx.counts.packages, 'work packages, each with an owner slot')}</div>
  <div class="cover-note">${md(ctx.coverNote)}</div>
  <div class="by"><b>Muhammad Bilal</b><br>${esc((ctx.lensText && ctx.lensText.date) || '13 November 2026')}<br>${esc((ctx.lensText && ctx.lensText.cover && ctx.lensText.cover.from) || 'Compiled from the sessions of 31 October to 13 November 2026')}</div></div>`;
}

function contents(ctx) {
  const row = (cls, label, id) => `<tr class="${cls}"><td>${md(label)}</td><td class="pg" data-toc="${id}"></td></tr>`;
  let r = '';
  r += row('part', 'How to read this', 'howto');
  r += row('part', 'The short version', 'short');
  r += row('part', 'Part 1 · What we are building', 'p1');
  r += row('sub', 'What I mean by the harness', 'p1-harness');
  r += row('sub', 'Where the ideas came from', 'p1-sources');
  r += row('sub', 'How it fits together: harness v2', 'p1-arch');
  r += row('part', 'Part 2 · The bottlenecks', 'p2');
  if (ctx.lensText) { r += row('sub', 'The seven metrics, and where we stand', 'p2-metrics'); r += row('sub', 'Which bottleneck limits which metric', 'p2-matrix'); r += row('sub', 'The bottlenecks, one by one', 'p2-blocks'); }
  r += row('sub', 'How we found them', 'p2-found');
  r += row('sub', 'Where the tokens go', 'p2-tokens');
  r += row('sub', 'The machine and the check', 'p2-machine');
  r += row('sub', 'The register at a glance', 'p2-glance');
  r += row('sub', 'The full register', 'p2-register');
  r += row('part', 'Part 3 · The ideas', 'p3');
  r += row('sub', 'All ideas at a glance', 'p3-overview');
  ctx.themes.forEach(t => { r += row('sub', `${t.code} · ${t.title}`, 'th-' + t.id); });
  r += row('part', 'Part 4 · Dividing the work', 'p4');
  r += row('sub', 'How the packages fit together', 'p4-map');
  r += row('sub', 'The work packages', 'p4-packages');
  r += row('sub', 'The assignment board', 'p4-board');
  r += row('sub', 'Decisions waiting on me', 'p4-decisions');
  r += row('sub', 'How we work', 'p4-rules');
  r += row('part', 'Glossary', 'gloss');
  r += row('part', 'Sources', 'sources');
  r += row('sub', 'How this compile was made', 'howmade');
  return `<div class="sec-start" data-part="Contents"><div class="partlabel">Contents</div><h1 id="contents">What is in here</h1><div class="rule"></div><table class="toc tocfull">${r}</table></div>`;
}

function howToRead(ctx) {
  const tag = (t, name, def) => `<tr><td style="width:12mm"><span class="tg" style="font-size:7.4pt">${t}</span></td><td style="width:30mm"><b>${name}</b></td><td>${md(def)}</td></tr>`;
  const lvl = (n, def) => `<tr><td style="width:44mm">${meter(n)}</td><td>${md(def)}</td></tr>`;
  return `<div class="sec-start" data-part="How to read this"><div class="partlabel">Before you start</div><h1 id="howto">How to read this</h1><div class="rule"></div>
  ${P('This is the one place where everything we have learned about our build harness sits together. I wrote it so that anyone on the team, including people who were not in the working sessions this record comes from, can pick a piece of work, see why it matters and see what has already been tried. Throughout, “I” is me and “we” is the team.', 'lead')}</div>
  <h3>Every number says how sure we are of it</h3>
  <table class="plain"><tbody>
  ${tag('M', 'Measured', 'Counted or timed on our own machine or in our own records.')}
  ${tag('E', 'Estimated', 'Worked out from measured data with a stated assumption.')}
  ${tag('G', 'Guess', 'A judgement, written down so a measurement can replace it.')}
  ${tag('S', 'Setting or outside figure', 'A configured value, or a number from an outside study or vendor.')}
  ${tag('T', 'Target', 'A bar we set for ourselves to clear.')}
  ${tag('I', 'Illustrative', 'An example that shows the arithmetic. It is not a result.')}
  </tbody></table>
  <h3>Every idea shows how far it has got</h3>
  <table class="plain"><tbody>
  ${lvl(1, '**Idea.** Proposed, or picked out of an outside source to try. Not yet designed.')}
  ${lvl(2, '**Designed.** Written into a design or plan with its test, or chosen for adoption. Not built yet.')}
  ${lvl(3, '**Built.** It exists, but has not been measured or is not switched on yet.')}
  ${lvl(4, '**Tested.** Measured, trialled or replayed, with results in. The results may be strong, modest or a lesson.')}
  ${lvl(5, '**In use.** Part of how we work today.')}
  ${lvl(0, '**Parked.** We chose not to pursue it for now, or a better idea replaced it. It stays in the record with the reason, so nobody has to rediscover it.')}
  </tbody></table>
  <h3>Ids, terms and sources</h3>
  ${UL((ctx.lensText ? ['**The seven metrics** are throughput, efficiency, token count, token cost, time taken, quality of output and hallucinations. Part 2 defines each, and every bottleneck and idea in this edition says which of them it moves. **Bottlenecks in Part 2** are numbered 1 to 11; each groups the register’s rows that share one cause. Six ideas came only from my chats and were added on 14 November: `PAR-22`, `TOK-44`, `MTH-66`, `MTH-67`, `MSR-49` and `MSR-50`.'] : []).concat([
    '**Ideas** are numbered by theme: `MAC-03` is the third idea in the machine theme. The twelve theme codes are listed on the first page of Part 3.',
    '**Bottlenecks** keep the ids given by the session that found them. `B01` to `B21` come from the bottleneck compile of 11 November. `R2`, `R4` and `B3-LOOP` are loops of harness v2 (our 11 November design for the whole harness, set out in Part 1) that are bottlenecks in their own right. `W1` to `W5` (weaknesses) and `L1` and `L3` (two of its three levers, not the four token levers of Part 2) come from the Dex Horthy sweep, our card-by-card study of Dex Horthy’s talks and writing, which scored every outside idea against them. Ids that start with `TK` (tokens), `LIB` (the library, the knowledge store and the graph test, our held-out test of a typed code store), `MC` (the machine and the check) or `PR` (process; not a pull request) were added in this compile for bottlenecks that had no id yet.',
    '**Loops** in the harness design are written as “loop R1” or “loop B2” in running text. Three loops are also bottlenecks with their own register ids: `R2`, `R4` and `B3-LOOP`. R marks a loop that feeds itself, B a loop that pushes back toward a limit.',
    '**Terms.** The first time a technical term appears it is explained in place. Every term is also in the glossary at the back, with a plain definition and where it comes from.',
    '**Sources.** Every idea and number traces back to a document or to my session notes. The sources page says where each one lives, including the documents not yet committed to the repository, and the evidence folder holds the extraction with a citation for each record. The last page says how this compile was put together and checked.',
  ]))}`;
}

function shortVersion(ctx) {
  const L = ctx.lensText;
  const k = L && L.short ? Object.assign({}, ctx.short, L.short) : ctx.short;
  const t = (v, l) => `<div class="tile"><div class="v">${md(v)}</div><div class="l">${md(l)}</div></div>`;
  const lead = L && L.shortLead ? L.shortLead.replace('This edition says', 'This reference edition says') : null;
  return `<div class="sec-start" data-part="The short version"><div class="partlabel">One page</div><h1 id="short">The short version</h1><div class="rule"></div>
  ${P(lead || 'I build software with AI agents. The harness is everything around them: how I split work into sessions, the checks that decide whether work is right, the memory that carries what we learn, the PC it all runs on, and how results come back to me. For two weeks we studied that harness directly: what slows it down, what each fix could be worth, and which outside ideas are worth borrowing. This is the whole record in one place, and it ends with the work split into packages people can own.', 'lead')}</div>
  <div class="tiles">${t(k.t1v, k.t1l)}${t(k.t2v, k.t2l)}${t(k.t3v, k.t3l)}${t(k.t4v, k.t4l)}</div>
  <div class="keypoints kpref">${k.points.map((p, i) => `<div class="kp"><div class="kpn">${i + 1}</div><div><b>${md(p.h)}</b> ${md(p.t)}</div></div>`).join('')}</div>
  ${BOX('callout', P(k.ask))}`;
}

module.exports = { cover, contents, howToRead, shortVersion };
