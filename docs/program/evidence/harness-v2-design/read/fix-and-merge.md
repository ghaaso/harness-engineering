# Fix rounds and merges: fact sheet

Abbreviations: SC = sweep-cards.txt, ST = sweep-tables.txt, MF = map-full.txt, RF = refute.txt, VD = verdicts.txt. All in docs/program/evidence/harness-bottlenecks/. Board = clinic-build task.md (not read directly; quoted through the cards).

## PART 1 — fix rounds (B01)

**1a. The nine-of-eleven claim**
- RECORDED: Of 11 slice gates S00-S10, 9 took three rounds or ended with a root-read round 3 (S01, S02, S03, S04, S05, S06, S07, S09, S10); 2 took two rounds (S00, S08). (SC:132)
- RECORDED: Round 1: the root runs the full check (7 steps, 0 skipped), checks migrations are linear, diff stays in slice files, no conflict with main, then briefs two read-only Opus subagents "to refute" the slice's invariant claims. (SC:130)
- RECORDED: Round 2: the slice session fixes; a targeted Opus re-review of the fixes, often the same reviewer. (SC:130)
- RECORDED: Round 3: the root reads the diff itself "instead of buying a third agent review", re-runs the check on the branch and again on merged main, merges, and applies shared-doc proposals in one "gate commit". (SC:130)
- RECORDED quotes: S01 "the root read that diff ... instead of buying a third agent review" (task.md:102); S02 round 3 "The root read the diff (no further agent review)" (task.md:174); S03 same wording (task.md:218). (SC:132)
- RECORDED: Round-3 root-read commits: S01 8ce3193, S02 5d0c8a4, S03 d4885a8, S07 c489ad1, S04 d96e2d6, S06 8ba7897, S05 1a7493a, S09 9787c53, S10 4e872ad. (ST:50-60)
- RECORDED: Gate rule: a P1, or a P2 against the slice's own named deliverable, makes the gate wait for fixes, a fresh check and a targeted re-review. (SC:130)
- RECORDED: No round-cost (tokens or time) is recorded anywhere in the lane. (SC:133)

