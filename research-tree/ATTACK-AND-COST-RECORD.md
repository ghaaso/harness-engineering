This file extracts, without judgment, the recorded attack on the research tree's 14-row risk list (2026-11-16) and its cost model. Sources (under docs/program/evidence/research-tree/): attack-2026-11-16/README.md and result.json; foundations-2026-11-16/cost/computed.txt and cost/inputs.json; foundations-2026-11-16/model/README.md. "rj" = result.json, line numbers given. Row and card ids (L1-05, R2-01) are as in the source.

## 1. The 14 risk rows (rj rows, lines 752-942)

Totals (README.md:24, rj row statuses): 10 hold with a change, 4 do not hold (rows 7, 9, 12, 13).

1. Holds with a change (rj:754). Per-stage gates cut surviving errors from 58.4% to 16.2%. Change: replace the 95% sample gate; every card cited in pack.md's conclusions and in review.json must be confirmed (script checks link and quote; checker checks number, conditions, citing sentence). Sample failure rate becomes a ledger measure. Checker brief is a fixed file outside the child's folder; CHECK.json goes in the checker's own folder.
2. Holds with a change (rj:769). Leak is in the child writing its own question list from a direction file that states the owner's hopes. Change: before wave 1 the coordinator writes all seven question lists in one file (open questions, ids, no overlap, no hopes); owner approves at the first gate; children never see the direction file; problem sheet labels our sinks "one repository".
3. Holds with a change (rj:783). Facts are not voted on (holds); "agreement means something" does not (two wrong models agree 42.3% of the time). Change: second expert is a second fresh reviewer reading the same frozen pack, from a different model family if available. Disagreement marks a claim weak; agreement never raises one. Coordinator picks fields after the first reviews. Delete amendment 1 step 4 and the agreement clause of row 3.
4. Holds with a change (rj:799). Typed hand-over files hold up (structured 0.800 against summarising secretary 0.241). But the synthesis script does not exist. Change: coordinator fixes approach ids per field; review.json keyed by approach id and measure; script lists every key where verdicts differ as "experts disagree" with reasons, cards, cheapest decisive test; card conditions copied field by field. Schemas, check script and synthesis script written and run on the pilot field before wave 1.
5. Holds with a change (rj:815). "Instruction in a source is data" is a wish: injection succeeded about 1 in 4 on web agents; the review itself saw it (L3-07, L3-15 notes). Change: readers hold no write or shell tools, return cards as their result, the child writes the file; schema rejects text outside card fields; quote at most 15 words; child reads originals only from must-read sources with confirmed cards.
6. Holds with a change (rj:827). Two shared files break "one writer per folder": research/LEDGER.jsonl and the source register. Locking made 20 agents run at the throughput of 2-3. Change: each session writes its ledger lines in its own folder, a script merges; each child in its own git worktree; delete the source register.
7. DOES NOT HOLD (rj:838). The shared register races, contradicts rule 7.1, de-duplicates nothing across worktrees, blocks independent reading of central papers. Change: delete the register; field boundaries come from coordinator-written question lists; accept some overlap; a script counts duplicate citation ids across cards.jsonl files as a ledger measure; synthesis removes duplicates by citation id.
8. Holds with a change (rj:851). Three levels, helpers that start nothing, at most six helpers per child hold (turns 7.2 single against 27.7 centralized; exponent about 1.724). "A total cap" has no figure and no one who stops at it; unclear whether the coordinator counts in "three at once". Change: make the total cap the admission rule of row 14; state the coordinator is the fourth process, or that waves hold two children.
9. DOES NOT HOLD (rj:861). Every handler lacks a runner: nobody reads the heartbeat, "reported" has no recipient, usage read only before and after a wave, a coordinator that ended its turn cannot act. Change: one background watcher script per wave; polls child folders and session records; writes status.json (state, tokens, age of last progress, repair or done file); exits on first event (done, repair request, no new confirmed card or file within the time box, usage over the field's allowance); exit wakes the coordinator, which stops a stalled session before replacing it.
10. Holds with a change (rj:873). State in files is right, but "started again from its folder" restores an expert only if a frozen pack exists; four different restart paths exist. Change: one path; any child that cannot go on is replaced by a fresh session reading the frozen pack and must-read sections, ledger marks "from pack"; if no pack yet, the field restarts from its cards.jsonl.
11. Holds with a change (rj:885). Focused context beats full (about 300 tokens against about 113k). But the coordinator has duties that need reading, and its 200,000-token hand-over is a self-written summary. Change: problem sheet becomes a leaf session; gate A coverage becomes a script (every question id covered by at least one confirmed card); at hand-over the coordinator's state is the watcher's status.json.
12. DOES NOT HOLD (rj:899). Nothing bounds spend; 300,000 is a window size; the review runs at the most crowded point of the window; multi-agent research used about 15x the tokens of chat; nobody measures the "lean folder" claim. Change: review in a fresh session from the frozen pack; delete the 60,000 floor on the pack; each reader gets several sub-questions in one window; pilot reads one reader's first-call context from its transcript and records it.
13. DOES NOT HOLD (rj:915). Under amendment 1 the knowledge check is a self-test: child writes probe.json and answers it with its own cards in window (a self-written reference gave 0.16 when the judge was wrong, against 0.83 with a human reference). Change: delete the self-written probe; certify the expert by four checks: (1) coverage of the coordinator-written question ids by confirmed cards; (2) reviewer's input manifest (pack hash, must-read list, fixed review files) matches its read calls; (3) every cited card confirmed and used within its conditions; (4) a verdict resting only on vendor or single-study cards is marked as judgment.
14. Holds with a change (rj:931). A pilot is the only place a budget can be grounded. But part C runs the measurement field before the pilot (protocol lines 187-188 against 177), nothing turns the pilot's number into a stop, token counts are self-reported by models that cannot see them. Change: the measurement field is the pilot; count tokens from session transcripts by script; write and test schemas, check script, synthesis script and watcher on its files; a wave starts only if the remaining budget covers its fields at the pilot's measured cost per field, with a margin the owner sets.

## 2. Ranked changes (rj changes_ranked, lines 1031-1204)

1. Every review by a fresh session from the frozen pack, must-read sections and fixed review files; one path also covers ceiling, crash, repair, second expert, methodologist's late review; deletes amendment 1 steps 3 and 5 and restart rules of lines 62, 73, 173. Needs the owner's word. Cost: one more session start per field, risk the pack loses caveats; reverses part of amendment 1. (rj:1033)
2. Delete the self-written probe and the 95% sample gate; check every card cited in pack.md and review.json; sample failure rate becomes a ledger measure; checker's brief fixed outside the child's folder. Cost: one checker pass after each review. (rj:1052)
3. The coordinator never reads: writes all seven question lists and approach ids before wave 1, owner approves at first gate; children get their list not the direction file; gate A coverage a script; problem sheet a leaf session with published cost breakdowns and sinks labelled "one repository". (rj:1070)
4. Delete the shared source register; per-session ledgers merged by script; token counts from transcripts; one git worktree per child. (rj:1086)
5. One watcher script per wave replaces heartbeat, PC-awake rule, "reported" and per-wave usage read; coordinator stops a stalled session before replacing it and hands over by pointing to status.json. Open: whether a background process can hold the PC awake. (rj:1100)
6. Budget: delete the half/quarter split (section 9) and per-pack and per-expert ceilings (line 96); one admission rule (a wave starts only if the remaining cap covers its fields at the pilot's measured cost per field); read usage after every field; state whether the coordinator counts in the three-session limit. (rj:1112)
7. The measurement field is the pilot; schemas, check script, synthesis script, watcher run on it before wave 1; single-session control on the same field, equal budget and checks, score fixed beforehand (confirmed-citation share, condition-fit failures, tokens, time), recorded as a reading. Cost: one extra field run. (rj:1125)
8. Second expert = second fresh reviewer from the same frozen pack, different model family where available; fields chosen after first reviews; disagreement marks weak, agreement never raises. Cost: loses independent research (owner's call). (rj:1141)
9. Aim the one refuter at every dismissal verdict on a family and every dropped field, not the three strongest leads. Basis: argument_only. (rj:1157)
10. Delete B+ bullets "balanced", "inner nodes hold keys", "split on overflow"; an over-limit pack is cut to its limit, rest listed under "not covered", new field only by amendment; delete the 60,000 floor. (rj:1167)
11. Card evidence field becomes an enum (replicated, independent, single-study, vendor's own); script marks verdicts resting only on vendor or single-study cards as judgment; earlier research files join the coverage seed list. Logging every search query left out. (rj:1181)
12. Readers: several sub-questions each, no write or shell tools, cards returned as result and written by the child, schema rejects text outside card fields; pilot records one reader's first-call context. Open: whether the prefix is mostly tool schemas. (rj:1193)

Shape verdict (rj:1022-1028): the tree as a plain hierarchy earns its place (centralized check trace-level error amplification 4.4 against 17.2 for independent agents; hierarchy lost -5.51 against -23.72 for a chain). The B+ tree analogy does not earn its place; keep "order of work" and the scored single-session control as plain rules.

## 3. New risks the list did not name (rj new_risks, lines 944-1020)

README.md:24 says six, and the coordinator added a seventh "that the check itself showed". The seventh is not in new_risks (6 entries); I could not find it named in result.json.
1. False negatives: a dismissed lead or dropped field is never challenged. Severity high; basis argument_only. Handling: aim the one refuter at every dismissal and dropped field. (rj:946)
2. Selection bias: search ranking and vendor reports decide what the expert knows. Medium; both. Handling: evidence enum, vendor/single-study marked as judgment, earlier research files in the seed list. (rj:956)
3. A correct card applied outside its conditions. Medium; both. Handling: checker judges condition fit; failure rate to ledger; review above an owner-set rate returned once. (rj:972)
4. The tree may not beat one session at the same budget (0.418 single against 0.379-0.388 multi-agent at 1k on multi-hop; teams +80.8% on decomposable, -50.3% to -70.0% on sequential). Medium; checked_source. Handling: single-session control on the pilot field. (rj:984)
5. A child that is busy but not progressing. Medium; checked_source. Handling: watcher measures new confirmed cards or files, exits on none within the time box. (rj:998)
6. The checker and the checked share blind spots where the check is a judgment. Low; checked_source. Handling: ground every check in the quoted source passage; different model family for unavoidable judgments. (rj:1009)

## 4. What the check could not establish (rj not_established, lines 1259-1269)

- Whether a tree of sessions beats one session at the same budget for literature research and review (matched-budget evidence covers multi-hop QA and coding; the research-system gain is an internal vendor evaluation without a matched-token baseline, L2-01).
- The week's allowance in tokens and how cache reads count against it, so whether 10% of the week covers the plan at all.
- Whether a fresh reviewer from a frozen pack loses more (compressed caveats, re-fetching) than it gains from a focused window; no source compares the two for expert review.
- Whether a model family other than the child's is available for checkers and second reviewers.
- Whether the 10-of-12 threshold or any knowledge-check threshold is calibrated against anything.
- Whether search ranking and the predominance of vendor reports materially shift the verdicts.
- Whether injected instructions in papers a child reads in the original can steer it (rates measured are for browsing agents, L3-15).
- Whether a background watcher can hold the PC awake and wake the coordinator reliably on this harness.
- What share of the helpers' fixed prefix a lean folder actually removes.

Limits of the check itself (README.md:27-36): sources reached through a fetch tool that returns a short summary written by a small model; nobody read a paper end to end; "confirmed" = two agents asking separately got the same numbers; several sources are single preprints or vendor reports; no source measured a tree of this shape. Counts (README.md:18-24): 10 agents, 1,183,768 subagent tokens, 17 minutes, 242 tool calls; 45 literature findings (31 confirmed as written, 14 with a correction, none dropped); 36 refuter findings (17 high, 19 medium); mapper rejected 10 findings or fixes.

## 5. The owner's requirement (rj owners_requirement, line 1030), as written
What the sources support. A focused context beats a long, mixed one: every model scored higher on focused (about 300 tokens) than full (about 113k) input, one distractor lowered scores, and information in the middle is used worse (L2-12, L2-11, L3-12). A reviewer given a verified reference grades far better than a cold read: with a human reference the judge reached 0.83 on items it had itself got wrong, against 0.30 without one (L3-11). Fresh-context reviewers avoid the writer's context rot (L2-10). Checks work when they use something outside the draft, such as the source, tool output or another model, and fail when the model re-reads its own work (L1-12). So 'expert first' is right if the expertise is checked against sources and held in a focused window.
What the sources say against, or as limits. Knowledge packed by the same model carries that model's errors: a self-written reference repeated the judge's mistakes (0.16 when the judge was wrong), errors correlate within a provider, and self-preference persists after labels are removed (L3-11, L1-14, L3-09). Filling the window has diminishing or negative returns past a point (L2-11, L3-12). Packing knowledge compresses away caveats and the artifact trail unless they are typed fields (L1-08, L1-09, L2-15). A summarising middle step recovered far less than full disclosure (L1-07: 0.241 against 0.926). Anchoring and sycophancy survive prompt fixes and need neutral, question-form briefs (L3-07, L3-08). An expert's knowledge is also only as fair as the sources its search surfaced.
What the design delivers. Source cards with number, baseline, conditions, limits and a quote. A checker that opens sources and drops cards that fail. A review form in which every factual sentence cites a card and judgment is marked. Our work given as files, without the coordinator's opinion. A fixed list of review inputs.
Where it fails. Amendment 1 has the child review in the same window that holds its research process, including cards the checker later dropped and a pack of up to 90,000 tokens written out, so 'filled precisely, nothing else' (line 11) is no longer testable. The knowledge check is a self-set exam with self-written keys. The question list is written from a file that states the owner's hopes. The checker confirms transcription, not selection. The review likely runs near the 300,000 ceiling.
The design delivers the requirement if the review is done by a fresh session that reads only the frozen, checked pack, the must-read originals and the fixed review files, as sections 4 and 5 originally said. A script then checks its input manifest, and its expertise is certified by coverage of a coordinator-written question list and by an outside check of every card it cites, not by a self-quiz. This reverses part of amendment 1, so it is the owner's call under rule 7.8.
(Note: CLAUDE.md of the repo now puts design questions as not for the owner, rule 7; the record's "owner's call" predates it.)
## 6. Rejected findings or fixes (rj rejected, lines 1206-1246): 10

1. R2-01 numbers: structural point accepted under change 6, but per-field and per-programme token estimates come from files outside the review's inputs; nothing rests on them.
2. R2-02 smallest fix (write pack and cards through a script): does not remove the tokens, the model must generate the map, grouping and disagreements; solved by change 1.
3. R1-05 multiplier 1.5: no basis in sources or protocol; admission rule kept, margin left to the owner.
4. R3-01 blind probe with questions outside the cards: a second partial research run per field; coverage list and refuter on dismissals are cheaper.
5. R3-06 refuter rules on judgment conflicts: adds a ruling round; debate added little over voting (L3-01, L3-03). Keyed conflict detector accepted; judgment conflicts go to the owner's table with each side's cheapest decisive test.
6. R3-07 two-pass review with hash-frozen verdicts and diffs: too much machinery; labelling and coordinator-written lists accepted.
7. R3-09 read-only lookup register: still a shared cross-field file; deleting the register is simpler.
8. R3-05 agreement counts only if each side cites a card the other does not: "agreement never raises a claim" does the same more simply.
9. R3-04 logging every search query: more ledger machinery than the risk warrants.
10. R2-09 prefix figures: split of agent prefix into tool schemas and rest comes from outside files; only the measurement fix kept.

Also recorded (rj for_the_judge, 1248-1257): fresh reviewer against same-window reviewer, sources split (focus favours fresh; compression losses favour keeping the researcher's window; L1-07 0.241 against 0.926); error spread in a tree has either sign (L1-05 snowball, L1-06 damping), so the pilot should measure it; the lean folder is unsettled (R1 holds, R2 says wrong part of the prefix); the refuters' window arithmetic uses estimated sizes, how often the ceiling binds is unmeasured.

## 7. The cost model (cost/inputs.json, cost/computed.txt)

Tags in inputs.json:2: M = measured on the record; E = computed from measured numbers under a stated transfer; G = a guess the pilot must replace; I = illustrative only, never a plan figure. Source paths below are under harness-engineering/docs/program/.

### Inputs (inputs.json)

| Name | Value | Unit | Tag | Source as stated |
|---|---|---|---|---|
| coordinator.P | 79000 | tokens | M | SPLIT-RULE-2026-11.md:138-139 first call of a recorded main session, median (75k-88k by group) |
| coordinator.S | 5000 | tokens | G | status file size; script-written (D2-04, D1-10); pilot measures |
| coordinator.g | 2800 | tokens per call | E | SPLIT-RULE:609 session windows grow 2.8k per call; transfer to coordinator is the assumption |
| coordinator.hc | 2 | hand-over calls at full window | G | SPLIT-RULE:475 middle case |
| coordinator.o | 2.6 | fewer state-changing calls in the 30 after compaction | E | AFTER-COMPACTION-2026-11.md:772-779; transfer to fresh successor assumed |
| coordinator.qf | 0.5 | failed call per compaction | E | AFTER-COMPACTION:39 |
| coordinator.w | 4000 | tokens written at hand-over | G | SPLIT-RULE:472,475; zero if status is script-generated (D2-04) |
| coordinator.sigma | 0 | reloaded-state growth per epoch | G | status file regenerated, not accumulated |
| coordinator.fixed_line | 200000 | tokens | M | RESEARCH-TREE-PROTOCOL-2026-11-16.md:174 present hand-over at 200,000 |
| coordinator.recorded_avg_per_call | 333000 to 396000 | tokens context per call | M | TOKEN-BOTTLENECK-2026-11.md:22 main session average |
| child.P | 60000 | tokens | G | lean-folder prefix unknown; TOKEN-BOTTLENECK:44 gives about 60k per agent today |
| child.S0 | 10000 | tokens | G | brief plus question list plus status pointer for a successor |
| child.sigma | 8000 | tokens per epoch | G | cards a successor must reload |
| child.g_sweep | 2800, 5000, 10000 | tokens per call | G | 2.8k is the session measure (SPLIT-RULE:609); a research child may grow faster |
| child.hc, o, qf, w | 2; 2.6; 0.5; 4000 | as coordinator | G/E/E/G | as coordinator |
| child.n | 237 | work calls per field | E | 22,962 calls / 97 session windows, SPLIT-RULE:605-606; stand-in until pilot counts |
| child.W_quality | 300000 | tokens | G | PROTOCOL:142 owner's 300,000 ceiling; no quality curve measured (SPLIT-RULE:146 TK-FILL) |
| review.pack | 75000 | tokens | G | PROTOCOL:49 designed 60k-90k (floor later deleted); pilot measures |
| review.n_rev | 40 | calls | G | pilot measures |
| review.g_rev | 2800 | tokens per call | E | session growth per call |
| review.R_rev | 60000 | tokens | G | review working tokens reserved in reviewer window |
| weights | read 0.05, write 1.25, out 5 | x input price | M | evidence/token-spend/pricing.json, ratios only (Opus and Sonnet cache_read 0.05 x input, cache_write_5m 1.25 x, output 5 x) |
| packing.f | 0.75 | fill fraction | G | D2-01 start 0.7-0.8; ln 2 holds only under random growth (Yao 1978 correction), so f is chosen slack, not a theorem |
| packing.C_node, A_leaf | 1.0, 1.0 | normalised | I | capacity normalised; real C = W_quality - P - R_rev |
| packing.questions | 10 illustrative keys (F7-A-01..F7-D-02) | share of capacity | I | exercises bulk load only |
| concurrency.N_cap | 3 | child sessions at once | M | harness fact 1: at most three child sessions on this PC |
| concurrency.free_mb | 4096 | MB | G | os.freemem() at admission |
| concurrency.reserve_mb | 1024 | MB | G | owner sets |
| concurrency.rss_mb | 1200 | MB per session peak | G | pilot measures (D3-03) |
| concurrency.s_sweep | 0.2, 0.4, 0.6 | serial fraction | I | pilot measures (D3-11) |
| admission.z | 1.64 | | G | D6-13 default |
| admission.between_field_cv2 | 0.25 | | G | D6-13 inflation until two or more fields are measured |
| admission.m_owner | 0.2 | | G | owner's floor (F4) |
| admission.remaining_in_pilot_units | 6 | pilot-field costs | I | illustrative |
| admission.theta | 1.5 | actual/estimate | G | D2-12 in-run re-plan ratio |
| order | F2 w3 est1.0; F3 w1 0.8; F4 w3 1.4; F5 w1 0.6; F6 w2 0.9; F7 w3 1.2 | weight, estimate | I | illustrative |

### Computed figures (computed.txt, line numbers)

[1] Coordinator (line 3-6), count optimum: H0=432.4k; k*=17.6 calls between hand-overs; W*=133.2k; tokens per work call at k*=137.4k; at the 200k line (k=41)=156.6k; recorded main-session average=333.0k-396.0k. With a script-written status (w=0): k*=17.5, W*=133.0k. Weighted cost: k*=26.1, W*=157.1k (cost optimum hands over later than count optimum). Root fan-out capacity: 246 rows of about 200 tokens between P+S and W*.

[2] Research child, n=237 work calls, state grows 8.0k per epoch, quality cap 300.0k (lines 8-11):
| g (tokens/call) | count k* / W* | cost k* / W* | one session | hand-over at k* | best constant k (count / cost) | adaptive k | n_max | ratio one/hand-over (count / weighted) | break-even |
|---|---|---|---|---|---|---|---|---|---|
| 2.8k | 16.1 / 115.0k | 26.8 / 145.1k | 94.89M, window reaches 730.8k, over cap | 44.98M, 14 hand-overs | k=35 37.17M / k=48 | 37.56M, 8 hand-overs, max window 190.4k | 289 | 2.11 / 1.22 | n=29 |
| 5.0k | 12.0 / 130.1k | 20.1 / 170.3k | 156.42M, window 1250.0k, over cap | 57.41M, 19 hand-overs | k=27 45.46M / k=40 | 46.42M, 11 hand-overs, max window 240.0k | 298 | 2.72 / 1.35 | n=22 |
| 10.0k | 8.5 / 155.0k | 14.2 / 211.9k | 296.25M, window 2430.0k, over cap | 84.35M, 29 hand-overs | k=20 60.03M / k=30 | 61.34M, 15 hand-overs, max window 312.0k | 307 | 3.51 / 1.43 | n=16 |
Also per row: reload >= useful growth from epoch 5 (g=2.8k), 7 (5.0k), 9 (10.0k) at k* ("split, do not hand over"); adaptive k reload >= growth from epoch 8, 11 (and none stated at 10k); law with state growth k*=30.6, 22.9, 16.2. Units of the token totals: "M" as printed, tokens (not stated beyond that).

[3] F1 token price, n=237 research + 40 review calls (lines 13-17): same session vs hand-over research + fresh reviewer (7.58M, window 244.2k):
- g=2.8k: 126.42M (window 842.8k) against 44.98M + 7.58M = 52.57M; ratio 2.40
- g=5.0k: 210.52M (1450.0k) against 57.41M + 7.58M = 65.00M; ratio 3.24
- g=10.0k: 401.65M (2830.0k) against 84.35M + 7.58M = 91.93M; ratio 4.37
- Reviewer node capacity for the pack: W_quality - P - R_rev = 180.0k.

[4] Token fan-out (D3-12), g=2.8k: k_opt = n/k* = 14.8 windows of about 16 calls for n=237. "These are window epochs, sequential or parallel; they are not fields." (line 19)

[5] Bulk load, illustrative keys, f=0.75: spend 1.33, pack 1.03 of one leaf; lower bound 2 leaves; packed into 2: leaf 1 F7-A,F7-B spend 0.65 pack 0.51; leaf 2 F7-C,F7-D spend 0.68 pack 0.52; separator key F7-C. (Illustrative inputs.)

[6] Load control: N_mem=2, N=min(cap 3, N_mem)=2. Speedup S(1..3): s=0.2: 1.00 1.67 2.14 (third slot gain 0.48); s=0.4: 1.00 1.43 1.67 (0.24); s=0.6: 1.00 1.25 1.36 (0.11). "time only; tokens never fall with N". (s is illustrative.)

[7] Admission: escrow per field = estimate x 1.82 until two fields are measured; with 6 pilot-units left, at most 3 pilot-sized fields can be reserved at once; in-run re-plan when actual/estimate > 1.5.

[8] Order after the pilot (w/est, highest first): F2(3.00) > F7(2.50) > F6(2.22) > F4(2.14) > F5(1.67) > F3(1.25). (Illustrative weights.)

### Conclusions the record draws (stated in computed.txt itself; computed.txt has no prose beyond these notes)

- Width of the tree: "no inner level is ever needed for 7-10 fields" (root fan-out capacity 246 rows). Token fan-out of one child is 14.8 window epochs, which "are not fields" (line 19).
- Children at once: N = min(cap 3, N_mem) = 2 on the example memory; a third slot gains time only (0.48, 0.24, 0.11 by s); "tokens never fall with N".
- Hand-over: one session over the whole child run reaches 730.8k to 2430.0k window, over the 300k quality cap; hand-over at k* cuts tokens by ratio 2.11 to 3.51 (count) and 1.22 to 1.43 (weighted). Hand-over pays from n=29, 22, 16 calls. The cost optimum hands over later than the count optimum (coordinator k* 17.6 against 26.1; child 16.1 against 26.8 at g=2.8k). At k* reload cost reaches useful growth from epoch 5-9, so "split, do not hand over" beyond that. Adaptive k (law re-applied each epoch) comes within about 1% of the best constant k found by simulation (37.56M against 37.17M at g=2.8k).
- Token cost of a fresh reviewer: same-session review costs 2.40 to 4.37 times a hand-over research plus fresh reviewer (F1).
- Coordinator: handing over at k*=17.6 calls (W*=133.2k) beats the fixed 200k line (156.6k per call at k=41) and the recorded 333k-396k average per call. Script-written status gives w=0 and barely moves k* (17.5).
- Caveat in inputs.json: only P(coordinator), fixed_line, recorded average, weights and N_cap are tagged M; g, o, qf, n and the review sizes are E or G and "the pilot must replace" the G values; packing, s_sweep, order and remaining_in_pilot_units are illustrative only.

## 8. What the first protocol model covered (model/README.md)

Explicit-state model of "Layer 1: Execution (version 2)", plain Node 24, no packages. model.mjs holds the protocol (task table, epochs, fencing, commit, watcher, wakes, replace, limits, admission, hand-over) and faults as budgeted actions. check.mjs does BFS over all interleavings: safety (invariants and per-transition checks), deadlock, AG EF(resolved) per field, fair-cycle search for an unsuspected loop. Run: node check.mjs (about 40 s), or node check.mjs SPEC (one run by id; SPEC-R1 = the spec's own R=1). Config: 2 fields (one task each), R=2, N_max=3, one coordinator hand-over, at most 2 faults per run (FIXED-K3: 3), 1 planned task hand-over. Time abstract: a watcher tick waits until every healthy current child has progressed, except after a pause or at a new watcher's first evaluation. Flags: one per spec mechanism (ablations switch one off) and FIX_* (smallest fixes; all off = spec as written). SPEC = spec as written; FIXED = spec + fixes; A-* = one mechanism removed from FIXED (A-COMMIT-SPEC from SPEC); traces shown only where a property newly fails. Coordinator turns atomic except the window between a replace's fence and its stop.
Not modelled: spend, escrow, memory, meter, common cause, intents beyond level re-check, coordinator crash, review stages and dependencies.
