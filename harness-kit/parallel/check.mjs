#!/usr/bin/env node
// check.mjs: the project's test files side by side, each through the queue with the one-file command of
// <project>/.harness/kit.json (harness-kit/parallel/kit.example.json).
// Measured in the harness project (harness-kit/parallel/SPEEDUPS.md, "The test suite", r57-0103): its suite went from
// 596 s one file at a time to 264 s with 8 files at once and 120.4 s with its longest file cut into 4 shards. Those are
// that project's figures; --measure gives this project's own.
//
//   node <clone>/harness-kit/parallel/check.mjs [test file...] [--at N] [--in DIR] [--project DIR]
//   node <clone>/harness-kit/parallel/check.mjs --measure            [--in DIR] [--project DIR]
//
// Lists the test files (kit.json test_files, matched against the files git tracks or does not ignore), runs them N at
// once (default queue_slots), each through the project's queue (<project>/.harness/lane, slots = queue_slots) with
// check_one and its timeout; prints pass, fail or no result per file and the total seconds. A file kit.json lists
// with shards runs as its shards and nothing else. --in: the folder to check (default: the top of the checkout it is
// called from, so a call from a unit's copy checks that copy); the config is always the project's.
// --measure: the whole set at 1, 2, 4 and 8 at once (never above the processor count), each level through a queue of
// its own with that many slots (<project>/.harness/lane-measure, beside the project's queue: run it when nothing
// else heavy runs); prints the seconds of each and the fastest, and writes them to <project>/.harness/check-measure.json.
// It changes no setting: queue_slots stays as kit.json says.
// Exit: 0 all passed; 1 a file failed or got no result; 64 usage or set-up; 70 internal error.
import fs from 'node:fs';
import path from 'node:path';
import {
  KitError, gitOut, parseArgs, resolveProject, harnessDir, loadConfig, listTests, membersOf, queueDir, setSlots,
  laneRun, runPool, stamp, safe, noticeOnce, NOTICE, CPUS, r1, normPath,
} from './kitlib.mjs';

const say = (s) => process.stderr.write(`check: ${s}\n`);
const LEVELS = [1, 2, 4, 8];

async function runSet(cfg, dir, members, at, cwd, logs, print) {
  const t0 = Date.now();
  await runPool(members, at, (m) => laneRun({ dir, label: `check-${safe(m.id)}-${process.pid}`, argv: m.argv, cwd, timeoutS: cfg.check_one_timeout_s, log: path.join(logs, safe(m.id) + '.log') }),
    print ? (m, r) => process.stdout.write(`${r.result === 'none' ? 'no result' : r.result}`.padEnd(10) + `${r1(r.ran)} s`.padStart(9) + `  ${m.id}${r.result === 'pass' ? '' : `  (exit ${r.exit}; log ${r.log})`}\n`) : null);
  const s = (Date.now() - t0) / 1000;
  const pass = members.filter((m) => m.res.result === 'pass').length;
  return { s, pass, fail: members.filter((m) => m.res.result === 'fail').length, none: members.filter((m) => m.res.result === 'none').length };
}

async function main() {
  const { opt, pos } = parseArgs(process.argv.slice(2), ['project', 'in', 'at'], ['measure']);
  const project = resolveProject(opt.project);
  const cfg = loadConfig(project);
  noticeOnce(project, 'check', NOTICE);
  const cwd = path.resolve(opt.in ? opt.in : gitOut(process.cwd(), ['rev-parse', '--show-toplevel']));
  if (!fs.existsSync(cwd)) throw new KitError(64, `no folder ${cwd}`);
  let files;
  if (pos.length) {
    files = [...new Set(pos.map(normPath))];
    for (const f of files) if (!fs.existsSync(path.join(cwd, f))) throw new KitError(64, `no file ${f} in ${cwd}`);
  } else files = listTests(cwd, cfg.test_files);
  if (!files.length) throw new KitError(64, `no test files match ${JSON.stringify(cfg.test_files)} in ${cwd}`);
  const logs = path.join(harnessDir(project), 'check', `${stamp()}-${process.pid}`);

  if (opt.measure) {
    if (opt.at) throw new KitError(64, '--measure runs its own levels; give no --at');
    const levels = LEVELS.filter((n) => n <= CPUS);
    const dir = queueDir(project, 'lane-measure');
    const n = membersOf(cfg, files).length;
    say(`measuring ${files.length} file(s) (${n} run(s)) at ${levels.join(', ')} at once in ${cwd}; ${CPUS} processors`);
    const rows = [];
    for (const at of levels) {
      setSlots(dir, at);
      const r = await runSet(cfg, dir, membersOf(cfg, files), at, cwd, path.join(logs, `at-${at}`), false);
      rows.push({ at, s: r1(r.s), pass: r.pass, fail: r.fail, no_result: r.none });
      process.stdout.write(`at ${String(at).padStart(2)} at once: ${String(r1(r.s)).padStart(8)} s   ${r.pass} passed, ${r.fail} failed, ${r.none} no result\n`);
    }
    const clean = rows.filter((r) => !r.fail && !r.no_result);
    const best = (clean.length ? clean : rows).reduce((a, b) => (b.s < a.s ? b : a));
    process.stdout.write(`fastest: ${best.at} at once, ${best.s} s (1 at once: ${rows[0].s} s)${clean.length ? '' : '; every level had a failure, so the times are not comparable'}\n`);
    process.stdout.write(`queue_slots in kit.json is ${cfg.queue_slots}; this run changed nothing\n`);
    const out = { t: new Date().toISOString(), in: cwd, files: files.length, runs: n, cpus: CPUS, levels: rows, fastest: best.at, queue_slots: cfg.queue_slots };
    fs.writeFileSync(path.join(harnessDir(project), 'check-measure.json'), JSON.stringify(out, null, 1) + '\n');
    return rows.some((r) => r.fail || r.no_result) ? 1 : 0;
  }

  let at = cfg.queue_slots;
  if (opt.at !== undefined) {
    at = Number(opt.at);
    if (!Number.isInteger(at) || at < 1 || at > 256) throw new KitError(64, '--at takes a whole number from 1 to 256');
  }
  if (at > cfg.queue_slots) say(`--at ${at}, but the queue runs at most ${cfg.queue_slots} at once (queue_slots in kit.json)`);
  const dir = queueDir(project);
  setSlots(dir, cfg.queue_slots);
  const ms = membersOf(cfg, files);
  const r = await runSet(cfg, dir, ms, at, cwd, logs, true);
  process.stdout.write(`${r.pass} passed, ${r.fail} failed, ${r.none} no result; ${files.length} file(s) in ${ms.length} run(s), ${at} at once; ${r1(r.s)} s in all\n`);
  return r.fail || r.none ? 1 : 0;
}

main().then((code) => { process.exitCode = code || 0; }, (e) => {
  if (e instanceof KitError) { say(e.message); process.exitCode = e.code; return; }
  say(`internal error: ${e && e.stack ? e.stack : e}`);
  process.exitCode = 70;
});
