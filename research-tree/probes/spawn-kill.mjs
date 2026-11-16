// Spawns two dummy node processes (one with a child), taskkill /T /F the tree, re-reads liveness and start time.
// Only touches pids it spawned itself. Also shows start-time identity (pid + start time) to detect pid reuse.
import { spawn, execFileSync, spawnSync } from 'node:child_process';

const ps = (cmd) => execFileSync('powershell', ['-NoProfile', '-Command', cmd], { maxBuffer: 1 << 24 }).toString().trim();
// One query for many pids: returns Map pid -> {start (ms epoch), ppid}; absent means not alive.
function read(pids) {
  const t0 = performance.now();
  const filter = pids.map((p) => `ProcessId=${p}`).join(' OR ');
  const out = ps(`Get-CimInstance Win32_Process -Filter '${filter}' | ForEach-Object { "$($_.ProcessId)|$($_.ParentProcessId)|$($_.CreationDate.ToUniversalTime().ToString('o'))" }`);
  const m = new Map();
  for (const l of out.split(/\r?\n/).filter(Boolean)) { const [pid, ppid, start] = l.split('|'); m.set(Number(pid), { ppid: Number(ppid), start }); }
  return { m, ms: Math.round(performance.now() - t0) };
}

const idle = 'setInterval(()=>{},1000)';
const parentCode = `const {spawn}=require('child_process');const c=spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'ignore'});console.log(c.pid);setInterval(()=>{},1000)`;

const A = spawn(process.execPath, ['-e', parentCode], { stdio: ['ignore', 'pipe', 'ignore'] });
const B = spawn(process.execPath, ['-e', idle], { stdio: 'ignore' });
const childPid = await new Promise((res) => A.stdout.once('data', (d) => res(Number(String(d).trim()))));
const all = [A.pid, childPid, B.pid];
const before = read(all);
console.log('spawned (A parent, A child, B):', all.join(','));
console.log('before kill, alive:', JSON.stringify([...before.m].map(([p, v]) => ({ pid: p, ppid: v.ppid, start: v.start }))), 'query ms', before.ms);

// Kill tree of A only (the pids are ones this script spawned).
const r = spawnSync('taskkill', ['/PID', String(A.pid), '/T', '/F'], { encoding: 'utf8' });
console.log('taskkill A exit', r.status, (r.stdout || '').trim().replace(/\r?\n/g, ' | '));
await new Promise((r2) => setTimeout(r2, 500));
const mid = read(all);
console.log('after kill A tree, alive pids:', [...mid.m.keys()].join(',') || 'none', '(B expected alive); query ms', mid.ms);
const bStart = before.m.get(B.pid).start;
console.log('B start time unchanged on re-read:', mid.m.get(B.pid)?.start === bStart);
const r2 = spawnSync('taskkill', ['/PID', String(B.pid), '/F'], { encoding: 'utf8' });
console.log('taskkill B exit', r2.status);
await new Promise((r3) => setTimeout(r3, 300));
console.log('after kill B, alive pids:', [...read(all).m.keys()].join(',') || 'none');

// Liveness of an absent pid: taskkill on dead pid returns 128; Get-CimInstance returns nothing.
const r3 = spawnSync('taskkill', ['/PID', String(A.pid), '/F'], { encoding: 'utf8' });
console.log('taskkill on already-dead pid exit', r3.status);

// Pid-reuse rule: identity = (pid, start). A record {pid, start} is alive iff read(pid).start === recorded start.
const stale = { pid: B.pid, start: bStart };
const now = read([stale.pid]).m.get(stale.pid);
console.log('identity check for dead B record: alive?', !!now && now.start === stale.start);
console.log('simulated reuse: same pid with different start is not the same process:', 'X' !== stale.start);
// How long an own-pid single query takes vs full listing was shown above; also time Node-only liveness:
let alive; try { process.kill(A.pid, 0); alive = true; } catch (e) { alive = e.code; }
console.log('process.kill(pid,0) on dead pid ->', alive);
