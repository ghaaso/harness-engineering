# t1 report (final, step 4): which kind of B-tree fits a tree whose nodes are sessions

`R:` = `docs/program/evidence/round3-2026-11-18/`. Folded on 2026-11-19 by the analyst (kind analyse, Opus) from the draft
of step 2, the gate (`R:t1-gate.md`) and the refuter (`R:t1-refute.md`). Every statement cites claims in `R:t1-claims.md`
(C01 to C115); their verdicts are at the end of that file. Marks: proven in the literature (P), observed in our files (O),
hypothesis (H). Nothing was measured here. Figures from a company or an engine team are self-reported.

## The answer

1. No one kind fits every size. Three measurable features choose: leaves the packer makes (L) against children one
   parent holds per epoch (b); realised over estimated work per leaf (R) against 1/f; new keys arriving during a run.
2. Small job known up front (L ≤ b, R rarely above 1/f, no new keys): the bulk-loaded two-level tree we have, with f
   computed from R; nothing splits, merges or latches while work runs (H on P).
3. Growing job (new keys, or R above 1/f): add a split in the B-link form for unstarted keys only, its index posted by
   one script step under the run lock; a small remainder goes to an unstarted sibling or the next wave; no merge (H on P).
4. Very large project (L > b): more coordinator epochs or an inner level, whichever costs fewer tokens; a level only
   where its summary is much smaller than its inputs and its children run at once; then depth ⌈log_b L⌉ (H on P).
5. Still open: the record's split-or-hand-over conflict (C90 refuted). Largest expected gain, unmeasured: fewer parent
   wakes (O: C09), set by a parent's tokens per wake, split into the fixed re-read and what each child adds.

## Counts by verdict

| Verdict | Count | Claims |
|---|---|---|
| confirmed | 65 | C01-C07, C09, C10, C12-C17, C19-C24, C26, C28-C33, C37-C41, C43, C47-C49, C52, C54, C55, C57, C58, C60-C63, C67-C69, C71-C73, C75, C77, C78, C91, C94, C96-C98, C100-C102, C104, C107 |
| holds in part | 42 | C08, C11, C18, C25, C27, C34-C36, C42, C44-C46, C50, C53, C56, C66, C70, C74, C76, C79-C89, C92, C95, C99, C103, C105, C106, C109-C113, C115 |
| refuted | 5 | C51, C59, C90, C108, C114 |
| cannot be checked | 3 | C64, C65, C93 |

The fold rule, in this order: refuter REFUTED gives refuted; refuter PARTIALLY gives holds in part (the refuter's
corrected claim is used); refuter UNVERIFIABLE, or gate NOT_CHECKABLE with refuter CONFIRMED, gives cannot be checked;
gate LOCATED with refuter CONFIRMED gives confirmed. The gate found no claim MOVED, ALTERED or DEAD_CITATION. Of the 85
claims the gate located, 65 were confirmed and 20 hold in part; of the 30 it could not check (no quote: hypotheses, a
summary, a scope statement), 22 hold in part, 5 are refuted and 3 cannot be checked. Of the 65 confirmed, C63 (second-
hand), C61 (garbled labels) and C107 (low yield) decide nothing. A claim not confirmed is not called supported.

