# t1 report (draft, step 2): which kind of B-tree fits a tree whose nodes are sessions

`R:` = `docs/program/evidence/round3-2026-11-18/`. Draft of 2026-11-19 by the analyst (kind analyse, Opus), before the
gate and the refuter. Every statement cites claims in `R:t1-claims.md` (C01 to C115). Marks: proven in the literature
(P), observed in our files (O), hypothesis (H), summary (S, never used to decide). Nothing was measured here. Figures
from a company or an engine team are self-reported.

## The answer

1. No one kind fits all three. Four measurable ratios choose: total work over what a leaf holds (N/C), children one
   parent's window holds (b), realised over estimated work per key, and messages per parent wake (H: C82-C84, C50).
2. Small job known up front (N/C ≤ b, no new work): the bulk-loaded two-level B+ tree we have, fill factor computed
   from the overflow ratio, copy-on-write records; nothing more (H on P: C89, C84).
3. Growing job: add PostgreSQL's B-link half-split: unstarted keys go to a new leaf via the overflow record, a script
   finishes the parent's index later; no merge, no re-packing into running sessions (H on P: C86, C95, C108, C110).
4. Very large (N/C > b): depth ⌈log_b(N/C)⌉, width first; inner sessions as buffered nodes (one batch per wake),
   bounded summaries merged once at the top (H: C82, C79, C50, C51, C80).
5. Largest expected gain: batching parent wakes, as our token use is calls × window size (O: C09). Nothing was
   measured on a tree of sessions; each number for sessions is named as a measurement.

## The table

