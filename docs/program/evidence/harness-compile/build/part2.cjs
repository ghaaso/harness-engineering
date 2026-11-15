// Part 2: the bottlenecks. How we found them, tokens, the machine and the check, the register.
'use strict';
const { P, H, UL, BOX, md, esc, figure, legend, table } = require('./lib.cjs');
const C = require('./charts.cjs');
const F = require('./figures.cjs');
const LENS = require('./short-lens.cjs');

// My view on lever 1 (a bare cap is not enough; the split proposal), taken from the lens text so both editions say the same.
const leversView = ctx => {
  const t = ctx.lensText && ctx.lensText.p2 && ctx.lensText.p2.leversShows;
  if (!t) return '';
  const lead = 'Every lever is a change to how we run sessions, not a new tool. ';
  return ' ' + (t.startsWith(lead) ? t.slice(lead.length) : t);
};

// Part 2's opening definition. Under the seven-metric lens a bottleneck is what limits a metric, as in the short edition.
const LEAD_OLD = 'A bottleneck is anything that keeps the harness from going faster: a limit it runs into, a step that waits, a defect that slips through, or a decision that waits on me. We ran sessions just to find these and to size them. This part shows what they found, how big each one is and what fixing it would unlock.';
const LEAD_LENS = 'A bottleneck is whatever limits one of the seven metrics I judge this work by. Most of them limit any team that builds with AI agents; the troubles of our own PC come last. This part gives where we stand on each metric and each bottleneck with what we measured, then how we found them, the token and machine measurements, and the full register.';