Refuted, and dropped from the conclusions: C51 (merge summaries once at the top, lazy leveling); C59 (a minimum work per
session from Gray and Graefe's page law); C90 (the B-link form settles the record's split conflict); C108 (PostgreSQL
finishes a split later by a named job); C114 (FoundationDB's window means a unit that outgrows its window is split).
Each reason is in the claim verdicts and in the lane's status record.

## The table

| Conclusion | From (claims) | Measured gain and its conditions | What the refuter left | Still a guess for sessions | What it changes in our rule or tree |
|---|---|---|---|---|---|
| Small job: two levels, bulk-loaded, nothing structural while work runs | C01, C02, C17, C28, C34, C72, C89 | Single-threaded, lock schemes "very similar" (B+ tree, 100M keys, C28); one CPU and one disk, throughput barely above one user (simulation, C34); flat single hop, in-tree aggregation no better (sensor network, C72) | C89 in part: the schemes are alike when one resource binds, not "with few writers"; the tree fits that case because admission caps live children at three. Its "buffering adds nothing" is dropped. C34 in part: not under extreme contention (1 CPU, 1 disk, tree in memory, heavy appends, where pessimistic won) | That the leaves fit one parent's epoch (s_summary not measured) | None in the rule. "Height, search, latches and merges add nothing" (C17) holds for this case |
| f computed: f = 1/q_{1−p}(R), R the leaf's realised over estimated work, one f per capacity | C84, C02, C07, C62, C98, C100 | Occupancy, not gain: B+ 1/2 and B* 2/3 guaranteed (C62); InnoDB 15/16 in key order, 1/2 to 15/16 random (C98); Facebook production 1/2 to 2/3 (self-reported, C100) | C84 in part: the quantile is q_{1−p}; R is taken over the leaf, since a field's keys share context and their errors move together; A_leaf and C_node each need their own f | The spread of R per class of question | `fill_factor` 0.75 (read by no script, C02) becomes a computed value in R47 |
| Fewer, fuller leaves at plan time; a running leaf that runs out ends and frees its slot; no merge | C21, C34, C87, C96, C98, C99 | None measured. PostgreSQL never merges partly full pages (C96); InnoDB merges below 50 %, LMDB below 25 % (C98, C99) | C87 in part: an under-full leaf costs more than its start: its admission and its end note each wake the parent, and it holds a slot and a memory peak | none | FX-CLOSE's slot release is this operation |
| Split in the B-link form for unstarted keys: new leaf first, the overflow record as its link, the index posted after | C19-C24, C86, C94, C95, C05, C06, C03, C35 | No figure for the half-split. B-link best in a simulation (no ratio in the text) except the extreme case above (C34); in production in PostgreSQL (no figure, C94, C95) | C86 in part: a separator routes only where the unstarted keys form one range (keys worked in key order); otherwise the moved set is a list of ids, as the overflow record already is. C35 in part: it fits because the first step is local and the post may wait, not because a session is slow. C95 in part: PostgreSQL normally posts at once | That a new leaf can start from files alone (keys share context: SELECTIONS-MAP D2-01); whether fields work in key order | R48(d) takes the B-link form; replaces "cut and list" only for growing jobs |
| A small remainder goes to an unstarted sibling with room or to the next wave, not to a new leaf | C109, C85, C88, C53, C99 | Append splits keep pages full because later keys keep arriving at the right edge (C53, C99) | C109 in part, corrected to this row: a session split has no later arrivals, so a new leaf stays as empty as the remainder is small and pays a full start. C85: the arithmetic holds (occupancy 0.5 against f = 0.75 is 1.5 times the start overhead per unit of work) | The ratio of remainder to start cost at which a new leaf pays | D2-02's "redistribute to a sibling with slack, else defer" becomes the default |
| The split's second step is one short serialised script step under the run lock | C31, C32, C36, C24, C26, C27 | ARIES/IM: latch "very small", no number (C31). Help-along: Bw-tree 18.7× BerkeleyDB (8 threads, the designers' benchmark, C26), but 1.5-4.5× slower than lock-based indexes when rebuilt (20 threads, C27) | C36 in part: the ground for keeping sessions out of it is cost only (minutes and a window re-read for seconds of file work); "no model call" holds only if a script or the watcher's tick posts. C108 refuted: PostgreSQL does not use a named job; this is a choice for sessions | That posting takes seconds; how often splits contend for the run lock | `tree-plan.json` and the task table get one writer (C91, C92) |
| No re-packing into running sessions unless priced | C62, C88, C101, C110 | B* raises the floor from 1/2 to 2/3 (analytic, C62). Facebook: defragmentation "less effective on our workload than expected" under random writes (self-reported, C101) | C88 in part: moving keys into a running session costs a message and a wake of the receiver: a cost, not an impossibility. C110 in part: no stream of new questions exists during a run today (keys frozen, R46) | The price of a wake against a new leaf's start | R48(c) priced against P + S0 |
| Fewer parent wakes (the buffer flush) | C09, C18, C37-C42, C48, C50, C113 | B-epsilon: inserts 16× faster for about twice the point-query cost (B = 1024, ε = 1/2, an argument, C39); BetrFS worked model 14.3× (1 TB, 1 MB nodes, C42); LFS an order of magnitude on small writes (C48) | C50 in part: batching divides only the fixed part of a wake (the re-read window) and only where the wake can wait; at each wake the coordinator already reads every ledger event since its last acknowledged seq (C18 in part); a held-back correction lets a leaf spend on stale work, so the trigger weighs wake cost against delay. C113 in part: count the backlog in tokens. C42 in part: the gain is items per flush over the depth | That a wake's cost is mostly its fixed re-read; which wakes can wait | A wake policy in the watcher; the rule gains the parent's window as a resource (C92) |
| More epochs or an inner level; depth ⌈log_b L⌉ when levels win; width before depth | C82, C83, C58, C70, C71, C73, C77, C79 | Dremel: two levels "off the chart" for Q3 at 1:2900, three ran it, a fourth halved Q3 (text, C70); Astrolabe 8 × 5 = 40 summaries at 390,625 members (simulation, C71); MacNet star 0.6267 against tree 0.6015 (no CIs, C73); self-formed depth at most 2 up to 64 agents (C77) | C82 in part: L (leaves the packer makes), not N/C; b is not a hard capacity, since a coordinator hands over and admits in waves, so L > b means choosing between an inner level and more epochs. C83 in part: b ≤ (g·k* − own growth per epoch)/s_summary; `cost.mjs` counts that room twice. C79 in part: MacNet and Huang also compare deeper and wider. C70 in part: the extra level paid for a many-group aggregation | s_summary; how g splits between own work and children | "Three levels, never more" (C01) holds while L ≤ b or epochs win; a parent field in the task rows (C13) only when a level is added |
| An inner level only when its summary is much smaller than its inputs and its children run at once | C72, C71, C80, C76, C81 | TAG: an order of magnitude less traffic for distributive aggregates, none for MEDIAN (C72). RAO: 196K against 1,029K tokens and 1.8-2.5× faster with 83.9 % of delegations concurrent; 18× slower with 1.6 % concurrent (trained agents, C76) | C80 in part: files a parent reads directly are TAG's flat single-hop case; an inner level that checks reports may pay in errors (untested). C76, C81 in part: token tables cover tasks both methods solved; the saving is mostly cache reads (1,021K of 1,029K); Oolong is a different strategy | How much an inner session compresses; the share of children running at once | A level is added only after both are measured |
| Merge policy by read share: each inner node keeps one bounded summary per child, rewritten per report | C45, C46, C102 | Lazy leveling O((L+T)/B) against O(T·L/B) (complexity, C46); the best fixed policy moves to leveling as lookups grow (C46); RocksDB tiered 4-10 against leveled 10-30 write amplification (self-reported, C102) | C51 refuted: "merge once at the top" is dropped; every parent call re-reads its window, so reads dominate, the end where leveling is best. C45, C46 in part, with their conditions | That rewriting a summary is the analogue of a merge; the read share | Replaces the draft's "merge once at the top" |
| Copy-on-write records, one writer per shared file, readers on snapshots, keys named by question id through one map | C16, C52, C54, C60, C105, C112 | Shadowing rewrites up to 2 × depth pages (C52); LMDB: one writer, readers never block, long readers pin pages (C60); Rodeh's root serialisation point harmless while cached (C54) | C112 in part: a leaf id is a location, not a stable name; a split rewrites one map entry. C105 in part: Uber's statement on rebalancing is Uber's own and does not match PostgreSQL's B-tree (self-reported) | That long readers pin old versions as runs grow | Exists (C16); `tree-plan.json` is the one map |
| A unit that outgrows its window hands over (R50); a split there only under R49 | C10, C11, C103 | FoundationDB's 5-second window; of longer transactions "many can be divided" (self-reported, C103) | C114 refuted: FoundationDB's window is a reason to keep units short, not evidence for split over hand-over. C11 in part: R49 is later, only under option (b) of the research child's window | R49's ratio | None now; the split conflict stays open (C12; C90 refuted) |
| A hot leaf: drop duplicate messages in the parent's buffer; restarts bounded, then escalate | C104, C111, C75, C78 | Discord p99 reads 40-125 ms to 15 ms, store and front service changed together (self-reported, uncontrolled, C104); OTP default 1 restart in 5 s (documentation, C75) | C111 in part: each range already has one session, so a hot leaf is one woken by many messages; none observed in our files | Whether research trees have hot leaves; the restart period for sessions | Only when observed |
| No file records the owner rejecting the removal of the split | C04 | none | Confirmed | none | Candidate correction of `R:lane-tree.md:18` for the top session |
| Bw-tree Table I: failed splits 0.25 % dedup, 1.27 % Xbox, 8.88 % synthetic | C25 | Table I against the text's "around 1.25 %" | C25 in part: add the failed consolidates 1.19 %, 0.22 %, 7.35 % | none | Candidate correction of x03-0335 for the top session |

