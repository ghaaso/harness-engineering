// Kit mode (2026-11-25, brief docs/program/harness-kit-2026-11-25/briefs/HOOKS.md; CONTRACT.md sections 1 and 2).
// A hook wired by the harness kit is started as
//     node "<clone>/<path of the hook>" --harness-kit "--project=<project>" [--no-usage-tool]
// and asks this module where things are. Without --harness-kit, kitMode() returns null and the hook behaves exactly as
// it does on the owner's PC; a hook loads this module only when --harness-kit is present, inside a try, so a hook whose
// copy of this module is missing or broken also behaves as today.
//
// What it gives (every path absolute, as given or resolved; compare paths with key()):
//   clone      the clone of the harness repository: two folders above the hook (.claude/hooks or harness-kit/hooks)
//   project    --project=<folder> (or --project <folder>), else the clone
//   state      <project>/.harness           state files (*-STATE.md), WIDTHS.md, basis.json, kit.json
//   briefs     <project>/.harness/briefs
//   logs       <project>/.claude/logs
//   usageTool  false when --no-usage-tool is given (a terminal session with no tool that reads the plan's usage)
// Nothing here depends on Windows: real paths are found with fs.realpathSync.native, so a clone or project under a
// symlink (/tmp on macOS is /private/tmp) compares equal to the path the app sends.
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join, basename } from 'node:path';

export const MARK = '--harness-kit';

// The real path of p, or, when p does not exist yet, the real path of its deepest existing folder joined with the rest.
export function realOf(p) {
  const start = resolve(String(p));
  let cur = start;
  const rest = [];
  for (let k = 0; k < 256; k++) {
    try {
      const r = realpathSync.native(cur);
      return rest.length ? join(r, ...rest.reverse()) : r;
    } catch {}
    const up = dirname(cur);
    if (up === cur) return start;
    rest.push(basename(cur));
    cur = up;
  }
  return start;
}
// A form of a path that compares equal for the same file: real, forward slashes, no trailing slash, lower case where
// the file system usually ignores case (Windows and macOS).
export function key(p) {
  let s = realOf(p).replace(/\\/g, '/');
  if (s.length > 1) s = s.replace(/\/+$/, '');
  if (process.platform !== 'linux') s = s.toLowerCase();
  return s;
}
// True when p is dir or lies under it (real paths compared). Returns the path relative to dir with forward slashes
// ('' for dir itself), or null.
export function under(p, dir) {
  const a = key(p), d = key(dir);
  if (a === d) return '';
  const pre = d.endsWith('/') ? d : d + '/';
  return a.startsWith(pre) ? a.slice(pre.length) : null;
}

// hook: import.meta.url of the hook, or its folder. argv: the hook's process.argv (default the current one).
export function kitMode(hook, argv = process.argv) {
  const args = (argv || []).slice(2).map(String);
  if (!args.includes(MARK)) return null;
  let here = String(hook || '');
  if (here.startsWith('file:')) here = dirname(fileURLToPath(here));
  const clone = resolve(here, '..', '..');
  let project = null;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith('--project=')) project = a.slice('--project='.length);
    else if (a === '--project' && args[i + 1] && !args[i + 1].startsWith('--')) project = args[i + 1];
  }
  project = project && project.trim() ? resolve(project.trim()) : clone;
  const state = join(project, '.harness');
  return {
    kit: true,
    clone,
    project,
    state,
    briefs: join(state, 'briefs'),
    logs: join(project, '.claude', 'logs'),
    usageTool: !args.includes('--no-usage-tool'),
    realOf, key, under,
  };
}
export default kitMode;
