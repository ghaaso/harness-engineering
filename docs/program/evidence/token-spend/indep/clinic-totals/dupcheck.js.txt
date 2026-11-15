// Characterise duplicate message.id lines whose usage differs: which fields, and first-vs-last vs max totals.
const fs = require('fs'), path = require('path'), readline = require('readline');
const ROOT = 'C:/Users/User/.claude/projects';
const stores = fs.readdirSync(ROOT).filter(d => d === 'C--Bilal-Migration-User-Downloads-20-PROJECTS-24-Clinic-Workshop' || d.startsWith('C--Bilal-Migration-User-Downloads-20-PROJECTS-24-Clinic-Workshop--claude-worktrees-') || d === 'C--Users-User-OneDrive-Documents-Bilal-Migration-User-Downloads-20-PROJECTS-24-Clinic-Workshop');
function walk(d, out) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p, out); else if (e.name.endsWith('.jsonl')) out.push(p); } return out; }
const K = ['input_tokens', 'cache_creation_input_tokens', 'cache_read_input_tokens', 'output_tokens'];
const first = new Map(), last = new Map(), mx = new Map(); const fieldDiff = {}; let sameFileDiff = 0, crossDiff = 0;
(async () => {
  for (const s of stores) for (const f of walk(path.join(ROOT, s), [])) {
    const rl = readline.createInterface({ input: fs.createReadStream(f), crlfDelay: Infinity });
    for await (const line of rl) {
      if (!line.includes('"assistant"') || !line.includes('"usage"') || line.startsWith('{"type":"api-request-blob')) continue;
      let o; try { o = JSON.parse(line); } catch { continue; }
      if (o.type !== 'assistant' || !o.message?.usage || o.message.model === '<synthetic>') continue;
      const u = o.message.usage, id = o.message.id; const v = K.map(k => u[k] || 0).concat([u.output_tokens_details?.thinking_tokens || 0]);
      if (!first.has(id)) { first.set(id, { v, f }); mx.set(id, v.slice()); }
      else { const p = first.get(id); const d = v.map((x, i) => x !== p.v[i]); if (d.some(Boolean)) { (p.f === f ? sameFileDiff++ : crossDiff++); d.forEach((b, i) => { if (b) fieldDiff[i] = (fieldDiff[i] || 0) + 1; }); } const m = mx.get(id); v.forEach((x, i) => m[i] = Math.max(m[i], x)); }
      last.set(id, v);
    }
  }
  const sum = m => { const t = [0, 0, 0, 0, 0]; for (const x of m.values()) (x.v || x).forEach((n, i) => t[i] += n); return t; };
  console.log({ fieldDiff, sameFileDiff, crossDiff, first: sum(first), last: sum(last), max: sum(mx) });
})();