How each conclusion was reached: the database result is quoted from the paper's own text (P); the transfer to sessions
is reasoned from what a session is (minutes per unit, tokens to redo, a bounded window, no pause, 3 to 16 at once, a
rerun differs) and named as H with the assumption it needs in the claims file; then a refuter in a fresh context tried
to break each claim against the paper texts and our files, and the fold kept what it left. For the five refuted claims
and C04, C08, C11, C14, C18, C25, C27, C34, C42, C46, C53, C67, C69, C70, C76, C82, C83, C92, C95, C99, C103, C106,
the fold re-opened the cited places itself.

## 1. The operation map

| Operation | In a B-tree | For sessions | Today | Tokens | Time | Claims |
|---|---|---|---|---|---|---|
| Search | Root-to-leaf by separator keys | Route a question id to its leaf through one map, `tree-plan.json`, by script | Every key has one owning field (R46); no router | Not measured; by script, no model tokens (H) | Not measured | C02, C112 |
| Insert | Put a key in a leaf | A new question while the tree runs | Only by amendment before research (C05) | Not measured | Not measured | C05 |
| Split | Half-split: new right node, link, then the parent's entry | The overflowing leaf's unstarted keys go to a new leaf; the overflow record is the link; a script posts the index | Not built (R48(d) "later"); today the leaf is cut and the rest listed | One session start: child P = 60,000 (a guess from about 60k per agent today) plus S0 = 10,000 (a guess); 79,000 is a main session's median first call in other repositories. Research done is not moved (C06) | Start time not recorded; the only figure: five Sonnet readers used 767,000 tokens in four minutes (one trial) | C05, C06, C08, C86 |
| Merge | Rare; most engines only at empty | None: a leaf that runs out ends and frees its slot | FX-CLOSE (designed, not built) | 0 for the merge; an under-full leaf still costs its admission wake and end wake of the parent | 0 | C87 |
| Rebalance | Move keys to a sibling (B*) | Move unstarted keys to a sibling that has not started, or to the next wave; into a running session it costs a message and a wake | Not built (R48(c) "later") | Not measured | Not measured | C88, C109 |
| Root change (same level) | Not a B-tree operation | Coordinator hand-over to a fresh session | Built: epoch, drain at W*_coord | H0 = 432.4k, W* = 133.2k tokens, both from estimates; not measured on a tree run | Not measured | C10 |
| Root change (new level) | Split the root like any page, then a new root over both halves; old readers still find the data | A new top coordinator over two coordinators that each keep half the leaves | Not built; "three levels, never more" (C01) | Not measured: one coordinator start plus one summary per child | Not measured | C97, C82 |
| Buffer flush | Messages wait in an inner node and go down in a batch | Notes and corrections wait in files; the parent is woken less often | Each child's note is a wake; at the wake the coordinator reads every ledger event since its last acknowledged seq, so content is already batched and the wake is not | Per wake about the parent's window (C09), not measured; the saving is wakes avoided times the fixed re-read (H) | Not measured | C09, C18, C50 |
| Hand-over of a leaf (version split) | Copy only live entries into a fresh node | A successor of the same leaf continues from commits, carrying its reloaded state S | Coordinator built; research child only under option (b); H_max = 2 (a guess) | Reload S0 per hand-over (a guess); law in C10 | Not measured | C57, C66, C11 |

