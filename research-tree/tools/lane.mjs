#!/usr/bin/env node
// lane.mjs: the one lane for heavy commands of this build.
//
//   node lane.mjs [--dir DIR] [--label NAME] [--heap MB] [--timeout-s N] [--max-timeout-s N] [--wait-s N] -- <program> [args...]
//   node lane.mjs [--dir DIR] --capacity [N]          (read the number of slots, or set it to N; prints the number)
//
// Why: the PC stalled twice while several agents ran bursts of short-lived processes at once. Every test run,
// script run and smoke run therefore goes through this lane. It
//   - lets only `capacity` commands run at a time across all agents (lane/capacity.txt, default 1),
//   - runs the command and everything it starts at below-normal priority,
//   - caps the heap of every Node process the command starts (NODE_OPTIONS),
//   - ends the command's whole process tree at its timeout (its own child, nothing else): on Windows with taskkill /T;
//     elsewhere the command starts in a process group of its own and the group is signalled, so a test runner's
//     workers end with it,
//   - writes a line to lane/log.jsonl, flushed to disk, when a command starts and when it ends.
// --dir DIR: the folder of the slots, capacity.txt and log.jsonl (default research-tree/lane beside this script, as
//   before). The number of slots is at most 4 in the default folder (as before) and at most the processor count in a
//   folder given with --dir (harness-kit/parallel keeps one per project in <project>/.harness/lane).
// --max-timeout-s N: raises this call's ceiling on --timeout-s above 1500 s (up to 7 days). The hold then records its
//   own ceiling, and a hold is stale only after that ceiling plus a minute; a hold made without the option is judged
//   exactly as before (1500 s plus a minute).
// Exit code: the command's own; 124 on timeout; 75 when no slot came free within --wait-s; 64 on bad usage.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
// A hold is stale when its owner process is gone, or when it is older than the longest a command may run
// (MAX_TIMEOUT_S, the --timeout-s cap) plus a minute for the kill and the release: a live command is never broken
// below its cap (research-tree/build/check/C-capacity.md row 9; unit P0).
const MAX_TIMEOUT_S = 1500;
const LONGEST_S = 7 * 24 * 3600;
const WIN = process.platform === 'win32';

const argv = process.argv.slice(2);
const sep = argv.indexOf('--');
const opts = sep < 0 ? argv : argv.slice(0, sep), cmd = sep < 0 ? [] : argv.slice(sep + 1);
const opt = (name, dflt) => { const i = opts.indexOf(name); return i >= 0 && i + 1 < opts.length ? opts[i + 1] : dflt; };
const DIR = opts.includes('--dir') && opt('--dir', '') ? path.resolve(opt('--dir', '')) : path.join(HERE, '..', 'lane');
const SLOTS_MAX = opts.includes('--dir') ? Math.max(1, typeof os.availableParallelism === 'function' ? os.availableParallelism() : os.cpus().length) : 4;
const LOG = path.join(DIR, 'log.jsonl');
const CAP_FILE = path.join(DIR, 'capacity.txt');
fs.mkdirSync(DIR, { recursive: true });
const capacity = () => { try { return Math.min(SLOTS_MAX, Math.max(1, parseInt(fs.readFileSync(CAP_FILE, 'utf8'), 10) || 1)); } catch { return 1; } };

if (sep < 0 && opts.includes('--capacity')) {
  const v = opt('--capacity', undefined);
  if (v !== undefined && !v.startsWith('--')) {
    const n = Number(v);
    if (!Number.isInteger(n) || n < 1 || n > SLOTS_MAX) { process.stderr.write(`lane: --capacity takes a whole number from 1 to ${SLOTS_MAX}\n`); process.exit(64); }
    const tmp = CAP_FILE + '.' + process.pid + '.tmp';
    fs.writeFileSync(tmp, String(n) + '\n');
    fs.renameSync(tmp, CAP_FILE);
  }
  process.stdout.write(String(capacity()) + '\n');
  process.exit(0);
}
if (sep < 0 || sep === argv.length - 1) { process.stderr.write('lane: usage: node lane.mjs [--dir DIR] [--label L] [--heap MB] [--timeout-s N] [--max-timeout-s N] [--wait-s N] -- <program> [args...]\n       node lane.mjs [--dir DIR] --capacity [N]\n'); process.exit(64); }
const label = String(opt('--label', 'unnamed'));
const heap = Math.min(4096, Math.max(128, parseInt(opt('--heap', '1024'), 10) || 1024));
const maxT = Math.min(LONGEST_S, Math.max(MAX_TIMEOUT_S, parseInt(opt('--max-timeout-s', String(MAX_TIMEOUT_S)), 10) || MAX_TIMEOUT_S));
const timeoutS = Math.min(maxT, Math.max(5, parseInt(opt('--timeout-s', '540'), 10) || 540));
const waitS = Math.min(3000, Math.max(1, parseInt(opt('--wait-s', '900'), 10) || 900));

