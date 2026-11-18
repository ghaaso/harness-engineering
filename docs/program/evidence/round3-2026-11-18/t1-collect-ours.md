# t1 ours: our tree as recorded and as coded

Read-only collection (no web, no download), 2026-11-19. `R:` = `docs/program/evidence/round3-2026-11-18/`. Paths are
from the repository root. Marks: `quoted` (exact words read), `observed` (seen in our files), `reasoned` (my
inference). Digest files under `research-tree/` were extracted by small readers (START-HERE.md line 4); where it
mattered I opened the protocol text they point at.

## Library records used / upgraded

- Used: r57-0115, r57-0201, r57-0404, r57-0028, r57-0023, r57-0114, r57-0126, b1-0112 to b1-0115, b1-0121, b1-0123,
  x19-0413, x19-0414, x19-0709, x20-0407, x20-0424, x20-0474, x20-0475, x21-0213, x21-0423, x20-0115, x12-0104, x12-0300.
- Upgraded from digest to the protocol text: x21-0213 and x21-0423 (read at `docs/program/RESEARCH-TREE-PROTOCOL-2026-11-16.md`
  lines 262-279, where the verdict is made); x19-0709 (read at v2 lines 451-457, R47). The records b1-0112/0113/0115
  were checked against the code (admit.mjs, thresholds.json, watch.mjs): they stand.
- No record found for: the owner's rejection of removing the split (see F5). Not found in `library/` by `lookup.sh`
  (words split, B+ tree, hierarchy, shape) nor in any file read.

## Statement check: `R:lane-tree.md` lines 10 to 18

| # | Statement (line) | Verdict | What I read |
|---|---|---|---|
| S1 | A plain two-level hierarchy, one coordinator and about seven leaves, "no inner level is ever needed for 7-10 fields" (10-11) | In part | The quote is exact: `research-tree/DESIGN-RECORD.md:162` - "Seven leaves expected, "no inner level is ever needed for 7-10 fields" (343 [1])" (quoted). But the protocol says three levels: `docs/program/RESEARCH-TREE-PROTOCOL-2026-11-16.md:15` - "## 2. The tree: three levels, never more"; level 2 is the helpers of a leaf (lines 19-21, quoted). Two levels of sessions with a third of helpers. The sentence in DESIGN-RECORD:162 is also the pilot's expectation, not a measured count. |
| S2 | From the B+ tree it takes only how questions are packed into leaves before work starts, fill factor about 0.75 (12-13) | In part | `SELECTIONS-MAP.md:29` D2-01 (observed): "B-tree, B+ tree ... Bulk loading at a fill factor". Line 160: "assign consecutive ranges to fields up to f times C (f about 0.7 to 0.8)". 0.75 comes from `research-tree/tcb/thresholds.json:43` ("fill_factor" 0.75, "later") and v2 R47 (`RESEARCH-TREE-PROTOCOL-v2-2026-11-16.md:454-455`: "f = 0.75 retuned to the slack used"). Understated in two ways: it also takes pack capacity (a check at pack freeze, `tcb/commit.mjs:752-763`, v2 R47 line 452-453) and the two-level pack index (v2 R17 line 225), and v2 line 498-499 lists "splitting the key range with a separator written to the parent". And it overstates: no script reads `fill_factor` (grep over `tcb/*.mjs`: none) and `tcb/plan-tree.mjs` does not exist (observed): the packing at 0.75 is only in the cost prototype `tcb/cost.mjs:326-347` (an illustrative key set). |
| S3 | A split with a separator, redistribution and a plan-tree bulk load were "moved to later" (14-15) | Right | `DESIGN-RECORD.md:18` - "Moved to later by the ruling (1078-1094): certainty, plan-tree bulk load, hook budget check, redistribution, split with separator, ..." (quoted). v2 confirms: R47 "Bulk load after the pilot", R48(d) "Later: a split" (lines 451, 461). |
| S4 | Sibling links and copy-on-write are options under D2-02 (15-16) | Right, with a detail | `SELECTIONS-MAP.md:30` - "(+2: Sibling links with a high key (B-link tree); Copy-on-write (shadowing))" (quoted). They are the two extras (+2), not the selected design; the same row says "keep sibling links as a one-line pointer only", and line 161 "sibling links as a forward pointer only". Copy-on-write has no further use in the record (reasoned from the grep: the word occurs only in D2-02 row). |
| S5a | An attack round judged that the plain hierarchy earns its place and the B+ analogy does not (17-18) | Right | `research-tree/ATTACK-AND-COST-RECORD.md:37` - "the tree as a plain hierarchy earns its place (centralized check trace-level error amplification 4.4 against 17.2 for independent agents; hierarchy lost -5.51 against -23.72 for a chain). The B+ tree analogy does not earn its place" (quoted). The coordinator then did not follow it in full: `RESEARCH-TREE-PROTOCOL-2026-11-16.md:288-289` - "The mapper: delete the B+ bullets. Ruling: part D. Two stay as rules, one is withdrawn, and the idea goes to lane 7." |
| S5b | "the owner then rejected the removal of the split" (18) | Not verified, probably wrong as stated | No file I read records it. What the files hold: (1) the split WAS removed by the coordinator in amendment 3, before the owner's ruling: `RESEARCH-TREE-PROTOCOL-2026-11-16.md:276` - ""Split a field in two on overflow" is withdrawn." (2) The owner then ruled for borrowing whole designs, B+ trees named: v2 lines 20-22 - "we have to fix these problems; they probably align with different well documented and solved branches and domains of CS, like I'm reusing distributed systems and B+ trees." (quoted, the owner's words). (3) v2 brought the split back as a later feature: R48(d), and the attack point "A4-05 split leaf in the pilot" is listed among the rejected attack points (`DESIGN-RECORD.md:69`; the reason is in result.json line 1034, not read). So the split is in version 2 as "later", by the design ruling, not by a recorded owner sentence about the split. If the owner said it in chat, it is in no file (not recorded). |

