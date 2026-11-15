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
lines.push("READY-format (agent A, round r58c, phase 1), revision 2 (rulings 90-91; the grader's fixed test set pick8) " + new Date().toISOString());
lines.push("");
lines.push("train/HANDOFF-FORMAT.md version 2, revision 1b sha256 " + sha(path.join(L, "train", "HANDOFF-FORMAT.md")) + " (frozen; copy r58c/A/pre/HANDOFF-FORMAT_rev1b.md)");
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
lines.push("");
for (const f of ["tune", "heldout"]) {
  const d = path.join(L, "r58c", "handoff-test", f), files = walk(d, "", []);
  const ho = JSON.parse(fs.readFileSync(path.join(d, "HANDOFF.json"), "utf8"));
  lines.push("## r58c/handoff-test/" + f + "/HANDOFF.json sha256 " + sha(path.join(d, "HANDOFF.json")));
  lines.push("   split " + ho.split + ", test " + ho.test + ", test_set " + ho.test_set + ", tasks " + ho.tasks + ", variants " + ho.variants.length + ", files " + files.length + " in the folder: " + Object.keys(ho.files).length + " listed in HANDOFF.json files, HANDOFF.json, " + (files.length - 1 - Object.keys(ho.files).length) + " working files (parts/, progress.jsonl) outside the hand-off (manifest below)");
  for (const r of files) lines.push(sha(path.join(d, r)) + "  " + f + "/" + r);
  lines.push("");
}
const pl = fs.readFileSync(path.join(L, "r58c", "A", "logs", "precheck_handoff.log"), "utf8").split(String.fromCharCode(10));
lines.push("## precheck (r58c/A/precheck_handoff.py, sha256 " + sha(path.join(L, "r58c", "A", "precheck_handoff.py")) + ", log r58c/A/logs/precheck_handoff.log)");
for (const l of pl) if (/^(PRECHECK|tamper|RESULT)/.test(l)) lines.push(l);
lines.push("");
lines.push("Contents: tune/ is answer_level.tune (the real writer, test mode) on pick8 (37 late-50 tune tasks, 8 commits) for the four");
lines.push("comparators RRF, PPR, CO, DIR and one hash-scored fake arm E1 (3 seeds, selectB.placebo salt fakeE1, fused with PPR and");
lines.push("CO at w 0.5), both scopes; heldout/ is heldout.py run --test --test-set pick8 --fake-scores fakeE1: the same 37 TUNING");
lines.push("tasks at their 8 parents, with a TEST item-27 record and one TEST anchor line, split heldout and test true.");
lines.push("Neither reads a stage-B table or held-out data; neither is a result.");
lines.push("");
lines.push("## CONFLICTS");
lines.push("None open. C1 (train/stageB.py:160, make_plan's read of the held-out parents' ancestors.txt and sizes.json,");
lines.push("export/checkpoints.py:117, :122) is ruled by ruling 90: leak_audit.py lists it under ruling90_sites and does not fail");
lines.push("on it. C2 (MF-13 absent tasks) is ruled by ruling 91: implemented in train/answer_level.py; the per-variant count is");
lines.push("HANDOFF.json absent_tasks (and answer_level.json absent_tasks, the same shape).");
lines.push("");
lines.push("## QUESTION");
lines.push("None open. The 10-or-40 question is answered by the coordinator: a TEST tuning hand-off carries 10 (built: 4 comparators");
lines.push("+ E1 alone/fused s1-s3), only the real one 40; the grader ignores unknown HANDOFF.json keys (absent_tasks, test_set).");
fs.writeFileSync(path.join(L, "r58c", "READY-format"), lines.join(String.fromCharCode(10)) + String.fromCharCode(10));
console.log("wrote r58c/READY-format sha256 " + sha(path.join(L, "r58c", "READY-format")));
