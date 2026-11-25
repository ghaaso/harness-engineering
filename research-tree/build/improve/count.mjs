import { readFileSync } from 'node:fs';
for (const f of process.argv.slice(2)) {
  let seen = new Map();
  for (const line of readFileSync(f, 'utf8').split('\n')) {
    if (!line.trim()) continue; let j; try { j = JSON.parse(line); } catch { continue; }
    const m = j.message; if (!m || !m.usage || !m.id) continue;
    seen.set(m.id, m.usage);
  }
  let t = { in: 0, cw: 0, cr: 0, out: 0 };
  for (const u of seen.values()) { t.in += u.input_tokens || 0; t.cw += u.cache_creation_input_tokens || 0; t.cr += u.cache_read_input_tokens || 0; t.out += u.output_tokens || 0; }
  const tot = t.in + t.cw + t.cr + t.out;
  console.log(f.split(/[\/]/).pop(), 'msgs', seen.size, 'total', (tot / 1e6).toFixed(2), 'M', 'fresh(in+cw+out)', ((t.in + t.cw + t.out) / 1e6).toFixed(2), 'M');
}
