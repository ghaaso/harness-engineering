// Read-only: how much of each window's tokens is due to its opening exploration
// (calls before the first non-lookup call) = what a single lookup at session start could at most replace.
// Uses the loose lookup classifier (any shell command without a write/run verb counts as lookup).
// Usage: node orient.cjs <storeDir>...
const fs = require('fs'), path = require('path'), readline = require('readline');
const stores = process.argv.slice(2);
function walk(d, acc) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p, acc); else if (e.name.endsWith('.jsonl')) acc.push(p); } return acc; }
const LOOKTOOLS = new Set(['Read', 'Grep', 'Glob', 'WebFetch', 'WebSearch', 'ToolSearch', 'LS', 'TaskOutput', 'Monitor']);
function isLookCmd(cmd) {
  const c = String(cmd).trim().replace(/^cd\s+("[^"]*"|'[^']*'|\S+)\s*(&&|;)\s*/, '');
  return !/\bsed\s+-i\b|\btee\b|(^|[^0-9&>])>\s*[^&\s]|\bmkdir\b|\brm\b|\bmv\b|\bcp\b|\bnpm\b|\bnpx\b|\bpytest\b|\bnode\b|\bpython\b|\bdocker\b|\bgit\s+(commit|push|merge|checkout|add|rebase|reset|worktree|stash|cherry)/.test(c);
}
const agg = { main: { T: 0, open: 0, openCalls: 0, openCarry: 0, prefix: 0, n: 0 }, sub: { T: 0, open: 0, openCalls: 0, openCarry: 0, prefix: 0, n: 0 } };
async function one(f, role) {
  const rl = readline.createInterface({ input: fs.createReadStream(f), crlfDelay: Infinity });
  const calls = new Map(), order = [];
  for await (const line of rl) {
    if (line.startsWith('{"type":"api-request-blob"') || line.startsWith('{"type":"file-history')) continue;
    let o; try { o = JSON.parse(line); } catch { continue; }
    if (o.type === 'system' && o.subtype === 'compact_boundary') order.push({ compact: true });
    if (o.type === 'assistant' && o.message && o.message.id && o.message.model !== '<synthetic>') {
      const m = o.message, u = m.usage || {};
      let c = calls.get(m.id);
      if (!c) { c = { ctx: 0, tools: [] }; calls.set(m.id, c); order.push(c); }
      c.ctx = Math.max(c.ctx, (u.input_tokens || 0) + (u.cache_creation_input_tokens || 0) + (u.cache_read_input_tokens || 0));
      for (const b of (Array.isArray(m.content) ? m.content : [])) if (b.type === 'tool_use') c.tools.push({ n: b.name, cmd: b.input && b.input.command });
    }
  }
  // split into segments at compactions (each segment is a window that starts again)
  let seg = [];
  const segs = [];
  for (const c of order) { if (c.compact) { if (seg.length) segs.push(seg); seg = []; continue; } if (c.ctx > 0) seg.push(c); }
  if (seg.length) segs.push(seg);
  const A = role === 'main' ? agg.main : agg.sub;
  for (const s of segs) {
    const N = s.length; if (N < 3) continue;
    const T = s.reduce((a, c) => a + c.ctx, 0);
    let k = 0;
    while (k < N && s[k].tools.length && s[k].tools.every(t => LOOKTOOLS.has(t.n) || ((t.n === 'Bash' || t.n === 'PowerShell') && t.cmd && isLookCmd(t.cmd)))) k++;
    // opening run = calls 0..k-1; content it added = ctx[k] - ctx[0] (if k < N)
    const runTok = s.slice(0, k).reduce((a, c) => a + c.ctx, 0);
    const added = k > 0 && k < N ? Math.max(0, s[k].ctx - s[0].ctx) : 0;
    const carry = added * (N - k);
    A.T += T; A.open += runTok + carry; A.openCalls += runTok; A.openCarry += carry; A.prefix += s[0].ctx * N; A.n++;
  }
}
(async () => {
  for (const s of stores) {
    const mains = fs.readdirSync(s).filter(n => n.endsWith('.jsonl'));
    for (const mf of mains) {
      await one(path.join(s, mf), 'main');
      const sd = path.join(s, mf.replace(/\.jsonl$/, ''), 'subagents');
      if (fs.existsSync(sd)) for (const sf of walk(sd, [])) await one(sf, 'sub');
    }
  }
  for (const [k, A] of Object.entries(agg)) console.log(k, { windows: A.n, Tbn: (A.T / 1e9).toFixed(2), openingShare: (A.open / A.T).toFixed(3), openingCallsShare: (A.openCalls / A.T).toFixed(3), openingCarryShare: (A.openCarry / A.T).toFixed(3), startWindowShare: (A.prefix / A.T).toFixed(3) });
  const T = agg.main.T + agg.sub.T; console.log('all', { openingShare: ((agg.main.open + agg.sub.open) / T).toFixed(3), startWindowShare: ((agg.main.prefix + agg.sub.prefix) / T).toFixed(3) });
})();
