// RUNLOG-B table: every item C1-C50 -> file:line (first line holding a fixed anchor string) and its test log.
// usage: node c_table.js LANE   (prints markdown rows; an anchor not found prints NOT FOUND and exits 1)
const fs = require('fs'), path = require('path');
const L = process.argv[2]; const cache = {};
const lines = (f) => cache[f] || (cache[f] = fs.readFileSync(path.join(L, f), 'utf8').split(/\r?\n/));
let bad = 0;
const at = (f, a) => { const i = lines(f).findIndex((x) => x.includes(a)); if (i < 0) { bad++; return f + ':NOT FOUND (' + a + ')'; } return f + ':' + (i + 1); };
const EO = 'orchestrator/END-ORDER.md';
const T = [
  ['C1', 'B', [['r58c/B/graph_rows.js', "late50"], [EO, '**Rulings 101(a) and 102**']], 'r58c/A/logs/test_r101_real_lists.log; r4 TEST re-measure waits (note 37 b)'],
  ['C2', 'B', [['r58c/B/mounts-B.json', '"ktest-r9"'], [EO, 'agent A\'s check of the grader\'s nine refusal checks']], 'r58c/B/lane-steps/ktest-r8-20261115T101652Z.log; ktest-r9-20261115T104953Z.log'],
  ['C3', 'A', [['train/leak_audit.py', '101(b)'], [EO, '**Ruling 101(b)**']], 'r58c/A/logs/test_r101_real_lists.log'],
  ['C4', 'B', [['r58c/B/freeze_list.sh', 'C4 (round 8)'], [EO, '6 (C4) when a path component']], 'r58c/B/logs/test_freeze_check.c42.log (cases 17, 18)'],
  ['C5', 'B', [[EO, 'start-guard-r98.sh']], 'text only'],
  ['C6', 'B', [['orchestrator/end_of_run.sh', 'mounts.js flags "$MOUNTS" ktest-eor'], [EO, '**ktest-eor** (step 1, ruling 101(e))']], 'r58c/B/logs/test_end_of_run.run.out (43 checks)'],
  ['C7', 'B', [['r58c/B/freeze_list.sh', 'kge-B1-inspect-20261115T073116Z.json'], [EO, 'kge-B1-inspect-20261115T073116Z.json,/w/r58c/mounts']], 'r58c/B/logs/test_freeze_check.c42.log (case 16)'],
  ['C8', 'B', [['r58c/B/pass_paths.js', 'PASS'], ['r58c/B/ktest.sh', 'KT_AS'], [EO, "**Agent A's role logs, copied**"]], 'r58c/B/logs/test_pass_paths.log; r58c/B/logs/test_kt_as.log'],
  ['C9', 'B', [['train/write_result.py', 'R99'], [EO, "ruling 99's correction"]], 'r58c/B/out/logs/test_write_result.log'],
  ['C10', 'B', [['r58c/B/freeze_list.sh', 'r58c/A/mounts.js r58c/B/frozen'], [EO, '`r58c/A/mounts.js` (C10']], 'r58c/B/logs/test_freeze_check.c42.log (case 16)'],
  ['C11', 'B', [['r58c/B/freeze_list.sh', 'TGP=r58c/B/frozen/tune-graphs-plan.json'], [EO, "**First, the tuning checkpoints' graphs manifest**"]], 'r58c/B/logs/test_freeze_check.c42.log (cases 16, 18)'],
  ['C12', 'A', [['train/heldout.sh', 'C12 / HD-3']], 'r58c/A/logs/test_heldout_r101.r104.log'],
  ['C13', 'A+B', [['train/heldout.py', 'ruling 101(c) / C13 (round 9): THREE units'], [EO, '**Three units in a row in one process**'], [EO, '**Memory stops (ruling 104(c)']], 'r58c/A/logs/test_probe_seq_r101.log'],
  ['C14', 'B', [[EO, '**Round 8 (C14) adds the sixteen tests'], ['r58c/B/TEST-QUEUE.md', '## 2d, round 8']], 'r58c/B/TEST-QUEUE.md q9-q20'],
  ['C15', 'B+A', [['train/item27.py', 'tune_rank_check'], ['train/answer_level.py', 'C15']], 'r58c/B/out/logs/test_item27_trc.log; r58c/A/logs/test_answer_level.log'],
  ['C16', 'B+A', [['r58c/B/rerun_check.sh', 'ktest.lock'], ['r58c/B/lane_step.sh', 'C16'], ['r58c/B/freeze_list.sh', 'C16 (round 8)'], ['train/heldout.sh', 'C16 / LO-6']], 'r58c/B/logs/test_rerun_r101.log; r58c/B/logs/test_r10_verdict.log; r58c/A/logs/test_heldout_r101.r104.log'],
  ['C17', 'B', [['train/selectB.py', 'SR-6'], ['train/write_result.py', 'not compared (no co_changed)']], 'r58c/B/out/logs/test_sr6_guard.log; r58c/B/out/logs/test_write_result.log'],
  ['C18', 'B', [['r58c/B/rerun_check.sh', 'OVER-3.5GB'], [EO, '**Ruling 103(a)** (note 32']], 'r58c/B/logs/test_rerun_r103.log'],
  ['C19', 'B', [['r58c/B/graph_rows.js', 'test-file'], ['r58c/B/lane_step.sh', 'row by row (ruling 103(b))'], [EO, '**Ruling 103(b) with 104(b)**']], 'r58c/B/logs/test_r10_verdict.log'],
  ['C20', 'A', [['train/leak_audit.py', 'def r94_in_scope'], [EO, 'and 103(c): the audit checks the records']], 'r58c/A/logs/test_r101_real_lists.log; r58c/B/out/logs/test_mounts_vs_leak_audit.log'],
  ['C21', 'B', [['r58c/B/mounts.js', 'left out (source missing, nothing created)'], ['r58c/B/freeze_list.sh', 'ruling 103(d) (round 8, C21)'], [EO, '**Ruling 103(d) (C21, C48)']], 'r58c/B/logs/test_freeze_check.c42.log (9b, 19); r58c/B/logs/test_kt_as.log; r58c/B/logs/test_r10_verdict.log'],
  ['C22', 'B', [[EO, '**Three units in a row in one process**']], 'text only'],
  ['C23', 'B', [[EO, '**Rulings 101 to 104 add (C23)**'], ['r58c/B/RUNLOG-B.md', '- C23 listing']], 'r58c/B/c23_listing.js (host)'],
  ['C24', 'B+A', [[EO, '**The card checks** (C24)'], ['train/leak_audit.py', 'C24: a card check mounts nothing']], 'r58c/A/logs/test_r101_real_lists.log'],
  ['C25', 'B', [[EO, '**The limit clock (C25)**'], [EO, '**The first freeze check, timed** (C25)']], 'text only (timed at step 3)'],
  ['C26', 'B', [['r58c/B/ktest.sh', 'saved before the release']], 'r58c/B/logs/test_kt_as.log'],
  ['C27', 'B', [[EO, '**The protocol file is frozen too** (C27)']], 'text only'],
  ['C28', 'B', [['r58c/B/record_check.js', 'C28'], ['r58c/B/freeze_list.sh', 'C28 (ii)'], [EO, '**C28, a mount record and its entry**']], 'r58c/B/logs/test_freeze_check.c42.log (case 20)'],
  ['C29', 'B', [['r58c/B/lane_step.sh', 'a TEST run needs LS_MOUNTS'], ['r58c/B/graph_rows.js', 'test-check'], [EO, '**C29 (pre-check M1)**']], 'r58c/B/logs/test_r10_verdict.log'],
  ['C30', 'B', [[EO, '**Items 4 and 5 run EARLIER (ruling 104(a), C30)**'], [EO, '**The r4 TEST run needs the tuning']], 'text only'],
  ['C31', 'B', [['r58c/B/e5_route_audit.py', 'def median_pool'], [EO, '**Ruling 104(e)** (C31)']], 'r58c/B/out/logs/test_e5_route_audit.log'],
  ['C32', 'B', [[EO, '**A repeat of 2a or 2b** (C32)'], [EO, '**A repeat of 2f** (C32)'], [EO, '**On a repeat of step 3** (C32)']], 'text only'],
  ['C33', 'B', [[EO, '(step 7, C33)'], [EO, '**Nothing under `train/heldout` is moved or renamed** (C33']], 'text only'],
  ['C34', 'B', [[EO, '**`progress.jsonl` between 9.3 and 9.4** (ruling 104(f), C34)']], 'text only'],
  ['C35', 'B', [['r58c/B/freeze_list.sh', 'eval/tune_commits.jsonl'], [EO, '`eval/tune_commits.jsonl` (C35']], 'r58c/B/logs/test_freeze_check.c42.log (case 35)'],
  ['C36', 'A', [['train/heldout.sh', 'C36 (round 9)'], [EO, '**One record convention**']], 'r58c/A/logs/test_save_record_r104.log'],
  ['C37', 'B', [[EO, '**Memory stops (ruling 104(c)']], 'text only'],
  ['C38', 'B', [[EO, 'C38']], 'text only'],
  ['C39', 'B', [['r58c/B/lane_step.sh', 'the lock never'], [EO, 'C39: a missing read-only source']], 'r58c/B/logs/test_r10_verdict.log'],
  ['C40', 'B', [[EO, '(C40: both inside `stamp_tune`']], 'text only'],
  ['C41', 'B', [['orchestrator/end_of_run.sh', 'already dropped'], [EO, 'C41']], 'r58c/B/logs/test_end_of_run.run.out (43 checks)'],
  ['C42', 'A', [['r58c/A/mounts-A.json', 'r58c/A/rehearsal.py'], [EO, '**No container of agent A\'s mounts `r58c/A` whole either**']], 'r58c/A/logs/test_heldout_mounts.r104.log; r58c/B/logs/test_freeze_check.c42.log (case 15)'],
  ['C43', 'B', [['r58c/write_audit_claims.py', 'def export_kind'], [EO, '**C43**: the note keeps three kinds apart']], 'r58c/B/out/logs/test_write_audit_claims.log'],
  ['C44', 'B', [[EO, '**Ruling 104(g)** (C44)']], 'text only'],
  ['C45', 'B', [['r58c/B/lane_step.sh', 'LIMIT_R8=3600'], [EO, '| pre-check, tuning hand-off (step 5) | ktest-r8']], 'r58c/B/lane-steps/ktest-r8-20261115T101652Z.log; r58c/B/lane-steps/ktest-r9-20261115T104953Z.log'],
  ['C46', 'A', [['train/heldout.py', 'ONLY line with'], [EO, 'It is the ONLY such line']], 'text only'],
  ['C47', 'B', [[EO, 'C47']], 'text only'],
  ['C48', 'B', [['r58c/B/lane_step.sh', '--create'], ['r58c/B/rerun_check.sh', '--create'], ['orchestrator/end_of_run.sh', '--create']], 'r58c/B/logs/test_kt_as.log; r58c/B/logs/test_end_of_run.run.out (43 checks)'],
  ['C49', 'B', [[EO, '**Coordinator, the non-finite count** (ruling 105(b), C49)'], [EO, '**Coordinator, the non-finite count** (ruling 105(c), C49)'], [EO, '**Ruling 105(c)** (C49)'], ['train/write_result.py', "NONFINITE_UNIT = 'nonfinite_heldout'"], ['r58c/write_audit_claims.py', 'ruling 105(c), C49'], ['r58c/B/CONFLICTS.md', '36. 2026-11-15, C49']], 'r58c/B/out/logs/test_write_result.log; r58c/B/out/logs/test_write_audit_claims.log (role_report p2, ktest-b109); r58c/B/out/logs/wr_rehearsal.log (ktest-b110)'],
  ['C50', 'A+B', [['train/heldout.sh', 'C50 (end-order-changes-4)'], [EO, '**The memory cap** (C50'], [EO, "**The three-units-in-a-row figure is the card's** (C50)"], [EO, '**The lock through step 7** (C50'], [EO, '**The formal 2d and 2e** (C50']], 'r58c/A/logs/test_h1cap_r105.log (agent A, RUNLOG-A ROUND10); END-ORDER text'],
];
const out = ['| item | owner | file:line | test log |', '|---|---|---|---|'];
for (const [id, own, anchors, log] of T) out.push('| ' + id + ' | ' + own + ' | ' + anchors.map(([f, a]) => at(f, a)).join('; ') + ' | ' + log + ' |');
console.log(out.join('\n'));
if (bad) { console.error(bad + ' anchor(s) not found'); process.exit(1); }
