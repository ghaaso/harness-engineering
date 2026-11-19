// What the diagram says. Three levels:
//   a pipeline (code, title, one line), its steps (title, one line), and the parts inside a step.
// A part is [text, state]; state: b = built, d = designed, i = idea, n = built and tested once, no gain yet.
// A step with no parts carries its own state (s). link = [text, hue of the pipeline it points at].

export const PATH = [
  { id: 'S1', code: '1', title: 'PLAN', purpose: 'Turn a request into units of work that can run side by side.',
    foot: 'Not settled: how the plan is redone after a unit fails.', cards: [
      { t: 'Understand the request', p: 'Say back what is wanted before any work starts.', items: [
        ['The request arrives in the owner\'s words', 'b'], ['Session start: the board is loaded (rules, facts, next task)', 'b'],
        ['Say it back, then act on the owner\'s go', 'b'], ['Derive from research and measurements; do not ask', 'b']] },
      { t: 'Check what is known', p: 'Look it up before working it out.', items: [
        ['Ask memory first: solved or ruled on before?', 'b'], ['Read the token usage and agree a cap before any fan-out', 'b']],
        link: ['uses B2 Look up · B3 Library · B5 Notes', 'memory'] },
      { t: 'Cut into units', p: 'A unit is one job for one session, small enough for one context window.', items: [
        ['Cut the work into units', 'd'], ['Each unit declares: files it writes and reads, what it needs first, shared things, risk, model, size', 'd']] },
      { t: 'Order the units', p: 'Find what can run together, and when it will finish.', items: [
        ['Two graphs: needs (who waits for whom) and collisions (who writes the same place)', 'd'],
        ['Waves: units with no unmet need and no collision start together', 'd'],
        ['Predicted finish, and the limit that will bind', 'd'], ['The plan as data: role, model, token limit and order, in a file the gate reads', 'b']] } ] },
  { id: 'S2', code: '2', title: 'ADMIT', purpose: 'Decide what starts now, and on which model.',
    foot: 'Not settled: how to put a number on the value of a unit.', cards: [
      { t: 'Ready and fit', p: 'Only units whose needs are done and that fit every limit.', items: [
        ['Ready queue: units whose needs are all done', 'b'], ['Fit filter: a unit must fit every limit at once', 'd']], link: ['uses D Limits', 'limit'] },
      { t: 'Pick the next unit', p: 'Which of the ready units goes first.', items: [
        ['In a tight token window: most value per token', 'd'], ['Otherwise oldest first, with short units filling the gaps', 'd'],
        ['Reservation: a slot and tokens held for the oldest unit that does not fit yet', 'd']] },
      { t: 'Pick the model', p: 'The smallest model that gives the same output.', items: [
        ['Haiku: locate things, extract into a fixed form', 'b'], ['Sonnet: read, collect, run commands, build ordinary code', 'b'],
        ['Opus: delicate code, analysis, refuting, coordinating', 'b'], ['Fable: coordinating a tree that has sub-trees', 'b'],
        ['Effort before size: think harder before a bigger model', 'd']], link: ['see B4 Reasoning cache', 'memory'] },
      { t: 'Gate and start', p: 'A script allows the start; the unit gets its own workspace.', items: [
        ['Plan gate: refuses a start the plan does not allow', 'b'], ['Start: own copy of the repository, own branch, a one-page brief', 'b']] } ] },
  { id: 'S3', code: '3', title: 'WORK', purpose: 'A tree of sessions. Each session has one purpose.',
    foot: 'Not settled: split the tree or hand over when work grows; when an inner level pays.', cards: [
      { t: 'The tree of sessions', p: 'Coordinators coordinate; workers work.', items: [
        ['Root session: only coordinates; keeps the task table', 'b'], ['Inner session: coordinates one part, where its summary is far shorter than the work', 'd'],
        ['Worker session: one unit, in its own copy (a worktree)', 'b'], ['Helpers: short-lived, one lookup or one check; not a level of the tree', 'b']] },
      { t: 'Brief in, fixed form out', p: 'How sessions pass work without reading each other again.', items: [
        ['The brief: one page with scope, pointers to files, what is settled, open items, done condition', 'b'], ['Fixed return form, checked by script', 'b']] },
      { t: 'The worker\'s loop', p: 'Look up, claim, write.', items: [
        ['Ask, do not read: the code map and memory before opening files', 'd'], ['Claim: declare what will be written, down to the function', 'd'],
        ['Version-checked write: only if the place is unchanged since it was read', 'd']], link: ['uses A3 Answer a question · B2 Look up', 'know'] },
      { t: 'Report and wake', p: 'Results stay on disk; the parent reads a summary.', items: [
        ['Results on disk: only path, hash and a short summary go up', 'b'], ['Claims file: every claim with the test that proves it', 'd'],
        ['"Done" is written last; the parent wakes, reads state again, starts the next unit', 'b']] } ] },
  { id: 'S4', code: '4', title: 'CHECK', purpose: 'Nothing lands unchecked.',
    foot: 'Not settled: who runs the gate where hooks cannot; the rule for tests that fail at random.', cards: [
      { t: 'Own tests', p: 'While it works, a unit runs only its own tests.', items: [
        ['Own tests first', 'b'], ['Full suite at the right time: before work is stacked on unchecked parts, and once at the end', 'b']] },
      { t: 'The shared check', p: 'The full suite has few slots, so it is queued and made cheaper.', items: [
        ['A fair, visible queue; runs in a clean container', 'd'], ['Shorten the run: only the tests the change can affect', 'd'],
        ['Batch what waits; split the batch only if it fails', 'd'], ['Test ahead: assume the change in front passes', 'd']] },
      { t: 'Blind review', p: 'A fresh session tries to break the result.', items: [
        ['Blind refuter: sees only the result', 'b'], ['Coverage rule: every item comes back, is run again, or is waived in writing', 'b'],
        ['Planted faults: measure how many each check really catches', 'b']] },
      { t: 'Verdict', p: 'A typed answer about one exact commit.', items: [
        ['Typed verdict: pass, fail or not run, naming the commit', 'd'], ['Finding rule: closes only on a test that fails before the fix and passes after', 'd'],
        ['Fix rounds: two at most; revert, do not patch; a fresh reviewer after two failures', 'd']] } ] },
  { id: 'S5', code: '5', title: 'LAND', purpose: 'One ordered merge at a time.',
    foot: 'Not settled: wait or redo when two units hit one place. The literature gives no general answer.', cards: [
      { t: 'Merge queue', p: 'One script, one lock, one order.', items: [
        ['One order, one lock', 'd'], ['Verdict must match: only the exact commit that was judged is merged', 'd'],
        ['A human reads risky lines (money, access) before the merge', 'd']] },
      { t: 'Merge, then recheck', p: 'The merged result is checked; a failure is undone.', items: [
        ['The check runs on the merged result; on failure the merge is undone', 'd'], ['Commit check: refuses a commit that edits records or evidence', 'b']] },
      { t: 'Two writers, one place', p: 'Tried in this order when changes collide.', items: [
        ['1. Own copies: the floor', 'b'], ['2. Reshape hot places into entries applied at landing', 'd'], ['3. Version-checked writes: read again and redo if it changed', 'd'],
        ['4. Claims below the file: lock a function, not a file', 'd'], ['5. Wait for a hot pair, if waiting costs less than redoing', 'd'], ['6. Structured merge, last', 'd']] },
      { t: 'After the landing', p: 'The records follow the code.', items: [
        ['Board rebuilt from each unit\'s state file, never edited by hand', 'd']], link: ['feeds A1 Build the code map', 'know'] } ] },
  { id: 'S6', code: '6', title: 'LEARN', purpose: 'Keep what this work taught.',
    foot: 'Not settled: who marks a stored entry stale when the code under it changes.', cards: [
      { t: 'Write back the numbers', p: 'Real measurements correct the next plan.', items: [
        ['Real footprint and times of each unit', 'd'], ['Tokens per unit become the next plan\'s estimate', 'b'], ['Correct the rates: predicted finish against real finish', 'd']],
        link: ['feeds D Limits · G Measure and improve', 'improve'] },
      { t: 'File the knowledge', p: 'Solved problems and findings go into memory.', items: [
        ['A hard problem that was solved is filed in the knowledge store', 'd'], ['A finding, a ruling or a mistake becomes a library record with its evidence', 'b']],
        link: ['feeds B1 File a solved problem · B3 Library', 'memory'] },
      { t: 'Harden into checks', p: 'A lesson that repeats becomes a test.', items: [
        ['Rule of three: seen three times, it becomes a lint rule, a test or a gate clause', 'd'], ['Promoted check: a proven trap becomes a test in the shared check', 'd']] },
      { t: 'Prune and hand over', p: 'Memory must stay true and must pay for itself.', items: [
        ['Mark what went stale', 'd'], ['Write down misses', 'd'], ['Count every lookup: hits, misses, false leads', 'd'],
        ['Stop rule: a store with fewer than 3 verified hits in 20 uses is retired', 'd'], ['Hand over through files, not through a session\'s memory', 'b']] } ] },
];

