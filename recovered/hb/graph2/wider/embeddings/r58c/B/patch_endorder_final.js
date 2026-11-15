// agent B, r58c, after the 2026-11-14 reset: END-ORDER.md final (ruling 93's guard, the start-race gate, agent A's
// command lines as the coordinator passed them, the facts mount, ruling92.text). Run from LANE.
const fs = require('fs');
const P = 'orchestrator/END-ORDER.md';
let s = fs.readFileSync(P, 'utf8');
function rep(a, b) { if (s.split(a).length !== 2) throw new Error('not exactly once: ' + a.slice(0, 100)); s = s.replace(a, () => b); }
const LW = 'C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/wider/embeddings';
const GBW = 'C:/Users/User/AppData/Local/Temp/claude/192654871f6b1294/e24f17dc-4aea-4914-a9d1-280a723d620e/scratchpad/hb/graph2/build';
const BI = 'node train/heldout_inputs.js';
const FC = '--facts ../../build/facts/cache --common ../../build/arms/common';
// ---- section 0: two standing rules for every launcher
rep(`- Agents A and B of round r58c finished; their RUNLOG sections are appended to \`train/RUNLOG.md\` by the lead.
`, `- Agents A and B of round r58c finished; their RUNLOG sections are appended to \`train/RUNLOG.md\` by the lead.
- **Every container launcher closes the start race** (after the 2026-11-14 reset, when \`ktest-b13\` and \`ktest-G40\`
  passed "no ktest-* running" in the same second): \`r58c/B/ktest.sh\`, \`r58c/B/lane_step.sh\` and
  \`r58c/B/rerun_check.sh\` (through \`r58c/B/race_gate.sh\`) and \`orchestrator/end_of_run.sh\` start the container with
  its command held until \`/tmp/go\`, look at \`docker ps\` right after the start and again 3 s later, and release it
  only when no other matching container runs; otherwise the held container is removed (it has run nothing) and the
  launcher retries after a random 30-59 s (\`end_of_run.sh\` stops with exit 11 instead). Agent A's \`r58c/A/ktest.sh\`
  re-checks before and 3 s after its start and exits 14. Tests: \`r58c/B/tests/test_race_gate.sh\` (host, fake docker)
  and \`r58c/A/test_ktest_race.sh\` (host, stub docker); \`end_of_run.sh\`'s cases K3, K4, K3B in
  \`r58c/B/eor/test_end_of_run.sh\`.
- **The launchers need a working \`orchestrator/memgate.sh\`**: its samples come from PowerShell, which the sandboxed
  Bash of the coordinator's post-reset session blocks (the samples come back empty, so \`lane_step.sh\` gives up after
  80 samples, exit 4, and \`memgate.sh wait\` never returns). The coordinator starts every launcher outside that sandbox.
`);
// ---- step 1: ruling 93
rep(`- **Preconditions**: the stage-B guard (since ruling 92 \`orchestrator/guard-stageB-r92.sh\`; \`guard-stageB.sh\` before
  it; both write \`orchestrator/guard-stageB.log\` with the same runner string) has written \`stage B complete: no
  unit left\` as the last state line of \`orchestrator/guard-stageB.log\`; no`,
`- **Preconditions**: the stage-B guard (\`orchestrator/guard-stageB.sh\`, sha256 59d3fb8e..., the one running since
  2026-11-14T22:11Z under ruling 93, which withdrew ruling 92; \`orchestrator/guard-stageB-r92.sh\` ran from 20:57Z to
  21:41Z and its units stand; both write \`orchestrator/guard-stageB.log\` with the same runner string) has written
  \`stage B complete: no unit left\` as the last state line of \`orchestrator/guard-stageB.log\`; no`);
