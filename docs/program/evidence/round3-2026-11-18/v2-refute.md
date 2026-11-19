# v2 refute (step 2b, kind refute, Opus, fresh context, 2026-11-19)

145 statements, `V2-001` to `V2-145`. Confirmed 86, holds in part 53, refuted 1, cannot be checked 5.

Read: `R:v2-claims.md`, `B:DECISION-RULE.md` (v1) and the five refute files in full; the four claims files by id and
around it, `R:a1-claims.md` in full because nearly every a1 id is cited. Not opened: the draft, the lane reports, the
state files. Each statement is judged as `R:v2-claims.md` words it. The draft's marks are not in that file, so
question 6 is judged only where the wording or the use column states a mark or asserts a transfer as fact.

Places: `a1-r1`, `a1-r2`, `c1-r`, `w1-r`, `t1-r` are the refute files (`R:a1-refute-1.md` and so on), `a1-c`, `c1-c`,
`w1-c`, `t1-c` the claims files, `v1` the decision rule; a number after a colon is a line. "Corrected" means the
refuter's corrected claim.

| id | verdict | fails | reason |
|---|---|---|---|
| V2-001 | holds in part | 1, 4, 6 | "One rule, not a switch" is v1's (v1:26-29, 163-165), not in A29, A30 or A71; RFC 2698 colours a packet yellow and still passes it (a1-r1:33), so only A30 gates on every bucket. v1 keeps tokens a budget, not a width (v1:80-83); "the same minimum" is A71's transfer, a hypothesis. |
| V2-002 | confirmed | none | C92's parent-window part was not corrected (t1-r:331-333); C09 confirmed. A transfer, so a hypothesis. |
| V2-003 | holds in part | 1 | The second stop and v1's single stop are right (C91; C92 at t1-r:331-333). EASY kills at the stated length and the kill wastes the tokens (a1-r2:24, 42); "commits and ends" is C92's other option, not EASY's. EASY's reservation needs a time cap; the tree's cut is a token budget (t1-c C07), which bounds time only through the spend rate. |
| V2-004 | holds in part | 1 | A82 holds "when demand exceeds a window" (a1-c:572); without it, a window ahead of its line limits nothing while demand stays under the reduced rate. Otherwise A82 (a1-r2:45), a hypothesis. |
| V2-005 | holds in part | 1, 5 | Yahoo re-plans the rest over the rest (A11). LinkedIn does not: it multiplies a participation rate by 1.1 or 0.9 each minute against a fixed plan (a1-c:109-113; a1-r1:18). Both are self-reported (a1-c A11, A14) and not marked so here. |
| V2-006 | holds in part | 2 | A05 corrected: the gap "can be a large share" when one unit can cost several times the per-round budget (a1-r1:9); "large at tens of units" drops the condition. Not banking a lull is A69 corrected (a1-r2:32). |
| V2-007 | holds in part | 2, 4 | "Zero while u ≤ s" is A69 as first written. Corrected, the price form can be positive below the line after a lull (a1-r2:32), and a burst of lumpy units raises it under the line (A70, a1-r2:33); under re-planning it is zero only while demand fits the rate. Neither correction is cited. |
| V2-008 | holds in part | 1 | A41 corrected: nothing is documented about a wrap-up at the weekly limit (a1-r1:45); "only at the 5-hour limit" turns a gap into a fact. The latency margin guards a lag that is not documented (a1-r2:38) and rests on a designed-only record. |
| V2-009 | confirmed | none | Follows A76's refutation and A15 (a1-r2:39; a1-r1:19); margin and condition are left to measurement (Q13, Q14). |
| V2-010 | holds in part | 1, 6 | A29 and A30 hold when each packet's or cell's cost is known on arrival (a1-c:222, 229); admitting on expected usage lies outside them, as A70's refuter says of A01 (a1-r2:33). Which windows a unit draws on is unmeasured (a1-r2:34). A transfer, so a hypothesis. |
| V2-011 | holds in part | 2 | A72 corrected: under A05 a window behind its line can still carry a positive price, so both prices are kept (a1-r2:35); the dearer price alone is exact only for a stateless price. A23: the sum is exact only for additive costs, not shown for windows that count the same tokens (a1-c:178). |
| V2-012 | holds in part | 2 | A73 corrected holds "with two windows that count usage the same way" (a1-r2:36), which is undocumented; the statement drops it. Arithmetic (168/5) and the second ratio are right. |
| V2-013 | confirmed | none | A36-A39 (a1-r1:40-43); provider documentation, an undated page fetched 2026-11-19; limits may change (A43). |
| V2-014 | confirmed | none | A38, A40 corrected, A42, A43 (a1-r1:42, 44; a1-r2:5-6). A43's refuter adds that a further window may be added. |
| V2-015 | holds in part | 1 | A74 corrected stands (a1-r2:37). "Never applied to models" goes past A74's "no source read applies" (a1-c:534); v1 already records that none among those read is not none at all (v1:42-43). |
| V2-016 | holds in part | 1, 2 | Not all in dollars: AutoMix counts a fixed per-query unit ratio (a1-r2:7), Hybrid LLM a share of queries (a1-c:352). Not all at equal quality: RouteLLM's savings sit at 95, 92 and 87 % (a1-r2:8), Hybrid LLM lost 10-14 % (a1-r2:10). FrugalGPT's figures were read through the collector's note only (a1-r2:9). |
| V2-017 | confirmed | none | A12 and A77 corrected (a1-r1:16; a1-r2:40); self-reported, three campaigns, no variance. Its order against V2-018 and V2-020 is the draft's K7. |
| V2-018 | confirmed | none | Lifka and EASY++ (a1-r2:25, 18); it replaces the age cap only with an enforced cap, which V2-003 states (a1-r2:24, 42). A transfer: A79 is the hypothesis behind it. |
| V2-019 | confirmed | none | A55, A56 (a1-r2:18-19): a replay in a simulator; SDSC gained only 10 %. |
| V2-020 | holds in part | 1, 4 | A79 corrected shows the reservation rule reduces to first come, first served (a1-r2:42), not that this order is good: shortest first lowered wait 10 % alone (A55; A81 at a1-r2:44) and EASY++ is close to SJF (A58). v1 (v1:32-33, 96-97) and the lane design (C51) order by shortest expected check. |
| V2-021 | confirmed | none | A59, A57, A79 corrected (a1-r2:22, 20, 42); keying is marked untested. |
| V2-022 | confirmed | none | A57, A58, A61 (a1-r2:20-21, 24); +454 % is the average of rows from +38 to +920 %. |
| V2-023 | holds in part | 5 | "(self-reported)" fits MapReduce and Mantri (a1-c:470, 484); LATE and Dolly are research prototypes (a1-r2:28, 30). The four figures have four baselines, and MapReduce's 44 % is how much longer a sort took without copies (a1-c:471). |
| V2-024 | holds in part | 2 | A81 corrected holds "with exact lengths, independent units and no shared token window" (a1-r2:44); the statement drops the last two, and our units share windows. Arithmetic right (A68, a1-r2:31). |
| V2-025 | confirmed | none | A31-A33 (a1-r1:35-37). |
| V2-026 | holds in part | 1, 5 | A52's tracker sits in the prompt and raised resolve from 36.8 to 55.4 % (a1-r2:15): evidence for showing the budget in the prompt as well, not "not in the prompt". 32.8 % is GPT 4.1 mini; GPT 5 nano broke the budget in 12.4 %, on simulated tool prices (a1-r2:16). |
| V2-027 | holds in part | 2, 5 | The 90 % at 25 needs time to sell all at the run-out price, λ*t ≥ n (a1-r1:22); the 29 % assumes a unit 5 % of the window (a1-r2:41), a share no claim measured. The 94.5 % is A20 corrected (a1-r1:24). |
| V2-028 | confirmed | none | A16 corrected (a1-r1:20): budget life is the time to spend 95 %; impressions are unique impressions; self-reported. |
| V2-029 | confirmed | none | C01-C04, C09 (c1-r:5-8, 13); the mapping holds while the check is the only queueing centre (c1-r:6). |
| V2-030 | confirmed | none | C05-C07 (c1-r:9-11); c(S + Z)/S − (1 + cZ/S) = c − 1. Computed here and checked, not published in this form. |
| V2-031 | holds in part | 2 | The figures are the exponential model's (C08, C66 at c1-r:12, 70); a fixed-length suite with variable Z lowers the wait, not to zero (c1-r:12). The numbers are given without their model. |
| V2-032 | holds in part | 1 | C11 corrected: the accuracy figures are about the approximation and "do not say how much it matters" (c1-r:15); the spread is an input, its weight is not shown. |
| V2-033 | holds in part | 1, 2 | MySQL kept rising up to 32 threads, the most tried (c1-r:19): 32 is the end of the test, not a moved cap. Memcached moved with two changes (c1-r:18). "Only" is in no claim (C12-C15); by V2-030 the cap moves with c, S and Z. |
| V2-034 | holds in part | 1 | Suleman's 1 % is of the minimum execution time, not of the count (c1-r:20); on a simulator, for a section inside one program (v1:74). |
| V2-035 | confirmed | none | C17, C18 corrected (c1-r:21-22); one run per batch is V2-040's condition. |
| V2-036 | confirmed | none | C19, C20 (c1-r:23-24); gains 1/C from Table I (c1-r:22). Failures assumed independent (C65). |
| V2-037 | confirmed | none | C21-C23, C60 corrected (c1-r:25-27, 64): one by one is supported for time when rounds are slow, not for runs; a hypothesis on Sobel and Groll's remark. |
| V2-038 | confirmed | none | C27, C28 (c1-r:31-32): simulated, loads above 2/F0, no failures; the cap from p is in V2-035 and V2-050. |
| V2-039 | confirmed | none | C23-C26 corrected (c1-r:27-30). |
| V2-040 | confirmed | none | C59 corrected (c1-r:63). |
| V2-041 | holds in part | 1, 2 | Google's 42-55 % is a simulation on one month whose cut was chosen on the same data (c1-c:279; c1-r:46). Facebook's selection relies on later stages that run the rest (c1-c:264); our gate has none (V2-043). |
| V2-042 | confirmed | none | C58 (c1-r:62), reasoned; whether side-by-side runs keep full speed is also untested (C66). |
| V2-043 | confirmed | none | C44 used only as refuted (c1-r:48); C57 corrected (c1-r:61); C39. |
| V2-044 | confirmed | none | C33, C35, C36, C65; C34 and C61 corrected (c1-r:37-40, 65, 69). |
| V2-045 | holds in part | 2 | 2.98 is a maximum under contention in a replay of one iOS monorepo (c1-c:223-224); the claim names a machine count (500) only for the 1.2× case, so "hundreds of build machines" is not tied to the 2.98. |
| V2-046 | holds in part | 2 | C62 corrected also needs a way back for a failed change, and a late failure invalidates stacked work, each redo costing tokens (c1-r:66); the statement keeps the gain and drops the cost. |
| V2-047 | confirmed | none | C47, C49-C51, C63 corrected (c1-r:51-55, 67). |
| V2-048 | confirmed | none | C46, W84; one run (c1-r:50; w1-r:597). |
| V2-049 | confirmed | none | C66's arithmetic (c1-r:70), stated as reaching the cap, not as where waiting starts. |
| V2-050 | confirmed | none | C52 (c1-r:56); the replacement is marked a hypothesis. |
| V2-051 | confirmed | none | N/Z ≤ c/S gives N·S/c ≥ Z; with S = 596 s and c = 1 this is w1's T < 10N minutes (w1-r:743-746). |
| V2-052 | holds in part | 4 | At the gate the only shortening open today is side-by-side files, untested (C58); selection waits for a dependency map and a lib change selects every file (c1-c:372; V2-043). C26's advice also puts batching where machines are scarce (c1-r:30), which we are. |
| V2-053 | confirmed | none | A reasoned size table on C38, C26 corrected and C37 (c1-r:42, 30, 41). |
| V2-054 | confirmed | none | W01 (w1-r:16-19). |
| V2-055 | holds in part | 1 | The refuter found no repeated runs or variance reported (w1-r:463), not that each arm ran once; gains concentrate on large repositories, 3.6 engineers deployed on average (w1-r:461-463). |
| V2-056 | holds in part | 1, 4 | STORM also refuses a write when anything the agent read changed (w1-c W62), and a conflict on an earlier read invalidates the steps built on it (W94 corrected, w1-r:678-681): one write is redone only when the refusal concerns that file alone. "No loop" is the refuter's reading of the mechanism (w1-r:759-761), not a result. |
| V2-057 | confirmed | none | W63, W64 corrected (w1-r:466-477). |
| V2-058 | holds in part | 2 | CAID's worktree lead over instruction-only is 3 points on Commit0-Lite (59.1 against 56.1, w1-c W65), and w1's Missing 8 counts W65's gaps among those a rerun could move (w1-r:764-766). The STORM-rerun part stands (w1-r:481-487). |
| V2-059 | confirmed | none | W36, W37, W39 corrected (w1-r:294-321). |
| V2-060 | confirmed | none | W38, W93 corrected (w1-r:305-311, 663-674). |
| V2-061 | confirmed | none | W66 corrected (w1-r:490-497); one paper, no repeats, "in direction" only. |
| V2-062 | holds in part | 1 | Removing a hot place removes its own term; a unit's chance 1 − (1 − p)^(N−1) over the other regions still grows with N (W90, w1-r:626-628). The gain from taking Silo's counter out is not stated (W24 corrected, w1-r:194-197). |
| V2-063 | confirmed | none | W40 corrected (w1-r:324-330); it needs updates that commute. |
| V2-064 | holds in part | 6 | Counted from the change list, not from diffs (W83 corrected, w1-r:589-591); the file-grain count agrees with p = 1 by construction (W91, w1-r:638-641). A count of a plan, not "measured here". |
| V2-065 | confirmed | none | W10-W12, W15 corrected (w1-r:89-123). |
| V2-066 | holds in part | 4, 5 | "About 10 coarse granules" is a 1977 database simulation's number put into a rule; v1 carries only the shape (v1:40-41; V2-106). W18 points the other way: coarse locks held to the end of 10-step units deadlocked (w1-r:143-147); both are listed, neither settled. |
| V2-067 | confirmed | none | W20; W96 only as unverifiable (w1-r:159-163, 699-707). |
| V2-068 | confirmed | none | W90, W91 corrected (w1-r:624-644); arithmetic checked there. |
| V2-069 | holds in part | 1, 4 | W26 puts the crossover between no crossing (1.54×) and about 20 % (w1-c W26), so "only where none cross" is a choice, not the finding. It reverses v1's "one owner wherever a conflict is likely" (v1:37-39, 125-127) with no K row; v1's owner is one writer at a time, Silo's a partitioned store. |
| V2-070 | confirmed | none | W30, W31, W34 corrected (w1-r:237-280). |
| V2-071 | confirmed | none | W92 used only as refuted (w1-r:646-660). |
| V2-072 | holds in part | 4 | W62's refuter says the redo is one write (w1-r:464), but W94 corrected says a conflict on something read earlier invalidates the steps built on it (w1-r:678-681); a refusal for a changed read leaves more than the write to redo. |
| V2-073 | holds in part | 1 | W71: the survey found no performance metrics and "only one empirical study" (w1-c:468); "none was ever measured" says more than one survey's count. The rest follows W72-W74 and W94 corrected. |
| V2-074 | confirmed | none | W54-W56, W75, W80 (w1-r:412-423, 541-566). |
| V2-075 | holds in part | 1 | W03 is about write skew (w1-r:27-31); the ground is the refuter's Missing 2, dirty reads by the judge (w1-r:747-749), which no claim carries. |
| V2-076 | confirmed | none | W57, W79 (w1-r:425-427, 559-562). |
| V2-077 | refuted | 2 | W61 corrected: the 13.1 % slowdown came with 82-189 % more code, and per 1,000 characters the parallel mode was faster in 5 of 6 tasks (w1-r:452-457); the grounds given do not support dropping. One preprint (one author, 6 tasks, outliers removed) cannot drop a family of methods. |
| V2-078 | holds in part | 2 | W49 corrected also has s3m, a structured tool that halved reported conflicts with at least 8 % fewer wrong clean merges (w1-r:383-388); "no fewer wrong clean merges" holds for semistructured merge only. |
| V2-079 | confirmed | none | W58, W59, W60 corrected (w1-r:431-448). |
| V2-080 | confirmed | none | W85, W86, W88 (w1-r:599-615). |
| V2-081 | confirmed | none | W87 (w1-r:608-610). |
| V2-082 | confirmed | none | W97 corrected (w1-r:709-720). |
| V2-083 | holds in part | 1 | W89 holds "where a redo runs as its own helper with a kept transcript" (w1-r:619-620); a redo inside a session cannot be told apart. |
| V2-084 | confirmed | none | W95 corrected (w1-r:688-697). |
| V2-085 | confirmed | none | W20, W90 corrected; textual overlap only (w1-r:626-630). |
| V2-086 | confirmed | none | C09 (t1-r:39-40): measured on two other repositories; for the tree, which never ran (t1-c C15), a transfer. |
| V2-087 | confirmed | none | C37-C41; C50 and C113 corrected (t1-r:177-179, 407-409); not measured. |
| V2-088 | confirmed | none | C18 corrected (t1-r:67-69). |
| V2-089 | confirmed | none | C39; C42 corrected (t1-r:141, 149-151). |
| V2-090 | holds in part | 2, 4 | C89 corrected says "alike when one resource binds" (t1-r:321), but C34 corrected excepts extreme contention: one CPU, one disk, heavy appends, where a pessimistic algorithm won (t1-r:121). |
| V2-091 | holds in part | 5 | InnoDB's 15/16 is the vendor's own manual (t1-c C98), and t1 marks every engine-team figure self-reported (t1-c:603-604); only Facebook is so marked. B+ 1/2 and B* 2/3 are guaranteed minima, not expected fill (ln 2 ≈ 69 %, C63). |
| V2-092 | holds in part | 3, 4 | The mechanism holds (C19-C24; C86, C36 corrected). "Growing job: split" decides the choice that C90 and C114, both refuted, leave open (t1-r:324-326, 411-413) and that V2-098 says stays open; D3-12 rules out splitting a field mid-research. C35 corrected: at 3-16 sessions the B-link gain is a wash (t1-r:125). |
| V2-093 | confirmed | none | C85, C87, C109 corrected; C96 (t1-r:304-314, 391-393). |
| V2-094 | confirmed | none | C88 corrected (t1-r:316-318). |
| V2-095 | confirmed | none | C82, C83, C79 corrected; C58, C71 (t1-r:278-298). |
| V2-096 | holds in part | 2 | C80 corrected: "only" omits quality, since an inner level that checks reports may pay in errors, untested (t1-r:283). RAO's tables cover tasks both methods solved (t1-r:269), and its saving is in cache reads, so in count more than cost (C81, t1-r:287). |
| V2-097 | confirmed | none | C45, C46 corrected; C51 only as refuted (t1-r:160-183). |
| V2-098 | confirmed | none | C90 refuted (t1-r:324-326); C12. |
| V2-099 | holds in part | 4 | Today the task table is written by compare-and-set on its revision (W87, w1-r:608-610; t1-c C16); the statement puts one writer under the run lock without saying whether that replaces compare-and-set or wraps only the split step. Ground is cost (C36 corrected). |
| V2-100 | confirmed | none | C85, C08 corrected (t1-r:35-37, 304-306); the child's P is a guess, the coordinator's 79,000 a median from other repositories. |
| V2-101 | confirmed | none | C14 (t1-r:55-56). |
| V2-102 | confirmed | none | C111 corrected; C75, C104 (t1-r:399-401). |
| V2-103 | holds in part | 4 | Follows C115 corrected (t1-r:415-417), but v1's objective is quality first, then the least time, memory and tokens (v1:13); choosing each part on tokens alone drops quality and time, with no K row. |
| V2-104 | holds in part | 1, 4 | W95 corrected names Ries 1977: units of minutes elapsed, about 10 sharing one I/O path (w1-r:690-694), the exception V2-084 itself states; C26 corrected has a project with few concurrent builds (c1-r:30). "No lane found" and "engine units are seconds" hold for real systems only. |
| V2-105 | holds in part | 1 | Nested windows that count the same tokens still have no paper read: A23's additivity is not shown for them and A71 is a hypothesis (a1-c:178, 519). Backfilling matches the lengths, not the worker count (A56, a1-r2:19). |
| V2-106 | confirmed | none | C14, A03, A78 corrected (c1-r:18; a1-r1:7; a1-r2:41). V2-066 breaks it. |
| V2-107 | holds in part | 2, 4 | "Small project: prices zero" is A70 as first written; corrected, a burst of lumpy units raises the price under the line (a1-r2:33). "First come" carries V2-020's gap. Reasoned (the a1 report's table). |
| V2-108 | cannot be checked | | Rests on the c1 report's section 4 and addendum, which this brief does not let me open. |
| V2-109 | cannot be checked | | Rests on the w1 report's section 10 (not opened). w1's refuter names one unread item the list should hold: Agrawal's fake restarts, read only as a summary (w1-r:750-753). |
| V2-110 | cannot be checked | | Rests on the t1 report's "Not found" (not opened). C65's paper sits behind a bot check (t1-c verdict table, C65). |
| V2-111 | cannot be checked | | Rests on the a1 report's section 5 (not opened). |
| V2-112 | cannot be checked | | Rests on four report sections (not opened); no claims or refute file names a sign-in or an OCR install. |
| V2-113 | holds in part | 1 | Tokens per unit can be counted from transcripts, window usage cannot: model and effort weights are undocumented (A40), and A74 corrected asks for measured window usage (a1-r2:37), which needs Q10 first. A redo counts only where it ran as its own helper (w1-r:619-620). |
| V2-114 | confirmed | none | W89, W94, W62, A74; the settle lines of W92 and W94 name these counts (w1-r:659-660, 685-686). |
| V2-115 | holds in part | 1 | The tree has never run (t1-c C15), so a parent's tokens per wake and growth per epoch come only from other coordinator sessions or a run; "wakes that could have waited" needs C50's weighing of delay (t1-r:177-179), a judgment, not a count. |
| V2-116 | holds in part | 1 | No inner level has run (t1-c C01, C15); its compression and concurrency can be counted only from other multi-level sessions or a run. |
| V2-117 | holds in part | 1 | The claims give the lane log wait and run time (c1-c C49), not pass or fail, and no gate exists yet (W88), so p per change has no history; the flaky share needs reruns of the same tree (c1-r:68). |
| V2-118 | confirmed | none | C56, C62 corrected, W84; the join is the measurement C62 names (c1-c:402). |
| V2-119 | confirmed | none | W90, W83, W26, C57; W90's settle line (w1-r:633-634). |
| V2-120 | confirmed | none | W93 and W96 settle lines: a replay, no run (w1-r:673-674, 706-707). |
| V2-121 | holds in part | 1 | claude.ai and Desktop count to the same limit (A39, a1-c:289-294) but are not in the transcripts on disk, so periods opened there are missed; what opens the next period is itself Q13 (A37). |
| V2-122 | holds in part | 1 | The meter also moves with other clients' use (A39), so a reading needs a stretch with no other use; not said. |
| V2-123 | confirmed | none | A38, A71 (a1-r1:42; a1-r2:34). |
| V2-124 | confirmed | none | A42 (a1-r2:5). |
| V2-125 | confirmed | none | A37; A76's refutation names it (a1-r1:41; a1-r2:39). |
| V2-126 | confirmed | none | A15; A76's refutation (a1-r1:19; a1-r2:39). |
| V2-127 | confirmed | none | A75's settle line (a1-r2:38). |
| V2-128 | confirmed | none | A74's settle line; A45 (a1-r2:37, 8). |
| V2-129 | confirmed | none | A12, A77 (a1-r2:40); no lane gives a method, as stated. |
| V2-130 | confirmed | none | A80's settle line; A66 (a1-r2:43, 29). |
| V2-131 | confirmed | none | C66 (c1-r:70): side-by-side speed unmeasured. |
| V2-132 | confirmed | none | C58 (c1-r:62). |
| V2-133 | confirmed | none | C59's measurement; C65 (c1-r:63, 69). |
| V2-134 | confirmed | none | W90, W49 (w1-r:633-634, 381-388). |
| V2-135 | confirmed | none | W54, W56, W75 (w1-r:412-423, 541-543). |
| V2-136 | confirmed | none | W31 (w1-r:245-253). |
| V2-137 | confirmed | none | W86; W97's settle line (w1-r:719-720). |
| V2-138 | confirmed | none | C49 (c1-r:53). |
| V2-139 | confirmed | none | C84 corrected (t1-r:300-302). |
| V2-140 | holds in part | 4 | Keys are frozen during a run (R46; C109, C110 corrected at t1-r:392, 396), so a pilot counts no new keys per leaf; overflow comes from estimate error (C84). |
| V2-141 | confirmed | none | C36 (t1-r:128-130). |
| V2-142 | confirmed | none | C111 corrected; C75 (t1-r:399-401). |
| V2-143 | confirmed | none | A03, A05, A69, A78 corrected (a1-r1:7, 9; a1-r2:32, 41). |
| V2-144 | confirmed | none | A79, A55 (a1-r2:42, 18). |
| V2-145 | confirmed | none | C08, C11, C66 (c1-r:12, 15, 70). |

