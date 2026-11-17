Section 16 check 3: defects only
Document: harness-engineering/docs/program/RESEARCH-TREE-PROTOCOL-v2-2026-11-16.md (working tree; line numbers are in the edited file)
VERDICT = docs/program/evidence/pc-freezes-2026-11-17/VERDICT.md; ROOT = ...e24f17dc.../scratchpad/tcb-build

A. Edited sentences about the interruptions

A1. Line 1037-1038 (point 3, "Why"): "found that what failed was the start of new programs, not a load".
  Overreach. VERDICT establishes "not a memory shortage" (VERDICT:10) and keeps the cause of the block open (VERDICT:46-56). It does not rule out load as a trigger: the 15:43 block came with the processor at about 89 % (recorder). It lists the model checker's load only as "wrong or partial" (VERDICT:77-79).
  Corrected: "found that what failed was the start of new programs, not memory (point 4, last bullets); what blocks the starts is not established."

A2. Line 1095: "A short command never returns".
  Overreach. VERDICT:14-15: the first call that never returned was a short Bash command "in three of them" (of four).
  Corrected: "In three of the four, the first call that never returned was a short command (a program start); ..."

A3. Line 1101-1102 and point 5, line 1135-1136: "a blocked program start, not the session's full context" / "not the session's context".
  Says more than the verdict. VERDICT:2 establishes that a blocked start is what failed at every interruption. For the full-context cause it says only "wrong or partial" (VERDICT:77-79). Also, the block VERDICT dates is 05:12 (VERDICT:24), not "about 05:10"; the lane log shows agents starting commands at 05:11:19 and 05:11:58 (line 1066-1067).
  Corrected (line 1101): "So the stop at about 05:12 was a blocked program start; the verdict counts the earlier reading (the session's full context) among causes that were wrong or partial. The stuck start came back at 05:37:31 as access denied."
  Point 5: "...the stop at about 05:12 was a blocked program start (point 4); the full-context reading is not supported."

A4. Line 1111: "Interruptions 1 and 2 show the same signature but have no machine record."
  Wrong as worded, and it contradicts line 1098-1099 of the same edit, which cites main.log blocks at 01:26 and 02:50. VERDICT:57-58 says they have "no recorder" and "cannot be attributed". Kernel-Power 41 events also exist at 01:44:07 and 02:55:53 (gather-applogs.md:27-28).
  Corrected: "Interruptions 1 and 2 show the same signature but have no recorder samples and cannot be attributed."

A5. Line 1087-1088 (15:43 bullet): several figures are slightly off.
  - "the processor at 85 to 99 %": from 15:38:00 to 15:43:23, 160 samples run 13-99 %, mean 89 %, 26 of them below 85 (lane/recorder.log).
  - "19,283 MB free": the last line, 15:45:34, reads free=19281 (recorder.log:14307); 19,283 is 15:45:32.
  - "2 to 5 % CPU": after 15:43:43 the samples run 1-6 % (also EVIDENCE.md:44).
  Corrected: "the processor mostly at 85 to 99 % (mean 89 %) ... shows about 19,300 MB free, 1 to 6 % CPU ...". The 15:45 restart was unclean (Kernel-Power 41 at 15:45:56, EVIDENCE.md:32,57); "restarted" is acceptable, but "hard-reset" would be exact.

A6. Line 1105-1111 ("Not established"): this leaves out the verdict's main evidence against 360 as the cause: 18 unclean restarts in the 13 days before 360 was installed (VERDICT:53). Without it, a reader sees only evidence for 360.
  Add: "Against it: 18 unclean restarts happened in the 13 days before 360 was installed."

B. Sentences left standing that the verdict contradicts

B1. Line 1052-1053 (01:42 bullet): "No machine record of the minutes before exists."
  Contradicted. main.log records the block at 01:26 (VERDICT:24), and Windows logged Kernel-Power 41 at 01:44:07, with the boot at 01:44 and not 01:42 (gather-applogs.md:27-28).
  Corrected: "No recorder samples exist; the app's log shows a blocked program start from 01:26, and the boot was at 01:44."

B2. Line 1050-1052: the bullet quotes model-fidelity naming the 11-worker pools as "the loads that came before the stalls". It is left unqualified, although VERDICT:77-79 lists "the model checker's load (01:42)" as wrong or partial.
  Add: "(a cause the check of the freezes found wrong or partial)".

B3. Line 1055-1056 (02:34 bullet): "Every process crawled for about 20 minutes ... No machine record exists."
  Contradicted. VERDICT:13-17 says that at each of the four interruptions, programs already running went on and only new starts failed. main.log records the block at 02:50 (VERDICT:24), and the boot was at 02:55 (gather-applogs.md:28).
  Corrected: "The memory note says every process crawled for about 20 minutes; the check of the freezes found instead that new program starts were blocked while running programs went on (app log, from 02:50; boot 02:55). No recorder samples exist."

