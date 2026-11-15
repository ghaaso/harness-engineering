// R5 refuter, read-only. Independent extraction of per-call timing from Claude Code transcripts.
// Differences from the first-round timing.cjs:
//  - call start = the transcript's own "api-request" entry (request send time), not the last user entry;
//  - tool intervals are tracked per tool_use id (block ts -> matching tool_result ts), so overlap
//    between tool execution and model streaming is visible;
//  - per transcript, active time = union of model and tool intervals; model time = union of model intervals.
// Usage: node r5-extract.cjs <out.jsonl> <group> <storeDir>...
const fs = require('fs'), path = require('path'), readline = require('readline');
const [outF, group, ...stores] = process.argv.slice(2);
const out = fs.createWriteStream(outF);
function walk(d, acc) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p, acc); else if (e.name.endsWith('.jsonl')) acc.push(p); } return acc; }
function union(iv) { // total length of union of [a,b] intervals
  const s = iv.filter(x => x[1] > x[0]).sort((x, y) => x[0] - y[0]); let tot = 0, ca = null, cb = null;
  for (const [a, b] of s) { if (cb == null || a > cb) { if (cb != null) tot += cb - ca; ca = a; cb = b; } else if (b > cb) cb = b; }
  if (cb != null) tot += cb - ca; return tot;
}
function subtractLen(iv, cover) { // length of iv-union minus overlap with cover-union, attributed per interval label
  return null;
}
const SUBAGENT_TOOLS = new Set(['Agent', 'Task', 'Workflow']);
async function one(f, role, store) {
  const rl = readline.createInterface({ input: fs.createReadStream(f), crlfDelay: Infinity });
  let lastReq = null, lastUserTs = null; const calls = new Map(), order = []; const toolStart = new Map(); const toolIv = [];
  for await (const line of rl) {
    if (line.startsWith('{"type":"api-request-blob"') || line.startsWith('{"type":"file-history')) continue;
    let o; try { o = JSON.parse(line); } catch { continue; }
    const ts = o.timestamp ? Date.parse(o.timestamp) : null;
    if (o.type === 'api-request' && ts) { lastReq = ts; continue; }
    if (o.type === 'assistant' && o.message && o.message.id && ts) {
      const m = o.message; if (m.model === '<synthetic>') continue; const u = m.usage || {};
      let c = calls.get(m.id);
      if (!c) { c = { id: m.id, model: m.model, start: lastReq != null ? lastReq : lastUserTs, startSrc: lastReq != null ? 'req' : 'user', first: ts, last: ts, ctx: 0, cw: 0, out: 0, tools: [] }; calls.set(m.id, c); order.push(c); lastReq = null; }
      c.last = Math.max(c.last, ts);
      c.ctx = Math.max(c.ctx, (u.input_tokens || 0) + (u.cache_creation_input_tokens || 0) + (u.cache_read_input_tokens || 0));
      c.cw = Math.max(c.cw, (u.cache_creation_input_tokens || 0) + (u.input_tokens || 0));
      c.out = Math.max(c.out, u.output_tokens || 0);
      for (const b of (Array.isArray(m.content) ? m.content : [])) if (b.type === 'tool_use') {
        let cmd = b.input && (b.input.command || b.input.cmd); c.tools.push({ n: b.name, cmd: cmd ? String(cmd).slice(0, 400) : null });
        toolStart.set(b.id, { ts, name: b.name, cmd: cmd ? String(cmd).slice(0, 200) : null });
      }
      continue;
    }
    if (o.type === 'user' && o.message && ts) {
      lastUserTs = ts; const ct = o.message.content;
      if (Array.isArray(ct)) for (const b of ct) if (b.type === 'tool_result' && toolStart.has(b.tool_use_id)) {
        const s = toolStart.get(b.tool_use_id); toolIv.push({ a: s.ts, b: ts, name: s.name, cmd: s.cmd }); toolStart.delete(b.tool_use_id);
      }
    }
  }
  const modelIv = [];
  for (const c of order) {
    if (c.ctx === 0 && c.out === 0) continue;
    const lat = c.start != null ? (c.last - c.start) / 1000 : null;
    if (lat != null && lat > 0 && lat < 900) modelIv.push([c.start, c.last]);
    out.write(JSON.stringify({ k: 'call', group, store: path.basename(store), role, f: path.basename(f), model: c.model, ctx: c.ctx, cw: c.cw, out: c.out, lat, startSrc: c.startSrc, ttfb: c.start != null ? (c.first - c.start) / 1000 : null, tools: c.tools }) + '\n');
  }
  // time partition for this transcript
  const tIv = toolIv.filter(t => t.b > t.a && (t.b - t.a) < 3600e3);
  const subIv = tIv.filter(t => SUBAGENT_TOOLS.has(t.name)).map(t => [t.a, t.b]);
  const nonSub = tIv.filter(t => !SUBAGENT_TOOLS.has(t.name));
  const mU = union(modelIv);
  const activeNoSub = union(modelIv.concat(nonSub.map(t => [t.a, t.b])));
  const activeAll = union(modelIv.concat(tIv.map(t => [t.a, t.b])));
  // tool-only time by tool kind: sweep at 1 s resolution would be heavy; approximate by assigning each tool interval's
  // part not covered by model intervals.
  const mSorted = modelIv.slice().sort((x, y) => x[0] - y[0]);
  function uncovered(a, b) { let len = b - a; for (const [x, y] of mSorted) { if (y <= a) continue; if (x >= b) break; len -= Math.min(b, y) - Math.max(a, x); } return Math.max(0, len); }
  const byTool = {};
  // to avoid double counting parallel tools, assign uncovered time of overlapping tools proportionally: simple approach,
  // compute union of non-model tool time per name group then scale to total.
  for (const t of nonSub) { const k = t.name === 'Bash' || t.name === 'PowerShell' ? (classifyCmd(t.cmd)) : t.name; byTool[k] = (byTool[k] || 0) + uncovered(t.a, t.b); }
  out.write(JSON.stringify({ k: 'win', group, store: path.basename(store), role, f: path.basename(f), modelS: mU / 1000, activeNoSubS: activeNoSub / 1000, activeAllS: activeAll / 1000, subWaitS: union(subIv) / 1000, toolUncoveredByKindS: Object.fromEntries(Object.entries(byTool).map(([k, v]) => [k, v / 1000])) }) + '\n');
}
function classifyCmd(cmd) {
  const c = String(cmd || '');
  if (/\b(pytest|npm\s+(run\s+)?test|vitest|jest|npm\s+run\s+(lint|build|typecheck|check)|tsc\b|ruff|mypy|lint-imports|alembic|manage\.py\s+test|docker|make\s+check|pnpm|yarn)\b/.test(c)) return 'Bash:check/test/build';
  if (/\bgit\s+(push|fetch|pull|clone|merge|rebase|commit|worktree)\b|\bgh\s/.test(c)) return 'Bash:git-write/gh';
  if (/\b(sleep|timeout|wait)\b/.test(c)) return 'Bash:wait/sleep';
  return 'Bash:other';
}
(async () => {
  for (const s of stores) {
    const mains = fs.readdirSync(s).filter(n => n.endsWith('.jsonl'));
    for (const mf of mains) {
      await one(path.join(s, mf), 'main', s);
      const sd = path.join(s, mf.replace(/\.jsonl$/, ''), 'subagents');
      if (fs.existsSync(sd)) for (const sf of walk(sd, [])) await one(sf, sf.includes(path.sep + 'workflows' + path.sep) ? 'workflow' : 'agent', s);
    }
    process.stderr.write('done ' + path.basename(s) + '\n');
  }
  out.end();
})();
