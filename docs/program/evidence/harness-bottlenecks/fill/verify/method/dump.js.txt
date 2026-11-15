// Extended parse: same rules as parse.js, plus raw fields for checks. Writes calls.json
const H = require('./fill.js');
const ATT_SKIP = new Set(['prompt_snapshot', 'deferred_tools_record']);
async function parse(f, isSub) {
  const calls = [], byId = {}, tools = {}; let cur = null; const stats = { sidechainSkipped: 0, synthetic: 0, ids: [] };
  const rl = H.readline.createInterface({ input: H.fs.createReadStream(f), crlfDelay: Infinity });
  let ln = 0;
  for await (const line of rl) {
    ln++;
    let o; try { o = JSON.parse(line); } catch { continue; }
    if (o.type !== 'assistant' && o.type !== 'user' && o.type !== 'attachment') continue;
    if (!isSub && o.isSidechain) { stats.sidechainSkipped++; continue; }
    if (o.type === 'assistant' && o.message && o.message.id && o.message.usage) {
      const m = o.message, u = m.usage;
      const ctx = (u.input_tokens || 0) + (u.cache_read_input_tokens || 0) + (u.cache_creation_input_tokens || 0);
      if (m.model === '<synthetic>' || ctx === 0) { stats.synthetic++; continue; }
      let c = byId[m.id];
      if (!c) { c = byId[m.id] = { id: m.id, model: m.model, ts: o.timestamp, ctx: 0, out: 0, cr: 0, cw: 0, inp: 0, nov: String(o.timestamp || '').startsWith('2026-11'), th: false, thc: 0, oc: {}, inc: [], edits: [], ln, lines: 0 }; calls.push(c); cur = c; }
      c.lines++;
      if (ctx > c.ctx) { c.ctx = ctx; c.cw = u.cache_creation_input_tokens || 0; c.inp = u.input_tokens || 0; }
      if ((u.output_tokens || 0) > c.out) c.out = u.output_tokens;
      if ((u.cache_read_input_tokens || 0) > c.cr) c.cr = u.cache_read_input_tokens;
      for (const b of (Array.isArray(m.content) ? m.content : [])) {
        if (b.type === 'thinking' || b.type === 'redacted_thinking') { c.th = true; c.thc += (b.thinking || '').length; }
        else if (b.type === 'text') c.oc['out-text'] = (c.oc['out-text'] || 0) + (b.text || '').length;
        else if (b.type === 'tool_use') {
          tools[b.id] = { name: b.name, input: b.input }; const k = H.useCat(b.name); c.oc[k] = (c.oc[k] || 0) + JSON.stringify(b.input || {}).length + 40;
          if (k === 'out-writes') c.edits.push({ name: b.name, fp: String((b.input || {}).file_path || (b.input || {}).notebook_path || '') });
        }
      }
    } else if (o.type === 'user' && o.message && cur) {
      const c = o.message.content;
      if (o.isCompactSummary) { cur.inc.push({ cat: 'summary', ch: typeof c === 'string' ? c.length : JSON.stringify(c).length }); continue; }
      if (typeof c === 'string') cur.inc.push({ cat: 'message-in', ch: c.length, pre: c.slice(0, 80) });
      else if (Array.isArray(c)) for (const b of c) {
        if (b.type === 'tool_result') {
          const tu = tools[b.tool_use_id]; const [cat, kind, extra, fp] = H.resultCat(tu);
          const it = { cat, kind, extra, fp, ch: H.resLen(b.content) + 20, tool: tu ? tu.name : '' };
          if (tu && (tu.name === 'Bash' || tu.name === 'PowerShell')) it.cmd = String(tu.input.command || '').slice(0, 600);
          if (tu && tu.name === 'Read') { it.rp = tu.input.file_path; it.off = tu.input.offset; it.lim = tu.input.limit; }
          if (b.is_error) it.err = 1;
          cur.inc.push(it);
        }
        else if (b.type === 'text') cur.inc.push({ cat: 'message-in', ch: (b.text || '').length, pre: (b.text || '').slice(0, 80) });
        else if (b.type === 'image') cur.inc.push({ cat: 'message-in', ch: 3000 });
      }
    } else if (o.type === 'attachment' && cur && o.attachment) {
      const t = o.attachment.type; if (ATT_SKIP.has(t)) continue;
      const cat = t === 'queued_command' ? 'message-in' : (t === 'file' || t === 'edited_text_file' || t === 'compact_file_reference') ? 'harness-file-snippet' : 'harness-note';
      cur.inc.push({ cat, ch: JSON.stringify(o.attachment).length, at: t });
    }
  }
  return { calls, stats };
}
(async () => {
  const out = [];
  for (const d of H.dirs) {
    const isWt = d.includes('worktrees');
    for (const f of H.walk(H.path.join(H.P, d), [])) {
      const rel = H.path.relative(H.path.join(H.P, d), f).split(H.path.sep).join('/');
      const isSub = rel.includes('/');
      const g = isSub ? 'subagents' : isWt ? 'slice-main' : 'root-main';
      const r = await parse(f, isSub);
      out.push({ f: d.replace('C--Bilal-Migration-User-Downloads-20-PROJECTS-24-Clinic-Workshop', '') + '/' + rel, g, stats: r.stats, calls: r.calls });
    }
  }
  H.fs.writeFileSync('calls.json', JSON.stringify(out));
  console.log('files', out.length, 'calls', out.reduce((s, x) => s + x.calls.length, 0));
})();
