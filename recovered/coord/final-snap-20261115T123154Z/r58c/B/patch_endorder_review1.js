// agent B, r58c: the coordinator's four changes after reading END-ORDER.md 1cdcb6e7 (memgate sample rule, the reset
// paragraph, the step-6 anchor checks, the 2c clause). Run from LANE.
const fs = require('fs');
const P = 'orchestrator/END-ORDER.md';
let s = fs.readFileSync(P, 'utf8');
function rep(a, b) { if (s.split(a).length !== 2) throw new Error('not exactly once: ' + a.slice(0, 100)); s = s.replace(a, () => b); }
// 1 + 2: section 0
rep(`- **The launchers need a working \`orchestrator/memgate.sh\`**: its samples come from PowerShell, which the sandboxed
  Bash of the coordinator's post-reset session blocks (the samples come back empty, so \`lane_step.sh\` gives up after
  80 samples, exit 4, and \`memgate.sh wait\` never returns). The coordinator starts every launcher outside that sandbox.
`, `- **The launchers need a working \`orchestrator/memgate.sh\`**, whose samples come from PowerShell. The lane starts
  every launcher itself, from a shell in which \`sh orchestrator/memgate.sh sample\` prints two numbers, and takes one
  such sample before each start to check that. A launcher that sees an empty sample stops and reports instead of
  waiting: \`r58c/B/ktest.sh\`, \`r58c/B/lane_step.sh\` and \`r58c/B/rerun_check.sh\` take one sample before
  \`memgate.sh wait\` and exit 9 (MEMGATE_EMPTY) when it is empty, one field or not numbers; \`orchestrator/end_of_run.sh\`
  does the same at its step 4 and exits 14 (MEMGATE_EMPTY). (After the 2026-11-14 reset the lane's own shell was
  sandboxed and could not run PowerShell: every sample came back empty, so \`memgate.sh wait\` never returned.) Tests:
  \`r58c/B/tests/test_memgate_empty.sh\` (host, stubs) and case M of \`r58c/B/eor/test_end_of_run.sh\`.
- **After a PC reset** (there were two on 2026-11-14), before anything else the lane:
  (a) runs the freeze check \`sh r58c/B/freeze_check.sh\` if \`orchestrator/freeze-list.txt\` exists (it must print
  nothing, exit 0);
  (b) verifies the PASS evidence of the last finished step, as this file lists it for that step;
  (c) moves aside, and never reuses, any output the interrupted step had half-written (renamed to
  \`<name>.interrupted-<UTC stamp>\` beside it, kept for the audit);
  (d) runs the interrupted step again from its start, except step 7, which resumes as written there (same command,
  finished units kept), and stage B, which the guard resumes;
  (e) tells the coordinator which step was interrupted before it continues.
`);
// 3: step 6
rep(`- **Coordinator**: appends \`{"step": "coordinator", "unit": "item27_freeze", "file": "train/heldout/item27.json",
  "sha256": "<64 hex>", "t": "<UTC>"}\` to \`progress.jsonl\`.`,
`- **Coordinator, before the anchor**, checks the record: sha256(\`train/heldout/item27.json\`) equals
  \`item27.json.sha256\`; its \`tables_digest\` equals the coordinator's \`tables_digest\` line (step 1); every hash in
  \`code_sha256\` and \`pins\` equals the freeze list's line for that file; \`chosen\` equals the all-65 choice in
  \`train/report/tune.json\`; \`test\` is false. **If one check differs, the coordinator does not anchor and the
  line stops.**
- **Coordinator**: then appends \`{"step": "coordinator", "unit": "item27_freeze", "file": "train/heldout/item27.json",
  "sha256": "<64 hex>", "t": "<UTC>"}\` to \`progress.jsonl\`.`);
// 4: 2c
rep(`  \`orchestrator/rerun_compare.py\`'s \`compare\` (ruling 68: E1-E4 the loss list, both score tables and the counts
  byte-identical; E5 both score tables and the counts).`,
`  \`orchestrator/rerun_compare.py\`'s \`compare\` (ruling 68: E1-E4 the loss list, both score tables and the counts
  byte-identical; E5 both score tables and the counts). It compares losses, both score tables and the counts only:
  stage B keeps no representation tensors (\`reps.pt\` is deleted after scoring), so none are compared
  (\`compare\` records \`reps\` as "not kept by the part").`);
// the stop lists name the new codes
rep(`- **Stops the line**: any non-zero exit. A quarantine at step 3 or 5 means the guard redoes the unit; rerun step 1`,
`- **Stops the line**: any non-zero exit (14 MEMGATE_EMPTY: start it again from a shell that can sample). A quarantine at step 3 or 5 means the guard redoes the unit; rerun step 1`);
fs.writeFileSync(P, s);
console.log('END-ORDER patched');