B4. Line 1063: "The antivirus (360 Total Security, Defender off) cannot be inspected."
  Contradicted. The check measured it (thirteen-fold PowerShell start, growth, deaths at 05:04:19 and 15:20:33, leak flag: VERDICT:25-29). It was uninstalled, and Defender's real-time protection is now on (VERDICT:86-89).
  Corrected: "The antivirus (360 Total Security) was examined by the check of the freezes and removed at 16:24 and 17:13 (below)."

B5. Line 1064 (heading): "the coordinating session stopped; the PC did not."
  Incomplete. VERDICT treats 05:12 to 07:44 as one interruption: the process count climbed from 316 to 367 between 05:13 and 07:34 (VERDICT:16-17), and the crash file for "interruption 3" was written at 07:44:54 (VERDICT:40-42).
  Corrected: "...stopped; the PC ran on until it failed entering sleep at 07:34-07:44 (below)."

B6. Line 1072-1077 (three fix stages; "Not proven either way"): this is qualified by line 1112-1114, so not a defect. fix-U1's "system-wide WMI/PowerShell stall" is in fact the closest to the verdict. Saying all three are "superseded as causes" (1112) is slightly unfair to it, but not wrong.

B7. Elsewhere in section 16 I found no other statement about the cause of the stalls or of the stop. Line 927 ("process bursts") and point 6(b) are about the runner and the briefs, not about causes.

C. Point 11 against the records

C1. Line 1284: "94 needed 1,150 MB". Wrong by 2.
  Two parts finished at 1,150 MB without ever being tried at 500 MB. They are A-FENCE-EPOCH-K3 k=3,cv=2,r=1 (peak 345 MB) and k=3,cs=1,cv=1,cd=1 (peak 359 MB). They ran in the 53 s of the first ladder script's 1,150 tier (ladder.log 15:37:05-15:37:58; run-tier-1150.out lines "[35 s]" and "[36 s]"). Both would have fitted in 500 MB.
  The counts agree: results-ladder/at-500 holds 120 files, against 122 parts that ended above 500 MB. The tier-1150 header says 2,021 final, and the next tier-500 header says 2,023.
  Corrected: "3,914 fitted in 500 MB; 92 needed 1,150 MB (two more ran there first, in the first ladder script, without a try at 500 MB, at peaks of 345 and 359 MB), 26 needed 2,600 MB ..."

C2. Line 1276-1279 ("How it was run"): A-FENCE-CE (group 2) did not go through the ladder, and its smaller attempts are not all in results-ladder.
  Its 9 parts are excluded from the 500-2,600 tiers ("58 configurations" in the run-tier-500/1150/2600 headers). Eight were BOUNDED at 1,500 MB in the full run (run-full.out:1145-1152). Five of them were BOUNDED at 6,000 MB in the full run, before 15:26. The tier-6000 header says "5 bounded at >= 6000 MB, 6 to run". The remaining 4 were moved from 1,500 MB to the 6,000 tier (ladder.log, 13:31:59Z line).
  results-ladder/at-1500 holds 4 files, not 9, and at-500 lacks the two parts of C1.
  Corrected, add: "Group 2 (A-FENCE-CE) ran at 1,500 MB and then at 6,000 MB: five parts in the full run, four in the last tier. The full run's log holds the attempts that are not under results-ladder/ (five at 1,500 MB)."

C3. Line 1280-1282 ("Time"): "about 104 minutes for groups 2 to 5" understates.
  The 104 minutes are the ladder alone (15:29:17-15:43:26 plus 17:19:00-18:48:53, ladder.log; this sum is correct). Group 2's five parts also took about 29 minutes of the full run: group 1 ended at 248 s, and the run was stopped at about 2,000 s after 14:52:47 (run-full.out:1144, last line at 2,001 s).
  Corrected: "about 104 minutes of ladder for groups 3 to 5 and four parts of group 2; the other five parts of group 2 took about 29 minutes of the full run, and group 1 four minutes at three workers. In all about 2 h 15 min against RUN-FULL.md's estimate of about 4 hours at four workers (RUN-FULL.md:204)."

C4. Line 1272 ("The decision"): "The owner stopped the full run after group 5".
  Inconsistent with line 994, and with the record: the full run was stopped at about 15:25 during group 2. RUN-LADDER.md:8 says he decided to end the run after group 5.
  Corrected: "The owner decided to end the run after group 5 and asked for every core to be used."

C5. Line 1287 ("Sizes"): "the largest: 28.1 million states, 3,115 MB".
  Correct for the largest complete part (D2-K4-R2 k=4,cs=1,cv=1,cd=1,r=1: 28,084,354 states, peak 3,115 MB). But the nine BOUNDED A-FENCE-CE parts are larger, at 45.4 to 46.8 M states.
  Corrected: "(the larger of the two: 28.1 million states ...)".

