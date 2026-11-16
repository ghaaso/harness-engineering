const fs=require('fs');const F=process.argv[2];let s=fs.readFileSync(F,'utf8');
function r(a,b){if(!s.includes(a))throw new Error('missing: '+a.slice(0,80));s=s.split(a).join(b);}
r(`"The design's four lookup turns per phase are about 0.5 % of the S04 build session's reading."`,`"The earlier knowledge-store design's four lookup turns per phase are about 0.5 % of the S04 build session's reading."`);
r(`"The design's flag for a symptom with several known causes kept the generic build error from returning a confident wrong lead."`,`"The earlier knowledge-store design's flag for a symptom with several known causes kept the generic build error from returning a confident wrong lead."`);
r(`"C1's fix stranded on a side branch is caught by the design's scan at each phase close."`,`"C1's fix stranded on a side branch is caught by the earlier knowledge-store design's scan at each phase close."`);
r(`title: 'The existing store design has no path between projects',`,`title: 'The earlier knowledge-store design has no path between projects',`);
r(`what: 'The earlier store design shows at most one lead`,`what: 'The earlier knowledge-store design shows at most one lead`);
r(`  p: ['d_deliver', 'k_fill'] });\nitem({ key: 'compaction_drops'`,`  p: [],\n  sh: ['partly', 'It acts through how the model counts time. Each period is worked out on the stocks at its start, so nothing written during a period helps that period. No setting sizes it.'] });\nitem({ key: 'compaction_drops'`);
// output field
r(`    contradicted, origin, params: it.p,`,`    contradicted, origin, params: it.p,\n    shown: it.sh ? it.sh[0] : 'yes',\n    not_shown: it.sh ? it.sh[1] : undefined,`);
r(`const item = (o) => I.push(o);`,`const item = (o) => I.push(o);\n// sh: ['no' | 'partly', reason]: the model cannot show the item, or shows only part of it (map refuter pass, MF6, SF8).`);
// works
const oldStart=s.indexOf('const WORKS = [');const oldEnd=s.indexOf('];',oldStart)+2;
const WORKS=`// [case, text, tag, basis, channel, caveat]
// tag/basis: 'M'/'seen' when the walk record shows it happen; 'G'/'estimate' when it is the walker's
// estimate of what would have happened (map refuter pass, MF4). channel: an existing channel that
// carried the saving (not the library). caveat: what the same walk says against the item.
const WORKS = [
  ['L01:C3a', 'A stored pdftoppm route served to the second wave would have saved 2 to 8 calls per agent across four Opus agents.', 'G', 'estimate', null,
    'The same walk rates capture as broken: no note anywhere ever recorded the route. It rates the trigger as not specified.'],
  ['L01:C4a', 'One git flag with an exact error template, served before cloning, would have saved the 15 failed clones of 11-04.', 'G', 'estimate', null,
    "The same walk rates the trigger as not specified and the afterlife as broken: the cause went away about three hours after the note. The walk's own first figure is zero to one call saved per agent."],
  ['L10:L10-3', 'The pushed Python note worked at no extra cost: three agents carried its remedy in the same command as the probe, on 11-09 and 11-12.', 'M', 'seen', 'a pushed note', null],
  ['L08:L08-1', 'The memory index put the long-paths fix into a sibling session before its first clone; that clone never failed.', 'M', 'seen', 'the memory index', null],
  ['L05:L05-4', "A lookup by the failing test's name would have hit the root's entry, saving a wrong fixture commit, its revert, stopped runs and one Opus review.", 'G', 'estimate', null, null],
  ['L05:L05-3', "The check held: an exact match to an old, fixed cause was tested, came back 'does not apply', and no wrong fix was applied.", 'G', 'estimate', null,
    "The check that held belongs to the earlier knowledge-store design, not to the owner's library design. The same walk rates the check step as broken: the only verdict on the failure was a rerun."],
  ['L06:C4', "After the first solve, a do-not-apply entry on the handoff's wrong advice stops a change that would let a 4-digit PIN be guessed without limit. CLAUDE.md already warns.", 'G', 'estimate', 'CLAUDE.md, which already warns', null],
  ['L06:C2', "The action words 'enable dispatcher' reach the stored hazard, preventing the replay measured at 36 messages about months-old jobs, plus permanent suppressed rows.", 'G', 'estimate', null, null],
  ['L03:C5', "The builder's own words 'offline presence outbox' reach the right entry; had a lookup fired, it saves three days of stuck badges and a rework commit.", 'G', 'estimate', null, null],
  ['L09:L09-2', 'A red check handed raw output to Fable, which fixed the defect in about a minute and wrote the rule, with its reason, within two minutes.', 'M', 'seen', "the project's own conventions file",
    'The same walk says a lookup would have saved nothing at the time: no entry could exist before the first failure, and the fix took about a minute.'],
  ['L09:L09-1', "The S02 entry, fetched at the S04 check, would have stopped the top tier's wrong premise: one finding's round trip saved.", 'G', 'estimate', null, null],
  ['L07:L07-4', 'A later change reused two stored traps and avoided at least two failed cloud builds; a later design reused one that cost about 15M helper tokens.', 'M', 'seen', 'CLAUDE.md and the stored design documents', null],
  ['L07:L07-5', "A design 'no' stored with its reason held for five months and was never argued again.", 'M', 'seen', 'the project documents',
    'The same walk rates use, capture and afterlife as broken, and notes that an older playbook still names the sign-in system the team turned down.'],
  ['L10:L10-1a', "The earlier knowledge-store design's scan for fixes not on the main branch fits June exactly: it removes one of build 15's two causes and 16 days of broken main.", 'G', 'estimate', null,
    "The scan is a mechanism of the earlier knowledge-store design, not of the owner's library design."],
  ['L10:L10-1b', 'The empty-value check promoted into the shared test run blocks that mistake for every agent and human, with no lookup.', 'M', 'seen', 'a check in the shared test run', null],
];`;
s=s.slice(0,oldStart)+WORKS+s.slice(oldEnd);
r(`const works = WORKS.map(([cs, text]) => {
  if (!WALK[cs]) fail('works: unknown case ' + cs);
  if (words(text) > 30) fail('works: over 30 words: ' + text);
  return { case: cs, family: WALK[cs] ? WALK[cs].family : null, tag: "M", text };
});`,`const works = WORKS.map(([cs, text, tag, basis, channel, caveat]) => {
  if (!WALK[cs]) fail('works: unknown case ' + cs);
  if (words(text) > 32) fail('works: over 32 words: ' + text);
  if (!['M', 'G'].includes(tag) || !['seen', 'estimate'].includes(basis) || (tag === 'M') !== (basis === 'seen')) fail('works: tag and basis disagree for ' + cs);
  if (caveat && words(caveat) > 45) fail('works: caveat over 45 words for ' + cs);
  return { case: cs, family: WALK[cs] ? WALK[cs].family : null, tag, basis, channel: channel || undefined, caveat: caveat || undefined, text };
});`);
r(`    'works lists places where the design worked or would have helped in a real case. Its figures (calls, days, messages) come from the walk records (tag M).',`,
`    'works lists savings the walks saw, or estimated would have come, in a real case. basis "seen" (tag M): the walk record shows it happen. basis "estimate" (tag G): the walker\\'s estimate of what would have happened. channel names an existing channel (CLAUDE.md, the memory index, a pushed note, project documents, a check in the shared test run) when that, not the library, carried the saving. caveat gives what the same walk says against the item.',
    'shown says whether the model can show the item: yes, partly or no. not_shown gives the reason. An item the model cannot show can still matter.',
    'The walks judged a step as working whenever the earlier knowledge-store design had a mechanism for it (walkthrough workflow, line 162). Text that relies on that design names it.',
    'Break titles are the walkers\\' own; frequency words in them are dropped, because the chosen sample cannot carry them.',`);
fs.writeFileSync(F,s);
