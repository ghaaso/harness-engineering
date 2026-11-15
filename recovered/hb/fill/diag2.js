// Diagnostic 2: list the largest unexplained context jumps and what sat between the two calls.
const fs = require('fs');
const L = fs.readFileSync(process.argv[2], 'utf8').split('\n').filter(Boolean);
const calls = []; const byId = {}; let cur = null;
for (const l of L) {
  let o; try { o = JSON.parse(l); } catch { continue; }
  if (o.type === 'assistant' && o.message && o.message.id && o.message.usage) {
    const m = o.message; let c = byId[m.id];
    if (!c) { c = byId[m.id] = { ctx: 0, out: 0, between: {}, ts: o.timestamp, model: m.model }; calls.push(c); cur = c; }
    const u = m.usage; const ctx = (u.input_tokens || 0) + (u.cache_read_input_tokens || 0) + (u.cache_creation_input_tokens || 0);
    if (ctx > c.ctx) c.ctx = ctx; if ((u.output_tokens || 0) > c.out) c.out = u.output_tokens;
  } else if (cur) {
    let k = o.type + (o.subtype ? '/' + o.subtype : '');
    let n = 0;
    if (o.type === 'attachment') { k += ':' + (o.attachment && o.attachment.type); n = JSON.stringify(o.attachment || {}).length; }
    else if (o.type === 'user' && o.message) {
      const c = o.message.content;
      if (typeof c === 'string') { k += ':string' + (o.isCompactSummary ? '(summary)' : ''); n = c.length; }
      else if (Array.isArray(c)) { k += ':' + c.map((b) => b.type + (b.type === 'tool_result' && Array.isArray(b.content) ? '[' + b.content.map((x) => x.type).join(',') + ']' : '')).join('+'); n = JSON.stringify(c).length; }
    } else continue;
    if (['queue-operation', 'last-prompt', 'custom-title', 'agent-name', 'atis-latch', 'mode'].includes(o.type)) continue;
    cur.between[k] = (cur.between[k] || 0) + n;
  }
}
const rows = [];
for (let k = 0; k + 1 < calls.length; k++) { const a = calls[k], b = calls[k + 1]; const d = b.ctx - a.ctx; const vis = Object.values(a.between).reduce((s, x) => s + x, 0); rows.push({ k, ts: a.ts, ctx: a.ctx, d, out: a.out, vis, un: d - a.out - vis / 2, between: a.between, model: a.model + '>' + b.model }); }
rows.sort((x, y) => y.un - x.un);
for (const r of rows.slice(0, 14)) console.log(r.k, r.ts, 'ctx', r.ctx, 'delta', r.d, 'out', r.out, 'visible chars', r.vis, r.model, JSON.stringify(r.between).slice(0, 300));
console.log('--- drops');
for (const r of rows.filter((r) => r.d < -0.2 * r.ctx)) console.log(r.k, r.ts, 'ctx', r.ctx, 'delta', r.d, r.model, JSON.stringify(r.between).slice(0, 200));