C6. Line 1346-1348 ("Not shown"): "four of the fixes are oracles in this model". Incomplete against point 2 (line 980-981) and the fidelity review. Reconcile and the --ce fence are oracles too, and with the oracles replaced by the contract, "DF itself fails" (model-fidelity.json, summary text).
  Corrected: "four of the fixes, reconcile and the --ce fence are oracles in this model; with them as built DF fails (point 2), so ..."

C7. Line 1340-1343 (A-WX): the paraphrase omits the reason the fidelity review gives. The model's reconcile marks the row committed from the COMMIT record, a branch the contract does not have. Without that branch, WX is load-bearing (RV-WX-ONLY fails in 6 steps) (model-fidelity.json, vacuous_or_weak).
  Corrected: "...is never exercised, because the model's reconcile has a branch the contract lacks (it marks a row committed from the COMMIT record); without that branch, A-WX fails AtMostOneCommit in 6 steps (the review's RV-WX-ONLY), and with reconcile removed (A-WX+RECONCILE) it fails in this run."

C8. Side effects of point 11 on point 2 that the edit left standing:
  - Line 990: "Its table is therefore not in this section; it is committed with the results." Point 11 now carries the tables.
  - Line 1016: "until the full run holds". The full run was replaced by groups 1 to 5.
  Corrected 990: "...its tables for groups 1 to 5 are in point 11." Corrected 1016: "...until the model holds with the oracles modelled as built (point 11 holds only for the idealised design)."

  Everything else in C matches the records:
  - The totals: 59 configurations, 5,163 parts, 5,154 complete, 9 BOUNDED, none failed, 3,428,126,811 states, 53,447 cpu-s.
  - The counts 1,118 / 3,914 / 26 / 2 / 9.
  - The tier times and the worker counts: 16 cap; 9 (14 lines) or 10 (2 lines) at 1,150 MB; 4; 2.
  - Every D/DF row and every ablation row at K2 and K3, with their steps; NOKILLWAKE; DFPLUS-RECHECK.
  - The 20 rows, with A-DRAIN and A-WX failing nothing.
  - A-FENCE-CE: Slots(12), TwoCoordinatorsAct(2), OneSessionPerAttempt(12), 11 undecided, 45.4-46.8 M states; the fidelity review's "infinite state space".
  - "New against point 2", which agrees with line 966-969.
  - Commit 164df64 does say "the design without them fails five"; the records show seven.

D. Does point 11 claim more than the run shows?

D1. Line 1334: "With the six fixes the design holds all 14 properties at every size that was run."
  This does follow from SUMMARY.json/SUMMARY.md: all eight DF rows are "ok" in all 14 columns, all complete.
  But it is stated bare. The fidelity review, and point 2 at line 1010-1012, say that some of the 14 are weak:
  - RestartLimit is vacuous with respect to its counter;
  - TwoCoordinatorsAct only restates the fence;
  - AtMostOneCommit's mechanism is never exercised;
  - NoFalseSuspicion is largely assumed by the timeliness rule.
  The fixes, reconcile and the fence it rests on are oracles.
  "4 faults" also means K4: at most one fault of each kind (RUN-FULL.md:55).
  Corrected: "With the six fixes the model of the idealised design (four fixes, reconcile and the --ce fence as oracles) holds all 14 properties, three of them weak (point 2), at every size that was run: ... 4 faults at most one of each kind ..."

D2. The oracle/R57 caveat is the fifth bullet ("Not shown"), after three bold headline claims. The results files a reader will open carry no caveat: results/DIGEST.md ends with "DESIGN WITH FIXES, rows that are not 'complete, none fail': none", and neither SUMMARY.md nor RUN-LADDER.md mentions oracles or R57 (grep: no hits).
  Fix: put the caveat into the first bullet as in D1, and add one line to model/results/DIGEST.md: "The design with fixes is modelled with oracles (four fixes, reconcile, --ce fence); see protocol §16 point 2. R57 stays blocked."

Verified myself, with grep, paste, sort, uniq, wc, sed and awk over the files:
- the per-part counts by top-level "status"/"mem_mb" (1,118 / 3,914 / 94 / 26 / 2 / 9 BOUNDED = 5,163 files; 59 configuration folders);
- the largest part, and the peaks of the two parts without a 500 MB attempt;
- the results-ladder file counts (120 / 28 / 2 / 4);
- the ladder.log times;
- the "(N running)" worker counts per tier;
- every table row against SUMMARY.md and DIGEST.md;
- the recorder CPU and free-memory figures 15:38-15:45:34;
- the full-run timing in run-full.out;
- the model-fidelity.json text;
- the message of commit 164df64.
