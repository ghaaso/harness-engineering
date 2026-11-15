// Read-only: extract file-read events (path, ts, window, chars) from transcripts.
// Usage: node reads.cjs <out.jsonl> <marker> <storeDir>...   marker = repo folder name, lowercase, e.g. 24_clinic_workshop/
const fs = require('fs'), path = require('path'), readline = require('readline');
const [outF, marker, ...stores] = process.argv.slice(2);
const out = fs.createWriteStream(outF);
function walk(d, acc) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p, acc); else if (e.name.endsWith('.jsonl')) acc.push(p); } return acc; }
const BS = String.fromCharCode(92);
function norm(p) {
  if (!p) return null;
  p = p.split(BS).join('/').replace(/^["']|["']$/g, '');
  const i = p.toLowerCase().indexOf(marker);
  if (i < 0) return null;
  p = p.slice(i + marker.length);
  p = p.replace(/^\.claude\/worktrees\/[^/]+\//, '');
  return p.toLowerCase();
}
function cmdPaths(cmd) {
  const m = [];
  if (!/^\s*(cd\s+[^&;]+(&&|;)\s*)?(cat|sed\s+-n|head|tail|nl)\b/.test(cmd)) return m;
  const re = /([A-Za-z]:[\/\\][^\s'"|;&>]+|(?:\.\/)?[A-Za-z0-9_.\-]+(?:\/[A-Za-z0-9_.\-]+)+\.[A-Za-z0-9]+)/g;
  let x;
  while ((x = re.exec(cmd))) m.push(x[1]);
  return m;
}
async function one(f, win) {
  const rl = readline.createInterface({ input: fs.createReadStream(f), crlfDelay: Infinity });
  const pend = new Map(); let cwd = '';
  for await (const line of rl) {
    if (line.startsWith('{"type":"api-request-blob"') || line.startsWith('{"type":"file-history')) continue;
    let o; try { o = JSON.parse(line); } catch { continue; }
    if (o.cwd) cwd = o.cwd;
    const ts = o.timestamp ? Date.parse(o.timestamp) : null;
    if (o.type === 'assistant' && o.message && Array.isArray(o.message.content)) {
      for (const b of o.message.content) {
        if (b.type !== 'tool_use') continue;
        let ps = [];
        if (b.name === 'Read' && b.input) ps = [b.input.file_path];
        else if ((b.name === 'Bash' || b.name === 'PowerShell') && b.input && b.input.command) {
          const c = cwd.split(BS).join('/');
          ps = cmdPaths(String(b.input.command)).map(p => /^[A-Za-z]:/.test(p) ? p : (c + '/' + p.replace(/^\.\//, '')));
        }
        const np = ps.map(norm).filter(Boolean);
        if (np.length) pend.set(b.id, { ps: np, ts, kind: b.name });
      }
    }
    if (o.type === 'user' && o.message && Array.isArray(o.message.content)) {
      for (const b of o.message.content) {
        if (b.type !== 'tool_result') continue;
        const p = pend.get(b.tool_use_id); if (!p) continue; pend.delete(b.tool_use_id);
        let ch = 0; const c = b.content;
        if (typeof c === 'string') ch = c.length; else if (Array.isArray(c)) ch = c.reduce((a, x) => a + (x.text ? x.text.length : 0), 0);
        for (const q of p.ps) out.write(JSON.stringify({ w: win, p: q, ts: p.ts, ch: Math.round(ch / p.ps.length), k: p.kind }) + '\n');
      }
    }
  }
}
(async () => {
  for (const s of stores) {
    const mains = fs.readdirSync(s).filter(n => n.endsWith('.jsonl'));
    for (const mf of mains) {
      await one(path.join(s, mf), path.basename(s).slice(-14) + '/' + mf);
      const sd = path.join(s, mf.replace(/\.jsonl$/, ''), 'subagents');
      if (fs.existsSync(sd)) for (const sf of walk(sd, [])) await one(sf, path.basename(s).slice(-14) + '/' + path.basename(sf));
    }
  }
  out.end();
})();