export const LANES = {
  A1: { hue: 'know', title: 'BUILD THE CODE MAP', purpose: 'Turn the repository into a graph of facts. Scripts do it; no model is asked.',
    foot: 'Today: on one repository the typed store beat scripted search by 0.076 in answer recall; three storage engines gave identical answers; a popular outside graph tool scored lower (0.564 against 0.700). Not settled: which parser builds the facts.', cards: [
      { t: 'Sources', p: 'What is read.', items: [['Repository files at one commit: code, tests, settings, documents', 'b'], ['Git history: which files changed together, and when', 'b']] },
      { t: 'Extract facts', p: 'Scripts turn files into typed facts in about 5 seconds.', items: [
        ['Fact extractor: a script, no model', 'b'], ['Links hidden in strings: a web route and its client call, a queue and its handler', 'd'],
        ['Document reader: sections by heading, each with a content hash', 'd'], ['Conclusion ledger: claim, evidence and source, so it can be rechecked', 'd']] },
      { t: 'The graph', p: 'Things, and the typed links between them.', items: [
        ['Nodes: files, definitions, tests, tables, settings, migrations', 'b'], ['Edges: imports, calls, tests, cites, changed together', 'b'],
        ['Change sets: one node per commit joins its files', 'd'], ['Time on every fact: true from one commit until another', 'd'], ['A renamed or moved definition keeps its identity', 'd']] },
      { t: 'Typed store', p: 'All facts in one SQLite database, rebuilt for each working copy.', items: [
        ['One database of typed facts', 'b'], ['Re-extract on change: rebuilt in seconds; nothing expires by age', 'b']], link: ['feeds A2 Train models · A3 Answer a question', 'know'] } ] },
  A2: { hue: 'know', title: 'TRAIN MODELS ON THE GRAPH', purpose: 'Learn from past commits which files belong together. Runs on the graphics card.',
    foot: 'Today: built and run once; the trained models added nothing in the one form tried, on one repository. That is one form, not a verdict. Not settled: whether another form helps.', cards: [
      { t: 'Training set', p: 'The graph as it stood at each past commit.', items: [['Graph snapshots, one per past commit', 'b']] },
      { t: 'Train', p: 'Hide a true link; learn to rank it above false ones.', items: [
        ['Goal: predict links', 'b'], ['On the graphics card: an RTX 5070 with 12 GB, in containers, network off', 'b']] },
      { t: 'The models', p: 'Five kinds, from tried to idea.', items: [
        ['Graph embeddings (RotatE, ComplEx, TransE): each node becomes a vector of 256 numbers', 'n'], ['Graph neural encoder (CompGCN): a node also mixes in its neighbours', 'n'],
        ['Routed specialists: one small model per code area, and a router', 'n'], ['Text and code embeddings: search by meaning, not by word', 'i'],
        ['Fine-tuned retriever: a small local model trained on our own lookups', 'i']] },
      { t: 'Honest scoring', p: 'Rules that stop a result from fooling us.', items: [
        ['Tune, freeze, then score once on commits never seen', 'b'], ['Placebo arm: a random scorer goes through the same steps', 'b'],
        ['Simple floors to beat: same folder, changed together, plain search', 'b']] },
      { t: 'Link scores', p: 'For a start file: how likely each other file is linked to it.', s: 'n', link: ['feeds A3 Answer a question (Rank)', 'know'] } ] },
  A3: { hue: 'know', title: 'ANSWER A QUESTION', purpose: 'An agent asks. A few hundred tokens come back, instead of whole files.',
    foot: 'Today: in a replay the cache served 87.6 % of lookups with 0.0 % wrong answers. Not run yet: an agent using the layer while it works. Set aside after study: a graph database server, a graph written by a model, expiry by age.', cards: [
      { t: 'Ask', p: 'The agent pulls an answer when it needs one.', items: [
        ['A question arrives: what does changing this file touch?', 'd'], ['Pulled, never pushed: one command; nothing stuffed into every prompt', 'd'],
        ['Question forms: a fixed list of kinds of question, each with its measured quality', 'd']] },
      { t: 'Cache check', p: 'Same question, same facts: the same answer, at once.', items: [
        ['Answer cache', 'b'], ['Drop only what changed: an answer goes only if a fact it read has changed', 'b']] },
      { t: 'Find and walk', p: 'From the start nodes, follow typed links a few hops.', items: [
        ['Find the start: by keyword or by path', 'b'], ['Walk the graph, within a budget of links', 'b']] },
      { t: 'Rank', p: 'Three lists, fused into one.', items: [
        ['Closeness: personalised PageRank from the start file', 'b'], ['Changed together: how often, as a confidence', 'b'],
        ['Learned score: the link scores of the models', 'n'], ['Fuse: reciprocal rank fusion, the sum of 1 / (60 + rank)', 'b']] },
      { t: 'Pack and return', p: 'Keep the best that fits the budget.', items: [
        ['Pack to a budget of about 8,000 tokens', 'b'], ['The answer: a tool result of a few hundred tokens', 'd']], link: ['feeds 3 WORK', 'path'] },
      { t: 'Ways agents use it', p: 'The same layer, at different moments.', noArrow: true, items: [
        ['Session-start brief: a short map of the area', 'd'], ['Touch list: the functions, callers, co-changed files and tests of a change', 'i'],
        ['Edit-time warning: a hook warns on a risky edit', 'i'], ['The real test: an agent with this tool against one with plain search', 'd']] } ] },
  B1: { hue: 'memory', title: 'FILE A SOLVED PROBLEM', purpose: 'Whoever solves a hard problem stores it, in a way that can be trusted later.',
    foot: 'Today: a complete design, not built.', cards: [
      { t: 'Record', p: 'A fixed form: symptom, cause, fix, dead ends.', s: 'd' },
      { t: 'Prove it', p: 'The entry carries a check that shows the cause is really there.', items: [
        ['Control pair: the check fires on the known-bad commit and stays quiet on the known-good one', 'd']] },
      { t: 'Write gate', p: 'Nothing unsafe or duplicated gets in.', items: [
        ['Scrubs secrets; refuses duplicates', 'd'], ['Asks: was this stored already, but not found?', 'd']] },
      { t: 'Review', p: 'A reviewer who is not the author tries to refute it.', items: [['Reviewer confirms: a strong model, never the author', 'd']] },
      { t: 'Store', p: 'Append-only files are the truth; a search index is rebuilt from them.', items: [['Journal and index (SQLite)', 'd']], link: ['feeds B2 Look up before solving', 'memory'] } ] },
  B2: { hue: 'memory', title: 'LOOK UP BEFORE SOLVING', purpose: 'Before spending tokens on a problem, ask whether it was solved before.',
    foot: 'Today: a complete design, not built. Not settled: whether the library grows into this store or stays beside it.', cards: [
      { t: 'When to look', p: 'At the moments where repeating work costs most.', items: [
        ['Before a stronger model, before a retry, before applying a suggested fix', 'd'], ['Lookup on a diff: warns when a change touches something an entry protects', 'd']] },
      { t: 'Match', p: 'Find the stored entry for this error.', items: [
        ['Lookup: the error text is masked into a stable template and matched', 'd'], ['Lead, candidate or miss; never a guess', 'd']] },
      { t: 'Verify gate', p: 'The entry\'s own check runs on today\'s code. The fix is shown only if the cause is present.', items: [
        ['Verify before use', 'd'], ['Do-not-apply entries: warnings that a tempting fix is wrong here', 'd']] },
      { t: 'Keep it true', p: 'An entry is rechecked when the code under it changes.', items: [['Suspect on change: marked, then its check runs again', 'd']], link: ['feeds 1 PLAN · 3 WORK', 'path'] } ] },
  B3: { hue: 'memory', title: 'LIBRARY OF RULINGS AND FACTS', purpose: 'The project\'s own record of what was decided, measured and got wrong.',
    foot: 'Today: built and in daily use.', cards: [
      { t: 'Record', p: 'A claim plus how it is known: measured, quoted from a paper, reasoned, or the owner\'s ruling.', s: 'b' },
      { t: 'Journal', p: 'One line per record. Lines are only added, never changed.', items: [['Correction: a new record replaces a wrong one; the top session decides', 'b']] },
      { t: 'Board', p: 'One page: before you do X, look up Y. Also the open tasks and the known gaps.', s: 'b' },
      { t: 'Lookup', p: 'By id or by word. Nothing found means "not recorded", never a guess.', items: [['Recall test: a fresh session answers from the library alone', 'b']], link: ['feeds 1 PLAN (every session start)', 'path'] } ] },
  B4: { hue: 'memory', title: 'REASONING CACHE', purpose: 'Let a cheap model reuse what a strong model already worked out.',
    foot: 'Today: modelled only. Not settled: whether reuse beats the plain ladder; how partial solutions would be joined.', cards: [
      { t: 'Cheap model first', p: 'A small model tries, using a stored solution if one fits.', s: 'i' },
      { t: 'Climb the ladder', p: 'If it fails, the problem climbs: Haiku, Sonnet, Opus, Fable.', s: 'i' },
      { t: 'Store the solution', p: 'What the strong model worked out is kept for next time.', items: [
        ['Stored for the cheap model to reuse', 'i'], ['Join partial solutions: pieces of several stored solutions, joined through the graph', 'i']] },
      { t: 'Count the reuse', p: 'Does reuse really beat the plain ladder?', items: [
        ['Reuse funnel: seven stages a reused answer must survive, each counted', 'd'],
        ['Tests before building: would a perfect lookup have matched? how much is covered? how often is work sent back?', 'i']], link: ['feeds 2 ADMIT (Pick the model)', 'path'] } ] },
  B5: { hue: 'memory', title: 'STANDING NOTES', purpose: 'What every session is given before it starts.', noSeq: true,
    foot: 'Today: built and in daily use.', cards: [
      { t: 'Instruction file', p: 'A short root map every session loads. Detail sits in files that load only where needed.', items: [['Skills: packaged how-tos, loaded only when a task needs them', 'b']] },
      { t: 'Notes', p: 'What must survive a hand-over.', items: [
        ['Memory index: one line per lasting note; a note is opened only when needed', 'b'], ['Notes file: written before a hand-over, read back after it', 'b']] },
      { t: 'Keep it small', p: 'Every call reads the standing text again.', items: [
        ['Small standing context', 'd'], ['Keep the prompt cache: add at the end, never at the top', 'b']], link: ['feeds 1 PLAN (every session start)', 'path'] } ] },
  C: { hue: 'guard', title: 'GUARDS', purpose: 'Scripts that check a step before it happens, and can refuse it. The model is not just asked to behave.',
    foot: 'Today: live in this repository, except the write guard and the audit. Not tested: whether the hooks fire inside helpers and in other folders.', cards: [
      { t: 'At session start', p: 'The rules are put in front of the session.', items: [['Start hook: loads the board, also after a compaction', 'b']] },
      { t: 'Before a helper starts', p: 'Right model, and allowed by the plan.', items: [
        ['Tier hook: refuses the wrong model for the kind of job', 'b'], ['Plan gate: refuses a start the plan does not allow', 'b']] },
      { t: 'Before a write', p: 'Records stay intact; a unit stays in its own files.', items: [
        ['Record guard: no edits to evidence or journal lines; no design questions to the owner', 'b'], ['Write guard: no write outside the files the unit declared', 'd']] },
      { t: 'For a heavy command', p: 'Heavy work waits its turn.', items: [['The lane: a queue with a few slots, low priority, a time limit', 'b']] },
      { t: 'At commit', p: 'The same rules once more.', items: [['Commit check: also catches writes made through the shell', 'b']] },
      { t: 'Afterwards', p: 'What really happened is read back.', items: [['Transcript audit: which model each helper really ran on, and what it read', 'd']] },
      { t: 'Trust base', p: 'What the guards themselves rest on.', noArrow: true, items: [
        ['Least privilege: each role gets only its tools and folders', 'b'], ['Trusted checker: only a small script promotes a claim to a fact', 'b'],
        ['Sealed ledger: each line carries the hash of the line before', 'b'], ['Self-test and canary: a planted violation must be caught', 'b']] } ] },
  D: { hue: 'limit', title: 'LIMITS', purpose: 'How many units run at once: as many as the tightest limit allows.',
    foot: 'A hypothesis built from the literature. Its numbers wait for measurements Q01 to Q37. Not known: how tokens that are read again count against the allowance.', cards: [
      { t: 'Measure each limit', p: 'One number per scarce thing.', items: [
        ['Memory: a hard floor; below it nothing starts', 'd'], ['Processor: cores busy against cores present', 'd'],
        ['The shared check: slots × (check time + work time) / check time', 'd'], ['Ready work: more workers than ready units helps nothing', 'd'],
        ['Token windows: one refills every 5 hours, one every week; fit both', 'd'], ['The parent\'s window: too many children overflow it', 'd']] },
      { t: 'Width = the smallest', p: 'Run as many as the tightest limit allows, and name that limit.', s: 'd' },
      { t: 'Pace the tokens', p: 'Spend the allowance without running dry.', items: [
        ['Token governor: one budget per window; learns the window\'s size from limit messages', 'd'], ['Reserve: for running units, and for the owner\'s own use', 'd'],
        ['Spend the rest at once, while work is waiting', 'd'], ['A unit\'s own cap: measured need plus a buffer; then save state and hand on', 'd'],
        ['A dearer model only where its value beats its share of the window', 'd']], link: ['feeds 2 ADMIT', 'path'] } ] },
  E: { hue: 'context', title: 'CONTEXT', purpose: 'Keep every session\'s window small, because every call reads all of it again.',
    foot: 'Measured over 7.35 billion tokens in two projects. The split rule is approved for one trial at 300,000 tokens; not run yet. Not settled: whether a brief loses less than a summary.', cards: [
      { t: 'Where the tokens go', p: 'Measured over 35,800 model calls.', items: [
        ['Reading again is 96.8 % of all tokens: use = calls × window size', 'b'], ['A window holds: fixed prefix 27 %, own earlier output 26 %, fetched content 26 %, old summaries 8 %', 'b'],
        ['The long coordinator is the main sink: 333,000 to 396,000 tokens per call', 'b'], ['65 % of a session\'s re-read tokens sit past 300,000', 'b'],
        ['Not the problem: model mix, file reads, human prompts', 'b'], ['After a compaction: mistakes rise from 0.58 to 1.35 per 100 calls, then fade', 'b']] },
      { t: 'Keep the window small', p: 'Six levers.', items: [
        ['Cap the coordinator: hand over at 150,000 to 200,000 tokens', 'd'], ['Strip the helper prefix: about 60,000 tokens of unused tool descriptions', 'd'],
        ['Batch lookups: one call for several reads', 'i'], ['Keep own output on disk, not in the window', 'i'],
        ['Fewer parent wakes: children report in batches', 'd'], ['Scripts before agents', 'd']] },
      { t: 'Watch and split', p: 'A full session becomes two.', items: [
        ['Fill gauge: a script reads the fill at every step', 'b'], ['The line: at 300,000 take nothing new, finish, commit', 'd'],
        ['Split by scope: two children, each with a brief', 'd'], ['Or roll over: one successor continues from files', 'd'],
        ['"Taken": each child confirms its brief against the repository', 'd'], ['Merge small siblings', 'd']] },
      { t: 'Backstops', p: 'If the split does not happen in time.', items: [
        ['Caps on the tree: 3 children, 3 levels', 'd'], ['Hard ceiling: past the line plus 10 points, only the hand-over is written', 'd'],
        ['Compaction: the app summarises the window', 'b'], ['Kept tail: the last messages word for word, beside the summary and the git status', 'b'],
        ['Hand-over check: a reader compares it with the real state', 'd'], ['Cheapest hand-over point: a square-root law', 'd']], link: ['feeds 3 WORK', 'path'] } ] },
  F: { hue: 'recover', title: 'RECOVERY', purpose: 'Sessions and machines fail. The work must survive.',
    foot: 'Today: scripts built, 965 tests pass; never run on a real tree. 13 fixes designed, none built. Not solved: keeping the PC on while the owner is away.', cards: [
      { t: 'Keep state on disk', p: 'Nothing important lives only inside a session.', items: [
        ['Task table: units, attempts, states', 'b'], ['Commit record: a result exists once its record is written; the first record wins', 'b'],
        ['Checkpoint: a session near its cap saves its state', 'd']] },
      { t: 'Watch', p: 'A script outside the session judges progress, not just liveness.', items: [
        ['Watcher: reads, decides, exits', 'b'], ['Stall: calls but no progress. Hang: no calls. Loop: the same call three times', 'b']] },
      { t: 'Restart', p: 'Once, from the last commit.', items: [
        ['Restart once; a second failure goes up to the parent', 'b'], ['Attempt number and fence: output of an older attempt is refused', 'b'],
        ['Circuit breaker: two fresh failures in a row stop the wave', 'd']] },
      { t: 'Wake and resume', p: 'State is read again from files.', items: [
        ['A wake is only a hint; two wake sources back each other up', 'b'], ['Resume two at a time; a session that disagrees with its branch stays parked', 'd']] },
      { t: 'Outside the tree', p: 'When everything stops.', items: [
        ['Dead-man alert: fires if the whole tree goes quiet', 'd'], ['The machine: a copy off the machine, a restart chain, a sensor log, no sleep while working', 'd']], link: ['feeds 3 WORK', 'path'] } ] },
  G: { hue: 'improve', title: 'MEASURE AND IMPROVE', purpose: 'The harness studies itself and changes its own rules.',
    foot: 'Round 3 of the research: four lanes, 361 claims, each through a script gate and a blind refuter. Not done: the pilot, one real task run as a tree against a single session.', cards: [
      { t: 'Measure', p: 'Everything is judged by the same seven measures.', items: [
        ['Seven measures: throughput, efficiency, token count, token cost, time taken, quality, hallucinations', 'b'],
        ['Token tally: every transcript counted, per session and per unit', 'b'], ['Machine recorder: memory, processor, the queue of the check', 'b']] },
      { t: 'Investigate', p: 'Experts first.', items: [
        ['Questions frozen before any reading starts', 'b'], ['Cheap collectors: facts and quotes, no judgment', 'b'],
        ['Strong analysts: each claim with its source and what would prove it wrong', 'b']] },
      { t: 'Review', p: 'Reviews second.', items: [
        ['Citation check: every quote exists where it is claimed', 'b'], ['Blind refuter: sees only claim and evidence', 'b'],
        ['Three buckets: verified, open risk, refuted; the top session decides', 'b']] },
      { t: 'Design', p: 'Borrow a solved design; do not invent one.', items: [
        ['Borrow solved designs: name the classical problem first', 'b'],
        ['Seven borrowed designs: master and workers, append-only storage, a trusted checker, systematic review, planted faults, B-trees, hazard analysis', 'b'],
        ['Model check: the rules run as a state machine with faults injected', 'b'], ['Outside practice: 24 adopted and 54 to trial, of 861 ideas read', 'b'],
        ['Eight research lanes: tokens, graphs, learned encoders, memory and time, logic with learning, local models, orchestration, measurement', 'd'],
        ['One null is not a verdict', 'b']] },
      { t: 'Prove before rollout', p: 'The cheapest proof first.', items: [
        ['Replay before live: over recorded sessions, at no model cost', 'b'], ['Dry run with stand-ins: fake agents test the plumbing', 'd'],
        ['One live trial, with the scoring fixed beforehand, against a control', 'd']], link: ['feeds B3 Library · 1 PLAN (better rules)', 'memory'] } ] },
};

