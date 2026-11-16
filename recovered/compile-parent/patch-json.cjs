// Applies the Part 4 and front-matter reader fixes to the hand-written JSON files.
// Each entry: [file, path (array), expect (substring of the old value, or null), new value].
// Usage: node patch-json.cjs <data-dir>
'use strict';
const fs = require('fs'), path = require('path');
const DATA = process.argv[2];
const P = (id, f, expect, v) => ['packages.json', ['packages', { id }, f], expect, v];
const D = (id, f, expect, v) => ['packages.json', ['decisions', { id }, f], expect, v];
const T = (f, expect, v) => ['packages.json', [f], expect, v];
const B = (i, expect, v) => ['packages.json', ['before', i, 1], expect, v];

const edits = [
  T('lead', 'every idea that is still live', 'This part turns the record into work. Fifteen packages between them carry every bottleneck in the register and every idea in Part 3. Each card says what the package is for, where it works, its first deliverable, how we will know it is done and what it waits on. Six can start today, six start the day I give my word, and three follow another package. Before you take one, read the box under the map: it holds the few rules that keep two people, two projects and one PC from getting in each other’s way.'),
  T('mapShows', 'The left column', 'The left column needs no decision from me, no agents and no Docker gate for its first deliverable, so it can start today. The middle column waits on a word from me, and the right column on a deliverable of another package. WP2a’s side-by-side runs need only a quiet machine, so they can start sooner.'),
  T('decLead', 'Every open decision', 'Every open decision with an id, in one place; go-aheads and permission yeses that have no id are on each card, under “Waiting on me”. Bold marks the option the source design recommends; where nothing is bold, there is no recommendation yet. I answered D01 to D06 on 11 November: yes to phase 1, an encrypted external drive for the copy, Docker’s start at sign-in stays off for now, no sleep on mains power, a sensor logger and a debugger are allowed, and sessions come back from a resume list two at a time. Only D05’s power-cut notes are still to come.'),
  B(1, 'look at the lane board', 'Before you use the Docker gate or start an agent, look at the lane board in `docs/program/W0-results.md` on the plan branch. If a FixFlow phase is running or waiting on its reviewer, harness work that needs the gate or agents waits.'),
  B(2, 'The two-lane cap', 'The two-lane cap and the written token budget (D07) are shared by all of us, not per person. Any Claude session that draws on my plan counts as one of the two lanes, your own working session included. Book agent runs in the shared queue and launch nothing on your own; WP11 sets the queue up first, and until it exists a run waits for my yes. The cap is for harness work; FixFlow’s lanes follow the ship plan’s own rule.'),
  B(3, 'Both projects share', 'Both projects share this PC’s 31 GB [M] of memory, so a heavy check from either project takes a slot from FixFlow’s machine-wide lock, `ff-slot.sh`, like any FixFlow job. That lock is the one shared limit. Leave its pools and slot counts as they are; WP2b may propose how waiters are ordered, not how many run.'),
  B(4, 'sends a proposal', 'A package that would change the ship plan, the lane board or FixFlow’s gate scripts sends a proposal to the coordinator. The coordinator brings it to me, and once I say go, the coordinator writes it.'),
  B(5, 'MSYS_NO_PATHCONV', 'Never prune Docker networks or restart Docker: other sessions run containers. Anything that needs its own Docker network gets an explicit subnet inside 10.77.0.0/16. With `MSYS_NO_PATHCONV` set (the Git Bash setting that stops it rewriting paths), write paths as `C:/…`. Clone into scratch folders with git’s `core.longpaths` setting on (`git -c core.longpaths=true`), because Windows otherwise refuses long file paths. There is no `python` on PATH; our scripts run with Node. Never touch the antivirus.'),

  P('WP1', 'goal', 'finally tells us', 'No power-off costs us work or a day. The work is copied off the PC every night, sessions come back from a resume list, and an always-on sensor logger records power, temperature and memory, so the next power-off can be diagnosed. This is harness v2 phase 1.'),
  P('WP1', 'first', 'six [M] folders', 'Today: the bundle-and-verify script and the nightly copy script. They must also capture the six [M] folders in the clinic repository that are in no commit (register row B11) and the untracked harness documents. After I plug in and encrypt the drive, which comes after FixFlow’s P0a: the first verified copy.'),
  P('WP1', 'done', 'After one real reboot', 'A clone from the copy shows the same heads, and the copy is never more than 24 hours old [T]. After one real reboot, done in a quiet window with my go, the resume list appears at sign-in with “start Docker” as its first line, and once Docker is up the databases in use are healthy within 3 minutes [T] with no further command. The next unexpected shutdown leaves a logger trace that ends at it.'),
  P('WP1', 'mine', 'railway up', 'Switch off sleep on mains power (D04); plug in the drive and switch on its encryption (D02); install the sensor logger and debugger (D05); write down the days the house lost power; say yes to the nightly copy as a scheduled task and to permission rules that deny agents the Railway commands `railway up` (deploys to the live host) and `railway run` (runs a command with the live settings); later, D08 (a battery backup) once the diagnosis is in. My steps come after FixFlow’s P0a.'),

  P('WP2a', 'first', 'side by side on recorded commits', 'The container run and the Windows run side by side on recorded commits, with one check’s peak memory written down [M]. These runs need only a quiet machine, so they can start before WP1 is done. I decide D09 on that evidence.'),
  P('WP2a', 'firstShort', 'side by side', 'Container and Windows runs side by side, with one check’s peak memory (can start sooner)'),
  P('WP2a', 'depText', 'quiet machine', 'The side-by-side runs and the one peak-memory figure need only a quiet machine. The memory table and any second slot need WP1’s logger and diagnosis first. The reaper only lists until I decide D10, and never touches a container, network or worktree that the clinic testbed’s own check and lane scripts did not create.'),
  P('WP2a', 'startNote', null, 'after WP1; side-by-side runs sooner'),

  P('WP2b', 'worksIn', 'atomic rename', 'FixFlow (this repository). Ship lanes use these scripts every day, so each change goes to the coordinator as a proposal and lands by atomic rename: the new script is written beside the old one and renamed over it in one step, so a running lane never reads a half-written script.'),
  P('WP2b', 'done', 'turns CI red', 'Every gate kind takes the per-lane lock first, Node failures are re-run under Node 22 before they are called defects, and a planted skip or an empty test run turns CI red once the new checks have run record-only over recent merges.'),

  P('WP3', 'goal', 'Move the mechanical part', 'Move the mechanical part of review and merging out of the orchestrating session into scripts that spend no tokens: a sealed replay, a verdict script, a transcript audit at merge, one finding table, a dry run with stand-in agents and a merge queue that checks who read the final commit. Then the gate workflow, where the reviewers run outside the orchestrating session, and the fix-round contract. This is harness v2 phase 3.'),
  P('WP3', 'worksIn', 'scripts folder on a branch', 'The clinic testbed’s recorded history, read only, and a scripts folder on a branch of the clinic testbed repository. Changes to FixFlow’s review practice are proposals to the coordinator.'),
  P('WP3', 'first', 'mechanisms 1 and 3', 'The replay seal (mechanism 1: a script that builds a sealed clone at a recorded commit, with no agent) and the transcript audit (mechanism 3). Building both costs no tokens and no check time, so they can start today on the recorded data; the seal’s own two-run test books its agents under D07.'),
  P('WP3', 'firstShort', 'Sealed replay', 'Replay seal and transcript audit, on the record'),
  P('WP3', 'done', 'six scripts', 'Each of the six scripts (sealed replay, verdict script, transcript audit, finding table, dry run with stand-in agents, merge queue) passes the test the harness v2 design sets for it (§4), and the merge queue has run record-only over the 65 [M] recorded merges and flagged the unread final heads of 10 and 11 November by itself. A script refuses a merge only after I say so (D15).'),

  P('WP4', 'size', 'first replay', 'Set from the first replay.'),
  P('WP4', 'sizeShort', 'replay', 'set by the replay'),
  P('WP4', 'depText', 'rate sheet', 'Needs WP8’s first deliverable, the rate sheet: the planner reads its rates from there. Easier after WP2a, because check capacity is one of the limits it plans against.'),

  P('WP5', 'goal', 'four levers', 'Give every wave a written token budget, build the governor that slows lanes so the five-hour window lasts, and put the four levers from the token report to work: (1) cap long windows, (2) shrink the fixed start every agent re-reads, (3) batch lookups, and (4) stop the model’s own output piling up in its window.'),
  P('WP5', 'first', 'November baseline', 'A proposal for D07, the token budget per five-hour window, built at zero tokens from the November tally saved in `docs/program/evidence/token-spend/`. Lever 2 is measured once D07 is set and no FixFlow phase is running or waiting on its reviewer.'),
  P('WP5', 'done', 'compaction-window trial', 'Every wave launches with a written budget and books its agents in the shared queue, each lever has a before-and-after number, and the compaction-window trial, if I approve it (D22), is reported as an anecdote. No lever claims fewer stops, because how re-reads count against the limit is still unknown to us.'),
  P('WP5', 'sizeShort', '1 hour', '1 hour [E], then days [G]'),
  P('WP5', 'depText', 'Levers 2 and 3', 'Needs nothing to start. Levers 2 and 3 are measured after WP3’s gate workflow and after D18 settles the short tool list, because both change what a session costs.'),
  P('WP5', 'mine', 'D07 (the budget', 'D07 (the budget per window), D13 and D18 (a reports folder and the short tool list), D22 (the compaction-window trial), and my yes before connectors or tool descriptions are removed from agent sessions, which is a settings change.'),

  P('WP6a', 'worksIn', 'Design documents', 'Design documents in `docs/program/` and the clinic testbed’s recorded runs. Nothing is built until the limitation list is agreed.'),
  P('WP6a', 'size', 'Not sized yet', 'Not sized yet; the list itself is a conversation and a document.'),
  P('WP6a', 'sizeShort', 'not sized', 'not sized yet'),

  P('WP6b', 'mapLine', 'Free recurrence audit', 'Recurrence audit, then my second yes'),
  P('WP6b', 'first', 'free recurrence audit', 'The recurrence audit (KS-0), which writes no code: one Sonnet session and an Opus refuter count the repeats a store could have served. It runs under D07, books its place in the shared queue and waits while a FixFlow phase is running or waiting on its reviewer.'),
  P('WP6b', 'firstShort', 'Free recurrence audit', 'Recurrence audit (KS-0), no code'),
  P('WP6b', 'mine', 'KS-D1 (run the audit)', 'KS-D1 (run the audit), KS-D1b (build after the audit), D17 (whether hooks stay off, which also covers the store’s optional edit-time hook) and my yes before any copy of the store leaves this PC.'),

  P('WP6c', 'first', 'known contradiction', 'A CI check for the Alembic head number that CLAUDE.md states, and one corrections PR that settles, against git, each contradiction the knowledge-store design lists (PR #183, §8 rule 5).'),
  P('WP6c', 'done', 'planted wrong fact', 'A planted wrong fact in CLAUDE.md turns CI red once the check has run record-only over recent merges, and the corrections PR has merged.'),

  P('WP7', 'done', 'A tested answer', 'The index replay has reported against D23’s marks, and, if I approve the agent arm (GT-1), we have a tested answer to whether an agent with the typed store finds what a change touches faster and with fewer tokens than the same agent with search alone.'),

  P('WP8', 'worksIn', 'Results go into', 'The record on this PC, read only. Results go into `docs/program/evidence/` and are committed only after I decide that the clinic and PC details in them may enter the repository’s history.'),
  P('WP8', 'first', 'limit episodes', 'A rate sheet from the record: check run time, review rounds, the share of reviews that sent work back and limit episodes (each time the five-hour usage limit stopped agent work), each with its tag. What the record cannot supply yet, peak memory per check and lane collisions, is written as unknown, never as zero.'),
  P('WP8', 'done', 'before and after', 'The rate sheet is updated after each wave and every rate carries its tag, the frozen validation contract and the protocols are written down before any pilot runs, and the planner (WP4) and the governor (WP5) read their rates from the sheet once they exist.'),
  P('WP8', 'skills', 'Python', 'Statistics, simulation (Monte Carlo), JavaScript on Node.'),

  P('WP9', 'worksIn', 'only reads them', 'The clinic testbed repository. FixFlow’s device lab and Android builds belong to the ship plan’s lab (§7); this package only reads them, and for MC-NATIVE and MC-NOEMU it tracks lab lane L2’s results rather than changing anything.'),
  P('WP9', 'done', '11 November merge', 'The walk fails on the commit before the 11 November real-data merge (fb55599) and passes after it, and the first-deploy checklist has run once on a real host.'),
  P('WP9', 'mine', 'D21 (rehearse', 'D21 (rehearse on a real host), and D09 through WP2a. The free steps need me present for one administrator prompt, and a rented host costs a domain fee and a few hours of rental and takes made-up data off this PC, so it waits for my yes.'),

  P('WP10a', 'first', 'save-as-run rule', 'A written save-as-run rule (every workflow is saved as a script before it runs, so it can be re-run), sent to the coordinator to adopt, and one saved workflow script for the review stage, now that FixFlow’s P1 has merged.'),
  P('WP10a', 'firstShort', 'Save-as-run', 'Save-as-run rule; one saved review workflow'),
  P('WP10a', 'done', 'frozen replay', 'Every workflow we run is saved and can be re-run, raw workflow outputs are kept as evidence with a hash manifest, and a brief edit that flips a recorded verdict is caught by WP3’s sealed replay.'),
  P('WP10a', 'depText', 'Needs nothing to start', 'Needs nothing to start. The replay check needs WP3’s seal, and anything that launches agents waits for D07.'),

  P('WP10b', 'first', 'stray artifact', 'PR #185 reviewed and merged, and a CI check for skill and agent frontmatter (the settings block at the top of each file), proposed to the coordinator like any FixFlow CI change and run record-only first.'),
  P('WP10b', 'firstShort', 'PR #185', 'PR #185 reviewed and merged; frontmatter CI check'),
  P('WP10b', 'depText', 'waiting on its reviewer', 'The binding review spends an Opus agent, so it runs under D07 when no FixFlow phase is running or waiting on its reviewer. Each agent’s fixed start is measured once, by WP5’s lever 2.'),
  P('WP10b', 'mine', 'stray artifact', 'Merging PR #185. Separately, deleting a stale first-draft page from this track (an offline-sync review) from my private claude.ai pages.'),

  P('WP11', 'worksIn', 'program documents', 'My visual pages and the harness program documents on the plan branch. Anything in FixFlow’s program files goes to the coordinator as a proposal; ship-plan items are linked, never owned.'),
  P('WP11', 'first', 'One decision board', 'One decision board that joins harness D01 to D23, the knowledge store’s KS-D decisions, the graph-test decisions and links to the FixFlow items of mine that the harness touches (kept in `docs/program/W0-results.md`, not copied), each with a distinct prefix and what it unblocks; beside it, the shared queue where agent runs are booked.'),
  P('WP11', 'firstShort', 'decision board', 'One decision board and the shared run queue'),

  D('P0a', 'options', 'Do P0a first', '**Do P0a first; my harness steps follow it, except the notes and decisions marked now**'),
  D('P0a', 'unblocks', 'every step', 'every step of mine below that is not marked now'),
  D('D07', 'q', 'token budget', 'What is the token budget per five-hour window?'),
  D('D07', 'when', 'first replay', 'before the first run that launches agents'),
  D('D07', 'options', 'one measured window', '**Start from the one measured window (about 3.4 million subagent tokens [M]) and adjust once the per-slice tally is rerun on November’s transcripts** / Set my own figure'),
  D('D12', 'q', 'P0 to P3', 'Which findings get a second look, and when does a finding go stale?'),
  D('D13', 'options', 'after the probe', '**Allow one reports folder, after a write probe of twenty short runs passes** / Keep asking each time'),
  D('D17', 'options', 'two uses', '**Stay off** / Re-open them for two uses: a stop hook that blocks a session on a failed claim check, and a heartbeat fed by tool events'),
  D('D23', 'options', 'refuter suggested', 'The marks a refuter suggested: 3 % of tokens and a recall of 0.8 [T] / Set my own marks / Skip the replay'),
  D('D21', 'options', 'Free steps', '**Free steps with me present (restore, deploy checklist, off-site push and a planted alert), then rent a host for a day** / Free steps only, for now / Wait'),
  D('KS-D1', 'q', 'free recurrence audit', 'Run the knowledge store’s recurrence audit (KS-0)?'),
  D('PR185', 'options', 'stray artifact', 'Merge after the review / Hold'),

  ['register-extra.json', ['glanceShows'], 'Most of the open ones', 'Of 128 [M] bottlenecks, 13 [M] are already closed and 35 [M] partly closed. The largest open groups, 33 [M] of the 80 [M] still open, are in memory (22 [M]), which is designed but not built yet, and in tokens (11 [M]), where the levers are sized but not yet applied.'],
  ['catalogue-extra.json', ['howMade'], 'checked 469', '**How this was compiled.** I followed our orchestration design. Sonnet agents first extracted every idea, bottleneck and term from the sources without judging them, each record with a citation in the form `path:line — quote`. I merged duplicates and sorted the records into themes and work packages. Fresh-context Opus agents then checked all 469 [M] condensed idea records, and every number in the narrative, against the sources; they split out 10 [M] more where one record had swallowed a second idea, and I set aside one record about FixFlow’s own product features, which gives the 478 [M] ideas in Part 3. 268 [M] idea records and 11 [M] narrative claims were corrected or tightened, and the corrected text is what is printed here. Last, nine fresh-context readers read the draft as a newcomer would and raised 317 [M] points on clarity, numbers and tone; I applied nearly all of them. Where the record does not know something, this compile says so. Throughout, “I” is me and “we” is the team.'],
  ['catalogue-extra.json', ['heatShows'], 'Review and fix rounds', 'Review and fix rounds draw the most ideas (143 [M], the Review column’s total), then the orchestrator and lanes (105 [M]). Memory has the most open bottlenecks: 22 [M] of its 23 [M] are open, and 46 [M] ideas from all themes address them, so that is where most of the new work is.'],
];

