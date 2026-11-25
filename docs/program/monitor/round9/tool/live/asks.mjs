// Round 9, the live feed: does a session's last turn end by asking the owner something? Read from the end of its transcript.
// A session waits for him only when its last closing report (wrap_up) carries an `ask` or `blocked: true`, or a question
// tool call (AskUserQuestion) has no answer yet. A closing report with no question is finished, not waiting.
// Node built-ins only; reads, never writes. Used by server.mjs, which passes the result to convert.mjs as opts.asks.
import { openSync, readSync, closeSync, statSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const TAIL = 2e6;                                                   // bytes read from the end of a transcript
const cache = new Map();                                            // file -> { size, res }
const dirs = new Map();                                             // folder -> { at, names }
const QTOOL = /(^|_)AskUserQuestion$|ask_user_question$/i;

// one transcript -> { wrapT, ask, blocked, askText, question: {t, text} | null } ; all null/false when nothing is found
export function lastAsk(file) {
  let size; try { size = statSync(file).size; } catch { return null; }
  const c = cache.get(file); if (c && c.size === size) return c.res;
  const from = Math.max(0, size - TAIL), buf = Buffer.alloc(size - from); let fd;
  try { fd = openSync(file, 'r'); readSync(fd, buf, 0, buf.length, from); } catch { return null; } finally { if (fd !== undefined) closeSync(fd); }
  const lines = buf.toString('utf8').split('\n'); if (from > 0) lines.shift();
  const res = { wrapT: 0, ask: false, blocked: false, askText: '', question: null };
  const openQ = new Map();
  for (const l of lines) {
    if (!l) continue; let o; try { o = JSON.parse(l); } catch { continue; }
    const t = o.timestamp ? Date.parse(o.timestamp) : 0, content = o.message && Array.isArray(o.message.content) ? o.message.content : [];
    if (o.type === 'assistant') for (const x of content) if (x.type === 'tool_use') {
      const i = x.input || {};
      if (/wrap_up$/.test(x.name) && i.recap) { res.wrapT = t; res.ask = !!i.ask; res.blocked = i.blocked === true; res.askText = typeof i.ask === 'string' ? i.ask : ''; }
      if (QTOOL.test(x.name)) { const q = (i.questions && i.questions[0] && i.questions[0].question) || i.question || ''; openQ.set(x.id, { t, text: String(q).slice(0, 300) }); }
    }
    if (o.type === 'user') {
      for (const x of content) if (x.type === 'tool_result') openQ.delete(x.tool_use_id);
      if (o.turnOrigin === 'human') { openQ.clear(); res.wrapT = 0; res.ask = false; res.blocked = false; res.askText = ''; }   // he wrote: nothing is open
    }
  }
  const qs = [...openQ.values()]; res.question = qs.length ? qs[qs.length - 1] : null;
  cache.set(file, { size, res });
  return res;
}

// the read step's sessions -> { id: lastAsk(...) }. store: ~/.claude/projects ; a session's file is <folder>/<id...>.jsonl
export function readAsks(snapSessions, store, sinceMs = 0) {
  const out = {};
  for (const s of snapSessions) {
    if ((s.t1 || 0) < sinceMs || !s.folder) continue;
    let d = dirs.get(s.folder);
    if (!d || Date.now() - d.at > 60e3) { let names = []; try { names = readdirSync(join(store, s.folder)).filter(f => f.endsWith('.jsonl')); } catch {} d = { at: Date.now(), names }; dirs.set(s.folder, d); }
    const f = d.names.find(n => n.startsWith(s.id)); if (!f) continue;
    const r = lastAsk(join(store, s.folder, f)); if (r) out[s.id] = r;
  }
  return out;
}