| Conclusion | From (claims) | Measured gain and its conditions | What the refuter left | Still a guess for sessions | What it changes in our rule or tree |
|---|---|---|---|---|---|
| Small job: two levels, bulk-loaded, no concurrency machinery | C01, C02, C17, C28, C34, C72, C89 | One thread: lock schemes "very similar" (B+ tree, 100M keys, C28); one CPU and one disk: throughput barely above one user (simulation, C34); flat single hop: in-tree aggregation no better (sensor net, C72) | pending | That 7 to 16 leaves fit one parent's window (s_summary not measured) | None in the rule. "Height, search, latches and merges add nothing" (v2, C17) holds for this case only |
| Fill factor computed: f = 1/q_p(realised/estimated work) | C84, C02, C07, C98, C100, C62, C63 (S) | Occupancy, not gain: B+ 1/2 and B* 2/3 guaranteed (C62); InnoDB 15/16 in key order, 1/2 to 15/16 random (C98); Facebook production 1/2 to 2/3 (self-reported, C100) | pending | The spread of realised over estimated t_q per class of question | `fill_factor` 0.75 (a guess, read by no script) becomes a computed value in R47 |
| Split = B-link half-split of the unstarted key range | C19-C24, C86, C94, C95, C05, C06, C03 | No figure for the half-split itself. B-link best in a simulation (no ratio in the text, C34); in production in PostgreSQL (no figure, C94-C95) | pending | That a new leaf can start from files alone (keys share context: SELECTIONS-MAP D2-01); how often leaves overflow | R48(d) takes the B-link form; settles the split conflict (C90); replaces "cut and list" in cases b and c |
| The split is finished by a short serialised script step, not by a session | C31, C32, C36, C95, C108, C26, C27, C60 | ARIES/IM: latch "very small", no number (C31). Help-along: Bw-tree 18.7× BerkeleyDB (8 threads, C26) but 1.5-4.5× slower than OLC trees when rebuilt (20 threads, C27) | pending | That posting a separator and a task row takes seconds; how often splits compete for the run lock | `tree-plan.json` gets one writer, the rule's "one owner" for ordered sequences (C91, C92) |
| No merge: a leaf that runs out ends and frees its slot | C21, C34, C87, C96, C98, C99, C65 (S) | None measured. PostgreSQL never merges partly full pages (C96); InnoDB merges below 50 %, LMDB below 25 % (C98, C99) | pending | That an under-full leaf costs only its start | FX-CLOSE's slot release is this operation |
| No re-packing into running sessions | C62, C88, C101, C110, C54 | B* raises the floor from 1/2 to 2/3 (analytic, C62). Facebook: defragmentation lost to a stream of random writes (self-reported, C101) | pending | That a running session cannot take keys without a wake | R48(c) only to an unstarted sibling or at plan time |
| Batch a parent's wakes (the buffer flush) | C09, C18, C37-C43, C48, C50, C106, C113 | B-epsilon: inserts 16× faster for twice the point-query cost (B = 1024, ε = 1/2, an argument, C39); BetrFS worked model 14.3× (1 TB, 1 MB nodes, C42); LFS an order of magnitude on small writes (C48); RocksDB wrote 10-15 % of InnoDB's bytes for 10-20 % more reads (self-reported, C100) | pending | That a wake costs about the same whatever it carries; batch size; the read cost (every pending buffer on the path, C41) | The note per commit into the coordinator's window (C18) becomes a batch per wake; the rule gains the parent's window as a width (C92) |
| Depth by law; width before depth | C82, C83, C58, C70, C71, C73, C77, C79 | Dremel: two levels "off the chart" at 1:2900, three levels ran (text, C70); Astrolabe 8 × 5 = 40 summaries at 390,625 members (simulation, C71); MacNet star 0.6267 against tree 0.6015 (no CIs, C73); self-formed depth at most 2 up to 64 agents (C77) | pending | b for sessions (summary size, parent window) | "Three levels, never more" (C01) becomes depth from the law; the task rows need a parent field (C13) |
| An inner level only when its summary is much smaller than its inputs | C72, C71, C80, C74 | TAG: an order of magnitude less traffic for distributive aggregates, none for MEDIAN (C72) | pending | How much an inner session compresses | A child's report up must be bounded, as the 400-character note already is |
| Depth pays when work is long and splits | C76, C81, C09 | RAO: 196K against 1,029K tokens and 1.8-2.5× faster with 83.9 % of delegations concurrent; 21-28× the tokens and 18× slower with 1.6 % concurrent (trained 30B agents, C76) | pending | Our share of keys that run at once; whether our sessions behave like RAO's | Before a level is added, the plan measures the concurrent share |
| Merge summaries once at the top; style chosen by the read share | C44-C46, C51, C102, C115 | Lazy leveling O((L+T)/B) against O(T·L/B) (complexity; numbers in figures not read, C46); RocksDB tiered 4-10 against leveled 10-30 write amplification (self-reported, C102) | pending | That rewriting a summary is the analogue of a merge | At depth 2 or more an inner coordinator keeps its children's reports and the top merges once |
| Copy-on-write records, one writer per record, readers on snapshots | C16, C52, C56, C57, C60, C61, C55 | LMDB 12 s against 3 min 4 s for 16 searches (labels uncertain, C61); Rodeh about 6× with ten tasks, clones 0.3-4 % (C55); a change rewrites 2 × depth pages (C52) | pending | A session reading for minutes pins old versions (C60) | Exists (C16); 2 × depth bounds how often summaries are rewritten |
| A unit that outgrows its window is split, not extended | C103, C114, C10, C11 | FoundationDB's 5-second window (self-reported, C103) | pending | The session window as the MVCC window | Agrees with R49 (C11); the research child's W* stays the owner's open decision (v2 §12) |
| A hot range: merge identical requests and cap sessions before restructuring | C104, C111 | Discord p99 reads 40-125 ms to 15 ms, store and front service changed together (self-reported, uncontrolled, C104) | pending | Whether research trees have hot ranges | A dedupe step in the parent's buffer; an admission cap per leaf |
| Name leaves by key, never by position | C105, C112 | No number (Uber, self-reported, C105) | pending | none | Keys stay question ids; separators by key |
| Restarts bounded, then escalate | C75, C78 | OTP default 1 restart in 5 s (documentation, C75) | pending | The period for sessions (hours) | H_max = 2 (a guess) is this intensity; one per inner coordinator at depth 2 or more |
| The record holds no owner rejection of the split's removal | C04 | none | pending | none | Candidate correction of `R:lane-tree.md:18` (fold) |
| Bw-tree failed splits: 0.25 % dedup, 1.27 % Xbox, 8.88 % synthetic (Table I) | C25 | Table I against the text's "around 1.25 %" | pending | none | Candidate correction of x03-0335 (fold) |

How each conclusion was reached: the database result is quoted from the paper's own text (P); the transfer to
sessions is reasoned from what a session is (minutes per unit, tokens to redo, a bounded window, no pause, 3 to 16 at
once, a rerun differs) and named as H with the assumption it needs in the claims file.

## 1. The operation map

