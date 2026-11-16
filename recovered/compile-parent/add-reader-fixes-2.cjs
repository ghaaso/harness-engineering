// Appends the Part 4 and front-matter readers' data-side fixes to data/reader-fixes.json.
// Usage: node add-reader-fixes-2.cjs <path to reader-fixes.json>
'use strict';
const fs = require('fs');
const f = process.argv[2];
const rf = JSON.parse(fs.readFileSync(f, 'utf8'));

const lit = [
  ['and an unknown token window', 'and an unknown token budget per five-hour window'],
  ['The compile\'s refuters', 'The bottleneck compile’s refuters'],
  ['Roles in the compile\'s section 9 workflows.', 'Roles in the bottleneck compile’s section 9 workflows.'],
  ['Coined by us in compile sections 4 and 9.3.', 'Coined by us in the bottleneck compile, sections 4 and 9.3.'],
  ['Coined by us in the compile, for bottleneck B15.', 'Coined by us in the bottleneck compile, for bottleneck B15.'],
  ['367k tokens [S]', '367k tokens [M]'],
  ['compacts near 367k [S]', 'compacts near 367k [M]'],
  ['the free recurrence audit', 'the recurrence audit'],
  ['the free git-history audit', 'the git-history audit'],
  ['A free audit and my yes come first', 'The recurrence audit and my yes come first'],
  ['the free audit', 'the recurrence audit'],
  ['Nothing we built has run on a real host, so', 'So far everything we built has run only on my PC, so'],
  ['I allowed one tool (decision D05).', 'I allowed a sensor logger and a debugger (decision D05).'],
  ['A slot is one heavy-job permit (3 [S], or 2 [S] during Gradle).', 'Since 13 November it has two pools: a light pool of 3 [S] slots for backend gate stacks, and a heavy pool of 2 [S] for Jest, Vitest, an emulator or a Gradle build, which takes its whole pool.'],
  ['Waits on D17 (hooks stay off)', 'Waits on harness decision D17 (hooks stay off)'],
];

const glossary = {
  'g1-95': {
    term: 'Bottleneck compile (11 November)',
    definition: 'Our map of the 21 [M] clinic bottlenecks B01 to B21, each with a class, a first step and a proof, and of how the outside ideas fit them, in docs/program/HARNESS-BOTTLENECKS-2026-11.md. Not this document, which compiles everything.',
    origin: 'Coined by us, 11 November 2026.',
  },
  'g2-163': {
    definition: 'A machine-wide permit to run the clinic’s full check, so heavy checks wait their turn instead of colliding on this PC. The clinic set up two [S] slots but opened the second only when 8 GiB [S] of memory was free, which never happened, so in practice it had one, with waits up to 2,030 s [M]. FixFlow’s equivalent is a slot of ff-slot.sh (see ff-gates.sh / ff-slot.sh / slot).',
  },
  'g2-184': {
    definition: 'My numbered decisions on the clinic board: 21, the root may start the next slices itself; 22, approve a parallel-test dependency; 23, use the machine and a Linux container; 24, wrap up the build.',
  },
  'g3-248': {
    term: 'KS-D1 to KS-D22 (knowledge-store decisions)',
    definition: 'My numbered decisions in the knowledge-store design, each with a default: KS-D1 run the recurrence audit, KS-D1b the build go-ahead, KS-D16 the embedding trigger, KS-D17 the CI caller-pin test, KS-D22 guarded_refs. The design writes them D1 to D22; this compile adds KS- so they never mix with the harness decisions D01 to D23.',
  },
  'add-35': {
    definition: 'Proposed: Docker starts at sign-in, the databases in use restart themselves, and the check starts its own database if missing, so work resumes after a power-off without commands. Parked for now, because I chose to keep Docker’s start at sign-in off (D03); the resume list therefore starts with “start Docker”.',
  },
  'g2-145': { term: 'Findings register / register id' },
};

