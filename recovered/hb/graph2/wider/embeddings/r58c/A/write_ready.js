// Agent A, r58c phase 1: writes LANE/r58c/READY-format (the format sha256, a sha256 manifest of each test hand-off
// folder, one line on the contents, CONFLICTS). Run from the host: node r58c/A/write_ready.js
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const L = path.resolve(__dirname, '..', '..');
const sha = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
function walk(d, base, out) {
  for (const n of fs.readdirSync(d).sort()) {
    const p = path.join(d, n), r = base ? base + '/' + n : n;
    if (fs.statSync(p).isDirectory()) walk(p, r, out); else out.push(r);
  }
  return out;
}
const lines = [];
lines.push("READY-format (agent A, round r58c, phase 1), revision 5 (rulings 90-91, 95; note 18 (a): six fake arms in the pick8 tuning hand-off; the late-50 TEST tuning hand-off; the ruling on check 8; format revision 1d) " + new Date().toISOString());
lines.push("");
lines.push("train/HANDOFF-FORMAT.md version 2, revision 1d sha256 " + sha(path.join(L, "train", "HANDOFF-FORMAT.md")));
lines.push("  change 1c -> 1d (text only): a TEST tuning hand-off carries one arm (10 variants, as late-50) or all six (40, as pick8),");
lines.push("  a held-out TEST hand-off one arm; header, section 1 item 11, section 2 \"Test hand-offs\" and a history line. Revision 1c");
lines.push("  was 61410cace4d3f023900ebb0b23f24c7c373da20ee8377bd03d10969bfffde369 (r58c/A/pre/HANDOFF-FORMAT_rev1c.md).");
lines.push("  change 1b -> 1c: refusal 8 reads \"the task's file seed is among the answer's seeds, and parent equals the task row's\"");
lines.push("  (was \"parent and first seed\"); a history line in the header; nothing else. Revision 1b was");
lines.push("  9f86534c30968f698d668cde15fc70f8a9768d7f227430129db36cf9aafc118e (r58c/A/pre/HANDOFF-FORMAT_rev1b.md). No hand-off,");
lines.push("  answer_level.py or heldout.py records this file's sha256 (they carry only the format string), so none goes stale.");
lines.push("  change 1 -> 1b: one note in section 2 (held-out) that the folder's parts/ and progress.jsonl are heldout.py's working");
lines.push("  files, outside the hand-off and not in `files`; nothing else. Revision 1 was 49e91404365f27c450c78122c1c026c56853f08dc62c2c550ea1dae25169d9c5");
lines.push("  (reconstructed, hash verified: r58c/A/pre/HANDOFF-FORMAT_rev1.md).");
lines.push("  (revision 0 was e5b3c45d2ddee36dd7b4f8c607b19fcc96ad34fda41b07531f53229272c69b21. Revision 1 adds two HANDOFF.json keys,");
lines.push("  absent_tasks (ruling 91: {<variant name>: {pool: n, unrestricted: n}}, every variant, 0 included) and test_set");
lines.push("  (pick8 | late50 in a TEST hand-off, null in a real one); names the two fixed test sets and the TEST tuning hand-off's");
lines.push("  10 variants; describes the lane's pre-check. The format string in HANDOFF.json stays \"train/HANDOFF-FORMAT.md version 2\".)");
lines.push("binding interface: orchestrator/grader-interface-v2.md sha256 " + sha(path.join(L, "orchestrator", "grader-interface-v2.md")));
const REC = path.join(L, "r58c", "A", "out", "ho_rec", "item27.json");
lines.push("TEST freeze record (the TEST item-27 record, r58c/A/out/ho_rec/item27.json) sha256 " + sha(REC));
lines.push("fakesel (r58c/A/out/fakesel, six fake arms, 78 files): r58c/A/out/fakesel.manifest sha256 " + sha(path.join(L, "r58c", "A", "out", "fakesel.manifest")) + " (r58c/A/FAKESEL-READY)");
lines.push("train/answer_level.py sha256 " + sha(path.join(L, "train", "answer_level.py")) + " (TEST hand-offs carry stamp_check: stamp | test-selection)");
lines.push("");
for (const f of ["tune", "heldout", "tune-late50"]) {
  const d = path.join(L, "r58c", "handoff-test", f), files = walk(d, "", []);
  const ho = JSON.parse(fs.readFileSync(path.join(d, "HANDOFF.json"), "utf8"));
  lines.push("## r58c/handoff-test/" + f + "/HANDOFF.json sha256 " + sha(path.join(d, "HANDOFF.json")));
  lines.push("   split " + ho.split + ", test " + ho.test + ", test_set " + ho.test_set + ", tasks " + ho.tasks + ", variants " + ho.variants.length + ", files " + files.length + " in the folder: " + Object.keys(ho.files).length + " listed in HANDOFF.json files, HANDOFF.json, " + (files.length - 1 - Object.keys(ho.files).length) + " working files (parts/, progress.jsonl) outside the hand-off (manifest below)");
  for (const r of files) lines.push(sha(path.join(d, r)) + "  " + f + "/" + r);
  lines.push("");
}
const pl = fs.readFileSync(path.join(L, "r58c", "A", "logs", "precheck_handoff.log"), "utf8").split(String.fromCharCode(10));
lines.push("## precheck as run in ktest-a25 (r58c/A/precheck_handoff.py " + pl[0].replace(/^sha256 /, "").split(" ")[0] + ", before the ruling on check 8; log r58c/A/logs/precheck_handoff.log)");
for (const l of pl) if (/^(PRECHECK|tamper|RESULT)/.test(l)) lines.push(l);
const p3 = path.join(L, "r58c", "A", "logs", "precheck_three.log");
if (fs.existsSync(p3)) {
  lines.push("## precheck after the ruling on check 8 (r58c/A/precheck_handoff.py " + sha(path.join(L, "r58c", "A", "precheck_handoff.py")) + "), on all three TEST hand-offs as built (ktest-a27 on format revision 1d; first in ktest-a26, r58c/A/precheck_three.py, log r58c/A/logs/precheck_three.log)");
  for (const l of fs.readFileSync(p3, "utf8").split(String.fromCharCode(10))) if (/^(OK|BAD|before bytes|RESULT)/.test(l)) lines.push(l);
}
lines.push("");
lines.push("Contents: tune/ is answer_level.tune (the real writer, test mode) on pick8 (37 late-50 tune tasks, 8 commits) for the four");
lines.push("comparators RRF, PPR, CO, DIR and all six tuning arms E1..E5 and PLACEBO as hash-scored fake arms (3 seeds each,");
lines.push("selectB.placebo salt 'fake' + arm, fused with PPR and CO at w 0.5), both scopes: 40 variants, the real set (ruling on");
lines.push("note 18 (a)); heldout/ is heldout.py run --test --test-set pick8 --fake-scores fakeE1 (ONE arm, E1): the same 37 TUNING");
lines.push("tasks at their 8 parents, with a TEST item-27 record and one TEST anchor line, split heldout and test true.");
lines.push("tune-late50/ is answer_level.py tune --test --sel train/selectB-test --arms PLACEBO --test-set late50 (313 tasks, 10");
lines.push("variants, stamp_check test-selection; prechecked by r58c/A/tune_late50.py, log r58c/A/logs/tune_late50.json).");
lines.push("None reads a stage-B table or held-out data; none is a result.");
lines.push("");
lines.push("## CONFLICTS");
lines.push("None open. C1 (train/stageB.py:160, make_plan's read of the held-out parents' ancestors.txt and sizes.json,");
lines.push("export/checkpoints.py:117, :122) is ruled by ruling 90: leak_audit.py lists it under ruling90_sites and does not fail");
lines.push("on it. C2 (MF-13 absent tasks) is ruled by ruling 91: implemented in train/answer_level.py; the per-variant count is");
lines.push("HANDOFF.json absent_tasks (and answer_level.json absent_tasks, the same shape).");
lines.push("");
lines.push("## QUESTION");
lines.push("The 10-or-40 question: by the ruling on note 18 (a) the pick8 TEST tuning hand-off carries the real 40; the late-50 one");
lines.push("carries one arm's 10; the held-out ones 10. The grader ignores unknown HANDOFF.json keys (absent_tasks, test_set, stamp_check).");
lines.push("Check 8 is ruled (round r58c): the task's file seed among the answer's seeds, parent equal to the task row's. In");
lines.push("tune-late50, T1-0065 and T1-0267 have seeds [const:..., file:...] (the shared packer orders seeds by node index,");
lines.push("build/arms/common/seed.js); the old pre-check failed them, the current one passes them (see above).");
fs.writeFileSync(path.join(L, "r58c", "READY-format"), lines.join(String.fromCharCode(10)) + String.fromCharCode(10));
console.log("wrote r58c/READY-format sha256 " + sha(path.join(L, "r58c", "READY-format")));