const sab = new Int32Array(new SharedArrayBuffer(4));
const sleep = (ms) => Atomics.wait(sab, 0, 0, ms);
const log = (o) => { try { const fd = fs.openSync(LOG, 'a'); fs.writeSync(fd, JSON.stringify(Object.assign({ t: new Date().toISOString() }, o)) + '\n'); fs.fsyncSync(fd); fs.closeSync(fd); } catch { /* the log must never stop the work */ } };
const alive = (pid) => { try { process.kill(pid, 0); return true; } catch (e) { return e && e.code === 'EPERM'; } };
// the hold's own ceiling, never below the default one: a hold made without --max-timeout-s is judged as before
const holdMs = (o) => (Math.max(MAX_TIMEOUT_S, Math.min(LONGEST_S, Number(o && o.max_s) || 0)) + 60) * 1000;

function tryAcquire() {
  const n = capacity();
  for (let i = 0; i < n; i++) {
    const d = path.join(DIR, 'slot-' + i);
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        fs.mkdirSync(d);
        const own = { pid: process.pid, label, t: new Date().toISOString() };
        if (maxT > MAX_TIMEOUT_S) own.max_s = maxT;
        fs.writeFileSync(path.join(d, 'owner.json'), JSON.stringify(own));
        return d;
      } catch (e) {
        if (!e || e.code !== 'EEXIST') throw e;
        let stale = false;
        try {
          const o = JSON.parse(fs.readFileSync(path.join(d, 'owner.json'), 'utf8'));
          stale = !alive(o.pid) || Date.now() - Date.parse(o.t) > holdMs(o);
        } catch {
          try { stale = Date.now() - fs.statSync(d).mtimeMs > 15000; } catch { stale = false; }
        }
        if (!stale) break;
        try { fs.rmSync(d, { recursive: true, force: true }); } catch { break; }
      }
    }
  }
  return null;
}

let slot = null;
const t0 = Date.now();
while (!(slot = tryAcquire())) {
  if (Date.now() - t0 > waitS * 1000) { log({ ev: 'busy', label, waited_s: waitS }); process.stderr.write('lane: no slot came free within ' + waitS + ' s; try again\n'); process.exit(75); }
  sleep(700);
}
const release = () => { if (slot) { try { fs.rmSync(slot, { recursive: true, force: true }); } catch { /* a stale slot is broken by the next caller */ } slot = null; } };
process.on('exit', release);

try { os.setPriority(os.constants.priority.PRIORITY_BELOW_NORMAL); } catch { /* priority is a courtesy, not a condition */ }
const env = Object.assign({}, process.env);
if (!/max-old-space-size/.test(env.NODE_OPTIONS || '')) env.NODE_OPTIONS = ((env.NODE_OPTIONS || '') + ' --max-old-space-size=' + heap).trim();

const started = Date.now();
log({ ev: 'start', label, pid: process.pid, waited_ms: started - t0, cmd: cmd.join(' ').slice(0, 400) });
// off Windows the command leads a process group of its own (detached), so the whole group can be signalled
const child = WIN
  ? spawn(cmd[0], cmd.slice(1), { stdio: 'inherit', env, windowsHide: true, shell: false })
  : spawn(cmd[0], cmd.slice(1), { stdio: 'inherit', env, windowsHide: true, shell: false, detached: true });
const killGroup = (sig) => {
  if (!Number.isInteger(child.pid)) return;
  try { process.kill(-child.pid, sig); } catch { try { child.kill(sig); } catch { /* already gone */ } }
};
if (!WIN) {
  // the group no longer gets the terminal's signals: pass them on, so ending the lane ends the command too
  for (const [sig, num] of [['SIGINT', 2], ['SIGTERM', 15], ['SIGHUP', 1]]) {
    process.on(sig, () => { killGroup(sig); log({ ev: 'end', label, exit: 128 + num, signal: sig, ms: Date.now() - started }); release(); process.exit(128 + num); });
  }
}
let timedOut = false;
const timer = setTimeout(() => {
  timedOut = true;
  log({ ev: 'timeout', label, child: child.pid, after_s: timeoutS });
  if (WIN && Number.isInteger(child.pid)) spawnSync('C:/Windows/System32/taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
  else if (WIN) { try { child.kill('SIGKILL'); } catch { /* already gone */ } }
  else killGroup('SIGKILL');
}, timeoutS * 1000);
child.on('error', (e) => { clearTimeout(timer); log({ ev: 'end', label, error: String(e && e.message ? e.message : e), ms: Date.now() - started }); release(); process.exit(127); });
child.on('exit', (code, signal) => {
  clearTimeout(timer);
  const exit = timedOut ? 124 : (code === null ? 1 : code);
  log({ ev: 'end', label, exit, signal: signal || null, ms: Date.now() - started });
  sleep(300);
  release();
  process.exit(exit);
});
