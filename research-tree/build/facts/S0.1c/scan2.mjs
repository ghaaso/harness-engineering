// S0.1c second measure: turns ending at last assistant / tool-result line; gaps and causes. usage: node scan2.mjs <folder>
import crypto from 'node:crypto'; import fs from 'node:fs'; import path from 'node:path'; import readline from 'node:readline'; import os from 'node:os';
const h = s => crypto.createHash('sha1').update(s).digest('hex').slice(0,16);
const ROOT = path.join(os.homedir(), '.claude', 'projects');
const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const d = process.argv[2]; const out = { folder: d, sessions: [] };
const starterOf = (c) => { let t = typeof c === 'string' ? c : Array.isArray(c) ? c.filter(b => b && b.type === 'text').map(b => b.text).join(' ') : ''; t = t.trim();
  let m = /^<([a-z][a-z-]*)[ >]/.exec(t); if (m) return m[1]; if (/^\[Request interrupted/.test(t)) return 'interrupt'; if (/^Caveat:/.test(t)) return 'caveat'; return 'typed'; };
async function doFile(file, sid) {
  const rl = readline.createInterface({ input: fs.createReadStream(file, { encoding: 'utf8' }), crlfDelay: Infinity });
  let coord = false, cur = null; const turns = []; const pending = new Map(); let prev = NaN;
  const closeTurn = () => { if (cur && cur.gaps) cur.gaps = cur.gaps.filter(g => g.ms > 300000); };
  for await (const line of rl) {
    if (line.trim() === '') continue; let o; try { o = JSON.parse(line); } catch { continue; } if (!o || typeof o !== 'object') continue;
    const ts = typeof o.timestamp === 'string' ? Date.parse(o.timestamp) : NaN; const c = o.message && o.message.content;
    const snap = [...pending.values()]; let isStart = false, isWork = false;
    if (o.type === 'assistant' || o.type === 'user') {
      if (o.type === 'assistant' && Array.isArray(c)) for (const b of c) if (b && b.type === 'tool_use') {
        if (b.name === 'Agent' || b.name === 'Task' || b.name === 'mcp__ccd_session__start_session') coord = true;
        pending.set(b.id, b.name + (b.name === 'Agent' || b.name === 'Task' ? (b.input && b.input.run_in_background ? ':bg' : ':fg') : ''));
      }
      if (o.type === 'user') { isStart = typeof c === 'string' || !(Array.isArray(c) && c.some(b => b && b.type === 'tool_result')); isWork = !isStart; }
      else isWork = true;
    }
    if (isStart) { closeTurn(); cur = { start: ts, end: ts, starter: starterOf(c), gaps: [], span: 0, adj: 0 }; turns.push(cur); prev = ts; pending.clear(); continue; }
    if (!isWork || !cur || isNaN(ts)) continue;
    // gap from previous working line; pending state as it stood before this line's own result is applied
    const g = ts - prev;
    if (g > 0 && !isNaN(prev)) { const pend = snap; let cause = 'idle'; if (o.type === 'user') { /* result arrives */ }
      if (pend.length) cause = pend.join('+'); 
      if (g > 300000) cur.gaps.push({ ms: g, cause, n: pend.length }); }
    if (o.type === 'user' && Array.isArray(c)) for (const b of c) if (b && b.type === 'tool_result') pending.delete(b.tool_use_id);
    if (ts > cur.end) cur.end = ts; prev = ts;
  }
  closeTurn();
  if (coord) out.sessions.push({ sid, turns });
}
const dir = path.join(ROOT, d);
for (const e of fs.readdirSync(dir, { withFileTypes: true })) if (e.isFile() && e.name.endsWith('.jsonl')) await doFile(path.join(dir, e.name), e.name.slice(0, -6));
fs.writeFileSync(path.join(HERE, 'out2', h(d) + '.json'), JSON.stringify(out)); console.log('done', d.slice(-25), out.sessions.length);
