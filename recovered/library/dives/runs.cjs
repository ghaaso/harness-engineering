// Read-only: per window, classify each API call as lookup-only or not, then measure
// runs of consecutive lookup-only calls (what one library answer could at most replace).
// Usage: node runs.cjs <out.json> <storeDir>...
const fs = require('fs'), path = require('path'), readline = require('readline');
const [outF, ...stores] = process.argv.slice(2);
function walk(d, acc) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p, acc); else if (e.name.endsWith('.jsonl')) acc.push(p); } return acc; }
const LOOKTOOLS = new Set(['Read', 'Grep', 'Glob', 'WebFetch', 'WebSearch', 'ToolSearch', 'LS']);
const READVERB = /^(cat|sed\s+-n|head|tail|nl|grep|rg|egrep|ls|find|wc|git\s+(log|show|diff|status|blame|ls-files|grep|rev-parse|branch)|awk|sort|uniq|echo|pwd|stat|file|tree|type|jq|du|Get-Content|Select-String|Get-ChildItem|Test-Path)\b/;
function isLookCmd(cmd) {
  let c = String(cmd).trim().replace(/^cd\s+("[^"]*"|'[^']*'|\S+)\s*(&&|;)\s*/, '');
  if (/\bsed\s+-i\b|\btee\b|(^|[^0-9&>])>\s*[^&\s]|\bmkdir\b|\brm\b|\bmv\b|\bcp\b|\bnpm\b|\bnpx\b|\bpytest\b|\bnode\b|\bpython\b|\bdocker\b|\bgit\s+(commit|push|merge|checkout|add|rebase|reset|worktree|stash|cherry)/.test(c)) return false;
  const parts = c.split(/\s*(?:&&|\|\||;|\|)\s*/).filter(Boolean);
  return parts.length > 0 && parts.every(p => READVERB.test(p.trim()) || /^for\b|^do\b|^done\b|^xargs\b|^2>\/dev\/null/.test(p.trim()));
}
const runsAll = []; let nCalls = 0, nLook = 0, tokAll = 0, tokLook = 0, latLook = 0, latOther = 0, outLook = 0, outOther = 0, nLatLook = 0, nLatOther = 0;
async function one(f, role) {
  const rl = readline.createInterface({ input: fs.createReadStream(f), crlfDelay: Infinity });
  const calls = new Map(), order = []; let prevTs = null;
  for await (const line of rl) {
    if (line.startsWith('{"type":"api-request-blob"') || line.startsWith('{"type":"file-history')) continue;
    let o; try { o = JSON.parse(line); } catch { continue; }
    const ts = o.timestamp ? Date.parse(o.timestamp) : null;
    if (o.type === 'assistant' && o.message && o.message.id && o.message.model !== '<synthetic>') {
      const m = o.message, u = m.usage || {};
      let c = calls.get(m.id);
      if (!c) { c = { req: prevTs, last: ts, ctx: 0, out: 0, tools: [] }; calls.set(m.id, c); order.push(c); }
      c.last = Math.max(c.last || 0, ts || 0);
      c.ctx = Math.max(c.ctx, (u.input_tokens || 0) + (u.cache_creation_input_tokens || 0) + (u.cache_read_input_tokens || 0));
      c.out = Math.max(c.out, u.output_tokens || 0);
      for (const b of (Array.isArray(m.content) ? m.content : [])) if (b.type === 'tool_use') c.tools.push({ n: b.name, cmd: b.input && b.input.command });
      continue;
    }
    if (o.type === 'user' || o.type === 'system') prevTs = ts;
  }
  let run = null; let pos = 0; const N = order.length;
  for (const c of order) {
    if (c.ctx === 0 && c.out === 0) continue;
    pos++;
    nCalls++; tokAll += c.ctx;
    const look = c.tools.length > 0 && c.tools.every(t => LOOKTOOLS.has(t.n) || ((t.n === 'Bash' || t.n === 'PowerShell') && t.cmd && isLookCmd(t.cmd)));
    const lat = c.req && c.last ? (c.last - c.req) / 1000 : null;
    const latOk = lat != null && lat > 0 && lat < 900;
    if (look) { nLook++; tokLook += c.ctx; outLook += c.out; if (latOk) { latLook += lat; nLatLook++; }
      if (!run) run = { m: 0, tok: 0, out: 0, lat: 0, start: pos / N, role };
      run.m++; run.tok += c.ctx; run.out += c.out; if (latOk) run.lat += lat;
    } else { outOther += c.out; if (latOk) { latOther += lat; nLatOther++; } if (run) { runsAll.push(run); run = null; } }
  }
  if (run) runsAll.push(run);
}
(async () => {
  for (const s of stores) {
    const mains = fs.readdirSync(s).filter(n => n.endsWith('.jsonl'));
    for (const mf of mains) {
      await one(path.join(s, mf), 'main');
      const sd = path.join(s, mf.replace(/\.jsonl$/, ''), 'subagents');
      if (fs.existsSync(sd)) for (const sf of walk(sd, [])) await one(sf, sf.includes(path.sep + 'workflows' + path.sep) ? 'workflow' : 'agent');
    }
  }
  // summarise
  const byLen = {}; for (const r of runsAll) { const k = r.m >= 10 ? '10+' : String(r.m); byLen[k] = byLen[k] || { runs: 0, tok: 0 }; byLen[k].runs++; byLen[k].tok += r.tok; }
  const tokW = runsAll.reduce((a, r) => a + r.tok * r.m, 0) / tokLook; // token-weighted mean run length
  const res = { calls: nCalls, lookCalls: nLook, lookCallShare: nLook / nCalls, lookTokShare: tokLook / tokAll, runs: runsAll.length,
    meanRunLen: nLook / runsAll.length, tokenWeightedRunLen: tokW,
    byLenTokShareOfLookTokens: Object.fromEntries(Object.entries(byLen).map(([k, v]) => [k, { runs: v.runs, tokShare: +(v.tok / tokLook).toFixed(3) }])),
    meanLatLook: latLook / nLatLook, meanLatOther: latOther / nLatOther, latShareLook: latLook / (latLook + latOther),
    outShareLook: outLook / (outLook + outOther), meanOutLook: outLook / nLook, meanOutOther: outOther / (nCalls - nLook) };
  fs.writeFileSync(outF, JSON.stringify(res, null, 1));
  console.log(JSON.stringify(res, null, 1));
})();
