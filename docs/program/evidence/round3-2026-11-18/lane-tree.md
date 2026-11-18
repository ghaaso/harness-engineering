# Lane tree (`t1`): which kind of B-tree fits a tree whose nodes are sessions

Read `ROUND.md` beside this file first. It sets the standards, the method and the limits.

## Why this lane

The owner asked whether the kind of B-tree was ever chosen for our case. It was not. What the record holds, as the
top session read it on 2026-11-18 from the summary lines (verify it; this is your sub-topic 1):

- The tree today is a plain two-level hierarchy: one coordinator and about seven leaves; "no inner level is ever
  needed for 7-10 fields" (`research-tree/DESIGN-RECORD.md` line 162).
- From the B+ tree it takes only how questions are packed into leaves before work starts, at a fill factor of
  about 0.75 (`research-tree/SELECTIONS-MAP.md` lines 29 and 160, selection D2-01).
- A split with a separator, redistribution and a plan-tree bulk load were "moved to later"
  (`research-tree/DESIGN-RECORD.md` line 18). Sibling links and copy-on-write are listed as options under D2-02
  (`research-tree/SELECTIONS-MAP.md` line 30).
- An attack round judged that the plain hierarchy earns its place and the B+ analogy does not
  (`research-tree/ATTACK-AND-COST-RECORD.md` line 37); the owner then rejected the removal of the split.

The harness is to serve small projects and very large ones (r57-0028). A tree that never grows a level and never
splits while work runs fits only the small case.

## The frame to test (the top session's reasoning, not a finding)

A node here is a session: slow, costly, with a bounded window, and it cannot be paused for minutes while a parent
is rearranged. Each variant buys something different:

| Variant | What it would buy |
|---|---|
| Bulk-loaded B+ tree | The best packing when all work is known before it starts (what we have) |
| B-link tree (Lehman and Yao) | A node splits without stopping its parent: it leaves a pointer to its new sibling |
| Buffered tree (buffer tree, B-epsilon tree) | Messages collect at inner nodes and go down in batches: fewer sessions woken |
| Copy-on-write tree | Every reader sees one consistent version; fits an append-only store; one writer at the root |
| Delta tree (Bw-tree), log-structured merge | Writers append small changes; one process folds them in later |

Real engines combine these. The lane says which combination fits, by what measurable feature of the work.

## Sub-topics, one collector each

1. **Our tree as recorded and as coded.** `ours` (kind `read`, no web): the four files named above, the protocol
   (`docs/program/RESEARCH-TREE-PROTOCOL-v2-2026-11-16.md`, the parts on shape, capacity, split and overflow),
   records b1-0101 to b1-0126, and the admission and watcher scripts under `research-tree/tcb/`. What a node is,
   what flows down and up, what "full" means, what a split would cost in tokens, what is decided, what is "later".
2. **B-trees under concurrent change.** `concurrent`: lock coupling (Bayer and Schkolnick 1977), the B-link tree
   (Lehman and Yao 1981, held as quotes; Lanin and Shasha 1986; Sagiv 1986), ARIES index management (Mohan and
   Levine 1992), optimistic lock coupling (Leis and others), Graefe's surveys of B-tree locking and of modern
   B-tree techniques. How a split, a merge and a root change happen while others work, and the measured gains.
3. **Trees built for many writes.** `writes`: the buffer tree (Arge), the B-epsilon tree (Brodal and Fagerberg
   2003; Bender and others 2015), log-structured merge trees (O'Neil and others 1996; a recent survey). The
   trade between the cost of a write, the cost of a read and the size of a batch.
4. **Versions, bulk loading and node size.** `versions`: copy-on-write B-trees (Rodeh 2008; LMDB), persistent
   data structures (Driscoll and others 1989); bulk loading and fill factor, occupancy under growth (Yao 1978,
   held), redistribution before a split; how fan-out and depth are chosen from the cost of visiting a node.
5. **Hierarchies of workers.** `hierarchy`: supervision trees (Erlang/OTP), trees that aggregate up and spread
   down in distributed systems (Astrolabe, TAG), what is measured on hierarchies of language-model agents
   against flat teams and chains (find the source of the figures 4.4 against 17.2 and -5.51 against -23.72
   quoted at `research-tree/ATTACK-AND-COST-RECORD.md` line 37 and read it in full).

Search words for the library: `B+ tree`, `B-link`, `Lehman`, `Bw-tree`, `bulk`, `fill factor`, `split`,
`hand-over law`, `fan-out`, `hierarchy`, `LSM`, `copy-on-write`.

## What the report must settle

- A map from each tree operation to what it means for sessions: a search (routing a question), an insert (new
  work), a split (handing half a range to a new session), a merge, a rebalance, a root change, a buffer flush;
  with the cost of each in tokens and time as far as the record gives it, and "not measured" where it does not.
- Which variant, or which combination, for three cases: a small job known up front; a job that grows while it
  runs; a very large project that needs inner levels. The choice stated by measurable features of the work (how
  often a leaf overflows, how many messages go down against up, how many nodes change at once).
- What the choice changes in the tree's design and in the 13 fixes, without designing the change in detail.
- What is left for the later task on parallelism inside the tree (r57-0505: knowledge transfer between nodes,
  the CAP theorem); do not start that task.
