// Read-only probe: spawns two dummy node processes of its own (one with a child),
// taskkill /T /F's the parent tree, re-reads liveness and start time via CIM.
import { spawn, spawnSync, execFileSync } from 'node:child_process';
const PS = 'powershell.exe';
function cim(pid) {
  const t0 = process.hrtime.bigint();
  const out = spawnSync(PS, ['-NoProfile', '-Command',
    `$p=Get-CimInstance Win32_Process -Filter "ProcessId=${pid}"; if($p){$p.CreationDate.ToUniversalTime().ToString('o')}`],
    { encoding: 'utf8' }).stdout.trim();
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  return { start: out || null, ms: Math.round(ms) };
}
function alive(pid) { try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; } }
const idle = 'setInterval(()=>{},1000)';
const childCode = `require('child_process').spawn(process.execPath,['-e','${idle}'],{stdio:'ignore'});${idle}`;
const A = spawn(process.execPath, ['-e', childCode], { stdio: 'ignore' });
const B = spawn(process.execPath, ['-e', idle], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 1500));
const kidOut = spawnSync(PS, ['-NoProfile', '-Command',
  `(Get-CimInstance Win32_Process -Filter "ParentProcessId=${A.pid}").ProcessId`], { encoding: 'utf8' }).stdout.trim();
const kid = Number(kidOut);
const before = { A: [A.pid, alive(A.pid), cim(A.pid)], kidOfA: [kid, alive(kid), cim(kid)], B: [B.pid, alive(B.pid), cim(B.pid)] };
console.log('before', JSON.stringify(before));
const tk = spawnSync('taskkill', ['/PID', String(A.pid), '/T', '/F'], { encoding: 'utf8' });
console.log('taskkill A exit', tk.status, tk.stdout.trim().replace(/\r?\n/g, ' | '));
await new Promise(r => setTimeout(r, 500));
console.log('after', JSON.stringify({ A: [alive(A.pid), cim(A.pid)], kidOfA: [alive(kid), cim(kid)], B: [alive(B.pid), cim(B.pid)] }));
const tk2 = spawnSync('taskkill', ['/PID', String(B.pid), '/T', '/F'], { encoding: 'utf8' });
console.log('taskkill B exit', tk2.status);
const tk3 = spawnSync('taskkill', ['/PID', String(A.pid), '/T', '/F'], { encoding: 'utf8' });
console.log('taskkill on already-dead pid exit', tk3.status, tk3.stderr.trim());
await new Promise(r => setTimeout(r, 300));
console.log('final', JSON.stringify({ B: alive(B.pid) }));
process.exit(0);