## Findings

**F1. What a node is.** Level 0: "The coordinator: one fresh session in this repository ... Never reads sources or reviews work itself"
(protocol v1:19, quoted). Level 1: "Per field: one pack builder, then one expert" (v1:20) - a session with
its own working folder `wt/<task>-e<e>/` (in/, view/, staging/, .claude/settings.json; v2:71). Level 2: helpers,
"readers (Sonnet), checkers (Opus)", "Never does: Starts other agents" (v1:21). Key = "approved question id; leaf = field; root =
coordinator" (v2:441-443, quoted). Each node is a language-model session with a role profile
(`research-tree/tcb/profiles/*.json`: child, coordinator, reader, checker, fresh-reviewer, ...) and a brief
(`research-tree/tcb/briefs/*.md`) (observed).

**F2. What flows down and up, and in what form.** All by files. v1:23 (quoted): "Experts never see each other's output. Everything passes
through files that the coordinator checks." Down: brief file, question list (`plan/questions`), frozen pack for review
(`review-in/<task>/`, built by replace.mjs alone; v2:206-208). Up: a child writes only its own `staging/`
(v2:206 R13, quoted: "A session writes only its `staging/`"); `commit.mjs` validates and stores cards as
objects by exclusive create (v2:211-213); a READY marker; a "400-character note into the coordinator's window" (v2:40,
quoted); the pack as a hash-covered snapshot, "over capacity it becomes a two-level index" (v2:224-225). The coordinator's
state is "the status file and coord.json" (v2:177) and it "holds pointers, not contents" (v1:274-275). Helpers (readers) return
cards as a result and the child writes them (ATTACK-AND-COST-RECORD.md:35, rj:1193). Nothing is a message between sessions;
there is no child-to-child path (v1:20, "Talks to another level-1 session" is under Never does). (observed/quoted)

