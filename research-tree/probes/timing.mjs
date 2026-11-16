import { execFileSync } from 'node:child_process';
const T = (n, f) => { const t = performance.now(); f(); console.log(n, Math.round(performance.now() - t), 'ms'); };
for (let i = 0; i < 3; i++) {
  T('cim one pid', () => execFileSync('powershell', ['-NoProfile', '-Command', `(Get-CimInstance Win32_Process -Filter 'ProcessId=${process.pid}').CreationDate.ToUniversalTime().ToString('o')`]));
  T('get-process one pid', () => execFileSync('powershell', ['-NoProfile', '-Command', `(Get-Process -Id ${process.pid}).StartTime.ToUniversalTime().ToString('o')`]));
}