// ---- 2a
rep(`- **Command**: \`PROBE=1 sh LANE/train/heldout.sh\` (container \`kge-H1P\`; the probe's own options and the
  separate unit-path probe of MF-7 are agent A's; final names in \`train/heldout.py\`'s usage after round r58c).`,
`- **Commands** (agent A's; from LANE in Git Bash): the probe's staging,
  \`${BI} build --plan train/stageB/plan.json ${FC} --out probe_inputs --parents 7b3a745281898d3d5808c5a15c4916d1d9dbb1b4\`,
  then the probe, \`PROBE=1 sh train/heldout.sh\` (container \`kge-H1P\`; the unit-path probe of MF-7 is part of it).`);
// ---- 2b
rep(`- **Command**: not final (agent A's \`heldout.sh\`/\`heldout.py\` rehearsal mode). It must run: three tuning parents`,
`- **Commands** (agent A's; from LANE in Git Bash): the rehearsal's staging,
  \`${BI} build --plan train/stageB/plan.json ${FC} --out r58c/rehearsal/inputs --parents cd806c803c4ad8ec198790096d196460789951f0,2fa68134d22db238b53b12e5f24315af29dce4a0,7b3a745281898d3d5808c5a15c4916d1d9dbb1b4\`
  (the three tuning parents in full, as in \`train/stageB/plan.json\`), then \`sh r58c/A/rehearse.sh\`. It must run: three tuning parents`);
// ---- 2c: the ktest wait
rep(`  otherwise, exit 4); no \`ktest-*\` runs; \`memgate.sh wait\`, then ruling 79's start rule; C: >= 15 GB.`,
`  otherwise, exit 4); no \`ktest-*\` runs (it waits, at most 40 checks 30 s apart, then exit 4); \`memgate.sh wait\`,
  then ruling 79's start rule; C: >= 15 GB; after its start the race gate of section 0 (at most 10 starts, then exit 4).`);
// ---- 2d: the host tests
rep(`  \`parallel/tests/test_assemble_checks.sh\`, \`r58c/B/tests/*\` (\`test_rerun_check.py\` included) and the role wrappers
  \`r58c/B/tests/role_selectB.sh\`, \`r58c/B/tests/role_report.sh\`.`,
`  \`parallel/tests/test_assemble_checks.sh\`, \`r58c/B/tests/*\` (\`test_rerun_check.py\` included) and the role wrappers
  \`r58c/B/tests/role_selectB.sh\`, \`r58c/B/tests/role_report.sh\`; on the host (no container of their own besides
  the ones named): \`r58c/B/tests/test_race_gate.sh\` (fake docker, none), \`r58c/B/tests/test_freeze_check.sh\`,
  \`r58c/B/eor/test_end_of_run.sh\` (its own \`ktest-b<N>\` containers, under the lane lock) and agent A's
  \`r58c/A/test_ktest_race.sh\`. The exact order for agent B's: \`r58c/B/TEST-QUEUE.md\`.`);
// ---- 2f
rep(`- **Commands** (agent A owns \`train/heldout_inputs.js\` and gives the command lines; the coordinator passes them
  into this slot; nothing here is final until then):
  1. build: \`<SLOT A-1: heldout_inputs.js build command line>\`;
  2. its check: \`<SLOT A-2: heldout_inputs.js check command line>\` (exit 0);
  3. the staging manifest, a sha256 line for every staged file: \`<SLOT A-3: command line>\` writing
     \`<SLOT A-3 path: STAGING MANIFEST, lane-relative>\`;
  4. the graphs manifest, a sha256 line for every file of \`export/graphs/<sha>/\` and \`export/graphs0/<sha>/\` for
     the 70 held-out parents: \`<SLOT A-4: command line>\` writing \`<SLOT A-4 path: GRAPHS MANIFEST, lane-relative>\`.`,
`- **Commands** (agent A's \`train/heldout_inputs.js\`, as the coordinator passed them; from LANE in Git Bash):
  1. build: \`${BI} build --plan train/stageB/plan.json ${FC} --out heldout_inputs\`;
  2. its check, with the staging manifest \`heldout_inputs.sha256\` (a sha256 line for every staged file):
     \`${BI} check --plan train/stageB/plan.json --dir heldout_inputs --manifest heldout_inputs.sha256 ${FC}\` (exit 0);
  3. the graphs manifest, a sha256 line for every file of \`export/graphs/<sha>/\` and \`export/graphs0/<sha>/\` for
     the 70 held-out parents: \`${BI} export-manifest --plan train/stageB/plan.json --export export --out heldout_export.sha256\`.
  STAGING MANIFEST = \`heldout_inputs.sha256\`, GRAPHS MANIFEST = \`heldout_export.sha256\` (both lane-relative).`);
