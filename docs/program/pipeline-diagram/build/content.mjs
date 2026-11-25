// What the diagram says. Three levels:
//   a pipeline (code, title, one line), its steps (title, one line), and the parts inside a step.
// A part is [text, state]; state: b = built, d = designed, i = idea, n = built and tested once, no gain yet.
// A step with no parts carries its own state (s). link = [text, hue of the pipeline it points at].
// Wording: plain descriptions only (owner, 2026-11-20).

export const PATH = [
  { id: 'S1', code: '1', title: 'PLAN', purpose: 'Split a request into units of work and order them.',
    foot: 'Open: how the plan is revised after a unit fails.', cards: [
      { t: 'Confirm the request', p: 'Restate the request and wait for approval before starting.', items: [
        ['Request from the owner', 'b'], ['Session start: the board is loaded (rules, facts, next task)', 'b'],
        ['Restate the request; start on the owner\'s approval', 'b'], ['Design choices come from research and measurements, not from questions to the owner', 'b']] },
      { t: 'Check existing knowledge', p: 'Search memory before starting new work.', items: [
        ['Memory lookup: solved or decided before?', 'b'], ['Check token usage and agree a cap before starting helpers', 'b']],
        link: ['uses B2 Problem lookup · B3 Library · B5 Standing notes', 'memory'] },
      { t: 'Split into units', p: 'A unit is one job for one session, small enough for one context window.', items: [
        ['Split the work into units', 'd'], ['Each unit declares: files it writes and reads, dependencies, shared resources, risk, model, size', 'd']] },
      { t: 'Order the units', p: 'Find which units can run in parallel and estimate the finish time.', items: [
        ['Two graphs: dependencies, and collisions (units that write the same place)', 'd'],
        ['Waves: units with no open dependency and no collision start together', 'd'],
        ['Estimated finish time and the limiting resource', 'd'], ['Plan file: role, model, token limit and order, read by the plan gate', 'b']] } ] },
  { id: 'S2', code: '2', title: 'ADMIT', purpose: 'Decide which units start now, and on which model.',
    foot: 'Open: how to measure the value of a unit.', cards: [
      { t: 'Readiness and fit', p: 'Only units whose dependencies are done and that fit every limit.', items: [
        ['Ready queue: units whose dependencies are all done', 'b'], ['Fit filter: a unit must fit every limit at once', 'd']], link: ['uses D Limits', 'limit'] },
      { t: 'Next unit', p: 'Order among the ready units.', items: [
        ['In a tight token window: most value per token', 'd'], ['Otherwise oldest first, with short units filling gaps', 'd'],
        ['Reservation: a slot and tokens held for the oldest unit that does not fit yet', 'd']] },
      { t: 'Model choice', p: 'The smallest model that gives the same output.', items: [
        ['Haiku: locate things, extract into a fixed form', 'b'], ['Sonnet: read, collect, run commands, build ordinary code', 'b'],
        ['Opus: delicate code, analysis, refuting, coordinating', 'b'], ['Fable: coordinating a tree that has sub-trees', 'b'],
        ['Raise the effort level before moving to a larger model', 'd']], link: ['see B4 Reasoning cache', 'memory'] },
      { t: 'Gate and start', p: 'A script allows the start; the unit gets its own workspace.', items: [
        ['Plan gate: refuses a start the plan does not allow', 'b'], ['Start: own copy of the repository, own branch, a one-page brief', 'b']] } ] },
  { id: 'S3', code: '3', title: 'WORK', purpose: 'Units run as a tree of sessions, one purpose per session.',
    foot: 'Open: whether to split or hand over when work grows; when an extra coordination level is worth it.', cards: [
      { t: 'Session tree', p: 'Coordinators assign and track work; workers do it.', items: [
        ['Root session: coordinates only; keeps the task table', 'b'], ['Inner session: coordinates one part, where its summary is much shorter than the work', 'd'],
        ['Worker session: one unit, in its own copy (a worktree)', 'b'], ['Helpers: short-lived, one lookup or one check; not a level of the tree', 'b']] },
      { t: 'Hand-off format', p: 'How sessions pass work without re-reading each other\'s context.', items: [
        ['Brief: one page with scope, file pointers, settled points, open items, done condition', 'b'], ['Fixed return format, checked by script', 'b']] },
      { t: 'Worker steps', p: 'Look up, claim the files, write.', items: [
        ['Query the code map and memory before opening files', 'd'], ['Claim: declare what will be written, down to the function', 'd'],
        ['Version-checked write: only if the place is unchanged since it was read', 'd']], link: ['uses A3 Code queries · B2 Problem lookup', 'know'] },
      { t: 'Report', p: 'Results stay on disk; the parent reads a summary.', items: [
        ['Results on disk: only path, hash and a short summary are passed up', 'b'], ['Claims file: every claim with the test that proves it', 'd'],
        ['"Done" is written last; the parent wakes, re-reads state, starts the next unit', 'b']] } ] },
  { id: 'S4', code: '4', title: 'CHECK', purpose: 'Test and review every change before it is merged.',
    foot: 'Open: who runs the gate where hooks cannot; how to handle tests that fail at random.', cards: [
      { t: 'Unit tests', p: 'While it works, a unit runs only its own tests.', items: [
        ['Own tests first', 'b'], ['Full suite before work is stacked on unchecked parts, and once at the end', 'b']] },
      { t: 'Shared test suite', p: 'The full suite has few slots, so runs are queued and shortened.', items: [
        ['Visible, ordered queue; runs in a clean container', 'd'], ['Test selection: only the tests the change can affect', 'd'],
        ['Batch waiting changes; split the batch only if it fails', 'd'], ['Speculative testing: assume the change ahead passes', 'd']] },
      { t: 'Independent review', p: 'A new session looks for faults in the result.', items: [
        ['Reviewer sees only the result', 'b'], ['Coverage rule: every item is returned, run again, or waived in writing', 'b'],
        ['Planted faults: measure how many each check catches', 'b']] },
      { t: 'Verdict', p: 'A recorded result for one exact commit.', items: [
        ['Typed verdict: pass, fail or not run, naming the commit', 'd'], ['A finding closes only on a test that fails before the fix and passes after', 'd'],
        ['Fix rounds: two at most; revert, do not patch; a new reviewer after two failures', 'd']] } ] },
  { id: 'S5', code: '5', title: 'LAND', purpose: 'Merge checked changes one at a time, in order.',
    foot: 'Open: wait or redo when two units change the same place; the literature gives no general answer.', cards: [
      { t: 'Merge queue', p: 'One script and one lock decide the order.', items: [
        ['Single order, single lock', 'd'], ['Only the exact commit that was reviewed is merged', 'd'],
        ['A person reads high-risk lines (payments, access) before the merge', 'd']] },
      { t: 'Merge and recheck', p: 'The merged result is tested; a failure is reverted.', items: [
        ['The suite runs on the merged result; on failure the merge is reverted', 'd'], ['Commit check: refuses a commit that edits records or evidence', 'b']] },
      { t: 'Write conflicts', p: 'Methods, in the order tried, when changes collide.', items: [
        ['1. Separate copies (baseline)', 'b'], ['2. Restructure frequently changed places into entries applied at merge', 'd'], ['3. Version-checked writes: re-read and redo if changed', 'd'],
        ['4. Claims below file level: lock a function, not a file', 'd'], ['5. Wait for a conflicting pair, if waiting costs less than redoing', 'd'], ['6. Structured merge, last', 'd']] },
      { t: 'After the merge', p: 'Records are updated from the merged state.', items: [
        ['Board rebuilt from each unit\'s state file, never edited by hand', 'd']], link: ['feeds A1 Code map', 'know'] } ] },
  { id: 'S6', code: '6', title: 'LEARN', purpose: 'Record the measurements and findings of the task.',
    foot: 'Open: who marks a stored entry stale when the code under it changes.', cards: [
      { t: 'Record measurements', p: 'Actual figures update the next plan\'s estimates.', items: [
        ['Actual footprint and duration of each unit', 'd'], ['Tokens per unit become the next plan\'s estimate', 'b'], ['Correct the rates: estimated against actual finish', 'd']],
        link: ['feeds D Limits · G Measurement', 'improve'] },
      { t: 'Store findings', p: 'Solved problems and findings are added to memory.', items: [
        ['A solved hard problem is recorded in the knowledge store', 'd'], ['A finding, ruling or mistake becomes a library record with its evidence', 'b']],
        link: ['feeds B1 Problem records · B3 Library', 'memory'] },
      { t: 'Convert to checks', p: 'A repeated lesson becomes an automated test.', items: [
        ['Rule of three: seen three times, it becomes a lint rule, a test or a gate clause', 'd'], ['Promoted check: a confirmed trap becomes a test in the shared suite', 'd']] },
      { t: 'Maintenance and hand-over', p: 'Keep stored entries correct and worth their cost.', items: [
        ['Mark stale entries', 'd'], ['Record misses', 'd'], ['Count every lookup: hits, misses, false leads', 'd'],
        ['Stop rule: a store with fewer than 3 verified hits in 20 uses is retired', 'd'], ['Hand over through files, not through a session\'s memory', 'b']] } ] },
];

