// Part 1: what we are building. The harness, where the ideas came from, harness v2.
'use strict';
const { P, H, UL, BOX, md, esc, figure, table } = require('./lib.cjs');
const F = require('./figures.cjs');

function part1(ctx) {
  let h = '';
  h += `<div class="sec-start" data-part="Part 1 · What we are building"><div class="partlabel">Part 1</div><h1 id="p1">What we are building</h1><div class="rule"></div>
  ${P('FixFlow is the product. The harness is how we build it. This part says what the harness is, where our ideas came from, and the design that ties them together.', 'lead')}</div>`;

  h += H(2, 'What I mean by the harness', 'p1-harness');
  h += P('When I say **harness** I mean everything we wrap around the AI models to build software with them:');
  h += UL([
    '**Sessions and agents.** A session is one conversation with Claude Code, Anthropic’s coding tool, which reads and edits code and runs commands on our PC. A session can start **subagents** (helpers that each begin with a fresh context) and **workflows** (scripts that run many subagents to a fixed plan).',
    '**Checks and gates.** The test runs and reviews that decide whether a piece of work is good enough to merge into the main line of code.',
    '**Memory.** Whatever carries what we learned from one session to the next: notes, the library we have designed, the knowledge store.',
    '**The token budget.** A **token** is the unit a model reads and writes in, a short piece of text: a common word is often one token, a long word several. The **context window** is everything the model holds in mind for one call, and it re-reads the whole window on every call. Our Claude plan allows a limited amount of use in each five-hour window, so tokens are the resource every part of the harness shares.',
    '**The machine.** The one PC everything runs on: its power, memory, disk and Docker (the tool that runs our databases and Linux test runs in containers).',
    '**How results reach me.** Reports, visual pages and decision forms.',
  ]);
  h += P('The word comes from software testing, where a test harness is the code that runs the tests. Teams that build with AI agents now use it for the whole system around a model.');

  h += H(2, 'Where the ideas came from', 'p1-sources');
  h += P('Two of our own projects feed this record:');
  h += UL([
    '**FixFlow**, the workshop management system we are building for a home-appliance repair shop in Karachi: a web app for the manager, an Android app for technicians and a backend in FastAPI (a Python web framework). Its build is laid out in the **ship plan**, the document that orders FixFlow’s work into phases (P0a, P0b and on).',
    `**The clinic testbed**, an earlier large build on this same PC that we used to push the harness hard: ${ctx.n.clinicCommits} commits and ${ctx.n.clinicMerges} merges in eight working days [M]. Most of our measured bottlenecks come from its record.`,
  ]);
  h += P('Two outside sources were studied card by card: talks and writing by **Dex Horthy** of HumanLayer, author of “12-Factor Agents” and of “Advanced Context Engineering for Coding Agents”, and **BAML**, BoundaryML’s language for typed model calls. The glossary says more about each.');
  h += figure(F.timeline(), 'Dates are when each document or result was written. Sources are listed at the back.', 'Each dot is a session or document that produced ideas or measurements. **Read left to right.**', 'Most of the record was written in the last five days, once the clinic testbed’s record was large enough to study as a whole.');

  h += H(2, 'How it fits together: harness v2', 'p1-arch');
  h += P('On 11 November we put what we had learned into one design, **harness v2**. It treats the harness as one machine with four scarce things: time on the check, review, the one-at-a-time merge, and tokens per five-hour window. Each scarce thing gets a part that controls it.');
  h += BOX('callout', P('**Speed = lanes × what one lane delivers, until the lowest limit.** A **lane** is one session building one slice of work. More lanes help only until the first of the four limits is reached. Past that point, the **knee**, they add queues, tokens and collisions, and no speed.'));
  h += figure(F.architecture(), 'Source: HARNESS-V2-DESIGN-2026-11.md §0 and harness-v2/architecture.json.', 'Boxes are the parts of the harness; arrows show what flows between them. The blue labels name the loops each part controls.', 'Every part has a single job. The library feeds every other part, and everything stands on the machine.');
  h += H(3, 'The parts and what each one controls');
  h += table([{ t: 'Part', w: '24mm' }, { t: 'Its job' }, { t: 'Controls', w: '44mm' }], ctx.v2.parts.map(p => [`<span class="nm">${esc(p[0])}</span>`, md(p[1]), md(p[2])]));
  h += H(3, 'The loops');
  h += P('The loop labels come from **system dynamics**, the method Jay Forrester began at MIT in the 1950s for studying systems as stocks, flows and feedback. A reinforcing loop (R) feeds itself: more of it makes more of it. A balancing loop (B) pushes back toward a limit.');
  h += table([{ t: 'Loop', w: '13mm' }, { t: 'Name', w: '30mm' }, { t: 'What happens' }, { t: 'What we saw in the testbed', w: '50mm' }], ctx.v2.loops.map(l => [`<span class="iid">${esc(l[0])}</span>`, `<span class="nm">${esc(l[1])}</span>`, md(l[2]), md(l[3])]));
  return h;
}

module.exports = { part1 };
