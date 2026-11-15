// Fixed text of the compile, in the owner's voice. Numbers carry their tags; sources are named where used.
'use strict';

const n = {
  calls: '35,834', ctxTokens: '7.35 billion', reread: '97 %', output: '0.75 %',
  clinicCommits: '432', clinicMerges: '65',
};

const v2 = {
  parts: [
    ['Planner', 'Works out, before any work starts, which slices can run side by side and how many lanes are worth running.', 'loop B5, lanes at the knee'],
    ['Scheduler', 'Turns the plan for a **wave** (a set of slices run together) into running sessions, and brings them back after a stop.', 'loop R4, the pile-up'],
    ['Governor', 'Keeps the five-hour usage window from stopping everything: it slows lanes before the limit does.', 'loop B3, the limit stop; loop R2, context growth'],
    ['Lanes', 'Where the work is written. Each lane is a session that asks the library before it explores and leaves its results on disk.', '–'],
    ['Gate', 'Decides whether a slice is good, by tests it runs itself.', 'loop R1, the fix spiral; loop B1, check capacity'],
    ['Merge queue', 'The one place where work is serial. It is a script, so the serial part is short.', 'loop B2, the serial gate'],
    ['Library', 'The harness’s memory. Written by the tools at the moment something becomes true. Sessions look things up in it when they need to, and it never pushes text into their context.', 'loop R3, the library compounds; loop B4, staleness'],
    ['Machine', 'Power, restart, the off-machine copy and one always-on sensor logger. Everything above stands on it.', '–'],
  ],
  loops: [
    ['R1', 'The fix spiral', 'A fix adds new stored state (a hold, lock, marker or cutoff), and one of the ways that state can end is never tested. That becomes a new defect, which needs another fix and another check.', '2.8 [M] review rounds per slice; 64 % [M] of reviews sent the slice back.'],
    ['B1', 'Check capacity', 'Every round needs the check, and the check can run only as many rounds at once as it has slots, each taking a full run time. Past that, lanes queue.', 'One slot in practice (a second opened only with 8 GiB [S] free, which never happened) and 367 s [M] per run on Windows. Longest wait 2,030 s [M].'],
    ['B2', 'The serial gate', 'Review and merging pass through something that takes one at a time. Nothing leaves faster than that.', 'The orchestrator briefed reviewers, read the last diff, ran the check twice and edited the wave board by hand.'],
    ['B3', 'The limit stop', 'Tokens rise with the lanes working and the context each carries. At the five-hour window’s limit every lane stops at once.', '14 [M] limit episodes in October; ten lanes run at once hit the limit within about 15 minutes [M].'],
    ['R2', 'Context growth', 'Every call re-reads the whole context and adds to it, so each call costs more than the one before.', 'Sessions on Sonnet ran to 963k tokens [M]; sessions on Opus compacted near 367k [M].'],
    ['R4', 'The pile-up', 'A waiting lane still holds its context. Waiting costs tokens, tokens bring the stop sooner, and after a stop everything restarts at once and waits again.', 'All sessions were released together on 9 November; one check then waited 2,030 s [M].'],
    ['R3', 'The library compounds', 'Each merged slice writes what it learned. The next session asks the library before it explores, so it reads less, finishes sooner and writes more.', 'Not built yet. This is the loop we most want to start.'],
    ['B4', 'Staleness', 'Code changes. An entry whose files changed is not trusted until its check runs again, so the library never fills with things that are no longer true.', 'On the wave board, 183 [M] minor findings had no status.'],
    ['B5', 'Lanes at the knee', 'More lanes help only until the lowest limit. Past it they add queues, tokens and collisions, and no speed.', 'Lanes were chosen by feel and nothing checked for collisions; for the first two slices, the first check on merged main failed on hand edits to shared documents [M].'],
  ],
};

const found = [
  ['Harness review, with gates G1 and G2', '1 Nov', 'What carries over from the clinic testbed to FixFlow. G1 and G2 are the checkpoints where I judged the discovery and the deep dive before anything moved on.'],
  ['Outside sweeps: BAML and Dex Horthy', '4 and 9 Nov', 'Every idea in two outside bodies of work, scored against our known weaknesses, attacked by refuters, and sorted into adopt, trial and drop lists.'],
  ['Bottleneck compile', '11 Nov', 'The 21 clinic bottlenecks `B01`–`B21`, each with a class, a first step and a proof, and the 87 [M] kept outside ideas mapped onto them: 29 [M] fit a bottleneck.'],
  ['Harness v2 design', '11 Nov', 'The architecture, five phases, eleven mechanisms and 23 decisions that answer the 21, plus the one budget that keeps the remedies from recreating the usage-limit stops.'],
  ['Token measurement', '12 Nov', 'Every model call on this PC counted once: where 7.35 billion context tokens [M] went, and four levers in order of size. An independent re-count agreed within 0.3 % [M].'],
  ['Library review and pathway map', '12–13 Nov', 'The limitations of the library (our reasoning cache) and a model of every path from “an entry exists” to “the cheap model gets it right”.'],
  ['Graph test, held-out', '12–13 Nov', 'Whether a typed code store finds the files a change will touch better than search and simpler baselines, on commits the test had never seen.'],
  ['Ship plan §7 and the lab', '13 Nov', 'FixFlow’s parallel lanes: check slots, heavy builds that run alone, the merge lock and the lab’s Android emulator.'],
];

