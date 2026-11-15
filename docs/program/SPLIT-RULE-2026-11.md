# Split-and-merge rule for sessions, and its replay (WP12, first deliverable)

14 November 2026. Written for the owner's yes or no before any live trial. He said yes the same day, to
one trial wave at the 300k line (part 5). Part 6 fixes what that trial is scored on, before it runs.

**What this is.** Idea PAR-22 runs orchestration as a B+ tree spread over sessions: inner sessions hold
routing keys, leaves hold the work, a session whose window passes a split line divides its work in two, and
small siblings merge. This document writes that rule down (part 1), fixes how a replay is to be scored
(part 2, written before the replay ran), and reports the replay over the Claude Code transcripts on this PC
(part 3). The replay made no model calls.

**What it is not.** Nothing here is a proven saving. The rule is untested. The replay counts exposure:
where recorded windows passed a line and what a split could touch. It cannot show the effect on quality or
hallucinations, which is what the idea is aimed at. Part 2.5 says what trial would.

**The result in short** (part 3; lines at 30, 40 and 50 % of a 1,000,000 window, so 300k, 400k, 500k).

- 72, 32 and 26 of 97 recorded session windows passed the line; 65.1, 44.6 and 36.8 % of what session
  windows re-read was read in calls past it [M]. Agent windows barely reach the lines.
- Replayed in the middle case, the rule reads 3.05B, 2.11B and 1.68B fewer context tokens than the 7.49B
  on record [E]; an earlier compaction window at the same line reads 2.89B, 2.01B and 1.58B fewer [E]. That
  is 1.06, 1.05 and 1.06 times the cap. Across the nine stated cases the ratio runs from 0.54 to 1.24,
  0.66 to 1.20 and 0.53 to 1.23 [E], and one guessed input alone moves it across the 1.10 that was fixed
  as the test (3.5). The record does not settle which is ahead on tokens.
- A 40 % or 50 % line comes before 29 and 26 of the 159 compactions on record; a 30 % line comes before
  155 [M]. Most compactions are Opus windows that the owner's setting compacts near 367k: 84 of the 117
  in session windows, 126 of 159 in all. Every line needs that setting lifted (1.2).
- The rule writes 354, 138 and 108 briefs [E]. That is 3.1, 4.9 and 4.2 for each summary on record above
  the line, and 1.3, 1.4 and 1.6 for each summary an earlier compaction window would write at the same
  line, in fewer events. Whether a brief is right more often than a summary is the thing the replay
  cannot show.
- By the tests fixed before the run (3.4): net tokens are above zero and the exposure is large at every
  line; the rule does not beat the earlier compaction window by the 10 % asked at any line in the middle
  case; the leaf test fails as written at every line, but it compared unlike units and in like units it
  is not clear-cut; 40 % and 50 % come after most compactions.
- The decision is in part 5: yes or no on the rule in part 1, before any live trial. **Decided on 14
  November: yes, one trial wave at the 300k line.**
- Preparing that trial (part 6) tested its instruments on the record first, with no model calls. The
  scripted recheck of hand-overs, which 2.5 named as the main measure, flags 16 of 1,265 pointers in the
  61 FixFlow compaction summaries on record (1.3 %) [M]. That is the script's own count, not a count of
  wrong pointers: the two states it flagged as contradicted were read by hand and are not wrong, so at
  most 14 are (6.3). It is no more than the script flags in two maintained documents (3.6 % and 1.8 %)
  [M]. A script cannot score the trial's fidelity.
- A separate check has since measured the summaries on record (`docs/program/SUMMARY-CHECK-2026-11.md`):
  0 wrong of 2,727 claims a script can recheck in 117 summaries, every flag read by hand, and 74 of the
  117 (63.2 %) whose last sections, read by one reader, call something pending that the kept tail had
  already done [M, hand, by the summary-check session]. Its 117 are not the 117 session-window
  compactions of part 3: it reads FixFlow's 69 (8 of them written after this record's cut) and the
  clinic testbed's 48, and leaves out the 8 from other projects; 109 are in both. Part 6.4 says what the
  reader's check marks in the light of that. Which of the two counts scores the trial is the owner's
  call.

**Revised after a check on 14 November.** Three checkers and a skeptic went through this deliverable;
their findings are in `docs/program/evidence/split-replay/review-2026-11-14.md`. This version applies
them: the token result is worded as the middle case it is, the briefs are also set against the
like-with-like arm, the leaf test is given in like units, the rule says who starts a root and what
happens at the caps, and the script prints one-parameter runs (table section F). A second pass on the
revision kept five small fixes, among them a double count of typed slash commands in the new prompt
count; they are applied too, and the review file's second-pass section says what was done about each.
No measured number from the first run moved; the cut is still 05:12 UTC. A third pass, after the summary
check had been checked and revised, set this record beside that one. It kept thirteen fixes to how this
record carries the summary check's results (two sets both called 117, the sizes the two records give for
the same comparison, what the second readings already cover, and wording that 6.4's marks had
overtaken), and a fresh check of those edits kept six more of the same kind. They are applied in parts
1.5, 4 and 6 and in the last point of the result in short, by the session that ran the check, and the
review file's section "Third pass: this record beside the summary check" lists each. No number of this
record's own moved.

**Tags.** [M] measured from the transcripts or quoted from a measured record. [E] estimated: computed from
measured numbers under a stated assumption. [G] guess: a parameter nobody has measured. [S] an outside
figure or textbook background, not measured here.

**Where the numbers come from.** Every number in parts 1.2 and 3 is printed by
`docs/program/evidence/split-replay/replay.js.txt` into `replay-table.txt` in the same folder; the section
letter is given beside each (A to F). The numbers in part 6 are printed by the same script into
`pointers-record.txt`, `pointers-controls.txt` and `trial-dry-run.txt`, also in that folder. Numbers quoted
from earlier records name the record. The page that shows it
all is `docs/program/split-replay/index.html`.

---

## Part 1. The rule

### 1.1 Terms

| term | meaning here |
| --- | --- |
| node | One Claude Code session with its own window. A subagent started by the Agent tool or by a workflow is not a node: it is a tool call of the session that started it, and its result returns into that session's window. |
| window | The model's context window. |
| fill | The context one call read (input + cache-write + cache-read tokens) divided by the window. It is read from the usage line of the session's latest call. |
| split line | A share of the window, set per model. Passing it makes a session due for a hand-over. |
| scope | A named, disjoint part of the work with its own durable home: a lane, a plan phase, a slice, a file set, a question with its own report file. Scopes are the key space. |
| leaf | A session that does the work of its scope. |
| inner session | A session that holds keys and routes, and does no work in any scope. The root is the inner session the owner talks to. |
| key | The smallest fact an inner session needs to route or to gate (1.6). |
| key table | A file in the repository, one row per scope, written by the inner session as each fact happens; a child writes only the state and result fields of its own row (1.8, 1.9). It is the inner session's whole state. |
| brief | The page a new session is started with (1.5). |
| open load | The open items in a session's scope. Unlike fill, it goes down as work finishes. |

### 1.2 The window and the line, per model

The transcripts carry no field that states a model's window, so each window is taken from what the record
shows the model doing: the largest context any call read, and where automatic compaction fired. The
harness's default trigger is the window minus 33,000 tokens (967,000 for a 1,000,000 window; recorded in
`docs/program/evidence/harness-bottlenecks/sweep-tables.txt:272`), so a compaction at 967,000 to 975,000 places the
window at 1,000,000.

| model | largest context one call read [M] | automatic compactions [M] | window taken | 30 % | 40 % | 50 % |
| --- | --- | --- | --- | --- | --- | --- |
| Fable 5.1 | 966k | 11, from 311k to 975k; 5 at the default trigger | 1,000,000 [E] | 300k | 400k | 500k |
| Fable 5.2 | 969k | 16, from 271k to 975k; 9 at the default trigger | 1,000,000 [E] | 300k | 400k | 500k |
| Sonnet 5.5 | 963k | 6, from 535k to 966k; 1 at the default trigger | 1,000,000 [E] | 300k | 400k | 500k |
| Opus 5.5 | 870k | 126, from 205k to 406k, median 368k; none at the default trigger | 1,000,000 [E], weaker | 300k | 400k | 500k |
| Haiku 5.5 | 116k | none | not established | – | – | – |

(Table section A4.) Three things follow.

- **All four working models show the same window, so "per model" today means per model's compaction
  setting, not per model's size.** The owner's user settings give Opus an automatic-compaction window of
  400,000 (`modelSettings.claude-opus-5-5.autoCompactWindow`), so Opus windows compact near 367,000.
  A 40 % or 50 % line (400k, 500k) sits above that trigger: on Opus those lines are not reached while
  the setting stands. And at every line the setting has to be lifted, because 1.3 puts the compaction
  trigger above the hard ceiling, which is the line plus ten points of the window: the setting must be
  above about 433k, 533k and 633k for lines at 300k, 400k and 500k (the ceiling plus the harness's
  33,000; A4). At 300k the line itself is reached before today's trigger, but the backstop is not above
  the ceiling. Part 3 shows what this does to the counts.
- **Opus's window is the weakest of the four.** No Opus compaction was recorded at the default trigger. The
  1,000,000 rests on Opus calls that read up to 870k in October (392 calls above 400k; in November none read
  more than 377k), and on the setting's own documented range of 100,000 to 1,000,000
  (`docs/program/HARNESS-BOTTLENECKS-2026-11.md:396`). Reading Opus's window as the 400,000 the owner set
  would put the three lines at 120k, 160k and 200k, all under the floor below.
- **Haiku is left out.** Its largest recorded call read 116k and it never compacted, so the record does not
  say where its window ends. It made 38 calls in 10 windows; no line is applied to them in the replay.
  claude-opus-4-8 (one call, 147k) is in the same case. Under the rule, a model whose window the record
  does not establish does not hold a node until its window is measured; a subagent on such a model
  returns what it has at the floor below or at its own compaction, whichever comes first.

**A floor under the line.** A new session does not start empty. The first call of a recorded main session
read 75k to 88k (median by project group; 79k over all) [M], and of an agent 51k to 67k [M] (table section A5; the
token report's figure is about 60k per agent and the register's TK-PREFIX about 70k). A line is unusable
when a fresh child already starts near it, so the rule sets a floor: **the line in tokens must be at least
three times a new session's measured start** [G for the factor]. On a 1,000,000 window that floor is
237k to 264k (A7), under all three lines swept. On a 200,000 window the floor would be larger than the
window itself, which is the plain reason a share of the window cannot be the whole rule.

Whether judgement falls with the share of the window or with the absolute token count is not measured for
any model (TK-FILL). The rule is written as a share because the proposal was; every share below is printed
with its tokens.

### 1.3 What triggers a split

A session reads its fill at every step boundary: after a call returns and before the next is sent.