const addTerms = [
  { key: 'rd-32', term: 'Register (bottleneck register)', category: 'our-harness',
    definition: 'The one list of every bottleneck our sessions found, 128 [M] in all, joined and de-duplicated in Part 2; each row has a family, a state and the work package that answers it. Not the findings register of FixFlow’s reviews.',
    origin: 'This compile, 13 November 2026. It joins the bottleneck compile’s B01 to B21, the harness v2 loops, the Dex Horthy sweep’s weaknesses and levers, and the ids added here.' },
  { key: 'rd-33', term: 'Sweep', category: 'our-harness',
    definition: 'A study that goes through one outside body of work idea by idea (each idea a card), scores every idea against our own weaknesses, sends the scores to refuters and sorts the survivors into adopt, trial and drop lists. We ran two: BAML (PR #184) and Dex Horthy (PR #186).',
    origin: 'Our own term, from the sweeps of 4 and 9 November 2026.' },
  { key: 'rd-34', term: 'Harness v2', category: 'our-harness',
    definition: 'Our 11 November design for the whole harness: eight parts (planner, scheduler, governor, lanes, gate, merge queue, library and machine), the feedback loops between them, five phases, eleven mechanisms and decisions D01 to D23. Part 1 sets it out.',
    origin: 'docs/program/HARNESS-V2-DESIGN-2026-11.md, 11 November 2026.' },
  { key: 'rd-35', term: 'Graph test', category: 'our-harness',
    definition: 'Our held-out test of whether a typed code store (see that entry) finds what a change will touch better than search and simpler baselines, on commits the test had never seen. The typed store gained +0.076 [M] recall overall, with the gain in the mobile app.',
    origin: 'docs/program/GRAPH-TEST-RESULT-2026-11.md, 12 to 13 November 2026.' },
  { key: 'rd-36', term: 'Tracing (test start-up)', category: 'general-cs',
    definition: 'Recording where a program spends its time, step by step, so the slow part can be found and cut. Tracing the clinic’s test start-up showed what to cut and made start-up 3.7× faster [M].',
    origin: 'General software practice, also called profiling; used in the clinic testbed’s faster-check work.' },
  { key: 'rd-37', term: 'Frozen validation contract', category: 'our-harness',
    definition: 'A test sealed before any map or store is built: 5 [S] cases, 3 arms (a map, routed reading and Graphify), 2 [S] runs each and blind scoring; an arm counts as better only with a gap of 0.10 [S] in 4 of 5 cases. It keeps a pilot from being judged by rules chosen after the results.',
    origin: 'Our library and graph-test work (idea MSR-18), kept by WP8.' },
  { key: 'rd-38', term: 'Quiet window (quiet machine)', category: 'our-harness',
    definition: 'A time when no FixFlow phase is running or waiting on its reviewer and no heavy check holds a slot on this PC, so a harness check or agent run cannot slow the ship lanes.',
    origin: 'Our own term in this compile, from the harness v2 rule that the ship plan comes first.' },
  { key: 'rd-39', term: 'Ticket queue', category: 'fixflow',
    definition: 'The first-come order of FixFlow’s slot lock (ff-slot.sh): each waiting job drops a ticket and is served in arrival order. A light job may pass a heavier one only until the heavier one has waited 900 s [S], so neither kind can starve.',
    origin: 'docs/program/lab/ff-slot.sh, added on 13 November 2026 after one lane waited 20 minutes [M] while later arrivals were served.' },
  { key: 'rd-40', term: 'MSYS_NO_PATHCONV', category: 'machine',
    definition: 'A Git Bash setting that stops it rewriting arguments that look like Unix paths into Windows paths. With it set, paths are written as C:/… .',
    origin: 'MSYS2, the Unix layer under Git for Windows.' },
  { key: 'rd-41', term: 'core.longpaths', category: 'machine',
    definition: 'A git setting that lets Git for Windows create files whose full path is longer than Windows’ old limit of 260 characters. We pass it per command (git -c core.longpaths=true) when cloning into scratch folders.',
    origin: 'Git for Windows.' },
  { key: 'rd-42', term: 'Limit episode', category: 'our-harness',
    definition: 'One time the five-hour usage limit stopped agent work. October had 14 [M].',
    origin: 'Our harness review and token measurement.' },
  { key: 'rd-43', term: 'Atomic rename', category: 'general-cs',
    definition: 'Replacing a file by writing the new version beside it and renaming it over the old one in a single step, so anything reading the file sees either the whole old version or the whole new one, never half of each.',
    origin: 'Standard file-system practice; FixFlow’s gate scripts land changes this way so a running lane never reads a half-written script.' },
  { key: 'rd-44', term: 'Save-as-run rule', category: 'our-harness',
    definition: 'Every workflow is saved as a script before it runs, so it can be re-run and its result checked against the saved version.',
    origin: 'Our orchestration design; adopted through WP10a.' },
];

let nl = 0, ng = 0, nt = 0;
const have = new Set(rf.lit.map(p => p[0]));
lit.forEach(p => { if (!have.has(p[0])) { rf.lit.push(p); nl += 1; } });
Object.entries(glossary).forEach(([k, v]) => { rf.glossary[k] = Object.assign({}, rf.glossary[k] || {}, v); ng += 1; });
const haveT = new Set(rf.addTerms.map(t => t.key));
addTerms.forEach(t => { if (!haveT.has(t.key)) { rf.addTerms.push(t); nt += 1; } });
fs.writeFileSync(f, JSON.stringify(rf, null, 1) + '\n');
console.log('lit +' + nl, 'glossary', ng, 'terms +' + nt, 'totals', rf.lit.length, Object.keys(rf.glossary).length, rf.addTerms.length);
