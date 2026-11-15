// R1 refuter: independent extractor. Read-only over Claude Code transcripts.
// One JSON line per API call: window id, role, compaction segment, timestamp, context tokens,
// output tokens, and per tool use: name, read paths, grep pattern, shell command, result chars.
// Usage: node r1-extract.cjs <out.jsonl> <marker> <storeDir>...
const fs = require('fs'), path = require('path'), readline = require('readline');
const [outF, marker, ...stores] = process.argv.slice(2);
const out = fs.createWriteStream(outF);
const BS = String.fromCharCode(92);
function listJsonl(d, acc) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) listJsonl(p, acc); else if (e.name.endsWith('.jsonl')) acc.push(p);
  }
  return acc;
}
function normPath(p, cwd) {
  if (!p || typeof p !== 'string') return null;
  p = p.trim().replace(/^["']|["']$/g, '').split(BS).join('/');
  if (!/^[A-Za-z]:\//.test(p) && !p.startsWith('/')) p = (cwd || '').split(BS).join('/') + '/' + p.replace(/^\.\//, '');
  const low = p.toLowerCase();
  const i = low.indexOf(marker);
  if (i < 0) return null;
  let r = low.slice(i + marker.length);
  r = r.replace(/^\.claude\/worktrees\/[^/]+\//, '');
  return r.replace(/\/+/g, '/');
}
// Shell single-file reads: cat / sed -n / head / tail / nl / Get-Content / type. Returns raw path tokens.
function shellReadPaths(cmd) {
  const segs = String(cmd).split(/\s*(?:&&|;|\|\|)\s*/);
  const outp = [];
  for (let s of segs) {
    s = s.trim();
    const first = s.split('|')[0].trim();
    const m = first.match(/^(cat|sed\s+-n\s+(?:'[^']*'|"[^"]*"|\S+)|head(?:\s+-n?\s*\d+|\s+-\d+)?|tail(?:\s+-n?\s*\+?\d+|\s+-\d+)?|nl(?:\s+-ba)?|Get-Content|gc|type)\s+(.*)$/i);
    if (!m) continue;
    const rest = m[2];
    const toks = rest.match(/"[^"]+"|'[^']+'|\S+/g) || [];
    for (let t of toks) {
      t = t.replace(/^["']|["']$/g, '');
      if (t.startsWith('-') || t.startsWith('>') || t === '2>/dev/null') continue;
      if (/[*?]/.test(t)) continue;
      if (/\.[A-Za-z0-9]{1,6}$/.test(t) || /\//.test(t)) outp.push(t);
    }
  }
  return outp;
}
async function one(file, win, role, store) {
  const rl = readline.createInterface({ input: fs.createReadStream(file), crlfDelay: Infinity });
  const calls = new Map(); const order = []; const byTool = new Map();
  let cwd = ''; let seg = 0;
  for await (const line of rl) {
    if (line.startsWith('{"type":"api-request-blob"') || line.startsWith('{"type":"file-history')) continue;
    let o; try { o = JSON.parse(line); } catch { continue; }
    if (o.cwd) cwd = o.cwd;
    if (o.type === 'system' && o.subtype === 'compact_boundary') { seg++; continue; }
    const ts = o.timestamp ? Date.parse(o.timestamp) : null;
    if (o.type === 'assistant' && o.message && o.message.id && o.message.model !== '<synthetic>') {
      const m = o.message, u = m.usage || {};
      let c = calls.get(m.id);
      if (!c) { c = { win, role, store, seg, ts, ctx: 0, out: 0, model: m.model, tools: [] }; calls.set(m.id, c); order.push(c); }
      c.ctx = Math.max(c.ctx, (u.input_tokens || 0) + (u.cache_creation_input_tokens || 0) + (u.cache_read_input_tokens || 0));
      c.out = Math.max(c.out, u.output_tokens || 0);
      for (const b of (Array.isArray(m.content) ? m.content : [])) {
        if (b.type !== 'tool_use') continue;
        const inp = b.input || {};
        const t = { n: b.name, rp: [], ch: 0 };
        if (b.name === 'Read') { const q = normPath(inp.file_path, cwd); if (q) t.rp.push(q); t.off = inp.offset || 0; t.lim = inp.limit || 0; }
        else if (b.name === 'Grep') { t.pat = String(inp.pattern || '').slice(0, 200); t.gp = normPath(inp.path || cwd, cwd) || ''; t.glob = inp.glob || inp.type || ''; }
        else if (b.name === 'Glob') { t.pat = String(inp.pattern || '').slice(0, 200); t.gp = normPath(inp.path || cwd, cwd) || ''; }
        else if (b.name === 'Bash' || b.name === 'PowerShell') {
          t.cmd = String(inp.command || '').slice(0, 1500);
          for (const p of shellReadPaths(inp.command || '')) { const q = normPath(p, cwd); if (q) t.rp.push(q); }
        } else if (b.name === 'Agent' || b.name === 'Task') { t.prompt = String(inp.prompt || '').slice(0, 400); }
        c.tools.push(t); byTool.set(b.id, t);
      }
      continue;
    }
    if (o.type === 'user' && o.message && Array.isArray(o.message.content)) {
      for (const b of o.message.content) {
        if (b.type !== 'tool_result') continue;
        const t = byTool.get(b.tool_use_id); if (!t) continue;
        const cc = b.content;
        if (typeof cc === 'string') t.ch += cc.length; else if (Array.isArray(cc)) for (const x of cc) if (x && x.text) t.ch += x.text.length;
      }
    }
  }
  for (const c of order) { if (c.ctx === 0 && c.out === 0) continue; out.write(JSON.stringify(c) + '\n'); }
}
(async () => {
  for (const s of stores) {
    const mains = fs.readdirSync(s).filter(n => n.endsWith('.jsonl'));
    for (const mf of mains) {
      const sid = mf.replace(/\.jsonl$/, '');
      await one(path.join(s, mf), sid, 'main', path.basename(s).slice(-12));
      const sd = path.join(s, sid, 'subagents');
      if (fs.existsSync(sd)) for (const sf of listJsonl(sd, [])) await one(sf, sid + '/' + path.basename(sf, '.jsonl'), 'sub', path.basename(s).slice(-12));
    }
    process.stderr.write('done ' + path.basename(s) + '\n');
  }
  out.end();
})();
