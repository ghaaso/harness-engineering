// R10: sample shell commands mentioning check verbs, and their error status, in one group. Read-only.
// Usage: node r10-cmdsample.cjs <projectsRoot> <folderSubstring> <regex>
const fs = require('fs'), path = require('path');
const [root, sub, rx] = process.argv.slice(2);
const R = new RegExp(rx, 'i');
function walk(d, o) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p, o); else if (e.name.endsWith('.jsonl')) o.push(p); } return o; }
const forms = {}; let n = 0, err = 0; const errSamples = [];
for (const fo of fs.readdirSync(root).filter(f => f.includes(sub))) {
  for (const file of walk(path.join(root, fo), [])) {
    const cmds = new Map();
    for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
      if (!line.includes('tool_')) continue; let j; try { j = JSON.parse(line); } catch { continue; }
      const m = j.message; if (!m || !Array.isArray(m.content)) continue;
      for (const b of m.content) {
        if (b.type === 'tool_use' && (b.name === 'Bash' || b.name === 'PowerShell') && R.test(String(b.input.command || ''))) cmds.set(b.id, String(b.input.command));
        if (b.type === 'tool_result' && cmds.has(b.tool_use_id)) {
          const c = cmds.get(b.tool_use_id); n++;
          const key = c.replace(/"[^"]*"|'[^']*'/g, 'Q').replace(/\s+/g, ' ').slice(0, 70);
          forms[key] = (forms[key] || 0) + 1;
          if (b.is_error) { err++; if (errSamples.length < 15) { let t = b.content; if (Array.isArray(t)) t = t.map(x => x.text || '').join(' '); errSamples.push(c.slice(0, 120) + ' => ' + String(t).slice(0, 160).replace(/\s+/g, ' ')); } }
        }
      }
    }
  }
}
console.log('matched', n, 'errors', err);
console.log(Object.entries(forms).sort((a, b) => b[1] - a[1]).slice(0, 40).map(([k, v]) => v + '  ' + k).join('\n'));
console.log('--- error samples'); console.log(errSamples.join('\n'));