| Operation | In a B-tree | For sessions | Today | Tokens | Time | Claims |
|---|---|---|---|---|---|---|
| Search | Root-to-leaf by separator keys | Route a question id to its leaf: a lookup by key in `tree-plan.json`, done by a script | Every key has one owning field (R46); no router | Not measured. By script, no model tokens (H); by a coordinator, one call over its window (C09) | Not measured | C02, C82, C112 |
| Insert | Put a key in a leaf | New question while the tree runs | Only by amendment before research (C05) | Not measured | Not measured | C05 |
| Split | Half-split: new right node, link, then the parent's entry | The overflowing leaf's unstarted keys above a separator go to a new leaf; the overflow record is the link; a script posts the separator | Not built (R48(d) "later"); today the leaf is cut and the rest listed | One session start: prefix about 60,000 tokens per agent, 79,000 at a main first call (other repositories, C08), plus S0 10,000 (guess); the posting by script, no model tokens (H). Research already done is not moved (C06) | Start time not recorded; the only figure: five Sonnet readers used 767,000 tokens in four minutes (one trial, C08) | C05, C06, C08, C86 |
| Merge | Rare; most engines only at empty | None: a leaf that runs out ends and frees its slot | FX-CLOSE (designed, not built) | 0 | 0 | C87 |
| Rebalance | Move keys to a sibling (B*) | Move unstarted keys to a sibling that has not started, or at plan time | Not built (R48(c) "later") | Not measured | Not measured | C88, C110 |
| Root change (same level) | Not a B-tree operation | Coordinator hand-over to a fresh session | Built: epoch, drain at W*_coord | H0 = 432.4k, W* = 133.2k tokens, both estimates; not measured on a tree run (C10) | Not measured | C10 |
| Root change (new level) | Split the root like any page, then a new root over both halves; old readers still find the data | A new top coordinator over two coordinators that each keep half the leaves | Not built; "three levels, never more" (C01) | Not measured: one coordinator start plus one summary per child | Not measured | C97, C82 |
| Buffer flush | Messages wait in an inner node and go down in a batch | Questions, corrections and child notes wait in a file and go as one brief or one wake | Not built: each child's note goes into the coordinator's window (C18) | Per wake about the parent's window (C09); per message about the wake over the batch size (H) | Not measured | C09, C18, C50, C113 |
| Hand-over of a leaf (version split) | Copy only live entries into a fresh node | A successor of the same leaf continues from commits | Built: replace.mjs, H_max = 2 (guess) | Reload S0 per hand-over (guess); law in C10 | Not measured | C57, C66, C11 |

How many records one split changes: the old leaf's record (appended, not edited), the new leaf's task row, and one
index row in the parent: three, as Lehman and Yao lock at most three nodes (C20). Whether serialising splits through
one script ever queues: its utilisation is (splits per hour) × (seconds per posting) / 3600 (H); neither is measured,
and at seconds per posting it would need thousands of splits an hour to matter.

## 2. The variant for each case, by measurable features

| Feature | How it is measured (none measured yet) | Small, known | Grows | Very large |
|---|---|---|---|---|
| N/C: total work over what a leaf holds | Σ t_q from `cost.mjs --from-transcripts` over f·A_leaf | ≤ b | ≤ b at start, rises | > b |
| b: children one parent holds | (W*_parent − P − S) / s_summary (C83) | ≥ N/C | ≥ N/C | sets depth ⌈log_b(N/C)⌉ |
| Overflow ratio | Realised over estimated t_q per group (the pilot log of R48(a)) | Below 1/f at the chosen chance p | Above, often | Above, at some leaves |
| New work during the run | New keys per leaf lifetime over leaf capacity | 0 | > 0 | > 0 |
| Messages per parent wake, down and up | Wakes and notes per wake from transcripts (countable without a run: C91) | About 1 | Above 1 | Many |
| Nodes changed at once | Splits in flight × 3 records | 0 | Few | Few per leaf zone (local, C71) |
| Share of children running at once | Concurrent starts over all starts | n/a | n/a | Decides whether depth pays (C76) |
| Summary compression of an inner node | Tokens out over tokens read | n/a | n/a | Decides whether a level pays (C80) |

- (a) Small job known up front: N/C ≤ b, no new work, overflow chance ≤ p at f = 1/q_p. Bulk-loaded B+ tree, two
  session levels, copy-on-write records; overflow is cut and listed (C05); a split only at plan time. (H on P)
