// lookups.mjs: replay-L38 side count. Every library lookup (Bash call naming lookup.sh) in harness and run transcripts,
// with the first line of its result: how often a lookup by words found records holding all the words.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJECTS = 'C:/Users/User/.claude/projects';
const files = [];
for (const d of fs.readdirSync(PROJECTS)) {
  if (!d.startsWith('C--Users-User-Documents-projects-harness-engineering') && !d.startsWith('C--research-runs-2026-11-harness-leads')) continue;
  const r = path.join(PROJECTS, d);
  for (const e of fs.readdirSync(r, { withFileTypes: true })) {
    if (e.isFile() && e.name.endsWith('.jsonl')) files.push([d, 'session', path.join(r, e.name)]);
    else if (e.isDirectory()) { try { for (const n of fs.readdirSync(path.join(r, e.name, 'subagents'))) if (n.endsWith('.jsonl')) files.push([d, 'helper', path.join(r, e.name, 'subagents', n)]); } catch {} }
  }
}
const rows = [];
for (const [d, kind, f] of files) {
  const uses = new Map();
  for (const l of fs.readFileSync(f, 'utf8').split('\n')) {
    if (!l.includes('lookup.sh') && !l.includes('tool_result')) continue;
    let o; try { o = JSON.parse(l); } catch { continue; }
    const c = o.message && Array.isArray(o.message.content) ? o.message.content : [];
    for (const b of c) {
      if (b.type === 'tool_use' && b.input && typeof b.input.command === 'string' && /lookup\.sh/.test(b.input.command)) uses.set(b.id, { cmd: b.input.command, t: o.timestamp });
      if (b.type === 'tool_result' && uses.has(b.tool_use_id)) {
        const t = typeof b.content === 'string' ? b.content : (Array.isArray(b.content) ? b.content.map(x => x.text || '').join('\n') : '');
        const u = uses.get(b.tool_use_id);
        rows.push({ g: d.startsWith('C--research') ? 'run' : 'harness', kind, t: u.t, cmd: u.cmd.slice(0, 200), first: t.split('\n')[0].slice(0, 160), chars: t.length });
      }
    }
  }
}
fs.writeFileSync(path.join(HERE, 'lookups.json'), JSON.stringify(rows, null, 1));
const firsts = {}; for (const r of rows) { const k = r.first.replace(/\d+/g, 'N').slice(0, 90); firsts[k] = (firsts[k] || 0) + 1; }
console.log('lookups', rows.length, 'by group', JSON.stringify(rows.reduce((a, r) => (a[r.g + '/' + r.kind] = (a[r.g + '/' + r.kind] || 0) + 1, a), {})));
console.log('result chars total', rows.reduce((a, r) => a + r.chars, 0));
console.log(Object.entries(firsts).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([k, v]) => v + '\t' + k).join('\n'));