**F3. What "full" means for a node.** Two capacities, never one number (DESIGN-RECORD.md:38, conflict 16, quoted:
"two capacities, pack C_node and spend A_leaf; B+ governs only what must share a window").
(a) Pack capacity in tokens: C_node = W_quality - P - R_rev = 300,000 - 60,000 - 60,000 (inputs) = 180.0k (DESIGN-RECORD.md:127,
quoted); coded as W_quality - child_prefix_tokens - review_reserve_tokens = 300,000 - 60,000 - 75,000 = 165,000 in
`tcb/commit.mjs:760-763` and `thresholds.json` (observed; the code and the record differ by 15k because the review
reserve is 75k in thresholds against 60k in the cost inputs). Over capacity with no index: `no(1,'pack-over-capacity')`
(commit.mjs:763). (b) Spend A_leaf = the task's estimate e_task: soft at 0.8 (child told to commit), hard at 0.9 (cut)
(`thresholds.json:18-19`, `watch.mjs:425-426`) (observed). (c) Fill factor f = 0.75: "a leaf is full at Σt_q ≥ f·A_leaf or Σκ_q ≥ f·C_node"
(v2:454, quoted) - designed for after the pilot, not read by any script. (d) Window: coordinator hand-over at W*_coord = 133,200
tokens, flagged at 1.5 times; the research child's window is "the owner's decision" and has no W* (`thresholds.json:23-26`,
`W_star_child` null; v2:44-46). (e) Number of questions: no limit in code or record (not recorded); keys are grouped by
mechanism and a group is the atom (cost.mjs:326). (f) Observed in practice, not from the design: one orchestrator child reached
132,000 tokens after one wave of five collectors and stopped as briefed (library r57-0126, observed).

**F4. What is decided and what is "later".** Decided and coded (pilot set): admission with slot, memory and budget terms
(admit.mjs:220-261), the coordinator drain at W*_coord (watch.mjs:516-521), per-task spend limits and the overflow
record "cut" (`tcb/replace.mjs:497`, lib ledger kind 'overflow', lib.mjs:77), pack capacity check (commit.mjs:752-763), the
two-level pack index (commit.mjs:417-434). Later, by DESIGN-RECORD.md:18 and v2:677-680 (quoted/observed): plan-tree bulk load,
the hook's budget check R48(a), redistribution R48(c), split with a separator R48(d), the roll-over R49, the research
child's W* R50 (option b), Smith's order R51. Not built: `tcb/plan-tree.mjs` does not exist (observed). Deleted: "the watcher's
deadline exit", "pause detection" and others (DESIGN-RECORD.md:18).
Overflow today: v2:172-173 (R11, quoted) - "Cutting a task writes an overflow record {ids, tokens, reason} to the ledger,
and those ids stay visible as not covered"; so a full leaf is cut and the rest listed, not split (the pilot). Before synthesis the
design says that once (d) exists "this replaces "cut the pack and list the rest"" (v2:463-465).

**F5. The attack round's verdict and the owner's "rejection".** Verdict, quoted at ATTACK-AND-COST-RECORD.md:37: "the tree as
a plain hierarchy earns its place (... 4.4 against 17.2 for independent agents; hierarchy lost -5.51 against -23.72 for a chain).
The B+ tree analogy does not earn its place". The 4.4/17.2 figure carries the paper's own caveat: "the paper notes that the effect loses
significance after its controls" (protocol v1:272-273, quoted). Ranked change 10 asked to delete "split on overflow"
(ATTACK:33). The owner's words that bear on it are the ones in v2:20-22 (B+ trees named; see S5b). A sentence in which the
owner rejects removing the split was not found in any file (not recorded). The sources of 4.4/17.2 and -5.51/-23.72 belong to the
`hierarchy` collector, not to this file.