- (b) Job that grows: new work > 0 or the overflow ratio above 1/f. Add the B-link half-split of unstarted keys,
  finished by a script; no merge; no re-packing. Expected occupancy depends on where leaves split (C109): moving only
  unstarted keys is the append split, which leaves the old leaf full (C99, C98); a middle split leaves about 1/2
  (C53). If messages per wake rise above 1, add one buffer at the parent. (H on P)
- (c) Very large: N/C > b. Depth ⌈log_b(N/C)⌉; inner coordinators as buffered nodes (C37-C41, C49); summaries
  bounded (C71, C80); merge once at the top (C46, C51); stable names (C112); add a level only where the inner summary
  compresses well and children run concurrently (C76, C80); otherwise widen. (H on P)

Laws in ratios (all H): depth = ⌈log_b(N/C)⌉; b ≤ (W*_parent − P − S)/s_summary; f = 1/q_p(realised/estimated);
parent tokens per message ≈ wake tokens / batch size, read cost × depth; start tokens per useful token = P /
(occupancy × A_leaf). Thresholds are not given: each ratio needs its measurement.

## 3. What the choice changes in the tree's design and in the 13 fixes (not designed here)

In the design (H): "three levels, never more" (C01) and "no inner level" hold for case (a) only; case (c) needs depth
from the law and a parent field in the task rows (C13). R47's f is computed (C84). R48(d) takes the B-link form, with
the link in the overflow record and the posting by a script (C86, C108); R48(c) is limited to unstarted siblings
(C88); R11's "cut and list" stays for case (a) (C05). R49 stays as the trigger that turns a roll-over into a split
(C11, C114). The note per commit (C18) becomes a batched up-flow in case (c). `tree-plan.json` gets one writer (C92).
The record's split conflict (C12) reads as C90: plan-time split of the range, at overflow only the unstarted rest,
never research in progress. v2's "height, search, latches and merges add nothing" (C17) stays true for case (a).

In the 13 fixes (H, from C14): case (a) changes none of them. Case (b) adds a start act, the split, which passes the
paths FX-PLAN (`planAct`, `rowAct`), FX-CLAIM (one claim per attempt; admit, replace) and FX-CLOSE (free at empty)
already change. Case (c) makes FX-CGATE, hand-over (FX-CGATE, FX-CLAIM, FX-W3) and FX-W3/FX-W4 apply per inner
coordinator, each with its own epoch; the parent field would go into the tasks schema FX-CLOSE already changes. Ten
fixes edit `lib.mjs`, nine `status.mjs`, eight `watch.mjs` (C14): the fixes come first in every case, and (b) and (c)
extend the same files after them.

## 4. What is left for r57-0505 (not started)

