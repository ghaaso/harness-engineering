'use strict';
// Writes results/frozen/PLAN.json: the complete list of held-out runs of protocol addendum 4 section B,
// built from the frozen records in results/frozen/ (never from scores or references). Host, pure
// computation:   node sealed/grader/make_plan.js
// Task counts come from tasks/tasks.jsonl (held-out lines read for their set only) and question counts
// from tasks/tq_questions.jsonl (split only).
const fs = require('fs');
const path = require('path');
const B = path.resolve(__dirname, '..', '..');
const R = path.join(B, 'results');
const rd = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const SETS = ['T1', 'T1x', 'T2', 'T3', 'T4'];
const tasks = fs.readFileSync(path.join(B, 'tasks', 'tasks.jsonl'), 'utf8').split('\n').filter(Boolean).map(JSON.parse);
const nTasks = {}; for (const s of SETS) nTasks[s] = tasks.filter((t) => t.split === 'heldout' && t.set === s).length;
const nQ = fs.readFileSync(path.join(B, 'tasks', 'tq_questions.jsonl'), 'utf8').split('\n').filter(Boolean).map(JSON.parse).filter((q) => q.split === 'held_out').length;

const VOL = { relational: 'gt-relational', reference: 'gt-relational', ladybug: 'gt-ladybug', duckpgq: 'gt-duckpgq', search: 'gt-search', 'floor-dir': 'gt-relational', 'floor-co': 'gt-relational' };
// declared rows, in run order (addendum 4 items 5 and 6)
const ROWS = [
  ['relational', 'primary', '95e990307da3b42b'], ['ladybug', 'primary', '95e990307da3b42b'], ['duckpgq', 'primary', '95e990307da3b42b'],
  ['search', 'primary', 'e70177e5807f0252'], ['floor-dir', 'primary', '714a474060653c1f'], ['floor-co', 'primary', 'c4d2f0a60a3d199c'],
  ['relational', 's1', '6b70cc1222745385'], ['ladybug', 's1', '6b70cc1222745385'], ['duckpgq', 's1', '6b70cc1222745385'],
  ['ladybug', 's2', 'f233ae069bdba0ce', 0], ['search', 's2', '950c029615d337c1'],
  ['reference', 'crosscheck', '95e990307da3b42b'], ['reference', 'crosscheck', '6b70cc1222745385'],
  ['ladybug', 's2', 'f233ae069bdba0ce', 1], ['ladybug', 's2', 'f233ae069bdba0ce', 2], ['ladybug', 's2', 'f233ae069bdba0ce', 3], ['ladybug', 's2', 'f233ae069bdba0ce', 4],
];
const PURPOSE = { primary: 'scored: frozen primary (addendum 4 item 4)', s1: 'scored, descriptive only: the rule as first written (addendum 4 item 5, S1)', s2: 'scored: best form (addendum 4 item 5, S2)', crosscheck: 'not scored: equivalence check against the typed arms (addendum 4 item 5)' };
const runs = [];
const configs = [];
for (const [arm, role, hash, draw] of ROWS) {
  const rec = rd(path.join(R, 'frozen', arm, hash + '.json'));
  if (rec.arm !== arm || rec.hash !== hash || rec.role !== role) throw new Error('frozen record does not match the declared row: ' + arm + ' ' + hash + ' ' + role);
  const env = draw ? 'LB_COMM_DRAW=' + draw + ' ' : '';
  const dir = (role === 'crosscheck' ? 'crosscheck-' + hash : role) + (draw ? '-draw' + draw : '');
  if (!draw) configs.push({ arm, role, hash, config_name: rec.config_source.name, list: rec.config_source.list, list_hash: rec.config_source.list_hash, code_hash: rec.code_hash, deps_hash: rec.deps_hash, record: 'results/frozen/' + arm + '/' + hash + '.json', purpose: PURPOSE[role] + (arm === 'ladybug' && role === 's2' ? '; also run on community draws 1 to 4 (addendum 3 item 5)' : '') });
  for (const set of SETS) {
    runs.push({ n: runs.length + 1, arm, role, hash, config_name: rec.config_source.name, set, draw: draw || 0, expected_tasks: nTasks[set], volume: VOL[arm],
      out: 'results/heldout/' + arm + '/' + dir + '/' + set + '.jsonl.gz',
      command: env + 'node arms/common/run.js run --arm ' + arm + ' --config ' + hash + ' --sets ' + set + ' --split heldout --allow-heldout --frozen-hash ' + hash,
      lock_check: env + 'node arms/common/run.js lock-check --arm ' + arm + ' --config ' + hash + ' --sets ' + set });
  }
}
const tq = [];
for (const arm of ['relational', 'ladybug', 'duckpgq', 'search']) {
  const rec = rd(path.join(R, 'frozen', arm, 'tq.json'));
  tq.push({ n: runs.length + tq.length + 1, arm, role: 'tq', set: 'TQ', expected_questions: nQ, volume: VOL[arm], code_hash: rec.code_hash, deps_hash: rec.deps_hash, record: 'results/frozen/' + arm + '/tq.json',
    out: 'results/heldout/tq/' + arm + '.answers.jsonl',
    command: 'node arms/common/run.js tq --arm ' + arm + ' --split heldout --allow-heldout',
    lock_check: 'node arms/common/run.js lock-check --arm ' + arm + ' --tq' });
}
const totals = { configuration_rows: configs.length, set_runs: runs.length, question_runs: tq.length, invocations: runs.length + tq.length,
  expected_answers_per_row: SETS.reduce((s, k) => s + nTasks[k], 0), expected_answers_all_set_runs: runs.reduce((s, r) => s + r.expected_tasks, 0), expected_question_answers: nQ * tq.length };