## Contradictions between lanes

Between two lanes, or between a lane and version 1 (10). "Named" means a statement touching it cites a K row
(section column of `R:v2-claims.md`); the K rows themselves were not opened.

1. **When the allowance limits.** v1: not until a window is nearly spent (v1:80-83). a1: from the moment spend runs
   ahead of the time share (A82). Settled by a1 (A82 confirmed as an inference, a1-r2:45). Named: V2-004, K1.
2. **Order of waiting units.** v1 and c1: shortest expected check, then oldest, with an age cap (v1:96-97; C51). a1:
   a reservation for the oldest, backfill shortest first, plain first come first served when a unit needs only a
   worker (A79 corrected); value per token first while a window limits (A12, A77). Not settled: no claim compares the
   orders for our units, and A55 and A58 favour shortest first for wait. Named: K7 (V2-017, V2-018, V2-020); V2-020
   and V2-107 state first come, first served without the shortest-first evidence.
3. **Stopping running work.** v1: memory only (v1:30-31). t1: the budget cut stops running work (C92 corrected). a1:
   a reservation needs a unit stopped at its cap (A61, A79 corrected). Settled: v1 needs a second stop or the cut
   becomes commit-and-end (t1-r:331-333). Named: V2-003, K6.
4. **What binds landings.** w1: the check caps landings before write conflicts, T < 10N minutes (w1-r:743-746). c1:
   binding depends on c and Z/S, waits start earlier (C07, C66). Settled: w1's figure is C07's bound with one slot.
   Named: V2-051, K4.
