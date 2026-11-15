// D6, read-only. Per transcript window: where do lookup-only calls fall relative to the
// first moment an instance-level key exists (first edit; first tool error)?
// Usage: node d6-keytiming.cjs <label> <storeDir>...
// Lookup-only rule copied from runs.cjs (same dives folder) so the numbers line up.
const fs = require('fs'), path = require('path'), readline = require('readline');
const [label, ...stores] = process.argv.slice(2);
function walk(d, acc) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p, acc); else if (e.name.endsWith('.jsonl')) acc.push(p); } return acc; }
const LOOKTOOLS = new Set(['Read', 'Grep', 'Glob', 'WebFetch', 'WebSearch', 'ToolSearch', 'LS'].concat(process.env.LOOSE ? ['TaskOutput', 'Monitor'] : []));
const EDITTOOLS = new Set(['Edit', 'Write', 'MultiEdit', 'NotebookEdit']);
const READVERB = /^(cat|sed\s+-n|head|tail|nl|grep|rg|egrep|ls|find|wc|git\s+(log|show|diff|status|blame|ls-files|grep|rev-parse|branch)|awk|sort|uniq|echo|pwd|stat|file|tree|type|jq|du|Get-Content|Select-String|Get-ChildItem|Test-Path)\b/;
function isLookCmd(cmd) {
  let c = String(cmd).trim().replace(/^cd\s+("[^"]*"|'[^']*'|\S+)\s*(&&|;)\s*/, '');
  if (/\bsed\s+-i\b|\btee\b|(^|[^0-9&>])>\s*[^&\s]|\bmkdir\b|\brm\b|\bmv\b|\bcp\b|\bnpm\b|\bnpx\b|\bpytest\b|\bnode\b|\bpython\b|\bdocker\b|\bgit\s+(commit|push|merge|checkout|add|rebase|reset|worktree|stash|cherry)/.test(c)) return false;
  if (process.env.LOOSE) return true;
  const parts = c.split(/\s*(?:&&|\|\||;|\|)\s*/).filter(Boolean);
  return parts.length > 0 && parts.every(p => READVERB.test(p.trim()) || /^for\b|^do\b|^done\b|^xargs\b|^2>\/dev\/null/.test(p.trim()));
}
function isEditCmd(cmd) { return /\bsed\s+-i\b|\btee\b|cat\s*>|(^|[^0-9&>])>\s*(?!\/dev\/null)[^&\s]|Set-Content|Out-File/.test(String(cmd)); }
const agg = { windows: 0, withEdit: 0, withErr: 0, calls: 0, look: 0, lookTok: 0, allTok: 0,
  lookTokBeforeEdit: 0, lookTokNoEditWin: 0, lookTokBeforeErr: 0, lookTokNoErrWin: 0,
  allTokBeforeEdit: 0, firstEditFrac: [], ctxAtFirstEdit: [], ctxAtStart: [] };
async function one(f) {
  const rl = readline.createInterface({ input: fs.createReadStream(f), crlfDelay: Infinity });
  const calls = new Map(), order = []; const errIds = new Set(); const idToCall = new Map();
  for await (const line of rl) {
    if (line.startsWith('{"type":"api-request-blob"') || line.startsWith('{"type":"file-history')) continue;
    let o; try { o = JSON.parse(line); } catch { continue; }
    if (o.type === 'assistant' && o.message && o.message.id && o.message.model !== '<synthetic>') {
      const m = o.message, u = m.usage || {};
      let c = calls.get(m.id);
      if (!c) { c = { ctx: 0, tools: [], err: false }; calls.set(m.id, c); order.push(c); }
      c.ctx = Math.max(c.ctx, (u.input_tokens || 0) + (u.cache_creation_input_tokens || 0) + (u.cache_read_input_tokens || 0));
      for (const b of (Array.isArray(m.content) ? m.content : [])) if (b.type === 'tool_use') { c.tools.push({ n: b.name, cmd: b.input && b.input.command }); idToCall.set(b.id, c); }
    } else if (o.type === 'user' && o.message && Array.isArray(o.message.content)) {
      for (const b of o.message.content) if (b.type === 'tool_result' && b.is_error) { const c = idToCall.get(b.tool_use_id); if (c) c.err = true; }
    }
  }
  if (order.length < 3) return;
  agg.windows++;
  let firstEdit = -1, firstErr = -1;
  order.forEach((c, i) => {
    c.look = c.tools.length > 0 && c.tools.every(t => LOOKTOOLS.has(t.n) || ((t.n === 'Bash' || t.n === 'PowerShell') && isLookCmd(t.cmd)));
    c.edit = c.tools.some(t => EDITTOOLS.has(t.n) || (!process.env.STRICT && (t.n === 'Bash' || t.n === 'PowerShell') && isEditCmd(t.cmd)));
    if (c.edit && firstEdit < 0) firstEdit = i;
    if (c.err && firstErr < 0) firstErr = i + 1; // the error is seen on the next call
  });
  agg.ctxAtStart.push(order[0].ctx);
  if (firstEdit >= 0) { agg.withEdit++; agg.firstEditFrac.push(firstEdit / order.length); agg.ctxAtFirstEdit.push(order[firstEdit].ctx); }
  if (firstErr >= 0) agg.withErr++;
  order.forEach((c, i) => {
    agg.calls++; agg.allTok += c.ctx;
    if (firstEdit >= 0 && i < firstEdit) agg.allTokBeforeEdit += c.ctx;
    if (!c.look) return;
    agg.look++; agg.lookTok += c.ctx;
    if (firstEdit < 0) agg.lookTokNoEditWin += c.ctx; else if (i < firstEdit) agg.lookTokBeforeEdit += c.ctx;
    if (firstErr < 0) agg.lookTokNoErrWin += c.ctx; else if (i < firstErr) agg.lookTokBeforeErr += c.ctx;
  });
}
function med(a) { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; }
(async () => {
  const files = []; for (const s of stores) walk(s, files);
  for (const f of files) await one(f);
  const r = x => Math.round(1000 * x) / 10;
  console.log(JSON.stringify({ label, windows: agg.windows, withEdit: agg.withEdit, withErr: agg.withErr, calls: agg.calls,
    lookCallShare: r(agg.look / agg.calls), lookTokShareOfAll: r(agg.lookTok / agg.allTok),
    ofLookTok_pct: { beforeFirstEdit: r(agg.lookTokBeforeEdit / agg.lookTok), inWindowsWithNoEdit: r(agg.lookTokNoEditWin / agg.lookTok),
      beforeFirstEdit_or_noEdit: r((agg.lookTokBeforeEdit + agg.lookTokNoEditWin) / agg.lookTok),
      beforeFirstError_or_noError: r((agg.lookTokBeforeErr + agg.lookTokNoErrWin) / agg.lookTok) },
    allTokBeforeFirstEdit_pct: r(agg.allTokBeforeEdit / agg.allTok),
    medianFirstEditPosition: med(agg.firstEditFrac), medianCtxAtStart: med(agg.ctxAtStart), medianCtxAtFirstEdit: med(agg.ctxAtFirstEdit) }, null, 1));
})();