**1b. Fix-induced defects**
- MEASURED (arithmetic on board rows): 19 round-1 P1s across 12 branches (S00 2, S01 1, S02 2, S07 3, S04 2, S06 1, S05 1, S09 1, S10 3, cutoff 1, S11 1, identity 1). (ST:102-103)
- INFERRED (mapper's count of board words, a lower bound): at least 5 fix-induced P1s (W1, GD-01, RS-1, GV-01, GV-02) and at least 10 fix-induced P2s (S01 V1/V2, S02 V1, S06 inert price check, RR-1..3, PQ-01/02, S11 P2-1). The five P1s are confirmed by the refuter. (MF:5; RF:10)
- INFERRED: baseline "at least 15 fix-induced P1/P2 against about 110 fixed". (MF:32)
- RECORDED: "clusters in fixes that ADD state: a hold, a lock, a marker or a cutoff date"; the board does not separate "fix incomplete" from "fix introduced new". (MF:5; SC:157)
- RECORDED (9 lines of cases, ST:106-114):
  - Cutoff guards: GC-01 fix produced RR-1/2/3 (P2); RR-2 hold produced GD-01 P1; the GD fix produced RS-1 P1; GE-03 is a wrong figure.
  - S11: GU-01 fix produced GV-01 P1 and GV-02 P1; first GV fix produced P2-1.
  - S07: G07-01/02 fix produced W1 P1 "broke the per-close rule again".
  - S01: V1 and V2 (P2), "broke two fixes".
  - S02: V1 P2, a test fix that polluted state.
  - S06: price check inert on a first invoice.
  - Posting follow-ups: PQ-01/02 P2.
  - Faster check: FC-01 and FC-10.
  - Root merge edits: S01 two failures, S02 four.
- Incomplete-fix cases, not new defects: S05 G05-01 P1 (fix covered adjustment drafts only; an issue draft still removes stock twice) and S10 G10-05. (SC:156; ST:57,60)

*Chain 1: cutoff guards (SC:138; ST:66)*
- RECORDED: (1) GC-01 (P1, round 1): same-day import double count. (2) Fix: a stock opening is the shelf at the end of its cutoff day. (3) The slice's own Opus re-review found the fix "introduced RR-1 and RR-2 and left RR-3", three new P2s: a cutoff-day bill line became a count-day line; postings could slip between end-of-day and import so the import refused the medicine for good; approval before the end-of-day shelf existed. (SC:138; opening-cutoff-guards/task.md:63)
- RECORDED: (4) RR-2 fix: a hold on an approved batch's medicines until it posts. (5) Found by the root's Opus re-review (round 2): GD-01 (P1), "The RR-2 hold never ends". The filter used stage=approved while abandoning or posting changed status, so an abandoned or reversed batch left every medicine "refused for all stock postings for good" (task.md:631). (SC:138,140)
- RECORDED: (6) The fix (hold starts at submission) was re-reviewed by the slice's own Opus and found RS-1 (P1): only the preparer could withdraw or abandon, so a batch that could not post held its medicines "for good once its preparer left" (opening-cutoff-guards/task.md:83). (SC:138,140)
- RECORDED: (7) Round 3: GE-03, a real wrong figure: after a reversed opening the next count read the reversal as a receipt of -10 and reported found stock; fixed by setting the opening count aside on reversal. (SC:138)
- MEASURED: R1 1 P1, 3 P2, 9 P3 (GC-01..13); R2 1 P1, 3 P2, 5 P3 (GD-01..09); R3 1 P2 on records plus 5 P3 (GE-01..06). Final check 7/7, 2173 tests, 329 s. (SC:140)
- RECORDED: Ended as "passed (round 3)"; the round-3 diff was read by the root. Removing the GD-05 lock_fresh check left every stock and race test passing. Remaining open items stayed as "procedure, stated in the notice". Commit ids for this chain: not in record.

*Chain 2: S11 restore (SC:146-149; ST:67)*
- RECORDED: (1) GS-15 (P1, round 1): the restore started the web service without checking the code matched the restored database. (2) Closing round GU-01 (P2): after a failed deploy the next deploy lost the restore boundary; the fix was a marker file /var/lib/clinic/migration-dirty plus keeping the recorded previous release. (3) The slice's own re-review of the GU-01 fix found 15 findings, including "a failed rollback after a failed deploy re-introduced GU-01". (4) The root's Opus re-review of the closing round found GV-01 (P1: after a successful rollback the next deploy took no recovery set, and the runbook named a stale one) and GV-02 (P1: --no-start then the printed systemctl enable served a release the record did not vouch for, and the next deploy pruned the one that served). (5) Re-review of the GV fix found P2-1: the first version discarded a marker next to checked-out-not-migrated, so a fix-forward deploy would have replaced the protected set with a set of the part-migrated database.
- RECORDED: Merge ids: S11 merged b2ce8f3 (6 Nov); GV fixes landed as merge ab45864 on 10 Nov. Board: GV fix "not re-reviewed by the root's reviewer" (task.md:793). Crash windows GV-03 and GV-04 "Read and reviewed, not drilled"; four items "Not drilled". Nothing has run on a real host.
- MEASURED: families GS-01..34, GT-01..27, GU-01..06, GV-01..06; round-3 check 2,413 tests, 477 s; merged main 2304 tests, 420 s.

**1c. The sets**
- "Five late P1s" = W1, GD-01, RS-1, GV-01, GV-02. (RF:10)
- "Seven known misses" = GD-01, RS-1, GV-01, GV-02, W1, plus the incomplete fixes G05-01 and G10-05; the proposed replay is about 7 SHAs x 2 arms, about 14 runs. (MF:665,673)
- "Nine recorded fix-induced defects" = the 9 case lines in ST:106-114. "Ten recorded cases" is not defined by that phrase in these files; the closest is 9 plus "S09 round 2's exposure on S07's pages" for a stage-0 blast-radius test. (VD:154) The exact "ten cases" text sits in fit/DROPPED-RESCREEN.md:50 and names no list. Mark INFERRED.
- RECORDED: replay chains named for frozen SHAs: GC-01 to RR-2 to GD-01, G07-01/02 to W1, GU-01 to GV-01/02, G01-01 to V1/V2 (RF:11).

**1d. P3**
- MEASURED: round-1 P3 per slice: S01 13, S02 7, S03 8, S04 11, S05 12, S06 13, S07 11, S08 17, S09 11, S10 8 = 111 across ten slices. (SC:196)
- MEASURED: 183 distinct P3 ids, 185 "| P3 |" rows, 7 "not verified by anyone"; "no status column", so no open count exists. (MF:780,821; RF:90)

## PART 2 — merges and the root

**2a. Unread final heads**
- RECORDED: 10 Nov batch: 5 branches merged, one native check 7/7, 2520 tests, 726 s, 0 skipped. (SC:188)
- RECORDED: Review of the 5: People "not separately reviewed" (check 7/7, 2417 tests); S11 closing, root's Opus found GV-01/02, fix "not re-reviewed by the root's reviewer"; query follow-up, one Opus refute-review, "that answer not re-reviewed"; faster-check last touch, "not re-reviewed by the root"; Linux runner, one independent Opus refute-review, LX-01..LX-10 answered. (SC:188)
- INFERRED: "4 of 5 unread" = every branch except the Linux runner. (MF:639; SC:188)
- RECORDED: Real-data switch fb55599 merged 11 Nov 05:47 with only its own two reviews, "did not run a further review (USER-24)" (task.md:821). Its first root check failed 2 of 2570 tests (order-dependent migration bug the session had missed); fixed in 6a2fd45. Branch record: two refute reviews, no P1, every P2 fixed. (MF:48,639,642; SC:1281)
- INFERRED: "5 of 6 high-risk merges unread (10-11 Nov)" is the mapper's tally (4 plus the real-data switch). The six are not itemised. (MF:672)
- Concrete meaning of "unread final head": not in record as a commit-count definition. Records only say the last fix or touch was not re-reviewed by an independent agent. The board admits the unreviewed tail contents are not stated. (SC:186)
- RECORDED: Owner USER-24, 10 Nov 2026: "We have to wrap it up and skip the unnecessary stuff, we can improve and finish up on the go while the pilot is running" (task.md:786). Wrap-up: "No session is to start further review rounds; findings go to the pilot backlog" (task.md:821); root "archives nothing without the owner's word". USER-21 (6 Nov): gate, merge and release without asking. No earlier gate ended by owner stop. (SC:204,210)

**2b. How a merge worked**
- RECORDED: root check; git merge-tree conflict test; migration list; two Opus refuters; fix rounds; root diff read; check on branch and on merged main; one gate commit applying shared-doc proposals. (SC:47,130)
- RECORDED: First merged-main check failed from the merge itself: S01 "two consequences", S02 "three" (text lists four). (SC:180)
- RECORDED: board = 829 lines, 219,111 bytes at sweep time; 838 lines, 221,112 bytes by wc on 11 Nov; table rows run to several thousand characters; header stale; context map and AGENTS.md stale. (SC:95-98; MF:128)
- "Edits board by script": not in record. Root-only editing of nine shared docs is recorded. (SC:31)
- MEASURED: 65 merge commits (4, 10, 5, 28, 12, 6 for 3,4,5,6,9,10 Nov); 36 first-parent merges onto main; 426 commits since 1 Nov; no commits 7-8 Nov. (SC:1062)

**2c. Compactions and tree**
- MEASURED: CR-05 counted 3 compactions (preTokens 573,774 on 3 Nov; 974,246 on 4 Nov; 967,210 on 5 Nov). A later mapper counted FOUR; the fourth, 969,988, at 2026-11-11T00:49:46Z. Transcript 7f348b2c. (SC:1241; MF:128,131)
- MEASURED: root 1,107 API calls, 592.7M cache-read, 1.8M output tokens, about 535k average context per call; the root is about 14% of November cache-read, slice sessions about 66%. (MF:128; RF:22)
- What was lost or re-read after compaction: not in record ("I did not read what each summary lost"). (SC:1242)
- RECORDED: session tree depth 3 (root, slice sessions, one child level, then subagents); at most three running children per node; the 400-character-per-turn note is asserted, not measured. (SC:15,18)

**2d. Overstatements (B12)**
- MEASURED (by reading, no denominator): at least 20 distinct overstatement records. (SC:164)
- RECORDED examples: G02-02 two race tests "pass with those locks removed"; G05-09 a screen test's "always-true assertion passes"; GE-01 a record "named two tests that no longer existed"; S11 GT: a large-volume restore replaced by a small one, and a log-secret scan that built nine needles while the record said 55; faster-check comment cites "task.md section 13, which did not exist"; GU-02 "20 PASS" against 19 lines. (SC:162)

## PART 3 — the refuter's one-budget warning
- RECORDED, verbatim (RF:109, "MISSED"): "No one summed the new agent spend: a fresh reviewer per fix round (B01), workflow gates with two refuters (B04), a final-head reviewer per high-risk merge (B17), 14 replay runs (B17), up to 18 candidate fixes (verdict 1), 40 Opus replay runs (verdict 2). Against CR-04's measured two-lanes ceiling and October's 14 limit episodes, together they recreate B03."
- Attached numbers: 14 replay runs (MF:674); up to 18 candidates (6 findings x K=3, RF:93-94); 40 replay runs (RF:97); CR-04: a 10-lane run died in about 15 minutes, 2 lanes at a time worked, one window about 3.4M subagent tokens (SC:1231-1233); 14 limit episodes in October (MF:93).
- RECORDED, same warning in B17 amendment: "Count the merge-block reviewer in the agent budget" (RF:75). Cap gate workflows at two concurrent agents (RF:23). Unknown: whether cache-read tokens count toward the limit (RF:110).
