// tokens-self.mjs: a build helper's own token count, read from its transcript (ORCHESTRATION.md sections 1 and 3).
// Usage: node tokens-self.mjs "<words of your description>"
// Finds the newest helper transcript of this repository's sessions whose .meta.json description contains the words,
// and prints: calls, tokens (input + cache creation + cache read + output, once per message id, assistant lines with
// usage only; other kinds skipped), and the context of the last call (its first three fields).
import fs from 'node:fs';
import path from 'node:path';

const ROOT = 'C:/Users/User/.claude/projects/C--Users-User-Documents-projects-harness-engineering';
const want = process.argv.slice(2).join(' ').trim();
if (!want) { console.error('usage: node tokens-self.mjs "<words of your description>"'); process.exit(64); }

let best = null;
for (const s of fs.readdirSync(ROOT, { withFileTypes: true })) {
  if (!s.isDirectory()) continue;
  const dir = path.join(ROOT, s.name, 'subagents');
  let names;
  try { names = fs.readdirSync(dir); } catch { continue; }
  for (const n of names) {
    if (!n.endsWith('.meta.json')) continue;
    let meta;
    try { meta = JSON.parse(fs.readFileSync(path.join(dir, n), 'utf8')); } catch { continue; }
    if (!String(meta.description || '').includes(want)) continue;
    const t = path.join(dir, n.replace(/\.meta\.json$/, '.jsonl'));
    let st;
    try { st = fs.statSync(t); } catch { continue; }
    if (!best || st.mtimeMs > best.m) best = { t, m: st.mtimeMs, d: meta.description };
  }
}
if (!best) { console.log(`no helper transcript with "${want}" in its description`); process.exit(1); }

const calls = new Map();
let order = [];
for (const line of fs.readFileSync(best.t, 'utf8').split('\n')) {
  if (!line) continue;
  let o;
  try { o = JSON.parse(line); } catch { continue; }
  if (o.type !== 'assistant' || !o.message || !o.message.usage || !o.message.id) continue;
  const u = o.message.usage;
  const ctx = (u.input_tokens || 0) + (u.cache_creation_input_tokens || 0) + (u.cache_read_input_tokens || 0);
  const p = calls.get(o.message.id);
  if (!p) { calls.set(o.message.id, { ctx, out: u.output_tokens || 0 }); order.push(o.message.id); }
  else { p.ctx = Math.max(p.ctx, ctx); p.out = Math.max(p.out, u.output_tokens || 0); }
}
let total = 0;
for (const v of calls.values()) total += v.ctx + v.out;
const last = order.length ? calls.get(order[order.length - 1]).ctx : 0;
console.log(`${best.d} | calls ${calls.size} | tokens ${(total / 1e6).toFixed(2)} M | context now ${(last / 1e3).toFixed(1)} K`);
// A helper's own transcript is written at every call. One last written minutes ago is another helper's: CGATE's
// successor read its predecessor's frozen count this way and ran past its limit (2026-11-19).
const age = Date.now() - best.m;
if (age > 120000) console.log(`WARNING: this transcript was last written ${Math.round(age / 60000)} min ago, so it is probably not yours: give words found only in your own description`);
