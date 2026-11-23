// node self.mjs "<your description>" [--root <transcript folder>]: your own calls, tokens and the context of your last
// call, from the run's helper transcripts, counted as H:research-tree/build/tools/tokens-self.mjs counts (input + cache
// creation + cache read + output, once per message id). One line. tools/tokens.mjs gives totals only, no context.
import fs from 'node:fs';
import path from 'node:path';

const a = process.argv.slice(2);
let root = null;
const i = a.indexOf('--root');
if (i >= 0) { root = a[i + 1]; a.splice(i, 2); }
const want = a.join(' ').trim();
if (!want) { console.log('usage: node self.mjs "<your description>" [--root <folder>]'); process.exit(64); }
const P = 'C:/Users/User/.claude/projects', N = 'C--research-runs-2026-11-harness-leads';
let folders = [];
try { folders = root ? [root] : fs.readdirSync(P).filter(d => d === N || d.startsWith(N + '-')).map(d => path.join(P, d)); } catch {}
let best = null;
for (const f of folders) {
  let ents = [];
  try { ents = fs.readdirSync(f, { withFileTypes: true }); } catch { continue; }
  for (const s of ents) {
    if (!s.isDirectory()) continue;
    const sd = path.join(f, s.name, 'subagents');
    let names;
    try { names = fs.readdirSync(sd); } catch { continue; }
    for (const nm of names) {
      if (!nm.endsWith('.meta.json')) continue;
      let m;
      try { m = JSON.parse(fs.readFileSync(path.join(sd, nm), 'utf8')); } catch { continue; }
      if (!String(m.description || '').includes(want)) continue;
      const t = path.join(sd, nm.replace(/\.meta\.json$/, '.jsonl'));
      let st;
      try { st = fs.statSync(t); } catch { continue; }
      if (!best || st.mtimeMs > best.m) best = { t, m: st.mtimeMs, d: m.description };
    }
  }
}
if (!best) { console.log(`no helper transcript with "${want}" in its description`); process.exit(1); }
const calls = new Map();
let last = 0;
for (const line of fs.readFileSync(best.t, 'utf8').split('\n')) {
  if (!line) continue;
  let o;
  try { o = JSON.parse(line); } catch { continue; }
  if (o.type !== 'assistant' || !o.message || !o.message.usage || !o.message.id) continue;
  const u = o.message.usage;
  const ctx = (u.input_tokens || 0) + (u.cache_creation_input_tokens || 0) + (u.cache_read_input_tokens || 0);
  const p = calls.get(o.message.id) || { ctx: 0, out: 0 };
  p.ctx = Math.max(p.ctx, ctx); p.out = Math.max(p.out, u.output_tokens || 0);
  calls.set(o.message.id, p);
  last = ctx;
}
let total = 0;
for (const v of calls.values()) total += v.ctx + v.out;
console.log(`${best.d} | calls ${calls.size} | tokens ${(total / 1e6).toFixed(2)} M | context now ${(last / 1e3).toFixed(1)} K`);