5. **Wait or redo.** v1: the computed product, locking where resources are scarce (v1:131-135). w1: no general
   statement (W31 corrected); optimistic wins only at low use with many transactions (W34 corrected). Settled in part:
   W34 agrees in direction, W31 rules out a general rule, so the product per pair stays. Named: V2-070, K8.
6. **One owner.** v1: one owner at a time wherever a conflict is likely, and for the 7 sequences and 4 same-statement
   places (v1:37-39, 125-127). w1 as V2-069 reads it: an owner only where no unit crosses (W26). Not settled: v1's
   owner is one writer at a time, Silo's a partitioned store, and no claim says which v1 meant; V2-062's reshaping
   takes over v1's sequences. **Hidden**: V2-062 and V2-069 cite no K row.
7. **Who writes the task table.** t1: one writer, a script under the run lock (C92, C36 corrected). w1 and t1: written
   by compare-and-set on its revision (W87; C16). Not settled. **Hidden** in the statement: V2-099 cites no w1 claim;
   it does cite K8, which I could not open.
8. **What a part is chosen against.** t1: measured tokens, memory as the hard limit (C115 corrected). v1: quality
   first, then the least time, memory and tokens (v1:13). Not settled; C115's refuter says C09 shows where tokens go,
   not that they bind (t1-r:415-417). **Hidden**: V2-103 cites no K row.