How many records one split changes: the old leaf's record (appended, not edited), the new leaf's task row and one map
row: three, as Lehman and Yao lock at most three nodes (C20). Whether serialising splits through one script ever
queues: its utilisation is (splits per hour) × (seconds per posting) / 3600 (H); neither is measured.

## 2. The variant for each case, by measurable features

| Feature | How it is measured (none measured yet) | Small, known | Grows | Very large |
|---|---|---|---|---|
| L: leaves the packer makes | Whole groups in key order against f·A_leaf and f·C_node (R47), on t_q from `cost.mjs --from-transcripts` | ≤ b | ≤ b at start | > b |
| b: children one parent holds per epoch | (g·k* − own growth per epoch) / s_summary (C83 in part) | ≥ L | ≥ L | < L |
| R: realised over estimated work per leaf | The pilot's predicted-against-realised log (R48(a)), summed per leaf | Rarely above 1/f | Above 1/f at some leaves | Above 1/f at some leaves |
| New keys during a run | New keys per leaf lifetime over leaf capacity | 0 | > 0 | > 0 |
| Remainder over start cost | Unstarted tokens at overflow over P + S0 | n/a | Decides sibling, next wave or new leaf | Same |
| Keys worked in key order | Start order of keys in the ledger | n/a | Decides a separator or a list of ids | Same |
| Wakes per child and tokens per wake | From transcripts on disk (countable without a run: C91) | Few | More | Many per parent |
| Summary compression of an inner node | Tokens out over tokens read | n/a | n/a | Decides whether a level pays (C80) |
| Share of children running at once | Concurrent starts over all starts | n/a | n/a | Decides whether a level pays (C76) |

