// Read-only: does --resume id tie to a transcript file / project folder? Prints booleans and short hints only.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
const ps = `Get-CimInstance Win32_Process -Filter "Name='claude.exe'" | Select-Object ProcessId,ExecutablePath,CommandLine,CreationDate | ConvertTo-Json -Compress`;
let all = JSON.parse(execFileSync('powershell', ['-NoProfile', '-Command', ps], { maxBuffer: 1 << 26 }).toString());
if (!Array.isArray(all)) all = [all];
const root = 'C:/Users/User/.claude/projects';
const dirs = fs.readdirSync(root);
const enc = (p) => p.replace(/[:\\/._ ]/g, '-');
for (const p of all.filter((x) => /claude-code/i.test(x.ExecutablePath || ''))) {
  const cl = p.CommandLine || '';
  const m = cl.match(/--resume[=\s]"?([0-9a-f-]{36})"?/i);
  const adds = [...cl.matchAll(/--add-dir[=\s]("[^"]*"|\S+)/g)].map((x) => x[1].replace(/"/g, ''));
  const pcr = (cl.match(/--project-config-root[=\s]("[^"]*"|\S+)/) || [])[1];
  let found = null;
  if (m) for (const d of dirs) { const f = path.join(root, d, m[1] + '.jsonl'); if (fs.existsSync(f)) { const s = fs.statSync(f); found = { dir: d, sizeKB: Math.round(s.size / 1024), mtimeAgeMin: Math.round((Date.now() - s.mtimeMs) / 60000) }; break; } }
  console.log(JSON.stringify({
    pid: p.ProcessId, resumeIdPresent: !!m, transcriptFound: !!found, transcriptFolder: found && found.dir, ageMin: found && found.mtimeAgeMin,
    addDirs: adds.map((a) => ({ encodedMatchesFolder: found ? dirs.includes(enc(a)) && enc(a) === found.dir : null, isWorktreeLike: /worktree/i.test(a) })),
    projectConfigRootPresent: !!pcr, cwdReadable: false,
  }));
}
// does a transcript stay open by the process? Node cannot list handles; note only.
console.log('projects folders:', dirs.length);
