// Tokens per helper transcript: per message id the largest of each usage field; total = input + cache creation + cache read + output.
import { readFileSync, readdirSync } from 'node:fs';
const D = process.argv[2];
for (const f of readdirSync(D).filter((x) => x.endsWith('.jsonl'))) {
  let meta = {};
  try { meta = JSON.parse(readFileSync(D + '/' + f.replace('.jsonl', '.meta.json'), 'utf8')); } catch {}
  const per = new Map(); let lastT = '', ctx = 0;
  for (const line of readFileSync(D + '/' + f, 'utf8').split('\n')) {
    if (!line.trim()) continue; let o; try { o = JSON.parse(line); } catch { continue; }
    const u = o?.message?.usage; const id = o?.message?.id; if (!u || !id) continue;
    const p = per.get(id) || { i: 0, cc: 0, cr: 0, o: 0 };
    p.i = Math.max(p.i, u.input_tokens || 0); p.cc = Math.max(p.cc, u.cache_creation_input_tokens || 0);
    p.cr = Math.max(p.cr, u.cache_read_input_tokens || 0); p.o = Math.max(p.o, u.output_tokens || 0);
    per.set(id, p); lastT = o.timestamp || lastT; ctx = p.i + p.cc + p.cr;
  }
  let t = 0; for (const p of per.values()) t += p.i + p.cc + p.cr + p.o;
  const d = (meta.description || meta.agentType || '').slice(0, 60);
  console.log(f.slice(6, 23), String(per.size).padStart(3), 'calls', (t / 1e6).toFixed(2).padStart(6), 'M', 'ctx', Math.round(ctx / 1e3) + 'K', lastT.slice(11, 19), d);
}
