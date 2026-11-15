'use strict';
// Self-test of LANE/orchestrator/coord_checks.js on made-up fixtures (nothing of the lane is read except the script).
// usage: node selftest_coord_checks.js <path to coord_checks.js>
const fs = require('fs'), path = require('path'), crypto = require('crypto'), cp = require('child_process');
const SCRIPT = path.resolve(process.argv[2]);
const BASE = path.join(__dirname, 'fixture');
const h = (s) => crypto.createHash('sha256').update(s).digest('hex');
const w = (f, s) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, s); return h(Buffer.from(s)); };
const GPU = 'sha256:' + 'a8'.repeat(32);
function make(name, m) {  // m: mutations
  const top = path.join(BASE, name); fs.rmSync(top, { recursive: true, force: true });
  const R = path.join(top, 'wider', 'lane'); const P = (...a) => path.join(R, ...a);
  const lines = []; const add = (o) => lines.push(JSON.stringify(Object.assign({ step: 'coordinator' }, o)));
  const digest = 'd1'.repeat(32);
  const planObj = { plan_hash: 'ab'.repeat(32), s: 1, configs: {} };
  const ARMS = ['E1', 'E2', 'E3', 'E4', 'E5'];
  const means = Object.assign({ E1: 0.31, E2: 0.305, E3: 0.29, E4: 0.33, E5: 0.3 }, m.means || {});
  const sizes = Object.assign({ E1: [256, 0], E2: [256, 0], E3: [128, 0], E4: [128, 2], E5: [256, 0] }, m.sizes || {});
  for (const a of ARMS) planObj.configs[a] = [{ config_id: 'c01', cfg: { lr: 0.01, embedding_dim: sizes[a][0] }, epochs: 40 }];
  const planSha = w(P('train', 'stageB', 'plan.json'), JSON.stringify(planObj));
  const codeSha = w(P('train', 'code.py'), 'print(1)\n');
  const pinSha = w(path.join(top, 'build', 'x.js'), '// x\n');
  const tinSha = w(P('eval', 'tune_tasks.jsonl'), '{}\n');
  const tune = { test: false, plan_hash: planObj.plan_hash, stamp: { tables_digest: digest, report_sha256: 'ee'.repeat(32) }, choices: {} };
  const choices = {}; const arms = {};
  for (const a of ARMS.concat(['PLACEBO'])) {
    const fa = { config_id: 'c01', w: 0.5, mean: a === 'PLACEBO' ? 0.2 : means[a] };
    choices[a] = w(P('train', 'selectB', a, 'choices.json'), JSON.stringify({ final_all65: fa }));
    tune.choices[a] = { final_all65: fa };
    if (a !== 'PLACEBO') arms[a] = { config_id: 'c01', w: 0.5, mean: means[a], size: sizes[a], epochs: 40, cfg: planObj.configs[a][0].cfg };
  }
  const tuneSha = w(P('train', 'report', 'tune.json'), JSON.stringify(tune));
  const hoSha = w(P('train', 'report', 'answer_level', 'handoff', 'HANDOFF.json'), '{"x":1}');
  const gfiles = 'f0'.repeat(32);
  const trSha = w(P('grader-returns', 'tune-rank.json'), JSON.stringify({ split: 'tune', test: false, tasks: 313, commits: 50, handoff_sha256: hoSha, scorer: { files_sha256: m.badScorer ? '00'.repeat(32) : gfiles } }));
  w(P('grader-returns', 'tune-item24.json'), JSON.stringify({ split: 'tune', test: false, tasks: 313, commits: 50, handoff_sha256: hoSha, scorer: { files_sha256: gfiles } }));
  const ORDER = ['E3', 'E1', 'E2', 'E4', 'E5'];
  const r4 = (x) => Number(x.toFixed(4)); const top4 = Math.max(...ARMS.map((a) => r4(means[a]))); const tied = ARMS.filter((a) => r4(means[a]) === top4);
  const cmp = (a, b) => { for (let i = 0; i < 2; i++) { const d = sizes[a][i] - sizes[b][i]; if (d) return d; } return ORDER.indexOf(a) - ORDER.indexOf(b); };
  const win = m.wrongArm || [...tied].sort(cmp)[0];
  const rec = {
    chosen: { arm: win, config_id: 'c01', cfg: planObj.configs[win][0].cfg, w: 0.5, epochs: 40, figure_all65: means[win], se: 0.02 },
    tie_group_4dp: [...tied].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b)), arms, test: !!m.test, tables_digest: digest,
    plan_hash: planObj.plan_hash, plan_sha256: planSha, image_id: GPU,
    code_sha256: { 'train/code.py': codeSha }, pins: { 'train/code.py': codeSha, '../../build/x.js': m.badPin ? '11'.repeat(32) : pinSha },
    tuning_inputs: { 'eval/tune_tasks.jsonl': tinSha }, stamp_tune: { tune_sha256: tuneSha, report_sha256: 'ee'.repeat(32) },
    choices_sha256: Object.fromEntries(ARMS.map((a) => [a, choices[a]])),
  };
  const recBytes = JSON.stringify(rec, null, 1); const recSha = w(P('train', 'heldout', 'item27.json'), recBytes);
  w(P('train', 'heldout', 'item27.json.sha256'), (m.badSide ? '22'.repeat(32) : recSha) + '  item27.json\n');
  const fl = [codeSha + '  train/code.py', tinSha + '  eval/tune_tasks.jsonl', '# test output', '# outside',
    pinSha + '  ' + path.join(top, 'build', 'x.js').replace(/\\/g, '/'), '# images', 'sha256:' + 'c5'.repeat(32) + '  graphtest-kge:1', GPU + '  graphtest-kge-gpu:1'].join('\n') + '\n';
  const flSha = w(P('orchestrator', 'freeze-list.txt'), fl);
  add({ unit: 'tables_digest', sha256: digest });
  if (m.staleTrc) add({ unit: 'tune_rank_check', status: 'accepted: stale', sha256: trSha, handoff_sha256: hoSha });
  add({ unit: 'code_freeze', sha256: flSha }); add({ unit: 'grader_frozen', sha256: gfiles });
  add({ unit: 'tune_report', sha256: tuneSha, choices });
  if (!m.staleTrc) add({ unit: 'tune_rank_check', status: 'accepted: all agree', sha256: trSha, handoff_sha256: hoSha });
  if (m.stage === 'heldout') {
    add({ unit: 'item27_freeze', file: 'train/heldout/item27.json', sha256: recSha });
    const anchor = { step: 'coordinator', unit: 'item27_freeze', file: 'train/heldout/item27.json', sha256: recSha };
    const hh = w(P('train', 'heldout', 'HANDOFF.json'), JSON.stringify({ anchor_line: JSON.stringify(anchor), test: false }));
    w(P('train', 'heldout', 'progress.jsonl'), [1, 2].map((i) => JSON.stringify({ step: 'heldout', unit: 'start', status: 'begun', freeze_sha256: (m.badStart && i === 2) ? '33'.repeat(32) : recSha })).join('\n') + '\n');
    w(P('train', 'heldout', 'heldout.rc'), (m.rc || '0') + '\n');
    const cap = m.cap || '4g';
    w(P('heldout-launch', 'kge-H1-launch.log'), ['2026-11-15T10:00:00Z launch requested: kge-H1 (image ' + GPU + ')', '2026-11-15T10:00:05Z start kge-H1 image ' + GPU + ' cap ' + cap + ' (-m ' + cap + ' --memory-swap ' + cap + '): docker run ...',
      '2026-11-15T11:00:00Z finished kge-H1 rc=' + (m.rc || '0') + ' HANDOFF.json sha256 ' + hh].join('\n') + '\n');
    const capB = { '4g': 4 * 2 ** 30, '5g': 5 * 2 ** 30, '6g': 6 * 2 ** 30 }[m.recCap || cap];
    const recJ = (mem) => JSON.stringify([{ Name: '/kge-H1', Image: GPU, HostConfig: { Memory: mem, MemorySwap: mem, NetworkMode: m.recNet || 'none' }, Mounts: [] }]);
    w(P('r58c', 'mounts', 'kge-H1.json'), recJ(capB));
    if (m.kept) w(P('r58c', 'mounts', 'kge-H1.20261115T100000Z-1.json'), recJ(capB));
    w(P('grader-returns', 'heldout.json'), JSON.stringify({ split: 'heldout', test: false, tasks: 418, commits: 75, handoff_sha256: hh, freeze_sha256: recSha, arm: win,
      literal_check: { tasks: 418, task_commit_in_checkpoint_history: m.lit || 0, parent_mismatch: 0 }, vs_RRF: { a: 1 }, scorer: { files_sha256: gfiles } }));
  }
  w(P('progress.jsonl'), lines.join('\n') + '\n');
  return R;
}
let bad = 0;
function run(label, root, args, wantExit, wantText) {
  const r = cp.spawnSync(process.execPath, [SCRIPT].concat(args, ['--root', root]), { encoding: 'utf8' });
  const text = (r.stdout || '') + (r.stderr || ''); const ok = r.status === wantExit && (!wantText || text.includes(wantText));
  if (!ok) { bad++; console.log('SELFTEST FAIL ' + label + ': exit ' + r.status + ' (wanted ' + wantExit + ')' + (wantText ? ', wanted text "' + wantText + '"' : '') + '\n' + text); }
  else console.log('ok   ' + label + ' (exit ' + r.status + ')');
  return text;
}
let R = make('good', {});
run('item27 good, no append', R, ['item27'], 0, 'RESULT PASS item27');
if (fs.readFileSync(path.join(R, 'progress.jsonl'), 'utf8').includes('item27_freeze')) { bad++; console.log('SELFTEST FAIL: a line was appended without --append'); }
run('item27 good, append', R, ['item27', '--append'], 0, 'anchor appended');
run('item27 again after the anchor: refuses a second', R, ['item27', '--append'], 1, 'FAIL  8 ');
run('returns tune good', R, ['returns', 'tune'], 0, 'RESULT PASS returns');
run('item27 test true', make('t', { test: true }), ['item27', '--append'], 1, 'FAIL  5 ');
run('item27 bad pin', make('pin', { badPin: true }), ['item27'], 1, 'FAIL  3b');
run('item27 bad side file', make('side', { badSide: true }), ['item27'], 1, 'FAIL  1 ');
run('item27 wrong arm', make('arm', { wrongArm: 'E1' }), ['item27'], 1, 'FAIL  4c');
run('item27 tie at four decimals, smaller model wins (E3 over E4)', make('tie', { means: { E3: 0.33004, E4: 0.33001 } }), ['item27'], 0, 'tie group E3,E4');
run('item27 tie, record names the larger model', make('tie2', { means: { E3: 0.33004, E4: 0.33001 }, wrongArm: 'E4' }), ['item27'], 1, 'FAIL  4c');
run('item27 stale tune_rank_check (before the freeze line)', make('stale', { staleTrc: true }), ['item27'], 1, 'FAIL  9 ');
run('returns tune, scorer bytes differ', make('sc', { badScorer: true }), ['returns', 'tune'], 1, 'FAIL  tune-rank.json: scorer.files_sha256');
R = make('ho', { stage: 'heldout' });
run('heldout-start good', R, ['heldout-start', 'heldout-launch/kge-H1-launch.log'], 0, 'RESULT PASS heldout-start');
run('returns heldout good', R, ['returns', 'heldout'], 0, 'RESULT PASS returns');
run('heldout-start, a start line for another record', make('ho2', { stage: 'heldout', badStart: true }), ['heldout-start', 'heldout-launch/kge-H1-launch.log'], 1, 'FAIL  one or more start lines');
run('heldout-start, rc 3', make('ho3', { stage: 'heldout', rc: '3' }), ['heldout-start', 'heldout-launch/kge-H1-launch.log'], 1, 'FAIL  train/heldout/heldout.rc');
run('returns heldout, literal check not zero', make('ho4', { stage: 'heldout', lit: 2 }), ['returns', 'heldout'], 1, 'FAIL  heldout.json: literal_check');
run('item27 after a held-out run exists (folder not clean)', make('ho5', { stage: 'heldout' }), ['item27'], 1, 'FAIL  7 ');
R = make('ho6', { stage: 'heldout', cap: '5g' });
run('heldout-start, the log shows 5g and no ruled cap is named', R, ['heldout-start', 'heldout-launch/kge-H1-launch.log'], 1, 'FAIL  every start line shows the memory cap 4g');
run('heldout-start, the log shows 5g and --cap 5g is named', R, ['heldout-start', 'heldout-launch/kge-H1-launch.log', '--cap', '5g'], 0, 'RESULT PASS heldout-start');
run('heldout-start, a kept record with a counter in its name is read too', make('ho7', { stage: 'heldout', kept: true }), ['heldout-start', 'heldout-launch/kge-H1-launch.log'], 0, '2 record(s)');
run('heldout-start, the record shows another memory limit than the log', make('ho8', { stage: 'heldout', recCap: '6g' }), ['heldout-start', 'heldout-launch/kge-H1-launch.log'], 1, 'FAIL  every saved record of kge-H1');
run('heldout-start, the record shows a network', make('ho9', { stage: 'heldout', recNet: 'bridge' }), ['heldout-start', 'heldout-launch/kge-H1-launch.log'], 1, 'network bridge');
// ruling 105: the non-finite count
{
  const zlib = require('zlib');
  const mk = (name, rowsTsv, losses) => {
    const R2 = path.join(BASE, name, 'wider', 'lane'); fs.rmSync(path.join(BASE, name), { recursive: true, force: true });
    const d = path.join(R2, 'train', 'x', 'p1'); fs.mkdirSync(d, { recursive: true });
    fs.writeFileSync(path.join(d, 'pool.tsv.gz'), zlib.gzipSync('task_id\tcandidate\tscore\n' + rowsTsv));
    fs.writeFileSync(path.join(d, 'meta.json'), '{"arm":"E1","losses":' + losses + '}');
    fs.writeFileSync(path.join(R2, 'train', 'x', 'set_meta.json'), '{"note":"an assembled set, no loss list"}');
    return R2;
  };
  run('nonfinite: clean table and losses', mk('nf0', 'T1\tsrc/inf.ts\t1e-05\nT1\tnan.py\t-0.25\n', '[1.5, 0.2]'), ['nonfinite', 'train/x'], 0, '2 score rows, 0 not finite');
  run('nonfinite: a nan score', mk('nf1', 'T1\ta.ts\tnan\nT1\tb.ts\t0.5\n', '[1.5, 0.2]'), ['nonfinite', 'train/x'], 1, '1 not finite');
  run('nonfinite: an inf score and an empty score', mk('nf2', 'T1\ta.ts\t-inf\nT1\tb.ts\t\n', '[1.5, 0.2]'), ['nonfinite', 'train/x'], 1, '2 not finite');
  run('nonfinite: a NaN loss', mk('nf3', 'T1\ta.ts\t0.1\n', '[1.5, NaN]'), ['nonfinite', 'train/x'], 1, '1 losses not finite');
  run('nonfinite: a missing folder', mk('nf4', 'T1\ta.ts\t0.1\n', '[1.5]'), ['nonfinite', 'train/none'], 1, 'FAIL  train/none exists');
  run('nonfinite: an untrained unit has an empty loss list and passes', mk('nf5', 'T1\ta.ts\t0.1\n', '[]'), ['nonfinite', 'train/x'], 0, '(1 empty)');
}
// ruling 106(b): the records of the step launcher's TEST runs
{
  const HP = 'ab'.repeat(20), TP = 'cd'.repeat(20);
  const mk = (name, mounts) => {
    const R3 = path.join(BASE, name, 'wider', 'lane'); fs.rmSync(path.join(BASE, name), { recursive: true, force: true });
    w(path.join(R3, 'train', 'stageB', 'plan.json'), JSON.stringify({ heldout: { assignment: { [HP]: 'x' } }, assignment: { [TP]: TP } }));
    const src = (p) => (R3 + '/' + p).replace(/\\/g, '/');
    w(path.join(R3, 'r58c', 'B', 'out', 'mounts-test', 'ktest-r9-20261115T110000Z.json'), JSON.stringify([{ Name: '/ktest-r9', Mounts: mounts.map(([p, rw]) => ({ Type: 'bind', Source: p.startsWith('ABS:') ? p.slice(4) : src(p), Destination: '/w/' + p, RW: !!rw })) }]));
    return R3;
  };
  run('test-records: tuning graph rows and a test folder', mk('tr0', [['export/graphs/' + TP], ['train'], ['r58c/B/out/r4test', 1]]), ['test-records'], 0, 'RESULT PASS test-records');
  run('test-records: a held-out parent folder', mk('tr1', [['export/graphs/' + HP]]), ['test-records'], 1, 'held-out parent');
  run('test-records: a held-out parent folder in upper case under graphs0', mk('tr2', [['export/graphs0/' + HP.toUpperCase()]]), ['test-records'], 1, 'held-out parent');
  run('test-records: export whole', mk('tr3', [['export']]), ['test-records'], 1, 'whole');
  run('test-records: a writable real output folder', mk('tr4', [['train/report/answer_level', 1]]), ['test-records'], 1, 'writable mount outside');
  run('test-records: a writable mount above the output folders (train)', mk('tr5', [['train', 1]]), ['test-records'], 1, 'writable mount outside');
  run('test-records: a writable mount outside the lane', mk('tr6', [['ABS:C:/somewhere/else', 1]]), ['test-records'], 1, 'writable mount outside');
}
console.log(bad ? 'SELFTEST FAILED: ' + bad : 'SELFTEST PASS (all cases)');
process.exit(bad ? 1 : 0);