function part2(ctx) {
  const n = ctx.n;
  let h = '';
  h += `<div class="sec-start" data-part="Part 2 · The bottlenecks"><div class="partlabel">Part 2</div><h1 id="p2">The bottlenecks</h1><div class="rule"></div>
  ${P(ctx.lensText ? LEAD_LENS : LEAD_OLD, 'lead')}</div>`;

  if (ctx.lensText) h += LENS.lensSections(ctx, ctx.lensText, 'new');
  h += H(2, 'How we found them', 'p2-found');
  h += table([{ t: 'Session', w: '42mm' }, { t: 'Date', w: '20mm' }, { t: 'What it gave us' }], ctx.found.map(f => [`<span class="nm">${md(f[0])}</span>`, esc(f[1]), md(f[2])]));
  h += P('The bottleneck compile of 11 November sorted each of its bottlenecks into one of four classes, and the register (our joined list of every bottleneck, later in this part) keeps them: **Build** (we know the fix and it needs building), **Decide** (it waits on a decision from me), **Diagnose** (we need one measurement to find the cause) and **Trial** (we try a fix and measure it).');

  h += H(2, 'Where the tokens go', 'p2-tokens');
  h += P(`We counted every model call on this PC for both projects: ${n.calls} calls [M] and ${n.ctxTokens} context tokens [M]. The finding is simple and useful. **Token use is calls × window size.** ${n.reread} [M] of all tokens are the model re-reading a window it has already seen; what it writes is ${n.output} [M]. So the way to spend fewer tokens is fewer calls and smaller windows, not shorter answers.`);
  const wf = F.windowFill();
  h += figure(legend(wf.parts.map((p, i) => ({ color: C.CAT[i], name: p.name }))) + wf.svg,
    'Source: TOKEN-BOTTLENECK-2026-11.md, “What the windows hold”. Estimated from how the context grew between calls, weighted by re-reads; 5–8 % stays unclassified. [E]',
    'Each bar is one project’s context tokens split by what they were. **Wider = more of the tokens.**',
    'FixFlow’s largest share (47 % [E]) is the **fixed start** every agent re-reads; the clinic’s largest (31 % [E]) is the model’s **own earlier output** carried forward. Content fetched by reading, which indexes and knowledge stores aim at, is about a quarter in both.');
  h += P('The two projects show the same mechanism in two shapes. The clinic testbed ran **one big window**: its main sessions held 74 % [M] of its tokens at about 333k tokens per call. FixFlow ran **many small windows**: 1,118 agent windows [M] of about 12 calls each, and 56 % [E] of the tokens inside each agent window was its fixed start (47 % [E] across all of FixFlow’s calls, main session included), about 60k tokens [E], most of it the descriptions of tools and connectors (plug-ins that link Claude to outside services).');
  h += figure(legend([{ color: C.CAT[0], name: 'FixFlow' }, { color: C.CAT[1], name: 'Clinic testbed' }]) + F.levers(),
    'Source: TOKEN-BOTTLENECK-2026-11.md, “Levers, in order of size”. Lever 1 is a share of the cache-read tokens (the re-reads), the others of all context tokens. The shares overlap, so they do not add up.',
    'Four levers, each with the share of each project’s tokens it can act on. **Longer bar = more room to save.** This is exposure, not a promised saving.',
    'Every lever is a change to how we run sessions, not a new tool. Lever 1 matters most for the clinic’s long windows, lever 2 for FixFlow’s many agents.' + leversView(ctx));
  h += BOX('note', P('**Checked and ruled out.** These looked like suspects and are not: the **model mix** (routing changes the price per token, not the count), **file reads** (re-reading a file inside the same window is only 0.5–1.5 % [M]), **any one file** (the busiest is 1.5 % [M] of its project’s tokens) and **my prompts** (231 [M] real prompts across both projects, about 155 [E] calls for each). The usage is in the agents’ own automated steps, which is good news: steps are what we control.') +
    P('**Still to learn.** How re-read tokens count against the plan’s five-hour limit is unknown to us. Until we know, we treat a cut in tokens as a saving in usage and measure separately whether it also means fewer stops.'));

  h += H(2, 'The machine and the check', 'p2-machine');
  h += P(`The clinic testbed ran ${n.clinicCommits} commits and ${n.clinicMerges} merges in eight working days on one PC [M]. Its record shows where the time went and, better, where we have already won a lot of it back.`);
  h += figure(F.wins(), 'Sources: HARNESS-BOTTLENECKS-2026-11.md and its evidence folder (machine-facts.md); HARNESS-V2-DESIGN-2026-11.md. The page factor divides the midpoints of 9–13 s and 0.1–0.5 s, so it is an estimate: anywhere from about 18× to 130× [E].',
    'Each bar is the new time as a share of the old one. **Shorter bar = bigger win.** The factor on the right is old ÷ new.',
    'Every one of these was built and measured on our own PC. They are ready to carry from the testbed into FixFlow.');
  const tl = (v, l) => `<div class="tile"><div class="v">${md(v)}</div><div class="l">${md(l)}</div></div>`;
  h += `<div class="tiles">${tl('24 [M]', 'unexpected shutdowns of the PC, 7 October to 10 November')}${tl('2.8 [M]', 'review rounds per slice; 64 % [M] of reviews sent work back')}${tl('2,030 s [M]', 'longest wait for the one check slot')}${tl('~70k [M]', 'tokens every clinic testbed agent re-read before doing any work')}</div>`;
  h += P('The first three numbers set the agenda for the first three phases of harness v2; the fourth, the ~70k every agent re-reads, is work for the token budget (phase 5, WP5). The machine comes first because everything stands on it: of the 25 power-offs [M] logged from 1 October to 11 November (a longer window than the 24 above), 15 [M] came with no Claude call in any project in the ten minutes before, so the cause is still to be found. The protections are known and cheap: no sleep on mains power, an always-on sensor logger, a resume list that brings sessions back two at a time and a verified copy of the work off the PC. Working from separate worktrees already pays: when the power went for 28 minutes on 13 November, eight FixFlow lanes were cut off mid-turn and all of them resumed from their worktrees [M]. The check comes second because that is where the measured wins already are, and the review rounds come third, as scripts that cost no tokens.');

  h += H(2, 'The register at a glance', 'p2-glance');
  h += P(`The register joins every session’s bottlenecks into one list of ${ctx.reg.length}. Duplicates found by more than one session are merged, and each keeps the id its first session gave it.`);
  h += figure(ctx.regGlanceSvg, ctx.regGlanceCap, ctx.regGlanceHow, ctx.regGlanceShows);
  if (ctx.clinicGridSvg) h += figure(ctx.clinicGridSvg, 'Source: HARNESS-V2-DESIGN-2026-11.md §3. Class and phase as set by the compile of 11 November.', 'The 21 clinic bottlenecks, placed by the harness v2 phase that answers them. **Each chip is one bottleneck; its colour is its class.**', 'Every one of the 21 has a home in the first four phases, a first step and a test that will show whether it is solved.');

  h += H(2, 'The full register', 'p2-register');
  h += P('Sorted by family. Under each name: its family, its class where the bottleneck compile gave one, and the work package that answers it. “What fixing it unlocks” is the size of the prize as the source states it.');
  h += table([{ t: 'Bottleneck', w: '40mm' }, { t: 'What it is, and how big' }, { t: 'What fixing it unlocks', w: '44mm' }, { t: 'State and first step', w: '42mm' }],
    ctx.reg.map(b => [`<span class="iid">${esc(b.id)}</span><span class="nm">${md(b.name)}</span><span class="org">${esc(b.familyTitle)}${b.cls ? ' · ' + esc(b.cls) : ''}${b.wp ? ' · ' + esc(b.wp) : ''}${ctx.lensText && LENS.movesLine(ctx, b.id) ? '<br>Limits: ' + esc(LENS.movesLine(ctx, b.id)) : ''}</span>`, md(b.what) + (b.evidence ? `<span class="sub" style="margin-top:0.8mm">${md(b.evidence)}</span>` : ''), md(b.potential), `<span class="lbl">${esc(b.state)}</span>${md(b.first_step)}`]), { cls: 'reg' });
  return h;
}

module.exports = { part2 };
