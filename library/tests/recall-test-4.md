# Recall test 4

Date: 2026-11-19. On `library/INDEX-draft.md`. Files allowed: `library/INDEX-draft.md`, `library/README.md`, `library/GLOSSARY.md`, `bash library/lookup.sh`. No report opened. Records read in full with `lookup.sh <id>`.

## 1. With 2 check slots, how many workers can one check feed before more only wait, and where does the formula come from?
- Answer: about c (S + Z)/S with c = 2, i.e. 2 (S + Z)/S (S one check run, Z a worker's own time between checks). It is the cap, not where waiting starts: at that point the check is already 85-92 % busy and queues, so fewer where waits must stay short. For one slot the formula (S + Z)/S is published (Denning and Buzen 1978; Sztrik); the c-slot form is our own computation on the exact M/M/c//N model, stated in no source read, and assumes the 2 slots run side by side at full speed (not measured here).
- Ids: c1-0400, c1-0401, c1-0408 (hypotheses, reasoned); c1-0300, c1-0301 (quoted, one slot); r57-0127 (the lane has 2 slots).
- Sure: sure of what the library says; the formula for c > 1 is an untested hypothesis. No number of workers can be given without S and Z (only S = 596 s, one run, r57-0103).
- Look-up words: slots, saturation, N*, closed queue, check (board lines "how many workers one check can feed").

## 2. Does adding workers raise what the check can pass, and what does?
- Answer: No. Workers past the cap only wait; throughput is capped at c/S. What raises it, ranked (all hypotheses): shorten each run (files side by side, 596 s toward about 270 s if independent; selection by changed files; raises the cap by S/S'), then batch what waits (cap c/(S C)), then test the next change ahead on the success path. A faster serial step also moves the cap (Suleman, quoted). Ekstazi selection: 32 % less test time on average, 54 % on long suites.
- Ids: c1-0400, c1-0402, c1-0403, c1-0404, c1-0405 (reasoned); c1-0310, c1-0329 (quoted).
- Sure: fairly sure; the ranking is untested.
- Look-up words: shorten, batch, speculative, Suleman, cap.

## 3. What gain was measured for batching changes into one check run, where, and under what condition?
- Answer: all in simulations or replays, not trials. Ericsson (Najafi and others 2019, three projects, failing batch bisected): 72 % fewer runs in project C (2.8 % culprits, best batch 9), 46 % in A (batch 4); 41 % with flaky tests counted. Chrome and Ericsson replays (2023): up to 91 % fewer machines at the same feedback time. 285 million Chrome/Google/JMRI results (2025): median feedback time cut up to 99 % without missing a failure, but in larger projects with many concurrent builds. Condition: a low failure rate (Dorfman: pool 11 at 1 % failing, 3 at 30 % failing, 1 % saved); it pays only where changes wait; rerun nondeterminism shrinks the best batch to 2-4. A controlled before-and-after in real use is not found.
- Ids: c1-0314, c1-0315, c1-0316, c1-0317, c1-0311, c1-0312 (quoted); c1-0200, c1-0201 (observed, the refuted claim); c1-0402, c1-0404 (hypotheses).
- Sure: sure of the figures as the records quote them; they are replays, partly company-reported.
- Look-up words: Dorfman, batch, group commit, Ericsson.

## 4. Which kind of tree for a job that grows while it runs?
- Answer: a B-link form: split only the unstarted keys, new leaf first, its index posted afterwards by one script step under the run lock; a small remainder goes to an unstarted sibling or the next wave; no merge. Untested hypothesis on quoted mechanisms. The tree's own split rules disagree and are unsettled today (t1-0111).
- Ids: t1-0401, t1-0405, t1-0400 (reasoned); t1-0300, t1-0304 (quoted B-link papers, not opened); t1-0111 (observed).
- Sure: sure of the recommendation as recorded; it was never run (the tree never ran).
- Look-up words: split, B-link, grows, epoch.

## 5. What decides between more coordinator rounds and an inner level?
- Answer: tokens: take whichever costs fewer. Add a level only where its summary is much smaller than its inputs and its children run at once (RAO: 83.9 % concurrent calls where it helped; 18x slower where sub-tasks were sequential). Where levels win, depth is the ceiling of log_b L, width before depth. Untested; how much an inner session compresses and the share of children running at once are not measured (open task).
- Ids: t1-0402, t1-0406 (reasoned); t1-0339, t1-0340, t1-0335 (quoted); t1-0504 (open).
- Sure: sure of the rule; it is a hypothesis.
- Look-up words: epoch, inner level, hierarchy, depth, aggregation.

## 6. How is a refilling token window paced?
- Answer: with u the share of the window used and s the share of its time gone: while u <= s the window does not limit starts; when u > s, spend the rest at (1 - u)/(1 - s) times the even rate; keep back the expected remaining usage of the 3 to 16 running units as a reserve. This is re-planning as Yahoo and LinkedIn do (self-reported). Hypothesis on quoted forms. No paper covers an allowance that refills over hours or days exactly; the pacing bounds give no usable number at tens of units, so every constant is a measurement.
- Ids: a1-0400, a1-0402, a1-0410 (reasoned); a1-0304, a1-0306, a1-0300 (quoted); o2-0501 (open).
- Sure: fairly sure; untested.
- Look-up words: pacing, window, reserve, budget.

## 7. With a 5-hour and a weekly window, when may a unit start?
- Answer: only if its expected usage fits in every window it draws on (also the per-model weekly one); its price is the sum of the windows' prices, each kept separately, not "the dearer one binds". Same shape as RFC 2698 and ATM (conform to every bucket) and bid-price sums (Talluri and van Ryzin). The week binds when k (weekly size / 5-hour size) is below the number of 5-hour windows opened in the week. Window sizes are not known (a1-0501).
- Ids: a1-0403, a1-0404 (reasoned); a1-0312, a1-0314, a1-0317, a1-0318 (quoted); a1-0501 (open).
- Sure: fairly sure; hypothesis.
- Look-up words: window, bid price, token bucket, five-hour, weekly.

## 8. What does the provider publish about how the 5-hour window resets, and what does it not publish?
- Answer: published (help pages fetched 2026-11-19): the five-hour period starts when the first message is sent and the limit resets in full five hours later; weekly limits reset once a week at a fixed time assigned to the account, with the full allowance; use across claude.ai, Claude Code and IDEs counts together. Not published: what starts the next period after a reset, window sizes, model and effort weights, whether Fable use also counts toward the all-model weekly limit, whether unspent allowance carries over, any cache ratio for Claude Code; the provider may change limits at its discretion.
- Ids: a1-0323, a1-0324, a1-0325, a1-0326, a1-0327, a1-0328, a1-0329, a1-0330 (quoted); a1-0501, a1-0504 (open).
- Sure: sure (quoted from the pages as the lane read them).
- Look-up words: five-hour, weekly, reset, provider.

## 9. What was measured when model sessions wrote with version-checked writes against own worktrees, and how strong is that evidence?
- Answer: STORM (Liu and others 2026, Claude Sonnet 4.6, Commit0-Lite, the authors' own runs): 82.5 % macro pass rate with version-checked writes, against 63.8 % for isolated git worktrees and 66.4 % for one agent, at most 4 engineers. Weak evidence: one preprint, no repeated runs, own runs; it covers the file editor tool but not bash writes; different functions of one file trigger a false rejection; heavily shared files become bottlenecks. A second preprint (CAID, Sonnet 4.5) got 59.1 % for worktrees against 53.1 % for one agent in its own setup, and going from 4 to 8 engineers lowered the score.
- Ids: w1-0353, w1-0354, w1-0356 (quoted); w1-0401 (hypothesis).
- Sure: sure of the figures; evidence strength low.
- Look-up words: STORM, worktree, version, CAID.

## 10. Can we fix the order of writes before work starts?
- Answer: only if each unit's read and write sets are known in advance (Calvin, Abadi and Faleiro, quoted); without that execution runs about serially. Sessions do not know their sets in advance, so a general fixed order is not available. A dependency-ordered plan from a static dependency graph did help in one preprint (gpt-5-mini, generation from a specification: 56.8 to 68.1 %). Practical hypothesis: landings go in one order through the check.
- Ids: w1-0331, w1-0332, w1-0333, w1-0357 (quoted); w1-0405 (reasoned).
- Sure: fairly sure.
- Look-up words: Calvin, Aria, deterministic, order, access set.

## 11. Which papers need the owner's sign-in?
- Answer, from "Known gaps" on the board: check: Beheshtian, Bavand and Rigby TSE 2021; Bavand and Rigby ICSME 2021; Reiser and Lavenberg 1980; Adams, Balas and Zawack 1988; Duclos and Spencer 1995. Writers: Adya 1999; Cahill, Rohm and Fekete 2008 and 2009; Fekete and others 2005; IntelliMerge 2019; Korth, Kim and Bancilhon 1988. Tree: Sagiv 1986; Johnson and Shasha 1990 and 1993; Lanin and Shasha 1986. Budget: Balseiro and Gur 2019; Balseiro, Kim, Mahdian and Mirrokni 2017/2021; Wang and others, SIGMETRICS 2017. Separately paywalled or sold (not sign-in): Kolisch 1996, ITU-T I.371, Bayer and Schkolnick 1977, Yao 1978, Baeza-Yates 1989, Graefe 2011.
- Ids: board section "Known gaps" (no record id); rule r57-0014 (find the open copy, else list for the owner's sign-in).
- Sure: sure (read from the board, not a record).
- Look-up words: none with lookup.sh; read from the board.

## 12. What is the measured rate of conflicts between our own agents at function grain?
- Answer: not recorded. Conflicts per file are not logged (w1-0100); r57-0128 counts planned collisions of 14 build units (7 can be built at once with one writer per function or block), from the change list, not a conflict rate between running agents. Published rates are other people's (human teams 16 % textual; agents 19.8 to 41.7 %, summary only). The measurements of conflicts on our own lines are open tasks (w1-0500 to w1-0508).
- Ids: w1-0100, r57-0128, r57-0305, r57-0308, w1-0500 to w1-0508 (named on the board).
- Sure: sure it is not recorded.
- Look-up words: conflict, function, collision, rate.

## 13. What batch size should our suite use?
- Answer: not recorded as a number for our suite. The rule is: run every waiting change together, capped by the failure rate p (no batching near 30 % failing), bisect on failure; p per change at the gate, suite time at 1, 2 and 4 changes and the flaky share are unmeasured. Published bests for orientation only: 11 at 1 % failing, 3 at 30 %, 9 and 4 at Ericsson, 2 to 4 once reruns differ. The tree checker's 12 is a guess (c1-0107).
- Ids: c1-0404, c1-0402, c1-0311, c1-0314, c1-0315, c1-0200, c1-0201, c1-0107.
- Sure: sure that no figure is recorded for our suite.
- Look-up words: batch size, Dorfman, p, failure rate.

## 14. What is the largest measured gain for scheduling a few long jobs, and when does it not apply?
- Answer: EASY++ (system-predicted lengths corrected when outlived, backfill candidates shortest first): average wait -23 % and bounded slowdown -37 % against EASY with user estimates, in a replay of four real logs (Tsafrir 2006); exact lengths would give -22 % and -47 %, but real lengths are not exact. It does not carry over as measured: the logs had 100 to 1,152 processors and thousands of jobs (we have 3 to 16 workers); predictions without correction made wait 454 % worse; units that need one worker and nothing else get plain first come, first served; no measured gain exists at units of minutes with 3 to 16 workers. For a batch that must all finish: any order within 2 - 1/m, longest first within 4/3 - 1/(3m) only with exact lengths.
- Ids: a1-0337, a1-0338, a1-0342 (quoted); a1-0406, a1-0407, a1-0408, a1-0410 (reasoned); r57-0309 (quoted).
- Sure: fairly sure of the figures; applicability to us untested.
- Look-up words: backfill, Tsafrir, EASY, long units.

## Scoring (Opus, 2026-11-19)

Scored against `R:c1-report.md`, `R:w1-report.md`, `R:t1-report.md`, `R:a1-report.md` (`R:` = `docs/program/evidence/round3-2026-11-18/`) and every record the answers cite, read with `lookup.sh`. A detail left out does not lower a score; a wrong statement in what the question asks does.

| Q | Score | Reason |
|---|---|---|
| 1 | Sure and right | 2 (S + Z)/S, published for one slot, computed for c slots, 85-92 % busy at 2 slots, no number without Z: as c1 answer 1-2, c1-0400, c1-0401; leaves out that it follows from two bounds for any distribution |
| 2 | Sure and right (fairly sure) | Cap c/S; shorten, batch, test ahead, in c1's order (section 3 e); Ekstazi 32 and 54 % as c1-0329 |
| 3 | Partly (marked sure) | Figures match c1-0311, c1-0314, c1-0316, c1-0317, but "rerun nondeterminism shrinks the best batch to 2-4" is C64, refuted (c1-0201, c1 section 6); the thesis's 44-50 % on nine projects (c1-0315) is cited, not given |
| 4 | Sure and right | B-link split of unstarted keys posted by a script, remainder to a sibling or the next wave, no merge, split conflict open: t1 answer 3 and 5; leaves out "a separator only where keys are worked in key order, else a list of ids"; "not opened" beside t1-0300 and t1-0304 is wrong of the lane, which read both |
| 5 | Sure and right | Fewer tokens decides; a level only where it compresses and its children run at once; depth the ceiling of log_b L: t1 answer 4, t1-0402; leaves out that the choice arises only when L > b |
| 6 | Sure and right (fairly sure) | u against s, (1 - u)/(1 - s), a reserve for running units, re-planning as Yahoo and LinkedIn: a1 section 3 (a); its "no paper covers ... exactly" leans on o2-0501, which a1-0511 narrows |
| 7 | Sure and right (fairly sure) | Fit every window, prices summed and each kept, not the dearer; the week binds when k is below the 5-hour windows opened: a1 answer 3, a1-0403, a1-0404 |
| 8 | Sure and right | Published and unpublished parts both match a1 section 3 (c) and a1-0323 to a1-0330 |
| 9 | Sure and right | STORM 82.5 / 63.8 / 66.4 %, at most 4 writers, one preprint, no repeats, bash writes bypass it; CAID 59.1 / 53.1 %: w1 section 2, w1-0353, w1-0354, w1-0356 |
| 10 | Sure and right (fairly sure) | Order first needs the sets in advance (Calvin; Abadi and Faleiro); a dependency-ordered plan survives (Co-Coder, gpt-5-mini): w1 answer 1, W66 in part |
| 11 | Sure and right | The board's list matches the "needs the owner's sign-in" lists of all four reports and their paywalled or sold works |
| 12 | Rightly not recorded | No rate for our sessions; r57-0128 is a count from the change list; the measurement is named (w1-0503, M4); calls the agent rates "summary only", though w1-0349 quotes them |
| 13 | Rightly not recorded | No size for our suite; the rule and its measurements as c1-0404; but it adds "2 to 4 once reruns differ" as a published best (C64, refuted, no source) and says "bisect" where c1-0404 says one by one when the free slots allow, else halve |
| 14 | Sure and right (fairly sure) | EASY++ -23 / -37 %, exact lengths -22 / -47 %, +454 % uncorrected, one-worker units first come first served, Graham's bounds: a1 section 3 (d); "thousands of jobs" understates 28,490 to 223,407 |

Counts: sure and right 11 (6 marked sure, 5 fairly sure); partly 1; wrong 0; rightly not recorded 2. No answer marked sure is wrong as a whole. Q3, marked sure, states a refuted claim as a condition, and that counts against the board (difficulty 1). Recall test 3 had 4 sure, 5 partly and 1 not recorded of 10.

### What made answers hard

1. **Refuted claims written as if true** (Q3, Q13). Board lines 85-86 give each lane's refuted claims in their own affirmative words, in a parenthesis after "refuted": "(BMW keeps the full suite at its gate; rerun nondeterminism shrinks the best batch to 2-4)", and the same for w1, t1 and a1. Q3 took the second as a condition, Q13 as a published figure. x15-0405 still says "2 to 4 per run" with no mark, and `lookup.sh "2 to 4"` prints it beside c1-0201.
2. **Narrowed claims shown broad** (Q6, Q12). 30 records are named by an open "proposed correction of <id>" record (c1 15, a1 8, w1 4, t1 3), and lookup.sh prints every one of them with no mark. r57-0308 still reads [summary] while w1-0349 quotes 19.8 and 41.7 % (Q12 wrote "summary only"). Open item 6 leads with o2-0501's "No paper covers an allowance that refills over hours or days", with a1-0511's narrowing after it in a parenthesis (Q6 repeated it).
3. **Missing look-up rows** (Q5, Q12, Q13). No row for "set a batch size for our check": the row "Batch changes at the check" gives the published bests, not "not recorded for our suite; the tree checker's 12 is a guess (c1-0107)". No row or known-gap line for a conflict rate between our own sessions: only r57-0134's "not logged: conflicts" and w1-0100. The row on epochs or an inner level does not say the choice arises only when L > b.
4. **Facts only on the board, in no record** (Q11, Q13). The sign-in list is board-only: `lookup.sh Adya`, `Sagiv` and `Lanin` print "not recorded"; c1-0200 names some unopened works, w1-0200 and t1-0200 none. Lane c1 wrote no open record for its measurements ("check: no open record", Open item 2) where w1, t1 and a1 did, so Q13 rebuilt them from hypothesis records.
5. **Search words** (Q1, Q12). "closed queue", the board's own words (line 213), finds no c1 queue record: the records say finite-source, machine-repair, saturation. "N*" returns Gunther's peak (r57-0307) beside the saturation point. "conflict function" returns only r57-0302; r57-0128 says "collisions" by "function or block". A quoted phrase that matches nothing prints "not recorded" with no fallback (`lookup.sh "saturation slots"`), the very words README tells a session to report; unquoted words that no record holds together flood instead (`lookup.sh batch size suite`: 92 and 292 records).
6. **One name for a read and an unread work** (Q4). The board credits the B-link split to "Lehman and Yao, Graefe" and lists "Yao 1978" and "Graefe 2011" as not opened, with no years on the read ones; Q4 wrote "not opened" beside t1-0300 (Lehman and Yao) and t1-0304 (Graefe's 2010 survey), both read at their lines.
7. **Symbols defined only inside records**: S, Z, c, N*, p, k, C(k, p), u, s, L, b, R and f are on the board and not in `GLOSSARY.md`. No answer went wrong for it.
- Id runs: the boundaries of every round-3 run on the board and every id in the look-up rows the answers used were checked; none points to the wrong place.

### The three changes that would help most

1. **Write refuted claims as what is now true, marked** (board lines 85-86): for example "refuted, C64: a rerun does not shrink the best batch; '2 to 4' has no source", and the same for BMW, W92, the five t1 claims and A76. It removes the one error in a sure answer (Q3) and the false figure in Q13.
2. **Mark every record under a proposed correction**: lookup.sh prints "[CORRECTION PROPOSED: <open id>]" after each of the 30 records an open "proposed correction of" names (x15-0405, r57-0308 and o2-0501 among them), and the board puts the narrowed form first (Open item 6, the r57-0308 line). Q6, Q12, Q13.
3. **Move board-only facts into records, and say "not recorded" where it is so**: one open record per lane listing the papers that need the owner's sign-in, by author and year; c1's measurements as open records, as w1's M1 to M9; look-up rows "Set a batch size for our check" and "Cite our sessions' conflict rate", each saying not recorded and naming the measurement (c1-0404; w1-0503). Smaller: add "closed queue" to the handles of c1-0300, c1-0301 and c1-0400, and let a quoted phrase that finds nothing fall back to its words before printing "not recorded".
