// Prints the shape of a transcript .jsonl: record types, key paths, counts. No content values.
// usage: node transcript-shape.mjs <file.jsonl> [maxLines]   (streams; prints JSON)
import fs from 'node:fs';
import readline from 'node:readline';
const file = process.argv[2];
const max = Number(process.argv[3] || Infinity);
if (!file) { console.error('usage: node transcript-shape.mjs <file.jsonl> [maxLines]'); process.exit(2); }
const types = {}; const paths = {}; let lines = 0, bad = 0;
const blockTypes = {}; const toolNames = {}; const models = {}; const usageKeys = {};
function walk(v, p, depth) {
  if (depth > 4) return;
  if (Array.isArray(v)) { for (const x of v.slice(0, 3)) walk(x, p + '[]', depth + 1); return; }
  if (v && typeof v === 'object') { for (const k of Object.keys(v)) { const q = p + '.' + k; paths[q] = (paths[q] || 0) + 1; walk(v[k], q, depth + 1); } }
}
const rl = readline.createInterface({ input: fs.createReadStream(file, { encoding: 'utf8' }), crlfDelay: Infinity });
for await (const line of rl) {
  if (lines >= max) break;
  if (!line.trim()) continue; lines++;
  let r; try { r = JSON.parse(line); } catch { bad++; continue; }
  const t = (r.type || '?') + (r.subtype ? '/' + r.subtype : '');
  types[t] = (types[t] || 0) + 1;
  walk(r, t, 0);
  const m = r.message;
  if (m && typeof m === 'object') {
    if (m.model) models[m.model] = (models[m.model] || 0) + 1;
    if (m.usage) for (const k of Object.keys(m.usage)) usageKeys[k] = (usageKeys[k] || 0) + 1;
    if (Array.isArray(m.content)) for (const b of m.content) {
      blockTypes[b.type] = (blockTypes[b.type] || 0) + 1;
      if (b.type === 'tool_use') toolNames[b.name] = (toolNames[b.name] || 0) + 1;
    }
  }
}
const top = (o, n) => Object.fromEntries(Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n));
console.log(JSON.stringify({ file, lines, unparseable: bad, recordTypes: types, models, usageKeys, contentBlockTypes: blockTypes, toolNames: top(toolNames, 40), keyPaths: top(paths, 400) }, null, 1));
