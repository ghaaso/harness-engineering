// second edit of section 16 of the protocol document (2026-11-17, evening): the model run's outcome (a new point 11)
// and the correction of points 2 to 5 after the check of the freezes. Every anchor must be found exactly once.
// usage: node s16b_apply.js <protocol document> <point 11 file>
const fs = require("fs");
const [, , DOC, P11] = process.argv;
let d = fs.readFileSync(DOC, "utf8");
if (/\r\n/.test(d)) { console.error("the document has CRLF line endings; expected LF"); process.exit(1); }
const once = (name, from, to) => { const n = d.split(from).length - 1; if (n !== 1) { console.error("edit " + name + ": anchor found " + n + " times"); process.exit(1); } d = d.split(from).join(to); };

// E1: point 2, the paragraph on the full run
once("E1",
  "is a process of the session that started it: if that session or the PC stops, the same command picks\nit up.",
  "is a process of the session that started it: if that session or the PC stops, the same command picks\nit up.\n\n" +
  "**Changed the same afternoon, on the owner's decision:** the full run was stopped at about 15:25, after\n" +
  "group 1 and five of the nine parts of group 2, and replaced by a run of groups 1 to 5 only, with as many\n" +
  "workers as the machine carries. Its outcome is in point 11.");

// E2: point 3, why the lane and the no-burst rule exist
once("E2",
  "(LR-3) and the runner check (RC-1) each found such a burst in code and removed it.",
  "(LR-3) and the runner check (RC-1) each found such a burst in code and removed it. *Corrected on\n" +
  "  2026-11-17, evening:* the check of the freezes found that what failed was the start of new programs,\n" +
  "  not a load (point 4, last bullets). The lane and the no-burst rule stay as care for the machine, not\n" +
  "  as a proven remedy.");

// E3: point 4, the third interruption and the fix stages' opinions
once("E3a",
  "The memory\n  note says the session stopped during a wait with its context about 90 % full. The recorder's log ends\n  at 07:34:27 and resumes at 12:07:46; why is not recorded.",
  "The memory\n  note said the session stopped during a wait with its context about 90 % full; that reading is withdrawn\n  (see the correction below). The recorder's log ends at 07:34:27, when Windows began a transition into\n  sleep, and resumes at 12:07:46.");
once("E3b",
  "ruled anything out. Whether the full context caused the stop is not proven; the token count at the\n  stop is not recorded.",
  "ruled anything out. The token count at the stop is not recorded.");
once("E3c",
  "  Consequence for the briefs: \"never put a command in the background\" cannot be kept by a helper alone\n  when a lane command runs longer than 180 s.\n",
  "  Consequence for the briefs: \"never put a command in the background\" cannot be kept by a helper alone\n  when a lane command runs longer than 180 s.\n" +
  "- **15:43:26, a fourth interruption.** The ladder run of point 11 was in its first tier: 16 workers, the\n" +
  "  processor at 85 to 99 %. Its summary stops at 15:43:26. The recorder goes on until 15:45:34 and shows\n" +
  "  19,283 MB free, 2 to 5 % CPU and the run's node processes still alive. The PC was restarted at 15:45,\n" +
  "  and again at 17:13 after the owner had uninstalled the antivirus. The run was picked up at 17:19 and\n" +
  "  lost no result.\n" +
  "- **Corrected on 2026-11-17, evening, after a check of the freezes** (seven agents, two of them\n" +
  "  refuters; the record is `docs/program/evidence/pc-freezes-2026-11-17/VERDICT.md`, and it holds where\n" +
  "  it and the bullets above differ). Established:\n" +
  "  - It is not a memory shortage. At all four interruptions 11.8 to 19.3 GB was free.\n" +
  "  - What fails is the start of a new program. A short command never returns; calls answered inside the\n" +
  "    app go on for a few seconds; programs already running carry on; the app's own main process is stuck\n" +
  "    in a start (`spawn:git`, `spawn:taskkill`), which is its \"not responding\" window.\n" +
  "  - The app's log (`%LOCALAPPDATA%\\Claude\\logs\\main.log`) shows the same block four times on this\n" +
  "    day, at 01:26, 02:50, 05:12 and 15:43 (the times in the bullets above come from the memory note\n" +
  "    and the recorder), and on 2, 6, 13, 14 and 15 November.\n" +
  "  - So the stop of about 05:10 was a blocked program start, not the session's full context: the stuck\n" +
  "    start came back at 05:37:31 as access denied.\n" +
  "  - The restart of 07:44 was Windows failing on the way into sleep (the transition began at 07:34:27;\n" +
  "    bugcheck 0xA0; a crash file was written at 07:44:54), not a reset by the owner.\n" +
  "- **Not established: what causes the block.** The antivirus (360 Total Security) slowed every\n" +
  "  PowerShell start thirteen-fold and was the only third-party security product; the owner uninstalled\n" +
  "  it and restarted the PC at 17:13. Whether it caused the blocks is not proven: several days of the\n" +
  "  usual work are the test, and one recurrence refutes it. A second kind of trouble exists around sleep\n" +
  "  (20 of 52 unclean restarts in 56 days carry a sleep flag). Three causes named on this day were wrong\n" +
  "  or partial: the model checker's load, the coordinating session's full context, PowerShell starts\n" +
  "  feeding the antivirus. Interruptions 1 and 2 show the same signature but have no machine record.\n" +
  "- **What this changes above.** The opinions of the three fix stages are superseded as causes. The\n" +
  "  lane's missing end lines at 05:16 fit a blocked start, since its timeout path starts `taskkill`; that\n" +
  "  is an inference, no record shows it.\n");

// E4: point 5, the reason given for R59
once("E4",
  "starts the successor. Outside it: the session, through the app's usage tool, or the owner.] Because\n  the session that coordinated this build stopped with its context about 90 % full; that the full\n  context caused the stop is not proven.",
  "starts the successor. Outside it: the session, through the app's usage tool, or the owner.] Its first\n  reason is withdrawn (corrected 2026-11-17, evening): the stop of about 05:10 was a blocked program\n  start, not the session's context (point 4). What carries the rule is the design's own figure (R12, R50)\n  and the measurement above.");

// E5: point 11 at the end of the section, which is the end of the document
const p11 = fs.readFileSync(P11, "utf8").replace(/\r\n/g, "\n").trim();
if (!p11.startsWith("**11. ")) { console.error("the point 11 file does not start with its heading"); process.exit(1); }
if (/<<|>>/.test(p11)) { console.error("a marker is left in point 11"); process.exit(1); }
if (/^\*\*11\. /m.test(d)) { console.error("the document already has a point 11"); process.exit(1); }
d = d.replace(/\n*$/, "\n") + "\n" + p11 + "\n";
fs.writeFileSync(DOC, d);
console.log("applied: E1, E2, E3a, E3b, E3c, E4 and point 11 (" + p11.split("\n").length + " lines); the document now has " + d.split("\n").length + " lines");
