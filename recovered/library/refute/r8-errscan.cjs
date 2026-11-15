// R8 refuter, read-only over ~/.claude/projects transcripts. For every tool_result with is_error, record the failing
// tool call, the error head and the agent's next tool call (its recovery), so templates can be compared by cause.
// Usage: node r8-errscan.cjs <projectsDir> <out.jsonl>
const fs = require('fs'), path = require('path'), readline = require('readline');
const [root, out] = process.argv.slice(2);
function walk(d, acc) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p, acc); else if (e.name.endsWith('.jsonl')) acc.push(p); } return acc; }
const files = walk(root, []);
const ws = fs.createWriteStream(out);
let nErr = 0, nCalls = 0;
const head = (x, n) => String(x == null ? '' : x).slice(0, n);
function inputHead(name, inp) {
  if (!inp) return '';
  if (inp.command) return head(inp.command, 200);
  if (inp.file_path) return head(inp.file_path, 200);
  if (inp.pattern) return head(inp.pattern, 200);
  if (inp.url) return '[url]';
  return head(JSON.stringify(inp), 200);
}
(async () => {
  for (const f of files) {
    const store = path.relative(root, f).split(path.sep)[0];
    const sess = path.basename(f, '.jsonl');
    const rl = readline.createInterface({ input: fs.createReadStream(f), crlfDelay: Infinity });
    const seq = []; const idx = new Map(); const pending = [];
    for await (const line of rl) {
      const hasTU = line.includes('"tool_use"'), hasErr = line.includes('"is_error":true');
      if (!hasTU && !hasErr) continue;
      let o; try { o = JSON.parse(line); } catch { continue; }
      const c = o.message && o.message.content;
      if (!Array.isArray(c)) continue;
      if (o.type === 'assistant') {
        for (const b of c) if (b.type === 'tool_use') { idx.set(b.id, seq.length); seq.push({ n: b.name, h: inputHead(b.name, b.input) }); nCalls++; }
      } else if (o.type === 'user') {
        for (const b of c) if (b.type === 'tool_result' && b.is_error) {
          let t = b.content; if (Array.isArray(t)) t = t.map(x => x.text || '').join('\n');
          pending.push({ id: b.tool_use_id, t: head(t, 1500), ts: o.timestamp });
        }
      }
    }
    for (const p of pending) {
      const k = idx.get(p.id); const call = k != null ? seq[k] : null; const nxt = k != null ? seq[k + 1] : null;
      ws.write(JSON.stringify({ store, sess, ts: p.ts, tool: call && call.n, cmd: call && call.h, err: p.t, recov: nxt ? nxt.n + ': ' + nxt.h.slice(0, 160) : null }) + '\n');
      nErr++;
    }
  }
  ws.end();
  console.log('files', files.length, 'tool calls', nCalls, 'errors', nErr);
})();