const files = {};
const load = f => files[f] || (files[f] = JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8')));
let n = 0, bad = 0;
edits.forEach(([f, p, expect, v]) => {
  const root = load(f);
  let o = root;
  for (let i = 0; i < p.length - 1; i += 1) {
    const k = p[i];
    o = (k && typeof k === 'object') ? o.find(x => x.id === k.id) : o[k];
    if (!o) { console.log('MISSING path', f, JSON.stringify(p)); bad += 1; return; }
  }
  const last = p[p.length - 1];
  const old = o[last];
  if (expect !== null && !String(old || '').includes(expect)) {
    if (old === v) return;
    console.log('EXPECT FAIL', f, JSON.stringify(p), 'expected', JSON.stringify(expect), 'in', JSON.stringify(String(old).slice(0, 120))); bad += 1; return;
  }
  o[last] = v; n += 1;
});
// themes-meta.json: edited as raw text, so its own layout is kept.
const tmPath = path.join(DATA, 'themes-meta.json');
const tmFix = [
  ['an always-on logger that will finally tell us why it powers off', 'an always-on sensor logger that will show why it powers off'],
  ['In the testbed, ten lanes at once lasted about 15 minutes before the usage limit stopped them [M], while two at a time got further.', 'In the testbed, ten lanes run at once hit the usage limit within about 15 minutes [M], while two at a time got further.'],
  ['The three engines we tried, one relational and two graph, gave identical answers, so the engine is a free choice. The test was a fixed script with no agent in it; the next step puts an agent in the loop and widens the test to knowledge graphs and caching, as I asked.', 'The three engines we tried, one relational and two graph, gave identical answers, so the engine can be chosen on speed, size and effort. The test was a fixed script with no agent in it. Next comes a zero-token index replay; the wider test I asked for, with an agent in the loop, knowledge graphs, time and caching, follows under a written budget once I settle GT-1.'],
];
let s = fs.readFileSync(tmPath, 'utf8');
tmFix.forEach(([a, b]) => { if (s.includes(a)) { s = s.split(a).join(b); n += 1; } else if (!s.includes(b)) { console.log('THEMES-META MISS', a.slice(0, 80)); bad += 1; } });
JSON.parse(s);
if (bad) { console.log('NOT WRITTEN: fix the problems first'); process.exit(1); }
fs.writeFileSync(tmPath, s);
Object.entries(files).forEach(([f, o]) => fs.writeFileSync(path.join(DATA, f), JSON.stringify(o, null, 1) + '\n'));
console.log('applied', n, 'problems', bad);
