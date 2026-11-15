const fs = require('fs'), path = require('path'), readline = require('readline');
const ROOT = 'C:/Users/User/.claude/projects';
const stores = fs.readdirSync(ROOT).filter(d =>
  d === 'C--Bilal-Migration-User-Downloads-20-PROJECTS-24-Clinic-Workshop' ||
  d.startsWith('C--Bilal-Migration-User-Downloads-20-PROJECTS-24-Clinic-Workshop--claude-worktrees-') ||
  d === 'C--Users-User-OneDrive-Documents-Bilal-Migration-User-Downloads-20-PROJECTS-24-Clinic-Workshop');
function walk(d, out) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p, out); else if (e.name.endsWith('.jsonl')) out.push(p); } return out; }
const files = [];
for (const s of stores) for (const f of walk(path.join(ROOT, s), [])) {
  const rel = path.relative(path.join(ROOT, s), f).split(path.sep).join('/');
  let role = 'other';
  if (!rel.includes('/')) role = 'main';
  else if (rel.includes('/subagents/workflows/')) role = 'workflow';
  else if (rel.includes('/subagents/')) role = 'agent';
  files.push({ f, role, store: s });
}
const seen = new Map(); // id -> record
let dupDiffer = 0, dupLines = 0, synthetic = 0, compactions = 0, crossFileDup = 0, noId = 0;
const fileCounts = {}; let costSum = 0, costFiles = 0; const modelUsageSum = {};
const z = () => ({ calls: 0, input: 0, cache_write: 0, cache_read: 0, output: 0, thinking: 0 });
async function run(file) {
  fileCounts[file.role] = (fileCounts[file.role] || 0) + 1;
  const rl = readline.createInterface({ input: fs.createReadStream(file.f), crlfDelay: Infinity });
  let lastCost = null;
  for await (const line of rl) {
    if (line.startsWith('{"type":"api-request-blob') || line.startsWith('{"type":"file-history')) continue;
    if (line.startsWith('{"type":"cost-state')) { try { lastCost = JSON.parse(line); } catch {} continue; }
    if (line.includes('"compact_boundary"')) { try { const o = JSON.parse(line); if (o.type === 'system' && o.subtype === 'compact_boundary') compactions++; } catch {} continue; }
    if (!line.includes('"assistant"') || !line.includes('"usage"')) continue;
    let o; try { o = JSON.parse(line); } catch { continue; }
    if (o.type !== 'assistant' || !o.message || !o.message.usage) continue;
    if (o.message.model === '<synthetic>') { synthetic++; continue; }
    const u = o.message.usage, id = o.message.id;
    const rec = { input: u.input_tokens || 0, cache_write: u.cache_creation_input_tokens || 0, cache_read: u.cache_read_input_tokens || 0, output: u.output_tokens || 0, thinking: (u.output_tokens_details && u.output_tokens_details.thinking_tokens) || 0, model: o.message.model, role: file.role, ts: o.timestamp, file: file.f };
    if (!id) { noId++; seen.set('noid:' + file.f + ':' + noId, rec); continue; }
    const prev = seen.get(id);
    if (prev) {
      dupLines++;
      if (prev.file !== file.f) crossFileDup++;
      if (['input', 'cache_write', 'cache_read', 'output', 'thinking'].some(k => prev[k] !== rec[k])) { dupDiffer++; for (const k of ['input', 'cache_write', 'cache_read', 'output', 'thinking']) prev[k] = Math.max(prev[k], rec[k]); }
      continue;
    }
    seen.set(id, rec);
  }
  if (file.role === 'main' && lastCost) { costFiles++; costSum += lastCost.totalCostUSD || 0;
    for (const [m, v] of Object.entries(lastCost.modelUsage || {})) { const t = modelUsageSum[m] = modelUsageSum[m] || {}; for (const [k, n] of Object.entries(v)) if (typeof n === 'number') t[k] = (t[k] || 0) + n; } }
}
(async () => {
  let i = 0; const queue = files.slice();
  await Promise.all(Array.from({ length: 8 }, async () => { while (queue.length) { await run(queue.shift()); i++; } }));
  const tot = z(), byModel = {}, byRole = {}, byMonth = {};
  for (const r of seen.values()) {
    for (const [bucket, key] of [[null, null], [byModel, r.model], [byRole, r.role], [byMonth, (r.ts || 'unknown').slice(0, 7)]]) {
      const t = bucket ? (bucket[key] = bucket[key] || z()) : tot;
      t.calls++; for (const k of ['input', 'cache_write', 'cache_read', 'output', 'thinking']) t[k] += r[k];
    }
  }
  for (const t of Object.values(byRole)) { t.context = t.input + t.cache_write + t.cache_read; t.avg_context_per_call = t.context / t.calls; }
  for (const t of Object.values(byMonth)) t.context = t.input + t.cache_write + t.cache_read;
  const out = { stores: stores.length, files: files.length, fileCounts, distinctCalls: seen.size, tot, byModel, byRole, byMonth, compactions, synthetic, dupLines, dupDiffer, crossFileDup, noId, costSum, costFiles, modelUsageSum };
  fs.writeFileSync(path.join(__dirname, 'result.json'), JSON.stringify(out, null, 1));
  console.log(JSON.stringify(out, null, 1));
})();