const short = {
  t1v: '7.35 B [M]', t1l: 'context tokens counted call by call, so we know where they go',
  t2v: '3.0× [M]', t2l: 'faster check from running tests in parallel, already won',
  t3v: '0.700 [M]', t3l: 'of a change’s files and definitions found within an 8,000-token answer by a typed code store, against 0.625 [M] by a scripted search',
  t4v: '15', t4l: 'work packages, each with a goal, a first deliverable and an empty owner slot',
  points: [
    { h: 'Tokens go to re-reading, so we know where to cut.', t: '97 % [M] of our context tokens were the model re-reading a window it had already seen. Four changes to how we run sessions act on most of that, and none needs a new tool.' },
    { h: 'Our biggest measured wins are in the check, and they are ready to carry over to FixFlow.', t: 'Running the tests in parallel made the check 3.0× faster [M], a Linux container made it 1.6× faster [M], and tracing where test start-up spent its time made start-up 3.7× faster [M]. All were built and measured on our own PC.' },
    { h: 'The machine is the foundation, and its protections are known.', t: '24 unexpected shutdowns [M] taught us to protect the work first: no sleep on mains power, an always-on sensor logger (power, temperature and memory), a resume list that brings sessions back two at a time, and a verified copy off the PC. When the power went for 28 minutes on 13 November, all eight FixFlow lanes resumed from their worktrees [M].' },
    { h: 'Review moves into scripts.', t: 'Eleven mechanisms answer the review and merge bottlenecks, from a sealed replay to a merge queue that checks who read the final commit. Eight of them cost no model tokens, and each must pass a replay on our own record, planted cases or a trial before it may refuse anything.' },
    { h: 'Structured code knowledge helps, so far in the mobile app.', t: 'On commits it had never seen, a typed code store found more of the files and definitions a change really touched than a scripted search did: +0.076 overall [M] (from unrounded scores), with the gain in the mobile app (+0.151 [M]). Outside the mobile app it is too close to call so far. Next comes a zero-token index replay; the agent-in-the-loop test I asked for follows under a written budget once I settle GT-1.' },
    { h: 'Memory has a design and a map.', t: 'The library and the knowledge store are designed end to end. The pathway map shows the three conditions under which the library pays, so we know what to measure first; nothing is built until we agree its limitations.' },
    { h: 'The work splits cleanly.', t: 'Sixteen packages, each with a goal, a first deliverable and a “done when”. Seven can start today, six more start the day I give my word on them, and three follow another package: the clinic check follows the machine work, first use follows the check, and the planner follows the measurements.' },
  ],
  ask: '**What I need from you.** Read this page and Part 4, take a package (two people can share one) and write your name on its card. Parts 2 and 3 are the reference for your package: the bottlenecks it answers and every idea we already have for it.',
};

const rules = [
  ['Seven metrics first, and chats count', 'Every bottleneck and idea names the metric it moves (throughput, efficiency, token count, token cost, time taken, quality of output, hallucinations) and the number we have for it; where there is no number yet, we say so. An idea said only in chat is recorded with its session and line.', 'My correction of 14 November'],
  ['The ship plan comes first', 'FixFlow’s next phase is never delayed or edited for harness work. Harness work takes neither the Docker gate nor agent lanes while a FixFlow phase is running or waiting on its reviewer: the gate shares this PC’s memory and slots, and the agents share the same usage limit.', 'Harness v2, standing rules'],
  ['One budget', 'Lanes two at a time. A token budget written down before any launch. One change that adds agents per five-hour window. Stop starting agents after the first empty result, which can signal a usage limit.', 'Harness v2, §6'],
  ['Script before agent', 'Models find things; scripts decide whether a finding is closed. A check a script can make is never left to a model.', 'Harness v2, standing rules'],
  ['Replay before live', 'A gate or review mechanism is accepted by a replay on our own record wherever one is possible, and runs record-only before it may refuse anything.', 'Harness v2, standing rules'],
  ['One fact, one command', 'A fact about this PC or the tools becomes a rule only after one command has checked it. Our first list carried five facts that turned out wrong.', 'Harness v2, mechanism 7'],
  ['My yes for anything that reaches outside', 'No hooks, installs, scheduled tasks, permission changes, deletes, rented hosts or anything leaving this PC without my decision.', 'Harness v2, standing rules'],
  ['Discover without judging, and cite everything', 'Discovery agents extract what the sources say, each claim with a citation in the form `path:line — quote`. Ranking and verdicts come later, from someone else.', 'Orchestration design'],
  ['A fresh pair of eyes before a decision', 'Anything that becomes a decision is checked by a fresh-context skeptic told to refute it, booked like any other agent run; D07 itself, a zero-token proposal that comes before any agent budget, gets my own review. Verdicts are confirmed, partly confirmed, refuted or unverifiable, and an unverifiable one names what would settle it.', 'Orchestration design, verification policy'],
  ['The right model for the step', 'The orchestrating session plans and judges; Sonnet discovers and maps; Opus deep-dives and verifies; Haiku looks things up. A step gets the cheapest model that passes.', 'Orchestration design, tier guide'],
  ['Tag every number', 'Measured, estimated, guess, setting, target or illustrative. A computed number takes the weakest tag of its inputs.', 'Bottleneck compile and library pathways'],
  ['Test the best form of an idea', 'Research and build the strongest version, compare like with like, define the scoring before the run, and fix anything that would handicap one arm instead of noting it as a limitation.', 'My feedback to the sessions'],
  ['Answer the question that was asked', 'Test the architecture as I described it, with the popular tool itself as one arm. A clean answer to a narrower question is not the answer.', 'My feedback to the sessions'],
  ['State lives on disk, in the repo', 'Plans, results and decisions are files, so a stopped session can resume and anyone can pick up a package.', 'Orchestration design; harness v2'],
];

module.exports = { n, v2, found, short, rules };