**F6. Hand-over law.** Harris 1913 / Young 1974: "tokens per work call are least at k* = √(2H0/g), so W* = P + S + √(2H0·g);
with state growth k* = √((2H0 + σ·n_rem)/g), re-applied each epoch" (v2:471-473, R50, quoted). Coordinator: H0 = 432.4k, k* = 17.6
calls, W* = 133.2k (weighted 157.1k) (DESIGN-RECORD.md:125, "E": estimated, library r57-0404 "designed-only ... not measured on a tree run").
Research child, g = 2.8k: k* = 16.1, W* = 115.0k; 5.0k: 130.1k; 10.0k: 155.0k (DESIGN-RECORD.md:126). The plain law "gave about half the best interval
found by simulation (16 calls against 35)" (x20-0115, measured in simulation only). Inputs are guesses (g, S0, sigma). It is a law of
the window (growth per call against reload cost), stated as a ratio in the "hand-over pays from n = 29 calls" and "split, do not
hand over" tests: reload >= useful growth from epoch 5 (g=2.8k) (ATTACK-AND-COST-RECORD.md:140; cost.mjs:225, 410). v2 R49: roll
over a leaf until "S ≥ g·k*, or past n_max = k*(g·k* − S0)/σ calls, the range splits by R48(d)" (v2:467-470, quoted): that is the
one place the design says when a leaf must split instead of handing over (reasoned: it is a law in ratios, S against g·k*).
`research-tree/FAULTS-AND-FIXES.md:49-53` says the rules on splitting "disagree with each other" (D2-01/02 split at plan time, D3-12 not in
the middle of research, D3-01 when the window nears its limit) and tells the builder to settle that "before touching splitting" (quoted).

**F7. Fan-out, depth and node count of the one run there was.** There has been no run of the tree: START-HERE.md:20 (quoted) - "Not
done: The thirteen fixes in the scripts; the checks that need the app; the pilot; a first run of the tree". The nearest run is the
design step of 2026-11-16, run as a Workflow, not as a session tree: map 8 field experts (Opus) + 8 source checkers (Sonnet);
design 6 layer designers; model 1 builder + 1 reviewer; integrate/attack/settle 1 integrator + 4 refuters + 1 mapper + 1 reviser;
"1,484,854 [tokens] for the map (16 agents, 12 minutes) and 2,743,461 for the design, model and attack (15 agents, 82 minutes)"
(`docs/program/evidence/research-tree/foundations-2026-11-16/README.md`, quoted from the "Tokens" line). That is depth 1 below
the coordinator, fan-out 8, 16 and 15 agents per stage (observed). The present round (R:ROUND.md:3-9): top session, three child
orchestrators, five Sonnet collectors per child at once: depth 2 (top, lane, helper), fan-out 3 and 5, so 1 + 3 + 15 = 19 nodes
(observed from ROUND.md and the brief; the helpers start nothing). The R57 round of 2026-11-17: "about 7.67 million helper tokens over 33 runs of 14
helpers ... its coordinator window reached about 404,000 tokens" (library r57-0114, measured as the coordinator reported).
Planned shape: seven leaves under one coordinator, N_max 2 live children, never above 3 (admit.mjs:16; thresholds.json N_max 2
"guess"); b1-0123: "no measurement is cited" for the three.

**F8. Admission and watcher (coded), by what decides start, capacity and end.** Start: `admit.mjs decide(facts)` is pure
(admit.mjs:158) and gives reasons: slots (live + unknown + unconfirmed >= min(N_max, N_ceiling, 3), lines 220-233), memory
(free - reserve - peak × pending >= peak, lines 235-244), budget (only when B_tokens is set; null today: line 246-259), halted or
draining (line 261). Capacity: W_quality, C_node, e_task, N_max above. End: the watcher drains the coordinator at W*_coord
(watch.mjs:516-521), tells a child to commit at soft_frac × e_task and cuts at hard_frac (watch.mjs:425-426), and raises the
child's window limit only "under option b" (watch.mjs:430-431, `W_star_child` null, so never today). `slotFree` is one flag per tick from
N_max (watch.mjs:554; b1-0115). The same flat peak (1,200 MB) is used for every session (b1-0112). None of this knows a
node's place in a tree: all sessions are peers of one coordinator (reasoned: no parent or level field in `decide`'s facts; the
task rows carry task, epoch, step, e_task, attempts).

