// replaces point 12 of section 16 (the last block of the document) with the ruling as the coordinating session's
// message gave it, after that message arrived (2026-11-17, about 19:20)
// usage: node s16d_point12.js <protocol document>
const fs = require("fs");
const DOC = process.argv[2];
let d = fs.readFileSync(DOC, "utf8");
const head = "**12. The owner's ruling on testing (2026-11-17, about 17:50).**";
const i = d.indexOf(head);
if (i < 0 || d.indexOf(head, i + 1) >= 0) { console.error("point 12 not found exactly once"); process.exit(1); }
const old = d.slice(i);
if (!/did not reach the session that writes this/.test(old) || /^\*\*13\. /m.test(old)) { console.error("point 12 is not the block this script expects"); process.exit(1); }
const p12 = [
  head,
  "",
  "This is the owner's ruling, not a finding of the build. The coordinating session passed it on. The owner:",
  "\"we also want to avoid useless extensive testing that wastes a shit ton of our time\". The coordinating",
  "session then listed four cuts for the tree work, and he answered: \"Yes, cut them\". The four cuts, as he",
  "approved them:",
  "",
  "1. Model checking of the corrected design: only the sizes where the fixes act (hours), not the whole",
  "   matrix (weeks).",
  "2. Attack rounds on the fixes: one round per fix; another only for a finding that would break it.",
  "3. App checks before the pilot: only the three that could stop the pilot (the guard hook firing for",
  "   helpers, a stop ending a session with its helpers, a background command's exit waking the",
  "   coordinator); the rest only if the pilot shows a need.",
  "4. Full test-suite runs: once at the end of a change, not at every stage.",
  "",
  "The rule behind them, in the coordinating session's words: a test runs only if its result can change what",
  "we do next.",
  "",
  "What it changes:",
  "",
  "- **R57.** Its \"full run\" now means the sizes where the fixes act, not the 77 configurations of",
  "  `model/RUN-FULL.md`. The run of groups 1 to 5 (point 11) stays as it is; groups 6 to 11 are not run. A",
  "  cut-off part is rerun at a larger size only if it hides a property of the design with the fixes. The",
  "  nine cut-off parts of point 11 belong to A-FENCE-CE, a variant with a safeguard taken out, so none is",
  "  rerun.",
  "- **Before the pilot** (section 10, and point 10 of this section). The checks that need the real app",
  "  shrink to the three named in cut 3. Every other row of point 10 is marked \"only if the pilot shows a",
  "  need\". The ruling is about tests: it does not change the scripts and files that section 10 lists.",
  "- **Reviews and suites.** One attack round per fix, and the full suite once at the end of a change.",
  "",
  "The six questions of point 9 are not touched by this ruling and are still open.",
].join("\n");
d = d.slice(0, i) + p12 + "\n";
fs.writeFileSync(DOC, d);
console.log("point 12 replaced (" + p12.split("\n").length + " lines); the document now has " + d.split("\n").length + " lines");
