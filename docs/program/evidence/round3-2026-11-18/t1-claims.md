# t1 claims: every claim the report rests on (step 2, draft for the gate and the refuter)

`R:` = `docs/program/evidence/round3-2026-11-18/`. Paths from the repository root. Written 2026-11-19 by the analyst
(kind analyse, Opus) from `R:t1-collect-{ours,concurrent,writes,versions,hierarchy}.md`, their second-attempt sections
included, from `R:t1-collect-production.md` (sub-topic 6, added on the coordinator's message of 2026-11-19; section G),
and from the places named below.

Marks. `proven`: quoted from the paper's own text (`paper.txt` made by `pdftotext` from the downloaded PDF); where the
collector read the paper only in part, the block says "read in part" and names what was read; a survey or
documentation is named as such. `observed`: read in our files; where a figure in our files is itself a measurement on
other repositories or an estimate, the block says so. `measured here`: none in this round (no measurement was allowed).
`hypothesis`: reasoned by the analyst or a collector. `summary`: read only through an abstract, a search snippet or a
second-hand account; never used to decide. "checked" after a place means the analyst re-opened that line on
2026-11-19 and found the quote there; "not re-opened" means the line is as the collector gave it.

A claim about sessions that rests on a paper's result is two claims: the paper's result (`proven`) and the transfer
(`hypothesis`), with the assumption the transfer needs.

## A. Our tree, as recorded and coded

**C01.** The written rule is a tree of three levels (coordinator, one session per field, that session's helpers),
"never more"; the count of seven leaves with no inner level is an expectation of the pilot, not a measured count.
- Mark: observed.
- Quote: "## 2. The tree: three levels, never more"; "Seven leaves expected, "no inner level is ever needed for 7-10 fields" (343 [1])".
- Place: `docs/program/RESEARCH-TREE-PROTOCOL-2026-11-16.md:15` (checked); `research-tree/DESIGN-RECORD.md:162` (checked).

**C02.** The design borrows from the B+ tree only bulk loading at a fill factor and a node capacity for what must
share one window; the fill factor 0.75 is stored but no script reads it, and `plan-tree.mjs` does not exist.
- Mark: observed.
- Quote: "A B+ tree bulk-loaded at a fill factor governs what must share a window: a field's key range and its pack at review"; `"fill_factor": {"value": 0.75, "unit": "f, fraction of a leaf filled at bulk load (design R47, later)"`.
- Place: `docs/program/RESEARCH-TREE-PROTOCOL-v2-2026-11-16.md:440-441` (checked); `research-tree/tcb/thresholds.json:43` (checked); `ls research-tree/tcb/plan-tree.mjs` gives "No such file or directory" (checked); no `.mjs` in `tcb/` reads `fill_factor` (grep, checked).

**C03.** Split with a separator, redistribution and the plan-tree bulk load are deferred to "later".
- Mark: observed.
- Quote: "Moved to later by the ruling (1078-1094): certainty, plan-tree bulk load, hook budget check, redistribution, split with separator, ..."; "(c) Later: a cross-field key may move to its co-owner. (d) Later: a split."
- Place: `research-tree/DESIGN-RECORD.md:18` (checked); `docs/program/RESEARCH-TREE-PROTOCOL-v2-2026-11-16.md:461` (checked).

**C04.** (Carried from step 1.) No file read records the owner rejecting the removal of the split. The record shows
the coordinator withdrew the split itself (protocol v1, amendment ruling); version 2 brought a split back as "later"
(R48(d)); the attack point "split leaf in the pilot" is among the rejected attack points; the owner's recorded words
name B+ trees in general, not the split. The sentence in `R:lane-tree.md` line 18 was the top session's reading of
summary lines, marked "verify". Candidate correction of that sentence for the fold; the fold step checks whether a
library record says otherwise (`R:t1-collect-ours.md:15`: none found by `lookup.sh` for split, B+ tree, hierarchy, shape).
- Mark: observed.
- Quote: ""Split a field in two on overflow" is withdrawn. It was the coordinator's own application of the idea, and it was wrong"; "(d) Later: a split. The overflow record (R11) becomes a new leaf whose separator is written into `tree-plan.json`"; "A4-05 split leaf in the pilot (1034)"; owner: "we have to fix these problems; they probably align with different well documented and solved branches and domains of CS, like I'm reusing distributed systems and B+ trees."; lane file: "the owner then rejected the removal of the split" and "(verify it; this is your sub-topic 1)".
- Place: `docs/program/RESEARCH-TREE-PROTOCOL-2026-11-16.md:276` (checked); `docs/program/RESEARCH-TREE-PROTOCOL-v2-2026-11-16.md:461-462` and `:20-22` (checked); `research-tree/DESIGN-RECORD.md:69` (checked; the reason sits in `result.json` line 1034, not read); `R:lane-tree.md:18` and `:8` (checked).

**C05.** Today a leaf over its limit is cut and its uncovered ids listed; R48(d), once built, replaces this.
- Mark: observed.
- Quote: "Cutting a task writes an overflow record {ids, tokens, reason} to the ledger, and those ids stay visible as not covered in every view"; "Once (d) exists, this replaces "cut the pack and list the rest"".
- Place: `docs/program/RESEARCH-TREE-PROTOCOL-v2-2026-11-16.md:172-173` and `:465-466` (checked).

**C06.** The record states that the research a leaf has done is paid for and cannot be divided: a split here is not
the cheap node copy of a B+ tree.
- Mark: observed.
- Quote: "a B+ split costs one node copy; here the data is paid for and the window cannot be divided".
- Place: `research-tree/SELECTIONS-MAP.md:30` (checked).

**C07.** A node has two capacities: pack capacity C_node (165,000 tokens in code; 180,000 in the record, because the
review reserve differs) and spend A_leaf with soft and hard fractions 0.8 and 0.9 of the task estimate; most inputs
are marked "guess".
- Mark: observed.
- Quote: `const cap = T.get('W_quality') - T.get('child_prefix_tokens') - T.get('review_reserve_tokens');` with 300000, 60000, 75000; "Pack capacity C_node = W_quality - P - R_rev = 180.0k".
- Place: `research-tree/tcb/commit.mjs:761` (checked); `research-tree/tcb/thresholds.json:18-19, 25, 27, 28` (checked); `research-tree/DESIGN-RECORD.md:127` (checked).

**C08.** Starting a node costs a fixed prefix of about 60,000 tokens per agent and about 79,000 at a main session's
first call (medians recorded from other repositories' transcripts, not from a tree run); the successor's reloaded state
S0 = 10,000 tokens is a guess.
- Mark: observed.
- Quote: "| coordinator.P | 79000 | tokens | M | ... first call of a recorded main session, median (75k-88k by group)"; "| child.S0 | 10000 | tokens | G |"; "P = 79k session, 60k agent (M, 343)".
- Place: `research-tree/ATTACK-AND-COST-RECORD.md:93, 104` (checked); `research-tree/DESIGN-RECORD.md:127` (checked).
- Time, the only figure the record gives: "five Sonnet readers together used 767,000 tokens in four minutes" (library r57-0115, one trial), as quoted at `R:t1-collect-ours.md:139` (not re-opened).

**C09.** Our recorded token sink is the re-read window: token use is calls times window size (measured on the
transcripts of two other repositories, 35,834 calls).
- Mark: observed.
- Quote: "97 % of all tokens are re-reads of a window that was already there"; "Token usage is **calls × window size**. Nothing else comes close."
- Place: `docs/program/TOKEN-BOTTLENECK-2026-11.md:14, 18` (checked).

**C10.** The coordinator's hand-over interval follows the square-root law; W*_coord = 133,200 tokens is computed from
estimated inputs, not measured on a tree run.
- Mark: observed.
- Quote: "tokens per work call are least at k* = √(2H0/g), so W* = P + S + √(2H0·g)"; `"W_star_coord": {"value": 133200`.
- Place: `docs/program/RESEARCH-TREE-PROTOCOL-v2-2026-11-16.md:473` (checked); `research-tree/tcb/thresholds.json:23` (checked).

**C11.** The design's only stated rule for when a leaf splits instead of handing over is R49, a ratio: once the
reloaded state S reaches g·k*, or past n_max calls.
- Mark: observed.
- Quote: "once S ≥ g·k*, or past n_max = k*(g·k* − S0)/σ calls, the range splits by R48(d)".
- Place: `docs/program/RESEARCH-TREE-PROTOCOL-v2-2026-11-16.md:468-469` (checked).

**C12.** The record's rules on splitting disagree with each other, and the build notes say to settle them from the
record before touching splitting.
- Mark: observed.
- Quote: "its rules on splitting disagree with each other (D2-01 and D2-02 split by question range at plan time, D3-12 says a field is not split in the middle of its research, D3-01 says remaining work is split when the window is near its limit): settle that from the record before touching splitting."
- Place: `research-tree/FAULTS-AND-FIXES.md:37-40` (checked; `R:t1-collect-ours.md:91` cites lines 49-53, the text has moved).

**C13.** Admission and the watcher know no tree: every session is a peer of one coordinator, with no parent or level
field in the facts admission decides on.
- Mark: observed (the `ours` collector's reading of `admit.mjs decide`; not re-opened by the analyst).
- Quote: "None of this knows a node's place in a tree: all sessions are peers of one coordinator (reasoned: no parent or level field in `decide`'s facts".
- Place: `R:t1-collect-ours.md:113-115`, citing `research-tree/tcb/admit.mjs:158, 220-261`.

**C14.** None of the 13 fixes touches shape, capacity, split or overflow; FX-CLAIM, FX-CLOSE and FX-PLAN touch
admission and start acts, FX-CGATE, FX-W3 and FX-W4 touch the coordinator, and FX-CLOSE already changes the tasks schema.
- Mark: observed.
- Quote: "FX-CLAIM | lib, guard-hook, replace, stop, handover, admit, status, thresholds.json"; "FX-CLOSE | lib (tasks schema), stop, thresholds.json"; "FX-PLAN | lib (`planAct`), status (`nextOf`), watch (`rowAct`)"; "FX-CGATE | guard-hook, handover, status, selftest".
- Place: `research-tree/BUILD-SIZE.md:44, 45, 46, 48, 51, 52` (checked); the "none touches shape" reading is `R:t1-collect-ours.md:117-123`; the files they share: "Ten fixes edit `lib.mjs`, nine `status.mjs`, eight `watch.mjs`." `research-tree/FAULTS-AND-FIXES.md:49` (checked).

**C15.** There has been no run of the tree; every cost figure for the tree is an estimate or comes from other work.
- Mark: observed.
- Quote: "| Not done | The thirteen fixes in the scripts; the checks that need the app; the pilot; a first run of the tree |".
- Place: `research-tree/START-HERE.md:17` (checked; `ours` cites line 20, the table has moved).

**C16.** Sessions exchange nothing directly: everything passes through files the coordinator checks; a field session
never talks to another; objects are created exclusively and never repaired; the task table is written by
compare-and-set on its revision.
- Mark: observed.
- Quote: "Experts never see each other's output. Everything passes through files that the coordinator checks."; "Talks to another level-1 session" (under "Never does"); b1-0121: "objects are stored by exclusive create and never repaired ... the task table is written by compare-and-set on its revision".
- Place: `docs/program/RESEARCH-TREE-PROTOCOL-2026-11-16.md:20, 23` (checked); b1-0121 as quoted at `R:t1-collect-ours.md:126-128` (not re-opened).

**C17.** The design itself says that at seven leaves height, search, latches and merges add nothing.
- Mark: observed.
- Quote: "At seven leaves the borrowed parts are node capacity, fill factor, splitting the key range with a separator written to the parent, and never dropping a key. Height, search, latches and merges add nothing."
- Place: `docs/program/RESEARCH-TREE-PROTOCOL-v2-2026-11-16.md:498-500` (checked).

**C18.** Each child's commit note (400 characters) goes into the coordinator's window: the up-flow is one message per
commit, not a batch.
- Mark: observed.
- Quote: "the harness puts each child's 400-character note into its window".
- Place: `docs/program/RESEARCH-TREE-PROTOCOL-v2-2026-11-16.md:39-40` (checked).

## B. B-trees under concurrent change

**C19.** Lehman and Yao split a node in two steps: the new right node is reached first by a link pointer from its
left twin, and a node with no parent but a left twin is a legal state.
- Mark: proven (read in full).
- Quote: "When a node is split because of data overflow, a single node is replaced by two new nod[e]s. The link pointer of the first new node points to the second node"; "the link pointer must exist first; that is, it is legal to have a node in" [the tree that has no parent]; "the link pointer serves as a "temporary fix" that allows correct concurrent operation".
- Place: `R:papers/tree/lehmanyao/paper.txt line 162-164` (checked).

**C20.** In Lehman and Yao a search takes no lock, and an insert locks at most three nodes, rarely, working back up
one level at a time.
- Mark: proven.
- Quote: "this procedure does no locking of any kind"; "at most three nodes are ever locked simultaneously, and this occurs relatively infrequently".
- Place: `R:papers/tree/lehmanyao/paper.txt line 233, 359` (checked).

**C21.** Lehman and Yao do not merge: a leaf may hold fewer than K entries, and low utilisation is fixed by a rare
reorganisation that locks the whole tree.
- Mark: proven.
- Quote: "A simple way of handling deletions is to allow fewer than K entries in a leaf node."; "a batch reorganization or an underflow operation which locks the entire tree can be performed."
- Place: `R:papers/tree/lehmanyao/paper.txt line 478, 482` (checked).

**C22.** Lehman and Yao measured nothing, and their scheme allows livelock of a very slow process that keeps
following links.
- Mark: proven.
- Quote: "our algorithms do not prevent the possibility of livelock ... a process being run on a (relatively) very slow processor"; "The behavior of this system could be quantified by simulation".
- Place: `R:papers/tree/lehmanyao/paper.txt line 466, 487` (checked).

**C23.** Graefe's survey: the second step of a B-link split (posting to the parent) can be done by any later
traversal and may be delayed past a reboot without inconsistency; the split is a local step; the risk is long chains
of neighbours under high insertion rates.
- Mark: proven (a survey; read in part: sections 1-4 and the B-link passage).
- Quote: "can be made a side effect of any future root-to-leaf traversal, should happen as soon as possible, yet may be delayed beyond a system reboot or even a crash and its recovery without data loss or inconsistency"; "a local step, affecting only one preexisting node"; "a solution is needed to prevent long linked lists among neighbor nodes during periods of high insertion rates".
- Place: `R:papers/tree/graefe2010/paper.txt line 115` (checked; the collector cites 110-111, where the passage begins).

**C24.** In the Bw-tree any thread that meets a half-done structure change completes it before its own work, so no
thread waits for a structure change.
- Mark: proven (read in full).
- Quote: "a thread that sees a partial SMO will complete it before proceeding with its own operation"; "it must complete the split SMO by posting the new index term delta to the parent. Only then can it continue".
- Place: `R:papers/tree/bwtree2013/paper.txt line 70, 246-247` (checked).

**C25.** (Carried from step 1.) The Bw-tree's Table I gives failed splits of 0.25 % (dedup), 1.27 % (Xbox) and
8.88 % (synthetic), and failed consolidates of 1.19 %, 0.22 %, 7.35 %; the text says "around 1.25 % for both the Xbox
and deduplication workloads". Table and text disagree for dedup splits. Library record x03-0335 carries the text's
figure ("about 1.25% on Xbox and dedup"): candidate correction of x03-0335 for the fold, to the table's figures.
- Mark: proven (the table and the text); the correction is observed against the record.
- Quote: "Dedup Xbox Synthetic / Failed Splits 0.25% 1.27% 8.88% / Failed Consolidates 1.19% 0.22% 7.35%"; "the failure rates for the split and consolidate operations are larger than the update failures at around 1.25% for both the Xbox and deduplication workloads, and 8.88% for the synthetic workload. This is expected, since splits and consolidates must compete with the faster record update operations."
- Place: `R:papers/tree/bwtree2013/paper.txt line 280-290` and `line 354` (checked); `library/journal/2026-11-18/x03.jsonl:47` (checked).

**C26.** The Bw-tree ran 18.7 times BerkeleyDB's throughput on the Xbox workload (8.6 times dedup, 5.8 times
synthetic), in memory, 8 worker threads.
- Mark: proven.
- Quote: "the Bw-tree exhibits a throughput of 10.4M operations/second, while BerkeleyDB has a throughput of 555K operations/second, representing a speedup of 18.7x".
- Place: `R:papers/tree/bwtree2013/paper.txt line 357` (checked).

**C27.** Rebuilt and measured by others, the Bw-tree is 1.5 to 4.5 times slower than lock-based trees with
optimistic lock coupling (20 threads), and its help-along gives no progress guarantee.
- Mark: proven (read in part: sections 1, 2, 5 and the close).
- Quote: "the overhead of the Bw-Tree's indirection layer and delta records causes it to under-perform the lock-based indexes by 1.5-4.5x"; "Although the Bw-Tree is lock-free, threads are not guaranteed to make progress because of failed CaS".
- Place: `R:papers/tree/wang2018/paper.txt line 90, 162` (checked).

**C28.** With 20 threads, optimistic lock coupling looks up 3.9 times faster than lock coupling in a B+ tree of 100M
keys; single-threaded, all approaches perform about the same.
- Mark: proven (read in full).
- Quote: "With 20 threads, lookup with OLC is 3.9x faster than traditional lock coupling"; "With single-threaded execution, we observe that all three approaches have very similar performance."
- Place: `R:papers/tree/olc2019/paper.txt line 347, 308` (checked).

**C29.** The B-link tree holds one lock at a time, and releasing the parent early pays most when the child is slow to
fetch (from disk); in memory it scales no better than lock coupling.
- Mark: proven.
- Quote: "B-link tree [10], which only holds a single lock at a time"; "Releasing the parent lock early is highly beneficial when the child node needs to be fetched from disk."
- Place: `R:papers/tree/olc2019/paper.txt line 29` (checked).

**C30.** Optimistic schemes cap their retries and fall back to pessimistic locking under heavy contention.
- Mark: proven.
- Quote: "limiting the number of optimistic retry operations and falling back to pessimistic locking in cases of very heavy contention".
- Place: `R:papers/tree/olc2019/paper.txt line 244` (checked).

**C31.** ARIES/IM serialises structure changes in one tree with a tree latch held until the change has propagated;
the hold is short because no I/O happens under it; concurrent structure changes need a lock and risk deadlock.
- Mark: proven (read in full).
- Quote: "The tree latch is acquired in the X mode by a transaction just before it performs the SMO at the leaf level and is held until ALL the effects of that SMO are propagated up the tree"; "the holder of the tree latch will not do any I/Os while holding the tree latch and hence the time interval for which the latch is held should be very small"; "deadlocks may occur if multiple SMOs are permitted concurrently".
- Place: `R:papers/tree/ariesim/paper.txt line 263, 267, 603, 612` (checked; line 263 is damaged by OCR).

**C32.** In ARIES/IM a structure change is a nested top action: once done it is not undone when the transaction that
caused it rolls back.
- Mark: proven.
- Quote: "The SMO is performed as a nested top action."; the dummy CLR lets the transaction, "if it were to roiiback after competing the SMO, bypass the iog records relating to the SMO" (OCR spelling).
- Place: `R:papers/tree/ariesim/paper.txt line 493, 513` (checked).

**C33.** In ARIES/KVL a traverser that meets an unfinished structure change waits on the tree latch and restarts.
- Mark: proven (read in part: latch, structure-change and search passages).
- Quote: "requests the tree latch in the S mode, after releasing the page latches ... Search restarts its tree traversal".
- Place: `R:papers/tree/s2-mohan-kvl/paper.txt line 470-474` (not re-opened).

**C34.** In Srinivasan and Carey's simulation B-link algorithms gave the most concurrency and lock coupling with
exclusive locks the least; pessimistic algorithms level off at the same maximum however many resources are added;
real systems merge pages only when empty; with one CPU and one disk the algorithms barely differ.
- Mark: proven (simulation; curves in figures not read as numbers; no ratio given in the text).
- Quote: "the B-link algorithms are seen to provide the most concurrency and the best overall performance" (abstract); "the pessimistic algorithms level off at around the same maximum throughput as in the 1 CPU and 8 disks case (Figure 6), while the optimistic and B-link algorithms make excellent gains in throughput with increasing MPL"; "B+-trees in real database systems usually perform page merges only when pages becomes empty"; "The throughputs for all the algorithms were only slightly greater at higher MPLs than at an MPL of 1".
- Place: `R:papers/tree/srinivasan-carey/paper.txt line 10, 471, 64, 323` (checked).

**C35.** Transfer: the B-link half-split fits a tree of sessions better than lock coupling or any scheme that holds
other nodes while a structure change runs, because a session is a far slower node than a disk page.
- Mark: hypothesis.
- Rests on: C29, C34, C19.
- Assumption: the cost that decides is the time a structure change holds other nodes back, not per-operation work; a session cannot be paused while its parent is rearranged (PROJECT CONTEXT, `R:t1-brief-1-collect.md`).

**C36.** Transfer: completing a split should be a short, serialised file step done by a script under the run lock (the
tree latch of ARIES/IM), recorded as its own committed step that a rerun of the work that caused it does not undo;
neither a waiting session nor a helping session should do it.
- Mark: hypothesis.
- Rests on: C31, C32, C24, C27, C16.
- Assumption: posting a separator to `tree-plan.json` and adding one task row take seconds and no model call; Bw-tree help-along is rejected because helping costs a session minutes and gives no progress guarantee (C27).

## C. Trees built for many writes

**C37.** In Arge's buffer tree an update is a message put in the root buffer, pushed one level down only when a
buffer runs full (m/2 blocks), giving amortised O((1/B) log_m n) I/Os per operation.
- Mark: proven (theory; read in part: sections 2-3).
- Quote: "When a buffer "runs full" the elements in the buffer are "pushed" one level down to buffers on the next level"; "the amortized cost of an operation is O( [1/]B logm n ) I/Os".
- Place: `R:papers/tree/writes-arge-buffertree/paper.txt line 304-306, 492-494` (checked).

**C38.** Arge empties a node's buffer before any rebalancing touches the node, so no structure change meets
half-delivered messages.
- Mark: proven.
- Quote: "consists of doing a buffer-emptying process before every rebalance operation".
- Place: `R:papers/tree/writes-arge-buffertree/paper.txt line 439-441` (checked).

**C39.** In a B-epsilon tree batching divides insertion cost by the batch size B^(1-ε); B = 1024 and ε = 1/2 give
inserts 16 times faster; point queries cost more by the factor 1/ε.
- Mark: proven (an introduction by the structure's authors; read in full).
- Quote: "Compared to a B-tree, batching messages divides the insertion cost by the batch size (B^(1-ε)). For example, if B = 1024 and ε = 1/2, a Bε-tree can perform inserts ... = 16 times faster" (symbols restored).
- Place: `R:papers/tree/writes-bender-login/plain.txt line 69-75` (checked); the 1/ε query factor at lines 64-65, 118-120 (not re-opened).

**C40.** A B-epsilon tree flushes only when a buffer is full, and only to children with enough pending messages to pay
for rewriting them.
- Mark: proven.
- Quote: "Messages are only flushed to a child when the buffer of a node is full ... messages are only flushed to children with enough pending messages to offset the cost of rewriting the par[ent]".
- Place: `R:papers/tree/writes-bender-login/plain.txt line 81` (checked).

**C41.** A query in a buffered tree must check every buffer on its root-to-leaf path.
- Mark: proven.
- Quote: "answering a query also means checking the buffers in nodes on this path for messages, and applying relevant messages before returning the results of the query".
- Place: `R:papers/tree/writes-bender-login/plain.txt line 55` (checked).

**C42.** BetrFS's worked model: per-item cost 14 I/Os over a flush of 100 items against 2 I/Os per item in a B-tree,
so 14.3 times faster inserts; the gain is items per flush over twice the depth, and grows as items shrink.
- Mark: proven (worked example in the paper; 1 TB, 1 MB nodes, fan-out 10).
- Quote: "each flush moves 1MB/10 = 100kB of data, in other words, 100 items. Thus, the average per-item cost of flushing an item to a leaf is 14/100. Since a Btree would require 2 I/Os for each item, the B[ε]-tree is able to insert data 2/(14/100) = 14.3 times faster than a B-tree."
- Place: `R:papers/tree/writes-betrfs/plain.txt line 148-152` (checked).

**C43.** A layer that searches before every write chokes a write-optimised tree.
- Mark: proven.
- Quote: "These searches can choke a write-optimized data structure, where insertions are two orders of magnitude faster than searches."
- Place: `R:papers/tree/writes-betrfs/plain.txt line 306` (checked).

**C44.** O'Neil's LSM-tree: insert cost against a B-tree is proportional to the cost ratio of a batched page to a
random page and to 1/(entries merged per leaf), "nearly two orders of magnitude"; merge I/O is least when all
adjacent levels share one size ratio r, usefully about 20 or more.
- Mark: proven (analytic; read in part: sections 1-3).
- Quote: "the cost ratio of an insert into the LSM-tree to one in the B-tree is directly proportional to each of two batching effects"; "the total page I/O rate H to perform all merges is minimized when the ratios ri = Si/Si-1 are all equal to a common value r"; "useful values of ri are fairly large, say 20 or more".
- Place: `R:papers/tree/writes-oneil-lsm/plain.txt line 189, 242-250, 303` (checked).

**C45.** Leveling costs T times more in writes than tiering, and tiering T times more in reads and space; many
reported LSM gains were measured against an untuned size ratio of 10.
- Mark: proven (survey; read in part).
- Quote: "components must be merged more frequently, which will incur a higher write cost by a factor of T. In contrast, tiering is optimized for write performance ... This, however, will decrease query performance and worsen space utilization b[y a factor of T]"; "these improvements have mainly been evaluated against a default (untuned) configuration of LevelDB or Roc[ksDB]".
- Place: `R:papers/tree/writes-luo-carey/plain.txt line 668, 811` (checked).

**C46.** Lazy leveling (merge fully only at the largest level) cuts update cost from O(T·L/B) to O((L+T)/B) with the
same lookup and space bounds; no single merge policy is best, the best moves with the share of lookups.
- Mark: proven (read in part; throughput numbers only in figures, not read).
- Quote: "An updated entry with Lazy Leveling participates in O(1) merge operations per level across Levels 1 to L-1 and in O(T) merge [operations at Level L]"; "As the proportion of lookups increases, the best fixed policy changes from tiering to Transition 1, then to Lazy Leveling, then to Transition 2, and finally to leveling."
- Place: `R:papers/tree/writes-dostoevsky/plain.txt line 1212-1214, 2189` (checked; the collector cites 2190).

**C47.** For comparison-based external dictionaries the insert/query trade is a lower bound: cheap writes and cheap
reads together cannot be had without paying elsewhere.
- Mark: proven (theory; symbols lost by extraction and restored by the collector; read in part).
- Quote: "If N insertions perform at most λ·N/B I/Os, then (1) there exists a query requiring at least log_{B+1}(N/M) - O(1) I/Os ..." (as restored).
- Place: `R:papers/tree/writes-brodal-fagerberg/paper.txt line 126-140` (not re-opened).

**C48.** The log-structured file system wrote small files an order of magnitude faster than Unix FFS; cleaning costs
2/(1-u) for live fraction u, and must clean segments under 0.8 live to win.
- Mark: proven (read in part).
- Quote: "write cost = ... = 2/(1-u)"; "the segments cleaned must have a utilization of less than .8 in order for a log-structured file system to outperform the current Unix FFS".
- Place: `R:papers/tree/s2-rosenblum/paper.txt line 340-362, 316-323` (checked).

**C49.** The buffered repository tree inserts into the root buffer and distributes down on overflow; an extract reads
the buffers of the ancestors of the leaves it reads.
- Mark: proven for the mechanism; summary for the cost bound (glyphs damaged).
- Quote: "To insert item x, we add x to the root's buffer. If the buffer overflows, we distribute [items] to the node's children appropriately".
- Place: `R:papers/tree/s2-buchsbaum/paper.txt` section 2 (not re-opened).

**C50.** Transfer: a parent's wake is the flush of a buffered tree; messages to or from a parent (new questions,
corrections, child notes) collected in a file and delivered as one batch per wake cut the parent-side tokens per
message by about the batch size; the trigger is a fraction of what the receiver can hold, not a count; whoever needs
the current state of a leaf must read the undelivered buffers on its path, so buffers live in files, not in a window.
- Mark: hypothesis.
- Rests on: C37, C39, C40, C41, C42, C09, C18.
- Assumption: a wake costs about the parent's window (C09) whatever the number of messages in it, and a message is small next to that window; not measured for our sessions.

**C51.** Transfer: summaries should be merged once at the top (lazy leveling), with several child reports kept as they
are at the lower levels, the policy chosen by how often a parent must read state against how often children report.
- Mark: hypothesis.
- Rests on: C45, C46.
- Assumption: rewriting a parent's summary is the analogue of a merge, and its cost grows with the number of levels rewritten per report.

## D. Versions, bulk loading and node size

**C52.** Under shadowing (copy-on-write) one change rewrites the whole path, up to 2 × tree depth pages.
- Mark: proven (IBM report version of Rodeh 2008, read in full).
- Quote: "modified disk-pages can be 2 x tree-depth".
- Place: `R:papers/tree/versions-rodeh/paper.txt line 332` (checked).

**C53.** Append-only growth leaves B-tree nodes 50 % full, because the right edge keeps splitting.
- Mark: proven.
- Quote: "an average occupancy of 50%. This is caused by the append-only workload used to create them"; "the right edge of the tree keeps splitting leaving [behind half-full nodes]".
- Place: `R:papers/tree/versions-rodeh/paper.txt line 580-582` (checked).

**C54.** Rodeh's copy-on-write B-tree makes every modification lock the root and one child exclusively, a
serialisation point that did no harm only because those nodes were cached.
- Mark: proven.
- Quote: "This creates a serialization point."
- Place: `R:papers/tree/versions-rodeh/paper.txt line 541` (checked; the rest of the sentence as the collector gives it, `R:t1-collect-versions.md:27`).

**C55.** Rodeh measured about six times the throughput with ten tasks against one on a disk-bound lookup load, and a
clone cost of 0.3 to 4 %.
- Mark: proven (baseline is an ideal from the disk rate, not another tree).
- Quote: "a speedup of about x6 is achieved".
- Place: `R:papers/tree/versions-rodeh/paper.txt line 588` (checked); Table 8 at lines 738-749 (not re-opened).

**C56.** Copying the access path costs O(log n) space per update; node copying with spare slots costs O(1) amortised,
saving a logarithmic factor.
- Mark: proven (OCR text, words may be misspelt).
- Quote: "copying the entire access path ... requires O(1ogn) space and time in the worst case per insertion or deletion. Thus our method saves a logarithmic factor in space".
- Place: `R:papers/tree/versions-driscoll/alt.txt line 1446-1449` (not re-opened).

**C57.** The multiversion B-tree's version split copies only live entries into a fresh block, with slack such that at
least ε·d + 1 changes pass before the next structure change; an update touches at most 5·log_d m blocks.
- Mark: proven (theory; sections 1-3 read).
- Quote: "a version split, at least ε d + 1 insert operations or delete [operations]"; "Theorem 3 The number of block accesses and modifications for the (i+1)-th update operation is 5 x logd mi in the worst case".
- Place: `R:papers/tree/versions-becker/paper.txt line 173, 371-372` (checked; two-column interleave).

**C58.** Gray and Graefe size an index page from a ratio: benefit/cost = log2(entries per page) / (latency + page size
/ transfer rate); 16 KB scores best (0.78) in their 1997 figures; index height ≈ log2(N)/log2(entries per page).
- Mark: proven (read in full; a calculation, not a measurement).
- Quote: "IndexPageUtility = log2(EntriesPerPage)"; "IndexPageAccessCost = Disk Latency + PageSize / [DiskTransferRate]"; "16   541   9.1   11.6   0.78"; "Indexheight ~ log2(N)/log2(EntriesPerPage) pages".
- Place: `R:papers/tree/versions-grayGraefe/paper.txt line 288, 324, 361, 280` (checked).

**C59.** Transfer: a session is mostly overhead below a minimum amount of work, about the start cost divided by
(ln b − 1) for fan-out b (the collector's arithmetic on C58's law).
- Mark: hypothesis.
- Rests on: C58, C08.
- Assumption: a node's usefulness grows as the log of its fan-out for routing questions, and a visit costs a fixed start plus work in proportion; neither shown for sessions.

**C60.** LMDB runs one writer at a time with copy-on-write pages; readers never block and are never blocked; long-lived
readers stop freed pages from being reused.
- Mark: proven (documentation).
- Quote: "Writes are fully serialized; only one write transaction may be active at a time, which guarantees that writers can never deadlock ... writers cannot block readers, and readers don't block writers"; "Avoid long-lived transactions. Read transactions prevent reuse of pages freed by newer write transactions".
- Place: `R:papers/tree/s2-lmdb-doc/paper.txt line 74, 119` (checked).

**C61.** The LMDB paper reports 16 concurrent searches in about 12 s against 3 min 4 s for the older back end; the
table's row labels are garbled by extraction.
- Mark: proven with a flag (labels uncertain); not used to decide.
- Quote: "0m12.023s" against "3m04.464s".
- Place: `R:papers/tree/versions-lmdb/paper.txt line 346-352` (not re-opened).

**C62.** Redistribution to a neighbour before splitting (B*) guarantees at least 2/3 occupancy against 1/2 for the
plain B+ tree, at the cost of touching the neighbour.
- Mark: proven (survey, read in part).
- Quote: "B*-tree insertion employs a local redistribution scheme to delay splitting until 2 sibling nodes are full. Then the 2 nodes are divided into 3, each 2/3 full. This scheme guarantees that storage utilization is at least 66%".
- Place: `R:papers/tree/s2-comer-utah/paper.txt line 484-495` (checked).

**C63.** Expected occupancy under random insertion is ln 2 ≈ 69 % for B-trees (Yao) and about 81 % with B*
sharing.
- Mark: summary (second-hand through Safavi and Seybold 2023 and Comer; Yao 1978 not opened); not used to decide.
- Quote: "Yao's Fringe Analysis showed that inserting keys under a random order ... yields an expected asymptotic load-factor of ln(2), about 69%".
- Place: `R:papers/tree/versions-btreaps/paper.txt line 69-77`; `R:papers/tree/s2-comer-utah/paper.txt line 731-741` (not re-opened).

**C64.** Bayer and Schkolnick's lock coupling, known here only through Comer's account.
- Mark: summary; not used to decide.
- Place: `R:papers/tree/s2-comer-utah/paper.txt line 739-800` (not re-opened).

**C65.** Free-at-empty against merge-at-half: merge-at-half gives slightly higher utilisation but restructures much
more (Johnson and Shasha 1993).
- Mark: summary (search-result abstract; the paper is behind a bot check); not used to decide.
- Place: `R:t1-collect-versions.md:79, 117`.

**C66.** Transfer: handing work to a fresh session should move only the work still alive (unstarted keys), and the new
leaf needs enough slack that it is not at once full again.
- Mark: hypothesis.
- Rests on: C57, C06.
- Assumption: unstarted keys of a range can be moved by writing a file, with no session paused; ε·d's analogue (how many keys a fresh leaf absorbs before its next split) is set by measured work per key.

## E. Hierarchies of workers

**C67.** The "4.4 against 17.2" figure compares one orchestrator over three agents (depth 1) with three independent
agents; after controls error amplification is not a significant predictor.
- Mark: proven (read in part: sections 1-4, limitations, setup).
- Quote: Table 5 row "Error Amp 1.0 17.2 7.8 4.4 5.1"; "error amplification ... (β = 0.014, p = 0.658) ... nor its interaction with tool count ... reaches statistical significance".
- Place: `R:papers/tree/kim-scaling/paper.txt line 1153-1166, 976-980` (checked).

**C68.** Kim's turn law grows as 2.72·(n+0.5)^1.724 in agent count; per-agent capacity becomes thin beyond 3-4 agents
at a matched budget; success per 1,000 tokens 67.7 for one agent against 21.5 centralised.
- Mark: proven.
- Quote: "= 2.72 × (n + 0.5)^1.724, R² = 0.974" (symbols restored); "prohibitively thin beyond 3-4 agents"; Table 5 row "67.7 42.4 23.9 21.5 13.6".
- Place: `R:papers/tree/kim-scaling/paper.txt line 1175-1177, 1187, 1162` (checked).

**C69.** "-5.51 against -23.72" are drops under one faulty agent for "hierarchical" systems (a judge over two
debaters; four agents) against "linear" ones: depth 1, different systems, not a depth test.
- Mark: proven.
- Quote: "The flat structure shows a lower resilience (-10.54) than the hierarchical structure (-5.51), while the linear architecture demonstrates the lowest resilience (-23.72)"; "MAD ... two debaters and one judge"; "AgentVerse ... using four agents".
- Place: `R:papers/tree/huang-faulty/paper.txt line 293-303` (checked).

**C70.** Dremel: a two-level tree over 2,900 leaves was "off the chart" for one query because the root aggregates
near-sequentially; three levels (1:100:2900) ran it, and an extra level halved another query.
- Mark: proven (text only; times are in a figure not read).
- Quote: "At 2 levels, Q3 is off the chart, as the root server needs to aggregate near-sequentially the results received from thousands of nodes."
- Place: `R:papers/tree/dremel/paper.txt line 452-457` (checked at 455).

**C71.** Astrolabe: each member holds levels × branching summaries (8 × 5 = 40 at 390,625 members); 5 to 50 child zones
advised; dividing a leaf zone involves only that zone.
- Mark: proven (text; figures not read).
- Quote: "each member has to maintain and gossip only 8 × 5 = 40 MIBs"; "approximately between 5 to 50"; "it becomes necessary to divide the leaf zones into smaller zones. Note that this re-configuration only involves the machines in that leaf zone."
- Place: `R:papers/tree/astrolabe/paper.txt line 1588-1589, 1539, 1546-1550` (checked).

**C72.** TAG: aggregating inside the tree cut communication by an order of magnitude, but only for summaries smaller
than their inputs; for MEDIAN, and in a flat single-hop network, it is no better than sending everything to the root.
- Mark: proven.
- Quote: "TAG is no better than the centralized approach"; "in network aggregation can reduce communication costs by an order of magnitude over centralized approaches, and that, even in the worst case (such as with MEDIAN), it provides performance equal to the centralized approach."
- Place: `R:papers/tree/tag/paper.txt line 625, 631-635` (checked at 625).

**C73.** MacNet: at equal density wider (star) topologies beat deeper (tree) ones; average scores chain 0.6078, star
0.6267, tree 0.6015 (no confidence intervals in the text).
- Mark: proven (v1 only).
- Quote: "given the same density, 'wider' star-shaped topologies generally outperform 'deeper' tree-shaped ones".
- Place: `R:papers/tree/macnet/paper.txt line 357-359, 291-293` (not re-opened).

**C74.** Anthropic's research system: a lead with 3-5 parallel subagents, about 15 times the tokens of chat;
subagents store work externally and pass references up; near the context limit an agent spawns fresh subagents with a
hand-off.
- Mark: proven (vendor blog read in full; no method or public baseline); not used to decide alone.
- Quote: "multi-agent systems use about 15× more tokens than chats"; "pass lightweight references back to the coordinator"; "spawn fresh subagents with clean contexts while maintaining continuity through careful handoffs".
- Place: `R:papers/tree/anthropic-research/paper.txt line 60, 134, 132` (checked).

**C75.** OTP bounds restarts by intensity over a period (default 1 in 5 s), and a supervisor that exceeds it gives
up and its parent decides; the sustained rate is the ratio.
- Mark: proven (documentation).
- Quote: "If more than MaxR number of restarts occur in the last MaxT seconds, the supervisor terminates all the child processes and then itself."; "at most one restart per 6 seconds for any longer period of time".
- Place: `R:papers/tree/otp/sup.txt line 139-141, 153-155` (checked at 155).

**C76.** RAO measured recursive agents up to 10 levels deep: on TextCraft they used about 5 times fewer tokens than
one agent (196K against 1,029K) and were 1.8-2.5 times faster on medium and hard tasks with 83.9 % of delegations
concurrent; on DeepDive and Oolong they used 21-28 times more tokens, and were 18 times slower when 1.6 % of delegations
ran concurrently; the token saving comes from not re-reading a long history at each step.
- Mark: proven (read in part: results and token tables; tables flattened).
- Quote: "delegation (up to 10 levels deep)"; "the recursive agent is 1.8x and 2.5x faster on medium and hard tasks"; "only 1.6% of DEEPDIVE delegations were concurrent"; "single agent token usage scales quadratically with the number of steps in the trajectory, since each step needs to re-encode previous history tokens"; Table 9 "All Single ... 1029K / Recursive ... 196K"; Table 10 "All Single ... 15.1K / ... 324.8K".
- Place: `R:papers/tree/h2-rao/paper.txt line 129, 617-618, 646-652, 1216-1220, 1226-1262` (checked).

**C77.** Self-organising LLM teams of 4 to 64 agents formed at most two management layers (depth 1.0 to 2.0), with
quality not different between 64 and 256 agents.
- Mark: proven (read in part; simulated one-shot tasks).
- Quote: "hierarchy depth increased from 1.0 to 2.0"; "the system organizes into at most two management layers without external design".
- Place: `R:papers/tree/h2-selforg/paper.txt line 302-303, 368-370` (checked).

**C78.** Recursive delegation by prompted models fails in two ways: an agent that keeps an over-complex task (over-
commitment) and one that only passes its task down (undercommitment), stopped by a depth limit.
- Mark: proven (quote; scores not paired).
- Quote: "Overcommitment: The agent attempts to [complete an overly-complex task itself]"; "Undercommitment: The agent performs no [work and re-delegates the task it was given]".
- Place: `R:papers/tree/h2-redel/paper.txt line 344, 347` (checked at the line starts; two-column interleave).

**C79.** Transfer: for model-session trees the evidence favours width before depth: add an inner level only when one
parent cannot hold its children.
- Mark: hypothesis.
- Rests on: C67, C69, C70, C71, C73, C77, C72.
- Assumption: the sources' units (one-shot answers, steps of seconds, fixed teams of 2-9 or self-formed teams) show direction, not size, for sessions of minutes; only RAO and the self-organising study varied depth.

**C80.** Transfer: an inner level of sessions pays only when an inner session's output is much smaller than what it
reads (a bounded summary); a report the parent must read whole behaves like MEDIAN and gains nothing.
- Mark: hypothesis.
- Rests on: C72, C71, C74.
- Assumption: a parent's cost grows with the size of what children send up (C09: calls × window).

**C81.** Transfer: depth saves tokens when one session would otherwise re-read a long history at every step and the
work splits; it costs many times more when the work does not split; the time gain follows the share of children that
run at once.
- Mark: hypothesis.
- Rests on: C76, C09, C10.
- Assumption: our sessions re-read their window at every call (C09; v2 line 441-442 "every call re-reads its window"), which holds; RAO's agents are trained, with steps of seconds.

## F. The analyst's derived laws and choices

**C82.** Depth law: depth = ⌈log_b(N/C)⌉, with N the total work (tokens of research and packs over all keys), C what
one leaf holds (f·A_leaf or f·C_node) and b the children one parent can hold; an inner level is needed only when
N/C > b.
- Mark: hypothesis (the B-tree height law applied to sessions).
- Rests on: C58 (index height ≈ log N / log entries per page), C71 (levels = log_b of members), C79.
- Assumption: work per key is known well enough to sum (the R47 bulk load measures t_q per key first: v2 line 453).

**C83.** Fan-out law: b ≤ (W*_parent − P − S) / s_summary, the room in a parent's window above its prefix and reloaded
state, over the size of one child's summary.
- Mark: hypothesis.
- Rests on: C71 (a member holds levels × branching summaries), C10, C08; the cost prototype already counts root rows of about 200 tokens between P+S and W* (`R:t1-collect-ours.md:140`, citing `research-tree/tcb/cost.mjs:277, 401`, not re-opened).
- Assumption: a child's summary is bounded (C80); s_summary is not measured.

**C84.** Fill law: f = 1 / q_p(realised work / estimated work), so that a bulk-loaded leaf overflows with chance p;
0.75 is a chosen slack, not this.
- Mark: hypothesis (derived from the leaf-full rule "a leaf is full at Σt_q ≥ f·A_leaf or Σκ_q ≥ f·C_node", v2 line 454).
- Rests on: C02, C07, C63 (occupancy figures are for random insertion, not for estimate error).
- Assumption: the ratio realised/estimated has a stable distribution per class of question; it is what the pilot's predicted-against-realised log (R48(a), v2 line 459-460) records.

**C85.** Start-overhead law: start tokens per useful token = P / (occupancy × A_leaf). Occupancy after growth depends
on where a leaf splits (C109): a middle split under ordered growth leaves about 0.5 (C53), random arrival 1/2 to 2/3
(C100, self-reported); at 0.5 a growing job pays about f/0.5 times the start overhead of a bulk load per unit of work.
- Mark: hypothesis.
- Rests on: C08, C53, C84, C100, C109.
- Assumption: the start cost P is paid once per leaf whatever the leaf holds; occupancy is measured in tokens of work, not in keys.

**C86.** The split for sessions is a B-link half-split of the unstarted key range: the overflowing leaf's unstarted
keys above a separator go to a new leaf through the overflow record, which serves as the link; the separator is posted
to `tree-plan.json` afterwards; the research already done stays with the old leaf.
- Mark: hypothesis.
- Rests on: C19, C23, C24, C06, C05, C03 (R48(d) already names the overflow record and the separator).
- Assumption: a key's research can start in the new leaf without anything from the old leaf's window except what is in files (C16).

**C87.** No merge: a leaf that runs out of work ends and frees its slot (free at empty), as Lehman and Yao and
PostgreSQL do; InnoDB (below 50 %) and LMDB (below 25 %) do merge partly full pages, but a session's window cannot be
merged into another's (C06), so only unstarted keys could move.
- Mark: hypothesis.
- Rests on: C21, C34, C96, C98, C99, C65 (summary), C14 (FX-CLOSE releases a finished child's slot).
- Assumption: an under-full leaf costs only its start overhead (C85), not held capacity.

**C88.** No redistribution into a running session; a key may move only to a sibling that has not started, or at plan
time.
- Mark: hypothesis.
- Rests on: C62, C54, C16 (no child-to-child path), PROJECT CONTEXT (a session cannot be paused).
- Assumption: a running session cannot take keys into its window without a message and a wake.

**C89.** For a small job known up front the concurrency and buffering machinery adds nothing: with few writers the
schemes perform alike, and in a flat tree aggregation gains nothing.
- Mark: hypothesis.
- Rests on: C28 (single thread), C34 (one CPU, one disk), C72 (flat single hop), C17.
- Assumption: a small job is N/C ≤ b with overflow rare (C84) and no inserts during the run.

**C90.** The B-link form settles the record's split conflict (C12) in one reading: split the key range at plan time
(D2-01, D2-02); at overflow move only the unstarted remainder (D3-01); never split research in progress (D3-12).
- Mark: hypothesis.
- Rests on: C12, C86, C06, C11.
- Assumption: "remaining work" in D3-01 means unstarted keys.

**C91.** The decision rule acts only at the gate and stops running work only for memory; it puts ordered sequences
under one owner; it says units of minutes with 3 to 16 workers are not covered by its papers.
- Mark: observed.
- Quote: "**Act only at the gate:** hold new units back. Running work is stopped in one case only: memory at its floor"; "The 7 ordered sequences and 4 places where the same statements change: a conflict is certain, so one owner at a time, or split first into separate entries"; "Units that last minutes with 3 to 16 workers: one worker is 6 to 33 % of the level, so steps are coarse."
- Place: `docs/program/evidence/bottleneck-2026-11-18/DECISION-RULE.md:30-31, 125-127, 175` (checked). Also: tokens per unit "is a count over transcripts on disk and needs no run (b1-0111)" (`:150-151`, checked).

**C92.** Transfer to the rule: a split is a new unit admitted at the gate (no running session is stopped);
`tree-plan.json` and the task table are ordered shared files, so one writer at a time (the script under the run
lock); the parent's window is a resource the rule's width table does not yet list.
- Mark: hypothesis.
- Rests on: C91, C36, C60, C83.
- Assumption: the rule's widths apply per parent once there are inner levels.

**C93.** Left for r57-0505: whether siblings may read each other's findings (a B-link link here routes keys only), how a
correction reaches a running leaf that holds an old version, how stale a parent's summary may be, and the CAP choice
when a session is dead or unreachable.
- Mark: hypothesis (scope statement).
- Rests on: C16, C60 (snapshot readers), C71 (eventual consistency of summaries: "Given bounds on the size of information in a zone", `R:papers/tree/astrolabe/paper.txt line 175-176`, not re-opened), C23.

## G. Trees in engines people run (from `R:t1-collect-production.md`, added 2026-11-19)

Every figure from a company or an engine team is **self-reported**: from its own production, uncontrolled, not a
benchmark we can repeat. Documentation and source comments carry no figure.

**C94.** PostgreSQL's B-tree is a Lehman and Yao tree in production: a right-link and a high key on every page, so a
search holds no read lock beyond the one page it reads.
- Mark: proven (project documentation, read in part: lines 1-160, 232-380, 650-730).
- Quote: "Compared to a classic B-tree, L&Y adds a right-link pointer to each page, to the page's right sibling."; "searched without holding any read locks (except to keep a single page from being modified while reading it)".
- Place: `R:papers/tree/pg-nbtree/readme.txt line 17-18, 20-22` (not re-opened).

**C95.** PostgreSQL flags the left page of a split INCOMPLETE_SPLIT until the parent has its downlink; since 9.4 an
interrupted split is finished lazily at the next insertion or vacuum, because finishing it at recovery was "much more
complicated".
- Mark: proven (documentation).
- Quote: "when a page is split, the left page is flagged to indicate that the split is not yet complete (INCOMPLETE_SPLIT)"; "Before 9.4, we used to keep track of incomplete splits and page deletions during recovery and finish them immediately at end of recovery, instead of doing it lazily at the next insertion or vacuum. However, that made the recovery much more complicated".
- Place: `R:papers/tree/pg-nbtree/readme.txt line 666-675, 694-698` (checked).

**C96.** PostgreSQL deletes a page only when it is completely empty, never merges partly full pages, never deletes the
rightmost page of a level, so the tree's height never decreases (a "fast root" skips single-page levels).
- Mark: proven (documentation).
- Quote: "We consider deleting an entire page from the btree only when it's become completely empty of items. (Merging partly-full pages would allow better space reuse, but it seems impractical to move existing data items left or right"; "it's impossible for the height of the tree to decrease".
- Place: `R:papers/tree/pg-nbtree/readme.txt line 235-240, 365-367` (checked).

**C97.** PostgreSQL splits the root like any page and then builds a new root over the two halves; a search that read
the old root pointer still finds the moved data through the right-link.
- Mark: proven (documentation).
- Quote: "we split the root in the same way that any other page would be split, then construct a new root page holding pointers to both of the resulting pages"; "searches will find the data that's been moved into the right sibling even if they read the meta-data page before it got updated".
- Place: `R:papers/tree/pg-nbtree/readme.txt line 112-123` (not re-opened).

**C98.** InnoDB: pages filled in key order end about 15/16 full, in random order 1/2 to 15/16; a sorted index build
fills to a set fill factor; a page below 50 % (MERGE_THRESHOLD) is merged.
- Mark: proven (vendor manual).
- Quote: "If index records are inserted in a sequential order (ascending or descending), the resulting index pages are about 15/16 full. If records are inserted in a random order, the pages are from 1/2 to 15/16 full."; "If the fill factor of an InnoDB index page drops below the MERGE_THRESHOLD, which is 50% by default".
- Place: `R:papers/tree/innodb-doc/paper.txt line 288-293, 305-309` (checked); fill factor for sorted builds at 294-299 (not re-opened).

**C99.** LMDB's source splits a page at the new key on an append (the old page stays full) and in the middle
otherwise; a page under 25 % full is a merge candidate.
- Mark: proven (source code).
- Quote: `if (nflags & MDB_APPEND) { ... split_indx = newindx;`; `split_indx = (nkeys+1) / 2;`; "The minimum page fill factor, in tenths of a percent. Pages emptier than this are candidates for merging." `#define FILL_THRESHOLD 250`.
- Place: `R:papers/tree/lmdb-engine/mdb.c line 9895-9898, 9902, 1089-1092` (checked).

**C100.** Facebook measured its production B-tree pages at only 1/2 to 2/3 full; RocksDB used about 50 % less space
than compressed InnoDB and wrote 10 to 15 % of what InnoDB wrote, at 10 to 20 % more reads (self-reported).
- Mark: proven (CIDR 2017 paper, read in part); figures self-reported.
- Quote: "B-tree space utilization will be poor with its pages only 1/2 to 2/3 full (as measured in Facebook production databases)"; "about 50% lower"; "between 10% and 15% of what InnoDB writes out".
- Place: `R:papers/tree/rocksdb-cidr2017/paper.txt line 182-186, 346, 350` (checked); the reads figure at 341-352 (not re-opened).

**C101.** At Facebook 25 to 30 % of each InnoDB block was wasted and defragmentation lost to a continuous stream of
random writes; MyRocks cut instance size by 62.3 % (self-reported).
- Mark: proven (PVLDB 2020, read in part); figures self-reported.
- Quote: "approximately 25% to 30% of each InnoDB block space was wasted. We tried to mitigate the problem with B-tree defragmentation, but it was less effective on our workload than expected. In UDB, a continuous stream of mostly random writes would quickly fragment pages that were just defragmented."
- Place: `R:papers/tree/myrocks/paper.txt line 174-180` (checked at 176, 180); 62.3 % at 28-30 (not re-opened).

**C102.** The RocksDB team found leveled write amplification of 10-30 too high for write-heavy users and added tiered
compaction (4-10) at lower read performance; most of 42 deployments were bound by space; what bound them changed
over eight years (self-reported).
- Mark: proven (FAST 2021, read in part); figures self-reported.
- Quote: "in the 10-30 range is too high for write-heavy applications. For this reason we added Tiered Compaction, which brings write amplification down to the 4-10 range, although with lower read performance"; "Space efficiency is the bottleneck for most applications using SSDs."
- Place: `R:papers/tree/rocksdb-evolution/paper.txt line 266-272, 330-333, 772` (checked at 269).

**C103.** FoundationDB bounds every transaction to a 5-second MVCC window to bound memory and says long work can
usually be divided into smaller transactions (self-reported).
- Mark: proven (SIGMOD 2021, read in part); self-reported.
- Quote: "FDB chooses a 5-second MVCC window to limit the memory usage of the transaction system and storage servers"; "many can be divided into smaller transactions".
- Place: `R:papers/tree/fdb-sigmod/paper.txt line 710-722` (checked at 712, 722).

**C104.** Discord: one hot partition raised latency across the whole Cassandra cluster; the fix put request
coalescing and bounded per-partition concurrency in front of the store, together with a move from 177 Cassandra to 72
ScyllaDB nodes (p99 reads 40-125 ms to 15 ms); store and front service changed together, so not a controlled comparison
(self-reported; not a B-tree).
- Mark: proven (company blog read in full); self-reported.
- Quote: "When we encountered a hot partition, it frequently affected latency across our entire database cluster"; "If multiple users are requesting the same row at the same time, we'll only query the database once."
- Place: `R:papers/tree/discord-scylla/paper.txt line 101, 119, 135-136` (checked at 101).

**C105.** Uber (Postgres 9.2): every index entry points to a physical row location, so an update rewrites every index;
B-tree rebalancing moves sub-trees, and a replica bug corrupted indexes (self-reported, one company, one version).
- Mark: proven (company blog, Internet Archive copy); self-reported.
- Quote: "When a tuple location changes, all indexes must be updated"; "An essential aspect of B-trees are that they must be periodically rebalanced, and these rebalancing operations can completely change the structure of the tree as sub-trees are moved to new on-disk locations".
- Place: `R:papers/tree/uber-pg-mysql/paper.txt line 153, 179` (checked at 179; the collector cites 193).

**C106.** Pebble paces flushes and compactions by an estimate of compaction debt, the backlog in bytes, kept at a
constant level so background work does not spike foreground latency.
- Mark: proven (design note in the repository; no measurement).
- Quote: "Pebble uses an estimation of compaction debt, which is the number of bytes which need to be compacted before no further compactions are needed"; "we want to keep the compaction debt at a constant level".
- Place: `R:papers/tree/pebble-doc/paper.txt line 700-712` (checked at 712).

**C107.** WiredTiger (MongoDB) splits pages at a configured size limit and keeps per-entry update chains read by
timestamp.
- Mark: proven (documentation; low yield, not used to decide).
- Quote: "pages will split once their configured limit is reached, causing the B-Tree to expand".
- Place: `R:papers/tree/wiredtiger-doc/paper.txt line 16, 21` (not re-opened).

**C108.** Transfer: as in PostgreSQL, the second step of a split (the parent's link) is finished later by a named job;
for sessions that job is a script run under the run lock, not the next session that passes.
- Mark: hypothesis.
- Rests on: C95, C23, C36.
- Assumption: "the next visitor" is a session costing minutes and tokens, while the script costs seconds.

**C109.** Transfer: occupancy after growth is set by where a leaf splits: in the middle about 1/2 (C53), at the
arrival point near full (C98 15/16 in key order; C99 append split); a session split moves only unstarted keys, the
analogue of the append split, so the old leaf ends near full and the new one carries the slack.
- Mark: hypothesis.
- Rests on: C53, C98, C99, C100, C86.
- Assumption: new work arrives after the work already done in key order; random arrival (C100, 1/2 to 2/3) is the other case.

**C110.** Transfer: under a steady stream of new work, re-packing leaves (redistribution) does not hold, so a growing
tree should not plan periodic re-packing; a job known up front is built sorted (bulk load) instead.
- Mark: hypothesis.
- Rests on: C101, C88, C62.
- Assumption: Facebook's random-write stream stands for questions arriving while leaves run.

**C111.** Transfer: when many messages hit one leaf, merge identical requests at the parent's buffer and cap the
sessions per hot range before changing the tree's structure.
- Mark: hypothesis.
- Rests on: C104 (self-reported, uncontrolled), C50.
- Assumption: a "hot" research range shows up as repeated or overlapping questions; not observed in our files.

**C112.** Transfer: leaves and their records are named by a stable key (question-id range, leaf id), never by a
position, so a split or a move rewrites one pointer, not every reference.
- Mark: hypothesis.
- Rests on: C105, C86; our keys are already approved question ids (`docs/program/RESEARCH-TREE-PROTOCOL-v2-2026-11-16.md:444`, checked).
- Assumption: packs and citations refer to leaves by id (R17, R18), which holds for packs by hash.

**C113.** Transfer: pace the parent's fold-in of buffered messages by the backlog in tokens, kept level, rather than at
a fixed count; with C50's trigger (a fraction of what the receiver holds) this is the flush rule.
- Mark: hypothesis.
- Rests on: C106, C50.
- Assumption: the backlog can be counted in tokens from files before a wake.

**C114.** Transfer: a bounded window per unit with long work divided into smaller committed units (FoundationDB's 5
seconds) is the same rule as the hand-over law and R49: a unit that outgrows its window is split, not extended.
- Mark: hypothesis.
- Rests on: C103, C10, C11.
- Assumption: a session's context window plays the part of the MVCC window (memory bound).

**C115.** Transfer: the form (and the merge style) must follow what binds, and what binds changed over the years at
RocksDB; for us it is tokens (C09), so each part is chosen by tokens per message and per read, measured.
- Mark: hypothesis.
- Rests on: C102, C09.
- Assumption: tokens stay the binding resource; the decision rule's widths say when another binds.

## Counts by mark

| Mark | Claims | Count | of which from the production file |
|---|---|---|---|
| observed | C01-C18, C91 | 19 | 0 |
| proven | C19-C34, C37-C49, C52-C58, C60-C62, C67-C78, C94-C107 | 65 | 14 (C94-C107; C100-C105 self-reported) |
| hypothesis | C35, C36, C50, C51, C59, C66, C79-C90, C92, C93, C108-C115 | 28 | 8 (C108-C115) |
| summary | C63, C64, C65 (and C49's cost bound) | 3 | 0 |
| measured here | none | 0 | 0 |

Total 115 claims, 22 of them from the production file. C49 is counted once, under proven (mechanism); C61 is proven
with a flag (labels uncertain); C25 is counted under proven, its correction goes to the fold.

## Files read beyond the brief's list

- `R:t1-state.md`; `R:t1-brief-1-collect.md` lines 1-40 (the PROJECT CONTEXT block).
- `docs/program/RESEARCH-TREE-PROTOCOL-2026-11-16.md` lines 15-23, 268-292.
- `docs/program/RESEARCH-TREE-PROTOCOL-v2-2026-11-16.md` lines 18-24, 38-50, 170-185, 220-227, 438-475, 494-502.
- `research-tree/DESIGN-RECORD.md` lines 18, 38, 69, 125-127, 162.
- `research-tree/SELECTIONS-MAP.md` lines 29-30, 160-161.
- `research-tree/ATTACK-AND-COST-RECORD.md` lines 33, 37, 93, 104, 140.
- `research-tree/START-HERE.md` (grep; line 17); `research-tree/FAULTS-AND-FIXES.md` lines 34-42 and 49-53; `research-tree/BUILD-SIZE.md` lines 21-55.
- `research-tree/tcb/thresholds.json` (grep of eleven keys); `research-tree/tcb/commit.mjs` lines 752-763; `ls research-tree/tcb/plan-tree.mjs`; grep of `fill_factor` over `research-tree/tcb/*.mjs`.
- `docs/program/evidence/bottleneck-2026-11-18/DECISION-RULE.md` lines 24-45, 61-80, 122-155, 169-179.
- `docs/program/TOKEN-BOTTLENECK-2026-11.md` lines 1-30.
- `library/journal/2026-11-18/x03.jsonl` line 47 (record x03-0335, by grep).
- `R:t1-collect-production.md` (the sixth collect file, read in full on the coordinator's message of 2026-11-19);
  `R:lane-tree.md` lines 55-72 (sub-topic 6, added 2026-11-19).
- Production texts, by line or grep only: pg-nbtree/readme.txt, innodb-doc, rocksdb-cidr2017, myrocks,
  rocksdb-evolution, fdb-sigmod, discord-scylla, uber-pg-mysql, lmdb-engine/mdb.c, pebble-doc.
- Paper texts, by line or grep only: lehmanyao, bwtree2013, wang2018, olc2019, ariesim, srinivasan-carey, graefe2010, writes-arge-buffertree, writes-bender-login, writes-betrfs, writes-oneil-lsm, writes-luo-carey, writes-dostoevsky, s2-rosenblum, versions-rodeh, versions-becker, versions-grayGraefe, s2-comer-utah, s2-lmdb-doc, kim-scaling, huang-faulty, dremel, astrolabe, tag, anthropic-research, otp, h2-rao, h2-selforg, h2-redel.

## Claim verdicts

Added 2026-11-19 by the fold (step 4) from `R:t1-gate.md` and `R:t1-refute.md`. Rule, in this order: refuter REFUTED
gives refuted; refuter PARTIALLY gives holds in part (use the refuter's corrected claim in `R:t1-refute.md`); refuter
UNVERIFIABLE, or gate NOT_CHECKABLE with refuter CONFIRMED, gives cannot be checked; gate LOCATED with refuter CONFIRMED
gives confirmed. Counts: confirmed 65, holds in part 42, refuted 5, cannot be checked 3. A claim not confirmed is never
called supported. Lines are those of the cited file; "re-opened" means the fold read the place itself.

| id | verdict | reason |
|---|---|---|
| C01 | confirmed | v1:15 and DESIGN-RECORD:162 as quoted; the seven leaves are an expectation |
| C02 | confirmed | v2:440-441 and thresholds.json:43 as quoted; no plan-tree.mjs, no script reads fill_factor |
| C03 | confirmed | DESIGN-RECORD:18; v2:461-463 |
| C04 | confirmed | v1:276, v2:461-463, DESIGN-RECORD:69 as quoted; no owner ruling on the split in RULINGS.md or the library; result.json 1034-1035 (re-opened) rejects a split leaf in the pilot, by the design step's ruling, not the owner |
| C05 | confirmed | v2:172-173, 465-466 |
| C06 | confirmed | SELECTIONS-MAP:30 |
| C07 | confirmed | commit.mjs:761 gives 165,000; the record gives 180.0k; four of the five inputs are guesses |
| C08 | holds in part | 79,000 is the median first call of main sessions in other repositories; child P 60,000 is a guess from about 60k per agent; S0 is a guess; the 767,000 tokens in four minutes is one trial (re-opened) |
| C09 | confirmed | TOKEN-BOTTLENECK:12, 14, 18 |
| C10 | confirmed | v2:473; thresholds.json:23, computed from estimated inputs |
| C11 | holds in part | R49 is later, only under option (b) of the research child's window; R47's plan-time split is a separate rule (re-opened) |
| C12 | confirmed | FAULTS-AND-FIXES:37-40; SELECTIONS-MAP:154, 162 |
| C13 | confirmed | admit.mjs `decide` reads no parent, level or tree-plan field (grep re-run by the fold on the primary file) |
| C14 | confirmed | BUILD-SIZE:44-52 and FAULTS-AND-FIXES:49 as quoted (re-opened) |
| C15 | confirmed | START-HERE:17 |
| C16 | confirmed | v1:20, 23; b1-0121 |
| C17 | confirmed | v2:498-500 |
| C18 | holds in part | a note serves only as a wake (R30); at a wake the coordinator acts on every ledger event since its last acknowledged seq (R6); "per commit" is not in the source (re-opened) |
| C19 | confirmed | lehmanyao 162-164 |
| C20 | confirmed | lehmanyao 233, 359 |
| C21 | confirmed | lehmanyao 478, 482 |
| C22 | confirmed | lehmanyao 466, 487; no measured figure |
| C23 | confirmed | graefe2010 110, 115 |
| C24 | confirmed | bwtree2013 70, 246-247 |
| C25 | holds in part | add Table I's failed consolidates 1.19 %, 0.22 %, 7.35 %; x03-0335 gives the text's 1.25 % as Table I's figure (re-opened) |
| C26 | confirmed | bwtree2013 357; the designers' own benchmark, 8 worker threads |
| C27 | holds in part | help-along is how the Bw-tree eases starvation from failed CaS, not its defect; the 1.5-4.5× is against a B+ tree and ART with OLC and Masstree (re-opened) |
| C28 | confirmed | olc2019 308, 346, 347 |
| C29 | confirmed | olc2019 29 |
| C30 | confirmed | olc2019 244 |
| C31 | confirmed | ariesim 267, 603, 612 |
| C32 | confirmed | ariesim 493, 513 |
| C33 | confirmed | s2-mohan-kvl 470-476 |
| C34 | holds in part | "barely differ with one CPU and one disk" fails under extreme contention: 1 CPU, 1 disk, tree in memory, heavy appends, where a pessimistic algorithm won (srinivasan-carey 843, re-opened) |
| C35 | holds in part | the B-link form fits because its first step is local and the post may wait; "a session is a slower node" is not the reason |
| C36 | holds in part | the ground is cost only; "no progress guarantee" misreads wang2018; "no model call" holds only if a script or the watcher's tick posts |
| C37 | confirmed | arge 304-306, 492-494; for batched (off-line) problems |
| C38 | confirmed | arge 439-441 |
| C39 | confirmed | bender-login 64-75 |
| C40 | confirmed | bender-login 81 |
| C41 | confirmed | bender-login 55 |
| C42 | holds in part | the gain is items per flush over the depth (2 × 100/14 = 14.3), not over twice the depth (re-opened) |
| C43 | confirmed | betrfs 306 |
| C44 | holds in part | "nearly two orders of magnitude" only where the index is as hot as a B-tree; equal ratios are Theorem 3.1's approximation |
| C45 | holds in part | tiering costs range queries and space more than point lookups (Bloom filters) |
| C46 | holds in part | lazy leveling keeps only a competitive bound on short range lookups (re-opened) |
| C47 | confirmed | brodal-fagerberg 126-140 |
| C48 | confirmed | rosenblum 316-323, 340-362 |
| C49 | confirmed | buchsbaum 31-39, for the mechanism; the cost bound stays a summary |
| C50 | holds in part | batching divides only the fixed part of a wake and only where the wake can wait; the trigger weighs wake cost against the cost of delay |
| C51 | refuted | every parent call re-reads its window, so reads dominate, the end of Dostoevsky's curve where leveling is best; a session tree of three levels has neither lazy leveling's levels nor its Bloom filters (re-opened) |
| C52 | confirmed | rodeh 330-332, worst case |
| C53 | holds in part | the 50 % is Rodeh's top-down tree with middle splits; engines that split at the arrival point keep sequential pages near full (re-opened) |
| C54 | confirmed | rodeh 538-543 |
| C55 | confirmed | rodeh 584-588; Table 8 |
| C56 | holds in part | O(1) amortised holds for structures whose updates change O(1) nodes amortised (red-black trees with lazy recoloring) |
| C57 | confirmed | becker 162-182, 371-372 |
| C58 | confirmed | grayGraefe 280, 288, 324, 361 |
| C59 | refuted | start/(ln b − 1) is the work per visit at the optimum of log-utility over cost, where the start is (ln b − 1)/ln b of the cost (84 % at 16 KB pages), not an overhead floor; neither premise holds for sessions (re-opened) |
| C60 | confirmed | s2-lmdb-doc 74, 119 |
| C61 | confirmed | versions-lmdb 344-352, read with labels shifted; the engine author's own test; not used to decide |
| C62 | confirmed | comer-utah 484-495 |
| C63 | confirmed | btreaps 72-75, comer-utah 735-738; second-hand, not used to decide |
| C64 | cannot be checked | a second-hand account with no quote; the refuter found Comer's account at comer-utah 739-750 |
| C65 | cannot be checked | the paper is behind a bot check; settle by Johnson and Shasha 1993's utilisation by delete share |
| C66 | holds in part | the new leaf's load sits in a band (MVBT); a hand-over carries the reloaded state S, not only unstarted keys |
| C67 | confirmed | kim 974-980, 1153-1162 (re-opened) |
| C68 | confirmed | kim 1162, 1175-1177, 1187; at about 4,800 reasoning tokens per trial |
| C69 | confirmed | huang 293-303 (re-opened) |
| C70 | holds in part | the fourth level halved Q3, a many-group aggregation; Q2 gained little (re-opened) |
| C71 | confirmed | astrolabe 1536-1550, 1588-1589 |
| C72 | confirmed | tag 622-625, 631-635 |
| C73 | confirmed | macnet 291-293, 357-366 |
| C74 | holds in part | self-reported: a company's account with no method or public baseline |
| C75 | confirmed | otp 139-141, 153-155 |
| C76 | holds in part | the token tables cover tasks both methods solved; Oolong's 21× buys a different, more accurate strategy; KV caching eases the single agent's cost (re-opened) |
| C77 | confirmed | h2-selforg 298-303, 366-370; simulated tasks |
| C78 | confirmed | h2-redel 340-347 |
| C79 | holds in part | MacNet and Huang also compare deeper and wider topologies; the direction stands as a hypothesis |
| C80 | holds in part | files a parent reads directly are TAG's flat single-hop case; an inner check may pay in quality, untested |
| C81 | holds in part | the saving is in cache reads; Oolong is not the re-read case |
| C82 | holds in part | depth is ⌈log_b L⌉ with L the packer's leaves; L > b means an inner level or more coordinator epochs, priced in tokens (re-opened) |
| C83 | holds in part | W* − P − S = g·k* is the parent's own growth per epoch, so b ≤ (g·k* − own growth)/s_summary; cost.mjs counts the room twice (re-opened) |
| C84 | holds in part | f = 1/q_{1−p}(R), R taken over the leaf because keys share context; one f per capacity |
| C85 | holds in part | the arithmetic holds; 1/2 to 2/3 is Facebook's fragmentation under updates, not random arrival; the overhead falls on the new leaf |
| C86 | holds in part | a separator routes only where the unstarted keys form one range; otherwise the moved set is a list of ids |
| C87 | holds in part | an under-full leaf also costs two wakes of the parent, a slot and a memory peak |
| C88 | holds in part | moving keys into a running session costs a message and a wake: a cost, not an impossibility |
| C89 | holds in part | the schemes are alike when one resource binds, not "with few writers"; "buffering adds nothing" does not follow |
| C90 | refuted | the rules still disagree after the B-link reading (D3-12 against D3-01 and D2-02); the B-link form gives a split's mechanism, not the choice between split and hand-over; the conflict stays open (re-opened) |
| C91 | confirmed | DECISION-RULE 30-31, 125-127, 150-151, 175 |
| C92 | holds in part | the overflow comes from the budget cut, which stops running work; the decision rule allows that for memory only (re-opened) |
| C93 | cannot be checked | a scope statement with no quote; consistent with r57-0505 and r57-0512 |
| C94 | confirmed | pg-nbtree 17-22 |
| C95 | holds in part | PostgreSQL normally finishes a split at once, holding the child's lock; only after a failure does a later writer finish it (re-opened) |
| C96 | confirmed | pg-nbtree 235-240, 365-367 |
| C97 | confirmed | pg-nbtree 112-123 |
| C98 | confirmed | innodb-doc 286-299, 305-309 |
| C99 | holds in part | LMDB also biases a middle split so the new page is emptier when the new item goes on the last spot (re-opened) |
| C100 | confirmed | rocksdb-cidr2017 182-186, 341-350; self-reported |
| C101 | confirmed | myrocks 28-29, 174-180; self-reported |
| C102 | confirmed | rocksdb-evolution 264-272, 330-333, 772; self-reported |
| C103 | holds in part | "many can be divided", not "usually"; self-reported (re-opened) |
| C104 | confirmed | discord-scylla 101-136; self-reported, uncontrolled |
| C105 | holds in part | "when a tuple location changes" is the condition; Uber's rebalancing statement does not match PostgreSQL's B-tree |
| C106 | holds in part | flushes are paced by the bytes still to flush, compactions by compaction debt; no measurement (re-opened) |
| C107 | confirmed | wiredtiger-doc 16, 21; not used to decide |
| C108 | refuted | PostgreSQL posts the downlink at once while holding the child; after a failure the next writer that meets the flag finishes it; there is no named job (re-opened) |
| C109 | holds in part | a session split has no later arrivals, so the new leaf stays as empty as the remainder is small; the full-page analogue is a sibling with room or the next wave |
| C110 | holds in part | Facebook found defragmentation less effective on one workload; no stream of new questions exists during a run today |
| C111 | holds in part | each range already has one session; a hot leaf is one woken by many messages; none observed |
| C112 | holds in part | records name the question id and find the leaf through one map; a leaf id is a location |
| C113 | holds in part | count the backlog in tokens; a wake has a fixed cost that Pebble's rate control does not model |
| C114 | refuted | the record's rule at the window is a hand-over (R50), a split only under R49; FoundationDB's window is a reason to keep units short, not evidence for split over hand-over (re-opened) |
| C115 | holds in part | choose each part against measured tokens with memory as the hard limit; C09 shows where tokens go, not that they bind ahead of memory |