- (a) Small job known up front: L ≤ b, no new keys, R above 1/f with chance at most p at f = 1/q_{1−p}(R). The
  bulk-loaded two-level tree, copy-on-write records; overflow cut and listed (C05) or deferred to the next wave; a split
  only at plan time (R47). (H on P)
- (b) Job that grows: new keys > 0, or R above 1/f at some leaves. Add the split of unstarted keys in the B-link form,
  posted by a script; a separator where keys are worked in key order, a list of ids otherwise (C86 in part); a small
  remainder to an unstarted sibling or the next wave (C109 in part); no merge; no re-packing into running sessions unless
  priced (C88 in part). (H on P)
- (c) Very large: L > b. Price more coordinator epochs against an inner level (C82 in part); add a level only where its
  summary compresses well and its children run at once (C80, C76); each inner node keeps one bounded summary per child
  (C51 refuted, replaced); keys named by question id through one map (C112); otherwise widen. (H on P)

Laws in ratios (all H): depth = ⌈log_b L⌉ where levels win; b ≤ (g·k* − own growth per epoch)/s_summary;
f = 1/q_{1−p}(R) per capacity; start tokens per useful token = (P + S0)/(occupancy × A_leaf). Thresholds are not given:
each ratio needs its measurement.

## 3. What the choice changes in the tree's design and in the 13 fixes (not designed here)

In the design (H): "three levels, never more" (C01) and "no inner level" hold for case (a), and for case (c) while more
epochs cost fewer tokens than a level. R47's f is computed per capacity (C84). R48(d) takes the B-link form, with the
link in the overflow record and the posting by a script (C86, C36); R48(c) is priced, not forbidden (C88); R11's "cut
and list" stays for case (a) (C05). The split conflict stays open: D3-12 says a field is not split mid-research, D3-01
says the remaining work is split near the window's limit, D2-02 says redistribute to a sibling or defer; the B-link
reading gives a split's mechanism, not the choice between split and hand-over, which R49 leaves to measurement (C12; C90
refuted). R11's cut also stops running work, which the decision rule allows for memory only: either the cut becomes
"commit at soft_frac and end", or the rule names budget as a second stop (C92 in part). v2's "height, search, latches
and merges add nothing" (C17) stays true for case (a).

In the 13 fixes (H, from C14): case (a) changes none of them. Case (b) adds a start act, the split, which passes the
paths FX-PLAN (`planAct`, `rowAct`), FX-CLAIM (one claim per attempt; admit, replace) and FX-CLOSE (free at empty)
already change. Case (c) makes FX-CGATE, hand-over (FX-CGATE, FX-CLAIM, FX-W3) and FX-W3/FX-W4 apply per inner
coordinator, each with its own epoch; the parent field would go into the tasks schema FX-CLOSE already changes. Ten
fixes edit `lib.mjs`, nine `status.mjs`, eight `watch.mjs` (C14): the fixes come first in every case, and (b) and (c)
extend the same files after them.

