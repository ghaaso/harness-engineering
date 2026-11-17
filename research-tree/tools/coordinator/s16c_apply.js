// third pass over section 16 (2026-11-17, evening): the corrections of the independent check (section16-check-3.md,
// findings A1 to D1) and point 12, the owner's ruling on testing. Every anchor must be found exactly once.
// usage: node s16c_apply.js <protocol document>
const fs = require("fs");
const DOC = process.argv[2];
let d = fs.readFileSync(DOC, "utf8");
const once = (name, from, to) => { const n = d.split(from).length - 1; if (n !== 1) { console.error("edit " + name + ": anchor found " + n + " times"); process.exit(1); } d = d.split(from).join(to); };

once("A1", "not a load (point 4, last bullets). The lane and the no-burst rule stay as care for the machine, not\n  as a proven remedy.",
  "not memory (point 4, last bullets); what blocks the starts is not established. The lane and the\n  no-burst rule stay as care for the machine, not as a proven remedy.");
once("A2", "A short command never returns; calls answered inside the\n    app go on for a few seconds; programs already running carry on; the app's own main process is stuck\n    in a start (`spawn:git`, `spawn:taskkill`), which is its \"not responding\" window.",
  "In three of the four, the first call that never returned\n    was a short command (a program start); calls answered inside the app go on for a few seconds;\n    programs already running carry on; the app's own main process is stuck in a start (`spawn:git`,\n    `spawn:taskkill`), which is its \"not responding\" window.");
once("A3a", "  - So the stop of about 05:10 was a blocked program start, not the session's full context: the stuck\n    start came back at 05:37:31 as access denied.",
  "  - So the stop at about 05:12 was a blocked program start; the verdict counts the earlier reading (the\n    session's full context) among the causes that were wrong or partial. The stuck start came back at\n    05:37:31 as access denied.");
once("A3b", "the stop of about 05:10 was a blocked program\n  start, not the session's context (point 4). What carries the rule is the design's own figure (R12, R50)\n  and the measurement above.",
  "the stop at about 05:12 was a blocked program\n  start (point 4); the full-context reading is not supported. What carries the rule is the design's own\n  figure (R12, R50) and the measurement above.");
once("A4", "Interruptions 1 and 2 show the same signature but have no machine record.",
  "Interruptions 1 and 2 show the same signature but have no recorder samples\n  and cannot be attributed.");
once("A5", "the\n  processor at 85 to 99 %. Its summary stops at 15:43:26. The recorder goes on until 15:45:34 and shows\n  19,283 MB free, 2 to 5 % CPU and the run's node processes still alive. The PC was restarted at 15:45,\n  and again at 17:13 after the owner had uninstalled the antivirus. The run was picked up at 17:19 and\n  lost no result.",
  "the\n  processor mostly at 85 to 99 % (mean 89 %). Its summary stops at 15:43:26. The recorder goes on until\n  15:45:34 and shows about 19,300 MB free, 1 to 6 % CPU and the run's node processes still alive. The PC\n  was hard-reset at 15:45, and restarted at 17:13 after the owner had uninstalled the antivirus. The run\n  was picked up at 17:19 and lost no result.");
once("A6", "usual work are the test, and one recurrence refutes it. A second kind of trouble exists around sleep\n  (20 of 52 unclean restarts in 56 days carry a sleep flag).",
  "usual work are the test, and one recurrence refutes it. Against it: 18 unclean restarts happened in\n  the 13 days before it was installed. A second kind of trouble exists around sleep (20 of 52 unclean\n  restarts in 56 days carry a sleep flag).");
once("B1", "these pools as \"the loads that came before the stalls\"). No machine record of the minutes before\n  exists. A resume",
  "these pools as \"the loads that came before the stalls\", a cause the check of the freezes found wrong\n  or partial). No recorder samples exist; the app's log shows a blocked program start from 01:26, and\n  the boot was at 01:44. A resume");
once("B3", "- **02:34, a second stall.** Every process crawled for about 20 minutes until the owner restarted the PC\n  (memory note). Running: the self-test over many cases again. No machine record exists.",
  "- **02:34, a second stall.** The memory note says every process crawled for about 20 minutes until the\n  owner restarted the PC; the check of the freezes found instead that new program starts were blocked\n  while running programs went on (the app's log, from 02:50; boot at 02:55). Running: the self-test over\n  many cases again. No recorder samples exist.");
once("B4", "The antivirus (360 Total Security, Defender off) cannot be inspected.",
  "The antivirus (360 Total Security) was examined by the check of the\n  freezes and uninstalled the same day (below).");
once("B5", "- **About 05:10 to 05:27, the coordinating session stopped; the PC did not.** The recorder's samples run",
  "- **About 05:10 to 05:27, the coordinating session stopped; the PC ran on until it failed on the way\n  into sleep at 07:34 to 07:44 (below).** The recorder's samples run");
once("C1", "500 MB; 94 needed 1,150 MB, 26 needed 2,600 MB and 2 needed 6,000 MB (the largest: 28.1 million\n  states, 3,115 MB counted by the checker). Nine stayed BOUNDED at 6,000 MB: the nine parts of A-FENCE-CE.",
  "500 MB; 92 needed 1,150 MB (two more ran there without a try at 500 MB, in the first ladder script, at\n  peaks of 345 and 359 MB), 26 needed 2,600 MB and 2 needed 6,000 MB (the larger of the two: 28.1 million\n  states, 3,115 MB counted by the checker). Nine stayed BOUNDED at 6,000 MB, at 45 to 47 million states\n  each: the nine parts of A-FENCE-CE.");