**F9. Which of the 13 fixes and 0b touch shape, admission, a parent, hand-over or overflow.** From `research-tree/BUILD-SIZE.md:21-55` and
`FIX-VS-SELECTIONS.md`: none touches shape, capacity, split or overflow. Admission: FX-CLAIM (changes `admit`, `replace`, `stop`, `handover`;
BUILD-SIZE.md:44) and FX-CLOSE (releases a finished child's slot; :46, :25 "D4c (committed child holds its slot)") and FX-PLAN (the planner's start acts, `watch.rowAct`; :48).
Parent (the coordinator): FX-CGATE (coordinator hook; "a stale coordinator starts a session"; :24, :45), FX-W3 (work needs a live confirmed arm; :51), FX-W4 (dead-man check; :52).
Hand-over: FX-CGATE and FX-CLAIM (both change `handover.mjs`), FX-W3 (`handover`). Not touching: 0b, FX-OUT, FX-REDO, FX-W1, W2, W5, W6, W7
(lib/hook/watch-only). So a change in shape would touch admit.mjs, replace.mjs, status.mjs and watch.mjs, the files that ten fixes
already edit (BUILD-SIZE.md:67-75). (observed)

**F10. The records b1-0101 to b1-0126 that bear on the shape.** b1-0112/0113/0115: admission is flat and guessed (above). b1-0121
(observed): "The tree's run-time writers share no work file: a child writes only its own staging folder, objects are stored by exclusive
create and never repaired, two disagreeing verdicts make the item 'unclear', and the task table is written by compare-and-set on its
revision." This matters for a split: the one shared writer is the task table (revision CAS, lib.mjs:3583-3587 as cited), so a new
leaf is one row. b1-0125 (reasoned): a waiting session costs tokens only at each wake and each wake re-reads the whole context,
once the cache lapses at the write weight 1.25 against 0.05 for a read. b1-0102 to 0107, 0122 to 0124, 0126 concern the lane,
recorder and tier hook, not the shape.

## Table: tree operation, what exists today, cost recorded

Costs in tokens and time are as the record gives them; the unit costs are estimates tagged G or E unless marked M.

