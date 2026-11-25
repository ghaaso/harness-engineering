// rw.json: per session of Tue 24 Nov, which parts it (and its helpers) read and wrote. node rw.mjs
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { DATA_DIR, D, partsOfPath, norm } from './common.mjs';
const PROJ = 'C:/Users/User/.claude/projects';
const T0 = new Date(2026, 10, 18, 0, 0, 0).getTime() + 8640 * 60000; // Tue 24 Nov 00:00 local
const folders = readdirSync(PROJ);
const readLines = p => { try { return readFileSync(p, 'utf8').split('\n').filter(Boolean); } catch { return []; } };
const out = {}; let stat = { calls: 0, unmapped: 0, bashWrites: 0, bashRefsOnly: 0 };
const WRITE_TOOLS = { Write: 'file_path', Edit: 'file_path', NotebookEdit: 'notebook_path', MultiEdit: 'file_path' };
const cmdWrites = cmd => {
  cmd = cmd.replace(/<<-?\s*(['"]?)([A-Za-z_]+)\1[^\n]*\n[^]*?\n\s*\2\s*(?=\n|$)/g, '\n'); // drop heredoc bodies
  const res = new Set(); let m;
  const clean = s => s && norm(s.replace(/^["'`]|["'`;)]+$/g, ''));
  const re1 = /(?:^|\s)\d?>>?\s*(?!&)["']?([^\s"'|;&<>)]+)/g; while ((m = re1.exec(cmd))) res.add(clean(m[1]));
  const re2 = /\btee\s+(?:-a\s+)?["']?([^\s"'|;&<>]+)/g; while ((m = re2.exec(cmd))) res.add(clean(m[1]));
  const re3 = /(?:Set-Content|Add-Content|Out-File)\b[^|;\n]*?(?:-(?:Path|FilePath|LiteralPath)\s+)?["']?([A-Za-z]:[^\s"'|;]+|[\w./~-][^\s"'|;]*)/g; while ((m = re3.exec(cmd))) res.add(clean(m[1]));
  const re4 = /\b(?:cp|mv|copy|move|Copy-Item|Move-Item)\b([^|;&\n]*)/g;
  while ((m = re4.exec(cmd))) { const a = m[1].trim().split(/\s+/).filter(x => !x.startsWith('-')); if (a.length >= 2) res.add(clean(a[a.length - 1])); }
  return [...res].map(x => x.replace(/^\/([a-z])\//i, (a, d) => d.toUpperCase() + ':/')).filter(x => x && /^[A-Za-z0-9_.~@%+:\/-]+$/.test(x) && /[./]/.test(x) && !/^\/dev\/|^nul$|^&|^\$/i.test(x) && !/^(\d|&)/.test(x));
};
function scan(file, bucket) {
  for (const l of readLines(file)) {
    if (!l.includes('"tool_use"')) continue;
    let o; try { o = JSON.parse(l); } catch { continue; }
    if (o.timestamp && Date.parse(o.timestamp) < T0) continue;
    const c = o.message && o.message.content; if (!Array.isArray(c)) continue;
    for (const b of c) {
      if (b.type !== 'tool_use' || !b.input) continue;
      const i = b.input, add = (path, k) => {
        stat.calls++; path = norm(path); if (!/^([A-Za-z]:|\/|~)/.test(path) && o.cwd) path = norm(o.cwd) + '/' + path.replace(/^\.\//, ''); let ids = partsOfPath(path);
        if (!ids.length) { for (const s of ['/x.md', '/x.mjs']) { ids = partsOfPath(String(path).replace(/\/$/, '') + s); if (ids.length) break; } }
        if (!ids.length) { stat.unmapped++; if (process.env.DBG) console.error('U', k, path); return; }
        for (const id of ids) { const r = bucket[id] || (bucket[id] = { read: 0, write: 0 }); r[k]++; }
      };
      if (b.name === 'Read' && i.file_path) add(i.file_path, 'read');
      else if (b.name === 'Grep' && i.path) add(i.path, 'read');
      else if (b.name === 'Glob') { const p = i.path ? norm(i.path).replace(/\/$/, '') + '/' : ''; add(i.pattern && /^([A-Za-z]:|\.|[\w-]+\/)/.test(norm(i.pattern)) && !p ? i.pattern.replace(/\*+/g, 'x') : p + String(i.pattern || '').replace(/\*+/g, 'x'), 'read'); }
      else if (WRITE_TOOLS[b.name] && i[WRITE_TOOLS[b.name]]) add(i[WRITE_TOOLS[b.name]], 'write');
      else if (b.name === 'Bash' && i.command) { const w = cmdWrites(i.command); if (w.length) stat.bashWrites++; for (const p of w) add(p, 'write'); }
    }
  }
}
const missing = [];
for (const s of D.sessions) {
  const bucket = out[s.id] = {}; let found = false;
  for (const f of folders) {
    const d = PROJ + '/' + f; let names; try { names = readdirSync(d); } catch { continue; }
    const t = names.find(n => n.startsWith(s.id) && n.endsWith('.jsonl')); if (!t) continue;
    found = true; scan(d + '/' + t, bucket);
    const sub = d + '/' + t.replace('.jsonl', '') + '/subagents';
    if (existsSync(sub)) for (const n of readdirSync(sub).filter(x => x.endsWith('.jsonl'))) scan(sub + '/' + n, bucket);
  }
  if (!found) missing.push(s.id);
}
writeFileSync(DATA_DIR + '/rw.json', JSON.stringify(out, null, 1));
let pairs = 0; for (const b of Object.values(out)) pairs += Object.keys(b).length;
console.log('sessions', Object.keys(out).length, 'pairs', pairs, 'missing', missing, stat);