1. **Fill at or under the line:** carry on.
2. **Fill over the line:** the session is *due*. It takes no new item, finishes or parks what is in flight
   (1.8) and hands over. Which hand-over depends on what it holds:
   - two or more open scopes: **split**, two fresh leaves, one per group of scopes (1.4);
   - one open scope that can be cut at a checkpoint into two parts sharing no files: **split** at that cut;
   - one scope that cannot be cut, or an inner session whose window filled with traffic: **roll-over**,
     one fresh session that continues from the state on disk;
   - no open work: report and close. No successor;
   - a split that would pass the fan-out cap or the depth cap: see 1.9.
3. **Hard ceiling, ten points of the window above the line** [G]: if the hand-over is not written by then,
   the session stops and writes only its keys. The hand-over has to be written while the session is still
   inside the fill we trust, which is the reason for splitting early at all.
4. **Compaction is a backstop, not a tool.** The automatic-compaction trigger is set above the hard
   ceiling. If it ever fires, the rule failed, and that is logged as a rule failure.

A roll-over is not a compaction: nothing is summarised out of the window. The successor starts from files
that were written as the work happened. It has the same weak point as a summary, though: whatever was
never written down is gone. The claim under test is that a short brief written at the line, pointing at
state that already sits in the repository, loses less than a summary written from a full window.

### 1.4 How a session's work is divided

**By scope.** This is the first reading of the proposal and the rule keeps it.

1. List the session's open items.
2. Group them into two sets of scopes that share no files. File-disjoint ownership is already the rule
   under PAR-10.
3. Of the groupings that pass step 2, take the one that balances the open load. A B+ tree splits at the
   median key; here the median is taken over work still to do, not over tokens already in the window,
   because the tokens in the window are history.
4. Cross-cutting state (rulings, the plan, a shared document with one writer) goes to neither child. It
   stays in the repository and the parent keeps the one write lock on it.
5. If no grouping passes step 2, the scope is indivisible: roll over instead.

**In two, not three.** The rule divides in two, as a B+ tree does. Dividing in three at one hand-over, up
to the fan-out cap of 1.9, is an extension the replay also runs (table section F). It is not part of the
rule as written.

**Other divisions considered, and why not.**

| division | why not as the rule |
| --- | --- |
| By time: hand the remainder to one fresh session | It keeps every scope together, so the successor fills at the same rate and hands over again: a chain, not a tree. Kept only as the fallback (the roll-over) for a scope that cannot be cut. |
| By tokens: cut the window in half by size | A window is a log in arrival order with scopes interleaved; half its tokens is not a unit of work. And a window cannot give tokens away (1.10, point 1). |
| By function: one child builds, one reviews | Every item then crosses both children, so each item is handed over twice and has two owners. This is the gate-workflow idea of WP3, a separate change. |
| By dealing items out evenly (hashing) | It balances load and destroys locality: related items land in different windows and each child re-reads the shared context. Range-partitioned stores split by key range for the same reason [S]. |
| By fork: the child inherits the conversation | The child starts as full as its parent, above the line. It is the opposite of 1.5. |

### 1.5 What a child starts with, and what it does not inherit (settles TOK-44)

**A child starts with three things.**

1. The harness's fixed start: system prompt, tool schemas, CLAUDE.md, skills, memory index. Measured, not
   chosen (1.2).
2. A brief of about a page:
   - its scope: the lanes, phases or file sets it owns, and which it must not touch;
   - pointers to durable state: paths, branch and head commit, pull request numbers, plan section ids,
     board rows. Pointers, not contents;
   - its open items, each with its state and the next step;
   - the decisions that bind its scope, by id, one line each;
   - what done looks like, and where to report (a file and a key-table row, 1.6).
3. Nothing else. It reads what it needs from the repository, so what it reads is the current state.

**A child does not inherit:** the parent's conversation; file contents the parent had read; the parent's
own earlier output (thinking, echoed commands, file bodies it wrote); tool results and shell output;
finished scopes; its sibling's scope; any summary.

