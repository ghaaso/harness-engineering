// Diagnostic: does context growth between calls equal output + incoming, and is thinking carried?
const fs = require('fs');
const f = process.argv[2];
const L = fs.readFileSync(f, 'utf8').split('\n').filter(Boolean);
const calls = []; const byId = {}; let cur = null;
const len = (b) => {
  if (b.type === 'thinking') return (b.thinking || '').length;
  if (b.type === 'text') return (b.text || '').length;
  if (b.type === 'tool_use') return JSON.stringify(b.input || {}).length + (b.name || '').length;
  if (b.type === 'tool_result') { const c = b.content; if (typeof c === 'string') return c.length; if (Array.isArray(c)) return c.reduce((s, x) => s + (x.type === 'text' ? (x.text || '').length : 0), 0); return 0; }
  return 0;
};
for (const l of L) {
  let o; try { o = JSON.parse(l); } catch { continue; }
  if (o.type === 'assistant' && o.message && o.message.id && o.message.usage) {
    const m = o.message; let c = byId[m.id];
    if (!c) { c = byId[m.id] = { id: m.id, ctx: 0, out: 0, th: 0, tx: 0, tu: 0, inc: 0, incAtt: 0, ts: o.timestamp }; calls.push(c); cur = c; }
    const u = m.usage; const ctx = (u.input_tokens || 0) + (u.cache_read_input_tokens || 0) + (u.cache_creation_input_tokens || 0);
    if (ctx > c.ctx) c.ctx = ctx; if ((u.output_tokens || 0) > c.out) c.out = u.output_tokens;
    for (const b of (Array.isArray(m.content) ? m.content : [])) { const n = len(b); if (b.type === 'thinking') c.th += n; else if (b.type === 'text') c.tx += n; else if (b.type === 'tool_use') c.tu += n; }
  } else if (o.type === 'user' && o.message && cur) {
    const c = o.message.content;
    if (typeof c === 'string') cur.inc += c.length; else if (Array.isArray(c)) for (const b of c) cur.inc += len(b);
  } else if (o.type === 'attachment' && cur) {
    const t = o.attachment && o.attachment.type;
    if (t !== 'prompt_snapshot' && t !== 'deferred_tools_record') cur.incAtt += JSON.stringify(o.attachment || {}).length;
  }
}
let sd = 0, so = 0, si = 0, sa = 0, sth = 0, sall = 0, n = 0, drops = 0, neg = 0;
for (let k = 0; k + 1 < calls.length; k++) {
  const a = calls[k], b = calls[k + 1]; const d = b.ctx - a.ctx;
  if (d < -0.2 * a.ctx) { drops++; continue; }
  if (d < 0) neg++;
  sd += d; so += a.out; si += a.inc; sa += a.incAtt; sth += a.th; sall += a.th + a.tx + a.tu; n++;
}
console.log('calls', calls.length, 'pairs', n, 'drops', drops, 'small negatives', neg);
console.log('sum delta', sd, 'sum output tokens', so, 'incoming chars', si, 'attachment chars', sa);
console.log('thinking share of visible output chars', (sth / sall).toFixed(2));
console.log('if thinking carried: incoming tokens', sd - so, 'chars/token', (si / (sd - so)).toFixed(2), 'with attachments', ((si + sa) / (sd - so)).toFixed(2));
for (let k = 5; k < 25; k++) { const a = calls[k], b = calls[k + 1]; console.log(k, 'ctx', a.ctx, 'delta', b.ctx - a.ctx, 'out', a.out, 'th', a.th, 'tx', a.tx, 'tu', a.tu, 'inc', a.inc, 'att', a.incAtt); }
