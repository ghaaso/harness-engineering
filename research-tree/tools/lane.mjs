#!/usr/bin/env node
// lane.mjs: the one lane for heavy commands of this build.
//
//   node lane.mjs [--label NAME] [--heap MB] [--timeout-s N] [--wait-s N] -- <program> [args...]
//
// Why: the PC stalled twice while several agents ran bursts of short-lived processes at once. Every test run,
// script run and smoke run therefore goes through this lane. It
//   - lets only `capacity` commands run at a time across all agents (lane/capacity.txt, default 1),
//   - runs the command and everything it starts at below-normal priority,
//   - caps the heap of every Node process the command starts (NODE_OPTIONS),
//   - ends the command's whole process tree at its timeout (its own child, nothing else),
//   - writes a line to lane/log.jsonl, flushed to disk, when a command starts and when it ends.
// Exit code: the command's own; 124 on timeout; 75 when no slot came free within --wait-s; 64 on bad usage.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.join(HERE, '..', 'lane');
const LOG = path.join(DIR, 'log.jsonl');
// A hold is stale when its owner process is gone, or when it is older than the longest a command may run
// (MAX_TIMEOUT_S, the --timeout-s cap) plus a minute for the kill and the release: a live command is never broken
// below its cap (research-tree/build/check/C-capacity.md row 9; unit P0).
const MAX_TIMEOUT_S = 1500;
const MAX_HOLD_MS = (MAX_TIMEOUT_S + 60) * 1000;
fs.mkdirSync(DIR, { recursive: true });

const argv = process.argv.slice(2);
const sep = argv.indexOf('--');
if (sep < 0 || sep === argv.length - 1) { process.stderr.write('lane: usage: node lane.mjs [--label L] [--heap MB] [--timeout-s N] [--wait-s N] -- <program> [args...]\n'); process.exit(64); }
const opts = argv.slice(0, sep), cmd = argv.slice(sep + 1);
const opt = (name, dflt) => { const i = opts.indexOf(name); return i >= 0 && i + 1 < opts.length ? opts[i + 1] : dflt; };
const label = String(opt('--label', 'unnamed'));
const heap = Math.min(4096, Math.max(128, parseInt(opt('--heap', '1024'), 10) || 1024));
const timeoutS = Math.min(MAX_TIMEOUT_S, Math.max(5, parseInt(opt('--timeout-s', '540'), 10) || 540));
const waitS = Math.min(3000, Math.max(1, parseInt(opt('--wait-s', '900'), 10) || 900));

const sab = new Int32Array(new SharedArrayBuffer(4));
const sleep = (ms) => Atomics.wait(sab, 0, 0, ms);
const log = (o) => { try { const fd = fs.openSync(LOG, 'a'); fs.writeSync(fd, JSON.stringify(Object.assign({ t: new Date().toISOString() }, o)) + '\n'); fs.fsyncSync(fd); fs.closeSync(fd); } catch { /* the log must never stop the work */ } };
const capacity = () => { try { return Math.min(4, Math.max(1, parseInt(fs.readFileSync(path.join(DIR, 'capacity.txt'), 'utf8'), 10) || 1)); } catch { return 1; } };
const alive = (pid) => { try { process.kill(pid, 0); return true; } catch (e) { return e && e.code === 'EPERM'; } };

function tryAcquire() {
  const n = capacity();
  for (let i = 0; i < n; i++) {
    const d = path.join(DIR, 'slot-' + i);
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        fs.mkdirSync(d);
        fs.writeFileSync(path.join(d, 'owner.json'), JSON.stringify({ pid: process.pid, label, t: new Date().toISOString() }));
        return d;
      } catch (e) {
        if (!e || e.code !== 'EEXIST') throw e;
        let stale = false;
        try {
          const o = JSON.parse(fs.readFileSync(path.join(d, 'owner.json'), 'utf8'));
          stale = !alive(o.pid) || Date.now() - Date.parse(o.t) > MAX_HOLD_MS;
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
const child = spawn(cmd[0], cmd.slice(1), { stdio: 'inherit', env, windowsHide: true, shell: false });
let timedOut = false;
const timer = setTimeout(() => {
  timedOut = true;
  log({ ev: 'timeout', label, child: child.pid, after_s: timeoutS });
  if (process.platform === 'win32' && Number.isInteger(child.pid)) spawnSync('C:/Windows/System32/taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
  else { try { child.kill('SIGKILL'); } catch { /* already gone */ } }
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
