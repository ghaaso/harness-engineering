// R3 refuter, read-only scan of local Claude Code transcripts.
// Extracts every tool_result that is an error, or that carries a known environment-fact signature,
// with its window, session, store, timestamp, tool name and the command that produced it.
// Also counts API calls (distinct assistant message ids) per window, with first/last timestamps.
// Usage: node R3-scan.cjs <projectsDir> <outDir>
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const [root, outDir] = process.argv.slice(2);
const SIG = /Python was not found|python3?: command not found|Filename too long|ERR_UNKNOWN_FILE_EXTENSION|command not found|is not recognized as|not a valid statement separator|exceeds maximum allowed tokens|File has not been read yet|Unknown file extension/;
function walk(d, acc) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, acc); else if (e.name.endsWith('.jsonl')) acc.push(p);
  }
  return acc;
}
const files = walk(root, []);
const errOut = fs.createWriteStream(path.join(outDir, 'R3-errors.jsonl'));
const winOut = [];
function textOf(c) {
  if (typeof c === 'string') return c;
  if (Array.isArray(c)) return c.map((x) => (x && typeof x.text === 'string' ? x.text : '')).join('\n');
  return '';
}
async function scan(f) {
  const rel = path.relative(root, f).split(path.sep);
  const store = rel[0];
  const sess = rel[1].replace(/\.jsonl$/, '');
  const win = rel.slice(1).join('/');
  const tools = new Map();
  const msgIds = new Set();
  let t0 = null, t1 = null, nErr = 0, nRes = 0;
  const rl = readline.createInterface({ input: fs.createReadStream(f), crlfDelay: Infinity });
  for await (const line of rl) {
    if (line.startsWith('{"type":"api-request-blob"')) continue;
    const isAsst = line.includes('"type":"assistant"');
    const hasRes = line.includes('"tool_result"');
    if (isAsst) {
      const m = line.match(/"id":"(msg_[A-Za-z0-9]+)"/);
      if (m) msgIds.add(m[1]);
      const ts = line.match(/"timestamp":"([^"]+)"/);
      if (ts) { const t = Date.parse(ts[1]); if (!t0 || t < t0) t0 = t; if (!t1 || t > t1) t1 = t; }
      if (line.includes('"tool_use"')) {
        let o; try { o = JSON.parse(line); } catch { continue; }
        const c = o.message && Array.isArray(o.message.content) ? o.message.content : [];
        for (const it of c) if (it && it.type === 'tool_use') {
          const inp = it.input || {};
          const cmd = inp.command || inp.file_path || inp.pattern || inp.url || inp.query || '';
          tools.set(it.id, { name: it.name, cmd: String(cmd).slice(0, 300) });
        }
      }
      continue;
    }
    if (!hasRes) continue;
    const isErr = line.includes('"is_error":true');
    if (!isErr && !SIG.test(line)) { nRes++; continue; }
    let o; try { o = JSON.parse(line); } catch { continue; }
    if (o.type !== 'user') continue;
    const c = o.message && Array.isArray(o.message.content) ? o.message.content : [];
    for (const it of c) {
      if (!it || it.type !== 'tool_result') continue;
      nRes++;
      const txt = textOf(it.content);
      if (!(it.is_error === true) && !SIG.test(txt)) continue;
      if (it.is_error === true) nErr++;
      const tu = tools.get(it.tool_use_id) || { name: '?', cmd: '' };
      errOut.write(JSON.stringify({ store, sess, win, ts: Date.parse(o.timestamp), tool: tu.name, cmd: tu.cmd, isErr: it.is_error === true, err: txt.slice(0, 600) }) + '\n');
    }
  }
  winOut.push({ store, sess, win, calls: msgIds.size, t0, t1, nErr, nRes });
}
(async () => {
  let i = 0;
  for (const f of files) { await scan(f); if (++i % 200 === 0) process.stderr.write(i + '/' + files.length + '\n'); }
  errOut.end();
  fs.writeFileSync(path.join(outDir, 'R3-windows.json'), JSON.stringify(winOut));
  console.log('files', files.length, 'windows', winOut.length, 'calls', winOut.reduce((a, w) => a + w.calls, 0));
})();