## 4. What is left for r57-0505 (not started)

Knowledge transfer between nodes and the CAP choice (C93, a scope statement that cannot be checked): whether siblings may
read each other's findings (the B-link link here routes keys only; today no child-to-child path, C16); how a correction
reaches a running leaf that holds an old version (C60: readers on snapshots) and what a held-back correction costs in
stale work (C50 in part); how stale a parent's summary may be (Astrolabe's bounded, eventually consistent summaries,
C71); whether to copy a node's logical change or its whole record between nodes (Uber, self-reported, C105); and, when a
session is dead or unreachable, whether the tree keeps working on snapshots (availability) or waits (consistency). This
report chose availability for the structure only: no session waits for a split (C35 in part, C36 in part).

## The architecture proposed for our case, ranked by expected gain

The ranking is a hypothesis: by the size of the cost each part acts on, the coordinator's window first, because that is
our recorded sink (C09). No gain below was measured on sessions.

| Rank | Part | Mark | The measurement that sets its numbers | From small to very large |
|---|---|---|---|---|
| 1 | Fewer parent wakes: a wake waits while nothing in the backlog is urgent; the backlog is counted in tokens; the trigger weighs the fixed re-read against the cost of delay | Mechanism P (C37-C42); transfer H, narrowed (C50, C113) | A parent's tokens per wake, split into the fixed re-read and what each child adds (s_summary), and how many wakes could have waited, counted from transcripts on disk (C91) | Small: few wakes, small gain. Grows with children per parent: largest for very large trees |
| 2 | Plan-time packing with f computed from R, per capacity; fewer, fuller leaves | H (C84 in part, C87 in part) on P occupancy figures (C62, C98, C100) | R per leaf from the pilot's predicted-against-realised log (R48(a)) | Same law at every size; per class of question |
| 3 | Split of unstarted keys in the B-link form, posted by one script step under the run lock; a small remainder to an unstarted sibling or the next wave; no merge | P (C19-C24, C31, C94-C96); H (C86, C87, C88, C109, all in part) | New keys per leaf lifetime; remainder over P + S0; whether keys are worked in key order; a session's start cost on a tree run | Small: never fires. Growing: once per overflow. Very large: local to one leaf zone (C71) |
| 4 | More coordinator epochs or an inner level, priced in tokens; depth ⌈log_b L⌉ where levels win; width first | Law P (C58, C71); transfer H (C79, C82, C83, all in part) | s_summary and the split of g; inner compression; the share of children running at once (C76) | Small: depth 1. Very large: levels only where they compress and run concurrently |
| 5 | Each inner node keeps one bounded summary per child, rewritten per report (merge policy by read share) | P (C45, C46 in part); H (replaces refuted C51) | The read share: how often a parent reads state against how often children report | Only case (c) |
| 6 | Copy-on-write records, one writer per shared file, keys named by question id through one map | O (C16) and P (C52, C60); H (C112 in part) | none (exists) | Same at every size; long readers pin versions as runs grow |
| 7 | Duplicate messages dropped in the parent's buffer; restarts bounded per parent | P self-reported (C104), documentation (C75); H (C111 in part) | Repeated or overlapping questions per leaf; restarts per hour | Only when observed |

Not proposed, and why: lock coupling (it holds nodes across a slow step: C29, C34); Bw-tree help-along as the way to
finish a split (a passing session spends minutes and a window re-read on seconds of file work: C36 in part, a cost
argument only); B* redistribution into live sessions without pricing it (C88 in part, C101); merging partly full leaves
(a window cannot be merged: C06, C87); "merge once at the top" (C51 refuted); FoundationDB's window as a reason to split
(C114 refuted); a minimum work per session from the page law (C59 refuted).

Where I am not sure: the ranking; whether a wake costs the same whatever it carries (caching may change it); whether
unstarted keys can move without the old leaf's context, since keys share context (SELECTIONS-MAP D2-01); whether
occupancy figures from pages carry to tokens of work.

## Not found, not opened