// ---- step 3
rep(`- **Command** (lane, host): \`sh LANE/r58c/B/freeze_list.sh <STAGING MANIFEST> <GRAPHS MANIFEST> >
  LANE/orchestrator/freeze-list.txt\``,
`- **Command** (lane, host, from LANE): \`sh r58c/B/freeze_list.sh heldout_inputs.sha256 heldout_export.sha256 >
  orchestrator/freeze-list.txt\``);
// ---- step 5
rep(`- **Command** (lane): \`python answer_level.py tune ...\` through \`lane_step.sh\` with \`train/report/answer_level\`
  writable (agent A's real-mode options; not final this round). It writes the hand-off`,
`- **Command** (lane): \`sh r58c/B/lane_step.sh ktest-r4 "train/report/answer_level" "python answer_level.py tune"\`
  (\`lane_step.sh\` mounts the facts read-only at \`/build/facts/cache\`, which it needs). It writes the hand-off`);
rep(`  hand-off, \`<SLOT A-6: precheck command line on the tuning hand-off>\` (exit 0). A refusal here stops the line`,
`  hand-off, with \`<H>\` = \`sha256sum train/report/answer_level/handoff/HANDOFF.json\`:
  \`sh r58c/B/lane_step.sh ktest-r8 "" "python /w/r58c/A/precheck_handoff.py --dir /w/train/report/answer_level/handoff --split tune --expect-sha256 <H>"\`
  (exit 0; nothing writable). A refusal here stops the line`);
// ---- step 7
rep(`- **Command**: \`sh LANE/train/heldout.sh\` (agent A's). It **builds nothing**: it verifies the staged files
  against the staging manifest of 2f and the held-out parents' graph folders against the graphs manifest of 2f
  (both manifests are in the freeze list, so the freeze check covers their bytes), refuses on any difference,
  then launches ONE container \`kge-H1\`. Agent A's exact verify options go in \`<SLOT A-5: heldout.sh verify
  behaviour and exit code>\`.`,
`- **Commands** (agent A's; from LANE in Git Bash): **it builds nothing**. First the two verifications, each exit 0:
  \`${BI} verify-export --plan train/stageB/plan.json --export export --manifest heldout_export.sha256\` (the held-out
  parents' graph folders against the graphs manifest of 2f) and the check of 2f,
  \`${BI} check --plan train/stageB/plan.json --dir heldout_inputs --manifest heldout_inputs.sha256 ${FC}\` (the staged
  files against the staging manifest); both manifests are in the freeze list, so the freeze check covers their
  bytes. A non-zero exit of either stops the line. Then \`sh train/heldout.sh\`, which launches ONE container \`kge-H1\`.`);
// ---- step 8
rep(`  held-out hand-off, \`<SLOT A-6: precheck command line on train/heldout/HANDOFF.json>\` (exit 0); it reads the`,
`  held-out hand-off, with \`<H>\` = \`sha256sum train/heldout/HANDOFF.json\`:
  \`sh r58c/B/lane_step.sh ktest-r9 "" "python /w/r58c/A/precheck_handoff.py --dir /w/train/heldout --split heldout --expect-sha256 <H> --freeze /w/train/heldout/item27.json"\`
  (exit 0); it reads the`);
