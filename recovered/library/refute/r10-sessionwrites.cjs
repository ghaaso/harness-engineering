// R10: what a session wrote (Write/Edit targets by top folders) and its context tokens by day. Read-only.
// Usage: node r10-sessionwrites.cjs <projectFolder> <sessionId>
const fs = require('fs'), path = require('path');
const [dir, sid] = process.argv.slice(2);
function walk(d, o) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p, o); else if (e.name.endsWith('.jsonl')) o.push(p); } return o; }
const files = [path.join(dir, sid + '.jsonl')];
if (fs.existsSync(path.join(dir, sid))) walk(path.join(dir, sid), files);
const tgt = {}, seen = new Set(), byDay = {}, byDayW = {};
for (const f of files) {
  for (const line of fs.readFileSync(f, 'utf8').split('\n')) {
    if (!line) continue; let j; try { j = JSON.parse(line); } catch { continue; }
    const m = j.message; if (!m || m.role !== 'assistant') continue;
    const d = (j.timestamp || '').slice(0, 10);
    if (m.usage) { const id = m.id + '|' + j.requestId; if (!seen.has(id)) { seen.add(id); const u = m.usage; byDay[d] = (byDay[d] || 0) + (u.input_tokens || 0) + (u.cache_creation_input_tokens || 0) + (u.cache_read_input_tokens || 0); } }
    for (const b of (m.content || [])) {
      if (b.type === 'tool_use' && ['Write', 'Edit', 'MultiEdit'].includes(b.name)) {
        let p = String(b.input.file_path || '').split(path.sep).join('/').split('\\').join('/');
        const i = p.indexOf('EMS_workshop1/'); if (i >= 0) p = p.slice(i + 14);
        const k = p.indexOf('scratchpad/'); if (k >= 0) p = 'SCRATCH/' + p.slice(k + 11);
        const key = p.split('/').slice(0, 3).join('/');
        tgt[key] = (tgt[key] || 0) + 1;
        byDayW[d] = byDayW[d] || {}; byDayW[d][key] = (byDayW[d][key] || 0) + 1;
      }
    }
  }
}
console.log('targets:', Object.entries(tgt).sort((a, b) => b[1] - a[1]).slice(0, 30));
for (const d of Object.keys(byDay).sort()) console.log(d, (byDay[d] / 1e6).toFixed(0) + 'M', JSON.stringify(Object.entries(byDayW[d] || {}).sort((a, b) => b[1] - a[1]).slice(0, 4)));