9. **Units of minutes with 3 to 16 workers.** V2-104, summing all lanes: none found, engine units are seconds. w1:
   Ries 1977 simulated units of minutes, about 10 sharing one I/O path (W95 corrected, w1-r:690-694). c1: a project
   with few concurrent builds (C26 corrected). Settled by the refute files: near cases exist, one simulation and one
   project. **Hidden**: V2-104 contradicts V2-084.
10. **Whether numbers carry.** v1 and V2-106: only the shape carries (v1:40-41). w1's Ries reading as V2-066 uses it:
    "about 10 coarse granules enough for long units". w1's refuter adds that lock cost made little difference to the
    best grain (w1-r:762-763), which weakens v1's stated reason. Not settled. **Hidden**: V2-066 cites no K row.

Inside one lane: a claim against its refuter, or against another claim of the same lane (7).

11. **a1, price zero under the line.** A69, A70, A72 as written against their corrections (a1-r2:32-35). Settled by
    the refuter: the price can be positive below the line. **Hidden**: V2-007, V2-011 and V2-107 keep the first form.
12. **w1, size of a redo.** W62's refuter: one write (w1-r:464). W94 corrected: a conflict on an earlier read
    invalidates the steps built on it (w1-r:678-681). Not settled. **Hidden**: V2-056 and V2-072 take the first,
    V2-073 the second.