| Tree operation | What exists today | Cost as recorded |
|---|---|---|
| Start a session (a node) | `replace.mjs start` runs admit `decide` inside the run lock; exit 6 on a refusal (replace.mjs:879-884, 926-933; b1-0114); child session started by the coordinator or the owner (a child cannot start sessions, r57-0126 observed: the app refused a start on a notice turn) | Fixed prefix about 60,000 tokens per agent before any work (x15-0104, x12-0104, measured; r57-0201 "about 60,000 tokens, not the 7,500 the design states"); session first call P = 79,000 (median of recorded main sessions; ATTACK:93). Time: not recorded for a start; five Sonnet readers together used 767,000 tokens in four minutes, under one point of the week (r57-0115, one trial), about 153,000 per reader. A hook start costs about 37 ms (r57-0106) |
| Search = routing a question | No router. Keys are approved question ids with one owning field (`protocol-freeze` R46, v2:447-449); the coordinator holds "one line per field and pointers to files" (v1:182-183, the B+ bullet) and a root fan-out capacity row count (cost.mjs:277, 401: rows of about 200 tokens that fit between P+S and W*) | Not recorded in tokens or time. Reasoned: each routing step by a coordinator is a model call over its whole window (every call re-reads its window, v2:441-444, quoted; growth about 2.8k tokens per call, E) |
| Insert = new work | An amendment before research; "A new field needs an amendment" (v1:277-278), only the owner drops a range (R48(e)); keys frozen in a protocol (`protocol-freeze.mjs`); a task row is added to the table by CAS (b1-0121) | Not recorded. While a run is going, nothing inserts new questions (v2:677: plan-tree later) |
| Split = hand half a range to a new session | Not built. Design: R48(d), "The overflow record (R11) becomes a new leaf whose separator is written into `tree-plan.json`, and the field's review reads both leaves through R17's two-level index" (v2:461-463, quoted; later). Today's overflow: cut and list (replace.mjs:497). cost.mjs prints separator keys in its sample (cost.mjs:434, 504) | Cost of a start (above, about 60,000 + brief) plus the reload of S0 = 10,000 tokens a successor reads (ATTACK:104, G). The research already done by the old leaf is paid and not divisible: "a B+ split costs one node copy; here the data is paid for and the window cannot be divided" (SELECTIONS-MAP.md:30, quoted). A split fires "after the research budget is spent" (v1:276-277 reason for withdrawal). Not measured |
| Merge | None. v2:499-500 (quoted): "Height, search, latches and merges add nothing" | Not recorded |
| Rebalance = redistribute to a sibling | Not built. R48(c) "a cross-field key may move to its co-owner" (later); D2-02 "redistribute an overflow range to a sibling with slack, else defer" (SELECTIONS-MAP.md:161) | Not recorded |
| Root change = new coordinator | Built: coordinator epoch `ce`, `handover.mjs init/raise/bind` (handover.mjs:1-6, observed); the drain blocks starts at W*_coord, quiescence = no live child of any epoch, the owner starts the successor from a one-line brief (v2:177-183, quoted) | Computed: H0 = 432.4k tokens at the coordinator, k* = 17.6 calls, W* = 133.2k (E; DESIGN-RECORD.md:125). Observed on recorded sessions: coordinator reached about 404,000 (r57-0114), 944,000 resent per call before compaction (x12-0218, observed). Not measured on a tree run |
| Hand-over of a leaf or coordinator | replace.mjs planned replacement, step machine in the task row (v2:134-142); H_max = 2 hand-overs plus parks per task (thresholds.json:11, "guess") | Coordinator count weights: reload per hand-over at full window; one child hand-over at g = 2.8k adds ~8,000 tokens of reloaded state per epoch (sigma, G); "hand-over total 44.98M against one session 730.8k window" in the model (DESIGN-RECORD.md:126; E/G inputs) |
| Buffer flush (batching messages to the parent) | Not built, and no buffer: the child's 400-character note per commit goes straight to the coordinator (v2:40, 49); the watcher wakes the coordinator by hint (R6) | Not recorded; each wake of a blocked session re-reads the context (b1-0125, reasoned) |
| A helper (reader/checker) | Third level; "starts nothing"; reader result returned as cards, child writes them (ATTACK:35); capacity check before each reader start in the hook (DESIGN-RECORD.md:38 conflict 9, line 592 of source) | About 60,000 prefix per agent (x15-0104); R57 round: "about 7.67 million helper tokens over 33 runs of 14 helpers" (r57-0114), about 232,000 per run on average (arithmetic, reasoned) |

## What this says about the lane's question (reasoned; for the analyst, no design)

1. The record chose a bulk-loaded B+ tree for the packing only, and it chose it for a job known up front. Growth, split, merge and a
   root above the coordinator exist only as "later" and are not coded. The design text itself says the split's data is paid for and
   cannot be divided (SELECTIONS-MAP.md:30), and that the research child's window is an open owner decision (v2:44-46). That is the
   point at which a B-link or buffered form would enter; this file does not judge it.
2. Three levels is a stated rule (v1:15), the "7-10 fields" is an expectation (DESIGN-RECORD.md:162). Neither covers a very large
   project (owner, r57-0028 - quoted in the library: the harness must hold across projects of different size).
3. The admission code is flat (all children peers); a larger shape needs a parent field in the task rows. That is not recorded
   anywhere (observed: not in `decide`'s facts).
4. Every cost figure above is estimated or from other repositories (FixFlow, clinic); none is measured on a tree run (r57-0404).
