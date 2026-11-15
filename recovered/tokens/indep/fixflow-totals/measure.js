// Independent token-spend measurement for FixFlow transcript stores.
const fs = require('fs'), path = require('path'), readline = require('readline');
const ROOT = 'C:/Users/User/.claude/projects/';
const STORES = [
  'C--Users-User-Documents-projects-EMS-workshop1',
  'C--Users-User-Documents-projects-EMS-workshop1--claude-worktrees-harness-ideas-baml-57fde3',
  'C--Users-User-Documents-projects-EMS-workshop1--claude-worktrees-harness-ideas-horthy-2371b9',
  'C--Users-User-Documents-projects-EMS-workshop1--claude-worktrees-knowledge-store-research-9c609c',
  'C--Users-User-Documents-projects-EMS-workshop1--claude-worktrees-wizardly-hertz-02c46a',
  'C--Users-User-OneDrive-Documents-Bilal-Migration-User-Downloads-20-PROJECTS-23-FixFlow',
].map(s => ROOT + s);

function walk(dir, out) {
  let ents; try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of ents) {
    const p = path.join(dir, e.name).replace(/\\/g, '/');
    if (e.isDirectory()) walk(p, out); else if (e.name.endsWith('.jsonl')) out.push(p);
  }
}
const files = [];
for (const s of STORES) {
  // main = top-level .jsonl; subagents = anything under <sid>/subagents/
  for (const e of fs.readdirSync(s, { withFileTypes: true })) {
    const p = (s + '/' + e.name);
    if (e.isFile() && e.name.endsWith('.jsonl')) files.push({ p, role: 'main', store: s });
    else if (e.isDirectory()) {
      const sub = []; walk(p, sub);
      for (const f of sub) {
        if (!f.includes('/subagents/')) { files.push({ p: f, role: 'other', store: s }); continue; }
        files.push({ p: f, role: f.includes('/subagents/workflows/') ? 'workflow' : 'agent', store: s });
      }
    }
  }
}
const z = () => ({ calls: 0, input: 0, cache_write: 0, cache_read: 0, output: 0, thinking: 0 });
const tot = z(), byModel = {}, byRole = {}, byMonth = {};
const seen = new Set(); let dupAcrossFiles = 0, dupLines = 0, compactions = 0, synthetic = 0, noId = 0;
let costSum = 0, mainWithCost = 0; const fileCounts = {};
function add(o, u) { o.calls++; o.input += u.i; o.cache_write += u.cw; o.cache_read += u.cr; o.output += u.o; o.thinking += u.t; }

async function proc(f) {
  fileCounts[f.role] = (fileCounts[f.role] || 0) + 1;
  const rl = readline.createInterface({ input: fs.createReadStream(f.p, { encoding: 'utf8' }), crlfDelay: Infinity });
  const local = new Set(); let lastCost = null;
  for await (const line of rl) {
    if (line.startsWith('{"type":"api-request-blob') || line.startsWith('{"type":"file-history')) continue;
    if (line.startsWith('{"type":"cost-state')) { try { lastCost = JSON.parse(line); } catch {} continue; }
    if (line.includes('"compact_boundary"')) { try { const j = JSON.parse(line); if (j.type === 'system' && j.subtype === 'compact_boundary') compactions++; } catch {} }
    if (!line.includes('"type":"assistant"')) continue;
    let j; try { j = JSON.parse(line); } catch { continue; }
    if (j.type !== 'assistant' || !j.message || !j.message.usage) continue;
    const m = j.message; if (m.model === '<synthetic>') { synthetic++; continue; }
    const id = m.id; if (!id) { noId++; continue; }
    if (local.has(id)) { dupLines++; continue; }
    local.add(id);
    if (seen.has(id)) { dupAcrossFiles++; continue; }
    seen.add(id);
    const us = m.usage;
    const u = { i: us.input_tokens || 0, cw: us.cache_creation_input_tokens || 0, cr: us.cache_read_input_tokens || 0, o: us.output_tokens || 0,
      t: (us.output_tokens_details && us.output_tokens_details.thinking_tokens) || 0 };
    add(tot, u);
    add(byModel[m.model] ||= z(), u);
    add(byRole[f.role] ||= z(), u);
    const mon = (j.timestamp || '').slice(0, 7) || 'unknown';
    add(byMonth[mon] ||= z(), u);
  }
  if (f.role === 'main' && lastCost && typeof lastCost.totalCostUSD === 'number') { costSum += lastCost.totalCostUSD; mainWithCost++; }
}
(async () => {
  const CONC = 8; let i = 0;
  await Promise.all(Array.from({ length: CONC }, async () => { while (i < files.length) await proc(files[i++]); }));
  for (const r of Object.values(byRole)) r.avg_context_per_call = r.calls ? (r.input + r.cache_write + r.cache_read) / r.calls : 0;
  const res = { fileCounts, totalFiles: files.length, totals: tot, byModel, byRole, byMonth, compactions, dupLinesWithinFile: dupLines,
    dupIdsAcrossFiles: dupAcrossFiles, syntheticSkipped: synthetic, noIdSkipped: noId, mainCostStateSumUSD: costSum, mainFilesWithCostState: mainWithCost };
  fs.writeFileSync(__dirname + '/result.json', JSON.stringify(res, null, 1));
  console.log(JSON.stringify(res, null, 1));
})();
