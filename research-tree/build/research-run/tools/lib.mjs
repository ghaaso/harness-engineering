// Shared by the run's four scripts. RUN root = the folder above tools/, or env RUN_ROOT (tests).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const RUN = path.resolve(process.env.RUN_ROOT || path.join(path.dirname(fileURLToPath(import.meta.url)), '..'));
export const PROJECTS = process.env.CLAUDE_PROJECTS || 'C:/Users/User/.claude/projects';

export function appName(p) { return path.resolve(p).replace(/[^A-Za-z0-9]/g, '-'); }

export function readConfig() {
  try { return JSON.parse(fs.readFileSync(path.join(RUN, 'run', 'config.json'), 'utf8')); } catch { return null; }
}

// unit = first word after "<kind>: " in a helper's description
export function unitOf(desc) {
  const m = /^[^:]*:\s*(\S+)/.exec(String(desc || ''));
  return m ? m[1].replace(/[^\w-]+$/, '') : '(none)';
}

function countFile(file) {
  const calls = new Map();
  let text;
  try { text = fs.readFileSync(file, 'utf8'); } catch { return calls; }
  for (const line of text.split('\n')) {
    if (!line) continue;
    let o; try { o = JSON.parse(line); } catch { continue; }
    if (o.type !== 'assistant' || !o.message || !o.message.usage || !o.message.id) continue;
    const u = o.message.usage;
    const inp = u.input_tokens || 0, cc = u.cache_creation_input_tokens || 0, cr = u.cache_read_input_tokens || 0, out = u.output_tokens || 0;
    const p = calls.get(o.message.id);
    if (!p) calls.set(o.message.id, { inp, cc, cr, out });
    else { p.inp = Math.max(p.inp, inp); p.cc = Math.max(p.cc, cc); p.cr = Math.max(p.cr, cr); p.out = Math.max(p.out, out); }
  }
  return calls;
}

export function transcriptFolders(root) {
  if (root) return [path.resolve(root)];
  const name = appName(RUN);
  let ds = [];
  try { ds = fs.readdirSync(PROJECTS, { withFileTypes: true }); } catch { return []; }
  return ds.filter(d => d.isDirectory() && (d.name === name || d.name.startsWith(name + '-'))).map(d => path.join(PROJECTS, d.name));
}

// Returns Map unit -> { calls, total, fresh, rows[] }. Session transcripts (<folder>/<id>.jsonl) count to
// unit "coordinator"; helpers (<folder>/<id>/subagents/*.jsonl, nested ones sit in the same folder) to their unit.
export function tokensByUnit(root) {
  const units = new Map();
  const add = (unit, label, calls) => {
    let t = 0, f = 0;
    for (const v of calls.values()) { t += v.inp + v.cc + v.cr + v.out; f += v.inp + v.cc + v.out; }
    if (!calls.size) return;
    let u = units.get(unit); if (!u) units.set(unit, u = { calls: 0, total: 0, fresh: 0, rows: [] });
    u.calls += calls.size; u.total += t; u.fresh += f; u.rows.push({ label, calls: calls.size, total: t, fresh: f });
  };
  for (const folder of transcriptFolders(root)) {
    let ents; try { ents = fs.readdirSync(folder, { withFileTypes: true }); } catch { continue; }
    for (const e of ents) {
      if (e.isFile() && e.name.endsWith('.jsonl')) add('coordinator', e.name, countFile(path.join(folder, e.name)));
      if (!e.isDirectory()) continue;
      const sd = path.join(folder, e.name, 'subagents');
      let names; try { names = fs.readdirSync(sd); } catch { continue; }
      for (const n of names) {
        if (!n.endsWith('.meta.json')) continue;
        let meta; try { meta = JSON.parse(fs.readFileSync(path.join(sd, n), 'utf8')); } catch { continue; }
        const label = `${n.replace(/\.meta\.json$/, '')} [${meta.description || ''}]${meta.parentAgentId ? ' parent ' + meta.parentAgentId : ''}`;
        add(unitOf(meta.description), label, countFile(path.join(sd, n.replace(/\.meta\.json$/, '.jsonl'))));
      }
    }
  }
  return units;
}

export function totalOf(units) {
  let calls = 0, total = 0, fresh = 0;
  for (const u of units.values()) { calls += u.calls; total += u.total; fresh += u.fresh; }
  return { calls, total, fresh };
}
export const M = n => (n / 1e6).toFixed(2);