// ---- 9.1
rep(`1. **Leak audit with the containers' mount records**: \`python leak_audit.py ...\` through \`lane_step.sh\`
   (agent A's real-mode options; it reads the \`docker inspect\` captures \`train/heldout/kge-H1-inspect.json\`,
   \`train/probe/kge-H1P-inspect.json\` and the stage-B captures). **Evidence**: \`train/leak_audit/leak_audit.json\`
   \`ok: true\`, \`test: false\`, this plan's \`plan_hash\`; its ruling-81 disclosure text (MF-14 slot, below).`,
`1. **Leak audit with the containers' mount records** (agent A's options, as the coordinator passed them):
   \`sh r58c/B/lane_step.sh ktest-r10 "train/leak_audit" "python leak_audit.py --repo /repo --facts /build/facts/cache --heldout-tasks /build/tasks/tasks.jsonl --lane-host ${LW} --host-map ${GBW}=/build --scripts /w/orchestrator/guard-stageB.sh,/w/orchestrator/guard-stageB-r92.sh,/w/train/heldout.sh --mounts /w/orchestrator/kge-B1-inspect-20261114T190928Z.json,/w/train/heldout/kge-H1-inspect.json,/w/train/probe/kge-H1P-inspect.json --parts tune=/w/train/stageB/parts,heldout=/w/train/heldout/parts"\`
   (it reads the \`docker inspect\` captures of stage B, \`kge-H1\` and \`kge-H1P\`, and both stage-B guards, ruling 92's
   check). **Evidence**: \`train/leak_audit/leak_audit.json\` \`ok: true\`, \`test: false\`, this plan's \`plan_hash\`;
   its \`disclosure81.text\`, \`ruling89.text\`, \`ruling90\` listing and \`ruling92.text\`.`);
// ---- 9.3 / 9.4: ruling92.text
rep(`   count of tasks absent from its table (ruling 91), from the tuning hand-off and HANDOFF.json (exit 10 when
   either lacks the count).`,
`   count of tasks absent from its table (ruling 91), from the tuning hand-off and HANDOFF.json (exit 10 when
   either lacks the count in the format's shape); the leak-audit line carries \`ruling92.text\`.`);
rep(`   failed (text from leak_audit.json \`ruling90.text\` when the audit writes one, else the protocol's paragraph 90).`,
`   failed (text from leak_audit.json \`ruling90.text\` when the audit writes one, else the protocol's paragraph 90),
   and one line gives leak_audit.json \`ruling92.text\` (both stage-B guards' docker run lines equal apart from the
   disk values) with its check's \`ok\`.`);
// ---- names
rep(`- **only agent A's command lines remain open**: the probe and rehearsal (steps 2a, 2b), the staging slots A-1 to
  A-4 (step 2f), the verify behaviour A-5 of \`heldout.sh\` (step 7), the hand-off pre-check A-6 (steps 5 and 8), \`answer_level.py tune\` (step 5) and
  \`leak_audit.py\` with its ruling-89 check and ruling-90 listing (step 9.1). The ruling-91 key is settled:`,
`- **nothing remains open**: agent A's command lines (steps 2a, 2b, 2f, 5, 7, 8, 9.1) are in place as the coordinator
  passed them after the 2026-11-14 reset; the \`ktest-r<N>\` numbers are r1 selectB, r2 report, r3 item27, r4
  answer_level, r5 item22, r6 write_result, r7 write_audit_claims, r8 and r9 the pre-checks, r10 the leak audit.
  The ruling-91 key is settled:`);
rep(`  (exit 10). The coordinator passes the command lines in; nothing else in this file changes when they arrive.`,
`  (exit 10).`);
fs.writeFileSync(P, s);
console.log('END-ORDER patched; open slots left:', (s.match(/SLOT A-|<SLOT/g) || []).length);