// The system map: one box per pipeline. [id, hue, code, name, one line, target lane]
export const MAP = {
  top: [null, ['mB2', 'memory', 'B2', 'Look up before solving', 'Was this solved before?', 'B2'], ['mB4', 'memory', 'B4', 'Reasoning cache', 'Reuse what a strong model worked out.', 'B4'],
    ['mA3', 'know', 'A3', 'Answer a question', 'A small, right answer, not whole files.', 'A3'], ['mA2', 'know', 'A2', 'Train models', 'Learn which files belong together.', 'A2'],
    ['mA1', 'know', 'A1', 'Build the code map', 'The repository as a graph of facts.', 'A1'], ['mB1', 'memory', 'B1', 'File a solved problem', 'Stored so it can be trusted later.', 'B1']],
  path: [['m1', 'path', '1', 'PLAN', 'Cut the request into units.', 'S1'], ['m2', 'path', '2', 'ADMIT', 'What starts now, on which model.', 'S2'], ['m3', 'path', '3', 'WORK', 'A tree of sessions.', 'S3'],
    ['m4', 'path', '4', 'CHECK', 'Nothing lands unchecked.', 'S4'], ['m5', 'path', '5', 'LAND', 'One ordered merge at a time.', 'S5'], ['m6', 'path', '6', 'LEARN', 'Keep what the work taught.', 'S6']],
  bottom: [null, ['mC', 'guard', 'C', 'Guards', 'Scripts that can refuse a step.', 'C'], ['mD', 'limit', 'D', 'Limits', 'How many run at once.', 'D'], ['mE', 'context', 'E', 'Context', 'Keep every window small.', 'E'],
    ['mF', 'recover', 'F', 'Recovery', 'The work survives a failure.', 'F'], null, ['mG', 'improve', 'G', 'Measure and improve', 'The harness studies itself.', 'G']],
  west: [['mB5', 'memory', 'B5', 'Standing notes', '', 'B5'], ['mB3', 'memory', 'B3', 'Library', '', 'B3']],
};