Not opened: Lanin and Shasha 1986 (NYU page forbidden, Internet Archive bot block); Sagiv 1986 and Johnson and Shasha
1990 and 1993 (bot checks at the publishers; listed for the owner's sign-in in `R:t1-collect-concurrent.md` and
`-versions.md`; the 1993 paper's utilisation by delete share is what would settle C65); Bayer and Schkolnick 1977, Yao
1978, Baeza-Yates 1989 (paywalls); Graefe 2011 (sold); Rodeh's 2008 journal text (the IBM report was read); Lomet 2004
(named by Graefe, not tried); arXiv 2606.05670 and 2609.14767 (snippets only) and 2609.11737 (truncated twice); a debate
study varying depth and width, arXiv 2510.04311 (seen by the refuter as a search summary only); Beckmann, Williamson,
Keren and Levhari on span of control (snippets); DeWitt on group commit; WiredTiger's eviction page (fetched, not read).
Figures not read as numbers: Dremel Figure 11, Astrolabe Figure 6, Dostoevsky's and Monkey's evaluations, Srinivasan and
Carey's curves.

Not searched: hierarchical task networks; Borg-style restart and eviction rates; TiKV; the history of MongoDB's change
of engine.

Not found in the papers read (which is not "no paper"): how long a half-split lasts (eight concurrency papers and
ARIES/KVL; PostgreSQL normally finishes it at once and only after a failure later); a law in ratios for structure
changes per insert (Lehman and Yao call splits "exceptional", no figure); any study with 3 to 16 writers whose units
last minutes (all six collect files); a controlled sweep of depth against fan-out at equal work with tokens per level
for coding or research sessions (searched as recorded at `R:t1-collect-hierarchy.md:163-165`; RAO and the
self-organising study vary depth, MacNet and Huang compare deeper and wider topologies, none at equal work by fan-out);
a direct measurement of an LSM-tree against a B-epsilon tree on one workload.

## Candidate corrections for the top session (not applied)

1. `R:lane-tree.md:18`, "the owner then rejected the removal of the split" (C04, confirmed): no file read records it.
   The coordinator withdrew its own split (protocol v1, line 276); the design step's ruling, not the owner, moved the
   split with a separator to later and rejected attack point A4-05, a split leaf in the pilot, because `tree-plan.json`
   is built only after the pilot (`docs/program/evidence/research-tree/foundations-2026-11-16/design/result.json` lines
   1034-1035); it kept the B+ framing because "the owner frames his design that way" (line 999). No library record says
   the owner rejected the removal (`lookup.sh` for split owner, removal). The lane sentence is not a record.
2. x03-0335 (`library/journal/2026-11-18/x03.jsonl:47`) says split and consolidate failures are about 1.25% on Xbox
   and dedup; Table I gives failed splits 0.25 % dedup, 1.27 % Xbox, 8.88 % synthetic and failed consolidates 1.19 %,
   0.22 %, 7.35 % (C25). Written as a proposed correction in `library/journal/2026-11-19/t1.jsonl`.
3. x21-0318 gives 4.4 against 17.2 and -5.51 against -23.72 as a summary with no conditions; read in the papers, the
   first is one orchestrator over three agents against three independent agents, with error amplification not a
   significant predictor after controls (C67), and the second compares different systems at depth 1, not a depth test
   (C69). Written as a proposed correction.
4. x21-0470 gives the root's fan-out room as 246 rows of about 200 tokens between P plus S and W*; that room equals
   g·k*, the coordinator's own growth over one epoch, so rows of child summaries share it with the coordinator's own
   calls (C83 in part). Written as a proposed correction; the 7-10 fields it covers are far below the bound either way.

## Limits of this report

- Nothing was measured; every transfer to sessions is a hypothesis, and every gain in the table is a database or agent
  figure under its own conditions.
- The refuter opened `R:t1-collect-ours.md` lines 110-145 against its brief while checking C13 and C14; it says both
  verdicts rest on the primary files. The fold re-checked them there: a grep of `research-tree/tcb/admit.mjs` and
  `watch.mjs` for parent, depth, level and tree-plan finds nothing, and `research-tree/BUILD-SIZE.md` lines 44-52 and
  `research-tree/FAULTS-AND-FIXES.md` line 49 hold the quoted rows.
- C65 cannot be checked (its paper is behind a bot check); C64 and C93 are a second-hand account and a scope statement.
- The refuter's corrections of C50, C82, C83, C84, C88, C109 and C113 are its own reasoning on the cited lines; they are
  used here as corrected hypotheses, not as findings.
