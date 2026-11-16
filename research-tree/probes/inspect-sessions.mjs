// Read-only: list claude.exe session processes, flag names, value kinds, start time, timing. Prints no values.
import { execFileSync } from 'node:child_process';
const t0 = performance.now();
const ps = `Get-CimInstance Win32_Process | Select-Object ProcessId,ParentProcessId,Name,ExecutablePath,CommandLine,CreationDate | ConvertTo-Json -Compress`;
const out = execFileSync('powershell', ['-NoProfile', '-Command', ps], { maxBuffer: 1 << 28 }).toString();
const ms = Math.round(performance.now() - t0);
let all = JSON.parse(out);
if (!Array.isArray(all)) all = [all];
const kind = (v) => {
  if (v === undefined) return 'none(boolean flag)';
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)) return 'id36';
  if (/^\d+$/.test(v)) return 'number';
  if (/[\\/]\.claude[\\/]projects[\\/]/i.test(v)) return 'path-under-projects';
  if (/^[A-Za-z]:[\\/]/.test(v) || v.startsWith('/')) return 'path';
  if (/^[a-z-]+$/i.test(v) && v.length < 24) return 'word:' + v;
  return 'other(len ' + v.length + ')';
};
const sess = all.filter((p) => p.Name === 'claude.exe' && /claude-code/i.test(p.ExecutablePath || ''));
const byParent = new Map();
for (const p of all) { (byParent.get(p.ParentProcessId) || byParent.set(p.ParentProcessId, []).get(p.ParentProcessId)).push(p); }
const res = sess.map((p) => {
  const toks = (p.CommandLine || '').match(/"[^"]*"|\S+/g) || [];
  const flags = [];
  for (let i = 1; i < toks.length; i++) {
    if (toks[i].startsWith('--')) {
      const nx = toks[i + 1];
      const hasVal = nx !== undefined && !nx.startsWith('--');
      flags.push(toks[i].split('=')[0] + ' -> ' + (toks[i].includes('=') ? kind(toks[i].split('=').slice(1).join('=')) : kind(hasVal ? nx.replace(/^"|"$/g, '') : undefined)));
    }
  }
  const kids = (byParent.get(p.ProcessId) || []).map((c) => c.Name);
  return { pid: p.ProcessId, ppid: p.ParentProcessId, created: p.CreationDate, cmdlineLen: (p.CommandLine || '').length, flags, children: kids };
});
console.log(JSON.stringify({ queryMs: ms, totalProcs: all.length, sessions: res }, null, 1));
