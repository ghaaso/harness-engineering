// R10: what unit is "subagent tokens"? For one session, sum token fields over subagent transcripts in several ways.
// Read-only. Usage: node r10-units.cjs <projectFolder> <sessionId>
const fs = require('fs'), path = require('path');
const [dir, sid] = process.argv.slice(2);
function walk(d, o) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p, o); else if (e.name.endsWith('.jsonl')) o.push(p); } return o; }
const sub = fs.existsSync(path.join(dir, sid)) ? walk(path.join(dir, sid), []) : [];
const main = [path.join(dir, sid + '.jsonl')];
function sum(files) {
  const t = { input: 0, cw: 0, cr: 0, out: 0, calls: 0 }; const seen = new Set();
  for (const f of files) for (const line of fs.readFileSync(f, 'utf8').split('\n')) {
    if (!line.includes('"usage"')) continue; let j; try { j = JSON.parse(line); } catch { continue; }
    const m = j.message; if (!m || m.role !== 'assistant' || !m.usage) continue;
    const k = m.id + '|' + j.requestId; if (seen.has(k)) continue; seen.add(k);
    const u = m.usage; t.input += u.input_tokens || 0; t.cw += u.cache_creation_input_tokens || 0; t.cr += u.cache_read_input_tokens || 0; t.out += u.output_tokens || 0; t.calls++;
  }
  return t;
}
const M = x => (x / 1e6).toFixed(2) + 'M';
for (const [name, files] of [['subagents', sub], ['main', main]]) {
  const t = sum(files);
  console.log(name, files.length, 'files', t.calls, 'calls | processed (in+cw+cr)', M(t.input + t.cw + t.cr), '| in+cw+out', M(t.input + t.cw + t.out), '| in+out', M(t.input + t.out), '| cw', M(t.cw), '| out', M(t.out));
}
