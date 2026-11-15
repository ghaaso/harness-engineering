// Parse one transcript into real calls with their output and the content that arrived after each.
const H = require('./fill.js');
const ATT_SKIP = new Set(['prompt_snapshot', 'deferred_tools_record']);
module.exports = async function parse(f, isSub) {
  const calls = [], byId = {}, tools = {}; let cur = null;
  const rl = H.readline.createInterface({ input: H.fs.createReadStream(f), crlfDelay: Infinity });
  for await (const line of rl) {
    const head = line.slice(0, 400);
    if (head.indexOf('"type":"assistant"') < 0 && head.indexOf('"type":"user"') < 0 && head.indexOf('"type":"attachment"') < 0 && line.indexOf('"type":"assistant"') < 0 && line.indexOf('"type":"user"') < 0 && line.indexOf('"type":"attachment"') < 0) continue;
    let o; try { o = JSON.parse(line); } catch { continue; }
    if (!isSub && o.isSidechain) continue;
    if (o.type === 'assistant' && o.message && o.message.id && o.message.usage) {
      const m = o.message, u = m.usage;
      const ctx = (u.input_tokens || 0) + (u.cache_read_input_tokens || 0) + (u.cache_creation_input_tokens || 0);
      if (m.model === '<synthetic>' || ctx === 0) continue;
      let c = byId[m.id];
      if (!c) { c = byId[m.id] = { ctx: 0, out: 0, cr: 0, nov: true /* ALL-TIME edit: was startsWith('2026-11') */, th: false, oc: {}, inc: [] }; calls.push(c); cur = c; }
      if (ctx > c.ctx) c.ctx = ctx; if ((u.output_tokens || 0) > c.out) c.out = u.output_tokens;
      if ((u.cache_read_input_tokens || 0) > c.cr) c.cr = u.cache_read_input_tokens;
      for (const b of (Array.isArray(m.content) ? m.content : [])) {
        if (b.type === 'thinking' || b.type === 'redacted_thinking') c.th = true;
        else if (b.type === 'text') c.oc['out-text'] = (c.oc['out-text'] || 0) + (b.text || '').length;
        else if (b.type === 'tool_use') { tools[b.id] = { name: b.name, input: b.input }; const k = H.useCat(b.name); c.oc[k] = (c.oc[k] || 0) + JSON.stringify(b.input || {}).length + 40; }
      }
    } else if (o.type === 'user' && o.message && cur) {
      const c = o.message.content;
      if (o.isCompactSummary) { cur.inc.push({ cat: 'summary', ch: typeof c === 'string' ? c.length : JSON.stringify(c).length }); continue; }
      if (typeof c === 'string') cur.inc.push({ cat: 'message-in', ch: c.length });
      else if (Array.isArray(c)) for (const b of c) {
        if (b.type === 'tool_result') { const [cat, kind, extra, fp] = H.resultCat(tools[b.tool_use_id]); cur.inc.push({ cat, kind, extra, fp, ch: H.resLen(b.content) + 20 }); }
        else if (b.type === 'text') cur.inc.push({ cat: 'message-in', ch: (b.text || '').length });
        else if (b.type === 'image') cur.inc.push({ cat: 'message-in', ch: 3000 });
      }
    } else if (o.type === 'attachment' && cur && o.attachment) {
      const t = o.attachment.type; if (ATT_SKIP.has(t)) continue;
      const cat = t === 'queued_command' ? 'message-in' : (t === 'file' || t === 'edited_text_file' || t === 'compact_file_reference') ? 'harness-file-snippet' : 'harness-note';
      cur.inc.push({ cat, ch: JSON.stringify(o.attachment).length });
    }
  }
  return calls;
};