13. **w1, grain for long units.** W16, W95 corrected: a few coarse granules best. W18: coarse locks held to the end of
    10-step units deadlocked. Not settled. **Hidden**: V2-066 states both.
14. **t1, split or hand-over.** C86, C92: split the unstarted range. C90 and C114, refuted: the choice stays open; the
    record's rule at the window is a hand-over (R50) and D3-12 forbids a mid-research split. Settled by the refuter:
    open. Stated both ways: V2-098 says open, V2-092 decides it.
15. **t1, when the schemes are alike.** C89 corrected: when one resource binds. C34 corrected: not under extreme
    contention. Settled by C34's correction. **Hidden**: V2-090.
16. **t1, new keys during a run.** Q30 (V2-140) counts new keys per leaf lifetime; C109 and C110 corrected: keys are
    frozen during a run (R46). Settled: none arrive. **Hidden**: V2-140.
17. **c1, shortening first against a full-suite gate.** V2-052: shortening comes first. C57 and V2-043: the full suite
    at the gate until a dependency map exists, and a lib change selects every file. Not settled. **Hidden**: V2-052.

The draft's statements hide 5 of the 10 between lanes (6 to 10; 7 sits under a K row I could not open), and 6 of the 7
inside lanes (14 is stated both ways rather than hidden).

## Counts by verdict

| verdict | count | ids |
|---|---|---|
| confirmed | 86 | the rest |
| holds in part | 53 | V2-001, 003-008, 010-012, 015, 016, 020, 023, 024, 026, 027, 031-034, 041, 045, 046, 052, 055, 056, 058, 062, 064, 066, 069, 072, 073, 075, 078, 083, 090-092, 096, 099, 103-105, 107, 113, 115-117, 121, 122, 140 |
| refuted | 1 | V2-077 |
| cannot be checked | 5 | V2-108 to V2-112 |

By question failed (a row can fail several; counted by script): 1 in 29 rows, 2 in 18, 3 in 1, 4 in 15, 5 in 6,
6 in 3.