const plan = {
  title: 'Held-out run plan (protocol addendum 4 section B). The runner follows this file and nothing else.',
  written_by: 'grader lane, re-freeze after pre-flight fix round 2', written_at: new Date().toISOString(),
  basis: 'protocol.md, addenda 1 to 4; selection by the amended tie rule (addendum 4 item 1), sealed/grader/selection_v2.json; frozen records in results/frozen/<arm>/. This file holds no reference content and no score.',
  not_run: ['T5 (addendum 4 item 7; the harness refuses it)', 'any configuration or arm not listed here (the lock refuses it: no frozen record)', 'the reference arm on questions'],
  expected_tasks_per_set: nTasks, expected_questions: nQ,
  container: {
    image: 'graphtest:1',
    template: 'MSYS_NO_PATHCONV=1 docker run --rm --cpus 6 --memory 4g --mount type=tmpfs,destination=/build/sealed --mount type=tmpfs,destination=/build/audit -v "<build root>:/build" -v "C:/Users/User/Documents/projects/EMS_workshop1:/repo:ro" -v <volume>:/store graphtest:1 bash -lc "git config --global --add safe.directory /repo; export GT_BUILD=/build GT_REPO=/repo GT_STORE=/store GT_SRCSTORE=/store/src GT_TMP=/tmp/gt; mkdir -p /tmp/gt; cd /build; <lock_check> && <command>"',
    build_root: B.split(path.sep).join('/'),
    notes: [
      'The tmpfs over /build/sealed is required on every run: the runner and every arm process see no reference answer (addendum 4 item 11). run.js refuses run and tq while sealed/ lists any entry.',
      'The tmpfs over /build/audit is required on every run too: audit/ holds TUNE per-task scores, which no arm process may read (pre-flight audit, minor finding).',
      '/build is mounted writable: the harness writes results/heldout/ and the ladybug arm writes community prior files into arms/ladybug/priors/ (not hashed). GT_RESULTS stays unset (the harness refuses any other results root).',
      'At most 6 CPUs and 4 GB per container. Never two containers on one volume at the same time. Never touch the containers postiz, postiz-postgres, postiz-redis.',
      'Install nothing and download nothing. The repository is mounted read-only.',
    ],
  },
  rules: [
    'Run the entries in the order of n. One set per invocation. Before each run, run its lock_check in the same container; run the command only when it prints "allowed".',
    'Run the ladybug s2 rows in the order draw 0, then draws 1 to 4 (the draw-0 run stores the prior grouping of each held-out parent once, addendum 3 item 5).',
    'Check after each run: the out file exists, has expected_tasks lines (expected_questions for TQ), and results/heldout/runs.jsonl has one new line with exit ok and repeat 0.',
    'A mechanical failure (crash, refusal by the lock, missing or incomplete answer file) may be fixed and that run repeated with --repeat --reason "<what failed and what was fixed>" (addendum 4 item 12). A fix that changes any arms/<arm>/*.js or arms/common/*.js file makes the lock refuse; it then needs a grader re-freeze (run.js freeze --refreeze --reason) and must be reported. Never repeat a run for any other reason.',
    'The runner never opens sealed/ or audit/, never scores, and never creates results/heldout/SCORING_STARTED (the grader does, before scoring the first held-out answer; after that nothing runs or freezes).',
    'Report every run: n, exit, answer count, wall time, repeats with reasons.',
    'If tq_hold.hold is ever true: run NO entry at all, set or question, and ask the orchestrator. A fix to shared question code (common/tqtarget.js) changes every arm\'s code hash, so set runs made before it would sit under a superseded hash (pre-flight audit D-HOLD). The harness itself refuses every held-out question run while hold is true.',
  ],
  tq_hold: {
    hold: false,
    lifted: 'Lifted by the grader in the re-freeze after pre-flight fix round 2 (2026-11-13), following the steps of pre-flight audit D-HOLD (hold, apply the fixes, re-freeze, rewrite this file with hold false). Both open findings were fixed in code by fix round 2 (arms/common/NOTES.md): (1) D-LB47, arms/ladybug/tq.js setting_readers now gives NULL, not "::", for a top-level reader, so the fallback "<file>::<name>" runs; probe 904 is identical in the three typed arms. (2) D-Q40, audit option 1: common/tqtarget.js target() cuts an absent member target back to the nearest existing node of the frozen commit\'s graph (held-out question 40: #JobDetail.evidence to #JobDetail; no TUNE target changed). Every record was re-frozen with the resulting code hashes and every lock_check below printed allowed.',
    if_reverted: 'If the orchestrator prefers audit option 2 for question 40 (declare it a known limit and revert target() to parse()), common/tqtarget.js changes, every arm\'s code hash changes and the lock refuses every entry until the grader re-freezes and rewrites this file. Decide before the first entry runs.',
    history: [
      'Round 0 (00:40 local): hold on, because 7 of 30 held-out questions did not parse in the typed arms and 4 in search. Resolved by fix round 1 (shared parser common/tqtarget.js).',
      'Round 1 (02:04 local): hold on, for D-LB47 and D-Q40. Both fixed by fix round 2.',
    ],
  },
  configurations: configs,
  runs,
  question_runs: tq,
  totals,
};
fs.writeFileSync(path.join(R, 'frozen', 'PLAN.json'), JSON.stringify(plan, null, 1) + '\n');
console.log(JSON.stringify({ expected_tasks_per_set: nTasks, expected_questions: nQ, totals }));