**Point, do not assert.** Anything the repository can show (a file's content, a branch head, a pull
request's state, a test result) is given as a pointer and read fresh by the child. The brief asserts only
what exists nowhere else: the intent, the next step, why a path was dropped. Anything of that kind is
first written to a durable place (the pull request's decisions list, the board row) and then pointed at.
Both compaction summaries we checked were behind their kept tail on the *latest state* (PR-SUMMARY;
overtaken in the kept tail, in 6.4's marks); under this rule the latest state is never carried in prose.

**TOK-44, settled.** The request was to take finished material out of a live window. A live window cannot
give anything up: only compaction, clearing or a fresh session removes material. Under this rule the
finished material never enters a new window. "Finished" is everything a brief does not name, and it stays
where it already is: in the repository and in the closed session's transcript on disk, which can still be
searched for exact text. So TOK-44 needs no mechanism of its own; it becomes the "does not inherit" list
above. It is only as good as the briefs: a child missing something re-reads it (tokens) or guesses
(quality). The trial has to count both.

### 1.6 What the parent keeps: keys

A key is a fact an inner session needs in order to route a message or to gate a result, and nothing it
would need in order to do the work. One row per scope:

| field | example of the kind of value |
| --- | --- |
| scope id and one line saying what it covers | lane L4, mobile queue fixes |
| owner | the leaf's session id |
| state, from a closed set | open, blocked, ready for review, done |
| pointer to the durable result | branch and head commit, pull request number, report path |
| verdict, once done | one word and a pointer to the review |
| blocked on | an owner decision id, or a sibling scope id |

**Not keys:** file contents, diffs, logs, reasoning, the text of review findings, the body of a brief, a
child's report beyond a capped hand-back (TOK-03 caps it at about 2,500 characters [S]).

The key table is a file, written when each fact happens. So an inner session can be replaced at any moment
by a fresh one that reads the table, and nothing the table holds is lost.

Two plain consequences.

- **What the root does today is leaf work.** Our root reviews, merges, edits the board and runs checks
  (B04). Under this rule an inner session does none of that; those jobs move to leaves, and the root only
  routes and gates. This is the largest change the rule asks for.
- **An inner window still grows.** Every message it routes and every report it receives is appended, and
  its fixed start is re-read on every call. "Keys only" bounds what an inner session must know, not what
  its window accumulates. Inner sessions meet the line too, more slowly, and then roll over from the key
  table.

An inner session splits for a different reason: too many children. When its live children pass the fan-out
cap (1.9) it divides its key range in two and its own parent gains a key. If it is the root, a new root
starts above it. That is the only way the tree gets deeper.

**Who starts a root.** The root has no parent. Its successor on a roll-over, or the new root above it on
a split, is started by the owner, never by the old root: a session the old root started would be its
child (1.8, step 5). The old root writes its key table and one line that points at it; the owner opens
the new root on that pointer and moves the conversation there; the old root closes once the new root has
written "taken" in the root row. This puts a step on the owner at every root hand-over, and the root is
the session the proposal is about.

### 1.7 When two small siblings merge

A page's fill goes down when records are deleted. A window's fill never goes down. So the merge test cannot
read the window; it reads the open load.

Two sibling leaves merge when conditions 1, 2 and 4 hold; condition 3 decides how:

1. both are at a step boundary with nothing in flight;
2. each has at most two open items [G], or one of them has finished;
3. in place, when the absorbing sibling's fill plus the other's brief stays under **half the split
   line**. Half is the B+ tree's minimum fill [S]; here it is the gap that stops a merge from causing a
   split straight after. Otherwise by a fresh session;
4. they have the same parent, and the merged file set has one owner.

In place: the sibling with the lower fill absorbs. The other writes a brief for what it has left and
closes; the parent rewrites two key rows as one. No session is started, so no start is paid. By a fresh
session: one new session takes both briefs and one start is paid. A new leaf starts near 100k and a
window grows 2.8k a call, so the in-place case is open only for about a leaf's first 19, 35 and 50 calls
at the three lines (table section D) [E]. In practice the fresh-session merge is the usual one.

Borrowing is not in the rule. A B+ tree also moves single records between siblings to put off a merge;
moving one open item to a sibling with room would be the session form of it, and this rule does not
specify it.

Three smaller cases.

- **A wrong split.** Siblings that keep needing each other's files, or exchange more than three messages
  per item [G], are one scope. Merge them.
- **A finished leaf** just closes; its row goes to done.
- **An inner session left with one child** is removed and the child reports one level up.

### 1.8 Work in flight at the moment of a split

The line is a trigger to hand over, not a kill switch. The order:

1. **Stop intake.** The due session takes no new item and tells its parent in one line.
2. **Drain.** Running subagents and commands finish or are cancelled. A subagent's result goes to its
   report file, not only into the window.
3. **Make state durable.** Work in progress is committed to the scope's branch; nothing is left uncommitted
   and nothing is stashed. The board row and the pull request body are brought up to date.
4. **Write the two briefs and the new key rows** to files, and commit them.
5. **The parent starts the two children.** The parent, not the due session: Claude Code attaches a new
   session to whichever session starts it, so a leaf that started its own successors would become their
   parent and the tree would grow one level deeper with every split.
6. **Each child checks its brief against the repository** (paths exist, the branch head is the commit
   named) and writes "taken" in its key row. A mismatch goes to the parent, and the old session, still
   open, answers it.
7. **The parent closes the old session** once both rows say "taken". Its transcript stays on disk.

Until its row says "taken" the old session owns the scope; from then on the child does. One owner per
scope at every moment, and ownership changes hands in one write to the key table, made by the child to
its own row.

- **Messages for a closed session** are routed by the parent from the key table.
- **A crash between steps** (this PC has had them): on restart the parent reads the key table and starts
  again only the children whose row has a brief and no "taken". Nothing makes "read not taken, write
  taken" a single step (1.10, point 11), so this relies on one parent starting each child, once.
- **Work that cannot be parked** (a migration that is running, a merge in progress, a device session with
  the owner) is finished first, past the line if need be, up to the hard ceiling.

### 1.9 How the tree stays shallow

1. **Depth grows only at the root.** Leaves never start their own successors (1.8, step 5), so every leaf
   stays at the same depth.
2. **Three levels at most:** root, lane leads, leaves, as PAR-10 already runs. A need for a fourth level
   goes to the owner as a question, not into the tree.
3. **A fan-out cap per inner session:** three running children per node today (PAR-10) [S]. The cap comes
   from the machine and from what one inner window can track, not from the idea.
4. **Pruning:** finished leaves close, small siblings merge, one-child inner sessions are removed (1.7).
5. **Subagents are not levels.** A subagent that reaches the line returns what it has, and the leaf that
   called it starts a fresh one from the written state.
6. **Traffic goes around inner sessions where it can.** Children write results to the repository and to
   their key row; siblings hand work to each other through the repository; the owner can open a leaf
   directly. Every message that does not pass through the root is a message the root's window never holds.

**When a split would pass a cap.** A split adds one child to the due session's parent. If that takes the
parent past the fan-out cap, the parent divides its key range first (1.6), which adds a child one level
up, and so on to the root. If the tree is already three levels deep and has no room, nothing can be
added: the due session rolls over instead of splitting, and the owner is told. Three levels of three is
nine leaves. The replay applies neither cap, and some of its windows end with more leaves than that
(3.3).

### 1.10 The B+ tree and distributed-systems parts, and where the analogy stops

| B+ tree or distributed store [S] | here |
| --- | --- |
| node, page | a session and its window |
| node capacity | the split line in tokens, not the window: the node is treated as full long before the window is |
| fill factor | fill at the line; a new leaf starts well under it |
| leaf holding records | a leaf session holding the work of its scope |
| inner node holding separator keys and child pointers | an inner session holding the key table: scope, owner, state, pointer |
| split: overflow, two half-full nodes, one separator goes up | a due session is replaced by two fresh leaves and its parent gains one key row |
| splitting a full node on the way down, before it must | splitting at the line, far below the window, so work in flight has room to finish |
| merge and borrowing on underflow | 1.7, merge only: borrowing, moving one item to a sibling with room, is not part of the rule |
| root split, the only way height grows | a new root above the old one (1.6) |
| leaf chain: sibling links for scans across leaves | the ordered record in the repository: board rows, report files and branches in plan order. A question across scopes is answered by reading that chain, not by asking the root to remember |
| right-link left behind by a split, so a search that reaches the old node is sent on (B-link tree) | the key table's owner column, and the closed session's last line naming its successors |
| range-partitioned stores: split a range past a size threshold, merge small neighbours, keep a small metadata tier that maps ranges to nodes | scopes as ranges, the line as the threshold, the key table as the metadata tier |
| clients cache the range map, so lookups skip the metadata tier | the owner and the leaves read the key table from disk; traffic need not pass through the root |

**Where it stops holding.**

1. **A page can give half its records away; a window cannot.** A window is append-only. A split does not
   halve the old window; it abandons it. That is why both children are fresh sessions and why a split costs
   two starts, where a page split costs one empty page.
2. **Capacity is not a fact.** A page holds a known number of records. The useful part of a window is
   unknown for every model (TK-FILL). A fill factor in a database is tuned against measured space and I/O;
   our line stands in for a quality curve nobody has measured. The 40 % is an outside rule of thumb [S].
3. **Fill and load come apart.** In a page they are the same thing. In a session the window only fills,
   while the open work rises and falls. Splits read the window; merges must read the work (1.7).
4. **The cost runs the other way.** A B+ tree wants large, full nodes: fewer levels, fewer reads. A session
   pays for its whole window on every call, so small nodes are cheap, down to a floor set by the fixed
   start that every call re-reads. The best node size is a trade between that start and the re-read of
   accumulated material; it is not "as full as possible".
5. **Keys are not ordered and scopes are not naturally disjoint.** A key range is cut at one value. Work
   items overlap: shared files, rulings that bind several lanes. The key space has to be made (lanes, file
   sets, phases), and what cuts across it has to live outside every node.
6. **A node holds data; a session also holds understanding.** Reasons, dead ends and half-formed context
   are in the window and nowhere else unless written down. A split discards them just as a compaction
   does. The bet is that less is lost, not that nothing is.
7. **"Holds only keys" does not keep a session small.** A B+ tree root stays small however many lookups
   pass through it. A root session's window keeps every message that passes through it (1.6).
8. **A split takes minutes and model calls, not microseconds.** The tree spends real time half-split, so
   the hand-over needs an owner of record, an acknowledgement and a restart path (1.8).
9. **Balance is not free.** A B+ tree keeps its leaves at one depth by construction. Claude Code hangs a
   new session under whoever started it, so balance here is a rule sessions must follow (1.8, step 5).
10. **Fan-out is set by the PC.** A B+ tree's fan-out follows from the page size. Ours follows from memory
    and from the owner's attention.
11. **The key table has several writers and nothing that keeps it consistent.** A distributed store's
    metadata tier has one authority, versioned or compare-and-swap updates, and leases or epochs that
    fence off an old owner. Here children write their own rows in a plain file, nothing makes "read not
    taken, write taken" a single step, and nothing stops the old session, still open until step 7, from
    committing after the hand-over. The rule relies on one parent starting each child once and on the old
    session having stopped intake.

---

## Part 2. The scoring, fixed before the replay ran

Written and saved before the replay stage of the script was run. What had run was a count-only survey of
the transcripts (windows per model, where compactions fired, first-call contexts), because part 1 needs
each model's window. That survey had already shown where the recorded compactions fall, so the outcome of
criterion N5 at 40 and 50 % could be foreseen when it was written. Nothing else below was known.

What changed afterwards, none of it a definition or a threshold: the two measured inputs (88k and 105k)
were written into the tables from the survey; and after the first run the script was given five more
lines of output, which the tests do not use (how fast a window grows, active work, how many calls a leaf
served before its own hand-over, the average start of a new leaf, and a 20 % line outside the asked
range). They are marked where they appear in part 3.

After the check of 14 November the script gained a prompts stage (human prompts per session window, at
the same cut), table section F (one input changed at a time), four lines per line in section D (the
ratio across the cases, the like-with-like count of briefs, the caps, the room for an in-place merge)
and the leaf test in like units. N5 had been printed over all windows where 2.4 says session windows; it
now uses session windows and no outcome changed. No measured number moved.

### 2.1 What the replay counts with no assumptions

Per session window and in total, at each line (30, 40 and 50 % of the window in 1.2). "Session window"
means a main session's own transcript; agent and workflow windows are counted separately, because the
rule's nodes are sessions.

| id | count | tag | speaks to |
| --- | --- | --- | --- |
| A1 | windows in which at least one call read more than the line | M | where the rule would act at all |
| A2 | the first crossing: its call number, and how far through the window's calls it falls | M | time taken: how early a hand-over comes |
| A3 | calls that read more than the line, and their share of the window's calls | M | hallucinations and quality: steps taken in a window fuller than the line. An exposure, not an error count |
| A4 | cache-read tokens in those calls | M | token count: the re-reading a split could touch. An upper bound, since the calls would still happen in smaller windows |
| A5 | tokens above the line: for each such call, context minus the line, summed | M | token count: the least a ceiling at the line would trim |
| A6 | each recorded compaction with its size and model; it counts as avoided at a line when its size was above the line | M | hallucinations: one summary not written |
| A7 | the recorded duration of those compactions | M | time taken |

### 2.2 What the replay simulates, and on what assumptions

The rule is replayed over each session window's recorded calls. Up to its first crossing a window is
replayed exactly as recorded, including any compaction below the line. From the first crossing on the rule
owns the window: recorded compactions are ignored and the rule's own hand-overs replace them. Each recorded
call still happens and adds the same tokens to whichever window serves it; what changes is how much that
window already holds when the call re-reads it.

| id | count | tag | speaks to |
| --- | --- | --- | --- |
| B0 | the simple netting asked for: A4 minus one fixed start per new session | E | token count, upper bound |
| B1 | splits (or roll-overs) and new sessions started | E | efficiency, throughput: sessions to run and supervise |
| B2 | hand-overs written: one brief per new session | E | hallucinations: the rule's counterpart of a summary |
| B3 | context tokens read under the rule | E | token count |
| B4 | net tokens: recorded minus B3, after every new session's start, the hand-over calls and the re-learning reads are paid | E | token count |
| B5 | B4 in weighted tokens: cache reads, cache writes and output weighted by the ratios in the recorded rate table (`docs/program/evidence/token-spend/pricing.json`), in input-token equivalents, no currency | E | token cost |
| B6 | calls served per leaf | E | efficiency: how much work a session does between hand-overs |

Assumptions, each swept or stated:

| what | favourable | middle | unfavourable | tag |
| --- | --- | --- | --- | --- |
| fixed start of a new session | 60k (token report, per agent) | 70k (TK-PREFIX, per agent) | 88k, the measured first call of a FixFlow main session (A5) | M for each figure; E as a session's start, since 60k and 70k are per-agent figures and a session's measured first call is 79k (A5) |
| brief read by each child | 2k | 4k | 8k | G |
| re-learning: share of the fetched content in the old window that a child reads again. Fetched content is 26 % of a window [E, token report] | none | half | all | G |
| calls the due session still makes before the hand-over takes effect (drain) | 2 | 6 | 12 | G |
| hand-over: extra calls that re-read the full window, and tokens written | 1 call, 2k | 2 calls, 4k | 3 calls, 8k | G |

How the work divides, run three ways: **roll-over** (one successor takes everything: the indivisible case
and the floor of what the rule can do), **even split** (two children, half the later calls each),
**uneven split** (80 % and 20 %) [G]. After a split the later calls are dealt to the leaves in proportion
to their shares; a leaf that passes the line splits again. The headline case is the middle column with an
even split; the range is printed beside it.

**What the three cases do not cover.** The favourable and middle fixed starts are per-agent figures, and
a child is a session (1.1); every measured session start is higher (75k to 88k by group, 79k over all;
A5). The cap's restart is held at its median, 105k. So only the rule's costs move between the three
cases. Table section F, added after the check, changes one input at a time in the middle case: the
re-learning, the drain, a 79k start, the cap's restart at its measured p25 and p75, and a three-way
division.

Not in the simulation. Each of these counts against the rule:

- messages between siblings, cross-scope work that needs both windows, a child that guesses instead of
  re-reading, and time spent starting sessions;
- the inner session above the leaves. A recorded session window, orchestrator roots included, is
  replayed as leaf work only (1.6 moves today's root work to leaves). The inner session that stays to
  start children, route, receive reports, check "taken" and close the old session, re-reading its fixed
  start on every call while its window grows, is charged nowhere;
- merges (1.7). Leaves only split. A merge starts at most one session, but the merged leaf then re-reads
  a fuller window, and a fresh-session merge pays a start and two briefs. Leaving merges out favours the
  rule on tokens and undercounts briefs;
- the fan-out cap and the depth cap (1.9). A window's leaves all stay live under one parent to the end of
  the recorded session: up to 16 in one window at 30 %, with 31, 12 and 8 windows ending past three
  leaves and 4, 0 and 0 past nine (table section D). The rule would have rolled over or asked the owner
  there. The roll-over rows bound it.

One thing counts for the rule and is also left out: after a cache lapse a large window is written to the
cache again in full, and a smaller window would be cheaper to rewrite.

### 2.3 The alternative, compared like with like

The owner finds a bare cap insufficient: it saves tokens now and costs more later as mistakes and summary
problems surface. To set the two side by side on the same sessions, the same windows are replayed with an
**earlier compaction window** whose trigger is the same token count as the split line. From the first
crossing on, the window compacts every time it passes the line.

| what | value | tag |
| --- | --- | --- |
| context of the first call after a compaction | 105k, the median over recorded compactions in session windows (A6) | M |
| the summarising call | reads the window once at its size when the line was passed, and writes a summary of the median recorded length, counted at four characters to a token | E |
| drain | none: compaction fires between two calls | M |

Both alternatives act at the same token count, on the same calls, with the same recorded additions. Two
costs are charged to the rule only. The cap compacts before the crossing call is served, while the rule
serves that call and its drain calls at full size, at every hand-over. And re-learning is charged to each
child as a guessed share of the old window, while the cap pays only its measured 105k restart and no
re-reads after a simulated compaction. In the middle case the re-learning alone decides test N2 at every
line, and the drain alone at 30 % and 50 % but not at 40 %, where it gives 1.09 (table section F). The two also differ in where a window restarts, in what each event costs, and in the split's
division of later growth between two windows; and in the thing the replay cannot see, what a brief loses
against what a summary loses.

### 2.4 What counts as the idea not paying

Judged per line, on session windows, in the middle case with an even split.

| id | the line does not pay if | why this threshold |
| --- | --- | --- |
| N1 | net tokens (B4) are zero or negative | hand-overs cost more re-reading than they remove |
| N2 | the rule's net tokens are less than 1.10 times the earlier compaction window's net tokens | on tokens the rule then adds nothing over the cap, and its whole case rests on quality and hallucinations, which only a trial can show |
| N3 | calls per leaf (B6) are under 162 | 162 is the recorded number of API calls behind one human prompt (token report: 80 and 151 prompts, about 162 calls each) [M]. A leaf that cannot finish one such unit of work before it is due spends its life on hand-overs |
| N4 | cache-read tokens past the line (A4) are under 10 % of all cache-read tokens in session windows | the rule would rarely act |
| N5 | fewer than half the recorded compactions are avoided (A6) | the rule would leave in place most of what it is aimed at |

N1 says the token case fails at that line. N2 says the token case is no better than the cap's. N3 to N5 say
the line is in the wrong place. None of the five can show that the idea fails or works on hallucinations.

Found by the check, and left as fixed: N3 compares unlike units. Its 162 counts every call behind a
prompt, agent and workflow calls included; calls per leaf (B6) count session-window calls only. The test
and its outcome stand as written, and 3.4 adds the bar in like units, computed from the record.

### 2.5 What the replay cannot show, and the trial that would

The replay sees token counts and compaction markers. It does not see scopes, so it cannot tell whether the
work at a crossing was divisible; it does not read messages, so it cannot tell a correct brief from a wrong
one; and it has no view of quality at all. Its "avoided compactions" are summaries not written. It cannot
say the briefs written in their place would be right.

The trial that would show it is WP12's own done-condition, made like for like:

- **Arms.** A: one lane wave under this rule at the chosen line, compaction as backstop only. B: a
  comparable wave with an earlier compaction window at the same token count. Same plan, same models, lanes
  of similar size.
- **Hand-over fidelity, the main measure.** For every brief (A) and every compaction summary (B), a script
  rechecks each claim that names a path, a commit, a pull request or a test result against the repository
  as it stood at that moment. Wrong claims over claims checked gives the rate that PR-HALLU says we lack.
- **Beside it:** review send-backs and rounds per slice (64 % and 2.8 are the recorded baselines [M]),
  context tokens and weighted tokens per accepted slice, hours from start to merge, rule failures
  (a compaction that fired, a split that could not drain, a scope left without an owner), and the fill at
  every correction or reversal (TOK-34, MSR-43), which is what TK-FILL needs.
- **Size.** At least ten hand-overs per arm [G], so that a difference as large as "2 of 2 summaries wrong"
  would show. The agents are booked under decision D07.

**Tested on the record before any trial (14 November, part 6.3).** The scripted recheck named above was
built and run over the compaction summaries already on record. It does not separate them from maintained
documents, so it cannot be the main measure. Part 6.4 replaces it with a reader's check of the latest
state and keeps the script as a floor check. The measure has since been taken on the record itself, over
117 summaries, in `docs/program/SUMMARY-CHECK-2026-11.md`; 6.4 is written against its result.

---

## Part 3. The replay

Run on 14 November 2026 and revised the same day after the check. Every figure below is from
`docs/program/evidence/split-replay/replay-table.txt`; the letter in each heading is the table's section.
The page `docs/program/split-replay/index.html` shows the same run.

### 3.1 What was read (table section A)

- 3,157 transcript files in 60 project folders, 6.72 GB, calls made up to 05:12 UTC on 14 November [M].
  Counting each message once leaves 70,594 calls in 2,923 windows; 186 copied calls and 7 copied windows
  were left out [M].
- **The reader agrees with the token report's own parser.** `parse.js.txt` was run unchanged on the same
  folders: 196 of 196 group, session and role totals are identical in call count and in all four token
  sums, 70,780 calls on each side before copies are removed [M]. The replay's reader applies the same
  rules and adds what the parser does not emit: which transcript a call belongs to, and each compaction's
  size. The check was run again after the script changed and came out the same.
- **The compaction arithmetic gives back the record when asked to do what happened.** 32 session windows
  ran under Opus's setting and compacted only between 350k and 400k. Replaying an earlier compaction
  window at 366k over them from their first call gives 2.75B context tokens against 2.74B recorded (0.3 %
  apart; the worst single window is 7.5 % off) and 72 compactions against 72 recorded (table section D,
  method check) [E against M]. It runs only the earlier-compaction branch, with a restart (105k) that is
  the median over all session compactions, 72 of which are in these 32 windows. The split branch has no
  check against the record. It has one against the other branch: set to the earlier window's own terms
  (one successor at 105k, no brief, no re-learning, no drain, one hand-over call) it gives the same net
  tokens at every line, a ratio of 1.00 (table section F).
- 97 session windows (36 FixFlow, 40 clinic testbed, 21 from the owner's other projects, shown by id
  only): 22,962 calls, 7.49B context tokens, 7.37B of them cache reads, 117 compactions [M].
- 2,826 agent and workflow-agent windows: 47,632 calls, 6.88B context tokens, 42 compactions [M]. Session
  windows hold 52.1 % of all context tokens [M].
- A session window grows by 2.8k tokens per call (3.0k at the median window) [M]. Session windows hold 237
  hours of active work, counting each gap between calls up to five minutes, and one compaction per 121
  minutes of it [M].
- 391 human prompts went into 57 of the 97 session windows: 382 typed and 9 slash commands (A10) [M]. A
  prompt is a user line the harness marks as typed by a person, or a slash command that no typed line
  already stands for; summaries, tool results and copied lines are left out. A typed slash or skill
  command is recorded twice, as the typed line and as a command line with the same prompt id: 28 such
  command lines are left out, and 1 more that was a second line of one command. The first count after the
  check had counted them, giving 420; the second pass of the check found it. Counts only.

### 3.2 Measured at each line (table sections B and C) [M]

| | 30 % = 300k | 40 % = 400k | 50 % = 500k |
| --- | --- | --- | --- |
| session windows that passed the line, of 97 | 72 | 32 | 26 |
| first crossing, median way through the window's calls | 29.6 % | 41.4 % | 46.3 % |
| calls past the line, of 22,962 | 9,786 (42.6 %) | 5,254 (22.9 %) | 3,960 (17.2 %) |
| cache-read tokens in those calls, of 7.37B | 4.80B (65.1 %) | 3.29B (44.6 %) | 2.71B (36.8 %) |
| tokens above the line | 1.93B | 1.24B | 0.78B |
| agent windows that passed the line, of 2,826 | 117 | 11 | 3 |
| cache-read tokens in agent calls past the line, of 6.55B | 0.75B (11.5 %) | 0.06B (1.0 %) | 0.01B (0.2 %) |
| recorded compactions the line comes before, of 159 | 155 | 29 | 26 |
| of them in session windows, of 117 | 113 | 28 | 26 |
| of them on Opus, of 126 | 124 | 1 | 0 |
| recorded compactions at or below the line, of 159 | 4 | 130 | 133 |
| time the compactions above the line took | 3.4 h | 0.5 h | 0.5 h |

By project group, the share of session cache-read tokens in calls past the line: FixFlow 59.5, 34.3 and
29.3 %; clinic 67.4, 49.1 and 40.2 %; other projects 77.2, 64.9 and 51.3 %.

Of the 126 Opus compactions, 84 were in session windows and 42 in agent windows; every agent-window
compaction on record is Opus. 81 of the 84 fell between 366k and 385k (A6).

### 3.3 The rule replayed, and the earlier compaction window beside it (table section D) [E]

Middle case with an even split unless the row says otherwise. "Net tokens" is recorded context tokens
minus context tokens under the method, hand-over calls included; the share is of the 7.49B recorded.

| | 30 % = 300k | 40 % = 400k | 50 % = 500k |
| --- | --- | --- | --- |
| **split rule:** hand-overs | 177 | 69 | 54 |
| new sessions started, one brief each | 354 | 138 | 108 |
| a new leaf starts at, on average | 95k | 102k | 108k |
| net tokens | 3.05B (40.8 %) | 2.11B (28.1 %) | 1.68B (22.4 %) |
| net tokens, range over all nine cases | 1.57B to 3.59B | 1.31B to 2.40B | 0.83B to 1.95B |
| net tokens if the work cannot be cut (roll-over) | 2.55B (34.0 %) | 1.79B (23.9 %) | 1.34B (17.8 %) |
| net, weighted tokens | 77.7M (10.8 %) | 57.6M (8.0 %) | 45.1M (6.3 %) |
| net, weighted, range over all nine cases | −5.4 % to 16.9 % | 1.0 % to 10.9 % | −0.3 % to 8.9 % |
| calls per leaf, as B6 defines it | 50 | 52 | 58 |
| leaves that reached their own hand-over: how many, median calls served | 109, 81 | 38, 91 | 28, 131 |
| active work per hand-over | 64 min | 89 min | 102 min |
| most leaves in one window; windows ending past three leaves; past nine | 16; 31; 4 | 9; 12; 0 | 8; 8; 0 |
| **earlier compaction window:** summaries written | 274 | 98 | 66 |
| net tokens | 2.89B (38.6 %) | 2.01B (26.8 %) | 1.58B (21.1 %) |
| net, weighted tokens | 76.0M (10.6 %) | 59.3M (8.3 %) | 48.0M (6.7 %) |
| active work per summary | 42 min | 63 min | 83 min |
| **side by side:** rule's net tokens over the earlier window's, middle case, even split | 1.06 | 1.05 | 1.06 |
| the same, middle case, roll-over | 0.88 | 0.89 | 0.84 |
| the same, across the nine cases | 0.54 to 1.24 | 0.66 to 1.20 | 0.53 to 1.23 |
| briefs per summary the earlier window writes | 1.3 | 1.4 | 1.6 |
| summaries on record above the line, session windows | 113 | 28 | 26 |
| briefs per summary on record above the line | 3.1 | 4.9 | 4.2 |
| on record, one compaction above the line per, on the same active work | 101 min | 220 min | 212 min |
| the simple netting (B0): cache-read past the line less one 70k start per new session | 4.77B | 3.28B | 2.71B |

A window restarts at 105k after a compaction [M]. The rows on leaf lives, active work and the average
start were added after the first run; the rows on leaves per window, the ratios across the cases, the
briefs per earlier-window summary and the record's rate on the same active work were added after the
check. None is used by the five tests. The script also prints a 20 % line (200k), where the token
report's lever 1 sits; it is outside the range asked for and is not judged here.

**One input changed at a time (table section F) [E].** Each row is the middle case with an even split
except for the one thing named. The figure is the rule's net tokens over the earlier compaction window's;
test N2 asks for 1.10.

| run | 30 % | 40 % | 50 % |
| --- | --- | --- | --- |
| middle case, even split | 1.06 | 1.05 | 1.06 |
| no re-learning | 1.14 | 1.12 | 1.13 |
| all re-learning | 0.98 | 0.98 | 0.97 |
| no drain: the hand-over takes effect at the crossing call | 1.12 | 1.09 | 1.12 |
| a new leaf starts at the measured session median, 79k | 1.02 | 1.03 | 1.04 |
| the earlier window restarts at its measured p25, 97k | 1.03 | 1.03 | 1.03 |
| the earlier window restarts at its measured p75, 116k | 1.10 | 1.07 | 1.08 |
| three-way division, middle case (an extension: the rule divides in two) | 1.12 | 1.12 | 1.19 |
| three-way division, favourable case (an extension) | 1.28 | 1.24 | 1.34 |
| four-way division, middle case (past the fan-out cap of three) | 1.19 | 1.19 | 1.28 |
| favourable case, even split | 1.24 | 1.20 | 1.22 |
| unfavourable case, roll-over | 0.54 | 0.66 | 0.53 |
| branch check: the split branch on the earlier window's own terms | 1.00 | 1.00 | 1.00 |

The 1.10 at 30 % with the p75 restart is a shade under the test. A three-way division in the middle case
makes 175, 57 and 39 hand-overs and starts 525, 171 and 117 sessions, with up to 27, 19 and 9 leaves in
one window.

### 3.4 The five tests fixed in part 2.4

| test | 30 % | 40 % | 50 % |
| --- | --- | --- | --- |
| N1 net tokens zero or negative | passes: 3.05B | passes: 2.11B | passes: 1.68B |
| N2 under 1.10 times the earlier compaction window | does not pay: 1.06 | does not pay: 1.05 | does not pay: 1.06 |
| N3 a leaf serves fewer than 162 calls | does not pay: 50 | does not pay: 52 | does not pay: 58 |
| N4 under 10 % of cache-read tokens past the line | passes: 65.1 % | passes: 44.6 % | passes: 36.8 % |
| N5 fewer than half the compactions avoided, session windows | passes: 96.6 % | does not pay: 23.9 % | does not pay: 22.2 % |

These are the outcomes of the tests as they were fixed. Two things the check found sit beside them.

**N2 is a middle-case outcome.** It is computed for the middle case with an even split only. One guessed
input changed alone takes it past 1.10 (no re-learning, or no drain at 30 % and 50 %) or under 1.00 (all
re-learning); see section F above.

**N3 in like units.** Its 162 counts every call behind a prompt, agent and workflow calls included; on
this record that figure is 231, the mean of FixFlow's 312 and the clinic's 151. Calls per leaf count
session-window calls only. Counted the same way, from the record (A10), one human prompt drives 80
session-window calls in FixFlow and 82 in the clinic (mean 81), and 59 over all groups. If only the
window that received the prompt is counted, it is 30 in each, and 24 over all groups. Against 80 to 82,
calls per leaf as B6 defines them (50, 52, 58) are under at every line; the leaves that reached their
own hand-over (81, 91, 131) are level with it at 30 % and over it at 40 % and 50 %. Against 59, calls
per leaf are under at every line, by one call at 50 %, and those leaves are over. Against 24 to 30, both
are over at every line. So in like units the leaf test is not clear-cut. It depends on which unit of
work a leaf is held to, and the unit N3 named, the work behind one human prompt, is spread over several
session windows.

**Two wordings the check settled on were not taken.** Finding N-F2 would have said that against the
like-unit bar N3 "is not met at any line", and finding M-F3 that its outcome is "an artefact of the
units". Both rested on estimates of the bar: 15 to 77 by project, 53 to 58 by share of calls. Counted
from the record, the bar is 80 and 82 for the two projects behind the 162 and 59 over all groups, and
calls per leaf as the test defines them are under all three at every line. So the outcome is kept as
fixed and the like-unit reading is given as it comes out.

### 3.5 What the replay found

1. **The exposure is real and it sits in sessions.** Between a third and two thirds of what session
   windows re-read was read in calls past a line (N4). Agent windows barely reach the lines: 11 of 2,826
   ever passed 400k. The rule is about the 52.1 % of context tokens that sessions hold.
2. **In the middle case the rule's tokens are close to the cap's, and the record does not settle which is
   ahead.** In the middle case with an even split the rule removes 1.06, 1.05 and 1.06 times what an
   earlier compaction window removes at the same token count, under the 1.10 that N2 asks for. That
   closeness is built into the replay. A split here is a restart of one window plus a share of later
   growth, so any method that restarts a window and lets it grow back to the line reads about the same.
   The ratio is then set by where a child starts (fixed start, brief and re-learning) against the measured
   105k restart, by what each hand-over costs, and by how later growth is divided among the children. Changing one input alone (3.3): no re-learning gives
   1.14, 1.12 and 1.13; no drain 1.12, 1.09 and 1.12; all re-learning 0.98, 0.98 and 0.97; a leaf that
   starts at a session's measured 79k instead of an agent's 70k gives 1.02, 1.03 and 1.04; the cap
   restarting at its measured p25 or p75 gives 1.03 at every line, or 1.10, 1.07 and 1.08. Across the nine
   stated cases the ratio runs from 0.54 to 1.24, 0.66 to 1.20 and 0.53 to 1.23. Where the work cannot be
   cut and one session takes it all, the middle case gives 0.88, 0.89 and 0.84: less than the cap.
   Dividing in three at each hand-over, which the rule as written does not do, gives 1.12, 1.12 and 1.19
   in the middle case and 1.28, 1.24 and 1.34 in the favourable one, at the price of 525, 171 and 117 new
   sessions. Two costs in the comparison fall on the rule only (2.3): it serves the crossing call and its
   drain calls at full size where the cap compacts first, and it pays a guessed re-learning where the cap
   pays only its measured restart. Apart from the measured starts and restarts, which move it between 1.02
   and 1.10, every input that separates these runs is a guess. So the token case
   for the rule is neither shown to be the cap's nor shown to be better: the record does not settle it.
3. **The 40 % figure sits above where our windows already compact, and every line needs the Opus setting
   lifted.** 126 of the 159 compactions on record are Opus, compacting near 367k under the owner's
   setting: 84 of the 117 in session windows and all 42 in agent windows. A line at 400k or 500k comes
   before 29 and 26 of the 159 (28 and 26 of the 117 in session windows; N5); a line at 300k comes before
   155. On Opus the 40 % and 50 % lines are not reached while the setting of 400,000 stands: 1 and 0 of
   the 126 Opus compactions came above them. And the rule's own backstop (1.3) wants the trigger above
   the hard ceiling, so the setting has to be above about 433k, 533k and 633k for the three lines: at
   300k too.
4. **The rule trades summaries for more briefs.** Against today's record it writes 3.1, 4.9 and 4.2
   briefs for every summary above the line, in more hand-over events than there were such compactions
   (177, 69 and 54 against 113, 28 and 26): one hand-over per 64, 89 and 102 minutes of the active work
   after a window first passes the line, where the record has one compaction above the line per 101, 220
   and 212 minutes of that same work [E]. Against the like-with-like arm, an earlier compaction window at
   the same line (2.3), it writes 1.3, 1.4 and 1.6 briefs per summary (354, 138 and 108 against 274, 98
   and 66), in fewer events (177, 69 and 54 hand-overs against 274, 98 and 66 summaries, which come one
   per 42, 63 and 83 minutes) [E]. So for the count of wrong hand-overs to fall, a brief has to be wrong 3
   to 5 times less often than today's summary, or 1.3 to 1.6 times less often than a summary under the
   earlier window. (The 121 minutes per compaction in 3.1 counts all 237 hours of session-window work,
   not the same hours.)
5. **A leaf is due again within about one prompt's work.** Leaves that reached their own hand-over had
   served a median 81, 91 and 131 calls; counting every leaf, including those still running when the
   recorded session ended, the figure is 50, 52 and 58. N3 as written compares these with 162 calls a
   prompt, which counts agent calls. In like units one human prompt drives 80 to 82 session-window calls
   in FixFlow and the clinic, and 59 over all groups (3.4). So a leaf that reaches its own hand-over
   lasts about one prompt's worth of session work at 30 % and about one and a half at 50 %; by the wider
   count, which includes leaves still running at the end, it is under one prompt's worth at every line,
   on the all-groups figure too. The cause is measured: a session window gains 2.8k tokens a call
   [M], so the room between a new leaf's start and the line (300k less a 95k start, up to 500k less a
   108k start) lasts roughly 70 to 140 calls [E].
6. **Weighted for cost, the gain is a third or less of the plain one.** 10.8, 8.0 and 6.3 % of the
   weighted total, against 40.8, 28.1 and 22.4 % of the tokens, and negative in the worst case at two of
   the three lines. A hand-over swaps cheap cache reads for a new session's start, which is written.
7. **The fixed start is not the cost that matters.** One 70k start for each of 354 new sessions takes the
   exposure at 30 % only from 4.80B to 4.77B (B0). The real cost is that every call in a child re-reads
   the child's own window, which is why the replayed net is 3.05B and not 4.77B.
8. **The replay runs neither cap.** Under an even split a window ends with up to 16, 9 and 8 leaves, and
   31, 12 and 8 windows end with more than the fan-out cap of three. Under the rule those would have
   been inner splits, roll-overs or questions to the owner (1.9), none of which the replay charges.

### 3.6 What it does not show

Everything in 2.5 stands. The replay cannot tell whether the work at any of the 72, 32 or 26 crossings
could have been divided; whether any of the 354, 138 or 108 briefs would have been right; or anything
about quality, hallucinations, throughput or time to accept. An "avoided compaction" is a summary not
written. The trial in 2.5 is what would show the rest.

### 3.7 Limits of this replay

- **Opus's window** rests on its largest recorded call (1.2). If it were lower, the Opus lines would move
  down with it.
- **How work divides is a guess.** The even and uneven splits deal later calls to leaves by share; real
  scopes come in bursts. The roll-over rows bound the case where nothing divides.
- **The comparison with the cap is not symmetric.** The crossing call, the drain calls and the
  re-learning are charged to the rule only (2.3), and the three cases move only the rule's costs (2.2).
  Section F shows how far each one moves the result.
- **The inner session, merges and both caps are not in it** (2.2). Each of the three counts against the
  rule, by an amount the replay cannot give.
- **Growth is taken as recorded.** A leaf under the rule might grow more slowly than the session it
  replaces (an inner session receives pointers, not content) or faster (it re-reads what it lacks).
- **Recorded compactions leave their mark on the growth.** After each one the session re-read files to
  recover; those re-reads stay in the replay as work, for both methods alike.
- **The method check covers one branch.** The compaction branch is checked against the record; the split
  branch only against the compaction branch (3.1).
- **Only this PC, only what transcripts hold.** About 1 % of calls never reach a transcript (token
  report). Sessions still running were cut at the index time, and the session that ran this replay is in
  the record.
- **The weighted figures** use the recorded rate table's ratios, ignore the rewrite of a large window
  after a cache lapse (which would favour smaller windows), and say nothing about the five-hour limit,
  whose counting rule is unmeasured (TK-LIMITACCT).

---

## Part 4. What the compile should pick up

The compile's data files were not edited. These are the numbers and wording for whoever maintains them.

**PAR-22** (idea)

- *stands:* rule written (`docs/program/SPLIT-RULE-2026-11.md`) and replayed over 97 recorded session
  windows on 14 November with no model calls; checked the same day; not tested live.
- *numbers:* at lines of 30, 40 and 50 % of a 1,000,000 window [E]: 72, 32 and 26 of 97 session windows
  passed the line [M]; 65.1, 44.6 and 36.8 % of session cache-read tokens sat in calls past it [M]. In the
  replay's middle case the rule removes 3.05B, 2.11B and 1.68B of 7.49B context tokens [E], against
  2.89B, 2.01B and 1.58B for an earlier compaction window at the same line [E]: 1.05 to 1.06 times, and
  from 0.53 to 1.24 times across the stated cases, so the record does not settle which is ahead on
  tokens. It writes 354, 138 and 108 briefs: 3.1 to 4.9 for each summary on record above the line, 1.3 to
  1.6 for each summary the earlier window would write [E].
- *"its 40 % line will differ by model":* all four working models show a 1,000,000 window [E]. What
  differs is Opus's compaction setting: 126 of 159 compactions are Opus near 367k [M], 125 of them below
  a 400k line.
- *next:* answered on 14 November: yes, one trial wave at the 300k line, against an earlier compaction
  window at the same token count. It is scored on hand-over fidelity first, by a reader's check of the
  latest state (part 6.4, written against `docs/program/SUMMARY-CHECK-2026-11.md`), and on tokens too.
  Before a lane is spent: D07; my call on which of the two counts in 6.4 scores the trial; and the rest
  of the baseline, which is dropped open loops and a second reader of the whole summary's statements of
  where the work stood.

**TOK-44** (idea)

- *stands:* settled inside the split rule (part 1.5). Finished material is whatever a child's brief does
  not name; it never enters a new window. No mechanism of its own. Untested.
- *numbers:* a new session's first call reads a median 79k (75k to 88k by project group) [M]; an agent's
  64k [M].
- *next:* in the trial, count what a child re-reads and what it guesses.

**TK-FILL** (register)

- *evidence, added:* 159 compactions on record [M]: Opus 126 at a median 368k, Fable 5.2 16 at a median
  967k, Fable 5.1 11 at 690k, Sonnet 6 at 804k; 15 fell between 900k and 1,000k. 42.6, 22.9 and 17.2 % of
  session calls were made in a window above 300k, 400k and 500k [M]. Still no record that links an error
  to how full the window was.
- *what:* the borrowed 40 % is 400k on our windows, above where 130 of 159 compactions already happen.
- *first_step:* unchanged (TOK-34, MSR-43); the trial in part 2.5 logs the fill at every correction.

**PR-HALLU** (register)

- *first_step, done for compaction summaries:* the figure to cite is the summary check's
  (`docs/program/SUMMARY-CHECK-2026-11.md`): 0 wrong of 2,727 claims a script can recheck in its 117
  summaries (FixFlow 69, the clinic testbed 48), every flag read by hand. This record's own script flags 16 of 1,265 in the 61 FixFlow
  summaries (1.3 %) [M], and 2 of 55 and 2 of 112 in two maintained documents [M]
  (`pointers-record.txt`, `pointers-controls.txt`). The 16 is the script's count, not a count of wrong
  pointers: read by hand, at most 14 (6.3). Reports are not counted yet.
- *latest state:* not a hallucination rate. 74 of the summary check's 117 summaries (63.2 %) [M, hand,
  by the summary-check session], by one reader on their last three sections, call something pending that
  the kept tail had already done; the same hand-over carries the newer state, and the summary check
  files this under PR-SUMMARY (its 2.7 and part 4). Dropped open loops are still uncounted (part 6.4).

**WP12** (package)

- *first:* done. Rule and record: `docs/program/SPLIT-RULE-2026-11.md`. Replay:
  `docs/program/evidence/split-replay/` (script, table, data, the check's findings). Page:
  `docs/program/split-replay/index.html`.
- *mine:* the yes on the split rule is given (14 November, at 300k). Still mine: D07 before any agent
  run; the go for the rest of the baseline (6.7); which of the two counts in 6.4 scores the trial; which
  lane wave is arm A and which is arm B; the Opus setting, lifted to 433k or above if an Opus session
  holds a node in arm A (1.3); and opening each new root (1.6).
- *added:* the trial's instruments exist and are tested on the record (part 6.3): a fill gauge, a trial
  measure and a scripted hand-over check, all stages of the replay script.
- *done:* unchanged, with the second arm made explicit: an earlier compaction window at the same token
  count, since the replay does not settle which is ahead on tokens.

**Other records this run touches**

- TK-SUMMARIES counts compactions as 48 (clinic) and 9 (FixFlow) in main sessions, over the token report's
  55 sessions up to 12 November. Over the 97 session windows up to 14 November the record holds 117 (48
  clinic, 61 FixFlow, 8 other projects), and 42 more in agent windows [M]: an update over a larger set,
  not a correction.
- TOK-02 says 38 of 48 main-session compactions came at 366 to 387k on Opus. In session windows now, 84
  of 117 are Opus, 81 of them at 366 to 385k [M]; counting agent windows, 126 of 159 are Opus, from 205k
  to 406k, median 368k [M].
- The "token count" row of the seven-metric table lists as not yet measured "what splitting at a set line
  would have saved on our recorded sessions". The exposure is now measured (3.2) and the replayed net is
  in 3.3; what stays unmeasured is the live effect on tokens per accepted slice.
- **Page 7 of the compile has to change too.** Its text (`short.json`, `splitShows`) says "inner sessions
  hold only keys, so the root stays small however much work passes under it, and no window grows past
  the line, so nothing has to be compacted". The rule contradicts the first half (1.6; 1.10, point 7): a
  root's window keeps every message that passes through it. "Holds only keys" bounds what a root must
  know, so it can be replaced from its key table at any time; it does not keep the window small, and the
  root rolls over at the line like any other session, started each time by the owner. The sentence after
  it, "the wrong summaries and the re-reading of long windows both go", also needs the replay's reading:
  summaries are replaced by briefs (1.3 to 1.6 for each summary an earlier compaction window would
  write), and only the re-reading above the line goes.

---

## Part 5. The decision

**One decision: yes or no on the split rule in part 1, before any live trial.**

**Decided on 14 November 2026: yes, one live trial wave at the 300k line.** The rest of this part is
what was put to the owner. Part 6 is what follows from his answer.

What the replay brings to it (3.4, 3.5):

- The exposure is real. Net tokens are above zero at every line, and 36.8 to 65.1 % of what session
  windows re-read sits past the lines.
- The rule is not shown ahead of an earlier compaction window on tokens, and not shown behind it: 1.05 to
  1.06 times in the middle case, under the 1.10 fixed beforehand, and from 0.53 to 1.24 times across the
  stated cases. One guessed input decides it.
- The leaf test fixed beforehand fails at every line as written. In like units it is not clear-cut.
- 40 % and 50 % come after most compactions on record; 30 % comes before them.
- The replay cannot show what the idea is for: whether a brief is right more often than a summary.

Then:

- A **yes** lets WP12 size one trial lane wave under the rule, with a matched wave under an earlier
  compaction window (2.5). The agents are booked under D07.
- A **no** leaves lever 1 as an earlier compaction window alone. The replay does not show the rule doing
  better or worse than that on tokens.

If yes, four smaller things follow:

1. **The line.** Of the three asked, 300k is the only one that comes before the Opus compactions; it
   alone passes N5.
2. **The Opus setting.** All three lines need it lifted first, because 1.3 puts the compaction trigger
   above the hard ceiling: above about 433k for a 300k line, 533k for 400k, 633k for 500k.
3. **What the trial is scored on.** Hand-over fidelity first. Tokens too, since the replay leaves them
   open.
4. **The owner's own step.** Each new root is opened by the owner (1.6). The trial should count how often
   that comes round.

---

## Part 6. The live trial at 300k: what is fixed before it runs

Added on 14 November, after the owner's yes. No trial has run. This part records what was approved, the
instruments built for it, what testing them on the record showed, and the scoring that follows. No model
call was made, no setting was changed and no session was started.

### 6.1 What was approved

One live trial wave under the rule of part 1 at the 300k line, set beside a matched wave under an earlier
compaction window at the same token count (2.5).

### 6.2 What each arm runs on

| | arm A: the rule | arm B: an earlier compaction window |
| --- | --- | --- |
| line | 300k, 30 % of a 1,000,000 window | none |
| hard ceiling | 400k (1.3) | none |
| automatic compaction | a backstop only: every model that holds a node has its compaction window at 433k or above | fires at the line: compaction window 333k |
| what is handed over | a brief and a key row (1.5, 1.6, 1.8) | the harness's own summary, with its kept tail and the git status (6.4) |
| the root | an inner session; the owner opens each successor (1.6) | as today |

The harness compacts at its window less 33,000 (1.2), which is where 433k and 333k come from
(`trial-dry-run.txt`). Three things follow.

- Opus's setting is 400,000 today. It has to be at 433k or above before an Opus session holds a node in
  arm A. Fable and Sonnet have no setting and compact near 967k, which is already above the ceiling.
- Arm B needs 333k on every model its sessions run on.
- **The two arms ask for different values of one setting, and whether two sessions running at once on
  this PC can hold different values was not traced.** The harness documents a compaction window per
  model and a per-session command (`docs/program/HARNESS-BOTTLENECKS-2026-11.md:396`). If the values
  cannot differ between sessions, the arms run one after the other. This is checked before a lane is
  chosen.

### 6.3 Three instruments, built and tested before the trial

All three are stages of `docs/program/evidence/split-replay/replay.js.txt`.

**The gauge (`fill`).** 1.3 has a session read its fill at every step boundary, and until now a session
had no way to. `node - fill <session id> < replay.js.txt` prints the context the session's latest call
read, the line, the hard ceiling, and one of three states: carry on, due, past the ceiling. It counts as
the replay counts. A session finds its own id in the path of its scratchpad folder. Run on the session
that wrote this part, it read 27.7 %, 23k under the line (`trial-dry-run.txt`).

**The trial measure (`trial`).** It reads the sessions a manifest names. The manifest is the key table
in machine form: one row per session, with its role and the session it took over from. For each session
it prints the first call, the context at call 20, the largest fill, the call that first passed the
line, the calls from there to the last, compactions, human prompts and agent calls. For the arm it
prints calls and cache-read tokens over the line, hand-overs, rule failures (an automatic compaction, a
session past the hard ceiling, a session left over the line that nobody took over from) and the measured
figures that replace the replay's guesses (6.5). A dry run on three recorded sessions is in
`trial-dry-run.txt`; it is not a trial.

**The hand-over check (`pointers`).** This is the script 2.5 asked for. In a hand-over document it finds
every pointer the repository can be asked about and checks it against the repository as it stood at the
document's time: a path (does it exist in the history of any branch, or on disk), a path with a line
number (is the line inside the file as it stood just before, just after, or now), a commit id (does it
name a commit, and is that commit older than the document), a pull request number (did it exist), and
the state the document last gives a pull request (was it merged or open at that moment). It reads the
text inside the process and writes counts only.

It was tested two ways before being pointed at anything it would score.

| document | pointers checked | not borne out | the same with every third pointer broken on purpose |
| --- | --- | --- | --- |
| `CLAUDE.md` at HEAD, a maintained document | 55 | 2 (3.6 %) | 17 of 18 broken paths reported, 1 of 1 line numbers |
| `docs/program/W0-results.md` at HEAD, a maintained document | 112 | 2 (1.8 %) | 4 of 6 paths, 1 of 1 line numbers, 20 of 25 commit ids |

(`pointers-controls.txt`.) So it catches most of what is broken, and it reports a few per cent on
documents that are kept right. Both of `CLAUDE.md`'s two are paths the file names in order to say they
do not exist: the check cannot tell a pointer from a denial. The broken pointers it misses are paths
outside the repository and commit ids that are not written as commits.

**Then the record: every compaction summary in FixFlow's session windows up to the index cut**
(`pointers-record.txt`) [M].

| | count |
| --- | --- |
| summaries | 61, holding 1,431,086 characters |
| pointers checked | 1,265; a median of 20 in a summary |
| flagged as not borne out | 16 (1.3 %); 12 of the 61 summaries have at least one |
| paths | 903 named, 744 checked, 10 found nowhere |
| paths with a line number | 16 checked, 0 past the end of the file |
| commit ids | 361 name a commit, 0 of them newer than the summary; 3 written as a commit match nothing |
| pull request numbers | 117 named, 1 that never existed |
| pull request states | 24 given, 2 contradicted: 1 says open and it was merged, 1 says open and it was closed |

**These are the script's counts, not counts of wrong pointers.** Both contradicted states were read by
hand in the summary check (`docs/program/SUMMARY-CHECK-2026-11.md`; `audit.json` in its evidence folder,
code "quote"), and two more readers confirmed both. Document 9 of `pointers-record.json`, counted from 0,
is summary 10 of session 423aac92 (27,812 characters): there #185 "open" stands only inside an account
of old wording the summary was replacing. Document 11 is summary 2 of session 49260710 (28,732
characters): there #180 "open" stands only inside a quoted instruction, and the same summary states it
closed. So read by hand, 0 of the 24 states are contradicted, and at most 14 of the 1,265 pointers are
not borne out: the script's 16 less these two. The other 14 have not been read by hand. Ten of them are
paths found nowhere. In the summary check no path its script flagged was confirmed wrong, 53 at its
first count and 5 after its repairs; by its account they were the script's own error, for example a
relative or shortened path, or one token standing for several files (its 2.4 and 2.5; its table,
sections C2 to C5).

Three things follow, and they change the trial.

1. **On everything a script can recheck, the summaries on record are as right as maintained
   documents.** 1.3 % flagged against 3.6 % and 1.8 %, and fewer once the flags are read by hand.
2. **What we know goes wrong in a summary is not a pointer.** PR-SUMMARY's two summaries were behind
   their kept tail on the latest state (overtaken in the kept tail, in 6.4's marks; the summary check's
   3.3), and one dropped an open loop. The check sees almost none of that: 24 pull request states among
   1,265 pointers.
3. **No wave is large enough for this measure.** At the script's 0.26 flagged for each document, a
   halving would show only with about 92 documents an arm [E], and with fewer truly wrong it would take
   more. The record holds 61.

So the scripted recheck cannot be the trial's main measure, as 2.5 had it. It stays as a floor check on
every hand-over, since it costs nothing. The main measure is in 6.4.

What the check cannot see: whether a statement about a path that exists is true; test results, which it
does not check at all; a path first committed after the document (93 of them, not counted as wrong,
since the file may have existed uncommitted); a commit that existed and has since been pruned; a path
that belongs to another project and happens to start with a folder name this repository has; and 208
bare `#` numbers that no "PR" or "pull" stands in front of, which it leaves out. That last rule was set
after the first run on the record, which had counted them.

### 6.4 The main measure: a reader's check of the latest state

Fixed now, before any trial document exists.

- **Unit.** One hand-over, as the next window receives it. In arm A that is a brief with its key row. In
  arm B it is the compaction summary together with its kept tail and the git status the next window is
  given. The kept tail is the session's last messages, which the harness keeps word for word after the
  summary; it summarises only what comes before them (`docs/program/SUMMARY-CHECK-2026-11.md`, 2.3).
- **What is checked.** Every statement of the latest state: the head of a scope, the state of a pull
  request, the result of the last check or test run, the last step finished, what is in flight and what
  comes next. And every open loop: each thing the last 30 turns [G] of the old session left asked and
  not answered, started and not finished, or promised.
- **Against what.** The repository at the document's time, and those last turns of the old session as
  written. This is how PR-SUMMARY's two were found. In arm B some of those turns are the kept tail, which
  is part of the hand-over itself; the next point is for that case.
- **Marks.** Each statement is right, wrong, overtaken in the kept tail, or cannot tell. A statement in a
  compaction summary that only the kept tail contradicts is marked overtaken in the kept tail: the same
  hand-over corrects it. It is reported beside the wrong count, not in it. Each open loop is carried or
  dropped.
- **Scores for an arm.** Wrong statements over statements marked right, wrong or overtaken. Overtaken
  statements over the same, reported beside it. Open loops dropped over open loops. The share of
  hand-overs with at least one wrong statement or dropped loop, and beside it the share with at least one
  overtaken statement.
- **Which count scores the trial is the owner's call. It is not decided here.** There are two readings.
  - *The wrong count alone: the hand-over as the next window receives it.* It shows whether a window is
    handed something false that nothing in the same hand-over corrects. On claims a script can recheck
    the summaries on record score 0 wrong of 2,727 (the summary check's 2.5). But 2,617 of those are
    commit ids and paths, held when the identifier is on record, and 110 check a value against a state
    (its 3.1): that gives no measured reason to expect many wrong statements on this count, and it is
    not a count of them. Statements that name no pointer, and dropped loops, are not counted yet. If the
    rate is near zero, the rule cannot show an improvement at any size; a trial read this way could show
    only that briefs are no worse.
  - *Wrong plus overtaken: the summary's own text.* It shows how often the text is behind the session it
    summarises. In the summary check's 117 summaries that is 74 (63.2 %; its 2.7). A brief
    is written as the session's last act and has no kept tail, so nothing can overtake it. Against a
    brief that is almost never behind, ten hand-overs an arm would show a difference; against one behind
    half as often as a summary it would take 38 (the summary check's 3.5, at 5 % two-sided and 80 %
    power, before its allowance for several hand-overs from one session). Arm A would win by
    construction, and the difference would measure how the two documents are made, not what the next
    window gets wrong.
  - Whether an overtaken statement misleads the window that receives it is a third question; the
    summary check's 2.8 looks at it.
- **Who reads.** An agent on a fixed prompt, twice for each document, independently; a third reading
  where the two differ. The prompt is written and frozen before the first trial hand-over. The reader is
  not told the arm, but a brief and a summary do not look alike, so the reading is not blind.
- **A brief that points has fewer statements to get wrong.** That is the rule's claim (1.5), not a flaw
  in the measure. The number of statements in a document is reported beside the rate, and the open-loop
  score is the one where a brief has no such advantage.
- **What counts as the rule not paying on fidelity** [G for both thresholds]: the share of arm A's
  hand-overs with a wrong statement or a dropped loop is not below arm B's; or more than one arm A
  hand-over in ten ends in a rule failure (6.3). As written, the first threshold reads the wrong count
  and the dropped loops, not the overtaken statements. If the owner chooses the other reading, overtaken
  statements are added on arm B's side, and by the reasoning above arm A then passes it by construction.

**The baseline comes first, and part of it now exists.** When this section was first written the check
had been done on two summaries. Since then `docs/program/SUMMARY-CHECK-2026-11.md` has counted 117
summaries in the main sessions of FixFlow (69) and the clinic testbed (48), a set that differs from part
3's 117 (see the result in short). It found 0 wrong of 2,727 claims a script can recheck, with every
flag read by hand (its 2.5). And, by one reader, 74 of the 117 (63.2 %) are overtaken in the kept tail
(its 2.7). Blind second readings of 40 of those kept tails agree with that reader on 28 of 30 and on 9
of 11 (one tail is in both sets); where they end up differing from that reader (the 30 after
adjudication, the 11 as the second reader read them) they count the hand-over as overtaken (one of the
30 and two of the 11), so 74 is more likely a few too low than too high (76 or 77; its 2.7 and 3.6).
PR-SUMMARY's 2 of 2 was that second count (its 3.3).

What the baseline still has to add before a lane wave is spent: dropped open loops, which nothing has
counted, and a second reader of each statement of where the work stood in the whole summary (the summary
check's second readings cover only the closing sections against the kept tail, for 40 of the 117). The
sizing rule is then read on the count the owner picks. On the wrong count, a rate near zero would need a
size no wave gives, and the trial should not start as a test of improvement in fidelity. On wrong plus
overtaken, a rate near 63.2 % shows with the ten hand-overs an arm that 2.5 set only against a brief
that is almost never behind, which is the built-in advantage named above. The rest of the baseline needs
agent runs, so it waits on D07.

### 6.5 Tokens, time and the owner's steps

- **The replay's guesses become measurements.** The trial measure prints a new session's first call
  (in place of the fixed start and the brief), its extra reading by call 20 beyond the 2.8k a call the
  record shows (in place of the re-learning), and the calls a due session makes from its first call over
  the line to its last (in place of the drain and hand-over calls). The replay is run again on those,
  and tests N1 and N2 are read again. That is how the trial settles what the record could not (3.5).
- **Beside them, for each arm:** context tokens for each accepted slice, agents included; calls and
  cache-read tokens over the line; rule failures; minutes from the first call over the line to the new
  session's first call; human prompts for each hand-over; how many root hand-overs the owner opened.
- **Size, from the record** [E]: at 300k the rule hands over once in 64 minutes of active session work,
  and an earlier compaction window writes a summary once in 42 (table section D). 24 of FixFlow's 36
  session windows passed 300k (B).

### 6.6 Before a wave starts, and whose step each is

1. **The owner:** D07, the token budget. The trial starts agents: the lanes' own, and the readers of 6.4.
2. **The owner:** which of the two counts scores the trial (6.4), and the go for the rest of the
   baseline. **On that go, with agent runs:** the rest of the baseline over recorded summaries (6.7; its
   prompt is already frozen), which is dropped open loops and a second reader of the whole summary's
   statements of where the work stood. It prints both counts, so it does not wait on the pick. Its
   result, read on the count the owner picks, decides whether a wave is worth spending.
3. **The owner or the coordinator:** which lane wave is arm A and which is arm B. Same plan, same
   models, similar size (2.5).
4. **Checked first:** whether two sessions can hold different compaction windows at once (6.2).
5. **The owner:** the Opus setting, only if an Opus session holds a node in arm A.
6. **Each arm A session is started with** part 1, the gauge command, the line and the ceiling, and its
   brief. The root keeps the manifest.
7. **The owner:** opens each new root (1.6).

### 6.7 The rest of the baseline over recorded summaries: what is fixed before it runs

Added later on 14 November by a fresh session. **No agent has run and no summary or turn has been read
for this.** What follows was fixed from counts alone. The run waits on the owner's go: D07 is not
answered, and this is the first step of WP12 that starts agents.

**What it adds, and what it does not read again.** 6.4 names two things the baseline still lacks:
dropped open loops, which nothing has counted, and a second reader of the latest state. The readings are
scoped to those two.

- *Open loops*: each thing the last 30 turns left asked and not answered, started and not finished, or
  promised; carried or dropped.
- *Where the work stood*: the last step finished, what is in flight, what comes next; right, wrong,
  overtaken in the kept tail, or cannot tell. These are the statements the summary check's reader read
  against the kept tail, and the ones that name no pointer, which no count has covered.
- *Not read again*: commit ids, paths, pull request states and test results. The summary check counted
  them over its 117 summaries by script, with every flag read by hand: 0 wrong of 2,727. So the readers
  do not open the repository. The head of a scope, one of 6.4's six kinds, is counted by neither: the
  summary check gives heads no rate (its 2.5), and these readings leave bare values out.

**The prompt.** `docs/program/evidence/split-replay/reader-prompt.md`, frozen at 11:02 UTC (sha256 of
the file `e7c08ccf…620165fc`, of the prompt text itself `19e275ef…1ef2242`). It is the third text. Two
earlier ones were frozen that morning, also before any reading, and are kept beside it:

| text | frozen (UTC) | what it is | file |
| --- | --- | --- | --- |
| first | 10:48 | 6.4 as the brief gave it: three marks, six kinds of statement, the repository | `reader-prompt-superseded-1048.md` (`b9f618dd…`) |
| second | 10:52 | 6.4 as revised: the fourth mark, six kinds, the repository | `reader-prompt-superseded-1052.md` (`6ab75c45…`) |
| third | 11:02 | scoped as above: three kinds, the turns only | `reader-prompt.md` |

The first was edited in place into the second before the revision of 6.4 had been seen in full. It was
rebuilt afterwards by undoing those edits, and its hash matches the one taken at 10:48. The second is
the form a trial's readers would use if they are to mark all six kinds of 6.4. No agent has read on it.

**What a reader is given.** A new stage of the script, `reader extract`, writes for one summary two
files into a scratch folder outside the repository, and refuses a folder inside any git working tree:

- the summary in numbered lines, with the path to its transcript taken out so that no reader opens one;
- the last 30 turns before its boundary. A turn is one call the model made, as the replay counts calls:
  what it had just received, what it said and thought, the tools it called and what came back. What the
  model said and what the owner typed are never cut. A tool input is cut at 1,000 characters (4,000 where
  the tool sends a message, starts an agent or session, or sets the plan), a tool result at 2,000, a
  message from another session at 6,000, a task notice at 3,000 [G for every cap]. Each cut is marked.

A reader uses the Read tool and writes one file of marks (kinds, line numbers, turn numbers, marks). It
runs no command. It replies with counts. No sentence from a summary or a turn goes into its reply, the
repository or a note.

**The kept tail in these 61** [M] (`reader-sample.txt`). It is found as the summary check found it
(its 1.9 and 2.3): the boundary marker lists the messages the harness kept word for word. In all 61 that
is the old session's last call: turn 30 of 30, or turn 28 of 28 in the one summary with fewer than 30
turns. In 26 of the 61 a message also arrived after that
call (a task notice, another session, the owner) and was kept the same way. Each turn in a reading file
is headed as seen by the summary's writer or as kept, so a reader can give 6.4's third mark. Two things
follow from 6.4's unit, the summary together with its kept tail:

- A loop opened in the kept turn counts as carried: the hand-over carries that turn word for word. The
  table says how many loops are carried only that way.
- For a wrong statement the reader names the earliest turn that shows it wrong, and whether the turns
  show it had been so earlier. The table splits the wrong count into behind (it had been so) and never
  so on the record.

**The first reader, beside these** [M, hand, by the summary-check session]
(`docs/program/evidence/summary-check/audit.json`). On these 61 its verdict is overtaken for 32, not
overtaken for 25 and unclear for 4; on the sample, 7, 5 and 0. `reader tally` prints, summary by summary,
how often the new readings and that verdict agree. The two are not the same count: that verdict is one
for each summary, on its closing sections against the kept tail; these readings mark each statement in
the whole summary against 30 turns.

**The sample** (`reader-sample.txt`, printed by `reader list`). Every fifth of the 61 in time order, by
the summary's own time. There are five such sets. The one first taken (records 5, 10, …) had a message
arriving after the last turn in 1 of its 12 summaries, against 26 of 61 in the record. Nothing had been
read, so the rule was made: of the five sets, the one closest to the whole record on four counts that
need no reading, as the sum of the four differences in share; a tie goes to the set from more sessions.
The first reader's verdicts were looked up only after the set was picked.

| | summaries | sessions | main tree | prepared ahead | window of 400k or more | something arrived after the last turn | distance |
| --- | --- | --- | --- | --- | --- | --- | --- |
| the record | 61 | 21 | 26 | 10 | 13 | 26 | |
| start at 1 | 13 | 10 | 3 | 2 | 1 | 9 | 0.61 |
| start at 2 | 12 | 8 | 7 | 3 | 2 | 4 | 0.38 |
| start at 3 | 12 | 11 | 4 | 2 | 2 | 6 | 0.22 |
| **start at 4: the sample** | 12 | 7 | 5 | 2 | 4 | 6 | 0.21 |
| start at 5 | 12 | 7 | 7 | 1 | 4 | 1 | 0.70 |

The sample is records 4, 9, 14, …, 59: 12 summaries [G for the size] from 7 sessions. FixFlow only; the
clinic testbed's 48 are not read.

**The readers.** A general-purpose agent on Opus 5.5 at its default effort, started with one fixed
sentence that points at its instruction file (the frozen prompt with its three paths filled in). Two for
each summary; neither is given the other's marks or the first reader's verdict. They are not blind: a
summary looks like a summary.

**When the two differ.** A third reading, on the same prompt, when one reader marks a statement wrong or
overtaken, or a loop dropped, and the other does not give the same statement or loop the same mark. A
difference between right and cannot tell, or a unit only one of them lists and marks right, cannot tell
or carried, changes neither count and gets no third reading.

**Putting the readings together** (`reader tally`). Two readings name the same statement when they give
it the same kind within three lines, or any kind within one line; the same loop when it is the same kind
opened within two turns, or any kind within one turn. A unit counts when at least two readings name it,
and its mark is the one at least two give. With no such mark, a statement that two readings call wrong
and overtaken, one each, is counted as split: it is in wrong plus overtaken and not in the wrong count.
Any other statement with no such mark counts as cannot tell, and a loop with none is left out of the
rate. A unit only one reading names is counted apart and enters no rate.

**What is reported**, all of it printed by `reader tally` into `reader-baseline.txt`: statements checked,
right, wrong (behind, never so), overtaken and cannot tell; open loops, carried and dropped; 6.4's scores
for both counts, with neither picked; how often the first two readings agreed, by summary, by unit and by
mark; the first reader beside them; and the tokens the readers used, from their own transcripts
(`reader cost`).

**What size of trial each count needs.** The rule the `pointers` stage prints: a halving shows at two
standard errors of a count once the comparison arm holds 24 events. On a share p of hand-overs, the same
two standard errors on two shares, p and p/2, give 24/p − 20 hand-overs an arm. Two standard errors is
about 5 % two-sided at 50 % power; the summary check sizes at 80 % power (its 1.7 and 3.5), which roughly
doubles these figures: a halving from 63.2 % takes about 18 an arm by this rule and 38 by that one. So,
fixed now, for whichever count the owner picks: **ten hand-overs an arm show a halving if the share of summaries with at
least one event is 80 % or more, or if the events come to 2.4 or more a summary.** Under both, a wave of
ten an arm cannot show it, and the table prints the size that could. It is printed for the wrong count
(wrong statements and dropped loops), for wrong plus overtaken, and for dropped loops alone, each with
the size at both ends of the share's 95 % range, since twelve summaries give a wide one.

**What it will cost** [E] (printed at the foot of `reader-sample.txt`).

- 24 readings, and at most 36 if every summary needs a third.
- A reader's first call reads 66k tokens before any work of its own: the median of 42 such agent windows
  on record [M]. One reading takes in about 46k more [E].
- New tokens (not read from cache): about 119k a reading, **2.9 to 4.3 million in all**. For scale, the
  one five-hour window on record covered about 3.4 million subagent tokens.
- Context tokens with every re-read counted, as the replay counts them: 0.4 to 0.8 million a reading at
  4 to 7 calls [G], **10 to 27 million in all**, nearly all of it cache reads.
- Scoping the readings took the repository out, which cuts the calls and so the re-reads [G]; no
  estimate with the repository was printed. It hardly moves the new tokens: more than half of each
  reading is the agent's fixed start.

**How it runs, once the owner says go.** In two halves (records 4, 14, 24, 34, 44, 54, then the rest),
at most three readers at a time. After the first half the readers' measured tokens are set beside this
estimate, and the run stops for a word from the owner if a reading costs more than half as much again as
the upper figure. No result is looked at to decide whether to go on. The scratch folder is deleted after
the tally.

**Does it overlap with the after-compaction count?** No. `docs/program/AFTER-COMPACTION-2026-11.md`
counts signs of a session going wrong in the calls after a boundary against the calls before it. It does
not list what a session left open before a boundary, or whether the hand-over carries it.

**Known before it runs.**

- Twelve summaries from 7 sessions. A share will have a range of some 25 points either side.
- A reader sees 30 turns. A statement about something older can only be marked cannot tell.
- The readers do not see the git status the next window is given, which 6.4 counts as part of the
  hand-over.
- The six-kind prompt a trial would use (the second text) has not been read on by any agent.
- Most of these summaries were written in Opus sessions, and the readers are Opus.
- The compile's rule is that harness work which starts agents waits while a FixFlow phase is running or
  with its reviewer. At 15:22 on 14 November the lane board showed P2b-2, P12 and the L4 follow-up with
  their reviewers and P7b-2 running. The owner's go decides whether it runs beside them.
