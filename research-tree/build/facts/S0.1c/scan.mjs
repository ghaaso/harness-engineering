// S0.1c: scan one project folder of ~/.claude/projects; write out/<folder>.json. usage: node scan.mjs <folder-name>
import crypto from 'node:crypto'; const require0 = s => crypto.createHash('sha1').update(s).digest('hex').slice(0,16);
import fs from 'node:fs'; import path from 'node:path'; import readline from 'node:readline'; import os from 'node:os';
const ROOT = path.join(os.homedir(), '.claude', 'projects');
const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const d = process.argv[2];
const inc = (o, k, n = 1) => { o[k] = (o[k] || 0) + n; };
const agg = { folder: d, mainFiles: 0, helperFiles: 0, lines: 0, notJson: 0, types: {}, versions: {}, asst: {}, user: {}, sessions: [] };
const starterOf = (c) => {
  let t = typeof c === 'string' ? c : Array.isArray(c) ? c.filter(b => b && b.type === 'text').map(b => b.text).join(' ') : '';
  t = t.trim();
  let m = /^<([a-z][a-z-]*)[ >]/.exec(t); if (m) return m[1];
  if (/^\[Request interrupted/.test(t)) return 'interrupt';
  if (/^Caveat:/.test(t)) return 'caveat';
  return 'typed';
};
async function doFile(file, main, sid) {
  const rl = readline.createInterface({ input: fs.createReadStream(file, { encoding: 'utf8' }), crlfDelay: Infinity });
  let coord = false, cur = null; const turns = [];
  for await (const line of rl) {
    if (line.trim() === '') continue;
    agg.lines++;
    let o; try { o = JSON.parse(line); } catch { agg.notJson++; continue; }
    if (!o || typeof o !== 'object') { agg.notJson++; continue; }
    inc(agg.types, String(o.type)); if (o.version) inc(agg.versions, String(o.version));
    const ts = typeof o.timestamp === 'string' ? Date.parse(o.timestamp) : NaN;
    let startsTurn = false, hasAgent = false;
    const c = o.message && o.message.content;
    if (o.type === 'assistant' || o.type === 'user') {
      const tgt = o.type === 'assistant' ? agg.asst : agg.user;
      if (typeof c === 'string') inc(tgt, 'string'); else if (Array.isArray(c)) for (const b of c) {
        inc(tgt, b && b.type ? b.type : '?');
        if (o.type === 'assistant' && b && b.type === 'tool_use') {
          if (b.name === 'Agent' || b.name === 'Task' || b.name === 'mcp__ccd_session__start_session') { coord = true; hasAgent = true; }
        }
      } else inc(tgt, 'other:' + typeof c);
      if (o.type === 'user') startsTurn = typeof c === 'string' || !(Array.isArray(c) && c.some(b => b && b.type === 'tool_result'));
    }
    if (!main) continue;
    if (startsTurn) { cur = { start: ts, end: ts, starter: starterOf(c), agents: 0 }; turns.push(cur); }
    else if (cur) { if (!isNaN(ts)) { if (isNaN(cur.start)) cur.start = ts; cur.end = ts; } }
    if (cur && hasAgent) cur.agents++;
  }
  if (main && coord) agg.sessions.push({ sid, turns });
}
const dir = path.join(ROOT, d);
for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
  if (e.isFile() && e.name.endsWith('.jsonl')) { await doFile(path.join(dir, e.name), true, e.name.slice(0, -6)); agg.mainFiles++; }
  else if (e.isDirectory()) {
    const stack = [path.join(dir, e.name, 'subagents')];
    while (stack.length) { const cur = stack.pop(); let ls; try { ls = fs.readdirSync(cur, { withFileTypes: true }); } catch { continue; }
      for (const x of ls) { const p = path.join(cur, x.name); if (x.isDirectory()) stack.push(p); else if (x.name.endsWith('.jsonl')) { await doFile(p, false, ''); agg.helperFiles++; } } }
  }
}
fs.writeFileSync(path.join(HERE, 'out', require0(d) + '.json'), JSON.stringify(agg));
console.log('done', d.slice(-30), agg.mainFiles, agg.helperFiles, agg.lines);