export const LANES = {
  A1: { hue: 'know', title: 'CODE MAP', purpose: 'Scripts turn the repository into a graph of facts; no model is used.',
    foot: 'Status: on one repository the typed store beat scripted search by 0.076 in answer recall; three storage engines gave identical answers; a widely used external graph tool scored lower (0.564 against 0.700). Open: which parser builds the facts.', cards: [
      { t: 'Sources', p: 'What is read.', items: [['Repository files at one commit: code, tests, settings, documents', 'b'], ['Git history: which files changed together, and when', 'b']] },
      { t: 'Fact extraction', p: 'Scripts turn files into typed facts in about 5 seconds.', items: [
        ['Fact extractor: a script, no model', 'b'], ['Links hidden in strings: a web route and its client call, a queue and its handler', 'd'],
        ['Document reader: sections by heading, each with a content hash', 'd'], ['Conclusion ledger: claim, evidence and source, so it can be rechecked', 'd']] },
      { t: 'Graph', p: 'Entities and the typed links between them.', items: [
        ['Nodes: files, definitions, tests, tables, settings, migrations', 'b'], ['Edges: imports, calls, tests, cites, changed together', 'b'],
        ['Change sets: one node per commit joins its files', 'd'], ['Time on every fact: valid from one commit until another', 'd'], ['A renamed or moved definition keeps its identity', 'd']] },
      { t: 'Typed store', p: 'All facts in one SQLite database, rebuilt for each working copy.', items: [
        ['One database of typed facts', 'b'], ['Re-extracted on change in seconds; nothing expires by age', 'b']], link: ['feeds A2 Model training · A3 Code queries', 'know'] } ] },
  A2: { hue: 'know', title: 'GRAPH MODEL TRAINING', purpose: 'Learn from past commits which files are related; runs on the GPU.',
    foot: 'Status: built and run once; in the one form tried, on one repository, the trained models added nothing. One form, not a verdict. Open: whether another form helps.', cards: [
      { t: 'Training set', p: 'The graph as it stood at each past commit.', items: [['Graph snapshots, one per past commit', 'b']] },
      { t: 'Training', p: 'Hide a true link; learn to rank it above false ones.', items: [
        ['Task: link prediction', 'b'], ['On the GPU: an RTX 5070 with 12 GB, in containers, network off', 'b']] },
      { t: 'Models', p: 'Five kinds, from tested to proposed.', items: [
        ['Graph embeddings (RotatE, ComplEx, TransE): each node becomes a vector of 256 numbers', 'n'], ['Graph neural encoder (CompGCN): a node also mixes in its neighbours', 'n'],
        ['Routed specialists: one small model per code area, and a router', 'n'], ['Text and code embeddings: search by meaning, not by word', 'i'],
        ['Fine-tuned retriever: a small local model trained on our own lookups', 'i']] },
      { t: 'Evaluation rules', p: 'Rules that prevent an overstated result.', items: [
        ['Tune, freeze, then score once on unseen commits', 'b'], ['Placebo: a random scorer goes through the same steps', 'b'],
        ['Baselines: same folder, changed together, plain search', 'b']] },
      { t: 'Link scores', p: 'For a start file: how likely each other file is linked to it.', s: 'n', link: ['feeds A3 Code queries (Rank)', 'know'] } ] },
  A3: { hue: 'know', title: 'CODE QUERIES', purpose: 'An agent sends a query and gets a few hundred tokens back instead of whole files.',
    foot: 'Status: in a replay the cache served 87.6 % of lookups with 0.0 % wrong answers. Not yet run: an agent using the layer while it works. Rejected after study: a graph database server, a graph written by a model, expiry by age.', cards: [
      { t: 'Query', p: 'The agent requests an answer when it needs one.', items: [
        ['Example query: what does changing this file affect?', 'd'], ['On request only: one command; nothing added to every prompt', 'd'],
        ['Query types: a fixed list, each with its measured quality', 'd']] },
      { t: 'Cache check', p: 'The same query on unchanged facts returns the stored answer.', items: [
        ['Answer cache', 'b'], ['An answer is dropped only if a fact it read has changed', 'b']] },
      { t: 'Search and traverse', p: 'From the start nodes, follow typed links a few hops.', items: [
        ['Find the start nodes: by keyword or by path', 'b'], ['Traverse the graph within a link budget', 'b']] },
      { t: 'Rank', p: 'Three ranked lists merged into one.', items: [
        ['Closeness: personalised PageRank from the start file', 'b'], ['Changed together: frequency, as a confidence', 'b'],
        ['Learned score: the link scores of the models', 'n'], ['Fusion: reciprocal rank fusion, the sum of 1 / (60 + rank)', 'b']] },
      { t: 'Pack and return', p: 'Return the top results that fit the token budget.', items: [
        ['Pack to a budget of about 8,000 tokens', 'b'], ['Answer: a tool result of a few hundred tokens', 'd']], link: ['feeds 3 WORK', 'path'] },
      { t: 'Uses', p: 'Points in the work where agents use it.', noArrow: true, items: [
        ['Session-start brief: a short map of the area', 'd'], ['Change list: the functions, callers, co-changed files and tests of a change', 'i'],
        ['Edit-time warning: a hook warns on a risky edit', 'i'], ['Evaluation: an agent with this tool against one with plain search', 'd']] } ] },
  B1: { hue: 'memory', title: 'PROBLEM RECORDS', purpose: 'The session that solves a hard problem records it, with a check that proves the cause.',
    foot: 'Status: designed, not built.', cards: [
      { t: 'Record', p: 'Fixed fields: symptom, cause, fix, failed approaches.', s: 'd' },
      { t: 'Cause check', p: 'The entry includes a check that detects the cause in the code.', items: [
        ['Control pair: the check fires on the known-bad commit and stays quiet on the known-good one', 'd']] },
      { t: 'Write gate', p: 'Rejects entries that contain secrets or duplicate existing ones.', items: [
        ['Removes secrets; refuses duplicates', 'd'], ['Missed-existing check: was this already stored but not found?', 'd']] },
      { t: 'Review', p: 'A reviewer who is not the author tries to refute it.', items: [['Reviewer: a strong model, never the author', 'd']] },
      { t: 'Store', p: 'Append-only files are the source of record; a search index is rebuilt from them.', items: [['Journal and index (SQLite)', 'd']], link: ['feeds B2 Problem lookup', 'memory'] } ] },
  B2: { hue: 'memory', title: 'PROBLEM LOOKUP', purpose: 'Search the stored problems before spending tokens on solving one.',
    foot: 'Status: designed, not built. Open: whether the library (B3) becomes this store or stays separate.', cards: [
      { t: 'Triggers', p: 'Points where repeated work costs most.', items: [
        ['Before a stronger model, before a retry, before applying a suggested fix', 'd'], ['Lookup on a diff: warns when a change touches something an entry protects', 'd']] },
      { t: 'Match', p: 'Find the stored entry for this error.', items: [
        ['The error text is reduced to a stable template and matched', 'd'], ['Result: lead, candidate or miss', 'd']] },
      { t: 'Verify gate', p: 'The entry\'s own check runs on the current code. The fix is shown only if the cause is present.', items: [
        ['Verify before use', 'd'], ['Do-not-apply entries: warnings that a likely fix is wrong here', 'd']] },
      { t: 'Invalidation', p: 'An entry is rechecked when the code under it changes.', items: [['Marked suspect on change, then its check runs again', 'd']], link: ['feeds 1 PLAN · 3 WORK', 'path'] } ] },
  B3: { hue: 'memory', title: 'LIBRARY', purpose: 'The project\'s record of decisions, measurements and mistakes.',
    foot: 'Status: built and in use.', cards: [
      { t: 'Record', p: 'A claim and how it is known: measured, quoted from a paper, reasoned, or the owner\'s ruling.', s: 'b' },
      { t: 'Journal', p: 'One line per record. Lines are only added, never changed.', items: [['Correction: a new record replaces a wrong one; the top session decides', 'b']] },
      { t: 'Board', p: 'One page: what to look up before each kind of action, open tasks, known gaps.', s: 'b' },
      { t: 'Lookup', p: 'By id or keyword. No match is reported as "not recorded".', items: [['Recall test: a new session answers questions from the library alone', 'b']], link: ['feeds 1 PLAN (every session start)', 'path'] } ] },
  B4: { hue: 'memory', title: 'REASONING CACHE', purpose: 'A cheaper model reuses solutions that a stronger model produced.',
    foot: 'Status: modelled only. Open: whether reuse beats escalation without a store; how partial solutions are combined.', cards: [
      { t: 'Cheaper model first', p: 'A smaller model attempts the task, using a stored solution if one matches.', s: 'i' },
      { t: 'Escalation', p: 'On failure the task moves up: Haiku, Sonnet, Opus, Fable.', s: 'i' },
      { t: 'Store the solution', p: 'The stronger model\'s solution is stored for reuse.', items: [
        ['Stored for reuse by cheaper models', 'i'], ['Combine partial solutions: parts of several stored solutions, joined through the graph', 'i']] },
      { t: 'Measurement', p: 'Whether reuse beats escalation without a store.', items: [
        ['Reuse funnel: seven stages a reused answer passes through, each counted', 'd'],
        ['Tests before building: match rate with a perfect lookup, coverage of new work, share of work sent back', 'i']], link: ['feeds 2 ADMIT (Model choice)', 'path'] } ] },
  B5: { hue: 'memory', title: 'STANDING NOTES', purpose: 'Text loaded into every session at start.', noSeq: true,
    foot: 'Status: built and in use.', cards: [
      { t: 'Instruction file', p: 'A short root file every session loads; details sit in files loaded only when needed.', items: [['Skills: packaged procedures, loaded only when a task needs them', 'b']] },
      { t: 'Notes', p: 'Information kept across hand-overs.', items: [
        ['Memory index: one line per lasting note; a note is opened only when needed', 'b'], ['Notes file: written before a hand-over, read back after it', 'b']] },
      { t: 'Size', p: 'Every call re-reads this text, so it is kept short.', items: [
        ['Small standing context', 'd'], ['Prompt cache: add text at the end, not at the top', 'b']], link: ['feeds 1 PLAN (every session start)', 'path'] } ] },
  C: { hue: 'guard', title: 'GUARDS', purpose: 'Scripts that check a step before it runs and can refuse it.',
    foot: 'Status: in use in this repository, except the write guard and the audit. Not tested: whether the hooks run inside helpers and in other folders.', cards: [
      { t: 'At session start', p: 'The rules are loaded into the session.', items: [['Start hook: loads the board, also after a compaction', 'b']] },
      { t: 'Before a helper starts', p: 'Checks the model, and that the plan allows the start.', items: [
        ['Tier hook: refuses the wrong model for the kind of job', 'b'], ['Plan gate: refuses a start the plan does not allow', 'b']] },
      { t: 'Before a write', p: 'Protects records; keeps a unit within its own files.', items: [
        ['Record guard: no edits to evidence or journal lines; no design questions to the owner', 'b'], ['Write guard: no write outside the files the unit declared', 'd']] },
      { t: 'Heavy commands', p: 'Heavy commands are queued.', items: [['The lane: a queue with a few slots, low priority, a time limit', 'b']] },
      { t: 'At commit', p: 'The same rules, applied again at commit.', items: [['Commit check: also catches writes made through the shell', 'b']] },
      { t: 'After the run', p: 'Transcripts are checked against the rules.', items: [['Transcript audit: which model each helper ran on, and what it read', 'd']] },
      { t: 'Foundations', p: 'What the guards depend on.', noArrow: true, items: [
        ['Least privilege: each role gets only its tools and folders', 'b'], ['Trusted checker: only a small script promotes a claim to a fact', 'b'],
        ['Sealed ledger: each line carries the hash of the line before', 'b'], ['Self-test and canary: a planted violation must be caught', 'b']] } ] },
  D: { hue: 'limit', title: 'LIMITS', purpose: 'The number of units that run at once is set by the tightest limit.',
    foot: 'Status: a hypothesis from the literature; its numbers depend on measurements Q01 to Q37. Open: how re-read tokens count against the allowance.', cards: [
      { t: 'Measure each limit', p: 'One number per limited resource.', items: [
        ['Memory: a hard floor; below it nothing starts', 'd'], ['Processor: cores busy against cores present', 'd'],
        ['The shared test suite: slots × (test time + work time) / test time', 'd'], ['Ready work: more workers than ready units does not help', 'd'],
        ['Token windows: one refills every 5 hours, one every week; fit both', 'd'], ['The parent\'s window: too many children overflow it', 'd']] },
      { t: 'Concurrency', p: 'Run as many as the tightest limit allows, and record which limit it is.', s: 'd' },
      { t: 'Token pacing', p: 'Spend the allowance without running out.', items: [
        ['Token governor: one budget per window; learns the window\'s size from limit messages', 'd'], ['Reserve: for running units, and for the owner\'s own use', 'd'],
        ['Spend the rest immediately while work is waiting', 'd'], ['A unit\'s own cap: measured need plus a buffer; then save state and hand on', 'd'],
        ['A more expensive model only where its value exceeds its share of the window', 'd']], link: ['feeds 2 ADMIT', 'path'] } ] },
  E: { hue: 'context', title: 'CONTEXT', purpose: 'Keep each session\'s context window small, since every call re-reads all of it.',
    foot: 'Status: measured over 7.35 billion tokens in two projects. The split rule is approved for one trial at 300,000 tokens; not run yet. Open: whether a brief loses less than a summary.', cards: [
      { t: 'Token usage', p: 'Measured over 35,800 model calls.', items: [
        ['Re-reads are 96.8 % of all tokens: usage = calls × window size', 'b'], ['A window holds: fixed prefix 27 %, own earlier output 26 %, fetched content 26 %, old summaries 8 %', 'b'],
        ['The long-running coordinator uses the most: 333,000 to 396,000 tokens per call', 'b'], ['65 % of a session\'s re-read tokens are past 300,000', 'b'],
        ['Minor factors: model mix, file reads, human prompts', 'b'], ['After a compaction: mistakes rise from 0.58 to 1.35 per 100 calls, then fall back', 'b']] },
      { t: 'Reducing window size', p: 'Six methods.', items: [
        ['Cap the coordinator: hand over at 150,000 to 200,000 tokens', 'd'], ['Remove unused tool descriptions from helpers: about 60,000 tokens', 'd'],
        ['Batch lookups: one call for several reads', 'i'], ['Keep own output on disk, not in the window', 'i'],
        ['Fewer parent wakes: children report in batches', 'd'], ['Scripts before agents', 'd']] },
      { t: 'Monitoring and splitting', p: 'A session near its limit is split in two.', items: [
        ['Fill gauge: a script reads the fill at every step', 'b'], ['At 300,000 tokens: take nothing new, finish, commit', 'd'],
        ['Split by scope: two children, each with a brief', 'd'], ['Or roll over: one successor continues from files', 'd'],
        ['Brief confirmation: each child checks its brief against the repository', 'd'], ['Merge small siblings', 'd']] },
      { t: 'Fallbacks', p: 'If the split does not happen in time.', items: [
        ['Tree caps: 3 children, 3 levels', 'd'], ['Hard ceiling: 10 points past the line, only the hand-over is written', 'd'],
        ['Compaction: the app summarises the window', 'b'], ['Kept tail: the last messages verbatim, beside the summary and the git status', 'b'],
        ['Hand-over check: a reader compares it with the real state', 'd'], ['Lowest-cost hand-over point: a square-root law', 'd']], link: ['feeds 3 WORK', 'path'] } ] },
  F: { hue: 'recover', title: 'RECOVERY', purpose: 'Work is kept and resumed when a session or the machine fails.',
    foot: 'Status: scripts built, 965 tests pass; never run on a real tree. 13 fixes designed, none built. Open: keeping the PC on while the owner is away.', cards: [
      { t: 'State on disk', p: 'No important state is kept only inside a session.', items: [
        ['Task table: units, attempts, states', 'b'], ['Commit record: a result exists once its record is written; the first record wins', 'b'],
        ['Checkpoint: a session near its cap saves its state', 'd']] },
      { t: 'Monitoring', p: 'A script outside the session checks progress, not only that it is running.', items: [
        ['Watcher: reads, decides, exits', 'b'], ['Stall: calls but no progress. Hang: no calls. Loop: the same call three times', 'b']] },
      { t: 'Restart', p: 'One restart, from the last commit.', items: [
        ['Restart once; a second failure goes to the parent', 'b'], ['Attempt number and fence: output of an older attempt is refused', 'b'],
        ['Circuit breaker: two new failures in a row stop the wave', 'd']] },
      { t: 'Resume', p: 'State is re-read from files.', items: [
        ['A wake signal is only a hint; two wake sources back each other up', 'b'], ['Resume two at a time; a session that disagrees with its branch stays parked', 'd']] },
      { t: 'External safeguards', p: 'For when the whole tree stops.', items: [
        ['Inactivity alert: fires if the whole tree stops', 'd'], ['Machine: off-site copy, restart chain, sensor log, no sleep while working', 'd']], link: ['feeds 3 WORK', 'path'] } ] },
  G: { hue: 'improve', title: 'MEASUREMENT AND RESEARCH', purpose: 'Measurements and research are used to revise the harness rules.',
    foot: 'Status: research round 3 had four lanes and 361 claims, each through a script gate and an independent refuter. Not done: the pilot, one real task run as a tree against a single session.', cards: [
      { t: 'Measure', p: 'All work is evaluated on the same seven measures.', items: [
        ['Seven measures: throughput, efficiency, token count, token cost, time taken, quality, hallucinations', 'b'],
        ['Token tally: every transcript counted, per session and per unit', 'b'], ['Machine recorder: memory, processor, the test queue', 'b']] },
      { t: 'Research', p: 'Collection and analysis before review.', items: [
        ['Questions fixed before any reading starts', 'b'], ['Collectors (cheaper models): facts and quotes, no judgment', 'b'],
        ['Analysts (stronger models): each claim with its source and what would disprove it', 'b']] },
      { t: 'Review', p: 'Independent review of every claim.', items: [
        ['Citation check: every quote exists where it is claimed', 'b'], ['Refuter sees only the claim and its evidence', 'b'],
        ['Three outcomes: verified, open risk, refuted; the top session decides', 'b']] },
      { t: 'Design', p: 'Start from an established design rather than a new one.', items: [
        ['Identify the classical problem and its standard solution first', 'b'],
        ['Seven designs adopted: master and workers, append-only storage, a trusted checker, systematic review, planted faults, B-trees, hazard analysis', 'b'],
        ['Model check: the rules run as a state machine with faults injected', 'b'], ['External practice: 24 adopted and 54 to trial, of 861 ideas read', 'b'],
        ['Eight research lanes: tokens, graphs, learned encoders, memory and time, logic with learning, local models, orchestration, measurement', 'd'],
        ['A single negative result does not rule out a method', 'b']] },
      { t: 'Validation before rollout', p: 'Cheapest test first.', items: [
        ['Replay of recorded sessions before live use, at no model cost', 'b'], ['Dry run with stub agents to test the infrastructure', 'd'],
        ['One live trial, with the scoring fixed beforehand, against a control', 'd']], link: ['feeds B3 Library · 1 PLAN (revised rules)', 'memory'] } ] },
};

