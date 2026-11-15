// parse.cjs — one pass over every Claude Code transcript of a repo group.
// Emits calls.jsonl (one row per API call = distinct assistant message id) and sessions.json.
// Usage: node parse.cjs <group> <outDir> <storeDir>...
const fs = require('fs'), path = require('path'), readline = require('readline');
const [group, outDir, ...stores] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const callsOut = fs.createWriteStream(path.join(outDir, `${group}.calls.jsonl`));
const sessions = [];
const strCh = (c) => {
  if (c == null) return 0;
  if (typeof c === 'string') return c.length;
  if (Array.isArray(c)) return c.reduce((a, b) => a + (b.type === 'text' ? (b.text || '').length : b.type === 'image' ? 1500 : JSON.stringify(b).length), 0);
  return JSON.stringify(c).length;
};
function walk(dir, acc) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc); else if (e.name.endsWith('.jsonl')) acc.push(p);
  }
  return acc;
}
async function parseFile(f, sess, role, meta) {
  const byId = new Map(), order = [], toolOwner = new Map();
  let costState = null, shape = null, shapes = new Set(), compactions = 0, prompts = 0, promptCh = 0, firstPrompt = '', apiErrors = 0, firstTs = '', lastTs = '', cwd = '';
  let lastCall = null, version = '';
  const rl = readline.createInterface({ input: fs.createReadStream(f), crlfDelay: Infinity });
  for await (const line of rl) {
    if (line.startsWith('{"type":"api-request-blob"') || line.startsWith('{"type":"file-history')) continue;
    let o; try { o = JSON.parse(line); } catch { continue; }
    if (o.timestamp) { if (!firstTs) firstTs = o.timestamp; lastTs = o.timestamp; }
    if (o.cwd && !cwd) cwd = o.cwd;
    if (o.type === 'cost-state') { costState = o; continue; }
    if (o.type === 'api-request') { if (o.version) version = o.version; continue; }
    if (o.type === 'api-request-shape') {
      shapes.add(o.shapeHash);
      if (!shape && o.shape) {
        const sys = Array.isArray(o.shape.system) ? o.shape.system.reduce((a, b) => a + (b.text || '').length, 0) : strCh(o.shape.system);
        const tools = o.shape.tools ? JSON.stringify(o.shape.tools).length : 0;
        shape = { systemCh: sys, toolsCh: tools, nTools: Array.isArray(o.shape.tools) ? o.shape.tools.length : 0, model: o.shape.model || (o.params && o.params.model) || '' };
      }
      continue;
    }
    if (o.type === 'system') { if (o.subtype === 'compact_boundary') { compactions++; if (lastCall) lastCall.compactAfter = true; } if (o.subtype === 'api_error') apiErrors++; continue; }
    if (o.type === 'assistant' && o.message) {
      const m = o.message, u = m.usage;
      if (!m.id || !u || m.model === '<synthetic>') continue;
      if (u.totalTokens !== undefined && u.input_tokens === undefined) continue;
      let c = byId.get(m.id);
      if (!c) {
        c = { id: m.id, ts: o.timestamp || '', model: m.model || '', in: 0, cc: 0, cr: 0, out: 0, th: 0, cc5m: 0, cc1h: 0, textCh: 0, thinkCh: 0, tools: [], stop: null };
        byId.set(m.id, c); order.push(c);
      }
      lastCall = c;
      c.in = Math.max(c.in, u.input_tokens || 0); c.cc = Math.max(c.cc, u.cache_creation_input_tokens || 0);
      c.cr = Math.max(c.cr, u.cache_read_input_tokens || 0); c.out = Math.max(c.out, u.output_tokens || 0);
      if (u.output_tokens_details && u.output_tokens_details.thinking_tokens) c.th = Math.max(c.th, u.output_tokens_details.thinking_tokens);
      if (u.cache_creation) { c.cc5m = Math.max(c.cc5m, u.cache_creation.ephemeral_5m_input_tokens || 0); c.cc1h = Math.max(c.cc1h, u.cache_creation.ephemeral_1h_input_tokens || 0); }
      if (u.server_tool_use) c.srv = u.server_tool_use;
      if (m.stop_reason) c.stop = m.stop_reason;
      for (const b of (Array.isArray(m.content) ? m.content : [])) {
        if (b.type === 'thinking') c.thinkCh += (b.thinking || '').length;
        else if (b.type === 'text') c.textCh += (b.text || '').length;
        else if (b.type === 'tool_use') {
          if (c.tools.some(t => t.id === b.id)) continue;
          const t = { id: b.id, n: b.name, ic: JSON.stringify(b.input || {}).length, rc: 0, err: false };
          if (b.name === 'Agent' && b.input) { t.am = b.input.model || ''; t.at = b.input.subagent_type || ''; }
          if ((b.name === 'Bash' || b.name === 'PowerShell') && b.input && b.input.command) t.cmd = String(b.input.command).slice(0, 160);
          if ((b.name === 'Read') && b.input) t.fp = b.input.file_path || '';
          c.tools.push(t); toolOwner.set(b.id, t);
        }
      }
      continue;
    }
    if (o.type === 'user' && o.message) {
      const content = o.message.content;
      if (o.isCompactSummary) { if (lastCall) lastCall.summaryCh = strCh(content); continue; }
      if (typeof content === 'string') { prompts++; promptCh += content.length; if (!firstPrompt) firstPrompt = content.slice(0, 400); continue; }
      if (!Array.isArray(content)) continue;
      for (const b of content) {
        if (b.type === 'tool_result') {
          const t = toolOwner.get(b.tool_use_id);
          const ch = strCh(b.content);
          if (t) { t.rc += ch; if (b.is_error) t.err = true; if (t.n === 'Agent' && o.toolUseResult && o.toolUseResult.usage) t.au = o.toolUseResult.usage; }
          else if (lastCall) lastCall.orphanRc = (lastCall.orphanRc || 0) + ch;
        } else if (b.type === 'text') {
          if (o.origin && o.origin.kind === 'human' || (o.userType === 'external' && !/^<system-reminder>|^<task-notification>|^<side-sessions|^<ci-monitor|^\[Request interrupted/.test(b.text || ''))) {
            // human-authored text block (desktop app sends prompts as text blocks too)
            if (!/^<system-reminder>/.test(b.text || '')) { prompts++; promptCh += (b.text || '').length; if (!firstPrompt) firstPrompt = (b.text || '').slice(0, 400); }
          } else if (lastCall) lastCall.injectedCh = (lastCall.injectedCh || 0) + (b.text || '').length;
        } else if (b.type === 'image') { if (lastCall) lastCall.injectedCh = (lastCall.injectedCh || 0) + 1500; }
      }
    }
  }
  for (const c of order) {
    const ctx = c.in + c.cc + c.cr;
    if (ctx === 0 && c.out === 0) continue;
    callsOut.write(JSON.stringify({ g: group, sid: sess, role, at: meta ? meta.agentType : '', mm: meta ? meta.model : '', ...c, tools: c.tools.map(t => ({ n: t.n, ic: t.ic, rc: t.rc, err: t.err, am: t.am, at: t.at, au: t.au, cmd: t.cmd, fp: t.fp })) }) + '\n');
  }
  return { calls: order.length, costState: costState ? { usd: costState.totalCostUSD, modelUsage: costState.modelUsage, apiMs: costState.totalAPIDuration, toolMs: costState.totalToolDuration, linesAdded: costState.totalLinesAdded, linesRemoved: costState.totalLinesRemoved } : null, shape, nShapes: shapes.size, compactions, prompts, promptCh, firstPrompt, apiErrors, firstTs, lastTs, cwd, version };
}
(async () => {
  for (const store of stores) {
    const mains = fs.readdirSync(store).filter(n => n.endsWith('.jsonl'));
    for (const mf of mains) {
      const sid = mf.replace(/\.jsonl$/, '');
      const sdir = path.join(store, sid);
      let title = '';
      try { title = JSON.parse(fs.readFileSync(path.join(sdir, 'custom-title.json'), 'utf8')).customTitle || ''; } catch {}
      const main = await parseFile(path.join(store, mf), sid, 'main', null);
      const subs = [];
      if (fs.existsSync(path.join(sdir, 'subagents'))) {
        for (const sf of walk(path.join(sdir, 'subagents'), [])) {
          let meta = null; try { meta = JSON.parse(fs.readFileSync(sf.replace(/\.jsonl$/, '.meta.json'), 'utf8')); } catch {}
          const role = sf.includes(`${path.sep}workflows${path.sep}`) ? 'workflow' : 'agent';
          const r = await parseFile(sf, sid, role, meta);
          subs.push({ file: path.relative(sdir, sf), role, agentType: meta && meta.agentType, model: meta && meta.model, desc: meta && meta.description, calls: r.calls, compactions: r.compactions, apiErrors: r.apiErrors, firstTs: r.firstTs, lastTs: r.lastTs });
        }
      }
      sessions.push({ g: group, store: path.basename(store), sid, title, bytes: fs.statSync(path.join(store, mf)).size, ...main, subagents: subs });
      process.stderr.write(`${group} ${sid} calls=${main.calls} subs=${subs.length}\n`);
    }
  }
  fs.writeFileSync(path.join(outDir, `${group}.sessions.json`), JSON.stringify(sessions, null, 1));
  callsOut.end();
})();