Knowledge transfer between nodes and the CAP choice (C93): whether siblings may read each other's findings (the
B-link link here routes keys only; today no child-to-child path, C16); how a correction (an upsert, C39) reaches a
running leaf that holds an old version (C60: readers on snapshots); how stale a parent's summary may be (Astrolabe's
bounded, eventually consistent summaries, C71); whether to copy a node's logical change or its whole record between
nodes (Uber's physical replication of a rebalance was the dangerous part, C105); and, when a session is dead or
unreachable, whether the tree keeps working on snapshots (availability) or waits (consistency). This report chose
availability for the structure only (no session waits for a split: C35, C36).

## The architecture proposed for our case, ranked by expected gain

The ranking is a hypothesis: by the size of the cost each part acts on, the coordinator's window first, because that
is our recorded sink (C09). No gain below was measured on sessions.

| Rank | Part | Mark | The measurement that sets its numbers | From small to very large |
|---|---|---|---|---|
| 1 | Batched parent wakes: messages wait in files, one wake per batch; trigger at a fraction of what the receiver holds; paced by the backlog in tokens; bounded child summaries | Mechanism P (C37-C42, C106); transfer H (C50, C113, C80) | Tokens per parent wake and messages per wake, counted from transcripts on disk (needs no run, C91); summary size s_summary | Small: about one message per wake, gain near 1. Grows with messages per parent: largest for very large trees |
| 2 | Width before depth; depth = ⌈log_b(N/C)⌉ | Law P (C58, C71); transfer H (C79, C82, C83) | s_summary, W*_parent, Σ t_q per key | Small: depth 1. Very large: log_b(N/C), inner levels only where they compress (C80) and run concurrently (C76) |
| 3 | B-link half-split of unstarted keys, finished by a script under the run lock; no merge; no re-pack | P (C19-C24, C31, C94-C96); H (C86, C87, C88, C108) | Overflow ratio and new-work rate from the pilot log (R48(a)); session start cost on a tree run | Small: never fires. Growing: once per overflow. Very large: local to one leaf zone (C71) |
| 4 | Fill factor from the overflow ratio | H (C84) on P occupancy figures (C62, C98, C100) | Realised over estimated t_q per class | Same law at every size; per class of question |
| 5 | Buffered inner coordinators; merge once at the top; style by read share | P (C44-C46, C102); H (C51, C115) | Read share: how often a parent asks state against how often children report | Only case (c) |
| 6 | Copy-on-write records, one writer for the index, stable names | O (C16) and P (C60, C105); H (C112) | none (exists) | Same at every size; long readers pin versions as runs grow |
| 7 | Hot-range coalescing and a cap per leaf; bounded restarts per parent | P self-reported (C104), documentation (C75); H (C111) | Repeated or overlapping questions per leaf; restarts per hour | Only when observed |

Not proposed, and why: lock coupling (it holds nodes across a slow step: C29, C34); Bw-tree help-along (a helping
session costs minutes and gains no progress guarantee: C27, C36); B* redistribution into live sessions (C88, C101);
merging partly full leaves (a window cannot be merged: C06, C87).

Where I am not sure: the ranking; whether a wake costs the same whatever it carries (caching may change it); whether
unstarted keys can move without the old leaf's context, since keys share context (SELECTIONS-MAP D2-01); whether
occupancy figures from pages carry to tokens of work; the help-along rejection rests on a token argument, not a
measurement.

## Candidate corrections for the fold

1. `R:lane-tree.md:18`, "the owner then rejected the removal of the split": no file read records it; the coordinator
   withdrew the split and version 2 brought it back as "later" (C04). The fold checks the library first.
2. Library x03-0335 (`library/journal/2026-11-18/x03.jsonl:47`), "about 1.25% on Xbox and dedup": Table I gives failed
   splits 0.25 % dedup, 1.27 % Xbox (C25).
3. For the gate, line drifts found: `research-tree/START-HERE.md` "Not done" is at 17 (ours: 20);
   `research-tree/FAULTS-AND-FIXES.md` split conflict at 37-40 (ours: 49-53); Graefe's half-split passage at 115
   (110-111 cited); Dostoevsky "No Single Merge Policy Rules" at 2189 (2190 cited); Uber's rebalancing sentence at 179
   (193 cited).

## Not found and not opened, with what was searched

Not opened: Lanin and Shasha 1986 (NYU page forbidden, Internet Archive bot block); Sagiv 1986 and Johnson and Shasha
1990 and 1993 (Cloudflare bot checks at the publishers; listed for the owner's sign-in in `R:t1-collect-concurrent.md`
and `-versions.md`); Bayer and Schkolnick 1977, Yao 1978, Baeza-Yates 1989 (paywalls); Graefe 2011 (sold); Rodeh's
2008 journal text (the IBM report was read); Lomet 2004 (named by Graefe, not tried); arXiv 2606.05670 and 2609.14767
(snippets only) and 2609.11737 (truncated twice); Beckmann, Williamson, Keren and Levhari on span of control (snippets);
DeWitt on group commit; WiredTiger's eviction page (fetched, not read). Figures not read as numbers: Dremel Figure 11,
Astrolabe Figure 6, Dostoevsky's and Monkey's evaluations, Srinivasan and Carey's curves.

Not searched: hierarchical task networks; Borg-style restart and eviction rates; TiKV; the history of MongoDB's change
of engine.

Not found in the papers read (which is not "no paper"): how long a half-split lasts (eight concurrency papers and
ARIES/KVL; PostgreSQL says only "lazily at the next insertion or vacuum"); a law in ratios for structure changes per
insert (Lehman and Yao call splits "exceptional", no figure); any study with 3 to 16 writers whose units last minutes
(all six collect files); a controlled sweep of depth against fan-out at equal work with tokens per level for coding or
research sessions (the hierarchy second attempt searched "hierarchical multi-agent LLM depth of hierarchy fan-out
token cost controlled study", "LLM agents organizational structure span of control hierarchy depth experiment",
"recursive agent delegation tree of agents multi-level orchestration benchmark depth", `R:t1-collect-hierarchy.md:163-165`;
RAO and the self-organising study vary depth, neither at equal work by fan-out); a direct measurement of an LSM-tree
against a B-epsilon tree on one workload.