// The system map: one box per pipeline. [id, hue, code, name, one line, target lane]
export const MAP = {
  top: [null, ['mB2', 'memory', 'B2', 'Problem lookup', 'Search stored problems first.', 'B2'], ['mB4', 'memory', 'B4', 'Reasoning cache', 'A cheaper model reuses stored solutions.', 'B4'],
    ['mA3', 'know', 'A3', 'Code queries', 'Short answers instead of whole files.', 'A3'], ['mA2', 'know', 'A2', 'Graph model training', 'Which files are related.', 'A2'],
    ['mA1', 'know', 'A1', 'Code map', 'The repository as a graph of facts.', 'A1'], ['mB1', 'memory', 'B1', 'Problem records', 'Solved problems with a cause check.', 'B1']],
  path: [['m1', 'path', '1', 'PLAN', 'Split the request into units.', 'S1'], ['m2', 'path', '2', 'ADMIT', 'What starts now, on which model.', 'S2'], ['m3', 'path', '3', 'WORK', 'Sessions run the units.', 'S3'],
    ['m4', 'path', '4', 'CHECK', 'Tests and review.', 'S4'], ['m5', 'path', '5', 'LAND', 'Merges in order.', 'S5'], ['m6', 'path', '6', 'LEARN', 'Record results.', 'S6']],
  bottom: [null, ['mC', 'guard', 'C', 'Guards', 'Scripts that can refuse a step.', 'C'], ['mD', 'limit', 'D', 'Limits', 'How many run at once.', 'D'], ['mE', 'context', 'E', 'Context', 'Keep each window small.', 'E'],
    ['mF', 'recover', 'F', 'Recovery', 'Resume after a failure.', 'F'], null, ['mG', 'improve', 'G', 'Measurement', 'Revise rules from results.', 'G']],
  west: [['mB5', 'memory', 'B5', 'Standing notes', '', 'B5'], ['mB3', 'memory', 'B3', 'Library', '', 'B3']],
};
