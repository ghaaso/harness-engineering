// makes the finishing copy of the continuation workflow: three corrections, each applied exactly once or the patch fails
// usage: node patch_finish.js <source script> <patched script>
const fs = require("fs");
const [, , SRC, DST] = process.argv;
let s = fs.readFileSync(SRC, "utf8");
const once = (name, from, to) => {
  const n = s.split(from).length - 1;
  if (n !== 1) { console.error("patch " + name + ": anchor found " + n + " times, expected 1"); process.exit(1); }
  s = s.split(from).join(to);
};

// A. a review that was finished before a restart does not prove that its fix was
once("A",
  "  if (!rv || rv.from_file) return { key: u.key, review: rv, fix: rv && rv.from_file ? { from_file: DONE + '/fix-' + u.key + '.json' } : null }\n" +
  "  if (!(rv.findings.length || rv.mutations.some(m => !m.a_test_failed))) return { key: u.key, review: rv, fix: null }",
  "  if (!rv) return { key: u.key, review: rv, fix: null }\n" +
  "  // a review finished before a restart does not prove that its fix was: the fix runs unless the journals hold its result too (2026-11-17)\n" +
  "  if (rv.from_file && doneSet.has('fix:' + u.key)) return { key: u.key, review: rv, fix: { from_file: DONE + '/fix-' + u.key + '.json' } }\n" +
  "  if (!rv.from_file && !(rv.findings.length || rv.mutations.some(m => !m.a_test_failed))) return { key: u.key, review: rv, fix: null }");

// B. the fix agent is told that the stage was begun before and cut off
once("B",
  "    ref(rv, 'The review'),\n  ], { schema: FIXED, model: u.tier === 'opus' ? 'opus' : 'sonnet', effort: 'high' })",
  "    (rv.from_file ? RESUMED(u.key) : ''),\n    ref(rv, 'The review'),\n  ], { schema: FIXED, model: u.tier === 'opus' ? 'opus' : 'sonnet', effort: 'high' })");
once("B2",
  "async function reviewUnit(u, before) {",
  "const RESUMED = (k) => 'This stage was started once before and was cut off when the coordinating session stopped (the session, not the PC). The edits of that agent up to that moment are in the files of the unit. So do not start from nothing, and do not take anything for finished. First see that every file of the unit parses and run the tests of the unit as they are now. Then go through the review finding by finding and mutation by mutation, and check each against the code and the tests as they are now: what is already fixed AND has a test that fails without the fix, report as fixed (name the test) without redoing it; what is half done (a script changed without its test, a test without its script, a spec that does not match yet), finish; what is missing, do. If that agent left a note at ' + DONE + '/fix-' + k + '.json with a status of in-progress, it is a claim to check, not a result; your return replaces that file. If a lane command times out, do not repeat it as it is: run the test files one at a time to find the test that hangs. Two of the last commands before the stop timed out at 300 seconds (all test files of U2 in one command; the admit and stop tests in one command) although the same commands had ended in 43 and 147 seconds before: most likely an effect of the session stopping, but check it and say what you found.'\n\n" +
  "async function reviewUnit(u, before) {");

// C. the whole suite runs through the lane, one file after another, never four at once
once("C",
  "(3) Run the whole suite, `node --test --test-concurrency=4 ' + TCB + '/test/`, and fix what fails.",
  "(3) Run the whole suite, every test file under ' + TCB + '/test/, through the lane with --test-concurrency=1 and never several files at once: one lane command per test file, or per few files when they end within 300 seconds together (the whole folder in one command would outlast the limit of one Bash call). Add up passed, failed and skipped over all files for suite, put the numbers per file in suite.output_tail, and fix what fails.");
once("D",
  "(4) Run `node ' + TCB + '/selftest.mjs` as its spec says.",
  "(4) Run `node ' + TCB + '/selftest.mjs` as its spec says, through the lane; if a full run cannot end within one lane command, run it in parts with the options the script has for that and say which parts ran.");

fs.writeFileSync(DST, s);
console.log("patched: " + DST + " (" + s.length + " chars)");

// E (added 14:10 after the check of section 16): the library's branch follows the same rule as the units'
s = fs.readFileSync(DST, "utf8");
once("E",
  "  if (!rv || rv.from_file || !(rv.findings.length || rv.mutations.some(m => !m.a_test_failed))) return { review: rv, fix: rv && rv.from_file ? { from_file: DONE + '/lib-fix.json' } : null }",
  "  if (!rv) return { review: rv, fix: null }\n" +
  "  if (rv.from_file && doneSet.has('lib:fix')) return { review: rv, fix: { from_file: DONE + '/lib-fix.json' } }\n" +
  "  if (!rv.from_file && !(rv.findings.length || rv.mutations.some(m => !m.a_test_failed))) return { review: rv, fix: null }");
fs.writeFileSync(DST, s);
console.log("patch E applied");
