// Shared: load parts from data.js, expand file patterns to real repository files.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import vm from 'node:vm';
export const REPO = 'C:/Users/User/Documents/projects/harness-engineering';
const here = dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
export const DATA_DIR = resolve(here, '../../data');
const ctx = { window: {} }; vm.createContext(ctx);
vm.runInContext(readFileSync(join(REPO, 'docs/program/monitor/round8/clickable/shared/data.js'), 'utf8'), ctx);
export const D = ctx.window.TOOL_DATA;
export const parts = D.parts;
export const norm = s => String(s).replace(/\\/g, '/').replace(/\/{2,}/g, '/');

const SKIP_DIR = new Set(['node_modules', '.git']);
export function walk(dir, out = []) {
  let ents; try { ents = readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of ents) {
    if (e.isDirectory()) { if (!SKIP_DIR.has(e.name)) walk(dir + '/' + e.name, out); } else out.push(dir + '/' + e.name);
  }
  return out;
}
function braces(s) {
  const m = /\{([^{}]*)\}/.exec(s); if (!m) return [s];
  const res = [];
  for (const alt of m[1].split(',')) { if (alt.trim() === '...') continue; res.push(...braces(s.slice(0, m.index) + alt.trim() + s.slice(m.index + m[0].length))); }
  return res;
}
const esc = s => s.replace(/[.+^$()|[\]\\]/g, '\\$&');
// pattern -> {re, prefix}; matches repo-relative or absolute-normalised paths
export function patternSpecs(file) {
  const specs = [];
  for (const p of braces(file).flatMap(x => x.split(/, /))) {
    if (/^\(git\)$|^get_usage$|^update_plan$|^start_session$|^wrap_up$|^AskUserQuestion$|^Agent \/ Task$/.test(p)) continue;
    let q = p.replace(/^~\//, '<HOME>/').replace(/^C:\/research-runs\//, '<RUNS>/');
    const dir = q.endsWith('/');
    let r = esc(q).replace(/<[^>]+>/g, m => m === '<HOME>' ? '(?:[A-Za-z]:)?/.*?/Users/[^/]+' : '[^/]*').replace(/\*/g, '[^/]*');
    // a date or other suffix allowed after the name of a .md document (HARNESS-BOTTLENECKS-2026-11.md)
    if (/\.md$/.test(q) && /^docs\/program\//.test(q)) r = r.replace(/\\\.md$/, '(?:-[\\w.-]*)?\\.md');
    specs.push({ re: new RegExp('^' + r + (dir ? '.*' : '$')), glob: q, dir });
  }
  return specs;
}
// real files of a part (repo files only)
const ALL = walk(REPO).map(f => f.slice(REPO.length + 1));
export function realFiles(part) {
  if (part.dummy) return [];
  const out = new Set();
  for (const s of patternSpecs(part.file)) {
    if (s.glob.startsWith('<HOME>') || s.glob.startsWith('<RUNS>')) continue;
    const stat = s.glob.replace(/\/$/, '');
    const staticDir = stat.split('/').filter(x => !/[*<]/.test(x));
    for (const f of ALL) if (s.re.test(f)) out.add(f);
  }
  return [...out].sort();
}
// map any absolute/relative path to part ids (also external: memory, run folders)
const SPECS = parts.filter(p => !p.dummy).map(p => ({ id: p.id, specs: patternSpecs(p.file) }));
export function partsOfPath(path) {
  let p = norm(path).replace(/^\.\//, '');
  if (p.toLowerCase().startsWith(REPO.toLowerCase() + '/')) p = p.slice(REPO.length + 1);
  const ids = [];
  for (const { id, specs } of SPECS) for (const s of specs) {
    const re = s.glob.startsWith('<HOME>') ? new RegExp(s.re.source.replace(/^\^/, '')) : s.re; // memory: anywhere
    if (s.glob.startsWith('<HOME>') ? /\/\.claude\/projects\/[^/]+\/memory\//.test(p) : s.re.test(p)) { ids.push(id); break; }
  }
  return ids;
}