once("C2", "None is cut down or skipped; the attempts at the smaller sizes\n  are kept in `model/results-ladder/`.",
  "None is cut down or skipped; the attempts at the smaller sizes\n  are kept in `model/results-ladder/`. Group 2 (A-FENCE-CE) did not go through the ladder: it ran at\n  1,500 MB and then at 6,000 MB, five parts in the full run and four in the last tier; the full run's log\n  (`results/run-full.out`) holds its attempts that are not under `results-ladder/`.");
once("C3", "18:49: about 104 minutes for groups 2 to 5. Group 1 had taken four minutes at three workers.\n  RUN-FULL.md had estimated about 4 hours for groups 1 to 5 at four workers.",
  "18:49: about 104 minutes for groups 3 to 5 and four parts of group 2. The other five parts of group 2\n  had taken about 29 minutes of the full run, and group 1 four minutes, at three workers. In all about\n  2 h 15 min, against RUN-FULL.md's estimate of about 4 hours for groups 1 to 5 at four workers.");
once("C4", "- **The decision.** The owner stopped the full run after group 5 and asked for every core to be used.",
  "- **The decision.** The owner decided to end the run after group 5 and asked for every core to be used.");
once("C6", "- **Not shown.** Point 2 stands: four of the fixes are oracles in this model, so this run tests the\n  idealised design and R57 stays blocked. Not run:",
  "- **Not shown.** Point 2 stands: four of the fixes, reconcile and the --ce fence are oracles in this\n  model, and with them as built the design with the fixes fails. So this run tests the idealised design\n  and R57 stays blocked. Not run:");
once("C7", "be needed. For A-WX the fidelity review gave the reason (the mechanism behind AtMostOneCommit is never\n  exercised; with reconcile taken out as well, A-WX+RECONCILE, AtMostOneCommit fails). This is a\n  statement about the model, not a finding that the safeguards can go.",
  "be needed. For A-WX the fidelity review gave the reason: the mechanism behind AtMostOneCommit is never\n  exercised, because the model's reconcile has a branch the contract lacks (it marks a row committed\n  from the COMMIT record). Without that branch A-WX fails AtMostOneCommit in 6 steps (the review's\n  RV-WX-ONLY), and with reconcile taken out as well (A-WX+RECONCILE) it fails in this run. This is a\n  statement about the model, not a finding that the safeguards can go.");
once("C8a", "Its table is therefore not in this section; it is committed with the results.",
  "Its tables for groups 1 to 5 are in point 11.");
once("C8b", "The protocol stays blocked by its own R57 until the full run holds and the oracles are modelled as\nbuilt.",
  "The protocol stays blocked by its own R57 until the model holds with the oracles modelled as built\n(point 11 holds only for the idealised design; point 12 says at which sizes it is to be checked).");
once("D1", "- **With the six fixes the design holds all 14 properties at every size that was run**: 2 fields with 2, 3\n  and 4 faults and 3 fields with 2 faults, each with R = 1 and R = 2. New against point 2:",
  "- **With the six fixes the model of the idealised design holds all 14 properties at every size that was\n  run**: 2 fields with 2, 3 and 4 faults (4 faults: at most one of each kind) and 3 fields with 2 faults,\n  each with R = 1 and R = 2. Idealised means that four of the fixes, reconcile and the --ce fence are\n  oracles in the model and that several of the 14 properties are weak (point 2). New against point 2:");

if (/^\*\*12\. /m.test(d)) { console.error("the document already has a point 12"); process.exit(1); }
const p12 = [
  "**12. The owner's ruling on testing (2026-11-17, about 17:50).**",
  "",
  "Recorded from the coordinating session's notes (`feedback-no-useless-testing` and the hand-over note of the",
  "build); its message with the ruling did not reach the session that writes this. The owner: \"we also want",
  "to avoid useless extensive testing that wastes a shit ton of our time\". Four cuts were put to him, and he",
  "answered \"Yes, cut them\":",
  "",
  "1. The corrected design is model-checked only at the sizes where its fixes act, not on the whole matrix.",
  "   R57's full run no longer means the 77 configurations of `model/RUN-FULL.md`. The run of groups 1 to 5",
  "   (point 11) stays; groups 6 to 11 are not planned.",
  "2. One attack round per fix; another only for a finding that would break it.",
  "3. Before the pilot, only three checks with the real app: the guard hook fires for helpers; a stop ends a",
  "   session with its helpers; a background command's exit wakes the coordinator. The other tests of",
  "   point 10 run only if the pilot shows a need.",
  "4. The full test suite runs once, at the end of a change.",
  "",
  "The six questions of point 9 are not touched by this ruling and are still open.",
].join("\n");
d = d.replace(/\n*$/, "\n") + "\n" + p12 + "\n";
fs.writeFileSync(DOC, d);
console.log("applied 20 corrections and point 12; the document now has " + d.split("\n").length + " lines");
