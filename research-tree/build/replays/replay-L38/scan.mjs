// scan.mjs: replay-L38 step 1. Reads helper transcripts and edit calls of four project groups; writes helpers.json, edits.json.
// node scan.mjs   (read-only over transcripts; writes only next to this file)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJECTS = 'C:/Users/User/.claude/projects';
export function groupOf(name) {
  if (name.startsWith('C--Users-User-Documents-projects-harness-engineering')) return 'harness';
  if (name.startsWith('C--research-runs-2026-11-harness-leads')) return 'run';
  if (name.includes('EMS-workshop1') || name.includes('20-PROJECTS-23-FixFlow')) return 'fixflow';
  if (name.includes('24-Clinic-Workshop')) return 'clinic';
  return null;
}
const EDIT = new Set(['Edit', 'Write', 'NotebookEdit', 'MultiEdit']);
const PATHRE = /([A-Za-z]:[\\/][^\s"'`|<>;,)]+|\/c\/[^\s"'`|<>;,)]+)/g;
function norm(p) {
  if (!p || typeof p !== 'string') return null;
  let s = p.replace(/\\/g, '/').replace(/^\/c\//i, 'C:/').replace(/[.:]+$/, '');
  if (/^[a-z]:\//.test(s)) s = s[0].toUpperCase() + s.slice(1);
  return s.toLowerCase();
}
function filesOfTool(name, inp) {
  const out = [];
  if (!inp) return out;
  for (const k of ['file_path', 'notebook_path', 'path']) if (typeof inp[k] === 'string') out.push(norm(inp[k]));
  if ((name === 'Bash' || name === 'PowerShell') && typeof inp.command === 'string')
    for (const m of inp.command.matchAll(PATHRE)) out.push(norm(m[1]));
  return out.filter(Boolean);
}
function textOf(c) {
  if (typeof c === 'string') return c;
  if (Array.isArray(c)) return c.filter(x => x.type === 'text').map(x => x.text).join('\n');
  return '';
}
function readLines(f) {
  let t; try { t = fs.readFileSync(f, 'utf8'); } catch { return []; }
  const out = [];
  for (const l of t.split('\n')) { if (!l) continue; try { out.push(JSON.parse(l)); } catch {} }
  return out;
}
function scanTranscript(f, edits, group) {
  const recs = readLines(f);
  const calls = new Map();
  let first = null, last = null, brief = null, report = null, lastText = null;
  const trace = new Set();
  for (const o of recs) {
    if (o.timestamp) { const t = Date.parse(o.timestamp); if (!first || t < first) first = t; if (!last || t > last) last = t; }
    if (o.type === 'user' && brief === null && o.message) { const t = textOf(o.message.content); if (t) brief = t; }
    if (o.type !== 'assistant' || !o.message) continue;
    const m = o.message;
    if (m.usage && m.id) {
      const u = m.usage, inp = u.input_tokens || 0, cc = u.cache_creation_input_tokens || 0, cr = u.cache_read_input_tokens || 0, out = u.output_tokens || 0;
      const p = calls.get(m.id);
      if (!p) calls.set(m.id, { inp, cc, cr, out });
      else { p.inp = Math.max(p.inp, inp); p.cc = Math.max(p.cc, cc); p.cr = Math.max(p.cr, cr); p.out = Math.max(p.out, out); }
    }
    if (!Array.isArray(m.content)) continue;
    for (const b of m.content) {
      if (b.type === 'text' && b.text && b.text.trim()) lastText = b.text;
      if (b.type !== 'tool_use') continue;
      if (b.name === 'SubagentHandback' && b.input && b.input.message) report = b.input.message;
      const fs_ = filesOfTool(b.name, b.input);
      for (const x of fs_) trace.add(x);
      if (EDIT.has(b.name) && o.timestamp) for (const x of fs_) edits.push({ g: group, f: x, t: Date.parse(o.timestamp) });
    }
  }
  let total = 0, fresh = 0;
  for (const v of calls.values()) { total += v.inp + v.cc + v.cr + v.out; fresh += v.inp + v.cc + v.out; }
  return { first, last, brief, report: report || lastText, trace: [...trace], calls: calls.size, total, fresh };
}

const helpers = [], edits = [], sessions = [];
for (const d of fs.readdirSync(PROJECTS, { withFileTypes: true })) {
  if (!d.isDirectory()) continue;
  const g = groupOf(d.name); if (!g) continue;
  const root = path.join(PROJECTS, d.name);
  for (const e of fs.readdirSync(root, { withFileTypes: true })) {
    if (e.isFile() && e.name.endsWith('.jsonl')) {
      const s = scanTranscript(path.join(root, e.name), edits, g);
      sessions.push({ g, folder: d.name, id: e.name, calls: s.calls, total: s.total, fresh: s.fresh });
      continue;
    }
    if (!e.isDirectory()) continue;
    const sd = path.join(root, e.name, 'subagents');
    let names; try { names = fs.readdirSync(sd); } catch { continue; }
    for (const n of names) {
      if (!n.endsWith('.jsonl')) continue;
      let meta = {}; try { meta = JSON.parse(fs.readFileSync(path.join(sd, n.replace(/\.jsonl$/, '.meta.json')), 'utf8')); } catch {}
      const s = scanTranscript(path.join(sd, n), edits, g);
      if (!s.brief) continue;
      helpers.push({ id: `${g}:${e.name.slice(0, 8)}:${n.replace(/\.jsonl$/, '')}`, g, folder: d.name, session: e.name,
        desc: meta.description || '', model: meta.model || '', ...s });
    }
  }
}
helpers.sort((a, b) => a.first - b.first);
fs.writeFileSync(path.join(HERE, 'helpers.json'), JSON.stringify(helpers));
fs.writeFileSync(path.join(HERE, 'edits.json'), JSON.stringify(edits));
fs.writeFileSync(path.join(HERE, 'sessions.json'), JSON.stringify(sessions));
const by = {};
for (const h of helpers) { const b = by[h.g] ||= { helpers: 0, total: 0, fresh: 0, withReport: 0 }; b.helpers++; b.total += h.total; b.fresh += h.fresh; if (h.report) b.withReport++; }
for (const s of sessions) { const b = by[s.g] ||= { helpers: 0, total: 0, fresh: 0, withReport: 0 }; b.sessTotal = (b.sessTotal || 0) + s.total; b.sessions = (b.sessions || 0) + 1; }
console.log(JSON.stringify(by, null, 1), 'edits', edits.length);
